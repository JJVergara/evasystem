import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Menu, LogOut } from 'lucide-react';
import { OrganizationSwitcher } from '@/components/Organizations/OrganizationSwitcher';
import { useAuth } from '@/hooks/useAuth';
import { EMOJIS } from '@/constants';
import { toast } from 'sonner';

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

export function MobileNavDropdown() {
  const location = useLocation();
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch {
      toast.error('Error al cerrar sesión');
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 shrink-0" title="Menú de navegación">
          <Menu className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64 max-h-[80vh] overflow-y-auto">
        <div className="px-2 py-2">
          <OrganizationSwitcher />
        </div>

        <DropdownMenuSeparator />

        <DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-wider">
          Navegación
        </DropdownMenuLabel>

        <div className="space-y-1 py-1">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;

            return (
              <DropdownMenuItem key={item.name} asChild>
                <Link
                  to={item.href}
                  className={cn(
                    'flex items-center gap-3 w-full cursor-pointer py-2',
                    isActive && 'bg-primary/10 text-primary'
                  )}
                >
                  <span
                    className={cn(
                      'flex items-center justify-center w-7 h-7 shrink-0 rounded-full',
                      isActive ? 'bg-primary text-primary-foreground' : 'bg-muted/50'
                    )}
                  >
                    {item.isInstagram ? (
                      <img src="/instagram-icon.webp" alt="Instagram" className="w-3.5 h-3.5" />
                    ) : (
                      <span className="text-sm leading-none">{item.emoji}</span>
                    )}
                  </span>
                  <span>{item.label}</span>
                </Link>
              </DropdownMenuItem>
            );
          })}
        </div>

        <DropdownMenuSeparator />

        <DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-wider">
          Configuración
        </DropdownMenuLabel>

        <div className="space-y-1 py-1">
          {secondaryNavigation.map((item) => {
            const isActive = location.pathname === item.href;

            return (
              <DropdownMenuItem key={item.name} asChild>
                <Link
                  to={item.href}
                  className={cn(
                    'flex items-center gap-3 w-full cursor-pointer py-2',
                    isActive && 'bg-primary/10 text-primary'
                  )}
                >
                  <span
                    className={cn(
                      'flex items-center justify-center w-7 h-7 shrink-0 rounded-full',
                      isActive ? 'bg-primary text-primary-foreground' : 'bg-muted/50'
                    )}
                  >
                    <span className="text-sm leading-none">{item.emoji}</span>
                  </span>
                  <span>{item.label}</span>
                </Link>
              </DropdownMenuItem>
            );
          })}
        </div>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={handleSignOut} className="text-destructive cursor-pointer">
          <LogOut className="w-4 h-4 mr-3" />
          Cerrar Sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
