import { FormGroup, AbstractControl, ValidationErrors } from '@angular/forms';
import { Masks } from './masks';

// using jQuery suggestions, attached in Index.chtml
declare var $: any;

export class FormsHelper {
    public get uniquePhoneError(): ValidationErrors {
        return { message: "Укажите уникальный номер телефона" };
    }
    
    public errorMessage(field: AbstractControl): string {
        return field.errors ? field.errors.message : null;
    }

    public getControlName(c: AbstractControl): string | null {
        if (c == null) {
            return null;
        }

        const formGroup = c.parent.controls;
        return Object.keys(formGroup).find(name => c === formGroup[name]) || null;
    }

    public isFieldInvalid(field: AbstractControl): boolean {
        return typeof field === 'undefined' || field == null
            ? false
            : field.errors && (field.dirty || field.touched);
    }

    public isFieldEmpty(field: AbstractControl): boolean {
        return typeof field === 'undefined' || field == null || field.value === ' '
            ? false
            : field.value === null || field.value === '';
    }

    public isValid(form: FormGroup): boolean {
        for (const field in form.controls) {
            form.get(field).markAsTouched();
            form.get(field).updateValueAndValidity();
        }

        return form.valid;
    }

    //отличается от isValid тем, что не орнетируется на form.Valid, поскольку она некорректно работает
    // - если имеет внутри себя FormArray, выдает false когда все контролы валидны
    public isFormValid(form: FormGroup, isChild = false): boolean {
        let result = true;
        for (const field in form.controls) {
            let control = <any>form.get(field);
            if (control.controls != null) {
                let index = 0;
                while (index < control.controls.length) {
                    result = result && this.isFormValid(control.controls[index], true);
                    index++;
                }
            }
            else {
                control.markAsTouched();
                control.updateValueAndValidity();
                result = result && (control.valid || control.disabled);
            }
        }

        if (!result && !isChild) {
            const errors = document.getElementsByClassName("error");
            if (errors.length > 0)
                errors.item(0).scrollIntoView();
        }

        return result;
    }

    public setFieldValue(field: AbstractControl, value: any) {
        field.setValue(value);
        field.markAsDirty();
        field.updateValueAndValidity();
    }

    public updatePhoneFromJquery(control: AbstractControl, jq: any) {
        
        if (control == null || control.value == null || jq == null || jq.is(":focus"))
            return;

        const controlValue = control.value.replace(/\+| |\-|\(|\)/gi, '').replace(/_/g, '');
        if (controlValue.length != 10)
            return;

        const jqValue = typeof jq.val() != "undefined"
            ? jq.val().replace(/\+| |\-|\(|\)/gi, '').replace(/_/g, '')
            : null;

        if (jqValue != null && jqValue.length == 11 && !isNaN(parseInt(jqValue))) {
            control.setValue(Masks.maskPhone(jqValue));
            control.updateValueAndValidity();
        }
    }
}
