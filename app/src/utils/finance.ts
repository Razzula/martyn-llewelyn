export function calculateAER(grossRate: number, payoutInterval: number): number {
    const grossRateDecimal = grossRate / 100;
    const compoundingPeriodsPerYear = 12 / payoutInterval;

    return (
        Math.pow(
            (1 + (grossRateDecimal / compoundingPeriodsPerYear)),
            compoundingPeriodsPerYear
        ) - 1
    ) * 100;
}

export function toFinancialString(
    value: number | string,
    currency?: string,
): string {
    const symbol = getCurrencySymbol(currency);
    try {
        const formatted = value.toLocaleString('en-GB', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
    
        return symboliseString(formatted, symbol);
    }
    catch {
        // invalid / unsupported currency code
    }

    // fallback
    let formatted = typeof value === 'number' ?
        value.toFixed(2)
        : value;
    return symboliseString(formatted, symbol);
}

function symboliseString(value: string, currency: string): string {
    if (['€', 'CHF'].includes(currency)) {
        return `${value}${currency ? '\u00A0' : ''}${currency}`;
    }
    return `${currency}${currency ? '\u00A0' : ''}${value}`
}

export function asSortCode(input: string): string {
    return input
        .replace(/[^\d-]/g, '') // remove anything that's not digit or hyphen
        .replace(/-/g, '') // remove existing hyphens
        .slice(0, 6) // limit to 6 digits
        .replace(/(.{2})/g, '$1-') // insert hyphen after every 2 digits
        .replace(/-$/, ''); // remove trailing hyphen
}

export function getCurrencySymbol(currency: string | undefined): string {
    switch (currency) {
        case 'GBP':
            return '£';
        case 'EUR':
            return '€';
        case 'USD':
            return '$';
        default:
            return currency || '';
    }
}

export function getCurrencyFromSymbol(currencySymbol: string): string | undefined {
    switch (currencySymbol) {
        case '£':
            return 'GBP';
        case '€':
            return 'EUR';
        case '$':
            return 'USD';
        default:
            return undefined;
    }
}

export function getCurrencySymbolFromCountry(country: string): string | null {
    if (country === 'uk') {
        return getCurrencySymbol('GBP');
    }
    else if (['fr', 'de', 'it'].includes(country)) {
        return getCurrencySymbol('GBP');
    }
    else if (country === 'ch') {
        return getCurrencySymbol('CHF');
    }
    return null;
}

export function parseFinancialToNumeric(financeStr: string): {
    value: number,
    currencySymbol?: string,
} {
    const stripped = financeStr.replace(/,/g, '');
    // raw number
    const numeric = parseFloat(stripped);
    if (!Number.isNaN(numeric)) {
        return { value: numeric };
    }
    
    // MIDATA 'Debit/Credit' / 'Balance'
    const match = /^[+-]?([^\d])?(\d+(?:\.\d{1,2})?)$/.exec(stripped);
    if (match) {
        try {
            const numeric = parseFloat(match[2]);
            return {
                value: numeric * (financeStr.startsWith('-') ? -1 : 1),
                currencySymbol: match[1],
            }
        }
        catch (err) {
            // continue with other checks
        }
    }

    // fallback
    return { value: Number.NaN };
}
