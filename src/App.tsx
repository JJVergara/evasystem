import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { I18nextProvider } from "react-i18next";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import i18n from "./i18n";

// Lazy load pages for better performance
const Index = lazy(() => import("./pages/Index"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Stories = lazy(() => import("./pages/Stories"));
const Profile = lazy(() => import("./pages/Profile"));
const Settings = lazy(() => import("./pages/Settings"));
const Auth = lazy(() => import("./pages/Auth"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Events = lazy(() => import("./pages/Events"));
const Ambassadors = lazy(() => import("./pages/Ambassadors"));
const Mentions = lazy(() => import("./pages/MentionsOptimized"));
const ImportExport = lazy(() => import("./pages/ImportExport"));
const Notifications = lazy(() => import("./pages/Notifications"));
const StoryMentions = lazy(() => import("./pages/StoryMentions"));
const InstagramDiagnostics = lazy(() => import("./pages/InstagramDiagnostics"));
const InstagramBusiness = lazy(() => import("./pages/InstagramBusiness"));
const AuthCallback = lazy(() => import("./pages/auth-callback"));
const MetaOAuthProxy = lazy(() => import("./pages/api/meta-oauth"));
const NotFound = lazy(() => import("./pages/NotFound"));

// QueryClient configuration optimized for performance  
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10 * 60 * 1000, // 10 minutes - data stays fresh longer
      gcTime: 30 * 60 * 1000, // 30 minutes - keep in cache longer
      retry: (failureCount, error) => {
        if (error && typeof error === 'object' && 'status' in error) {
          const status = error.status as number;
          if (status >= 400 && status < 500) return false;
        }
        return failureCount < 1; // Reduced retries for faster failures
      },
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      refetchOnMount: false, // Don't refetch if data exists
      networkMode: 'online',
    },
    mutations: {
      retry: false, // Don't retry mutations by default
    },
  },
});

// Loading component optimized for mobile
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="flex flex-col items-center space-y-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="text-sm text-muted-foreground animate-pulse">Cargando...</p>
      </div>
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <I18nextProvider i18n={i18n}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/stories" element={<Stories />} />
              <Route path="/ambassadors" element={<Ambassadors />} />
              <Route path="/events" element={<Events />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/import-export" element={<ImportExport />} />
              <Route path="/mentions" element={<Mentions />} />
              <Route path="/story-mentions" element={<StoryMentions />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/instagram-diagnostics" element={<InstagramDiagnostics />} />
              <Route path="/instagram-business" element={<InstagramBusiness />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/auth-callback" element={<AuthCallback />} />
              <Route path="/api/meta-oauth" element={<MetaOAuthProxy />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </I18nextProvider>
  </QueryClientProvider>
);

export default App;