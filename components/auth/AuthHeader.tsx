import { View, StyleSheet, Dimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

const { width: W } = Dimensions.get("window");
const FILL = "#4C2311";

export function AuthHeader() {
  const insets = useSafeAreaInsets();
  const arc = 72;
  const baseY = insets.top + 40;
  const height = baseY + arc;
  const d = `M0 0 L${W} 0 L${W} ${baseY} A ${W / 2} ${arc} 0 0 1 0 ${baseY} Z`;

  return (
    <View style={[styles.header, { height, width: W }]}>
      <Svg width={W} height={height} viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none">
        <Path d={d} fill={FILL} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { alignSelf: "stretch" },
});
