import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";

import { defaultNotificationPreferences, seedBrands, seedInbox, seedSaleEvents } from "./seedData";
import type {
  AppScreen,
  NotificationPreferenceState,
  SeedBrand,
  SeedInboxItem,
  SeedSaleEvent,
  SortMode,
  UserMode
} from "./types";

const WEEK_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const CATEGORY_COLORS: Record<SeedBrand["category"], string> = {
  fashion: "#4c6fff",
  beauty: "#ff6f59",
  lifestyle: "#2a9d8f",
  mixed: "#8d7aff"
};

const STATUS_META: Record<SeedSaleEvent["status"], { label: string; color: string }> = {
  upcoming: { label: "Upcoming", color: "#22577a" },
  active: { label: "Active", color: "#2b9348" },
  ended: { label: "Ended", color: "#8d99ae" },
  unknown: { label: "Schedule TBD", color: "#6c757d" }
};

const APP_MONTH = new Date("2026-04-01T00:00:00+09:00");

const pad2 = (value: number): string => String(value).padStart(2, "0");

const getMonthKey = (date: Date): string => `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`;

const formatDateLabel = (isoDate: string): string => {
  const date = new Date(isoDate);
  return `${date.getFullYear()}.${pad2(date.getMonth() + 1)}.${pad2(date.getDate())}`;
};

const formatDateRange = (event: SeedSaleEvent): string => {
  if (!event.startAt && !event.endAt) {
    return "Schedule TBD";
  }
  if (event.startAt && event.endAt) {
    return `${formatDateLabel(event.startAt)} - ${formatDateLabel(event.endAt)}`;
  }
  if (event.startAt) {
    return `${formatDateLabel(event.startAt)} -`;
  }
  return `- ${formatDateLabel(event.endAt ?? "")}`;
};

const dayFromEvent = (event: SeedSaleEvent): number | null => {
  if (!event.startAt) {
    return null;
  }
  return new Date(event.startAt).getDate();
};

const sortEvents = (events: SeedSaleEvent[], mode: SortMode): SeedSaleEvent[] => {
  const copied = [...events];
  if (mode === "highDiscount") {
    copied.sort((left, right) => (right.discountPercent ?? -1) - (left.discountPercent ?? -1));
    return copied;
  }
  copied.sort((left, right) => {
    if (!left.endAt && !right.endAt) {
      return 0;
    }
    if (!left.endAt) {
      return 1;
    }
    if (!right.endAt) {
      return -1;
    }
    return left.endAt.localeCompare(right.endAt);
  });
  return copied;
};

export function MobileAppShell(): JSX.Element {
  const [screen, setScreen] = useState<AppScreen>("splash");
  const [userMode, setUserMode] = useState<UserMode | null>(null);
  const [selectedBrandIds, setSelectedBrandIds] = useState<string[]>([]);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>("highDiscount");
  const [isBrandsLoading, setIsBrandsLoading] = useState(false);
  const [isCalendarLoading, setIsCalendarLoading] = useState(false);
  const [isInboxLoading, setIsInboxLoading] = useState(false);
  const [inboxReadState, setInboxReadState] = useState<Record<string, boolean>>({});
  const [preferences, setPreferences] = useState<NotificationPreferenceState>(
    defaultNotificationPreferences
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      setScreen("auth");
    }, 900);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (screen !== "brandPicker") {
      return;
    }
    setIsBrandsLoading(true);
    const timer = setTimeout(() => {
      setIsBrandsLoading(false);
    }, 550);
    return () => clearTimeout(timer);
  }, [screen]);

  useEffect(() => {
    if (screen !== "calendar") {
      return;
    }
    setIsCalendarLoading(true);
    const timer = setTimeout(() => {
      setIsCalendarLoading(false);
      if (selectedDay === null) {
        setSelectedDay(5);
      }
    }, 650);
    return () => clearTimeout(timer);
  }, [screen, selectedDay]);

  useEffect(() => {
    if (screen !== "inbox") {
      return;
    }
    setIsInboxLoading(true);
    const timer = setTimeout(() => {
      setIsInboxLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [screen]);

  const monthKey = getMonthKey(APP_MONTH);
  const filteredEventsByBrands = useMemo(
    () => seedSaleEvents.filter((event) => selectedBrandIds.includes(event.brandId)),
    [selectedBrandIds]
  );

  const monthEvents = useMemo(
    () =>
      filteredEventsByBrands.filter((event) => {
        if (!event.startAt) {
          return false;
        }
        return getMonthKey(new Date(event.startAt)) === monthKey;
      }),
    [filteredEventsByBrands, monthKey]
  );

  const unknownPeriodEvents = useMemo(
    () => filteredEventsByBrands.filter((event) => !event.startAt && !event.endAt),
    [filteredEventsByBrands]
  );

  const dayEventCounts = useMemo(() => {
    const counts = new Map<number, number>();
    for (const event of monthEvents) {
      const day = dayFromEvent(event);
      if (!day) {
        continue;
      }
      counts.set(day, (counts.get(day) ?? 0) + 1);
    }
    return counts;
  }, [monthEvents]);

  const selectedDateEvents = useMemo(() => {
    if (!selectedDay) {
      return [];
    }
    const sameDayEvents = monthEvents.filter((event) => dayFromEvent(event) === selectedDay);
    return sortEvents(sameDayEvents, sortMode);
  }, [monthEvents, selectedDay, sortMode]);

  const inboxItems = useMemo(() => {
    const filtered = seedInbox.filter((item) => selectedBrandIds.includes(item.brandId));
    return filtered.map((item) => ({
      ...item,
      isRead: inboxReadState[item.id] ?? item.isRead
    }));
  }, [inboxReadState, selectedBrandIds]);

  const selectedEvent = useMemo(
    () => seedSaleEvents.find((event) => event.id === selectedEventId) ?? null,
    [selectedEventId]
  );

  const goToMainTabs = (target: "calendar" | "inbox" | "notificationPreferences"): void => {
    setScreen(target);
  };

  const onChooseMode = (mode: UserMode): void => {
    setUserMode(mode);
    setScreen("brandPicker");
  };

  const toggleBrand = (brandId: string): void => {
    setSelectedBrandIds((previous) =>
      previous.includes(brandId)
        ? previous.filter((value) => value !== brandId)
        : [...previous, brandId]
    );
  };

  const navigateToDetail = (eventId: string): void => {
    setSelectedEventId(eventId);
    setScreen("saleDetail");
  };

  const markInboxRead = (item: SeedInboxItem): void => {
    setInboxReadState((previous) => ({
      ...previous,
      [item.id]: true
    }));
    navigateToDetail(item.saleEventId);
  };

  const renderMainTabBar = (active: "calendar" | "inbox" | "notificationPreferences"): JSX.Element => (
    <View style={styles.tabBar}>
      <Pressable
        style={[styles.tabButton, active === "calendar" && styles.tabButtonActive]}
        onPress={() => goToMainTabs("calendar")}
      >
        <Text style={styles.tabButtonText}>Calendar</Text>
      </Pressable>
      <Pressable
        style={[styles.tabButton, active === "inbox" && styles.tabButtonActive]}
        onPress={() => goToMainTabs("inbox")}
      >
        <Text style={styles.tabButtonText}>Inbox</Text>
      </Pressable>
      <Pressable
        style={[styles.tabButton, active === "notificationPreferences" && styles.tabButtonActive]}
        onPress={() => goToMainTabs("notificationPreferences")}
      >
        <Text style={styles.tabButtonText}>Prefs</Text>
      </Pressable>
      <Pressable style={styles.tabButton} onPress={() => setScreen("brandPicker")}>
        <Text style={styles.tabButtonText}>Brands</Text>
      </Pressable>
    </View>
  );

  const renderSplash = (): JSX.Element => (
    <View style={styles.splashRoot}>
      <Text style={styles.splashTitle}>SaleCalendar</Text>
      <Text style={styles.splashSubtitle}>Brand sale timeline in one place</Text>
      <ActivityIndicator color="#283044" size="large" />
    </View>
  );

  const renderAuth = (): JSX.Element => (
    <View style={styles.screenRoot}>
      <Text style={styles.headerTitle}>Welcome</Text>
      <Text style={styles.headerSubtitle}>
        STEP 3 shell uses mock auth only. Real auth will be connected in STEP 4.
      </Text>
      <Pressable style={styles.primaryButton} onPress={() => onChooseMode("guest")}>
        <Text style={styles.primaryButtonText}>Continue as Guest</Text>
      </Pressable>
      <Pressable style={styles.secondaryButton} onPress={() => onChooseMode("member")}>
        <Text style={styles.secondaryButtonText}>Mock Sign In</Text>
      </Pressable>
    </View>
  );

  const renderBrandPicker = (): JSX.Element => (
    <View style={styles.screenRoot}>
      <Text style={styles.headerTitle}>Brand Picker</Text>
      <Text style={styles.headerSubtitle}>Select one or more brands to build your calendar.</Text>
      {isBrandsLoading ? (
        <View style={styles.loadingCard}>
          <ActivityIndicator color="#283044" />
          <Text style={styles.loadingLabel}>Loading brands from seed data...</Text>
        </View>
      ) : (
        <View style={styles.chipWrap}>
          {seedBrands.map((brand) => {
            const active = selectedBrandIds.includes(brand.id);
            return (
              <Pressable
                key={brand.id}
                style={[
                  styles.brandChip,
                  { borderColor: CATEGORY_COLORS[brand.category] },
                  active && { backgroundColor: CATEGORY_COLORS[brand.category] }
                ]}
                onPress={() => toggleBrand(brand.id)}
              >
                <Text style={[styles.brandChipText, active && styles.brandChipTextActive]}>
                  {brand.name}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
      <View style={styles.inlineActions}>
        <Pressable
          style={styles.secondarySmallButton}
          onPress={() => setSelectedBrandIds(seedBrands.map((brand) => brand.id))}
        >
          <Text style={styles.secondarySmallButtonText}>Select All</Text>
        </Pressable>
        <Pressable style={styles.secondarySmallButton} onPress={() => setSelectedBrandIds([])}>
          <Text style={styles.secondarySmallButtonText}>Clear</Text>
        </Pressable>
      </View>
      <Pressable
        style={[
          styles.primaryButton,
          selectedBrandIds.length === 0 && styles.disabledButton
        ]}
        onPress={() => {
          if (selectedBrandIds.length > 0) {
            setScreen("calendar");
          }
        }}
      >
        <Text style={styles.primaryButtonText}>Continue to Calendar</Text>
      </Pressable>
      <Text style={styles.caption}>Mode: {userMode === "guest" ? "Guest" : "Mock member"}</Text>
    </View>
  );

  const renderCalendar = (): JSX.Element => {
    const daysInMonth = new Date(APP_MONTH.getFullYear(), APP_MONTH.getMonth() + 1, 0).getDate();
    const firstWeekday = new Date(APP_MONTH.getFullYear(), APP_MONTH.getMonth(), 1).getDay();

    const dayCells: Array<number | null> = [];
    for (let index = 0; index < firstWeekday; index += 1) {
      dayCells.push(null);
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      dayCells.push(day);
    }

    return (
      <View style={styles.screenRoot}>
        <Text style={styles.headerTitle}>April 2026 Calendar</Text>
        <Text style={styles.headerSubtitle}>Tap a date to open the daily sale list.</Text>
        {renderMainTabBar("calendar")}
        {isCalendarLoading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator color="#283044" />
            <Text style={styles.loadingLabel}>Loading monthly events...</Text>
          </View>
        ) : (
          <View style={styles.calendarContainer}>
            <View style={styles.weekHeader}>
              {WEEK_LABELS.map((label) => (
                <Text key={label} style={styles.weekHeaderLabel}>
                  {label}
                </Text>
              ))}
            </View>
            <View style={styles.dayGrid}>
              {dayCells.map((day, index) => {
                if (!day) {
                  return <View key={`empty-${index}`} style={styles.dayCell} />;
                }
                const isSelected = selectedDay === day;
                const count = dayEventCounts.get(day) ?? 0;
                return (
                  <Pressable
                    key={`day-${day}`}
                    style={[styles.dayCell, isSelected && styles.dayCellSelected]}
                    onPress={() => setSelectedDay(day)}
                  >
                    <Text style={styles.dayLabel}>{day}</Text>
                    {count > 0 && (
                      <View style={styles.countBadge}>
                        <Text style={styles.countBadgeText}>{count}</Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}
        <View style={styles.inlineActions}>
          <Pressable
            style={[
              styles.secondarySmallButton,
              sortMode === "highDiscount" && styles.secondarySmallButtonActive
            ]}
            onPress={() => setSortMode("highDiscount")}
          >
            <Text style={styles.secondarySmallButtonText}>Sort: Discount</Text>
          </Pressable>
          <Pressable
            style={[
              styles.secondarySmallButton,
              sortMode === "endingSoon" && styles.secondarySmallButtonActive
            ]}
            onPress={() => setSortMode("endingSoon")}
          >
            <Text style={styles.secondarySmallButtonText}>Sort: Ending Soon</Text>
          </Pressable>
        </View>
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>
            {selectedDay ? `Events for April ${selectedDay}` : "Select a date"}
          </Text>
          {selectedDay && selectedDateEvents.length === 0 ? (
            <Text style={styles.emptyLabel}>No events for this date.</Text>
          ) : null}
          {selectedDateEvents.map((event) => {
            const brand = seedBrands.find((item) => item.id === event.brandId);
            const status = STATUS_META[event.status];
            return (
              <Pressable key={event.id} style={styles.eventCard} onPress={() => navigateToDetail(event.id)}>
                <View style={styles.eventCardHeader}>
                  <Text style={styles.eventBrand}>{brand?.name ?? "Unknown"}</Text>
                  <Text style={[styles.statusPill, { backgroundColor: status.color }]}>{status.label}</Text>
                </View>
                <Text style={styles.eventTitle}>{event.title}</Text>
                <Text style={styles.eventSummary}>{event.summary}</Text>
                <Text style={styles.eventMeta}>{formatDateRange(event)}</Text>
              </Pressable>
            );
          })}
          {unknownPeriodEvents.length > 0 ? (
            <View style={styles.unknownSection}>
              <Text style={styles.unknownTitle}>Schedule TBD</Text>
              {unknownPeriodEvents.map((event) => (
                <Pressable key={event.id} onPress={() => navigateToDetail(event.id)}>
                  <Text style={styles.unknownItem}>- {event.title}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>
      </View>
    );
  };

  const renderSaleDetail = (): JSX.Element => {
    if (!selectedEvent) {
      return (
        <View style={styles.screenRoot}>
          <Text style={styles.headerTitle}>Sale Detail</Text>
          <Text style={styles.emptyLabel}>No selected event.</Text>
          <Pressable style={styles.primaryButton} onPress={() => setScreen("calendar")}>
            <Text style={styles.primaryButtonText}>Back to Calendar</Text>
          </Pressable>
        </View>
      );
    }

    const brand = seedBrands.find((item) => item.id === selectedEvent.brandId);
    const status = STATUS_META[selectedEvent.status];

    return (
      <ScrollView contentContainerStyle={styles.screenRoot}>
        <Text style={styles.headerTitle}>Sale Detail</Text>
        <Text style={styles.headerSubtitle}>
          {brand?.name ?? "Unknown"} · {brand?.category ?? "mixed"}
        </Text>
        <View style={styles.detailBlock}>
          <Text style={styles.detailTitle}>{selectedEvent.title}</Text>
          <Text style={styles.eventSummary}>{selectedEvent.summary}</Text>
          <Text style={[styles.statusPill, { alignSelf: "flex-start", backgroundColor: status.color }]}>
            {status.label}
          </Text>
          <Text style={styles.detailMeta}>Period: {formatDateRange(selectedEvent)}</Text>
          <Text style={styles.detailMeta}>
            Discount: {selectedEvent.discountLabel ?? "No discount data"}
          </Text>
        </View>
        <Pressable style={styles.primaryButton} onPress={() => setScreen("calendar")}>
          <Text style={styles.primaryButtonText}>Back to Calendar</Text>
        </Pressable>
      </ScrollView>
    );
  };

  const renderInbox = (): JSX.Element => (
    <View style={styles.screenRoot}>
      <Text style={styles.headerTitle}>Inbox</Text>
      <Text style={styles.headerSubtitle}>In-app mock notifications (push not connected yet).</Text>
      {renderMainTabBar("inbox")}
      {isInboxLoading ? (
        <View style={styles.loadingCard}>
          <ActivityIndicator color="#283044" />
          <Text style={styles.loadingLabel}>Loading inbox...</Text>
        </View>
      ) : inboxItems.length === 0 ? (
        <Text style={styles.emptyLabel}>No notifications for selected brands.</Text>
      ) : (
        <FlatList
          data={inboxItems}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Pressable style={styles.inboxCard} onPress={() => markInboxRead(item)}>
              <View style={styles.inboxHeader}>
                <Text style={styles.inboxTitle}>{item.title}</Text>
                <Text style={styles.inboxTimestamp}>{formatDateLabel(item.createdAt)}</Text>
              </View>
              <Text style={styles.inboxBody}>{item.body}</Text>
              {!item.isRead ? <Text style={styles.unreadPill}>Unread</Text> : null}
            </Pressable>
          )}
        />
      )}
    </View>
  );

  const renderNotificationPreferences = (): JSX.Element => (
    <View style={styles.screenRoot}>
      <Text style={styles.headerTitle}>Notification Preferences</Text>
      <Text style={styles.headerSubtitle}>
        Local-only preference shell. Real push token and delivery will be added later.
      </Text>
      {renderMainTabBar("notificationPreferences")}
      <View style={styles.preferenceCard}>
        {(
          [
            ["notifyOnNewSale", "Notify on New Sale"],
            ["notifyOnSaleStart", "Notify on Sale Start"],
            ["notifyOnEndingSoon", "Notify Before Ending"]
          ] as const
        ).map(([key, label]) => (
          <Pressable
            key={key}
            style={styles.preferenceRow}
            onPress={() =>
              setPreferences((previous) => ({
                ...previous,
                [key]: !previous[key]
              }))
            }
          >
            <Text style={styles.preferenceLabel}>{label}</Text>
            <View style={[styles.toggle, preferences[key] && styles.toggleOn]}>
              <View style={[styles.toggleKnob, preferences[key] && styles.toggleKnobOn]} />
            </View>
          </Pressable>
        ))}
      </View>
      <Text style={styles.caption}>Selected brands: {selectedBrandIds.length}</Text>
    </View>
  );

  switch (screen) {
    case "splash":
      return renderSplash();
    case "auth":
      return renderAuth();
    case "brandPicker":
      return renderBrandPicker();
    case "calendar":
      return renderCalendar();
    case "saleDetail":
      return renderSaleDetail();
    case "inbox":
      return renderInbox();
    case "notificationPreferences":
      return renderNotificationPreferences();
    default:
      return renderSplash();
  }
}

const styles = StyleSheet.create({
  splashRoot: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#efe7da"
  },
  splashTitle: {
    fontSize: 42,
    fontWeight: "800",
    color: "#22333b",
    letterSpacing: 0.8
  },
  splashSubtitle: {
    fontSize: 14,
    color: "#5c6770",
    marginBottom: 10
  },
  screenRoot: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 18,
    gap: 10
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#1f2937"
  },
  headerSubtitle: {
    fontSize: 13,
    color: "#4b5563",
    marginBottom: 6
  },
  primaryButton: {
    backgroundColor: "#283044",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center"
  },
  disabledButton: {
    opacity: 0.45
  },
  primaryButtonText: {
    color: "#f8fafc",
    fontWeight: "700"
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: "#283044",
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: "center"
  },
  secondaryButtonText: {
    color: "#283044",
    fontWeight: "700"
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  brandChip: {
    borderWidth: 1.3,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8
  },
  brandChipText: {
    color: "#1f2937",
    fontWeight: "600"
  },
  brandChipTextActive: {
    color: "#ffffff"
  },
  inlineActions: {
    flexDirection: "row",
    gap: 8
  },
  secondarySmallButton: {
    borderWidth: 1,
    borderColor: "#9ca3af",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  secondarySmallButtonActive: {
    borderColor: "#283044",
    backgroundColor: "#dbeafe"
  },
  secondarySmallButtonText: {
    fontSize: 12,
    color: "#1f2937"
  },
  caption: {
    fontSize: 12,
    color: "#6b7280"
  },
  tabBar: {
    flexDirection: "row",
    gap: 6
  },
  tabButton: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7
  },
  tabButtonActive: {
    borderColor: "#283044",
    backgroundColor: "#e2e8f0"
  },
  tabButtonText: {
    color: "#111827",
    fontSize: 12,
    fontWeight: "600"
  },
  loadingCard: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    gap: 8
  },
  loadingLabel: {
    color: "#475569",
    fontSize: 12
  },
  calendarContainer: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 12,
    padding: 10
  },
  weekHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6
  },
  weekHeaderLabel: {
    width: "14%",
    textAlign: "center",
    fontSize: 11,
    color: "#6b7280",
    fontWeight: "700"
  },
  dayGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4
  },
  dayCell: {
    width: "13.7%",
    aspectRatio: 1,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ffffff"
  },
  dayCellSelected: {
    borderColor: "#283044",
    backgroundColor: "#dbeafe"
  },
  dayLabel: {
    color: "#0f172a",
    fontWeight: "700"
  },
  countBadge: {
    marginTop: 2,
    minWidth: 17,
    paddingHorizontal: 5,
    borderRadius: 99,
    backgroundColor: "#ef476f",
    alignItems: "center"
  },
  countBadgeText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "700"
  },
  sheet: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 12,
    padding: 12,
    gap: 7,
    flex: 1
  },
  sheetTitle: {
    fontWeight: "800",
    color: "#1f2937"
  },
  emptyLabel: {
    color: "#6b7280",
    fontSize: 13
  },
  eventCard: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    padding: 10,
    gap: 4,
    backgroundColor: "#ffffff"
  },
  eventCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  eventBrand: {
    color: "#334155",
    fontSize: 12,
    fontWeight: "700"
  },
  statusPill: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    overflow: "hidden"
  },
  eventTitle: {
    color: "#0f172a",
    fontSize: 15,
    fontWeight: "800"
  },
  eventSummary: {
    color: "#334155",
    fontSize: 12
  },
  eventMeta: {
    color: "#64748b",
    fontSize: 11
  },
  unknownSection: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 8
  },
  unknownTitle: {
    fontSize: 12,
    color: "#475569",
    fontWeight: "700",
    marginBottom: 4
  },
  unknownItem: {
    color: "#1f2937",
    fontSize: 12,
    marginBottom: 4
  },
  detailBlock: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 12,
    padding: 14,
    gap: 8
  },
  detailTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0f172a"
  },
  detailMeta: {
    color: "#475569",
    fontSize: 13
  },
  inboxCard: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    padding: 11,
    gap: 5,
    marginBottom: 8,
    backgroundColor: "#ffffff"
  },
  inboxHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  inboxTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1f2937"
  },
  inboxTimestamp: {
    fontSize: 11,
    color: "#64748b"
  },
  inboxBody: {
    color: "#334155",
    fontSize: 12
  },
  unreadPill: {
    alignSelf: "flex-start",
    borderRadius: 999,
    backgroundColor: "#ffb703",
    color: "#111827",
    fontSize: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    fontWeight: "700"
  },
  preferenceCard: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 12,
    padding: 12,
    gap: 8
  },
  preferenceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  preferenceLabel: {
    color: "#111827",
    fontWeight: "600"
  },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: 20,
    backgroundColor: "#cbd5e1",
    justifyContent: "center",
    paddingHorizontal: 3
  },
  toggleOn: {
    backgroundColor: "#22c55e"
  },
  toggleKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#ffffff"
  },
  toggleKnobOn: {
    alignSelf: "flex-end"
  }
});
