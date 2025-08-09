import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Navbar } from './components/navbar/navbar';
import { ChatbotComponent } from './components/chatbot/chatbot.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ChatbotComponent, Navbar],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected title = 'Raqmiya-Frontend';
}
