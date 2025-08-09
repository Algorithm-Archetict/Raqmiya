import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService } from '../../../core/services/admin/admin.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-admin-content',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './content.html',
  styleUrl: './content.css'
})
export class AdminContent implements OnInit {
  items: any[] = [];
  loading = false;
  error: string | null = null;

  constructor(private admin: AdminService, private toast: ToastService) {}

  ngOnInit(): void {
    this.load();
  }

  load() {
    this.loading = true;
    this.error = null;
    this.admin.getFlaggedContent(1, 20).subscribe({
      next: (res: any) => {
        // Support either { items, total } or a plain array
        this.items = Array.isArray(res) ? res : (res?.items ?? []);
        this.loading = false;
      },
      error: _ => {
        this.error = 'Failed to load content';
        this.toast.error(this.error);
        this.loading = false;
      }
    });
  }

  approve(id: number) {
    this.admin.approveContent(id).subscribe({
      next: _ => { this.toast.success('Product approved'); this.load(); },
      error: _ => this.toast.error('Failed to approve')
    });
  }
  reject(id: number) {
    this.admin.rejectContent(id, 'Not compliant').subscribe({
      next: _ => { this.toast.success('Product rejected'); this.load(); },
      error: _ => this.toast.error('Failed to reject')
    });
  }
}
