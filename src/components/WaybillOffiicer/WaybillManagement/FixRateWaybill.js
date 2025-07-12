import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Grid,
  GridItem,
  Flex,
  Text,
  Heading,
  Button,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  IconButton,
  Icon,
  Spinner,
  useToast,
  Drawer,
  DrawerBody,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  FormControl,
  FormLabel,
  Input,
  InputGroup,
  Badge,
  Select,
  useDisclosure,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  ButtonGroup,
} from "@chakra-ui/react";
import { AddIcon, EditIcon, DeleteIcon, RepeatIcon } from "@chakra-ui/icons";
import { FaSave, FaCheck } from "react-icons/fa";
import axios from "axios";
import ShipperInformation from "./WOShipperInformation";
import FixRateConsigneeDrawer from "./WOFixRateConsigneeDrawer";

// Constants for colors
const primaryColor = "#143D60";
const secondaryColor = "#1A4F7A";
const accentColor = "#FF6B6B";
const lightBg = "#F8FAFC";
const borderColor = "#E2E8F0";

// Helper functions
const roundToTwo = (num) => {
  return +(Math.round(num + "e+2") + "e-2");
};

const formatNumberWithCommas = (value) => {
  if (value === null || value === undefined) return "";
  return new Intl.NumberFormat("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

const FixRateWaybill = ({
  waybillNumber,
  onModalClose,
  onTruckCbmUpdate,
  SearchableSelect,
}) => {
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [consignees, setConsignees] = useState([]);
  const [shipperFormData, setShipperFormData] = useState({
    waybillNumber: waybillNumber,
    shipper: "",
    pickupAddress: "",
    driverName: "",
    plateNo: "",
    date: new Date().toISOString().split("T")[0],
    datePrepared: new Date().toISOString().split("T")[0],
    storeType: "DC",
  });
  const [isShipperInfoSaved, setIsShipperInfoSaved] = useState(false);
  const [isIndividualMode, setIsIndividualMode] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [individuals, setIndividuals] = useState([]);
  const [dateRange, setDateRange] = useState({
    minDate: new Date(new Date().setDate(new Date().getDate() - 30))
      .toISOString()
      .split("T")[0],
    maxDate: new Date().toISOString().split("T")[0],
  });
  const [truckCbm, setTruckCbm] = useState(null);
  const [totalAmount, setTotalAmount] = useState(0);
  const [fixedRate, setFixedRate] = useState(0);

  // Drawer for adding/editing consignees
  const {
    isOpen: isDrawerOpen,
    onOpen: onDrawerOpen,
    onClose: onDrawerClose,
  } = useDisclosure();
  const [currentConsignee, setCurrentConsignee] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  // Delete confirmation
  const [deleteConsignee, setDeleteConsignee] = useState(null);
  const {
    isOpen: isAlertOpen,
    onOpen: onAlertOpen,
    onClose: onAlertClose,
  } = useDisclosure();
  const cancelRef = React.useRef();

  // Delete all confirmation
  const {
    isOpen: isDeleteAllAlertOpen,
    onOpen: onDeleteAllAlertOpen,
    onClose: onDeleteAllAlertClose,
  } = useDisclosure();
  const deleteAllCancelRef = React.useRef();

  // Format date for input
  const formatDateForInput = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";
    return date.toISOString().split("T")[0];
  };

  // Fetch data on component mount
  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoading(true);
      try {
        // Fetch companies and individuals first
        await Promise.all([fetchCompanies(), fetchIndividuals()]);

        // First fetch shipper info
        await fetchShipperInfo(waybillNumber);

        // Then fetch trip details to potentially update driver/plate info
        await fetchTripDetail(waybillNumber);

        // Finally fetch consignees
        await fetchConsignees(waybillNumber);
      } catch (error) {
        console.error("Error fetching initial data:", error);
        toast({
          title: "Error",
          description: "Failed to load initial data",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialData();
  }, [waybillNumber]);

  // Calculate total amount whenever consignees change
  useEffect(() => {
    const total = consignees.reduce(
      (sum, consignee) => sum + (Number(consignee.amount) || 0),
      0
    );
    setTotalAmount(total);
  }, [consignees]);

  // Fetch companies
  const fetchCompanies = async () => {
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/companies`
      );
      setCompanies(response.data);
    } catch (error) {
      console.error("Error fetching companies:", error);
    }
  };

  // Fetch individuals
  const fetchIndividuals = async () => {
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/individuals`
      );
      setIndividuals(response.data);
    } catch (error) {
      console.error("Error fetching individuals:", error);
    }
  };

  // Fetch trip details to get driver name and plate number
  const fetchTripDetail = async (waybillNumber) => {
    if (!waybillNumber) return;

    try {
      console.log(`Fetching trip details for waybill: ${waybillNumber}`);

      // First get trip detail to find the associated tripID
      const tripDetailResponse = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/tripDetails?waybillNumber=${waybillNumber}`
      );

      const tripDetailData = await tripDetailResponse.json();
      console.log("Trip Detail Data:", tripDetailData);

      if (
        !tripDetailData ||
        (Array.isArray(tripDetailData) && tripDetailData.length === 0)
      ) {
        console.log(`No trip details found for waybill: ${waybillNumber}`);
        return;
      }

      const matchingTripDetail = Array.isArray(tripDetailData)
        ? tripDetailData.find(
            (detail) => detail.waybillNumber === waybillNumber
          )
        : tripDetailData;

      if (!matchingTripDetail || !matchingTripDetail.tripID) {
        console.log(`No valid trip ID found for waybill: ${waybillNumber}`);
        return;
      }

      console.log(
        `Found trip detail with tripID: ${matchingTripDetail.tripID}`
      );

      // Now get the trip data using the tripID
      const tripResponse = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/trips?tripID=${matchingTripDetail.tripID}`
      );

      const tripResponseData = await tripResponse.json();
      console.log("Trip Response Data:", tripResponseData);

      let tripData = tripResponseData.trips || tripResponseData;
      console.log("Trip Data:", tripData);

      // If tripData is an array, find the matching trip
      const matchingTrip = Array.isArray(tripData)
        ? tripData.find((trip) => trip.tripID === matchingTripDetail.tripID)
        : tripData;

      if (matchingTrip) {
        console.log("Found matching trip:", matchingTrip);

        // Update shipper form data with trip information
        setShipperFormData((prev) => ({
          ...prev,
          driverName: matchingTrip.driver || "Driver Not Found",
          plateNo: matchingTrip.vehicle || "Plate No Not Found",
          referenceNumber:
            matchingTripDetail.referenceNumber || prev.referenceNumber || "",
        }));

        // If plate number exists, fetch truck CBM
        if (matchingTrip.vehicle) {
          fetchTruckCbm(matchingTrip.vehicle);
        }
      } else {
        console.log(
          "No matching trip found with tripID:",
          matchingTripDetail.tripID
        );
      }
    } catch (error) {
      console.error("Error fetching trip details:", error);
    }
  };

  // Fetch shipper info
  const fetchShipperInfo = async (waybillNumber) => {
    try {
      console.log(
        `Attempting to fetch shipper info for waybill: ${waybillNumber}`
      );

      // First try to get fixed rate shipper info
      let fixedRateResponse;
      try {
        fixedRateResponse = await axios.get(
          `${process.env.NEXT_PUBLIC_BACKEND_API}/api/fixRateShipperInfo/${waybillNumber}`,
          { validateStatus: (status) => status < 500 }
        );
      } catch (err) {
        console.log(`Error fetching fixed rate shipper info: ${err.message}`);
        fixedRateResponse = { status: 404, data: null };
      }

      // If fixed rate info exists and is valid, use it
      if (fixedRateResponse.status === 200 && fixedRateResponse.data) {
        console.log("Found fixed rate shipper info, using it");
        const formattedData = {
          ...fixedRateResponse.data,
          date: formatDateForInput(fixedRateResponse.data.date),
          datePrepared: formatDateForInput(fixedRateResponse.data.datePrepared),
        };
        setShipperFormData(formattedData);
        setIsShipperInfoSaved(true);

        // Check if the shipper is an individual
        const isIndividual = individuals.some(
          (ind) => ind.individualName === fixedRateResponse.data.shipper
        );
        setIsIndividualMode(isIndividual);

        // Fetch truck CBM if plate number exists
        if (fixedRateResponse.data.plateNo) {
          fetchTruckCbm(fixedRateResponse.data.plateNo);
        }

        return;
      }

      // If no fixed rate info, try getting regular shipper info
      console.log("No fixed rate info found, trying regular shipper info");
      let regularResponse;
      try {
        regularResponse = await axios.get(
          `${process.env.NEXT_PUBLIC_BACKEND_API}/api/shipperInfo/${waybillNumber}`,
          { validateStatus: (status) => status < 500 }
        );
      } catch (err) {
        console.log(`Error fetching regular shipper info: ${err.message}`);
        regularResponse = { status: 404, data: null };
      }

      // If regular shipper info exists, convert it to fixed rate format
      if (regularResponse.status === 200 && regularResponse.data) {
        console.log(
          "Found regular shipper info, converting to fixed rate format"
        );
        const regularData = regularResponse.data;

        // Convert to fixed rate format with properly formatted dates
        const shipperData = {
          ...regularData,
          waybillNumber,
          date: formatDateForInput(regularData.date),
          datePrepared: formatDateForInput(regularData.datePrepared),
          isFixedRate: true,
        };

        setShipperFormData(shipperData);
        setIsShipperInfoSaved(false); // Not saved as fixed rate yet

        // Check if the shipper is an individual
        const isIndividual = individuals.some(
          (ind) => ind.individualName === regularData.shipper
        );
        setIsIndividualMode(isIndividual);

        // Fetch truck CBM if plate number exists
        if (regularData.plateNo) {
          fetchTruckCbm(regularData.plateNo);
        }

        // Save this as fixed rate shipper info
        try {
          console.log("Saving regular shipper info as fixed rate");
          // Convert dates back to ISO format for saving
          const dataToSave = {
            ...shipperData,
            date: regularData.date,
            datePrepared: regularData.datePrepared,
          };
          await axios.post(
            `${process.env.NEXT_PUBLIC_BACKEND_API}/api/fixRateShipperInfo`,
            dataToSave
          );
          setIsShipperInfoSaved(true);
        } catch (saveError) {
          console.error("Error saving as fixed rate:", saveError);
          // Continue without showing error to user - we'll try again when they save
        }

        return;
      }

      // If neither fixed rate nor regular shipper info exists
      console.log("No shipper info found for this waybill");
      setIsShipperInfoSaved(false);

      // Initialize with waybill number and current date
      const today = new Date();
      const formattedToday = formatDateForInput(today);

      setShipperFormData({
        waybillNumber,
        date: formattedToday,
        datePrepared: formattedToday,
        shipper: "",
        pickupAddress: "",
        driverName: "",
        plateNo: "",
        referenceNumber: "",
        storeType: "DC",
        isFixedRate: true,
      });
    } catch (error) {
      // This will only catch 500+ errors due to validateStatus
      console.error("Error in fetchShipperInfo:", error);
      toast({
        title: "Error",
        description: "Failed to fetch shipper information. Please try again.",
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "top-center",
      });

      // Initialize with default values and properly formatted dates
      const today = new Date();
      const formattedToday = formatDateForInput(today);

      setIsShipperInfoSaved(false);
      setShipperFormData({
        waybillNumber,
        date: formattedToday,
        datePrepared: formattedToday,
        shipper: "",
        pickupAddress: "",
        driverName: "",
        plateNo: "",
        referenceNumber: "",
        storeType: "DC",
        isFixedRate: true,
      });
    }
  };

  // Fetch consignees for this waybill
  const fetchConsignees = async (waybillNumber) => {
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/fixRateConsignees/${waybillNumber}`
      );

      if (response.data && response.data.length > 0) {
        setConsignees(response.data);
        // Set fixed rate from the first consignee's rate (all should be the same)
        if (response.data[0].rate) {
          setFixedRate(response.data[0].rate);
        }
      }
    } catch (error) {
      console.error("Error fetching consignees:", error);
      // If 404, it means no consignees exist yet, which is fine
      if (error.response && error.response.status !== 404) {
        toast({
          title: "Error",
          description: "Failed to fetch consignee information",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      }
    }
  };

  // Fetch truck CBM
  const fetchTruckCbm = async (plateNumber) => {
    if (!plateNumber) {
      console.log("No plate number provided for truck CBM lookup");
      return;
    }

    try {
      console.log(`Fetching truck CBM for plate number: ${plateNumber}`);

      // First try to get truck info from trips
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/trucks?plateNumber=${plateNumber}`,
        {
          validateStatus: (status) => status < 500, // Only treat 500+ as errors
        }
      );

      if (response.status === 404) {
        console.log(`No truck found with plate number: ${plateNumber}`);
        return;
      }

      // Check if we got an array of trucks and find the matching one
      if (response.data && Array.isArray(response.data)) {
        const truck = response.data.find((t) => t.plateNumber === plateNumber);
        if (truck && truck.cbm) {
          console.log(`Found truck with CBM: ${truck.cbm}`);
          setTruckCbm(truck.cbm);
          if (onTruckCbmUpdate) {
            onTruckCbmUpdate(truck.cbm);
          }
          return;
        }
      }

      // If we got a single truck object
      if (response.data && response.data.cbm) {
        console.log(`Found truck with CBM: ${response.data.cbm}`);
        setTruckCbm(response.data.cbm);
        if (onTruckCbmUpdate) {
          onTruckCbmUpdate(response.data.cbm);
        }
      } else {
        console.log(
          `Truck found but no CBM value available for plate: ${plateNumber}`
        );
      }
    } catch (error) {
      console.error("Error fetching truck CBM:", error);
      // Don't show toast for 404 errors as they're expected when truck doesn't exist
      if (!error.response || error.response.status >= 500) {
        toast({
          title: "Error",
          description: "Failed to fetch truck capacity information",
          status: "error",
          duration: 3000,
          isClosable: true,
          position: "top-center",
        });
      }
    }
  };

  // Handle shipper change
  const handleShipperChange = async (e) => {
    const { name, value } = e.target;
    setShipperFormData((prev) => ({ ...prev, [name]: value }));

    // If shipper company is changed, fetch its address and fleet info
    if (name === "shipper" && !isIndividualMode) {
      try {
        // First try to find the company in our local state
        const selectedCompany = companies.find(
          (company) => company.companyName === value
        );

        if (selectedCompany) {
          setShipperFormData((prev) => ({
            ...prev,
            pickupAddress:
              selectedCompany.businessAddress || selectedCompany.address || "",
          }));
          return;
        }

        // If not found in local state, try fetching from API
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_BACKEND_API}/api/companies/search`,
          {
            params: { name: value },
            validateStatus: function (status) {
              return status < 500; // Only treat 500+ as errors
            },
          }
        );

        if (
          response.status === 404 ||
          !response.data ||
          response.data.length === 0
        ) {
          console.log("No company found with name:", value);
          setShipperFormData((prev) => ({
            ...prev,
            pickupAddress: "",
          }));
          return;
        }

        if (response.data && response.data.length > 0) {
          const company = response.data[0];
          setShipperFormData((prev) => ({
            ...prev,
            pickupAddress: company.businessAddress || company.address || "",
          }));
        }
      } catch (error) {
        console.error("Error fetching company details:", error);

        // Show error toast only for non-404 errors
        if (!error.response || error.response.status >= 500) {
          toast({
            title: "Error",
            description: "Failed to fetch company details. Please try again.",
            status: "error",
            duration: 3000,
            isClosable: true,
            position: "top-center",
          });
        }

        // Clear the address on error
        setShipperFormData((prev) => ({
          ...prev,
          pickupAddress: "",
        }));
      }
    }
  };

  // Handle individual change
  const handleIndividualChange = async (e) => {
    const { name, value } = e.target;
    setShipperFormData((prev) => ({ ...prev, [name]: value }));

    // If individual is changed, fetch their info
    if (name === "shipper") {
      try {
        // First try to find the individual in our local state
        const selectedIndividual = individuals.find(
          (individual) => individual.individualName === value
        );

        if (selectedIndividual) {
          setShipperFormData((prev) => ({
            ...prev,
            pickupAddress:
              selectedIndividual.individualAddress ||
              selectedIndividual.address ||
              "",
          }));
          return;
        }

        // If not found in local state, try fetching from API
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_BACKEND_API}/api/individuals/search`,
          {
            params: { name: value },
            validateStatus: function (status) {
              return status < 500; // Only treat 500+ as errors
            },
          }
        );

        if (
          response.status === 404 ||
          !response.data ||
          response.data.length === 0
        ) {
          console.log("No individual found with name:", value);
          setShipperFormData((prev) => ({
            ...prev,
            pickupAddress: "",
          }));
          return;
        }

        if (response.data && response.data.length > 0) {
          const individual = response.data[0];
          setShipperFormData((prev) => ({
            ...prev,
            pickupAddress:
              individual.individualAddress || individual.address || "",
          }));
        }
      } catch (error) {
        console.error("Error fetching individual details:", error);

        // Show error toast only for non-404 errors
        if (!error.response || error.response.status >= 500) {
          toast({
            title: "Error",
            description:
              "Failed to fetch individual details. Please try again.",
            status: "error",
            duration: 3000,
            isClosable: true,
            position: "top-center",
          });
        }

        // Clear the address on error
        setShipperFormData((prev) => ({
          ...prev,
          pickupAddress: "",
        }));
      }
    }
  };

  // Toggle between individual and company mode
  const toggleIndividualMode = () => {
    const newMode = !isIndividualMode;
    setIsIndividualMode(newMode);

    // Clear shipper but try to keep address if possible
    const currentShipper = shipperFormData.shipper;
    let newAddress = "";

    if (currentShipper) {
      // Check if we can keep the address by finding the entity in the new mode
      if (newMode) {
        // Switching to individual mode - check if there's an individual with the same name
        const matchingIndividual = individuals.find(
          (ind) => ind.individualName === currentShipper
        );
        if (matchingIndividual) {
          newAddress = matchingIndividual.individualAddress || "";
        }
      } else {
        // Switching to company mode - check if there's a company with the same name
        const matchingCompany = companies.find(
          (comp) => comp.companyName === currentShipper
        );
        if (matchingCompany) {
          newAddress = matchingCompany.businessAddress || "";
        }
      }
    }

    setShipperFormData((prev) => ({
      ...prev,
      shipper: "", // Clear shipper on mode change
      pickupAddress: newAddress, // Use matched address or clear it
    }));

    console.log(
      `Switched to ${newMode ? "individual" : "company"} mode, address set to: ${newAddress || "empty"}`
    );
  };

  // Handle date change
  const handleDateChange = (e) => {
    const { name, value } = e.target;
    setShipperFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Handle truck CBM change
  const handleTotalTruckCbmChange = (e) => {
    const value = parseFloat(e.target.value) || 0;
    setTruckCbm(value);
    if (onTruckCbmUpdate) {
      onTruckCbmUpdate(value);
    }
  };

  // Save shipper info
  const handleSaveShipperInfo = async () => {
    try {
      // Validate all required fields
      const requiredFields = {
        shipper: "Shipper",
        date: "Date",
        pickupAddress: "Pick-up Address",
        driverName: "Driver's Name",
        plateNo: "Plate No.",
        datePrepared: "Date Prepared",
        waybillNumber: "Waybill Number",
        storeType: "Store Type",
      };

      // Check each required field
      for (const [field, label] of Object.entries(requiredFields)) {
        if (!shipperFormData[field] || shipperFormData[field].trim() === "") {
          toast({
            title: "Validation Error",
            description: `${label} is required`,
            status: "error",
            duration: 3000,
            isClosable: true,
            position: "top-center",
          });
          return;
        }
      }

      // Format dates to ensure they are in the correct format
      const formattedData = {
        ...shipperFormData,
        date: shipperFormData.date
          ? new Date(shipperFormData.date).toISOString()
          : null,
        datePrepared: shipperFormData.datePrepared
          ? new Date(shipperFormData.datePrepared).toISOString()
          : null,
        mode: isIndividualMode ? "individual" : "company",
        totalTruckCbm: shipperFormData.totalTruckCbm || truckCbm,
        isFixedRate: true, // Add this flag to indicate it's a fixed rate waybill
        dropType: "fix rate", // Add the dropType field
      };

      // Save to fixed rate endpoint
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/fixRateShipperInfo`,
        formattedData
      );

      if (!response.data) {
        throw new Error("Failed to save shipper info");
      }

      // Set isShipperInfoSaved to true
      setIsShipperInfoSaved(true);

      // Update truckCbm with the saved value if it exists
      if (formattedData.totalTruckCbm) {
        setTruckCbm(formattedData.totalTruckCbm);
        if (onTruckCbmUpdate) {
          onTruckCbmUpdate(formattedData.totalTruckCbm);
        }
      }

      toast({
        title: "Success",
        description: "Shipper information saved successfully!",
        status: "success",
        duration: 3000,
        isClosable: true,
        position: "top-center",
      });
    } catch (error) {
      console.error("Error saving shipper info:", error);
      toast({
        title: "Error",
        description: error.message || "Error saving shipper information",
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "top-center",
      });
    }
  };

  // Open drawer to add new consignee
  const handleAddConsignee = () => {
    // Make sure the origin is populated with the current shipper info
    setCurrentConsignee({
      waybillNumber,
      consignee: isIndividualMode ? shipperFormData.shipper : "", // For individual mode, pre-fill from shipper
      company: "",
      store: "",
      destination: "",
      amount: fixedRate, // Default to current fixed rate
      rate: fixedRate, // Default to current fixed rate
      origin: shipperFormData.shipper, // Explicitly set origin to current shipper
      isIndividual: isIndividualMode, // Track individual mode
    });
    setIsEditing(false);
    onDrawerOpen();

    // Log to ensure we're passing the right value
    console.log(
      "Opening drawer with shipper:",
      shipperFormData.shipper,
      "isIndividualMode:",
      isIndividualMode
    );
  };

  // Open drawer to edit consignee
  const handleEditConsignee = (consignee) => {
    setCurrentConsignee({ ...consignee });
    setIsEditing(true);
    onDrawerOpen();
  };

  // Confirm delete consignee
  const handleDeleteConfirm = (consignee) => {
    setDeleteConsignee(consignee);
    onAlertOpen();
  };

  // Delete consignee
  const handleDeleteConsignee = async () => {
    if (!deleteConsignee || !deleteConsignee._id) return;

    try {
      await axios.delete(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/fixRateConsignees/${deleteConsignee._id}`
      );

      // Update consignees list
      setConsignees(consignees.filter((c) => c._id !== deleteConsignee._id));

      toast({
        title: "Success",
        description: "Consignee deleted successfully",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error("Error deleting consignee:", error);
      toast({
        title: "Error",
        description: "Failed to delete consignee",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      onAlertClose();
      setDeleteConsignee(null);
    }
  };

  // Delete all data for this waybill
  const handleDeleteAll = async () => {
    try {
      setIsLoading(true);

      // Delete shipper info
      try {
        await axios.delete(
          `${process.env.NEXT_PUBLIC_BACKEND_API}/api/fixRateShipperInfo/${waybillNumber}`
        );
        console.log(`Deleted shipper info for waybill ${waybillNumber}`);
      } catch (error) {
        console.error("Error deleting shipper info:", error);
        // Continue with consignee deletion even if shipper deletion fails
      }

      // Delete all consignees
      try {
        await axios.delete(
          `${process.env.NEXT_PUBLIC_BACKEND_API}/api/fixRateConsignees/waybill/${waybillNumber}`
        );
        console.log(`Deleted all consignees for waybill ${waybillNumber}`);
      } catch (error) {
        console.error("Error deleting consignees:", error);
      }

      // Reset state
      setShipperFormData({
        waybillNumber: waybillNumber,
        shipper: "",
        pickupAddress: "",
        driverName: "",
        plateNo: "",
        date: new Date().toISOString().split("T")[0],
        datePrepared: new Date().toISOString().split("T")[0],
        storeType: "DC",
      });
      setConsignees([]);
      setIsShipperInfoSaved(false);

      toast({
        title: "Success",
        description: "Successfully deleted all data for this waybill",
        status: "success",
        duration: 3000,
        isClosable: true,
      });

      // Close the alert
      onDeleteAllAlertClose();
    } catch (error) {
      console.error("Error in delete all operation:", error);
      toast({
        title: "Error",
        description: "There was an error deleting the waybill data",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Save consignee from drawer
  const handleSaveConsignee = async (consigneeData) => {
    try {
      let response;

      // Ensure consignee name is set appropriately based on mode
      const updatedConsigneeData = {
        ...consigneeData,
        consignee: consigneeData.isIndividual
          ? consigneeData.consignee // For individuals, use the direct consignee name
          : consigneeData.consignee ||
            `${consigneeData.company || ""} ${consigneeData.store || ""}`.trim() ||
            "Unnamed",
      };

      if (isEditing && updatedConsigneeData._id) {
        // Update existing consignee
        response = await axios.put(
          `${process.env.NEXT_PUBLIC_BACKEND_API}/api/fixRateConsignees/${updatedConsigneeData._id}`,
          updatedConsigneeData
        );

        // Update consignees list
        setConsignees(
          consignees.map((c) =>
            c._id === updatedConsigneeData._id ? response.data : c
          )
        );
      } else {
        // Create new consignee
        response = await axios.post(
          `${process.env.NEXT_PUBLIC_BACKEND_API}/api/fixRateConsignees`,
          updatedConsigneeData
        );

        // Add to consignees list
        setConsignees([...consignees, response.data]);

        // Update fixed rate if it's the first consignee
        if (consignees.length === 0) {
          setFixedRate(response.data.rate);
        }
      }

      toast({
        title: "Success",
        description: `Consignee ${isEditing ? "updated" : "added"} successfully`,
        status: "success",
        duration: 3000,
        isClosable: true,
      });

      onDrawerClose();
    } catch (error) {
      console.error("Error saving consignee:", error);
      toast({
        title: "Error",
        description: `Failed to ${isEditing ? "update" : "add"} consignee`,
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  // Update waybill summary
  const updateWaybillSummary = async () => {
    try {
      await axios.post(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/waybillSummary`,
        {
          waybillNumber,
          reference: shipperFormData.shipper,
          shipper: shipperFormData.shipper,
          consignees: consignees.map((c) => c.company || c.store || "Unnamed"),
          totalCBM: 0, // Not used in fix rate, but required by model
          additionals: 0,
          drCost: 0,
          totalPercentage: "100%", // Always 100% for fix rate
          totalCost: totalAmount,
          isFixRate: true,
        }
      );
    } catch (error) {
      console.error("Error updating waybill summary:", error);
    }
  };

  return (
    <Box>
      {isLoading ? (
        <Flex justify="center" align="center" height="400px">
          <Spinner size="xl" color={primaryColor} thickness="4px" />
        </Flex>
      ) : (
        <Grid templateColumns="1fr 1fr" gap={6}>
          {/* Left Column - Shipper Information */}
          <GridItem>
            <ShipperInformation
              primaryColor={primaryColor}
              secondaryColor={secondaryColor}
              borderColor={borderColor}
              isShipperInfoSaved={isShipperInfoSaved}
              shipperFormData={shipperFormData}
              handleShipperChange={handleShipperChange}
              handleIndividualChange={handleIndividualChange}
              handleDateChange={handleDateChange}
              toggleIndividualMode={toggleIndividualMode}
              isIndividualMode={isIndividualMode}
              handleSaveShipperInfo={handleSaveShipperInfo}
              individuals={individuals}
              companies={companies}
              formatDateForInput={formatDateForInput}
              dateRange={dateRange}
              waybillNumber={waybillNumber}
              truckCbm={truckCbm}
              handleTotalTruckCbmChange={handleTotalTruckCbmChange}
            />
          </GridItem>

          {/* Right Column - Consignee Information */}
          <GridItem>
            <Box
              bg="white"
              p={6}
              borderRadius="lg"
              boxShadow="md"
              borderWidth="1px"
              borderColor={borderColor}
              h="100%"
              transition="all 0.2s ease"
              _hover={{
                boxShadow: "lg",
              }}
            >
              <Flex justifyContent="space-between" alignItems="center" mb={4}>
                <Heading size="md" fontWeight="bold" color={primaryColor}>
                  Fixed Rate Consignees
                </Heading>
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
                    colorScheme="blue"
                    onClick={handleAddConsignee}
                    isDisabled={!isShipperInfoSaved}
                  >
                    Add Consignee
                  </Button>
                </Flex>
              </Flex>

              {!isShipperInfoSaved && (
                <Box
                  p={4}
                  bg="yellow.50"
                  borderRadius="md"
                  borderWidth="1px"
                  borderColor="yellow.200"
                  mb={4}
                >
                  <Text color="yellow.800">
                    Please save shipper information before adding consignees.
                  </Text>
                </Box>
              )}

              {/* Fixed Rate Information */}
              <Box p={4} bg="blue.50" borderRadius="md" mb={4}>
                <Flex justifyContent="space-between" alignItems="center">
                  <Text fontWeight="bold" color={primaryColor}>
                    Fixed Rate:
                  </Text>
                  <Text fontSize="lg" fontWeight="bold">
                    ₱{formatNumberWithCommas(fixedRate)}
                  </Text>
                </Flex>
                <Flex justifyContent="space-between" alignItems="center" mt={2}>
                  <Text fontWeight="bold" color={primaryColor}>
                    Total Amount:
                  </Text>
                  <Text fontSize="lg" fontWeight="bold">
                    ₱{formatNumberWithCommas(totalAmount)}
                  </Text>
                </Flex>
              </Box>

              {/* Consignees Table */}
              <Box overflowX="auto">
                <Table variant="simple" size="sm">
                  <Thead>
                    <Tr bg={`${primaryColor}10`}>
                      <Th>#</Th>
                      <Th>Company</Th>
                      <Th>Store</Th>
                      <Th>Origin</Th>
                      <Th>Destination</Th>
                      <Th>Type</Th>
                      <Th isNumeric>Amount</Th>
                      <Th>Actions</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {consignees.length === 0 ? (
                      <Tr>
                        <Td colSpan={8} textAlign="center" py={4}>
                          No consignees added yet
                        </Td>
                      </Tr>
                    ) : (
                      consignees.map((consignee, index) => (
                        <Tr key={consignee._id}>
                          <Td>{index + 1}</Td>
                          <Td>{consignee.company || "-"}</Td>
                          <Td>{consignee.store || "-"}</Td>
                          <Td>{consignee.origin}</Td>
                          <Td>{consignee.destination}</Td>
                          <Td>{consignee.type}</Td>
                          <Td isNumeric>
                            ₱{formatNumberWithCommas(consignee.amount)}
                          </Td>
                          <Td>
                            <ButtonGroup size="xs" variant="ghost">
                              <IconButton
                                icon={<EditIcon />}
                                aria-label="Edit"
                                colorScheme="blue"
                                onClick={() => handleEditConsignee(consignee)}
                              />
                              <IconButton
                                icon={<DeleteIcon />}
                                aria-label="Delete"
                                colorScheme="red"
                                onClick={() => handleDeleteConfirm(consignee)}
                              />
                            </ButtonGroup>
                          </Td>
                        </Tr>
                      ))
                    )}
                  </Tbody>
                </Table>
              </Box>

              {/* Save Waybill Button */}
              <Button
                mt={6}
                width="full"
                colorScheme="blue"
                size="lg"
                onClick={() => {
                  updateWaybillSummary();
                  onModalClose();
                }}
                leftIcon={<Icon as={FaSave} />}
                isDisabled={consignees.length === 0 || !isShipperInfoSaved}
              >
                Save & Close
              </Button>
            </Box>
          </GridItem>
        </Grid>
      )}

      {/* Consignee Drawer */}
      <FixRateConsigneeDrawer
        isOpen={isDrawerOpen}
        onClose={onDrawerClose}
        consignee={currentConsignee}
        isEditing={isEditing}
        onSave={handleSaveConsignee}
        fixedRate={fixedRate}
        waybillNumber={waybillNumber}
        companies={companies}
        individuals={individuals}
        SearchableSelect={SearchableSelect}
        shipperInfo={shipperFormData.shipper}
        isIndividualMode={isIndividualMode}
      />

      {/* Delete Confirmation */}
      <AlertDialog
        isOpen={isAlertOpen}
        leastDestructiveRef={cancelRef}
        onClose={onAlertClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete Consignee
            </AlertDialogHeader>

            <AlertDialogBody>
              Are you sure you want to delete this consignee? This action cannot
              be undone.
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onAlertClose}>
                Cancel
              </Button>
              <Button colorScheme="red" onClick={handleDeleteConsignee} ml={3}>
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>

      {/* Delete All Confirmation */}
      <AlertDialog
        isOpen={isDeleteAllAlertOpen}
        leastDestructiveRef={deleteAllCancelRef}
        onClose={onDeleteAllAlertClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold" color="red.500">
              Delete All Waybill Data
            </AlertDialogHeader>

            <AlertDialogBody>
              <Text mb={2}>
                <strong>Warning:</strong> You are about to delete all data for
                waybill <strong>{waybillNumber}</strong>.
              </Text>
              <Text mb={4}>
                This will permanently remove the shipper information and all
                consignees associated with this waybill.
              </Text>
              <Text fontWeight="bold" color="red.500">
                This action cannot be undone.
              </Text>
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={deleteAllCancelRef} onClick={onDeleteAllAlertClose}>
                Cancel
              </Button>
              <Button
                colorScheme="red"
                onClick={handleDeleteAll}
                ml={3}
                isLoading={isLoading}
                loadingText="Deleting..."
              >
                Delete All
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
};

export default FixRateWaybill;
