import { Ionicons } from "@expo/vector-icons";
import { Image, Pressable, Text, View } from "react-native";

type Props = {
  onPress: () => void;
};

export default function SloganCard({ onPress }: Props) {
  return (
    <View className="bg-primary rounded-2xl mx-4 mt-4 px-5 py-5 overflow-hidden">
      <View className="flex-row items-center">
        <View className="flex-1 pr-3">
          <Text className="text-white text-xl font-bold leading-tight">
            Skip the Line,{"\n"}Order Ahead!
          </Text>
          <Text className="text-white/80 text-xs italic mt-2">
            "Basta Sitihinon, Tanan Kayanon"
          </Text>
        </View>

        <Image
          source={require("@/assets/images/home-bags.png")}
          className="w-40 h-40"
          resizeMode="contain"
        />
      </View>

      <Pressable
        onPress={onPress}
        className="flex-row items-center self-start bg-white rounded-full pl-4 pr-1.5 py-1.5 mt-2"
      >
        <Text className="text-primary font-bold text-sm mr-2">Order Now</Text>
        <View className="w-7 h-7 rounded-full bg-primary items-center justify-center">
          <Ionicons name="arrow-forward" size={14} color="#fff" />
        </View>
      </Pressable>
    </View>
  );
}