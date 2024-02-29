import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatTreeModule } from '@angular/material/tree';
import { PopupPageComponent } from './components/pages/popup/popup.component';
import { PageTreeComponent } from './components/widgets/page-tree/page-tree.component';
import { PopupRoutingModule } from './popup-routing.module';

@NgModule({
  declarations: [ PopupPageComponent, PageTreeComponent ],
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatProgressBarModule,
    MatIconModule,
    MatListModule,
    MatTreeModule,
    PopupRoutingModule
  ]
})
export class PopupModule { }
