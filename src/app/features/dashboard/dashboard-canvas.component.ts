import { Component, inject, signal, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardWidgetComponent } from './dashboard-widget.component';
import { DashboardService } from '../../core/services/dashboard.service';
import { ReportService } from '../../core/services/report.service';
import { NotificationService } from '../../core/services/notification.service';
import { DxSelectBoxModule, DxButtonModule, DxPopupModule, DxTextBoxModule, DxValidatorModule, DxValidationGroupModule, DxValidationGroupComponent } from 'devextreme-angular';
import type { Dashboard, DashboardWidget } from '../../core/models/dashboard.models';

@Component({
  selector: 'rf-dashboard-canvas',
  standalone: true,
  imports: [
    CommonModule, 
    DashboardWidgetComponent, 
    DxSelectBoxModule, 
    DxButtonModule,
    DxPopupModule,
    DxTextBoxModule,
    DxValidatorModule,
    DxValidationGroupModule
  ],
  template: `
    <div class="flex flex-col h-full bg-slate-50 anim-fade">
      <!-- Toolbar (Slate) -->
      <div class="h-12 border-b flex items-center justify-between px-4 bg-white shrink-0 shadow-sm z-10">
        <div class="flex items-center gap-3">
          <div class="flex items-center gap-2">
            <div class="h-6 w-6 rounded bg-slate-900 flex items-center justify-center">
               <span class="material-icons text-white text-xs">dashboard</span>
            </div>
            <span class="text-[10px] font-black text-slate-800 uppercase tracking-widest leading-none">Intelligence</span>
          </div>
          <div class="h-4 w-px bg-slate-200"></div>
          
          <dx-select-box
            [items]="svc.dashboards()"
            displayExpr="name"
            [value]="svc.activeDashboard()"
            [width]="180"
            placeholder="Select View..."
            class="compact-select"
            (onValueChanged)="selectDashboard($event.value)"
          />
          <span class="px-2 py-0.5 rounded bg-amber-50 text-amber-700 text-[8px] font-black border border-amber-200 uppercase tracking-tighter" *ngIf="editMode()">Designing</span>
        </div>
        
        <div class="flex items-center gap-2">
           <button class="rf-compact-btn-ghost h-8" (click)="showCreatePopup()" *ngIf="!editMode()">
              <span class="material-icons text-xs">add</span>
              <span class="text-[9px] font-black uppercase">New</span>
           </button>
           <button class="rf-compact-btn-outline h-8 px-3" (click)="toggleEdit()">
              <span class="text-[9px] font-black uppercase">{{ editMode() ? 'Exit Design' : 'Design Dynamic' }}</span>
           </button>
           <button class="rf-compact-btn-primary h-8 px-4 shadow-sm" *ngIf="editMode()" (click)="saveDashboard()">
              <span class="material-icons text-xs">save</span>
              <span class="text-[9px] font-black uppercase">Save Layout</span>
           </button>
        </div>
      </div>

      <!-- Canvas Area -->
      <div class="flex-1 relative overflow-auto p-6 flex flex-col items-center custom-scrollbar">
         <div class="grid-overlay" *ngIf="editMode()"></div>
         
         <div class="w-full max-w-7xl h-full relative" *ngIf="!maximizedWidgetId()">
            @if (svc.loading()) {
              <div class="absolute inset-0 flex items-center justify-center">
                 <div class="flex flex-col items-center gap-3">
                    <div class="w-8 h-8 border-2 border-slate-200 border-t-brand-primary rounded-full animate-spin"></div>
                    <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hydrating Dashboard...</span>
                 </div>
              </div>
            } @else {
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

              @if (widgets().length === 0) {
                 <div class="h-full flex flex-col items-center justify-center gap-6 text-center anim-fade">
                    <div class="w-16 h-16 rounded-3xl bg-white border border-slate-200 shadow-sm flex items-center justify-center mb-2">
                      <span class="material-icons text-slate-300 text-3xl">dashboard_customize</span>
                    </div>
                    <div class="flex flex-col gap-1">
                      <span class="text-[11px] font-black text-slate-900 uppercase tracking-tight">Empty Cockpit</span>
                      <span class="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{{ svc.activeDashboard() ? 'Use the bottom palette to add widgets.' : 'Create a view to begin analysis.' }}</span>
                      <button *ngIf="!svc.activeDashboard()" class="rf-compact-btn-primary mt-6 px-6 h-10" (click)="showCreatePopup()">
                        INITIALIZE WORKSPACE
                      </button>
                    </div>
                 </div>
              }
            }
         </div>

         <!-- Maximized View -->
         <div class="fixed inset-0 z-[200] bg-white flex flex-col anim-fade-scale" *ngIf="maximizedWidgetId() as mid">
            <div class="h-12 border-b flex items-center justify-between px-6 bg-slate-50">
              <div class="flex items-center gap-3">
                <span class="material-icons text-brand-primary text-sm">fullscreen</span>
                <span class="text-[10px] font-black text-slate-800 uppercase tracking-widest">{{ getWidgetById(mid)?.title }}</span>
              </div>
              <button class="rf-compact-btn-ghost w-8 h-8 p-0" (click)="maximizedWidgetId.set(null)">
                <span class="material-icons text-sm">close</span>
              </button>
            </div>
            <div class="flex-1 p-6 overflow-hidden">
               <rf-dashboard-widget
                 [widget]="getWidgetById(mid)!"
                 [editMode]="false"
                 [isMaximized]="true"
               />
            </div>
         </div>
      </div>

      <!-- Library Strip (Slate) -->
      <div class="h-20 bg-white border-t flex flex-col px-4 py-2 shrink-0 z-10 shadow-lg" *ngIf="editMode()">
         <div class="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5 ml-1">Asset Repository</div>
         <div class="flex-1 flex gap-3 overflow-x-auto pb-1 custom-scrollbar">
            @for (report of reportSvc.reports(); track report.id) {
               <div class="min-w-[140px] h-full bg-slate-50 border border-slate-100 rounded-lg flex flex-col p-2 cursor-pointer hover:border-brand-primary hover:bg-white transition-all group relative shadow-sm" (click)="addWidget(report.id)">
                  <div class="flex justify-between items-start mb-0.5">
                     <span class="material-icons text-brand-primary text-xs">{{ report.chart ? 'analytics' : 'grid_on' }}</span>
                     <span class="material-icons text-slate-300 text-xs opacity-0 group-hover:opacity-100">add_circle</span>
                  </div>
                  <div class="text-[9px] font-black text-slate-700 truncate leading-tight uppercase">{{ report.name }}</div>
                  <div class="text-[8px] font-bold text-slate-400 truncate uppercase mt-0.5">{{ report.category }}</div>
               </div>
            }
         </div>
      </div>

      <!-- Create Dashboard Popup -->
      <dx-popup
        [visible]="isCreatePopupVisible()"
        [width]="400"
        [height]="'auto'"
        [showTitle]="false"
        (onHiding)="isCreatePopupVisible.set(false)">
        <div *dxTemplate="let data of 'content'" class="p-6">
           <dx-validation-group #createValGroup>
              <h2 class="text-[11px] font-black text-slate-900 uppercase tracking-widest mb-6">Create New Dashboard</h2>
              <div class="space-y-4">
                 <div class="space-y-1.5">
                    <label class="text-[9px] font-black text-slate-400 uppercase">Dashboard Name</label>
                    <dx-text-box [(value)]="newDashName" placeholder="Executive Sales View..." class="rf-compact-input">
                       <dx-validator>
                          <dxi-validation-rule type="required" message="Identity is required"></dxi-validation-rule>
                          <dxi-validation-rule type="stringLength" [max]="50" message="Too long (max 50)"></dxi-validation-rule>
                       </dx-validator>
                    </dx-text-box>
                 </div>
              </div>
              <div class="flex justify-end gap-2 mt-8">
                 <button class="rf-compact-btn-ghost h-9" (click)="isCreatePopupVisible.set(false)">CANCEL</button>
                 <button class="rf-compact-btn-primary h-9 px-6" (click)="onCreateSubmit()">INITIALIZE</button>
              </div>
           </dx-validation-group>
        </div>
      </dx-popup>
    </div>
  `,
  styles: [`
    :host { display: block; height: 100%; }
    .grid-overlay {
      position: absolute; inset: 0; pointer-events: none;
      background-image: 
        radial-gradient(circle, #e2e8f0 1px, transparent 1px);
      background-size: 24px 24px;
      opacity: 0.5;
    }
    ::ng-deep .compact-select .dx-texteditor-input { padding: 6px 10px !important; font-size: 11px !important; font-weight: 600 !important; }
    ::ng-deep .compact-select { border-radius: 6px !important; border-color: #e2e8f0 !important; }
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

  isCreatePopupVisible = signal(false);
  newDashName = '';
  @ViewChild('createValGroup', { static: false }) createValGroup?: DxValidationGroupComponent;

  getWidgetById(id: string) { return this.widgets().find(w => w.id === id); }

  ngOnInit() {
    this.svc.loadDashboards();
    this.reportSvc.loadReports().subscribe(reports => this.reportSvc.reports.set(reports));
    
    setTimeout(() => {
       const list = this.svc.dashboards();
       if (list.length > 0) this.selectDashboard(list[0]);
    }, 500);
  }

  selectDashboard(dash: Dashboard | null) {
    if (!dash) return;
    this.svc.activeDashboard.set(dash);
    this.widgets.set([...dash.widgets]);
    this.selectedWidgetId.set(null);
    this.editMode.set(false);
  }

  showCreatePopup() {
    this.newDashName = '';
    this.isCreatePopupVisible.set(true);
  }

  onCreateSubmit() {
    const res = this.createValGroup?.instance.validate();
    if (!res?.isValid) {
       this.notify.validationWarning('Dashboard identity is missing or invalid.');
       return;
    }

    const name = this.newDashName;
    const newDash: Dashboard = { id: '', name, description: '', category: 'General', isPublic: false, widgets: [] };
    this.svc.saveDashboard(newDash).subscribe(() => {
       this.notify.success(`Entity "${name}" created.`);
       this.isCreatePopupVisible.set(false);
       setTimeout(() => {
         const list = this.svc.dashboards();
         const created = list.find(d => d.name === name);
         if (created) this.selectDashboard(created);
       }, 600);
    });
  }

  toggleEdit() {
    this.editMode.set(!this.editMode());
    if (!this.editMode()) this.selectedWidgetId.set(null);
  }

  addWidget(reportId: string) {
    const report = this.reportSvc.reports().find(r => r.id === reportId);
    if (!report) return;
    const newWidget: DashboardWidget = {
      id: crypto.randomUUID(), reportId: report.id, title: report.name,
      type: report.chart ? 'chart' : 'grid', x: 2, y: 2, width: 30, height: 30
    };
    this.widgets.update(list => [...list, newWidget]);
    this.notify.success(`Asset "${report.name}" mapped.`);
  }

  onWidgetUpdate(id: string, delta: Partial<DashboardWidget>) {
    this.widgets.update(list => list.map(w => w.id === id ? { ...w, ...delta } : w));
  }

  onWidgetRemove(id: string) {
    this.widgets.update(list => list.filter(w => w.id !== id));
    if (this.selectedWidgetId() === id) this.selectedWidgetId.set(null);
  }

  saveDashboard() {
    const dash = this.svc.activeDashboard();
    if (dash) {
      dash.widgets = this.widgets();
      this.svc.saveDashboard(dash).subscribe(() => {
         this.editMode.set(false);
         this.selectedWidgetId.set(null);
         this.notify.success('Manifest updated.');
      });
    }
  }
}
