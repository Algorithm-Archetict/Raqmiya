import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MessagingHttpService, ServiceRequestDto } from '../../../core/services/messaging-http.service';
import { interval, Subscription } from 'rxjs';
import { ChatSignalRService } from '../../../core/services/chat-signalr.service';

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

  private tickSub?: Subscription;
  private convSub?: Subscription;

  constructor(private messaging: MessagingHttpService, private chat: ChatSignalRService) {}

  ngOnInit(): void {
    this.fetch();
    this.tickSub = interval(1000).subscribe(() => this.recomputeCountdown());
    this.convSub = this.chat.conversation$.subscribe(() => this.fetch());
  }

  ngOnDestroy(): void {
    this.tickSub?.unsubscribe();
    this.convSub?.unsubscribe();
  }

  fetch() {
    this.loading = true;
    this.error = null;
    this.messaging.getCustomerServiceRequests(['AcceptedByCreator','ConfirmedByCustomer'], 50, 0).subscribe({
      next: (list) => {
        this.items = (list || []).map(x => ({ ...x, timeLeft: this.formatTimeLeft(x.deadlineUtc), overdue: this.isOverdue(x.deadlineUtc) }));
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load customer service requests', err);
        this.error = 'Failed to load service requests';
        this.loading = false;
      }
    });
  }

  private recomputeCountdown() {
    this.items = this.items.map(x => ({
      ...x,
      timeLeft: this.formatTimeLeft(x.deadlineUtc),
      overdue: this.isOverdue(x.deadlineUtc)
    }));
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
      return `Overdue by ${days}d ${hours}h ${minutes}m ${seconds}s`;
    }
    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
  }
}
