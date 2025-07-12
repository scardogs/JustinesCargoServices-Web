import React, { useState, useEffect } from "react";
import {
  Box,
  Flex,
  Text,
  Heading,
  Button,
  Grid,
  GridItem,
  Icon,
  Badge,
  IconButton,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  Radio,
  RadioGroup,
  Stack,
  FormControl,
  FormLabel,
  Textarea,
  useToast,
  Tooltip,
  HStack,
} from "@chakra-ui/react";
import {
  FaMapMarkerAlt,
  FaFlag,
  FaTag,
  FaPercentage,
  FaMoneyBillWave,
  FaCube,
  FaUserAlt,
  FaLock,
  FaClock,
} from "react-icons/fa";
import {
  AddIcon,
  DeleteIcon,
  EditIcon,
  DownloadIcon,
  RepeatIcon,
  LockIcon,
  TimeIcon,
} from "@chakra-ui/icons";
import { BiAnalyse } from "react-icons/bi";
import axios from "axios";

const ConsigneeInformation = ({
  primaryColor,
  secondaryColor,
  borderColor,
  isShipperInfoSaved,
  isCbmFull,
  openDrawer,
  filteredConsignees,
  formatDate,
  formatNumberWithCommas,
  handleViewSubDetails,
  handleEditConsignee,
  handleDeleteConsignee,
  updateAmountsWithHighestRate,
  onDeleteAllAlertOpen,
  currentUser,
  isViewOnly,
  currentShipperName,
}) => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [selectedConsignee, setSelectedConsignee] = useState(null);
  const [requestType, setRequestType] = useState("edit");
  const [remarks, setRemarks] = useState("");
  const [approvedRequests, setApprovedRequests] = useState([]);
  const [isCheckingApprovals, setIsCheckingApprovals] = useState(false);
  const [notifiedWaybills, setNotifiedWaybills] = useState([]);
  const [approvalTimers, setApprovalTimers] = useState({});
  const isCheckingRef = React.useRef(false);
  const toast = useToast();

  // Add keyframes for pulse animation
  const pulseKeyframes = `
    @keyframes pulse {
      0% { opacity: 1; }
      50% { opacity: 0.5; }
      100% { opacity: 1; }
    }
  `;

  // Add the keyframes to the document
  useEffect(() => {
    const style = document.createElement("style");
    style.type = "text/css";
    style.appendChild(document.createTextNode(pulseKeyframes));
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Fetch approved requests on component mount and set up refresh interval
  useEffect(() => {
    // Fetch immediately
    fetchApprovedRequests();

    // Set up more frequent refresh (every 10 seconds for real-time updates)
    const refreshInterval = setInterval(() => {
      console.log("Running scheduled approval check");
      fetchApprovedRequests();
    }, 10000); // Changed from 60000 to 10000 for more real-time updates

    // Clean up on unmount
    return () => {
      console.log("Clearing approval check interval");
      clearInterval(refreshInterval);
    };
  }, [filteredConsignees]);

  // Also refresh when the component is focused, but use a ref to prevent concurrent checks
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && !isCheckingRef.current) {
        fetchApprovedRequests();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // Set up timer update interval for real-time countdown
  useEffect(() => {
    const timerInterval = setInterval(() => {
      const now = new Date();
      const updatedTimers = { ...approvalTimers };
      let hasChanges = false;
      let hasNewExpirations = false;

      // Update each timer
      approvedRequests.forEach((request) => {
        if (request.ExpiresAt) {
          const expiresAt = new Date(request.ExpiresAt);
          const remainingTime = expiresAt - now;
          const currentTimer = approvalTimers[request._id];

          if (remainingTime <= 0) {
            // Timer expired
            if (currentTimer !== "Expired") {
              updatedTimers[request._id] = "Expired";
              hasChanges = true;
              hasNewExpirations = true;
            }
          } else {
            // Update the timer display
            const newTimerValue = formatRemainingTime(remainingTime);
            if (currentTimer !== newTimerValue) {
              updatedTimers[request._id] = newTimerValue;
              hasChanges = true;
            }
          }
        }
      });

      // Update timers state if there were changes
      if (hasChanges) {
        setApprovalTimers(updatedTimers);
      }

      // If any timer newly expired, show notification
      if (hasNewExpirations) {
        // Highlight the UI to show something changed
        highlightNewApprovals();

        // Show expiration notification
        toast({
          title: "Access Expired",
          description:
            "Some of your approved access has expired. You may need to request access again.",
          status: "warning",
          duration: 3000,
          isClosable: true,
          position: "top-right",
        });
      }
    }, 1000);

    return () => clearInterval(timerInterval);
  }, [approvedRequests, approvalTimers, filteredConsignees]);

  // Enhanced polling for real-time updates using progressive intervals
  useEffect(() => {
    if (!filteredConsignees || filteredConsignees.length === 0) return;

    // Reference to track active status
    let isActive = true;
    let pollCount = 0;
    const maxPolls = 20; // Maximum number of rapid polls

    // Progressive polling function that polls more frequently at first
    // then slows down over time to avoid excessive API calls
    const progressivePolling = async () => {
      if (!isActive) return;

      // Calculate delay based on poll count - start with very short delays
      // and progressively increase them
      let delay;
      if (pollCount < 5) {
        delay = 1000; // First 5 polls: every 1 second
      } else if (pollCount < 10) {
        delay = 2000; // Next 5 polls: every 2 seconds
      } else {
        delay = 5000; // Remaining polls: every 5 seconds
      }

      // Don't exceed max polls
      if (pollCount >= maxPolls) return;

      // Perform the poll after the calculated delay
      setTimeout(async () => {
        if (!isActive) return;

        pollCount++;
        console.log(`Progressive poll #${pollCount}`);

        // Only fetch if not already checking
        if (!isCheckingRef.current) {
          await fetchApprovedRequests();
        }

        // Continue polling with progressive delays
        progressivePolling();
      }, delay);
    };

    // Start progressive polling
    progressivePolling();

    // Cleanup
    return () => {
      isActive = false;
    };
  }, [filteredConsignees]); // Re-initialize when consignees change

  // Format remaining time from milliseconds to HH:MM:SS
  const formatRemainingTime = (milliseconds) => {
    if (milliseconds <= 0) return "00:00:00";

    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  // Fetch approved requests for waybill numbers in the current view
  const fetchApprovedRequests = async () => {
    // If a check is already in progress, don't start another one
    if (isCheckingRef.current) {
      console.log("Approval check already in progress, skipping");
      return;
    }

    try {
      isCheckingRef.current = true;
      setIsCheckingApprovals(true);
      const token = localStorage.getItem("token");
      if (!token) {
        setIsCheckingApprovals(false);
        isCheckingRef.current = false;
        return;
      }

      // Get all approved requests
      const response = await axios.get(
        process.env.NEXT_PUBLIC_BACKEND_API + "/api/control-panel",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Filter for approved Edit/Delete Consignee requests
      const approved = response.data.filter(
        (req) =>
          req.Status === "Approved" &&
          (req.RequestType === "Edit Consignee" ||
            req.RequestType === "Delete Consignee")
      );

      console.log("All approved requests:", approved);

      // Check if there are any new approvals compared to previous state
      const previousApprovalIds = approvedRequests.map((req) => req._id);
      const newApprovals = approved.filter(
        (req) => !previousApprovalIds.includes(req._id)
      );
      const hasNewApprovals = newApprovals.length > 0;

      // Initialize timer data for all approved requests with expiration
      const timerData = {};
      approved.forEach((request) => {
        if (request.ExpiresAt) {
          const expiresAt = new Date(request.ExpiresAt);
          const now = new Date();
          const remainingTime = expiresAt - now;

          if (remainingTime > 0) {
            timerData[request._id] = formatRemainingTime(remainingTime);
          } else {
            timerData[request._id] = "Expired";
          }
        }
      });

      // Update timers state
      setApprovalTimers(timerData);

      // If there are consignees to check, get the unique waybill numbers
      if (filteredConsignees && filteredConsignees.length > 0) {
        const waybillNumbers = [
          ...new Set(filteredConsignees.map((c) => c.waybillNumber)),
        ];
        console.log("Current waybill numbers:", waybillNumbers);

        // Filter approvals to only those matching our current waybill numbers
        const relevantApprovals = approved.filter((req) =>
          waybillNumbers.includes(req.ReferenceID)
        );

        if (relevantApprovals.length > 0) {
          console.log(
            "Relevant approvals for current waybills:",
            relevantApprovals
          );

          // Update the approved requests state
          setApprovedRequests(relevantApprovals);

          // Get the waybill numbers that have approved requests
          const approvedWaybills = [
            ...new Set(relevantApprovals.map((req) => req.ReferenceID)),
          ];

          // Only show notification for waybills we haven't notified about yet
          const newlyApprovedWaybills = approvedWaybills.filter(
            (waybill) => !notifiedWaybills.includes(waybill)
          );

          if (newlyApprovedWaybills.length > 0) {
            // Update the list of notified waybills
            setNotifiedWaybills((prev) => [...prev, ...newlyApprovedWaybills]);

            // Highlight the UI to show something changed
            if (hasNewApprovals) {
              // Force a re-render by setting and clearing a highlight effect
              highlightNewApprovals();
            }

            // Show notification only for newly approved waybills
            toast({
              title: "Access Approved",
              description: `You have approved access for waybill(s): ${newlyApprovedWaybills.join(", ")}`,
              status: "success",
              duration: 3000,
              isClosable: true,
              position: "top-right",
              id: `approval-${newlyApprovedWaybills.join("-")}`, // Add unique ID to prevent duplicate toasts
            });
          }
        } else {
          setApprovedRequests([]);
        }
      } else {
        setApprovedRequests([]);
      }
    } catch (error) {
      console.error("Error fetching approved requests:", error);
      setApprovedRequests([]);
    } finally {
      // Ensure this always runs to reset the loading state
      setTimeout(() => {
        setIsCheckingApprovals(false);
        isCheckingRef.current = false;
      }, 500); // Small delay to ensure state updates properly
    }
  };

  // State for highlighting new approvals
  const [highlightedApprovals, setHighlightedApprovals] = useState(false);

  // Function to highlight new approvals with a brief animation effect
  const highlightNewApprovals = () => {
    setHighlightedApprovals(true);
    setTimeout(() => setHighlightedApprovals(false), 2000); // Reset after 2 seconds
  };

  const isShipperDataIncomplete =
    !isShipperInfoSaved || currentShipperName === "To be updated";

  // Check if a specific action is approved for this consignee
  const isActionApproved = (consignee, actionType) => {
    if (!consignee || !approvedRequests.length) return false;

    const requestType =
      actionType === "edit" ? "Edit Consignee" : "Delete Consignee";

    // Get the waybill number for this consignee
    const waybillNumber = consignee.waybillNumber;

    // For debugging
    console.log(
      `Checking if ${requestType} is approved for waybill #${waybillNumber}`
    );
    console.log(
      "Available approved requests:",
      JSON.stringify(approvedRequests)
    );

    // IMPORTANT: Convert both to strings to ensure accurate comparison
    const approvalRequest = approvedRequests.find((request) => {
      // Convert both values to strings to ensure proper comparison
      const requestWaybill = String(request.ReferenceID).trim();
      const consigneeWaybill = String(waybillNumber).trim();

      const typeMatches = request.RequestType === requestType;
      const waybillMatches = requestWaybill === consigneeWaybill;

      console.log(
        `Request: ${request.RequestType}, waybill: ${requestWaybill}`
      );
      console.log(`Looking for: ${requestType}, waybill: ${consigneeWaybill}`);
      console.log(
        `Type matches: ${typeMatches}, Waybill matches: ${waybillMatches}`
      );

      return typeMatches && waybillMatches;
    });

    // Check if approval is found and not expired
    if (approvalRequest) {
      // If there's an expiration time, check if it's expired
      if (approvalRequest.ExpiresAt) {
        const expiresAt = new Date(approvalRequest.ExpiresAt);
        const now = new Date();

        // Check if the timer shows "Expired" or if time has passed
        const isExpired =
          approvalTimers[approvalRequest._id] === "Expired" || expiresAt <= now;

        console.log(
          `Approval expiration status for ${waybillNumber}: ${isExpired ? "Expired" : "Active"}`
        );

        // Return true only if not expired
        return !isExpired;
      }
      // If no expiration time, approval doesn't expire
      return true;
    }

    console.log(`No approval found for ${waybillNumber}`);
    return false;
  };

  // Get approval data for a consignee and action type
  const getApprovalData = (consignee, actionType) => {
    if (!consignee || !approvedRequests.length) return null;

    const requestType =
      actionType === "edit" ? "Edit Consignee" : "Delete Consignee";
    const waybillNumber = String(consignee.waybillNumber).trim();

    const approvalRequest = approvedRequests.find(
      (request) =>
        request.RequestType === requestType &&
        String(request.ReferenceID).trim() === waybillNumber
    );

    return approvalRequest;
  };

  const handleRequestAccess = (consignee) => {
    setSelectedConsignee(consignee);
    setRequestType("edit");
    setRemarks("");
    onOpen();
  };

  const submitAccessRequest = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast({
          title: "Authentication Error",
          description: "You must be logged in to request access",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
        return;
      }

      // Get user data from local storage
      const userStr = localStorage.getItem("user");
      const user = userStr ? JSON.parse(userStr) : null;

      if (!user) {
        toast({
          title: "User Error",
          description: "Unable to fetch user data",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
        return;
      }

      // Create a standardized reference identifier for this consignee
      const consigneeRef = `Waybill #${selectedConsignee.waybillNumber}, Consignee: ${selectedConsignee.consignee}`;

      // Store just the waybill number as the reference ID - this will enable approvals
      // for all consignees under this waybill number
      const referenceID = selectedConsignee.waybillNumber;

      const requestData = {
        Module: "Waybill Management",
        UserRole: user.workLevel || "Waybill Officer",
        Username: user.name || "User",
        RequestType:
          requestType === "edit" ? "Edit Consignee" : "Delete Consignee",
        Remarks: `${remarks} - Requested for ${consigneeRef}`,
        Status: "Pending",
        RequestID: `REQ-${Math.floor(Math.random() * 100000)}`,
        ReferenceID: referenceID, // Just the waybill number
      };

      console.log("Submitting request:", requestData);

      await axios.post(
        process.env.NEXT_PUBLIC_BACKEND_API + "/api/control-panel",
        requestData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      toast({
        title: "Request Submitted",
        description: `Your request to ${requestType} consignees for waybill #${referenceID} has been submitted for approval.`,
        status: "success",
        duration: 3000,
        isClosable: true,
      });

      // Refresh the list of approved requests
      fetchApprovedRequests();

      onClose();
    } catch (error) {
      console.error("Error submitting access request:", error);
      toast({
        title: "Error",
        description: "Failed to submit your request. Please try again.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  return (
    <Box
      bg="white"
      p={4}
      borderRadius="xl"
      boxShadow="sm"
      borderWidth="1px"
      borderColor={borderColor}
      h="100%"
    >
      <Flex justifyContent="space-between" alignItems="center" mb={4}>
        <Flex>
          <Heading size="md" fontWeight="bold" textAlign="center">
            Consignee Information
          </Heading>
          {isCheckingApprovals && (
            <Badge
              ml={3}
              colorScheme="blue"
              fontSize="xs"
              alignSelf="center"
            ></Badge>
          )}
          {approvedRequests.length > 0 && !isCheckingApprovals && (
            <Box ml={3} alignSelf="center">
              <HStack spacing={1}>
                {approvedRequests.some((req) => {
                  // Only show the Edit Approved badge if there's at least one non-expired edit approval
                  if (req.RequestType !== "Edit Consignee") return false;

                  // Check if this approval is expired
                  if (req.ExpiresAt) {
                    const expiresAt = new Date(req.ExpiresAt);
                    const now = new Date();
                    const isExpired =
                      approvalTimers[req._id] === "Expired" || expiresAt <= now;
                    return !isExpired; // Only return true if NOT expired
                  }
                  return true; // No expiration time means always valid
                }) && (
                  <Badge
                    colorScheme="green"
                    fontSize="xs"
                    mr={1}
                    animation={
                      highlightedApprovals ? "pulse 1s infinite" : "none"
                    }
                  >
                    Edit Approved
                  </Badge>
                )}
                {approvedRequests.some((req) => {
                  // Only show the Delete Approved badge if there's at least one non-expired delete approval
                  if (req.RequestType !== "Delete Consignee") return false;

                  // Check if this approval is expired
                  if (req.ExpiresAt) {
                    const expiresAt = new Date(req.ExpiresAt);
                    const now = new Date();
                    const isExpired =
                      approvalTimers[req._id] === "Expired" || expiresAt <= now;
                    return !isExpired; // Only return true if NOT expired
                  }
                  return true; // No expiration time means always valid
                }) && (
                  <Badge
                    colorScheme="red"
                    fontSize="xs"
                    animation={
                      highlightedApprovals ? "pulse 1s infinite" : "none"
                    }
                  >
                    Delete Approved
                  </Badge>
                )}
              </HStack>
            </Box>
          )}
          {!isViewOnly && (
            <IconButton
              icon={<RepeatIcon />}
              aria-label="Refresh Approvals"
              size="xs"
              colorScheme="blue"
              variant="ghost"
              ml={2}
              isLoading={isCheckingApprovals}
              onClick={fetchApprovedRequests}
              title="Refresh approval status"
            />
          )}
        </Flex>
        {!isViewOnly && (
          <Flex gap={2}>
            {isShipperInfoSaved && (
              <Button
                colorScheme="red"
                size="sm"
                leftIcon={<RepeatIcon />}
                onClick={onDeleteAllAlertOpen}
              >
                Reverse All
              </Button>
            )}
            <Button
              leftIcon={<AddIcon />}
              onClick={openDrawer}
              bgColor={primaryColor}
              color="white"
              width="170px"
              flexShrink={0}
              isDisabled={
                isShipperDataIncomplete || !isShipperInfoSaved || isCbmFull()
              }
              _disabled={{
                bgColor: "gray.300",
                cursor: "not-allowed",
                opacity: 0.6,
              }}
              _hover={{
                bgColor:
                  !isShipperDataIncomplete && isShipperInfoSaved
                    ? secondaryColor
                    : "gray.300",
                transform:
                  !isShipperDataIncomplete && isShipperInfoSaved
                    ? "translateY(-2px)"
                    : "none",
              }}
              transition="all 0.2s"
              title={
                isShipperDataIncomplete
                  ? "Please save shipper information first or ensure shipper is not 'To be updated'"
                  : !isShipperInfoSaved
                    ? "Please save shipper information first"
                    : isCbmFull()
                      ? "CBM capacity full - cannot add more drops"
                      : "Add new consignee drops"
              }
            >
              Add Drops
            </Button>
          </Flex>
        )}
      </Flex>

      {/* Consignee List */}
      <Box>
        {filteredConsignees.length > 0 ? (
          filteredConsignees.map((consignee, index) => (
            <Box
              key={index}
              p={3}
              border="1px solid"
              borderColor={
                highlightedApprovals &&
                (isActionApproved(consignee, "edit") ||
                  isActionApproved(consignee, "delete"))
                  ? secondaryColor
                  : borderColor
              }
              borderRadius="lg"
              mb={2}
              bg={
                highlightedApprovals &&
                (isActionApproved(consignee, "edit") ||
                  isActionApproved(consignee, "delete"))
                  ? `${secondaryColor}10`
                  : "white"
              }
              transition="all 0.2s ease"
              boxShadow={
                highlightedApprovals &&
                (isActionApproved(consignee, "edit") ||
                  isActionApproved(consignee, "delete"))
                  ? "0 0 10px rgba(128,0,32,0.3)"
                  : "sm"
              }
              position="relative"
              _hover={{
                transform: "translateY(-2px)",
                boxShadow: "md",
                borderColor: secondaryColor,
              }}
            >
              {/* Type badge in the top right corner */}
              <Box
                position="absolute"
                top={2}
                right={2}
                bg={consignee.type === "DC" ? "blue.100" : "teal.100"}
                color={consignee.type === "DC" ? "blue.700" : "teal.700"}
                px={2}
                py={0.5}
                borderRadius="full"
                fontSize="xs"
                fontWeight="bold"
              >
                {consignee.type}
              </Box>

              {/* Header Section */}
              <Flex direction="column" mb={2}>
                <Heading as="h4" size="sm" color={primaryColor} mb={1}>
                  {consignee.consignee}
                </Heading>
                <Flex
                  alignItems="center"
                  gap={2}
                  color="gray.600"
                  fontSize="xs"
                >
                  <Text>
                    Waybill:{" "}
                    <Text as="span" fontWeight="medium">
                      {consignee.waybillNumber}
                    </Text>
                  </Text>
                  <Text>•</Text>
                  <Text>
                    Date:{" "}
                    <Text as="span" fontWeight="medium">
                      {formatDate(consignee.date)}
                    </Text>
                  </Text>
                </Flex>
              </Flex>

              {/* Main Content Grid */}
              <Grid templateColumns="1fr 1fr" gap={3} mt={2}>
                {/* Location Information */}
                <Box
                  p={2}
                  bg="gray.50"
                  borderRadius="lg"
                  borderLeft="4px solid"
                  borderLeftColor={primaryColor}
                  position="relative"
                  transition="all 0.3s ease"
                  _hover={{
                    transform: "translateX(4px)",
                    boxShadow: "md",
                  }}
                >
                  <Flex direction="column" gap={2}>
                    {/* Origin Section */}
                    <Box>
                      <Flex align="center" mb={1}>
                        <Icon
                          as={FaMapMarkerAlt}
                          color={primaryColor}
                          mr={2}
                          size="sm"
                        />
                        <Text
                          fontWeight="bold"
                          fontSize="xs"
                          color={primaryColor}
                          textTransform="uppercase"
                        >
                          Origin
                        </Text>
                      </Flex>
                      <Box
                        p={2}
                        bg="white"
                        borderRadius="md"
                        boxShadow="sm"
                        borderWidth="1px"
                        borderColor="gray.200"
                      >
                        <Text fontSize="sm" color="gray.700">
                          {consignee.origin || "N/A"}
                        </Text>
                      </Box>
                    </Box>

                    {/* Destination Section */}
                    <Box>
                      <Flex align="center" mb={1}>
                        <Icon as={FaFlag} color="maroon" mr={2} size="sm" />
                        <Text
                          fontWeight="bold"
                          fontSize="xs"
                          color="maroon"
                          textTransform="uppercase"
                        >
                          Destination
                        </Text>
                      </Flex>
                      <Box
                        p={2}
                        bg="white"
                        borderRadius="md"
                        boxShadow="sm"
                        borderWidth="1px"
                        borderColor="gray.200"
                      >
                        <Text fontSize="sm" color="gray.700">
                          {consignee.destination || "N/A"}
                        </Text>
                      </Box>
                    </Box>
                  </Flex>
                </Box>

                {/* Rates and Amounts */}
                <Box
                  p={2}
                  borderRadius="lg"
                  bg={`${primaryColor}05`}
                  position="relative"
                  transition="all 0.3s ease"
                  _hover={{
                    transform: "translateX(-4px)",
                    boxShadow: "md",
                  }}
                >
                  <Text
                    fontSize="xs"
                    fontWeight="bold"
                    color="blue.600"
                    textTransform="uppercase"
                    mb={2}
                  >
                    Financial Details
                  </Text>

                  <Grid templateColumns="repeat(3, 1fr)" gap={2}>
                    <Box
                      p={2}
                      bg="white"
                      borderRadius="md"
                      boxShadow="sm"
                      borderWidth="1px"
                      borderColor="blue.100"
                    >
                      <Flex align="center" mb={1}>
                        <Icon as={FaTag} color="blue.500" mr={1} size="sm" />
                        <Text
                          fontWeight="semibold"
                          fontSize="xs"
                          color="gray.600"
                        >
                          Store Rate
                        </Text>
                      </Flex>
                      <Text fontSize="sm" fontWeight="bold" color="blue.600">
                        ₱{formatNumberWithCommas(consignee.rate) || "0"}
                      </Text>
                    </Box>

                    <Box
                      p={2}
                      bg="white"
                      borderRadius="md"
                      boxShadow="sm"
                      borderWidth="1px"
                      borderColor="blue.100"
                    >
                      <Flex align="center" mb={1}>
                        <Icon
                          as={FaPercentage}
                          color="Red.500"
                          mr={1}
                          size="sm"
                        />
                        <Text
                          fontWeight="semibold"
                          fontSize="xs"
                          color="gray.600"
                        >
                          Percentage
                        </Text>
                      </Flex>
                      <Text fontSize="sm" fontWeight="bold" color="Maroon.500">
                        {formatNumberWithCommas(consignee.percentage) || "0"}%
                      </Text>
                    </Box>

                    <Box
                      p={2}
                      bg="white"
                      borderRadius="md"
                      boxShadow="sm"
                      borderWidth="1px"
                      borderColor="blue.100"
                    >
                      <Flex align="center" mb={1}>
                        <Icon as={FaCube} color="orange.500" mr={1} size="sm" />
                        <Text
                          fontWeight="semibold"
                          fontSize="xs"
                          color="gray.600"
                        >
                          CBM
                        </Text>
                      </Flex>
                      <Text fontSize="sm" fontWeight="bold" color="orange.600">
                        {formatNumberWithCommas(consignee.cbm) || "0"}
                      </Text>
                    </Box>
                  </Grid>
                </Box>
              </Grid>

              {/* Action Buttons and Timer Section */}
              <Flex justifyContent="space-between" mt={2} alignItems="center">
                {/* Timer Display - Left side */}
                <Box>
                  {(getApprovalData(consignee, "edit") ||
                    getApprovalData(consignee, "delete")) && (
                    <HStack spacing={1}>
                      <TimeIcon color="purple.500" />
                      <Text
                        fontSize="xs"
                        fontWeight="medium"
                        color="purple.500"
                      >
                        Access status:
                      </Text>

                      {/* Edit Timer */}
                      {getApprovalData(consignee, "edit") && (
                        <Badge
                          colorScheme={
                            isActionApproved(consignee, "edit")
                              ? "green"
                              : "red"
                          }
                          variant="outline"
                        >
                          <Flex align="center">
                            <Text mr={1}>Edit:</Text>
                            {(() => {
                              const editApproval = getApprovalData(
                                consignee,
                                "edit"
                              );
                              if (editApproval && editApproval.ExpiresAt) {
                                const timerValue =
                                  approvalTimers[editApproval._id];
                                if (timerValue === "Expired") {
                                  return "Expired";
                                }
                                return (
                                  timerValue ||
                                  formatRemainingTime(
                                    new Date(editApproval.ExpiresAt) -
                                      new Date()
                                  )
                                );
                              }
                              return "∞";
                            })()}
                          </Flex>
                        </Badge>
                      )}

                      {/* Delete Timer */}
                      {getApprovalData(consignee, "delete") && (
                        <Badge
                          colorScheme={
                            isActionApproved(consignee, "delete")
                              ? "red"
                              : "gray"
                          }
                          variant="outline"
                        >
                          <Flex align="center">
                            <Text mr={1}>Delete:</Text>
                            {(() => {
                              const deleteApproval = getApprovalData(
                                consignee,
                                "delete"
                              );
                              if (deleteApproval && deleteApproval.ExpiresAt) {
                                const timerValue =
                                  approvalTimers[deleteApproval._id];
                                if (timerValue === "Expired") {
                                  return "Expired";
                                }
                                return (
                                  timerValue ||
                                  formatRemainingTime(
                                    new Date(deleteApproval.ExpiresAt) -
                                      new Date()
                                  )
                                );
                              }
                              return "∞";
                            })()}
                          </Flex>
                        </Badge>
                      )}
                    </HStack>
                  )}
                </Box>

                {/* Action Buttons - Right side */}
                <Flex gap={2}>
                  {/* {(consignee.type === "DC" || consignee.type === "Store") && (
                    <Button
                      leftIcon={<DownloadIcon />}
                      onClick={() => handleViewSubDetails(consignee)}
                      colorScheme="blue"
                      variant="outline"
                      size="xs"
                    >
                      View Details
                    </Button>
                  )} */}

                  {/* Edit button: Green when approved, gray when not */}
                  {!isViewOnly && (
                    <Tooltip
                      label={
                        isActionApproved(consignee, "edit")
                          ? "Edit approved"
                          : getApprovalData(consignee, "edit") &&
                              approvalTimers[
                                getApprovalData(consignee, "edit")._id
                              ] === "Expired"
                            ? "Edit approval has expired"
                            : "Editing requires approval"
                      }
                      placement="top"
                    >
                      <Box>
                        <IconButton
                          icon={<EditIcon />}
                          aria-label="Edit Consignee"
                          onClick={() => handleEditConsignee(consignee)}
                          colorScheme={
                            isActionApproved(consignee, "edit")
                              ? "green"
                              : getApprovalData(consignee, "edit") &&
                                  approvalTimers[
                                    getApprovalData(consignee, "edit")._id
                                  ] === "Expired"
                                ? "gray"
                                : "gray"
                          }
                          isDisabled={!isActionApproved(consignee, "edit")}
                          size="xs"
                        />
                      </Box>
                    </Tooltip>
                  )}

                  {/* Delete button: Red when approved, gray when not */}
                  {!isViewOnly && (
                    <Tooltip
                      label={
                        isActionApproved(consignee, "delete")
                          ? "Deletion approved"
                          : getApprovalData(consignee, "delete") &&
                              approvalTimers[
                                getApprovalData(consignee, "delete")._id
                              ] === "Expired"
                            ? "Delete approval has expired"
                            : "Deletion requires approval"
                      }
                      placement="top"
                    >
                      <Box>
                        <IconButton
                          icon={<DeleteIcon />}
                          aria-label="Delete Consignee"
                          onClick={() => handleDeleteConsignee(consignee)}
                          colorScheme={
                            isActionApproved(consignee, "delete")
                              ? "red"
                              : getApprovalData(consignee, "delete") &&
                                  approvalTimers[
                                    getApprovalData(consignee, "delete")._id
                                  ] === "Expired"
                                ? "gray"
                                : "gray"
                          }
                          isDisabled={!isActionApproved(consignee, "delete")}
                          variant="outline"
                          size="xs"
                        />
                      </Box>
                    </Tooltip>
                  )}

                  {!isViewOnly && (
                    <Button
                      leftIcon={<LockIcon />}
                      onClick={() => handleRequestAccess(consignee)}
                      colorScheme="purple"
                      size="xs"
                      variant="outline"
                    >
                      Request Access
                    </Button>
                  )}
                </Flex>
              </Flex>
            </Box>
          ))
        ) : (
          <Box
            textAlign="center"
            py={8}
            bg="gray.50"
            borderRadius="lg"
            border="1px dashed"
            borderColor="gray.200"
          >
            <Text fontSize="lg" color="gray.500">
              No consignees added yet.
            </Text>
            <Text fontSize="sm" color="gray.400" mt={2}>
              Use the form above to add consignees to this waybill.
            </Text>
          </Box>
        )}
      </Box>

      {/* Request Access Modal */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Request Access</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {selectedConsignee && (
              <>
                <Text mb={4}>
                  You are requesting access to modify consignee:{" "}
                  <Text as="span" fontWeight="bold">
                    {selectedConsignee.consignee}
                  </Text>{" "}
                  for waybill{" "}
                  <Text as="span" fontWeight="bold">
                    {selectedConsignee.waybillNumber}
                  </Text>
                </Text>

                <RadioGroup
                  onChange={setRequestType}
                  value={requestType}
                  mb={4}
                >
                  <FormLabel>Select action type:</FormLabel>
                  <Stack direction="row">
                    <Radio value="edit">Edit</Radio>
                    <Radio value="delete">Delete</Radio>
                  </Stack>
                </RadioGroup>

                <FormControl>
                  <FormLabel>Remarks (reason for request):</FormLabel>
                  <Textarea
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Please explain why you need access to this consignee"
                  />
                </FormControl>
              </>
            )}
          </ModalBody>

          <ModalFooter>
            <Button colorScheme="gray" mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button
              colorScheme="purple"
              onClick={submitAccessRequest}
              isDisabled={!remarks || isViewOnly}
            >
              Submit Request
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default ConsigneeInformation;
