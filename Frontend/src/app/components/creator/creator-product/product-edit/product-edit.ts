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
import { CATEGORIES, Category } from '../../../../core/data/categories';
import { TagService } from '../../../../core/services/tag.service';
import { TagDTO } from '../../../../core/models/product/tag.dto';
import { MessagingHttpService } from '../../../../core/services/messaging-http.service';
import Swal from 'sweetalert2';

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
  isDragOver: boolean = false;

  // Category and tag properties
  parentCategories: Category[] = [];
  subcategories: Category[] = [];
  selectedParentCategory: Category | null = null;
  hoveredCategory: number | null = null;

  // Tag-related properties
  availableTags: TagDTO[] = [];
  selectedTags: TagDTO[] = [];
  filteredTags: TagDTO[] = [];
  tagSearchInput: string = '';

  constructor(
    private fb: FormBuilder, 
    private productService: ProductService,
    private tagService: TagService,
    private route: ActivatedRoute,
    private router: Router,
    private messaging: MessagingHttpService,
  ) {}

  ngOnInit(): void {
    this.parentCategories = CATEGORIES.filter(c => !c.parentId);
    this.initializeForm();
    this.loadProduct();
  }

  private initializeForm(): void {
    this.productForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(200)]],
      description: ['', [Validators.maxLength(5000)]],
      price: [0, [Validators.required, Validators.min(0.01), Validators.max(1000000)]],
      currency: ['USD', [Validators.required, Validators.pattern(/^(USD|EGP)$/)]],
      coverImageUrl: [''],
      thumbnailImageUrl: [''],
      previewVideoUrl: [''],
      isPublic: [false], // Default to private; actual value loaded from product
      permalink: ['', [Validators.required, Validators.pattern(/^[a-z0-9-]+$/)]],
      // Enhanced product details
      compatibility: [''],
      license: [''],
      updates: [''],
      categoryId: [null, [Validators.required]],
      tagIds: [[]]
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
      coverImageUrl: this.product.coverImageUrl,
      thumbnailImageUrl: this.product.thumbnailImageUrl,
      previewVideoUrl: this.product.previewVideoUrl,
      isPublic: this.product.isPublic,
      permalink: this.product.permalink,
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

    // Populate selected tags
    if (this.product.tags) {
      this.selectedTags = this.product.tags;
    }

         // Populate images - only add to arrays if they are URLs (not base64)
     if (this.product.coverImageUrl && !this.product.coverImageUrl.startsWith('data:')) {
       this.coverImages = [this.product.coverImageUrl];
     }
     if (this.product.thumbnailImageUrl && !this.product.thumbnailImageUrl.startsWith('data:')) {
       this.thumbnailImage = this.product.thumbnailImageUrl;
     }

     // Populate existing files
     if (this.product.files && this.product.files.length > 0) {
       this.uploadedFiles = this.product.files.map(file => ({
         id: file.id,
         name: file.name,
         fileUrl: file.fileUrl,
         size: file.size
       }));
     }

         // Set selected parent category and subcategories
     if (this.product.category) {
       const parentCategory = CATEGORIES.find(c => c.id === this.product?.category.parentCategoryId);
       if (parentCategory) {
         this.selectedParentCategory = parentCategory;
         this.subcategories = CATEGORIES.filter(c => c.parentId === parentCategory.id);
       }
     }

    // Load available tags for the selected category
    this.loadAvailableTags();

    this.updateFormValidation();

    // If this is a private delivery product, lock the price from editing
    void this.lockPriceIfDeliveredPrivate();
  }

  private async lockPriceIfDeliveredPrivate(): Promise<void> {
    try {
      if (!this.productId || !this.product || this.product.isPublic) return;
      // Fetch conversations and their deliveries, then check if any delivery references this productId
      const convs = await firstValueFrom(this.messaging.getConversations(200, 0));
      const lists = await Promise.all((convs || []).map(c => this.messaging.getDeliveriesForConversation(c.id).toPromise().catch(() => [])));
      const allDeliveries: Array<{ productId: number }> = ([] as any[]).concat(...(lists as any));
      const hasDelivery = allDeliveries.some(d => d && d.productId === this.productId);
      if (hasDelivery) {
        const priceCtrl = this.productForm.get('price');
        const currencyCtrl = this.productForm.get('currency');
        if (priceCtrl && !priceCtrl.disabled) {
          priceCtrl.disable({ emitEvent: false });
        }
        if (currencyCtrl && !currencyCtrl.disabled) {
          currencyCtrl.disable({ emitEvent: false });
        }
      }
    } catch {
      // Non-blocking; if check fails, leave field as-is
    }
  }

  onSaveClick(): void {
    this.save.emit();
  }

  onNameChange(): void {
    const nameValue = this.productForm.get('name')?.value;
    // Generate URL and permalink from name like the old frontend
    if (nameValue) {
      const permalink = nameValue.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
      this.productForm.get('permalink')?.setValue(permalink);
    } else {
      this.productForm.get('permalink')?.setValue('');
    }
    // Trigger form validation update
    this.updateFormValidation();
  }

  async cancel(): Promise<void> {
    const result = await Swal.fire({
      icon: 'question',
      title: 'Cancel Editing?',
      text: 'Are you sure you want to cancel? All unsaved changes will be lost.',
      showCancelButton: true,
      confirmButtonColor: '#3b82f6',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, Cancel',
      cancelButtonText: 'Continue Editing'
    });

    if (result.isConfirmed) {
      this.router.navigate(['/dashboard']);
    }
  }

  async saveAndContinue(): Promise<void> {
    console.log('🚀 SaveAndContinue called!');
    
    // Mark all fields as touched to trigger validation display
    this.productForm.markAllAsTouched();
    
    if (this.productForm.invalid) {
      console.log('❌ Form is invalid, showing error');
      Swal.fire({
        icon: 'error',
        title: 'Validation Error',
        text: 'Please fill in all required fields correctly.',
        confirmButtonColor: '#3b82f6'
      });
      return;
    }
    
    this.isSubmitting = true;
    this.errorMessage = null;
    
    try {
      // First upload images to get proper URLs
      await this.uploadImages();
      
      // Include disabled controls (price/currency might be disabled for delivered private products)
      const formValue = this.productForm.getRawValue();
      
             // Create the product update DTO (preserve current visibility/status; do not force publish)
      const productDto: ProductUpdateRequestDTO = {
        id: this.productId!,
        name: formValue.name,
        description: formValue.description || '',
        price: Number(formValue.price),
        currency: formValue.currency,
        coverImageUrl: formValue.coverImageUrl,
        thumbnailImageUrl: formValue.thumbnailImageUrl,
        previewVideoUrl: formValue.previewVideoUrl && formValue.previewVideoUrl.trim() !== '' 
          ? formValue.previewVideoUrl 
          : null,
        isPublic: formValue.isPublic,
        permalink: formValue.permalink,
        // Enhanced product details
        features: this.productFeatures,
        compatibility: formValue.compatibility,
        license: formValue.license,
        updates: formValue.updates,
        categoryId: formValue.categoryId,
        tagIds: this.selectedTags.map(tag => tag.id).filter(id => id > 0),
        productCategory: this.product?.category || { id: 0, name: '', parentCategoryId: undefined },
        status: this.product?.status || 'draft'
      };

      console.log('📤 Sending Product Update DTO:', JSON.stringify(productDto, null, 2));

      this.productService.updateProduct(this.productId!, productDto).subscribe({
        next: async (updatedProduct) => {
          console.log('✅ Product updated successfully:', updatedProduct);
          this.product = updatedProduct;
          
          // Upload files if any
          if (this.productFiles.length > 0) {
            try {
              console.log(`📁 Uploading ${this.productFiles.length} files for product ${this.productId}`);
              await this.uploadFiles(this.productFiles);
              console.log('✅ All files uploaded successfully');
            } catch (fileError) {
              console.error('❌ File upload failed:', fileError);
              // Show warning but continue
              await Swal.fire({
                icon: 'warning',
                title: 'File Upload Failed',
                text: 'Product updated successfully, but some files failed to upload. You can add files later in the product editor.',
                confirmButtonColor: '#3b82f6'
              });
            }
          }
          
          this.isSubmitting = false;
          
          // Show success message with SweetAlert
          await Swal.fire({
            icon: 'success',
            title: 'Product Updated Successfully!',
            text: this.productFiles.length > 0 
              ? 'Your product has been updated with files and saved.'
              : 'Your product has been updated and saved.',
            confirmButtonColor: '#3b82f6',
            confirmButtonText: 'Continue'
          });
          
          // Navigate to content editing
          this.router.navigate(['/products', this.productId, 'edit', 'content']);
        },
        error: (error) => {
          console.log('❌ Product update failed:', error);
          console.log('❌ Error details:', {
            status: error.status,
            statusText: error.statusText,
            error: error.error,
            message: error.message,
            url: error.url
          });
          this.isSubmitting = false;
          Swal.fire({
            icon: 'error',
            title: 'Update Failed',
            text: 'Failed to update product: ' + (error.error?.message || error.message),
            confirmButtonColor: '#3b82f6'
          });
        }
      });
    } catch (err) {
      console.error('Error in saveAndContinue:', err);
      this.isSubmitting = false;
      Swal.fire({
        icon: 'error',
        title: 'Unexpected Error',
        text: 'An unexpected error occurred while updating the product.',
        confirmButtonColor: '#3b82f6'
      });
    }
  }

  private updateFormValidation(): void {
    const nameValid = this.productForm.get('name')?.value && this.productForm.get('name')?.valid;
    const priceValid = this.productForm.get('price')?.value > 0 && this.productForm.get('price')?.valid;
    const categoryValid = this.productForm.get('categoryId')?.value && this.productForm.get('categoryId')?.valid;
    const currencyValid = this.productForm.get('currency')?.valid;
    const permalinkValid = this.productForm.get('permalink')?.valid;
         
    this.isFormValid = nameValid && priceValid && categoryValid && currencyValid && permalinkValid;
  }

  // Tag management methods
  loadAvailableTags(): void {
    const categoryId = this.productForm.get('categoryId')?.value as number | null;
    if (categoryId) {
      this.tagService.getTagsForCategories([categoryId]).subscribe({
        next: (tags: TagDTO[]) => {
          this.availableTags = (tags || []).slice(0, 15);
          this.filteredTags = [...this.availableTags]; // Initialize filtered tags
        },
        error: (error: any) => {
          console.error('Failed to load tags:', error);
          this.availableTags = [];
          this.filteredTags = [];
        }
      });
    } else {
      this.availableTags = [];
      this.filteredTags = [];
    }
  }

  selectTag(tag: TagDTO): void {
    if (this.selectedTags.length < 5 && !this.selectedTags.some(t => t.id === tag.id)) {
      this.selectedTags.push(tag);
      // Update filtered tags to reflect the selection
      this.filterTags();
    }
  }

  removeTag(index: number): void {
    this.selectedTags.splice(index, 1);
    // Update filtered tags to reflect the removal
    this.filterTags();
  }

  isTagSelected(tagId: number): boolean {
    return this.selectedTags.some(t => t.id === tagId);
  }

  filterTags(): void {
    if (!this.tagSearchInput.trim()) {
      this.filteredTags = [...this.availableTags];
    } else {
      const searchTerm = this.tagSearchInput.toLowerCase().trim();
      this.filteredTags = this.availableTags.filter(tag => 
        tag.name && tag.name.toLowerCase().includes(searchTerm)
      );
    }
  }

  // Category management methods
  getCategoryIcon(categoryName: string): string {
    // Return icon class based on category name
    switch (categoryName.toLowerCase()) {
      case 'art':
        return 'fas fa-paint-brush';
      case 'music':
        return 'fas fa-music';
      case 'photography':
        return 'fas fa-camera';
      case 'software':
        return 'fas fa-code';
      case 'education':
        return 'fas fa-book';
      default:
        return 'fas fa-box-open';
    }
  }

  getCategoryDescription(categoryName: string): string {
    // Return a short description based on category name
    switch (categoryName.toLowerCase()) {
      case 'art':
        return 'Creative artworks and designs';
      case 'music':
        return 'Audio tracks, beats, and compositions';
      case 'photography':
        return 'Photos and visual content';
      case 'software':
        return 'Apps, plugins, and software tools';
      case 'education':
        return 'Courses, tutorials, and learning materials';
      default:
        return 'Various digital products';
    }
  }

  selectParentCategory(category: Category): void {
    this.selectedParentCategory = category;
    this.productForm.get('categoryId')?.setValue(category.id);
    this.subcategories = CATEGORIES.filter(c => c.parentId === category.id);
    // Refresh tags for selected category
    this.loadAvailableTags();
    // Trigger form validation update
    this.updateFormValidation();
  }

  selectSubcategory(categoryId: string | number | Category): void {
    let id: number;
    if (typeof categoryId === 'object') {
      id = categoryId.id;
    } else {
      id = typeof categoryId === 'string' ? parseInt(categoryId, 10) : categoryId;
    }
    this.productForm.get('categoryId')?.setValue(id);
    this.loadAvailableTags();
    // Trigger form validation update
    this.updateFormValidation();
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

    console.log('🖼️ Starting image upload for product ID:', this.productId);
    console.log('📸 Cover images available:', this.coverImages.length);
    console.log('🖼️ Thumbnail image available:', !!this.thumbnailImage);

    try {
      // Upload cover image if available and it's a base64 (not already a URL)
      if (this.coverImages.length > 0) {
        const coverImage = this.coverImages[0];
        if (coverImage.startsWith('data:')) {
          console.log('📤 Uploading cover image...');
          const coverImageFile = this.base64ToFile(coverImage, 'cover-image.jpg');
          console.log('📁 Cover image file created:', coverImageFile.name, 'Size:', coverImageFile.size);
          
          const result = await firstValueFrom(this.productService.uploadImage(this.productId!, coverImageFile, 'cover'));
          console.log('✅ Cover image upload result:', result);
          
          // The backend automatically updates the product with the image URL
          if (result && result.url) {
            console.log('✅ Product automatically updated with cover image URL:', result.url);
            this.productForm.patchValue({ coverImageUrl: result.url });
          }
        }
      }

      // Upload thumbnail image if available and it's a base64
      if (this.thumbnailImage && this.thumbnailImage.startsWith('data:')) {
        console.log('📤 Uploading thumbnail image...');
        const thumbnailFile = this.base64ToFile(this.thumbnailImage, 'thumbnail-image.jpg');
        console.log('📁 Thumbnail file created:', thumbnailFile.name, 'Size:', thumbnailFile.size);
        
        const result = await firstValueFrom(this.productService.uploadImage(this.productId!, thumbnailFile, 'thumbnail'));
        console.log('✅ Thumbnail upload result:', result);
        
        // The backend automatically updates the product with the image URL
        if (result && result.url) {
          console.log('✅ Product automatically updated with thumbnail image URL:', result.url);
          this.productForm.patchValue({ thumbnailImageUrl: result.url });
        }
      }

      console.log('✅ All images uploaded successfully');
    } catch (error) {
      console.error('❌ Error uploading images:', error);
      throw error;
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

  // File upload methods
  triggerFileUpload(): void {
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
    
    const files = event.dataTransfer?.files;
    if (files) {
      this.handleFiles(Array.from(files));
    }
  }

  onFileSelected(event: any): void {
    const files = event.target.files;
    if (files) {
      this.handleFiles(Array.from(files));
    }
  }

  private handleFiles(files: File[]): void {
    // Add files to the product files array
    this.productFiles.push(...files);
    
    // Convert files to FileDTO format for display (temporary)
    files.forEach(file => {
      this.uploadedFiles.push({
        id: Date.now() + Math.random(), // Generate temporary ID
        name: file.name,
        fileUrl: URL.createObjectURL(file),
        size: file.size
      });
    });
  }

  private async uploadFiles(files: File[]): Promise<void> {
    if (!this.productId) {
      console.error('❌ Cannot upload files: productId is not available');
      return;
    }

    this.isUploading = true;
    this.uploadProgress = 0;
    
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        console.log(`📤 Uploading file ${i + 1}/${files.length}: ${file.name}`);
        
        // Upload file to server
        const result = await firstValueFrom(this.productService.uploadFile(this.productId, file));
        console.log(`✅ File uploaded successfully: ${file.name}`, result);
        
        // Update progress
        this.uploadProgress = ((i + 1) / files.length) * 100;
        
        // Add uploaded file to the list
        if (result && result.length > 0) {
          this.uploadedFiles.push(...result);
        }
      }
      
      console.log('✅ All files uploaded successfully');
    } catch (error) {
      console.error('❌ Error uploading files:', error);
      throw error;
    } finally {
      this.isUploading = false;
      this.uploadProgress = 0;
    }
  }

  removeFile(index: number): void {
    // Remove from uploadedFiles array
    this.uploadedFiles.splice(index, 1);
    
    // Also remove from productFiles array to keep them in sync
    if (index < this.productFiles.length) {
      this.productFiles.splice(index, 1);
    }
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
