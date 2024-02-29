import { ChangeDetectorRef, Component, model } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { FlatTreeControl } from '@angular/cdk/tree';
import { MatTreeFlatDataSource, MatTreeFlattener } from '@angular/material/tree';
import { PageTreeNodeModel } from '../../../models/page-tree-node.model';
import { PageTreeFlatNodeModel } from '../../../models/page-tree-flat-node.model';
import { PageDatabaseService } from '../../../services/page-database.service';
import { delay, filter, first, tap } from 'rxjs/operators';

@Component({
  selector: 'rsp-page-tree',
  templateUrl: 'page-tree.component.html',
  styleUrl: 'page-tree.component.scss'
})
export class PageTreeComponent {
  public readonly value = model.required<PageTreeFlatNodeModel[]>();
  public readonly treeControl: FlatTreeControl<PageTreeFlatNodeModel>;
  public readonly dataSource: MatTreeFlatDataSource<PageTreeNodeModel, PageTreeFlatNodeModel>;
  public readonly hasChild = (_: number, node: PageTreeFlatNodeModel) => node.isExpandable;
  private readonly _getLevel = (node: PageTreeFlatNodeModel) => node.level;
  private readonly _isExpandable = (node: PageTreeFlatNodeModel) => node.isExpandable;
  private readonly _getChildren = (node: PageTreeNodeModel): PageTreeNodeModel[] => node.children;
  private readonly _transformer = (node: PageTreeNodeModel, level: number) => {
    const existingNode = this._nestedNodeMap.get(node);
    const flatNode = existingNode && existingNode.value === node.value
      ? existingNode
      : { name: '', value: '', isChecked: false } as PageTreeFlatNodeModel;
    flatNode.name = node.name;
    flatNode.value = node.value;
    flatNode.childCount = this._pageDatabaseService.getChildCount(node);
    flatNode.level = level;
    flatNode.isChecked = node.isChecked;
    flatNode.isDisabled = Boolean(node.isDisabled);
    flatNode.isExpandable = Boolean(node.children?.length);
    this._flatNodeMap.set(flatNode, node);
    this._nestedNodeMap.set(node, flatNode);
    return flatNode;
  }
  private readonly _flatNodeMap = new Map<PageTreeFlatNodeModel, PageTreeNodeModel>();
  private readonly _nestedNodeMap = new Map<PageTreeNodeModel, PageTreeFlatNodeModel>();
  private readonly _treeFlattener = new MatTreeFlattener(
    this._transformer,
    this._getLevel,
    this._isExpandable,
    this._getChildren
  );

  constructor(
    private readonly _changeDetectorRef: ChangeDetectorRef,
    private readonly _pageDatabaseService: PageDatabaseService
  ) {
    this.treeControl = new FlatTreeControl<PageTreeFlatNodeModel>(
      this._getLevel,
      this._isExpandable
    );
    this.dataSource = new MatTreeFlatDataSource(this.treeControl, this._treeFlattener);
    _pageDatabaseService.dataChange
      .pipe(
        delay(125),
        filter(() => Boolean(this.treeControl.dataNodes?.find((node) => node.isChecked))),
        first(),
        tap(() => this._update()),
        takeUntilDestroyed()
      )
      .subscribe();
    _pageDatabaseService.dataChange
      .pipe(
        tap((nodes) => this.dataSource.data = nodes),
        takeUntilDestroyed()
      )
      .subscribe();
    toObservable(this.value)
      .pipe(
        tap((nodes) => {
          let shouldNotify = false;
          for (const node of nodes) {
            if (this._saveNode(node)) {
              shouldNotify = true;
            }
          }
          if (shouldNotify) {
            this._update();
          } else {
            _pageDatabaseService.update();
          }
        }),
        tap(() => setTimeout(() => _changeDetectorRef.detectChanges(), 0)),
        takeUntilDestroyed()
      )
      .subscribe();
  }

  public areAllDescendantsSelected(node: PageTreeFlatNodeModel): boolean {
    const descendants = this.treeControl.getDescendants(node);
    const areAllDescendantsSelected = descendants
      .every((child) => child.isChecked);
    return areAllDescendantsSelected;
  }

  public areAllDescendantsDisabled(node: PageTreeFlatNodeModel): boolean {
    const descendants = this.treeControl.getDescendants(node);
    const areAllDescendantsDisabled = descendants.every((child) => child.isDisabled);
    return areAllDescendantsDisabled;
  }

  public getDescendantsSelectedCount(node: PageTreeFlatNodeModel): number {
    const descendants = this.treeControl.getDescendants(node);
    const selectedDescendants = descendants
      .filter((child) => !child.isExpandable && child.isChecked);
    return selectedDescendants.length;
  }

  public areDescendantsPartiallySelected(node: PageTreeFlatNodeModel): boolean {
    const areDescendantsPartiallySelected = this.getDescendantsSelectedCount(node) > 0;
    return areDescendantsPartiallySelected && !this.areAllDescendantsSelected(node);
  }

  public toggleParentSelection(node: PageTreeFlatNodeModel): void {
    node.isChecked = !node.isChecked;
    const descendants = this.treeControl.getDescendants(node).filter((child) => !child.isDisabled);
    for (const descendant of descendants) {
      if (!descendant.isDisabled) {
        descendant.isChecked = node.isChecked;
        this._saveNode(descendant);
      }
    }
    this._checkAllParentsSelection(node);
    this._saveNode(node);
    this._update();
  }

  public toggleItemSelection(node: PageTreeFlatNodeModel): void {
    node.isChecked = !node.isChecked;
    this._checkAllParentsSelection(node);
    this._saveNode(node);
    this._update();
  }

  private _checkAllParentsSelection(node: PageTreeFlatNodeModel): void {
    let parent: PageTreeFlatNodeModel | null = this._getParentNode(node);
    while (parent) {
      this._checkRootNodeSelection(parent);
      parent = this._getParentNode(parent);
    }
  }

  private _checkRootNodeSelection(node: PageTreeFlatNodeModel): void {
    const isNodeSelected = node.isChecked;
    const descendants = this.treeControl.getDescendants(node);
    const areAllDescendantsSelected = descendants
      .every((child) => child.isChecked);
    if (isNodeSelected && !areAllDescendantsSelected) {
      node.isChecked = false;
    } else if (!isNodeSelected && areAllDescendantsSelected) {
      node.isChecked = true;
    }
    this._saveNode(node);
  }

  private _getParentNode(node: PageTreeFlatNodeModel): PageTreeFlatNodeModel | null {
    const currentLevel = this._getLevel(node);
    if (currentLevel < 1) {
      return null;
    }

    const startIndex = this.treeControl.dataNodes.indexOf(node) - 1;
    for (let i = startIndex; i >= 0; i--) {
      const currentNode = this.treeControl.dataNodes[i];
      if (this._getLevel(currentNode) < currentLevel) {
        return currentNode;
      }
    }
    return null;
  }

  private _saveNode(node: PageTreeFlatNodeModel): boolean {
    const nestedNode = this._flatNodeMap.get(node);
    const shouldUpdate = nestedNode.name !== node.name || nestedNode.value !== node.value
      || nestedNode.isChecked !== node.isChecked || nestedNode.isDisabled !== node.isDisabled;
    if (shouldUpdate) {
      this._pageDatabaseService.updateItem(nestedNode, {
        name: node.name,
        value: node.value,
        isChecked: node.isChecked,
        isDisabled: node.isDisabled
      });
    }
    return shouldUpdate;
  }

  private _update(): void {
    this._pageDatabaseService.update();
    this._changeDetectorRef.detectChanges();
    this.value.set(this.treeControl.dataNodes.filter((node) => node.isChecked));
  }
}
