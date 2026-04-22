import { Component, Input, Output, EventEmitter, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DxTabPanelModule } from 'devextreme-angular';
import { QueryBuilderComponent } from '../query-builder/query-builder.component';
import { ReportGridComponent } from '../report-runner/report-grid/report-grid.component';
import { ChartBuilderComponent } from '../chart-builder/chart-builder.component';
import { ReportService } from '../../core/services/report.service';
import type { GridDefinition } from '../../core/models/report.models';
import { defaultGrid } from '../../core/models/report.models';

@Component({
  selector: 'rf-report-designer',
  standalone: true,
  imports: [
    CommonModule,
    DxTabPanelModule,
    QueryBuilderComponent,
    ReportGridComponent,
    ChartBuilderComponent,
  ],
  template: `
    <div class="flex flex-col h-full bg-white overflow-hidden anim-fade">
      <!-- Loading State / Skeleton -->
      @if (svc.loading()) {
        <div class="flex-1 flex flex-col bg-slate-50/30 p-8 gap-8 anim-fade">
           <div class="flex items-center justify-between">
              <div class="flex items-center gap-4">
                 <div class="h-8 w-32 skeleton"></div>
                 <div class="h-8 w-32 skeleton"></div>
              </div>
              <div class="h-8 w-24 skeleton"></div>
           </div>
           <div class="flex-1 flex gap-6">
              <div class="w-[460px] h-full skeleton opacity-50"></div>
              <div class="flex-1 h-full skeleton opacity-30"></div>
           </div>
        </div>
      } @else if (!svc.activeReport()) {
        <!-- Empty Landing Page -->
        <div class="flex-1 flex items-center justify-center bg-slate-50/50">
          <div class="max-w-[600px] w-full p-12 text-center anim-fade-in flex flex-col items-center">
            <div class="h-16 w-16 rounded-2xl bg-slate-900 flex items-center justify-center mb-8 shadow-sm">
               <span class="material-icons text-3xl text-white">analytics</span>
            </div>
            <h1 class="text-3xl font-black text-slate-900 tracking-tight mb-3 uppercase">Report Designer</h1>
            <p class="text-slate-500 text-base mb-10 max-w-md mx-auto">Build high-performance, metadata-driven reports with enterprise-grade controls.</p>
            
            <div class="grid grid-cols-2 gap-4 w-full text-left">
              @for (feat of [
                { icon: 'hub', label: 'Relational Queries' },
                { icon: 'grid_on', label: 'Multi-Grid Layouts' },
                { icon: 'show_chart', label: 'Visual Analytics' },
                { icon: 'security', label: 'Field-Level Security' }
              ]; track feat.label) {
                <div class="p-4 rounded-xl border border-slate-200 bg-white flex items-center gap-3 shadow-sm">
                  <span class="material-icons text-brand-primary/60">{{ feat.icon }}</span>
                  <span class="text-xs font-black uppercase tracking-tight text-slate-700">{{ feat.label }}</span>
                </div>
              }
            </div>

            <button class="rf-compact-btn-primary h-12 px-10 mt-12 gap-3 text-sm shadow-lg shadow-brand-primary/20" (click)="newReport()">
              <span class="material-icons text-base">add</span> 
              <span class="uppercase tracking-widest font-black">Start New Project</span>
            </button>
          </div>
        </div>
      } @else {
        <!-- Workplace Shell -->
        <div class="flex-1 flex flex-col overflow-hidden">
          <!-- Premium Tab Bar (Compact Slate) -->
          <div class="h-10 border-b border-slate-200 flex items-center px-4 bg-slate-50/50 gap-4">
            <div class="flex items-center gap-1 overflow-x-auto no-scrollbar flex-1 h-full">
              @for (grid of svc.activeReport()!.grids; track grid.id; let i = $index) {
                <div class="flex items-center h-8 px-3 rounded-md transition-all cursor-pointer border group select-none"
                    [class.bg-white]="svc.activeGridIndex() === i"
                    [class.shadow-sm]="svc.activeGridIndex() === i"
                    [class.text-brand-primary]="svc.activeGridIndex() === i"
                    [class.text-slate-500]="svc.activeGridIndex() !== i"
                    [class.border-slate-200]="svc.activeGridIndex() === i"
                    [class.border-transparent]="svc.activeGridIndex() !== i"
                    (click)="selectGrid(i)">
                  <span class="material-icons text-xs mr-2 opacity-60">table_chart</span>
                  <span class="text-[10px] font-black uppercase tracking-tight whitespace-nowrap">{{ grid.title }}</span>
                  <button class="ml-2 hover:bg-red-50 rounded p-0.5 text-slate-400 hover:text-red-500 group-hover:block hidden" (click)="removeGrid(i, $event)">
                    <span class="material-icons text-[12px]">close</span>
                  </button>
                </div>
              }
              @if (svc.activeReport()?.chart) {
                <div class="flex items-center h-8 px-3 rounded-md transition-all cursor-pointer border-l-2 border-l-brand-primary group select-none"
                    [class.bg-white]="activeTab() === 'chart'"
                    [class.shadow-sm]="activeTab() === 'chart'"
                    [class.text-brand-primary]="activeTab() === 'chart'"
                    [class.text-slate-500]="activeTab() !== 'chart'"
                    (click)="activeTab.set('chart')">
                  <span class="material-icons text-xs mr-2 opacity-60">insights</span>
                  <span class="text-[10px] font-black uppercase tracking-tight whitespace-nowrap">{{ svc.activeReport()!.chart!.title ?? 'Chart' }}</span>
                  <button class="ml-2 hover:bg-red-50 rounded p-0.5 text-slate-400 hover:text-red-500 group-hover:block hidden" (click)="removeChart($event)">
                    <span class="material-icons text-[12px]">close</span>
                  </button>
                </div>
              }
              <button class="rf-compact-btn-ghost h-7 w-7 p-0 ml-2" (click)="addGrid()" title="Add Insight Container">
                <span class="material-icons text-sm">add</span>
              </button>
            </div>

            <!-- Visual Toggle -->
            <div class="flex items-center bg-slate-200/50 p-0.5 rounded-lg border border-slate-200 h-7 shrink-0">
              <button class="h-6 w-8 flex items-center justify-center rounded-md transition-all" [class.bg-white]="viewMode() === 'split'" [class.shadow-sm]="viewMode() === 'split'" (click)="viewMode.set('split')">
                <span class="material-icons text-xs" [class.text-brand-primary]="viewMode() === 'split'" [class.text-slate-400]="viewMode() !== 'split'">auto_awesome_motion</span>
              </button>
              <button class="h-6 w-8 flex items-center justify-center rounded-md transition-all" [class.bg-white]="viewMode() === 'query'" [class.shadow-sm]="viewMode() === 'query'" (click)="viewMode.set('query')">
                <span class="material-icons text-xs" [class.text-brand-primary]="viewMode() === 'query'" [class.text-slate-400]="viewMode() !== 'query'">terminal</span>
              </button>
              <button class="h-6 w-8 flex items-center justify-center rounded-md transition-all" [class.bg-white]="viewMode() === 'data'" [class.shadow-sm]="viewMode() === 'data'" (click)="viewMode.set('data')">
                <span class="material-icons text-xs" [class.text-brand-primary]="viewMode() === 'data'" [class.text-slate-400]="viewMode() !== 'data'">table_rows</span>
              </button>
            </div>
          </div>

          <!-- Dynamic Workspace -->
          <div class="flex-1 flex overflow-hidden">
            @if (activeTab() !== 'chart' && currentGrid()) {
              <div class="flex-1 flex overflow-hidden" [ngClass]="viewMode()">
                
                <!-- Query Composer -->
                <div class="flex flex-col bg-slate-50/30 border-r border-slate-200 min-w-[400px] overflow-hidden" 
                     [class.hidden]="viewMode() === 'data'"
                     [style.width]="viewMode() === 'split' ? '460px' : '100%'">
                  <rf-query-builder
                    [grid]="currentGrid()!"
                    (gridChange)="onGridChange($event)"
                    (runRequested)="runRequested.emit()"
                    (saveRequested)="onSaveRequested()"
                  />
                </div>

                <!-- Live Data Result -->
                <div class="flex-1 bg-white" [class.hidden]="viewMode() === 'query'">
                  <rf-report-grid
                    [grid]="currentGrid()!"
                    [triggerRun]="isRunning"
                    (drillDown)="onDrillDown($event)"
                  />
                </div>

              </div>
            }

            @if (activeTab() === 'chart' && svc.activeReport()?.chart) {
              <div class="flex-1 overflow-hidden bg-white">
                <rf-chart-builder
                  [chart]="svc.activeReport()!.chart!"
                  [entity]="currentGridEntity()"
                  (chartChange)="onChartChange($event)"
                />
              </div>
            }

            @if (svc.activeReport()!.grids.length === 0 && !svc.activeReport()?.chart) {
              <div class="flex-1 flex flex-col items-center justify-center gap-4 text-slate-400 opacity-60 anim-fade">
                <div class="w-16 h-16 rounded-full bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center">
                  <span class="material-icons text-3xl">add_box</span>
                </div>
                <div class="text-center">
                  <h3 class="text-[11px] font-black uppercase tracking-widest">No Components</h3>
                  <p class="text-[10px] font-bold mt-1">Use the palette to add data containers.</p>
                </div>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; height: 100%; }
    .hidden { display: none !important; }
    .no-scrollbar::-webkit-scrollbar { display: none; }
    .split { flex-direction: row; }
  `]
})
export class ReportDesignerComponent {
  @Input() isRunning = false;
  @Output() runRequested = new EventEmitter<void>();
  @Output() saveRequested = new EventEmitter<void>();

  svc = inject(ReportService);
  activeTab = signal<string | 'chart'>('grid-0');
  viewMode = signal<'split' | 'query' | 'data'>('split');

  currentGrid = computed(() => {
    const r = this.svc.activeReport();
    const i = this.svc.activeGridIndex();
    return r?.grids[i] ?? null;
  });

  currentGridEntity = computed(() => this.currentGrid()?.entity ?? '');

  selectGrid(index: number) {
    this.svc.activeGridIndex.set(index);
    this.activeTab.set('grid-' + index);
  }

  addGrid() {
    this.svc.addGrid(defaultGrid());
    const newIndex = (this.svc.activeReport()?.grids.length ?? 1) - 1;
    this.activeTab.set('grid-' + newIndex);
  }

  removeGrid(index: number, e: Event) {
    e.stopPropagation();
    this.svc.removeGrid(index);
    this.activeTab.set('grid-0');
  }

  removeChart(e: Event) {
    e.stopPropagation();
    const r = this.svc.activeReport();
    if (r) this.svc.activeReport.set({ ...r, chart: undefined });
    this.activeTab.set('grid-0');
  }

  onGridChange(grid: GridDefinition) {
    this.svc.updateActiveGrid(this.svc.activeGridIndex(), grid);
  }

  onChartChange(chart: any) {
    const r = this.svc.activeReport();
    if (r) this.svc.activeReport.set({ ...r, chart });
  }

  onDrillDown(event: { report: string; params: Record<string, unknown> }) {
    this.svc.openLoadedReport(event.report, event.params);
  }

  newReport() {
    const r = {
      id: '', name: 'New Report', description: '', category: 'General',
      createdBy: '', createdAt: '', updatedAt: '', isPublic: false,
      grids: [defaultGrid()], sharedFilters: { id: crypto.randomUUID(), logic: 'AND' as const, conditions: [], groups: [] }
    };
    this.svc.setActiveReport(r);
  }

  onSaveRequested() {
    this.saveRequested.emit();
  }
}
