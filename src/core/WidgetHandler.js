import { Platform } from 'react-native';
import AccountHandler from './AccountHandler';
import StorageHandler from './StorageHandler';
import TimetableHandler from './TimetableHandler';
import MarksHandler from './MarksHandler';

const APP_GROUP_ID = "group.com.dontbyshai.notianote";

class WidgetHandler {

    // Sauvegarde toutes les infos nécessaires aux widgets
    static async updateWidgetData() {
        try {
            const mainAccount = await AccountHandler.getMainAccount();
            if (!mainAccount) return;

            const accountID = mainAccount.id;

            // 1. MOYENNE (Respect preferences)
            const widgetAvgType = await AccountHandler.getPreference("widget_average_type", 'AUTO'); // AUTO, YEAR, A001, etc.
            const marksData = await StorageHandler.getData("marks");

            let avgValue = "--";
            let avgLabel = "Moyenne";

            if (marksData && marksData[accountID]?.data) {
                const periods = marksData[accountID].data;
                let targetPeriod = null;

                if (widgetAvgType === 'YEAR') {
                    targetPeriod = periods["YEAR"];
                    avgLabel = "Moyenne Annuelle";
                } else if (widgetAvgType !== 'AUTO') {
                    // Specific trimester (A001, A002...)
                    targetPeriod = periods[widgetAvgType];
                    avgLabel = targetPeriod ? targetPeriod.title : "Moyenne";
                }

                // Default / Auto logic
                if (!targetPeriod) {
                    const autoAvg = await MarksHandler.getAverages(accountID);
                    if (autoAvg) {
                        avgValue = parseFloat(autoAvg.general).toFixed(2);
                        avgLabel = `Moyenne ${autoAvg.periodName}`;
                    }
                } else {
                    avgValue = parseFloat(targetPeriod.average).toFixed(2);
                }
            }

            // 2. PROCHAIN COURS
            const today = new Date();
            const dateStr = TimetableHandler.formatDate(today);
            let lessons = await TimetableHandler.getTimetable(accountID, dateStr, dateStr);

            let nextLesson = "Aucun cours";
            let nextRoom = "";
            let nextTime = "";

            if (lessons && Array.isArray(lessons)) {
                const now = new Date();
                const upcoming = lessons.find(l => new Date(l.end_date) > now && !l.isAnnule);

                if (upcoming) {
                    nextLesson = upcoming.matiere;
                    nextRoom = upcoming.salle || "";
                    const start = new Date(upcoming.start_date);
                    nextTime = start.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                } else if (lessons.length > 0) {
                    nextLesson = "Fini pour aujourd'hui";
                }
            }

            // 3. CODE CANTINE (Barcode)
            const showCantine = await AccountHandler.getPreference("widget_show_cantine", true);
            let barcode = "";
            if (showCantine) {
                const manualOverride = await AccountHandler.getPreference(`cantine_override_${accountID}`);
                if (manualOverride) {
                    barcode = manualOverride;
                } else {
                    const userData = await AccountHandler.getSpecificAccount(accountID);
                    const cantineModule = userData?.modules?.find(m => m.code === "CANTINE_BARCODE");
                    if (cantineModule && cantineModule.enable && cantineModule.params?.numeroBadge) {
                        barcode = cantineModule.params.numeroBadge;
                    }
                }
            }

            const widgetData = {
                average: avgValue,
                averageLabel: avgLabel,
                nextLesson: nextLesson,
                nextRoom: nextRoom,
                nextTime: nextTime,
                barcode: barcode,
                lastUpdate: new Date().toISOString()
            };

            console.log("[WidgetHandler] Updating data:", widgetData);

            // --- iOS: Save to Group Preferences ---
            if (Platform.OS === 'ios') {
                try {
                    // Use dynamic require to avoid crash if module is missing
                    const ExpoGroupPreferences = require('expo-group-preferences');
                    if (ExpoGroupPreferences && ExpoGroupPreferences.saveStorageItem) {
                        await ExpoGroupPreferences.saveStorageItem(APP_GROUP_ID, "widgetData", JSON.stringify(widgetData));
                        console.log("[WidgetHandler] Saved to iOS Group.");
                    }
                } catch (err) {
                    // Fail silently or log if module is missing
                    console.log("[WidgetHandler] iOS Group Preferences module not found, skipping.");
                }
            }

            // --- Android: Trigger Update (REMOVED) ---


        } catch (e) {
            console.warn("[WidgetHandler] Fatal Error:", e);
        }
    }
}

export default WidgetHandler;
