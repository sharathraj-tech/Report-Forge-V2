import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DxPivotGridModule } from 'devextreme-angular';
import PivotGridDataSource from 'devextreme/ui/pivot_grid/data_source';

@Component({
  selector: 'app-pivot-grid',
  standalone: true,
  imports: [CommonModule, DxPivotGridModule],
  template: `
    <div class="pivot-wrapper anim-fade-in" *ngIf="data && data.length > 0; else noData">
      <dx-pivot-grid
        [dataSource]="pivotDataSource"
        [allowSortingBySummary]="true"
        [allowFiltering]="true"
        [showBorders]="true"
        [showColumnGrandTotals]="true"
        [showRowGrandTotals]="true"
        [showRowTotals]="true"
        [showColumnTotals]="true">
        <dxo-field-chooser [enabled]="true" [height]="400"></dxo-field-chooser>
        <dxo-export [enabled]="true"></dxo-export>
      </dx-pivot-grid>
    </div>

    <ng-template #noData>
      <div class="empty-state">
        <span class="material-icons">architecture</span>
        <div class="empty-title">No Data for Pivot</div>
        <div class="empty-desc">Run a query to populate the pivot engine.</div>
      </div>
    </ng-template>
  `,
  styles: [`
    :host { display: block; height: 100%; width: 100%; overflow: hidden; }
    .pivot-wrapper { height: 100%; padding: var(--space-4); background: var(--bg-surface); }
    dx-pivot-grid { height: 100%; width: 100%; }
  `]
})
export class PivotGridComponent implements OnChanges {
  @Input() data: any[] = [];
  @Input() fields: any[] = []; // Initial mapping if provided

  pivotDataSource: any;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data'] && this.data) {
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
        caption: key,
        area: isNum ? 'data' : 'row',
        summaryType: isNum ? 'sum' : 'count',
        format: isNum ? 'fixedPoint' : undefined
      };
    });
  }
}
