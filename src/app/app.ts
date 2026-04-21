import { Component, signal, inject, effect } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { PreloaderComponent } from './layout/preloader/preloader.component';
import { ProgressBarComponent } from './layout/progress-bar/progress-bar.component';
import { ReportService } from './core/services/report.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, PreloaderComponent, ProgressBarComponent],
  template: `
    <rf-progress-bar />
    <rf-preloader *ngIf="showPreloader()" (loaded)="onPreloaderLoaded()" />
    <router-outlet *ngIf="!showPreloader()" />
  `
})
export class App {
  svc = inject(ReportService);
  showPreloader = signal(true);
  dataReady = signal(false);

  constructor() {
    // Dismiss preloader only when metadata is loaded
    effect(() => {
      if (this.svc.isMetadataLoaded()) {
        this.dataReady.set(true);
      }
    });
  }

  onPreloaderLoaded() {
    this.showPreloader.set(false);
  }
}
