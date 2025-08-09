import { Routes } from '@angular/router';
import { Home } from './components/home/home';
import { NotFound } from './components/not-found/not-found';
import { Discover } from './components/discover/discover';
import { ProductDetails } from './components/products/product-details/product-details';
import { Checkout } from './components/checkout/checkout';
import { CartCheckout } from './components/cart-checkout/cart-checkout';
import { PurchasedPackage } from './components/purchased-package/purchased-package';
import { PurchasedProducts } from './components/purchased-products/purchased-products';
import { Library } from './components/library/library';
import { Login } from './components/account/login/login';
import { Register } from './components/account/register/register';
import { Dashboard } from './components/creator/dashboard/dashboard';
import { DashboardRedirect } from './components/dashboard-redirect/dashboard-redirect';
import { Settings } from './components/settings/settings';
import { Profile } from './components/settings/profile/profile';
import { Security } from './components/settings/security/security';
import { Payment } from './components/settings/payment/payment';
import { AllProducts } from './components/creator/creator-product/all-products/all-products';
import { AddNewProduct } from './components/creator/creator-product/add-new-product/add-new-product';
import { ProductEdit } from './components/creator/creator-product/product-edit/product-edit';
import { ProductEditContent } from './components/creator/creator-product/product-edit-content/product-edit-content';
import { AuthGuard } from './core/guards/auth.guard';
import { CreatorGuard } from './core/guards/creator.guard';
import { AdminGuard } from './core/guards/admin.guard';
import { CustomerGuard } from './core/guards/customer.guard';
import { AnonymousOnlyGuard } from './core/guards/anonymous-only.guard';
import { RoleGuard } from './core/guards/role.guard';
import { AdminDashboard } from './components/admin/dashboard/dashboard';
import { AdminUsers } from './components/admin/users/users';
import { AdminContent } from './components/admin/content/content';
import { AdminSettings } from './components/admin/settings/settings';
import { AllReviews } from './components/products/all-reviews/all-reviews';

export const routes: Routes = [
    {path:"",redirectTo:"home", pathMatch:"full"},
    {path:"home", loadComponent: () => import('./components/home/home').then(m => m.Home)},

    // Public routes
    {path:"discover", loadComponent: () => import('./components/discover/discover').then(m => m.Discover)},
    {path:"discover/:id", loadComponent: () => import('./components/products/product-details/product-details').then(m => m.ProductDetails)},
    {path:"login", redirectTo:"auth/login", pathMatch:"full"}, // Redirect /login to /auth/login
    {path:"auth/login", loadComponent: () => import('./components/account/login/login').then(m => m.Login), canActivate: [AnonymousOnlyGuard]},
    {path:"auth/register", loadComponent: () => import('./components/account/register/register').then(m => m.Register), canActivate: [AnonymousOnlyGuard]},
    { path: "products/:id/reviews", loadComponent: () => import('./components/products/all-reviews/all-reviews').then(m => m.AllReviews) },

    // Protected routes - require authentication
    {path:"checkout", loadComponent: () => import('./components/checkout/checkout').then(m => m.Checkout), canActivate: [AuthGuard]},
    {path:"cart-checkout", loadComponent: () => import('./components/cart-checkout/cart-checkout').then(m => m.CartCheckout), canActivate: [AuthGuard]},
    {path:"package/:id", loadComponent: () => import('./components/purchased-package/purchased-package').then(m => m.PurchasedPackage), canActivate: [AuthGuard]},
    {path:"purchased-products", loadComponent: () => import('./components/purchased-products/purchased-products').then(m => m.PurchasedProducts), canActivate: [AuthGuard]},
    {path:"library", loadComponent: () => import('./components/library/library').then(m => m.Library), canActivate: [AuthGuard]},
    {
        path:"settings",
    loadComponent: () => import('./components/settings/settings').then(m => m.Settings),
        canActivate: [AuthGuard],
        children: [
            {path:"", redirectTo:"profile", pathMatch:"full"},
            {path:"profile", loadComponent: () => import('./components/settings/profile/profile').then(m => m.Profile)},
            {path:"security", loadComponent: () => import('./components/settings/security/security').then(m => m.Security)},
            {path:"payment", loadComponent: () => import('./components/settings/payment/payment').then(m => m.Payment)}
        ]
    },
    {path:"dashboard",component:DashboardRedirect, canActivate: [AuthGuard]}, // Redirect to role-appropriate dashboard

    // Forbidden route
    { path: 'forbidden', loadComponent: () => import('./components/forbidden/forbidden').then(m => m.Forbidden) },

    // Creator-only routes - require authentication and creator role
    {path:"products", loadComponent: () => import('./components/creator/creator-product/all-products/all-products').then(m => m.AllProducts), canActivate: [CreatorGuard]},
    {path:"products/new", loadComponent: () => import('./components/creator/creator-product/add-new-product/add-new-product').then(m => m.AddNewProduct), canActivate: [CreatorGuard]},
    {path:"products/:id/edit", loadComponent: () => import('./components/creator/creator-product/product-edit/product-edit').then(m => m.ProductEdit), canActivate: [CreatorGuard]},
    {path:"products/:id/edit/content", loadComponent: () => import('./components/creator/creator-product/product-edit-content/product-edit-content').then(m => m.ProductEditContent), canActivate: [CreatorGuard]},
    {path:"sales", loadComponent: () => import('./components/creator/dashboard/dashboard').then(m => m.Dashboard), canActivate: [CreatorGuard]}, // TODO: Replace with actual Sales component

    // Admin-only routes
    { path: 'admin', loadComponent: () => import('./components/admin/dashboard/dashboard').then(m => m.AdminDashboard), canActivate: [AdminGuard] },
    { path: 'admin/users', loadComponent: () => import('./components/admin/users/users').then(m => m.AdminUsers), canActivate: [AdminGuard] },
    { path: 'admin/content', loadComponent: () => import('./components/admin/content/content').then(m => m.AdminContent), canActivate: [AdminGuard] },
    { path: 'admin/settings', loadComponent: () => import('./components/admin/settings/settings').then(m => m.AdminSettings), canActivate: [AdminGuard] },

    {path:"**", loadComponent: () => import('./components/not-found/not-found').then(m => m.NotFound)},
];
