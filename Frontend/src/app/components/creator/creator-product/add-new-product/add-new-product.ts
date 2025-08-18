import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
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
import { QuillService } from '../../../../core/services/quill.service';
import Swal from 'sweetalert2';

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
export class AddNewProduct implements OnInit, AfterViewInit, OnDestroy {
  productForm!: FormGroup;
  productId?: number;
  isSubmitting = false;
  successMessage: string | null = null;
  errorMessage: string | null = null;
  loading = false;
  
  // Tab management
  currentTab: 'product' | 'content' = 'product';
  
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
  isDragOver: boolean = false;

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

  // Quill editor
  private quillEditor: any = null;
  contentPreview: string = '';

  // Form validation
  isFormValid: boolean = true;

  constructor(
    private fb: FormBuilder,
    private productService: ProductService,
    private tagService: TagService,
    private route: ActivatedRoute,
    private messaging: MessagingHttpService,
    private router: Router,
    private quillService: QuillService,
  ) {}

  ngOnInit(): void {
    this.parentCategories = CATEGORIES.filter(c => !c.parentId);
    this.initializeForm();
    
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
    
    // Initial form validation check
    this.updateFormValidation();
    
        // Watch form validity
    this.productForm.statusChanges.subscribe(() => {
      this.updateFormValidation();
    });
  }

  private updateFormValidation(): void {
    const nameValid = this.productForm.get('name')?.value && this.productForm.get('name')?.valid;
    const priceValid = this.productForm.get('price')?.value > 0 && this.productForm.get('price')?.valid;
    const categoryValid = this.productForm.get('categoryId')?.value && this.productForm.get('categoryId')?.valid;
    const currencyValid = this.productForm.get('currency')?.valid;
    const permalinkValid = this.productForm.get('permalink')?.valid;
         
     this.isFormValid = nameValid && priceValid && categoryValid && currencyValid && permalinkValid;
    
    // Debug logging
    console.log('🔍 Form Validation Debug:', {
      name: this.productForm.get('name')?.value,
      nameValid,
      price: this.productForm.get('price')?.value,
      priceValid,
      categoryId: this.productForm.get('categoryId')?.value,
      categoryValid,
      currency: this.productForm.get('currency')?.value,
      currencyValid,
      permalink: this.productForm.get('permalink')?.value,
      permalinkValid,
      isFormValid: this.isFormValid,
      formValid: this.productForm.valid,
      formErrors: this.productForm.errors,
      nameErrors: this.productForm.get('name')?.errors,
      priceErrors: this.productForm.get('price')?.errors,
      categoryErrors: this.productForm.get('categoryId')?.errors,
      currencyErrors: this.productForm.get('currency')?.errors,
      permalinkErrors: this.productForm.get('permalink')?.errors
    });
    
    // More detailed validation logging
    console.log('🔍 Detailed Validation Issues:');
    if (!nameValid) {
      const nameErrors = this.productForm.get('name')?.errors;
      console.log('❌ Name validation failed:', nameErrors);
      console.log('❌ Name value:', this.productForm.get('name')?.value);
      console.log('❌ Name touched:', this.productForm.get('name')?.touched);
    }
    if (!priceValid) {
      const priceErrors = this.productForm.get('price')?.errors;
      console.log('❌ Price validation failed:', priceErrors);
      console.log('❌ Price value:', this.productForm.get('price')?.value);
      console.log('❌ Price touched:', this.productForm.get('price')?.touched);
    }
    if (!categoryValid) {
      const categoryErrors = this.productForm.get('categoryId')?.errors;
      console.log('❌ Category validation failed:', categoryErrors);
      console.log('❌ Category value:', this.productForm.get('categoryId')?.value);
      console.log('❌ Category touched:', this.productForm.get('categoryId')?.touched);
    }
    if (!currencyValid) {
      const currencyErrors = this.productForm.get('currency')?.errors;
      console.log('❌ Currency validation failed:', currencyErrors);
      console.log('❌ Currency value:', this.productForm.get('currency')?.value);
    }
    if (!permalinkValid) {
      const permalinkErrors = this.productForm.get('permalink')?.errors;
      console.log('❌ Permalink validation failed:', permalinkErrors);
      console.log('❌ Permalink value:', this.productForm.get('permalink')?.value);
      console.log('❌ Permalink touched:', this.productForm.get('permalink')?.touched);
    }
    
  }

  ngAfterViewInit(): void {
    // Initialize Quill editor when content tab is accessed
    this.initializeQuillEditor();
  }

  ngOnDestroy(): void {
    // Clean up Quill editor
    if (this.quillEditor) {
      this.quillService.destroy();
    }
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
             isPublic: [true], // Default to published
      permalink: ['', [Validators.required, Validators.pattern(/^[a-z0-9-]+$/)]],
      // Enhanced product details
      compatibility: [''],
      license: [''],
      updates: [''],
      categoryId: [null, [Validators.required]],
      tagIds: [[]]
    });
  }

  private initializeQuillEditor(): void {
    // Initialize Quill editor for content tab
    setTimeout(() => {
      try {
        const editorElement = document.querySelector('#content-editor');
        if (editorElement) {
          this.quillEditor = this.quillService.initializeQuill('#content-editor', 'Start writing your product content here...', 'content');
          
          // Watch for content changes to update preview
          if (this.quillEditor) {
            this.quillEditor.on('text-change', () => {
              this.contentPreview = this.quillService.getContent();
            });
          }
        }
      } catch (error) {
        console.error('Failed to initialize Quill editor:', error);
      }
    }, 200);
  }

  // Tab management
  setTab(tab: 'product' | 'content'): void {
    this.currentTab = tab;
    
    // Initialize Quill editor when switching to content tab
    if (tab === 'content' && !this.quillEditor) {
      setTimeout(() => {
        this.initializeQuillEditor();
      }, 100);
    }
  }

  // Tag management methods
  loadAvailableTags(): void {
    const categoryId = this.productForm.get('categoryId')?.value as number | null;
    if (categoryId) {
      this.tagService.getTagsForCategories([categoryId]).subscribe({
        next: (tags: TagDTO[]) => {
          this.availableTags = (tags || []).slice(0, 15);
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
      this.productForm.get('permalink')?.setValue(permalink);
    } else {
      this.productForm.get('permalink')?.setValue('');
    }
    // Trigger form validation update
    this.updateFormValidation();
  }

  // --- File upload methods ---
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

  // Tag management methods
  addTag(): void {
    if (this.newTagInput.trim() && this.selectedTags.length < 5) {
      const newTag: TagDTO = {
        id: -Date.now(), // Temporary negative ID for new tags
        name: this.newTagInput.trim()
      };
      this.selectedTags.push(newTag);
      this.newTagInput = '';
    }
  }

  selectTag(tag: TagDTO): void {
    if (this.selectedTags.length < 5 && !this.selectedTags.some(t => t.id === tag.id)) {
      this.selectedTags.push(tag);
    }
  }

  isTagSelected(tagId: number): boolean {
    return this.selectedTags.some(t => t.id === tagId);
  }

    // Main save and publish method
  async saveAndPublish(): Promise<void> {
    console.log('🚀 SaveAndPublish called!');
    
    // Mark all fields as touched to trigger validation display
    this.productForm.markAllAsTouched();
    
    console.log('📋 Form State:', {
      invalid: this.productForm.invalid,
      valid: this.productForm.valid,
      value: this.productForm.value,
      errors: this.productForm.errors,
      isFormValid: this.isFormValid
    });
    
    // Log individual field values and states
    console.log('📋 Individual Field Values:', {
      name: this.productForm.get('name')?.value,
      nameValid: this.productForm.get('name')?.valid,
      nameTouched: this.productForm.get('name')?.touched,
      price: this.productForm.get('price')?.value,
      priceValid: this.productForm.get('price')?.valid,
      priceTouched: this.productForm.get('price')?.touched,
      categoryId: this.productForm.get('categoryId')?.value,
      categoryValid: this.productForm.get('categoryId')?.valid,
      categoryTouched: this.productForm.get('categoryId')?.touched,
      currency: this.productForm.get('currency')?.value,
      currencyValid: this.productForm.get('currency')?.valid,
      permalink: this.productForm.get('permalink')?.value,
      permalinkValid: this.productForm.get('permalink')?.valid,
      permalinkTouched: this.productForm.get('permalink')?.touched
    });
    
    // Log all form controls and their validation status
    console.log('🔍 All Form Controls Validation:');
    Object.keys(this.productForm.controls).forEach(controlName => {
      const control = this.productForm.get(controlName);
      console.log(`  ${controlName}:`, {
        value: control?.value,
        valid: control?.valid,
        invalid: control?.invalid,
        errors: control?.errors,
        touched: control?.touched,
        dirty: control?.dirty
      });
    });
    
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
      const formValue = this.productForm.value;
      
      // Create the product DTO without images first
      const productDto: ProductCreateRequestDTO = {
        name: formValue.name,
        description: formValue.description || '',
        price: parseFloat(formValue.price),
        currency: formValue.currency,
        coverImageUrl: undefined, // Will be set after upload
        thumbnailImageUrl: undefined, // Will be set after upload
        previewVideoUrl: formValue.previewVideoUrl && formValue.previewVideoUrl.trim() !== '' 
          ? formValue.previewVideoUrl 
          : null,
        isPublic: this.privateDeliveryMode ? false : true, // Always publish unless private delivery
        permalink: formValue.permalink,
        features: this.productFeatures,
        compatibility: formValue.compatibility,
        license: formValue.license,
        updates: formValue.updates,
        categoryId: formValue.categoryId,
        tagIds: this.selectedTags.map(tag => tag.id).filter(id => id > 0)
      };

      console.log('📤 Sending Product DTO:', JSON.stringify(productDto, null, 2));
      console.log('🔗 API Call to createProduct...');

      this.productService.createProduct(productDto).subscribe({
        next: async (createdProduct) => {
          console.log('✅ Product created successfully:', createdProduct);
          this.productId = createdProduct.id;
          
          // Upload images if available
          try {
            await this.uploadImages(createdProduct.id);
          } catch (imageError) {
            console.error('❌ Image upload failed:', imageError);
            // Continue with success message even if image upload fails
          }

          // Upload files if any
          if (this.productFiles.length > 0) {
            try {
              console.log(`📁 Uploading ${this.productFiles.length} files for product ${createdProduct.id}`);
              await this.uploadFiles(this.productFiles);
              console.log('✅ All files uploaded successfully');
            } catch (fileError) {
              console.error('❌ File upload failed:', fileError);
              // Show warning but continue
              await Swal.fire({
                icon: 'warning',
                title: 'File Upload Failed',
                text: 'Product created successfully, but some files failed to upload. You can add files later in the product editor.',
                confirmButtonColor: '#3b82f6'
              });
            }
          }

          this.isSubmitting = false;

          // Show success message with SweetAlert
          await Swal.fire({
            icon: 'success',
            title: 'Product Created Successfully!',
            text: this.productFiles.length > 0 
              ? 'Your product has been created with files and is now available.'
              : 'Your product has been created and is now available.',
            confirmButtonColor: '#3b82f6',
            confirmButtonText: 'Continue'
          });

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
              return; // Skip navigation to dashboard for private delivery flow
            } catch (err: any) {
              Swal.fire({
                icon: 'warning',
                title: 'Delivery Failed',
                text: 'Product created but failed to deliver: ' + (err?.message || 'Unknown error'),
                confirmButtonColor: '#3b82f6'
              });
            }
          }

          // Navigate to the product page or dashboard
          this.router.navigate(['/dashboard']);
        },
        error: (error) => {
          console.log('❌ Product creation failed:', error);
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
            title: 'Creation Failed',
            text: 'Failed to create product: ' + (error.error?.message || error.message),
            confirmButtonColor: '#3b82f6'
          });
        }
      });
    } catch (err) {
      console.error('Error in saveAndPublish:', err);
      this.isSubmitting = false;
      Swal.fire({
        icon: 'error',
        title: 'Unexpected Error',
        text: 'An unexpected error occurred while creating the product.',
        confirmButtonColor: '#3b82f6'
      });
    }
  }

  async cancel(): Promise<void> {
    const result = await Swal.fire({
      icon: 'question',
      title: 'Cancel Creation?',
      text: 'Are you sure you want to cancel? All unsaved changes will be lost.',
      showCancelButton: true,
      confirmButtonColor: '#3b82f6',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, Cancel',
      cancelButtonText: 'Continue Editing'
    });

    if (result.isConfirmed) {
      this.productForm.reset();
      this.productId = undefined;
      this.successMessage = null;
      this.errorMessage = null;
      this.selectedTags = [];
      this.uploadedFiles = [];
      this.productFiles = [];
      this.selectedParentCategory = null;
      this.subcategories = [];
      this.coverImages = [];
      this.thumbnailImage = null;
      this.productFeatures = [];
      this.contentPreview = '';
      
      // Reset Quill editor
      if (this.quillEditor) {
        this.quillService.setContent('');
      }

      // Navigate back to dashboard
      this.router.navigate(['/dashboard']);
    }
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

  // Image upload methods
  private async uploadImages(productId: number): Promise<void> {
    console.log('🖼️ Starting image upload for product ID:', productId);
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
          
          const result = await firstValueFrom(this.productService.uploadImage(productId, coverImageFile, 'cover'));
          console.log('✅ Cover image upload result:', result);
          
          // The backend automatically updates the product with the image URL
          if (result && result.url) {
            console.log('✅ Product automatically updated with cover image URL:', result.url);
          }
        }
      }

      // Upload thumbnail image if available and it's a base64
      if (this.thumbnailImage && this.thumbnailImage.startsWith('data:')) {
        console.log('📤 Uploading thumbnail image...');
        const thumbnailImageFile = this.base64ToFile(this.thumbnailImage, 'thumbnail-image.jpg');
        console.log('📁 Thumbnail image file created:', thumbnailImageFile.name, 'Size:', thumbnailImageFile.size);
        
        const result = await firstValueFrom(this.productService.uploadImage(productId, thumbnailImageFile, 'thumbnail'));
        console.log('✅ Thumbnail image upload result:', result);
        
        // The backend automatically updates the product with the image URL
        if (result && result.url) {
          console.log('✅ Product automatically updated with thumbnail image URL:', result.url);
        }
      }

      console.log('✅ All images uploaded successfully');
    } catch (error) {
      console.error('❌ Error uploading images:', error);
      throw error;
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

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

