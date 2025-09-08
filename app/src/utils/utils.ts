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
