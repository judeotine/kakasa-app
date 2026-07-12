import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import Svg, { Path } from "react-native-svg";
import type { Provider, Eligibility } from "@/lib/providers";
import { formatUGXCompact } from "@/lib/loans";
import { EligibilityBadge } from "./EligibilityBadge";

function ChevronRightIcon({ size = 20, color = "#A68A7B" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M9 18l6-6-6-6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function loanTypeLabel(loanType: string): string {
  if (loanType.toLowerCase() === "sme") return "SME";
  return loanType.charAt(0).toUpperCase() + loanType.slice(1);
}

function ProviderCard({
  provider,
  eligibility,
  onPress,
}: {
  provider: Provider;
  eligibility: Eligibility;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={s.card} activeOpacity={0.7} onPress={onPress}>
      <View style={[s.avatar, { backgroundColor: provider.logo_color }]}>
        <Text style={s.avatarInitial}>{provider.name.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={s.center}>
        <Text style={s.name} numberOfLines={1}>
          {provider.name}
        </Text>
        <Text style={s.type}>{loanTypeLabel(provider.loan_type)} loan</Text>
        <Text style={s.rate}>
          {`${provider.min_rate}–${provider.max_rate}% · up to ${formatUGXCompact(provider.max_amount)}`}
        </Text>
        <EligibilityBadge eligibility={eligibility} />
      </View>
      <ChevronRightIcon />
    </TouchableOpacity>
  );
}

export default ProviderCard;
export { ProviderCard };

const s = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    gap: 14,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  center: {
    flex: 1,
    gap: 4,
  },
  name: {
    fontSize: 15,
    fontWeight: "700",
    color: "#4C2311",
  },
  type: {
    fontSize: 12,
    fontWeight: "600",
    color: "#A68A7B",
  },
  rate: {
    fontSize: 13,
    fontWeight: "500",
    color: "#633E2F",
    marginBottom: 2,
  },
});
