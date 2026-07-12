import { View, Text, StyleSheet } from "react-native";
import type { LoanStatus } from "@/lib/loans";
import { useLanguage } from "@/lib/i18n";

const STATUS_CONFIG: Record<LoanStatus, { tKey: string; color: string; bg: string }> = {
  active: { tKey: "status_active", color: "#DA9133", bg: "rgba(218,145,51,0.12)" },
  paid: { tKey: "status_paid", color: "#2E7D32", bg: "rgba(46,125,50,0.12)" },
  overdue: { tKey: "status_overdue", color: "#C62828", bg: "rgba(198,40,40,0.12)" },
  pending: { tKey: "status_pending", color: "#A68A7B", bg: "rgba(166,138,123,0.12)" },
};

export function StatusBadge(props: { status: LoanStatus }) {
  const { t } = useLanguage();
  const config = STATUS_CONFIG[props.status];

  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      <Text style={[styles.label, { color: config.color }]}>{t(config.tKey)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
  },
});
