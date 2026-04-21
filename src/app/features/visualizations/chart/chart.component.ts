import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DxChartModule, DxPieChartModule } from 'devextreme-angular';
import { ChartDefinition } from '../../../core/models/report.models';

@Component({
  selector: 'app-chart',
  standalone: true,
  imports: [CommonModule, DxChartModule, DxPieChartModule],
  template: `
    <div class="chart-container anim-fade-in">
      @if (data && data.length > 0) {
        <div class="card card-solid flex items-center justify-center p-8 bg-surface border hover-elevate">
           <div class="text-center">
              <span class="material-icons text-brand" style="font-size: 3rem">insights</span>
              <div class="title-md mt-2">Visualization Engine Finalizing...</div>
              <p class="text-xs text-secondary mt-1">Data ready for rendering ({{ data.length }} nodes found)</p>
           </div>
        </div>
      } @else {
        <div class="empty-state chart-empty">
          <span class="material-icons empty-icon">leaderboard</span>
          <div class="empty-title">No Chart Data</div>
          <div class="empty-desc">Ensure your query has valid X and Y axis fields selected.</div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; width: 100%; height: 100%; min-height: 300px; }
    .chart-container { width: 100%; height: 100%; padding: var(--space-4); }
    .chart-empty { height: 100%; background: var(--bg-surface); border-radius: var(--radius-lg); }
    .card-solid { background: var(--bg-surface); border: 1px solid var(--border-strong); height: 100%; width: 100%; }
  `]
})
export class ChartComponent implements OnChanges {
  @Input() config: ChartDefinition = { type: 'bar', xAxis: '', yAxis: '', aggregation: 'SUM' };
  @Input() data: any[] = [];
  ngOnChanges(changes: SimpleChanges): void {}
}
