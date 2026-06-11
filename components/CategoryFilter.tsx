import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Category } from '@/api';
import { AppPalette, Colors } from '@/constants/theme';

interface CategoryFilterProps {
  categories: Category[];
  selectedCategoryId: string | null;
  onSelectCategory: (categoryId: string | null) => void;
}

export default function CategoryFilter({
  categories,
  selectedCategoryId,
  onSelectCategory,
}: CategoryFilterProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      <TouchableOpacity
        activeOpacity={0.82}
        style={[
          styles.categoryItem,
          !selectedCategoryId && styles.selectedCategory,
        ]}
        onPress={() => onSelectCategory(null)}
      >
        <Text style={[styles.categoryText, !selectedCategoryId && { color: Colors.white }]} numberOfLines={1}>
          All
        </Text>
      </TouchableOpacity>

      {categories.map((category) => {
        const selected = selectedCategoryId === category._id;
        return (
          <TouchableOpacity
            activeOpacity={0.82}
            key={category._id}
            style={[
              styles.categoryItem,
              selected && {
                backgroundColor: category.backgroundColor || Colors.brightOrange,
                borderColor: category.backgroundColor || Colors.brightOrange,
              },
            ]}
            onPress={() => onSelectCategory(category._id)}
          >
            <Text
              style={[
                styles.categoryText,
                { color: selected ? category.textColor || Colors.white : AppPalette.ink },
              ]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {category.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  categoryItem: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 999,
    height: 40,
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: AppPalette.border,
  },
  selectedCategory: {
    backgroundColor: Colors.brightOrange,
    borderColor: Colors.brightOrange,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '800',
  },
});
