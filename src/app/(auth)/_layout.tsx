import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="login" />
      <Stack.Screen
        name="register"
        options={{ animation: "slide_from_right", animationDuration: 300 }}
      />
      <Stack.Screen name="verify-otp" />
      <Stack.Screen
        name="forgot-password"
        options={{ animation: "slide_from_right", animationDuration: 300 }}
      />
    </Stack>
  );
}