/**
 * ZincFormatter - Domain Utility
 * 
 * Handles the formatting of Zinc (Ƶ) currency into SI-style units.
 * "Like Bitcoin but for thousands" -> metric scaling.
 * 
 * Units:
 * pƵ (pico)  = 1e-12
 * nƵ (nano)  = 1e-9
 * µƵ (micro) = 1e-6
 * mƵ (milli) = 1e-3
 * Ƶ  (base)  = 1
 * kƵ (kilo)  = 1e3
 * MƵ (mega)  = 1e6
 */
export class ZincFormatter {
    static format(value: number): { value: string, unit: string } {
        if (value === 0) return { value: '0.00', unit: 'µƵ' };

        const absVal = Math.abs(value);

        // Micro-Zinc (Start small like Sats)
        if (absVal < 1e-6) {
            return { value: (value * 1e9).toFixed(2), unit: 'nƵ' };
        }
        if (absVal < 1e-3) {
            return { value: (value * 1e6).toFixed(2), unit: 'µƵ' };
        }
        if (absVal < 1) {
            return { value: (value * 1e3).toFixed(2), unit: 'mƵ' };
        }
        if (absVal < 1e3) {
            return { value: value.toFixed(2), unit: 'Ƶ' };
        }
        if (absVal < 1e6) {
            return { value: (value / 1e3).toFixed(2), unit: 'kƵ' };
        }
        return { value: (value / 1e6).toFixed(2), unit: 'MƵ' };
    }

    static formatFull(value: number): string {
        const { value: val, unit } = this.format(value);
        return `${val} ${unit}`;
    }
}
