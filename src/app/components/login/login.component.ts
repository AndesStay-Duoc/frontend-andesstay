import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MsalService } from '@azure/msal-angular';
import { AuthService } from '../../services/auth.service';
import { AuthErrorInfo, describeAuthError, takeAuthError } from '../../services/auth-error';
import { getRuntimeConfig } from '../../core/runtime-config';
import { IconoComponent } from '../../shared/icono/icono.component';
import { FondoComponent } from '../../shared/fondo/fondo.component';
import { LogoComponent } from '../../shared/logo/logo.component';

// Pantalla compartida por todos los roles. Solo cambió la presentación: el inicio de sesión sigue
// siendo el redirect de MSAL de siempre, sin campos propios de correo ni contraseña.
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [IconoComponent, FondoComponent, LogoComponent],
  template: `
    <main class="login">

      <section class="lado-form">
        <app-logo />

        <div class="cuerpo">
          <p class="kicker">Alojamientos en el sur de Chile</p>
          <h1>Te damos la bienvenida</h1>
          <p class="sub">
            Cabañas, habitaciones y lodges entre lagos y volcanes.
            Ingresa para reservar o gestionar tu estadía.
          </p>

          <ul class="quienes" aria-label="Quién puede ingresar">
            <li><app-icono nombre="luggage" [tamano]="18" />Huéspedes con su correo personal</li>
            <li><app-icono nombre="badge" [tamano]="18" />Personal con su cuenta institucional</li>
          </ul>

          @if (authError) {
            <div class="aviso aviso-error" role="alert">
              <app-icono nombre="error" [tamano]="22" />
              <div>
                <strong>{{ authError.title }}</strong>
                {{ authError.detail }}
                @if (authError.code) {
                  <small>Código: {{ authError.code }}</small>
                }
              </div>
            </div>
          }

          <button class="btn btn-primario btn-bloque btn-ms" (click)="login()" [disabled]="loading">
            <svg viewBox="0 0 21 21" width="22" height="22" aria-hidden="true">
              <rect x="1" y="1"   width="9" height="9" fill="#f25022"/>
              <rect x="11" y="1"  width="9" height="9" fill="#7fba00"/>
              <rect x="1" y="11"  width="9" height="9" fill="#00a4ef"/>
              <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
            </svg>
            <span>{{ loading ? 'Iniciando sesión…' : 'Iniciar sesión con Microsoft' }}</span>
          </button>

          <p class="divisor">¿Primera vez?</p>
          <p class="pista">
            Sirve cualquier correo (Gmail, Yahoo o de empresa). En la pantalla de Microsoft escribe tu
            correo y elige «Crear una cuenta»: te llegará un código de verificación a ese correo.
            No necesitas una cuenta Microsoft.
          </p>
          <button class="btn btn-secundario btn-bloque" (click)="registerAsCliente()" [disabled]="loading">
            Crear cuenta <app-icono nombre="arrow_forward" [tamano]="18" />
          </button>

          <p class="legal">
            Solo usuarios autorizados pueden acceder.
            Al iniciar sesión aceptas las políticas de uso de AndesStay.
          </p>
        </div>
      </section>

      <section class="lado-arte" aria-hidden="true">
        <app-fondo region="organico" />
        <div class="postal">
          <img src="assets/img/login/ilustracion-cabana.svg" alt="" />
        </div>
        <div class="sello">
          <strong>Pucón · Puerto Varas</strong>
          <span>Despierta frente al volcán, con el lago a tus pies.</span>
        </div>
      </section>

    </main>
  `,
  styles: [`
    :host { display: block; min-height: 100vh; background: var(--c-crema); }
    .login { min-height: 100vh; display: grid; grid-template-columns: minmax(360px, 1fr) 1.15fr; }

    .lado-form { display: flex; flex-direction: column; padding: 32px clamp(24px, 6vw, 72px); background: var(--surface); }
    .cuerpo { flex: 1; width: 100%; max-width: 400px; margin: 0 auto; padding: 40px 0;
      display: flex; flex-direction: column; justify-content: center; }
    .kicker { margin-bottom: 10px; font-size: 13px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--brand); }
    h1 { margin-bottom: 10px; font-size: clamp(30px, 4vw, 40px); }
    .sub { margin-bottom: 22px; color: var(--text-muted); }

    .quienes { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 24px; list-style: none; }
    .quienes li { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 999px;
      background: var(--c-crema); font-size: 13px; font-weight: 700; }
    .quienes app-icono { color: var(--brand); }

    .aviso { margin-bottom: 18px; }
    .btn-ms { gap: 12px; padding: 14px 22px; font-size: 16px; }
    .btn-ms svg { flex-shrink: 0; padding: 3px; border-radius: 4px; background: var(--c-blanco); }

    .divisor { display: flex; align-items: center; gap: 12px; margin: 28px 0 12px;
      font-size: 13px; font-weight: 700; color: var(--text-muted); }
    .divisor::before, .divisor::after { content: ''; flex: 1; height: 1px; background: var(--border); }
    .pista { margin-bottom: 14px; font-size: 13px; color: var(--text-muted); }
    .legal { margin-top: 28px; font-size: 12px; color: var(--text-muted); }

    .lado-arte { position: relative; overflow: hidden; display: grid; place-items: center; padding: 48px; }
    .postal { position: relative; width: min(380px, 80%); aspect-ratio: 4 / 5; overflow: hidden;
      border: 10px solid var(--c-crema); border-radius: var(--radius-lg); background: var(--c-crema);
      box-shadow: 0 24px 60px rgba(0, 0, 0, .35); }
    .postal img { display: block; width: 100%; height: 100%; object-fit: cover; border-radius: 12px; }
    .sello { position: absolute; left: 12%; bottom: 10%; max-width: 260px; padding: 14px 18px;
      border-radius: var(--radius); background: var(--c-petroleo); color: var(--c-crema); box-shadow: var(--shadow-2); }
    .sello strong { display: block; font-family: var(--font-display); font-size: 20px; }
    .sello span { font-size: 13px; }

    /* Celular: el arte pasa arriba como franja y el formulario empieza bajo ella */
    @media (max-width: 860px) {
      .login { grid-template-columns: 1fr; grid-template-rows: auto 1fr; }
      .lado-arte { order: -1; min-height: 200px; padding: 24px 16px; }
      .postal { width: 140px; border-width: 6px; }
      .sello { display: none; }
      .lado-form { padding: 20px 16px 28px; }
      .cuerpo { justify-content: flex-start; padding: 20px 0 0; }
    }
  `]
})
export class LoginComponent implements OnInit {
  loading = false;
  /** Error de Azure AD a mostrar (del redirect anterior o del intento actual). */
  authError: AuthErrorInfo | null = null;

  constructor(private msal: MsalService, private auth: AuthService, private router: Router) {}

  ngOnInit() {
    // Si el redirect de Azure AD falló en APP_INITIALIZER, el error quedó guardado.
    this.authError = takeAuthError();

    // La respuesta de Azure AD ya se procesó en el APP_INITIALIZER (app.config.ts).
    // Si al terminar hay sesión, el usuario no necesita ver el login.
    this.auth.whenReady().subscribe(() => {
      if (this.auth.isAuthenticated()) {
        this.router.navigate(['/dashboard']);
      }
    });
  }

  /**
   * Login con redirect (Authorization Code + PKCE). Se piden los scopes de la API
   * para que el primer access token ya sirva para llamar al API Gateway / BFF.
   * Consistente con InteractionType.Redirect del guard y el interceptor.
   */
  login() {
    this.startRedirect('select_account');
  }

  /**
   * "Crear cuenta": el tenant es Entra ID (workforce), que no tiene authority de user
   * flow como B2C ni admite prompt=create. El registro lo dispara Entra cuando el
   * correo ingresado no existe en el directorio y la aplicación está asociada al user
   * flow de auto-registro de invitados (código de un solo uso enviado al correo).
   * prompt=login fuerza a escribir el correo aunque haya otra sesión de Microsoft abierta.
   * El rol Cliente no se asigna en Azure: lo deriva el backend para cuentas invitadas.
   */
  registerAsCliente(): void {
    this.startRedirect('login');
  }

  private startRedirect(prompt: 'select_account' | 'login'): void {
    this.loading = true;
    this.authError = null;
    this.msal.loginRedirect({
      scopes: getRuntimeConfig().scopes,
      prompt
    }).subscribe({
      error: (err) => {
        console.error('Error al iniciar el redirect a Azure AD:', err);
        this.authError = describeAuthError(err);
        this.loading = false;
      }
    });
  }
}
