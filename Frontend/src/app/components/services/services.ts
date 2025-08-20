import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { ServiceRequestsBar as CreatorBar } from '../creator/service-requests-bar/service-requests-bar';
import { CustomerServiceRequestsBar as CustomerBar } from '../customer/service-requests-bar/service-requests-bar';
import { DeadlineUpdatesBar } from './deadline-updates-bar/deadline-updates-bar';

@Component({
  selector: 'app-services',
  standalone: true,
  imports: [CommonModule, CreatorBar, CustomerBar, DeadlineUpdatesBar],
  templateUrl: './services.html',
  styles: [`
  /* Page container — unified background using site theme */
  .services-page { display:flex; flex-direction:column; gap: var(--spacing-lg); padding: var(--spacing-xl); min-height: 100vh; background: var(--bg-primary); }
  .header h1 { font-size: 2rem; margin: 0 0 var(--spacing-xs) 0; color: var(--text-primary); letter-spacing: .2px; }
  .header .sub { color: var(--text-secondary); margin: 0; }

  /* Tabs aligned with brand gradients */
  .tabs { display:flex; gap: var(--spacing-sm); border-bottom: 1px solid var(--border-color); padding-bottom: var(--spacing-sm); }
  .tab { display:inline-flex; align-items:center; gap:8px; padding: 10px 16px; border:none; border-radius:999px; cursor:pointer; color: var(--text-secondary);
    background: var(--bg-secondary); box-shadow: inset 0 0 0 1px var(--border-color); transition: transform var(--transition-fast), box-shadow var(--transition-fast), background var(--transition-fast), color var(--transition-fast); }
  .tab:hover { background: var(--bg-tertiary); color: var(--text-primary); box-shadow: inset 0 0 0 1px var(--border-hover); transform: translateY(-1px); }
  .tab.active { color:#fff; background: var(--gradient-primary); box-shadow: var(--shadow-md), var(--shadow-glow); transform:none; }

  .content { display:grid; gap: var(--spacing-lg); }
  /* Compact density overrides */
  .services-page.compact { --spacing-xl: 20px; --spacing-lg: 14px; --spacing-md: 10px; --spacing-sm: 8px; --spacing-xs: 4px; }

  /* Micro-animations */
  @keyframes fadeInUp { from { opacity:0; transform: translateY(6px);} to { opacity:1; transform: translateY(0);} }

  /* Panel — consistent card style */
  .panel { position:relative; border-radius: var(--radius-xl); padding: var(--spacing-lg); background: var(--bg-card); border: 1px solid var(--border-color); box-shadow: var(--shadow-md); animation: fadeInUp .38s ease-out; }
  .section-title { margin: 0 0 var(--spacing-sm) 0; font-size: 1rem; letter-spacing:.2px; font-weight:800; color: var(--text-primary);
    display:inline-flex; align-items:center; gap:8px; padding:6px 10px; border-radius:999px; background: var(--gradient-dark); }

  /* Inner bars — adopt app card visuals */
  .sr-bar { --accent: var(--text-primary); }
  .sr-bar .sr-header { display:flex; align-items:center; justify-content:space-between; margin-bottom: var(--spacing-sm); }
  .sr-bar .sr-header h3 { margin:0; color: var(--text-primary); }

  .sr-bar .sr-list { display:grid; gap: var(--spacing-sm); }
  .sr-bar .sr-item { border-radius: var(--radius-xl); padding: var(--spacing-md); border:1px solid var(--border-color); background: var(--bg-secondary); box-shadow: var(--shadow-sm); transition: transform var(--transition-fast), box-shadow var(--transition-fast), border-color var(--transition-fast); animation: fadeInUp .32s ease-out; }
  /* Subtle dividers between items */
  .sr-bar .sr-item + .sr-item { box-shadow: inset 0 1px 0 var(--border-color), var(--shadow-sm); }
  .sr-bar .sr-item:hover { transform: translateY(-2px); box-shadow: var(--shadow-lg); border-color: var(--border-hover); }

  .sr-bar .sr-meta { display:flex; align-items:center; justify-content:space-between; margin-bottom:6px; }
  .sr-bar .sr-status { display:inline-block; padding:6px 12px; border-radius:999px; font-size:12px; font-weight:700; letter-spacing:.2px; }
  .sr-bar .sr-status i { margin-right:6px; font-size:12px; }
  .sr-bar .sr-status.confirmed { background: var(--gradient-accent); color:#0f1419; }
  .sr-bar .sr-status.accepted { background: var(--gradient-primary); color:#0f1419; }
  .sr-bar .sr-status.purchased { background: linear-gradient(135deg,#22c55e,#16a34a); color:#0f1419; box-shadow: var(--shadow-md), var(--shadow-glow); }
  .sr-bar .sr-deadline { display:flex; align-items:center; gap:8px; color: var(--text-primary); font-weight:600; }
  .sr-bar .sr-deadline.overdue { color: var(--warning-color); }

  .sr-bar .sr-body { color: var(--text-secondary); }
  .sr-bar .sr-req { color: var(--text-primary); line-height:1.45; }
  .sr-bar .sr-budget { color: var(--text-primary); opacity:.9; font-weight:600; }

  /* CTA button — brand gradient */
  .sr-bar .refresh-btn { background: var(--gradient-primary); color:#fff; border-radius:12px; border:none; padding:9px 14px; font-weight:700;
    box-shadow: var(--shadow-md), var(--shadow-glow); transition: transform var(--transition-fast), box-shadow var(--transition-fast), filter var(--transition-fast); }
  .sr-bar .refresh-btn:hover { transform: translateY(-1px); box-shadow: var(--shadow-lg), var(--shadow-glow); filter: brightness(1.05); }
  .sr-bar .refresh-btn[disabled] { opacity:.85; filter: grayscale(0.1); }
  /* Empty and error states */
  .sr-empty { color: var(--text-secondary); background: var(--bg-secondary); border: 1px dashed var(--border-color); padding: var(--spacing-md); border-radius: var(--radius-lg); text-align:center; }
  .sr-error { color: var(--warning-color); background: color-mix(in oklab, var(--warning-color) 12%, transparent); border: 1px solid var(--warning-color); padding: var(--spacing-md); border-radius: var(--radius-lg); }
  `]
})
export class Services implements OnInit, OnDestroy {
  activeTab: 'customer' | 'creator' | 'deadlines' = 'customer';
  isCreator = false;
  private sub?: any;

  constructor(private auth: AuthService) {
    // no-op: defer initialization to ngOnInit to wait for auth to load
  }

  selectTab(tab: 'customer' | 'creator' | 'deadlines') {
    this.activeTab = tab;
  }

  ngOnInit(): void {
    // Subscribe to currentUser so we react when auth profile finishes loading
    this.sub = this.auth.currentUser$.subscribe(user => {
      const wasCreator = this.isCreator;
      this.isCreator = !!user && this.auth.isCreator();
      // On first resolve, set default tab to creator for creators
      if (!wasCreator && this.isCreator && this.activeTab === 'customer') {
        this.activeTab = 'creator';
      }
    });
  }

  ngOnDestroy(): void {
    if (this.sub) this.sub.unsubscribe?.();
  }
}
