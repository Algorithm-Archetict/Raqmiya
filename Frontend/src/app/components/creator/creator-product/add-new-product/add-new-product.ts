import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { DashboardSidebar } from '../../../dashboard-sidebar/dashboard-sidebar';
import { ProductDetailDTO } from '../../../../core/models/product/product-detail.dto';
import { ProductCreateRequestDTO } from '../../../../core/models/product/product-create-request.dto';
import { ProductService } from '../../../../core/services/product.service';
import { ProductUpdateRequestDTO } from '../../../../core/models/product/product-update-request.dto';
import { FileDTO } from '../../../../core/models/product/file.dto';
import { TagService } from '../../../../core/services/tag.service';
import { MessagingHttpService } from '../../../../core/services/messaging-http.service';
import { TagDTO } from '../../../../core/models/product/tag.dto';
import { CATEGORIES, Category } from '../../../../core/data/categories';

interface ProductDetail {
  attribute: string;
  value: string;
}

@Component({
  selector: 'app-add-new-product',
  imports: [
    CommonModule,
            RouterModule,
            FormsModule,
            ReactiveFormsModule,
            DashboardSidebar, 
          ],
  templateUrl: './add-new-product.html',
  styleUrls: ['./add-new-product.css']
})
export class AddNewProduct implements OnInit {
  productForm!: FormGroup;
  currentStep: 'create' | 'customize' | 'content' = 'create';
  productId?: number;
  isSubmitting = false;
  successMessage: string | null = null;
  errorMessage: string | null = null;
  
  // Additional properties for the template
  currency: string = 'USD';
  name: string = '';
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

  // --- File upload properties ---
  productFiles: File[] = [];
  uploadedFiles: FileDTO[] = [];
  isUploading: boolean = false;
  uploadProgress: number = 0;

  parentCategories: Category[] = [];
  subcategories: Category[] = [];
  selectedParentCategory: Category | null = null;
  hoveredCategory: number | null = null;

  // Tag-related properties
  availableTags: TagDTO[] = [];
  selectedTags: TagDTO[] = [];
  newTagInput: string = '';

  // Private Delivery Mode state
  privateDeliveryMode = false;
  privateDeliveryConversationId: string | null = null;
  privateDeliveryServiceRequestId: string | null = null;

  constructor(
    private fb: FormBuilder,
    private productService: ProductService,
    private tagService: TagService,
    private route: ActivatedRoute,
    private messaging: MessagingHttpService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.parentCategories = CATEGORIES.filter(c => !c.parentId);
    this.productForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      description: [''],
      price: [0, [Validators.required, Validators.min(0.01)]],
      currency: ['USD', [Validators.required]],
      categoryId: [null, Validators.required],
      permalink: ['', [Validators.required, Validators.pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)]],
      isPublic: [true],
      url: [''],
      summary: [''],
      content: [''],
      compatibility: [''],
      license: [''],
      updates: ['']
    });
    
    // Detect private delivery mode via query params
    this.route.queryParamMap.subscribe(params => {
      this.privateDeliveryMode = params.get('privateDelivery') === '1';
      this.privateDeliveryConversationId = params.get('conversationId');
      this.privateDeliveryServiceRequestId = params.get('serviceRequestId');
      if (this.privateDeliveryMode) {
        // Force private products for deliveries
        this.productForm.get('isPublic')?.setValue(false);
      }
    });

    // Load available tags only if category is pre-selected
    this.loadAvailableTags();
  }

  // Tag management methods
  loadAvailableTags(): void {
    const categoryId = this.productForm.get('categoryId')?.value as number | null;
    if (categoryId) {
      this.tagService.getTagsForCategories([categoryId]).subscribe({
        next: (tags: TagDTO[]) => {
          this.availableTags = (tags || []).slice(0, 10);
        },
        error: (error: any) => {
          console.error('Failed to load tags:', error);
          this.availableTags = [];
        }
      });
    } else {
      this.availableTags = [];
    }
  }

  getFilteredAvailableTags(): TagDTO[] {
    return this.availableTags.filter(tag => 
      !this.selectedTags.some(selected => selected.id === tag.id)
    );
  }

  selectSuggestedTag(tag: TagDTO): void {
    if (this.selectedTags.length < 5 && !this.selectedTags.some(selected => selected.id === tag.id)) {
      this.selectedTags.push(tag);
    }
  }

  addCustomTag(event?: Event): void {
    if (event) {
      event.preventDefault();
    }
    
    const tagName = this.newTagInput.trim();
    if (tagName && this.selectedTags.length < 5) {
      // Check if tag already exists in available tags
      const existingTag = this.availableTags.find(tag => 
        tag.name && tag.name.toLowerCase() === tagName.toLowerCase()
      );
      
      if (existingTag) {
        // Use existing tag
        this.selectSuggestedTag(existingTag);
      } else {
        // Create new tag (for now, just add it locally - backend will handle creation)
        const newTag: TagDTO = {
          id: 0, // Temporary ID, backend will assign real ID
          name: tagName
        };
        this.selectedTags.push(newTag);
      }
      
      this.newTagInput = '';
    }
  }

  onTagInputChange(event: any): void {
    this.newTagInput = event.target.value;
  }

  removeTag(index: number): void {
    this.selectedTags.splice(index, 1);
  }

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

  get isCreateStepValid(): boolean {
    return !!this.productForm.get('name')?.valid &&
           !!this.productForm.get('price')?.valid &&
           !!this.productForm.get('permalink')?.valid;
  }

  get isCustomizeStepValid(): boolean {
    return !!this.productForm.get('description')?.valid && this.productForm.get('isPublic') !== null;
  }

  selectParentCategory(category: Category): void {
    this.selectedParentCategory = category;
    this.productForm.get('categoryId')?.setValue(category.id);
    this.subcategories = CATEGORIES.filter(c => c.parentId === category.id);
    // Refresh tags for selected category
    this.loadAvailableTags();
  }

  selectSubcategory(categoryId: string | number): void {
    const id = typeof categoryId === 'string' ? parseInt(categoryId, 10) : categoryId;
    this.productForm.get('categoryId')?.setValue(id);
    this.loadAvailableTags();
  }

  onNameChange(): void {
    const nameValue = this.productForm.get('name')?.value;
    this.name = nameValue || '';
    // Generate URL and permalink from name like the old frontend
    if (nameValue) {
      const permalink = nameValue.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
      this.productForm.get('url')?.setValue(`${permalink}.raqmiya.com`);
      this.productForm.get('permalink')?.setValue(permalink);
    } else {
      this.productForm.get('url')?.setValue('');
      this.productForm.get('permalink')?.setValue('');
    }
  }

  nextToCustomize(): void {
    if (this.productForm.valid) {
      this.currentStep = 'customize';
    }
  }

  goToCustomize(): void {
    this.currentStep = 'customize';
  }

  goToContent(): void {
    this.currentStep = 'content';
  }

  saveAndContinue(): void {
    if (this.productForm.valid) {
      this.isSubmitting = true;
      this.errorMessage = null;
      
      const formValue = this.productForm.value;
      
      // Create the product DTO with all required fields (without image data)
      const productDto: ProductCreateRequestDTO = {
        name: formValue.name,
        description: formValue.description || '',
        price: parseFloat(formValue.price),
        currency: formValue.currency,
        // productType: formValue.productType,
        // Don't send image data in initial creation - will upload separately
        coverImageUrl: undefined,
        thumbnailImageUrl: undefined,
        previewVideoUrl: formValue.previewVideoUrl,
        // Ensure private when in private delivery mode
        isPublic: this.privateDeliveryMode ? false : formValue.isPublic,
        permalink: formValue.permalink,
        // NEW: Enhanced product details
        features: this.productFeatures,
        compatibility: formValue.compatibility,
        license: formValue.license,
        updates: formValue.updates,
        categoryId: formValue.categoryId, // Changed to single categoryId
        tagIds: this.selectedTags.map(tag => tag.id).filter(id => id > 0) // Only include tags with real IDs
      };

      this.productService.createProduct(productDto).subscribe({
        next: async (createdProduct) => {
          this.productId = createdProduct.id;
          // Navigate to Content step so creator can upload files immediately
          this.currentStep = 'content';
          this.isSubmitting = false;
          this.successMessage = 'Product created successfully!';

          // If in private delivery mode, immediately deliver this product to the conversation
          if (this.privateDeliveryMode && this.privateDeliveryConversationId) {
            try {
              const price = parseFloat(formValue.price);
              const currency = formValue.currency;
              await this.messaging.deliverProduct(this.privateDeliveryConversationId, {
                serviceRequestId: this.privateDeliveryServiceRequestId || undefined,
                productId: createdProduct.id,
                price,
                currency,
              }).toPromise();
              // Navigate to messages or deliveries after successful delivery
              await this.router.navigate(['/messages'], { queryParams: { conversationId: this.privateDeliveryConversationId } });
              return; // Skip image uploads for private delivery flow
            } catch (err: any) {
              this.errorMessage = 'Product created but failed to deliver: ' + (err?.message || 'Unknown error');
            }
          }

          // Optional post-create image uploads can still be performed
          // but do not block moving to Content step
          this.uploadImagesAfterCreation();
        },
        error: (error) => {
          this.errorMessage = 'Failed to create product: ' + (error.error?.message || error.message);
          this.isSubmitting = false;
        }
      });
    }
  }

  // New method to upload images after product creation
  private async uploadImagesAfterCreation(): Promise<void> {
    if (!this.productId) {
      console.warn('No product ID available for image upload');
      return;
    }

    console.log('Starting image upload for product ID:', this.productId);
    console.log('Cover images available:', this.coverImages.length);
    console.log('Thumbnail image available:', !!this.thumbnailImage);

    try {
      // Upload cover image if available
      if (this.coverImages.length > 0) {
        console.log('Uploading cover image...');
        // Convert base64 to file and upload
        const coverImageFile = this.base64ToFile(this.coverImages[0], 'cover-image.jpg');
        console.log('Cover image file created:', coverImageFile.name, 'Size:', coverImageFile.size);
        
        const result = await firstValueFrom(this.productService.uploadImage(this.productId, coverImageFile, 'cover'));
        console.log('Cover image upload result:', result);
      }

      // Upload thumbnail image if available
      if (this.thumbnailImage) {
        console.log('Uploading thumbnail image...');
        const thumbnailFile = this.base64ToFile(this.thumbnailImage, 'thumbnail-image.jpg');
        console.log('Thumbnail file created:', thumbnailFile.name, 'Size:', thumbnailFile.size);
        
        const result = await firstValueFrom(this.productService.uploadImage(this.productId, thumbnailFile, 'thumbnail'));
        console.log('Thumbnail upload result:', result);
      }

      console.log('Image uploads completed successfully');
    } catch (error) {
      console.error('Failed to upload images:', error);
      // Don't fail the entire process if image upload fails
    }
  }

  // Helper method to convert base64 to File object
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

  // --- File upload methods ---
  onFileSelected(event: any): void {
    const files: FileList = event.target.files;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (this.validateFile(file)) {
        this.productFiles.push(file);
      }
    }
  }

  validateFile(file: File): boolean {
    const allowedTypes = [
      'application/pdf',
      'application/zip',
      'image/jpeg',
      'image/png',
      'video/mp4'
    ];
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (!allowedTypes.includes(file.type)) {
      this.errorMessage = 'File type not allowed: ' + file.name;
      return false;
    }
    if (file.size > maxSize) {
      this.errorMessage = 'File too large (max 50MB): ' + file.name;
      return false;
    }
    return true;
  }

  removeFile(index: number): void {
    this.productFiles.splice(index, 1);
  }

  async uploadFiles(productId: number): Promise<FileDTO[]> {
    this.isUploading = true;
    this.uploadProgress = 0;
    this.uploadedFiles = [];
    let uploaded: FileDTO[] = [];
    
    console.log('Starting file upload for product ID:', productId);
    console.log('Files to upload:', this.productFiles.length);
    
    for (let i = 0; i < this.productFiles.length; i++) {
      const file = this.productFiles[i];
      try {
        console.log('Uploading file:', file.name, 'Size:', file.size);
        const result = await firstValueFrom(this.productService.uploadFile(productId, file));
        console.log('File upload result:', result);
        
        if (Array.isArray(result)) {
          uploaded = uploaded.concat(result);
        } else if (result) {
          uploaded.push(result);
        }
        this.uploadProgress = Math.round(((i + 1) / this.productFiles.length) * 100);
      } catch (err) {
        console.error('Failed to upload file:', file.name, err);
        this.errorMessage = 'Failed to upload file: ' + file.name;
        this.isUploading = false;
        throw err;
      }
    }
    this.isUploading = false;
    this.uploadedFiles = uploaded;
    console.log('File upload completed. Total uploaded:', uploaded.length);
    return uploaded;
  }

  // --- Update saveAndPublish to upload files before publishing ---
  async saveAndPublish(): Promise<void> {
    if (!this.productId || this.productForm.invalid) return;
    this.isSubmitting = true;
    this.errorMessage = null;
    
    console.log('Starting saveAndPublish for product ID:', this.productId);
    console.log('Files to upload during publish:', this.productFiles.length);
    
    try {
      // First upload files if any
      if (this.productFiles.length > 0) {
        console.log('Uploading files during publish...');
        await this.uploadFiles(this.productId);
        console.log('Files uploaded successfully during publish');
      } else {
        console.log('No files to upload during publish');
      }
      
      // Then update the product with all fields (without image data)
      const formValue = this.productForm.value;
      const updateDto: ProductUpdateRequestDTO = {
        id: this.productId,
        name: formValue.name,
        description: formValue.description || '',
        price: parseFloat(formValue.price),
        currency: formValue.currency,
        productCategory: formValue.productCategory,
        // Don't include image URLs - they are uploaded separately and should not be overwritten
        previewVideoUrl: formValue.previewVideoUrl,
        isPublic: true, // Set to public when publishing
        permalink: formValue.permalink,
        // NEW: Enhanced product details
        features: this.productFeatures,
        compatibility: formValue.compatibility,
        license: formValue.license,
        updates: formValue.updates,
        categoryId: formValue.categoryId, // Changed to single categoryId
        tagIds: this.selectedTags.map(tag => tag.id).filter(id => id > 0), // Only include tags with real IDs
        status: 'published' // Set status to published
      };
      
      console.log('Updating product with data:', updateDto);
      
      this.productService.updateProduct(this.productId, updateDto).subscribe({
        next: () => {
          console.log('Product published successfully!');
          this.successMessage = 'Product published successfully!';
          this.isSubmitting = false;
        },
        error: (error) => {
          console.error('Failed to publish product:', error);
          this.errorMessage = 'Failed to publish product: ' + (error.error?.message || error.message);
          this.isSubmitting = false;
        }
      });
    } catch (err) {
      console.error('Error in saveAndPublish:', err);
      this.isSubmitting = false;
      this.errorMessage = 'Failed to upload files or publish product.';
    }
  }

  cancel(): void {
    this.currentStep = 'create';
    this.productForm.reset();
    this.productId = undefined;
    this.successMessage = null;
    this.errorMessage = null;
  }

  // Image upload methods
  uploadCoverImage(event: any): void {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.coverImages.push(e.target.result);
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
  }

  uploadThumbnail(event: any): void {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.thumbnailImage = e.target.result;
      };
      reader.readAsDataURL(file);
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

  // Feature management methods
  addFeature(): void {
    if (this.newFeature && this.newFeature.trim()) {
      this.productFeatures.push(this.newFeature.trim());
      this.newFeature = '';
    }
  }

  removeFeature(index: number): void {
    this.productFeatures.splice(index, 1);
  }
}

