import React from 'react';
import { Maximize2, Sparkles, ChefHat } from 'lucide-react';
import { motion } from 'framer-motion';
import { useLocation } from 'wouter';
import { usePlan } from '@/lib/plan-store';
import { getRecipe } from '@/lib/recipes';
import { SafeImage } from '@/components/ui/safe-image';

interface QuickActionsProps {
  onPlanClick: () => void;
}

export default function QuickActions({ onPlanClick }: QuickActionsProps) {
  const [, navigate] = useLocation();
  const plan = usePlan();
  
  // Get tonight's recipe
  const selectedDateKey = plan.selectedDateKey;
  const tonight = plan.getEntry(selectedDateKey, "dinner");
  const tonightRecipe = tonight ? getRecipe(tonight.recipeId) : null;
  
  // Count meals needed this week (dinner meals)
  const mealsNeeded = React.useMemo(() => {
    const today = new Date();
    let count = 0;
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      const entries = plan.getDayEntries(dateKey);
      if (!entries.dinner) count++;
    }
    return count;
  }, [plan.entries]);

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Scan Card - The AI Lens */}
      <motion.button
        onClick={() => navigate("/camera")}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="relative group overflow-hidden rounded-[2rem] h-52 bg-[#0a0a0a] border border-white/10 flex flex-col justify-between text-left shadow-2xl hover:shadow-amber-500/10 transition-shadow"
      >
        {/* Background Image */}
        <SafeImage
          src="/images/food-hero-bg.png"
          alt="Food ingredients"
          fallbacks={["/images/recipe-pasta.png"]}
          className="absolute inset-0 w-full h-full object-cover"
        />
        
        {/* Dark Overlay for Readability */}
        <div className="absolute inset-0 bg-black/60" />
        
        {/* Background Effects */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-500/25 via-transparent to-transparent opacity-70" />
        <div className="absolute inset-0 bg-noise opacity-40 mix-blend-overlay" />
        
        {/* Scanning Animation Line */}
        <div className="absolute inset-0 w-full h-[2px] bg-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.5)] animate-scan opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-0" />

        <div className="z-10 p-5 flex flex-col h-full justify-between">
          <div className="flex justify-between items-start">
            <div className="p-3.5 bg-gradient-to-br from-neutral-800 to-neutral-900 border border-white/10 rounded-2xl shadow-lg group-hover:shadow-amber-500/20 transition-all duration-300">
              <Maximize2 className="text-amber-500 w-6 h-6" strokeWidth={2.5} />
            </div>
            <span className="bg-amber-500/20 backdrop-blur-md text-white text-[10px] px-2.5 py-1 rounded-full border border-amber-500/30 font-bold uppercase tracking-wide flex items-center gap-1.5 shadow-lg">
              <Sparkles size={10} className="animate-pulse" /> AI Lens
            </span>
          </div>

          <div>
            <h3 className="text-white font-black text-2xl leading-tight mb-2 tracking-tight group-hover:text-amber-500 transition-colors duration-300">
              Scan Ingredients
            </h3>
            <p className="text-neutral-400 text-xs font-medium leading-relaxed pr-2">
              Scan food, get recipes
            </p>
          </div>
        </div>
      </motion.button>

      {/* Plan Card - Stacked Effect */}
      <motion.button
        onClick={onPlanClick}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="relative group overflow-hidden rounded-[2rem] h-52 bg-[#0a0a0a] border border-white/10 flex flex-col justify-between text-left shadow-2xl hover:shadow-amber-500/10 transition-shadow"
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-purple-500/20 via-transparent to-transparent opacity-60" />
        <div className="absolute inset-0 bg-noise opacity-50 mix-blend-overlay" />

        <div className="z-10 p-5 flex flex-col h-full justify-between">
          <div className="flex justify-between items-start">
            <div className="p-3.5 bg-gradient-to-br from-neutral-800 to-neutral-900 border border-white/10 rounded-2xl shadow-lg group-hover:shadow-purple-500/20 transition-all duration-300">
              <ChefHat className="text-purple-400 w-6 h-6" />
            </div>
          </div>

          <div>
            <h3 className="text-white font-black text-2xl leading-none mb-2 tracking-tight group-hover:text-purple-400 transition-colors duration-300">
              Chef's <br/>Plan
            </h3>
            <p className="text-neutral-500 text-xs font-medium leading-relaxed mb-4">
              {tonightRecipe
                ? `Tonight planned: ${tonightRecipe.title}`
                : mealsNeeded > 0
                  ? `${mealsNeeded} meals needed`
                  : "All meals planned!"}
            </p>

            {/* Progress Indicators - Match Screenshot Pattern */}
            {mealsNeeded > 0 && (
              <div className="flex items-center gap-1.5">
                {/* Three dark gray circles */}
                <div className="w-6 h-6 rounded-full bg-neutral-800 border border-neutral-700 shadow-sm" />
                <div className="w-6 h-6 rounded-full bg-neutral-800 border border-neutral-700 shadow-sm" />
                <div className="w-6 h-6 rounded-full bg-neutral-800 border border-neutral-700 shadow-sm" />
                {/* Purple circle with +count */}
                <div className="w-6 h-6 rounded-full bg-purple-600 border border-purple-500 flex items-center justify-center shadow-lg">
                  <span className="text-[9px] font-bold text-white">+{Math.min(mealsNeeded, 9)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.button>
    </div>
  );
}
