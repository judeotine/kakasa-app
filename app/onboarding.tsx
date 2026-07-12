import { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
  Dimensions,
  Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path, Circle } from "react-native-svg";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";

const TOTAL_STEPS = 7;
const { width: SCREEN_W } = Dimensions.get("window");

function BackIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M19 12H5M12 19l-7-7 7-7"
        stroke="#4C2311"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function BriefcaseIcon() {
  return (
    <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
      <Path d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z" stroke="#4C2311" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" stroke="#4C2311" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function BookOpenIcon() {
  return (
    <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
      <Path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2zM22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" stroke="#4C2311" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function HeartPulseIcon() {
  return (
    <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
      <Path d="M20.42 4.58a5.4 5.4 0 00-7.65 0L12 5.34l-.77-.76a5.4 5.4 0 00-7.65 7.65l.77.76L12 20.64l7.65-7.65.77-.76a5.4 5.4 0 000-7.65z" stroke="#4C2311" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M12 10v4M10 12h4" stroke="#4C2311" strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}

function PersonIcon() {
  return (
    <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
      <Path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" stroke="#4C2311" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={12} cy={7} r={4} stroke="#4C2311" strokeWidth={1.5} />
    </Svg>
  );
}

function SproutIcon() {
  return (
    <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
      <Path d="M7 20h10M12 20v-6" stroke="#4C2311" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M12 14c-2.4-3.5-6-4-6-4s-.5 4 2 7M12 14c2.4-3.5 6-4 6-4s.5 4-2 7" stroke="#4C2311" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function HomeIcon() {
  return (
    <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
      <Path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke="#4C2311" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M9 22V12h6v10" stroke="#4C2311" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function TieIcon() {
  return (
    <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
      <Path d="M12 2l3 4-3 14-3-14 3-4zM9 6h6" stroke="#4C2311" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function StorefrontIcon() {
  return (
    <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
      <Path d="M3 9l1.5-5h15L21 9M3 9v11a1 1 0 001 1h16a1 1 0 001-1V9M3 9h18" stroke="#4C2311" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M9 21v-6h6v6" stroke="#4C2311" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function TrendUpIcon() {
  return (
    <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
      <Path d="M23 6l-9.5 9.5-5-5L1 18" stroke="#4C2311" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M17 6h6v6" stroke="#4C2311" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function GradCapIcon() {
  return (
    <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
      <Path d="M22 10l-10-5L2 10l10 5 10-5z" stroke="#4C2311" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M6 12v5c0 2 3 4 6 4s6-2 6-4v-5" stroke="#4C2311" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function CheckCircleIcon() {
  return (
    <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={10} stroke="#4C2311" strokeWidth={1.5} />
      <Path d="M9 12l2 2 4-4" stroke="#4C2311" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function XCircleIcon() {
  return (
    <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={10} stroke="#4C2311" strokeWidth={1.5} />
      <Path d="M15 9l-6 6M9 9l6 6" stroke="#4C2311" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function PurposeIcon({ name }: { name: string }) {
  switch (name) {
    case "business": return <BriefcaseIcon />;
    case "education": return <BookOpenIcon />;
    case "medical": return <HeartPulseIcon />;
    case "personal": return <PersonIcon />;
    case "agriculture": return <SproutIcon />;
    case "housing": return <HomeIcon />;
    default: return null;
  }
}

function EmploymentIcon({ name }: { name: string }) {
  switch (name) {
    case "employed": return <TieIcon />;
    case "self_employed": return <StorefrontIcon />;
    case "business_owner": return <TrendUpIcon />;
    case "other": return <GradCapIcon />;
    default: return null;
  }
}

interface HeaderProps {
  step: number;
  onBack: () => void;
}

function StepHeader({ step, onBack }: HeaderProps) {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  return (
    <View style={[headerStyles.container, { paddingTop: insets.top + 8 }]}>
      <TouchableOpacity
        style={headerStyles.backButton}
        activeOpacity={0.6}
        onPress={onBack}
        hitSlop={12}
      >
        <BackIcon />
      </TouchableOpacity>
      <Text style={headerStyles.title}>{t("onboarding_get_started")}</Text>
      <Text style={headerStyles.counter}>
        {step} {t("onboarding_of")} {TOTAL_STEPS}
      </Text>
    </View>
  );
}

const headerStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#D9CCC4",
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: "#4C2311",
    textAlign: "center",
  },
  counter: {
    fontSize: 13,
    fontWeight: "600",
    color: "#A68A7B",
    width: 56,
    textAlign: "right",
  },
});

interface BottomProps {
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  label?: string;
}

function BottomButton({ onPress, disabled, loading, label }: BottomProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[bottomStyles.wrapper, { paddingBottom: insets.bottom + 16 }]}>
      <TouchableOpacity
        style={[bottomStyles.button, disabled && bottomStyles.disabled]}
        activeOpacity={0.85}
        onPress={onPress}
        disabled={disabled || loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={bottomStyles.text}>{label}  →</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const bottomStyles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 24,
    paddingTop: 12,
    backgroundColor: "#FFFFFF",
  },
  button: {
    backgroundColor: "#4C2311",
    borderRadius: 28,
    height: 54,
    justifyContent: "center",
    alignItems: "center",
  },
  disabled: {
    opacity: 0.4,
  },
  text: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});

const PURPOSE_OPTIONS = [
  { key: "business", tKey: "onboarding_purpose_business" },
  { key: "education", tKey: "onboarding_purpose_education" },
  { key: "medical", tKey: "onboarding_purpose_medical" },
  { key: "personal", tKey: "onboarding_purpose_personal" },
  { key: "agriculture", tKey: "onboarding_purpose_agriculture" },
  { key: "housing", tKey: "onboarding_purpose_housing" },
] as const;

function StepPurpose({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const { t } = useLanguage();
  const cardW = (SCREEN_W - 24 * 2 - 12) / 2;
  return (
    <View style={stepStyles.content}>
      <Text style={stepStyles.heading}>{t("onboarding_purpose_heading")}</Text>
      <Text style={stepStyles.sub}>{t("onboarding_purpose_sub")}</Text>
      <View style={stepStyles.grid}>
        {PURPOSE_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.key}
            style={[
              stepStyles.gridCard,
              { width: cardW },
              value === opt.key && stepStyles.gridCardSelected,
            ]}
            activeOpacity={0.7}
            onPress={() => onChange(opt.key)}
          >
            <PurposeIcon name={opt.key} />
            <Text
              style={[
                stepStyles.gridLabel,
                value === opt.key && stepStyles.gridLabelSelected,
              ]}
            >
              {t(opt.tKey)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const EMPLOYMENT_OPTIONS = [
  { key: "employed", tKey: "onboarding_employment_employed" },
  { key: "self_employed", tKey: "onboarding_employment_self" },
  { key: "business_owner", tKey: "onboarding_employment_owner" },
  { key: "other", tKey: "onboarding_employment_other" },
] as const;

function StepEmployment({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const { t } = useLanguage();
  const cardW = (SCREEN_W - 24 * 2 - 12) / 2;
  return (
    <View style={stepStyles.content}>
      <Text style={stepStyles.heading}>{t("onboarding_employment_heading")}</Text>
      <Text style={stepStyles.sub}>{t("onboarding_employment_sub")}</Text>
      <View style={stepStyles.grid}>
        {EMPLOYMENT_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.key}
            style={[
              stepStyles.gridCard,
              { width: cardW, height: 110 },
              value === opt.key && stepStyles.gridCardSelected,
            ]}
            activeOpacity={0.7}
            onPress={() => onChange(opt.key)}
          >
            <EmploymentIcon name={opt.key} />
            <Text
              style={[
                stepStyles.gridLabel,
                value === opt.key && stepStyles.gridLabelSelected,
              ]}
            >
              {t(opt.tKey)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const INCOME_RANGES = [
  { key: "under_500k", tKey: "onboarding_income_under_500k", bar: 0.2 },
  { key: "500k_1m", tKey: "onboarding_income_500k_1m", bar: 0.4 },
  { key: "1m_2m", tKey: "onboarding_income_1m_2m", bar: 0.6 },
  { key: "2m_5m", tKey: "onboarding_income_2m_5m", bar: 0.8 },
  { key: "over_5m", tKey: "onboarding_income_over_5m", bar: 1.0 },
] as const;

function StepIncome({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const { t } = useLanguage();
  return (
    <View style={stepStyles.content}>
      <Text style={stepStyles.heading}>{t("onboarding_income_heading")}</Text>
      <Text style={stepStyles.sub}>{t("onboarding_income_sub")}</Text>
      <View style={incomeStyles.list}>
        {INCOME_RANGES.map((range) => {
          const selected = value === range.key;
          return (
            <TouchableOpacity
              key={range.key}
              style={incomeStyles.row}
              activeOpacity={0.7}
              onPress={() => onChange(range.key)}
            >
              <View style={incomeStyles.labelCol}>
                <Text style={[incomeStyles.label, selected && incomeStyles.labelSelected]}>
                  {t(range.tKey)}
                </Text>
                <Text style={incomeStyles.currency}>{t("onboarding_income_per_month")}</Text>
              </View>
              <View style={incomeStyles.barTrack}>
                <View
                  style={[
                    incomeStyles.barFill,
                    {
                      width: `${range.bar * 100}%`,
                      backgroundColor: selected ? "#DA9133" : "#E8DDD6",
                    },
                  ]}
                />
              </View>
              <View style={[incomeStyles.radio, selected && incomeStyles.radioSelected]}>
                {selected && <View style={incomeStyles.radioDot} />}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const incomeStyles = StyleSheet.create({
  list: {
    gap: 14,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  labelCol: {
    width: 100,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#633E2F",
  },
  labelSelected: {
    color: "#4C2311",
  },
  currency: {
    fontSize: 11,
    color: "#A68A7B",
    marginTop: 1,
  },
  barTrack: {
    flex: 1,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#F7F0EB",
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 5,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#D9CCC4",
    justifyContent: "center",
    alignItems: "center",
  },
  radioSelected: {
    borderColor: "#DA9133",
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#DA9133",
  },
});

const AMOUNT_OPTIONS = [
  { key: "100k", label: "100K" },
  { key: "500k", label: "500K" },
  { key: "1m", label: "1M" },
  { key: "2m", label: "2M" },
  { key: "5m", label: "5M+" },
] as const;

function StepAmount({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const { t } = useLanguage();
  return (
    <View style={stepStyles.content}>
      <Text style={stepStyles.heading}>{t("onboarding_amount_heading")}</Text>
      <Text style={stepStyles.sub}>{t("onboarding_amount_sub")}</Text>
      <View style={amountStyles.row}>
        {AMOUNT_OPTIONS.map((opt, i) => {
          const selected = value === opt.key;
          return (
            <TouchableOpacity
              key={opt.key}
              style={[amountStyles.chip, selected && amountStyles.chipSelected]}
              activeOpacity={0.7}
              onPress={() => onChange(opt.key)}
            >
              <Text style={[amountStyles.chipNumber, selected && amountStyles.chipNumberSelected]}>
                {i + 1}
              </Text>
              <Text style={[amountStyles.chipLabel, selected && amountStyles.chipLabelSelected]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {value && (
        <Text style={amountStyles.summary}>
          {t("onboarding_amount_selected")}{" "}
          <Text style={amountStyles.summaryBold}>
            {AMOUNT_OPTIONS.find((o) => o.key === value)?.label} UGX
          </Text>
        </Text>
      )}
    </View>
  );
}

const amountStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    marginTop: 8,
  },
  chip: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: "#D9CCC4",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  chipSelected: {
    borderColor: "#DA9133",
    backgroundColor: "#DA9133",
  },
  chipNumber: {
    fontSize: 18,
    fontWeight: "700",
    color: "#4C2311",
  },
  chipNumberSelected: {
    color: "#FFFFFF",
  },
  chipLabel: {
    fontSize: 9,
    fontWeight: "600",
    color: "#A68A7B",
    marginTop: -2,
  },
  chipLabelSelected: {
    color: "rgba(255,255,255,0.8)",
  },
  summary: {
    fontSize: 15,
    color: "#633E2F",
    textAlign: "center",
    marginTop: 32,
  },
  summaryBold: {
    fontWeight: "700",
    color: "#4C2311",
  },
});

function StepHistory({
  value,
  onChange,
}: {
  value: boolean | null;
  onChange: (v: boolean) => void;
}) {
  const { t } = useLanguage();
  return (
    <View style={stepStyles.content}>
      <Text style={stepStyles.heading}>{t("onboarding_history_heading")}</Text>
      <Text style={stepStyles.sub}>
        {t("onboarding_history_sub")}
      </Text>
      <View style={historyStyles.row}>
        <TouchableOpacity
          style={[historyStyles.card, value === true && historyStyles.cardSelected]}
          activeOpacity={0.7}
          onPress={() => onChange(true)}
        >
          <CheckCircleIcon />
          <Text style={[historyStyles.label, value === true && historyStyles.labelSelected]}>
            {t("onboarding_yes")}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[historyStyles.card, value === false && historyStyles.cardSelected]}
          activeOpacity={0.7}
          onPress={() => onChange(false)}
        >
          <XCircleIcon />
          <Text style={[historyStyles.label, value === false && historyStyles.labelSelected]}>
            {t("onboarding_no")}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const historyStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 16,
    justifyContent: "center",
    marginTop: 12,
  },
  card: {
    width: 130,
    height: 100,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#D9CCC4",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    gap: 6,
  },
  cardSelected: {
    borderColor: "#DA9133",
    backgroundColor: "#FDF6ED",
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#633E2F",
  },
  labelSelected: {
    color: "#4C2311",
  },
});

const PERIOD_OPTIONS = [
  { key: "1_month", tKey: "onboarding_period_1m" },
  { key: "3_months", tKey: "onboarding_period_3m" },
  { key: "6_months", tKey: "onboarding_period_6m" },
  { key: "12_months", tKey: "onboarding_period_12m" },
  { key: "24_months", tKey: "onboarding_period_24m" },
] as const;

function StepRepayment({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const { t } = useLanguage();
  return (
    <View style={stepStyles.content}>
      <Text style={stepStyles.heading}>{t("onboarding_repayment_heading")}</Text>
      <Text style={stepStyles.sub}>{t("onboarding_repayment_sub")}</Text>
      <View style={radioStyles.list}>
        {PERIOD_OPTIONS.map((opt) => {
          const selected = value === opt.key;
          return (
            <TouchableOpacity
              key={opt.key}
              style={[radioStyles.row, selected && radioStyles.rowSelected]}
              activeOpacity={0.7}
              onPress={() => onChange(opt.key)}
            >
              <Text style={[radioStyles.label, selected && radioStyles.labelSelected]}>
                {t(opt.tKey)}
              </Text>
              <View style={[radioStyles.radio, selected && radioStyles.radioSelected]}>
                {selected && <View style={radioStyles.radioDot} />}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const radioStyles = StyleSheet.create({
  list: {
    gap: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#E8DDD6",
    backgroundColor: "#FFFFFF",
  },
  rowSelected: {
    borderColor: "#DA9133",
    backgroundColor: "#FDF6ED",
  },
  label: {
    fontSize: 15,
    fontWeight: "500",
    color: "#633E2F",
  },
  labelSelected: {
    fontWeight: "600",
    color: "#4C2311",
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#D9CCC4",
    justifyContent: "center",
    alignItems: "center",
  },
  radioSelected: {
    borderColor: "#DA9133",
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#DA9133",
  },
});

const GOALS_MAX = 250;

function StepGoals({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const { t } = useLanguage();
  return (
    <View style={stepStyles.content}>
      <Text style={stepStyles.heading}>{t("onboarding_goals_heading")}</Text>
      <Text style={stepStyles.sub}>
        {t("onboarding_goals_sub")}
      </Text>
      <View style={goalsStyles.wrapper}>
        <TextInput
          style={goalsStyles.input}
          value={value}
          onChangeText={(txt) => onChange(txt.slice(0, GOALS_MAX))}
          placeholder={t("onboarding_goals_placeholder")}
          placeholderTextColor="#A68A7B"
          multiline
          textAlignVertical="top"
          maxLength={GOALS_MAX}
        />
      </View>
      <Text style={goalsStyles.counter}>
        {value.length}/{GOALS_MAX}
      </Text>
    </View>
  );
}

const goalsStyles = StyleSheet.create({
  wrapper: {
    borderWidth: 1.5,
    borderColor: "#D9CCC4",
    borderRadius: 16,
    padding: 16,
    minHeight: 160,
    backgroundColor: "#FFFFFF",
  },
  input: {
    fontSize: 15,
    lineHeight: 22,
    color: "#4C2311",
    flex: 1,
    ...Platform.select({
      ios: {},
      android: { textAlignVertical: "top" as const },
    }),
  },
  counter: {
    fontSize: 13,
    color: "#A68A7B",
    textAlign: "right",
    marginTop: 8,
  },
});

interface OnboardingData {
  loanPurpose: string;
  employment: string;
  income: string;
  amount: string;
  hasHistory: boolean | null;
  repayment: string;
  goals: string;
}

export default function OnboardingScreen() {
  const { refreshProfile } = useAuth();
  const { t } = useLanguage();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<OnboardingData>({
    loanPurpose: "",
    employment: "",
    income: "",
    amount: "",
    hasHistory: null,
    repayment: "",
    goals: "",
  });

  const slideAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(1)).current;

  const animateToStep = useCallback((next: number, forward: boolean) => {
    slideAnim.setValue(forward ? SCREEN_W : -SCREEN_W);
    setStep(next);
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 12,
        overshootClamping: true,
      }),
      Animated.timing(progressAnim, {
        toValue: next,
        duration: 350,
        useNativeDriver: false,
      }),
    ]).start();
  }, [slideAnim, progressAnim]);

  const canContinue = useCallback(() => {
    switch (step) {
      case 1: return data.loanPurpose !== "";
      case 2: return data.employment !== "";
      case 3: return data.income !== "";
      case 4: return data.amount !== "";
      case 5: return data.hasHistory !== null;
      case 6: return data.repayment !== "";
      case 7: return true;
      default: return false;
    }
  }, [step, data]);

  const handleBack = useCallback(() => {
    if (step > 1) animateToStep(step - 1, false);
  }, [step, animateToStep]);

  const handleContinue = useCallback(async () => {
    if (step < TOTAL_STEPS) {
      animateToStep(step + 1, true);
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        loan_purpose: data.loanPurpose,
        employment_status: data.employment,
        monthly_income: data.income,
        desired_amount: data.amount,
        has_loan_history: data.hasHistory,
        repayment_period: data.repayment,
        financial_goals: data.goals || null,
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", (await supabase.auth.getUser()).data.user?.id ?? "");
    setSaving(false);

    if (error) {
      Alert.alert(t("common_error"), t("onboarding_error"));
      return;
    }

    await refreshProfile();
  }, [step, data, refreshProfile, animateToStep, t]);

  const update = useCallback(
    <K extends keyof OnboardingData>(key: K, value: OnboardingData[K]) => {
      setData((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  return (
    <View style={styles.screen}>
      <StepHeader step={step} onBack={handleBack} />

      <View style={styles.progress}>
        <Animated.View
          style={[
            styles.progressFill,
            {
              width: progressAnim.interpolate({
                inputRange: [0, TOTAL_STEPS],
                outputRange: ["0%", "100%"],
              }),
            },
          ]}
        />
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ transform: [{ translateX: slideAnim }] }}>
          {step === 1 && (
            <StepPurpose value={data.loanPurpose} onChange={(v) => update("loanPurpose", v)} />
          )}
          {step === 2 && (
            <StepEmployment value={data.employment} onChange={(v) => update("employment", v)} />
          )}
          {step === 3 && (
            <StepIncome value={data.income} onChange={(v) => update("income", v)} />
          )}
          {step === 4 && (
            <StepAmount value={data.amount} onChange={(v) => update("amount", v)} />
          )}
          {step === 5 && (
            <StepHistory value={data.hasHistory} onChange={(v) => update("hasHistory", v)} />
          )}
          {step === 6 && (
            <StepRepayment value={data.repayment} onChange={(v) => update("repayment", v)} />
          )}
          {step === 7 && (
            <StepGoals value={data.goals} onChange={(v) => update("goals", v)} />
          )}
        </Animated.View>
      </ScrollView>

      <BottomButton
        onPress={handleContinue}
        disabled={!canContinue()}
        loading={saving}
        label={step === TOTAL_STEPS ? t("onboarding_finish") : t("onboarding_continue")}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  flex: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
  },
  progress: {
    height: 3,
    backgroundColor: "#F7F0EB",
    marginHorizontal: 20,
    borderRadius: 2,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#DA9133",
    borderRadius: 2,
  },
});

const stepStyles = StyleSheet.create({
  content: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
  },
  heading: {
    fontSize: 26,
    fontWeight: "800",
    color: "#4C2311",
    letterSpacing: -0.3,
    marginBottom: 10,
  },
  sub: {
    fontSize: 15,
    lineHeight: 22,
    color: "#633E2F",
    marginBottom: 28,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  gridCard: {
    height: 100,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#E8DDD6",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    gap: 6,
  },
  gridCardSelected: {
    borderColor: "#DA9133",
    backgroundColor: "#FDF6ED",
  },
  gridLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#633E2F",
  },
  gridLabelSelected: {
    color: "#4C2311",
  },
});
