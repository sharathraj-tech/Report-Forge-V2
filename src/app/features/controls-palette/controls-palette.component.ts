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
    <div class="flex flex-col h-full bg-background/50">
      <!-- Header with Search -->
      <div class="px-5 py-6 border-b flex flex-col gap-5">
        <div class="flex items-center gap-2 text-primary opacity-80">
          <span class="material-icons text-lg">explore</span>
          <h2 class="text-[11px] font-bold uppercase tracking-[0.2em] leading-none">Navigator</h2>
        </div>
        
        <div class="relative group">
          <span class="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground group-focus-within:text-primary transition-colors">search</span>
          <input
            class="w-full bg-background border h-9 pl-9 pr-4 rounded-md text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary placeholder:text-muted-foreground/50"
            placeholder="Search assets..."
            (input)="onSearch($event)"
          />
        </div>
      </div>

      <div class="flex-1 overflow-y-auto custom-scrollbar px-2 py-4 flex flex-col gap-2">
        <!-- Entities Section -->
        <div class="rounded-lg border bg-card/40 overflow-hidden shadow-sm">
          <div class="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors border-b" (click)="entitiesOpen.set(!entitiesOpen())">
            <div class="flex items-center gap-2">
               <span class="material-icons text-sm transition-transform duration-200" [class.rotate-90]="entitiesOpen()">chevron_right</span>
               <span class="text-[11px] font-bold uppercase tracking-widest text-foreground/80">Data Schema</span>
            </div>
            <span class="text-[10px] font-bold bg-muted px-2 py-0.5 rounded-full text-muted-foreground">{{ filteredEntities().length }}</span>
          </div>
          
          <div class="px-2 py-2 flex flex-col gap-1" *ngIf="entitiesOpen()">
            @for (entity of filteredEntities(); track entity.id) {
              <div class="group flex items-center gap-3 p-2 rounded-md hover:bg-primary/5 cursor-pointer transition-all border border-transparent hover:border-primary/20" (click)="openEntity(entity)">
                <div class="h-8 w-8 rounded bg-muted/50 flex items-center justify-center text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                  <span class="material-icons text-lg">table_chart</span>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="text-[13px] font-semibold text-foreground truncate leading-tight group-hover:text-primary transition-colors">{{ entity.displayName }}</div>
                  <div class="text-[11px] text-muted-foreground truncate opacity-70">{{ entity.fields.length }} attributes · {{ entity.providerKey }}</div>
                </div>
                <button class="shadcn-btn-ghost w-7 h-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity" (click)="addGrid(entity, $event)">
                  <span class="material-icons text-sm">add_box</span>
                </button>
              </div>
            }
            @empty {
              <div class="py-12 text-center">
                 <span class="material-icons text-muted-foreground/30 text-3xl">search_off</span>
                 <p class="text-[11px] font-medium text-muted-foreground mt-2">No schema objects</p>
              </div>
            }
          </div>
        </div>

        <!-- Saved Assets Section -->
        <div class="rounded-lg border bg-card/40 overflow-hidden shadow-sm">
          <div class="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors border-b" (click)="reportsOpen.set(!reportsOpen())">
            <div class="flex items-center gap-2">
               <span class="material-icons text-sm transition-transform duration-200" [class.rotate-90]="reportsOpen()">chevron_right</span>
               <span class="text-[11px] font-bold uppercase tracking-widest text-foreground/80">Saved Reports</span>
            </div>
            <button class="p-1 hover:bg-muted rounded transition-colors" (click)="loadReports(); $event.stopPropagation()" title="Sync Repository">
               <span class="material-icons text-sm text-muted-foreground">sync</span>
            </button>
          </div>
          
          <div class="px-2 py-2 flex flex-col gap-1" *ngIf="reportsOpen()">
            @for (report of savedReports(); track report.id) {
              <div class="group flex items-center gap-3 p-2 rounded-md hover:bg-muted/80 cursor-pointer transition-all border border-transparent" (click)="openReport(report)">
                <div class="h-8 w-8 rounded-full bg-primary/5 flex items-center justify-center text-primary/60 border border-primary/10">
                  <span class="material-icons text-sm">analytics</span>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="text-[13px] font-semibold text-foreground truncate leading-tight">{{ report.name }}</div>
                  <div class="text-[11px] text-muted-foreground truncate opacity-70">{{ report.category }} · {{ report.grids.length || 0 }} Views</div>
                </div>
                <button class="h-7 w-7 text-destructive/40 hover:text-destructive hover:bg-destructive/10 rounded transition-all opacity-0 group-hover:opacity-100 flex items-center justify-center" (click)="deleteReport(report, $event)">
                  <span class="material-icons text-sm">delete_outline</span>
                </button>
              </div>
            }
            @empty {
               <div class="py-12 text-center">
                 <span class="material-icons text-muted-foreground/30 text-3xl">history</span>
                 <p class="text-[11px] font-medium text-muted-foreground mt-2">Repository is empty</p>
              </div>
            }
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="rounded-lg border bg-card/40 overflow-hidden shadow-sm">
          <div class="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors border-b" (click)="componentsOpen.set(!componentsOpen())">
            <div class="flex items-center gap-2">
               <span class="material-icons text-sm transition-transform duration-200" [class.rotate-90]="componentsOpen()">chevron_right</span>
               <span class="text-[11px] font-bold uppercase tracking-widest text-foreground/80">Insert Controls</span>
            </div>
          </div>
          
          <div class="p-3" *ngIf="componentsOpen()">
            <div class="grid grid-cols-2 gap-2">
              <div class="flex flex-col items-center gap-2 p-4 rounded-lg bg-background border border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer group shadow-sm" (click)="addEmptyGrid()">
                <span class="material-icons text-muted-foreground group-hover:text-primary transition-colors">grid_view</span>
                <span class="text-[10px] font-bold uppercase tracking-tighter text-muted-foreground group-hover:text-foreground">Grid Pane</span>
              </div>
              <div class="flex flex-col items-center gap-2 p-4 rounded-lg bg-background border border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer group shadow-sm" (click)="addChart()">
                <span class="material-icons text-muted-foreground group-hover:text-primary transition-colors">analytics</span>
                <span class="text-[10px] font-bold uppercase tracking-tighter text-muted-foreground group-hover:text-foreground">Chart Block</span>
              </div>
              <div class="flex flex-col items-center gap-2 p-4 rounded-lg bg-background border border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer group shadow-sm" (click)="addFilter()">
                <span class="material-icons text-muted-foreground group-hover:text-primary transition-colors">tune</span>
                <span class="text-[10px] font-bold uppercase tracking-tighter text-muted-foreground group-hover:text-foreground">Global Filter</span>
              </div>
              <div class="flex flex-col items-center gap-2 p-4 rounded-lg bg-background border border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer group shadow-sm">
                <span class="material-icons text-muted-foreground group-hover:text-primary transition-colors">security</span>
                <span class="text-[10px] font-bold uppercase tracking-tighter text-muted-foreground group-hover:text-foreground">Access Policy</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; height: 100%; border-right: 1px solid var(--border); }
    .custom-scrollbar::-webkit-scrollbar { width: 4px; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--border); border-radius: 10px; }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: var(--muted-foreground); }
  `]
})
export class ControlsPaletteComponent implements OnInit {
  svc = inject(ReportService);

  constructor() {
    effect(() => {
      // Re-load when refreshNeeded changes
      if (this.svc.refreshNeeded() >= 0) {
        this.loadReports();
      }
    });
  }

  ngOnInit() {
    this.svc.loadEntities();
  }
  searchTerm = signal('');
  entitiesOpen = signal(true);
  reportsOpen = signal(false);
  componentsOpen = signal(true);
  savedReports = signal<any[]>([]);

  filteredEntities = computed(() => {
    const term = this.searchTerm().toLowerCase();
    return this.svc.entities().filter(e =>
      !term || e.displayName.toLowerCase().includes(term) || e.name.toLowerCase().includes(term)
    );
  });

  onSearch(e: Event) {
    this.searchTerm.set((e.target as HTMLInputElement).value);
  }

  openEntity(entity: EntityMetadata) {
    if (!this.svc.activeReport()) {
      this.svc.setActiveReport(defaultReport());
    }
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
      chart: { type: 'bar', xAxis: '', yAxis: '', aggregation: 'SUM', title: 'New Chart' }
    });
  }

  addFilter() { }

  openReport(report: any) {
    this.svc.setActiveReport(report);
  }

  loadReports() {
    this.svc.loadReports().subscribe(reports => this.savedReports.set(reports));
  }

  deleteReport(report: any, event: Event) {
    event.stopPropagation();
    // For simplicity, we use simple confirm here. In a real app, I'd use a service-based modal.
    if (confirm(`Are you sure you want to delete "${report.name}"?`)) {
      this.svc.deleteReport(report.id).subscribe();
    }
  }
}
