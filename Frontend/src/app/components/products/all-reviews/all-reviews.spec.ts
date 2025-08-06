import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AllReviews } from './all-reviews';

describe('AllReviews', () => {
  let component: AllReviews;
  let fixture: ComponentFixture<AllReviews>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AllReviews]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AllReviews);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
