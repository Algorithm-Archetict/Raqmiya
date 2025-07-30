// src/app/features/products/pages/product-edit/product-edit.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subject, takeUntil, tap, forkJoin, switchMap, of, Observable, catchError, throwError } from 'rxjs';
import { ProductService } from '../services/product.service';
import { AuthService } from '../../../core/services/auth';
import { FileUploadService } from '../../../core/services/file-upload.service';
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
export class ProductEditComponent implements OnInit, OnDestroy {
  productForm!: FormGroup;
  productId: number | null = null;
  product: Product | null = null;
  isLoading = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;
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
    private fileUploadService: FileUploadService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.initForm();
    
    this.route.paramMap.subscribe(params => {
      const idParam = params.get('id');
      if (idParam) {
        this.productId = parseInt(idParam);
        this.loadProductForEdit(this.productId);
      } else {
        this.errorMessage = 'No product ID provided for editing.';
      }
    });
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
      permalink: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(200), Validators.pattern(/^[a-z0-9\-_]+$/)]],
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

  isFieldInvalid(fieldName: string): boolean {
    const field = this.productForm.get(fieldName);
    return !!(field?.invalid && field.touched);
  }

  loadProductForEdit(id: number): void {
    this.isLoading = true;
    this.errorMessage = null;
    
    this.productService.getProductById(id)
      .pipe(
        takeUntil(this.destroy$),
        catchError(error => {
          console.error('Failed to load product for editing:', error);
          this.errorMessage = this.extractErrorMessage(error, 'Failed to load product for editing. It might not exist or you lack permissions.');
          this.isLoading = false;
          this.router.navigate(['/products/my-products']);
          return throwError(() => error);
        })
      )
      .subscribe({
        next: (data: Product) => {
          this.product = data;
          console.log('Product data loaded:', data);
          
          // Verify user has permission to edit this product
          const currentUser = this.authService.getCurrentUser();
          const currentUserId = currentUser?.id;
          if (data.creatorId && currentUserId && data.creatorId !== currentUserId) {
            this.errorMessage = 'You do not have permission to edit this product.';
            this.isLoading = false;
            this.router.navigate(['/products/my-products']);
            return;
          }
          
          // Populate form with existing data
          const formData = {
            name: data.name || '',
            description: data.description || '',
            price: data.price || 0,
            currency: data.currency || 'USD',
            productType: data.productType || '',
            coverImageUrl: data.coverImageUrl || '',
            previewVideoUrl: data.previewVideoUrl || '',
            isPublic: data.isPublic !== false, // Default to true if not set
            permalink: data.permalink || '',
            categoryIds: data.categoryIds || (data.category ? [data.category.id] : []),
            tagIds: data.tagIds || []
          };
          
          console.log('Form data to patch:', formData);
          this.productForm.patchValue(formData);

          // Set image preview if available
          if (data.coverImageUrl) {
            this.imagePreview = data.coverImageUrl;
          }

          this.isLoading = false;
        }
      });
  }

  onUpdateProduct(): void {
    if (this.productForm.invalid) {
      this.markFormGroupTouched();
      this.errorMessage = 'Please fix the errors in the form.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;
    this.successMessage = null;

    if (!this.productId) {
      this.isLoading = false;
      this.errorMessage = 'Product ID is missing.';
      return;
    }

    console.log('Updating product...');
    console.log('Form values:', this.productForm.value);
    console.log('Form valid:', this.productForm.valid);
    console.log('Form errors:', this.productForm.errors);

    // Create update payload with proper data types
    const formValues = this.productForm.value;
    const updatePayload: ProductUpdateRequest = {
      name: formValues.name?.trim(),
      description: formValues.description?.trim() || '',
      price: parseFloat(formValues.price) || 0,
      currency: formValues.currency?.toUpperCase() || 'USD',
      productType: formValues.productType,
      permalink: formValues.permalink?.trim(),
      isPublic: Boolean(formValues.isPublic),
      categoryIds: Array.isArray(formValues.categoryIds) ? formValues.categoryIds : [],
      tagIds: Array.isArray(formValues.tagIds) ? formValues.tagIds : []
    };

    // Handle image/video URLs - only include if they have values
    if (formValues.coverImageUrl?.trim()) {
      updatePayload.coverImageUrl = formValues.coverImageUrl.trim();
    }
    if (formValues.previewVideoUrl?.trim()) {
      updatePayload.previewVideoUrl = formValues.previewVideoUrl.trim();
    }

    // Validate required fields
    if (!updatePayload.name || !updatePayload.price || !updatePayload.currency || !updatePayload.productType || !updatePayload.permalink) {
      this.errorMessage = 'Please fill in all required fields.';
      this.isLoading = false;
      return;
    }

    if (updatePayload.price <= 0) {
      this.errorMessage = 'Price must be greater than 0.';
      this.isLoading = false;
      return;
    }

    if (!/^[a-z0-9\-_]+$/.test(updatePayload.permalink)) {
      this.errorMessage = 'Permalink must contain only lowercase letters, numbers, hyphens, and underscores.';
      this.isLoading = false;
      return;
    }

    console.log('Update payload:', updatePayload);

    this.productService.updateProduct(this.productId, updatePayload)
      .pipe(
        takeUntil(this.destroy$),
        catchError(error => {
          console.error('Error updating product:', error);
          this.errorMessage = this.extractErrorMessage(error, 'Failed to update product. Please try again.');
          this.isLoading = false;
          return throwError(() => error);
        })
      )
      .subscribe({
        next: (updatedProduct: Product) => {
          console.log('Product updated successfully:', updatedProduct);
          
          // Step 2: Upload new files if any were selected
          if (this.selectedDigitalProduct || this.selectedCoverImage || this.selectedPreviewVideo) {
            this.uploadFilesAndUpdateProduct(this.productId!);
          } else {
            this.isLoading = false;
            this.successMessage = 'Product updated successfully!';
            setTimeout(() => {
              this.router.navigate(['/products/detail', this.productId]);
            }, 2000);
          }
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
          }),
          catchError(error => {
            console.error('Error uploading cover image:', error);
            return throwError(() => error);
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
          }),
          catchError(error => {
            console.error('Error uploading preview video:', error);
            return throwError(() => error);
          })
        )
      );
    }

    // Upload digital product file if selected
    if (this.selectedDigitalProduct) {
      uploads.push(
        this.fileUploadService.uploadProductFile(productId, this.selectedDigitalProduct!).pipe(
          tap(response => {
            console.log('Digital product uploaded:', response);
          }),
          catchError(error => {
            console.error('Error uploading digital product:', error);
            return throwError(() => error);
          })
        )
      );
    }

    // Wait for all uploads to complete, then update product with real URLs
    if (uploads.length > 0) {
      forkJoin(uploads)
        .pipe(
          switchMap(() => {
            // Update product with real URLs if files were uploaded
            const finalUpdatePayload: ProductUpdateRequest = {};
            if (coverImageUrl) finalUpdatePayload.coverImageUrl = coverImageUrl;
            if (previewVideoUrl) finalUpdatePayload.previewVideoUrl = previewVideoUrl;

            if (Object.keys(finalUpdatePayload).length > 0) {
              return this.productService.updateProduct(productId, finalUpdatePayload);
            } else {
              return of(null);
            }
          }),
          takeUntil(this.destroy$),
          catchError(error => {
            console.error('Error in file upload process:', error);
            this.errorMessage = this.extractErrorMessage(error, 'Product updated but file upload failed. Please try uploading files again.');
            this.isLoading = false;
            return throwError(() => error);
          })
        )
        .subscribe({
          next: () => {
            this.isLoading = false;
            this.successMessage = 'Product updated successfully!';
            setTimeout(() => {
              this.router.navigate(['/products/detail', this.productId]);
            }, 2000);
          }
        });
    } else {
      this.isLoading = false;
      this.successMessage = 'Product updated successfully!';
      setTimeout(() => {
        this.router.navigate(['/products/detail', this.productId]);
      }, 2000);
    }
  }

  private extractErrorMessage(error: any, defaultMessage: string): string {
    if (error.error) {
      if (typeof error.error === 'string') {
        return error.error;
      } else if (error.error.message) {
        return error.error.message;
      } else if (error.error.title) {
        return error.error.title;
      } else if (error.error.detail) {
        return error.error.detail;
      } else if (error.error.errors && Array.isArray(error.error.errors)) {
        return error.error.errors.map((e: any) => e.message || e).join(', ');
      } else if (error.error.ValidationErrors && Array.isArray(error.error.ValidationErrors)) {
        return error.error.ValidationErrors.map((e: any) => e.ErrorMessage || e).join(', ');
      }
    }
    return defaultMessage;
  }

  private markFormGroupTouched(): void {
    Object.keys(this.productForm.controls).forEach(key => {
      const control = this.productForm.get(key);
      control?.markAsTouched();
    });
  }

  getFormProgress(): number {
    const totalFields = Object.keys(this.productForm.controls).length;
    const filledFields = Object.keys(this.productForm.controls).filter(key => {
      const control = this.productForm.get(key);
      return control?.value && control.value !== '' && control.value !== 0;
    }).length;
    return Math.round((filledFields / totalFields) * 100);
  }
}
