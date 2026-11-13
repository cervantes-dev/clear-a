import { Ionicons } from "@expo/vector-icons";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Category } from "../../../types/menu";

type IconName = keyof typeof Ionicons.glyphMap;

type Props = {
  categories: Category[];
  selectedId: string | null; // null = "All"
  onSelect: (id: string | null) => void;
  /** Shows an icon before each label. Off by default so staff screens are unchanged. */
  showIcons?: boolean;
};

// Categories are staff-created, so icons are picked by keyword in the name.
// First match wins; anything unrecognised falls back to a generic tag.
const ICON_RULES: { keywords: string[]; icon: IconName }[] = [
  { keywords: ["rice", "meal", "combo", "lunch", "ulam", "viand"], icon: "restaurant-outline" },
  { keywords: ["snack", "chip", "fries", "burger", "sandwich"], icon: "fast-food-outline" },
  { keywords: ["drink", "beverage", "juice", "soda", "water", "tea", "coffee", "milk"], icon: "cafe-outline" },
  { keywords: ["dessert", "sweet", "cake", "ice cream", "pastry", "bread"], icon: "ice-cream-outline" },
  { keywords: ["noodle", "pasta", "soup"], icon: "restaurant-outline" },
  { keywords: ["fruit", "salad", "veggie", "vegetable"], icon: "nutrition-outline" },
];

const FALLBACK_ICON: IconName = "pricetag-outline";
const ALL_ICON: IconName = "grid-outline";

function iconFor(name: string): IconName {
  const lower = name.toLowerCase();
  const match = ICON_RULES.find((rule) => rule.keywords.some((k) => lower.includes(k)));
  return match ? match.icon : FALLBACK_ICON;
}

type ChipProps = {
  label: string;
  icon: IconName;
  active: boolean;
  showIcon: boolean;
  onPress: () => void;
};

function Chip({ label, icon, active, showIcon, onPress }: ChipProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className={`flex-row items-center px-4 py-2 rounded-full border mr-2 ${
        active ? "bg-primary border-primary" : "bg-card border-border"
      }`}
    >
      {showIcon && (
        <View className="mr-1.5">
          <Ionicons name={icon} size={15} color={active ? "#fff" : "#800020"} />
        </View>
      )}
      <Text className={`text-sm font-semibold ${active ? "text-white" : "text-text opacity-60"}`}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export default function CategoryFilterBar({ categories, selectedId, onSelect, showIcons = false }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingRight: 8 }}
      className="mb-4"
    >
      <Chip
        label="All"
        icon={ALL_ICON}
        active={selectedId === null}
        showIcon={showIcons}
        onPress={() => onSelect(null)}
      />

      {categories.map((cat) => (
        <Chip
          key={cat.id}
          label={cat.name}
          icon={iconFor(cat.name)}
          active={selectedId === cat.id}
          showIcon={showIcons}
          onPress={() => onSelect(cat.id)}
        />
      ))}
    </ScrollView>
  );
}