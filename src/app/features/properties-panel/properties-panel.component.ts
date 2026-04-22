import { Component, inject, computed, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DxAccordionModule, DxTextBoxModule, DxCheckBoxModule, DxSelectBoxModule, DxNumberBoxModule, DxValidatorModule, DxValidationGroupModule, DxValidationGroupComponent } from 'devextreme-angular';
import { ReportService } from '../../core/services/report.service';
import { NotificationService } from '../../core/services/notification.service';
import type { GridDefinition, CalculatedColumn } from '../../core/models/report.models';

@Component({
  selector: 'rf-properties-panel',
  standalone: true,
  imports: [
    CommonModule,
    DxAccordionModule,
    DxTextBoxModule,
    DxCheckBoxModule,
    DxSelectBoxModule,
    DxNumberBoxModule,
    DxValidatorModule,
    DxValidationGroupModule
  ],
  template: `
    <div class="flex flex-col h-full bg-white border-l border-slate-200 anim-fade">
      <!-- Standardized Header -->
      <div class="h-12 px-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
        <div class="flex items-center gap-2">
          <span class="material-icons text-slate-400 text-sm">tune</span>
          <h2 class="text-[9px] font-black text-slate-800 uppercase tracking-widest">Configuration</h2>
        </div>
        <button 
          class="rf-compact-btn-primary h-7 px-3 shadow-sm" 
          (click)="onCommitClick()" 
          [disabled]="svc.loading()">
           <div class="flex items-center gap-1.5">
              <span class="material-icons text-xs" [class.animate-spin]="svc.loading()">{{ svc.loading() ? 'sync' : 'save' }}</span>
              <span class="text-[9px] font-black uppercase">{{ svc.loading() ? 'SAVING' : 'COMMIT' }}</span>
           </div>
        </button>
      </div>

      <div class="flex-1 overflow-y-auto custom-scrollbar p-4">
        <dx-validation-group #validationGroup>
          @if (svc.activeReport(); as r) {
            <!-- Report Identity -->
            <div class="mb-6">
              <div class="flex items-center gap-2 mb-3">
                 <span class="text-[8px] font-black text-brand-primary uppercase tracking-[0.2em]">Identity</span>
                 <div class="h-px flex-1 bg-slate-100"></div>
              </div>
              <div class="space-y-4">
                <div class="space-y-1">
                  <label class="text-[9px] font-bold text-slate-400 uppercase ml-0.5">Asset Name</label>
                  <dx-text-box [value]="r.name" placeholder="Report name..." class="compact-input" (onValueChanged)="updateReport('name', $event.value)">
                    <dx-validator>
                       <dxi-validation-rule type="required" message="Asset name is required"></dxi-validation-rule>
                       <dxi-validation-rule type="stringLength" [max]="100" message="Name must be less than 100 chars"></dxi-validation-rule>
                    </dx-validator>
                  </dx-text-box>
                </div>
                <div class="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                  <div class="flex flex-col">
                    <span class="text-[10px] font-black text-slate-700 uppercase leading-none">Public Access</span>
                    <span class="text-[8px] font-bold text-slate-400 uppercase mt-0.5">Global visibility</span>
                  </div>
                  <dx-check-box [value]="r.isPublic" (onValueChanged)="updateReport('isPublic', $event.value)" />
                </div>
              </div>
            </div>

            <!-- View Properties -->
            @if (currentGrid(); as g) {
              <div class="mb-6">
                <div class="flex items-center gap-2 mb-3">
                   <span class="text-[8px] font-black text-brand-primary uppercase tracking-[0.2em]">Layout Properties</span>
                   <div class="h-px flex-1 bg-slate-100"></div>
                </div>
                <div class="space-y-4">
                  <div class="space-y-1">
                     <label class="text-[9px] font-bold text-slate-400 uppercase ml-0.5">View Strategy</label>
                     <dx-select-box
                       [items]="[{id:'grid',label:'Standard Grid'},{id:'chart',label:'Visual Analysis'}]"
                       displayExpr="label" valueExpr="id" [value]="g.activeView" class="compact-input"
                       (onValueChanged)="updateGrid('activeView', $event.value)" />
                  </div>

                  <div class="space-y-1">
                     <label class="text-[9px] font-bold text-slate-400 uppercase ml-0.5">Select Attribute</label>
                     <dx-select-box [items]="g.columns" [value]="selectedField()" placeholder="Select column..." class="compact-input" (onValueChanged)="selectedField.set($event.value)" />
                  </div>

                  <!-- Field Detail Card -->
                  @if (selectedField(); as fieldName) {
                    <div class="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-4 anim-slide-up">
                      <div class="space-y-1">
                         <label class="text-[8px] font-black text-slate-400 uppercase">Override Label</label>
                         <dx-text-box [value]="getColumnConf(selectedField()!).headerName || selectedField()!" class="compact-input-white" (onValueChanged)="updateColConf(selectedField()!, 'headerName', $event.value)">
                            <dx-validator>
                               <dxi-validation-rule type="required" message="Label cannot be empty"></dxi-validation-rule>
                            </dx-validator>
                         </dx-text-box>
                      </div>
                      <div class="grid grid-cols-2 gap-3">
                         <div class="space-y-1">
                            <label class="text-[8px] font-black text-slate-400 uppercase">Alignment</label>
                            <dx-select-box [items]="['left', 'center', 'right']" [value]="getColumnConf(selectedField()!).align" class="compact-input-white" (onValueChanged)="updateColConf(selectedField()!, 'align', $event.value)" />
                         </div>
                         <div class="space-y-1">
                            <label class="text-[8px] font-black text-slate-400 uppercase">Fixed Width</label>
                            <dx-number-box [value]="getColumnConf(selectedField()!).width || 0" [min]="0" class="compact-input-white" (onValueChanged)="updateColConf(selectedField()!, 'width', $event.value)" />
                         </div>
                      </div>
                      <div class="flex items-center justify-between pt-3 border-t border-slate-200/50">
                         <span class="text-[9px] font-black text-slate-500 uppercase">Visible in Grid</span>
                         <dx-check-box [value]="getColumnConf(selectedField()!).visible" (onValueChanged)="updateColConf(selectedField()!, 'visible', $event.value)" />
                      </div>
                    </div>
                  }
                </div>
              </div>
            }
          }
        </dx-validation-group>
      </div>

      <!-- Compliance Label -->
      <div class="p-4 bg-slate-50 border-t border-slate-100 mt-auto">
         <div class="flex items-center gap-2 text-slate-400 mb-1">
            <span class="material-icons text-xs">verified_user</span>
            <span class="text-[8px] font-black uppercase tracking-[0.1em]">Security Verified</span>
         </div>
         <p class="text-[8px] font-bold text-slate-400 uppercase leading-relaxed tracking-tighter opacity-60">
           Policy rules are enforced at the metadata layer. Version: 4.2.0-STABLE
         </p>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; height: 100%; }
    ::ng-deep {
       .compact-input .dx-texteditor-input { padding: 8px 12px !important; font-size: 11px !important; font-weight: 600 !important; color: #1e293b !important; }
       .compact-input .dx-texteditor-container { background: #f8fafc !important; border-radius: 8px !important; border: 1px solid #e2e8f0 !important; }
       
       .compact-input-white .dx-texteditor-input { padding: 6px 10px !important; font-size: 11px !important; font-weight: 600 !important; }
       .compact-input-white .dx-texteditor-container { background: #fff !important; border-radius: 6px !important; border: 1px solid #e2e8f0 !important; }

       .dx-checkbox-icon { border-radius: 6px !important; border-color: #cbd5e1 !important; width: 16px !important; height: 16px !important; }
       
       .dx-invalid-message > .dx-overlay-content { font-size: 10px !important; padding: 4px 8px !important; }
    }
  `]
})
export class PropertiesPanelComponent {
  svc = inject(ReportService);
  notify = inject(NotificationService);
  selectedField = signal<string>('');

  @ViewChild('validationGroup', { static: false }) validationGroup?: DxValidationGroupComponent;

  currentGrid = computed(() => {
    const r = this.svc.activeReport();
    const i = this.svc.activeGridIndex();
    return r?.grids[i] ?? null;
  });

  updateReport(key: string, value: any) {
    const r = this.svc.activeReport();
    if (r) this.svc.activeReport.set({ ...r, [key]: value });
  }

  updateGrid(key: string, value: any) {
    const g = this.currentGrid();
    if (g) this.svc.updateActiveGrid(this.svc.activeGridIndex(), { ...g, [key]: value });
  }

  onCommitClick() {
    const result = this.validationGroup?.instance.validate();
    if (result?.isValid) {
      this.saveReport();
    } else {
      this.notify.validationWarning('Please fix the validation errors before committing.');
    }
  }

  saveReport() {
    const r = this.svc.activeReport();
    if (!r) return;
    this.svc.saveReport(r).subscribe();
  }

  getColumnConf(fieldName: string) {
    const g = this.currentGrid();
    return g?.columnConfigs?.[fieldName] || { visible: true, align: 'left' };
  }

  updateColConf(fieldName: string, key: string, value: any) {
    const g = this.currentGrid();
    if (!g) return;
    const configs = { ...g.columnConfigs };
    configs[fieldName] = { ...(configs[fieldName] || { visible: true, align: 'left' }), [key]: value };
    this.updateGrid('columnConfigs', configs);
  }
}
