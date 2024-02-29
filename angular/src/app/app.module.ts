import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppRoutingModule } from './app-routing.module';
import { RootPageComponent } from './components/pages/root/root.component';

@NgModule({
  declarations: [ RootPageComponent ],
  imports: [ BrowserModule, AppRoutingModule ],
  bootstrap: [ RootPageComponent ]
})
export class AppModule { }
