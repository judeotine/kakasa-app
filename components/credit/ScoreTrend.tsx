import { useState } from "react";
import { View, Text, StyleSheet, type LayoutChangeEvent } from "react-native";
import Svg, { Path, Circle, Defs, LinearGradient, Stop } from "react-native-svg";

interface TrendPoint {
  score: number;
  computed_at: string;
}

interface ScoreTrendProps {
  points: TrendPoint[];
  color?: string;
  height?: number;
}

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

export function ScoreTrend({ points, color = "#DA9133", height = 90 }: ScoreTrendProps) {
  const [width, setWidth] = useState(0);

  const onLayout = (evt: LayoutChangeEvent) => {
    setWidth(evt.nativeEvent.layout.width);
  };

  if (points.length < 2) {
    return (
      <View style={[styles.placeholder, { height }]} onLayout={onLayout}>
        <Text style={styles.placeholderText}>
          {points.length === 1
            ? "Check back after your next score update to see a trend."
            : "Not enough history yet. Refresh to start tracking your score."}
        </Text>
      </View>
    );
  }

  const padding = { top: 14, right: 10, bottom: 14, left: 10 };
  const chartW = Math.max(width - padding.left - padding.right, 1);
  const chartH = Math.max(height - padding.top - padding.bottom, 1);
  const n = points.length;
  const xStep = n > 1 ? chartW / (n - 1) : 0;

  const scores = points.map((p) => p.score);
  const minScore = Math.min(...scores);
  const maxScore = Math.max(...scores);
  const range = maxScore - minScore || 1;

  const svgPoints: Point[] = points.map((p, i) => ({
    x: padding.left + i * xStep,
    y: padding.top + chartH - ((p.score - minScore) / range) * chartH,
  }));

  const path = smoothPath(svgPoints);
  const baselineY = padding.top + chartH;
  const last = svgPoints[n - 1]!;
  const first = points[0]!;
  const lastPoint = points[n - 1]!;
  const delta = lastPoint.score - first.score;

  return (
    <View style={styles.container}>
      <View style={{ height }} onLayout={onLayout}>
        {width > 0 && (
          <Svg width={width} height={height}>
            <Defs>
              <LinearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={color} stopOpacity={0.18} />
                <Stop offset="1" stopColor={color} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            <Path
              d={`${path} L ${last.x} ${baselineY} L ${svgPoints[0]!.x} ${baselineY} Z`}
              fill="url(#trendFill)"
            />
            <Path
              d={path}
              stroke={color}
              strokeWidth={2.5}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <Circle cx={last.x} cy={last.y} r={7} fill={`${color}33`} />
            <Circle cx={last.x} cy={last.y} r={4} fill="#FFFFFF" stroke={color} strokeWidth={2} />
          </Svg>
        )}
      </View>
      <Text style={styles.summary}>
        {delta > 0
          ? `+${delta} over this period`
          : delta < 0
            ? `${delta} over this period`
            : "No change over this period"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  placeholder: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  placeholderText: {
    fontSize: 13,
    color: "#A68A7B",
    textAlign: "center",
    lineHeight: 19,
  },
  summary: {
    fontSize: 12,
    fontWeight: "600",
    color: "#A68A7B",
    marginTop: 8,
    textAlign: "center",
  },
});
