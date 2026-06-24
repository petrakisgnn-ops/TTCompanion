export type AppRole = 'player' | 'dm';
export type WidgetTypeId = string;

export interface WidgetInstance<C = unknown> {
  id: string;
  type: WidgetTypeId;
  config: C;
  span: 1 | 2;
  order: number;
}

export interface DashboardLayout {
  widgets: WidgetInstance[];
}
