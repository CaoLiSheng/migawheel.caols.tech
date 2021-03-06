import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { HttpModule } from "@angular/http";

import { BlogModule } from '../blog';
import { UserModule } from '../user';
import { AppRoutingModule } from './app.router';
import { AppComponent } from './app.component';
import { FallbackComponent } from './fallback.component';

@NgModule({
  declarations: [
    AppComponent,
    FallbackComponent
  ],
  imports: [
    BrowserModule,
    HttpModule,
    AppRoutingModule,
    BlogModule,
    UserModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
