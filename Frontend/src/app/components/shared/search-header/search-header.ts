import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-search-header',
  imports: [CommonModule, FormsModule],
  templateUrl: './search-header.html',
  styleUrl: './search-header.css'
})
export class SearchHeader {
  @Output() searchQueryChange = new EventEmitter<string>();
  @Output() categoryFilterChange = new EventEmitter<string>();

  searchQuery: string = '';
  selectedCategory: string = 'all';

  // Search functionality
  onSearch() {
    this.searchQueryChange.emit(this.searchQuery);
  }

  // Category filtering
  filterByCategory(category: string) {
    this.selectedCategory = category;
    this.categoryFilterChange.emit(category);
  }
} 