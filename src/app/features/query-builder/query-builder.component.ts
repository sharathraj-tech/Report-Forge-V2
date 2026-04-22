import { Component, Input, Output, EventEmitter, inject, OnChanges, signal, computed, ViewChild } from '@angular/core';
import { trigger, state, style, animate, transition } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { DxSelectBoxModule, DxTagBoxModule, DxTextBoxModule, DxPopupModule, DxValidatorModule, DxValidationGroupModule, DxValidationGroupComponent, DxDataGridModule, DxCheckBoxModule } from 'devextreme-angular';
import { FilterGroupComponent } from './filter-group/filter-group.component';
import { ReportService } from '../../core/services/report.service';
import { NotificationService } from '../../core/services/notification.service';
import type { GridDefinition, FieldMetadata, FilterGroup, AggregationSpec, JoinDefinition, CalculatedColumn, SortSpec, DrillDownConfig } from '../../core/models/report.models';
import { createGroup, AGG_FUNCTIONS } from '../../core/models/report.models';

interface ConsoleLog { time: string; message: string; level: 'info' | 'success' | 'warn' | 'error'; }

@Component({
  selector: 'rf-query-builder',
  standalone: true,
  imports: [CommonModule, DxSelectBoxModule, DxTagBoxModule, DxTextBoxModule, DxPopupModule, DxValidatorModule, DxValidationGroupModule, DxDataGridModule, DxCheckBoxModule, FilterGroupComponent],
  animations: [
    trigger('slideInOut', [
      transition(':enter', [
        style({ height: '0px', opacity: 0, overflow: 'hidden', marginBottom: '0px' }),
        animate('300ms cubic-bezier(0.4, 0, 0.2, 1)', style({ height: '*', opacity: 1, marginBottom: '*' }))
      ]),
      transition(':leave', [
        style({ height: '*', opacity: 1, overflow: 'hidden', marginBottom: '*' }),
        animate('250ms cubic-bezier(0.4, 0, 0.2, 1)', style({ height: '0px', opacity: 0, marginBottom: '0px' }))
      ])
    ]),
    trigger('rotate180', [
      state('collapsed', style({ transform: 'rotate(0)' })),
      state('expanded', style({ transform: 'rotate(180deg)' })),
      transition('collapsed <=> expanded', animate('250ms ease-in-out'))
    ])
  ],
  template: `
    <div class="flex flex-col h-full bg-slate-50 anim-fade relative font-sans">
      <!-- Compact Header (Slate) -->
      <div class="h-10 border-b border-slate-200 bg-white flex items-center justify-between px-4 shrink-0 z-10 shadow-sm">
        <div class="flex items-center gap-3">
          <div class="flex items-center gap-2">
            <div class="h-6 w-6 rounded bg-slate-900 flex items-center justify-center shadow-sm">
               <span class="material-icons text-white text-xs">dataset</span>
            </div>
            <span class="text-[10px] font-black text-slate-800 uppercase tracking-widest leading-none">Dataset</span>
          </div>
          <div class="h-4 w-px bg-slate-200"></div>
          <span class="text-[11px] font-bold text-slate-600 truncate max-w-[120px]">{{ grid.entity || 'Unconfigured' }}</span>
          
          <!-- Mode Toggle -->
          <div class="ml-2 bg-slate-100 p-0.5 rounded-lg flex items-center border border-slate-200">
             <button class="px-2 py-0.5 text-[9px] font-black rounded-md transition-all" [class.bg-white]="guidedMode()" [class.shadow-sm]="guidedMode()" [class.text-brand-primary]="guidedMode()" [class.text-slate-400]="!guidedMode()" (click)="guidedMode.set(true)">GUIDED</button>
             <button class="px-2 py-0.5 text-[9px] font-black rounded-md transition-all" [class.bg-white]="!guidedMode()" [class.shadow-sm]="!guidedMode()" [class.text-brand-primary]="!guidedMode()" [class.text-slate-400]="guidedMode()" (click)="guidedMode.set(false)">EXPERT</button>
          </div>
        </div>
        
        <div class="flex items-center gap-2">
           <button class="rf-compact-btn-outline h-7 px-2 text-[9px] font-black uppercase tracking-tighter"
              [class.bg-amber-50]="filterCount() > 0"
              [class.border-amber-200]="filterCount() > 0"
              [class.text-amber-700]="filterCount() > 0"
              (click)="filtersModalVisible.set(true)">
              <span class="material-icons text-xs">filter_alt</span>
              FILTERS
              <span *ngIf="filterCount() > 0" class="ml-1 px-1.5 py-0.5 rounded-full bg-amber-200 text-amber-800 text-[8px]">{{ filterCount() }}</span>
           </button>

           <div class="h-4 w-px bg-slate-200 mx-1"></div>

           <button class="rf-compact-btn-primary h-7 px-3 text-[9px] font-black uppercase tracking-widest shadow-sm" 
              [class.opacity-90]="isRunning()"
              (click)="onRun()">
              <span class="material-icons text-xs" [class.animate-spin]="isRunning()">{{ isRunning() ? 'sync' : 'play_arrow' }}</span>
              {{ isRunning() ? 'EXEC...' : 'RUN' }}
           </button>
           
           <button class="rf-compact-btn-ghost h-7 w-7 p-0" (click)="consoleVisible.set(!consoleVisible())" title="Terminal">
              <span class="material-icons text-xs" [class.text-brand-primary]="consoleVisible()">terminal</span>
           </button>
        </div>
      </div>

      <!-- Main Config Canvas -->
      <div class="flex-1 overflow-y-auto p-4 custom-scrollbar flex flex-col gap-4">

        <!-- EXPERT MODE -->
        @if (!guidedMode()) {
          <dx-validation-group #validationGroup>
            <!-- Source Entity -->
            <div class="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
              <div class="px-3 py-2 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                <span class="material-icons text-xs text-slate-400">table_rows</span>
                <h3 class="text-[9px] font-black text-slate-500 uppercase tracking-widest">Base Entity</h3>
              </div>
              <div class="p-3">
                <dx-select-box [items]="svc.entities()" displayExpr="displayName" valueExpr="name"
                  [value]="grid.entity" [searchEnabled]="true" placeholder="Choose table..."
                  class="compact-select w-full" (onValueChanged)="onEntityChange($event.value)">
                  <dx-validator><dxi-validation-rule type="required" message="Entity required"></dxi-validation-rule></dx-validator>
                </dx-select-box>
              </div>
            </div>

            <!-- Column Selection -->
            <div class="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
              <div class="px-3 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <span class="material-icons text-xs text-slate-400">view_column</span>
                  <h3 class="text-[9px] font-black text-slate-500 uppercase tracking-widest">Columns</h3>
                </div>
                <span class="text-[9px] font-bold text-slate-400">{{ grid.columns.length }} SELECTED</span>
              </div>
              <div class="p-3 min-h-[100px]">
                <dx-tag-box [items]="availableFields()" displayExpr="displayName" valueExpr="name"
                  [value]="grid.columns" [searchEnabled]="true" [showSelectionControls]="true"
                  placeholder="Select fields..." class="compact-select" (onValueChanged)="onColumnsChange($event.value)" />
              </div>
            </div>

            <!-- Grouping & Aggregation -->
            <div class="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden" *ngIf="hasGroupableFields()">
              <div class="px-3 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <span class="material-icons text-xs text-slate-400">functions</span>
                  <h3 class="text-[9px] font-black text-slate-500 uppercase tracking-widest">Analytics (Group By)</h3>
                </div>
                <button class="text-[9px] font-black text-brand-primary uppercase tracking-widest px-2 py-1 hover:bg-slate-100 rounded" (click)="addAgg()">+ Add Measure</button>
              </div>
              <div class="p-3 flex flex-col gap-3">
                <div class="flex flex-col gap-1">
                  <label class="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Dimensions</label>
                  <dx-tag-box [items]="groupableFields()" displayExpr="displayName" valueExpr="name" [value]="grid.groupBy || []" placeholder="Group by..." class="compact-select w-full" (onValueChanged)="onGroupByChange($event.value)" />
                </div>
                
                @if ((grid.aggregations || []).length > 0) {
                  <div class="flex flex-col gap-2 mt-2 pt-2 border-t border-slate-100">
                    @for (agg of grid.aggregations || []; track $index; let i = $index) {
                      <div class="flex items-center gap-2 group">
                        <dx-select-box [items]="aggFields()" displayExpr="displayName" valueExpr="name" [value]="agg.field" class="compact-select flex-1" placeholder="Field" (onValueChanged)="updateAgg(i, 'field', $event.value)">
                           <dx-validator><dxi-validation-rule type="required"></dxi-validation-rule></dx-validator>
                        </dx-select-box>
                        <dx-select-box [items]="aggFunctions" displayExpr="label" valueExpr="value" [value]="agg.function" [width]="80" class="compact-select" (onValueChanged)="updateAgg(i, 'function', $event.value)" />
                        <button class="h-7 w-7 rounded text-slate-400 hover:text-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100" (click)="removeAgg(i)"><span class="material-icons text-xs">close</span></button>
                      </div>
                    }
                  </div>
                }
              </div>
            </div>

            <!-- Calculated Columns -->
            <div class="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden" *ngIf="advancedMode()">
              <div class="px-3 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <span class="material-icons text-xs text-slate-400">calculate</span>
                  <h3 class="text-[9px] font-black text-slate-500 uppercase tracking-widest">Calculated Columns</h3>
                </div>
                <button class="text-[9px] font-black text-brand-primary uppercase tracking-widest px-2 py-1 hover:bg-slate-100 rounded" (click)="addCalcColumn()">+ New Formula</button>
              </div>
              <div class="p-3 flex flex-col gap-3">
                @for (calc of grid.calculatedColumns || []; track calc.id; let i = $index) {
                   <div class="p-3 rounded-lg border border-slate-100 bg-slate-50/50 flex flex-col gap-2 group relative">
                      <div class="flex items-center gap-2">
                         <dx-text-box [(value)]="calc.alias" placeholder="Alias (e.g. TotalPrice)" class="compact-select flex-1" (onValueChanged)="updateCalc(i, 'alias', $event.value)">
                            <dx-validator><dxi-validation-rule type="required"></dxi-validation-rule></dx-validator>
                         </dx-text-box>
                      </div>
                      <dx-text-box [(value)]="calc.expression" placeholder="Expression (e.g. [UnitPrice] * [Quantity])" class="compact-select w-full font-mono text-[10px]" (onValueChanged)="updateCalc(i, 'expression', $event.value)">
                         <dx-validator><dxi-validation-rule type="required"></dxi-validation-rule></dx-validator>
                      </dx-text-box>
                      <button class="absolute top-1 right-1 h-5 w-5 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100" (click)="removeCalc(i)"><span class="material-icons text-xs">close</span></button>
                   </div>
                }
                @if (!grid.calculatedColumns?.length) { <div class="text-[10px] text-slate-400 font-bold uppercase tracking-tighter text-center py-2 opacity-50">No Virtual Assets</div> }
              </div>
            </div>

            <!-- Sorting -->
            <div class="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden" *ngIf="availableFields().length > 0">
              <div class="px-3 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <span class="material-icons text-xs text-slate-400">sort</span>
                  <h3 class="text-[9px] font-black text-slate-500 uppercase tracking-widest">Sorting</h3>
                </div>
                <button class="text-[9px] font-black text-brand-primary uppercase tracking-widest px-2 py-1 hover:bg-slate-100 rounded" (click)="addSort()">+ Add Sort</button>
              </div>
              <div class="p-3 flex flex-col gap-2">
                @for (sort of grid.sorts || []; track $index; let i = $index) {
                  <div class="flex items-center gap-2 group">
                    <dx-select-box [items]="availableFields()" displayExpr="displayName" valueExpr="name" [value]="sort.field" class="compact-select flex-1" (onValueChanged)="updateSort(i, 'field', $event.value)">
                       <dx-validator><dxi-validation-rule type="required"></dxi-validation-rule></dx-validator>
                    </dx-select-box>
                    <dx-select-box [items]="sortDirs" displayExpr="label" valueExpr="value" [value]="sort.direction" [width]="80" class="compact-select" (onValueChanged)="updateSort(i, 'direction', $event.value)" />
                    <button class="h-7 w-7 rounded text-slate-400 hover:text-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100" (click)="removeSort(i)"><span class="material-icons text-xs">close</span></button>
                  </div>
                }
                @if (!grid.sorts?.length) { <div class="text-[10px] text-slate-400 font-bold uppercase tracking-tighter text-center py-2 opacity-50">Natural Ordering</div> }
              </div>
            </div>

            <!-- Advanced (Joins) -->
            <div class="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden" *ngIf="advancedMode()">
              <div class="px-3 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <div class="flex items-center gap-2">
                   <span class="material-icons text-xs text-slate-400">link</span>
                   <h3 class="text-[9px] font-black text-slate-500 uppercase tracking-widest">Relationships (Joins)</h3>
                </div>
                <button class="text-[9px] font-black text-brand-primary uppercase tracking-widest px-2 py-1 hover:bg-slate-100 rounded" (click)="addJoin()">+ Join Entity</button>
              </div>
              <div class="p-3 flex flex-col gap-3">
                @for (join of grid.joins || []; track $index; let i = $index) {
                  <div class="p-3 rounded-lg border border-slate-100 bg-slate-50/50 flex flex-col gap-2 group relative">
                    <div class="flex items-center gap-2">
                      <dx-select-box [items]="['INNER', 'LEFT', 'RIGHT']" [value]="join.joinType" [width]="80" class="compact-select" (onValueChanged)="updateJoin(i, 'joinType', $event.value)" />
                      <dx-select-box [items]="svc.entities()" displayExpr="displayName" valueExpr="name" [value]="join.targetEntity" class="compact-select flex-1" placeholder="Target Entity..." (onValueChanged)="updateJoin(i, 'targetEntity', $event.value)">
                         <dx-validator><dxi-validation-rule type="required"></dxi-validation-rule></dx-validator>
                      </dx-select-box>
                    </div>
                    <dx-text-box [(value)]="join.onClause" placeholder="ON Clause (e.g. Source.ID = Target.RefID)" class="compact-select w-full font-mono text-[10px]" (onValueChanged)="updateJoin(i, 'onClause', $event.value)">
                       <dx-validator><dxi-validation-rule type="required"></dxi-validation-rule></dx-validator>
                    </dx-text-box>
                    <button class="absolute top-1 right-1 h-5 w-5 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100" (click)="removeJoin(i)"><span class="material-icons text-xs">close</span></button>
                  </div>
                }
                @if (!grid.joins?.length) { <div class="text-[10px] text-slate-400 font-bold uppercase tracking-tighter text-center py-2 opacity-50">Single Source Analysis</div> }
              </div>
            </div>

            <!-- Drill-down Configuration -->
            <div class="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden" *ngIf="advancedMode()">
              <div class="px-3 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <div class="flex items-center gap-2">
                   <span class="material-icons text-xs text-slate-400">directions</span>
                   <h3 class="text-[9px] font-black text-slate-500 uppercase tracking-widest">Action Pipeline (Drill-down)</h3>
                </div>
                <div class="flex items-center gap-2">
                   <dx-check-box [value]="!!grid.drillDown" (onValueChanged)="toggleDrillDown($event.value)"></dx-check-box>
                   <span class="text-[9px] font-bold text-slate-400 uppercase">Enable</span>
                </div>
              </div>
              <div class="p-3 space-y-4" *ngIf="grid.drillDown">
                 <div class="space-y-1.5">
                    <label class="text-[8px] font-black text-slate-400 uppercase ml-1">Target Resource</label>
                    <dx-select-box [items]="svc.reports()" displayExpr="name" valueExpr="id" [(value)]="grid.drillDown.targetReportId" placeholder="Select target report..." class="compact-select">
                       <dx-validator><dxi-validation-rule type="required"></dxi-validation-rule></dx-validator>
                    </dx-select-box>
                 </div>
                 
                 <div class="space-y-1.5">
                    <label class="text-[8px] font-black text-slate-400 uppercase ml-1">Parameter Mapping</label>
                    <div class="bg-slate-50 rounded-lg border border-slate-100 p-2">
                       <table class="w-full text-[10px]">
                          <thead>
                             <tr class="text-slate-400 border-b border-slate-200">
                                <th class="text-left py-1 font-black uppercase">Source Field</th>
                                <th class="text-left py-1 font-black uppercase pl-2">Target Parameter</th>
                                <th class="w-8"></th>
                             </tr>
                          </thead>
                          <tbody>
                             @for (map of drillDownMappings(); track $index) {
                                <tr class="border-b border-slate-100 last:border-0">
                                   <td class="py-1">
                                      <dx-select-box [items]="availableFields()" displayExpr="displayName" valueExpr="name" [(value)]="map.source" class="compact-select-tiny" (onValueChanged)="onMappingChange()"></dx-select-box>
                                   </td>
                                   <td class="py-1 pl-2">
                                      <dx-text-box [(value)]="map.target" placeholder="Target Param..." class="compact-select-tiny" (onValueChanged)="onMappingChange()"></dx-text-box>
                                   </td>
                                   <td class="text-right">
                                      <button (click)="removeMapping($index)" class="text-slate-300 hover:text-red-500"><span class="material-icons text-xs">close</span></button>
                                   </td>
                                </tr>
                             }
                          </tbody>
                       </table>
                       <button class="mt-2 text-[9px] font-black text-brand-primary uppercase hover:underline" (click)="addMapping()">+ Add Mapping</button>
                    </div>
                 </div>
              </div>
              @if (!grid.drillDown) { <div class="text-[10px] text-slate-400 font-bold uppercase tracking-tighter text-center py-4 opacity-50 italic">Interaction terminal disabled</div> }
            </div>
          </dx-validation-group>
        }

        <!-- GUIDED MODE (Slate) -->
        @if (guidedMode()) {
           <div class="flex-1 flex flex-col items-center justify-center text-center p-6 anim-fade">
              <div class="w-12 h-12 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center mb-6">
                 <span class="material-icons text-brand-primary text-2xl">rocket_launch</span>
              </div>
              <h2 class="text-lg font-black text-slate-900 tracking-tight uppercase mb-2">Step {{ guidedStep() }} of 3</h2>
              <p class="text-xs font-bold text-slate-500 uppercase tracking-widest mb-8">Guided Configuration</p>
              
              @if (guidedStep() === 1) {
                <div class="w-full max-w-xs flex flex-col gap-4">
                  <dx-select-box [items]="svc.entities()" displayExpr="displayName" valueExpr="name" [value]="grid.entity" [searchEnabled]="true" placeholder="Select Data Source..." class="compact-select" (onValueChanged)="onEntityChange($event.value)" />
                  <button class="rf-compact-btn-primary h-10 w-full" [disabled]="!grid.entity" (click)="guidedStep.set(2)">CONTINUE TO METRICS</button>
                </div>
              }
              @if (guidedStep() === 2) {
                <div class="w-full max-w-xs flex flex-col gap-4">
                  <dx-tag-box [items]="availableFields()" displayExpr="displayName" valueExpr="name" [value]="grid.columns" placeholder="Select Fields..." class="compact-select" (onValueChanged)="onColumnsChange($event.value)" />
                  <div class="flex gap-2">
                    <button class="rf-compact-btn-outline h-10 flex-1" (click)="guidedStep.set(1)">BACK</button>
                    <button class="rf-compact-btn-primary h-10 flex-1" (click)="guidedStep.set(3)">REVIEW</button>
                  </div>
                </div>
              }
              @if (guidedStep() === 3) {
                <div class="w-full max-w-xs flex flex-col gap-4">
                  <div class="p-4 bg-white rounded-xl border border-slate-200 text-left">
                     <p class="text-[10px] font-black text-slate-400 uppercase mb-2">Summary</p>
                     <p class="text-xs font-bold text-slate-700 truncate">{{ grid.entity }}</p>
                     <p class="text-[10px] font-medium text-slate-500 mt-1">{{ grid.columns.length }} columns mapped</p>
                  </div>
                  <button class="rf-compact-btn-primary h-10 w-full" (click)="onRun()">EXECUTE NOW</button>
                  <button class="text-[9px] font-black text-slate-400 uppercase hover:text-slate-600" (click)="guidedStep.set(2)">REFINE CONFIG</button>
                </div>
              }
           </div>
        }

      </div>

      <!-- Footer Info Bar -->
      <div class="h-8 border-t border-slate-200 bg-white flex items-center justify-between px-4 shrink-0 z-10">
        <button class="text-[9px] font-black text-slate-400 hover:text-slate-800 flex items-center gap-1 transition-colors uppercase tracking-widest" (click)="toggleAdvanced()">
          <span class="material-icons text-xs transition-transform" [@rotate180]="advancedMode() ? 'expanded' : 'collapsed'">expand_more</span>
          {{ advancedMode() ? 'Hide' : 'Show' }} Advanced
        </button>
        <div class="text-[9px] text-slate-400 font-bold uppercase truncate flex-1 tracking-tighter text-right pr-2">
          {{ queryDigest() }}
        </div>
      </div>

      <!-- DEV CONSOLE Overlay (Slate Dark) -->
      <div *ngIf="consoleVisible()" class="absolute bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 overflow-hidden anim-fade flex flex-col z-[100] shadow-2xl">
         <div class="h-8 px-4 flex items-center justify-between bg-slate-800 border-b border-slate-700">
            <span class="text-[9px] font-black text-slate-300 tracking-widest flex items-center gap-2">
              <span class="material-icons text-slate-400 text-xs">terminal</span> CONSOLE
            </span>
            <button class="h-5 w-5 rounded flex items-center justify-center text-slate-400 hover:text-white" (click)="consoleVisible.set(false)">
              <span class="material-icons text-xs">close</span>
            </button>
         </div>
         <div class="p-2 font-mono text-[10px] leading-relaxed flex flex-col gap-1 overflow-y-auto max-h-[180px] min-h-[100px] custom-scrollbar">
            @for (log of consoleLogs(); track $index) {
              <div class="flex gap-2 px-2 py-0.5 rounded transition-colors hover:bg-white/5">
                <span class="text-slate-500 shrink-0 select-none">{{ log.time }}</span>
                <span [class.text-emerald-400]="log.level === 'success'" [class.text-sky-400]="log.level === 'info'" [class.text-amber-400]="log.level === 'warn'" [class.text-red-400]="log.level === 'error'" class="flex-1 break-all">{{ log.message }}</span>
              </div>
            }
         </div>
      </div>
    </div>

    <!-- Filters Popup (Standardized) -->
    <dx-popup
       [visible]="filtersModalVisible()"
       [width]="700"
       [height]="'auto'"
       [maxHeight]="'90vh'"
       [showTitle]="false"
       [dragEnabled]="false"
       [showCloseButton]="false"
       (onHiding)="filtersModalVisible.set(false)">
       <div *dxTemplate="let data of 'content'" class="flex flex-col bg-slate-50">
          <div class="p-4 bg-white border-b border-slate-200 flex items-center justify-between">
             <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center border border-amber-100">
                   <span class="material-icons text-amber-600 text-sm">filter_alt</span>
                </div>
                <div>
                   <h2 class="text-xs font-black text-slate-900 uppercase tracking-widest">Query Conditions</h2>
                   <p class="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Refine result inclusion</p>
                </div>
             </div>
             <button class="w-7 h-7 rounded hover:bg-slate-100 text-slate-400" (click)="filtersModalVisible.set(false)">
                <span class="material-icons text-sm">close</span>
             </button>
          </div>
          <div class="p-6 overflow-y-auto custom-scrollbar min-h-[200px]">
             <rf-filter-group [group]="filterGroup()" [fields]="availableFields()" [isRoot]="true" (onChange)="onFilterChange($event)" />
          </div>
          <div class="p-4 bg-white border-t border-slate-200 flex justify-end">
             <button class="rf-compact-btn-primary h-8 px-6" (click)="filtersModalVisible.set(false)">APPLY FILTERS</button>
          </div>
       </div>
    </dx-popup>
  `,
  styles: [`
    :host { display: block; height: 100%; }
    ::ng-deep .compact-select .dx-texteditor-input { padding: 6px 10px !important; font-size: 11px !important; font-weight: 600 !important; color: #1e293b !important; }
    ::ng-deep .compact-select-tiny .dx-texteditor-input { padding: 4px 6px !important; font-size: 10px !important; font-weight: 600 !important; }
    ::ng-deep .compact-select, ::ng-deep .compact-select-tiny { border-radius: 6px !important; border-color: #e2e8f0 !important; }
    ::ng-deep .dx-popup-content { padding: 0 !important; border-radius: 12px; overflow: hidden; }
  `]
})
export class QueryBuilderComponent implements OnChanges {
  @Input() grid!: GridDefinition;
  @Output() gridChange = new EventEmitter<GridDefinition>();
  @Output() runRequested = new EventEmitter<void>();
  @Output() saveRequested = new EventEmitter<void>();

  svc = inject(ReportService);
  notify = inject(NotificationService);
  aggFunctions = AGG_FUNCTIONS;
  sortDirs = [{ value: 'ASC', label: 'ASC ↑' }, { value: 'DESC', label: 'DESC ↓' }];
  advancedMode = signal(false);
  guidedMode = signal(true);
  guidedStep = signal(1);
  consoleVisible = signal(false);
  filtersModalVisible = signal(false);
  consoleLogs = signal<ConsoleLog[]>([]);
  isRunning = signal(false);

  @ViewChild('validationGroup', { static: false }) validationGroup?: DxValidationGroupComponent;

  filterGroup = signal<FilterGroup>(createGroup());
  filterCount = computed(() => this.filterGroup().conditions.length + this.filterGroup().groups.length);
  drillDownMappings = signal<{ source: string, target: string }[]>([]);

  queryDigest = computed(() => {
    const g = this.grid;
    if (!g.entity) return 'Awaiting data source selection...';
    let text = `${g.entity}`;
    const columnsCount = g.columns.length + (g.calculatedColumns?.length || 0);
    if (columnsCount > 0) text += ` » ${columnsCount} fields`;
    if (this.filterCount() > 0) text += ` » filtered`;
    if (g.groupBy.length) text += ` » grouped`;
    return text.toUpperCase();
  });

  onRun() {
    if (this.isRunning()) return;
    
    const result = this.validationGroup?.instance.validate();
    if (!result?.isValid) {
       this.notify.validationWarning('Query configuration has errors. Please check entity and virtual fields.');
       return;
    }

    const columnCount = this.grid.columns.length + (this.grid.calculatedColumns?.length || 0) + this.grid.aggregations.length;
    if (columnCount === 0) {
      this.notify.validationWarning('Please select at least one column or measure to display.');
      return;
    }

    this.isRunning.set(true);
    const now = new Date();
    const time = `[${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}]`;
    this.consoleLogs.update(logs => [...logs, { time, message: `EXEC SQL SOURCE: ${this.grid.entity}`, level: 'info' }]);
    this.runRequested.emit();
    setTimeout(() => this.isRunning.set(false), 800);
  }

  onSave() { this.saveRequested.emit(); }

  ngOnChanges() {
    if (this.grid.filters) this.filterGroup.set(this.grid.filters);
    else this.filterGroup.set(createGroup());

    if ((this.grid.joins?.length || 0) > 0 || (this.grid.calculatedColumns?.length || 0) > 0) {
      this.advancedMode.set(true);
    }

    if (this.grid.entity) {
       const ent = this.svc.entities().find(e => e.name === this.grid.entity);
       if (ent) this.svc.loadEntityDetail(ent.id).subscribe();
    }

    if (this.grid.drillDown) {
       this.drillDownMappings.set(Object.entries(this.grid.drillDown.mappings).map(([t, s]) => ({ source: s, target: t })));
    } else {
       this.drillDownMappings.set([]);
    }
  }

  toggleAdvanced() { this.advancedMode.set(!this.advancedMode()); }

  primaryFields = computed(() => this.svc.getEntityFields(this.grid.entity));

  availableFields = computed(() => {
    const primary = this.primaryFields();
    if (!this.grid.entity) return [];
    const allEntities = this.svc.entities();
    const otherFields: FieldMetadata[] = [];
    allEntities.forEach(e => {
        if (e.name !== this.grid.entity) {
            const fields = this.svc.getEntityFields(e.name);
            otherFields.push(...fields.map(f => ({
                ...f,
                displayName: `[${e.displayName}] ${f.displayName}`,
                name: `${e.name}.${f.name}`
            })));
        }
    });
    return [...primary, ...otherFields];
  });

  groupableFields = computed(() => this.availableFields().filter(f => f.isGroupable));
  aggFields = computed(() => this.availableFields().filter(f => f.isAggregatable));
  hasGroupableFields = computed(() => this.groupableFields().length > 0);

  onEntityChange(entity: string) {
    const ent = this.svc.entities().find(e => e.name === entity);
    if (ent) this.svc.loadEntityDetail(ent.id).subscribe();
    this.emit({ ...this.grid, entity, columns: [], groupBy: [], aggregations: [], joins: [], calculatedColumns: [], filters: createGroup() });
  }

  onColumnsChange(columns: string[]) { this.emit({ ...this.grid, columns }); }
  onGroupByChange(groupBy: string[]) { this.emit({ ...this.grid, groupBy }); }
  onFilterChange(filters: FilterGroup) {
    this.filterGroup.set(filters);
    this.emit({ ...this.grid, filters });
  }

  addCalcColumn() {
    const calc: CalculatedColumn = { id: crypto.randomUUID(), alias: '', expression: '' };
    this.emit({ ...this.grid, calculatedColumns: [...(this.grid.calculatedColumns || []), calc] });
  }
  updateCalc(index: number, key: keyof CalculatedColumn, value: string) {
    const calcs = (this.grid.calculatedColumns || []).map((c, i) => i === index ? { ...c, [key]: value } : c);
    this.emit({ ...this.grid, calculatedColumns: calcs });
  }
  removeCalc(index: number) {
    this.emit({ ...this.grid, calculatedColumns: (this.grid.calculatedColumns || []).filter((_, i) => i !== index) });
  }

  addSort() {
    const sort: SortSpec = { field: '', direction: 'ASC' };
    this.emit({ ...this.grid, sorts: [...(this.grid.sorts || []), sort] });
  }
  updateSort(index: number, key: 'field' | 'direction', value: string) {
    const sorts = (this.grid.sorts || []).map((s, i) => i === index ? { ...s, [key]: value } : s);
    this.emit({ ...this.grid, sorts: sorts as any });
  }
  removeSort(index: number) {
    this.emit({ ...this.grid, sorts: (this.grid.sorts || []).filter((_, i) => i !== index) });
  }

  addJoin() {
    const join: JoinDefinition = { targetEntity: '', joinType: 'INNER', onClause: '' };
    this.emit({ ...this.grid, joins: [...(this.grid.joins || []), join] });
  }
  updateJoin(index: number, key: keyof JoinDefinition, value: string) {
    const joins = this.grid.joins.map((j, i) => i === index ? { ...j, [key]: value } : j);
    this.emit({ ...this.grid, joins });
  }
  removeJoin(index: number) {
    this.emit({ ...this.grid, joins: this.grid.joins.filter((_, i) => i !== index) });
  }

  addAgg() {
    const agg: AggregationSpec = { field: '', function: 'SUM' };
    this.emit({ ...this.grid, aggregations: [...this.grid.aggregations, agg] });
  }
  updateAgg(index: number, key: 'field' | 'function', value: string) {
    const aggs = this.grid.aggregations.map((a, i) => i === index ? { ...a, [key]: value } : a);
    this.emit({ ...this.grid, aggregations: aggs });
  }
  removeAgg(index: number) {
    this.emit({ ...this.grid, aggregations: this.grid.aggregations.filter((_, i) => i !== index) });
  }

  toggleDrillDown(enabled: boolean) {
     if (enabled) {
        const dd: DrillDownConfig = { targetReportId: '', mappings: {} };
        this.emit({ ...this.grid, drillDown: dd });
     } else {
        const { drillDown, ...rest } = this.grid;
        this.emit(rest as GridDefinition);
     }
  }

  addMapping() {
     this.drillDownMappings.update(m => [...m, { source: '', target: '' }]);
     this.onMappingChange();
  }

  removeMapping(idx: number) {
     this.drillDownMappings.update(m => m.filter((_, i) => i !== idx));
     this.onMappingChange();
  }

  onMappingChange() {
     const mappings: Record<string, string> = {};
     this.drillDownMappings().forEach(m => {
        if (m.source && m.target) mappings[m.target] = m.source;
     });
     if (this.grid.drillDown) {
        this.grid.drillDown.mappings = mappings;
        this.emit({ ...this.grid });
     }
  }

  private emit(grid: GridDefinition) { this.gridChange.emit(grid); }
}
