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
