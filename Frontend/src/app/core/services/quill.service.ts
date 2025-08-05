import { Injectable } from '@angular/core';
import Quill from 'quill';

@Injectable({
  providedIn: 'root'
})
export class QuillService {
  private quill: Quill | null = null;

  constructor() {}

  initializeQuill(selector: string, placeholder: string = '', type: 'description' | 'content' = 'description'): Quill {
    // Check if element exists
    const element = document.querySelector(selector);
    if (!element) {
      throw new Error(`Quill container not found: ${selector}`);
    }

    // Destroy existing instance if any
    this.destroy();

    let toolbarOptions: any[] = [];

    if (type === 'description') {
      // Description toolbar: Text dropdown | Bold | Italic | Underline | Quote | Insert Link | Insert Image | Insert video | Insert audio
      toolbarOptions = [
        [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
        ['bold', 'italic', 'underline'],
        ['blockquote'],
        ['link', 'image', 'video']
      ];
    } else if (type === 'content') {
      // Content toolbar: Text Menu | Bold | Italic | Under Line | striket through | Quote | Insert Link | Upload files
      toolbarOptions = [
        [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        ['blockquote'],
        ['link', 'image']
      ];
    }

    const options = {
      modules: {
        toolbar: toolbarOptions
      },
      placeholder: placeholder,
      theme: 'snow'
    };

    try {
      this.quill = new Quill(selector, options);
      return this.quill;
    } catch (error) {
      console.error('Error initializing Quill:', error);
      throw new Error(`Failed to initialize Quill editor: ${error}`);
    }
  }

  getQuill(): Quill | null {
    return this.quill;
  }

  getContent(): string {
    return this.quill ? this.quill.root.innerHTML : '';
  }

  setContent(content: string): void {
    if (this.quill) {
      this.quill.root.innerHTML = content;
    }
  }

  getText(): string {
    return this.quill ? this.quill.getText() : '';
  }

  destroy(): void {
    if (this.quill) {
      try {
        // Clean up Quill instance if needed
        this.quill = null;
      } catch (error) {
        console.error('Error destroying Quill instance:', error);
      }
    }
  }
} 