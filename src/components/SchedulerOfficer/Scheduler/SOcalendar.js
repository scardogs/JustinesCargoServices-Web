import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  Grid,
  GridItem,
  Text,
  Flex,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverHeader,
  PopoverBody,
  PopoverFooter,
  Select,
  Button,
  Input,
  useToast,
  FormControl,
  FormLabel,
  PopoverArrow,
  PopoverCloseButton,
  VStack,
  Tooltip,
  InputGroup,
  InputRightElement,
  List,
  ListItem,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  Textarea,
  Radio,
  RadioGroup,
  Stack,
  HStack,
  Icon,
  Switch,
} from "@chakra-ui/react";
import {
  ChevronDownIcon,
  CloseIcon,
  SearchIcon,
  LockIcon,
} from "@chakra-ui/icons";
import { FiClock } from "react-icons/fi";
import axios from "axios";
import { useDisclosure } from "@chakra-ui/react";

// Define daysOfWeek array here
const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Searchable Select component for driver selection
const DriverSearchableSelect = ({ value, onChange, isDisabled = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [availableDrivers, setAvailableDrivers] = useState([]);
  const [filteredDrivers, setFilteredDrivers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const wrapperRef = useRef(null);

  // Fetch available drivers
  useEffect(() => {
    const fetchDrivers = async () => {
      try {
        setIsLoading(true);
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_BACKEND_API}/api/employees/personal`
        );
        // Filter employees with position "Driver"
        const drivers = response.data
          .filter((employee) => employee.position === "Driver")
          .map((employee) =>
            `${employee.firstName} ${employee.middleName || ""} ${employee.lastName}`.trim()
          );

        setAvailableDrivers(drivers);
        setFilteredDrivers(drivers);
      } catch (error) {
        console.error("Error fetching drivers:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDrivers();
  }, []);

  // Filter drivers based on search query
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredDrivers(availableDrivers);
    } else {
      const filtered = availableDrivers.filter((driver) =>
        driver.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredDrivers(filtered);
    }
  }, [searchQuery, availableDrivers]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [wrapperRef]);

  // Handle input change
  const handleInputChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    onChange(value);
    if (!isOpen) setIsOpen(true);
  };

  // Handle selecting a driver from the dropdown
  const handleSelectDriver = (driver) => {
    onChange(driver);
    setIsOpen(false);
    setSearchQuery("");
  };

  // Clear the selection
  const handleClear = () => {
    onChange("");
    setSearchQuery("");
  };

  return (
    <Box ref={wrapperRef} position="relative" w="100%">
      <InputGroup size="sm">
        <Input
          placeholder="Select or search driver"
          value={value || searchQuery}
          onChange={handleInputChange}
          onClick={() => !isDisabled && setIsOpen(true)}
          disabled={isDisabled}
          cursor={isDisabled ? "not-allowed" : "text"}
        />
        <InputRightElement width="4.5rem">
          {value && (
            <Button
              h="1.5rem"
              size="sm"
              onClick={handleClear}
              variant="ghost"
              mr="2"
              disabled={isDisabled}
            >
              <CloseIcon boxSize={3} />
            </Button>
          )}
          <Button
            h="1.5rem"
            size="sm"
            onClick={() => !isDisabled && setIsOpen(!isOpen)}
            variant="ghost"
            disabled={isDisabled}
          >
            <ChevronDownIcon />
          </Button>
        </InputRightElement>
      </InputGroup>

      {isOpen && (
        <Box
          position="absolute"
          top="100%"
          left={0}
          right={0}
          mt={1}
          maxH="200px"
          overflowY="auto"
          bg="white"
          borderWidth={1}
          borderRadius="md"
          zIndex={10}
          boxShadow="md"
        >
          <InputGroup size="sm" borderBottomWidth={1} p={2}>
            <Input
              placeholder="Search drivers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
            <InputRightElement>
              <SearchIcon color="gray.400" />
            </InputRightElement>
          </InputGroup>
          <List>
            {isLoading ? (
              <ListItem p={2} textAlign="center">
                Loading...
              </ListItem>
            ) : filteredDrivers.length > 0 ? (
              filteredDrivers.map((driver, index) => (
                <ListItem
                  key={index}
                  p={2}
                  cursor="pointer"
                  _hover={{ bg: "gray.100" }}
                  onClick={() => handleSelectDriver(driver)}
                >
                  {driver}
                </ListItem>
              ))
            ) : (
              <ListItem p={2} textAlign="center">
                No drivers found
              </ListItem>
            )}
          </List>
        </Box>
      )}
    </Box>
  );
};

// Helper function to format remaining time
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

const Calendar = ({ onSaveEvent }) => {
  const toast = useToast();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [popoverDay, setPopoverDay] = useState(null);
  const [plateNumber, setPlateNumber] = useState("");
  const [driver, setDriver] = useState("");
  const [activeTrucks, setActiveTrucks] = useState([]);
  const [onDeliveryVehicles, setOnDeliveryVehicles] = useState([]);
  const [onDeliveryDrivers, setOnDeliveryDrivers] = useState([]);
  const [stubNumber, setStubNumber] = useState("");
  const [unusedWaybills, setUnusedWaybills] = useState([]);
  const [selectedWaybill, setSelectedWaybill] = useState("");
  const [filteredWaybills, setFilteredWaybills] = useState([]);
  const [currentDate] = useState(new Date());
  const [tripCounts, setTripCounts] = useState({});
  const [scheduledVehicles, setScheduledVehicles] = useState({});
  const [activeScheduleCounts, setActiveScheduleCounts] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDriverManuallyEdited, setIsDriverManuallyEdited] = useState(false);
  const [backLoad, setBackLoad] = useState(false);
  const [remarks, setRemarks] = useState("");
  const calendarRef = useRef(null);
  // For borrow waybill feature
  const [isBorrowOpen, setIsBorrowOpen] = useState(false);
  const [borrowableWaybills, setBorrowableWaybills] = useState([]);
  const [borrowedWaybill, setBorrowedWaybill] = useState("");
  const [borrowRemarks, setBorrowRemarks] = useState("");
  const borrowPopoverRef = useRef(null);
  // For borrow waybill filtering by plate
  const [borrowSelectedPlateNumber, setBorrowSelectedPlateNumber] =
    useState("");
  const [borrowSelectedStubNumber, setBorrowSelectedStubNumber] = useState("");
  const [allUnusedWaybills, setAllUnusedWaybills] = useState([]);
  const [isBorrowed, setIsBorrowed] = useState(false);
  // Add a state to track validation for borrowing remarks
  const [borrowRemarksInvalid, setBorrowRemarksInvalid] = useState(false);
  const {
    isOpen: isAccessRequestOpen,
    onOpen: onAccessRequestOpen,
    onClose: onAccessRequestClose,
  } = useDisclosure();

  // Access Request Modal states
  const [requestRemarks, setRequestRemarks] = useState("");
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);

  // State for Timer Display
  const [unlockExpirationTime, setUnlockExpirationTime] = useState(null);
  const [unlockTimerDisplay, setUnlockTimerDisplay] = useState(null);
  const timerIntervalRef = useRef(null);

  // State to track if date unlock is approved
  const [isDateUnlockApproved, setIsDateUnlockApproved] = useState(false);
  const approvalCheckIntervalRef = useRef(null); // Ref to store interval ID

  // --- Fetch and Check Approval Status (Modified) ---
  const checkUnlockApproval = async () => {
    const token = localStorage.getItem("token");
    const userString = localStorage.getItem("user");

    if (!token || !userString) {
      setIsDateUnlockApproved(false);
      setUnlockExpirationTime(null); // Reset expiration time if not logged in
      return;
    }

    try {
      const user = JSON.parse(userString);
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/control-panel`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const approvedUnlockRequest = response.data.find(
        (req) =>
          req.Module === "Scheduler" &&
          req.RequestType === "Unlock All Dates" &&
          req.Username === user.name &&
          req.Status === "Approved" &&
          (!req.ExpiresAt || new Date(req.ExpiresAt) > new Date())
      );

      const isApproved = !!approvedUnlockRequest;
      setIsDateUnlockApproved(isApproved);

      // Store expiration time if approved and exists
      if (isApproved && approvedUnlockRequest.ExpiresAt) {
        setUnlockExpirationTime(new Date(approvedUnlockRequest.ExpiresAt));
      } else {
        setUnlockExpirationTime(null);
      }
    } catch (error) {
      console.error("Error checking unlock approval status:", error);
      // Keep previous state on error
      // setUnlockExpirationTime(null); // Optionally reset timer on error
    }
  };

  // Fetch approval status on mount and set up interval
  useEffect(() => {
    checkUnlockApproval(); // Initial check

    // Clear previous interval if exists
    if (approvalCheckIntervalRef.current) {
      clearInterval(approvalCheckIntervalRef.current);
    }

    // Set up interval to re-check every 60 seconds
    approvalCheckIntervalRef.current = setInterval(checkUnlockApproval, 60000);

    // Cleanup interval on component unmount
    return () => {
      if (approvalCheckIntervalRef.current) {
        clearInterval(approvalCheckIntervalRef.current);
      }
    };
  }, []); // Run only on mount
  // --- End Approval Check ---

  // --- Timer Calculation Effect ---
  useEffect(() => {
    // Clear existing timer if expiration time changes or becomes null
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
      setUnlockTimerDisplay(null); // Clear display immediately
    }

    if (unlockExpirationTime && unlockExpirationTime > new Date()) {
      // Function to update timer display
      const updateTimer = () => {
        const now = new Date();
        const remaining = unlockExpirationTime - now;

        if (remaining <= 0) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
          setUnlockTimerDisplay(null);
          setUnlockExpirationTime(null); // Clear expiration state
          setIsDateUnlockApproved(false); // Explicitly set to false
          // Optionally re-trigger backend check to be sure
          // checkUnlockApproval();
        } else {
          setUnlockTimerDisplay(formatRemainingTime(remaining));
        }
      };

      // Initial call to set the timer immediately
      updateTimer();

      // Set up the interval
      timerIntervalRef.current = setInterval(updateTimer, 1000);
    }

    // Cleanup function to clear interval on unmount or dependency change
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [unlockExpirationTime]); // Rerun when expiration time changes
  // --- End Timer Calculation Effect ---

  // Check if a date is selectable (modified for unlock approval)
  const isDateSelectable = (day) => {
    // If unlock is approved, all dates are selectable
    if (isDateUnlockApproved) {
      return true;
    }

    // Original 30-day logic if unlock is not approved
    if (!day) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to beginning of day for fair comparison

    const dateToCheck = new Date(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
      day
    );

    // Calculate date 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    // Check if date is between 30 days ago and today (inclusive)
    return dateToCheck >= thirtyDaysAgo && dateToCheck <= today;
  };

  // Handle date cell click
  const handleDateClick = (day) => {
    if (day && isDateSelectable(day)) {
      // If clicking the same day that's already open, close it
      if (popoverDay === day) {
        setPopoverDay(null);
      } else {
        setPopoverDay(day);
      }
    } else if (day) {
      toast({
        title: "Invalid selection",
        description:
          "You can only select dates from the past 30 days up to today",
        status: "warning",
        duration: 3000,
        isClosable: true,
        position: "top-right",
      });
    }
  };

  // Fetch active trucks, on-delivery trips, and on-delivery drivers
  const fetchActiveTrucksAndTrips = async () => {
    try {
      // Fetch active trucks
      const trucksResponse = await fetch(
        process.env.NEXT_PUBLIC_BACKEND_API + "/api/trucks"
      );
      if (!trucksResponse.ok) {
        throw new Error("Failed to fetch trucks");
      }
      const trucksData = await trucksResponse.json();
      const activeTrucksData = trucksData.filter(
        (truck) => truck.status === "Active"
      );
      setActiveTrucks(activeTrucksData);

      // Fetch trips to get vehicles and drivers that are On-Delivery
      const tripsResponse = await fetch(
        process.env.NEXT_PUBLIC_BACKEND_API + "/api/trips"
      );
      if (!tripsResponse.ok) {
        throw new Error("Failed to fetch trips");
      }
      const tripsData = await tripsResponse.json();

      // Get vehicles on delivery
      const onDeliveryPlates = tripsData.trips
        .filter((trip) => trip.status === "On-Delivery")
        .map((trip) => trip.vehicle);
      setOnDeliveryVehicles(onDeliveryPlates);

      // Get drivers on delivery
      const onDeliveryDriversList = tripsData.trips
        .filter((trip) => trip.status === "On-Delivery")
        .map((trip) => trip.driver);
      setOnDeliveryDrivers(onDeliveryDriversList);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "Failed to fetch vehicle and driver data",
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "top-right",
      });
    }
  };

  // Filter out trucks that are currently On-Delivery
  const availableTrucks = activeTrucks.filter(
    (truck) => !onDeliveryVehicles.includes(truck.plateNumber)
  );

  // Modify handlePlateNumberChange to also filter waybills
  const handlePlateNumberChange = async (e) => {
    const selectedPlate = e.target.value;
    setPlateNumber(selectedPlate);
    setSelectedWaybill(""); // Reset selected waybill when truck changes

    // Find the selected truck
    const selectedTruck = activeTrucks.find(
      (truck) => truck.plateNumber === selectedPlate
    );

    if (selectedTruck) {
      // Set the driver name only if it hasn't been manually edited
      if (!isDriverManuallyEdited) {
        if (onDeliveryDrivers.includes(selectedTruck.driverName)) {
          toast({
            title: "Driver Unavailable",
            description: "This driver is currently on another delivery",
            status: "warning",
            duration: 3000,
            isClosable: true,
            position: "top-right",
          });
          setDriver("");
        } else {
          setDriver(selectedTruck.driverName);
        }
      }

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
        } else {
          setStubNumber("");
          setFilteredWaybills([]);
          toast({
            title: "Error",
            description: "Truck details not found",
            status: "error",
            duration: 3000,
            isClosable: true,
            position: "top-right",
          });
        }
      } catch (error) {
        console.error("Error fetching stub number:", error);
        setStubNumber("");
        setFilteredWaybills([]);
        toast({
          title: "Error",
          description: "Failed to fetch truck details",
          status: "error",
          duration: 3000,
          isClosable: true,
          position: "top-right",
        });
      }
    } else {
      setDriver("");
      setStubNumber("");
      setFilteredWaybills([]);
    }
  };

  // Handle driver selection
  const handleDriverChange = (newDriver) => {
    setDriver(newDriver);
    setIsDriverManuallyEdited(true);
  };

  // Reset driver manual edit flag when popover is closed
  useEffect(() => {
    if (popoverDay === null) {
      setIsDriverManuallyEdited(false);
    }
  }, [popoverDay]);

  // Generate a unique schedule ID
  const generateScheduleID = () => {
    const timestamp = new Date().getTime();
    const random = Math.floor(Math.random() * 1000);
    return `S${String(random).padStart(4, "0")}`;
  };

  // Add this new function to fetch unused waybills
  const fetchUnusedWaybills = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/waybills?status=UNUSED`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch unused waybills");
      }
      const data = await response.json();
      setUnusedWaybills(data);
    } catch (error) {
      console.error("Error fetching unused waybills:", error);
      toast({
        title: "Error",
        description: "Failed to fetch unused waybills",
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "top-right",
      });
    }
  };

  // Add this new function to fetch trip counts
  const fetchTripCounts = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/trips`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch trips");
      }
      const data = await response.json();

      // Process trips to count by date
      const counts = {};
      data.trips.forEach((trip) => {
        const tripDate = new Date(trip.loadingDate);
        const dateKey = `${tripDate.getFullYear()}-${tripDate.getMonth()}-${tripDate.getDate()}`;
        counts[dateKey] = (counts[dateKey] || 0) + 1;
      });
      setTripCounts(counts);
    } catch (error) {
      console.error("Error fetching trip counts:", error);
    }
  };

  // Add this new function to fetch scheduled vehicles
  const fetchScheduledVehicles = async () => {
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/schedule`
      );
      const schedules = response.data;

      const vehiclesByDate = {};
      const newActiveScheduleCounts = {};

      schedules.forEach((schedule) => {
        const date = new Date(schedule.loadingDate);
        const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

        // Only count and add to vehiclesByDate if schedule.isOnDelivery is strictly true
        if (schedule.isOnDelivery === true) {
          if (!vehiclesByDate[dateKey]) {
            vehiclesByDate[dateKey] = [];
          }
          vehiclesByDate[dateKey].push({
            vehicle: schedule.vehicle,
            driver: schedule.driver,
          });
          // Increment the active count for this day
          newActiveScheduleCounts[dateKey] =
            (newActiveScheduleCounts[dateKey] || 0) + 1;

          // Optional: Add a console log to verify which schedules are being counted
          // console.log(`Schedule on ${dateKey} (vehicle: ${schedule.vehicle}) is counted. isOnDelivery: ${schedule.isOnDelivery}`);
        }
        // If isOnDelivery is not strictly true, it will not be added to vehiclesByDate (for tooltip)
        // nor counted in newActiveScheduleCounts (for badge)
      });

      setScheduledVehicles(vehiclesByDate);
      setActiveScheduleCounts(newActiveScheduleCounts);
    } catch (error) {
      console.error("Error fetching scheduled vehicles:", error);
    }
  };

  // === Access Request Handlers (Updated for Pending Check) ===
  const handleAccessRequestOpen = async () => {
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
          req.Module === "Scheduler" &&
          req.Username === user.name &&
          req.Status === "Pending"
      );

      if (existingPendingRequest) {
        toast({
          title: "Pending Request Exists",
          description: `You already have a pending request (${existingPendingRequest.RequestType}) for Scheduler access.`,
          status: "warning",
          duration: 5000,
          isClosable: true,
        });
        return; // Prevent modal from opening
      }
    } catch (error) {
      console.error("Error checking for pending requests:", error);
      toast({
        title: "Error",
        description: "Could not verify existing requests. Please try again.",
        status: "error",
      });
      return; // Prevent modal from opening on error
    }

    // If no pending request, proceed to open modal
    setRequestRemarks("");
    setIsSubmittingRequest(false);
    onAccessRequestOpen();
  };

  const handleSubmitRequest = async () => {
    setIsSubmittingRequest(true);
    try {
      const token = localStorage.getItem("token");
      const userString = localStorage.getItem("user");
      if (!token || !userString)
        throw new Error("Authentication details not found.");
      const user = JSON.parse(userString);
      const generatedRequestID = `REQ-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const payload = {
        RequestID: generatedRequestID,
        Module: "Scheduler",
        RequestType: "Unlock All Dates", // Hardcoded request type
        Remarks: requestRemarks,
        Username: user.name,
        UserRole: user.workLevel,
      };
      console.log("Submitting Request Payload:", payload);
      await axios.post(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/control-panel`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast({
        title: "Request Submitted",
        description: "Your request to unlock dates has been sent.",
        status: "success",
        duration: 5000,
        isClosable: true,
      });
      onAccessRequestClose();
    } catch (error) {
      console.error("Error submitting access request:", error);
      toast({
        title: "Request Failed",
        description:
          error.response?.data?.message ||
          error.message ||
          "Could not submit unlock request.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsSubmittingRequest(false);
    }
  };
  // === End Access Request Handlers ===

  // Add this new function to fetch all unused waybills
  const fetchAllUnusedWaybills = async () => {
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/waybills?status=UNUSED`
      );
      setAllUnusedWaybills(response.data);
    } catch (error) {
      console.error("Error fetching all unused waybills:", error);
      toast({
        title: "Error",
        description: "Failed to fetch waybill data",
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "top-right",
      });
    }
  };

  // Call this when the component mounts and potentially when needed
  useEffect(() => {
    fetchAllUnusedWaybills();
  }, []);

  // New function to handle plate number selection WITHIN the borrow popover
  const handleBorrowPlateNumberChange = async (e) => {
    const selectedBorrowPlate = e.target.value;
    setBorrowSelectedPlateNumber(selectedBorrowPlate);
    setBorrowedWaybill(""); // Reset selected waybill when borrow plate changes
    setBorrowableWaybills([]); // Clear current list

    if (selectedBorrowPlate) {
      const selectedBorrowTruck = activeTrucks.find(
        (truck) => truck.plateNumber === selectedBorrowPlate
      );

      if (selectedBorrowTruck) {
        try {
          // Fetch the stub number for the selected borrow vehicle
          const response = await axios.get(
            `${process.env.NEXT_PUBLIC_BACKEND_API}/api/trucks/${selectedBorrowTruck._id}`
          );

          if (response.data) {
            const borrowStubNum = response.data.stubNumber || "";
            setBorrowSelectedStubNumber(borrowStubNum);

            // Only proceed to fetch waybills if there is a stub number
            if (borrowStubNum && borrowStubNum.trim() !== "") {
              // Use direct API calls to fetch waybills, same as in the main form
              if (borrowStubNum.includes("/")) {
                // Multiple stubs case (format: "1/2/3/4")
                const stubArray = borrowStubNum.split("/");

                // Fetch waybills for all stubs in the array
                const waybillPromises = stubArray.map((stub) =>
                  axios.get(
                    `${process.env.NEXT_PUBLIC_BACKEND_API}/api/waybills?stub=${stub.trim()}&status=UNUSED`
                  )
                );

                try {
                  const waybillResponses = await Promise.all(waybillPromises);
                  const allWaybills = waybillResponses.flatMap(
                    (response) => response.data
                  );

                  // Remove duplicates based on waybillNumber
                  const uniqueWaybills = Array.from(
                    new Map(
                      allWaybills.map((waybill) => [
                        waybill.waybillNumber,
                        waybill,
                      ])
                    ).values()
                  );

                  console.log("Borrow waybills found:", uniqueWaybills);
                  setBorrowableWaybills(uniqueWaybills);
                } catch (err) {
                  console.error(
                    "Error fetching waybills for multiple stubs:",
                    err
                  );
                  setBorrowableWaybills([]);
                }
              } else {
                // Single stub case
                try {
                  console.log(
                    "Fetching waybills for single stub:",
                    borrowStubNum
                  );
                  const waybillResponse = await axios.get(
                    `${process.env.NEXT_PUBLIC_BACKEND_API}/api/waybills?stub=${borrowStubNum.trim()}&status=UNUSED`
                  );
                  console.log("Borrow waybills found:", waybillResponse.data);
                  setBorrowableWaybills(waybillResponse.data);
                } catch (err) {
                  console.error(
                    "Error fetching waybills for single stub:",
                    err
                  );
                  setBorrowableWaybills([]);
                }
              }
            } else {
              // No stub number, clear waybills list
              console.log(
                "No stub number found for selected vehicle. Waybills not loaded."
              );
              setBorrowableWaybills([]);
            }
          } else {
            setBorrowSelectedStubNumber("");
            setBorrowableWaybills([]);
          }
        } catch (error) {
          console.error("Error fetching stub for borrow truck:", error);
          setBorrowSelectedStubNumber("");
          setBorrowableWaybills([]);
        }
      }
    }
  };

  // Toggle the borrow waybill popover
  const toggleBorrowWaybill = () => {
    // Reset borrow state when opening
    if (!isBorrowOpen) {
      setBorrowSelectedPlateNumber("");
      setBorrowSelectedStubNumber("");
      setBorrowableWaybills([]);
      setBorrowedWaybill("");
      setBorrowRemarks("");
      // Ensure all unused waybills are fetched if needed (e.g., if initial fetch failed)
      if (allUnusedWaybills.length === 0) {
        fetchAllUnusedWaybills();
      }
    }
    setIsBorrowOpen(!isBorrowOpen);
  };

  // Handle borrow confirmation
  const confirmBorrow = () => {
    // Reset error state
    setBorrowRemarksInvalid(false);

    // Validate required fields
    let hasError = false;

    if (!borrowedWaybill) {
      toast({
        title: "Selection Required",
        description: "Please select a waybill to borrow",
        status: "warning",
        duration: 3000,
        isClosable: true,
        position: "top-right",
      });
      hasError = true;
    }

    // Validate remarks are not empty
    if (!borrowRemarks || borrowRemarks.trim() === "") {
      setBorrowRemarksInvalid(true);
      toast({
        title: "Remarks Required",
        description: "Please provide a reason for borrowing this waybill",
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "top-right",
      });
      hasError = true;
    }

    // If any validation errors, don't proceed
    if (hasError) {
      return;
    }

    // OVERRIDE the selected waybill in the main form with the borrowed one
    setSelectedWaybill(borrowedWaybill);

    // OVERRIDE the stub number in the main form with the borrowed vehicle's stub number
    setStubNumber(borrowSelectedStubNumber);

    // Set remarks from the borrow popover
    setRemarks(borrowRemarks);

    // Set the borrowed flag to true in the state
    // This will be sent to the backend when saving the schedule
    setIsBorrowed(true);

    // Log the action for debugging
    console.log(
      `Borrowed waybill ${borrowedWaybill} from vehicle ${borrowSelectedPlateNumber} with stub ${borrowSelectedStubNumber}`
    );
    console.log(`Stub number overridden to: ${borrowSelectedStubNumber}`);
    console.log(`Remarks: ${borrowRemarks}`);
    console.log(`Borrowed status set to: true`);

    // Reset borrow states including selected plate
    setBorrowSelectedPlateNumber("");
    setBorrowSelectedStubNumber("");
    setBorrowableWaybills([]);
    setBorrowedWaybill("");
    setBorrowRemarks("");
    setBorrowRemarksInvalid(false); // Reset error state

    // Close the popover
    setIsBorrowOpen(false);

    toast({
      title: "Waybill Borrowed",
      description: `Successfully borrowed waybill ${borrowedWaybill} with stub ${borrowSelectedStubNumber}`,
      status: "success",
      duration: 3000,
      isClosable: true,
      position: "top-right",
    });
  };

  // Effect to close borrow popover on outside clicks
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        borrowPopoverRef.current &&
        !borrowPopoverRef.current.contains(event.target) &&
        isBorrowOpen
      ) {
        setIsBorrowOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isBorrowOpen]);

  // Reset invalid state when popover is closed
  useEffect(() => {
    if (!isBorrowOpen) {
      setBorrowRemarksInvalid(false);
    }
  }, [isBorrowOpen]);

  // Modify handleSaveEvent to include updating shipperInfo.subLoadingDate
  const handleSaveEvent = async () => {
    if (!plateNumber || !driver || !selectedWaybill) {
      toast({
        title: "Validation Error",
        description: "Please fill all fields including waybill number",
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "top-right",
      });
      return;
    }

    // Prevent multiple submissions
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Create exact calendar selected date
      const selectedCalendarDate = new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        popoverDay
      );

      // Create a date string that preserves the day exactly as selected (YYYY-MM-DD format)
      // This prevents timezone issues by using only the date part
      const selectedDateString = selectedCalendarDate
        .toISOString()
        .split("T")[0];

      // Format as ISO string for API but preserve the selected date
      const loadingDate = selectedCalendarDate.toISOString();

      // Create a new Date object for the current timestamp
      const currentTimestamp = new Date().toISOString();

      const scheduleData = {
        vehicle: plateNumber.trim(),
        driver: driver.trim(),
        loadingDate: loadingDate,
        stubNumber: stubNumber,
        waybillNumber: selectedWaybill.trim(),
        backLoad: backLoad,
        remarks: remarks.trim(),
        isBorrowed: isBorrowed, // Include the borrowed status in the data
        timestamp: currentTimestamp,
        // Add the exact date string to ensure it's preserved
        exactSelectedDate: selectedDateString,
      };

      console.log("Prepared schedule data:", scheduleData);

      // First, save the schedule
      await onSaveEvent(scheduleData);

      // Then, update the shipperInfo.subLoadingDate field for the associated waybill
      try {
        console.log(
          `Updating shipperInfo.subLoadingDate for waybill ${selectedWaybill} with exact date: ${selectedDateString}`
        );

        // Use the exact date string to create a date at noon to avoid timezone issues
        const updateResponse = await axios.post(
          `${process.env.NEXT_PUBLIC_BACKEND_API}/api/shipperInfo`,
          {
            waybillNumber: selectedWaybill.trim(),
            // Use the date string with T12:00:00Z to set it to noon UTC, which should preserve the day
            subLoadingDate: `${selectedDateString}T12:00:00Z`,
            // Also include the raw selected day for debugging
            selectedDay: popoverDay,
            selectedMonth: selectedDate.getMonth(),
            selectedYear: selectedDate.getFullYear(),
          }
        );
        console.log("ShipperInfo update response:", updateResponse.data);
      } catch (shipperInfoError) {
        console.error(
          "Error updating shipperInfo.subLoadingDate:",
          shipperInfoError
        );
        toast({
          title: "Warning",
          description:
            "Schedule created but failed to update shipper info loading date",
          status: "warning",
          duration: 5000,
          isClosable: true,
          position: "top-right",
        });
      }

      // Refresh the truck and trip data
      await fetchActiveTrucksAndTrips();
      await fetchUnusedWaybills();
      await fetchTripCounts();
      await fetchScheduledVehicles();

      // Reset state
      setPopoverDay(null);
      setPlateNumber("");
      setDriver("");
      setSelectedWaybill("");
      setBackLoad(false);
      setRemarks("");
      setIsBorrowed(false);

      toast({
        title: "Success",
        description: "Schedule saved successfully",
        status: "success",
        duration: 3000,
        isClosable: true,
        position: "top-right",
      });
    } catch (error) {
      console.error("Error saving schedule:", error);

      if (error.response) {
        console.error("Error response data:", error.response.data);
        console.error("Error response status:", error.response.status);
        console.error("Error details:", error.response.data.details);
      }

      toast({
        title: "Error",
        description:
          error.response?.data?.details?.join(", ") ||
          error.response?.data?.error ||
          error.message ||
          "Failed to save schedule",
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "top-right",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Prevent navigating to future months
  const handleMonthChange = (direction) => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() + direction);

    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    // Don't allow going to future months
    if (
      newDate.getFullYear() > currentYear ||
      (newDate.getFullYear() === currentYear &&
        newDate.getMonth() > currentMonth)
    ) {
      setSelectedDate(new Date(currentYear, currentMonth));
      return;
    }

    // Allow going to any past month
    setSelectedDate(newDate);
  };

  // Generate calendar grid for the current month
  const generateCalendar = () => {
    const firstDayOfMonth = new Date(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
      1
    );
    const lastDayOfMonth = new Date(
      selectedDate.getFullYear(),
      selectedDate.getMonth() + 1,
      0
    );
    const daysInMonth = lastDayOfMonth.getDate();
    const startDay = firstDayOfMonth.getDay();

    // Get the last day of the previous month
    const lastDayOfPrevMonth = new Date(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
      0
    ).getDate();

    // Create array with dates from previous month
    const calendarDays = [];

    // Add days from previous month
    for (let i = 0; i < startDay; i++) {
      const prevMonthDay = lastDayOfPrevMonth - startDay + i + 1;
      calendarDays.push({
        day: prevMonthDay,
        isPrevMonth: true,
      });
    }

    // Add days from current month
    for (let day = 1; day <= daysInMonth; day++) {
      calendarDays.push({
        day: day,
        isPrevMonth: false,
      });
    }

    // Calculate total days so far
    const totalDaysSoFar = calendarDays.length;

    // Calculate how many days from next month we need to add
    // to complete a 6-row calendar (42 cells) or at least complete the current row
    const rowsToComplete = totalDaysSoFar <= 35 ? 42 : 35;
    const daysToAdd = rowsToComplete - totalDaysSoFar;

    // Add days from next month
    for (let day = 1; day <= daysToAdd; day++) {
      calendarDays.push({
        day: day,
        isPrevMonth: false,
        isNextMonth: true,
      });
    }

    return calendarDays;
  };

  // Get the name of the current month
  const getMonthName = (date) => {
    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    return months[date.getMonth()];
  };

  // Update the isCurrentMonth function to only check if we're in the current month
  const isCurrentMonth = () => {
    const today = new Date();
    return (
      selectedDate.getMonth() === today.getMonth() &&
      selectedDate.getFullYear() === today.getFullYear()
    );
  };

  const calendarDays = generateCalendar();

  // Fetch initial data on mount and when selectedDate changes
  useEffect(() => {
    fetchActiveTrucksAndTrips();
    fetchUnusedWaybills();
    fetchTripCounts();
    fetchScheduledVehicles();
    // checkUnlockApproval(); // Already handled by its own useEffect with interval
  }, [selectedDate]); // Removed checkUnlockApproval from here

  // Add an effect to handle popover cleanup when component unmounts
  useEffect(() => {
    return () => {
      // Cleanup function to ensure popover state is reset on unmount
      setPopoverDay(null);
    };
  }, []);

  // Add effect to close popover on outside clicks
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        calendarRef.current &&
        !calendarRef.current.contains(event.target) &&
        popoverDay !== null
      ) {
        setPopoverDay(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [popoverDay]);

  return (
    <Box fontFamily="Poppins, sans-serif" mt={20} ref={calendarRef}>
      {/* Header with Month and Year (Updated for Timer) */}
      <Flex
        position="relative"
        alignItems="center"
        pb={4}
        bg="maroon"
        p={3}
        borderRadius="md"
        mb={3}
        minHeight="50px"
      >
        {/* Timer Display (Left) - Conditional */}
        {unlockTimerDisplay && (
          <Flex alignItems="baseline" color="white" fontSize="xs" mr={3}>
            <Icon as={FiClock} mr={1} boxSize={3} />
            <Text>Unlock active: {unlockTimerDisplay}</Text>
          </Flex>
        )}

        {/* Centered Navigation Group (Absolute Position) */}
        <Box
          position="absolute"
          left="50%"
          top="50%"
          transform="translate(-50%, -50%)"
        >
          <HStack spacing={2}>
            {/* Left Arrow */}
            <Button
              onClick={() => handleMonthChange(-1)}
              colorScheme="whiteAlpha"
              variant="ghost"
              color="white"
              _hover={{ bg: "rgba(255, 255, 255, 0.2)" }}
              size="sm"
            >
              ←
            </Button>
            {/* Month Text */}
            <Text
              fontSize="md"
              fontWeight="bold"
              color="white"
              whiteSpace="nowrap"
            >
              {getMonthName(selectedDate)} {selectedDate.getFullYear()}
            </Text>
            {/* Right Arrow */}
            <Button
              onClick={() => handleMonthChange(1)}
              colorScheme="whiteAlpha"
              variant="ghost"
              color="white"
              _hover={{ bg: "rgba(255, 255, 255, 0.2)" }}
              isDisabled={isCurrentMonth()}
              size="sm"
            >
              →
            </Button>
          </HStack>
        </Box>

        {/* Request Access Button (Pushed to the right) */}
        <Button
          onClick={handleAccessRequestOpen}
          variant="ghost"
          colorScheme="whiteAlpha"
          color="white"
          _hover={{ bg: "rgba(255, 255, 255, 0.2)" }}
          leftIcon={<LockIcon />}
          size="sm"
          marginLeft="auto" // Ensures it stays to the right
        >
          Request Access
        </Button>
      </Flex>
      {/* Days of the Week */}
      <Flex justifyContent="space-between" p={1}>
        {daysOfWeek.map((day, index) => (
          <Box key={index} textAlign="center" flex="1" fontSize="xs">
            {day}
          </Box>
        ))}
      </Flex>
      {/* Calendar Days */}
      <Flex flexWrap="wrap" p={2}>
        {calendarDays.map((day, index) => {
          const isCurrentMonthDay = !day.isPrevMonth && !day.isNextMonth;
          const isSelectable = isDateSelectable(
            isCurrentMonthDay ? day.day : null
          );
          const isFutureDate =
            day.day &&
            isCurrentMonthDay &&
            new Date(
              selectedDate.getFullYear(),
              selectedDate.getMonth(),
              day.day
            ) > new Date();

          // Determine if this is a day from another month (prev or next)
          const isPrevMonthDay = day.isPrevMonth;
          const isNextMonthDay = day.isNextMonth;

          // Get trip count for this day
          const dateKey = `${selectedDate.getFullYear()}-${selectedDate.getMonth()}-${day.day}`;
          const tripCount = isCurrentMonthDay ? tripCounts[dateKey] || 0 : 0;

          // Get scheduled vehicles for this date
          const scheduledForDay = scheduledVehicles[dateKey] || [];

          // Create tooltip content
          const tooltipContent =
            scheduledForDay.length > 0
              ? scheduledForDay
                  .map((schedule) => (
                    <Text as="span" color="maroon" fontWeight="bold">
                      {schedule.vehicle}
                    </Text>
                  ))
                  .join("\n")
              : "No vehicles scheduled";

          return (
            <Tooltip
              key={index}
              label={
                <VStack align="start" spacing={1} p={1}>
                  <Text fontWeight="bold" fontSize="xs">
                    Scheduled Vehicles:
                  </Text>
                  {scheduledForDay.length > 0 ? (
                    scheduledForDay.map((schedule, idx) => (
                      <Text key={idx} fontSize="xs">
                        <Text
                          as="span"
                          color="maroon"
                          fontWeight="bold"
                          fontSize="xs"
                        >
                          {schedule.vehicle}
                        </Text>
                        {" - "}
                        {schedule.driver}
                      </Text>
                    ))
                  ) : (
                    <Text fontSize="xs">No vehicles scheduled</Text>
                  )}
                </VStack>
              }
              hasArrow
              placement="top"
              bg="white"
              color="black"
              boxShadow="md"
              isDisabled={!isCurrentMonthDay}
            >
              <Box
                onClick={() =>
                  handleDateClick(isCurrentMonthDay ? day.day : null)
                }
                cursor={
                  isPrevMonthDay || isNextMonthDay
                    ? "default"
                    : isSelectable
                      ? "pointer"
                      : "not-allowed"
                }
                width="calc(14.28% - 4px)"
                height="65px"
                p={2}
                m={0.5}
                display="flex"
                flexDirection="column"
                justifyContent="center"
                alignItems="center"
                border="1px solid"
                borderColor="gray.200"
                borderRadius="md"
                bg={
                  popoverDay === day.day && isCurrentMonthDay
                    ? "maroon"
                    : isPrevMonthDay || isNextMonthDay
                      ? "gray.100"
                      : isFutureDate
                        ? "gray.100"
                        : !isSelectable && day.day
                          ? "gray.200"
                          : "white"
                }
                color={
                  popoverDay === day.day && isCurrentMonthDay
                    ? "white"
                    : isPrevMonthDay || isNextMonthDay
                      ? "gray.400"
                      : isFutureDate
                        ? "gray.400"
                        : !isSelectable && day.day
                          ? "gray.500"
                          : "black"
                }
                opacity={
                  !isSelectable && day.day && isCurrentMonthDay && !isFutureDate
                    ? 0.6
                    : 1
                }
                position="relative"
                _hover={{
                  transform:
                    isSelectable &&
                    isCurrentMonthDay &&
                    popoverDay !== day.day &&
                    !isFutureDate
                      ? "translateY(-2px)"
                      : "none",
                  shadow:
                    isSelectable &&
                    isCurrentMonthDay &&
                    popoverDay !== day.day &&
                    !isFutureDate
                      ? "md"
                      : "none",
                  transition: "all 0.2s",
                }}
                transition="all 0.2s"
                id={`calendar-day-${day.day}`}
              >
                {/* Day Number */}
                <Text
                  fontWeight={
                    isSelectable && isCurrentMonthDay ? "bold" : "normal"
                  }
                  fontSize="sm"
                  textDecoration={
                    !isSelectable &&
                    isCurrentMonthDay &&
                    day.day &&
                    !isFutureDate
                      ? "line-through"
                      : "none"
                  }
                  mb={1}
                >
                  {day.day}
                </Text>

                {/* Show small indicator if there are scheduled vehicles */}
                {isCurrentMonthDay && scheduledForDay.length > 0 && (
                  <Box
                    position="absolute"
                    bottom="8px"
                    left="50%"
                    transform="translateX(-50%)"
                    width="3px"
                    height="3px"
                    borderRadius="full"
                    bg="maroon"
                  />
                )}

                {/* Popover Trigger */}
                {day.day && isSelectable && isCurrentMonthDay && (
                  <Popover
                    isOpen={popoverDay === day.day}
                    onClose={() => setPopoverDay(null)}
                    placement="top"
                    closeOnBlur={true}
                  >
                    <PopoverTrigger>
                      <Box
                        position="absolute"
                        top="0"
                        left="0"
                        width="100%"
                        height="100%"
                        opacity="0"
                        pointerEvents="none"
                      />
                    </PopoverTrigger>
                    <PopoverContent
                      zIndex={9999}
                      minWidth="250px"
                      pointerEvents="auto"
                      boxShadow="xl"
                      _hover={{ pointerEvents: "auto" }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <PopoverArrow />
                      <PopoverCloseButton />
                      {/* Popover Header */}
                      <PopoverHeader color="black" fontSize="sm">
                        Assign Schedule
                      </PopoverHeader>
                      {/* Popover Body */}
                      <PopoverBody color="black">
                        {/* Plate Number with Label */}
                        <FormControl>
                          <FormLabel fontSize="xs">Plate Number</FormLabel>
                          <Select
                            placeholder="Select Plate Number"
                            value={plateNumber}
                            onChange={handlePlateNumberChange}
                            color="black"
                            size="sm"
                          >
                            {availableTrucks.map((truck) => (
                              <option key={truck._id} value={truck.plateNumber}>
                                {truck.plateNumber}
                              </option>
                            ))}
                          </Select>
                        </FormControl>

                        {/* Driver Name with Label - now using SearchableSelect */}
                        <FormControl mt={2}>
                          <FormLabel fontSize="xs">Driver Name</FormLabel>
                          <DriverSearchableSelect
                            value={driver}
                            onChange={handleDriverChange}
                            isDisabled={!plateNumber}
                          />
                        </FormControl>

                        {/* Stub Number with Label */}
                        <FormControl mt={2}>
                          <FormLabel fontSize="xs">Stub Number</FormLabel>
                          <Input
                            placeholder="Stub Number"
                            value={stubNumber}
                            readOnly
                            color="black"
                            bg="gray.100"
                            _hover={{ bg: "gray.200" }}
                            size="sm"
                          />
                        </FormControl>

                        {/* Waybill Number with Label */}
                        <FormControl mt={2}>
                          <FormLabel fontSize="xs">Waybill Number</FormLabel>
                          <Flex>
                            <Select
                              placeholder="Select waybill"
                              value={selectedWaybill}
                              onChange={(e) =>
                                setSelectedWaybill(e.target.value)
                              }
                              // If this is a borrowed waybill, disable the dropdown
                              isDisabled={!stubNumber || isBorrowed}
                              size="sm"
                              flex="1"
                              mr={2}
                              // Add visual indicator if this is a borrowed waybill
                              bg={isBorrowed ? "yellow.50" : "white"}
                              borderColor={
                                isBorrowed ? "orange.300" : "inherit"
                              }
                            >
                              {/* Show available waybills */}
                              {filteredWaybills.map((waybill) => (
                                <option
                                  key={waybill._id}
                                  value={waybill.waybillNumber}
                                >
                                  {waybill.waybillNumber}
                                </option>
                              ))}
                              {/* Add the borrowed waybill if it's borrowed */}
                              {isBorrowed &&
                                selectedWaybill &&
                                !filteredWaybills.some(
                                  (w) => w.waybillNumber === selectedWaybill
                                ) && (
                                  <option
                                    key="borrowed"
                                    value={selectedWaybill}
                                  >
                                    {selectedWaybill} (Borrowed)
                                  </option>
                                )}
                            </Select>

                            {/* Borrow Waybill Button */}
                            <Box position="relative">
                              <Button
                                size="sm"
                                colorScheme="red"
                                variant="outline"
                                onClick={toggleBorrowWaybill}
                                // Always enable the borrow button
                                title="Borrow waybill from another vehicle"
                              >
                                Borrow
                              </Button>

                              {/* Borrow Waybill Popover */}
                              {isBorrowOpen && (
                                <Box
                                  ref={borrowPopoverRef}
                                  position="absolute"
                                  left="100%"
                                  top="-270px"
                                  ml={2}
                                  width="280px"
                                  bg="white"
                                  boxShadow="lg"
                                  borderRadius="md"
                                  zIndex={10000}
                                  border="1px solid"
                                  borderColor="gray.200"
                                  onClick={(e) => e.stopPropagation()}
                                  onMouseDown={(e) => e.stopPropagation()}
                                  pointerEvents="auto"
                                >
                                  <Box
                                    p={3}
                                    borderBottomWidth="1px"
                                    fontWeight="bold"
                                    fontSize="sm"
                                    bg="gray.50"
                                    display="flex"
                                    justifyContent="space-between"
                                    alignItems="center"
                                  >
                                    <Text>Borrow Waybill</Text>
                                    <CloseIcon
                                      boxSize={3}
                                      cursor="pointer"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setIsBorrowOpen(false);
                                      }}
                                    />
                                  </Box>
                                  <Box
                                    p={3}
                                    onClick={(e) => e.stopPropagation()}
                                    pointerEvents="auto"
                                  >
                                    {/* Select Plate Number to Borrow From */}
                                    <FormControl
                                      mb={3}
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <FormLabel fontSize="xs">
                                        Borrow From Vehicle
                                      </FormLabel>
                                      <Select
                                        placeholder="Select vehicle plate"
                                        value={borrowSelectedPlateNumber}
                                        onChange={handleBorrowPlateNumberChange}
                                        size="sm"
                                        onClick={(e) => e.stopPropagation()}
                                        onMouseDown={(e) => e.stopPropagation()}
                                        pointerEvents="auto"
                                        zIndex={10001}
                                        position="relative"
                                      >
                                        {/* Filter out the currently selected plate number */}
                                        {activeTrucks
                                          .filter(
                                            (truck) =>
                                              truck.plateNumber !== plateNumber
                                          )
                                          .map((truck) => (
                                            <option
                                              key={truck._id}
                                              value={truck.plateNumber}
                                            >
                                              {truck.plateNumber}
                                            </option>
                                          ))}
                                      </Select>
                                    </FormControl>

                                    {/* Display Stub Number for Borrow Vehicle */}
                                    <FormControl mb={3}>
                                      <FormLabel fontSize="xs">
                                        Stub Number (Borrow Vehicle)
                                      </FormLabel>
                                      <Input
                                        placeholder="Stub Number"
                                        value={borrowSelectedStubNumber}
                                        readOnly
                                        bg="gray.100"
                                        size="sm"
                                      />
                                    </FormControl>

                                    {/* Select Waybill to Borrow */}
                                    <FormControl
                                      mb={3}
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <FormLabel fontSize="xs">
                                        Select Waybill to Borrow
                                      </FormLabel>
                                      <Select
                                        placeholder="Select waybill"
                                        value={borrowedWaybill}
                                        onChange={(e) =>
                                          setBorrowedWaybill(e.target.value)
                                        }
                                        size="sm"
                                        onClick={(e) => e.stopPropagation()}
                                        onMouseDown={(e) => e.stopPropagation()}
                                        // Disable if no vehicle is selected OR if the selected vehicle has no stub number
                                        isDisabled={
                                          !borrowSelectedPlateNumber ||
                                          !borrowSelectedStubNumber ||
                                          borrowSelectedStubNumber.trim() === ""
                                        }
                                        zIndex={10001}
                                        position="relative"
                                      >
                                        {borrowableWaybills.map((waybill) => (
                                          <option
                                            key={waybill._id}
                                            value={waybill.waybillNumber}
                                          >
                                            {waybill.waybillNumber}
                                          </option>
                                        ))}
                                      </Select>
                                    </FormControl>

                                    {/* Remarks field inside the borrow popover */}
                                    <FormControl
                                      mb={3}
                                      isRequired
                                      isInvalid={borrowRemarksInvalid}
                                    >
                                      <FormLabel fontSize="xs">
                                        Borrowing Remarks
                                      </FormLabel>
                                      <Textarea
                                        placeholder="Enter reason for borrowing... (required)"
                                        value={borrowRemarks}
                                        onChange={(e) => {
                                          setBorrowRemarks(e.target.value);
                                          // Clear error state when user types
                                          if (e.target.value.trim() !== "") {
                                            setBorrowRemarksInvalid(false);
                                          }
                                        }}
                                        size="sm"
                                        rows={2}
                                        borderColor={
                                          borrowRemarksInvalid
                                            ? "red.500"
                                            : undefined
                                        }
                                        _hover={{
                                          borderColor: borrowRemarksInvalid
                                            ? "red.500"
                                            : undefined,
                                        }}
                                      />
                                    </FormControl>

                                    <Button
                                      size="sm"
                                      colorScheme="red"
                                      onClick={confirmBorrow}
                                      width="100%"
                                      isDisabled={!borrowedWaybill}
                                    >
                                      Confirm Borrow
                                    </Button>
                                  </Box>
                                </Box>
                              )}
                            </Box>
                          </Flex>
                        </FormControl>

                        {/* Back Load Switch */}
                        <FormControl mt={2}>
                          <Flex align="center">
                            {/* Moved label first and added margin */}
                            <FormLabel
                              htmlFor="backLoad"
                              fontSize="xs"
                              mb={0}
                              mr={2}
                            >
                              BACK LOAD
                            </FormLabel>
                            <Switch
                              id="backLoad"
                              isChecked={backLoad}
                              onChange={(e) => setBackLoad(e.target.checked)}
                              colorScheme="red"
                              size="sm"
                            />
                          </Flex>
                        </FormControl>

                        {/* Remarks Field */}
                        {/* <FormControl mt={2}>
                          <FormLabel fontSize="xs">Remarkss</FormLabel>
                          <Textarea
                            placeholder="Enter remarks..."
                            value={remarks}
                            onChange={(e) => setRemarks(e.target.value)}
                            size="sm"
                            rows={2}
                          />
                        </FormControl> */}
                      </PopoverBody>
                      {/* Popover Footer */}
                      <PopoverFooter>
                        <Button
                          size="xs"
                          bg="maroon"
                          color="white"
                          _hover={{ bg: "maroon.600" }}
                          onClick={handleSaveEvent}
                          isLoading={isSubmitting}
                          loadingText="Saving..."
                        >
                          Save
                        </Button>
                      </PopoverFooter>
                    </PopoverContent>
                  </Popover>
                )}
                {/* Trip Count Badge - Changed to use activeScheduleCounts */}
                {(() => {
                  const currentActiveScheduleCount = isCurrentMonthDay
                    ? activeScheduleCounts[dateKey] || 0
                    : 0;
                  if (isCurrentMonthDay && currentActiveScheduleCount > 0) {
                    return (
                      <Box
                        position="absolute"
                        top="3px"
                        right="3px"
                        bg="red.500"
                        color="white"
                        borderRadius="full"
                        width="14px"
                        height="14px"
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                        fontSize="2xs"
                        fontWeight="bold"
                      >
                        {currentActiveScheduleCount}
                      </Box>
                    );
                  }
                  return null;
                })()}
              </Box>
            </Tooltip>
          );
        })}
      </Flex>

      {/* === Access Request Modal (Updated) === */}
      <Modal
        isOpen={isAccessRequestOpen}
        onClose={onAccessRequestClose}
        isCentered
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Request Date Unlock</ModalHeader> {/* Updated Header */}
          <ModalCloseButton isDisabled={isSubmittingRequest} />
          <ModalBody pb={6}>
            {/* Removed RadioGroup FormControl */}
            <Text mb={4}>
              You are requesting permission to unlock all past dates in the
              scheduler.
            </Text>

            <FormControl>
              <FormLabel>Remarks (Optional)</FormLabel>
              <Textarea
                value={requestRemarks}
                onChange={(e) => setRequestRemarks(e.target.value)}
                placeholder="Provide a reason for your request..."
              />
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <Button
              colorScheme="blue"
              mr={3}
              onClick={handleSubmitRequest}
              isLoading={isSubmittingRequest}
              loadingText="Submitting"
            >
              Submit Unlock Request {/* Updated Button Text */}
            </Button>
            <Button
              variant="ghost"
              onClick={onAccessRequestClose}
              isDisabled={isSubmittingRequest}
            >
              Cancel
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      {/* === End Access Request Modal === */}
    </Box>
  );
};

export default Calendar;
