import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminService } from '../../../core/services/admin.service';
import { CreateAdminUserDTO } from '../../../core/models/admin/create-admin-user.dto';

@Component({
  selector: 'app-admin-user-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './admin-user-create.html',
  styleUrls: ['./admin-user-create.css']
})
export class AdminUserCreate {
  userForm: FormGroup;
  loading = false;
  error = '';
  success = '';

  // Available roles matching the backend
  availableRoles = [
    { value: 'Admin', label: 'Admin' },
    { value: 'Creator', label: 'Creator' },
    { value: 'Customer', label: 'Customer' }
  ];

  constructor(
    private fb: FormBuilder,
    private adminService: AdminService,
    private router: Router
  ) {
    this.userForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      username: ['', [Validators.required, Validators.minLength(3)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
      role: ['Creator', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  passwordMatchValidator(form: FormGroup) {
    const password = form.get('password');
    const confirmPassword = form.get('confirmPassword');
    
    if (password && confirmPassword && password.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }
    
    if (confirmPassword && confirmPassword.errors) {
      delete confirmPassword.errors['passwordMismatch'];
      if (Object.keys(confirmPassword.errors).length === 0) {
        confirmPassword.setErrors(null);
      }
    }
    
    return null;
  }

  onSubmit(): void {
    if (this.userForm.valid) {
      this.loading = true;
      this.error = '';
      this.success = '';

      const userData: CreateAdminUserDTO = {
        email: this.userForm.get('email')?.value,
        username: this.userForm.get('username')?.value,
        password: this.userForm.get('password')?.value,
        role: this.userForm.get('role')?.value
      };

      this.adminService.createUser(userData).subscribe({
        next: (response) => {
          this.success = response?.message || 'User created successfully!';
          this.loading = false;
          this.userForm.reset({ role: 'Creator' });
          
          // Redirect after a short delay
          setTimeout(() => {
            this.router.navigate(['/admin/users']);
          }, 2000);
        },
        error: (error) => {
          console.error('Error creating user:', error);
          this.error = this.getErrorMessage(error);
          this.loading = false;
        }
      });
    } else {
      this.markFormGroupTouched();
    }
  }

  markFormGroupTouched(): void {
    Object.keys(this.userForm.controls).forEach(key => {
      const control = this.userForm.get(key);
      control?.markAsTouched();
    });
  }

  getFieldError(fieldName: string): string {
    const field = this.userForm.get(fieldName);
    if (field?.errors && field.touched) {
      if (field.errors['required']) {
        return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} is required`;
      }
      if (field.errors['email']) {
        return 'Please enter a valid email address';
      }
      if (field.errors['minlength']) {
        const requiredLength = field.errors['minlength'].requiredLength;
        return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} must be at least ${requiredLength} characters`;
      }
    }
    return '';
  }

  getPasswordError(): string {
    const confirmPassword = this.userForm.get('confirmPassword');
    if (confirmPassword?.errors && confirmPassword.touched) {
      if (confirmPassword.errors['passwordMismatch']) {
        return 'Passwords do not match';
      }
    }
    return '';
  }

  getErrorMessage(error: any): string {
    if (error.status === 401) {
      return 'Authentication required. Please log in again.';
    } else if (error.status === 403) {
      return 'Access denied. You do not have permission to create users.';
    } else if (error.status === 409) {
      return 'A user with this email or username already exists.';
    } else if (error.status >= 500) {
      return 'Server error. Please try again later.';
    } else if (error.error?.message) {
      return error.error.message;
    } else if (error.message) {
      return error.message;
    } else {
      return 'An unexpected error occurred. Please try again.';
    }
  }

  clearMessages(): void {
    this.error = '';
    this.success = '';
  }
}
