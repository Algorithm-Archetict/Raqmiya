import { Injectable } from '@angular/core';
import Quill from 'quill';

@Injectable({
  providedIn: 'root'
})
export class QuillService {
  private quill: Quill | null = null;

  constructor() {}

  initializeQuill(selector: string, placeholder: string = '', type: 'description' | 'content' = 'description'): Quill {
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

    this.quill = new Quill(selector, options);
    return this.quill;
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
      // Clean up if needed
      this.quill = null;
    }
  }
} 