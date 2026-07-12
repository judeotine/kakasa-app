import { useState, useCallback, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SectionList,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { router, useFocusEffect } from "expo-router";
import type {
  Period,
  Loan,
  LoanStats,
  ChartSeries} from "@/lib/loans";
import {
  getLoanStats,
  getChartSeries,
  listLoans,
  formatUGX,
} from "@/lib/loans";
import { PeriodToggle } from "@/components/loans/PeriodToggle";
import { BorrowRepayChart } from "@/components/loans/BorrowRepayChart";
import { LoanRow } from "@/components/loans/LoanRow";
import { useLanguage } from "@/lib/i18n";

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

interface LoanSection {
  title: string;
  data: Loan[];
}

function groupLoansByDate(loans: Loan[], todayLabel: string, yesterdayLabel: string): LoanSection[] {
  const now = new Date();
  const todayKey = now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = yesterday.toDateString();

  const order: string[] = [];
  const map = new Map<string, Loan[]>();

  for (const loan of loans) {
    const d = new Date(loan.disbursed_at);
    const dayKey = d.toDateString();
    let label: string;
    if (dayKey === todayKey) label = todayLabel;
    else if (dayKey === yesterdayKey) label = yesterdayLabel;
    else label = `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;

    if (!map.has(label)) {
      map.set(label, []);
      order.push(label);
    }
    map.get(label)!.push(loan);
  }

  return order.map((title) => ({ title, data: map.get(title)! }));
}

function BellIcon({ size = 20, color = "#FFFFFF" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M18 8A6 6 0 106 8c0 7-3 9-3 9h18s-3-2-3-9zM13.73 21a2 2 0 01-3.46 0"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

const EMPTY_SERIES: ChartSeries = { labels: [], borrowed: [], repaid: [] };
const EMPTY_STATS: LoanStats = {
  totalOutstanding: 0,
  totalBorrowed: 0,
  totalRepaid: 0,
  activeCount: 0,
};

export default function LoansScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const [period, setPeriod] = useState<Period>("week");
  const [stats, setStats] = useState<LoanStats>(EMPTY_STATS);
  const [series, setSeries] = useState<ChartSeries>(EMPTY_SERIES);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const skipNextPeriodFetch = useRef(true);
  const periodRef = useRef(period);

  useEffect(() => {
    periodRef.current = period;
  }, [period]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setLoading(true);
      skipNextPeriodFetch.current = true;

      (async () => {
        try {
          const [statsData, loansData, seriesData] = await Promise.all([
            getLoanStats(),
            listLoans(),
            getChartSeries(periodRef.current),
          ]);
          if (cancelled) return;
          setStats(statsData);
          setLoans(loansData);
          setSeries(seriesData);
        } catch {
          if (!cancelled) {
            Alert.alert(t("common_error"), t("loans_load_error"));
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();

      return () => {
        cancelled = true;
      };
    }, [])
  );

  useEffect(() => {
    if (skipNextPeriodFetch.current) {
      skipNextPeriodFetch.current = false;
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const seriesData = await getChartSeries(period);
        if (!cancelled) setSeries(seriesData);
      } catch {
        if (!cancelled) {
          Alert.alert(t("common_error"), t("loans_chart_error"));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [period]);

  useEffect(() => {
    setActiveIndex(Math.max(series.borrowed.length - 1, 0));
  }, [series]);

  if (loading) {
    return (
      <View style={[s.screen, s.centered]}>
        <ActivityIndicator size="large" color="#DA9133" />
      </View>
    );
  }

  const sections = groupLoansByDate(loans, t("common_today"), t("common_yesterday"));

  return (
    <View style={s.screen}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        stickySectionHeadersEnabled={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.listContent, { paddingBottom: insets.bottom + 24 }]}
        ListHeaderComponent={
          <>
            <View style={[s.statPanel, { paddingTop: insets.top + 16 }]}>
              <View style={s.headerRow}>
                <Text style={s.headerTitle}>{t("loans_title")}</Text>
                <TouchableOpacity
                  style={s.bellButton}
                  activeOpacity={0.7}
                  hitSlop={8}
                  onPress={() => router.push("/notifications")}
                >
                  <BellIcon size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              <View style={s.toggleWrap}>
                <PeriodToggle value={period} onChange={setPeriod} />
              </View>

              <View style={s.totalWrap}>
                <Text style={s.totalLabel}>{t("loans_total_outstanding")}</Text>
                <Text style={s.totalValue}>{formatUGX(stats.totalOutstanding)}</Text>
              </View>

              <BorrowRepayChart
                series={series}
                height={200}
                activeIndex={activeIndex}
                onActiveIndexChange={setActiveIndex}
              />
            </View>

            <View style={s.listHeaderRow}>
              <Text style={s.listHeaderTitle}>{t("loans_your_loans")}</Text>
              <TouchableOpacity activeOpacity={0.7}>
                <Text style={s.viewAll}>{t("loans_view_all")}</Text>
              </TouchableOpacity>
            </View>
          </>
        }
        renderSectionHeader={({ section }) => (
          <View style={s.sectionHeaderWrap}>
            <Text style={s.sectionHeaderText}>{section.title}</Text>
          </View>
        )}
        renderItem={({ item }) => (
          <View style={s.rowWrap}>
            <LoanRow
              loan={item}
              onPress={() =>
                router.push({ pathname: "/loan/[id]", params: { id: item.id } })
              }
            />
          </View>
        )}
        ListEmptyComponent={
          <View style={s.emptyWrap}>
            <Text style={s.emptyText}>{t("loans_no_loans")}</Text>
          </View>
        }
      />
    </View>
  );
}

const s = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F7F0EB",
  },
  centered: {
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    backgroundColor: "#FFFFFF",
    flexGrow: 1,
  },
  statPanel: {
    backgroundColor: "#4C2311",
    paddingHorizontal: 24,
    paddingBottom: 36,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  bellButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  toggleWrap: {
    alignItems: "center",
    marginBottom: 24,
  },
  totalWrap: {
    alignItems: "center",
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(255,255,255,0.7)",
    marginBottom: 6,
  },
  totalValue: {
    fontSize: 32,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  listHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    marginTop: -24,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 12,
  },
  listHeaderTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#4C2311",
  },
  viewAll: {
    fontSize: 14,
    fontWeight: "600",
    color: "#DA9133",
  },
  sectionHeaderWrap: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 8,
  },
  sectionHeaderText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#A68A7B",
  },
  rowWrap: {
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  emptyWrap: {
    paddingHorizontal: 24,
    paddingTop: 40,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 15,
    color: "#A68A7B",
    fontWeight: "500",
  },
});
