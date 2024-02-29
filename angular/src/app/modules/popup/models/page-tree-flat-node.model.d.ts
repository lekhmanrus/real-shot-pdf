export interface PageTreeFlatNodeModel {
  name: string;
  value: string;
  isChecked: boolean;
  isDisabled: boolean;
  level: number;
  childCount: number;
  isExpandable: boolean;
}
