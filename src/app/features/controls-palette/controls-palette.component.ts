import { Component, inject, signal, computed, effect, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReportService } from '../../core/services/report.service';
import { defaultGrid, defaultReport } from '../../core/models/report.models';
import type { EntityMetadata, ReportDefinition } from '../../core/models/report.models';

@Component({
  selector: 'rf-controls-palette',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex flex-col h-full bg-white border-r border-slate-200">
      <!-- Search & Title -->
      <div class="px-4 py-4 border-b border-slate-100 flex flex-col gap-3">
        <div class="flex items-center gap-2">
          <span class="material-icons text-slate-400 text-xs">explore</span>
          <h2 class="text-[9px] font-black uppercase tracking-widest text-slate-800">Explorer</h2>
        </div>
        
        <div class="relative">
          <span class="material-icons absolute left-2 top-1/2 -translate-y-1/2 text-[14px] text-slate-400">search</span>
          <input
            class="w-full bg-slate-50 border border-slate-200 h-8 pl-8 pr-3 rounded-lg text-[11px] font-medium transition-all focus:outline-none focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary placeholder:text-slate-400"
            placeholder="Search assets..."
            (input)="onSearch($event)"
          />
        </div>
      </div>

      <div class="flex-1 overflow-y-auto custom-scrollbar p-2 flex flex-col gap-2">
        <!-- Entities Section -->
        <div class="rounded-lg border border-slate-100 bg-slate-50/30 overflow-hidden">
          <div class="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-slate-100 transition-colors border-b border-slate-100" (click)="entitiesOpen.set(!entitiesOpen())">
            <div class="flex items-center gap-2">
               <span class="material-icons text-xs transition-transform duration-200 text-slate-400" [class.rotate-90]="entitiesOpen()">chevron_right</span>
               <span class="text-[9px] font-black uppercase tracking-widest text-slate-600">Schema Objects</span>
            </div>
            <span class="text-[8px] font-black bg-slate-200 px-1.5 py-0.5 rounded-full text-slate-600">{{ filteredEntities().length }}</span>
          </div>
          
          <div class="p-1 flex flex-col gap-0.5" *ngIf="entitiesOpen()">
            @for (entity of filteredEntities(); track entity.id) {
              <div class="group flex items-center gap-2 p-2 rounded-lg hover:bg-white hover:shadow-sm cursor-pointer transition-all border border-transparent hover:border-slate-200" (click)="openEntity(entity)">
                <div class="h-7 w-7 rounded bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-brand-primary/10 group-hover:text-brand-primary transition-colors">
                  <span class="material-icons text-sm">table_rows</span>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="text-[11px] font-bold text-slate-800 truncate leading-tight">{{ entity.displayName }}</div>
                  <div class="text-[9px] font-bold text-slate-400 truncate uppercase tracking-tighter">{{ entity.fields.length }} ATTR</div>
                </div>
                <button class="rf-compact-btn-ghost h-6 w-6 p-0 opacity-0 group-hover:opacity-100" (click)="addGrid(entity, $event)">
                  <span class="material-icons text-xs">add</span>
                </button>
              </div>
            }
          </div>
        </div>

        <!-- Saved Reports -->
        <div class="rounded-lg border border-slate-100 bg-slate-50/30 overflow-hidden">
          <div class="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-slate-100 transition-colors border-b border-slate-100" (click)="reportsOpen.set(!reportsOpen())">
            <div class="flex items-center gap-2">
               <span class="material-icons text-xs transition-transform duration-200 text-slate-400" [class.rotate-90]="reportsOpen()">chevron_right</span>
               <span class="text-[9px] font-black uppercase tracking-widest text-slate-600">Repository</span>
            </div>
            <button class="h-5 w-5 hover:bg-slate-200 rounded flex items-center justify-center" (click)="loadReports(); $event.stopPropagation()">
               <span class="material-icons text-xs text-slate-400">sync</span>
            </button>
          </div>
          
          <div class="p-1 flex flex-col gap-0.5" *ngIf="reportsOpen()">
            @for (report of savedReports(); track report.id) {
              <div class="group flex items-center gap-2 p-2 rounded-lg hover:bg-white hover:shadow-sm cursor-pointer transition-all border border-transparent hover:border-slate-200" (click)="openReport(report)">
                <div class="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200">
                  <span class="material-icons text-xs">analytics</span>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="text-[11px] font-bold text-slate-800 truncate leading-tight">{{ report.name }}</div>
                  <div class="text-[9px] font-bold text-slate-400 truncate uppercase tracking-tighter">{{ report.category }}</div>
                </div>
                <button class="h-6 w-6 text-red-300 hover:text-red-500 rounded opacity-0 group-hover:opacity-100 flex items-center justify-center" (click)="deleteReport(report, $event)">
                  <span class="material-icons text-xs">delete_outline</span>
                </button>
              </div>
            }
          </div>
        </div>

        <!-- Insert Blocks -->
        <div class="rounded-lg border border-slate-100 bg-slate-50/30 overflow-hidden">
          <div class="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-slate-100 transition-colors border-b border-slate-100" (click)="componentsOpen.set(!componentsOpen())">
            <div class="flex items-center gap-2">
               <span class="material-icons text-xs transition-transform duration-200 text-slate-400" [class.rotate-90]="componentsOpen()">chevron_right</span>
               <span class="text-[9px] font-black uppercase tracking-widest text-slate-600">Components</span>
            </div>
          </div>
          
          <div class="p-2 grid grid-cols-2 gap-2" *ngIf="componentsOpen()">
            <div class="flex flex-col items-center gap-1.5 p-3 rounded-lg bg-white border border-slate-100 hover:border-brand-primary/50 hover:bg-slate-50 transition-all cursor-pointer group shadow-sm" (click)="addEmptyGrid()">
              <span class="material-icons text-slate-400 group-hover:text-brand-primary text-sm">grid_view</span>
              <span class="text-[8px] font-black uppercase tracking-tighter text-slate-500">Data Grid</span>
            </div>
            <div class="flex flex-col items-center gap-1.5 p-3 rounded-lg bg-white border border-slate-100 hover:border-brand-primary/50 hover:bg-slate-50 transition-all cursor-pointer group shadow-sm" (click)="addChart()">
              <span class="material-icons text-slate-400 group-hover:text-brand-primary text-sm">bar_chart</span>
              <span class="text-[8px] font-black uppercase tracking-tighter text-slate-500">Chart Block</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; height: 100%; }
    .custom-scrollbar::-webkit-scrollbar { width: 3px; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
  `]
})
export class ControlsPaletteComponent implements OnInit {
  svc = inject(ReportService);
  searchTerm = signal('');
  entitiesOpen = signal(true);
  reportsOpen = signal(false);
  componentsOpen = signal(true);
  savedReports = signal<any[]>([]);

  constructor() {
    effect(() => {
      if (this.svc.refreshNeeded() >= 0) this.loadReports();
    });
  }

  ngOnInit() { this.svc.loadEntities(); }

  filteredEntities = computed(() => {
    const term = this.searchTerm().toLowerCase();
    return this.svc.entities().filter(e =>
      !term || e.displayName.toLowerCase().includes(term) || e.name.toLowerCase().includes(term)
    );
  });

  onSearch(e: Event) { this.searchTerm.set((e.target as HTMLInputElement).value); }

  openEntity(entity: EntityMetadata) {
    if (!this.svc.activeReport()) this.svc.setActiveReport(defaultReport());
    this.addGrid(entity);
  }

  addGrid(entity: EntityMetadata, event?: Event) {
    event?.stopPropagation();
    if (!this.svc.activeReport()) this.svc.setActiveReport(defaultReport());
    this.svc.addGrid(defaultGrid(entity.name));
  }

  addEmptyGrid() {
    if (!this.svc.activeReport()) this.svc.setActiveReport(defaultReport());
    this.svc.addGrid(defaultGrid());
  }

  addChart() {
    const report = this.svc.activeReport();
    if (!report) return;
    this.svc.activeReport.set({
      ...report,
      chart: { type: 'bar', xAxis: '', yAxis: '', aggregation: 'SUM', title: 'New Visualization' }
    });
  }

  openReport(report: any) { this.svc.setActiveReport(report); }

  loadReports() {
    this.svc.loadReports().subscribe(reports => this.savedReports.set(reports));
  }

  deleteReport(report: any, event: Event) {
    event.stopPropagation();
    if (confirm(`Purge asset "${report.name}"?`)) {
      this.svc.deleteReport(report.id).subscribe();
    }
  }
}
