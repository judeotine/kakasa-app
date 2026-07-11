import { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  InputAccessoryView,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { AuthHeader } from "@/components/auth/AuthHeader";
import { supabase } from "@/lib/supabase";

const CODE_LENGTH = 6;

export default function VerifyScreen() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  const handleChangeCode = useCallback((text: string) => {
    const digits = text.replace(/\D/g, "").slice(0, CODE_LENGTH);
    setCode(digits);
  }, []);

  const handleVerify = useCallback(async () => {
    if (code.length < CODE_LENGTH || verifying) return;
    setVerifying(true);
    const { error: verifyError } = await supabase.auth.verifyOtp({
      phone: phone ?? "",
      token: code,
      type: "sms",
    });
    if (verifyError) {
      setVerifying(false);
      setCode("");
      inputRef.current?.focus();
      Alert.alert("Invalid code", verifyError.message);
      return;
    }
    // Success: the auth listener sets the session and the root layout routes
    // to the authenticated area. Keep the spinner up until that happens.
  }, [code, verifying, phone]);

  useEffect(() => {
    if (code.length === CODE_LENGTH && !verifying) {
      handleVerify();
    }
  }, [code, verifying, handleVerify]);

  const handleResend = useCallback(async () => {
    if (secondsLeft > 0) return;
    const { error: resendError } = await supabase.auth.signInWithOtp({
      phone: phone ?? "",
    });
    if (resendError) {
      Alert.alert("Couldn't resend code", resendError.message);
      return;
    }
    setSecondsLeft(30);
  }, [secondsLeft, phone]);

  const cells = Array.from({ length: CODE_LENGTH }, (_, i) => code[i] ?? "");
  const isValid = code.length === CODE_LENGTH;

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <AuthHeader />

        <View style={styles.content}>
          {/* <TouchableOpacity
            style={styles.backButton}
            activeOpacity={0.6}
            onPress={() => router.back()}
            hitSlop={16}
          >
            <Text style={styles.backArrow}>{"←"}</Text>
          </TouchableOpacity> */}

          <Text style={styles.heading}>Enter code</Text>
          <Text style={styles.subtitle}>
            We sent a verification code to{"\n"}
            <Text style={styles.phoneHighlight}>{phone}</Text>
          </Text>

          <TouchableOpacity
            style={styles.cellRow}
            activeOpacity={1}
            onPress={() => inputRef.current?.focus()}
          >
            {cells.map((digit, i) => (
              <View
                key={i}
                style={[
                  styles.cell,
                  i === code.length && styles.cellActive,
                ]}
              >
                <Text style={styles.cellText}>{digit}</Text>
              </View>
            ))}
          </TouchableOpacity>

          <TextInput
            ref={inputRef}
            style={styles.hiddenInput}
            value={code}
            onChangeText={handleChangeCode}
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            autoComplete="one-time-code"
            maxLength={CODE_LENGTH}
            caretHidden
            inputAccessoryViewID="otp"
          />

          <TouchableOpacity
            style={[styles.verifyButton, (!isValid || verifying) && styles.verifyButtonDisabled]}
            activeOpacity={0.8}
            onPress={handleVerify}
            disabled={!isValid || verifying}
          >
            {verifying ? (
              <ActivityIndicator color="#C4A99E" />
            ) : (
              <Text style={[styles.verifyButtonText, !isValid && styles.verifyButtonTextDisabled]}>
                Verify
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.resendButton}
            activeOpacity={0.6}
            onPress={handleResend}
            disabled={secondsLeft > 0}
            hitSlop={8}
          >
            <Text style={styles.resendText}>
              {secondsLeft > 0 ? (
                `Resend code in ${secondsLeft}s`
              ) : (
                <>
                  Didn't receive a code?{" "}
                  <Text style={styles.resendBold}>Resend</Text>
                </>
              )}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {Platform.OS === "ios" && (
        <InputAccessoryView nativeID="otp">
          <View style={styles.accessoryBar} />
        </InputAccessoryView>
      )}
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
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: -8,
    marginBottom: 8,
  },
  backArrow: {
    fontSize: 24,
    color: "#4C2311",
  },
  heading: {
    fontSize: 32,
    fontWeight: "800",
    color: "#4C2311",
    letterSpacing: -0.5,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    color: "#633E2F",
    marginBottom: 36,
  },
  phoneHighlight: {
    fontWeight: "700",
    color: "#4C2311",
  },
  cellRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    marginBottom: 36,
  },
  cell: {
    width: 48,
    height: 56,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D9CCC4",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  cellActive: {
    borderColor: "#DA9133",
    borderWidth: 2,
  },
  cellText: {
    fontSize: 24,
    fontWeight: "700",
    color: "#4C2311",
  },
  hiddenInput: {
    position: "absolute",
    opacity: 0,
    height: 0,
    width: 0,
  },
  verifyButton: {
    backgroundColor: "#DA9133",
    borderRadius: 16,
    height: 56,
    justifyContent: "center",
    alignItems: "center",
  },
  verifyButtonDisabled: {
    backgroundColor: "#F0DCC3",
  },
  verifyButtonText: {
    fontSize: 17,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  verifyButtonTextDisabled: {
    color: "#C4A99E",
  },
  resendButton: {
    alignSelf: "center",
    marginTop: 24,
  },
  resendText: {
    fontSize: 15,
    color: "#633E2F",
  },
  resendBold: {
    fontWeight: "700",
    color: "#DA9133",
  },
  accessoryBar: {
    height: 0,
  },
});
