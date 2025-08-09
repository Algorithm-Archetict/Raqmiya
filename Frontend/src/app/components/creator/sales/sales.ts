import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DashboardSidebar } from '../../dashboard-sidebar/dashboard-sidebar';
import { ProductService } from '../../../core/services/product.service';
import { OrderService } from '../../../core/services/order.service';
import { AuthService } from '../../../core/services/auth.service';

interface TopProductRow {
  productId: number;
  productName: string;
  price: number;
  sales: number;
  revenue: number;
}

@Component({
  selector: 'app-sales',
  standalone: true,
  imports: [CommonModule, RouterModule, DashboardSidebar],
  templateUrl: './sales.html',
  styleUrl: './sales.css'
})
export class Sales implements OnInit {
  loading = false;
  error = '';
  totalSales = 0;
  totalRevenue = 0;
  topProducts: TopProductRow[] = [];

  constructor(
    private productService: ProductService,
    private orderService: OrderService,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  private loadData() {
    this.loading = true;
    this.error = '';

    // First, load creator products to compute totals (salesCount * price)
    this.productService.getProducts(1, 100).subscribe({
      next: (res: any) => {
        const username = this.auth.getCurrentUsername();
        const items = (res?.items ?? res ?? []).filter((p: any) => p?.creatorUsername === username);
        this.totalSales = items.reduce((sum: number, p: any) => sum + (p.salesCount || 0), 0);
        this.totalRevenue = items.reduce((sum: number, p: any) => sum + (p.price || 0) * (p.salesCount || 0), 0);
        this.topProducts = items
          .map((p: any) => ({
            productId: p.id,
            productName: p.name || 'Untitled',
            price: p.price || 0,
            sales: p.salesCount || 0,
            revenue: (p.price || 0) * (p.salesCount || 0)
          }))
          .sort((a: TopProductRow, b: TopProductRow) => b.sales - a.sales)
          .slice(0, 10);
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.error = 'Failed to load products for sales summary.';
      }
    });
  }
}
