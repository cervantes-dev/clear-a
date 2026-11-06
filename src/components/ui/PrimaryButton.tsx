import * as Haptics from "expo-haptics";
import { ActivityIndicator, Pressable, Text } from "react-native";

interface Props {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: "primary" | "outline";
}

export default function PrimaryButton({
  label,
  onPress,
  loading,
  disabled,
  variant = "primary",
}: Props) {
  const isOutline = variant === "outline";
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      // Light tick the instant the finger lands, so a tap is felt even when
      // the finger hides the button. No animated transform involved.
      onPressIn={() => {
        if (!isDisabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }}
      disabled={isDisabled}
      android_ripple={{
        color: isOutline ? "rgba(128,0,32,0.15)" : "rgba(255,255,255,0.3)",
      }}
      className={`h-[50px] rounded-xl items-center justify-center mt-2 overflow-hidden active:opacity-80 ${
        isDisabled
          ? "bg-disabled border-disabled"
          : isOutline
          ? "bg-transparent border-[1.5px] border-primary"
          : "bg-primary"
      }`}
    >
      {loading ? (
        <ActivityIndicator color={isOutline ? "#800020" : "#fff"} />
      ) : (
        <Text
          className={`font-semibold text-base ${
            isOutline ? "text-primary" : "text-white"
          }`}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}