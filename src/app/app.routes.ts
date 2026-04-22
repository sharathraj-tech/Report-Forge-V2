import { Routes } from '@angular/router';
import { ShellComponent } from './layout/shell/shell.component';

export const routes: Routes = [
  { 
    path: '', 
    component: ShellComponent,
    children: [
      { path: '', redirectTo: 'developer', pathMatch: 'full' },
      { 
        path: 'developer', 
        loadComponent: () => import('./features/report-designer/report-designer.component').then(m => m.ReportDesignerComponent) 
      },
      { 
        path: 'customer', 
        loadComponent: () => import('./features/query-module/query-module.component').then(m => m.QueryModuleComponent) 
      },
      { 
        path: 'schema', 
        loadComponent: () => import('./features/schema-manager/schema-manager.component').then(m => m.SchemaManagerComponent) 
      },
      { 
        path: 'embed', 
        loadComponent: () => import('./features/embed/embed-manager.component').then(m => m.EmbedManagerComponent) 
      }
    ]
  },
  { path: '**', redirectTo: '' }
];
