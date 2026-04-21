import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DxSelectBoxModule, DxTextBoxModule, DxNumberBoxModule, DxTagBoxModule, DxDateBoxModule } from 'devextreme-angular';
import type { FilterCondition, FieldMetadata, DataType, Operator } from '../../../core/models/report.models';
import { OPERATORS } from '../../../core/models/report.models';

@Component({
  selector: 'rf-filter-condition',
  standalone: true,
  imports: [CommonModule, DxSelectBoxModule, DxTextBoxModule, DxNumberBoxModule, DxTagBoxModule, DxDateBoxModule],
  template: `
    <div class="flex items-center gap-2 group w-full">
      <!-- Field selector -->
      <dx-select-box
        class="cond-field"
        [items]="fields"
        displayExpr="displayName"
        valueExpr="name"
        [value]="condition.field"
        placeholder="Select field..."
        [searchEnabled]="true"
        (onValueChanged)="onFieldChange($event)"
      />

      <!-- Operator selector -->
      <dx-select-box
        class="cond-op"
        [items]="availableOperators"
        displayExpr="label"
        valueExpr="value"
        [value]="condition.operator"
        (onValueChanged)="onOperatorChange($event)"
      />

      <!-- Value input (dynamic by type) -->
      <div class="flex-1 flex min-w-0">
        @switch (valueInputType) {
          @case ('lookup') {
            <dx-select-box
              class="w-full"
              [items]="lookupItems"
              displayExpr="label"
              valueExpr="value"
              [value]="condition.value"
              [searchEnabled]="true"
              placeholder="Select..."
              (onValueChanged)="onValueChange($event.value)"
            />
          }
          @case ('text') {
            <dx-text-box
              class="w-full"
              [value]="stringValue"
              placeholder="Value..."
              (onValueChanged)="onValueChange($event.value)"
            />
          }
          @case ('number') {
            <dx-number-box
              class="w-full"
              [value]="numberValue"
              placeholder="0"
              (onValueChanged)="onValueChange($event.value)"
            />
          }
          @case ('date') {
            <dx-date-box
              class="w-full"
              [value]="dateValue"
              displayFormat="yyyy-MM-dd"
              (onValueChanged)="onValueChange($event.value)"
            />
          }
          @case ('multi') {
            <dx-tag-box
              class="w-full"
              [dataSource]="lookupItems.length > 0 ? lookupItems : []"
              [displayExpr]="lookupItems.length > 0 ? 'label' : ''"
              [valueExpr]="lookupItems.length > 0 ? 'value' : ''"
              [value]="condition.values ?? []"
              [acceptCustomValue]="lookupItems.length === 0"
              placeholder="Add values..."
              (onValueChanged)="onMultiValueChange($event.value)"
            />
          }
          @case ('none') {
            <span class="text-[11px] font-medium text-muted-foreground italic px-2">No value needed</span>
          }
          @default {
            <dx-text-box class="w-full" placeholder="Value..." (onValueChanged)="onValueChange($event.value)" />
          }
        }
      </div>

      <!-- Actions (Visible on group hover) -->
      <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button class="shadcn-btn-ghost w-7 h-7 p-0 text-slate-400 hover:text-brand-blue" title="Duplicate" (click)="onDuplicate.emit(condition)">
           <span class="material-icons text-sm">content_copy</span>
        </button>
        <button class="shadcn-btn-ghost w-7 h-7 p-0 text-slate-400 hover:text-destructive hover:bg-destructive/5" title="Remove" (click)="onRemove.emit(condition.id)">
           <span class="material-icons text-sm">close</span>
        </button>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; width: 100%; }
    .cond-field { width: 160px; }
    .cond-op { width: 140px; }
  `]
})
export class FilterConditionComponent {
  @Input() condition!: FilterCondition;
  @Input() fields: FieldMetadata[] = [];
  @Input() isDragging = false;

  @Output() onRemove    = new EventEmitter<string>();
  @Output() onDuplicate = new EventEmitter<FilterCondition>();
  @Output() onChange    = new EventEmitter<FilterCondition>();

  get selectedField(): FieldMetadata | undefined {
    return this.fields.find(f => f.name === this.condition.field);
  }

  get availableOperators() {
    const dt = (this.selectedField?.dataType ?? 'string') as DataType;
    return OPERATORS.filter(op => op.types.includes(dt));
  }

  get valueInputType(): 'text' | 'number' | 'date' | 'multi' | 'none' | 'lookup' {
    const op = OPERATORS.find(o => o.value === this.condition.operator);
    if (op?.noValue) return 'none';
    if (this.lookupItems.length > 0) {
       return op?.multi ? 'multi' : 'lookup';
    }
    if (op?.multi) return 'multi';
    const dt = this.selectedField?.dataType;
    if (dt === 'datetime') return 'date';
    if (dt === 'int' || dt === 'decimal') return 'number';
    return 'text';
  }

  get lookupItems(): { label: string, value: any }[] {
    const field = this.selectedField;
    if (!field?.hasMapping || !field.mapConfig) return [];
    try {
      const config = JSON.parse(field.mapConfig);
      if (config.type === 'Static' && config.values) {
        return Object.entries(config.values).map(([val, label]) => ({
          label: label as string,
          value: val
        }));
      }
    } catch (e) {
      console.warn('Failed to parse field mapping:', e);
    }
    return [];
  }

  get stringValue(): string { return this.condition.value?.toString() ?? ''; }
  get numberValue(): number { return Number(this.condition.value ?? 0); }
  get dateValue(): Date | null {
    return this.condition.value ? new Date(this.condition.value as string) : null;
  }

  onFieldChange(e: any) {
    this.emit({ ...this.condition, field: e.value, value: null, values: undefined });
  }
  onOperatorChange(e: any) {
    this.emit({ ...this.condition, operator: e.value as Operator, value: null, values: undefined });
  }
  onValueChange(value: any) {
    this.emit({ ...this.condition, value });
  }
  onMultiValueChange(values: string[]) {
    this.emit({ ...this.condition, values });
  }
  private emit(c: FilterCondition) { this.onChange.emit(c); }
}
