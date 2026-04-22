import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReportService } from '../../core/services/report.service';
import { ControlsPaletteComponent } from '../../features/controls-palette/controls-palette.component';
import { PropertiesPanelComponent } from '../../features/properties-panel/properties-panel.component';
import { ReportDesignerComponent } from '../../features/report-designer/report-designer.component';
import { DashboardCanvasComponent } from '../../features/dashboard/dashboard-canvas.component';
import { QueryModuleComponent } from '../../features/query-module/query-module.component';
import { SchemaManagerComponent } from '../../features/schema-manager/schema-manager.component';
import { EmbedManagerComponent } from '../../features/embed/embed-manager.component';
import { NotificationService } from '../../core/services/notification.service';
import { Router, ActivatedRoute, NavigationEnd } from '@angular/router';
import { filter, tap } from 'rxjs';
import { effect, ViewChild } from '@angular/core';
import type { ReportDefinition } from '../../core/models/report.models';

@Component({
  selector: 'rf-shell',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PropertiesPanelComponent,
    ReportDesignerComponent,
    DashboardCanvasComponent,
    QueryModuleComponent,
    SchemaManagerComponent,
    EmbedManagerComponent
  ],
  template: `
    <div class="flex flex-col h-screen overflow-hidden bg-background anim-fade">
      <!-- Precision Light Header -->
      <header class="h-14 border-b flex items-center px-6 bg-white shrink-0 z-50">
        <div class="flex items-center gap-10 shrink-0">
          <!-- Logo -->
          <div class="flex items-center gap-2 cursor-pointer" (click)="router.navigate(['/'])">
            <span class="text-lg font-black tracking-tight text-brand-navy">ReportForge</span>
          </div>

          <!-- Main Nav Tabs -->
          <nav class="flex items-center gap-6">
            <button 
              class="text-[13px] font-semibold transition-colors relative h-14"
              [class.text-brand-blue]="persona() === 'developer'"
              [class.text-muted-foreground]="persona() !== 'developer'"
              (click)="switchPersona('developer')">
              Developer
              <div *ngIf="persona() === 'developer'" class="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-blue"></div>
            </button>
            <button 
              class="text-[13px] font-semibold transition-colors relative h-14"
              [class.text-brand-blue]="persona() === 'customer'"
              [class.text-muted-foreground]="persona() !== 'customer'"
              (click)="switchPersona('customer')">
              Customer
              <div *ngIf="persona() === 'customer'" class="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-blue"></div>
            </button>
            <button 
              class="text-[13px] font-semibold transition-colors relative h-14"
              [class.text-brand-blue]="persona() === 'schema'"
              [class.text-muted-foreground]="persona() !== 'schema'"
              (click)="switchPersona('schema')">
              Schema
              <div *ngIf="persona() === 'schema'" class="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-blue"></div>
            </button>
            <button 
              class="text-[13px] font-semibold transition-colors relative h-14"
              [class.text-brand-blue]="persona() === 'embed'"
              [class.text-muted-foreground]="persona() !== 'embed'"
              (click)="switchPersona('embed')">
              Embed
              <div *ngIf="persona() === 'embed'" class="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-blue"></div>
            </button>
          </nav>
        </div>

        <!-- Center Search -->
        <div class="flex-1 flex justify-center px-12">
          <div class="relative w-full max-w-xl group">
             <span class="material-icons absolute left-4 top-1/2 -translate-y-1/2 text-[18px] text-muted-foreground group-focus-within:text-brand-blue transition-colors">search</span>
             <input 
               type="text" 
               [(ngModel)]="searchQuery"
               class="rf-input-rounded w-full pl-11 pr-4 h-9 outline-none text-brand-navy placeholder:text-muted-foreground/60" 
               placeholder="Search queries, datasets..."
             />
          </div>
        </div>

        <!-- Header Actions -->
        <div class="flex items-center gap-5 text-muted-foreground shrink-0">
          <button 
            class="shadcn-btn-outline h-8 px-4 text-[11px] font-bold rounded flex items-center gap-2"
            *ngIf="reportService.activeReport() && persona() === 'developer'"
            (click)="saveReport()">
            <span class="material-icons text-sm">save</span> SAVE
          </button>
          <div class="relative">
             <button class="hover:text-brand-navy transition-colors"><span class="material-icons text-[20px]">notifications</span></button>
             <div class="absolute top-0 right-0 w-2 h-2 bg-destructive rounded-full border-2 border-white"></div>
          </div>
          <div class="h-8 w-8 rounded-lg bg-brand-navy flex items-center justify-center text-white overflow-hidden cursor-pointer shadow-sm">
             <span class="material-icons text-[18px]">person</span>
          </div>
        </div>
      </header>

      <div class="flex-1 flex overflow-hidden">
        <!-- Explorer Sidebar -->
        <aside class="w-[240px] border-r bg-bg-sidebar flex flex-col pt-4 shrink-0 h-full">
           <div class="px-5 mb-4">
              <div class="rf-explorer-title mb-1">
                 <div class="dot"></div>
                 EXPLORER
              </div>
              <div class="text-[10px] font-bold text-muted-foreground/60 tracking-widest-xs">PRECISION DATA</div>
           </div>

           <div class="px-4 mb-4">
              <button class="shadcn-btn-primary w-full py-2.5 rounded-md flex items-center justify-center gap-2 shadow-md shadow-blue-500/10" (click)="newReport()">
                 <span class="material-icons text-sm">add</span>
                 <span class="text-xs font-bold">New Query</span>
              </button>
           </div>

           <nav class="flex flex-col border-b mb-2">
              <div class="rf-sidebar-item" [class.active]="activeNav() === 'my-queries'" (click)="setNav('my-queries')">
                 <span class="material-icons">storage</span>
                 MY QUERIES
              </div>
              <div class="rf-sidebar-item" [class.active]="activeNav() === 'shared'" (click)="setNav('shared')">
                 <span class="material-icons">people_outline</span>
                 SHARED
              </div>
              <div class="rf-sidebar-item" [class.active]="activeNav() === 'dashboards'" (click)="setNav('dashboards')">
                 <span class="material-icons">dashboard</span>
                 DASHBOARDS
              </div>
              <div class="rf-sidebar-item" [class.active]="activeNav() === 'favorites'" (click)="setNav('favorites')">
                 <span class="material-icons">star_outline</span>
                 FAVORITES
              </div>
           </nav>

           <!-- Report List (contextual) -->
           <div class="flex-1 overflow-y-auto custom-scrollbar-premium scroll-container" *ngIf="activeNav() !== 'dashboards'">
              <div class="px-3 py-2" *ngIf="isLoadingReports()">
                <div class="text-[10px] text-slate-400 flex items-center gap-2">
                  <span class="material-icons text-xs animate-spin">refresh</span> Loading...
                </div>
              </div>

              <div class="flex flex-col" *ngIf="!isLoadingReports()">
                @if (filteredReports().length === 0 && !reportService.loading()) {
                  <div class="px-4 py-6 text-center">
                    <span class="material-icons text-slate-200 text-3xl">folder_open</span>
                    <p class="text-[10px] text-slate-400 mt-2">No queries found.<br>Click "New Query" to start.</p>
                  </div>
                }
                @for (report of filteredReports(); track report.id) {
                  <div 
                    class="group flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors hover:bg-slate-100 border-l-2"
                    [class.border-brand-blue]="reportService.activeReport()?.id === report.id"
                    [class.border-transparent]="reportService.activeReport()?.id !== report.id"
                    [class.bg-slate-50]="reportService.activeReport()?.id === report.id"
                    (click)="openReport(report)">
                    <span class="material-icons text-sm text-slate-400 group-hover:text-brand-blue transition-colors">
                      {{ report.chart ? 'insert_chart' : 'table_chart' }}
                    </span>
                    <div class="flex-1 min-w-0">
                      <div class="text-[11px] font-semibold text-slate-700 truncate">{{ report.name }}</div>
                      <div class="text-[9px] text-slate-400 font-mono uppercase">{{ report.category }}</div>
                    </div>
                    <button 
                      class="opacity-0 group-hover:opacity-100 h-5 w-5 flex items-center justify-center rounded hover:bg-red-50 hover:text-red-500 transition-all text-slate-400"
                      (click)="deleteReport(report, $event)">
                      <span class="material-icons text-xs">delete_outline</span>
                    </button>
                  </div>
                }
              </div>
           </div>

           <!-- Sidebar Footer: Storage -->
           <div class="mt-auto border-t bg-muted/30 px-5 py-4">
              <!-- Reports Header -->
              <div class="h-10 px-4 flex items-center justify-between group">
                <span class="text-[9px] font-extrabold text-muted-foreground uppercase tracking-[0.2em] select-none">DATA PACKS</span>
                <button class="text-muted-foreground/40 hover:text-brand-blue transition-colors p-1 rounded-md" (click)="loadReports()" title="Refresh Lists" [disabled]="reportService.loading()">
                   <span class="material-icons text-sm" [class.animate-spin]="reportService.loading()">refresh</span>
                </button>
              </div>
              <div class="flex items-center justify-between mb-2">
                 <span class="text-[10px] font-bold text-muted-foreground tracking-widest">STORAGE</span>
                 <span class="text-[10px] font-bold text-brand-navy">{{ filteredReports().length }} REPORTS</span>
              </div>
              <div class="h-1 w-full bg-slate-200 rounded-full overflow-hidden">
                 <div class="h-full bg-brand-blue transition-all" [style.width]="storagePercent()"></div>
              </div>
           </div>
        </aside>

        <!-- Main Workspace -->
        <div class="flex-1 flex flex-col min-w-0 bg-white relative">
           <main class="flex-1 overflow-hidden flex flex-col">
              <ng-container *ngIf="persona() === 'developer'">
                 <rf-report-designer 
                   *ngIf="activeNav() !== 'dashboards'" 
                   [isRunning]="isRunning()" 
                   (runRequested)="runReport()" 
                   (saveRequested)="saveReport()">
                 </rf-report-designer>
                 <rf-dashboard-canvas #canvas *ngIf="activeNav() === 'dashboards'"></rf-dashboard-canvas>
              </ng-container>
              <rf-query-module *ngIf="persona() === 'customer'"></rf-query-module>
              <rf-schema-manager *ngIf="persona() === 'schema'"></rf-schema-manager>
              <rf-embed-manager *ngIf="persona() === 'embed'"></rf-embed-manager>
           </main>
        </div>

        <!-- Right Side Properties (Conditional) -->
        <aside class="w-[300px] border-l bg-[#fcfdfe] flex flex-col shrink-0 overflow-y-auto anim-fade" *ngIf="persona() === 'developer' && reportService.activeReport() && activeNav() !== 'dashboards'">
           <div class="flex-1 overflow-hidden">
              <rf-properties-panel></rf-properties-panel>
           </div>
        </aside>
      </div>

      <!-- Status Bar -->
      <footer class="h-9 bg-brand-navy text-white flex items-center justify-between px-4 text-[10px] font-bold tracking-widest-xs shrink-0">
        <div class="flex items-center gap-6">
          <div class="flex items-center gap-2">
            <div class="h-2 w-2 rounded-full" [class.bg-green-400]="reportService.isLoaded()" [class.bg-yellow-400]="!reportService.isLoaded()"></div>
            <span class="opacity-80">{{ reportService.isLoaded() ? 'CONNECTED' : 'CONNECTING...' }}</span>
          </div>
          <div class="flex items-center gap-2 opacity-60" *ngIf="reportService.activeReport()">
             <span class="material-icons text-xs">edit_note</span>
             <span>{{ reportService.activeReport()!.name }}</span>
          </div>
        </div>

        <div class="flex items-center gap-6 opacity-60">
           <div class="flex items-center gap-4">
              <span>{{ filteredReports().length }} QUERIES</span>
              <span>UTF-8</span>
           </div>
        </div>
      </footer>
    </div>
  `,
  styles: [`
    :host { display: block; height: 100vh; }
    .custom-scrollbar::-webkit-scrollbar { width: 4px; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.08); border-radius: 10px; }
  `]
})
export class ShellComponent implements OnInit {
  reportService = inject(ReportService);
  notify = inject(NotificationService);
  leftCollapsed = signal(false);
  rightCollapsed = signal(false);
  isRunning = signal(false);
  activeNav = signal<'my-queries' | 'shared' | 'dashboards' | 'favorites'>('my-queries');
  persona = signal<'developer' | 'customer' | 'schema' | 'embed'>('developer');
  searchQuery = '';
  isLoadingReports = signal(false);
  router = inject(Router);
  route = inject(ActivatedRoute);

  @ViewChild('canvas') canvas?: DashboardCanvasComponent;

  filteredReports = computed(() => {
    const all = this.reportService.reports();
    const q = this.searchQuery?.toLowerCase() || '';
    const nav = this.activeNav();
    return all.filter(r => {
      const matchesSearch = !q || r.name.toLowerCase().includes(q) || r.category.toLowerCase().includes(q);
      if (nav === 'shared') return matchesSearch && r.isPublic;
      if (nav === 'favorites') return matchesSearch && !!r.isFavorite;
      return matchesSearch;
    });
  });

  storagePercent = computed(() => {
    const count = this.reportService.reports().length;
    return Math.min(count * 5, 95) + '%';
  });

  constructor() {
    effect(() => {
      const widgetId = this.canvas?.selectedWidgetId();
      if (widgetId) {
        const widget = this.canvas?.widgets().find((w: any) => w.id === widgetId);
        if (widget?.reportId) {
          this.reportService.openReportById(widget.reportId);
        }
      }
    });
  }

  ngOnInit() {
    this.reportService.loadEntities();
    this.loadReports();
    this.updatePersona();
    
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd)
    ).subscribe(() => this.updatePersona());
  }

  loadReports() {
    this.isLoadingReports.set(true);
    this.reportService.loadReports().pipe(
      tap(reports => {
        this.reportService.reports.set(reports);
        this.isLoadingReports.set(false);
      })
    ).subscribe();
  }

  private updatePersona() {
    const url = this.router.url;
    if (url.includes('customer')) {
      this.persona.set('customer');
    } else if (url.includes('schema')) {
      this.persona.set('schema');
    } else if (url.includes('embed')) {
      this.persona.set('embed');
    } else {
      this.persona.set('developer');
    }
  }

  switchPersona(p: 'developer' | 'customer' | 'schema' | 'embed') {
    this.router.navigate([p]);
  }

  setNav(nav: 'my-queries' | 'shared' | 'dashboards' | 'favorites') {
    this.activeNav.set(nav);
  }

  openReport(report: ReportDefinition) {
    this.reportService.setActiveReport(report);
    this.activeNav.set('my-queries');
  }

  async deleteReport(report: ReportDefinition, e: Event) {
    e.stopPropagation();
    if (!report.id) return;
    const confirmed = await this.notify.confirm(`Delete "${report.name}"?`, 'Delete Report');
    if (!confirmed) return;
    this.reportService.deleteReport(report.id).subscribe(ok => {
      if (ok) this.loadReports();
    });
  }

  newReport() {
    const r: ReportDefinition = {
      id: '', name: 'New Query', description: '', category: 'General',
      createdBy: 'me', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), isPublic: false,
      grids: [], sharedFilters: { id: crypto.randomUUID(), logic: 'AND' as const, conditions: [], groups: [] }
    };
    this.reportService.setActiveReport(r);
    this.activeNav.set('my-queries');
  }

  saveReport() {
    const report = this.reportService.activeReport();
    if (!report) return;

    this.reportService.saveReport(report).subscribe({
      next: saved => {
        this.loadReports();
      },
      error: e => {
        this.notify.error('Failed to save report.');
      }
    });
  }

  runReport() {
    if (!this.reportService?.activeReport()) return;
    this.isRunning.set(true);
    setTimeout(() => this.isRunning.set(false), 100);
  }
}
