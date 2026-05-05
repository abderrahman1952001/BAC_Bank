import * as React from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type FilterChipProps = Omit<
  React.ComponentProps<typeof Button>,
  "size" | "variant"
> & {
  active?: boolean;
};

function FilterChip({
  active = false,
  className,
  ...props
}: FilterChipProps) {
  return (
    <Button
      data-active={active ? "true" : "false"}
      variant={active ? "secondary" : "outline"}
      size="sm"
      className={cn(
        "h-auto min-h-9 rounded-full px-3 py-1.5 whitespace-normal",
        active && "border-primary/40",
        className,
      )}
      {...props}
    />
  );
}

export { FilterChip };
