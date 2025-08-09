import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute, NavigationEnd } from '@angular/router';
import { DashboardSidebar } from '../dashboard-sidebar/dashboard-sidebar';
import { PurchasedProducts } from '../purchased-products/purchased-products';
import { WishList } from '../wish-list/wish-list';
import { Reviews } from './reviews/reviews';
import { filter } from 'rxjs/operators';



@Component({
  selector: 'app-library',
  imports: [CommonModule, RouterModule, DashboardSidebar, PurchasedProducts, WishList, Reviews],
  templateUrl: './library.html',
  styleUrl: './library.css'
})
export class Library implements OnInit {
  activeTab: 'purchased' | 'wishlist' | 'reviews' = 'purchased';

  constructor(
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.setActiveTabFromRoute();
    this.subscribeToRouteChanges();
  }



  setActiveTab(tab: 'purchased' | 'wishlist' | 'reviews') {
    this.activeTab = tab;
    // Navigate to the corresponding route
    this.navigateToTab(tab);
  }

  private setActiveTabFromRoute() {
    // Get the tab parameter from the route
    const tab = this.route.snapshot.paramMap.get('tab') || 'purchased-products';
    
    switch (tab) {
      case 'purchased-products':
        this.activeTab = 'purchased';
        break;
      case 'wishlist':
        this.activeTab = 'wishlist';
        break;
      case 'reviews':
        this.activeTab = 'reviews';
        break;
      default:
        this.activeTab = 'purchased';
    }
  }

  private subscribeToRouteChanges() {
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        this.setActiveTabFromRoute();
      });
  }

  private navigateToTab(tab: 'purchased' | 'wishlist' | 'reviews') {
    let route: string;
    switch (tab) {
      case 'purchased':
        route = 'purchased-products';
        break;
      case 'wishlist':
        route = 'wishlist';
        break;
      case 'reviews':
        route = 'reviews';
        break;
      default:
        route = 'purchased-products';
    }
    
    this.router.navigate(['/library', route]);
  }


}
