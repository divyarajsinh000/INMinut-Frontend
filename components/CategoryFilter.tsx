import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Category } from '@/api';
import { AppPalette, Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

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
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const themeStyles = {
    card: isDark ? '#1C2541' : '#FFFFFF',
    text: isDark ? '#F8FAFC' : '#111111',
    border: isDark ? '#7F1D1D' : '#FECACA',
  };

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
          { backgroundColor: themeStyles.card, borderColor: themeStyles.border },
          !selectedCategoryId && styles.selectedCategory,
        ]}
        onPress={() => onSelectCategory(null)}
      >
        <Text style={[styles.categoryText, !selectedCategoryId && { color: Colors.white }, selectedCategoryId && { color: themeStyles.text }]} numberOfLines={1}>
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
              { backgroundColor: themeStyles.card, borderColor: themeStyles.border },
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
                { color: selected ? category.textColor || Colors.white : themeStyles.text },
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
    paddingVertical: 4,
    gap: 8,
  },
  categoryItem: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    height: 32,
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
    fontSize: 12,
    fontWeight: '800',
  },
});
