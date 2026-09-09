import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { ActivityIndicator, Modal, Pressable, Text, TextInput, TouchableOpacity, View } from "react-native";

type Props = {
  visible: boolean;
  currentName: string;
  saving: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
};

export default function EditNameModal({ visible, currentName, saving, onClose, onSave }: Props) {
  const [value, setValue] = useState(currentName);

  useEffect(() => {
    if (visible) setValue(currentName);
  }, [visible, currentName]);

  const isValid = value.trim().length > 0;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/40 justify-end" onPress={onClose}>
        <Pressable className="bg-card rounded-t-3xl px-5 pt-5 pb-8" onPress={(e) => e.stopPropagation()}>
          <View className="items-center mb-4">
            <View className="w-10 h-1 rounded-full bg-border" />
          </View>

          <Text className="text-lg font-bold text-text mb-4">Edit Name</Text>

          <TextInput
            value={value}
            onChangeText={setValue}
            placeholder="Your name"
            placeholderTextColor="#9CA3AF"
            autoCapitalize="words"
            className="border border-border rounded-xl px-4 py-3 text-base text-text mb-4"
          />

          <TouchableOpacity
            onPress={() => isValid && onSave(value.trim())}
            disabled={!isValid || saving}
            className={`rounded-full py-3.5 items-center mb-2 ${isValid && !saving ? "bg-primary" : "bg-disabled"}`}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <View className="flex-row items-center">
                <Ionicons name="checkmark" size={16} color="#fff" />
                <Text className="text-white font-bold ml-1.5">Save</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity className="items-center py-2" onPress={onClose}>
            <Text className="text-text opacity-50 text-sm">Cancel</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}