import { Ionicons } from "@expo/vector-icons";
import { Image, Modal, Pressable, Text, View } from "react-native";
import { MenuItem } from "../../../types/menu";

type Props = {
  item: MenuItem | null;
  onClose: () => void;
  onEdit: (id: string) => void;
  onToggleSpecial: (id: string) => void;
  onDelete: (id: string) => void;
};

export default function ItemActionsSheet({ item, onClose, onEdit, onToggleSpecial, onDelete }: Props) {
  if (!item) return null;

  const runThenClose = (action: () => void) => {
    onClose();
    action();
  };

  return (
    <Modal visible={!!item} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/40 justify-end" onPress={onClose}>
        <Pressable className="bg-card rounded-t-3xl pt-3 pb-8 px-2" onPress={(e) => e.stopPropagation()}>
          <View className="w-10 h-1.5 rounded-full bg-border self-center mb-4" />

          <View className="flex-row items-center px-3 pb-4 mb-1 border-b border-border">
            <View className="w-11 h-11 rounded-xl overflow-hidden bg-backgroundAlt items-center justify-center mr-3">
              {item.imageUrl ? (
                <Image source={{ uri: item.imageUrl }} className="w-full h-full" resizeMode="cover" />
              ) : (
                <Ionicons name="fast-food-outline" size={20} color="#C9B8BD" />
              )}
            </View>
            <Text className="text-text font-bold text-base flex-1" numberOfLines={1}>
              {item.name}
            </Text>
          </View>

          <Pressable
            onPress={() => runThenClose(() => onEdit(item.id))}
            className="flex-row items-center px-4 py-3.5 active:bg-background rounded-xl"
          >
            <Ionicons name="create-outline" size={19} color="#2B2B2B" />
            <Text className="text-text text-sm font-medium ml-3">Edit item</Text>
          </Pressable>

          <Pressable
            onPress={() => runThenClose(() => onToggleSpecial(item.id))}
            className="flex-row items-center px-4 py-3.5 active:bg-background rounded-xl"
          >
            <Ionicons name={item.isSpecial ? "star" : "star-outline"} size={19} color="#D97706" />
            <Text className="text-text text-sm font-medium ml-3">
              {item.isSpecial ? "Remove from Today's Specials" : "Feature as Today's Special"}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => runThenClose(() => onDelete(item.id))}
            className="flex-row items-center px-4 py-3.5 active:bg-background rounded-xl"
          >
            <Ionicons name="trash-outline" size={19} color="#D32F2F" />
            <Text className="text-danger text-sm font-medium ml-3">Delete item</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}