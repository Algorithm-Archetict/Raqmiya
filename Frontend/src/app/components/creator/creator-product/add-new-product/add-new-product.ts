import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DashboardSidebar } from '../../../dashboard-sidebar/dashboard-sidebar';
import { ProductDetailDTO } from '../../../../core/models/product/product-detail.dto';
import { ProductCreateRequestDTO } from '../../../../core/models/product/product-create-request.dto';
import { ProductService } from '../../../../core/services/product.service';

@Component({
  selector: 'app-add-new-product',
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule, DashboardSidebar],
  templateUrl: './add-new-product.html',
  styleUrl: './add-new-product.css'
})
export class AddNewProduct implements OnInit {
  productForm!: FormGroup;
  name: string = '';
  currentStep: 'create' | 'customize' | 'content' = 'create';
  currency: string = 'EGP';
  coverImageLink: string = '';
  showCoverOptions: boolean = false;
  showDetailsForm: boolean = false;
  coverImages: string[] = [];
  thumbnailImage: string = '';
  productDetails: Array<{attribute: string, value: string}> = [];
  newDetail: {attribute: string, value: string} = {attribute: '', value: ''};
  isSubmitting: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';

  productTypes = [
    {
      id: 'digital-download',
      name: 'Digital Download',
      description: 'Sell files, documents, or digital assets',
      icon: 'fas fa-download',
      selected: false
    },
    {
      id: 'online-course',
      name: 'Online Course',
      description: 'Create and sell educational content',
      icon: 'fas fa-graduation-cap',
      selected: false
    },
    {
      id: 'Audio-MP3',
      name: 'Audio & MP3',
      description: 'Recurring access to audio files',
      icon: 'fas fa-music',
      selected: false
    },
    {
      id: 'software',
      name: 'Software',
      description: 'Sell applications or tools',
      icon: 'fas fa-code',
      selected: false
    }
  ];

  selectedProductType: string = '';

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private productService: ProductService
  ) {
    this.initializeForm();
  }

  ngOnInit() {
    this.generateProductUrl();
    
    // Set initial values
    this.productForm.patchValue({
      name: '',
      description: '',
      url: 'my-product.raqmiya.com',
      price: '',
      summary: '',
      content: ''
    });
  }

  private initializeForm() {
    this.productForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(200)]],
      description: ['', [Validators.maxLength(5000)]],
      url: [''],
      price: ['', [Validators.required, Validators.min(0.01), Validators.max(1000000)]],
      summary: [''],
      content: ['']
    });
  }

  get isCreateStepValid(): boolean {
    return !!this.productForm.get('name')?.valid && 
           !!this.productForm.get('price')?.valid && 
           this.selectedProductType !== '';
  }

  get isCustomizeStepValid(): boolean {
    return !!this.productForm.get('name')?.valid && 
           !!this.productForm.get('price')?.valid;
  }

  onNameChange() {
    this.generateProductUrl();
  }

  generateProductUrl() {
    const name = this.productForm.get('name')?.value || '';
    if (name) {
      const permalink = name.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
      this.productForm.patchValue({
        url: `${permalink}.raqmiya.com`
      });
    }
  }

  selectProductType(typeId: string) {
    this.productTypes.forEach(type => {
      type.selected = type.id === typeId;
    });
    this.selectedProductType = typeId;
  }

  nextToCustomize() {
    if (this.isCreateStepValid) {
      this.currentStep = 'customize';
    }
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
    }
  }

  removeCoverImage(index: number) {
    this.coverImages.splice(index, 1);
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

  addProductDetail() {
    if (this.newDetail.attribute && this.newDetail.value) {
      this.productDetails.push({...this.newDetail});
      this.newDetail = {attribute: '', value: ''};
    }
  }

  removeProductDetail(index: number) {
    this.productDetails.splice(index, 1);
  }

  saveAndContinue() {
    if (this.isCustomizeStepValid) {
      this.currentStep = 'content';
    }
  }

  async saveAndPublish() {
    if (!this.productForm.valid) {
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';
    this.successMessage = '';

    try {
      const formValue = this.productForm.value;
      
      const productData: ProductCreateRequestDTO = {
        name: formValue.name,
        description: formValue.description || '',
        price: parseFloat(formValue.price),
        currency: this.currency,
        productType: this.selectedProductType,
        coverImageUrl: this.coverImages.length > 0 ? this.coverImages[0] : undefined,
        previewVideoUrl: undefined, // Not implemented in UI yet
        isPublic: true, // Default to public
        permalink: formValue.url.replace('.raqmiya.com', ''), // Extract permalink from URL
        categoryIds: [], // Not implemented in UI yet
        tagIds: [] // Not implemented in UI yet
      };

      const result = await this.productService.createProduct(productData).toPromise();
      
      if (result) {
        this.successMessage = 'Product created successfully!';
        setTimeout(() => {
          this.router.navigate(['/products']);
        }, 2000);
      }
    } catch (error) {
      console.error('Error creating product:', error);
      this.errorMessage = 'Failed to create product. Please try again.';
    } finally {
      this.isSubmitting = false;
    }
  }

  cancel() {
    this.router.navigate(['/products']);
  }
}
