import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Modal,
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppPalette } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import type { City, Category } from "@/api";

export type NewsDateFilter =
  | { mode: "all" }
  | { mode: "today" }
  | { mode: "date"; date: string };
export type NewsFilters = {
  cityId: string | null;
  stateId: string | null;
  categoryId: string | null;
  dateFilter: NewsDateFilter;
};
// Gujarat news dates are interpreted in Indian Standard Time, including on overseas devices.
const dayKey = (value: Date) =>
  Number.isNaN(value.getTime())
    ? ""
    : new Date(value.getTime() + 330 * 60000).toISOString().slice(0, 10);
export const matchesNewsDate = (
  publishedDate: string | undefined | null,
  filter: NewsDateFilter,
) => {
  if (filter.mode === "all") return true;
  if (!publishedDate) return false;
  const key = /^\d{4}-\d{2}-\d{2}$/.test(publishedDate)
    ? publishedDate
    : dayKey(new Date(publishedDate));
  return key === (filter.mode === "today" ? dayKey(new Date()) : filter.date);
};

const normalize = (name: string) => name.trim().toLowerCase();
const today = () => dayKey(new Date());
const dateParts = (key: string) => key.split("-").map(Number);

interface Props extends NewsFilters {
  visible: boolean;
  cities: City[];
  categories: Category[];
  preferredCityIds: string[];
  onClose: () => void;
  onApply: (filters: NewsFilters) => void;
}

function CategoryChip({
  category,
  selected,
  active,
  colors,
  onPress,
}: {
  category: Category;
  selected: boolean;
  active: boolean;
  colors: { surface: string; text: string; border: string };
  onPress: () => void;
}) {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    pulse.setValue(1);
    if (!active || !category.isHighlighted || selected) return;
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.45,
          duration: 650,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 650,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [active, category.isHighlighted, selected, pulse]);
  const colored = selected || category.isHighlighted;
  const bg = colored
    ? category.backgroundColor || AppPalette.brightOrange
    : colors.surface;
  const fg = colored ? category.textColor || "#FFFFFF" : colors.text;
  return (
    <Animated.View style={{ opacity: pulse, maxWidth: "100%" }}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected }}
        onPress={onPress}
        style={[
          styles.chip,
          { backgroundColor: bg, borderColor: colored ? bg : colors.border },
          category.isHighlighted && !selected && { borderWidth: 2 },
        ]}
      >
        {selected && <Ionicons name="checkmark" size={16} color={fg} />}
        <Text style={[styles.chipText, { color: fg }]}>{category.name}</Text>
      </Pressable>
    </Animated.View>
  );
}

export default function NewsFilterSheet({
  visible,
  cities,
  categories,
  preferredCityIds,
  cityId,
  stateId,
  categoryId,
  dateFilter,
  onClose,
  onApply,
}: Props) {
  const dark = useColorScheme() === "dark";
  const insets = useSafeAreaInsets();
  const colors = {
    bg: dark ? "#111827" : "#FFFFFF",
    surface: dark ? "#1E293B" : "#FFF5F5",
    text: dark ? "#F8FAFC" : "#111827",
    muted: dark ? "#94A3B8" : "#64748B",
    border: dark ? "#334155" : "#FECACA",
  };
  const [draft, setDraft] = useState<NewsFilters>({
    cityId,
    stateId,
    categoryId,
    dateFilter,
  });
  const [section, setSection] = useState<"city" | "category" | "date">("city");
  const [query, setQuery] = useState("");
  const [stateName, setStateName] = useState<string | null>(null);
  // State names come from the same populated City.state used by CityPreferenceModal.
  const stateLabel = (city: City) => city.state?.name?.trim() || "Other cities";
  const states = useMemo(
    () =>
      Array.from(
        new Map(
          cities
            .filter((c) => c.state?._id)
            .map((c) => [c.state!._id, c.state!]),
        ).values(),
      ).sort((a, b) => a.name.localeCompare(b.name)),
    [cities],
  );
  const visibleCities = useMemo(
    () =>
      cities
        .filter(
          (city) =>
            (!stateName || city.state?._id === stateName) &&
            (!query.trim() ||
              normalize(city.name).includes(normalize(query)) ||
              normalize(stateLabel(city)).includes(normalize(query))),
        )
        .sort((a, b) => a.name.localeCompare(b.name)),
    [cities, stateName, query],
  );
  useEffect(() => {
    if (stateName && !states.some((s) => s._id === stateName))
      setStateName(null);
  }, [stateName, states]);
  const [month, setMonth] = useState(() => {
    const [y, m] = dateParts(today());
    return new Date(y, m - 1, 1);
  });
  useEffect(() => {
    if (!visible) return;
    setDraft({ cityId, stateId, categoryId, dateFilter });
    setQuery("");
    setSection("city");
    setStateName(
      stateId || cities.find((c) => c._id === cityId)?.state?._id || null,
    );
    const [y, m] = dateParts(
      dateFilter.mode === "date" ? dateFilter.date : today(),
    );
    setMonth(new Date(y, m - 1, 1));
  }, [visible, cityId, stateId, categoryId, dateFilter]);
  const chooseCity = (id: string | null) =>
    setDraft((p) => ({ ...p, cityId: id, stateId: null }));
  const chooseDate = (value: NewsDateFilter) =>
    setDraft((p) => ({ ...p, dateFilter: value }));
  const chip = (
    label: string,
    selected: boolean,
    action: () => void,
    key: string = label,
  ) => (
    <Pressable
      key={key}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={action}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? AppPalette.brightOrange : colors.surface,
          borderColor: selected ? AppPalette.brightOrange : colors.border,
        },
      ]}
    >
      {selected && <Ionicons name="checkmark" size={14} color="#FFF" />}
      <Text
        style={[styles.chipText, { color: selected ? "#FFF" : colors.text }]}
      >
        {label}
      </Text>
    </Pressable>
  );
  const selectedCity = draft.stateId
    ? `All cities in ${states.find((s) => s._id === draft.stateId)?.name || "state"}`
    : draft.cityId === null
      ? preferredCityIds.length
        ? "Preferred cities"
        : "All cities"
      : draft.cityId === ""
        ? "All cities"
        : cities.find((c) => c._id === draft.cityId)?.name || "City";
  const selectedCategory =
    categories.find((c) => c._id === draft.categoryId)?.name ||
    "All categories";
  const dateLabel =
    draft.dateFilter.mode === "date"
      ? draft.dateFilter.date
      : draft.dateFilter.mode === "today"
        ? "Today"
        : "All dates";
  const first = month.getDay();
  const count = new Date(
    month.getFullYear(),
    month.getMonth() + 1,
    0,
  ).getDate();
  const monthKey = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`;
  const thisMonth = today().slice(0, 7);
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel="Close filters"
        />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.bg,
              paddingBottom: Math.max(insets.bottom, 12),
            },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: colors.text }]}>
                Explore your news
              </Text>
              <Text style={{ color: colors.muted, fontSize: 12 }}>
                Choose what you want to read
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={10}
              accessibilityLabel="Close filters"
            >
              <Ionicons name="close" size={25} color={colors.text} />
            </Pressable>
          </View>
          <View style={[styles.tabs, { borderColor: colors.border }]}>
            {(["city", "category", "date"] as const).map((key, i) => (
              <Pressable
                key={key}
                onPress={() => setSection(key)}
                accessibilityRole="tab"
                accessibilityState={{ selected: section === key }}
                style={[
                  styles.tab,
                  section === key && { backgroundColor: colors.surface },
                ]}
              >
                <Ionicons
                  name={
                    i === 0
                      ? "location-outline"
                      : i === 1
                        ? "grid-outline"
                        : "calendar-outline"
                  }
                  size={17}
                  color={
                    section === key ? AppPalette.brightOrange : colors.muted
                  }
                />
                <Text
                  style={{
                    fontWeight: "800",
                    color:
                      section === key ? AppPalette.brightOrange : colors.muted,
                    fontSize: 13,
                  }}
                >
                  {i === 0 ? "City" : i === 1 ? "Category" : "Date"}
                </Text>
              </Pressable>
            ))}
          </View>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {section === "city" && (
              <>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Select location
                </Text>
                <Text style={{ color: colors.muted, fontSize: 12 }}>
                  Choose a state to browse its available cities.
                </Text>
                <View style={styles.chips}>
                  {chip(
                    "All states",
                    stateName === null,
                    () => {
                      setStateName(null);
                      setQuery("");
                      chooseCity("");
                    },
                    "all-states",
                  )}
                  {states.map((state) =>
                    chip(
                      state.name,
                      stateName === state._id,
                      () => {
                        setStateName(state._id);
                        setQuery("");
                        setDraft((p) => ({
                          ...p,
                          cityId: "",
                          stateId: state._id,
                        }));
                      },
                      `state-${state._id}`,
                    ),
                  )}
                </View>
                <Text style={{ color: colors.muted, fontSize: 12 }}>
                  Selected: {selectedCity}
                </Text>
                <View style={styles.chips}>
                  {chip(
                    "All cities",
                    !draft.stateId &&
                      (draft.cityId === "" ||
                        (draft.cityId === null && !preferredCityIds.length)),
                    () => chooseCity(""),
                  )}
                  {preferredCityIds.length > 0 &&
                    chip(
                      "My preferred cities",
                      !draft.stateId && draft.cityId === null,
                      () => chooseCity(null),
                    )}
                </View>
                {stateName &&
                  chip(
                    "All cities in " +
                      (states.find((s) => s._id === stateName)?.name ||
                        "state"),
                    draft.stateId === stateName,
                    () =>
                      setDraft((p) => ({
                        ...p,
                        cityId: "",
                        stateId: stateName,
                      })),
                  )}
                {/* <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Search cities"
                  placeholderTextColor={colors.muted}
                  style={[
                    styles.search,
                    {
                      color: colors.text,
                      borderColor: colors.border,
                      backgroundColor: colors.surface,
                    },
                  ]}
                /> */}
                <View style={styles.chips}>
                  {visibleCities.map((c) =>
                    chip(
                      c.name,
                      draft.cityId === c._id,
                      () => chooseCity(c._id),
                      c._id,
                    ),
                  )}
                </View>
                {!visibleCities.length && (
                  <Text style={{ color: colors.muted }}>
                    {cities.length
                      ? "No matching cities."
                      : "No cities available."}
                  </Text>
                )}
              </>
            )}
            {section === "category" && (
              <>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  News categories
                </Text>
                <View style={styles.chips}>
                  {chip("All categories", draft.categoryId === null, () =>
                    setDraft((p) => ({ ...p, categoryId: null })),
                  )}
                  {categories
                    .filter((c) => c.isVisible !== false)
                    .map((c) => (
                      <CategoryChip
                        key={c._id}
                        category={c}
                        selected={draft.categoryId === c._id}
                        active={visible && section === "category"}
                        colors={colors}
                        onPress={() =>
                          setDraft((p) => ({ ...p, categoryId: c._id }))
                        }
                      />
                    ))}
                </View>
              </>
            )}
            {section === "date" && (
              <>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Published date
                </Text>
                <View style={styles.chips}>
                  {chip("All dates", draft.dateFilter.mode === "all", () =>
                    chooseDate({ mode: "all" }),
                  )}
                  {chip("Today", draft.dateFilter.mode === "today", () =>
                    chooseDate({ mode: "today" }),
                  )}
                </View>
                <View style={styles.monthRow}>
                  <Pressable
                    onPress={() =>
                      setMonth(
                        new Date(month.getFullYear(), month.getMonth() - 1, 1),
                      )
                    }
                    accessibilityLabel="Previous month"
                  >
                    <Ionicons
                      name="chevron-back"
                      size={22}
                      color={colors.text}
                    />
                  </Pressable>
                  <Text style={{ fontWeight: "800", color: colors.text }}>
                    {month.toLocaleDateString("en-IN", {
                      month: "long",
                      year: "numeric",
                    })}
                  </Text>
                  <Pressable
                    disabled={monthKey >= thisMonth}
                    onPress={() =>
                      setMonth(
                        new Date(month.getFullYear(), month.getMonth() + 1, 1),
                      )
                    }
                    accessibilityLabel="Next month"
                  >
                    <Ionicons
                      name="chevron-forward"
                      size={22}
                      color={
                        monthKey >= thisMonth ? colors.border : colors.text
                      }
                    />
                  </Pressable>
                </View>
                <View style={styles.calendar}>
                  {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                    <Text
                      key={`w${i}`}
                      style={[
                        styles.day,
                        {
                          color: colors.muted,
                          fontWeight: "700",
                          textAlign: "center",
                        },
                      ]}
                    >
                      {d}
                    </Text>
                  ))}
                  {Array.from({ length: first }, (_, i) => (
                    <View key={`blank${i}`} style={styles.day} />
                  ))}
                  {Array.from({ length: count }, (_, i) => {
                    const key = `${monthKey}-${String(i + 1).padStart(2, "0")}`;
                    const selected =
                      (draft.dateFilter.mode === "date" &&
                        draft.dateFilter.date === key) ||
                      (draft.dateFilter.mode === "today" && key === today());
                    return (
                      <Pressable
                        key={key}
                        disabled={key > today()}
                        onPress={() => chooseDate({ mode: "date", date: key })}
                        accessibilityLabel={key}
                        accessibilityState={{
                          selected,
                          disabled: key > today(),
                        }}
                        style={[
                          styles.day,
                          styles.dayButton,
                          selected && {
                            backgroundColor: AppPalette.brightOrange,
                          },
                        ]}
                      >
                        <Text
                          style={{
                            color: selected
                              ? "#FFF"
                              : key > today()
                                ? colors.border
                                : colors.text,
                            fontWeight: "700",
                          }}
                        >
                          {i + 1}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Text style={{ color: colors.muted, fontSize: 11 }}>
                  Dates use Indian Standard Time (IST).
                </Text>
              </>
            )}
          </ScrollView>
          <View style={[styles.footer, { borderColor: colors.border }]}>
            <Text
              numberOfLines={2}
              style={{
                color: colors.muted,
                fontSize: 12,
                lineHeight: 18,
                paddingHorizontal: 2,
              }}
            >
              {selectedCity} · {selectedCategory} · {dateLabel}
            </Text>
            <View style={styles.buttons}>
              <Pressable
                onPress={() => {
                  onApply({
                    cityId: "",
                    stateId: null,
                    categoryId: null,
                    dateFilter: { mode: "all" },
                  });
                }}
                style={[styles.reset, { borderColor: colors.border }]}
              >
                <Text style={{ color: colors.text, fontWeight: "800" }}>
                  Reset
                </Text>
              </Pressable>
              <Pressable onPress={() => onApply(draft)} style={styles.apply}>
                <Text style={{ color: "#FFF", fontWeight: "900" }}>
                  Apply filters
                </Text>
                <Ionicons name="arrow-forward" color="#FFF" size={18} />
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(2,6,23,0.55)",
  },
  sheet: {
    height: "60%",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 4,
    alignSelf: "center",
    marginBottom: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 12,
  },
  title: { fontSize: 21, fontWeight: "900" },
  tabs: { flexDirection: "row", borderWidth: 1, borderRadius: 16, padding: 5 },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 11,
  },
  content: { paddingTop: 16, paddingBottom: 20, gap: 12 },
  sectionTitle: { fontSize: 16, fontWeight: "900" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  chip: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 15,
    paddingVertical: 10,
    minHeight: 42,
    maxWidth: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  chipText: { fontSize: 13, fontWeight: "700", lineHeight: 19, flexShrink: 1 },
  map: {
    width: "100%",
    aspectRatio: 1.65,
    borderRadius: 16,
    overflow: "hidden",
  },
  marker: {
    position: "absolute",
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    transform: [{ translateX: -12 }, { translateY: -12 }],
    elevation: 2,
  },
  markerLabel: {
    position: "absolute",
    fontSize: 9,
    fontWeight: "800",
    paddingHorizontal: 3,
    borderRadius: 3,
    minWidth: 38,
    textAlign: "center",
  },
  search: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 10,
    minHeight: 46,
  },
  monthRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  calendar: { flexDirection: "row", flexWrap: "wrap" },
  day: { width: "14.2857%", height: 34 },
  dayButton: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
  },
  footer: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12, gap: 10 },
  buttons: { flexDirection: "row", gap: 10 },
  reset: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  apply: {
    flex: 2.2,
    backgroundColor: AppPalette.brightOrange,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    gap: 8,
  },
});
