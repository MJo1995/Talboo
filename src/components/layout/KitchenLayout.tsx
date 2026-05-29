import { Outlet, useNavigate } from "react-router-dom";
import { ChefHat, RefreshCw, LogOut } from "lucide-react";
import { useRestaurantStore } from "@/store/useRestaurantStore";
import { canResetKitchen } from "@/types/roles";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useState } from "react";
import { Spinner } from "@/components/ui/spinner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function KitchenLayout() {
  const { currentRestaurant, activeMemberRole, setRestaurant, resetStore } = useRestaurantStore();
  const [isResetting, setIsResetting] = useState(false);
  const navigate = useNavigate();

  async function handleLogout() {
    await supabase.auth.signOut();
    resetStore();
    navigate("/login", { replace: true });
  }

  async function handleResetSession() {
    if (!currentRestaurant) return;
    setIsResetting(true);
    const now = new Date().toISOString();

    // Broadcast the reset event to all kitchen devices via Realtime
    try {
      const channel = supabase.channel(`kitchen-${currentRestaurant.id}`);
      await channel.send({
        type: "broadcast",
        event: "kitchen_reset",
        payload: { reset_at: now },
      });
      supabase.removeChannel(channel);
    } catch (err) {
      console.error("Failed to broadcast kitchen reset:", err);
    }
    
    // Save locally so it survives refreshes for this device
    localStorage.setItem(`kitchen_reset_${currentRestaurant.id}`, now);

    setIsResetting(false);
    setRestaurant({ ...currentRestaurant, kitchen_reset_at: now });
    toast.success("Kitchen session reset");
  }

  return (
    <div className="kitchen-theme min-h-svh bg-background font-sans antialiased flex flex-col">
      {/* Minimal Kitchen Topbar */}
      <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between border-b bg-card px-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-sm">
            <ChefHat className="size-5" />
          </div>
          <div className="flex flex-col justify-center">
            <span className="text-sm font-bold tracking-tight text-foreground leading-none">
              {currentRestaurant?.name || "Kitchen Dashboard"}
            </span>
            <span className="text-xs text-muted-foreground mt-1 capitalize font-medium leading-none">
              {activeMemberRole}
            </span>
          </div>
        </div>
        
        {/* Right side actions */}
        <div className="flex items-center gap-2">
           {canResetKitchen(activeMemberRole) && (
             <AlertDialog>
               <AlertDialogTrigger asChild>
                 <Button
                   variant="outline"
                   size="sm"
                   disabled={isResetting}
                   className="h-8 border-white/10 bg-black/20 hover:bg-white/10 text-white/90 mr-2"
                 >
                   {isResetting ? <Spinner data-icon="inline-start" /> : <RefreshCw className="mr-2 size-3.5" />}
                   Start Fresh Session
                 </Button>
               </AlertDialogTrigger>
               <AlertDialogContent className="kitchen-theme">
                 <AlertDialogHeader>
                   <AlertDialogTitle>Start a fresh kitchen session?</AlertDialogTitle>
                   <AlertDialogDescription>
                     Current board will clear. Historical orders will be preserved in the database.
                   </AlertDialogDescription>
                 </AlertDialogHeader>
                 <AlertDialogFooter>
                   <AlertDialogCancel>Cancel</AlertDialogCancel>
                   <AlertDialogAction onClick={handleResetSession}>
                     Confirm
                   </AlertDialogAction>
                 </AlertDialogFooter>
               </AlertDialogContent>
             </AlertDialog>
           )}
           <div className="h-4 w-px bg-white/10 mx-1" />
           <Button
             variant="ghost"
             size="sm"
             className="h-8 text-white/70 hover:text-white hover:bg-white/10"
             onClick={handleLogout}
             title="Logout"
           >
             <LogOut className="size-4" />
           </Button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-auto bg-background">
        <Outlet />
      </main>
    </div>
  );
}
