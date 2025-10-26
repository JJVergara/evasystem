import { ReactNode } from "react";

interface AppBackgroundProps {
  children: ReactNode;
  variant?: "default" | "subtle";
}

export function AppBackground({ children, variant = "default" }: AppBackgroundProps) {
  const backgroundClass = variant === "subtle" 
    ? "min-h-screen bg-gradient-to-br from-gray-50/50 via-gray-100/30 to-gray-200/50"
    : "min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200";

  return (
    <div className={backgroundClass}>
      {children}
      
      {/* Floating Elements for Futuristic Feel */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-purple-400 rounded-full animate-pulse opacity-40"></div>
        <div className="absolute top-3/4 right-1/3 w-1 h-1 bg-blue-400 rounded-full animate-pulse opacity-30 delay-1000"></div>
        <div className="absolute bottom-1/3 left-1/5 w-1.5 h-1.5 bg-pink-400 rounded-full animate-pulse opacity-20 delay-500"></div>
        <div className="absolute top-1/2 right-1/4 w-1 h-1 bg-emerald-400 rounded-full animate-pulse opacity-25 delay-700"></div>
        <div className="absolute bottom-1/4 right-1/5 w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse opacity-35 delay-300"></div>
      </div>
    </div>
  );
}