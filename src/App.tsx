import { Suspense, lazy, type ReactNode } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { DebugProvider } from "@/contexts/DebugContext";
import { isStudioBuildEnabled } from "@/studio/studioAccess";
import { ProductDocumentMeta } from "@/product/ProductDocumentMeta";
import { getProductConfig } from "@/product/productConfig";

const Launcher = lazy(() => import("./pages/Launcher"));
const Index = lazy(() => import("./pages/Index"));
const Studio = lazy(() => import("./pages/Studio"));
const Recipes = lazy(() => import("./pages/Recipes"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

/** Authoring routes stay out of public player builds (and title-only products). */
function AuthoringRoute({ children }: { children: ReactNode }) {
  const product = getProductConfig();
  if (!isStudioBuildEnabled() || product.isTitleProduct) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

function RouteFallback() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground text-sm">
      Loading…
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <DebugProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ProductDocumentMeta />
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<Launcher />} />
              <Route
                path="/studio"
                element={
                  <AuthoringRoute>
                    <Studio />
                  </AuthoringRoute>
                }
              />
              {/* P.I.C.K. aliases — /pick/recipes before /pick/* */}
              <Route
                path="/recipes"
                element={
                  <AuthoringRoute>
                    <Recipes />
                  </AuthoringRoute>
                }
              />
              <Route
                path="/pick/recipes"
                element={
                  <AuthoringRoute>
                    <Recipes />
                  </AuthoringRoute>
                }
              />
              <Route
                path="/pick"
                element={
                  <AuthoringRoute>
                    <Studio />
                  </AuthoringRoute>
                }
              />
              <Route
                path="/pick/*"
                element={
                  <AuthoringRoute>
                    <Studio />
                  </AuthoringRoute>
                }
              />
              {/* /play?packUrl=… loads a hosted .pack.json; /play/:id plays a catalog pack */}
              <Route path="/play" element={<Index />} />
              <Route path="/play/:gameId" element={<Index />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </DebugProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
