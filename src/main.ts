import { bootstrapApplication } from '@angular/platform-browser';

import { App } from './app/app';
import { appConfig } from './app/app.config';
import { registrarPoliticaTrustedTypes } from './app/core/seguridad/politica-trusted-types';

registrarPoliticaTrustedTypes();

bootstrapApplication(App, appConfig).catch((err: unknown) => console.error(err));
