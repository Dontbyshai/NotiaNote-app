import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Modal, KeyboardAvoidingView, Platform, Dimensions } from "react-native";
import { BlurView } from "expo-blur";
import { XIcon, CheckIcon } from "lucide-react-native";

import { useGlobalAppContext } from "../../../util/GlobalAppContext";
import MarksHandler from "../../../core/MarksHandler";
import { useCurrentAccountContext } from "../../../util/CurrentAccountContext";
import { useAppStackContext } from "../../../util/AppStackContext";

function AddMarkModal({ visible, onClose, subject, periodID }) {
    const { theme } = useGlobalAppContext();
    const { accountID } = useCurrentAccountContext();
    const { updateGlobalDisplay } = useAppStackContext();

    const [value, setValue] = useState("");
    const [scale, setScale] = useState("20");
    const [coef, setCoef] = useState("1");
    const [name, setName] = useState("Simulation");

    const handleSave = async () => {
        if (!value || isNaN(parseFloat(value))) return;

        const markData = {
            id: `sim_${Date.now()}`,
            value: parseFloat(value),
            scale: parseFloat(scale) || 20,
            coefficient: parseFloat(coef) || 1,
            title: name,
            subjectID: subject.id,
            periodID: periodID,
            date: new Date(),
            isSimulated: true,
            isEffective: true,
        };

        // Call MarksHandler to save (WE NEED TO IMPLEMENT THIS METHOD)
        await MarksHandler.addSimulatedMark(accountID, markData);

        // Refresh UI
        await MarksHandler.recalculateAverageHistory(accountID);
        updateGlobalDisplay();

        onClose();
        setValue("");
    };

    return (
        <Modal
            animationType="fade"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
            >
                <BlurView intensity={20} tint="dark" style={{ position: 'absolute', width: '100%', height: '100%' }} />
                <TouchableOpacity style={{ position: 'absolute', width: '100%', height: '100%' }} onPress={onClose} />

                <View style={{
                    width: Dimensions.get('window').width * 0.85,
                    backgroundColor: '#1E293B',
                    borderRadius: 24,
                    padding: 20,
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.1)',
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 10 },
                    shadowOpacity: 0.5,
                    shadowRadius: 20,
                    elevation: 10
                }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                        <Text style={{ color: '#FFF', fontSize: 18, fontFamily: 'Text-Bold', fontWeight: 'bold' }}>
                            Ajouter une note
                        </Text>
                        <TouchableOpacity onPress={onClose} style={{ padding: 5 }}>
                            <XIcon size={24} color="#94A3B8" />
                        </TouchableOpacity>
                    </View>

                    {/* Inputs */}
                    <View style={{ gap: 15 }}>
                        <View>
                            <Text style={{ color: '#94A3B8', fontSize: 12, marginBottom: 5 }}>Note</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                <TextInput
                                    value={value}
                                    onChangeText={setValue}
                                    keyboardType="numeric"
                                    placeholder="15"
                                    placeholderTextColor="#475569"
                                    style={{
                                        flex: 1, backgroundColor: '#0F172A', color: '#FFF',
                                        padding: 12, borderRadius: 12, fontSize: 16, fontFamily: 'Text-Bold'
                                    }}
                                    autoFocus
                                />
                                <Text style={{ color: '#64748B', fontSize: 20 }}>/</Text>
                                <TextInput
                                    value={scale}
                                    onChangeText={setScale}
                                    keyboardType="numeric"
                                    placeholder="20"
                                    placeholderTextColor="#475569"
                                    style={{
                                        width: 60, backgroundColor: '#0F172A', color: '#FFF',
                                        padding: 12, borderRadius: 12, fontSize: 16, fontFamily: 'Text-Bold', textAlign: 'center'
                                    }}
                                />
                            </View>
                        </View>

                        <View>
                            <Text style={{ color: '#94A3B8', fontSize: 12, marginBottom: 5 }}>Coefficient</Text>
                            <TextInput
                                value={coef}
                                onChangeText={setCoef}
                                keyboardType="numeric"
                                placeholder="1"
                                placeholderTextColor="#475569"
                                style={{
                                    backgroundColor: '#0F172A', color: '#FFF',
                                    padding: 12, borderRadius: 12, fontSize: 16, fontFamily: 'Text-Bold'
                                }}
                            />
                        </View>

                        <View>
                            <Text style={{ color: '#94A3B8', fontSize: 12, marginBottom: 5 }}>Nom (Optionnel)</Text>
                            <TextInput
                                value={name}
                                onChangeText={setName}
                                placeholder="Interro surprise"
                                placeholderTextColor="#475569"
                                style={{
                                    backgroundColor: '#0F172A', color: '#FFF',
                                    padding: 12, borderRadius: 12, fontSize: 16, fontFamily: 'Text-Bold'
                                }}
                            />
                        </View>
                    </View>

                    {/* Buttons */}
                    <TouchableOpacity
                        onPress={handleSave}
                        style={{
                            marginTop: 25,
                            backgroundColor: '#6D28D9',
                            paddingVertical: 15,
                            borderRadius: 16,
                            alignItems: 'center',
                            flexDirection: 'row',
                            justifyContent: 'center',
                            shadowColor: '#6D28D9', shadowOpacity: 0.4, shadowRadius: 10
                        }}
                    >
                        <CheckIcon size={20} color="#FFF" style={{ marginRight: 8 }} />
                        <Text style={{ color: '#FFF', fontSize: 16, fontFamily: 'Text-Bold', fontWeight: 'bold' }}>Ajouter</Text>
                    </TouchableOpacity>

                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

export default AddMarkModal;
