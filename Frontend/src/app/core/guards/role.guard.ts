import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({ providedIn: 'root' })
export class RoleGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | UrlTree {
    const requiredRoles = (route.data?.['roles'] as string[]) || [];

    if (!this.auth.isLoggedIn()) {
      return this.router.createUrlTree(['/auth/login'], { queryParams: { returnUrl: state.url } });
    }

    if (requiredRoles.length === 0) {
      return true;
    }

    const has = requiredRoles.some(r => this.auth.hasRole(r));
    if (has) return true;

  // If logged-in but lacks role: send to forbidden page
  return this.router.createUrlTree(['/forbidden'], { queryParams: { reason: 'role' } });
  }
}
