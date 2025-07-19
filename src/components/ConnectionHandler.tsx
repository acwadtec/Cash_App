import React, { useEffect, useState } from 'react';
import { checkConnectionHealth, robustQuery } from '@/lib/supabase';

interface ConnectionHandlerProps {
  children: React.ReactNode;
}

const ConnectionHandler: React.FC<ConnectionHandlerProps> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(true);
  const [isRetrying, setIsRetrying] = useState(false);

  const checkConnection = async () => {
    try {
      const healthy = await checkConnectionHealth();
      setIsConnected(healthy);
      
      if (!healthy && !isRetrying) {
        setIsRetrying(true);
        console.log('Connection lost, attempting to reconnect...');
        
        // Try to reconnect
        setTimeout(async () => {
          const reconnected = await checkConnectionHealth();
          setIsConnected(reconnected);
          setIsRetrying(false);
          
          if (reconnected) {
            console.log('Successfully reconnected to database');
          } else {
            console.error('Failed to reconnect to database');
          }
        }, 2000);
      }
    } catch (error) {
      console.error('Connection check error:', error);
      setIsConnected(false);
    }
  };

  useEffect(() => {
    // Check connection on mount
    checkConnection();

    // Check connection when page becomes visible (user returns to tab)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        checkConnection();
      }
    };

    // Check connection when window gains focus
    const handleFocus = () => {
      checkConnection();
    };

    // Check connection periodically
    const interval = setInterval(checkConnection, 30000); // Every 30 seconds

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [isRetrying]);

  if (!isConnected) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md mx-4">
          <div className="text-center">
            <div className="text-red-500 text-4xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold mb-2">Connection Error</h2>
            <p className="text-gray-600 mb-4">
              {isRetrying 
                ? 'Reconnecting to database...' 
                : 'Unable to connect to the database. Please check your connection and try again.'
              }
            </p>
            {!isRetrying && (
              <button
                onClick={checkConnection}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                Retry Connection
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ConnectionHandler; 