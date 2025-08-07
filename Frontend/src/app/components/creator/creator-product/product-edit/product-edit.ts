import { Component, OnInit, AfterViewInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { DashboardSidebar } from '../../../dashboard-sidebar/dashboard-sidebar';
import { QuillService } from '../../../../core/services/quill.service';
import { ProductService } from '../../../../core/services/product.service';
import { ProductDetailDTO } from '../../../../core/models/product/product-detail.dto';
import { ProductUpdateRequestDTO } from '../../../../core/models/product/product-update-request.dto';
import { ProductCreateRequestDTO } from '../../../../core/models/product/product-create-request.dto';
import { CategoryDTO } from '../../../../core/models/product/category.dto';


interface ProductDetail {
  attribute: string;
  value: string;
}

@Component({
  selector: 'app-product-edit',
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule, DashboardSidebar],
  templateUrl: './product-edit.html',
  styleUrl: './product-edit.css'
})
export class ProductEdit implements OnInit {
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
  isFormValid: boolean = true;
  currency: string = 'USD';
  showCoverOptions: boolean = false;
  coverImageLink: string = '';
  coverImages: string[] = [];
  thumbnailImage: string | null = null;
  showDetailsForm: boolean = false;
  productDetails: ProductDetail[] = [];
  newDetail: ProductDetail = { attribute: '', value: '' };

  // New properties for enhanced product details
  newFeature: string = '';
  productFeatures: string[] = [];

  // File upload properties
  productFiles: File[] = [];
  uploadedFiles: any[] = [];
  isUploading: boolean = false;
  uploadProgress: number = 0;

  productTypes = [
    { id: 'digital', name: 'Digital', description: 'Downloadable files', icon: 'fas fa-file', selected: false },
    { id: 'course', name: 'Course', description: 'Online video content', icon: 'fas fa-video', selected: false },
    { id: 'membership', name: 'Membership', description: 'Recurring access to content', icon: 'fas fa-users', selected: false }
  ];

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
      name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(200)]],
      description: ['', [Validators.maxLength(5000)]],
      price: [0, [Validators.required, Validators.min(0.01), Validators.max(1000000)]],
      currency: ['USD', [Validators.required, Validators.minLength(3), Validators.maxLength(3)]],
      productType: ['', [Validators.required, Validators.maxLength(50)]],
      coverImageUrl: [''],
      thumbnailImageUrl: [''],
      previewVideoUrl: [''],
      isPublic: [false],
      permalink: ['', [Validators.required, Validators.pattern(/^[a-z0-9-]+$/)]],
      // Enhanced product details
      compatibility: [''],
      license: [''],
      updates: [''],
      categoryId: [null, [Validators.required]],
      tagIds: [[]],
      status: ['draft', [Validators.required]]
    });
  }

  // Generate permalink from product name
  private generatePermalink(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters except spaces and hyphens
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
      .replace(/^-|-$/g, '') // Remove leading and trailing hyphens
      .substring(0, 50); // Limit length
  }

  loadProduct(): Promise<void> {
    if (!this.productId) {
      this.productId = Number(this.route.snapshot.paramMap.get('id'));
    }

    if (!this.productId) {
      this.errorMessage = 'Product ID is required';
      return Promise.resolve();
    }

    this.loading = true;
    this.errorMessage = null;

    return firstValueFrom(this.productService.getById(this.productId))
      .then(product => {
        this.product = product;
        this.populateForm();
        this.loading = false;
      })
      .catch(error => {
        console.error('Error loading product:', error);
        this.errorMessage = 'Failed to load product: ' + (error.error?.message || error.message);
        this.loading = false;
      });
  }

  private populateForm(): void {
    if (!this.product) return;

    // Populate basic form fields
    this.productForm.patchValue({
      name: this.product.name,
      description: this.product.description,
      price: this.product.price,
      currency: this.product.currency,
      productType: this.product.productType,
      coverImageUrl: this.product.coverImageUrl,
      thumbnailImageUrl: this.product.thumbnailImageUrl,
      previewVideoUrl: this.product.previewVideoUrl,
      isPublic: this.product.isPublic,
      permalink: this.product.permalink,
      status: this.product.status,
      compatibility: this.product.compatibility,
      license: this.product.license,
      updates: this.product.updates,
      categoryId: this.product.category.id,
      tagIds: this.product.tags?.map(t => t.id) || []
    });

    // Populate enhanced features
    if (this.product.features) {
      this.productFeatures = this.product.features;
    }

    // Populate images - only add to arrays if they are URLs (not base64)
    if (this.product.coverImageUrl && !this.product.coverImageUrl.startsWith('data:')) {
      this.coverImages = [this.product.coverImageUrl];
    }
    if (this.product.thumbnailImageUrl && !this.product.thumbnailImageUrl.startsWith('data:')) {
      this.thumbnailImage = this.product.thumbnailImageUrl;
    }

    // Update product type selection
    this.productTypes.forEach(type => {
      type.selected = type.id === this.product?.productType;
    });

    this.updateFormValidity();
  }

  onSaveClick(): void {
    this.save.emit();
  }

  onNameChange(): void {
    this.updateFormValidity();
    
    // Auto-generate permalink if it's empty or matches the old name
    const nameControl = this.productForm.get('name');
    const permalinkControl = this.productForm.get('permalink');
    
    if (nameControl && permalinkControl) {
      const name = nameControl.value;
      const currentPermalink = permalinkControl.value;
      
      // If permalink is empty or matches the old name pattern, generate new one
      if (!currentPermalink || currentPermalink === this.generatePermalink(this.product?.name || '')) {
        const newPermalink = this.generatePermalink(name);
        permalinkControl.setValue(newPermalink);
      }
    }
  }

  cancel(): void {
    this.router.navigate(['/products']);
  }

  saveAndContinue(): void {
    if (this.productForm.valid) {
      this.isSubmitting = true;
      this.errorMessage = null;
      this.successMessage = null;
      
      // First upload images to get proper URLs
      this.uploadImages().then(() => {
        const formValue = this.productForm.value;
        
        // Create the product update DTO
        const productDto: ProductUpdateRequestDTO = {
          id: this.productId!,
          name: formValue.name,
          description: formValue.description || '',
          price: parseFloat(formValue.price),
          currency: formValue.currency,
          productType: formValue.productType,
          coverImageUrl: formValue.coverImageUrl,
          thumbnailImageUrl: formValue.thumbnailImageUrl,
          previewVideoUrl: formValue.previewVideoUrl,
          isPublic: formValue.isPublic,
          permalink: formValue.permalink,
          status: formValue.status,
          // Enhanced product details
          features: this.productFeatures,
          compatibility: formValue.compatibility,
          license: formValue.license,
          updates: formValue.updates,
          categoryId: formValue.categoryId, // Changed to single categoryId
          tagIds: formValue.tagIds || []
        };

        // Log the request payload for debugging
        console.log('Sending product update request:', productDto);

        this.productService.updateProduct(this.productId!, productDto).subscribe({
          next: (updatedProduct) => {
            this.isSubmitting = false;
            this.successMessage = 'Product updated successfully!';
            this.product = updatedProduct;
            
            // Navigate to content editing
            this.router.navigate(['/products', this.productId, 'edit', 'content']);
          },
          error: (error) => {
            console.error('Product update error:', error);
            console.error('Error response:', error.error);
            
            let errorMessage = 'Failed to update product';
            
            // Check for validation errors
            if (error.error?.errors) {
              const validationErrors = error.error.errors;
              const errorDetails = Object.keys(validationErrors)
                .map(key => `${key}: ${validationErrors[key].join(', ')}`)
                .join('; ');
              errorMessage += ': ' + errorDetails;
            } else if (error.error?.message) {
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
      }).catch(error => {
        console.error('Error uploading images:', error);
        this.errorMessage = 'Failed to upload images: ' + (error.error?.message || error.message);
        this.isSubmitting = false;
      });
    } else {
      console.log('Form validation errors:', this.productForm.errors);
      console.log('Form value:', this.productForm.value);
      
      // Log individual field errors
      Object.keys(this.productForm.controls).forEach(key => {
        const control = this.productForm.get(key);
        if (control && control.errors) {
          console.log(`Field ${key} errors:`, control.errors);
        }
      });
      
      this.errorMessage = 'Please fix the form errors before saving.';
    }
  }

  private updateFormValidity(): void {
    this.isFormValid = this.productForm.valid;
  }

  // Image upload methods
  uploadCoverImage(event: any): void {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.coverImages.push(e.target.result);
        // Don't set the form value yet - we'll upload and get URL later
      };
      reader.readAsDataURL(file);
    }
  }

  uploadCoverFromLink(): void {
    if (this.coverImageLink) {
      this.coverImages.push(this.coverImageLink);
      this.coverImageLink = '';
    }
  }

  removeCoverImage(index: number): void {
    this.coverImages.splice(index, 1);
    if (this.coverImages.length === 0) {
      this.productForm.patchValue({ coverImageUrl: '' });
    } else {
      // Keep the first image URL in the form
      this.productForm.patchValue({ coverImageUrl: this.coverImages[0] });
    }
  }

  uploadThumbnail(event: any): void {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.thumbnailImage = e.target.result;
        // Don't set the form value yet - we'll upload and get URL later
      };
      reader.readAsDataURL(file);
    }
  }

  // Helper method to convert base64 to File object (same as creation component)
  private base64ToFile(base64: string, filename: string): File {
    const arr = base64.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  }

  // Upload images and get URLs (similar to creation component)
  private async uploadImages(): Promise<void> {
    if (!this.productId) {
      console.warn('No product ID available for image upload');
      return;
    }

    console.log('Starting image upload for product ID:', this.productId);
    console.log('Cover images available:', this.coverImages.length);
    console.log('Thumbnail image available:', !!this.thumbnailImage);

    try {
      // Upload cover image if available and it's a base64 (not already a URL)
      if (this.coverImages.length > 0) {
        const coverImage = this.coverImages[0];
        if (coverImage.startsWith('data:')) {
          console.log('Uploading cover image...');
          const coverImageFile = this.base64ToFile(coverImage, 'cover-image.jpg');
          console.log('Cover image file created:', coverImageFile.name, 'Size:', coverImageFile.size);
          
          const result = await firstValueFrom(this.productService.uploadImage(this.productId!, coverImageFile, 'cover'));
          console.log('Cover image upload result:', result);
          
          // Update the form with the new URL
          if (result && result.url) {
            this.productForm.patchValue({ coverImageUrl: result.url });
          }
        }
      }

      // Upload thumbnail image if available and it's a base64
      if (this.thumbnailImage && this.thumbnailImage.startsWith('data:')) {
        console.log('Uploading thumbnail image...');
        const thumbnailFile = this.base64ToFile(this.thumbnailImage, 'thumbnail-image.jpg');
        console.log('Thumbnail file created:', thumbnailFile.name, 'Size:', thumbnailFile.size);
        
        const result = await firstValueFrom(this.productService.uploadImage(this.productId!, thumbnailFile, 'thumbnail'));
        console.log('Thumbnail upload result:', result);
        
        // Update the form with the new URL
        if (result && result.url) {
          this.productForm.patchValue({ thumbnailImageUrl: result.url });
        }
      }

      console.log('Image uploads completed successfully');
    } catch (error) {
      console.error('Failed to upload images:', error);
      // Don't fail the entire process if image upload fails
    }
  }

  // Product details methods
  addProductDetail(): void {
    if (this.newDetail.attribute && this.newDetail.value) {
      this.productDetails.push({ ...this.newDetail });
      this.newDetail = { attribute: '', value: '' };
      this.showDetailsForm = false;
    }
  }

  removeProductDetail(index: number): void {
    this.productDetails.splice(index, 1);
  }

  // Feature management
  addFeature(): void {
    if (this.newFeature.trim()) {
      this.productFeatures.push(this.newFeature.trim());
      this.newFeature = '';
    }
  }

  removeFeature(index: number): void {
    this.productFeatures.splice(index, 1);
  }
}
