import React, { useState, useEffect } from "react";
import {
  Box,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Button,
  useToast,
  Badge,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  IconButton,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Textarea,
  Select,
  Flex,
  Text,
  Input,
  InputGroup,
  InputLeftElement,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  HStack,
  Heading,
  TableContainer,
  ButtonGroup,
  Icon,
} from "@chakra-ui/react";
import axios from "axios";
import {
  FiMoreVertical,
  FiCheck,
  FiX,
  FiEye,
  FiSearch,
  FiFilter,
  FiClock,
  FiChevronLeft,
  FiChevronRight,
} from "react-icons/fi";

const ControlPanelComp = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [remarks, setRemarks] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const toast = useToast();
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [timers, setTimers] = useState({});
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Fetch all control panel requests
  useEffect(() => {
    fetchRequests();
    const interval = setInterval(fetchRequests, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  // Timer effect
  useEffect(() => {
    // Set up timers for approved requests with expiration
    const timerInterval = setInterval(() => {
      // Create a copy of current timers object
      const updatedTimers = { ...timers };
      let hasChanges = false;

      // Update each timer
      requests.forEach((request) => {
        if (request.Status === "Approved" && request.ExpiresAt) {
          const now = new Date();
          const expiresAt = new Date(request.ExpiresAt);
          const remainingTime = expiresAt - now;

          if (remainingTime <= 0) {
            // Timer expired, update status
            updateExpiredStatus(request._id);
            delete updatedTimers[request._id];
            hasChanges = true;
          } else {
            // Update the timer
            updatedTimers[request._id] = formatRemainingTime(remainingTime);
            hasChanges = true;
          }
        }
      });

      // Update timers state if there were changes
      if (hasChanges) {
        setTimers(updatedTimers);
      }
    }, 1000);

    return () => clearInterval(timerInterval);
  }, [requests]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      if (!token) {
        // If no token, likely not logged in
        console.log("No authentication token found");
        setRequests([]);
        return;
      }

      const response = await axios.get(
        process.env.NEXT_PUBLIC_BACKEND_API + "/api/control-panel",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setRequests(response.data);
    } catch (error) {
      console.error("Error fetching requests", error);
      // If it's a 404 error, just set empty array and don't show error
      if (error.response && error.response.status === 404) {
        setRequests([]);
      }
      // If it's an authentication error (401 or 403), handle token issues
      else if (
        error.response &&
        (error.response.status === 401 || error.response.status === 403)
      ) {
        setRequests([]);
        toast({
          title: "Authentication Error",
          description: "Your session may have expired. Please log in again.",
          status: "warning",
          duration: 5000,
          isClosable: true,
        });
      } else {
        // For other errors, show the toast
        toast({
          title: "Error",
          description: "Failed to fetch control panel requests",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      }
    } finally {
      setLoading(false);
    }
  };

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

  // Update request status
  const updateRequestStatus = async () => {
    if (!selectedRequest || !newStatus) return;

    // *** Add validation for timer on approval ***
    if (newStatus === "Approved") {
      const totalSecondsDuration = (hours * 3600) + (minutes * 60) + seconds;
      if (totalSecondsDuration <= 0) {
        toast({
          title: "Timer Required",
          description: "Please set a timer duration (hours, minutes, or seconds) when approving a request.",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
        return; // Stop execution if timer is not set for approval
      }
    }
    // *** End validation ***

    setIsUpdatingStatus(true);

    try {
      const token = localStorage.getItem("token");
      await axios.put(
        process.env.NEXT_PUBLIC_BACKEND_API +
          `/api/control-panel/${selectedRequest._id}/status`,
        {
          status: newStatus,
          remarks: remarks,
          // Timer values are sent regardless, backend handles logic based on status
          hours: hours,
          minutes: minutes,
          seconds: seconds, 
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Refresh the list
      fetchRequests();

      // Close modal and reset state
      setStatusModalOpen(false);
      setSelectedRequest(null);
      setRemarks("");
      setNewStatus("");
      setHours(0);
      setMinutes(0);
      setSeconds(0);

      toast({
        title: "Success",
        description: "Request status updated successfully",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error("Error updating request status", error);
      toast({
        title: "Error",
        description: "Failed to update request status",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Update expired status
  const updateExpiredStatus = async (requestId) => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        process.env.NEXT_PUBLIC_BACKEND_API +
          `/api/control-panel/${requestId}/expire`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Update the local state to reflect the change
      setRequests(
        requests.map((req) =>
          req._id === requestId ? { ...req, Status: "Expired" } : req
        )
      );
    } catch (error) {
      console.error("Error updating expired status", error);
    }
  };

  // Handle opening view modal
  const handleViewRequest = (request) => {
    setSelectedRequest(request);
    setViewModalOpen(true);
  };

  // Handle opening status update modal
  const handleStatusUpdate = (request) => {
    setSelectedRequest(request);
    setNewStatus(request.Status);
    setRemarks(request.Remarks || "");
    setHours(0);
    setMinutes(0);
    setSeconds(0);
    setStatusModalOpen(true);
  };

  // Get status badge color
  const getStatusColor = (status) => {
    switch (status) {
      case "Approved":
        return "blue";
      case "Rejected":
        return "red";
      case "Expired":
        return "gray";
      default:
        return "yellow"; // Pending
    }
  };

  // Filter requests based on search term and status filter
  const filteredRequests = requests.filter((request) => {
    const matchesSearch =
      searchTerm === "" ||
      request.RequestID.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.Module.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.Username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.RequestType.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter =
      filterStatus === "" || request.Status === filterStatus;

    return matchesSearch && matchesFilter;
  });

  // Calculate paginated data
  const paginatedRequests = filteredRequests.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Handle page change
  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  // Handle page size change
  const handlePageSizeChange = (e) => {
    setPageSize(Number(e.target.value));
    setCurrentPage(1); // Reset to first page when changing page size
  };

  const totalPages = Math.ceil(filteredRequests.length / pageSize);

  return (
    <Box p={4}>
      <Box
        py={4}
        px={2}
        color="blue.900"
        mb={6}
        borderBottom="1px solid"
        borderColor="gray.200"
      >
        <Heading size="xl" fontWeight="bold">
          Control Panel Requests
        </Heading>
        <Text mt={1} fontSize="sm" color="gray.600">
          Review and manage access requests
        </Text>
      </Box>

      {/* Search and Filter */}
      <Flex mb={6} gap={4} px={2}>
        <InputGroup maxW="350px">
          <InputLeftElement pointerEvents="none">
            <FiSearch color="gray.400" />
          </InputLeftElement>
          <Input
            placeholder="Search by ID, Module, Username, Type..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            borderColor="gray.300"
            _hover={{ borderColor: "red.600" }}
            _focus={{
              borderColor: "red.700",
              boxShadow: "0 0 0 1px var(--chakra-colors-red-700)",
            }}
            borderRadius="md"
          />
        </InputGroup>

        <Select
          placeholder="Filter by Status"
          maxW="200px"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          borderColor="gray.300"
          _hover={{ borderColor: "red.600" }}
          _focus={{
            borderColor: "red.700",
            boxShadow: "0 0 0 1px var(--chakra-colors-red-700)",
          }}
          borderRadius="md"
        >
          <option value="">All Statuses</option>
          <option value="Pending">Pending</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
          <option value="Expired">Expired</option>
        </Select>
      </Flex>

      {/* Requests Table */}
      <Box overflowX="auto" mx={2}>
        <TableContainer>
          <Table variant="simple" size="md">
            <Thead
              bg="gray.50"
              position="sticky"
              top={0}
              zIndex={1}
              boxShadow="sm"
            >
              <Tr>
                <Th fontSize="xs" fontWeight="semibold" color="gray.700" py={3} px={4} borderBottom="2px" borderColor="blue.800" textTransform="uppercase" letterSpacing="wider">Request ID</Th>
                <Th fontSize="xs" fontWeight="semibold" color="gray.700" py={3} px={4} borderBottom="2px" borderColor="blue.800" textTransform="uppercase" letterSpacing="wider">Module</Th>
                <Th fontSize="xs" fontWeight="semibold" color="gray.700" py={3} px={4} borderBottom="2px" borderColor="blue.800" textTransform="uppercase" letterSpacing="wider">User Role</Th>
                <Th fontSize="xs" fontWeight="semibold" color="gray.700" py={3} px={4} borderBottom="2px" borderColor="blue.800" textTransform="uppercase" letterSpacing="wider">Username</Th>
                <Th fontSize="xs" fontWeight="semibold" color="gray.700" py={3} px={4} borderBottom="2px" borderColor="blue.800" textTransform="uppercase" letterSpacing="wider">Remarks</Th>
                <Th fontSize="xs" fontWeight="semibold" color="gray.700" py={3} px={4} borderBottom="2px" borderColor="blue.800" textTransform="uppercase" letterSpacing="wider">Request Type</Th>
                <Th fontSize="xs" fontWeight="semibold" color="gray.700" py={3} px={4} borderBottom="2px" borderColor="blue.800" textTransform="uppercase" letterSpacing="wider">Status</Th>
                <Th fontSize="xs" fontWeight="semibold" color="gray.700" py={3} px={4} borderBottom="2px" borderColor="blue.800" textTransform="uppercase" letterSpacing="wider">Timer</Th>
                <Th fontSize="xs" fontWeight="semibold" color="gray.700" py={3} px={4} borderBottom="2px" borderColor="blue.800" textTransform="uppercase" letterSpacing="wider" textAlign="center">Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {paginatedRequests.map((request, index) => (
                <Tr 
                  key={request._id}
                  _hover={{ bg: "blue.50" }}
                  transition="background-color 0.2s ease-in-out"
                  bg={index % 2 === 0 ? "white" : "gray.50"}
                >
                  <Td py={3} px={4}>{request.RequestID}</Td>
                  <Td py={3} px={4}>{request.Module}</Td>
                  <Td py={3} px={4}>{request.UserRole}</Td>
                  <Td py={3} px={4} fontWeight="medium" color="blue.800">{request.Username}</Td>
                  <Td py={3} px={4}>
                    {request.Remarks && request.Remarks.length > 20
                      ? `${request.Remarks.substring(0, 20)}...`
                      : request.Remarks || "-"}
                  </Td>
                  <Td py={3} px={4}>{request.RequestType}</Td>
                  <Td py={3} px={4}>
                    <Badge 
                      colorScheme={getStatusColor(request.Status)}
                      variant={request.Status === 'Pending' || request.Status === 'Expired' ? 'subtle' : 'solid'}
                      px={2} py={1} borderRadius="md"
                    >
                      {request.Status}
                    </Badge>
                  </Td>
                  <Td py={3} px={4}>
                    {request.Status === "Approved" && request.ExpiresAt ? (
                      <Flex align="center">
                        <FiClock style={{ marginRight: "4px" }} />
                        {timers[request._id] ||
                          formatRemainingTime(
                            new Date(request.ExpiresAt) - new Date()
                          )}
                      </Flex>
                    ) : (
                      "-"
                    )}
                  </Td>
                  <Td py={3} px={4} textAlign="center">
                    <Menu>
                      <MenuButton
                        as={IconButton}
                        icon={<FiMoreVertical />}
                        variant="ghost"
                        size="sm"
                      />
                      <MenuList>
                        <MenuItem
                          icon={<FiEye />}
                          onClick={() => handleViewRequest(request)}
                        >
                          View Details
                        </MenuItem>
                        {request.Status === "Pending" && (
                          <>
                            <MenuItem
                              icon={<FiCheck />}
                              onClick={() => {
                                setSelectedRequest(request);
                                setNewStatus("Approved");
                                setStatusModalOpen(true);
                              }}
                              color="blue.700"
                            >
                              Approve
                            </MenuItem>
                            <MenuItem
                              icon={<FiX />}
                              onClick={() => {
                                setSelectedRequest(request);
                                setNewStatus("Rejected");
                                setStatusModalOpen(true);
                              }}
                              color="red.700"
                            >
                              Reject
                            </MenuItem>
                          </>
                        )}
                      </MenuList>
                    </Menu>
                  </Td>
                </Tr>
              ))}
              {paginatedRequests.length === 0 && (
                <Tr>
                  <Td colSpan={9} textAlign="center">
                    No requests found
                  </Td>
                </Tr>
              )}
            </Tbody>
          </Table>
        </TableContainer>

        {/* Pagination Controls */}
        <Flex justify="center" align="center" mt={4} px={2}>
          <Button
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            isDisabled={currentPage === 1}
            variant="ghost"
            mr={2}
          >
            &lt; Previous
          </Button>
          <Text fontSize="sm" color="gray.700" mx={2}>
            Page {currentPage} of {totalPages === 0 ? 1 : totalPages}
          </Text>
          <Button
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            isDisabled={currentPage === totalPages || totalPages === 0}
            variant="ghost"
            ml={2}
          >
            Next &gt;
          </Button>
        </Flex>
      </Box>

      {/* View Request Modal */}
      <Modal isOpen={viewModalOpen} onClose={() => setViewModalOpen(false)}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Request Details</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {selectedRequest && (
              <Box>
                <Text fontWeight="bold">Request ID:</Text>
                <Text mb={2}>{selectedRequest.RequestID}</Text>

                <Text fontWeight="bold">Module:</Text>
                <Text mb={2}>{selectedRequest.Module}</Text>

                <Text fontWeight="bold">User Role:</Text>
                <Text mb={2}>{selectedRequest.UserRole}</Text>

                <Text fontWeight="bold">Username:</Text>
                <Text mb={2}>{selectedRequest.Username}</Text>

                <Text fontWeight="bold">Request Type:</Text>
                <Text mb={2}>{selectedRequest.RequestType}</Text>

                <Text fontWeight="bold">Status:</Text>
                <Badge
                  mb={2}
                  colorScheme={getStatusColor(selectedRequest.Status)}
                >
                  {selectedRequest.Status}
                </Badge>

                {selectedRequest.Status === "Approved" &&
                  selectedRequest.ExpiresAt && (
                    <>
                      <Text fontWeight="bold">Expires At:</Text>
                      <Text mb={2}>
                        {new Date(selectedRequest.ExpiresAt).toLocaleString()}
                      </Text>

                      <Text fontWeight="bold">Time Remaining:</Text>
                      <Text mb={2}>
                        {timers[selectedRequest._id] ||
                          formatRemainingTime(
                            new Date(selectedRequest.ExpiresAt) - new Date()
                          )}
                      </Text>
                    </>
                  )}

                <Text fontWeight="bold">Remarks:</Text>
                <Text mb={2}>{selectedRequest.Remarks || "-"}</Text>

                <Text fontWeight="bold">Created At:</Text>
                <Text mb={2}>
                  {new Date(selectedRequest.createdAt).toLocaleString()}
                </Text>

                {selectedRequest.updatedAt && (
                  <>
                    <Text fontWeight="bold">Last Updated:</Text>
                    <Text mb={2}>
                      {new Date(selectedRequest.updatedAt).toLocaleString()}
                    </Text>
                  </>
                )}
              </Box>
            )}
          </ModalBody>
          <ModalFooter>
            <Button onClick={() => setViewModalOpen(false)}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Update Status Modal */}
      <Modal isOpen={statusModalOpen} onClose={() => !isUpdatingStatus && setStatusModalOpen(false)} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader color={newStatus === "Approved" ? "blue.800" : "red.700"}>
            {newStatus === "Approved" ? "Approve" : "Reject"} Request
          </ModalHeader>
          <ModalCloseButton isDisabled={isUpdatingStatus} />
          <ModalBody pb={6}>
            {selectedRequest && (
              <Box>
                <Text fontWeight="bold">Request ID:</Text>
                <Text mb={2}>{selectedRequest.RequestID}</Text>

                <FormControl mt={4}>
                  <FormLabel>Remarks</FormLabel>
                  <Textarea
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Add any remarks or reasons"
                  />
                </FormControl>

                {newStatus === "Approved" && (
                  <FormControl mt={4}>
                    <FormLabel>Expiration Timer</FormLabel>
                    <HStack spacing={3}>
                      <Box>
                        <Text fontSize="sm" color="gray.600" mb={1}>Hours</Text>
                        <NumberInput
                          min={0}
                          max={24}
                          value={hours}
                          onChange={(value) => setHours(parseInt(value) || 0)}
                        >
                          <NumberInputField />
                          <NumberInputStepper>
                            <NumberIncrementStepper />
                            <NumberDecrementStepper />
                          </NumberInputStepper>
                        </NumberInput>
                      </Box>

                      <Box>
                        <Text fontSize="sm" color="gray.600" mb={1}>Minutes</Text>
                        <NumberInput
                          min={0}
                          max={59}
                          value={minutes}
                          onChange={(value) => setMinutes(parseInt(value) || 0)}
                        >
                          <NumberInputField />
                          <NumberInputStepper>
                            <NumberIncrementStepper />
                            <NumberDecrementStepper />
                          </NumberInputStepper>
                        </NumberInput>
                      </Box>

                      <Box>
                        <Text fontSize="sm" color="gray.600" mb={1}>Seconds</Text>
                        <NumberInput
                          min={0}
                          max={59}
                          value={seconds}
                          onChange={(value) => setSeconds(parseInt(value) || 0)}
                        >
                          <NumberInputField />
                          <NumberInputStepper>
                            <NumberIncrementStepper />
                            <NumberDecrementStepper />
                          </NumberInputStepper>
                        </NumberInput>
                      </Box>
                    </HStack>
                    <Text fontSize="xs" mt={2} color="gray.500">
                      Set a timer for this approval. When timer expires, status
                      will change to "Expired".
                    </Text>
                  </FormControl>
                )}
              </Box>
            )}
          </ModalBody>
          <ModalFooter borderTop="1px solid" borderColor="gray.200">
            <Button
              variant="ghost"
              mr={3}
              onClick={() => setStatusModalOpen(false)}
              isDisabled={isUpdatingStatus}
            >
              Cancel
            </Button>
            <Button
              colorScheme={newStatus === "Approved" ? "blue" : "red"}
              onClick={updateRequestStatus}
              isLoading={isUpdatingStatus}
              loadingText={newStatus === "Approved" ? "Approving..." : "Rejecting..."}
              borderRadius="md"
            >
              {newStatus === "Approved" ? "Approve" : "Reject"}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default ControlPanelComp;
