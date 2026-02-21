import React from 'react';
import { Link, useLocation } from 'wouter';
import { Home, Search, BookHeart, User as UserIcon, Plus } from 'lucide-react';

const NavBar: React.FC = () => {
  const [location] = useLocation();
  const path = location.split("?")[0] ?? location;
  const inDeepFlow = path.startsWith("/recipe/") || path.startsWith("/cook/");
  const isHome = !inDeepFlow && path === "/home";

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-[380px]">
      {/* Floating Island Container */}
      <div className="relative flex items-center justify-between px-2 py-2 rounded-[2.5rem] bg-[#0a0a0a]/40 backdrop-blur-3xl border border-white/10 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.8)] overflow-hidden ring-1 ring-white/5">
        
        {/* Top Highlight (Light Source) */}
        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-70" />
        
        {/* Bottom Shade (Volume) */}
        <div className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-black/50 to-transparent" />

        {/* Navigation Items */}
        <div className="relative z-10 w-full flex items-center justify-between px-2">
          <NavItem icon={Home} isActive={isHome} label="Home" href="/home" />
          <NavItem icon={Search} isActive={!inDeepFlow && path === "/cookbooks"} label="Search" href="/cookbooks" />
          
          {/* Center FAB (Floating Action Button) */}
          <div className="-mt-8 mx-1">
            <Link href="/camera">
              <button className="group relative w-16 h-16 rounded-full bg-gradient-to-tr from-amber-500 to-amber-400 flex items-center justify-center shadow-[0_10px_20px_-5px_rgba(245,158,11,0.5)] border-4 border-[#0a0a0a] transition-transform active:scale-95">
                <div className="absolute inset-0 rounded-full bg-white opacity-0 group-hover:opacity-20 transition-opacity" />
                <Plus size={32} className="text-black" strokeWidth={2.5} />
              </button>
            </Link>
          </div>

          <NavItem icon={BookHeart} isActive={!inDeepFlow && path === "/cookbooks"} label="Saved" href="/cookbooks" />
          <NavItem icon={UserIcon} isActive={!inDeepFlow && path === "/profile"} label="Profile" href="/profile" />
        </div>
      </div>
    </div>
  );
};

const NavItem: React.FC<{ 
  icon: React.ElementType; 
  isActive?: boolean; 
  label: string;
  href: string;
}> = ({ icon: Icon, isActive, label, href }) => {
  return (
    <Link href={href}>
      <button className="group relative flex flex-col items-center justify-center w-14 h-14 rounded-full transition-all duration-300">
        
        {/* Active Glow Backdrop */}
        {isActive && (
          <div className="absolute inset-0 bg-amber-500/20 blur-xl rounded-full opacity-60" />
        )}

        {/* Icon Container */}
        <div className={`relative z-10 p-2.5 rounded-2xl transition-all duration-300 ${isActive ? 'bg-white/10 shadow-inner ring-1 ring-white/10 translate-y-[-2px]' : 'group-hover:bg-white/5'}`}>
          <Icon 
            size={22} 
            strokeWidth={isActive ? 2.5 : 2} 
            className={`transition-colors duration-300 ${isActive ? 'text-amber-400' : 'text-neutral-500 group-hover:text-neutral-200'}`} 
          />
        </div>

        {/* Active Dot Indicator */}
        <div className={`absolute bottom-1 w-1 h-1 rounded-full transition-all duration-500 ${isActive ? 'bg-amber-500 scale-100 shadow-[0_0_5px_#f59e0b]' : 'bg-transparent scale-0'}`} />
      </button>
    </Link>
  );
};

export default NavBar;
