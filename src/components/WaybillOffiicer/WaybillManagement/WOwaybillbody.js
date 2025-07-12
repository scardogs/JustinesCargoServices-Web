import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Drawer,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  DrawerHeader,
  DrawerBody,
  DrawerFooter,
  Box,
  Button,
  Flex,
  Heading,
  Text,
  Select,
  Input,
  FormControl,
  FormLabel,
  Grid,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  IconButton,
  useDisclosure,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Tooltip,
  useToast,
  Icon,
  Badge,
  Divider,
  HStack,
  RadioGroup,
  Radio,
  SimpleGrid,
  InputGroup,
  InputRightElement,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  GridItem,
  VStack,
  Tfoot,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionIcon,
  AccordionPanel,
  Spinner,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuGroup,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverHeader,
  PopoverBody,
  PopoverFooter,
  PopoverArrow,
  PopoverCloseButton,
} from "@chakra-ui/react";
import { useRouter } from "next/router";
import {
  AddIcon,
  DeleteIcon,
  EditIcon,
  InfoIcon,
  CalendarIcon,
  DownloadIcon,
  CheckIcon,
  SearchIcon,
  ChevronUpIcon,
  ChevronDownIcon,
} from "@chakra-ui/icons";
import {
  FaList,
  FaBoxOpen,
  FaCubes,
  FaMapMarkerAlt,
  FaFlag,
  FaTruck,
  FaFileInvoice,
  FaUser,
  FaSave,
  FaStore,
  FaBuilding,
  FaCheck,
  FaEdit,
  FaRegClipboard,
  FaHome,
  FaPercent,
  FaMoneyBillWave,
  FaArrowUp,
  FaPlus,
  FaEquals,
  FaChartBar,
  FaChartLine,
  FaBalanceScale,
  FaTag,
  FaCalculator,
  FaCube,
  FaWeight,
  FaUserAlt,
  FaCalendarAlt,
  FaTrash,
  FaPercentage,
  FaUsers,
  FaLayerGroup,
} from "react-icons/fa";
import { FiBarChart2, FiInfo, FiPercent } from "react-icons/fi";
import { BiAnalyse } from "react-icons/bi";
import { CgArrowLongLeft } from "react-icons/cg";
import EntityAbbreviationSummary, {
  calculateTotalsByEntityAbbreviation,
  fetchSubDetails,
} from "./WOEntityAbbreviationSummary";
import WaybillHeader from "./WOWaybillHeader";
import ShipperInformation from "./WOShipperInformation";
import ConsigneeInformation from "./WOConsigneeInformation";
import ConsigneeDrawer from "./WOConsigneeDrawer";
import EditDrawer from "./WOEditDrawer";
import FixRateConsigneeDrawer from "./WOFixRateConsigneeDrawer";
import axios from "axios";

const primaryColor = "#143D60";
const secondaryColor = "#1A4F7A";
const accentColor = "#FF6B6B";
const lightBg = "#F8FAFC";
const borderColor = "#E2E8F0";

// Helper function for consistent rounding to 2 decimal places
const roundToTwo = (num) => {
  return +(Math.round(num + "e+2") + "e-2");
};

// Helper function to check if values are nearly equal, accounting for floating point errors
const areNumbersEqual = (num1, num2, epsilon = 0.01) => {
  return Math.abs(num1 - num2) < epsilon;
};

// Utility function to format numbers with commas (accounting format)
const formatNumberWithCommas = (value) => {
  if (value === null || value === undefined || value === "") return "";

  // Handle special case for percentages near 100%
  if (value >= 99.99 && value <= 100.01) {
    return "100.00";
  }

  return roundToTwo(parseFloat(value)).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

// Custom FormattedNumberInput component
const FormattedNumberInput = ({ value, onChange, ...props }) => {
  // Display formatted value but keep the actual numeric value for the input
  const displayValue = value;

  // Create an event handler that passes through the numeric value
  const handleChange = (e) => {
    if (onChange) {
      onChange(e);
    }
  };

  return (
    <InputGroup size={props.size || "md"}>
      <Input
        type="number"
        value={displayValue}
        onChange={handleChange}
        borderColor={props.borderColor}
        _hover={props._hover}
        _focus={props._focus}
        bg={props.bg || "white"}
        isDisabled={props.isDisabled}
        _disabled={props._disabled}
        {...props}
      />
      {props.showUnit && (
        <InputRightElement
          width={props.unitWidth || "3rem"}
          height="100%"
          fontSize="xs"
        >
          <Text color="gray.500" mr={1}>
            {props.unit || ""}
          </Text>
        </InputRightElement>
      )}
    </InputGroup>
  );
};

// Custom SearchableSelect component
const SearchableSelect = ({
  value,
  onChange,
  options,
  placeholder,
  size = "md",
  height,
  bg = "white",
  borderColor,
  _hover,
  _focus,
  name, // Add name prop
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);
  const [isUserTyping, setIsUserTyping] = useState(false);

  // Set search term to value when it changes externally
  useEffect(() => {
    if (value && !isUserTyping) {
      const option = options.find((opt) => opt.value === value);
      if (option) {
        setSearchTerm(option.label);
      } else {
        setSearchTerm(value); // Use value directly if no matching option found
      }
    }
  }, [value, options, isUserTyping]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        setIsOpen(false);
        setIsUserTyping(false); // Reset typing state when clicking outside
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Filter options based on search term
  const filteredOptions = searchTerm
    ? options.filter(
        (opt) =>
          opt.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
          opt.value.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : options;

  const handleInputChange = (e) => {
    const inputValue = e.target.value;
    setIsUserTyping(true); // User is typing
    setSearchTerm(inputValue);
    setIsOpen(true);

    // Pass the raw value to onChange - without entity abbreviation
    // Include the name attribute from props
    onChange({
      target: {
        value: inputValue,
        name: name,
        "data-field": "consignee", // Add data-field for consignee input consistency
      },
    });
  };

  const handleSelectOption = (option) => {
    setIsUserTyping(false); // User has selected an option
    setSearchTerm(option.label);
    setIsOpen(false);

    // Add a slight delay to ensure the state update completes
    setTimeout(() => {
      onChange({
        target: {
          value: option.value,
          name: name, // Preserve the name prop
          "data-field": "consignee", // Include data-field identifier
        },
      });
    }, 0);
  };

  // Check if current search term is a custom value
  const isCustomValue =
    searchTerm &&
    !options.some(
      (opt) => opt.label.toLowerCase() === searchTerm.toLowerCase()
    );

  return (
    <Box position="relative" ref={ref} width="100%">
      <Input
        value={searchTerm}
        onChange={handleInputChange}
        placeholder={placeholder}
        size={size}
        height={height}
        bg={bg}
        borderColor={isCustomValue && searchTerm ? "orange.300" : borderColor}
        _hover={_hover}
        _focus={_focus}
        onClick={() => setIsOpen(true)}
      />
      {isOpen && (
        <Box
          position="fixed"
          top={
            ref.current
              ? ref.current.getBoundingClientRect().bottom + window.scrollY
              : "auto"
          }
          left={
            ref.current
              ? ref.current.getBoundingClientRect().left + window.scrollX
              : "auto"
          }
          width={ref.current ? ref.current.offsetWidth + "px" : "100%"}
          zIndex={99999}
          bg="white"
          borderColor="gray.200"
          boxShadow="xl"
          borderRadius="md"
          maxHeight="200px"
          overflowY="auto"
        >
          {filteredOptions.length > 0
            ? filteredOptions.map((option) => (
                <Box
                  key={option.value}
                  p={2}
                  cursor="pointer"
                  bg={option.label === searchTerm ? "blue.50" : "white"}
                  _hover={{ bg: "gray.100" }}
                  onClick={() => handleSelectOption(option)}
                >
                  {option.label}
                </Box>
              ))
            : !isCustomValue && (
                <Box p={2} color="gray.500" textAlign="center">
                  {searchTerm ? "No matches found" : "No options available"}
                </Box>
              )}
        </Box>
      )}
    </Box>
  );
};

const WaybillBody = ({
  waybillNumber,
  onModalClose,
  onTruckCbmUpdate,
  router,
}) => {
  const toast = useToast();
  const modalRef = useRef(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  // Helper function to get ordinal suffix (1st, 2nd, 3rd, etc.)
  const getOrdinalSuffix = (number) => {
    const j = number % 10;
    const k = number % 100;
    if (j === 1 && k !== 11) {
      return "st";
    }
    if (j === 2 && k !== 12) {
      return "nd";
    }
    if (j === 3 && k !== 13) {
      return "rd";
    }
    return "th";
  };

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [storeNames, setStoreNames] = useState([]);
  const [selectedStore, setSelectedStore] = useState("");
  const [subDetails, setSubDetails] = useState([]);
  const [totalCbm, setTotalCbm] = useState(0);
  const [totalPercentage, setTotalPercentage] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [totalWeight, setTotalWeight] = useState(0);
  const [totalAdditionals, setTotalAdditionals] = useState(0);
  const [totalCbmInput, setTotalCbmInput] = useState(0);
  const [storeName, setStoreName] = useState("");
  const [showSubDetails, setShowSubDetails] = useState(false);
  const [isViewingSubDetails, setIsViewingSubDetails] = useState(false);
  const [currentConsigneeSubDetails, setCurrentConsigneeSubDetails] = useState(
    []
  );
  const [selectedConsignee, setSelectedConsignee] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [dateRange, setDateRange] = useState({
    minDate: null,
    maxDate: null,
  });

  // Add Delete All confirmation
  const {
    isOpen: isDeleteAllAlertOpen,
    onOpen: onDeleteAllAlertOpen,
    onClose: onDeleteAllAlertClose,
  } = useDisclosure();
  const deleteAllCancelRef = React.useRef();

  // Add both date formatting functions
  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;

    // Convert to mm/dd/yyyy format
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const year = date.getFullYear();

    return `${month}/${day}/${year}`;
  };

  const formatDateForInput = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;

    // Convert to YYYY-MM-DD format for date input
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  // State to manage Shipper Information
  // const router = useRouter(); // Remove this line since router is already passed as a prop

  const [selectedWaybill, setSelectedWaybill] = useState("");

  const [shipperFormData, setShipperFormData] = useState({
    shipper: "",
    shippers: "",
    date: "",
    pickupAddress: "",
    driverName: "",
    plateNo: "",
    bodyType: "", // Add bodyType field
    stubNumber: "", // Add stubNumber field to store the stub numbers associated with the plate number
    datePrepared: "",
    referenceNumber: "",
    waybillNumber: waybillNumber || "",
    storeType: "STORE", // Default to STORE
    totalTruckCbm: "", // Add totalTruckCbm field
  });

  // State to manage Consignee Information (list of consignees)
  const [consignees, setConsignees] = useState([]);
  const [shippers, setShippers] = useState({});

  // State for modal visibility
  const [isModalOpen, setIsModalOpen] = useState(false);

  // State to manage modal form data (for adding a new consignee)
  const [modalFormData, setModalFormData] = useState({
    waybillNumber: "",
    consignee: "",
    date: "",
    origin: "",
    destination: "",
  });

  // State for waybill-related data
  const [waybillNumbers, setWaybillNumbers] = useState([]);

  // Add this state for storing clients
  const [clients, setClients] = useState([]);
  const [dcStoreClients, setDcStoreClients] = useState([]);

  // Add new state for truck CBM
  const [truckCbm, setTruckCbm] = useState(null);

  // Add new state for custom total CBM input
  const [customTotalCbm, setCustomTotalCbm] = useState(0);

  // Add a state for storing clients for consignee dropdown
  const [consigneeClients, setConsigneeClients] = useState([]);

  // Add new state for store type
  const [storeType, setStoreType] = useState("Store"); // Initialize to Store to show Store section by default
  const [isDcMode, setIsDcMode] = useState(false); // Add a new state to track DC mode
  // Add new state to track if store is using sub detail mode
  const [isStoreSubDetailMode, setIsStoreSubDetailMode] = useState(false);

  // Add state for companies
  const [companies, setCompanies] = useState([]);

  // Add state for individuals
  const [individuals, setIndividuals] = useState([]);

  // Add state for tracking if we're in individual mode
  const [isIndividualMode, setIsIndividualMode] = useState(false);

  // Add these state variables after other state declarations
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    waybillNumber: "",
    consignee: "",
    date: "",
    origin: "",
    destination: "",
    type: "",
    cbm: "",
    percentage: "",
    amount: "",
    rate: "",
    additionals: "",
    company: "",
    shipper: "",
    shipperss: "",
  });
  const [editSubDetails, setEditSubDetails] = useState([]);
  const [editTotalCbm, setEditTotalCbm] = useState(0);
  const [editTotalPercentage, setEditTotalPercentage] = useState(0);
  const [editTotalAmount, setEditTotalAmount] = useState(0);
  const [editSubDetailsWereRequested, setEditSubDetailsWereRequested] =
    useState(false);

  // Add this state near other state declarations
  const [highestRate, setHighestRate] = useState(0);

  // Add this state near other state declarations
  const [additionalAdjustment, setAdditionalAdjustment] = useState(0);

  // Add this state near other state declarations
  const [totalRate, setTotalRate] = useState(0);

  // Add state for error messages
  const [shipperInfoError, setShipperInfoError] = useState("");
  const [consigneeError, setConsigneeError] = useState("");

  // Add loading state for rate and amount updates
  const [isUpdatingAmounts, setIsUpdatingAmounts] = useState(false);

  // Add state for tracking if shipper information has been saved
  const [isShipperInfoSaved, setIsShipperInfoSaved] = useState(false);

  // Add state to track if we're in the middle of a save operation
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Add separate state for drawer totals
  const [drawerTotalCbm, setDrawerTotalCbm] = useState(0);
  const [drawerTotalPercentage, setDrawerTotalPercentage] = useState(0);
  const [drawerTotalAmount, setDrawerTotalAmount] = useState(0);
  const [drawerTotalAdditionals, setDrawerTotalAdditionals] = useState(0);

  // Add this state near other state declarations
  const [shipperEntityAbbreviation, setShipperEntityAbbreviation] =
    useState("");

  const [selectedEntityAbbreviations, setSelectedEntityAbbreviations] =
    useState({}); // Add state for store entity abbreviations

  // Add this state near the top of the component with other state declarations
  const [additionalRateValue, setAdditionalRateValue] = useState(1000);
  // Add state for waybill-specific rate
  const [waybillSpecificRate, setWaybillSpecificRate] = useState(null);

  // Add this function to fetch the additional rate
  const fetchAdditionalRate = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/additionalRate`
      );

      if (!response.ok) {
        console.error("Error fetching additional rate:", response.statusText);
        return 1000; // Default fallback value
      }

      const data = await response.json();
      return data.rate || 1000; // Use 1000 as fallback
    } catch (error) {
      console.error("Error fetching additional rate:", error);
      return 1000; // Default fallback value
    }
  };

  // Add a useEffect to fetch the additional rate on component mount
  useEffect(() => {
    const getAdditionalRate = async () => {
      const rate = await fetchAdditionalRate();
      setAdditionalRateValue(rate);
    };

    getAdditionalRate();
  }, []);

  // Add this function to calculate the highest rate
  const calculateHighestRate = async (waybillNumber) => {
    const consigneesForWaybill = consignees.filter(
      (c) => c.waybillNumber === waybillNumber
    );

    // Get saved adjustment from database first
    const savedAdjustment = await fetchAdditionalAdjustment(waybillNumber);

    // If we have a saved adjustment, use it
    if (savedAdjustment !== null) {
      setAdditionalAdjustment(savedAdjustment);
    } else {
      // Otherwise, calculate default adjustment
      let defaultAdjustment = 0;

      // Check if any consignee has split or payload set
      const hasSplitOrPayload = consigneesForWaybill.some(
        (c) => c.split === "split" || c.payload === "payload"
      );

      // Only apply the additional adjustment if no consignees have split or payload
      if (!hasSplitOrPayload && consigneesForWaybill.length > 2) {
        // Use waybill-specific rate if available, otherwise use current global rate
        const rateToUse =
          waybillSpecificRate !== null
            ? waybillSpecificRate
            : additionalRateValue;
        // For each consignee beyond the first two, add the rate per drop
        defaultAdjustment = (consigneesForWaybill.length - 2) * rateToUse;
      }

      setAdditionalAdjustment(defaultAdjustment);

      // Save the default adjustment to the database if we calculated one
      if (defaultAdjustment > 0) {
        try {
          await saveAdditionalAdjustment(waybillNumber, defaultAdjustment);
        } catch (error) {
          console.error("Error saving default additional adjustment:", error);
        }
      }
    }

    const rates = consigneesForWaybill.map((c) => parseFloat(c.rate) || 0);
    return Math.max(...rates, 0);
  };

  // Update the useEffect that triggers calculateHighestRate to handle the async function
  useEffect(() => {
    const updateHighestRate = async () => {
      if (selectedWaybill) {
        const highest = await calculateHighestRate(selectedWaybill);
        setHighestRate(highest);
        console.log("Highest rate updated:", highest);

        // Calculate total rate whenever highestRate or additionalAdjustment changes
        setTotalRate(highest + additionalAdjustment);

        // Calculate total percentage and amount only from consignee list
        const consigneesForWaybill = consignees.filter(
          (c) => c.waybillNumber === selectedWaybill
        );

        // Calculate total percentage with proper rounding
        const totalPct = Number(
          consigneesForWaybill
            .reduce(
              (sum, consignee) => sum + (Number(consignee.percentage) || 0),
              0
            )
            .toFixed(2)
        );

        // Calculate total amount with proper rounding
        const totalAmt = Number(
          consigneesForWaybill
            .reduce(
              (sum, consignee) => sum + (Number(consignee.amount) || 0),
              0
            )
            .toFixed(2)
        );

        setTotalPercentage(totalPct);
        setTotalAmount(totalAmt);
      }
    };

    updateHighestRate();
  }, [consignees, selectedWaybill]);

  // Update the useEffect for additionalAdjustment
  useEffect(() => {
    if (selectedWaybill && highestRate !== null) {
      console.log("Updating total rate with adjustment:", additionalAdjustment);
      setTotalRate(highestRate + additionalAdjustment);
    }
  }, [additionalAdjustment, highestRate, selectedWaybill]);

  // Update the useEffect that recalculates adjustment when consignees change
  useEffect(() => {
    if (selectedWaybill) {
      // Get consignees for this waybill
      const waybillConsignees = consignees.filter(
        (c) => c.waybillNumber === selectedWaybill
      );

      // Check if any consignee has split or payload set
      const hasSplitOrPayload = waybillConsignees.some(
        (c) => c.split === "split" || c.payload === "payload"
      );

      // Calculate new adjustment based on number of consignees
      // Only apply additional adjustment if no consignees have split or payload
      const numConsignees = waybillConsignees.length;

      // Use waybill-specific rate if available, otherwise use current global rate
      const rateToUse =
        waybillSpecificRate !== null
          ? waybillSpecificRate
          : additionalRateValue;

      const newAdjustment =
        !hasSplitOrPayload && numConsignees > 2
          ? (numConsignees - 2) * rateToUse
          : 0;

      // Check if the adjustment needs to be updated
      if (newAdjustment !== additionalAdjustment) {
        console.log(
          `Real-time update: Changing adjustment from ${additionalAdjustment} to ${newAdjustment} based on ${numConsignees} consignees${hasSplitOrPayload ? " (split/payload detected - no adjustment applied)" : ""}`
        );
        setAdditionalAdjustment(newAdjustment);

        // Also update in the database
        saveAdditionalAdjustment(selectedWaybill, newAdjustment).catch(
          (error) => console.error("Failed to save adjustment:", error)
        );
      }
    }
  }, [consignees, selectedWaybill, waybillSpecificRate]); // Add waybillSpecificRate and remove additionalRateValue

  // First, update the useEffect that triggers the amount update
  useEffect(() => {
    if (
      selectedWaybill &&
      highestRate !== null &&
      additionalAdjustment !== null &&
      totalRate !== null &&
      !isEditDrawerOpen && // Add this check to prevent updates when editing
      !isSavingEdit // Also prevent updates during save operations
    ) {
      console.log("Starting amount update with rates:", {
        highestRate,
        additionalAdjustment,
        totalRate,
      });
      updateAmountsWithHighestRate();
    }
  }, [totalRate, isEditDrawerOpen, isSavingEdit]); // Add isSavingEdit as a dependency
  // Add this state variable for entity abbreviation

  // Replace the updateAmountsWithHighestRate function with this new version that calls the backend
  const fetchHighestRate = async (waybillNumber) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/highestRate/${waybillNumber}`
      );
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error("Failed to fetch highest rate");
      }
      return await response.json();
    } catch (error) {
      console.error("Error fetching highest rate:", error);
      return null;
    }
  };

  // Replace the updateAmountsWithHighestRate function with this new version that calls the backend
  const updateAmountsWithHighestRate = async () => {
    try {
      setIsUpdatingAmounts(true);

      // Skip update if edit drawer is open or save is in progress
      if (isEditDrawerOpen || isSavingEdit) {
        console.log(
          "Skipping amount update because edit drawer is open or save is in progress"
        );
        return;
      }

      // Validate all required values exist
      if (
        !selectedWaybill ||
        totalRate === null ||
        !consignees ||
        consignees.length === 0
      ) {
        console.error("Missing required data for amount update", {
          waybill: selectedWaybill,
          totalRate,
          consigneesCount: consignees?.length || 0,
        });
        setIsUpdatingAmounts(false);
        return;
      }

      // Fetch highest rate and isDuplicated from backend
      const highestRateData = await fetchHighestRate(selectedWaybill);
      if (highestRateData && highestRateData.isDuplicated) {
        // Use backend value, do not recalculate or update
        const baseRate = Number(highestRateData.highestRate) || 0;
        setHighestRate(baseRate);
        // toast({
        //   title: "Duplicated Highest Rate",
        //   description: `Using duplicated highest rate: ₱${formatNumberWithCommas(baseRate)}`,
        //   status: "info",
        //   duration: 3000,
        //   isClosable: true,
        // });
        setIsUpdatingAmounts(false);
        return;
      }

      // Otherwise, recalculate and update as before
      let baseRate;
      let skipUpdateHighestRate = false;
      if (highestRateData && highestRateData.isDuplicated) {
        // If duplicated, use the stored highest rate and do not update it
        baseRate = Number(highestRateData.highestRate) || 0;
        skipUpdateHighestRate = true;
      } else {
        // Not duplicated, recalculate
        baseRate = await calculateHighestRate(selectedWaybill);
      }
      const adjustment = Number(additionalAdjustment) || 0;

      // Only update the highest rate in DB if not duplicated
      if (!skipUpdateHighestRate) {
        try {
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_BACKEND_API}/api/highestRate/${selectedWaybill}`,
            {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                highestRate: baseRate,
                isDuplicated: false,
                duplicatedFrom: null,
              }),
            }
          );
          if (!response.ok) {
            throw new Error("Failed to save highest rate");
          }
          // Optionally show a toast here
        } catch (error) {
          console.error("Error saving highest rate:", error);
          toast({
            title: "Error Saving Highest Rate",
            description: "Failed to save highest rate to database",
            status: "error",
            duration: 3000,
            isClosable: true,
            position: "top-right",
          });
        }
      }

      console.log("Starting update of amounts with rate:", totalRate);

      // First check for rounded entities - we'll need to preserve their values
      const roundedEntitiesResponse = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/entity-abbreviation-summary/waybill/${selectedWaybill}`
      );

      // Get list of rounded entities to display in console
      if (roundedEntitiesResponse.ok) {
        const entitySummaries = await roundedEntitiesResponse.json();
        const roundedEntities = entitySummaries.filter(
          (summary) => summary.status === "rounded"
        );

        if (roundedEntities.length > 0) {
          console.log(
            `Found ${roundedEntities.length} rounded entities that will be preserved:`
          );
          roundedEntities.forEach((entity) => {
            console.log(
              `- ${entity.entityAbbreviation}: ${entity.totalPercentage}% = ${entity.totalAmount}`
            );
          });
        }
      }

      // Continue with the existing update amounts logic
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/consigneeInfo/updateAmountsWithHighestRate/${selectedWaybill}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            highestRate: baseRate,
            additionalAdjustment: adjustment,
          }),
        }
      );

      if (!response.ok) {
        // If no consignees exist, handle it gracefully
        if (response.status === 404) {
          console.log("No consignees found for this waybill");
          // Update UI appropriately for an empty waybill
          setTotalRate(baseRate + adjustment);
          setTotalPercentage(0);
          setTotalAmount(baseRate + adjustment);
          setConsignees([]);
          setIsUpdatingAmounts(false);
          return;
        }

        const errorData = await response.json().catch(() => response.text());
        throw new Error(
          `Error updating amounts: ${response.statusText}. ${typeof errorData === "string" ? errorData : JSON.stringify(errorData)}`
        );
      }

      const result = await response.json();
      console.log("Backend update result:", result);

      // Update state with the results from the backend
      setTotalRate(result.totalRate);
      setTotalPercentage(result.totalPercentage);
      setTotalAmount(result.totalAmount);

      // If we have rounded entities, log information about them
      if (result.roundedEntities && result.roundedEntities.length > 0) {
        console.log(
          `Preserved ${result.roundedEntities.length} rounded entities during update`
        );
      }

      // Show success toast for amounts update
      // toast({
      //   title: "Amounts Updated",
      //   description: "Successfully updated all amounts with the highest rate",
      //   status: "success",
      //   duration: 3000,
      //   isClosable: true,
      //   position: "top-right",
      // });

      // Refresh consignees to reflect the updated values
      await fetchConsignees();

      // Refresh entity totals
      await fetchEntitySummariesWithStatus(selectedWaybill);

      // Example:
      const calculatedHighestRate = await calculateHighestRate(selectedWaybill);
      // Save the highest rate to the database
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_API}/api/highestRate/${selectedWaybill}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              highestRate: calculatedHighestRate,
              isDuplicated: false,
              duplicatedFrom: null,
            }),
          }
        );
        if (!response.ok) {
          throw new Error("Failed to save highest rate");
        }
        // toast({
        //   title: "Highest Rate Saved",
        //   description: `Highest rate saved: ₱${formatNumberWithCommas(calculatedHighestRate)}`,
        //   status: "success",
        //   duration: 3000,
        //   isClosable: true,
        // });
        setHighestRate(calculatedHighestRate);
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to save highest rate",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      }
      setIsUpdatingAmounts(false);
    } catch (error) {
      console.error("Error updating amounts with highest rate:", error);
      setIsUpdatingAmounts(false);
    }
  };

  // Add useEffect to fetch companies
  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const response = await fetch(
          process.env.NEXT_PUBLIC_BACKEND_API + "/api/companies"
        );
        const data = await response.json();
        setCompanies(data);
      } catch (error) {
        console.error("Error fetching companies:", error);
      }
    };
    fetchCompanies();
  }, []);

  // Add a function to ensure percentages add up to exactly 100%
  const normalizePercentages = (consignees) => {
    // Get only consignees for this waybill
    const waybillConsignees = consignees.filter(
      (c) => c.waybillNumber === selectedWaybill
    );

    if (waybillConsignees.length === 0) return consignees;

    // Calculate the current sum of percentages
    const totalPct = waybillConsignees.reduce(
      (sum, c) => sum + (Number(c.percentage) || 0),
      0
    );

    // If the total is already 100% (or very close), no need to adjust
    if (Math.abs(totalPct - 100) < 0.001) return consignees;

    // Create a copy of consignees
    const updatedConsignees = [...consignees];

    // Get indices of consignees for this waybill
    const indices = updatedConsignees
      .map((c, i) => (c.waybillNumber === selectedWaybill ? i : -1))
      .filter((i) => i !== -1);

    // If there's only one consignee, set it to 100%
    if (indices.length === 1) {
      updatedConsignees[indices[0]] = {
        ...updatedConsignees[indices[0]],
        percentage: 100,
      };
      return updatedConsignees;
    }

    // Calculate the scaling factor to get to exactly 100%
    const scalingFactor = 100 / totalPct;

    // Scale all percentages except the last one
    for (let i = 0; i < indices.length - 1; i++) {
      const idx = indices[i];
      const c = updatedConsignees[idx];
      const newPercentage = Number(
        (Number(c.percentage) * scalingFactor).toFixed(2)
      );
      updatedConsignees[idx] = {
        ...c,
        percentage: newPercentage,
      };
    }

    // The last consignee gets the remaining percentage to ensure exactly 100%
    const lastIdx = indices[indices.length - 1];
    const sumExceptLast = indices
      .slice(0, -1)
      .reduce((sum, idx) => sum + Number(updatedConsignees[idx].percentage), 0);

    const lastPercentage = Number((100 - sumExceptLast).toFixed(2));
    updatedConsignees[lastIdx] = {
      ...updatedConsignees[lastIdx],
      percentage: lastPercentage,
    };

    return updatedConsignees;
  };

  // Add a useEffect to ensure total amount = base rate + additional when percentage = 100%
  useEffect(() => {
    if (selectedWaybill && Math.abs(totalPercentage - 100) < 0.01) {
      const baseRate = Number(highestRate) || 0;
      const adjustment = Number(additionalAdjustment) || 0;
      const expectedTotalRate = Number((baseRate + adjustment).toFixed(2));

      // If there's a discrepancy between expected total and actual total amount
      if (Math.abs(totalAmount - expectedTotalRate) > 0.01) {
        console.log(`Adjusting total amount to match expected total: 
          Current total: ${totalAmount} 
          Expected total: ${expectedTotalRate}`);

        // Set the total amount to match exactly the base rate + additional
        setTotalAmount(expectedTotalRate);
      }
    }
  }, [
    selectedWaybill,
    totalPercentage,
    highestRate,
    additionalAdjustment,
    totalAmount,
  ]);

  // Add a useEffect to auto-fetch consignees when component mounts if shipper is already selected
  const useApiCall = (apiFunction, deps) => {
    useEffect(() => {
      apiFunction();
    }, deps);
  };

  useApiCall(async () => {
    // Check if there's a shipper value already
    if (shipperFormData.shipper) {
      console.log("Auto-fetching consignees for:", shipperFormData.shipper);

      // Find the company that matches the shipper value
      const selectedCompany = companies.find(
        (company) => company.companyName === shipperFormData.shipper
      );

      if (selectedCompany && selectedCompany._id) {
        try {
          console.log("Found matching company:", selectedCompany);
          // Show loading toast
          const loadingToastId = toast({
            title: "Loading consignees",
            description:
              "Please wait while we fetch consignees for this company",
            status: "loading",
            duration: null,
            isClosable: false,
            position: "top-center",
          });

          // Fetch consignees for this company
          const apiUrl = `${process.env.NEXT_PUBLIC_BACKEND_API}/api/multiple-consignees/byCompany/${selectedCompany._id}`;
          console.log("Auto-fetching consignees from:", apiUrl);

          const response = await fetch(apiUrl);
          console.log("Auto-fetch response status:", response.status);

          // Close loading toast
          toast.close(loadingToastId);

          if (response.ok) {
            const consigneeData = await response.json();
            console.log("Auto-fetched consignee data:", consigneeData);

            // Sort by _id in descending order (latest first)
            const sortedConsignees = consigneeData.sort((a, b) =>
              b._id.localeCompare(a._id)
            );

            // Store the consignee data in state
            setConsigneeClients(sortedConsignees);

            // Success toast
            // toast({
            //   title: "Consignees loaded",
            //   description: `${consigneeData.length} consignee(s) found for ${selectedCompany.companyName}`,
            //   status: "success",
            //   duration: 3000,
            //   isClosable: true,
            //   position: "top-center",
            // });
          } else {
            // Only show error if it's not a 404 (which means no consignees found)
            if (response.status !== 404) {
              console.error("Failed to auto-fetch consignees for company");
              toast({
                title: "Error",
                description:
                  "Failed to load consignees for the selected company",
                status: "error",
                duration: 3000,
                isClosable: true,
                position: "top-center",
              });
            }
          }
        } catch (error) {
          console.error("Error auto-fetching consignees:", error);
        }
      }
    }
  }, [companies, shipperFormData.shipper]); // Run when companies data loads or shipper changes

  useApiCall(async () => {
    // Check if there's a shipper value already
    if (shipperFormData.shippers) {
      console.log("Auto-fetching consignees for:", shipperFormData.shippers);

      // Find the company that matches the shipper value
      const selectedCompany = companies.find(
        (company) => company.companyName === shipperFormData.shippers
      );

      if (selectedCompany && selectedCompany._id) {
        try {
          console.log("Found matching company:", selectedCompany);
          // Show loading toast
          const loadingToastId = toast({
            title: "Loading consignees",
            description:
              "Please wait while we fetch consignees for this company",
            status: "loading",
            duration: null,
            isClosable: false,
            position: "top-center",
          });

          // Fetch consignees for this company
          const apiUrl = `${process.env.NEXT_PUBLIC_BACKEND_API}/api/multiple-consignees/byCompany/${selectedCompany._id}`;
          console.log("Auto-fetching consignees from:", apiUrl);

          const response = await fetch(apiUrl);
          console.log("Auto-fetch response status:", response.status);

          // Close loading toast
          toast.close(loadingToastId);

          if (response.ok) {
            const consigneeData = await response.json();
            console.log("Auto-fetched consignee data:", consigneeData);

            // Sort by _id in descending order (latest first)
            const sortedConsignees = consigneeData.sort((a, b) =>
              b._id.localeCompare(a._id)
            );

            // Store the consignee data in state
            setConsigneeClients(sortedConsignees);

            // Success toast
            // toast({
            //   title: "Consignees loaded",
            //   description: `${consigneeData.length} consignee(s) found for ${selectedCompany.companyName}`,
            //   status: "success",
            //   duration: 3000,
            //   isClosable: true,
            //   position: "top-center",
            // });
          } else {
            // Only show error if it's not a 404 (which means no consignees found)
            if (response.status !== 404) {
              console.error("Failed to auto-fetch consignees for company");
              toast({
                title: "Error",
                description:
                  "Failed to load consignees for the selected company",
                status: "error",
                duration: 3000,
                isClosable: true,
                position: "top-center",
              });
            }
          }
        } catch (error) {
          console.error("Error auto-fetching consignees:", error);
        }
      }
    }
  }, [companies, shipperFormData.shippers]); // Run when companies data loads or shipper changes

  useApiCall(async () => {
    if (waybillNumber) {
      setSelectedWaybill(waybillNumber);
      handleWaybillChange({ target: { value: waybillNumber } }); // Fetch related data
    }
  }, [waybillNumber]);

  // Fetch waybill numbers from tripDetails API
  useApiCall(async () => {
    try {
      const response = await fetch(
        process.env.NEXT_PUBLIC_BACKEND_API + "/api/tripDetails"
      );
      const data = await response.json();
      setWaybillNumbers(data.map((detail) => detail.waybillNumber));
    } catch (error) {
      console.error("Error fetching waybill numbers:", error);
    }
  }, []);

  // Add this useEffect to fetch consignees when component mounts or waybill changes
  useApiCall(async () => {
    try {
      const response = await fetch(
        process.env.NEXT_PUBLIC_BACKEND_API + "/api/consigneeInfo"
      );
      const data = await response.json();
      console.log("Fetched consignees:", data);

      // Sort by _id in descending order (latest first)
      const sortedConsignees = data.sort((a, b) => b._id.localeCompare(a._id));

      setConsignees(sortedConsignees);
    } catch (error) {
      console.error("Error fetching consignees:", error);
    }
  }, []);

  const fetchConsignees = async () => {
    try {
      const response = await fetch(
        process.env.NEXT_PUBLIC_BACKEND_API + "/api/consigneeInfo"
      );
      const data = await response.json();
      console.log("Fetched consignees:", data);

      // Sort by _id in descending order (latest first)
      const sortedConsignees = data.sort((a, b) => b._id.localeCompare(a._id));

      setConsignees(sortedConsignees);
    } catch (error) {
      console.error("Error fetching consignees:", error);
    }
  };

  // Fetch shipper data for all unique waybill numbers
  useApiCall(async () => {
    try {
      const uniqueWaybillNumbers = [
        ...new Set(consignees.map((c) => c.waybillNumber)),
      ];
      const shipperData = {};

      for (const waybillNumber of uniqueWaybillNumbers) {
        const response = await fetch(
          process.env.NEXT_PUBLIC_BACKEND_API +
            `/api/shipperInfo?waybillNumber=${waybillNumber}`
        );
        const data = await response.json();
        if (data.length > 0) {
          shipperData[waybillNumber] = data[0].shipper;
        }
      }

      setShippers(shipperData);
    } catch (error) {
      console.error("Error fetching shipper info:", error);
    }
  }, [consignees]);

  // Filter consignees based on the selected waybill number
  const filteredConsignees = consignees.filter((consignee) => {
    console.log("Filtering consignee:", consignee);
    return consignee.waybillNumber === selectedWaybill;
  });

  // Handle waybill selection and fetch related data
  const handleWaybillChange = async (e) => {
    const selectedWaybillNumber = e.target.value;

    // Reset the shipper saved state when changing waybill number
    setIsShipperInfoSaved(false);

    // Reset error displays
    setShipperInfoError("");
    setConsigneeError("");

    setShipperFormData((prevData) => ({
      ...prevData,
      waybillNumber: selectedWaybillNumber,
    }));

    setModalFormData((prevData) => ({
      ...prevData,
      waybillNumber: selectedWaybillNumber,
    }));

    if (!selectedWaybillNumber) {
      setShipperFormData({
        waybillNumber: "",
        referenceNumber: "",
        driverName: "",
        plateNo: "",
        shipper: "",
        date: "",
        pickupAddress: "",
        datePrepared: "",
        storeType: "STORE", // Reset storeType to default
      });
      setModalFormData({ waybillNumber: "" });
      setDateRange({ minDate: null, maxDate: null });
      return;
    }

    try {
      const [tripDetailResponse, shipperResponse] = await Promise.all([
        fetch(
          process.env.NEXT_PUBLIC_BACKEND_API +
            `/api/tripDetails?waybillNumber=${selectedWaybillNumber}`
        ),
        fetch(
          process.env.NEXT_PUBLIC_BACKEND_API +
            `/api/shipperInfo?waybillNumber=${selectedWaybillNumber}`
        ),
      ]);

      const tripDetailData = await tripDetailResponse.json();
      const shipperData = await shipperResponse.json();

      console.log("Trip Details Data:", tripDetailData);
      console.log("Shipper Info Data:", shipperData);

      const matchingTripDetail = Array.isArray(tripDetailData)
        ? tripDetailData.find(
            (detail) => detail.waybillNumber === selectedWaybillNumber
          )
        : null;
      const matchingShipperInfo = Array.isArray(shipperData)
        ? shipperData.find(
            (info) => info.waybillNumber === selectedWaybillNumber
          )
        : null;

      // Set isShipperInfoSaved to true if shipper data already exists for this waybill
      if (matchingShipperInfo) {
        setIsShipperInfoSaved(true);
      }

      let tripData = {};
      if (matchingTripDetail && matchingTripDetail.tripID) {
        const tripResponse = await fetch(
          process.env.NEXT_PUBLIC_BACKEND_API +
            `/api/trips?tripID=${matchingTripDetail.tripID}`
        );
        const tripResponseData = await tripResponse.json();
        tripData = tripResponseData.trips || tripResponseData;
        console.log("Trip Data:", tripData);
      }

      const matchingTrip = Array.isArray(tripData)
        ? tripData.find((trip) => trip.tripID === matchingTripDetail?.tripID)
        : tripData;

      // Set date range from trip data
      if (matchingTrip) {
        try {
          // Handle loading date
          const loadingDate = new Date(matchingTrip.loadingDate);

          // Handle arrival date - check if it's a valid date string
          let arrivalDate;
          if (matchingTrip.arrivalDate === "00/00/0000") {
            // If arrival date is not set, use a future date (e.g., 1 year from loading date)
            arrivalDate = new Date(loadingDate);
            arrivalDate.setFullYear(loadingDate.getFullYear() + 1);
          } else {
            // Try to parse the arrival date
            arrivalDate = new Date(matchingTrip.arrivalDate);
          }

          // Validate dates
          if (isNaN(loadingDate.getTime()) || isNaN(arrivalDate.getTime())) {
            throw new Error("Invalid date format");
          }

          // Format dates for the date input fields (YYYY-MM-DD)
          const formatDateForInput = (date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, "0");
            const day = String(date.getDate()).padStart(2, "0");
            return `${year}-${month}-${day}`;
          };

          setDateRange({
            minDate: formatDateForInput(loadingDate),
            maxDate: formatDateForInput(arrivalDate),
          });
        } catch (error) {
          console.error("Error setting date range:", error);
          // Set a default date range if there's an error
          const today = new Date();
          const futureDate = new Date(today);
          futureDate.setFullYear(today.getFullYear() + 1);

          setDateRange({
            minDate: today.toISOString().split("T")[0],
            maxDate: futureDate.toISOString().split("T")[0],
          });
        }
      }

      // Set the shipper form data
      setShipperFormData((prevData) => ({
        ...prevData,
        referenceNumber: matchingTripDetail?.referenceNumber || "",
        driverName:
          matchingShipperInfo?.driverName ||
          matchingTrip?.driver ||
          "Driver Not Found",
        plateNo:
          matchingShipperInfo?.plateNo ||
          matchingTrip?.vehicle ||
          "Plate No Not Found",
        shipper: matchingShipperInfo?.shipper || "",
        date: matchingShipperInfo?.date || "",
        pickupAddress: matchingShipperInfo?.pickupAddress || "",
        datePrepared: matchingShipperInfo?.datePrepared || "",
        storeType: matchingShipperInfo?.storeType || "STORE", // Set storeType from the DB or default to STORE
      }));

      // Check if there's mode information in the shipper data
      if (matchingShipperInfo) {
        const mode = matchingShipperInfo.mode || "company";
        setIsIndividualMode(mode === "individual");

        // If mode is individual, fetch individuals data
        if (mode === "individual") {
          await fetchIndividuals();
        }
      } else {
        // If no shipper info found, default to company mode
        setIsIndividualMode(false);
      }

      // If we have a shipper value, fetch the consignees for this shipper
      if (matchingShipperInfo?.shipper) {
        const shipperCompany = companies.find(
          (company) => company.companyName === matchingShipperInfo.shipper
        );

        if (shipperCompany && shipperCompany._id) {
          try {
            console.log(
              "Fetching consignees for selected shipper:",
              shipperCompany.companyName
            );
            const consigneeResponse = await fetch(
              `${process.env.NEXT_PUBLIC_BACKEND_API}/api/multiple-consignees/byCompany/${shipperCompany._id}`
            );

            if (consigneeResponse.ok) {
              const consigneeData = await consigneeResponse.json();
              console.log(
                "Fetched consignee data from waybill change:",
                consigneeData
              );
              setConsigneeClients(consigneeData);
            } else {
              console.log(
                "No consignees found for this shipper or error occurred"
              );
            }
          } catch (error) {
            console.error("Error fetching consignees for shipper:", error);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching related data:", error);
      setShipperFormData((prevData) => ({
        ...prevData,
        referenceNumber: "",
        driverName: "Driver Not Found",
        plateNo: "Plate No Not Found",
        shipper: "",
        date: "",
        pickupAddress: "",
        datePrepared: "",
        storeType: "STORE", // Reset storeType to default
      }));
      setDateRange({ minDate: null, maxDate: null });
    }
  };

  const handleShipperChangess = async (e) => {
    const { name, value } = e.target;

    // Update shipper form data with the new value
    setShipperFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));

    if (name === "shipperss") {
      const selectedCompany = companies.find(
        (company) => company.companyName === value
      );

      // Store the company's entityAbbreviation if available
      if (selectedCompany && selectedCompany.entityAbbreviation) {
        setShipperEntityAbbreviation(selectedCompany.entityAbbreviation);
      } else {
        setShipperEntityAbbreviation("");
      }

      // Update editFormData for the edit panel
      setEditFormData((prevData) => ({
        ...prevData,
        shipperss: value,
        company: value, // Update company field for saving to the consigneeInfo schema
        shipper: value, // Also update shipper for consistency
      }));

      console.log("Selected company:", selectedCompany);

      // If a company is selected, fetch all consignees that belong to this company
      if (selectedCompany && selectedCompany._id) {
        try {
          // Show loading toast
          const loadingToastId = toast({
            title: "Loading consignees",
            description:
              "Please wait while we fetch consignees for this company",
            status: "loading",
            duration: null,
            isClosable: false,
            position: "top-center",
          });

          // Log the URL for debugging
          const apiUrl = `${process.env.NEXT_PUBLIC_BACKEND_API}/api/multiple-consignees/byCompany/${selectedCompany._id}`;
          console.log("Fetching consignees from:", apiUrl);

          const response = await fetch(apiUrl);
          console.log("Response status:", response.status);

          // Close loading toast
          toast.close(loadingToastId);

          if (response.ok) {
            const consigneeData = await response.json();
            console.log("Fetched consignee data:", consigneeData);

            // Store the consignee data in state
            setConsigneeClients(consigneeData);

            // // Success toast
            // toast({
            //   title: "Consignees loaded",
            //   description: `${consigneeData.length} consignee(s) found for ${selectedCompany.companyName}`,
            //   status: "success",
            //   duration: 3000,
            //   isClosable: true,
            //   position: "top-center",
            // });
          } else {
            // Clear consignees if none found
            setConsigneeClients([]);
            console.error(
              "Failed to fetch consignees. Status:",
              response.status
            );

            // Only show error if it's not a 404 (which means no consignees found)
            if (response.status !== 404) {
              console.error("Failed to fetch consignees for company");
              toast({
                title: "Error",
                description:
                  "Failed to load consignees for the selected company",
                status: "error",
                duration: 3000,
                isClosable: true,
                position: "top-center",
              });
            } else {
              // No consignees found - show info toast
              toast({
                title: "No consignees found",
                description: `No consignees found for ${selectedCompany.companyName}`,
                status: "info",
                duration: 3000,
                isClosable: true,
                position: "top-center",
              });
            }
          }
        } catch (error) {
          console.error("Error fetching consignees:", error);
          // Clear consignees on error
          setConsigneeClients([]);

          toast({
            title: "Error",
            description: "Failed to load consignees for the selected company",
            status: "error",
            duration: 3000,
            isClosable: true,
            position: "top-center",
          });
        }
      } else {
        // Clear consignees if no company selected
        setConsigneeClients([]);
      }
    }

    // When store type changes, update the origin field format
    // (The store type will be displayed separately, so we don't need to modify the origin)
  };
  const handleIndividualChangess = async (e) => {
    const { name, value } = e.target;

    if (name === "shipperss") {
      const selectedIndividual = individuals.find(
        (individual) => individual.individualName === value
      );

      // Update editFormData for the edit panel
      setEditFormData((prevData) => ({
        ...prevData,
        shippers: value,
        company: value, // Update company field for saving to the consigneeInfo schema
        shipper: value, // Also update shipper for consistency
        origin: value,
        pickupAddress: selectedIndividual
          ? selectedIndividual.individualAddress
          : "",
      }));

      console.log("Selected individual:", selectedIndividual);

      // If an individual is selected, fetch all consignees that belong to this individual
      if (selectedIndividual && selectedIndividual._id) {
        try {
          // Show loading toast
          const loadingToastId = toast({
            title: "Loading consignees",
            description:
              "Please wait while we fetch consignees for this individual",
            status: "loading",
            duration: null,
            isClosable: false,
            position: "top-center",
          });

          // Log the URL for debugging
          const apiUrl = `${process.env.NEXT_PUBLIC_BACKEND_API}/api/individual-consignees/individual/${selectedIndividual._id}`;
          console.log("Fetching consignees from:", apiUrl);

          const response = await fetch(apiUrl);
          console.log("Response status:", response.status);

          // Close loading toast
          toast.close(loadingToastId);

          if (response.ok) {
            const consigneeData = await response.json();
            console.log("Fetched individual consignee data:", consigneeData);

            // Transform the individual consignee data to match the format expected by the UI
            const transformedConsigneeData = consigneeData.map((consignee) => ({
              _id: consignee._id,
              consigneeName: consignee.name, // Map name to consigneeName
              consigneeBusinessAddress: consignee.address, // Map address to consigneeBusinessAddress
              tin: consignee.tin,
              consigneeId: consignee.consigneeId,
            }));

            // Store the transformed consignee data in state
            setConsigneeClients(transformedConsigneeData);

            // Success toast
            // toast({
            //   title: "Consignees loaded",
            //   description: `${consigneeData.length} consignee(s) found for ${selectedIndividual.individualName}`,
            //   status: "success",
            //   duration: 3000,
            //   isClosable: true,
            //   position: "top-center",
            // });
          } else {
            // Clear consignees if none found
            setConsigneeClients([]);
            console.error(
              "Failed to fetch consignees. Status:",
              response.status
            );

            // Only show error if it's not a 404 (which means no consignees found)
            if (response.status !== 404) {
              console.error("Failed to fetch consignees for individual");
              toast({
                title: "Error",
                description:
                  "Failed to load consignees for the selected individual",
                status: "error",
                duration: 3000,
                isClosable: true,
                position: "top-center",
              });
            } else {
              // No consignees found - show info toast
              toast({
                title: "No Consignees Found",
                description: `No consignees found for ${selectedIndividual.individualName}`,
                status: "info",
                duration: 3000,
                isClosable: true,
                position: "top-center",
              });
            }
          }
        } catch (error) {
          console.error("Error fetching consignees:", error);
          toast({
            title: "Error",
            description: "Failed to fetch consignees",
            status: "error",
            duration: 3000,
            isClosable: true,
            position: "top-center",
          });
        }
      }
    } else {
      setShipperFormData((prevData) => ({
        ...prevData,
        [name]: value,
      }));
    }
  };
  const handleIndividualChanges = async (e) => {
    const { name, value } = e.target;

    if (name === "shippers") {
      const selectedIndividual = individuals.find(
        (individual) => individual.individualName === value
      );

      // Update the appropriate state based on context
      if (isEditDrawerOpen) {
        // Update editFormData if we're in edit mode
        setEditFormData((prevData) => ({
          ...prevData,
          shippers: value,

          pickupAddress: selectedIndividual
            ? selectedIndividual.individualAddress
            : "",
        }));
      } else {
        // Update shipperFormData for normal mode
        setShipperFormData((prevData) => ({
          ...prevData,
          shippers: value,

          pickupAddress: selectedIndividual
            ? selectedIndividual.individualAddress
            : "",
        }));

        // Also set the origin field in modalFormData
        setModalFormData((prevData) => ({
          ...prevData,
        }));
      }

      console.log("Selected individual:", selectedIndividual);

      // If an individual is selected, fetch all consignees that belong to this individual
      if (selectedIndividual && selectedIndividual._id) {
        try {
          // Show loading toast
          const loadingToastId = toast({
            title: "Loading consignees",
            description:
              "Please wait while we fetch consignees for this individual",
            status: "loading",
            duration: null,
            isClosable: false,
            position: "top-center",
          });

          // Log the URL for debugging
          const apiUrl = `${process.env.NEXT_PUBLIC_BACKEND_API}/api/individual-consignees/individual/${selectedIndividual._id}`;
          console.log("Fetching consignees from:", apiUrl);

          const response = await fetch(apiUrl);
          console.log("Response status:", response.status);

          // Close loading toast
          toast.close(loadingToastId);

          if (response.ok) {
            const consigneeData = await response.json();
            console.log("Fetched individual consignee data:", consigneeData);

            // Transform the individual consignee data to match the format expected by the UI
            const transformedConsigneeData = consigneeData.map((consignee) => ({
              _id: consignee._id,
              consigneeName: consignee.name, // Map name to consigneeName
              consigneeBusinessAddress: consignee.address, // Map address to consigneeBusinessAddress
              tin: consignee.tin,
              consigneeId: consignee.consigneeId,
            }));

            // Store the transformed consignee data in state
            setConsigneeClients(transformedConsigneeData);

            // Success toast
            // toast({
            //   title: "Consignees loaded",
            //   description: `${consigneeData.length} consignee(s) found for ${selectedIndividual.individualName}`,
            //   status: "success",
            //   duration: 3000,
            //   isClosable: true,
            //   position: "top-center",
            // });
          } else {
            // Clear consignees if none found
            setConsigneeClients([]);
            console.error(
              "Failed to fetch consignees. Status:",
              response.status
            );

            // Only show error if it's not a 404 (which means no consignees found)
            if (response.status !== 404) {
              console.error("Failed to fetch consignees for individual");
              toast({
                title: "Error",
                description:
                  "Failed to load consignees for the selected individual",
                status: "error",
                duration: 3000,
                isClosable: true,
                position: "top-center",
              });
            } else {
              // No consignees found - show info toast
              toast({
                title: "No Consignees Found",
                description: `No consignees found for ${selectedIndividual.individualName}`,
                status: "info",
                duration: 3000,
                isClosable: true,
                position: "top-center",
              });
            }
          }
        } catch (error) {
          console.error("Error fetching consignees:", error);
          toast({
            title: "Error",
            description: "Failed to fetch consignees",
            status: "error",
            duration: 3000,
            isClosable: true,
            position: "top-center",
          });
        }
      }
    } else {
      setShipperFormData((prevData) => ({
        ...prevData,
        [name]: value,
      }));
    }
  };
  const handleIndividualChange = async (e) => {
    const { name, value } = e.target;

    if (name === "shipper") {
      const selectedIndividual = individuals.find(
        (individual) => individual.individualName === value
      );

      setShipperFormData((prevData) => ({
        ...prevData,
        shipper: value,
        pickupAddress: selectedIndividual
          ? selectedIndividual.individualAddress
          : "",
      }));

      // Also set the origin field in modalFormData
      setModalFormData((prevData) => ({
        ...prevData,
        origin: value,
      }));

      console.log("Selected individual:", selectedIndividual);

      // If an individual is selected, fetch all consignees that belong to this individual
      if (selectedIndividual && selectedIndividual._id) {
        try {
          // Show loading toast
          const loadingToastId = toast({
            title: "Loading consignees",
            description:
              "Please wait while we fetch consignees for this individual",
            status: "loading",
            duration: null,
            isClosable: false,
            position: "top-center",
          });

          // Log the URL for debugging
          const apiUrl = `${process.env.NEXT_PUBLIC_BACKEND_API}/api/individual-consignees/individual/${selectedIndividual._id}`;
          console.log("Fetching consignees from:", apiUrl);

          const response = await fetch(apiUrl);
          console.log("Response status:", response.status);

          // Close loading toast
          toast.close(loadingToastId);

          if (response.ok) {
            const consigneeData = await response.json();
            console.log("Fetched individual consignee data:", consigneeData);

            // Transform the individual consignee data to match the format expected by the UI
            const transformedConsigneeData = consigneeData.map((consignee) => ({
              _id: consignee._id,
              consigneeName: consignee.name, // Map name to consigneeName
              consigneeBusinessAddress: consignee.address, // Map address to consigneeBusinessAddress
              tin: consignee.tin,
              consigneeId: consignee.consigneeId,
            }));

            // Store the transformed consignee data in state
            setConsigneeClients(transformedConsigneeData);

            // Success toast
            // toast({
            //   title: "Consignees loaded",
            //   description: `${consigneeData.length} consignee(s) found for ${selectedIndividual.individualName}`,
            //   status: "success",
            //   duration: 3000,
            //   isClosable: true,
            //   position: "top-center",
            // });
          } else {
            // Clear consignees if none found
            setConsigneeClients([]);
            console.error(
              "Failed to fetch consignees. Status:",
              response.status
            );

            // Only show error if it's not a 404 (which means no consignees found)
            if (response.status !== 404) {
              console.error("Failed to fetch consignees for individual");
              toast({
                title: "Error",
                description:
                  "Failed to load consignees for the selected individual",
                status: "error",
                duration: 3000,
                isClosable: true,
                position: "top-center",
              });
            } else {
              // No consignees found - show info toast
              toast({
                title: "No Consignees Found",
                description: `No consignees found for ${selectedIndividual.individualName}`,
                status: "info",
                duration: 3000,
                isClosable: true,
                position: "top-center",
              });
            }
          }
        } catch (error) {
          console.error("Error fetching consignees:", error);
          toast({
            title: "Error",
            description: "Failed to fetch consignees",
            status: "error",
            duration: 3000,
            isClosable: true,
            position: "top-center",
          });
        }
      }
    } else {
      setShipperFormData((prevData) => ({
        ...prevData,
        [name]: value,
      }));
    }
  };
  const fetchIndividuals = async () => {
    try {
      const response = await fetch(
        process.env.NEXT_PUBLIC_BACKEND_API + "/api/individuals"
      );
      const data = await response.json();
      setIndividuals(data);
      return data;
    } catch (error) {
      console.error("Error fetching individuals:", error);
      toast({
        title: "Error",
        description: "Failed to fetch individuals",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return [];
    }
  };

  // Add a function to toggle individual mode
  const toggleIndividualMode = async () => {
    try {
      const newMode = !isIndividualMode;
      setIsIndividualMode(newMode);

      // If turning on individual mode
      if (newMode) {
        // Clear any existing entity abbreviation
        setShipperEntityAbbreviation("");

        // Fetch the individuals
        await fetchIndividuals();
        toast({
          title: "Individual Mode Activated",
          description: "You can now select individuals as shippers.",
          status: "info",
          duration: 3000,
          isClosable: true,
        });

        // If a waybill number exists and shipper info has been saved,
        // update the mode on the server
        if (
          modalFormData.waybillNumber &&
          isShipperInfoSaved &&
          shipperFormData.shipper
        ) {
          try {
            const response = await fetch(
              `${process.env.NEXT_PUBLIC_BACKEND_API}/api/shipperInfo`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  waybillNumber: modalFormData.waybillNumber,
                  mode: "individual",
                }),
              }
            );

            if (!response.ok) {
              console.error("Failed to update mode on server");
            }
          } catch (error) {
            console.error("Error updating mode:", error);
          }
        }
      } else {
        // Only reset shipper-related fields when switching back to company mode,
        // but preserve driverName and plateNo
        setShipperFormData((prevData) => ({
          ...prevData,
          shipper: "",
          shippers: "",
          pickupAddress: "",
          storeType: "STORE",
          // Keep driverName and plateNo from previous state
        }));

        toast({
          title: "Company Mode Activated",
          description: "You can now select companies as shippers.",
          status: "info",
          duration: 3000,
          isClosable: true,
        });

        // If a waybill number exists and shipper info has been saved,
        // update the mode on the server
        if (
          modalFormData.waybillNumber &&
          isShipperInfoSaved &&
          shipperFormData.shipper
        ) {
          try {
            const response = await fetch(
              `${process.env.NEXT_PUBLIC_BACKEND_API}/api/shipperInfo`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  waybillNumber: modalFormData.waybillNumber,
                  mode: "company",
                }),
              }
            );

            if (!response.ok) {
              console.error("Failed to update mode on server");
            }
          } catch (error) {
            console.error("Error updating mode:", error);
          }
        }
      }
    } catch (error) {
      console.error("Error toggling individual mode:", error);
      toast({
        title: "Error",
        description: "Failed to toggle individual mode.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  // Add handler for custom total CBM input
  const handleCustomTotalCbmChange = (e) => {
    const value = parseFloat(e.target.value) || 0;
    setCustomTotalCbm(value);

    // Recalculate percentage when total custom CBM changes
    if (value > 0) {
      const cbm = parseFloat(editFormData.cbm) || 0;
      const calculatedPercentage = (cbm / value) * 100;

      setEditFormData({
        ...editFormData,
        percentage: calculatedPercentage.toFixed(2),
      });
    }
  };
  const handleShipperChanges = async (e) => {
    const { name, value } = e.target;

    // Update shipper form data with the new value
    setShipperFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));

    if (name === "shippers") {
      const selectedCompany = companies.find(
        (company) => company.companyName === value
      );

      // Store the company's entityAbbreviation if available
      if (
        selectedCompany &&
        selectedCompany.entityAbbreviation &&
        !isIndividualMode
      ) {
        setShipperEntityAbbreviation(selectedCompany.entityAbbreviation);

        // Removed automatic formatting of consignee when shipper changes
        // We only want to apply the entity abbreviation when a selection is made
      } else {
        setShipperEntityAbbreviation("");
      }

      setShipperFormData((prevData) => ({
        ...prevData,
        shippers: value,
      }));

      // Set just the shipper name in the origin field
      setModalFormData((prevData) => ({
        ...prevData,
      }));

      console.log("Selected company:", selectedCompany);

      // If a company is selected, fetch all consignees that belong to this company
      if (selectedCompany && selectedCompany._id) {
        try {
          // Show loading toast
          const loadingToastId = toast({
            title: "Loading consignees",
            description:
              "Please wait while we fetch consignees for this company",
            status: "loading",
            duration: null,
            isClosable: false,
            position: "top-center",
          });

          // Log the URL for debugging
          const apiUrl = `${process.env.NEXT_PUBLIC_BACKEND_API}/api/multiple-consignees/byCompany/${selectedCompany._id}`;
          console.log("Fetching consignees from:", apiUrl);

          const response = await fetch(apiUrl);
          console.log("Response status:", response.status);

          // Close loading toast
          toast.close(loadingToastId);

          if (response.ok) {
            const consigneeData = await response.json();
            console.log("Fetched consignee data:", consigneeData);

            // Store the consignee data in state
            setConsigneeClients(consigneeData);

            // Success toast
            // toast({
            //   title: "Consignees loaded",
            //   description: `${consigneeData.length} consignee(s) found for ${selectedCompany.companyName}`,
            //   status: "success",
            //   duration: 3000,
            //   isClosable: true,
            //   position: "top-center",
            // });
          } else {
            // Clear consignees if none found
            setConsigneeClients([]);
            console.error(
              "Failed to fetch consignees. Status:",
              response.status
            );

            // Only show error if it's not a 404 (which means no consignees found)
            if (response.status !== 404) {
              console.error("Failed to fetch consignees for company");
              toast({
                title: "Error",
                description:
                  "Failed to load consignees for the selected company",
                status: "error",
                duration: 3000,
                isClosable: true,
                position: "top-center",
              });
            } else {
              // No consignees found - show info toast
              toast({
                title: "No consignees found",
                description: `No consignees found for ${selectedCompany.companyName}`,
                status: "info",
                duration: 3000,
                isClosable: true,
                position: "top-center",
              });
            }
          }
        } catch (error) {
          console.error("Error fetching consignees:", error);
          // Clear consignees on error
          setConsigneeClients([]);

          toast({
            title: "Error",
            description: "Failed to load consignees for the selected company",
            status: "error",
            duration: 3000,
            isClosable: true,
            position: "top-center",
          });
        }
      } else {
        // Clear consignees if no company selected
        setConsigneeClients([]);
      }
    }

    // When store type changes, update the origin field format
    // (The store type will be displayed separately, so we don't need to modify the origin)
  };
  const handleShipperChange = async (e) => {
    const { name, value } = e.target;

    // Update shipper form data with the new value
    setShipperFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));

    if (name === "shipper") {
      const selectedCompany = companies.find(
        (company) => company.companyName === value
      );

      // Store the company's entityAbbreviation if available
      if (
        selectedCompany &&
        selectedCompany.entityAbbreviation &&
        !isIndividualMode
      ) {
        setShipperEntityAbbreviation(selectedCompany.entityAbbreviation);

        // Removed automatic formatting of consignee when shipper changes
        // We only want to apply the entity abbreviation when a selection is made
      } else {
        setShipperEntityAbbreviation("");
      }

      setShipperFormData((prevData) => ({
        ...prevData,
        shipper: value,
        pickupAddress: selectedCompany ? selectedCompany.businessAddress : "",
      }));

      // Set just the shipper name in the origin field
      setModalFormData((prevData) => ({
        ...prevData,
        origin: value,
      }));

      console.log("Selected company:", selectedCompany);

      // If a company is selected, fetch all consignees that belong to this company
      if (selectedCompany && selectedCompany._id) {
        try {
          // Show loading toast
          const loadingToastId = toast({
            title: "Loading consignees",
            description:
              "Please wait while we fetch consignees for this company",
            status: "loading",
            duration: null,
            isClosable: false,
            position: "top-center",
          });

          // Log the URL for debugging
          const apiUrl = `${process.env.NEXT_PUBLIC_BACKEND_API}/api/multiple-consignees/byCompany/${selectedCompany._id}`;
          console.log("Fetching consignees from:", apiUrl);

          const response = await fetch(apiUrl);
          console.log("Response status:", response.status);

          // Close loading toast
          toast.close(loadingToastId);

          if (response.ok) {
            const consigneeData = await response.json();
            console.log("Fetched consignee data:", consigneeData);

            // Store the consignee data in state
            setConsigneeClients(consigneeData);

            // Success toast
            // toast({
            //   title: "Consignees loaded",
            //   description: `${consigneeData.length} consignee(s) found for ${selectedCompany.companyName}`,
            //   status: "success",
            //   duration: 3000,
            //   isClosable: true,
            //   position: "top-center",
            // });
          } else {
            // Clear consignees if none found
            setConsigneeClients([]);
            console.error(
              "Failed to fetch consignees. Status:",
              response.status
            );

            // Only show error if it's not a 404 (which means no consignees found)
            if (response.status !== 404) {
              console.error("Failed to fetch consignees for company");
              toast({
                title: "Error",
                description:
                  "Failed to load consignees for the selected company",
                status: "error",
                duration: 3000,
                isClosable: true,
                position: "top-center",
              });
            } else {
              // No consignees found - show info toast
              toast({
                title: "No consignees found",
                description: `No consignees found for ${selectedCompany.companyName}`,
                status: "info",
                duration: 3000,
                isClosable: true,
                position: "top-center",
              });
            }
          }
        } catch (error) {
          console.error("Error fetching consignees:", error);
          // Clear consignees on error
          setConsigneeClients([]);

          toast({
            title: "Error",
            description: "Failed to load consignees for the selected company",
            status: "error",
            duration: 3000,
            isClosable: true,
            position: "top-center",
          });
        }
      } else {
        // Clear consignees if no company selected
        setConsigneeClients([]);
      }
    }

    // When store type changes, update the origin field format
    // (The store type will be displayed separately, so we don't need to modify the origin)
  };
  const [entityTotals, setEntityTotals] = useState({
    consigneeTotals: {},
    subDetailTotals: {},
  });

  // Function to round all entity percentages to whole numbers
  const roundEntityPercentages = async () => {
    try {
      console.log("Starting percentage rounding process");
      setIsUpdatingAmounts(true);

      // First round entity totals
      let updatedEntityTotals = JSON.parse(JSON.stringify(entityTotals));
      let anyRounded = false;

      // Process entity totals to round percentages
      Object.keys(updatedEntityTotals.consigneeTotals).forEach((entityKey) => {
        const entityData = updatedEntityTotals.consigneeTotals[entityKey];

        // Round the entity total percentage
        if (!Number.isInteger(entityData.totalPercentage)) {
          entityData.totalPercentage = Math.round(entityData.totalPercentage);
          anyRounded = true;
        }

        // Set the status to "rounded" for tracking
        entityData.status = "rounded";

        // Also update in subDetailTotals for consistency
        if (updatedEntityTotals.subDetailTotals[entityKey]) {
          updatedEntityTotals.subDetailTotals[entityKey].totalPercentage =
            entityData.totalPercentage;
          updatedEntityTotals.subDetailTotals[entityKey].status = "rounded";
        }
      });

      if (!anyRounded) {
        console.log(
          "No rounding needed - all percentages already whole numbers"
        );
        setIsUpdatingAmounts(false);
        return;
      }

      // Update the UI
      setEntityTotals(updatedEntityTotals);

      // Save the updated entity totals to the database
      await saveRoundedTotals();

      // Update the status of all entities to "rounded" in the database
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_API}/api/entity-abbreviation-summary/waybill/${selectedWaybill}/status`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ status: "rounded" }),
          }
        );

        if (!response.ok) {
          throw new Error("Failed to update entity status to rounded");
        }

        console.log("Successfully updated all entities to 'rounded' status");
      } catch (statusError) {
        console.error("Error updating entity status:", statusError);
      }

      toast({
        title: "Success",
        description: "Percentages have been rounded and status updated",
        status: "success",
        duration: 3000,
        isClosable: true,
        position: "top-center",
      });
    } catch (error) {
      console.error("Error rounding percentages:", error);
      toast({
        title: "Error",
        description: "Failed to round percentages",
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "top-center",
      });
    } finally {
      setIsUpdatingAmounts(false);
    }
  };

  // Update the saveRoundedTotals function to use individual entity updates
  const saveRoundedTotals = async () => {
    try {
      console.log(
        "Saving rounded entity totals individually to prevent issues"
      );

      // Convert entityTotals to array format for the API
      const summariesToSave = Object.entries(entityTotals.consigneeTotals).map(
        ([entityAbbreviation, data]) => ({
          waybillNumber: selectedWaybill,
          entityAbbreviation,
          totalAmount: Number(data.totalAmount.toFixed(2)),
          totalPercentage: Number(data.totalPercentage.toFixed(0)), // Store as whole number
          status: "rounded", // Set status to rounded
        })
      );

      // Save each entity individually instead of deleting all first
      if (summariesToSave.length > 0) {
        for (const summary of summariesToSave) {
          try {
            // Use the individual entity endpoint
            const response = await fetch(
              `${process.env.NEXT_PUBLIC_BACKEND_API}/api/entity-abbreviation-summary`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(summary),
              }
            );

            if (!response.ok) {
              console.warn(
                `Warning: Failed to save rounded entity ${summary.entityAbbreviation}`
              );
            } else {
              console.log(
                `Successfully saved rounded entity ${summary.entityAbbreviation}`
              );
            }
          } catch (entityError) {
            console.error(
              `Error saving rounded entity ${summary.entityAbbreviation}:`,
              entityError
            );
          }
        }

        console.log("Successfully saved all rounded entity totals");
      }
    } catch (error) {
      console.error("Error saving rounded totals:", error);
      throw error;
    }
  };

  // Helper function to update waybill summary
  const updateWaybillSummary = async (
    waybillNumber,
    totalPercentage,
    totalAmount
  ) => {
    try {
      // First get existing summary data
      const summaryResponse = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/waybillSummary/waybill/${waybillNumber}`
      );

      if (summaryResponse.ok) {
        const summaryData = await summaryResponse.json();

        // Update with new totals
        const updateResponse = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_API}/api/waybillSummary/waybill/${waybillNumber}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              ...summaryData,
              totalPercentage: `${totalPercentage}%`,
              totalCost: totalAmount,
            }),
          }
        );

        if (!updateResponse.ok) {
          console.warn("Failed to update waybill summary with new totals");
        }
      }
    } catch (error) {
      console.warn("Error updating waybill summary:", error);
    }
  };

  useEffect(() => {
    const fetchTotals = async () => {
      if (selectedWaybill) {
        try {
          // Set loading state
          setIsUpdatingAmounts(true);

          // Calculate totals first to ensure we have the most accurate data
          const calculatedTotals = await calculateTotalsByEntityAbbreviation(
            consignees,
            selectedWaybill
          );

          let finalTotals = calculatedTotals;
          let overallTotalPercentage = 0;
          let overallTotalAmount = 0;

          // Try to get data from the database as a fallback or to compare
          try {
            const response = await fetch(
              `${process.env.NEXT_PUBLIC_BACKEND_API}/api/entity-abbreviation-summary/waybill/${selectedWaybill}`
            );

            if (response.ok) {
              const summariesFromDb = await response.json();

              // If we have data from the database, use it but add items from calculated data
              if (summariesFromDb && summariesFromDb.length > 0) {
                const consigneeTotals = {};
                const subDetailTotals = {};
                const masterTotals = {};

                // Process each entity's data from DB
                summariesFromDb.forEach((summary) => {
                  const entityAbbr = summary.entityAbbreviation;
                  overallTotalPercentage += summary.totalPercentage;
                  overallTotalAmount += summary.totalAmount;

                  // Get the items from the calculated data
                  const calculatedItems =
                    calculatedTotals.masterTotals[entityAbbr]?.items || {};

                  // Store the percentage value - check if it's already a whole number
                  const percentageValue = Number.isInteger(
                    summary.totalPercentage
                  )
                    ? summary.totalPercentage
                    : summary.totalPercentage;

                  // Create master totals entry
                  masterTotals[entityAbbr] = {
                    totalAmount: summary.totalAmount,
                    totalPercentage: percentageValue,
                    count: Object.keys(calculatedItems).length,
                    items: calculatedItems, // Use calculated items for display
                  };

                  // Create entries for the UI format
                  consigneeTotals[entityAbbr] = {
                    totalAmount: summary.totalAmount,
                    totalPercentage: percentageValue,
                    count: Object.keys(calculatedItems).length,
                    items: calculatedItems, // Use calculated items for display
                    type: "consignee",
                  };

                  subDetailTotals[entityAbbr] = {
                    totalAmount: summary.totalAmount,
                    totalPercentage: percentageValue,
                    count: Object.keys(calculatedItems).length,
                    items: calculatedItems, // Use calculated items for display
                    type: "subDetail",
                    consignees: {},
                  };
                });

                finalTotals = {
                  consigneeTotals,
                  subDetailTotals,
                  masterTotals,
                };
              }
            }
          } catch (dbError) {
            console.warn(
              "Error fetching from database, using calculated totals:",
              dbError
            );
            // Continue with calculated totals
          }

          // Update UI totals
          setTotalPercentage(
            overallTotalPercentage ||
              Object.values(calculatedTotals.consigneeTotals).reduce(
                (sum, entity) => sum + entity.totalPercentage,
                0
              )
          );

          setTotalAmount(
            overallTotalAmount ||
              Object.values(calculatedTotals.consigneeTotals).reduce(
                (sum, entity) => sum + entity.totalAmount,
                0
              )
          );

          // Set the entity totals for UI display
          setEntityTotals(finalTotals);

          // Ensure waybill summary is in sync
          try {
            // Get total percentage for waybill summary
            const totalPerc =
              overallTotalPercentage ||
              Object.values(calculatedTotals.consigneeTotals).reduce(
                (sum, entity) => sum + entity.totalPercentage,
                0
              );

            const totalAmt =
              overallTotalAmount ||
              Object.values(calculatedTotals.consigneeTotals).reduce(
                (sum, entity) => sum + entity.totalAmount,
                0
              );

            // Update waybill summary to keep everything in sync
            updateWaybillSummary(selectedWaybill, totalPerc, totalAmt);
          } catch (syncError) {
            console.warn("Error syncing waybill summary:", syncError);
          }
        } catch (error) {
          console.error("Error calculating totals:", error);
          // Initialize with empty objects if there's an error
          setEntityTotals({
            consigneeTotals: {},
            subDetailTotals: {},
          });
        } finally {
          // Clear loading state
          setIsUpdatingAmounts(false);
        }
      }
    };

    fetchTotals();
  }, [selectedWaybill, consignees]);

  // Add useEffect to set origin when component mounts
  useEffect(() => {
    if (shipperFormData.shipper) {
      setModalFormData((prevData) => ({
        ...prevData,
        origin: shipperFormData.shipper,
      }));
    }
  }, [shipperFormData.shipper]);

  // Add new useEffect to initialize entityAbbreviation from existing shipper
  useEffect(() => {
    // Only run if shipper is already set (like when loading an existing record)
    if (
      shipperFormData.shipper &&
      companies &&
      companies.length > 0 &&
      !isIndividualMode
    ) {
      const existingCompany = companies.find(
        (company) => company.companyName === shipperFormData.shipper
      );

      if (existingCompany && existingCompany.entityAbbreviation) {
        // Set the abbreviation
        setShipperEntityAbbreviation(existingCompany.entityAbbreviation);

        // Apply to existing consignee if one exists
        if (modalFormData.consignee) {
          // Use the consignee name as-is without cleaning, preserving any entity abbreviation
          const consigneeNameToUse = modalFormData.consignee;

          // Add abbreviation only if it doesn't already have one
          if (!consigneeNameToUse.includes(" - ")) {
            const formattedConsigneeName = `${existingCompany.entityAbbreviation} - ${consigneeNameToUse}`;

            // Update the consignee field with the newly formatted name
            setModalFormData((prev) => ({
              ...prev,
              consignee: formattedConsigneeName,
            }));
          }
        }
      }
    } else if (isIndividualMode) {
      // Clear the entity abbreviation when in individual mode
      setShipperEntityAbbreviation("");
    }
    // Only depend on companies and shipperFormData.shipper to prevent infinite loops
  }, [companies, shipperFormData.shipper, isIndividualMode]);

  // Modify the handleDateChange function to handle both formats
  const handleDateChange = (e) => {
    const { name, value } = e.target;

    // If no value is selected, set to null
    if (!value) {
      setShipperFormData((prevData) => ({
        ...prevData,
        [name]: null,
      }));
      return;
    }

    const selectedDate = new Date(value);

    // Validate the date
    if (isNaN(selectedDate.getTime())) {
      console.error("Invalid date:", value);
      return;
    }

    // Convert the selected date to ISO format for storage
    const isoDate = selectedDate.toISOString();

    setShipperFormData((prevData) => ({
      ...prevData,
      [name]: isoDate,
      // Only set datePrepared when date field changes
      ...(name === "date" && { datePrepared: isoDate }),
    }));

    // Reset isShipperInfoSaved when date changes
    setIsShipperInfoSaved(false);
  };

  // Save Shipper Information
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
        referenceNumber: "Reference Number",
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
        totalTruckCbm: shipperFormData.totalTruckCbm || truckCbm, // Include totalTruckCbm in the data
        dropType: "multiple drops", // Set the default dropType for regular shipper info
      };

      const response = await fetch(
        process.env.NEXT_PUBLIC_BACKEND_API + "/api/shipperInfo",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formattedData),
        }
      );

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Failed to save shipper info: ${errorData}`);
      }

      const data = await response.json();

      // Set isShipperInfoSaved to true
      setIsShipperInfoSaved(true);

      // Update modalFormData with just the shipper name
      const shipper = shipperFormData.shipper || "";
      if (shipper) {
        setModalFormData((prevData) => ({
          ...prevData,
          origin: shipper,
        }));
      }

      // Update truckCbm with the saved value if it exists
      if (formattedData.totalTruckCbm) {
        setTruckCbm(formattedData.totalTruckCbm);
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

  // Function to check the shipper mode (individual or company)
  const checkShipperMode = async (waybillNumber) => {
    try {
      // Fetch shipper info for this waybill number
      const response = await fetch(
        process.env.NEXT_PUBLIC_BACKEND_API +
          `/api/shipperInfo/${waybillNumber}`
      );

      if (!response.ok) {
        if (response.status === 404) {
          // No shipper info found, default to company mode
          return "company";
        }
        throw new Error(`Error fetching shipper info: ${response.statusText}`);
      }

      const data = await response.json();
      return data.mode || "company"; // Default to company if mode is not set
    } catch (error) {
      console.error("Error checking shipper mode:", error);
      return "company"; // Default to company mode on error
    }
  };

  // Function to fetch truck CBM
  const fetchTruckCbm = async (plateNumber, skipIfShipperInfoHasCbm = true) => {
    try {
      // If skipIfShipperInfoHasCbm is true, first check if shipperInfo has a totalTruckCbm
      if (skipIfShipperInfoHasCbm && waybillNumber) {
        const shipperInfoData = await fetchShipperInfo(waybillNumber, false);

        // If shipperInfo exists and has totalTruckCbm, use that value instead of fetching from Truck.js
        if (shipperInfoData && shipperInfoData.totalTruckCbm) {
          console.log(
            "Using CBM from shipperInfo:",
            shipperInfoData.totalTruckCbm
          );
          setTruckCbm(shipperInfoData.totalTruckCbm);
          setTotalCbmInput(shipperInfoData.totalTruckCbm);
          // Update all subdetails with the totalTruckCbm from shipperInfo
          const updatedSubDetails = subDetails.map((detail) => ({
            ...detail,
            totalCbm: shipperInfoData.totalTruckCbm,
          }));
          setSubDetails(updatedSubDetails);
          return; // Skip fetching from Truck.js
        }
      }

      // Only fetch from Truck.js if we didn't get CBM from shipperInfo
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/trucks/cbm/${plateNumber}`
      );
      const data = await response.json();
      setTruckCbm(data.cbm);
      setTotalCbmInput(data.cbm);
      // Update all subdetails with the new total CBM
      const updatedSubDetails = subDetails.map((detail) => ({
        ...detail,
        totalCbm: data.cbm,
      }));
      setSubDetails(updatedSubDetails);
    } catch (error) {
      console.error("Error fetching truck CBM:", error);
    }
  };

  // Watch for changes in shipperFormData.plateNo
  useEffect(() => {
    if (shipperFormData?.plateNo) {
      fetchTruckCbm(shipperFormData.plateNo, true); // Pass true to skip Truck.js if shipperInfo has CBM
    }
  }, [shipperFormData?.plateNo]);

  // Handle totalTruckCbm changes
  const handleTotalTruckCbmChange = (e) => {
    const value = e.target.value;
    setTruckCbm(value); // Update the truckCbm state
    setShipperFormData((prev) => ({
      ...prev,
      totalTruckCbm: value,
    }));
  };

  // Add this function after the other utility functions
  const checkConsigneeExists = (waybillNumber, consigneeName) => {
    return consignees.some(
      (c) =>
        c.waybillNumber === waybillNumber &&
        c.consignee === consigneeName &&
        !isEditMode
    );
  };

  // Modify the rate input in the drawer
  const handleRateChange = (e) => {
    const value = e.target.value;

    setModalFormData((prev) => ({
      ...prev,
      rate: value === "" ? 0 : value,
    }));

    // Update subDetails with the new rate
    setSubDetails((prev) =>
      prev.map((detail) => ({
        ...detail,
        rate: value === "" ? 0 : value,
      }))
    );
  };

  // Add this state for temporary CBM input
  const [tempInputCbm, setTempInputCbm] = useState(0);

  // Add this state for tracking current input CBM
  const [currentInputCbm, setCurrentInputCbm] = useState(0);

  // Modify handleModalChange to update remaining CBM for Store
  const handleModalChange = async (e) => {
    const { name, value } = e.target;

    // Handle date validation
    if (name === "date") {
      const dateReceived = new Date(value);
      const datePrepared = new Date(shipperFormData.datePrepared);

      // Add one day to datePrepared to get the minimum allowed date
      const minAllowedDate = new Date(datePrepared);
      minAllowedDate.setDate(minAllowedDate.getDate() + 1);

      // Check if date is valid
      if (isNaN(dateReceived.getTime())) {
        toast({
          title: "Invalid Date",
          description: "Please select a valid date",
          status: "error",
          duration: 3000,
          isClosable: true,
          position: "top-center",
        });
        return;
      }

      // Check if date received is before or equal to date prepared

      // If it's future date after datePrepared, update the form
      setModalFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
      return;
    }

    // Update the form data for other fields
    setModalFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // If CBM changes, check if rate is set first
    if (name === "cbm") {
      const rateValue = parseFloat(modalFormData.rate) || 0;
      if (rateValue <= 0) {
        toast({
          title: "Rate Required",
          description: "Please set a rate before entering CBM",
          status: "warning",
          duration: 3000,
          isClosable: true,
          position: "top-center",
        });

        // Reset CBM to empty
        setModalFormData((prev) => ({
          ...prev,
          cbm: "",
        }));
        return;
      }

      const inputCbm = parseFloat(value) || 0;
      setCurrentInputCbm(inputCbm);

      // Always use truckCbm for percentage calculations
      const totalCbmToUse = truckCbm || totalCbmInput;

      if (totalCbmToUse > 0) {
        let percentage = roundToTwo((inputCbm / totalCbmToUse) * 100);

        // If the input CBM is very close to or equal to the total truck CBM, set percentage to 100%
        if (
          areNumbersEqual(inputCbm, totalCbmToUse, 0.01) ||
          inputCbm >= totalCbmToUse
        ) {
          percentage = 100;
        }

        const amount = roundToTwo((rateValue * percentage) / 100);

        setModalFormData((prev) => ({
          ...prev,
          percentage: percentage.toString(),
          amount: amount.toString(),
        }));
      }
    }

    // Any type changes (DC/Store toggle)
    if (name === "type") {
      // Set the current store type from the dropdown
      setStoreType(value);
      setIsDcMode(value === "DC");

      // Update the type in the form data
      setModalFormData((prev) => ({
        ...prev,
        type: value,
      }));

      // Show sub details section if a consignee is selected
      if (modalFormData.consignee) {
        setShowSubDetails(true);

        // Initialize sub details if it's a DC
        if (value === "DC") {
          setSubDetails([]);
        }
      }
    }
  };

  // Modify handleSubDetailChange to update remaining CBM for DC
  const handleSubDetailChange = (index, field, value) => {
    const newSubDetails = [...subDetails];

    if (field === "entityAbbreviation" && !isIndividualMode) {
      // Store the selected abbreviation for this index
      setSelectedEntityAbbreviations((prev) => ({
        ...prev,
        [index]: value,
      }));

      // If there's a storeName already, format it with the abbreviation
      if (newSubDetails[index].storeName) {
        // Extract the pure store name (remove any existing prefix)
        let pureName = newSubDetails[index].storeName;
        if (pureName.includes(" - ")) {
          pureName = pureName.split(" - ").pop();
        }

        // Format with new entity abbreviation
        newSubDetails[index].storeName = value
          ? `${value} - ${pureName}`
          : pureName;
      }

      setSubDetails(newSubDetails);
      return;
    }

    // Special handling for storeName field when using the regular input
    if (
      field === "storeName" &&
      selectedEntityAbbreviations[index] &&
      !isIndividualMode
    ) {
      // Format the store name with the selected abbreviation
      const pureName = value;
      value = `${selectedEntityAbbreviations[index]} - ${pureName}`;
    }

    newSubDetails[index] = {
      ...newSubDetails[index],
      [field]: value,
    };

    // If CBM changes, check if rate is set
    if (field === "cbm") {
      const rateValue = parseFloat(modalFormData.rate) || 0;
      if (rateValue <= 0) {
        toast({
          title: "Rate Required",
          description: "Please set a rate before entering CBM",
          status: "warning",
          duration: 3000,
          isClosable: true,
          position: "top-center",
        });
        return; // Exit the function if no rate is set
      }

      const totalSubDetailsCbm = newSubDetails.reduce(
        (total, detail) => total + (parseFloat(detail.cbm) || 0),
        0
      );
      setCurrentInputCbm(roundToTwo(totalSubDetailsCbm));

      // Always use truckCbm for percentage calculations
      const totalCbmToUse = truckCbm || totalCbmInput;
      const cbmValue = parseFloat(value) || 0;

      if (totalCbmToUse > 0) {
        let percentage = roundToTwo((cbmValue / totalCbmToUse) * 100);
        newSubDetails[index].percentage = percentage.toString();

        // Calculate amount based on the new percentage
        const amount = roundToTwo((rateValue * percentage) / 100);
        newSubDetails[index].amount = amount.toString();
      }
    }

    // If percentage changes, recalculate amount based on rate
    if (field === "percentage") {
      const rateValue = parseFloat(modalFormData.rate) || 0;
      const percentageValue = parseFloat(value) || 0;
      const amount = roundToTwo((rateValue * percentageValue) / 100);
      newSubDetails[index].amount = amount.toString();
    }

    setSubDetails(newSubDetails);

    // Calculate totals after updating sub-details
    const totals = newSubDetails.reduce(
      (acc, curr) => ({
        cbm: roundToTwo(acc.cbm + (parseFloat(curr.cbm) || 0)),
        percentage: roundToTwo(
          acc.percentage + (parseFloat(curr.percentage) || 0)
        ),
        amount: roundToTwo(acc.amount + (parseFloat(curr.amount) || 0)),
        additionals: roundToTwo(
          acc.additionals + (parseFloat(curr.additionals) || 0)
        ),
      }),
      { cbm: 0, percentage: 0, amount: 0, additionals: 0 }
    );

    // Check if the total CBM is very close to or equal to the truck's capacity
    const totalCbmToUse = truckCbm || totalCbmInput;
    if (totalCbmToUse > 0 && areNumbersEqual(totals.cbm, totalCbmToUse, 0.01)) {
      totals.percentage = 100;
    }

    // Update totals in state
    setTotalCbm(totals.cbm);
    setTotalPercentage(totals.percentage);
    setTotalAmount(totals.amount);
    setTotalAdditionals(totals.additionals);
  };

  // Calculate remaining CBM
  const calculateRemainingCbm = () => {
    // If customTotalCbm is set, only consider subdetails in the current form
    if (customTotalCbm > 0) {
      return roundToTwo(customTotalCbm - currentInputCbm);
    }

    // Otherwise use the truck CBM or input CBM and account for existing consignees
    const totalTruckCbm = truckCbm || totalCbmInput || 0;
    const usedCbm = totalUsedCBM || 0;
    return roundToTwo(totalTruckCbm - usedCbm - currentInputCbm);
  };

  // Function to check if total consignee CBM matches total truck CBM
  const isCbmFull = () => {
    // Calculate total CBM for this waybill's consignees
    const waybillConsignees = consignees.filter(
      (c) => c.waybillNumber === selectedWaybill
    );

    // If there are no consignees for this waybill, it's not full
    if (waybillConsignees.length === 0) {
      return false;
    }

    const totalConsigneeCBM = waybillConsignees.reduce(
      (sum, c) => sum + (Number(c.cbm) || 0),
      0
    );

    // Get the total truck CBM
    const totalTruckCBM = truckCbm || totalCbmInput || 0;

    // If there's no truck CBM set, it can't be full
    if (totalTruckCBM <= 0) {
      return false;
    }

    // Using a small epsilon for floating point comparison
    return Math.abs(totalConsigneeCBM - totalTruckCBM) < 0.01;
  };
  const closeOpenDrawer = () => {
    // First set the drawer state to false
    setIsDrawerOpen(false);

    // Set isSavingEdit to true to prevent immediate reopening
    setIsSavingEdit(true);

    // Update URL to remove drawer state while preserving modal state
    // router.push(
    //   {
    //     pathname: router.pathname,
    //     query: {
    //       ...router.query,
    //       drawer: undefined,
    //       editConsignee: undefined,
    //       view: "waybillbody",
    //       modal: "drops",
    //       waybillNumber: selectedWaybill,
    //     },
    //   },
    //   undefined,
    //   { shallow: true }
    // );

    // Reset drawer states
    setCurrentInputCbm(0);
    setCustomTotalCbm(0);
    setDrawerTotalCbm(0);
    setDrawerTotalPercentage(0);
    setDrawerTotalAmount(0);
    setDrawerTotalAdditionals(0);

    // Set isSavingEdit back to false after URL update has been processed
    setTimeout(() => {
      setIsSavingEdit(false);
    }, 300);
  };
  // Reset currentInputCbm when drawer closes
  const closeDrawer = () => {
    // Force close if CBM is full
    if (isCbmFull()) {
      setIsDrawerOpen(false);
      setIsSavingEdit(true);
      router.push(
        {
          pathname: router.pathname,
          query: {
            ...router.query,
            drawer: undefined,
            editConsignee: undefined,
            view: "waybillbody",
            modal: "drops",
            waybillNumber: selectedWaybill,
          },
        },
        undefined,
        { shallow: true }
      );
      setCurrentInputCbm(0);
      setCustomTotalCbm(0);
      setDrawerTotalCbm(0);
      setDrawerTotalPercentage(0);
      setDrawerTotalAmount(0);
      setDrawerTotalAdditionals(0);
      setTimeout(() => {
        setIsSavingEdit(false);
      }, 300);
      return;
    }
    // First set the drawer state to false
    setIsDrawerOpen(false);

    // Set isSavingEdit to true to prevent immediate reopening
    setIsSavingEdit(true);

    // Update URL to remove drawer state while preserving modal state
    router.push(
      {
        pathname: router.pathname,
        query: {
          ...router.query,
          drawer: undefined,
          editConsignee: undefined,
          view: "waybillbody",
          modal: "drops",
          waybillNumber: selectedWaybill,
        },
      },
      undefined,
      { shallow: true }
    );

    // Reset drawer states
    setCurrentInputCbm(0);
    setCustomTotalCbm(0);
    setDrawerTotalCbm(0);
    setDrawerTotalPercentage(0);
    setDrawerTotalAmount(0);
    setDrawerTotalAdditionals(0);

    // Set isSavingEdit back to false after URL update has been processed
    setTimeout(() => {
      setIsSavingEdit(false);
    }, 300);
  };

  // Open the drawer
  const openDrawer = async () => {
    // If the waybill is billed, prevent opening the drawer
    if (isBilledWaybill) {
      toast({
        title: "View Only Mode",
        description: "This waybill is in BILLED status and cannot be modified.",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      // Check if shipper info has been saved
      if (!isShipperInfoSaved) {
        toast({
          title: "Save Shipper Info First",
          description:
            "Please fill out and save the shipper information before adding consignees.",
          status: "warning",
          duration: 3000,
          isClosable: true,
        });
        return;
      }

      // Format the origin with storeType/shipper
      const storeType = shipperFormData.storeType || "STORE";
      const shipper = shipperFormData.shipper || "";
      const formattedOrigin = shipper ? `${shipper}` : "";

      // Update URL to include drawer state while preserving modal state
      router.push(
        {
          pathname: router.pathname,
          query: {
            ...router.query,
            drawer: "add",
            view: "waybillbody",
            modal: "drops",
            waybillNumber: selectedWaybill,
          },
        },
        undefined,
        { shallow: true }
      );

      // Fetch existing consignees for this waybill to get the first available date
      let defaultDate = "";
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_API}/api/consigneeInfo/${selectedWaybill}`
        );

        if (response.ok) {
          const existingConsignees = await response.json();

          if (existingConsignees && existingConsignees.length > 0) {
            // Extract dates and sort them
            const dates = existingConsignees
              .map((consignee) => new Date(consignee.date))
              .sort((a, b) => a - b); // Sort dates in ascending order

            if (dates.length > 0) {
              // Format the earliest date for the date input
              defaultDate = formatDateForInput(dates[0]);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching existing consignee dates:", error);
      }

      // Initialize form with the selected waybill number
      setModalFormData({
        waybillNumber: selectedWaybill,
        consignee: "",
        date: defaultDate,
        origin: formattedOrigin,
        destination: "",
        type: "Store",
        cbm: "",
        percentage: "",
        amount: "",
        rate: "",
        additionals: "",
        split: "", // Explicitly set split to empty when opening drawer
        payload: "", // Explicitly set payload to empty when opening drawer
      });

      // Reset states
      setIsDcMode(false);
      setStoreType("Store");
      setIsStoreSubDetailMode(false);
      setCustomTotalCbm(0);
      setDrawerTotalCbm(0);
      setDrawerTotalPercentage(0);
      setDrawerTotalAmount(0);
      setDrawerTotalAdditionals(0);

      setIsDrawerOpen(true);
      setShowSubDetails(false);
      setSubDetails([]);
    } catch (error) {
      console.error("Error checking shipper existence:", error);
      toast({
        title: "Error",
        description: "An error occurred while checking shipper information.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  // Modify handleAddDCSubDetail to use modalFormData.rate directly
  const handleAddDCSubDetail = () => {
    const newSubDetail = {
      waybillNumber: modalFormData.waybillNumber,
      consignee: modalFormData.consignee,
      storeName: "",
      amount: 0,
      cbm: 0,
      percentage: 0,
      percentage2: 0,
      type: "DC",
      rate: parseFloat(modalFormData.rate) || 0, // Ensure rate is properly parsed
      additionals: 0,
    };
    setSubDetails([...subDetails, newSubDetail]);
  };

  // Add function to handle Store sub details
  const handleAddStoreSubDetail = () => {
    const newSubDetail = {
      waybillNumber: modalFormData.waybillNumber,
      consignee: modalFormData.consignee,
      storeName: "",
      amount: 0,
      cbm: 0,
      percentage: 0,
      percentage2: 0,
      type: "Store",
    };
    setSubDetails([...subDetails, newSubDetail]);
  };

  // Modify handleSaveModal to handle different store types
  const handleSaveModal = async () => {
    try {
      // Validate required fields
      const requiredFields = {
        waybillNumber: "Waybill Number",
        consignee: "Consignee",
        date: "Date",
        origin: "Origin",
      };

      // Check each required field
      for (const [field, label] of Object.entries(requiredFields)) {
        if (!modalFormData[field] || modalFormData[field].trim() === "") {
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

      // Check if rate is set
      const rateValue = parseFloat(modalFormData.rate) || 0;
      if (rateValue <= 0) {
        toast({
          title: "Validation Error",
          description: "Rate is required before saving",
          status: "error",
          duration: 3000,
          isClosable: true,
          position: "top-center",
        });
        return;
      }

      // Validate subdetails based on store type
      if (storeType && subDetails.length === 0) {
        toast({
          title: "Validation Error",
          description: `At least one sub-detail is required for ${storeType}`,
          status: "error",
          duration: 3000,
          isClosable: true,
          position: "top-center",
        });
        return;
      }

      // Calculate totals from sub-details
      const subDetailTotals = subDetails.reduce(
        (acc, curr) => ({
          cbm: roundToTwo(acc.cbm + (Number(curr.cbm) || 0)),
          percentage: roundToTwo(
            acc.percentage + (Number(curr.percentage) || 0)
          ),
          amount: roundToTwo(acc.amount + (Number(curr.amount) || 0)),
        }),
        { cbm: 0, percentage: 0, amount: 0 }
      );

      // Format dates
      const formattedData = {
        ...modalFormData,
        date: modalFormData.date
          ? new Date(modalFormData.date).toISOString()
          : null,
        type: storeType,
        cbm: subDetailTotals.cbm,
        percentage: subDetailTotals.percentage,
        amount: subDetailTotals.amount,
        consignee: modalFormData.consignee, // Explicitly preserve the full consignee with abbreviation
      };

      // Save consignee info
      const consigneeResponse = await fetch(
        process.env.NEXT_PUBLIC_BACKEND_API + "/api/consigneeInfo",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formattedData),
        }
      );

      if (!consigneeResponse.ok) {
        throw new Error(
          `Failed to save consignee info: ${await consigneeResponse.text()}`
        );
      }

      // Save subdetails if they exist
      if (subDetails.length > 0) {
        for (const detail of subDetails) {
          const subDetailResponse = await fetch(
            process.env.NEXT_PUBLIC_BACKEND_API + "/api/subdetails",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                ...detail,
                waybillNumber: modalFormData.waybillNumber,
                consignee: modalFormData.consignee,
                type: storeType,
                cbm: Number(detail.cbm) || 0,
                percentage: Number(detail.percentage) || 0,
                amount: Number(detail.amount) || 0,
                totalCbm:
                  Number(customTotalCbm) || truckCbm || totalCbmInput || 0, // Save the total CBM value
              }),
            }
          );

          if (!subDetailResponse.ok) {
            throw new Error(
              `Failed to save subdetail: ${await subDetailResponse.text()}`
            );
          }
        }
      }

      // Refresh consignee data
      const refreshResponse = await fetch(
        process.env.NEXT_PUBLIC_BACKEND_API + "/api/consigneeInfo"
      );
      const refreshData = await refreshResponse.json();
      setConsignees(refreshData);

      // Update the additional adjustment based on the number of consignees after adding a new one
      if (modalFormData.waybillNumber) {
        try {
          // Count how many consignees are now associated with this waybill
          const currentConsigneesForWaybill = refreshData.filter(
            (c) => c.waybillNumber === modalFormData.waybillNumber
          );
          const numConsignees = currentConsigneesForWaybill.length;

          // Calculate the new adjustment
          let newAdjustment = 0;
          if (numConsignees > 2) {
            newAdjustment = (numConsignees - 2) * additionalRateValue;
          }

          console.log(
            `After adding consignee: ${numConsignees} consignees in total, setting adjustment to ${newAdjustment}`
          );

          // Save the updated adjustment
          await saveAdditionalAdjustment(
            modalFormData.waybillNumber,
            newAdjustment
          );
          setAdditionalAdjustment(newAdjustment);
        } catch (error) {
          console.error(
            "Error updating additional adjustment after adding consignee:",
            error
          );
        }
      }

      // Reset form state
      setModalFormData((prev) => ({
        ...prev,
        consignee: "",
        date: "",
        origin: "",
        destination: "",
        cbm: "",
        percentage: "",
        amount: "",
        rate: "",
        additionals: "",
        type: "", // Reset type field
        split: "", // Reset split field
      }));

      // Reset sub details
      setSubDetails([]);
      setTotalCbm(0);
      setTotalPercentage(0);
      setTotalAmount(0);
      setTotalAdditionals(0);
      setStoreType("");
      setShowSubDetails(false);
      setIsStoreSubDetailMode(false);

      toast({
        title: "Success",
        description: "Store saved successfully!",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      closeDrawer();
    } catch (error) {
      console.error("Error saving store:", error);
      toast({
        title: "Error",
        description: error.message || "Error saving store data",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  // Update the fetchStoreNames function
  useEffect(() => {
    const fetchStoreNames = async () => {
      try {
        // If in individual mode, use the consigneeClients data
        if (
          isIndividualMode &&
          consigneeClients &&
          consigneeClients.length > 0
        ) {
          // Use the transformed consigneeClients data for store names
          setStoreNames(consigneeClients.map((client) => client.consigneeName));
          return;
        }

        // Otherwise, fetch store names from the API as usual
        const response = await fetch(
          process.env.NEXT_PUBLIC_BACKEND_API + "/api/clients"
        );
        const data = await response.json();
        const filteredStores = data.filter((store) =>
          store.storeName.includes("DC")
        );
        setStoreNames(filteredStores.map((store) => store.storeName));
      } catch (error) {
        console.error("Error fetching store names:", error);
        toast({
          title: "Error",
          description: "Failed to fetch store names",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      }
    };

    fetchStoreNames();
  }, [isIndividualMode, consigneeClients]);

  const handleAddSubDetail = () => {
    const newSubDetail = {
      waybillNumber: modalFormData.waybillNumber,
      consignee: modalFormData.consignee,
      storeName: "",
      amount: 0,
      cbm: 0,
      percentage: 0,
    };
    setSubDetails([...subDetails, newSubDetail]);
  };

  // Modify handleSaveDC to use the single rate
  const handleSaveDC = async () => {
    try {
      // Validate required fields
      const requiredFields = {
        waybillNumber: "Waybill Number",
        consignee: "Consignee",
        date: "Date",
        origin: "Origin",
        // destination is no longer required
      };

      // Check each required field
      for (const [field, label] of Object.entries(requiredFields)) {
        if (!modalFormData[field] || modalFormData[field].trim() === "") {
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

      // Check if all store names are selected in sub details
      const hasEmptyStoreNames = subDetails.some(
        (detail) => !detail.storeName || detail.storeName.trim() === ""
      );

      if (hasEmptyStoreNames) {
        toast({
          title: "Validation Error",
          description: "Please select a store name for all sub details",
          status: "error",
          duration: 3000,
          isClosable: true,
          position: "top-center",
        });
        return;
      }

      // Check if any sub-detail has empty or zero CBM value
      const hasInvalidCbm = subDetails.some(
        (detail) => !detail.cbm || parseFloat(detail.cbm) <= 0
      );

      if (hasInvalidCbm) {
        toast({
          title: "Validation Error",
          description:
            "All sub-details must have a valid CBM value greater than zero",
          status: "error",
          duration: 3000,
          isClosable: true,
          position: "top-center",
        });
        return;
      }

      // Check if consignee already exists
      const existingConsignee = consignees.find(
        (c) =>
          c.waybillNumber === modalFormData.waybillNumber &&
          c.consignee.toLowerCase() === modalFormData.consignee.toLowerCase() &&
          !isEditMode
      );

      if (existingConsignee) {
        toast({
          title: "Validation Error",
          description: "This consignee already exists for this waybill number",
          status: "error",
          duration: 3000,
          isClosable: true,
          position: "top-center",
        });
        return;
      }

      // Calculate totals from subDetails only
      const calculatedTotals = subDetails.reduce(
        (acc, curr) => ({
          cbm: roundToTwo(acc.cbm + (Number(curr.cbm) || 0)),
          amount: roundToTwo(acc.amount + (Number(curr.amount) || 0)),
          percentage: roundToTwo(
            acc.percentage + (Number(curr.percentage) || 0)
          ),
          additionals: roundToTwo(
            acc.additionals + (Number(curr.additionals) || 0)
          ),
        }),
        { cbm: 0, amount: 0, percentage: 0, additionals: 0 }
      );

      // Count existing consignees for this waybill
      const consigneesForCurrentWaybill = consignees.filter(
        (c) => c.waybillNumber === modalFormData.waybillNumber
      );
      const consigneeCount = consigneesForCurrentWaybill.length;

      // If this is the 3rd or more consignee for this waybill, add an additional fee of 1000
      let additionalAmount = Number(calculatedTotals.additionals) || 0;
      if (consigneeCount >= 2) {
        additionalAmount = additionalRateValue;

        // Show a toast to inform user about the additional fee
        toast({
          title: "Additional Fee Applied",
          description: `An additional fee of ₱${formatNumberWithCommas(additionalRateValue)} has been applied as this is the ${
            consigneeCount + 1
          }${getOrdinalSuffix(consigneeCount + 1)} consignee for this waybill.`,
          status: "info",
          duration: 5000,
          isClosable: true,
          position: "top-center",
        });
      }

      // Prepare DC data
      const dcData = {
        waybillNumber: modalFormData.waybillNumber,
        consignee: modalFormData.consignee,
        company: shipperFormData.shippers, // Add company field with the shipper value
        date: modalFormData.date
          ? new Date(modalFormData.date).toISOString()
          : new Date().toISOString(),
        origin: modalFormData.origin || shipperFormData.shipper,
        destination: modalFormData.destination,
        type: "DC",
        cbm: Number(calculatedTotals.cbm),
        amount: Number(calculatedTotals.amount),
        percentage: Number(calculatedTotals.percentage.toFixed(2)),
        rate: Number(modalFormData.rate || 0), // Use the single rate from modalFormData
        additionals: additionalAmount,
        withSubDetails: true, // DC type always has sub-details
      };

      // Show toast for withSubDetails set to true
      // toast({
      //   title: "Debug: withSubDetails Status",
      //   description: `Setting withSubDetails to TRUE for DC ${modalFormData.consignee}`,
      //   status: "info",
      //   duration: 5000,
      //   isClosable: true,
      //   position: "top-center",
      // });

      console.log("Saving DC data:", dcData);

      // First save the consignee info
      const consigneeResponse = await fetch(
        process.env.NEXT_PUBLIC_BACKEND_API + "/api/consigneeInfo",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(dcData),
        }
      );

      const consigneeResponseData = await consigneeResponse.json();
      console.log("Consignee save response:", consigneeResponseData);

      if (!consigneeResponse.ok) {
        throw new Error(
          consigneeResponseData.message || "Failed to save DC data"
        );
      }

      // Then save each sub-detail
      for (const detail of subDetails) {
        const subDetailData = {
          subDetailID: `SD${Date.now()}-${Math.random()
            .toString(36)
            .substr(2, 9)}`,
          waybillNumber: modalFormData.waybillNumber,
          consignee: modalFormData.consignee,
          storeName: detail.storeName || "",
          amount: Number(detail.amount) || 0,
          cbm: Number(detail.cbm) || 0,
          percentage: Number(detail.percentage) || 0,
          weight: Number(detail.weight) || 0,
          additionals: Number(detail.additionals) || 0,
          rate: Number(detail.rate) || 0,
          type: "DC", // Explicitly set type to "DC"
          totalCbm: Number(customTotalCbm) || truckCbm || totalCbmInput || 0, // Save the total CBM value
        };

        console.log("Saving sub-detail:", subDetailData);

        const subDetailResponse = await fetch(
          process.env.NEXT_PUBLIC_BACKEND_API + "/api/subdetails",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify(subDetailData),
          }
        );

        if (!subDetailResponse.ok) {
          const errorData = await subDetailResponse.json();
          throw new Error(`Failed to save sub-detail: ${errorData.message}`);
        }

        const subDetailResponseData = await subDetailResponse.json();
        console.log("Sub-detail Response:", subDetailResponseData);
      }

      // Refresh consignee data
      const refreshResponse = await fetch(
        process.env.NEXT_PUBLIC_BACKEND_API + "/api/consigneeInfo"
      );
      const refreshData = await refreshResponse.json();
      setConsignees(refreshData);

      // Reset form state
      setModalFormData((prev) => ({
        ...prev,
        consignee: "",
        date: "",
        origin: "",
        destination: "",
        cbm: "",
        percentage: "",
        amount: "",
        rate: "",
        additionals: "",
        type: "", // Reset type field
        split: "", // Reset split field
      }));
      setSubDetails([]);
      setTotalCbm(0);
      setTotalPercentage(0);
      setTotalAmount(0);
      setTotalAdditionals(0);
      setStoreType("");
      setShowSubDetails(false);
      fetchConsignees();
      updateAmountsWithHighestRate();

      // Update URL to remove drawer state while preserving modal state
      router.push(
        {
          pathname: router.pathname,
          query: {
            modal: "drops",
            waybillNumber: selectedWaybill,
            type: router.query.type, // Preserve the drop type
          },
        },
        undefined,
        { shallow: true }
      );

      toast({
        title: "Success",
        description: "DC saved successfully!",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      closeDrawer();
    } catch (error) {
      console.error("Error saving DC:", error);
      console.error("Error details:", error.message);
      toast({
        title: "Error",
        description: error.message || "Error saving DC data",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  // Add useEffect to fetch clients for consignee dropdown
  useEffect(() => {
    const fetchConsigneeClients = async () => {
      try {
        const response = await fetch(
          process.env.NEXT_PUBLIC_BACKEND_API + "/api/multiple-consignees"
        );
        const data = await response.json();
        console.log("Fetched consignee data:", data);

        // Sort by _id in descending order (latest first since _id contains timestamp)
        const sortedConsignees = data
          .sort((a, b) => b._id.localeCompare(a._id))
          .map((consignee) => ({
            _id: consignee._id,
            consigneeName: consignee.consigneeName,
            consigneeBusinessAddress: consignee.consigneeBusinessAddress,
            consigneeID: consignee.consigneeID,
          }));

        // Set the sorted consignees
        setConsigneeClients(sortedConsignees);
      } catch (error) {
        console.error("Error fetching consignee clients:", error);
        toast({
          title: "Error",
          description: "Failed to fetch consignee data from server",
          status: "error",
          duration: 3000,
          isClosable: true,
          position: "top-center",
        });
      }
    };
    fetchConsigneeClients();
    fetchConsignees();
  }, []);

  // Update handleSaveStore
  const handleSaveStore = async () => {
    try {
      // Log the current state to debug
      console.log("Current mode state:", {
        isStoreSubDetailMode,
        storeType,
        subDetailsLength: subDetails.length,
        isSplit: modalFormData.split ? true : false, // Log split status
        isPayload: modalFormData.payload ? true : false, // Log payload status
        subWaybillNumber: modalFormData.subWaybillNumber || "", // Log subWaybillNumber
      });

      // Validate required fields
      const requiredFields = {
        waybillNumber: "Waybill Number",
        consignee: "Consignee",
        date: "Date",
        origin: "Origin",
      };

      // Check each required field
      for (const [field, label] of Object.entries(requiredFields)) {
        if (!modalFormData[field] || modalFormData[field].trim() === "") {
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

      // Check if subWaybillNumber is required for split/payload
      if (
        (modalFormData.split === "split" ||
          modalFormData.payload === "payload") &&
        (!modalFormData.subWaybillNumber ||
          modalFormData.subWaybillNumber.trim() === "")
      ) {
        toast({
          title: "Validation Error",
          description: "Sub-Waybill Number is required for split/payload items",
          status: "error",
          duration: 3000,
          isClosable: true,
          position: "top-center",
        });
        return;
      }

      // Check if rate is set
      const rateValue = parseFloat(modalFormData.rate) || 0;
      if (rateValue <= 0) {
        toast({
          title: "Validation Error",
          description: "Rate is required before saving",
          status: "error",
          duration: 3000,
          isClosable: true,
          position: "top-center",
        });
        return;
      }

      // Determine if we're in store sub detail mode based on both the state and if we have subDetails
      const hasSubDetails = subDetails && subDetails.length > 0;
      const usingSubDetails =
        isStoreSubDetailMode || (storeType === "Store" && hasSubDetails);

      // If using sub details, validate that we have sub details
      if (usingSubDetails && !hasSubDetails) {
        toast({
          title: "Validation Error",
          description:
            "At least one sub-detail is required when using sub details",
          status: "error",
          duration: 3000,
          isClosable: true,
          position: "top-center",
        });
        return;
      }

      // Validate CBM and Store fields based on mode
      if (usingSubDetails) {
        // Check if any sub-detail has empty storeName or invalid CBM
        const invalidSubDetails = subDetails.filter(
          (detail, index) =>
            !detail.storeName ||
            detail.storeName.trim() === "" ||
            detail.cbm === undefined ||
            detail.cbm === null ||
            detail.cbm === ""
        );

        if (invalidSubDetails.length > 0) {
          toast({
            title: "Validation Error",
            description:
              "All sub-details must have a Store Name and valid CBM value",
            status: "error",
            duration: 3000,
            isClosable: true,
            position: "top-center",
          });
          return;
        }
      } else {
        // Check if CBM is valid in regular store mode
        if (
          modalFormData.cbm === undefined ||
          modalFormData.cbm === null ||
          modalFormData.cbm === ""
        ) {
          toast({
            title: "Validation Error",
            description: "CBM is required",
            status: "error",
            duration: 3000,
            isClosable: true,
            position: "top-center",
          });
          return;
        }
      }

      // Set isSavingEdit to true to prevent drawer from reopening
      setIsSavingEdit(true);

      // Check if consignee already exists
      const existingConsignee = consignees.find(
        (c) =>
          c.waybillNumber === modalFormData.waybillNumber &&
          c.consignee.toLowerCase() === modalFormData.consignee.toLowerCase() &&
          !isEditMode
      );

      if (existingConsignee) {
        toast({
          title: "Validation Error",
          description: "This consignee already exists for this waybill number",
          status: "error",
          duration: 3000,
          isClosable: true,
          position: "top-center",
        });
        return;
      }

      // Count existing consignees for this waybill
      const consigneesForCurrentWaybill = consignees.filter(
        (c) => c.waybillNumber === modalFormData.waybillNumber
      );
      const consigneeCount = consigneesForCurrentWaybill.length;

      // If this is the 3rd or more consignee for this waybill, add an additional fee of 1000
      let additionalAmount = Number(modalFormData.additionals) || 0;
      if (consigneeCount >= 2) {
        additionalAmount = additionalRateValue;

        // Show a toast to inform user about the additional fee
        toast({
          title: "Additional Fee Applied",
          description: `An additional fee of ₱${formatNumberWithCommas(additionalRateValue)} has been applied as this is the ${
            consigneeCount + 1
          }${getOrdinalSuffix(consigneeCount + 1)} consignee for this waybill.`,
          status: "info",
          duration: 5000,
          isClosable: true,
          position: "top-center",
        });
      }

      // Prepare Store data
      let storeData;

      // Log what sub-detail mode we're using
      console.log("Using sub-details mode:", usingSubDetails);
      console.log("Sub-details:", subDetails);

      if (usingSubDetails && hasSubDetails) {
        // Calculate totals from subDetails only
        const calculatedTotals = subDetails.reduce(
          (acc, curr) => ({
            cbm: roundToTwo(acc.cbm + (Number(curr.cbm) || 0)),
            percentage: roundToTwo(
              acc.percentage + (Number(curr.percentage) || 0)
            ),
            amount: roundToTwo(acc.amount + (Number(curr.amount) || 0)),
          }),
          { cbm: 0, percentage: 0, amount: 0 }
        );

        console.log("Calculated totals from sub-details:", calculatedTotals);

        // Use calculated totals from subDetails for Store with sub details
        storeData = {
          waybillNumber: modalFormData.waybillNumber,
          subWaybillNumber: modalFormData.subWaybillNumber || "", // Add subWaybillNumber field
          consignee: modalFormData.consignee,
          company: shipperFormData.shippers, // Add company field with the shipper value
          date: modalFormData.date
            ? new Date(modalFormData.date).toISOString()
            : new Date().toISOString(),
          origin: modalFormData.origin || shipperFormData.shipper,
          destination: modalFormData.destination,
          type: "Store",
          cbm: calculatedTotals.cbm,
          percentage: Number(calculatedTotals.percentage.toFixed(2)),
          amount: Number(calculatedTotals.amount.toFixed(2)),
          rate: Number(modalFormData.rate) || 0,
          additionals: additionalAmount,
          withSubDetails: true, // Set to true since we're using sub-details
          split: modalFormData.split || "", // Add split field
          payload: modalFormData.payload || "", // Add payload field
        };

        // Show toast for withSubDetails set to true
        // toast({
        //   title: "Debug: withSubDetails Status",
        //   description: `Setting withSubDetails to TRUE for ${modalFormData.consignee}`,
        //   status: "info",
        //   duration: 5000,
        //   isClosable: true,
        //   position: "top-center",
        // });
      } else {
        // Use form data for regular Store
        storeData = {
          waybillNumber: modalFormData.waybillNumber,
          subWaybillNumber: modalFormData.subWaybillNumber || "", // Add subWaybillNumber field
          consignee: modalFormData.consignee,
          company: shipperFormData.shippers, // Add company field with the shipper value
          date: modalFormData.date
            ? new Date(modalFormData.date).toISOString()
            : new Date().toISOString(),
          origin: modalFormData.origin || shipperFormData.shipper,
          destination: modalFormData.destination,
          type: "Store",
          cbm: Number(modalFormData.cbm) || 0,
          percentage: Number(modalFormData.percentage) || 0,
          amount: Number(modalFormData.amount) || 0,
          rate: Number(modalFormData.rate) || 0,
          additionals: additionalAmount,
          withSubDetails: false, // Set to false since we're not using sub-details
          split: modalFormData.split || "", // Add split field
          payload: modalFormData.payload || "", // Add payload field
        };
      }

      console.log("Saving store data:", storeData);

      // Save the consignee info
      const consigneeResponse = await fetch(
        process.env.NEXT_PUBLIC_BACKEND_API + "/api/consigneeInfo",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(storeData),
        }
      );

      const consigneeResponseData = await consigneeResponse.json();
      // DEBUGGING: Log the full response data
      console.log("FULL STORE RESPONSE DATA:", consigneeResponseData);
      console.log("Store save response:", consigneeResponseData);

      if (!consigneeResponse.ok) {
        throw new Error(
          consigneeResponseData.message || "Failed to save Store data"
        );
      }

      // Debug toast to check saved data
      // toast({
      //   title: "Debug: Saved Data Check",
      //   description: `Saved consignee with withSubDetails=${consigneeResponseData.withSubDetails}`,
      //   status: "info",
      //   duration: 5000,
      //   isClosable: true,
      //   position: "bottom-right",
      // });

      // If using sub details, save them too
      if (usingSubDetails && hasSubDetails) {
        console.log("Saving sub-details for Store");
        for (const detail of subDetails) {
          const subDetailData = {
            subDetailID: `SD${Date.now()}-${Math.random()
              .toString(36)
              .substr(2, 9)}`,
            waybillNumber: modalFormData.waybillNumber,
            subWaybillNumber: modalFormData.subWaybillNumber || "", // Add subWaybillNumber field
            consignee: modalFormData.consignee,
            storeName: detail.storeName || "",
            amount: Number(detail.amount) || 0,
            cbm: Number(detail.cbm) || 0,
            percentage: Number(detail.percentage) || 0,
            weight: Number(detail.weight) || 0,
            additionals: Number(detail.additionals) || 0,
            rate: Number(detail.rate) || 0,
            type: "Store", // Explicitly set type to "Store"
            totalCbm: Number(customTotalCbm) || truckCbm || totalCbmInput || 0, // Save the total CBM value
          };

          console.log("Saving sub-detail:", subDetailData);

          const subDetailResponse = await fetch(
            process.env.NEXT_PUBLIC_BACKEND_API + "/api/subdetails",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
              },
              body: JSON.stringify(subDetailData),
            }
          );

          if (!subDetailResponse.ok) {
            const errorData = await subDetailResponse.json();
            throw new Error(`Failed to save sub-detail: ${errorData.message}`);
          }

          const subDetailResponseData = await subDetailResponse.json();
          console.log("Sub-detail Response:", subDetailResponseData);
        }
      } else {
        console.log("No sub-details to save for Store");
      }

      // If we have a subWaybillNumber, update its status to USED now that we've saved successfully
      if (modalFormData.subWaybillNumber) {
        try {
          console.log(
            `Updating subWaybill ${modalFormData.subWaybillNumber} status to USED`
          );
          toast({
            title: "Status Update",
            description: `Attempting to update subWaybill ${modalFormData.subWaybillNumber} status to USED`,
            status: "info",
            duration: 3000,
            isClosable: true,
          });

          const response = await fetch(
            `${process.env.NEXT_PUBLIC_BACKEND_API}/api/waybills/number/${modalFormData.subWaybillNumber}`,
            {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ status: "USED" }),
            }
          );

          const responseData = await response.json();

          if (!response.ok) {
            throw new Error(
              responseData.message || `Failed with status ${response.status}`
            );
          }

          toast({
            title: "Success",
            description: `SubWaybill ${modalFormData.subWaybillNumber} status updated to USED`,
            status: "success",
            duration: 3000,
            isClosable: true,
          });
        } catch (error) {
          console.error("Error updating subWaybill status:", error);
          toast({
            title: "Error",
            description: `Failed to update subWaybill status: ${error.message}`,
            status: "error",
            duration: 5000,
            isClosable: true,
          });
          // Continue with the rest of the save process even if this fails
        }
      }

      // Refresh consignee data
      await fetchConsignees();

      // Update amounts with highest rate
      await updateAmountsWithHighestRate();

      // Now update the EntityAbbreviationSummary status explicitly
      // Extract entity abbreviation from consignee name
      const entityAbbreviation = modalFormData.consignee.split(" - ")[0].trim();

      try {
        // Get entity summaries for this waybill
        const entitySummaries = await fetchEntitySummariesWithStatus(
          modalFormData.waybillNumber
        );

        if (entitySummaries && entitySummaries.length > 0) {
          console.log("Updating EntityAbbreviationSummary status after save");

          // Find if this specific entity exists
          const entityExists = entitySummaries.some(
            (entity) => entity.entityAbbreviation === entityAbbreviation
          );

          if (entityExists) {
            // Update just this entity's status
            await fetch(
              `${process.env.NEXT_PUBLIC_BACKEND_API}/api/entity-abbreviation-summary/single/${modalFormData.waybillNumber}/${entityAbbreviation}/status`,
              {
                method: "PUT",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ status: "calculated" }),
              }
            );
            console.log(`Updated status for entity ${entityAbbreviation}`);
          }
        }
      } catch (entityError) {
        console.error("Error updating entity status:", entityError);
        // Continue with the rest of the save process even if this fails
      }

      // Reset form state
      setModalFormData((prev) => ({
        ...prev,
        consignee: "",
        date: "",
        origin: "",
        destination: "",
        cbm: "",
        percentage: "",
        amount: "",
        rate: "",
        additionals: "",
        type: "", // Reset type field
        split: "", // Reset split field
        payload: "", // Reset payload field
        subWaybillNumber: "", // Reset subWaybillNumber field
      }));

      // Reset sub details
      setSubDetails([]);
      setTotalCbm(0);
      setTotalPercentage(0);
      setTotalAmount(0);
      setTotalAdditionals(0);
      setStoreType("");
      setShowSubDetails(false);
      setIsStoreSubDetailMode(false);

      toast({
        title: "Success",
        description: "Store saved successfully!",
        status: "success",
        duration: 3000,
        isClosable: true,
      });

      // closeDrawer();
      closeOpenDrawer();
      // Keep isSavingEdit true for a short period to prevent drawer reopening
      setTimeout(() => {
        setIsSavingEdit(false);
      }, 500);
    } catch (error) {
      console.error("Error saving store:", error);
      toast({
        title: "Error",
        description: error.message || "Error saving store data",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      setIsSavingEdit(false); // Reset in case of error
    }
  };
  // Add new functions for handling edit, delete, and view operations
  const handleViewSubDetails = async (consignee) => {
    try {
      const response = await fetch(
        `${
          process.env.NEXT_PUBLIC_BACKEND_API
        }/api/subdetails?waybillNumber=${encodeURIComponent(
          consignee.waybillNumber
        )}&consignee=${encodeURIComponent(
          consignee.consignee
        )}&type=${encodeURIComponent(consignee.type)}`
      );
      const data = await response.json();
      // Filter sub details for the specific consignee and type
      const filteredSubDetails = data.filter(
        (detail) =>
          detail.waybillNumber === consignee.waybillNumber &&
          detail.consignee === consignee.consignee &&
          detail.type === consignee.type
      );
      setCurrentConsigneeSubDetails(filteredSubDetails);
      setSelectedConsignee(consignee);
      setIsViewingSubDetails(true);
    } catch (error) {
      console.error("Error fetching sub details:", error);
      toast({
        title: "Error",
        description: "Failed to fetch sub details",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleEditConsignee = async (consignee) => {
    console.log(">>> [handleEditConsignee] Setting isEditDrawerOpen to TRUE");
    setIsEditDrawerOpen(true);
    setEditFormData({
      ...consignee,
      date: formatDateForInput(consignee.date), // Ensure date is formatted for input
    });
    setCustomTotalCbm(parseFloat(consignee.totalCbm) || 0);
    setEditSubDetailsWereRequested(false);

    if (consignee.type !== "DC" && consignee.type !== "Store") return;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const params = new URLSearchParams({
        waybillNumber: consignee.waybillNumber,
        consignee: consignee.consignee,
        type: consignee.type,
      });

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/subdetails?${params}`,
        {
          signal: controller.signal,
          headers: {
            Accept: "application/json",
            "Cache-Control": "no-cache",
          },
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      const filteredSubDetails = data.filter(
        (detail) =>
          detail.waybillNumber === consignee.waybillNumber &&
          detail.consignee === consignee.consignee &&
          detail.type === consignee.type
      );

      const totalCbm = filteredSubDetails[0]?.totalCbm;
      setCustomTotalCbm(Number(totalCbm) || 0);

      const processedSubDetails = filteredSubDetails.map((detail) => ({
        ...detail,
        cbm: detail.cbm || "0",
        percentage: detail.percentage || "0",
        percentage2: detail.percentage2 || "0",
        amount: detail.amount || "0",
        rate: detail.rate || "0",
        additionals: detail.additionals || "0",
      }));

      setEditSubDetails(processedSubDetails);
    } catch (error) {
      if (error.name === "AbortError") {
        toast({
          title: "Timeout",
          description: "Request took too long to complete",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch sub details",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      }
    }
  };
  // Update the handleEditModalChange function to calculate percentage based on CBM and truck total CBM

  const handleEditModalChange = (e) => {
    const { name, value } = e.target;
    const field = e.target["data-field"];

    // Handle special case for consignee field from SearchableSelect
    if (field === "consignee") {
      // Format with entity abbreviation if not already included and we have an abbreviation
      let consigneeValue = value;
      if (
        shipperEntityAbbreviation &&
        !value.includes(" - ") &&
        !isIndividualMode
      ) {
        consigneeValue = `${shipperEntityAbbreviation} - ${value}`;
      }

      setEditFormData((prevData) => ({
        ...prevData,
        consignee: consigneeValue,
      }));
      return;
    }

    const newData = {
      ...editFormData,
      [name]: value,
    };

    // Calculate percentage when CBM changes
    if (name === "cbm") {
      // If we have a custom total CBM, use that for calculation
      if (customTotalCbm > 0) {
        const calculatedPercentage = roundToTwo(
          (parseFloat(value) / customTotalCbm) * 100
        );
        newData.percentage = calculatedPercentage.toString();
      }
      // Otherwise use the truck's total CBM
      else if (truckCbm > 0) {
        const calculatedPercentage = roundToTwo(
          (parseFloat(value) / truckCbm) * 100
        );
        newData.percentage = calculatedPercentage.toString();
      }
      // If no CBM values available, don't calculate
      else {
        newData.percentage = "0.00";
      }

      // Also update amount if rate exists
      if (newData.rate && newData.rate !== "0") {
        const rate = parseFloat(newData.rate) || 0;
        if (editFormData.type === "Store" && editSubDetails.length === 0) {
          // For Store without sub-details, calculate amount based on percentage
          const percentage = parseFloat(newData.percentage) || 0;
          newData.amount = roundToTwo((rate * percentage) / 100).toString();
        } else {
          // For all other cases, calculate based on rate * cbm
          const cbm = parseFloat(value) || 0;
          newData.amount = roundToTwo(rate * cbm).toString();
        }
      }
    }

    // If rate changes, recalculate amount
    if (name === "rate") {
      const rate = parseFloat(value) || 0;
      if (editFormData.type === "Store" && editSubDetails.length === 0) {
        // For Store without sub-details, calculate amount based on percentage
        const percentage = parseFloat(newData.percentage) || 0;
        newData.amount = roundToTwo((rate * percentage) / 100).toString();
      } else {
        // For all other cases, calculate based on rate * cbm
        const cbm = parseFloat(newData.cbm) || 0;
        newData.amount = roundToTwo(rate * cbm).toString();
      }
    }

    // If percentage changes, recalculate amount for Store without sub-details
    if (
      name === "percentage" &&
      editFormData.type === "Store" &&
      editSubDetails.length === 0
    ) {
      const rate = parseFloat(newData.rate) || 0;
      const percentage = parseFloat(value) || 0;
      newData.amount = roundToTwo((rate * percentage) / 100).toString();
    }

    setEditFormData(newData);
  };

  const handleEditSubDetailChange = (index, field, value) => {
    const newSubDetails = [...editSubDetails];

    if (field === "entityAbbreviation" && !isIndividualMode) {
      // Store the selected abbreviation for this index
      setSelectedEntityAbbreviations((prev) => ({
        ...prev,
        [`edit_${index}`]: value,
      }));

      // If there's a storeName already, format it with the abbreviation
      if (newSubDetails[index].storeName) {
        // Extract the pure store name (remove any existing prefix)
        let pureName = newSubDetails[index].storeName;
        if (pureName.includes(" - ")) {
          pureName = pureName.split(" - ").pop();
        }

        // Format with new entity abbreviation
        newSubDetails[index].storeName = value
          ? `${value} - ${pureName}`
          : pureName;
      }

      setEditSubDetails(newSubDetails);
      return;
    }

    // Special handling for storeName field when using the regular input
    if (
      field === "storeName" &&
      selectedEntityAbbreviations[`edit_${index}`] &&
      !isIndividualMode
    ) {
      // Format the store name with the selected abbreviation
      const pureName = value;
      value = `${selectedEntityAbbreviations[`edit_${index}`]} - ${pureName}`;
    }

    newSubDetails[index] = {
      ...newSubDetails[index],
      [field]: value,
    };

    // If CBM changes, check if rate is set
    if (field === "cbm") {
      const rateValue = parseFloat(editFormData.rate) || 0;
      if (rateValue <= 0) {
        toast({
          title: "Rate Required",
          description: "Please set a rate before entering CBM",
          status: "warning",
          duration: 3000,
          isClosable: true,
          position: "top-center",
        });
        return; // Exit the function if no rate is set
      }

      const totalSubDetailsCbm = newSubDetails.reduce(
        (total, detail) => total + (parseFloat(detail.cbm) || 0),
        0
      );
      setCurrentInputCbm(totalSubDetailsCbm);

      // Always use truckCbm for percentage calculations
      const totalCbmToUse = truckCbm || totalCbmInput;
      const cbmValue = parseFloat(value) || 0;

      if (totalCbmToUse > 0) {
        let percentage = roundToTwo((cbmValue / totalCbmToUse) * 100);
        newSubDetails[index].percentage = percentage.toString();

        // Calculate amount based on the new percentage
        const amount = roundToTwo((rateValue * percentage) / 100);
        newSubDetails[index].amount = amount.toString();
      }
    }

    // If percentage changes, recalculate amount based on rate
    if (field === "percentage") {
      const rateValue = parseFloat(editFormData.rate) || 0;
      const percentageValue = parseFloat(value) || 0;
      const amount = roundToTwo((rateValue * percentageValue) / 100);
      newSubDetails[index].amount = amount.toString();
    }

    // If Rate changes, recalculate amount based on existing percentage
    if (field === "rate") {
      const rateValue = parseFloat(value) || 0;
      const percentage = parseFloat(newSubDetails[index].percentage) || 0;
      const amount = roundToTwo((rateValue * percentage) / 100);
      newSubDetails[index].amount = amount.toString();
    }

    setEditSubDetails(newSubDetails);

    // Recalculate totals
    const totals = newSubDetails.reduce(
      (acc, curr) => ({
        cbm: roundToTwo(acc.cbm + (parseFloat(curr.cbm) || 0)),
        percentage: roundToTwo(
          acc.percentage + (parseFloat(curr.percentage) || 0)
        ),
        amount: roundToTwo(acc.amount + (parseFloat(curr.amount) || 0)),
        additionals: roundToTwo(
          acc.additionals + (parseFloat(curr.additionals) || 0)
        ),
      }),
      { cbm: 0, percentage: 0, amount: 0, additionals: 0 }
    );

    // Check if the total CBM is very close to or equal to the truck's capacity
    const totalCbmToUse = truckCbm || totalCbmInput;
    if (totalCbmToUse > 0 && areNumbersEqual(totals.cbm, totalCbmToUse, 0.01)) {
      totals.percentage = 100;
    }

    setEditFormData((prev) => ({
      ...prev,
      cbm: totals.cbm.toString(),
      percentage: totals.percentage.toString(),
      amount: totals.amount.toString(),
      additionals: totals.additionals.toString(),
    }));

    // Update edit total state variables
    setEditTotalCbm(totals.cbm);
    setEditTotalPercentage(totals.percentage);
    setEditTotalAmount(totals.amount);
  };

  // Function to add DC subdetail in edit mode
  const handleAddEditDCSubDetail = () => {
    // Create a new empty subdetail for DC
    const newSubDetail = {
      waybillNumber: editFormData.waybillNumber,
      consignee: editFormData.consignee,
      storeName: "",
      cbm: "0",
      percentage: "0",
      percentage2: "0",
      amount: "0",
      additionals: "0",
      rate: parseFloat(editFormData.rate) || 0, // Include rate from editFormData
      type: "DC",
    };

    setEditSubDetails([...editSubDetails, newSubDetail]);
  };

  // Function to add Store subdetail in edit mode
  const handleAddEditStoreSubDetail = () => {
    // Create a new empty subdetail for Store
    const newSubDetail = {
      waybillNumber: editFormData.waybillNumber,
      consignee: editFormData.consignee,
      storeName: "",
      cbm: "0",
      percentage: "0",
      percentage2: "0",
      amount: "0",
      additionals: "0",
      type: "Store",
    };

    setEditSubDetails([...editSubDetails, newSubDetail]);
  };

  const handleSaveEdit = async () => {
    // 1. Set loading state immediately
    setIsSavingEdit(true);
    let success = false; // Flag to track overall success
    let updatedConsigneeData = null; // To store successful consignee update data
    let subdetailUpdateInfoFromResponse = null; // To store subdetail info from response

    try {
      // --- Calculate Totals & Prepare Main Data ---
      const cbmTotal = editSubDetails.reduce(
        (sum, detail) => sum + Number(detail.cbm || 0),
        0
      );
      const percentageTotal = editSubDetails.reduce(
        (sum, detail) => sum + Number(detail.percentage || 0),
        0
      );
      const amountTotal = editSubDetails.reduce(
        (sum, detail) => sum + Number(detail.amount || 0),
        0
      );
      const originalConsignee = consignees.find(
        (c) => c._id === editFormData._id
      );

      // Check if the main consignee name actually changed
      const mainConsigneeChanged =
        originalConsignee?.consignee !== editFormData.consignee;
      console.log("Main consignee name changed:", mainConsigneeChanged);

      let editedDataPayload = {
        ...editFormData,
        cbm: editSubDetails.length > 0 ? String(cbmTotal) : editFormData.cbm,
        percentage:
          editSubDetails.length > 0
            ? String(percentageTotal)
            : editFormData.percentage,
        amount:
          editSubDetails.length > 0 ? String(amountTotal) : editFormData.amount,
        withSubDetails: editFormData.type === "DC" || editSubDetails.length > 0,
        company: editFormData.shipperss || editFormData.company, // Ensure company/shipper is included
        shipper: editFormData.shipperss || editFormData.shipper, // Redundant but safe
        date: new Date(editFormData.date).toISOString(), // Ensure date format
      };
      console.log("Main update payload:", editedDataPayload);

      // --- Update Main Consignee Info ---
      const consigneeResponse = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/consigneeInfo/${editFormData._id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(editedDataPayload),
        }
      );

      if (!consigneeResponse.ok) {
        const errorData = await consigneeResponse.json();
        throw new Error(
          `Failed to update main consignee: ${errorData.message || "Unknown error"}`
        );
      }
      const responseData = await consigneeResponse.json();
      updatedConsigneeData = responseData; // Store successful data
      subdetailUpdateInfoFromResponse = responseData.subdetailUpdateInfo;
      console.log("Main consignee update successful:", updatedConsigneeData);

      // --- Explicitly Save Subdetails ---
      let subdetailSaveError = null;
      if (editSubDetails && editSubDetails.length > 0) {
        console.log(
          `Attempting to save ${editSubDetails.length} subdetails...`
        );
        const subDetailSavePromises = editSubDetails.map(async (detail) => {
          const subDetailPayload = {
            ...detail,
            waybillNumber: updatedConsigneeData.waybillNumber,
            consignee: updatedConsigneeData.consignee, // Use updated consignee name
            type: updatedConsigneeData.type,
            rate: detail.rate || updatedConsigneeData.rate || 0,
            totalCbm: customTotalCbm || 0,
          };
          console.log(
            `Saving subdetail payload for ${detail.storeName || "new store"}:`,
            subDetailPayload
          );
          let subDetailResponse;
          try {
            if (detail._id) {
              console.log(
                `Updating existing subdetail: ${detail.storeName} (ID: ${detail._id})`
              );
              subDetailResponse = await fetch(
                `${process.env.NEXT_PUBLIC_BACKEND_API}/api/subdetails/${detail._id}`,
                {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(subDetailPayload),
                }
              );
            } else {
              console.log(`Creating new subdetail: ${detail.storeName}`);
              subDetailResponse = await fetch(
                `${process.env.NEXT_PUBLIC_BACKEND_API}/api/subdetails`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ ...subDetailPayload, _id: undefined }),
                }
              );
            }
            if (!subDetailResponse.ok) {
              const errorData = await subDetailResponse.json();
              throw new Error(
                `Failed for ${detail.storeName}: ${errorData.message}`
              );
            } else {
              const savedSubDetail = await subDetailResponse.json();
              console.log(
                `Successfully saved subdetail ${detail.storeName || savedSubDetail._id}:`,
                savedSubDetail
              );
            }
          } catch (subError) {
            console.error(
              `Error saving subdetail ${detail.storeName || "new store"}:`,
              subError
            );
            // Store the first error encountered
            if (!subdetailSaveError) subdetailSaveError = subError;
            toast({
              title: "Subdetail Save Error",
              description: `Error saving subdetail for ${detail.storeName || "new store"}: ${subError.message}`,
              status: "error",
              duration: 4000,
              isClosable: true,
              position: "top-center",
            });
          }
        });
        await Promise.all(subDetailSavePromises);
        if (subdetailSaveError) {
          // If any subdetail save failed, throw the first error
          throw subdetailSaveError;
        }
      } else {
        console.log("No subdetails in edit state to save.");
      }

      // --- Mark Overall Success ---
      success = true; // Only reached if all saves were successful
      console.log("handleSaveEdit completed successfully.");
    } catch (error) {
      // --- Error Handling ---
      console.error("Error during handleSaveEdit:", error);
      toast({
        title: "Error Saving Changes",
        description: `${error.message}`,
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "top-center",
      });
      // success remains false
    } finally {
      // --- Cleanup and Post-Actions ---

      // Reset loading state *unconditionally* to re-enable button
      console.log(
        `Finally block: Resetting isSavingEdit to false. Current success state: ${success}`
      );
      setIsSavingEdit(false);

      // Perform post-save actions ONLY if the entire operation succeeded
      if (success && updatedConsigneeData) {
        console.log("Performing post-success actions...");

        // 1. Close the drawer first
        console.log("Closing edit drawer...");
        closeEditDrawer();

        // 2. Update local state AFTER closing
        console.log("Updating local consignees state...");
        setConsignees((prevConsignees) =>
          prevConsignees.map((c) =>
            c._id === updatedConsigneeData._id ? updatedConsigneeData : c
          )
        );

        // 3. Trigger cleanup AFTER closing
        console.log("Checking for empty entities...");
        checkAndCleanEmptyEntities();

        // 4. Show relevant toasts (moved from try block)
        if (
          subdetailUpdateInfoFromResponse &&
          subdetailUpdateInfoFromResponse.updated
        ) {
          if (subdetailUpdateInfoFromResponse.count > 0) {
            toast({
              title: "Subdetails Updated",
              description: `Updated ${subdetailUpdateInfoFromResponse.count} subdetail(s) consignee from '${subdetailUpdateInfoFromResponse.oldName}' to '${subdetailUpdateInfoFromResponse.newName}'.`,
              status: "success",
              duration: 5000,
              isClosable: true,
              position: "top-center",
            });
          } else {
            toast({
              title: "Subdetail Update Check",
              description: `Consignee name changed, but no associated subdetails needed updating (from '${subdetailUpdateInfoFromResponse.oldName}' to '${subdetailUpdateInfoFromResponse.newName}').`,
              status: "info",
              duration: 5000,
              isClosable: true,
              position: "top-center",
            });
          }
        } else if (
          subdetailUpdateInfoFromResponse &&
          !subdetailUpdateInfoFromResponse.updated
        ) {
          console.log(
            "Subdetail name update was not successful or skipped",
            subdetailUpdateInfoFromResponse
          );
        }
        toast({
          title: "Save Successful",
          description: "Consignee and subdetails updated.",
          status: "success",
          duration: 3000,
          isClosable: true,
          position: "top-center",
        });

        // 5. Trigger data refreshes AFTER closing and state updates
        console.log("Scheduling data refreshes...");
        setTimeout(() => {
          console.log("Executing delayed data refreshes...");
          fetchConsignees();
          updateAmountsWithHighestRate();
          fetchEntitySummariesWithStatus(selectedWaybill);
        }, 150);
      } else {
        console.log(
          "Save operation failed or no data updated, skipping post-success actions."
        );
      }
    }
  };
  const handleDeleteConsignee = async (consignee) => {
    if (
      window.confirm(
        "Are you sure you want to delete this consignee? This will also delete all associated sub details."
      )
    ) {
      try {
        // Get the authentication token from localStorage
        const token = localStorage.getItem("token");
        if (!token) {
          throw new Error(
            "Authentication token not found. Please log in again."
          );
        }

        const response = await fetch(
          `${
            process.env.NEXT_PUBLIC_BACKEND_API
          }/api/consigneeInfo/${encodeURIComponent(
            consignee.waybillNumber
          )}/${encodeURIComponent(consignee.consignee)}`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to delete consignee");
        }

        // Remove from local state immediately to trigger UI update
        const updatedConsignees = consignees.filter(
          (c) =>
            c.consignee !== consignee.consignee ||
            c.waybillNumber !== consignee.waybillNumber
        );
        setConsignees(updatedConsignees);

        // Clear sub details if they were being viewed for this consignee
        if (
          selectedConsignee?.consignee === consignee.consignee &&
          selectedConsignee?.waybillNumber === consignee.waybillNumber
        ) {
          setCurrentConsigneeSubDetails([]);
          setSelectedConsignee(null);
          setIsViewingSubDetails(false);
        }

        // Get the count of remaining consignees for this waybill
        const remainingConsignees = updatedConsignees.filter(
          (c) => c.waybillNumber === consignee.waybillNumber
        );
        const numRemainingConsignees = remainingConsignees.length;

        // Calculate the new adjustment based on the number of remaining consignees
        let newAdjustment = 0;
        if (numRemainingConsignees > 2) {
          newAdjustment = (numRemainingConsignees - 2) * additionalRateValue;
        }

        console.log(
          `After deletion: ${numRemainingConsignees} consignees remain, setting adjustment to ${newAdjustment}`
        );

        // Update state immediately for real-time reflection in UI
        setAdditionalAdjustment(newAdjustment);

        // Then update the database (don't await this to keep UI responsive)
        if (consignee.waybillNumber) {
          saveAdditionalAdjustment(
            consignee.waybillNumber,
            newAdjustment
          ).catch((error) =>
            console.error(
              "Error updating additional adjustment after deletion:",
              error
            )
          );
        }

        // Always update sub waybill number status to UNUSED if present
        if (
          consignee.subWaybillNumber &&
          consignee.subWaybillNumber.trim() !== ""
        ) {
          try {
            console.log(
              `Updating sub waybill ${consignee.subWaybillNumber} status to UNUSED`
            );

            const updateSubWaybillResponse = await fetch(
              `${process.env.NEXT_PUBLIC_BACKEND_API}/api/waybills/number/${consignee.subWaybillNumber}`,
              {
                method: "PUT",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ status: "UNUSED" }),
              }
            );

            if (updateSubWaybillResponse.ok) {
              console.log(
                `Successfully updated sub waybill ${consignee.subWaybillNumber} status to UNUSED`
              );
              toast({
                title: "Status Update",
                description: `Sub waybill ${consignee.subWaybillNumber} status updated to UNUSED`,
                status: "info",
                duration: 3000,
                isClosable: true,
              });
            }
          } catch (updateError) {
            console.error("Error updating sub waybill status:", updateError);
          }
        }

        // Fetch consignees in the background to ensure data consistency
        fetchConsignees();

        toast({
          title: "Success",
          description:
            data.message ||
            "Consignee and associated sub details deleted successfully",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
      } catch (error) {
        console.error("Error deleting consignee:", error);
        toast({
          title: "Error",
          description: error.message || "Failed to delete consignee",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      }
    }
  };

  // Add this function to calculate total used CBM
  const calculateTotalUsedCBM = () => {
    return filteredConsignees.reduce((total, consignee) => {
      return total + (Number(consignee.cbm) || 0);
    }, 0);
  };

  // Add this state to track total used CBM
  const [totalUsedCBM, setTotalUsedCBM] = useState(0);

  // Add useEffect to update total used CBM whenever consignees change
  useEffect(() => {
    const usedCBM = calculateTotalUsedCBM();
    setTotalUsedCBM(usedCBM);
  }, [consignees, selectedWaybill]);

  // Add a new handler for consignee selection
  const handleConsigneeChange = (e) => {
    const selectedConsigneeName = e.target.value;
    const selectedConsignee = consigneeClients.find(
      (consignee) => consignee.consigneeName === selectedConsigneeName
    );

    // Check if the selected consignee has split or payload status in modalFormData
    const isSplit = modalFormData.split === "split";
    const isPayload = modalFormData.payload === "payload";

    // Format the consignee name with the shipper's abbreviation if available
    let formattedConsigneeName = selectedConsigneeName;

    // If we're in split mode, keep original consignee name or use split format
    if (isSplit && selectedConsigneeName) {
      // If we already have a split format, preserve it
      if (selectedConsigneeName.startsWith("split-")) {
        formattedConsigneeName = selectedConsigneeName;
      }
      // Otherwise, keep it as is for now - split format will be applied by handleSplitToggle
    }
    // If we're in payload mode, handle payload format
    else if (isPayload && selectedConsigneeName) {
      // If we already have a payload format, preserve it
      if (selectedConsigneeName.startsWith("payload-")) {
        formattedConsigneeName = selectedConsigneeName;
      }
      // Otherwise, keep it as is for now - payload format will be applied by handlePayloadToggle
    }
    // Normal formatting for regular consignees
    else if (
      shipperEntityAbbreviation &&
      selectedConsigneeName &&
      !isIndividualMode
    ) {
      formattedConsigneeName = `${shipperEntityAbbreviation} - ${selectedConsigneeName}`;
    }

    // Set the modal form data with the selected consignee
    setModalFormData((prevData) => ({
      ...prevData,
      consignee: formattedConsigneeName,
      type: storeType, // Use the current storeType
    }));

    // Also update the shipperFormData with the consignee
    setShipperFormData((prevData) => ({
      ...prevData,
      consignee: formattedConsigneeName,
      consigneeId: selectedConsignee?._id || null, // Store the consignee ID for reference
    }));

    if (selectedConsigneeName) {
      // Show sub details section
      setShowSubDetails(true);

      // Initialize sub details if it's a DC
      if (storeType === "DC") {
        setSubDetails([]);
      }
    } else {
      // Hide sub details section if no consignee is selected
      setShowSubDetails(false);
      setSubDetails([]);
    }
  };

  // Add a useEffect to track changes to consigneeClients
  useEffect(() => {
    console.log("Consignee clients updated:", consigneeClients);
  }, [consigneeClients]);

  // Separate effect to update consignee format when entityAbbreviation changes
  useEffect(() => {
    // Only proceed if we have a shipper entity abbreviation and a consignee
    if (
      shipperEntityAbbreviation &&
      modalFormData.consignee &&
      !isIndividualMode
    ) {
      // Skip if the consignee is already in split or payload format
      if (
        modalFormData.consignee.startsWith("split-") ||
        modalFormData.consignee.startsWith("payload-")
      ) {
        console.log("Preserving special format:", modalFormData.consignee);
        return;
      }

      let cleanConsigneeName = modalFormData.consignee;
      if (modalFormData.consignee.includes(" - ")) {
        // Extract the part after the entity abbreviation
        cleanConsigneeName = modalFormData.consignee.split(" - ")[1].trim();
      }

      // Format with the correct entity abbreviation
      const formattedConsigneeName = `${shipperEntityAbbreviation} - ${cleanConsigneeName}`;

      if (formattedConsigneeName !== modalFormData.consignee) {
        setModalFormData((prev) => ({
          ...prev,
          consignee: formattedConsigneeName,
        }));
      }
    }
  }, [shipperEntityAbbreviation, modalFormData.consignee, isIndividualMode]);
  const saveNewConsignees = async (consigneeName) => {
    try {
      // Check if there's a value in the shipper field
      if (!shipperFormData.shipper) {
        // Try to use any available shipper information
        const potentialShipper =
          shipperFormData.shippers ||
          modalFormData.shipperss ||
          modalFormData.company ||
          shipperFormData.shipperss;

        if (!potentialShipper) {
          // Provide more helpful error message
          toast({
            title: "Shipper Information Required",
            description:
              "Please provide shipper information in the form before saving",
            status: "warning",
            duration: 3000,
            isClosable: true,
            position: "top-center",
          });
          return; // Exit without throwing error
        }

        // Use the potential shipper value we found
        shipperFormData.shipper = potentialShipper;
      }

      // Log the shipper name we're using
      console.log("Using shipper name:", shipperFormData.shipper);

      // Remove any entity abbreviation prefix from consignee name if present
      let cleanConsigneeName = consigneeName;

      // Check if this is a split format, payload format, or regular format
      if (consigneeName.startsWith("split-")) {
        // For split format, keep the entire name as is
        cleanConsigneeName = consigneeName;
        console.log("Preserving split format for saving:", cleanConsigneeName);
      } else if (consigneeName.startsWith("payload-")) {
        // For payload format, keep the entire name as is
        cleanConsigneeName = consigneeName;
        console.log(
          "Preserving payload format for saving:",
          cleanConsigneeName
        );
      } else if (
        shipperEntityAbbreviation &&
        consigneeName.startsWith(`${shipperEntityAbbreviation} - `) &&
        !isIndividualMode
      ) {
        cleanConsigneeName = consigneeName.replace(
          `${shipperEntityAbbreviation} - `,
          ""
        );
        console.log("Removed entity abbreviation, saving:", cleanConsigneeName);
      }

      // Check if consignee already exists
      const exists = consigneeClients.some(
        (client) => client.consigneeName === cleanConsigneeName
      );

      if (exists) {
        return; // Already exists, no need to save
      }

      // Determine if we're in individual or company mode
      if (isIndividualMode) {
        // Save to individual-consignees
        const selectedIndividual = individuals.find(
          (ind) => ind.individualName === shipperFormData.shipper
        );

        if (!selectedIndividual || !selectedIndividual._id) {
          toast({
            title: "Individual Not Found",
            description:
              "Could not find the individual in the system. Please select a valid individual.",
            status: "warning",
            duration: 3000,
            isClosable: true,
            position: "top-center",
          });
          return; // Exit without throwing error
        }

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_API}/api/individual-consignees`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              individualId: selectedIndividual._id,
              name: cleanConsigneeName, // Use clean name without abbreviation
              address: shipperFormData.pickupAddress || "",
              tin: "000-000-000", // Add default TIN as required by the backend
            }),
          }
        );

        if (!response.ok) {
          throw new Error("Failed to save individual consignee");
        }

        const data = await response.json();
        console.log("Saved new individual consignee:", data);

        // Add to local consignee clients list and sort by _id
        setConsigneeClients((prev) => {
          const newList = [
            {
              _id: data._id,
              consigneeName: data.name,
              consigneeBusinessAddress: data.address,
              tin: data.tin,
              consigneeId: data.consigneeId,
            },
            ...prev,
          ];
          // Sort by _id in descending order (latest first)
          return newList.sort((a, b) => b._id.localeCompare(a._id));
        });

        toast({
          title: "Success",
          description: `Added new consignee "${cleanConsigneeName}" under ${shipperFormData.shipper}`,
          status: "success",
          duration: 3000,
          isClosable: true,
          position: "top-center",
        });
      } else {
        // Save to multiple-consignees for companies
        const selectedCompany = companies.find(
          (comp) => comp.companyName === shipperFormData.shipper
        );

        if (!selectedCompany || !selectedCompany._id) {
          toast({
            title: "Company Not Found",
            description:
              "Could not find the company in the system. Please select a valid company.",
            status: "warning",
            duration: 3000,
            isClosable: true,
            position: "top-center",
          });
          return; // Exit without throwing error
        }

        // Get the highest existing consignee ID
        const highestConsigneeResponse = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_API}/api/multiple-consignees?companyId=${selectedCompany._id}&sort=-consigneeID&limit=1`
        );

        // Generate new consignee ID
        let newNumber = 1;
        if (highestConsigneeResponse.ok) {
          const highestConsignee = await highestConsigneeResponse.json();
          if (highestConsignee.length > 0) {
            const lastNumber = parseInt(
              highestConsignee[0].consigneeID.replace("CON", "")
            );
            newNumber = lastNumber + 1;
          }
        }
        const newConsigneeID = `CON${String(newNumber).padStart(6, "0")}`;

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_API}/api/multiple-consignees`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              companyId: selectedCompany._id,
              consigneeID: newConsigneeID,
              consigneeName: cleanConsigneeName, // Use clean name without abbreviation
              consigneeBusinessAddress: selectedCompany.businessAddress || "",
              clientId: selectedCompany._id,
            }),
          }
        );

        if (!response.ok) {
          throw new Error("Failed to save company consignee");
        }

        const data = await response.json();
        console.log("Saved new company consignee:", data);

        // Add to local consignee clients list and sort by _id
        setConsigneeClients((prev) => {
          const newList = [
            {
              _id: data._id,
              consigneeName: data.consigneeName,
              consigneeBusinessAddress: data.consigneeBusinessAddress,
              consigneeID: data.consigneeID,
            },
            ...prev,
          ];
          // Sort by _id in descending order (latest first)
          return newList.sort((a, b) => b._id.localeCompare(a._id));
        });

        toast({
          title: "Success",
          description: `Added new consignee "${cleanConsigneeName}" under ${shipperFormData.shipper}`,
          status: "success",
          duration: 3000,
          isClosable: true,
          position: "top-center",
        });
      }
    } catch (error) {
      console.error("Error saving new consignee:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save new consignee",
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "top-center",
      });
    }
  };
  const saveNewConsignee = async (consigneeName) => {
    try {
      // Check if there's a value in the shipper field
      if (!shipperFormData.shippers) {
        // Try to use any available shipper information
        const potentialShipper =
          shipperFormData.shippers ||
          modalFormData.shipperss ||
          modalFormData.company ||
          shipperFormData.shipperss;

        if (!potentialShipper) {
          // Provide more helpful error message
          toast({
            title: "Shipper Information Required",
            description:
              "Please provide shipper information in the form before saving",
            status: "warning",
            duration: 3000,
            isClosable: true,
            position: "top-center",
          });
          return; // Exit without throwing error
        }

        // Use the potential shipper value we found
        shipperFormData.shippers = potentialShipper;
      }

      // Log the shipper name we're using
      console.log("Using shipper name:", shipperFormData.shippers);

      // Remove any entity abbreviation prefix from consignee name if present
      let cleanConsigneeName = consigneeName;

      // Check if this is a split format, payload format, or regular format
      if (consigneeName.startsWith("split-")) {
        // For split format, keep the entire name as is
        cleanConsigneeName = consigneeName;
        console.log("Preserving split format for saving:", cleanConsigneeName);
      } else if (consigneeName.startsWith("payload-")) {
        // For payload format, keep the entire name as is
        cleanConsigneeName = consigneeName;
        console.log(
          "Preserving payload format for saving:",
          cleanConsigneeName
        );
      } else if (
        shipperEntityAbbreviation &&
        consigneeName.startsWith(`${shipperEntityAbbreviation} - `) &&
        !isIndividualMode
      ) {
        cleanConsigneeName = consigneeName.replace(
          `${shipperEntityAbbreviation} - `,
          ""
        );
        console.log("Removed entity abbreviation, saving:", cleanConsigneeName);
      }

      // Check if consignee already exists
      const exists = consigneeClients.some(
        (client) => client.consigneeName === cleanConsigneeName
      );

      if (exists) {
        return; // Already exists, no need to save
      }

      // Determine if we're in individual or company mode
      if (isIndividualMode) {
        // Save to individual-consignees
        const selectedIndividual = individuals.find(
          (ind) => ind.individualName === shipperFormData.shippers
        );

        if (!selectedIndividual || !selectedIndividual._id) {
          toast({
            title: "Individual Not Found",
            description:
              "Could not find the individual in the system. Please select a valid individual.",
            status: "warning",
            duration: 3000,
            isClosable: true,
            position: "top-center",
          });
          return; // Exit without throwing error
        }

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_API}/api/individual-consignees`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              individualId: selectedIndividual._id,
              name: cleanConsigneeName, // Use clean name without abbreviation
              address: shipperFormData.pickupAddress || "",
              tin: "000-000-000", // Add default TIN as required by the backend
            }),
          }
        );

        if (!response.ok) {
          throw new Error("Failed to save individual consignee");
        }

        const data = await response.json();
        console.log("Saved new individual consignee:", data);

        // Add to local consignee clients list and sort by _id
        setConsigneeClients((prev) => {
          const newList = [
            {
              _id: data._id,
              consigneeName: data.name,
              consigneeBusinessAddress: data.address,
              tin: data.tin,
              consigneeId: data.consigneeId,
            },
            ...prev,
          ];
          // Sort by _id in descending order (latest first)
          return newList.sort((a, b) => b._id.localeCompare(a._id));
        });

        toast({
          title: "Success",
          description: `Added new consignee "${cleanConsigneeName}" under ${shipperFormData.shippers}`,
          status: "success",
          duration: 3000,
          isClosable: true,
          position: "top-center",
        });
      } else {
        // Save to multiple-consignees for companies
        const selectedCompany = companies.find(
          (comp) => comp.companyName === shipperFormData.shippers
        );

        if (!selectedCompany || !selectedCompany._id) {
          toast({
            title: "Company Not Found",
            description:
              "Could not find the company in the system. Please select a valid company.",
            status: "warning",
            duration: 3000,
            isClosable: true,
            position: "top-center",
          });
          return; // Exit without throwing error
        }

        // Get the highest existing consignee ID
        const highestConsigneeResponse = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_API}/api/multiple-consignees?companyId=${selectedCompany._id}&sort=-consigneeID&limit=1`
        );

        // Generate new consignee ID
        let newNumber = 1;
        if (highestConsigneeResponse.ok) {
          const highestConsignee = await highestConsigneeResponse.json();
          if (highestConsignee.length > 0) {
            const lastNumber = parseInt(
              highestConsignee[0].consigneeID.replace("CON", "")
            );
            newNumber = lastNumber + 1;
          }
        }
        const newConsigneeID = `CON${String(newNumber).padStart(6, "0")}`;

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_API}/api/multiple-consignees`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              companyId: selectedCompany._id,
              consigneeID: newConsigneeID,
              consigneeName: cleanConsigneeName, // Use clean name without abbreviation
              consigneeBusinessAddress: selectedCompany.businessAddress || "",
              clientId: selectedCompany._id,
            }),
          }
        );

        if (!response.ok) {
          throw new Error("Failed to save company consignee");
        }

        const data = await response.json();
        console.log("Saved new company consignee:", data);

        // Add to local consignee clients list and sort by _id
        setConsigneeClients((prev) => {
          const newList = [
            {
              _id: data._id,
              consigneeName: data.consigneeName,
              consigneeBusinessAddress: data.consigneeBusinessAddress,
              consigneeID: data.consigneeID,
            },
            ...prev,
          ];
          // Sort by _id in descending order (latest first)
          return newList.sort((a, b) => b._id.localeCompare(a._id));
        });

        toast({
          title: "Success",
          description: `Added new consignee "${cleanConsigneeName}" under ${shipperFormData.shippers}`,
          status: "success",
          duration: 3000,
          isClosable: true,
          position: "top-center",
        });
      }
    } catch (error) {
      console.error("Error saving new consignee:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save new consignee",
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "top-center",
      });
    }
  };
  // Helper function to get minimum date (1 day after date prepared)
  const getMinDateForReceived = () => {
    // If the body type is "6 Wheeler", allow selecting the same date as the dispatch date
    if (shipperFormData.bodyType === "6 Wheeler") {
      console.log("6 Wheeler detected: allowing same day selection");
      const dispatchDate = new Date(shipperFormData.date);
      if (!isNaN(dispatchDate.getTime())) {
        return formatDateForInput(dispatchDate);
      }
    }

    // For all other body types, keep the original behavior (1 day after date prepared)
    const datePrepared = new Date(shipperFormData.datePrepared);
    if (isNaN(datePrepared.getTime())) return "";

    const minDate = new Date(datePrepared);
    minDate.setDate(minDate.getDate() + 1);
    return formatDateForInput(minDate);
  };

  // Add a separate effect that runs when companies data is loaded
  useEffect(() => {
    // Initialize the entityAbbreviation when companies data is first loaded
    const initializeEntityAbbreviation = () => {
      if (!companies || companies.length === 0 || !shipperFormData.shipper)
        return;

      const existingCompany = companies.find(
        (company) => company.companyName === shipperFormData.shipper
      );

      if (existingCompany && existingCompany.entityAbbreviation) {
        console.log(
          "Initializing entity abbreviation:",
          existingCompany.entityAbbreviation
        );
        setShipperEntityAbbreviation(existingCompany.entityAbbreviation);
      }
    };

    initializeEntityAbbreviation();
  }, [companies]); // Only run when companies data changes

  // Function to fetch shipper information including totalTruckCbm
  const fetchShipperInfo = async (waybillNumber, updateState = true) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/shipperInfo/${waybillNumber}`
      );

      if (!response.ok) {
        if (response.status !== 404) {
          // If not a 404 (not found), it's an error
          throw new Error(
            `Error fetching shipper info: ${response.statusText}`
          );
        }
        return null; // Return null for 404 (not found)
      }

      const data = await response.json();

      // If totalTruckCbm exists in the data and updateState is true, update the truckCbm state
      if (updateState && data.totalTruckCbm) {
        setTruckCbm(data.totalTruckCbm);
        setTotalCbmInput(data.totalTruckCbm);
      }

      // Also check the waybill status from waybillSummary API
      try {
        const summaryResponse = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_API}/api/waybillSummary/waybill/${waybillNumber}`
        );

        if (summaryResponse.ok) {
          const summaryData = await summaryResponse.json();
          if (summaryData && summaryData.status === "BILLED") {
            setIsBilledWaybill(true);
            console.log(
              `Waybill ${waybillNumber} is in BILLED status - enabling view-only mode`
            );
          } else {
            setIsBilledWaybill(false);
          }
        }
      } catch (summaryError) {
        console.error("Error fetching waybill status:", summaryError);
      }

      return data;
    } catch (error) {
      console.error("Error fetching shipper info:", error);
      return null;
    }
  };

  // Update useEffect for waybillNumber to fetch shipper info
  useEffect(() => {
    if (waybillNumber) {
      const fetchData = async () => {
        const data = await fetchShipperInfo(waybillNumber);
        if (data) {
          // Update the shipperFormData with the values from the database
          setShipperFormData((prevData) => ({
            ...prevData,
            driverName: data.driverName || prevData.driverName,
            plateNo: data.plateNo || prevData.plateNo,
            bodyType: data.bodyType || prevData.bodyType, // Include bodyType
            stubNumber: data.stubNumber || prevData.stubNumber, // Include stubNumber
            shipper: data.shipper || prevData.shipper,
            date: data.date || prevData.date,
            pickupAddress: data.pickupAddress || prevData.pickupAddress,
            datePrepared: data.datePrepared || prevData.datePrepared,
            storeType: data.storeType || prevData.storeType,
            remarks: data.remarks || prevData.remarks,
            remarks2: data.remarks2 || prevData.remarks2,
            consignee: data.consignee || prevData.consignee, // Add the consignee field
            consigneeId: data.consigneeId || prevData.consigneeId, // Add the consigneeId field
          }));

          // Set shipper info saved flag
          setIsShipperInfoSaved(true);
        }
      };

      fetchData();
    }
  }, [waybillNumber]);

  // Function to update totalTruckCbm directly from the header
  const updateTruckCbmFromHeader = async (newCbmValue) => {
    try {
      // Update the state first for immediate UI feedback
      setTruckCbm(newCbmValue);
      setTotalCbmInput(newCbmValue);

      // Update shipperFormData with the new CBM value
      setShipperFormData((prev) => ({
        ...prev,
        totalTruckCbm: newCbmValue,
      }));

      // If there's no waybill number, we can't update the backend
      if (!waybillNumber) {
        return;
      }

      // Fetch the current shipper info first
      const currentShipperInfo = await fetchShipperInfo(waybillNumber, false);

      if (!currentShipperInfo) {
        throw new Error("Shipper information not found");
      }

      // Prepare the data for the update
      const updateData = {
        ...currentShipperInfo,
        totalTruckCbm: newCbmValue,
        waybillNumber,
      };

      // Format dates to ensure they are in the correct format
      if (updateData.date) {
        updateData.date = new Date(updateData.date).toISOString();
      }

      if (updateData.datePrepared) {
        updateData.datePrepared = new Date(
          updateData.datePrepared
        ).toISOString();
      }

      // Update in the backend
      const response = await fetch(
        process.env.NEXT_PUBLIC_BACKEND_API + "/api/shipperInfo",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updateData),
        }
      );

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Failed to update truck CBM: ${errorData}`);
      }

      // Update all subdetails with the new total CBM
      const updatedSubDetails = subDetails.map((detail) => ({
        ...detail,
        totalCbm: newCbmValue,
      }));
      setSubDetails(updatedSubDetails);

      return true;
    } catch (error) {
      console.error("Error updating truck CBM:", error);
      throw error;
    }
  };

  // Add this function to fetch the saved additional adjustment
  const fetchAdditionalAdjustment = async (waybillNumber) => {
    try {
      if (!waybillNumber) return null;

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/additionalAdjustment/${waybillNumber}`
      );

      if (!response.ok) {
        console.error(
          "Error fetching additional adjustment:",
          response.statusText
        );
        return null;
      }

      const data = await response.json();

      // Store the waybill-specific rate
      if (data.ratePerDrop) {
        setWaybillSpecificRate(data.ratePerDrop);
      }

      return data.adjustment;
    } catch (error) {
      console.error("Error fetching additional adjustment:", error);
      return null;
    }
  };

  // Add this function to save the additional adjustment
  const saveAdditionalAdjustment = async (waybillNumber, adjustment) => {
    try {
      if (!waybillNumber) return null;

      // Include the current rate value if we're creating a new record
      // This ensures new waybills use the current rate value
      const payload = {
        waybillNumber,
        adjustment,
      };

      // If we don't have a stored rate for this waybill yet, include current rate
      if (waybillSpecificRate === null) {
        payload.ratePerDrop = additionalRateValue;
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/additionalAdjustment`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        throw new Error(
          `Failed to save additional adjustment: ${response.statusText}`
        );
      }

      return await response.json();
    } catch (error) {
      console.error("Error saving additional adjustment:", error);
      throw error;
    }
  };

  // Update additional adjustment from header
  const updateAdditionalAdjustmentFromHeader = async (newAdjustment) => {
    try {
      if (!selectedWaybill) {
        throw new Error("No waybill selected");
      }

      // Get current consignees for this waybill to display warning
      const waybillConsignees = consignees.filter(
        (c) => c.waybillNumber === selectedWaybill
      );

      // Check if any consignee has split or payload set
      const hasSplitOrPayload = waybillConsignees.some(
        (c) => c.split === "split" || c.payload === "payload"
      );

      // If any consignee has split or payload, force adjustment to zero
      if (hasSplitOrPayload && newAdjustment > 0) {
        toast({
          title: "Not Allowed",
          description:
            "Additional adjustment cannot be applied when split or payload is used in any consignee.",
          status: "error",
          duration: 5000,
          isClosable: true,
          position: "top-center",
        });

        // Update state with zero adjustment
        setAdditionalAdjustment(0);

        // Save zero adjustment to backend
        await saveAdditionalAdjustment(selectedWaybill, 0);

        // Update total rate
        setTotalRate(highestRate);

        return false;
      }

      const numConsignees = waybillConsignees.length;
      // Use waybill-specific rate if available, otherwise use current global rate
      const rateToUse =
        waybillSpecificRate !== null
          ? waybillSpecificRate
          : additionalRateValue;

      const calculatedAdjustment =
        !hasSplitOrPayload && numConsignees > 2
          ? (numConsignees - 2) * rateToUse
          : 0;

      // Show warning if manual adjustment differs from calculated adjustment
      if (calculatedAdjustment !== newAdjustment) {
        toast({
          title: "Warning",
          description: `You are manually setting the adjustment to ${newAdjustment}. The system would normally calculate ${calculatedAdjustment} based on ${numConsignees} consignees.`,
          status: "warning",
          duration: 5000,
          isClosable: true,
          position: "top-center",
        });
      }

      // Update state first for immediate UI feedback
      setAdditionalAdjustment(newAdjustment);

      // Save the adjustment to backend
      await saveAdditionalAdjustment(selectedWaybill, newAdjustment);

      // Update total rate
      setTotalRate(highestRate + newAdjustment);

      return true;
    } catch (error) {
      console.error("Error updating additional adjustment:", error);
      throw error;
    }
  };

  // Function to fetch entity abbreviation summaries with status
  const fetchEntitySummariesWithStatus = async (waybillNumber) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/entity-abbreviation-summary/waybill/${waybillNumber}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch entity abbreviation summaries");
      }
      const data = await response.json();
      console.log("Fetched entity summaries with status:", data);
      return data;
    } catch (error) {
      console.error("Error fetching entity summaries:", error);
      return [];
    }
  };

  // Update the calculateTotalsByEntityAbbreviation function to respect the existing status
  const calculateTotalsByEntityAbbreviation = async (
    consignees,
    waybillNumber,
    existingEntitySummaries = [],
    roundedEntities = new Set() // New parameter
  ) => {
    try {
      console.log(
        "Starting calculateTotalsByEntityAbbreviation with rounded entities:",
        Array.from(roundedEntities)
      );

      // Filter consignees for the current waybill
      const filteredConsignees = consignees.filter(
        (c) => c.waybillNumber === waybillNumber
      );

      // Fetch sub-details for this waybill
      const subDetails = await fetchSubDetails(waybillNumber);

      // Create a master totals object to store our final results
      const masterTotals = {};

      // Create a mapping from consignee name to its entity abbreviation
      const consigneeToEntityAbbr = {};

      // Create a mapping of existing entity summaries by abbreviation to preserve their status
      const existingEntityMap = {};

      // Only consider entities that aren't already rounded from our exclude list
      existingEntitySummaries.forEach((summary) => {
        const entityAbbr = summary.entityAbbreviation;

        // Skip adding rounded entities to our local map if they're in the exclude list
        if (roundedEntities.has(entityAbbr)) {
          console.log(
            `Skipping rounded entity ${entityAbbr} entirely from recalculation`
          );
          return;
        }

        existingEntityMap[entityAbbr] = summary;
      });

      // Track which consignees have sub-details
      const consigneesWithSubDetails = new Set();

      // Process main consignees and build the mapping
      filteredConsignees.forEach((consignee) => {
        const fullName = consignee.consignee || "";
        const entityAbbr = fullName.split(" - ")[0].trim();

        // Store the mapping of full consignee name to entity abbreviation
        consigneeToEntityAbbr[consignee.consignee] = entityAbbr;
      });

      // First identify which consignees have sub-details - MODIFIED to use withSubDetails flag
      if (subDetails && subDetails.length > 0) {
        // Add consignees from sub-details
        subDetails.forEach((subDetail) => {
          consigneesWithSubDetails.add(subDetail.consignee);
        });

        // Also add consignees that have withSubDetails=true but might not have actual sub-details yet
        filteredConsignees.forEach((consignee) => {
          if (consignee.withSubDetails === true) {
            consigneesWithSubDetails.add(consignee.consignee);
            console.log(
              `Adding ${consignee.consignee} to consigneesWithSubDetails based on withSubDetails flag`
            );
          }
        });
      }

      // Handle consignees without sub-details
      filteredConsignees.forEach((consignee) => {
        const fullName = consignee.consignee || "";
        const entityAbbr = fullName.split(" - ")[0].trim();

        // Skip if this entity is in our exclude list
        if (roundedEntities.has(entityAbbr)) {
          console.log(
            `Skipping ${consignee.consignee} from calculation because entity ${entityAbbr} is excluded`
          );
          return;
        }

        // Skip if this consignee has sub-details (we'll count those instead)
        if (consigneesWithSubDetails.has(consignee.consignee)) {
          console.log(
            `Skipping consignee ${consignee.consignee} because it has withSubDetails=true or actual sub-details`
          );
          return;
        }

        // Initialize entity in master totals if needed
        if (!masterTotals[entityAbbr]) {
          masterTotals[entityAbbr] = {
            totalAmount: 0,
            totalPercentage: 0,
            count: 0,
            items: {}, // Keep items for UI display
            status: "calculated", // Default status for new entities
          };
        }

        // Add to totals
        const amount = parseFloat(consignee.amount || 0);
        const percentage = parseFloat(consignee.percentage || 0);

        masterTotals[entityAbbr].totalAmount += amount;
        masterTotals[entityAbbr].totalPercentage += percentage;
        masterTotals[entityAbbr].count += 1;

        // Add items for display purposes
        if (!masterTotals[entityAbbr].items[consignee.consignee]) {
          masterTotals[entityAbbr].items[consignee.consignee] = {
            amount: parseFloat(consignee.amount || 0),
            percentage: parseFloat(consignee.percentage || 0),
            count: 1,
          };
        } else {
          masterTotals[entityAbbr].items[consignee.consignee].amount +=
            parseFloat(consignee.amount || 0);
          masterTotals[entityAbbr].items[consignee.consignee].percentage +=
            parseFloat(consignee.percentage || 0);
          masterTotals[entityAbbr].items[consignee.consignee].count += 1;
        }
      });

      // Process sub-details - MODIFIED to handle consignees with withSubDetails=true
      if (subDetails && subDetails.length > 0) {
        // Group subdetails by store entity abbreviation
        const subDetailsByEntity = {};

        // Group the sub-details by consignee first
        const subDetailsByConsignee = {};
        subDetails.forEach((subDetail) => {
          if (!subDetailsByConsignee[subDetail.consignee]) {
            subDetailsByConsignee[subDetail.consignee] = [];
          }
          subDetailsByConsignee[subDetail.consignee].push(subDetail);
        });

        // Process each consignee with withSubDetails=true
        filteredConsignees.forEach((consignee) => {
          if (!consigneesWithSubDetails.has(consignee.consignee)) {
            return; // Skip consignees without sub-details
          }

          // Skip if this entity is in our exclude list
          const entityAbbr = consigneeToEntityAbbr[consignee.consignee];
          if (roundedEntities.has(entityAbbr)) {
            console.log(
              `Skipping ${consignee.consignee} from sub-detail processing because entity ${entityAbbr} is excluded`
            );
            return;
          }

          const consigneeSubDetails =
            subDetailsByConsignee[consignee.consignee] || [];

          // If the consignee has withSubDetails=true but no actual sub-details,
          // use the consignee data directly instead of creating a separate entity
          if (
            consignee.withSubDetails === true &&
            consigneeSubDetails.length === 0
          ) {
            console.log(
              `Consignee ${consignee.consignee} has withSubDetails=true but no actual sub-details - using consignee data directly`
            );

            // Initialize entity in master totals if needed
            if (!masterTotals[entityAbbr]) {
              masterTotals[entityAbbr] = {
                totalAmount: 0,
                totalPercentage: 0,
                count: 0,
                items: {}, // Keep items for UI display
                status: "calculated",
              };
            }

            // Add to totals using the main consignee data
            const amount = parseFloat(consignee.amount || 0);
            const percentage = parseFloat(consignee.percentage || 0);

            masterTotals[entityAbbr].totalAmount += amount;
            masterTotals[entityAbbr].totalPercentage += percentage;
            masterTotals[entityAbbr].count += 1;

            // Add item for UI display
            if (!masterTotals[entityAbbr].items[consignee.consignee]) {
              masterTotals[entityAbbr].items[consignee.consignee] = {
                amount: amount,
                percentage: percentage,
                count: 1,
                hasSubDetailsFlag: true, // Mark that this is from a consignee with withSubDetails=true
              };
            } else {
              masterTotals[entityAbbr].items[consignee.consignee].amount +=
                amount;
              masterTotals[entityAbbr].items[consignee.consignee].percentage +=
                percentage;
              masterTotals[entityAbbr].items[consignee.consignee].count += 1;
            }
          }
        });

        // Now process the actual sub-details
        subDetails.forEach((subDetail) => {
          const consigneeName = subDetail.consignee;
          const storeName = subDetail.storeName?.trim() || "";
          const amount = parseFloat(subDetail.amount || 0);
          const percentage = parseFloat(subDetail.percentage || 0);

          // Extract entity abbreviation from store name if available
          // Otherwise use the parent consignee's entity abbreviation
          let storeEntityAbbr;

          if (storeName.includes(" - ")) {
            // Get entity abbreviation directly from store name
            storeEntityAbbr = storeName.split(" - ")[0].trim();
          } else {
            // Fallback to parent consignee's entity abbreviation
            storeEntityAbbr =
              consigneeToEntityAbbr[consigneeName] ||
              (consigneeName.includes(" - ")
                ? consigneeName.split(" - ")[0].trim()
                : "UNKNOWN");
          }

          // Skip if this entity is in our exclude list
          if (roundedEntities.has(storeEntityAbbr)) {
            console.log(
              `Skipping subdetail ${storeName} from calculation because entity ${storeEntityAbbr} is excluded`
            );
            return;
          }

          // Initialize entity grouping if needed
          if (!subDetailsByEntity[storeEntityAbbr]) {
            subDetailsByEntity[storeEntityAbbr] = [];
          }

          // Add to the entity group
          subDetailsByEntity[storeEntityAbbr].push({
            ...subDetail,
            entityAbbr: storeEntityAbbr,
            amount,
            percentage,
          });
        });

        // Process each entity group for actual sub-details
        Object.entries(subDetailsByEntity).forEach(([entityAbbr, details]) => {
          // Skip if this entity is in our exclude list
          if (roundedEntities.has(entityAbbr)) {
            return;
          }

          // Initialize entity in master totals if needed
          if (!masterTotals[entityAbbr]) {
            masterTotals[entityAbbr] = {
              totalAmount: 0,
              totalPercentage: 0,
              count: 0,
              items: {}, // Keep items for UI display
              status: "calculated",
            };
          }

          // Process each subdetail
          details.forEach((subDetail) => {
            const storeName = subDetail.storeName?.trim() || "Unknown Store";
            const amount = subDetail.amount;
            const percentage = subDetail.percentage;

            // Add to entity totals
            masterTotals[entityAbbr].totalAmount += amount;
            masterTotals[entityAbbr].totalPercentage += percentage;
            masterTotals[entityAbbr].count += 1;

            // Add item for UI display
            if (!masterTotals[entityAbbr].items[storeName]) {
              masterTotals[entityAbbr].items[storeName] = {
                amount: amount,
                percentage: percentage,
                count: 1,
                parentConsignee: subDetail.consignee,
              };
            } else {
              masterTotals[entityAbbr].items[storeName].amount += amount;
              masterTotals[entityAbbr].items[storeName].percentage +=
                percentage;
              masterTotals[entityAbbr].items[storeName].count += 1;
            }
          });
        });
      }

      // Log the final totals for debugging
      console.log(
        "Final Entity Abbreviation Totals (excluding rounded entities):",
        masterTotals
      );

      // Save the master totals to the database
      try {
        // Convert masterTotals to array format for the API
        const summariesToSave = Object.entries(masterTotals).map(
          ([entityAbbreviation, data]) => ({
            waybillNumber,
            // Include subWaybillNumber from consignees with this entity
            subWaybillNumber:
              filteredConsignees.find((c) =>
                c.consignee.startsWith(entityAbbreviation)
              )?.subWaybillNumber || "",
            entityAbbreviation,
            totalAmount: Number(data.totalAmount.toFixed(2)),
            totalPercentage: Number(data.totalPercentage.toFixed(2)),
            status: data.status || "calculated",
            // Include split and payload flags
            split:
              filteredConsignees.find(
                (c) => c.consignee.startsWith(entityAbbreviation) && c.split
              )?.split || "",
            payload:
              filteredConsignees.find(
                (c) => c.consignee.startsWith(entityAbbreviation) && c.payload
              )?.payload || "",
          })
        );

        if (summariesToSave.length > 0) {
          console.log(
            `Saving ${summariesToSave.length} non-rounded entity summaries`
          );

          // Use individual POST method instead of batch to avoid deleting rounded entities
          for (const summary of summariesToSave) {
            try {
              const response = await fetch(
                `${process.env.NEXT_PUBLIC_BACKEND_API}/api/entity-abbreviation-summary`,
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify(summary),
                }
              );

              if (!response.ok) {
                console.warn(
                  `Warning: Failed to save entity ${summary.entityAbbreviation}`
                );
              } else {
                console.log(
                  `Successfully saved entity ${summary.entityAbbreviation}`
                );
              }
            } catch (entityError) {
              console.error(
                `Error saving entity ${summary.entityAbbreviation}:`,
                entityError
              );
            }
          }

          console.log("Successfully saved all non-rounded entity summaries");
        } else {
          console.log("No non-rounded entity summaries to save");
        }
      } catch (error) {
        // Log the error but don't rethrow it since this isn't critical for UI functionality
        console.warn(
          "Warning: Could not save entity abbreviation summaries",
          error
        );
      }

      // Maintain the existing return structure for compatibility
      const consigneeTotals = {};
      const subDetailTotals = {};

      // Convert master totals to the existing structure for backwards compatibility
      Object.entries(masterTotals).forEach(([entityAbbr, data]) => {
        consigneeTotals[entityAbbr] = {
          totalAmount: Number(data.totalAmount.toFixed(2)), // Ensure proper rounding
          totalPercentage: Number(data.totalPercentage.toFixed(2)), // Ensure proper rounding
          count: data.count,
          items: data.items, // Include items for UI display
          type: "consignee",
          status: data.status || "calculated",
        };

        subDetailTotals[entityAbbr] = {
          totalAmount: Number(data.totalAmount.toFixed(2)), // Ensure proper rounding
          totalPercentage: Number(data.totalPercentage.toFixed(2)), // Ensure proper rounding
          count: data.count,
          items: data.items, // Include items for UI display
          type: "subDetail",
          consignees: {},
          status: data.status || "calculated",
        };
      });

      return { consigneeTotals, subDetailTotals, masterTotals };
    } catch (error) {
      console.error("Error in calculateTotalsByEntityAbbreviation:", error);
      // Return empty objects to prevent further errors
      return {
        consigneeTotals: {},
        subDetailTotals: {},
        masterTotals: {},
      };
    }
  };

  // Fix Rate Consignee Drawer
  const [isFixRateDrawerOpen, setIsFixRateDrawerOpen] = useState(false);
  const [isEditingFixRate, setIsEditingFixRate] = useState(false);
  const [fixedRate, setFixedRate] = useState(0);
  const [handleSaveFixRate, setHandleSaveFixRate] = useState(null);

  const closeFixRateDrawer = () => {
    setIsFixRateDrawerOpen(false);
    setIsEditingFixRate(false);
    setFixedRate(0);
    setHandleSaveFixRate(null);
  };

  // Add Delete All functionality
  const handleDeleteAll = async () => {
    try {
      setIsSaving(true);

      // Get the authentication token from localStorage
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Authentication token not found. Please log in again.");
      }

      // Delete shipper info
      try {
        await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_API}/api/shipperInfo/${selectedWaybill}`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        console.log(`Deleted shipper info for waybill ${selectedWaybill}`);
      } catch (error) {
        console.error("Error deleting shipper info:", error);
        // Continue with other deletions even if shipper deletion fails
      }

      // Delete all consignees
      const consigneesList = filteredConsignees;
      for (const consignee of consigneesList) {
        try {
          await fetch(
            `${process.env.NEXT_PUBLIC_BACKEND_API}/api/consigneeInfo/${selectedWaybill}/${encodeURIComponent(consignee.consignee)}`,
            {
              method: "DELETE",
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );
          console.log(`Deleted consignee ${consignee.consignee}`);
        } catch (error) {
          console.error("Error deleting consignee:", error);
        }
      }

      // Delete entity abbreviation summaries
      try {
        await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_API}/api/entityAbbreviationSummary/waybill/${selectedWaybill}`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        console.log(
          `Deleted entity abbreviation summaries for waybill ${selectedWaybill}`
        );
      } catch (error) {
        console.error("Error deleting entity abbreviation summaries:", error);
      }

      // Reset state
      setShipperFormData({
        waybillNumber: selectedWaybill,
        referenceNumber: "",
        driverName: "",
        plateNo: "",
        shipper: "",
        date: new Date().toISOString().split("T")[0],
        pickupAddress: "",
        datePrepared: new Date().toISOString().split("T")[0],
        storeType: "STORE",
      });
      setConsignees([]);
      setIsShipperInfoSaved(false);

      // Refresh data
      await fetchConsignees();

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
      setIsSaving(false);
    }
  };

  // Add useEffect to handle URL parameters
  useEffect(() => {
    const { drawer, editConsignee, waybillNumber, view } = router.query;

    // Skip if we're in the middle of saving
    if (isSavingEdit) return;

    // Only process if we're in waybillbody view
    if (view === "waybillbody") {
      if (drawer === "add" && waybillNumber) {
        // Re-open add drawer with saved state
        if (!isDrawerOpen) {
          openDrawer();
        }
      } else if (drawer === "edit" && editConsignee && waybillNumber) {
        // Re-open edit drawer with saved state
        const consigneeToEdit = consignees.find(
          (c) =>
            c.consignee === editConsignee && c.waybillNumber === waybillNumber
        );
        if (consigneeToEdit && !isEditDrawerOpen) {
          handleEditConsignee(consigneeToEdit);
        }
      }
    }
  }, [router.query, consignees, isSavingEdit]);

  // Add closeEditDrawer function
  const closeEditDrawer = () => {
    console.log(">>> [closeEditDrawer] Setting isEditDrawerOpen to FALSE");
    setIsEditDrawerOpen(false);
    setEditFormData({}); // Reset form data
    setEditSubDetails([]); // Reset subdetails
    console.log(">>> [closeEditDrawer] Removing query parameters...");
    // Remove the editConsignee query parameter (keep this if needed)
    const query = { ...router.query };
    delete query.editConsignee;
    delete query.drawer;
    router.replace({ pathname: router.pathname, query }, undefined, {
      shallow: true,
    });
    console.log(">>> [closeEditDrawer] Finished.");
    // REMOVED checkAndCleanEmptyEntities() call from here
  };

  const checkAndCleanEmptyEntities = async () => {
    if (!selectedWaybill) return; // Need a waybill number

    console.log(
      `Checking for empty entity summaries for waybill: ${selectedWaybill}`
    );

    try {
      // 1. Fetch current entity summaries
      const summaryRes = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/entity-abbreviation-summary/waybill/${selectedWaybill}`
      );
      if (!summaryRes.ok) {
        console.error("Failed to fetch entity summaries for cleanup check");
        return;
      }
      const summaries = await summaryRes.json();

      if (summaries.length === 0) {
        console.log("No entity summaries found, no cleanup needed.");
        return;
      }

      // 2. Fetch current consignees to count items
      const consigneeRes = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/consigneeInfo/${selectedWaybill}`
      );
      if (!consigneeRes.ok) {
        console.error("Failed to fetch consignees for cleanup check");
        return;
      }
      const currentConsignees = await consigneeRes.json();

      // Improved entity item counting
      // Group consignees by entity abbreviation using a more robust method
      const entityItemCounts = {};

      // Extract entity the same way the rest of the application does
      const extractEntityAbbr = (name) => {
        if (!name) return null;

        // Check if it's a special format like split/payload
        const specialMatch = name.match(/^(split|payload)-\d+\(([^)]+)\)/i);
        if (specialMatch) {
          // For special formats, use the whole format as the entity abbreviation
          return specialMatch[0].split(" ")[0].toUpperCase(); // e.g., "SPLIT-1(ENTITY)"
        } else {
          // For normal format, extract the entity abbreviation before the dash
          const normalMatch = name.match(/^([^-\s]+)/);
          return normalMatch ? normalMatch[0].trim().toUpperCase() : null;
        }
      };

      // Count consignees per entity
      currentConsignees.forEach((consignee) => {
        if (!consignee.consignee) return;

        const entityAbbr = extractEntityAbbr(consignee.consignee);

        if (entityAbbr) {
          if (!entityItemCounts[entityAbbr]) {
            entityItemCounts[entityAbbr] = 0;
          }
          entityItemCounts[entityAbbr]++;
          console.log(
            `Counted consignee "${consignee.consignee}" as entity "${entityAbbr}"`
          );
        }
      });

      console.log("Entity item counts:", entityItemCounts);

      // Additional verification step:
      // Check if entity abbreviations from summaries match the format in consignees
      for (const summary of summaries) {
        const summaryEntityAbbr = summary.entityAbbreviation;

        // If the summary doesn't exist in our count, do a secondary check
        // for special formatting cases or case-sensitivity issues
        if (!entityItemCounts[summaryEntityAbbr] && summaryEntityAbbr) {
          // Look for variant forms (case insensitive search)
          const casedKey = Object.keys(entityItemCounts).find(
            (key) => key.toUpperCase() === summaryEntityAbbr.toUpperCase()
          );

          if (casedKey) {
            // Found a match with different casing
            console.log(
              `Found case-sensitive match: ${summaryEntityAbbr} -> ${casedKey}`
            );
            entityItemCounts[summaryEntityAbbr] = entityItemCounts[casedKey];
          } else {
            // Look for it as a prefix in any consignee name as a last resort
            const exactConsigneeCount = currentConsignees.filter(
              (c) =>
                c.consignee &&
                c.consignee
                  .toUpperCase()
                  .startsWith(summaryEntityAbbr.toUpperCase())
            ).length;

            if (exactConsigneeCount > 0) {
              console.log(
                `Found prefix match for ${summaryEntityAbbr}: ${exactConsigneeCount} consignees`
              );
              entityItemCounts[summaryEntityAbbr] = exactConsigneeCount;
            }
          }
        }
      }

      console.log(
        "Final entity item counts after verification:",
        entityItemCounts
      );

      // 4. Identify and delete empty entities
      for (const summary of summaries) {
        const entityAbbr = summary.entityAbbreviation;
        // Get count from our improved counting method
        const count = entityItemCounts[entityAbbr] || 0;

        console.log(`Entity: ${entityAbbr}, Consignee Count: ${count}`);

        if (count === 0) {
          console.log(`Entity ${entityAbbr} has 0 items. Deleting...`);

          // Final safety check: verify there are truly no consignees for this entity
          const anyConsigneeMatches = currentConsignees.some(
            (c) =>
              c.consignee &&
              (c.consignee.toUpperCase().startsWith(entityAbbr.toUpperCase()) ||
                c.consignee
                  .toUpperCase()
                  .includes(`(${entityAbbr.toUpperCase()})`))
          );

          if (anyConsigneeMatches) {
            console.log(
              `SAFETY CHECK: Found consignee matches for ${entityAbbr}, NOT deleting`
            );
            toast({
              title: "Delete Prevented",
              description: `Found consignees that may belong to '${entityAbbr}', so it was not deleted.`,
              status: "warning",
              duration: 4000,
              isClosable: true,
              position: "top-center",
            });
            continue;
          }

          try {
            const deleteRes = await fetch(
              `${process.env.NEXT_PUBLIC_BACKEND_API}/api/entity-abbreviation-summary/${selectedWaybill}/${entityAbbr}`,
              {
                method: "DELETE",
              }
            );

            if (deleteRes.ok) {
              console.log(`Successfully deleted empty entity: ${entityAbbr}`);
              toast({
                title: "Empty Entity Removed",
                description: `Removed summary for '${entityAbbr}' as it had no associated items.`,
                status: "info",
                duration: 4000,
                isClosable: true,
                position: "top-center",
              });
              // Refresh entity summaries display immediately
              fetchEntitySummariesWithStatus(selectedWaybill);
            } else {
              const errorData = await deleteRes.json();
              console.error(
                `Failed to delete empty entity ${entityAbbr}:`,
                errorData.message
              );
              toast({
                title: "Deletion Error",
                description: `Failed to remove summary for '${entityAbbr}'. ${errorData.message}`,
                status: "error",
                duration: 5000,
                isClosable: true,
                position: "top-center",
              });
            }
          } catch (deleteError) {
            console.error(
              `Network error deleting empty entity ${entityAbbr}:`,
              deleteError
            );
            toast({
              title: "Network Error",
              description: `Could not delete summary for '${entityAbbr}'.`,
              status: "error",
              duration: 5000,
              isClosable: true,
              position: "top-center",
            });
          }
        } else {
          console.log(`Entity ${entityAbbr} has ${count} items. Keeping it.`);
        }
      }
      // Refresh consignees as well, in case an entity deletion affects other calculations
      fetchConsignees();
    } catch (error) {
      console.error("Error during empty entity cleanup:", error);
      toast({
        title: "Cleanup Error",
        description: "An error occurred while checking for empty summaries.",
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "top-center",
      });
    }
  };

  // Function to fetch consignees for a shipper (by company name)
  const fetchConsigneesForShipper = async (shipperName) => {
    if (!shipperName) {
      console.log("No shipper name provided");
      return [];
    }

    try {
      // First, find the company by name to get its ID
      const companyResponse = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/companies/search?name=${encodeURIComponent(shipperName)}`
      );

      if (!companyResponse.data || companyResponse.data.length === 0) {
        console.log("No company found with name:", shipperName);
        return [];
      }

      const company = companyResponse.data[0];
      console.log("Found company:", company);

      // Then fetch all consignees for this company from MultipleConsignee model
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/multiple-consignees/byCompany/${company._id}`
      );

      console.log("Fetched consignees for company:", response.data);

      if (response.data && Array.isArray(response.data)) {
        return response.data;
      } else {
        return [];
      }
    } catch (error) {
      console.error("Error fetching consignees for shipper:", error);
      toast({
        title: "Error",
        description: "Failed to load consignees for selected shipper",
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "top-center",
      });
      return [];
    }
  };
  const closeEditDrawer2 = () => {
    // First set the drawer state to false
    setIsEditDrawerOpen(false);

    // Then update the URL
    router.push(
      {
        pathname: router.pathname,
        query: {
          ...router.query,
          drawer: undefined,
          editConsignee: undefined,
          view: "waybillbody",
          modal: "drops",
          waybillNumber: selectedWaybill,
        },
      },
      undefined,
      { shallow: true }
    );
  };

  useEffect(() => {
    const { editConsignee, drawer } = router.query;
    if (editConsignee && drawer === "edit" && !isEditDrawerOpen) {
      // Find the consignee data and open the drawer if not already open
      const consigneeToEdit = consignees.find((c) => c._id === editConsignee);
      if (consigneeToEdit) {
        console.log(
          ">>> [useEffect router.query] Drawer should open based on URL query."
        );
        // handleEditConsignee(consigneeToEdit); // Avoid calling the full function, just set state
        setEditFormData({ ...consigneeToEdit });
        // Fetch subdetails if applicable
        if (consigneeToEdit.type === "DC" || consigneeToEdit.withSubDetails) {
          fetchSubDetailsForEdit(
            consigneeToEdit.waybillNumber,
            consigneeToEdit.consignee
          );
        }
        console.log(
          ">>> [useEffect router.query] Setting isEditDrawerOpen to TRUE based on URL"
        );
        setIsEditDrawerOpen(true);
      } else {
        console.log(
          ">>> [useEffect router.query] editConsignee in URL but not found in local state."
        );
      }
    } else if (!editConsignee && isEditDrawerOpen) {
      // If the query param is removed but the drawer is open, close it
      // This handles browser back button etc.
      // console.log(
      //   ">>> [useEffect router.query] URL param removed, ensuring drawer is closed."
      // );
      // closeEditDrawer(); // Careful: This might cause loops if closeEditDrawer also modifies the router
    }
  }, [router.query, consignees, isEditDrawerOpen]); // Add isEditDrawerOpen dependency

  // Add this state near other state declarations
  const [isBilledWaybill, setIsBilledWaybill] = useState(false);
  const [isDuplicateViewOnly, setIsDuplicateViewOnly] = useState(false); // New state for duplicate view-only

  // Combine the two view-only conditions
  const isViewOnly = isBilledWaybill || isDuplicateViewOnly;

  // Handler for status change from EntityAbbreviationSummary
  const handleViewOnlyStatusChange = (duplicateViewOnlyStatus) => {
    setIsDuplicateViewOnly(duplicateViewOnlyStatus);
  };
  useEffect(() => {
    if (isDrawerOpen && isCbmFull()) {
      closeDrawer();
    }
  }, [isDrawerOpen, consignees, truckCbm, totalCbmInput]);

  return (
    <Box
      minH="100vh"
      p={8}
      bg={lightBg}
      display="flex"
      flexDirection="column"
      overflow="hidden"
      maxW="1600px"
      mx="auto"
    >
      {/* Display BILLED status notification if applicable */}
      {isBilledWaybill && (
        <Box
          width="100%"
          bg="green.100"
          color="green.800"
          p={3}
          mb={4}
          borderRadius="md"
          boxShadow="sm"
          textAlign="center"
          fontWeight="bold"
        >
          BILLED - VIEW ONLY
        </Box>
      )}

      {/* Header Section Component */}
      <WaybillHeader
        primaryColor={primaryColor}
        secondaryColor={secondaryColor}
        borderColor={borderColor}
        isUpdatingAmounts={isUpdatingAmounts}
        selectedWaybill={selectedWaybill}
        truckCbm={truckCbm}
        totalPercentage={totalPercentage}
        highestRate={highestRate}
        additionalAdjustment={additionalAdjustment}
        totalRate={totalRate}
        totalAmount={totalAmount}
        formatNumberWithCommas={formatNumberWithCommas}
        onTruckCbmUpdate={updateTruckCbmFromHeader}
        onAdditionalAdjustmentUpdate={updateAdditionalAdjustmentFromHeader}
        totalConsigneeCbm={totalUsedCBM}
      />

      {/* Entity Abbreviation Summary Component */}
      <EntityAbbreviationSummary
        selectedWaybill={selectedWaybill}
        entityTotals={entityTotals}
        roundEntityPercentages={roundEntityPercentages}
        borderColor={borderColor}
        totalRate={totalRate}
        onResetCalculation={() => {
          console.log("Refreshing calculations after entity status reset");
          updateAmountsWithHighestRate();
        }}
        isViewOnly={isBilledWaybill} // Pass the original BILLED status here
        onViewOnlyStatusChange={handleViewOnlyStatusChange} // Pass the handler
      />

      {/* Modal - Remove this section or keep hidden */}
      <Modal isOpen={false} onClose={onClose} size="5xl" display="none">
        <ModalOverlay bg="blackAlpha.300" backdropFilter="blur(10px)" />
        <ModalContent maxH="90vh" overflowY="auto">
          {/* Modal content (keeping for reference) */}
        </ModalContent>
      </Modal>
      <Grid templateColumns="repeat(2, 1fr)" gap={8} flex="1">
        {/* Left Grid Item - Shipper Information */}
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
            consigneeClients={consigneeClients}
            shipperEntityAbbreviation={shipperEntityAbbreviation}
            saveNewConsignees={saveNewConsignees}
            handleConsigneeChange={handleConsigneeChange}
            isViewOnly={isBilledWaybill}
          />
        </GridItem>

        {/* Right Grid Item - Consignee Information */}
        <GridItem>
          <ConsigneeInformation
            primaryColor={primaryColor}
            secondaryColor={secondaryColor}
            borderColor={borderColor}
            isShipperInfoSaved={isShipperInfoSaved}
            currentShipperName={shipperFormData.shipper} // Pass current shipper name
            isCbmFull={isCbmFull}
            openDrawer={openDrawer}
            filteredConsignees={filteredConsignees}
            formatDate={formatDate}
            formatNumberWithCommas={formatNumberWithCommas}
            handleViewSubDetails={handleViewSubDetails}
            handleEditConsignee={handleEditConsignee}
            handleDeleteConsignee={handleDeleteConsignee}
            updateAmountsWithHighestRate={updateAmountsWithHighestRate}
            onDeleteAllAlertOpen={onDeleteAllAlertOpen}
            waybillNumber={waybillNumber}
            isViewOnly={isViewOnly} // Pass the combined isViewOnly here
          />
        </GridItem>
      </Grid>

      {/* Drawer for Adding Consignee */}
      <ConsigneeDrawer
        isDrawerOpen={isDrawerOpen}
        closeDrawer={closeDrawer}
        primaryColor={primaryColor}
        secondaryColor={secondaryColor}
        borderColor={borderColor}
        modalFormData={modalFormData}
        handleModalChange={handleModalChange}
        getMinDateForReceived={getMinDateForReceived}
        shipperFormData={shipperFormData}
        isIndividualMode={isIndividualMode}
        handleIndividualChanges={handleIndividualChanges}
        handleShipperChanges={handleShipperChanges}
        handleConsigneeChange={handleConsigneeChange}
        consigneeClients={consigneeClients}
        checkConsigneeExists={checkConsigneeExists}
        shipperEntityAbbreviation={shipperEntityAbbreviation}
        saveNewConsignee={saveNewConsignee}
        toast={toast}
        showSubDetails={showSubDetails}
        storeType={storeType}
        isDcMode={isDcMode}
        setIsDcMode={setIsDcMode}
        setStoreType={setStoreType}
        setModalFormData={setModalFormData}
        customTotalCbm={customTotalCbm}
        calculateRemainingCbm={calculateRemainingCbm}
        handleCustomTotalCbmChange={handleCustomTotalCbmChange}
        isStoreSubDetailMode={isStoreSubDetailMode}
        subDetails={subDetails}
        setSubDetails={setSubDetails}
        SearchableSelect={SearchableSelect}
        storeNames={storeNames}
        handleSubDetailChange={handleSubDetailChange}
        handleSaveModal={handleSaveModal}
        handleAddDCSubDetail={handleAddDCSubDetail}
        handleAddStoreSubDetail={handleAddStoreSubDetail}
        handleSaveDC={handleSaveDC}
        handleSaveStore={handleSaveStore}
        individuals={individuals}
        companies={companies}
        FormattedNumberInput={FormattedNumberInput}
        isCbmFull={isCbmFull}
      />

      {/* Edit Drawer */}
      <EditDrawer
        isOpen={isEditDrawerOpen}
        onClose={closeEditDrawer}
        editFormData={editFormData}
        setEditFormData={setEditFormData}
        editSubDetails={editSubDetails}
        setEditSubDetails={setEditSubDetails}
        editTotalCbm={editTotalCbm}
        setEditTotalCbm={setEditTotalCbm}
        editTotalPercentage={editTotalPercentage}
        setEditTotalPercentage={setEditTotalPercentage}
        editTotalAmount={editTotalAmount}
        setEditTotalAmount={setEditTotalAmount}
        customTotalCbm={customTotalCbm}
        setCustomTotalCbm={setCustomTotalCbm}
        handleEditModalChange={handleEditModalChange}
        handleEditSubDetailChange={handleEditSubDetailChange}
        handleAddEditDCSubDetail={handleAddEditDCSubDetail}
        handleAddEditStoreSubDetail={handleAddEditStoreSubDetail}
        handleSaveEdit={handleSaveEdit}
        isSavingEdit={isSavingEdit}
        isIndividualMode={isIndividualMode}
        selectedEntityAbbreviations={selectedEntityAbbreviations}
        shipperEntityAbbreviation={shipperEntityAbbreviation}
        shipperFormData={shipperFormData}
        individuals={individuals}
        companies={companies}
        handleIndividualChangess={handleIndividualChangess}
        handleShipperChangess={handleShipperChangess}
        consigneeClients={consigneeClients}
        checkConsigneeExists={checkConsigneeExists}
        getMinDateForReceived={getMinDateForReceived}
        roundToTwo={roundToTwo}
        areNumbersEqual={areNumbersEqual}
        truckCbm={truckCbm}
        totalCbmInput={totalCbmInput}
        SearchableSelect={SearchableSelect}
        FormattedNumberInput={FormattedNumberInput}
        calculateRemainingCbm={calculateRemainingCbm}
        borderColor={borderColor}
        secondaryColor={secondaryColor}
        lightBg={lightBg}
        subDetails={subDetails}
        consignees={consignees}
        handleCustomTotalCbmChange={handleCustomTotalCbmChange}
        saveNewConsignees={saveNewConsignees}
        toast={toast}
        handleConsigneeChange={handleConsigneeChange}
      />

      {/* Fix Rate Consignee Drawer */}
      <FixRateConsigneeDrawer
        isOpen={isFixRateDrawerOpen}
        onClose={closeFixRateDrawer}
        consignee={selectedConsignee}
        isEditing={isEditingFixRate}
        onSave={handleSaveFixRate}
        fixedRate={highestRate}
        waybillNumber={waybillNumber}
        companies={companies}
        SearchableSelect={SearchableSelect}
        shipperInfo={shipperFormData?.shipper} // Add the actual shipper information to auto-populate origin
      />

      {/* Delete All Confirmation */}
      <AlertDialog
        isOpen={isDeleteAllAlertOpen}
        leastDestructiveRef={deleteAllCancelRef}
        onClose={onDeleteAllAlertClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold" color="red.500">
              Reverse All Waybill Data
            </AlertDialogHeader>

            <AlertDialogBody>
              <Text mb={2}>
                <strong>Warning:</strong> You are about to Reverse all data for
                waybill <strong>{selectedWaybill}</strong>.
              </Text>
              <Text mb={4}>
                This will permanently Reverse the shipper information, all
                consignees, and entity abbreviation summaries associated with
                this waybill.
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
                isLoading={isSaving}
                loadingText="Deleting..."
              >
                Reverse All
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
};

export default WaybillBody;
