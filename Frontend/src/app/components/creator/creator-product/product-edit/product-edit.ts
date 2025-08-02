import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DashboardSidebar } from '../../../dashboard-sidebar/dashboard-sidebar';
import { QuillService } from '../../../../core/services/quill.service';
import { ProductService } from '../../../../core/services/product.service';
import { ProductDetailDTO } from '../../../../core/models/product/product-detail.dto';
import { ProductUpdateRequestDTO } from '../../../../core/models/product/product-update-request.dto';

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
export class ProductEdit implements OnInit, AfterViewInit, OnDestroy {
  productForm: FormGroup;
  productId: number = 0;
  currency: 'EGP' | 'USD' = 'EGP';
  productDetails: ProductDetail[] = [];
  showDetailsForm: boolean = false;
  newDetail: ProductDetail = { attribute: '', value: '' };
  coverImages: string[] = [];
  thumbnailImage: string = '';
  showCoverOptions: boolean = false;
  coverImageLink: string = '';
  loading: boolean = false;
  error: string = '';
  product: ProductDetailDTO | null = null;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private quillService: QuillService,
    private productService: ProductService
  ) {
    this.productForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      description: [''],
      url: [''],
      price: ['', [Validators.required, Validators.min(0)]],
      summary: [''],
      content: ['']
    });
  }

  ngOnInit() {
    // Get product ID from route
    this.route.params.subscribe(params => {
      this.productId = parseInt(params['id']);
      this.loadProductData();
    });
  }

  loadProductData() {
    this.loading = true;
    this.error = '';

    this.productService.getById(this.productId).subscribe({
      next: (product: ProductDetailDTO) => {
        this.product = product;
        this.productForm.patchValue({
          name: product.name || '',
          description: product.description || '',
          url: product.permalink || '',
          price: product.price,
          summary: '', // Not in DTO, might need to add
          content: '' // Not in DTO, might need to add
        });

        this.currency = (product.currency as 'EGP' | 'USD') || 'EGP';
        this.coverImages = product.coverImageUrl ? [product.coverImageUrl] : [];
        this.thumbnailImage = product.coverImageUrl || '';
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading product:', error);
        this.error = 'Failed to load product. Please try again.';
        this.loading = false;
      }
    });
  }

  generateProductUrl() {
    const name = this.productForm.get('name')?.value || 'my-product';
    const url = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    this.productForm.patchValue({ url: `${url}.raqmiya.com` });
  }

  onNameChange() {
    this.generateProductUrl();
  }

  saveAndContinue() {
    if (this.productForm.valid) {
      const updateData: ProductUpdateRequestDTO = {
        id: this.productId,
        name: this.productForm.get('name')?.value || '',
        description: this.productForm.get('description')?.value || '',
        price: this.productForm.get('price')?.value || 0,
        currency: this.currency,
        productType: 'digital', // Default value, should be configurable
        coverImageUrl: this.coverImages[0] || '',
        isPublic: true, // Default value, should be configurable
        permalink: this.productForm.get('url')?.value || '',
        status: 'draft' // Default value, should be configurable
      };

      this.productService.updateProduct(this.productId, updateData).subscribe({
        next: () => {
          console.log('Product updated successfully');
          this.router.navigate([`/products/${this.productId}/edit/content`]);
        },
        error: (error) => {
          console.error('Error updating product:', error);
          // You might want to show an error message to the user
        }
      });
    }
  }

  cancel() {
    this.router.navigate(['/products']);
  }

  addProductDetail() {
    if (this.newDetail.attribute && this.newDetail.value) {
      this.productDetails.push({ ...this.newDetail });
      this.newDetail = { attribute: '', value: '' };
      // Don't hide the form, keep it open for more additions
      // this.showDetailsForm = false;
    }
  }

  removeProductDetail(index: number) {
    this.productDetails.splice(index, 1);
  }

  uploadCoverImage(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.coverImages.push(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  }

  uploadCoverFromLink() {
    if (this.coverImageLink) {
      this.coverImages.push(this.coverImageLink);
      this.coverImageLink = '';
      this.showCoverOptions = false;
    }
  }

  uploadThumbnail(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.thumbnailImage = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  removeCoverImage(index: number) {
    this.coverImages.splice(index, 1);
  }

  ngAfterViewInit() {
    // Initialize Quill editor for description
    setTimeout(() => {
      const descriptionEditor = this.quillService.initializeQuill('#description-editor', 'Describe your product...', 'description');
      
      // Set initial content if available
      const description = this.productForm.get('description')?.value;
      if (description) {
        this.quillService.setContent(description);
      }
      
      // Listen for content changes
      descriptionEditor.on('text-change', () => {
        const content = this.quillService.getContent();
        this.productForm.patchValue({ description: content });
      });
    }, 100);
  }

  ngOnDestroy() {
    this.quillService.destroy();
  }

  get isFormValid(): boolean {
    return this.productForm.get('name')?.valid === true && 
           this.productForm.get('price')?.valid === true &&
           this.coverImages.length > 0;
  }
}
