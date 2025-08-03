import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, RouterLink } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DashboardSidebar } from '../../../dashboard-sidebar/dashboard-sidebar';
import { ProductDetailDTO } from '../../../../core/models/product/product-detail.dto';
import { ProductCreateRequestDTO } from '../../../../core/models/product/product-create-request.dto';
import { ProductService } from '../../../../core/services/product.service';
import { ProductUpdateRequestDTO } from '../../../../core/models/product/product-update-request.dto';
import { ProductEdit } from '../product-edit/product-edit';
import { ProductEditContent } from '../product-edit-content/product-edit-content';

@Component({
  selector: 'app-add-new-product',
  imports: [
    CommonModule,
            RouterModule,
            FormsModule,
            ReactiveFormsModule,
            DashboardSidebar, 
            RouterLink,
            ProductEdit,
            ProductEditContent
          ],
  templateUrl: './add-new-product.html',
  styleUrl: './add-new-product.css'
})
export class AddNewProduct implements OnInit {
  productForm!: FormGroup;
  currentStep: 'create' | 'customize' | 'content' = 'create';
  productId?: number;
  isSubmitting = false;
  successMessage: string | null = null;
  errorMessage: string | null = null;

  productTypes = [
    { id: 'digital', name: 'Digital', description: 'Downloadable files', icon: 'fas fa-file', selected: false },
    { id: 'course', name: 'Course', description: 'Online video content', icon: 'fas fa-video', selected: false },
    { id: 'membership', name: 'Membership', description: 'Recurring access to content', icon: 'fas fa-users', selected: false }
  ];

  constructor(private fb: FormBuilder, private productService: ProductService) {}

  ngOnInit(): void {
    this.productForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      description: [''],
      price: [0, [Validators.required, Validators.min(0.01)]],
      currency: ['USD', [Validators.required]],
      productType: ['', Validators.required],
      permalink: ['', [Validators.required, Validators.pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)]],
      isPublic: [true]
    });
  }

  get isCreateStepValid(): boolean {
    return !!this.productForm.get('name')?.valid &&
           !!this.productForm.get('price')?.valid &&
           !!this.productForm.get('productType')?.valid &&
           !!this.productForm.get('permalink')?.valid;
  }

  get isCustomizeStepValid(): boolean {
    return !!this.productForm.get('description')?.valid && this.productForm.get('isPublic') !== null;
  }

  selectProductType(typeId: string): void {
    this.productForm.get('productType')?.setValue(typeId);
    this.productTypes.forEach(type => type.selected = type.id === typeId);
  }

  nextToCustomize(): void {
    if (this.productForm.valid) {
      this.currentStep = 'customize';
    }
  }

  saveAndContinue(): void {
    if (this.productForm.invalid) return;
    this.isSubmitting = true;
    const dto: ProductCreateRequestDTO = this.productForm.value;
    this.productService.createProduct(dto).subscribe({
      next: (res) => {
        this.productId = res.id;
        this.currentStep = 'content';
        this.isSubmitting = false;
        this.successMessage = 'Product saved.';
      },
      error: () => {
        this.isSubmitting = false;
        this.errorMessage = 'Failed to create product.';
      }
    });
  }

  saveAndPublish(): void {
    if (!this.productId || this.productForm.invalid) return;
    const dto = this.productForm.value;
    this.productService.updateProduct(this.productId, dto).subscribe({
      next: () => {
        this.successMessage = 'Product published!';
      },
      error: () => {
        this.errorMessage = 'Failed to publish product.';
      }
    });
  }

  cancel(): void {
    this.currentStep = 'create';
    this.productForm.reset();
    this.productId = undefined;
    this.successMessage = null;
    this.errorMessage = null;
  }
  
}

