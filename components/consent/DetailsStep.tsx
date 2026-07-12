import { useState } from "react";
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, ScrollView } from "react-native";
import type { ApplicantDetails } from "@/lib/loanApplication";
import { DateField } from "@/components/DateField";

const GENDER_OPTIONS = ["Male", "Female", "Other"] as const;

function FieldLabel({ text }: { text: string }) {
  return <Text style={s.label}>{text}</Text>;
}

export function DetailsStep({
  initial,
  onNext,
}: {
  initial: ApplicantDetails;
  onNext: (details: ApplicantDetails) => void;
}) {
  const [fullName, setFullName] = useState(initial.full_name);
  const [dateOfBirth, setDateOfBirth] = useState(initial.date_of_birth);
  const [gender, setGender] = useState(initial.gender);
  const [location, setLocation] = useState(initial.location);
  const [phone, setPhone] = useState(initial.phone);

  const handleNext = () => {
    if (!fullName.trim() || !dateOfBirth.trim()) {
      Alert.alert("Missing details", "Please enter your full name and date of birth.");
      return;
    }
    onNext({
      full_name: fullName.trim(),
      date_of_birth: dateOfBirth.trim(),
      gender,
      location: location.trim(),
      phone: phone.trim(),
    });
  };

  return (
    <ScrollView
      style={s.scroll}
      contentContainerStyle={s.container}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={s.title}>Confirm your details</Text>
      <Text style={s.subtitle}>We've prefilled this from your profile. Update anything that's changed.</Text>

      <View style={s.fieldGroup}>
        <FieldLabel text="Full name" />
        <View style={s.inputWrapper}>
          <TextInput
            style={s.input}
            value={fullName}
            onChangeText={setFullName}
            placeholder="Your full name"
            placeholderTextColor="#A68A7B"
            autoCapitalize="words"
          />
        </View>
      </View>

      <View style={s.fieldGroup}>
        <FieldLabel text="Date of birth" />
        <DateField value={dateOfBirth} onChange={setDateOfBirth}>
          {({ open }) => (
            <TouchableOpacity style={s.inputWrapper} activeOpacity={0.7} onPress={open}>
              <Text style={[s.input, s.dateText, !dateOfBirth && s.datePlaceholder]}>
                {dateOfBirth || "YYYY-MM-DD"}
              </Text>
            </TouchableOpacity>
          )}
        </DateField>
      </View>

      <View style={s.fieldGroup}>
        <FieldLabel text="Gender" />
        <View style={s.pillRow}>
          {GENDER_OPTIONS.map((option) => {
            const selected = gender === option;
            return (
              <TouchableOpacity
                key={option}
                style={[s.pill, selected && s.pillSelected]}
                activeOpacity={0.75}
                onPress={() => setGender(option)}
              >
                <Text style={[s.pillText, selected && s.pillTextSelected]}>{option}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={s.fieldGroup}>
        <FieldLabel text="Location" />
        <View style={s.inputWrapper}>
          <TextInput
            style={s.input}
            value={location}
            onChangeText={setLocation}
            placeholder="City or district"
            placeholderTextColor="#A68A7B"
            autoCapitalize="words"
          />
        </View>
      </View>

      <View style={s.fieldGroup}>
        <FieldLabel text="Phone" />
        <View style={s.inputWrapper}>
          <TextInput
            style={s.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="07XXXXXXXX"
            placeholderTextColor="#A68A7B"
            keyboardType="phone-pad"
          />
        </View>
      </View>

      <TouchableOpacity style={s.nextButton} activeOpacity={0.85} onPress={handleNext}>
        <Text style={s.nextText}>Next</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll: { flex: 1 },
  container: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 32 },
  title: { fontSize: 22, fontWeight: "800", color: "#4C2311" },
  subtitle: { fontSize: 14, color: "#A68A7B", marginTop: 4, marginBottom: 20, lineHeight: 20 },
  fieldGroup: { marginBottom: 18 },
  label: { fontSize: 14, fontWeight: "700", color: "#4C2311", marginBottom: 8 },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D9CCC4",
    borderRadius: 28,
    height: 52,
    paddingHorizontal: 18,
    backgroundColor: "#FFFFFF",
  },
  input: { flex: 1, fontSize: 15, color: "#4C2311", height: "100%" },
  dateText: { textAlignVertical: "center", paddingVertical: 15 },
  datePlaceholder: { color: "#A68A7B" },
  pillRow: { flexDirection: "row", gap: 10 },
  pill: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "#D9CCC4",
    paddingVertical: 13,
  },
  pillSelected: { backgroundColor: "#DA9133", borderColor: "#DA9133" },
  pillText: { fontSize: 14, fontWeight: "600", color: "#4C2311" },
  pillTextSelected: { color: "#FFFFFF" },
  nextButton: {
    backgroundColor: "#4C2311",
    borderRadius: 26,
    paddingVertical: 17,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 8,
  },
  nextText: { fontSize: 16, fontWeight: "800", color: "#FFFFFF" },
});
