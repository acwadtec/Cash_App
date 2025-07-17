import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { Layout } from "@/components/Layout";
import { AdminLayout } from "@/components/AdminLayout";
import Home from "./pages/Home";
import Register from "./pages/Register";
import Login from "./pages/Login";
import Offers from "./pages/Offers";
import Profile from "./pages/Profile";
import UpdateAccount from "./pages/UpdateAccount";
import Transactions from "./pages/Transactions";
import Withdrawal from "./pages/Withdrawal";
import Deposit from "./pages/Deposit";
import HelpCenter from "./pages/HelpCenter";
import NotFound from "./pages/NotFound";
import ManageOffers from './pages/ManageOffers';
import ReferralNetwork from './pages/ReferralNetwork';
import ReadMore from "./pages/ReadMore";

// Admin Pages
import UsersPage from './pages/admin/UsersPage';
import ManageOffersPage from './pages/admin/ManageOffersPage';
import ReferralsPage from './pages/admin/ReferralsPage';
import WithdrawalRequestsPage from './pages/admin/WithdrawalRequestsPage';
import TransactionsPage from './pages/admin/TransactionsPage';
import AnalyticsPage from './pages/admin/AnalyticsPage';
import NotificationsPage from './pages/admin/NotificationsPage';
import DepositNumbersPage from './pages/admin/DepositNumbersPage';
import DepositRequestsPage from './pages/admin/DepositRequestsPage';
import SupportPage from './pages/admin/SupportPage';
import GamificationPage from './pages/admin/GamificationPage';

import { useEffect, useState } from 'react';
import { supabase, testConnection } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';

const queryClient = new QueryClient();

function App() {
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkConnection = async () => {
      try {
        const connected = await testConnection();
        setIsConnected(connected);
        if (!connected) {
          toast({
            variant: "destructive",
            title: "Connection Error",
            description: "Failed to connect to the database. Please check your connection.",
          });
        }
      } catch (error) {
        console.error('Connection check error:', error);
        toast({
          variant: "destructive",
          title: "Connection Error",
          description: "Failed to connect to the database. Please check your connection.",
        });
      } finally {
        setIsLoading(false);
      }
    };

    checkConnection();

    // Set up real-time connection status
    const subscription = supabase.channel('system_status')
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      subscription.unsubscribe();
    };
  }, [toast]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900" />
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <h1 className="text-2xl font-bold text-red-600">Connection Error</h1>
        <p className="text-gray-600">Unable to connect to the database. Please check your connection and try again.</p>
        <button 
          onClick={() => window.location.reload()} 
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <LanguageProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <Routes>
                  <Route path="/" element={<Layout />}>
                    <Route index element={<Home />} />
                    <Route path="register" element={<Register />} />
                    <Route path="login" element={<Login />} />
                    <Route path="offers" element={<Offers />} />
                    <Route path="profile" element={<Profile />} />
                    <Route path="update-account" element={<UpdateAccount />} />
                    <Route path="transactions" element={<Transactions />} />
                    <Route path="withdrawal" element={<Withdrawal />} />
                    <Route path="deposit" element={<Deposit />} />
                    <Route path="help" element={<HelpCenter />} />
                    <Route path="manage-offers" element={<ManageOffers />} />
                    <Route path="referral-network" element={<ReferralNetwork />} />
                    <Route path="read-more" element={<ReadMore />} />
                  </Route>

                  {/* Admin Routes */}
                  <Route path="admin" element={<AdminLayout />}>
                    <Route index element={<Navigate to="/admin/users" replace />} />
                    <Route path="users" element={<UsersPage />} />
                    <Route path="offers" element={<ManageOffersPage />} />
                    <Route path="referrals" element={<ReferralsPage />} />
                    <Route path="withdrawals" element={<WithdrawalRequestsPage />} />
                    <Route path="transactions" element={<TransactionsPage />} />
                    <Route path="analytics" element={<AnalyticsPage />} />
                    <Route path="notifications" element={<NotificationsPage />} />
                    <Route path="deposit-numbers" element={<DepositNumbersPage />} />
                    <Route path="deposit-requests" element={<DepositRequestsPage />} />
                    <Route path="support" element={<SupportPage />} />
                    <Route path="gamification" element={<GamificationPage />} />
                  </Route>

                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </TooltipProvider>
          </LanguageProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </>
  );
}

export default App;
