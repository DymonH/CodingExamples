import { ValidatorFn, AbstractControl, FormGroup, ValidationErrors } from '@angular/forms';
import * as moment from 'moment';
import { DadataFIO, DaDataAddress, DadataCompany } from '../models';

export class PersonValidators {
    static address(sameAddressFieldName: string = null, dadataFieldName: string = null, ignore: Function = () => { return false; }): ValidatorFn {
        return (fc: AbstractControl) => {
            if (ignore() == true)
                return null;
                
            if (sameAddressFieldName != null && fc.parent != null && (<FormGroup>fc.parent).get(sameAddressFieldName).value == true)
                return null;

            if (this.isNullOrEmpty(fc.value))
                return { message: "Укажите адрес" };

            return this.dadataAddress(<FormGroup>fc.parent, dadataFieldName);
        }
    }
    
    static appartment(sameAddressFieldName: string = null, noAppartmentFieldName: string = null): ValidatorFn {
        return (fc: AbstractControl) => {
            if (sameAddressFieldName != null && fc.parent != null && (<FormGroup>fc.parent).get(sameAddressFieldName).value == true)
                return null;

            if (fc.parent != null && noAppartmentFieldName != null && (<FormGroup>fc.parent).get(noAppartmentFieldName).value == true)
                return null;

            if (this.isNullOrEmpty(fc.value))
                return { message: "Укажите номер квартиры" };

            if (isNaN(parseInt(fc.value)))
                return { message: "Некорректный номер квартиры" };

            return null;
        }
    }

    static birthDate(ignore: Function = () => { return false; }): ValidatorFn {
        return (fc: AbstractControl) => {
            if (ignore() == true)
                return null;

            return this.date(fc, "Укажите дату рождения");
        }
    }

    static birthPlace(): ValidatorFn {
        return (fc: AbstractControl) => {
            if (this.isNullOrEmpty(fc.value))
                return { message: "Укажите место рождения" };

            return null;
        }
    }

    static children(): ValidatorFn {
        return (fc: AbstractControl) => {
            if (this.isNullOrEmpty(fc.value))
                return { message: "Укажите количество детей" };

            return null;
        }
    }

    static cohabitation(): ValidatorFn {
        return (fc: AbstractControl) => {
            if (this.isNullOrEmpty(fc.value))
                return { message: "Укажите совместное проживание с родственниками" };

            return null;
        }
    }

    static companySphere(ignore: Function = () => { return false; }): ValidatorFn {
        return (fc: AbstractControl) => {
            if (ignore() == true)
                return null;

            if (this.isNullOrEmpty(fc.value))
                return { message: "Укажите сферу деятельности компании" };

            return null;
        }
    }

    static companyTitle(dadataFieldName: string = null, ignore: Function = () => { return false; }): ValidatorFn {
        return (fc: AbstractControl) => {
            if (ignore() == true)
                return null;

            if (this.isNullOrEmpty(fc.value))
                return { message: "Укажите название организации" };

            return this.dadataCompany(<FormGroup>fc.parent, dadataFieldName);
        }
    }

    static costs(): ValidatorFn {
        return (fc: AbstractControl) => {
            if (this.isNullOrEmpty(fc.value))
                return { message: "Укажите расход" };
        }
    }
    
    static customFunction(func: Function): ValidatorFn {
        return (fc: AbstractControl) => {
            return func();
        }
    }

    static dateArrival(sameAddressFieldName: string = null): ValidatorFn {
        return (fc: AbstractControl) => {
            if (sameAddressFieldName != null && fc.parent != null && (<FormGroup>fc.parent).get(sameAddressFieldName).value == true)
                return null;

            return this.date(fc, "Укажите дату начала проживания"); 
        }
    }

    static deliveryDate(): ValidatorFn {
        return (fc: AbstractControl) => {    
            if (fc.value == null)
                return { message: "Укажите дату доставки" };
    
            const value = this.dateRu(fc.value);

            if (value.length < 10 || !moment(value, "DD.MM.YYYY", true).isValid())
                return { message: "Введите дату в формате дд.мм.гггг" };
    
            if (!moment(value, "DD.MM.YYYY").isAfter())
                return { message: "Некорректная дата" };
    
            return null;
        }
    }

    static department(ignore: Function = () => { return false; }): ValidatorFn {
        return (fc: AbstractControl) => {
            if (ignore() == true)
                return null;

            if (this.isNullOrEmpty(fc.value))
                return { message: "Укажите подразделение" };

            return null;
        }
    }
    
    static education(): ValidatorFn {
        return (fc: AbstractControl) => {
            if (this.isNullOrEmpty(fc.value))
                return { message: "Укажите образование" };
        }
    }

    static employmentType(): ValidatorFn {
        return (fc: AbstractControl) => {
            if (this.isNullOrEmpty(fc.value))
                return { message: "Укажите тип занятости" };
        }
    }

    static email(dadataFieldName: string = null): ValidatorFn {
        return (fc: AbstractControl) => {
            if (this.isNullOrEmpty(fc.value))
                return { message: "Укажите адрес электронной почты" };

            return this.dadataEmail(<FormGroup>fc.parent, dadataFieldName);
        }
    }

    static fio(dadataFieldName: string = null, ignore: Function = () => { return false; }): ValidatorFn {
        return (fc: AbstractControl) => {
            if (ignore() == true)
                return null;

            if (this.isNullOrEmpty(fc.value))
                return { message: "Укажите фамилию, имя и отчество" };
            
            return this.dadataFio(<FormGroup>fc.parent, dadataFieldName);
        }
    }

    static income(): ValidatorFn {
        return (fc: AbstractControl) => {
            if (this.isNullOrEmpty(fc.value))
                return { message: "Укажите доход" };
        }
    }

    static maritalStatus(): ValidatorFn {
        return (fc: AbstractControl) => {
            if (this.isNullOrEmpty(fc.value))
                return { message: "Укажите семейное положение" };

            return null;
        }
    }

    static marriageDate(message: Function = () => { return null; }, ignore: Function = () => { return false; }): ValidatorFn {
        return (fc: AbstractControl) => {
            if (ignore() == true)
                return null;
            
            return this.date(fc, message());
        }
    }

    static passport(): ValidatorFn {
        return (fc: AbstractControl) => {
            if (this.isNullOrEmpty(fc.value))
                return { message: "Укажите серию и номер паспорта" };

            const value = fc.value.replace(/[^0-9]/g, '');
            if (value.length < 10)
                return { message: "Некорректный номер паспорта" };

            return null;
        }
    }

    static passportCode(dadataFieldName: string = null): ValidatorFn {
        return (fc: AbstractControl) => {
            if (this.isNullOrEmpty(fc.value))
                return { message: "Укажите код подразделения" };

            return this.dadataPassport(<FormGroup>fc.parent, dadataFieldName);
        }
    }

    static passportDate(): ValidatorFn {
        return (fc: AbstractControl) => {
            return this.date(fc, "Укажите дату выдачи");
        }
    }

    static passportIssuer(): ValidatorFn {
        return (fc: AbstractControl) => {
            if (this.isNullOrEmpty(fc.value))
                return { message: "Укажите, кем выдан паспорт" };
        }
    }

    static password(): ValidatorFn {
        return (fc: AbstractControl) => {
            if (fc.value == null || fc.value.length == 0)
                return { message: "Укажите пароль" };

            return null;
        }
    }

    static phone(sameAddressFieldName: string = null, noPhoneFieldName: string = null, ignore: Function = () => { return false; }): ValidatorFn {
        return (fc: AbstractControl) => {
            if (ignore() == true)
                return null;

            if (sameAddressFieldName != null && fc.parent != null && (<FormGroup>fc.parent).get(sameAddressFieldName).value == true)
                return null;

            if (fc.parent != null && noPhoneFieldName != null && (<FormGroup>fc.parent).get(noPhoneFieldName).value == true)
                return null;

            if (this.isNullOrEmpty(fc.value))
                return { message: "Укажите номер телефона" };

            const value = fc.value.replace(/\+| |\-|\(|\)/gi, '').replace(/_/g, '');
            if (isNaN(parseInt(value)) || value.length < 11)
                return { message: "Некорректный номер телефона" };

            return null;
        }
    }

    static position(ignore: Function = () => { return false; }): ValidatorFn {
        return (fc: AbstractControl) => {
            if (ignore() == true)
                return null;

            if (this.isNullOrEmpty(fc.value))
                return { message: "Укажите должность" };

            return null;
        }
    }

    static registrationDate(): ValidatorFn {
        return (fc: AbstractControl) => {
            return this.date(fc, "Укажите дату регистрации");
        }
    }

    static relation(ignore: Function = () => { return false; }): ValidatorFn {
        return (fc: AbstractControl) => {
            if (ignore() == true)
                return null;

            if (this.isNullOrEmpty(fc.value))
                return { message: "Укажите отношение контактного лица к заемщику" };

            return null;
        }
    }
    
    static residence() {
        return (fc: AbstractControl) => {
            if (fc.value == null || fc.value.length == 0)
                return { message: "Укажите город проживания" };

            if (fc.value.length > 40)
                return { message: "Превышено максимальное количество символов - 50" };

            return null;
        }
    }

    static snils() {
        return (fc: AbstractControl) => {
            if (this.isNullOrEmpty(fc.value))
                return null;

            const value = fc.value.replace(/[^0-9]/g, '');
            if (value.length < 11)
                return { message: "Некорректный СНИЛС" };

            return null;
        }
    }

    static smsCode(): ValidatorFn {
        return (fc: AbstractControl) => {
            if (this.isNullOrEmpty(fc.value))
                return { message: "Укажите код" };

            const value = fc.value.replace(/\+| |\-|\(|\)/gi, '').replace(/_/g, '');
            if (isNaN(parseInt(value)) || value.length < 6)
                return { message: "Некорректный код" };

            return null;
        }
    }

    static workExperience(ignore: Function = () => { return false; }): ValidatorFn {
        return (fc: AbstractControl) => {
            if (ignore() == true)
                return null;

            if (this.isNullOrEmpty(fc.value))
                return { message: "Укажите трудовой стаж" };
        }
    }

    static workStartDate(ignore: Function = () => { return false; }): ValidatorFn {
        return (fc: AbstractControl) => {
            if (ignore() == true)
                return null;

            if (this.isNullOrEmpty(fc.value))
                return { message: "Укажите дату начала работы" };

            let value = <string>fc.value.replace(/_/g, '');

            //HACK AK - иногда textMask позволяет один лишний символ, хз в чом причина, в дебаггере лес
            if (value.length > 7)
                value = value.substr(0, 7);

            if (value.length < 7 || !moment(value, "MM.YYYY", true).isValid())
                return { message: "Введите дату в формате мм.гггг" };
            
            if (moment(value, "MM.YYYY").isAfter())
                return { message: "Некорректная дата" };
        }
    }
    
    private static dadataAddress(fc: FormGroup, dadataFieldName: string): ValidationErrors {
        if (fc != null && dadataFieldName != null) {
            const addressDadata = <DaDataAddress>fc.get(dadataFieldName).value;
            if (addressDadata == null || this.isNullOrEmpty(addressDadata.house))
                return { message: "Выберите адрес из выпадающего списка" };
        }

        return null;
    }
    
    private static dadataCompany(fc: FormGroup, dadataFieldName: string): ValidationErrors {
        if (fc != null && dadataFieldName != null) {
            const dadata = <DadataCompany>fc.get(dadataFieldName).value;
            if (dadata == null || dadata.name == null || (dadata.name.short_with_opf == null && dadata.name.full_with_opf == null))
                return { message: "Выберите название организации из выпадающего списка" };
        }

        return null;
    }
    
    private static dadataEmail(fc: FormGroup, dadataFieldName: string): ValidationErrors {
        if (fc != null && dadataFieldName != null) {
            const emailDadata = fc.get(dadataFieldName).value;
            if (this.isNullOrEmpty(emailDadata))
                return { message: "Выберите адрес электронной почты из выпадающего списка" };
        }

        return null;
    }

    private static dadataFio(fc: FormGroup, dadataFieldName: string): ValidationErrors {
        if (fc != null && dadataFieldName != null) {
            const fioDadata = <DadataFIO>fc.get(dadataFieldName).value;
            if (fioDadata == null || fioDadata.name == null || fioDadata.surname == null || fioDadata.patronymic == null)
                return { message: "Выберите фамилию, имя и отчество из выпадающего списка" };
        }

        return null;
    }
    
    private static dadataPassport(fc: FormGroup, dadataFieldName: string): ValidationErrors {
        if (fc != null && dadataFieldName != null) {
            const passportDadata = fc.get(dadataFieldName).value;
            if (this.isNullOrEmpty(passportDadata))
                return { message: "Выберите код подразделения из выпадающего списка" };
        }

        return null;
    }

    private static date(fc: AbstractControl, message = null) {
        if (typeof message === "undefined" || message == null)
            message = "Укажите дату";

        if (this.isNullOrEmpty(fc.value))
            return { message: message };

        const value = fc.value.replace(/_/g, '');
        if (value.length < 10 || !moment(value, "DD.MM.YYYY", true).isValid())
            return { message: "Введите дату в формате дд.мм.гггг" };

        if (moment(value, "DD.MM.YYYY").isAfter())
            return { message: "Некорректная дата" };

        return null;
    }

    private static dateRu(date: Date): string {
        return date.toLocaleString('ru-RU', { timeZone: 'UTC', year: 'numeric', month: '2-digit', day: '2-digit' });
    }

    private static isNullOrEmpty(value: string): boolean {
        return value == null || value.length == 0;
    }
}