import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { Notificaciones } from './shared/ui/notificaciones';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Notificaciones],
  templateUrl: './app.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {}
