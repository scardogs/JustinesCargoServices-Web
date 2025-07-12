import { useState, useEffect, useRef } from "react";
import {
  Box,
  Button,
  Input,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Select,
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  FormControl,
  FormLabel,
  useDisclosure,
  Flex,
  Text,
  Heading,
  Spinner,
  Center,
  Skeleton,
  Spacer,
  IconButton,
  Tooltip,
  Card,
  TableContainer,
  Image,
  Badge,
  useBreakpointValue,
  VStack,
  HStack,
  Grid,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  Textarea,
  FormErrorMessage,
} from "@chakra-ui/react";
import axios from "axios";
import {
  AddIcon,
  Search2Icon,
  ChevronLeftIcon,
  ChevronRightIcon,
  LinkIcon,
  InfoIcon,
  ViewIcon,
  CloseIcon,
  DeleteIcon,
  LockIcon,
  TimeIcon,
  EditIcon,
} from "@chakra-ui/icons";

// Add these color constants at the top of the file after the imports
const primaryColor = "#143D60"; // Deep blue
const secondaryColor = "#1A4F7A"; // Medium blue
const accentColor = "#800000"; // Maroon
const lightBg = "#F8FAFC";
const borderColor = "#E2E8F0";
const tableBorderColor = "#E2E8F0";
const tableHeaderBg = "#F7FAFC"; // Light gray for header
const hoverBg = "#F0F7FF";

const Waybill = () => {
  // Add state variables first
  const [stub, setStub] = useState("");
  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");
  const [deleteStub, setDeleteStub] = useState("");
  const [waybills, setWaybills] = useState([]);
  const [filteredWaybills, setFilteredWaybills] = useState([]);
  const [groupedWaybills, setGroupedWaybills] = useState([]);
  const [selectedStubWaybills, setSelectedStubWaybills] = useState([]);
  const [selectedStubForView, setSelectedStubForView] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingWaybillId, setDeletingWaybillId] = useState(null);
  const [activatingWaybillId, setActivatingWaybillId] = useState(null);
  const toast = useToast();

  // New state variables for assigning stubNumber to vehicle
  const [selectedStub, setSelectedStub] = useState("");
  const [selectedStubs, setSelectedStubs] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState("");
  const [isVehiclesLoading, setIsVehiclesLoading] = useState(false);
  const [unassignedStubs, setUnassignedStubs] = useState([]);
  const [isStubsLoading, setIsStubsLoading] = useState(false);

  // Modal state for Add Waybill
  const {
    isOpen: isAddModalOpen,
    onOpen: onAddModalOpen,
    onClose: onAddModalClose,
  } = useDisclosure();

  // Modal state for Delete by Stub
  const {
    isOpen: isDeleteModalOpen,
    onOpen: onDeleteModalOpen,
    onClose: onDeleteModalClose,
  } = useDisclosure();

  // Modal state for Assign Stub to Vehicle
  const {
    isOpen: isAssignModalOpen,
    onOpen: onAssignModalOpen,
    onClose: onAssignModalClose,
  } = useDisclosure();

  // Modal state for View Waybill Numbers
  const {
    isOpen: isViewWaybillsModalOpen,
    onOpen: onViewWaybillsModalOpen,
    onClose: onViewWaybillsModalClose,
  } = useDisclosure();

  // Add search state
  const [search, setSearch] = useState("");

  // Add validation state
  const [validationError, setValidationError] = useState("");
  const [isValidating, setIsValidating] = useState(false);

  // Add state for waybill modal search
  const [waybillSearch, setWaybillSearch] = useState("");

  // Add state for status filter
  const [statusFilter, setStatusFilter] = useState("");

  // Add state to track companies for each waybill
  const [waybillCompanies, setWaybillCompanies] = useState({});

  // Add state to track selected waybill for company view
  const [selectedWaybillForCompanies, setSelectedWaybillForCompanies] =
    useState(null);
  const [showingCompanyTable, setShowingCompanyTable] = useState(false);
  const [companyList, setCompanyList] = useState([]);

  // Add state to track and cache company counts
  const [companyCountCache, setCompanyCountCache] = useState({});

  // Add a new state to track stub to vehicle assignments
  const [stubVehicleMap, setStubVehicleMap] = useState({});

  // Add a new state for vehicle mapping loading
  const [isVehicleMappingLoading, setIsVehicleMappingLoading] = useState(false);

  // Add a new modal state for unassigning stubs
  const {
    isOpen: isUnassignModalOpen,
    onOpen: onUnassignModalOpen,
    onClose: onUnassignModalClose,
  } = useDisclosure();

  // Add a new state for the stub to unassign
  const [stubToUnassign, setStubToUnassign] = useState("");

  // Add states for reference information in the Add Waybill modal
  const [previousStubNumber, setPreviousStubNumber] = useState("-");
  const [previousWaybillNumber, setPreviousWaybillNumber] = useState("-");
  const [nextWaybillNumber, setNextWaybillNumber] = useState("-");

  // Add a new state to cache existing waybill numbers
  const [existingWaybillNumbers, setExistingWaybillNumbers] = useState(
    new Set()
  );

  // Add new state for dropdown visibility
  const [showDropdown, setShowDropdown] = useState(false);

  // Add state for delete confirmation
  const [stubToDelete, setStubToDelete] = useState(null);
  const deleteStubAlertDisclosure = useDisclosure();
  const [isDeletingStub, setIsDeletingStub] = useState(false);
  const cancelRef = useRef(); // Ref for AlertDialog

  // <<< Add state for relevant schedules >>>
  const [relevantSchedules, setRelevantSchedules] = useState({}); // Map waybillNumber -> schedule
  const [isScheduleLoading, setIsScheduleLoading] = useState(false);

  // <<< Add state for Reassignment Modal >>>
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
  const [waybillToReassign, setWaybillToReassign] = useState(null); // { _id, waybillNumber }
  const [activeTrucks, setActiveTrucks] = useState([]); // [{ plateNumber, driverName }]
  const [isFetchingActiveTrucks, setIsFetchingActiveTrucks] = useState(false);
  const [selectedReassignTruck, setSelectedReassignTruck] = useState(""); // plateNumber
  const [isReassigning, setIsReassigning] = useState(false);

  // Add new state variables for access request functionality
  const [isRequestAccessModalOpen, setIsRequestAccessModalOpen] =
    useState(false);
  const [stubForAccessRequest, setStubForAccessRequest] = useState(null);
  const [accessRemarks, setAccessRemarks] = useState("");
  const [approvedStubDeletions, setApprovedStubDeletions] = useState([]);
  const [isCheckingApprovals, setIsCheckingApprovals] = useState(false);
  const [notifiedApprovals, setNotifiedApprovals] = useState([]);
  const [approvalTimers, setApprovalTimers] = useState({});

  // Add new state for stub update
  const [isUpdatingStub, setIsUpdatingStub] = useState(false);
  const [newStubNumber, setNewStubNumber] = useState("");
  const [stubValidationError, setStubValidationError] = useState("");
  const [isCheckingStub, setIsCheckingStub] = useState(false);

  // Modal state for Edit Stub
  const {
    isOpen: isEditStubModalOpen,
    onOpen: onEditStubModalOpen,
    onClose: onEditStubModalClose,
  } = useDisclosure();

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

  // Fetch approved requests for stub deletions
  const fetchApprovedRequests = async () => {
    try {
      setIsCheckingApprovals(true);
      const token = localStorage.getItem("token");
      if (!token) {
        setIsCheckingApprovals(false);
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

      // Filter for approved Delete Stub requests
      const approved = response.data.filter(
        (req) => req.Status === "Approved" && req.RequestType === "Delete Stub"
      );

      console.log("All approved stub deletion requests:", approved);

      // Check if there are any new approvals
      const previousApprovalIds = approvedStubDeletions.map((req) => req._id);
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

      // Update the approved requests
      setApprovedStubDeletions(approved); // Keep all approved Delete Stub requests

      // Notify about newly approved stubs
      if (hasNewApprovals) {
        const newlyApprovedStubs = newApprovals.map((req) => req.ReferenceID);

        // Update the list of notified stubs
        setNotifiedApprovals((prev) => [...prev, ...newlyApprovedStubs]);

        // Show notification for newly approved stubs
        // toast({
        //   title: "Access Approved",
        //   description: `You have approved access to delete stub(s): ${newlyApprovedStubs.join(", ")}`,
        //   status: "success",
        //   duration: 3000,
        //   isClosable: true,
        //   position: "top-right",
        // });
      }
    } catch (error) {
      console.error("Error fetching approved requests:", error);
    } finally {
      setIsCheckingApprovals(false);
    }
  };

  // Check if deletion is approved for a specific stub
  const isDeleteApproved = (stub) => {
    if (!stub || !approvedStubDeletions.length) return false;

    // Find approval for this stub
    const approvalRequest = approvedStubDeletions.find(
      (request) => String(request.ReferenceID).trim() === String(stub).trim()
    );

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
          `Approval expiration status for stub ${stub}: ${isExpired ? "Expired" : "Active"}`
        );

        // Return true only if not expired
        return !isExpired;
      }
      // If no expiration time, approval doesn't expire
      return true;
    }

    return false;
  };

  // Add a helper to get approval data for a specific stub
  const getApprovalDataForStub = (stub) => {
    if (!stub || !approvedStubDeletions.length) return null;

    return approvedStubDeletions.find(
      (request) => String(request.ReferenceID).trim() === String(stub).trim()
    );
  };

  // Handle opening the access request modal
  const handleRequestAccess = (stub) => {
    setStubForAccessRequest(stub);
    setAccessRemarks("");
    setIsRequestAccessModalOpen(true);
  };

  // Handle submitting the access request
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
          position: "top-right",
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
          position: "top-right",
        });
        return;
      }

      const requestData = {
        Module: "Waybill Activation",
        UserRole: user.workLevel || "Waybill Officer",
        Username: user.name || "User",
        RequestType: "Delete Stub",
        Remarks: `${accessRemarks} - Requested for Stub #${stubForAccessRequest}`,
        Status: "Pending",
        RequestID: `REQ-${Math.floor(Math.random() * 100000)}`,
        ReferenceID: stubForAccessRequest, // Use the stub number as reference
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
        description: `Your request to delete stub #${stubForAccessRequest} has been submitted for approval.`,
        status: "success",
        duration: 3000,
        isClosable: true,
        position: "top-right",
      });

      // Refresh the list of approved requests
      fetchApprovedRequests();

      setIsRequestAccessModalOpen(false);
    } catch (error) {
      console.error("Error submitting access request:", error);
      toast({
        title: "Error",
        description: "Failed to submit your request. Please try again.",
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "top-right",
      });
    }
  };

  // Set up timer update interval for approval expirations
  useEffect(() => {
    // Fetch approved requests on component mount
    fetchApprovedRequests();

    // Set up refresh interval (every 30 seconds)
    const refreshInterval = setInterval(() => {
      console.log("Running scheduled approval check");
      fetchApprovedRequests();
    }, 30000);

    // Set up timer update interval for countdown
    const timerInterval = setInterval(() => {
      const now = new Date();
      const updatedTimers = { ...approvalTimers };
      let hasChanges = false;
      let hasNewExpirations = false;

      // Update each timer
      approvedStubDeletions.forEach((request) => {
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

    return () => {
      clearInterval(refreshInterval);
      clearInterval(timerInterval);
    };
  }, [approvedStubDeletions]);

  // Also refresh when the component gains focus
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchApprovedRequests();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // Add these utility functions right after state declarations and before other functions
  const checkUnusedWaybillCount = (stub) => {
    const stubWaybills = waybills.filter((waybill) => waybill.stub === stub);
    const unusedCount = stubWaybills.filter(
      (waybill) => waybill.status === "UNUSED"
    ).length;
    return unusedCount;
  };

  // Create a reusable function for extracting the numeric part of a waybill number
  const getNumberPart = (waybillNumber) => {
    if (!waybillNumber) return 0;
    const parts = waybillNumber.split("-");
    if (parts.length > 1) {
      return parseInt(parts[1]);
    }
    // If it's already just a number (without stub prefix)
    return parseInt(waybillNumber);
  };

  const hasStubsWithTooManyUnused = (vehicle) => {
    if (!vehicle.stubNumber) return false; // No stubs assigned

    const stubs = vehicle.stubNumber.split("/");
    for (const stub of stubs) {
      const unusedCount = checkUnusedWaybillCount(stub);
      if (unusedCount > 20) return true;
    }
    return false;
  };

  // Fetch all waybills from backend
  const fetchWaybills = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/waybills`
      );
      // Sort waybills by createdAt in descending order (newest first)
      const sortedWaybills = response.data.sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );
      setWaybills(sortedWaybills);
      setFilteredWaybills(sortedWaybills);

      // Group waybills by stub
      const grouped = sortedWaybills.reduce((acc, waybill) => {
        if (!acc[waybill.stub]) {
          acc[waybill.stub] = {
            stub: waybill.stub,
            totalWaybills: 0,
            totalUsed: 0,
            totalUnused: 0,
            latestCreatedAt: new Date(waybill.createdAt),
          };
        }
        acc[waybill.stub].totalWaybills++;
        if (waybill.status === "USED") {
          acc[waybill.stub].totalUsed++;
        } else if (waybill.status === "UNUSED") {
          acc[waybill.stub].totalUnused++;
        }

        // Update latest creation date if this waybill is newer
        const waybillDate = new Date(waybill.createdAt);
        if (waybillDate > acc[waybill.stub].latestCreatedAt) {
          acc[waybill.stub].latestCreatedAt = waybillDate;
        }
        return acc;
      }, {});

      // Sort grouped waybills by stub number from highest to lowest
      const sortedGrouped = Object.values(grouped).sort(
        (a, b) => parseInt(b.stub) - parseInt(a.stub)
      );

      setGroupedWaybills(sortedGrouped);
    } catch (error) {
      console.error("Error fetching waybills:", error);
      toast({
        title: "Error",
        description: "Failed to fetch waybills",
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "top-right",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch all vehicles
  const fetchVehicles = async () => {
    setIsVehiclesLoading(true);
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/trucks`
      );
      // Filter out vehicles with "Under Maintenance" status
      const activeVehicles = response.data.filter(
        (vehicle) => vehicle.status !== "Under Maintenance"
      );
      setVehicles(activeVehicles);
    } catch (error) {
      console.error("Error fetching vehicles:", error);
      toast({
        title: "Error",
        description: "Failed to fetch vehicles",
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "top-right",
      });
    } finally {
      setIsVehiclesLoading(false);
    }
  };

  // Fetch all unassigned stubs
  const fetchUnassignedStubs = async () => {
    setIsStubsLoading(true);
    try {
      // Get all stubs
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/waybills`
      );

      // Get all vehicles with stub assignments
      const vehiclesResp = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/trucks`
      );

      // Extract all assigned stubs (accounting for the 1/2/3/4 format)
      const assignedStubs = [];
      vehiclesResp.data.forEach((vehicle) => {
        if (vehicle.stubNumber) {
          // Split the stubNumber by '/' and add each to the assignedStubs array
          const stubs = vehicle.stubNumber.split("/");
          assignedStubs.push(...stubs);
        }
      });

      // Filter to get only unassigned stubs
      const unassigned = response.data
        .filter((waybill) => !assignedStubs.includes(waybill.stub))
        .map((waybill) => waybill.stub)
        // Remove duplicates
        .filter((value, index, self) => self.indexOf(value) === index);

      setUnassignedStubs(unassigned);
    } catch (error) {
      console.error("Error fetching unassigned stubs:", error);
      toast({
        title: "Error",
        description: "Failed to fetch unassigned stubs",
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "top-right",
      });
    } finally {
      setIsStubsLoading(false);
    }
  };

  // Fetch waybill company counts from billing details
  const fetchWaybillCompanyCounts = async () => {
    try {
      // Fetch all billing details
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/billingDetail`
      );

      if (response.data && response.data.length > 0) {
        // Create a map of waybill numbers to billing IDs
        const waybillToBillingIds = {};

        // Group billing IDs by waybill number
        response.data.forEach((detail) => {
          if (!waybillToBillingIds[detail.waybillNumber]) {
            waybillToBillingIds[detail.waybillNumber] = new Set();
          }
          waybillToBillingIds[detail.waybillNumber].add(detail.billingID);
        });

        // Convert sets to counts and update state
        const countsByWaybill = {};
        for (const [waybillNumber, billingIds] of Object.entries(
          waybillToBillingIds
        )) {
          countsByWaybill[waybillNumber] = billingIds.size;
        }

        setCompanyCountCache(countsByWaybill);
      }
    } catch (error) {
      console.error("Error fetching waybill company counts:", error);
    }
  };

  // Optimize the mapStubsToVehicles function for better performance
  const mapStubsToVehicles = async () => {
    setIsVehicleMappingLoading(true);
    try {
      // Start with a single debug message instead of multiple logs
      console.log("Starting vehicle mapping process...");

      // Make both API calls in parallel
      const [vehiclesResponse, waybillsResponse] = await Promise.all([
        axios.get(`${process.env.NEXT_PUBLIC_BACKEND_API}/api/trucks`),
        axios.get(`${process.env.NEXT_PUBLIC_BACKEND_API}/api/waybills`),
      ]);

      const vehiclesData = vehiclesResponse.data || [];
      const waybillsData = waybillsResponse.data || [];

      // Pre-process and create the stub mapping
      const stubToVehicleMap = {};

      // First map from trucks (faster, direct mapping)
      let stubsFromTrucks = 0;
      vehiclesData.forEach((vehicle) => {
        if (vehicle.stubNumber) {
          const stubs = vehicle.stubNumber.split("/");
          stubs.forEach((stub) => {
            stubToVehicleMap[stub] = {
              plateNumber: vehicle.plateNumber,
              bodyType: vehicle.bodyType || "N/A",
              source: "truck",
            };
            stubsFromTrucks++;
          });
        }
      });

      // Group waybills by stub for faster processing
      const waybillsByStub = {};
      waybillsData.forEach((waybill) => {
        if (!waybillsByStub[waybill.stub]) {
          waybillsByStub[waybill.stub] = [];
        }
        waybillsByStub[waybill.stub].push(waybill);
      });

      // Then check waybills - only if not already mapped from trucks
      let stubsFromWaybills = 0;
      Object.entries(waybillsByStub).forEach(([stub, waybills]) => {
        if (!stubToVehicleMap[stub]) {
          const assignedWaybill = waybills.find((w) => w.assignedVehicle);

          if (assignedWaybill && assignedWaybill.assignedVehicle) {
            if (assignedWaybill.assignedVehicleDetails) {
              stubToVehicleMap[stub] = {
                plateNumber: assignedWaybill.assignedVehicleDetails.plateNumber,
                bodyType:
                  assignedWaybill.assignedVehicleDetails.bodyType || "N/A",
                source: "waybill",
              };
            } else {
              stubToVehicleMap[stub] = {
                plateNumber: assignedWaybill.assignedVehicle,
                bodyType: "N/A",
                source: "waybill",
              };
            }
            stubsFromWaybills++;
          }
        }
      });

      // Log a summary instead of the entire map
      console.log(
        `Vehicle mapping complete! Mapped ${stubsFromTrucks} stubs from trucks and ${stubsFromWaybills} from waybills.`
      );
      setStubVehicleMap(stubToVehicleMap);
    } catch (error) {
      console.error("Error mapping stubs to vehicles:", error);
      toast({
        title: "Error",
        description: "Failed to map stubs to vehicles",
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "top-right",
      });
    } finally {
      setIsVehicleMappingLoading(false);
    }
  };

  // Add a function to fetch vehicles with retry
  const fetchVehiclesWithRetry = async (retries = 2, delay = 1000) => {
    let lastError;
    for (let i = 0; i <= retries; i++) {
      try {
        if (i > 0) {
          console.log(`Retrying vehicle fetch (attempt ${i})`);
        }
        await fetchVehicles();
        return; // Success - exit the retry loop
      } catch (error) {
        console.error(`Error fetching vehicles (attempt ${i}):`, error);
        lastError = error;
        // Wait before retrying
        if (i < retries) {
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }
    // If we get here, all retries failed
    throw lastError;
  };

  // Add a similar function for mapping stubs to vehicles
  const mapStubsToVehiclesWithRetry = async (retries = 2, delay = 1000) => {
    let lastError;
    for (let i = 0; i <= retries; i++) {
      try {
        await mapStubsToVehicles();
        return; // Success - exit the retry loop
      } catch (error) {
        console.error(`Error mapping stubs to vehicles (attempt ${i}):`, error);
        lastError = error;
        if (i < retries) {
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }
    throw lastError;
  };

  // Update the useEffect hook to implement debouncing and avoid redundant calls
  useEffect(() => {
    // Set up a loading state
    let isMounted = true;

    // First load essential data - just fetch waybills once
    const loadData = async () => {
      try {
        // Only load waybills
        await fetchWaybills();

        if (!isMounted) return;

        // Then load vehicle data with a slight delay to avoid browser blocking
        setTimeout(async () => {
          try {
            if (!isMounted) return;

            // Fetch vehicles first as this data is needed for mapping
            await fetchVehiclesWithRetry();

            if (!isMounted) return;

            // Then do vehicle mapping
            await mapStubsToVehiclesWithRetry();

            // Fetch company counts in parallel as it's less critical
            fetchWaybillCompanyCounts();
          } catch (error) {
            console.error("Error loading secondary data:", error);
          }
        }, 500);
      } catch (error) {
        console.error("Error loading initial data:", error);
      }
    };

    loadData();

    // Cleanup function to prevent state updates after unmount
    return () => {
      isMounted = false;
    };
  }, []);

  // Optimize the validate function to provide more specific error information
  const validateWaybillRange = async (stub, rangeStart, rangeEnd) => {
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/waybills/validate-range`,
        {
          stub,
          rangeStart,
          rangeEnd,
        }
      );

      return {
        conflicts: response.data.conflicts || [],
        suggestedRange: response.data.suggestedRange || null,
      };
    } catch (error) {
      console.error("Error validating waybill range:", error);
      throw new Error(
        error.response?.data?.error || "Failed to validate waybill range"
      );
    }
  };

  // Update handle range start and end change with better validation
  const handleRangeStartChange = async (e) => {
    const value = e.target.value;
    setRangeStart(value);
    setValidationError("");
  };

  const handleRangeEndChange = async (e) => {
    const value = e.target.value;
    setRangeEnd(value);
    setValidationError("");
  };

  // Add back the stub change handler
  const handleStubChange = (e) => {
    const value = e.target.value;
    setStub(value);
    setValidationError("");
  };

  // Add useEffect to trigger validation when all fields are filled
  useEffect(() => {
    const validationTimer = setTimeout(() => {
      if (stub && rangeStart && rangeEnd) {
        debounceValidation();
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(validationTimer);
  }, [stub, rangeStart, rangeEnd]);

  // Update debounced validation function with better feedback
  const debounceValidation = async () => {
    if (!stub || !rangeStart || !rangeEnd) return;

    const start = parseInt(rangeStart);
    const end = parseInt(rangeEnd);

    if (isNaN(start) || isNaN(end) || start > end) return;

    // Also validate range is exactly 50 numbers
    const rangeSize = end - start + 1;
    if (rangeSize !== 50) {
      setValidationError(
        "Range must be exactly 50 waybills. Current range has " +
          rangeSize +
          " waybills."
      );
      return;
    }

    setIsValidating(true);
    setValidationError("");

    try {
      const validation = await validateWaybillRange(stub, start, end);

      if (validation.conflicts && validation.conflicts.length > 0) {
        // Format conflicts for better display
        const uniqueStubs = [
          ...new Set(validation.conflicts.map((c) => c.stub || "unknown")),
        ];

        let errorMessage = "Duplicate waybill numbers detected in ";
        if (uniqueStubs.length === 1) {
          errorMessage += `stub ${uniqueStubs[0]}.`;
        } else {
          errorMessage += `stubs: ${uniqueStubs.join(", ")}.`;
        }

        // Add suggestion if available
        if (validation.suggestedRange) {
          errorMessage += ` Try using range ${validation.suggestedRange.start}-${validation.suggestedRange.end} instead.`;
        } else {
          // Suggest a range after the highest conflict
          const highestConflict = Math.max(
            ...validation.conflicts.map((c) => {
              // Extract number from waybill format (stub-number)
              let numberPart = 0;
              if (c.waybillNumber) {
                const parts = c.waybillNumber.split("-");
                if (parts.length > 1) {
                  numberPart = parseInt(parts[1]) || 0;
                }
              }
              return numberPart;
            })
          );

          if (highestConflict > 0) {
            const suggestedStart = highestConflict + 1;
            const suggestedEnd = suggestedStart + 49;
            errorMessage += ` Try using range ${suggestedStart}-${suggestedEnd} instead.`;
          }
        }

        setValidationError(errorMessage);
      }
    } catch (error) {
      console.error("Validation error:", error);
    } finally {
      setIsValidating(false);
    }
  };

  // Handle adding waybills with improved error handling
  const handleAddWaybill = async () => {
    try {
      // Validate input fields
      if (!stub || !rangeStart || !rangeEnd) {
        toast({
          title: "Error",
          description: "Please fill in all fields.",
          status: "error",
          duration: 3000,
          isClosable: true,
          position: "top-right",
        });
        return;
      }

      const start = parseInt(rangeStart);
      const end = parseInt(rangeEnd);

      // Validate range
      if (isNaN(start) || isNaN(end) || start > end) {
        toast({
          title: "Error",
          description:
            "Invalid range. Start must be less than or equal to end.",
          status: "error",
          duration: 3000,
          isClosable: true,
          position: "top-right",
        });
        return;
      }

      // Validate range is exactly 50 numbers
      const rangeSize = end - start + 1;
      if (rangeSize !== 50) {
        toast({
          title: "Error",
          description: `Range must be exactly 50 waybills. Current range has ${rangeSize} waybills. Please adjust your start and end values.`,
          status: "error",
          duration: 3000,
          isClosable: true,
          position: "top-right",
        });
        return;
      }

      // Show loading state
      setIsLoading(true);

      // First check for duplicates before proceeding
      try {
        const validation = await validateWaybillRange(stub.trim(), start, end);

        if (validation.conflicts && validation.conflicts.length > 0) {
          // Get unique stubs with conflicts
          const uniqueStubs = [
            ...new Set(validation.conflicts.map((c) => c.stub || "unknown")),
          ];

          // Format conflict examples
          const examples = validation.conflicts
            .slice(0, 3)
            .map((c) => {
              const waybillNumber = c.waybillNumber || c.number || "unknown";
              return waybillNumber;
            })
            .join(", ");

          let errorMessage = `The following waybill numbers already exist: ${examples}`;
          if (validation.conflicts.length > 3) {
            errorMessage += ` and ${validation.conflicts.length - 3} more`;
          }

          // Add suggestion to the error message
          if (validation.suggestedRange) {
            errorMessage += `. Try using range ${validation.suggestedRange.start}-${validation.suggestedRange.end} instead.`;
          } else {
            // Calculate a suggested range after the highest conflict
            const highestConflict = Math.max(
              ...validation.conflicts.map((c) => {
                // Extract number from waybill format (stub-number)
                let numberPart = 0;
                if (c.waybillNumber) {
                  const parts = c.waybillNumber.split("-");
                  if (parts.length > 1) {
                    numberPart = parseInt(parts[1]) || 0;
                  }
                }
                return numberPart;
              })
            );

            if (highestConflict > 0) {
              const suggestedStart = highestConflict + 1;
              const suggestedEnd = suggestedStart + 49;
              errorMessage += `. Try using range ${suggestedStart}-${suggestedEnd} instead.`;
            }
          }

          toast({
            title: `Duplicate Waybill Numbers in ${uniqueStubs.length > 1 ? "Multiple Stubs" : `Stub ${uniqueStubs[0]}`}`,
            description: errorMessage,
            status: "error",
            duration: 6000,
            isClosable: true,
            position: "top-right",
          });
          setIsLoading(false);
          return;
        }
      } catch (validationError) {
        console.error("Error validating waybill range:", validationError);
      }

      // If validation passes, continue with adding waybills
      // Prepare the request data
      const requestData = {
        stub: stub.trim(),
        rangeStart: start,
        rangeEnd: end,
        status: "UNUSED", // Add default status
      };

      // If a vehicle is selected, include it in the request
      if (selectedVehicle) {
        requestData.assignVehicle = selectedVehicle.plateNumber;
      }

      console.log("Sending request with data:", requestData);

      // Proceed with the API call
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/waybills`,
        requestData,
        {
          headers: {
            "Content-Type": "application/json",
          },
          validateStatus: function (status) {
            return status >= 200 && status < 500; // Don't reject if status is less than 500
          },
        }
      );

      // Check the response status
      if (response.status === 201) {
        // Update our cache with the new waybill numbers
        const newWaybillNumbers = new Set(existingWaybillNumbers);
        for (let i = start; i <= end; i++) {
          newWaybillNumbers.add(`${stub}-${i}`);
        }
        setExistingWaybillNumbers(newWaybillNumbers);

        // If a vehicle was assigned, update the local state to reflect this immediately
        if (selectedVehicle) {
          // Update the stubVehicleMap to show the new assignment in the UI
          setStubVehicleMap((prevMap) => {
            const newMap = { ...prevMap };
            newMap[stub] = {
              plateNumber: selectedVehicle.plateNumber,
              bodyType: selectedVehicle.bodyType || "N/A",
              source: "truck",
            };
            return newMap;
          });

          // Update waybills in our local state to include the vehicle assignment
          setWaybills((prevWaybills) => {
            return prevWaybills.map((waybill) => {
              if (waybill.stub === stub) {
                return {
                  ...waybill,
                  assignedVehicle: selectedVehicle.plateNumber,
                  assignedVehicleDetails: {
                    plateNumber: selectedVehicle.plateNumber,
                    bodyType: selectedVehicle.bodyType || "N/A",
                  },
                };
              }
              return waybill;
            });
          });

          // Update the vehicles array to reflect the new stub assignment
          setVehicles((prevVehicles) => {
            return prevVehicles.map((vehicle) => {
              if (vehicle.plateNumber === selectedVehicle.plateNumber) {
                // Get current stub numbers
                const currentStubs = vehicle.stubNumber
                  ? vehicle.stubNumber.split("/")
                  : [];

                // Only add the stub if it's not already there
                if (!currentStubs.includes(stub)) {
                  currentStubs.push(stub);
                  return {
                    ...vehicle,
                    stubNumber: currentStubs.join("/"),
                  };
                }
              }
              return vehicle;
            });
          });
        }

        toast({
          title: "Success",
          description: `Successfully added ${response.data.count} waybills!`,
          status: "success",
          duration: 3000,
          isClosable: true,
          position: "top-right",
        });

        // Reset form fields and fetch updated waybills
        setStub("");
        setRangeStart("");
        setRangeEnd("");
        setSelectedVehicle(null);
        setValidationError(""); // Clear validation errors

        // We still fetch waybills in the background for completeness
        await fetchWaybills();
        onAddModalClose();
      } else if (response.status === 400) {
        // Handle validation errors from backend
        const errorMessage = response.data.error || "Invalid request";
        const conflicts = response.data.conflicts || [];
        const partialSuccess = response.data.partialSuccess || false;
        const inserted = response.data.inserted || 0;

        if (conflicts.length > 0) {
          // Format the conflicts in a helpful way
          const examples = conflicts
            .slice(0, 3)
            .map((c) => c.waybillNumber || c)
            .join(", ");

          let description = `The following waybill numbers already exist: ${examples}`;
          if (conflicts.length > 3) {
            description += ` and ${conflicts.length - 3} more`;
          }

          // Add information about partial success
          if (partialSuccess && inserted > 0) {
            description += `. However, ${inserted} waybills were successfully added.`;
          }

          // Calculate a suggested range after the highest conflict
          const highestConflict = Math.max(
            ...conflicts.map((c) => {
              // Extract number from waybill format (stub-number)
              let numberPart = 0;
              if (typeof c === "string") {
                numberPart = parseInt(c) || 0;
              } else if (c.waybillNumber) {
                const parts = c.waybillNumber.split("-");
                if (parts.length > 1) {
                  numberPart = parseInt(parts[1]) || 0;
                } else {
                  numberPart = parseInt(c.waybillNumber) || 0;
                }
              }
              return numberPart;
            })
          );

          if (highestConflict > 0) {
            const suggestedStart = highestConflict + 1;
            const suggestedEnd = suggestedStart + 49;
            description += `. Try using range ${suggestedStart}-${suggestedEnd} instead.`;
          }

          toast({
            title: "Duplicate Waybill Numbers",
            description: description,
            status: partialSuccess ? "warning" : "error",
            duration: 6000,
            isClosable: true,
            position: "top-right",
          });

          // Even with partial success, we should refresh data
          if (partialSuccess) {
            await fetchWaybills();
          }
        } else {
          // Handle other validation errors
          toast({
            title: "Validation Error",
            description: errorMessage,
            status: "error",
            duration: 5000,
            isClosable: true,
            position: "top-right",
          });
        }
      }
    } catch (error) {
      console.error("Error adding waybills:", error);

      // Handle network errors or other unexpected errors
      const errorMessage =
        error.response?.data?.error ||
        error.message ||
        "Failed to add waybills";
      toast({
        title: "Error",
        description: errorMessage,
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "top-right",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // --- New function to update status using MongoDB _id ---
  const handleUpdateStatusById = async (id, status) => {
    try {
      // Make PUT request using the waybill's _id
      await axios.put(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/waybills/${id}`,
        { status }
      );

      // Update the state for the modal view
      setSelectedStubWaybills((prev) =>
        prev.map((waybill) =>
          waybill._id === id ? { ...waybill, status } : waybill
        )
      );

      // Also update the main waybills list for consistency
      setWaybills((prev) =>
        prev.map((waybill) =>
          waybill._id === id ? { ...waybill, status } : waybill
        )
      );

      // Refresh the grouped data (optional, but keeps counts accurate)
      fetchWaybills();

      toast({
        title: "Updated",
        description: "Waybill status updated successfully!",
        status: "success", // Changed to success for clarity
        duration: 3000,
        isClosable: true,
        position: "top-right",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update waybill status.",
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "top-right",
      });
      console.error("Error updating status by ID:", error);
    }
  };

  // Handle deleting waybills by stub number
  const handleDeleteByStub = async () => {
    if (!stubToDelete) {
      toast({
        title: "Error",
        description: "No stub selected for deletion.",
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "top-right",
      });
      return;
    }

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
        setStubToDelete(null);
        return;
      }

      const response = await axios.delete(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/waybills/stub/${stubToDelete}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Check for partial success or complete success
      if (response.status === 200 && !response.data.errors) {
        toast({
          title: "Deleted",
          description:
            response.data.message ||
            `All waybills for stub ${stubToDelete} deleted successfully and logged!`,
          status: "success", // Use success status
          duration: 3000,
          isClosable: true,
          position: "top-right",
        });
      } else if (response.status === 500 && response.data.errors) {
        toast({
          title: "Partial Deletion",
          description:
            response.data.message ||
            `Some waybills for stub ${stubToDelete} failed to delete or log. Check logs for details.`,
          status: "warning", // Use warning for partial success
          duration: 5000,
          isClosable: true,
          position: "top-right",
        });
      } else {
        // Handle unexpected success statuses or responses if necessary
        toast({
          title: "Notice",
          description: response.data.message || "Deletion process completed.",
          status: "info",
          duration: 3000,
          isClosable: true,
          position: "top-right",
        });
      }

      // Refresh data regardless of partial success
      await fetchWaybills();
      await mapStubsToVehicles(); // Refresh vehicle map as stub might be removed
    } catch (error) {
      console.error("Error deleting waybills by stub:", error);
      toast({
        title: "Error",
        description:
          error.response?.data?.message || "Failed to delete waybills by stub.",
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "top-right",
      });
    } finally {
      setIsDeletingStub(false);
      deleteStubAlertDisclosure.onClose();
      setStubToDelete(null); // Clear the stub to delete state
      // No need to reset deleteStub input here, keep it for potential re-entry
    }
  };

  // Handle opening the assign modal
  const handleOpenAssignModal = () => {
    setSelectedStub("");
    setSelectedVehicle("");
    fetchUnassignedStubs();
    onAssignModalOpen();
  };

  // Handle viewing waybill numbers for a specific stub
  const handleViewWaybills = async (stub) => {
    // <<< Make async
    const stubWaybills = waybills.filter((waybill) => waybill.stub === stub);

    // Sort waybills by their numeric part in ascending order
    const sortedWaybills = stubWaybills.sort((a, b) => {
      return getNumberPart(a.waybillNumber) - getNumberPart(b.waybillNumber); // Ascending order
    });

    setSelectedStubWaybills(sortedWaybills);
    setSelectedStubForView(stub);
    setWaybillSearch(""); // Reset waybill search when opening modal
    setShowingCompanyTable(false); // Reset company table view
    setSelectedWaybillForCompanies(null); // Reset selected waybill
    setRelevantSchedules({}); // <<< Clear previous schedules
    setIsScheduleLoading(true); // <<< Start schedule loading

    onViewWaybillsModalOpen(); // <<< Open modal immediately

    // <<< Fetch schedules for these waybills >>>
    const waybillNumbers = sortedWaybills.map((w) => w.waybillNumber);
    if (waybillNumbers.length > 0) {
      try {
        // Assume endpoint exists: POST /api/schedules/by-waybills
        const response = await axios.post(
          `${process.env.NEXT_PUBLIC_BACKEND_API}/api/schedule/by-waybills`, // <<< Use singular 'schedule'
          { waybillNumbers }
        );
        // Create a map for easy lookup: waybillNumber -> schedule object
        const scheduleMap = response.data.reduce((acc, schedule) => {
          acc[schedule.waybillNumber] = schedule;
          return acc;
        }, {});
        setRelevantSchedules(scheduleMap);
      } catch (error) {
        console.error("Error fetching relevant schedules:", error);
        toast({
          title: "Error fetching schedules",
          description:
            error.response?.data?.message ||
            "Could not load schedule details for these waybills.",
          status: "error",
          duration: 3000,
          isClosable: true,
          position: "top-right",
        });
      } finally {
        setIsScheduleLoading(false); // <<< Stop schedule loading
      }
    } else {
      setIsScheduleLoading(false); // <<< Stop loading if no waybills
    }
    // <<< End schedule fetch >>>
  };

  // Update the handleAssignStubToVehicle function to check unused waybill count
  const handleAssignStubToVehicle = async () => {
    try {
      console.log("Starting stub assignment process...");
      setIsLoading(true);

      if (!selectedStub || !selectedVehicle) {
        toast({
          title: "Warning",
          description: "Please select both a stub and a vehicle",
          status: "warning",
          duration: 3000,
          isClosable: true,
          position: "top-right",
        });
        return;
      }

      // Check if the vehicle already has a stub assigned
      const currentStubNumber = selectedVehicle.stubNumber;
      if (currentStubNumber) {
        // Split stubNumber by '/' to get individual stubs
        const vehicleStubs = currentStubNumber.split("/");

        // Check each stub's unused waybill count
        for (const vehicleStub of vehicleStubs) {
          const unusedCount = checkUnusedWaybillCount(vehicleStub);

          // If any stub has more than 20 unused waybills, don't allow assigning a new stub
          if (unusedCount > 20) {
            toast({
              title: "Warning",
              description: `Vehicle ${selectedVehicle.plateNumber} already has stub ${vehicleStub} with ${unusedCount} unused waybills. You can only assign a new stub when existing stubs have 20 or fewer unused waybills.`,
              status: "warning",
              duration: 5000,
              isClosable: true,
              position: "top-right",
            });
            setIsLoading(false);
            return;
          }
        }
      }

      // Call the backend endpoint to assign the stub
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/waybills/assign-stubs`,
        {
          stubsToAssign: [selectedStub],
          vehiclePlateNumber: selectedVehicle.plateNumber,
        }
      );

      console.log("Assignment response:", response.data);

      // Immediately update the local state for better UI responsiveness
      // 1. Update the vehicles array to reflect the new stub assignment
      setVehicles((prevVehicles) =>
        prevVehicles.map((v) =>
          v.plateNumber === selectedVehicle.plateNumber
            ? { ...v, stubNumber: response.data.vehicle.newStubNumber }
            : v
        )
      );

      // 2. Update the stubVehicleMap to show the new assignment in the UI
      setStubVehicleMap((prevMap) => {
        const newMap = { ...prevMap };
        newMap[selectedStub] = {
          plateNumber: selectedVehicle.plateNumber,
          bodyType: selectedVehicle.bodyType || "N/A",
          source: "truck",
        };
        return newMap;
      });

      // 3. Update waybills in our local state if needed
      setWaybills((prevWaybills) =>
        prevWaybills.map((waybill) =>
          waybill.stub === selectedStub
            ? {
                ...waybill,
                assignedVehicle: selectedVehicle.plateNumber,
                assignedVehicleDetails: {
                  plateNumber: selectedVehicle.plateNumber,
                  bodyType: selectedVehicle.bodyType || "N/A",
                },
              }
            : waybill
        )
      );

      // Refresh data in the background for completeness
      setTimeout(() => {
        Promise.all([fetchWaybills(), mapStubsToVehicles()]).catch((err) =>
          console.error("Error refreshing data:", err)
        );
      }, 100);

      // Show success message
      toast({
        title: "Success",
        description: `Assigned stub ${selectedStub} to vehicle ${selectedVehicle.plateNumber}. Updated ${response.data.waybillsUpdated} waybills.`,
        status: "success",
        duration: 3000,
        isClosable: true,
        position: "top-right",
      });

      // Reset selected values
      setSelectedStub("");
      setSelectedVehicle(null);
      onAssignModalClose();
    } catch (error) {
      console.error("Error in handleAssignStubToVehicle:", error);

      // Get a detailed error message from the server if available
      const errorMsg =
        error.response?.data?.error ||
        error.response?.data?.details ||
        "Failed to assign stub to vehicle";

      toast({
        title: "Error",
        description: errorMsg,
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "top-right",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Add stub to selected stubs list
  const handleAddStub = () => {
    if (!selectedStub) return;

    if (selectedStubs.includes(selectedStub)) {
      toast({
        title: "Info",
        description: "This stub is already selected.",
        status: "info",
        duration: 2000,
        isClosable: true,
        position: "top-right",
      });
      return;
    }

    setSelectedStubs([...selectedStubs, selectedStub]);
    setSelectedStub("");
  };

  // Remove stub from selected stubs list
  const handleRemoveStub = (stubToRemove) => {
    setSelectedStubs(selectedStubs.filter((stub) => stub !== stubToRemove));
  };

  // Add search handler
  const handleSearch = (e) => {
    setSearch(e.target.value);
  };

  // Filter waybills based on search
  const filteredStubs = groupedWaybills.filter((groupedWaybill) => {
    const searchTerm = search.toLowerCase();
    const stubMatch = groupedWaybill.stub.toLowerCase().includes(searchTerm);
    
    // Get vehicle info for this stub
    const vehicleInfo = stubVehicleMap[groupedWaybill.stub];
    const vehicleMatch = vehicleInfo ? 
      (vehicleInfo.plateNumber.toLowerCase().includes(searchTerm) || 
       (vehicleInfo.bodyType && vehicleInfo.bodyType.toLowerCase().includes(searchTerm))) 
      : false;

    return stubMatch || vehicleMatch;
  }).sort((a, b) => {
    // Get waybill numbers for both stubs
    const aWaybills = waybills.filter(w => w.stub === a.stub);
    const bWaybills = waybills.filter(w => w.stub === b.stub);
    
    // Get the highest waybill number for each stub
    const aHighest = Math.max(...aWaybills.map(w => getNumberPart(w.waybillNumber)));
    const bHighest = Math.max(...bWaybills.map(w => getNumberPart(w.waybillNumber)));
    
    // Sort in descending order (highest to lowest)
    return bHighest - aHighest;
  });

  // Handle adding waybill for a specific stub
  const handleAddWaybillForStub = (stub) => {
    setSelectedStubForView(stub);
    setStub(stub);
    setRangeStart("");
    setRangeEnd("");
    setSelectedVehicle(null);

    // Calculate reference information
    const currentStubNumber = parseInt(stub);
    const allStubs = [...new Set(waybills.map((waybill) => waybill.stub))];
    const numericStubs = allStubs
      .map((stub) => parseInt(stub))
      .filter((stub) => !isNaN(stub));
    numericStubs.sort((a, b) => a - b);

    // Find the highest stub number that is less than current stub
    const prevStubNumber = numericStubs
      .filter((stub) => stub < currentStubNumber)
      .pop();

    if (prevStubNumber) {
      // Found a previous stub
      setPreviousStubNumber(prevStubNumber.toString());

      // Find the highest waybill number in this stub
      const prevStubWaybills = waybills.filter(
        (waybill) => waybill.stub === prevStubNumber.toString()
      );
      if (prevStubWaybills.length > 0) {
        const waybillNumbers = prevStubWaybills.map((waybill) =>
          getNumberPart(waybill.waybillNumber)
        );
        const highestWaybillNumber = Math.max(...waybillNumbers);
        setPreviousWaybillNumber(highestWaybillNumber.toString());
      }
    } else {
      setPreviousStubNumber("-");
      setPreviousWaybillNumber("-");
    }

    // Check if current stub exists and set next waybill number
    const currentStubWaybills = waybills.filter(
      (waybill) => waybill.stub === stub
    );
    if (currentStubWaybills.length > 0) {
      const waybillNumbers = currentStubWaybills.map((waybill) =>
        getNumberPart(waybill.waybillNumber)
      );
      const highestWaybillNumber = Math.max(...waybillNumbers);
      setNextWaybillNumber((highestWaybillNumber + 1).toString());
    } else {
      setNextWaybillNumber("1");
    }

    onAddModalOpen();
  };

  // Handle waybill search in modal
  const handleWaybillSearchChange = (e) => {
    setWaybillSearch(e.target.value);
  };

  // Handle status filter change
  const handleStatusFilterChange = (e) => {
    setStatusFilter(e.target.value);
  };

  // Filter waybills in the modal based on search and status
  const modalFilteredWaybills = selectedStubWaybills
    .filter((waybill) => {
      const matchesSearch = waybill.waybillNumber
        .toLowerCase()
        .includes(waybillSearch.toLowerCase());
      const matchesStatus =
        statusFilter === "" || waybill.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      // Maintain ascending order when filtering
      return getNumberPart(a.waybillNumber) - getNumberPart(b.waybillNumber);
    });

  // Add a function to handle showing company details table
  const handleViewCompanyDetails = async (waybill) => {
    // Set the selected waybill and show company table
    setSelectedWaybillForCompanies(waybill);
    setShowingCompanyTable(true);

    try {
      // First get all billing details for this waybill number
      const detailsResponse = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/billingDetail`
      );

      // Filter to only get details for this waybill number
      const matchingDetails = detailsResponse.data.filter(
        (detail) => detail.waybillNumber === waybill.waybillNumber
      );

      if (matchingDetails && matchingDetails.length > 0) {
        // Get unique billing IDs to fetch company info
        const uniqueBillingIds = [
          ...new Set(matchingDetails.map((detail) => detail.billingID)),
        ];
        const companies = [];

        // For each unique billing ID, fetch the billing record to get company name
        for (const billingId of uniqueBillingIds) {
          try {
            const billingResponse = await axios.get(
              `${process.env.NEXT_PUBLIC_BACKEND_API}/api/billing/billingID/${billingId}`
            );

            if (billingResponse.data) {
              // Get the matching detail for status info
              const matchingDetail = matchingDetails.find(
                (d) => d.billingID === billingId
              );

              companies.push({
                name: billingResponse.data.storeName || "Unknown Company",
                status: matchingDetail ? matchingDetail.status : "Pending",
              });
            }
          } catch (err) {
            console.error(`Error fetching billing for ID ${billingId}:`, err);
          }
        }

        setCompanyList(companies);
      } else {
        // If no details found, set empty list
        setCompanyList([]);

        toast({
          title: "Information",
          description: "No companies found for this waybill",
          status: "info",
          duration: 3000,
          isClosable: true,
          position: "top-right",
        });
      }
    } catch (error) {
      console.error("Error fetching company details:", error);
      setCompanyList([]);

      toast({
        title: "Error",
        description: "Failed to fetch company details",
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "top-right",
      });
    }
  };

  // Handle going back to waybill list
  const handleBackToWaybills = () => {
    setShowingCompanyTable(false);
    setSelectedWaybillForCompanies(null);
  };

  // Define the handleAddModalClose function
  const handleAddModalClose = () => {
    setStub("");
    setRangeStart("");
    setRangeEnd("");
    setSelectedVehicle(null);
    setValidationError("");
    onAddModalClose();
  };

  // Update the getCompanyCount function to use the cached counts
  const getCompanyCount = (waybill) => {
    return companyCountCache[waybill.waybillNumber] || 0;
  };

  // Add a function to handle opening the unassign modal
  const handleOpenUnassignModal = (stub) => {
    setStubToUnassign(stub);
    onUnassignModalOpen();
  };

  // Optimize the unassign stub function for better performance
  const handleUnassignStub = async () => {
    try {
      setIsLoading(true);

      if (!stubToUnassign) {
        toast({
          title: "Error",
          description: "No stub selected for unassignment",
          status: "error",
          duration: 3000,
          isClosable: true,
          position: "top-right",
        });
        return;
      }

      console.log(`Requesting unassignment for stub ${stubToUnassign}`);

      // Call the optimized backend endpoint that handles everything
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/waybills/unassign-stub`,
        { stubToUnassign }
      );

      // Immediately update local state for faster UI feedback
      // Remove the stub from the stubVehicleMap
      setStubVehicleMap((prevMap) => {
        const newMap = { ...prevMap };
        delete newMap[stubToUnassign]; // Remove this stub from the map
        return newMap;
      });

      // If the response includes vehicle info, update the vehicles array
      if (response.data.vehicle) {
        setVehicles((prevVehicles) =>
          prevVehicles.map((v) =>
            v.plateNumber === response.data.vehicle.plateNumber
              ? { ...v, stubNumber: response.data.vehicle.newStubNumber }
              : v
          )
        );
      }

      // Update any waybills in our cache to remove the vehicle assignment
      setWaybills((prevWaybills) =>
        prevWaybills.map((waybill) =>
          waybill.stub === stubToUnassign
            ? { ...waybill, assignedVehicle: undefined }
            : waybill
        )
      );

      // Refresh data in the background (don't wait for it to complete)
      setTimeout(() => {
        // Only refresh data that might have changed
        Promise.all([fetchWaybills(), mapStubsToVehicles()]).catch((err) =>
          console.error("Error refreshing data:", err)
        );
      }, 100);

      toast({
        title: "Success",
        description: `Stub ${stubToUnassign} has been unassigned`,
        status: "success",
        duration: 3000,
        isClosable: true,
        position: "top-right",
      });

      onUnassignModalClose();
    } catch (error) {
      console.error("Error unassigning stub:", error);

      // Custom error message based on response
      const errorMsg = error.response?.data?.error
        ? error.response.data.error
        : "Failed to unassign stub";

      toast({
        title: "Error",
        description: errorMsg,
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "top-right",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlateNumberChange = async (e) => {
    const selectedPlate = e.target.value;
    setPlateNumber(selectedPlate);

    // Find the selected truck
    const selectedTruck = activeTrucks.find(
      (truck) => truck.plateNumber === selectedPlate
    );

    if (selectedTruck) {
      // Fetch the stub number for the selected vehicle
      try {
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_BACKEND_API}/api/trucks/${selectedTruck._id}`
        );
        if (response.data) {
          const stubNum = response.data.stubNumber || "";
          setStubNumber(stubNum);

          // If stub number contains multiple stubs (format: "1/2/3/4")
          if (stubNum.includes("/")) {
            const stubArray = stubNum.split("/");
            // Fetch waybills for all stubs in the array
            const waybillPromises = stubArray.map((stub) =>
              axios.get(
                `${process.env.NEXT_PUBLIC_BACKEND_API}/api/waybills?stub=${stub}&status=UNUSED`
              )
            );

            const waybillResponses = await Promise.all(waybillPromises);
            const allWaybills = waybillResponses.flatMap(
              (response) => response.data
            );

            // Remove duplicates based on waybillNumber
            const uniqueWaybills = Array.from(
              new Map(
                allWaybills.map((waybill) => [waybill.waybillNumber, waybill])
              ).values()
            );

            setFilteredWaybills(uniqueWaybills);
          } else {
            // Single stub case
            const waybillResponse = await axios.get(
              `${process.env.NEXT_PUBLIC_BACKEND_API}/api/waybills?stub=${stubNum}&status=UNUSED`
            );
            setFilteredWaybills(waybillResponse.data);
          }
        }
      } catch (error) {
        console.error("Error fetching stub number:", error);
        setStubNumber("");
        setFilteredWaybills([]);
      }
    }
  };

  // Add pagination functionality
  useEffect(() => {
    const newTotalItems = filteredStubs.length;
    const newTotalPages = Math.ceil(newTotalItems / itemsPerPage);
    setTotalItems(newTotalItems);
    setTotalPages(newTotalPages > 0 ? newTotalPages : 1); // Ensure totalPages is at least 1

    // If the current page becomes invalid after filtering/data change, reset to page 1
    if (currentPage > newTotalPages && newTotalPages > 0) {
      setCurrentPage(1);
    } else if (newTotalItems === 0) {
      // If no items, ensure current page is 1
      setCurrentPage(1);
    }
  }, [filteredStubs, itemsPerPage]); // Removed currentPage dependency

  // Get current page items
  const getCurrentPageItems = () => {
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    return filteredStubs.slice(indexOfFirstItem, indexOfLastItem);
  };

  // Handle page change
  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  // <<< Add function to fetch active trucks >>>
  const fetchActiveTrucks = async () => {
    setIsFetchingActiveTrucks(true);
    try {
      // Assumes endpoint exists: GET /api/trucks?status=Active
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/trucks?status=Active`
      );
      setActiveTrucks(response.data || []); // Ensure it's an array
    } catch (error) {
      console.error("Error fetching active trucks:", error);
      toast({
        title: "Error Fetching Trucks",
        description:
          error.response?.data?.message || "Could not load active trucks.",
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "top-right",
      });
      setActiveTrucks([]); // Reset on error
    } finally {
      setIsFetchingActiveTrucks(false);
    }
  };

  // <<< Add function to handle opening the reassign modal >>>
  const handleOpenReassignModal = async (waybill) => {
    setWaybillToReassign(waybill); // Store the waybill to be reassigned
    setSelectedReassignTruck(""); // Clear previous selection
    setIsReassignModalOpen(true); // Open the modal
    await fetchActiveTrucks(); // Fetch trucks when modal opens
  };

  // <<< Add function to close the reassign modal >>>
  const handleCloseReassignModal = () => {
    setIsReassignModalOpen(false);
    setWaybillToReassign(null);
    setActiveTrucks([]);
    setSelectedReassignTruck("");
  };

  // <<< Placeholder for the actual reassignment logic >>>
  const handleConfirmReassignment = async () => {
    if (!selectedReassignTruck || !waybillToReassign) return;

    const selectedTruckData = activeTrucks.find(
      (t) => t.plateNumber === selectedReassignTruck
    );
    const selectedDriverName =
      selectedTruckData?.driverName || "Unknown Driver";

    // Prepare reassignment data for backend
    const reassignmentData = {
      plateNumber: selectedReassignTruck,
      driverName: selectedDriverName,
    };

    setIsReassigning(true);
    console.log(
      `Reassigning waybill ${waybillToReassign.waybillNumber} (ID: ${waybillToReassign._id}) to truck ${selectedReassignTruck}`
    );

    try {
      // 1. Update Waybill status to USED and set reassignment details via backend
      const response = await axios.put(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/waybills/${waybillToReassign._id}`,
        {
          status: "USED", // Explicitly set status
          reassignment: reassignmentData, // Send reassignment details
        }
      );

      const updatedWaybill = response.data.updatedWaybill; // Get updated data from response

      // 2. Update local state immediately with data from response
      // Update the modal list
      setSelectedStubWaybills((prev) =>
        prev.map((wb) =>
          wb._id === waybillToReassign._id ? updatedWaybill : wb
        )
      );

      // Update the main waybills list
      setWaybills((prev) =>
        prev.map((wb) =>
          wb._id === waybillToReassign._id ? updatedWaybill : wb
        )
      );

      // --- Remove the relevantSchedules update ---
      // setRelevantSchedules(prev => ({
      //   ...prev,
      //   [waybillToReassign.waybillNumber]: {
      //     ...prev[waybillToReassign.waybillNumber],
      //     isBorrowed: true,
      //     vehicle: selectedReassignTruck,
      //     driver: selectedDriverName,
      //     waybillNumber: waybillToReassign.waybillNumber
      //   }
      // }));

      toast({
        title: "Reassignment Successful",
        description: `Waybill ${waybillToReassign.waybillNumber} status set to USED and reassigned to ${selectedReassignTruck}.`,
        status: "success",
        duration: 4000,
        isClosable: true,
      });

      handleCloseReassignModal();
    } catch (error) {
      console.error("Error during reassignment:", error);
      toast({
        title: "Reassignment Failed",
        description:
          error.response?.data?.message || "Could not update waybill.", // Updated message
        status: "error",
        duration: 4000,
        isClosable: true,
      });
    } finally {
      setIsReassigning(false);
    }
  };

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

      // Use a clear endpoint path with action in the query string instead of path segment
      const response = await axios.put(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/waybills/update-stub`,
        {
          currentStub: selectedStubForView,
          newStub: newStubNumber
        }
      );

      // Update local state
      setWaybills(prevWaybills =>
        prevWaybills.map(waybill =>
          waybill.stub === selectedStubForView
            ? { ...waybill, stub: newStubNumber }
            : waybill
        )
      );

      // Update stubVehicleMap
      setStubVehicleMap(prevMap => {
        const newMap = { ...prevMap };
        if (newMap[selectedStubForView]) {
          newMap[newStubNumber] = newMap[selectedStubForView];
          delete newMap[selectedStubForView];
        }
        return newMap;
      });

      // Update vehicles array
      setVehicles(prevVehicles =>
        prevVehicles.map(vehicle => {
          if (vehicle.stubNumber) {
            const stubs = vehicle.stubNumber.split("/");
            const updatedStubs = stubs.map(stub =>
              stub === selectedStubForView ? newStubNumber : stub
            );
            return { ...vehicle, stubNumber: updatedStubs.join("/") };
          }
          return vehicle;
        })
      );

      toast({
        title: "Success",
        description: `Successfully updated stub ${selectedStubForView} to ${newStubNumber}. Updated ${response.data.waybillsUpdated} waybills and ${response.data.vehiclesUpdated} vehicles.`,
        status: "success",
        duration: 3000,
        isClosable: true,
        position: "top-right",
      });

      // Reset form and close modal
      setNewStubNumber("");
      onEditStubModalClose();
      
      // Refresh data
      await fetchWaybills();
      await mapStubsToVehicles();

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
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/waybills/stubs`
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
    <Box>
      {/* Header Section */}
      <Box
        py={4}
        px={6}
        color={primaryColor}
        borderRadius="md"
        mb={6}
        borderBottom="1px solid"
        borderColor={tableBorderColor}
      >
        <Heading size="2xl" fontWeight="bold">
          Waybill Activation
        </Heading>
        <Text mt={2} fontSize="md" color="gray.600">
          Manage and activate waybill documents
        </Text>
      </Box>

      {/* Search and Action Buttons */}
      <Flex mb={6} gap={4} align="center">
        <Input
          placeholder="Search stubs..."
          value={search}
          onChange={handleSearch}
          size="lg"
          borderRadius="lg"
          focusBorderColor={primaryColor}
          _placeholder={{ color: "gray.400" }}
          leftElement={<Search2Icon color="gray.400" mr={2} />}
          variant="outline"
          borderColor="gray.300"
          _hover={{ borderColor: "gray.400" }}
          width="400px"
          boxShadow="sm"
        />
        <Button
          onClick={() => {
            // Calculate reference information for new stub
            const allStubs = [
              ...new Set(waybills.map((waybill) => waybill.stub)),
            ];
            const numericStubs = allStubs
              .map((stub) => parseInt(stub))
              .filter((stub) => !isNaN(stub));
            numericStubs.sort((a, b) => a - b);

            if (numericStubs.length > 0) {
              // Get the highest stub number
              const highestStub = numericStubs[numericStubs.length - 1];
              setPreviousStubNumber(highestStub.toString());

              // Find the highest waybill number in this stub
              const prevStubWaybills = waybills.filter(
                (waybill) => waybill.stub === highestStub.toString()
              );
              if (prevStubWaybills.length > 0) {
                const waybillNumbers = prevStubWaybills.map((waybill) =>
                  getNumberPart(waybill.waybillNumber)
                );
                const highestWaybillNumber = Math.max(...waybillNumbers);
                setPreviousWaybillNumber(highestWaybillNumber.toString());
                setNextWaybillNumber((highestWaybillNumber + 1).toString());
              }
            } else {
              // No existing stubs
              setPreviousStubNumber("-");
              setPreviousWaybillNumber("-");
              setNextWaybillNumber("1");
            }

            setSelectedStubForView("");
            setStub("");
            setRangeStart("");
            setRangeEnd("");
            onAddModalOpen();
          }}
          bg={primaryColor}
          color="white"
          _hover={{ bg: secondaryColor }}
          leftIcon={<AddIcon />}
          size="lg"
          borderRadius="lg"
          boxShadow="sm"
          px={8}
        >
          Add Waybill
        </Button>
                <Button          onClick={handleOpenAssignModal}          bg={accentColor}          color="white"          _hover={{ bg: "#990000" }}          leftIcon={<LinkIcon />}          size="lg"          borderRadius="lg"          boxShadow="sm"          px={8}        >          Assign Stub        </Button>        <Button          onClick={() => {            setSelectedStubForView("");            setNewStubNumber("");            onEditStubModalOpen();          }}          bg={secondaryColor}          color="white"          _hover={{ bg: "#1A5276" }}          leftIcon={<EditIcon />}          size="lg"          borderRadius="lg"          boxShadow="sm"          px={8}        >          Edit Stubs        </Button>      </Flex>

      {/* Pagination Information */}
      {filteredStubs.length > 0 && (
        <Flex justify="space-between" align="center" mb={4}>
          <Text fontSize="sm" color="gray.600">
            Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
            {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems}{" "}
            stubs
          </Text>
          <Flex align="center">
            <Text fontSize="sm" color="gray.600" mr={2}>
              Page {currentPage} of {totalPages}
            </Text>
            <Select
              size="sm"
              width="80px"
              value={itemsPerPage}
              onChange={(e) => {
                const newItemsPerPage = Number(e.target.value);
                const newTotalPages = Math.ceil(
                  filteredStubs.length / newItemsPerPage
                );
                const newCurrentPage = Math.min(currentPage, newTotalPages);
                setItemsPerPage(newItemsPerPage);
                setCurrentPage(newCurrentPage);
              }}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </Select>
          </Flex>
        </Flex>
      )}

      {/* Table Container */}
      <Box
        border="1px solid"
        borderColor={tableBorderColor}
        borderRadius="xl"
        overflow="hidden"
        boxShadow="sm"
        position="relative"
        height="calc(100% - 200px)"
        bg="white"
      >
        <TableContainer overflowY="auto" height="100%">
          <Table variant="simple">
            <Thead
              bg={tableHeaderBg}
              position="sticky"
              top={0}
              zIndex={1}
              boxShadow="0 1px 2px rgba(0,0,0,0.05)"
            >
              <Tr>
                {[
                  "STUB",
                  "WAYBILL NUMBERS",
                  "ASSIGNED VEHICLE",
                  "TOTAL USED",
                  "TOTAL UNUSED",
                  "TOTAL WAYBILL NUMBERS",
                  "ACTIONS",
                ].map((header) => (
                  <Th
                    key={header}
                    fontSize="sm"
                    fontWeight="semibold"
                    color="gray.700"
                    py={4}
                    textAlign="left"
                    borderBottom="2px solid"
                    borderColor={primaryColor}
                    bg={tableHeaderBg} // Added gray background to header cells
                  >
                    {header}
                  </Th>
                ))}
              </Tr>
            </Thead>
            <Tbody>
              {isLoading ? (
                <Tr>
                  <Td colSpan={7} textAlign="center" py={10}>
                    <Spinner size="xl" color={primaryColor} />
                  </Td>
                </Tr>
              ) : filteredStubs.length === 0 ? (
                <Tr>
                  <Td colSpan={7} textAlign="center" py={10}>
                    <Text color="gray.500" fontSize="lg">
                      No waybills found
                    </Text>
                  </Td>
                </Tr>
              ) : (
                getCurrentPageItems().map((groupedWaybill) => {
                  const assignedVehicle =
                    stubVehicleMap[groupedWaybill.stub] || null;

                  return (
                    <Tr
                      key={groupedWaybill.stub}
                      _hover={{ bg: hoverBg }}
                      transition="all 0.2s"
                      borderBottom="1px solid"
                      borderColor={tableBorderColor}
                      bg="white"
                    >
                      <Td fontWeight="medium" color={primaryColor}>
                        {groupedWaybill.stub}
                      </Td>
                      <Td>
                        <Button
                          onClick={() =>
                            handleViewWaybills(groupedWaybill.stub)
                          }
                          leftIcon={<ViewIcon />}
                          colorScheme="blue"
                          variant="outline"
                          size="sm"
                          _hover={{ bg: "blue.50" }}
                        >
                          {(() => {
                            // Calculate the range for this stub
                            const stubWaybills = waybills.filter(
                              (waybill) => waybill.stub === groupedWaybill.stub
                            );
                            if (stubWaybills.length === 0) return "No Waybills";

                            // Extract just the numbers from the waybill numbers
                            const numbers = stubWaybills.map((waybill) =>
                              getNumberPart(waybill.waybillNumber)
                            );

                            // Find min and max
                            const min = Math.min(...numbers);
                            const max = Math.max(...numbers);

                            return `Waybill: ${min} - ${max}`;
                          })()}
                        </Button>
                      </Td>
                      <Td>
                        {isVehicleMappingLoading ? (
                          <Skeleton height="24px" width="120px" />
                        ) : assignedVehicle ? (
                          <Flex align="center">
                            <Badge
                              colorScheme="blue"
                              variant="subtle"
                              fontSize="sm"
                              mr={2}
                              bg={`${primaryColor}20`}
                              color={primaryColor}
                            >
                              {assignedVehicle.plateNumber} (
                              {assignedVehicle.bodyType})
                            </Badge>
                            {groupedWaybill.totalUnused > 0 && (
                              <IconButton
                                aria-label="Unassign stub"
                                icon={<CloseIcon />}
                                size="xs"
                                colorScheme="red"
                                variant="ghost"
                                onClick={() =>
                                  handleOpenUnassignModal(groupedWaybill.stub)
                                }
                              />
                            )}
                          </Flex>
                        ) : (
                          <Text color="gray.500" fontSize="sm">
                            No vehicle assigned
                          </Text>
                        )}
                      </Td>
                      <Td color={primaryColor}>{groupedWaybill.totalUsed}</Td>
                      <Td color="gray.600">{groupedWaybill.totalUnused}</Td>
                      <Td fontWeight="medium" color={primaryColor}>
                        {groupedWaybill.totalWaybills}
                      </Td>
                      <Td>
                        <HStack spacing={1}>
                          {" "}
                          {/* Use HStack for button alignment */}
                          <Tooltip
                            label={
                              isDeleteApproved(groupedWaybill.stub)
                                ? "Delete approved" +
                                  (getApprovalDataForStub(groupedWaybill.stub)
                                    ?.ExpiresAt
                                    ? ` - Expires in: ${approvalTimers[getApprovalDataForStub(groupedWaybill.stub)._id] || "Calculating..."}`
                                    : " (No Expiry)")
                                : getApprovalDataForStub(groupedWaybill.stub) &&
                                    approvalTimers[
                                      getApprovalDataForStub(
                                        groupedWaybill.stub
                                      )._id
                                    ] === "Expired"
                                  ? "Delete approval has expired"
                                  : "Deletion requires approval"
                            }
                            placement="top"
                          >
                            <Box>
                              {" "}
                              {/* Wrap IconButton for Tooltip when disabled */}
                              <IconButton
                                aria-label="Delete stub"
                                icon={<DeleteIcon />}
                                size="sm"
                                colorScheme={
                                  isDeleteApproved(groupedWaybill.stub)
                                    ? "red"
                                    : getApprovalDataForStub(
                                          groupedWaybill.stub
                                        ) &&
                                        approvalTimers[
                                          getApprovalDataForStub(
                                            groupedWaybill.stub
                                          )._id
                                        ] === "Expired"
                                      ? "gray"
                                      : "gray"
                                }
                                variant="ghost"
                                onClick={() => {
                                  if (isDeleteApproved(groupedWaybill.stub)) {
                                    setStubToDelete(groupedWaybill.stub);
                                    deleteStubAlertDisclosure.onOpen();
                                  } else {
                                    handleRequestAccess(groupedWaybill.stub);
                                  }
                                }}
                                isDisabled={
                                  !isDeleteApproved(groupedWaybill.stub)
                                }
                                _hover={{ bg: "red.50" }}
                              />
                            </Box>
                          </Tooltip>
                          {!isDeleteApproved(groupedWaybill.stub) && (
                            <Tooltip
                              label="Request access to delete"
                              placement="top"
                            >
                              <IconButton
                                aria-label="Request access to delete"
                                icon={<LockIcon />}
                                size="sm"
                                colorScheme="purple"
                                variant="ghost"
                                onClick={() =>
                                  handleRequestAccess(groupedWaybill.stub)
                                }
                                _hover={{ bg: "purple.50" }}
                              />
                            </Tooltip>
                          )}
                          {/* Timer Display */}
                          {getApprovalDataForStub(groupedWaybill.stub) &&
                            getApprovalDataForStub(groupedWaybill.stub)
                              .ExpiresAt && (
                              <Badge
                                colorScheme={
                                  isDeleteApproved(groupedWaybill.stub)
                                    ? "green"
                                    : "red"
                                }
                                variant="outline"
                                fontSize="xs"
                                ml={1} // Add some margin
                              >
                                <Flex align="center">
                                  <TimeIcon mr={1} />
                                  {approvalTimers[
                                    getApprovalDataForStub(groupedWaybill.stub)
                                      ._id
                                  ] || "..."}
                                </Flex>
                              </Badge>
                            )}
                          {/* Display 'Approved (No Expiry)' if approved but no timer */}
                          {getApprovalDataForStub(groupedWaybill.stub) &&
                            !getApprovalDataForStub(groupedWaybill.stub)
                              .ExpiresAt &&
                            isDeleteApproved(groupedWaybill.stub) && (
                              <Badge
                                colorScheme="green"
                                variant="subtle"
                                fontSize="xs"
                                ml={1}
                              >
                                Approved
                              </Badge>
                            )}
                        </HStack>
                      </Td>
                    </Tr>
                  );
                })
              )}
            </Tbody>
          </Table>
        </TableContainer>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <Flex justify="center" align="center" mt={6} mb={4}>
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
              leftIcon={<ChevronLeftIcon />}
              colorScheme="blue"
              variant="outline"
            >
              Prev
            </Button>

            {/* Page Numbers */}
            {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
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
                  variant={currentPage === pageNum ? "solid" : "outline"}
                >
                  {pageNum}
                </Button>
              );
            })}

            <Button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              size="sm"
              mx={1}
              rightIcon={<ChevronRightIcon />}
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
              variant={currentPage === totalPages ? "outline" : "solid"}
            >
              Last
            </Button>
          </Flex>
        )}
      </Box>

      {/* Modal for Deleting by Stub */}
      <Modal isOpen={isDeleteModalOpen} onClose={onDeleteModalClose} size="xl">
        <ModalOverlay bg="blackAlpha.300" backdropFilter="blur(5px)" />
        <ModalContent borderRadius="xl" minW="600px" minH="250px">
          <ModalHeader
            fontSize="xl"
            fontWeight="bold"
            bg={primaryColor}
            color="white"
            borderTopRadius="xl"
            pb={4}
          >
            Delete Waybills by Stub
          </ModalHeader>
          <ModalCloseButton color="white" />
          <ModalBody py={6}>
            <FormControl isRequired>
              <FormLabel fontWeight="medium">Stub Number</FormLabel>
              <Box position="relative">
                <Input
                  placeholder="Type to search stub number"
                  value={deleteStub}
                  onChange={(e) => {
                    setDeleteStub(e.target.value);
                    setShowDropdown(true);
                  }}
                  onFocus={() => setShowDropdown(true)}
                  size="lg"
                  height="56px"
                  borderColor={
                    deleteStub &&
                    !groupedWaybills.find((g) => g.stub === deleteStub)
                      ? "red.300"
                      : "gray.300"
                  }
                  _hover={{
                    borderColor:
                      deleteStub &&
                      !groupedWaybills.find((g) => g.stub === deleteStub)
                        ? "red.400"
                        : "gray.400",
                  }}
                  pr="4.5rem"
                />
                {deleteStub && showDropdown && (
                  <Box
                    position="absolute"
                    top="100%"
                    left="0"
                    right="0"
                    mt="1"
                    bg="white"
                    borderRadius="md"
                    boxShadow="lg"
                    border="1px"
                    borderColor="gray.200"
                    maxH="200px"
                    overflowY="auto"
                    zIndex="9999"
                  >
                    {groupedWaybills
                      .filter((group) =>
                        group.stub
                          .toLowerCase()
                          .includes(deleteStub.toLowerCase())
                      )
                      .map((group) => (
                        <Box
                          key={group.stub}
                          p={3}
                          cursor="pointer"
                          _hover={{ bg: "gray.50" }}
                          onClick={() => {
                            setDeleteStub(group.stub);
                            setShowDropdown(false);
                          }}
                          borderBottom="1px"
                          borderColor="gray.100"
                          _last={{ borderBottom: "none" }}
                        >
                          <Flex justify="space-between" align="center">
                            <Text fontWeight="medium">{group.stub}</Text>
                            <Badge colorScheme="blue" variant="subtle">
                              {group.totalWaybills} waybills
                            </Badge>
                          </Flex>
                        </Box>
                      ))}
                  </Box>
                )}
              </Box>
              {deleteStub &&
                !groupedWaybills.find((g) => g.stub === deleteStub) && (
                  <Text mt={2} color="red.500" fontSize="sm">
                    This stub number does not exist. Please select from the
                    available stubs above.
                  </Text>
                )}
              {deleteStub &&
                groupedWaybills.find((g) => g.stub === deleteStub) && (
                  <Box
                    mt={2}
                    p={3}
                    bg="red.50"
                    borderRadius="md"
                    border="1px"
                    borderColor="red.200"
                  >
                    <Flex direction="column" gap={1}>
                      <Flex align="center" gap={2}>
                        <Badge colorScheme="red" variant="subtle">
                          Used:{" "}
                          {
                            groupedWaybills.find((g) => g.stub === deleteStub)
                              .totalUsed
                          }
                        </Badge>
                        <Badge colorScheme="red" variant="subtle">
                          Unused:{" "}
                          {
                            groupedWaybills.find((g) => g.stub === deleteStub)
                              .totalUnused
                          }
                        </Badge>
                      </Flex>
                      <Text fontSize="xs" color="red.700">
                        Warning: This action cannot be undone
                      </Text>
                    </Flex>
                  </Box>
                )}
            </FormControl>
          </ModalBody>
          <ModalFooter
            pb={6}
            px={6}
            borderTop="1px"
            borderColor="gray.200"
            pt={4}
          >
            <Button
              mr={3}
              onClick={handleDeleteByStub}
              size="lg"
              height="48px"
              px={6}
              colorScheme="red"
              isDisabled={
                !deleteStub ||
                !groupedWaybills.find((g) => g.stub === deleteStub)
              }
              isLoading={isLoading}
              loadingText="Deleting..."
            >
              Delete Stub
            </Button>
            <Button
              variant="ghost"
              onClick={onDeleteModalClose}
              size="lg"
              height="48px"
              px={6}
              isDisabled={isLoading}
            >
              Cancel
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Modal for Assigning Stub to Vehicle */}
      <Modal isOpen={isAssignModalOpen} onClose={onAssignModalClose} size="xl">
        <ModalOverlay />
        <ModalContent borderRadius="xl" minW="600px" minH="450px">
          <ModalHeader
            fontSize="xl"
            fontWeight="bold"
            borderBottom="1px"
            borderColor="gray.200"
            pb={4}
          >
            Assign Stub to Vehicle
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody py={6}>
            <VStack spacing={6} align="stretch">
              {/* Stub Selection Section */}
              <Box>
                <FormLabel fontWeight="medium" mb={3}>
                  Select Stub Numbers
                </FormLabel>
                <Flex mb={3} gap={2}>
                  {isStubsLoading ? (
                    <Spinner size="md" color="blue.500" />
                  ) : (
                    <>
                      <Select
                        placeholder="Select a stub number"
                        value={selectedStub}
                        onChange={(e) => setSelectedStub(e.target.value)}
                        size="lg"
                        height="56px"
                        borderColor="gray.300"
                        _hover={{ borderColor: "gray.400" }}
                        flex="1"
                      >
                        {unassignedStubs.map((stub) => (
                          <option key={stub} value={stub}>
                            {stub}
                          </option>
                        ))}
                      </Select>
                    </>
                  )}
                </Flex>

                {selectedStub && (
                  <Box
                    mt={4}
                    p={4}
                    bg="blue.50"
                    borderRadius="lg"
                    border="1px"
                    borderColor="blue.200"
                  >
                    <VStack align="stretch" spacing={3}>
                      <Flex align="center" gap={2}>
                        <InfoIcon color="blue.500" />
                        <Text fontWeight="medium" color="blue.700">
                          Selected Stub
                        </Text>
                      </Flex>
                      <Flex align="center" gap={2}>
                        <Badge
                          colorScheme="blue"
                          p={2}
                          borderRadius="md"
                          fontSize="sm"
                        >
                          {selectedStub}
                        </Badge>
                        <Text fontSize="sm" color="gray.600">
                          Unused waybills:{" "}
                          <strong>
                            {checkUnusedWaybillCount(selectedStub)}
                          </strong>
                        </Text>
                      </Flex>
                    </VStack>
                  </Box>
                )}
              </Box>

              {/* Vehicle Selection Section */}
              <Box>
                <FormLabel fontWeight="medium" mb={3}>
                  Select Vehicle
                </FormLabel>
                {isVehiclesLoading ? (
                  <Spinner size="md" color="blue.500" />
                ) : (
                  <>
                    <FormControl isRequired mb={4}>
                      <FormLabel fontWeight="medium">
                        Assign to Vehicle (Optional)
                      </FormLabel>
                      <Select
                        placeholder="Select a vehicle"
                        value={selectedVehicle?.plateNumber || ""}
                        onChange={(e) => {
                          const vehicle = vehicles.find(
                            (v) => v.plateNumber === e.target.value
                          );
                          setSelectedVehicle(vehicle || null);
                        }}
                        size="lg"
                        height="56px"
                        borderColor="gray.300"
                        _hover={{ borderColor: "gray.400" }}
                      >
                        {vehicles
                          .filter(
                            (vehicle) => !hasStubsWithTooManyUnused(vehicle)
                          )
                          .map((vehicle) => (
                            <option
                              key={vehicle.plateNumber}
                              value={vehicle.plateNumber}
                            >
                              {vehicle.plateNumber} ({vehicle.bodyType || "N/A"}
                              )
                              {vehicle.stubNumber
                                ? ` - Current stubs: ${vehicle.stubNumber}`
                                : ""}
                            </option>
                          ))}
                      </Select>
                    </FormControl>
                  </>
                )}
              </Box>
            </VStack>
          </ModalBody>
          <ModalFooter
            pb={6}
            px={6}
            borderTop="1px"
            borderColor="gray.200"
            pt={4}
          >
            <Button
              mr={3}
              onClick={handleAssignStubToVehicle}
              size="lg"
              height="48px"
              px={6}
              colorScheme="blue"
              bgGradient="linear(to-r, #143D60, #1A5276)"
              color="white"
              _hover={{ bgGradient: "linear(to-r, #1A5276, #21618C)" }}
              isDisabled={!selectedStub || !selectedVehicle}
              isLoading={isLoading}
              loadingText="Assigning..."
              leftIcon={<LinkIcon />}
            >
              Assign Stub
            </Button>
            <Button
              variant="ghost"
              onClick={onAssignModalClose}
              size="lg"
              height="48px"
              px={6}
              isDisabled={isLoading}
            >
              Cancel
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Modal for Viewing Waybill Numbers */}
      <Modal
        isOpen={isViewWaybillsModalOpen}
        onClose={onViewWaybillsModalClose}
        size="6xl"
        scrollBehavior="inside"
      >
        <ModalOverlay />
        <ModalContent borderRadius="xl" minH="500px">
          <ModalHeader fontSize="xl" fontWeight="bold">
            {showingCompanyTable
              ? `Companies/Individuals for Waybill: ${selectedWaybillForCompanies?.waybillNumber}`
              : `Waybill Numbers for Stub: ${selectedStubForView}`}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody py={6}>
            {!showingCompanyTable ? (
              <>
                <Flex mb={4} gap={4} align="center">
                  <Input
                    placeholder="Search waybill numbers..."
                    value={waybillSearch}
                    onChange={handleWaybillSearchChange}
                    size="md"
                    borderRadius="lg"
                    focusBorderColor="#143D60"
                    _placeholder={{ color: "gray.400" }}
                    leftElement={<Search2Icon color="gray.400" mr={2} />}
                    variant="filled"
                    bg="gray.50"
                    _hover={{ bg: "gray.100" }}
                    width="400px"
                  />
                  <Select
                    placeholder="Filter by status"
                    value={statusFilter}
                    onChange={handleStatusFilterChange}
                    size="md"
                    borderRadius="lg"
                    width="250px"
                    variant="filled"
                    bg="gray.50"
                    _hover={{ bg: "gray.100" }}
                  >
                    <option value="">All Statuses</option>
                    <option value="UNUSED">UNUSED</option>
                    <option value="USED">USED</option>
                  </Select>
                </Flex>
                <TableContainer maxHeight="400px" overflowY="auto">
                  <Table variant="simple">
                    <Thead bg="gray.50" position="sticky" top={0} zIndex={1}>
                      <Tr>
                        <Th
                          fontSize="sm"
                          fontWeight="semibold"
                          color="gray.700"
                        >
                          Waybill Number
                        </Th>
                        <Th
                          fontSize="sm"
                          fontWeight="semibold"
                          color="gray.700"
                        >
                          Company/Individual
                        </Th>
                        <Th
                          fontSize="sm"
                          fontWeight="semibold"
                          color="gray.700"
                        >
                          Status
                        </Th>
                        {/* <<< Add new TH here >>> */}
                        <Th
                          fontSize="sm"
                          fontWeight="semibold"
                          color="gray.700"
                        >
                          Reassignment
                        </Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {selectedStubWaybills.length === 0 ? (
                        <Tr>
                          <Td colSpan={3} textAlign="center">
                            No waybills found for this stub
                          </Td>
                        </Tr>
                      ) : modalFilteredWaybills.length === 0 ? (
                        <Tr>
                          <Td colSpan={3} textAlign="center">
                            No matching waybills found
                          </Td>
                        </Tr>
                      ) : (
                        modalFilteredWaybills.map((waybill) => (
                          <Tr key={waybill._id} _hover={{ bg: "gray.50" }}>
                            <Td>{waybill.waybillNumber}</Td>
                            <Td>
                              {waybill.status === "UNUSED" ? (
                                <Text fontSize="sm" color="green.500">
                                  Available for use
                                </Text>
                              ) : waybill.status === "USED" ? (
                                companyCountCache[waybill.waybillNumber] &&
                                companyCountCache[waybill.waybillNumber] > 0 ? (
                                  <Button
                                    size="sm"
                                    colorScheme="blue"
                                    borderRadius="md"
                                    onClick={() =>
                                      handleViewCompanyDetails(waybill)
                                    }
                                    border="1px"
                                    borderColor="blue.500"
                                    bg="white"
                                    color="blue.500"
                                    _hover={{ bg: "blue.50" }}
                                  >
                                    {companyCountCache[waybill.waybillNumber]}{" "}
                                    Company/Individual
                                  </Button>
                                ) : (
                                  <Text fontSize="sm" color="gray.500">
                                    No companies assigned
                                  </Text>
                                )
                              ) : (
                                "Not assigned"
                              )}
                            </Td>
                            <Td>
                              <Select
                                value={waybill.status}
                                onChange={(e) =>
                                  handleUpdateStatusById(
                                    waybill._id,
                                    e.target.value
                                  )
                                }
                                size="sm"
                                variant="filled"
                                bg="gray.100"
                                _hover={{ bg: "gray.200" }}
                                isDisabled={
                                  !stubVehicleMap[selectedStubForView]
                                }
                              >
                                <option value="UNUSED">UNUSED</option>
                                <option value="USED">USED</option>
                              </Select>
                              {!stubVehicleMap[selectedStubForView] && (
                                <Text fontSize="xs" color="red.500" mt={1}>
                                  Assign a vehicle first to update status
                                </Text>
                              )}
                            </Td>
                            {/* <<< Add new TD here >>> */}
                            <Td>
                              {isScheduleLoading ? (
                                <Spinner size="sm" />
                              ) : waybill.reassignment ? ( // <<< Check waybill.reassignment directly
                                <VStack align="start" spacing={0}>
                                  <Text
                                    fontSize="xs"
                                    fontWeight="medium"
                                    color="blue.600"
                                  >
                                    Reassigned To:
                                  </Text>
                                  <Text fontSize="xs">
                                    {waybill.reassignment.plateNumber}
                                  </Text>{" "}
                                  {/* Removed V: */}
                                  <Text fontSize="xs">
                                    {waybill.reassignment.driverName}
                                  </Text>{" "}
                                  {/* Removed D: */}
                                </VStack>
                              ) : relevantSchedules[waybill.waybillNumber]
                                  ?.isBorrowed ? ( // <<< Keep borrowed check (This branch might be removable later)
                                <VStack align="start" spacing={0}>
                                  <Text
                                    fontSize="xs"
                                    fontWeight="medium"
                                    color="purple.600"
                                  >
                                    Borrowed By:
                                  </Text>
                                  <Text fontSize="xs">
                                    V:{" "}
                                    {
                                      relevantSchedules[waybill.waybillNumber]
                                        .vehicle
                                    }
                                  </Text>{" "}
                                  {/* Keep V: for borrowed */}
                                  <Text fontSize="xs">
                                    D:{" "}
                                    {
                                      relevantSchedules[waybill.waybillNumber]
                                        .driver
                                    }
                                  </Text>{" "}
                                  {/* Keep D: for borrowed */}
                                </VStack>
                              ) : waybill.status === "UNUSED" ? ( // <<< Show button only if UNUSED and not reassigned/borrowed
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    handleOpenReassignModal(waybill)
                                  }
                                >
                                  Reassign
                                </Button>
                              ) : (
                                <Text fontSize="xs" color="gray.400">
                                  N/A
                                </Text> // <<< Indicate N/A if USED but not reassigned/borrowed
                              )}
                            </Td>
                          </Tr>
                        ))
                      )}
                    </Tbody>
                  </Table>
                </TableContainer>
              </>
            ) : (
              <>
                <Button
                  mb={4}
                  leftIcon={<ChevronLeftIcon />}
                  onClick={handleBackToWaybills}
                  size="sm"
                  colorScheme="blue"
                  variant="outline"
                  borderRadius="md"
                  borderColor="blue.400"
                  color="blue.600"
                  _hover={{ bg: "blue.50" }}
                  boxShadow="sm"
                  py={2}
                  px={4}
                >
                  Back to Waybill List
                </Button>
                <TableContainer maxHeight="400px" overflowY="auto">
                  <Table variant="simple">
                    <Thead bg="gray.50" position="sticky" top={0} zIndex={1}>
                      <Tr>
                        <Th
                          fontSize="sm"
                          fontWeight="semibold"
                          color="gray.700"
                        >
                          Company/Individual
                        </Th>
                        <Th
                          fontSize="sm"
                          fontWeight="semibold"
                          color="gray.700"
                        >
                          Status
                        </Th>
                        {/* <<< Add new TH here >>> */}
                        <Th
                          fontSize="sm"
                          fontWeight="semibold"
                          color="gray.700"
                        >
                          Reassignment
                        </Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {companyList.length === 0 ? (
                        <Tr>
                          <Td colSpan={2} textAlign="center">
                            No companies found for this waybill
                          </Td>
                        </Tr>
                      ) : (
                        companyList.map((company, index) => (
                          <Tr key={index} _hover={{ bg: "gray.50" }}>
                            <Td>
                              <Text
                                size="sm"
                                color="#1A5276"
                                fontWeight="semibold"
                                textTransform="uppercase"
                              >
                                {company.name}
                              </Text>
                            </Td>
                            <Td>
                              <Text
                                px={3}
                                py={1}
                                borderRadius="md"
                                fontWeight="bold"
                                fontSize="sm"
                                display="inline-block"
                                bg={
                                  company.status === "Pending"
                                    ? "yellow.100"
                                    : company.status === "Paid"
                                      ? "green.100"
                                      : company.status === "Billed"
                                        ? "purple.100"
                                        : "red.100"
                                }
                                color={
                                  company.status === "Pending"
                                    ? "yellow.800"
                                    : company.status === "Paid"
                                      ? "green.800"
                                      : company.status === "Billed"
                                        ? "purple.800"
                                        : "red.800"
                                }
                              >
                                {company.status}
                              </Text>
                            </Td>
                            {/* <<< Add new TD here >>> */}
                            <Td>
                              {/* Placeholder for Reassignment action */}
                              <Button size="sm" variant="outline">
                                Reassign
                              </Button>
                            </Td>
                          </Tr>
                        ))
                      )}
                    </Tbody>
                  </Table>
                </TableContainer>
              </>
            )}
          </ModalBody>
          <ModalFooter>
            {!showingCompanyTable && (
              <Button
                variant="ghost"
                onClick={onViewWaybillsModalClose}
                size="md"
              >
                Close
              </Button>
            )}
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Modal for Adding Waybill */}
      <Modal isOpen={isAddModalOpen} onClose={onAddModalClose} size="xl">
        <ModalOverlay />
        <ModalContent borderRadius="xl" minW="600px" minH="400px">
          <ModalHeader fontSize="xl" fontWeight="bold">
            Add Waybill
            {selectedStubForView ? ` for Stub ${selectedStubForView}` : ""}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody py={6}>
            {/* Information Display Section */}
            <Box
              mb={6}
              p={4}
              bg="gray.50"
              borderRadius="md"
              borderWidth="1px"
              borderColor="gray.200"
            >
              <Text fontWeight="bold" fontSize="md" mb={3} color="gray.700">
                Reference Information
              </Text>
              <Grid templateColumns="repeat(3, 1fr)" gap={4}>
                <Box>
                  <Text fontSize="sm" fontWeight="medium" color="gray.600">
                    Previous Stub Number
                  </Text>
                  <Text fontSize="md" fontWeight="bold" color="blue.600">
                    {previousStubNumber}
                  </Text>
                </Box>
                <Box>
                  <Text fontSize="sm" fontWeight="medium" color="gray.600">
                    Previous Waybill Number
                  </Text>
                  <Text fontSize="md" fontWeight="bold" color="blue.600">
                    {previousWaybillNumber}
                  </Text>
                </Box>
                <Box>
                  <Text fontSize="sm" fontWeight="medium" color="gray.600">
                    Next Waybill Number
                  </Text>
                  <Text fontSize="md" fontWeight="bold" color="green.600">
                    {nextWaybillNumber}
                  </Text>
                </Box>
              </Grid>
            </Box>

            <FormControl isRequired mb={4}>
              <FormLabel fontWeight="medium">Stub Number</FormLabel>
              <Input
                type="number"
                placeholder="Enter Stub Number"
                value={stub}
                onChange={handleStubChange}
                size="lg"
                height="56px"
                borderColor={validationError ? "red.300" : "gray.300"}
                _hover={{
                  borderColor: validationError ? "red.400" : "gray.400",
                }}
                isReadOnly={false}
                min="0"
                pattern="[0-9]*"
                onKeyPress={(e) => {
                  if (!/[0-9]/.test(e.key)) {
                    e.preventDefault();
                  }
                }}
              />
            </FormControl>

            <FormControl mb={4}>
              <FormLabel fontWeight="medium">
                Assign to Vehicle (Optional)
              </FormLabel>
              <Select
                placeholder="Select a vehicle"
                value={selectedVehicle?.plateNumber || ""}
                onChange={(e) => {
                  const vehicle = vehicles.find(
                    (v) => v.plateNumber === e.target.value
                  );
                  setSelectedVehicle(vehicle || null);
                }}
                size="lg"
                height="56px"
                borderColor="gray.300"
                _hover={{ borderColor: "gray.400" }}
              >
                {vehicles
                  .filter((vehicle) => !hasStubsWithTooManyUnused(vehicle))
                  .map((vehicle) => (
                    <option
                      key={vehicle.plateNumber}
                      value={vehicle.plateNumber}
                    >
                      {vehicle.plateNumber} ({vehicle.bodyType || "N/A"})
                      {vehicle.stubNumber
                        ? ` - Current stubs: ${vehicle.stubNumber}`
                        : ""}
                    </option>
                  ))}
              </Select>
            </FormControl>

            <FormControl isRequired mb={4}>
              <FormLabel fontWeight="medium">Range Start</FormLabel>
              <Input
                type="number"
                placeholder="Enter Range Start"
                value={rangeStart}
                onChange={handleRangeStartChange}
                size="lg"
                height="56px"
                borderColor={validationError ? "red.300" : "gray.300"}
                _hover={{
                  borderColor: validationError ? "red.400" : "gray.400",
                }}
              />
            </FormControl>
            <FormControl isRequired mb={4}>
              <FormLabel fontWeight="medium">Range End</FormLabel>
              <Input
                type="number"
                placeholder="Enter Range End"
                value={rangeEnd}
                onChange={handleRangeEndChange}
                size="lg"
                height="56px"
                borderColor={validationError ? "red.300" : "gray.300"}
                _hover={{
                  borderColor: validationError ? "red.400" : "gray.400",
                }}
              />
            </FormControl>
            {isValidating && (
              <Flex align="center" color="blue.500" mt={2} mb={2}>
                <Spinner size="sm" mr={2} />
                <Text>Validating waybill range...</Text>
              </Flex>
            )}
            {validationError && (
              <Text color="red.500" mt={2} mb={2}>
                {validationError}
              </Text>
            )}
          </ModalBody>
          <ModalFooter pb={6} px={6}>
            <Button
              mr={3}
              onClick={handleAddWaybill}
              size="lg"
              height="48px"
              px={6}
              variant="outline"
              _hover={{ bg: "gray.50" }}
              isDisabled={isValidating || !!validationError}
            >
              Save
            </Button>
            <Button
              variant="ghost"
              onClick={onAddModalClose}
              size="lg"
              height="48px"
              px={6}
            >
              Cancel
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Modal for Unassigning Stub */}
      <Modal
        isOpen={isUnassignModalOpen}
        onClose={onUnassignModalClose}
        size="md"
      >
        <ModalOverlay />
        <ModalContent borderRadius="xl">
          <ModalHeader fontSize="xl" fontWeight="bold">
            Unassign Stub
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody py={6}>
            <Text mb={4}>
              Are you sure you want to unassign stub{" "}
              <strong>{stubToUnassign}</strong> from its vehicle?
            </Text>
            <Text color="gray.600" fontSize="sm">
              This will remove the vehicle assignment from all waybills with
              this stub.
            </Text>
          </ModalBody>
          <ModalFooter>
            <Button
              onClick={handleUnassignStub}
              colorScheme="red"
              mr={3}
              isLoading={isLoading}
            >
              Unassign
            </Button>
            <Button variant="ghost" onClick={onUnassignModalClose}>
              Cancel
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* <<< Delete Stub Confirmation Dialog >>> */}
      <AlertDialog
        isOpen={deleteStubAlertDisclosure.isOpen}
        leastDestructiveRef={cancelRef}
        onClose={deleteStubAlertDisclosure.onClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete Stub "{stubToDelete}"
            </AlertDialogHeader>

            <AlertDialogBody>
              Are you sure you want to delete all waybills associated with stub{" "}
              <strong>{stubToDelete}</strong>? This will also remove the stub
              from any assigned vehicles. This action cannot be undone, but the
              data will be moved to the delete logs.
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button
                ref={cancelRef}
                onClick={deleteStubAlertDisclosure.onClose}
                isDisabled={isDeletingStub}
              >
                Cancel
              </Button>
              <Button
                colorScheme="red"
                onClick={handleDeleteByStub}
                ml={3}
                isLoading={isDeletingStub}
                loadingText="Deleting..."
              >
                Delete Stub
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
      {/* <<< End Delete Stub Confirmation Dialog >>> */}

      {/* <<< Add Reassignment Modal >>> */}
      <Modal
        isOpen={isReassignModalOpen}
        onClose={handleCloseReassignModal}
        size="lg"
      >
        <ModalOverlay />
        <ModalContent borderRadius="xl">
          <ModalHeader fontSize="lg" fontWeight="bold">
            Reassign Waybill {waybillToReassign?.waybillNumber}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody py={5}>
            <Text mb={4}>
              Select an active vehicle to reassign this waybill to:
            </Text>
            {isFetchingActiveTrucks ? (
              <Center>
                <Spinner />
              </Center>
            ) : (
              <FormControl isRequired>
                <FormLabel>Active Vehicle</FormLabel>
                <Select
                  placeholder="Select vehicle"
                  value={selectedReassignTruck}
                  onChange={(e) => setSelectedReassignTruck(e.target.value)}
                  size="lg"
                >
                  {activeTrucks.length === 0 && (
                    <option disabled>No active trucks found</option>
                  )}
                  {activeTrucks.map((truck) => (
                    <option key={truck.plateNumber} value={truck.plateNumber}>
                      {truck.plateNumber} ({truck.driverName})
                    </option>
                  ))}
                </Select>
              </FormControl>
            )}
          </ModalBody>
          <ModalFooter borderTop="1px" borderColor="gray.200">
            <Button
              variant="ghost"
              mr={3}
              onClick={handleCloseReassignModal}
              isDisabled={isReassigning}
            >
              Cancel
            </Button>
            <Button
              colorScheme="blue"
              onClick={handleConfirmReassignment}
              isLoading={isReassigning}
              isDisabled={isFetchingActiveTrucks || !selectedReassignTruck}
              loadingText="Reassigning..."
            >
              Confirm Reassignment
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      {/* <<< End Reassignment Modal >>> */}

      {/* Add Request Access Modal */}
      <Modal
        isOpen={isRequestAccessModalOpen}
        onClose={() => setIsRequestAccessModalOpen(false)}
        size="md"
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Request Access</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {stubForAccessRequest && (
              <>
                <Text mb={4}>
                  You are requesting access to delete stub:{" "}
                  <Text as="span" fontWeight="bold">
                    {stubForAccessRequest}
                  </Text>
                </Text>

                <FormControl>
                  <FormLabel>Remarks (reason for request):</FormLabel>
                  <Textarea
                    value={accessRemarks}
                    onChange={(e) => setAccessRemarks(e.target.value)}
                    placeholder="Please explain why you need to delete this stub"
                  />
                </FormControl>
              </>
            )}
          </ModalBody>

          <ModalFooter>
            <Button
              colorScheme="gray"
              mr={3}
              onClick={() => setIsRequestAccessModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              colorScheme="purple"
              onClick={submitAccessRequest}
              isDisabled={!accessRemarks}
            >
              Submit Request
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Add Edit Stub Modal */}
      <Modal isOpen={isEditStubModalOpen} onClose={() => {
        onEditStubModalClose();
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
                  {groupedWaybills.map((group) => (
                    <option key={group.stub} value={group.stub}>
                      {group.stub} ({group.totalWaybills} waybills)
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
                onEditStubModalClose();
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

export default Waybill;
