import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import type { Tables } from "@/types/database.types";
import { useRestaurantStore } from "@/store/useRestaurantStore";

export type Category = Tables<"categories">;
export type MenuItem = Tables<"menu_items">;

export function useMenuItems() {
  const { currentRestaurant } = useRestaurantStore();
  const restaurantId = currentRestaurant?.id ?? "";

  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCategories = useCallback(async () => {
    if (!restaurantId) return;
    const { data } = await supabase
      .from("categories")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .order("display_order", { ascending: true });
    if (data) setCategories(data);
  }, [restaurantId]);

  const fetchMenuItems = useCallback(async () => {
    if (!restaurantId) return;
    let query = supabase
      .from("menu_items")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .order("name", { ascending: true });

    if (selectedCategoryId) {
      query = query.eq("category_id", selectedCategoryId);
    }

    const { data } = await query;
    if (data) setMenuItems(data);
  }, [restaurantId, selectedCategoryId]);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      await Promise.all([fetchCategories(), fetchMenuItems()]);
      setIsLoading(false);
    }
    load();
  }, [fetchCategories, fetchMenuItems]);

  return {
    categories,
    menuItems,
    setMenuItems,
    setCategories,
    isLoading,
    selectedCategoryId,
    setSelectedCategoryId,
    fetchCategories,
    fetchMenuItems,
  };
}
