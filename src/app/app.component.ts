import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { MsalService, MsalBroadcastService } from '@azure/msal-angular';
import { InteractionStatus } from '@azure/msal-browser';
import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  template: `
    <ng-container *ngIf="!isIframe">
      <router-outlet />
    </ng-container>
  `,
  styles: [`
    :host { display: block; min-height: 100vh; background: #f0f4f8; }
  `]
})
export class AppComponent implements OnInit, OnDestroy {

  isIframe = false;
  private readonly _destroy$ = new Subject<void>();

  constructor(
    private msal: MsalService,
    private broadcast: MsalBroadcastService
  ) {}

  ngOnInit() {
    this.isIframe = window !== window.parent && !window.opener;

    this.msal.instance.enableAccountStorageEvents();

    this.broadcast.inProgress$
      .pipe(
        filter(s => s === InteractionStatus.None),
        takeUntil(this._destroy$)
      )
      .subscribe(() => {
        const accounts = this.msal.instance.getAllAccounts();
        if (accounts.length > 0) {
          this.msal.instance.setActiveAccount(accounts[0]);
        }
      });
  }

  ngOnDestroy() {
    this._destroy$.next();
    this._destroy$.complete();
  }
}
