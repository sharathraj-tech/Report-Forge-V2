import { Component, Input, Output, EventEmitter, inject, signal, computed, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DxSelectBoxModule, DxTagBoxModule } from 'devextreme-angular';
import { ReportService } from '../../core/services/report.service';
import type { ChartDefinition, QueryResult } from '../../core/models/report.models';
import { AGG_FUNCTIONS, CHART_TYPES } from '../../core/models/report.models';

@Component({
  selector: 'rf-chart-builder',
  standalone: true,
  imports: [CommonModule, DxSelectBoxModule, DxTagBoxModule],
  template: `
    <div class="chart-builder h-full flex flex-col">
      <div class="chart-config flex items-end gap-3 p-4 bg-elevated border-b">
        <div class="config-field flex flex-col gap-1">
          <label class="label text-3xs">CHART TYPE</label>
          <dx-select-box [items]="chartTypes" displayExpr="label" valueExpr="value" [(value)]="chart.type"></dx-select-box>
        </div>
        <div class="config-field flex flex-col gap-1">
          <label class="label text-3xs">X-AXIS</label>
          <dx-select-box [items]="entityFields()" displayExpr="displayName" valueExpr="name" [(value)]="chart.xAxis"></dx-select-box>
        </div>
        <div class="config-field flex flex-col gap-1 flex-1">
          <label class="label text-3xs">Y-AXIS FIELD</label>
          <dx-select-box [items]="aggFields()" displayExpr="displayName" valueExpr="name" [(value)]="chart.yAxis"></dx-select-box>
        </div>
        <button class="btn btn-primary btn-sm" (click)="runChart()">PREVIEW ANALYTICS</button>
      </div>

      <div class="preview-area flex-1 flex items-center justify-center p-8 bg-base">
        @if (loading()) {
          <div class="spinner-sm"></div>
        } @else if (chartData().length > 0) {
           <div class="card card-solid w-full max-w-lg p-10 text-center animate-pulse">
              <span class="material-icons text-brand" style="font-size: 4rem">analytics</span>
              <div class="title-lg mt-4">Visual Insight Ready</div>
              <p class="text-secondary mt-2">The high-contrast visualization engine is processing {{ chartData().length }} data points.</p>
              <div class="mt-8 flex justify-center gap-2">
                 <div class="h-2 w-12 bg-brand rounded"></div>
                 <div class="h-2 w-8 bg-border rounded"></div>
                 <div class="h-2 w-16 bg-border rounded"></div>
              </div>
           </div>
        } @else {
          <div class="empty-state">
            <span class="material-icons text-muted" style="font-size: 48px">bar_chart</span>
            <div class="empty-title">Ready for Visualization</div>
            <div class="empty-desc">Select axes and run preview to see the high-contrast chart.</div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .chart-builder { height: 100%; }
    .bg-elevated { background: var(--bg-elevated); }
    .card-solid { background: var(--bg-surface); border: 2px solid var(--border-strong); }
    .text-brand { color: var(--brand-primary); }
    .spinner-sm { width: 20px; height: 20px; border: 2px solid var(--border-strong); border-top-color: var(--brand-primary); border-radius: 50%; animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
  `]
})
export class ChartBuilderComponent implements OnChanges {
  @Input() chart!: ChartDefinition;
  @Input() entity = '';
  @Output() chartChange = new EventEmitter<ChartDefinition>();

  svc = inject(ReportService);
  chartTypes = CHART_TYPES;
  aggFunctions = AGG_FUNCTIONS;
  chartData = signal<any[]>([]);
  loading = signal(false);

  entityFields = computed(() => this.svc.getEntityFields(this.entity));
  aggFields = computed(() => this.entityFields().filter(f => f.isAggregatable || f.dataType === 'decimal' || f.dataType === 'int'));

  ngOnChanges() {}

  runChart() {
    if (!this.entity || !this.chart.xAxis || !this.chart.yAxis) return;
    this.loading.set(true);
    const input: any = {
      entity: this.entity,
      columns: [this.chart.xAxis, this.chart.yAxis],
      filters: null,
      groupBy: [this.chart.xAxis],
      aggregations: [{ field: this.chart.yAxis, function: this.chart.aggregation, alias: this.chart.yAxis }],
      page: 1, pageSize: 100
    };
    this.svc.runReport(input).subscribe({
      next: (res: QueryResult | undefined) => {
        if (res) this.chartData.set(res.data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  update(key: keyof ChartDefinition, value: any) { this.chartChange.emit({ ...this.chart, [key]: value }); }
}
