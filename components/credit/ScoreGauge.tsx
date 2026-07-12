import { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Animated, Easing } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { colorForBand, SCORE_MIN, SCORE_MAX } from "@/lib/credit";

interface ScoreGaugeProps {
  score: number;
  band: string;
  size?: number;
}

const VIEW_BOX = 100;
const RADIUS = 38;
const STROKE_WIDTH = 9;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const ARC = CIRCUMFERENCE * 0.75;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function ScoreGauge({ score, band, size = 220 }: ScoreGaugeProps) {
  const progress = useRef(new Animated.Value(0)).current;
  const [filled, setFilled] = useState(0);
  const color = colorForBand(band);
  const scale = size / 220;

  useEffect(() => {
    const ratio = clamp((score - SCORE_MIN) / (SCORE_MAX - SCORE_MIN), 0, 1);
    const target = ARC * ratio;
    progress.setValue(0);
    const listenerId = progress.addListener(({ value }) => setFilled(value));
    Animated.timing(progress, {
      toValue: target,
      duration: 1000,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    return () => {
      progress.removeListener(listenerId);
    };
  }, [score, progress]);

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox={`0 0 ${VIEW_BOX} ${VIEW_BOX}`}>
        <Circle
          cx={50}
          cy={50}
          r={RADIUS}
          stroke="rgba(255,255,255,0.18)"
          strokeWidth={STROKE_WIDTH}
          fill="none"
          strokeDasharray={`${ARC} ${CIRCUMFERENCE}`}
          strokeLinecap="round"
          transform="rotate(135 50 50)"
        />
        <Circle
          cx={50}
          cy={50}
          r={RADIUS}
          stroke={color}
          strokeWidth={STROKE_WIDTH}
          fill="none"
          strokeDasharray={`${filled} ${CIRCUMFERENCE}`}
          strokeLinecap="round"
          transform="rotate(135 50 50)"
        />
      </Svg>
      <View style={styles.center} pointerEvents="none">
        <Text style={[styles.score, { fontSize: Math.round(52 * scale) }]}>{score}</Text>
        <Text style={[styles.band, { fontSize: Math.round(14 * scale) }]}>{band}</Text>
      </View>
      <Text style={[styles.endLabel, styles.endLabelLeft, { fontSize: Math.round(12 * scale) }]}>
        {SCORE_MIN}
      </Text>
      <Text style={[styles.endLabel, styles.endLabelRight, { fontSize: Math.round(12 * scale) }]}>
        {SCORE_MAX}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
  center: {
    position: "absolute",
    alignItems: "center",
  },
  score: {
    fontWeight: "800",
    color: "#FFFFFF",
  },
  band: {
    fontWeight: "700",
    color: "rgba(255,255,255,0.8)",
    marginTop: 2,
  },
  endLabel: {
    position: "absolute",
    bottom: "8%",
    color: "rgba(255,255,255,0.5)",
    fontWeight: "600",
  },
  endLabelLeft: {
    left: "4%",
  },
  endLabelRight: {
    right: "4%",
  },
});
