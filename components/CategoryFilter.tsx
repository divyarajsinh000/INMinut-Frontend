import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated } from 'react-native';
import { useEffect, useRef } from 'react';
import { Category } from '@/api';
import { AppPalette, Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface CategoryFilterProps {
  categories: Category[];
  selectedCategoryId: string | null;
  onSelectCategory: (categoryId: string | null) => void;
}

function CategoryChip({
  category,
  selected,
  themeStyles,
  onPress,
}: {
  category: Category;
  selected: boolean;
  themeStyles: { card: string; text: string; border: string };
  onPress: () => void;
}) {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!category.isHighlighted || selected) {
      pulse.setValue(1);
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.45, duration: 650, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 650, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [category.isHighlighted, pulse, selected]);

  return (
    <Animated.View style={category.isHighlighted && !selected ? { opacity: pulse } : undefined}>
      <TouchableOpacity
        activeOpacity={0.82}
        style={[
          styles.categoryItem,
          {
            backgroundColor:
              category.isHighlighted || selected
                ? category.backgroundColor || Colors.brightOrange
                : themeStyles.card,
            borderColor:
              category.isHighlighted || selected
                ? category.backgroundColor || Colors.brightOrange
                : themeStyles.border,
          },
          category.isHighlighted && !selected && styles.highlightedCategory,
        ]}
        onPress={onPress}
      >
        <Text
          style={[
            styles.categoryText,
            {
              color:
                category.isHighlighted || selected
                  ? category.textColor || Colors.white
                  : themeStyles.text,
            },
          ]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {category.isHighlighted ? `${category.name}` : category.name}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
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
          <CategoryChip
            key={category._id}
            category={category}
            selected={selected}
            themeStyles={themeStyles}
            onPress={() => onSelectCategory(category._id)}
          />
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
  highlightedCategory: {
    borderWidth: 2,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '800',
  },
});
