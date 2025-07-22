// import { NgModule } from '@angular/core';
// import { CommonModule } from '@angular/common';



// @NgModule({
//   declarations: [],
//   imports: [
//     CommonModule
//   ]
// })
// export class AppRoutingModule { }


import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [{ path: 'auth', loadChildren: () => import('./features/auth/auth-module').then(m => m.AuthModule) }, { path: 'products', loadChildren: () => import('./features/products/products-module').then(m => m.ProductsModule) }, { path: 'home', loadChildren: () => import('./features/home/home-module').then(m => m.HomeModule) }]; // CLI will add lazy routes here

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
