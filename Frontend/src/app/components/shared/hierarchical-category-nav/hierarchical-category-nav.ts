import { Component, OnInit, Input, Output, EventEmitter, ViewEncapsulation, AfterViewInit, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Category, HIERARCHICAL_CATEGORIES } from '../../../core/data/categories';
import { CategoryService, CategoryDTO } from '../../../core/services/category.service';

@Component({
  selector: 'app-hierarchical-category-nav',
  imports: [CommonModule],
  templateUrl: './hierarchical-category-nav.html',
  styleUrl: './hierarchical-category-nav.css',
  encapsulation: ViewEncapsulation.None
})
export class HierarchicalCategoryNav implements OnInit, AfterViewInit {
  @Input() selectedCategoryId: number | 'all' = 'all';
  @Output() categorySelected = new EventEmitter<{id: number | 'all', includeNested: boolean}>();

  categories: Category[] = [];
  visibleCategories: Category[] = [];
  hiddenCategories: Category[] = [];
  
  // Configuration
  maxVisibleCategories = 16;

  constructor(
    private categoryService: CategoryService,
    private elementRef: ElementRef
  ) {}

  ngOnInit() {
    this.loadCategories();
  }

  ngAfterViewInit() {
    // Component is ready for DOM manipulation
  }

  loadCategories() {
    // Try to load from API first, fallback to static data
    this.categoryService.getCategoriesHierarchy().subscribe({
      next: (apiCategories: CategoryDTO[]) => {
        this.categories = apiCategories.map((cat: CategoryDTO) => this.categoryService.convertToCategory(cat));
        this.organizeCategories();
        this.debugCategories();
      },
      error: (error: any) => {
        console.warn('Failed to load categories from API, using static data:', error);
        // Fallback to static hierarchical categories
        this.categories = HIERARCHICAL_CATEGORIES;
        this.organizeCategories();
        this.debugCategories();
      }
    });
  }

  organizeCategories() {
    this.visibleCategories = this.categories.slice(0, this.maxVisibleCategories);
    this.hiddenCategories = this.categories.slice(this.maxVisibleCategories);
  }

  debugCategories() {
    console.log('All categories:', this.categories);
    console.log('Visible categories:', this.visibleCategories);
    
    // Check which categories have subcategories
    this.visibleCategories.forEach(category => {
      if (category.subcategories && category.subcategories.length > 0) {
        console.log(`Category "${category.name}" has ${category.subcategories.length} subcategories:`, category.subcategories);
      } else {
        console.log(`Category "${category.name}" has no subcategories`);
      }
    });
  }

  onCategoryClick(categoryId: number | 'all', includeNested: boolean = true) {
    this.selectedCategoryId = categoryId;
    this.categorySelected.emit({ id: categoryId, includeNested });
  }

  onSubcategoryClick(event: Event, categoryId: number, includeNested: boolean = false) {
    event.stopPropagation(); // Prevent parent category hover from closing
    this.onCategoryClick(categoryId, includeNested);
  }

  getCategoryIcon(categoryName: string): string {
    const iconMap: { [key: string]: string } = {
      'Fitness & Health': 'fas fa-dumbbell',
      'Self Improvement': 'fas fa-user-plus',
      'Writings & Publishing & Education': 'fas fa-pen-fancy',
      'Business & Money': 'fas fa-chart-line',
      'Drawing & Painting': 'fas fa-palette',
      '3D': 'fas fa-cube',
      'Music & Sound Design': 'fas fa-music',
      'Films': 'fas fa-video',
      'Software Development': 'fas fa-code',
      'Gaming': 'fas fa-gamepad',
      'Photography': 'fas fa-camera',
      'Comics & Graphic Novels': 'fas fa-book-open',
      'Fiction Books': 'fas fa-book',
      'Education': 'fas fa-graduation-cap',
      'Design': 'fas fa-drafting-compass',
      'Audio': 'fas fa-headphones',
      'Recorded Music': 'fas fa-compact-disc'
    };

    return iconMap[categoryName] || 'fas fa-folder';
  }

  trackByCategory(index: number, category: Category): number {
    return category.id;
  }
}