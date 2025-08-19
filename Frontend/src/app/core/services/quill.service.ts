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

    // Ensure container is clean to avoid duplicate editors or stale content
    try {
      (element as HTMLElement).innerHTML = '';
    } catch {}

    let toolbarOptions: any[] = [];

    if (type === 'description') {
      // Description toolbar: Basic formatting for short descriptions
      toolbarOptions = [
        [{ 'header': [1, 2, 3, false] }],
        ['bold', 'italic', 'underline'],
        ['blockquote'],
        ['link', 'image']
      ];
    } else if (type === 'content') {
      // Simplified content toolbar: Only requested formats
      toolbarOptions = [
        [{ 'header': [1, 2, 3, false] }],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        ['bold', 'italic', 'underline', 'strike'],
        ['blockquote', 'code-block'],
        ['link']
      ];
    }

    const options = {
      modules: {
        toolbar: (document.querySelector('#content-editor-toolbar') ? '#content-editor-toolbar' : toolbarOptions),
        clipboard: {
          matchVisual: false
        }
      },
      placeholder: placeholder,
      theme: 'snow',
      bounds: selector
    };

    try {
      this.quill = new Quill(selector, options);
      
      // Provide a simple initial value for content editor
      if (type === 'content') {
        this.quill.root.innerHTML = '<p>Provided Content...</p>';
      }
      
      // Add custom handlers for better UX
      if (type === 'content') {
        this.setupContentHandlers(this.quill as Quill);
      }
      
      return this.quill;
    } catch (error) {
      console.error('Error initializing Quill:', error);
      throw new Error(`Failed to initialize Quill editor: ${error}`);
    }
  }

  private setupContentHandlers(quillInstance: Quill): void {
    if (!quillInstance) return;

    // Handle link insertion with custom prompt
    const toolbar = quillInstance.getModule('toolbar') as any;
    if (toolbar && typeof toolbar.addHandler === 'function') {
      // Link handler: no tooltip, prompt-based
      toolbar.addHandler('link', () => {
        this.handleLinkInsertion(quillInstance);
      });

      // Video handler: prompt for URL and insert embed
      toolbar.addHandler('video', () => {
        const url = prompt('Enter video URL (YouTube, Vimeo, etc.):');
        if (!url) return;
        const range = quillInstance.getSelection(true);
        const index = range ? range.index : quillInstance.getLength();
        quillInstance.insertEmbed(index, 'video', url, 'user');
        // Move cursor after the embed
        quillInstance.setSelection(index + 1, 0, 'silent');
      });

      // Formula handler: prompt for LaTeX; if formula module unavailable, insert as code
      toolbar.addHandler('formula', () => {
        const latex = prompt('Enter LaTeX formula (e.g., \\frac{a}{b}):');
        if (!latex) return;
        const range = quillInstance.getSelection(true);
        const index = range ? range.index : quillInstance.getLength();
        try {
          quillInstance.insertEmbed(index, 'formula', latex, 'user');
          quillInstance.setSelection(index + 1, 0, 'silent');
        } catch {
          // Fallback if formula blot/module isn't available
          quillInstance.insertText(index, `$${latex}$`, 'code', true, 'user');
          quillInstance.setSelection(index + latex.length + 2, 0, 'silent');
        }
      });
    }

    // Override keyboard shortcut (Ctrl/Cmd + K) to avoid default tooltip
    try {
      const keyboard: any = quillInstance.getModule('keyboard');
      if (keyboard && typeof keyboard.addBinding === 'function') {
        keyboard.addBinding({ key: 'k', shortKey: true }, () => {
          this.handleLinkInsertion(quillInstance);
          return false; // prevent Quill's default tooltip
        });
      }
    } catch {}

    // Remove/disable Snow theme tooltip if present as a final safeguard
    try {
      const theme: any = (quillInstance as any).theme;
      const tooltipObj: any = theme?.tooltip;
      const tooltipRoot: HTMLElement | undefined = tooltipObj?.root;
      if (tooltipObj && tooltipRoot) {
        // Hide tooltip and prevent it from showing again
        tooltipRoot.style.display = 'none';
        if (typeof tooltipObj.show === 'function') {
          tooltipObj.show = () => {};
        }
        if (typeof tooltipObj.edit === 'function') {
          tooltipObj.edit = () => {};
        }
      }
    } catch {}

    // As a final catch-all, observe DOM for any .ql-tooltip and hide it
    try {
      const hideTooltips = () => {
        document.querySelectorAll('.ql-tooltip').forEach((el) => {
          const node = el as HTMLElement;
          node.style.display = 'none';
          node.style.visibility = 'hidden';
          node.style.opacity = '0';
          // Also disable any input inside
          const input = node.querySelector('input');
          if (input) {
            (input as HTMLInputElement).disabled = true;
          }
        });
      };
      // Initial sweep
      hideTooltips();
      // Observe future injections
      const observer = new MutationObserver(() => hideTooltips());
      observer.observe(document.body, { childList: true, subtree: true });
    } catch {}
  }

  private handleImageUpload(): void {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();

    input.onchange = () => {
      const file = input.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const range = this.quill?.getSelection();
          if (range && e.target?.result) {
            this.quill?.insertEmbed(range.index, 'image', e.target.result);
          }
        };
        reader.readAsDataURL(file);
      }
    };
  }

  private handleLinkInsertion(quillInstance: Quill): void {
    const url = prompt('Enter link URL:');
    if (!url || !quillInstance) return;
    const range = quillInstance.getSelection(true);
    if (!range) return;
    if (range.length > 0) {
      // Apply link format to selected text
      quillInstance.format('link', url, 'user');
    } else {
      // Insert the URL as linked text at cursor
      quillInstance.insertText(range.index, url, { link: url }, 'user');
      quillInstance.setSelection(range.index + url.length, 0, 'silent');
    }
  }

  private handleVideoUpload(): void {
    const url = prompt('Enter video URL:');
    if (url && this.quill) {
      const range = this.quill.getSelection();
      if (range) {
        this.quill.insertEmbed(range.index, 'video', url);
      }
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