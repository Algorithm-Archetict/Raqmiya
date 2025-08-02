import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProductEdit } from './product-edit';

describe('ProductEdit', () => {
  let component: ProductEdit;
  let fixture: ComponentFixture<ProductEdit>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductEdit]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProductEdit);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
