import { Component, signal } from '@angular/core';
//import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  //standalone: false,
  //imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('Frontend');
}
