import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { LoadingSpinner } from '../../shared/loading-spinner/loading-spinner';

@Component({
  selector: 'app-confirm-account-deletion',
  imports: [CommonModule, LoadingSpinner],
  templateUrl: './confirm-account-deletion.html',
  styleUrl: './confirm-account-deletion.css'
})
export class ConfirmAccountDeletion implements OnInit {
  token = '';
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  deletionComplete = false;
  restorationInfo = '';

  constructor(
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.token = params['token'] || '';
      if (this.token) {
        this.confirmDeletion();
      } else {
        this.errorMessage = 'Invalid deletion link. Please check your email for the correct link.';
      }
    });
  }

  confirmDeletion() {
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.authService.confirmAccountDeletion({ token: this.token }).subscribe({
      next: (response: any) => {
        this.isLoading = false;
        if (response.success) {
          this.deletionComplete = true;
          this.successMessage = response.message;
          this.restorationInfo = 'Your account has been deactivated. You can restore it within 30 days by contacting support or using the restoration link sent to your email.';
          
          // Use AuthService's comprehensive clearing method
          this.authService.clearAllCachedData();
          
          // Additional clearing for any remaining data
          localStorage.clear();
          sessionStorage.clear();
          
          setTimeout(() => {
            this.router.navigate(['/']);
          }, 8000); // Increased delay to allow user to read restoration info
        } else {
          this.errorMessage = response.message || 'Deletion confirmation failed. Please try again.';
        }
      },
      error: (error: any) => {
        this.isLoading = false;
        console.error('Account deletion confirmation error:', error);
        this.errorMessage = 'An error occurred while confirming account deletion. Please try again.';
      }
    });
  }

  goToHome() {
    this.router.navigate(['/']);
  }
}
