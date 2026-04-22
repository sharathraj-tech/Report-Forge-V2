import { Component, Input, Output, EventEmitter, inject, OnChanges, signal, computed } from '@angular/core';
import { trigger, state, style, animate, transition } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { DxSelectBoxModule, DxTagBoxModule, DxTextBoxModule, DxPopupModule } from 'devextreme-angular';
import { FilterGroupComponent } from './filter-group/filter-group.component';
import { ReportService } from '../../core/services/report.service';
import { NotificationService } from '../../core/services/notification.service';
import type { GridDefinition, FieldMetadata, FilterGroup, AggregationSpec, JoinDefinition, CalculatedColumn, SortSpec } from '../../core/models/report.models';
import { createGroup, AGG_FUNCTIONS } from '../../core/models/report.models';

interface ConsoleLog { time: string; message: string; level: 'info' | 'success' | 'warn' | 'error'; }

@Component({
  selector: 'rf-query-builder',
  standalone: true,
  imports: [CommonModule, DxSelectBoxModule, DxTagBoxModule, DxTextBoxModule, DxPopupModule, FilterGroupComponent],
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
    <div class="flex flex-col h-full bg-[#f8fafc] anim-fade relative font-sans">
      <!-- Aesthetic Header -->
      <div class="h-14 border-b border-slate-200/60 bg-white/80 backdrop-blur-md flex items-center justify-between px-5 shrink-0 shadow-sm z-10">
        <div class="flex items-center gap-4">
          <div class="flex items-center gap-2">
            <div class="h-6 w-6 rounded bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-inner">
               <span class="material-icons text-white text-[14px]">dataset</span>
            </div>
            <span class="text-xs font-black text-slate-800 uppercase tracking-widest leading-none">Dataset Config</span>
          </div>
          <div class="h-4 w-px bg-slate-200"></div>
          <span class="text-sm font-semibold text-slate-600 tracking-tight">{{ grid.entity || 'No Source Selected' }}</span>
          
          <!-- Mode Toggle -->
          <div class="ml-4 bg-slate-100 p-0.5 rounded-lg flex items-center shadow-inner border border-slate-200">
             <button class="px-3 py-1 text-[10px] font-bold rounded-md transition-all" [class.bg-white]="guidedMode()" [class.shadow-sm]="guidedMode()" [class.text-indigo-600]="guidedMode()" [class.text-slate-500]="!guidedMode()" (click)="guidedMode.set(true)">GUIDED</button>
             <button class="px-3 py-1 text-[10px] font-bold rounded-md transition-all" [class.bg-white]="!guidedMode()" [class.shadow-sm]="!guidedMode()" [class.text-indigo-600]="!guidedMode()" [class.text-slate-500]="guidedMode()" (click)="guidedMode.set(false)">EXPERT</button>
          </div>
        </div>
        
        <div class="flex items-center gap-2.5">
           <!-- Filters Button -->
           <button class="h-8 px-4 text-xs font-bold rounded-lg flex items-center gap-2 transition-all shadow-sm border"
              [class.bg-amber-50]="filterGroup().conditions.length > 0 || filterGroup().groups.length > 0"
              [class.border-amber-200]="filterGroup().conditions.length > 0 || filterGroup().groups.length > 0"
              [class.text-amber-700]="filterGroup().conditions.length > 0 || filterGroup().groups.length > 0"
              [class.bg-white]="filterGroup().conditions.length === 0 && filterGroup().groups.length === 0"
              [class.border-slate-200]="filterGroup().conditions.length === 0 && filterGroup().groups.length === 0"
              [class.text-slate-600]="filterGroup().conditions.length === 0 && filterGroup().groups.length === 0"
              [class.hover:bg-slate-50]="filterGroup().conditions.length === 0 && filterGroup().groups.length === 0"
              (click)="filtersModalVisible.set(true)">
              <span class="material-icons text-[16px]">filter_alt</span>
              ACTIVE FILTERS
              <span *ngIf="filterGroup().conditions.length > 0 || filterGroup().groups.length > 0" class="ml-1 px-1.5 py-0.5 rounded-full bg-amber-200 text-amber-800 text-[9px] leading-none">{{ filterGroup().conditions.length + filterGroup().groups.length }}</span>
           </button>

           <div class="h-5 w-px bg-slate-200 mx-1"></div>

           <button class="h-8 px-4 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all shadow-md text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 border border-blue-700/50" 
              [class.opacity-90]="isRunning()" [class.scale-95]="isRunning()"
              (click)="onRun()">
              <span class="material-icons text-[16px]" [class.animate-spin]="isRunning()">{{ isRunning() ? 'sync' : 'play_arrow' }}</span>
              {{ isRunning() ? 'PROCESSING...' : 'RUN QUERY' }}
           </button>
           <button class="h-8 px-3 text-xs font-bold rounded-lg flex items-center gap-1.5 bg-white hover:bg-slate-50 border border-slate-200 shadow-sm text-slate-700 transition-colors" (click)="onSave()">
              <span class="material-icons text-[16px]">save</span>
              SAVE
           </button>
           
           <button class="h-8 w-8 text-xs flex items-center justify-center rounded-lg hover:bg-slate-200 border border-transparent hover:border-slate-300 text-slate-500 hover:text-slate-700 transition-all ml-1" (click)="consoleVisible.set(!consoleVisible())" title="Console">
              <span class="material-icons text-[16px]" [class.text-indigo-600]="consoleVisible()">terminal</span>
           </button>
        </div>
      </div>

      <!-- Main Canvas Container: 2 Column Layout with elegant spacing -->
      <div class="flex-1 overflow-y-auto p-5 custom-scrollbar-premium flex gap-5 items-start max-w-[1400px] mx-auto w-full relative">

        <!-- EXPERT MODE -->
        @if (!guidedMode()) {
          <!-- Column 1: Core Configuration (Wider) -->
          <div class="flex flex-col gap-5 w-7/12 min-w-[350px]">
          
          <!-- Core Data Source Card -->
          <div class="bg-white rounded-xl border border-slate-200/80 shadow-sm flex flex-col overflow-hidden transition-all hover:shadow-md">
            <div class="px-4 py-3 bg-slate-50/50 border-b border-slate-100 flex items-center gap-2">
              <span class="material-icons text-[16px] text-blue-500">database</span>
              <h3 class="text-[11px] font-bold text-slate-700 uppercase tracking-widest">Base Entity</h3>
            </div>
            <div class="p-4">
              <label class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">Select Source Table</label>
              <dx-select-box [items]="svc.entities()" displayExpr="displayName" valueExpr="name"
                [value]="grid.entity" [searchEnabled]="true" placeholder="Select entity..."
                class="premium-input w-full" (onValueChanged)="onEntityChange($event.value)" />
            </div>
          </div>

          <!-- Fields Selection Card -->
          <div class="bg-white rounded-xl border border-slate-200/80 shadow-sm flex flex-col overflow-hidden transition-all hover:shadow-md flex-1">
            <div class="px-4 py-3 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="material-icons text-[16px] text-indigo-500">view_column</span>
                <h3 class="text-[11px] font-bold text-slate-700 uppercase tracking-widest">Selected Fields</h3>
              </div>
              <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">{{ grid.columns.length }} Selected</span>
            </div>
            <div class="p-4 h-[250px] overflow-y-auto custom-scrollbar-premium">
              <dx-tag-box [items]="availableFields()" displayExpr="displayName" valueExpr="name"
                [value]="grid.columns" [searchEnabled]="true" [showSelectionControls]="true" [height]="'100%'"
                placeholder="Choose fields to display..." class="premium-input" (onValueChanged)="onColumnsChange($event.value)" />
            </div>
          </div>

          <!-- Joins (Advanced) -->
          <div class="bg-white rounded-xl border border-slate-200/80 shadow-sm flex flex-col overflow-hidden transition-all hover:shadow-md" *ngIf="advancedMode()" @slideInOut>
            <div class="px-4 py-3 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="material-icons text-[16px] text-cyan-500">join_inner</span>
                <h3 class="text-[11px] font-bold text-slate-700 uppercase tracking-widest">Table Joins</h3>
              </div>
              <button class="h-6 px-2.5 text-[10px] font-bold text-cyan-700 bg-cyan-50 border border-cyan-100 rounded hover:bg-cyan-100 transition-colors" (click)="addJoin()">+ ADD JOIN</button>
            </div>
            <div class="p-4 flex flex-col gap-3">
              @for (join of grid.joins || []; track $index; let i = $index) {
                <div class="flex flex-col gap-2 p-3 rounded-lg border border-slate-200 bg-slate-50/50 hover:border-cyan-200 transition-colors relative group">
                  <div class="flex items-center gap-2 pr-6">
                    <dx-select-box [items]="['INNER', 'LEFT', 'RIGHT']" [value]="join.joinType" [width]="90" class="premium-input shrink-0" (onValueChanged)="updateJoin(i, 'joinType', $event.value)" />
                    <dx-select-box [items]="svc.entities()" displayExpr="displayName" valueExpr="name" [value]="join.targetEntity" class="premium-input flex-1" placeholder="Target Table..." (onValueChanged)="updateJoin(i, 'targetEntity', $event.value)" />
                  </div>
                  <div class="flex items-center gap-2">
                    <dx-select-box [items]="primaryFields()" displayExpr="displayName" valueExpr="name" [value]="join.leftField" class="premium-input flex-1" placeholder="Left Field" (onValueChanged)="onJoinMappingChange(i, 'leftField', $event.value)" />
                    <span class="text-[12px] font-black text-slate-300">=</span>
                    <dx-text-box [value]="join.onClause" class="premium-input flex-1" placeholder="ON Clause" (onValueChanged)="updateJoin(i, 'onClause', $event.value)" />
                  </div>
                  <button class="absolute top-2 right-2 h-6 w-6 rounded text-slate-400 hover:bg-red-50 hover:text-red-500 flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100" (click)="removeJoin(i)"><span class="material-icons text-[14px]">close</span></button>
                </div>
              }
              @if (!grid.joins || grid.joins.length === 0) { 
                <div class="py-6 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-lg bg-slate-50/30">
                  <span class="material-icons text-[24px] mb-1 opacity-50">link_off</span>
                  <span class="text-[11px] font-medium">No cross-entity joins defined</span>
                </div>
              }
            </div>
          </div>

        </div>

        <!-- Column 2: Shape & Advanced (Narrower) -->
        <div class="flex flex-col gap-5 w-5/12 min-w-[300px]">
          
          <!-- Group By -->
          <div class="bg-white rounded-xl border border-slate-200/80 shadow-sm flex flex-col overflow-hidden transition-all hover:shadow-md" *ngIf="hasGroupableFields()">
            <div class="px-4 py-3 bg-slate-50/50 border-b border-slate-100 flex items-center gap-2">
              <span class="material-icons text-[16px] text-purple-500">account_tree</span>
              <h3 class="text-[11px] font-bold text-slate-700 uppercase tracking-widest">Dimensions (Group By)</h3>
            </div>
            <div class="p-4">
              <dx-tag-box [items]="groupableFields()" displayExpr="displayName" valueExpr="name" [value]="grid.groupBy || []" placeholder="Select dimensions..." class="premium-input w-full" (onValueChanged)="onGroupByChange($event.value)" />
            </div>
          </div>

          <!-- Aggregations -->
          <div class="bg-white rounded-xl border border-slate-200/80 shadow-sm flex flex-col overflow-hidden transition-all hover:shadow-md" *ngIf="hasGroupableFields() && (grid.groupBy || []).length > 0">
            <div class="px-4 py-3 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="material-icons text-[16px] text-purple-500">functions</span>
                <h3 class="text-[11px] font-bold text-slate-700 uppercase tracking-widest">Measures</h3>
              </div>
              <button class="h-6 px-2.5 text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-100 rounded hover:bg-purple-100 transition-colors" (click)="addAgg()">+ ADD</button>
            </div>
            <div class="p-4 flex flex-col gap-2 max-h-[200px] overflow-y-auto custom-scrollbar-premium">
              @for (agg of grid.aggregations || []; track $index; let i = $index) {
                <div class="flex items-center gap-2 group p-1.5 rounded-md hover:bg-slate-50">
                  <dx-select-box [items]="aggFields()" displayExpr="displayName" valueExpr="name" [value]="agg.field" class="premium-input flex-1" placeholder="Field" (onValueChanged)="updateAgg(i, 'field', $event.value)" />
                  <dx-select-box [items]="aggFunctions" displayExpr="label" valueExpr="value" [value]="agg.function" [width]="100" class="premium-input" (onValueChanged)="updateAgg(i, 'function', $event.value)" />
                  <button class="h-7 w-7 rounded text-slate-400 hover:bg-red-50 hover:text-red-500 flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100 shrink-0" (click)="removeAgg(i)"><span class="material-icons text-[14px]">close</span></button>
                </div>
              }
              @if (!grid.aggregations || grid.aggregations.length === 0) { <div class="text-[11px] font-medium text-slate-400 text-center py-4 bg-slate-50 rounded-lg">No measures configured.</div> }
            </div>
          </div>

          <!-- Sorts -->
          <div class="bg-white rounded-xl border border-slate-200/80 shadow-sm flex flex-col overflow-hidden transition-all hover:shadow-md" *ngIf="availableFields().length > 0">
            <div class="px-4 py-3 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="material-icons text-[16px] text-emerald-500">sort</span>
                <h3 class="text-[11px] font-bold text-slate-700 uppercase tracking-widest">Sort Order</h3>
              </div>
              <button class="h-6 px-2.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded hover:bg-emerald-100 transition-colors" (click)="addSort()">+ ADD</button>
            </div>
            <div class="p-4 flex flex-col gap-2 max-h-[200px] overflow-y-auto custom-scrollbar-premium">
              @for (sort of grid.sorts || []; track $index; let i = $index) {
                <div class="flex items-center gap-2 group p-1.5 rounded-md hover:bg-slate-50">
                  <dx-select-box [items]="availableFields()" displayExpr="displayName" valueExpr="name" [value]="sort.field" class="premium-input flex-1" placeholder="Field" (onValueChanged)="updateSort(i, 'field', $event.value)" />
                  <dx-select-box [items]="sortDirs" displayExpr="label" valueExpr="value" [value]="sort.direction" [width]="90" class="premium-input" (onValueChanged)="updateSort(i, 'direction', $event.value)" />
                  <button class="h-7 w-7 rounded text-slate-400 hover:bg-red-50 hover:text-red-500 flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100 shrink-0" (click)="removeSort(i)"><span class="material-icons text-[14px]">close</span></button>
                </div>
              }
              @if (!grid.sorts || grid.sorts.length === 0) { <div class="text-[11px] font-medium text-slate-400 text-center py-4 bg-slate-50 rounded-lg">Default sorting logic applied.</div> }
            </div>
          </div>

          <!-- Calculations (Advanced) -->
          <div class="bg-white rounded-xl border border-slate-200/80 shadow-sm flex flex-col overflow-hidden transition-all hover:shadow-md" *ngIf="advancedMode()" @slideInOut>
            <div class="px-4 py-3 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="material-icons text-[16px] text-pink-500">calculate</span>
                <h3 class="text-[11px] font-bold text-slate-700 uppercase tracking-widest">Formula Fields</h3>
              </div>
              <button class="h-6 px-2.5 text-[10px] font-bold text-pink-700 bg-pink-50 border border-pink-100 rounded hover:bg-pink-100 transition-colors" (click)="addCalc()">+ ADD</button>
            </div>
            <div class="p-4 flex flex-col gap-2">
              @for (calc of grid.calculatedColumns || []; track calc.id; let i = $index) {
                <div class="flex items-center gap-2 p-2 rounded-lg border border-slate-200 bg-slate-50/50 hover:border-pink-200 transition-colors relative group">
                  <dx-text-box [value]="calc.alias" class="premium-input w-28 shrink-0" placeholder="Alias" (onValueChanged)="updateCalc(i, 'alias', $event.value)" />
                  <span class="text-[12px] font-black text-slate-300">=</span>
                  <dx-text-box [value]="calc.expression" class="premium-input flex-1" placeholder="SQL Expression" (onValueChanged)="updateCalc(i, 'expression', $event.value)" />
                  <button class="h-7 w-7 rounded text-slate-400 hover:bg-red-50 hover:text-red-500 flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100 shrink-0" (click)="removeCalc(i)"><span class="material-icons text-[14px]">close</span></button>
                </div>
              }
              @if (!grid.calculatedColumns || grid.calculatedColumns.length === 0) { 
                <div class="py-4 flex flex-col items-center justify-center text-slate-400 border border-dashed border-slate-200 rounded-lg bg-slate-50/30">
                  <span class="text-[11px] font-medium">No formula fields added</span>
                </div>
              }
            </div>
          </div>

          </div>
        }

        <!-- GUIDED MODE -->
        @if (guidedMode()) {
           <div class="flex flex-col items-center justify-center w-full max-w-3xl mx-auto mt-10">
              <div class="flex items-center gap-8 mb-10 w-full justify-center">
                 <div class="flex flex-col items-center gap-2" [class.opacity-50]="guidedStep() !== 1">
                    <div class="h-10 w-10 rounded-full flex items-center justify-center font-black text-lg transition-colors" [class.bg-indigo-600]="guidedStep() >= 1" [class.text-white]="guidedStep() >= 1">1</div>
                    <span class="text-[10px] font-black uppercase tracking-widest text-slate-500">Source</span>
                 </div>
                 <div class="h-px w-16 bg-slate-200 mt-[-20px]"></div>
                 <div class="flex flex-col items-center gap-2" [class.opacity-50]="guidedStep() !== 2">
                    <div class="h-10 w-10 rounded-full flex items-center justify-center font-black text-lg transition-colors" [class.bg-indigo-600]="guidedStep() >= 2" [class.bg-slate-200]="guidedStep() < 2" [class.text-white]="guidedStep() >= 2" [class.text-slate-400]="guidedStep() < 2">2</div>
                    <span class="text-[10px] font-black uppercase tracking-widest text-slate-500">Metrics</span>
                 </div>
                 <div class="h-px w-16 bg-slate-200 mt-[-20px]"></div>
                 <div class="flex flex-col items-center gap-2" [class.opacity-50]="guidedStep() !== 3">
                    <div class="h-10 w-10 rounded-full flex items-center justify-center font-black text-lg transition-colors" [class.bg-indigo-600]="guidedStep() >= 3" [class.bg-slate-200]="guidedStep() < 3" [class.text-white]="guidedStep() >= 3" [class.text-slate-400]="guidedStep() < 3">3</div>
                    <span class="text-[10px] font-black uppercase tracking-widest text-slate-500">Refine</span>
                 </div>
              </div>

              <div class="bg-white rounded-2xl shadow-lg border border-slate-100 w-full p-8 min-h-[300px]">
                 @if (guidedStep() === 1) {
                    <div class="flex flex-col gap-4 text-center">
                       <h2 class="text-2xl font-black text-slate-800">What data do you want to analyze?</h2>
                       <p class="text-slate-500 mb-4">Select the primary business entity you want to build this report around.</p>
                       <dx-select-box [items]="svc.entities()" displayExpr="displayName" valueExpr="name"
                          [value]="grid.entity" [searchEnabled]="true" placeholder="Select Entity..."
                          class="premium-input max-w-md mx-auto w-full" (onValueChanged)="onEntityChange($event.value)">
                       </dx-select-box>
                       <button class="mt-8 px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-md shadow-indigo-200 mx-auto w-fit disabled:opacity-50" [disabled]="!grid.entity" (click)="guidedStep.set(2)">NEXT STEP: METRICS</button>
                    </div>
                 }
                 @if (guidedStep() === 2) {
                    <div class="flex flex-col gap-4 text-center h-full">
                       <h2 class="text-2xl font-black text-slate-800">What metrics should we display?</h2>
                       <p class="text-slate-500 mb-4">Pick the columns to include in your initial view.</p>
                       <div class="text-left max-w-lg mx-auto w-full">
                          <dx-tag-box [items]="availableFields()" displayExpr="displayName" valueExpr="name"
                             [value]="grid.columns" [searchEnabled]="true" [showSelectionControls]="true"
                             placeholder="Search fields..." class="premium-input">
                          </dx-tag-box>
                       </div>
                       <div class="mt-8 flex justify-between">
                          <button class="px-6 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl" (click)="guidedStep.set(1)">BACK</button>
                          <button class="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-md shadow-indigo-200" (click)="guidedStep.set(3)">NEXT STEP: REFINE</button>
                       </div>
                    </div>
                 }
                 @if (guidedStep() === 3) {
                    <div class="flex flex-col gap-4 text-center h-full">
                       <h2 class="text-2xl font-black text-slate-800">Ready to review your data?</h2>
                       <p class="text-slate-500 mb-4">You can run the query now, or use the expert mode for advanced joins and filtering.</p>
                       
                       <div class="bg-slate-50 p-6 rounded-xl border border-slate-100 mt-4 text-left">
                          <h4 class="text-sm font-bold text-slate-800 mb-2">Summary:</h4>
                          <ul class="text-xs text-slate-600 space-y-1">
                             <li><strong class="text-slate-800">Source:</strong> {{ grid.entity }}</li>
                             <li><strong class="text-slate-800">Columns:</strong> {{ grid.columns.length }} selected</li>
                          </ul>
                       </div>

                       <div class="mt-8 flex justify-between">
                          <button class="px-6 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl" (click)="guidedStep.set(2)">BACK</button>
                          <button class="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl shadow-md shadow-emerald-200" (click)="onRun()">RUN QUERY NOW</button>
                       </div>
                    </div>
                 }
              </div>
           </div>
        }

        <!-- Visual AST Representation inside Expert Mode -->
        @if (!guidedMode() && advancedMode()) {
           <div class="w-full mt-4 bg-slate-900 rounded-xl p-4 shadow-lg border border-slate-800 overflow-hidden flex flex-col gap-2 relative">
             <div class="absolute top-0 right-0 bg-indigo-600 text-[9px] font-black text-white px-2 py-1 rounded-bl-lg">AST ENGINE</div>
             <h3 class="text-xs font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                <span class="material-icons text-[14px]">account_tree</span> Abstract Syntax Tree View
             </h3>
             <pre class="text-[10px] font-mono text-slate-300 leading-relaxed overflow-x-auto mt-2">{{ astPreview() }}</pre>
           </div>
        }

      </div>

      <!-- Footer Info Bar -->
      <div class="h-10 border-t border-slate-200 bg-white flex items-center justify-between px-5 shrink-0 z-10 shadow-[0_-2px_4px_rgba(0,0,0,0.02)]">
        <button class="text-[11px] font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1.5 transition-colors" (click)="toggleAdvanced()">
          <span class="material-icons text-[16px] transition-transform" [@rotate180]="advancedMode() ? 'expanded' : 'collapsed'">expand_more</span>
          {{ advancedMode() ? 'HIDE ADVANCED SETTINGS' : 'SHOW ADVANCED SETTINGS' }}
        </button>
        <div class="text-[10px] text-slate-400 font-medium truncate flex-1 tracking-tight text-right pr-2">
          {{ queryDigest() }}
        </div>
      </div>

      <!-- Filters Modal via DX-Popup -->
      <dx-popup
         [visible]="filtersModalVisible()"
         [width]="800"
         [height]="'80vh'"
         [showTitle]="false"
         [dragEnabled]="false"
         [showCloseButton]="false"
         wrapperAttr="{ class: 'premium-modal-wrapper' }"
         (onHiding)="filtersModalVisible.set(false)">
         <div *dxTemplate="let data of 'content'" class="h-full flex flex-col bg-slate-50/50">
            <!-- Modal Header -->
            <div class="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 rounded-t-lg">
               <div class="flex items-center gap-3">
                  <div class="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center">
                     <span class="material-icons text-amber-600 text-[18px]">filter_alt</span>
                  </div>
                  <div>
                    <h2 class="text-sm font-bold text-slate-800 leading-tight">Query Filters</h2>
                    <p class="text-[10px] font-medium text-slate-400">Define complex inclusion Criteria</p>
                  </div>
               </div>
               <button class="h-8 w-8 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors" (click)="filtersModalVisible.set(false)">
                  <span class="material-icons">close</span>
               </button>
            </div>
            
            <!-- Filters Canvas -->
            <div class="flex-1 overflow-y-auto p-6 bg-[#f8fafc]">
               <div class="max-w-4xl mx-auto drop-shadow-sm">
                  <rf-filter-group [group]="filterGroup()" [fields]="availableFields()" [isRoot]="true" (onChange)="onFilterChange($event)" />
               </div>
            </div>

            <!-- Modal Footer -->
            <div class="h-14 bg-white border-t border-slate-200 px-6 flex items-center justify-end shrink-0 rounded-b-lg">
               <button class="h-9 px-5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg shadow-sm transition-colors" (click)="filtersModalVisible.set(false)">
                 DONE
               </button>
            </div>
         </div>
      </dx-popup>

      <!-- DEV CONSOLE Overlay -->
      <div *ngIf="consoleVisible()" class="absolute bottom-0 left-0 right-0 bg-[#0c131f] border-t border-slate-800 overflow-hidden anim-fade flex flex-col z-[100] shadow-[0_-20px_40px_rgba(0,0,0,0.3)]">
         <div class="h-10 px-4 flex items-center justify-between bg-white/5 border-b border-white/10 backdrop-blur-md">
            <span class="text-[11px] font-black text-slate-300 tracking-widest flex items-center gap-2">
              <span class="material-icons text-slate-400 text-[16px]">terminal</span> TERMINAL OUTPUT
            </span>
            <button class="h-6 w-6 rounded flex items-center justify-center text-slate-400 hover:bg-white/10 hover:text-white transition-colors" (click)="consoleVisible.set(false)">
              <span class="material-icons text-[14px]">close</span>
            </button>
         </div>
         <div class="p-3 font-mono text-[11px] leading-relaxed flex flex-col gap-1.5 overflow-y-auto max-h-[250px] min-h-[150px] custom-scrollbar bg-transparent">
            @for (log of consoleLogs(); track $index) {
              <div class="flex gap-3 hover:bg-white/5 px-2 py-0.5 rounded transition-colors">
                <span class="text-slate-500 shrink-0 select-none">{{ log.time }}</span>
                <span [class.text-emerald-400]="log.level === 'success'" [class.text-sky-400]="log.level === 'info'" [class.text-amber-400]="log.level === 'warn'" [class.text-red-400]="log.level === 'error'" class="flex-1 break-all">{{ log.message }}</span>
              </div>
            }
         </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; height: 100%; }
    .custom-scrollbar::-webkit-scrollbar { width: 4px; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
    
    .premium-input ::ng-deep .dx-texteditor-input { padding: 7px 10px !important; min-height: 32px !important; font-size: 13px !important; font-weight: 500 !important; font-family: inherit !important; line-height: 1.2 !important; }
    .premium-input ::ng-deep .dx-numberbox-input, .premium-input ::ng-deep .dx-texteditor-input { border-radius: 6px !important; }
    .premium-input ::ng-deep .dx-texteditor { min-height: 32px !important; background: #fff !important; border-color: #cbd5e1 !important; border-radius: 6px !important; transition: border-color 0.2s ease, box-shadow 0.2s ease; }
    .premium-input ::ng-deep .dx-texteditor.dx-state-focused { border-color: #3b82f6 !important; box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1) !important; }

    ::ng-deep .premium-modal-wrapper .dx-popup-content { padding: 0 !important; border-radius: 12px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25) !important; }
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

  filterGroup = signal<FilterGroup>(createGroup());

  astPreview = computed(() => {
     return JSON.stringify({
        kind: 'QueryNode',
        source: this.grid.entity,
        selections: [
           ...this.grid.columns.map(c => ({ kind: 'FieldNode', value: c })),
           ...(this.grid.calculatedColumns || []).map(c => ({ kind: 'CalcNode', expression: c.expression, alias: c.alias }))
        ],
        filters: this.filterGroup(),
        joins: this.grid.joins || [],
        aggregations: this.grid.aggregations || [],
        groupBy: this.grid.groupBy || []
     }, null, 2);
  });

  queryDigest = computed(() => {
    const g = this.grid;
    if (!g.entity) return 'Please select a data source to begin.';

    let text = `Searching ${g.entity}`;

    const columnsCount = g.columns.length + (g.calculatedColumns?.length || 0);
    if (columnsCount > 0) {
      text += ` for ${columnsCount} specific fields`;
    }

    if (g.filters?.conditions.length || g.filters?.groups.length) {
      text += ` with active filtering criteria`;
    }

    if (g.groupBy.length) {
      text += `, grouping by ${g.groupBy.join(', ')}`;
    }

    if (g.sorts?.length) {
      text += `, sorted by ${g.sorts[0].field}`;
    }

    return text + '.';
  });

  onRun() {
    if (this.isRunning()) return;
    this.isRunning.set(true);
    const now = new Date();
    const time = `[${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}]`;
    this.consoleLogs.update(logs => [
      ...logs,
      { time, message: `Executing query on entity: ${this.grid.entity}...`, level: 'info' },
    ]);
    this.runRequested.emit();
    setTimeout(() => this.isRunning.set(false), 800);
  }

  onSave() {
    this.saveRequested.emit();
  }

  ngOnChanges() {
    if (this.grid.filters) this.filterGroup.set(this.grid.filters);
    else this.filterGroup.set(createGroup());

    if ((this.grid.joins?.length || 0) > 0 || (this.grid.calculatedColumns?.length || 0) > 0) {
      this.advancedMode.set(true);
    }

    if (this.grid.entity) {
       const ent = this.svc.entities().find(e => e.name === this.grid.entity);
       if (ent) {
          this.svc.loadEntityDetail(ent.id).subscribe();
       }
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
    if (ent) {
       this.svc.loadEntityDetail(ent.id).subscribe();
    }
    this.emit({ ...this.grid, entity, columns: [], groupBy: [], aggregations: [], joins: [], calculatedColumns: [], filters: createGroup() });
  }

  onColumnsChange(columns: string[]) { this.emit({ ...this.grid, columns }); }
  onGroupByChange(groupBy: string[]) { this.emit({ ...this.grid, groupBy }); }
  onFilterChange(filters: FilterGroup) {
    this.filterGroup.set(filters);
    this.emit({ ...this.grid, filters });
  }

  // Sorts
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

  // Joins
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

  onJoinMappingChange(index: number, key: 'leftField' | 'rightField', value: string) {
    const join = this.grid.joins[index];
    const updatedJoin = { ...join, [key]: value };
    if (updatedJoin.leftField && updatedJoin.rightField) {
      const leftTable = this.grid.entity;
      const rightTable = updatedJoin.alias || updatedJoin.targetEntity;
      updatedJoin.onClause = `${leftTable}.${updatedJoin.leftField} = ${rightTable}.${updatedJoin.rightField}`;
    }
    this.updateJoin(index, 'onClause', updatedJoin.onClause);
    const joins = this.grid.joins.map((j, i) => i === index ? updatedJoin : j);
    this.emit({ ...this.grid, joins });
  }

  // Calculated Columns
  addCalc() {
    const calc: CalculatedColumn = { id: crypto.randomUUID(), alias: 'NewField', expression: '' };
    this.emit({ ...this.grid, calculatedColumns: [...(this.grid.calculatedColumns || []), calc] });
  }
  updateCalc(index: number, key: keyof CalculatedColumn, value: string) {
    const calcs = this.grid.calculatedColumns!.map((c, i) => i === index ? { ...c, [key]: value } : c);
    this.emit({ ...this.grid, calculatedColumns: calcs });
  }
  removeCalc(index: number) {
    this.emit({ ...this.grid, calculatedColumns: this.grid.calculatedColumns!.filter((_, i) => i !== index) });
  }

  // Aggregations
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

  clearAll() {
    this.filterGroup.set(createGroup());
    this.emit({ ...this.grid, columns: [], groupBy: [], aggregations: [], joins: [], calculatedColumns: [], filters: createGroup() });
    this.consoleLogs.set([]);
  }

  logToConsole(message: string, level: ConsoleLog['level'] = 'info') {
    const now = new Date();
    const time = `[${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}]`;
    this.consoleLogs.update(logs => [...logs.slice(-49), { time, message, level }]);
  }

  private emit(grid: GridDefinition) { this.gridChange.emit(grid); }
}
