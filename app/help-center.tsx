import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import Svg, { Path, Circle } from "react-native-svg";
import { useLanguage } from "@/lib/i18n";


function BackArrow() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M15 18l-6-6 6-6"
        stroke="#FFFFFF"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function SearchIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Circle cx={11} cy={11} r={7} stroke="#A68A7B" strokeWidth={2} />
      <Path
        d="M16 16l4 4"
        stroke="#A68A7B"
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function ChevronUp() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M18 15l-6-6-6 6"
        stroke="#FFFFFF"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ChevronDown() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6 9l6 6 6-6"
        stroke="#4C2311"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ChatIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z"
        stroke="#FFFFFF"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export default function HelpCenterScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<"faq" | "chat">("faq");
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);
  const [searchQuery, setSearchQuery] = useState("");

  const faqData = [
    { question: t("help_faq_q1"), answer: t("help_faq_a1") },
    { question: t("help_faq_q2"), answer: t("help_faq_a2") },
    { question: t("help_faq_q3"), answer: t("help_faq_a3") },
    { question: t("help_faq_q4"), answer: t("help_faq_a4") },
    { question: t("help_faq_q5"), answer: t("help_faq_a5") },
    { question: t("help_faq_q6"), answer: t("help_faq_a6") },
  ];

  const toggleExpanded = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <BackArrow />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t("help_title")}</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === "faq" && styles.tabActive]}
            onPress={() => setActiveTab("faq")}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "faq" && styles.tabTextActive,
              ]}
            >
              {t("help_faq")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === "chat" && styles.tabActive]}
            onPress={() => setActiveTab("chat")}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "chat" && styles.tabTextActive,
              ]}
            >
              {t("help_live_chat")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {activeTab === "faq" ? (
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.searchBar}>
            <SearchIcon />
            <TextInput
              style={styles.searchInput}
              placeholder={t("help_search_placeholder")}
              placeholderTextColor="#A68A7B"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {faqData.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.faqCard,
                expandedIndex === index && styles.faqCardExpanded,
              ]}
              onPress={() => toggleExpanded(index)}
              activeOpacity={0.7}
            >
              <View style={styles.faqHeader}>
                <Text
                  style={[
                    styles.faqQuestion,
                    expandedIndex === index && styles.faqQuestionExpanded,
                  ]}
                >
                  {item.question}
                </Text>
                {expandedIndex === index ? <ChevronUp /> : <ChevronDown />}
              </View>
              {expandedIndex === index && (
                <Text style={styles.faqAnswer}>{item.answer}</Text>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : (
        <View style={styles.chatContent}>
          <View style={styles.chatIllustration}>
            <View style={styles.chatCircle} />
          </View>
          <Text style={styles.chatTitle}>
            {t("help_chat_heading")}
          </Text>
          <Text style={styles.chatSubtitle}>
            {t("help_chat_sub")}
          </Text>
          <TouchableOpacity style={styles.chatButton} activeOpacity={0.7}>
            <ChatIcon />
            <Text style={styles.chatButtonText}>{t("help_live_chat")}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F0EB",
  },
  header: {
    backgroundColor: "#4C2311",
    paddingBottom: 20,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  tabContainer: {
    flexDirection: "row",
    marginHorizontal: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 28,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 24,
  },
  tabActive: {
    backgroundColor: "#FFFFFF",
  },
  tabText: {
    fontSize: 15,
    fontWeight: "600",
    color: "rgba(255,255,255,0.6)",
  },
  tabTextActive: {
    color: "#4C2311",
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
    shadowColor: "#4C2311",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#4C2311",
    marginLeft: 10,
    padding: 0,
  },
  faqCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
    marginBottom: 10,
    shadowColor: "#4C2311",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  faqCardExpanded: {
    backgroundColor: "#4C2311",
  },
  faqHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  faqQuestion: {
    fontSize: 15,
    fontWeight: "600",
    color: "#4C2311",
    flex: 1,
    marginRight: 12,
  },
  faqQuestionExpanded: {
    color: "#FFFFFF",
  },
  faqAnswer: {
    fontSize: 14,
    color: "rgba(255,255,255,0.85)",
    lineHeight: 22,
    marginTop: 14,
  },
  chatContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  chatIllustration: {
    marginBottom: 32,
  },
  chatCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "#D9CCC4",
  },
  chatTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#4C2311",
    textAlign: "center",
    marginBottom: 10,
  },
  chatSubtitle: {
    fontSize: 14,
    color: "#A68A7B",
    textAlign: "center",
    marginBottom: 32,
  },
  chatButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#DA9133",
    borderRadius: 28,
    paddingVertical: 16,
    paddingHorizontal: 32,
    gap: 10,
  },
  chatButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
