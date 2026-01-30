import React from 'react';
import { registerWidgetTaskHandler } from 'react-native-android-widget';
import { NoteWidget } from './NoteWidget';
import AccountHandler from '../core/AccountHandler';
import StorageHandler from '../core/StorageHandler';
import TimetableHandler from '../core/TimetableHandler';
import MarksHandler from '../core/MarksHandler';

export async function widgetTaskHandler(props) {
    const widgetInfo = props.widgetInfo;

    // Default data structure
    let data = {
        average: "--",
        averageLabel: "Moyenne",
        nextLesson: "Chargement...",
        nextRoom: "",
        nextTime: "",
        barcode: ""
    };

    try {
        const mainAccount = await AccountHandler.getMainAccount();
        if (mainAccount) {
            const accountID = mainAccount.id;

            // 1. Average & Label
            const widgetAvgType = await AccountHandler.getPreference("widget_average_type", 'AUTO');
            const marksData = await StorageHandler.getData("marks");

            if (marksData && marksData[accountID]?.data) {
                const periods = marksData[accountID].data;
                let targetPeriod = null;

                if (widgetAvgType === 'YEAR') {
                    targetPeriod = periods["YEAR"];
                    data.averageLabel = "Moyenne Annuelle";
                } else if (widgetAvgType !== 'AUTO') {
                    targetPeriod = periods[widgetAvgType];
                    data.averageLabel = targetPeriod ? targetPeriod.title : "Moyenne";
                }

                if (!targetPeriod) {
                    const autoAvg = await MarksHandler.getAverages(accountID);
                    if (autoAvg) {
                        data.average = parseFloat(autoAvg.general).toFixed(2);
                        data.averageLabel = `Moyenne ${autoAvg.periodName}`;
                    }
                } else {
                    data.average = parseFloat(targetPeriod.average).toFixed(2);
                }
            }

            // 2. Timetable
            const today = new Date();
            const dateStr = TimetableHandler.formatDate(today);
            let lessons = await TimetableHandler.getTimetable(accountID, dateStr, dateStr);

            if (lessons && Array.isArray(lessons)) {
                const now = new Date();
                const upcoming = lessons.find(l => new Date(l.end_date) > now && !l.isAnnule);
                if (upcoming) {
                    data.nextLesson = upcoming.matiere;
                    data.nextRoom = upcoming.salle || "";
                    const start = new Date(upcoming.start_date);
                    data.nextTime = start.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                } else {
                    data.nextLesson = "Fini pour aujourd'hui";
                    data.nextRoom = "";
                    data.nextTime = "";
                }
            } else {
                data.nextLesson = "Aucun cours";
            }

            // 3. Cantine Barcode
            const showCantine = await AccountHandler.getPreference("widget_show_cantine", true);
            if (showCantine) {
                const manualOverride = await AccountHandler.getPreference(`cantine_override_${accountID}`);
                if (manualOverride) {
                    data.barcode = manualOverride;
                } else {
                    const userData = await AccountHandler.getSpecificAccount(accountID);
                    const cantineModule = userData?.modules?.find(m => m.code === "CANTINE_BARCODE");
                    if (cantineModule && cantineModule.enable && cantineModule.params?.numeroBadge) {
                        data.barcode = cantineModule.params.numeroBadge;
                    }
                }
            }
        }

    } catch (e) {
        console.log("[Widget Task] Error:", e);
        data.nextLesson = "Erreur chargement";
    }

    switch (props.widgetAction) {
        case 'WIDGET_ADDED':
        case 'WIDGET_UPDATE':
        case 'WIDGET_RESIZED':
            props.renderWidget(
                <NoteWidget
                    average={data.average}
                    averageLabel={data.averageLabel}
                    nextLesson={data.nextLesson}
                    nextRoom={data.nextRoom}
                    nextTime={data.nextTime}
                    barcode={data.barcode}
                />
            );
            break;

        default:
            break;
    }
}

registerWidgetTaskHandler(widgetTaskHandler);
