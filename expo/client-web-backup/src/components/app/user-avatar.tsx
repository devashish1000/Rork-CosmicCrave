"use client";

import { useEffect, useState } from "react";
import { ChefHat } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { readUserScoped } from "@/lib/user-storage";

interface UserAvatarProps {
  size?: "sm" | "md" | "lg";
  borderColor?: "default" | "ring" | "success" | "primary";
  showCameraIcon?: boolean;
  showCheckmark?: boolean;
  onClick?: () => void;
  className?: string;
}

const sizeMap = {
  sm: "w-8 h-8",
  md: "w-11 h-11",
  lg: "w-16 h-16",
};

const borderColorMap = {
  default: "border-white/10",
  ring: "border-[hsl(var(--ring))]",
  success: "border-emerald-500",
  primary: "border-amber-500",
};

export function UserAvatar({
  size = "md",
  borderColor = "default",
  showCameraIcon = false,
  showCheckmark = false,
  onClick,
  className,
}: UserAvatarProps) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    // Read profile photo from storage
    const photo = readUserScoped("profile:photo");
    if (photo) {
      setPhotoUrl(photo);
    }

    // Listen for photo updates
    const handlePhotoUpdate = () => {
      const updatedPhoto = readUserScoped("profile:photo");
      setPhotoUrl(updatedPhoto);
    };

    window.addEventListener("profilePhotoUpdated", handlePhotoUpdate);
    return () => {
      window.removeEventListener("profilePhotoUpdated", handlePhotoUpdate);
    };
  }, []);

  return (
    <div className={cn("relative", className)} onClick={onClick}>
      <Avatar
        className={cn(
          sizeMap[size],
          borderColorMap[borderColor],
          "border-2",
          onClick && "cursor-pointer"
        )}
      >
        {photoUrl ? (
          <AvatarImage src={photoUrl} alt="Profile" />
        ) : (
          <AvatarFallback className="bg-gradient-to-br from-amber-600 to-orange-600">
            <ChefHat className={cn(size === "lg" ? "w-8 h-8" : size === "md" ? "w-6 h-6" : "w-4 h-4")} />
          </AvatarFallback>
        )}
      </Avatar>
      
      {showCameraIcon && (
        <div className="absolute bottom-0 right-0 w-4 h-4 bg-amber-500 rounded-full border-2 border-[#121212] flex items-center justify-center">
          <svg
            className="w-2.5 h-2.5 text-[#121212]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </div>
      )}

      {showCheckmark && (
        <div className="absolute bottom-0 right-0 w-4 h-4 bg-emerald-500 rounded-full border-2 border-[#121212] flex items-center justify-center">
          <svg
            className="w-2.5 h-2.5 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
      )}
    </div>
  );
}
