import { Component, OnInit, AfterViewInit, OnDestroy, HostListener } from '@angular/core';
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
  filteredTags: TagDTO[] = [];
  tagSearchInput: string = '';

  // Private Delivery Mode state
  privateDeliveryMode = false;
  privateDeliveryConversationId: string | null = null;
  privateDeliveryServiceRequestId: string | null = null;
  // Auto-create flow disabled (was previously used for private delivery). Keeping flags for future use if re-enabled.
  private autoCreateRequested = false;
  private autoCreateTriggered = false;

  // Quill editor
  private quillEditor: any = null;
  contentPreview: string = '';

  // Form validation
  isFormValid: boolean = true;
  fieldErrors: { [key: string]: string } = {};

  // Heading dropdown UI state
  headingMenuOpen: boolean = false;
  private headingHoverTimer: any = null;

  // Keep menu open on hover and close with a slight delay to avoid flicker
  onHeadingMenuEnter(): void {
    if (this.headingHoverTimer) {
      clearTimeout(this.headingHoverTimer);
      this.headingHoverTimer = null;
    }
    this.headingMenuOpen = true;
  }

  private async prefillAndLockBudgetFromServiceRequest(): Promise<void> {
    try {
      if (!this.privateDeliveryConversationId || !this.privateDeliveryServiceRequestId) return;
      // Fetch creator service requests and find the one we are delivering for
      const list = await firstValueFrom(this.messaging.getCreatorServiceRequests(['Pending','AcceptedByCreator','ConfirmedByCustomer'], 100, 0));
      const it = (list || []).find(x => x.id === this.privateDeliveryServiceRequestId);
      if (!it) return;
      const priceCtrl = this.productForm.get('price');
      const currencyCtrl = this.productForm.get('currency');
      if (it.proposedBudget != null && priceCtrl) {
        priceCtrl.setValue(it.proposedBudget);
        priceCtrl.disable({ emitEvent: false });
      }
      if (it.currency && currencyCtrl) {
        currencyCtrl.setValue(it.currency);
        currencyCtrl.disable({ emitEvent: false });
      }
    } catch (e) {
      // Non-blocking; proceed without locking if fetch fails
      console.warn('Could not prefill budget from service request', e);
    }
  }

  onHeadingMenuLeave(): void {
    if (this.headingHoverTimer) {
      clearTimeout(this.headingHoverTimer);
    }
    this.headingHoverTimer = setTimeout(() => {
      this.headingMenuOpen = false;
    }, 150);
  }

  onHeadingToggleClick(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.headingMenuOpen = !this.headingMenuOpen;
  }

  // Close when clicking anywhere else
  @HostListener('document:click', ['$event'])
  onDocumentClick(_: MouseEvent): void {
    if (this.headingMenuOpen) {
      this.headingMenuOpen = false;
    }
  }

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
      // Explicitly ignore autoCreate param to prevent unintended auto-publish
      this.autoCreateRequested = false;
      if (this.privateDeliveryMode) {
        // Force private products for deliveries
        this.productForm.get('isPublic')?.setValue(false);
        // Load agreed budget and lock price/currency
        this.prefillAndLockBudgetFromServiceRequest();
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

  // Auto-create disabled
  private tryAutoCreate(): void { /* intentionally no-op */ }

  private updateFormValidation(): void {
    const nameCtrl = this.productForm.get('name');
    const descCtrl = this.productForm.get('description');
    const priceCtrl = this.productForm.get('price');
    const categoryCtrl = this.productForm.get('categoryId');
    const currencyCtrl = this.productForm.get('currency');
    const permalinkCtrl = this.productForm.get('permalink');
    const tagsCtrl = this.productForm.get('tagIds');

    const nameValid = !!nameCtrl?.value && !!nameCtrl?.valid;
    const descriptionValid = !!descCtrl?.value && !!descCtrl?.valid;
    const priceValid = priceCtrl?.disabled ? true : ((priceCtrl?.value > 0) && !!priceCtrl?.valid);
    const categoryValid = !!categoryCtrl?.value && !!categoryCtrl?.valid;
    const currencyValid = currencyCtrl?.disabled ? true : !!currencyCtrl?.valid;
    const permalinkValid = !!permalinkCtrl?.valid;
    const tagsValid = (!!tagsCtrl?.valid) && (this.selectedTags.length > 0);
         
     this.isFormValid = nameValid && descriptionValid && priceValid && categoryValid && currencyValid && permalinkValid && tagsValid;
    
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
      descriptionValid,
      tagsCount: this.selectedTags.length,
      tagsValid,
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
      name: ['', [
        Validators.required, 
        Validators.minLength(3), 
        Validators.maxLength(200),
        Validators.pattern(/^[a-zA-Z0-9\s\-_]+$/)
      ]],
      description: ['', [
        Validators.required,
        Validators.minLength(10), 
        Validators.maxLength(5000)
      ]],
      price: [0, [
        Validators.required, 
        Validators.min(0.01), 
        Validators.max(1000000),
        Validators.pattern(/^\d+(\.\d{1,2})?$/)
      ]],
      currency: ['USD', [
        Validators.required, 
        Validators.pattern(/^(USD|EGP)$/)
      ]],
      
      // Optional fields (nullable in backend)
      coverImageUrl: [''],
      thumbnailImageUrl: [''],
      previewVideoUrl: [''],
      isPublic: [true], // Default to published
      permalink: ['', [
        Validators.required, 
        Validators.minLength(3),
        Validators.maxLength(200),
        // Match backend regex: ^[a-z0-9]+(?:-[a-z0-9]+)*$
        Validators.pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      ]],
      
      // Enhanced product details (optional)
      compatibility: ['', [Validators.maxLength(500)]],
      license: ['', [Validators.maxLength(100)]],
      updates: ['', [Validators.maxLength(100)]],
      
      // Required fields
      categoryId: [null, [Validators.required]],
      tagIds: [[], [Validators.required, Validators.minLength(1)]]
    });

    // Add real-time validation feedback
    this.setupFormValidation();
  }

  private setupFormValidation(): void {
    // Watch form changes for real-time validation
    this.productForm.valueChanges.subscribe(() => {
      this.updateFormValidation();
    });

    // Watch individual field changes for immediate feedback
    Object.keys(this.productForm.controls).forEach(key => {
      const control = this.productForm.get(key);
      if (control) {
        control.valueChanges.subscribe(() => {
          this.validateField(key);
        });
      }
    });
  }

  private validateField(fieldName: string): void {
    const control = this.productForm.get(fieldName);
    if (!control) return;

    const value = control.value;
    const errors = control.errors;
    const touched = control.touched;

    // Only show errors if field has been touched or form is being submitted
    if (touched || this.isSubmitting) {
      switch (fieldName) {
        case 'name':
          this.validateName(value, errors);
          break;
        case 'description':
          this.validateDescription(value, errors);
          break;
        case 'price':
          this.validatePrice(value, errors);
          break;
        case 'permalink':
          this.validatePermalink(value, errors);
          break;
        case 'tagIds':
          this.validateTags(value, errors);
          break;
      }
    }
  }

  private validateName(value: string, errors: any): void {
    if (!value) {
      this.showFieldError('name', 'Product name is required');
    } else if (value.length < 3) {
      this.showFieldError('name', 'Product name must be at least 3 characters');
    } else if (value.length > 200) {
      this.showFieldError('name', 'Product name cannot exceed 200 characters');
    } else if (!/^[a-zA-Z0-9\s\-_]+$/.test(value)) {
      this.showFieldError('name', 'Product name can only contain letters, numbers, spaces, hyphens, and underscores');
    } else {
      this.clearFieldError('name');
    }
  }

  private validateDescription(value: string, errors: any): void {
    if (!value) {
      this.showFieldError('description', 'Product description is required');
    } else if (value.length < 10) {
      this.showFieldError('description', 'Product description must be at least 10 characters');
    } else if (value.length > 5000) {
      this.showFieldError('description', 'Product description cannot exceed 5000 characters');
    } else {
      this.clearFieldError('description');
    }
  }

  private validatePrice(value: number, errors: any): void {
    if (!value || value <= 0) {
      this.showFieldError('price', 'Price must be greater than 0');
    } else if (value > 1000000) {
      this.showFieldError('price', 'Price cannot exceed $1,000,000');
    } else if (!/^\d+(\.\d{1,2})?$/.test(value.toString())) {
      this.showFieldError('price', 'Price must be a valid number with up to 2 decimal places');
    } else {
      this.clearFieldError('price');
    }
  }

  private validatePermalink(value: string, errors: any): void {
    if (!value) {
      this.showFieldError('permalink', 'Permalink is required');
    } else if (value.length < 3) {
      this.showFieldError('permalink', 'Permalink must be at least 3 characters');
    } else if (value.length > 200) {
      this.showFieldError('permalink', 'Permalink cannot exceed 200 characters');
    } else if (!/^[a-z0-9-]+$/.test(value)) {
      this.showFieldError('permalink', 'Permalink must be lowercase alphanumeric with hyphens only');
    } else {
      this.clearFieldError('permalink');
    }
  }

  private validateTags(value: number[], errors: any): void {
    if (!this.selectedTags || this.selectedTags.length === 0) {
      this.showFieldError('tagIds', 'At least one tag must be selected');
    } else {
      this.clearFieldError('tagIds');
    }
  }

  private showFieldError(fieldName: string, message: string): void {
    // Store error message for display in template
    this.fieldErrors[fieldName] = message;
  }

  private clearFieldError(fieldName: string): void {
    delete this.fieldErrors[fieldName];
  }

  private initializeQuillEditor(): void {
    // Initialize Quill editor for content tab
    setTimeout(() => {
      try {
        // Avoid double initialization
        if (this.quillEditor) {
          return;
        }
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
    // Define supported file types with user-friendly names
    const supportedTypes = [
      'application/pdf',
      'application/zip',
      'application/x-zip-compressed',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'video/mp4',
      'audio/mpeg',
      'audio/mp3',
      'text/plain',
      'text/csv',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation', // pptx
      'application/vnd.ms-powerpoint', // ppt
      'application/msword', // doc
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
      'application/vnd.ms-excel', // xls
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' // xlsx
    ];

    const supportedExtensions = [
      'PDF', 'ZIP', 'JPG', 'JPEG', 'PNG', 'GIF', 'MP4', 'MP3', 'TXT', 'CSV', 
      'PPTX', 'PPT', 'DOC', 'DOCX', 'XLS', 'XLSX'
    ];

    // File size limit: 1 GB (1,073,741,824 bytes)
    const maxFileSize = 1073741824;
 
    // Filter files by supported types and size
    const validFiles = files.filter(file => {
      // Check file size first
      if (file.size > maxFileSize) {
        const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);
        Swal.fire({
          icon: 'warning',
          title: 'File Too Large',
          text: `${file.name} (${fileSizeMB} MB) exceeds the maximum file size of 1 GB.`,
          confirmButtonColor: '#3b82f6'
        });
        return false;
      }

      // Check file type
      if (!supportedTypes.includes(file.type)) {
        Swal.fire({
          icon: 'warning',
          title: 'Unsupported File Type',
          html: `
            <p><strong>${file.name}</strong> is not a supported file type.</p>
            <p><strong>Supported file types:</strong></p>
            <ul style="text-align: left; margin: 10px 0;">
              <li>Documents: PDF, DOC, DOCX, TXT, CSV</li>
              <li>Images: JPG, PNG, GIF</li>
              <li>Videos: MP4</li>
              <li>Audio: MP3</li>
              <li>Archives: ZIP</li>
              <li>Presentations: PPT, PPTX</li>
              <li>Spreadsheets: XLS, XLSX</li>
            </ul>
            <p><strong>Maximum file size:</strong> 1 GB per file</p>
          `,
          confirmButtonColor: '#3b82f6'
        });
        return false;
      }
      return true;
    });
 
    if (validFiles.length === 0) {
      return;
    }
 
    // Add files to the product files array
    this.productFiles.push(...validFiles);
    
    // Convert files to FileDTO format for display (temporary)
    validFiles.forEach(file => {
      this.uploadedFiles.push({
        id: Date.now() + Math.random(), // Generate temporary ID
        name: file.name,
        fileUrl: URL.createObjectURL(file),
        size: file.size
      });
    });

    // Show success message for valid files
    if (validFiles.length > 0) {
      const fileNames = validFiles.map(f => f.name).join(', ');
      Swal.fire({
        icon: 'success',
        title: 'Files Added Successfully',
        text: `Added ${validFiles.length} file(s): ${fileNames}`,
        timer: 2000,
        showConfirmButton: false
      });
    }
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
  selectTag(tag: TagDTO): void {
    if (this.selectedTags.length < 5 && !this.selectedTags.some(t => t.id === tag.id)) {
      this.selectedTags.push(tag);
      // Update the form control with the selected tag IDs
      this.productForm.patchValue({
        tagIds: this.selectedTags.map(t => t.id)
      });
      // Update filtered tags to reflect the selection
      this.filterTags();
      // Trigger validation
      this.validateField('tagIds');
    }
  }

  removeTag(index: number): void {
    this.selectedTags.splice(index, 1);
    // Update the form control with the remaining tag IDs
    this.productForm.patchValue({
      tagIds: this.selectedTags.map(t => t.id)
    });
    // Update filtered tags to reflect the removal
    this.filterTags();
    // Trigger validation
    this.validateField('tagIds');
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

  // Enhanced Quill Editor Methods
  clearEditor(): void {
    if (this.quillEditor) {
      this.quillService.setContent('');
      this.contentPreview = '';
    }
  }

  insertTemplate(): void {
    const template = `
      <h2>Welcome to Your Product!</h2>
      <p>This is a template to help you get started with your product content. You can:</p>
      <ul>
        <li>Replace this text with your actual product description</li>
        <li>Add images, videos, and links</li>
        <li>Use different formatting options</li>
        <li>Create engaging content for your customers</li>
      </ul>
      <h3>Getting Started</h3>
      <p>Start by describing what your product offers and how it can help your customers.</p>
      <blockquote>
        <p>Remember: Great content leads to better customer satisfaction!</p>
      </blockquote>
    `;
    
    if (this.quillEditor) {
      this.quillService.setContent(template);
      this.contentPreview = template;
    }
  }

  getWordCount(): number {
    const text = this.quillService.getText();
    return text.trim() ? text.trim().split(/\s+/).length : 0;
  }

  getParagraphCount(): number {
    const content = this.quillService.getContent();
    if (!content) return 0;
    
    // Count paragraph tags and line breaks
    const paragraphMatches = content.match(/<p[^>]*>/g);
    const lineBreakMatches = content.match(/<br\s*\/?>/g);
    
    const paragraphCount = paragraphMatches ? paragraphMatches.length : 0;
    const lineBreakCount = lineBreakMatches ? lineBreakMatches.length : 0;
    
    return Math.max(paragraphCount, lineBreakCount, 1);
  }

  getReadingTime(): number {
    const wordCount = this.getWordCount();
    const wordsPerMinute = 200; // Average reading speed
    const readingTime = Math.ceil(wordCount / wordsPerMinute);
    return Math.max(readingTime, 1);
  }

    // Main save and publish method
  async saveAndPublish(): Promise<void> {
    console.log('🚀 SaveAndPublish called!');
    
    // Mark all fields as touched to trigger validation display
    this.productForm.markAllAsTouched();
    
    // Trigger validation for all fields
    this.isSubmitting = true;
    Object.keys(this.productForm.controls).forEach(key => {
      this.validateField(key);
    });
    
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
      currency: this.productForm.get('currency')?.valid,
      permalink: this.productForm.get('permalink')?.value,
      permalinkValid: this.productForm.get('permalink')?.valid,
      permalinkTouched: this.productForm.get('permalink')?.touched,
      tagIds: this.selectedTags.length
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
    
    // Check for validation errors
    if (this.productForm.invalid || Object.keys(this.fieldErrors).length > 0) {
      console.log('❌ Form is invalid, showing detailed error');
      
      // Collect all validation errors
      const errors: string[] = [];
      
      if (this.fieldErrors['name']) errors.push(this.fieldErrors['name']);
      if (this.fieldErrors['description']) errors.push(this.fieldErrors['description']);
      if (this.fieldErrors['price']) errors.push(this.fieldErrors['price']);
      if (this.fieldErrors['permalink']) errors.push(this.fieldErrors['permalink']);
      if (this.fieldErrors['tagIds']) errors.push(this.fieldErrors['tagIds']);
      
      // Check for missing required fields
      if (!this.productForm.get('name')?.value) errors.push('Product name is required');
      if (!this.productForm.get('description')?.value) errors.push('Product description is required');
      if (!this.productForm.get('price')?.value || this.productForm.get('price')?.value <= 0) errors.push('Valid price is required');
      if (!this.productForm.get('categoryId')?.value) errors.push('Category selection is required');
      if (!this.productForm.get('permalink')?.value) errors.push('Permalink is required');
      if (this.selectedTags.length === 0) errors.push('At least one tag must be selected');
      
      Swal.fire({
        icon: 'error',
        title: 'Validation Errors',
        html: `
          <div style="text-align: left;">
            <p><strong>Please fix the following issues:</strong></p>
            <ul style="margin: 10px 0; padding-left: 20px;">
              ${errors.map(error => `<li>${error}</li>`).join('')}
            </ul>
          </div>
        `,
        confirmButtonColor: '#3b82f6'
      });
      
      this.isSubmitting = false;
      return;
    }
    
      this.isSubmitting = true;
      this.errorMessage = null;
      
    try {
      const formValue = this.productForm.getRawValue();
      
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
          // Extract backend message (handles string body, ProblemDetails, or wrapped message)
          let backendMessage = '';
          if (error?.error) {
            if (typeof error.error === 'string') {
              backendMessage = error.error;
            } else if (error.error?.detail) {
              backendMessage = error.error.detail;
            } else if (error.error?.title) {
              backendMessage = error.error.title;
            } else if (error.error?.message) {
              backendMessage = error.error.message;
            }
          }
          const message = backendMessage || error.message || 'Unknown error';
          Swal.fire({
            icon: 'error',
            title: 'Creation Failed',
            text: 'Failed to create product: ' + message,
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

