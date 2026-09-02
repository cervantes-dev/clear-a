import { Text, TouchableOpacity, View } from "react-native";
import { Category } from "../../../types/menu";

type Props = {
  categories: Category[];
  selectedId: string | null; // null = "All"
  onSelect: (id: string | null) => void;
};

export default function CategoryFilterBar({ categories, selectedId, onSelect }: Props) {
  return (
    <View className="flex-row flex-wrap gap-2 mb-4">
      <TouchableOpacity
        onPress={() => onSelect(null)}
        className={`px-4 py-2 rounded-full border ${
          selectedId === null ? "bg-primary border-primary" : "bg-card border-border"
        }`}
      >
        <Text className={`text-sm font-semibold ${selectedId === null ? "text-white" : "text-text opacity-60"}`}>
          All
        </Text>
      </TouchableOpacity>

      {categories.map((cat) => {
        const active = selectedId === cat.id;
        return (
          <TouchableOpacity
            key={cat.id}
            onPress={() => onSelect(cat.id)}
            className={`px-4 py-2 rounded-full border ${
              active ? "bg-primary border-primary" : "bg-card border-border"
            }`}
          >
            <Text className={`text-sm font-semibold ${active ? "text-white" : "text-text opacity-60"}`}>
              {cat.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}