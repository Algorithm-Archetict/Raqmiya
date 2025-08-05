import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { DashboardSidebar } from '../../../dashboard-sidebar/dashboard-sidebar';
import { QuillService } from '../../../../core/services/quill.service';
import { ProductService } from '../../../../core/services/product.service';
import { ProductDetailDTO } from '../../../../core/models/product/product-detail.dto';
import { ProductUpdateRequestDTO } from '../../../../core/models/product/product-update-request.dto';
import { FileDTO } from '../../../../core/models/product/file.dto';

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
  productForm!: FormGroup;
  productId?: number;
  product?: ProductDetailDTO;
  isSubmitting = false;
  isDeleting = false;
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
    this.productForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      description: [''],
      price: [0, [Validators.required, Validators.min(0.01)]],
      currency: ['USD', [Validators.required]],
      productType: ['', Validators.required],
      permalink: ['', [Validators.required, Validators.pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)]],
      isPublic: [true],
      url: [''],
      summary: [''],
      content: [''],
      compatibility: [''],
      license: [''],
      updates: ['']
    });

    this.loadProduct();
  }

  async loadProduct(): Promise<void> {
    this.route.params.subscribe(params => {
      const productId = params['id'];
      if (productId) {
        this.productId = parseInt(productId);
        this.fetchProduct(this.productId);
      } else {
        this.errorMessage = 'Product ID not found';
      }
    });
  }

  fetchProduct(productId: number): void {
    this.isSubmitting = true;
    this.errorMessage = null;
    
    this.productService.getById(productId).subscribe({
      next: (product) => {
        this.product = product;
        this.populateForm(product);
        this.isSubmitting = false;
      },
      error: (error) => {
        this.errorMessage = 'Failed to load product: ' + (error.error?.message || error.message);
        this.isSubmitting = false;
      }
    });
  }

  populateForm(product: ProductDetailDTO): void {
    this.productForm.patchValue({
      name: product.name,
      description: product.description,
      price: product.price,
      currency: product.currency,
      productType: product.productType,
      permalink: product.permalink,
      isPublic: product.isPublic,
      compatibility: product.compatibility,
      license: product.license,
      updates: product.updates
    });

    // Populate additional properties
    this.currency = product.currency;
    this.name = product.name;
    this.productFeatures = product.features || [];
    this.coverImages = product.coverImages || [];
    this.thumbnailImage = product.thumbnailImageUrl || null;
    this.uploadedFiles = product.files || [];

    // Set product type selection
    this.productTypes.forEach(type => {
      type.selected = type.id === product.productType;
    });
  }

  get isFormValid(): boolean {
    return this.productForm.valid;
  }

  selectProductType(typeId: string): void {
    this.productForm.get('productType')?.setValue(typeId);
    this.productTypes.forEach(type => type.selected = type.id === typeId);
  }

  onNameChange(): void {
    const nameValue = this.productForm.get('name')?.value;
    this.name = nameValue || '';
    if (nameValue) {
      const permalink = nameValue.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
      this.productForm.get('url')?.setValue(`${permalink}.raqmiya.com`);
      this.productForm.get('permalink')?.setValue(permalink);
    }
  }

  generatePermalink(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  async saveChanges(): Promise<void> {
    if (!this.productId || this.productForm.invalid) return;
    
    this.isSubmitting = true;
    this.errorMessage = null;
    
    try {
      // First upload files if any
      if (this.productFiles.length > 0) {
        await this.uploadFiles(this.productId);
      }
      
      // Then update the product
      const formValue = this.productForm.value;
      const updateDto: ProductUpdateRequestDTO = {
        id: this.productId,
        name: formValue.name,
        description: formValue.description || '',
        price: parseFloat(formValue.price),
        currency: formValue.currency,
        productType: formValue.productType,
        previewVideoUrl: formValue.previewVideoUrl,
        isPublic: formValue.isPublic,
        permalink: formValue.permalink,
        features: this.productFeatures,
        compatibility: formValue.compatibility,
        license: formValue.license,
        updates: formValue.updates,
        categoryIds: [],
        tagIds: [],
        status: formValue.isPublic ? 'published' : 'draft'
      };
      
      this.productService.updateProduct(this.productId, updateDto).subscribe({
        next: () => {
          this.successMessage = 'Product updated successfully!';
          this.isSubmitting = false;
        },
        error: (error) => {
          this.errorMessage = 'Failed to update product: ' + (error.error?.message || error.message);
          this.isSubmitting = false;
        }
      });
    } catch (err) {
      console.error('Error in saveChanges:', err);
      this.isSubmitting = false;
      this.errorMessage = 'Failed to update product.';
    }
  }

  async deleteProduct(): Promise<void> {
    if (!this.productId) return;
    
    if (!confirm('Are you sure you want to delete this product? This action cannot be undone, but customers who purchased it will still have access.')) {
      return;
    }
    
    this.isDeleting = true;
    this.errorMessage = null;
    
    this.productService.deleteProduct(this.productId).subscribe({
      next: () => {
        this.successMessage = 'Product deleted successfully!';
        this.isDeleting = false;
        // Redirect to products list after a short delay
        setTimeout(() => {
          this.router.navigate(['/creator/products']);
        }, 2000);
      },
      error: (error) => {
        this.errorMessage = 'Failed to delete product: ' + (error.error?.message || error.message);
        this.isDeleting = false;
      }
    });
  }

  // File upload methods
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
      'text/plain',
      'image/jpeg',
      'image/png',
      'image/gif',
      'video/mp4',
      'audio/mpeg',
      'audio/mp3'
    ];
    const maxSize = 250 * 1024 * 1024; // 250MB
    if (!allowedTypes.includes(file.type)) {
      this.errorMessage = 'File type not allowed: ' + file.name;
      return false;
    }
    if (file.size > maxSize) {
      this.errorMessage = 'File too large (max 250MB): ' + file.name;
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
    let uploaded: FileDTO[] = [];
    
    for (let i = 0; i < this.productFiles.length; i++) {
      const file = this.productFiles[i];
      try {
        const result = await firstValueFrom(this.productService.uploadFile(productId, file));
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
    return uploaded;
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

  cancel(): void {
    this.router.navigate(['/creator/products']);
  }
}
