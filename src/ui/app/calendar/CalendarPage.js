import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, Dimensions, ActivityIndicator, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PressableScale } from 'react-native-pressable-scale';
import { CalendarDays, Clock, MapPin, User, AlertCircle, ChevronLeft, ChevronRight, Utensils, RotateCw } from 'lucide-react-native';
import { BlurView } from 'expo-blur';

import MessagesHandler from '../../../core/MessagesHandler';
import { useGlobalAppContext } from '../../../util/GlobalAppContext';
import { useCurrentAccountContext } from '../../../util/CurrentAccountContext';
import TimetableHandler from '../../../core/TimetableHandler';
import HomeworkHandler from '../../../core/HomeworkHandler';
import StorageHandler from '../../../core/StorageHandler';
import EcoleDirecteApi from '../../../services/EcoleDirecteApi';
import { parseHtmlData } from '../../../util/Utils';
import ColorsHandler from '../../../core/ColorsHandler';
import BannerAdComponent from '../../components/Ads/BannerAdComponent';

function CalendarPage() {
    const insets = useSafeAreaInsets();
    const { theme } = useGlobalAppContext();
    const { accountID: contextAccountID, mainAccount } = useCurrentAccountContext();
    // Fix: Calculate effective ID to handle cases where contextAccountID is undefined
    const accountID = (contextAccountID && contextAccountID !== "undefined") ? contextAccountID : ((mainAccount?.id && mainAccount.id !== "undefined") ? mainAccount.id : null);


    // State
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [weekDates, setWeekDates] = useState([]);
    const [lessons, setLessons] = useState([]);
    const [dailyLessons, setDailyLessons] = useState([]);
    const [suspectedEvents, setSuspectedEvents] = useState({}); // New State for email events
    const [homeworks, setHomeworks] = useState({}); // New State for homeworks
    const [isLoading, setIsLoading] = useState(false);

    // Generate week dates on mount or when selectedDate changes (if moving to another week)
    // Generate week dates on mount or when selectedDate changes (if moving to another week)
    useEffect(() => {
        if (accountID) {
            generateWeek(selectedDate);
            fetchTimetable(selectedDate);
        }
    }, [accountID]); // Reload when account is ready

    // Update daily lessons when selectedDate or lessons change
    useEffect(() => {
        filterDailyLessons();
    }, [selectedDate, lessons]);

    // Scan Emails for Absences/Modifications (The "Hack" Feature)
    useEffect(() => {
        const scanEmails = async () => {
            if (!lessons || lessons.length === 0) return;

            // 1. Get unique teachers
            const teachers = [...new Set(lessons.map(c => c.prof).filter(Boolean))];
            if (teachers.length === 0) return;

            // 2. Fetch messages
            const res = await EcoleDirecteApi.getMessages(accountID);
            const allMessages = res?.data?.data?.messages?.received || [];

            if (!allMessages || allMessages.length === 0) return;

            // 3. Fetch Full Content sequentially to avoid rate-limiting (max 15)
            const recentMessages = allMessages.slice(0, 15);
            const messages = [];
            for (const msg of recentMessages) {
                try {
                    const response = await EcoleDirecteApi.getMessageContent(accountID, msg.id);
                    if (response?.status === 200 && response.data?.data) {
                        messages.push({ ...msg, fullContent: parseHtmlData(response.data.data.content) });
                    } else {
                        messages.push({ ...msg, fullContent: "" });
                    }
                } catch (e) {
                    messages.push({ ...msg, fullContent: "" });
                }
            }

            const foundEvents = {};

            // Keywords
            const absenceKeywords = ['absent', 'absence', 'malade', 'pas cours', 'annulé', 'ne sera pas', "n'assurera pas"];
            const modificationKeywords = ['reporté', 'déplacé', 'changement', 'modifié', 'modification', 'horaire', 'salle', 'ajouté', 'rattrapage', 'changement de salle']; // Added salle specific
            const globalEventKeywords = ['messe', 'célébration', 'grève', 'blocus', 'fermeture', 'évènement', 'banalisation', 'cours annulés', 'pas cours'];

            const monthNames = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
            const dayNames = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

            messages.forEach(msg => {
                const content = (msg.subject + " " + (msg.fullContent || msg.content || "")).toLowerCase();

                // --- A. GLOBAL EVENT BY DATE DETECTION ---
                const hasGlobalKeyword = globalEventKeywords.some(kw => content.includes(kw));

                if (hasGlobalKeyword) {
                    // Check if mail mentions a specific day in the CURRENT week context (lessons)
                    // We iterate over the dates present in 'lessons' (which represents the loaded week)
                    const uniqueDates = [...new Set(lessons.map(l => l.start_date.split(' ')[0]))]; // YYYY-MM-DD

                    uniqueDates.forEach(dateStr => {
                        const date = new Date(dateStr);
                        const dayNum = date.getDate();
                        const monthIndex = date.getMonth();
                        const monthName = monthNames[monthIndex];
                        // const dayName = dayNames[date.getDay()];

                        // Robust Patterns
                        const patterns = [
                            `${dayNum} ${monthName}`, // "8 janvier"
                            `${dayNum < 10 ? '0' + dayNum : dayNum} ${monthName}`, // "08 janvier"
                            `${dayNum}/${monthIndex + 1}`, // "8/1"
                            `${dayNum < 10 ? '0' + dayNum : dayNum}/${monthIndex + 1 < 10 ? '0' + (monthIndex + 1) : monthIndex + 1}`, // "08/01"
                        ];

                        if (patterns.some(p => content.includes(p))) {
                            console.log(`Global Event Matched for ${dateStr}: ${msg.subject}`);
                            // Find all teachers active on this day
                            const coursesOnDate = lessons.filter(c => c.start_date.startsWith(dateStr));

                            coursesOnDate.forEach(c => {
                                if (c.prof) {
                                    foundEvents[`${c.prof}_${dateStr}`] = {
                                        type: 'modification',
                                        subject: `GLOBAL: ${msg.subject}`,
                                        isGlobal: true
                                    };
                                }
                            });
                        }
                    });
                }

                // --- B. SPECIFIC TEACHER DETECTION ---
                let eventType = null;
                if (absenceKeywords.some(kw => content.includes(kw))) eventType = 'absence';
                else if (modificationKeywords.some(kw => content.includes(kw))) eventType = 'modification';

                if (eventType) {
                    // Extract target dates
                    const targetDates = new Set();
                    const msgDateObj = msg.date ? new Date(msg.date) : new Date();

                    if (content.includes('demain') || content.includes('lendemain')) {
                        const tomorrow = new Date(msgDateObj);
                        tomorrow.setDate(tomorrow.getDate() + 1);
                        targetDates.add(tomorrow.toISOString().split('T')[0]);
                    } else if (content.includes('après-demain') || content.includes('apres-demain')) {
                        const afterTomorrow = new Date(msgDateObj);
                        afterTomorrow.setDate(afterTomorrow.getDate() + 2);
                        targetDates.add(afterTomorrow.toISOString().split('T')[0]);
                    } else if (content.includes("aujourd'hui") || content.includes('ce jour')) {
                        targetDates.add(msgDateObj.toISOString().split('T')[0]);
                    }

                    const knownDates = [...new Set(lessons.map(c => c.start_date.split(' ')[0]))]; // ["2026-02-23", ..., "2026-02-27"]
                    for (const d of knownDates) {
                        const dObj = new Date(d);
                        const day = dObj.getDate();
                        const month = dObj.getMonth() + 1;
                        const dayStr = day < 10 ? '0' + day : '' + day;
                        const monthStr = month < 10 ? '0' + month : '' + month;

                        const patterns = [
                            `${day} ${monthNames[month - 1]}`,
                            `${dayStr} ${monthNames[month - 1]}`,
                            `${day}/${month}`,
                            `${dayStr}/${monthStr}`,
                            `${day}/${monthStr}`
                        ];
                        if (patterns.some(p => content.includes(p))) {
                            targetDates.add(d);
                        }
                    }

                    if (targetDates.size === 0) {
                        targetDates.add(msgDateObj.toISOString().split('T')[0]);
                        if (msgDateObj.getHours() >= 16) {
                            const tomorrow = new Date(msgDateObj);
                            tomorrow.setDate(tomorrow.getDate() + 1);
                            targetDates.add(tomorrow.toISOString().split('T')[0]);
                        }
                    }

                    teachers.forEach(teacher => {
                        let cleanName = teacher.toLowerCase().replace(/^m\.|^mme\.|^mr\.|^dr\./, '').trim();
                        cleanName = cleanName.split(/[\s-]/)[0];
                        if (cleanName.length < 3) return;

                        console.log(`[NLP Dbg] Checking teacher "${teacher}" -> "${cleanName}" against email: "${msg.subject}". Match: ${content.includes(cleanName)}`);

                        if (content.includes(cleanName)) {
                            for (const d of targetDates) {
                                const key = `${teacher}_${d}`;
                                if (!foundEvents[key] || foundEvents[key].isGlobal) {
                                    foundEvents[key] = {
                                        type: eventType,
                                        subject: msg.subject,
                                        date: msg.date
                                    };
                                }
                            }
                        }
                    });
                }
            });

            if (Object.keys(foundEvents).length > 0) {
                setSuspectedEvents(foundEvents);
            }
        };

        scanEmails();
    }, [lessons]); // Run when timetable changes/loads

    // Load Homeworks for Exam Detection
    useEffect(() => {
        const loadHomeworks = async () => {
            let cache = await StorageHandler.getData("homework");
            if (!cache || !cache[accountID]) {
                await HomeworkHandler.getAllHomework(accountID);
                cache = await StorageHandler.getData("homework");
            }

            if (cache && cache[accountID] && cache[accountID].data && cache[accountID].data.homeworks) {
                const data = cache[accountID].data;
                const organized = {};

                if (data.days) {
                    Object.keys(data.days).forEach(date => {
                        const ids = data.days[date];
                        organized[date] = ids.map(id => data.homeworks[id]).filter(Boolean);
                    });
                }
                setHomeworks(organized);
            }
        };
        loadHomeworks();
    }, [accountID]);

    // Fetch DETAILED homeworks for the selected day (Essential for DS detection as "todo" is often missing in global cache)
    useEffect(() => {
        const loadDetailedHW = async () => {
            const dateStr = selectedDate.toISOString().split('T')[0];
            try {
                // Fetch specific details for this day
                await HomeworkHandler.getSpecificHomeworkForDay(accountID, dateStr);

                // Read from specific cache
                const specificCache = await StorageHandler.getData("specific-homework");
                if (specificCache && specificCache[accountID] && specificCache[accountID].days[dateStr]) {
                    const dayHwIDs = specificCache[accountID].days[dateStr].homeworkIDs || [];
                    const detailedByIDs = specificCache[accountID].homeworks || {};

                    setHomeworks(prev => {
                        const currentList = prev[dateStr] || [];
                        if (currentList.length === 0 && dayHwIDs.length === 0) return prev;

                        // Merge details into existing list
                        // If existing list is empty but we found details, create new entries
                        let newList = [...currentList];

                        if (newList.length === 0) {
                            // Create from details
                            newList = dayHwIDs.map(id => {
                                const d = detailedByIDs[id];
                                return d ? {
                                    id: d.id,
                                    subjectTitle: d.subject,
                                    content: (d.todo || "") + " " + (d.sessionContent || ""),
                                    isExam: false, // Default
                                    prof: d.givenBy
                                } : null;
                            }).filter(Boolean);
                        } else {
                            // Merge
                            newList = newList.map(item => {
                                const detail = detailedByIDs[item.id];
                                if (detail) {
                                    return {
                                        ...item,
                                        // Enrich content with TODO and Session Content
                                        content: (item.content || "") + " " + (detail.todo || "") + " " + (detail.sessionContent || ""),
                                        prof: item.prof || detail.givenBy // Use detailed provider if available
                                    };
                                }
                                return item;
                            });
                        }

                        return { ...prev, [dateStr]: newList };
                    });
                }
            } catch (e) {
                console.log("Failed to load specific homework details", e);
            }
        };
        if (homeworks[selectedDate.toISOString().split('T')[0]]) {
            // Only load details if we already have some homeworks detected (optimization)
            // actually, always load to be safe ? Yes.
            loadDetailedHW();
        } else {
            loadDetailedHW();
        }
    }, [selectedDate]);

    // Ultimate Exam Detection (Ported from GalaxyTimetable Web)
    const getHomeworkAlert = (course) => {
        if (!homeworks || !course || !course.start_date) return null;

        const dateStr = course.start_date.split(' ')[0]; // YYYY-MM-DD
        // Use text matches if matiere is undefined (crucial for DS slots)
        const courseSubject = (course.matiere || course.text || "").toLowerCase();

        // Helper to normalize strings
        const normalize = (str) => {
            return str
                .toLowerCase()
                .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                .replace(/[^a-z0-9]/g, "");
        };

        // Aliases map
        const subjectAliases = {
            'ses': ['scienceeconomique', 'scecono', 'economie', 'sociale'],
            'hg': ['histoire', 'geographie', 'geo', 'hist'],
            'histoiregeographie': ['histoire', 'geographie', 'hg'],
            'emc': ['moral', 'civique'],
            'snt': ['numerique', 'science'],
            'enssc': ['scienc', 'enseignement'],
            'francais': ['lettre', 'litterature'],
            'philo': ['philosophie'],
            'maths': ['mathematique'],
            'si': ['ingenieur'],
            'llce': ['langue', 'litterature', 'civilisation', 'anglais', 'espagnol', 'allemand', 'italien'],
            'hlp': ['humanite', 'litterature', 'philo'],
            'nsi': ['numerique', 'informatique'],
            'svt': ['sciences', 'vie', 'terre', 'biologie'],
            'pc': ['physique', 'chimie']
        };

        const matchSubjects = (courseSubj, taskSubj) => {
            const c = normalize(courseSubj);
            const t = normalize(taskSubj);
            if (c.includes(t) || t.includes(c)) return true;
            for (const [alias, keywords] of Object.entries(subjectAliases)) {
                if (c.includes(alias) || t.includes(alias)) {
                    const other = c.includes(alias) ? t : c;
                    if (keywords.some(k => other.includes(k))) return true;
                }
            }
            return false;
        };

        const testKeywords = ['contrôle', 'controle', 'évaluation', 'evaluation', 'exam', 'ds', 'dst', 'interrogation', 'bacc', 'brevet', 'partiel', 'test', 'oral', 'exposé', 'soutenance', 'qcm'];

        const checkMatchesForDate = (targetDateStr, isApproximation = false) => {
            if (!homeworks[targetDateStr]) return null;

            // Ignored subjects
            const ignoredSubjects = ['retenue', 'colle', 'permanence', 'vie scolaire', 'étude', 'cantine', 'self'];
            if (ignoredSubjects.some(s => courseSubject.includes(s))) return null;

            const validTasks = homeworks[targetDateStr].filter(task => {
                const taskSubject = task.subjectTitle || task.matiere || task.subject || "";

                // Content: match against todo and content
                let contentRaw = (task.content || "") + " " + (task.todo || "");
                const content = contentRaw.toLowerCase().replace(/<[^>]*>?/gm, ' ');

                // Exclusions
                const excludeKeywords = ['correction', 'corrigé', 'corrige', 'rendu', 'rendre', 'signature', 'signer', 'correct', 'sign'];
                if (excludeKeywords.some(kw => content.includes(kw))) return false;

                // Is Test?
                const isTest = testKeywords.some(kw => {
                    // For short words like 'ds', use regex boundary to avoid matching inside words (e.g. 'poids')
                    if (['ds', 'dst', 'test', 'qcm', 'oral'].includes(kw)) {
                        const regex = new RegExp(`\\b${kw}\\b`, 'i');
                        return regex.test(content) || regex.test(taskSubject);
                    }
                    return content.includes(kw) || taskSubject.toLowerCase().includes(kw);
                }) || task.isExam;

                if (!isTest) {
                    // FALLBACK FOR GENERIC DS:
                    // If the course IS a generic DS slot, be very permissive about finding the matching homework.
                    // If the content contains "ds" (even inside a word) or just "devoir", accept it.
                    const isGenericDS = courseSubject === 'ds' || courseSubject.includes('devoir surveille') || (course.text && course.text.trim().toLowerCase() === 'ds');
                    if (isGenericDS && (content.includes('ds') || content.includes('devoir') || taskSubject.toLowerCase().includes('ds'))) {
                        // Force permit
                    } else {
                        return false;
                    }
                }

                // SPECIAL: If course is generic DS, accepts ANY detected exam
                // Check against "ds" or "devoir surveille"
                if (courseSubject === 'ds' || courseSubject.includes('devoir surveille') || (course.text && course.text.trim().toLowerCase() === 'ds')) {
                    console.log("[Auto-DS] Matched generic DS with homework:", taskSubject);
                    return true;
                }

                // 1. Professor Match (High Confidence)
                const courseProf = (course.prof || "").toLowerCase();
                const taskProf = (task.prof || task.teacher || "").toLowerCase();

                if (courseProf && taskProf) {
                    const normalizeProf = (s) => s.replace(/[^a-z]/g, "");
                    const cProf = normalizeProf(courseProf);
                    const tProf = normalizeProf(taskProf);
                    if (cProf.length > 3 && tProf.length > 3) {
                        if (cProf.includes(tProf) || tProf.includes(cProf)) return true;
                    }
                }

                // 2. Subject Match
                if (matchSubjects(courseSubject, taskSubject)) return true;

                // 3. Fallback Content Match
                const taskSubjNorm = normalize(taskSubject);
                const courseSubjNorm = normalize(courseSubject);
                if (courseSubjNorm.length > 3 && content.includes(courseSubjNorm)) return true;

                for (const [alias, keywords] of Object.entries(subjectAliases)) {
                    if (courseSubjNorm.includes(alias) && keywords.some(k => content.includes(k))) return true;
                }

                return false;
            });

            if (validTasks.length > 0) {
                const hw = validTasks[0];
                let label = isApproximation ? '⚠️ CONTRÔLE (Date approx.)' : '⚠️ ATTENTION CONTRÔLE';

                // Smart Labeling for Generic DS
                const isGenericDS = courseSubject === 'ds' || courseSubject.includes('devoir surveille') || (course.text && course.text.trim().toLowerCase() === 'ds');
                if (isGenericDS) {
                    label = `⚠️ ${hw.subjectTitle || "EXAMEN"} (DS)`;
                } else if (hw.isExam) {
                    label = '⚠️ ÉVALUATION PRÉVUE';
                }

                return { type: 'exam', label: label.toUpperCase(), subject: hw.subjectTitle };
            }

            // FALLBACK FOR GENERIC DS (When content matching fails completely)
            // If the course is "DS" and we have ANY homeworks this day, warn the user.
            const isGenericDS = courseSubject === 'ds' || courseSubject.includes('devoir surveille') || (course.text && course.text.trim().toLowerCase() === 'ds');

            if (isGenericDS && homeworks[targetDateStr]?.length > 0) {
                // Construct a label with all subjects
                const subjects = homeworks[targetDateStr].map(h => h.subjectTitle).join(', ');
                return {
                    type: 'exam',
                    label: '⚠️ EVALUATION POSSIBLE',
                    subject: subjects
                };
            }

            return null;
        };

        // 1. Check Exact Date
        const exact = checkMatchesForDate(dateStr);
        if (exact) return exact;

        // 2. Check +/- 1 Day (often exams are shifted in calendar vs homeworks)
        const d = new Date(dateStr);

        const dPrev = new Date(d);
        dPrev.setDate(d.getDate() - 1);
        const prevStr = dPrev.toISOString().split('T')[0];
        const prevMatch = checkMatchesForDate(prevStr, true);
        if (prevMatch) return prevMatch;

        const dNext = new Date(d);
        dNext.setDate(d.getDate() + 1);
        const nextStr = dNext.toISOString().split('T')[0];
        const nextMatch = checkMatchesForDate(nextStr, true);
        if (nextMatch) return nextMatch;

        return null;
    };

    // Check if we need to fetch new data when changing dates (e.g. next week)
    // For simplicity, we fetch the whole week every time we generate a new week, or just fetch once current week
    // Let's fetch 2 weeks around selected date to be safe

    const generateWeek = (date) => {
        const current = new Date(date);
        const day = current.getDay();
        const diff = current.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
        const monday = new Date(current.setDate(diff));

        const week = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(monday);
            d.setDate(monday.getDate() + i);
            week.push(d);
        }
        setWeekDates(week);
    };

    const fetchTimetable = async (date) => {
        setIsLoading(true);
        // Calculate start/end of the week for fetching
        const current = new Date(date);
        const day = current.getDay();
        const diff = current.getDate() - day + (day === 0 ? -6 : 1);

        const start = new Date(current);
        start.setDate(diff); // Monday

        const end = new Date(start);
        end.setDate(start.getDate() + 6); // Sunday

        const startDateStr = TimetableHandler.formatDate(start);
        const endDateStr = TimetableHandler.formatDate(end);

        console.log(`[CalendarPage] Fetching timetable for account ${accountID} from ${startDateStr} to ${endDateStr}`);
        const data = await TimetableHandler.getTimetable(accountID, startDateStr, endDateStr);
        console.log(`[CalendarPage] Received ${data?.length} lessons`);
        setLessons(data || []);

        // Refresh Homeworks to ensure exam detection works
        try {
            await HomeworkHandler.getAllHomework(accountID);
            const cache = await StorageHandler.getData("homework");
            if (cache && cache[accountID] && cache[accountID].data && cache[accountID].data.homeworks) {
                const hData = cache[accountID].data;
                const organized = {};
                if (hData.days) {
                    Object.keys(hData.days).forEach(d => {
                        const ids = hData.days[d];
                        organized[d] = ids.map(id => hData.homeworks[id]).filter(Boolean);
                    });
                }
                setHomeworks(organized);
            }
        } catch (e) { console.error("Calendar: Failed to refresh homeworks", e); }

        setIsLoading(false);
    };

    // Helper: Merge courses
    const mergeCourses = (courses) => {
        if (!Array.isArray(courses)) return [];
        const merged = [];
        const processed = new Set();

        courses.forEach((course, index) => {
            if (processed.has(index)) return;

            // Find duplicates
            const sameCourses = courses.filter((c, i) =>
                i !== index &&
                !processed.has(i) &&
                c.start_date === course.start_date &&
                c.end_date === course.end_date &&
                c.matiere === course.matiere
            );

            if (sameCourses.length > 0) {
                const all = [course, ...sameCourses];
                const profs = [...new Set(all.map(c => c.prof).filter(Boolean))];
                const rooms = [...new Set(all.map(c => c.salle).filter(Boolean))];

                merged.push({
                    ...course,
                    prof: profs.join(' OU '),
                    salle: rooms.join(' / '),
                    isAnnule: all.some(c => c.isAnnule || c.typeCours === 'ANNULE' || (c.prof && c.prof.toLowerCase().includes('annul')))
                });

                processed.add(index);
                sameCourses.forEach(c => processed.add(courses.indexOf(c)));
            } else {
                merged.push(course);
                processed.add(index);
            }
        });
        return merged;
    };

    // Helper: Safe Date Parsing for Android (handles "YYYY-MM-DD HH:MM")
    const safeDate = (dateStr) => {
        if (!dateStr) return new Date();
        if (dateStr instanceof Date) return dateStr;
        // Replace space with T for ISO compliance on Android
        return new Date(dateStr.replace(' ', 'T'));
    };

    const insertBreaks = (courses) => {
        if (!courses || courses.length === 0) return [];
        const result = [];

        for (let i = 0; i < courses.length; i++) {
            const current = courses[i];
            result.push(current);

            if (i < courses.length - 1) {
                const next = courses[i + 1];
                const currentEnd = safeDate(current.end_date);
                const nextStart = safeDate(next.start_date);

                const diffMinutes = (nextStart - currentEnd) / (1000 * 60);

                // Lunch Break Logic: Gap >= 45 min AND gap starts between 11:00 and 14:00
                if (diffMinutes >= 45 && currentEnd.getHours() >= 11 && currentEnd.getHours() < 14) {
                    result.push({
                        type: 'break',
                        label: 'Pause Déjeuner',
                        start: current.end_date.split(' ')[1].substring(0, 5),
                        end: next.start_date.split(' ')[1].substring(0, 5),
                        duration: Math.round(diffMinutes)
                    });
                }
            }
        }
        return result;
    };

    const filterDailyLessons = () => {
        if (!lessons || !Array.isArray(lessons)) return;
        const dateStr = TimetableHandler.formatDate(selectedDate);
        console.log(`[CalendarPage] Filtering lessons for ${dateStr}. Total lessons: ${lessons.length}`);

        let filtered = lessons.filter(l => l.start_date.startsWith(dateStr));
        console.log(`[CalendarPage] Found ${filtered.length} lessons for ${dateStr} (pre-processing)`);

        // Inject colors
        filtered = filtered.map(l => {
            const subjectId = l.matiere || l.codeMatiere;
            let color = '#3B82F6';
            if (subjectId) {
                color = ColorsHandler.getSubjectColors(subjectId).dark;
            }
            return { ...l, color };
        });

        filtered = mergeCourses(filtered); // Merge before displaying
        filtered.sort((a, b) => a.start_date.localeCompare(b.start_date));
        filtered = insertBreaks(filtered); // Insert breaks

        console.log(`[CalendarPage] Final daily lessons count: ${filtered.length}`);
        setDailyLessons(filtered);
    };

    // Listen for color changes and update on date/lessons change
    useEffect(() => {
        filterDailyLessons(); // Update immediately when date or lessons change

        const update = () => filterDailyLessons();
        ColorsHandler.addListener(update);
        return () => ColorsHandler.removeListener(update);
    }, [selectedDate, lessons]);

    // Helper: Status
    const getCourseStatus = (course) => {
        const start = safeDate(course.start_date);
        const end = safeDate(course.end_date);
        const now = new Date(); // Use real time

        // Only if today
        if (start.toDateString() !== now.toDateString()) return 'future';

        if (now >= start && now <= end) return 'ongoing';
        if (now > end) return 'past';
        return 'future';
    };

    const getProgress = (course) => {
        const start = safeDate(course.start_date);
        const end = safeDate(course.end_date);
        const now = new Date();
        const total = end - start;
        const elapsed = now - start;
        return Math.min(100, Math.max(0, (elapsed / total) * 100));
    };

    const isColle = (course) => {
        const text = (course.text || '').toLowerCase();
        const type = (course.typeCours || '').toLowerCase();
        return text.includes('colle') || text.includes('retenue') || type.includes('colle');
    };

    const changeWeek = (direction) => {
        const newDate = new Date(selectedDate);
        newDate.setDate(selectedDate.getDate() + (direction * 7));
        setSelectedDate(newDate);
        generateWeek(newDate);
        fetchTimetable(newDate);
    };

    const isToday = (date) => {
        const today = new Date();
        return date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear();
    };

    const isSelected = (date) => {
        return date.getDate() === selectedDate.getDate() &&
            date.getMonth() === selectedDate.getMonth() &&
            date.getFullYear() === selectedDate.getFullYear();
    };

    const BreakCard = ({ item }) => (
        <View style={{ flexDirection: 'row', marginBottom: 15, alignItems: 'center' }}>
            <View style={{ width: 60, alignItems: 'center', marginRight: 10 }}>
                <Text style={{ color: '#64748B', fontSize: 11, fontWeight: 'bold' }}>{item.duration} min</Text>
            </View>
            <View style={{ width: 4, marginRight: 12 }} />

            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 16, borderStyle: 'dashed', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
                <Utensils size={14} color="#94A3B8" style={{ marginRight: 8 }} />
                <Text style={{ color: '#94A3B8', fontSize: 13, fontWeight: 'bold' }}>Pause Déjeuner ({item.start} - {item.end})</Text>
            </View>
        </View>
    );

    const CourseCard = ({ course }) => {
        const startTime = course.start_date.split(' ')[1].substring(0, 5);
        const endTime = course.end_date.split(' ')[1].substring(0, 5);

        // 1. Native Cancellation
        let isCancelled = course.isAnnule === true || course.status === 'isAnnule' || course.statut === 'Annulé' || course.typeCours === 'ANNULE' || (course.prof && (course.prof.toLowerCase().includes('annul') || course.prof.toLowerCase().includes('absent')));
        if (course.text && course.text.includes("ITALIEN")) console.log(`[DS Dbg] ITALIEN course -> isCancelled: ${isCancelled}, isAnnule: ${course.isAnnule}, statut: ${course.statut}, typeCours: ${course.typeCours}`);

        // 2. Email Detected Cancellation/Event
        const courseDate = course.start_date.split(' ')[0];
        const detectedEvent = course.prof ? suspectedEvents[`${course.prof}_${courseDate}`] : null;
        if (detectedEvent && detectedEvent.type === 'absence') {
            isCancelled = true;
        }

        const _isColle = isColle(course);
        const status = getCourseStatus(course);
        const progress = status === 'ongoing' ? getProgress(course) : 0;

        // Exam Alert
        const examAlert = !isCancelled && !_isColle ? getHomeworkAlert(course) : null;

        const color = course.color || theme.colors.primary;

        // Dynamic Styles
        const isOngoing = status === 'ongoing';
        // Calculate bg with opacity for ongoing
        const cardBg = isOngoing ? (theme.dark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.9)') : (theme.dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)');
        // Border colors
        let borderColor = isOngoing ? theme.colors.primary : (theme.dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)');
        if (isCancelled) borderColor = theme.colors.error + '4D'; // 30% opacity
        if (examAlert && !isOngoing) borderColor = theme.colors.error;

        return (
            <View style={{ marginBottom: 15, flexDirection: 'row' }}>
                {/* Time Column */}
                <View style={{ width: 60, alignItems: 'center', marginRight: 10, paddingTop: 5 }}>
                    <Text style={{ color: isOngoing ? theme.colors.primary : theme.colors.onBackground, fontWeight: 'bold', fontSize: 16 }}>{startTime}</Text>
                    <Text style={{ color: isOngoing ? (theme.dark ? '#CBD5E1' : theme.colors.onSurface) : theme.colors.onSurfaceDisabled, fontSize: 13, marginTop: 4 }}>{endTime}</Text>
                </View>

                {/* Vertical Line */}
                <View style={{ width: 4, backgroundColor: isCancelled ? theme.colors.error : (_isColle ? '#F59E0B' : color), borderRadius: 2, marginRight: 12 }} />

                {/* Card */}
                <View style={{ flex: 1 }}>
                    <View style={{
                        backgroundColor: cardBg,
                        borderRadius: 16,
                        padding: 15,
                        borderWidth: 1,
                        borderColor: borderColor,
                        overflow: 'hidden', // For progress bar
                    }}>
                        {/* Progress Bar Background */}
                        {isOngoing && (
                            <View style={{
                                position: 'absolute', bottom: 0, left: 0, height: 3,
                                width: `${progress}%`,
                                backgroundColor: theme.colors.primary
                            }} />
                        )}

                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <View style={{ flex: 1 }}>
                                <Text style={{
                                    color: isCancelled ? theme.colors.error : (_isColle ? '#F59E0B' : (isOngoing ? (theme.dark ? '#FFF' : theme.colors.onBackground) : theme.colors.onSurface)),
                                    fontSize: 16,
                                    fontWeight: 'bold',
                                    marginBottom: 4,
                                    textDecorationLine: isCancelled ? 'line-through' : 'none'
                                }}>
                                    {course.text}
                                </Text>

                                {isOngoing && (
                                    <View style={{ backgroundColor: theme.colors.primary, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, marginBottom: 6 }}>
                                        <Text style={{ color: theme.colors.primary === '#FAFAFA' ? '#000' : '#FFF', fontSize: 10, fontWeight: 'bold' }}>EN COURS</Text>
                                    </View>
                                )}

                                {examAlert && (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                                        <AlertCircle size={14} color="#F59E0B" style={{ marginRight: 4 }} />
                                        <Text style={{ color: '#F59E0B', fontSize: 12, fontWeight: 'bold' }}>{examAlert.label}</Text>
                                    </View>
                                )}

                                {isCancelled && (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                                        <AlertCircle size={14} color="#EF4444" style={{ marginRight: 4 }} />
                                        <Text style={{ color: '#EF4444', fontSize: 12, fontWeight: 'bold' }}>
                                            {detectedEvent ? "PROF. ABSENT (MAIL)" : "COURS ANNULÉ"}
                                        </Text>
                                    </View>
                                )}

                                {detectedEvent && detectedEvent.type === 'modification' && !isCancelled && (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                                        <AlertCircle size={14} color="#F59E0B" style={{ marginRight: 4 }} />
                                        <Text style={{ color: '#F59E0B', fontSize: 12, fontWeight: 'bold' }}>MODIFICATION DÉTECTÉE</Text>
                                    </View>
                                )}

                                {_isColle && (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                                        <AlertCircle size={14} color="#F59E0B" style={{ marginRight: 4 }} />
                                        <Text style={{ color: '#F59E0B', fontSize: 12, fontWeight: 'bold' }}>RETENUE / COLLE</Text>
                                    </View>
                                )}
                            </View>
                        </View>

                        <View style={{ marginTop: 8, flexDirection: 'row', flexWrap: 'wrap' }}>
                            {course.salle && (
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 15, marginBottom: 4 }}>
                                    <MapPin size={14} color={isOngoing ? (theme.dark ? '#CBD5E1' : theme.colors.onSurface) : theme.colors.onSurfaceDisabled} style={{ marginRight: 5 }} />
                                    <Text style={{ color: isOngoing ? (theme.dark ? '#CBD5E1' : theme.colors.onSurface) : theme.colors.onSurfaceDisabled, fontSize: 13 }}>{course.salle}</Text>
                                </View>
                            )}
                            {course.prof && (
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                                    <User size={14} color={isOngoing ? (theme.dark ? '#CBD5E1' : theme.colors.onSurface) : theme.colors.onSurfaceDisabled} style={{ marginRight: 5 }} />
                                    <Text style={{ color: isOngoing ? (theme.dark ? '#CBD5E1' : theme.colors.onSurface) : theme.colors.onSurfaceDisabled, fontSize: 13 }}>{course.prof}</Text>
                                </View>
                            )}
                        </View>

                        {/* Show mail subject if detected */}
                        {detectedEvent && (
                            <View style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' }}>
                                <Text style={{ color: '#94A3B8', fontSize: 11, fontStyle: 'italic' }}>
                                    " {detectedEvent.subject} "
                                </Text>
                            </View>
                        )}
                    </View>
                </View>
            </View>
        );
    };

    // Days Format
    const days = ['DIM', 'LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM'];

    return (
        <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
            <LinearGradient
                colors={[theme.colors.primaryLight || theme.colors.primary || '#000', theme.colors.background]}
                style={{ position: 'absolute', width: '100%', height: '100%' }}
            />


            {/* Header */}
            <View style={{ paddingTop: insets.top + (Platform.OS === 'android' ? 20 : 10), paddingBottom: 10, paddingHorizontal: 20 }}>
                {/* Title and Nav Stack */}
                <View style={{ marginBottom: 20 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                        <View>
                            <Text style={{ fontSize: 32, fontFamily: 'Text-Bold', fontWeight: 'bold', color: theme.colors.onBackground }}>
                                Emploi du temps
                            </Text>


                        </View>
                        <PressableScale
                            onPress={() => fetchTimetable(selectedDate)}
                            style={({ pressed }) => ({
                                padding: 10,
                                backgroundColor: pressed ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)',
                                borderRadius: 12
                            })}
                        >
                            <RotateCw size={20} color="#94A3B8" />
                        </PressableScale>
                    </View>

                    {/* Navigation Capsule - Centered Row */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        {/* Previous Week */}
                        <PressableScale
                            onPress={() => changeWeek(-1)}
                            style={{
                                padding: 8,
                                backgroundColor: theme.dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                                borderRadius: 50,
                                borderWidth: 1,
                                borderColor: theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'
                            }}
                        >
                            <ChevronLeft size={20} color={theme.dark ? "#E2E8F0" : theme.colors.onBackground} />
                        </PressableScale>

                        {/* Month Label */}
                        <View style={{
                            paddingHorizontal: 16,
                            paddingVertical: 8,
                            backgroundColor: theme.colors.primary + '1A',
                            borderRadius: 12,
                            borderWidth: 1,
                            borderColor: theme.colors.primary + '4D',
                            minWidth: 140,
                            alignItems: 'center'
                        }}>
                            <Text style={{
                                color: theme.colors.primary,
                                fontSize: 15,
                                fontWeight: 'bold',
                                textTransform: 'capitalize'
                            }}>
                                {selectedDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                            </Text>
                        </View>

                        {/* Next Week */}
                        <PressableScale
                            onPress={() => changeWeek(1)}
                            style={{
                                padding: 8,
                                backgroundColor: theme.dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                                borderRadius: 50,
                                borderWidth: 1,
                                borderColor: theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'
                            }}
                        >
                            <ChevronRight size={20} color={theme.dark ? "#E2E8F0" : theme.colors.onBackground} />
                        </PressableScale>
                    </View>
                </View>

                {/* Days Strip */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    {weekDates.map((date, index) => {
                        const dayName = days[date.getDay()];
                        const active = isSelected(date);
                        const isCurrentDay = isToday(date);

                        return (
                            <PressableScale
                                key={index}
                                onPress={() => setSelectedDate(date)}
                                style={{ alignItems: 'center', width: 45 }}
                            >
                                <Text style={{
                                    color: active ? theme.colors.primary : isCurrentDay ? theme.colors.secondary || '#3B82F6' : '#64748B',
                                    fontSize: 12,
                                    fontWeight: 'bold',
                                    marginBottom: 8
                                }}>
                                    {dayName}
                                </Text>
                                <View style={{
                                    width: 36, height: 36,
                                    borderRadius: 18,
                                    backgroundColor: active ? theme.colors.primary : isCurrentDay ? theme.colors.primary + '33' : 'transparent',
                                    justifyContent: 'center', alignItems: 'center',
                                    borderWidth: isToday(date) && !active ? 1 : 0,
                                    borderColor: theme.colors.primary
                                }}>
                                    <Text style={{
                                        color: active ? (theme.colors.primary === '#FAFAFA' ? '#000' : '#FFF') : isCurrentDay ? theme.colors.primary : (theme.dark ? '#FFF' : theme.colors.onSurface),
                                        fontSize: 16,
                                        fontWeight: 'bold'
                                    }}>
                                        {date.getDate()}
                                    </Text>
                                </View>
                            </PressableScale>
                        );
                    })}
                </View>
            </View>

            {/* Content */}
            <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100, paddingTop: 10 }}>
                {isLoading ? (
                    <View style={{ marginTop: 50, alignItems: 'center' }}>
                        <ActivityIndicator size="large" color={theme.colors.primary} />
                        <Text style={{ color: '#64748B', marginTop: 10 }}>Chargement...</Text>
                    </View>
                ) : (
                    <View style={{ marginBottom: 100 }}>
                        {(() => {
                            const isHoliday = dailyLessons.length === 0 || (dailyLessons.length === 1 && (
                                dailyLessons[0].matiere?.toUpperCase().includes('CONGÉS') ||
                                dailyLessons[0].text?.toUpperCase().includes('CONGÉS') ||
                                dailyLessons[0].matiere?.toUpperCase().includes('VACANCES') ||
                                dailyLessons[0].text?.toUpperCase().includes('VACANCES') ||
                                dailyLessons[0].matiere?.toUpperCase().includes('FERIÉ')
                            ));

                            if (!isHoliday) {
                                return dailyLessons.map((lesson, index) => {
                                    if (lesson.type === 'break') {
                                        return <BreakCard key={`break-${index}`} item={lesson} />;
                                    }
                                    return <CourseCard key={index} course={lesson} />;
                                });
                            } else {
                                return (
                                    <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 50, opacity: 0.7 }}>
                                        <View style={{
                                            width: 80, height: 80, borderRadius: 40,
                                            backgroundColor: 'rgba(245, 158, 11, 0.1)',
                                            alignItems: 'center', justifyContent: 'center',
                                            marginBottom: 15
                                        }}>
                                            <Text style={{ fontSize: 40 }}>🌴</Text>
                                        </View>
                                        <Text style={{ color: theme.colors.onBackground, fontSize: 20, fontWeight: 'bold' }}>Bonnes vacances !</Text>
                                        <Text style={{ color: theme.colors.onSurfaceDisabled, fontSize: 14, textAlign: 'center', marginTop: 5, maxWidth: 250 }}>
                                            Profite bien de ton repos mérité. ☀️{"\n"}Aucun cours prévu pour cette journée.
                                        </Text>
                                    </View>
                                );
                            }
                        })()}
                    </View>
                )}

                {/* Banner Ad at the end of the day */}
                <BannerAdComponent placement="timetable" />
            </ScrollView>
        </View>
    );
}

export default CalendarPage;
