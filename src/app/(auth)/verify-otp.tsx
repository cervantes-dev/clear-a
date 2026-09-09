import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import PrimaryButton from "../../components/ui/PrimaryButton";
import WaveHeader from "../../components/ui/WaveHeader";
import { resendSignupOtp, verifySignupOtp } from "../../services/auth";
import { useAuthStore } from "../../store/authStore";

const RESEND_COOLDOWN_SECONDS = 30;

export default function VerifyOtp() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();
  const setUser = useAuthStore((s) => s.setUser);

  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const handleVerify = async () => {
    setError("");
    if (code.trim().length !== 6) {
      setError("Enter the 6-digit code from your email.");
      return;
    }
    if (!email) {
      setError("Missing email. Please go back and try registering again.");
      return;
    }
    setLoading(true);
    try {
      const user = await verifySignupOtp(email, code.trim());
      setUser(user);
      // Root layout's redirect effect takes it from here -- straight to
      // /(student)/home, since a freshly-verified email/password student
      // already has an LRN from the registration form.
    } catch (e: any) {
      const msg = e.message ?? "";
      setError(
        msg.includes("expired") || msg.includes("invalid") || msg.includes("Token")
          ? "That code is invalid or expired. Please request a new one."
          : msg || "Couldn't verify your code. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email || cooldown > 0) return;
    setResending(true);
    setError("");
    try {
      await resendSignupOtp(email);
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (e: any) {
      setError(e.message ?? "Couldn't resend the code. Please try again.");
    } finally {
      setResending(false);
    }
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
              <Ionicons name="mail-open-outline" size={28} color="#800020" />
            </View>

            <Text className="text-2xl font-bold text-text text-center">Check your email</Text>
            <Text className="text-text opacity-60 mt-1 mb-6 text-center">
              We sent a 6-digit code to{"\n"}
              <Text className="font-semibold text-text">{email}</Text>
            </Text>

            <View className="w-full">
              <TextInput
                value={code}
                onChangeText={(t) => setCode(t.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                placeholderTextColor="#C9B8BD"
                keyboardType="number-pad"
                maxLength={6}
                className="border border-border rounded-xl bg-card h-[56px] px-4 text-text text-2xl font-bold text-center mb-3"
                style={{ letterSpacing: 8 }}
              />

              {error ? <Text className="text-danger text-sm mb-3 text-center">{error}</Text> : null}

              <PrimaryButton label="Verify" onPress={handleVerify} loading={loading} />

              <Pressable
                onPress={handleResend}
                disabled={cooldown > 0 || resending}
                className="items-center mt-5 mb-8"
              >
                <Text className={`text-sm ${cooldown > 0 ? "text-text opacity-40" : "text-primary font-semibold"}`}>
                  {resending ? "Resending..." : cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
                </Text>
              </Pressable>

              <Pressable onPress={() => router.replace("/(auth)/login")} className="items-center">
                <Text className="text-text opacity-50 text-sm">Cancel and go back to login</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}