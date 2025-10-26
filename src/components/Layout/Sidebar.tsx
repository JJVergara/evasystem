import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  LayoutDashboard,
  Instagram,
  Hash,
  BarChart3,
  Calendar,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
  Download,
  Menu,
  Building2,
  MessageCircle,
  Activity
} from "lucide-react";
import { ModernLogo } from "@/components/Logo/ModernLogo";
import { UserProfileDropdown } from "./UserProfileDropdown";
import { OrganizationSwitcher } from "@/components/Organizations/OrganizationSwitcher";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTranslation } from "react-i18next";

const navigation = [
  { name: "dashboard", href: "/", icon: LayoutDashboard },
  { name: "stories", href: "/stories", icon: Instagram },
  { name: "mentions", href: "/mentions", icon: Hash },
  { name: "storyMentions", href: "/story-mentions", icon: MessageCircle },
  { name: "analytics", href: "/analytics", icon: BarChart3 },
  { name: "events", href: "/events", icon: Calendar },
  { name: "ambassadors", href: "/ambassadors", icon: Users },
];

const secondaryNavigation = [
  { name: "settings", href: "/settings", icon: Settings },
  { name: "importExport", href: "/import-export", icon: Download },
  { name: "diagnostics", href: "/instagram-diagnostics", icon: Activity },
];

interface SidebarProps {
  className?: string;
}

function SidebarContent({ collapsed, onNavigate, showHeader = true }: { collapsed?: boolean; onNavigate?: () => void; showHeader?: boolean }) {
  const location = useLocation();
  const { t } = useTranslation('common');

  return (
    <>
      {/* Header - only show if showHeader is true */}
      {showHeader && (
        <div className="flex h-16 items-center justify-center px-4 border-b">
          <ModernLogo size={collapsed ? "sm" : "md"} />
        </div>
      )}

      {/* Organization Switcher - only show if not collapsed */}
      {!collapsed && (
        <div className="px-4 py-3 border-b">
          <OrganizationSwitcher />
        </div>
      )}

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-4">
        <nav className="px-2 space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={onNavigate}
                className={cn(
                  "flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200",
                  isActive
                    ? "sidebar-item-active"
                    : "text-muted-foreground hover:text-foreground sidebar-item-hover"
                )}
              >
                <Icon className={cn("flex-shrink-0", collapsed ? "w-5 h-5" : "mr-3 w-5 h-5")} />
                {!collapsed && <span>{t(item.name)}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Divider */}
        <div className="my-4 mx-2">
          <div className="h-px bg-border" />
        </div>

        {/* Secondary Navigation */}
        <nav className="px-2 space-y-1">
          {secondaryNavigation.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={onNavigate}
                className={cn(
                  "flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200",
                  isActive
                    ? "sidebar-item-active"
                    : "text-muted-foreground hover:text-foreground sidebar-item-hover"
                )}
              >
                <Icon className={cn("flex-shrink-0", collapsed ? "w-5 h-5" : "mr-3 w-5 h-5")} />
                {!collapsed && <span>{t(item.name)}</span>}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer */}
      <div className="p-4 border-t space-y-3">
        {/* User Profile */}
        {!collapsed && <UserProfileDropdown />}
        
        {/* Instagram Status */}
        {!collapsed && (
          <div className="bg-gradient-card rounded-lg p-3 border border-primary/20">
            <div className="text-sm font-medium">Conectado a Instagram</div>
            <div className="text-xs text-muted-foreground mt-1">
              Token válido hasta: 30 días
            </div>
            <div className="w-full bg-secondary rounded-full h-2 mt-2">
              <div className="bg-gradient-primary h-2 rounded-full w-4/5" />
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export function Sidebar({ className }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(() => {
    const saved = localStorage.getItem('eva-sidebar-collapsed');
    return saved ? JSON.parse(saved) : false;
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isMobile = useIsMobile();

  // Save collapsed state to localStorage
  useEffect(() => {
    localStorage.setItem('eva-sidebar-collapsed', JSON.stringify(collapsed));
  }, [collapsed]);

  // Close mobile menu when route changes and prefetch routes
  useEffect(() => {
    setMobileMenuOpen(false);
    
    // Prefetch critical routes on idle
    const prefetchRoutes = () => {
      const routes = ['/mentions', '/ambassadors', '/events', '/analytics'];
      routes.forEach(route => {
        if (location.pathname !== route) {
          // Prefetch route by creating a temporary link element
          const link = document.createElement('link');
          link.rel = 'prefetch';
          link.href = route;
          document.head.appendChild(link);
          setTimeout(() => document.head.removeChild(link), 100);
        }
      });
    };

    // Prefetch after a short delay to not interfere with current navigation
    const timeout = setTimeout(prefetchRoutes, 1000);
    return () => clearTimeout(timeout);
  }, [location.pathname]);

  // Keyboard shortcut and toggle event handler
  useEffect(() => {
    const handleToggle = () => {
      if (isMobile) {
        setMobileMenuOpen(prev => !prev);
      } else {
        setCollapsed(prev => {
          const newValue = !prev;
          localStorage.setItem('eva-sidebar-collapsed', JSON.stringify(newValue));
          return newValue;
        });
      }
    };

    const handleKeyboard = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        handleToggle();
      }
    };

    const handleCustomToggle = () => {
      handleToggle();
    };

    document.addEventListener('keydown', handleKeyboard);
    window.addEventListener('eva:sidebar-toggle', handleCustomToggle);

    return () => {
      document.removeEventListener('keydown', handleKeyboard);
      window.removeEventListener('eva:sidebar-toggle', handleCustomToggle);
    };
  }, [collapsed, isMobile]);

  // Listen for storage changes to sync sidebar state
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'eva-sidebar-collapsed' && event.newValue) {
        setCollapsed(JSON.parse(event.newValue));
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  if (isMobile) {
    return (
      <>
        {/* Mobile menu */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetContent side="left" className="p-0 w-64">
            <SidebarContent 
              collapsed={false} 
              onNavigate={() => setMobileMenuOpen(false)} 
              showHeader={true}
            />
          </SheetContent>
        </Sheet>
      </>
    );
  }

  return (
    <div
      className={cn(
        "hidden lg:flex lg:flex-col border-r bg-background transition-all duration-300",
        collapsed ? "w-16" : "w-64",
        className
      )}
    >
      {/* Header */}
      <div className="flex h-16 items-center justify-between px-4 border-b">
        <div className="flex items-center justify-center w-full">
          <ModernLogo size={collapsed ? "sm" : "md"} />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed(!collapsed)}
            className="h-8 w-8"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      <SidebarContent collapsed={collapsed} showHeader={false} />
    </div>
  );
}