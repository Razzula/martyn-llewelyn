export function isMobile() {
    return /Mobi|Android/i.test(navigator.userAgent);
}

export function isInIframe() {
    try {
        return window.self !== window.top;
    } catch {
        return true; // cross-origin iframe
    }
}

export function getMonthName(month: string): string {
    const monthNumber = parseInt(month, 10);
    if (isNaN(monthNumber) || monthNumber < 1 || monthNumber > 12) {
        return month; // return as-is if invalid
    }
    return new Date(0, monthNumber - 1).toLocaleString('en-GB', { month: 'long' });
}

export function getOrdinalSuffix(cardinal: number): string {
    if (String(cardinal).length > 1) {
        // only care about last two digits
        cardinal = parseInt(String(cardinal).slice(-2), 10);
    }

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

/**
 * Get the most recent Sunday from a given date (or today if not given).
 * `allowFrom` allows returning the given date if it is a Sunday, else
 * the previous Sunday will be returned.
 */
export function getMostRecentSunday(from?: Date, allowFrom?: boolean): Date {
    const date = from ?? new Date();
    const day = date.getDay(); // 0 = Sunday
    const diff = allowFrom ? day : (day === 0 ? 7 : day); // if today is Sunday, go back a week
    date.setDate(date.getDate() - diff);
    date.setHours(0, 0, 0, 0);
    return date;
}

export function isString(value: string | number): value is string {
    return typeof value === 'string';
}

export function isEmptyString(value?: string): boolean {
    return value === undefined || value.trim() === '';
}

export function hasValue(value: string | number | null | undefined): boolean {
    if (value === null || value === undefined) {
        return false;
    }
    if (typeof value === 'string') {
        return value.trim() !== '';
    }
    return true;
}

export function isOlderThanMinutes(date: Date, minutes: number) {
    return (Date.now() - date.getTime()) > minutes * 60 * 1000;
}

export function isFutureDate(date?: string | null): boolean {
    return !date || isNaN(Date.parse(date)) || new Date(date) > new Date();
}

export function toYYYYMMDDFromDate(date: Date): string {
    return date.toISOString().slice(0, 10);
}

export function toYYYYMMDDFromISO(iso: string): string {
    return iso.slice(0, 10);
}

export function parseDateStringToISO(dateStr: string): string | undefined {
    let date: Date | null = null;
    // DD/MM/YYYY
    if (/^\d{2}[\/\-\.\s]\d{2}[\/\-\.\s]\d{4}$/.test(dateStr)) {
        const [d, m, y] = dateStr.split('/');
        date = new Date(`${y}-${m}-${d}T00:00:00Z`);
    }
    // YYYY/MM/DD
    if (/^\d{4}[\/\-\.\s]\d{2}[\/\-\.\s]\d{2}$/.test(dateStr)) {
        date = new Date(dateStr + 'T00:00:00Z');
    }
    // DD MMM YYYY (e.g. 26 Jan 2026)
    if (/^\d{2} \w{3} \d{4}$/.test(dateStr)) {
        const [day, monthStr, year] = dateStr.split(' ');
        const month = {
            Jan: '01', Feb: '02', Mar: '03', Apr: '04',
            May: '05', Jun: '06', Jul: '07', Aug: '08',
            Sep: '09', Oct: '10', Nov: '11', Dec: '12'
        }[monthStr];
        if (month) {
            date = new Date(`${year}-${month}-${day}T00:00:00Z`);
        }
    }

    if (date && !isNaN(date.getTime())) {
        try {
            return date.toISOString().replace('.000', '');
        }
        catch (err) {
            console.error(err);
        }
    }
    // fallback
    return undefined;

}
