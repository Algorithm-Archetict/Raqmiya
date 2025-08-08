import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { DashboardSidebar } from '../../../dashboard-sidebar/dashboard-sidebar';
import { ProductService } from '../../../../core/services/product.service';
import { ProductDetailDTO } from '../../../../core/models/product/product-detail.dto';
import { ProductUpdateRequestDTO } from '../../../../core/models/product/product-update-request.dto';
import { Alert } from '../../../shared/alert/alert';

@Component({
  selector: 'app-product-edit-content',
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule, DashboardSidebar, Alert],
  templateUrl: './product-edit-content.html',
  styleUrl: './product-edit-content.css'
})
export class ProductEditContent implements OnInit {
  @Input() productForm!: FormGroup;
  @Input() productId?: number;
  @Output() save = new EventEmitter<void>();

  // Component state
  loading: boolean = false;
  isSubmitting: boolean = false;
  successMessage: string | null = null;
  errorMessage: string | null = null;
  product: ProductDetailDTO | null = null;

  // Additional properties for the template
  productName: string = '';
  isFormValid: boolean = true;

  // Content editing properties
  content: string = '';

  // File management
  newFiles: File[] = [];
  isUploading: boolean = false;
  uploadProgress: number = 0;

  constructor(
    private fb: FormBuilder,
    private productService: ProductService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.loadProduct();
  }

  private initializeForm(): void {
    this.productForm = this.fb.group({
      content: ['', [Validators.maxLength(10000)]],
      files: [[]]
    });
  }

  loadProduct(): Promise<void> {
    return Promise.resolve().then(() => {
      this.loading = true;
      this.errorMessage = null;

      const productId = this.route.snapshot.params['id'];
      if (!productId) {
        this.errorMessage = 'Product ID not found';
        this.loading = false;
        return;
      }

      this.productId = parseInt(productId);

      this.productService.getProductById(this.productId).subscribe({
        next: (product: ProductDetailDTO) => {
          this.product = product;
          this.productName = product.name;
          this.populateForm();
          this.loading = false;
        },
        error: (error: any) => {
          console.error('Error loading product:', error);
          this.errorMessage = 'Failed to load product details';
          this.loading = false;
        }
      });
    });
  }

  private populateForm(): void {
    if (!this.product) return;

    // Populate content field
    this.content = this.product.description || '';
    this.productForm.patchValue({
      content: this.content
    });
  }

  onSaveAndPublish(): void {
    this.saveAndPublish();
  }

  saveAndPublish(): void {
    this.saveContent(true);
  }

  private saveContent(publish: boolean = false): void {
    if (this.productForm.valid) {
      this.isSubmitting = true;
      this.errorMessage = null;
      this.successMessage = null;

      // Create the product update DTO
      const productDto: ProductUpdateRequestDTO = {
        id: this.productId!,
        name: this.product!.name,
        description: this.productForm.get('content')?.value || '',
        price: this.product!.price,
        currency: this.product!.currency,
        productType: this.product!.productType,
        coverImageUrl: this.product!.coverImageUrl,
        thumbnailImageUrl: this.product!.thumbnailImageUrl,
        previewVideoUrl: this.product!.previewVideoUrl,
        isPublic: this.product!.isPublic,
        permalink: this.product!.permalink,
        status: publish ? 'published' : this.product!.status,
        compatibility: this.product!.compatibility,
        license: this.product!.license,
        updates: this.product!.updates,
        categoryIds: this.product!.categories?.map(c => c.id) || [],
        tagIds: this.product!.tags?.map(t => t.id) || [],
        features: this.product!.features || []
      };

      // Log the request payload for debugging
      console.log('Sending content update request:', productDto);

      this.productService.updateProduct(this.productId!, productDto).subscribe({
        next: (updatedProduct) => {
          this.isSubmitting = false;
          this.successMessage = publish ? 'Product published successfully!' : 'Content saved successfully!';
          this.product = updatedProduct;

          // Upload any new files
          this.uploadNewFiles();
        },
        error: (error) => {
          console.error('Content update error:', error);
          console.error('Error response:', error.error);

          let errorMessage = 'Failed to save content';
          if (error.error?.message) {
            errorMessage += ': ' + error.error.message;
          } else if (error.error?.title) {
            errorMessage += ': ' + error.error.title;
          } else if (error.message) {
            errorMessage += ': ' + error.message;
          }

          this.errorMessage = errorMessage;
          this.isSubmitting = false;
        }
      });
    } else {
      console.log('Form validation errors:', this.productForm.errors);
      console.log('Form value:', this.productForm.value);
      this.errorMessage = 'Please fix the form errors before saving.';
    }
  }

  private async uploadNewFiles(): Promise<void> {
    if (this.newFiles.length === 0) return;

    this.isUploading = true;
    this.uploadProgress = 0;

    for (let i = 0; i < this.newFiles.length; i++) {
      const file = this.newFiles[i];
      try {
        await firstValueFrom(this.productService.uploadFile(this.productId!, file));
        this.uploadProgress = ((i + 1) / this.newFiles.length) * 100;
      } catch (error: any) {
        console.error('Error uploading file:', error);
        this.errorMessage = `Failed to upload ${file.name}: ${error.error?.message || error.message}`;
      }
    }

    this.isUploading = false;
    this.newFiles = [];
    this.uploadProgress = 0;
  }

  cancel(): void {
    this.router.navigate(['/products']);
  }

  private updateFormValidity(): void {
    this.isFormValid = this.productForm.valid;
  }

  // Content editing methods
  onContentChange(): void {
    this.content = this.productForm.get('content')?.value || '';
    this.updateFormValidity();
  }
}
