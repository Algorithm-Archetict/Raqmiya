import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../core/services/admin/admin.service';

@Component({
  selector: 'app-admin-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings.html',
  styleUrl: './settings.css'
})
export class AdminSettings implements OnInit {
  settings: any = {};
  loading = false;
  saving = false;
  error: string | null = null;
  saved = false;

  constructor(private admin: AdminService) {}

  ngOnInit(): void { this.load(); }

  load() {
    this.loading = true;
    this.admin.getSettings().subscribe({
      next: s => { this.settings = s || {}; this.loading = false; },
      error: _ => { this.error = 'Failed to load settings'; this.loading = false; }
    });
  }

  save() {
    this.saving = true; this.saved = false; this.error = null;
    this.admin.updateSettings(this.settings).subscribe({
      next: _ => { this.saved = true; this.saving = false; },
      error: _ => { this.error = 'Failed to save settings'; this.saving = false; }
    });
  }
}
