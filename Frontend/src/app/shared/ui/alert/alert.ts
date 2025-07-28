// src/app/shared/ui/alert/alert.ts
import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-alert',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './alert.html',
  styleUrls: ['./alert.css']
})
export class Alert {
  @Input() message: string = ''; // Message to display
  @Input() type: 'success' | 'danger' | 'warning' | 'info' = 'info'; // Type of alert

  // You can add methods for closing the alert, etc.
}