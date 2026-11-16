import { Component } from '@angular/core';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterOutlet } from '@angular/router';
import { ErrorBanner } from './error-banner';

@Component({
  selector: 'app-shell',
  imports: [MatToolbarModule, RouterOutlet, ErrorBanner],
  templateUrl: './app-shell.html',
  styleUrl: './app-shell.scss',
})
export class AppShell {}
