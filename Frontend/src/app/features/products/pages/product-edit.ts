// src/app/features/products/pages/product-edit/product-edit.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ProductService } from '../services/product.service';
import { Product, ProductUpdateRequest } from '../../../models/product.model';
import { Alert } from '../../../shared/ui/alert/alert';
import { LoadingSpinner } from '../../../shared/ui/loading-spinner/loading-spinner';

@Component({
  selector: 'app-product-edit',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    Alert,
    LoadingSpinner
  ],
  templateUrl: './product-edit.html',
  styleUrls: ['./product-edit.css']
})
export class ProductEditComponent implements OnInit {
  productForm!: FormGroup;
  productId: number | null = null; // Changed from string to number
  product: Product | null = null;
  isLoading = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;

  currencies = ['USD', 'EUR', 'GBP', 'JPY'];

  constructor(
    private fb: FormBuilder,
    private productService: ProductService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.productForm = this.fb.group({
      name: ['', Validators.required],
      description: ['', Validators.required],
      price: [0, [Validators.required, Validators.min(0.01)]],
      currency: ['USD', Validators.required],
      imageUrl: [''],
      category: [''],
      stock: [null],
      isPublished: [false]
    });

    this.route.paramMap.subscribe(params => {
      const idParam = params.get('id');
      if (idParam) {
        this.productId = parseInt(idParam); // Convert string to number
        this.loadProductForEdit(this.productId);
      } else {
        this.errorMessage = 'No product ID provided for editing.';
      }
    });
  }

  loadProductForEdit(id: number): void { // Changed parameter type to number
    this.isLoading = true;
    this.productService.getProductById(id).subscribe({
      next: (data: Product) => {
        this.product = data;
        // Note: The Product interface doesn't have all the form fields, so we'll need to handle this carefully
        this.productForm.patchValue({
          name: data.name,
          price: data.price,
          currency: data.currency
          // Add other fields as needed
        });
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load product for editing:', err);
        this.errorMessage = 'Failed to load product for editing. It might not exist or you lack permissions.';
        this.isLoading = false;
        this.router.navigate(['/products/my-products']); // Redirect if product not found
      }
    });
  }

  onUpdateProduct(): void {
    this.isLoading = true;
    this.errorMessage = null;
    this.successMessage = null;

    if (this.productForm.valid && this.productId) {
      const productPayload: ProductUpdateRequest = {
        id: this.productId, // Add the ID to the payload
        ...this.productForm.value
      };
      this.productService.updateProduct(this.productId, productPayload).subscribe({
        next: () => {
          this.isLoading = false;
          this.successMessage = 'Product updated successfully!';
          // Optionally, redirect after update
          // this.router.navigate(['/products/detail', this.productId.toString()]);
        },
        error: (err) => {
          this.isLoading = false;
          console.error('Product update error:', err);
          this.errorMessage = err.error?.message || 'Failed to update product. Please try again.';
        }
      });
    } else {
      this.isLoading = false;
      this.errorMessage = 'Please fix the errors in the form or ensure product ID is present.';
    }
  }
}
