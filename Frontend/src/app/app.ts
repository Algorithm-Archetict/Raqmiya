// src/app/app.ts (or app.component.ts if CLI generated it this way)
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router'; // For router-outlet
import { NavbarComponent } from './core/components/navbar/navbar'; // Import your Navbar component

@Component({
  selector: 'app-root', // The main selector for your application
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,     // Required for <router-outlet>
    NavbarComponent   // Make NavbarComponent available
  ],
  templateUrl: './app.html', // Path to your root HTML template
  styleUrls: ['./app.css']   // Path to your root CSS styles
})
export class AppComponent {
  title = 'gumroad-frontend'; // Your application title
}