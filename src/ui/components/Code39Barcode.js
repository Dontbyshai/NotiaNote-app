import React from 'react';
import Svg, { Rect } from 'react-native-svg';
import { View, Text } from 'react-native';

const PATTERNS = {
    '0': 'NNNWWNWNN', '1': 'WNNWNNNNW', '2': 'NNWWNNNNW', '3': 'WNWWNNNNN',
    '4': 'NNNWWNNNW', '5': 'WNNWWNNNN', '6': 'NNWWWNNNN', '7': 'NNNWNNWNW',
    '8': 'WNNWNNWNN', '9': 'NNWWNNWNN', 'A': 'WNNNNWNNW', 'B': 'NNWNNWNNW',
    'C': 'WNWNNWNNN', 'D': 'NNNNWWNNW', 'E': 'WNNNWWNNN', 'F': 'NNWNWWNNN',
    'G': 'NNNNNWWNW', 'H': 'WNNNNWWNN', 'I': 'NNWNNWWNN', 'J': 'NNNNWWWNN',
    'K': 'WNNNNNNWW', 'L': 'NNWNNNNWW', 'M': 'WNWNNNNWN', 'N': 'NNNNWNNWW',
    'O': 'WNNNWNNWN', 'P': 'NNWNWNNWN', 'Q': 'NNNNNNWWW', 'R': 'WNNNNNWWN',
    'S': 'NNWNNNWWN', 'T': 'NNNNWNWWN', 'U': 'WWNNNNNNW', 'V': 'NWWNNNNNW',
    'W': 'WWWNNNNNN', 'X': 'NWNNWNNNW', 'Y': 'WWNNWNNNN', 'Z': 'NWWNWNNNN',
    '-': 'NWNNNNWNW', '.': 'WWNNNNWNN', ' ': 'NWWNNNWNN', '*': 'NWNNWNWNN',
    '$': 'NWNWNWNNN', '/': 'NWNWNNNWN', '+': 'NWNNNWNWN', '%': 'NNNWNWNWN'
};

export default function Code39Barcode({ value, width = 300, height = 80, color = "black" }) {
    if (!value) return null;

    const text = "*" + String(value).toUpperCase().replace(/[^0-9A-Z-. $/+%]/g, "") + "*";
    const narrow = 1;
    const wide = 2.5; // Wide bar ratio
    const gap = 1; // Inter-character gap

    let totalUnits = 0;
    const bars = [];

    // First pass: calculate total width in units
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const pat = PATTERNS[char] || PATTERNS[' '];
        for (let j = 0; j < 9; j++) {
            totalUnits += (pat[j] === 'W' ? wide : narrow);
        }
        if (i < text.length - 1) totalUnits += gap;
    }

    const unitWidth = width / totalUnits;
    let currentX = 0;

    // Second pass: generate bars
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const pat = PATTERNS[char] || PATTERNS[' '];

        for (let j = 0; j < 9; j++) {
            const isBar = j % 2 === 0; // Even indices are bars, odd are spaces
            const w = (pat[j] === 'W' ? wide : narrow) * unitWidth;

            if (isBar) {
                bars.push(
                    <Rect
                        key={`${i}-${j}`}
                        x={currentX}
                        y={0}
                        width={w + 0.5} // Slight overlap to avoid gaps anti-aliasing
                        height={height}
                        fill={color}
                    />
                );
            }
            currentX += w;
        }
        currentX += gap * unitWidth;
    }

    return (
        <View style={{ width, height, alignItems: 'center', justifyContent: 'center' }}>
            <Svg width={width} height={height}>
                {bars}
            </Svg>
        </View>
    );
}
