import React from 'react';
import { Clock, Star, Flame, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { useLocation } from 'wouter';
import { SafeImage } from '@/components/ui/safe-image';

type Recipe = {
  id: string;
  title: string;
  image?: string;
  calories?: string;
  timeMins: number;
  tags: string[];
  rating?: number;
};

interface RecentCreationsProps {
  recipes: Recipe[];
}

function formatCaloriesLabel(value: string) {
  const normalized = value.trim();
  if (!normalized) return "";
  return /kcal/i.test(normalized) ? normalized : `${normalized} kcal`;
}

export default function RecentCreations({ recipes }: RecentCreationsProps) {
  const [, navigate] = useLocation();

  if (recipes.length === 0) {
    return (
      <div className="pb-32">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white tracking-tight">Recent Creations</h2>
        </div>
        <div className="rounded-[1.5rem] border border-white/10 bg-neutral-900 p-6">
          <p className="text-neutral-400 text-sm">Your recipe collection starts here</p>
          <p className="text-neutral-500 text-xs mt-2">Scan ingredients to discover recipes, then save your favorites.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-32">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white tracking-tight">Recent Creations</h2>
      </div>

      <div className="space-y-5">
        {recipes.map((recipe, index) => (
          <motion.div
            key={recipe.id}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + (index * 0.1), type: "spring", damping: 20 }}
            onClick={() => navigate(`/recipe/${recipe.id}`)}
            className="group relative h-32 rounded-[1.5rem] overflow-hidden bg-neutral-900 border border-white/10 cursor-pointer shadow-lg hover:shadow-2xl hover:shadow-black/50 transition-all duration-500"
          >
            {/* Background Image with Zoom Effect */}
            <div className="absolute inset-0 z-0">
              <SafeImage
                src={recipe.image || "/images/recipe-pasta.png"}
                alt={recipe.title}
                fallbacks={["/images/recipe-pasta.png", "/images/food-hero-bg.png"]}
                className="w-full h-full object-cover opacity-60 group-hover:opacity-40 group-hover:scale-110 transition-all duration-700" 
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent" />
            </div>

            {/* Content Overlay */}
            <div className="absolute inset-0 z-10 p-5 flex flex-col justify-center">
              <div className="flex items-center gap-2 mb-2">
                {recipe.tags.slice(0, 2).map(tag => (
                  <span key={tag} className="text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-md bg-white/10 text-white/90 backdrop-blur-md border border-white/5">
                    {tag}
                  </span>
                ))}
                {recipe.rating && (
                  <div className="flex items-center gap-1 bg-amber-500/20 backdrop-blur-md px-2 py-1 rounded-md border border-amber-500/20">
                    <Star size={10} className="text-amber-500 fill-amber-500" />
                    <span className="text-[10px] font-bold text-amber-500">{recipe.rating}</span>
                  </div>
                )}
              </div>
              
              <h3 className="text-white font-bold text-lg leading-tight mb-3 w-3/4 group-hover:text-amber-500 transition-colors">
                {recipe.title}
              </h3>
              
              <div className="flex items-center gap-4 text-xs font-medium text-neutral-400">
                <div className="flex items-center gap-1.5 bg-black/40 px-2 py-1 rounded-full">
                  <Clock size={12} className="text-neutral-500" />
                  <span>{recipe.timeMins} min</span>
                </div>
                {recipe.calories && (
                  <div className="flex items-center gap-1.5 bg-black/40 px-2 py-1 rounded-full">
                    <Flame size={12} className="text-amber-600" />
                    <span className="text-neutral-300">{formatCaloriesLabel(recipe.calories)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Right Arrow Interaction */}
            <div className="absolute right-5 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transform translate-x-4 group-hover:translate-x-0 transition-all duration-300 backdrop-blur-sm">
              <ArrowRight size={18} className="text-white" />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
