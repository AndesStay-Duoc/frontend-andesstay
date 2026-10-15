import { AfterViewInit, Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { IconoComponent } from '../icono/icono.component';

/**
 * Confirmación con el diseño de la app, en lugar del confirm() del navegador. Mismo efecto: quien
 * la usa solo actúa si se emite «confirmar».
 *
 * El foco arranca en «Volver», no en la acción: en una confirmación destructiva, un Enter apurado
 * no debe ejecutar lo que no se quería.
 */
@Component({
  selector: 'app-dialogo-confirmacion',
  standalone: true,
  imports: [IconoComponent],
  template: `
    <div class="modal-fondo" (click)="cancelar.emit()">
      <div class="modal dialogo" role="alertdialog" aria-modal="true" aria-labelledby="dlg-titulo" aria-describedby="dlg-mensaje"
           (click)="$event.stopPropagation()" (keydown.escape)="cancelar.emit()">
        <div class="cuerpo">
          <span class="icono" [class.peligro]="peligro"><app-icono [nombre]="icono" [tamano]="26" /></span>
          <div>
            <h2 id="dlg-titulo">{{ titulo }}</h2>
            <p id="dlg-mensaje">{{ mensaje }}</p>
          </div>
        </div>
        <div class="modal-pie">
          <button #volver type="button" class="btn btn-texto" (click)="cancelar.emit()">{{ textoCancelar }}</button>
          <button type="button" class="btn" [class.btn-peligro]="peligro" [class.btn-primario]="!peligro"
                  (click)="confirmar.emit()">{{ textoConfirmar }}</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dialogo { max-width: 460px; }
    .cuerpo { display: flex; gap: 16px; padding: 22px; }
    .icono { display: grid; place-items: center; flex-shrink: 0; width: 48px; height: 48px; border-radius: 50%;
      background: var(--c-crema); color: var(--c-petroleo); }
    .icono.peligro { color: var(--danger); }
    h2 { margin-bottom: 6px; font-size: 21px; }
    p { color: var(--text-muted); white-space: pre-line; }
  `]
})
export class DialogoConfirmacionComponent implements AfterViewInit {
  @Input({ required: true }) titulo = '';
  @Input() mensaje = '';
  @Input() textoConfirmar = 'Confirmar';
  @Input() textoCancelar = 'Volver';
  @Input() icono = 'help';
  /** Acción destructiva o irreversible: botón rojo de contorno e ícono en rojo. */
  @Input() peligro = false;
  @Output() confirmar = new EventEmitter<void>();
  @Output() cancelar = new EventEmitter<void>();

  @ViewChild('volver') private volver?: ElementRef<HTMLButtonElement>;

  ngAfterViewInit() {
    this.volver?.nativeElement.focus();
  }
}
