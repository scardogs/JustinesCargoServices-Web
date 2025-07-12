import { ChakraProvider } from "@chakra-ui/react";

import { useState, useEffect } from "react";
import SessionExpiredModal from "../components/auth/SessionExpiredModal";

function MyApp({ Component, pageProps }) {
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);

  useEffect(() => {
    const handleSessionExpired = () => {
      console.log("_app.js: Caught sessionExpired event. Opening modal.");
      setIsSessionModalOpen(true);
    };

    window.addEventListener("sessionExpired", handleSessionExpired);

    return () => {
      window.removeEventListener("sessionExpired", handleSessionExpired);
    };
  }, []);

  const handleCloseModal = () => {
    setIsSessionModalOpen(false);
  };

  return (
    <ChakraProvider>
      <Component {...pageProps} />
      <SessionExpiredModal
        isOpen={isSessionModalOpen}
        onLogout={handleCloseModal}
      />
    </ChakraProvider>
  );
}

export default MyApp;
