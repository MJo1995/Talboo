export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      restaurants: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          slug: string;
          created_at: string;
          kitchen_reset_at: string;
          kitchen_access_code: string | null;
          kitchen_pin?: string | null;
          logo_url: string | null;
          cover_image_url: string | null;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          slug: string;
          created_at?: string;
          kitchen_reset_at?: string;
          kitchen_access_code?: string | null;
          kitchen_pin?: string | null;
          logo_url?: string | null;
          cover_image_url?: string | null;
        };
        Update: {
          id?: string;
          owner_id?: string;
          name?: string;
          slug?: string;
          created_at?: string;
          kitchen_reset_at?: string;
          kitchen_access_code?: string | null;
          kitchen_pin?: string | null;
          logo_url?: string | null;
          cover_image_url?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "restaurant_members_restaurant_id_fkey";
            columns: ["id"];
            isOneToOne: false;
            referencedRelation: "restaurant_members";
            referencedColumns: ["restaurant_id"];
          },
        ];
      };
      restaurant_members: {
        Row: {
          id: string;
          restaurant_id: string;
          user_id: string;
          role: "owner" | "manager" | "staff";
          created_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          user_id: string;
          role: "owner" | "manager" | "staff";
          created_at?: string;
        };
        Update: {
          id?: string;
          restaurant_id?: string;
          user_id?: string;
          role?: "owner" | "manager" | "staff";
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "restaurant_members_restaurant_id_fkey";
            columns: ["restaurant_id"];
            isOneToOne: false;
            referencedRelation: "restaurants";
            referencedColumns: ["id"];
          },
        ];
      };
      categories: {
        Row: {
          id: string;
          restaurant_id: string;
          name: string;
          display_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          name: string;
          display_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          restaurant_id?: string;
          name?: string;
          display_order?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "categories_restaurant_id_fkey";
            columns: ["restaurant_id"];
            isOneToOne: false;
            referencedRelation: "restaurants";
            referencedColumns: ["id"];
          },
        ];
      };
      menu_items: {
        Row: {
          id: string;
          restaurant_id: string;
          category_id: string;
          name: string;
          description: string | null;
          price: number;
          is_available: boolean;
          image_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          category_id: string;
          name: string;
          description?: string | null;
          price: number;
          is_available?: boolean;
          image_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          restaurant_id?: string;
          category_id?: string;
          name?: string;
          description?: string | null;
          price?: number;
          is_available?: boolean;
          image_url?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "menu_items_restaurant_id_fkey";
            columns: ["restaurant_id"];
            isOneToOne: false;
            referencedRelation: "restaurants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "menu_items_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      restaurant_tables: {
        Row: {
          id: string;
          restaurant_id: string;
          table_number: string;
          qr_code_identifier: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          table_number: string;
          qr_code_identifier: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          restaurant_id?: string;
          table_number?: string;
          qr_code_identifier?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "restaurant_tables_restaurant_id_fkey";
            columns: ["restaurant_id"];
            isOneToOne: false;
            referencedRelation: "restaurants";
            referencedColumns: ["id"];
          },
        ];
      };
      orders: {
        Row: {
          id: string;
          restaurant_id: string;
          table_id: string | null;
          status: "pending" | "preparing" | "completed" | "cancelled";
          total_amount: number;
          created_at: string;
          updated_at: string;
          cancelled_at: string | null;
          cancelled_by: string | null;
          updated_by: string | null;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          table_id?: string | null;
          status?: "pending" | "preparing" | "completed" | "cancelled";
          total_amount?: number;
          created_at?: string;
          updated_at?: string;
          cancelled_at?: string | null;
          cancelled_by?: string | null;
          updated_by?: string | null;
        };
        Update: {
          id?: string;
          restaurant_id?: string;
          table_id?: string | null;
          status?: "pending" | "preparing" | "completed" | "cancelled";
          total_amount?: number;
          created_at?: string;
          updated_at?: string;
          cancelled_at?: string | null;
          cancelled_by?: string | null;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "orders_restaurant_id_fkey";
            columns: ["restaurant_id"];
            isOneToOne: false;
            referencedRelation: "restaurants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_table_id_fkey";
            columns: ["table_id"];
            isOneToOne: false;
            referencedRelation: "restaurant_tables";
            referencedColumns: ["id"];
          },
        ];
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          menu_item_id: string;
          quantity: number;
          notes: string | null;
        };
        Insert: {
          id?: string;
          order_id: string;
          menu_item_id: string;
          quantity: number;
          notes?: string | null;
        };
        Update: {
          id?: string;
          order_id?: string;
          menu_item_id?: string;
          quantity?: number;
          notes?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_menu_item_id_fkey";
            columns: ["menu_item_id"];
            isOneToOne: false;
            referencedRelation: "menu_items";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_restaurant_member: {
        Args: {
          p_restaurant_id: string;
        };
        Returns: boolean;
      };
      get_member_role: {
        Args: {
          p_restaurant_id: string;
        };
        Returns: string;
      };
      prepare_kitchen_device: {
        Args: {
          p_restaurant_id: string;
          p_code: string;
        };
        Returns: boolean;
      };
      bind_kitchen_device: {
        Args: {
          p_restaurant_id: string;
          p_user_id: string;
        };
        Returns: boolean;
      };
      get_kitchen_device_email: {
        Args: {
          p_code: string;
        };
        Returns: string;
      };
      create_order_atomic: {
        Args: {
          p_restaurant_id: string;
          p_table_id: string;
          p_total_amount: number;
          p_items: Json;
        };
        Returns: string;
      };
      verify_kitchen_pin: {
        Args: {
          provided_pin: string;
        };
        Returns: string;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type InsertDto<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];

export type UpdateDto<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
