import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { UserService } from '../../../core/services/user.service';
import { ChangePasswordRequest } from '../../../core/models/user/user-profile.model';

@Component({
  selector: 'app-security',
  imports: [CommonModule, FormsModule],
  templateUrl: './security.html',
  styleUrl: './security.css'
})
export class Security implements OnDestroy {
  securityData: ChangePasswordRequest = {
    currentPassword: '',
    newPassword: ''
  };

  confirmPassword = '';
  showCurrentPassword = false;
  showNewPassword = false;
  showConfirmPassword = false;
  isUpdating = false;
  errorMessage = '';
  successMessage = '';
  private destroy$ = new Subject<void>();

  constructor(private userService: UserService) {}

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get passwordsMatch(): boolean {
    return this.securityData.newPassword === this.confirmPassword;
  }

  get hasMinLength(): boolean {
    return this.securityData.newPassword.length >= 8;
  }

  get hasUppercase(): boolean {
    return /[A-Z]/.test(this.securityData.newPassword);
  }

  get hasLowercase(): boolean {
    return /[a-z]/.test(this.securityData.newPassword);
  }

  get hasNumber(): boolean {
    return /\d/.test(this.securityData.newPassword);
  }

  get hasSpecialChar(): boolean {
    return /[!@#$%^&*(),.?":{}|<>]/.test(this.securityData.newPassword);
  }

  get passwordStrengthClass(): string {
    const strength = this.calculatePasswordStrength();
    if (strength >= 80) return 'strong';
    if (strength >= 60) return 'medium';
    if (strength >= 40) return 'weak';
    return 'very-weak';
  }

  get passwordStrengthText(): string {
    const strength = this.calculatePasswordStrength();
    if (strength >= 80) return 'Strong';
    if (strength >= 60) return 'Medium';
    if (strength >= 40) return 'Weak';
    return 'Very Weak';
  }

  toggleCurrentPassword() {
    this.showCurrentPassword = !this.showCurrentPassword;
  }

  toggleNewPassword() {
    this.showNewPassword = !this.showNewPassword;
  }

  toggleConfirmPassword() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  calculatePasswordStrength(): number {
    const password = this.securityData.newPassword;
    if (!password) return 0;

    let strength = 0;
    
    // Length contribution
    strength += Math.min(password.length * 4, 40);
    
    // Character variety contribution
    if (this.hasUppercase) strength += 10;
    if (this.hasLowercase) strength += 10;
    if (this.hasNumber) strength += 10;
    if (this.hasSpecialChar) strength += 10;
    
    // Bonus for meeting all requirements
    if (this.hasMinLength && this.hasUppercase && this.hasLowercase && this.hasNumber && this.hasSpecialChar) {
      strength += 20;
    }

    return Math.min(strength, 100);
  }

  canUpdatePassword(): boolean {
    return this.securityData.currentPassword.length > 0 &&
           this.securityData.newPassword.length > 0 &&
           this.confirmPassword.length > 0 &&
           this.passwordsMatch &&
           this.hasMinLength &&
           this.hasUppercase &&
           this.hasLowercase &&
           this.hasNumber &&
           this.hasSpecialChar;
  }

  updatePassword() {
    if (!this.canUpdatePassword()) {
      this.errorMessage = 'Please ensure all password requirements are met.';
      return;
    }

    this.isUpdating = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.userService.changePassword(this.securityData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.isUpdating = false;
          if (response.success) {
            this.successMessage = 'Password changed successfully! You will receive a confirmation email shortly.';
            this.resetForm();
            this.clearMessagesAfterDelay();
          } else {
            this.errorMessage = response.message || 'Failed to change password';
          }
        },
        error: (error) => {
          this.isUpdating = false;
          console.error('Error changing password:', error);
          if (error.status === 400) {
            this.errorMessage = 'Current password is incorrect.';
          } else {
            this.errorMessage = 'Failed to change password. Please try again.';
          }
        }
      });
  }

  private resetForm() {
    this.securityData = {
      currentPassword: '',
      newPassword: ''
    };
    this.confirmPassword = '';
    this.showCurrentPassword = false;
    this.showNewPassword = false;
    this.showConfirmPassword = false;
  }

  private clearMessagesAfterDelay() {
    setTimeout(() => {
      this.errorMessage = '';
      this.successMessage = '';
    }, 5000);
  }
} 