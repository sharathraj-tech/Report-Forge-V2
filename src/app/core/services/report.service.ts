import { inject, Injectable, signal } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { catchError, map, of } from 'rxjs';
import { GET_ENTITIES, GET_ENTITY_DETAIL, GET_FIELDS, GET_REPORTS, GET_REPORT, RUN_REPORT, SAVE_REPORT, DELETE_REPORT, GET_AVAILABLE_TABLES, GET_AVAILABLE_DATABASES, GET_TABLE_COLUMNS, IMPORT_TABLE, IMPORT_TABLES, DELETE_RELATIONSHIP, DELETE_ENTITY, SAVE_ENTITY_METADATA, SAVE_RELATIONSHIP } from '../graphql/queries';
import type { EntityMetadata, FieldMetadata, QueryResult, ReportDefinition, GridDefinition, FilterGroup } from '../models/report.models';

import { NotificationService } from './notification.service';

@Injectable({ providedIn: 'root' })
export class ReportService {
  private apollo = inject(Apollo);
  private notify = inject(NotificationService);

  entities = signal<EntityMetadata[]>([]);
  isLoaded = signal<boolean>(false);
  isMetadataLoaded = signal<boolean>(false); // Used for preloader
  reports = signal<ReportDefinition[]>([]);
  activeReport = signal<ReportDefinition | null>(null);
  activeGridIndex = signal<number>(0);
  loading = signal<boolean>(false);
  error = signal<string | null>(null);
  refreshNeeded = signal<number>(0); // Incremented to trigger reloads

  loadEntities() {
    this.loading.set(true);
    this.apollo.watchQuery<{ entities: EntityMetadata[] }>({
      query: GET_ENTITIES,
      fetchPolicy: 'cache-and-network'
    }).valueChanges.pipe(
      map(r => {
        console.log('>>> REPORT_SERVICE: Raw Entities Response:', r.data);
        return r.data?.entities ?? [];
      }),
      catchError(e => {
        console.error('>>> REPORT_SERVICE: GraphQL entities error:', e);
        this.error.set((e as Error).message);
        this.notify.error('Failed to load entities: ' + (e as Error).message);
        return of([] as EntityMetadata[]);
      })
    ).subscribe({
      next: (value: any) => {
        console.log('>>> REPORT_SERVICE: Setting entities Signal:', value?.length);
        this.entities.set(value ?? []);
        this.isLoaded.set(true);
        this.isMetadataLoaded.set(true);
        this.loading.set(false);
      },
      error: (e: any) => {
        console.error('>>> REPORT_SERVICE: Subscription error:', e);
        this.error.set(e.message);
        this.loading.set(false);
      }
    });
  }

  loadEntityDetail(id: string) {
    const current = this.entities().find(e => e.id === id);
    // If fields are already loaded, don't refetch
    if (current && current.fields?.length > 0) return of(current);

    return this.apollo.query<{ entity: EntityMetadata }>({
      query: GET_ENTITY_DETAIL,
      variables: { id },
      fetchPolicy: 'cache-first'
    }).pipe(
      map(r => r.data?.entity),
      map(detail => {
        if (detail) {
          this.entities.update(list => {
            const index = list.findIndex(e => e.id === id);
            if (index !== -1) {
              const newList = [...list];
              newList[index] = detail;
              return newList;
            }
            return [...list, detail];
          });
        }
        return detail;
      })
    );
  }

  getFields(entityName: string) {
    return this.apollo.query<{ fields: FieldMetadata[] }>({
      query: GET_FIELDS,
      variables: { entity: entityName },
      fetchPolicy: 'cache-first'
    }).pipe(map(r => r.data?.fields ?? []));
  }

  getEntityFields(entityName: string): FieldMetadata[] {
    return this.entities().find(e => e.name === entityName)?.fields ?? [];
  }

  loadReports() {
    return this.apollo.watchQuery<{ reports: any[] }>({
      query: GET_REPORTS, fetchPolicy: 'network-only'
    }).valueChanges.pipe(
      map(r => (r.data?.reports ?? []).map((item: any) => this.deserializeReport(item))),
      catchError(e => { this.error.set((e as Error).message); return of([] as ReportDefinition[]); })
    );
  }

  runReport(input: {
    entity: string;
    columns?: string[];
    filters?: FilterGroup;
    groupBy?: string[];
    aggregations?: any[];
    sorts?: any[];
    joins?: any[];
    calculatedColumns?: any[];
    page?: number;
    pageSize?: number;
  }) {
    const sanitizedInput = {
      ...input,
      filters: input.filters ? this.sanitizeFilters(input.filters) : undefined
    };

    return this.apollo.query<{ runReport: QueryResult }>({
      query: RUN_REPORT,
      variables: { input: sanitizedInput },
      fetchPolicy: 'network-only'
    }).pipe(map(r => r.data?.runReport));
  }

  saveReport(report: ReportDefinition) {
    const input = {
      id: report.id || undefined,
      name: report.name,
      description: report.description,
      category: report.category,
      gridsJson: JSON.stringify(report.grids),
      chartJson: report.chart ? JSON.stringify(report.chart) : null,
      sharedFiltersJson: JSON.stringify(report.sharedFilters),
      isPublic: report.isPublic
    };
    return this.apollo.mutate<{ saveReport: any }>({
      mutation: SAVE_REPORT,
      variables: { input }
    }).pipe(
      map(r => r.data?.saveReport),
      map(report => {
        if (!report) throw new Error('No data returned from save mutation');
        this.refreshNeeded.update(n => n + 1);
        this.notify.success('Report saved successfully!');
        return report;
      }),
      catchError(err => {
        this.notify.error('Failed to save report: ' + err.message);
        throw err;
      })
    );
  }

  deleteReport(id: string) {
    return this.apollo.mutate<{ deleteReport: boolean }>({
      mutation: DELETE_REPORT,
      variables: { id }
    }).pipe(
      map(r => r.data?.deleteReport ?? false),
      map(success => {
        if (success) {
          this.refreshNeeded.update(n => n + 1);
          this.notify.success('Report deleted successfully');
        }
        return success;
      })
    );
  }

  getReport(id: string) {
    return this.apollo.query<{ report: any }>({
      query: GET_REPORT,
      variables: { id },
      fetchPolicy: 'cache-first'
    }).pipe(
      map(r => this.deserializeReport(r.data?.report))
    );
  }

  openReportById(id: string, params?: Record<string, any>) {
    this.loading.set(true);
    this.apollo.query<{ report: any }>({
      query: GET_REPORT,
      variables: { id },
      fetchPolicy: 'network-only'
    }).pipe(
      map(r => this.deserializeReport(r.data?.report)),
      catchError(e => { this.error.set((e as Error).message); return of(null); })
    ).subscribe(report => {
      if (report) {
        if (params) {
          // Merge params into shared filters
          Object.entries(params).forEach(([key, val]) => {
            report.sharedFilters.conditions.push({
              id: crypto.randomUUID(),
              field: key,
              operator: '=',
              value: val
            });
          });
        }
        this.setActiveReport(report);
      }
      this.loading.set(false);
    });
  }

  // Helper to load by ID from current list if already fetched
  openLoadedReport(id: string, params?: Record<string, any>) {
    // This assumes loadReports was already called
    this.loadReports().subscribe(reports => {
      const report = reports.find(r => r.id === id);
      if (report) {
        // Clone to avoid mutating cached list
        const cloned = JSON.parse(JSON.stringify(report)) as ReportDefinition;
        if (params) {
          Object.entries(params).forEach(([key, val]) => {
            cloned.sharedFilters.conditions.push({
              id: crypto.randomUUID(),
              field: key,
              operator: '=',
              value: val
            });
          });
        }
        this.setActiveReport(cloned);
      }
    });
  }

  setActiveReport(report: ReportDefinition) {
    this.activeReport.set({ ...report });
    this.activeGridIndex.set(0);
  }

  updateActiveGrid(index: number, grid: GridDefinition) {
    const report = this.activeReport();
    if (!report) return;
    const grids = [...report.grids];
    grids[index] = grid;
    this.activeReport.set({ ...report, grids });
  }

  addGrid(grid: GridDefinition) {
    const report = this.activeReport();
    if (!report) return;
    this.activeReport.set({ ...report, grids: [...report.grids, grid] });
    this.activeGridIndex.set(report.grids.length);
  }

  removeGrid(index: number) {
    const report = this.activeReport();
    if (!report) return;
    const grids = report.grids.filter((_: GridDefinition, i: number) => i !== index);
    this.activeReport.set({ ...report, grids });
    this.activeGridIndex.set(Math.max(0, index - 1));
  }

  private deserializeReport(raw: any): ReportDefinition {
    const grids = raw.gridsJson ? JSON.parse(raw.gridsJson) : [];

    // Robustness: Ensure all grids have initialized arrays for required properties
    const sanitizedGrids = (grids as any[]).map(g => ({
      ...g,
      columns: g.columns || [],
      columnConfigs: g.columnConfigs || {},
      groupBy: g.groupBy || [],
      aggregations: g.aggregations || [],
      sorts: g.sorts || [],
      joins: g.joins || []
    }));

    return {
      id: raw.id,
      name: raw.name,
      description: raw.description,
      category: raw.category,
      createdBy: raw.createdBy,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      isPublic: raw.isPublic,
      grids: sanitizedGrids,
      chart: raw.chartJson ? JSON.parse(raw.chartJson) : undefined,
      sharedFilters: raw.sharedFiltersJson ? JSON.parse(raw.sharedFiltersJson) : { id: '0', logic: 'AND', conditions: [], groups: [] }
    };
  }

  // ── Discovery Methods ────────────────────────────────────────────────
  getAvailableDatabases(providerKey: string) {
    return this.apollo.query<{ availableDatabases: string[] }>({
      query: GET_AVAILABLE_DATABASES,
      variables: { providerKey },
      fetchPolicy: 'network-only'
    }).pipe(map(r => r.data?.availableDatabases ?? []));
  }

  discoverTables(providerKey: string, database?: string) {
    return this.apollo.query<{ availableTables: string[] }>({
      query: GET_AVAILABLE_TABLES,
      variables: { providerKey, database },
      fetchPolicy: 'network-only'
    }).pipe(map(r => r.data?.availableTables ?? []));
  }

  importTable(providerKey: string, tableName: string, database?: string) {
    return this.apollo.mutate<{ importTable: EntityMetadata }>({
      mutation: IMPORT_TABLE,
      variables: {
        input: {
          providerKey,
          tableName,
          database,
          displayName: tableName
        }
      }
    }).pipe(
      map(r => r.data?.importTable),
      map(res => {
        this.notify.success(`Entity '${tableName}' imported successfully!`);
        this.loadEntities(); // Refresh entities list
        return res;
      }),
      catchError(err => {
        this.notify.error('Import failed: ' + err.message);
        throw err;
      })
    );
  }

  importTables(providerKey: string, tableNames: string[], database?: string) {
    const inputs = tableNames.map(name => ({ providerKey, tableName: name, displayName: name, database }));
    return this.apollo.mutate<{ importTables: EntityMetadata[] }>({
      mutation: IMPORT_TABLES,
      variables: { inputs }
    }).pipe(
      map(r => r.data?.importTables),
      map(res => {
        this.notify.success(`${tableNames.length} tables imported successfully!`);
        this.loadEntities(); 
        return res;
      }),
      catchError(err => {
        this.notify.error('Bulk import failed: ' + err.message);
        throw err;
      })
    );
  }

  saveEntityMetadata(entity: EntityMetadata) {
    return this.apollo.mutate<{ saveEntityMetadata: EntityMetadata }>({
      mutation: SAVE_ENTITY_METADATA,
      variables: {
        input: {
          id: entity.id,
          name: entity.name,
          displayName: entity.displayName,
          providerKey: entity.providerKey,
          database: entity.database,
          tableName: entity.tableName,
          schema: entity.schema,
          fields: entity.fields.map(f => ({
            id: f.id,
            name: f.name,
            displayName: f.displayName,
            dataType: f.dataType,
            isSensitive: f.isSensitive,
            isFilterable: f.isFilterable,
            isSortable: f.isSortable,
            isGroupable: f.isGroupable,
            isAggregatable: f.isAggregatable,
            isVisible: f.isVisible,
            displayOrder: f.displayOrder,
            format: f.format,
            mapConfig: f.mapConfig
          }))
        }
      }
    }).pipe(
      map(r => r.data?.saveEntityMetadata),
      map(res => {
        this.notify.success(`Entity '${entity.name}' updated!`);
        this.loadEntities();
        return res;
      })
    );
  }

  deleteEntity(id: string) {
    return this.apollo.mutate<{ deleteEntity: boolean }>({
      mutation: DELETE_ENTITY,
      variables: { id }
    }).pipe(
      map(r => r.data?.deleteEntity),
      map(res => {
        if (res) this.notify.success('Entity deleted');
        this.loadEntities();
        return res;
      })
    );
  }

  saveRelationship(input: any) {
    return this.apollo.mutate<{ saveRelationship: any }>({
      mutation: SAVE_RELATIONSHIP,
      variables: { input }
    }).pipe(
      map(r => r.data?.saveRelationship),
      map(res => {
        this.notify.success('Relationship saved');
        this.loadEntities();
        return res;
      })
    );
  }

  deleteRelationship(id: string) {
    return this.apollo.mutate<{ deleteRelationship: boolean }>({
      mutation: DELETE_RELATIONSHIP,
      variables: { id }
    }).pipe(
      map(r => r.data?.deleteRelationship),
      map(res => {
        if (res) this.notify.success('Relationship removed');
        this.loadEntities();
        return res;
      })
    );
  }

  private sanitizeFilters(group: FilterGroup): any {
    return {
      logic: group.logic,
      conditions: (group.conditions || []).map(c => ({
        field: c.field,
        operator: c.operator,
        value: c.value,
        values: c.values
      })),
      groups: (group.groups || []).map(g => this.sanitizeFilters(g))
    };
  }
}
