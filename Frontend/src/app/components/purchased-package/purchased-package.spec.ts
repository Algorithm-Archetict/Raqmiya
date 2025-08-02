import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PurchasedPackage } from './purchased-package';

describe('PurchasedPackage', () => {
  let component: PurchasedPackage;
  let fixture: ComponentFixture<PurchasedPackage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PurchasedPackage]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PurchasedPackage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
