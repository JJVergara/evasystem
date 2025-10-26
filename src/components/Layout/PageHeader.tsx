import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: ReactNode;
  className?: string;
}

export function PageHeader({ title, description, children, className }: PageHeaderProps) {
  return (
    <div className={cn("mb-8", className)}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-gray-900 via-gray-700 to-gray-600 bg-clip-text text-transparent animate-fade-in">
            {title}
          </h1>
          {description && (
            <p className="text-gray-600 text-lg animate-fade-in">
              {description}
            </p>
          )}
        </div>
        {children && (
          <div className="animate-fade-in">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}