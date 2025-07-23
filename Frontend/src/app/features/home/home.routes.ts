// src/app/features/home/home.routes.ts
import { Routes } from '@angular/router';
import { HomePageComponent } from './pages/home-page';

export const HOME_ROUTES: Routes = [
  { path: '', component: HomePageComponent },
  // Add other home-related routes here if your home feature expands
];