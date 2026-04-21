import { Component, Input, Output, EventEmitter, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DxDraggableModule, DxResizableModule } from 'devextreme-angular';
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
  imports: [CommonModule, DxDraggableModule, DxResizableModule, ReportGridComponent, ChartComponent, PivotGridComponent],
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
               [class.ring-ring]="selected"
               [class.shadow-lg]="selected || isMaximized"
               [class.z-30]="selected"
               [class.border-none]="isMaximized">
            
            <div class="px-4 py-3 border-b flex items-center justify-between bg-muted/20 handle">
              <h3 class="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 whitespace-nowrap overflow-hidden text-ellipsis">
                {{ widget.title }}
              </h3>
              <div class="flex items-center gap-1.5">
                 <button class="shadcn-btn-ghost p-1 h-6 w-6 rounded-sm text-slate-400 hover:text-brand-blue" (click)="maximize.emit()" *ngIf="!isMaximized" title="Fullscreen">
                    <span class="material-icons text-sm">fullscreen</span>
                 </button>
                 <button class="shadcn-btn-ghost p-1 h-6 w-6 rounded-sm text-destructive hover:bg-destructive/10" (click)="remove.emit()" *ngIf="editMode && !isMaximized" title="Remove">
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
               <div *ngIf="loading()" class="absolute inset-0 bg-background/60 backdrop-blur-[1px] flex items-center justify-center z-10 transition-opacity">
                  <span class="material-icons animate-spin text-primary">refresh</span>
               </div>

               <div *ngIf="!loading() && !activeReport()" class="h-full flex flex-col items-center justify-center gap-2 text-muted-foreground">
                  <span class="material-icons opacity-20 text-4xl">report_off</span>
                  <span class="text-xs font-medium">Report missing</span>
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
  `]
})
export class DashboardWidgetComponent implements OnInit {
  @Input() widget!: DashboardWidget;
  @Input() editMode = false;
  @Input() selected = false;
  @Input() isMaximized = false; // Fullscreen mode indicator
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
        
        // If it's a chart or pivot, we need to fetch the data manually here
        // The ReportGrid component fetches its own data, but Chart/Pivot need it via the signal
        if (this.widget.type === 'chart' || this.widget.type === 'pivot') {
           this.fetchDataForVisuals(r.grids[0]);
        } else {
           this.loading.set(false);
           // For grids, we trigger the internal run
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
        page: 1, pageSize: 1000 // Higher limit for visualizations
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
