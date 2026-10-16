import { useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

/**
 * Controle segmentado no estilo iOS: o "pill" desliza até a opção ativa.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
}: {
  options: ReadonlyArray<readonly [T, string]>;
  value: T;
  onChange: (value: T) => void;
  label: string;
  className?: string;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const [pill, setPill] = useState<{ left: number; width: number } | null>(null);

  useLayoutEffect(() => {
    const el = wrap.current?.querySelector<HTMLButtonElement>(`[data-value="${CSS.escape(value)}"]`);
    if (el) setPill({ left: el.offsetLeft, width: el.offsetWidth });
  }, [value, options]);

  return (
    <div
      ref={wrap}
      role="radiogroup"
      aria-label={label}
      className={cn("relative inline-flex rounded-full bg-raised-2 p-1", className)}
    >
      {pill ? (
        <span
          aria-hidden="true"
          className="absolute top-1 bottom-1 rounded-full bg-raised-3 shadow-[0_1px_2px_rgb(0_0_0/0.4),inset_0_1px_0_rgb(255_255_255/0.06)] transition-[left,width] duration-300 ease-[var(--ease-out)]"
          style={{ left: pill.left, width: pill.width }}
        />
      ) : null}
      {options.map(([id, text]) => (
        <button
          key={id}
          type="button"
          role="radio"
          aria-checked={value === id}
          data-value={id}
          onClick={() => onChange(id)}
          className={cn(
            "relative z-10 h-8 rounded-full px-3.5 text-[13px] font-medium whitespace-nowrap transition-colors duration-150",
            value === id ? "text-fg" : "text-muted hover:text-fg",
          )}
        >
          {text}
        </button>
      ))}
    </div>
  );
}
