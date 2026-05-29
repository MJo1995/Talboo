import { useState } from "react";
import { useRestaurantStore } from "@/store/useRestaurantStore";
import type { OrderWithItems, OrderStatus } from "@/hooks/useOrders";
import { useOrders } from "@/hooks/useOrders";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CancelledOrdersDrawer } from "@/components/kitchen/CancelledOrdersDrawer";
import { OrderCard, STATUS_CONFIG } from "@/components/kitchen/OrderCard";
import { KanbanColumn, EmptyColumn } from "@/components/kitchen/KanbanColumn";
import {
  ChefHat,
  Check,
  Clock,
  Zap,
  X,
  Volume2,
  VolumeX,
  RefreshCw,
  WifiOff,
} from "lucide-react";

let lastDingTime = 0;
let sharedAudioCtx: AudioContext | null = null;

async function playDing() {
  const nowMs = Date.now();
  if (nowMs - lastDingTime < 1000) return; // Prevent audio overlap fatigue
  lastDingTime = nowMs;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    
    if (!sharedAudioCtx) {
      sharedAudioCtx = new AudioContextClass();
    }
    const ctx = sharedAudioCtx;

    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-24, ctx.currentTime);
    compressor.knee.setValueAtTime(30, ctx.currentTime);
    compressor.ratio.setValueAtTime(12, ctx.currentTime);
    compressor.attack.setValueAtTime(0.003, ctx.currentTime);
    compressor.release.setValueAtTime(0.25, ctx.currentTime);
    compressor.connect(ctx.destination);
    
    // Soft marimba-like two-tone chime
    const playTone = (freq: number, startTime: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(compressor);
      
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, startTime);
      
      // Soft attack, quick decay
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(1.0, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);
      
      osc.start(startTime);
      osc.stop(startTime + 0.3);
    };

    // C5 (523.25Hz) then E5 (659.25Hz)
    const now = ctx.currentTime;
    playTone(523.25, now);
    playTone(659.25, now + 0.15);

  } catch (e) {
    console.error("Audio play failed", e);
  }
}

export function KitchenDashboardPage() {
  const { currentRestaurant } = useRestaurantStore();
  const [soundEnabled, setSoundEnabled] = useState(false);
  
  const { 
    orders, 
    isLoading, 
    connectionStatus, 
    isRefreshing, 
    handleManualRefresh, 
    updateOrderStatus 
  } = useOrders(soundEnabled, playDing);

  function getOrdersByStatus(status: OrderStatus): OrderWithItems[] {
    return orders.filter((o) => o.status === status);
  }

  function getTimeSince(createdAt: string): string {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(new Date(createdAt));
  }

  const pendingOrders = getOrdersByStatus("pending");
  const preparingOrders = getOrdersByStatus("preparing");
  const completedOrders = getOrdersByStatus("completed");
  const cancelledOrders = getOrdersByStatus("cancelled");

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner className="size-8 text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-svh bg-background">
      <div className="w-full px-4 py-6 sm:px-6 lg:px-8 flex-1">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Kitchen Dashboard
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Live orders for {currentRestaurant?.name}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <CancelledOrdersDrawer
              cancelledOrders={cancelledOrders}
              getTimeSince={getTimeSince}
            />

            <Badge className={STATUS_CONFIG.pending.badgeClass}>
              <Clock className="mr-1 size-3" />
              {pendingOrders.length} Pending
            </Badge>
            <Badge className={STATUS_CONFIG.preparing.badgeClass}>
              <ChefHat className="mr-1 size-3" />
              {preparingOrders.length} Preparing
            </Badge>
            <Badge className={STATUS_CONFIG.completed.badgeClass}>
              <Check data-icon="inline-start" />
              {completedOrders.length} Done
            </Badge>
            <div className="ml-2 flex items-center gap-2 border-l pl-4">
              {connectionStatus === "SUBSCRIBED" ? (
                <div className="flex items-center gap-1.5 text-green-600">
                  <span className="relative flex size-2">
                    <span className="absolute inline-flex size-full animate-pulse rounded-full bg-green-400 opacity-60" />
                    <span className="relative inline-flex size-2 rounded-full bg-green-500" />
                  </span>
                  <span className="text-xs font-medium">Live</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-red-500">
                  <WifiOff className="size-3.5" />
                  <span className="text-xs font-medium">Offline</span>
                </div>
              )}
              
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={() => {
                  setSoundEnabled(!soundEnabled);
                  if (!sharedAudioCtx) {
                    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
                    if (AudioContextClass) {
                      sharedAudioCtx = new AudioContextClass();
                    }
                  }
                  if (sharedAudioCtx && sharedAudioCtx.state === 'suspended') {
                    sharedAudioCtx.resume();
                  }
                }}
                title={soundEnabled ? "Mute alerts" : "Unmute alerts"}
              >
                {soundEnabled ? (
                  <Volume2 className="size-4" />
                ) : (
                  <VolumeX className="size-4 text-muted-foreground" />
                )}
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={handleManualRefresh}
                disabled={isRefreshing}
                title="Refresh orders"
              >
                <RefreshCw className={`size-4 ${isRefreshing ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>
        </div>

        {/* Kanban Columns */}
        <div className="flex snap-x snap-mandatory gap-6 overflow-x-auto pb-4 md:grid md:grid-cols-3 md:overflow-visible">
          {/* Pending Column */}
          <KanbanColumn
            title="Pending"
            icon={<Clock className="size-4 text-amber-600" />}
            count={pendingOrders.length}
            headerClass="border-amber-200 bg-amber-50/50"
          >
            {pendingOrders.length === 0 ? (
              <EmptyColumn message="No pending orders" />
            ) : (
              pendingOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  getTimeSince={getTimeSince}
                  actions={
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="h-11 flex-1 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                        onClick={() =>
                          updateOrderStatus(order.id, "cancelled")
                        }
                      >
                        <X className="mr-2 size-4" />
                        Cancel
                      </Button>
                      <Button
                        className="h-11 flex-1 text-base"
                        onClick={() =>
                          updateOrderStatus(order.id, "preparing")
                        }
                      >
                        <Zap className="mr-2 size-4" />
                        Start
                      </Button>
                    </div>
                  }
                />
              ))
            )}
          </KanbanColumn>

          {/* Preparing Column */}
          <KanbanColumn
            title="Preparing"
            icon={<ChefHat className="size-4 text-[#017E84]" />}
            count={preparingOrders.length}
            headerClass="border-teal-200 bg-teal-50/50"
          >
            {preparingOrders.length === 0 ? (
              <EmptyColumn message="No orders being prepared" />
            ) : (
              preparingOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  getTimeSince={getTimeSince}
                  actions={
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="h-11 flex-1 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                        onClick={() =>
                          updateOrderStatus(order.id, "cancelled")
                        }
                      >
                        <X className="mr-2 size-4" />
                        Cancel
                      </Button>
                      <Button
                        className="h-11 flex-1"
                        onClick={() =>
                          updateOrderStatus(order.id, "completed")
                        }
                      >
                        <Check className="mr-2 size-4" />
                        Complete
                      </Button>
                    </div>
                  }
                />
              ))
            )}
          </KanbanColumn>

          {/* Completed Column */}
          <KanbanColumn
            title="Completed"
            icon={<Check className="size-4 text-green-600" />}
            count={completedOrders.length}
            headerClass="border-green-200 bg-green-50/50"
          >
            {completedOrders.length === 0 ? (
              <EmptyColumn message="No completed orders yet" />
            ) : (
              <ScrollArea className="max-h-[calc(100svh-220px)]">
                <div className="space-y-3 pr-3">
                  {completedOrders.map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      getTimeSince={getTimeSince}
                    />
                  ))}
                </div>
              </ScrollArea>
            )}
          </KanbanColumn>
        </div>
      </div>
    </div>
  );
}
