import { useCallback, useEffect, useState } from "react";
import { useRestaurantStore } from "@/store/useRestaurantStore";
import { supabase } from "@/lib/supabase/client";
import type { Tables, InsertDto, UpdateDto } from "@/types/database.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  Trash2,
  QrCode,
  RefreshCw,
  Printer,
  Grid2X2,
  ChefHat,
  Copy,
  Check,
  Image as ImageIcon,
  X,
  Store,
} from "lucide-react";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";

type RestaurantTable = Tables<"restaurant_tables">;

export function TableManagementPage() {
  const { currentRestaurant, setRestaurant } = useRestaurantStore();
  const restaurantId = currentRestaurant?.id ?? "";
  const restaurantSlug = currentRestaurant?.slug ?? "";

  const [kitchenCode, setKitchenCode] = useState<string | null>(currentRestaurant?.kitchen_pin ?? currentRestaurant?.kitchen_access_code ?? null);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);

  // Branding state
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(currentRestaurant?.logo_url ?? null);
  const [brandingSaving, setBrandingSaving] = useState(false);

  useEffect(() => {
    if (currentRestaurant) {
      setKitchenCode(currentRestaurant.kitchen_pin ?? currentRestaurant.kitchen_access_code ?? null);
      setLogoPreview(currentRestaurant.logo_url);
    }
  }, [currentRestaurant]);

  function handleBrandingFileChange(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be smaller than 5MB");
      return;
    }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  }

  function handleRemoveBranding() {
    setLogoFile(null);
    setLogoPreview(null);
  }

  async function handleSaveBranding() {
    if (!currentRestaurant) return;
    setBrandingSaving(true);

    try {
      let finalLogoUrl = currentRestaurant.logo_url;

      // Upload new logo
      if (logoFile) {
        const ext = logoFile.name.split(".").pop();
        const path = `${restaurantId}/logo_${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("menu-images").upload(path, logoFile);
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from("menu-images").getPublicUrl(path);
        // Delete old logo if replacing
        if (currentRestaurant.logo_url) {
          try {
            const oldPath = new URL(currentRestaurant.logo_url).pathname.split("/menu-images/");
            if (oldPath.length === 2) await supabase.storage.from("menu-images").remove([oldPath[1]]);
          } catch { /* best effort */ }
        }
        finalLogoUrl = urlData.publicUrl;
      } else if (!logoPreview && currentRestaurant.logo_url) {
        // User explicitly removed the logo
        try {
          const oldPath = new URL(currentRestaurant.logo_url).pathname.split("/menu-images/");
          if (oldPath.length === 2) await supabase.storage.from("menu-images").remove([oldPath[1]]);
        } catch { /* best effort */ }
        finalLogoUrl = null;
      }

      // Update restaurant row
      const { error: dbErr } = await supabase
        .from("restaurants")
        .update({ logo_url: finalLogoUrl })
        .eq("id", restaurantId);

      if (dbErr) throw dbErr;

      setRestaurant({ ...currentRestaurant, logo_url: finalLogoUrl });
      setLogoFile(null);
      toast.success("Branding updated successfully.");
    } catch (err: any) {
      toast.error(err.message || "Failed to save branding.");
    } finally {
      setBrandingSaving(false);
    }
  }

  const brandingHasChanges =
    logoFile !== null ||
    (logoPreview === null && currentRestaurant?.logo_url !== null && currentRestaurant?.logo_url !== undefined);

  async function handleGenerateKitchenCode() {
    setIsGeneratingCode(true);
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let newCode = "";
    for (let i = 0; i < 8; i++) {
      newCode += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    try {
      const { error: updateError } = await supabase
        .from("restaurants")
        .update({ kitchen_pin: newCode })
        .eq("id", restaurantId);
        
      if (updateError) throw updateError;

      // Notify all connected kitchen devices to sign out immediately
      try {
        const invalidateChannel = supabase.channel(`kitchen-${restaurantId}`);
        await invalidateChannel.send({
          type: "broadcast",
          event: "kitchen_invalidate",
          payload: { reason: "code_regenerated", at: new Date().toISOString() },
        });
        supabase.removeChannel(invalidateChannel);
      } catch (broadcastErr) {
        console.error("Failed to broadcast kitchen invalidation:", broadcastErr);
      }
      
      setKitchenCode(newCode);
      if (currentRestaurant) {
        setRestaurant({ ...currentRestaurant, kitchen_pin: newCode });
      }
      toast.success("Kitchen device access code generated.");
    } catch (err: any) {
      console.error("Kitchen provisioning caught error:", err);
      toast.error(err.message || "Failed to generate code.");
    } finally {
      setIsGeneratingCode(false);
    }
  }

  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [tableNumber, setTableNumber] = useState("");
  const [addSubmitting, setAddSubmitting] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingTable, setDeletingTable] = useState<RestaurantTable | null>(
    null
  );
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [selectedTable, setSelectedTable] = useState<RestaurantTable | null>(null);

  const fetchTables = useCallback(async () => {
    if (!restaurantId) return;
    const { data, error } = await supabase
      .from("restaurant_tables")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: true });
    
    if (error) {
      toast.error("Failed to fetch tables");
      return;
    }
    
    // Sort naturally by table number (e.g. 2 before 10)
    const sortedData = (data ?? []).sort((a, b) => {
      return a.table_number.localeCompare(b.table_number, undefined, { numeric: true, sensitivity: 'base' });
    });
    
    setTables(sortedData);
  }, [restaurantId]);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      await fetchTables();
      setIsLoading(false);
    }
    load();
  }, [fetchTables]);

  function openAddDialog() {
    setTableNumber("");
    setAddDialogOpen(true);
  }

  async function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!tableNumber.trim()) return;

    setAddSubmitting(true);

    const payload: InsertDto<"restaurant_tables"> = {
      restaurant_id: restaurantId,
      table_number: tableNumber.trim(),
      qr_code_identifier: crypto.randomUUID(),
    };

    try {
      const { error } = await supabase.from("restaurant_tables").insert(payload);
      if (error) throw error;
      toast.success(`Table ${tableNumber.trim()} added successfully.`);
      setAddDialogOpen(false);
      await fetchTables();
    } catch (err: any) {
      toast.error(err.message || "Failed to add table.");
    } finally {
      setAddSubmitting(false);
    }
  }

  function openDeleteDialog(table: RestaurantTable) {
    setDeletingTable(table);
    setDeleteDialogOpen(true);
  }

  async function handleDelete() {
    if (!deletingTable) return;
    setDeleteSubmitting(true);
    try {
      const { error } = await supabase
        .from("restaurant_tables")
        .delete()
        .eq("id", deletingTable.id);
      if (error) throw error;
      toast.success(`Table ${deletingTable.table_number} deleted.`);
      setDeleteDialogOpen(false);
      setDeletingTable(null);
      await fetchTables();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete table.");
    } finally {
      setDeleteSubmitting(false);
    }
  }

  function openQrDialog(table: RestaurantTable) {
    setSelectedTable(table);
    setQrDialogOpen(true);
  }

  async function handleRegenerateQr(tableId: string) {
    const newIdentifier = crypto.randomUUID();
    const payload: UpdateDto<"restaurant_tables"> = {
      qr_code_identifier: newIdentifier,
    };

    try {
      const { error } = await supabase
        .from("restaurant_tables")
        .update(payload)
        .eq("id", tableId);
      
      if (error) throw error;

      // Update state only after successful DB update
      setTables((prev) => 
        prev.map((t) => t.id === tableId ? { ...t, qr_code_identifier: newIdentifier } : t)
      );
      if (selectedTable?.id === tableId) {
        setSelectedTable({ ...selectedTable, qr_code_identifier: newIdentifier });
      }
      toast.success("QR code regenerated successfully.");
    } catch (err: any) {
      toast.error(err.message || "Failed to regenerate QR code.");
    }
  }

  function getQrUrl(identifier: string) {
    return `${window.location.origin}/menu/${restaurantSlug}/${identifier}`;
  }

  function printQrCode() {
    if (!selectedTable) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    
    const url = getQrUrl(selectedTable.qr_code_identifier);
    const svgElement = document.getElementById("qr-svg-element");
    const svgHtml = svgElement ? svgElement.outerHTML : "";

    const html = `
      <html>
        <head>
          <title>Print QR Code - Table ${selectedTable.table_number}</title>
          <style>
            body { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; font-family: sans-serif; margin: 0; }
            .container { text-align: center; border: 2px dashed #ccc; padding: 40px; border-radius: 12px; }
            h1 { margin-bottom: 5px; }
            p { color: #666; margin-bottom: 30px; }
            svg { width: 300px; height: 300px; }
            .url { margin-top: 20px; font-size: 12px; color: #999; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="container">
            <h1>Table ${selectedTable.table_number}</h1>
            <p>Scan to order</p>
            ${svgHtml}
            <div class="url">${url}</div>
          </div>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  }

  if (isLoading) {
    return (
      <div className="min-h-svh bg-background">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <Skeleton className="h-8 w-48 mb-2" />
              <Skeleton className="h-4 w-72" />
            </div>
            <Skeleton className="h-10 w-28" />
          </div>
          <Skeleton className="h-96 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-svh bg-background">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Table & QR Management
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage physical tables and generate QR codes for ordering
            </p>
          </div>
          <Button onClick={openAddDialog}>
            <Plus data-icon="inline-start" />
            Add Table
          </Button>
        </div>

        <Card className="shadow-sm mb-8 border-primary/20 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg text-primary">
              <ChefHat className="size-5" />
              Kitchen Device Access
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-background p-4 rounded-lg border border-primary/10 shadow-sm">
              <div>
                <h3 className="font-medium text-foreground">Kitchen Login Code</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Use this PIN to securely connect your kitchen display device at <span className="font-semibold text-foreground">/kitchen-login</span>.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                {kitchenCode ? (
                  <>
                    <div className="bg-muted px-4 py-2 rounded-md font-mono text-lg font-bold tracking-wider text-center">
                      {kitchenCode}
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          navigator.clipboard.writeText(kitchenCode);
                          setHasCopied(true);
                          setTimeout(() => setHasCopied(false), 2000);
                        }}
                        title="Copy code"
                      >
                        {hasCopied ? <Check className="size-4 text-green-600" /> : <Copy className="size-4" />}
                      </Button>
                      <Button 
                        variant="outline"
                        className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                        onClick={() => {
                          if (confirm("Generating a new code will immediately log out the current kitchen device. Continue?")) {
                            handleGenerateKitchenCode();
                          }
                        }}
                        disabled={isGeneratingCode}
                      >
                        {isGeneratingCode ? <Spinner data-icon="inline-start" /> : <RefreshCw className="size-4 mr-2" />}
                        Regenerate
                      </Button>
                    </div>
                  </>
                ) : (
                  <Button 
                    onClick={handleGenerateKitchenCode}
                    disabled={isGeneratingCode}
                    className="bg-teal-600 hover:bg-teal-700 text-white shadow-sm"
                  >
                    {isGeneratingCode && <Spinner data-icon="inline-start" />}
                    Generate Code
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Restaurant Branding Card */}
        <Card className="shadow-sm mb-8">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Store className="size-5 text-primary" />
              Restaurant Branding
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-6">
              Customize how your restaurant appears on the public QR menu by uploading a logo.
            </p>
            <div className="max-w-md">
              {/* Logo Upload */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Restaurant Logo</Label>
                <div className="flex items-center gap-4">
                  {logoPreview ? (
                    <div className="relative size-20 shrink-0 overflow-hidden rounded-xl border bg-muted shadow-sm">
                      <img src={logoPreview} alt="Logo preview" className="size-full object-cover" />
                      <button
                        type="button"
                        onClick={handleRemoveBranding}
                        className="absolute right-1 top-1 flex size-5 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
                      >
                        <X className="size-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex size-20 shrink-0 items-center justify-center rounded-xl border border-dashed bg-muted">
                      <ImageIcon className="size-6 text-muted-foreground/50" />
                    </div>
                  )}
                  <div className="flex-1">
                    <Input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleBrandingFileChange}
                      className="text-xs"
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      Square image recommended. Max 5MB.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {brandingHasChanges && (
              <div className="mt-6 flex justify-end">
                <Button
                  onClick={handleSaveBranding}
                  disabled={brandingSaving}
                  className="bg-teal-600 hover:bg-teal-700 text-white shadow-sm"
                >
                  {brandingSaving && <Spinner data-icon="inline-start" />}
                  Save Branding
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Grid2X2 className="size-5 text-primary" />
              Active Tables
            </CardTitle>
            <Badge variant="outline">{tables.length} tables</Badge>
          </CardHeader>
          <CardContent>
            {tables.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="flex size-16 items-center justify-center rounded-full bg-primary/5 mb-4">
                  <Grid2X2 className="size-8 text-primary/40 stroke-[1.5]" />
                </div>
                <h3 className="text-lg font-medium text-foreground">No tables configured</h3>
                <p className="mt-1 text-sm text-muted-foreground max-w-sm">
                  Add physical tables to generate unique QR codes for your dining areas.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Table Number</TableHead>
                      <TableHead>QR Link</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tables.map((table) => (
                      <TableRow key={table.id} className="hover:bg-muted/50 transition-colors">
                        <TableCell className="font-medium text-base py-4">
                          {table.table_number}
                        </TableCell>
                        <TableCell className="text-muted-foreground py-4">
                          <code className="rounded bg-muted/50 px-2 py-1 text-xs font-mono">
                            /menu/{restaurantSlug}/...{table.qr_code_identifier.slice(-6)}
                          </code>
                        </TableCell>
                        <TableCell className="text-right py-4">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="default"
                              size="sm"
                              className="bg-primary/10 text-primary hover:bg-primary/20 shadow-none border-none font-medium"
                              onClick={() => openQrDialog(table)}
                            >
                              <QrCode className="size-4 mr-2" />
                              Manage QR
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                              onClick={() => openDeleteDialog(table)}
                              title="Delete Table"
                            >
                              <Trash2 className="size-4" />
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

      {/* Add Table Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Table</DialogTitle>
            <DialogDescription>
              Create a new physical table for your restaurant. A secure QR code will be automatically generated.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="table-number">Table Identifier</Label>
                <Input
                  id="table-number"
                  placeholder="e.g., 12, Patio-3, Bar-A"
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  required
                  autoFocus
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" type="button">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={addSubmitting}>
                {addSubmitting && <Spinner data-icon="inline-start" />}
                Add Table
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Table {deletingTable?.table_number}</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this table? The QR code will immediately stop working. Past orders from this table will remain in your history.
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
              onClick={handleDelete}
              disabled={deleteSubmitting}
            >
              {deleteSubmitting && <Spinner data-icon="inline-start" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR Code Dialog */}
      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Table {selectedTable?.table_number}</DialogTitle>
            <DialogDescription>
              Scan to view the menu and place orders.
            </DialogDescription>
          </DialogHeader>
          
          {selectedTable && (
            <div className="flex flex-col items-center justify-center space-y-6 py-4">
              <div className="overflow-hidden rounded-xl border-2 p-4 shadow-sm bg-white">
                <QRCodeSVG 
                  id="qr-svg-element"
                  value={getQrUrl(selectedTable.qr_code_identifier)} 
                  size={220}
                  level="H"
                />
              </div>
              <div className="w-full text-center">
                <a 
                  href={getQrUrl(selectedTable.qr_code_identifier)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-primary hover:underline break-all"
                >
                  {getQrUrl(selectedTable.qr_code_identifier)}
                </a>
              </div>
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button 
              type="button" 
              variant="outline"
              className="w-full text-amber-600 hover:text-amber-700 hover:bg-amber-50"
              onClick={() => {
                if (selectedTable && confirm("Are you sure? The old physical QR code will stop working immediately.")) {
                  handleRegenerateQr(selectedTable.id);
                }
              }}
            >
              <RefreshCw data-icon="inline-start" />
              Regenerate Link
            </Button>
            <Button type="button" className="w-full" onClick={printQrCode}>
              <Printer data-icon="inline-start" />
              Print QR
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
