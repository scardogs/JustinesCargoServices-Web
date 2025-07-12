import React from 'react';
import useSessionTimeout from '../../hooks/useSessionTimeout';
import SessionExpiredModal from './SessionExpiredModal';

const SessionTimeoutWrapper = ({ children }) => {
  const { isSessionExpired } = useSessionTimeout();

  return (
    <>
      {children}
      <SessionExpiredModal isOpen={isSessionExpired} />
    </>
  );
};

export default SessionTimeoutWrapper; 