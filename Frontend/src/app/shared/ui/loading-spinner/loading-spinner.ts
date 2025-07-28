// src/app/shared/ui/loading-spinner/loading-spinner.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common'; // Important for standalone components

@Component({
  selector: 'app-loading-spinner', // HTML selector for this component
  standalone: true,                  // Marks it as a standalone component
  imports: [CommonModule],           // CommonModule for basic Angular directives (e.g., *ngIf)
  templateUrl: './loading-spinner.html', // Path to its HTML template
  styleUrls: ['./loading-spinner.css']   // Path to its CSS styles
})
export class LoadingSpinner {
  // No complex logic needed for a simple spinner
}