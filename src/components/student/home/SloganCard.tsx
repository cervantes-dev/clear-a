import { Image, Text, View } from "react-native";

export default function SloganCard() {
  return (
    <View className="flex-row items-center bg-primary rounded-2xl mx-4 mt-4 px-5 py-5 overflow-hidden">
      <View className="flex-1 pr-3">
        <Text className="text-white text-xl font-bold leading-tight">
          Skip the Line,{"\n"}Order Online!
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
  );
}