import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminUserDetail } from './admin-user-detail';

describe('AdminUserDetail', () => {
  let component: AdminUserDetail;
  let fixture: ComponentFixture<AdminUserDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminUserDetail]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminUserDetail);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
