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
      disabled={isDisabled}
      className={`h-[50px] rounded-xl items-center justify-center mt-2 ${
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