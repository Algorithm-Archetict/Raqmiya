// src/app/features/products/products.routes.ts
import { Routes } from '@angular/router';
import { ProductListComponent } from './pages/product-list';
import { ProductDetailComponent } from './pages/product-detail';
import { ProductCreateComponent } from './pages/product-create';
import { ProductEditComponent } from './pages/product-edit';
import { MyProductsComponent } from './pages/my-products';
import { MyWishlistComponent } from './pages/my-wishlist';
import { authGuard } from '../../core/guards/auth-guard'; // Import the functional auth guard

export const PRODUCTS_ROUTES: Routes = [
  { path: '', redirectTo: 'list', pathMatch: 'full' },
  { path: 'list', component: ProductListComponent },
  { path: 'detail/:id', component: ProductDetailComponent },
  {
    path: 'create',
    component: ProductCreateComponent,
    canActivate: [authGuard] // Protect this route
  },
  {
    path: 'edit/:id',
    component: ProductEditComponent,
    canActivate: [authGuard] // Protect this route
  },
  {
    path: 'my-products',
    component: MyProductsComponent,
    canActivate: [authGuard] // Protect this route
  },
  {
    path: 'my-wishlist',
    component: MyWishlistComponent,
    canActivate: [authGuard] // Protect this route
  },
  // Add other product-related routes here
];