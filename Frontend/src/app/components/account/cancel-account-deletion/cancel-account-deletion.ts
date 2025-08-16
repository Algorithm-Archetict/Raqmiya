import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { LoadingSpinner } from '../../shared/loading-spinner/loading-spinner';

@Component({
  selector: 'app-cancel-account-deletion',
  imports: [CommonModule, LoadingSpinner],
  templateUrl: './cancel-account-deletion.html',
  styleUrl: './cancel-account-deletion.css'
})
export class CancelAccountDeletion implements OnInit {
  token = '';
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  cancellationComplete = false;

  constructor(
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.token = params['token'] || '';
      if (this.token) {
        this.cancelDeletion();
      } else {
        this.errorMessage = 'Invalid cancellation link. Please check your email for the correct link.';
      }
    });
  }

  cancelDeletion() {
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.authService.cancelAccountDeletion({ token: this.token }).subscribe({
      next: (response: any) => {
        this.isLoading = false;
        if (response.success) {
          this.cancellationComplete = true;
          this.successMessage = response.message;
          setTimeout(() => {
            this.router.navigate(['/settings']);
          }, 3000);
        } else {
          this.errorMessage = response.message || 'Cancellation failed. Please try again.';
        }
      },
      error: (error: any) => {
        this.isLoading = false;
        console.error('Account deletion cancellation error:', error);
        this.errorMessage = 'An error occurred while cancelling account deletion. Please try again.';
      }
    });
  }

  goToSettings() {
    this.router.navigate(['/settings']);
  }

  goToHome() {
    this.router.navigate(['/']);
  }
}
