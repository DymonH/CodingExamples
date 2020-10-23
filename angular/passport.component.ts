import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ValidationErrors } from '@angular/forms';
import { Router } from '@angular/router';
import { routes, DadataFmsUnit, DaDataAddress, Person } from '../../../shared/models';
import { ApplicationService } from '../../../../app.service';
import { Masks } from '../../../shared/helpers/masks';
import { PersonValidators } from '../../../shared/helpers/personValidators';
import { DadataService } from '../../services/dadata.service';
import { PersonService } from '../../services/person.service';
import { FormsHelper } from '../../../shared/helpers';
import { BehaviorSubject, Subscription } from 'rxjs';
import { DictionaryService } from '../../services/dictionary.service';
import { SessionStorageService } from '../../services/sessionStorage.service';

// using jQuery suggestions, attached in Index.chtml
declare var $: any;

@Component({
    selector: 'app-passport',
    templateUrl: './passport.component.html',
    styleUrls: ['./passport.component.css']
})

export class PassportComponent implements AfterViewInit, OnDestroy, OnInit {
    public updateInProgress$: BehaviorSubject<boolean> = new BehaviorSubject(false);
    public passportForm: FormGroup;
    public masks = {
        appartment: Masks.appartment,
        birthPlace: Masks.birthPlace,
        code: Masks.passportIssuerCode,
        date: Masks.date,
        passportIssuer: Masks.passportIssuer,
        phone: Masks.phone
    };

    private $passportCode: any = null;
    private $regAddress: any = null;
    private $liveAddress: any = null;
    private $regPhone: any = null;
    private $livePhone: any = null;
    private liveDadataFixed = false;
    private dictionariesLoaded$: Subscription = null;
    private dictionariesLoaded = false;
    private updated = false;
    private savePersonTimeout: number = null;
    private phoneUpdateInterval: number = null;

    constructor(
        private appService: ApplicationService,
        private dadataService: DadataService,
        private dictionaryService: DictionaryService,
        private fb: FormBuilder,
        private formsHelper: FormsHelper,
        private personService: PersonService,
        private router: Router,
        private sessionService: SessionStorageService
    ) { }

    ngAfterViewInit(): void {
        this.$regPhone = $("#reg-phone");
        this.$livePhone = $("#live-phone");
        this.initDadata();
        window.setTimeout(_ => this.loadDictionaries(), 5000);
    }

    ngOnDestroy(): void {
        if (this.phoneUpdateInterval != null)
            window.clearInterval(this.phoneUpdateInterval);
    }
    
    ngOnInit(): void {
        const sessionPassport = this.sessionService.getPassport();
        const sessionAddress = this.sessionService.getAddress();
        const passport = this.personService.person.personPassport;
        const address = this.personService.person.personAddresses;
        this.passportForm = this.fb.group({
            issueDate: new FormControl(passport.issueDate || sessionPassport.issueDate, PersonValidators.passportDate()),
            issuingAuthorityCode: new FormControl(passport.code || sessionPassport.code, PersonValidators.passportCode("issuingAuthorityCodeDadata")),
            issuingAuthorityCodeDadata: new FormControl(),
            issuingAuthority: new FormControl(passport.emitent || sessionPassport.emitent, PersonValidators.passportIssuer()),
            birthplace: new FormControl(passport.birthPlace || sessionPassport.birthPlace, PersonValidators.birthPlace()),
            regAddress: new FormControl(address.regAddress || sessionAddress.regAddress, PersonValidators.address(null, "regAddressDadata")),
            regAddressDadata: new FormControl(),
            regApartment: new FormControl( address.regFlat || sessionAddress.regFlat, PersonValidators.appartment(null, "isNoRegApartment")),
            isNoRegApartment: new FormControl(sessionAddress.hasNoApartmentReg || address.hasNoApartmentReg, { updateOn: "change" }),
            regPhone: new FormControl( Masks.maskPhone(address.regPhone || sessionAddress.regPhone), {
                validators: [PersonValidators.phone(null, "isNoRegPhone"), PersonValidators.customFunction(_ => this.checkRegPhoneUnique())],
                updateOn: "change"
            }),
            isNoRegPhone: new FormControl(sessionAddress.hasNoPhoneNumReg || address.hasNoPhoneNumReg, { updateOn: "change" }),
            regDate: new FormControl(passport.registrationDate || sessionPassport.registrationDate, PersonValidators.registrationDate()),
            isAddressEqual: new FormControl(sessionAddress.sameAddr != null ? sessionAddress.sameAddr : address.sameAddr, { updateOn: "change" }),
            liveAddress: new FormControl(address.liveAddress || sessionAddress.liveAddress, PersonValidators.address("isAddressEqual", "liveAddressDadata")),
            liveAddressDadata: new FormControl(),
            liveApartment: new FormControl(address.liveFlat || sessionAddress.liveFlat, PersonValidators.appartment("isAddressEqual", "isNoLiveApartment")),
            isNoLiveApartment: new FormControl(sessionAddress.hasNoApartmentLive || address.hasNoApartmentLive, { updateOn: "change" }),
            livePhone: new FormControl(Masks.maskPhone(address.livePhone || sessionAddress.livePhone), {
                validators: [PersonValidators.phone("isAddressEqual", "isNoLivePhone"), PersonValidators.customFunction(_ => this.checkLivePhoneUnique())],
                updateOn: "change"
            }),
            isNoLivePhone: new FormControl(sessionAddress.hasNoPhoneNumLive || address.hasNoPhoneNumLive, { updateOn: "change" }),
            liveDate: new FormControl(address.dateArrival || sessionAddress.dateArrival, PersonValidators.dateArrival("isAddressEqual"))
        }, { updateOn: 'blur' });
        
        this.regPhone.valueChanges.subscribe(value => {
            window.setTimeout(_ => this.livePhone.updateValueAndValidity({ onlySelf: true, emitEvent: false }));
        });

        this.livePhone.valueChanges.subscribe(value => {
            window.setTimeout(_ => this.regPhone.updateValueAndValidity({ onlySelf: true, emitEvent: false }));
        });

        this.isNoRegApartment.valueChanges.subscribe(value => {
            if (value == true)
                this.regApartment.disable();
            else
                this.regApartment.enable();
        });

        this.isNoLiveApartment.valueChanges.subscribe(value => {
            if (value == true)
                this.liveApartment.disable();
            else
                this.liveApartment.enable();
        });

        this.isNoRegPhone.valueChanges.subscribe(value => {
            if (value == true)
                this.regPhone.disable();
            else
                this.regPhone.enable();
        });

        this.isNoLivePhone.valueChanges.subscribe(value => {
            if (value == true)
                this.livePhone.disable();
            else
                this.livePhone.enable();
        });

        if (this.isNoRegApartment.value)
            this.regApartment.disable();

        if (this.isNoLiveApartment.value)
            this.liveApartment.disable();

        if (this.isNoRegPhone.value)
            this.regPhone.disable();

        if (this.isNoLivePhone.value)
            this.livePhone.disable();
        
        this.passportForm.valueChanges.subscribe((value) => {
            if (this.savePersonTimeout != null)
                window.clearTimeout(this.savePersonTimeout);

            this.savePersonTimeout = window.setTimeout(_ => {
                const person = this.getPerson();
                this.sessionService.savePassport(person.personPassport);
                this.sessionService.saveAddress(person.personAddresses);
            }, 300);
        });

        //HACK AK
        //Валидация телефона не работает в случае копи-паста (глючит textMask)
        this.phoneUpdateInterval = window.setInterval(_ => {
            if (!this.regPhone.valid)
                this.formsHelper.updatePhoneFromJquery(this.regPhone, this.$regPhone);

            if (!this.livePhone.valid)
                this.formsHelper.updatePhoneFromJquery(this.livePhone, this.$livePhone);
        }, 250);
        //HACK AK  end

        window.setTimeout(_ => this.appService.progress = 30);
    }

    public get issueDate(): FormControl {
        return <FormControl>this.passportForm.get('issueDate');
    }

    public get issuingAuthorityCode(): FormControl {
        return <FormControl>this.passportForm.get('issuingAuthorityCode');
    }

    public get issuingAuthority(): FormControl {
        return <FormControl>this.passportForm.get('issuingAuthority');
    }

    public get birthplace(): FormControl {
        return <FormControl>this.passportForm.get('birthplace');
    }

    public get issuingAuthorityCodeDadata(): FormControl {
        return <FormControl>this.passportForm.get('issuingAuthorityCodeDadata');
    }

    public get regAddress(): FormControl {
        return <FormControl>this.passportForm.get('regAddress');
    }

    public get regAddressDadata(): FormControl {
        return <FormControl>this.passportForm.get('regAddressDadata');
    }

    public get regApartment(): FormControl {
        return <FormControl>this.passportForm.get('regApartment');
    }

    public get isNoRegApartment(): FormControl {
        return <FormControl>this.passportForm.get('isNoRegApartment');
    }

    public get regPhone(): FormControl {
        return <FormControl>this.passportForm.get('regPhone');
    }

    public get isNoRegPhone(): FormControl {
        return <FormControl>this.passportForm.get('isNoRegPhone');
    }

    public get regDate(): FormControl {
        return <FormControl>this.passportForm.get('regDate');
    }

    public get isAddressEqual(): FormControl {
        return <FormControl>this.passportForm.get('isAddressEqual');
    }

    public get liveAddress(): FormControl {
        return <FormControl>this.passportForm.get('liveAddress');
    }

    public get liveApartment(): FormControl {
        return <FormControl>this.passportForm.get('liveApartment');
    }

    public get isNoLiveApartment(): FormControl {
        return <FormControl>this.passportForm.get('isNoLiveApartment');
    }

    public get liveAddressDadata(): FormControl {
        return <FormControl>this.passportForm.get('liveAddressDadata');
    }

    public get livePhone(): FormControl {
        return <FormControl>this.passportForm.get('livePhone');
    }

    public get isNoLivePhone(): FormControl {
        return <FormControl>this.passportForm.get('isNoLivePhone');
    }

    public get liveDate(): FormControl {
        return <FormControl>this.passportForm.get('liveDate');
    }

    public onAddressRegChanged(event) {
        if (event != null && event.type == "keyup" && (event.key == "Enter" || event.keyCode == 13 || event.which == 13))
            return;

        this.regAddressDadata.setValue(null);
        this.regAddress.updateValueAndValidity();
    }

    public onAddressLivingChanged(event) {
        if (event != null && event.type == "keyup" && (event.key == "Enter" || event.keyCode == 13 || event.which == 13))
            return;

        this.liveAddressDadata.setValue(null);
        this.liveAddress.updateValueAndValidity();
    }

    public onCodeChanged(event) {
        if (event != null && event.type == "keyup" && (event.key == "Enter" || event.keyCode == 13 || event.which == 13))
            return;

        this.issuingAuthorityCodeDadata.setValue(null);
        this.issuingAuthorityCode.updateValueAndValidity();
        this.issuingAuthority.setValue(null);
    }

    public onPassportFormSubmit() {
        if (!this.formsHelper.isValid(this.passportForm))
            return;

        this.loadDictionaries();
        this.updatePerson();
    }

    public onSameAddressChanged(e) {
        this.liveAddress.updateValueAndValidity();
        this.liveApartment.updateValueAndValidity();
        this.liveDate.updateValueAndValidity();
        this.livePhone.updateValueAndValidity();
        this.restoreDadataLive();
    }
    
    private checkRegPhoneUnique(): ValidationErrors {
        if (this.passportForm ==  null)
            return null;

        if (this.isNoRegPhone.value == true)
            return null;

        const value = Masks.removeMask(this.regPhone.value, 11);
        if (value == this.personService.person.personData.phone)
            return this.formsHelper.uniquePhoneError;

        if (this.isAddressEqual.value == true || this.isNoLivePhone.value == true)
            return null;

        return value == Masks.removeMask(this.livePhone.value, 11)
            ? this.formsHelper.uniquePhoneError
            : null;
    }

    private checkLivePhoneUnique(): ValidationErrors {
        if (this.passportForm ==  null)
            return null;

        if (this.isAddressEqual.value == true || this.isNoLivePhone.value == true)
            return null;

        const value = Masks.removeMask(this.livePhone.value, 11);
        if (value == this.personService.person.personData.phone || value == Masks.removeMask(this.regPhone.value, 11))
            return this.formsHelper.uniquePhoneError;
        
        return null;
    }

    // Инициализация подсказкок
    private initDadata() {
        this.$passportCode = $('#issuing-authority-code');
        this.$regAddress = $('#reg-address');
        this.$liveAddress = $('#live-address');

        // Адрес регистрации
        this.dadataService.initDadata(this.$regAddress, 'address',
            (suggestion: DaDataAddress) => {
                this.onDadataRegAddress(suggestion);
            }
        );

        // Адрес проживания
        this.dadataService.initDadata(this.$liveAddress, 'address',
            (suggestion: DaDataAddress) => {
                this.onDadataLiveAddress(suggestion);
            }
        );

        // Код подразделения
        this.dadataService.initDadata(this.$passportCode, 'fms_unit',
            (suggestion: DadataFmsUnit) => {
                this.onDadataFmsUnit(suggestion);
            }
        );

        const interval = window.setInterval(_ => {
            if (this.$passportCode.suggestions &&
                this.$regAddress.suggestions &&
                this.$liveAddress.suggestions &&
                this.$passportCode.suggestions().fixData &&
                this.$regAddress.suggestions().fixData &&
                this.$liveAddress.suggestions().fixData) {
                window.clearInterval(interval);
                this.restoreDadata();
            }
        }, 50);
    }

    private loadDictionaries() {
        if (this.dictionariesLoaded$ != null)
            return;

        this.dictionariesLoaded$ = this.dictionaryService.loaded$.subscribe((value) => {
            if (value) {
                this.dictionariesLoaded = true;
                this.next();
            }
        });

        this.dictionaryService.load();
    }

    private next() {
        if (this.updated && this.dictionariesLoaded)
            window.setTimeout(_ => this.router.navigate([routes.work], { skipLocationChange: true }));
    }

    private onDadataFmsUnit(suggestion: DadataFmsUnit) {
        const code = suggestion.code;
        const name = suggestion.name;
        this.issuingAuthorityCodeDadata.setValue(suggestion);
        this.issuingAuthorityCodeDadata.markAsDirty();
        this.issuingAuthorityCode.setValue(code);
        this.issuingAuthorityCode.markAsDirty();
        this.issuingAuthorityCode.updateValueAndValidity();
        this.issuingAuthority.setValue(name);
    }

    private onDadataLiveAddress(suggestion: DaDataAddress) {
        this.liveAddressDadata.setValue(suggestion);
        this.liveAddressDadata.markAsDirty();
        this.formsHelper.setFieldValue(this.liveAddress, this.$liveAddress.val());
    }

    private onDadataRegAddress(suggestion: DaDataAddress) {
        this.regAddressDadata.setValue(suggestion);
        this.regAddressDadata.markAsDirty();
        this.formsHelper.setFieldValue(this.regAddress, this.$regAddress.val());
    }

    // Восстановление подсказкок по значению текстовых полей.
    private restoreDadata() {
        // Адрес регистрации
        if (this.regAddress.value != null) {
            this.$regAddress.on('suggestions-fixdata', (e, suggestion: any) => {
                if (suggestion) {
                    this.onDadataRegAddress(suggestion.data);
                }
            });

            this.$regAddress.suggestions().fixData();
        }

        if (!this.isAddressEqual.value)
            this.restoreDadataLive();

        // Код подразделения
        if (this.issuingAuthorityCode.value != null) {
            this.$passportCode.on('suggestions-fixdata', (e, suggestion: any) => {
                if (suggestion) {
                    this.onDadataFmsUnit(suggestion.data);
                }
            });

            this.$passportCode.suggestions().fixData();
        }
    }

    //для адреса проживания сделано отдельно, поскольку jquery.suggestion.fixData() падает на невидимых полях
    private restoreDadataLive() {
        // Адрес проживания
        if (this.liveAddress.value != null && !this.liveDadataFixed) {
            this.$liveAddress.on('suggestions-fixdata', (e, suggestion: any) => {
                if (suggestion) {
                    this.onDadataLiveAddress(suggestion.data);
                }
            });

            this.liveDadataFixed = true;
            window.setTimeout(_ => this.$liveAddress.suggestions().fixData(), 500);
        }
    }

    private getPerson(): Person {
        const person = this.personService.person;
        const address = person.personAddresses;
        const passport = person.personPassport;
        const sameAddr = this.isAddressEqual.value;
        address.regAddress = this.regAddress.value;
        address.regAddressDadata = JSON.stringify(this.regAddressDadata.value);
        address.regFlat = this.isNoRegApartment.value ? null : this.regApartment.value;
        address.hasNoApartmentReg = this.isNoRegApartment.value;
        address.regPhone = this.isNoRegPhone.value ? null : Masks.removeMask(this.regPhone.value, 11);
        address.hasNoPhoneNumReg = this.isNoRegPhone.value;
        person.personPassport.registrationDate = Masks.removeMask(this.regDate.value, 10);
        address.sameAddr = sameAddr;
        address.liveAddress = sameAddr ? this.regAddress.value : this.liveAddress.value;
        address.liveAddressDadata = JSON.stringify(sameAddr ? this.regAddressDadata.value : this.liveAddressDadata.value);
        address.liveFlat = sameAddr ? this.regApartment.value : this.isNoLiveApartment.value ? null : this.liveApartment.value;
        address.hasNoApartmentLive = sameAddr ? this.isNoRegApartment.value : this.isNoLiveApartment.value;
        address.livePhone = sameAddr ? Masks.removeMask(address.regPhone, 11) : this.isNoLivePhone.value ? null : Masks.removeMask(this.livePhone.value, 11);
        address.hasNoPhoneNumLive = sameAddr ? this.isNoRegPhone.value : this.isNoLivePhone.value;
        address.dateArrival = Masks.removeMask(sameAddr ? this.regDate.value : this.liveDate.value, 10);
        passport.birthPlace = this.birthplace.value;
        passport.code = this.issuingAuthorityCode.value;
        passport.emitent = this.issuingAuthority.value;
        passport.issueDate = Masks.removeMask(this.issueDate.value, 10);
        passport.registrationDate = Masks.removeMask(this.regDate.value, 10);
        return person;
    }

    private updatePerson() {
        const person = this.getPerson();
        this.updateInProgress$.next(true);
        this.personService.updatePassport(person)
            .subscribe(
                _ => {
                    this.updated = true;
                    this.next();
                }, 
                _ => this.updateInProgress$.next(false)
            );
    }
}
