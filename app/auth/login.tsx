import { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Modal,
  Pressable,
  Platform,
  InputAccessoryView,
  ScrollView,
  ActivityIndicator,
  Alert,
  type ListRenderItemInfo,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { countries, type Country } from "@/lib/countries";
import { AuthHeader } from "@/components/auth/AuthHeader";
import { GoogleIcon } from "@/components/auth/GoogleIcon";
import { supabase } from "@/lib/supabase";

WebBrowser.maybeCompleteAuthSession();

const DEFAULT_COUNTRY = countries[0]!;
const redirectTo = Linking.createURL("auth/callback");

function paramsFromUrl(url: string): Record<string, string> {
  const separator = url.includes("#") ? "#" : "?";
  const query = url.includes(separator) ? url.slice(url.indexOf(separator) + 1) : "";
  const params: Record<string, string> = {};
  for (const pair of query.split("&")) {
    if (!pair) continue;
    const idx = pair.indexOf("=");
    const key = decodeURIComponent(idx === -1 ? pair : pair.slice(0, idx));
    params[key] = idx === -1 ? "" : decodeURIComponent(pair.slice(idx + 1));
  }
  return params;
}

async function createSessionFromUrl(url: string) {
  const params = paramsFromUrl(url);
  if (params.error_description) throw new Error(params.error_description);

  const { access_token, refresh_token } = params;
  if (!access_token || !refresh_token) return;

  const { error } = await supabase.auth.setSession({
    access_token,
    refresh_token,
  });
  if (error) throw error;
}

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const [phone, setPhone] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<Country>(DEFAULT_COUNTRY);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sending, setSending] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const phoneInputRef = useRef<TextInput>(null);

  const filteredCountries = searchQuery
    ? countries.filter(
        (c) =>
          c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.dialCode.includes(searchQuery),
      )
    : countries;

  const handleLogIn = useCallback(async () => {
    if (sending) return;
    const national = phone.replace(/\D/g, "").replace(/^0+/, "");
    if (national.length < 6) return;
    const e164 = `${selectedCountry.dialCode}${national}`;

    setSending(true);
    const { error: otpError } = await supabase.auth.signInWithOtp({
      phone: e164,
    });
    setSending(false);

    if (otpError) {
      Alert.alert("Couldn't send code", otpError.message);
      return;
    }

    router.push({ pathname: "/auth/verify", params: { phone: e164 } });
  }, [phone, selectedCountry, sending]);

  const handleGoogle = useCallback(async () => {
    if (googleLoading) return;
    setGoogleLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo, skipBrowserRedirect: true },
      });
      if (error) throw error;

      const result = await WebBrowser.openAuthSessionAsync(
        data?.url ?? "",
        redirectTo,
      );
      if (result.type === "success") {
        await createSessionFromUrl(result.url);
      }
    } catch (e) {
      Alert.alert(
        "Google sign-in failed",
        e instanceof Error ? e.message : "Something went wrong. Please try again.",
      );
    } finally {
      setGoogleLoading(false);
    }
  }, [googleLoading]);

  const handleSelectCountry = useCallback((country: Country) => {
    setSelectedCountry(country);
    setPickerVisible(false);
    setSearchQuery("");
    phoneInputRef.current?.focus();
  }, []);

  const handleClearPhone = useCallback(() => {
    setPhone("");
    phoneInputRef.current?.focus();
  }, []);

  const renderCountryItem = useCallback(
    ({ item }: ListRenderItemInfo<Country>) => (
      <TouchableOpacity
        style={pickerStyles.countryRow}
        activeOpacity={0.6}
        onPress={() => handleSelectCountry(item)}
      >
        <Text style={pickerStyles.countryFlag}>{item.flag}</Text>
        <Text style={pickerStyles.countryName}>{item.name}</Text>
        <Text style={pickerStyles.countryDial}>{item.dialCode}</Text>
      </TouchableOpacity>
    ),
    [handleSelectCountry],
  );

  const keyExtractor = useCallback((item: Country) => item.code, []);

  const isValid = phone.length >= 6;

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
          <Text style={styles.heading}>Welcome back!</Text>
          <Text style={styles.subtitle}>
            Enter your phone number. We will send you a confirmation code there
          </Text>

          <View style={styles.inputRow}>
            <TouchableOpacity
              style={styles.countryPicker}
              activeOpacity={0.7}
              onPress={() => setPickerVisible(true)}
            >
              <Text style={styles.countryFlag}>{selectedCountry.flag}</Text>
              <Text style={styles.countryCode}>{selectedCountry.dialCode}</Text>
            </TouchableOpacity>

            <View style={styles.phoneInputWrapper}>
              <TextInput
                ref={phoneInputRef}
                style={styles.phoneInput}
                value={phone}
                onChangeText={setPhone}
                placeholder="Phone number"
                placeholderTextColor="#A68A7B"
                keyboardType="number-pad"
                textContentType="telephoneNumber"
                maxLength={15}
                inputAccessoryViewID="phone"
              />
              {phone.length > 0 && (
                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={handleClearPhone}
                  hitSlop={12}
                >
                  <View style={styles.clearIcon}>
                    <Text style={styles.clearIconText}>{"×"}</Text>
                  </View>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <TouchableOpacity
            style={[styles.logInButton, (!isValid || sending) && styles.logInButtonDisabled]}
            activeOpacity={0.8}
            onPress={handleLogIn}
            disabled={!isValid || sending}
          >
            {sending ? (
              <ActivityIndicator color="#C4A99E" />
            ) : (
              <Text style={[styles.logInButtonText, !isValid && styles.logInButtonTextDisabled]}>
                Log in
              </Text>
            )}
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={styles.googleButton}
            activeOpacity={0.7}
            onPress={handleGoogle}
            disabled={googleLoading}
          >
            {googleLoading ? (
              <ActivityIndicator color="#DA9133" />
            ) : (
              <GoogleIcon size={22} />
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {Platform.OS === "ios" && (
        <InputAccessoryView nativeID="phone">
          <View style={styles.accessoryBar} />
        </InputAccessoryView>
      )}

      <Modal
        visible={pickerVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setPickerVisible(false)}
      >
        <View style={[pickerStyles.container, { paddingTop: insets.top }]}>
          <View style={pickerStyles.header}>
            <Text style={pickerStyles.title}>Select country</Text>
            <Pressable
              onPress={() => {
                setPickerVisible(false);
                setSearchQuery("");
              }}
              hitSlop={12}
            >
              <Text style={pickerStyles.close}>Done</Text>
            </Pressable>
          </View>

          <View style={pickerStyles.searchWrapper}>
            <TextInput
              style={pickerStyles.searchInput}
              placeholder="Search countries"
              placeholderTextColor="#A68A7B"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCorrect={false}
              returnKeyType="search"
            />
          </View>

          <FlatList
            data={filteredCountries}
            keyExtractor={keyExtractor}
            renderItem={renderCountryItem}
            keyboardShouldPersistTaps="handled"
            initialNumToRender={20}
          />
        </View>
      </Modal>
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
    paddingTop: 32,
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
    marginBottom: 32,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 24,
  },
  countryPicker: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D9CCC4",
    paddingHorizontal: 14,
    height: 52,
    gap: 8,
  },
  countryFlag: {
    fontSize: 20,
  },
  countryCode: {
    fontSize: 16,
    fontWeight: "500",
    color: "#4C2311",
  },
  phoneInputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D9CCC4",
    height: 52,
    paddingHorizontal: 16,
  },
  phoneInput: {
    flex: 1,
    fontSize: 16,
    color: "#4C2311",
    height: "100%",
  },
  clearButton: {
    marginLeft: 8,
  },
  clearIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#C4A99E",
    justifyContent: "center",
    alignItems: "center",
  },
  clearIconText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
    marginTop: -1,
  },
  logInButton: {
    backgroundColor: "#DA9133",
    borderRadius: 16,
    height: 56,
    justifyContent: "center",
    alignItems: "center",
  },
  logInButtonDisabled: {
    backgroundColor: "#F0DCC3",
  },
  logInButtonText: {
    fontSize: 17,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  logInButtonTextDisabled: {
    color: "#C4A99E",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 28,
    marginBottom: 28,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E8DDD6",
  },
  dividerText: {
    fontSize: 14,
    color: "#A68A7B",
  },
  googleButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "#D9CCC4",
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
  },
  accessoryBar: {
    height: 0,
  },
});

const pickerStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E8DDD6",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#4C2311",
  },
  close: {
    fontSize: 16,
    fontWeight: "600",
    color: "#DA9133",
  },
  searchWrapper: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  searchInput: {
    backgroundColor: "#F7F0EB",
    borderRadius: 12,
    height: 44,
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#4C2311",
  },
  countryRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 12,
  },
  countryFlag: {
    fontSize: 24,
  },
  countryName: {
    flex: 1,
    fontSize: 16,
    color: "#4C2311",
  },
  countryDial: {
    fontSize: 16,
    color: "#633E2F",
  },
});
