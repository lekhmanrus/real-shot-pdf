export interface PageTreeNodeModel {
  name: string;
  value: string;
  isChecked: boolean;
  isDisabled?: boolean;
  children?: PageTreeNodeModel[];
}
