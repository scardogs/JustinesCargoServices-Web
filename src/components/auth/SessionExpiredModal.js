import React from "react";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Text,
  useToast, // Use toast for feedback
} from "@chakra-ui/react";
import { useRouter } from "next/router";

function SessionExpiredModal({ isOpen, onLogout }) {
  const router = useRouter();
  const toast = useToast();

  const handleLogoutClick = () => {
    console.log("SessionExpiredModal: Logout button clicked.");
    // Clear token
    localStorage.removeItem("token");
    // Optionally clear other user data
    // localStorage.removeItem('userData');

    // Show feedback
    toast({
      title: "Session Expired",
      description: "You have been logged out due to inactivity. Please log in again.",
      status: "warning",
      duration: 4000,
      isClosable: true,
    });

    // Redirect to login page
    router.push("/login"); // Redirect using Next.js router

    // Call the passed onLogout function if needed (e.g., to update parent state)
    if (onLogout) {
      onLogout();
    }
  };

  // We don't provide an onClose for the modal overlay click or escape key
  // to force the user to click the logout button.

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {}}
      isCentered
      closeOnOverlayClick={false}
      closeOnEsc={false}
    >
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Session Expired</ModalHeader>
        <ModalBody>
          <Text>
            Your session has expired due to inactivity. Please log in again to continue.
          </Text>
        </ModalBody>
        <ModalFooter>
          <Button colorScheme="blue" onClick={handleLogoutClick}>
            Log Out
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

export default SessionExpiredModal;
