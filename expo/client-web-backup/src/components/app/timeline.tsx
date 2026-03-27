import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { usePlan, toDateKey, addDays, dayLabel, dateNumber } from '@/lib/plan-store';
import { getRecipe } from '@/lib/recipes';
import { SafeImage } from '@/components/ui/safe-image';

interface TimelineProps {
  onDayClick: (dateKey: string) => void;
}

export default function Timeline({ onDayClick }: TimelineProps) {
  const plan = usePlan();

  // Generate 7-day week view (Sunday to Saturday)
  const days = useMemo(() => {
    const today = new Date();
    const todayKey = toDateKey(today);
    
    // Find the start of the week (Sunday)
    // getDay() returns 0 for Sunday, 1 for Monday, etc.
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const weekStart = addDays(today, -dayOfWeek); // Go back to Sunday

    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(weekStart, i); // Start from Sunday, add i days
      const dateKey = toDateKey(date);
      const entries = plan.getDayEntries(dateKey);

      // Get primary recipe (dinner > lunch > breakfast)
      const primaryRecipe = entries.dinner?.recipeId
        ? getRecipe(entries.dinner.recipeId)
        : entries.lunch?.recipeId
        ? getRecipe(entries.lunch.recipeId)
        : entries.breakfast?.recipeId
        ? getRecipe(entries.breakfast.recipeId)
        : null;

      const hasMeals = !!(entries.breakfast || entries.lunch || entries.dinner);
      const isEmpty = !entries.breakfast && !entries.lunch && !entries.dinner;

      return {
        dateKey,
        date,
        day: dayLabel(date),
        dayNum: dateNumber(date),
        isToday: dateKey === todayKey,
        hasMeals,
        isEmpty,
        primaryRecipe,
      };
    });
  }, [plan]);


  return (
    <div>
      {/* THIS WEEK Label - Second instance above timeline circles */}
      <div className="mb-3">
        <p className="sc-title text-xs font-semibold text-foreground">
          This Week
        </p>
      </div>
      
      <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 scroll-smooth">
        {days.map((day, idx) => (
          <DayCircle 
            key={day.dateKey} 
            day={day} 
            index={idx}
            onClick={() => onDayClick(day.dateKey)}
          />
        ))}
      </div>
    </div>
  );
}

const DayCircle: React.FC<{ 
  day: { 
    dateKey: string; 
    day: string; 
    dayNum: number; 
    isToday: boolean; 
    hasMeals: boolean;
    isEmpty: boolean;
    primaryRecipe: ReturnType<typeof getRecipe> | null;
  };
  index: number;
  onClick: () => void;
}> = ({ day, index, onClick }) => {
  const isSelected = day.isToday;
  
  return (
    <motion.button
      onClick={onClick}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.1, type: "spring" }}
      className={`relative w-[4.5rem] h-[4.5rem] rounded-full overflow-hidden border-2 transition-all duration-300 group flex-shrink-0
        ${isSelected 
          ? 'border-amber-500 bg-[#1a1614] shadow-[0_0_15px_rgba(245,158,11,0.2)]' 
          : day.isEmpty
          ? 'bg-[#0a0a0a] border-white/5 text-neutral-400 hover:border-white/20 hover:bg-[#121212]'
          : 'bg-[#0a0a0a] border-amber-500/50 hover:border-amber-500/70'
        }`}
    >
      {/* Recipe Image or Empty State */}
      {day.primaryRecipe?.image ? (
        // Full image with text shadow/outline only
        <div className="relative w-full h-full">
          <SafeImage
            src={day.primaryRecipe.image}
            alt={day.primaryRecipe.title}
            fallbacks={["/images/recipe-pasta.png", "/images/food-hero-bg.png"]}
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/5 via-transparent to-black/20" />
          
          {/* Text with Strong Shadow/Outline - Bottom Center */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
            <div className="flex items-center justify-center gap-1">
              <span 
                className={`text-[9px] font-bold uppercase tracking-wider ${isSelected ? 'text-amber-400' : 'text-white'}`}
                style={{
                  textShadow: '0 0 8px rgba(0,0,0,0.9), 0 0 4px rgba(0,0,0,0.8), 0 2px 4px rgba(0,0,0,0.9), -1px -1px 0 rgba(0,0,0,0.8), 1px 1px 0 rgba(0,0,0,0.8), -1px 1px 0 rgba(0,0,0,0.8), 1px -1px 0 rgba(0,0,0,0.8)'
                }}
              >
                {day.day}
              </span>
              <span 
                className={`text-[10px] font-bold ${isSelected ? 'text-amber-400' : 'text-white'}`}
                style={{
                  textShadow: '0 0 8px rgba(0,0,0,0.9), 0 0 4px rgba(0,0,0,0.8), 0 2px 4px rgba(0,0,0,0.9), -1px -1px 0 rgba(0,0,0,0.8), 1px 1px 0 rgba(0,0,0,0.8), -1px 1px 0 rgba(0,0,0,0.8), 1px -1px 0 rgba(0,0,0,0.8)'
                }}
              >
                {day.dayNum}
              </span>
            </div>
          </div>
        </div>
      ) : day.isEmpty ? (
        // Empty state - gradient + plus
        <div className="w-full h-full flex items-center justify-center transition-all group-hover:scale-110 group-hover:bg-white/5">
          <Plus className="w-8 h-8 text-white transition-all duration-300 group-hover:text-amber-500 group-hover:scale-125" strokeWidth={3} />
        </div>
      ) : (
        // Has meals but no photo - show first letter
        <div
          className="w-full h-full flex items-center justify-center text-xl font-semibold text-white"
          style={{
            background:
              "linear-gradient(135deg, hsl(var(--ring)/0.15) 0%, hsl(var(--ring)/0.05) 100%)",
          }}
        >
          {day.primaryRecipe?.title.charAt(0).toUpperCase() || "?"}
        </div>
      )}

      {/* Day label - top (only show when no image) */}
      {!day.primaryRecipe?.image && (
        <div className="absolute top-1.5 left-0 right-0 flex justify-center pointer-events-none z-20">
          <span className={`text-[9px] font-bold uppercase tracking-widest ${isSelected ? "text-amber-600" : "text-white"}`}>
            {day.day}
          </span>
        </div>
      )}

      {/* Day number - bottom (only show when no image) */}
      {!day.primaryRecipe?.image && (
        <div className="absolute bottom-1.5 left-0 right-0 flex justify-center pointer-events-none z-20">
          <span className={`text-xs font-bold ${isSelected ? 'text-amber-600' : 'text-white'}`}>
            {day.dayNum}
          </span>
        </div>
      )}

      {/* Bottom Dots - only show if has meals */}
      {day.hasMeals && (
        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-0.5 opacity-60">
          <div className={`w-0.5 h-0.5 rounded-full ${isSelected ? 'bg-amber-500' : 'bg-white'}`} />
          <div className={`w-0.5 h-0.5 rounded-full ${isSelected ? 'bg-amber-500' : 'bg-white'}`} />
          <div className={`w-0.5 h-0.5 rounded-full ${isSelected ? 'bg-amber-500' : 'bg-white'}`} />
        </div>
      )}
    </motion.button>
  );
};
