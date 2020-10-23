import { NgModule } from "@angular/core";
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { provideRoutes } from "@angular/router";
import { LAZY_WIDGETS } from "./tokens";
import { lazyArrayToObj, lazyWidgets } from "./lazy-widgets";
import { LazyLoaderService } from "./lazy-loader.service";

@NgModule({
    imports: [
        BrowserModule,
        FormsModule
    ],
    providers: [
        { provide: LAZY_WIDGETS, useFactory: lazyArrayToObj }, 
        LazyLoaderService,
        provideRoutes(lazyWidgets)
    ]
  })
  export class LazyLoaderModule {
  }
  