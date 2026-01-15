import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { ProtectedLayout } from "@/components/Layout/ProtectedLayout";

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
const MetaOAuthProxy = lazy(() => import("./pages/MetaOAuthProxy"));
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
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Public routes - no layout */}
          <Route path="/auth" element={<Suspense fallback={<PageLoader />}><Auth /></Suspense>} />
          <Route path="/auth-callback" element={<Suspense fallback={<PageLoader />}><AuthCallback /></Suspense>} />
          <Route path="/meta-oauth" element={<Suspense fallback={<PageLoader />}><MetaOAuthProxy /></Suspense>} />
          <Route path="/onboarding" element={<Suspense fallback={<PageLoader />}><Onboarding /></Suspense>} />

          {/* Protected routes with shared layout - sidebar stays mounted */}
          <Route element={<ProtectedLayout />}>
            <Route path="/" element={<Suspense fallback={<PageLoader />}><Index /></Suspense>} />
            <Route path="/stories" element={<Suspense fallback={<PageLoader />}><Stories /></Suspense>} />
            <Route path="/ambassadors" element={<Suspense fallback={<PageLoader />}><Ambassadors /></Suspense>} />
            <Route path="/events" element={<Suspense fallback={<PageLoader />}><Events /></Suspense>} />
            <Route path="/analytics" element={<Suspense fallback={<PageLoader />}><Analytics /></Suspense>} />
            <Route path="/notifications" element={<Suspense fallback={<PageLoader />}><Notifications /></Suspense>} />
            <Route path="/import-export" element={<Suspense fallback={<PageLoader />}><ImportExport /></Suspense>} />
            <Route path="/mentions" element={<Suspense fallback={<PageLoader />}><Mentions /></Suspense>} />
            <Route path="/story-mentions" element={<Suspense fallback={<PageLoader />}><StoryMentions /></Suspense>} />
            <Route path="/profile" element={<Suspense fallback={<PageLoader />}><Profile /></Suspense>} />
            <Route path="/settings" element={<Suspense fallback={<PageLoader />}><Settings /></Suspense>} />
            <Route path="/instagram-diagnostics" element={<Suspense fallback={<PageLoader />}><InstagramDiagnostics /></Suspense>} />
            <Route path="/instagram-business" element={<Suspense fallback={<PageLoader />}><InstagramBusiness /></Suspense>} />
          </Route>

          {/* 404 fallback */}
          <Route path="*" element={<Suspense fallback={<PageLoader />}><NotFound /></Suspense>} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;