import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'currencyRU' })
export class CurrencyRuPipe implements PipeTransform {
    transform(value: number, fractionDigitsCount: number = 0): string {
        if (value != null) {
            return value.toLocaleString('RU', {
                minimumFractionDigits: fractionDigitsCount,
                maximumFractionDigits: fractionDigitsCount
            });
        }

        return null;
    }
}
