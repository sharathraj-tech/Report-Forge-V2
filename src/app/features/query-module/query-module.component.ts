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
    QueryBuilderComponent
  ],
  template: `
    <div class="flex flex-col h-full bg-white anim-fade">
      <!-- Standardized Compact Header -->
      <header class="h-12 border-b border-slate-200 flex items-center justify-between px-4 bg-white shrink-0">
        <div class="flex items-center gap-6">
           <div class="flex items-center gap-2">
             <span class="material-icons text-slate-900 text-lg">insights</span>
             <h1 class="text-sm font-black text-slate-900 tracking-tight uppercase">Analytic Cockpit</h1>
           </div>
           
           <nav class="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
             <button 
                class="px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-md transition-all"
                [class.bg-white]="activeTab() === 0"
                [class.shadow-sm]="activeTab() === 0"
                [class.text-brand-primary]="activeTab() === 0"
                [class.text-slate-400]="activeTab() !== 0"
                (click)="activeTab.set(0)">
                Designer
             </button>
             <button 
                class="px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-md transition-all"
                [class.bg-white]="activeTab() === 1"
                [class.shadow-sm]="activeTab() === 1"
                [class.text-brand-primary]="activeTab() === 1"
                [class.text-slate-400]="activeTab() !== 1"
                (click)="activeTab.set(1)">
                Explorer
             </button>
           </nav>
        </div>

        <div class="flex items-center gap-3">
           <button class="rf-compact-btn-outline h-8 px-4" (click)="saveQuery()" [disabled]="svc.loading()">
             <span class="material-icons text-sm">save</span> 
             <span class="text-[10px] font-black uppercase">Sync</span>
           </button>
           <button class="rf-compact-btn-primary h-8 px-5 shadow-sm" (click)="runQuery()" [disabled]="svc.loading()">
             <span class="material-icons text-sm" [class.animate-spin]="svc.loading()">play_arrow</span> 
             <span class="text-[10px] font-black uppercase">Execute</span>
           </button>
        </div>
      </header>

      <div class="flex-1 flex overflow-hidden">
        <!-- Explorer Sidebar -->
        <aside class="w-64 border-r border-slate-200 bg-slate-50/50 flex flex-col shrink-0">
           <div class="px-4 py-3 flex items-center justify-between border-b border-slate-100">
              <h2 class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Saved Queries</h2>
              <button class="rf-compact-btn-ghost h-7 w-7 p-0" (click)="newQuery()">
                <span class="material-icons text-sm">add</span>
              </button>
           </div>
           
           <div class="flex-1 overflow-y-auto custom-scrollbar px-1 py-2">
              @if (svc.reports().length === 0 && svc.loading()) {
                 <div class="px-3 space-y-2">
                   <div class="h-10 skeleton opacity-40"></div>
                   <div class="h-10 skeleton opacity-20"></div>
                   <div class="h-10 skeleton opacity-10"></div>
                 </div>
              }
              <div class="flex flex-col gap-0.5">
                 @for (r of svc.reports(); track r.id) {
                    <div (click)="onQueryClick(r)" 
                       class="group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all cursor-pointer mx-1"
                       [class.bg-white]="activeQuery()?.id === r.id"
                       [class.shadow-sm]="activeQuery()?.id === r.id"
                       [class.text-brand-primary]="activeQuery()?.id === r.id"
                       [class.text-slate-600]="activeQuery()?.id !== r.id">
                       <span class="material-icons text-sm opacity-50 group-hover:opacity-100">data_exploration</span>
                       <span class="text-[11px] font-bold truncate flex-1">{{ r.name }}</span>
                    </div>
                 }
              </div>
           </div>
        </aside>

        <!-- Main Workspace -->
        <main class="flex-1 flex flex-col overflow-hidden bg-white relative">
           <!-- Dynamic View Routing -->
           @if (activeQuery()) {
              <div class="flex-1 flex flex-col overflow-hidden anim-fade">
                 @if (activeTab() === 0) {
                    <div class="flex-1 flex flex-col min-h-0 bg-slate-50/20">
                       <rf-query-builder 
                         *ngIf="activeGrid()"
                         [grid]="activeGrid()!"
                         (gridChange)="onGridChange($event)"
                         class="flex-1"
                       />
                    </div>
                 } @else {
                    <div class="flex-1 flex flex-col min-h-0 p-6 bg-white overflow-hidden">
                       <div class="flex items-center justify-between mb-4">
                          <h3 class="text-[10px] font-black text-slate-800 uppercase tracking-widest">Real-time Analysis</h3>
                          @if (queryData().length > 0) {
                             <div class="flex items-center gap-4 text-[9px] font-black text-slate-400 uppercase tracking-tighter">
                                <span>Batch: {{ queryData().length }} Units</span>
                                <span>Latency: {{ queryResult()?.executionTimeMs || 0 }}ms</span>
                             </div>
                          }
                       </div>
                       <div class="flex-1 relative rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                          <rf-report-grid 
                            *ngIf="activeGrid()"
                            [grid]="activeGrid()!"
                            [triggerRun]="triggerRun()"
                            (onDataFetched)="onDataFetched($event)"
                          />
                       </div>
                    </div>
                 }
              </div>
           } @else {
              <!-- Empty State -->
              <div class="absolute inset-0 flex items-center justify-center bg-slate-50/30">
                 <div class="flex flex-col items-center gap-6 text-center max-w-sm anim-fade">
                     <div class="w-16 h-16 rounded-2xl bg-slate-900 flex items-center justify-center shadow-lg">
                       <span class="material-icons text-3xl text-white">query_stats</span>
                     </div>
                     <div>
                       <h3 class="text-lg font-black text-slate-900 uppercase tracking-tight">Select a Data Stream</h3>
                       <p class="text-xs font-bold text-slate-400 uppercase mt-2 leading-relaxed">Choose an existing report from the side panel or create a new analytic definition.</p>
                     </div>
                     <button class="rf-compact-btn-primary px-8 h-10 shadow-md" (click)="newQuery()">
                        <span class="material-icons text-sm">add</span>
                        <span>CREATE NEW DEFINITION</span>
                     </button>
                 </div>
              </div>
           }
        </main>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; height: 100%; }
  `]
})
export class QueryModuleComponent implements OnInit {
  svc = inject(ReportService);
  dashSvc = inject(DashboardService);
  notify = inject(NotificationService);

  activeTab = signal(0);
  queryResult = signal<any>(null);
  triggerRun = signal(false);
  queryData = signal<any[]>([]);

  activeQuery = computed(() => this.svc.activeReport());
  activeGrid  = computed(() => this.activeQuery()?.grids[0] || null);

  ngOnInit() {
    this.svc.loadReports().subscribe(r => this.svc.reports.set(r));
    this.svc.loadEntities();
    this.dashSvc.loadDashboards();
  }

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
      id: '', name: 'New Analytic Query', category: 'General', createdBy: 'me',
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      isPublic: false, sharedFilters: { id: crypto.randomUUID(), logic: 'AND', conditions: [], groups: [] },
      grids: [{
        id: crypto.randomUUID(), title: 'Query Stream', entity: '',
        columns: [], columnConfigs: {},
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
}
