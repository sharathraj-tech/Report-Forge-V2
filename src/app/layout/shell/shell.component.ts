import { Component, inject, OnInit, signal, computed, ViewChild, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, NavigationEnd, RouterModule } from '@angular/router';
import { filter, tap } from 'rxjs';
import { ReportService } from '../../core/services/report.service';
import { NotificationService } from '../../core/services/notification.service';
import type { ReportDefinition } from '../../core/models/report.models';

@Component({
  selector: 'rf-shell',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule
  ],
  template: `
    <div class="flex flex-col h-screen overflow-hidden bg-white anim-fade">
      <!-- Global Preloader -->
      <div *ngIf="isNavigating()" class="rf-global-preloader">
        <div class="bar"></div>
      </div>

      <!-- Modern Compact Header -->
      <header class="rf-header flex items-center px-4 shrink-0 z-50">
        <div class="flex items-center gap-8 shrink-0">
          <!-- Logo -->
          <div class="flex items-center gap-2 cursor-pointer" (click)="router.navigate(['/'])">
            <span class="text-base font-black tracking-tighter text-slate-900">ReportForge</span>
            <span class="text-[10px] font-bold px-1.5 py-0.5 bg-slate-900 text-white rounded">NG</span>
          </div>

          <!-- Main Nav Tabs -->
          <nav class="flex items-center gap-1">
            @for (p of personas; track p.id) {
              <button 
                class="px-3 h-12 text-[12px] font-semibold transition-all relative border-b-2"
                [class.text-brand-primary]="persona() === p.id"
                [class.border-brand-primary]="persona() === p.id"
                [class.text-slate-500]="persona() !== p.id"
                [class.border-transparent]="persona() !== p.id"
                (click)="switchPersona(p.id)">
                {{ p.label }}
              </button>
            }
          </nav>
        </div>

        <!-- Center Search (Compact) -->
        <div class="flex-1 flex justify-center px-8">
          <div class="relative w-full max-w-md group">
             <span class="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 group-focus-within:text-brand-primary transition-colors">search</span>
             <input 
               type="text" 
               [(ngModel)]="searchQuery"
               class="rf-compact-input w-full pl-9 h-8 placeholder:text-slate-400" 
               placeholder="Search queries..."
             />
          </div>
        </div>

        <!-- Header Actions -->
        <div class="flex items-center gap-4 text-slate-500 shrink-0">
          <button 
            class="rf-compact-btn-outline h-8"
            *ngIf="reportService.activeReport() && persona() === 'developer'"
            (click)="saveReport()">
            <span class="material-icons text-sm">save</span>
            <span>SAVE</span>
          </button>
          
          <button class="w-8 h-8 flex items-center justify-center hover:bg-slate-100 rounded-full transition-colors relative">
             <span class="material-icons text-lg">notifications</span>
             <div class="absolute top-2 right-2 w-1.5 h-1.5 bg-destructive rounded-full"></div>
          </button>
          
          <div class="h-8 w-8 rounded-full bg-slate-900 flex items-center justify-center text-white cursor-pointer shadow-sm">
             <span class="material-icons text-sm">person</span>
          </div>
        </div>
      </header>

      <div class="flex-1 flex overflow-hidden">
        <!-- Explorer Sidebar (Compact) -->
        <aside class="rf-sidebar flex flex-col pt-3 shrink-0 h-full">
           <div class="px-4 mb-3 flex items-center justify-between">
              <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Explorer</span>
              <button (click)="loadReports()" class="text-slate-400 hover:text-slate-600">
                <span class="material-icons text-xs" [class.animate-spin]="reportService.loading()">refresh</span>
              </button>
           </div>

           <div class="px-3 mb-3">
              <button class="rf-compact-btn-primary w-full shadow-sm" (click)="newReport()">
                 <span class="material-icons text-sm">add</span>
                 <span>NEW QUERY</span>
              </button>
           </div>

           <nav class="flex flex-col mb-2">
              @for (nav of navItems; track nav.id) {
                <div class="group flex items-center gap-3 px-4 py-2 cursor-pointer transition-all text-[12px] font-semibold"
                     [class.text-slate-900]="activeNav() === nav.id"
                     [class.bg-white]="activeNav() === nav.id"
                     [class.border-l-2]="activeNav() === nav.id"
                     [class.border-brand-primary]="activeNav() === nav.id"
                     [class.text-slate-500]="activeNav() !== nav.id"
                     (click)="setNav(nav.id)">
                   <span class="material-icons text-sm" [class.text-brand-primary]="activeNav() === nav.id">{{ nav.icon }}</span>
                   <span class="uppercase tracking-tight">{{ nav.label }}</span>
                </div>
              }
           </nav>

           <!-- Report List -->
           <div class="flex-1 overflow-y-auto custom-scrollbar px-1" *ngIf="activeNav() !== 'dashboards'">
              <div class="flex flex-col gap-0.5">
                @if (isLoadingReports()) {
                  <div class="px-4 py-2 space-y-2">
                    <div class="h-8 w-full skeleton"></div>
                    <div class="h-8 w-full skeleton"></div>
                    <div class="h-8 w-full skeleton"></div>
                  </div>
                }
                @for (report of filteredReports(); track report.id) {
                  <div 
                    class="group flex items-center gap-2 px-3 py-2 cursor-pointer transition-all rounded-md mx-1"
                    [class.bg-white]="reportService.activeReport()?.id === report.id"
                    [class.shadow-sm]="reportService.activeReport()?.id === report.id"
                    [class.text-brand-primary]="reportService.activeReport()?.id === report.id"
                    (click)="openReport(report)">
                    <span class="material-icons text-sm opacity-60">
                      {{ report.chart ? 'insert_chart' : 'table_chart' }}
                    </span>
                    <div class="flex-1 min-w-0">
                      <div class="text-[11px] font-bold truncate">{{ report.name }}</div>
                      <div class="text-[9px] opacity-40 font-mono uppercase">{{ report.category }}</div>
                    </div>
                    <button 
                      class="opacity-0 group-hover:opacity-100 h-5 w-5 flex items-center justify-center rounded hover:bg-red-50 text-slate-400 hover:text-red-500"
                      (click)="deleteReport(report, $event)">
                      <span class="material-icons text-xs">delete_outline</span>
                    </button>
                  </div>
                }
              </div>
           </div>

           <!-- Sidebar Footer -->
           <div class="mt-auto border-t border-slate-200 p-4">
              <div class="flex items-center justify-between mb-1.5">
                 <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Capacity</span>
                 <span class="text-[9px] font-bold text-slate-600">{{ filteredReports().length }} / 20</span>
              </div>
              <div class="h-1 w-full bg-slate-200 rounded-full overflow-hidden">
                 <div class="h-full bg-brand-primary transition-all" [style.width]="storagePercent()"></div>
              </div>
           </div>
        </aside>

        <!-- Main Workspace (Router Outlet) -->
        <div class="flex-1 flex flex-col min-w-0 bg-white relative">
           <main class="flex-1 overflow-hidden">
              <router-outlet></router-outlet>
           </main>
        </div>
      </div>

      <!-- Compact Status Bar -->
      <footer class="rf-footer flex items-center justify-between px-4 text-[10px] font-bold tracking-tight shrink-0">
        <div class="flex items-center gap-5">
          <div class="flex items-center gap-1.5">
            <div class="h-1.5 w-1.5 rounded-full" [class.bg-green-400]="reportService.isLoaded()" [class.bg-yellow-400]="!reportService.isLoaded()"></div>
            <span class="opacity-70 uppercase">{{ reportService.isLoaded() ? 'Active' : 'Offline' }}</span>
          </div>
          <div class="h-3 w-px bg-white/10"></div>
          <div class="flex items-center gap-1.5 opacity-50" *ngIf="reportService.activeReport()">
             <span class="material-icons text-[12px]">description</span>
             <span>{{ reportService.activeReport()!.name }}</span>
          </div>
        </div>

        <div class="flex items-center gap-5 opacity-40">
           <span>{{ filteredReports().length }} ENTITIES</span>
           <span>LN 1, COL 1</span>
           <span>UTF-8</span>
        </div>
      </footer>
    </div>
  `,
  styles: [`
    :host { display: block; height: 100vh; }
  `]
})
export class ShellComponent implements OnInit {
  reportService = inject(ReportService);
  notify = inject(NotificationService);
  router = inject(Router);
  
  isNavigating = signal(false);
  isLoadingReports = signal(false);
  activeNav = signal<'my-queries' | 'shared' | 'dashboards' | 'favorites'>('my-queries');
  persona = signal<'developer' | 'customer' | 'schema' | 'embed'>('developer');
  searchQuery = '';

  personas = [
    { id: 'developer', label: 'Developer' },
    { id: 'customer', label: 'Customer' },
    { id: 'schema', label: 'Schema' },
    { id: 'embed', label: 'Embed' }
  ] as const;

  navItems = [
    { id: 'my-queries', label: 'My Queries', icon: 'storage' },
    { id: 'shared', label: 'Shared', icon: 'people_outline' },
    { id: 'dashboards', label: 'Dashboards', icon: 'dashboard' },
    { id: 'favorites', label: 'Favorites', icon: 'star_outline' }
  ] as const;

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
    return Math.min((count / 20) * 100, 100) + '%';
  });

  ngOnInit() {
    this.reportService.loadEntities();
    this.loadReports();
    this.updatePersona();
    
    this.router.events.subscribe(e => {
      if (e instanceof NavigationEnd) {
        this.updatePersona();
        this.isNavigating.set(false);
      } else {
        // Simple heuristic for showing preloader
        if (e.constructor.name.includes('NavigationStart')) {
          this.isNavigating.set(true);
        }
      }
    });
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
    if (url.includes('customer')) this.persona.set('customer');
    else if (url.includes('schema')) this.persona.set('schema');
    else if (url.includes('embed')) this.persona.set('embed');
    else this.persona.set('developer');
  }

  switchPersona(p: string) {
    this.router.navigate([p]);
  }

  setNav(nav: any) {
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
    this.router.navigate(['/developer']);
  }

  saveReport() {
    const report = this.reportService.activeReport();
    if (!report) return;
    this.reportService.saveReport(report).subscribe(() => this.loadReports());
  }
}
