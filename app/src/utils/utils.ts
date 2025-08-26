import { openUrl } from "@tauri-apps/plugin-opener";

export async function openInBrowser(uri: string | null) {
    if (uri) {
        await openUrl(uri);
    }
}

export const isTauri = !!(window as any).__TAURI_INTERNALS__;

export function toFinancialString(value: number): string {
    return value.toLocaleString('en-GB', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

export function asSortCode(input: string): string {
    return input
        .replace(/[^\d-]/g, '') // remove anything that's not digit or hyphen
        .replace(/-/g, '') // remove existing hyphens
        .slice(0, 6) // limit to 6 digits
        .replace(/(.{2})/g, '$1-') // insert hyphen after every 2 digits
        .replace(/-$/, ''); // remove trailing hyphen
}

export function getMonthName(month: string): string {
    const monthNumber = parseInt(month, 10);
    if (isNaN(monthNumber) || monthNumber < 1 || monthNumber > 12) {
        return month; // return as-is if invalid
    }
    return new Date(0, monthNumber - 1).toLocaleString('en-GB', { month: 'long' });
}

export function getOrdinalSuffix(cardinal: number): string {
    if (cardinal >= 11 && cardinal <= 13) {
        return 'th';
    }
    switch (cardinal % 10) {
        case 1: return 'st';
        case 2: return 'nd';
        case 3: return 'rd';
        default: return 'th';
    }
}
