import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WishList } from './wish-list';

describe('WishList', () => {
  let component: WishList;
  let fixture: ComponentFixture<WishList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WishList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WishList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
