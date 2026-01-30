import React, { useMemo } from 'react';
import Svg, { Rect } from 'react-native-svg';
import { View, Text } from 'react-native';

const CODE128_TABLE = [
    // 0-9
    "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213",
    // 10-19
    "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132",
    // 20-29
    "221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211",
    // 30-39
    "212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313",
    // 40-49
    "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121", "211331",
    // 50-59
    "231131", "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311", "332111",
    // 60-69
    "314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214",
    // 70-79
    "112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111",
    // 80-89
    "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141",
    // 90-99
    "214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311", "113141",
    // 100-106 (Start A, Start B, Start C, Stop)
    "114131", "311141", "411131", "211412", "211214", "211232", "2331112"
];

// Start Code B is index 104
const START_CODE_B = 104;
const STOP_CODE = 106;

export default function Code128Barcode({ value, width = 300, height = 80, color = "black" }) {
    if (!value) return null;
    const text = String(value);

    const bars = useMemo(() => {
        // Simple implementation utilizing Set B (covers ASCII 32-127)
        // Does not optimize with Set C (double digits) for simplicity but works for all standard cards.

        let checksum = START_CODE_B;
        let patterns = [CODE128_TABLE[START_CODE_B]]; // Start pattern

        for (let i = 0; i < text.length; i++) {
            const charCode = text.charCodeAt(i);
            let code128Index = charCode - 32; // ASCII space is 32, maps to index 0 in Set B

            // Safety check
            if (code128Index < 0 || code128Index > 95) code128Index = 0; // Replace invalid with space

            checksum += code128Index * (i + 1);
            patterns.push(CODE128_TABLE[code128Index]);
        }

        // Checksum modulo 103
        checksum = checksum % 103;
        patterns.push(CODE128_TABLE[checksum]);

        // Stop code
        patterns.push(CODE128_TABLE[STOP_CODE]);

        // Render Bars
        // Each pattern string e.g. "212222" represents widths of Bar, Space, Bar, Space...
        const rects = [];
        let currentX = 0;

        // Calculate total units first to normalize width
        let totalUnits = 0;
        patterns.forEach(pat => {
            for (let char of pat) totalUnits += parseInt(char);
        });

        const unitWidth = width / totalUnits;

        patterns.forEach((pat, pIndex) => {
            for (let i = 0; i < pat.length; i++) {
                const barW = parseInt(pat[i]) * unitWidth;
                // Even index = Bar, Odd index = Space (in the sequence of B-S-B-S-B-S)
                // wait, code 128 pattern string is: B S B S B S (6 elements)
                // Stop code has 7 elements: B S B S B S B

                if (i % 2 === 0) { // Bar
                    rects.push(
                        <Rect
                            key={`${pIndex}-${i}`}
                            x={currentX}
                            y={0}
                            width={barW + 0.5}
                            height={height}
                            fill={color}
                        />
                    );
                }
                currentX += barW;
            }
        });

        return rects;
    }, [value, width, height, color]);

    return (
        <View style={{ width, height, alignItems: 'center', justifyContent: 'center' }}>
            <Svg width={width} height={height}>
                {bars}
            </Svg>
        </View>
    );
}
