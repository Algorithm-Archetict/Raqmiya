import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { MessagingHttpService, DeliveryDto, ConversationDto } from '../../core/services/messaging-http.service';
import { CartService } from '../../core/services/cart.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-deliveries',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './deliveries.html',
  styles: [`
    .deliveries-page{padding:16px}
    .split{display:grid;grid-template-columns:1fr 1fr;gap:24px}
    .item{border:1px solid #e5e7eb;border-radius:8px;padding:12px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:flex-start}
    .lbl{color:#6b7280;margin-right:6px}
    .val{font-weight:500}
    .actions .btn{padding:6px 10px}
    @media (max-width: 900px){.split{grid-template-columns:1fr}}
    .empty-state{margin:32px auto;max-width:520px;padding:24px;border:1px dashed #e5e7eb;border-radius:12px;text-align:center;color:#6b7280;background:#fafafa}
    .empty-state .icon{font-size:40px;line-height:1;margin-bottom:8px}
    .empty-state .title{font-size:18px;color:#374151;font-weight:600;margin-bottom:4px}
    .empty-state .subtitle{font-size:14px}
  `]
})
export class DeliveriesComponent implements OnInit {
  loading = false;
  error: string | null = null;
  meId: number | null = null;

  conversations: ConversationDto[] = [];
  deliveries: DeliveryDto[] = [];

  // cache minimal user info for counterpart labels
  private userCache = new Map<number, { username: string; profileImageUrl?: string | null }>();

  constructor(
    private auth: AuthService,
    private http: MessagingHttpService,
    private cart: CartService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.meId = this.auth.getCurrentUser()?.id ?? null;
    this.load();
  }

  async load() {
    this.loading = true; this.error = null;
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
    } catch (e: any) {
      this.error = e?.message || 'Failed to load deliveries';
    } finally { this.loading = false; }
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

  // Computed collections for template (avoid arrow functions in templates)
  get creatorDeliveries(): DeliveryDto[] {
    return (this.deliveries || []).filter(d => this.isCreatorDelivery(d));
  }

  get customerDeliveries(): DeliveryDto[] {
    return (this.deliveries || []).filter(d => this.isCustomerDelivery(d));
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
