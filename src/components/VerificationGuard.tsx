import React, { ReactNode } from 'react';
import { useVerification } from '@/contexts/VerificationContext';

interface VerificationGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
  showAlert?: boolean;
}

export const VerificationGuard: React.FC<VerificationGuardProps> = ({ 
  children, 
  fallback,
  showAlert = true 
}) => {
  const { isVerified, isLoading, showVerificationAlert } = useVerification();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        <span className="ml-2 text-sm text-muted-foreground">Checking verification...</span>
      </div>
    );
  }

  if (!isVerified) {
    if (showAlert) {
      showVerificationAlert();
    }
    
    return fallback || (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <div className="text-4xl mb-4">🔒</div>
        <h2 className="text-xl font-semibold mb-2">Account Verification Required</h2>
        <p className="text-muted-foreground mb-4">
          Please verify your account before accessing this feature.
        </p>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-w-md">
          <h3 className="font-semibold text-yellow-800 mb-2">How to verify:</h3>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>• Complete your profile information</li>
            <li>• Contact support for verification</li>
            <li>• Wait for admin approval</li>
          </ul>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

// Hook for components that need to check verification before actions
export const useVerificationGuard = () => {
  const { isVerified, showVerificationAlert } = useVerification();

  const requireVerification = (action: () => void) => {
    if (!isVerified) {
      showVerificationAlert();
      return false;
    }
    action();
    return true;
  };

  return { requireVerification, isVerified };
}; 