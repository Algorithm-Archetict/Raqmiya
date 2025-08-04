import { Component, OnInit, AfterViewInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
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
export class ProductEditContent{
  @Input() productForm!: FormGroup;
  @Input() productId?: number;
  @Output() save = new EventEmitter<void>();

  // Additional properties for the template
  productName: string = '';
  isFormValid: boolean = true;

  onSaveAndPublish(): void {
    this.save.emit();
  }

  saveAndPublish(): void {
    this.save.emit();
  }

  cancel(): void {
    // Handle cancel action
  }
}
