// src/app/features/auth/components/register/register.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { RegisterRequest } from '../../../core/models/auth/auth.model';
import { Alert } from '../../shared/alert/alert';
import { LoadingSpinner } from '../../shared/loading-spinner/loading-spinner';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    Alert,
    LoadingSpinner
  ],
  templateUrl: './register.html',
  styleUrl: './register.css'
})
export class Register implements OnInit {
  registerForm!: FormGroup;
  isLoading = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.registerForm = this.fb.group({
      Username: ['', [Validators.required, Validators.minLength(3)]],
      Email: ['', [Validators.required, Validators.email]],
      Password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required],
      Role: ['Customer', [Validators.required]] // Default to Customer role
    }, { validators: this.passwordMatchValidator }); // Add custom validator
  }

  // Custom validator for password match
  passwordMatchValidator(form: FormGroup) {
    const password = form.get('Password')?.value;
    const confirmPassword = form.get('confirmPassword')?.value;
    return password === confirmPassword ? null : { mismatch: true };
  }

  onRegister(): void {
    this.isLoading = true;
    this.errorMessage = null;
    this.successMessage = null;

    if (this.registerForm.valid) {
      // Clear any existing cached data before registration to ensure data isolation
      this.authService.clearAllCachedData();
      
      const registerPayload: RegisterRequest = {
        Username: this.registerForm.value.Username,
        Email: this.registerForm.value.Email,
        Password: this.registerForm.value.Password,
        Role: this.registerForm.value.Role // Use the selected role from form
      };

      this.authService.register(registerPayload).subscribe({
        next: (response) => {
          this.isLoading = false;
          if (response.success) {
            this.successMessage = response.message || 'Check your email to verify your account.';
            this.registerForm.reset(); // Clear form
            // Don't redirect immediately - let user see the success message
          } else {
            this.errorMessage = response.message || 'Registration failed. Please try again.';
          }
        },
        error: (err) => {
          this.isLoading = false;
          console.error('Registration error:', err);
          this.errorMessage = err.error?.message || 'Registration failed. Please try again.';
        }
      });
    } else {
      this.isLoading = false;
      this.errorMessage = 'Please fix the errors in the form.';
    }
  }
}
