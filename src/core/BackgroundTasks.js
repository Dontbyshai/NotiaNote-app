import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import * as Notifications from 'expo-notifications';

import AccountHandler from './AccountHandler';
import MarksHandler from './MarksHandler';
import StorageHandler from './StorageHandler';
import HomeworkHandler from './HomeworkHandler';
import TimetableHandler from './TimetableHandler';
import SchoolLifeHandler from './SchoolLifeHandler';
import EcoleDirecteApi from '../services/EcoleDirecteApi';
import WidgetHandler from './WidgetHandler';

const BACKGROUND_FETCH_TASK = 'BACKGROUND_FETCH_TASK';

// --- 🎨 CONFIGURATION DES NOTIFS ---
const NotifsConfig = {
    MARKS: {
        title: "Nouvelle note ! 🎓",
        body: (m, n, s) => `${m}: ${n}/${s}`
    },
    MESSAGES: {
        title: "Nouveau message 📬",
        body: (sender, subject) => `${sender} : ${subject || 'Sans objet'}`
    },
    HOMEWORK: {
        title: "Nouveau devoir 📝",
        body: (subject, date) => `${subject} pour le ${date}`
    },
    TIMETABLE: {
        title: "Changement d'emploi du temps ⚠️",
        body: (subject, type) => `Le cours de ${subject} est ${type}` // type = ANNULÉ / MODIFIÉ
    },
    EXAM: {
        title: "Rappel : Contrôle ! 📝",
        body: (subject) => `N'oublie pas : Contrôle de ${subject} aujourd'hui.`
    },
    CANTINE: {
        title: "C'est l'heure de manger ! 🍔",
        body: "Bon appétit ! N'oublie pas ta carte de cantine."
    },
    VIE_SCOLAIRE: {
        title: (type) => `${type} ! ⚠️`,
        body: (type, date) => `Nouvel(le) ${type.toLowerCase()} le ${date}.`
    }
};

TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
    console.log("[Background] 🔄 STARTING FULL CHECK...");
    let hasNewData = false;

    try {
        // 1. LOGIN SILENCIEUX (Supporte la 2FA via les jetons CN/CV)
        const credentials = await StorageHandler.getData("credentials");
        if (!credentials) return BackgroundFetch.BackgroundFetchResult.NoData;

        const loginStatus = await AccountHandler.refreshLogin();
        if (loginStatus !== 1) {
            console.log("[Background] Silent login failed (2FA issues or bad credentials).");
            return BackgroundFetch.BackgroundFetchResult.Failed;
        }

        const mainAccount = await AccountHandler.getMainAccount();
        if (!mainAccount) return BackgroundFetch.BackgroundFetchResult.Failed;

        // --- A. VÉRIFICAÇÃO DES NOTES 🎓 ---
        try {
            let oldMarksData = await StorageHandler.getData("marks");
            let oldIds = new Set();
            if (oldMarksData && oldMarksData[mainAccount.id]?.data) {
                const periods = oldMarksData[mainAccount.id].data;
                Object.values(periods).forEach(period => {
                    if (period.id !== 'YEAR' && period.marks) {
                        Object.values(period.marks).forEach(m => oldIds.add(m.id));
                    }
                });
            }

            await MarksHandler.getMarks(mainAccount.id);

            if (await AccountHandler.getPreference("notif_marks", true)) {
                let newMarksData = await StorageHandler.getData("marks");
                if (newMarksData && newMarksData[mainAccount.id]?.data) {
                    const periods = newMarksData[mainAccount.id].data;
                    const newMarks = Object.values(periods)
                        .filter(p => p.id !== 'YEAR')
                        .flatMap(p => Object.values(p.marks));

                    const freshMarks = newMarks.filter(m => !oldIds.has(m.id));

                    if (freshMarks.length > 0) {
                        hasNewData = true;
                        if (freshMarks.length === 1) {
                            const m = freshMarks[0];
                            const hideValue = await AccountHandler.getPreference("notif_hide_mark_value", false);
                            const body = hideValue ? `Nouvelle note en ${m.matiere}` : NotifsConfig.MARKS.body(m.matiere, m.valeur, m.noteSur);
                            await sendNotif(NotifsConfig.MARKS.title, body, { type: 'NOTE', id: m.id });
                        } else {
                            await sendNotif("Nouvelles notes ! 📚", `Tu as reçu ${freshMarks.length} nouvelles notes.`, { type: 'NOTES_LIST' });
                        }
                    }
                }
            }
        } catch (e) { console.error("[Background Error] Marks:", e); }

        // --- B. VÉRIFICATION DES MESSAGES 📬 ---
        try {
            if (await AccountHandler.getPreference("notif_messages", true)) {
                const lastKnownMsgId = await StorageHandler.getData("bg_lastMessageId") || 0;
                const response = await EcoleDirecteApi.getMessages(mainAccount.id, 'received', 0);
                if (response.status === 200 && response.data?.data?.messages?.received) {
                    const messages = response.data.data.messages.received;
                    const mostRecentMsg = messages[0];

                    if (mostRecentMsg && mostRecentMsg.id > lastKnownMsgId) {
                        hasNewData = true;
                        const newMsgs = messages.filter(m => m.id > lastKnownMsgId);

                        // Calculate total unread count
                        const unreadCount = messages.filter(m => {
                            let isRead = false;
                            if (m.read !== undefined) isRead = m.read;
                            else if (m.lu !== undefined) isRead = m.lu;
                            else if (m.mRead !== undefined) isRead = m.mRead;
                            return !isRead;
                        }).length;

                        if (newMsgs.length === 1 && unreadCount === 1) {
                            const m = newMsgs[0];
                            await sendNotif(NotifsConfig.MESSAGES.title, NotifsConfig.MESSAGES.body(m.from?.name || 'Inconnu', m.subject), { type: 'MESSAGES' });
                        } else {
                            await sendNotif("Nouveaux messages 📬", `Tu as ${unreadCount} message${unreadCount > 1 ? 's' : ''} non lu${unreadCount > 1 ? 's' : ''}.`, { type: 'MESSAGES' });
                        }
                        await StorageHandler.saveData("bg_lastMessageId", mostRecentMsg.id);
                    }
                }
            }
        } catch (e) { console.error("[Background Error] Messages:", e); }

        // --- C. VÉRIFICATION DEVOIRS 📝 ---
        try {
            if (await AccountHandler.getPreference("notif_homework", true)) {
                let oldHwData = await StorageHandler.getData("homework");
                let oldHwIds = new Set();
                if (oldHwData && oldHwData[mainAccount.id]?.data?.homeworks) {
                    Object.keys(oldHwData[mainAccount.id].data.homeworks).forEach(k => oldHwIds.add(parseInt(k)));
                }

                await HomeworkHandler.getAllHomework(mainAccount.id);

                let newHwData = await StorageHandler.getData("homework");
                if (newHwData && newHwData[mainAccount.id]?.data?.homeworks) {
                    const allHw = newHwData[mainAccount.id].data.homeworks;
                    const newHwList = Object.values(allHw).filter(h => !oldHwIds.has(h.id));

                    if (newHwList.length > 0) {
                        hasNewData = true;
                        const h = newHwList[0];
                        await sendNotif(NotifsConfig.HOMEWORK.title, NotifsConfig.HOMEWORK.body(h.subjectTitle, h.date), { type: 'HOMEWORK' });
                    }
                }
            }
        } catch (e) { console.error("[Background Error] Homework:", e); }

        // --- D. EMPLOI DU TEMPS (MODIFS + CONTRÔLES) ⚠️📝 ---
        try {
            const isTimetableEnabled = await AccountHandler.getPreference("notif_timetable", true);
            const isMarksEnabled = await AccountHandler.getPreference("notif_marks", true); // For exams

            if (isTimetableEnabled || isMarksEnabled) {
                const today = new Date();
                const dateStr = TimetableHandler.formatDate(today);
                let lessons = await TimetableHandler.getTimetable(mainAccount.id, dateStr, dateStr);

                if (lessons && Array.isArray(lessons)) {
                    let knownStatus = await StorageHandler.getData("bg_knownLessonsStatus") || {};
                    let todaysStatus = {};

                    for (let l of lessons) {
                        const statusKey = `${l.id}_${l.statut}_${l.isAnnule}`;

                        // 1. Détection Absences / Annulations
                        if (!knownStatus[statusKey] && isTimetableEnabled) {
                            if (l.isAnnule || l.statut === 'Annulé' || (l.text && l.text.toLowerCase().includes('annulé'))) {
                                await sendNotif(NotifsConfig.TIMETABLE.title, NotifsConfig.TIMETABLE.body(l.matiere, "ANNULÉ 🚫"), { type: 'CALENDAR' });
                            } else if (l.isModifie || l.statut === 'Modifié') {
                                await sendNotif(NotifsConfig.TIMETABLE.title, NotifsConfig.TIMETABLE.body(l.matiere, "MODIFIÉ ✏️"), { type: 'CALENDAR' });
                            } else if (l.prof && l.prof.toUpperCase().includes('ABSENT')) {
                                await sendNotif(NotifsConfig.TIMETABLE.title, NotifsConfig.TIMETABLE.body(l.matiere, "PROF ABSENT 🏃"), { type: 'CALENDAR' });
                            }
                            hasNewData = true;
                        }
                        todaysStatus[statusKey] = true;

                        // 2. Détection CONTRÔLES (Nouveau !)
                        if (isMarksEnabled) {
                            const isExam = l.interrogation || l.test || (l.text && (l.text.toLowerCase().includes('controle') || l.text.toLowerCase().includes('évaluation') || l.text.toLowerCase().includes('ds')));
                            const examKey = `exam_${l.id}_${dateStr}`;
                            const alreadyNotifiedExam = await StorageHandler.getData(examKey);

                            if (isExam && !alreadyNotifiedExam) {
                                await sendNotif(NotifsConfig.EXAM.title, NotifsConfig.EXAM.body(l.matiere), { type: 'CALENDAR' });
                                await StorageHandler.saveData(examKey, true);
                                hasNewData = true;
                            }
                            todaysStatus[examKey] = true;
                        }
                    }
                    await StorageHandler.saveData("bg_knownLessonsStatus", todaysStatus);

                    // 3. Cantine
                    const isCantineEnabled = await AccountHandler.getPreference("notif_timetable", true); // Cantine linked to timetable for now
                    if (isCantineEnabled) {
                        const nowHour = today.getHours();
                        const nowMin = today.getMinutes();
                        const isLunchTime = (nowHour === 11 && nowMin >= 30) || (nowHour === 12) || (nowHour === 13 && nowMin <= 30);

                        if (isLunchTime) {
                            const lastCantineDate = await StorageHandler.getData("bg_lastCantineDate");
                            if (lastCantineDate !== dateStr) {
                                const hasLunch = lessons.some(l => {
                                    const txt = (l.matiere + " " + (l.text || "")).toLowerCase();
                                    return txt.includes('repas') || txt.includes('cantine') || txt.includes('midi') || txt.includes('déjeuner');
                                });
                                if (hasLunch) {
                                    await sendNotif(NotifsConfig.CANTINE.title, NotifsConfig.CANTINE.body, { type: 'CANTINE' });
                                    await StorageHandler.saveData("bg_lastCantineDate", dateStr);
                                    hasNewData = true;
                                }
                            }
                        }
                    }
                }
            }
        } catch (e) { console.error("[Background Error] Timetable:", e); }



        // --- E. VIE SCOLAIRE (ABSENCES, RETARDS, SANCTIONS) ⚠️ ---
        try {
            if (await AccountHandler.getPreference("notif_schoollife", true)) {
                let oldSchoolLife = await SchoolLifeHandler.getCachedSchoolLife(mainAccount.id);
                let oldSlIds = new Set();

                const getIds = (payload) => {
                    if (!payload) return;
                    if (payload.absencesRetards) payload.absencesRetards.forEach(a => oldSlIds.add(a.id));
                    if (payload.sanctionsEncouragements) payload.sanctionsEncouragements.forEach(s => oldSlIds.add(s.id));
                };
                getIds(oldSchoolLife);

                const newSchoolLife = await SchoolLifeHandler.getSchoolLife(mainAccount.id);
                if (newSchoolLife) {
                    const newEvents = [];
                    if (newSchoolLife.absencesRetards) {
                        newSchoolLife.absencesRetards.forEach(a => {
                            if (!oldSlIds.has(a.id)) newEvents.push(a);
                        });
                    }
                    if (newSchoolLife.sanctionsEncouragements) {
                        newSchoolLife.sanctionsEncouragements.forEach(s => {
                            if (!oldSlIds.has(s.id)) newEvents.push(s);
                        });
                    }

                    if (newEvents.length > 0) {
                        hasNewData = true;
                        if (newEvents.length === 1) {
                            const ev = newEvents[0];
                            const type = ev.typeElement || "Vie Scolaire";
                            await sendNotif(NotifsConfig.VIE_SCOLAIRE.title(type), NotifsConfig.VIE_SCOLAIRE.body(type, ev.displayDate || ev.date), { type: 'SCHOOL_LIFE' });
                        } else {
                            await sendNotif("Vie Scolaire ⚠️", `Tu as ${newEvents.length} nouveaux événements (absences, retards ou sanctions).`, { type: 'SCHOOL_LIFE' });
                        }
                    }
                }
            }
        } catch (e) { console.error("[Background Error] SchoolLife:", e); }

        try {
            await WidgetHandler.updateWidgetData();
        } catch (e) {
            console.error("[Background Error] Widget Update:", e);
        }

        return hasNewData ? BackgroundFetch.BackgroundFetchResult.NewData : BackgroundFetch.BackgroundFetchResult.NoData;

    } catch (error) {
        console.error("[Background] FATAL:", error);
        return BackgroundFetch.BackgroundFetchResult.Failed;
    }
});

async function sendNotif(title, body, data = {}) {
    // Check Quiet Mode (22h - 07h)
    const isQuietMode = await AccountHandler.getPreference("notif_quiet_mode", false);
    if (isQuietMode) {
        const hour = new Date().getHours();
        if (hour >= 22 || hour < 7) {
            console.log(`[Background 🤫] Quiet Mode ACTIVE. Skipping: ${title}`);
            return;
        }
    }

    console.log(`[Background 🔔] Sending: ${title}`);
    await Notifications.scheduleNotificationAsync({
        content: { title, body, sound: true, data },
        trigger: null,
    });
}

export async function registerBackgroundFetchAsync() {
    return BackgroundFetch.registerTaskAsync(BACKGROUND_FETCH_TASK, {
        minimumInterval: 15 * 60,
        stopOnTerminate: false,
        startOnBoot: true,
    });
}

export async function unregisterBackgroundFetchAsync() {
    return BackgroundFetch.unregisterTaskAsync(BACKGROUND_FETCH_TASK);
}
