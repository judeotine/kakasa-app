import { useState } from "react";
import { View, Text, StyleSheet, type GestureResponderEvent, type LayoutChangeEvent } from "react-native";
import Svg, { Path, Circle, Line, Defs, LinearGradient, Stop } from "react-native-svg";
import { formatUGXCompact, type ChartSeries } from "@/lib/loans";
import { useLanguage } from "@/lib/i18n";

const BORROWED_COLOR = "#DA9133";
const REPAID_COLOR = "#8B9A6A";

interface Point {
  x: number;
  y: number;
}

function smoothPath(points: Point[]): string {
  if (points.length === 0) return "";
  const first = points[0]!;
  if (points.length === 1) return `M ${first.x} ${first.y}`;

  let d = `M ${first.x} ${first.y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i]!;
    const p1 = points[i]!;
    const p2 = points[i + 1]!;
    const p3 = points[i + 2] ?? p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

export function BorrowRepayChart(props: {
  series: ChartSeries;
  height?: number;
  activeIndex: number;
  onActiveIndexChange: (i: number) => void;
}) {
  const { series, height = 200, activeIndex, onActiveIndexChange } = props;
  const { t } = useLanguage();
  const [width, setWidth] = useState(0);

  const onLayout = (evt: LayoutChangeEvent) => {
    setWidth(evt.nativeEvent.layout.width);
  };

  const padding = { top: 28, right: 6, bottom: 6, left: 6 };
  const n = series.labels.length;
  const chartW = Math.max(width - padding.left - padding.right, 1);
  const chartH = Math.max(height - padding.top - padding.bottom, 1);
  const xStep = n > 1 ? chartW / (n - 1) : 0;
  const maxVal = Math.max(1, ...series.borrowed, ...series.repaid);

  const toPoint = (values: number[], i: number): Point => {
    const value = values[i] ?? 0;
    return {
      x: padding.left + i * xStep,
      y: padding.top + chartH - (value / maxVal) * chartH,
    };
  };

  const borrowedPoints: Point[] = [];
  const repaidPoints: Point[] = [];
  for (let i = 0; i < n; i++) {
    borrowedPoints.push(toPoint(series.borrowed, i));
    repaidPoints.push(toPoint(series.repaid, i));
  }

  const borrowedPath = smoothPath(borrowedPoints);
  const repaidPath = smoothPath(repaidPoints);

  const baselineY = padding.top + chartH;
  const areaPath =
    n > 0
      ? `${borrowedPath} L ${borrowedPoints[n - 1]!.x} ${baselineY} L ${borrowedPoints[0]!.x} ${baselineY} Z`
      : "";

  const clampedIndex = n > 0 ? Math.min(Math.max(activeIndex, 0), n - 1) : 0;
  const activePoint = n > 0 ? borrowedPoints[clampedIndex] : undefined;
  const activeValue = series.borrowed[clampedIndex] ?? 0;

  const handleTouch = (evt: GestureResponderEvent) => {
    if (n <= 1 || xStep === 0) {
      onActiveIndexChange(0);
      return;
    }
    const localX = evt.nativeEvent.locationX - padding.left;
    const rawIndex = Math.round(localX / xStep);
    const nextIndex = Math.min(Math.max(rawIndex, 0), n - 1);
    onActiveIndexChange(nextIndex);
  };

  const bubbleWidth = 78;
  const bubbleLeft = activePoint
    ? Math.min(Math.max(activePoint.x - bubbleWidth / 2, 0), Math.max(width - bubbleWidth, 0))
    : 0;

  return (
    <View style={styles.container}>
      <View style={{ height }} onLayout={onLayout}>
        {width > 0 && n > 0 && (
          <>
            <Svg width={width} height={height}>
              <Defs>
                <LinearGradient id="borrowedAreaFill" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={BORROWED_COLOR} stopOpacity={0.18} />
                  <Stop offset="1" stopColor={BORROWED_COLOR} stopOpacity={0} />
                </LinearGradient>
              </Defs>
              <Path d={areaPath} fill="url(#borrowedAreaFill)" />
              <Path
                d={repaidPath}
                stroke={REPAID_COLOR}
                strokeWidth={3}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <Path
                d={borrowedPath}
                stroke={BORROWED_COLOR}
                strokeWidth={3}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {activePoint && (
                <>
                  <Line
                    x1={activePoint.x}
                    y1={padding.top}
                    x2={activePoint.x}
                    y2={baselineY}
                    stroke="rgba(255,255,255,0.15)"
                    strokeWidth={1}
                  />
                  <Circle cx={activePoint.x} cy={activePoint.y} r={9} fill="rgba(218,145,51,0.25)" />
                  <Circle
                    cx={activePoint.x}
                    cy={activePoint.y}
                    r={5}
                    fill="#FFFFFF"
                    stroke={BORROWED_COLOR}
                    strokeWidth={2.5}
                  />
                </>
              )}
            </Svg>
            {activePoint && (
              <View style={[styles.bubble, { left: bubbleLeft, top: Math.max(activePoint.y - 42, 0), width: bubbleWidth }]}>
                <Text style={styles.bubbleText}>{formatUGXCompact(activeValue)}</Text>
              </View>
            )}
            <View
              style={StyleSheet.absoluteFill}
              onStartShouldSetResponder={() => true}
              onResponderGrant={handleTouch}
              onResponderMove={handleTouch}
            />
          </>
        )}
      </View>

      <View style={styles.xLabels}>
        {series.labels.map((label, i) => (
          <Text key={`${label}-${i}`} style={styles.xLabel}>
            {label}
          </Text>
        ))}
      </View>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: BORROWED_COLOR }]} />
          <Text style={styles.legendLabel}>{t("chart_borrowed")}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: REPAID_COLOR }]} />
          <Text style={styles.legendLabel}>{t("chart_repaid")}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  bubble: {
    position: "absolute",
    backgroundColor: BORROWED_COLOR,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: "center",
  },
  bubbleText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  xLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 6,
    marginTop: 4,
  },
  xLabel: {
    fontSize: 11,
    fontWeight: "500",
    color: "rgba(255,255,255,0.5)",
  },
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 20,
    marginTop: 14,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255,255,255,0.7)",
  },
});
