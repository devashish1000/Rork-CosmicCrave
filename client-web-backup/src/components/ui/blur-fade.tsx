import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { cn } from "@/lib/utils";

type BlurFadeProps = {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  blur?: number;
  y?: number;
  inView?: boolean;
  once?: boolean;
};

export function BlurFade({
  children,
  className,
  delay = 0,
  duration = 0.5,
  blur = 12,
  y = 10,
  inView = true,
  once = true,
}: BlurFadeProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const isInView = useInView(ref, { once, margin: "0px 0px -12% 0px" });
  const show = inView ? isInView : true;

  return (
    <motion.div
      ref={ref}
      className={cn(className)}
      initial={{ opacity: 0, y, filter: `blur(${blur}px)` }}
      animate={show ? { opacity: 1, y: 0, filter: "blur(0px)" } : { opacity: 0, y, filter: `blur(${blur}px)` }}
      transition={{ duration, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
