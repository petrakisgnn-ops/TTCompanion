import type { ComponentType } from 'react';
import type { WidgetInstance } from '../domain/widgets/types';
import type { Character } from '../domain/character/types';

export interface WidgetProps {
  instance: WidgetInstance;
  character: Character;
}

export interface WidgetRegistration {
  typeId: string;
  label: string;
  /** Material Symbol icon name */
  icon?: string;
  defaultConfig: unknown;
  defaultSpan: 1 | 2;
  hasConfig?: boolean;
  component: ComponentType<WidgetProps>;
}

const registry = new Map<string, WidgetRegistration>();

export function registerWidget(reg: WidgetRegistration): void {
  registry.set(reg.typeId, reg);
}

export function getWidget(typeId: string): WidgetRegistration | undefined {
  return registry.get(typeId);
}

export function getAllWidgets(): WidgetRegistration[] {
  return [...registry.values()];
}
