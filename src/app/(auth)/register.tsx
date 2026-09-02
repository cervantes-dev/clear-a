import { Ionicons } from "@expo/vector-icons";
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
import PrimaryButton from "../../components/ui/PrimaryButton";
import WaveHeader from "../../components/ui/WaveHeader";
import { signUp } from "../../services/auth";
import { useAuthStore } from "../../store/authStore";

function mapAuthError(message?: string) {
  if (!message) return "";
  if (message.includes("User already registered")) return "An account with this email already exists.";
  if (message.includes("Password should be at least")) return "Password must be at least 6 characters.";
  if (message.includes("Unable to validate email")) return "That email address looks invalid.";
  return message;
}

export default function Register() {
  const [name, setName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreed, setAgreed] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const setUser = useAuthStore((s) => s.setUser);

  const handleRegister = async () => {
    setError("");
    if (!name || !studentId || !email || !password) {
      setError("Please fill in all fields.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (!agreed) {
      setError("Please agree to the Terms of Service and Privacy Policy.");
      return;
    }

    setLoading(true);
    try {
      const user = await signUp(name.trim(), email.trim(), password, studentId.trim());
      setUser(user);
      router.replace("/(student)/home");
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
          {/* Wave header with back button + title */}
          {/* Wave header (background shape only) */}
          <View style={{ position: "relative" }}>
            <WaveHeader height={130} />

            {/* Title row - fully independent of header size, always pinned here */}
            <View
              style={{
                position: "absolute",
                top: 45,
                left: 0,
                right: 0,
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 20,
              }}
            >
              <Pressable onPress={() => router.back()} hitSlop={8}>
                <Ionicons name="arrow-back" size={24} color="#fff" />
              </Pressable>
              <Text
                style={{ flex: 1, textAlign: "center", marginRight: 24 }}
                className="text-white text-lg font-bold"
              >
                Create Account
              </Text>
            </View>
          </View>

          <View className="items-center mt-2 px-6">
            <Image
              source={require("../../../assets/images/logo.png")}
              style={{ width: 150, height: 115 }}
              resizeMode="contain"
            />

            <Text className="text-2xl font-bold text-text mt-1">
              Create Your Account
            </Text>
            <Text className="text-text opacity-60 mt-1 mb-4">
              Fill in your details to get started
            </Text>

            <View className="w-full">
              <AuthInput
                icon="card-outline"
                placeholder="Student ID"
                value={studentId}
                onChangeText={setStudentId}
              />
              <AuthInput
                icon="person-outline"
                placeholder="Full Name"
                value={name}
                onChangeText={setName}
              />

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
              <AuthInput
                icon="lock-closed-outline"
                placeholder="Confirm Password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
              />

              <Text className="text-text font-medium mb-2">I am a</Text>
              <View className="flex-row items-center border border-border rounded-xl bg-card py-3 px-4 mb-4">
                <Ionicons name="school-outline" size={18} color="#800020" />
                <Text className="ml-2 font-semibold text-text">Student</Text>
              </View>

              {error ? (
                <Text className="text-danger text-sm mb-3">{error}</Text>
              ) : null}

              <Pressable
                onPress={() => setAgreed(!agreed)}
                className="flex-row items-start mb-5"
              >
                <View
                  className={`w-5 h-5 rounded border items-center justify-center mr-2 mt-0.5 ${
                    agreed ? "bg-primary border-primary" : "border-border bg-card"
                  }`}
                >
                  {agreed && <Ionicons name="checkmark" size={14} color="#fff" />}
                </View>
                <Text className="flex-1 text-xs text-text">
                  I agree to the{" "}
                  <Text className="text-primary font-semibold">
                    Terms of Service
                  </Text>{" "}
                  and{" "}
                  <Text className="text-primary font-semibold">
                    Privacy Policy
                  </Text>
                </Text>
              </Pressable>

              <PrimaryButton
                label="Register"
                onPress={handleRegister}
                loading={loading}
                disabled={!agreed}
              />

              <View className="flex-row justify-center mt-6 mb-8">
                <Text className="text-text text-sm">Already have an account? </Text>
                <Pressable onPress={() => router.back()}>
                  <Text className="text-primary font-bold text-sm">Login</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}