// src/app/shared/pipes/capitalize.pipe.ts
import { Pipe, PipeTransform } from '@angular/core';
// CommonModule is NOT needed here as pipes don't have templates that use it.
// import { CommonModule } from '@angular/common'; // <-- REMOVE THIS LINE IF PRESENT, IT'S NOT NEEDED HERE

@Pipe({
  name: 'capitalize', // Name to use in templates: {{ value | capitalize }}
  standalone: true,    // Marks it as a standalone pipe
  // The 'imports' property is ONLY for @Component, not @Pipe.
  // imports: [CommonModule] // <-- REMOVE THIS ENTIRE LINE
})
export class CapitalizePipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (value === null || value === undefined || value.length === 0) {
      return '';
    }
    return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
  }
}