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
  VStack,
  HStack,
  useToast,
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
  Select,
  useDisclosure,
  NumberInput,
  NumberInputField,
  Text,
  Badge,
  Flex,
  Heading,
  InputGroup,
  InputLeftElement,
  Tag,
  Divider,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Stack,
  useColorModeValue,
  Tooltip,
  Grid,
  GridItem,
  Stat,
  StatLabel,
  StatNumber,
  StatGroup,
  StatHelpText,
  Card,
  CardBody,
  Icon,
  Progress,
  SimpleGrid,
  Circle,
  Center,
  InputRightElement,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  Spinner,
  Alert,
  AlertIcon,
  Textarea
} from "@chakra-ui/react";
import {
  AddIcon,
  EditIcon,
  DeleteIcon,
  SearchIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CheckIcon,
  CloseIcon,
  RepeatIcon,
  WarningIcon,
  LockIcon,
  InfoIcon
} from "@chakra-ui/icons";
import {
  FiActivity,
  FiPackage,
  FiClock,
  FiCheck,
  FiX,
  FiAlertCircle,
  FiTruck,
} from "react-icons/fi";
import axios from "axios";

// Step Component for Wizard Steps
const Step = ({ stepNumber, title, isActive, isCompleted }) => {
  let bgColor = "gray.100";
  let textColor = "gray.500";
  let borderColor = "gray.200";

  if (isActive) {
    bgColor = "blue.500";
    textColor = "white";
    borderColor = "blue.500";
  } else if (isCompleted) {
    bgColor = "#550000";
    textColor = "white";
    borderColor = "#550000";
  }

  return (
    <Flex direction="column" align="center" flex={1}>
      <Circle
        size="40px"
        bg={bgColor}
        color={textColor}
        border="2px solid"
        borderColor={borderColor}
        mb={2}
      >
        {isCompleted ? <CheckIcon /> : stepNumber}
      </Circle>
      <Text
        fontWeight={isActive ? "bold" : "medium"}
        color={isActive ? "#550000" : "gray.600"}
      >
        {title}
      </Text>
    </Flex>
  );
};

const MaterialRequest = () => {
  const [items, setItems] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [materialRequests, setMaterialRequests] = useState([]);
  const [trucks, setTrucks] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [warehouseFilter, setWarehouseFilter] = useState("");
  const [materialRequestForm, setMaterialRequestForm] = useState({
    itemID: "",
    warehouseID: "",
    quantity: "",
    cost: "",
    requestedBy: "",
    plateNumber: "",
    type: "StockIn",
    sourceWarehouseID: "",
    expenseCategory: "Operating Expenses", // Add default value
  });
  const [materialRequestFilteredItems, setMaterialRequestFilteredItems] =
    useState([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedMaterialRequest, setSelectedMaterialRequest] = useState({});
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();
  const [wizardStep, setWizardStep] = useState(1);
  const cancelRef = useRef();
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [requestToDelete, setRequestToDelete] = useState(null);
  const {
    isOpen: isDeleteOpen,
    onOpen: onDeleteOpen,
    onClose: onDeleteClose,
  } = useDisclosure();

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Access control states
  const [hasAccess, setHasAccess] = useState(false);
  const [accessRequest, setAccessRequest] = useState(null);
  const [hasEditAccess, setHasEditAccess] = useState(false);
  const [hasDeleteAccess, setHasDeleteAccess] = useState(false);
  const [pendingEditRequest, setPendingEditRequest] = useState(false);
  const [pendingDeleteRequest, setPendingDeleteRequest] = useState(false);
  const [timer, setTimer] = useState(0);
  const timerIntervalRef = useRef(null);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [requestType, setRequestType] = useState("");
  const [requestRemarks, setRequestRemarks] = useState("");
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    fetchMaterialRequests();
    fetchItems();
    fetchWarehouses();
    fetchTrucks();
  }, []);

  useEffect(() => {
    if (materialRequestForm.sourceWarehouseID) {
      const itemsInSourceWarehouse = items.filter(
        (item) =>
          item.warehouseID?._id === materialRequestForm.sourceWarehouseID ||
          item.warehouseID === materialRequestForm.sourceWarehouseID
      );
      setMaterialRequestFilteredItems(itemsInSourceWarehouse);
    } else {
      setMaterialRequestFilteredItems([]);
    }
  }, [materialRequestForm.sourceWarehouseID, items]);

  // Reset wizard step when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setWizardStep(1);
    }
  }, [isOpen]);

  // Effect to update pagination calculations when filters change
  useEffect(() => {
    const filteredRequests = materialRequests.filter(
      (request) =>
        (request.itemID?.itemName
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
          request.requestID
            ?.toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          request.requestedBy
            ?.toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          request.plateNumber
            ?.toLowerCase()
            .includes(searchQuery.toLowerCase())) &&
        (!warehouseFilter ||
          request.warehouseID?._id === warehouseFilter ||
          request.sourceWarehouseID?._id === warehouseFilter)
    );

    setTotalItems(filteredRequests.length);
    const calculatedTotalPages = Math.ceil(
      filteredRequests.length / itemsPerPage
    );
    setTotalPages(calculatedTotalPages > 0 ? calculatedTotalPages : 1);

    // Reset to page 1 if current page is now invalid
    if (currentPage > calculatedTotalPages && calculatedTotalPages > 0) {
      setCurrentPage(1);
    }
  }, [
    materialRequests,
    searchQuery,
    warehouseFilter,
    itemsPerPage,
    currentPage,
  ]);

  // Function to get material requests for the current page
  const getCurrentPageRequests = () => {
    const filteredRequests = materialRequests.filter(
      (request) =>
        (request.itemID?.itemName
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
          request.requestID
            ?.toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          request.requestedBy
            ?.toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          request.plateNumber
            ?.toLowerCase()
            .includes(searchQuery.toLowerCase())) &&
        (!warehouseFilter ||
          request.warehouseID?._id === warehouseFilter ||
          request.sourceWarehouseID?._id === warehouseFilter)
    );

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    return filteredRequests.slice(indexOfFirstItem, indexOfLastItem);
  };

  // Handle page change
  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  const fetchMaterialRequests = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast({
          title: "Error",
          description: "Authentication failed. Please log in.",
          status: "error",
          duration: 3000,
        });
        return;
      }

      const response = await axios.get(
        process.env.NEXT_PUBLIC_BACKEND_API + "/api/material-requests",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setMaterialRequests(response.data);
    } catch (error) {
      console.error("Error fetching material requests:", error);
      if (error.response?.status === 401) {
        toast({
          title: "Session Expired",
          description: "Please log in again.",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch material requests",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      }
    }
  };

  const fetchItems = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast({
          title: "Error",
          description: "Authentication failed. Please log in.",
          status: "error",
          duration: 3000,
        });
        return;
      }

      const response = await axios.get(
        process.env.NEXT_PUBLIC_BACKEND_API + "/api/items",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setItems(response.data);
    } catch (error) {
      console.error("Error fetching items:", error);
      if (error.response?.status === 401) {
        toast({
          title: "Session Expired",
          description: "Please log in again.",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      }
    }
  };

  const fetchWarehouses = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast({
          title: "Error",
          description: "Authentication failed. Please log in.",
          status: "error",
          duration: 3000,
        });
        return;
      }

      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/warehouses`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setWarehouses(response.data.warehouses || []);
    } catch (error) {
      console.error("Error fetching warehouses:", error);
      if (error.response?.status === 401) {
        toast({
          title: "Session Expired",
          description: "Please log in again.",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch warehouses",
          status: "error",
          duration: 3000,
          isClosable: true,
          position: "top-right"
        });
      }
      setWarehouses([]);
    }
  };

  const fetchTrucks = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast({
          title: "Error",
          description: "Authentication failed. Please log in.",
          status: "error",
          duration: 3000,
        });
        return;
      }

      const response = await axios.get(
        process.env.NEXT_PUBLIC_BACKEND_API + "/api/trucks",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setTrucks(response.data);
    } catch (error) {
      console.error("Error fetching trucks:", error);
      if (error.response?.status === 401) {
        toast({
          title: "Session Expired",
          description: "Please log in again.",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      }
    }
  };

  const handleMaterialRequestSubmit = async (e) => {
    e.preventDefault();
    setIsAdding(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast({
          title: "Error",
          description: "Authentication failed. Please log in.",
          status: "error",
          duration: 3000,
        });
        return;
      }

      // Validation
      if (!materialRequestForm.warehouseID) {
        throw new Error(
          `Please select a ${materialRequestForm.type === "StockIn" ? "destination" : "source"} warehouse`
        );
      }

      if (!materialRequestForm.itemID) {
        throw new Error("Please select an item");
      }

      if (!materialRequestForm.quantity || materialRequestForm.quantity <= 0) {
        throw new Error("Quantity must be a positive number");
      }

      if (!materialRequestForm.cost || materialRequestForm.cost <= 0) {
        throw new Error("Cost must be a positive number");
      }

      if (!materialRequestForm.requestedBy) {
        throw new Error("Please enter requester name");
      }

      // For StockIn, we need sourceWarehouseID
      if (
        materialRequestForm.type === "StockIn" &&
        !materialRequestForm.sourceWarehouseID
      ) {
        throw new Error("Please select a source warehouse");
      }

      // For StockOut, we need warehouseID
      if (
        materialRequestForm.type === "StockOut" &&
        !materialRequestForm.warehouseID
      ) {
        throw new Error("Please select a destination warehouse");
      }

      const payload = {
        ...materialRequestForm,
        orderDate: new Date(),
      };

      const response = await axios.post(
        process.env.NEXT_PUBLIC_BACKEND_API + "/api/material-requests",
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      await fetchMaterialRequests();
      resetForm();
      handleModalClose();

      toast({
        title: "Success",
        description: "Material request added successfully",
        status: "success",
        duration: 3000,
        isClosable: true,
        position: "top-right",
      });
    } catch (error) {
      console.error("Error details:", error.response?.data || error.message);
      if (error.response?.status === 401) {
        toast({
          title: "Session Expired",
          description: "Please log in again.",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      } else {
        toast({
          title: "Error",
          description:
            error.response?.data?.message ||
            error.message ||
            "Failed to add material request",
          status: "error",
          duration: 3000,
          isClosable: true,
          position: "top-right",
        });
      }
    } finally {
      setIsAdding(false);
    }
  };

  const handleEditClick = (request) => {
    setSelectedMaterialRequest({
      ...request,
      itemID: request.itemID?._id || request.itemID,
      warehouseID: request.warehouseID?._id || request.warehouseID,
      sourceWarehouseID:
        request.sourceWarehouseID?._id || request.sourceWarehouseID,
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async () => {
    setIsEditing(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast({
          title: "Error",
          description: "Authentication failed. Please log in.",
          status: "error",
          duration: 3000,
        });
        return;
      }

      if (!selectedMaterialRequest?._id) {
        throw new Error("No material request selected");
      }

      // Validation
      if (!selectedMaterialRequest.requestedBy) {
        throw new Error("Please enter requester name");
      }

      if (!selectedMaterialRequest.expenseCategory) {
        throw new Error("Please select an expense category");
      }

      const response = await axios.put(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/material-requests/${selectedMaterialRequest._id}`,
        selectedMaterialRequest,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setMaterialRequests((prev) =>
        prev.map((req) =>
          req._id === selectedMaterialRequest._id ? response.data : req
        )
      );

      setIsEditModalOpen(false);
      setSelectedMaterialRequest({});

      toast({
        title: "Success",
        description: "Material request updated successfully",
        status: "success",
        duration: 3000,
        isClosable: true,
        position: "top-right",
      });
    } catch (error) {
      console.error("Error updating material request:", error);
      if (error.response?.status === 401) {
        toast({
          title: "Session Expired",
          description: "Please log in again.",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      } else {
        toast({
          title: "Error",
          description:
            error.response?.data?.message ||
            error.message ||
            "Failed to update material request",
          status: "error",
          duration: 3000,
          isClosable: true,
          position: "top-right",
        });
      }
    } finally {
      setIsEditing(false);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast({
          title: "Error",
          description: "Authentication failed. Please log in.",
          status: "error",
          duration: 3000,
        });
        return;
      }

      const response = await axios.patch(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/material-requests/${id}/status`,
        { status: newStatus },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data) {
        toast({
          title: `Status changed to ${newStatus}`,
          status: "success",
          duration: 3000,
          isClosable: true,
        });

        // Refresh the lists
        fetchMaterialRequests();
        fetchItems();
      }
    } catch (error) {
      console.error("Error updating status:", error);
      if (error.response?.status === 401) {
        toast({
          title: "Session Expired",
          description: "Please log in again.",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      } else {
        toast({
          title: "Error updating status",
          description: "Failed to update the status. Please try again.",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      }
    }
  };

  const handleDeleteClick = (request) => {
    setRequestToDelete(request);
    onDeleteOpen();
  };

  const handleDeleteConfirm = async () => {
    if (!requestToDelete) return;
    setIsDeleting(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast({
          title: "Error",
          description: "Authentication failed. Please log in.",
          status: "error",
          duration: 3000,
        });
        return;
      }

      const response = await axios.delete(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/material-requests/${requestToDelete._id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      toast({
        title: "Success",
        description:
          response.data.message || "Material request deleted successfully",
        status: "success",
        duration: 3000,
        isClosable: true,
        position: "top-right",
      });

      // Refresh the material requests list
      setMaterialRequests((prev) =>
        prev.filter((req) => req._id !== requestToDelete._id)
      );
      onDeleteClose();
      setRequestToDelete(null);
    } catch (error) {
      console.error("Error deleting material request:", error);
      if (error.response?.status === 401) {
        toast({
          title: "Session Expired",
          description: "Please log in again.",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      } else {
        const errorMessage =
          error.response?.data?.message || "Failed to delete material request";
        toast({
          title: "Error",
          description: errorMessage,
          status: "error",
          duration: 3000,
          isClosable: true,
          position: "top-right",
        });
      }
    } finally {
      setIsDeleting(false);
    }
  };

  // Calculate summary statistics
  const totalRequests = materialRequests.length;
  const pendingRequests = materialRequests.filter(
    (req) => req.status === "Pending"
  ).length;
  const approvedRequests = materialRequests.filter(
    (req) => req.status === "Approved"
  ).length;
  const rejectedRequests = materialRequests.filter(
    (req) => req.status === "Rejected"
  ).length;

  const totalCost = materialRequests.reduce((sum, req) => {
    return sum + (req.quantity * req.cost || 0);
  }, 0);

  const recentRequests = [...materialRequests]
    .sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime))
    .slice(0, 5);

  const formatNumber = (num) => {
    return num ? num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") : "0";
  };

  // Function to reset the form
  const resetForm = () => {
    setMaterialRequestForm({
      itemID: "",
      warehouseID: "",
      quantity: "",
      cost: "",
      requestedBy: "",
      plateNumber: "",
      type: "StockIn",
      sourceWarehouseID: "",
      expenseCategory: "Operating Expenses", // Add default value
    });
    setSearchQuery("");
    setWizardStep(1);
  };

  // Handle modal close
  const handleModalClose = () => {
    resetForm();
    onClose();
  };

  // Helper to format seconds as hh:mm:ss
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

  // Check access status and pending requests
  const checkAccessStatus = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast({
          title: "Error",
          description: "Authentication failed. Please log in.",
          status: "error",
          duration: 3000,
        });
        return;
      }

      // Get the latest request for material-requests reference
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/control-panel/reference/material-requests`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Get the latest approved request
      const latestRequest = response.data[0];
      
      if (latestRequest && latestRequest.Status === "Approved") {
        const hasAccess = latestRequest.ExpiresAt ? new Date(latestRequest.ExpiresAt) > new Date() : true;
        const hasEditAccess = latestRequest.RequestType === "Edit" || latestRequest.RequestType === "Full";
        const hasDeleteAccess = latestRequest.RequestType === "Delete" || latestRequest.RequestType === "Full";
        
        setHasAccess(hasAccess);
        setAccessRequest(latestRequest);
        setHasEditAccess(hasEditAccess);
        setHasDeleteAccess(hasDeleteAccess);

        // Check for pending requests
        if (latestRequest) {
          setPendingEditRequest(latestRequest.RequestType === "Edit" && latestRequest.Status === "Pending");
          setPendingDeleteRequest(latestRequest.RequestType === "Delete" && latestRequest.Status === "Pending");
        }

        // Start timer if access is granted
        if (hasAccess) {
          startTimer();
        }
      } else {
        setHasAccess(false);
        setAccessRequest(null);
        setHasEditAccess(false);
        setHasDeleteAccess(false);
      }
    } catch (error) {
      console.error("Error checking access status:", error);
      if (error.response?.status === 401) {
        toast({
          title: "Session Expired",
          description: "Please log in again.",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      }
    }
  };

  useEffect(() => {
    checkAccessStatus();
  }, []);

  // Timer effect
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

  // Handler for opening the request modal with duplicate check
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

  const handleRequestAccess = async () => {
    if (isSubmittingRequest) return;
    setIsSubmittingRequest(true);
    setSubmitSuccess(false);
    try {
      const requestData = {
        RequestID: `REQ_${Date.now()}`,
        Module: "Material Requests",
        UserRole: localStorage.getItem('userRole') || 'Inventory Officer',
        Username: localStorage.getItem('username') || 'Unknown',
        RequestType: requestType,
        Remarks: requestRemarks,
        ReferenceID: "material-requests"
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
      setSubmitSuccess(false);
      toast({
        title: "Request Submitted",
        description: "Your access request has been submitted successfully",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      checkAccessStatus();
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

  // Add startTimer function
  const startTimer = () => {
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
    }
  };

  // Add cleanup for timer
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, []);

  // Add timer display component
  const TimerDisplay = () => {
    if (!timer) return null;
    
    const hours = Math.floor(timer / 3600);
    const minutes = Math.floor((timer % 3600) / 60);
    const seconds = timer % 60;
    
    return (
      <Badge colorScheme="green" fontSize="sm" p={2} borderRadius="md">
        Access expires in: {hours.toString().padStart(2, '0')}:{minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
      </Badge>
    );
  };

  return (
    <Box p={6}>
      <VStack spacing={6} align="stretch">
        <Flex justify="space-between" align="center" mb={2}>
          <Text
            fontSize="2xl"
            fontWeight="bold"
            color="#550000"
            fontFamily="Helvetica"
          >
            Material Request Management
          </Text>
          <HStack spacing={4}>
            <TimerDisplay />
            {!hasAccess && (
              <Button
                leftIcon={<AddIcon />}
                bg="#550000"
                color="white"
                _hover={{ bg: "#770000" }}
                onClick={handleOpenRequestModal}
                size="md"
                px={6}
              >
                Request Access
              </Button>
            )}
            {hasAccess && (
              <Button
                leftIcon={<AddIcon />}
                bg="#550000"
                color="white"
                _hover={{ bg: "#770000" }}
                onClick={onOpen}
                size="md"
                px={6}
              >
                Add Material Request
              </Button>
            )}
          </HStack>
        </Flex>

        {/* Summary Statistics */}
        <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4} mb={6}>
          <Card shadow="md" border="1px solid" borderColor="gray.200">
            <CardBody p={4}>
              <Flex justify="space-between">
                <Stat>
                  <StatLabel color="gray.500" fontFamily="Helvetica">
                    Total Requests
                  </StatLabel>
                  <StatNumber fontSize="3xl" fontFamily="Helvetica">
                    {totalRequests}
                  </StatNumber>
                </Stat>
                <Center>
                  <Circle size="50px" bg="#550000" color="white">
                    <Icon as={FiPackage} boxSize={6} />
                  </Circle>
                </Center>
              </Flex>
            </CardBody>
          </Card>

          <Card shadow="md" border="1px solid" borderColor="gray.200">
            <CardBody p={4}>
              <Flex justify="space-between">
                <Stat>
                  <StatLabel color="gray.500" fontFamily="Helvetica">
                    Pending
                  </StatLabel>
                  <StatNumber fontSize="3xl" fontFamily="Helvetica">
                    {pendingRequests}
                  </StatNumber>
                  <StatHelpText>
                    {((pendingRequests / totalRequests) * 100 || 0).toFixed(0)}%
                    of total
                  </StatHelpText>
                </Stat>
                <Center>
                  <Circle size="50px" bg="orange.400" color="white">
                    <Icon as={FiClock} boxSize={6} />
                  </Circle>
                </Center>
              </Flex>
              <Progress
                value={(pendingRequests / totalRequests) * 100 || 0}
                colorScheme="orange"
                size="sm"
                mt={2}
              />
            </CardBody>
          </Card>

          <Card shadow="md" border="1px solid" borderColor="gray.200">
            <CardBody p={4}>
              <Flex justify="space-between">
                <Stat>
                  <StatLabel color="gray.500" fontFamily="Helvetica">
                    Completed
                  </StatLabel>
                  <StatNumber fontSize="3xl" fontFamily="Helvetica">
                    {approvedRequests}
                  </StatNumber>
                  <StatHelpText>
                    {((approvedRequests / totalRequests) * 100 || 0).toFixed(0)}
                    % of total
                  </StatHelpText>
                </Stat>
                <Center>
                  <Circle size="50px" bg="green.500" color="white">
                    <Icon as={FiCheck} boxSize={6} />
                  </Circle>
                </Center>
              </Flex>
              <Progress
                value={(approvedRequests / totalRequests) * 100 || 0}
                colorScheme="green"
                size="sm"
                mt={2}
              />
            </CardBody>
          </Card>

          <Card shadow="md" border="1px solid" borderColor="gray.200">
            <CardBody p={4}>
              <Flex justify="space-between">
                <Stat>
                  <StatLabel color="gray.500" fontFamily="Helvetica">
                    Total Value
                  </StatLabel>
                  <StatNumber fontSize="3xl" fontFamily="Helvetica">
                    ₱{formatNumber(totalCost.toFixed(2))}
                  </StatNumber>
                </Stat>
                <Center>
                  <Circle size="50px" bg="blue.500" color="white">
                    <Text fontSize="xl" fontWeight="bold">
                      ₱
                    </Text>
                  </Circle>
                </Center>
              </Flex>
            </CardBody>
          </Card>
        </SimpleGrid>

        {/* Status Distribution */}
        <Grid templateColumns="1fr" gap={6}>
          <GridItem>
            {/* Search and Filter */}
            <Flex
              bg="white"
              p={4}
              borderRadius="md"
              shadow="sm"
              mb={4}
              border="1px solid"
              borderColor="gray.200"
              wrap="wrap"
              gap={4}
              align="center"
            >
              <InputGroup maxW={{ base: "100%", md: "320px" }}>
                <InputLeftElement pointerEvents="none">
                  <SearchIcon color="gray.400" />
                </InputLeftElement>
                <Input
                  placeholder="Search by request ID or item name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  borderRadius="md"
                  focusBorderColor="#550000"
                />
              </InputGroup>
              <Button
                leftIcon={<AddIcon />}
                bg="#550000"
                color="white"
                _hover={{ bg: "#770000" }}
                onClick={onOpen}
                size="md"
                px={6}
              >
                Add Material Request
              </Button>
              <HStack spacing={3}>
                <Tooltip label={hasAccess ? 'You have temporary access to Edit/Delete' : 'Request temporary access to Edit/Delete'}>
                  <Button
                    leftIcon={<LockIcon />}
                    variant="solid"
                    colorScheme={hasAccess ? "green" : "purple"}
                    onClick={handleOpenRequestModal}
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

            {/* Main Table */}
            <Box
              borderRadius="md"
              shadow="md"
              overflow="hidden"
              border="1px solid"
              borderColor="gray.200"
              bg="white"
            >
              <Box overflowX="auto">
                {materialRequests.length === 0 ? (
                  <Flex
                    direction="column"
                    align="center"
                    justify="center"
                    p={10}
                  >
                    <Icon as={FiPackage} boxSize={12} color="gray.300" mb={4} />
                    <Text fontSize="lg" color="gray.500" mb={4}>
                      No material requests found
                    </Text>
                    <Button
                      leftIcon={<AddIcon />}
                      onClick={onOpen}
                      size="md"
                      colorScheme="blue"
                      variant="outline"
                    >
                      Create your first request
                    </Button>
                  </Flex>
                ) : (
                  <Table variant="simple" fontFamily="Helvetica">
                    <Thead bg="#f8f9fa">
                      <Tr>
                        <Th fontFamily="Helvetica">Request ID</Th>
                        <Th fontFamily="Helvetica">Type</Th>
                        <Th fontFamily="Helvetica">Date</Th>
                        <Th fontFamily="Helvetica">Requested By</Th>
                        <Th fontFamily="Helvetica">Plate Number</Th>
                        <Th fontFamily="Helvetica">Item</Th>
                        <Th textAlign="center" fontFamily="Helvetica">
                          Quantity
                        </Th>
                        <Th isNumeric fontFamily="Helvetica">
                          Total
                        </Th>
                        <Th fontFamily="Helvetica">Expense Category</Th>
                        <Th fontFamily="Helvetica">Status</Th>
                        <Th fontFamily="Helvetica">Actions</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {getCurrentPageRequests().map((request) => (
                        <Tr
                          key={request._id}
                          _hover={{ bg: "#f8f9fa" }}
                          transition="background-color 0.2s"
                        >
                          <Td fontFamily="Helvetica">{request.requestID}</Td>
                          <Td fontFamily="Helvetica">{request.type}</Td>
                          <Td fontFamily="Helvetica">
                            {new Date(request.orderDate).toLocaleDateString()}
                          </Td>
                          <Td fontFamily="Helvetica">{request.requestedBy}</Td>
                          <Td fontFamily="Helvetica">
                            {request.plateNumber || "N/A"}
                          </Td>
                          <Td fontFamily="Helvetica">
                            {request.itemID?.itemName || "N/A"}
                          </Td>
                          <Td textAlign="center" fontFamily="Helvetica">
                            {formatNumber(request.quantity)}
                          </Td>
                          <Td isNumeric fontFamily="Helvetica">
                            ₱
                            {formatNumber(
                              (request.quantity * request.cost).toFixed(2)
                            )}
                          </Td>
                          <Td fontFamily="Helvetica">
                            <Badge
                              colorScheme={
                                request.expenseCategory === "Operating Expenses"
                                  ? "blue"
                                  : request.expenseCategory === "Capital Expenses"
                                  ? "purple"
                                  : request.expenseCategory === "Maintenance"
                                  ? "orange"
                                  : request.expenseCategory === "Utilities"
                                  ? "green"
                                  : "gray"
                              }
                            >
                              {request.expenseCategory}
                            </Badge>
                          </Td>
                          <Td>
                            <Badge
                              colorScheme={
                                request.status === "Approved"
                                  ? "green"
                                  : request.status === "Pending"
                                    ? "yellow"
                                    : "red"
                              }
                            >
                              {request.status}
                            </Badge>
                          </Td>
                          <Td>
                            <HStack spacing={2}>
                              <Tooltip label={hasEditAccess ? "Edit" : "Request access to edit"}>
                                <IconButton
                                  icon={<EditIcon />}
                                  aria-label="Edit"
                                  size="sm"
                                  colorScheme="blue"
                                  variant="ghost"
                                  onClick={() => handleEditClick(request)}
                                  isDisabled={!hasEditAccess}
                                />
                              </Tooltip>

                              <Menu closeOnSelect={true}>
                                <Tooltip label="Change Status">
                                  <MenuButton
                                    as={IconButton}
                                    aria-label="Change Status"
                                    icon={<RepeatIcon />}
                                    size="sm"
                                    colorScheme="teal"
                                    variant="ghost"
                                    isDisabled={request.status === "Approved"}
                                  />
                                </Tooltip>
                                <MenuList minW="160px">
                                  <Text
                                    fontWeight="medium"
                                    fontSize="xs"
                                    px={3}
                                    py={1}
                                    color="gray.500"
                                  >
                                    CHANGE STATUS
                                  </Text>
                                  <MenuItem
                                    onClick={() =>
                                      handleStatusChange(request._id, "Pending")
                                    }
                                    icon={
                                      request.status === "Pending" ? (
                                        <CheckIcon color="yellow.500" />
                                      ) : undefined
                                    }
                                  >
                                    Pending
                                  </MenuItem>
                                  <MenuItem
                                    onClick={() =>
                                      handleStatusChange(
                                        request._id,
                                        "Approved"
                                      )
                                    }
                                    icon={
                                      request.status === "Approved" ? (
                                        <CheckIcon color="blue.500" />
                                      ) : undefined
                                    }
                                  >
                                    Approved
                                  </MenuItem>
                                  <MenuItem
                                    onClick={() =>
                                      handleStatusChange(
                                        request._id,
                                        "Rejected"
                                      )
                                    }
                                    icon={
                                      request.status === "Rejected" ? (
                                        <CheckIcon color="red.500" />
                                      ) : undefined
                                    }
                                  >
                                    Rejected
                                  </MenuItem>
                                </MenuList>
                              </Menu>

                              <Tooltip label={hasDeleteAccess ? "Delete Request" : "Request access to delete"}>
                                <IconButton
                                  icon={<DeleteIcon />}
                                  aria-label="Delete"
                                  size="sm"
                                  colorScheme="red"
                                  variant="ghost"
                                  onClick={() => handleDeleteClick(request)}
                                  isDisabled={!hasDeleteAccess || request.status === "Approved"}
                                />
                              </Tooltip>
                            </HStack>
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                )}

                {/* Pagination */}
                {totalItems > 0 && (
                  <Box
                    px={4}
                    py={4}
                    borderTop="1px solid"
                    borderColor="gray.200"
                  >
                    <Flex justify="space-between" align="center">
                      <Text fontSize="sm" color="gray.600">
                        Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                        {Math.min(currentPage * itemsPerPage, totalItems)} of{" "}
                        {totalItems} requests
                      </Text>

                      <Flex>
                        <Select
                          size="sm"
                          width="80px"
                          value={itemsPerPage}
                          mr={4}
                          onChange={(e) => {
                            const newItemsPerPage = Number(e.target.value);
                            setItemsPerPage(newItemsPerPage);
                            setCurrentPage(1); // Reset to first page when changing items per page
                          }}
                        >
                          <option value={5}>5</option>
                          <option value={10}>10</option>
                          <option value={20}>20</option>
                          <option value={50}>50</option>
                        </Select>

                        <Flex>
                          <Button
                            onClick={() => handlePageChange(1)}
                            disabled={currentPage === 1}
                            size="sm"
                            mx={1}
                            colorScheme="blue"
                            variant={currentPage === 1 ? "outline" : "solid"}
                          >
                            First
                          </Button>
                          <Button
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                            size="sm"
                            mx={1}
                            colorScheme="blue"
                            variant="outline"
                          >
                            Prev
                          </Button>

                          {Array.from({ length: Math.min(5, totalPages) }).map(
                            (_, i) => {
                              let pageNum;

                              if (totalPages <= 5) {
                                pageNum = i + 1;
                              } else if (currentPage <= 3) {
                                pageNum = i + 1;
                              } else if (currentPage >= totalPages - 2) {
                                pageNum = totalPages - 4 + i;
                              } else {
                                pageNum = currentPage - 2 + i;
                              }

                              return (
                                <Button
                                  key={i}
                                  onClick={() => handlePageChange(pageNum)}
                                  size="sm"
                                  mx={1}
                                  colorScheme="blue"
                                  variant={
                                    currentPage === pageNum
                                      ? "solid"
                                      : "outline"
                                  }
                                >
                                  {pageNum}
                                </Button>
                              );
                            }
                          )}

                          <Button
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            size="sm"
                            mx={1}
                            colorScheme="blue"
                            variant="outline"
                          >
                            Next
                          </Button>
                          <Button
                            onClick={() => handlePageChange(totalPages)}
                            disabled={currentPage === totalPages}
                            size="sm"
                            mx={1}
                            colorScheme="blue"
                            variant={
                              currentPage === totalPages ? "outline" : "solid"
                            }
                          >
                            Last
                          </Button>
                        </Flex>
                      </Flex>
                    </Flex>
                  </Box>
                )}
              </Box>
            </Box>
          </GridItem>
        </Grid>
      </VStack>

      {/* Add Material Request Modal */}
      <Modal
        isOpen={isOpen}
        onClose={!isAdding ? handleModalClose : undefined}
        size="4xl"
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Add Material Request</ModalHeader>
          {!isAdding && <ModalCloseButton />}
          <ModalBody pb={6}>
            {/* Wizard Steps */}
            <Box>
              {/* Wizard Steps Header */}
              <Flex
                justify="space-between"
                p={4}
                bg="gray.50"
                borderBottom="1px solid"
                borderColor="gray.200"
              >
                <HStack spacing={8} width="100%" px={4}>
                  <Step
                    stepNumber={1}
                    title="Type & Warehouse"
                    isActive={wizardStep === 1}
                    isCompleted={
                      wizardStep > 1 &&
                      materialRequestForm.type &&
                      ((materialRequestForm.type === "StockIn" &&
                        materialRequestForm.warehouseID &&
                        materialRequestForm.sourceWarehouseID) ||
                        (materialRequestForm.type === "StockOut" &&
                          materialRequestForm.warehouseID &&
                          materialRequestForm.sourceWarehouseID))
                    }
                  />
                  <Step
                    stepNumber={2}
                    title="Select Item"
                    isActive={wizardStep === 2}
                    isCompleted={
                      wizardStep > 2 && materialRequestForm.itemID !== ""
                    }
                  />
                  <Step
                    stepNumber={3}
                    title="Quantity & Cost"
                    isActive={wizardStep === 3}
                    isCompleted={
                      wizardStep > 3 &&
                      materialRequestForm.quantity &&
                      materialRequestForm.cost
                    }
                  />
                  <Step
                    stepNumber={4}
                    title="Requester Info"
                    isActive={wizardStep === 4}
                    isCompleted={false}
                  />
                </HStack>
              </Flex>

              {/* Step 1: Type & Warehouse Selection */}
              <Box display={wizardStep === 1 ? "block" : "none"} p={6}>
                <VStack spacing={6} align="stretch">
                  <Box
                    w="100%"
                    p={5}
                    borderRadius="md"
                    boxShadow="sm"
                    bg="white"
                    border="1px solid"
                    borderColor="gray.200"
                  >
                    <Text
                      fontSize="lg"
                      fontWeight="semibold"
                      mb={4}
                      color="#550000"
                    >
                      Step 1: Select Type & Warehouses
                    </Text>

                    <FormControl isRequired mb={4}>
                      <FormLabel fontWeight="medium">Request Type</FormLabel>
                      <Select
                        value={materialRequestForm.type}
                        onChange={(e) =>
                          setMaterialRequestForm({
                            ...materialRequestForm,
                            type: e.target.value,
                            sourceWarehouseID: "",
                            warehouseID: "",
                            itemID: "",
                            quantity: "",
                            cost: "",
                          })
                        }
                        focusBorderColor="#550000"
                        size="lg"
                      >
                        <option value="StockIn">Stock In</option>
                        <option value="StockOut">Stock Out</option>
                      </Select>
                      <Text fontSize="sm" color="gray.500" mt={1}>
                        {materialRequestForm.type === "StockIn"
                          ? "Stock In: Moving items into a destination warehouse from a source warehouse"
                          : "Stock Out: Moving items out from a source warehouse to a destination"}
                      </Text>
                    </FormControl>

                    <FormControl isRequired mb={4}>
                      <FormLabel fontWeight="medium">
                        {materialRequestForm.type === "StockIn"
                          ? "Destination Warehouse"
                          : "Source Warehouse"}
                      </FormLabel>
                      <Select
                        value={
                          materialRequestForm.type === "StockIn"
                            ? materialRequestForm.warehouseID
                            : materialRequestForm.sourceWarehouseID
                        }
                        onChange={(e) => {
                          if (materialRequestForm.type === "StockIn") {
                            setMaterialRequestForm({
                              ...materialRequestForm,
                              warehouseID: e.target.value,
                              itemID: "",
                            });
                          } else {
                            setMaterialRequestForm({
                              ...materialRequestForm,
                              sourceWarehouseID: e.target.value,
                              itemID: "",
                            });
                          }
                        }}
                        placeholder={`Select ${materialRequestForm.type === "StockIn" ? "destination" : "source"} warehouse`}
                        focusBorderColor="#550000"
                        size="lg"
                      >
                        {warehouses.map((warehouse) => (
                          <option key={warehouse._id} value={warehouse._id}>
                            {warehouse.name}
                          </option>
                        ))}
                      </Select>
                    </FormControl>

                    {materialRequestForm.type === "StockIn" && (
                      <FormControl isRequired mb={4}>
                        <FormLabel fontWeight="medium">
                          Source Warehouse
                        </FormLabel>
                        <Select
                          value={materialRequestForm.sourceWarehouseID}
                          onChange={(e) =>
                            setMaterialRequestForm({
                              ...materialRequestForm,
                              sourceWarehouseID: e.target.value,
                              itemID: "",
                            })
                          }
                          placeholder="Select source warehouse"
                          focusBorderColor="#550000"
                          size="lg"
                        >
                          {warehouses
                            .filter(
                              (w) => w._id !== materialRequestForm.warehouseID
                            )
                            .map((warehouse) => (
                              <option key={warehouse._id} value={warehouse._id}>
                                {warehouse.name}
                              </option>
                            ))}
                        </Select>
                      </FormControl>
                    )}

                    {materialRequestForm.type === "StockOut" && (
                      <FormControl isRequired>
                        <FormLabel fontWeight="medium">
                          Destination Warehouse
                        </FormLabel>
                        <Select
                          value={materialRequestForm.warehouseID}
                          onChange={(e) =>
                            setMaterialRequestForm({
                              ...materialRequestForm,
                              warehouseID: e.target.value,
                            })
                          }
                          placeholder="Select destination warehouse"
                          focusBorderColor="#550000"
                          size="lg"
                        >
                          {warehouses
                            .filter(
                              (w) =>
                                w._id !== materialRequestForm.sourceWarehouseID
                            )
                            .map((warehouse) => (
                              <option key={warehouse._id} value={warehouse._id}>
                                {warehouse.name}
                              </option>
                            ))}
                        </Select>
                      </FormControl>
                    )}

                    <Box mt={8}>
                      <HStack spacing={4} width="100%">
                        <Button
                          size="lg"
                          variant="outline"
                          width="30%"
                          onClick={handleModalClose}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="lg"
                          colorScheme="blue"
                          width="70%"
                          isDisabled={
                            !materialRequestForm.type ||
                            !materialRequestForm.warehouseID ||
                            (materialRequestForm.type === "StockIn"
                              && !materialRequestForm.sourceWarehouseID) ||
                            (materialRequestForm.type === "StockOut"
                              && !materialRequestForm.sourceWarehouseID)
                          }
                          onClick={() => setWizardStep(2)}
                        >
                          Next: Select Item
                        </Button>
                      </HStack>
                    </Box>
                  </Box>
                </VStack>
              </Box>

              {/* Step 2: Item Selection */}
              <Box display={wizardStep === 2 ? "block" : "none"} p={6}>
                <VStack spacing={6} align="stretch">
                  <Box
                    w="100%"
                    p={5}
                    borderRadius="md"
                    boxShadow="sm"
                    bg="white"
                    border="1px solid"
                    borderColor="gray.200"
                  >
                    <Text
                      fontSize="lg"
                      fontWeight="semibold"
                      mb={4}
                      color="#550000"
                    >
                      Step 2: Select Item
                    </Text>

                    <Text mb={4}>
                      {materialRequestForm.type === "StockIn"
                        ? `Selecting item from ${warehouses.find((w) => w._id === materialRequestForm.sourceWarehouseID)?.name || "source warehouse"}`
                        : `Selecting item from ${warehouses.find((w) => w._id === materialRequestForm.sourceWarehouseID)?.name || "source warehouse"}`}
                    </Text>

                    <Box
                      border="1px solid"
                      borderColor="gray.200"
                      borderRadius="md"
                      overflow="hidden"
                    >
                      <Box
                        p={4}
                        bg="#f7f7f7"
                        borderBottom="1px solid"
                        borderColor="gray.200"
                      >
                        <InputGroup>
                          <InputLeftElement pointerEvents="none">
                            <SearchIcon color="gray.400" />
                          </InputLeftElement>
                          <Input
                            placeholder="Search items by name..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            bg="white"
                          />
                        </InputGroup>
                      </Box>

                      <Box maxH="300px" overflow="auto">
                        <Table variant="simple" size="md">
                          <Thead
                            position="sticky"
                            top={0}
                            bg="white"
                            zIndex={1}
                            boxShadow="sm"
                          >
                            <Tr>
                              <Th width="60px">Select</Th>
                              <Th>Item Name</Th>
                              <Th isNumeric>Cost Per Unit</Th>
                              <Th isNumeric>Available Qty</Th>
                            </Tr>
                          </Thead>
                          <Tbody>
                            {materialRequestFilteredItems.length === 0 ? (
                              <Tr>
                                <Td colSpan={4} textAlign="center" py={10}>
                                  <VStack>
                                    <Icon
                                      as={FiPackage}
                                      boxSize={8}
                                      color="gray.300"
                                    />
                                    <Text color="gray.500">
                                      No items found in the selected warehouse
                                    </Text>
                                  </VStack>
                                </Td>
                              </Tr>
                            ) : materialRequestFilteredItems.filter((item) =>
                                item.itemName
                                  .toLowerCase()
                                  .includes(searchQuery.toLowerCase())
                              ).length === 0 ? (
                              <Tr>
                                <Td colSpan={4} textAlign="center" py={10}>
                                  <VStack>
                                    <Icon
                                      as={SearchIcon}
                                      boxSize={8}
                                      color="gray.300"
                                    />
                                    <Text color="gray.500">
                                      No items found matching your search
                                    </Text>
                                  </VStack>
                                </Td>
                              </Tr>
                            ) : (
                              materialRequestFilteredItems
                                .filter((item) =>
                                  item.itemName
                                    .toLowerCase()
                                    .includes(searchQuery.toLowerCase())
                                )
                                .map((item) => (
                                  <Tr
                                    key={item._id}
                                    cursor="pointer"
                                    bg={
                                      materialRequestForm.itemID === item._id
                                        ? "blue.50"
                                        : "white"
                                    }
                                    _hover={{ bg: "gray.50" }}
                                    onClick={() => {
                                      setMaterialRequestForm((prev) => ({
                                        ...prev,
                                        itemID: item._id,
                                        cost:
                                          item.costPerUnit !== undefined &&
                                          item.costPerUnit !== null
                                            ? item.costPerUnit
                                            : 0,
                                      }));
                                    }}
                                  >
                                    <Td width="60px">
                                      <Circle
                                        size="40px"
                                        bg={
                                          materialRequestForm.itemID ===
                                          item._id
                                            ? "#550000"
                                            : "gray.100"
                                        }
                                        color="white"
                                      >
                                        {materialRequestForm.itemID ===
                                        item._id ? (
                                          <CheckIcon />
                                        ) : null}
                                      </Circle>
                                    </Td>
                                    <Td
                                      fontWeight={
                                        materialRequestForm.itemID === item._id
                                          ? "bold"
                                          : "normal"
                                      }
                                    >
                                      {item.itemName}
                                    </Td>
                                    <Td isNumeric fontFamily="mono">
                                      ₱{formatNumber(item.costPerUnit || 0)}
                                    </Td>
                                    <Td isNumeric>
                                      {formatNumber(item.stockBalance || 0)}
                                    </Td>
                                  </Tr>
                                ))
                            )}
                          </Tbody>
                        </Table>
                      </Box>
                    </Box>

                    <Box mt={8}>
                      <HStack spacing={4} width="100%">
                        <Button
                          size="lg"
                          variant="outline"
                          width="50%"
                          onClick={() => setWizardStep(1)}
                        >
                          Previous
                        </Button>
                        <Button
                          size="lg"
                          colorScheme="blue"
                          width="50%"
                          isDisabled={!materialRequestForm.itemID}
                          onClick={() => setWizardStep(3)}
                        >
                          Next: Quantity & Cost
                        </Button>
                      </HStack>
                    </Box>
                  </Box>
                </VStack>
              </Box>

              {/* Step 3: Quantity and Cost */}
              <Box display={wizardStep === 3 ? "block" : "none"} p={6}>
                <VStack spacing={6} align="stretch">
                  <Box
                    w="100%"
                    p={5}
                    borderRadius="md"
                    boxShadow="sm"
                    bg="white"
                    border="1px solid"
                    borderColor="gray.200"
                  >
                    <Text
                      fontSize="lg"
                      fontWeight="semibold"
                      mb={4}
                      color="#550000"
                    >
                      Step 3: Quantity & Cost
                    </Text>

                    <Flex
                      direction={{ base: "column", md: "row" }}
                      mb={6}
                      p={4}
                      bg="blue.50"
                      borderRadius="md"
                    >
                      <Box flex={1} mb={{ base: 4, md: 0 }}>
                        <Text fontWeight="bold">Selected Item:</Text>
                        <Text fontSize="xl">
                          {items.find(
                            (item) => item._id === materialRequestForm.itemID
                          )?.itemName || ""}
                        </Text>
                      </Box>
                      <Box flex={1}>
                        <Text fontWeight="bold">Unit Cost:</Text>
                        <Text fontSize="xl" fontFamily="mono">
                          ₱{formatNumber(materialRequestForm.cost || 0)}
                        </Text>
                      </Box>
                    </Flex>

                    <FormControl isRequired mb={6}>
                      <FormLabel fontWeight="medium">Quantity</FormLabel>
                      <NumberInput
                        min={1}
                        focusBorderColor="#550000"
                        size="lg"
                        isInvalid={
                          materialRequestForm.quantity >
                          (items.find(
                            (item) => item._id === materialRequestForm.itemID
                          )?.stockBalance || 0)
                        }
                      >
                        <NumberInputField
                          value={materialRequestForm.quantity}
                          onChange={(e) =>
                            setMaterialRequestForm({
                              ...materialRequestForm,
                              quantity: e.target.value,
                            })
                          }
                          placeholder="Enter quantity"
                        />
                      </NumberInput>
                      {materialRequestForm.quantity >
                      (items.find(
                        (item) => item._id === materialRequestForm.itemID
                      )?.stockBalance || 0) ? (
                        <Text color="red.500" fontSize="sm" mt={1}>
                          Insufficient stock. Available:{" "}
                          {items.find(
                            (item) => item._id === materialRequestForm.itemID
                          )?.stockBalance || 0}{" "}
                          units
                        </Text>
                      ) : (
                        <Text fontSize="sm" color="gray.500" mt={1}>
                          Available:{" "}
                          {items.find(
                            (item) => item._id === materialRequestForm.itemID
                          )?.stockBalance || 0}{" "}
                          units
                        </Text>
                      )}
                    </FormControl>

                    <FormControl isRequired mb={6}>
                      <FormLabel fontWeight="medium">Total Cost</FormLabel>
                      <Flex
                        align="center"
                        p={4}
                        borderRadius="md"
                        bg="gray.50"
                        border="1px solid"
                        borderColor="gray.200"
                      >
                        <Text fontWeight="bold" mr={2}>
                          ₱
                        </Text>
                        <Text
                          fontSize="2xl"
                          fontFamily="mono"
                          fontWeight="bold"
                        >
                          {formatNumber(
                            materialRequestForm.quantity &&
                              materialRequestForm.cost
                              ? (
                                  Number(materialRequestForm.quantity) *
                                  Number(materialRequestForm.cost)
                                ).toFixed(2)
                              : "0.00"
                          )}
                        </Text>
                      </Flex>
                    </FormControl>

                    <FormControl isRequired mb={6}>
                      <FormLabel fontWeight="medium">Expense Category</FormLabel>
                      <Select
                        value={materialRequestForm.expenseCategory}
                        onChange={(e) =>
                          setMaterialRequestForm({
                            ...materialRequestForm,
                            expenseCategory: e.target.value,
                          })
                        }
                        focusBorderColor="#550000"
                        size="lg"
                      >
                        <option value="Operating Expenses">Operating Expenses</option>
                        <option value="Capital Expenses">Capital Expenses</option>
                        <option value="Maintenance">Maintenance</option>
                        <option value="Utilities">Utilities</option>
                        <option value="Other">Other</option>
                      </Select>
                      <Text fontSize="sm" color="gray.500" mt={1}>
                        Select the category for this expense
                      </Text>
                    </FormControl>

                    <Box mt={8}>
                      <HStack spacing={4} width="100%">
                        <Button
                          size="lg"
                          variant="outline"
                          width="50%"
                          onClick={() => setWizardStep(2)}
                        >
                          Previous
                        </Button>
                        <Button
                          size="lg"
                          colorScheme="blue"
                          width="50%"
                          isDisabled={
                            !materialRequestForm.quantity ||
                            materialRequestForm.quantity <= 0 ||
                            materialRequestForm.quantity >
                              (items.find(
                                (item) =>
                                  item._id === materialRequestForm.itemID
                              )?.stockBalance || 0)
                          }
                          onClick={() => setWizardStep(4)}
                        >
                          Next: Requester Info
                        </Button>
                      </HStack>
                    </Box>
                  </Box>
                </VStack>
              </Box>

              {/* Step 4: Requester Info */}
              <Box display={wizardStep === 4 ? "block" : "none"} p={6}>
                <VStack spacing={6} align="stretch">
                  <Box
                    w="100%"
                    p={5}
                    borderRadius="md"
                    boxShadow="sm"
                    bg="white"
                    border="1px solid"
                    borderColor="gray.200"
                  >
                    <Text
                      fontSize="lg"
                      fontWeight="semibold"
                      mb={4}
                      color="#550000"
                    >
                      Step 4: Requester Information
                    </Text>

                    <FormControl mb={6}>
                      <FormLabel fontWeight="medium">
                        Plate Number (Optional)
                      </FormLabel>
                      <Select
                        value={materialRequestForm.plateNumber}
                        onChange={(e) =>
                          setMaterialRequestForm({
                            ...materialRequestForm,
                            plateNumber: e.target.value,
                          })
                        }
                        placeholder="Select plate number"
                        focusBorderColor="#550000"
                        size="lg"
                      >
                        {trucks.map((truck) => (
                          <option key={truck._id} value={truck.plateNumber}>
                            {truck.plateNumber} - {truck.vehicleType}
                          </option>
                        ))}
                      </Select>
                      <Text fontSize="sm" color="gray.500" mt={1}>
                        Vehicle that will be used for this material request
                      </Text>
                    </FormControl>

                    <FormControl isRequired mb={6}>
                      <FormLabel fontWeight="medium">Requested By</FormLabel>
                      <Input
                        value={materialRequestForm.requestedBy}
                        onChange={(e) =>
                          setMaterialRequestForm({
                            ...materialRequestForm,
                            requestedBy: e.target.value,
                          })
                        }
                        placeholder="Enter requester name"
                        focusBorderColor="#550000"
                        size="lg"
                      />
                      <Text fontSize="sm" color="gray.500" mt={1}>
                        Person who requested this material transfer
                      </Text>
                    </FormControl>

                    <Box mt={8}>
                      <HStack spacing={4} width="100%">
                        <Button
                          size="lg"
                          variant="outline"
                          width="50%"
                          onClick={() => setWizardStep(3)}
                        >
                          Previous
                        </Button>
                        <Button
                          size="lg"
                          bg="#550000"
                          color="white"
                          _hover={{ bg: "#770000" }}
                          width="50%"
                          isDisabled={!materialRequestForm.requestedBy}
                          onClick={handleMaterialRequestSubmit}
                          colorScheme="blue"
                          isLoading={isAdding}
                          loadingText="Submitting..."
                        >
                          Submit Request
                        </Button>
                      </HStack>
                    </Box>
                  </Box>
                </VStack>
              </Box>
            </Box>
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Edit Material Request Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={!isEditing ? () => setIsEditModalOpen(false) : undefined}
        size="4xl"
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Edit Material Request</ModalHeader>
          {!isEditing && <ModalCloseButton />}
          <ModalBody pb={6}>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel fontWeight="medium">Type</FormLabel>
                <Select
                  value={selectedMaterialRequest?.type || "StockIn"}
                  onChange={(e) =>
                    setSelectedMaterialRequest({
                      ...selectedMaterialRequest,
                      type: e.target.value,
                      sourceWarehouseID:
                        e.target.value === "StockIn"
                          ? selectedMaterialRequest.sourceWarehouseID
                          : "",
                      warehouseID:
                        e.target.value === "StockOut"
                          ? selectedMaterialRequest.warehouseID
                          : "",
                      itemID: "",
                    })
                  }
                  isDisabled={selectedMaterialRequest?.status !== "Pending"}
                  borderRadius="md"
                  focusBorderColor="#550000"
                >
                  <option value="StockIn">Stock In</option>
                  <option value="StockOut">Stock Out</option>
                </Select>
              </FormControl>

              <FormControl isRequired>
                <FormLabel>
                  {(selectedMaterialRequest?.type || "StockIn") === "StockIn"
                    ? "Destination Warehouse"
                    : "Source Warehouse"}
                </FormLabel>
                <Select
                  value={
                    (selectedMaterialRequest?.type || "StockIn") === "StockIn"
                      ? selectedMaterialRequest?.warehouseID || ""
                      : selectedMaterialRequest?.sourceWarehouseID || ""
                  }
                  onChange={(e) => {
                    if (
                      (selectedMaterialRequest?.type || "StockIn") === "StockIn"
                    ) {
                      setSelectedMaterialRequest({
                        ...selectedMaterialRequest,
                        warehouseID: e.target.value,
                        itemID: "",
                      });
                    } else {
                      setSelectedMaterialRequest({
                        ...selectedMaterialRequest,
                        sourceWarehouseID: e.target.value,
                        itemID: "",
                      });
                    }
                  }}
                  placeholder={`Select ${
                    (selectedMaterialRequest?.type || "StockIn") === "StockIn"
                      ? "destination"
                      : "source"
                  } warehouse`}
                  isDisabled={selectedMaterialRequest?.status !== "Pending"}
                >
                  {warehouses.map((warehouse) => (
                    <option key={warehouse._id} value={warehouse._id}>
                      {warehouse.name}
                    </option>
                  ))}
                </Select>
              </FormControl>

              {(selectedMaterialRequest?.type || "StockIn") === "StockIn" && (
                <FormControl isRequired>
                  <FormLabel>Source Warehouse</FormLabel>
                  <Select
                    value={selectedMaterialRequest?.sourceWarehouseID || ""}
                    onChange={(e) =>
                      setSelectedMaterialRequest({
                        ...selectedMaterialRequest,
                        sourceWarehouseID: e.target.value || null,
                        itemID: "",
                      })
                    }
                    placeholder="Select source warehouse"
                    isDisabled={selectedMaterialRequest?.status !== "Pending"}
                  >
                    {warehouses
                      .filter(
                        (w) => w._id !== selectedMaterialRequest?.warehouseID
                      )
                      .map((warehouse) => (
                        <option key={warehouse._id} value={warehouse._id}>
                          {warehouse.name}
                        </option>
                      ))}
                  </Select>
                </FormControl>
              )}

              {(selectedMaterialRequest?.type || "StockIn") === "StockOut" && (
                <FormControl isRequired>
                  <FormLabel>Destination Warehouse</FormLabel>
                  <Select
                    value={selectedMaterialRequest?.warehouseID || ""}
                    onChange={(e) =>
                      setSelectedMaterialRequest({
                        ...selectedMaterialRequest,
                        warehouseID: e.target.value,
                      })
                    }
                    placeholder="Select destination warehouse"
                    isDisabled={selectedMaterialRequest?.status !== "Pending"}
                  >
                    {warehouses
                      .filter(
                        (w) =>
                          w._id !== selectedMaterialRequest?.sourceWarehouseID
                      )
                      .map((warehouse) => (
                        <option key={warehouse._id} value={warehouse._id}>
                          {warehouse.name}
                        </option>
                      ))}
                  </Select>
                </FormControl>
              )}

              <FormControl isRequired>
                <FormLabel>Item</FormLabel>
                <Select
                  value={selectedMaterialRequest?.itemID || ""}
                  onChange={(e) => {
                    const itemId = e.target.value;
                    const selectedItem = items.find(
                      (item) => item._id === itemId
                    );
                    setSelectedMaterialRequest({
                      ...selectedMaterialRequest,
                      itemID: itemId,
                      cost:
                        selectedItem?.costPerUnit !== undefined &&
                        selectedItem?.costPerUnit !== null
                          ? selectedItem?.costPerUnit
                          : 0,
                    });
                  }}
                  placeholder="Select item"
                  isDisabled={
                    selectedMaterialRequest?.status !== "Pending" ||
                    ((selectedMaterialRequest?.type || "StockIn") === "StockIn"
                      ? !selectedMaterialRequest?.sourceWarehouseID
                      : !selectedMaterialRequest?.sourceWarehouseID)
                  }
                >
                  {items
                    .filter(
                      (item) =>
                        item.warehouseID?._id ===
                          selectedMaterialRequest?.sourceWarehouseID ||
                        item.warehouseID ===
                          selectedMaterialRequest?.sourceWarehouseID
                    )
                    .map((item) => (
                      <option key={item._id} value={item._id}>
                        {item.itemName}
                      </option>
                    ))}
                </Select>
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Quantity</FormLabel>
                <NumberInput min={1}>
                  <NumberInputField
                    value={selectedMaterialRequest?.quantity || ""}
                    onChange={(e) =>
                      setSelectedMaterialRequest({
                        ...selectedMaterialRequest,
                        quantity: e.target.value,
                      })
                    }
                    placeholder="Enter quantity"
                    isDisabled={selectedMaterialRequest?.status !== "Pending"}
                  />
                </NumberInput>
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Cost per Unit (₱)</FormLabel>
                <NumberInput
                  min={0}
                  precision={2}
                  isReadOnly
                  value={formatNumber(selectedMaterialRequest?.cost || 0)}
                >
                  <NumberInputField
                    placeholder="Cost will be set automatically"
                    bg="gray.100"
                    _hover={{ bg: "gray.100" }}
                    _focus={{ bg: "gray.100" }}
                    cursor="not-allowed"
                  />
                </NumberInput>
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Total Cost (₱)</FormLabel>
                <NumberInput
                  isReadOnly
                  value={formatNumber(
                    selectedMaterialRequest?.quantity &&
                      selectedMaterialRequest?.cost
                      ? (
                          Number(selectedMaterialRequest.quantity) *
                          Number(selectedMaterialRequest.cost)
                        ).toFixed(2)
                      : "0.00"
                  )}
                >
                  <NumberInputField
                    bg="gray.100"
                    _hover={{ bg: "gray.100" }}
                    _focus={{ bg: "gray.100" }}
                    cursor="not-allowed"
                  />
                </NumberInput>
              </FormControl>

              <FormControl>
                <FormLabel>Plate Number</FormLabel>
                <Select
                  value={selectedMaterialRequest?.plateNumber || ""}
                  onChange={(e) =>
                    setSelectedMaterialRequest({
                      ...selectedMaterialRequest,
                      plateNumber: e.target.value,
                    })
                  }
                  placeholder="Select plate number"
                  isDisabled={selectedMaterialRequest?.status !== "Pending"}
                >
                  {trucks.map((truck) => (
                    <option key={truck._id} value={truck.plateNumber}>
                      {truck.plateNumber} - {truck.vehicleType}
                    </option>
                  ))}
                </Select>
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Requested By</FormLabel>
                <Input
                  value={selectedMaterialRequest?.requestedBy || ""}
                  onChange={(e) =>
                    setSelectedMaterialRequest({
                      ...selectedMaterialRequest,
                      requestedBy: e.target.value,
                    })
                  }
                  placeholder="Enter requester name"
                  isDisabled={selectedMaterialRequest?.status !== "Pending"}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Status</FormLabel>
                <Select
                  value={selectedMaterialRequest?.status || "Pending"}
                  onChange={(e) =>
                    setSelectedMaterialRequest({
                      ...selectedMaterialRequest,
                      status: e.target.value,
                    })
                  }
                >
                  <option value="Pending">Pending</option>
                  <option value="Approved">Approved</option>
                  <option value="Rejected">Rejected</option>
                </Select>
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Expense Category</FormLabel>
                <Select
                  value={selectedMaterialRequest?.expenseCategory || "Operating Expenses"}
                  onChange={(e) =>
                    setSelectedMaterialRequest({
                      ...selectedMaterialRequest,
                      expenseCategory: e.target.value,
                    })
                  }
                  isDisabled={selectedMaterialRequest?.status !== "Pending"}
                >
                  <option value="Operating Expenses">Operating Expenses</option>
                  <option value="Capital Expenses">Capital Expenses</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Utilities">Utilities</option>
                  <option value="Other">Other</option>
                </Select>
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button
              onClick={handleEditSubmit}
              colorScheme="blue"
              isLoading={isEditing}
              loadingText="Saving..."
              isDisabled={isEditing}
            >
              Save Changes
            </Button>
            <Button
              variant="ghost"
              onClick={() => setIsEditModalOpen(false)}
              ml={3}
              isDisabled={isEditing}
            >
              Cancel
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        isOpen={isDeleteOpen}
        leastDestructiveRef={cancelRef}
        onClose={!isDeleting ? onDeleteClose : undefined}
        isCentered
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete Material Request
            </AlertDialogHeader>

            <AlertDialogBody>
              Are you sure you want to delete Material Request ID "
              <strong>{requestToDelete?.requestID}</strong>"? This action cannot
              be undone.
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button
                ref={cancelRef}
                onClick={onDeleteClose}
                isDisabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                colorScheme="red"
                onClick={handleDeleteConfirm}
                ml={3}
                isLoading={isDeleting}
                loadingText="Deleting..."
                isDisabled={isDeleting}
              >
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>

      {/* Request Access Modal */}
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
                <Select
                  value={requestType}
                  onChange={(e) => setRequestType(e.target.value)}
                  placeholder="Select request type"
                  isDisabled={isSubmittingRequest}
                >
                  <option value="Edit" disabled={pendingEditRequest}>Edit Access</option>
                  <option value="Delete" disabled={pendingDeleteRequest}>Delete Access</option>
                </Select>
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
    </Box>
  );
};

export default MaterialRequest;
