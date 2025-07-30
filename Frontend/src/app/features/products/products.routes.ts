// src/app/features/products/products.routes.ts
import { Routes } from '@angular/router';
import { ProductListComponent } from './pages/product-list';
import { ProductDetailComponent } from './pages/product-detail';
import { ProductCreateComponent } from './pages/product-create';
import { ProductEditComponent } from './pages/product-edit';
import { MyProductsComponent } from './pages/my-products';
import { MyWishlistComponent } from './pages/my-wishlist';
import { CartComponent } from './pages/cart';
import { OrderDetailsComponent } from './pages/order-details';
import { authGuard } from '../../core/guards/auth-guard'; // Import the functional auth guard
import { creatorGuard } from '../../core/guards/role-guard'; // Import the creator guard

export const PRODUCTS_ROUTES: Routes = [
  { path: '', redirectTo: 'list', pathMatch: 'full' },
  { path: 'list', component: ProductListComponent },
  { path: 'detail/:id', component: ProductDetailComponent },
  {
    path: 'create',
    component: ProductCreateComponent,
    canActivate: [authGuard, creatorGuard] // Protect this route for creators only
  },
  {
    path: 'edit/:id',
    component: ProductEditComponent,
    canActivate: [authGuard, creatorGuard] // Protect this route for creators only
  },
  {
    path: 'my-products',
    component: MyProductsComponent,
    canActivate: [authGuard, creatorGuard] // Protect this route for creators only
  },
  {
    path: 'my-wishlist',
    component: MyWishlistComponent,
    canActivate: [authGuard] // Protect this route
  },
  {
    path: 'cart',
    component: CartComponent,
    canActivate: [authGuard] // Protect this route
  },
  {
    path: 'order/:id',
    component: OrderDetailsComponent,
    canActivate: [authGuard] // Protect this route
  },
  // Add other product-related routes here
];