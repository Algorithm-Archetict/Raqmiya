import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService, AdminUserSummary } from '../../../core/services/admin/admin.service';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './users.html',
  styleUrl: './users.css'
})
export class AdminUsers implements OnInit {
  users: AdminUserSummary[] = [];
  loading = false;
  error: string | null = null;

  constructor(private admin: AdminService) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers() {
    this.loading = true;
    this.error = null;
    this.admin.getUsers().subscribe({
      next: res => {
        this.users = res ?? [];
        this.loading = false;
      },
      error: _ => {
        this.error = 'Failed to load users';
        this.loading = false;
      }
    });
  }

  toggleActive(user: AdminUserSummary) {
    const call = user.isActive ? this.admin.deactivateUser(user.id) : this.admin.activateUser(user.id);
    call.subscribe({
      next: _ => this.loadUsers(),
      error: _ => (this.error = 'Failed to update user')
    });
  }
}
