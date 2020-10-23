import { Injectable } from '@angular/core';
import { CanActivate, CanDeactivate, ActivatedRouteSnapshot, Router, RouterStateSnapshot, ActivatedRoute } from '@angular/router';
import { Observable } from 'rxjs';
import { AppService, ConfirmationService, DocumentService, OffersService, OrderService, PersonService, SessionStorageService } from '../services';
import { routes } from '../models';

@Injectable()
export class OrderGuard implements CanActivate, CanDeactivate<boolean> {
    private orderRoutes = routes.newOrderRoutes;

    constructor(
        private appService: AppService,
        private confirmationService: ConfirmationService,
        private documentService: DocumentService,
        private offerService: OffersService,
        private orderService: OrderService,
        private personService: PersonService,
        private sessionService: SessionStorageService,
        private route: ActivatedRoute,
        private router: Router
    ) { }

    canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
        //appication started with non-empty url. If possible, restore app and switch to correct page
        if (this.appService.currentUrl == null) {
            if (state.url == "/")
                return true;
            //allow open details page
            else if (state.url.toLowerCase().startsWith(routes.orderDetails))
                return true;
            //allow open order screen by navigating to details page, loading application and auto loading available screen
            else if (state.url.toLowerCase().startsWith(routes.order) && this.sessionService.getSessionData("applicationId") != null) {
                this.router.navigate([routes.orderDetails + "/" + this.sessionService.getSessionData("applicationId")], { queryParams: { autoEdit: true } });
                return false;
            }
            //for orher urls, redirect to home path
            else {
                this.router.navigateByUrl("/");
                return false;
            }
        }

        if (this.appService.user == null && this.orderService.options == null)
            return false;

        if (this.appService.currentUrl != null && this.appService.currentUrl.startsWith("/login?"))
            return true;

        const url = state.url.toLowerCase().substring(state.url.lastIndexOf("/") + 1);
        const currentUrl = this.appService.currentUrl != null ? this.appService.currentUrl.toLowerCase().substring(this.appService.currentUrl.lastIndexOf("/") + 1) : "";
        const isDetail = this.appService.currentUrl != null && this.appService.currentUrl.toLowerCase().startsWith(routes.orderDetails);
        if (isDetail) {
            if (url == this.orderRoutes.new)
                this.orderService.reset();

            return true;
        }

        switch (url) {
            case this.orderRoutes.calculator:
                return this.orderService.cartFilled && (currentUrl == this.orderRoutes.cart || currentUrl == this.orderRoutes.new || currentUrl == this.orderRoutes.identification || currentUrl == this.orderRoutes.person);
            case this.orderRoutes.identification:
                return this.orderService.calculatorComplete && (currentUrl == this.orderRoutes.calculator || currentUrl == this.orderRoutes.person);
            case this.orderRoutes.person:
                return this.personService.identificationComplete && (currentUrl == this.orderRoutes.identification || currentUrl == this.orderRoutes.address);
            case this.orderRoutes.address:
                return this.personService.personDataComplete && (currentUrl == this.orderRoutes.person || currentUrl == this.orderRoutes.work);
            case this.orderRoutes.work:
                return this.personService.personAddressComplete && (currentUrl == this.orderRoutes.address || currentUrl == this.orderRoutes.additional);
            case this.orderRoutes.additional:
                return this.personService.personJobComplete && (currentUrl == this.orderRoutes.work || currentUrl == this.orderRoutes.confirm);
            case this.orderRoutes.confirm:
                return this.personService.personFamilyComplete && currentUrl == this.orderRoutes.additional;
            case this.orderRoutes.offers:
                return this.documentService.agreementLoaded && this.personService.confirmed && currentUrl == this.orderRoutes.confirm;
            case this.orderRoutes.complete:
                return this.offerService.offer != null && currentUrl == this.orderRoutes.offers;
            case this.orderRoutes.documents:
                return this.offerService.offer != null && this.offerService.offer.signOnPaper && currentUrl == this.orderRoutes.complete;
            default:
                return true;
        }
    }

    canDeactivate(component: boolean, currentRoute: ActivatedRouteSnapshot, currentState: RouterStateSnapshot, nextState: RouterStateSnapshot): Observable<boolean> | Promise<boolean> | boolean {
        const url = nextState.url.toLowerCase();
        switch (url) {
            case routes.newOrderCart:
                if (currentState.url.toLowerCase() == routes.newOrderCalculator)
                    return true;
            case routes.newOrder:
            case routes.orders:
                break;
            default:
                return true;
        }

        if (this.offerService.completed || this.documentService.completed || this.documentService.verificationResult != null) {
            this.orderService.reset();
            return true;
        }

        if (this.orderService.order.applicationId == null)
            return true;

        this.confirmationService.incompleteOrder();
        this.confirmationService.selection$
            .subscribe(result => {
                if (result)
                    this.orderService.reset();
            });

        return this.confirmationService.selection$;
    }
}