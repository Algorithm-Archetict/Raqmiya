import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, RouterLink } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DashboardSidebar } from '../../../dashboard-sidebar/dashboard-sidebar';
import { ProductDetailDTO } from '../../../../core/models/product/product-detail.dto';
import { ProductCreateRequestDTO } from '../../../../core/models/product/product-create-request.dto';
import { ProductService } from '../../../../core/services/product.service';
import { ProductUpdateRequestDTO } from '../../../../core/models/product/product-update-request.dto';

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
            RouterLink
          ],
  templateUrl: './add-new-product.html',
  styleUrl: './add-new-product.css'
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

  productTypes = [
    { id: 'digital', name: 'Digital', description: 'Downloadable files', icon: 'fas fa-file', selected: false },
    { id: 'course', name: 'Course', description: 'Online video content', icon: 'fas fa-video', selected: false },
    { id: 'membership', name: 'Membership', description: 'Recurring access to content', icon: 'fas fa-users', selected: false }
  ];

  constructor(private fb: FormBuilder, private productService: ProductService) {}

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
      content: ['']
    });
  }

  get isCreateStepValid(): boolean {
    return !!this.productForm.get('name')?.valid &&
           !!this.productForm.get('price')?.valid &&
           !!this.productForm.get('productType')?.valid &&
           !!this.productForm.get('permalink')?.valid;
  }

  get isCustomizeStepValid(): boolean {
    return !!this.productForm.get('description')?.valid && this.productForm.get('isPublic') !== null;
  }

  selectProductType(typeId: string): void {
    this.productForm.get('productType')?.setValue(typeId);
    this.productTypes.forEach(type => type.selected = type.id === typeId);
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

  saveAndContinue(): void {
    if (this.productForm.invalid) return;
    this.isSubmitting = true;
    
    const formValue = this.productForm.value;
    const dto: ProductCreateRequestDTO = {
      ...formValue,
      permalink: formValue.url.replace('.raqmiya.com', ''), // Extract permalink from URL
      price: parseFloat(formValue.price)
    };
    
    this.productService.createProduct(dto).subscribe({
      next: (res) => {
        this.productId = res.id;
        this.currentStep = 'content';
        this.isSubmitting = false;
        this.successMessage = 'Product saved.';
      },
      error: () => {
        this.isSubmitting = false;
        this.errorMessage = 'Failed to create product.';
      }
    });
  }

  saveAndPublish(): void {
    if (!this.productId || this.productForm.invalid) return;
    
    const formValue = this.productForm.value;
    const dto: ProductUpdateRequestDTO = {
      ...formValue,
      permalink: formValue.url.replace('.raqmiya.com', ''), // Extract permalink from URL
      price: parseFloat(formValue.price)
    };
    
    this.productService.updateProduct(this.productId, dto).subscribe({
      next: () => {
        this.successMessage = 'Product published!';
      },
      error: () => {
        this.errorMessage = 'Failed to publish product.';
      }
    });
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
}

