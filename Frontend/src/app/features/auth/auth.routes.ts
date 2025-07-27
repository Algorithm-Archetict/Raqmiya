// src/app/features/auth/auth.routes.ts
import { Routes } from '@angular/router';
import { LoginComponent } from './components/login'; // Import standalone login component
import { RegisterComponent } from './components/register'; // Import standalone register component

export const AUTH_ROUTES: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' }, // Default for /auth
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  // Add other auth-related routes here, e.g., 'forgot-password', 'reset-password'
];