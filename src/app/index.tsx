import AsyncStorage from "@react-native-async-storage/async-storage";
import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { ONBOARDING_STORAGE_KEY } from "../constants/onboarding-content";

export default function Index() {
  const [target, setTarget] = useState<"/(auth)/onboarding" | "/(auth)/login" | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_STORAGE_KEY)
      .then((value) => {
        console.log("onboarding flag value:", value);
        setTarget(value === "true" ? "/(auth)/login" : "/(auth)/onboarding");
      })
      .catch((e) => {
        console.log("onboarding flag read failed:", e);
        setTarget("/(auth)/login");
      });
  }, []);

  // Renders nothing while the flag is being read -- this resolves in a
  // handful of milliseconds (local AsyncStorage read), so there's nothing
  // worth a splash/spinner for here.
  if (!target) return null;

  return <Redirect href={target} />;
}