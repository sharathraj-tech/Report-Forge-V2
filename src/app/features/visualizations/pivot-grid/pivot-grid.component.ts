import { Component, Input, OnChanges, SimpleChanges, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DxPivotGridModule } from 'devextreme-angular';
import PivotGridDataSource from 'devextreme/ui/pivot_grid/data_source';

@Component({
  selector: 'app-pivot-grid',
  standalone: true,
  imports: [CommonModule, DxPivotGridModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="h-full flex flex-col bg-white overflow-hidden anim-fade" *ngIf="data && data.length > 0; else noData">
      <div class="flex-1 overflow-hidden p-1">
        <dx-pivot-grid
          [dataSource]="pivotDataSource"
          [allowSortingBySummary]="true"
          [allowFiltering]="true"
          [showBorders]="false"
          [showColumnGrandTotals]="true"
          [showRowGrandTotals]="true"
          [showRowTotals]="true"
          [showColumnTotals]="true"
          [height]="'100%'"
          class="rf-pivot-slate"
        >
          <dxo-field-chooser [enabled]="true" [height]="500" [layout]="0"></dxo-field-chooser>
          <dxo-scrolling mode="virtual"></dxo-scrolling>
          <dxo-export [enabled]="true"></dxo-export>
        </dx-pivot-grid>
      </div>
    </div>

    <ng-template #noData>
      <div class="h-full flex flex-col items-center justify-center gap-6 bg-slate-50/50 anim-fade">
        <div class="w-16 h-16 rounded-[2rem] bg-white border border-slate-100 shadow-sm flex items-center justify-center">
           <span class="material-icons text-slate-200 text-3xl">pivot_table_chart</span>
        </div>
        <div class="text-center">
          <h3 class="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">Pivot Engine Idle</h3>
          <p class="text-[10px] font-bold text-slate-400 uppercase mt-2 opacity-60">Generate a result set to activate multidimensional analysis.</p>
        </div>
      </div>
    </ng-template>
  `,
  styles: [`
    :host { display: block; height: 100%; width: 100%; }
    ::ng-deep .rf-pivot-slate .dx-pivotgrid { background-color: transparent !important; }
    ::ng-deep .rf-pivot-slate .dx-pivotgrid-area { border-color: #f1f5f9 !important; }
    ::ng-deep .rf-pivot-slate .dx-area-field-content { font-family: 'Inter', sans-serif !important; font-size: 11px !important; font-weight: 600 !important; color: #475569 !important; }
    ::ng-deep .rf-pivot-slate .dx-grandtotal { font-weight: 800 !important; color: #0f172a !important; background-color: #f8fafc !important; }
    ::ng-deep .rf-pivot-slate .dx-total { font-weight: 700 !important; }
  `]
})
export class PivotGridComponent implements OnChanges {
  @Input() data: any[] = [];
  @Input() fields: any[] = [];

  pivotDataSource: any;

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['data'] || changes['fields']) && this.data) {
      this.updateDataSource();
    }
  }

  private updateDataSource() {
    this.pivotDataSource = new PivotGridDataSource({
      store: this.data,
      fields: this.fields.length > 0 ? this.fields : this.autoGenerateFields()
    });
  }

  private autoGenerateFields() {
    if (!this.data || this.data.length === 0) return [];
    
    const keys = Object.keys(this.data[0]);
    return keys.map(key => {
      const val = this.data[0][key];
      const isNum = typeof val === 'number';
      
      return {
        dataField: key,
        caption: key.replace(/([A-Z])/g, ' $1').toUpperCase(),
        area: isNum ? 'data' : 'row',
        summaryType: isNum ? 'sum' : 'count',
        format: isNum ? { type: 'fixedPoint', precision: 2 } : undefined
      };
    });
  }
}
