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
  hoveredCategory: Category | null = null;
  showMoreDropdown = false;
  
  private categoryHoverTimeout: any;
  private moreHoverTimeout: any;

  // Configuration
  maxVisibleCategories = 16; // Show first 6 categories directly, rest in "More" dropdown

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
      },
      error: (error: any) => {
        console.warn('Failed to load categories from API, using static data:', error);
        // Fallback to static hierarchical categories
        this.categories = HIERARCHICAL_CATEGORIES;
        this.organizeCategories();
      }
    });
  }

  organizeCategories() {
    this.visibleCategories = this.categories.slice(0, this.maxVisibleCategories);
    this.hiddenCategories = this.categories.slice(this.maxVisibleCategories);
  }

  onCategoryHover(category: Category | null, event?: MouseEvent) {
    if (category) {
      clearTimeout(this.categoryHoverTimeout);
      this.hoveredCategory = category;
      if (event && event.target) {
        this.positionDropdown(event.target as HTMLElement);
      }
    } else {
      this.categoryHoverTimeout = setTimeout(() => {
        this.hoveredCategory = null;
      }, 200);      // i edited
    }
  }

  onDropdownHover() {
    clearTimeout(this.categoryHoverTimeout);
  }

  onDropdownLeave() {
    this.categoryHoverTimeout = setTimeout(() => {
      this.hoveredCategory = null;
    }, 200);
  }

  private positionDropdown(buttonElement: HTMLElement) {
    // Wait for next tick to ensure dropdown is rendered
    setTimeout(() => {
      const dropdown = this.elementRef.nativeElement.querySelector('.subcategory-dropdown');
      if (dropdown) {
        const buttonRect = buttonElement.getBoundingClientRect();
        const navHeight = this.elementRef.nativeElement.getBoundingClientRect().height;
        
        // Position the dropdown below the entire navigation area
        const top = buttonRect.bottom + 10; // 10px gap
        const left = buttonRect.left + (buttonRect.width / 2) - (dropdown.offsetWidth / 2);
        
        dropdown.style.top = `${top}px`;
        dropdown.style.left = `${Math.max(20, Math.min(left, window.innerWidth - dropdown.offsetWidth - 20))}px`; // Keep within viewport
        dropdown.style.transform = 'none'; // Remove the transform since we're setting exact positions
      }
    });
  }

  onMoreHover(show: boolean) {
    if (show) {
      clearTimeout(this.moreHoverTimeout);
      this.showMoreDropdown = true;
    } else {
      this.moreHoverTimeout = setTimeout(() => {
        this.showMoreDropdown = false;
      }, 200);
    }
  }

  onMoreDropdownHover() {
    clearTimeout(this.moreHoverTimeout);
  }

  onMoreDropdownLeave() {
    this.moreHoverTimeout = setTimeout(() => {
      this.showMoreDropdown = false;
    }, 200);
  }

  onBackdropClick() {
    this.hoveredCategory = null;
    this.showMoreDropdown = false;
  }

  onCategoryClick(categoryId: number | 'all', includeNested: boolean = true) {
    this.selectedCategoryId = categoryId;
    this.categorySelected.emit({ id: categoryId, includeNested });
    
    // Hide dropdowns
    this.hoveredCategory = null;
    this.showMoreDropdown = false;
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