import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cn } from "@/lib/cn";

export function Switch({
  checked,
  onCheckedChange,
  label,
  className,
}: {
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
  label: string;
  className?: string;
}) {
  return (
    <label className={cn("inline-flex items-center gap-3 text-sm", className)}>
      <SwitchPrimitive.Root
        checked={checked}
        onCheckedChange={onCheckedChange}
        className="relative h-[26px] w-[44px] shrink-0 rounded-full bg-raised-3 transition-colors duration-200 data-[state=checked]:bg-ok"
      >
        <SwitchPrimitive.Thumb className="block size-[22px] translate-x-[2px] rounded-full bg-white shadow-[0_2px_6px_rgb(0_0_0/0.35)] transition-transform duration-200 ease-[var(--ease-out)] data-[state=checked]:translate-x-[20px]" />
      </SwitchPrimitive.Root>
      <span>{label}</span>
    </label>
  );
}
