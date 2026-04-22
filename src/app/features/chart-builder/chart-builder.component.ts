import { Component, Input, Output, EventEmitter, inject, signal, computed, OnChanges, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DxSelectBoxModule, DxTagBoxModule, DxValidatorModule, DxValidationGroupModule, DxValidationGroupComponent } from 'devextreme-angular';
import { ReportService } from '../../core/services/report.service';
import { NotificationService } from '../../core/services/notification.service';
import type { ChartDefinition, QueryResult } from '../../core/models/report.models';
import { AGG_FUNCTIONS, CHART_TYPES } from '../../core/models/report.models';

@Component({
  selector: 'rf-chart-builder',
  standalone: true,
  imports: [CommonModule, DxSelectBoxModule, DxTagBoxModule, DxValidatorModule, DxValidationGroupModule],
  template: `
    <div class="h-full flex flex-col bg-slate-50/20 anim-fade">
      <!-- Compact Config Toolbar -->
      <dx-validation-group #validationGroup>
        <div class="flex items-center gap-4 p-3 bg-white border-b border-slate-200 shrink-0 shadow-sm z-10">
          <div class="flex flex-col gap-1">
            <label class="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Visualization</label>
            <dx-select-box 
              [items]="chartTypes" 
              displayExpr="label" 
              valueExpr="value" 
              [(value)]="chart.type"
              class="compact-select w-36">
              <dx-validator><dxi-validation-rule type="required"></dxi-validation-rule></dx-validator>
            </dx-select-box>
          </div>
          
          <div class="flex flex-col gap-1 flex-1">
            <label class="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Dimension (X-Axis)</label>
            <dx-select-box 
              [items]="entityFields()" 
              displayExpr="displayName" 
              valueExpr="name" 
              [(value)]="chart.xAxis"
              [searchEnabled]="true"
              placeholder="Select axis..."
              class="compact-select">
              <dx-validator><dxi-validation-rule type="required" message="Required"></dxi-validation-rule></dx-validator>
            </dx-select-box>
          </div>

          <div class="flex flex-col gap-1 flex-1">
            <label class="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Measure (Y-Axis)</label>
            <dx-select-box 
              [items]="aggFields()" 
              displayExpr="displayName" 
              valueExpr="name" 
              [(value)]="chart.yAxis"
              [searchEnabled]="true"
              placeholder="Select field..."
              class="compact-select">
              <dx-validator><dxi-validation-rule type="required" message="Required"></dxi-validation-rule></dx-validator>
            </dx-select-box>
          </div>

          <div class="flex flex-col gap-1">
            <label class="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Aggregation</label>
            <dx-select-box 
              [items]="aggFunctions" 
              displayExpr="label" 
              valueExpr="value" 
              [(value)]="chart.aggregation"
              class="compact-select w-28"></dx-select-box>
          </div>

          <div class="pt-4">
            <button class="rf-compact-btn-primary h-8 px-5 shadow-sm" (click)="onPreviewClick()">
              <div class="flex items-center gap-1.5">
                <span class="material-icons text-sm" [class.animate-spin]="loading()">{{ loading() ? 'sync' : 'auto_graph' }}</span>
                <span class="text-[9px] font-black uppercase">{{ loading() ? 'PROCESSING' : 'PREVIEW' }}</span>
              </div>
            </button>
          </div>
        </div>
      </dx-validation-group>

      <!-- Preview Canvas -->
      <div class="flex-1 flex items-center justify-center p-12 overflow-hidden relative">
        @if (loading()) {
           <div class="absolute inset-0 bg-slate-50/30 flex items-center justify-center z-10 backdrop-blur-[1px]">
              <div class="flex flex-col items-center gap-4">
                 <div class="w-12 h-12 border-2 border-slate-200 border-t-brand-primary rounded-full animate-spin"></div>
                 <span class="text-[10px] font-black text-slate-500 uppercase tracking-widest animate-pulse">Computing Insight Layers...</span>
              </div>
           </div>
        }

        @if (chartData().length > 0) {
           <div class="bg-white rounded-3xl border border-slate-200 w-full max-w-2xl p-16 text-center shadow-2xl anim-fade-scale relative overflow-hidden group">
              <!-- Decorative background element -->
              <div class="absolute -top-24 -right-24 w-48 h-48 bg-slate-50 rounded-full opacity-50 group-hover:scale-110 transition-transform duration-700"></div>
              
              <div class="w-20 h-20 rounded-2xl bg-slate-900 flex items-center justify-center mx-auto mb-8 shadow-xl relative z-10">
                <span class="material-icons text-white text-4xl">insights</span>
              </div>
              
              <div class="relative z-10">
                 <h2 class="text-2xl font-black text-slate-900 tracking-tight uppercase leading-none">Visualization Validated</h2>
                 <p class="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mt-4 opacity-60">Insight Manifest</p>
                 
                 <div class="mt-8 grid grid-cols-2 gap-4 max-w-xs mx-auto">
                    <div class="bg-slate-50 p-3 rounded-xl border border-slate-100">
                       <span class="text-[8px] font-black text-slate-400 uppercase block mb-1">Observation Points</span>
                       <span class="text-lg font-black text-slate-900">{{ chartData().length }}</span>
                    </div>
                    <div class="bg-slate-50 p-3 rounded-xl border border-slate-100">
                       <span class="text-[8px] font-black text-slate-400 uppercase block mb-1">Asset Mode</span>
                       <span class="text-xs font-black text-brand-primary uppercase">{{ chart.type }}</span>
                    </div>
                 </div>

                 <div class="mt-10 flex justify-center gap-2">
                    @for (dot of [1,2,3,4,5]; track dot) {
                       <div class="h-1.5 rounded-full transition-all duration-500" 
                            [class.w-12]="dot === 1" [class.bg-brand-primary]="dot === 1"
                            [class.w-2]="dot !== 1" [class.bg-slate-200]="dot !== 1"></div>
                    }
                 </div>
              </div>
           </div>
        } @else if (!loading()) {
           <div class="flex flex-col items-center gap-6 text-slate-300 anim-fade">
             <div class="w-24 h-24 rounded-[2.5rem] bg-white border border-slate-100 shadow-sm flex items-center justify-center">
                <span class="material-icons text-6xl opacity-20">query_stats</span>
             </div>
             <div class="text-center max-w-sm">
               <h3 class="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">Analytics Sandbox</h3>
               <p class="text-[10px] font-bold text-slate-400 uppercase mt-2 leading-relaxed opacity-60">Map dimensions and measures from the source entity to generate a visual data manifest.</p>
             </div>
           </div>
        }
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; height: 100%; }
    ::ng-deep .compact-select .dx-texteditor-input { padding: 6px 10px !important; font-size: 11px !important; font-weight: 600 !important; color: #1e293b !important; }
    ::ng-deep .compact-select { border-radius: 6px !important; border-color: #e2e8f0 !important; }
  `]
})
export class ChartBuilderComponent implements OnChanges {
  @Input() chart!: ChartDefinition;
  @Input() entity = '';
  @Output() chartChange = new EventEmitter<ChartDefinition>();

  svc = inject(ReportService);
  notify = inject(NotificationService);
  chartTypes = CHART_TYPES;
  aggFunctions = AGG_FUNCTIONS;
  chartData = signal<any[]>([]);
  loading = signal(false);

  @ViewChild('validationGroup', { static: false }) validationGroup?: DxValidationGroupComponent;

  entityFields = computed(() => this.svc.getEntityFields(this.entity));
  aggFields = computed(() => this.entityFields().filter(f => f.isAggregatable || f.dataType === 'decimal' || f.dataType === 'int'));

  ngOnChanges() {
     // Reset if entity changes
     this.chartData.set([]);
  }

  onPreviewClick() {
     const res = this.validationGroup?.instance.validate();
     if (res?.isValid) {
        this.runChart();
     } else {
        this.notify.validationWarning('Please configure all axes before generating visualization.');
     }
  }

  runChart() {
    if (!this.entity || !this.chart.xAxis || !this.chart.yAxis) return;
    this.loading.set(true);
    this.chartData.set([]);

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
      error: () => {
         this.loading.set(false);
         this.notify.error('Data pipeline failed. Check console for logs.');
      }
    });
  }

  update(key: keyof ChartDefinition, value: any) { 
    this.chartChange.emit({ ...this.chart, [key]: value }); 
  }
}
