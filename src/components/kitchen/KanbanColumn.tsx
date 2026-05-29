import { Badge } from "@/components/ui/badge";
import { UtensilsCrossed } from "lucide-react";

export function KanbanColumn({
  title,
  icon,
  count,
  headerClass,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  count: number;
  headerClass: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex w-[85vw] shrink-0 snap-center flex-col md:w-auto md:min-w-[360px] md:max-w-[420px]">
      <div
        className={`mb-4 flex items-center gap-2 rounded-lg border px-4 py-3 ${headerClass}`}
      >
        {icon}
        <span className="text-sm font-semibold text-foreground">{title}</span>
        <Badge variant="secondary" className="ml-auto text-xs">
          {count}
        </Badge>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

export function EmptyColumn({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
      <UtensilsCrossed className="mb-2 size-8 text-muted-foreground/30" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
