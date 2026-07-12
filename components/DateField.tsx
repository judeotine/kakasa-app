import { useState, type ReactNode } from "react";
import { Platform, Modal, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";

function parseDate(value: string): Date {
  const parts = value.split("-").map(Number);
  if (parts.length === 3 && parts.every((n) => !Number.isNaN(n))) {
    return new Date(parts[0]!, parts[1]! - 1, parts[2]!);
  }
  const fallback = new Date();
  fallback.setFullYear(fallback.getFullYear() - 25);
  return fallback;
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function DateField({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  children: (opts: { open: () => void }) => ReactNode;
}) {
  const [show, setShow] = useState(false);
  const [temp, setTemp] = useState<Date>(() => parseDate(value));
  const maxDate = new Date();

  const open = () => {
    setTemp(parseDate(value));
    setShow(true);
  };

  const onAndroidChange = (event: DateTimePickerEvent, selected?: Date) => {
    setShow(false);
    if (event.type === "set" && selected) {
      onChange(formatDate(selected));
    }
  };

  return (
    <>
      {children({ open })}

      {Platform.OS === "android" && show && (
        <DateTimePicker
          value={parseDate(value)}
          mode="date"
          display="default"
          maximumDate={maxDate}
          onChange={onAndroidChange}
        />
      )}

      {Platform.OS === "ios" && (
        <Modal visible={show} transparent animationType="slide" onRequestClose={() => setShow(false)}>
          <View style={s.overlay}>
            <View style={s.sheet}>
              <View style={s.sheetHeader}>
                <TouchableOpacity onPress={() => setShow(false)} hitSlop={12}>
                  <Text style={s.cancel}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    onChange(formatDate(temp));
                    setShow(false);
                  }}
                  hitSlop={12}
                >
                  <Text style={s.done}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={temp}
                mode="date"
                display="spinner"
                maximumDate={maxDate}
                onChange={(_event, selected) => selected && setTemp(selected)}
                textColor="#4C2311"
              />
            </View>
          </View>
        </Modal>
      )}
    </>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 24,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E8DDD6",
  },
  cancel: { fontSize: 16, color: "#A68A7B" },
  done: { fontSize: 16, fontWeight: "700", color: "#DA9133" },
});
