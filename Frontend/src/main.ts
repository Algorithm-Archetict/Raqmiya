// src/main.ts
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app'; // Your root component
import { appConfig } from './app/app.config'; // Your application configuration

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));