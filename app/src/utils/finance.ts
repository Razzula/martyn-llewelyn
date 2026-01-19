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
