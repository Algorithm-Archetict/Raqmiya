import { Injectable } from '@angular/core';

export type ThemeMode = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private storageKey = 'theme';

  getPreferred(): ThemeMode {
    const saved = localStorage.getItem(this.storageKey);
    if (saved === 'dark' || saved === 'light') return saved as ThemeMode;
    const prefersDark = typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'dark' : 'light';
  }

  apply(theme: ThemeMode): void {
    document.documentElement.setAttribute('data-theme', theme);
  }

  set(theme: ThemeMode): void {
    localStorage.setItem(this.storageKey, theme);
    this.apply(theme);
  }

  toggle(): ThemeMode {
    const next = this.getCurrent() === 'light' ? 'dark' : 'light';
    this.set(next);
    return next;
  }

  getCurrent(): ThemeMode {
    const attr = document.documentElement.getAttribute('data-theme');
    return (attr === 'dark' || attr === 'light') ? (attr as ThemeMode) : this.getPreferred();
  }
}
