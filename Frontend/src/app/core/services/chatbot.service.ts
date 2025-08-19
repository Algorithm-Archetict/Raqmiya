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
  private readonly apiKey = 'API Key HERE !!!!!!!!'; // Replace with your actual API key
  private readonly openaiUrl = 'https://api.openai.com/v1';
  private knowledgeBase: KnowledgeBaseDocument[] = [];
  private isKnowledgeBaseLoaded = false;

  constructor(private http: HttpClient) {
    this.loadKnowledgeBase();
  }

  async sendMessage(content: string, files: UploadedFile[] = []): Promise<string> {
    try {
      console.log('Chatbot: Starting to send message...');
      console.log('Chatbot: API Key length:', this.apiKey.length);
      console.log('Chatbot: OpenAI URL:', this.openaiUrl);
      
      // Check if images are present
      const hasImages = files.some(f => f.type === 'image');
      
      // Ensure knowledge base is loaded
      if (!this.isKnowledgeBaseLoaded) {
        await this.loadKnowledgeBase();
      }
      
      // Get RAG context if available (only for text-only queries)
      let ragContext = '';
      if (!hasImages && this.knowledgeBase.length > 0) {
        ragContext = await this.getRAGContext(content);
      }

      // Add RAG context if available (only for text-only queries)
      let finalContent = content;
      if (hasImages) {
        // For image queries, allow general image analysis
        finalContent += '\n\nPlease analyze the uploaded image(s) and provide a detailed description of what you see. You can use your general knowledge to describe images, objects, scenes, text, or any other visual content.';
      } else if (ragContext) {
        // For text-only queries with knowledge base context
        finalContent += '\n\nRelevant context from knowledge base:\n' + ragContext;
        finalContent += '\n\nIMPORTANT: ONLY answer based on the information provided in the knowledge base above. Do not use any general knowledge or external information. If the question cannot be answered from the provided knowledge base, clearly state that you cannot answer it based on the available information.';
      } else if (this.knowledgeBase.length > 0) {
        // If there are documents but no relevant context found
        finalContent += '\n\nI have access to knowledge base documents, but I could not find specific information relevant to your question. I can ONLY answer questions based on the information in the loaded knowledge base files. Please ask a question that relates to the content of the loaded documents.';
      } else {
        // If no documents are loaded
        finalContent += '\n\nNo knowledge base documents have been loaded. I can ONLY answer questions based on documents that have been uploaded to the knowledge base. Please ask an admin to upload relevant documents first.';
      }

      // Prepare messages with appropriate system prompt
      const systemPrompt = hasImages 
        ? 'I am an AI assistant with vision capabilities. I can analyze and describe images in detail, and I also have access to knowledge base documents for text-based questions. For image analysis, I can use my general knowledge to describe what I see. For text questions, I will use the knowledge base when available.'
        : 'I am a specialized AI assistant that ONLY answers questions based on the knowledge base documents that have been loaded. I do not use general knowledge or external information. I cannot answer programming questions, general questions, or any questions outside the scope of the loaded knowledge base documents. If a question cannot be answered from the loaded documents, I will clearly state that I cannot answer it based on the available information.';

      const messages = [
        {
          role: 'system' as const,
          content: systemPrompt
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
      this.isKnowledgeBaseLoaded = true;
    } catch (error) {
      console.error('Error adding to knowledge base:', error);
      throw new Error('Failed to add document to knowledge base.');
    }
  }

  getKnowledgeBaseDocuments(): Promise<KnowledgeBaseDocument[]> {
    return Promise.resolve([...this.knowledgeBase]);
  }

  async reloadKnowledgeBase(): Promise<void> {
    try {
      // Clear existing knowledge base
      this.knowledgeBase = [];
      this.isKnowledgeBaseLoaded = false;
      localStorage.removeItem('chatbot_knowledge_base');
      localStorage.removeItem('chatbot_knowledge_base_loaded');
      
      console.log('Knowledge base cleared successfully');
    } catch (error) {
      console.error('Error reloading knowledge base:', error);
      throw new Error('Failed to reload knowledge base');
    }
  }

  async loadAssetFile(fileName: string): Promise<void> {
    try {
      const filePath = `assets/knowledge-base/${fileName}`;
      const content = await this.fetchAssetFile(filePath);
      if (content) {
        await this.addToKnowledgeBase(fileName, content);
        console.log(`Successfully loaded ${fileName} to knowledge base`);
      } else {
        throw new Error(`Failed to load ${fileName}`);
      }
    } catch (error) {
      console.error(`Error loading asset file ${fileName}:`, error);
      throw new Error(`Failed to load ${fileName}`);
    }
  }

  private async fetchAssetFile(path: string): Promise<string | null> {
    try {
      const response = await firstValueFrom(this.http.get(path, { responseType: 'text' }));
      return response;
    } catch (error) {
      console.error(`Error fetching ${path}:`, error);
      return null;
    }
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
    // Don't clear knowledge base on logout - keep it shared
    localStorage.removeItem('chatbot_chat_history');
    localStorage.removeItem('chatbot_messages');
    console.log('Chat data cleared on logout (knowledge base preserved)');
  }

  // Get an empty messages array for resetting chat
  getEmptyMessages(): any[] {
    return [{
      role: 'system',
      content: 'I am a specialized AI assistant that ONLY answers questions based on the knowledge base documents that have been loaded. I do not use general knowledge or external information. I cannot answer programming questions, general questions, or any questions outside the scope of the loaded knowledge base documents. If a question cannot be answered from the loaded documents, I will clearly state that I cannot answer it based on the available information.',
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
    const isLoaded = localStorage.getItem('chatbot_knowledge_base_loaded');
    
    if (saved && isLoaded === 'true') {
      this.knowledgeBase = JSON.parse(saved);
      this.isKnowledgeBaseLoaded = true;
      console.log('Knowledge base loaded from storage:', this.knowledgeBase.length, 'documents');
    } else {
      this.knowledgeBase = [];
      this.isKnowledgeBaseLoaded = false;
      console.log('No knowledge base found in storage');
    }
  }

  private saveKnowledgeBase(): void {
    localStorage.setItem('chatbot_knowledge_base', JSON.stringify(this.knowledgeBase));
    localStorage.setItem('chatbot_knowledge_base_loaded', 'true');
  }

  // Check if knowledge base is available
  isKnowledgeBaseAvailable(): boolean {
    return this.isKnowledgeBaseLoaded && this.knowledgeBase.length > 0;
  }
}
