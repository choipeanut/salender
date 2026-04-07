import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { seedBrands, seedSaleEvents } from "./seedData";
import type { SeedBrand, SeedSaleEvent, SeedSaleStatus } from "./types";

type BrandFilter = "all" | SeedBrand["id"];

const BRAND_CHIP_COLOR: Record<SeedBrand["category"], string> = {
  beauty: "#ff6b6b",
  fashion: "#3b82f6"
};

const STATUS_META: Record<SeedSaleStatus, { label: string; background: string; text: string }> = {
  active: { label: "진행중", background: "#dcfce7", text: "#166534" },
  upcoming: { label: "예정", background: "#dbeafe", text: "#1d4ed8" },
  ended: { label: "종료", background: "#f3f4f6", text: "#374151" }
};

const formatDateTime = (iso: string): string => {
  const value = new Date(iso);
  if (Number.isNaN(value.getTime())) {
    return iso;
  }
  return value.toLocaleString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
};

const formatPeriod = (event: SeedSaleEvent): string =>
  `${formatDateTime(event.startAt)} - ${formatDateTime(event.endAt)}`;

export function MobileAppShell(): JSX.Element {
  const [brandFilter, setBrandFilter] = useState<BrandFilter>("all");

  const visibleEvents = useMemo(() => {
    const filtered =
      brandFilter === "all"
        ? seedSaleEvents
        : seedSaleEvents.filter((event) => event.brandId === brandFilter);
    return [...filtered].sort((a, b) => a.startAt.localeCompare(b.startAt));
  }, [brandFilter]);

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.title}>세일캘린더</Text>
      <Text style={styles.subtitle}>이번엔 딱 3개만 쉽게 볼 수 있게 정리했어요.</Text>

      <View style={styles.filterRow}>
        <Pressable
          style={[styles.filterChip, brandFilter === "all" && styles.filterChipActive]}
          onPress={() => setBrandFilter("all")}
        >
          <Text style={[styles.filterChipText, brandFilter === "all" && styles.filterChipTextActive]}>
            전체
          </Text>
        </Pressable>
        {seedBrands.map((brand) => {
          const isActive = brandFilter === brand.id;
          return (
            <Pressable
              key={brand.id}
              style={[
                styles.filterChip,
                { borderColor: BRAND_CHIP_COLOR[brand.category] },
                isActive && { backgroundColor: BRAND_CHIP_COLOR[brand.category] }
              ]}
              onPress={() => setBrandFilter(brand.id)}
            >
              <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                {brand.name}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.listSection}>
        {visibleEvents.map((event) => {
          const brand = seedBrands.find((item) => item.id === event.brandId);
          const statusMeta = STATUS_META[event.status];
          return (
            <View key={event.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.brandName}>{brand?.name ?? "브랜드"}</Text>
                <View style={[styles.statusBadge, { backgroundColor: statusMeta.background }]}>
                  <Text style={[styles.statusBadgeText, { color: statusMeta.text }]}>
                    {statusMeta.label}
                  </Text>
                </View>
              </View>
              <Text style={styles.eventTitle}>{event.title}</Text>
              <Text style={styles.eventSubtitle}>{event.subtitle}</Text>
              <Text style={styles.metaLabel}>기간: {formatPeriod(event)}</Text>
              <Text style={styles.metaLabel}>혜택: {event.discountLabel}</Text>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#f8fafc"
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 28
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0f172a"
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    color: "#475569"
  },
  filterRow: {
    marginTop: 16,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  filterChip: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#ffffff"
  },
  filterChipActive: {
    backgroundColor: "#1f2937",
    borderColor: "#1f2937"
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1f2937"
  },
  filterChipTextActive: {
    color: "#ffffff"
  },
  listSection: {
    marginTop: 14,
    gap: 10
  },
  card: {
    borderRadius: 14,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 14,
    gap: 6
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  brandName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#334155"
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "800"
  },
  eventTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827"
  },
  eventSubtitle: {
    fontSize: 13,
    color: "#334155"
  },
  metaLabel: {
    marginTop: 2,
    fontSize: 12,
    color: "#64748b"
  }
});
