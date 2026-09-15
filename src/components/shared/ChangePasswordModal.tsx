import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { ActivityIndicator, Modal, Pressable, Text, TextInput, TouchableOpacity, View } from "react-native";

type Props = {
  visible: boolean;
  saving: boolean;
  onClose: () => void;
  onSave: (newPassword: string) => void;
};

export default function ChangePasswordModal({ visible, saving, onClose, onSave }: Props) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");

  const reset = () => {
    setPassword("");
    setConfirm("");
    setError("");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSave = () => {
    setError("");
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    onSave(password);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <Pressable className="flex-1 bg-black/40 justify-end" onPress={handleClose}>
        <Pressable className="bg-card rounded-t-3xl px-5 pt-5 pb-8" onPress={(e) => e.stopPropagation()}>
          <View className="items-center mb-4">
            <View className="w-10 h-1 rounded-full bg-border" />
          </View>

          <Text className="text-lg font-bold text-text mb-1">Change Password</Text>
          <Text className="text-text opacity-50 text-xs mb-4">
            Choose a new password for your account.
          </Text>

          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="New password"
            placeholderTextColor="#9CA3AF"
            secureTextEntry
            className="border border-border rounded-xl px-4 py-3 text-base text-text mb-3"
          />
          <TextInput
            value={confirm}
            onChangeText={setConfirm}
            placeholder="Confirm new password"
            placeholderTextColor="#9CA3AF"
            secureTextEntry
            className="border border-border rounded-xl px-4 py-3 text-base text-text mb-4"
          />

          {error ? <Text className="text-danger text-sm mb-3">{error}</Text> : null}

          <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            className={`rounded-full py-3.5 items-center mb-2 ${saving ? "bg-disabled" : "bg-primary"}`}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <View className="flex-row items-center">
                <Ionicons name="lock-closed-outline" size={16} color="#fff" />
                <Text className="text-white font-bold ml-1.5">Update Password</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity className="items-center py-2" onPress={handleClose}>
            <Text className="text-text opacity-50 text-sm">Cancel</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}