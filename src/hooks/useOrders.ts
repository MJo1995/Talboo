import { useState, useCallback, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase/client";
import type { Tables, UpdateDto } from "@/types/database.types";
import { useRestaurantStore } from "@/store/useRestaurantStore";
import { toast } from "sonner";

export type Order = Tables<"orders">;
export type OrderItem = Tables<"order_items">;

export interface OrderWithItems extends Order {
  items: (OrderItem & { menu_item_name: string })[];
  table_number: string;
}

export type OrderStatus = Order["status"];

export function useOrders(soundEnabled: boolean, playDing: () => void) {
  const { currentRestaurant, setRestaurant } = useRestaurantStore();
  const restaurantId = currentRestaurant?.id ?? "";

  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<string>("CLOSED");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const isOffline = connectionStatus === "CLOSED" || connectionStatus === "CHANNEL_ERROR";

  const soundEnabledRef = useRef(soundEnabled);
  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  const fetchActiveOrders = useCallback(async () => {
    if (!restaurantId) return;

    let resetTime = currentRestaurant?.kitchen_reset_at;
    if (!resetTime && restaurantId) {
      resetTime = localStorage.getItem(`kitchen_reset_${restaurantId}`) || undefined;
    }
    let query = supabase
      .from("orders")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: false });

    if (resetTime) {
      query = query.gte("created_at", resetTime);
    } else {
      const yesterday = new Date();
      yesterday.setHours(yesterday.getHours() - 24);
      query = query.gte("created_at", yesterday.toISOString());
    }

    const { data: ordersData } = await query;

    if (!ordersData) {
      setIsLoading(false);
      return;
    }

    const orderIds = ordersData.map((o) => o.id);

    const [itemsResult, tablesResult] = await Promise.all([
      orderIds.length > 0
        ? supabase
            .from("order_items")
            .select("*")
            .in("order_id", orderIds)
        : Promise.resolve({ data: [] as OrderItem[] }),
      supabase
        .from("restaurant_tables")
        .select("id, table_number")
        .eq("restaurant_id", restaurantId),
    ]);

    const allItems = itemsResult.data ?? [];
    const tables = tablesResult.data ?? [];

    const { data: menuItemsData } = await supabase
      .from("menu_items")
      .select("id, name")
      .eq("restaurant_id", restaurantId);

    const menuItemsMap = new Map(
      (menuItemsData ?? []).map((m) => [m.id, m.name])
    );
    const tablesMap = new Map(tables.map((t) => [t.id, t.table_number]));

    const enrichedOrders: OrderWithItems[] = ordersData.map((order) => ({
      ...order,
      items: allItems
        .filter((item) => item.order_id === order.id)
        .map((item) => ({
          ...item,
          menu_item_name: menuItemsMap.get(item.menu_item_id) ?? "Unknown Item",
        })),
      table_number: order.table_id
        ? tablesMap.get(order.table_id) ?? "?"
        : "—",
    }));

    setOrders(enrichedOrders);
    setIsLoading(false);
  }, [restaurantId, currentRestaurant?.kitchen_reset_at]);

  useEffect(() => {
    fetchActiveOrders();
  }, [fetchActiveOrders]);

  useEffect(() => {
    if (!restaurantId) return;

    const channel = supabase
      .channel(`kitchen-${restaurantId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "orders",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        async (payload) => {
          const newOrder = payload.new as Order;

          const { data: items } = await supabase
            .from("order_items")
            .select("*")
            .eq("order_id", newOrder.id);

          const { data: menuItemsData } = await supabase
            .from("menu_items")
            .select("id, name")
            .eq("restaurant_id", restaurantId);

          const menuItemsMap = new Map(
            (menuItemsData ?? []).map((m) => [m.id, m.name])
          );

          let tableNumber = "—";
          if (newOrder.table_id) {
            const { data: tableData } = await supabase
              .from("restaurant_tables")
              .select("table_number")
              .eq("id", newOrder.table_id)
              .maybeSingle();
            if (tableData) tableNumber = tableData.table_number;
          }

          const enrichedOrder: OrderWithItems = {
            ...newOrder,
            items: (items ?? []).map((item) => ({
              ...item,
              menu_item_name:
                menuItemsMap.get(item.menu_item_id) ?? "Unknown Item",
            })),
            table_number: tableNumber,
          };

          setOrders((prev) => [enrichedOrder, ...prev]);
          if (soundEnabledRef.current) {
            playDing();
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        (payload) => {
          const updated = payload.new as Order;
          setOrders((prev) =>
            prev.map((o) =>
              o.id === updated.id
                ? { ...o, ...updated, items: o.items, table_number: o.table_number }
                : o
            )
          );
        }
      )
      .on(
        "broadcast",
        { event: "kitchen_reset" },
        (payload) => {
          const resetAt = payload.payload?.reset_at;
          if (resetAt && restaurantId) {
            localStorage.setItem(`kitchen_reset_${restaurantId}`, resetAt);
            const currentRest = useRestaurantStore.getState().currentRestaurant;
            if (currentRest) {
              setRestaurant({ ...currentRest, kitchen_reset_at: resetAt });
            }
            // Clear the existing orders immediately upon receiving broadcast
            setOrders([]);
            fetchActiveOrders();
          }
        }
      )
      .on(
        "broadcast",
        { event: "kitchen_invalidate" },
        async () => {
          // Admin regenerated the kitchen code — sign this device out immediately
          await supabase.auth.signOut();
          window.location.replace("/kitchen-login");
        }
      )
      .subscribe((status) => {
        setConnectionStatus(status);
        if (status === "SUBSCRIBED") {
          fetchActiveOrders();
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurantId, fetchActiveOrders]);

  async function handleManualRefresh() {
    setIsRefreshing(true);
    await fetchActiveOrders();
    setIsRefreshing(false);
  }

  async function updateOrderStatus(orderId: string, newStatus: OrderStatus) {
    if (isOffline) {
      toast.error("Cannot update order while offline. Please wait for reconnection.");
      return;
    }

    const previousStatus = orders.find((o) => o.id === orderId)?.status;

    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId ? { ...o, status: newStatus } : o
      )
    );

    const payload: UpdateDto<"orders"> = {
      status: newStatus,
    };

    const { error } = await supabase
      .from("orders")
      .update(payload)
      .eq("id", orderId)
      .eq("restaurant_id", restaurantId);

    if (error) {
      if (previousStatus) {
        setOrders((prev) =>
          prev.map((o) =>
            o.id === orderId ? { ...o, status: previousStatus } : o
          )
        );
      }
      console.error("🔥 Order update failed:", { orderId, restaurantId, reason: error.message });
      toast.error("Failed to update order status");
    }
  }

  return {
    orders,
    isLoading,
    connectionStatus,
    isOffline,
    isRefreshing,
    handleManualRefresh,
    updateOrderStatus
  };
}
