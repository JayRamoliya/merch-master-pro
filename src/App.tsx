import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppLayout from "./components/AppLayout";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import Inventory from "./pages/Inventory";
import POS from "./pages/POS";
import Invoices from "./pages/Invoices";
import Customers from "./pages/Customers";
import Suppliers from "./pages/Suppliers";
import Expenses from "./pages/Expenses";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route
            path="/"
            element={
              <AppLayout>
                <Dashboard />
              </AppLayout>
            }
          />
          <Route
            path="/products"
            element={
              <AppLayout>
                <Products />
              </AppLayout>
            }
          />
          <Route
            path="/inventory"
            element={
              <AppLayout>
                <Inventory />
              </AppLayout>
            }
          />
          <Route
            path="/pos"
            element={
              <AppLayout>
                <POS />
              </AppLayout>
            }
          />
          <Route
            path="/invoices"
            element={
              <AppLayout>
                <Invoices />
              </AppLayout>
            }
          />
          <Route
            path="/customers"
            element={
              <AppLayout>
                <Customers />
              </AppLayout>
            }
          />
          <Route
            path="/suppliers"
            element={
              <AppLayout>
                <Suppliers />
              </AppLayout>
            }
          />
          <Route
            path="/expenses"
            element={
              <AppLayout>
                <Expenses />
              </AppLayout>
            }
          />
          <Route
            path="/reports"
            element={
              <AppLayout>
                <Reports />
              </AppLayout>
            }
          />
          <Route
            path="/settings"
            element={
              <AppLayout>
                <Settings />
              </AppLayout>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
