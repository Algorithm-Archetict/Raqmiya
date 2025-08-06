import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AdminService } from '../../../core/services/admin.service';
import { ProductService } from '../../../core/services/product.service';
import { AdminUserDTO } from '../../../core/models/admin/admin-user.dto';
import { FormsModule } from '@angular/forms';

interface UserWithProducts extends AdminUserDTO {
  productCount?: number;
}

@Component({
  selector: 'app-admin-user-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './admin-user-list.html',
  styleUrls: ['./admin-user-list.css']
})
export class AdminUserList implements OnInit {
  users: UserWithProducts[] = [];
  loading = false;
  error = '';
  selectedRole = 'all';

  constructor(
    private adminService: AdminService,
    private productService: ProductService
  ) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.loading = true;
    this.error = '';

    this.adminService.getAllUsers().subscribe({
      next: (users) => {
        this.users = users;
        this.loadProductCounts();
        this.loading = false;
      },
      error: (error) => {
        this.error = this.getErrorMessage(error);
        this.loading = false;
      }
    });
  }

  private loadProductCounts(): void {
    // For now, we'll simulate product counts for creators
    // TODO: Implement real backend endpoint for getting product counts per user
    this.users.forEach(user => {
      if (user.role === 'Creator') {
        // Simulate product count - replace with real API call when available
        user.productCount = Math.floor(Math.random() * 20) + 1;
      }
    });
  }

  toggleActivation(user: UserWithProducts): void {
    if (!user) return;

    const operation = user.isActive ? 
      this.adminService.deactivateUser(user.id) : 
      this.adminService.activateUser(user.id);

    operation.subscribe({
      next: () => {
        // Update the user's status locally
        user.isActive = !user.isActive;
      },
      error: (error) => {
        this.error = this.getErrorMessage(error);
      }
    });
  }

  getFilteredUsers(): UserWithProducts[] {
    if (this.selectedRole === 'all') {
      return this.users;
    }
    return this.users.filter(user => user.role === this.selectedRole);
  }

  getCreatorsCount(): number {
    return this.users.filter(user => user.role === 'Creator').length;
  }

  getCustomersCount(): number {
    return this.users.filter(user => user.role === 'Customer').length;
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
    this.loadUsers();
  }
}
