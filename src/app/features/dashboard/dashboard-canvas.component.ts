import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardWidgetComponent } from './dashboard-widget.component';
import { DashboardService } from '../../core/services/dashboard.service';
import { ReportService } from '../../core/services/report.service';
import { NotificationService } from '../../core/services/notification.service';
import { DxSelectBoxModule, DxButtonModule } from 'devextreme-angular';
import type { Dashboard, DashboardWidget } from '../../core/models/dashboard.models';

@Component({
  selector: 'rf-dashboard-canvas',
  standalone: true,
  imports: [
    CommonModule, 
    DashboardWidgetComponent, 
    DxSelectBoxModule, 
    DxButtonModule
  ],
  template: `
    <div class="flex flex-col h-full bg-[#f8fafc] anim-fade">
      <!-- High-Fidelity Toolbar -->
      <div class="h-14 border-b flex items-center justify-between px-6 bg-white shrink-0">
        <div class="flex items-center gap-3">
          <span class="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest whitespace-nowrap">DASHBOARD CANVAS</span>
          <div class="h-4 w-px bg-slate-200"></div>
          <!-- Dashboard Selector -->
          <dx-select-box
            [items]="svc.dashboards()"
            displayExpr="name"
            [value]="svc.activeDashboard()"
            [width]="220"
            placeholder="Select dashboard..."
            (onValueChanged)="selectDashboard($event.value)"
          />
          <span class="ml-2 rf-badge rf-badge-info" *ngIf="editMode()">DESIGN MODE</span>
        </div>
        
        <div class="flex items-center gap-2">
           <button class="shadcn-btn-ghost h-8 px-3 text-[11px] font-bold flex items-center gap-2" (click)="createDashboard()" *ngIf="!editMode()">
              <span class="material-icons text-sm">add</span> NEW DASHBOARD
           </button>
           <button class="shadcn-btn-outline h-8 px-4 rounded text-xs font-bold" (click)="toggleEdit()">
              {{ editMode() ? 'EXIT DESIGNER' : 'DESIGN DYNAMIC' }}
           </button>
           <button class="shadcn-btn-primary h-8 px-5 rounded flex items-center gap-2 shadow-sm" *ngIf="editMode()" (click)="saveDashboard()">
              <span class="material-icons text-sm">save</span>
              <span class="text-xs font-bold">SAVE LAYOUT</span>
           </button>
        </div>
      </div>

      <!-- Canvas Area -->
      <div class="flex-1 relative overflow-auto p-8 flex flex-col items-center">
         <div class="grid-overlay" *ngIf="editMode()"></div>
         
         <div class="w-full max-w-7xl h-full relative" *ngIf="!maximizedWidgetId()">
           @for (widget of widgets(); track widget.id) {
              <rf-dashboard-widget
                 [widget]="widget"
                 [editMode]="editMode()"
                 [selected]="selectedWidgetId() === widget.id"
                 (update)="onWidgetUpdate(widget.id, $event)"
                 (remove)="onWidgetRemove(widget.id)"
                 (select)="selectedWidgetId.set(widget.id)"
                 (maximize)="maximizedWidgetId.set(widget.id)"
              />
           }

           <div class="h-full flex flex-col items-center justify-center gap-6 text-center anim-fade" *ngIf="widgets().length === 0 && !svc.loading()">
              <div class="w-20 h-20 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center mb-2">
                <span class="material-icons text-slate-400 text-4xl">dashboard_customize</span>
              </div>
              <div class="flex flex-col gap-2">
                <span class="text-sm font-extrabold text-slate-500 uppercase tracking-widest">Empty Workspace</span>
                <span class="text-xs text-slate-400">{{ svc.activeDashboard() ? 'Click Design Dynamic to add reports.' : 'Create or select a dashboard to get started.' }}</span>
                <button *ngIf="!svc.activeDashboard()" class="shadcn-btn-primary mt-4 px-6 py-2 rounded-md text-sm font-bold mx-auto" (click)="createDashboard()">
                  Create First Dashboard
                </button>
              </div>
           </div>
         </div>

         <!-- Maximized Overlay -->
         <div class="fixed inset-0 z-[200] bg-white flex flex-col anim-fade-scale" *ngIf="maximizedWidgetId() as mid">
            <div class="h-14 border-b flex items-center justify-between px-6 bg-slate-50">
              <div class="flex items-center gap-3">
                <span class="material-icons text-brand-blue">fullscreen</span>
                <span class="text-xs font-extrabold text-slate-500 uppercase tracking-widest">{{ getWidgetById(mid)?.title }}</span>
              </div>
              <button class="shadcn-btn-ghost h-8 w-8 p-0" (click)="maximizedWidgetId.set(null)">
                <span class="material-icons text-sm">close</span>
              </button>
            </div>
            <div class="flex-1 p-8 overflow-hidden">
               <rf-dashboard-widget
                 [widget]="getWidgetById(mid)!"
                 [editMode]="false"
                 [isMaximized]="true"
               />
            </div>
         </div>
      </div>

      <!-- Widget Library Strip (Bottom) -->
      <div class="h-24 bg-white border-t flex flex-col px-6 py-2 shrink-0 z-10" *ngIf="editMode()">
         <div class="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">AVAILABLE REPORTS — Click to add widget</div>
         <div class="flex-1 flex gap-4 overflow-x-auto pb-1 custom-scrollbar">
            @if (reportSvc.reports().length === 0) {
              <div class="flex items-center text-[10px] text-slate-400 italic">No reports available — create one in Developer mode.</div>
            }
            @for (report of reportSvc.reports(); track report.id) {
               <div class="min-w-[120px] h-full bg-slate-50 border rounded-md flex flex-col p-2 cursor-pointer hover:border-brand-blue hover:bg-white transition-all group relative shadow-sm" (click)="addWidget(report.id)">
                  <div class="flex justify-between items-start mb-1">
                     <span class="material-icons text-brand-blue text-[14px]">{{ report.chart ? 'insert_chart' : 'grid_on' }}</span>
                     <span class="material-icons text-slate-300 text-[12px] opacity-0 group-hover:opacity-100">add</span>
                  </div>
                  <div class="text-[9px] font-bold text-slate-700 truncate leading-tight uppercase">{{ report.name }}</div>
                  <div class="text-[8px] text-slate-400 truncate uppercase mt-0.5">{{ report.category }}</div>
               </div>
            }
         </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; height: 100%; }
    .grid-overlay {
      position: absolute; inset: 0; pointer-events: none;
      background-image: 
        linear-gradient(rgba(0,0,0,0.02) 1px, transparent 1px),
        linear-gradient(90deg, rgba(0,0,0,0.02) 1px, transparent 1px);
      background-size: 32px 32px;
    }
    .custom-scrollbar::-webkit-scrollbar { height: 4px; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.05); border-radius: 10px; }
  `]
})
export class DashboardCanvasComponent implements OnInit {
  svc = inject(DashboardService);
  reportSvc = inject(ReportService);
  notify = inject(NotificationService);
  
  editMode = signal(false);
  widgets = signal<DashboardWidget[]>([]);
  selectedWidgetId = signal<string | null>(null);
  maximizedWidgetId = signal<string | null>(null);

  getWidgetById(id: string) {
    return this.widgets().find(w => w.id === id);
  }

  ngOnInit() {
    this.svc.loadDashboards();
    this.reportSvc.loadReports().subscribe(reports => {
      this.reportSvc.reports.set(reports);
    });
    
    setTimeout(() => {
       const list = this.svc.dashboards();
       if (list.length > 0) {
          this.selectDashboard(list[0]);
       }
    }, 500);
  }

  selectDashboard(dash: Dashboard | null) {
    if (!dash) return;
    this.svc.activeDashboard.set(dash);
    this.widgets.set([...dash.widgets]);
    this.selectedWidgetId.set(null);
    this.editMode.set(false);
  }

  createDashboard() {
    const name = prompt('Dashboard name:', 'New Dashboard');
    if (!name) return;
    const newDash: Dashboard = {
      id: '',
      name,
      description: '',
      category: 'General',
      isPublic: false,
      widgets: []
    };
    this.svc.saveDashboard(newDash).subscribe(() => {
       this.notify.success(`Dashboard "${name}" created!`);
       // After save, reload and select new dashboard
       setTimeout(() => {
         const list = this.svc.dashboards();
         const created = list.find(d => d.name === name);
         if (created) this.selectDashboard(created);
       }, 600);
    });
  }

  toggleEdit() {
    this.editMode.set(!this.editMode());
    if (!this.editMode()) {
       this.selectedWidgetId.set(null);
    }
  }

  addWidget(reportId: string) {
    if (!reportId) return;
    const report = this.reportSvc.reports().find(r => r.id === reportId);
    if (!report) return;

    const newWidget: DashboardWidget = {
      id: crypto.randomUUID(),
      reportId: report.id,
      title: report.name,
      type: report.chart ? 'chart' : 'grid',
      x: 5, y: 5, width: 40, height: 40
    };

    this.widgets.update(list => [...list, newWidget]);
    this.notify.success(`"${report.name}" added to dashboard.`);
  }

  onWidgetUpdate(id: string, delta: Partial<DashboardWidget>) {
    this.widgets.update(list => list.map(w => w.id === id ? { ...w, ...delta } : w));
  }

  onWidgetRemove(id: string) {
    this.widgets.update(list => list.filter(w => w.id !== id));
    if (this.selectedWidgetId() === id) {
       this.selectedWidgetId.set(null);
    }
  }

  saveDashboard() {
    const dash = this.svc.activeDashboard();
    if (dash) {
      dash.widgets = this.widgets();
      this.svc.saveDashboard(dash).subscribe(() => {
         this.editMode.set(false);
         this.selectedWidgetId.set(null);
         this.notify.success('Dashboard saved!');
      });
    }
  }
}
