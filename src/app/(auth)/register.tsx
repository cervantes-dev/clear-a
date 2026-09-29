import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import {
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
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
import AuthInput from "../../components/ui/AuthInput";
import PrimaryButton from "../../components/ui/PrimaryButton";
import WaveHeader from "../../components/ui/WaveHeader";
import { checkEmailRegistration, signInWithGoogle, startSignUp } from "../../services/auth";
import { useAuthStore } from "../../store/authStore";
import { AppUser } from "../../types/auth";

const LRN_PATTERN = /^\d{12}$/;
const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const HEADER_HEIGHT = 130;
const INITIAL_SCALE = HEADER_HEIGHT / SCREEN_HEIGHT;

function mapAuthError(message?: string) {
  if (!message) return "";
  if (message.includes("User already registered")) return "An account with this email already exists.";
  if (message.includes("Password should be at least")) return "Password must be at least 6 characters.";
  if (message.includes("Unable to validate email")) return "That email address looks invalid.";
  return message;
}

// Press-scale wrapper -- shrinks slightly on press, springs back on release.
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

export default function Register() {
  const [name, setName] = useState("");
  const [lrn, setLrn] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreed, setAgreed] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const setUser = useAuthStore((s) => s.setUser);
  const setSuppressRedirect = useAuthStore((s) => s.setSuppressRedirect);

  // Same plain-rectangle, transform-driven curtain as login.tsx -- no SVG
  // curve stretched across the screen, so there's never a gap for the
  // background to show through, and it stays smooth since only
  // transform properties are animated (no layout thrash).
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

  const handleLrnChange = (text: string) => {
    setLrn(text.replace(/\D/g, ""));
  };

  const handleRegister = async () => {
    setError("");
    if (!name || !lrn || !email || !password) {
      setError("Please fill in all fields.");
      return;
    }
    if (!LRN_PATTERN.test(lrn)) {
      setError("LRN must be exactly 12 digits.");
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
      const trimmedEmail = email.trim();

      // Pre-check catches both "already registered manually" and "already
      // registered via Google" before wasting an OTP email on a signup
      // that can never succeed. Unconfirmed existing accounts (an
      // abandoned prior attempt) are allowed through -- startSignUp()
      // naturally resends the code for those instead of erroring.
      const check = await checkEmailRegistration(trimmedEmail);
      if (check.existsAlready && check.confirmed) {
        setError("Email address already taken.");
        setLoading(false);
        return;
      }

      await startSignUp(name.trim(), trimmedEmail, password, lrn);
      router.push({ pathname: "/(auth)/verify-otp", params: { email: trimmedEmail } });
    } catch (e: any) {
      setError(mapAuthError(e.message));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setError("");
    setGoogleLoading(true);
    setSuppressRedirect(true);
    try {
      const user = await signInWithGoogle();
      celebrateAndGo(user, user.role === "staff" ? "/(staff)/dashboard" : "/(student)/home");
    } catch (e: any) {
      setSuppressRedirect(false);
      setError(e.message ?? "Couldn't sign up with Google.");
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
          <Animated.View style={transitioning ? restingHeaderStyle : undefined}>
            <View style={{ position: "relative" }}>
              <WaveHeader height={HEADER_HEIGHT} />

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
          </Animated.View>

          <Animated.View style={formStyle} className="items-center mt-2 px-6">
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
                placeholder="LRN (12-digit Learner Reference Number)"
                value={lrn}
                onChangeText={handleLrnChange}
                keyboardType="number-pad"
                maxLength={12}
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
                  className={`w-5 h-5 rounded border items-center justify-center mr-2 mt-0.5 ${agreed ? "bg-primary border-primary" : "border-border bg-card"
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
                label={loading ? "Creating account..." : "Register"}
                onPress={handleRegister}
                disabled={loading || !agreed || transitioning}
              />

              <View className="flex-row items-center my-5">
                <View className="flex-1 h-[1px] bg-border" />
                <Text className="mx-3 text-text opacity-50 text-xs">OR</Text>
                <View className="flex-1 h-[1px] bg-border" />
              </View>

              <Pressy onPress={handleGoogleSignUp} disabled={googleLoading || transitioning}>
                <View
                  className="flex-row items-center justify-center border border-border rounded-xl h-[50px] bg-card"
                  style={{ opacity: googleLoading ? 0.6 : 1 }}
                >
                  <Ionicons name="logo-google" size={18} color="#DB4437" />
                  <Text className="ml-2 text-text font-medium">
                    {googleLoading ? "Signing up..." : "Continue with Google"}
                  </Text>
                </View>
              </Pressy>

              <View className="flex-row justify-center mt-6 mb-8">
                <Text className="text-text text-sm">Already have an account? </Text>
                <Pressable onPress={() => router.back()}>
                  <Text className="text-primary font-bold text-sm">Login</Text>
                </Pressable>
              </View>
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
          <Text className="text-white font-bold text-base">Welcome!</Text>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}