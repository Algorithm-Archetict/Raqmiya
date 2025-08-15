import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { LoadingSpinner } from '../../shared/loading-spinner/loading-spinner';

@Component({
  selector: 'app-reset-password',
  imports: [CommonModule, FormsModule, LoadingSpinner],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.css'
})
export class ResetPassword implements OnInit {
  token = '';
  newPassword = '';
  confirmPassword = '';
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  tokenValid = false;
  tokenExpired = false;
  showNewPassword = false;
  showConfirmPassword = false;

  constructor(
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.token = params['token'] || '';
      if (this.token) {
        this.verifyToken();
      } else {
        this.errorMessage = 'Invalid reset link. Please request a new password reset.';
      }
    });
  }

  verifyToken() {
    this.authService.verifyResetToken(this.token).subscribe({
      next: (response: any) => {
        if (response.success) {
          if (response.isValid) {
            this.tokenValid = true;
          } else if (response.isExpired) {
            this.tokenExpired = true;
            this.errorMessage = 'This reset link has expired. Please request a new password reset.';
          } else {
            this.errorMessage = 'This reset link has already been used. Please request a new password reset.';
          }
        } else {
          this.errorMessage = response.message || 'Invalid reset link.';
        }
              },
        error: (error: any) => {
          console.error('Token verification error:', error);
          this.errorMessage = 'An error occurred while verifying the reset link.';
        }
    });
  }

  onSubmit() {
    if (!this.validateForm()) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const resetData = {
      token: this.token,
      newPassword: this.newPassword,
      confirmPassword: this.confirmPassword
    };

    this.authService.resetPassword(resetData).subscribe({
      next: (response: any) => {
        this.isLoading = false;
        if (response.success) {
          this.successMessage = response.message;
          // Redirect to login after 3 seconds
          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 3000);
        } else {
          this.errorMessage = response.message || 'An error occurred while resetting your password.';
        }
              },
        error: (error: any) => {
          this.isLoading = false;
          console.error('Reset password error:', error);
          this.errorMessage = 'An error occurred while resetting your password. Please try again.';
        }
    });
  }

  private validateForm(): boolean {
    if (!this.newPassword) {
      this.errorMessage = 'Please enter a new password.';
      return false;
    }

    if (!this.confirmPassword) {
      this.errorMessage = 'Please confirm your new password.';
      return false;
    }

    if (this.newPassword !== this.confirmPassword) {
      this.errorMessage = 'Passwords do not match.';
      return false;
    }

    if (!this.isPasswordStrong(this.newPassword)) {
      this.errorMessage = 'Password must be at least 8 characters long and contain uppercase, lowercase, number, and special character.';
      return false;
    }

    return true;
  }

  private isPasswordStrong(password: string): boolean {
    const minLength = password.length >= 8;
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecialChar = this.hasSpecialCharacter(password);

    return minLength && hasUppercase && hasLowercase && hasNumber && hasSpecialChar;
  }

  hasSpecialCharacter(password: string): boolean {
    return /[!@#$%^&*(),.?":{}|<>]/.test(password);
  }

  hasMinLength(password: string): boolean {
    return password.length >= 8;
  }

  hasUppercase(password: string): boolean {
    return /[A-Z]/.test(password);
  }

  hasLowercase(password: string): boolean {
    return /[a-z]/.test(password);
  }

  hasNumber(password: string): boolean {
    return /\d/.test(password);
  }

  toggleNewPassword() {
    this.showNewPassword = !this.showNewPassword;
  }

  toggleConfirmPassword() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  goToForgotPassword() {
    this.router.navigate(['/forgot-password']);
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }
}
