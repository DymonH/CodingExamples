import { Injectable } from '@angular/core';
import { HttpService } from './http.service';
import { Observable } from 'rxjs';
import { ApiResponse } from '../models';
import { AppInjector } from "../../../app-injector.service";
import { ApplicationService } from "../../../app.service";

@Injectable()
export class ServerLoggerService extends HttpService{
    public log(message: string, stack: string): Observable<ApiResponse> {
        const data = {
            message: message,
            stack: stack
        };
        
        this.setBaseUrl();
        return this.post("log", data)
            .pipe() as Observable<ApiResponse>;
    }

    private setBaseUrl() {
        if (this.baseUrl != null)
            return;
            
        const injector = AppInjector.getInjector();
        const appService = injector.get(ApplicationService);    
        this.baseUrl = appService.baseUrl;
    }
}