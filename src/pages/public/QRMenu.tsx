import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase/client";
import type { Tables } from "@/types/database.types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer";
import {
  Check,
  ChefHat,
  Clock,
  Minus,
  Plus,
  ShoppingCart,
  UtensilsCrossed,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";

type Restaurant = Tables<"restaurants">;
type Category = Tables<"categories">;
type MenuItem = Tables<"menu_items">;
type Order = Tables<"orders">;

interface CartItem {
  menuItemId: string;
  quantity: number;
  notes?: string;
}

interface SessionOrder {
  id: string;
  status: Order["status"];
  total_amount: number;
}

const DICTIONARY = {
  en: {
    premiumExperience: "Premium Experience",
    orders: "Orders",
    viewOrder: "View order",
    confirmOrder: "Confirm Your Order",
    reviewItems: "Review your items before placing the order.",
    addNotes: "Add notes (e.g., no onions, allergies)",
    total: "Total",
    placeOrder: "Place Order",
    continueBrowsing: "Continue Browsing",
    myOrders: "My Orders",
    ordersPlaced: "Orders placed from this device during this session.",
    noOrders: "No orders placed yet.",
    close: "Close",
    specialInstructions: "Special Instructions",
    removeItem: "Remove Item",
    addToOrder: "Add to Order",
    pending: "Pending",
    preparing: "Preparing",
    completed: "Completed",
    cancelled: "Cancelled",
    invalidTable: "Invalid Table",
    tableCodeNotRecognized: "This table code is not recognized. Please ask staff for assistance.",
    menuUpdating: "The menu is being updated. Please check back soon.",
    table: "Table",
    orderTracking: "Order Tracking",
    orderReceived: "Order Received",
    orderPlacedWaiting: "Your order has been placed and is waiting to be prepared.",
    beingPrepared: "Being Prepared",
    kitchenWorking: "The kitchen is working on your order right now.",
    orderReady: "Order Ready",
    orderCompleteServed: "Your order is complete and will be served shortly.",
    orderCancelled: "Order Cancelled",
    speakWithStaff: "This order has been cancelled. Please speak with staff.",
    backToMenu: "Back to Menu",
    order: "Order",
  },
  ar: {
    premiumExperience: "تجربة مميزة",
    orders: "الطلبات",
    viewOrder: "عرض الطلب",
    confirmOrder: "تأكيد طلبك",
    reviewItems: "راجع عناصرك قبل تأكيد الطلب.",
    addNotes: "أضف ملاحظات (مثال: بدون بصل، حساسية)",
    total: "المجموع",
    placeOrder: "إرسال الطلب",
    continueBrowsing: "متابعة التصفح",
    myOrders: "طلباتي",
    ordersPlaced: "الطلبات المقدمة من هذا الجهاز خلال هذه الجلسة.",
    noOrders: "لم يتم تقديم أي طلبات بعد.",
    close: "إغلاق",
    specialInstructions: "تعليمات خاصة",
    removeItem: "إزالة العنصر",
    addToOrder: "إضافة للطلب",
    pending: "قيد الانتظار",
    preparing: "قيد التحضير",
    completed: "مكتمل",
    cancelled: "ملغى",
    invalidTable: "طاولة غير صالحة",
    tableCodeNotRecognized: "رمز الطاولة هذا غير معروف. يرجى طلب المساعدة من طاقم العمل.",
    menuUpdating: "يتم تحديث القائمة. يرجى التحقق مرة أخرى قريباً.",
    table: "طاولة",
    orderTracking: "تتبع الطلب",
    orderReceived: "تم استلام الطلب",
    orderPlacedWaiting: "تم تقديم طلبك وبانتظار تحضيره.",
    beingPrepared: "قيد التحضير",
    kitchenWorking: "المطبخ يعمل على طلبك الآن.",
    orderReady: "الطلب جاهز",
    orderCompleteServed: "طلبك جاهز وسيتم تقديمه قريباً.",
    orderCancelled: "تم إلغاء الطلب",
    speakWithStaff: "تم إلغاء هذا الطلب. يرجى التحدث مع طاقم العمل.",
    backToMenu: "العودة للقائمة",
    order: "طلب",
  }
};

export function QRMenuPage() {
  const { slug, tableSlug } = useParams<{ slug: string; tableSlug: string }>();

  const [isArabic, setIsArabic] = useState(false);
  const t = isArabic ? DICTIONARY.ar : DICTIONARY.en;

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [tableValid, setTableValid] = useState<boolean | null>(null);
  const [tableNumber, setTableNumber] = useState("");
  const [tableUuid, setTableUuid] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>(() => {
    if (!slug || !tableSlug) return [];
    try {
      const stored = localStorage.getItem(`tablo_cart_${slug}_${tableSlug}`);
      if (!stored) return [];
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [submittedOrderId, setSubmittedOrderId] = useState<string | null>(null);
  const [orderStatus, setOrderStatus] = useState<Order["status"] | null>(null);
  const [sessionOrders, setSessionOrders] = useState<SessionOrder[]>([]);

  // Premium UI states
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [itemQuantity, setItemQuantity] = useState(1);
  const [itemNotes, setItemNotes] = useState("");

  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  const fetchData = useCallback(async () => {
    if (!slug || !tableSlug) {
      setError("Invalid menu link.");
      setIsLoading(false);
      return;
    }

    try {
      const { data: restData, error: restError } = await supabase
        .from("restaurants")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();

      if (restError || !restData) {
        setError("Restaurant not found.");
        setIsLoading(false);
        return;
      }

      setRestaurant(restData);

      const { data: tableData, error: tableError } = await supabase
        .from("restaurant_tables")
        .select("id, table_number")
        .eq("qr_slug", tableSlug)
        .eq("restaurant_id", restData.id)
        .maybeSingle();

      if (tableError || !tableData) {
        setTableValid(false);
        setIsLoading(false);
        return;
      }

      setTableValid(true);
      setTableNumber(tableData.table_number);
      setTableUuid(tableData.id);

      const [catRes, itemRes] = await Promise.all([
        supabase
          .from("categories")
          .select("*")
          .eq("restaurant_id", restData.id)
          .order("display_order", { ascending: true }),
        supabase
          .from("menu_items")
          .select("*")
          .eq("restaurant_id", restData.id)
          .eq("is_available", true)
      ]);

      if (catRes.error) throw catRes.error;
      if (itemRes.error) throw itemRes.error;

      setCategories(catRes.data ?? []);
      setMenuItems(itemRes.data ?? []);

      if (catRes.data && catRes.data.length > 0) {
        setActiveCategory(catRes.data[0].id);
      }

    } catch (err: any) {
      setError(err.message || "Failed to load menu.");
    } finally {
      setIsLoading(false);
    }
  }, [slug, tableSlug]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (slug && tableSlug) {
      localStorage.setItem(`tablo_cart_${slug}_${tableSlug}`, JSON.stringify(cart));
    }
  }, [cart, slug, tableSlug]);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 150;

      let currentActive = activeCategory;
      for (const categoryId in sectionRefs.current) {
        const element = sectionRefs.current[categoryId];
        if (element) {
          const { offsetTop, offsetHeight } = element;
          if (
            scrollPosition >= offsetTop &&
            scrollPosition < offsetTop + offsetHeight
          ) {
            currentActive = categoryId;
          }
        }
      }

      if (currentActive !== activeCategory) {
        setActiveCategory(currentActive);

        // Scroll the category pill into view
        const pillElement = document.getElementById(`pill-${currentActive}`);
        if (pillElement) {
          pillElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [activeCategory]);

  const scrollToCategory = (categoryId: string) => {
    setActiveCategory(categoryId);
    const element = sectionRefs.current[categoryId];
    if (element) {
      const offset = 120; // Accounts for sticky headers
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = element.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth"
      });
    }
  };

  useEffect(() => {
    if (!restaurant?.id || sessionOrders.length === 0) return;

    const channels = sessionOrders.map((order) => {
      return supabase
        .channel(`public-order-${order.id}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "orders",
            filter: `id=eq.${order.id}`,
          },
          (payload) => {
            const newStatus = payload.new.status as Order["status"];
            setSessionOrders((prev) =>
              prev.map((o) =>
                o.id === order.id ? { ...o, status: newStatus } : o
              )
            );
            if (submittedOrderId === order.id) {
              setOrderStatus(newStatus);
            }
          }
        )
        .subscribe();
    });

    return () => {
      channels.forEach((c) => supabase.removeChannel(c));
    };
  }, [JSON.stringify(sessionOrders.map((o) => o.id)), submittedOrderId, restaurant?.id]);

  function getItemsByCategory(categoryId: string): MenuItem[] {
    return menuItems.filter((item) => item.category_id === categoryId);
  }

  function getCartQuantity(menuItemId: string): number {
    return cart.find((c) => c.menuItemId === menuItemId)?.quantity ?? 0;
  }

  function openItemDetails(item: MenuItem) {
    setSelectedItem(item);
    const existing = cart.find(c => c.menuItemId === item.id);
    setItemQuantity(existing ? existing.quantity : 1);
    setItemNotes(existing?.notes || "");
  }

  function handleAddToCart() {
    if (!selectedItem) return;
    setCart(prev => {
      const filtered = prev.filter(c => c.menuItemId !== selectedItem.id);
      if (itemQuantity === 0) return filtered;
      return [...filtered, { menuItemId: selectedItem.id, quantity: itemQuantity, notes: itemNotes }];
    });
    setSelectedItem(null);
  }


  function getTotalCartItems(): number {
    return cart.reduce((sum, c) => sum + c.quantity, 0);
  }

  function getTotalCartPrice(): number {
    return cart.reduce((sum, c) => {
      const item = menuItems.find((m) => m.id === c.menuItemId);
      return sum + (item ? Number(item.price) * c.quantity : 0);
    }, 0);
  }

  function getItemName(menuItemId: string): string {
    return menuItems.find((m) => m.id === menuItemId)?.name ?? "";
  }

  function getItemPrice(menuItemId: string): number {
    return Number(menuItems.find((m) => m.id === menuItemId)?.price ?? 0);
  }

  function formatPrice(amount: number): string {
    return new Intl.NumberFormat(isArabic ? 'ar-EG' : 'en-EG', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount) + ' ' + (isArabic ? 'ج.م' : 'EGP');
  }

  function quickAddToCart(e: React.MouseEvent, item: MenuItem) {
    e.stopPropagation();
    setCart(prev => {
      const existing = prev.find(c => c.menuItemId === item.id);
      if (existing) {
        return prev.map(c => c.menuItemId === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, { menuItemId: item.id, quantity: 1 }];
    });
  }

  async function submitOrder() {
    if (cart.length === 0 || !restaurant || !tableUuid) return;

    setOrderSubmitting(true);
    try {
      const totalAmount = getTotalCartPrice();

      const itemsPayload = cart.map((c) => ({
        menu_item_id: c.menuItemId,
        quantity: c.quantity,
        notes: c.notes || null,
      }));

      const { data: newOrderId, error: rpcError } = await supabase.rpc(
        "create_order_atomic",
        {
          p_restaurant_id: restaurant.id,
          p_table_id: tableUuid,
          p_total_amount: totalAmount,
          p_items: itemsPayload,
        }
      );

      if (rpcError) throw rpcError;

      setSessionOrders((prev) => [
        { id: newOrderId, status: "pending", total_amount: totalAmount },
        ...prev,
      ]);

      setSubmittedOrderId(newOrderId);
      setOrderStatus("pending");
      setCart([]);
      setCheckoutOpen(false);
      toast.success("Order placed successfully!");
    } catch (err) {
      toast.error("Failed to place order. Please try again.");
    } finally {
      setOrderSubmitting(false);
    }
  }

  function handleBackToMenu() {
    setSubmittedOrderId(null);
    setOrderStatus(null);
  }

  if (isLoading) {
    return (
      <div className={`premium-qr-theme min-h-svh bg-background pb-[calc(8rem+env(safe-area-inset-bottom))] antialiased ${isArabic ? "font-[Noto_Sans_Arabic]" : "font-sans"}`} dir={isArabic ? "rtl" : "ltr"}>
        {/* Skeleton Hero Section */}
        <div className="relative flex h-[30vh] min-h-[240px] w-full flex-col items-center justify-end px-4 pb-6 pt-12 text-center bg-black/5">
          <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-black/10" />
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-32" />
        </div>

        {/* Skeleton Categories */}
        <header className="sticky top-0 z-20 bg-background/95 border-b border-border">
          <div className="mx-auto max-w-lg px-4 py-3 flex gap-2 overflow-hidden">
            <Skeleton className="h-8 w-20 rounded-full shrink-0" />
            <Skeleton className="h-8 w-24 rounded-full shrink-0" />
            <Skeleton className="h-8 w-16 rounded-full shrink-0" />
            <Skeleton className="h-8 w-32 rounded-full shrink-0" />
          </div>
        </header>

        {/* Skeleton Items */}
        <main className="mx-auto max-w-lg px-4 pt-8 space-y-10">
          <section>
            <Skeleton className="h-6 w-32 mb-6" />
            <div className="flex flex-col gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex flex-col overflow-hidden rounded-2xl border border-white/5 shadow-sm">
                  <div className="w-full aspect-[4/3] bg-muted" />
                  <div className="p-4">
                    <Skeleton className="h-5 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center bg-background px-4 text-center">
        <UtensilsCrossed className="mb-4 size-12 text-muted-foreground/40" />
        <h1 className="text-xl font-semibold text-foreground">{error}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Please check the QR code and try again.
        </p>
      </div>
    );
  }

  if (tableValid === false) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center bg-background px-4 text-center">
        <UtensilsCrossed className="mb-4 size-12 text-muted-foreground/40" />
        <h1 className="text-xl font-semibold text-foreground">
          Invalid Table
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This table code is not recognized. Please ask staff for assistance.
        </p>
      </div>
    );
  }

  if (submittedOrderId && orderStatus) {
    return (
      <div className={`flex min-h-svh flex-col bg-background ${isArabic ? "font-[Noto_Sans_Arabic]" : "font-sans"}`} dir={isArabic ? "rtl" : "ltr"}>
        <header className="border-b bg-background/95 sticky top-0 z-10">
          <div className="mx-auto max-w-lg px-4 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-lg font-semibold tracking-tight text-foreground">
                  {restaurant?.name}
                </h1>
                <p className="text-xs text-muted-foreground">
                  Table {tableNumber}
                </p>
              </div>
              <Badge variant="outline" className="text-xs">
                {t.orderTracking}
              </Badge>
            </div>
          </div>
        </header>

        <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-4 py-12">
          <div className="flex flex-col items-center text-center">
            {orderStatus === "pending" && (
              <>
                <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-amber-50">
                  <Clock className="size-8 text-amber-600" />
                </div>
                <Badge className="mb-3 bg-amber-50 text-amber-700 hover:bg-amber-50">
                  {t.pending}
                </Badge>
                <h2 className="text-xl font-semibold text-foreground">
                  {t.orderReceived}
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {t.orderPlacedWaiting}
                </p>
              </>
            )}

            {orderStatus === "preparing" && (
              <>
                <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-teal-50">
                  <ChefHat className="size-8 text-[#017E84]" />
                </div>
                <Badge className="mb-3 bg-teal-50 text-[#017E84] hover:bg-teal-50">
                  {t.preparing}
                </Badge>
                <h2 className="text-xl font-semibold text-foreground">
                  {t.beingPrepared}
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {t.kitchenWorking}
                </p>
              </>
            )}

            {orderStatus === "completed" && (
              <>
                <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-green-50">
                  <Check className="size-8 text-green-600" />
                </div>
                <Badge className="mb-3 bg-green-50 text-green-700 hover:bg-green-50">
                  {t.completed}
                </Badge>
                <h2 className="text-xl font-semibold text-foreground">
                  {t.orderReady}
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {t.orderCompleteServed}
                </p>
              </>
            )}

            {orderStatus === "cancelled" && (
              <>
                <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-red-50">
                  <UtensilsCrossed className="size-8 text-red-600" />
                </div>
                <Badge className="mb-3 bg-red-50 text-red-700 hover:bg-red-50">
                  {t.cancelled}
                </Badge>
                <h2 className="text-xl font-semibold text-foreground">
                  {t.orderCancelled}
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {t.speakWithStaff}
                </p>
              </>
            )}
          </div>

          <Separator className="my-8 w-full" />

          <div className="w-full text-left">
            <p className="mb-1 text-xs font-medium text-muted-foreground">
              {t.order} #{submittedOrderId.slice(0, 8).toUpperCase()}
            </p>
          </div>

          <Button
            variant="outline"
            className="mt-8 w-full"
            onClick={handleBackToMenu}
          >
            <ArrowLeft data-icon="inline-start" className={isArabic ? "rotate-180" : ""} />
            {t.backToMenu}
          </Button>
        </main>
      </div>
    );
  }

  return (
    <div className={`premium-qr-theme min-h-svh bg-background pb-[calc(8rem+env(safe-area-inset-bottom))] antialiased ${isArabic ? "font-[Noto_Sans_Arabic]" : "font-sans"}`} dir={isArabic ? "rtl" : "ltr"}>
      {/* Hero Section */}
      <div className="relative w-full flex flex-col items-center bg-background pb-6">
        {/* Cover Image Wrapper */}
        <div className="relative w-full h-[22vh] min-h-[160px] bg-black">
          <div className="absolute inset-0 bg-[url('/assets/tablo-cover.png')] bg-cover bg-center opacity-80" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent z-10" />
        </div>
        
        {/* Content overlapping the cover */}
        <div className="relative z-20 flex flex-col items-center -mt-10 px-4 w-full text-center">
          {restaurant?.logo_url ? (
            <div className="mb-3 size-20 overflow-hidden rounded-2xl shadow-lg border-4 border-background bg-background shrink-0">
              <img src={restaurant.logo_url} alt={restaurant.name} className="size-full object-cover" />
            </div>
          ) : (
            <div className="mb-3 flex size-20 items-center justify-center rounded-2xl bg-muted shadow-lg border-4 border-background shrink-0">
              <UtensilsCrossed className="size-10 text-muted-foreground" />
            </div>
          )}
          
          <h1 className="text-2xl font-bold tracking-tight text-foreground drop-shadow-sm leading-tight">
            {restaurant?.name}
          </h1>
          
          <div className="mt-3 flex items-center justify-center gap-2 flex-wrap">
            <Badge variant="secondary" className="px-3 py-1 text-xs font-medium">
              {t.table} {tableNumber}
            </Badge>
            <Badge variant="outline" className="px-3 py-1 text-xs font-medium border-border text-muted-foreground">
              {t.premiumExperience}
            </Badge>
          </div>
        </div>

        {/* Language Toggle */}
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-4 right-4 z-20 bg-black/20 hover:bg-black/40 text-white backdrop-blur-md rounded-full px-4 text-xs font-medium tracking-wide"
          onClick={() => setIsArabic(!isArabic)}
        >
          {isArabic ? "English" : "العربية"}
        </Button>
      </div>

      {/* Sticky Categories Navigation */}
      <header className="sticky top-0 z-30 bg-background/95 border-b shadow-sm">
        <ScrollArea className="w-full whitespace-nowrap" dir={isArabic ? "rtl" : "ltr"}>
          <div className="mx-auto max-w-lg flex justify-center">
            <div className="flex w-max space-x-2 p-3 px-4">
              {categories.map((category) => (
                <Button
                  key={category.id}
                  id={`pill-${category.id}`}
                  variant={activeCategory === category.id ? "default" : "secondary"}
                  className={`rounded-full px-5 font-medium transition-all ${activeCategory === category.id
                      ? "bg-foreground text-background shadow-md"
                      : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  onClick={() => scrollToCategory(category.id)}
                >
                  {category.name}
                </Button>
              ))}
            </div>
          </div>
          <ScrollBar orientation="horizontal" className="hidden" />
        </ScrollArea>
      </header>

      {/* Menu Sections */}
      <main className="mx-auto max-w-lg px-4 pt-6 space-y-12">
        {categories.map((category) => {
          const items = getItemsByCategory(category.id);
          if (items.length === 0) return null;

          return (
            <section
              key={category.id}
              ref={(el) => { sectionRefs.current[category.id] = el; }}
              className="scroll-mt-32"
            >
              <h2 className="mb-6 text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                {category.name}
                <Separator className="flex-1 ml-4 bg-border/50" />
              </h2>
              <div className="grid gap-5">
                {items.map((item) => {
                  const quantity = getCartQuantity(item.id);
                  return (
                    <Card
                      key={item.id}
                      className="p-0 gap-0 overflow-hidden border-border/50 bg-card hover:bg-accent/5 transition-all duration-300 cursor-pointer shadow-sm hover:shadow-md group active:scale-[0.98]"
                      onClick={() => openItemDetails(item)}
                    >
                      <div className="flex flex-col">
                        {item.image_url && (
                          <div className="relative h-48 w-full overflow-hidden bg-muted">
                            <img
                              src={item.image_url}
                              alt={item.name}
                              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                              loading="lazy"
                            />
                            {quantity > 0 && (
                              <div className="absolute top-3 right-3 flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold shadow-lg shadow-primary/30 ring-2 ring-background">
                                {quantity}
                              </div>
                            )}
                          </div>
                        )}
                        <CardContent className="flex flex-col p-4">
                          <div className="flex items-start justify-between gap-3 mb-1">
                            <h3 className="font-semibold text-base leading-snug text-foreground group-hover:text-primary transition-colors">
                              {item.name}
                            </h3>
                            <span className="font-bold text-foreground shrink-0 tabular-nums text-sm">
                              {formatPrice(Number(item.price))}
                            </span>
                          </div>
                          {item.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed mb-2">
                              {item.description}
                            </p>
                          )}
                          <div className="mt-auto flex items-center justify-between pt-2">
                            {quantity > 0 ? (
                              <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-none font-semibold px-3 py-1 text-xs">
                                {quantity} {isArabic ? 'في الطلب' : 'in order'}
                              </Badge>
                            ) : (
                              <span />
                            )}
                            <button
                              onClick={(e) => quickAddToCart(e, item)}
                              className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md hover:bg-primary/90 active:scale-95 transition-all"
                            >
                              <Plus className="size-4" />
                            </button>
                          </div>
                        </CardContent>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </section>
          );
        })}
      </main>

      {/* Floating Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-background/90 backdrop-blur-xl border-t border-border shadow-[0_-10px_40px_rgba(0,0,0,0.05)] pb-safe p-4">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <Button
            variant="outline"
            className="size-14 rounded-full shadow-sm border-border bg-card hover:bg-accent shrink-0 relative overflow-hidden"
            onClick={() => setHistoryOpen(true)}
          >
            <Clock className="size-5" />
            {sessionOrders.length > 0 && (
              <div className="absolute top-3 right-3 size-2.5 rounded-full bg-primary" />
            )}
          </Button>

          <Button
            className="flex-1 h-14 rounded-full text-base font-semibold shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30 active:scale-[0.98] relative overflow-hidden"
            disabled={cart.length === 0}
            onClick={() => setCheckoutOpen(true)}
          >
            {cart.length > 0 ? (
              <div className="flex w-full items-center justify-between px-2">
                <div className="flex items-center gap-2">
                  <div className="flex size-8 items-center justify-center rounded-full bg-white/20 text-white text-sm font-bold">
                    {getTotalCartItems()}
                  </div>
                  <span>{t.viewOrder}</span>
                </div>
                <span className="tabular-nums">{formatPrice(getTotalCartPrice())}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <ShoppingCart className="size-5" />
                <span>{t.viewOrder}</span>
              </div>
            )}
          </Button>
        </div>
      </div>

      {/* Checkout Drawer */}
      <Drawer open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DrawerContent className="max-h-[90svh] bg-background border-border mx-auto max-w-lg">
          <DrawerHeader className="border-b pb-4">
            <DrawerTitle className="text-xl">{t.confirmOrder}</DrawerTitle>
            <DrawerDescription>
              {t.reviewItems}
            </DrawerDescription>
          </DrawerHeader>
          <ScrollArea className="flex-1 overflow-y-auto px-4 py-6">
            <div className="mx-auto max-w-lg space-y-6">
              {cart.map((c) => (
                <div key={c.menuItemId} className="flex flex-col gap-3 group">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="font-semibold text-foreground">{getItemName(c.menuItemId)}</span>
                        <span className="text-sm font-medium text-muted-foreground tabular-nums">
                          {formatPrice(getItemPrice(c.menuItemId))}
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          const item = menuItems.find(m => m.id === c.menuItemId);
                          if (item) openItemDetails(item);
                        }}
                        className="text-xs font-medium text-primary hover:underline mt-1 inline-block"
                      >
                        Edit item
                      </button>
                    </div>
                    <div className="flex items-center gap-3 font-semibold tabular-nums text-foreground">
                      <span className="text-muted-foreground text-sm font-medium">x{c.quantity}</span>
                      <span>{formatPrice(getItemPrice(c.menuItemId) * c.quantity)}</span>
                    </div>
                  </div>
                  {c.notes && (
                    <div className="rounded-lg bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-700 border border-amber-500/20">
                      {c.notes}
                    </div>
                  )}
                  <Separator className="mt-3 group-last:hidden" />
                </div>
              ))}
            </div>
          </ScrollArea>
          <div className="border-t bg-card px-4 py-4 pb-safe">
            <div className="mx-auto max-w-lg">
              <div className="flex flex-col gap-3">
                <Button
                  className="h-14 w-full rounded-full text-lg font-semibold shadow-md active:scale-[0.98]"
                  onClick={submitOrder}
                  disabled={orderSubmitting}
                >
                  {orderSubmitting ? <Spinner data-icon="inline-start" /> : t.placeOrder}
                </Button>
                <DrawerClose asChild>
                  <Button variant="ghost" className="h-12 w-full rounded-full text-muted-foreground hover:text-foreground">
                    {t.continueBrowsing}
                  </Button>
                </DrawerClose>
              </div>
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      {/* History Drawer */}
      <Drawer open={historyOpen} onOpenChange={setHistoryOpen}>
        <DrawerContent className="max-h-[85svh] mx-auto max-w-lg">
          <DrawerHeader className="border-b pb-4">
            <DrawerTitle className="text-xl">{t.myOrders}</DrawerTitle>
            <DrawerDescription>
              {t.ordersPlaced}
            </DrawerDescription>
          </DrawerHeader>
          <ScrollArea className="flex-1 overflow-y-auto p-4">
            <div className="mx-auto max-w-lg space-y-4 pt-2 pb-6">
              {sessionOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <UtensilsCrossed className="mb-4 size-10 text-muted-foreground/30" />
                  <p className="text-sm font-medium text-muted-foreground">
                    {t.noOrders}
                  </p>
                </div>
              ) : (
                sessionOrders.map((order) => (
                  <Card key={order.id} className="overflow-hidden border-border/50 shadow-sm">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                          #{order.id.slice(0, 8)}
                        </span>
                        <span className="font-bold text-foreground tabular-nums">
                          {formatPrice(Number(order.total_amount))}
                        </span>
                      </div>

                      <Badge
                        variant={order.status === "completed" ? "default" : "secondary"}
                        className={`
                          ${order.status === "pending" ? "bg-amber-50 text-amber-700 hover:bg-amber-50" : ""}
                          ${order.status === "preparing" ? "bg-teal-50 text-[#017E84] hover:bg-teal-50" : ""}
                          ${order.status === "completed" ? "bg-green-50 text-green-700 hover:bg-green-50" : ""}
                          ${order.status === "cancelled" ? "bg-red-50 text-red-700 hover:bg-red-50" : ""}
                          border-none px-3 py-1 font-medium
                        `}
                      >
                        {t[order.status as keyof typeof t]}
                      </Badge>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
          <DrawerFooter className="border-t pt-4 pb-safe px-4">
            <div className="mx-auto w-full max-w-lg">
              <DrawerClose asChild>
                <Button variant="outline" className="w-full h-12 rounded-full font-medium">
                  {t.close}
                </Button>
              </DrawerClose>
            </div>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Item Details Drawer */}
      <Drawer open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
        <DrawerContent className="max-h-[95svh] p-0 overflow-hidden bg-background mx-auto max-w-lg">
          {selectedItem && (
            <div className="flex flex-col h-full max-h-[90svh]">
              <ScrollArea className="flex-1">
                {selectedItem.image_url && (
                  <div className="w-full aspect-video relative bg-muted shrink-0">
                    <img
                      src={selectedItem.image_url}
                      alt={selectedItem.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent" />
                  </div>
                )}

                <div className="p-5 pb-8 space-y-6">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-4">
                      <h2 className="text-2xl font-bold tracking-tight text-foreground leading-tight">
                        {selectedItem.name}
                      </h2>
                      <span className="text-xl font-bold tabular-nums text-primary shrink-0">
                        {formatPrice(Number(selectedItem.price))}
                      </span>
                    </div>
                    {selectedItem.description && (
                      <p className="text-muted-foreground leading-relaxed">
                        {selectedItem.description}
                      </p>
                    )}
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-foreground">
                      {t.specialInstructions}
                    </label>
                    <Input
                      value={itemNotes}
                      onChange={(e) => setItemNotes(e.target.value)}
                      placeholder={t.addNotes}
                      className="h-12 bg-muted/50 border-transparent focus-visible:ring-1 focus-visible:bg-transparent"
                    />
                  </div>
                </div>
              </ScrollArea>

              <div className="border-t bg-card p-4 pb-safe shrink-0">
                <div className="mx-auto max-w-lg flex items-center gap-4">
                  <div className="flex items-center bg-muted/50 rounded-full p-1 border border-border/50">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-10 rounded-full hover:bg-background hover:shadow-sm disabled:opacity-50"
                      onClick={() => setItemQuantity(Math.max(0, itemQuantity - 1))}
                    >
                      <Minus className="size-4" />
                    </Button>
                    <span className="w-8 text-center font-bold tabular-nums">
                      {itemQuantity}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-10 rounded-full hover:bg-background hover:shadow-sm"
                      onClick={() => setItemQuantity(itemQuantity + 1)}
                    >
                      <Plus className="size-4" />
                    </Button>
                  </div>

                  <Button
                    className="flex-1 h-12 rounded-full text-sm font-semibold transition-all shadow-md active:scale-[0.98]"
                    onClick={handleAddToCart}
                  >
                    {itemQuantity === 0 ? t.removeItem : `${t.addToOrder} • ${formatPrice(Number(selectedItem.price) * itemQuantity)}`}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DrawerContent>
      </Drawer>
    </div>
  );
}
