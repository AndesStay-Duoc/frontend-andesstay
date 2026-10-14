import { bootstrapApplication } from '@angular/platform-browser';
import { registerLocaleData } from '@angular/common';
import localeEsCL from '@angular/common/locales/es-CL';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';
import { loadRuntimeConfig } from './app/core/runtime-config';

// Angular trae los datos de formato de en-US y nada mas; el resto hay que registrarlos a mano.
// Sin esto, un pipe con un locale explicito --date:...:'es-CL'-- lanza NG0701 en ejecucion, y esa
// excepcion no se queda en la celda: aborta el renderizado de la fila entera. Se veia en la tabla
// de reservas, que mostraba identificador, unidad y correo y dejaba en blanco todo lo que venia
// despues de la primera fecha, incluido el guion de los campos sin valor.
//
// Se registra antes de bootstrapApplication porque la plantilla puede pedirlo en el primer ciclo
// de deteccion de cambios.
registerLocaleData(localeEsCL, 'es-CL');

// La configuración se resuelve ANTES de arrancar la aplicación: MSALInstanceFactory
// corre durante la construcción de los proveedores de appConfig, o sea antes que
// cualquier APP_INITIALIZER, y necesita la authority y el clientId ya definidos.
loadRuntimeConfig()
  .then(() => bootstrapApplication(AppComponent, appConfig))
  .catch(err => console.error(err));
