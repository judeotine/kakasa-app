import { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import Svg, { Path, Circle, Rect } from "react-native-svg";

type Side = "front" | "back";

interface IdUploadStepProps {
  front: string | null;
  back: string | null;
  onCaptured: (side: Side, uri: string) => void;
  onNext: () => void;
}

function CameraIcon() {
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
      <Path d="M4 8a2 2 0 012-2h1.2l.8-1.6A1 1 0 019 4h6a1 1 0 01.9.6L16.8 6H18a2 2 0 012 2v9a2 2 0 01-2 2H6a2 2 0 01-2-2V8z" stroke="#DA9133" strokeWidth={1.8} strokeLinejoin="round" />
      <Circle cx={12} cy={13} r={3.4} stroke="#DA9133" strokeWidth={1.8} />
    </Svg>
  );
}

function CheckIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={10} fill="#2E7D32" />
      <Path d="M8 12.5l2.5 2.5 5.5-6" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function RetakeIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Path d="M23 4v6h-6M1 20v-6h6" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function ArrowRightIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M5 12h14M12 5l7 7-7 7" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

async function takePhoto(): Promise<string | null> {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== "granted") {
    Alert.alert("Camera permission needed", "Please allow camera access to capture your National ID.");
    return null;
  }
  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: "images",
    quality: 0.7,
  });
  const asset = !result.canceled ? result.assets?.[0] : undefined;
  return asset?.uri ?? null;
}

async function pickFromLibrary(): Promise<string | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: "images",
    allowsEditing: true,
    quality: 0.7,
  });
  const asset = !result.canceled ? result.assets?.[0] : undefined;
  return asset?.uri ?? null;
}

function CaptureCard({
  label,
  hint,
  uri,
  onPress,
}: {
  label: string;
  hint: string;
  uri: string | null;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={s.card} activeOpacity={0.85} onPress={onPress}>
      {uri ? (
        <View>
          <Image source={{ uri }} style={s.thumbnail} resizeMode="cover" />
          <View style={s.thumbOverlay}>
            <View style={s.doneBadge}>
              <CheckIcon />
              <Text style={s.doneBadgeText}>{label}</Text>
            </View>
            <View style={s.retakePill}>
              <RetakeIcon />
              <Text style={s.retakeText}>Retake</Text>
            </View>
          </View>
        </View>
      ) : (
        <View style={s.emptyCard}>
          <View style={s.iconWrap}>
            <CameraIcon />
          </View>
          <Text style={s.cardLabel}>{label}</Text>
          <Text style={s.cardHint}>{hint}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export function IdUploadStep({ front, back, onCaptured, onNext }: IdUploadStepProps) {
  const insets = useSafeAreaInsets();
  const [busySide, setBusySide] = useState<Side | null>(null);

  const handlePress = (side: Side) => {
    if (busySide) return;
    Alert.alert(
      side === "front" ? "Front of National ID" : "Back of National ID",
      "Choose how to add this photo",
      [
        {
          text: "Take photo",
          onPress: async () => {
            setBusySide(side);
            const uri = await takePhoto();
            setBusySide(null);
            if (uri) onCaptured(side, uri);
          },
        },
        {
          text: "Choose from library",
          onPress: async () => {
            setBusySide(side);
            const uri = await pickFromLibrary();
            setBusySide(null);
            if (uri) onCaptured(side, uri);
          },
        },
        { text: "Cancel", style: "cancel" },
      ],
    );
  };

  const canContinue = Boolean(front) && Boolean(back);

  return (
    <View style={s.container}>
      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={s.title}>Upload your National ID</Text>
        <Text style={s.subtitle}>We need clear photos of the front and back to verify your identity.</Text>

        <CaptureCard
          label="Front of National ID"
          hint="Tap to capture or upload"
          uri={front}
          onPress={() => handlePress("front")}
        />
        <CaptureCard
          label="Back of National ID"
          hint="Tap to capture or upload"
          uri={back}
          onPress={() => handlePress("back")}
        />

        <View style={s.noteRow}>
          <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
            <Rect x={3} y={5} width={18} height={14} rx={3} stroke="#A68A7B" strokeWidth={1.6} />
            <Path d="M3 9h18" stroke="#A68A7B" strokeWidth={1.6} />
          </Svg>
          <Text style={s.noteText}>Make sure all four corners are visible and the text is easy to read.</Text>
        </View>
      </ScrollView>

      <TouchableOpacity
        style={[s.nextButton, { marginBottom: insets.bottom + 12 }, !canContinue && s.nextButtonDisabled]}
        activeOpacity={0.85}
        disabled={!canContinue}
        onPress={onNext}
      >
        <Text style={s.nextButtonText}>Continue</Text>
        <ArrowRightIcon />
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 16 },
  title: { fontSize: 20, fontWeight: "800", color: "#4C2311", marginBottom: 6 },
  subtitle: { fontSize: 14, color: "#A68A7B", lineHeight: 20, marginBottom: 20 },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    marginBottom: 16,
    overflow: "hidden",
    shadowColor: "#4C2311",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  emptyCard: {
    borderWidth: 1.5,
    borderColor: "#EADFCF",
    borderStyle: "dashed",
    borderRadius: 18,
    paddingVertical: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#FDF6ED",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  cardLabel: { fontSize: 15, fontWeight: "700", color: "#4C2311", marginBottom: 4 },
  cardHint: { fontSize: 13, color: "#A68A7B" },
  thumbnail: { width: "100%", height: 170, backgroundColor: "#EADFCF" },
  thumbOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    top: 0,
    padding: 12,
    justifyContent: "space-between",
    flexDirection: "row",
  },
  doneBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: "flex-start",
  },
  doneBadgeText: { fontSize: 12, fontWeight: "700", color: "#4C2311" },
  retakePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(76,35,17,0.75)",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: "flex-end",
  },
  retakeText: { fontSize: 12, fontWeight: "700", color: "#FFFFFF" },
  noteRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginTop: 4 },
  noteText: { flex: 1, fontSize: 12.5, color: "#A68A7B", lineHeight: 18 },
  nextButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#DA9133",
    borderRadius: 24,
    paddingVertical: 16,
    marginHorizontal: 20,
    marginTop: 8,
  },
  nextButtonDisabled: { backgroundColor: "#E4C79A" },
  nextButtonText: { fontSize: 15, fontWeight: "800", color: "#FFFFFF" },
});
