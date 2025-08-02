import { Component } from '@angular/core';
import { Navbar } from '../navbar/navbar';
import { Footer } from '../footer/footer';
import { Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
declare var bootstrap: any;

@Component({
  selector: 'app-home',
  imports: [Navbar, Footer, RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class Home {
  isLoggedIn: boolean = false;
  currentUser: any = null;
  // isUserDropdownOpen: boolean = false;
  private authSubscription: Subscription = new Subscription();

   constructor(
    private authService: AuthService,
    private router: Router
  ) {}

    ngOnInit() {
    // Subscribe to authentication status changes
    this.authSubscription.add(
      this.authService.isLoggedIn$.subscribe(isLoggedIn => {
        this.isLoggedIn = isLoggedIn;
      })
    );

    this.authSubscription.add(
      this.authService.currentUser$.subscribe(user => {
        this.currentUser = user;
      })
    );
  }

  ngOnDestroy() {
    this.authSubscription.unsubscribe();
  }

  // redirectUser() {
  //   if (this.isLoggedIn) {
  //     if (this.authService.isCreator()) {
  //       this.router.navigate(['/products']);
  //     } else {
  //       const modalElement = document.getElementById('creatorPromptModal');
  //       if (modalElement) {
  //         const modal = new bootstrap.Modal(modalElement);
  //         modal.show();
  //       }
  //     }
  //   } else {
  //     this.router.navigate(['/auth/register']);
  //   }
  // }

  //   goToRegister() {
  //   this.router.navigate(['/auth/register']);
  // }
}
