import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProductEditContent } from './product-edit-content';

describe('ProductEditContent', () => {
  let component: ProductEditContent;
  let fixture: ComponentFixture<ProductEditContent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductEditContent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProductEditContent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
