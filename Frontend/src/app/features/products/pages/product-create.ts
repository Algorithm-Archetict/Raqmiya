// src/app/features/products/pages/product-create/product-create.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil, tap, forkJoin, switchMap, of, Observable } from 'rxjs';
import { ProductService } from '../services/product.service';
import { AuthService } from '../../../core/services/auth';
import { FileUploadService } from '../../../core/services/file-upload.service';
import { ProductCreateRequest } from '../../../models/product.model';
import { Alert } from '../../../shared/ui/alert/alert';
import { LoadingSpinner } from '../../../shared/ui/loading-spinner/loading-spinner';

@Component({
  selector: 'app-product-create',
  templateUrl: './product-create.html',
  styleUrls: ['./product-create.css'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    Alert,
    LoadingSpinner
  ]
})
export class ProductCreateComponent implements OnInit, OnDestroy {
  productForm!: FormGroup;
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  private destroy$ = new Subject<void>();

  // File handling properties
  selectedDigitalProduct?: File;
  selectedCoverImage?: File;
  selectedPreviewVideo?: File;
  imagePreview?: string;
  videoPreview?: string;

  // Product types for dropdown
  productTypes = [
    'Game',
    'Software',
    'Digital Art',
    'Music',
    'Video',
    'Document',
    'Template',
    'Plugin',
    'Asset Pack',
    'Other'
  ];

  // Categories for selection
  categories = [
    { id: 1, name: 'Gaming' },
    { id: 2, name: 'Software Development' },
    { id: 3, name: 'Design' },
    { id: 4, name: 'Music' },
    { id: 5, name: 'Video' },
    { id: 6, name: 'Education' },
    { id: 7, name: 'Business' },
    { id: 8, name: 'Entertainment' }
  ];

  // Tags for selection
  tags = [
    { id: 1, name: 'Popular' },
    { id: 2, name: 'New Release' },
    { id: 3, name: 'Featured' },
    { id: 4, name: 'Best Seller' },
    { id: 5, name: 'Trending' },
    { id: 6, name: 'Limited Time' },
    { id: 7, name: 'Premium' },
    { id: 8, name: 'Free' }
  ];

  constructor(
    private fb: FormBuilder,
    private productService: ProductService,
    private authService: AuthService,
    private router: Router,
    private fileUploadService: FileUploadService
  ) { }

  ngOnInit(): void {
    console.log('ProductCreateComponent initialized');
    console.log('Current user:', this.authService.getCurrentUsername());
    console.log('User role:', this.authService.getUserRole());
    
    this.initForm();
    this.generatePermalink();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initForm(): void {
    this.productForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(200)]],
      description: ['', [Validators.maxLength(5000)]],
      price: [0, [Validators.required, Validators.min(0.01), Validators.max(1000000)]],
      currency: ['USD', [Validators.required, Validators.minLength(3), Validators.maxLength(3)]],
      productType: ['', [Validators.required, Validators.maxLength(50)]],
      coverImageUrl: ['', [Validators.maxLength(500)]],
      previewVideoUrl: ['', [Validators.maxLength(500)]],
      isPublic: [true],
      permalink: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(200), Validators.pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)]],
      categoryIds: [[]],
      tagIds: [[]]
    });
  }

  // File selection methods
  onDigitalProductSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      if (this.isValidDigitalFile(file)) {
        this.selectedDigitalProduct = file;
        console.log('Digital product selected:', file.name);
      } else {
        this.errorMessage = 'Please select a valid digital file (ZIP, RAR, images, videos, etc.)';
        event.target.value = '';
      }
    }
  }

  onCoverImageSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      if (this.isValidImageFile(file)) {
        this.selectedCoverImage = file;
        this.createImagePreview(file);
        console.log('Cover image selected:', file.name);
      } else {
        this.errorMessage = 'Please select a valid image file (JPG, PNG, GIF, etc.)';
        event.target.value = '';
      }
    }
  }

  onPreviewVideoSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      if (this.isValidVideoFile(file)) {
        this.selectedPreviewVideo = file;
        this.createVideoPreview(file);
        console.log('Preview video selected:', file.name);
      } else {
        this.errorMessage = 'Please select a valid video file (MP4, AVI, MOV, etc.)';
        event.target.value = '';
      }
    }
  }

  // File validation methods
  private isValidDigitalFile(file: File): boolean {
    const validTypes = [
      'application/zip',
      'application/x-zip-compressed',
      'application/rar',
      'application/x-rar-compressed',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'video/mp4',
      'video/avi',
      'video/mov',
      'video/wmv',
      'application/pdf',
      'text/plain',
      'application/json',
      'application/xml'
    ];
    return validTypes.includes(file.type) || file.name.toLowerCase().endsWith('.zip') || file.name.toLowerCase().endsWith('.rar');
  }

  private isValidImageFile(file: File): boolean {
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    return validTypes.includes(file.type);
  }

  private isValidVideoFile(file: File): boolean {
    const validTypes = ['video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/webm'];
    return validTypes.includes(file.type);
  }

  // File preview methods
  private createImagePreview(file: File): void {
    const reader = new FileReader();
    reader.onload = (e) => {
      this.imagePreview = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  private createVideoPreview(file: File): void {
    const reader = new FileReader();
    reader.onload = (e) => {
      this.videoPreview = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  // File clearing methods
  onClearDigitalProduct(): void {
    this.selectedDigitalProduct = undefined;
    const input = document.getElementById('digitalProductFile') as HTMLInputElement;
    if (input) input.value = '';
  }

  onClearCoverImage(): void {
    this.selectedCoverImage = undefined;
    this.imagePreview = undefined;
    const input = document.getElementById('coverImageFile') as HTMLInputElement;
    if (input) input.value = '';
  }

  onClearPreviewVideo(): void {
    this.selectedPreviewVideo = undefined;
    this.videoPreview = undefined;
    const input = document.getElementById('previewVideoFile') as HTMLInputElement;
    if (input) input.value = '';
  }

  // Permalink generation
  generatePermalink(): void {
    const name = this.productForm.get('name')?.value;
    if (name) {
      const permalink = name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
      this.productForm.patchValue({ permalink });
    }
  }

  // Category and tag selection
  onCategoryChange(categoryId: number, isChecked: boolean): void {
    const currentCategories = this.productForm.get('categoryIds')?.value || [];
    if (isChecked) {
      if (!currentCategories.includes(categoryId)) {
        this.productForm.patchValue({ categoryIds: [...currentCategories, categoryId] });
      }
    } else {
      this.productForm.patchValue({ categoryIds: currentCategories.filter((id: number) => id !== categoryId) });
    }
  }

  onTagChange(tagId: number, isChecked: boolean): void {
    const currentTags = this.productForm.get('tagIds')?.value || [];
    if (isChecked) {
      if (!currentTags.includes(tagId)) {
        this.productForm.patchValue({ tagIds: [...currentTags, tagId] });
      }
    } else {
      this.productForm.patchValue({ tagIds: currentTags.filter((id: number) => id !== tagId) });
    }
  }

  // Helper methods for template
  isCategorySelected(categoryId: number): boolean {
    const selectedCategories = this.productForm.get('categoryIds')?.value || [];
    return selectedCategories.includes(categoryId);
  }

  isTagSelected(tagId: number): boolean {
    const selectedTags = this.productForm.get('tagIds')?.value || [];
    return selectedTags.includes(tagId);
  }

  getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      name: 'Product Name',
      description: 'Description',
      price: 'Price',
      currency: 'Currency',
      productType: 'Product Type',
      coverImageUrl: 'Cover Image URL',
      previewVideoUrl: 'Preview Video URL',
      isPublic: 'Public',
      permalink: 'Permalink'
    };
    return labels[fieldName] || fieldName;
  }

  getFieldError(fieldName: string): string {
    const field = this.productForm.get(fieldName);
    if (field?.errors && field.touched) {
      if (field.errors['required']) return `${this.getFieldLabel(fieldName)} is required`;
      if (field.errors['minlength']) return `${this.getFieldLabel(fieldName)} must be at least ${field.errors['minlength'].requiredLength} characters`;
      if (field.errors['maxlength']) return `${this.getFieldLabel(fieldName)} must be at most ${field.errors['maxlength'].requiredLength} characters`;
      if (field.errors['min']) return `${this.getFieldLabel(fieldName)} must be at least ${field.errors['min'].min}`;
      if (field.errors['max']) return `${this.getFieldLabel(fieldName)} must be at most ${field.errors['max'].max}`;
      if (field.errors['pattern']) return `${this.getFieldLabel(fieldName)} format is invalid`;
    }
    return '';
  }

  onCreateProduct(): void {
    if (this.productForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    if (!this.selectedDigitalProduct) {
      this.errorMessage = 'Please select a digital product file';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    console.log('Creating product...');
    console.log('Form values:', this.productForm.value);
    console.log('Selected files:', {
      digitalProduct: this.selectedDigitalProduct?.name,
      coverImage: this.selectedCoverImage?.name,
      previewVideo: this.selectedPreviewVideo?.name
    });

    // Step 1: Create the product with placeholder URLs
    const currentUser = this.authService.getCurrentUser();
    const productPayload: ProductCreateRequest = {
      ...this.productForm.value,
      creatorId: currentUser?.id || '1', // Use user ID instead of username
      coverImageUrl: this.selectedCoverImage ? 'placeholder' : undefined,
      previewVideoUrl: this.selectedPreviewVideo ? 'placeholder' : undefined
    };

    // Ensure required fields are present
    if (!productPayload.name || !productPayload.price || !productPayload.currency || !productPayload.productType || !productPayload.permalink) {
      this.errorMessage = 'Please fill in all required fields.';
      this.isLoading = false;
      return;
    }

    console.log('Product payload being sent:', productPayload);
    console.log('Product payload JSON:', JSON.stringify(productPayload, null, 2));
    console.log('Form values:', this.productForm.value);
    console.log('Form valid:', this.productForm.valid);
    console.log('Form errors:', this.productForm.errors);

    this.productService.createProduct(productPayload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (createdProduct: any) => {
          console.log('Product created successfully:', createdProduct);
          
          // Step 2: Upload files and update product with real URLs
          this.uploadFilesAndUpdateProduct(createdProduct.id);
        },
        error: (error: any) => {
          console.error('Error creating product:', error);
          console.error('Full error object:', JSON.stringify(error, null, 2));
          console.error('Error type:', typeof error);
          console.error('Error constructor:', error.constructor.name);
          
          this.isLoading = false;
          
          // Handle different error structures
          let errorMessage = 'Failed to create product. Please try again.';
          
          if (error && typeof error === 'object') {
            if (error.status === 415) {
              errorMessage = 'Unsupported media type. Please check your file formats.';
            } else if (error.status === 500) {
              errorMessage = 'Server error. Please check your input and try again.';
            } else if (error.error && error.error.message) {
              errorMessage = error.error.message;
            } else if (error.error && error.error.title) {
              errorMessage = error.error.title;
            } else if (error.message) {
              errorMessage = error.message;
            }
          } else if (typeof error === 'string') {
            errorMessage = error;
          }
          
          this.errorMessage = errorMessage;
        }
      });
  }

  private uploadFilesAndUpdateProduct(productId: number): void {
    const uploads: Observable<any>[] = [];
    let coverImageUrl: string | undefined;
    let previewVideoUrl: string | undefined;

    // Upload cover image if selected
    if (this.selectedCoverImage) {
      uploads.push(
        this.fileUploadService.uploadProductFile(productId, this.selectedCoverImage!).pipe(
          tap((response: any) => {
            coverImageUrl = response?.fileUrl;
            console.log('Cover image uploaded:', response);
          })
        )
      );
    }

    // Upload preview video if selected
    if (this.selectedPreviewVideo) {
      uploads.push(
        this.fileUploadService.uploadProductFile(productId, this.selectedPreviewVideo!).pipe(
          tap((response: any) => {
            previewVideoUrl = response?.fileUrl;
            console.log('Preview video uploaded:', response);
          })
        )
      );
    }

    // Upload digital product file
    uploads.push(
      this.fileUploadService.uploadProductFile(productId, this.selectedDigitalProduct!).pipe(
        tap(response => {
          console.log('Digital product uploaded:', response);
        })
      )
    );

    // Wait for all uploads to complete, then update product with real URLs
    if (uploads.length > 0) {
      forkJoin(uploads)
        .pipe(
          switchMap(() => {
            // Update product with real URLs if files were uploaded
            const updatePayload: any = {};
            if (coverImageUrl) updatePayload.coverImageUrl = coverImageUrl;
            if (previewVideoUrl) updatePayload.previewVideoUrl = previewVideoUrl;

            if (Object.keys(updatePayload).length > 0) {
              return this.productService.updateProduct(productId, updatePayload);
            } else {
              return of(null);
            }
          }),
          takeUntil(this.destroy$)
        )
        .subscribe({
          next: () => {
            this.isLoading = false;
            this.successMessage = 'Product created successfully!';
            this.resetForm();
            setTimeout(() => {
              this.router.navigate(['/products/my-products']);
            }, 2000);
          },
          error: (error) => {
            console.error('Error in file upload process:', error);
            this.isLoading = false;
            this.errorMessage = 'Product created but file upload failed. Please try uploading files again.';
          }
        });
    } else {
      this.isLoading = false;
      this.successMessage = 'Product created successfully!';
      this.resetForm();
      setTimeout(() => {
        this.router.navigate(['/products/my-products']);
      }, 2000);
    }
  }

  private markFormGroupTouched(): void {
    Object.keys(this.productForm.controls).forEach(key => {
      const control = this.productForm.get(key);
      control?.markAsTouched();
    });
  }

  resetForm(): void {
    this.productForm.reset({
      currency: 'USD',
      isPublic: true,
      categoryIds: [],
      tagIds: []
    });
    this.selectedDigitalProduct = undefined;
    this.selectedCoverImage = undefined;
    this.selectedPreviewVideo = undefined;
    this.imagePreview = undefined;
    this.videoPreview = undefined;
    
    // Clear file inputs
    const inputs = ['digitalProductFile', 'coverImageFile', 'previewVideoFile'];
    inputs.forEach(id => {
      const input = document.getElementById(id) as HTMLInputElement;
      if (input) input.value = '';
    });
  }
}
