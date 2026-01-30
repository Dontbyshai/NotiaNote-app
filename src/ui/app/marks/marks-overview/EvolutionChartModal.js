import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, Dimensions, TouchableWithoutFeedback } from "react-native";
import { BlurView } from "expo-blur";
import { X } from "lucide-react-native";
// Note: Assuming ' LineChart ' is the export. If not, I might need to adjust.
// If the package is 'react-native-simple-line-chart', it might import as default or named.
// I'll try generic usage or fallback to a simple SVG implementation if I fail to verify API.
// Given strict instructions not to crash, I will implement a CUSTOM SVG CHART using react-native-svg which is definitely installed.

import Svg, { Path, Line, Text as SvgText, Circle, Defs, LinearGradient, Stop, G, Rect } from 'react-native-svg';
import { useGlobalAppContext } from '../../../../util/GlobalAppContext';

// Helper to create smooth Bezier path
const getSmoothPath = (data, scaleX, scaleY, valueKey) => {
    if (data.length === 0) return "";
    const points = data.map((d, i) => ({ x: scaleX(i), y: scaleY(d[valueKey]) }));

    if (points.length < 2) return "";

    let d = `M ${points[0].x} ${points[0].y}`;

    for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[i > 0 ? i - 1 : i];
        const p1 = points[i];
        const p2 = points[i + 1];
        const p3 = points[i + 2] || p2;

        const cp1x = p1.x + (p2.x - p0.x) * 0.15; // Tension 0.15
        const cp1y = p1.y + (p2.y - p0.y) * 0.15;
        const cp2x = p2.x - (p3.x - p1.x) * 0.15;
        const cp2y = p2.y - (p3.y - p1.y) * 0.15;

        d += ` C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${p2.x} ${p2.y}`;
    }
    return d;
};

function EvolutionChartModal({ visible, onClose, data }) {
    const { theme } = useGlobalAppContext();
    const [selectedPoint, setSelectedPoint] = useState(null);

    if (!data || data.length < 2) return null;

    const width = Dimensions.get('window').width - 40;
    const height = 250; // Taller like image
    const padding = 30; // More space for labels

    // Normalize data
    const validData = data.filter(d => d.value !== undefined);
    if (validData.length < 2) return null;

    // Calculate Dynamic Min/Max
    let minVal = 20;
    let maxVal = 0;
    validData.forEach(d => {
        if (d.value < minVal) minVal = d.value;
        if (d.value > maxVal) maxVal = d.value;
        if (d.classValue !== undefined) {
            if (d.classValue < minVal) minVal = d.classValue;
            if (d.classValue > maxVal) maxVal = d.classValue;
        }
    });

    // Add padding to range
    minVal = Math.max(0, minVal - 0.5);
    maxVal = Math.min(20, maxVal + 0.5);

    const range = maxVal - minVal;

    const scaleX = (index) => (index / (validData.length - 1)) * (width - 2 * padding) + padding + 10; // Shift right for Y labels
    const scaleY = (value) => height - padding - ((value - minVal) / range) * (height - 2 * padding);

    // Generate Smooth Paths
    // Student
    const studentPath = getSmoothPath(validData, scaleX, scaleY, 'value');
    const studentArea = studentPath + ` L ${scaleX(validData.length - 1)} ${height - padding} L ${scaleX(0)} ${height - padding} Z`;

    // Class (Only if contiguous for simplicity, or filtered)
    // To match image style, we assume data is mostly continuous. 
    // If gaps exist, smoothing might look weird. We'll filter for class path generation.
    const classData = validData.map((d, i) => ({ ...d, originalIndex: i })).filter(d => d.classValue !== undefined);
    // Custom scaleX for class data to map originalIndex
    const scaleXClass = (i) => scaleX(classData[i].originalIndex);

    const classPath = getSmoothPath(classData, scaleXClass, scaleY, 'classValue');
    const classArea = classPath ? (classPath + ` L ${scaleXClass(classData.length - 1)} ${height - padding} L ${scaleXClass(0)} ${height - padding} Z`) : "";


    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <View style={{ flex: 1, justifyContent: "flex-end" }}>
                <BlurView intensity={20} tint="dark" style={{ position: 'absolute', width: '100%', height: '100%' }} />
                <TouchableOpacity style={{ position: 'absolute', width: '100%', height: '100%' }} onPress={onClose} />

                <View style={{
                    backgroundColor: theme.colors.surface, // Dynamic
                    borderTopLeftRadius: 24,
                    borderTopRightRadius: 24,
                    padding: 10,
                    paddingBottom: 40,
                    height: 450, // Increased height for legend
                    borderWidth: 1,
                    borderColor: theme.colors.surfaceOutline,
                }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 10, marginTop: 15 }}>
                        <Text style={{ color: theme.dark ? '#FFFFFF' : '#000000', fontSize: 12, fontFamily: 'Text-Bold', letterSpacing: 1 }}>
                            ÉVOLUTION DE LA MOYENNE GÉNÉRALE
                        </Text>
                        <TouchableOpacity onPress={onClose} style={{ position: 'absolute', right: 10 }}>
                            <X size={24} color="#94A3B8" />
                        </TouchableOpacity>
                    </View>

                    {/* Legend */}
                    <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 15 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 15 }}>
                            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.primary, marginRight: 5 }} />
                            <Text style={{ color: theme.dark ? theme.colors.onSurfaceDisabled : '#000000', fontSize: 11 }}>Votre Moyenne</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#22D3EE', marginRight: 5 }} />
                            <Text style={{ color: theme.dark ? '#94A3B8' : '#000000', fontSize: 11 }}>Classe</Text>
                        </View>
                    </View>

                    <Svg width={width} height={height} onPress={() => setSelectedPoint(null)}>
                        <Defs>
                            <LinearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                                <Stop offset="0" stopColor={theme.colors.primary} stopOpacity="0.8" />
                                <Stop offset="1" stopColor={theme.colors.primary} stopOpacity="0" />
                            </LinearGradient>
                            <LinearGradient id="gradClass" x1="0" y1="0" x2="0" y2="1">
                                <Stop offset="0" stopColor="#06b6d4" stopOpacity="0.6" />
                                <Stop offset="1" stopColor="#06b6d4" stopOpacity="0" />
                            </LinearGradient>
                        </Defs>

                        {/* Grid & Y-Axis Labels (5 lines) */}
                        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                            const val = minVal + range * ratio;
                            const y = scaleY(val);
                            return (
                                <React.Fragment key={ratio}>
                                    <Line
                                        x1={padding + 10}
                                        y1={y}
                                        x2={width - 10}
                                        y2={y}
                                        stroke={theme.dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.1)"}
                                        strokeDasharray="4 4"
                                    />
                                    <SvgText
                                        x={padding}
                                        y={y + 4}
                                        fill="#94A3B8"
                                        fontSize="10"
                                        textAnchor="end"
                                    >
                                        {val.toFixed(2)}
                                    </SvgText>
                                </React.Fragment>
                            );
                        })}

                        {/* Vertical Grid Lines (Based on data length) */}
                        {(() => {
                            // Draw ~6 vertical lines
                            const step = Math.max(1, Math.floor(validData.length / 5));
                            const lines = [];
                            for (let i = 0; i < validData.length; i += step) {
                                const x = scaleX(i);
                                lines.push(
                                    <Line
                                        key={`v-${i}`}
                                        x1={x}
                                        y1={padding}
                                        x2={x}
                                        y2={height - padding}
                                        stroke={theme.dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.1)"}
                                        strokeDasharray="4 4"
                                    />
                                );
                            }
                            return lines;
                        })()}

                        {/* Class Average */}
                        {classPath !== "" && (
                            <>
                                <Path d={classArea} fill="url(#gradClass)" opacity={0.3} />
                                <Path d={classPath} stroke="#22D3EE" strokeWidth="2" fill="none" />
                            </>
                        )}

                        {/* Student Average */}
                        <Path d={studentArea} fill="url(#grad)" opacity={0.6} />
                        <Path d={studentPath} stroke={theme.colors.primary} strokeWidth="3" fill="none" />

                        {/* Dots (Data Points) */}
                        {validData.map((d, i) => (
                            <Circle
                                key={i}
                                onPress={(e) => {
                                    e.stopPropagation(); // Try to stop propagation if supported
                                    setSelectedPoint({
                                        x: scaleX(i),
                                        y: scaleY(d.value),
                                        value: d.value,
                                        classValue: d.classValue,
                                        date: d.date
                                    });
                                }}
                                cx={scaleX(i)}
                                cy={scaleY(d.value)}
                                r={selectedPoint && selectedPoint.date === d.date ? 6 : 3}
                                fill={theme.colors.onSurface}
                                stroke={theme.colors.primary}
                                strokeWidth="2"
                            />
                        ))}

                        {/* X-Axis Date Labels */}
                        {(() => {
                            const step = Math.max(1, Math.floor(validData.length / 5));
                            const labels = [];
                            for (let i = 0; i < validData.length; i += step) {
                                const d = validData[i];
                                const x = scaleX(i);
                                const dateLabel = new Date(d.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
                                labels.push(
                                    <SvgText
                                        key={i}
                                        x={x}
                                        y={height - 10}
                                        fill="#94A3B8"
                                        fontSize="10"
                                        textAnchor="middle"
                                    >
                                        {dateLabel}
                                    </SvgText>
                                );
                            }
                            return labels;
                        })()}

                        {/* Tooltip Overlay */}
                        {selectedPoint && (
                            <G x={selectedPoint.x} y={selectedPoint.y - 60}>
                                <Rect
                                    x="-60"
                                    y="0"
                                    width="120"
                                    height="50"
                                    rx="8"
                                    fill="#1E293B"
                                    stroke="#A78BFA"
                                    strokeWidth="1"
                                />
                                <SvgText x="0" y="15" fill="#FFF" fontSize="12" fontWeight="bold" textAnchor="middle">
                                    {new Date(selectedPoint.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                                </SvgText>
                                <SvgText x="0" y="30" fill="#A78BFA" fontSize="11" textAnchor="middle">
                                    Vous: {selectedPoint.value.toFixed(2)}
                                </SvgText>
                                {selectedPoint.classValue !== undefined && (
                                    <SvgText x="0" y="42" fill="#22D3EE" fontSize="11" textAnchor="middle">
                                        Classe: {selectedPoint.classValue.toFixed(2)}
                                    </SvgText>
                                )}
                            </G>
                        )}
                    </Svg>
                </View>
            </View>
        </Modal>
    );
}

export default EvolutionChartModal;
