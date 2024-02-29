import { ChangeDetectorRef, Component, Inject, computed, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { find, range } from 'lodash-es';
import {
  Observable,
  Subject,
  bindCallback,
  combineLatest,
  from,
  merge,
  of,
  throwError
} from 'rxjs';
import {
  catchError,
  delay,
  filter,
  first,
  map,
  retry,
  share,
  switchMap,
  tap
} from 'rxjs/operators';
import { PDFDocument } from 'pdf-lib';
import { PageDatabaseService } from '../../../services/page-database.service';
import { PageTreeFlatNodeModel } from '../../../models/page-tree-flat-node.model';
import { EMPTY_PDF_BASE64 } from '../../../../../app.constants';
import { TAB_ID } from '../../../../../providers/tab-id.provider';

@Component({
  selector: 'rsp-popup-page',
  templateUrl: 'popup.component.html',
  styleUrl: 'popup.component.scss'
})
export class PopupPageComponent {
  public readonly activeTab$: Observable<chrome.tabs.Tab>;
  public readonly badge$: Observable<number>;
  public readonly debugger$: Observable<chrome.tabs.Tab>;
  public readonly badgeValue$ = new Subject<number>();
  public readonly saveAsPdfButton$ = new Subject<void>();
  public readonly pageNavigator$ = new Subject<string>();
  public readonly visitedPageLinks = new Map<string, PDFDocument>();
  public readonly selectedNodes = signal<PageTreeFlatNodeModel[]>([ ]);
  public readonly selectedPageNodes = computed(() => new Set(this.selectedNodes()
    .filter((node) => !node.isExpandable)));
  public readonly selectedHosts = computed(() => new Set([ ...this.selectedPageNodes() ]
    .map((node) => (new URL(node.value)).hostname)));
  public pageLinks$?: Observable<URL[]>;
  public isSaving = false;
  public isMergePdfsDisabled = false;
  public shouldMergePdfs = true;
  public shouldIgnoreUrlAnchors = false;
  private _activeTabUrl: URL;
  private _pdfDoc: PDFDocument;
  private readonly _emptyPdfBase64 = EMPTY_PDF_BASE64;

  public get totalHosts(): number {
    return this._pageDatabaseService.rootNodeCount;
  }

  public get totalPages(): number {
    return this._pageDatabaseService.pageNodeCount;
  }

  public get progress(): number {
    return this.visitedPageLinks.size / this.selectedPageNodes().size * 100;
  }

  constructor(
    @Inject(TAB_ID) public readonly tabId: number,
    private readonly _changeDetectorRef: ChangeDetectorRef,
    private readonly _pageDatabaseService: PageDatabaseService
  ) {
    // console.log('TAB_ID', this.tabId);
    const selectedNodes$ = toObservable(this.selectedNodes)
      .pipe(
        tap(() => this._detectChanges()),
        takeUntilDestroyed()
      );

    this.activeTab$ = bindCallback<[chrome.tabs.QueryInfo], chrome.tabs.Tab[]>(chrome.tabs.query)({
      active: true,
      currentWindow: true
    })
      .pipe(
        map(([ activeTab ]) => activeTab),
        // tap((activeTab) => console.log('activeTab', activeTab)),
        tap((activeTab) => this._activeTabUrl = new URL(this._sanitizeUrl(activeTab.url))),
        tap(() => this._detectChanges()),
        share()
      );

    combineLatest([
      selectedNodes$.pipe(first()),
      this.activeTab$.pipe(first()),
      this._parsePageLinks()
    ])
      .pipe(
        tap(() => {
          const value = this._activeTabUrl.toString();
          const parentNode = _pageDatabaseService.getParentNodeBy(value);
          if (parentNode) {
            const node = find(parentNode.children, { value });
            if (node) {
              _pageDatabaseService.updateItem(node, {
                isChecked: true,
                isDisabled: true
              });
              _pageDatabaseService.update();
            }
          }
        }),
        takeUntilDestroyed()
      )
      .subscribe();

    this.badge$ = combineLatest([ this.activeTab$, this.badgeValue$.asObservable() ])
      .pipe(
        switchMap((data) => from(chrome.action.setBadgeBackgroundColor({ color: '#111111' }))
          .pipe(map(() => data))),
        switchMap((data) => from(chrome.action.setBadgeTextColor({ color: '#f5eded' }))
          .pipe(map(() => data))),
        map(([ activeTab, value ]) => ({ activeTab, value })),
        switchMap(({ activeTab, value }) => from(chrome.action.setBadgeText({
            tabId: activeTab.id,
            text: String(value)
          }))
            .pipe(map(() => value))),
        share()
      );

    const attachDebugger$ = this.activeTab$
      .pipe(
        switchMap((activeTab) => from(chrome.debugger.attach({ tabId: activeTab.id }, '1.3'))
          .pipe(
            catchError(() => of(activeTab)),
            map(() => activeTab)
          ))
      );

    this.debugger$ = this.activeTab$
      .pipe(
        switchMap((activeTab) => from(chrome.debugger.getTargets())
          .pipe(
          map((targets) => ({
              activeTab,
              targets: targets.filter((target) => target.tabId === activeTab.id && target.attached)
            }))
          )),
        // tap(({ targets }) => console.log('targets', targets)),
        switchMap(({ activeTab, targets }) => targets.length
          ? of(activeTab)
          : attachDebugger$),
        share()
      );

    from(PDFDocument.create())
      .pipe(
        tap((pdfDoc) => this._pdfDoc = pdfDoc),
        takeUntilDestroyed()
      )
      .subscribe();

    merge(
      this.saveAsPdfButton$
        .asObservable()
        .pipe(
          tap(() => {
            this.isSaving = true;
            this.isMergePdfsDisabled = true;
          }),
          map(() => this._activeTabUrl.toString())
        ),
      this.pageNavigator$
        .asObservable()
        .pipe(
          switchMap((pageUrl) => attachDebugger$.pipe(map((activeTab) => ({ activeTab, pageUrl })))),
          switchMap(({ activeTab, pageUrl }) => bindCallback<[chrome.debugger.Debuggee, string, any], [any]>(chrome.debugger.sendCommand)({
            tabId: activeTab.id
          }, 'Page.navigate', { url: 'about:blank' })
            .pipe(map((response) => ({ response, activeTab, pageUrl })))),
          switchMap(({ activeTab, pageUrl }) => bindCallback<[chrome.debugger.Debuggee, string, any], [any]>(chrome.debugger.sendCommand)({
            tabId: activeTab.id
          }, 'Page.navigate', { url: pageUrl.toString() })
            .pipe(map((response) => ({ response, pageUrl })))),
          switchMap(({ pageUrl }) => this._parsePageLinks().pipe(map(() => pageUrl)))
        )
    )
      .pipe(
        switchMap((pageUrl) => attachDebugger$.pipe(map((activeTab) => ({ activeTab, pageUrl })))),
        switchMap(({ activeTab, pageUrl }) =>
          bindCallback<[chrome.debugger.Debuggee, string, any], [{ data: string }]>(chrome.debugger.sendCommand)(
            { tabId: activeTab.id },
            'Page.printToPDF',
            { printBackground: true, transferMode: 'ReturnAsBase64' }
          )
            .pipe(
              map(({ data }) => ({ data, pageUrl })),
              catchError(() => of({ data: this._emptyPdfBase64, pageUrl }))
            )),
        switchMap(({ data, pageUrl }: { data: string; pageUrl: string }) => from(PDFDocument
          .load(this._base64ToArrayBuffer(data), {
            updateMetadata: false
          }))
            .pipe(map((pdfDoc) => ({ data, pageUrl, pdfDoc })))),


        switchMap(({ pageUrl, pdfDoc }) => this.visitedPageLinks.has(pageUrl)
          ? of({ pageUrl, pdfDoc })
          : this.shouldMergePdfs
            ? from(this._pdfDoc.copyPages(pdfDoc, range(pdfDoc.getPageCount())))
                .pipe(
                  map((pages) => ({ pdfDoc, pages })),
                  tap(({ pages }) => {
                    for (const page of pages) {
                      this._pdfDoc.addPage(page);
                    }
                  }),
                  map(() => ({ pageUrl, pdfDoc }))
                )
            : from(pdfDoc.saveAsBase64({ dataUri: true }))
                .pipe(
                  map((base64PdfUri) => ({ pageUrl, base64PdfUri })),
                  switchMap(({ pageUrl, base64PdfUri }) => from(chrome.downloads.download({
                    url: base64PdfUri,
                    filename: `${this._sanitizeFileName(pageUrl)}.pdf`
                  }))),
                  map(() => ({ pageUrl, pdfDoc }))
                )),


        map(({ pageUrl, pdfDoc }) => {
          if (!this.visitedPageLinks.has(pageUrl)) {
            this.visitedPageLinks.set(pageUrl, pdfDoc);
            this.badgeValue$.next(this.visitedPageLinks.size);
            const nodes = this.selectedNodes();
            const node = find(nodes, { value: pageUrl });
            if (node && !node.isDisabled) {
              node.isDisabled = true;
              this.selectedNodes.set([ ...nodes ]);
            }
          }
          const nextPageUrl = this._getNextPageUrl();
          if (nextPageUrl) {
            this.pageNavigator$.next(nextPageUrl);
          }
          return nextPageUrl;
        }),
        // tap((nextPageUrl) => console.log('nextPageUrl', nextPageUrl)),
        filter((nextPageUrl) => !nextPageUrl),
        switchMap((nextPageUrl) => this.shouldMergePdfs
          ? from(this._pdfDoc.saveAsBase64({ dataUri: true }))
            .pipe(
              map((base64PdfUri) => ({
                link: (new URL(this.visitedPageLinks.keys().next().value)).hostname,
                base64PdfUri
              })),
              switchMap(({ link, base64PdfUri }) => from(chrome.downloads.download({
                url: base64PdfUri,
                filename: `${this._sanitizeFileName(link)}.pdf`
              }))),
              map(() => nextPageUrl)
            )
          : of(nextPageUrl)),
        delay(1722),
        tap(() => this.isSaving = false),
        tap(() => this._detectChanges()),
        takeUntilDestroyed()
      )
      .subscribe();
  }

  private _detectChanges(): void {
    setTimeout(() => this._changeDetectorRef.detectChanges(), 0);
  }

  private _parsePageLinks(): Observable<URL[]> {
    this.pageLinks$ = this.activeTab$
      .pipe(
        switchMap((activeTab) => bindCallback<[number, string], any>(chrome.tabs.sendMessage)(
          activeTab.id,
          'parseLinks'
        )),
        // tap(() => console.log('chrome.runtime.lastError', chrome.runtime.lastError)),
        map((message) => chrome.runtime.lastError
          ? throwError(() => new WebTransportError(
              'The current page is protected by the browser. Error: ' + chrome.runtime.lastError
            ))
          : JSON.parse(message)
        ),
        map((response: { action: 'parseLinks', links: string[] }) => [
            ...(new Set(response.links.map((link) => this._sanitizeUrl(link))))
          ]
            .map((link) => new URL(link))
            .filter((url) => url.host)),
        retry({ count: 5, delay: 500 }),
        catchError(() => of<URL[]>([ ])),
        tap((links) => this._pageDatabaseService.insertBulk(links)),
        tap(() => this._detectChanges()),
        share()
      ) as Observable<URL[]>;
    return this.pageLinks$;
  }

  private _base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  private _getNextPageUrl(): string | null {
    const selectedPages = [ ...this.selectedPageNodes() ].map((node) => node.value);
    for (const url of selectedPages) {
      if (!this.visitedPageLinks.has(url)) {
        return url;
      }
    }
    return null;
  }

  private _sanitizeFileName(fileName: string): string {
    const invalidCharsRegex = /[^a-zA-Z0-9._-]/g;
    return fileName.replace(invalidCharsRegex, '-');
  }

  private _sanitizeUrl(url: string): string {
    const trailingQuestionMarkRegex = /\?$/;
    const trailingHashRegex = /\#$/;
    const trailingSlashRegex = /\/$/;
    let sanitizedUrl = url
      .replace(trailingHashRegex, '')
      .replace(trailingSlashRegex, '');
    if (this.shouldIgnoreUrlAnchors) {
      const anchorRegex = /\#[\w\-_.~()\s]+$/;
      sanitizedUrl = sanitizedUrl
        .replace(anchorRegex, '')
        .replace(trailingQuestionMarkRegex, '')
        .replace(trailingHashRegex, '')
        .replace(trailingSlashRegex, '');
    }
    return sanitizedUrl;
  }
}
