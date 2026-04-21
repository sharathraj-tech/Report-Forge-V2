import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReportService } from '../../core/services/report.service';
import { DashboardService } from '../../core/services/dashboard.service';

@Component({
  selector: 'rf-progress-bar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed top-0 left-0 right-0 h-0.5 z-[10000] pointer-events-none overflow-hidden" *ngIf="isLoading()">
      <div class="h-full bg-brand-blue shadow-[0_0_8px_rgba(37,99,235,0.5)] animate-progress-ind"></div>
    </div>
  `,
  styles: [`
    @keyframes progress-ind {
      0% { transform: translateX(-100%); width: 30%; }
      50% { width: 50%; }
      100% { transform: translateX(400%); width: 20%; }
    }
    .animate-progress-ind {
      animation: progress-ind 1.5s infinite ease-in-out;
    }
  `]
})
export class ProgressBarComponent {
  reportSvc = inject(ReportService);
  dashSvc = inject(DashboardService);

  isLoading() {
    return this.reportSvc.loading() || this.dashSvc.loading();
  }
}
