import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { LoginRequest } from '../../../core/models/auth/auth.model';
import { Alert } from '../../shared/alert/alert';
import { LoadingSpinner } from '../../shared/loading-spinner/loading-spinner';

@Component({
  selector: 'app-login',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, Alert, LoadingSpinner],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login implements OnInit {
  loginForm: FormGroup;
  isLoading: boolean = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      EmailOrUsername: ['', [Validators.required]],
      Password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  ngOnInit() {
    // Check if user is already logged in
    if (this.authService.isLoggedIn()) {
      // Redirect based on user role
      if (this.authService.isCreator()) {
        this.router.navigate(['/products']);
      } else {
        this.router.navigate(['/home']);
      }
    }
  }

  onLogin() {
    this.isLoading = true;
    this.errorMessage = null;
    this.successMessage = null;

    if (this.loginForm.valid) {
      const loginData: LoginRequest = {
        EmailOrUsername: this.loginForm.get('EmailOrUsername')?.value,
        Password: this.loginForm.get('Password')?.value
      };

      this.authService.login(loginData).subscribe({
        next: (response) => {
          this.isLoading = false;
          this.successMessage = response.message || 'Login successful!';
          // Navigate to products page like old frontend
          this.router.navigate(['/products']);
        },
        error: (error) => {
          this.isLoading = false;
          console.error('Login error:', error);
          this.errorMessage = error.error?.message || 'Login failed. Please check your credentials.';
        }
      });
    } else {
      this.isLoading = false;
      this.errorMessage = 'Please fill out all required fields correctly.';
    }
  }
}
