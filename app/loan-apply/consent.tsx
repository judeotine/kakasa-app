import { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import Svg, { Path } from "react-native-svg";
import {
  getApplication,
  saveConsent,
  setIdSubmitted,
  setLivenessComplete,
  updateApplicationStatus,
  uploadDocument,
  type LoanApplication,
  type ApplicantDetails,
} from "@/lib/loanApplication";
import { supabase } from "@/lib/supabase";
import { getProfileForPrefill } from "@/lib/profile";
import { getProvider, type Provider } from "@/lib/providers";
import { StepBar } from "@/components/consent/StepBar";
import { LoanSummaryStep } from "@/components/consent/LoanSummaryStep";
import { DetailsStep } from "@/components/consent/DetailsStep";
import { IdUploadStep } from "@/components/consent/IdUploadStep";
import { LivenessStep } from "@/components/consent/LivenessStep";
import { ReviewStep } from "@/components/consent/ReviewStep";

const TOTAL_STEPS = 5;

const EMPTY_DETAILS: ApplicantDetails = {
  full_name: "",
  date_of_birth: "",
  gender: "",
  location: "",
  phone: "",
};

function BackArrowIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M19 12H5M12 19l-7-7 7-7" stroke="#4C2311" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export default function ConsentScreen() {
  const insets = useSafeAreaInsets();
  const { applicationId, providerId } = useLocalSearchParams<{ applicationId: string; providerId: string }>();

  const [loading, setLoading] = useState(true);
  const [application, setApplication] = useState<LoanApplication | null>(null);
  const [provider, setProvider] = useState<Provider | null>(null);

  const [step, setStep] = useState(1);
  const [details, setDetails] = useState<ApplicantDetails>(EMPTY_DETAILS);
  const [idFront, setIdFront] = useState<string | null>(null);
  const [idBack, setIdBack] = useState<string | null>(null);
  const [faceFrames, setFaceFrames] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [app, prov, prefill] = await Promise.all([
          getApplication(applicationId),
          getProvider(providerId),
          getProfileForPrefill(),
        ]);

        if (!app || !prov) {
          Alert.alert("Application not found", "We couldn't load this application. Please try again.");
          router.back();
          return;
        }

        setApplication(app);
        setProvider(prov);
        setDetails({
          full_name: prefill.full_name,
          date_of_birth: prefill.date_of_birth,
          gender: prefill.gender,
          location: prefill.location,
          phone: prefill.phone,
        });
      } catch (err) {
        Alert.alert("Something went wrong", err instanceof Error ? err.message : "Please try again.");
        router.back();
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [applicationId, providerId]);

  const handleBack = useCallback(() => {
    if (step > 1) {
      setStep((s) => s - 1);
    } else {
      router.back();
    }
  }, [step]);

  const handleSubmit = useCallback(async () => {
    setSubmitting(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;

      await saveConsent(applicationId, details);

      const uploads: Promise<unknown>[] = [];
      if (idFront) uploads.push(uploadDocument(applicationId, "id_front", "id_front.jpg", idFront, userId));
      if (idBack) uploads.push(uploadDocument(applicationId, "id_back", "id_back.jpg", idBack, userId));
      for (const [pose, uri] of Object.entries(faceFrames)) {
        uploads.push(uploadDocument(applicationId, `face_${pose}`, `face_${pose}.jpg`, uri, userId));
      }
      await Promise.all(uploads);

      await Promise.all([setIdSubmitted(applicationId), setLivenessComplete(applicationId)]);
      await updateApplicationStatus(applicationId, "interviewing");

      router.replace({ pathname: "/loan-apply/interview", params: { applicationId, providerId } });
    } catch (err) {
      Alert.alert("Couldn't submit", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setSubmitting(false);
    }
  }, [applicationId, providerId, details, idFront, idBack, faceFrames]);

  if (loading || !application || !provider) {
    return (
      <View style={s.loadingContainer}>
        <ActivityIndicator size="large" color="#4C2311" />
      </View>
    );
  }

  return (
    <View style={s.container}>
      <View style={[s.header, { paddingTop: insets.top + 8 }]}>
        <View style={s.headerRow}>
          <TouchableOpacity style={s.backButton} onPress={handleBack} activeOpacity={0.7}>
            <BackArrowIcon />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Application</Text>
          <View style={{ width: 42 }} />
        </View>
        <StepBar current={step} total={TOTAL_STEPS} />
      </View>

      <View style={s.body}>
        {step === 1 && (
          <LoanSummaryStep application={application} provider={provider} onContinue={() => setStep(2)} />
        )}
        {step === 2 && (
          <DetailsStep
            initial={details}
            onNext={(d) => {
              setDetails(d);
              setStep(3);
            }}
          />
        )}
        {step === 3 && (
          <IdUploadStep
            front={idFront}
            back={idBack}
            onCaptured={(side, uri) => (side === "front" ? setIdFront(uri) : setIdBack(uri))}
            onNext={() => setStep(4)}
          />
        )}
        {step === 4 && (
          <LivenessStep
            onComplete={(frames) => {
              setFaceFrames(frames);
              setStep(5);
            }}
          />
        )}
        {step === 5 && (
          <ReviewStep
            details={details}
            idFront={idFront}
            idBack={idBack}
            faceCount={Object.keys(faceFrames).length}
            application={application}
            provider={provider}
            submitting={submitting}
            onSubmit={handleSubmit}
          />
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F0EB" },
  loadingContainer: { flex: 1, backgroundColor: "#F7F0EB", alignItems: "center", justifyContent: "center" },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F0E8E2",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
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
  headerTitle: { fontSize: 17, fontWeight: "700", color: "#4C2311" },
  body: { flex: 1 },
});
