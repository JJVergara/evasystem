import type { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { FiestaSelector } from '@/components/Fiestas/FiestaSelector';
import { AppBackground } from './AppBackground';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';
import { ModernLogo } from '@/components/Logo/ModernLogo';
import { NotificationDropdown } from './NotificationDropdown';
import { useIsMobile } from '@/hooks/use-mobile';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const isMobile = useIsMobile();

  return (
    <AppBackground variant="subtle">
      <div className="flex min-h-screen w-full relative">
        <Sidebar />
        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="border-b border-border/50 bg-card/80 backdrop-blur-md supports-[backdrop-filter]:bg-card/60 shadow-sm">
            <div className="flex h-12 sm:h-14 items-center justify-between px-3 sm:px-4 md:px-6 gap-2 sm:gap-4">
              <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.dispatchEvent(new CustomEvent('eva:sidebar-toggle'))}
                  className="h-8 w-8 shrink-0"
                  title="Alternar menú lateral"
                >
                  <Menu className="h-4 w-4" />
                </Button>
                {isMobile && (
                  <div className="shrink-0">
                    <ModernLogo size="sm" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <FiestaSelector className="w-full" />
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <NotificationDropdown />
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 lg:p-8">{children}</div>
        </main>
      </div>
    </AppBackground>
  );
}
