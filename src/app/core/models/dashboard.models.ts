export interface DashboardWidget {
  id: string;
  reportId: string;
  title: string;
  type: 'grid' | 'chart' | 'pivot';
  x: number;      // 0-100 percentage
  y: number;      // 0-100 percentage
  width: number;  // 0-100 percentage
  height: number; // 0-100 percentage
  settingsJson?: string;
}

export interface Dashboard {
  id: string;
  name: string;
  description?: string;
  category?: string;
  widgets: DashboardWidget[];
  isPublic: boolean;
  createdBy?: string;
}
