import * as React from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SelectionCardProps = Omit<
  React.ComponentProps<typeof Button>,
  "size" | "variant"
> & {
  active?: boolean;
};

function SelectionCard({
  active = false,
  className,
  ...props
}: SelectionCardProps) {
  return (
    <Button
      data-active={active ? "true" : "false"}
      variant="outline"
      size="default"
      className={cn(
        "grid h-auto min-h-24 w-full justify-start gap-2 rounded-[1.75rem] border bg-card p-4 text-start whitespace-normal shadow-xs transition-transform hover:-translate-y-0.5 hover:border-primary/40 hover:bg-accent/20 hover:text-foreground hover:shadow-sm disabled:translate-y-0 disabled:shadow-none [&_small]:text-xs [&_small]:leading-6 [&_small]:text-muted-foreground [&_span]:text-sm [&_span]:text-muted-foreground [&_strong]:text-base [&_strong]:font-semibold",
        active && "border-primary/50 bg-secondary shadow-none",
        className,
      )}
      {...props}
    />
  );
}

export { SelectionCard };
