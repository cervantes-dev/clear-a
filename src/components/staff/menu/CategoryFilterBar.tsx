import { ScrollView, Text, TouchableOpacity } from "react-native";
import { Category } from "../../../types/menu";

type Props = {
  categories: Category[];
  selectedId: string | null; // null = "All"
  onSelect: (id: string | null) => void;
};

export default function CategoryFilterBar({ categories, selectedId, onSelect }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingRight: 8 }}
      className="mb-4"
    >
      <TouchableOpacity
        onPress={() => onSelect(null)}
        className={`px-4 py-2 rounded-full border mr-2 ${
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
            className={`px-4 py-2 rounded-full border mr-2 ${
              active ? "bg-primary border-primary" : "bg-card border-border"
            }`}
          >
            <Text className={`text-sm font-semibold ${active ? "text-white" : "text-text opacity-60"}`}>
              {cat.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}