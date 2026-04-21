import { Injectable, inject, signal } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { map } from 'rxjs/operators';
import type { Dashboard, DashboardWidget } from '../models/dashboard.models';

const GET_DASHBOARDS = gql`
  query GetDashboards {
    dashboards {
      id name description category isPublic
      widgets { id reportId title type x y width height }
    }
  }
`;

const SAVE_DASHBOARD = gql`
  mutation SaveDashboard($input: DashboardInput!) {
    saveDashboard(input: $input) {
      id name
    }
  }
`;

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private apollo = inject(Apollo);
  
  dashboards = signal<Dashboard[]>([]);
  activeDashboard = signal<Dashboard | null>(null);
  loading = signal(false);

  loadDashboards() {
    this.loading.set(true);
    return this.apollo.query<{ dashboards: Dashboard[] }>({
      query: GET_DASHBOARDS,
      fetchPolicy: 'network-only'
    }).pipe(
      map(res => res.data?.dashboards || [])
    ).subscribe(list => {
      this.dashboards.set(list);
      this.loading.set(false);
    });
  }

  saveDashboard(dashboard: Dashboard) {
    this.loading.set(true);
    const input = {
      id: dashboard.id,
      name: dashboard.name,
      description: dashboard.description,
      category: dashboard.category,
      isPublic: dashboard.isPublic,
      widgets: dashboard.widgets.map(w => ({
        id: w.id.includes('-') ? w.id : null, // handle new vs existing
        reportId: w.reportId,
        title: w.title,
        type: w.type,
        x: w.x,
        y: w.y,
        width: w.width,
        height: w.height,
        settingsJson: w.settingsJson
      }))
    };

    return this.apollo.mutate({
      mutation: SAVE_DASHBOARD,
      variables: { input }
    }).pipe(
      map(res => {
        this.loading.set(false);
        this.loadDashboards();
        return res.data;
      })
    );
  }
}
