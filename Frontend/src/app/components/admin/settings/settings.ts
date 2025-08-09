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
  // No backend admin settings endpoints yet; show info message
  this.loading = false;
  this.error = null;
  }

  save() {
  // Placeholder save; no-op until backend provides endpoints
  this.saved = true;
  this.saving = false;
  }
}
