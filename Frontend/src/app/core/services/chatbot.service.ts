import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, firstValueFrom } from 'rxjs';

interface KnowledgeBaseDocument {
  name: string;
  content: string;
  embedding?: number[];
  timestamp: number;
}

interface UploadedFile {
  name: string;
  type: 'text' | 'image';
  size: number;
  content?: string;
  url?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ChatbotService {
  private readonly apiKey = 'Enter Api key here !!!!!!!!!!!!!'; // Replace with your actual API key
  private readonly openaiUrl = 'https://api.openai.com/v1';
  private knowledgeBase: KnowledgeBaseDocument[] = [];

  constructor(private http: HttpClient) {
    this.loadKnowledgeBase();
  }

  async sendMessage(content: string, files: UploadedFile[] = []): Promise<string> {
    try {
      console.log('Chatbot: Starting to send message...');
      console.log('Chatbot: API Key length:', this.apiKey.length);
      console.log('Chatbot: OpenAI URL:', this.openaiUrl);
      
      // Get RAG context if available
      let ragContext = '';
      if (this.knowledgeBase.length > 0) {
        ragContext = await this.getRAGContext(content);
      }

      // Add RAG context if available
      let finalContent = content;
      if (ragContext) {
        finalContent += '\n\nRelevant context from uploaded documents:\n' + ragContext;
        finalContent += '\n\nIMPORTANT: Only answer based on the information provided in the uploaded documents above. Do not use any general knowledge or external information.';
      } else if (this.knowledgeBase.length > 0) {
        // If there are documents but no relevant context found
        finalContent += '\n\nNo relevant information found in the uploaded documents. Please ask a question that relates to the content of the uploaded files.';
      } else {
        // If no documents are uploaded
        finalContent += '\n\nNo documents have been uploaded to the knowledge base. I can only answer questions based on uploaded documents. Please upload relevant documents first.';
      }

      // Prepare messages
      const messages = [
        {
          role: 'system' as const,
          content: 'I am a specialized AI assistant for the Raqmiya platform. I ONLY answer questions based on the uploaded documents in the knowledge base. I do not use general knowledge or external information. If a question cannot be answered from the uploaded documents, I will clearly state that I cannot answer it based on the available information.'
        }
      ];

      // Add file content if present
      if (files.length > 0) {
        const fileContent = await this.processUploadedFiles(files);
        if (fileContent) {
          finalContent += '\n\nFile content:\n' + fileContent;
        }
      }

      messages.push({
        role: 'user',
        content: finalContent
      } as any);

      // Add images if present
      const imageUrls = files.filter(f => f.type === 'image').map(f => f.url!);
      if (imageUrls.length > 0) {
        (messages[messages.length - 1] as any).content = [
          { type: 'text', text: finalContent },
          ...imageUrls.map(url => ({ type: 'image_url', image_url: { url } }))
        ];
      }

      const requestBody = {
        model: 'gpt-4o-mini', // Use gpt-4o-mini for both text and vision
        messages,
        max_tokens: 1024,
        temperature: 0.7
      };

      const headers = new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      });

      const response = await firstValueFrom(this.http.post(`${this.openaiUrl}/chat/completions`, requestBody, { headers }));
      
      if (response && typeof response === 'object' && 'choices' in response) {
        return (response as any).choices[0]?.message?.content || 'No response received.';
      } else {
        throw new Error('Invalid response format');
      }

    } catch (error) {
      console.error('Chatbot API error:', error);
      
      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.message.includes('401') || error.message.includes('Unauthorized')) {
          throw new Error('API key is invalid or expired. Please check your OpenAI API key.');
        } else if (error.message.includes('429') || error.message.includes('Too Many Requests')) {
          throw new Error('Rate limit exceeded. Please try again later.');
        } else if (error.message.includes('500') || error.message.includes('Internal Server Error')) {
          throw new Error('OpenAI service is experiencing issues. Please try again later.');
        } else if (error.message.includes('Network') || error.message.includes('fetch')) {
          throw new Error('Network error. Please check your internet connection.');
        }
      }
      
      throw new Error('Failed to get response from AI assistant. Please try again.');
    }
  }

  async addToKnowledgeBase(name: string, content: string): Promise<void> {
    try {
      const embedding = await this.createEmbedding(content);
      const document: KnowledgeBaseDocument = {
        name,
        content,
        embedding,
        timestamp: Date.now()
      };

      this.knowledgeBase.push(document);
      this.saveKnowledgeBase();
    } catch (error) {
      console.error('Error adding to knowledge base:', error);
      throw new Error('Failed to add document to knowledge base.');
    }
  }

  getKnowledgeBaseDocuments(): Promise<KnowledgeBaseDocument[]> {
    return Promise.resolve([...this.knowledgeBase]);
  }

  async deleteKnowledgeBaseDocument(name: string): Promise<void> {
    const index = this.knowledgeBase.findIndex(doc => doc.name === name);
    if (index === -1) {
      throw new Error('Document not found');
    }

    this.knowledgeBase.splice(index, 1);
    this.saveKnowledgeBase();
  }

  // Clear all chat data when user logs out
  clearChatData(): void {
    this.knowledgeBase = [];
    localStorage.removeItem('chatbot_knowledge_base');
    localStorage.removeItem('chatbot_chat_history');
    localStorage.removeItem('chatbot_messages');
    console.log('Chat data cleared on logout');
  }

  // Get an empty messages array for resetting chat
  getEmptyMessages(): any[] {
    return [{
      role: 'system',
      content: 'I am a specialized AI assistant for the Raqmiya platform. I ONLY answer questions based on the uploaded documents in the knowledge base. I do not use general knowledge or external information. If a question cannot be answered from the uploaded documents, I will clearly state that I cannot answer it based on the available information.',
      timestamp: new Date()
    }];
  }

  async searchKnowledgeBase(query: string): Promise<KnowledgeBaseDocument[]> {
    try {
      const queryEmbedding = await this.createEmbedding(query);
      
      const similarities = this.knowledgeBase.map(doc => ({
        ...doc,
        similarity: this.cosineSimilarity(queryEmbedding, doc.embedding || [])
      }));

      console.log('Search Debug - All similarities:', similarities.map(d => ({ name: d.name, similarity: d.similarity })));

      const results = similarities
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 3)
        .filter(doc => doc.similarity > 0.1) // Lower threshold from 0.3 to 0.1
        .map(({ similarity, ...doc }) => doc);

      console.log('Search Debug - Results after filtering:', results.map(d => ({ name: d.name })));

      return results;
    } catch (error) {
      console.error('Search error:', error);
      return [];
    }
  }

  private async getRAGContext(query: string): Promise<string> {
    try {
      const queryEmbedding = await this.createEmbedding(query);
      
      const similarities = this.knowledgeBase.map(doc => ({
        ...doc,
        similarity: this.cosineSimilarity(queryEmbedding, doc.embedding || [])
      }));

      console.log('RAG Debug - All similarities:', similarities.map(d => ({ name: d.name, similarity: d.similarity })));

      const topDocs = similarities
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 3)
        .filter(doc => doc.similarity > 0.1); // Lower threshold from 0.3 to 0.1

      console.log('RAG Debug - Top docs after filtering:', topDocs.map(d => ({ name: d.name, similarity: d.similarity })));

      return topDocs.map(doc => doc.content).join('\n\n');
    } catch (error) {
      console.error('RAG error:', error);
      return '';
    }
  }

  private async createEmbedding(text: string): Promise<number[]> {
    try {
      const response = await firstValueFrom(this.http.post(`${this.openaiUrl}/embeddings`, {
        input: text,
        model: 'text-embedding-3-small'
      }, {
        headers: new HttpHeaders({
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        })
      }));

      if (response && typeof response === 'object' && 'data' in response) {
        return (response as any).data[0]?.embedding || [];
      } else {
        throw new Error('Invalid embedding response');
      }
    } catch (error) {
      console.error('Embedding error:', error);
      throw new Error('Failed to create embedding');
    }
  }

  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) return 0;
    
    const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
    const normA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const normB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
    
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (normA * normB);
  }

  private async processUploadedFiles(files: UploadedFile[]): Promise<string> {
    let content = '';
    for (const file of files) {
      if (file.type === 'text' && file.content) {
        content += `\n--- ${file.name} ---\n${file.content}\n`;
      }
    }
    return content;
  }

  private loadKnowledgeBase(): void {
    const saved = localStorage.getItem('chatbot_knowledge_base');
    if (saved) {
      this.knowledgeBase = JSON.parse(saved);
    }
  }

  private saveKnowledgeBase(): void {
    localStorage.setItem('chatbot_knowledge_base', JSON.stringify(this.knowledgeBase));
  }
}
