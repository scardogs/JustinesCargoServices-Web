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
  Tooltip,
  Badge,
  Textarea,
  Radio,
  RadioGroup,
  Stack,
  Icon,
  Skeleton,
  SkeletonText,
  Spinner,
  Center,
  Input,
  InputGroup,
  InputLeftElement,
  HStack as ChakraHStack,
  Select as ChakraSelect,
  Divider,
} from "@chakra-ui/react";
import {
  DeleteIcon,
  ViewIcon,
  CalendarIcon,
  SearchIcon,
  LockIcon,
} from "@chakra-ui/icons";
import { FiClock } from 'react-icons/fi';
import Calendar from "../Scheduler/SOcalendar";
import axios from "axios";
import TripDetails from "../Trips/SOTripDetail";
import SetArrivalDateModal from "../Trips/SOsetArrival";

const formatRemainingTime = (milliseconds) => {
    if (milliseconds <= 0) return "00:00:00";
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
};

const Scheduler = () => {
  const [availableDrivers, setAvailableDrivers] = useState([]);
  const [onDeliveryDrivers, setOnDeliveryDrivers] = useState([]);
  const [scheduledEvents, setScheduledEvents] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [trucks, setTrucks] = useState([]);
  const [trips, setTrips] = useState([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentTruck, setCurrentTruck] = useState(null);
  const [newDriverName, setNewDriverName] = useState("");
  const toast = useToast();
  const [isTripDetailModalOpen, setIsTripDetailModalOpen] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [scheduleToDelete, setScheduleToDelete] = useState(null);
  const {
    isOpen: isDeleteScheduleOpen,
    onOpen: onDeleteScheduleOpen,
    onClose: onDeleteScheduleClose,
  } = useDisclosure();
  const cancelRef = useRef();
  const [isDeletingSchedule, setIsDeletingSchedule] = useState(false);
  const [deletionStatus, setDeletionStatus] = useState("");
  const [deletionProgress, setDeletionProgress] = useState({
    current: 0,
    total: 0,
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [calendarRefreshKey, setCalendarRefreshKey] = useState(0);

  const { isOpen: isDeleteRequestOpen, onOpen: onDeleteRequestOpen, onClose: onDeleteRequestClose } = useDisclosure();
  const [deleteRequestRemarks, setDeleteRequestRemarks] = useState("");
  const [isSubmittingDeleteRequest, setIsSubmittingDeleteRequest] = useState(false);
  const { isOpen: isEditRequestOpen, onOpen: onEditRequestOpen, onClose: onEditRequestClose } = useDisclosure();
  const [editRequestRemarks, setEditRequestRemarks] = useState("");
  const [isSubmittingEditRequest, setIsSubmittingEditRequest] = useState(false);
  const [isScheduleDeleteApproved, setIsScheduleDeleteApproved] = useState(false);
  const [isVehicleEditApproved, setIsVehicleEditApproved] = useState(false);
  const [scheduleDeleteExpirationTime, setScheduleDeleteExpirationTime] = useState(null);
  const [vehicleEditExpirationTime, setVehicleEditExpirationTime] = useState(null);
  const [scheduleDeleteTimerDisplay, setScheduleDeleteTimerDisplay] = useState(null);
  const [vehicleEditTimerDisplay, setVehicleEditTimerDisplay] = useState(null);
  const approvalCheckIntervalRef = useRef(null);
  const deleteTimerIntervalRef = useRef(null);
  const editTimerIntervalRef = useRef(null);

  const {
    isOpen: isArrivalModalOpen,
    onOpen: onArrivalModalOpen,
    onClose: onArrivalModalClose,
  } = useDisclosure();
  const [tripToSetArrival, setTripToSetArrival] = useState(null);
  const [arrivalDateInput, setArrivalDateInput] = useState("");

  const fetchSchedules = async () => {
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/schedule`
      );
      setSchedules(response.data);
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

  const handleDeleteScheduleClick = (schedule) => {
    setScheduleToDelete(schedule);
    onDeleteScheduleOpen();
  };

  const confirmDeleteSchedule = async () => {
    if (!scheduleToDelete) return;
    const scheduleID = scheduleToDelete.scheduleID;

    setIsDeletingSchedule(true);
    try {
      console.log("Attempting to delete schedule with ID:", scheduleID);
      const token = localStorage.getItem("token");
      if (!token) {
        toast({
          title: "Error",
          description: "Authentication token not found. Please log in.",
          status: "error",
        });
        setIsDeletingSchedule(false);
        onDeleteScheduleClose();
        setScheduleToDelete(null);
        return;
      }

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

      toast({
        title: "Success",
        description: `Schedule ${scheduleID} deleted successfully and logged`,
        status: "success",
      });
      fetchSchedules();
    } catch (error) {
      console.error("Error deleting schedule:", error);
      toast({ title: "Error", description: error.message, status: "error" });
    } finally {
      setIsDeletingSchedule(false);
      onDeleteScheduleClose();
      setScheduleToDelete(null);
    }
  };

  const fetchTrucks = async () => {
    try {
      const response = await fetch(
        process.env.NEXT_PUBLIC_BACKEND_API + "/api/trucks"
      );
      if (!response.ok) {
        throw new Error("Failed to fetch trucks");
      }
      const data = await response.json();
      const activeTrucksData = data.filter(
        (truck) => truck.status === "Active"
      );
      setTrucks(activeTrucksData);
    } catch (error) {
      console.error("Error fetching trucks:", error);
    }
  };

  const fetchTrips = async () => {
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/trips`
      );
      const tripsData = response.data?.trips || [];
      console.log("Fetched trips array:", tripsData);
      setTrips(tripsData);
    } catch (error) {
      console.error("Error fetching trips:", error);
      setTrips([]);
    }
  };

  useEffect(() => {
    fetchSchedules();
    fetchTrucks();
    fetchTrips();
  }, []);

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

  const getNextScheduleID = () => {
    // Generate a random 4-digit number between 1000-9999
    const randomNumber = Math.floor(1000 + Math.random() * 9000);
    return `S${randomNumber}`;
  };

  const getNextTripID = () => {
    // Generate a random 4-digit number between 1000-9999
    const randomNumber = Math.floor(1000 + Math.random() * 9000);
    return `T${randomNumber}`;
  };

  const checkVehicleAvailability = async (vehicle) => {
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/trips`
      );
      const tripsData = response.data?.trips || [];

      const isOnDelivery = tripsData.some(
        (trip) => trip.vehicle === vehicle && trip.status === "On-Delivery"
      );

      return !isOnDelivery;
    } catch (error) {
      console.error("Error checking vehicle availability:", error);
      return false;
    }
  };

  const handleSaveEvent = async (scheduleData) => {
    try {
      console.log("Sending schedule data:", scheduleData);

      const { waybillNumber: rawWaybillNumber, ...schedulePayload } =
        scheduleData;

      console.log("Raw waybill number before processing:", {
        rawWaybillNumber,
        type: typeof rawWaybillNumber,
        length: rawWaybillNumber.length,
        charCodes: Array.from(rawWaybillNumber).map((c) => c.charCodeAt(0)),
      });

      const waybillNumber = rawWaybillNumber
        .replace(/^W+/i, "")
        .replace(/^0+/, "")
        .trim();

      console.log("Processing waybill number:", {
        original: rawWaybillNumber,
        processed: waybillNumber,
        url: `${process.env.NEXT_PUBLIC_BACKEND_API}/api/waybills/${waybillNumber}`,
      });

      console.log("Checking if waybill exists...");
      try {
        const checkResponse = await axios.get(
          `${process.env.NEXT_PUBLIC_BACKEND_API}/api/waybills`
        );

        console.log("All waybills in database:", checkResponse.data);

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
      }

      const scheduleResponse = await axios.post(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/schedule`,
        {
          ...schedulePayload,
          waybillNumber: waybillNumber,
        }
      );

      // Generate a random 4-digit number between 1000-9999 for trip ID
      const randomNumber = Math.floor(1000 + Math.random() * 9000);
      const tripID = `T${randomNumber}`;

      const scheduleID = scheduleResponse.data.scheduleID;

      const tripResponse = await axios.post(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/trips`,
        {
          ...schedulePayload,
          tripID,
          scheduleID,
          status: "On-Delivery",
          arrivalDate: "00/00/0000",
          waybillNumber: waybillNumber,
        }
      );

      const tripDetailResponse = await axios.post(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/tripDetails`,
        {
          tripDetailID: `TD${Math.floor(1000 + Math.random() * 9000)}`, // Generate random 4-digit number for trip detail ID
          tripID,
          stubNumber: scheduleData.stubNumber,
          waybillNumber: waybillNumber,
          referenceNumber: waybillNumber,
        }
      );

      try {
        const shipperInfoResponse = await axios.post(
          `${process.env.NEXT_PUBLIC_BACKEND_API}/api/shipperInfo`,
          {
            waybillNumber: waybillNumber,
            shipper: "To be updated",
            date: null,
            pickupAddress: "To be updated",
            driverName: scheduleData.driver,
            plateNo: scheduleData.vehicle,
            datePrepared: null,
            storeType: "DC",
            mode: "company",
          }
        );
        console.log("Shipper info saved:", shipperInfoResponse.data);
      } catch (shipperError) {
        console.error("Error saving to shipper info:", shipperError);
      }

      console.log("About to update waybill status:", {
        url: `${process.env.NEXT_PUBLIC_BACKEND_API}/api/waybills/number/${waybillNumber}`,
        method: "PUT",
        data: { status: "USED" },
      });

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

      fetchSchedules();
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

  const getAvailableDrivers = async () => {
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/employees/personal`
      );
      const employeeData = response.data;

      const allDrivers = employeeData
        .filter((employee) => employee.position === "Driver")
        .map((employee) =>
          `${employee.firstName} ${employee.middleName || ""} ${
            employee.lastName
          }`.trim()
        );

      const tripsResponse = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/trips`
      );
      const tripsData = tripsResponse.data?.trips || [];

      const onDeliveryVehiclesAndDrivers = tripsData
        .filter((trip) => trip.status === "On-Delivery")
        .map((trip) => ({
          vehicle: trip.vehicle,
          driver: trip.driver,
        }));

      const currentOnDeliveryDrivers = onDeliveryVehiclesAndDrivers.map(
        (item) => item.driver
      );
      setOnDeliveryDrivers(currentOnDeliveryDrivers);

      const availableDriversList = allDrivers.filter(
        (driver) => !currentOnDeliveryDrivers.includes(driver)
      );

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

  const handleEdit = async (truck) => {
    try {
      setCurrentTruck(truck);
      setNewDriverName(truck.driverName);
      setIsEditModalOpen(true);

      const tripsResponse = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/trips`
      );
      const tripsData = tripsResponse.data?.trips || [];

      const driversOnDelivery = tripsData
        .filter((trip) => trip.status === "On-Delivery")
        .map((trip) => trip.driver.toLowerCase());

      const trucksResponse = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/trucks`
      );
      const trucksData = trucksResponse.data || [];
      const assignedDrivers = trucksData
        .filter((t) => t._id !== truck._id)
        .map((t) => t.driverName.toLowerCase());

      const employeeResponse = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/employees/personal`
      );
      const employeeData = employeeResponse.data;

      const allDrivers = employeeData
        .filter((employee) => employee.position === "Driver")
        .map((employee) =>
          `${employee.firstName} ${employee.middleName || ""} ${
            employee.lastName
          }`.trim()
        );

      const availableDriversList = allDrivers.filter((driver) => {
        const driverLower = driver.toLowerCase();

        if (driverLower === truck.driverName.toLowerCase()) {
          return true;
        }

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

  const handleSaveDriver = async () => {
    try {
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

  const handleViewTripDetails = async (scheduleID, stubNumber) => {
    try {
      const trip = await findTripByScheduleID(scheduleID);
      if (trip) {
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

  const handleDeleteRequestOpen = async () => {
    // Check for existing pending request first
    const token = localStorage.getItem("token");
    const userString = localStorage.getItem("user");
    if (!token || !userString) {
      toast({ title: "Error", description: "Cannot verify user session.", status: "error" });
      return;
    }

    try {
      const user = JSON.parse(userString);
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/control-panel`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const existingPendingRequest = response.data.find(req =>
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

    // If no pending request, proceed
    setDeleteRequestRemarks("");
    setIsSubmittingDeleteRequest(false);
    onDeleteRequestOpen();
  };

  const handleSubmitDeleteRequest = async () => {
    setIsSubmittingDeleteRequest(true);
    try {
        const token = localStorage.getItem("token");
        const userString = localStorage.getItem("user");
        if (!token || !userString) throw new Error("Authentication details not found.");
        const user = JSON.parse(userString);
        const generatedRequestID = `REQ-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const payload = {
          RequestID: generatedRequestID,
          Module: "Scheduler",
          RequestType: "Delete",
          Remarks: deleteRequestRemarks,
          Username: user.name,
          UserRole: user.workLevel,
        };
        console.log("Submitting Delete Request Payload:", payload);
        await axios.post(`${process.env.NEXT_PUBLIC_BACKEND_API}/api/control-panel`, payload, { headers: { Authorization: `Bearer ${token}` } });
        toast({ title: "Request Submitted", description: "Your request for delete access has been sent.", status: "success", duration: 5000, isClosable: true });
        onDeleteRequestClose();
    } catch (error) {
        console.error("Error submitting delete access request:", error);
        toast({ title: "Request Failed", description: error.response?.data?.message || error.message || "Could not submit delete access request.", status: "error", duration: 5000, isClosable: true });
    } finally {
        setIsSubmittingDeleteRequest(false);
    }
  };

  const handleEditRequestOpen = async () => {
    // Check for existing pending request first
    const token = localStorage.getItem("token");
    const userString = localStorage.getItem("user");
    if (!token || !userString) {
      toast({ title: "Error", description: "Cannot verify user session.", status: "error" });
      return;
    }

    try {
      const user = JSON.parse(userString);
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/control-panel`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const existingPendingRequest = response.data.find(req =>
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

    // If no pending request, proceed
    setEditRequestRemarks("");
    setIsSubmittingEditRequest(false);
    onEditRequestOpen();
  };

  const handleSubmitEditRequest = async () => {
    setIsSubmittingEditRequest(true);
    try {
        const token = localStorage.getItem("token");
        const userString = localStorage.getItem("user");
        if (!token || !userString) throw new Error("Authentication details not found.");
        const user = JSON.parse(userString);
        const generatedRequestID = `REQ-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const payload = {
          RequestID: generatedRequestID,
          Module: "Scheduler",
          RequestType: "Edit",
          Remarks: editRequestRemarks,
          Username: user.name,
          UserRole: user.workLevel,
        };
        console.log("Submitting Edit Request Payload:", payload);
        await axios.post(`${process.env.NEXT_PUBLIC_BACKEND_API}/api/control-panel`, payload, { headers: { Authorization: `Bearer ${token}` } });
        toast({ title: "Request Submitted", description: "Your request for edit access has been sent.", status: "success", duration: 5000, isClosable: true });
        onEditRequestClose();
    } catch (error) {
        console.error("Error submitting edit access request:", error);
        toast({ title: "Request Failed", description: error.response?.data?.message || error.message || "Could not submit edit access request.", status: "error", duration: 5000, isClosable: true });
    } finally {
        setIsSubmittingEditRequest(false);
    }
  };

  const checkAccessApprovals = async () => {
    const token = localStorage.getItem("token");
    const userString = localStorage.getItem("user");
    if (!token || !userString) {
        setIsScheduleDeleteApproved(false);
        setIsVehicleEditApproved(false);
        setScheduleDeleteExpirationTime(null);
        setVehicleEditExpirationTime(null);
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

        const approvedDeleteRequest = requests.find(req =>
            req.Module === "Scheduler" &&
            req.RequestType === "Delete" &&
            req.Username === user.name &&
            req.Status === "Approved" &&
            (!req.ExpiresAt || new Date(req.ExpiresAt) > now)
        );
        const isDeleteApproved = !!approvedDeleteRequest;
        setIsScheduleDeleteApproved(isDeleteApproved);
        setScheduleDeleteExpirationTime(isDeleteApproved && approvedDeleteRequest.ExpiresAt ? new Date(approvedDeleteRequest.ExpiresAt) : null);

        const approvedEditRequest = requests.find(req =>
            req.Module === "Scheduler" &&
            req.RequestType === "Edit" &&
            req.Username === user.name &&
            req.Status === "Approved" &&
            (!req.ExpiresAt || new Date(req.ExpiresAt) > now)
        );
        const isEditApproved = !!approvedEditRequest;
        setIsVehicleEditApproved(isEditApproved);
        setVehicleEditExpirationTime(isEditApproved && approvedEditRequest.ExpiresAt ? new Date(approvedEditRequest.ExpiresAt) : null);

    } catch (error) {
        console.error("Error checking access approval status:", error);
    }
  };

  useEffect(() => {
    checkAccessApprovals();
    if (approvalCheckIntervalRef.current) {
        clearInterval(approvalCheckIntervalRef.current);
    }
    approvalCheckIntervalRef.current = setInterval(checkAccessApprovals, 60000);
    return () => {
        if (approvalCheckIntervalRef.current) {
            clearInterval(approvalCheckIntervalRef.current);
        }
    };
  }, []);

  useEffect(() => {
    if (deleteTimerIntervalRef.current) {
        clearInterval(deleteTimerIntervalRef.current);
        deleteTimerIntervalRef.current = null;
        setScheduleDeleteTimerDisplay(null);
    }
    if (scheduleDeleteExpirationTime && scheduleDeleteExpirationTime > new Date()) {
        const updateTimer = () => {
            const remaining = scheduleDeleteExpirationTime - new Date();
            if (remaining <= 0) {
                clearInterval(deleteTimerIntervalRef.current);
                setScheduleDeleteTimerDisplay(null);
                setScheduleDeleteExpirationTime(null);
                setIsScheduleDeleteApproved(false);
            } else {
                setScheduleDeleteTimerDisplay(formatRemainingTime(remaining));
            }
        };
        updateTimer();
        deleteTimerIntervalRef.current = setInterval(updateTimer, 1000);
    }
    return () => {
        if (deleteTimerIntervalRef.current) clearInterval(deleteTimerIntervalRef.current);
    };
  }, [scheduleDeleteExpirationTime]);

  useEffect(() => {
    if (editTimerIntervalRef.current) {
        clearInterval(editTimerIntervalRef.current);
        editTimerIntervalRef.current = null;
        setVehicleEditTimerDisplay(null);
    }
    if (vehicleEditExpirationTime && vehicleEditExpirationTime > new Date()) {
        const updateTimer = () => {
            const remaining = vehicleEditExpirationTime - new Date();
            if (remaining <= 0) {
                clearInterval(editTimerIntervalRef.current);
                setVehicleEditTimerDisplay(null);
                setVehicleEditExpirationTime(null);
                setIsVehicleEditApproved(false);
            } else {
                setVehicleEditTimerDisplay(formatRemainingTime(remaining));
            }
        };
        updateTimer();
        editTimerIntervalRef.current = setInterval(updateTimer, 1000);
    }
    return () => {
        if (editTimerIntervalRef.current) clearInterval(editTimerIntervalRef.current);
    };
  }, [vehicleEditExpirationTime]);

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
        setTripToSetArrival(trip);
        setArrivalDateInput("");
        onArrivalModalOpen();
      } else {
        toast({
          title: "Trip Not Found",
          description: "Could not find associated trip details for this schedule.",
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
      const updateResponse = await axios.put(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/trips/${tripToSetArrival._id}`,
        {
          ...tripToSetArrival,
          arrivalDate: arrivalDateInput,
        }
      );

      if (updateResponse.status === 200) {
        const statusResponse = await axios.put(
          `${process.env.NEXT_PUBLIC_BACKEND_API}/api/trips/${tripToSetArrival.tripID}/status`,
          { status: "Completed" }
        );

        if (statusResponse.status === 200) {
          try {
            const scheduleResponse = await axios.put(
              `${process.env.NEXT_PUBLIC_BACKEND_API}/api/schedule/${tripToSetArrival.scheduleID}/delivery-status`,
              { isOnDelivery: false }
            );
            console.log("Schedule delivery status updated:", scheduleResponse.data);
          } catch (scheduleError) {
            console.error("Error updating schedule delivery status:", scheduleError);
          }

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
        description: error.message || "Failed to set arrival date and complete trip.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }

    setCalendarRefreshKey((prevKey) => prevKey + 1);
    onArrivalModalClose();
    setTripToSetArrival(null);
    setArrivalDateInput("");
  };

  return (
    <Box p={4}>
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
                  {schedules.length}
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
                  {trucks.filter((truck) => truck.status === "Active").length}
                </Text>
              </Box>
            </Grid>
          </Flex>
        </Flex>
      </Box>

      <Grid templateColumns="2fr 1fr" gap={4}>
        <GridItem>
          <Box
            bg="white"
            rounded="lg"
            shadow="md"
            p={3}
            borderWidth="1px"
            h="800px"
          >
            <Calendar key={calendarRefreshKey} onSaveEvent={handleSaveEvent} />
          </Box>
        </GridItem>

        <GridItem>
          <Box bg="white" rounded="lg" shadow="md" borderWidth="1px" h="100%">
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
                <TabPanel>
                  <VStack align="stretch" spacing={3}>
                    <Flex justify="space-between" align="center">
                      <Text fontSize="md" fontWeight="bold" color="#1a365d">
                        Scheduled Requests
                      </Text>
                      <HStack>
                        {scheduleDeleteTimerDisplay && (
                          <Flex alignItems="baseline" color="purple.600" fontSize="xs">
                            <Icon as={FiClock} mr={1} boxSize={3} />
                            <Text>Delete active: {scheduleDeleteTimerDisplay}</Text>
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
                      {schedules.length > 0 ? (
                        schedules
                          .filter((schedule) => schedule.isOnDelivery === true)
                          .filter((schedule) => {
                            if (!searchTerm) return true;
                            const lowerTerm = searchTerm.toLowerCase();
                            return (
                              schedule.scheduleID.toLowerCase().includes(lowerTerm) ||
                              schedule.vehicle.toLowerCase().includes(lowerTerm) ||
                              schedule.driver.toLowerCase().includes(lowerTerm)
                            );
                          })
                          .map((schedule, index) => (
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
                                bg="#800020"
                                color="white"
                                fontSize="0.7em"
                                px={2}
                                py={0.5}
                                borderRadius="md"
                              >
                                ON DELIVERY
                              </Badge>
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
                                <Text fontWeight="medium" color="#1a365d" fontSize="sm">
                                  Schedule ID: {schedule.scheduleID}
                                </Text>
                                <Text color="gray.600" fontSize="xs">
                                  Vehicle: {schedule.vehicle}
                                </Text>
                                <Text color="gray.600" fontSize="xs">
                                  Driver: {schedule.driver}
                                </Text>
                                <Text color="gray.600" fontSize="xs">
                                  Loading Date: {new Date(schedule.loadingDate).toLocaleDateString()}
                                </Text>
                                <Flex w="100%" justify="flex-end" mt={1}>
                                  <Tooltip label="View Details">
                                    <IconButton
                                      icon={<ViewIcon />}
                                      aria-label="View details"
                                      onClick={() => handleViewTripDetails(schedule.scheduleID, schedule.stubNumber)}
                                      colorScheme="blue"
                                      variant="ghost"
                                      mr={2}
                                      size="sm"
                                    />
                                  </Tooltip>
                                  <Tooltip label="Set Arrival Date">
                                    <IconButton
                                      icon={<CalendarIcon />}
                                      aria-label="Set arrival date"
                                      onClick={() => handleSetArrivalClick(schedule)}
                                      colorScheme="teal"
                                      variant="ghost"
                                      mr={2}
                                      size="sm"
                                    />
                                  </Tooltip>
                                  <Tooltip label="Delete Schedule">
                                    <IconButton
                                      icon={<DeleteIcon />}
                                      size="xs"
                                      variant="ghost"
                                      colorScheme="red"
                                      isDisabled={!isScheduleDeleteApproved}
                                      onClick={() => handleDeleteScheduleClick(schedule)}
                                      aria-label="Delete Schedule"
                                    />
                                  </Tooltip>
                                </Flex>
                              </VStack>
                            </Box>
                          ))
                      ) : (
                        <Box p={6} textAlign="center" bg="gray.50" borderRadius="md">
                          <Text color="gray.500" fontSize="sm">
                            No schedules available
                          </Text>
                        </Box>
                      )}
                    </Box>
                  </VStack>
                </TabPanel>

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
                      {schedules
                        .filter((schedule) => schedule.isOnDelivery === false)
                        .filter((schedule) => {
                          if (!searchTerm) return true;
                          const lowerTerm = searchTerm.toLowerCase();
                          return (
                            schedule.scheduleID.toLowerCase().includes(lowerTerm) ||
                            schedule.vehicle.toLowerCase().includes(lowerTerm) ||
                            schedule.driver.toLowerCase().includes(lowerTerm) ||
                            (schedule.arrivalDate &&
                              schedule.arrivalDate.toLowerCase().includes(lowerTerm))
                          );
                        })
                        .map((schedule, index) => (
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
                              <Text fontWeight="medium" color="#1a365d" fontSize="sm">
                                Schedule ID: {schedule.scheduleID}
                              </Text>
                              <Text color="gray.600" fontSize="xs">
                                Vehicle: {schedule.vehicle}
                              </Text>
                              <Text color="gray.600" fontSize="xs">
                                Driver: {schedule.driver}
                              </Text>
                              <Text color="gray.600" fontSize="xs">
                                Loading Date: {new Date(schedule.loadingDate).toLocaleDateString()}
                              </Text>
                              {schedule.arrivalDate && schedule.arrivalDate !== "00/00/0000" && (
                                <Text color="gray.600" fontSize="xs">
                                  Arrival Date: {new Date(schedule.arrivalDate).toLocaleDateString()}
                                </Text>
                              )}
                            </VStack>
                          </Box>
                        ))}
                    </Box>
                  </VStack>
                </TabPanel>

                <TabPanel>
                  <VStack align="stretch" spacing={3}>
                    <Flex justify="space-between" align="center">
                      <Text fontSize="md" fontWeight="bold" color="#1a365d">
                        Scheduled Vehicles
                      </Text>
                      <HStack>
                        {vehicleEditTimerDisplay && (
                          <Flex alignItems="baseline" color="purple.600" fontSize="xs">
                            <Icon as={FiClock} mr={1} boxSize={3} />
                            <Text>Edit active: {vehicleEditTimerDisplay}</Text>
                          </Flex>
                        )}
                        <Button
                          leftIcon={<LockIcon />}
                          colorScheme="purple"
                          variant="solid"
                          size="sm"
                          onClick={handleEditRequestOpen}
                        >
                          Request Edit Access
                        </Button>
                      </HStack>
                    </Flex>
                    <Box maxH="600px" overflowY="auto">
                      <Table variant="simple" size="sm">
                        <Thead bg="gray.50">
                          <Tr>
                            <Th color="#1a365d" fontSize="xs">Plate Number</Th>
                            <Th color="#1a365d" fontSize="xs">Driver</Th>
                            <Th color="#1a365d" fontSize="xs">Actions</Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {trucks.length > 0 ? (
                            trucks
                              .filter((truck) => {
                                if (!searchTerm) return true;
                                const lowerTerm = searchTerm.toLowerCase();
                                return (
                                  truck.plateNumber.toLowerCase().includes(lowerTerm) ||
                                  truck.driverName.toLowerCase().includes(lowerTerm)
                                );
                              })
                              .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
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
                                      isDisabled={!isVehicleEditApproved}
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
                        <Flex justify="space-between" align="center" mt={4} px={4}>
                          <Text fontSize="sm" color="gray.600">
                            Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                            {Math.min(currentPage * itemsPerPage, trucks.length)} of{" "}
                            {trucks.length} vehicles
                          </Text>
                          <ChakraHStack spacing={2}>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
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
                                  Math.min(prev + 1, Math.ceil(trucks.length / itemsPerPage))
                                )
                              }
                              isDisabled={currentPage === Math.ceil(trucks.length / itemsPerPage)}
                              color="#1a365d"
                              borderColor="#1a365d"
                            >
                              Next
                            </Button>
                          </ChakraHStack>
                        </Flex>
                      )}
                    </Box>
                  </VStack>
                </TabPanel>
              </TabPanels>
            </Tabs>
          </Box>
        </GridItem>
      </Grid>

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

      {selectedTrip && (
        <TripDetails
          isOpen={isTripDetailModalOpen}
          onClose={() => setIsTripDetailModalOpen(false)}
          tripId={selectedTrip.tripID}
        />
      )}

      <AlertDialog
        isOpen={isDeleteScheduleOpen}
        leastDestructiveRef={cancelRef}
        onClose={onDeleteScheduleClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete Schedule
            </AlertDialogHeader>
            <AlertDialogBody>
              Are you sure you want to delete Schedule ID "
              {scheduleToDelete?.scheduleID}"? (Vehicle:{" "}
              {scheduleToDelete?.vehicle}, Driver: {scheduleToDelete?.driver})
              This action will move the schedule data to the delete logs.
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onDeleteScheduleClose}>
                Cancel
              </Button>
              <Button
                colorScheme="red"
                isLoading={isDeletingSchedule}
                onClick={confirmDeleteSchedule}
                ml={3}
              >
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>

      <Modal isOpen={isDeleteRequestOpen} onClose={onDeleteRequestClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Request Delete Access (Schedules)</ModalHeader>
          <ModalCloseButton isDisabled={isSubmittingDeleteRequest} />
          <ModalBody pb={6}>
            <Text mb={4}>You are requesting permission to delete schedule entries.</Text>
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
              colorScheme='blue'
              mr={3}
              onClick={handleSubmitDeleteRequest}
              isLoading={isSubmittingDeleteRequest}
              loadingText="Submitting"
            >
              Submit Delete Request
            </Button>
            <Button variant='ghost' onClick={onDeleteRequestClose} isDisabled={isSubmittingDeleteRequest}>Cancel</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={isEditRequestOpen} onClose={onEditRequestClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Request Edit Access (Vehicles)</ModalHeader>
          <ModalCloseButton isDisabled={isSubmittingEditRequest} />
          <ModalBody pb={6}>
            <Text mb={4}>You are requesting permission to edit vehicle assignments.</Text>
            <FormControl>
              <FormLabel>Remarks (Optional)</FormLabel>
              <Textarea
                value={editRequestRemarks}
                onChange={(e) => setEditRequestRemarks(e.target.value)}
                placeholder="Provide a reason for your request..."
              />
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <Button
              colorScheme='blue'
              mr={3}
              onClick={handleSubmitEditRequest}
              isLoading={isSubmittingEditRequest}
              loadingText="Submitting"
            >
              Submit Edit Request
            </Button>
            <Button variant='ghost' onClick={onEditRequestClose} isDisabled={isSubmittingEditRequest}>Cancel</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {tripToSetArrival && (
        <SetArrivalDateModal
          isOpen={isArrivalModalOpen}
          onClose={() => {
            onArrivalModalClose();
            setTripToSetArrival(null);
            setArrivalDateInput("");
          }}
          onSubmit={handleConfirmArrivalDateSubmit}
          selectedTripForArrival={tripToSetArrival}
          selectedArrivalDate={arrivalDateInput}
          setSelectedArrivalDate={setArrivalDateInput}
        />
      )}
    </Box>
  );
};

export default Scheduler;
