import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DashboardSidebar } from '../dashboard-sidebar/dashboard-sidebar';
import { RouterLink } from '@angular/router';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-settings',
  imports: [CommonModule, RouterModule, DashboardSidebar, RouterLink],
  templateUrl: './settings.html',
  styleUrl: './settings.css'
})
export class Settings {
  constructor(
    private router: Router,
    private authService: AuthService
  ) {}
  
  deleteAccount() {
    Swal.fire({
      title: 'Delete Account',
      html: `
        <div class="delete-account-warning">
          <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #dc3545; margin-bottom: 1rem;"></i>
          <h3>Are you sure you want to delete your account?</h3>
          <p><strong>This action cannot be undone immediately.</strong></p>
          <ul style="text-align: left; margin: 1rem 0;">
            <li>Your account will be hidden from other users</li>
            <li>Your data will be retained for 30 days</li>
            <li>You can restore your account within 30 days</li>
            <li>After 30 days, your data will be permanently deleted</li>
          </ul>
          <p>Please enter your password to confirm:</p>
        </div>
      `,
      input: 'password',
      inputPlaceholder: 'Enter your password',
      inputAttributes: {
        autocapitalize: 'off',
        autocorrect: 'off'
      },
      showCancelButton: true,
      confirmButtonText: 'Delete Account',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      showLoaderOnConfirm: true,
      preConfirm: (password) => {
        if (!password) {
          Swal.showValidationMessage('Please enter your password');
          return false;
        }
        return password;
      }
    }).then((result) => {
      if (result.isConfirmed) {
        this.showDeletionReasonDialog(result.value);
      }
    });
  }

  private showDeletionReasonDialog(password: string) {
    Swal.fire({
      title: 'Reason for Deletion',
      html: `
        <div class="deletion-reason-form">
          <p>Please tell us why you're deleting your account:</p>
          <textarea id="deletion-reason" class="swal2-textarea" placeholder="Enter your reason for deletion..." rows="4"></textarea>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Submit Deletion Request',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      showLoaderOnConfirm: true,
      preConfirm: () => {
        const reason = (document.getElementById('deletion-reason') as HTMLTextAreaElement).value;
        if (!reason.trim()) {
          Swal.showValidationMessage('Please provide a reason for deletion');
          return false;
        }
        return reason;
      }
    }).then((result) => {
      if (result.isConfirmed) {
        this.submitDeletionRequest(password, result.value);
      }
    });
  }

  private submitDeletionRequest(password: string, reason: string) {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      Swal.fire('Error', 'User not found. Please log in again.', 'error');
      return;
    }

    this.authService.requestAccountDeletion({
      password: password,
      deletionReason: reason,
      confirmDeletion: true
    }).subscribe({
      next: (response: any) => {
        if (response.success) {
          Swal.fire({
            title: 'Deletion Request Sent',
            html: `
              <div class="deletion-success">
                <i class="fas fa-envelope" style="font-size: 3rem; color: #28a745; margin-bottom: 1rem;"></i>
                <p>We've sent a confirmation email to your registered email address.</p>
                <p><strong>Please check your email and click the confirmation link to complete the deletion.</strong></p>
                <p>The link will expire in 24 hours.</p>
              </div>
            `,
            icon: 'success',
            confirmButtonText: 'OK'
          }).then(() => {
            this.router.navigate(['/home']);
          });
        } else {
          Swal.fire('Error', response.message || 'Failed to submit deletion request', 'error');
        }
      },
      error: (error: any) => {
        console.error('Account deletion request error:', error);
        Swal.fire('Error', 'An error occurred while processing your request. Please try again.', 'error');
      }
    });
  }
}
