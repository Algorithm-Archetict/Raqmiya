import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { LoadingSpinner } from '../../shared/loading-spinner/loading-spinner';

@Component({
  selector: 'app-email-verification',
  imports: [CommonModule, FormsModule, LoadingSpinner],
  templateUrl: './email-verification.html',
  styleUrl: './email-verification.css'
})
export class EmailVerification implements OnInit {
  token = '';
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  tokenValid = false;
  tokenExpired = false;
  verificationComplete = false;

  constructor(
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.token = params['token'] || '';
      if (this.token) {
        this.verifyEmail();
      } else {
        this.errorMessage = 'Invalid verification link. Please check your email for the correct link.';
      }
    });
  }

  verifyEmail() {
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.authService.verifyEmail({ token: this.token }).subscribe({
      next: (response: any) => {
        this.isLoading = false;
        if (response.success) {
          this.verificationComplete = true;
          this.successMessage = response.message;
          // Store the token for automatic login
          if (response.token) {
            localStorage.setItem('token', response.token);
            localStorage.setItem('username', response.username || '');
            localStorage.setItem('email', response.email || '');
            localStorage.setItem('roles', JSON.stringify(response.roles || []));
          }
          // Redirect to home page after 3 seconds
          setTimeout(() => {
            this.router.navigate(['/']);
          }, 3000);
        } else {
          this.errorMessage = response.message || 'Verification failed. Please try again.';
        }
      },
      error: (error: any) => {
        this.isLoading = false;
        console.error('Email verification error:', error);
        this.errorMessage = 'An error occurred while verifying your email. Please try again.';
      }
    });
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }

  goToRegister() {
    this.router.navigate(['/register']);
  }

  resendVerification() {
    // This would typically require the user to enter their email again
    // For now, we'll redirect to a resend page or show a message
    this.router.navigate(['/resend-verification']);
  }
}
