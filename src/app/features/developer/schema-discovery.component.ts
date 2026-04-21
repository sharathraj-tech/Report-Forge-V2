import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DxSelectBoxModule, DxListModule, DxLoadPanelModule } from 'devextreme-angular';
import { ReportService } from '../../core/services/report.service';

@Component({
  selector: 'rf-schema-discovery',
  standalone: true,
  imports: [CommonModule, DxSelectBoxModule, DxListModule, DxLoadPanelModule],
  template: `
    <div class="flex flex-col bg-white">
      <div class="px-5 py-4 border-b flex flex-col gap-4 bg-slate-50/50">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-sm">
            <span class="material-icons text-white text-base">database</span>
          </div>
          <div>
            <h2 class="text-sm font-black text-slate-800 tracking-tight leading-tight uppercase">Catalog Explorer</h2>
            <p class="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Onboard Entities</p>
          </div>
        </div>
        
        <div class="grid grid-cols-2 gap-4">
          <div class="flex flex-col gap-1">
            <span class="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Provider</span>
            <dx-select-box
              [items]="providers"
              [(value)]="selectedProvider"
              placeholder="Source..."
              class="compact-select"
              (onValueChanged)="onProviderChanged()" />
          </div>

          <div class="flex flex-col gap-1">
            <span class="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Database</span>
            <dx-select-box
              [items]="databases()"
              [(value)]="selectedDatabase"
              [disabled]="!databases().length"
              placeholder="DB..."
              class="compact-select"
              (onValueChanged)="scanTables()" />
          </div>
        </div>

        <div class="flex flex-col gap-3 pt-3 border-t border-slate-100">
           <div class="flex items-center justify-between">
              <div class="flex items-center gap-1 -ml-1">
                 <button class="text-[9px] font-black uppercase text-indigo-600 hover:bg-indigo-50 px-2 py-1 rounded transition-colors" (click)="selectAll()" [disabled]="!tables().length">Select All</button>
                 <span class="text-slate-300">•</span>
                 <button class="text-[9px] font-black uppercase text-slate-500 hover:bg-slate-50 px-2 py-1 rounded transition-colors" (click)="selectedTables.set([])" [disabled]="!selectedTables().length">Clear</button>
              </div>
              <span class="text-[8px] font-black text-slate-400 uppercase tracking-widest"><span class="text-indigo-600">{{ selectedTables().length }}</span> / {{ tables().length }} Objects</span>
           </div>
           
           <div class="flex items-center gap-2">
             <button 
                class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-7 px-4 rounded-lg shadow-sm transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2 flex-1 justify-center"
                [disabled]="!selectedTables().length || importing()"
                (click)="importSelected()">
                <span class="material-icons text-[11px]">cloud_download</span>
                <span class="text-[9px] uppercase tracking-wider font-black">SYNC {{ selectedTables().length }} TABLES</span>
             </button>
             <button class="w-8 h-8 flex items-center justify-center hover:bg-slate-200 rounded-lg transition-all border border-slate-200 shrink-0" (click)="scanTables()">
                <span class="material-icons text-slate-500 text-sm" [class.animate-spin]="loading()">refresh</span>
             </button>
           </div>
        </div>
      </div>

      <div class="p-2 h-[450px] overflow-hidden flex flex-col">
         <dx-list
            [items]="tables()"
            [searchEnabled]="true"
            searchExpr="this"
            class="compact-discovery-list flex-1"
            [height]="'100%'"
            selectionMode="multiple"
            [(selectedItems)]="selectedTables">
            <div *dxTemplate="let item of 'item'" class="flex items-center justify-between p-2 my-1 group rounded-xl transition-all border border-transparent hover:border-indigo-100 hover:bg-indigo-50/50">
               <div class="flex items-center gap-2.5">
                 <div class="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center group-hover:bg-white transition-colors">
                   <span class="material-icons text-slate-400 text-sm group-hover:text-indigo-500">{{ item.includes('.') ? 'table_view' : 'fact_check' }}</span>
                 </div>
                 <div class="flex flex-col">
                    <span class="text-[11px] font-bold text-slate-700">{{ item }}</span>
                 </div>
               </div>
               
               <button class="h-6 px-3 rounded-md text-[8px] font-black tracking-widest transition-all" 
                  [class]="isImported(item) ? 'bg-emerald-50 text-emerald-600' : 'bg-white text-indigo-600 border border-indigo-100 hover:bg-indigo-600 hover:text-white'"
                  [disabled]="isImported(item)"
                  (click)="importTable(item)">
                  {{ isImported(item) ? 'SYNCED' : 'ADD' }}
               </button>
            </div>
         </dx-list>
      </div>

      <dx-load-panel [visible]="importing()" message="Syncing..." [showPane]="false"></dx-load-panel>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .compact-discovery-list { background: transparent !important; }
    ::ng-deep .compact-discovery-list .dx-list-item { border: none !important; padding: 0 !important; cursor: pointer; }
    ::ng-deep .compact-discovery-list .dx-list-item-selected { background: transparent !important; }
    
    ::ng-deep .compact-select .dx-texteditor-input {
       padding: 8px 12px !important;
       font-size: 11px !important;
       font-weight: 700 !important;
    }
    ::ng-deep .compact-select {
       border-radius: 8px !important;
       background: white !important;
       border: 1px solid #e2e8f0 !important;
    }

    ::ng-deep .compact-discovery-list .dx-scrollable-content::-webkit-scrollbar { width: 4px; }
    ::ng-deep .compact-discovery-list .dx-scrollable-content::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
  `]
})
export class SchemaDiscoveryComponent {
  private svc = inject(ReportService);
  
  providers = ['SqlServer', 'Postgres', 'MySql'];
  selectedProvider = '';
  selectedDatabase = '';
  
  databases = signal<string[]>([]);
  tables = signal<string[]>([]);
  selectedTables = signal<string[]>([]);
  loading = signal(false);
  importing = signal(false);

  onProviderChanged() {
    if (!this.selectedProvider) return;
    this.databases.set([]);
    this.tables.set([]);
    this.selectedDatabase = '';
    this.loading.set(true);
    this.svc.getAvailableDatabases(this.selectedProvider).subscribe({
      next: (dbs) => {
        this.databases.set(dbs);
        this.loading.set(false);
        if (dbs.length > 0) {
          this.selectedDatabase = dbs[0];
          this.scanTables();
        }
      },
      error: () => this.loading.set(false)
    });
  }

  scanTables() {
    if (!this.selectedProvider) return;
    this.loading.set(true);
    this.svc.discoverTables(this.selectedProvider, this.selectedDatabase).subscribe({
      next: (ts) => {
        this.tables.set(ts);
        this.selectedTables.set([]);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  selectAll() {
    const unimported = this.tables().filter(t => !this.isImported(t));
    this.selectedTables.set(unimported);
  }

  importSelected() {
    const list = this.selectedTables();
    if (!list.length) return;
    this.importing.set(true);
    let count = 0;
    list.forEach(table => {
       this.svc.importTable(this.selectedProvider, table, this.selectedDatabase).subscribe({
          next: () => {
             count++;
             if (count === list.length) {
                this.importing.set(false);
                this.selectedTables.set([]);
             }
          }
       });
    });
  }

  isImported(table: string) {
    return this.svc.entities().some(e => e.tableName === table && e.providerKey === this.selectedProvider && e.database === this.selectedDatabase);
  }

  importTable(table: string) {
    this.importing.set(true);
    this.svc.importTable(this.selectedProvider, table, this.selectedDatabase).subscribe({
      next: () => this.importing.set(false),
      error: () => this.importing.set(false)
    });
  }
}
