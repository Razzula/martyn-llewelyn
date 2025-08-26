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
