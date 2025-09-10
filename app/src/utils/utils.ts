export function isMobile() {
    return /Mobi|Android/i.test(navigator.userAgent);
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
export function getMostRecentSunday(from?: Date, allowFrom?: boolean ): Date {
    const date = from ?? new Date();
    const day = date.getDay(); // 0 = Sunday
    const diff = allowFrom ? day : (day === 0 ? 7 : day); // if today is Sunday, go back a week
    date.setDate(date.getDate() - diff);
    date.setHours(0, 0, 0, 0);
    return date;
}

export function toYYYYMMDD(date: Date): string {
    return date.toISOString().slice(0, 10);
}
