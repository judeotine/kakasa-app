import { View, Text, StyleSheet } from "react-native";
import type { Eligibility } from "@/lib/providers";

export function EligibilityBadge({ eligibility }: { eligibility: Eligibility }) {
  if (eligibility.eligible) {
    return (
      <View style={[s.badge, s.badgeEligible]}>
        <View style={s.dot} />
        <Text style={s.textEligible}>Eligible</Text>
      </View>
    );
  }

  const reason = eligibility.reasons[0] ?? "Not eligible yet";

  return (
    <View style={[s.badge, s.badgeAmber]}>
      <Text style={s.textAmber} numberOfLines={1}>
        {reason}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  badgeEligible: {
    backgroundColor: "rgba(46,125,50,0.12)",
  },
  badgeAmber: {
    backgroundColor: "rgba(230,81,0,0.12)",
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#2E7D32",
  },
  textEligible: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2E7D32",
  },
  textAmber: {
    fontSize: 12,
    fontWeight: "700",
    color: "#E65100",
  },
});
