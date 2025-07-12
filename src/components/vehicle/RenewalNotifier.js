import React, { useState, useEffect } from "react";
import {
  Box,
  Text,
  VStack,
  HStack,
  Button,
  Alert,
  AlertIcon,
  useToast,
  Tooltip,
} from "@chakra-ui/react";
import axios from "axios";
import { InfoIcon, WarningIcon, CheckCircleIcon } from "@chakra-ui/icons";
import { motion } from "framer-motion";

const MotionAlert = motion(Alert);

const RenewalNotifier = () => {
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const toast = useToast();

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      // Use a constant for the base URL to ensure consistency
      const baseUrl = process.env.NEXT_PUBLIC_BACKEND_API;
      const apiUrl = `${baseUrl}/api/renewals/notifications`;

      console.log("Environment variable NEXT_PUBLIC_BACKEND_API:", baseUrl);
      console.log("Full API URL:", apiUrl);

      // First, test if the API is accessible
      console.log("Testing base endpoint...");
      const testResponse = await axios.get(`${baseUrl}/api/renewals`);
      console.log("Base endpoint test response:", testResponse.data);

      // Make the actual request
      console.log("Making notifications request...");
      const response = await axios.get(apiUrl);
      console.log("Notifications response:", response.data);

      setNotifications(response.data);

      // Check for alarms
      response.data.forEach((notification) => {
        if (notification.shouldAlarm) {
          playAlarm(notification);
        }
      });
    } catch (error) {
      console.error("Detailed error information:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          headers: error.config?.headers,
        },
      });

      if (error.response?.status === 404) {
        toast({
          title: "API Not Found",
          description: `Could not find endpoint: ${error.config?.url}`,
          status: "error",
          duration: 5000,
          isClosable: true,
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch renewal notifications",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const playAlarm = async (notification) => {
    try {
      const audio = new Audio(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/alarms/play`
      );
      await audio.play();

      // Show toast notification
      toast({
        title: `${notification.type} Renewal Alert`,
        description: `${notification.plateNo} - ${notification.message}`,
        status: "warning",
        duration: 5000,
        isClosable: true,
      });
    } catch (error) {
      console.error("Error playing alarm:", error);
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case "LTO":
        return "teal";
      case "LTFRB":
        return "blue";
      case "Insurance":
        return "gray";
      default:
        return "black";
    }
  };

  const isOverdue = (message) => {
    // Check if message contains "behind the renewal date"
    return message.includes("behind the renewal date");
  };

  const formatMessage = (notification) => {
    const { type, message } = notification;

    // Both overdue and upcoming notifications will use the same format
    return `${type} Renewal is ${message}`;
  };

  const handleRefresh = () => {
    console.log("Manually refreshing notifications...");
    window.location.reload();
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case "LTO":
        return <WarningIcon color="orange.400" />;
      case "LTFRB":
        return <InfoIcon color="blue.400" />;
      case "Insurance":
        return <CheckCircleIcon color="green.400" />;
      default:
        return null;
    }
  };

  const handleNotificationClick = (notification) => {
    console.log("Notification clicked:", notification);
    // Implement further actions, e.g., navigate to details page
  };

  if (isLoading) {
    return (
      <Box p={4} bg="white" color="black" borderRadius="md" boxShadow="md">
        <Text>Loading renewal notifications...</Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={4} bg="red.500" color="white" borderRadius="md" boxShadow="md">
        <Alert status="error" mb={4}>
          <AlertIcon />
          {error}
        </Alert>
        <Button onClick={handleRefresh} colorScheme="blue">
          Refresh
        </Button>
      </Box>
    );
  }

  return (
    <Box p={4} borderRadius="md" boxShadow="lg" bg="white" color="black">
      <HStack justify="space-between" mb={4}>
        <Text fontSize="xl" fontWeight="bold" color="#333">
          Renewal Notifications
        </Text>
        <Tooltip label="Refresh notifications" aria-label="Refresh tooltip">
          <Button
            size="sm"
            onClick={handleRefresh}
            bg="#143D60"
            color="white"
            _hover={{ bg: "darkblue" }}
          >
            Refresh
          </Button>
        </Tooltip>
      </HStack>

      <Box height="310px" overflowY="auto">
        <VStack align="stretch" spacing={3}>
          {notifications.length > 0 ? (
            notifications.map((notification, index) => (
              <MotionAlert
                key={index}
                status={notification.shouldAlarm ? "warning" : "info"}
                variant="solid"
                borderRadius="md"
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.2 }}
                onClick={() => handleNotificationClick(notification)}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                bg={notification.shouldAlarm ? "red.400" : "white"}
                color="black"
                p={4}
                boxShadow="sm"
              >
                <HStack justify="space-between" width="100%">
                  <HStack>
                    {getNotificationIcon(notification.type)}
                    <Box>
                      <Text fontWeight="bold" fontSize="md">
                        {notification.type} - {notification.plateNo}
                      </Text>
                      <Text fontSize="sm">{notification.message}</Text>
                    </Box>
                  </HStack>
                  <Text fontSize="xs" color="gray.600" textAlign="right">
                    Due Date:{" "}
                    {new Date(notification.dueDate).toLocaleDateString()}
                  </Text>
                </HStack>
              </MotionAlert>
            ))
          ) : (
            <Box p={4} borderWidth="1px" borderRadius="md" bg="gray.200">
              <Text fontSize="sm">No renewal notifications found</Text>
              <Text mt={2} fontSize="xs" color="gray.600">
                If you believe this is an error, check that you have correctly
                created renewal records with valid dates.
              </Text>
            </Box>
          )}
        </VStack>
      </Box>
    </Box>
  );
};

export default RenewalNotifier;
