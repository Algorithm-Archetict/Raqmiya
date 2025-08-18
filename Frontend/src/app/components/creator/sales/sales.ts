import { Component, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import Chart from 'chart.js/auto';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DashboardSidebar } from '../../dashboard-sidebar/dashboard-sidebar';
import { PaymentService, BalanceResponse, RevenueAnalytics, MonthlyRevenuePoint } from '../../../core/services/payment.service';
import { OrderService } from '../../../core/services/order.service';
import { AuthService } from '../../../core/services/auth.service';

interface SalesData {
  totalSales: number;
  totalRevenue: number;
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
}
