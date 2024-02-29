import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PopupPageComponent } from './components/pages/popup/popup.component';

const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    component: PopupPageComponent
  }
];

@NgModule({
  imports: [ RouterModule.forChild(routes) ],
  exports: [ RouterModule ]
})
export class PopupRoutingModule { }
