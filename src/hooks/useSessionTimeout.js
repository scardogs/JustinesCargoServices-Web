import { useState, useEffect } from 'react';

const TIMEOUT_DURATION = 20 * 60 * 1000; // 20 minutes in milliseconds

const useSessionTimeout = () => {
  const [isSessionExpired, setIsSessionExpired] = useState(false);
  const [lastActivity, setLastActivity] = useState(Date.now());

  // Function to update last activity timestamp
  const updateLastActivity = () => {
    setLastActivity(Date.now());
    if (isSessionExpired) {
      setIsSessionExpired(false);
    }
  };

  useEffect(() => {
    // Add event listeners for user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    
    const handleUserActivity = () => {
      updateLastActivity();
    };

    // Add event listeners
    events.forEach(event => {
      window.addEventListener(event, handleUserActivity);
    });

    // Check for timeout
    const checkTimeout = () => {
      const currentTime = Date.now();
      if (currentTime - lastActivity > TIMEOUT_DURATION) {
        setIsSessionExpired(true);
      }
    };

    // Set up interval to check for timeout
    const intervalId = setInterval(checkTimeout, 1000);

    // Cleanup
    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleUserActivity);
      });
      clearInterval(intervalId);
    };
  }, [lastActivity, isSessionExpired]);

  return {
    isSessionExpired,
    updateLastActivity
  };
};

export default useSessionTimeout; 