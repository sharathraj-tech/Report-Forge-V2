import { Routes } from '@angular/router';
import { ShellComponent } from './layout/shell/shell.component';

export const routes: Routes = [
  { path: '', redirectTo: 'developer', pathMatch: 'full' },
  { path: 'developer', component: ShellComponent },
  { path: 'customer', component: ShellComponent },
  { path: 'schema', component: ShellComponent },
  { path: '**', redirectTo: 'developer' }
];
