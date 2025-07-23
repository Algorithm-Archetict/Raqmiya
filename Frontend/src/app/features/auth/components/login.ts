// src/app/features/auth/components/login/login.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router'; // Import Router and RouterLink
import { AuthService } from '../../../core/services/auth';
import { LoginRequest } from '../../../models/auth.model'; // Import the model
import { Alert } from '../../../shared/ui/alert/alert'; // Import standalone Alert component
import { LoadingSpinner } from '../../../shared/ui/loading-spinner/loading-spinner'; // Import standalone LoadingSpinner component

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule, // Needed for reactive forms
    RouterLink,          // Needed for routerLink directive in template
    Alert,               // Import the Alert standalone component
    LoadingSpinner       // Import the LoadingSpinner standalone component
  ],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  isLoading = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  onLogin(): void {
    this.isLoading = true;
    this.errorMessage = null;
    this.successMessage = null;

    if (this.loginForm.valid) {
      const loginPayload: LoginRequest = this.loginForm.value;
      this.authService.login(loginPayload).subscribe({
        next: (response) => {
          this.isLoading = false;
          this.successMessage = response.message || 'Login successful!';
          this.router.navigate(['/products']); // Redirect to products or dashboard on success
        },
        error: (err) => {
          this.isLoading = false;
          console.error('Login error:', err);
          this.errorMessage = err.error?.message || 'Login failed. Please check your credentials.';
        }
      });
    } else {
      this.isLoading = false;
      this.errorMessage = 'Please fill out all required fields correctly.';
    }
  }
}
