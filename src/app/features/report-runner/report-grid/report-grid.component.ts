import { Component, Input, Output, EventEmitter, OnChanges, inject, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DxDataGridModule, DxDataGridComponent, DxCheckBoxModule } from 'devextreme-angular';
import { exportDataGrid } from 'devextreme/excel_exporter';
import { Workbook } from 'exceljs';
import { saveAs } from 'file-saver';
import { ReportService } from '../../../core/services/report.service';
import { NotificationService } from '../../../core/services/notification.service';
import type { GridDefinition, QueryResult, FieldMetadata } from '../../../core/models/report.models';

@Component({
  selector: 'rf-report-grid',
  standalone: true,
  imports: [CommonModule, DxDataGridModule, DxCheckBoxModule],
  template: `
    <div class="flex flex-col h-full bg-white anim-fade">
      <!-- Dashboard-style Header / Toolbar -->
      <div class="h-12 flex items-center justify-between px-5 bg-white border-b shrink-0">
        <div class="flex items-center gap-3">
          <span class="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">{{ grid.title || 'Report Grid' }}</span>
          <div class="h-4 w-px bg-slate-100"></div>
          <span class="text-[9px] font-bold text-slate-400 uppercase bg-slate-50 px-2 py-0.5 rounded border border-slate-100 flex items-center gap-1.5" *ngIf="result() && !loading()">
            <span class="h-1.5 w-1.5 rounded-full bg-green-500"></span>
            {{ result()!.data.length }} Records
          </span>
          <span class="text-[9px] font-bold text-slate-400 uppercase bg-blue-50 px-2 py-0.5 rounded border border-blue-100 flex items-center gap-1.5" *ngIf="result() && !loading()">
            <span class="material-icons text-[10px]">timer</span>
            {{ result()!.executionTimeMs }}ms
          </span>
          <span class="text-[9px] font-bold text-slate-400 italic" *ngIf="loading()">Fetching results...</span>
        </div>

        <div class="flex items-center gap-2">
           <!-- Auto Refresh Toggle -->
           <div class="flex items-center gap-2 mr-2 px-2 py-1 rounded bg-slate-50 border border-slate-100">
              <span class="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">Auto-Refresh</span>
              <dx-check-box [value]="autoRefresh()" (onValueChanged)="autoRefresh.set($event.value)" />
           </div>

           <button class="shadcn-btn-ghost w-8 h-8 p-0" title="Refresh Now" (click)="refresh()" [disabled]="loading()">
              <span class="material-icons text-sm" [class.animate-spin]="loading()">refresh</span>
           </button>
           
           <div class="h-4 w-px bg-slate-100 mx-1"></div>

           <button class="shadcn-btn-outline h-7 px-3 text-[10px] font-bold rounded flex items-center gap-2 border-slate-200" (click)="onExport()">
              <span class="material-icons text-xs">download</span> EXPORT EXCEL
           </button>
           <button class="shadcn-btn-outline h-7 px-3 text-[10px] font-bold rounded flex items-center gap-2 border-slate-200" (click)="onExportCSV()">
              <span class="material-icons text-xs">file_present</span> CSV
           </button>
        </div>
      </div>

      <div class="flex-1 min-h-0 relative">
        <!-- Loading Overlay -->
        <div *ngIf="loading()" class="absolute inset-0 bg-white/80 backdrop-blur-[1px] flex items-center justify-center z-10 anim-fade">
          <div class="flex flex-col items-center gap-4">
            <div class="w-8 h-8 border-2 border-brand-blue/20 border-t-brand-blue rounded-full animate-spin"></div>
            <span class="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Processing Query...</span>
          </div>
        </div>

        <!-- Grid -->
        <div class="h-full" *ngIf="!loading()">
          @if (result() && result()!.data.length > 0) {
            <dx-data-grid
              #dataGrid
              [dataSource]="result()!.data"
              [showBorders]="false" [showRowLines]="true" [showColumnLines]="false"
              [hoverStateEnabled]="true" [allowColumnResizing]="true"
              [allowColumnReordering]="true" [columnAutoWidth]="false"
              [rowAlternationEnabled]="true"
              (onExporting)="onExporting($event)"
              (onRowClick)="onRowClick($event)"
              (onCellPrepared)="onCellPrepared($event)"
            >
              @for (col of columnDefs(); track col.field) {
                <dxi-column *ngIf="col.visible"
                  [dataField]="col.field" 
                  [caption]="col.caption"
                  [dataType]="col.type"
                  [width]="col.width || undefined"
                  [alignment]="col.alignment"
                  cellTemplate="cellTemplate"
                />
              }

              <!-- Versatile Cell Template -->
              <div *dxTemplate="let d of 'cellTemplate'">
                <ng-container [ngSwitch]="true">
                  <!-- Status Badges -->
                  <div *ngSwitchCase="d.column.dataField.toLowerCase() === 'status'" class="flex">
                    <span class="rf-badge" [ngClass]="'rf-badge-' + (d.value?.toString().toLowerCase() || 'review')">
                       {{ d.value }}
                    </span>
                  </div>
                  
                  <!-- Type Badges -->
                  <div *ngSwitchCase="d.column.dataField.toLowerCase() === 'type'" class="flex">
                    <span class="rf-badge-type" [ngClass]="'rf-badge-type-' + (d.value?.toString().toLowerCase() || 'sql')">
                       {{ d.value }}
                    </span>
                  </div>

                  <!-- Date Formatting -->
                  <div *ngSwitchCase="d.column.dataType === 'date' || d.column.dataType === 'datetime'">
                    <span class="text-slate-500 font-medium">{{ d.value | date:'MMM d, yyyy HH:mm' }}</span>
                  </div>

                  <!-- Default Text -->
                  <div *ngSwitchDefault>
                    <span class="text-slate-700 font-medium">{{ d.value }}</span>
                  </div>
                </ng-container>
              </div>

              <dxo-paging [pageSize]="25" />
              <dxo-pager [showPageSizeSelector]="true" [allowedPageSizes]="[25,50,100]" [showInfo]="true" />
              <dxo-column-chooser [enabled]="true" />
              <dxo-header-filter [visible]="true" />
              <dxo-filter-row [visible]="true" />
              <dxo-selection mode="multiple" />
            </dx-data-grid>
          } @else if (result() && result()!.data.length === 0) {
            <div class="h-full flex flex-col items-center justify-center gap-4 text-center anim-fade">
              <span class="material-icons text-slate-200 text-5xl">manage_search</span>
              <div class="flex flex-col gap-1">
                <span class="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest">No matching results</span>
                <span class="text-xs text-slate-400">Refine your query filters to see data here.</span>
              </div>
            </div>
          } @else {
            <div class="h-full flex flex-col items-center justify-center gap-6 text-center anim-fade">
              <div class="w-16 h-16 rounded-3xl bg-slate-50 border border-dashed border-slate-200 flex items-center justify-center mb-2">
                <span class="material-icons text-slate-400 text-3xl">play_circle</span>
              </div>
              <div class="flex flex-col gap-1">
                <span class="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest">Ready for Analytics</span>
                <span class="text-xs text-slate-400">Execute the designer to generate visual results.</span>
              </div>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    dx-data-grid { height: 100% !important; }
  `]
})
export class ReportGridComponent implements OnChanges {
  @Input() grid!: GridDefinition;
  @Input() triggerRun = false;
  @Output() drillDown = new EventEmitter<{ report: string; params: Record<string, unknown> }>();
  @Output() onDataFetched = new EventEmitter<any[]>();

  @ViewChild('dataGrid') dataGrid?: DxDataGridComponent;

  svc = inject(ReportService);
  notify = inject(NotificationService);
  result = signal<QueryResult | null>(null);
  loading = signal(false);
  autoRefresh = signal(false);
  private refreshTimer: any;

  columnDefs = signal<{ field: string; caption: string; type: string; width?: number; alignment: string; visible: boolean }[]>([]);

  ngOnInit() {
    this.refreshTimer = setInterval(() => {
      if (this.autoRefresh() && !this.loading()) {
        this.refresh();
      }
    }, 30000); // 30 seconds
  }

  ngOnDestroy() {
    if (this.refreshTimer) clearInterval(this.refreshTimer);
  }

  ngOnChanges() {
    if (this.triggerRun) this.onRun();
  }

  onRun() {
    if (!this.grid.entity) return;
    this.loading.set(true);
    const input = {
      entity: this.grid.entity,
      columns: this.grid.columns,
      calculatedColumns: this.grid.calculatedColumns ?? [],
      filters: this.grid.filters,
      groupBy: this.grid.groupBy,
      aggregations: this.grid.aggregations,
      sorts: this.grid.sorts,
      joins: this.grid.joins || [],
      page: 1,
      pageSize: 50
    };
    this.svc.runReport(input).subscribe({
      next: (res: QueryResult | undefined) => {
        if (res) {
          this.result.set(res);
          this.buildColumnDefs(res);
          this.onDataFetched.emit(res.data);
        }
        this.loading.set(false);
      },
      error: (e: unknown) => { console.error(e); this.loading.set(false); }
    });
  }

  onExport() {
    if (!this.dataGrid?.instance) {
      this.notify.warning('No data to export.');
      return;
    }
    const workbook = new Workbook();
    const worksheet = workbook.addWorksheet(this.grid.title || 'Report');
    exportDataGrid({
      component: this.dataGrid.instance,
      worksheet,
      autoFilterEnabled: true,
    }).then(() => {
      workbook.xlsx.writeBuffer().then((buffer) => {
        saveAs(new Blob([buffer], { type: 'application/octet-stream' }), `${this.grid.title || 'Report'}.xlsx`);
        this.notify.success('Export complete!');
      });
    });
  }

  onExportCSV() {
    const data = this.result()?.data;
    if (!data || data.length === 0) {
      this.notify.warning('No data to export.');
      return;
    }
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(h => `"${row[h] ?? ''}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `${this.grid.title || 'report'}.csv`);
    this.notify.success('CSV export complete!');
  }

  refresh() {
    this.onRun();
  }

  onExporting(e: any) {
    const workbook = new Workbook();
    const worksheet = workbook.addWorksheet('Report');

    exportDataGrid({
      component: e.component,
      worksheet,
      autoFilterEnabled: true,
    }).then(() => {
      workbook.xlsx.writeBuffer().then((buffer) => {
        saveAs(new Blob([buffer], { type: 'application/octet-stream' }), `${this.grid.title}.xlsx`);
      });
    });
    e.cancel = true;
  }

  onRowClick(e: { data: Record<string, unknown> }) {
    if (!this.grid.drillDown?.targetReportId) return;
    const params: Record<string, unknown> = {};
    for (const [target, source] of Object.entries(this.grid.drillDown.mappings)) {
      params[target] = e.data[source];
    }
    this.drillDown.emit({ report: this.grid.drillDown.targetReportId, params });
  }

  private buildColumnDefs(res: QueryResult) {
    if (res.data.length === 0) { this.columnDefs.set([]); return; }
    const firstRow = res.data[0];
    const cols = Object.keys(firstRow).map(key => {
      let meta: FieldMetadata | undefined;
      
      if (key.includes('.')) {
        const parts = key.split('.');
        const entityName = parts[0];
        const fieldName = parts[1];
        meta = this.svc.getEntityFields(entityName).find((f: FieldMetadata) => f.name === fieldName);
      } else {
        meta = this.svc.getEntityFields(this.grid.entity).find((f: FieldMetadata) => f.name === key);
      }

      const conf = this.grid.columnConfigs?.[key];
      return {
        field: key,
        caption: conf?.headerName || meta?.displayName || key,
        type: this.mapType(meta?.dataType ?? 'string'),
        width: conf?.width,
        alignment: conf?.align || 'left',
        visible: conf ? conf.visible : true
      };
    });
    this.columnDefs.set(cols);
  }

  onCellPrepared(e: any) {
    if (e.rowType !== 'data' || !e.column.dataField) return;

    const conf = this.grid.columnConfigs?.[e.column.dataField];
    if (conf?.formattingRules) {
      for (const rule of conf.formattingRules) {
        if (this.evaluateRule(e.value, rule)) {
          if (rule.color) e.cellElement.style.color = rule.color;
          if (rule.background) e.cellElement.style.backgroundColor = rule.background;
          e.cellElement.style.fontWeight = 'bold';
        }
      }
    }
  }

  private evaluateRule(val: any, rule: any) {
    const rVal = rule.value;
    switch (rule.operator) {
      case '=': return val === rVal;
      case '!=': return val !== rVal;
      case '>': return val > rVal;
      case '>=': return val >= rVal;
      case '<': return val < rVal;
      case '<=': return val <= rVal;
      case 'contains': return val?.toString().toLowerCase().includes(rVal.toString().toLowerCase());
      default: return false;
    }
  }

  private mapType(dt: string): string {
    switch (dt) {
      case 'datetime': return 'date';
      case 'int': case 'decimal': return 'number';
      case 'bool': return 'boolean';
      default: return 'string';
    }
  }
}
