// src/app/features/products/pages/product-create/product-create.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ProductService } from '../services/product.service';
import { ProductCreateRequest } from '../../../models/product.model';
import { Alert } from '../../../shared/ui/alert/alert';
import { LoadingSpinner } from '../../../shared/ui/loading-spinner/loading-spinner';
import { AuthService } from '../../../core/services/auth'; // To get current user ID for creatorId

@Component({
  selector: 'app-product-create',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    Alert,
    LoadingSpinner
  ],
  templateUrl: './product-create.html',
  styleUrls: ['./product-create.css']
})
export class ProductCreateComponent implements OnInit {
  productForm!: FormGroup;
  isLoading = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;

  // Example currencies, replace with dynamic fetch if needed
  currencies = ['USD', 'EUR', 'GBP', 'JPY'];

  constructor(
    private fb: FormBuilder,
    private productService: ProductService,
    private authService: AuthService, // Inject AuthService
    private router: Router
  ) {}

  ngOnInit(): void {
    this.productForm = this.fb.group({
      name: ['', Validators.required],
      description: ['', Validators.required],
      price: [0, [Validators.required, Validators.min(0.01)]],
      currency: ['USD', Validators.required], // Default to USD
      imageUrl: [''], // Optional
      category: [''], // Optional
      stock: [null], // Optional
      isPublished: [false] // Default to not published
    });
  }

  onCreateProduct(): void {
    this.isLoading = true;
    this.errorMessage = null;
    this.successMessage = null;

    if (this.productForm.valid) {
      const productPayload: ProductCreateRequest = this.productForm.value;
      // You might need to add creatorId from AuthService if your API requires it on client side
      // const currentUser = this.authService.currentUser$.getValue();
      // if (currentUser) {
      //   (productPayload as any).creatorId = currentUser.id;
      // }

      this.productService.createProduct(productPayload).subscribe({
        next: (response) => {
          this.isLoading = false;
          this.successMessage = 'Product created successfully!';
          this.productForm.reset({
            price: 0,
            currency: 'USD',
            isPublished: false
          }); // Reset form for new product
          // Optionally, redirect to the new product's detail page or product list
          // this.router.navigate(['/products/detail', response.id]);
        },
        error: (err) => {
          this.isLoading = false;
          console.error('Product creation error:', err);
          this.errorMessage = err.error?.message || 'Failed to create product. Please try again.';
        }
      });
    } else {
      this.isLoading = false;
      this.errorMessage = 'Please fill out all required fields correctly.';
    }
  }
}
