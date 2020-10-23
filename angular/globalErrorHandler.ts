import { ErrorHandler, Injectable, Injector } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ServerLoggerService } from '../services/serverLogger.service';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {

    // Error handling is important and needs to be loaded first.
    // Because of this we should manually inject the services with Injector.
    constructor(private logger: ServerLoggerService) { }

    handleError(error: Error | HttpErrorResponse) {
        let message;
        let stackTrace;

        if (error instanceof HttpErrorResponse) {
            // Server Error
            message = error.message
            stackTrace = null;
        } else {
            // Client Error
            message = error.message;
            stackTrace = error.stack;
        }
        
        console.error(error);
        this.logger.log(message, stackTrace)
            .subscribe(_ => { });
    }
}