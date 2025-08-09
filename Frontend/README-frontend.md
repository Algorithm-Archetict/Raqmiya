# Raqmiya Frontend – UI/UX and Role-based Flow

This document summarizes the UI/UX improvements and role-based access implemented in the Angular app.

## Summary of Changes
- Role guards added: AuthGuard, AdminGuard, CreatorGuard, CustomerGuard, AnonymousOnlyGuard, and a generic RoleGuard.
- Admin area added with placeholder pages: Admin Dashboard, Users, Content, and Settings.
- DashboardRedirect component routes users to the appropriate area based on role.
- Navbar shows Admin link only for admins and creator actions only for creators.
- Auth interceptor unified redirect to /auth/login on 401.

## Role-based Views
- Anonymous: Home, Discover, Product details, Login/Register. Restricted from protected routes.
- Customer: Library, Purchased products, Checkout. Dashboard link routes to Library by default.
- Creator: Creator dashboard, Products CRUD, Sales.
- Admin: Admin dashboard, Users, Content moderation, System settings.

## Routing Overview
- /auth/login, /auth/register are accessible only to anonymous users (AnonymousOnlyGuard).
- /dashboard sends users to:
  - Admin -> /admin
  - Creator -> /products
  - Customer -> /purchased-products
- /admin/* routes protected by AdminGuard.
- Creator pages protected by CreatorGuard.
- Other protected routes require AuthGuard.

## Endpoint Mapping (high-level)
- Auth: POST /api/auth/login, GET /api/users/me, GET /api/auth/validate-token
- Users: GET/PUT /api/users/me, POST /api/users/me/change-password, POST /api/users/me/upload-image
- Products: GET /api/products (discover), creator CRUD under /api/products/*
- Admin (to be wired): /api/admin/users, /api/admin/content, /api/admin/settings

## Maintenance / Extensibility
- Add new role-protected routes by using RoleGuard with data: { roles: ['Admin'] } or a specific guard.
- Keep components standalone or lazy-load feature modules for larger sections.
- Use services under src/app/core/services for API calls; normalize backend responses as in AuthService.

## Accessibility & UX
- Navigation shows only actions relevant to the current user role.
- Error states surfaced via alerts; loading states used in forms.

## Next Steps
- Wire admin pages to actual API endpoints.
- Add unit tests for guards and DashboardRedirect.
- Add lazy-loaded feature modules for admin and creator sections to optimize performance.
