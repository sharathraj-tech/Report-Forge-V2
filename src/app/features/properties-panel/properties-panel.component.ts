import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DxAccordionModule, DxTextBoxModule, DxCheckBoxModule, DxSelectBoxModule, DxNumberBoxModule } from 'devextreme-angular';
import { ReportService } from '../../core/services/report.service';
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
    DxNumberBoxModule
  ],
  template: `
    <div class="flex flex-col h-full bg-white anim-fade-in border-l">
      <!-- High-Fidelity Header -->
      <div class="h-14 px-6 border-b flex items-center justify-between bg-slate-50/50 shrink-0">
        <div class="flex items-center gap-3">
          <span class="material-icons text-slate-400 text-lg">tune</span>
          <h2 class="text-[10px] font-extrabold text-slate-500 uppercase tracking-[0.15em] whitespace-nowrap">PROPERTIES</h2>
        </div>
        <button 
          class="shadcn-btn-primary h-8 px-4 rounded-md text-[10px] font-bold tracking-widest uppercase transition-all active:scale-95 shadow-md shadow-blue-500/10" 
          (click)="saveReport()" 
          [disabled]="svc.loading()">
           <div class="flex items-center gap-2">
              <span class="material-icons text-sm" [class.animate-spin]="svc.loading()">{{ svc.loading() ? 'sync' : 'save' }}</span>
              {{ svc.loading() ? 'SAVING' : 'SAVE CHANGES' }}
           </div>
        </button>
      </div>

      <div class="flex-1 overflow-y-auto custom-scrollbar">
        <!-- Metadata Context -->
        <div class="p-6 border-b bg-gradient-to-b from-slate-50/50 to-transparent" *ngIf="svc.activeReport() as r">
           <div class="flex flex-col gap-5">
              <div class="flex items-center gap-2 mb-1">
                 <span class="text-[9px] font-black text-brand-blue uppercase tracking-widest">Configuration Meta</span>
                 <div class="h-px flex-1 bg-slate-100"></div>
              </div>
              
              <div class="grid gap-4">
                 <div class="space-y-1.5">
                    <label class="text-[10px] font-bold text-slate-500/80 uppercase tracking-wider ml-0.5">Report Index Name</label>
                    <dx-text-box 
                      [value]="r.name" 
                      placeholder="e.g. Transaction Ledger"
                      class="premium-input-xl"
                      (onValueChanged)="updateReport('name', $event.value)" />
                 </div>

                 <div class="space-y-1.5" *ngIf="currentGrid() as g">
                    <label class="text-[10px] font-bold text-slate-500/80 uppercase tracking-wider ml-0.5">Active View Strategy</label>
                    <dx-select-box
                      [items]="[{id:'grid',label:'Standard Data Grid'},{id:'chart',label:'Visual Analytics'},{id:'pivot',label:'Multidimensional Pivot'}]"
                      displayExpr="label"
                      valueExpr="id"
                      [value]="g.activeView"
                      class="premium-input-xl"
                      (onValueChanged)="updateGrid('activeView', $event.value)"
                    />
                 </div>
              </div>
           </div>
        </div>

        <!-- Field Settings (Dynamic) -->
        <div class="p-6 border-b" *ngIf="currentGrid() as g">
           <div class="flex flex-col gap-6">
              <div class="flex items-center justify-between">
                 <div class="flex items-center gap-2">
                    <span class="text-[9px] font-black text-brand-blue uppercase tracking-widest">Structural Rules</span>
                 </div>
                 <div class="text-[9px] font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-500 uppercase">{{ g.columns.length }} Col Active</div>
              </div>

              <div class="space-y-4">
                 <div class="space-y-1.5">
                    <label class="text-[10px] font-bold text-slate-500/80 uppercase tracking-wider ml-0.5">Column to Adjust</label>
                    <dx-select-box
                      [items]="g.columns"
                      [value]="selectedField()"
                      placeholder="Choose a field..."
                      class="premium-input-xl"
                      (onValueChanged)="selectedField.set($event.value)"
                    ></dx-select-box>
                 </div>

                 <!-- Field Editor Well -->
                 <div class="bg-slate-50/80 rounded-xl p-5 border border-slate-100/80 space-y-5 anim-slide-up shadow-inner-sm" *ngIf="selectedField() as fieldName">
                    <div class="space-y-1.5">
                       <label class="text-[10px] font-bold text-slate-500/80 uppercase tracking-wider">Masking Label</label>
                       <dx-text-box 
                          [value]="getColumnConf(fieldName).headerName || fieldName" 
                          placeholder="Display Name"
                          class="bg-white rounded-lg border-slate-200"
                          (onValueChanged)="updateColConf(fieldName, 'headerName', $event.value)" />
                    </div>

                    <div class="grid grid-cols-2 gap-4">
                       <div class="space-y-1.5">
                          <label class="text-[10px] font-bold text-slate-500/80 uppercase tracking-wider">Alignment</label>
                          <dx-select-box 
                             [items]="['left', 'center', 'right']" 
                             [value]="getColumnConf(fieldName).align"
                             class="bg-white rounded-lg"
                             (onValueChanged)="updateColConf(fieldName, 'align', $event.value)" />
                       </div>
                       <div class="space-y-1.5">
                          <label class="text-[10px] font-bold text-slate-500/80 uppercase tracking-wider">Fixed Width</label>
                          <dx-number-box 
                             [value]="getColumnConf(fieldName).width || 0" 
                             [min]="0" 
                             [showSpinButtons]="true"
                             class="bg-white rounded-lg"
                             (onValueChanged)="updateColConf(fieldName, 'width', $event.value)" />
                       </div>
                    </div>

                    <div class="flex items-center justify-between pt-4 border-t border-slate-200/60 mt-2">
                       <span class="text-[10px] font-bold text-slate-600 uppercase tracking-tight">Active Visibility</span>
                       <dx-check-box [value]="getColumnConf(fieldName).visible" (onValueChanged)="updateColConf(fieldName, 'visible', $event.value)" />
                    </div>

                    <!-- Conditional Formatting Rules -->
                    <div class="space-y-3 pt-3 border-t border-dashed">
                      <div class="flex items-center justify-between">
                        <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Formatting Rules</span>
                        <button class="text-[9px] font-bold text-brand-blue hover:underline" (click)="addFormattingRule(fieldName)">+ ADD RULE</button>
                      </div>
                      <div class="flex flex-col gap-2">
                        @for (rule of getColumnConf(fieldName).formattingRules || []; track rule.id; let ri = $index) {
                          <div class="flex flex-col gap-2 p-2 bg-white rounded border border-slate-200 anim-fade relative group/rule">
                            <div class="flex items-center gap-1">
                               <dx-select-box [items]="['>','>=','<','<=','=','!=','contains']" [value]="rule.operator" [width]="60"
                                 (onValueChanged)="updateFormattingRule(fieldName, ri, 'operator', $event.value)" class="h-6" />
                               <dx-text-box [value]="rule.value" class="flex-1 h-6" placeholder="Value" 
                                 (onValueChanged)="updateFormattingRule(fieldName, ri, 'value', $event.value)" />
                               <button (click)="removeFormattingRule(fieldName, ri)" class="text-destructive opacity-0 group-hover/rule:opacity-100 transition-opacity">
                                 <span class="material-icons text-xs">delete</span>
                               </button>
                            </div>
                            <div class="flex items-center gap-2">
                               <dx-text-box [value]="rule.background || ''" [width]="80" class="h-6" placeholder="BG Hex"
                                 (onValueChanged)="updateFormattingRule(fieldName, ri, 'background', $event.value)" />
                               <dx-text-box [value]="rule.color || ''" [width]="80" class="h-6" placeholder="Text Hex"
                                 (onValueChanged)="updateFormattingRule(fieldName, ri, 'color', $event.value)" />
                            </div>
                          </div>
                        }
                      </div>
                    </div>
                 </div>
              </div>
           </div>
        </div>

        <!-- Security & Audit -->
        <div class="p-6 border-b bg-slate-50/20" *ngIf="svc.activeReport() as r">
           <div class="flex flex-col gap-6">
              <div class="flex items-center gap-2">
                 <span class="text-[9px] font-black text-brand-blue uppercase tracking-widest">Security Context</span>
              </div>

              <div class="flex flex-col gap-4">
                 <div class="flex flex-col gap-3 group px-4 py-3 bg-white border border-slate-100 rounded-xl shadow-sm hover:border-brand-blue/30 transition-colors">
                    <label class="text-[9px] font-black text-slate-400 uppercase tracking-[0.1em] leading-none mb-1">PROVENANCE</label>
                    <div class="flex items-center gap-3">
                       <div class="h-10 w-10 rounded-full bg-brand-navy flex items-center justify-center text-white shadow-xl shadow-slate-200 overflow-hidden border-2 border-white ring-1 ring-slate-100">
                          <span class="material-icons text-lg">person</span>
                       </div>
                       <div class="flex flex-col">
                          <span class="text-xs font-extrabold text-slate-700 leading-none">Sharath Raj</span>
                          <span class="text-[9px] text-brand-blue font-black uppercase mt-1.5 leading-none tracking-widest">ADMINISTRATOR</span>
                       </div>
                    </div>
                 </div>

                 <div class="space-y-3 px-1 mt-2">
                    <div class="flex items-center justify-between pb-3 border-b border-dashed border-slate-100">
                       <div class="flex flex-col">
                          <span class="text-[11px] font-bold text-slate-600 uppercase tracking-tight">Public Workspace</span>
                          <span class="text-[9px] text-slate-400 font-medium">Visible to all authenticated users</span>
                       </div>
                       <dx-check-box [value]="r.isPublic" (onValueChanged)="updateReport('isPublic', $event.value)" />
                    </div>
                    <div class="flex items-center justify-between pt-1">
                       <div class="flex flex-col">
                          <span class="text-[11px] font-bold text-slate-600 uppercase tracking-tight">Row Level Audit</span>
                          <span class="text-[9px] text-slate-400 font-medium">Policy enforced by mapping layer</span>
                       </div>
                       <dx-check-box [value]="true" [disabled]="true" />
                    </div>
                 </div>
              </div>
           </div>
        </div>
      </div>

      <!-- Compliance Guard -->
      <div class="p-6 bg-slate-50 border-t mt-auto shadow-[0_-4px_10px_rgba(0,0,0,0.02)]">
         <div class="flex items-center gap-3 text-brand-blue/60 mb-2">
            <span class="material-icons text-sm">enhanced_encryption</span>
            <span class="text-[9px] font-black tracking-widest uppercase">Encryption Enabled</span>
         </div>
         <p class="text-[9px] text-slate-400 font-bold uppercase leading-relaxed tracking-wider opacity-70">
           Structural adjustments are versioned and audited. Security policy prevents unauthorized telemetry export.
         </p>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; height: 100%; border-left: 1px solid #f1f5f9; }
    .custom-scrollbar::-webkit-scrollbar { width: 4px; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.06); border-radius: 10px; }
    
    ::ng-deep {
       .premium-input-xl {
          .dx-texteditor-input { padding: 12px 14px !important; font-size: 13px !important; font-weight: 500 !important; color: #334155 !important; }
          .dx-texteditor-container { background: #fff !important; border-radius: 10px !important; border: 1px solid #e2e8f0 !important; }
          &.dx-state-focused .dx-texteditor-container { border-color: hsl(221.2 83.2% 53.3%) !important; box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.08) !important; }
       }
       .dx-checkbox-icon { border-radius: 4px !important; border-color: #cbd5e1 !important; width: 18px !important; height: 18px !important; }
       .dx-checkbox-checked .dx-checkbox-icon { background-color: hsl(221.2 83.2% 53.3%) !important; border-color: transparent !important; }
    }
    
    .shadow-inner-sm { box-shadow: inset 0 2px 4px 0 rgba(0, 0, 0, 0.02); }
  `]
})
export class PropertiesPanelComponent {
  svc = inject(ReportService);
  selectedField = signal<string>('');

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
    if (g) {
      this.svc.updateActiveGrid(this.svc.activeGridIndex(), { ...g, [key]: value });
    }
  }

  addFormula() {
    const g = this.currentGrid();
    if (!g) return;
    const formulas = [...(g.calculatedColumns || [])];
    formulas.push({ id: crypto.randomUUID(), alias: 'NewField', expression: '' });
    this.svc.updateActiveGrid(this.svc.activeGridIndex(), { ...g, calculatedColumns: formulas });
  }

  updateFormula(index: number, key: keyof CalculatedColumn, value: string) {
    const g = this.currentGrid();
    if (!g) return;
    const formulas = [...(g.calculatedColumns || [])];
    formulas[index] = { ...formulas[index], [key]: value };
    this.svc.updateActiveGrid(this.svc.activeGridIndex(), { ...g, calculatedColumns: formulas });
  }

  removeFormula(index: number) {
    const g = this.currentGrid();
    if (!g) return;
    const formulas = (g.calculatedColumns || []).filter((_, i) => i !== index);
    this.svc.updateActiveGrid(this.svc.activeGridIndex(), { ...g, calculatedColumns: formulas });
  }

  updateDrillDown(key: string, value: any) {
    const g = this.currentGrid();
    if (!g) return;
    this.svc.updateActiveGrid(this.svc.activeGridIndex(), {
       ...g,
       drillDown: { ...(g.drillDown || { targetReportId: '', mappings: {} }), [key]: value }
    });
  }

  saveReport() {
    const r = this.svc.activeReport();
    if (!r) return;
    this.svc.saveReport(r).subscribe({
      next: (saved) => {
        console.log('Report saved!', saved);
      },
      error: (e) => console.error(e)
    });
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

  updateChart(key: string, value: any) {
    const r = this.svc.activeReport();
    if (!r || !r.chart) return;
    this.svc.activeReport.set({
      ...r,
      chart: { ...r.chart, [key]: value }
    });
  }

  addJoin() {
    const g = this.currentGrid();
    if (!g) return;
    const joins = [...(g.joins || [])];
    joins.push({ targetEntity: '', joinType: 'INNER', onClause: '', alias: 'T' + (joins.length + 1), conditions: [] });
    this.updateGrid('joins', joins);
  }

  updateJoin(index: number, key: string, value: any) {
    const g = this.currentGrid();
    if (!g) return;
    const joins = [...(g.joins || [])];
    joins[index] = { ...joins[index], [key]: value };
    this.updateGrid('joins', joins);
  }

  removeJoin(index: number) {
    const g = this.currentGrid();
    if (!g) return;
    const joins = (g.joins || []).filter((_, i) => i !== index);
    this.updateGrid('joins', joins);
  }

  addFormattingRule(fieldName: string) {
    const conf = this.getColumnConf(fieldName);
    const rules = [...(conf.formattingRules || [])];
    rules.push({ id: crypto.randomUUID(), operator: '>', value: '0', background: '#e1f5fe', color: '#01579b' });
    this.updateColConf(fieldName, 'formattingRules', rules);
  }

  updateFormattingRule(fieldName: string, ri: number, key: string, value: any) {
    const conf = this.getColumnConf(fieldName);
    const rules = [...(conf.formattingRules || [])];
    rules[ri] = { ...rules[ri], [key]: value };
    this.updateColConf(fieldName, 'formattingRules', rules);
  }

  removeFormattingRule(fieldName: string, ri: number) {
    const conf = this.getColumnConf(fieldName);
    const rules = (conf.formattingRules || []).filter((_, i) => i !== ri);
    this.updateColConf(fieldName, 'formattingRules', rules);
  }
}
