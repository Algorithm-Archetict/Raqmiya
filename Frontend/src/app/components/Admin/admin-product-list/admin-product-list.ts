import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ProductService } from '../../../core/services/product.service';
import { Subject, Subscription, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, tap, catchError } from 'rxjs/operators';
import { ProductListItemDTO } from '../../../core/models/product/product-list-item.dto';
import { ProductListItemDTOPagedResultDTO } from '../../../core/models/product/product-list-item-paged-result.dto';

@Component({
  selector: 'app-admin-product-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './admin-product-list.html',
  styleUrls: ['./admin-product-list.css']
})
export class AdminProductList implements OnInit, OnDestroy {
  status: 'pending' | 'published' | 'rejected' = 'pending';
  isLoading = false;
  error = '';
  searchTerm = '';
  items: ProductListItemDTO[] = [];
  page = 1;
  size = 10;
  totalItems = 0;
  totalPages = 0;
  hasNextPage = false;
  hasPreviousPage = false;
  
  // Statistics data
  statistics = {
    totalProducts: 0,
    pendingProducts: 0,
    publishedProducts: 0,
    rejectedProducts: 0,
    activeProducts: 0,
    inactiveProducts: 0
  };

  // Debounced search
  private searchSubject = new Subject<string>();
  private searchSubscription: Subscription | null = null;

  constructor(private products: ProductService) {}

  ngOnInit(): void {
    this.loadStatistics();
    this.load();

    // Wire up debounced search (300ms). When empty term is emitted, load admin list by status.
    this.searchSubscription = this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      tap(() => {
        this.page = 1; // reset page for new search
        this.isLoading = true;
        this.error = '';
      }),
      switchMap((term: string) => {
        const q = term ? term.trim() : '';
        if (!q) {
          // load admin list for current status
          return this.products.getByStatus(this.status, this.page, this.size).pipe(
            catchError(err => {
              // convert to null so subscriber can handle
              return of(null as unknown as ProductListItemDTOPagedResultDTO);
            })
          );
        }
        return this.products.searchProducts(q, this.page, this.size).pipe(
          catchError(err => of(null as unknown as ProductListItemDTOPagedResultDTO))
        );
      })
    ).subscribe((res: ProductListItemDTOPagedResultDTO | null) => {
      if (!res) {
        this.items = [];
        this.totalItems = 0;
        this.totalPages = 0;
        this.hasNextPage = false;
        this.hasPreviousPage = false;
        this.isLoading = false;
        return;
      }

      this.items = res.items || [];
      this.totalItems = res.totalCount || 0;
      this.totalPages = res.totalPages || 0;
      this.hasNextPage = res.hasNextPage || false;
      this.hasPreviousPage = res.hasPreviousPage || false;
      this.isLoading = false;
    });
  }

  load() {
    this.isLoading = true;
    this.error = '';
    this.products.getByStatus(this.status, this.page, this.size).subscribe({
      next: (res: ProductListItemDTOPagedResultDTO) => { 
        this.items = res.items || [];
        this.totalItems = res.totalCount || 0;
        this.totalPages = res.totalPages || 0;
        this.hasNextPage = res.hasNextPage || false;
        this.hasPreviousPage = res.hasPreviousPage || false;
        this.isLoading = false; 
      },
      error: (err: any) => { 
        this.error = this.getErrorMessage(err); 
        this.isLoading = false; 
      }
    });
  }

  onStatusChange() {
    this.page = 1; // Reset to first page when status changes
    this.load();
  }

  refreshProducts() {
    this.load();
  }

  approveProduct(productId: number) {
    this.products.approve(productId).subscribe({
      next: () => {
        this.load(); // Refresh the list
        this.loadStatistics(); // Refresh statistics
      },
      error: (err: any) => {
        this.error = this.getErrorMessage(err);
      }
    });
  }

  rejectProduct(productId: number) {
    this.products.reject(productId, 'Rejected by admin').subscribe({
      next: () => {
        this.load(); // Refresh the list
        this.loadStatistics(); // Refresh statistics
      },
      error: (err: any) => {
        this.error = this.getErrorMessage(err);
      }
    });
  }

  activateProduct(productId: number) {
    this.products.activate(productId).subscribe({
      next: () => {
        this.load(); // Refresh the list
        this.loadStatistics(); // Refresh statistics
      },
      error: (err: any) => {
        this.error = this.getErrorMessage(err);
      }
    });
  }

  deactivateProduct(productId: number) {
    this.products.deactivate(productId).subscribe({
      next: () => {
        this.load(); // Refresh the list
        this.loadStatistics(); // Refresh statistics
      },
      error: (err: any) => {
        this.error = this.getErrorMessage(err);
      }
    });
  }

  getFilteredProducts(): ProductListItemDTO[] {
  // Items are provided by the API. Searching now queries the backend and replaces
  // `this.items` with the search results. Return the current items array directly.
  return this.items;
  }

  // Load overall statistics
  loadStatistics(): void {
    // Since we don't have a dedicated statistics endpoint, we'll fetch counts for each status
    // This is a temporary solution - ideally the backend should provide a statistics endpoint
    
    let completedRequests = 0;
    const totalRequests = 3;
    
    const calculateTotal = () => {
      completedRequests++;
      if (completedRequests === totalRequests) {
        this.statistics.totalProducts = this.statistics.pendingProducts + 
                                       this.statistics.publishedProducts + 
                                       this.statistics.rejectedProducts;
      }
    };
    
    // Get total count by fetching first page of all statuses
    this.products.getByStatus('pending', 1, 1).subscribe({
      next: (res) => {
        this.statistics.pendingProducts = res.totalCount || 0;
        calculateTotal();
      },
      error: () => {
        this.statistics.pendingProducts = 0;
        calculateTotal();
      }
    });
    
    this.products.getByStatus('published', 1, 1).subscribe({
      next: (res) => {
        this.statistics.publishedProducts = res.totalCount || 0;
        // For now, assume all published are active (we'd need more API info for accurate active/inactive)
        this.statistics.activeProducts = res.totalCount || 0;
        this.statistics.inactiveProducts = 0;
        calculateTotal();
      },
      error: () => {
        this.statistics.publishedProducts = 0;
        this.statistics.activeProducts = 0;
        this.statistics.inactiveProducts = 0;
        calculateTotal();
      }
    });
    
    this.products.getByStatus('rejected', 1, 1).subscribe({
      next: (res) => {
        this.statistics.rejectedProducts = res.totalCount || 0;
        calculateTotal();
      },
      error: () => {
        this.statistics.rejectedProducts = 0;
        calculateTotal();
      }
    });
  }

  // Statistics methods - now using stored statistics
  getTotalProductsCount(): number {
    return this.statistics.totalProducts;
  }

  getPendingProductsCount(): number {
    return this.statistics.pendingProducts;
  }

  getPublishedProductsCount(): number {
    return this.statistics.publishedProducts;
  }

  getRejectedProductsCount(): number {
    return this.statistics.rejectedProducts;
  }

  getActiveProductsCount(): number {
    return this.statistics.activeProducts;
  }

  getInactiveProductsCount(): number {
    return this.statistics.inactiveProducts;
  }

  // Status helper methods
  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'pending':
        return 'badge-warning';
      case 'published':
        return 'badge-success';
      case 'rejected':
        return 'badge-danger';
      default:
        return 'badge-secondary';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'pending':
        return 'fas fa-clock';
      case 'published':
        return 'fas fa-check-circle';
      case 'rejected':
        return 'fas fa-times-circle';
      default:
        return 'fas fa-question-circle';
    }
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'published':
        return 'Published';
      case 'rejected':
        return 'Rejected';
      default:
        return status;
    }
  }

  getCreatorInitials(creatorName: string): string {
    return creatorName
      .split(' ')
      .map(name => name.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  getErrorMessage(error: any): string {
    if (error.error instanceof ErrorEvent) {
      return `Error: ${error.error.message}`;
    }
    
    if (error.message) {
      return error.message;
    }
    
    return 'An unexpected error occurred. Please try again.';
  }

  retryLoad(): void {
    this.load();
  }

  clearFilters(): void {
    // Clear search and reload the current status page from the server
    this.searchTerm = '';
    this.page = 1;
    // Emit empty term so debounced pipeline handles loading
    this.searchSubject.next('');
  }

  onSearchChange(term: string): void {
    // Push the new term into the debounced search stream
    this.searchTerm = term || '';
    this.searchSubject.next(this.searchTerm);
  }

  ngOnDestroy(): void {
    if (this.searchSubscription) {
      this.searchSubscription.unsubscribe();
      this.searchSubscription = null;
    }
  }

  // Pagination methods
  goToPage(pageNumber: number): void {
    if (pageNumber >= 1 && pageNumber <= this.totalPages) {
      this.page = pageNumber;
      this.fetchCurrentPage();
    }
  }

  nextPage(): void {
    if (this.hasNextPage) {
      this.page++;
      this.fetchCurrentPage();
    }
  }

  previousPage(): void {
    if (this.hasPreviousPage) {
      this.page--;
      this.fetchCurrentPage();
    }
  }

  private fetchCurrentPage(): void {
    // If there's an active search term, use search endpoint, otherwise use admin by-status
    this.isLoading = true;
    this.error = '';

    if (this.searchTerm && this.searchTerm.trim()) {
      this.products.searchProducts(this.searchTerm.trim(), this.page, this.size).subscribe({
        next: (res: ProductListItemDTOPagedResultDTO) => {
          this.items = res.items || [];
          this.totalItems = res.totalCount || 0;
          this.totalPages = res.totalPages || 0;
          this.hasNextPage = res.hasNextPage || false;
          this.hasPreviousPage = res.hasPreviousPage || false;
          this.isLoading = false;
        },
        error: (err: any) => {
          this.error = this.getErrorMessage(err);
          this.isLoading = false;
        }
      });
    } else {
      // normal admin list by status
      this.products.getByStatus(this.status, this.page, this.size).subscribe({
        next: (res: ProductListItemDTOPagedResultDTO) => {
          this.items = res.items || [];
          this.totalItems = res.totalCount || 0;
          this.totalPages = res.totalPages || 0;
          this.hasNextPage = res.hasNextPage || false;
          this.hasPreviousPage = res.hasPreviousPage || false;
          this.isLoading = false;
        },
        error: (err: any) => {
          this.error = this.getErrorMessage(err);
          this.isLoading = false;
        }
      });
    }
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const startPage = Math.max(1, this.page - 2);
    const endPage = Math.min(this.totalPages, this.page + 2);
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    
    return pages;
  }

  getStartIndex(): number {
    return (this.page - 1) * this.size + 1;
  }

  getEndIndex(): number {
    return Math.min(this.page * this.size, this.totalItems);
  }
}


