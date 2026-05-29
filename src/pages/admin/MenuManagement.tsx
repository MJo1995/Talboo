import { useState } from "react";
import { useRestaurantStore } from "@/store/useRestaurantStore";
import { supabase } from "@/lib/supabase/client";
import type { InsertDto, UpdateDto } from "@/types/database.types";
import type { Category, MenuItem } from "@/hooks/useMenuItems";
import { useMenuItems } from "@/hooks/useMenuItems";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  Pencil,
  Trash2,
  UtensilsCrossed,
  LayoutGrid,
  X,
  Image as ImageIcon,
} from "lucide-react";
import { toast } from "sonner";

export function MenuManagementPage() {
  const { currentRestaurant } = useRestaurantStore();
  const restaurantId = currentRestaurant?.id ?? "";

  const {
    categories,
    menuItems,
    setMenuItems,

    isLoading,
    selectedCategoryId,
    setSelectedCategoryId,
    fetchCategories,
    fetchMenuItems,
  } = useMenuItems();

  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryName, setCategoryName] = useState("");
  const [categoryOrder, setCategoryOrder] = useState("0");
  const [categorySubmitting, setCategorySubmitting] = useState(false);

  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [itemName, setItemName] = useState("");
  const [itemDescription, setItemDescription] = useState("");
  const [itemPrice, setItemPrice] = useState("");
  const [itemCategoryId, setItemCategoryId] = useState("");
  const [itemAvailable, setItemAvailable] = useState(true);
  const [itemImageFile, setItemImageFile] = useState<File | null>(null);
  const [itemImagePreview, setItemImagePreview] = useState<string | null>(null);
  const [itemSubmitting, setItemSubmitting] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(
    null
  );
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  function openCategoryDialog(category?: Category) {
    if (category) {
      setEditingCategory(category);
      setCategoryName(category.name);
      setCategoryOrder(String(category.display_order));
    } else {
      setEditingCategory(null);
      setCategoryName("");
      setCategoryOrder(String(categories.length));
    }
    setCategoryDialogOpen(true);
  }

  async function handleCategorySubmit(e: React.FormEvent) {
    e.preventDefault();
    setCategorySubmitting(true);

    if (editingCategory) {
      const payload: UpdateDto<"categories"> = {
        name: categoryName.trim(),
        display_order: Number(categoryOrder),
      };
      await supabase
        .from("categories")
        .update(payload)
        .eq("id", editingCategory.id)
        .eq("restaurant_id", restaurantId);
    } else {
      const payload: InsertDto<"categories"> = {
        restaurant_id: restaurantId,
        name: categoryName.trim(),
        display_order: Number(categoryOrder),
      };
      await supabase.from("categories").insert(payload);
    }

    setCategorySubmitting(false);
    setCategoryDialogOpen(false);
    await fetchCategories();
  }

  function openDeleteCategoryDialog(category: Category) {
    setDeletingCategory(category);
    setDeleteDialogOpen(true);
  }

  async function handleDeleteCategory() {
    if (!deletingCategory) return;
    setDeleteSubmitting(true);
    await supabase.from("categories").delete().eq("id", deletingCategory.id).eq("restaurant_id", restaurantId);
    setDeleteSubmitting(false);
    setDeleteDialogOpen(false);
    setDeletingCategory(null);
    if (selectedCategoryId === deletingCategory.id) {
      setSelectedCategoryId(null);
    }
    await Promise.all([fetchCategories(), fetchMenuItems()]);
  }

  function openItemDialog(item?: MenuItem) {
    if (item) {
      setEditingItem(item);
      setItemName(item.name);
      setItemDescription(item.description ?? "");
      setItemPrice(String(item.price));
      setItemCategoryId(item.category_id);
      setItemAvailable(item.is_available);
      setItemImagePreview(item.image_url ?? null);
    } else {
      setEditingItem(null);
      setItemName("");
      setItemDescription("");
      setItemPrice("");
      setItemCategoryId(selectedCategoryId ?? categories[0]?.id ?? "");
      setItemAvailable(true);
      setItemImagePreview(null);
    }
    setItemImageFile(null);
    setItemDialogOpen(true);
  }

  async function handleItemSubmit(e: React.FormEvent) {
    e.preventDefault();
    setItemSubmitting(true);
    let finalImageUrl = editingItem?.image_url ?? null;

    try {

      if (itemImageFile) {
        const fileExt = itemImageFile.name.split(".").pop();
        const fileName = `${crypto.randomUUID()}.${fileExt}`;
        const filePath = `${restaurantId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("menu-images")
          .upload(filePath, itemImageFile);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from("menu-images")
          .getPublicUrl(filePath);

        finalImageUrl = publicUrlData.publicUrl;

        // Best effort delete old image if replacing
        if (editingItem?.image_url) {
          try {
            const oldUrl = new URL(editingItem.image_url);
            const pathParts = oldUrl.pathname.split("/menu-images/");
            if (pathParts.length === 2) {
              await supabase.storage.from("menu-images").remove([pathParts[1]]);
            }
          } catch (e) {
            console.error("Failed to delete old image", e);
          }
        }
      } else if (!itemImagePreview && editingItem?.image_url) {
        // User removed the image explicitly
        finalImageUrl = null;
        try {
          const oldUrl = new URL(editingItem.image_url);
          const pathParts = oldUrl.pathname.split("/menu-images/");
          if (pathParts.length === 2) {
            await supabase.storage.from("menu-images").remove([pathParts[1]]);
          }
        } catch (e) {
          console.error("Failed to delete old image", e);
        }
      }

      const payload = {
        name: itemName.trim(),
        description: itemDescription.trim() || null,
        price: Number(itemPrice),
        category_id: itemCategoryId,
        is_available: itemAvailable,
        image_url: finalImageUrl,
      };

      if (editingItem) {
        const { error } = await supabase
          .from("menu_items")
          .update(payload)
          .eq("id", editingItem.id)
          .eq("restaurant_id", restaurantId);
        if (error) throw error;
        toast.success("Item updated successfully");
      } else {
        const { error } = await supabase
          .from("menu_items")
          .insert({ ...payload, restaurant_id: restaurantId });
        if (error) throw error;
        toast.success("Item added successfully");
      }

      setItemDialogOpen(false);
      await fetchMenuItems();
    } catch (err: any) {
      if (itemImageFile && finalImageUrl && finalImageUrl !== editingItem?.image_url) {
        const filePath = `${restaurantId}/${finalImageUrl.split("/").pop()}`;
        await supabase.storage.from("menu-images").remove([filePath]).catch(() => {});
      }
      toast.error(err.message || "Failed to save item.");
    } finally {
      setItemSubmitting(false);
    }
  }

  async function handleToggleAvailability(item: MenuItem) {
    const newValue = !item.is_available;
    setMenuItems((prev) =>
      prev.map((i) =>
        i.id === item.id ? { ...i, is_available: newValue } : i
      )
    );
    const { error } = await supabase
      .from("menu_items")
      .update({ is_available: newValue })
      .eq("id", item.id)
      .eq("restaurant_id", restaurantId);
    if (error) {
      setMenuItems((prev) =>
        prev.map((i) =>
          i.id === item.id ? { ...i, is_available: !newValue } : i
        )
      );
      toast.error("Failed to update availability");
    }
  }

  async function handleDeleteItem(item: MenuItem) {
    try {
      if (item.image_url) {
        const oldUrl = new URL(item.image_url);
        const pathParts = oldUrl.pathname.split("/menu-images/");
        if (pathParts.length === 2) {
          await supabase.storage.from("menu-images").remove([pathParts[1]]);
        }
      }
      const { error } = await supabase.from("menu_items").delete().eq("id", item.id).eq("restaurant_id", restaurantId);
      if (error) throw error;
      setMenuItems((prev) => prev.filter((i) => i.id !== item.id));
      toast.success("Item deleted");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete item");
    }
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be smaller than 5MB");
      return;
    }

    setItemImageFile(file);
    setItemImagePreview(URL.createObjectURL(file));
  }

  function handleRemoveImage() {
    setItemImageFile(null);
    setItemImagePreview(null);
  }

  function getCategoryName(categoryId: string): string {
    return categories.find((c) => c.id === categoryId)?.name ?? "Uncategorized";
  }

  if (isLoading) {
    return (
      <div className="min-h-svh bg-background">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <Skeleton className="h-8 w-48 mb-2" />
              <Skeleton className="h-4 w-72" />
            </div>
            <Skeleton className="h-10 w-28" />
          </div>
          <Skeleton className="h-32 w-full mb-8 rounded-xl" />
          <Skeleton className="h-96 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-svh bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Menu Management
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage categories and menu items for {currentRestaurant?.name}
            </p>
          </div>
          <Button onClick={() => openItemDialog()}>
            <Plus data-icon="inline-start" />
            Add Item
          </Button>
        </div>

        {/* Categories Section */}
        <Card className="mb-8 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <LayoutGrid className="size-5 text-primary" />
              Categories
            </CardTitle>
            <Button variant="outline" size="sm" onClick={() => openCategoryDialog()}>
              <Plus data-icon="inline-start" />
              Add Category
            </Button>
          </CardHeader>
          <CardContent>
            {categories.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No categories yet. Create one to organize your menu.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                <Badge
                  variant={selectedCategoryId === null ? "default" : "outline"}
                  className="cursor-pointer px-3 py-1.5 text-sm"
                  onClick={() => setSelectedCategoryId(null)}
                >
                  All Items
                </Badge>
                {categories.map((category) => (
                  <div key={category.id} className="group relative">
                    <Badge
                      variant={
                        selectedCategoryId === category.id
                          ? "default"
                          : "secondary"
                      }
                      className="cursor-pointer px-3 py-1.5 text-sm"
                      onClick={() => setSelectedCategoryId(category.id)}
                    >
                      {category.name}
                    </Badge>
                    <div className="absolute -right-1 -top-1 hidden gap-0.5 group-hover:flex">
                      <button
                        type="button"
                        className="flex size-4 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                        onClick={(e) => {
                          e.stopPropagation();
                          openCategoryDialog(category);
                        }}
                      >
                        <Pencil className="size-2.5" />
                      </button>
                      <button
                        type="button"
                        className="flex size-4 items-center justify-center rounded-full bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                        onClick={(e) => {
                          e.stopPropagation();
                          openDeleteCategoryDialog(category);
                        }}
                      >
                        <Trash2 className="size-2.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Separator className="mb-8" />

        {/* Menu Items Table */}
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <UtensilsCrossed className="size-5 text-primary" />
              Menu Items
              {selectedCategoryId && (
                <Badge variant="secondary" className="ml-2">
                  {getCategoryName(selectedCategoryId)}
                </Badge>
              )}
            </CardTitle>
            <Badge variant="outline">{menuItems.length} items</Badge>
          </CardHeader>
          <CardContent>
            {menuItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="flex size-16 items-center justify-center rounded-full bg-primary/5 mb-4">
                  <UtensilsCrossed className="size-8 text-primary/40 stroke-[1.5]" />
                </div>
                <h3 className="text-lg font-medium text-foreground">Menu is empty</h3>
                <p className="mt-1 text-sm text-muted-foreground max-w-sm">
                  Begin building your restaurant's digital menu. Added items will be immediately available for QR ordering.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead className="hidden sm:table-cell">
                        Description
                      </TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-center">Available</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {menuItems.map((item) => (
                      <TableRow key={item.id} className="hover:bg-muted/50 transition-colors">
                        <TableCell className="font-medium py-4">
                          {item.name}
                        </TableCell>
                        <TableCell className="hidden max-w-[200px] truncate text-muted-foreground sm:table-cell">
                          {item.description || "—"}
                        </TableCell>
                        <TableCell className="tabular-nums">
                          ${Number(item.price).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">
                            {getCategoryName(item.category_id)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={item.is_available}
                            onCheckedChange={() =>
                              handleToggleAvailability(item)
                            }
                            size="sm"
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openItemDialog(item)}
                            >
                              <Pencil className="size-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteItem(item)}
                            >
                              <Trash2 className="size-3.5 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Category Add/Edit Dialog */}
      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? "Edit Category" : "Add Category"}
            </DialogTitle>
            <DialogDescription>
              {editingCategory
                ? "Update the category details below."
                : "Create a new category to organize your menu items."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCategorySubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="category-name">Name</Label>
                <Input
                  id="category-name"
                  placeholder="e.g., Appetizers"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category-order">Display Order</Label>
                <Input
                  id="category-order"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={categoryOrder}
                  onChange={(e) => setCategoryOrder(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" type="button">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={categorySubmitting}>
                {categorySubmitting && <Spinner data-icon="inline-start" />}
                {editingCategory ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Category Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Category</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{deletingCategory?.name}
              &quot;? This will not delete the items in this category, but they
              will become uncategorized.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" type="button">
                Cancel
              </Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={handleDeleteCategory}
              disabled={deleteSubmitting}
            >
              {deleteSubmitting && <Spinner data-icon="inline-start" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Menu Item Add/Edit Dialog */}
      <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Edit Menu Item" : "Add Menu Item"}
            </DialogTitle>
            <DialogDescription>
              {editingItem
                ? "Update the item details below."
                : "Add a new item to your restaurant menu."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleItemSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="item-name">Name</Label>
                <Input
                  id="item-name"
                  placeholder="e.g., Caesar Salad"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="item-description">Description</Label>
                <Textarea
                  id="item-description"
                  placeholder="Brief description of the item..."
                  value={itemDescription}
                  onChange={(e) => setItemDescription(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="item-price">Price ($)</Label>
                  <Input
                    id="item-price"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={itemPrice}
                    onChange={(e) => setItemPrice(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    value={itemCategoryId}
                    onValueChange={setItemCategoryId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Image (Optional)</Label>
                  <div className="flex items-center gap-4">
                    {itemImagePreview ? (
                      <div className="relative size-20 shrink-0 overflow-hidden rounded-md border">
                        <img src={itemImagePreview} alt="Preview" className="size-full object-cover" />
                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          className="absolute right-1 top-1 flex size-5 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
                        >
                          <X className="size-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex size-20 shrink-0 items-center justify-center rounded-md border border-dashed bg-muted">
                        <ImageIcon className="size-6 text-muted-foreground/50" />
                      </div>
                    )}
                    <div className="flex-1">
                      <Input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleImageChange}
                        className="text-xs"
                      />
                      <p className="mt-1 text-xs text-muted-foreground">
                        Max 5MB. JPEG, PNG, or WEBP.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  id="item-available"
                  checked={itemAvailable}
                  onCheckedChange={setItemAvailable}
                />
                <Label htmlFor="item-available">Available for ordering</Label>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" type="button">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={itemSubmitting}>
                {itemSubmitting && <Spinner data-icon="inline-start" />}
                {editingItem ? "Update Item" : "Add Item"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
