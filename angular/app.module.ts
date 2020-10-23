import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { APP_BASE_HREF } from '@angular/common';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { ApplicationMockService } from './app.mock.service';
import { ApplicationService } from './app.service';
import { environment } from '../environments/environment';
import { MainModule } from './modules/main/main.module';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { ErrorInterceptor } from './modules/shared/interceptors/error.interceptor';
import { LazyLoaderModule } from './modules/lazy-loader/lazy-loader.module';

@NgModule({
    declarations: [
        AppComponent
    ],
    imports: [
        BrowserModule,
        LazyLoaderModule,
        MainModule,
        // must be last
        AppRoutingModule,
    ],
    providers: [
        { provide: HTTP_INTERCEPTORS, useClass: ErrorInterceptor, multi: true },
        environment.mock
            ? { provide: ApplicationService, useClass: ApplicationMockService }
            : ApplicationService,
        { provide: APP_BASE_HREF, useValue: '/' }
    ],
    bootstrap: [AppComponent]
})

export class AppModule {
}
