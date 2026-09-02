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
import { signIn } from "../../services/auth";
import { useAuthStore } from "../../store/authStore";

function mapAuthError(message?: string) {
  if (!message) return "";
  if (message.includes("Invalid login credentials")) return "Incorrect email or password.";
  if (message.includes("Email not confirmed")) return "Please confirm your email before logging in.";
  return message;
}

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
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
      setError(mapAuthError(e.message));
    } finally {
      setLoading(false);
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
          {/* Curved header */}
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

              <Pressable className="flex-row items-center justify-center border border-border rounded-xl h-[50px] bg-card">
                <AntDesign name="google" size={18} color="#DB4437" />
                <Text className="ml-2 text-text font-medium">
                  Continue with Google
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