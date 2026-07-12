import { View, Text, StyleSheet } from "react-native";

type FactorRating = "weak" | "fair" | "good" | "excellent";

interface FactorBarProps {
  label: string;
  rating: FactorRating;
  score0to100: number;
  last?: boolean;
}

const RATING_COLORS: Record<FactorRating, string> = {
  weak: "#C62828",
  fair: "#E65100",
  good: "#558B2F",
  excellent: "#2E7D32",
};

const RATING_LABELS: Record<FactorRating, string> = {
  weak: "Weak",
  fair: "Fair",
  good: "Good",
  excellent: "Excellent",
};

export function FactorBar({ label, rating, score0to100, last }: FactorBarProps) {
  const color = RATING_COLORS[rating];
  const pct = Math.max(0, Math.min(100, score0to100));

  return (
    <View style={[styles.row, !last && styles.rowSpacing]}>
      <View style={styles.headerRow}>
        <Text style={styles.label}>{label}</Text>
        <Text style={[styles.rating, { color }]}>{RATING_LABELS[rating]}</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    width: "100%",
  },
  rowSpacing: {
    marginBottom: 18,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 7,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4C2311",
  },
  rating: {
    fontSize: 13,
    fontWeight: "700",
  },
  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "#F0E8E1",
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 4,
  },
});
