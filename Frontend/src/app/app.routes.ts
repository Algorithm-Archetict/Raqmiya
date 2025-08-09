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
import { AllReviews } from './components/products/all-reviews/all-reviews';
import { WishList } from './components/wish-list/wish-list';

export const routes: Routes = [
    {path:"",redirectTo:"home", pathMatch:"full"},
    {path:"home",component:Home},

    // Public routes
    {path:"discover",component:Discover},
    {path:"discover/:id",component:ProductDetails},
    {path:"login", redirectTo:"auth/login", pathMatch:"full"}, // Redirect /login to /auth/login
    {path:"auth/login", component:Login},
    {path:"auth/register", component:Register},
    { path: "products/:id/reviews", component: AllReviews },

    // Protected routes - require authentication
    {path:"checkout",component:Checkout, canActivate: [AuthGuard]},
    {path:"cart-checkout",component:CartCheckout, canActivate: [AuthGuard]},
    {path:"package/:id",component:PurchasedPackage, canActivate: [AuthGuard]},
    // {path:"purchased-products",component:PurchasedProducts, canActivate: [AuthGuard]}, // Commented out - now under library
    {path:"library", redirectTo:"library/purchased-products", pathMatch:"full"},
    {path:"library/:tab",component:Library, canActivate: [AuthGuard]},
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
    {path:"dashboard",component:Dashboard, canActivate: [AuthGuard]}, // Both creators and customers can access dashboard

    // Creator-only routes - require authentication and creator role
    {path:"products",component:AllProducts, canActivate: [CreatorGuard]},
    {path:"products/new",component:AddNewProduct, canActivate: [CreatorGuard]},
    {path:"products/:id/edit",component:ProductEdit, canActivate: [CreatorGuard]},
    {path:"products/:id/edit/content",component:ProductEditContent, canActivate: [CreatorGuard]},
    {path:"sales",component:Dashboard, canActivate: [CreatorGuard]}, // TODO: Replace with actual Sales component

    // {path:"wishlist",component:WishList, canActivate: [AuthGuard]}, // Commented out - now under library
    {path:"**",component:NotFound},
];
