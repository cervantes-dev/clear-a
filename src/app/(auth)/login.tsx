import { AntDesign, Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import Animated, {
  Easing,
  FadeInDown,
  FadeInUp,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import AuthInput from "../../components/ui/AuthInput";
import CurvedHeader from "../../components/ui/CurvedHeader";
import PrimaryButton from "../../components/ui/PrimaryButton";
import { resendSignupOtp, signIn, signInWithGoogle } from "../../services/auth";
import { useAuthStore } from "../../store/authStore";
import { AppUser } from "../../types/auth";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const HEADER_HEIGHT = 120;
// Starting scale so the curtain's visible height matches the resting header
// exactly, before it grows to fully cover the screen (scale 1).
const INITIAL_SCALE = HEADER_HEIGHT / SCREEN_HEIGHT;

function mapAuthError(message?: string) {
  if (!message) return "";
  if (message.includes("Invalid login credentials")) return "Incorrect email or password.";
  return message;
}

// Press-scale wrapper -- shrinks slightly on press, springs back on release.
// Kept local to this screen rather than touching PrimaryButton, which other
// screens use as-is.
function Pressy({
  onPress,
  disabled,
  children,
}: {
  onPress?: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        onPressIn={() => {
          scale.value = withTiming(0.96, { duration: 100 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 12, stiffness: 200 });
        }}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const setUser = useAuthStore((s) => s.setUser);
  const setSuppressRedirect = useAuthStore((s) => s.setSuppressRedirect);

  // Shake target -- wraps the form fields + error text
  const shakeX = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  // Success reveal. The curtain is a plain rectangle, fixed at SCREEN_HEIGHT
  // tall, grown purely via transform (scaleY + a compensating translateY so
  // it expands downward from a pinned top edge instead of from its center).
  // A plain rectangle guarantees full coverage at every frame -- no curved
  // SVG involved, so there's no dip/gap for the background to show through,
  // and transform-only animation never touches layout, so it stays smooth.
  const curtainScale = useSharedValue(INITIAL_SCALE);
  const restingHeaderOpacity = useSharedValue(1);
  const formOpacity = useSharedValue(1);
  const checkScale = useSharedValue(0);
  const checkOpacity = useSharedValue(0);

  const curtainStyle = useAnimatedStyle(() => {
    const s = curtainScale.value;
    return {
      transform: [
        { translateY: (s - 1) * (SCREEN_HEIGHT / 2) },
        { scaleY: s },
      ],
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
    if (error) {
      shakeX.value = withSequence(
        withTiming(-8, { duration: 50 }),
        withTiming(8, { duration: 50 }),
        withTiming(-6, { duration: 50 }),
        withTiming(6, { duration: 50 }),
        withTiming(0, { duration: 50 })
      );
    }
  }, [error]);

  // Runs once the curtain is visually finished covering the screen: this is
  // the only place setUser() and the actual navigation happen. suppressRedirect
  // keeps RootLayout from acting on the store's user until we clear it here.
  const finishLogin = (user: AppUser, destination: string) => {
    setUser(user);
    setSuppressRedirect(false);
    router.replace(destination as any);
  };

  // Crossfades the curvy resting header into the flat curtain, then grows
  // the curtain to fill the screen. Navigates from the animation's own
  // completion callback, not a guessed timeout.
  const celebrateAndGo = (user: AppUser, destination: string) => {
    setTransitioning(true);

    // Quick crossfade so the curvy header doesn't just pop away
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

  const handleLogin = async () => {
    setError("");
    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setLoading(true);
    // Set before signIn() -- Supabase's own auth listener in RootLayout can
    // fire the instant the session changes, independently of this screen.
    // Suppressing the redirect up front (not after signIn resolves) closes
    // that race entirely.
    setSuppressRedirect(true);
    try {
      const user = await signIn(email.trim(), password);
      celebrateAndGo(user, user.role === "staff" ? "/(staff)/dashboard" : "/(student)/home");
    } catch (e: any) {
      setSuppressRedirect(false);
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
    setSuppressRedirect(true);
    try {
      const user = await signInWithGoogle();
      celebrateAndGo(user, user.role === "staff" ? "/(staff)/dashboard" : "/(student)/home");
    } catch (e: any) {
      setSuppressRedirect(false);
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
          scrollEnabled={!transitioning}
        >
          {/* Resting curvy header -- only ever visible before a transition
              starts; fades out (not swapped abruptly) once one begins. */}
          {transitioning ? (
            <Animated.View style={restingHeaderStyle}>
              <CurvedHeader height={HEADER_HEIGHT} />
            </Animated.View>
          ) : (
            <CurvedHeader height={HEADER_HEIGHT} />
          )}

          <Animated.View style={formStyle} className="items-center mt-2 px-6">
            <Animated.Image
              entering={FadeInDown.duration(600).springify()}
              source={require("../../../assets/images/logo.png")}
              style={{ width: 250, height: 250 }}
              resizeMode="contain"
            />

            <Animated.View entering={FadeInUp.delay(150).duration(500)} className="items-center">
              <Text className="text-2xl font-bold text-text mt-2">Welcome Back!</Text>
              <Text className="text-text opacity-60 mt-1 mb-6">
                Login to continue to your account
              </Text>
            </Animated.View>

            <Animated.View
              entering={FadeInUp.delay(280).duration(500)}
              style={[shakeStyle, { width: "100%" }]}
            >
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
                <Animated.Text
                  entering={FadeInDown.duration(250)}
                  className="text-danger text-sm mb-2"
                >
                  {error}
                </Animated.Text>
              ) : null}

              <Pressable className="self-end mb-4">
                <Text className="text-primary font-semibold text-sm">
                  Forgot Password?
                </Text>
              </Pressable>

              <PrimaryButton
                label={loading ? "Logging in..." : "Login"}
                onPress={handleLogin}
                disabled={loading || transitioning}
              />

              <View className="flex-row items-center my-5">
                <View className="flex-1 h-[1px] bg-border" />
                <Text className="mx-3 text-text opacity-50 text-xs">OR</Text>
                <View className="flex-1 h-[1px] bg-border" />
              </View>

              <Pressy onPress={handleGoogleLogin} disabled={googleLoading || transitioning}>
                <View
                  className="flex-row items-center justify-center border border-border rounded-xl h-[50px] bg-card"
                  style={{ opacity: googleLoading ? 0.6 : 1 }}
                >
                  <AntDesign name="google" size={18} color="#DB4437" />
                  <Text className="ml-2 text-text font-medium">
                    {googleLoading ? "Signing in..." : "Continue with Google"}
                  </Text>
                </View>
              </Pressy>

              <View className="flex-row justify-center mt-6 mb-8">
                <Text className="text-text text-sm">Don't have an account? </Text>
                <Pressable onPress={() => router.push("/(auth)/register")}>
                  <Text className="text-primary font-bold text-sm">Register</Text>
                </Pressable>
              </View>
            </Animated.View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Plain-rectangle curtain -- fixed SCREEN_HEIGHT tall, grown only via
          transform. No SVG curve here at all, so there is no dip/gap for the
          background to ever show through, at any point mid-animation. */}
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

      {/* Checkmark reveal -- separate layer, unaffected by the curtain's own
          scaleY, so it never gets stretched. */}
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
          <Text className="text-white font-bold text-base">Welcome back!</Text>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}