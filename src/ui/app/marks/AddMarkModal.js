import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Modal, KeyboardAvoidingView, Platform, Dimensions } from "react-native";
import { BlurView } from "expo-blur";
import { XIcon, CheckIcon } from "lucide-react-native";

import { useGlobalAppContext } from "../../../util/GlobalAppContext";
import MarksHandler from "../../../core/MarksHandler";
import AdsHandler from "../../../core/AdsHandler";
import StorageHandler from "../../../core/StorageHandler";
import { useCurrentAccountContext } from "../../../util/CurrentAccountContext";
import { useAppStackContext } from "../../../util/AppStackContext";

function AddMarkModal({ visible, onClose, subject, periodID, targetAccountID }) {
    const { theme } = useGlobalAppContext();
    const { accountID } = useCurrentAccountContext();
    const { updateGlobalDisplay } = useAppStackContext();

    const [value, setValue] = useState("");
    const [scale, setScale] = useState("20");
    const [coef, setCoef] = useState("1");
    const [name, setName] = useState("Note simulée");

    const handleSave = async () => {
        if (!value || isNaN(parseFloat(value))) return;

        // Show Ad before saving
        AdsHandler.showRewardedAd(
            async () => {
                // On Reward: Save the mark
                let targetID = targetAccountID || accountID;

                // Fallback resolution
                if (!targetID) {
                    const data = await StorageHandler.getData("marks");
                    const availableAccounts = Object.keys(data || {});
                    if (availableAccounts.length > 0) {
                        targetID = availableAccounts[0];
                    }
                }

                if (!targetID) {
                    alert("Erreur: Impossible de trouver le compte pour ajouter la note.");
                    return;
                }

                const markData = {
                    id: `sim_${Date.now()}`,
                    value: parseFloat(value),
                    scale: parseFloat(scale) || 20,
                    coefficient: parseFloat(coef) || 1,
                    title: name || "Note simulée",
                    subjectID: subject.id,
                    periodID: periodID,
                    date: new Date(),
                    isSimulated: true,
                    isEffective: true,
                };

                // Call MarksHandler to save
                await MarksHandler.addSimulatedMark(targetID, markData);

                // Refresh UI
                await MarksHandler.recalculateAverageHistory(targetID);
                updateGlobalDisplay();

                onClose();
                setValue("");
                setName("Note simulée");
            },
            () => {
                // On Closed without reward (optional: maybe just close modal or do nothing)
                // If they close the ad without reward, we usually don't save.
            },
            'create_note'
        );
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
                <BlurView intensity={20} tint={theme.dark ? "dark" : "light"} style={{ position: 'absolute', width: '100%', height: '100%' }} />
                <TouchableOpacity style={{ position: 'absolute', width: '100%', height: '100%' }} onPress={onClose} />

                <View style={{
                    width: Dimensions.get('window').width * 0.85,
                    backgroundColor: theme.colors.surface,
                    borderRadius: 24,
                    padding: 20,
                    borderWidth: 1,
                    borderColor: theme.colors.surfaceOutline,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 10 },
                    shadowOpacity: 0.2,
                    shadowRadius: 20,
                    elevation: 10
                }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                        <Text style={{ color: theme.colors.onSurface, fontSize: 18, fontFamily: 'Text-Bold', fontWeight: 'bold' }}>
                            Ajouter une note
                        </Text>
                        <TouchableOpacity onPress={onClose} style={{ padding: 5 }}>
                            <XIcon size={24} color={theme.colors.onSurfaceDisabled} />
                        </TouchableOpacity>
                    </View>

                    {/* Inputs */}
                    <View style={{ gap: 15 }}>
                        <View>
                            <Text style={{ color: theme.colors.onSurfaceDisabled, fontSize: 12, marginBottom: 5 }}>Note</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                <TextInput
                                    value={value}
                                    onChangeText={setValue}
                                    keyboardType="numeric"
                                    placeholder="15"
                                    placeholderTextColor={theme.colors.onSurfaceDisabled}
                                    style={{
                                        flex: 1,
                                        backgroundColor: theme.dark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.05)',
                                        color: theme.colors.onSurface,
                                        padding: 12, borderRadius: 12, fontSize: 16, fontFamily: 'Text-Bold'
                                    }}
                                    autoFocus
                                />
                                <Text style={{ color: theme.colors.onSurfaceDisabled, fontSize: 20 }}>/</Text>
                                <TextInput
                                    value={scale}
                                    onChangeText={setScale}
                                    keyboardType="numeric"
                                    placeholder="20"
                                    placeholderTextColor={theme.colors.onSurfaceDisabled}
                                    style={{
                                        width: 60,
                                        backgroundColor: theme.dark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.05)',
                                        color: theme.colors.onSurface,
                                        padding: 12, borderRadius: 12, fontSize: 16, fontFamily: 'Text-Bold', textAlign: 'center'
                                    }}
                                />
                            </View>
                        </View>

                        <View>
                            <Text style={{ color: theme.colors.onSurfaceDisabled, fontSize: 12, marginBottom: 5 }}>Coefficient</Text>
                            <TextInput
                                value={coef}
                                onChangeText={setCoef}
                                keyboardType="numeric"
                                placeholder="1"
                                placeholderTextColor={theme.colors.onSurfaceDisabled}
                                style={{
                                    backgroundColor: theme.dark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.05)',
                                    color: theme.colors.onSurface,
                                    padding: 12, borderRadius: 12, fontSize: 16, fontFamily: 'Text-Bold'
                                }}
                            />
                        </View>

                        <View>
                            <Text style={{ color: theme.colors.onSurfaceDisabled, fontSize: 12, marginBottom: 5 }}>Nom (Optionnel)</Text>
                            <TextInput
                                value={name}
                                onChangeText={setName}
                                placeholder="Interro surprise"
                                placeholderTextColor={theme.colors.onSurfaceDisabled}
                                style={{
                                    backgroundColor: theme.dark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.05)',
                                    color: theme.colors.onSurface,
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
                            backgroundColor: theme.colors.primary,
                            paddingVertical: 15,
                            borderRadius: 16,
                            alignItems: 'center',
                            flexDirection: 'row',
                            justifyContent: 'center',
                            shadowColor: theme.colors.primary, shadowOpacity: 0.4, shadowRadius: 10
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
