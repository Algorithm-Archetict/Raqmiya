import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-alert',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="alert alert-{{ type }} alert-dismissible fade show" role="alert">
      <i class="fas fa-{{ getIcon() }} me-2"></i>
      {{ message }}
      <button type="button" class="btn-close" (click)="close()" aria-label="Close"></button>
    </div>
  `,
  styles: [`
    .alert {
      border-radius: 8px;
      border: none;
      padding: 12px 16px;
      margin-bottom: 16px;
      font-size: 14px;
    }
    
    .alert-success {
      background-color: #d4edda;
      color: #155724;
      border-left: 4px solid #28a745;
    }
    
    .alert-danger {
      background-color: #f8d7da;
      color: #721c24;
      border-left: 4px solid #dc3545;
    }
    
    .alert-warning {
      background-color: #fff3cd;
      color: #856404;
      border-left: 4px solid #ffc107;
    }
    
    .alert-info {
      background-color: #d1ecf1;
      color: #0c5460;
      border-left: 4px solid #17a2b8;
    }
    
    .btn-close {
      background: none;
      border: none;
      font-size: 18px;
      cursor: pointer;
      float: right;
      opacity: 0.5;
    }
    
    .btn-close:hover {
      opacity: 1;
    }
  `]
})
export class Alert {
  @Input() message: string = '';
  @Input() type: 'success' | 'danger' | 'warning' | 'info' = 'info';

  getIcon(): string {
    switch (this.type) {
      case 'success': return 'check-circle';
      case 'danger': return 'exclamation-circle';
      case 'warning': return 'exclamation-triangle';
      case 'info': return 'info-circle';
      default: return 'info-circle';
    }
  }

  close(): void {
    // You can emit an event here if you want to handle closing from parent component
    const alertElement = document.querySelector('.alert');
    if (alertElement) {
      alertElement.remove();
    }
  }
} 