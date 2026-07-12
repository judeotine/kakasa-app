import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import Svg, { Path } from "react-native-svg";
import { formatUGX, type Loan } from "@/lib/loans";
import { StatusBadge } from "./StatusBadge";

const AVATAR_COLORS = [
  "#2E7D32",
  "#1565C0",
  "#C62828",
  "#E65100",
  "#6A1B9A",
  "#4C2311",
  "#8B9A6A",
  "#DA9133",
];

function colorForProvider(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash + name.charCodeAt(i) * (i + 1)) % AVATAR_COLORS.length;
  }
  return AVATAR_COLORS[hash] ?? AVATAR_COLORS[0]!;
}

function formatDisbursedDate(dateString: string): string {
  const d = new Date(dateString);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function ChevronRightIcon({ size = 18, color = "#A68A7B" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 6l6 6-6 6"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function LoanRow(props: { loan: Loan; onPress: () => void }) {
  const { loan, onPress } = props;
  const initial = loan.provider.charAt(0).toUpperCase();
  const avatarColor = colorForProvider(loan.provider);

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.7} onPress={onPress}>
      <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
        <Text style={styles.avatarText}>{initial}</Text>
      </View>
      <View style={styles.center}>
        <Text style={styles.provider} numberOfLines={1}>
          {loan.provider}
        </Text>
        <Text style={styles.date}>{formatDisbursedDate(loan.disbursed_at)}</Text>
      </View>
      <View style={styles.right}>
        <Text style={styles.amount}>{formatUGX(loan.outstanding)}</Text>
        <StatusBadge status={loan.status} />
      </View>
      <ChevronRightIcon />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    gap: 12,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  center: {
    flex: 1,
  },
  provider: {
    fontSize: 15,
    fontWeight: "700",
    color: "#4C2311",
    marginBottom: 4,
  },
  date: {
    fontSize: 12,
    color: "#A68A7B",
    fontWeight: "500",
  },
  right: {
    alignItems: "flex-end",
    gap: 6,
  },
  amount: {
    fontSize: 14,
    fontWeight: "700",
    color: "#4C2311",
  },
});
