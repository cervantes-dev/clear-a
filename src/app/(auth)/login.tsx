import { AntDesign } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AuthInput from "../../components/ui/AuthInput";
import CurvedHeader from "../../components/ui/CurvedHeader";
import PrimaryButton from "../../components/ui/PrimaryButton";
import { resendSignupOtp, signIn, signInWithGoogle } from "../../services/auth";
import { useAuthStore } from "../../store/authStore";

function mapAuthError(message?: string) {
  if (!message) return "";
  if (message.includes("Invalid login credentials")) return "Incorrect email or password.";
  return message;
}

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const setUser = useAuthStore((s) => s.setUser);

  const handleLogin = async () => {
    setError("");
    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setLoading(true);
    try {
      const user = await signIn(email.trim(), password);
      setUser(user);
      router.replace(user.role === "staff" ? "/(staff)/dashboard" : "/(student)/home");
    } catch (e: any) {
      if (e.message?.includes("Email not confirmed")) {
        // They have a valid account, just never finished OTP verification --
        // send them there instead of just showing an error.
        try {
          await resendSignupOtp(email.trim());
        } catch {
          // verify-otp screen has its own resend control if this fails
        }
        router.push({ pathname: "/(auth)/verify-otp", params: { email: email.trim() } });
        return;
      }
      setError(mapAuthError(e.message));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    setGoogleLoading(true);
    try {
      const user = await signInWithGoogle();
      setUser(user);
    } catch (e: any) {
      setError(e.message ?? "Couldn't sign in with Google.");
    } finally {
      setGoogleLoading(false);
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
          <CurvedHeader height={120} />

          <View className="items-center mt-2 px-6">
            <Image
              source={require("../../../assets/images/logo.png")}
              style={{ width: 250, height: 250 }}
              resizeMode="contain"
            />

            <Text className="text-2xl font-bold text-text mt-2">Welcome Back!</Text>
            <Text className="text-text opacity-60 mt-1 mb-6">
              Login to continue to your account
            </Text>

            <View className="w-full">
              <AuthInput
                icon="mail-outline"
                placeholder="Email Address"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
              />
              <AuthInput
                icon="lock-closed-outline"
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />

              {error ? (
                <Text className="text-danger text-sm mb-2">{error}</Text>
              ) : null}

              <Pressable className="self-end mb-4">
                <Text className="text-primary font-semibold text-sm">
                  Forgot Password?
                </Text>
              </Pressable>

              <PrimaryButton label="Login" onPress={handleLogin} loading={loading} />

              <View className="flex-row items-center my-5">
                <View className="flex-1 h-[1px] bg-border" />
                <Text className="mx-3 text-text opacity-50 text-xs">OR</Text>
                <View className="flex-1 h-[1px] bg-border" />
              </View>

              <Pressable
                onPress={handleGoogleLogin}
                disabled={googleLoading}
                className="flex-row items-center justify-center border border-border rounded-xl h-[50px] bg-card"
                style={{ opacity: googleLoading ? 0.6 : 1 }}
              >
                <AntDesign name="google" size={18} color="#DB4437" />
                <Text className="ml-2 text-text font-medium">
                  {googleLoading ? "Signing in..." : "Continue with Google"}
                </Text>
              </Pressable>

              <View className="flex-row justify-center mt-6 mb-8">
                <Text className="text-text text-sm">Don't have an account? </Text>
                <Pressable onPress={() => router.push("/(auth)/register")}>
                  <Text className="text-primary font-bold text-sm">Register</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}