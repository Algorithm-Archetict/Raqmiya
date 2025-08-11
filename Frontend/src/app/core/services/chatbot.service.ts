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
  private readonly apiKey = 'Enter the actual API key here!!!!'; // Replace with your actual API key
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

      // Prepare messages
      const messages = [
        {
          role: 'system' as const,
          content: 'I am a helpful AI assistant for the Raqmiya platform. I can help with general questions, analyze images, and provide information from our knowledge base.'
        }
      ];

      // Add RAG context if available
      let finalContent = content;
      if (ragContext) {
        finalContent += '\n\nRelevant context from knowledge base:\n' + ragContext;
      }

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
        model: imageUrls.length > 0 ? 'gpt-4o' : 'gpt-4o-mini',
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

  async searchKnowledgeBase(query: string): Promise<KnowledgeBaseDocument[]> {
    try {
      const queryEmbedding = await this.createEmbedding(query);
      
      const similarities = this.knowledgeBase.map(doc => ({
        ...doc,
        similarity: this.cosineSimilarity(queryEmbedding, doc.embedding || [])
      }));

      return similarities
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 3)
        .filter(doc => doc.similarity > 0.7)
        .map(({ similarity, ...doc }) => doc);
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

      const topDocs = similarities
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 3)
        .filter(doc => doc.similarity > 0.7);

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
