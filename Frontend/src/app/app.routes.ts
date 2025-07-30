// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth-guard'; // Import auth guard for protected routes

export const ROUTES: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' }, // Redirect root to home
  {
    path: 'home',
    loadChildren: () => import('./features/home/home.routes').then(m => m.HOME_ROUTES)
  },
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes').then(m => m.AUTH_ROUTES)
  },
  {
    path: 'products',
    loadChildren: () => import('./features/products/products.routes').then(m => m.PRODUCTS_ROUTES),
    // You might want to protect all product routes or specific ones within the feature
    // canActivate: [authGuard]
  },
  {
    path: 'features',
    loadComponent: () => import('./features/features/features').then(m => m.FeaturesComponent)
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./features/dashboard/dashboard').then(m => m.DashboardComponent),
    canActivate: [authGuard]
  },
  // Example for a profile route, protected by authGuard
  {
    path: 'profile',
    loadComponent: () => import('./features/auth/components/login').then(m => m.LoginComponent), // Placeholder, replace with actual profile component
    canActivate: [authGuard]
  },
  { path: '**', redirectTo: 'home' } // Wildcard route for 404 - redirect to home
];