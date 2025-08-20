import { Component, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import Chart from 'chart.js/auto';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DashboardSidebar } from '../../dashboard-sidebar/dashboard-sidebar';
import { PaymentService, BalanceResponse, RevenueAnalytics, MonthlyRevenuePoint } from '../../../core/services/payment.service';
import { OrderService } from '../../../core/services/order.service';
import { AuthService } from '../../../core/services/auth.service';
import Swal from 'sweetalert2';
import { firstValueFrom } from 'rxjs';

interface SalesData {
  totalSales: number;
  totalRevenue: number;
  netRevenue?: number;
  creatorCommissionTotal?: number;
  monthlyRevenue: number;
  weeklyRevenue: number;
  averageOrderValue: number;
  currency: string; // Added missing currency property
  topProducts: Array<{
    id: number;
    name: string;
    sales: number;
    revenue: number;
    currency: string;
  }>;
}

@Component({
  selector: 'app-sales',
  standalone: true,
  imports: [CommonModule, FormsModule, DashboardSidebar],
  templateUrl: './sales.html',
  styleUrl: './sales.css'
})
export class Sales implements OnInit, AfterViewInit {
  salesData: SalesData = {
    totalSales: 0,
    totalRevenue: 0,
    monthlyRevenue: 0,
    weeklyRevenue: 0,
    averageOrderValue: 0,
    currency: 'USD', // Initialize currency
    topProducts: []
  };

  // Original data no longer needed; server handles conversion
  private originalSalesData: SalesData | null = null; // deprecated

  currentBalance: number = 0;
  loading: boolean = false;
  error: string = '';
  selectedCurrency: string = 'USD';
  availableCurrencies = ['USD', 'EGP'];
  private chart: any | null = null;
  @ViewChild('revenueChartCanvas') revenueChartCanvas!: ElementRef<HTMLCanvasElement>;
  private pendingLabels: string[] | null = null;
  private pendingData: number[] | null = null;
  private chartRetryCount = 0;
  private readonly chartRetryMax = 40; // ~2s total

  constructor(
    private paymentService: PaymentService,
    private orderService: OrderService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.loadSalesData();
    this.loadBalance();
    this.loadMonthlySeries();
  }

  ngAfterViewInit(): void {
    // Try to render if data already arrived
    this.maybeRenderChart();
  }

  private loadBalance() {
    this.paymentService.getBalance(this.selectedCurrency).subscribe({
      next: (response: BalanceResponse) => {
        this.currentBalance = response.currentBalance;
      },
      error: (error) => {
        console.error('Failed to load balance:', error);
        this.currentBalance = 0;
      }
    });
  }

  loadSalesData() {
    this.loading = true;
    this.error = '';

    console.log('Loading sales data with currency:', this.selectedCurrency);

    this.paymentService.getRevenueAnalytics(this.selectedCurrency).subscribe({
      next: (analytics: RevenueAnalytics) => {
        console.log('Received analytics data:', analytics);

        // Handle cases where analytics might be null or undefined
        if (analytics) {
          this.salesData = {
            totalSales: analytics.totalSales || 0,
            totalRevenue: analytics.totalRevenue || 0,
            netRevenue: analytics.netRevenue ?? analytics.totalRevenue ?? 0,
            creatorCommissionTotal: analytics.creatorCommissionTotal ?? 0,
            monthlyRevenue: analytics.monthlyRevenue || 0,
            weeklyRevenue: analytics.weeklyRevenue || 0,
            averageOrderValue: analytics.averageOrderValue || 0,
            currency: this.selectedCurrency, // Set currency from selectedCurrency
            topProducts: analytics.topProducts || []
          };
          // No client-side currency conversion; use server data only
          this.originalSalesData = null;
        } else {
          console.log('No analytics data received, setting defaults');
          // Set default values if no analytics data
          this.salesData = {
            totalSales: 0,
            totalRevenue: 0,
            netRevenue: 0,
            creatorCommissionTotal: 0,
            monthlyRevenue: 0,
            weeklyRevenue: 0,
            averageOrderValue: 0,
            currency: this.selectedCurrency, // Set currency from selectedCurrency
            topProducts: []
          };
          this.originalSalesData = null;
        }
        this.loading = false;
        this.error = ''; // Clear any previous errors
      },
      error: (error) => {
        console.error('Failed to load sales data:', error);
        // Set default values on error instead of showing error message
        this.salesData = {
          totalSales: 0,
          totalRevenue: 0,
          monthlyRevenue: 0,
          weeklyRevenue: 0,
          averageOrderValue: 0,
          currency: this.selectedCurrency, // Set currency from selectedCurrency
          topProducts: []
        };
        this.originalSalesData = null;
        this.loading = false;
        this.error = ''; // Don't show error message, just display 0 values
      }
    });
  }

  onCurrencyChange() {
    // Always fetch fresh data in the selected currency
    this.loadSalesData();
    this.loadBalance();
    this.loadMonthlySeries();
  }

  // Removed client-side conversion; server provides numbers in requested currency

  getRevenuePercentage(): number {
    if (this.salesData.totalRevenue === 0) return 0;
    return (this.salesData.monthlyRevenue / this.salesData.totalRevenue) * 100;
  }

  formatCurrency(amount: number): string {
    const symbol = this.selectedCurrency === 'EGP' ? 'EGP' : '$';
    return `${symbol}${amount.toFixed(2)}`;
  }

  getCurrencySymbol(): string {
    return this.selectedCurrency === 'EGP' ? 'EGP' : '$';
  }

  private loadMonthlySeries() {
    this.paymentService.getMyMonthlySeries(this.selectedCurrency).subscribe({
      next: (series: MonthlyRevenuePoint[]) => {
        const labels = series.map(p => this.formatMonthLabel(p.year, p.month));
        const data = series.map(p => p.revenue);
        this.pendingLabels = labels;
        this.pendingData = data;
        console.log('[Sales] Monthly series received', { labels, data });
        this.maybeRenderChart();
      },
      error: () => {
        // Render empty chart on error
        const labels = this.generateLast12MonthLabels();
        const data = new Array(labels.length).fill(0);
        this.pendingLabels = labels;
        this.pendingData = data;
        console.warn('[Sales] Monthly series request failed; rendering empty chart');
        this.maybeRenderChart();
      }
    });
  }

  private formatMonthLabel(year: number, month: number): string {
    const date = new Date(year, month - 1, 1);
    return date.toLocaleDateString(undefined, { month: 'short' });
  }

  private generateLast12MonthLabels(): string[] {
    const labels: string[] = [];
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    for (let i = 0; i < 12; i++) {
      const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
      labels.push(d.toLocaleDateString(undefined, { month: 'short' }));
    }
    return labels;
  }

  private maybeRenderChart() {
    if (!this.pendingLabels || !this.pendingData) return;
    if (!this.revenueChartCanvas) return;
    const canvas = this.revenueChartCanvas.nativeElement;
    const ctx: any = canvas.getContext('2d');
    if (!ctx) {
      if (this.chartRetryCount < this.chartRetryMax) {
        this.chartRetryCount++;
        setTimeout(() => this.maybeRenderChart(), 50);
      } else {
        console.error('[Sales] Canvas context unavailable');
      }
      return;
    }

    // dispose existing
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }

    // Diagnostics: canvas and parent size
    const parent = canvas.parentElement as HTMLElement | null;
    const pw = parent?.clientWidth || 0;
    const ph = parent?.clientHeight || 0;
    const cw = canvas.clientWidth;
    const ch = canvas.clientHeight;
    console.log('[Sales] Sizes', { parent: { pw, ph }, canvas: { cw, ch } });
    if (cw === 0) {
      // If layout hasn't given width yet, set an explicit width from parent and retry
      const w = pw || 600;
      canvas.style.width = w + 'px';
      canvas.width = w; // set actual canvas pixels
      console.warn('[Sales] Canvas width was 0; forced width', { w });
    }
    if (ch === 0) {
      const h = ph || 360;
      canvas.style.height = h + 'px';
      canvas.height = h;
      console.warn('[Sales] Canvas height was 0; forced height', { h });
    }

    // Draw a test rectangle to confirm canvas is visible
    try {
      ctx.save();
      ctx.strokeStyle = 'rgba(255,0,0,0.6)';
      ctx.lineWidth = 2;
      ctx.strokeRect(2, 2, (canvas.width || 600) - 4, (canvas.height || 360) - 4);
      ctx.restore();
    } catch {}

    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(102, 126, 234, 0.35)');
    gradient.addColorStop(1, 'rgba(118, 75, 162, 0.05)');

    const allZero = this.pendingData.every(v => Number(v) === 0);
    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: this.pendingLabels,
        datasets: [
          {
            label: `Monthly Revenue (${this.getCurrencySymbol()})`,
            data: this.pendingData,
            borderColor: '#667eea',
            backgroundColor: gradient,
            fill: true,
            tension: 0.35,
            borderWidth: 2,
            pointRadius: 3,
            pointBackgroundColor: '#667eea',
            pointHoverRadius: 5,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true },
          tooltip: {
            callbacks: {
              label: (ctx: any) => `${this.getCurrencySymbol()}${Number(ctx.parsed.y).toFixed(2)}`,
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
          },
          y: {
            grid: { color: 'rgba(0,0,0,0.1)' },
            ticks: {
              callback: (value: any) => `${this.getCurrencySymbol()}${Number(value).toFixed(0)}`,
            },
            suggestedMin: 0,
            suggestedMax: allZero ? 10 : undefined,
          },
        },
      },
    });
    console.log('[Sales] Chart instance created', {
      labels: this.chart?.data?.labels?.length,
      datasets: this.chart?.data?.datasets?.length
    });
    // Clear pending after successful render
    this.pendingLabels = null;
    this.pendingData = null;
    this.chartRetryCount = 0;

    // In case initial layout settles after async, trigger a resize soon
    setTimeout(() => {
      try { this.chart?.resize(); } catch {}
    }, 120);
  }

  // --- Export Report ---
  async onExportReport() {
    try {
      const html = this.buildReportHtml();
      const { isConfirmed } = await Swal.fire({
        title: 'Export Report',
        html: `
          <div style="text-align:left;max-height:55vh;overflow:auto;border:1px solid #e5e7eb;border-radius:10px">
            ${html}
          </div>
          <div style="margin-top:10px;color:#6b7280;font-size:12px">Preview of the report to be exported</div>
        `,
        width: '72rem',
        showCancelButton: true,
        confirmButtonText: 'Send to my email',
        cancelButtonText: 'Close',
        showDenyButton: false,
        focusConfirm: false
      });

      if (isConfirmed) {
        // Show loading without awaiting; otherwise code will pause until modal closes
        Swal.fire({ title: 'Sending…', didOpen: () => Swal.showLoading(), allowOutsideClick: false, allowEscapeKey: false });
        try {
          // Ask backend to email the analytics report for current creator and currency
          await firstValueFrom(this.paymentService.emailMyAnalyticsReport(this.selectedCurrency));
          Swal.close();
          await Swal.fire({ icon: 'success', title: 'Report emailed', text: 'A copy of your analytics report was sent to your email.' });
        } catch (err: any) {
          Swal.close();
          throw err;
        }
      }
    } catch (e: any) {
      await Swal.fire({ icon: 'error', title: 'Export failed', text: e?.message || 'Something went wrong while exporting the report.' });
    }
  }

  private buildReportHtml(): string {
    const symbol = this.getCurrencySymbol();
    const fmt = (n: number) => `${symbol}${Number(n || 0).toFixed(2)}`;
    const now = new Date();
    const head = `
      <div style="padding:18px 22px;background:linear-gradient(180deg,#0f172a,#0b1221);color:#e5e7eb;border-bottom:1px solid #334155">
        <h2 style="margin:0;font-size:20px;letter-spacing:.2px">Sales Analytics Report</h2>
        <div style="font-size:12px;opacity:.85">Generated on ${now.toLocaleString()} • Currency: ${this.selectedCurrency}</div>
      </div>`;
    const kpis = `
      <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;padding:16px">
        ${this.kpiCard('Total Sales', String(this.salesData.totalSales), 'fas fa-shopping-cart')}
        ${this.kpiCard('Total Revenue', fmt(this.salesData.totalRevenue), 'fas fa-dollar-sign')}
        ${this.kpiCard('Monthly Revenue', fmt(this.salesData.monthlyRevenue), 'fas fa-chart-line')}
        ${this.kpiCard('Weekly Revenue', fmt(this.salesData.weeklyRevenue), 'fas fa-calendar-week')}
        ${this.kpiCard('Avg. Order Value', fmt(this.salesData.averageOrderValue), 'fas fa-calculator')}
      </div>`;
    const topProducts = `
      <div style="padding:0 16px 16px">
        <h3 style="margin:8px 0 10px;font-size:16px">Top Performing Products</h3>
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <thead>
            <tr>
              <th style="text-align:left;border-bottom:1px solid #e5e7eb;padding:8px">Product</th>
              <th style="text-align:right;border-bottom:1px solid #e5e7eb;padding:8px">Sales</th>
              <th style="text-align:right;border-bottom:1px solid #e5e7eb;padding:8px">Revenue</th>
            </tr>
          </thead>
          <tbody>
            ${(this.salesData.topProducts || []).map(p => `
              <tr>
                <td style=\"padding:8px;border-bottom:1px solid #f1f5f9\">${this.escapeHtml(p.name)}</td>
                <td style=\"padding:8px;border-bottom:1px solid #f1f5f9;text-align:right\">${p.sales}</td>
                <td style=\"padding:8px;border-bottom:1px solid #f1f5f9;text-align:right\">${fmt(p.revenue)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>`;
    const wrapper = `
      <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,Noto Sans,sans-serif;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">
        ${head}
        ${kpis}
        ${topProducts}
      </div>`;
    return wrapper;
  }

  private kpiCard(label: string, value: string, icon: string): string {
    return `
      <div style=\"display:flex;align-items:center;gap:12px;border:1px solid #e5e7eb;border-radius:12px;padding:12px\">
        <div style=\"width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;background:#eff6ff;color:#2563eb\">
          <i class=\"${icon}\"></i>
        </div>
        <div style=\"display:flex;flex-direction:column\">
          <div style=\"font-size:12px;color:#64748b\">${this.escapeHtml(label)}</div>
          <div style=\"font-size:16px;font-weight:700\">${this.escapeHtml(value)}</div>
        </div>
      </div>`;
  }

  private escapeHtml(s: string): string {
    return (s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
