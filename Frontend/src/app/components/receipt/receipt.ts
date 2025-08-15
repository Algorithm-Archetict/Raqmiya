import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ProductService } from '../../core/services/product.service';
import { Receipt } from '../../core/interfaces/receipt.interface';

@Component({
  selector: 'app-receipt',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './receipt.html',
  styleUrl: './receipt.css'
})
export class ReceiptComponent implements OnInit {
  receipt: Receipt | null = null;
  loading = true;
  error = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private productService: ProductService
  ) {}

  ngOnInit(): void {
    this.loadReceipt();
  }

  loadReceipt(): void {
    const orderId = this.route.snapshot.paramMap.get('orderId');
    if (!orderId) {
      this.error = true;
      this.loading = false;
      return;
    }

    this.productService.getReceipt(parseInt(orderId)).subscribe({
      next: (receipt) => {
        this.receipt = receipt;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading receipt:', error);
        this.error = true;
        this.loading = false;
      }
    });
  }

  viewContent(): void {
    if (this.receipt) {
      this.router.navigate(['/package', this.receipt.productId]);
    }
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatPrice(price: number, currency: string): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(price);
  }
}
