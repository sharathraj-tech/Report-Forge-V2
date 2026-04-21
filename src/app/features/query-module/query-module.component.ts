import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReportService } from '../../core/services/report.service';
import { DashboardService } from '../../core/services/dashboard.service';
import { NotificationService } from '../../core/services/notification.service';
import { ReportGridComponent } from '../report-runner/report-grid/report-grid.component';
import { QueryBuilderComponent } from '../query-builder/query-builder.component';
import { DxTreeViewModule, DxButtonModule, DxTagBoxModule, DxTabsModule, DxPopupModule, DxSelectBoxModule, DxTextBoxModule, DxListModule, DxLoadPanelModule } from 'devextreme-angular';
import type { ReportDefinition, GridDefinition, ChartDefinition } from '../../core/models/report.models';
import type { DashboardWidget } from '../../core/models/dashboard.models';
import { SchemaDiscoveryComponent } from '../developer/schema-discovery.component';

@Component({
  selector: 'rf-query-module',
  standalone: true,
  imports: [
    CommonModule, 
    DxTreeViewModule, 
    DxButtonModule, 
    DxTagBoxModule, 
    DxTabsModule,
    DxPopupModule,
    DxSelectBoxModule,
    DxTextBoxModule,
    DxListModule,
    DxLoadPanelModule,
    ReportGridComponent,
    QueryBuilderComponent,
    SchemaDiscoveryComponent
  ],
  template: `
    <div class="cockpit full-height flex flex-col anim-fade-in bg-background text-foreground">
      <!-- Shadcn-style Header -->
      <header class="h-14 border-b flex items-center justify-between px-6 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div class="flex items-center gap-6">
           <div class="flex items-center gap-2">
             <span class="material-icons text-foreground">analytics</span>
             <span class="font-bold tracking-tight text-lg">REPORT<span class="text-muted-foreground font-medium">FORGE</span></span>
           </div>
           
           <nav class="flex items-center gap-1 bg-muted/50 p-1 rounded-md">
             <button 
                class="px-3 py-1.5 text-sm font-medium rounded-sm transition-all"
                [class.bg-background]="activeTab() === 0"
                [class.shadow-sm]="activeTab() === 0"
                (click)="activeTab.set(0)">
                Build
             </button>
             <button 
                class="px-3 py-1.5 text-sm font-medium rounded-sm transition-all"
                [class.bg-background]="activeTab() === 1"
                [class.shadow-sm]="activeTab() === 1"
                (click)="activeTab.set(1)">
                Analyze
             </button>
           </nav>
        </div>

        <div class="flex items-center gap-3">
           <div class="flex items-center gap-2 px-3 py-1.5 rounded-full border bg-muted/30">
             <span class="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Dev Mode</span>
             <button class="switch" [class.active]="developerMode()" (click)="toggleDevMode()">
                <div class="switch-handle"></div>
             </button>
           </div>
           
           <div class="h-8 w-[1px] bg-border mx-1"></div>

           <button class="shadcn-btn-outline shadcn-btn-sm flex gap-2 items-center" (click)="saveQuery()">
             <span class="material-icons text-sm">save</span> Save
           </button>
           <button class="shadcn-btn-default shadcn-btn-sm flex gap-2 items-center" (click)="runQuery()">
             <span class="material-icons text-sm">play_arrow</span> Run Query
           </button>
        </div>
      </header>

      <div class="flex-1 flex overflow-hidden">
        <!-- Sidebar -->
        <aside class="w-64 border-r bg-muted/10 flex flex-col" *ngIf="!developerMode()">
           <div class="px-4 py-4 flex items-center justify-between">
              <h2 class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Saved Reports</h2>
              <button class="shadcn-btn-ghost p-1 h-7 w-7" (click)="newQuery()">
                <span class="material-icons text-sm">add</span>
              </button>
           </div>
           <div class="flex-1 overflow-y-auto px-2 pb-4">
              <dx-list [items]="svc.reports()" [height]="'100%'" class="sidebar-list">
                 <div *dxTemplate="let r of 'item'" (click)="onQueryClick(r)" 
                    class="group flex items-center gap-3 px-3 py-2 rounded-md transition-colors cursor-pointer"
                    [class.bg-accent]="activeQuery()?.id === r.id"
                    [class.text-accent-foreground]="activeQuery()?.id === r.id">
                    <span class="material-icons text-sm opacity-50 group-hover:opacity-100">description</span>
                    <span class="text-sm font-medium truncate">{{ r.name }}</span>
                 </div>
              </dx-list>
           </div>
        </aside>

        <!-- Main Canvas -->
        <main class="flex-1 flex flex-col p-6 gap-6 overflow-hidden bg-background">
           <div class="canvas-view flex-1 flex flex-col min-h-0 overflow-hidden rounded-xl border border-border shadow-sm bg-background" *ngIf="activeTab() === 0">
                 <rf-query-builder 
                   *ngIf="activeGrid()"
                   [grid]="activeGrid()!"
                   (gridChange)="onGridChange($event)"
                   class="flex-1 flex flex-col min-h-0"
                 />
           </div>

           <div class="results-view flex-1 flex flex-col min-h-0 gap-4" *ngIf="activeTab() === 1">
              <div class="flex items-center justify-between">
                 <h3 class="text-sm font-medium">Insight Grid</h3>
                 <div class="flex items-center gap-4 text-[11px] text-muted-foreground font-mono">
                    <div *ngIf="queryData().length > 0" class="flex gap-4">
                      <span>ROWS: {{ queryData().length }}</span>
                      <span *ngIf="queryResult()">TIME: {{ queryResult()?.executionTimeMs }}ms</span>
                    </div>
                 </div>
              </div>
              <div class="shadcn-card flex-1 relative overflow-hidden border-border/50">
                 <rf-report-grid 
                   *ngIf="activeGrid()"
                   [grid]="activeGrid()!"
                   [triggerRun]="triggerRun()"
                   (onDataFetched)="onDataFetched($event)"
                 />
                 <dx-load-panel [visible]="svc.loading()" [showPane]="false"></dx-load-panel>
              </div>
           </div>

           <div class="fixed inset-0 pointer-events-none flex items-center justify-center" *ngIf="!activeQuery()">
              <div class="flex flex-col items-center gap-4 text-center max-w-xs anim-fade-in pointer-events-auto">
                  <div class="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                    <span class="material-icons text-3xl text-muted-foreground">analytics</span>
                  </div>
                  <div>
                    <h3 class="text-lg font-semibold">Ready for Analysis</h3>
                    <p class="text-sm text-muted-foreground mt-1">Select a report from the sidebar or scan a schema in Developer Mode to begin.</p>
                  </div>
                  <button class="shadcn-btn-secondary shadcn-btn-sm mt-2" (click)="newQuery()">Create New Report</button>
              </div>
           </div>
        </main>

        <!-- Discovery Panel -->
        <div class="w-80 border-l bg-muted/5 anim-fade-in" *ngIf="developerMode()">
           <rf-schema-discovery />
        </div>
      </div>
    </div>

    <!-- Shadcn-style Modal -->
    <dx-popup
       [visible]="pinModalVisible()"
       [width]="400" [height]="'auto'" [showTitle]="false"
       (onHiding)="pinModalVisible.set(false)"
       container=".cockpit"
    >
       <div *dxTemplate="let data of 'content'" class="flex flex-col gap-6 p-6">
          <div class="flex flex-col gap-1.5">
             <h2 class="text-lg font-semibold leading-none tracking-tight">Pin to Dashboard</h2>
             <p class="text-sm text-muted-foreground">Choose a dashboard and title for this widget.</p>
          </div>
          
          <div class="flex flex-col gap-4">
             <div class="flex flex-col gap-2">
                <label class="text-sm font-medium leading-none">Target Dashboard</label>
                <dx-select-box [items]="dashSvc.dashboards()" displayExpr="name" valueExpr="id" [(value)]="pinTargetId"></dx-select-box>
             </div>
             <div class="flex flex-col gap-2">
                <label class="text-sm font-medium leading-none">Widget Title</label>
                <dx-text-box [(value)]="pinTitle"></dx-text-box>
             </div>
          </div>

          <div class="flex justify-end gap-3 mt-2">
             <button class="shadcn-btn-ghost h-9 px-4" (click)="pinModalVisible.set(false)">Cancel</button>
             <button class="shadcn-btn-default h-9 px-4" (click)="confirmPin()">Pin Component</button>
          </div>
       </div>
    </dx-popup>
  `,
  styles: [`
    .switch { width: 32px; height: 18px; background: hsl(var(--muted)); border-radius: 9px; position: relative; border: 1px solid hsl(var(--border)); cursor: pointer; transition: 0.2s ease-in-out; &.active { background: hsl(var(--primary)); border-color: hsl(var(--primary)); } .switch-handle { width: 12px; height: 12px; background: hsl(var(--background)); border-radius: 50%; position: absolute; top: 2px; left: 2px; transition: 0.2s cubic-bezier(0.4, 0, 0.2, 1); } &.active .switch-handle { left: 16px; background: hsl(var(--primary-foreground)); } }
    .sidebar-list { ::ng-deep .dx-list-item-content { padding: 0 !important; } }
    dx-tabs { height: auto !important; border: none !important; }
  `]
})
export class QueryModuleComponent implements OnInit {
  svc = inject(ReportService);
  dashSvc = inject(DashboardService);
  notify = inject(NotificationService);

  activeTab = signal(0);
  queryResult = signal<any>(null);
  developerMode = signal(false);
  triggerRun = signal(false);
  queryData = signal<any[]>([]);

  // Pin Modal State
  pinModalVisible = signal(false);
  pinTargetId: string = '';
  pinTitle: string = '';
  pinType: 'grid' | 'chart' | 'pivot' = 'grid';

  defaultChart: ChartDefinition = { type: 'bar', xAxis: '', yAxis: '', aggregation: 'SUM' };

  activeQuery = computed(() => this.svc.activeReport());
  activeGrid  = computed(() => this.activeQuery()?.grids[0] || null);

  ngOnInit() {
    this.svc.loadReports().subscribe(r => this.svc.reports.set(r));
    this.svc.loadEntities();
    this.dashSvc.loadDashboards();
    document.body.classList.add('compact');
  }

  toggleDevMode() { this.developerMode.set(!this.developerMode()); }

  onQueryClick(report: ReportDefinition) {
    this.svc.setActiveReport(report);
    this.activeTab.set(1);
    this.runQuery();
  }

  onGridChange(grid: GridDefinition) {
     const report = this.activeQuery();
     if (report) {
        report.grids[0] = grid;
        this.svc.setActiveReport({ ...report });
     }
  }

  onDataFetched(data: any[]) {
    this.queryData.set(data);
  }

  newQuery() {
    const report: ReportDefinition = {
      id: '', name: 'New Query', category: 'Queries', createdBy: 'currentUser',
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      isPublic: false, sharedFilters: { id: crypto.randomUUID(), logic: 'AND', conditions: [], groups: [] },
      grids: [{
        id: crypto.randomUUID(), title: 'Query Results', entity: 'Transactions',
        columns: ['Id'], columnConfigs: {},
        groupBy: [], aggregations: [], sorts: [], joins: [],
        activeView: 'grid'
      }]
    };
    this.svc.setActiveReport(report);
    this.activeTab.set(0);
  }

  runQuery() {
    this.triggerRun.set(true);
    setTimeout(() => this.triggerRun.set(false), 50);
  }

  saveQuery() {
    const q = this.activeQuery();
    if (!q) return;
    this.svc.saveReport(q).subscribe(() => this.svc.loadReports().subscribe());
  }

  showPinModal() {
     const q = this.activeQuery();
     if (!q) return;
     this.pinTitle = q.name;
     this.pinModalVisible.set(true);
  }

  confirmPin() {
     const dashboards = this.dashSvc.dashboards();
     const target = dashboards.find(d => d.id === this.pinTargetId);
     const report = this.activeQuery();

     if (!target || !report) return;

     const newWidget: DashboardWidget = {
        id: crypto.randomUUID(),
        reportId: report.id,
        title: this.pinTitle,
        type: 'grid',
        x: 0, y: 0, width: 40, height: 40
     };

     const updatedDash = { ...target, widgets: [...target.widgets, newWidget] };
     this.dashSvc.saveDashboard(updatedDash).subscribe(() => {
        this.notify.success(`Pinned to ${target.name}`);
        this.pinModalVisible.set(false);
     });
  }
}
