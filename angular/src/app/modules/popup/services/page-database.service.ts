import { Injectable } from '@angular/core';
import { find, forOwn, groupBy } from 'lodash-es';
import { BehaviorSubject } from 'rxjs';
import { PageTreeNodeModel } from '../models/page-tree-node.model';

@Injectable({ providedIn: 'root' })
export class PageDatabaseService {
  public readonly dataChange = new BehaviorSubject<PageTreeNodeModel[]>([]);
  private readonly _maxDepth = 3;

  public get data(): PageTreeNodeModel[] {
    return this.dataChange.value;
  }

  public get rootNodeCount(): number {
    return this.dataChange.value.length;
  }

  public get pageNodeCount(): number {
    return this.getChildCount();
  }

  public getChildCount(node?: PageTreeNodeModel): number {
    const container = node ? node.children : this.dataChange.value;
    let count = 0;
    if (container?.length) {
      for (const child of container) {
        count += this.getChildCount(child);
      }
    } else {
      count = 1;
    }
    return count;
  }

  public insertBulk(pageHosts: URL[]): void {
    const newNodes = this._pageHostsToTreeNodes(pageHosts);
    this.insertBulkNodes(newNodes);
    this.dataChange.next(this.data);
  }

  public insertBulkNodes(nodes: PageTreeNodeModel[], parent: PageTreeNodeModel | null = null): void {
    if (!parent) {
      for (const node of nodes) {
        const rootNode = this.data.find((item) => item.value === node.value);
        if (rootNode) {
          this.insertBulkNodes(node.children, rootNode);
        } else if (node.children?.length) {
          this.insertItem(node, null, false);
        }
      }
    } else {
      for (const node of nodes) {
        const existingNode = node?.children?.length
          ? this.getNodeBy(node.name, this.data, 'name')
          : this.getNodeBy(node.value);
        if (!existingNode) {
          this.insertItem(node, parent, false);
        } else if (node.children?.length) {
          if (!existingNode.children || !existingNode.children.length) {
            const childNodeToUpdate = this.getNodeBy(existingNode.value, node.children);
            if (childNodeToUpdate) {
              childNodeToUpdate.isChecked = true;
              childNodeToUpdate.isDisabled = true;
            }
            this.updateItem(existingNode, node);
          } else {
            this.insertBulkNodes(node.children, existingNode);
          }
        }
      }
    }
  }

  public insertItem(
    newNode: PageTreeNodeModel,
    parent: PageTreeNodeModel | null,
    shouldNotify = true
  ): void {
    if (parent) {
      if (!parent.children) {
        parent.children = [ ];
      }
      if (!newNode.isDisabled) {
        newNode.isChecked = parent.isChecked;
      }
      parent.children.push(newNode);
    } else {
      this.data.push(newNode);
    }
    if (shouldNotify) {
      this.dataChange.next(this.data);
    }
  }

  public updateItem(node: PageTreeNodeModel, updateValues: Partial<PageTreeNodeModel>): void {
    Object.assign(node, updateValues);
  }

  public update(): void {
    this.dataChange.next(this.data);
  }

  public getParentNodeBy(
    value: string,
    data = this.data,
    by: keyof Omit<PageTreeNodeModel, 'children'> = 'value'
  ): PageTreeNodeModel | null {
    for (const item of data) {
      if (item.children) {
        const values = item.children.map((child) => child[by]);
        if (values.includes(value)) {
          return item;
        } else {
          const parent = this.getParentNodeBy(value, item.children, by);
          if (parent) {
            return parent;
          }
        }
      }
    }
    return null;
  }

  public getNodeBy(
    value: string,
    data = this.data,
    by: keyof Omit<PageTreeNodeModel, 'children'> = 'value'
  ): PageTreeNodeModel | null {
    for (const item of data) {
      if (item.children?.length) {
        const node = this.getNodeBy(value, item.children, by);
        if (node) {
          return node;
        }
      } else if (item[by] === value) {
        return item;
      }
    }
    return null;
  }

  private _pageHostsToTreeNodes(pageUrls: URL[]): PageTreeNodeModel[] {
    const hosts = groupBy(pageUrls, 'hostname');
    const nodes: PageTreeNodeModel[] = [ ];
    forOwn(hosts, (urls, name) => {
      const links = urls.map((url) => url.toString());
      const value = links[0].split(name).shift() + name;
      const children = links.length > 1
        ? this._pageLinksToTreeNodes(
            links
              .map((value) => ({
                name: decodeURIComponent(this._getChildLinkName(value, name)) || '/',
                value,
                isChecked: false
              })))
        : [ ];
      nodes.push({
        name: name || '/',
        value: children.length ? (name || '/') : value,
        isChecked: false,
        children
      });
    });
    return nodes;
  }

  private _pageLinksToTreeNodes(pageNodes: PageTreeNodeModel[], depth = 1): PageTreeNodeModel[] {
    if (depth >= this._maxDepth) {
      return pageNodes;
    }
    const group = groupBy(pageNodes, (node) => node.name.split('/').shift());
    const resultNodes: PageTreeNodeModel[] = [ ];
    forOwn(group, (nodes, name) => {
      const children = nodes.length > 1
        ? this._pageLinksToTreeNodes(
            nodes
              .map((node) => ({ ...node, name: this._getChildLinkName(node.name, name) || '/' })),
            depth + 1
          )
        : [ ];
      resultNodes.push({
        ...nodes[0],
        name: name || '/',
        value: children.length ? (name || '/') : nodes[0].value,
        children
      });
    });
    return resultNodes;
  }

  private _getChildLinkName(parentLinkName: string, linkName: string): string {
    const index = parentLinkName.indexOf(linkName);
    let url = parentLinkName;
    if (index !== -1) {
      url = url.substring(index + linkName.length);
    }
    const leadingSlashRegex = /^\//;
    const trailingSlashRegex = /\/$/;
    url =  url
      .replace(leadingSlashRegex, '')
      .replace(trailingSlashRegex, '');
    return url || '/';
  }
}
