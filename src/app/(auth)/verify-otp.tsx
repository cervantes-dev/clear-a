import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Dimensions, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import PrimaryButton from "../../components/ui/PrimaryButton";
import WaveHeader from "../../components/ui/WaveHeader";
import { resendSignupOtp, verifySignupOtp } from "../../services/auth";
import { useAuthStore } from "../../store/authStore";
import { AppUser } from "../../types/auth";

const RESEND_COOLDOWN_SECONDS = 30;
const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const HEADER_HEIGHT = 130;
const INITIAL_SCALE = HEADER_HEIGHT / SCREEN_HEIGHT;

export default function VerifyOtp() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();
  const setUser = useAuthStore((s) => s.setUser);
  const setSuppressRedirect = useAuthStore((s) => s.setSuppressRedirect);

  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const [transitioning, setTransitioning] = useState(false);

  // Same plain-rectangle, transform-driven curtain as login.tsx and
  // register.tsx -- no SVG curve stretched across the screen, no layout
  // thrash, just a smooth full-coverage reveal.
  const curtainScale = useSharedValue(INITIAL_SCALE);
  const restingHeaderOpacity = useSharedValue(1);
  const formOpacity = useSharedValue(1);
  const checkScale = useSharedValue(0);
  const checkOpacity = useSharedValue(0);

  const curtainStyle = useAnimatedStyle(() => {
    const s = curtainScale.value;
    return {
      transform: [{ translateY: (s - 1) * (SCREEN_HEIGHT / 2) }, { scaleY: s }],
    };
  });
  const restingHeaderStyle = useAnimatedStyle(() => ({
    opacity: restingHeaderOpacity.value,
  }));
  const formStyle = useAnimatedStyle(() => ({
    opacity: formOpacity.value,
  }));
  const checkStyle = useAnimatedStyle(() => ({
    opacity: checkOpacity.value,
    transform: [{ scale: checkScale.value }],
  }));

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  // Runs once the curtain has visually finished covering the screen.
  // suppressRedirect keeps RootLayout from acting on the store's user
  // (which Supabase's own auth listener can also set independently) until
  // we clear it here and navigate ourselves.
  const finishLogin = (user: AppUser, destination: string) => {
    setUser(user);
    setSuppressRedirect(false);
    router.replace(destination as any);
  };

  const celebrateAndGo = (user: AppUser, destination: string) => {
    setTransitioning(true);
    restingHeaderOpacity.value = withTiming(0, { duration: 150 });
    formOpacity.value = withTiming(0, { duration: 200 });

    checkOpacity.value = withDelay(400, withTiming(1, { duration: 200 }));
    checkScale.value = withDelay(400, withSpring(1, { damping: 8, stiffness: 140 }));

    curtainScale.value = withTiming(
      1,
      { duration: 600, easing: Easing.out(Easing.cubic) },
      (finished) => {
        if (finished) {
          runOnJS(finishLogin)(user, destination);
        }
      }
    );
  };

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
    // Set before verifySignupOtp() -- Supabase's own auth listener in
    // RootLayout can fire the instant the session changes, independently
    // of this screen. Suppressing the redirect up front closes that race.
    setSuppressRedirect(true);
    try {
      const user = await verifySignupOtp(email, code.trim());
      // A freshly-verified email/password signup is always a student (per
      // the registration form), but this stays role-aware for consistency
      // with login.tsx and register.tsx.
      celebrateAndGo(user, user.role === "staff" ? "/(staff)/dashboard" : "/(student)/home");
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
          scrollEnabled={!transitioning}
        >
          <Animated.View style={transitioning ? restingHeaderStyle : undefined}>
            <WaveHeader height={HEADER_HEIGHT} />
          </Animated.View>

          <Animated.View style={formStyle} className="items-center mt-4 px-6">
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
                editable={!transitioning}
                className="border border-border rounded-xl bg-card h-[56px] px-4 text-text text-2xl font-bold text-center mb-3"
                style={{ letterSpacing: 8 }}
              />

              {error ? <Text className="text-danger text-sm mb-3 text-center">{error}</Text> : null}

              <PrimaryButton
                label={loading ? "Verifying..." : "Verify"}
                onPress={handleVerify}
                disabled={loading || transitioning}
              />

              <Pressable
                onPress={handleResend}
                disabled={cooldown > 0 || resending || transitioning}
                className="items-center mt-5 mb-8"
              >
                <Text className={`text-sm ${cooldown > 0 ? "text-text opacity-40" : "text-primary font-semibold"}`}>
                  {resending ? "Resending..." : cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => router.replace("/(auth)/login")}
                disabled={transitioning}
                className="items-center"
              >
                <Text className="text-text opacity-50 text-sm">Cancel and go back to login</Text>
              </Pressable>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      {transitioning && (
        <Animated.View
          pointerEvents="none"
          style={[
            curtainStyle,
            {
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: SCREEN_HEIGHT,
              backgroundColor: "#800020",
            },
          ]}
        />
      )}

      {transitioning && (
        <Animated.View
          pointerEvents="none"
          style={[
            checkStyle,
            {
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              alignItems: "center",
              justifyContent: "center",
            },
          ]}
        >
          <View className="w-16 h-16 rounded-full bg-white/20 items-center justify-center mb-3">
            <Ionicons name="checkmark" size={34} color="#fff" />
          </View>
          <Text className="text-white font-bold text-base">Verified!</Text>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}