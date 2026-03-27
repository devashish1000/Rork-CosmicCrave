import React, { useEffect, useState, useMemo } from 'react';
import { motion, useSpring, useTransform, useMotionValue, AnimatePresence } from 'framer-motion';
import { Zap, Activity, Droplets, X, Share2, TrendingUp, Atom, CheckCircle2, Check, UtensilsCrossed, Lightbulb } from 'lucide-react';
import { useLocation } from "wouter";
import { usePlan, toDateKey, addDays } from '@/lib/plan-store';
import { getRecipe, type RecipeFull } from '@/lib/recipes';
import { readUserScoped } from '@/lib/user-storage';
import { getCookedEntries } from "@/lib/cooked-store";

const PROFILE_PREFS_KEY = "profile:prefs:v1";
const PROFILE_PREFS_LEGACY_KEYS = ["snapcook:profile:prefs:v1"];
const DEFAULT_CALORIE_GOAL = 2000;

type NutritionEstimate = {
  protein: number;
  fat: number;
  carbs: number;
  calories: number;
};

const NUTRITION_OVERRIDES: Record<string, NutritionEstimate> = {
  s1: { protein: 26, fat: 16, carbs: 39, calories: 450 },
  s2: { protein: 22, fat: 14, carbs: 32, calories: 320 },
  s3: { protein: 12, fat: 8, carbs: 52, calories: 180 },
  r1: { protein: 20, fat: 12, carbs: 34, calories: 360 },
  r2: { protein: 42, fat: 18, carbs: 35, calories: 478 },
  r3: { protein: 16, fat: 22, carbs: 28, calories: 370 },
};

function parseCalories(value?: string) {
  if (!value) return 0;
  const matched = value.match(/\d+/g);
  if (!matched?.length) return 0;
  const merged = Number(matched.join(""));
  return Number.isFinite(merged) ? merged : 0;
}

function estimateNutrition(recipe: RecipeFull): NutritionEstimate {
  const overridden = NUTRITION_OVERRIDES[recipe.id];
  if (overridden) return overridden;

  const baseCalories = parseCalories(recipe.calories) || Math.max(260, recipe.minutes * 18);
  const protein = Math.max(10, Math.round((baseCalories * 0.26) / 4));
  const fat = Math.max(8, Math.round((baseCalories * 0.28) / 9));
  const carbs = Math.max(16, Math.round((baseCalories * 0.46) / 4));

  return {
    protein,
    fat,
    carbs,
    calories: baseCalories,
  };
}

function getCalorieGoal(): number {
  const raw = readUserScoped(PROFILE_PREFS_KEY, PROFILE_PREFS_LEGACY_KEYS);
  if (!raw) return DEFAULT_CALORIE_GOAL;
  try {
    const parsed = JSON.parse(raw);
    const goal = Number(parsed?.calorieGoal);
    return Number.isFinite(goal) && goal >= 900 && goal <= 5000 ? goal : DEFAULT_CALORIE_GOAL;
  } catch {
    return DEFAULT_CALORIE_GOAL;
  }
}

function calculateMacroTargets(weeklyCalorieGoal: number) {
  return {
    protein: Math.round((weeklyCalorieGoal * 0.26) / 4),
    fat: Math.round((weeklyCalorieGoal * 0.28) / 9),
    carbs: Math.round((weeklyCalorieGoal * 0.46) / 4),
  };
}

type Macro = {
  name: 'Protein' | 'Fats' | 'Carbs';
  current: number;
  target: number;
  unit: string;
  color: string;
};

const convertValue = (value: number, unit: 'g' | 'oz') => {
  if (unit === 'g') return value;
  return Number((value * 0.035274).toFixed(1));
};

const AnimatedCounter = ({ 
  value, 
  className, 
  decimals = 0 
}: { 
  value: number, 
  className?: string, 
  decimals?: number 
}) => {
  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, { damping: 30, stiffness: 100 });
  const displayValue = useTransform(springValue, (latest) => latest.toFixed(decimals));

  useEffect(() => {
    motionValue.set(value);
  }, [value, motionValue]);

  return <motion.span className={className}>{displayValue}</motion.span>;
};

// Ring Particle System Component
function RingParticleSystem({ 
  particleCount, 
  radius, 
  intensity, 
  color 
}: { 
  particleCount: number; 
  radius: number; 
  intensity: number; 
  color: string;
}) {
  const particles = useMemo(() => {
    return Array.from({ length: particleCount }, (_, i) => {
      const angle = (i / particleCount) * Math.PI * 2;
      const distance = radius + (Math.random() * 20 - 10);
      return {
        id: i,
        angle,
        distance,
        size: Math.random() * 2 + 1,
        duration: Math.random() * 4 + 3,
        delay: Math.random() * 2,
        opacity: Math.random() * 0.6 + 0.3,
      };
    });
  }, [particleCount, radius]);

  return (
    <div className="absolute inset-0">
      {particles.map((particle) => {
        const x = 50 + (Math.cos(particle.angle) * particle.distance) / (radius * 2) * 100;
        const y = 50 + (Math.sin(particle.angle) * particle.distance) / (radius * 2) * 100;
        
        return (
          <motion.div
            key={particle.id}
            className="absolute rounded-full"
            style={{
              left: `${x}%`,
              top: `${y}%`,
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              backgroundColor: color,
              boxShadow: `0 0 ${particle.size * 3}px ${color}`,
              opacity: particle.opacity * intensity,
              transform: 'translate(-50%, -50%)',
            }}
            animate={{
              scale: [1, 1.5 * intensity, 1],
              opacity: [
                particle.opacity * intensity * 0.5,
                particle.opacity * intensity,
                particle.opacity * intensity * 0.5,
              ],
              x: [
                Math.cos(particle.angle) * 5 * intensity,
                Math.cos(particle.angle) * 10 * intensity,
                Math.cos(particle.angle) * 5 * intensity,
              ],
              y: [
                Math.sin(particle.angle) * 5 * intensity,
                Math.sin(particle.angle) * 10 * intensity,
                Math.sin(particle.angle) * 5 * intensity,
              ],
            }}
            transition={{
              duration: particle.duration,
              repeat: Infinity,
              ease: "easeInOut",
              delay: particle.delay,
            }}
          />
        );
      })}
    </div>
  );
}

// Shared nutrition data hook
function useNutritionData() {
  const [location] = useLocation();
  const plan = usePlan();
  const cookedEntries = useMemo(() => getCookedEntries(), [location]);
  const dailyCalorieGoal = useMemo(() => getCalorieGoal(), []);
  const weeklyCalorieGoal = dailyCalorieGoal * 7;
  const macroTargets = useMemo(() => calculateMacroTargets(weeklyCalorieGoal), [weeklyCalorieGoal]);

  const weeklyNutrition = useMemo(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const weekStart = addDays(today, -dayOfWeek);
    const weekEnd = addDays(weekStart, 7);
    const totals = { protein: 0, fat: 0, carbs: 0, calories: 0 };
    const countedRecipes = new Set<string>();

    const addRecipeNutrition = (recipeId: string) => {
      const recipe = getRecipe(recipeId);
      if (!recipe) return;
      const nutrition = estimateNutrition(recipe);
      totals.protein += nutrition.protein;
      totals.fat += nutrition.fat;
      totals.carbs += nutrition.carbs;
      totals.calories += nutrition.calories;
      countedRecipes.add(recipe.id);
    };

    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const date = addDays(weekStart, dayOffset);
      const dateKey = toDateKey(date);
      const dayEntries = plan.getDayEntries(dateKey);

      Object.values(dayEntries).forEach((entry) => {
        if (!entry) return;
        addRecipeNutrition(entry.recipeId);
      });
    }

    // Count finished meals in this week even when they were cooked directly from "Cook now".
    cookedEntries.forEach((entry) => {
      if (!entry.cookedAt) return;
      if (countedRecipes.has(entry.recipeId)) return;
      const cookedAt = new Date(entry.cookedAt);
      if (cookedAt < weekStart || cookedAt >= weekEnd) return;
      addRecipeNutrition(entry.recipeId);
    });

    return totals;
  }, [plan.entries, cookedEntries]);

  const macros: Macro[] = [
    { name: 'Protein', current: weeklyNutrition.protein, target: macroTargets.protein, unit: 'g', color: 'blue' },
    { name: 'Fats', current: weeklyNutrition.fat, target: macroTargets.fat, unit: 'g', color: 'rose' },
    { name: 'Carbs', current: weeklyNutrition.carbs, target: macroTargets.carbs, unit: 'g', color: 'emerald' },
  ];

  const percentage = Math.min((weeklyNutrition.calories / weeklyCalorieGoal) * 100, 100);
  
  return { weeklyNutrition, weeklyCalorieGoal, macros, percentage };
}

// Unified NutritionHero component - matches reference structure
export function NutritionHero({ unit = 'g' }: { unit?: 'g' | 'oz' }) {
  const { weeklyNutrition, weeklyCalorieGoal, macros, percentage } = useNutritionData();
  const [selectedMacro, setSelectedMacro] = useState<Macro | null>(null);
  
  const isEmpty = weeklyNutrition.calories === 0;
  const radius = 75; // Increased to push circle further outside
  const stroke = 8; // Slightly thinner stroke
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative w-full py-4">
      <div className="flex items-center gap-4">
        {/* Macro Cards - Left Side */}
        <div className="flex flex-col gap-2 flex-1">
          {macros.map((macro, idx) => (
            <MacroPill 
              key={macro.name} 
              macro={macro} 
              index={idx} 
              unit={unit}
              isEmpty={isEmpty}
              onClick={() => setSelectedMacro(macro)}
            />
          ))}
        </div>

        {/* Main Radial Gauge - Right Side */}
        <div className="relative w-40 h-40 flex items-center justify-center flex-shrink-0">
          <svg height={radius * 2} width={radius * 2} className="rotate-[-90deg] drop-shadow-lg">
            {/* Background circle - more visible when empty */}
            <circle 
              stroke={isEmpty ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.03)"} 
              strokeWidth={stroke} 
              strokeDasharray={isEmpty ? "6 3" : "none"}
              fill="transparent" 
              r={normalizedRadius} 
              cx={radius} 
              cy={radius} 
            />
            <motion.circle
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ type: "spring", stiffness: 50, damping: 20, delay: 0.2 }}
              stroke="url(#gradient)"
              strokeWidth={stroke}
              strokeLinecap="round"
              fill="transparent"
              r={normalizedRadius}
              cx={radius}
              cy={radius}
              style={{ strokeDasharray: circumference + ' ' + circumference, opacity: isEmpty ? 0.3 : 1 }}
            />
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#d97706" />
                <stop offset="100%" stopColor="#fbbf24" />
              </linearGradient>
            </defs>
          </svg>

          {/* Center Data */}
          <div className="absolute flex flex-col items-center text-center">
            {isEmpty ? (
              // Empty State - Compact
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3, type: "spring" }}
                className="flex flex-col items-center"
              >
                <motion.div
                  animate={{ 
                    y: [0, -4, 0],
                    rotate: [0, 3, -3, 0]
                  }}
                  transition={{ 
                    duration: 3, 
                    repeat: Infinity, 
                    ease: "easeInOut" 
                  }}
                  className="mb-1"
                >
                  <UtensilsCrossed size={20} className="text-amber-500/40" strokeWidth={1.5} />
                </motion.div>
                <span className="text-[10px] font-bold text-amber-500/60 uppercase tracking-widest mb-0.5">Calories</span>
                <span className="text-4xl font-bold text-white/40 tracking-tighter tabular-nums">
                  0
                </span>
                <span className="text-[10px] font-bold text-neutral-400">
                  / {weeklyCalorieGoal.toLocaleString()} kcal
                </span>
              </motion.div>
            ) : (
              // Normal State - Compact
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-0.5">Calories</span>
                <span className="text-5xl font-bold text-white tracking-tighter tabular-nums leading-none">
                  <AnimatedCounter value={weeklyNutrition.calories} />
                </span>
                <span className="text-[10px] font-bold text-neutral-400 mt-0.5">
                  / {weeklyCalorieGoal.toLocaleString()} kcal
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Rich Detail Modal */}
      <AnimatePresence>
        {selectedMacro && (
          <MacroDetailModal 
            key="macro-detail-modal"
            macro={selectedMacro} 
            unit={unit} 
            onClose={() => setSelectedMacro(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}


// Horizontal Macro Pill Component - Compact Design
const MacroPill: React.FC<{ 
  macro: Macro; 
  index: number; 
  unit: 'g' | 'oz';
  onClick: () => void;
  isEmpty?: boolean;
}> = ({ macro, index, unit, onClick, isEmpty = false }) => {
  const currentVal = convertValue(macro.current, unit);
  const targetVal = convertValue(macro.target, unit);
  const percentage = Math.min((macro.current / macro.target) * 100, 100);
  const isMet = macro.current >= macro.target;
  
  const colorMap = {
    blue: 'bg-blue-500',
    rose: 'bg-rose-500',
    emerald: 'bg-emerald-500'
  };

  const themeMap = {
    blue: { 
      border: 'border-blue-500/20', 
      shadow: 'shadow-blue-500/10', 
      checkText: 'text-blue-400', 
      checkBg: 'bg-blue-500/20', 
      icon: Zap,
      text: 'text-blue-400',
      bg: 'bg-gradient-to-br from-blue-500/10 to-blue-900/5'
    },
    rose: { 
      border: 'border-rose-500/20', 
      shadow: 'shadow-rose-500/10', 
      checkText: 'text-rose-400', 
      checkBg: 'bg-rose-500/20', 
      icon: Droplets,
      text: 'text-rose-400',
      bg: 'bg-gradient-to-br from-rose-500/10 to-rose-900/5'
    },
    emerald: { 
      border: 'border-emerald-500/20', 
      shadow: 'shadow-emerald-500/10', 
      checkText: 'text-emerald-400', 
      checkBg: 'bg-emerald-500/20', 
      icon: Activity,
      text: 'text-emerald-400',
      bg: 'bg-gradient-to-br from-emerald-500/10 to-emerald-900/5'
    }
  };
  
  const theme = themeMap[macro.color as keyof typeof themeMap];
  const Icon = theme.icon;
  
  return (
    <motion.button
      layoutId={`macro-pill-${macro.name}`}
      onClick={onClick}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      whileTap={{ scale: 0.97 }}
      whileHover={{ scale: 1.02 }}
      transition={{ delay: 0.3 + (index * 0.1) }}
      className={`
        relative w-full overflow-hidden rounded-xl p-2.5 flex flex-col gap-1.5 group transition-all duration-300
        ${isMet 
           ? `bg-[#080808] border ${theme.border} shadow-md` 
           : isEmpty
           ? `bg-[#080808] border ${theme.border} opacity-60`
           : `bg-[#080808] border ${theme.border}`
        }
      `}
    >
      {/* Background Gradient - Same as Modal */}
      <div className={`absolute inset-0 ${theme.bg} pointer-events-none opacity-40`} />

      {/* Empty State Pattern Overlay */}
      {isEmpty && (
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(255,255,255,0.03) 8px, rgba(255,255,255,0.03) 16px)`
          }} />
        </div>
      )}

      {/* Background Glow for Met status */}
      {isMet && <div className={`absolute inset-0 ${theme.bg} pointer-events-none opacity-60`} />}
      
      {/* Goal Met Indicator */}
      {isMet && (
        <motion.div 
          initial={{ scale: 0, rotate: -45 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className={`absolute top-1.5 right-1.5 w-3 h-3 rounded-full ${theme.checkBg} border border-white/10 flex items-center justify-center z-20`}
        >
          <Check size={8} strokeWidth={3} className={theme.checkText} />
        </motion.div>
      )}

      {/* Icon and Label Row */}
      <div className="flex items-center gap-1.5 relative z-10">
        <Icon 
          size={12} 
          className={isEmpty ? 'text-neutral-500/50' : theme.text} 
          strokeWidth={2.5} 
        />
        <span className={`text-[9px] font-bold uppercase tracking-wider ${isEmpty ? 'text-neutral-500/70' : theme.text}`}>
          {macro.name}
        </span>
      </div>

      {/* Value Row */}
      <div className="flex items-baseline gap-1 relative z-10">
        <span className={`text-xl font-black tabular-nums leading-none tracking-tight ${isEmpty ? 'text-white/40' : 'text-white'}`}>
          {isEmpty ? '0' : <AnimatedCounter value={currentVal} decimals={unit === 'oz' ? 1 : 0} />}
        </span>
        <span className={`text-[9px] font-medium tabular-nums ${isEmpty ? 'text-neutral-500/60' : 'text-neutral-500'}`}>
          /{targetVal}
        </span>
      </div>

      {/* Progress Bar - Horizontal */}
      <div className={`w-full h-1 rounded-full overflow-hidden relative z-10 ${isEmpty ? 'bg-white/3' : 'bg-white/5'}`}>
        {isEmpty ? (
          <div className="h-full w-full" style={{
            backgroundImage: `repeating-linear-gradient(90deg, transparent, transparent 3px, rgba(255,255,255,0.05) 3px, rgba(255,255,255,0.05) 6px)`
          }} />
        ) : (
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ type: "spring", stiffness: 50, damping: 15, mass: 1 }}
            className={`h-full relative overflow-hidden ${colorMap[macro.color as keyof typeof colorMap]} shadow-[0_0_6px_currentColor]`}
          >
            <motion.div 
              className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-[-20deg]"
              animate={{ x: ['-150%', '200%'] }}
              transition={{ repeat: Infinity, duration: 2, ease: "linear", repeatDelay: 0.5 }}
            />
          </motion.div>
        )}
      </div>
    </motion.button>
  );
};

const MacroDetailModal: React.FC<{
  macro: Macro;
  unit: 'g' | 'oz';
  onClose: () => void;
}> = ({ macro, unit, onClose }) => {
  const Icon = macro.name === 'Protein' ? Zap : macro.name === 'Carbs' ? Activity : Droplets;
  
  const currentVal = convertValue(macro.current, unit);
  const targetVal = convertValue(macro.target, unit);
  const percentage = Math.round((macro.current / macro.target) * 100);
  const isTargetMet = macro.current >= macro.target;
  const remaining = Math.max(0, targetVal - currentVal);

  const theme = {
    blue: { 
      bg: 'bg-gradient-to-br from-blue-500/10 to-blue-900/5', 
      border: 'border-blue-500/20', 
      text: 'text-blue-400', 
      bar: 'bg-blue-500', 
      pill: 'bg-blue-500/10 border-blue-500/20 text-blue-300'
    },
    rose: { 
      bg: 'bg-gradient-to-br from-rose-500/10 to-rose-900/5', 
      border: 'border-rose-500/20', 
      text: 'text-rose-400', 
      bar: 'bg-rose-500', 
      pill: 'bg-rose-500/10 border-rose-500/20 text-rose-300'
    },
    emerald: { 
      bg: 'bg-gradient-to-br from-emerald-500/10 to-emerald-900/5', 
      border: 'border-emerald-500/20', 
      text: 'text-emerald-400', 
      bar: 'bg-emerald-500', 
      pill: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
    }
  }[macro.color as 'blue' | 'rose' | 'emerald'];

  const getSources = (type: string) => {
    switch(type) {
      case 'Protein': return [
        { name: 'Grilled Chicken', amt: 32, icon: '🍗' },
        { name: 'Greek Yogurt', amt: 12, icon: '🥣' },
        { name: 'Tofu', amt: 8, icon: '🧊' }
      ];
      case 'Carbs': return [
        { name: 'Brown Rice', amt: 45, icon: '🍚' },
        { name: 'Oats', amt: 27, icon: '🌾' },
        { name: 'Banana', amt: 25, icon: '🍌' }
      ];
      default: return [
        { name: 'Avocado', amt: 15, icon: '🥑' },
        { name: 'Almonds', amt: 14, icon: '🥜' },
        { name: 'Olive Oil', amt: 14, icon: '🫒' }
      ];
    }
  };

  const getMicros = (type: string) => {
    switch(type) {
      case 'Protein': return [{ n: 'Iron', s: 'Fe' }, { n: 'Zinc', s: 'Zn' }, { n: 'B12', s: 'B12' }];
      case 'Carbs': return [{ n: 'Fiber', s: 'Fi' }, { n: 'Magnesium', s: 'Mg' }, { n: 'Potassium', s: 'K' }];
      default: return [{ n: 'Vit E', s: 'E' }, { n: 'Omega-3', s: 'Ω3' }, { n: 'Vit K', s: 'K' }];
    }
  };

  const micros = getMicros(macro.name);
  const sources = getSources(macro.name);

  const handleShare = async () => {
    const text = `I've hit ${currentVal}${unit} of ${macro.name} this week! 🎯 Goal: ${targetVal}${unit}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `My ${macro.name} Progress`,
          text: text,
        });
      } catch (error) { console.log('Error sharing', error); }
    } else {
      alert(`Shared: "${text}"`);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.3 } }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0, transition: { duration: 0.3 } }}
        className="absolute inset-0 bg-black/80 backdrop-blur-xl" 
        onClick={onClose} 
      />
      
      <motion.div
        layoutId={`macro-card-${macro.name}`}
        transition={{ type: "spring", damping: 25, stiffness: 280, mass: 0.6 }}
        exit={{ 
          opacity: 0, 
          scale: 0.9, 
          y: 20, 
          transition: { duration: 0.25, ease: "easeInOut" } 
        }}
        className={`relative w-full max-w-[340px] overflow-hidden rounded-[2rem] border ${theme.border} bg-[#080808] shadow-2xl flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`absolute inset-0 ${theme.bg} pointer-events-none opacity-40`} />

        <motion.button 
          onClick={onClose}
          exit={{ opacity: 0, transition: { duration: 0.1 } }}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/5 border border-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-colors z-30"
        >
          <X size={14}/>
        </motion.button>

        {/* 1. HEADER AREA */}
        <div className="relative p-6 pb-2 z-10">
          <div className="flex flex-col gap-1 mb-5">
            {/* Icon + Title Row */}
            <div className="flex items-center gap-3 mb-1">
              <div className={`p-2.5 rounded-2xl bg-white/5 border border-white/5 ${theme.text} shadow-lg ring-1 ring-white/5`}>
                <Icon size={22} />
              </div>
              <h3 className="text-3xl font-black text-white leading-none tracking-tight">{macro.name}</h3>
            </div>
            
            {/* Stats Row */}
            <div className="flex items-end justify-between mt-2">
              <motion.button 
                onClick={handleShare}
                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.1 } }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border ${theme.pill} hover:bg-white/10 transition-colors group cursor-pointer`}
              >
                <Share2 size={10} className="group-hover:scale-110 transition-transform"/>
                <span className="text-[10px] font-bold uppercase tracking-wide">Share Macro</span>
              </motion.button>

              <div className="text-right flex items-baseline gap-1">
                <div className="text-4xl font-black text-white tabular-nums leading-none tracking-tight">
                  <AnimatedCounter value={currentVal} decimals={unit === 'oz' ? 1 : 0} />
                </div>
                <div className="flex flex-col items-start leading-none opacity-80">
                  <span className="text-[10px] font-bold text-neutral-500 uppercase">{unit === 'g' ? 'Grams' : 'Oz'}</span>
                  <span className="text-xs font-bold text-neutral-600">/ {targetVal}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="h-2.5 w-full bg-white/5 rounded-full overflow-hidden p-0.5 border border-white/5">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(percentage, 100)}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className={`h-full rounded-full relative overflow-hidden ${theme.bar} shadow-[0_0_15px_currentColor]`}
            />
          </div>
        </div>

        {/* WRAPPER FOR EXTRA DETAILS */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10, transition: { duration: 0.15 } }}
          className="flex-1 flex flex-col"
        >
          {/* 2. DASHBOARD ROW (Micros + Status) */}
          <div className="relative px-6 py-2 z-10 grid grid-cols-2 gap-3">
            {/* Micros - Grid Layout */}
            <div className="bg-white/5 rounded-[1.2rem] p-4 border border-white/5 flex flex-col justify-between h-24 overflow-hidden relative">
              <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest flex items-center gap-1 relative z-10">
                <Atom size={10}/> Key Micros
              </span>
              <div className="flex justify-between items-center mt-1 relative z-10">
                {micros.map((m, i) => (
                  <motion.div 
                    key={m.n} 
                    initial={{ scale: 0.5, opacity: 0, y: 8 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + (i * 0.1), type: "spring", stiffness: 300, damping: 12 }}
                    className="flex flex-col items-center gap-1.5"
                  >
                    <div className={`w-9 h-9 rounded-xl ${theme.pill} flex items-center justify-center border ${theme.border} shadow-lg relative overflow-hidden`}>
                      {/* Shimmer Effect */}
                      <motion.div
                        initial={{ x: '-150%' }}
                        animate={{ x: '150%' }}
                        transition={{ delay: 0.6 + (i * 0.1), duration: 1.2, ease: "easeInOut" }}
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12"
                      />
                      <span className="text-xs font-black relative z-10">{m.s}</span>
                    </div>
                    <span className="text-[8px] font-bold text-neutral-500">{m.n.substring(0,4)}</span>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Status - Enhanced Layout */}
            <div className="bg-white/5 rounded-[1.2rem] p-4 border border-white/5 flex flex-col justify-between h-24 relative overflow-hidden group">
              {/* Background Ambience */}
              <div className={`absolute top-0 right-0 w-full h-full bg-gradient-to-bl ${isTargetMet ? 'from-emerald-500/10' : 'from-amber-500/10'} to-transparent opacity-30`} />
              
              <div className="flex justify-between items-start relative z-10">
                <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest">Status</span>
                <TrendingUp size={14} className={`opacity-50 ${isTargetMet ? 'text-emerald-400' : 'text-amber-400'}`}/>
              </div>

              <div className="flex flex-col relative z-10">
                <div className="flex items-baseline gap-2">
                  {/* Status Text with Animated Underline */}
                  <div className="relative">
                    <motion.span 
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="text-lg font-black tracking-tight text-white"
                    >
                      {isTargetMet ? 'Optimized' : 'Steady'}
                    </motion.span>
                    <motion.div 
                      className={`absolute -bottom-1 left-0 h-0.5 rounded-full ${isTargetMet ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-amber-500 shadow-[0_0_8px_#f59e0b]'}`}
                      initial={{ width: 0 }}
                      animate={{ width: '100%' }}
                      transition={{ delay: 0.4, duration: 0.8, type: "spring" }}
                    />
                  </div>
                </div>
                
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className={`text-[10px] font-bold mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md w-fit border backdrop-blur-sm ${isTargetMet ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' : 'bg-amber-500/10 border-amber-500/20 text-amber-300'}`}
                >
                  {isTargetMet ? <CheckCircle2 size={10} /> : <div className="w-1.5 h-1.5 rounded-full bg-current animate-pulse"/>}
                  {isTargetMet ? 'Target Met' : `+${remaining.toFixed(0)}${unit} Needed`}
                </motion.div>
              </div>
            </div>
          </div>

          {/* 3. SOURCES LIST */}
          <div className="relative px-6 pt-3 pb-6 z-10">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-[9px] font-bold text-white/30 uppercase tracking-widest">Top Sources</h4>
            </div>
            
            <div className="space-y-2">
              {sources.map((source, i) => (
                <motion.div 
                  key={source.name}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + (0.05 * i) }}
                  className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-black/30 flex items-center justify-center text-lg border border-white/5 shadow-inner">
                      {source.icon}
                    </div>
                    <div className="flex flex-col justify-center">
                      <span className="text-xs font-bold text-neutral-200 leading-none group-hover:text-white transition-colors">{source.name}</span>
                      <span className="text-[10px] font-medium text-neutral-500 mt-1">{convertValue(source.amt, unit)}{unit}</span>
                    </div>
                  </div>
                  {/* Subtle Badge Style */}
                  <div className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border ${theme.pill} tabular-nums`}>
                    {macro.current > 0 ? Math.round((source.amt / macro.current) * 100) : 0}%
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
};
