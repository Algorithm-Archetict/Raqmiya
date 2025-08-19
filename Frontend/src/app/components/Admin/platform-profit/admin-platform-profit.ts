import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlatformAnalyticsService, PlatformRevenueSummaryDTO, MonthlyRevenuePointDTO, TopEntityDTO } from '../../../core/services/platform-analytics.service';

@Component({
  selector: 'app-admin-platform-profit',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-platform-profit.html',
  styleUrls: ['./admin-platform-profit.css']
})
export class AdminPlatformProfit implements OnInit {
  currency = 'USD';
  summary?: PlatformRevenueSummaryDTO;
  series: MonthlyRevenuePointDTO[] = [];
  topCreators: TopEntityDTO[] = [];
  topProducts: TopEntityDTO[] = [];
  loading = false;

  constructor(private api: PlatformAnalyticsService) {}

  ngOnInit(): void {
    this.load();
  }

  setCurrency(curr: string) {
    if (this.currency === curr) return;
    this.currency = curr;
    this.load();
  }

  private load() {
    this.loading = true;
    this.api.getSummary(this.currency).subscribe(s => this.summary = s);
    this.api.getMonthlySeries(this.currency).subscribe(s => this.series = s);
    this.api.getTopCreators(10, this.currency).subscribe(t => this.topCreators = t);
    this.api.getTopProducts(10, this.currency).subscribe(t => { this.topProducts = t; this.loading = false; });
  }
}


