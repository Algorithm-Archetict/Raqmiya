// src/app/shared/directives/highlight.directive.ts
import { Directive, ElementRef, HostListener, Input } from '@angular/core';
// CommonModule is NOT needed here as directives don't have templates that use it.
// import { CommonModule } from '@angular/common'; // <-- REMOVE THIS LINE IF PRESENT, IT'S NOT NEEDED HERE

@Directive({
  selector: '[appHighlight]', // HTML selector for this directive
  standalone: true,           // Marks it as a standalone directive
  // The 'imports' property is ONLY for @Component, not @Directive.
  // imports: [CommonModule] // <-- REMOVE THIS ENTIRE LINE
  // If you want directive-specific styles, you could use 'host' property like this:
  // host: {
  //   '[style.backgroundColor]': 'highlightColor',
  //   'class': 'my-highlighted-element'
  // }
})
export class HighlightDirective {
  @Input('appHighlight') highlightColor: string = 'yellow'; // Input property to set highlight color

  constructor(private el: ElementRef) {}

  @HostListener('mouseenter') onMouseEnter() {
    this.highlight(this.highlightColor);
  }

  @HostListener('mouseleave') onMouseLeave() {
    this.highlight(''); // Clear highlight
  }

  private highlight(color: string) {
    this.el.nativeElement.style.backgroundColor = color;
  }
}