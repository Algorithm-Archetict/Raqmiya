import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddNewProduct } from './add-new-product';

describe('AddNewProduct', () => {
  let component: AddNewProduct;
  let fixture: ComponentFixture<AddNewProduct>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddNewProduct]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddNewProduct);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
