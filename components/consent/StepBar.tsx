import { View, Text, StyleSheet } from "react-native";

export function StepBar({ current, total }: { current: number; total: number }) {
  const segments = Array.from({ length: total }, (_, i) => i);

  return (
    <View style={s.wrap}>
      <View style={s.track}>
        {segments.map((i) => (
          <View
            key={i}
            style={[s.segment, i < current ? s.segmentFilled : s.segmentEmpty]}
          />
        ))}
      </View>
      <Text style={s.label}>{`Step ${current} of ${total}`}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { paddingHorizontal: 20, paddingVertical: 10 },
  track: { flexDirection: "row", gap: 6 },
  segment: { flex: 1, height: 5, borderRadius: 3 },
  segmentFilled: { backgroundColor: "#DA9133" },
  segmentEmpty: { backgroundColor: "#E7DDD3" },
  label: { fontSize: 12, fontWeight: "600", color: "#A68A7B", marginTop: 8 },
});
