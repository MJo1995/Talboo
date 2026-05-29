import type { OrderWithItems, OrderStatus } from "@/hooks/useOrders";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Clock, ChefHat, Check } from "lucide-react";

export const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; icon: typeof Clock; badgeClass: string; iconClass: string }
> = {
  pending: {
    label: "Pending",
    icon: Clock,
    badgeClass: "bg-background text-amber-500 border-amber-500/20 hover:bg-background",
    iconClass: "text-amber-500",
  },
  preparing: {
    label: "Preparing",
    icon: ChefHat,
    badgeClass: "bg-background text-teal-500 border-teal-500/20 hover:bg-background",
    iconClass: "text-teal-500",
  },
  completed: {
    label: "Completed",
    icon: Check,
    badgeClass: "bg-background text-green-500 border-green-500/20 hover:bg-background",
    iconClass: "text-green-500",
  },
  cancelled: {
    label: "Cancelled",
    icon: Check, // Using Check as fallback, the UI uses X elsewhere for cancelled
    badgeClass: "bg-background text-red-500 border-red-500/20 hover:bg-background",
    iconClass: "text-red-500",
  },
};

export function OrderCard({
  order,
  getTimeSince,
  actions,
}: {
  order: OrderWithItems;
  getTimeSince: (createdAt: string) => string;
  actions?: React.ReactNode;
}) {
  const config = STATUS_CONFIG[order.status];

  return (
    <Card className="shadow-sm transition-shadow duration-200 hover:shadow-md animate-in fade-in zoom-in-[0.99] duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-xl font-extrabold tracking-tight">
              Table {order.table_number}
            </CardTitle>
            <Badge className={config.badgeClass}>{config.label}</Badge>
          </div>
          <span className="text-xs text-muted-foreground">
            {getTimeSince(order.created_at)}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          #{order.id.slice(0, 8).toUpperCase()}
        </p>
        {order.status === "cancelled" && order.cancelled_at && (
          <div className="mt-2 rounded bg-red-500/10 px-2 py-1.5 text-xs text-red-600 dark:text-red-400">
            Cancelled {getTimeSince(order.cancelled_at)}
          </div>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        <Separator className="mb-3" />
        <ul className="space-y-1.5">
          {order.items.map((item) => (
            <li key={item.id} className="flex flex-col text-sm">
              <div className="flex items-center justify-between">
                <span className="text-foreground break-words leading-snug pr-2">{item.menu_item_name}</span>
                <span className="rounded bg-primary/10 px-2 py-0.5 text-sm font-bold text-primary">
                  x{item.quantity}
                </span>
              </div>
              {item.notes && (
                <p className="mt-1.5 rounded-md bg-amber-500/10 px-2 py-1 text-xs font-medium text-amber-700 dark:text-amber-400">
                  Note: {item.notes}
                </p>
              )}
            </li>
          ))}
        </ul>
        <div className="mt-3 flex items-center justify-between border-t pt-3">
          <span className="text-xs text-muted-foreground">
            {order.items.length} {order.items.length === 1 ? "item" : "items"}
          </span>
          <span className="text-sm font-semibold tabular-nums text-primary">
            ${Number(order.total_amount).toFixed(2)}
          </span>
        </div>
        {actions && <div className="mt-3">{actions}</div>}
      </CardContent>
    </Card>
  );
}
