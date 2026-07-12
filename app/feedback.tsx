import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
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

function RightArrow() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 12h14M12 5l7 7-7 7"
        stroke="#FFFFFF"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function SmileyFace() {
  return (
    <Svg width={80} height={80} viewBox="0 0 80 80" fill="none">
      <Circle cx={40} cy={40} r={40} fill="#DA9133" />
      <Circle cx={28} cy={32} r={4} fill="#FFFFFF" />
      <Circle cx={52} cy={32} r={4} fill="#FFFFFF" />
      <Path
        d="M26 48c4 6 10 10 14 10s10-4 14-10"
        stroke="#FFFFFF"
        strokeWidth={3}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export default function FeedbackScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const categories = [
    { key: "PERFORMANCE", label: t("feedback_performance") },
    { key: "BUG", label: t("feedback_bug") },
    { key: "USER EXPERIENCE", label: t("feedback_ux") },
    { key: "CRASHES", label: t("feedback_crashes") },
    { key: "LOADING", label: t("feedback_loading") },
    { key: "SUPPORT", label: t("feedback_support") },
    { key: "NAVIGATION", label: t("feedback_navigation") },
  ];

  const toggleCategory = (key: string) => {
    setSelectedCategories((prev) =>
      prev.includes(key)
        ? prev.filter((c) => c !== key)
        : [...prev, key]
    );
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
          <Text style={styles.headerTitle}>{t("feedback_title")}</Text>
          <View style={{ width: 40 }} />
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.iconContainer}>
          <SmileyFace />
        </View>

        <Text style={styles.heading}>{t("feedback_heading")}</Text>

        <View style={styles.categoriesContainer}>
          {categories.map((category) => {
            const isSelected = selectedCategories.includes(category.key);
            return (
              <TouchableOpacity
                key={category.key}
                style={[styles.pill, isSelected && styles.pillSelected]}
                onPress={() => toggleCategory(category.key)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.pillText,
                    isSelected && styles.pillTextSelected,
                  ]}
                >
                  {category.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <View style={[styles.bottomContainer, { paddingBottom: insets.bottom + 20 }]}>
        <TouchableOpacity style={styles.submitButton} activeOpacity={0.7}>
          <Text style={styles.submitButtonText}>{t("feedback_submit")}</Text>
          <RightArrow />
        </TouchableOpacity>
      </View>
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
    paddingBottom: 40,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
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
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 20,
  },
  iconContainer: {
    alignItems: "center",
    marginBottom: 28,
  },
  heading: {
    fontSize: 22,
    fontWeight: "700",
    color: "#4C2311",
    textAlign: "center",
    marginBottom: 28,
  },
  categoriesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "center",
  },
  pill: {
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: "#E4D9D1",
    backgroundColor: "#FFFFFF",
  },
  pillSelected: {
    backgroundColor: "#DA9133",
    borderColor: "#DA9133",
  },
  pillText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4C2311",
  },
  pillTextSelected: {
    color: "#FFFFFF",
  },
  bottomContainer: {
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4C2311",
    borderRadius: 28,
    paddingVertical: 18,
    gap: 10,
    shadowColor: "#4C2311",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
