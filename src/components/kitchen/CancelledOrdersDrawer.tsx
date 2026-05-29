import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X } from "lucide-react";
import type { OrderWithItems } from "@/hooks/useOrders";
import { OrderCard } from "./OrderCard";

export function CancelledOrdersDrawer({
  cancelledOrders,
  getTimeSince,
}: {
  cancelledOrders: OrderWithItems[];
  getTimeSince: (createdAt: string) => string;
}) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 border-red-200 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700"
        >
          <X className="mr-2 size-3.5" />
          Cancelled ({cancelledOrders.length})
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle>Cancelled Orders</SheetTitle>
        </SheetHeader>
        <div className="mt-6">
          {cancelledOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <X className="mb-4 size-12 text-muted-foreground/30" />
              <p className="text-lg font-medium text-foreground">
                No cancelled orders
              </p>
              <p className="text-sm text-muted-foreground">
                This session is clean
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[calc(100svh-120px)]">
              <div className="space-y-3 pr-4">
                {cancelledOrders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    getTimeSince={getTimeSince}
                  />
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
