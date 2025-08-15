import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { LoadingSpinner } from '../../shared/loading-spinner/loading-spinner';

@Component({
  selector: 'app-restore-account',
  imports: [CommonModule, FormsModule, LoadingSpinner],
  templateUrl: './restore-account.html',
  styleUrl: './restore-account.css'
})
export class RestoreAccount implements OnInit {
  token = '';
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  restorationComplete = false;

  constructor(
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.token = params['token'] || '';
      if (this.token) {
        this.restoreAccount();
      } else {
        this.errorMessage = 'Invalid restoration link. Please check your email for the correct link.';
      }
    });
  }

  restoreAccount() {
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.authService.restoreAccount({ token: this.token }).subscribe({
      next: (response: any) => {
        this.isLoading = false;
        if (response.success) {
          this.restorationComplete = true;
          this.successMessage = response.message;
          
          // Automatically log the user in after successful restoration
          if (response.token) {
            localStorage.setItem('authToken', response.token);
            localStorage.setItem('userData', JSON.stringify({
              username: response.username,
              email: response.email,
              roles: response.roles
            }));
          }
          
          setTimeout(() => {
            this.router.navigate(['/home']);
          }, 3000);
        } else {
          this.errorMessage = response.message || 'Account restoration failed. Please try again.';
        }
      },
      error: (error: any) => {
        this.isLoading = false;
        console.error('Account restoration error:', error);
        this.errorMessage = 'An error occurred while restoring your account. Please try again.';
      }
    });
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }

  goToHome() {
    this.router.navigate(['/home']);
  }
}
