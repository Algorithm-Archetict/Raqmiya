import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-forbidden',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './forbidden.html',
  styleUrl: './forbidden.css'
})
export class Forbidden {
  reason: string | null = null;

  constructor(private route: ActivatedRoute, private router: Router) {
    this.route.queryParamMap.subscribe((p) => {
      this.reason = p.get('reason');
    });
  }

  requestAccess() {
    // For now, navigate to a contact/support page or open mailto. Can be wired to a request workflow later.
    this.router.navigate(['/settings']);
  }

  goBack() {
    this.router.navigate(['/home']);
  }
}
