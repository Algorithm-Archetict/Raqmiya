import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { LoginRequest } from '../../../core/models/auth/auth.model';
import { Alert } from '../../shared/alert/alert';
import { LoadingSpinner } from '../../shared/loading-spinner/loading-spinner';

@Component({
  selector: 'app-login',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink,Alert, LoadingSpinner],
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
      } else if (this.authService.isAdmin()) {
        this.router.navigate(['/dashboard']);
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
      // Clear any existing cached data before login to ensure data isolation
      this.authService.clearAllCachedData();
      
      const loginData: LoginRequest = {
        EmailOrUsername: this.loginForm.get('EmailOrUsername')?.value,
        Password: this.loginForm.get('Password')?.value
      };

      this.authService.login(loginData).subscribe({
        next: (response) => {
          this.isLoading = false;
          this.successMessage = response.message || 'Login successful!';
          // Redirect based on user role
          if (this.authService.isCreator()) {
            this.router.navigate(['/products']);
          } else if (this.authService.isAdmin()) {
            this.router.navigate(['/dashboard']);
          } else {
            this.router.navigate(['/home']);
          }
        },
        error: (error) => {
          this.isLoading = false;
          console.error('Login error:', error);
          const errorMessage = error.error?.message || 'Login failed. Please check your credentials.';
          
          // Check if it's an inactive account message and provide restoration guidance
          if (errorMessage.includes('Account is inactive') || errorMessage.includes('deactivated')) {
            this.errorMessage = errorMessage + ' If you recently deleted your account, you can restore it using the link sent to your email.';
          } else {
            this.errorMessage = errorMessage;
          }
        }
      });
    } else {
      this.isLoading = false;
      this.errorMessage = 'Please fill out all required fields correctly.';
    }
  }
}
