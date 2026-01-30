import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

export function NoteWidget({ average, averageLabel, nextLesson, nextRoom, nextTime, barcode }) {
    return (
        <FlexWidget
            style={{
                height: 'match_parent',
                width: 'match_parent',
                backgroundColor: '#1e1b4b', // Deep Cosmic Blue
                borderRadius: 24,
                padding: 16,
                flexDirection: 'column',
                justifyContent: 'space-between'
            }}
        >
            {/* Header / Brand */}
            <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <TextWidget
                    text="NotiaNote"
                    style={{
                        fontSize: 13,
                        fontWeight: 'bold',
                        color: '#818cf8', // Indigo light
                        letterSpacing: 0.5
                    }}
                />
                <TextWidget
                    text={nextTime || ""}
                    style={{ fontSize: 11, color: '#94a3b8' }}
                />
            </FlexWidget>

            {/* Content Row: Average and Barcode Side-by-Side */}
            <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flex: 1 }}>

                {/* Left: Average */}
                <FlexWidget style={{ flexDirection: 'column' }}>
                    <TextWidget
                        text={averageLabel || "Moyenne"}
                        style={{ fontSize: 10, color: '#94a3b8', marginBottom: 2 }}
                    />
                    <FlexWidget style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                        <TextWidget
                            text={average || "--"}
                            style={{
                                fontSize: 30,
                                fontWeight: 'bold',
                                color: '#ffffff'
                            }}
                        />
                        <TextWidget
                            text="/20"
                            style={{
                                fontSize: 13,
                                color: '#818cf8',
                                marginLeft: 4
                            }}
                        />
                    </FlexWidget>
                </FlexWidget>

                {/* Right: Canteen Badge (if available) */}
                {barcode ? (
                    <FlexWidget style={{
                        flexDirection: 'column',
                        alignItems: 'center',
                        backgroundColor: 'rgba(255,255,255,0.08)',
                        borderRadius: 12,
                        padding: 8,
                        minWidth: 80
                    }}>
                        <TextWidget
                            text="CANTINE"
                            style={{ fontSize: 9, fontWeight: 'bold', color: '#f87171', marginBottom: 4 }}
                        />
                        <TextWidget
                            text={barcode}
                            style={{
                                fontSize: 14,
                                fontWeight: 'bold',
                                color: '#ffffff',
                                letterSpacing: 2
                            }}
                        />
                    </FlexWidget>
                ) : null}
            </FlexWidget>

            {/* Footer: Next Lesson */}
            <FlexWidget style={{
                backgroundColor: 'rgba(255,255,255,0.05)',
                borderRadius: 14,
                padding: 10,
                marginTop: 10
            }}>
                <TextWidget
                    text={nextLesson || "Aucun cours"}
                    style={{
                        fontSize: 13,
                        fontWeight: 'bold',
                        color: '#ffffff'
                    }}
                    maxLines={1}
                />
                <TextWidget
                    text={nextRoom ? `Salle ${nextRoom}` : "Libre"}
                    style={{
                        fontSize: 10,
                        color: '#94a3b8',
                        marginTop: 2
                    }}
                />
            </FlexWidget>

        </FlexWidget>
    );
}
