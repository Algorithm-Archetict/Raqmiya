import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { AdminService } from '../../../core/services/admin.service';
import { ProductService } from '../../../core/services/product.service';
import { AdminUserDTO } from '../../../core/models/admin/admin-user.dto';

interface UserWithProducts extends AdminUserDTO {
  productCount?: number;
}

@Component({
  selector: 'app-admin-user-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './admin-user-detail.html',
  styleUrls: ['./admin-user-detail.css']
})
export class AdminUserDetail implements OnInit {
  user: UserWithProducts | null = null;
  loading = false;
  error = '';
  notFound = false;

  constructor(
    private adminService: AdminService,
    private productService: ProductService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadUser();
  }

  loadUser(): void {
    this.loading = true;
    this.error = '';
    this.notFound = false;

    const userId = Number(this.route.snapshot.paramMap.get('id'));
    if (isNaN(userId)) {
      this.error = 'Invalid user ID';
      this.loading = false;
      return;
    }

    this.adminService.getUserById(userId).subscribe({
      next: (user) => {
        this.user = user;
        this.loadProductCount(userId);
        this.loading = false;
      },
      error: (error) => {
        if (error.message?.includes('not found') || error.status === 404) {
          this.notFound = true;
        } else {
          this.error = this.getErrorMessage(error);
        }
        this.loading = false;
      }
    });
  }

  private loadProductCount(userId: number): void {
    if (this.user && this.user.role === 'Creator') {
      // TODO: Implement real backend endpoint for getting product count per user
      // For now, simulate product count
      this.user.productCount = Math.floor(Math.random() * 20) + 1;
    }
  }

  toggleActivation(): void {
    if (!this.user) return;

    const operation = this.user.isActive ? 
      this.adminService.deactivateUser(this.user.id) : 
      this.adminService.activateUser(this.user.id);

    operation.subscribe({
      next: () => {
        // Update the user's status locally
        if (this.user) {
          this.user.isActive = !this.user.isActive;
        }
      },
      error: (error) => {
        this.error = this.getErrorMessage(error);
      }
    });
  }

  getStatusBadgeClass(isActive: boolean): string {
    return isActive ? 'badge-success' : 'badge-danger';
  }

  getRoleBadgeClass(role: string): string {
    switch (role) {
      case 'Admin':
        return 'badge-primary';
      case 'Creator':
        return 'badge-warning';
      case 'Customer':
        return 'badge-info';
      default:
        return 'badge-secondary';
    }
  }

  getUserInitials(username: string): string {
    return username
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
    this.loadUser();
  }

  clearError(): void {
    this.error = '';
  }

  goBack(): void {
    this.router.navigate(['/admin/users']);
  }
}
