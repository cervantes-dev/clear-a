import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, TextInput, View } from "react-native";

interface Props {
  icon: keyof typeof Ionicons.glyphMap;
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "email-address";
  autoCapitalize?: "none" | "words" | "sentences" | "characters";
  containerClassName?: string;
}

export default function AuthInput({
  icon,
  placeholder,
  value,
  onChangeText,
  secureTextEntry,
  keyboardType = "default",
  autoCapitalize = "none",
  containerClassName,
}: Props) {
  const [hidden, setHidden] = useState(!!secureTextEntry);

  return (
    <View
      className={`flex-row items-center border border-border rounded-xl bg-card h-[52px] px-4 mb-3 ${
        containerClassName ?? ""
      }`}
    >
      <Ionicons name={icon} size={20} color="#800020" />
      <TextInput
        className="flex-1 ml-3 text-text text-base"
        placeholder={placeholder}
        placeholderTextColor="#C9B8BD"
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={hidden}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
      />
      {secureTextEntry && (
        <Pressable onPress={() => setHidden(!hidden)} hitSlop={8}>
          <Ionicons
            name={hidden ? "eye-off-outline" : "eye-outline"}
            size={20}
            color="#C9B8BD"
          />
        </Pressable>
      )}
    </View>
  );
}