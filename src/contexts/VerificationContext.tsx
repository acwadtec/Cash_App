import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';

interface VerificationContextType {
  isVerified: boolean;
  isLoading: boolean;
  checkVerification: () => Promise<void>;
  showVerificationAlert: () => void;
}

const VerificationContext = createContext<VerificationContextType | undefined>(undefined);

export const useVerification = () => {
  const context = useContext(VerificationContext);
  if (!context) {
    throw new Error('useVerification must be used within a VerificationProvider');
  }
  return context;
};

interface VerificationProviderProps {
  children: ReactNode;
}

export const VerificationProvider: React.FC<VerificationProviderProps> = ({ children }) => {
  const [isVerified, setIsVerified] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const checkVerification = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsVerified(false);
        setIsLoading(false);
        return;
      }

      const { data: userInfo, error } = await supabase
        .from('user_info')
        .select('verified')
        .eq('user_uid', user.id)
        .single();

      if (error) {
        console.error('Error checking verification:', error);
        setIsVerified(false);
      } else {
        setIsVerified(userInfo?.verified || false);
      }
    } catch (error) {
      console.error('Error in checkVerification:', error);
      setIsVerified(false);
    } finally {
      setIsLoading(false);
    }
  };

  const showVerificationAlert = () => {
    toast({
      variant: "destructive",
      title: "Account Verification Required",
      description: "Please verify your account before performing this action. Contact support for verification assistance.",
    });
  };

  useEffect(() => {
    checkVerification();
  }, []);

  return (
    <VerificationContext.Provider value={{
      isVerified,
      isLoading,
      checkVerification,
      showVerificationAlert,
    }}>
      {children}
    </VerificationContext.Provider>
  );
}; 