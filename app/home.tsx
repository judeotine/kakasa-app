import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();

  const phone = session?.user.phone;
  const identity = phone ? `+${phone}` : session?.user.id;

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 },
      ]}
    >
      <View style={styles.content}>
        <Text style={styles.heading}>You&apos;re signed in</Text>
        {identity ? <Text style={styles.identity}>{identity}</Text> : null}
      </View>

      <TouchableOpacity
        style={styles.signOutButton}
        activeOpacity={0.8}
        onPress={() => supabase.auth.signOut()}
      >
        <Text style={styles.signOutText}>Sign out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 24,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  heading: {
    fontSize: 28,
    fontWeight: "800",
    color: "#4C2311",
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  identity: {
    fontSize: 16,
    color: "#633E2F",
  },
  signOutButton: {
    backgroundColor: "#DA9133",
    borderRadius: 16,
    height: 56,
    justifyContent: "center",
    alignItems: "center",
  },
  signOutText: {
    fontSize: 17,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
