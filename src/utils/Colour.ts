class Colour {
    constructor(public r: number, public g: number, public b: number) { }

    // calar multiplication
    multiply(scalar: number): Colour {
        return new Colour(
            Math.min(255, this.r * scalar),  // Ensuring the value stays within 0-255
            Math.min(255, this.g * scalar),
            Math.min(255, this.b * scalar)
        );
    }

    delta(other: Colour): Colour {
        return new Colour(
            this.r - other.r,
            this.g - other.g,
            this.b - other.b
        );
    }

    add(other: Colour): Colour {
        return new Colour(
            this.r + other.r,
            this.g + other.g,
            this.b + other.b
        );
    }

    // CSS-friendly rgb string
    toCss(): string {
        return `rgb(${Math.round(this.r)}, ${Math.round(this.g)}, ${Math.round(this.b)})`;
    }
}

export default Colour;
