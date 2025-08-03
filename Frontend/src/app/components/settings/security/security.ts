import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-security',
  imports: [CommonModule, FormsModule],
  templateUrl: './security.html',
  styleUrl: './security.css'
})
export class Security {
  securityData = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  };

  showCurrentPassword = false;
  showNewPassword = false;
  showConfirmPassword = false;

  get passwordsMatch(): boolean {
    return this.securityData.newPassword === this.securityData.confirmPassword;
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
           this.securityData.confirmPassword.length > 0 &&
           this.passwordsMatch &&
           this.hasMinLength &&
           this.hasUppercase &&
           this.hasLowercase &&
           this.hasNumber &&
           this.hasSpecialChar;
  }

  updatePassword() {
    if (!this.canUpdatePassword()) {
      return;
    }

    // TODO: Implement API call to update password
    console.log('Updating password...', {
      currentPassword: this.securityData.currentPassword,
      newPassword: this.securityData.newPassword
    });

    // Reset form after successful update
    this.securityData = {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    };
  }
} 