import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DashboardSidebar } from '../../../dashboard-sidebar/dashboard-sidebar';
import { QuillService } from '../../../../core/services/quill.service';
import { ProductService } from '../../../../core/services/product.service';
import { ProductDetailDTO } from '../../../../core/models/product/product-detail.dto';
import { ProductUpdateRequestDTO } from '../../../../core/models/product/product-update-request.dto';

@Component({
  selector: 'app-product-edit-content',
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule, DashboardSidebar],
  templateUrl: './product-edit-content.html',
  styleUrl: './product-edit-content.css'
})
export class ProductEditContent implements OnInit, AfterViewInit, OnDestroy {
  productForm: FormGroup;
  productId: number = 0;
  productName: string = '';
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
      content: ['', [Validators.required, Validators.minLength(10)]]
    });
  }

  ngOnInit() {
    // Get product ID from route
    this.route.params.subscribe(params => {
      const idParam = params['id'];
      this.productId = idParam ? parseInt(idParam) : 0;
      
      if (this.productId && !isNaN(this.productId)) {
        this.loadProductData();
      } else {
        console.error('Invalid product ID:', idParam);
        this.error = 'Invalid product ID. Please check the URL.';
        this.loading = false;
      }
    });
  }

  loadProductData() {
    this.loading = true;
    this.error = '';

    this.productService.getById(this.productId).subscribe({
      next: (product: ProductDetailDTO) => {
        this.product = product;
        this.productName = product.name || 'Untitled Product';
        // Note: Content field might not be in the DTO, you may need to add it
        this.productForm.patchValue({
          content: '' // This would come from the backend if available
        });
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading product:', error);
        this.error = 'Failed to load product. Please try again.';
        this.loading = false;
      }
    });
  }

  saveAndPublish() {
    if (this.productForm.valid && this.productId && !isNaN(this.productId)) {
      const updateData: ProductUpdateRequestDTO = {
        id: this.productId,
        name: this.product?.name || '',
        description: this.product?.description || '',
        price: this.product?.price || 0,
        currency: this.product?.currency || 'EGP',
        productType: 'digital', // Default value, should be configurable
        coverImageUrl: this.product?.coverImageUrl || '',
        isPublic: true, // Default value, should be configurable
        permalink: this.product?.permalink || '',
        status: 'draft' // Default value, should be configurable
        // Note: Content field is not in the DTO, you may need to add it
      };

      this.productService.updateProduct(this.productId, updateData).subscribe({
        next: () => {
          console.log('Product content saved successfully');
          this.router.navigate(['/products']);
        },
        error: (error) => {
          console.error('Error saving product content:', error);
          this.error = 'Failed to save product. Please try again.';
        }
      });
    } else {
      this.error = 'Please fill in all required fields and ensure you have a valid product ID.';
    }
  }

  cancel() {
    this.router.navigate(['/products']);
  }

  ngAfterViewInit() {
    // Initialize Quill editor for content
    setTimeout(() => {
      const contentEditor = this.quillService.initializeQuill('#content-editor', 'Enter the content you want to sell. Upload your files or start typing.', 'content');
      
      // Set initial content if available
      const content = this.productForm.get('content')?.value;
      if (content) {
        this.quillService.setContent(content);
      }
      
      // Listen for content changes
      contentEditor.on('text-change', () => {
        const content = this.quillService.getContent();
        this.productForm.patchValue({ content: content });
      });
    }, 100);
  }

  ngOnDestroy() {
    this.quillService.destroy();
  }

  get isFormValid(): boolean {
    return this.productForm.get('content')?.valid === true;
  }
}
