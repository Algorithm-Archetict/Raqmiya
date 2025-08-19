import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, NavigationEnd } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { MessagingHttpService, DeliveryDto, ConversationDto } from '../../core/services/messaging-http.service';
import { CartService } from '../../core/services/cart.service';
import { Router } from '@angular/router';
import { DashboardSidebar } from '../dashboard-sidebar/dashboard-sidebar';
import { OrderService } from '../../core/services/order.service';
import { filter, Subscription } from 'rxjs';

@Component({
  selector: 'app-deliveries',
  standalone: true,
  imports: [CommonModule, RouterModule, DashboardSidebar],
  templateUrl: './deliveries.html',
  styleUrls: ['./deliveries.css']
})
export class DeliveriesComponent implements OnInit, OnDestroy {
  loading = false;
  error: string | null = null;
  meId: number | null = null;
  purchasingDelivery: string | null = null;

  conversations: ConversationDto[] = [];
  deliveries: DeliveryDto[] = [];

  // cache minimal user info for counterpart labels
  private userCache = new Map<number, { username: string; profileImageUrl?: string | null }>();
  private navigationSubscription?: Subscription;

  constructor(
    private auth: AuthService,
    private http: MessagingHttpService,
    private cart: CartService,
    private router: Router,
    private orderService: OrderService,
  ) {}

  ngOnInit(): void {
    this.meId = this.auth.getCurrentUser()?.id ?? null;
    this.load();

    // Listen for navigation events to refresh delivery statuses when returning from checkout
    this.navigationSubscription = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      // If we're navigating to the deliveries page from checkout, refresh delivery statuses
      if (event.url === '/deliveries') {
        this.refreshDeliveryStatuses();
      }
    });
  }

  ngOnDestroy(): void {
    if (this.navigationSubscription) {
      this.navigationSubscription.unsubscribe();
    }
  }

  async load() {
    this.loading = true; 
    this.error = null;
    try {
      const convs = await this.http.getConversations(200, 0).toPromise();
      this.conversations = convs || [];
      const lists = await Promise.all((this.conversations || []).map(c => this.http.getDeliveriesForConversation(c.id).toPromise().catch(() => [])));
      this.deliveries = ([] as DeliveryDto[]).concat(...(lists as any));

      // Preload counterpart usernames for display (avoid showing raw IDs)
      const idsToFetch = new Set<number>();
      for (const c of this.conversations) {
        if (c.creatorId && !this.userCache.has(c.creatorId)) idsToFetch.add(c.creatorId);
        if (c.customerId && !this.userCache.has(c.customerId)) idsToFetch.add(c.customerId);
      }
      await Promise.all(Array.from(idsToFetch).map(async id => {
        try {
          const u = await this.http.getUserById(id).toPromise();
          if (u) this.userCache.set(id, { username: u.username, profileImageUrl: u.profileImageUrl });
        } catch {}
      }));

      // Check if customer has actually purchased the delivered products
      await this.updateDeliveryStatusesForPurchases();
    } catch (e: any) {
      this.error = e?.message || 'Failed to load deliveries';
    } finally { 
      this.loading = false; 
    }
  }

  async refreshDeliveryStatuses() {
    if (!this.meId || this.loading) return;
    
    this.loading = true;
    try {
      await this.updateDeliveryStatusesForPurchases();
      console.log('Delivery statuses refreshed successfully');
    } catch (error) {
      console.error('Error refreshing delivery statuses:', error);
      this.error = 'Failed to refresh delivery statuses. Please try again.';
    } finally {
      this.loading = false;
    }
  }

  async updateDeliveryStatusesForPurchases() {
    if (!this.meId) return;

    // Get all customer deliveries that are still "AwaitingPurchase"
    const pendingCustomerDeliveries = this.customerDeliveries.filter(d => d.status === 'AwaitingPurchase');
    
    for (const delivery of pendingCustomerDeliveries) {
      try {
        // Check if the customer has actually purchased this product
        const purchasedProduct = await this.orderService.getPurchasedProduct(delivery.productId).toPromise();
        
        if (purchasedProduct) {
          // Customer has purchased this product, update delivery status
          await this.http.markDeliveryPurchased(delivery.conversationId, delivery.id).toPromise();
          delivery.status = 'Purchased';
          console.log(`Updated delivery ${delivery.id} to Purchased status for product ${delivery.productId}`);
        }
      } catch (error: any) {
        // If the product is not purchased, this will throw a 404 error, which is expected
        // We only log actual errors, not the expected 404
        if (error.status !== 404) {
          console.error(`Error checking purchase status for delivery ${delivery.id}:`, error);
        }
      }
    }
  }

  isCreatorDelivery(d: DeliveryDto): boolean {
    const c = this.conversations.find(x => x.id === d.conversationId);
    if (!c) return false;
    return (this.meId != null) && c.creatorId === this.meId;
  }

  isCustomerDelivery(d: DeliveryDto): boolean {
    const c = this.conversations.find(x => x.id === d.conversationId);
    if (!c) return false;
    return (this.meId != null) && c.customerId === this.meId;
  }

  async purchase(d: DeliveryDto) {
    try {
      // Use normal product checkout flow: add to cart then navigate to checkout
      await this.cart.addToCart(d.productId, 1).toPromise();
      this.router.navigate(['/cart-checkout']);
    } catch (err) {
      // Fallback: still navigate so user can complete purchase/edit cart
      this.router.navigate(['/cart-checkout']);
    }
  }

  viewInLibrary(delivery: DeliveryDto) {
    // Navigate to the library to view the purchased product
    this.router.navigate(['/library/purchased-products']);
  }

  // Computed collections for template (avoid arrow functions in templates)
  get creatorDeliveries(): DeliveryDto[] {
    return (this.deliveries || []).filter(d => this.isCreatorDelivery(d));
  }

  get customerDeliveries(): DeliveryDto[] {
    return (this.deliveries || []).filter(d => this.isCustomerDelivery(d));
  }

  // Statistics methods
  getPendingDeliveriesCount(): number {
    return this.customerDeliveries.filter(d => d.status === 'AwaitingPurchase').length;
  }

  getCompletedDeliveriesCount(): number {
    return this.customerDeliveries.filter(d => d.status === 'Purchased').length;
  }

  // Status handling methods
  getStatusDisplayText(status: string): string {
    switch (status) {
      case 'AwaitingPurchase':
        return 'Pending Purchase';
      case 'Purchased':
        return 'Purchased';
      default:
        return status;
    }
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'AwaitingPurchase':
        return 'badge-warning';
      case 'Purchased':
        return 'badge-success';
      default:
        return 'badge-secondary';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'AwaitingPurchase':
        return 'fas fa-clock';
      case 'Purchased':
        return 'fas fa-check-circle';
      default:
        return 'fas fa-info-circle';
    }
  }

  // UI helpers
  getCounterpartyUsername(d: DeliveryDto): string {
    const c = this.conversations.find(x => x.id === d.conversationId);
    if (!c) return '';
    const otherId = (this.meId != null && c.creatorId === this.meId) ? c.customerId : c.creatorId;
    const u = this.userCache.get(otherId);
    return u?.username || 'Unknown';
  }
}
