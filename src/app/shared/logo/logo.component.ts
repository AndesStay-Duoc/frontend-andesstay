import { Component, Input } from '@angular/core';

/**
 * Logo de AndesStay con contraste garantizado.
 *
 * El logo es celeste y blanco: sobre fondos claros se perdía. Por eso siempre va sobre petróleo,
 * en una placa con el nombre («placa») o en un cuadro solo con el símbolo («cuadro», para la
 * barra lateral del personal).
 */
@Component({
  selector: 'app-logo',
  standalone: true,
  template: `
    @if (variante === 'placa') {
      <span class="placa" [class.grande]="grande">
        <img src="assets/img/logo-andesstay.png" alt="" />
        <span class="nombre">AndesStay</span>
      </span>
    } @else {
      <span class="cuadro">
        <img src="assets/img/logo-andesstay.png" alt="AndesStay" />
      </span>
    }
  `,
  styles: [`
    :host { display: inline-flex; flex: none; }
    .placa {
      display: inline-flex; align-items: center; gap: 10px;
      padding: 6px 16px 6px 8px; border-radius: 999px;
      background: var(--c-petroleo); color: var(--c-crema);
    }
    .placa img { display: block; height: 30px; width: auto; }
    .nombre { font-family: var(--font-display); font-size: 18px; font-weight: 600; letter-spacing: -.01em; }
    .placa.grande { padding: 10px 22px 10px 12px; }
    .placa.grande img { height: 46px; }
    .placa.grande .nombre { font-size: 26px; }
    .cuadro {
      display: grid; place-items: center; width: 48px; height: 48px;
      border-radius: 12px; background: rgba(253, 240, 213, .08);
    }
    .cuadro img { display: block; width: 40px; height: auto; }
  `]
})
export class LogoComponent {
  @Input() variante: 'placa' | 'cuadro' = 'placa';
  @Input() grande = false;
}
