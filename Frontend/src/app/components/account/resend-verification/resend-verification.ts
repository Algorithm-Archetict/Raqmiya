import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { LoadingSpinner } from '../../shared/loading-spinner/loading-spinner';

@Component({
  selector: 'app-resend-verification',
  imports: [CommonModule, FormsModule, LoadingSpinner],
  templateUrl: './resend-verification.html',
  styleUrl: './resend-verification.css'
})
export class ResendVerification {
  email = '';
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  submitted = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  onSubmit() {
    if (!this.email || !this.isValidEmail(this.email)) {
      this.errorMessage = 'Please enter a valid email address.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.submitted = true;

    this.authService.resendVerification({ email: this.email }).subscribe({
      next: (response: any) => {
        this.isLoading = false;
        if (response.success) {
          this.successMessage = response.message;
          // Clear form after successful submission
          this.email = '';
          this.submitted = false;
        } else {
          this.errorMessage = response.message || 'An error occurred. Please try again.';
        }
      },
      error: (error: any) => {
        this.isLoading = false;
        console.error('Resend verification error:', error);
        this.errorMessage = 'An error occurred while sending the verification email. Please try again.';
      }
    });
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }

  goToRegister() {
    this.router.navigate(['/register']);
  }
}
