import { Component, OnInit, Input, Output, EventEmitter, ViewEncapsulation, AfterViewInit, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
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
  @Input() navigateToPages: boolean = true; // New input to control navigation behavior
  @Output() categorySelected = new EventEmitter<{id: number | 'all', includeNested: boolean, allCategoryIds?: number[]}>();

  categories: Category[] = [];
  visibleCategories: Category[] = [];
  hiddenCategories: Category[] = [];
  hoveredCategory: Category | null = null;
  showMoreDropdown = false;
  
  // Accordion functionality - track expanded subcategories
  expandedSubcategories: Set<number> = new Set();
  
  // Track if mouse is over category button or dropdown
  private isOverCategoryButton = false;
  private isOverCategoryDropdown = false;
  private isOverMoreButton = false;
  private isOverMoreDropdown = false;

  // Configuration
  maxVisibleCategories = 16; // Show first 16 categories directly, rest in "More" dropdown
  
  constructor(
    private categoryService: CategoryService,
    private elementRef: ElementRef,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadCategories();
  }

  ngAfterViewInit() {
    // Component is ready for DOM manipulation
  }

  loadCategories() {
    // Use static data by default to ensure consistency with frontend
    console.log('Using static category data for consistency');
    this.categories = HIERARCHICAL_CATEGORIES;
    this.organizeCategories();
    this.debugCategories();
    
    // Optionally try to load from API for comparison (but don't use it)
    this.categoryService.getCategoriesHierarchy().subscribe({
      next: (apiCategories: CategoryDTO[]) => {
        console.log('API categories loaded (for comparison):', apiCategories);
      },
      error: (error: any) => {
        console.warn('Failed to load categories from API:', error);
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
    console.log('=== Category Nav: Category Click ===');
    console.log('Category ID clicked:', categoryId);
    console.log('Include nested:', includeNested);
    console.log('Category name:', categoryId === 'all' ? 'All Categories' : this.categories.find(c => c.id === categoryId)?.name || 'Unknown');
    
    this.selectedCategoryId = categoryId;
    
    // Navigate to category page if enabled
    if (this.navigateToPages && categoryId !== 'all') {
      const categorySlug = this.getCategorySlugById(categoryId);
      if (categorySlug) {
        this.router.navigate(['/category', categorySlug], { 
          queryParams: { sort: 'curated' }
        });
        // Hide dropdowns
        this.hoveredCategory = null;
        this.showMoreDropdown = false;
        return;
      }
    }
    
    // Navigate to discover page for 'all' categories
    if (categoryId === 'all') {
      if (this.navigateToPages) {
        this.router.navigate(['/discover']);
        // Hide dropdowns
        this.hoveredCategory = null;
        this.showMoreDropdown = false;
        return;
      }
    }
    
    // Fallback to event emission if navigation is disabled or fails
    // If includeNested is true and we have a parent category, collect all subcategory IDs
    if (includeNested && categoryId !== 'all') {
      const category = this.categories.find(c => c.id === categoryId);
      if (category && category.subcategories && category.subcategories.length > 0) {
        const allCategoryIds = this.getAllCategoryIds(category);
        console.log('All category IDs to search (parent + subcategories):', allCategoryIds);
        this.categorySelected.emit({ id: categoryId, includeNested, allCategoryIds });
      } else {
        this.categorySelected.emit({ id: categoryId, includeNested });
      }
    } else {
      this.categorySelected.emit({ id: categoryId, includeNested });
    }
    
    // Hide dropdowns
    this.hoveredCategory = null;
    this.showMoreDropdown = false;
  }

  // Helper method to get all category IDs including subcategories recursively
  private getAllCategoryIds(category: Category): number[] {
    let ids = [category.id];
    
    if (category.subcategories) {
      for (const subcategory of category.subcategories) {
        ids = ids.concat(this.getAllCategoryIds(subcategory));
      }
    }
    
    return ids;
  }

  onSubcategoryClick(event: Event, categoryId: number, includeNested: boolean = false) {
    event.stopPropagation(); // Prevent parent category hover from closing
    console.log('=== Category Nav: Subcategory Click ===');
    console.log('Subcategory ID clicked:', categoryId);
    console.log('Include nested:', includeNested);
    console.log('Subcategory name:', this.findCategoryById(categoryId)?.name || 'Unknown');
    
    this.selectedCategoryId = categoryId;
    
    // Navigate to category page if enabled
    if (this.navigateToPages) {
      const categorySlug = this.getCategorySlugById(categoryId);
      if (categorySlug) {
        this.router.navigate(['/category', categorySlug], { 
          queryParams: { sort: 'curated' }
        });
        // Hide dropdowns
        this.hoveredCategory = null;
        this.showMoreDropdown = false;
        return;
      }
    }
    
    // Fallback to event emission if navigation is disabled or fails
    // If includeNested is true, collect all subcategory IDs
    if (includeNested) {
      const category = this.findCategoryById(categoryId);
      if (category && category.subcategories && category.subcategories.length > 0) {
        const allCategoryIds = this.getAllCategoryIds(category);
        console.log('All subcategory IDs to search:', allCategoryIds);
        this.categorySelected.emit({ id: categoryId, includeNested, allCategoryIds });
      } else {
        this.categorySelected.emit({ id: categoryId, includeNested });
      }
    } else {
      this.categorySelected.emit({ id: categoryId, includeNested });
    }
    
    // Hide dropdowns
    this.hoveredCategory = null;
    this.showMoreDropdown = false;
  }

  // New method for hover-only accordion behavior
  onSubcategoryHover(event: Event, categoryId: number, includeNested: boolean = false) {
    event.stopPropagation();
    console.log('=== Category Nav: Subcategory Hover ===');
    console.log('Subcategory ID hovered:', categoryId);
    console.log('Include nested:', includeNested);
    
    // Only handle accordion behavior on hover, no navigation
    if (includeNested) {
      // Add delay for smooth transition
      setTimeout(() => {
        this.toggleSubcategoryAccordion(categoryId);
      }, 400); // 0.4s delay
    }
  }

  // Accordion functionality for subcategories
  toggleSubcategoryAccordion(subcategoryId: number) {
    console.log('=== Toggle Accordion ===');
    console.log('Subcategory ID:', subcategoryId);
    console.log('Currently expanded:', Array.from(this.expandedSubcategories));
    
    if (this.expandedSubcategories.has(subcategoryId)) {
      // Close this subcategory
      this.expandedSubcategories.delete(subcategoryId);
      console.log('Closed subcategory:', subcategoryId);
    } else {
      // Close other subcategories in the same parent category first
      this.closeOtherSubcategoriesInSameParent(subcategoryId);
      // Open this subcategory
      this.expandedSubcategories.add(subcategoryId);
      console.log('Opened subcategory:', subcategoryId);
    }
    
    console.log('Updated expanded subcategories:', Array.from(this.expandedSubcategories));
  }

  // Close other subcategories in the same parent category
  private closeOtherSubcategoriesInSameParent(subcategoryId: number) {
    const subcategory = this.findCategoryById(subcategoryId);
    if (!subcategory) return;
    
    // Find the parent category
    const parentCategory = this.findParentCategory(subcategoryId);
    if (!parentCategory || !parentCategory.subcategories) return;
    
    // Close all other subcategories in the same parent
    parentCategory.subcategories.forEach(sub => {
      if (sub.id !== subcategoryId) {
        this.expandedSubcategories.delete(sub.id);
      }
    });
  }

  // Find parent category of a subcategory
  private findParentCategory(subcategoryId: number): Category | null {
    for (const category of this.categories) {
      if (category.subcategories) {
        for (const subcategory of category.subcategories) {
          if (subcategory.id === subcategoryId) {
            return category;
          }
          // Check sub-subcategories
          if (subcategory.subcategories) {
            for (const subSubcategory of subcategory.subcategories) {
              if (subSubcategory.id === subcategoryId) {
                return subcategory;
              }
            }
          }
        }
      }
    }
    return null;
  }

  // Check if a subcategory is expanded
  isSubcategoryExpanded(subcategoryId: number): boolean {
    return this.expandedSubcategories.has(subcategoryId);
  }

  // Helper method to get category slug by ID
  private getCategorySlugById(categoryId: number): string | null {
    // First try to find the category in our loaded categories
    const category = this.findCategoryById(categoryId);
    if (category) {
      return this.generateSlug(category.name);
    }
    
    // Fallback to static mapping for main categories
    const slugMap: { [key: number]: string } = {
      1: 'fitness-health',
      2: 'self-improvement',
      3: 'writings-publishing',
      4: 'education',
      5: 'business-money',
      6: 'drawing-painting',
      7: 'design',
      8: '3d',
      9: 'music-sound-design',
      10: 'films',
      11: 'software-development',
      12: 'gaming',
      13: 'photography',
      14: 'comics-graphic-novels',
      15: 'fiction-books',
      16: 'audio',
      17: 'recorded-music'
    };
    
    return slugMap[categoryId] || null;
  }

  // Helper method to generate slug from category name
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .trim();
  }

  // Helper method to find category by ID in the hierarchy
  private findCategoryById(id: number): Category | null {
    for (const category of this.categories) {
      if (category.id === id) return category;
      if (category.subcategories) {
        for (const subcategory of category.subcategories) {
          if (subcategory.id === id) return subcategory;
          if (subcategory.subcategories) {
            for (const subSubcategory of subcategory.subcategories) {
              if (subSubcategory.id === id) return subSubcategory;
            }
          }
        }
      }
    }
    return null;
  }

  // --- Hover Management ---
  onCategoryHover(category: Category | null, event?: MouseEvent) {
    if (category) {
      this.isOverCategoryButton = true;
      this.hoveredCategory = category;
      if (event && event.target) {
        this.positionDropdown(event.target as HTMLElement);
      }
    } else {
      this.isOverCategoryButton = false;
      // Only hide if we're not over the dropdown either
      this.checkAndHideDropdown();
    }
  }

  onDropdownHover() {
    this.isOverCategoryDropdown = true;
  }

  onDropdownLeave() {
    this.isOverCategoryDropdown = false;
    // Only hide if we're not over the button either
    this.checkAndHideDropdown();
  }

  private checkAndHideDropdown() {
    // Small delay to prevent flickering when moving between button and dropdown
    setTimeout(() => {
      if (!this.isOverCategoryButton && !this.isOverCategoryDropdown) {
        this.hoveredCategory = null;
      }
    }, 10);
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
      this.isOverMoreButton = true;
      this.showMoreDropdown = true;
    } else {
      this.isOverMoreButton = false;
      this.checkAndHideMoreDropdown();
    }
  }

  onMoreDropdownHover() {
    this.isOverMoreDropdown = true;
  }

  onMoreDropdownLeave() {
    this.isOverMoreDropdown = false;
    this.checkAndHideMoreDropdown();
  }

  private checkAndHideMoreDropdown() {
    // Small delay to prevent flickering when moving between button and dropdown
    setTimeout(() => {
      if (!this.isOverMoreButton && !this.isOverMoreDropdown) {
        this.showMoreDropdown = false;
      }
    }, 10);
  }

  onBackdropClick() {
    this.hoveredCategory = null;
    this.showMoreDropdown = false;
  }

  getCategoryIcon(categoryName: string): string {
    const iconMap: { [key: string]: string } = {
      'Fitness & Health': 'fas fa-dumbbell',
      'Self Improvement': 'fas fa-user-plus',
      'Writings & Publishing': 'fas fa-pen-fancy',
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