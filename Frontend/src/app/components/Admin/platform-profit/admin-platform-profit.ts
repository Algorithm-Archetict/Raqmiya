import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PlatformAnalyticsService, PlatformRevenueSummaryDTO, MonthlyRevenuePointDTO, TopEntityDTO } from '../../../core/services/platform-analytics.service';
import { PlatformSettingsService } from '../../../core/services/platform-settings.service';

@Component({
  selector: 'app-admin-platform-profit',
  standalone: true,
  imports: [CommonModule, FormsModule],
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
  commissionPercentage = 0.10;
  editingCommission = false;
  recentCommissions: any[] = [];

  constructor(private api: PlatformAnalyticsService, private settings: PlatformSettingsService) {}

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

    // load commission percentage
    this.settings.getCommission().subscribe(r => {
      this.commissionPercentage = r.commissionPercentage ?? 0.10;
    });

  // load recent commission transactions
  this.api.getRecentCommissions(20, this.currency).subscribe(list => this.recentCommissions = list);
  }

  startEditing() { this.editingCommission = true; }
  saveCommission() {
    this.settings.setCommission(this.commissionPercentage).subscribe(() => { this.editingCommission = false; this.load(); });
  }
}


