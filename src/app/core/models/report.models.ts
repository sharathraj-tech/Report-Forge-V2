// Core domain models mirroring backend contracts

export type DataType = 'string' | 'int' | 'decimal' | 'datetime' | 'bool';
export type Operator = '=' | '!=' | '>' | '>=' | '<' | '<=' | 'contains' | 'startsWith' | 'in' | 'notIn' | 'isNull' | 'isNotNull';
export type Logic = 'AND' | 'OR';
export type AggFunction = 'SUM' | 'COUNT' | 'AVG' | 'MIN' | 'MAX' | 'COUNT_DISTINCT';
export type SortDir = 'ASC' | 'DESC';
export type ChartType = 'bar' | 'line' | 'pie' | 'area' | 'scatter' | 'spline' | 'horizontalBar';
export type ProviderKey = 'SqlServer' | 'Postgres' | 'MySql';

export interface FieldMetadata {
  id: string;
  name: string;
  displayName: string;
  dataType: DataType;
  isSensitive: boolean;
  isFilterable: boolean;
  isSortable: boolean;
  isGroupable: boolean;
  isAggregatable: boolean;
  isVisible: boolean;
  displayOrder: number;
  format?: string;
  hasMapping: boolean;
  mapConfig?: string;
}

export interface JoinCondition {
  leftField: string;
  rightField: string;
  operator: string;
}

export interface EntityRelationship {
  id: string;
  sourceEntityId: string;
  targetEntityId: string;
  sourceField: string;
  targetField: string;
  relationType: 'OneToMany' | 'ManyToOne' | 'OneToOne';
  joinType: 'INNER' | 'LEFT' | 'RIGHT';
  sourceEntityName?: string;
  targetEntityName?: string;
  conditions: JoinCondition[];
}


export interface EntityMetadata {
  id: string;
  name: string;
  displayName: string;
  providerKey: ProviderKey;
  database?: string;
  tableName: string;
  schema: string;
  isActive: boolean;
  description?: string;
  fields: FieldMetadata[];
  relationships: EntityRelationship[];
}


export interface FilterCondition {
  id: string;           // client-side only for React key / tracking
  field: string;
  operator: Operator;
  value?: string | number | boolean | null;
  values?: string[];
}

export interface FilterGroup {
  id: string;
  logic: Logic;
  conditions: FilterCondition[];
  groups: FilterGroup[];
  collapsed?: boolean;
}

export interface AggregationSpec {
  field: string;
  function: AggFunction;
  alias?: string;
}

export interface SortSpec {
  field: string;
  direction: SortDir;
}

export interface DrillDownConfig {
  targetReportId: string;
  mappings: Record<string, string>;
}

export interface JoinDefinition {
  targetEntity: string;
  joinType: 'INNER' | 'LEFT' | 'RIGHT';
  onClause: string;
  alias?: string;
  leftTable?: string;
  leftField?: string;  // Legacy
  rightField?: string; // Legacy
  conditions?: JoinCondition[];
}

export interface CalculatedColumn {
  id: string;
  alias: string;
  expression: string;
}

export interface FormattingRule {
  id: string;
  operator: Operator;
  value: any;
  color?: string;
  background?: string;
}

export interface ColumnConfig {
  width?: number;
  visible: boolean;
  align: 'left' | 'center' | 'right';
  format?: string;
  headerName?: string;
  formattingRules?: FormattingRule[];
}

export interface GridDefinition {
  id: string;
  title: string;
  entity: string;
  columns: string[];
  columnConfigs: Record<string, ColumnConfig>;
  calculatedColumns?: CalculatedColumn[];
  filters?: FilterGroup;
  groupBy: string[];
  aggregations: AggregationSpec[];
  sorts: SortSpec[];
  joins: JoinDefinition[];
  drillDown?: DrillDownConfig;
  activeView: 'grid' | 'chart' | 'pivot';
}

export interface ChartDefinition {
  type: ChartType;
  xAxis: string;
  yAxis: string;
  aggregation: AggFunction;
  groupBy?: string;
  title?: string;
  color?: string;
  palette?: string;
  showLabels?: boolean;
  isStacked?: boolean;
}

export interface ReportDefinition {
  id: string;
  name: string;
  description?: string;
  category: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  isPublic: boolean;
  isFavorite?: boolean;
  grids: GridDefinition[];
  chart?: ChartDefinition;
  sharedFilters: FilterGroup;
}

export interface QueryResult {
  data: Record<string, unknown>[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  executionTimeMs: number;
  fromCache: boolean;
  warnings: string[];
}

export interface OperatorDef {
  value: Operator;
  label: string;
  types: DataType[];
  multi?: boolean;
  noValue?: boolean;
}

export const OPERATORS: OperatorDef[] = [
  { value: '=', label: 'Equals', types: ['string', 'int', 'decimal', 'datetime', 'bool'] },
  { value: '!=', label: 'Not Equals', types: ['string', 'int', 'decimal', 'datetime'] },
  { value: '>', label: 'Greater Than', types: ['int', 'decimal', 'datetime'] },
  { value: '>=', label: 'Greater or Equal', types: ['int', 'decimal', 'datetime'] },
  { value: '<', label: 'Less Than', types: ['int', 'decimal', 'datetime'] },
  { value: '<=', label: 'Less or Equal', types: ['int', 'decimal', 'datetime'] },
  { value: 'contains', label: 'Contains', types: ['string'] },
  { value: 'startsWith', label: 'Starts With', types: ['string'] },
  { value: 'in', label: 'In (list)', types: ['string', 'int'], multi: true },
  { value: 'notIn', label: 'Not In', types: ['string', 'int'], multi: true },
  { value: 'isNull', label: 'Is Empty', types: ['string', 'int', 'decimal', 'datetime'], noValue: true },
  { value: 'isNotNull', label: 'Is Not Empty', types: ['string', 'int', 'decimal', 'datetime'], noValue: true },
];

export const AGG_FUNCTIONS: { value: AggFunction; label: string }[] = [
  { value: 'SUM', label: 'Sum' },
  { value: 'COUNT', label: 'Count' },
  { value: 'AVG', label: 'Average' },
  { value: 'MIN', label: 'Minimum' },
  { value: 'MAX', label: 'Maximum' },
  { value: 'COUNT_DISTINCT', label: 'Count Distinct' },
];

export const CHART_TYPES: { value: ChartType; label: string; icon: string }[] = [
  { value: 'bar', label: 'Bar Chart', icon: '📊' },
  { value: 'line', label: 'Line Chart', icon: '📈' },
  { value: 'pie', label: 'Pie Chart', icon: '🥧' },
  { value: 'area', label: 'Area Chart', icon: '📉' },
  { value: 'scatter', label: 'Scatter Plot', icon: '⚡' },
];

// Factory helpers
export function createCondition(field = '', operator: Operator = '='): FilterCondition {
  return { id: crypto.randomUUID(), field, operator, value: null };
}

export function createGroup(logic: Logic = 'AND'): FilterGroup {
  return { id: crypto.randomUUID(), logic, conditions: [], groups: [] };
}

export function defaultReport(): ReportDefinition {
  return {
    id: '',
    name: 'Untitled Report',
    description: '',
    category: 'General',
    createdBy: '',
    createdAt: '',
    updatedAt: '',
    isPublic: false,
    grids: [],
    sharedFilters: createGroup()
  };
}

export function defaultGrid(entity = ''): GridDefinition {
  return {
    id: crypto.randomUUID(),
    title: 'Grid ' + Math.floor(Math.random() * 1000),
    entity,
    columns: [],
    columnConfigs: {},
    groupBy: [],
    aggregations: [],
    sorts: [],
    joins: [],
    activeView: 'grid'
  };
}
