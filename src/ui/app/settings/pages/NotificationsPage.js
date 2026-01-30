import { memo, useState, useEffect } from "react";
import { View, Text, Switch, TouchableOpacity, ScrollView, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
    ChevronLeftIcon,
    BellIcon,
    GraduationCapIcon,
    MailIcon,
    BookOpenIcon,
    CalendarIcon,
    UserCheckIcon,
    MoonIcon,
    EyeIcon,
    EyeOffIcon
} from "lucide-react-native";

import AccountHandler from "../../../../core/AccountHandler";
import { useGlobalAppContext } from "../../../../util/GlobalAppContext";
import { useAppStackContext } from "../../../../util/AppStackContext";

// Helper Header
const GalaxyHeader = ({ title, onBack, theme }) => {
    const insets = useSafeAreaInsets();
    const topPadding = Platform.OS === 'android' ? insets.top + 25 : insets.top;
    return (
        <View style={{ paddingTop: topPadding, paddingHorizontal: 20, paddingBottom: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                <TouchableOpacity
                    onPress={onBack}
                    style={{
                        position: 'absolute', left: 0,
                        backgroundColor: theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                        padding: 8,
                        borderRadius: 12,
                    }}
                >
                    <ChevronLeftIcon size={24} color={theme.dark ? "#FFF" : theme.colors.onBackground} />
                </TouchableOpacity>
                <Text style={{ color: theme.dark ? '#FFF' : theme.colors.onBackground, fontSize: 20, fontFamily: 'Text-Bold', fontWeight: 'bold' }}>{title}</Text>
            </View>
        </View>
    );
};

// Helper for Item
const NotificationItem = ({ title, subtitle, icon, rightElement, color, theme }) => (
    <View
        style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 15,
            paddingHorizontal: 15,
            borderBottomWidth: 1,
            borderBottomColor: theme.dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
        }}
    >
        <View style={{
            width: 40, height: 40, borderRadius: 10,
            backgroundColor: (color || '#FFF') + '20',
            alignItems: 'center', justifyContent: 'center', marginRight: 15
        }}>
            {icon}
        </View>
        <View style={{ flex: 1, marginRight: 10 }}>
            <Text style={{ color: theme.dark ? '#FFF' : theme.colors.onBackground, fontSize: 16, fontFamily: 'Text-Bold', fontWeight: '600' }}>{title}</Text>
            {subtitle && <Text style={{ color: '#94A3B8', fontSize: 13, fontFamily: 'Text-Medium', marginTop: 2 }}>{subtitle}</Text>}
        </View>
        {rightElement}
    </View>
);

function NotificationsPage({ navigation }) {
    const { theme } = useGlobalAppContext();
    const { updateGlobalDisplay } = useAppStackContext();

    // Settings State
    const [notifMarks, setNotifMarks] = useState(true);
    const [notifMessages, setNotifMessages] = useState(true);
    const [notifHomework, setNotifHomework] = useState(true);
    const [notifTimetable, setNotifTimetable] = useState(true);
    const [notifSchoolLife, setNotifSchoolLife] = useState(true);
    const [hideMarkValue, setHideMarkValue] = useState(false);
    const [quietMode, setQuietMode] = useState(false);

    useEffect(() => {
        const loadSettings = async () => {
            setNotifMarks(await AccountHandler.getPreference("notif_marks", true));
            setNotifMessages(await AccountHandler.getPreference("notif_messages", true));
            setNotifHomework(await AccountHandler.getPreference("notif_homework", true));
            setNotifTimetable(await AccountHandler.getPreference("notif_timetable", true));
            setNotifSchoolLife(await AccountHandler.getPreference("notif_schoollife", true));
            setHideMarkValue(await AccountHandler.getPreference("notif_hide_mark_value", false));
            setQuietMode(await AccountHandler.getPreference("notif_quiet_mode", false));
        };
        loadSettings();
    }, []);

    const updatePref = async (key, val, setter) => {
        setter(val);
        await AccountHandler.setPreference(key, val);
        updateGlobalDisplay();
    };

    return (
        <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
            <LinearGradient
                colors={[theme.colors.primaryLight, theme.colors.background]}
                style={{ flex: 1 }}
            >
                <GalaxyHeader title="Notifications" onBack={() => navigation.pop()} theme={theme} />

                <ScrollView contentContainerStyle={{ paddingBottom: 50, paddingHorizontal: 20 }}>

                    <Text style={styles.sectionTitle}>ALERTES INSTANTANÉES</Text>
                    <View style={[styles.cardContainer, { backgroundColor: theme.dark ? 'rgba(15, 23, 42, 0.4)' : '#FFFFFF', borderColor: theme.dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
                        <NotificationItem
                            theme={theme}
                            title="Notes"
                            subtitle="Nouvelles notes et évaluations."
                            icon={<GraduationCapIcon size={20} color="#3B82F6" />}
                            color="#3B82F6"
                            rightElement={
                                <Switch
                                    value={notifMarks}
                                    trackColor={{ false: "#334155", true: theme.colors.primary }}
                                    thumbColor={"#FFF"}
                                    onValueChange={(v) => updatePref("notif_marks", v, setNotifMarks)}
                                />
                            }
                        />
                        <NotificationItem
                            theme={theme}
                            title="Messages"
                            subtitle="Emails des profs et de l'administration."
                            icon={<MailIcon size={20} color="#F59E0B" />}
                            color="#F59E0B"
                            rightElement={
                                <Switch
                                    value={notifMessages}
                                    trackColor={{ false: "#334155", true: theme.colors.primary }}
                                    thumbColor={"#FFF"}
                                    onValueChange={(v) => updatePref("notif_messages", v, setNotifMessages)}
                                />
                            }
                        />
                        <NotificationItem
                            theme={theme}
                            title="Devoirs"
                            subtitle="Nouveaux devoirs ajoutés."
                            icon={<BookOpenIcon size={20} color="#10B981" />}
                            color="#10B981"
                            rightElement={
                                <Switch
                                    value={notifHomework}
                                    trackColor={{ false: "#334155", true: theme.colors.primary }}
                                    thumbColor={"#FFF"}
                                    onValueChange={(v) => updatePref("notif_homework", v, setNotifHomework)}
                                />
                            }
                        />
                        <NotificationItem
                            theme={theme}
                            title="Emploi du temps"
                            subtitle="Changements de salle ou cours annulés."
                            icon={<CalendarIcon size={20} color="#EF4444" />}
                            color="#EF4444"
                            rightElement={
                                <Switch
                                    value={notifTimetable}
                                    trackColor={{ false: "#334155", true: theme.colors.primary }}
                                    thumbColor={"#FFF"}
                                    onValueChange={(v) => updatePref("notif_timetable", v, setNotifTimetable)}
                                />
                            }
                        />
                        <NotificationItem
                            theme={theme}
                            title="Vie Scolaire"
                            subtitle="Absences, retards et sanctions."
                            icon={<UserCheckIcon size={20} color="#8B5CF6" />}
                            color="#8B5CF6"
                            rightElement={
                                <Switch
                                    value={notifSchoolLife}
                                    trackColor={{ false: "#334155", true: theme.colors.primary }}
                                    thumbColor={"#FFF"}
                                    onValueChange={(v) => updatePref("notif_schoollife", v, setNotifSchoolLife)}
                                />
                            }
                        />
                    </View>

                    <Text style={styles.sectionTitle}>CONFIDENTIALITÉ & CONFORT</Text>
                    <View style={[styles.cardContainer, { backgroundColor: theme.dark ? 'rgba(15, 23, 42, 0.4)' : '#FFFFFF', borderColor: theme.dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
                        <NotificationItem
                            theme={theme}
                            title="Masquer les notes"
                            subtitle="Ne pas afficher la note dans la notification."
                            icon={hideMarkValue ? <EyeOffIcon size={20} color="#94A3B8" /> : <EyeIcon size={20} color="#94A3B8" />}
                            color="#94A3B8"
                            rightElement={
                                <Switch
                                    value={hideMarkValue}
                                    trackColor={{ false: "#334155", true: theme.colors.primary }}
                                    thumbColor={"#FFF"}
                                    onValueChange={(v) => updatePref("notif_hide_mark_value", v, setHideMarkValue)}
                                />
                            }
                        />
                        <NotificationItem
                            theme={theme}
                            title="Mode Silence"
                            subtitle="Désactiver les alertes la nuit (22h - 07h)."
                            icon={<MoonIcon size={20} color="#6366F1" />}
                            color="#6366F1"
                            rightElement={
                                <Switch
                                    value={quietMode}
                                    trackColor={{ false: "#334155", true: theme.colors.primary }}
                                    thumbColor={"#FFF"}
                                    onValueChange={(v) => updatePref("notif_quiet_mode", v, setQuietMode)}
                                />
                            }
                        />
                    </View>

                </ScrollView>
            </LinearGradient>
        </View>
    );
}

const styles = {
    sectionTitle: {
        color: '#94A3B8',
        fontSize: 12,
        marginBottom: 10,
        fontFamily: 'Text-Bold',
        letterSpacing: 1,
        marginTop: 25,
        marginLeft: 5
    },
    cardContainer: {
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
    }
};

export default memo(NotificationsPage);
