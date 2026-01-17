import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ModernLogo } from '@/components/Logo/ModernLogo';
import { UserProfileDropdown } from './UserProfileDropdown';
import { OrganizationSwitcher } from '@/components/Organizations/OrganizationSwitcher';
import { useIsMobile } from '@/hooks/use-mobile';
import { EMOJIS } from '@/constants';

interface NavItem {
  name: string;
  label: string;
  href: string;
  emoji?: string;
  isInstagram?: boolean;
}

const navigation: NavItem[] = [
  { name: 'dashboard', label: 'Dashboard', href: '/', emoji: EMOJIS.navigation.dashboard },
  { name: 'stories', label: 'Historias', href: '/stories', isInstagram: true },
  { name: 'mentions', label: 'Menciones', href: '/mentions', emoji: EMOJIS.navigation.mentions },
  {
    name: 'storyMentions',
    label: 'Menciones Historias',
    href: '/story-mentions',
    emoji: EMOJIS.navigation.storyMentions,
  },
  {
    name: 'analytics',
    label: 'Analíticas',
    href: '/analytics',
    emoji: EMOJIS.navigation.analytics,
  },
  { name: 'events', label: 'Fiestas', href: '/events', emoji: EMOJIS.navigation.events },
  {
    name: 'ambassadors',
    label: 'Embajadores',
    href: '/ambassadors',
    emoji: EMOJIS.navigation.ambassadors,
  },
];

const secondaryNavigation: NavItem[] = [
  {
    name: 'settings',
    label: 'Configuración',
    href: '/settings',
    emoji: EMOJIS.navigation.settings,
  },
  {
    name: 'importExport',
    label: 'Import/Export',
    href: '/import-export',
    emoji: EMOJIS.navigation.import,
  },
  {
    name: 'diagnostics',
    label: 'Diagnósticos',
    href: '/instagram-diagnostics',
    emoji: EMOJIS.ui.maintenance,
  },
];

interface SidebarProps {
  className?: string;
}

function SidebarContent({
  collapsed,
  onNavigate,
  showHeader = true,
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
  showHeader?: boolean;
}) {
  const location = useLocation();

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {showHeader && (
        <div className="flex h-16 items-center justify-center px-4 border-b shrink-0">
          <ModernLogo size={collapsed ? 'sm' : 'md'} />
        </div>
      )}

      {!collapsed && (
        <div className="px-4 py-3 border-b shrink-0">
          <OrganizationSwitcher />
        </div>
      )}

      <div className="flex-1 overflow-y-auto py-4 min-h-0">
        <nav className="px-2 space-y-1">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;

            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={onNavigate}
                className={cn(
                  'flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200',
                  isActive
                    ? 'sidebar-item-active'
                    : 'text-muted-foreground hover:text-foreground sidebar-item-hover'
                )}
              >
                {item.isInstagram ? (
                  <img
                    src="/instagram-icon.webp"
                    alt="Instagram"
                    className={cn('flex-shrink-0', collapsed ? 'w-5 h-5' : 'mr-3 w-5 h-5')}
                  />
                ) : (
                  <span
                    className={cn('flex-shrink-0 text-lg', collapsed ? 'w-5 h-5' : 'mr-3')}
                    role="img"
                    aria-label={item.label}
                  >
                    {item.emoji}
                  </span>
                )}
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="my-4 mx-2">
          <div className="h-px bg-border" />
        </div>

        <nav className="px-2 space-y-1">
          {secondaryNavigation.map((item) => {
            const isActive = location.pathname === item.href;

            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={onNavigate}
                className={cn(
                  'flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200',
                  isActive
                    ? 'sidebar-item-active'
                    : 'text-muted-foreground hover:text-foreground sidebar-item-hover'
                )}
              >
                <span
                  className={cn('flex-shrink-0 text-lg', collapsed ? 'w-5 h-5' : 'mr-3')}
                  role="img"
                  aria-label={item.label}
                >
                  {item.emoji}
                </span>
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="p-3 border-t space-y-3 shrink-0 min-w-0">
        {!collapsed && <UserProfileDropdown />}

        {!collapsed && (
          <div className="bg-accent/50 rounded-lg p-3 border border-border min-w-0">
            <div className="text-sm font-medium truncate">Conectado a Instagram</div>
            <div className="text-xs text-muted-foreground mt-1 truncate">
              Token válido hasta: 30 días
            </div>
            <div className="w-full bg-secondary rounded-full h-2 mt-2">
              <div className="bg-primary h-2 rounded-full w-4/5" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function Sidebar({ className }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(() => {
    const saved = localStorage.getItem('eva-sidebar-collapsed');
    return saved ? JSON.parse(saved) : false;
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    localStorage.setItem('eva-sidebar-collapsed', JSON.stringify(collapsed));
  }, [collapsed]);

  const pathname = location.pathname;
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleToggle = () => {
      if (isMobile) {
        setMobileMenuOpen((prev: boolean) => !prev);
      } else {
        setCollapsed((prev: boolean) => {
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
        'hidden lg:flex lg:flex-col border-r bg-background transition-all duration-300 h-screen sticky top-0',
        collapsed ? 'w-16' : 'w-64',
        className
      )}
    >
      <div className="flex h-16 items-center justify-between px-4 border-b shrink-0">
        <div className="flex items-center justify-center w-full">
          <ModernLogo size={collapsed ? 'sm' : 'md'} />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed(!collapsed)}
            className="h-8 w-8"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <SidebarContent collapsed={collapsed} showHeader={false} />
    </div>
  );
}
