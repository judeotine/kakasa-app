import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import type { Period } from "@/lib/loans";
import { useLanguage } from "@/lib/i18n";

const PERIOD_KEYS: { key: Period; tKey: string }[] = [
  { key: "day", tKey: "period_day" },
  { key: "week", tKey: "period_week" },
  { key: "month", tKey: "period_month" },
  { key: "year", tKey: "period_year" },
];

export function PeriodToggle(props: { value: Period; onChange: (p: Period) => void }) {
  const { t } = useLanguage();

  return (
    <View style={styles.track}>
      {PERIOD_KEYS.map((period) => {
        const active = props.value === period.key;
        return (
          <TouchableOpacity
            key={period.key}
            style={[styles.pill, active && styles.pillActive]}
            activeOpacity={0.7}
            onPress={() => props.onChange(period.key)}
          >
            <Text style={[styles.label, active && styles.labelActive]}>{t(period.tKey)}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 24,
    padding: 4,
    alignSelf: "center",
  },
  pill: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
  },
  pillActive: {
    backgroundColor: "#DA9133",
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(255,255,255,0.6)",
  },
  labelActive: {
    color: "#FFFFFF",
  },
});
