import { useState, useEffect, useMemo } from "react";
import { Text, ActivityIndicator, View, ScrollView, TouchableOpacity, Switch, Platform, UIManager, LayoutAnimation } from "react-native";
import { PressableScale } from 'react-native-pressable-scale';
import { AlertTriangle, RefreshCw, CheckCircle, Calendar, BookOpen, BarChart3, Filter, ChevronLeft, ChevronRight } from "lucide-react-native";
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useGlobalAppContext } from "../../../util/GlobalAppContext";
import { useAppStackContext } from "../../../util/AppStackContext";
import { useCurrentAccountContext } from "../../../util/CurrentAccountContext";
import StorageHandler from "../../../core/StorageHandler";
import ColorsHandler from "../../../core/ColorsHandler";
import HomeworkHandler from "../../../core/HomeworkHandler";
import CustomHtmlRender from "../../components/CustomHtmlRender";
import CustomFileAttachment from "../../components/CustomFileAttachment";
import BannerAdComponent from "../../components/Ads/BannerAdComponent";

function UpcomingHomeworkPage({ navigation, route }) {
  const { theme } = useGlobalAppContext();
  const insets = useSafeAreaInsets();
  const { isConnected, globalDisplayUpdater, updateGlobalDisplay } = useAppStackContext();
  const { accountID: contextAccountID, mainAccount, isGettingHomework, getHomework } = useCurrentAccountContext();
  // Fix: Calculate effective ID to handle cases where contextAccountID is undefined
  const accountID = (contextAccountID && contextAccountID !== "undefined") ? contextAccountID : ((mainAccount?.id && mainAccount.id !== "undefined") ? mainAccount.id : null);

  // Debug log to confirm ID resolution
  useEffect(() => {
    if (accountID) console.log(`[UpcomingHomework] Resolved Account ID: ${accountID}`);
  }, [accountID]);


  // Initialize with empty structure, will be loaded from cache
  const [abstractHomeworks, setAbstractHomeworks] = useState({ days: {}, weeks: {}, homeworks: {} });
  const [selectedSubject, setSelectedSubject] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [expandedHomework, setExpandedHomework] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [colorsVersion, setColorsVersion] = useState(0); // Used to force re-render on color change

  useEffect(() => {
    const update = () => setColorsVersion(v => v + 1);
    ColorsHandler.addListener(update);
    return () => ColorsHandler.removeListener(update);
  }, []);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState("homework"); // "homework" or "session"

  // Session Mode States
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [sessionContents, setSessionContents] = useState({});
  const [historyLoaded, setHistoryLoaded] = useState(false);

  // --- New Calendar Logic (Weekly) ---
  const [weekDates, setWeekDates] = useState([]);

  const getISODate = (d) => d.toISOString().split('T')[0];
  const isSelected = (d) => getISODate(d) === selectedDate;
  const isTodayDate = (d) => getISODate(d) === getISODate(new Date());

  const generateWeek = (centerDate) => {
    const current = new Date(centerDate);
    const day = current.getDay();
    const diff = current.getDate() - day + (day === 0 ? -6 : 1); // Lundi pivot
    const monday = new Date(current.setDate(diff));
    const week = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      week.push(d);
    }
    setWeekDates(week);
  };

  const changeWeek = (direction) => {
    const current = selectedDate ? new Date(selectedDate) : new Date();
    const newDate = new Date(current);
    newDate.setDate(current.getDate() + (direction * 7));
    const newIso = getISODate(newDate);
    setSelectedDate(newIso);
    generateWeek(newDate);
  };

  useEffect(() => {
    if (viewMode === 'session') {
      generateWeek(selectedDate || new Date());
    }
  }, [viewMode]);

  // Load Session History Logic (Pre-load in background)
  useEffect(() => {
    if (accountID && isConnected && !historyLoaded) {
      loadSessionHistory();
    }
  }, [accountID, isConnected]);

  const loadSessionHistory = async (force = false) => {
    setHistoryLoaded(true);
    console.log("🔄 Loading session history...");

    // 1. Load from cache immediately
    const cache = await StorageHandler.getData("specific-homework");
    if (cache && cache[accountID]) {
      processSessionCache(cache[accountID]);
    }

    // 2. Fetch history (Sequentially to avoid cache write conflicts)
    const today = new Date();
    let needsReload = false;

    // Get current cache state for checking validity
    const currentCache = await StorageHandler.getData("specific-homework");

    // Range: -3 (3 days in future) to 30 (30 days in past)
    // We start from -3 to 30 to catch pre-filled sessions
    for (let i = -3; i < 30; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      // Use local date components
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${day}`;

      // -- Check Cache Validity --
      let shouldFetch = true;

      if (currentCache && currentCache[accountID] && currentCache[accountID].days && currentCache[accountID].days[dateStr]) {
        // Data exists, check age
        const dayData = currentCache[accountID].days[dateStr];
        if (dayData.date) {
          const lastUpdate = new Date(dayData.date);
          const now = new Date();
          const diffHours = (now - lastUpdate) / (1000 * 60 * 60);
          if (diffHours < 24 && !force) {
            shouldFetch = false; // Fresh enough (< 24h)
          }
        } else {
          // No timestamp, maybe assume fresh if it exists? Or fetch once to be safe.
          // Let's assume valid to avoid spam, unless forced.
          if (!force) shouldFetch = false;
        }
      }

      if (!shouldFetch) {
        // console.log(`Skipping ${dateStr} (already in cache)`);
        continue;
      }

      try {
        // Sequentially await to prevent cache race conditions in StorageHandler
        await HomeworkHandler.getSpecificHomeworkForDay(accountID, dateStr);
        needsReload = true;
        // console.log(`Fetched ${dateStr}`);
      } catch (e) {
        console.log(`Failed to fetch ${dateStr}`);
      }

      // Small delay to be gentle on CPU/Storage
      await new Promise(r => setTimeout(r, 20));
    }

    // 3. Reload from cache to update UI only if we updated something
    if (needsReload) {
      const updatedCache = await StorageHandler.getData("specific-homework");
      if (updatedCache && updatedCache[accountID]) {
        processSessionCache(updatedCache[accountID]);
      }
    }
  };

  const processSessionCache = (accountCache) => {
    const newContents = {};
    if (accountCache.days) {
      Object.keys(accountCache.days).forEach(date => {
        const dayData = accountCache.days[date];
        if (dayData && dayData.homeworkIDs) {
          const items = dayData.homeworkIDs.map(id => accountCache.homeworks[id]).filter(h =>
            (h && (h.sessionContentHtml ? h.sessionContentHtml.trim().length > 0 : (h.sessionContent && h.sessionContent.length > 0))) ||
            (h && h.files && h.files.length > 0)
          );
          if (items.length > 0) newContents[date] = items;
        }
      });
    }
    setSessionContents(newContents);
  };

  // Calendar Helpers
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startingDayOfWeek = new Date(year, month, 1).getDay();
    // Adjust for Monday start (0=Sun -> 6, 1=Mon -> 0)
    const adjustedStart = startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1;
    return { daysInMonth, startingDayOfWeek: adjustedStart, year, month };
  };

  const changeMonth = (offset) => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + offset);
    setCurrentMonth(newMonth);
  };

  const handleDateClick = (dateStr) => {
    setSelectedDate(dateStr);
  };

  // Load homeworks on mount and when data updates
  useEffect(() => {
    if (accountID) {
      loadHomeworks();
    }
  }, [accountID, globalDisplayUpdater]);

  const loadHomeworks = async () => {
    try {
      const data = await StorageHandler.getData("homework");
      const cacheData = data ?? {};
      console.log("📚 Cache data:", cacheData);

      if (accountID in cacheData) {
        let newAbstractHomeworks = cacheData[accountID].data;
        console.log("📋 Abstract homeworks:", newAbstractHomeworks);

        Object.keys(cacheData[accountID].data.days).map(day => {
          newAbstractHomeworks.days[day] = cacheData[accountID].data.days[day].map(
            homeworkID => cacheData[accountID].data.homeworks[homeworkID]
          );
        });

        console.log("✅ Loaded homeworks:", newAbstractHomeworks);
        // Check if data is stale (missing 'content' or 'files' property which were recently added)
        let isStale = false;
        const firstDay = Object.keys(cacheData[accountID].data.days)[0];
        if (firstDay && cacheData[accountID].data.days[firstDay].length > 0) {
          const firstId = cacheData[accountID].data.days[firstDay][0];
          const sampleHw = cacheData[accountID].data.homeworks[firstId];
          // If 'content' is explicitly undefined OR empty string (potentially missed in prev fetch), verify.
          // We can check if 'files' is undefined too, which means it definitely needs an update.
          if (sampleHw && (sampleHw.content === undefined || sampleHw.files === undefined)) {
            isStale = true;
          }
        }

        if (isStale) {
          console.log("🔄 Detected stale cache (missing fields). Force refreshing...");
          refreshHomeworks();
        } else {
          setAbstractHomeworks(newAbstractHomeworks);
        }
      } else {
        console.log("❌ No data for accountID:", accountID);
        console.log("🔄 Fetching homeworks from API...");
        // If no cache, fetch from API
        await refreshHomeworks();
      }
    } catch (error) {
      console.error("Error loading homeworks:", error);
    }
  };

  const refreshHomeworks = async () => {
    setIsLoading(true);
    try {
      if (viewMode === 'session') {
        // Force reload history
        console.log("🔄 Force refreshing session history...");
        await loadSessionHistory(true);
      } else {
        await getHomework(accountID, true);
        // Reload from cache after fetching
        await loadHomeworks();
      }
    } catch (error) {
      console.error("Error refreshing homeworks:", error);
    }
    setIsLoading(false);
  };

  // Group homeworks by date
  const groupedHomeworks = useMemo(() => {
    if (!abstractHomeworks?.days) return { today: [], thisWeek: [], later: [] };

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    const weekFromNow = new Date(today);
    weekFromNow.setDate(weekFromNow.getDate() + 7);

    const groups = { today: [], thisWeek: [], later: [] };

    Object.entries(abstractHomeworks.days).forEach(([date, homeworks]) => {
      const taskDate = new Date(date);
      taskDate.setHours(0, 0, 0, 0);

      // Skip past dates
      if (taskDate < today) return;

      homeworks.forEach(homework => {
        // Filter by subject
        if (selectedSubject !== "all" && homework.subjectID !== selectedSubject) return;

        // Filter by status
        if (selectedStatus === "done" && !homework.done) return;
        if (selectedStatus === "pending" && homework.done) return;

        const homeworkItem = { ...homework, dueDate: date };

        if (date === todayStr) {
          groups.today.push(homeworkItem);
        } else if (taskDate <= weekFromNow) {
          groups.thisWeek.push(homeworkItem);
        } else {
          groups.later.push(homeworkItem);
        }
      });
    });

    return groups;
  }, [abstractHomeworks, selectedSubject, selectedStatus]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (!abstractHomeworks?.days) return { total: 0, done: 0, pending: 0, progress: 0 };

    let total = 0;
    let done = 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    Object.entries(abstractHomeworks.days).forEach(([dateKey, homeworks]) => {
      const taskDate = new Date(dateKey);
      taskDate.setHours(0, 0, 0, 0);

      // Only count future homeworks
      if (taskDate < today) return;

      homeworks.forEach(homework => {
        total++;
        if (homework.done) done++;
      });
    });

    return {
      total,
      done,
      pending: total - done,
      progress: total > 0 ? Math.round((done / total) * 100) : 0
    };
  }, [abstractHomeworks]);

  // Get unique subjects
  const subjects = useMemo(() => {
    if (!abstractHomeworks?.homeworks) return [];

    const subjectSet = new Set();
    Object.values(abstractHomeworks.homeworks).forEach(homework => {
      if (homework.subjectID) subjectSet.add(homework.subjectID);
    });

    return Array.from(subjectSet);
  }, [abstractHomeworks]);

  const toggleHomework = (homeworkId) => {
    setExpandedHomework(expandedHomework === homeworkId ? null : homeworkId);
  };

  const toggleDone = async (homework) => {
    const newDoneStatus = !homework.done;

    // Update locally first
    if (abstractHomeworks?.days?.[homework.dueDate]) {
      const updatedHomeworks = { ...abstractHomeworks };
      const dayHomeworks = updatedHomeworks.days[homework.dueDate];
      const index = dayHomeworks.findIndex(h => h.id === homework.id);

      if (index !== -1) {
        dayHomeworks[index] = { ...dayHomeworks[index], done: newDoneStatus };
        setAbstractHomeworks(updatedHomeworks);
      }
    }

    // Sync with backend
    try {
      await HomeworkHandler.markHomeworkAsDone(accountID, homework.id, newDoneStatus);
      updateGlobalDisplay();
    } catch (error) {
      console.error('Error syncing homework status:', error);
    }
  };

  const formatDateRelative = (dateStr) => {
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) return "Aujourd'hui";
    if (date.toDateString() === tomorrow.toDateString()) return "Demain";

    return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  };

  // Enable LayoutAnimation for Android
  if (Platform.OS === 'android') {
    if (UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }

  const HomeworkCard = ({ homework }) => {
    const { dark } = ColorsHandler.getSubjectColors(homework.subjectID, homework.subjectTitle);
    const isExpanded = expandedHomework === homework.id;

    // Animation trigger
    const handleToggleDone = (e) => {
      // e.stopPropagation is handled in parent wrapper usually, but here we can just call the logic
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      toggleDone(homework);
    };

    const handleExpand = () => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      toggleHomework(homework.id);
    };

    return (
      <TouchableOpacity
        onPress={handleExpand}
        activeOpacity={0.9}
        style={{
          backgroundColor: (theme.dark ? 'rgba(255,255,255,0.05)' : '#FFFFFF'),
          borderRadius: 16,
          padding: 16,
          marginBottom: 12,
          borderLeftWidth: 3,
          borderLeftColor: homework.done ? '#4ADE80' : dark, // Green if done, Subject color if todo
          borderWidth: 1,
          borderColor: homework.done ? 'rgba(74, 222, 128, 0.2)' : (theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'),
          shadowColor: "#000", shadowOpacity: theme.dark ? 0 : 0.05, shadowRadius: 5, elevation: Platform.OS === 'android' ? 0 : 1
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
              <Text style={{ color: homework.done ? '#86EFAC' : dark, fontSize: 12, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' }}>
                {homework.subjectTitle}
              </Text>
            </View>

            {homework.done && (
              <View style={{
                backgroundColor: 'rgba(74, 222, 128, 0.15)',
                alignSelf: 'flex-start',
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 6,
                marginBottom: 8,
                flexDirection: 'row',
                alignItems: 'center',
                borderWidth: 1,
                borderColor: 'rgba(74, 222, 128, 0.3)'
              }}>
                <CheckCircle size={10} color="#4ADE80" style={{ marginRight: 4 }} />
                <Text style={{ color: '#4ADE80', fontSize: 10, fontWeight: 'bold' }}>VALIDÉ</Text>
              </View>
            )}

            <Text
              style={{
                color: homework.done ? '#64748B' : (theme.dark ? '#F8FAFC' : '#000000'),
                fontSize: 15,
                lineHeight: 20,
                marginBottom: 8,
                fontWeight: homework.done ? '400' : '600',
                textDecorationLine: homework.done ? 'line-through' : 'none'
              }}
              numberOfLines={isExpanded ? undefined : 1}
            >
              {(() => {
                const rawContent = (homework.content || "").trim();

                if (rawContent.length > 0) {
                  // Get first line, remove excessive spaces
                  let firstLine = rawContent.split('\n')[0].replace(/\s+/g, ' ').trim();

                  // Truncate if too long (e.g. 50 chars)
                  if (firstLine.length > 50) {
                    firstLine = firstLine.substring(0, 50) + "...";
                  }

                  return firstLine;
                }

                if (homework.files && homework.files.length > 0) return "📄 Voir la pièce jointe";
                return "Voir le détail du travail";
              })()}
            </Text>

            <Text style={{ color: '#94A3B8', fontSize: 13 }}>
              {formatDateRelative(homework.dueDate)}
            </Text>
          </View>

          <TouchableOpacity
            onPress={(e) => { e.stopPropagation(); handleToggleDone(); }}
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              borderWidth: 2,
              borderColor: homework.done ? '#4ADE80' : '#475569',
              backgroundColor: homework.done ? 'rgba(74, 222, 128, 0.2)' : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {homework.done && <CheckCircle color="#4ADE80" size={20} />}
          </TouchableOpacity>
        </View>

        {isExpanded && (
          <View style={{ marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' }}>
            <TouchableOpacity
              onPress={() => navigation.navigate("HomeworkPage", {
                cacheHomework: homework,
                cacheSpecificHomework: null
              })}
              style={{
                backgroundColor: homework.done ? (theme.dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)') : dark + '20',
                paddingVertical: 14,
                borderRadius: 14,
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center'
              }}
            >
              <Text style={{ color: homework.done ? '#FFF' : dark, fontWeight: 'bold', fontSize: 15 }}>Voir les détails</Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const HomeworkGroup = ({ title, homeworks, icon }) => {
    if (homeworks.length === 0) return null;

    return (
      <View style={{ marginBottom: 24 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
          <Text style={{ fontSize: 20, marginRight: 8 }}>{icon}</Text>
          <Text style={{ color: theme.dark ? '#F8FAFC' : theme.colors.onBackground, fontSize: 18, fontWeight: 'bold', flex: 1 }}>
            {title}
          </Text>
          <View style={{
            backgroundColor: theme.colors.primary + '33',
            paddingHorizontal: 12,
            paddingVertical: 4,
            borderRadius: 12,
          }}>
            <Text style={{ color: theme.colors.primary, fontWeight: '600', fontSize: 13 }}>
              {homeworks.length}
            </Text>
          </View>
        </View>
        {homeworks.map(homework => (
          <HomeworkCard key={homework.id} homework={homework} />
        ))}
      </View>
    );
  };

  const StatsCard = () => (
    <View style={{
      backgroundColor: theme.colors.primary + '1A',
      borderRadius: 20,
      padding: 20,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: theme.colors.primary + '33',
      shadowColor: "#000", shadowOpacity: theme.dark ? 0 : 0.05, shadowRadius: 5, elevation: Platform.OS === 'android' ? 0 : 1
    }}>
      <Text style={{ color: theme.colors.onBackground, fontSize: 18, fontWeight: 'bold', marginBottom: 16 }}>
        📊 Statistiques
      </Text>

      <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 16 }}>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ color: '#94A3B8', fontSize: 13, marginBottom: 4 }}>Total</Text>
          <Text style={{ color: theme.dark ? '#F8FAFC' : theme.colors.onSurface, fontSize: 24, fontWeight: 'bold' }}>{stats.total}</Text>
        </View>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ color: '#94A3B8', fontSize: 13, marginBottom: 4 }}>Faits</Text>
          <Text style={{ color: '#4ADE80', fontSize: 24, fontWeight: 'bold' }}>{stats.done}</Text>
        </View>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ color: '#94A3B8', fontSize: 13, marginBottom: 4 }}>Restants</Text>
          <Text style={{ color: '#F59E0B', fontSize: 24, fontWeight: 'bold' }}>{stats.pending}</Text>
        </View>
      </View>

      <View style={{ backgroundColor: 'rgba(255,255,255,0.1)', height: 8, borderRadius: 4, overflow: 'hidden' }}>
        <View style={{
          backgroundColor: theme.colors.primary,
          height: '100%',
          width: `${stats.progress}%`,
          borderRadius: 4,
        }} />
      </View>
      <Text style={{ color: '#94A3B8', fontSize: 12, textAlign: 'center', marginTop: 8 }}>
        {stats.progress}% complété
      </Text>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <LinearGradient
        colors={[theme.colors.primaryLight || theme.colors.primary || '#000', theme.colors.background]}
        style={{ position: 'absolute', width: '100%', height: '100%' }}
      />

      {/* Header */}
      <View style={{
        paddingTop: insets.top + (Platform.OS === 'android' ? 20 : 20),
        paddingHorizontal: 20,
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start'
      }}>
        {/* Title Section */}
        <View style={{ flex: 1 }}>
          <Text style={{ color: theme.colors.onBackground, fontSize: 28, fontWeight: 'bold' }}>
            Cahier de texte
          </Text>
          {/* Optional Debug Text - kept small */}
          <Text style={{ color: '#64748B', fontSize: 11, marginTop: 4 }}>
            {Object.keys(abstractHomeworks?.days || {}).length} jours chargés
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
          <TouchableOpacity
            onPress={() => setShowFilters(!showFilters)}
            style={{
              backgroundColor: showFilters ? theme.colors.primary + '33' : (theme.dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'),
              padding: 10,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: showFilters ? theme.colors.primary + '4D' : 'rgba(255,255,255,0.1)',
            }}
          >
            <Filter color={showFilters ? theme.colors.primary : '#94A3B8'} size={20} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={refreshHomeworks}
            disabled={isLoading}
            style={{
              backgroundColor: theme.colors.primary + '33',
              padding: 10,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: theme.colors.primary + '4D',
            }}
          >
            {isLoading ? (
              <ActivityIndicator color={theme.colors.primary} size="small" />
            ) : (
              <RefreshCw color={theme.colors.primary} size={20} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* View Mode Toggle */}
      <View style={{
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)'
      }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            onPress={() => setViewMode("homework")}
            style={{
              flex: 1,
              backgroundColor: viewMode === "homework" ? theme.colors.primary : (theme.dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'),
              paddingVertical: 12,
              borderRadius: 12,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: viewMode === "homework" ? theme.colors.primary : (theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'),
            }}
          >
            <Text style={{
              color: viewMode === "homework" ? (theme.colors.primary === '#FAFAFA' ? '#000' : '#FFF') : '#94A3B8',
              fontWeight: '600',
              fontSize: 15
            }}>
              📝 Devoirs
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setViewMode("session")}
            style={{
              flex: 1,
              backgroundColor: viewMode === "session" ? theme.colors.primary : (theme.dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'),
              paddingVertical: 12,
              borderRadius: 12,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: viewMode === "session" ? theme.colors.primary : (theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'),
            }}
          >
            <Text style={{
              color: viewMode === "session" ? (theme.colors.primary === '#FAFAFA' ? '#000' : '#FFF') : '#94A3B8',
              fontWeight: '600',
              fontSize: 15
            }}>
              📚 Contenu de séance
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {viewMode === "homework" ? (
          <>
            <StatsCard />

            {showFilters && (
              <View style={{
                backgroundColor: theme.dark ? 'rgba(255,255,255,0.05)' : '#FFFFFF',
                borderRadius: 16,
                padding: 16,
                marginBottom: 20,
                borderWidth: 1,
                borderColor: theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                shadowColor: "#000", shadowOpacity: theme.dark ? 0 : 0.05, shadowRadius: 5, elevation: Platform.OS === 'android' ? 0 : 1
              }}>
                <Text style={{ color: theme.dark ? '#F8FAFC' : theme.colors.onBackground, fontSize: 16, fontWeight: 'bold', marginBottom: 12 }}>
                  Filtres
                </Text>

                <Text style={{ color: '#94A3B8', fontSize: 13, marginBottom: 8 }}>Statut</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                  {['all', 'pending', 'done'].map(status => (
                    <TouchableOpacity
                      key={status}
                      onPress={() => setSelectedStatus(status)}
                      style={{
                        flex: 1,
                        backgroundColor: selectedStatus === status ? theme.colors.primary : (theme.dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'),
                        paddingVertical: 10,
                        borderRadius: 12,
                        alignItems: 'center',
                      }}
                    >
                      <Text style={{ color: selectedStatus === status ? '#FFF' : '#94A3B8', fontWeight: '600' }}>
                        {status === 'all' ? 'Tous' : status === 'pending' ? 'En attente' : 'Faits'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {groupedHomeworks.today.length === 0 &&
              groupedHomeworks.thisWeek.length === 0 &&
              groupedHomeworks.later.length === 0 ? (
              <View style={{ alignItems: 'center', marginTop: 60 }}>
                <Text style={{ fontSize: 60, marginBottom: 16 }}>🎉</Text>
                <Text style={{ color: '#F8FAFC', fontSize: 18, fontWeight: 'bold', marginBottom: 8 }}>
                  Aucun devoir !
                </Text>
                <Text style={{ color: '#94A3B8', fontSize: 14 }}>
                  Profitez de votre temps libre
                </Text>
              </View>
            ) : (
              <>
                <HomeworkGroup title="Aujourd'hui" homeworks={groupedHomeworks.today} icon="📅" />
                <HomeworkGroup title="Cette semaine" homeworks={groupedHomeworks.thisWeek} icon="📆" />
                <HomeworkGroup title="Plus tard" homeworks={groupedHomeworks.later} icon="🗓️" />
              </>
            )}
          </>
        ) : (
          // Session Content View
          // Session Content View
          <View>
            {/* Weekly Calendar Strip (Nouveau Design) */}
            <View style={{ marginBottom: 20 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
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

                <View style={{
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  backgroundColor: theme.colors.primary + '1A', // Dynamic
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: theme.colors.primary + '4D', // Dynamic
                  minWidth: 140,
                  alignItems: 'center'
                }}>
                  <Text style={{
                    color: theme.colors.primary, // Consistency with CalendarPage
                    fontSize: 15,
                    fontWeight: 'bold',
                    textTransform: 'capitalize'
                  }}>
                    {selectedDate ? new Date(selectedDate).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) : ""}
                  </Text>
                </View>

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

              {/* Days Strip */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                {weekDates.map((dateObj, index) => {
                  const dateStr = getISODate(dateObj);
                  const dayName = ['DIM', 'LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM'][dateObj.getDay()];
                  const active = isSelected(dateObj);
                  const isCurrentDay = isTodayDate(dateObj);
                  const hasContent = sessionContents[dateStr] && sessionContents[dateStr].length > 0;

                  return (
                    <PressableScale
                      key={index}
                      onPress={() => setSelectedDate(dateStr)}
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
                        borderWidth: isTodayDate(dateObj) && !active ? 1 : 0,
                        borderColor: theme.colors.primary
                      }}>
                        <Text style={{
                          color: active ? (theme.colors.primary === '#FAFAFA' ? '#000' : '#FFF') : isCurrentDay ? theme.colors.primary : (theme.dark ? '#FFF' : '#000000'),
                          fontSize: 16,
                          fontWeight: 'bold'
                        }}>
                          {dateObj.getDate()}
                        </Text>
                      </View>
                      {hasContent && !active && (
                        <View style={{
                          marginTop: 4,
                          width: 4, height: 4, borderRadius: 2,
                          backgroundColor: theme.colors.primary
                        }} />
                      )}
                    </PressableScale>
                  );
                })}
              </View>
            </View>

            {/* Selected Date Content */}
            <View>
              <Text style={{ color: theme.dark ? '#F8FAFC' : theme.colors.onBackground, fontSize: 18, fontWeight: 'bold', marginBottom: 15, textTransform: 'capitalize' }}>
                {new Date(selectedDate).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </Text>

              {sessionContents[selectedDate] ? (
                sessionContents[selectedDate].map((item, idx) => {
                  const { dark } = ColorsHandler.getSubjectColors(item.subject || item.givenBy || "default");
                  return (
                    <View key={idx} style={{
                      backgroundColor: theme.dark ? 'rgba(255,255,255,0.05)' : '#FFFFFF',
                      borderRadius: 16,
                      padding: 16,
                      marginBottom: 12,
                      borderLeftWidth: 3,
                      borderLeftColor: dark,
                      borderWidth: 1,
                      borderColor: theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                      shadowColor: "#000", shadowOpacity: theme.dark ? 0 : 0.05, shadowRadius: 5, elevation: 1
                    }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                        <Text style={{ color: dark, fontWeight: 'bold', fontSize: 13 }}>{item.subject || item.givenBy || "Matière"}</Text>
                        {item.givenBy && <Text style={{ color: '#64748B', fontSize: 12 }}>{item.givenBy}</Text>}
                      </View>

                      {/* Affichage du contenu de séance (Texte + Images) via CustomHtmlRender */}
                      {(item.sessionContentHtml || (item.sessionContent && item.sessionContent.trim() !== "")) ? (
                        <CustomHtmlRender
                          html={item.sessionContentHtml || item.sessionContent}
                          baseStyle={{ color: theme.dark ? '#E2E8F0' : '#1E293B', fontSize: 14, lineHeight: 20 }}
                        />
                      ) : (
                        <Text style={{ color: theme.dark ? '#E2E8F0' : '#1E293B', fontSize: 14, lineHeight: 20, fontStyle: 'italic', opacity: 0.7 }}>
                          Aucun détail disponible.
                        </Text>
                      )}

                      {item.files && item.files.length > 0 && (
                        <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' }}>
                          <Text style={{ color: '#94A3B8', fontSize: 12, marginBottom: 6 }}>Fichiers joints :</Text>
                          {item.files.map((f, i) => (
                            <CustomFileAttachment
                              key={i}
                              file={f}
                              color={dark}
                              windowWidth={350} // Approximate width or useDimension
                              style={{ marginBottom: 8 }}
                            />
                          ))}
                        </View>
                      )}
                    </View>
                  );
                })
              ) : (
                <View style={{ alignItems: 'center', marginTop: 40, opacity: 0.5 }}>
                  <BookOpen size={40} color="#64748B" />
                  <Text style={{ color: '#64748B', marginTop: 10 }}>Aucun contenu pour cette date.</Text>
                </View>
              )}
            </View>
          </View>
        )}
        <BannerAdComponent placement="homework" />
      </ScrollView>
    </View>
  );
}

export default UpcomingHomeworkPage;