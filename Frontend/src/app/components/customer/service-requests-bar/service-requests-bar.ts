import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MessagingHttpService, ServiceRequestDto } from '../../../core/services/messaging-http.service';
import { interval, Subscription } from 'rxjs';
import { ChatSignalRService } from '../../../core/services/chat-signalr.service';
import Swal from 'sweetalert2';

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
  items: (ServiceRequestDto & { timeLeft: string; overdue: boolean })[] = [];
  actionBusy: string | null = null;
  private expanded: Set<string> = new Set<string>();
  private overflow: Set<string> = new Set<string>();

  private tickSub?: Subscription;
  private convSub?: Subscription;

  constructor(private messaging: MessagingHttpService, private chat: ChatSignalRService) {}

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

  fetch(userInitiated = false) {
    this.loading = true;
    this.error = null;
    this.messaging.getCustomerServiceRequests(['Pending','AcceptedByCreator','ConfirmedByCustomer'], 50, 0).subscribe({
      next: (list) => {
        this.items = (list || []).map(x => ({ ...x, timeLeft: this.formatTimeLeft(x.deadlineUtc), overdue: this.isOverdue(x.deadlineUtc) }));
        this.loading = false;
        // wait for DOM to render, then measure overflow
        setTimeout(() => this.computeOverflow(), 0);
        if (userInitiated) {
          void Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'success',
            title: 'Refreshed',
            showConfirmButton: false,
            timer: 1200,
            timerProgressBar: true,
          });
        }
      },
      error: (err) => {
        console.error('Failed to load customer service requests', err);
        this.error = 'Failed to load service requests';
        this.loading = false;
      }
    });
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
      text: 'This will remove the request. You cannot undo this action.',
      showCancelButton: true,
      confirmButtonText: 'Yes, decline',
      cancelButtonText: 'Cancel'
    });
    if (!res.isConfirmed) return;
    try {
      this.actionBusy = it.id;
      await this.messaging.declineServiceRequest(it.conversationId, it.id).toPromise();
      await Swal.fire({ icon: 'success', title: 'Request declined', text: 'The request has been removed.' });
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
