import { View, Text, StyleSheet, Image, TouchableOpacity, ActivityIndicator, ScrollView } from "react-native";
import type { ApplicantDetails, LoanApplication } from "@/lib/loanApplication";
import type { Provider } from "@/lib/providers";
import { formatUGX } from "@/lib/loans";

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.detailRow}>
      <Text style={s.detailLabel}>{label}</Text>
      <Text style={s.detailValue}>{value}</Text>
    </View>
  );
}

function IdThumb({ label, uri }: { label: string; uri: string | null }) {
  return (
    <View style={s.thumbWrap}>
      {uri ? (
        <Image source={{ uri }} style={s.thumbImage} />
      ) : (
        <View style={s.thumbPlaceholder}>
          <Text style={s.thumbPlaceholderText}>Not provided</Text>
        </View>
      )}
      <Text style={s.thumbLabel}>{label}</Text>
    </View>
  );
}

export function ReviewStep({
  details,
  idFront,
  idBack,
  faceCount,
  application,
  provider,
  submitting,
  onSubmit,
}: {
  details: ApplicantDetails;
  idFront: string | null;
  idBack: string | null;
  faceCount: number;
  application: LoanApplication;
  provider: Provider;
  submitting: boolean;
  onSubmit: () => void;
}) {
  const amount = application.amount_requested ?? Math.min(1000000, provider.max_amount);
  const termMonths = application.term_months ?? provider.term_min_months;
  const avgRate = (provider.min_rate + provider.max_rate) / 2;
  const totalRepayable = amount * (1 + (avgRate / 100) * (termMonths / 12));

  return (
    <ScrollView
      style={s.scroll}
      contentContainerStyle={s.container}
      showsVerticalScrollIndicator={false}
    >
      <Text style={s.title}>Review & confirm</Text>
      <Text style={s.subtitle}>Check everything looks right before you continue.</Text>

      <View style={s.card}>
        <Text style={s.cardTitle}>Loan terms</Text>
        <DetailRow label="Provider" value={provider.name} />
        <DetailRow label="Amount" value={formatUGX(amount)} />
        <DetailRow label="Term" value={`${termMonths} months`} />
        <DetailRow label="Total repayable" value={formatUGX(Math.round(totalRepayable))} />
      </View>

      <View style={s.card}>
        <Text style={s.cardTitle}>Your details</Text>
        <DetailRow label="Full name" value={details.full_name} />
        <DetailRow label="Date of birth" value={details.date_of_birth} />
        <DetailRow label="Gender" value={details.gender || "—"} />
        <DetailRow label="Location" value={details.location || "—"} />
        <DetailRow label="Phone" value={details.phone || "—"} />
      </View>

      <View style={s.card}>
        <Text style={s.cardTitle}>National ID</Text>
        <View style={s.thumbRow}>
          <IdThumb label="Front" uri={idFront} />
          <IdThumb label="Back" uri={idBack} />
        </View>
      </View>

      <View style={s.card}>
        <Text style={s.cardTitle}>Face check</Text>
        <Text style={[s.faceCheckText, faceCount < 5 && s.faceCheckTextPending]}>
          {faceCount >= 5 ? `Face check: ${faceCount}/5 captured ✓` : `Face check: ${faceCount}/5 captured`}
        </Text>
      </View>

      <Text style={s.privacyNote}>
        Your documents are stored securely and only used to verify this application.
      </Text>

      <TouchableOpacity
        style={[s.submitButton, submitting && s.submitButtonDisabled]}
        activeOpacity={0.85}
        onPress={onSubmit}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <Text style={s.submitText}>Confirm & continue to interview</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll: { flex: 1 },
  container: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 32 },
  title: { fontSize: 22, fontWeight: "800", color: "#4C2311" },
  subtitle: { fontSize: 14, color: "#A68A7B", marginTop: 4, marginBottom: 20, lineHeight: 20 },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    shadowColor: "#4C2311",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardTitle: { fontSize: 15, fontWeight: "700", color: "#4C2311", marginBottom: 12 },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  detailLabel: { fontSize: 14, color: "#A68A7B" },
  detailValue: { fontSize: 14, fontWeight: "700", color: "#4C2311" },
  thumbRow: { flexDirection: "row", gap: 14 },
  thumbWrap: { flex: 1, alignItems: "center" },
  thumbImage: {
    width: "100%",
    aspectRatio: 1.4,
    borderRadius: 14,
    backgroundColor: "#F7F0EB",
  },
  thumbPlaceholder: {
    width: "100%",
    aspectRatio: 1.4,
    borderRadius: 14,
    backgroundColor: "#F7F0EB",
    borderWidth: 1.5,
    borderColor: "#D9CCC4",
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  thumbPlaceholderText: { fontSize: 12, color: "#A68A7B", fontWeight: "600" },
  thumbLabel: { fontSize: 12.5, fontWeight: "700", color: "#4C2311", marginTop: 8 },
  faceCheckText: { fontSize: 14, fontWeight: "700", color: "#2E7D32" },
  faceCheckTextPending: { color: "#A68A7B" },
  privacyNote: {
    fontSize: 12,
    color: "#A68A7B",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  submitButton: {
    backgroundColor: "#4C2311",
    borderRadius: 26,
    paddingVertical: 17,
    alignItems: "center",
    marginBottom: 8,
  },
  submitButtonDisabled: { opacity: 0.7 },
  submitText: { fontSize: 16, fontWeight: "800", color: "#FFFFFF" },
});
