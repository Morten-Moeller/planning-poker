import { Component } from '@angular/core';

const PIECES = 16;

@Component({
  selector: 'app-confetti',
  templateUrl: './confetti.html',
  styleUrl: './confetti.scss',
  host: { 'aria-hidden': 'true' },
})
export class Confetti {
  protected readonly pieces = Array.from({ length: PIECES }, (_, index) => index);
}
