import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreatorProduct } from './creator-product';

describe('CreatorProduct', () => {
  let component: CreatorProduct;
  let fixture: ComponentFixture<CreatorProduct>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreatorProduct]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CreatorProduct);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
