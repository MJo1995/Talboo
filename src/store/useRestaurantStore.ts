import { create } from "zustand";
import type { Database } from "@/types/database.types";

type Restaurant = Database["public"]["Tables"]["restaurants"]["Row"];
type MemberRole = "owner" | "manager" | "staff";

interface RestaurantState {
  currentRestaurant: Restaurant | null;
  activeMemberRole: MemberRole | null;
  isLoading: boolean;
  error: string | null;
}

interface RestaurantActions {
  setRestaurant: (restaurant: Restaurant | null) => void;
  setMemberRole: (role: MemberRole | null) => void;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  resetStore: () => void;
}

const initialState: RestaurantState = {
  currentRestaurant: null,
  activeMemberRole: null,
  isLoading: false,
  error: null,
};

export const useRestaurantStore = create<RestaurantState & RestaurantActions>(
  (set) => ({
    ...initialState,
    setRestaurant: (restaurant) => set({ currentRestaurant: restaurant }),
    setMemberRole: (role) => set({ activeMemberRole: role }),
    setIsLoading: (loading) => set({ isLoading: loading }),
    setError: (error) => set({ error }),
    resetStore: () => set(initialState),
  })
);
