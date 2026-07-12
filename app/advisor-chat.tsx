import { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import Svg, { Path, Circle } from "react-native-svg";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import { translate } from "@/lib/sunbird";

interface Message {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

function BackArrowIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M19 12H5M12 19l-7-7 7-7" stroke="#4C2311" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function PersonIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={12} cy={7} r={4} stroke="#FFFFFF" strokeWidth={2} />
    </Svg>
  );
}

function SparklesIcon({ size = 16, color = "#FFFFFF" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 2l2.09 6.26L20 10l-5.91 1.74L12 18l-2.09-6.26L4 10l5.91-1.74L12 2z" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M5 3l.5 1.5L7 5l-1.5.5L5 7l-.5-1.5L3 5l1.5-.5L5 3z" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function SendIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function TranslateIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Path d="M5 8l7 8M12 8l-7 8M2 12h20M12 2a10 10 0 110 20 10 10 0 010-20z" stroke="#DA9133" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function CreditIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="#8B9A6A" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function CompareIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" stroke="#DA9133" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function BudgetIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M2 5a2 2 0 012-2h16a2 2 0 012 2v14a2 2 0 01-2 2H4a2 2 0 01-2-2V5zM2 10h20" stroke="#1565C0" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function EligibilityIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M22 11.08V12a10 10 0 11-5.93-9.14" stroke="#E65100" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M22 4L12 14.01l-3-3" stroke="#E65100" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

const QUICK_ACTIONS = [
  { labelKey: "chat_improve_credit", icon: <CreditIcon /> },
  { labelKey: "chat_compare_providers", icon: <CompareIcon /> },
  { labelKey: "chat_help_budget", icon: <BudgetIcon /> },
  { labelKey: "chat_check_eligibility", icon: <EligibilityIcon /> },
];

function TypingIndicator() {
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animate = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0.3, duration: 400, useNativeDriver: true }),
        ])
      );
    const a1 = animate(dot1, 0);
    const a2 = animate(dot2, 200);
    const a3 = animate(dot3, 400);
    a1.start();
    a2.start();
    a3.start();
    return () => { a1.stop(); a2.stop(); a3.stop(); };
  }, [dot1, dot2, dot3]);

  return (
    <View style={s.typingRow}>
      <View style={s.aiAvatar}>
        <SparklesIcon />
      </View>
      <View style={s.typingBubble}>
        <Animated.View style={[s.typingDot, { opacity: dot1 }]} />
        <Animated.View style={[s.typingDot, { opacity: dot2 }]} />
        <Animated.View style={[s.typingDot, { opacity: dot3 }]} />
      </View>
    </View>
  );
}

function DateSeparator({ label }: { label: string }) {
  return (
    <View style={s.dateSeparator}>
      <View style={s.dateLine} />
      <Text style={s.dateLabel}>{label}</Text>
      <View style={s.dateLine} />
    </View>
  );
}

function getDateLabel(dateStr: string, t: (key: string) => string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);
  if (diffDays === 0) return t("common_today");
  if (diffDays === 1) return t("common_yesterday");
  return date.toLocaleDateString("en-UG", { month: "short", day: "numeric", year: "numeric" });
}

function shouldShowDate(messages: Message[], index: number): boolean {
  if (index === 0) return true;
  const current = new Date(messages[index]!.created_at);
  const previous = new Date(messages[index - 1]!.created_at);
  return current.toDateString() !== previous.toDateString();
}

export default function AdvisorChatScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { session } = useAuth();
  const { language, t } = useLanguage();

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>(id);
  const [translations, setTranslations] = useState<Map<string, string>>(new Map());
  const [translating, setTranslating] = useState<Set<string>>(new Set());

  const flatListRef = useRef<FlatList<Message>>(null);

  useEffect(() => {
    if (!conversationId) return;
    (async () => {
      const { data } = await supabase
        .from("ai_messages")
        .select("id, conversation_id, role, content, created_at")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      if (data) setMessages(data as Message[]);
    })();
  }, [conversationId]);

  const scrollToEnd = useCallback(() => {
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || !session) return;
    const trimmed = text.trim();
    setInputText("");

    const userMessage: Message = {
      id: `temp-${Date.now()}`,
      conversation_id: conversationId ?? "",
      role: "user",
      content: trimmed,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    scrollToEnd();
    setIsTyping(true);

    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/ai-advisor`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${currentSession?.access_token}`,
          },
          body: JSON.stringify({ message: trimmed, conversation_id: conversationId }),
        }
      );

      const result = await response.json();

      if (!response.ok || result.error) {
        throw new Error(result.error ?? "Failed to get response");
      }

      if (result.is_new && result.conversation_id) {
        setConversationId(result.conversation_id);
      }

      const aiMessage: Message = {
        id: `ai-${Date.now()}`,
        conversation_id: result.conversation_id ?? conversationId ?? "",
        role: "assistant",
        content: result.response,
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, aiMessage]);
      scrollToEnd();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Something went wrong";
      Alert.alert(t("chat_connection_error"), errorMsg, [{ text: t("common_ok") }]);
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        conversation_id: conversationId ?? "",
        role: "assistant",
        content: t("chat_trouble_connecting"),
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      scrollToEnd();
    } finally {
      setIsTyping(false);
    }
  }, [session, conversationId, scrollToEnd]);

  const handleTranslate = useCallback(async (messageId: string, content: string) => {
    if (translations.has(messageId)) {
      setTranslations((prev) => {
        const next = new Map(prev);
        next.delete(messageId);
        return next;
      });
      return;
    }

    if (language === "eng") {
      Alert.alert(t("chat_language_required"), t("chat_select_language"), [{ text: t("common_ok") }]);
      return;
    }

    setTranslating((prev) => new Set(prev).add(messageId));
    try {
      const translated = await translate(content, "eng", language);
      setTranslations((prev) => {
        const next = new Map(prev);
        next.set(messageId, translated);
        return next;
      });
    } catch {
      Alert.alert(t("chat_translation_failed"), t("chat_translation_failed_msg"));
    } finally {
      setTranslating((prev) => {
        const next = new Set(prev);
        next.delete(messageId);
        return next;
      });
    }
  }, [language, translations]);

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isUser = item.role === "user";
    const showDate = shouldShowDate(messages, index);
    const isTranslating = translating.has(item.id);

    return (
      <View>
        {showDate && <DateSeparator label={getDateLabel(item.created_at, t)} />}
        {isUser ? (
          <View style={s.userRow}>
            <View style={s.userBubble}>
              <Text style={s.userText}>{item.content}</Text>
            </View>
            <View style={s.userAvatar}>
              <PersonIcon />
            </View>
          </View>
        ) : (
          <View style={s.aiRow}>
            <View style={s.aiAvatar}>
              <SparklesIcon />
            </View>
            <View style={s.aiBubbleWrap}>
              <View style={s.aiBubble}>
                <Text style={s.aiText}>{item.content}</Text>
              </View>
              {translations.has(item.id) && (
                <View style={s.translatedBubble}>
                  <Text style={s.translatedText}>{translations.get(item.id)}</Text>
                </View>
              )}
              <TouchableOpacity
                style={s.translateButton}
                onPress={() => handleTranslate(item.id, item.content)}
                activeOpacity={0.6}
                disabled={isTranslating}
              >
                {isTranslating ? (
                  <ActivityIndicator size="small" color="#DA9133" />
                ) : (
                  <TranslateIcon />
                )}
                <Text style={s.translateText}>
                  {isTranslating
                    ? t("chat_translating")
                    : translations.has(item.id)
                      ? t("chat_hide_translation")
                      : t("chat_translate")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  };

  const isNewConversation = messages.length === 0 && !isTyping;

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
    >
      <View style={[s.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={s.backButton} onPress={() => router.back()} activeOpacity={0.7}>
          <BackArrowIcon />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{t("chat_title")}</Text>
        <View style={{ width: 42 }} />
      </View>

      <View style={s.chatArea}>
        {isNewConversation ? (
          <View style={s.emptyState}>
            <View style={s.emptyTop}>
              <View style={s.emptyAiAvatar}>
                <SparklesIcon size={28} />
              </View>
              <Text style={s.emptyTitle}>{t("chat_how_help")}</Text>
              <Text style={s.emptySubtitle}>
                {t("chat_ask_about")}
              </Text>
            </View>
            <View style={s.chipsGrid}>
              {QUICK_ACTIONS.map((action) => (
                <TouchableOpacity
                  key={action.labelKey}
                  style={s.chip}
                  onPress={() => sendMessage(t(action.labelKey))}
                  activeOpacity={0.7}
                >
                  <View style={s.chipIcon}>{action.icon}</View>
                  <Text style={s.chipText}>{t(action.labelKey)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            contentContainerStyle={s.messageList}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={scrollToEnd}
            ListFooterComponent={isTyping ? <TypingIndicator /> : null}
          />
        )}
      </View>

      <View style={[s.inputBar, { paddingBottom: insets.bottom || 12 }]}>
        <View style={s.inputRow}>
          <View style={s.inputWrapper}>
            <TextInput
              style={s.textInput}
              placeholder={t("chat_type_placeholder")}
              placeholderTextColor="#A68A7B"
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={1000}
              returnKeyType="default"
            />
          </View>
          <TouchableOpacity
            style={[s.sendButton, !inputText.trim() && s.sendButtonDisabled]}
            onPress={() => sendMessage(inputText)}
            disabled={!inputText.trim() || isTyping}
            activeOpacity={0.7}
          >
            <SendIcon />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F0EB",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F0E8E2",
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1.5,
    borderColor: "#D9CCC4",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#4C2311",
  },
  chatArea: {
    flex: 1,
  },
  messageList: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },
  userRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "flex-end",
    marginBottom: 16,
    gap: 8,
  },
  userBubble: {
    backgroundColor: "#DA9133",
    borderRadius: 20,
    borderBottomRightRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxWidth: "72%",
  },
  userText: {
    fontSize: 15,
    color: "#FFFFFF",
    lineHeight: 22,
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#633E2F",
    alignItems: "center",
    justifyContent: "center",
  },
  aiRow: {
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "flex-start",
    marginBottom: 16,
    gap: 8,
  },
  aiAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#8B9A6A",
    alignItems: "center",
    justifyContent: "center",
  },
  aiBubbleWrap: {
    maxWidth: "72%",
  },
  aiBubble: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  aiText: {
    fontSize: 15,
    color: "#4C2311",
    lineHeight: 22,
  },
  translatedBubble: {
    backgroundColor: "#F0E8E2",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 6,
  },
  translatedText: {
    fontSize: 14,
    color: "#633E2F",
    lineHeight: 20,
    fontStyle: "italic",
  },
  translateButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
    paddingVertical: 2,
  },
  translateText: {
    fontSize: 13,
    color: "#DA9133",
    fontWeight: "600",
  },
  dateSeparator: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
  },
  dateLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#D9CCC4",
  },
  dateLabel: {
    fontSize: 12,
    color: "#A68A7B",
    fontWeight: "600",
    marginHorizontal: 12,
  },
  typingRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    marginBottom: 16,
  },
  typingBubble: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 6,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#A68A7B",
  },
  emptyState: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 24,
  },
  emptyTop: {
    alignItems: "center",
  },
  emptyAiAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#8B9A6A",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#4C2311",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#A68A7B",
    textAlign: "center",
    lineHeight: 20,
  },
  chipsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  chip: {
    width: "47%",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D9CCC4",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 16,
    gap: 8,
  },
  chipIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F7F0EB",
    alignItems: "center",
    justifyContent: "center",
  },
  chipText: {
    fontSize: 13,
    color: "#4C2311",
    fontWeight: "600",
    lineHeight: 18,
  },
  inputBar: {
    backgroundColor: "#FFFFFF",
    paddingTop: 10,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: "#F0E8E2",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: "#F7F0EB",
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: Platform.OS === "ios" ? 12 : 8,
    maxHeight: 120,
  },
  textInput: {
    fontSize: 15,
    color: "#4C2311",
    padding: 0,
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#DA9133",
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
});
