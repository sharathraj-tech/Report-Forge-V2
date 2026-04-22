import { Component, Input, Output, EventEmitter, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DxDraggableModule, DxResizableModule, DxTextBoxModule, DxValidatorModule } from 'devextreme-angular';
import { ReportGridComponent } from '../report-runner/report-grid/report-grid.component';
import { ChartComponent } from '../visualizations/chart/chart.component';
import { PivotGridComponent } from '../visualizations/pivot-grid/pivot-grid.component';
import { ReportService } from '../../core/services/report.service';
import type { DashboardWidget } from '../../core/models/dashboard.models';
import type { ReportDefinition, GridDefinition, ChartDefinition } from '../../core/models/report.models';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

@Component({
  selector: 'rf-dashboard-widget',
  standalone: true,
  imports: [
    CommonModule, 
    DxDraggableModule, 
    DxResizableModule, 
    DxTextBoxModule, 
    DxValidatorModule,
    ReportGridComponent, 
    ChartComponent, 
    PivotGridComponent
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <div class="widget-container"
         [class.absolute]="!isMaximized"
         [style.left.%]="isMaximized ? 0 : widget.x"
         [style.top.%]="isMaximized ? 0 : widget.y"
         [style.width.%]="isMaximized ? 100 : widget.width"
         [style.height.%]="isMaximized ? 100 : widget.height"
         (click)="select.emit()"
         [class.z-20]="selected && !isMaximized">
      
      <dx-resizable
        [disabled]="!editMode || isMaximized"
        [handles]="'right bottom'"
        (onResize)="onResize($event)"
        class="h-full"
      >
        <dx-draggable
          [disabled]="!editMode || isMaximized"
          [boundary]="'.canvas-area'"
          (onDragEnd)="onDragEnd($event)"
          class="h-full"
        >
          <div class="card h-full flex flex-col overflow-hidden transition-all duration-200"
               [class.ring-2]="selected && !isMaximized"
               [class.ring-brand-primary]="selected"
               [class.shadow-lg]="selected || isMaximized"
               [class.z-30]="selected"
               [class.border-none]="isMaximized">
            
            <div class="px-4 py-2 border-b flex items-center justify-between bg-slate-50 handle">
               @if (editMode && selected) {
                  <dx-text-box 
                    [value]="widget.title" 
                    placeholder="Widget Label..."
                    class="compact-widget-input"
                    (onValueChanged)="update.emit({ title: $event.value })">
                    <dx-validator>
                       <dxi-validation-rule type="required" message="Required"></dxi-validation-rule>
                    </dx-validator>
                  </dx-text-box>
               } @else {
                  <h3 class="text-[9px] font-black uppercase tracking-widest text-slate-500 whitespace-nowrap overflow-hidden text-ellipsis">
                    {{ widget.title }}
                  </h3>
               }
               
              <div class="flex items-center gap-1.5 ml-2">
                 <button class="rf-compact-btn-ghost p-1 h-6 w-6 rounded-sm text-slate-400 hover:text-brand-primary" (click)="maximize.emit()" *ngIf="!isMaximized" title="Fullscreen">
                    <span class="material-icons text-sm">fullscreen</span>
                 </button>
                 <button class="rf-compact-btn-ghost p-1 h-6 w-6 rounded-sm text-rose-500 hover:bg-rose-50" (click)="remove.emit()" *ngIf="editMode && !isMaximized" title="Remove">
                    <span class="material-icons text-sm">close</span>
                 </button>
              </div>
            </div>
            
            <div class="flex-1 min-h-0 relative">
               <ng-container [ngSwitch]="widget.type">
                  <rf-report-grid 
                    *ngSwitchCase="'grid'" 
                    [grid]="activeGrid()!" 
                    [triggerRun]="triggerRun()" />

                  <app-chart 
                    *ngSwitchCase="'chart'" 
                    [config]="activeReport()?.chart || defaultChart" 
                    [data]="widgetData()" />

                  <app-pivot-grid 
                    *ngSwitchCase="'pivot'" 
                    [data]="widgetData()" />
               </ng-container>

               <!-- Overlays -->
               <div *ngIf="loading()" class="absolute inset-0 bg-white flex items-center justify-center z-10 transition-opacity">
                  <div class="flex flex-col items-center gap-2">
                     <span class="material-icons animate-spin text-brand-primary">refresh</span>
                     <span class="text-[8px] font-black text-slate-400 uppercase tracking-widest">Loading...</span>
                  </div>
               </div>

               <div *ngIf="!loading() && !activeReport()" class="h-full flex flex-col items-center justify-center gap-2 text-slate-300">
                  <span class="material-icons opacity-20 text-4xl">report_off</span>
                  <span class="text-[9px] font-black uppercase tracking-widest">Asset Unmapped</span>
               </div>
            </div>
          </div>
        </dx-draggable>
      </dx-resizable>
    </div>
  `,
  styles: [`
    .handle { cursor: default; }
    :host-context(.edit-mode) .handle { cursor: move; }
    ::ng-deep .compact-widget-input .dx-texteditor-input { padding: 4px 8px !important; font-size: 10px !important; font-weight: 800 !important; color: #1e293b !important; text-transform: uppercase !important; }
    ::ng-deep .compact-widget-input .dx-texteditor-container { background: #fff !important; border-radius: 4px !important; border: 1px solid #e2e8f0 !important; }
  `]
})
export class DashboardWidgetComponent implements OnInit {
  @Input() widget!: DashboardWidget;
  @Input() editMode = false;
  @Input() selected = false;
  @Input() isMaximized = false;
  @Output() update = new EventEmitter<Partial<DashboardWidget>>();
  @Output() remove = new EventEmitter<void>();
  @Output() select = new EventEmitter<void>();
  @Output() maximize = new EventEmitter<void>();

  reportSvc = inject(ReportService);
  
  activeReport = signal<ReportDefinition | null>(null);
  widgetData = signal<any[]>([]);
  loading = signal(false);
  triggerRun = signal(false);

  defaultChart: ChartDefinition = { type: 'bar', xAxis: '', yAxis: '', aggregation: 'SUM' };

  activeGrid = signal<GridDefinition | null>(null);

  ngOnInit() {
    if (this.widget.reportId) {
      this.loadAndFetch();
    }
  }

  private loadAndFetch() {
    this.loading.set(true);
    this.reportSvc.getReport(this.widget.reportId).subscribe(r => {
      if (r) {
        this.activeReport.set(r);
        this.activeGrid.set(r.grids[0] || null);
        
        if (this.widget.type === 'chart' || this.widget.type === 'pivot') {
           this.fetchDataForVisuals(r.grids[0]);
        } else {
           this.loading.set(false);
           this.triggerRun.set(true);
        }
      } else {
        this.loading.set(false);
      }
    });
  }

  private fetchDataForVisuals(grid: any) {
     if (!grid) { this.loading.set(false); return; }
     
     const input = {
        entity: grid.entity,
        columns: grid.columns,
        filters: grid.filters,
        groupBy: grid.groupBy,
        aggregations: grid.aggregations,
        sorts: grid.sorts,
        joins: grid.joins,
        calculatedColumns: grid.calculatedColumns,
        page: 1, pageSize: 1000
     };

     this.reportSvc.runReport(input).subscribe(res => {
        if (res) this.widgetData.set(res.data);
        this.loading.set(false);
     });
  }

  onResize(e: any) {
    const parent = (e.element as HTMLElement).parentElement?.parentElement;
    if (!parent) return;
    
    this.update.emit({
      width: (e.width / parent.clientWidth) * 100,
      height: (e.height / parent.clientHeight) * 100
    });
  }

  onDragEnd(e: any) {
    const parent = (e.element as HTMLElement).parentElement?.parentElement;
    if (!parent) return;

    this.update.emit({
      x: (e.element.offsetLeft / parent.clientWidth) * 100,
      y: (e.element.offsetTop / parent.clientHeight) * 100
    });
  }
}
