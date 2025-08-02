import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AllProducts } from './all-products';

describe('AllProducts', () => {
  let component: AllProducts;
  let fixture: ComponentFixture<AllProducts>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AllProducts]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AllProducts);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
