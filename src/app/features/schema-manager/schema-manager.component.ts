import { Component, inject, signal, computed, effect, ChangeDetectionStrategy, DestroyRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DxDataGridModule, DxTabsModule, DxButtonModule, DxPopupModule, DxFormModule, DxSelectBoxModule, DxTextBoxModule, DxCheckBoxModule, DxTextAreaModule, DxScrollViewModule, DxLoadPanelModule, DxListModule, DxValidatorModule, DxValidationGroupModule, DxValidationGroupComponent, DxTagBoxModule } from 'devextreme-angular';
import { ReportService } from '../../core/services/report.service';
import { NotificationService } from '../../core/services/notification.service';
import { FilterGroupComponent } from '../query-builder/filter-group/filter-group.component';
import type { EntityMetadata, FieldMetadata, EntityRelationship, JoinCondition, FilterGroup } from '../../core/models/report.models';

@Component({
  selector: 'rf-schema-manager',
  standalone: true,
  imports: [
    CommonModule, FormsModule, DxDataGridModule, DxTabsModule, DxButtonModule, 
    DxPopupModule, DxFormModule, DxSelectBoxModule, DxTextBoxModule, DxCheckBoxModule,
    DxTextAreaModule, DxScrollViewModule, DxLoadPanelModule, DxListModule,
    DxValidatorModule, DxValidationGroupModule, DxTagBoxModule, FilterGroupComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="h-full flex flex-col bg-white overflow-hidden anim-fade">
      <!-- Compact Header -->
      <header class="bg-white border-b border-slate-200 px-4 py-2 flex items-center justify-between shrink-0">
        <div class="flex items-center gap-3">
            <div class="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white">
               <span class="material-icons text-sm">account_tree</span>
            </div>
            <div>
               <h1 class="text-sm font-black text-slate-900 tracking-tight leading-none uppercase">Schema Designer</h1>
               <div class="flex items-center gap-1.5 mt-1">
                  <div class="h-1.5 w-1.5 rounded-full" [class.bg-emerald-500]="dirtyEntities().size === 0" [class.bg-amber-500]="dirtyEntities().size > 0"></div>
                  <span class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                    {{ dirtyEntities().size > 0 ? dirtyEntities().size + ' Changes Pending' : 'Schema Synced' }}
                  </span>
               </div>
            </div>
        </div>

        <div class="flex items-center gap-2">
           <button class="rf-compact-btn-outline h-8 px-3" (click)="openBulkImport()">
              <span class="material-icons text-sm">download</span>
              <span>BULK IMPORT</span>
           </button>
           
           <div class="h-4 w-px bg-slate-200 mx-1"></div>

           <button class="w-8 h-8 flex items-center justify-center rounded-md hover:bg-slate-100 text-slate-400" (click)="loadInitialData()">
              <span class="material-icons text-lg" [class.animate-spin]="isDetailLoading()">refresh</span>
           </button>
           
           <button 
             class="rf-compact-btn-primary h-8 px-4 shadow-sm disabled:opacity-50"
             [disabled]="!saveEnabled() || isSaving()"
             (click)="onProvisionClick()"
           >
              <span class="material-icons text-sm">{{ isSaving() ? 'hourglass_top' : 'cloud_upload' }}</span>
              <span>{{ isSaving() ? 'PROVISION' : 'SAVE' }}</span>
           </button>
        </div>
      </header>

      <div class="flex-1 flex overflow-hidden">
        <!-- Compact Sidebar -->
        <aside class="w-64 border-r border-slate-200 flex flex-col bg-slate-50/50 shrink-0">
          <div class="p-3 border-b border-slate-200">
             <div class="relative">
                <span class="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
                <input 
                   type="text" 
                   [ngModel]="searchQuery()"
                   (ngModelChange)="onSearchChange($event)"
                   placeholder="Search schema..." 
                   class="rf-compact-input w-full pl-9 h-8"
                />
             </div>
          </div>

          <div class="flex-1 overflow-y-auto custom-scrollbar">
             @if (entities().length === 0) {
               <div class="p-4 space-y-2 text-center py-12">
                  <span class="material-icons text-slate-200 text-4xl mb-2">inbox</span>
                  <p class="text-[10px] font-black text-slate-300 uppercase tracking-widest">No Entities Provisioned</p>
               </div>
             }
             @for (e of filteredEntities(); track e.id) {
                <div (click)="selectedEntityId.set(e.id)" 
                     [class.bg-slate-700]="selectedEntityId() === e.id"
                     [class.text-white]="selectedEntityId() === e.id"
                     class="group flex items-center justify-between p-2 rounded cursor-pointer hover:bg-slate-700 transition-all border border-transparent"
                     [class.border-blue-500]="selectedEntityId() === e.id">
                   <div class="flex items-center gap-2 overflow-hidden">
                      <i class="dx-icon-fields text-slate-400 group-hover:text-blue-400"></i>
                      <div class="flex flex-col overflow-hidden">
                         <span class="text-[11px] font-bold truncate">{{e.displayName || e.name}}</span>
                         <span class="text-[9px] text-slate-500 truncate" *ngIf="e.database">{{e.database}}.{{e.schema}}</span>
                      </div>
                   </div>
                   
                   <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button (click)="onDeleteEntity(e, $event)" class="w-6 h-6 flex items-center justify-center rounded hover:bg-red-500/20 text-slate-500 hover:text-red-400">
                         <i class="dx-icon-trash text-[12px]"></i>
                      </button>
                      <div *ngIf="dirtyEntities().has(e.id)" class="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse"></div>
                   </div>
                </div>
             }
          </div>
        </aside>

        <!-- Main Content -->
        <main class="flex-1 flex flex-col overflow-hidden bg-white">
          <dx-validation-group #validationGroup>
            <!-- Compact Tabs -->
            <div class="border-b border-slate-200 px-4 flex items-center gap-1 shrink-0 bg-slate-50/30">
               @for (tab of tabs; track $index) {
                 <button 
                   class="px-4 h-10 text-[11px] font-black uppercase tracking-widest transition-all relative"
                   [class.text-brand-primary]="tabIndex() === $index"
                   [class.text-slate-400]="tabIndex() !== $index"
                   (click)="tabIndex.set($index)">
                   {{ tab.text }}
                   <div *ngIf="tabIndex() === $index" class="absolute bottom-0 left-2 right-2 h-0.5 bg-brand-primary rounded-t-full"></div>
                 </button>
               }
            </div>

            <div class="flex-1 overflow-hidden relative">
              <dx-scroll-view width="100%" height="100%" class="custom-scrollbar">
                <div class="p-6 max-w-5xl mx-auto">
                  <!-- Entity Details / Fields Tab -->
                  @if (tabIndex() === 0) {
                    @if (isDetailLoading()) {
                        <div class="space-y-6">
                           <div class="grid grid-cols-4 gap-4">
                              @for (i of [1,2,3,4]; track i) { <div class="h-16 skeleton"></div> }
                           </div>
                           <div class="h-32 skeleton"></div>
                           <div class="h-64 skeleton"></div>
                        </div>
                     } @else if (selectedEntity(); as e) {
                      <div class="flex flex-col gap-6 anim-fade">
                         <!-- Stats Grid -->
                         <div class="grid grid-cols-4 gap-4">
                            @for (stat of [
                              { label: 'Provider', value: e.providerKey, icon: 'storage' },
                              { label: 'Resource', value: (e.database || 'Default') + '.' + (e.schema || 'dbo'), icon: 'dns' },
                              { label: 'Fields', value: e.fields.length, icon: 'list' },
                              { label: 'Links', value: (e.relationships || []).length, icon: 'link' }
                            ]; track $index) {
                              <div class="bg-slate-50 p-3 rounded-lg border border-slate-200 flex items-center gap-3">
                                 <span class="material-icons text-slate-400 text-sm">{{ stat.icon }}</span>
                                 <div class="min-w-0">
                                    <span class="text-[8px] font-black text-slate-400 uppercase tracking-widest block">{{ stat.label }}</span>
                                    <span class="text-[11px] font-bold text-slate-700 truncate block">{{ stat.value }}</span>
                                 </div>
                              </div>
                            }
                         </div>

                         <!-- Basic Config (Advanced Multi-DB Support) -->
                         <div class="bg-white rounded-lg border border-slate-200 p-5 space-y-4 shadow-sm">
                            <div class="flex items-center justify-between border-b border-slate-100 pb-3">
                               <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Metadata Configuration</span>
                               <div class="flex items-center gap-2">
                                  <dx-check-box [(value)]="e.isActive" (onValueChanged)="markDirty(e.id)"></dx-check-box>
                                  <span class="text-[10px] font-bold uppercase text-slate-600">{{ e.isActive ? 'Active' : 'Inactive' }}</span>
                               </div>
                            </div>

                            <div class="grid grid-cols-12 gap-4">
                               <div class="col-span-4 space-y-1.5">
                                  <label class="text-[9px] font-black text-slate-400 uppercase">Alias Name</label>
                                  <dx-text-box [(value)]="e.displayName" (onValueChanged)="markDirty(e.id)" class="rf-compact-input w-full font-bold text-brand-primary">
                                     <dx-validator><dxi-validation-rule type="required"></dxi-validation-rule></dx-validator>
                                  </dx-text-box>
                               </div>
                               <div class="col-span-3 space-y-1.5">
                                  <label class="text-[9px] font-black text-slate-400 uppercase">Database</label>
                                  <dx-text-box [value]="e.database || ''" (onValueChanged)="e.database = $event.value; markDirty(e.id)" placeholder="Optional DB name..." class="rf-compact-input w-full" />
                               </div>
                               <div class="col-span-2 space-y-1.5">
                                  <label class="text-[9px] font-black text-slate-400 uppercase">Schema</label>
                                  <dx-text-box [(value)]="e.schema" (onValueChanged)="markDirty(e.id)" placeholder="dbo" class="rf-compact-input w-full" />
                               </div>
                               <div class="col-span-3 space-y-1.5">
                                  <label class="text-[9px] font-black text-slate-400 uppercase">Physical Table</label>
                                  <dx-text-box [(value)]="e.tableName" (onValueChanged)="markDirty(e.id)" class="rf-compact-input w-full bg-slate-50/50" [readOnly]="true" />
                               </div>
                               <div class="col-span-12 space-y-1.5">
                                  <label class="text-[9px] font-black text-slate-400 uppercase">Functional Description</label>
                                  <dx-text-box [value]="e.description || ''" (onValueChanged)="e.description = $event.value; markDirty(e.id)" class="rf-compact-input w-full" placeholder="Internal documentation for analysts..." />
                               </div>
                            </div>
                         </div>

                         <!-- Fields Grid -->
                         <div class="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm flex flex-col">
                            <div class="px-4 py-2 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                               <div class="flex items-center gap-2">
                                  <span class="material-icons text-slate-400 text-xs">list_alt</span>
                                  <span class="text-[10px] font-black text-slate-500 uppercase tracking-widest">Attributes & Security Mapping</span>
                               </div>
                               <div class="flex items-center gap-3">
                                  <button (click)="bulkToggleFields(e, true)" class="text-[9px] font-black text-brand-primary uppercase hover:underline">SHOW ALL</button>
                                  <div class="h-3 w-px bg-slate-200"></div>
                                  <button (click)="bulkToggleFields(e, false)" class="text-[9px] font-black text-slate-400 uppercase hover:underline">HIDE ALL</button>
                               </div>
                            </div>
                            
                            <div class="h-[400px]">
                              <dx-data-grid
                                [dataSource]="e.fields"
                                [height]="'100%'"
                                [showBorders]="false"
                                [scrolling]="{ mode: 'virtual' }"
                                [loadPanel]="{ enabled: false }"
                              >
                                <dxo-editing mode="cell" [allowUpdating]="true"></dxo-editing>
                                <dxi-column dataField="isVisible" caption="" [width]="40" cellTemplate="checkTemplate"></dxi-column>
                                <dxi-column dataField="name" caption="COLUMN" [allowEditing]="false" cellTemplate="monoTemplate"></dxi-column>
                                <dxi-column dataField="displayName" caption="DISPLAY LABEL"></dxi-column>
                                <dxi-column dataField="dataType" caption="TYPE" [width]="100">
                                   <dxo-lookup [dataSource]="dataTypes"></dxo-lookup>
                                </dxi-column>
                                <dxi-column dataField="isSensitive" caption="PII" [width]="60" cellTemplate="lockTemplate"></dxi-column>
                                <dxi-column [width]="40" cellTemplate="editTemplate"></dxi-column>

                                <div *dxTemplate="let d of 'checkTemplate'">
                                   <span class="material-icons text-xs" [class.text-brand-primary]="d.value" [class.text-slate-300]="!d.value">
                                      {{ d.value ? 'check_circle' : 'circle' }}
                                   </span>
                                </div>
                                <div *dxTemplate="let d of 'monoTemplate'"><span class="font-mono text-[10px] text-slate-400">{{ d.value }}</span></div>
                                <div *dxTemplate="let d of 'lockTemplate'"><span *ngIf="d.value" class="material-icons text-xs text-rose-500">lock</span></div>
                                <div *dxTemplate="let d of 'editTemplate'">
                                   <button class="text-slate-400 hover:text-brand-primary" (click)="editField(d.data)"><span class="material-icons text-sm">settings</span></button>
                                </div>
                              </dx-data-grid>
                            </div>
                         </div>
                      </div>
                     }
                  }

                  <!-- Relationships Tab -->
                  @if (tabIndex() === 1) {
                    <div class="flex flex-col gap-4 anim-fade">
                        <div class="flex items-center justify-between">
                           <div class="flex items-center gap-2">
                              <span class="material-icons text-slate-400 text-sm">link</span>
                              <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Enterprise Knowledge Links</span>
                           </div>
                           <div class="flex items-center gap-2">
                              <button class="rf-compact-btn-outline px-3 h-8 shadow-sm" (click)="checkConsistency()">
                                 <span class="material-icons text-sm">fact_check</span>
                                 <span>VALIDATE LINKS</span>
                              </button>
                              <button class="rf-compact-btn-primary px-3 h-8 shadow-sm" (click)="addRelationship()">
                                 <span class="material-icons text-sm">add</span>
                                 <span>ESTABLISH LINK</span>
                              </button>
                           </div>
                        </div>

                        @if (consistencyErrors().length > 0) {
                           <div class="bg-red-50 border border-red-100 rounded-lg p-3 anim-fade">
                              <div class="flex items-center gap-2 text-red-600 mb-2">
                                 <span class="material-icons text-sm text-[14px]">warning</span>
                                 <span class="text-[10px] font-black uppercase tracking-widest">Consistency Issues ({{consistencyErrors().length}})</span>
                              </div>
                              <ul class="space-y-1">
                                 @for (err of consistencyErrors(); track $index) {
                                    <li class="text-[10px] text-red-500 flex items-start gap-2">
                                       <span class="mt-1.5 w-1 h-1 rounded-full bg-red-400 shrink-0"></span>
                                       {{err}}
                                    </li>
                                 }
                              </ul>
                           </div>
                        }

                        <div class="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm h-[500px] overflow-y-auto custom-scrollbar">
                           <div class="flex flex-col divide-y divide-slate-100">
                              @for (rel of relationships(); track rel.id) {
                                 <div class="p-4 hover:bg-slate-50 transition-all group">
                                    <div class="flex items-center justify-between">
                                       <div class="flex items-center gap-3">
                                          <div class="flex flex-col items-center">
                                             <span class="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Source</span>
                                             <span class="text-[11px] font-bold text-slate-700">{{ getEntityName(rel.sourceEntityId) }}</span>
                                          </div>
                                          <i class="dx-icon-arrowright text-slate-300"></i>
                                          <div class="flex flex-col items-center">
                                             <span class="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Target</span>
                                             <span class="text-[11px] font-bold text-slate-700">{{ getEntityName(rel.targetEntityId) }}</span>
                                          </div>
                                       </div>

                                       <div class="flex items-center gap-2">
                                          <span class="px-2 py-0.5 rounded bg-slate-100 text-slate-500 text-[9px] font-black">{{ rel.joinType }}</span>
                                          <button (click)="openRelationshipEditor(rel)" class="w-7 h-7 flex items-center justify-center rounded hover:bg-blue-50 text-slate-400 hover:text-blue-500">
                                             <i class="dx-icon-edit text-xs"></i>
                                          </button>
                                          <button (click)="onDeleteRelationship(rel.id)" class="w-7 h-7 flex items-center justify-center rounded hover:bg-red-50 text-slate-400 hover:text-red-500">
                                             <i class="dx-icon-trash text-xs"></i>
                                          </button>
                                       </div>
                                    </div>
                                    
                                    <div class="mt-2 flex flex-wrap gap-2">
                                       @for (cond of rel.conditions; track $index) {
                                          <div class="text-[9px] font-mono bg-slate-50 border border-slate-100 px-2 py-1 rounded text-slate-400">
                                             {{ cond.leftField }} {{ cond.operator }} {{ cond.rightField }}
                                          </div>
                                       }
                                       @if (!rel.conditions || rel.conditions.length === 0) {
                                          <div class="text-[9px] font-mono text-slate-300 italic">{{ rel.sourceField }} ↔ {{ rel.targetField }}</div>
                                       }
                                    </div>
                                 </div>
                              }
                              @if (relationships().length === 0) {
                                 <div class="h-full flex flex-col items-center justify-center text-center p-12">
                                    <i class="dx-icon-link text-slate-200 text-5xl mb-4"></i>
                                    <p class="text-xs font-black text-slate-400 uppercase tracking-widest">No relationships established</p>
                                 </div>
                              }
                           </div>
                        </div>
                     </div>
                  }

                  <!-- Data Preview Tab -->
                  @if (tabIndex() === 2) {
                     <div class="flex flex-col gap-4 anim-fade h-full">
                        <div class="flex items-center justify-between shrink-0">
                           <div class="flex items-center gap-2">
                              <span class="material-icons text-slate-400 text-sm">preview</span>
                              <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Live Data Inspection (Top 50 Rows)</span>
                           </div>
                           <button class="rf-compact-btn-outline px-3 h-8" (click)="refreshPreview()">
                              <span class="material-icons text-sm">refresh</span>
                              <span>REFRESH SAMPLE</span>
                           </button>
                        </div>

                        <!-- Preview Filters -->
                        <div class="bg-slate-50 border border-slate-200 rounded-lg p-3 shrink-0">
                           <div class="flex items-center justify-between mb-3">
                              <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Preview Filters</span>
                              <button (click)="previewFilters.set({ id: 'preview', logic: 'AND', conditions: [], groups: [] })" class="text-[9px] font-bold text-slate-400 hover:text-red-500 uppercase">Clear All</button>
                           </div>
                           <rf-filter-group [group]="previewFilters()" [fields]="currentFields()" />
                        </div>

                       <div class="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm h-[500px] relative">
                          <dx-data-grid
                             [dataSource]="previewData()"
                             [height]="'100%'"
                             [showBorders]="false"
                             [scrolling]="{ mode: 'virtual' }"
                          >
                             <dxo-column-chooser [enabled]="true" mode="select"></dxo-column-chooser>
                             <dxo-header-filter [visible]="true"></dxo-header-filter>
                          </dx-data-grid>
                          
                          <dx-load-panel [visible]="isPreviewLoading()" [position]="{ of: 'parent' }" message="Querying source..."></dx-load-panel>
                          @if (!isPreviewLoading() && previewData().length === 0) {
                             <div class="absolute inset-0 flex flex-col items-center justify-center text-center p-12 bg-slate-50/50">
                                <span class="material-icons text-slate-200 text-5xl mb-4">search_off</span>
                                <p class="text-xs font-black text-slate-400 uppercase tracking-widest">No data available for preview</p>
                             </div>
                          }
                       </div>
                    </div>
                  }

                </div>
              </dx-scroll-view>
            </div>
          </dx-validation-group>
        </main>
      </div>

      <!-- Field Modal Overlay -->
      <div *ngIf="isFieldPopupVisible()" class="rf-modal-overlay anim-fade" (click)="isFieldPopupVisible.set(false)">
        <div class="rf-modal-content w-[400px]" (click)="$event.stopPropagation()">
           <dx-validation-group #fieldValidationGroup>
              <div class="px-5 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                 <span class="text-[11px] font-black text-slate-800 uppercase tracking-widest">Field Configuration</span>
                 <button (click)="isFieldPopupVisible.set(false)" class="text-slate-400 hover:text-slate-600"><span class="material-icons text-sm">close</span></button>
              </div>
              <div class="p-5 space-y-4">
                 @if (editingField(); as f) {
                   <div class="space-y-1.5">
                      <label class="text-[9px] font-black text-slate-400 uppercase">Display Label</label>
                      <dx-text-box [(value)]="f.displayName" class="rf-compact-input w-full font-bold">
                         <dx-validator><dxi-validation-rule type="required"></dxi-validation-rule></dx-validator>
                      </dx-text-box>
                   </div>
                   <div class="grid grid-cols-2 gap-4">
                      <div class="space-y-1.5">
                         <label class="text-[9px] font-black text-slate-400 uppercase">Data Type</label>
                         <dx-select-box [items]="dataTypes" [(value)]="f.dataType" class="compact-select"></dx-select-box>
                      </div>
                      <div class="flex flex-col justify-end pb-1">
                         <div class="flex items-center gap-2">
                           <dx-check-box [(value)]="f.isSensitive"></dx-check-box>
                           <span class="text-[10px] font-bold text-slate-600">SENSITIVE / PII</span>
                         </div>
                      </div>
                   </div>
                   <div class="p-3 bg-slate-50 rounded-lg border border-slate-100 flex flex-col gap-2">
                      <span class="text-[8px] font-black text-slate-400 uppercase">Capability Settings</span>
                      <div class="grid grid-cols-2 gap-2">
                         <dx-check-box [(value)]="f.isFilterable" text="Filterable" class="text-[10px]"></dx-check-box>
                         <dx-check-box [(value)]="f.isSortable" text="Sortable" class="text-[10px]"></dx-check-box>
                         <dx-check-box [(value)]="f.isGroupable" text="Groupable" class="text-[10px]"></dx-check-box>
                         <dx-check-box [(value)]="f.isAggregatable" text="Aggregatable" class="text-[10px]"></dx-check-box>
                      </div>
                   </div>
                 }
              </div>
              <div class="px-5 py-3 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
                 <button class="rf-compact-btn-ghost" (click)="isFieldPopupVisible.set(false)">CANCEL</button>
                 <button class="rf-compact-btn-primary px-6" (click)="applyFieldChanges()">SAVE CHANGES</button>
              </div>
           </dx-validation-group>
        </div>
      </div>

      <!-- Relationship Modal Overlay (Advanced Composite Keys) -->
      <div *ngIf="isRelationshipPopupVisible()" class="rf-modal-overlay anim-fade" (click)="isRelationshipPopupVisible.set(false)">
        <div class="rf-modal-content w-[600px]" (click)="$event.stopPropagation()">
           <dx-validation-group #relValidationGroup>
              <div class="px-5 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                 <span class="text-[11px] font-black text-slate-800 uppercase tracking-widest">Enterprise Knowledge Link</span>
                 <button (click)="isRelationshipPopupVisible.set(false)" class="text-slate-400 hover:text-slate-600"><span class="material-icons text-sm">close</span></button>
              </div>
              <div class="p-5 space-y-6">
                 @if (editingRelationship(); as r) {
                    <div class="grid grid-cols-2 gap-4">
                       <div class="space-y-1.5">
                          <label class="text-[9px] font-black text-slate-400 uppercase">Target Entity</label>
                          <dx-select-box [items]="entityLookup()" displayExpr="displayName" valueExpr="id" [(value)]="r.targetEntityId" placeholder="Select Target..." class="compact-select">
                             <dx-validator><dxi-validation-rule type="required"></dxi-validation-rule></dx-validator>
                          </dx-select-box>
                       </div>
                       <div class="space-y-1.5">
                          <label class="text-[9px] font-black text-slate-400 uppercase">Cardinality</label>
                          <dx-select-box [items]="['OneToMany', 'ManyToOne', 'OneToOne']" [(value)]="r.relationType" class="compact-select"></dx-select-box>
                       </div>
                       <div class="space-y-1.5">
                          <label class="text-[9px] font-black text-slate-400 uppercase">Join Strategy</label>
                          <dx-select-box [items]="['INNER', 'LEFT', 'RIGHT']" [(value)]="r.joinType" class="compact-select"></dx-select-box>
                       </div>
                    </div>

                     <div class="space-y-3">
                        <div class="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-200">
                           <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Conditions ({{r.conditions.length}})</span>
                           <button (click)="addRelCondition()" class="text-[10px] font-black text-blue-500 uppercase hover:underline">
                              + Add Key Pair
                           </button>
                        </div>

                        <div class="space-y-2 max-h-[200px] overflow-y-auto pr-1 custom-scrollbar">
                           @for (cond of r.conditions; track $index) {
                              <div class="flex items-center gap-2 bg-white p-2 rounded border border-slate-200 shadow-sm anim-fade">
                                 <dx-select-box [items]="currentFields()" displayExpr="name" valueExpr="name" 
                                              [(value)]="cond.leftField" placeholder="Source Field" 
                                              [searchEnabled]="true" class="rf-compact-input flex-1" />
                                 
                                 <dx-select-box [items]="['=', '!=', '>', '<', '>=', '<=']" 
                                              [(value)]="cond.operator" class="rf-compact-input w-16" />

                                 <dx-select-box [items]="targetFields()" displayExpr="name" valueExpr="name" 
                                              [(value)]="cond.rightField" placeholder="Target Field" 
                                              [searchEnabled]="true" class="rf-compact-input flex-1" />

                                 <button (click)="r.conditions.splice($index, 1)" 
                                         class="w-8 h-8 flex items-center justify-center rounded hover:bg-red-50 text-slate-400 hover:text-red-500">
                                    <i class="dx-icon-trash"></i>
                                 </button>
                              </div>
                           }
                           
                           @if (r.conditions.length === 0) {
                              <div class="text-center py-6 border-2 border-dashed border-slate-100 rounded-xl">
                                 <p class="text-[10px] font-bold text-slate-300 uppercase italic">No conditions defined</p>
                              </div>
                           }
                        </div>
                     </div>
                 }
              </div>
              <div class="px-5 py-3 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
                 <button class="rf-compact-btn-ghost" (click)="isRelationshipPopupVisible.set(false)">CANCEL</button>
                 <button class="rf-compact-btn-primary px-6" (click)="applyRelationshipChanges()">ESTABLISH LINK</button>
              </div>
           </dx-validation-group>
        </div>
      </div>

      <!-- Bulk Import Modal -->
      <dx-popup
         [visible]="isBulkImportVisible()"
         [width]="600" [height]="'auto'" [maxHeight]="'80vh'"
         [showTitle]="false" [dragEnabled]="false" [showCloseButton]="false"
         (onHiding)="isBulkImportVisible.set(false)">
         <div *dxTemplate="let data of 'content'" class="flex flex-col">
            <div class="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
               <span class="text-[11px] font-black text-slate-800 uppercase tracking-widest">Entity Discovery Hub</span>
               <button (click)="isBulkImportVisible.set(false)" class="text-slate-400"><span class="material-icons text-sm">close</span></button>
            </div>
            <div class="p-6 space-y-6">
               <div class="grid grid-cols-2 gap-4">
                  <div class="space-y-1.5">
                     <label class="text-[9px] font-black text-slate-400 uppercase">Provider / Cluster</label>
                     <dx-select-box [items]="['SqlServer', 'Postgres', 'MySql']" [value]="'SqlServer'" class="compact-select" />
                  </div>
                  <div class="space-y-1.5">
                     <label class="text-[9px] font-black text-slate-400 uppercase">Database Instance</label>
                     <dx-select-box [items]="availableDatabases()" [(value)]="selectedImportDatabase" placeholder="Choose database..." class="compact-select" (onValueChanged)="onImportDbChange($event.value)" />
                  </div>
               </div>
               
               <div class="space-y-2">
                  <label class="text-[9px] font-black text-slate-400 uppercase">Physical Tables Found</label>
                  <div class="h-64 border border-slate-200 rounded-lg overflow-hidden bg-white">
                     <dx-list
                        [items]="availableTables()"
                        [showSelectionControls]="true"
                        selectionMode="multiple"
                        [(selectedItems)]="selectedImportTables"
                        class="custom-scrollbar"
                     ></dx-list>
                     @if (availableTables().length === 0 && selectedImportDatabase()) {
                        <div class="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center">
                           <span class="material-icons text-slate-100 text-5xl">manage_search</span>
                           <p class="text-[10px] font-black text-slate-300 uppercase mt-2">Scanning...</p>
                        </div>
                     }
                  </div>
               </div>
            </div>
            <div class="p-4 border-t border-slate-100 bg-white flex justify-end gap-2">
               <button class="rf-compact-btn-ghost" (click)="isBulkImportVisible.set(false)">DISCARD</button>
               <button class="rf-compact-btn-primary px-8" [disabled]="selectedImportTables().length === 0" (click)="applyBulkImport()">IMPORT {{ selectedImportTables().length }} ENTITIES</button>
            </div>
         </div>
      </dx-popup>
      
      <dx-load-panel [visible]="isSaving()" message="Syncing Schema..."></dx-load-panel>
    </div>
  `,
  styles: [`
    :host { display: block; height: 100vh; font-family: 'Inter', sans-serif; }
    ::ng-deep .dx-datagrid-content .dx-datagrid-table .dx-row > td { vertical-align: middle !important; }
    ::ng-deep .compact-select-white .dx-texteditor-container { background: #fff !important; }
    .skeleton { background: linear-gradient(90deg, #f1f5f9 25%, #f8fafc 50%, #f1f5f9 75%); background-size: 200% 100%; animation: skeleton 1.5s infinite; border-radius: 8px; }
    @keyframes skeleton { from { background-position: 200% 0; } to { background-position: -200% 0; } }
  `]
})
export class SchemaManagerComponent {
  reportService = inject(ReportService);
  notify = inject(NotificationService);
  
  searchQuery = signal('');
  isDetailLoading = signal(false);
  selectedEntityId = signal<string | null>(null);
  tabIndex = signal(0);
  isSaving = signal(false);
  dirtyEntities = signal<Set<string>>(new Set());

  isFieldPopupVisible = signal(false);
  editingField = signal<FieldMetadata | null>(null);

  isRelationshipPopupVisible = signal(false);
  editingRelationship = signal<EntityRelationship | null>(null);

  // Bulk Import Signals
  isBulkImportVisible = signal(false);
  availableDatabases = signal<string[]>([]);
  availableTables = signal<string[]>([]);
  selectedImportDatabase = signal<string>('');
  selectedImportTables = signal<string[]>([]);

  // Preview Signals
  previewData = signal<any[]>([]);
  isPreviewLoading = signal(false);

  @ViewChild('validationGroup', { static: false }) validationGroup?: DxValidationGroupComponent;
  @ViewChild('fieldValidationGroup', { static: false }) fieldValidationGroup?: DxValidationGroupComponent;
  @ViewChild('relValidationGroup', { static: false }) relValidationGroup?: DxValidationGroupComponent;

  private searchSubject = new Subject<string>();
  private destroyRef = inject(DestroyRef);

  constructor() {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(val => this.searchQuery.set(val));

    effect(() => {
      const id = this.selectedEntityId();
      if (id) {
        this.isDetailLoading.set(true);
        this.reportService.loadEntityDetail(id).subscribe({
          next: () => {
             this.isDetailLoading.set(false);
             if (this.tabIndex() === 2) this.refreshPreview();
          },
          error: () => this.isDetailLoading.set(false)
        });
      }
    });

    effect(() => {
       if (this.tabIndex() === 2 && this.selectedEntityId()) {
          this.refreshPreview();
       }
    });
  }

  onSearchChange(val: string) { this.searchSubject.next(val); }

  bulkToggleFields(entity: EntityMetadata, visible: boolean) {
     entity.fields.forEach(f => f.isVisible = visible);
     this.markDirty(entity.id);
  }
  
  tabs = [{ text: 'Schema Definition' }, { text: 'Relationships' }, { text: 'Data Preview' }];
  dataTypes = ['string', 'number', 'decimal', 'datetime', 'boolean'];
  entities = this.reportService.entities;
  
  filteredEntities = computed(() => {
    const q = this.searchQuery().toLowerCase();
    return this.entities().filter(e => e.name.toLowerCase().includes(q) || e.displayName.toLowerCase().includes(q));
  });

  selectedEntity = computed(() => {
    const id = this.selectedEntityId();
    if (!id) return null;
    const original = this.entities().find(e => e.id === id);
    if (!original) return null;
    return JSON.parse(JSON.stringify(original)) as EntityMetadata;
  });

  entityLookup = computed(() => this.entities().map(e => ({ id: e.id, displayName: e.displayName })));
  
  relationships = computed(() => {
     const id = this.selectedEntityId();
     if (!id) return [];
     return this.entities()
       .flatMap(e => e.relationships || [])
       .filter(r => !!r && (r.sourceEntityId === id || r.targetEntityId === id));
  });

   currentFields = computed(() => {
      const id = this.selectedEntityId();
      return this.entities().find(e => e.id === id)?.fields || [];
   });

   targetFields = computed(() => {
      const rel = this.editingRelationship();
      if (!rel?.targetEntityId) return [];
      return this.entities().find(e => e.id === rel.targetEntityId)?.fields || [];
   });

   getEntityName(id: string) {
      return this.entities().find(e => e.id === id)?.displayName || 'Unknown';
   }

   consistencyErrors = signal<string[]>([]);
   checkConsistency() {
      const errors: string[] = [];
      const allEntities = this.entities();
      
      allEntities.forEach(entity => {
         (entity.relationships || []).forEach(rel => {
            const target = allEntities.find(e => e.id === rel.targetEntityId);
            if (!target) {
               errors.push(`Entity '${entity.displayName}' has a link to a missing target entity.`);
               return;
            }
            
            if (rel.conditions?.length) {
               rel.conditions.forEach(c => {
                  const leftExists = entity.fields.some(f => f.name === c.leftField);
                  const rightExists = target.fields.some(f => f.name === c.rightField);
                  if (!leftExists) errors.push(`Invalid source field '${c.leftField}' in relationship between ${entity.name} and ${target.name}.`);
                  if (!rightExists) errors.push(`Invalid target field '${c.rightField}' in relationship between ${entity.name} and ${target.name}.`);
               });
            } else {
               const leftExists = entity.fields.some(f => f.name === rel.sourceField);
               const rightExists = target.fields.some(f => f.name === rel.targetField);
               if (!leftExists) errors.push(`Invalid source field '${rel.sourceField}' in relationship between ${entity.name} and ${target.name}.`);
               if (!rightExists) errors.push(`Invalid target field '${rel.targetField}' in relationship between ${entity.name} and ${target.name}.`);
            }
         });
      });
      
      this.consistencyErrors.set(errors);
      if (errors.length === 0) this.notify.success('Schema is consistent. All links verified.');
      else this.notify.warning(`Found ${errors.length} consistency issues.`);
   }

   previewFilters = signal<FilterGroup>({ id: 'preview', logic: 'AND', conditions: [], groups: [] });

   addRelCondition() {
      const rel = this.editingRelationship();
      if (!rel) return;
      if (!rel.conditions) rel.conditions = [];
      rel.conditions.push({ leftField: '', rightField: '', operator: '=' });
   }

  isDirty(entityId: string) { return this.dirtyEntities().has(entityId); }
  saveEnabled = computed(() => this.dirtyEntities().size > 0);

  loadInitialData() { this.reportService.loadEntities(); }

  onProvisionClick() {
    const result = this.validationGroup?.instance.validate();
    if (result?.isValid) {
      this.saveChanges();
    } else {
      this.notify.validationWarning('Please resolve entity metadata errors before provisioning.');
    }
  }

  onDeleteEntity(e: EntityMetadata, event: Event) {
      event.stopPropagation();
      this.confirm(`Are you sure you want to remove '${e.name}'?`, () => {
         this.reportService.deleteEntity(e.id).subscribe(() => {
            if (this.selectedEntityId() === e.id) this.selectedEntityId.set(null);
         });
      });
   }

   onDeleteRelationship(id: string) {
      this.confirm('Remove this relationship?', () => {
         this.reportService.deleteRelationship(id).subscribe();
      });
   }

   private confirm(msg: string, cb: () => void) {
      if (confirm(msg)) cb();
   }

   saveChanges() {
    const entity = this.selectedEntity();
    if (!entity) return;
    this.isSaving.set(true);
    this.reportService.saveEntityMetadata(entity).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.dirtyEntities.update(set => { set.delete(entity.id); return new Set(set); });
        this.notify.success('Schema provisioned successfully.');
      },
      error: () => this.isSaving.set(false)
    });
  }

  markDirty(entityId: string) { this.dirtyEntities.update(set => { set.add(entityId); return new Set(set); }); }

  // ── Preview Logic ───────────────────────────────────────────────────
  refreshPreview() {
     const entity = this.selectedEntity();
     if (!entity) return;
     this.isPreviewLoading.set(true);
     this.reportService.runReport({
        entity: entity.name,
        columns: entity.fields.filter(f => f.isVisible).map(f => f.name).slice(0, 15),
        filters: this.previewFilters(),
        page: 1,
        pageSize: 50
     }).subscribe({
        next: (res) => {
           this.previewData.set(res?.data || []);
           this.isPreviewLoading.set(false);
        },
        error: () => {
           this.previewData.set([]);
           this.isPreviewLoading.set(false);
        }
     });
  }

  // ── Bulk Import Logic ───────────────────────────────────────────────
  openBulkImport() {
     this.isBulkImportVisible.set(true);
     this.reportService.getAvailableDatabases('SqlServer').subscribe(dbs => this.availableDatabases.set(dbs));
  }

  onImportDbChange(db: string) {
     this.availableTables.set([]);
     this.reportService.discoverTables('SqlServer', db).subscribe(tables => this.availableTables.set(tables));
  }

  applyBulkImport() {
     const tables = this.selectedImportTables();
     const db = this.selectedImportDatabase();
     this.reportService.importTables('SqlServer', tables, db).subscribe(() => {
        this.isBulkImportVisible.set(false);
        this.selectedImportTables.set([]);
     });
  }

  // ── Relationship Logic ──────────────────────────────────────────────
  addRelationship() {
    const id = this.selectedEntityId();
    if (!id) return;
    this.editingRelationship.set({
      id: crypto.randomUUID(),
      sourceEntityId: id,
      targetEntityId: '',
      sourceField: '',
      targetField: '',
      joinType: 'INNER',
      relationType: 'OneToMany',
      conditions: []
    });
    this.isRelationshipPopupVisible.set(true);
  }

  addCondition(r: EntityRelationship) {
     if (!r.conditions) r.conditions = [];
     r.conditions.push({ leftField: '', rightField: '', operator: '=' });
  }

  removeCondition(r: EntityRelationship, idx: number) {
     r.conditions.splice(idx, 1);
  }

  openRelationshipEditor(rel: EntityRelationship) {
    this.editingRelationship.set(JSON.parse(JSON.stringify(rel)));
    this.isRelationshipPopupVisible.set(true);
  }

  applyRelationshipChanges() {
    const res = this.relValidationGroup?.instance.validate();
    if (!res?.isValid) {
      this.notify.validationWarning('Incomplete link definition. Please check keys.');
      return;
    }

    const rel = this.editingRelationship();
    const entity = this.selectedEntity();
    if (!rel || !entity) return;

    if (!entity.relationships) entity.relationships = [];
    const existingIdx = entity.relationships.findIndex(r => r.id === rel.id);
    if (existingIdx !== -1) entity.relationships[existingIdx] = rel;
    else entity.relationships.push(rel);

    this.reportService.saveEntityMetadata(entity).subscribe(() => {
      this.isRelationshipPopupVisible.set(false);
      this.loadInitialData();
      this.notify.success('Knowledge link established.');
    });
  }

  deleteRelationship(id: string) {
    const entity = this.selectedEntity();
    if (!entity) return;
    entity.relationships = (entity.relationships || []).filter(r => r.id !== id);
    this.reportService.saveEntityMetadata(entity).subscribe(() => {
      this.loadInitialData();
      this.notify.success('Link severed.');
    });
  }

  // ── Field Logic ───────────────────────────────────────────────────
  editField(field: FieldMetadata) {
    this.editingField.set(JSON.parse(JSON.stringify(field)));
    this.isFieldPopupVisible.set(true);
  }

  applyFieldChanges() {
    const res = this.fieldValidationGroup?.instance.validate();
    if (!res?.isValid) {
      this.notify.validationWarning('Please provide a valid display label.');
      return;
    }

    const edited = this.editingField();
    const entity = this.selectedEntity();
    if (!edited || !entity) return;
    const index = entity.fields.findIndex(f => f.id === edited.id);
    if (index !== -1) {
      entity.fields[index] = edited;
      this.reportService.saveEntityMetadata(entity).subscribe(() => {
        this.isFieldPopupVisible.set(false);
        this.loadInitialData();
        this.notify.success('Field configuration updated.');
      });
    }
  }
}
