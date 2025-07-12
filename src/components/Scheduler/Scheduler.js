import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  Grid,
  GridItem,
  Text,
  VStack,
  Button,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  FormControl,
  FormLabel,
  Select,
  IconButton,
  useToast,
  HStack,
  Flex,
  Heading,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  useDisclosure,
  Badge,
  Skeleton,
  SkeletonText,
  Spinner,
  Center,
  Input,
  InputGroup,
  InputLeftElement,
  HStack as ChakraHStack,
  Select as ChakraSelect,
  Tooltip,
  Divider,
} from "@chakra-ui/react";
import {
  DeleteIcon,
  ViewIcon,
  CalendarIcon,
  SearchIcon,
} from "@chakra-ui/icons"; // Remove RepeatIcon import
import Calendar from "./calendar";
import axios from "axios";
import TripDetails from "../Trip/TripDetail"; // Import TripDetail component (it's actually named TripDetails)
import SetArrivalDateModal from "../Trip/setArrival"; // Import the SetArrivalDateModal

const Scheduler = () => {
  // State to manage available drivers for the dropdown
  const [availableDrivers, setAvailableDrivers] = useState([]);
  const [onDeliveryDrivers, setOnDeliveryDrivers] = useState([]);
  // State to manage scheduled events
  const [scheduledEvents, setScheduledEvents] = useState([]);
  // State to manage schedules fetched from the backend
  const [schedules, setSchedules] = useState([]);
  // State to manage trucks fetched from the backend
  const [trucks, setTrucks] = useState([]);
  // State to manage trips fetched from the backend
  const [trips, setTrips] = useState([]);
  // State to manage the modal for editing a truck's driver
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentTruck, setCurrentTruck] = useState(null);
  const [newDriverName, setNewDriverName] = useState("");
  const toast = useToast();
  // Add state for trip details modal
  const [isTripDetailModalOpen, setIsTripDetailModalOpen] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState(null);
  // Add state for schedule delete confirmation
  const [scheduleToDelete, setScheduleToDelete] = useState(null);
  const {
    isOpen: isDeleteScheduleOpen,
    onOpen: onDeleteScheduleOpen,
    onClose: onDeleteScheduleClose,
  } = useDisclosure();
  const cancelRef = useRef(); // Ref for AlertDialog
  const [isDeletingSchedule, setIsDeletingSchedule] = useState(false);
  const [deletionStatus, setDeletionStatus] = useState("");
  const [deletionProgress, setDeletionProgress] = useState({
    current: 0,
    total: 0,
  });

  // State for Set Arrival Date Modal
  const {
    isOpen: isArrivalModalOpen,
    onOpen: onArrivalModalOpen,
    onClose: onArrivalModalClose,
  } = useDisclosure();
  const [tripToSetArrival, setTripToSetArrival] = useState(null);
  const [arrivalDateInput, setArrivalDateInput] = useState("");

  // New state to trigger calendar refresh
  const [calendarRefreshKey, setCalendarRefreshKey] = useState(0);

  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isSchedulesLoading, setIsSchedulesLoading] = useState(true);
  const [isVehiclesLoading, setIsVehiclesLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Add new state for pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Fetch schedules from the backend
  const fetchSchedules = async () => {
    setIsSchedulesLoading(true);
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/schedule`
      );

      console.log("Raw schedules from API:", response.data);

      // Process the schedules to normalize date formats
      const processedSchedules = response.data.map((schedule) => {
        // Create a new object to avoid mutating the original
        const processedSchedule = { ...schedule };

        // Ensure arrivalDate is consistently formatted
        if (processedSchedule.arrivalDate) {
          // Check if it's already in Date object form
          if (typeof processedSchedule.arrivalDate === "string") {
            // If it's a date string like "00/00/0000", leave as is
            if (processedSchedule.arrivalDate === "00/00/0000") {
              // Do nothing, keep as "00/00/0000"
            } else {
              // Otherwise convert to a proper Date object
              const parsedDate = new Date(processedSchedule.arrivalDate);
              if (parsedDate instanceof Date && !isNaN(parsedDate.getTime())) {
                processedSchedule.arrivalDate = parsedDate;
              }
            }
          }
        }

        console.log(`Processed schedule ${processedSchedule.scheduleID}:`, {
          isOnDelivery: processedSchedule.isOnDelivery,
          arrivalDate: processedSchedule.arrivalDate,
        });

        return processedSchedule;
      });

      // Data is already sorted on the server side by _id in descending order
      setSchedules(processedSchedules);
    } catch (error) {
      console.error("Error fetching schedules:", error);
      toast({
        title: "Error",
        description: "Failed to fetch schedules",
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "top-right",
      });
    } finally {
      setIsSchedulesLoading(false);
    }
  };
  useEffect(() => {
    const loadAvailableDrivers = async () => {
      const drivers = await getAvailableDrivers();
      setAvailableDrivers(drivers);
    };

    if (isEditModalOpen) {
      loadAvailableDrivers();
    }
  }, [isEditModalOpen]);
  // Function to handle deleting a schedule
  const handleDeleteScheduleClick = (schedule) => {
    setScheduleToDelete(schedule); // Store the schedule object
    onDeleteScheduleOpen(); // Open the confirmation dialog
  };

  const confirmDeleteSchedule = async () => {
    if (!scheduleToDelete) return;
    const scheduleID = scheduleToDelete.scheduleID;

    setIsDeletingSchedule(true); // Set loading true

    // Create state variables for deletion progress
    let deletionSteps = 0;
    let totalSteps = 1; // Start with at least one step (schedule)

    const updateDeleteStatus = (message) => {
      console.log(message);
      setDeletionStatus(message);
      setDeletionProgress((prev) => ({
        current: deletionSteps,
        total: totalSteps,
      }));
    };

    try {
      console.log(
        "Starting cascading deletion for schedule with ID:",
        scheduleID
      );
      updateDeleteStatus(`Deleting schedule ${scheduleID}...`);

      const token = localStorage.getItem("token");
      if (!token) {
        toast({
          title: "Error",
          description: "Authentication token not found. Please log in.",
          status: "error",
        });
        setIsDeletingSchedule(false); // Reset loading
        onDeleteScheduleClose();
        setScheduleToDelete(null);
        return;
      }

      // Step 1: Find the associated trip
      console.log("Finding associated trip for schedule:", scheduleID);
      updateDeleteStatus("Finding associated trip...");
      const tripResponse = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/trips`
      );
      const tripsData = tripResponse.data?.trips || [];
      const associatedTrip = tripsData.find(
        (trip) => trip.scheduleID === scheduleID
      );

      if (associatedTrip) {
        const tripID = associatedTrip.tripID;
        console.log("Found associated trip:", tripID);
        updateDeleteStatus(`Found associated trip: ${tripID}`);
        // Increase total steps to include trip and potential trip details
        totalSteps += 1;

        // Step 2: Get all trip details for this trip
        console.log("Finding trip details for trip:", tripID);
        updateDeleteStatus("Finding trip details...");
        const tripDetailsResponse = await axios.get(
          `${process.env.NEXT_PUBLIC_BACKEND_API}/api/tripDetails`
        );
        const tripDetails = tripDetailsResponse.data.filter(
          (detail) => detail.tripID === tripID
        );
        console.log(
          `Found ${tripDetails.length} trip details for trip:`,
          tripID
        );
        updateDeleteStatus(
          `Found ${tripDetails.length} trip details to delete`
        );

        // Add trip details to total steps
        totalSteps += tripDetails.length;

        // Step 3: Delete associated data for each trip detail
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

        // Step 4: Delete the trip
        try {
          console.log("Deleting trip:", associatedTrip._id);
          updateDeleteStatus(`Deleting trip: ${associatedTrip.tripID}`);
          await axios.delete(
            `${process.env.NEXT_PUBLIC_BACKEND_API}/api/trips/${associatedTrip._id}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          console.log("Trip deleted:", associatedTrip._id);
          deletionSteps++;
          updateDeleteStatus(
            `Completed deletion step ${deletionSteps} of ${totalSteps}`
          );
        } catch (error) {
          console.error(`Error deleting trip ${associatedTrip._id}:`, error);
          // Continue with schedule deletion
        }
      } else {
        console.log("No associated trip found for schedule:", scheduleID);
        updateDeleteStatus(
          "No associated trip found - continuing with schedule deletion"
        );
      }

      // Step 5: Delete the schedule
      console.log("Deleting schedule:", scheduleID);
      updateDeleteStatus(`Deleting schedule: ${scheduleID}`);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/schedule/${scheduleID}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ message: "Failed to delete schedule" }));
        const errorDesc =
          response.status === 401 || response.status === 403
            ? "Authentication failed. Please log in again."
            : errorData.message || "Failed to delete schedule";
        throw new Error(errorDesc);
      }

      deletionSteps++;
      updateDeleteStatus(
        `Completed deletion step ${deletionSteps} of ${totalSteps}`
      );
      updateDeleteStatus("All deletion steps completed successfully!");

      // Success
      toast({
        title: "Success",
        description: `Schedule ${scheduleID} and all associated data (trip, trip details, waybills, shipper/consignee info) deleted successfully`,
        status: "success",
        duration: 5000,
        isClosable: true,
        position: "top-right",
      });
      fetchSchedules(); // Refresh the list
      // Refresh related data
      fetchTrucks();
      fetchTrips();
    } catch (error) {
      console.error("Error in cascading deletion:", error);
      toast({ title: "Error", description: error.message, status: "error" });
    } finally {
      setIsDeletingSchedule(false); // Set loading false
      onDeleteScheduleClose(); // Close the dialog
      setScheduleToDelete(null); // Clear the selected schedule
    }
  };

  // Fetch active trucks from the backend
  const fetchTrucks = async () => {
    setIsVehiclesLoading(true);
    try {
      const response = await fetch(
        process.env.NEXT_PUBLIC_BACKEND_API + "/api/trucks"
      );
      if (!response.ok) {
        throw new Error("Failed to fetch trucks");
      }
      const data = await response.json();
      // Filter trucks with status "Active"
      const activeTrucksData = data.filter(
        (truck) => truck.status === "Active"
      );
      setTrucks(activeTrucksData);
    } catch (error) {
      console.error("Error fetching trucks:", error);
    } finally {
      setIsVehiclesLoading(false);
    }
  };

  // Fetch trips from the backend
  const fetchTrips = async () => {
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/trips`
      );
      // Extract the trips array from the response data
      const tripsData = response.data?.trips || [];
      console.log("Fetched trips array:", tripsData); // Debug log
      setTrips(tripsData);
    } catch (error) {
      console.error("Error fetching trips:", error);
      setTrips([]); // Set to empty array on error
    }
  };

  // Initial fetch of schedules, trucks, and trips
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        await Promise.all([fetchSchedules(), fetchTrucks(), fetchTrips()]);

        // Add debug function to check data consistency
        if (process.env.NODE_ENV === "development") {
          await checkAndFixDataConsistency();
        }
      } catch (error) {
        console.error("Error loading initial data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();

    // Set up a refresh interval to keep data updated
    const refreshInterval = setInterval(() => {
      fetchTrips(); // Only refresh trips data as it contains status information
    }, 5000); // Refresh every 5 seconds

    return () => clearInterval(refreshInterval); // Clean up on unmount
  }, []);

  // Add a function to check and fix data consistency
  const checkAndFixDataConsistency = async () => {
    console.log("Checking data consistency between trips and schedules...");

    try {
      const inconsistentSchedules = [];

      // Compare each schedule with its associated trip
      schedules.forEach((schedule) => {
        const associatedTrip = trips.find(
          (trip) => trip.scheduleID === schedule.scheduleID
        );

        if (associatedTrip) {
          // Cases to check:
          // 1. Trip is "Completed" but schedule.isOnDelivery is true
          // 2. Trip is "On-Delivery" but schedule.isOnDelivery is false

          const tripCompleted = associatedTrip.status === "Completed";
          const tripOnDelivery = associatedTrip.status === "On-Delivery";

          if (tripCompleted && schedule.isOnDelivery) {
            inconsistentSchedules.push({
              scheduleID: schedule.scheduleID,
              currentIsOnDelivery: schedule.isOnDelivery,
              shouldBe: false,
              reason: "Trip is Completed but schedule is marked as On-Delivery",
            });
          } else if (tripOnDelivery && !schedule.isOnDelivery) {
            inconsistentSchedules.push({
              scheduleID: schedule.scheduleID,
              currentIsOnDelivery: schedule.isOnDelivery,
              shouldBe: true,
              reason:
                "Trip is On-Delivery but schedule is not marked as On-Delivery",
            });
          }
        }
      });

      // Log inconsistencies
      if (inconsistentSchedules.length > 0) {
        console.warn(
          "Found inconsistencies between trips and schedules:",
          inconsistentSchedules
        );

        // Fix the inconsistencies
        for (const item of inconsistentSchedules) {
          console.log(
            `Fixing schedule ${item.scheduleID}: setting isOnDelivery to ${item.shouldBe}`
          );

          try {
            // Update the schedule in the database
            const response = await axios.put(
              `${process.env.NEXT_PUBLIC_BACKEND_API}/api/schedule/${item.scheduleID}/delivery-status`,
              { isOnDelivery: item.shouldBe }
            );

            console.log(`Fixed schedule ${item.scheduleID}:`, response.data);

            // Update local state
            setSchedules((prevSchedules) =>
              prevSchedules.map((schedule) =>
                schedule.scheduleID === item.scheduleID
                  ? { ...schedule, isOnDelivery: item.shouldBe }
                  : schedule
              )
            );
          } catch (error) {
            console.error(`Error fixing schedule ${item.scheduleID}:`, error);
          }
        }

        // Reload data to get the fixed state
        await Promise.all([fetchSchedules(), fetchTrips()]);
      } else {
        console.log("All schedules are consistent with their trips.");
      }
    } catch (error) {
      console.error("Error checking data consistency:", error);
    }
  };

  // Add this new useEffect to fetch and maintain on-delivery drivers
  useEffect(() => {
    const fetchOnDeliveryDrivers = async () => {
      try {
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_BACKEND_API}/api/trips`
        );
        const tripsData = response.data?.trips || [];
        const onDeliveryList = tripsData
          .filter((trip) => trip.status === "On-Delivery")
          .map((trip) => trip.driver);
        setOnDeliveryDrivers(onDeliveryList);
      } catch (error) {
        console.error("Error fetching on-delivery drivers:", error);
      }
    };

    fetchOnDeliveryDrivers();
  }, []);

  // Helper function to generate the next Schedule ID (e.g., S0001, S0002)
  const getNextScheduleID = () => {
    // Generate a random 4-digit number between 1000-9999
    const randomNumber = Math.floor(1000 + Math.random() * 9000);
    return `S${randomNumber}`;
  };

  // Helper function to generate the next Trip ID (e.g., T0001, T0002)
  const getNextTripID = () => {
    // Generate a random 4-digit number between 1000-9999
    const randomNumber = Math.floor(1000 + Math.random() * 9000);
    return `T${randomNumber}`;
  };

  // Function to check if vehicle is available (not On-Delivery)
  const checkVehicleAvailability = async (vehicle) => {
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/trips`
      );
      const tripsData = response.data?.trips || [];

      // Check if vehicle is currently On-Delivery
      const isOnDelivery = tripsData.some(
        (trip) => trip.vehicle === vehicle && trip.status === "On-Delivery"
      );

      return !isOnDelivery; // Return true if vehicle is available
    } catch (error) {
      console.error("Error checking vehicle availability:", error);
      return false; // Return false on error to prevent scheduling
    }
  };

  // Function to handle saving an event from the Calendar component
  const handleSaveEvent = async (scheduleData) => {
    try {
      console.log("Sending schedule data:", scheduleData);

      // Extract waybillNumber and ensure it's in the correct format (simple number)
      const {
        waybillNumber: rawWaybillNumber,
        exactSelectedDate, // Extract the exact date selected in calendar
        ...schedulePayload
      } = scheduleData;

      // Log the raw waybill number for debugging
      console.log("Raw waybill number before processing:", {
        rawWaybillNumber,
        type: typeof rawWaybillNumber,
        length: rawWaybillNumber.length,
        charCodes: Array.from(rawWaybillNumber).map((c) => c.charCodeAt(0)),
      });

      // Convert waybill number to match database format (simple number without any prefix or leading zeros)
      const waybillNumber = rawWaybillNumber
        .replace(/^W+/i, "") // Remove W prefix if present
        .replace(/^0+/, "") // Remove leading zeros
        .trim(); // Remove whitespace

      console.log("Processing waybill number:", {
        original: rawWaybillNumber,
        processed: waybillNumber,
        url: `${process.env.NEXT_PUBLIC_BACKEND_API}/api/waybills/${waybillNumber}`,
      });

      // Verify the waybill exists before proceeding
      console.log("Checking if waybill exists...");
      try {
        const checkResponse = await axios.get(
          `${process.env.NEXT_PUBLIC_BACKEND_API}/api/waybills`
        );

        // Log all waybills from the database for comparison
        console.log("All waybills in database:", checkResponse.data);

        // Check if our waybill number is in the list
        const waybillExists = checkResponse.data.some(
          (w) => w.waybillNumber === waybillNumber
        );

        console.log(
          `Waybill ${waybillNumber} exists in database: ${waybillExists}`
        );

        if (!waybillExists) {
          throw new Error(
            `Waybill number ${waybillNumber} doesn't exist in the database`
          );
        }
      } catch (checkError) {
        console.error("Error checking waybill existence:", checkError);
        // We'll continue anyway in case the check failed but the waybill exists
      }

      // First, create the schedule with the waybill number included
      const scheduleResponse = await axios.post(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/schedule`,
        {
          ...schedulePayload,
          waybillNumber: waybillNumber, // Add the processed waybill number back to the payload
          isOnDelivery: true, // Explicitly set isOnDelivery to true
        }
      );

      // Generate a more unique trip ID that includes a timestamp
      const timestamp = Date.now();
      const random = Math.floor(Math.random() * 1000);
      const tripID = `T${String(random).padStart(4, "0")}`;

      // Use the schedule ID from the created schedule
      const scheduleID = scheduleResponse.data.scheduleID;

      // Then create the trip with the same data
      const tripResponse = await axios.post(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/trips`,
        {
          ...schedulePayload,
          tripID,
          scheduleID,
          status: "On-Delivery",
          arrivalDate: "00/00/0000",
          waybillNumber: waybillNumber, // Add the processed waybill number
        }
      );

      // Immediately update the trips state with the new trip to show ON DELIVERY status
      const newTrip = tripResponse.data;
      setTrips((prevTrips) => [...prevTrips, newTrip]);

      // Immediately update the schedules state with the new schedule
      // Prepend the new schedule to the beginning of the array
      const newSchedule = scheduleResponse.data;
      setSchedules((prevSchedules) => [newSchedule, ...prevSchedules]);

      // Create trip detail with the waybill number
      const tripDetailResponse = await axios.post(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/tripDetails`,
        {
          tripDetailID: `TD${Math.floor(1000 + Math.random() * 9000)}`, // Generate random 4-digit number for trip detail ID
          tripID,
          stubNumber: scheduleData.stubNumber,
          waybillNumber: waybillNumber, // Use the processed waybill number
          referenceNumber: waybillNumber,
        }
      );

      // Save to shipper info with the subLoadingDate
      try {
        // Use the exact date string with noon UTC time to preserve the day
        const exactDate = exactSelectedDate
          ? `${exactSelectedDate}T12:00:00Z`
          : scheduleData.loadingDate;
        console.log(
          `Setting subLoadingDate for waybill ${waybillNumber} with exact calendar date: ${exactDate}`
        );

        const shipperInfoResponse = await axios.post(
          `${process.env.NEXT_PUBLIC_BACKEND_API}/api/shipperInfo`,
          {
            waybillNumber: waybillNumber,
            shipper: "To be updated", // Placeholder that will be updated later
            date: null,
            pickupAddress: "To be updated", // Placeholder that will be updated later
            driverName: scheduleData.driver,
            plateNo: scheduleData.vehicle,
            datePrepared: null,
            storeType: "DC", // Default value that can be updated later
            mode: "company", // Default value that can be updated later
            // Use the exact date to preserve the selected calendar day
            subLoadingDate: exactDate,
          }
        );
        console.log(
          "Shipper info saved with preserved calendar date:",
          shipperInfoResponse.data
        );
      } catch (shipperError) {
        console.error("Error saving to shipper info:", shipperError);
        // Continue with process even if this specific save fails
      }

      // Log the API call we're about to make
      console.log("About to update waybill status:", {
        url: `${process.env.NEXT_PUBLIC_BACKEND_API}/api/waybills/number/${waybillNumber}`,
        method: "PUT",
        data: { status: "USED" },
      });

      // Update waybill status to USED - add timeout to ensure database is consistent
      setTimeout(async () => {
        try {
          const waybillResponse = await axios.put(
            `${process.env.NEXT_PUBLIC_BACKEND_API}/api/waybills/number/${waybillNumber}`,
            {
              status: "USED",
            }
          );
          console.log("Waybill update response:", waybillResponse.data);
        } catch (waybillError) {
          console.error("Error updating waybill status:", waybillError);
          // Continue anyway - we've created the schedule and trip
        }
      }, 500);

      toast({
        title: "Success",
        description: "Schedule, trip, and trip detail created successfully!",
        status: "success",
        duration: 3000,
        isClosable: true,
        position: "top-right",
      });

      // Refresh the calendar to update vehicle availability
      setCalendarRefreshKey((prevKey) => prevKey + 1);
    } catch (error) {
      console.error("Error saving schedule and trip:", error);
      console.log("Error details:", {
        response: error.response?.data,
        status: error.response?.status,
        url: error.config?.url,
        method: error.config?.method,
        data: error.config?.data,
      });
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to save schedule",
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "top-right",
      });
    }
  };

  // Helper function to get available drivers
  const getAvailableDrivers = async () => {
    try {
      // Step 1: Fetch employee data from the backend
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/employees/personal`
      );
      const employeeData = response.data;

      // Step 2: Filter employees with the position "Driver"
      const allDrivers = employeeData
        .filter((employee) => employee.position === "Driver")
        .map((employee) =>
          `${employee.firstName} ${employee.middleName || ""} ${
            employee.lastName
          }`.trim()
        );

      // Step 3: Fetch fresh trip data to get current on-delivery vehicles and their drivers
      const tripsResponse = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/trips`
      );
      const tripsData = tripsResponse.data?.trips || [];

      // Get vehicles that are currently On-Delivery and their drivers
      const onDeliveryVehiclesAndDrivers = tripsData
        .filter((trip) => trip.status === "On-Delivery")
        .map((trip) => ({
          vehicle: trip.vehicle,
          driver: trip.driver,
        }));

      // Update the onDeliveryDrivers state with drivers of On-Delivery vehicles
      const currentOnDeliveryDrivers = onDeliveryVehiclesAndDrivers.map(
        (item) => item.driver
      );
      setOnDeliveryDrivers(currentOnDeliveryDrivers);

      // Step 4: Filter out drivers who have vehicles that are On-Delivery
      const availableDriversList = allDrivers.filter(
        (driver) => !currentOnDeliveryDrivers.includes(driver)
      );

      // If editing current truck, include its current driver in the list
      if (currentTruck && currentTruck.driverName) {
        if (!availableDriversList.includes(currentTruck.driverName)) {
          availableDriversList.push(currentTruck.driverName);
        }
      }

      return availableDriversList;
    } catch (error) {
      console.error("Error fetching available drivers:", error);
      toast({
        title: "Error",
        description: "Failed to fetch available drivers",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return [];
    }
  };

  // Handle opening the edit modal
  const handleEdit = async (truck) => {
    try {
      setCurrentTruck(truck);
      setNewDriverName(truck.driverName);
      setIsEditModalOpen(true);

      // Step 1: Fetch current trips to get drivers that are On-Delivery
      const tripsResponse = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/trips`
      );
      const tripsData = tripsResponse.data?.trips || [];

      // Step 2: Get all drivers that are currently On-Delivery (case-insensitive)
      const driversOnDelivery = tripsData
        .filter((trip) => trip.status === "On-Delivery")
        .map((trip) => trip.driver.toLowerCase());

      // Step 3: Fetch all trucks to get already assigned drivers
      const trucksResponse = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/trucks`
      );
      const trucksData = trucksResponse.data || [];
      const assignedDrivers = trucksData
        .filter((t) => t._id !== truck._id) // Exclude current truck's driver
        .map((t) => t.driverName.toLowerCase());

      // Step 4: Fetch employee data
      const employeeResponse = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/employees/personal`
      );
      const employeeData = employeeResponse.data;

      // Step 5: Get all drivers from employees
      const allDrivers = employeeData
        .filter((employee) => employee.position === "Driver")
        .map((employee) =>
          `${employee.firstName} ${employee.middleName || ""} ${
            employee.lastName
          }`.trim()
        );

      // Step 6: Filter available drivers (case-insensitive comparison)
      const availableDriversList = allDrivers.filter((driver) => {
        const driverLower = driver.toLowerCase();

        // Always include current truck's driver
        if (driverLower === truck.driverName.toLowerCase()) {
          return true;
        }

        // Exclude drivers who are:
        // 1. On-Delivery (case-insensitive)
        // 2. Already assigned to other trucks
        return (
          !driversOnDelivery.includes(driverLower) &&
          !assignedDrivers.includes(driverLower)
        );
      });

      console.log({
        currentTruckDriver: truck.driverName,
        driversOnDelivery: driversOnDelivery,
        assignedDrivers: assignedDrivers,
        availableDriversList: availableDriversList,
      });

      setAvailableDrivers(availableDriversList);
    } catch (error) {
      console.error("Error loading drivers:", error);
      toast({
        title: "Error",
        description: "Failed to load available drivers",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  // Handle saving the updated driver name
  const handleSaveDriver = async () => {
    try {
      // Check if the driver is currently On-Delivery in another trip
      const tripsResponse = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/trips`
      );
      const tripsData = tripsResponse.data?.trips || [];

      const driverOnDeliveryTrip = tripsData.find(
        (trip) =>
          trip.status === "On-Delivery" &&
          trip.driver.toLowerCase() === newDriverName.toLowerCase() &&
          trip.vehicle !== currentTruck.plateNumber
      );

      if (driverOnDeliveryTrip) {
        toast({
          title: "Driver Unavailable",
          description: `This driver is currently on delivery with vehicle ${driverOnDeliveryTrip.vehicle}`,
          status: "error",
          duration: 3000,
          isClosable: true,
        });
        return;
      }

      // Update the truck's driver name in the backend
      const response = await axios.put(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/trucks/${currentTruck._id}`,
        { ...currentTruck, driverName: newDriverName }
      );

      if (response.status === 200) {
        fetchTrucks();
        setIsEditModalOpen(false);
        toast({
          title: "Success",
          description: "Driver name updated successfully",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error("Error updating driver name:", error);
      toast({
        title: "Error",
        description:
          error.response?.data?.error || "Failed to update driver name",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  // Find trip associated with a schedule
  const findTripByScheduleID = async (scheduleID) => {
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/trips`
      );
      const tripsData = response.data?.trips || [];
      const associatedTrip = tripsData.find(
        (trip) => trip.scheduleID === scheduleID
      );
      return associatedTrip || null;
    } catch (error) {
      console.error("Error finding trip by schedule ID:", error);
      toast({
        title: "Error",
        description: "Failed to find trip details",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return null;
    }
  };

  // Handle view trip details
  const handleViewTripDetails = async (scheduleID, stubNumber) => {
    try {
      const trip = await findTripByScheduleID(scheduleID);
      if (trip) {
        // Set the full trip object for the modal
        setSelectedTrip({
          ...trip,
          stubNumber: stubNumber || trip.stubNumber,
        });
        setIsTripDetailModalOpen(true);
      } else {
        toast({
          title: "Trip Not Found",
          description: "Could not find trip details for this schedule",
          status: "warning",
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error("Error viewing trip details:", error);
    }
  };

  // Handle clicking the Set Arrival Date icon
  const handleSetArrivalClick = async (schedule) => {
    try {
      const trip = await findTripByScheduleID(schedule.scheduleID);
      if (trip) {
        if (trip.status === "Completed" || trip.status === "Cancelled") {
          toast({
            title: "Action Not Allowed",
            description: `Trip is already ${trip.status.toLowerCase()}.`,
            status: "warning",
            duration: 3000,
            isClosable: true,
          });
          return;
        }
        setTripToSetArrival(trip); // Store the found trip object
        setArrivalDateInput(""); // Reset date input
        onArrivalModalOpen(); // Open the modal
      } else {
        toast({
          title: "Trip Not Found",
          description:
            "Could not find associated trip details for this schedule.",
          status: "warning",
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error("Error preparing to set arrival date:", error);
      toast({
        title: "Error",
        description: "An error occurred while fetching trip data.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  // Handle submitting the arrival date from the modal
  const handleConfirmArrivalDateSubmit = async () => {
    if (!tripToSetArrival || !arrivalDateInput) {
      toast({
        title: "Error",
        description: "Missing trip data or arrival date.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      // 1. Update the arrival date on the trip object
      const updateResponse = await axios.put(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/trips/${tripToSetArrival._id}`,
        {
          ...tripToSetArrival,
          arrivalDate: arrivalDateInput,
        }
      );

      if (updateResponse.status === 200) {
        // 2. Update the status to Completed
        const statusResponse = await axios.put(
          `${process.env.NEXT_PUBLIC_BACKEND_API}/api/trips/${tripToSetArrival.tripID}/status`,
          { status: "Completed" }
        );

        if (statusResponse.status === 200) {
          // 3. Update the schedule's isOnDelivery to false
          try {
            const scheduleResponse = await axios.put(
              `${process.env.NEXT_PUBLIC_BACKEND_API}/api/schedule/${tripToSetArrival.scheduleID}/delivery-status`,
              { isOnDelivery: false }
            );

            console.log(
              "Schedule delivery status updated:",
              scheduleResponse.data
            );
          } catch (scheduleError) {
            console.error(
              "Error updating schedule delivery status:",
              scheduleError
            );
            // Continue with the process even if this specific update fails
          }

          // Immediately update trips state to reflect the status change
          setTrips((prevTrips) =>
            prevTrips.map((trip) => {
              if (trip._id === tripToSetArrival._id) {
                return {
                  ...trip,
                  status: "Completed",
                  arrivalDate: arrivalDateInput,
                };
              }
              return trip;
            })
          );

          // Update the schedule state too with the new arrival date and isOnDelivery=false
          setSchedules((prevSchedules) =>
            prevSchedules.map((schedule) => {
              if (schedule.scheduleID === tripToSetArrival.scheduleID) {
                return {
                  ...schedule,
                  arrivalDate: arrivalDateInput,
                  isOnDelivery: false,
                };
              }
              return schedule;
            })
          );

          toast({
            title: "Success",
            description: "Arrival date set and trip marked as Completed!",
            status: "success",
            duration: 3000,
            isClosable: true,
          });
        } else {
          throw new Error("Failed to update trip status");
        }
      } else {
        throw new Error("Failed to update trip arrival date");
      }
    } catch (error) {
      console.error("Error confirming arrival date:", error);
      toast({
        title: "Error",
        description:
          error.message || "Failed to set arrival date and complete trip.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }

    // Refresh the calendar to update vehicle availability
    setCalendarRefreshKey((prevKey) => prevKey + 1);

    // Close modal and reset state regardless of success/failure
    onArrivalModalClose();
    setTripToSetArrival(null);
    setArrivalDateInput("");
  };

  // Add this new utility function to manually reset a schedule's delivery status
  const handleResetDeliveryStatus = async (schedule) => {
    try {
      // First, find the associated trip to determine correct status
      const associatedTrip = trips.find(
        (trip) => trip.scheduleID === schedule.scheduleID
      );

      let shouldBeOnDelivery = true; // Default

      if (associatedTrip) {
        // If trip is Completed, status should be false (not on delivery)
        if (associatedTrip.status === "Completed") {
          shouldBeOnDelivery = false;
        }
        // If trip is On-Delivery, status should be true
        else if (associatedTrip.status === "On-Delivery") {
          shouldBeOnDelivery = true;
        }
      } else {
        // No associated trip, probably should not be on delivery
        shouldBeOnDelivery = false;
      }

      // If the current status is already correct, inform user
      if (schedule.isOnDelivery === shouldBeOnDelivery) {
        toast({
          title: "Status Already Correct",
          description: `Schedule ${schedule.scheduleID} already has the correct delivery status: ${shouldBeOnDelivery ? "On Delivery" : "Not On Delivery"}`,
          status: "info",
          duration: 3000,
          isClosable: true,
        });
        return;
      }

      // Update the schedule's delivery status
      const response = await axios.put(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/schedule/${schedule.scheduleID}/delivery-status`,
        { isOnDelivery: shouldBeOnDelivery }
      );

      console.log(
        `Reset delivery status for schedule ${schedule.scheduleID}:`,
        response.data
      );

      // Update local state
      setSchedules((prevSchedules) =>
        prevSchedules.map((s) =>
          s.scheduleID === schedule.scheduleID
            ? { ...s, isOnDelivery: shouldBeOnDelivery }
            : s
        )
      );

      toast({
        title: "Status Reset",
        description: `Reset delivery status for schedule ${schedule.scheduleID} to ${shouldBeOnDelivery ? "On Delivery" : "Not On Delivery"}`,
        status: "success",
        duration: 3000,
        isClosable: true,
      });

      // Refresh data to show changes
      fetchSchedules();
    } catch (error) {
      console.error(
        `Error resetting delivery status for ${schedule.scheduleID}:`,
        error
      );
      toast({
        title: "Error",
        description: `Failed to reset delivery status: ${error.message}`,
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  return (
    <Box p={4}>
      {/* Header Section */}
      <Box
        mb={6}
        py={3}
        color="#1a365d"
        borderBottom="1px solid"
        borderColor="gray.200"
      >
        <Flex justify="space-between" align="center">
          <VStack align="start" spacing={1}>
            <Heading size="md" color="#1a365d" fontWeight="bold">
              Schedule Management
            </Heading>
            <Text color="gray.500" fontSize="xs">
              Manage delivery schedules and vehicle assignments
            </Text>
          </VStack>

          {/* Quick Stats Cards */}
          <Flex justify="flex-end" flex="1">
            <Grid templateColumns="repeat(2, minmax(180px, 1fr))" gap={4}>
              <Box
                bg="white"
                p={3}
                rounded="lg"
                shadow="sm"
                borderWidth="1px"
                borderColor="#1a365d"
                borderLeftWidth="4px"
              >
                <Text color="gray.500" fontSize="xs" mb={1}>
                  Total Schedules
                </Text>
                <Text fontSize="lg" fontWeight="bold" color="#1a365d">
                  {isLoading ? (
                    <Skeleton height="24px" width="20px" />
                  ) : (
                    schedules.length
                  )}
                </Text>
              </Box>
              <Box
                bg="white"
                p={3}
                rounded="lg"
                shadow="sm"
                borderWidth="1px"
                borderColor="#800020"
                borderLeftWidth="4px"
              >
                <Text color="gray.500" fontSize="xs" mb={1}>
                  Active Vehicles
                </Text>
                <Text fontSize="lg" fontWeight="bold" color="#800020">
                  {isLoading ? (
                    <Skeleton height="24px" width="20px" />
                  ) : (
                    trucks.filter((truck) => truck.status === "Active").length
                  )}
                </Text>
              </Box>
            </Grid>
          </Flex>
        </Flex>
      </Box>

      {/* Main Content */}
      <Grid templateColumns="2fr 1fr" gap={4}>
        {/* Calendar Section */}
        <GridItem>
          <Box
            bg="white"
            rounded="lg"
            shadow="md"
            p={3}
            borderWidth="1px"
            h="800px"
            position="relative"
          >
            {isLoading && (
              <Box
                position="absolute"
                top="0"
                left="0"
                right="0"
                bottom="0"
                bg="rgba(255, 255, 255, 0.8)"
                zIndex="999"
                display="flex"
                justifyContent="center"
                alignItems="center"
                borderRadius="lg"
              >
                <VStack>
                  <Spinner
                    thickness="4px"
                    speed="0.65s"
                    emptyColor="gray.200"
                    color="#1a365d"
                    size="xl"
                  />
                  <Text mt={4} fontWeight="medium" color="#1a365d">
                    Loading scheduler data...
                  </Text>
                </VStack>
              </Box>
            )}
            <Calendar key={calendarRefreshKey} onSaveEvent={handleSaveEvent} />
          </Box>
        </GridItem>

        {/* Sidebar Section */}
        <GridItem>
          <Box
            bg="white"
            rounded="lg"
            shadow="md"
            borderWidth="1px"
            h="100%"
            position="relative"
          >
            {isLoading && (
              <Box
                position="absolute"
                top="0"
                left="0"
                right="0"
                bottom="0"
                bg="rgba(255, 255, 255, 0.8)"
                zIndex="999"
                display="flex"
                justifyContent="center"
                alignItems="center"
                borderRadius="lg"
              >
                <Spinner
                  thickness="4px"
                  speed="0.65s"
                  emptyColor="gray.200"
                  color="#1a365d"
                  size="lg"
                />
              </Box>
            )}
            <Tabs>
              <TabList bg="#1a365d" color="white" rounded="t-lg">
                <Tab
                  _selected={{
                    color: "#1a365d",
                    bg: "white",
                    fontWeight: "bold",
                  }}
                  _hover={{ bg: "rgba(255,255,255,0.1)" }}
                  fontSize="sm"
                >
                  Request Schedule
                </Tab>
                <Tab
                  _selected={{
                    color: "#1a365d",
                    bg: "white",
                    fontWeight: "bold",
                  }}
                  _hover={{ bg: "rgba(255,255,255,0.1)" }}
                  fontSize="sm"
                >
                  Arrived
                </Tab>
                <Tab
                  _selected={{
                    color: "#1a365d",
                    bg: "white",
                    fontWeight: "bold",
                  }}
                  _hover={{ bg: "rgba(255,255,255,0.1)" }}
                  fontSize="sm"
                >
                  Vehicle
                </Tab>
              </TabList>

              <TabPanels>
                {/* Request Schedule Tab - Now filters out completed */}
                <TabPanel>
                  <VStack align="stretch" spacing={3}>
                    <Flex justify="space-between" align="center">
                      <Text fontSize="md" fontWeight="bold" color="#1a365d">
                        Scheduled Requests
                      </Text>
                    </Flex>
                    <InputGroup mb={3}>
                      <InputLeftElement pointerEvents="none">
                        <SearchIcon color="gray.500" />
                      </InputLeftElement>
                      <Input
                        placeholder="Search schedules..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        variant="filled"
                        bg="gray.100"
                        _placeholder={{ color: "gray.500" }}
                        _focus={{
                          bg: "white",
                          borderColor: "gray.300",
                          boxShadow: "sm",
                        }}
                        borderRadius="md"
                      />
                    </InputGroup>
                    <Box maxH="700px" overflowY="auto" px={2}>
                      {
                        isSchedulesLoading
                          ? // Skeleton loader for schedules
                            Array(5)
                              .fill(0)
                              .map((_, index) => (
                                <Box
                                  key={index}
                                  p={3}
                                  mb={2}
                                  borderWidth="1px"
                                  borderRadius="md"
                                  borderColor="gray.200"
                                >
                                  <SkeletonText
                                    mt="1"
                                    noOfLines={4}
                                    spacing="2"
                                    skeletonHeight="2"
                                  />
                                  <Flex w="100%" justify="flex-end" mt={3}>
                                    <Skeleton height="20px" width="90px" />
                                  </Flex>
                                </Box>
                              ))
                          : (() => {
                              // Wrap in IIFE to filter and map
                              const nonCompletedSchedules = schedules
                                .filter((schedule) => {
                                  // Debug log for problematic schedules
                                  if (
                                    !schedule.isOnDelivery &&
                                    schedule.arrivalDate &&
                                    schedule.arrivalDate !== "00/00/0000"
                                  ) {
                                    console.log(
                                      "Schedule that should be in Arrived tab:",
                                      {
                                        scheduleID: schedule.scheduleID,
                                        isOnDelivery: schedule.isOnDelivery,
                                        arrivalDate: schedule.arrivalDate,
                                        arrivalDateType:
                                          typeof schedule.arrivalDate,
                                      }
                                    );
                                  }

                                  // SIMPLIFIED LOGIC: Only show schedules with isOnDelivery=true in Request Schedule tab
                                  // This is the only condition that matters
                                  return schedule.isOnDelivery === true;
                                })
                                .filter((schedule) => {
                                  if (!searchTerm) return true;
                                  const lowerTerm = searchTerm.toLowerCase();
                                  return (
                                    schedule.scheduleID
                                      .toLowerCase()
                                      .includes(lowerTerm) ||
                                    schedule.vehicle
                                      .toLowerCase()
                                      .includes(lowerTerm) ||
                                    schedule.driver
                                      .toLowerCase()
                                      .includes(lowerTerm)
                                  );
                                });

                              if (nonCompletedSchedules.length > 0) {
                                return nonCompletedSchedules.map(
                                  (schedule, index) => {
                                    // Find the corresponding trip
                                    const associatedTrip = trips.find(
                                      (trip) =>
                                        trip.scheduleID === schedule.scheduleID
                                    );
                                    let statusText = "";
                                    let statusColorScheme = "gray";

                                    // Use isOnDelivery from schedule instead of checking trip status
                                    if (schedule.isOnDelivery) {
                                      statusText = "ON DELIVERY";
                                      statusColorScheme = "red";
                                    }

                                    return (
                                      <Box
                                        key={index}
                                        p={3}
                                        mb={2}
                                        borderWidth="1px"
                                        borderRadius="md"
                                        borderColor="gray.200"
                                        _hover={{
                                          borderColor: "#1a365d",
                                          shadow: "sm",
                                        }}
                                        position="relative" // Needed for absolute positioning of the badge
                                      >
                                        {statusText && (
                                          <Badge
                                            position="absolute"
                                            top="8px"
                                            right="8px"
                                            colorScheme={
                                              statusText === "ON DELIVERY"
                                                ? undefined
                                                : statusColorScheme
                                            }
                                            bg={
                                              statusText === "ON DELIVERY"
                                                ? "#800020"
                                                : undefined
                                            }
                                            color={
                                              statusText === "ON DELIVERY"
                                                ? "white"
                                                : undefined
                                            }
                                            fontSize="0.7em"
                                            px={2}
                                            py={0.5}
                                            borderRadius="md"
                                          >
                                            {statusText}
                                          </Badge>
                                        )}
                                        {schedule.backLoad && (
                                          <Badge
                                            position="absolute"
                                            top="32px"
                                            right="8px"
                                            colorScheme="purple"
                                            fontSize="0.7em"
                                            px={2}
                                            py={0.5}
                                            borderRadius="md"
                                          >
                                            BACKLOAD
                                          </Badge>
                                        )}
                                        <VStack align="start" spacing={1}>
                                          <Text
                                            fontWeight="medium"
                                            color="#1a365d"
                                            fontSize="sm"
                                          >
                                            Schedule ID: {schedule.scheduleID}
                                          </Text>
                                          <Text color="gray.600" fontSize="xs">
                                            Vehicle: {schedule.vehicle}
                                          </Text>
                                          <Text color="gray.600" fontSize="xs">
                                            Driver: {schedule.driver}
                                          </Text>
                                          <Text color="gray.600" fontSize="xs">
                                            Loading Date:{" "}
                                            {new Date(
                                              schedule.loadingDate
                                            ).toLocaleDateString()}
                                          </Text>
                                          {/* Arrival date display is removed from here as completed items are filtered out */}
                                          <Flex
                                            w="100%"
                                            justify="flex-end"
                                            mt={1}
                                          >
                                            <IconButton
                                              icon={<ViewIcon />}
                                              aria-label="View details"
                                              onClick={() =>
                                                handleViewTripDetails(
                                                  schedule.scheduleID,
                                                  schedule.stubNumber
                                                )
                                              }
                                              colorScheme="blue"
                                              variant="ghost"
                                              mr={2}
                                              size="sm"
                                            />
                                            <IconButton
                                              icon={<CalendarIcon />}
                                              aria-label="Set arrival date"
                                              onClick={() =>
                                                handleSetArrivalClick(schedule)
                                              }
                                              colorScheme="teal"
                                              variant="ghost"
                                              mr={2}
                                              size="sm"
                                              // Disable if trip is already completed or cancelled (redundant now, but safe)
                                              isDisabled={
                                                associatedTrip &&
                                                (associatedTrip.status ===
                                                  "Completed" ||
                                                  associatedTrip.status ===
                                                    "Cancelled")
                                              }
                                            />
                                            <IconButton
                                              icon={<DeleteIcon />}
                                              aria-label="Delete schedule"
                                              onClick={() =>
                                                handleDeleteScheduleClick(
                                                  schedule
                                                )
                                              }
                                              colorScheme="red"
                                              variant="ghost"
                                              size="sm"
                                            />
                                          </Flex>
                                        </VStack>
                                      </Box>
                                    );
                                  }
                                ); // End of map function
                              } else {
                                return (
                                  <Box
                                    p={6}
                                    textAlign="center"
                                    bg="gray.50"
                                    borderRadius="md"
                                  >
                                    <Text color="gray.500" fontSize="sm">
                                      No active schedules available
                                    </Text>
                                  </Box>
                                );
                              }
                            })() // End of IIFE
                      }
                    </Box>
                  </VStack>
                </TabPanel>

                {/* Moved Arrived Tab Panel */}
                <TabPanel>
                  <VStack align="stretch" spacing={3}>
                    <Flex justify="space-between" align="center">
                      <Text fontSize="md" fontWeight="bold" color="#1a365d">
                        Arrived Deliveries
                      </Text>
                    </Flex>
                    <InputGroup mb={3}>
                      <InputLeftElement pointerEvents="none">
                        <SearchIcon color="gray.500" />
                      </InputLeftElement>
                      <Input
                        placeholder="Search arrived deliveries..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        variant="filled"
                        bg="gray.100"
                        _placeholder={{ color: "gray.500" }}
                        _focus={{
                          bg: "white",
                          borderColor: "gray.300",
                          boxShadow: "sm",
                        }}
                        borderRadius="md"
                      />
                    </InputGroup>
                    <Box maxH="700px" overflowY="auto" px={2}>
                      {
                        isSchedulesLoading
                          ? // Skeleton loader for arrived schedules (can reuse logic)
                            Array(5)
                              .fill(0)
                              .map((_, index) => (
                                <Box
                                  key={index}
                                  p={3}
                                  mb={2}
                                  borderWidth="1px"
                                  borderRadius="md"
                                  borderColor="gray.200"
                                >
                                  <SkeletonText
                                    mt="1"
                                    noOfLines={3}
                                    spacing="2"
                                    skeletonHeight="2"
                                  />
                                </Box>
                              ))
                          : // Filter schedules to show only completed ones
                            (() => {
                              const arrivedSchedules = schedules
                                .filter((schedule) => {
                                  // SIMPLIFIED LOGIC: Only show schedules with isOnDelivery=false in Arrived tab
                                  return schedule.isOnDelivery === false;

                                  /* Removing the old complex logic
                                  // Check if the schedule should be in the Arrived tab
                                  // 1. Should not be on delivery
                                  if (schedule.isOnDelivery) {
                                    return false;
                                  }
                                  
                                  // 2. Must have a valid arrival date
                                  if (schedule.arrivalDate) {
                                    // Convert to date object to ensure proper comparison
                                    const arrivalDate = new Date(schedule.arrivalDate);
                                    // Valid date that's not the default
                                    if (arrivalDate instanceof Date && !isNaN(arrivalDate.getTime()) &&
                                        schedule.arrivalDate !== "00/00/0000") {
                                      return true; // Has valid arrival date, show in Arrived tab
                                    }
                                  }
                                  
                                  // 3. Check if associated trip is completed (fallback)
                                  const associatedTrip = trips.find(
                                    (trip) => trip.scheduleID === schedule.scheduleID
                                  );
                                  return associatedTrip && associatedTrip.status === "Completed";
                                  */
                                })
                                .filter((schedule) => {
                                  if (!searchTerm) return true;
                                  const lowerTerm = searchTerm.toLowerCase();
                                  return (
                                    schedule.scheduleID
                                      .toLowerCase()
                                      .includes(lowerTerm) ||
                                    schedule.vehicle
                                      .toLowerCase()
                                      .includes(lowerTerm) ||
                                    schedule.driver
                                      .toLowerCase()
                                      .includes(lowerTerm) ||
                                    (schedule.arrivalDate &&
                                      schedule.arrivalDate
                                        .toLowerCase()
                                        .includes(lowerTerm))
                                  );
                                });

                              if (arrivedSchedules.length > 0) {
                                return arrivedSchedules.map(
                                  (schedule, index) => {
                                    const associatedTrip = trips.find(
                                      (trip) =>
                                        trip.scheduleID === schedule.scheduleID
                                    );
                                    const arrivalDate =
                                      schedule.arrivalDate ||
                                      (associatedTrip
                                        ? associatedTrip.arrivalDate
                                        : null);

                                    return (
                                      <Box
                                        key={index}
                                        p={3}
                                        mb={2}
                                        borderWidth="1px"
                                        borderRadius="md"
                                        borderColor="gray.200"
                                        _hover={{
                                          borderColor: "#1a365d",
                                          shadow: "sm",
                                        }}
                                        position="relative"
                                      >
                                        <Badge
                                          position="absolute"
                                          top="8px"
                                          right="8px"
                                          colorScheme="blue"
                                          fontSize="0.7em"
                                          px={2}
                                          py={0.5}
                                          borderRadius="md"
                                        >
                                          ARRIVED
                                        </Badge>
                                        <VStack align="start" spacing={1}>
                                          <Text
                                            fontWeight="medium"
                                            color="#1a365d"
                                            fontSize="sm"
                                          >
                                            Schedule ID: {schedule.scheduleID}
                                          </Text>
                                          <Text color="gray.600" fontSize="xs">
                                            Vehicle: {schedule.vehicle}
                                          </Text>
                                          <Text color="gray.600" fontSize="xs">
                                            Driver: {schedule.driver}
                                          </Text>
                                          <Text color="gray.600" fontSize="xs">
                                            Loading Date:{" "}
                                            {new Date(
                                              schedule.loadingDate
                                            ).toLocaleDateString()}
                                          </Text>
                                          {arrivalDate &&
                                            arrivalDate !== "00/00/0000" && (
                                              <Text
                                                color="gray.600"
                                                fontSize="xs"
                                              >
                                                Arrival Date:{" "}
                                                {new Date(
                                                  arrivalDate
                                                ).toLocaleDateString()}
                                              </Text>
                                            )}
                                          {/* Optional: Add View Details Button if needed */}
                                          {/*
                                    <Flex w="100%" justify="flex-end" mt={1}>
                                      <IconButton
                                        icon={<ViewIcon />}
                                        aria-label="View details"
                                        onClick={() => handleViewTripDetails(schedule.scheduleID, schedule.stubNumber)}
                                        colorScheme="blue"
                                        variant="ghost"
                                        size="sm"
                                      />
                                    </Flex>
                                    */}
                                        </VStack>
                                      </Box>
                                    );
                                  }
                                );
                              } else {
                                return (
                                  <Box
                                    p={6}
                                    textAlign="center"
                                    bg="gray.50"
                                    borderRadius="md"
                                  >
                                    <Text color="gray.500" fontSize="sm">
                                      No arrived deliveries yet
                                    </Text>
                                  </Box>
                                );
                              }
                            })() // Immediately invoke the function
                      }
                    </Box>
                  </VStack>
                </TabPanel>

                {/* Vehicle Tab */}
                <TabPanel>
                  <VStack align="stretch" spacing={3}>
                    <Flex justify="space-between" align="center">
                      <Text fontSize="md" fontWeight="bold" color="#1a365d">
                        Scheduled Vehicles
                      </Text>
                    </Flex>
                    <InputGroup mb={3}>
                      <InputLeftElement pointerEvents="none">
                        <SearchIcon color="gray.500" />
                      </InputLeftElement>
                      <Input
                        placeholder="Search vehicles..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        variant="filled"
                        bg="gray.100"
                        _placeholder={{ color: "gray.500" }}
                        _focus={{
                          bg: "white",
                          borderColor: "gray.300",
                          boxShadow: "sm",
                        }}
                        borderRadius="md"
                      />
                    </InputGroup>
                    <Box maxH="600px" overflowY="auto">
                      {isVehiclesLoading ? (
                        <Table variant="simple" size="sm">
                          <Thead bg="gray.50">
                            <Tr>
                              <Th color="#1a365d" fontSize="xs">
                                Plate Number
                              </Th>
                              <Th color="#1a365d" fontSize="xs">
                                Driver
                              </Th>
                              <Th color="#1a365d" fontSize="xs">
                                Actions
                              </Th>
                            </Tr>
                          </Thead>
                          <Tbody>
                            {Array(4)
                              .fill(0)
                              .map((_, index) => (
                                <Tr key={index}>
                                  <Td>
                                    <Skeleton height="16px" width="80px" />
                                  </Td>
                                  <Td>
                                    <Skeleton height="16px" width="120px" />
                                  </Td>
                                  <Td>
                                    <Skeleton height="20px" width="40px" />
                                  </Td>
                                </Tr>
                              ))}
                          </Tbody>
                        </Table>
                      ) : (
                        <>
                          <Table variant="simple" size="sm">
                            <Thead bg="gray.50">
                              <Tr>
                                <Th color="#1a365d" fontSize="xs">
                                  Plate Number
                                </Th>
                                <Th color="#1a365d" fontSize="xs">
                                  Driver
                                </Th>
                                <Th color="#1a365d" fontSize="xs">
                                  Actions
                                </Th>
                              </Tr>
                            </Thead>
                            <Tbody>
                              {trucks.length > 0 ? (
                                trucks
                                  .filter((truck) => {
                                    const hasArrivalDate = trips.some(
                                      (trip) =>
                                        trip.vehicle === truck.plateNumber &&
                                        trip.arrivalDate &&
                                        trip.arrivalDate !== "00/00/0000"
                                    );
                                    return !hasArrivalDate;
                                  })
                                  .filter((truck) => {
                                    if (!searchTerm) return true;
                                    const lowerTerm = searchTerm.toLowerCase();
                                    return (
                                      truck.plateNumber
                                        .toLowerCase()
                                        .includes(lowerTerm) ||
                                      truck.driverName
                                        .toLowerCase()
                                        .includes(lowerTerm)
                                    );
                                  })
                                  .slice(
                                    (currentPage - 1) * itemsPerPage,
                                    currentPage * itemsPerPage
                                  )
                                  .map((truck, index) => (
                                    <Tr key={index} _hover={{ bg: "gray.50" }}>
                                      <Td fontWeight="medium" fontSize="xs">
                                        {truck.plateNumber}
                                      </Td>
                                      <Td fontSize="xs">{truck.driverName}</Td>
                                      <Td>
                                        <Button
                                          size="xs"
                                          variant="outline"
                                          color="#1a365d"
                                          borderColor="#1a365d"
                                          _hover={{
                                            bg: "#1a365d",
                                            color: "white",
                                          }}
                                          onClick={() => handleEdit(truck)}
                                        >
                                          Edit
                                        </Button>
                                      </Td>
                                    </Tr>
                                  ))
                              ) : (
                                <Tr>
                                  <Td colSpan={3} textAlign="center" py={4}>
                                    <Text color="gray.500" fontSize="xs">
                                      No vehicles available
                                    </Text>
                                  </Td>
                                </Tr>
                              )}
                            </Tbody>
                          </Table>
                          {trucks.length > itemsPerPage && (
                            <Flex
                              justify="space-between"
                              align="center"
                              mt={4}
                              px={4}
                            >
                              <Text fontSize="sm" color="gray.600">
                                Showing {(currentPage - 1) * itemsPerPage + 1}{" "}
                                to{" "}
                                {Math.min(
                                  currentPage * itemsPerPage,
                                  trucks.length
                                )}{" "}
                                of {trucks.length} vehicles
                              </Text>
                              <ChakraHStack spacing={2}>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    setCurrentPage((prev) =>
                                      Math.max(prev - 1, 1)
                                    )
                                  }
                                  isDisabled={currentPage === 1}
                                  color="#1a365d"
                                  borderColor="#1a365d"
                                >
                                  Previous
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    setCurrentPage((prev) =>
                                      Math.min(
                                        prev + 1,
                                        Math.ceil(trucks.length / itemsPerPage)
                                      )
                                    )
                                  }
                                  isDisabled={
                                    currentPage ===
                                    Math.ceil(trucks.length / itemsPerPage)
                                  }
                                  color="#1a365d"
                                  borderColor="#1a365d"
                                >
                                  Next
                                </Button>
                              </ChakraHStack>
                            </Flex>
                          )}
                        </>
                      )}
                    </Box>
                  </VStack>
                </TabPanel>
              </TabPanels>
            </Tabs>
          </Box>
        </GridItem>
      </Grid>

      {/* Edit Driver Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        size="sm"
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader bg="#1a365d" color="white" fontSize="sm">
            Edit Driver Assignment
          </ModalHeader>
          <ModalCloseButton color="white" />
          <ModalBody py={4}>
            <FormControl>
              <FormLabel fontWeight="medium" fontSize="xs">
                Select Driver
              </FormLabel>
              <Select
                value={newDriverName}
                onChange={(e) => setNewDriverName(e.target.value)}
                borderColor="gray.300"
                _focus={{
                  borderColor: "#1a365d",
                  boxShadow: "0 0 0 1px #1a365d",
                }}
                size="sm"
              >
                <option value="">Select a Driver</option>
                {availableDrivers.map((driver, index) => (
                  <option key={index} value={driver}>
                    {driver}
                  </option>
                ))}
              </Select>
            </FormControl>
          </ModalBody>
          <ModalFooter borderTopWidth="2px" borderColor="#800020">
            <Button
              bg="#1a365d"
              color="white"
              _hover={{ bg: "#2a4365" }}
              mr={3}
              onClick={handleSaveDriver}
              size="sm"
            >
              Save Changes
            </Button>
            <Button
              variant="outline"
              color="#800020"
              borderColor="#800020"
              onClick={() => setIsEditModalOpen(false)}
              size="sm"
            >
              Cancel
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Trip Details Modal - TripDetails is already a modal component */}
      {selectedTrip && (
        <TripDetails
          isOpen={isTripDetailModalOpen}
          onClose={() => setIsTripDetailModalOpen(false)}
          tripId={selectedTrip.tripID}
        />
      )}

      {/* Render the SetArrivalDateModal */}
      {tripToSetArrival && (
        <SetArrivalDateModal
          isOpen={isArrivalModalOpen}
          onClose={() => {
            onArrivalModalClose();
            setTripToSetArrival(null);
            setArrivalDateInput("");
          }}
          onSubmit={handleConfirmArrivalDateSubmit}
          selectedTripForArrival={tripToSetArrival} // Pass the full trip object
          selectedArrivalDate={arrivalDateInput}
          setSelectedArrivalDate={setArrivalDateInput}
        />
      )}

      {/* Schedule Delete Confirmation Dialog */}
      <AlertDialog
        isOpen={isDeleteScheduleOpen}
        leastDestructiveRef={cancelRef}
        onClose={onDeleteScheduleClose}
        isCentered
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete Schedule
            </AlertDialogHeader>
            <AlertDialogBody>
              {isDeletingSchedule ? (
                <VStack spacing={4} align="center" py={4}>
                  <Spinner
                    size="xl"
                    color="red.500"
                    thickness="4px"
                    speed="0.65s"
                  />
                  <Text fontWeight="bold">
                    Deleting Schedule and Related Data
                  </Text>
                  <Text fontSize="sm" textAlign="center">
                    {deletionStatus}
                  </Text>
                  {deletionProgress.total > 0 && (
                    <Text fontSize="sm" color="gray.600">
                      Progress: {deletionProgress.current} of{" "}
                      {deletionProgress.total} steps completed
                    </Text>
                  )}
                </VStack>
              ) : (
                <>
                  Are you sure you want to delete Schedule ID "
                  {scheduleToDelete?.scheduleID}"? (Vehicle:{" "}
                  {scheduleToDelete?.vehicle}, Driver:{" "}
                  {scheduleToDelete?.driver}) This action will permanently
                  delete: - The schedule - The associated trip - All trip
                  details - All waybill data (shipper info, consignee info,
                  subdetails) This is a cascading deletion that cannot be
                  undone.
                </>
              )}
            </AlertDialogBody>
            <AlertDialogFooter>
              {!isDeletingSchedule && (
                <Button ref={cancelRef} onClick={onDeleteScheduleClose}>
                  Cancel
                </Button>
              )}
              <Button
                colorScheme="red"
                isLoading={isDeletingSchedule}
                loadingText="Deleting All Data..."
                onClick={confirmDeleteSchedule}
                ml={3}
                isDisabled={isDeletingSchedule}
              >
                Delete All Data
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
};

export default Scheduler;
