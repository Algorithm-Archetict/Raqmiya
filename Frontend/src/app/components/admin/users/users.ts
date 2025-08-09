import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService, AdminUserSummary } from '../../../core/services/admin/admin.service';
import { ToastService } from '../../../core/services/toast.service';

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
  success: string | null = null;

  constructor(private admin: AdminService, private toast: ToastService) {}

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
    this.toast.error(this.error);
        this.loading = false;
      }
    });
  }

  toggleActive(user: AdminUserSummary) {
    const wasActive = user.isActive;
    const call = wasActive ? this.admin.deactivateUser(user.id) : this.admin.activateUser(user.id);
  this.error = null; this.success = null;
    call.subscribe({
      next: (msg: any) => {
        // Optimistically update UI, then refresh list
        user.isActive = !wasActive;
    this.success = typeof msg === 'string' && msg ? msg : `User ${user.id} ${wasActive ? 'deactivated' : 'activated'}.`;
    this.toast.success(this.success);
        this.loadUsers();
        // Auto-clear success after a short delay
        setTimeout(() => { this.success = null; }, 3000);
      },
      error: _ => {
        this.error = 'Failed to update user';
    this.toast.error(this.error);
        // Revert in case of failure
        user.isActive = wasActive;
      }
    });
  }
}
