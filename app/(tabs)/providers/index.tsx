import { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import Svg, { Path, Circle } from "react-native-svg";
import type { Provider, Eligibility } from "@/lib/providers";
import { listProviders, getUserEligibilityContext, evaluateEligibility } from "@/lib/providers";
import ProviderCard from "@/components/providers/ProviderCard";

interface Row {
  provider: Provider;
  eligibility: Eligibility;
}

function ShieldIcon({ size = 26 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
        stroke="#FFFFFF"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function SearchOffIcon({ size = 48, color = "#8B9A6A" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={11} cy={11} r={7} stroke={color} strokeWidth={1.8} />
      <Path d="M21 21l-4.35-4.35" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function SearchIcon({ size = 22, color = "#4C2311" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.35-4.35"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function loanTypeLabel(loanType: string): string {
  if (loanType.toLowerCase() === "sme") return "SME";
  return loanType.charAt(0).toUpperCase() + loanType.slice(1);
}

export default function ProvidersScreen() {
  const insets = useSafeAreaInsets();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [providers, userContext] = await Promise.all([
        listProviders(),
        getUserEligibilityContext(),
      ]);

      const evaluated = providers.map((provider) => ({
        provider,
        eligibility: evaluateEligibility(provider, userContext),
      }));

      evaluated.sort((a, b) => {
        if (a.eligibility.eligible !== b.eligibility.eligible) {
          return a.eligibility.eligible ? -1 : 1;
        }
        return a.provider.sort_order - b.provider.sort_order;
      });

      setRows(evaluated);
    } catch (err) {
      Alert.alert(
        "Couldn't load providers",
        err instanceof Error ? err.message : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const loanTypes = useMemo(() => {
    const seen = new Set<string>();
    for (const row of rows) seen.add(row.provider.loan_type);
    return Array.from(seen);
  }, [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter(({ provider }) => {
      if (activeFilter !== "all" && provider.loan_type !== activeFilter) return false;
      if (!q) return true;
      return (
        provider.name.toLowerCase().includes(q) ||
        provider.loan_type.toLowerCase().includes(q) ||
        (provider.description?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [rows, activeFilter, query]);

  const eligibleCount = useMemo(() => rows.filter((r) => r.eligibility.eligible).length, [rows]);
  const total = rows.length;

  const handleOpenProvider = (id: string) => {
    router.push({ pathname: "/providers/[id]", params: { id } });
  };

  return (
    <View style={s.screen}>
      <View style={[s.header, { paddingTop: insets.top + 16 }]}>
        <View style={s.headerIconWrap}>
          <ShieldIcon size={26} />
        </View>
        <Text style={s.headerTitle}>Loan Providers</Text>
        <Text style={s.headerSubtitle}>
          {total === 0
            ? "Building your personalized list..."
            : `${eligibleCount} of ${total} match your profile`}
        </Text>
      </View>

      <View style={s.searchWrap}>
        <TextInput
          style={s.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Search providers..."
          placeholderTextColor="#A68A7B"
          autoCorrect={false}
          returnKeyType="search"
        />
        <SearchIcon size={22} color="#4C2311" />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.chipRow}
        style={s.chipScroll}
      >
        <TouchableOpacity
          style={[s.chip, activeFilter === "all" && s.chipActive]}
          activeOpacity={0.7}
          onPress={() => setActiveFilter("all")}
        >
          <Text style={[s.chipText, activeFilter === "all" && s.chipTextActive]}>All</Text>
        </TouchableOpacity>
        {loanTypes.map((loanType) => (
          <TouchableOpacity
            key={loanType}
            style={[s.chip, activeFilter === loanType && s.chipActive]}
            activeOpacity={0.7}
            onPress={() => setActiveFilter(loanType)}
          >
            <Text style={[s.chipText, activeFilter === loanType && s.chipTextActive]}>
              {loanTypeLabel(loanType)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color="#4C2311" />
        </View>
      ) : filtered.length === 0 ? (
        <View style={s.emptyWrap}>
          <SearchOffIcon />
          <Text style={s.emptyTitle}>No providers found</Text>
          <Text style={s.emptySubtitle}>Try a different search or filter.</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.provider.id}
          renderItem={({ item }) => (
            <ProviderCard
              provider={item.provider}
              eligibility={item.eligibility}
              onPress={() => handleOpenProvider(item.provider.id)}
            />
          )}
          contentContainerStyle={[s.listContent, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F7F0EB",
  },
  header: {
    backgroundColor: "#4C2311",
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  headerIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 6,
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(255,255,255,0.75)",
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EDE5DD",
    borderRadius: 28,
    height: 52,
    paddingHorizontal: 18,
    gap: 10,
    marginHorizontal: 24,
    marginTop: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#4C2311",
    height: "100%",
  },
  chipScroll: {
    flexGrow: 0,
    marginTop: 14,
  },
  chipRow: {
    paddingHorizontal: 24,
    gap: 10,
    paddingBottom: 4,
    alignItems: "center",
  },
  chip: {
    height: 40,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D9CCC4",
    borderRadius: 20,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  chipActive: {
    backgroundColor: "#DA9133",
    borderColor: "#DA9133",
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4C2311",
  },
  chipTextActive: {
    color: "#FFFFFF",
  },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#4C2311",
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#A68A7B",
    textAlign: "center",
  },
  listContent: {
    paddingHorizontal: 24,
    paddingTop: 18,
  },
});
