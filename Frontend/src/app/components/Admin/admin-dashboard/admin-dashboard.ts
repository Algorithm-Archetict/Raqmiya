import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AdminService } from '../../../core/services/admin.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './admin-dashboard.html',
  styleUrls: ['./admin-dashboard.css']
})
export class AdminDashboard {
  isUsingFallbackData = false;

  constructor(private adminService: AdminService) {
    this.isUsingFallbackData = this.adminService.isUsingFallbackData();
  }

  toggleDataMode(): void {
    this.isUsingFallbackData = !this.isUsingFallbackData;
    this.adminService.setUseFallbackData(this.isUsingFallbackData);
  }
} 