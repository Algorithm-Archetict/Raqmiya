import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatbotService } from '../../core/services/chatbot.service';
import { AuthService } from '../../core/services/auth.service';
import { LoggingService } from '../../core/services/logging.service';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  images?: string[];
  isLoading?: boolean;
}

interface UploadedFile {
  name: string;
  type: 'text' | 'image';
  size: number;
  content?: string;
  url?: string;
}

@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chatbot.component.html',
  styleUrls: ['./chatbot.component.css']
})
export class ChatbotComponent implements OnInit, OnDestroy {
  isOpen = false;
  messages: ChatMessage[] = [];
  currentMessage = '';
  uploadedFiles: UploadedFile[] = [];
  isAdmin = false;
  isLoading = false;
  showAdminPanel = false;
  knowledgeBaseDocuments: any[] = []; // Added for admin panel display
  uploadSuccessMessage: string = '';
  uploadErrorMessage: string = '';
  showDocumentList = false; // Added for document list display

  constructor(
    private chatbotService: ChatbotService,
    private authService: AuthService,
    private loggingService: LoggingService
  ) {}

  ngOnInit() {
    this.checkAdminStatus();
    this.loadChatHistory();
    
    // Subscribe to auth state changes to update chatbot role
    this.authService.isLoggedIn$.subscribe(isLoggedIn => {
      if (isLoggedIn) {
        this.updateChatbotRole();
      } else {
        this.clearChatbotRole();
        // Clear chat messages when user logs out
        this.clearChatMessages();
      }
    });
  }

  ngOnDestroy() {
    this.saveChatHistory();
  }

  private checkAdminStatus() {
    // Check chatbot's local role storage first
    const chatbotRole = this.getChatbotRole();
    if (chatbotRole) {
      this.isAdmin = chatbotRole === 'Admin';
      this.loggingService.debug('Chatbot role from local storage:', chatbotRole);
      this.loggingService.debug('Is admin:', this.isAdmin);
      return;
    }
    
    // Fallback to auth service
    const currentUser = this.authService.getCurrentUser();
    this.loggingService.debug('Current user:', currentUser);
    this.loggingService.debug('User roles:', currentUser?.roles);
    this.isAdmin = currentUser?.roles?.includes('Admin') || false;
    this.loggingService.debug('Is admin:', this.isAdmin);
  }

  private loadChatHistory() {
    const savedMessages = localStorage.getItem('chatbot_messages');
    if (savedMessages) {
      this.messages = JSON.parse(savedMessages).map((msg: any) => ({
        ...msg,
        timestamp: new Date(msg.timestamp)
      }));
    } else {
      // Initialize with system message
      const hasKnowledgeBase = this.chatbotService.isKnowledgeBaseAvailable();
      const systemMessage = hasKnowledgeBase 
        ? 'Hello! I\'m a specialized AI assistant with access to knowledge base documents. I can answer questions based on the loaded documents. I cannot answer general questions, programming questions, or any questions outside the scope of the loaded documents.'
        : 'Hello! I\'m a specialized AI assistant that can only answer questions based on the knowledge base documents that have been loaded by an admin. I cannot answer general questions, programming questions, or any questions outside the scope of the loaded documents. Please ask an admin to upload relevant documents to the knowledge base if you need assistance.';
      
      this.messages = [{
        role: 'system',
        content: systemMessage,
        timestamp: new Date()
      }];
    }
  }

  private saveChatHistory() {
    localStorage.setItem('chatbot_messages', JSON.stringify(this.messages));
  }

  toggleChat() {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      setTimeout(() => {
        this.scrollToBottom();
      }, 100);
    }
  }

  async sendMessage() {
    if (!this.currentMessage.trim() && this.uploadedFiles.length === 0) return;

    const messageContent = this.currentMessage;
    const userMessage: ChatMessage = {
      role: 'user',
      content: messageContent,
      timestamp: new Date(),
      images: this.uploadedFiles.filter(f => f.type === 'image').map(f => f.url!)
    };

    this.messages.push(userMessage);
    this.currentMessage = '';
    this.isLoading = true;
    this.saveChatHistory();
    this.scrollToBottom();

    try {
      // Check for admin commands
      if (this.isAdmin && messageContent.toLowerCase().startsWith('admin:')) {
        await this.handleAdminCommand(messageContent);
      } else {
        // Regular chat message
        const response = await this.chatbotService.sendMessage(
          messageContent,
          this.uploadedFiles
        );

        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: response,
          timestamp: new Date()
        };

        this.messages.push(assistantMessage);
      }
    } catch (error) {
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Failed to send message'}`,
        timestamp: new Date()
      };
      this.messages.push(errorMessage);
    } finally {
      this.isLoading = false;
      this.uploadedFiles = [];
      this.saveChatHistory();
      this.scrollToBottom();
    }
  }

  private async handleAdminCommand(command: string) {
    const parts = command.toLowerCase().split(' ');
    
    switch (parts[1]) {
      case 'add':
        if (parts[2] === 'document') {
          await this.uploadKnowledgeBaseDocument();
        }
        break;
      case 'list':
        if (parts[2] === 'documents') {
          await this.listKnowledgeBaseDocuments();
        }
        break;
      case 'delete':
        if (parts[2] === 'document') {
          const docName = parts.slice(3).join(' ');
          await this.deleteKnowledgeBaseDocument(docName);
        }
        break;
      case 'search':
        if (parts[2] === 'documents') {
          const query = parts.slice(3).join(' ');
          await this.searchKnowledgeBaseDocuments(query);
        }
        break;
      case 'reload':
        if (parts[2] === 'knowledgebase') {
          await this.reloadKnowledgeBase();
        }
        break;
      default:
        this.messages.push({
          role: 'assistant',
          content: 'Unknown admin command. Available commands: admin: add document, admin: list documents, admin: delete document [name], admin: search documents [query], admin: reload knowledgebase (clears all documents)',
          timestamp: new Date()
        });
    }
  }

  private async uploadKnowledgeBaseDocument() {
    // This will be implemented with file input
    this.messages.push({
      role: 'assistant',
      content: 'Please use the file upload button in the admin panel to add documents to the knowledge base.',
      timestamp: new Date()
    });
  }

  async listKnowledgeBaseDocuments() {
    try {
      // Toggle document list display
      if (this.knowledgeBaseDocuments.length > 0 && this.showDocumentList) {
        this.showDocumentList = false;
        return;
      }
      
      const documents = await this.chatbotService.getKnowledgeBaseDocuments();
      // Store documents for display in admin panel instead of adding to chat
      this.knowledgeBaseDocuments = documents;
      this.showDocumentList = true;
    } catch (error) {
      this.loggingService.error('Error listing documents:', error);
    }
  }

  private async deleteKnowledgeBaseDocument(docName: string) {
    try {
      await this.chatbotService.deleteKnowledgeBaseDocument(docName);
      // Remove from local list and refresh
      this.knowledgeBaseDocuments = this.knowledgeBaseDocuments.filter(doc => doc.name !== docName);
      // Show success message in chat
      this.messages.push({
        role: 'assistant',
        content: `✅ Document "${docName}" deleted from knowledge base.`,
        timestamp: new Date()
      });
    } catch (error) {
      this.messages.push({
        role: 'assistant',
        content: `Error deleting document: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      });
    }
  }

  // New method for admin panel document deletion
  async deleteDocumentFromAdminPanel(docName: string) {
    try {
      await this.chatbotService.deleteKnowledgeBaseDocument(docName);
      // Remove from local list
      this.knowledgeBaseDocuments = this.knowledgeBaseDocuments.filter(doc => doc.name !== docName);
    } catch (error) {
      this.loggingService.error('Error deleting document:', error);
    }
  }

  private async searchKnowledgeBaseDocuments(query: string) {
    try {
      const results = await this.chatbotService.searchKnowledgeBase(query);
      if (results.length === 0) {
        this.messages.push({
          role: 'assistant',
          content: 'No documents found matching your search query.',
          timestamp: new Date()
        });
      } else {
        const resultList = results.map(result => `- ${result.name}: ${result.content.substring(0, 100)}...`).join('\n');
        this.messages.push({
          role: 'assistant',
          content: `🔍 Search Results:\n${resultList}`,
          timestamp: new Date()
        });
      }
    } catch (error) {
      this.messages.push({
        role: 'assistant',
        content: `Error searching documents: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      });
    }
  }

  async reloadKnowledgeBase() {
    try {
      await this.chatbotService.reloadKnowledgeBase();
      this.messages.push({
        role: 'assistant',
        content: '✅ Knowledge base cleared successfully! All documents have been removed. Please upload new documents to the knowledge base.',
        timestamp: new Date()
      });
    } catch (error) {
      this.messages.push({
        role: 'assistant',
        content: `Error reloading knowledge base: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      });
    }
  }

  async loadAssetFile(fileName: string) {
    try {
      await this.chatbotService.loadAssetFile(fileName);
      this.messages.push({
        role: 'assistant',
        content: `✅ Successfully loaded ${fileName} to the knowledge base! All users can now access this information.`,
        timestamp: new Date()
      });
      // Refresh document list
      await this.listKnowledgeBaseDocuments();
    } catch (error) {
      this.messages.push({
        role: 'assistant',
        content: `Error loading ${fileName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      });
    }
  }

  // Check if knowledge base is available for all users
  isKnowledgeBaseAvailable(): boolean {
    return this.chatbotService.isKnowledgeBaseAvailable();
  }

  onFileUpload(event: any) {
    const files = Array.from(event.target.files);
    files.forEach((file: any) => {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        alert(`File ${file.name} is too large. Maximum size is 10MB.`);
        return;
      }

      const uploadedFile: UploadedFile = {
        name: file.name,
        type: file.type.startsWith('image/') ? 'image' : 'text',
        size: file.size
      };

      if (uploadedFile.type === 'image') {
        const reader = new FileReader();
        reader.onload = (e) => {
          uploadedFile.url = e.target?.result as string;
        };
        reader.readAsDataURL(file);
      } else {
        const reader = new FileReader();
        reader.onload = (e) => {
          uploadedFile.content = e.target?.result as string;
        };
        reader.readAsText(file);
      }

      this.uploadedFiles.push(uploadedFile);
    });

    event.target.value = '';
  }

  removeFile(file: UploadedFile) {
    this.uploadedFiles = this.uploadedFiles.filter(f => f !== file);
  }

  toggleAdminPanel() {
    this.showAdminPanel = !this.showAdminPanel;
  }

  async uploadToKnowledgeBase() {
    if (this.uploadedFiles.length === 0) {
      return;
    }

    try {
      this.loggingService.debug('Starting upload to knowledge base...');
      this.loggingService.debug('Files to upload:', this.uploadedFiles);
      
      for (const file of this.uploadedFiles) {
        if (file.type === 'text' && file.content) {
          this.loggingService.debug('Uploading file:', file.name);
          await this.chatbotService.addToKnowledgeBase(file.name, file.content);
          this.loggingService.debug('Successfully uploaded:', file.name);
        }
      }
      
      // Refresh document list and show success message in admin panel
      await this.listKnowledgeBaseDocuments();
      this.uploadSuccessMessage = `✅ Successfully uploaded ${this.uploadedFiles.length} document(s) to knowledge base.`;
      
      this.uploadedFiles = [];
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        this.uploadSuccessMessage = '';
      }, 3000);
    } catch (error) {
      this.loggingService.error('Upload error:', error);
      this.uploadErrorMessage = `Error uploading to knowledge base: ${error instanceof Error ? error.message : 'Unknown error'}`;
      
      // Clear error message after 5 seconds
      setTimeout(() => {
        this.uploadErrorMessage = '';
      }, 5000);
    }
  }

  private scrollToBottom() {
    setTimeout(() => {
      const chatBody = document.querySelector('.chat-body');
      if (chatBody) {
        chatBody.scrollTop = chatBody.scrollHeight;
      }
    }, 100);
  }

  renderMarkdown(text: string): string {
    // Simple markdown rendering
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br>');
  }

  trackByMessage(index: number, message: ChatMessage): string {
    return `${message.role}-${message.timestamp.getTime()}`;
  }

  // Chatbot-specific role management methods
  private updateChatbotRole(): void {
    const currentUser = this.authService.getCurrentUser();
    if (currentUser?.roles && currentUser.roles.length > 0) {
      const role = currentUser.roles[0]; // Get the primary role
      localStorage.setItem('chatbot_user_role', role);
      this.loggingService.debug('Chatbot role updated:', role);
      this.checkAdminStatus(); // Re-check admin status
    }
  }

  private clearChatbotRole(): void {
    localStorage.removeItem('chatbot_user_role');
    this.isAdmin = false;
    this.loggingService.debug('Chatbot role cleared');
  }

  private getChatbotRole(): string | null {
    return localStorage.getItem('chatbot_user_role');
  }

  private clearChatMessages(): void {
    this.messages = [];
    this.saveChatHistory();
    this.loggingService.debug('Chat messages cleared due to logout.');
  }
}
