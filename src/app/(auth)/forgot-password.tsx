import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import AuthInput from "../../components/ui/AuthInput";
import CurvedHeader from "../../components/ui/CurvedHeader";
import PrimaryButton from "../../components/ui/PrimaryButton";
import {
  changePassword,
  sendPasswordResetOtp,
  signOutUser,
  verifyPasswordResetOtp,
} from "../../services/auth";
import { useAuthStore } from "../../store/authStore";

type Step = "email" | "code" | "password" | "done";

const RESEND_COOLDOWN_SECONDS = 30;
// Same CurvedHeader as login. Taller than login's 120 so the title fits
// inside the shallower middle of the curve.
const HEADER_HEIGHT = 150;

export default function ForgotPassword() {
  const router = useRouter();
  const setSuppressRedirect = useAuthStore((s) => s.setSuppressRedirect);

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // True between a successful code check and the finished password change.
  // Verifying the code creates a real session; if the user leaves in that
  // window (back button, swipe, Android back) we must sign it out again so
  // they aren't silently logged in without ever setting a new password.
  const verifiedRef = useRef(false);

  useEffect(() => {
    return () => {
      if (verifiedRef.current) {
        signOutUser()
          .catch(() => {})
          .finally(() => setSuppressRedirect(false));
      }
    };
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const handleBack = () => {
    setError("");
    if (step === "code") {
      setCode("");
      setStep("email");
      return;
    }
    router.back();
  };

  const handleSendCode = async () => {
    setError("");
    const trimmed = email.trim();
    if (!trimmed) {
      setError("Please enter your email address.");
      return;
    }
    setLoading(true);
    try {
      await sendPasswordResetOtp(trimmed);
      setCode("");
      setCooldown(RESEND_COOLDOWN_SECONDS);
      setStep("code");
    } catch (e: any) {
      setError(e.message ?? "Couldn't send the code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || loading) return;
    setError("");
    setLoading(true);
    try {
      await sendPasswordResetOtp(email.trim());
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (e: any) {
      setError(e.message ?? "Couldn't resend the code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setError("");
    if (code.trim().length !== 6) {
      setError("Enter the 6-digit code from your email.");
      return;
    }
    setLoading(true);
    // Set before verifying -- the session this creates would otherwise let
    // RootLayout redirect into the app before the new password is saved.
    setSuppressRedirect(true);
    try {
      await verifyPasswordResetOtp(email.trim(), code.trim());
      verifiedRef.current = true;
      setStep("password");
    } catch (e: any) {
      setSuppressRedirect(false);
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

  const handleSetPassword = async () => {
    setError("");
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      await changePassword(password);
      // Back to a logged-out state so they sign in with the new password.
      await signOutUser();
      verifiedRef.current = false;
      setSuppressRedirect(false);
      setStep("done");
    } catch (e: any) {
      setError(e.message ?? "Couldn't update your password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom"]}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          className="flex-1 bg-background"
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ position: "relative" }}>
            <CurvedHeader height={HEADER_HEIGHT} />
            <View
              style={{
                position: "absolute",
                top: 38,
                left: 0,
                right: 0,
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 20,
              }}
            >
              {step !== "done" ? (
                <Pressable onPress={handleBack} hitSlop={8}>
                  <Ionicons name="arrow-back" size={24} color="#fff" />
                </Pressable>
              ) : (
                <View style={{ width: 24 }} />
              )}
              <Text
                style={{ flex: 1, textAlign: "center", marginRight: 24 }}
                className="text-white text-lg font-bold"
              >
                Reset Password
              </Text>
            </View>
          </View>

          <Animated.View
            key={step}
            entering={FadeInDown.duration(300)}
            className="items-center mt-4 px-6"
          >
            {step === "email" && (
              <>
                <View className="w-16 h-16 rounded-full bg-primary/10 items-center justify-center mb-4">
                  <Ionicons name="lock-open-outline" size={28} color="#800020" />
                </View>
                <Text className="text-2xl font-bold text-text text-center">Forgot password?</Text>
                <Text className="text-text opacity-60 mt-1 mb-6 text-center">
                  Enter your email and we'll send you a 6-digit code to reset it.
                </Text>

                <View className="w-full">
                  <AuthInput
                    icon="mail-outline"
                    placeholder="Email Address"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                  />
                  {error ? <Text className="text-danger text-sm mb-3">{error}</Text> : null}
                  <PrimaryButton
                    label={loading ? "Sending..." : "Send Code"}
                    onPress={handleSendCode}
                    disabled={loading}
                  />
                </View>
              </>
            )}

            {step === "code" && (
              <>
                <View className="w-16 h-16 rounded-full bg-primary/10 items-center justify-center mb-4">
                  <Ionicons name="mail-open-outline" size={28} color="#800020" />
                </View>
                <Text className="text-2xl font-bold text-text text-center">Check your email</Text>
                <Text className="text-text opacity-60 mt-1 mb-6 text-center">
                  If an account exists for{"\n"}
                  <Text className="font-semibold text-text">{email.trim()}</Text>
                  {"\n"}we sent a 6-digit code.
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
                  {error ? (
                    <Text className="text-danger text-sm mb-3 text-center">{error}</Text>
                  ) : null}
                  <PrimaryButton
                    label={loading ? "Verifying..." : "Verify"}
                    onPress={handleVerify}
                    disabled={loading}
                  />

                  <Pressable
                    onPress={handleResend}
                    disabled={cooldown > 0 || loading}
                    className="items-center mt-5"
                  >
                    <Text
                      className={`text-sm ${
                        cooldown > 0 ? "text-text opacity-40" : "text-primary font-semibold"
                      }`}
                    >
                      {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
                    </Text>
                  </Pressable>
                </View>
              </>
            )}

            {step === "password" && (
              <>
                <View className="w-16 h-16 rounded-full bg-primary/10 items-center justify-center mb-4">
                  <Ionicons name="key-outline" size={28} color="#800020" />
                </View>
                <Text className="text-2xl font-bold text-text text-center">New password</Text>
                <Text className="text-text opacity-60 mt-1 mb-6 text-center">
                  Choose a new password for your account.
                </Text>

                <View className="w-full">
                  <AuthInput
                    icon="lock-closed-outline"
                    placeholder="New Password"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                  />
                  <AuthInput
                    icon="lock-closed-outline"
                    placeholder="Confirm New Password"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                  />
                  {error ? <Text className="text-danger text-sm mb-3">{error}</Text> : null}
                  <PrimaryButton
                    label={loading ? "Saving..." : "Update Password"}
                    onPress={handleSetPassword}
                    disabled={loading}
                  />
                </View>
              </>
            )}

            {step === "done" && (
              <>
                <View className="w-16 h-16 rounded-full bg-primary/10 items-center justify-center mb-4">
                  <Ionicons name="checkmark" size={32} color="#800020" />
                </View>
                <Text className="text-2xl font-bold text-text text-center">Password updated</Text>
                <Text className="text-text opacity-60 mt-1 mb-6 text-center">
                  You can now log in with your new password.
                </Text>

                <View className="w-full">
                  <PrimaryButton
                    label="Back to Login"
                    onPress={() => router.replace("/(auth)/login")}
                  />
                </View>
              </>
            )}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}