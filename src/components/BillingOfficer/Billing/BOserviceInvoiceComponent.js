import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Button,
  Input,
  InputGroup,
  InputLeftElement,
  HStack,
  useToast,
  VStack,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  ModalFooter,
  useDisclosure,
  FormControl,
  FormLabel,
  Flex,
  Heading,
  TableContainer,
  Badge,
  Select,
  Spinner,
  Text,
  IconButton,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  AlertDialogCloseButton,
  Tooltip,
  Progress,
  Textarea,
  Alert,
  AlertIcon,
  Icon,
  FormErrorMessage,
} from "@chakra-ui/react";
import { SearchIcon, AddIcon, ViewIcon, DeleteIcon, LockIcon, CheckIcon, InfoIcon, EditIcon } from "@chakra-ui/icons";
import { FiClock } from "react-icons/fi";
import axios from "axios";

const ServiceInvoiceComponent = () => {
  const toast = useToast();
  const [serviceInvoices, setServiceInvoices] = useState([]);
  const [selectedStubInvoices, setSelectedStubInvoices] = useState([]);
  const [selectedStubForView, setSelectedStubForView] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [isRefLoading, setIsRefLoading] = useState(false);
  const [referenceInfo, setReferenceInfo] = useState({
    previousStub: null,
    previousInvoice: null,
    nextInvoice: null,
  });

  // Access control states
  const [hasAccess, setHasAccess] = useState(false);
  const [accessRequest, setAccessRequest] = useState(null);
  const [hasEditAccess, setHasEditAccess] = useState(false);
  const [hasDeleteAccess, setHasDeleteAccess] = useState(false);
  const [timer, setTimer] = useState(0);
  const timerIntervalRef = useRef(null);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [requestType, setRequestType] = useState("");
  const [requestRemarks, setRequestRemarks] = useState("");
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const [pendingEditRequest, setPendingEditRequest] = useState(false);
  const [pendingDeleteRequest, setPendingDeleteRequest] = useState(false);

  // Modal states
  const {
    isOpen: isAddModalOpen,
    onOpen: onAddModalOpen,
    onClose: onAddModalClose,
  } = useDisclosure();
  const {
    isOpen: isDeleteModalOpen,
    onOpen: onDeleteModalOpen,
    onClose: onDeleteModalClose,
  } = useDisclosure();
  const {
    isOpen: isViewModalOpen,
    onOpen: onViewModalOpen,
    onClose: onViewModalClose,
  } = useDisclosure();
  const deleteStubAlertDisclosure = useDisclosure();
  const [isDeletingStub, setIsDeletingStub] = useState(false);
  const cancelRef = useRef();

  // Add new state variables for Edit Stub functionality
  const [isEditStubModalOpen, setIsEditStubModalOpen] = useState(false);
  const [newStubNumber, setNewStubNumber] = useState("");
  const [isUpdatingStub, setIsUpdatingStub] = useState(false);
  const [isCheckingStub, setIsCheckingStub] = useState(false);
  const [stubValidationError, setStubValidationError] = useState("");

  const [formData, setFormData] = useState({
    stub: "",
    rangeStart: "",
    rangeEnd: "",
    status: "UNUSED",
  });

  const [deleteInvoiceId, setDeleteInvoiceId] = useState("");
  const [deleteStub, setDeleteStub] = useState("");

  const [modalHasEditAccess, setModalHasEditAccess] = useState(false);
  const [modalRequestingEdit, setModalRequestingEdit] = useState(false);

  // Add filteredInvoices state
  const [filteredInvoices, setFilteredInvoices] = useState([]);

  // Format time helper function
  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) {
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    } else {
      return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
  };

  // Check access status
  const checkAccessStatus = async () => {
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/control-panel/reference/service-invoice`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      const now = new Date();
      const approvedEdit = response.data.find(
        request => request.Status === "Approved" && request.RequestType === "Edit" && new Date(request.ExpiresAt) > now
      );
      const approvedDelete = response.data.find(
        request => request.Status === "Approved" && request.RequestType === "Delete" && new Date(request.ExpiresAt) > now
      );
      setHasEditAccess(!!approvedEdit);
      setHasDeleteAccess(!!approvedDelete);
      const approvedRequest = response.data.find(
        request => request.Status === "Approved" && new Date(request.ExpiresAt) > now
      );
      setAccessRequest(approvedRequest);
      setHasAccess(!!approvedRequest);
      const user = localStorage.getItem('username') || 'Unknown';
      setPendingEditRequest(
        !!response.data.find(r => r.Status === 'Pending' && r.RequestType === 'Edit' && r.Username === user)
      );
      setPendingDeleteRequest(
        !!response.data.find(r => r.Status === 'Pending' && r.RequestType === 'Delete' && r.Username === user)
      );
    } catch (error) {
      console.error("Error checking access status:", error);
    }
  };

  // Handle request access
  const handleRequestAccess = async () => {
    if (isSubmittingRequest) return;
    setIsSubmittingRequest(true);
    try {
      const requestData = {
        RequestID: `REQ_${Date.now()}`,
        Module: "Service Invoice",
        UserRole: localStorage.getItem('userRole') || 'Billing Officer',
        Username: localStorage.getItem('username') || 'Unknown',
        RequestType: requestType,
        Remarks: requestRemarks,
        ReferenceID: "service-invoice"
      };
      await axios.post(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/control-panel`,
        requestData,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      setIsRequestModalOpen(false);
      setRequestType("");
      setRequestRemarks("");
      toast({
        title: "Request Submitted",
        description: "Your access request has been submitted successfully",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit access request",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  // Effect for timer
  useEffect(() => {
    if (accessRequest && accessRequest.ExpiresAt) {
      const expiresAt = new Date(accessRequest.ExpiresAt).getTime();
      const updateTimer = () => {
        const now = Date.now();
        const diff = Math.max(0, Math.floor((expiresAt - now) / 1000));
        setTimer(diff);
        if (diff <= 0) {
          setHasAccess(false);
          setAccessRequest(null);
          setHasEditAccess(false);
          setHasDeleteAccess(false);
          clearInterval(timerIntervalRef.current);
        }
      };
      updateTimer();
      timerIntervalRef.current = setInterval(updateTimer, 1000);
      return () => clearInterval(timerIntervalRef.current);
    } else {
      setTimer(0);
      clearInterval(timerIntervalRef.current);
    }
  }, [accessRequest]);

  // Handler for opening request modal
  const handleOpenRequestModal = () => {
    if (pendingEditRequest && (!requestType || requestType === 'Edit')) {
      toast({
        title: 'Pending Request',
        description: 'You already have a pending Edit access request.',
        status: 'warning',
        duration: 4000,
        isClosable: true,
      });
      return;
    }
    if (pendingDeleteRequest && (!requestType || requestType === 'Delete')) {
      toast({
        title: 'Pending Request',
        description: 'You already have a pending Delete access request.',
        status: 'warning',
        duration: 4000,
        isClosable: true,
      });
      return;
    }
    setIsRequestModalOpen(true);
  };

  // Add getNumberPart helper function
  const getNumberPart = (invoiceNumber) => {
    if (!invoiceNumber) return 0;
    const parts = invoiceNumber.split("-");
    if (parts.length > 1) {
      return parseInt(parts[1]);
    }
    return parseInt(invoiceNumber);
  };

  // Update fetchServiceInvoices to include sorting
  const fetchServiceInvoices = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/service-invoice`
      );
      // Sort service invoices by stub and invoice number in descending order
      const sortedInvoices = response.data.sort((a, b) => {
        const aStub = parseInt(a.stub);
        const bStub = parseInt(b.stub);
        if (aStub !== bStub) {
          return bStub - aStub; // Sort stubs in descending order
        }
        // If same stub, sort by highest invoice number
        const aInvoices = a.invoices || [];
        const bInvoices = b.invoices || [];
        const aHighest = Math.max(...aInvoices.map(inv => getNumberPart(inv.invoiceNumber)));
        const bHighest = Math.max(...bInvoices.map(inv => getNumberPart(inv.invoiceNumber)));
        return bHighest - aHighest;
      });
      setServiceInvoices(sortedInvoices);
      setFilteredInvoices(sortedInvoices);
    } catch (error) {
      console.error("Error fetching service invoices:", error);
      toast({
        title: "Error",
        description: "Failed to fetch service invoices",
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "top-right",
      });
      setServiceInvoices([]); // Set to empty array on error
      setFilteredInvoices([]); // Also set filtered invoices to empty
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch reference information
  const fetchReferenceInfo = async () => {
    setIsRefLoading(true);
    setReferenceInfo({
      previousStub: null,
      previousInvoice: null,
      nextInvoice: null,
    });
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/service-invoice/latest-invoice-info`
      );
      if (response.data && response.data.latestInvoiceNumber !== null) {
        const previousStub = response.data.latestStubNumber;
        const previousInvoiceStr = response.data.latestInvoiceNumber;
        const previousInvoiceNum = parseInt(previousInvoiceStr);
        const nextInvoice = !isNaN(previousInvoiceNum)
          ? previousInvoiceNum + 1
          : "N/A";
        setReferenceInfo({
          previousStub: previousStub ?? "N/A",
          previousInvoice: previousInvoiceStr,
          nextInvoice: nextInvoice,
        });
      } else {
        setReferenceInfo({
          previousStub: "N/A",
          previousInvoice: "N/A",
          nextInvoice: 1,
        });
      }
    } catch (error) {
      console.error("Error fetching reference info:", error);
      const errorMsg =
        error.response?.data?.message ||
        "Failed to fetch reference information";
      // No toast here, failure is handled visually in the modal
      setReferenceInfo({
        previousStub: "N/A",
        previousInvoice: "N/A",
        nextInvoice: "N/A",
      });
    } finally {
      setIsRefLoading(false);
    }
  };

  useEffect(() => {
    fetchServiceInvoices();
    checkAccessStatus();
  }, []);

  // Update handleViewInvoices to include sorting
  const handleViewInvoices = async (stub) => {
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/service-invoice/stub/${stub}`
      );
      // Sort invoices by invoice number in descending order
      const sortedInvoices = response.data.sort((a, b) => {
        return getNumberPart(b.invoiceNumber) - getNumberPart(a.invoiceNumber);
      });
      setSelectedStubInvoices(sortedInvoices);
      setSelectedStubForView(stub);
      onViewModalOpen();
    } catch (error) {
      console.error("Error fetching invoices for stub:", error);
      toast({
        title: "Error",
        description: "Failed to fetch invoices for this stub",
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "top-right",
      });
    }
  };

  // Handle opening the Add modal and fetch reference info
  const handleAddModalOpen = () => {
    fetchReferenceInfo();
    setFormData({ stub: "", rangeStart: "", rangeEnd: "", status: "UNUSED" });
    onAddModalOpen();
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.stub || !formData.rangeStart || !formData.rangeEnd) {
      toast({
        title: "Input Error",
        description: "Please fill in all required fields.",
        status: "warning",
        duration: 3000,
        isClosable: true,
        position: "top-right",
      });
      return;
    }
    const start = parseInt(formData.rangeStart);
    const end = parseInt(formData.rangeEnd);
    if (isNaN(start) || isNaN(end) || start <= 0 || end <= 0 || start > end) {
      toast({
        title: "Input Error",
        description: "Invalid range.",
        status: "warning",
        duration: 4000,
        isClosable: true,
        position: "top-right",
      });
      return;
    }

    setIsLoading(true); // Use general loading state for delete operation
    try {
      // Validation
      await axios.post(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/service-invoice/validate-batch`,
        {
          stub: formData.stub,
          rangeStart: formData.rangeStart,
          rangeEnd: formData.rangeEnd,
        }
      );

      // Creation
      const serviceInvoicesToCreate = [];
      for (let i = start; i <= end; i++) {
        serviceInvoicesToCreate.push({
          stub: formData.stub,
          invoiceNumber: i.toString(),
          status: "UNUSED",
        });
      }
      await Promise.all(
        serviceInvoicesToCreate.map((invoice) =>
          axios.post(
            `${process.env.NEXT_PUBLIC_BACKEND_API}/api/service-invoice`,
            invoice
          )
        )
      );

      // Success
      fetchServiceInvoices();
      onAddModalClose();
      toast({
        title: "Success",
        description: `Created ${serviceInvoicesToCreate.length} invoices for stub ${formData.stub}.`,
        status: "success",
        duration: 3000,
        isClosable: true,
        position: "top-right",
      });
      setFormData({ stub: "", rangeStart: "", rangeEnd: "", status: "UNUSED" }); // Reset form on success
    } catch (error) {
      // Handle both validation and creation errors
      const errorMsg =
        error.response?.data?.message ||
        (error.response?.status === 409
          ? "Conflict detected."
          : "An error occurred.");
      const errorTitle =
        error.response?.status === 409 ? "Validation Conflict" : "Error";
      console.error(
        "Error during invoice submission:",
        error.response || error
      );
      toast({
        title: errorTitle,
        description: errorMsg,
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "top-right",
      });
    } finally {
      setIsLoading(false); // Stop loading indicator regardless of outcome
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!deleteStub) return;
    setIsDeletingStub(true);

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast({
          title: "Error",
          description: "Authentication token not found. Please log in.",
          status: "error",
        });
        setIsDeletingStub(false);
        deleteStubAlertDisclosure.onClose();
        return;
      }

      const response = await axios.delete(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/service-invoice/stub/${deleteStub}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      fetchServiceInvoices();
      deleteStubAlertDisclosure.onClose();
      toast({
        title: "Success",
        description:
          response.data.message ||
          `Service invoices for stub ${deleteStub} deleted successfully and logged.`,
        status: "success",
        duration: 3000,
        isClosable: true,
        position: "top-right",
      });
    } catch (error) {
      console.error("Error deleting service invoices:", error);
      toast({
        title: "Error",
        description:
          error.response?.data?.message || "Failed to delete service invoices",
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "top-right",
      });
    } finally {
      setIsDeletingStub(false);
    }
  };

  // Handle status update
  const handleStatusUpdate = async (id, newStatus) => {
    try {
      await axios.put(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/service-invoice/${id}`,
        {
          status: newStatus,
        }
      );
      fetchServiceInvoices();
      toast({
        title: "Success",
        description: "Status updated successfully",
        status: "success",
        duration: 3000,
        isClosable: true,
        position: "top-right",
      });
    } catch (error) {
      console.error("Error updating status:", error);
      toast({
        title: "Error",
        description: "Failed to update status",
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "top-right",
      });
    }
  };

  // Filter invoices based on search
  const handleSearch = (e) => {
    const searchTerm = e.target.value;
    setSearchTerm(searchTerm);
    
    // Filter the serviceInvoices and update the filteredInvoices state
    const searchResults = serviceInvoices.filter((invoice) =>
      invoice.stub?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredInvoices(searchResults);
    setCurrentPage(1); // Reset to first page when searching
  };

  // Update useEffect to handle initial filtering
  useEffect(() => {
    if (serviceInvoices.length > 0) {
      setFilteredInvoices(serviceInvoices);
    }
  }, [serviceInvoices]);

  // Update pagination to use filteredInvoices state
  const getCurrentPageItems = () => {
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    return filteredInvoices.slice(indexOfFirstItem, indexOfLastItem);
  };

  // Pagination logic
  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  // When modal opens, reset modalHasEditAccess
  useEffect(() => {
    if (isViewModalOpen) {
      // If accessRequest is already granted for Edit and not expired, enable edit access
      if (accessRequest && accessRequest.RequestType === 'Edit') {
        setModalHasEditAccess(true);
      } else {
        setModalHasEditAccess(false);
      }
    }
  }, [isViewModalOpen, accessRequest]);

  // When accessRequest changes, if it's for Edit and still valid, enable modal edit access
  useEffect(() => {
    if (modalRequestingEdit && accessRequest && accessRequest.RequestType === 'Edit') {
      setModalHasEditAccess(true);
      setModalRequestingEdit(false);
    }
  }, [accessRequest, modalRequestingEdit]);

  // Handler for modal Request Edit
  const handleModalRequestEdit = () => {
    setModalRequestingEdit(true);
    setRequestType('Edit');
    setIsRequestModalOpen(true);
  };

  // In the main table, disable Delete button unless hasDeleteAccess
  const [mainRequestingDelete, setMainRequestingDelete] = useState(false);
  const handleMainRequestAccess = () => {
    setMainRequestingDelete(true);
    setRequestType('Delete');
    setIsRequestModalOpen(true);
  };

  // When the modal closes, reset mainRequestingDelete
  useEffect(() => {
    if (!isRequestModalOpen) {
      setMainRequestingDelete(false);
    }
  }, [isRequestModalOpen]);

  // Add new function to handle stub update
  const handleUpdateStub = async () => {
    try {
      setIsUpdatingStub(true);

      if (!selectedStubForView || !newStubNumber) {
        toast({
          title: "Error",
          description: "Please provide both current and new stub numbers",
          status: "error",
          duration: 3000,
          isClosable: true,
          position: "top-right",
        });
        return;
      }

      // Log request data for debugging
      console.log("Sending update stub request with data:", {
        currentStub: selectedStubForView,
        newStub: newStubNumber
      });

      const response = await axios.put(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/service-invoice/update-stub`,
        {
          currentStub: selectedStubForView,
          newStub: newStubNumber
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      // Update local state
      setServiceInvoices(prevInvoices =>
        prevInvoices.map(invoice =>
          invoice.stub === selectedStubForView
            ? { ...invoice, stub: newStubNumber }
            : invoice
        )
      );

      toast({
        title: "Success",
        description: `Successfully updated stub ${selectedStubForView} to ${newStubNumber}. Updated ${response.data.invoicesUpdated} invoices.`,
        status: "success",
        duration: 3000,
        isClosable: true,
        position: "top-right",
      });

      // Reset form and close modal
      setNewStubNumber("");
      setIsEditStubModalOpen(false);
      
      // Refresh data
      await fetchServiceInvoices();

    } catch (error) {
      console.error("Error updating stub:", error);
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to update stub",
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "top-right",
      });
    } finally {
      setIsUpdatingStub(false);
    }
  };

  // Add new function to check if stub exists
  const checkStubExists = async (stub) => {
    try {
      setIsCheckingStub(true);
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/service-invoice/stubs`
      );
      const existingStubs = response.data;
      const exists = existingStubs.includes(stub);
      setStubValidationError(exists ? "Stub Already Exists" : "");
      return exists;
    } catch (error) {
      console.error("Error checking stub:", error);
      return false;
    } finally {
      setIsCheckingStub(false);
    }
  };

  // Add new function to handle stub number change
  const handleNewStubChange = async (e) => {
    const value = e.target.value;
    setNewStubNumber(value);
    if (value && value !== selectedStubForView) {
      await checkStubExists(value);
    } else {
      setStubValidationError("");
    }
  };

  return (
    <Box p={{ base: 4, md: 6 }} minH="100vh">
      {/* Updated Header */}
      <Box
        bg="white"
        pt={6}
        pb={4}
        px={6}
        mb={6}
        borderRadius="md"
        boxShadow="sm"
      >
        <Heading as="h1" size="lg" fontWeight="bold" color="blue.800" mb={1}>
          Service Invoice Management
        </Heading>
        <Text color="gray.600" fontSize="sm">
          Manage service invoice records and assignment
        </Text>
      </Box>

      {/* Search Box with Add Button and Access Control */}
      <Box bg="white" p={4} borderRadius="lg" boxShadow="sm" mb={6}>
        <Flex justify="space-between" align="center" wrap="wrap" gap={4}>
          <InputGroup size="md" maxW={{ base: "100%", md: "400px" }}>
            <InputLeftElement pointerEvents="none">
              <SearchIcon color="gray.400" />
            </InputLeftElement>
            <Input
              placeholder="Search by Stub Number..."
              value={searchTerm}
              onChange={handleSearch}
              borderRadius="md"
              focusBorderColor="blue.500"
              bg="white"
              _placeholder={{ color: "gray.500" }}
            />
          </InputGroup>
          <HStack spacing={3}>
          <Button
            onClick={handleAddModalOpen}
              colorScheme="red"
            leftIcon={<AddIcon />}
            size="md"
            fontWeight="medium"
            boxShadow="sm"
              _hover={{ bg: "#600000" }}
              bg="#800000"
          >
            Add Invoice Batch
          </Button>
            <Button
              onClick={() => setIsEditStubModalOpen(true)}
              colorScheme="blue"
              leftIcon={<EditIcon />}
              size="md"
              fontWeight="medium"
              boxShadow="sm"
              _hover={{ bg: "blue.600" }}
            >
              Edit Stub
            </Button>
            <Tooltip label={hasAccess ? 'You have temporary access to Edit/Delete' : 'Request temporary access to Edit/Delete'}>
              <Button
                leftIcon={<LockIcon />}
                variant="solid"
                colorScheme={hasAccess ? "green" : "purple"}
                onClick={handleMainRequestAccess}
                size="md"
                boxShadow="md"
                transition="all 0.2s"
                _hover={{ transform: "scale(1.05)" }}
                rightIcon={hasAccess ? <CheckIcon /> : null}
              >
                {hasAccess ? "Access Granted" : "Request Access"}
              </Button>
            </Tooltip>
            {hasAccess && accessRequest && accessRequest.ExpiresAt && timer > 0 && (
              <Badge colorScheme="purple" fontSize="1em" px={3} py={1} borderRadius="full">
                <Icon as={FiClock} mr={1} /> {formatTime(timer)}
              </Badge>
            )}
            <Tooltip label="Access to Edit/Delete is time-limited for security.">
              <InfoIcon color="gray.400" />
            </Tooltip>
          </HStack>
        </Flex>
      </Box>

      {/* Table Box */}
      <Box bg="white" p={4} borderRadius="lg" boxShadow="sm" overflowX="auto">
        <TableContainer>
          <Table variant="simple" size="md">
            <Thead bg="gray.100">
              <Tr>
                <Th
                  textTransform="uppercase"
                  letterSpacing="wider"
                  color="gray.600"
                  fontSize="xs"
                >
                  Stub
                </Th>
                <Th
                  textTransform="uppercase"
                  letterSpacing="wider"
                  color="gray.600"
                  fontSize="xs"
                >
                  View Details
                </Th>
                <Th
                  textTransform="uppercase"
                  letterSpacing="wider"
                  color="gray.600"
                  fontSize="xs"
                  isNumeric
                >
                  Used
                </Th>
                <Th
                  textTransform="uppercase"
                  letterSpacing="wider"
                  color="gray.600"
                  fontSize="xs"
                  isNumeric
                >
                  Unused
                </Th>
                <Th
                  textTransform="uppercase"
                  letterSpacing="wider"
                  color="gray.600"
                  fontSize="xs"
                  isNumeric
                >
                  Total
                </Th>
                <Th
                  textTransform="uppercase"
                  letterSpacing="wider"
                  color="gray.600"
                  fontSize="xs"
                  textAlign="center"
                >
                  Action
                </Th>
              </Tr>
            </Thead>
            <Tbody>
              {isLoading ? (
                <Tr>
                  <Td colSpan={6} textAlign="center" py={10}>
                    <Spinner size="xl" color="blue.500" thickness="4px" />
                    <Text mt={2} color="gray.500">
                      Loading Invoices...
                    </Text>
                  </Td>
                </Tr>
              ) : getCurrentPageItems().length === 0 ? (
                <Tr>
                  <Td colSpan={6} textAlign="center" py={10} color="gray.500">
                    {searchTerm
                      ? `No invoices found matching "${searchTerm}".`
                      : "No service invoices added yet."}
                  </Td>
                </Tr>
              ) : (
                getCurrentPageItems().map((invoice) => (
                  <Tr
                    key={invoice._id}
                    _hover={{ bg: "blue.50" }}
                    transition="background-color 0.2s"
                  >
                    <Td fontWeight="medium" color="gray.800">
                      {invoice.stub}
                    </Td>
                    <Td>
                      <Button
                        onClick={() => handleViewInvoices(invoice.stub)}
                        leftIcon={<ViewIcon />}
                        colorScheme="blue"
                        variant="outline"
                        size="sm"
                      >
                        {(() => {
                          const stubInvoices = invoice.invoices || [];
                          if (stubInvoices.length === 0) return "No Invoices";

                          const numbers = stubInvoices.map(inv => getNumberPart(inv.invoiceNumber));
                          const min = Math.min(...numbers);
                          const max = Math.max(...numbers);

                          return `Invoice: ${min} - ${max}`;
                        })()}
                      </Button>
                    </Td>
                    <Td
                      isNumeric
                      color={invoice.totalUsed > 0 ? "green.600" : "gray.600"}
                    >
                      {invoice.totalUsed ?? 0}
                    </Td>
                    <Td
                      isNumeric
                      color={
                        invoice.totalUnused > 0 ? "orange.600" : "gray.600"
                      }
                    >
                      {invoice.totalUnused ?? 0}
                    </Td>
                    <Td isNumeric fontWeight="medium">
                      {invoice.totalInvoices ?? 0}
                    </Td>
                    <Td textAlign="center">
                      <IconButton
                        icon={<DeleteIcon />}
                        colorScheme="red"
                        bg="transparent"
                        color="#800000"
                        variant="ghost"
                        size="sm"
                        aria-label="Delete invoice batch"
                        _hover={{ bg: "red.50", color: "#600000" }}
                        onClick={() => {
                          setDeleteStub(invoice.stub);
                          deleteStubAlertDisclosure.onOpen();
                        }}
                        isDisabled={!hasDeleteAccess}
                      />
                    </Td>
                  </Tr>
                ))
              )}
            </Tbody>
          </Table>
        </TableContainer>

        {/* Pagination */}
        {filteredInvoices.length > itemsPerPage && (
          <Flex
            justify="center"
            p={4}
            align="center"
            borderTopWidth="1px"
            borderColor="gray.200"
          >
            <Button
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              isDisabled={currentPage === 1}
              mr={2}
              variant="outline"
              colorScheme="blue"
            >
              Previous
            </Button>
            <Text mx={4} fontSize="sm" color="gray.600">
              Page {currentPage} of{" "}
              {Math.ceil(filteredInvoices.length / itemsPerPage)}
            </Text>
            <Button
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              isDisabled={
                currentPage ===
                Math.ceil(filteredInvoices.length / itemsPerPage)
              }
              ml={2}
              variant="outline"
              colorScheme="blue"
            >
              Next
            </Button>
          </Flex>
        )}
      </Box>

      {/* View Service Invoice Numbers Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={onViewModalClose}
        size="4xl"
        isCentered
        scrollBehavior="inside"
      >
        <ModalOverlay bg="blackAlpha.600" />
        <ModalContent borderRadius="lg" boxShadow="xl" mx={4}>
          <ModalHeader
            bg="gray.100"
            borderTopRadius="lg"
            fontWeight="bold"
            color="gray.700"
            fontSize="lg"
            py={3}
          >
            Service Invoice Numbers for Stub: {selectedStubForView}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody py={5} px={6}>
            <TableContainer maxHeight="60vh" overflowY="auto">
              <Table variant="simple" size="sm">
                <Thead
                  position="sticky"
                  top={0}
                  bg="white"
                  zIndex={1}
                  boxShadow="sm"
                >
                  <Tr>
                    <Th width="30%">Service Invoice Number</Th>
                    <Th width="45%">Customer Name</Th>
                    <Th width="25%">Status</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {selectedStubInvoices.map((invoice) => (
                    <Tr key={invoice._id} _hover={{ bg: "gray.50" }}>
                      <Td fontWeight="medium">{invoice.invoiceNumber}</Td>
                      <Td color="gray.600">
                        {invoice.status === "USED" ? (
                          invoice.customerName || (
                            <Text as="i" color="gray.400">
                              No name
                            </Text>
                          )
                        ) : (
                          <Text as="i" color="gray.400">
                            Not used
                          </Text>
                        )}
                      </Td>
                      <Td>
                        <Select
                          value={invoice.status}
                          onChange={(e) =>
                            handleStatusUpdate(invoice._id, e.target.value)
                          }
                          size="sm"
                          variant="outline"
                          borderColor="gray.300"
                          width="120px"
                          isDisabled={!modalHasEditAccess || invoice.status === "USED"}
                          focusBorderColor="blue.500"
                          borderRadius="md"
                        >
                          <option value="UNUSED">UNUSED</option>
                          <option value="USED">USED</option>
                        </Select>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </TableContainer>
          </ModalBody>
          <ModalFooter borderTopWidth="1px" borderColor="gray.200" py={3}>
            <Button
              colorScheme="purple"
              size="sm"
              leftIcon={<LockIcon />}
              onClick={handleModalRequestEdit}
              isDisabled={modalHasEditAccess}
              mr={3}
            >
              {modalHasEditAccess ? 'Edit Enabled' : 'Request Edit'}
            </Button>
            <Button
              variant="ghost"
              colorScheme="blue"
              onClick={onViewModalClose}
            >
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Add Service Invoice Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={onAddModalClose}
        size="xl"
        isCentered
      >
        <ModalOverlay bg="blackAlpha.600" />
        <ModalContent borderRadius="lg" boxShadow="xl" mx={4}>
          <ModalHeader
            bg="blue.600"
            color="white"
            borderTopRadius="lg"
            fontWeight="bold"
            fontSize="lg"
            py={3}
          >
            Add New Service Invoice Batch
          </ModalHeader>
          <ModalCloseButton color="white" _hover={{ bg: "#600000" }} />
          <ModalBody py={5} px={6}>
            {/* Reference Info Box */}
            <Box
              borderWidth="1px"
              borderColor="gray.200"
              borderRadius="md"
              p={4}
              mb={6}
              bg="gray.50"
            >
              <Heading
                as="h4"
                size="sm"
                mb={3}
                fontWeight="semibold"
                color="blue.800"
              >
                Reference Information
              </Heading>
              {isRefLoading ? (
                <Flex justify="center" align="center" height="50px">
                  <Spinner size="md" color="blue.500" />
                </Flex>
              ) : (
                <Flex justify="space-between" wrap="wrap" gap={2}>
                  <Box textAlign="center" flex={1} minW="120px">
                    <Text
                      fontSize="xs"
                      color="gray.500"
                      textTransform="uppercase"
                    >
                      Prev Stub
                    </Text>
                    <Text fontSize="lg" fontWeight="bold" color="blue.600">
                      {referenceInfo.previousStub ?? "--"}
                    </Text>
                  </Box>
                  <Box textAlign="center" flex={1} minW="120px">
                    <Text
                      fontSize="xs"
                      color="gray.500"
                      textTransform="uppercase"
                    >
                      Prev Invoice #
                    </Text>
                    <Text fontSize="lg" fontWeight="bold" color="blue.600">
                      {referenceInfo.previousInvoice ?? "--"}
                    </Text>
                  </Box>
                  <Box textAlign="center" flex={1} minW="120px">
                    <Text
                      fontSize="xs"
                      color="gray.500"
                      textTransform="uppercase"
                    >
                      Next Invoice #
                    </Text>
                    <Text fontSize="lg" fontWeight="bold" color="green.600">
                      {referenceInfo.nextInvoice ?? "--"}
                    </Text>
                  </Box>
                </Flex>
              )}
            </Box>

            {/* Form */}
            <VStack
              spacing={4}
              as="form"
              onSubmit={handleSubmit}
              id="add-invoice-form"
            >
              <FormControl isRequired>
                <FormLabel fontWeight="medium" fontSize="sm">
                  Stub Number
                </FormLabel>
                <Input
                  placeholder="e.g., 101"
                  value={formData.stub}
                  onChange={(e) =>
                    setFormData({ ...formData, stub: e.target.value })
                  }
                  size="md"
                  type="number"
                  min="1"
                  borderRadius="md"
                  focusBorderColor="blue.500"
                />
              </FormControl>
              <HStack width="100%" spacing={4}>
                <FormControl isRequired flex={1}>
                  <FormLabel fontWeight="medium" fontSize="sm">
                    Range Start
                  </FormLabel>
                  <Input
                    placeholder="e.g., 1001"
                    type="number"
                    value={formData.rangeStart}
                    onChange={(e) =>
                      setFormData({ ...formData, rangeStart: e.target.value })
                    }
                    size="md"
                    min="1"
                    borderRadius="md"
                    focusBorderColor="blue.500"
                  />
                </FormControl>
                <FormControl isRequired flex={1}>
                  <FormLabel fontWeight="medium" fontSize="sm">
                    Range End
                  </FormLabel>
                  <Input
                    placeholder="e.g., 1050"
                    type="number"
                    value={formData.rangeEnd}
                    onChange={(e) =>
                      setFormData({ ...formData, rangeEnd: e.target.value })
                    }
                    size="md"
                    min={formData.rangeStart || 1}
                    borderRadius="md"
                    focusBorderColor="blue.500"
                  />
                </FormControl>
              </HStack>
            </VStack>
          </ModalBody>
          <ModalFooter borderTopWidth="1px" borderColor="gray.200" py={3}>
            <Button
              variant="ghost"
              onClick={onAddModalClose}
              mr={3}
              isDisabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              colorScheme="blue"
              type="submit"
              form="add-invoice-form"
              isLoading={isLoading}
              loadingText="Saving..."
              fontWeight="medium"
              boxShadow="sm"
              _hover={{ bg: "blue.600" }}
              px={6}
            >
              Save Batch
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        isOpen={deleteStubAlertDisclosure.isOpen}
        leastDestructiveRef={cancelRef}
        onClose={deleteStubAlertDisclosure.onClose}
        isCentered
      >
        <AlertDialogOverlay bg="blackAlpha.600" />
        <AlertDialogContent borderRadius="lg" boxShadow="xl" mx={4}>
          <AlertDialogHeader
            bg="#800000"
            color="white"
            borderTopRadius="lg"
            fontWeight="bold"
            fontSize="lg"
            py={3}
          >
            Confirm Deletion
          </AlertDialogHeader>
          <AlertDialogCloseButton
            color="white"
            _hover={{ bg: "#600000" }}
            isDisabled={isDeletingStub}
          />
          <AlertDialogBody py={6} px={6}>
            <Text>
              Are you sure you want to delete all service invoices with stub{" "}
              <Text as="span" fontWeight="bold">
                {deleteStub}
              </Text>
              ?
            </Text>
            <Text mt={2} fontWeight="bold" color="#800000">
              This action cannot be undone, but the data will be logged.
            </Text>
          </AlertDialogBody>
          <AlertDialogFooter borderTopWidth="1px" borderColor="gray.200" py={3}>
            <Button
              ref={cancelRef}
              variant="ghost"
              onClick={deleteStubAlertDisclosure.onClose}
              mr={3}
              isDisabled={isDeletingStub}
            >
              Cancel
            </Button>
            <Button
              bg="#800000"
              color="white"
              _hover={{ bg: "#600000" }}
              onClick={handleDelete}
              isLoading={isDeletingStub}
              loadingText="Deleting..."
              fontWeight="medium"
            >
              Delete Batch
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Request Access Modal */}
      <Modal isOpen={isRequestModalOpen} onClose={() => !isSubmittingRequest && setIsRequestModalOpen(false)} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Request Access</ModalHeader>
          {!isSubmittingRequest && <ModalCloseButton />}
          <ModalBody position="relative">
            {isSubmittingRequest && (
              <Box position="absolute" top={0} left={0} w="100%" h="100%" bg="whiteAlpha.700" zIndex={10} display="flex" alignItems="center" justifyContent="center">
                <Spinner size="xl" color="purple.500" thickness="4px" speed="0.7s" label="Submitting..." />
              </Box>
            )}
            <VStack spacing={4} align="stretch" opacity={isSubmittingRequest ? 0.5 : 1} pointerEvents={isSubmittingRequest ? "none" : "auto"}>
              {isSubmittingRequest && (
                <Alert status="info" borderRadius="md">
                  <AlertIcon />
                  Submitting your request...
                </Alert>
              )}
              {requestType && requestRemarks && !isSubmittingRequest && (
                <Alert status="info" borderRadius="md">
                  <AlertIcon />
                  <Box>
                    <b>Summary:</b> You are requesting <b>{requestType}</b> access.<br />
                    <b>Remarks:</b> {requestRemarks}
                  </Box>
                </Alert>
              )}
              <FormControl isRequired>
                <FormLabel>Request Type</FormLabel>
                {modalRequestingEdit ? (
                  <Input value="Edit Access" isDisabled readOnly />
                ) : mainRequestingDelete ? (
                  <Input value="Delete Access" isDisabled readOnly />
                ) : (
                  <Select
                    value={requestType}
                    onChange={(e) => setRequestType(e.target.value)}
                    placeholder="Select request type"
                    isDisabled={isSubmittingRequest}
                  >
                    <option value="Edit" disabled={pendingEditRequest}>Edit Access</option>
                    <option value="Delete" disabled={pendingDeleteRequest}>Delete Access</option>
                  </Select>
                )}
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Remarks</FormLabel>
                <Textarea
                  value={requestRemarks}
                  onChange={(e) => setRequestRemarks(e.target.value)}
                  placeholder="Enter reason for access request"
                  resize="vertical"
                  minH="80px"
                  isDisabled={isSubmittingRequest}
                />
              </FormControl>
              {isSubmittingRequest && (
                <Progress size="xs" isIndeterminate colorScheme="purple" borderRadius="md" />
              )}
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="ghost"
              mr={3}
              onClick={() => setIsRequestModalOpen(false)}
              isDisabled={isSubmittingRequest}
            >
              Cancel
            </Button>
            <Button
              colorScheme="purple"
              onClick={handleRequestAccess}
              isLoading={isSubmittingRequest}
              isDisabled={!requestType || !requestRemarks || isSubmittingRequest}
            >
              Submit Request
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Edit Stub Modal */}
      <Modal isOpen={isEditStubModalOpen} onClose={() => {
        setIsEditStubModalOpen(false);
        setStubValidationError("");
      }} size="md">
        <ModalOverlay />
        <ModalContent borderRadius="xl">
          <ModalHeader fontSize="xl" fontWeight="bold">
            Edit Stub Number
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody py={6}>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel fontWeight="medium">Current Stub</FormLabel>
                <Select
                  placeholder="Select current stub"
                  value={selectedStubForView}
                  onChange={(e) => setSelectedStubForView(e.target.value)}
                  size="lg"
                >
                  {serviceInvoices.map((invoice) => (
                    <option key={invoice.stub} value={invoice.stub}>
                      {invoice.stub} ({invoice.totalInvoices} invoices)
                    </option>
                  ))}
                </Select>
              </FormControl>

              <FormControl isRequired isInvalid={!!stubValidationError}>
                <FormLabel fontWeight="medium">New Stub</FormLabel>
                <Input
                  placeholder="Enter new stub number"
                  value={newStubNumber}
                  onChange={handleNewStubChange}
                  size="lg"
                />
                {stubValidationError && (
                  <FormErrorMessage>{stubValidationError}</FormErrorMessage>
                )}
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="ghost"
              mr={3}
              onClick={() => {
                setIsEditStubModalOpen(false);
                setStubValidationError("");
              }}
              isDisabled={isUpdatingStub}
            >
              Cancel
            </Button>
            <Button
              colorScheme="blue"
              onClick={handleUpdateStub}
              isLoading={isUpdatingStub || isCheckingStub}
              isDisabled={!selectedStubForView || !newStubNumber || newStubNumber === selectedStubForView || !!stubValidationError}
            >
              Update Stub
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default ServiceInvoiceComponent;
