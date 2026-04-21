import { gql } from 'apollo-angular';

export const GET_ENTITIES = gql`
  query GetEntities {
    entities {
      id name displayName providerKey database tableName schema description
      fields {
        id name displayName dataType
        isSensitive isFilterable isSortable isGroupable isAggregatable isVisible
        format hasMapping mapConfig
      }
      relationships {
        id sourceEntityId targetEntityId sourceField targetField relationType joinType
        sourceEntityName targetEntityName
        conditions { leftField rightField operator }
      }
    }
  }
`;

export const SAVE_ENTITY_METADATA = gql`
  mutation SaveEntityMetadata($input: SaveEntityInput!) {
    saveEntityMetadata(input: $input) {
      id name displayName
    }
  }
`;

export const DELETE_ENTITY = gql`
  mutation DeleteEntity($id: String!) {
    deleteEntity(id: $id)
  }
`;

export const SAVE_RELATIONSHIP = gql`
  mutation SaveRelationship($input: SaveRelationshipInput!) {
    saveRelationship(input: $input) {
      id sourceEntityId targetEntityId
      conditions { leftField rightField operator }
    }
  }
`;

export const DELETE_RELATIONSHIP = gql`
  mutation DeleteRelationship($id: String!) {
    deleteRelationship(id: $id)
  }
`;

export const GET_RELATIONSHIPS = gql`
  query GetRelationships($entityId: String) {
    relationships(entityId: $entityId) {
      id sourceEntityId targetEntityId sourceField targetField relationType joinType
      sourceEntityName targetEntityName
      conditions { leftField rightField operator }
    }
  }
`;


export const GET_FIELDS = gql`
  query GetFields($entity: String!) {
    fields(entity: $entity) {
      id name displayName dataType
      isSensitive isFilterable isSortable isGroupable isAggregatable
      format hasMapping mapConfig
    }
  }
`;

export const GET_REPORTS = gql`
  query GetReports {
    reports {
      id name description category createdBy createdAt updatedAt isPublic
      gridsJson chartJson drillDownJson sharedFiltersJson
    }
  }
`;

export const GET_REPORT = gql`
  query GetReport($id: String!) {
    report(id: $id) {
      id name description category createdBy createdAt updatedAt isPublic
      gridsJson chartJson drillDownJson sharedFiltersJson
    }
  }
`;

export const RUN_REPORT = gql`
  query RunReport($input: RunReportInput!) {
    runReport(input: $input) {
      data totalCount page pageSize totalPages
      hasNextPage executionTimeMs fromCache warnings
    }
  }
`;

export const SAVE_REPORT = gql`
  mutation SaveReport($input: SaveReportInput!) {
    saveReport(input: $input) {
      id name description category createdAt updatedAt isPublic
    }
  }
`;

export const DELETE_REPORT = gql`
  mutation DeleteReport($id: String!) {
    deleteReport(id: $id)
  }
`;
export const GET_AVAILABLE_TABLES = gql`
  query GetAvailableTables($providerKey: String!, $database: String) {
    availableTables(providerKey: $providerKey, database: $database)
  }
`;

export const GET_AVAILABLE_DATABASES = gql`
  query GetAvailableDatabases($providerKey: String!) {
    availableDatabases(providerKey: $providerKey)
  }
`;

export const GET_TABLE_COLUMNS = gql`
  query GetTableColumns($providerKey: String!, $tableName: String!, $database: String) {
    tableColumns(providerKey: $providerKey, tableName: $tableName, database: $database)
  }
`;

export const IMPORT_TABLE = gql`
  mutation ImportTable($input: ImportTableInput!) {
    importTable(input: $input) {
      id name displayName providerKey database
    }
  }
`;
