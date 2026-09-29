import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useRef, useState } from "react";
import { Dimensions, Image, ImageSourcePropType, Pressable, Text, View } from "react-native";
import Animated, {
  interpolate,
  interpolateColor,
  SharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { ONBOARDING_SLIDES, ONBOARDING_STORAGE_KEY } from "../../constants/onboarding-content";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

function Slide({ index, scrollX, image, title, description }: {
  index: number;
  scrollX: SharedValue<number>;
  image: ImageSourcePropType;
  title: string;
  description: string;
}) {
  const inputRange = [
    (index - 1) * SCREEN_WIDTH,
    index * SCREEN_WIDTH,
    (index + 1) * SCREEN_WIDTH,
  ];

  const contentStyle = useAnimatedStyle(() => {
    const opacity = interpolate(scrollX.value, inputRange, [0, 1, 0]);
    const scale = interpolate(scrollX.value, inputRange, [0.85, 1, 0.85]);
    const translateY = interpolate(scrollX.value, inputRange, [24, 0, 24]);
    return {
      opacity,
      transform: [{ scale }, { translateY }],
    };
  });

  const imageStyle = useAnimatedStyle(() => {
    const scale = interpolate(scrollX.value, inputRange, [0.85, 1, 0.85]);
    const opacity = interpolate(scrollX.value, inputRange, [0, 1, 0]);
    return {
      opacity,
      transform: [{ scale }],
    };
  });

  return (
    <View style={{ width: SCREEN_WIDTH }} className="items-center justify-center px-8">
      <Animated.View style={imageStyle} className="items-center justify-center mb-8">
        <Image
          source={image}
          style={{ width: SCREEN_WIDTH * 0.8, height: SCREEN_WIDTH * 0.8 }}
          resizeMode="contain"
        />
      </Animated.View>

      <Animated.View style={contentStyle} className="items-center">
        <Text className="text-2xl font-bold text-text text-center mb-3">{title}</Text>
        <Text className="text-text opacity-60 text-center leading-6">{description}</Text>
      </Animated.View>
    </View>
  );
}

function Dot({ index, scrollX }: { index: number; scrollX: SharedValue<number> }) {
  const inputRange = [
    (index - 1) * SCREEN_WIDTH,
    index * SCREEN_WIDTH,
    (index + 1) * SCREEN_WIDTH,
  ];

  const dotStyle = useAnimatedStyle(() => {
    const width = interpolate(scrollX.value, inputRange, [8, 24, 8]);
    const backgroundColor = interpolateColor(
      scrollX.value,
      inputRange,
      ["#ECECF2", "#800020", "#ECECF2"]
    );
    return { width, backgroundColor };
  });

  return <Animated.View style={[dotStyle, { height: 8, borderRadius: 4, marginHorizontal: 4 }]} />;
}

export default function Onboarding() {
  const scrollRef = useRef<Animated.ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollX = useSharedValue(0);
  const isLast = activeIndex === ONBOARDING_SLIDES.length - 1;

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

  const finish = async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
    } catch {
      // If storage fails, worst case onboarding shows again next launch --
      // not worth blocking navigation over.
    }
    router.replace("/(auth)/login");
  };

  const handleNext = () => {
    if (isLast) {
      finish();
      return;
    }
    const nextIndex = activeIndex + 1;
    scrollRef.current?.scrollTo({ x: nextIndex * SCREEN_WIDTH, animated: true });
    setActiveIndex(nextIndex);
  };

  const handleMomentumEnd = (event: any) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setActiveIndex(index);
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      {!isLast && (
        <Pressable onPress={finish} className="self-end px-6 pt-2" hitSlop={12}>
          <Text className="text-text opacity-50 font-semibold text-sm">Skip</Text>
        </Pressable>
      )}

      <Animated.ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={scrollHandler}
        onMomentumScrollEnd={handleMomentumEnd}
        scrollEventThrottle={16}
        className="flex-1"
        style={{ marginTop: isLast ? 44 : 0 }}
      >
        {ONBOARDING_SLIDES.map((slide, index) => (
          <Slide
            key={slide.title}
            index={index}
            scrollX={scrollX}
            image={slide.image}
            title={slide.title}
            description={slide.description}
          />
        ))}
      </Animated.ScrollView>

      <View className="flex-row justify-center mb-8">
        {ONBOARDING_SLIDES.map((_, index) => (
          <Dot key={index} index={index} scrollX={scrollX} />
        ))}
      </View>

      <View className="px-6 mb-8">
        <Pressable
          onPress={handleNext}
          className="bg-primary rounded-full py-4 items-center"
        >
          <Text className="text-white font-bold text-base">
            {isLast ? "Get Started" : "Next"}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}