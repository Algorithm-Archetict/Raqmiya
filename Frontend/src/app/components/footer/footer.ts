import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-footer',
  imports: [RouterModule, FormsModule, CommonModule],
  templateUrl: './footer.html',
  styleUrl: './footer.css'
})
export class Footer {
  Year: number = new Date().getFullYear();
  newsletterEmail: string = '';
  newsletterMessage: string | null = null;

  subscribeNewsletter() {
    const email = (this.newsletterEmail || '').trim();
    const re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(".+"))@(([^<>()[\]\\.,;:\s@\"]+\.)+[^<>()[\]\\.,;:\s@\"]{2,})$/i;
    if (!email || !re.test(email)) {
      this.newsletterMessage = 'Please enter a valid email address.';
      setTimeout(() => this.newsletterMessage = null, 3500);
      return;
    }

    // For now, mock subscribe (client-side) — in future call API
    this.newsletterMessage = 'Thanks — check your inbox to confirm subscription.';
    this.newsletterEmail = '';
    setTimeout(() => this.newsletterMessage = null, 4500);
  }
}
