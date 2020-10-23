import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { MainComponent, CalculatorComponent, GuaranteedPaymentComponent } from './modules/main/components';

const routes: Routes = [
    { path: 'calculator', component: CalculatorComponent },
    { path: 'gp', component: GuaranteedPaymentComponent },
    { path: 'guaranteed-payment', component: GuaranteedPaymentComponent },
    { path: 'denied', loadChildren: () => import('./modules/denied/denied.module').then(m => m.DeniedModule) },
    { path: 'nocookies', loadChildren: () => import('./modules/cookies/cookies.module').then(m => m.CookiesModule) },
    { path: 'person', loadChildren: () => import('./modules/person/person.module').then(m => m.PersonModule) },
    { path: 'serverError', loadChildren: () => import('./modules/server-error/serverError.module').then(m => m.ServerErrorModule) },
    { path: '**', component: MainComponent }
];

@NgModule({
    imports: [RouterModule.forRoot(routes)],
    exports: [RouterModule]
})
export class AppRoutingModule {
}
