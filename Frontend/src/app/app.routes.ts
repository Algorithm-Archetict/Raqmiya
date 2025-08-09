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
    {path:"home",component:Home},

    // Public routes
    {path:"discover",component:Discover},
    {path:"discover/:id",component:ProductDetails},
    {path:"login", redirectTo:"auth/login", pathMatch:"full"}, // Redirect /login to /auth/login
    {path:"auth/login", component:Login, canActivate: [AnonymousOnlyGuard]},
    {path:"auth/register", component:Register, canActivate: [AnonymousOnlyGuard]},
    { path: "products/:id/reviews", component: AllReviews },

    // Protected routes - require authentication
    {path:"checkout",component:Checkout, canActivate: [AuthGuard]},
    {path:"cart-checkout",component:CartCheckout, canActivate: [AuthGuard]},
    {path:"package/:id",component:PurchasedPackage, canActivate: [AuthGuard]},
    {path:"purchased-products",component:PurchasedProducts, canActivate: [AuthGuard]},
    {path:"library",component:Library, canActivate: [AuthGuard]},
    {
        path:"settings",
        component:Settings,
        canActivate: [AuthGuard],
        children: [
            {path:"", redirectTo:"profile", pathMatch:"full"},
            {path:"profile", component:Profile},
            {path:"security", component:Security},
            {path:"payment", component:Payment}
        ]
    },
    {path:"dashboard",component:DashboardRedirect, canActivate: [AuthGuard]}, // Redirect to role-appropriate dashboard

    // Creator-only routes - require authentication and creator role
    {path:"products",component:AllProducts, canActivate: [CreatorGuard]},
    {path:"products/new",component:AddNewProduct, canActivate: [CreatorGuard]},
    {path:"products/:id/edit",component:ProductEdit, canActivate: [CreatorGuard]},
    {path:"products/:id/edit/content",component:ProductEditContent, canActivate: [CreatorGuard]},
    {path:"sales",component:Dashboard, canActivate: [CreatorGuard]}, // TODO: Replace with actual Sales component

    // Admin-only routes
    { path: 'admin', component: AdminDashboard, canActivate: [AdminGuard] },
    { path: 'admin/users', component: AdminUsers, canActivate: [AdminGuard] },
    { path: 'admin/content', component: AdminContent, canActivate: [AdminGuard] },
    { path: 'admin/settings', component: AdminSettings, canActivate: [AdminGuard] },

    {path:"**",component:NotFound},
];
