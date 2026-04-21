import { Component, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DxDataGridModule, DxTabsModule, DxButtonModule, DxPopupModule, DxFormModule, DxSelectBoxModule, DxTextBoxModule, DxCheckBoxModule, DxTextAreaModule, DxScrollViewModule, DxLoadPanelModule } from 'devextreme-angular';
import { ReportService } from '../../core/services/report.service';
import type { EntityMetadata, FieldMetadata, EntityRelationship } from '../../core/models/report.models';
import { SchemaDiscoveryComponent } from '../developer/schema-discovery.component';

@Component({
  selector: 'rf-schema-manager',
  standalone: true,
  imports: [
    CommonModule, FormsModule, DxDataGridModule, DxTabsModule, DxButtonModule, 
    DxPopupModule, DxFormModule, DxSelectBoxModule, DxTextBoxModule, DxCheckBoxModule,
    DxTextAreaModule, DxScrollViewModule, DxLoadPanelModule, SchemaDiscoveryComponent
  ],
  template: `
    <div class="h-full flex flex-col bg-slate-50/50 overflow-hidden">
      <!-- Compact Header -->
      <header class="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shadow-sm z-20">
        <div class="flex items-center gap-4">
            <div class="p-2 bg-indigo-600 rounded-xl shadow-md shadow-indigo-100 relative overflow-hidden group">
               <span class="material-icons text-white relative z-10 text-xl leading-none">account_tree</span>
               <div class="absolute inset-0 bg-gradient-to-tr from-black/10 to-transparent"></div>
            </div>
            <div>
               <h1 class="text-xl font-black text-slate-900 tracking-tight leading-none">Schema Manager</h1>
               <div class="flex items-center gap-2 mt-1">
                  <span class="flex h-1.5 w-1.5 relative">
                    <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span class="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                  </span>
                  <span class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Enterprise Plane</span>
               </div>
            </div>
        </div>

        <div class="flex items-center gap-2">
           <button class="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors group" (click)="loadInitialData()">
              <span class="material-icons text-slate-400 group-hover:rotate-180 transition-transform duration-500 text-lg">refresh</span>
           </button>
           <button 
             class="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold flex items-center gap-2 px-5 h-9 rounded-xl transition-all active:scale-95"
             (click)="isDiscoveryPopupVisible.set(true)"
           >
              <span class="material-icons text-base">manage_search</span>
              <span class="text-xs">DISCOVER</span>
           </button>
           <button 
             class="bg-slate-800 hover:bg-slate-900 text-emerald-400 font-bold flex items-center gap-2 px-5 h-9 rounded-xl shadow-sm transition-all active:scale-95"
             (click)="generateSqlPreview()"
           >
              <span class="material-icons text-base text-emerald-400">code</span>
              <span class="text-xs">SQL PREVIEW</span>
           </button>
           <button 
             class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center gap-2 px-5 h-9 rounded-xl shadow-sm transition-all active:scale-95 disabled:opacity-50"
             [disabled]="!saveEnabled()"
             (click)="saveChanges()"
           >
              <span class="material-icons text-base">cloud_upload</span>
              <span class="text-xs">PROVISION</span>
           </button>
        </div>
      </header>

      <div class="flex-1 flex overflow-hidden">
        <!-- Compact Sidebar -->
        <aside class="w-72 bg-white border-r border-slate-200 flex flex-col shadow-sm z-10">
          <div class="p-3 border-b bg-slate-50/30">
             <div class="relative group">
                <span class="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors z-10 text-base">search</span>
                <input 
                  type="text" 
                  [(ngModel)]="searchQuery"
                  placeholder="Filter..." 
                  class="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none"
                />
             </div>
          </div>

          <div class="flex-1 overflow-y-auto p-2 flex flex-col gap-1 custom-scrollbar">
             @for (e of filteredEntities(); track e.id) {
               <div class="px-1">
                 <button 
                   (click)="selectedEntityId.set(e.id)"
                   class="w-full text-left p-2.5 rounded-xl transition-all flex items-center justify-between group relative overflow-hidden"
                   [class]="selectedEntityId() === e.id ? 'bg-indigo-600 shadow-md' : 'hover:bg-slate-50'"
                 >
                   <div class="flex flex-col gap-0.5 z-10">
                      <span class="text-[12px] font-bold tracking-tight" [class.text-white]="selectedEntityId() === e.id" [class.text-slate-700]="selectedEntityId() !== e.id">{{ e.displayName || e.name }}</span>
                      <span class="text-[8px] font-mono uppercase opacity-60" [class.text-indigo-100]="selectedEntityId() === e.id" [class.text-slate-400]="selectedEntityId() !== e.id">{{ e.tableName }}</span>
                   </div>
                   
                   @if (isDirty(e.id)) {
                     <span class="w-1.5 h-1.5 rounded-full absolute top-3 right-3 z-10" [class.bg-white]="selectedEntityId() === e.id" [class.bg-amber-400]="selectedEntityId() !== e.id"></span>
                   }
                 </button>
               </div>
             }
          </div>
        </aside>

        <!-- Main Content -->
        <main class="flex-1 flex flex-col overflow-hidden">
          <!-- Compact Tabs -->
          <div class="bg-white border-b px-6 pt-1 shadow-sm relative z-10">
             <dx-tabs
               [dataSource]="tabs"
               [(selectedIndex)]="tabIndex"
               class="compact-tabs"
             ></dx-tabs>
          </div>

          <div class="flex-1 relative">
            <dx-scroll-view width="100%" height="100%" class="modern-scroll-view">
              <div class="p-6 pb-20">
                <!-- Entity Details / Fields Tab -->
                @if (tabIndex() === 0) {
                  @if (selectedEntity(); as e) {
                    <div class="max-w-6xl mx-auto flex flex-col gap-6">
                       <!-- Compact Meta Stats -->
                       <div class="grid grid-cols-4 gap-4">
                          @for (stat of [
                            { label: 'Provider', value: e.providerKey, icon: 'storage', color: 'blue' },
                            { label: 'Table', value: e.tableName, icon: 'table_chart', color: 'indigo' },
                            { label: 'Columns', value: e.fields.length, icon: 'format_list_numbered', color: 'amber' },
                            { label: 'Relations', value: e.relationships.length, icon: 'share_arrival_time', color: 'emerald' }
                          ]; track $index) {
                            <div class="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
                               <div class="w-9 h-9 rounded-xl flex items-center justify-center" [class]="'bg-' + stat.color + '-50 text-' + stat.color + '-600'">
                                  <span class="material-icons text-base">{{ stat.icon }}</span>
                               </div>
                               <div>
                                  <span class="text-[8px] font-black text-slate-400 uppercase tracking-widest block">{{ stat.label }}</span>
                                  <span class="text-xs font-black text-slate-800">{{ stat.value }}</span>
                               </div>
                            </div>
                          }
                       </div>

                       <!-- Compact Settings -->
                       <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col gap-6">
                          <div class="flex items-center justify-between">
                             <h3 class="text-sm font-black text-slate-800 uppercase tracking-widest">Metadata Config</h3>
                             <div class="flex items-center gap-3">
                                <dx-check-box [(value)]="e.isActive" (onValueChanged)="markDirty(e.id)" class="modern-checkbox-sm"></dx-check-box>
                                <span class="text-[10px] font-bold text-slate-500 uppercase">{{ e.isActive ? 'Active' : 'Inactive' }}</span>
                             </div>
                          </div>

                          <div class="grid grid-cols-3 gap-6">
                             <div class="flex flex-col gap-1.5">
                                <label class="text-[9px] font-black text-slate-400 uppercase ml-1">Display Label</label>
                                <input 
                                  type="text" 
                                  [(ngModel)]="e.displayName" 
                                  class="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-indigo-600 focus:ring-2 focus:ring-indigo-500/10 transition-all outline-none"
                                  (change)="markDirty(e.id)"
                                />
                             </div>
                             <div class="col-span-2 flex flex-col gap-1.5">
                                <label class="text-[9px] font-black text-slate-400 uppercase ml-1">Description</label>
                                <input 
                                  type="text" 
                                  [(ngModel)]="e.description" 
                                  placeholder="Dataset purpose..."
                                  class="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs text-slate-600 focus:ring-2 focus:ring-indigo-500/10 transition-all outline-none"
                                  (change)="markDirty(e.id)"
                                />
                             </div>
                          </div>
                       </div>

                       <!-- Compact Fields Grid -->
                       <div class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                         <div class="px-6 py-3 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                            <h3 class="text-[10px] font-black text-slate-600 uppercase tracking-widest">Schema Mapping ({{ e.fields.length }})</h3>
                            <button class="text-[9px] font-black text-indigo-600 hover:underline uppercase">Sync</button>
                         </div>
                         
                         <div class="h-[500px]">
                            <dx-data-grid
                              [dataSource]="e.fields"
                              [height]="'100%'"
                              [showBorders]="false"
                              [columnAutoWidth]="true"
                              class="premium-grid compact-grid"
                            >
                              <dxo-editing mode="cell" [allowUpdating]="true"></dxo-editing>
                              <dxo-scrolling mode="virtual"></dxo-scrolling>
                              
                              <dxi-column dataField="name" [allowEditing]="false" caption="SOURCE" [width]="150" cellTemplate="nameTemplate"></dxi-column>
                              <dxi-column dataField="displayName" caption="LABEL"></dxi-column>
                              <dxi-column dataField="dataType" caption="TYPE" [width]="90" cellTemplate="typeTemplate">
                                 <dxo-lookup [dataSource]="dataTypes"></dxo-lookup>
                              </dxi-column>
                              <dxi-column dataField="isVisible" caption="VIS" [width]="50" dataType="boolean"></dxi-column>
                              <dxi-column dataField="isFilterable" caption="FILT" [width]="50" dataType="boolean"></dxi-column>
                              <dxi-column dataField="isAggregatable" caption="AGG" [width]="50" dataType="boolean"></dxi-column>
                              <dxi-column [width]="60" [allowEditing]="false" cellTemplate="actionsTemplate"></dxi-column>

                              <div *dxTemplate="let d of 'nameTemplate'" class="font-mono text-[10px] text-slate-400">{{ d.value }}</div>
                              <div *dxTemplate="let d of 'typeTemplate'">
                                 <span class="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter"
                                   [class.bg-blue-100]="d.value === 'string'" [class.text-blue-700]="d.value === 'string'"
                                   [class.bg-amber-100]="d.value === 'number' || d.value === 'decimal'" [class.text-amber-700]="d.value === 'number'"
                                   [class.bg-emerald-100]="d.value === 'datetime'" [class.text-emerald-700]="d.value === 'datetime'">
                                   {{ d.value }}
                                 </span>
                              </div>
                              <div *dxTemplate="let d of 'actionsTemplate'">
                                 <button class="w-6 h-6 flex items-center justify-center hover:bg-slate-100 rounded text-slate-400 hover:text-indigo-600 transition-all font-bold" (click)="editField(d.data)">
                                    <span class="material-icons text-sm">settings</span>
                                 </button>
                              </div>
                            </dx-data-grid>
                         </div>
                       </div>
                    </div>
                  }
                }

                <!-- Compact Relationships -->
                @if (tabIndex() === 1) {
                  <div class="max-w-6xl mx-auto flex flex-col gap-6">
                     <div class="flex items-center justify-between px-2">
                        <div>
                           <h2 class="text-sm font-black text-slate-900 tracking-tight uppercase">Relationship Hub</h2>
                           <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Connect physical entities</p>
                        </div>
                        <button class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-8 px-5 rounded-xl text-[10px] shadow-sm flex items-center gap-2" (click)="addRelationship()">
                           <span class="material-icons text-sm">add</span> NEW LINK
                        </button>
                     </div>

                     <div class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden h-[600px]">
                        <dx-data-grid
                           [dataSource]="relationships()"
                           [height]="'100%'"
                           [showBorders]="false"
                           class="premium-grid compact-grid"
                        >
                           <dxo-editing mode="row" [allowUpdating]="false" [allowDeleting]="true"></dxo-editing>
                           <dxi-column dataField="sourceEntityId" [groupIndex]="0">
                              <dxo-lookup [dataSource]="entityLookup()" valueExpr="id" displayExpr="displayName"></dxo-lookup>
                           </dxi-column>
                           <dxi-column dataField="targetEntityId" caption="TARGET ENTITY">
                              <dxo-lookup [dataSource]="entityLookup()" valueExpr="id" displayExpr="displayName"></dxo-lookup>
                           </dxi-column>
                           <dxi-column dataField="conditions" caption="JOIN KEY" cellTemplate="condTemplate"></dxi-column>
                           <dxi-column dataField="joinType" caption="TYPE" [width]="80"></dxi-column>
                           <dxi-column [width]="80" cellTemplate="relActionsTemplate"></dxi-column>

                           <div *dxTemplate="let d of 'condTemplate'">
                              <div class="flex flex-wrap gap-1">
                                 @for (c of d.data.conditions; track $index) {
                                    <span class="bg-slate-50 px-1.5 py-0.5 rounded text-[9px] border border-slate-100 font-mono text-slate-500">
                                       {{ c.leftField }} = {{ c.rightField }}
                                    </span>
                                 }
                              </div>
                           </div>
                           <div *dxTemplate="let d of 'relActionsTemplate'">
                              <div class="flex items-center gap-1">
                                 <button class="w-6 h-6 flex items-center justify-center hover:bg-indigo-50 rounded text-slate-400 hover:text-indigo-600 transition-all font-bold" (click)="openRelationshipEditor(d.data)">
                                    <span class="material-icons text-xs">edit</span>
                                 </button>
                                 <button class="w-6 h-6 flex items-center justify-center hover:bg-red-50 rounded text-slate-400 hover:text-red-500 transition-all font-bold" (click)="deleteRelationship(d.data.id)">
                                    <span class="material-icons text-xs">delete</span>
                                 </button>
                              </div>
                           </div>
                        </dx-data-grid>
                     </div>
                  </div>
                }
              </div>
            </dx-scroll-view>
          </div>
        </main>
      </div>

      <dx-load-panel [visible]="isSaving()" message="Syncing..."></dx-load-panel>

      <!-- Compact Popups -->
      <dx-popup [(visible)]="isFieldPopupVisible" [width]="450" [height]="'auto'" [showTitle]="false" [dragEnabled]="true" class="compact-popup">
        <div *dxTemplate="let data of 'content'" class="p-6">
           @if (editingField(); as field) {
              <div class="flex flex-col gap-6">
                 <div class="flex items-center gap-3">
                    <span class="material-icons text-indigo-600">settings_input_component</span>
                    <h3 class="text-base font-black text-slate-900 tracking-tight">Field Config</h3>
                 </div>
                 <dx-form [formData]="field" labelLocation="top" class="compact-form">
                    <dxi-item dataField="displayName" label="Label" [editorOptions]="{ stylingMode: 'outlined' }"></dxi-item>
                    <dxi-item dataField="dataType" editorType="dxSelectBox" [editorOptions]="{ items: dataTypes }"></dxi-item>
                    <dxi-item itemType="group" [colCount]="3">
                       <dxi-item dataField="isVisible" editorType="dxCheckBox" label="Vis"></dxi-item>
                       <dxi-item dataField="isFilterable" editorType="dxCheckBox" label="Filt"></dxi-item>
                       <dxi-item dataField="isSensitive" editorType="dxCheckBox" label="PII"></dxi-item>
                    </dxi-item>
                 </dx-form>
                 <div class="flex justify-end gap-2 pt-4 border-t">
                    <button (click)="isFieldPopupVisible.set(false)" class="px-4 py-2 text-xs font-bold text-slate-500">Cancel</button>
                    <button (click)="applyFieldChanges()" class="bg-indigo-600 text-white font-bold px-5 py-2 rounded-xl text-xs">Apply</button>
                 </div>
              </div>
           }
        </div>
      </dx-popup>

      <dx-popup [(visible)]="isRelPopupVisible" [width]="550" [height]="'auto'" [showTitle]="false" class="compact-popup">
        <div *dxTemplate="let data of 'content'" class="p-6">
           @if (editingRelationship(); as rel) {
              <div class="flex flex-col gap-6">
                 <div class="flex items-center gap-3">
                    <span class="material-icons text-indigo-600">hub</span>
                    <h3 class="text-base font-black text-slate-900 tracking-tight text-uppercase">Relationship Builder</h3>
                 </div>
                 <div class="grid grid-cols-2 gap-4">
                    <dx-select-box [items]="entityLookup()" displayExpr="displayName" valueExpr="id" [(value)]="rel.sourceEntityId" [readOnly]="true" class="compact-select"></dx-select-box>
                    <dx-select-box [items]="entityLookup()" displayExpr="displayName" valueExpr="id" [(value)]="rel.targetEntityId" placeholder="Target..." class="compact-select"></dx-select-box>
                 </div>
                 <div class="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <div class="flex items-center justify-between mb-3 text-[10px] font-black text-slate-400">
                       <span>JOIN KEYS</span>
                       <button (click)="addCondition()" class="text-indigo-600">+ ADD</button>
                    </div>
                    <div class="flex flex-col gap-2 max-h-40 overflow-y-auto custom-scrollbar">
                       @for (c of rel.conditions; track $index) {
                          <div class="grid grid-cols-[1fr_20px_1fr_30px] items-center gap-2">
                             <dx-select-box [items]="sourceFields()" displayExpr="displayName" valueExpr="name" [(value)]="c.leftField"></dx-select-box>
                             <span class="text-center font-bold text-slate-300">=</span>
                             <dx-select-box [items]="targetFields()" displayExpr="displayName" valueExpr="name" [(value)]="c.rightField"></dx-select-box>
                             <button (click)="removeCondition($index)" class="text-slate-300 hover:text-red-500 material-icons text-sm">delete</button>
                          </div>
                       }
                    </div>
                 </div>
                 <div class="grid grid-cols-2 gap-4">
                    <dx-select-box [items]="['OneToMany', 'ManyToOne', 'OneToOne']" [(value)]="rel.relationType" class="compact-select"></dx-select-box>
                    <dx-select-box [items]="['INNER', 'LEFT', 'RIGHT']" [(value)]="rel.joinType" class="compact-select"></dx-select-box>
                 </div>
                 <div class="flex justify-end gap-2 pt-4 border-t">
                    <button (click)="isRelPopupVisible.set(false)" class="px-4 py-2 text-xs font-bold text-slate-500">Cancel</button>
                    <button (click)="applyRelChanges()" class="bg-indigo-600 text-white font-bold px-6 py-2 rounded-xl text-xs">Establish Link</button>
                 </div>
              </div>
           }
        </div>
      </dx-popup>

      <dx-popup [(visible)]="isDiscoveryPopupVisible" [width]="900" [height]="650" [showTitle]="false" [showCloseButton]="true" class="compact-popup">
        <div *dxTemplate="let data of 'content'" class="p-0 h-full flex flex-col bg-slate-50/50">
           <div class="flex items-center justify-between p-4 border-b bg-white">
              <div class="flex items-center gap-3">
                 <div class="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-sm">
                    <span class="material-icons text-white text-base">explore</span>
                 </div>
                 <div>
                    <h3 class="text-sm font-black text-slate-900 tracking-tight leading-none uppercase">Schema Discovery</h3>
                    <p class="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Onboard new datasets remotely</p>
                 </div>
              </div>
              <button (click)="isDiscoveryPopupVisible.set(false)" class="w-8 h-8 flex items-center justify-center hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors">
                 <span class="material-icons text-lg">close</span>
              </button>
           </div>
           <div class="flex-1 overflow-hidden">
             <rf-schema-discovery></rf-schema-discovery>
           </div>
        </div>
      </dx-popup>

      <dx-popup [(visible)]="isSqlPopupVisible" [width]="700" [height]="500" [showTitle]="false" [showCloseButton]="true" class="compact-popup">
        <div *dxTemplate="let data of 'content'" class="p-0 h-full flex flex-col bg-slate-900">
           <div class="flex items-center justify-between p-4 border-b border-slate-700 bg-slate-800">
              <div class="flex items-center gap-3">
                 <div class="w-8 h-8 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center">
                    <span class="material-icons text-emerald-400 text-base">code</span>
                 </div>
                 <div>
                    <h3 class="text-sm font-black text-white tracking-tight leading-none uppercase">Final SQL Preview</h3>
                    <p class="text-[9px] text-emerald-400 font-bold uppercase tracking-widest mt-0.5">Dynamically generated graph</p>
                 </div>
              </div>
              <button (click)="isSqlPopupVisible.set(false)" class="w-8 h-8 flex items-center justify-center hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors">
                 <span class="material-icons text-lg">close</span>
              </button>
           </div>
           <div class="flex-1 p-4 overflow-auto custom-scrollbar">
              <pre class="text-[11px] font-mono text-indigo-200 leading-relaxed">{{ sqlPreviewContent() }}</pre>
           </div>
        </div>
      </dx-popup>
    </div>
  `,
  styles: [`
    :host { display: block; height: 100vh; overflow: hidden; font-family: 'Inter', sans-serif; font-size: 13px; }
    
    .compact-tabs { height: 40px; }
    .compact-tabs ::ng-deep .dx-tab { 
      background: transparent !important; 
      color: #94a3b8 !important; 
      border: none !important; 
      font-size: 11px !important; 
      font-weight: 800 !important; 
      text-transform: uppercase !important;
      letter-spacing: 0.05em !important;
      padding: 0 16px !important;
    }
    .compact-tabs ::ng-deep .dx-tab-selected { 
       color: #4f46e5 !important; 
       box-shadow: inset 0 -2px 0 #4f46e5 !important;
    }
    
    .custom-scrollbar::-webkit-scrollbar,
    .modern-scroll-view ::ng-deep .dx-scrollable-content::-webkit-scrollbar { width: 6px; height: 6px; }
    .custom-scrollbar::-webkit-scrollbar-track,
    .modern-scroll-view ::ng-deep .dx-scrollable-content::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb,
    .modern-scroll-view ::ng-deep .dx-scrollable-content::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }

    ::ng-deep .compact-grid .dx-datagrid-headers { 
       color: #94a3b8 !important;
       font-weight: 800 !important;
       font-size: 9px !important;
       text-transform: uppercase !important;
       border-bottom: 1px solid #f1f5f9 !important;
    }
    ::ng-deep .compact-grid .dx-datagrid-rowsview .dx-row { 
       background-color: white !important;
       border-bottom: 1px solid #f1f5f9 !important; 
    }
    ::ng-deep .compact-grid .dx-datagrid-rowsview .dx-data-row td { 
       padding: 8px 12px !important; 
       font-size: 12px !important;
    }

    .modern-checkbox-sm ::ng-deep .dx-checkbox-icon {
       width: 18px;
       height: 18px;
       border-radius: 6px;
    }

    ::ng-deep .dx-popup-content { border-radius: 16px; }
    ::ng-deep .dx-overlay-content { border-radius: 16px !important; }
  `]
})
export class SchemaManagerComponent {
  reportService = inject(ReportService);
  
  searchQuery = '';
  selectedEntityId = signal<string | null>(null);
  tabIndex = signal(0);
  isSaving = signal(false);
  dirtyEntities = signal<Set<string>>(new Set());
  
  isFieldPopupVisible = signal(false);
  isRelPopupVisible = signal(false);
  isDiscoveryPopupVisible = signal(false);
  isSqlPopupVisible = signal(false);
  
  editingField = signal<FieldMetadata | null>(null);
  editingRelationship = signal<any | null>(null);
  sqlPreviewContent = signal<string>('');

  tabs = [
    { text: 'Fields', icon: 'list' },
    { text: 'Mappings', icon: 'link' }
  ];

  dataTypes = ['string', 'number', 'decimal', 'datetime', 'boolean'];
  entities = this.reportService.entities;
  
  filteredEntities = computed(() => {
    const q = this.searchQuery.toLowerCase();
    return this.entities().filter(e => 
      e.name.toLowerCase().includes(q) || e.displayName.toLowerCase().includes(q)
    );
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
       .flatMap(e => e.relationships)
       .filter(r => r.sourceEntityId === id || r.targetEntityId === id);
  });

  isDirty(entityId: string) {
    return this.dirtyEntities().has(entityId);
  }

  saveEnabled = computed(() => this.dirtyEntities().size > 0);

  sourceFields = computed(() => {
    const rel = this.editingRelationship();
    if (!rel || !rel.sourceEntityId) return [];
    const ent = this.entities().find(e => e.id === rel.sourceEntityId);
    return ent?.fields || [];
  });

  targetFields = computed(() => {
    const rel = this.editingRelationship();
    if (!rel || !rel.targetEntityId) return [];
    const ent = this.entities().find(e => e.id === rel.targetEntityId);
    return ent?.fields || [];
  });

  loadInitialData() {
    this.reportService.loadEntities();
  }

  saveChanges() {
    const entity = this.selectedEntity();
    if (!entity) return;
    this.isSaving.set(true);
    this.reportService.saveEntityMetadata(entity).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.dirtyEntities.update(set => {
          set.delete(entity.id);
          return new Set(set);
        });
      },
      error: () => this.isSaving.set(false)
    });
  }

  generateSqlPreview() {
    const ents = this.entities().filter(e => e.isActive);
    if (!ents.length) {
       this.sqlPreviewContent.set('-- No active entities found in the semantic layer.');
       this.isSqlPopupVisible.set(true);
       return;
    }

    let sql = 'SELECT\n';
    const columns: string[] = [];
    ents.forEach(e => {
       const activeFields = e.fields.filter(f => f.isVisible && !f.isSensitive);
       activeFields.forEach(f => {
          columns.push(`  [${e.tableName}].[${f.name}] AS [${(f.displayName || f.name).replace(/ /g, '_')}]`);
       });
    });
    sql += columns.length > 0 ? columns.join(',\n') : '  *';
    
    const baseEntity = ents[0];
    sql += `\nFROM [${baseEntity.schema || 'dbo'}].[${baseEntity.tableName}] AS [${baseEntity.tableName}]`;

    const processed = new Set([baseEntity.id]);
    const allRels = this.entities().flatMap(e => e.relationships);
    
    let added = true;
    while(added) {
       added = false;
       for (const rel of allRels) {
          const isSourceProcessed = processed.has(rel.sourceEntityId);
          const isTargetProcessed = processed.has(rel.targetEntityId);
          
          if (isSourceProcessed && !isTargetProcessed) {
             const targetEnt = ents.find(e => e.id === rel.targetEntityId);
             const sourceEnt = ents.find(e => e.id === rel.sourceEntityId);
             if (targetEnt && sourceEnt) {
                const joinConditions = rel.conditions?.map((c: any) => `[${sourceEnt.tableName}].[${c.leftField}] ${c.operator || '='} [${targetEnt.tableName}].[${c.rightField}]`).join(' AND ') || '1=1';
                sql += `\n${rel.joinType || 'LEFT'} JOIN [${targetEnt.schema || 'dbo'}].[${targetEnt.tableName}] AS [${targetEnt.tableName}] ON ${joinConditions}`;
                processed.add(rel.targetEntityId);
                added = true;
             }
          } else if (!isSourceProcessed && isTargetProcessed) {
             const sourceEnt = ents.find(e => e.id === rel.sourceEntityId);
             const targetEnt = ents.find(e => e.id === rel.targetEntityId);
             if (sourceEnt && targetEnt) {
                 const joinConditions = rel.conditions?.map((c: any) => `[${sourceEnt.tableName}].[${c.leftField}] ${c.operator || '='} [${targetEnt.tableName}].[${c.rightField}]`).join(' AND ') || '1=1';
                 sql += `\n${rel.joinType || 'LEFT'} JOIN [${sourceEnt.schema || 'dbo'}].[${sourceEnt.tableName}] AS [${sourceEnt.tableName}] ON ${joinConditions}`;
                 processed.add(rel.sourceEntityId);
                 added = true;
             }
          }
       }
    }

    ents.filter(e => !processed.has(e.id)).forEach(e => {
        sql += `\n-- UNJOINED ENTITY: [${e.schema || 'dbo'}].[${e.tableName}]`;
    });

    this.sqlPreviewContent.set(sql);
    this.isSqlPopupVisible.set(true);
  }

  markDirty(entityId: string) {
    this.dirtyEntities.update(set => {
      set.add(entityId);
      return new Set(set);
    });
  }

  editField(field: FieldMetadata) {
    this.editingField.set(JSON.parse(JSON.stringify(field)));
    this.isFieldPopupVisible.set(true);
  }

  applyFieldChanges() {
    const edited = this.editingField();
    const entity = this.selectedEntity();
    if (!edited || !entity) return;
    const index = entity.fields.findIndex(f => f.id === edited.id);
    if (index !== -1) {
      entity.fields[index] = edited;
      this.reportService.saveEntityMetadata(entity).subscribe(() => {
        this.isFieldPopupVisible.set(false);
        this.loadInitialData();
      });
    }
  }

  addRelationship() {
    this.openRelationshipEditor();
  }

  openRelationshipEditor(rel?: any) {
    if (rel) {
      const clone = JSON.parse(JSON.stringify(rel));
      if (!clone.conditions) clone.conditions = [];
      this.editingRelationship.set(clone);
    } else {
      this.editingRelationship.set({
        id: '',
        sourceEntityId: this.selectedEntityId(),
        targetEntityId: '',
        relationType: 'OneToMany',
        joinType: 'LEFT',
        conditions: [{ leftField: '', rightField: '', operator: '=' }]
      });
    }
    this.isRelPopupVisible.set(true);
  }

  addCondition() {
    this.editingRelationship.update(rel => ({
      ...rel,
      conditions: [...(rel.conditions || []), { leftField: '', rightField: '', operator: '=' }]
    }));
  }

  removeCondition(index: number) {
    this.editingRelationship.update(rel => ({
      ...rel,
      conditions: rel.conditions.filter((_: any, i: number) => i !== index)
    }));
  }

  deleteRelationship(id: string) {
    this.reportService.deleteRelationship(id).subscribe(() => {
       this.loadInitialData();
    });
  }

  applyRelChanges() {
     const rel = this.editingRelationship();
     if (!rel) return;
     if (rel.conditions && rel.conditions.length > 0) {
        rel.sourceField = rel.conditions[0].leftField;
        rel.targetField = rel.conditions[0].rightField;
     }
     this.reportService.saveRelationship(rel).subscribe(() => {
        this.isRelPopupVisible.set(false);
        this.loadInitialData();
     });
  }

  refreshRelSignal() {
    this.editingRelationship.update(v => ({ ...v }));
  }
}
