import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DashboardSidebar } from '../dashboard-sidebar/dashboard-sidebar';

@Component({
  selector: 'app-settings',
  imports: [CommonModule, RouterModule, DashboardSidebar],
  templateUrl: './settings.html',
  styleUrl: './settings.css'
})
export class Settings {
  
  updateSettings() {
    // TODO: Implement settings update logic
    console.log('Updating settings...');
    // This will be called when the "Update Settings" button is clicked
    // You can add your API calls here to save all settings
  }
}
