import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';
import { loadRuntimeConfig } from './app/core/runtime-config';

// La configuración se resuelve ANTES de arrancar la aplicación: MSALInstanceFactory
// corre durante la construcción de los proveedores de appConfig, o sea antes que
// cualquier APP_INITIALIZER, y necesita la authority y el clientId ya definidos.
loadRuntimeConfig()
  .then(() => bootstrapApplication(AppComponent, appConfig))
  .catch(err => console.error(err));
