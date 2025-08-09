import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-dashboard-redirect',
  standalone: true,
  imports: [CommonModule],
  template: '<p>Redirecting…</p>'
})
export class DashboardRedirect implements OnInit {
  constructor(private auth: AuthService, private router: Router) {}

  ngOnInit(): void {
    if (!this.auth.isLoggedIn()) {
      this.router.navigate(['/auth/login']);
      return;
    }
    if (this.auth.isAdmin()) {
      this.router.navigate(['/admin']);
    } else if (this.auth.isCreator()) {
      this.router.navigate(['/products']);
    } else {
      this.router.navigate(['/purchased-products']);
    }
  }
}
