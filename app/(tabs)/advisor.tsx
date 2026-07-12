import { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path, Circle, Rect, ClipPath, Defs, G } from "react-native-svg";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
}

const AVATAR_PALETTES = [
  { bg: "#8B9A6A", accent: "#C5CFA8" },
  { bg: "#4C2311", accent: "#DA9133" },
  { bg: "#C5CFA8", accent: "#8B9A6A" },
  { bg: "#A3B87C", accent: "#4C2311" },
];

const TOPIC_TAGS = ["Finance", "Loans", "Savings", "Credit"];

type SortOption = "newest" | "oldest" | "most_messages";
const SORT_KEYS: Record<SortOption, string> = {
  newest: "advisor_newest",
  oldest: "advisor_oldest",
  most_messages: "advisor_most_messages",
};

function CrescentIcon({ size = 24 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Defs>
        <ClipPath id="crescent">
          <Circle cx={12} cy={12} r={10} />
        </ClipPath>
      </Defs>
      <Circle cx={12} cy={12} r={10} fill="rgba(255,255,255,0.15)" />
      <Circle
        cx={16}
        cy={8}
        r={9}
        fill="#4C2311"
        clipPath="url(#crescent)"
      />
    </Svg>
  );
}

function ChatBubbleIcon({ size = 16, color = "#FFFFFF" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function MessageSquareIcon({ size = 16, color = "#FFFFFF" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function SmallChatIcon({ size = 14, color = "#A68A7B" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function MoreDotsIcon({ size = 20, color = "#A68A7B" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={5} r={1.5} fill={color} />
      <Circle cx={12} cy={12} r={1.5} fill={color} />
      <Circle cx={12} cy={19} r={1.5} fill={color} />
    </Svg>
  );
}

function ChevronDownIcon({ size = 14, color = "#A68A7B" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6 9l6 6 6-6"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function PlusIcon({ size = 24, color = "#FFFFFF" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 5v14M5 12h14"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function SparklesIcon({ size = 48, color = "#8B9A6A" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2l2.09 6.26L20 10l-5.91 1.74L12 18l-2.09-6.26L4 10l5.91-1.74L12 2z"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M5 3l.5 1.5L7 5l-1.5.5L5 7l-.5-1.5L3 5l1.5-.5L5 3z"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M19 17l.5 1.5L21 19l-1.5.5L19 21l-.5-1.5L17 19l1.5-.5L19 17z"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function GeometricAvatar({ index, size = 60 }: { index: number; size?: number }) {
  const palette = AVATAR_PALETTES[index % AVATAR_PALETTES.length]!;
  const r = size / 2;
  const pattern = index % 4;

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Defs>
        <ClipPath id={`avatarClip${index}`}>
          <Circle cx={r} cy={r} r={r} />
        </ClipPath>
      </Defs>
      <G clipPath={`url(#avatarClip${index})`}>
        <Rect x={0} y={0} width={size} height={size} fill={palette.bg} />
        {pattern === 0 && (
          <>
            <Circle cx={r * 0.6} cy={r * 0.5} r={r * 0.35} fill={palette.accent} opacity={0.6} />
            <Circle cx={r * 1.4} cy={r * 1.3} r={r * 0.5} fill={palette.accent} opacity={0.4} />
            <Rect x={r * 0.2} y={r * 1.2} width={r * 0.8} height={r * 0.3} rx={4} fill={palette.accent} opacity={0.5} />
          </>
        )}
        {pattern === 1 && (
          <>
            <Rect x={r * 0.3} y={r * 0.3} width={r * 0.8} height={r * 0.8} rx={6} fill={palette.accent} opacity={0.5} />
            <Circle cx={r * 1.3} cy={r * 0.7} r={r * 0.3} fill={palette.accent} opacity={0.4} />
            <Rect x={r * 0.8} y={r * 1.2} width={r * 0.9} height={r * 0.4} rx={4} fill={palette.accent} opacity={0.6} />
          </>
        )}
        {pattern === 2 && (
          <>
            <Path
              d={`M${r * 0.2} ${r * 1.6} L${r} ${r * 0.4} L${r * 1.8} ${r * 1.6} Z`}
              fill={palette.accent}
              opacity={0.5}
            />
            <Circle cx={r} cy={r * 1.1} r={r * 0.25} fill={palette.accent} opacity={0.7} />
          </>
        )}
        {pattern === 3 && (
          <>
            <Circle cx={r * 0.5} cy={r * 0.6} r={r * 0.25} fill={palette.accent} opacity={0.5} />
            <Circle cx={r * 1.5} cy={r * 0.6} r={r * 0.25} fill={palette.accent} opacity={0.5} />
            <Circle cx={r} cy={r * 1.2} r={r * 0.35} fill={palette.accent} opacity={0.4} />
            <Rect x={r * 0.3} y={r * 1.5} width={r * 1.4} height={r * 0.15} rx={3} fill={palette.accent} opacity={0.3} />
          </>
        )}
      </G>
    </Svg>
  );
}

function EmptyState({ onStart }: { onStart: () => void }) {
  const { t } = useLanguage();

  return (
    <View style={s.emptyContainer}>
      <View style={s.emptyIconWrap}>
        <SparklesIcon size={56} color="#8B9A6A" />
      </View>
      <Text style={s.emptyTitle}>{t("advisor_no_conversations")}</Text>
      <Text style={s.emptySubtitle}>
        {t("advisor_start_chatting")}
      </Text>
      <TouchableOpacity style={s.emptyButton} activeOpacity={0.8} onPress={onStart}>
        <Text style={s.emptyButtonText}>{t("advisor_start_conversation")}</Text>
      </TouchableOpacity>
    </View>
  );
}

function ConversationCard({
  conversation,
  index,
  onPress,
}: {
  conversation: Conversation;
  index: number;
  onPress: () => void;
}) {
  const { t } = useLanguage();
  const tag = TOPIC_TAGS[index % TOPIC_TAGS.length];

  return (
    <TouchableOpacity style={s.card} activeOpacity={0.7} onPress={onPress}>
      <GeometricAvatar index={index} size={60} />
      <View style={s.cardCenter}>
        <Text style={s.cardTitle} numberOfLines={1}>
          {conversation.title}
        </Text>
        <View style={s.cardMeta}>
          <View style={s.cardMetaBadge}>
            <SmallChatIcon size={12} color="#A68A7B" />
            <Text style={s.cardMetaText}>
              {conversation.message_count} {t("advisor_messages")}
            </Text>
          </View>
          <View style={s.cardTag}>
            <Text style={s.cardTagText}>{tag}</Text>
          </View>
        </View>
      </View>
      <TouchableOpacity hitSlop={12} style={s.cardMore}>
        <MoreDotsIcon size={20} color="#A68A7B" />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

export default function AdvisorScreen() {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const { t } = useLanguage();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [showSortMenu, setShowSortMenu] = useState(false);

  const fetchConversations = useCallback(async () => {
    if (!session?.user.id) return;

    const { data: convos } = await supabase
      .from("ai_conversations")
      .select("id, title, created_at, updated_at")
      .eq("user_id", session.user.id)
      .order("updated_at", { ascending: false });

    if (!convos || convos.length === 0) {
      setConversations([]);
      return;
    }

    const convoIds = convos.map((c) => c.id);
    const { data: messageCounts } = await supabase
      .from("ai_messages")
      .select("conversation_id")
      .in("conversation_id", convoIds);

    const countMap: Record<string, number> = {};
    if (messageCounts) {
      for (const msg of messageCounts) {
        countMap[msg.conversation_id] = (countMap[msg.conversation_id] || 0) + 1;
      }
    }

    setConversations(
      convos.map((c) => ({
        ...c,
        message_count: countMap[c.id] || 0,
      }))
    );
  }, [session?.user.id]);

  useEffect(() => {
    fetchConversations().finally(() => setLoading(false));
  }, [fetchConversations]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchConversations();
    setRefreshing(false);
  }, [fetchConversations]);

  const sorted = useMemo(() => {
    const list = [...conversations];
    switch (sortBy) {
      case "newest":
        return list.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      case "oldest":
        return list.sort((a, b) => new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime());
      case "most_messages":
        return list.sort((a, b) => b.message_count - a.message_count);
    }
  }, [conversations, sortBy]);

  const totalCount = conversations.length;

  const thisMonthCount = conversations.filter((c) => {
    const d = new Date(c.created_at);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const handleNewConversation = () => {
    router.push("/advisor-chat");
  };

  const handleOpenConversation = (conversation: Conversation) => {
    router.push({ pathname: "/advisor-chat", params: { id: conversation.id } });
  };

  return (
    <View style={s.screen}>
      <View style={[s.header, { paddingTop: insets.top + 16 }]}>
        <View style={s.crescentWrap}>
          <CrescentIcon size={28} />
        </View>
        <Text style={s.headerTitle}>{t("advisor_title")}</Text>
        <View style={s.statRow}>
          <View style={s.statBadge}>
            <ChatBubbleIcon size={14} color="rgba(255,255,255,0.9)" />
            <Text style={s.statText}>{totalCount} {t("advisor_total")}</Text>
          </View>
          <View style={s.statBadge}>
            <MessageSquareIcon size={14} color="rgba(255,255,255,0.9)" />
            <Text style={s.statText}>{thisMonthCount} {t("advisor_this_month")}</Text>
          </View>
        </View>
      </View>

      <View style={s.body}>
        {loading ? (
          <View style={s.loadingWrap}>
            <ActivityIndicator size="large" color="#4C2311" />
          </View>
        ) : conversations.length === 0 ? (
          <EmptyState onStart={handleNewConversation} />
        ) : (
          <>
            <View style={s.listHeader}>
              <Text style={s.listHeaderTitle}>{t("advisor_recent")} ({conversations.length})</Text>
              <TouchableOpacity
                style={s.newestBadge}
                activeOpacity={0.7}
                onPress={() => setShowSortMenu(true)}
              >
                <Text style={s.newestText}>{t(SORT_KEYS[sortBy])}</Text>
                <ChevronDownIcon size={12} color="#A68A7B" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={sorted}
              keyExtractor={(item) => item.id}
              renderItem={({ item, index }) => (
                <ConversationCard
                  conversation={item}
                  index={index}
                  onPress={() => handleOpenConversation(item)}
                />
              )}
              contentContainerStyle={[
                s.listContent,
                { paddingBottom: insets.bottom + 80 },
              ]}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor="#4C2311"
                  colors={["#4C2311"]}
                />
              }
            />
          </>
        )}
      </View>

      <TouchableOpacity
        style={[s.fab, { bottom: insets.bottom + 24 }]}
        activeOpacity={0.85}
        onPress={handleNewConversation}
      >
        <PlusIcon size={26} color="#FFFFFF" />
      </TouchableOpacity>

      <Modal visible={showSortMenu} transparent animationType="fade">
        <Pressable style={s.sortOverlay} onPress={() => setShowSortMenu(false)}>
          <View style={s.sortMenu}>
            {(["newest", "oldest", "most_messages"] as SortOption[]).map((option) => (
              <TouchableOpacity
                key={option}
                style={[s.sortOption, sortBy === option && s.sortOptionActive]}
                activeOpacity={0.7}
                onPress={() => {
                  setSortBy(option);
                  setShowSortMenu(false);
                }}
              >
                <Text style={[s.sortOptionText, sortBy === option && s.sortOptionTextActive]}>
                  {t(SORT_KEYS[option])}
                </Text>
                {sortBy === option && (
                  <View style={s.sortCheck}>
                    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                      <Path d="M20 6L9 17l-5-5" stroke="#DA9133" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
                    </Svg>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F7F0EB",
  },
  header: {
    backgroundColor: "#4C2311",
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    paddingHorizontal: 24,
    paddingBottom: 28,
  },
  crescentWrap: {
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 30,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 16,
  },
  statRow: {
    flexDirection: "row",
    gap: 12,
  },
  statBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statText: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(255,255,255,0.9)",
  },
  body: {
    flex: 1,
  },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 12,
  },
  listHeaderTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#4C2311",
  },
  newestBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#D9CCC4",
  },
  newestText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#A68A7B",
  },
  listContent: {
    paddingHorizontal: 24,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    gap: 14,
  },
  cardCenter: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#4C2311",
    marginBottom: 8,
  },
  cardMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cardMetaBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F7F0EB",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  cardMetaText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#A68A7B",
  },
  cardTag: {
    backgroundColor: "#EDF2E0",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  cardTagText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#8B9A6A",
  },
  cardMore: {
    padding: 4,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  emptyIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#EDF2E0",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#4C2311",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: "#A68A7B",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 28,
  },
  emptyButton: {
    backgroundColor: "#4C2311",
    borderRadius: 24,
    paddingHorizontal: 28,
    paddingVertical: 14,
  },
  emptyButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  fab: {
    position: "absolute",
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#DA9133",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#DA9133",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
  sortOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  sortMenu: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingVertical: 8,
    width: "100%",
    maxWidth: 280,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  sortOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sortOptionActive: {
    backgroundColor: "#FDF6ED",
  },
  sortOptionText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#4C2311",
  },
  sortOptionTextActive: {
    color: "#DA9133",
  },
  sortCheck: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
});
