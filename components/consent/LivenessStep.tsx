import { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert, Dimensions, ActivityIndicator, NativeModules } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CameraView, useCameraPermissions } from "expo-camera";
import Svg, { Ellipse, Circle, Path } from "react-native-svg";
import FaceDetection, { type Face } from "@react-native-ml-kit/face-detection";

interface LivenessStepProps {
  onComplete: (frames: Record<string, string>) => void;
}

const POSES: Array<[string, string]> = [
  ["center", "Center your face"],
  ["left", "Turn your head slowly to the left"],
  ["right", "Turn your head slowly to the right"],
  ["up", "Tilt your head up"],
  ["down", "Tilt your head down"],
];

const COUNTDOWN_START = 3;
const COUNTDOWN_STEP_MS = 467;

const DETECTOR_LINKED = NativeModules.FaceDetection != null;
const YAW_TURN_MIN = 14;
const PITCH_TILT_MIN = 11;
const CENTER_YAW_MAX = 12;
const CENTER_PITCH_MAX = 13;

function validatePose(pose: string, face: Face): { ok: boolean; hint?: string } {
  const yaw = Math.abs(face.rotationY);
  const pitch = Math.abs(face.rotationX);
  switch (pose) {
    case "center":
      if (yaw <= CENTER_YAW_MAX && pitch <= CENTER_PITCH_MAX) return { ok: true };
      return { ok: false, hint: "Look straight into the camera" };
    case "left":
    case "right":
      if (yaw >= YAW_TURN_MIN) return { ok: true };
      return { ok: false, hint: "Turn your head a little more" };
    case "up":
    case "down":
      if (pitch >= PITCH_TILT_MIN) return { ok: true };
      return { ok: false, hint: "Tilt your head a little more" };
    default:
      return { ok: true };
  }
}

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

function SuccessCheckIcon() {
  return (
    <Svg width={64} height={64} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={10} fill="#2E7D32" />
      <Path d="M7.5 12.5l3 3 6-6.5" stroke="#FFFFFF" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function LivenessStep({ onComplete }: LivenessStepProps) {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const askedRef = useRef(false);
  const cameraRef = useRef<CameraView>(null);
  const framesRef = useRef<Record<string, string>>({});
  const detectorUsableRef = useRef(DETECTOR_LINKED);

  const [poseIndex, setPoseIndex] = useState(0);
  const [countdown, setCountdown] = useState(COUNTDOWN_START);
  const [capturing, setCapturing] = useState(false);
  const [done, setDone] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  const acceptFrame = (uri: string) => {
    framesRef.current[POSES[poseIndex]![0]] = uri;
    if (poseIndex < POSES.length - 1) {
      setCapturing(false);
      setPoseIndex((i) => i + 1);
    } else {
      setDone(true);
      setTimeout(() => onComplete(framesRef.current), 1100);
    }
  };

  const retryPose = (message: string) => {
    setHint(message);
    setCapturing(false);
    setCountdown(COUNTDOWN_START);
  };

  const detectFaces = async (uri: string): Promise<Face[] | null> => {
    if (!detectorUsableRef.current) return null;
    try {
      return await FaceDetection.detect(uri, { performanceMode: "accurate" });
    } catch {
      detectorUsableRef.current = false;
      return null;
    }
  };

  const handleCapture = async () => {
    if (capturing || !cameraRef.current) return;
    setCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.6, skipProcessing: true });
      if (!photo?.uri) {
        retryPose("We couldn't capture that. Hold steady.");
        return;
      }

      const faces = await detectFaces(photo.uri);

      if (faces === null) {
        acceptFrame(photo.uri);
        return;
      }
      if (faces.length === 0) {
        retryPose("Keep your face inside the oval");
        return;
      }
      if (faces.length > 1) {
        retryPose("Make sure only your face is visible");
        return;
      }

      const check = validatePose(POSES[poseIndex]![0], faces[0]!);
      if (!check.ok) {
        retryPose(check.hint ?? "Adjust your position");
        return;
      }

      acceptFrame(photo.uri);
    } catch {
      retryPose("We couldn't capture that. Hold steady and try again.");
    }
  };

  useEffect(() => {
    if (!permission || permission.granted || askedRef.current) return;
    askedRef.current = true;
    requestPermission().then((result) => {
      if (!result.granted) {
        Alert.alert("Camera permission needed", "Please allow camera access to complete your face check.");
      }
    });
  }, [permission, requestPermission]);

  useEffect(() => {
    if (!permission?.granted || done) return;
    setHint(null);
    setCountdown(COUNTDOWN_START);
  }, [poseIndex, permission?.granted, done]);

  useEffect(() => {
    if (!permission?.granted || done || capturing) return;
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), COUNTDOWN_STEP_MS);
    return () => clearTimeout(timer);
  }, [countdown, permission?.granted, done, capturing]);

  useEffect(() => {
    if (!permission?.granted || done || capturing) return;
    if (countdown === 0) {
      void handleCapture();
    }
  }, [countdown, permission?.granted, done, capturing]);

  if (!permission) {
    return (
      <View style={s.centered}>
        <ActivityIndicator size="large" color="#4C2311" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={s.permissionScreen}>
        <View style={s.permissionIconWrap}>
          <Svg width={30} height={30} viewBox="0 0 24 24" fill="none">
            <Path d="M4 8a2 2 0 012-2h1.2l.8-1.6A1 1 0 019 4h6a1 1 0 01.9.6L16.8 6H18a2 2 0 012 2v9a2 2 0 01-2 2H6a2 2 0 01-2-2V8z" stroke="#DA9133" strokeWidth={1.8} strokeLinejoin="round" />
            <Circle cx={12} cy={13} r={3.4} stroke="#DA9133" strokeWidth={1.8} />
          </Svg>
        </View>
        <Text style={s.permissionTitle}>Camera access needed</Text>
        <Text style={s.permissionBody}>
          We need your camera to complete a quick face check for your loan application.
        </Text>
        <TouchableOpacity style={s.permissionButton} activeOpacity={0.85} onPress={() => requestPermission()}>
          <Text style={s.permissionButtonText}>Enable camera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const currentPrompt = POSES[poseIndex]![1];

  return (
    <View style={s.container}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="front" />

      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Svg width={SCREEN_W} height={SCREEN_H} viewBox={`0 0 ${SCREEN_W} ${SCREEN_H}`}>
          <Ellipse
            cx={SCREEN_W / 2}
            cy={SCREEN_H / 2 - 30}
            rx={SCREEN_W * 0.32}
            ry={SCREEN_W * 0.42}
            stroke={done ? "#2E7D32" : "#DA9133"}
            strokeWidth={4}
            fill="none"
            opacity={0.9}
          />
        </Svg>
      </View>

      <View style={[s.promptBanner, { top: insets.top + 16 }]} pointerEvents="none">
        <Text style={s.promptText}>{done ? "All done" : currentPrompt}</Text>
        <Text style={[s.helperText, hint ? s.helperHint : null]}>
          {done
            ? "Face check complete"
            : capturing
              ? "Checking…"
              : hint ?? "Hold steady and keep your face inside the oval"}
        </Text>
      </View>

      <View style={[s.progressRow, { top: insets.top + 90 }]} pointerEvents="none">
        {POSES.map((pose, index) => (
          <View
            key={pose[0]}
            style={[s.progressSeg, (index < poseIndex || done) && s.progressSegDone, index === poseIndex && !done && s.progressSegActive]}
          />
        ))}
      </View>

      {!done && (
        <View style={s.countdownWrap} pointerEvents="none">
          <Text style={s.countdownText}>{countdown > 0 ? countdown : "•"}</Text>
        </View>
      )}

      {done && (
        <View style={s.successOverlay} pointerEvents="none">
          <SuccessCheckIcon />
          <Text style={s.successText}>Face check complete</Text>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000000" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F7F0EB" },
  permissionScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    backgroundColor: "#F7F0EB",
  },
  permissionIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#FDF6ED",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  permissionTitle: { fontSize: 18, fontWeight: "800", color: "#4C2311", marginBottom: 8, textAlign: "center" },
  permissionBody: { fontSize: 14, color: "#A68A7B", textAlign: "center", lineHeight: 20, marginBottom: 24 },
  permissionButton: {
    backgroundColor: "#DA9133",
    borderRadius: 24,
    paddingVertical: 15,
    paddingHorizontal: 32,
  },
  permissionButtonText: { fontSize: 15, fontWeight: "800", color: "#FFFFFF" },
  promptBanner: {
    position: "absolute",
    left: 20,
    right: 20,
    backgroundColor: "rgba(76,35,17,0.72)",
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  promptText: { fontSize: 16, fontWeight: "800", color: "#FFFFFF", marginBottom: 4, textAlign: "center" },
  helperText: { fontSize: 12.5, color: "rgba(255,255,255,0.75)", textAlign: "center" },
  helperHint: { color: "#FFD9A6", fontWeight: "700" },
  progressRow: {
    position: "absolute",
    left: 20,
    right: 20,
    flexDirection: "row",
    gap: 6,
  },
  progressSeg: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  progressSegActive: { backgroundColor: "#DA9133" },
  progressSegDone: { backgroundColor: "#2E7D32" },
  countdownWrap: {
    position: "absolute",
    bottom: 64,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  countdownText: {
    fontSize: 34,
    fontWeight: "800",
    color: "#FFFFFF",
    backgroundColor: "rgba(76,35,17,0.55)",
    width: 64,
    height: 64,
    borderRadius: 32,
    textAlign: "center",
    textAlignVertical: "center",
    overflow: "hidden",
  },
  successOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.55)",
    gap: 14,
  },
  successText: { fontSize: 17, fontWeight: "800", color: "#FFFFFF" },
});
