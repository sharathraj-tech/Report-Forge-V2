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
    <div class="flex flex-col h-full bg-background overflow-hidden">
      <!-- Empty Landing Page -->
      @if (!svc.activeReport()) {
        <div class="flex-1 flex items-center justify-center bg-[radial-gradient(ellipse_at_50%_40%,hsl(var(--primary)/0.05)_0%,transparent_70%)]">
          <div class="max-w-[600px] w-full p-12 text-center anim-fade-in flex flex-col items-center">
            <div class="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-8 shadow-inner">
               <span class="material-icons text-4xl text-primary">analytics</span>
            </div>
            <h1 class="text-4xl font-bold tracking-tight mb-3">Welcome to <span class="text-primary">NextGen</span> Designer</h1>
            <p class="text-muted-foreground text-lg mb-10 max-w-md mx-auto">Build high-performance, metadata-driven reports and dashboards with a few clicks.</p>
            
            <div class="grid grid-cols-2 gap-4 w-full text-left">
              <div class="p-4 rounded-xl border bg-muted/20 flex items-center gap-3">
                <span class="material-icons text-primary/60">hub</span>
                <span class="text-sm font-medium">Relational Queries</span>
              </div>
              <div class="p-4 rounded-xl border bg-muted/20 flex items-center gap-3">
                <span class="material-icons text-primary/60">grid_on</span>
                <span class="text-sm font-medium">Multi-Grid Layouts</span>
              </div>
              <div class="p-4 rounded-xl border bg-muted/20 flex items-center gap-3">
                <span class="material-icons text-primary/60">show_chart</span>
                <span class="text-sm font-medium">Visual Analytics</span>
              </div>
              <div class="p-4 rounded-xl border bg-muted/20 flex items-center gap-3">
                <span class="material-icons text-primary/60">security</span>
                <span class="text-sm font-medium">Field-Level Security</span>
              </div>
            </div>

            <button class="shadcn-btn-default h-12 px-8 mt-12 gap-3 text-base shadow-xl shadow-primary/20" (click)="newReport()">
              <span class="material-icons">add</span> Start New Project
            </button>
          </div>
        </div>
      }

      <!-- Workplace Shell -->
      @if (svc.activeReport()) {
        <div class="flex-1 flex flex-col overflow-hidden">
          <!-- Premium Tab Bar -->
          <div class="h-11 border-b flex items-center px-4 bg-muted/5 gap-4">
            <div class="flex items-center gap-1 overflow-x-auto no-scrollbar flex-1">
              @for (grid of svc.activeReport()!.grids; track grid.id; let i = $index) {
                <div class="flex items-center h-8 px-3 rounded-md transition-all cursor-pointer border group"
                    [class.bg-background]="svc.activeGridIndex() === i"
                    [class.shadow-sm]="svc.activeGridIndex() === i"
                    [class.text-foreground]="svc.activeGridIndex() === i"
                    [class.text-muted-foreground]="svc.activeGridIndex() !== i"
                    [class.border-border]="svc.activeGridIndex() === i"
                    [class.border-transparent]="svc.activeGridIndex() !== i"
                    (click)="selectGrid(i)">
                  <span class="material-icons text-sm mr-2 opacity-50">table_chart</span>
                  <span class="text-xs font-semibold whitespace-nowrap">{{ grid.title }}</span>
                  <button class="ml-2 hover:bg-destructive/10 rounded p-0.5 text-muted-foreground group-hover:block hidden" (click)="removeGrid(i, $event)">
                    <span class="material-icons text-[12px]">close</span>
                  </button>
                </div>
              }
              @if (svc.activeReport()?.chart) {
                <div class="flex items-center h-8 px-3 rounded-md transition-all cursor-pointer border-l-2 border-l-primary group"
                    [class.bg-background]="activeTab() === 'chart'"
                    [class.shadow-sm]="activeTab() === 'chart'"
                    [class.text-foreground]="activeTab() === 'chart'"
                    [class.text-muted-foreground]="activeTab() !== 'chart'"
                    (click)="activeTab.set('chart')">
                  <span class="material-icons text-sm mr-2 opacity-50">insights</span>
                  <span class="text-xs font-semibold whitespace-nowrap">{{ svc.activeReport()!.chart!.title ?? 'Chart' }}</span>
                  <button class="ml-2 hover:bg-destructive/10 rounded p-0.5 text-muted-foreground group-hover:block hidden" (click)="removeChart($event)">
                    <span class="material-icons text-[12px]">close</span>
                  </button>
                </div>
              }
              <button class="shadcn-btn-ghost h-7 w-7 p-0 ml-2" (click)="addGrid()" title="Add Insight Container">
                <span class="material-icons text-sm">add</span>
              </button>
            </div>

            <!-- Visual Toggle -->
            <div class="flex items-center bg-muted/50 p-1 rounded-md border h-8">
              <button class="h-6 w-9 flex items-center justify-center rounded-sm" [class.bg-background]="viewMode() === 'split'" (click)="viewMode.set('split')">
                <span class="material-icons text-sm">auto_awesome_motion</span>
              </button>
              <button class="h-6 w-9 flex items-center justify-center rounded-sm" [class.bg-background]="viewMode() === 'query'" (click)="viewMode.set('query')">
                <span class="material-icons text-sm">terminal</span>
              </button>
              <button class="h-6 w-9 flex items-center justify-center rounded-sm" [class.bg-background]="viewMode() === 'data'" (click)="viewMode.set('data')">
                <span class="material-icons text-sm">table_rows</span>
              </button>
            </div>
          </div>

          <!-- Dynamic Workspace -->
          <div class="flex-1 flex overflow-hidden">
            @if (activeTab() !== 'chart' && currentGrid()) {
              <div class="flex-1 flex overflow-hidden" [ngClass]="viewMode()">
                
                <!-- Query Composer -->
                <div class="flex flex-col bg-muted/5 border-r min-w-[400px] overflow-hidden" 
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
                <div class="flex-1 bg-background" [class.hidden]="viewMode() === 'query'">
                  <rf-report-grid
                    [grid]="currentGrid()!"
                    [triggerRun]="isRunning"
                    (drillDown)="onDrillDown($event)"
                  />
                </div>

              </div>
            }

            @if (activeTab() === 'chart' && svc.activeReport()?.chart) {
              <div class="flex-1 overflow-hidden">
                <rf-chart-builder
                  [chart]="svc.activeReport()!.chart!"
                  [entity]="currentGridEntity()"
                  (chartChange)="onChartChange($event)"
                />
              </div>
            }

            @if (svc.activeReport()!.grids.length === 0 && !svc.activeReport()?.chart) {
              <div class="flex-1 flex flex-col items-center justify-center gap-4 text-muted-foreground opacity-40">
                <span class="material-icons text-6xl">add_box</span>
                <div class="text-center">
                  <h3 class="text-sm font-bold uppercase tracking-widest">No Components</h3>
                  <p class="text-xs mt-1">Use the left palette to add data sources or charts.</p>
                </div>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .designer { display: flex; flex-direction: column; height: 100%; overflow: hidden; }
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
      grids: [], sharedFilters: { id: crypto.randomUUID(), logic: 'AND' as const, conditions: [], groups: [] }
    };
    this.svc.setActiveReport(r);
  }

  onSaveRequested() {
    this.saveRequested.emit();
  }
}
