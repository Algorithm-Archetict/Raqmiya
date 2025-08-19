import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminUserCreate } from './admin-user-create';

describe('AdminUserCreate', () => {
  let component: AdminUserCreate;
  let fixture: ComponentFixture<AdminUserCreate>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminUserCreate]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminUserCreate);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
