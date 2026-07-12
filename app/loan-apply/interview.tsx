import { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Animated,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import Svg, { Path, Circle } from "react-native-svg";
import {
  useAudioRecorder,
  AudioQuality,
  IOSOutputFormat,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  type RecordingOptions,
} from "expo-audio";
import * as Speech from "expo-speech";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { useLanguage } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";
import {
  updateInterviewTranscript,
  uploadDocument,
  type InterviewMessage,
} from "@/lib/loanApplication";

type InterviewMode = "voice" | "text";
type InterviewState = "idle" | "recording" | "processing" | "playing";

const WAV_RECORDING: RecordingOptions = {
  extension: ".wav",
  sampleRate: 16000,
  numberOfChannels: 1,
  bitRate: 128000,
  android: {
    outputFormat: "default",
    audioEncoder: "default",
  },
  ios: {
    outputFormat: IOSOutputFormat.LINEARPCM,
    audioQuality: AudioQuality.HIGH,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: {
    mimeType: "audio/webm",
    bitsPerSecond: 128000,
  },
};

function cleanInterviewerText(raw: string): string {
  let text = (raw ?? "").trim();
  const cutPatterns = [
    /\n\s*(applicant|user|candidate|interviewee|me|peter|customer|borrower|client)\s*:/i,
    /\n\s*\*\*(applicant|user|candidate|interviewee|peter|customer|borrower|client)\*\*\s*:/i,
    /\n\s*\[?(applicant|user|candidate|interviewee|peter|customer|borrower|client)\]?\s*:/i,
  ];
  for (const pattern of cutPatterns) {
    const match = text.search(pattern);
    if (match !== -1) text = text.slice(0, match);
  }
  text = text.replace(/^\s*(interviewer|officer|ai|assistant|loan officer)\s*:\s*/i, "");
  text = text
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/`/g, "")
    .replace(/^#{1,6}\s*/gm, "");
  const lines = text.split("\n");
  const cleaned: string[] = [];
  for (const line of lines) {
    if (/^\s*(applicant|user|candidate|interviewee|peter|customer|borrower|client)\s*:/i.test(line)) break;
    cleaned.push(line);
  }
  return cleaned.join("\n").trim();
}

function BackArrowIcon({ color = "#FFFFFF" }: { color?: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M19 12H5M12 19l-7-7 7-7" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function MicIcon({ color = "#FFFFFF" }: { color?: string }) {
  return (
    <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
      <Path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function MuteIcon({ muted }: { muted: boolean }) {
  if (muted) {
    return (
      <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
        <Path d="M1 1l22 22M9 9v3a3 3 0 005.12 2.12M15 9.34V4a3 3 0 00-5.94-.6" stroke="#E53935" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M17 16.95A7 7 0 015 12v-2m14 0v2c0 .76-.12 1.5-.35 2.18M12 19v4M8 23h8" stroke="#E53935" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    );
  }
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" stroke="#4C2311" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8" stroke="#4C2311" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function PhoneOffIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path d="M10.68 13.31a16 16 0 003.41 2.6l1.27-1.27a2 2 0 012.11-.45 11.5 11.5 0 003.53.56 2 2 0 012 2v3.5a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.42 19.42 0 01-6-6A19.79 19.79 0 013.12 4.18 2 2 0 015.12 2H8.5a2 2 0 012 1.72 11.5 11.5 0 00.56 3.53 2 2 0 01-.45 2.11L9.34 10.6" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M1 1l22 22" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function DocumentIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="#4C2311" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke="#4C2311" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function SendIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function ModeSelectionScreen({
  onSelect,
  t,
}: {
  onSelect: (mode: InterviewMode) => void;
  t: (key: string) => string;
}) {
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<InterviewMode>("voice");

  return (
    <View style={s.container}>
      <View style={[s.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={s.headerBackButton} onPress={() => router.back()} activeOpacity={0.7}>
          <BackArrowIcon />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle} numberOfLines={1}>{t("interview_title")}</Text>
        </View>
        <View style={{ width: 42 }} />
      </View>

      <View style={s.modeBody}>
        <View style={s.modeIconWrap}>
          <Svg width={48} height={48} viewBox="0 0 24 24" fill="none">
            <Circle cx={12} cy={12} r={10} stroke="#DA9133" strokeWidth={1.5} />
            <Path d="M12 6a2 2 0 00-2 2v4a2 2 0 004 0V8a2 2 0 00-2-2z" stroke="#DA9133" strokeWidth={1.5} strokeLinecap="round" />
            <Path d="M16 11v1a4 4 0 01-8 0v-1M12 16v2" stroke="#DA9133" strokeWidth={1.5} strokeLinecap="round" />
          </Svg>
        </View>
        <Text style={s.modeHeading}>{t("interview_choose_mode")}</Text>
        <Text style={s.modeDesc}>{t("interview_choose_mode_desc")}</Text>

        <View style={s.modeCards}>
          <TouchableOpacity
            style={[s.modeCard, selected === "voice" && s.modeCardSelected]}
            onPress={() => setSelected("voice")}
            activeOpacity={0.8}
          >
            <View style={[s.modeCardIcon, selected === "voice" && s.modeCardIconSelected]}>
              <MicIcon color={selected === "voice" ? "#FFFFFF" : "#DA9133"} />
            </View>
            <Text style={[s.modeCardTitle, selected === "voice" && s.modeCardTitleSelected]}>
              {t("interview_mode_voice")}
            </Text>
            <Text style={s.modeCardDesc}>{t("interview_mode_voice_desc")}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.modeCard, selected === "text" && s.modeCardSelected]}
            onPress={() => setSelected("text")}
            activeOpacity={0.8}
          >
            <View style={[s.modeCardIcon, selected === "text" && s.modeCardIconSelected]}>
              <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
                <Path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" stroke={selected === "text" ? "#FFFFFF" : "#DA9133"} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </View>
            <Text style={[s.modeCardTitle, selected === "text" && s.modeCardTitleSelected]}>
              {t("interview_mode_text")}
            </Text>
            <Text style={s.modeCardDesc}>{t("interview_mode_text_desc")}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={s.modeStartBtn} onPress={() => onSelect(selected)} activeOpacity={0.85}>
          <Text style={s.modeStartBtnText}>{t("interview_start")}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function InterviewScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const { applicationId, providerId } = useLocalSearchParams<{
    applicationId: string;
    providerId: string;
  }>();

  const [mode, setMode] = useState<InterviewMode | null>(null);
  const [interviewState, setInterviewState] = useState<InterviewState>("idle");
  const [transcript, setTranscript] = useState<InterviewMessage[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [muted, setMuted] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [textInput, setTextInput] = useState("");

  const recorder = useAudioRecorder(WAV_RECORDING);
  const scrollRef = useRef<ScrollView>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const animRef = useRef<Animated.CompositeAnimation | null>(null);
  const transcriptRef = useRef<InterviewMessage[]>([]);
  const isRecordingRef = useRef(false);

  useEffect(() => {
    if (initializing || !mode) return;
    const interval = setInterval(() => setElapsed((prev) => prev + 1), 1000);
    return () => clearInterval(interval);
  }, [initializing, mode]);

  const runPulse = useCallback(
    (toValue: number, duration: number) => {
      animRef.current?.stop();
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue, duration: duration / 2, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: duration / 2, useNativeDriver: true }),
        ])
      );
      animRef.current = animation;
      animation.start();
    },
    [pulseAnim]
  );

  useEffect(() => {
    if (mode !== "voice") return;
    switch (interviewState) {
      case "idle": runPulse(1.05, 2000); break;
      case "recording": runPulse(1.3, 800); break;
      case "processing": runPulse(1.1, 1200); break;
      case "playing": runPulse(1.15, 1000); break;
    }
  }, [interviewState, runPulse, mode]);

  const orbColor = () => {
    switch (interviewState) {
      case "recording": return "#DA9133";
      case "playing": return "#8B9A6A";
      default: return "#4C2311";
    }
  };

  const orbLabel = () => {
    switch (interviewState) {
      case "idle": return t("interview_tap_to_speak");
      case "recording": return t("interview_recording");
      case "processing": return t("interview_thinking");
      case "playing": return t("interview_speaking");
    }
  };

  const speakText = useCallback((text: string) => {
    if (mode !== "voice") return;
    setInterviewState("playing");
    Speech.speak(text, {
      language: "en-US",
      pitch: 1.0,
      rate: 0.9,
      onDone: () => setInterviewState("idle"),
      onError: () => setInterviewState("idle"),
    });
  }, [mode]);

  const handleServerResponse = useCallback(
    async (data: Record<string, unknown>) => {
      const aiText = cleanInterviewerText(data.response_text as string);
      const userText = ((data.user_text as string) ?? "").trim();
      const now = new Date().toISOString();

      const newMessages: InterviewMessage[] = [];
      if (userText) newMessages.push({ role: "applicant", content: userText, timestamp: now });
      newMessages.push({ role: "interviewer", content: aiText, timestamp: now });

      const updated = [...transcriptRef.current, ...newMessages];
      transcriptRef.current = updated;
      setTranscript(updated);
      await updateInterviewTranscript(applicationId as string, updated);

      if (mode === "voice") {
        speakText(aiText);
      } else {
        setInterviewState("idle");
      }
    },
    [applicationId, mode, speakText]
  );

  const sendAudioToServer = useCallback(
    async (audioUri: string) => {
      try {
        const base64 = await FileSystem.readAsStringAsync(audioUri, { encoding: "base64" });
        const audioFormat = (audioUri.split(".").pop() ?? "wav").toLowerCase();

        const { data, error } = await supabase.functions.invoke("loan-interview", {
          body: {
            audio_base64: base64,
            audio_format: audioFormat,
            application_id: applicationId,
            provider_id: providerId,
            transcript: [],
          },
        });

        if (error) {
          const msg = error?.message || "Unknown error";
          throw new Error(msg);
        }

        await handleServerResponse(data);
      } catch (err) {
        const detail = err instanceof Error ? err.message : "";
        Alert.alert(t("interview_error"), detail || t("interview_error_msg"));
        setInterviewState("idle");
      }
    },
    [applicationId, providerId, t, handleServerResponse]
  );

  const sendTextToServer = useCallback(
    async (message: string) => {
      if (!message.trim()) return;
      setInterviewState("processing");

      const now = new Date().toISOString();
      const userMsg: InterviewMessage = { role: "applicant", content: message.trim(), timestamp: now };
      const updatedLocal = [...transcriptRef.current, userMsg];
      transcriptRef.current = updatedLocal;
      setTranscript(updatedLocal);

      try {
        const { data, error } = await supabase.functions.invoke("loan-interview", {
          body: {
            text_message: message.trim(),
            application_id: applicationId,
            provider_id: providerId,
            transcript: [],
          },
        });

        if (error) {
          const msg = error?.message || "Unknown error";
          throw new Error(msg);
        }

        const aiText = cleanInterviewerText(data.response_text as string);
        const aiMsg: InterviewMessage = { role: "interviewer", content: aiText, timestamp: new Date().toISOString() };

        const updated = [...transcriptRef.current, aiMsg];
        transcriptRef.current = updated;
        setTranscript(updated);
        await updateInterviewTranscript(applicationId as string, updated);
        setInterviewState("idle");
      } catch (err) {
        const detail = err instanceof Error ? err.message : "";
        Alert.alert(t("interview_error"), detail || t("interview_error_msg"));
        setInterviewState("idle");
      }
    },
    [applicationId, providerId, t]
  );

  const startRecording = useCallback(async () => {
    if (muted) return;
    const { granted } = await requestRecordingPermissionsAsync();
    if (!granted) {
      Alert.alert(t("interview_mic_permission"), t("interview_mic_permission_msg"));
      return;
    }
    try {
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      isRecordingRef.current = true;
      setInterviewState("recording");
    } catch {
      setInterviewState("idle");
    }
  }, [muted, t, recorder]);

  const stopRecording = useCallback(async () => {
    if (!isRecordingRef.current) return;
    isRecordingRef.current = false;
    setInterviewState("processing");
    try {
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false });
      const uri = recorder.uri;
      if (uri) {
        await sendAudioToServer(uri);
      } else {
        Alert.alert(t("interview_error"), t("interview_error_msg"));
        setInterviewState("idle");
      }
    } catch {
      Alert.alert(t("interview_error"), t("interview_error_msg"));
      setInterviewState("idle");
    }
  }, [recorder, sendAudioToServer, t]);

  const initGreeting = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke("loan-interview", {
        body: {
          application_id: applicationId,
          provider_id: providerId,
          transcript: [],
          init: true,
        },
      });

      if (error) {
        const msg = error?.message || "Unknown error";
        throw new Error(msg);
      }

      const aiText = cleanInterviewerText(data.response_text as string);
      const aiMsg: InterviewMessage = {
        role: "interviewer",
        content: aiText,
        timestamp: new Date().toISOString(),
      };

      const updated = [aiMsg];
      transcriptRef.current = updated;
      setTranscript(updated);
      await updateInterviewTranscript(applicationId as string, updated);
      setInitializing(false);

      if (mode === "voice") {
        speakText(aiText);
      } else {
        setInterviewState("idle");
      }
    } catch (err) {
      const detail = err instanceof Error ? err.message : "";
      Alert.alert(t("interview_error"), detail || t("interview_error_msg"));
      setInitializing(false);
    }
  }, [applicationId, providerId, t, speakText, mode]);

  useEffect(() => {
    if (mode) initGreeting();
  }, [mode]);

  useEffect(() => {
    return () => { Speech.stop(); };
  }, []);

  useEffect(() => {
    if (transcript.length > 0) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [transcript.length]);

  const handleDocumentUpload = useCallback(() => {
    Alert.alert(t("interview_upload_document"), undefined, [
      {
        text: t("interview_take_photo"),
        onPress: async () => {
          const result = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.8 });
          if (!result.canceled && result.assets[0]) {
            const asset = result.assets[0];
            try {
              await uploadDocument(applicationId as string, "interview_doc", asset.fileName ?? `photo_${Date.now()}.jpg`, asset.uri);
              Alert.alert(t("interview_document_received"));
            } catch {
              Alert.alert(t("interview_error"), t("interview_error_msg"));
            }
          }
        },
      },
      {
        text: t("interview_choose_file"),
        onPress: async () => {
          const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8 });
          if (!result.canceled && result.assets[0]) {
            const asset = result.assets[0];
            try {
              await uploadDocument(applicationId as string, "interview_doc", asset.fileName ?? `file_${Date.now()}.jpg`, asset.uri);
              Alert.alert(t("interview_document_received"));
            } catch {
              Alert.alert(t("interview_error"), t("interview_error_msg"));
            }
          }
        },
      },
      { text: t("interview_cancel"), style: "cancel" },
    ]);
  }, [applicationId, t]);

  const handleEndInterview = useCallback(async () => {
    try {
      Speech.stop();
      setInterviewState("processing");
      const { error } = await supabase.functions.invoke("loan-interview", {
        body: { application_id: applicationId, provider_id: providerId, transcript: [], end_interview: true },
      });
      if (error) {
        const msg = error?.message || "Unknown error";
        throw new Error(msg);
      }
      router.replace({ pathname: "/loan-apply/decision", params: { applicationId, providerId } });
    } catch (err) {
      const detail = err instanceof Error ? err.message : "";
      Alert.alert(t("interview_error"), detail || t("interview_error_msg"));
      setInterviewState("idle");
    }
  }, [applicationId, providerId, t]);

  const confirmEnd = useCallback(() => {
    Alert.alert(t("interview_end_interview"), t("interview_end_confirm"), [
      { text: t("common_cancel"), style: "cancel" },
      { text: t("interview_end_yes"), onPress: handleEndInterview },
    ]);
  }, [t, handleEndInterview]);

  const handleMicPress = useCallback(() => {
    if (interviewState === "recording") stopRecording();
    else if (interviewState === "idle") startRecording();
  }, [interviewState, startRecording, stopRecording]);

  const handleTextSend = useCallback(() => {
    if (!textInput.trim() || interviewState !== "idle") return;
    const msg = textInput;
    setTextInput("");
    sendTextToServer(msg);
  }, [textInput, interviewState, sendTextToServer]);

  if (!mode) {
    return <ModeSelectionScreen onSelect={setMode} t={t} />;
  }

  const canRecord = !initializing && !muted;

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={[s.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={s.headerBackButton} onPress={() => router.back()} activeOpacity={0.7}>
          <BackArrowIcon />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle} numberOfLines={1}>{t("interview_title")}</Text>
          <Text style={s.headerTimer}>{t("interview_elapsed")} {formatElapsed(elapsed)}</Text>
        </View>
        <TouchableOpacity style={s.endCallButton} onPress={confirmEnd} activeOpacity={0.7}>
          <PhoneOffIcon />
        </TouchableOpacity>
      </View>

      {mode === "voice" && (
        <View style={s.orbContainer}>
          {initializing ? (
            <View style={s.initWrap}>
              <ActivityIndicator color="#DA9133" size="large" />
              <Text style={s.initText}>{t("interview_connecting")}</Text>
            </View>
          ) : (
            <>
              <Animated.View style={[s.orb, { backgroundColor: orbColor(), transform: [{ scale: pulseAnim }] }]}>
                {interviewState === "processing" ? <ActivityIndicator color="#FFFFFF" size="small" /> : <MicIcon />}
              </Animated.View>
              <Text style={s.orbLabel}>{orbLabel()}</Text>
            </>
          )}
        </View>
      )}

      <View style={[s.transcriptContainer, mode === "text" && s.transcriptContainerText]}>
        {initializing && mode === "text" ? (
          <View style={s.textInitWrap}>
            <ActivityIndicator color="#DA9133" size="large" />
            <Text style={s.initText}>{t("interview_connecting")}</Text>
          </View>
        ) : (
          <ScrollView ref={scrollRef} style={s.transcriptScroll} contentContainerStyle={s.transcriptContent} showsVerticalScrollIndicator={false}>
            {transcript.map((msg, index) => (
              <View key={index} style={[s.bubble, msg.role === "interviewer" ? s.aiBubble : s.userBubble]}>
                <Text style={msg.role === "interviewer" ? s.aiBubbleText : s.userBubbleText}>{msg.content}</Text>
              </View>
            ))}
            {interviewState === "processing" && mode === "text" && (
              <View style={[s.bubble, s.aiBubble]}>
                <ActivityIndicator color="#A68A7B" size="small" />
              </View>
            )}
          </ScrollView>
        )}
      </View>

      {mode === "voice" ? (
        <View style={[s.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
          <TouchableOpacity style={s.sideButton} onPress={() => setMuted((prev) => !prev)} activeOpacity={0.7}>
            <MuteIcon muted={muted} />
            <Text style={[s.sideButtonLabel, muted && s.mutedLabel]}>{muted ? t("interview_muted") : t("interview_unmuted")}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.micButton, interviewState === "recording" && s.micButtonRecording, !canRecord && interviewState !== "recording" && s.micButtonDisabled]}
            onPress={handleMicPress}
            activeOpacity={0.8}
            disabled={!canRecord || interviewState === "processing" || interviewState === "playing"}
          >
            <MicIcon />
          </TouchableOpacity>

          <TouchableOpacity style={s.sideButton} onPress={handleDocumentUpload} activeOpacity={0.7}>
            <DocumentIcon />
            <Text style={s.sideButtonLabel}>{t("interview_upload_document")}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={[s.textInputBar, { paddingBottom: insets.bottom + 8 }]}>
          <TouchableOpacity style={s.textDocBtn} onPress={handleDocumentUpload} activeOpacity={0.7}>
            <DocumentIcon />
          </TouchableOpacity>
          <TextInput
            style={s.textField}
            placeholder={t("interview_type_placeholder")}
            placeholderTextColor="#A68A7B"
            value={textInput}
            onChangeText={setTextInput}
            multiline
            maxLength={1000}
            editable={interviewState === "idle" && !initializing}
            onSubmitEditing={handleTextSend}
            blurOnSubmit
          />
          <TouchableOpacity
            style={[s.textSendBtn, (!textInput.trim() || interviewState !== "idle") && s.textSendBtnDisabled]}
            onPress={handleTextSend}
            activeOpacity={0.8}
            disabled={!textInput.trim() || interviewState !== "idle"}
          >
            <SendIcon />
          </TouchableOpacity>
        </View>
      )}

      {interviewState === "recording" && mode === "voice" && (
        <View style={s.recordingHint}>
          <Text style={s.recordingHintText}>{t("interview_tap_to_send")}</Text>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F0EB" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: "#4C2311",
  },
  headerBackButton: {
    width: 42, height: 42, borderRadius: 21,
    borderWidth: 1.5, borderColor: "rgba(255,255,255,0.3)",
    alignItems: "center", justifyContent: "center",
  },
  headerCenter: { flex: 1, alignItems: "center", paddingHorizontal: 12 },
  headerTitle: { fontSize: 17, fontWeight: "700", color: "#FFFFFF" },
  headerTimer: { fontSize: 13, color: "rgba(255,255,255,0.7)", marginTop: 2 },
  endCallButton: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: "#E53935", alignItems: "center", justifyContent: "center",
  },

  modeBody: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  modeIconWrap: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: "#FDF6ED", alignItems: "center", justifyContent: "center", marginBottom: 20,
  },
  modeHeading: { fontSize: 22, fontWeight: "800", color: "#4C2311", marginBottom: 8, textAlign: "center" },
  modeDesc: { fontSize: 14, color: "#A68A7B", textAlign: "center", lineHeight: 20, marginBottom: 32 },
  modeCards: { flexDirection: "row", gap: 14, marginBottom: 32, width: "100%" },
  modeCard: {
    flex: 1, backgroundColor: "#FFFFFF", borderRadius: 18, padding: 20, alignItems: "center",
    borderWidth: 2, borderColor: "#E8DDD5",
  },
  modeCardSelected: { borderColor: "#DA9133", backgroundColor: "#FDF6ED" },
  modeCardIcon: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: "#FDF6ED", alignItems: "center", justifyContent: "center", marginBottom: 12,
  },
  modeCardIconSelected: { backgroundColor: "#DA9133" },
  modeCardTitle: { fontSize: 16, fontWeight: "700", color: "#4C2311", marginBottom: 6 },
  modeCardTitleSelected: { color: "#DA9133" },
  modeCardDesc: { fontSize: 12, color: "#A68A7B", textAlign: "center", lineHeight: 16 },
  modeStartBtn: {
    backgroundColor: "#DA9133", borderRadius: 28, paddingVertical: 16, paddingHorizontal: 48,
  },
  modeStartBtnText: { fontSize: 16, fontWeight: "800", color: "#FFFFFF" },

  orbContainer: { alignItems: "center", justifyContent: "center", paddingVertical: 32 },
  initWrap: { alignItems: "center", gap: 12 },
  initText: { fontSize: 14, color: "#A68A7B", fontWeight: "500" },
  orb: {
    width: 100, height: 100, borderRadius: 50,
    alignItems: "center", justifyContent: "center",
  },
  orbLabel: { marginTop: 14, fontSize: 14, fontWeight: "600", color: "#633E2F" },
  transcriptContainer: {
    flex: 1, marginHorizontal: 16, borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.5)", overflow: "hidden",
  },
  transcriptContainerText: { marginTop: 0 },
  textInitWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  transcriptScroll: { flex: 1 },
  transcriptContent: { padding: 16, gap: 10 },
  bubble: { maxWidth: "80%", paddingVertical: 10, paddingHorizontal: 14, borderRadius: 16 },
  aiBubble: { alignSelf: "flex-start", backgroundColor: "#FFFFFF", borderBottomLeftRadius: 4 },
  userBubble: { alignSelf: "flex-end", backgroundColor: "#DA9133", borderBottomRightRadius: 4 },
  aiBubbleText: { fontSize: 14, color: "#4C2311", lineHeight: 20 },
  userBubbleText: { fontSize: 14, color: "#FFFFFF", lineHeight: 20 },

  bottomBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-around",
    paddingTop: 12, paddingHorizontal: 16,
    backgroundColor: "#FFFFFF", borderTopWidth: 1, borderTopColor: "#D9CCC4",
  },
  sideButton: { alignItems: "center", justifyContent: "center", width: 60 },
  sideButtonLabel: { fontSize: 10, color: "#A68A7B", marginTop: 4, textAlign: "center" },
  mutedLabel: { color: "#E53935" },
  micButton: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: "#DA9133", alignItems: "center", justifyContent: "center",
  },
  micButtonRecording: { backgroundColor: "#E53935" },
  micButtonDisabled: { opacity: 0.5 },

  textInputBar: {
    flexDirection: "row", alignItems: "flex-end", gap: 8,
    paddingTop: 10, paddingHorizontal: 12,
    backgroundColor: "#FFFFFF", borderTopWidth: 1, borderTopColor: "#D9CCC4",
  },
  textDocBtn: {
    width: 42, height: 42, borderRadius: 21,
    alignItems: "center", justifyContent: "center",
  },
  textField: {
    flex: 1, minHeight: 42, maxHeight: 100,
    backgroundColor: "#F7F0EB", borderRadius: 21,
    paddingHorizontal: 16, paddingVertical: 10,
    fontSize: 15, color: "#4C2311",
  },
  textSendBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: "#DA9133", alignItems: "center", justifyContent: "center",
  },
  textSendBtnDisabled: { opacity: 0.4 },

  recordingHint: {
    position: "absolute", bottom: 140, alignSelf: "center",
    backgroundColor: "rgba(76,35,17,0.9)",
    paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20,
  },
  recordingHintText: { fontSize: 13, color: "#FFFFFF", fontWeight: "600" },
});
