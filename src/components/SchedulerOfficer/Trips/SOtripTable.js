import { useState, useEffect, useRef } from "react";
import {
  Box,
  Button,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  useToast,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  ModalFooter,
  FormControl,
  FormLabel,
  Input,
  Select,
  IconButton,
  Flex,
  Text,
  HStack,
  Center,
  Spinner,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  Badge,
  TableContainer,
  VStack,
  Heading,
  Grid,
  Icon,
  Tooltip,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  Textarea,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverHeader,
  PopoverBody,
  PopoverFooter,
  PopoverArrow,
  PopoverCloseButton,
} from "@chakra-ui/react";
import {
  EditIcon,
  DeleteIcon,
  ViewIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CloseIcon,
  Search2Icon,
  AddIcon,
  SearchIcon,
  TriangleDownIcon,
  TriangleUpIcon,
  LockIcon,
} from "@chakra-ui/icons";
import axios from "axios";
import TripDetails from "./SOTripDetail";
import TripExpense from "./SOtripExpense";
import SetArrivalDateModal from "./SOsetArrival";
import { css } from "@emotion/react";
import { useRouter } from "next/router";
import { FiClock } from "react-icons/fi";

const hoverEffect = css`
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    cursor: pointer;
    position: relative;
    z-index: 1;
  }
`;

// Add a new CSS class for responsive design
const responsiveTable = css`
  width: 100%;
  overflow-x: auto; // Allow horizontal scrolling if needed
`;

// Add formatRemainingTime function
const formatRemainingTime = (milliseconds) => {
  if (milliseconds <= 0) return "00:00:00";
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
};

const Trips = () => {
  const router = useRouter();
  const [trips, setTrips] = useState([]); // Initialize as empty array
  const [stubs, setStubs] = useState([]);
  const [filteredTrips, setFilteredTrips] = useState([]);
  const [formData, setFormData] = useState({
    tripID: "",
    scheduleID: "",
    vehicle: "",
    driver: "",
    loadingDate: "",
    arrivalDate: "",
    stubNumber: "",
    status: "On-Delivery",
    waybillNumber: "",
    referenceNumber: "",
  });
  const [editingId, setEditingId] = useState(null);
  const [selectedTripID, setSelectedTripID] = useState(null);
  const [selectedStubNumber, setSelectedStubNumber] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const {
    isOpen: isTripModalOpen,
    onOpen: onTripModalOpen,
    onClose: onTripModalClose,
  } = useDisclosure();
  const [tripDetails, setTripDetails] = useState([]);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const {
    isOpen: isDetailModalOpen,
    onOpen: onDetailModalOpen,
    onClose: onDetailModalClose,
  } = useDisclosure();
  const {
    isOpen: isExpenseModalOpen,
    onOpen: onExpenseModalOpen,
    onClose: onExpenseModalClose,
  } = useDisclosure();
  const toast = useToast();
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTrips, setTotalTrips] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [waybillNumbers, setWaybillNumbers] = useState([]);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [hoveredTrip, setHoveredTrip] = useState(null);
  const {
    isOpen: isHoverModalOpen,
    onOpen: onHoverModalOpen,
    onClose: onHoverModalClose,
  } = useDisclosure();
  const [hoverTimeout, setHoverTimeout] = useState(null);
  const [isHovering, setIsHovering] = useState(false);
  const [currentHoveredTrip, setCurrentHoveredTrip] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedTripForArrival, setSelectedTripForArrival] = useState(null);
  const {
    isOpen: isArrivalDateModalOpen,
    onOpen: onArrivalDateModalOpen,
    onClose: onArrivalDateModalClose,
  } = useDisclosure();
  const [selectedArrivalDate, setSelectedArrivalDate] = useState("");
  const [editingLoadingDate, setEditingLoadingDate] = useState(null);
  const [tempLoadingDate, setTempLoadingDate] = useState("");
  const [sortField, setSortField] = useState("_id");
  const [sortDirection, setSortDirection] = useState("desc");
  const [tripToDelete, setTripToDelete] = useState(null);
  const deleteTripAlertDisclosure = useDisclosure();
  const cancelRef = useRef();
  const [isDeletingTrip, setIsDeletingTrip] = useState(false);
  const [searchMode, setSearchMode] = useState("trip"); // 'trip' or 'waybill'
  const [isDeleteRequestOpen, setIsDeleteRequestOpen] = useState(false);
  const [deleteRequestRemarks, setDeleteRequestRemarks] = useState("");
  const [isSubmittingDeleteRequest, setIsSubmittingDeleteRequest] =
    useState(false);
  const [isTripDeleteApproved, setIsTripDeleteApproved] = useState(false);
  const [tripDeleteExpirationTime, setTripDeleteExpirationTime] =
    useState(null);
  const [tripDeleteTimerDisplay, setTripDeleteTimerDisplay] = useState(null);
  const tripDeleteTimerIntervalRef = useRef(null);

  // Initialization effect - runs once on component mount
  useEffect(() => {
    // Set default sort order to _id descending (newest first)
    // fetchTrips will be called by other useEffect hooks
  }, []);

  const fetchTrips = async () => {
    try {
      setIsLoading(true);
      let allFetchedTrips = [];

      if (searchMode === "trip") {
        // Fetch ALL trips matching search term from backend, include sorting
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_BACKEND_API}/api/trips?limit=100000&search=${searchTerm}&sortField=${sortField}&sortDirection=${sortDirection}`
        );
        allFetchedTrips = Array.isArray(response.data.trips)
          ? response.data.trips
          : [];
      } else {
        // searchMode === "waybill"
        // Fetch all tripDetails
        const tripDetailsResponse = await axios.get(
          `${process.env.NEXT_PUBLIC_BACKEND_API}/api/tripDetails`
        );
        const allTripDetails = tripDetailsResponse.data;

        // Fetch ALL trips from backend by requesting a very large limit
        const allBackendTripsResponse = await axios.get(
          `${process.env.NEXT_PUBLIC_BACKEND_API}/api/trips?limit=100000` // Fetch a large number
        );
        const allBackendTrips = Array.isArray(
          allBackendTripsResponse.data.trips
        )
          ? allBackendTripsResponse.data.trips
          : [];

        if (searchTerm.trim() === "") {
          allFetchedTrips = allBackendTrips;
        } else {
          const waybillFilteredDetails = allTripDetails.filter((detail) =>
            detail.waybillNumber
              .toLowerCase()
              .includes(searchTerm.toLowerCase())
          );
          const relevantTripIDs = [
            ...new Set(waybillFilteredDetails.map((detail) => detail.tripID)),
          ];
          allFetchedTrips = allBackendTrips.filter((trip) =>
            relevantTripIDs.includes(trip.tripID)
          );
        }
      }

      setTrips(allFetchedTrips); // Store all fetched/filtered trips
      setTotalTrips(allFetchedTrips.length);
      setTotalPages(Math.ceil(allFetchedTrips.length / itemsPerPage) || 1);
    } catch (error) {
      console.error("Error fetching trips:", error);
      toast({
        title: "Error",
        description: "Failed to fetch trips",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      setTrips([]);
      setTotalPages(1);
      setTotalTrips(0);
    } finally {
      setIsLoading(false);
    }
  };

  // Effect to reset current page when search/filter/sort criteria change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, searchMode, sortField, sortDirection]);

  // Effect to fetch trips when search/filter/sort criteria change
  useEffect(() => {
    fetchTrips();
  }, [searchTerm, searchMode, sortField, sortDirection]);

  useEffect(() => {
    fetchTripDetails(); // This fetches all trip details for other uses, like hover preview.
  }, []); // Fetch once on mount or if it needs to be dynamic, adjust dependencies.

  useEffect(() => {
    if (!router.isReady) return;

    const { modal, tripId } = router.query;

    if (modal === "details" && tripId) {
      const tripExists = trips.some((trip) => trip.tripID === tripId);
      if (tripExists) {
        setSelectedTripID(tripId);
        onDetailModalOpen();
      } else {
        console.warn(`Trip ID ${tripId} not found for details modal.`);
        router.push({ pathname: router.pathname, query: {} }, undefined, {
          shallow: true,
        });
      }
    } else if (modal === "expenses" && tripId) {
      const tripExists = trips.some((trip) => trip.tripID === tripId);
      if (tripExists) {
        setSelectedTripID(tripId);
        onExpenseModalOpen();
      } else {
        console.warn(`Trip ID ${tripId} not found for expenses modal.`);
        router.push({ pathname: router.pathname, query: {} }, undefined, {
          shallow: true,
        });
      }
    } else {
      onDetailModalClose();
      onExpenseModalClose();
    }
  }, [router.isReady, router.query, trips]);

  const fetchTripDetails = async () => {
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/tripDetails`
      );
      setTripDetails(response.data);
    } catch (error) {
      console.error("Error fetching trip details:", error);
      toast({
        title: "Error",
        description: "Failed to fetch trip details",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  // Update filtering and pagination logic - THIS IS THE MAIN CLIENT-SIDE LOGIC NOW
  useEffect(() => {
    let displayTrips = [...trips]; // 'trips' is the full list relevant to current search/mode

    // Client-side sorting.
    if (sortField) {
      displayTrips.sort((a, b) => {
        let valueA, valueB;
        if (sortField === "loadingDate" || sortField === "arrivalDate") {
          if (sortField === "arrivalDate") {
            const aIsNull = a.arrivalDate === "00/00/0000" || !a.arrivalDate;
            const bIsNull = b.arrivalDate === "00/00/0000" || !b.arrivalDate;
            if (aIsNull && bIsNull) return 0;
            if (aIsNull) return sortDirection === "asc" ? 1 : -1;
            if (bIsNull) return sortDirection === "asc" ? -1 : 1;
          }
          try {
            valueA = new Date(a[sortField]).getTime();
            valueB = new Date(b[sortField]).getTime();
            if (isNaN(valueA))
              valueA = sortDirection === "asc" ? Infinity : -Infinity;
            if (isNaN(valueB))
              valueB = sortDirection === "asc" ? Infinity : -Infinity;
          } catch (e) {
            // Fallback for invalid dates
            valueA = sortDirection === "asc" ? Infinity : -Infinity;
            valueB = sortDirection === "asc" ? Infinity : -Infinity;
          }
        } else if (sortField === "_id") {
          valueA = a._id;
          valueB = b._id;
        } else if (sortField === "tripID") {
          valueA = parseInt(String(a.tripID || "T0").slice(1), 10);
          valueB = parseInt(String(b.tripID || "T0").slice(1), 10);
        } else {
          valueA = String(a[sortField] || "").toLowerCase();
          valueB = String(b[sortField] || "").toLowerCase();
        }

        if (valueA < valueB) return sortDirection === "asc" ? -1 : 1;
        if (valueA > valueB) return sortDirection === "asc" ? 1 : -1;
        return 0;
      });
    }

    // Paginate the sorted full list
    const startIdx = (currentPage - 1) * itemsPerPage;
    const endIdx = startIdx + itemsPerPage;
    setFilteredTrips(displayTrips.slice(startIdx, endIdx));

    // totalTrips and totalPages are set by fetchTrips based on the full list length.
  }, [trips, currentPage, itemsPerPage, sortField, sortDirection]);

  const getNextTripID = () => {
    if (trips.length === 0) return "T0001";
    const maxID = trips.reduce((max, trip) => {
      const numericPart = parseInt(trip.tripID.slice(1), 10);
      return numericPart > max ? numericPart : max;
    }, 0);
    return `T${String(maxID + 1).padStart(4, "0")}`;
  };

  const handleSubmit = async () => {
    try {
      // Helper function to format date for submission
      const formatDateForSubmission = (dateString) => {
        if (!dateString || dateString === "") return "00/00/0000";
        const date = new Date(dateString);
        return isNaN(date.getTime()) ? "00/00/0000" : date.toISOString();
      };

      // Don't automatically change status based on arrival date
      // Let user manually control status through the status dropdown

      const formattedData = {
        tripID: formData.tripID,
        scheduleID: formData.scheduleID,
        vehicle: formData.vehicle,
        driver: formData.driver,
        loadingDate: formatDateForSubmission(formData.loadingDate),
        arrivalDate: formatDateForSubmission(formData.arrivalDate),
        stubNumber: formData.stubNumber || "", // Provide empty string as fallback
        status: formData.status, // Keep the current status value
        waybillNumber: formData.waybillNumber,
        referenceNumber: formData.referenceNumber,
      };

      console.log("Submitting trip data:", formattedData); // Debug log

      if (editingId) {
        console.log("Updating trip with ID:", editingId); // Debug log
        const response = await axios.put(
          `${process.env.NEXT_PUBLIC_BACKEND_API}/api/trips/${editingId}`,
          formattedData
        );
        console.log("Update response:", response.data); // Debug log

        if (response.status === 200) {
          toast({
            title: "Success",
            description: "Trip updated successfully!",
            status: "success",
            duration: 2000,
          });
          await fetchTrips(); // Refresh the trips list
          resetForm();
          onTripModalClose();
        }
      } else {
        const newTrip = { ...formattedData, tripID: getNextTripID() };
        console.log("Creating new trip:", newTrip); // Debug log
        const response = await axios.post(
          `${process.env.NEXT_PUBLIC_BACKEND_API}/api/trips`,
          newTrip
        );
        console.log("Create response:", response.data); // Debug log

        if (response.status === 201) {
          toast({
            title: "Success",
            description: "Trip created successfully!",
            status: "success",
            duration: 2000,
          });
          await fetchTrips(); // Refresh the trips list
          resetForm();
          onTripModalClose();
        }
      }
    } catch (error) {
      console.error("Error saving trip:", error.response || error);
      toast({
        title: "Error saving trip",
        description:
          error.response?.data?.message ||
          error.message ||
          "Failed to save trip",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleDeleteTripClick = (trip) => {
    setTripToDelete(trip);
    deleteTripAlertDisclosure.onOpen();
  };

  const confirmDeleteTrip = async () => {
    if (!tripToDelete) return;
    setIsDeletingTrip(true);

    // Create state variables for deletion progress
    let deletionSteps = 0;
    let totalSteps = 1; // Start with at least one step (trip)

    const updateDeleteStatus = (message) => {
      console.log(message);
      // Could add additional state update logic here if needed
    };

    try {
      console.log(
        "Starting cascading deletion for trip ID:",
        tripToDelete.tripID
      );
      updateDeleteStatus(`Deleting trip ${tripToDelete.tripID}...`);

      const token = localStorage.getItem("token");
      if (!token) {
        toast({
          title: "Error",
          description: "Authentication token not found. Please log in.",
          status: "error",
        });
        setIsDeletingTrip(false);
        deleteTripAlertDisclosure.onClose();
        setTripToDelete(null);
        return;
      }

      // Step 1: Get all trip details for this trip
      console.log("Finding trip details for trip:", tripToDelete.tripID);
      updateDeleteStatus("Finding trip details...");
      const tripDetailsResponse = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/tripDetails`
      );
      const tripDetails = tripDetailsResponse.data.filter(
        (detail) => detail.tripID === tripToDelete.tripID
      );
      console.log(
        `Found ${tripDetails.length} trip details for trip:`,
        tripToDelete.tripID
      );
      updateDeleteStatus(`Found ${tripDetails.length} trip details to delete`);

      // Add trip details to total steps
      totalSteps += tripDetails.length;

      // Step 2: Delete associated data for each trip detail
      let detailCounter = 0;
      for (const detail of tripDetails) {
        detailCounter++;
        const waybillNumber = detail.waybillNumber;
        console.log("Processing deletion for waybill:", waybillNumber);
        updateDeleteStatus(
          `Processing waybill ${detailCounter} of ${tripDetails.length}: ${waybillNumber}`
        );

        // Step A: Delete shipper info for the waybill
        try {
          console.log("Deleting shipper info for waybill:", waybillNumber);
          await axios.delete(
            `${process.env.NEXT_PUBLIC_BACKEND_API}/api/shipperInfo/${waybillNumber}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          console.log("Shipper info deleted for waybill:", waybillNumber);
        } catch (error) {
          console.error(
            `Error deleting shipper info for waybill ${waybillNumber}:`,
            error
          );
          // Continue with other deletions
        }

        // Step B: Get and delete consignee info for the waybill
        try {
          console.log("Getting consignee info for waybill:", waybillNumber);
          const consigneesResponse = await axios.get(
            `${process.env.NEXT_PUBLIC_BACKEND_API}/api/consigneeInfo/${waybillNumber}`
          );
          const consignees = consigneesResponse.data || [];

          // Step B.1: Delete subdetails for each consignee in this waybill
          try {
            console.log("Deleting subdetails for waybill:", waybillNumber);

            // Delete subdetails for each consignee
            for (const consignee of consignees) {
              console.log(
                `Deleting subdetails for consignee ${consignee.consignee} of waybill:`,
                waybillNumber
              );
              try {
                await axios.delete(
                  `${process.env.NEXT_PUBLIC_BACKEND_API}/api/subdetails/byConsignee/${waybillNumber}/${encodeURIComponent(consignee.consignee)}`,
                  { headers: { Authorization: `Bearer ${token}` } }
                );
              } catch (subdetailError) {
                // Handle 404 errors gracefully - no subdetails found is not a problem
                if (
                  subdetailError.response &&
                  subdetailError.response.status === 404
                ) {
                  console.log(
                    `No subdetails found for consignee ${consignee.consignee} - this is normal`
                  );
                } else {
                  console.error(
                    `Error deleting subdetails for consignee ${consignee.consignee}:`,
                    subdetailError
                  );
                }
                // Continue with other consignees regardless
              }
            }

            console.log("Subdetails deleted for waybill:", waybillNumber);
          } catch (error) {
            console.error(
              `Error in subdetails deletion process for waybill ${waybillNumber}:`,
              error
            );
            // Continue with other deletions
          }

          // Step B.2: Delete entity abbreviation summaries for this waybill
          try {
            console.log(
              "Deleting entity abbreviation summaries for waybill:",
              waybillNumber
            );
            try {
              await axios.delete(
                `${process.env.NEXT_PUBLIC_BACKEND_API}/api/entityAbbreviationSummary/waybill/${waybillNumber}`,
                { headers: { Authorization: `Bearer ${token}` } }
              );
              console.log(
                "Entity abbreviation summaries deleted for waybill:",
                waybillNumber
              );
            } catch (axiosError) {
              // Handle 404 errors gracefully - it's okay if there are no entity abbreviation summaries
              if (axiosError.response && axiosError.response.status === 404) {
                console.log(
                  `No entity abbreviation summaries found for waybill ${waybillNumber} - this is normal`
                );
              } else {
                throw axiosError; // Re-throw for the outer catch to handle
              }
            }
          } catch (error) {
            console.error(
              `Error deleting entity abbreviation summaries for waybill ${waybillNumber}:`,
              error
            );
            // Continue with other deletions
          }

          // Step B.3: Delete each consignee
          for (const consignee of consignees) {
            console.log(
              `Deleting consignee ${consignee.consignee} for waybill:`,
              waybillNumber
            );
            try {
              await axios.delete(
                `${process.env.NEXT_PUBLIC_BACKEND_API}/api/consigneeInfo/${waybillNumber}/${encodeURIComponent(consignee.consignee)}`,
                { headers: { Authorization: `Bearer ${token}` } }
              );
              console.log(
                `Deleted consignee ${consignee.consignee} for waybill:`,
                waybillNumber
              );
            } catch (consigneeError) {
              console.error(
                `Error deleting consignee ${consignee.consignee}:`,
                consigneeError
              );
              // Continue with other consignees
            }
          }
        } catch (error) {
          console.error(
            `Error in consignee deletion process for waybill ${waybillNumber}:`,
            error
          );
          // Continue with other deletions
        }

        // Step C: Reset waybill status to UNUSED
        try {
          console.log("Resetting waybill status to UNUSED:", waybillNumber);
          await axios.put(
            `${process.env.NEXT_PUBLIC_BACKEND_API}/api/waybills/number/${waybillNumber}`,
            { status: "UNUSED" },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          console.log("Reset waybill status to UNUSED:", waybillNumber);
        } catch (error) {
          console.error(
            `Error resetting waybill status for ${waybillNumber}:`,
            error
          );
          // Continue with other deletions
        }

        // Step D: Delete trip detail
        try {
          console.log("Deleting trip detail:", detail._id);
          updateDeleteStatus(`Deleting trip detail: ${detail.tripDetailID}`);
          await axios.delete(
            `${process.env.NEXT_PUBLIC_BACKEND_API}/api/tripDetails/${detail._id}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          console.log("Trip detail deleted:", detail._id);
          deletionSteps++;
          updateDeleteStatus(
            `Completed deletion step ${deletionSteps} of ${totalSteps}`
          );
        } catch (error) {
          console.error(`Error deleting trip detail ${detail._id}:`, error);
          // Continue with other deletions
        }
      }

      // Step 3: Delete the trip
      console.log("Deleting trip:", tripToDelete._id);
      updateDeleteStatus(`Deleting trip: ${tripToDelete.tripID}`);
      const response = await axios.delete(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/trips/${tripToDelete._id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      console.log("Trip deleted:", tripToDelete._id);
      deletionSteps++;
      updateDeleteStatus(
        `Completed deletion step ${deletionSteps} of ${totalSteps}`
      );

      // Step 4: Delete the associated schedule if it exists
      if (tripToDelete.scheduleID) {
        totalSteps++;
        try {
          console.log("Deleting associated schedule:", tripToDelete.scheduleID);
          updateDeleteStatus(
            `Deleting associated schedule: ${tripToDelete.scheduleID}`
          );
          await fetch(
            `${process.env.NEXT_PUBLIC_BACKEND_API}/api/schedule/${tripToDelete.scheduleID}`,
            {
              method: "DELETE",
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );
          console.log("Schedule deleted:", tripToDelete.scheduleID);
          deletionSteps++;
          updateDeleteStatus(
            `Completed deletion step ${deletionSteps} of ${totalSteps}`
          );
        } catch (error) {
          console.error(
            `Error deleting schedule ${tripToDelete.scheduleID}:`,
            error
          );
          // Continue with the process
        }
      }

      updateDeleteStatus("All deletion steps completed successfully!");

      if (response.status === 200) {
        toast({
          title: "Success",
          description: `Trip ${tripToDelete.tripID} and all associated data (schedules, waybills, shipper/consignee info) deleted successfully`,
          status: "success",
          duration: 5000,
          isClosable: true,
          position: "top-right",
        });
        fetchTrips(); // Refresh the list
      }
    } catch (error) {
      console.error("Error in cascading deletion:", error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to delete trip",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsDeletingTrip(false);
      deleteTripAlertDisclosure.onClose();
      setTripToDelete(null);
    }
  };

  const handleEdit = (trip) => {
    try {
      // Helper function to format date
      const formatDate = (dateString) => {
        if (!dateString || dateString === "00/00/0000") return "";
        const date = new Date(dateString);
        // Check if date is valid
        if (isNaN(date.getTime())) return "";
        return date.toISOString().split("T")[0];
      };

      // Log the incoming trip data
      console.log("Original trip data:", trip);

      const formattedTrip = {
        _id: trip._id,
        tripID: trip.tripID,
        scheduleID: trip.scheduleID || "",
        vehicle: trip.vehicle || "",
        driver: trip.driver || "",
        loadingDate: formatDate(trip.loadingDate),
        // Handle missing or null arrivalDate
        arrivalDate: trip.arrivalDate ? formatDate(trip.arrivalDate) : "",
        // Handle missing or null stubNumber
        stubNumber: trip.stubNumber || "",
        status: trip.status || "On-Delivery",
        waybillNumber: trip.waybillNumber || "",
        referenceNumber: trip.referenceNumber || "",
      };

      console.log("Formatted trip data for edit:", formattedTrip);
      setFormData(formattedTrip);
      setEditingId(trip._id);
      onTripModalOpen();
    } catch (error) {
      console.error("Error formatting trip data:", error);
      toast({
        title: "Error",
        description: "There was an error editing this trip",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleAddTrip = async () => {
    try {
      const currentTimestamp = new Date().toISOString();
      console.log("Creating trip with timestamp:", currentTimestamp); // Debug log

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/trips`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            vehicle: selectedSchedule.vehicle,
            driver: selectedSchedule.driver,
            loadingDate: selectedSchedule.loadingDate,
            scheduleID: selectedSchedule.scheduleID,
            status: "On-Delivery",
            timestamp: currentTimestamp, // Include the timestamp
          }),
        }
      );

      if (response.ok) {
        toast.success("Trip created successfully");
        fetchTrips(); // Refresh the trips list
        setShowTripModal(false);
        setSelectedSchedule(null);
        setFormData({
          vehicle: "",
          driver: "",
          loadingDate: "",
          scheduleID: "",
          status: "Scheduled",
        });
      } else {
        const errorData = await response.json();
        console.error("Error creating trip:", errorData); // Debug log
        toast.error(errorData.error || "Failed to create trip");
      }
    } catch (error) {
      console.error("Error creating trip:", error);
      toast.error("Failed to create trip");
    }
  };

  const checkStubNumber = async (tripID) => {
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/trips/check-stub/${tripID}`
      );
      return response.data;
    } catch (error) {
      console.error("Error checking stub number:", error);
      return { hasStub: false, message: "Error checking stub number" };
    }
  };

  const handleViewDetails = async (tripID, stubNumber, status) => {
    try {
      const checkResult = await checkStubNumber(tripID);
      if (!checkResult.hasStub) {
        toast({
          title: "Select Stub Number",
          description:
            "Please select a stub number first before adding trip details",
          status: "error",
          duration: 3000,
          isClosable: true,
          position: "top-right",
        });
        return;
      }
      router.push(
        {
          pathname: router.pathname,
          query: { ...router.query, modal: "details", tripId: tripID },
        },
        undefined,
        { shallow: true }
      );
    } catch (error) {
      console.error("Error in handleViewDetails:", error);
      toast({
        title: "Error",
        description: "Failed to check stub number",
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "top-right",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      tripID: "",
      scheduleID: "",
      vehicle: "",
      driver: "",
      loadingDate: "",
      arrivalDate: "",
      stubNumber: "",
      status: "On-Delivery",
      waybillNumber: "",
      referenceNumber: "",
    });
    setEditingId(null);
  };

  useEffect(() => {
    const fetchStubs = async () => {
      try {
        const response = await axios.get(
          process.env.NEXT_PUBLIC_BACKEND_API + "/api/waybills"
        );
        const uniqueStubs = [
          ...new Set(response.data.map((waybill) => waybill.stub)),
        ];
        setStubs(uniqueStubs);
        setWaybillNumbers(response.data);
      } catch (error) {
        console.error("Error fetching stubs:", error);
      }
    };
    fetchStubs();
  }, []);

  const PaginationControls = () => (
    <Flex justify="space-between" align="center" mt={4}>
      <Text color="gray.600">
        Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
        {Math.min(currentPage * itemsPerPage, totalTrips)} of {totalTrips} trips
      </Text>
      <HStack spacing={2}>
        <Button
          leftIcon={<ChevronLeftIcon />}
          onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
          isDisabled={currentPage === 1}
          size="sm"
        >
          Previous
        </Button>
        <Text>
          Page {currentPage} of {totalPages}
        </Text>
        <Button
          rightIcon={<ChevronRightIcon />}
          onClick={() =>
            setCurrentPage((prev) => Math.min(prev + 1, totalPages))
          }
          isDisabled={currentPage === totalPages}
          size="sm"
        >
          Next
        </Button>
      </HStack>
    </Flex>
  );

  // Modify the handleDirectDateChange function
  const handleDirectDateChange = async (trip, newDate) => {
    try {
      // If status is "On-Delivery", prevent date change
      if (trip.status === "On-Delivery") {
        toast({
          title: "Not Allowed",
          description:
            "Cannot set arrival date while trip is in 'On-Delivery' status. Change status to 'Completed' first.",
          status: "warning",
          duration: 3000,
          isClosable: true,
          position: "top-right",
        });
        return;
      }

      // Validate the new date
      const loadingDate = new Date(trip.loadingDate);

      // Reset time part to midnight for accurate day comparison
      loadingDate.setHours(0, 0, 0, 0);

      const selectedDate = new Date(newDate);
      // Reset time part to midnight for accurate day comparison
      selectedDate.setHours(0, 0, 0, 0);

      // Get the next day after loading date (to ensure we don't allow same day selection)
      const minAllowedDate = new Date(loadingDate);
      minAllowedDate.setDate(minAllowedDate.getDate() + 1);
      minAllowedDate.setHours(0, 0, 0, 0);

      // Update the trip with the new arrival date
      const response = await axios.put(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/trips/${trip._id}`,
        {
          ...trip,
          arrivalDate: newDate,
          // Remove automatic status change
        }
      );

      if (response.status === 200) {
        toast({
          title: "Success",
          description: "Arrival date updated successfully!",
          status: "success",
          duration: 2000,
        });
        await fetchTrips(); // Refresh the trips list
      }
    } catch (error) {
      console.error("Error updating arrival date:", error);
      toast({
        title: "Error",
        description: "Failed to update arrival date",
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "top-right",
      });
    }
  };

  const handleStatusChange = async (trip, newStatus) => {
    try {
      if (newStatus === "Completed") {
        setSelectedTripForArrival(trip);
        onArrivalDateModalOpen();
        return;
      }

      // Use the new status update endpoint
      const response = await axios.put(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/trips/${trip.tripID}/status`,
        { status: newStatus }
      );

      if (response.status === 200) {
        toast({
          title: "Success",
          description: "Status updated successfully!",
          status: "success",
          duration: 2000,
        });
        await fetchTrips();
      }
    } catch (error) {
      console.error("Error updating status:", error);
      toast({
        title: "Error",
        description: "Failed to update status",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleArrivalDateSubmit = async () => {
    try {
      if (!selectedArrivalDate) {
        toast({
          title: "Error",
          description: "Please select an arrival date",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
        return;
      }

      // First update the arrival date
      const updateResponse = await axios.put(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/trips/${selectedTripForArrival._id}`,
        {
          ...selectedTripForArrival,
          arrivalDate: selectedArrivalDate,
        }
      );

      if (updateResponse.status === 200) {
        // Then update the status to Completed
        const statusResponse = await axios.put(
          `${process.env.NEXT_PUBLIC_BACKEND_API}/api/trips/${selectedTripForArrival.tripID}/status`,
          { status: "Completed" }
        );

        if (statusResponse.status === 200) {
          toast({
            title: "Success",
            description: "Arrival date and status updated successfully!",
            status: "success",
            duration: 2000,
          });
          onArrivalDateModalClose();
          setSelectedTripForArrival(null);
          setSelectedArrivalDate("");
          await fetchTrips();
        }
      }
    } catch (error) {
      console.error("Error updating arrival date:", error);
      toast({
        title: "Error",
        description: "Failed to update arrival date",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleViewExpenses = (trip) => {
    router.push(
      {
        pathname: router.pathname,
        query: { ...router.query, modal: "expenses", tripId: trip.tripID },
      },
      undefined,
      { shallow: true }
    );
  };

  // Modify the handleRowHover function
  const handleRowHover = (trip) => {
    // If we're already hovering over this trip, don't do anything
    if (currentHoveredTrip?._id === trip._id) {
      return;
    }

    // Clear any existing timeout
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
    }

    // Set a new timeout
    const timeout = setTimeout(() => {
      setCurrentHoveredTrip(trip);
      setHoveredTrip(trip);
      setIsHovering(true);
      setShowPreview(true);
    }, 300); // 300ms delay

    setHoverTimeout(timeout);
  };

  // Modify the handleRowLeave function
  const handleRowLeave = () => {
    // Clear the timeout if it exists
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
      setHoverTimeout(null);
    }

    // Only close if we're actually hovering
    if (isHovering) {
      setIsHovering(false);
      setCurrentHoveredTrip(null);
      setHoveredTrip(null);
      setShowPreview(false);
    }
  };

  // Clean up timeout on component unmount
  useEffect(() => {
    return () => {
      if (hoverTimeout) {
        clearTimeout(hoverTimeout);
      }
    };
  }, [hoverTimeout]);

  // Add this function to format the timestamp
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "Unknown time";
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now - date) / (1000 * 60));
      return `${diffInMinutes} minutes ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours} hours ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const handleLoadingDateDoubleClick = (trip) => {
    setEditingLoadingDate(trip._id);
    setTempLoadingDate(new Date(trip.loadingDate).toISOString().split("T")[0]);
  };

  const handleLoadingDateChange = (e) => {
    setTempLoadingDate(e.target.value);
  };

  const handleLoadingDateBlur = async () => {
    if (!editingLoadingDate) return;

    try {
      const tripToUpdate = trips.find(
        (trip) => trip._id === editingLoadingDate
      );
      if (!tripToUpdate) return;

      // Validate loading date
      const selectedDate = new Date(tempLoadingDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // For completed trips, loading date must be before arrival date
      if (
        tripToUpdate.status === "Completed" &&
        tripToUpdate.arrivalDate !== "00/00/0000"
      ) {
        const arrivalDate = new Date(tripToUpdate.arrivalDate);
        if (selectedDate.getTime() >= arrivalDate.getTime()) {
          toast({
            title: "Invalid Date",
            description: "Loading date must be before arrival date",
            status: "error",
            duration: 3000,
            isClosable: true,
          });
          setEditingLoadingDate(null);
          return;
        }
      }

      const response = await axios.put(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/trips/${editingLoadingDate}`,
        {
          ...tripToUpdate,
          loadingDate: tempLoadingDate,
        }
      );

      if (response.status === 200) {
        toast({
          title: "Success",
          description: "Loading date updated successfully!",
          status: "success",
          duration: 2000,
        });
        await fetchTrips(); // Refresh the trips list
      }
    } catch (error) {
      console.error("Error updating loading date:", error);
      toast({
        title: "Error",
        description: "Failed to update loading date",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }

    setEditingLoadingDate(null);
    setTempLoadingDate("");
  };

  const handleLoadingDateKeyDown = (e) => {
    if (e.key === "Enter") {
      e.target.blur(); // Trigger blur event to save
    } else if (e.key === "Escape") {
      setEditingLoadingDate(null);
      setTempLoadingDate("");
    }
  };

  const closeModal = () => {
    const { modal, tripId, ...restQuery } = router.query;
    router.push({ pathname: router.pathname, query: restQuery }, undefined, {
      shallow: true,
    });
  };

  // Add this function back for sorting
  const handleSort = (field) => {
    const newDirection =
      sortField === field && sortDirection === "asc" ? "desc" : "asc";

    setSortField(field);
    setSortDirection(newDirection);
    // No need to manually sort filteredTrips here, the useEffect will handle it
  };

  const handleDeleteRequestOpen = async () => {
    // Check for existing pending request first
    const token = localStorage.getItem("token");
    const userString = localStorage.getItem("user");
    if (!token || !userString) {
      toast({
        title: "Error",
        description: "Cannot verify user session.",
        status: "error",
      });
      return;
    }

    try {
      const user = JSON.parse(userString);
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/control-panel`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const existingPendingRequest = response.data.find(
        (req) =>
          req.Module === "Trips" &&
          req.Username === user.name &&
          req.Status === "Pending"
      );

      if (existingPendingRequest) {
        toast({
          title: "Pending Request Exists",
          description: `You already have a pending request (${existingPendingRequest.RequestType}) for Trips access.`,
          status: "warning",
          duration: 5000,
          isClosable: true,
        });
        return;
      }
    } catch (error) {
      console.error("Error checking for pending requests:", error);
      toast({
        title: "Error",
        description: "Could not verify existing requests. Please try again.",
        status: "error",
      });
      return;
    }

    setDeleteRequestRemarks("");
    setIsSubmittingDeleteRequest(false);
    setIsDeleteRequestOpen(true);
  };

  const handleSubmitDeleteRequest = async () => {
    setIsSubmittingDeleteRequest(true);
    try {
      const token = localStorage.getItem("token");
      const userString = localStorage.getItem("user");
      if (!token || !userString)
        throw new Error("Authentication details not found.");
      const user = JSON.parse(userString);
      const generatedRequestID = `REQ-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const payload = {
        RequestID: generatedRequestID,
        Module: "Trips",
        RequestType: "Delete",
        Remarks: deleteRequestRemarks,
        Username: user.name,
        UserRole: user.workLevel,
      };
      await axios.post(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/control-panel`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast({
        title: "Request Submitted",
        description: "Your request for delete access has been sent.",
        status: "success",
        duration: 5000,
        isClosable: true,
      });
      setIsDeleteRequestOpen(false);
    } catch (error) {
      console.error("Error submitting delete access request:", error);
      toast({
        title: "Request Failed",
        description:
          error.response?.data?.message ||
          error.message ||
          "Could not submit delete access request.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsSubmittingDeleteRequest(false);
    }
  };

  const checkTripDeleteAccess = async () => {
    const token = localStorage.getItem("token");
    const userString = localStorage.getItem("user");
    if (!token || !userString) {
      setIsTripDeleteApproved(false);
      setTripDeleteExpirationTime(null);
      return;
    }

    try {
      const user = JSON.parse(userString);
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/control-panel`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const requests = response.data;
      const now = new Date();

      const approvedDeleteRequest = requests.find(
        (req) =>
          req.Module === "Trips" &&
          req.RequestType === "Delete" &&
          req.Username === user.name &&
          req.Status === "Approved" &&
          (!req.ExpiresAt || new Date(req.ExpiresAt) > now)
      );
      const isDeleteApproved = !!approvedDeleteRequest;
      setIsTripDeleteApproved(isDeleteApproved);
      setTripDeleteExpirationTime(
        isDeleteApproved && approvedDeleteRequest.ExpiresAt
          ? new Date(approvedDeleteRequest.ExpiresAt)
          : null
      );
    } catch (error) {
      console.error("Error checking trip delete access:", error);
    }
  };

  useEffect(() => {
    checkTripDeleteAccess();
    const interval = setInterval(checkTripDeleteAccess, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (tripDeleteTimerIntervalRef.current) {
      clearInterval(tripDeleteTimerIntervalRef.current);
      tripDeleteTimerIntervalRef.current = null;
      setTripDeleteTimerDisplay(null);
    }
    if (tripDeleteExpirationTime && tripDeleteExpirationTime > new Date()) {
      const updateTimer = () => {
        const remaining = tripDeleteExpirationTime - new Date();
        if (remaining <= 0) {
          clearInterval(tripDeleteTimerIntervalRef.current);
          setTripDeleteTimerDisplay(null);
          setTripDeleteExpirationTime(null);
          setIsTripDeleteApproved(false);
        } else {
          setTripDeleteTimerDisplay(formatRemainingTime(remaining));
        }
      };
      updateTimer();
      tripDeleteTimerIntervalRef.current = setInterval(updateTimer, 1000);
    }
    return () => {
      if (tripDeleteTimerIntervalRef.current)
        clearInterval(tripDeleteTimerIntervalRef.current);
    };
  }, [tripDeleteExpirationTime]);

  return (
    <Box>
      {/* Header Section with Stats */}
      <Box
        mb={8}
        py={4}
        px={6}
        color="#1a365d"
        borderRadius="md"
        borderBottom="1px solid"
        borderColor="gray.200"
      >
        <Flex justify="space-between" align="center" mb={6}>
          <VStack align="start" spacing={1}>
            <Heading size="lg" color="#1a365d" fontWeight="bold">
              Trip Management
            </Heading>
            <Text color="gray.500">
              Manage delivery trips and transportation records
            </Text>
          </VStack>
        </Flex>

        {/* Quick Stats Cards */}
        <Grid templateColumns={{ base: "1fr", md: "repeat(4, 1fr)" }} gap={4}>
          <Box
            bg="white"
            p={4}
            rounded="lg"
            shadow="sm"
            borderWidth="1px"
            borderColor="#1a365d"
            borderLeftWidth="4px"
          >
            <Text color="gray.500" fontSize="sm" mb={1}>
              Total Trips
            </Text>
            <Text fontSize="2xl" fontWeight="bold" color="#1a365d">
              {trips.length}
            </Text>
          </Box>
          <Box
            bg="white"
            p={4}
            rounded="lg"
            shadow="sm"
            borderWidth="1px"
            borderColor="#800020"
            borderLeftWidth="4px"
          >
            <Text color="gray.500" fontSize="sm" mb={1}>
              Active Trips
            </Text>
            <Text fontSize="2xl" fontWeight="bold" color="#800020">
              {trips.filter((trip) => trip.status === "On-Delivery").length}
            </Text>
          </Box>
          <Box
            bg="white"
            p={4}
            rounded="lg"
            shadow="sm"
            borderWidth="1px"
            borderColor="#1a365d"
            borderLeftWidth="4px"
          >
            <Text color="gray.500" fontSize="sm" mb={1}>
              Completed Trips
            </Text>
            <Text fontSize="2xl" fontWeight="bold" color="#1a365d">
              {trips.filter((trip) => trip.status === "Completed").length}
            </Text>
          </Box>
          <Box
            bg="white"
            p={4}
            rounded="lg"
            shadow="sm"
            borderWidth="1px"
            borderColor="#800020"
            borderLeftWidth="4px"
          >
            <Text color="gray.500" fontSize="sm" mb={1}>
              Cancelled Trips
            </Text>
            <Text fontSize="2xl" fontWeight="bold" color="#800020">
              {trips.filter((trip) => trip.status === "Cancelled").length}
            </Text>
          </Box>
        </Grid>
      </Box>

      {/* Main Content */}
      <Box
        bg="white"
        rounded="lg"
        shadow="md"
        borderWidth="1px"
        maxH="650px"
        display="flex"
        flexDirection="column"
      >
        {/* Search and Filter Bar */}
        <Flex
          p={4}
          borderBottomWidth="1px"
          justify="space-between"
          align="center"
        >
          <InputGroup maxW="lg">
            <InputLeftElement pointerEvents="none">
              <SearchIcon color="gray.400" />
            </InputLeftElement>
            <Input
              placeholder={
                searchMode === "trip"
                  ? "Search trips..."
                  : "Search by Waybill Number..."
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              borderColor="#1a365d"
              _focus={{
                borderColor: "#800020",
                boxShadow: "0 0 0 1px #800020",
              }}
              pr="4.5rem"
            />
            <InputRightElement width="auto" mr={1}>
              <Button
                h="1.75rem"
                size="sm"
                onClick={() =>
                  setSearchMode(searchMode === "trip" ? "waybill" : "trip")
                }
                variant="outline"
                colorScheme={searchMode === "trip" ? "blue" : "red"}
                fontSize="xs"
              >
                {searchMode === "trip" ? "By Waybill" : "By Trip"}
              </Button>
            </InputRightElement>
          </InputGroup>
          <HStack spacing={4}>
            {tripDeleteTimerDisplay && (
              <Flex alignItems="baseline" color="purple.600" fontSize="xs">
                <Icon as={FiClock} mr={1} boxSize={3} />
                <Text>Delete active: {tripDeleteTimerDisplay}</Text>
              </Flex>
            )}
            <Button
              leftIcon={<LockIcon />}
              colorScheme="purple"
              variant="solid"
              size="sm"
              onClick={handleDeleteRequestOpen}
            >
              Request Delete Access
            </Button>
          </HStack>
        </Flex>

        {/* Table */}
        <Box flex="1" overflowX="auto" overflowY="auto">
          <Table variant="simple">
            <Thead position="sticky" top={0} bg="gray.50" zIndex={1}>
              <Tr>
                <Th color="gray.700">Trip ID</Th>
                {/* <Th color="gray.700">
                  Schedule ID
                </Th> */}
                <Th color="gray.700">Vehicle</Th>
                <Th color="gray.700">Driver</Th>
                <Th
                  color="gray.700"
                  cursor="pointer"
                  onClick={() => handleSort("loadingDate")}
                >
                  <Flex align="center">
                    Departure Date
                    <Box ml={1}>
                      <TriangleUpIcon
                        color={
                          sortField === "loadingDate" && sortDirection === "asc"
                            ? "blue.500"
                            : "gray.400"
                        }
                        w={3}
                        h={3}
                      />
                      <TriangleDownIcon
                        color={
                          sortField === "loadingDate" &&
                          sortDirection === "desc"
                            ? "blue.500"
                            : "gray.400"
                        }
                        w={3}
                        h={3}
                      />
                    </Box>
                  </Flex>
                </Th>
                <Th
                  color="gray.700"
                  cursor="pointer"
                  onClick={() => handleSort("arrivalDate")}
                >
                  <Flex align="center">
                    Arrival Date
                    <Box ml={1}>
                      <TriangleUpIcon
                        color={
                          sortField === "arrivalDate" && sortDirection === "asc"
                            ? "blue.500"
                            : "gray.400"
                        }
                        w={3}
                        h={3}
                      />
                      <TriangleDownIcon
                        color={
                          sortField === "arrivalDate" &&
                          sortDirection === "desc"
                            ? "blue.500"
                            : "gray.400"
                        }
                        w={3}
                        h={3}
                      />
                    </Box>
                  </Flex>
                </Th>
                <Th color="gray.700">Assigned Stub</Th>
                <Th color="gray.700">Status</Th>
                <Th color="gray.700">Started At</Th>
                <Th color="gray.700" textAlign="center">
                  Trip Details
                </Th>
                <Th color="gray.700" textAlign="center">
                  Expenses
                </Th>
                <Th color="gray.700" textAlign="center">
                  Actions
                </Th>
              </Tr>
            </Thead>
            <Tbody>
              {isLoading ? (
                <Tr>
                  <Td colSpan={11}>
                    <Center py={8}>
                      <Spinner size="xl" color="blue.500" />
                    </Center>
                  </Td>
                </Tr>
              ) : filteredTrips.length === 0 ? (
                <Tr>
                  <Td colSpan={11}>
                    <Center py={8}>
                      <VStack spacing={3}>
                        <Icon as={SearchIcon} w={8} h={8} color="gray.400" />
                        <Text color="gray.500">No trips found</Text>
                        <Text color="gray.400" fontSize="sm">
                          {searchTerm
                            ? "Try adjusting your search terms"
                            : "Get started by adding a new trip"}
                        </Text>
                      </VStack>
                    </Center>
                  </Td>
                </Tr>
              ) : (
                filteredTrips.map((trip) => (
                  <Tr
                    key={trip._id}
                    _hover={{ bg: "gray.50" }}
                    transition="all 0.2s"
                  >
                    <Td fontWeight="medium">{trip.tripID}</Td>
                    {/* <Td>{trip.scheduleID}</Td> */}
                    <Td>{trip.vehicle}</Td>
                    <Td>{trip.driver}</Td>
                    <Td>
                      {editingLoadingDate === trip._id ? (
                        <Input
                          type="date"
                          size="sm"
                          autoFocus
                          value={tempLoadingDate}
                          onChange={handleLoadingDateChange}
                          onBlur={handleLoadingDateBlur}
                          onKeyDown={handleLoadingDateKeyDown}
                        />
                      ) : (
                        <Tooltip
                          label="Double click to edit loading date"
                          placement="top"
                          hasArrow
                        >
                          <Box
                            onDoubleClick={() =>
                              handleLoadingDateDoubleClick(trip)
                            }
                            cursor="pointer"
                            _hover={{
                              textDecoration: "underline",
                              color: "blue.500",
                            }}
                          >
                            {new Date(trip.loadingDate).toLocaleDateString()}
                          </Box>
                        </Tooltip>
                      )}
                    </Td>
                    <Td>
                      {trip.arrivalDate === "00/00/0000" ? (
                        <Badge colorScheme="gray">Not set</Badge>
                      ) : (
                        <Badge
                          colorScheme={
                            trip.status === "Completed"
                              ? "green"
                              : trip.status === "On-Delivery"
                                ? "orange"
                                : trip.status === "Cancelled"
                                  ? "red"
                                  : "gray"
                          }
                        >
                          {new Date(trip.arrivalDate).toLocaleDateString()}
                        </Badge>
                      )}
                    </Td>
                    <Td>{trip.stubNumber || "-"}</Td>
                    <Td>
                      {/* If trip is completed, show truly disabled select and a request access button */}
                      {trip.status === "Completed" ? (
                        <HStack>
                          <Select
                            size="sm"
                            value={trip.status}
                            isDisabled
                            style={{ pointerEvents: "none" }}
                            borderColor="gray.300"
                            _hover={{ borderColor: "gray.300" }}
                            _focus={{
                              borderColor: "gray.300",
                              boxShadow: "none",
                            }}
                          >
                            <option value="On-Delivery">On-Delivery</option>
                            <option value="Completed">Completed</option>
                            <option value="Cancelled">Cancelled</option>
                          </Select>
                          <IconButton
                            icon={<LockIcon />}
                            aria-label="Request Edit Access"
                            size="sm"
                            colorScheme="purple"
                            variant="ghost"
                            onClick={handleDeleteRequestOpen}
                            title="Request Edit Access"
                          />
                        </HStack>
                      ) : (
                        <Select
                          size="sm"
                          value={trip.status}
                          onChange={(e) =>
                            handleStatusChange(trip, e.target.value)
                          }
                          borderColor="gray.300"
                          _hover={{ borderColor: "blue.300" }}
                          _focus={{
                            borderColor: "blue.500",
                            boxShadow: "0 0 0 1px blue.500",
                          }}
                        >
                          <option value="On-Delivery">On-Delivery</option>
                          <option value="Completed">Completed</option>
                          <option value="Cancelled">Cancelled</option>
                        </Select>
                      )}
                    </Td>
                    <Td>
                      {trip.status === "On-Delivery" && trip.timestamp ? (
                        <Text color="green.500" fontSize="sm">
                          {formatTimestamp(trip.timestamp)}
                        </Text>
                      ) : (
                        <Text color="gray.500" fontSize="sm">
                          -
                        </Text>
                      )}
                    </Td>
                    <Td
                      onMouseEnter={() => handleRowHover(trip)}
                      onMouseLeave={handleRowLeave}
                    >
                      <HStack spacing={2} justify="center">
                        <Button
                          size="sm"
                          bg="#1a365d"
                          color="white"
                          _hover={{ bg: "#2a4365" }}
                          onClick={() =>
                            handleViewDetails(
                              trip.tripID,
                              trip.stubNumber,
                              trip.status
                            )
                          }
                          leftIcon={<AddIcon />}
                        >
                          Add Details
                        </Button>
                      </HStack>
                    </Td>
                    <Td>
                      <HStack spacing={2} justify="center">
                        <Button
                          size="sm"
                          bg="#1a365d"
                          color="white"
                          _hover={{ bg: "#2a4365" }}
                          onClick={() => handleViewExpenses(trip)}
                          leftIcon={<AddIcon />}
                          isDisabled={trip.status !== "Completed"}
                          title={
                            trip.status !== "Completed"
                              ? "Trip must be Completed to add expenses"
                              : "Add Expenses"
                          }
                        >
                          Add Expenses
                        </Button>
                      </HStack>
                    </Td>
                    <Td>
                      <HStack spacing={2} justify="center">
                        <IconButton
                          icon={<DeleteIcon />}
                          onClick={() => handleDeleteTripClick(trip)}
                          size="sm"
                          colorScheme="red"
                          variant="ghost"
                          aria-label="Delete trip"
                          isDisabled={!isTripDeleteApproved}
                        />
                      </HStack>
                    </Td>
                  </Tr>
                ))
              )}
            </Tbody>
          </Table>
        </Box>

        {/* Pagination */}
        <Flex justify="space-between" align="center" p={4} borderTopWidth="1px">
          <Text color="gray.600">
            Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
            {Math.min(currentPage * itemsPerPage, totalTrips)} of {totalTrips}{" "}
            trips
          </Text>
          <HStack spacing={2}>
            <Button
              leftIcon={<ChevronLeftIcon />}
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              isDisabled={currentPage === 1}
              size="sm"
              color="#1a365d"
              variant="outline"
            >
              Previous
            </Button>
            <Text>
              Page {currentPage} of {totalPages}
            </Text>
            <Button
              rightIcon={<ChevronRightIcon />}
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
              isDisabled={currentPage === totalPages}
              size="sm"
              color="#1a365d"
              variant="outline"
            >
              Next
            </Button>
          </HStack>
        </Flex>
      </Box>

      {/* Keep existing modals with updated styling */}
      <Modal isOpen={isTripModalOpen} onClose={onTripModalClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader bg="#1a365d" color="white">
            {editingId ? "Edit Trip" : "Add Trip"}
          </ModalHeader>
          <ModalCloseButton color="white" />
          <ModalBody>
            {/* Schedule ID - Hidden */}
            <FormControl isRequired style={{ display: "none" }}>
              <FormLabel>Schedule ID</FormLabel>
              <Text bg="gray.100" p={2} borderRadius="md">
                {formData.scheduleID}
              </Text>
            </FormControl>

            {/* Vehicle - Hidden */}
            <FormControl isRequired mt={2} style={{ display: "none" }}>
              <FormLabel>Vehicle</FormLabel>
              <Text bg="gray.100" p={2} borderRadius="md">
                {formData.vehicle}
              </Text>
            </FormControl>

            {/* Driver - Hidden */}
            <FormControl isRequired mt={2} style={{ display: "none" }}>
              <FormLabel>Driver</FormLabel>
              <Text bg="gray.100" p={2} borderRadius="md">
                {formData.driver}
              </Text>
            </FormControl>

            {/* Loading Date - Hidden */}
            <FormControl isRequired mt={2} style={{ display: "none" }}>
              <FormLabel>Loading Date</FormLabel>
              <Input
                type="date"
                value={formData.loadingDate}
                readOnly
                bg="gray.100"
                _hover={{ bg: "gray.200" }}
              />
            </FormControl>

            {/* Arrival Date - Visible */}
            <FormControl isRequired mt={2}>
              <FormLabel>Arrival Date</FormLabel>
              <Box position="relative">
                <Input
                  type="date"
                  value={formData.arrivalDate}
                  min={(() => {
                    if (!formData.loadingDate) return "";
                    // Calculate the next day after the loading date
                    const nextDay = new Date(formData.loadingDate);
                    nextDay.setDate(nextDay.getDate() + 1);
                    return nextDay.toISOString().split("T")[0];
                  })()}
                  // Add onFocus handler to enforce min attribute
                  onFocus={(e) => {
                    if (!formData.loadingDate) return;
                    // Ensure the min attribute is strictly enforced
                    const nextDay = new Date(formData.loadingDate);
                    nextDay.setDate(nextDay.getDate() + 1);
                    e.target.min = nextDay.toISOString().split("T")[0];
                  }}
                  // Prevent keyboard entry of dates
                  onKeyDown={(e) => e.preventDefault()}
                  disabled={!formData.loadingDate}
                  onChange={(e) => {
                    if (!formData.loadingDate) return;

                    const loadingDate = new Date(formData.loadingDate);
                    // Reset time part to midnight for accurate day comparison
                    loadingDate.setHours(0, 0, 0, 0);

                    const selectedDate = new Date(e.target.value);
                    // Reset time part to midnight for accurate day comparison
                    selectedDate.setHours(0, 0, 0, 0);

                    // Get the next day after loading date
                    const minAllowedDate = new Date(loadingDate);
                    minAllowedDate.setDate(minAllowedDate.getDate() + 1);
                    minAllowedDate.setHours(0, 0, 0, 0);

                    // Check if the selected date is valid using precise time comparison
                    if (selectedDate.getTime() < minAllowedDate.getTime()) {
                      toast({
                        title: "Invalid Date",
                        description:
                          "Arrival date must be at least one day after the loading date",
                        status: "error",
                        duration: 3000,
                        isClosable: true,
                        position: "top-right",
                      });
                      // Reset to existing value
                      e.target.value = formData.arrivalDate || "";
                      return;
                    }

                    setFormData({ ...formData, arrivalDate: e.target.value });
                  }}
                />
                {/* Overlay to prevent direct input */}
                <Box
                  position="absolute"
                  top="0"
                  left="0"
                  right="0"
                  bottom="0"
                  onClick={(e) => {
                    // When clicked, focus on the input but prevent direct editing
                    if (!formData.loadingDate) return;
                    e.currentTarget.previousSibling.showPicker();
                    e.stopPropagation();
                  }}
                  cursor={formData.loadingDate ? "pointer" : "not-allowed"}
                  zIndex="1"
                  opacity="0"
                />
              </Box>
            </FormControl>

            {/* Stub Number - Hidden */}
            <FormControl isRequired mt={2} style={{ display: "none" }}>
              <FormLabel>Stub Number</FormLabel>
              <Text bg="gray.100" p={2} borderRadius="md">
                {formData.stubNumber}
              </Text>
            </FormControl>

            {/* Status - Hidden */}
            <FormControl isRequired mt={2} style={{ display: "none" }}>
              <FormLabel>Status</FormLabel>
              <Text bg="gray.100" p={2} borderRadius="md">
                {formData.status}
              </Text>
            </FormControl>
          </ModalBody>
          <ModalFooter borderTopWidth="2px" borderColor="#800020">
            <Button
              bg="#1a365d"
              color="white"
              _hover={{ bg: "#2a4365" }}
              onClick={handleSubmit}
            >
              {editingId ? "Update" : "Save"}
            </Button>
            <Button
              variant="outline"
              color="#800020"
              borderColor="#800020"
              onClick={onTripModalClose}
              ml={3}
            >
              Cancel
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={isDetailModalOpen} onClose={closeModal} size="6xl">
        <ModalOverlay />
        <ModalContent>
          <TripDetails
            isOpen={isDetailModalOpen}
            onClose={closeModal}
            tripId={selectedTripID}
          />
        </ModalContent>
      </Modal>

      <TripExpense
        isOpen={isExpenseModalOpen}
        onClose={closeModal}
        tripId={selectedTripID}
      />

      {showPreview && hoveredTrip && (
        <Box
          position="fixed"
          top="50%"
          left="50%"
          transform="translate(-50%, -50%)"
          zIndex={1000}
          bg="white"
          borderRadius="md"
          boxShadow="xl"
          maxW="800px"
          w="90%"
          maxH="80vh"
          overflowY="auto"
        >
          <Box bg="#1a365d" color="white" py={4} px={6} borderTopRadius="md">
            <VStack align="start" spacing={2}>
              <Heading size="md">Trip Details Preview</Heading>
              <Text fontSize="sm" color="gray.200">
                Trip ID: {hoveredTrip.tripID} | Vehicle: {hoveredTrip.vehicle}
              </Text>
              <Badge
                colorScheme="green"
                fontSize="sm"
                px={2}
                py={1}
                borderRadius="md"
              >
                Total Waybills:{" "}
                {
                  tripDetails.filter(
                    (detail) => detail.tripID === hoveredTrip.tripID
                  ).length
                }
              </Badge>
            </VStack>
            <IconButton
              position="absolute"
              right="4"
              top="4"
              icon={<CloseIcon />}
              size="sm"
              onClick={() => setShowPreview(false)}
              aria-label="Close preview"
              variant="ghost"
              color="white"
              _hover={{ bg: "whiteAlpha.200" }}
            />
          </Box>
          <Box p={6}>
            <TableContainer>
              <Table variant="simple">
                <Thead bg="gray.50">
                  <Tr>
                    <Th color="gray.700">Trip Detail ID</Th>
                    <Th color="gray.700">Assigned Stub</Th>
                    <Th color="gray.700">Waybill Number</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {tripDetails
                    .filter((detail) => detail.tripID === hoveredTrip.tripID)
                    .map((detail) => (
                      <Tr key={detail._id} _hover={{ bg: "gray.50" }}>
                        <Td fontWeight="medium">{detail.tripDetailID}</Td>
                        <Td>
                          {detail.stubNumber && !detail.stubNumber.includes("/")
                            ? detail.stubNumber
                            : detail.stubNumber.split("/")[0]}
                        </Td>
                        <Td>{detail.waybillNumber}</Td>
                      </Tr>
                    ))}
                </Tbody>
              </Table>
            </TableContainer>
          </Box>
          <Box borderTopWidth="2px" borderColor="#800020" py={4} px={6}>
            <Button
              variant="outline"
              color="#800020"
              borderColor="#800020"
              onClick={() => setShowPreview(false)}
            >
              Close
            </Button>
          </Box>
        </Box>
      )}

      <SetArrivalDateModal
        isOpen={isArrivalDateModalOpen}
        onClose={() => {
          onArrivalDateModalClose();
          setSelectedTripForArrival(null);
          setSelectedArrivalDate("");
        }}
        onSubmit={handleArrivalDateSubmit}
        selectedTripForArrival={selectedTripForArrival}
        selectedArrivalDate={selectedArrivalDate}
        setSelectedArrivalDate={setSelectedArrivalDate}
      />

      <AlertDialog
        isOpen={deleteTripAlertDisclosure.isOpen}
        leastDestructiveRef={cancelRef}
        onClose={deleteTripAlertDisclosure.onClose}
        isCentered
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete Trip
            </AlertDialogHeader>
            <AlertDialogBody>
              {isDeletingTrip ? (
                <VStack spacing={4} align="center" py={4}>
                  <Spinner
                    size="xl"
                    color="red.500"
                    thickness="4px"
                    speed="0.65s"
                  />
                  <Text fontWeight="bold">Deleting Trip and Related Data</Text>
                  <Text fontSize="sm" textAlign="center">
                    Removing trip, schedule, trip details, and all associated
                    waybill data. This process may take a moment to complete...
                  </Text>
                </VStack>
              ) : (
                <>
                  Are you sure you want to delete Trip ID "
                  {tripToDelete?.tripID}"? (Vehicle: {tripToDelete?.vehicle},
                  Driver: {tripToDelete?.driver}) This action will permanently
                  delete: - The trip - The associated schedule - All trip
                  details - All waybill data (shipper info, consignee info,
                  subdetails) This is a cascading deletion that cannot be
                  undone.
                </>
              )}
            </AlertDialogBody>
            <AlertDialogFooter>
              {!isDeletingTrip && (
                <Button
                  ref={cancelRef}
                  onClick={deleteTripAlertDisclosure.onClose}
                >
                  Cancel
                </Button>
              )}
              <Button
                colorScheme="red"
                isLoading={isDeletingTrip}
                loadingText="Deleting All Data..."
                onClick={confirmDeleteTrip}
                ml={3}
                isDisabled={isDeletingTrip}
              >
                Delete All Data
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>

      <Modal
        isOpen={isDeleteRequestOpen}
        onClose={() => setIsDeleteRequestOpen(false)}
        isCentered
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Request Delete Access (Trips)</ModalHeader>
          <ModalCloseButton isDisabled={isSubmittingDeleteRequest} />
          <ModalBody pb={6}>
            <Text mb={4}>
              You are requesting permission to delete trip entries.
            </Text>
            <FormControl>
              <FormLabel>Remarks (Optional)</FormLabel>
              <Textarea
                value={deleteRequestRemarks}
                onChange={(e) => setDeleteRequestRemarks(e.target.value)}
                placeholder="Provide a reason for your request..."
              />
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <Button
              colorScheme="blue"
              mr={3}
              onClick={handleSubmitDeleteRequest}
              isLoading={isSubmittingDeleteRequest}
              loadingText="Submitting"
            >
              Submit Delete Request
            </Button>
            <Button
              variant="ghost"
              onClick={() => setIsDeleteRequestOpen(false)}
              isDisabled={isSubmittingDeleteRequest}
            >
              Cancel
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default Trips;
