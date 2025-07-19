import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { VerificationProvider } from "@/contexts/VerificationContext";
import { Layout } from "@/components/Layout";
import { AdminLayout } from "@/components/AdminLayout";
import ConnectionHandler from "@/components/ConnectionHandler";
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

import ReferralNetwork from './pages/ReferralNetwork';
import ReadMore from "./pages/ReadMore";
import MyOffers from "./pages/MyOffers";
import InvestmentCertificate from './pages/InvestmentCertificate';
import Wallet from './pages/Wallet';

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
import ManageWallet from './pages/admin/ManageWallet';
import ManageInvestmentCertificatesPage from './pages/admin/ManageInvestmentCertificatesPage';

const queryClient = new QueryClient();

function App() {
  return (
    <>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <LanguageProvider>
            <VerificationProvider>
              <TooltipProvider>
                <Toaster />
                <Sonner />
                <ConnectionHandler>
                  <BrowserRouter>
                    <Routes>
                      <Route path="/" element={<Layout />}>
                        <Route index element={<Home />} />
                        <Route path="register" element={<Register />} />
                        <Route path="login" element={<Login />} />
                        <Route path="offers" element={<Offers />} />
                        <Route path="investment-certificates" element={<InvestmentCertificate />} />
                        <Route path="profile" element={<Profile />} />
                        <Route path="update-account" element={<UpdateAccount />} />
                        <Route path="transactions" element={<Transactions />} />
                        <Route path="withdrawal" element={<Withdrawal />} />
                        <Route path="deposit" element={<Deposit />} />
                        <Route path="help" element={<HelpCenter />} />
                        <Route path="manage-offers" element={<ManageOffersPage />} />
                        <Route path="referral-network" element={<ReferralNetwork />} />
                        <Route path="read-more" element={<ReadMore />} />
                        <Route path="my-offers" element={<MyOffers />} />
                        <Route path="wallet" element={<Wallet />} />
                      </Route>

                      {/* Admin Routes */}
                      <Route path="admin" element={<AdminLayout />}>
                        <Route index element={<Navigate to="/admin/users" replace />} />
                        <Route path="users" element={<UsersPage />} />
                        <Route path="manage-wallet" element={<ManageWallet />} />
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
                        <Route path="investment-certificates" element={<ManageInvestmentCertificatesPage />} />
                      </Route>

                      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </BrowserRouter>
                </ConnectionHandler>
              </TooltipProvider>
            </VerificationProvider>
          </LanguageProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </>
  );
}

export default App;
