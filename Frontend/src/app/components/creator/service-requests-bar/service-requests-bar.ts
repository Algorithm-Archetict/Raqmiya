import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MessagingHttpService, ServiceRequestDto } from '../../../core/services/messaging-http.service';
import { interval, Subscription } from 'rxjs';
import { ChatSignalRService } from '../../../core/services/chat-signalr.service';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-service-requests-bar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './service-requests-bar.html',
  styleUrls: ['./service-requests-bar.css']
})
export class ServiceRequestsBar implements OnInit, OnDestroy {
  loading = false;
  error: string | null = null;
  items: (ServiceRequestDto & { timeLeft: string; overdue: boolean })[] = [];
  actionBusy: string | null = null;
  // track expanded descriptions by id
  private expanded: Set<string> = new Set<string>();
  // track which items actually overflow the 3-line clamp
  private overflow: Set<string> = new Set<string>();

  private tickSub?: Subscription;
  private convSub?: Subscription;

  constructor(private messaging: MessagingHttpService, private chat: ChatSignalRService, private router: Router) {}

  ngOnInit(): void {
    this.fetch();
    // tick each second for live countdown
    this.tickSub = interval(1000).subscribe(() => this.recomputeCountdown());
    // refresh when conversations update (accept/confirm events)
    this.convSub = this.chat.conversation$.subscribe(() => this.fetch());
    // recompute on resize in case line wrapping changes
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
    this.messaging.getCreatorServiceRequests(['Pending','AcceptedByCreator','ConfirmedByCustomer'], 50, 0).subscribe({
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
        console.error('Failed to load service requests', err);
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
      // rAF to wait for layout; double rAF for safety after asynchronous DOM updates
      requestAnimationFrame(() => requestAnimationFrame(measure));
    } catch { /* noop */ }
  }

  // Format statuses like "ConfirmedByCustomer" -> "Confirmed By Customer"
  formatStatus(status?: string | null): string {
    if (!status) return '';
    return status.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ').trim();
  }

  async acceptWithDeadline(it: ServiceRequestDto) {
    const { value: form } = await Swal.fire<{ date: string; time: string } | undefined>({
      title: 'Accept Request & Set Deadline',
      html: `
        <div style="display:flex;flex-direction:column;gap:10px;text-align:left">
          <div style="display:flex;gap:10px;align-items:end">
            <div style="display:flex;flex-direction:column;gap:6px">
              <label>Date</label>
              <input id="sr_date_acc" class="swal2-input" type="date" />
            </div>
            <div style="display:flex;flex-direction:column;gap:6px">
              <label>Time</label>
              <input id="sr_time_acc" class="swal2-input" type="time" step="60" placeholder="HH:MM" />
            </div>
          </div>
        </div>
      `,
      showCancelButton: true,
      didOpen: () => {
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const hh = String(now.getHours()).padStart(2, '0');
        const mi = String(now.getMinutes()).padStart(2, '0');
        const dateEl = document.getElementById('sr_date_acc') as HTMLInputElement | null;
        const timeEl = document.getElementById('sr_time_acc') as HTMLInputElement | null;
        if (dateEl) { dateEl.min = `${yyyy}-${mm}-${dd}`; dateEl.value = `${yyyy}-${mm}-${dd}`; }
        if (timeEl) {
          timeEl.step = '60';
          timeEl.value = mi === '59' ? `${String(Number(hh)+1).padStart(2,'0')}:00` : `${hh}:${mi}`;
          timeEl.focus();
          timeEl.select();
        }
      },
      preConfirm: () => {
        const d = (document.getElementById('sr_date_acc') as HTMLInputElement)?.value?.trim();
        const t = (document.getElementById('sr_time_acc') as HTMLInputElement)?.value?.trim() || '23:59';
        if (!d) { Swal.showValidationMessage('Please choose a date'); return undefined; }
        // Interpret as LOCAL time; avoid appending 'Z' which shifts to UTC incorrectly
        const candidate = new Date(`${d}T${t}:00`).getTime();
        if (!isFinite(candidate) || candidate <= Date.now()) {
          Swal.showValidationMessage('Deadline must be in the future');
          return undefined;
        }
        return { date: d, time: t };
      }
    });
    if (!form) return;
    // Convert local date/time to UTC ISO string for backend
    const iso = new Date(`${form.date}T${form.time}:00`).toISOString();
    try {
      this.actionBusy = it.id;
      await this.messaging.acceptServiceRequest(it.conversationId, it.id, iso).toPromise();
      await Swal.fire({ icon: 'success', title: 'Request accepted', text: 'Awaiting customer approval.' });
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

  async deliver(it: ServiceRequestDto) {
    this.actionBusy = it.id;
    // Navigate to full product creation page in private delivery mode
    try {
      await this.router.navigate([ '/deliveries/new' ], {
        queryParams: {
          privateDelivery: '1',
          conversationId: it.conversationId,
          serviceRequestId: it.id,
        }
      });
    } finally {
      this.actionBusy = null;
    }
  }

  async updateDeadline(it: ServiceRequestDto) {
    const { value: form } = await Swal.fire<{ date: string; time: string; reason?: string }>({
      title: 'Update Deadline',
      html: `
        <div style="display:flex;flex-direction:column;gap:10px;text-align:left">
          <div style="display:flex;gap:10px;align-items:end">
            <div style="display:flex;flex-direction:column;gap:6px">
              <label>Date</label>
              <input id="sr_date2" class="swal2-input" type="date" />
            </div>
            <div style="display:flex;flex-direction:column;gap:6px">
              <label>Time</label>
              <input id="sr_time2" class="swal2-input" type="time" step="60" placeholder="HH:MM" />
            </div>
          </div>
          <label>Reason (optional)</label>
          <textarea id="sr_reason2" class="swal2-textarea" placeholder="Explain why you are updating the deadline"></textarea>
        </div>
      `,
      showCancelButton: true,
      didOpen: () => {
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const hh = String(now.getHours()).padStart(2, '0');
        const mi = String(now.getMinutes()).padStart(2, '0');
        const dateEl = document.getElementById('sr_date2') as HTMLInputElement | null;
        const timeEl = document.getElementById('sr_time2') as HTMLInputElement | null;
        if (dateEl) { dateEl.min = `${yyyy}-${mm}-${dd}`; dateEl.value = `${yyyy}-${mm}-${dd}`; }
        if (timeEl) {
          timeEl.step = '60';
          timeEl.readOnly = false;
          timeEl.disabled = false;
          timeEl.value = mi === '59' ? `${String(Number(hh)+1).padStart(2,'0')}:00` : `${hh}:${mi}`;
          timeEl.focus();
          timeEl.select();
        }
      },
      preConfirm: () => {
        const d = (document.getElementById('sr_date2') as HTMLInputElement)?.value?.trim();
        const t = (document.getElementById('sr_time2') as HTMLInputElement)?.value?.trim() || '23:59';
        const reason = (document.getElementById('sr_reason2') as HTMLTextAreaElement)?.value?.trim();
        if (!d) { Swal.showValidationMessage('Please choose a date'); return false as any; }
        // Interpret as LOCAL time to validate correctly for same-day past times
        const candidate = new Date(`${d}T${t}:00`).getTime();
        const nowMs = Date.now();
        if (!isFinite(candidate) || candidate <= nowMs) {
          Swal.showValidationMessage('Deadline must be in the future');
          return false as any;
        }
        return { date: d, time: t, reason };
      }
    });
    if (!form) return;
    // Convert local date/time to UTC ISO string for backend
    const iso = new Date(`${form.date}T${form.time}:00`).toISOString();
    try {
      this.actionBusy = it.id;
      await this.messaging.proposeDeadline(it.conversationId, it.id, iso, form.reason ?? null).toPromise();
      await Swal.fire('Sent', 'Deadline change proposed. Waiting for customer approval.', 'success');
      this.fetch();
    } catch (e: any) {
      await Swal.fire('Error', e?.message || 'Failed to propose deadline', 'error');
    } finally { this.actionBusy = null; }
  }

  trackById(index: number, item: ServiceRequestDto & { timeLeft: string; overdue: boolean }) {
    return item.id;
  }
}
