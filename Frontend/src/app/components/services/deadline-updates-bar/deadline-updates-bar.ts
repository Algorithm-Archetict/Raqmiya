import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MessagingHttpService, ServiceRequestDto, DeadlineProposalDto } from '../../../core/services/messaging-http.service';
import { AuthService } from '../../../core/services/auth.service';
import Swal from 'sweetalert2';

interface DeadlineUpdateItem {
  proposal: DeadlineProposalDto;
  serviceRequest: ServiceRequestDto;
}

@Component({
  selector: 'app-deadline-updates-bar',
  standalone: true,
  imports: [CommonModule],
  template: `
  <div class="sr-bar">
    <div class="sr-header">
      <h3>Deadline Updates</h3>
      <button class="refresh-btn" (click)="reload(true)" [disabled]="loading()">{{ loading() ? 'Refreshing…' : 'Refresh' }}</button>
    </div>

    <div *ngIf="error()" class="sr-error">{{ error() }}</div>
    <div *ngIf="!loading() && items().length === 0 && !error()" class="sr-empty">No deadline update requests.</div>

    <div class="sr-list">
      <div class="sr-item" *ngFor="let it of items(); trackBy: trackByProposalId">
        <div class="sr-meta">
          <div class="sr-customer" *ngIf="(isCreator ? it.serviceRequest.customerUsername : it.serviceRequest.creatorUsername) as uname; else noUser">
            <img *ngIf="(isCreator ? it.serviceRequest.customerProfileImageUrl : it.serviceRequest.creatorProfileImageUrl) as img; else noImg" class="sr-avatar" [src]="img" alt="avatar" />
            <ng-template #noImg><i class="fas fa-user"></i></ng-template>
            <span>@{{ uname }}</span>
          </div>
          <ng-template #noUser>
            <div class="sr-customer neutral">
              <i class="fas fa-user"></i>
              <span>{{ isCreator ? 'Customer' : 'Creator' }}</span>
            </div>
          </ng-template>
          <div class="muted small" *ngIf="isCreator && it.proposal.status==='Pending'" style="margin-left:8px">Waiting for customer to respond.</div>
          <span class="sr-status" [class.pending]="it.proposal.status==='Pending'" [class.accepted]="it.proposal.status==='Accepted'" [class.declined]="it.proposal.status==='Declined'">
            <i class="fas fa-hourglass-half" *ngIf="it.proposal.status==='Pending'"></i>
            <i class="fas fa-thumbs-up" *ngIf="it.proposal.status==='Accepted'"></i>
            <i class="fas fa-thumbs-down" *ngIf="it.proposal.status==='Declined'"></i>
            <span>{{ it.proposal.status }} Deadline Change</span>
          </span>
          <span class="sr-badge time" [class.overdue]="isOverdue(it.serviceRequest.deadlineUtc)">
            <i class="far fa-clock"></i>
            Current: {{ it.serviceRequest.deadlineUtc ? (it.serviceRequest.deadlineUtc | date:'medium') : '—' }}
          </span>
        </div>
        <div class="sr-body">
          <div class="sr-req" [attr.data-id]="it.serviceRequest.id" [class.collapsed]="!isExpanded(it.serviceRequest.id)">{{ it.serviceRequest.requirements }}</div>
          <button class="sr-toggle" *ngIf="shouldShowToggle(it.serviceRequest.id)" (click)="toggleExpand(it.serviceRequest.id)">{{ isExpanded(it.serviceRequest.id) ? 'Read less' : 'Read more' }}</button>
          <div class="sr-budget">Budget: {{ it.serviceRequest.proposedBudget != null ? (it.serviceRequest.proposedBudget | number:'1.0-2') : '—' }} {{ it.serviceRequest.currency || '' }}</div>
        </div>
        <div class="sr-meta" style="margin-top:4px; gap:8px">
          <span class="sr-badge proposed">
            <i class="far fa-hourglass"></i>
            Proposed: {{ it.proposal.proposedDeadlineUtc | date:'medium' }}
          </span>
        </div>
        <div class="sr-body" *ngIf="it.proposal.reason">
          <div style="opacity:.9">Reason: {{ it.proposal.reason }}</div>
        </div>
        <div class="sr-actions" style="display:flex; gap:8px; margin-top:8px">
          <ng-container *ngIf="!isCreator && it.proposal.status==='Pending'">
            <button class="btn" (click)="respond(it, false)" [disabled]="loading()">Decline</button>
            <button class="btn primary" (click)="respond(it, true)" [disabled]="loading()">Accept</button>
          </ng-container>
        </div>
      </div>
    </div>
  </div>
  `,
  styles: [`
  @keyframes fadeInUp { from { opacity:0; transform: translateY(6px);} to { opacity:1; transform: translateY(0);} }
  .sr-bar { display: flex; flex-direction: column; gap: 12px; }
  .sr-header { display:flex; align-items:center; justify-content:space-between; }
  .sr-header h3 { margin:0; font-size:16px; font-weight:600; letter-spacing:.2px; }
  .sr-error { color: var(--warning-color); background: color-mix(in oklab, var(--warning-color) 10%, transparent); border: 1px solid var(--warning-color); padding: 10px 12px; border-radius: 12px; }
  .sr-empty { color: var(--text-secondary); background: var(--bg-secondary); border: 1px dashed var(--border-color); padding: 12px; border-radius: 12px; text-align:center; animation: fadeInUp .28s ease-out; }
  .sr-list { display:flex; flex-direction:column; gap: 10px; }
  .sr-item { display:flex; flex-direction:column; gap:10px; border-radius: 14px; padding: 12px; border:1px solid var(--border-color); background: linear-gradient(180deg, color-mix(in oklab, var(--bg-secondary) 86%, transparent), var(--bg-secondary)); box-shadow: var(--shadow-sm); transition: transform .16s ease, box-shadow .2s ease, border-color .2s ease; }
  .sr-item:hover { transform: translateY(-1px); box-shadow: var(--shadow-lg); border-color: var(--border-hover); }
  .sr-meta { display:flex; align-items:center; gap: 10px; }
  .sr-status { font-size:12px; padding:4px 10px; border-radius:9999px; border:1px solid var(--border-color); background: color-mix(in oklab, var(--bg-primary) 70%, transparent); display:inline-flex; align-items:center; gap:6px; color: var(--text-secondary); }
  .sr-status.pending { border-color:#d97706; color:#fde68a; background: color-mix(in oklab, #d97706 18%, transparent); }
  .sr-status.accepted { border-color:#16a34a; color:#bbf7d0; background: color-mix(in oklab, #16a34a 18%, transparent); }
  .sr-status.declined { border-color:#dc2626; color:#fecaca; background: color-mix(in oklab, #dc2626 18%, transparent); }
  .sr-deadline { margin-left:auto; display:flex; align-items:center; gap:6px; color: var(--text-secondary); font-size: 12px; }
  .sr-deadline.overdue { color:#fecaca }
  /* Time badges */
  .sr-badge { display:inline-flex; align-items:center; gap:6px; padding:6px 10px; border-radius:9999px; font-size:12px; white-space:nowrap; }
  .sr-badge.time { color:#e5e7eb; background:linear-gradient(180deg,#0f172a,#0b1221); border:1px solid #334155; box-shadow:0 1px 0 rgba(148,163,184,.12), inset 0 0 0 1px rgba(51,65,85,.35) }
  .sr-badge.time.overdue { color:#fecaca; background: color-mix(in oklab, #7f1d1d 22%, transparent); border-color:#7f1d1d }
  .sr-badge.proposed { color:#0f1419; background: var(--gradient-accent, linear-gradient(180deg,#93c5fd,#60a5fa)); border: none; box-shadow: 0 8px 24px rgba(59,130,246,.25), 0 0 0 1px rgba(59,130,246,.18) inset }
  .sr-body { display:flex; align-items:center; justify-content:space-between; gap:8px; flex-wrap:wrap; }
  .sr-req { color:#e2e8f0; overflow:visible; display:block; white-space:pre-wrap; flex:1 1 100%; min-width:0; word-break:break-word; line-height:1.6; order:2; }
  .sr-req.collapsed { display:-webkit-box; -webkit-line-clamp:3; line-clamp:3; -webkit-box-orient:vertical; overflow:hidden; white-space:normal; }
  .sr-toggle { background:transparent; border:0; color:#93c5fd; cursor:pointer; order:3; align-self:flex-start; padding:0; margin:0; }
  .sr-toggle:hover { text-decoration:underline; color:#bfdbfe; }
  .sr-budget { order:0; flex:0 0 auto; color:#eaf2ff; background:linear-gradient(180deg, #0f172a, #0b1221); border:1px solid #2563eb; padding:6px 12px; border-radius:9999px; font-size:15px; font-weight:700; box-shadow:0 1px 0 rgba(148,163,184,.15), inset 0 0 0 1px rgba(37,99,235,.25); }
  .sr-actions { display:flex; gap:8px; flex-shrink:0; order:1; margin-left:auto; }
  /* Identity chip styles to match service request bars */
  .sr-customer{display:inline-flex;align-items:center;gap:12px;font-size:15px;padding:8px 14px;border-radius:9999px;border:1px solid #334155;background:linear-gradient(180deg,#0f172a,#0b1221);color:#e8edf5;line-height:1;box-shadow:0 1px 0 rgba(148,163,184,.15), inset 0 0 0 1px rgba(51,65,85,.35)}
  .sr-customer.neutral{opacity:.8}
  .sr-customer i{color:#94a3b8}
  .sr-customer span{font-weight:700;letter-spacing:.2px;font-size:13px;line-height:1.2;max-width:240px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-decoration:none;display:inline-block}
  .sr-avatar{width:50px;height:50px;border-radius:50%;object-fit:cover;border:1px solid #334155;background:#111827;box-shadow:0 0 0 2px rgba(17,24,39,.6)}
  .sr-customer:hover{box-shadow:0 0 0 2px rgba(37,99,235,.25), inset 0 0 0 1px rgba(51,65,85,.45)}
  .refresh-btn, .btn { height:32px; padding:0 12px; border-radius:10px; border:1px solid var(--border-color); background: color-mix(in oklab, var(--bg-secondary) 92%, transparent); color: var(--text-primary); cursor:pointer; transition: transform .12s ease, box-shadow .18s ease, background .18s ease, border-color .18s ease; }
  .refresh-btn:hover, .btn:hover { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(0,0,0,.25); border-color: var(--border-hover); }
  .refresh-btn:disabled, .btn:disabled { opacity:.6; cursor:not-allowed; transform:none; box-shadow:none; }
  .btn.primary { border:none; background: var(--gradient-primary); color:#0f1419; box-shadow: 0 8px 24px rgba(59,130,246,.25), 0 0 0 2px rgba(59,130,246,.18) inset; }
  .btn.primary:hover { filter:brightness(1.04); box-shadow: 0 10px 28px rgba(59,130,246,.30), 0 0 0 2px rgba(59,130,246,.24) inset; }
  `]
})
export class DeadlineUpdatesBar implements OnInit, OnDestroy {
  loading = signal<boolean>(false);
  error = signal<string | null>(null);
  items = signal<DeadlineUpdateItem[]>([]);
  isCreator = false;
  // UI state for Read more/less
  expanded = new Set<string>();
  overflow = new Set<string>();
  private resizeHandler = () => this.computeOverflow();

  constructor(private http: MessagingHttpService, private auth: AuthService) {
    this.isCreator = !!this.auth?.isCreator?.();
  }

  ngOnInit(): void {
    this.reload();
    // recompute overflow on viewport resize
    window.addEventListener('resize', this.resizeHandler);
  }

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.resizeHandler);
  }

  async reload(userInitiated = false) {
    this.loading.set(true);
    this.error.set(null);
    this.items.set([]);
    try {
      // Pull both perspectives to capture all service requests tied to the user
      const [forCreator, forCustomer] = await Promise.all([
        this.http.getCreatorServiceRequests(['Pending','AcceptedByCreator','ConfirmedByCustomer'], 100, 0).toPromise(),
        this.http.getCustomerServiceRequests(['Pending','AcceptedByCreator','ConfirmedByCustomer'], 100, 0).toPromise(),
      ]);
      const merged = [ ...(forCreator || []), ...(forCustomer || []) ];
      const byId = new Map<string, ServiceRequestDto>();
      merged.forEach(sr => byId.set(sr.id, sr));
      const dedup = Array.from(byId.values());
      // For each SR, fetch full proposal history
      const lookups = await Promise.allSettled(
        dedup.map(async sr => {
          try {
            const list = await this.http.getDeadlineProposalHistory(sr.conversationId, sr.id).toPromise();
            return (list || []).map(p => ({ sr, prop: p } as { sr: ServiceRequestDto; prop: DeadlineProposalDto }));
          } catch { return []; }
        })
      );
      const found: DeadlineUpdateItem[] = [];
      for (const r of lookups) {
        if (r.status === 'fulfilled' && Array.isArray(r.value)) {
          for (const v of (r.value as { sr: ServiceRequestDto; prop: DeadlineProposalDto }[])) {
            found.push({ proposal: v.prop, serviceRequest: v.sr });
          }
        }
      }
      this.items.set(found.sort((a,b) => new Date(b.proposal.createdAt).getTime() - new Date(a.proposal.createdAt).getTime()));
      // after items render, compute overflow for collapsed requirements
      this.computeOverflow();
    } catch (e: any) {
      this.error.set(e?.message || 'Failed to load deadline updates');
    } finally {
      this.loading.set(false);
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
    }
  }

  isOverdue(deadlineUtc?: string | null): boolean {
    if (!deadlineUtc) return false;
    const end = Date.parse(deadlineUtc);
    if (isNaN(end)) return false;
    return end < Date.now();
  }

  async respond(it: DeadlineUpdateItem, accept: boolean) {
    try {
      this.loading.set(true);
      await this.http.respondToDeadlineProposal(it.serviceRequest.conversationId, it.serviceRequest.id, it.proposal.id, accept).toPromise();
      await Swal.fire({
        icon: 'success',
        title: accept ? 'Deadline changed' : 'Deadline request declined',
        text: accept ? 'The deadline has been updated successfully.' : 'The extension request has been declined successfully.',
        confirmButtonText: 'OK'
      });
      await this.reload();
    } catch (e: any) {
      this.error.set(e?.message || 'Failed to respond to proposal');
      await Swal.fire({ icon: 'error', title: 'Action failed', text: this.error() || 'Please try again.' });
    } finally {
      this.loading.set(false);
    }
  }

  trackByProposalId(index: number, it: DeadlineUpdateItem) {
    return it.proposal.id;
  }

  // --- Read more/less helpers ---
  isExpanded(id: string): boolean { return this.expanded.has(id); }
  toggleExpand(id: string): void {
    if (this.expanded.has(id)) this.expanded.delete(id); else this.expanded.add(id);
  }
  shouldShowToggle(id: string): boolean { return this.overflow.has(id); }

  // measure overflow of the collapsed requirement blocks
  private computeOverflow(): void {
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
}
