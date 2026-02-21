import * as React from "react";
import { motion } from "framer-motion";

import { addDays, dateNumber, dayLabel, toDateKey } from "@/lib/plan-store";

type DayItem = {
  date: Date;
  key: string;
  label: string;
  number: number;
};

type Props = {
  selectedDateKey: string;
  onSelect: (dateKey: string) => void;
  pulseKey?: string | null;
  startDate?: Date;
};

export default function WeekRail({ selectedDateKey, onSelect, pulseKey, startDate }: Props) {
  const start = startDate ?? new Date();
  const days = React.useMemo<DayItem[]>(() => {
    return Array.from({ length: 7 }).map((_, i) => {
      const d = addDays(start, i);
      return {
        date: d,
        key: toDateKey(d),
        label: dayLabel(d),
        number: dateNumber(d),
      };
    });
  }, [start]);

  const todayKey = React.useMemo(() => toDateKey(new Date()), []);

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch]">
      {days.map((d) => {
        const selected = d.key === selectedDateKey;
        const isToday = d.key === todayKey;
        const shouldPulse = pulseKey && d.key === pulseKey;

        return (
          <motion.button
            key={d.key}
            type="button"
            data-testid={`chip-weekday-${d.key}`}
            onClick={() => onSelect(d.key)}
            className={
              "relative flex min-w-[62px] flex-col items-center justify-center rounded-2xl border px-3 py-2 text-left transition-colors " +
              (selected
                ? "border-[hsl(var(--ring)/0.55)] bg-[hsl(var(--ring)/0.16)] text-foreground"
                : "border-[hsl(var(--border)/0.7)] bg-[hsl(var(--background)/0.12)] text-[hsl(var(--muted-foreground))] hover:text-foreground")
            }
            animate={
              shouldPulse
                ? {
                    scale: [1, 1.04, 1],
                    opacity: [1, 1, 1],
                  }
                : undefined
            }
            transition={shouldPulse ? { duration: 0.45, ease: "easeOut" } : undefined}
          >
            <div className="text-[11px] font-medium" data-testid={`text-weekday-label-${d.key}`}>
              {d.label}
            </div>
            <div className={"mt-0.5 text-sm " + (selected ? "font-semibold" : "font-medium")} data-testid={`text-weekday-number-${d.key}`}>
              {d.number}
            </div>
            {isToday && !selected ? (
              <span
                className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[hsl(var(--ring))]"
                data-testid={`dot-weekday-today-${d.key}`}
              />
            ) : null}
          </motion.button>
        );
      })}
    </div>
  );
}
