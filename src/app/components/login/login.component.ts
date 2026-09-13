import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MsalService } from '@azure/msal-angular';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="login-shell">

      <!-- Left panel — hero -->
      <div class="hero-panel">
        <div class="hero-content">
          <img class="hero-logo" src="data:image/png;base64,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" alt="AndesStay logo" />
          <h1 class="hero-title">AndesStay</h1>
          <p class="hero-sub">Plataforma integral de gestión<br>para hostales y cabañas</p>
          <div class="feature-list">
            <div class="feature">
              <span class="feature-icon">📋</span>
              <span>Gestión de reservas en tiempo real</span>
            </div>
            <div class="feature">
              <span class="feature-icon">🏘️</span>
              <span>Catálogo de unidades y disponibilidad</span>
            </div>
            <div class="feature">
              <span class="feature-icon">📊</span>
              <span>KPIs y reportería avanzada</span>
            </div>
            <div class="feature">
              <span class="feature-icon">🔍</span>
              <span>Auditoría completa de eventos</span>
            </div>
          </div>
        </div>
        <div class="hero-deco1"></div>
        <div class="hero-deco2"></div>
      </div>

      <!-- Right panel — form -->
      <div class="form-panel">
        <div class="form-card">
          <img class="form-logo-img" src="data:image/png;base64,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" alt="AndesStay" />
          <h2 class="form-title">Bienvenido</h2>
          <p class="form-sub">Inicia sesión con tu cuenta institucional<br>de Microsoft para continuar.</p>

          <button class="btn-ms" (click)="login()" [disabled]="loading">
            <svg viewBox="0 0 21 21" width="20" height="20" style="flex-shrink:0">
              <rect x="1" y="1"   width="9" height="9" fill="#f25022"/>
              <rect x="11" y="1"  width="9" height="9" fill="#7fba00"/>
              <rect x="1" y="11"  width="9" height="9" fill="#00a4ef"/>
              <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
            </svg>
            <span>{{ loading ? 'Iniciando sesión…' : 'Iniciar sesión con Microsoft' }}</span>
          </button>

          <p class="disclaimer">
            Solo usuarios autorizados pueden acceder.<br>
            Al iniciar sesión aceptas las políticas de uso de AndesStay.
          </p>
        </div>
      </div>

    </div>
  `,
  styles: [`
    * { box-sizing: border-box; }

    .login-shell {
      display: flex;
      height: 100vh;
      font-family: 'Segoe UI', system-ui, sans-serif;
    }

    /* ── Hero (izquierda) ── */
    .hero-panel {
      flex: 1;
      background: linear-gradient(145deg, #26729B 0%, #3A96C4 60%, #4EA8D1 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 48px;
      position: relative;
      overflow: hidden;
    }
    .hero-deco1 {
      position: absolute;
      width: 420px; height: 420px;
      border-radius: 50%;
      background: rgba(191,231,244,0.08);
      bottom: -160px; right: -120px;
    }
    .hero-deco2 {
      position: absolute;
      width: 250px; height: 250px;
      border-radius: 50%;
      background: rgba(191,231,244,0.06);
      top: -80px; left: -60px;
    }
    .hero-content { position: relative; z-index: 1; max-width: 400px; }
    .hero-logo {
      width: 100px;
      height: auto;
      margin-bottom: 16px;
      filter: drop-shadow(0 4px 12px rgba(0,0,0,0.2));
    }
    .hero-title {
      font-size: 42px;
      font-weight: 800;
      color: white;
      margin: 0 0 12px;
      letter-spacing: -1px;
    }
    .hero-sub {
      font-size: 17px;
      color: #BFE7F4;
      margin: 0 0 40px;
      line-height: 1.6;
    }
    .feature-list { display: flex; flex-direction: column; gap: 14px; }
    .feature {
      display: flex;
      align-items: center;
      gap: 12px;
      color: rgba(255,255,255,0.9);
      font-size: 14px;
    }
    .feature-icon {
      font-size: 18px;
      width: 36px; height: 36px;
      background: rgba(255,255,255,0.12);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    /* ── Form (derecha) ── */
    .form-panel {
      width: 460px;
      background: #F9F9F7;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 48px 40px;
    }
    .form-card { width: 100%; max-width: 340px; text-align: center; }
    .form-logo-img {
      width: 72px;
      height: auto;
      margin-bottom: 12px;
    }
    .form-title {
      font-size: 26px;
      font-weight: 700;
      color: #26729B;
      margin: 0 0 8px;
    }
    .form-sub {
      font-size: 14px;
      color: #3A96C4;
      margin: 0 0 36px;
      line-height: 1.6;
    }

    .btn-ms {
      display: flex;
      align-items: center;
      gap: 12px;
      justify-content: center;
      width: 100%;
      padding: 13px 20px;
      background: #26729B;
      color: white;
      border: none;
      border-radius: 10px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      box-shadow: 0 4px 14px rgba(38,114,155,0.3);
    }
    .btn-ms:hover:not(:disabled) {
      background: #3A96C4;
      transform: translateY(-1px);
      box-shadow: 0 6px 20px rgba(58,150,196,0.4);
    }
    .btn-ms:disabled { opacity: 0.6; cursor: not-allowed; }

    .disclaimer {
      margin-top: 24px;
      font-size: 11px;
      color: #78C1E0;
      line-height: 1.6;
    }

    @media (max-width: 700px) {
      .login-shell { flex-direction: column; }
      .hero-panel { flex: none; padding: 40px 24px 32px; }
      .hero-title { font-size: 30px; }
      .feature-list { display: none; }
      .form-panel { width: 100%; flex: 1; }
    }
  `]
})
export class LoginComponent implements OnInit {
  loading = false;

  constructor(private msal: MsalService, private router: Router) {}

  ngOnInit() {
    this.msal.handleRedirectObservable().subscribe({
      next: (result) => {
        if (result) {
          this.msal.instance.setActiveAccount(result.account);
          this.router.navigate(['/dashboard']);
        } else if (this.msal.instance.getActiveAccount()) {
          this.router.navigate(['/dashboard']);
        }
      },
      error: () => {}
    });
  }

  login() {
    this.loading = true;
    this.msal.loginPopup({ scopes: environment.apiConfig.scopes }).subscribe({
      next: (result) => {
        this.msal.instance.setActiveAccount(result.account);
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        console.error('Login error:', err);
        this.loading = false;
      }
    });
  }
}