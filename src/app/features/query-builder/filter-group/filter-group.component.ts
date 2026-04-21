import { Component, Input, Output, EventEmitter, signal, forwardRef } from '@angular/core';
import { trigger, style, animate, transition, query, stagger } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { FilterConditionComponent } from '../filter-condition/filter-condition.component';
import type { FilterGroup, FilterCondition, FieldMetadata } from '../../../core/models/report.models';
import { createCondition, createGroup } from '../../../core/models/report.models';

@Component({
  selector: 'rf-filter-group',
  standalone: true,
  imports: [CommonModule, FilterConditionComponent, forwardRef(() => FilterGroupComponent)],
  animations: [
    trigger('staggerList', [
      transition(':enter', [
        query('.stagger-item', [
          style({ opacity: 0, transform: 'translateX(-10px)' }),
          stagger(50, [
            animate('300ms ease-out', style({ opacity: 1, transform: 'translateX(0)' }))
          ])
        ], { optional: true })
      ])
    ])
  ],
  template: `
    <div class="flex flex-col gap-2 relative pl-6" [@staggerList]>
      <!-- Visual Vertical Connector (for everything but the last row) -->
      <div class="rf-logic-connector-v" *ngIf="group.conditions.length + group.groups.length > 1"></div>

      <!-- Conditions -->
      @for (cond of group.conditions; track cond.id; let i = $index; let first = $first; let last = $last) {
        <div class="flex items-center gap-3 stagger-item relative">
          <!-- Logic Connector Pin -->
          <div class="rf-logic-connector-h" *ngIf="!isRoot || !first"></div>
          <div class="rf-junction-node" [class.active]="cond.field" *ngIf="!isRoot || !first"></div>

          <!-- Logic Label Box -->
          <div class="w-16 h-9 flex items-center justify-center rounded bg-white border border-slate-200 text-[10px] font-bold text-slate-500 shadow-sm uppercase tracking-widest shrink-0 z-10 transition-all hover:border-brand-blue" [class.ml-[-6px]]="isRoot && first">
             <span class="opacity-70">{{ isRoot && first ? 'WHERE' : group.logic }}</span>
          </div>
          
          <!-- Condition Component -->
          <div class="rf-shaded-block flex-1 min-h-[36px] flex items-center bg-white/80 backdrop-blur-sm shadow-sm transition-all hover:bg-white hover:shadow-md border-slate-200/60">
             <rf-filter-condition
               class="flex-1"
               [condition]="cond"
               [fields]="fields"
               (onChange)="updateCondition($event)"
               (onRemove)="removeCondition($event)"
               (onDuplicate)="duplicateCondition($event)"
             />
          </div>
        </div>
      }

      <!-- Nested Groups -->
      @for (subGroup of group.groups; track subGroup.id; let i = $index; let last = $last) {
        <div class="flex gap-3 stagger-item ml-4 relative mt-2">
           <!-- Side Logic Connector -->
           <div class="rf-logic-connector-h !left-[-18px]"></div>
           <div class="rf-junction-node !left-[-22px]" [class.active]="true"></div>

           <div class="flex-1 py-1 border border-dashed border-slate-200 rounded-lg p-4 bg-slate-50/30 backdrop-blur-sm transition-all hover:bg-slate-50/60 hover:border-brand-blue/30">
             <rf-filter-group
               class="block"
               [group]="subGroup"
               [fields]="fields"
               [isRoot]="false"
               (onChange)="updateSubGroup($event)"
               (onRemoveGroup)="removeGroup($event)"
             />
             <div class="flex items-center gap-2 mt-3">
               <button class="shadcn-btn-ghost text-[9px] font-black py-1 px-3 border bg-white rounded text-muted-foreground hover:text-red-500 hover:border-red-200 transition-all" (click)="removeGroup(subGroup.id)">
                 REMOVE CRITERIA GROUP
               </button>
             </div>
           </div>
        </div>
      }

      <!-- Logic Toggle (only when there are 2+ items) -->
      @if (group.conditions.length + group.groups.length >= 2) {
        <div class="flex items-center gap-2 mt-2 ml-[76px] anim-fade">
          <span class="text-[9px] font-black text-slate-300 uppercase tracking-widest">RELATIONSHIP</span>
          <div class="flex p-0.5 bg-slate-100 rounded-md border border-slate-200">
            <button 
              class="text-[9px] font-black px-3 py-1 rounded transition-all duration-300 ease-out flex items-center gap-1.5"
              [class.bg-white]="group.logic === 'AND'"
              [class.text-brand-blue]="group.logic === 'AND'"
              [class.shadow-sm]="group.logic === 'AND'"
              [class.text-slate-400]="group.logic !== 'AND'"
              (click)="setLogic('AND')">
              <span class="material-icons text-[10px]" *ngIf="group.logic === 'AND'">link</span>
              AND
            </button>
            <button 
              class="text-[9px] font-black px-3 py-1 rounded transition-all duration-300 ease-out flex items-center gap-1.5"
              [class.bg-white]="group.logic === 'OR'"
              [class.text-brand-blue]="group.logic === 'OR'"
              [class.shadow-sm]="group.logic === 'OR'"
              [class.text-slate-400]="group.logic !== 'OR'"
              (click)="setLogic('OR')">
              <span class="material-icons text-[10px]" *ngIf="group.logic === 'OR'">alt_route</span>
              OR
            </button>
          </div>
        </div>
      }

      <!-- Quick Add Actions -->
      <div class="flex items-center gap-2 mt-2 ml-19">
         <button class="shadcn-btn-ghost text-[10px] font-bold py-1 px-3 border border-dashed rounded text-muted-foreground hover:text-brand-blue hover:border-brand-blue transition-colors" (click)="addCondition()">
            + CONDITION
         </button>
         <button class="shadcn-btn-ghost text-[10px] font-bold py-1 px-3 border border-dashed rounded text-muted-foreground hover:text-brand-blue hover:border-brand-blue transition-colors" (click)="addGroup()">
            + GROUP
         </button>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .ml-19 { margin-left: 76px; }
  `]
})
export class FilterGroupComponent {
  @Input() group!: FilterGroup;
  @Input() fields: FieldMetadata[] = [];
  @Input() isRoot = true;
  @Output() onChange = new EventEmitter<FilterGroup>();
  @Output() onRemoveGroup = new EventEmitter<string>();

  collapsed = signal(false);

  setLogic(logic: 'AND' | 'OR') {
    this.emit({ ...this.group, logic });
  }

  addCondition() {
    const newCond = createCondition();
    this.emit({ ...this.group, conditions: [...this.group.conditions, newCond] });
  }

  addGroup() {
    const newGroup = createGroup(this.group.logic);
    this.emit({ ...this.group, groups: [...this.group.groups, newGroup] });
  }

  updateCondition(updated: FilterCondition) {
    this.emit({ ...this.group, conditions: this.group.conditions.map(c => c.id === updated.id ? updated : c) });
  }

  removeCondition(id: string) {
    this.emit({ ...this.group, conditions: this.group.conditions.filter(c => c.id !== id) });
  }

  duplicateCondition(cond: FilterCondition) {
    const dup = { ...cond, id: crypto.randomUUID() };
    const idx = this.group.conditions.findIndex(c => c.id === cond.id);
    const arr = [...this.group.conditions];
    arr.splice(idx + 1, 0, dup);
    this.emit({ ...this.group, conditions: arr });
  }

  updateSubGroup(updated: FilterGroup) {
    this.emit({ ...this.group, groups: this.group.groups.map(g => g.id === updated.id ? updated : g) });
  }

  removeGroup(id: string) {
    this.emit({ ...this.group, groups: this.group.groups.filter(g => g.id !== id) });
  }

  private emit(group: FilterGroup) { this.onChange.emit(group); }
}
