import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AuthInput from "../components/ui/AuthInput";
import PrimaryButton from "../components/ui/PrimaryButton";
import WaveHeader from "../components/ui/WaveHeader";
import { completeStudentProfile, signOutUser } from "../services/auth";
import { useAuthStore } from "../store/authStore";

const LRN_PATTERN = /^\d{12}$/;

export default function CompleteProfile() {
  const { user, setUser } = useAuthStore();
  const [lrn, setLrn] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLrnChange = (text: string) => {
    setLrn(text.replace(/\D/g, ""));
  };

  const handleSubmit = async () => {
    setError("");
    if (!lrn) {
      setError("Please enter your LRN.");
      return;
    }
    if (!LRN_PATTERN.test(lrn)) {
      setError("LRN must be exactly 12 digits.");
      return;
    }
    setLoading(true);
    try {
      await completeStudentProfile(lrn);
      if (user) setUser({ ...user, lrn });
    } catch (e: any) {
      setError(e.message ?? "Couldn't save your LRN. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    await signOutUser();
    setUser(null);
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom"]}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          className="flex-1 bg-background"
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <WaveHeader height={130} />

          <View className="items-center mt-4 px-6">
            <View className="w-16 h-16 rounded-full bg-primary/10 items-center justify-center mb-4">
              <Ionicons name="card-outline" size={28} color="#800020" />
            </View>

            <Text className="text-2xl font-bold text-text text-center">One more step</Text>
            <Text className="text-text opacity-60 mt-1 mb-6 text-center">
              Enter your 12-digit LRN to finish setting up your account.
            </Text>

            <View className="w-full">
              <AuthInput
                icon="card-outline"
                placeholder="LRN (12 digits)"
                value={lrn}
                onChangeText={handleLrnChange}
                keyboardType="number-pad"
                maxLength={12}
              />

              {error ? <Text className="text-danger text-sm mb-2">{error}</Text> : null}

              <PrimaryButton label="Continue" onPress={handleSubmit} loading={loading} />

              <Pressable onPress={handleCancel} className="items-center mt-5 mb-8">
                <Text className="text-text opacity-50 text-sm">Cancel and sign out</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}