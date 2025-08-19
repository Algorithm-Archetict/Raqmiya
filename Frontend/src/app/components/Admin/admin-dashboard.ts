import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="admin-dashboard">
      <header class="admin-header">
        <div class="hero-background">
          <div class="floating-shapes">
            <div class="shape shape-1"></div>
            <div class="shape shape-2"></div>
            <div class="shape shape-3"></div>
            <div class="shape shape-4"></div>
          </div>
        </div>
        <div class="hero-content">
          <h1 class="hero-title">Admin Dashboard</h1>
          <p class="hero-subtitle">Manage users, products, and platform analytics</p>
          <nav class="admin-nav">
            <a routerLink="/admin/users" routerLinkActive="active" class="btn btn-primary">
              <i class="bi bi-people-fill"></i> Manage Users
            </a>
            <a routerLink="/admin/users/create" routerLinkActive="active" class="btn btn-outline">
              <i class="bi bi-person-plus-fill"></i> Create User
            </a>
          </nav>
        </div>
      </header>
      <main class="admin-content">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [`
    .admin-dashboard {
      min-height: 100vh;
      background: var(--bg-primary);
      background-image: 
        radial-gradient(circle at 20% 80%, rgba(0, 116, 228, 0.2) 0%, transparent 50%),
        radial-gradient(circle at 80% 20%, rgba(108, 43, 217, 0.2) 0%, transparent 50%),
        radial-gradient(circle at 40% 40%, rgba(0, 212, 255, 0.15) 0%, transparent 50%);
      background-attachment: fixed;
    }

    .admin-header {
      position: relative;
      min-height: 60vh;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: var(--spacing-3xl) var(--spacing-lg);
      overflow: hidden;
    }

    .hero-background {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 1;
    }

    .floating-shapes {
      position: absolute;
      width: 100%;
      height: 100%;
      overflow: hidden;
    }

    .shape {
      position: absolute;
      border-radius: 50%;
      background: linear-gradient(45deg, var(--primary-color), var(--secondary-color));
      opacity: 0.1;
      animation: float 6s ease-in-out infinite;
    }

    .shape-1 {
      width: 100px;
      height: 100px;
      top: 20%;
      left: 10%;
      animation-delay: 0s;
    }

    .shape-2 {
      width: 150px;
      height: 150px;
      top: 60%;
      right: 10%;
      animation-delay: 2s;
    }

    .shape-3 {
      width: 80px;
      height: 80px;
      top: 40%;
      right: 30%;
      animation-delay: 4s;
    }

    .shape-4 {
      width: 120px;
      height: 120px;
      bottom: 20%;
      left: 30%;
      animation-delay: 1s;
    }

    .hero-content {
      position: relative;
      z-index: 2;
      max-width: 800px;
    }

    .hero-title {
      font-family: 'Orbitron', sans-serif;
      font-size: 3.5rem;
      font-weight: 900;
      line-height: 1.1;
      margin-bottom: var(--spacing-lg);
      background: var(--gradient-primary);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      text-shadow: 0 0 30px rgba(0, 116, 228, 0.5);
    }

    .hero-subtitle {
      font-size: 1.25rem;
      color: var(--text-secondary);
      margin-bottom: var(--spacing-xl);
      line-height: 1.6;
      font-weight: 400;
    }

    .admin-nav {
      display: flex;
      gap: var(--spacing-lg);
      justify-content: center;
      flex-wrap: wrap;
    }

    .admin-nav .btn {
      padding: var(--spacing-md) var(--spacing-xl);
      font-weight: 600;
      border-radius: var(--radius-lg);
      transition: all var(--transition-normal);
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: var(--spacing-sm);
    }

    .admin-nav .btn i {
      font-size: 1.1rem;
    }

    .admin-nav .btn-primary {
      background: var(--gradient-primary);
      border: none;
      color: var(--text-inverse);
      box-shadow: var(--shadow-glow);
    }

    .admin-nav .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-xl);
    }

    .admin-nav .btn-outline {
      background: transparent;
      border: 2px solid var(--primary-color);
      color: var(--primary-color);
    }

    .admin-nav .btn-outline:hover {
      background: var(--primary-color);
      color: var(--text-inverse);
      transform: translateY(-2px);
    }

    .admin-nav .btn.active {
      background: var(--primary-color);
      color: var(--text-inverse);
      transform: translateY(-2px);
    }

    .admin-content {
      position: relative;
      z-index: 2;
      padding: var(--spacing-2xl) var(--spacing-lg);
    }

    @keyframes float {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-20px); }
    }

    @media (max-width: 768px) {
      .hero-title {
        font-size: 2.5rem;
      }
      
      .hero-subtitle {
        font-size: 1.125rem;
      }
      
      .admin-nav {
        flex-direction: column;
        align-items: center;
      }
      
      .admin-nav .btn {
        width: 100%;
        max-width: 300px;
        justify-content: center;
      }
    }

    @media (max-width: 576px) {
      .hero-title {
        font-size: 2rem;
      }
      
      .admin-header {
        min-height: 50vh;
        padding: var(--spacing-2xl) var(--spacing-md);
      }
    }
  `]
})
export class AdminDashboard {} 