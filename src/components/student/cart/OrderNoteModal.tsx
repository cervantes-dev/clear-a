import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Modal, Pressable, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { haptics } from "../../../utils/haptics";

type Props = {
  visible: boolean;
  initialValue: string;
  onSave: (note: string) => void;
  onClose: () => void;
};

// The database allows 200; the dialog stops a little short so there's always room.
const MAX_LENGTH = 150;

const QUICK_NOTES = ["No onions", "Less spicy", "Extra sauce", "Sauce on the side"];

export default function OrderNoteModal({ visible, initialValue, onSave, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const [value, setValue] = useState(initialValue);

  // Start from the saved note every time the dialog opens.
  useEffect(() => {
    if (visible) setValue(initialValue);
  }, [visible, initialValue]);

  const addQuickNote = (text: string) => {
    haptics.select();
    setValue((current) => {
      if (current.toLowerCase().includes(text.toLowerCase())) return current;
      const next = current.trim().length > 0 ? `${current.trim()}, ${text}` : text;
      return next.slice(0, MAX_LENGTH);
    });
  };

  const save = () => {
    haptics.tap();
    onSave(value.trim());
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      {/* Anchored to the top, not the center or bottom: the keyboard covers the
          lower half of the screen, so the input and buttons stay visible. */}
      <Pressable
        className="flex-1 bg-black/40 px-6"
        style={{ paddingTop: insets.top + 72 }}
        onPress={onClose}
      >
        <Pressable className="w-full bg-card rounded-3xl p-5" onPress={(e) => e.stopPropagation()}>
          <View className="flex-row items-center justify-between mb-1">
            <Text className="text-text text-lg font-bold">Note for the canteen</Text>
            <Pressable hitSlop={8} onPress={onClose} accessibilityLabel="Close">
              <Ionicons name="close" size={22} color="#666" />
            </Pressable>
          </View>
          <Text className="text-text opacity-50 text-xs mb-4">Optional — anything they should know?</Text>

          <TextInput
            value={value}
            onChangeText={setValue}
            placeholder="e.g. No onions, less spicy"
            placeholderTextColor="#999"
            multiline
            maxLength={MAX_LENGTH}
            autoFocus
            className="border border-border rounded-xl px-4 py-3 text-text"
            style={{ textAlignVertical: "top", minHeight: 84 }}
          />
          <Text className="text-text opacity-40 text-[11px] text-right mt-1">
            {value.length}/{MAX_LENGTH}
          </Text>

          <View className="flex-row flex-wrap mt-2">
            {QUICK_NOTES.map((q) => (
              <Pressable
                key={q}
                onPress={() => addQuickNote(q)}
                className="px-3 py-1.5 rounded-full border border-border mr-2 mb-2"
              >
                <Text className="text-text text-xs font-medium">{q}</Text>
              </Pressable>
            ))}
          </View>

          <View className="flex-row mt-3">
            {initialValue.length > 0 && (
              <Pressable
                onPress={() => {
                  haptics.tap();
                  onSave("");
                }}
                className="flex-1 border border-border rounded-xl py-3 items-center mr-3"
              >
                <Text className="text-text font-semibold text-sm">Remove note</Text>
              </Pressable>
            )}
            <Pressable onPress={save} className="flex-1 bg-primary rounded-xl py-3 items-center">
              <Text className="text-white font-semibold text-sm">Save note</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}