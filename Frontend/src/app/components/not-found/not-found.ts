import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-not-found',
  imports: [CommonModule, FormsModule],
  templateUrl: './not-found.html',
  styleUrl: './not-found.css'
})
export class NotFound {
  searchQuery: string = '';

  constructor(private router: Router) {}

  goHome() {
    this.router.navigate(['/']);
  }

  goBack() {
    window.history.back();
  }

  performSearch() {
    if (this.searchQuery.trim()) {
      // TODO: Implement search functionality
      console.log('Searching for:', this.searchQuery);
      // For now, just navigate to discover page
      this.router.navigate(['/discover'], { 
        queryParams: { search: this.searchQuery } 
      });
    }
  }
}
