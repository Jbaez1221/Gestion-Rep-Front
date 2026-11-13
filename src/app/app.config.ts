import { DATE_PIPE_DEFAULT_OPTIONS, registerLocaleData } from '@angular/common';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import localeEsPe from '@angular/common/locales/es-PE';
import {
  ApplicationConfig,
  DEFAULT_CURRENCY_CODE,
  LOCALE_ID,
  isDevMode,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';

import { routes } from './app.routes';
import { idSolicitudInterceptor } from './core/http/id-solicitud.interceptor';
import { sesionInterceptor } from './core/http/sesion.interceptor';

registerLocaleData(localeEsPe);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled' }),
    ),
    provideHttpClient(withFetch(), withInterceptors([idSolicitudInterceptor, sesionInterceptor])),
    { provide: LOCALE_ID, useValue: 'es-PE' },
    { provide: DEFAULT_CURRENCY_CODE, useValue: 'PEN' },
    // Lima no tiene horario de verano: UTC-5 todo el año.
    {
      provide: DATE_PIPE_DEFAULT_OPTIONS,
      useValue: { timezone: '-0500', dateFormat: 'dd/MM/yyyy' },
    },
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};
