import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MessagingHttpService, ServiceRequestDto } from '../../../core/services/messaging-http.service';
import { Router } from '@angular/router';
import { interval, Subscription, firstValueFrom } from 'rxjs';
import { ChatSignalRService } from '../../../core/services/chat-signalr.service';
import Swal from 'sweetalert2';
import { OrderService } from '../../../core/services/order.service';
import { ProductService } from '../../../core/services/product.service';

@Component({
  selector: 'app-customer-service-requests-bar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './service-requests-bar.html',
  styleUrls: ['./service-requests-bar.css']
})
export class CustomerServiceRequestsBar implements OnInit, OnDestroy {
  loading = false;
  error: string | null = null;
  items: (ServiceRequestDto & { timeLeft: string; overdue: boolean; hasDelivery?: boolean; deliveredProductId?: number | null; deliveredPurchased?: boolean; })[] = [];
  actionBusy: string | null = null;
  private expanded: Set<string> = new Set<string>();
  private overflow: Set<string> = new Set<string>();

  private tickSub?: Subscription;
  private convSub?: Subscription;

  constructor(
    private messaging: MessagingHttpService,
    private chat: ChatSignalRService,
    private router: Router,
    private orderService: OrderService,
    private productService: ProductService,
  ) {}

  ngOnInit(): void {
    this.fetch();
    this.tickSub = interval(1000).subscribe(() => this.recomputeCountdown());
    this.convSub = this.chat.conversation$.subscribe(() => this.fetch());
    window.addEventListener('resize', this.computeOverflow);
  }

  ngOnDestroy(): void {
    this.tickSub?.unsubscribe();
    this.convSub?.unsubscribe();
    window.removeEventListener('resize', this.computeOverflow);
  }

  async fetch(userInitiated = false) {
    this.loading = true;
    this.error = null;
    try {
      const list = await firstValueFrom(this.messaging.getCustomerServiceRequests(['Pending','AcceptedByCreator','ConfirmedByCustomer','Rejected'], 50, 0));
      const base = (list || []).map(x => ({ ...x, timeLeft: this.formatTimeLeft(x.deadlineUtc), overdue: this.isOverdue(x.deadlineUtc) }));

      // Build conversation set and fetch deliveries to detect already-delivered requests
      const convIds = Array.from(new Set(base.map(x => x.conversationId)));
      const deliveriesPerConv = await Promise.all(convIds.map(async cid => {
        try {
          const arr = await firstValueFrom(this.messaging.getDeliveriesForConversation(cid));
          return { cid, arr: arr || [] };
        } catch { return { cid, arr: [] as any[] }; }
      }));
      type MiniDelivery = { serviceRequestId?: string | null; productId: number; status: string };
      const deliveredMap = new Map<string, { productId: number; purchased: boolean }>();
      for (const { arr } of deliveriesPerConv) {
        for (const d of (arr as MiniDelivery[])) {
          if (d && d.serviceRequestId) {
            const prev = deliveredMap.get(d.serviceRequestId) || { productId: d.productId, purchased: false };
            const purchased = prev.purchased || (d.status === 'Purchased');
            deliveredMap.set(d.serviceRequestId, { productId: d.productId, purchased });
          }
        }
      }

      this.items = base.map(x => {
        const info = deliveredMap.get(x.id);
        return {
          ...x,
          hasDelivery: !!info,
          deliveredProductId: info?.productId ?? null,
          deliveredPurchased: info?.purchased ?? false,
        };
      });

      // Ensure purchased status is reflected immediately by checking orders
      await Promise.all(this.items
        .filter(it => it.hasDelivery && !it.deliveredPurchased && it.deliveredProductId != null)
        .map(async it => {
          try {
            const purchased = await this.orderService.getPurchasedProduct(it.deliveredProductId as number).toPromise();
            if (purchased) {
              it.deliveredPurchased = true;
            }
          } catch (e: any) {
            // ignore 404 (not purchased)
          }
        }));

      // If a delivered product was deleted, treat as not delivered anymore
      await Promise.all(this.items
        .filter(it => it.hasDelivery && it.deliveredProductId != null)
        .map(async it => {
          try {
            await this.productService.getById(it.deliveredProductId as number).toPromise();
          } catch {
            it.hasDelivery = false;
            it.deliveredProductId = null;
            it.deliveredPurchased = false;
          }
        }));

      this.loading = false;
      setTimeout(() => this.computeOverflow(), 0);
      if (userInitiated) {
        void Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Refreshed', showConfirmButton: false, timer: 1200, timerProgressBar: true });
      }
    } catch (err) {
      console.error('Failed to load customer service requests', err);
      this.error = 'Failed to load service requests';
      this.loading = false;
    }
  }

  private recomputeCountdown() {
    for (const x of this.items) {
      x.timeLeft = this.formatTimeLeft(x.deadlineUtc);
      x.overdue = this.isOverdue(x.deadlineUtc);
    }
  }

  private isOverdue(deadlineUtc?: string | null): boolean {
    if (!deadlineUtc) return false;
    const deadline = new Date(deadlineUtc).getTime();
    return Date.now() > deadline;
  }

  private formatTimeLeft(deadlineUtc?: string | null): string {
    if (!deadlineUtc) return '—';
    const deadline = new Date(deadlineUtc).getTime();
    const diff = Math.max(0, deadline - Date.now());
    const totalSeconds = Math.floor(diff / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (Date.now() > deadline) {
      return 'Overdue';
    }
    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
  }

  // Format statuses like "ConfirmedByCustomer" -> "Confirmed By Customer"
  formatStatus(status?: string | null): string {
    if (!status) return '';
    return status.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ').trim();
  }

  // Build a human-readable declined label; backend uses 'Rejected' without actor info
  declinedByLabel(it: ServiceRequestDto): string {
    return 'Declined';
  }

  async goToProduct(productId?: number | null) {
    if (!productId) return;
    await this.router.navigate(['/discover', productId]);
  }

  // UI: expand/collapse requirement text
  isExpanded(id: string): boolean { return this.expanded.has(id); }
  toggleExpand(it: ServiceRequestDto): void {
    if (this.expanded.has(it.id)) this.expanded.delete(it.id); else this.expanded.add(it.id);
  }
  shouldShowToggle(it: ServiceRequestDto): boolean { return this.overflow.has(it.id); }

  // measure whether each requirement actually overflows 3 lines
  computeOverflow = (): void => {
    try {
      const measure = () => {
        const nodes = document.querySelectorAll<HTMLElement>('.sr-req[data-id]');
        const next = new Set<string>();
        nodes.forEach(el => {
          const id = el.getAttribute('data-id');
          if (!id) return;
          const wasCollapsed = el.classList.contains('collapsed');
          el.classList.add('collapsed');
          const overflows = el.scrollHeight > el.clientHeight + 0.5;
          if (overflows) next.add(id);
          if (!wasCollapsed) el.classList.remove('collapsed');
        });
        this.overflow = next;
      };
      requestAnimationFrame(() => requestAnimationFrame(measure));
    } catch { /* noop */ }
  }

  async confirmRequest(it: ServiceRequestDto) {
    try {
      this.actionBusy = it.id;
      await this.messaging.confirmServiceRequest(it.conversationId, it.id).toPromise();
      await Swal.fire({ icon: 'success', title: 'Request accepted', text: 'You accepted the proposed deadline.' });
      this.fetch();
    } catch (e: any) {
      await Swal.fire({ icon: 'error', title: 'Failed to accept', text: e?.message || 'Please try again.' });
    } finally {
      this.actionBusy = null;
    }
  }

  async declineRequest(it: ServiceRequestDto) {
    const res = await Swal.fire({
      icon: 'warning',
      title: 'Decline this request?',
      text: 'This will mark the request as declined and hide its actions.',
      showCancelButton: true,
      confirmButtonText: 'Yes, decline',
      cancelButtonText: 'Cancel'
    });
    if (!res.isConfirmed) return;
    try {
      this.actionBusy = it.id;
      await this.messaging.declineServiceRequest(it.conversationId, it.id).toPromise();
      await Swal.fire({ icon: 'success', title: 'Request declined', text: 'The request has been marked as declined.' });
      this.fetch();
    } catch (e: any) {
      await Swal.fire({ icon: 'error', title: 'Failed to decline', text: e?.message || 'Please try again.' });
    } finally {
      this.actionBusy = null;
    }
  }

  trackById(index: number, item: ServiceRequestDto & { timeLeft: string; overdue: boolean }) {
    return item.id;
  }
}
