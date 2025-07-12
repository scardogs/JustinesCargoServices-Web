import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import {
  Box,
  Grid,
  GridItem,
  Text,
  Table,
  Thead,
  Tbody,
  Tfoot,
  Tr,
  Th,
  Td,
  Input,
  InputGroup,
  InputLeftElement,
  HStack,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalCloseButton,
  ModalBody,
  VStack,
  FormControl,
  FormLabel,
  Button,
  useToast,
  Select,
  IconButton,
  ScaleFade,
  Tooltip,
  Flex,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  RadioGroup,
  Radio,
  TableContainer,
  Checkbox,
  Spacer,
  Skeleton,
  SkeletonText,
  ChevronDownIcon,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  AlertDialogCloseButton,
  Menu, // Import Menu components
  MenuButton,
  MenuList,
  MenuItem,
  Portal, // Import Portal
} from "@chakra-ui/react";
import {
  SearchIcon,
  AddIcon,
  ViewIcon,
  EditIcon,
  DeleteIcon,
  InfoIcon,
  CalendarIcon,
  TimeIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ChevronDownIcon as ChakraChevronDownIcon, // Alias original ChevronDownIcon
} from "@chakra-ui/icons";
import { BsThreeDotsVertical } from "react-icons/bs"; // Import three dots icon
import { motion, AnimatePresence } from "framer-motion";
import BillingPaper from "./billingpaper";
import { format } from "date-fns";

const formatNumber = (number) => {
  if (number === null || number === undefined) return "0.00";
  return number.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const formatTIN = (tin) => {
  if (!tin || tin === "N/A") return "N/A";
  // Remove any existing non-digit characters
  const cleanTin = tin.replace(/\D/g, "");
  // Format as XXX-XXX-XXXXX
  return cleanTin.replace(/^(\d{3})(\d{3})(\d{5})$/, "$1-$2-$3");
};

// Calculate the third Monday after a given date
const getThirdMondayAfter = (dateString) => {
  try {
    // Ensure we have a valid date
    const startDate = new Date(dateString);
    if (isNaN(startDate.getTime())) {
      console.error("Invalid date input to getThirdMondayAfter:", dateString);
      return new Date(); // Fallback to current date if input is invalid
    }

    // Find the first Monday after the invoice date (or the same day if it's already Monday)
    let mondayDate = new Date(startDate);
    const dayOfWeek = mondayDate.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    
    if (dayOfWeek !== 1) {
      // If not Monday, move to the next Monday
      mondayDate.setDate(mondayDate.getDate() + ((8 - dayOfWeek) % 7));
    }
    
    // At this point, mondayDate is the first Monday on or after the start date
    // We need to count this Monday as #1, then find the 3rd Monday
    
    // Add 14 days (2 weeks) to get to the third Monday
    // This works because: 1st Monday + 7 days = 2nd Monday, + 7 more days = 3rd Monday
    mondayDate.setDate(mondayDate.getDate() + 14);

    // Final validation check
    if (isNaN(mondayDate.getTime())) {
      console.error("Invalid result in getThirdMondayAfter calculation");
      return new Date(); // Fallback to current date
    }

    return mondayDate;
  } catch (error) {
    console.error("Error in getThirdMondayAfter:", error);
    return new Date(); // Fallback to current date
  }
};

const AnimatedNumber = ({ value }) => {
  return (
    <motion.div
      key={value}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5 }}
    >
      {value}
    </motion.div>
  );
};

const BillingComponent = () => {
  const toast = useToast();
  const [billingRecords, setBillingRecords] = useState([]); // List of all billing records
  const [billingData, setBillingData] = useState([]); // This holds the paginated data
  const [selectedBillingDetails, setSelectedBillingDetails] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [nextBillingID, setNextBillingID] = useState(1);
  const [nextSINumber, setNextSINumber] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalAmountDue, setTotalAmountDue] = useState(0); // Add totalAmountDue state
  const [sourceType, setSourceType] = useState("Store"); // Add source type state (Store or DC)
  const [detailsModalState, setDetailsModalState] = useState(false);

  // Add state for column visibility
  const [columnVisibility, setColumnVisibility] = useState({
    siNumber: true,
    invoiceDate: true,
    dateBilled: true,
    paidAt: true,
    storeName: true,
    address: false,
    tin: false,
    bottomPaymentMethod: false,
    gross: false,
    vat: false,
    net: false,
    withHoldingTax: false,
    netAmount: true,
    actualAmountPaid: true,
    chargeAmount: true,
    receiptNumber: true,
    remarks: true,
    status: true,
    actions: true,
    dueDate: true,
    chargeType: true,
  });

  // Toggle column visibility
  const toggleColumnVisibility = (columnName) => {
    setColumnVisibility((prev) => ({
      ...prev,
      [columnName]: !prev[columnName],
    }));
  };

  const [formData, setFormData] = useState({
    siNumber: "",
    storeName: "",
    address: "", // Added address field
    tin: "", // Added TIN field
    invoiceDate: new Date().toISOString().slice(0, 16),
    gross: 0,
    vat: 0,
    net: 0,
    withTax: 0,
    netAmount: 0,
    status: "Pending",
  });
  const [storeNames, setStoreNames] = useState([]);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const {
    isOpen: isAddModalOpen,
    onOpen: onAddModalOpen,
    onClose: onAddModalClose,
  } = useDisclosure();
  const [selectedBilling, setSelectedBilling] = useState({
    billingID: "B123",
    siNumber: "SI456",
  });
  const [billingDetails, setBillingDetails] = useState([]);
  const [isAddDetailFormOpen, setIsAddDetailFormOpen] = useState(false);
  const [billingDetailForm, setBillingDetailForm] = useState({
    billingDetailID: "",
    billingID: "",
    siNumber: "",
    waybillNumber: "",
    gross: 0,
    net: 0,
    vat: 0,
    withTax: 0,
    netAmount: 0,
    cbm: 0,
    percentage: "0",
    amount: 0,
    status: "Pending",
  });
  const [nextBillingDetailID, setNextBillingDetailID] = useState(1);
  const [filteredWaybillNumbers, setFilteredWaybillNumbers] = useState([]);
  const {
    isOpen: isEditModalOpen,
    onOpen: onEditModalOpen,
    onClose: onEditModalClose,
  } = useDisclosure();
  const [editFormData, setEditFormData] = useState({
    siNumber: "",
    storeName: "",
    status: "Pending",
    paidAt: "",
    dateBilled: "",
    sourceType: "Store", // Add sourceType field with default value
  });
  const [selectedWaybillNumbers, setSelectedWaybillNumbers] = useState(
    new Set()
  );
  const [usedWaybillNumbers, setUsedWaybillNumbers] = useState(new Set());
  const [statusFilter, setStatusFilter] = useState("all");
  const [timeFilter, setTimeFilter] = useState("all"); // Changed back to "all" to show all data in the table
  const [oldestPendingInvoice, setOldestPendingInvoice] = useState(null);
  const [mostRecentPaidInvoice, setMostRecentPaidInvoice] = useState(null);
  const [topCustomers, setTopCustomers] = useState([]);

  // Add disclosure for column selector modal
  const {
    isOpen: isColumnSelectorOpen,
    onOpen: onColumnSelectorOpen,
    onClose: onColumnSelectorClose,
  } = useDisclosure();

  // Add new state and disclosure for status modal
  const {
    isOpen: isStatusModalOpen,
    onOpen: onStatusModalOpen,
    onClose: onStatusModalClose,
  } = useDisclosure();
  const [selectedBillingForStatus, setSelectedBillingForStatus] =
    useState(null);
  const [statusFormData, setStatusFormData] = useState({
    status: "",
    datePaid: "",
    actualAmountPaid: 0,
    chargeType: "None",
    chargeAmount: 0,
    receiptNumber: "", // Initialize receiptNumber
    remarks: "",
  });

  // Add these state variables at the beginning of the component
  const [totalAmountDueDateRange, setTotalAmountDueDateRange] = useState({
    startDate: null,
    endDate: null,
    formattedText: "",
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isTableLoading, setIsTableLoading] = useState(true);
  const [isStatsLoading, setIsStatsLoading] = useState(true);
  const [isModalLoading, setIsModalLoading] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isEditLoading, setIsEditLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isStatusUpdating, setIsStatusUpdating] = useState(false);
  const [isAddingDetail, setIsAddingDetail] = useState(false);
  const [isAddBillingLoading, setIsAddBillingLoading] = useState(false);

  // State for sorting
  const [sortConfig, setSortConfig] = useState({
    key: "invoiceDate",
    direction: "descending",
  });

  // Add state for billing record delete confirmation
  const deleteBillingAlertDisclosure = useDisclosure();
  const [billingToDeleteId, setBillingToDeleteId] = useState(null);
  const [billingToDeleteInfo, setBillingToDeleteInfo] = useState(null); // Store SI number/Store name for dialog
  const [isDeletingBilling, setIsDeletingBilling] = useState(false);
  const cancelDeleteBillingRef = useRef();

  // Add this useEffect to calculate the date range when component mounts
  useEffect(() => {
    // Get current date
    const today = new Date();

    // Calculate last week's Monday to Sunday (regardless of timeFilter)
    // First get this week's Monday
    const thisWeekDay = today.getDay(); // 0 is Sunday, 1 is Monday, etc.
    const thisWeekMondayOffset = thisWeekDay === 0 ? -6 : 1 - thisWeekDay;
    const thisWeekMonday = new Date(today);
    thisWeekMonday.setDate(today.getDate() + thisWeekMondayOffset);

    // Last week's Monday is 7 days before this week's Monday
    const startDate = new Date(thisWeekMonday);
    startDate.setDate(thisWeekMonday.getDate() - 7);
    startDate.setHours(0, 0, 0, 0);

    // Last week's Sunday is 1 day before this week's Monday
    const endDate = new Date(thisWeekMonday);
    endDate.setDate(thisWeekMonday.getDate() - 1);
    endDate.setHours(23, 59, 59, 999);

    // For demonstration purposes, use March 17-23, 2025
    let finalStartDate = startDate;
    let finalEndDate = endDate;

    if (process.env.NODE_ENV === "development") {
      finalStartDate = new Date(2025, 2, 17); // March 17, 2025
      finalEndDate = new Date(2025, 2, 23, 23, 59, 59, 999); // March 23, 2025, end of day
    }

    // Format the date range text
    const formatOptions = { month: "short", day: "numeric" };
    const formatOptionsWithYear = {
      month: "short",
      day: "numeric",
      year: "numeric",
    };

    const formattedStartDate = finalStartDate.toLocaleDateString(
      "en-US",
      formatOptions
    );
    const formattedEndDate = finalEndDate.toLocaleDateString(
      "en-US",
      formatOptionsWithYear
    );

    const formattedText = `${formattedStartDate} - ${formattedEndDate}`;
    const prefix = "Last Week:";

    setTotalAmountDueDateRange({
      startDate: finalStartDate,
      endDate: finalEndDate,
      formattedText,
      prefix,
    });
  }, []); // This should run only once on component mount

  // Add useEffect to refetch store names when sourceType changes
  useEffect(() => {
    fetchStoreNames();
    // Reset the storeName when changing source type
    setFormData((prev) => ({
      ...prev,
      storeName: "",
    }));
  }, [sourceType]);

  // Existing useEffect for initial data loading
  useEffect(() => {
    fetchBillingData();
    fetchStoreNames();
    fetchHighestBillingDetailID();

    // Set up interval to check for overdue invoices every 5 minutes
    const intervalId = setInterval(
      () => {
        fetchBillingData(); // This will trigger checkOverdueInvoices via fetchBillingData
      },
      5 * 60 * 1000
    ); // 5 minutes in milliseconds

    // Clean up interval on component unmount
    return () => clearInterval(intervalId);
  }, []);

  // Get filtered billing data by time period
  const getFilteredByTime = (data) => {
    if (!data || timeFilter === "all") return data;

    const now = new Date();
    const startOfDay = new Date(now.setHours(0, 0, 0, 0));
    let startDate, endDate;

    switch (timeFilter) {
      case "today":
        startDate = startOfDay;
        endDate = new Date(now.setHours(23, 59, 59, 999));
        break;
      case "thisWeek":
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - startDate.getDay()); // Start of week (Sunday)
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 6); // End of week (Saturday)
        endDate.setHours(23, 59, 59, 999);
        break;
      case "lastWeek":
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - startDate.getDay() - 7); // Start of last week
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 6); // End of last week
        endDate.setHours(23, 59, 59, 999);
        break;
      case "thisMonth":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(
          now.getFullYear(),
          now.getMonth() + 1,
          0,
          23,
          59,
          59,
          999
        );
        break;
      case "lastMonth":
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(
          now.getFullYear(),
          now.getMonth(),
          0,
          23,
          59,
          59,
          999
        );
        break;
      default:
        return data;
    }

    // Filter data where dateBilled falls within the selected date range
    return data.filter((item) => {
      if (!item.dateBilled) return false;
      const itemDate = new Date(item.dateBilled);
      return itemDate >= startDate && itemDate <= endDate;
    });
  };

  // New function to calculate Total Amount Due based on date range
  const calculateTotalAmountDue = (data, startDate, endDate) => {
    if (!data || data.length === 0) return 0;

    // Convert string dates to Date objects if needed
    const start = startDate instanceof Date ? startDate : new Date(startDate);
    const end = endDate instanceof Date ? endDate : new Date(endDate);

    // Set hours to ensure full day coverage
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    // Filter records where:
    // 1. Invoice Received Date (dateBilled) falls within the date range
    // 2. Status is "Billed"
    const filteredRecords = data.filter((bill) => {
      if (!bill.dateBilled || bill.status !== "Billed") return false;
      const billDate = new Date(bill.dateBilled);
      return billDate >= start && billDate <= end;
    });

    // Sum up Total Amount Due (netAmount) from filtered records
    const totalAmount = filteredRecords.reduce((total, bill) => {
      return total + (Number(bill.netAmount) || 0);
    }, 0);

    return totalAmount;
  };

  // Calculate analytics data for tooltips and stats
  const calculateAnalytics = (data) => {
    // Find oldest pending invoice
    const pendingInvoices = data
      .filter((billing) => billing.status === "Pending")
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    if (pendingInvoices.length > 0) {
      setOldestPendingInvoice(pendingInvoices[0]);
    }

    // Find most recent paid invoice
    const paidInvoices = data
      .filter((billing) => billing.status === "Paid")
      .sort((a, b) => new Date(b.paidAt) - new Date(a.paidAt));

    if (paidInvoices.length > 0) {
      setMostRecentPaidInvoice(paidInvoices[0]);
    }

    // Calculate top customers
    const customerTotals = data.reduce((acc, billing) => {
      const customer = billing.storeName;
      if (!acc[customer]) {
        acc[customer] = 0;
      }
      acc[customer] += billing.netAmount || 0;
      return acc;
    }, {});

    const sortedCustomers = Object.entries(customerTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, total]) => ({ name, total }));

    setTopCustomers(sortedCustomers);
  };

  const fetchBillingData = async () => {
    setIsTableLoading(true);
    setIsStatsLoading(true);

    try {
      // Build query parameters for server-side pagination
      const queryParams = new URLSearchParams({
        page: currentPage,
        limit: recordsPerPage,
      });

      // Add status filter if not 'all'
      if (statusFilter !== "all") {
        queryParams.append("status", statusFilter);
      }

      // Add search term if present
      if (searchTerm && searchTerm.trim() !== "") {
        queryParams.append("search", searchTerm);
      }

      // Try server-side pagination with fallback to regular endpoint
      let response;
      try {
        response = await axios.get(
          `${process.env.NEXT_PUBLIC_BACKEND_API}/api/billing/paginate?${queryParams.toString()}`
        );

        // If successful, set the paginated data
        setBillingData(response.data.billings);
        setTotalRecords(response.data.total);
      } catch (paginationError) {
        console.error("Pagination API failed:", paginationError);

        // Fallback to regular endpoint if pagination fails
        response = await axios.get(
          `${process.env.NEXT_PUBLIC_BACKEND_API}/api/billing`
        );

        // Filter and paginate on the client side as fallback
        const allData = response.data;

        // Apply filters client-side
        let filteredData = [...allData];

        // Apply status filter
        if (statusFilter !== "all") {
          filteredData = filteredData.filter(
            (item) => item.status === statusFilter
          );
        }

        // Apply search filter
        if (searchTerm && searchTerm.trim() !== "") {
          const term = searchTerm.toLowerCase();
          filteredData = filteredData.filter(
            (item) =>
              (item.siNumber && item.siNumber.toLowerCase().includes(term)) ||
              (item.storeName && item.storeName.toLowerCase().includes(term)) ||
              (item.invoiceNumber &&
                item.invoiceNumber.toLowerCase().includes(term))
          );
        }

        // Sort by creation date
        filteredData.sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        );

        // Set total for pagination calculation
        setTotalRecords(filteredData.length);

        // Get the current page slice
        const start = (currentPage - 1) * recordsPerPage;
        const end = start + recordsPerPage;
        setBillingData(filteredData.slice(start, end));
      }

      // In either case, fetch all data for analytics
      const allBillingDataResponse = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/billing`
      );

      // Use the complete dataset for analytics calculations
      const allBillings = allBillingDataResponse.data;
      setBillingRecords(allBillings);

      // The rest of the existing function remains the same
      checkOverdueInvoices(allBillings);
      calculateAnalytics(allBillings);

      // Calculate total amount due based on current date range
      // Check if totalAmountDueDateRange has valid dates, otherwise use default range
      const today = new Date();
      const oneMonthAgo = new Date(today);
      oneMonthAgo.setMonth(today.getMonth() - 1);

      const startDate = totalAmountDueDateRange.startDate || oneMonthAgo;
      const endDate = totalAmountDueDateRange.endDate || today;

      setTotalAmountDue(
        calculateTotalAmountDue(allBillings, startDate, endDate)
      );

      // Find the highest existing ID and set the next one
      const maxID = allBillings.reduce((max, billing) => {
        const currentID = parseInt(billing.billingID.replace("B", ""), 10);
        return currentID > max ? currentID : max;
      }, 0);
      setNextBillingID(maxID + 1);

      // Find the highest SI number and set the next one
      const maxSI = allBillings.reduce((max, billing) => {
        const currentSI = parseInt(billing.siNumber.replace("SI", ""), 10);
        return currentSI > max ? currentSI : max;
      }, 0);
      setNextSINumber(maxSI + 1);
    } catch (error) {
      console.error("Error fetching billing data:", error);
      toast({
        title: "Error",
        description: "Failed to fetch billing data. Please try again later.",
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "top-right",
      });
    } finally {
      setIsTableLoading(false);
      setIsStatsLoading(false);
    }
  };

  // Check for overdue invoices and update their status
  const checkOverdueInvoices = async (billings) => {
    const today = new Date();
    // Clear time component for accurate date comparison
    today.setHours(0, 0, 0, 0);
    const overdueUpdates = [];

    billings.forEach((billing) => {
      // Check if status is "Billed" and dueDate exists
      if (billing.status === "Billed" && billing.dueDate) {
        try {
          const dueDate = new Date(billing.dueDate);
          // Clear time component of due date
          dueDate.setHours(0, 0, 0, 0);

          // If today is past the due date, mark it as overdue
          if (today > dueDate) {
            overdueUpdates.push({
              id: billing._id,
              billingID: billing.billingID,
            });
          }
        } catch (e) {
          // Log error if dueDate is invalid, but continue checking other invoices
          console.error(
            `Invalid due date for billing ${billing.billingID}:`,
            billing.dueDate,
            e
          );
        }
      }
    });

    // Update overdue invoices
    for (const update of overdueUpdates) {
      try {
        await axios.put(
          `${process.env.NEXT_PUBLIC_BACKEND_API}/api/billing/${update.id}`,
          { status: "Overdue" }
        );
        console.log(`Updated billing ${update.billingID} to Overdue status`);
      } catch (err) {
        console.error(`Failed to update ${update.billingID} status:`, err);
      }
    }

    // If any invoices were updated, refresh the billing data
    if (overdueUpdates.length > 0) {
      fetchBillingData();
    }
  };

  // Update the fetchStoreNames function to handle both Store and DC names
  const fetchStoreNames = async () => {
    try {
      if (sourceType === "Store") {
        // Original logic to fetch store names from consigneeInfo
        const response = await axios.get(
          process.env.NEXT_PUBLIC_BACKEND_API + "/api/consigneeInfo"
        );
        console.log("Backend response for Store names:", response.data);

        const consigneeNames = [
          ...new Set(response.data.map((consignee) => consignee.consignee)),
        ];
        setStoreNames(consigneeNames);
      } else {
        // New logic to fetch DC names from subDetails
        const response = await axios.get(
          process.env.NEXT_PUBLIC_BACKEND_API + "/api/subdetails"
        );
        console.log("Backend response for DC names:", response.data);

        const dcNames = [
          ...new Set(response.data.map((detail) => detail.storeName)),
        ];
        setStoreNames(dcNames);
      }
    } catch (err) {
      console.error(
        `Error fetching ${sourceType === "Store" ? "store" : "DC"} names:`,
        err
      );
      toast({
        title: "Error",
        description: `Failed to fetch ${sourceType === "Store" ? "store" : "DC"} names.`,
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "top-right",
      });
    }
  };

  const fetchHighestBillingDetailID = async () => {
    try {
      const response = await axios.get(
        process.env.NEXT_PUBLIC_BACKEND_API + "/api/billingDetail"
      );
      const maxID = response.data.reduce((max, detail) => {
        // Extract the number from BD-XXXX format
        const currentID = parseInt(
          detail.billingDetailID.replace("BD-", ""),
          10
        );
        return currentID > max ? currentID : max;
      }, 0);
      setNextBillingDetailID(maxID + 1);
    } catch (err) {
      console.error("Error fetching highest billing detail ID:", err);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleAddBillingSubmit = async (e) => {
    e.preventDefault();

    // Check required fields
    const missingFields = [];

    if (!formData.storeName) {
      missingFields.push("Store Name");
    }
    if (!formData.invoiceDate) {
      missingFields.push("Invoice Date");
    }

    if (missingFields.length > 0) {
      toast({
        title: "Required Fields Missing",
        description: `Please fill in the following fields: ${missingFields.join(
          ", "
        )}`,
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "top-right",
      });
      return;
    }

    const billingID = `B${nextBillingID.toString().padStart(4, "0")}`;
    const siNumber = nextSINumber.toString();

    try {
      // Calculate the dateBilled as the third Monday after the invoice date
      const invoiceDate = new Date(formData.invoiceDate);
      if (isNaN(invoiceDate.getTime())) {
        throw new Error("Invalid invoice date format");
      }

      const thirdMondayDate = getThirdMondayAfter(invoiceDate);
      if (isNaN(thirdMondayDate.getTime())) {
        throw new Error("Failed to calculate the third Monday date");
      }

      console.log("Invoice Date:", invoiceDate);
      console.log("Third Monday (Invoice Received Date):", thirdMondayDate);

      const payload = {
        billingID,
        siNumber,
        invoiceDate: invoiceDate.toISOString(),
        storeName: formData.storeName,
        address: formData.address || "N/A", // Ensure address field is always present
        tin: formData.tin || "N/A", // Ensure TIN field is always present
        gross: 0,
        vat: 0,
        net: 0,
        withTax: 0,
        netAmount: 0,
        status: "Pending",
        dateBilled: thirdMondayDate.toISOString(), // Set to the third Monday after invoice date
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Ensure dateBilled is set and valid before sending
      if (
        !payload.dateBilled ||
        payload.dateBilled === "null" ||
        payload.dateBilled === "undefined"
      ) {
        throw new Error("Invoice Received Date calculation failed");
      }

      console.log("Sending payload:", payload); // Debug log
      const response = await axios.post(
        process.env.NEXT_PUBLIC_BACKEND_API + "/api/billing",
        payload
      );
      console.log("Server response:", response.data); // Debug log

      // Refresh the billing data
      fetchBillingData();

      // Close the modal
      onAddModalClose();

      // Reset the form
      setFormData({
        siNumber: "",
        storeName: "",
        address: "", // Reset address field
        tin: "", // Reset TIN field
        invoiceDate: new Date().toISOString().slice(0, 16),
        gross: 0,
        vat: 0,
        net: 0,
        withTax: 0,
        netAmount: 0,
        status: "Pending",
      });

      // Increment the nextBillingID
      setNextBillingID(nextBillingID + 1);

      // Show success message
      toast({
        title: "Success",
        description: "Billing record added successfully!",
        status: "success",
        duration: 3000,
        isClosable: true,
        position: "top-right",
      });
    } catch (err) {
      console.error("Error details:", err.response?.data || err.message);
      toast({
        title: "Error",
        description:
          err.response?.data?.message ||
          err.message ||
          "An error occurred while adding the billing record.",
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "top-right",
      });
    }
  };

  const fetchBillingDetailData = async (billingID) => {
    console.log("Fetching billing details for ID:", billingID);
    const url = `${process.env.NEXT_PUBLIC_BACKEND_API}/api/billingDetail/billingID/${billingID}`;
    console.log("API endpoint URL:", url);

    try {
      // Fetch billing details for this billing ID
      const response = await axios.get(url);

      console.log("Billing details API response:", response.data);

      // Process the billing details
      if (response.data && Array.isArray(response.data)) {
        // Set billing details for viewing
        setSelectedBillingDetails(response.data);

        // Extract waybill numbers for tracking used waybills
        const waybillNumbers = new Set();
        response.data.forEach((detail) => {
          if (detail.waybillNumber) {
            waybillNumbers.add(detail.waybillNumber);
          }
        });

        setUsedWaybillNumbers(waybillNumbers);

        // Continue with the rest of the function...
        // ... existing code ...

        return response.data;
      }
      return [];
    } catch (error) {
      console.error("Error fetching billing details:", error);
      console.error("Error response data:", error.response?.data);
      console.error("Error status:", error.response?.status);
      toast({
        title: "Error",
        description: `Failed to fetch billing details: ${error.message}`,
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return [];
    }
  };

  const handleViewDetails = async (billing) => {
    console.log("Viewing details for billing:", billing);
    console.log("Billing ID being used:", billing.billingID);

    // Clear any existing billing details and set selected billing
    setSelectedBillingDetails([]);

    // First open the modal, then fetch data
    setDetailsModalState(true); // Use this instead of onDetailsModalOpen()
    setIsDetailLoading(true);

    try {
      // Fetch billing details for this billing ID - this API already returns only
      // the details associated with this billing record (checked waybills)
      const billingDetails = await fetchBillingDetailData(billing.billingID);
      console.log("Fetched billing details:", billingDetails);

      // Create a properly formatted array of waybills from the billing details
      const waybills =
        billingDetails && billingDetails.length > 0
          ? billingDetails.map((detail) => ({
              number: detail.waybillNumber,
              waybillNumber: detail.waybillNumber,
              displayWaybillNumber:
                detail.displayWaybillNumber || detail.waybillNumber,
              description:
                detail.description || `Waybill: ${detail.waybillNumber}`,
              amount: detail.amount,
              total: detail.amount,
              quantity: detail.percentage || "",
              // Include any other properties needed
            }))
          : [];

      console.log("Formatted waybills for view:", waybills);

      // Save the details and set the billing with its details
      setSelectedBillingDetails(waybills);
      setSelectedBilling({
        ...billing,
        waybillDetails: waybills, // Add the waybills as a property
      });
    } catch (error) {
      console.error("Error fetching billing details:", error);
      toast({
        title: "Error",
        description: "Failed to fetch billing details",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsDetailLoading(false);
    }
  };

  const handleEditBilling = async (billing) => {
    setIsEditLoading(true);
    try {
      // Set the complete billing data for editing
      setEditFormData(billing);
      onEditModalOpen();
    } finally {
      setIsEditLoading(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();

    try {
      // Check if trying to set status to Billed or Paid
      if (editFormData.status === "Billed" || editFormData.status === "Paid") {
        // First check if there are any billing details for this record
        const detailsResponse = await axios.get(
          process.env.NEXT_PUBLIC_BACKEND_API +
            `/api/billingDetail/billingID/${editFormData.billingID}`
        );

        // If no billing details exist, prevent status change
        if (!detailsResponse.data || detailsResponse.data.length === 0) {
          toast({
            title: "Error Status Update",
            description: `Cannot change status to ${editFormData.status}. No billing details exist for this record. Please add at least one waybill detail first.`,
            status: "error",
            duration: 5000,
            isClosable: true,
            position: "top-right",
          });
          return; // Stop execution
        }
      }

      const payload = {
        ...editFormData,
        sourceType: sourceType, // Add sourceType to payload
      };
      const currentBilling = billingRecords.find(
        (b) => b._id === editFormData.id
      );

      // For "Billed" status, ensure we have a dateBilled date
      if (payload.status === "Billed") {
        payload.dateBilled = payload.dateBilled || new Date().toISOString();

        // Remove the code that forces "Billed" to "Pending"
        // payload.originalStatus = payload.status;
        // payload.status = "Pending";
      }

      // For "Paid" status, ensure we have both dateBilled and paidAt dates
      if (payload.status === "Paid") {
        payload.dateBilled = payload.dateBilled || new Date().toISOString();
        payload.paidAt = payload.paidAt || new Date().toISOString();
      }

      console.log("Submitting payload:", payload);

      // Update the main billing record
      const updateResponse = await axios.put(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/billing/${editFormData.id}`,
        payload
      );

      console.log("Update response:", updateResponse.data);
      // Log all fields to debug
      console.log("Response field check:", {
        status: updateResponse.data.status,
        dateBilled: updateResponse.data.dateBilled,
        paidAt: updateResponse.data.paidAt,
        id: updateResponse.data._id,
      });

      // Get the current status from the response
      const newStatus = updateResponse.data.status;

      // Update all related billing details with the new status
      if (currentBilling) {
        try {
          const detailsResponse = await axios.get(
            process.env.NEXT_PUBLIC_BACKEND_API +
              `/api/billingDetail/billingID/${currentBilling.billingID}`
          );

          const details = detailsResponse.data;
          const updateDetailPromises = details.map((detail) =>
            axios.put(
              process.env.NEXT_PUBLIC_BACKEND_API +
                `/api/billingDetail/${detail._id}`,
              { status: newStatus }
            )
          );

          await Promise.all(updateDetailPromises);
          console.log(
            `Updated status of ${updateDetailPromises.length} billing details to "${newStatus}"`
          );

          // Get all waybill numbers from the billing details
          const waybillNumbers = details
            .map((detail) => detail.waybillNumber)
            .filter(Boolean);

          if (waybillNumbers.length > 0) {
            console.log("Waybill numbers to update:", waybillNumbers);

            // Determine the appropriate waybill status based on billing status
            let waybillStatus = "USED"; // Default for all internal tracking

            // Update waybillSummary status for billing/invoice view
            if (newStatus === "Billed" || newStatus === "Paid") {
              // Update waybill summaries to BILLED
              const waybillSummaryPromises = waybillNumbers.map((wbNum) =>
                axios
                  .put(
                    `${process.env.NEXT_PUBLIC_BACKEND_API}/api/waybillSummary/updateStatus/${wbNum}`,
                    { status: "BILLED" }
                  )
                  .catch((err) => {
                    console.error(
                      `Failed to update waybill summary status for ${wbNum}:`,
                      err.response?.data || err.message
                    );
                  })
              );

              try {
                await Promise.all(waybillSummaryPromises);
                console.log(
                  `Updated waybillSummary status to BILLED for ${waybillNumbers.length} waybills`
                );
              } catch (summaryErr) {
                console.error(
                  "Error updating waybillSummary status:",
                  summaryErr
                );
              }
            } else if (newStatus === "Pending" || newStatus === "Cancelled") {
              // Update waybill summaries to NOT BILLED when back to Pending or Cancelled
              const waybillSummaryPromises = waybillNumbers.map((wbNum) =>
                axios
                  .put(
                    `${process.env.NEXT_PUBLIC_BACKEND_API}/api/waybillSummary/updateStatus/${wbNum}`,
                    { status: "NOT BILLED" }
                  )
                  .catch((err) => {
                    console.error(
                      `Failed to update waybill summary status for ${wbNum}:`,
                      err.response?.data || err.message
                    );
                  })
              );

              try {
                await Promise.all(waybillSummaryPromises);
                console.log(
                  `Updated waybillSummary status to NOT BILLED for ${waybillNumbers.length} waybills`
                );
              } catch (summaryErr) {
                console.error(
                  "Error updating waybillSummary status:",
                  summaryErr
                );
              }
            }

            // Also update the main waybill status for internal tracking
            try {
              // Fetch all the waybills to get their IDs
              const waybillsResponse = await axios.get(
                process.env.NEXT_PUBLIC_BACKEND_API + `/api/waybills`
              );

              console.log("Response from waybills API:", waybillsResponse.data);

              // Find the waybills that match our waybill numbers
              const waybillsToUpdate = waybillsResponse.data.filter((waybill) =>
                waybillNumbers.includes(waybill.waybillNumber)
              );

              console.log("Waybills to update:", waybillsToUpdate);

              // If no waybills to update, skip this part
              if (waybillsToUpdate.length === 0) {
                console.log("No matching waybills found to update");
              } else {
                // Update each waybill status one by one to better identify errors
                for (const waybill of waybillsToUpdate) {
                  try {
                    console.log(
                      `Updating waybill ${waybill.waybillNumber} (ID: ${waybill._id}) to status: ${waybillStatus}`
                    );
                    await axios.put(
                      process.env.NEXT_PUBLIC_BACKEND_API +
                        `/api/waybills/${waybill.waybillNumber}`,
                      { status: waybillStatus }
                    );
                    console.log(
                      `Successfully updated waybill ${waybill.waybillNumber}`
                    );
                  } catch (waybillErr) {
                    console.error(
                      `Error updating waybill ${waybill.waybillNumber}:`,
                      waybillErr
                    );
                    console.error("Error details:", waybillErr.response?.data);
                  }
                }
              }
            } catch (waybillsErr) {
              console.error(
                "Error fetching or updating waybills:",
                waybillsErr
              );
              console.error("Error response:", waybillsErr.response?.data);
            }
          }
        } catch (err) {
          console.error("Error updating billing details:", err);
          console.error("Error response:", err.response?.data);
        }
      }

      fetchBillingData();
      onEditModalClose();

      toast({
        title: "Success",
        description: "Billing record and details updated successfully!",
        status: "success",
        duration: 3000,
        isClosable: true,
        position: "top-right",
      });
    } catch (err) {
      console.error("Error details:", err.response?.data);
      toast({
        title: "Error",
        description:
          err.response?.data?.error ||
          "An error occurred while updating the billing record.",
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "top-right",
      });
    }
  };

  const handleEditFormChange = (e) => {
    const { name, value } = e.target;

    // If this is a date field, combine it with current time
    if (name === "dateBilled" || name === "paidAt") {
      const now = new Date();
      const selectedDate = new Date(value);

      // Set hours, minutes, seconds from current time
      selectedDate.setHours(now.getHours());
      selectedDate.setMinutes(now.getMinutes());
      selectedDate.setSeconds(now.getSeconds());

      setEditFormData((prev) => ({
        ...prev,
        [name]: selectedDate.toISOString(),
      }));
    } else {
      // Normal field handling
      setEditFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleDeleteBilling = async () => {
    if (!billingToDeleteId) return;

    setIsDeletingBilling(true); // Set loading true
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast({
          title: "Error",
          description: "Authentication token not found. Please log in.",
          status: "error",
        });
        setIsDeletingBilling(false);
        deleteBillingAlertDisclosure.onClose();
        setBillingToDeleteId(null);
        setBillingToDeleteInfo(null);
        return;
      }

      // Get billing record to retrieve billingID for deleting details
      const billingRecord = billingRecords.find(
        (b) => b._id === billingToDeleteId
      );
      if (!billingRecord) {
        throw new Error("Could not find billing record details.");
      }

      // Get all billing details for this billing record
      const detailsResponse = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/billingDetail/billingID/${billingRecord.billingID}`,
        { headers: { Authorization: `Bearer ${token}` } } // Add auth header
      );

      // Delete all associated billing details first
      // Use soft delete endpoint if available, otherwise hard delete
      for (const detail of detailsResponse.data) {
        console.log(`Attempting delete for detail ID: ${detail._id}`);
        try {
          await axios.delete(
            `${process.env.NEXT_PUBLIC_BACKEND_API}/api/billingDetail/${detail._id}`,
            { headers: { Authorization: `Bearer ${token}` } } // Add auth header
          );
        } catch (detailDeleteError) {
          console.error(
            `Failed to delete detail ${detail._id}:`,
            detailDeleteError.response?.data || detailDeleteError.message
          );
          // Decide whether to continue or stop if a detail fails
          // For now, we'll log and continue
        }
      }

      // Then delete the main billing record using soft delete endpoint
      await axios.delete(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/billing/${billingToDeleteId}`,
        { headers: { Authorization: `Bearer ${token}` } } // Add auth header
      );

      fetchBillingData(); // Refresh the data

      toast({
        title: "Success",
        description:
          "Billing record and associated details deleted successfully and logged!",
        status: "success",
        duration: 3000,
        isClosable: true,
        position: "top-right",
      });
    } catch (err) {
      console.error("Error deleting billing:", err);
      toast({
        title: "Error",
        description:
          err.response?.data?.message || "Failed to delete billing record.",
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "top-right",
      });
    } finally {
      setIsDeletingBilling(false); // Set loading false
      deleteBillingAlertDisclosure.onClose(); // Close dialog
      setBillingToDeleteId(null); // Clear ID
      setBillingToDeleteInfo(null); // Clear info
    }
  };

  // New function to handle delete button click
  const handleDeleteClick = (billing) => {
    setBillingToDeleteId(billing._id);
    setBillingToDeleteInfo({
      siNumber: billing.siNumber,
      storeName: billing.storeName,
    }); // Store info for dialog
    deleteBillingAlertDisclosure.onOpen();
  };

  const handleAddDetailFormChange = async (e) => {
    const { name, value } = e.target;
    setBillingDetailForm({ ...billingDetailForm, [name]: value });

    // If the waybill number is changed, fetch the corresponding amount and additional details
    if (name === "waybillNumber" && value) {
      try {
        console.log(`Fetching details for waybill number: ${value}`);
        console.log("Selected billing:", selectedBilling);

        let consigneeData;

        if (sourceType === "Store") {
          // Original logic for Store - fetch from consigneeInfo
          const response = await axios.get(
            process.env.NEXT_PUBLIC_BACKEND_API + `/api/consigneeInfo/${value}`
          );
          console.log("ConsigneeInfo API response:", response.data);

          if (response.data && response.data.length > 0) {
            consigneeData = response.data[0]; // Get the first matching record
          }
        } else {
          // New logic for DC - fetch from subdetails
          const response = await axios.get(
            process.env.NEXT_PUBLIC_BACKEND_API + `/api/subdetails`
          );
          console.log("Subdetails API response:", response.data);

          // Find the matching subdetail for this waybill number
          // We don't need to match on storeName in the API request because we'll filter later
          const matchingSubdetails = response.data.filter(
            (detail) => detail.waybillNumber === value
          );

          console.log("Matching subdetails for waybill:", matchingSubdetails);

          // Now try to find one that matches the store name from the selected billing
          let exactMatch = matchingSubdetails.find(
            (detail) => detail.storeName === selectedBilling.storeName
          );

          if (exactMatch) {
            consigneeData = exactMatch;
            console.log("Found exact matching storeName:", consigneeData);
          } else if (matchingSubdetails.length > 0) {
            // If no exact match, use the first one
            consigneeData = matchingSubdetails[0];
            console.log("No exact match, using first result:", consigneeData);
          }
        }

        if (consigneeData) {
          console.log("Data retrieved:", consigneeData);

          // Ensure amount is a number and default to 0 if missing
          let amount = 0;
          if (
            consigneeData.amount !== undefined &&
            consigneeData.amount !== null
          ) {
            amount = Number(consigneeData.amount);
          }
          console.log("Amount from data:", amount);

          // Calculate values based on the amount
          const gross = amount;
          const net = gross / 1.12;
          const vat = gross - net;
          const withTax = net * 0.02;
          const netAmount = gross - withTax;

          console.log("Calculated financial values:", {
            gross,
            net: net.toFixed(2),
            vat: vat.toFixed(2),
            withTax: withTax.toFixed(2),
            netAmount: netAmount.toFixed(2),
          });

          // Update the billing detail form with calculated values
          // IMPORTANT: Preserve the waybillNumber in the form update
          const updatedForm = {
            ...billingDetailForm,
            waybillNumber: value, // Explicitly keep the waybill number
            storeName: selectedBilling.storeName,
            gross,
            net,
            vat,
            withTax,
            netAmount,
            cbm: Number(consigneeData.cbm) || 0,
            percentage: consigneeData.percentage || "0",
            amount,
          };

          console.log("Setting updated billing detail form:", updatedForm);
          setBillingDetailForm(updatedForm);
        } else {
          console.log("No data found for waybill number:", value);
          toast({
            title: "Warning",
            description: `No ${sourceType === "Store" ? "consignee" : "subdetail"} data found for waybill: ${value}`,
            status: "warning",
            duration: 3000,
            isClosable: true,
            position: "top-right",
          });

          // Reset values when no data is found but PRESERVE the waybill selection
          setBillingDetailForm((prev) => ({
            ...prev,
            waybillNumber: value, // Keep the waybill number
            gross: 0,
            net: 0,
            vat: 0,
            withTax: 0,
            netAmount: 0,
            cbm: 0,
            percentage: "0",
            amount: 0,
          }));
        }
      } catch (err) {
        console.error("Error fetching data:", err);
        console.error("API error response:", err.response?.data);
        toast({
          title: "Error",
          description: `Failed to fetch ${sourceType === "Store" ? "consignee" : "subdetail"} info for waybill: ${value}`,
          status: "error",
          duration: 3000,
          isClosable: true,
          position: "top-right",
        });

        // Still keep the waybill number even if there's an error
        setBillingDetailForm((prev) => ({
          ...prev,
          waybillNumber: value,
        }));
      }
    }
  };

  // Reset the billingDetailForm
  const resetBillingDetailForm = (detailID = "") => {
    setBillingDetailForm({
      billingDetailID: detailID || "",
      billingID: selectedBilling?.billingID || "",
      siNumber: selectedBilling?.siNumber || "",
      waybillNumber: "", // Initialize empty, will be set when selected
      gross: 0,
      net: 0,
      vat: 0,
      withTax: 0,
      netAmount: 0,
      cbm: 0,
      percentage: "0", // Changed from "0%" to match handleAddDetailFormChange
      amount: 0,
      status: "Pending",
      storeName: selectedBilling?.storeName || "", // Add this to ensure storeName is set
    });
  };

  const handleAddDetailFormOpen = () => {
    setIsAddDetailFormOpen(true);
    const newDetailID = `BD-${nextBillingDetailID.toString().padStart(4, "0")}`;
    resetBillingDetailForm(newDetailID);
    setNextBillingDetailID(nextBillingDetailID + 1);

    // Call fetchWaybillNumbers with the selectedBilling's storeName as the consignee
    if (selectedBilling?.storeName) {
      console.log(
        `Fetching waybill numbers for ${sourceType === "Store" ? "Store" : "DC"}: ${selectedBilling.storeName}`
      );
      fetchWaybillNumbers(selectedBilling.storeName);
    } else {
      console.warn("No store name available for the selected billing");
      setFilteredWaybillNumbers([]);
    }
  };

  const handleAddDetailSubmit = async (e) => {
    e.preventDefault();
    setIsAddingDetail(true);
    try {
      // Validate that a waybill number is selected
      if (!billingDetailForm.waybillNumber) {
        toast({
          title: "Validation Error",
          description: "Please select a waybill number",
          status: "error",
          duration: 3000,
          isClosable: true,
          position: "top-right",
        });
        return;
      }

      const payload = {
        billingDetailID: billingDetailForm.billingDetailID,
        billingID: billingDetailForm.billingID,
        siNumber: billingDetailForm.siNumber,
        waybillNumber: billingDetailForm.waybillNumber,
        gross: billingDetailForm.gross || 0,
        net: billingDetailForm.net || 0,
        vat: billingDetailForm.vat || 0,
        withTax: billingDetailForm.withTax || 0,
        netAmount: billingDetailForm.netAmount || 0,
        cbm: billingDetailForm.cbm || 0,
        percentage: billingDetailForm.percentage || "0%",
        amount: billingDetailForm.amount || 0,
        status: billingDetailForm.status || "Pending",
      };

      console.log("Adding billing detail with payload:", payload);

      // Add billing detail
      const detailResponse = await axios.post(
        process.env.NEXT_PUBLIC_BACKEND_API + "/api/billingDetail",
        payload
      );
      console.log("New billing detail added:", detailResponse.data);

      // Add the newly used waybill number to the set
      setUsedWaybillNumbers(
        (prev) => new Set([...prev, billingDetailForm.waybillNumber])
      );

      try {
        // Get the current billing record using the proper endpoint with the billingID path parameter
        const billingResponse = await axios.get(
          process.env.NEXT_PUBLIC_BACKEND_API +
            `/api/billing/billingID/${billingDetailForm.billingID}`
        );

        // Ensure we got a valid billing record
        if (!billingResponse.data) {
          throw new Error(
            `Billing record not found for ID: ${billingDetailForm.billingID}`
          );
        }

        const currentBilling = billingResponse.data;
        console.log("Current billing data:", currentBilling);

        // Calculate new totals - ensure we use numeric values with fallbacks to 0
        const newGross = (currentBilling.gross || 0) + (payload.gross || 0);
        const newVat = (currentBilling.vat || 0) + (payload.vat || 0);
        const newNet = (currentBilling.net || 0) + (payload.net || 0);
        const newWithTax =
          (currentBilling.withTax || 0) + (payload.withTax || 0);
        const newNetAmount =
          (currentBilling.netAmount || 0) + (payload.netAmount || 0);

        console.log("Updating billing totals:", {
          gross: newGross,
          vat: newVat,
          net: newNet,
          withTax: newWithTax,
          netAmount: newNetAmount,
        });

        // Update the billing record with new totals
        await axios.put(
          process.env.NEXT_PUBLIC_BACKEND_API +
            `/api/billing/${currentBilling._id}`,
          {
            gross: newGross,
            vat: newVat,
            net: newNet,
            withTax: newWithTax,
            netAmount: newNetAmount,
          }
        );

        // If the main billing record has a status of Billed or Paid, update the waybill status too
        if (
          currentBilling.status === "Billed" ||
          currentBilling.status === "Paid"
        ) {
          try {
            // Update the waybill status in waybillSummary to BILLED
            await axios.put(
              `${process.env.NEXT_PUBLIC_BACKEND_API}/api/waybillSummary/updateStatus/${payload.waybillNumber}`,
              { status: "BILLED" }
            );
            console.log(
              `Updated waybill summary status for ${payload.waybillNumber} to BILLED`
            );

            // Always use "USED" for internal tracking
            const waybillStatus = "USED";

            // Fetch all the waybills to get the ID of our waybill
            const waybillsResponse = await axios.get(
              process.env.NEXT_PUBLIC_BACKEND_API + `/api/waybills`
            );

            // Find the waybill that matches our waybill number
            const waybillToUpdate = waybillsResponse.data.find(
              (waybill) => waybill.waybillNumber === payload.waybillNumber
            );

            if (waybillToUpdate) {
              // Update the waybill status
              await axios.put(
                process.env.NEXT_PUBLIC_BACKEND_API +
                  `/api/waybills/${payload.waybillNumber}`,
                { status: waybillStatus }
              );
              console.log(
                `Updated waybill ${payload.waybillNumber} status to "${waybillStatus}"`
              );
            }
          } catch (waybillErr) {
            console.error("Error updating waybill status:", waybillErr);
            console.error("Error details:", waybillErr.response?.data);
          }
        }

        // Refresh the billing data
        await fetchBillingData();

        // Refresh the billing details
        await fetchBillingDetailData(billingDetailForm.billingID);

        setIsAddDetailFormOpen(false);
        resetBillingDetailForm();

        toast({
          title: "Success",
          description: "Billing detail added successfully!",
          status: "success",
          duration: 3000,
          isClosable: true,
          position: "top-right",
        });
      } catch (err) {
        console.error("Error updating billing totals:", err);
        toast({
          title: "Error",
          description:
            "Failed to update billing totals: " +
            (err.message || "Unknown error"),
          status: "error",
          duration: 3000,
          isClosable: true,
          position: "top-right",
        });
      }
    } catch (err) {
      console.error("Error details:", err.response?.data);
      toast({
        title: "Error",
        description:
          err.response?.data?.error ||
          "An error occurred while adding the billing detail.",
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "top-right",
      });
    } finally {
      setIsAddingDetail(false);
    }
  };

  const handleCloseDetailsModal = () => {
    setIsAddDetailFormOpen(false); // Close the add detail form if open
    setDetailsModalState(false); // Use direct state setting instead of onDetailsModalClose()
  };

  const filteredBillingData = billingRecords.filter((billing) => {
    // Convert search term to lowercase for case-insensitive search
    const search = searchTerm.toLowerCase();

    // Check if any of the fields contain the search term
    const matchesSearch =
      (billing.siNumber?.toLowerCase() || "").includes(search) ||
      (billing.storeName?.toLowerCase() || "").includes(search) ||
      (billing.invoiceDate
        ? new Date(billing.invoiceDate)
            .toLocaleDateString()
            .toLowerCase()
            .includes(search)
        : false) ||
      (billing.gross?.toString().toLowerCase() || "").includes(search) ||
      (billing.vat?.toString().toLowerCase() || "").includes(search) ||
      (billing.net?.toString().toLowerCase() || "").includes(search) ||
      (billing.withTax?.toString().toLowerCase() || "").includes(search) ||
      (billing.netAmount?.toString().toLowerCase() || "").includes(search) ||
      (billing.status?.toLowerCase() || "").includes(search);

    // Check if status filter matches
    const matchesStatus =
      statusFilter === "all" || billing.status === statusFilter;

    // Return true only if both search and status filter match
    return matchesSearch && matchesStatus;
  });

  // Apply time filter
  const timeFilteredBillingData = getFilteredByTime(filteredBillingData);

  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentRecords = timeFilteredBillingData.slice(
    indexOfFirstRecord,
    indexOfLastRecord
  );
  const totalPages = Math.ceil(totalRecords / recordsPerPage);

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  const fetchWaybillNumbers = async (consignee) => {
    try {
      let filteredData = [];

      if (sourceType === "Store") {
        // Original logic for Store - fetch from consigneeInfo
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_BACKEND_API}/api/consigneeInfo`
        );

        // Filter the response data to only include entries with the matching company
        filteredData = response.data.filter(
          (item) => item.company === consignee
        );
      } else {
        // New logic for DC - fetch from subDetails
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_BACKEND_API}/api/subdetails`
        );
        console.log("All subdetails:", response.data);

        // Filter the response data to only include entries with the matching consignee (storeName)
        filteredData = response.data.filter(
          (item) => item.storeName === consignee
        );
        console.log(`Filtered subdetails for DC ${consignee}:`, filteredData);
      }

      // Get all distinct waybill numbers for this consignee
      const allWaybillNums = [
        ...new Set(filteredData.map((item) => item.waybillNumber)),
      ];

      // Now fetch all billing details across all billing records to find already billed/paid waybills
      const billingDetailsResponse = await axios.get(
        process.env.NEXT_PUBLIC_BACKEND_API + `/api/billingDetail`
      );

      // Filter out waybill numbers that have already been billed or paid
      const billedOrPaidWaybills = new Set(
        billingDetailsResponse.data
          .filter(
            (detail) =>
              (detail.status === "Billed" || detail.status === "Paid") &&
              filteredData.some(
                (item) => item.waybillNumber === detail.waybillNumber
              )
          )
          .map((detail) => detail.waybillNumber)
      );

      console.log("All waybill numbers for consignee:", allWaybillNums);
      console.log("Already billed or paid waybill numbers:", [
        ...billedOrPaidWaybills,
      ]);

      // Filter out the waybill numbers that are already billed or paid
      const availableWaybillNums = allWaybillNums.filter(
        (waybillNum) => !billedOrPaidWaybills.has(waybillNum)
      );

      setFilteredWaybillNumbers(availableWaybillNums);
    } catch (err) {
      console.error("Error fetching waybill numbers:", err);
      toast({
        title: "Error",
        description: "Failed to fetch waybill numbers.",
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "top-right",
      });
    }
  };

  // Add this new function to handle billing detail deletion
  const handleDeleteBillingDetail = async (billingDetailID, billingID) => {
    if (
      window.confirm("Are you sure you want to delete this billing detail?")
    ) {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          toast({
            title: "Error",
            description: "Authentication token not found. Please log in.",
            status: "error",
          });
          return;
        }

        console.log(
          `Deleting billing detail: ${billingDetailID} from billing: ${billingID}`
        );

        // First get the billing detail to subtract its values
        const detailResponse = await axios.get(
          process.env.NEXT_PUBLIC_BACKEND_API +
            `/api/billingDetail/${billingDetailID}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const detailToDelete = detailResponse.data;
        console.log("Detail to delete:", detailToDelete);

        // Delete the billing detail
        await axios.delete(
          process.env.NEXT_PUBLIC_BACKEND_API +
            `/api/billingDetail/${billingDetailID}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        // Get the current billing record using billingID path parameter
        const billingResponse = await axios.get(
          process.env.NEXT_PUBLIC_BACKEND_API +
            `/api/billing/billingID/${billingID}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const currentBilling = billingResponse.data;
        console.log("Current billing before update:", currentBilling);

        // Subtract the deleted detail's values from the billing totals
        // Ensure we use numeric values with fallbacks to 0
        const updatedBilling = {
          gross: Math.max(
            0,
            (currentBilling.gross || 0) - (detailToDelete.gross || 0)
          ),
          vat: Math.max(
            0,
            (currentBilling.vat || 0) - (detailToDelete.vat || 0)
          ),
          net: Math.max(
            0,
            (currentBilling.net || 0) - (detailToDelete.net || 0)
          ),
          withTax: Math.max(
            0,
            (currentBilling.withTax || 0) - (detailToDelete.withTax || 0)
          ),
          netAmount: Math.max(
            0,
            (currentBilling.netAmount || 0) - (detailToDelete.netAmount || 0)
          ),
        };

        console.log("Updated billing totals after deletion:", updatedBilling);

        // Update the billing record with new totals
        await axios.put(
          process.env.NEXT_PUBLIC_BACKEND_API +
            `/api/billing/${currentBilling._id}`,
          updatedBilling
        );

        // Reset the waybill status and waybillSummary status
        try {
          // Update the waybillSummary status to NOT BILLED
          await axios.put(
            `${process.env.NEXT_PUBLIC_BACKEND_API}/api/waybillSummary/updateStatus/${detailToDelete.waybillNumber}`,
            { status: "NOT BILLED" }
          );
          console.log(
            `Reset waybill summary status for ${detailToDelete.waybillNumber} to NOT BILLED`
          );

          // Fetch all the waybills to get the ID of our waybill
          const waybillsResponse = await axios.get(
            process.env.NEXT_PUBLIC_BACKEND_API + `/api/waybills`
          );

          // Find the waybill that matches our waybill number
          const waybillToUpdate = waybillsResponse.data.find(
            (waybill) => waybill.waybillNumber === detailToDelete.waybillNumber
          );

          if (waybillToUpdate) {
            // Update the waybill status back to USED
            await axios.put(
              process.env.NEXT_PUBLIC_BACKEND_API +
                `/api/waybills/${detailToDelete.waybillNumber}`,
              { status: "USED" }
            );
            console.log(
              `Reset waybill ${detailToDelete.waybillNumber} status to "USED"`
            );
          }
        } catch (waybillErr) {
          console.error("Error updating waybill status:", waybillErr);
        }

        // Remove the waybill number from used numbers
        setUsedWaybillNumbers((prev) => {
          const newSet = new Set(prev);
          newSet.delete(detailToDelete.waybillNumber);
          return newSet;
        });

        // Refresh the billing details
        await fetchBillingDetailData(billingID);

        // Refresh the main billing data
        await fetchBillingData();

        toast({
          title: "Success",
          description: "Billing detail deleted successfully!",
          status: "success",
          duration: 3000,
          isClosable: true,
          position: "top-right",
        });
      } catch (err) {
        console.error("Error deleting billing detail:", err);
        toast({
          title: "Error",
          description:
            "Failed to delete billing detail: " +
            (err.message || "Unknown error"),
          status: "error",
          duration: 3000,
          isClosable: true,
          position: "top-right",
        });
      }
    }
  };

  // Handle time filter change
  const handleTimeFilterChange = (value) => {
    setTimeFilter(value);
  };

  // Handle status box click
  const handleStatusBoxClick = (status) => {
    setStatusFilter(status);
    setCurrentPage(1); // Reset to page 1 when changing filters
  };

  // Add new handler for status click
  const handleStatusClick = (billing) => {
    setSelectedBillingForStatus(billing);
    setStatusFormData({
      status: billing.status || "",
      datePaid:
        billing.status === "Paid"
          ? billing.paidAt
            ? new Date(billing.paidAt).toISOString().split("T")[0]
            : ""
          : billing.status === "Billed"
            ? billing.dateBilled
              ? new Date(billing.dateBilled).toISOString().split("T")[0]
              : ""
            : "",
      actualAmountPaid: billing.actualAmountPaid || 0,
      chargeType: billing.chargeType || "None",
      chargeAmount: billing.chargeAmount || 0,
      receiptNumber: billing.receiptNumber || "", // Populate receiptNumber
      remarks: billing.remarks || "",
    });
    onStatusModalOpen();
  };

  // Add new handler for status form changes
  const handleStatusFormChange = (e) => {
    const { name, value } = e.target;
    setStatusFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Add new handler for status update
  const handleStatusUpdate = async (billingId, formData) => {
    try {
      setIsStatusUpdating(true);

      const updateData = {
        status: formData.status,
        ...(formData.status === "Paid" && {
          paidAt: formData.datePaid,
          actualAmountPaid: formData.actualAmountPaid,
          chargeType: formData.chargeType, // Use chargeType
          chargeAmount: formData.chargeAmount,
          receiptNumber: formData.receiptNumber,
          remarks: formData.remarks,
        }),
        ...(formData.status === "Billed" && {
          dateBilled: formData.datePaid,
        }),
      };

      console.log("Updating billing with ID:", billingId);
      console.log("Update data:", updateData);

      const response = await axios.put(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/billing/${billingId}`,
        updateData
      );

      if (response.status === 200) {
        toast({
          title: "Success",
          description: "Status updated successfully",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
        onStatusModalClose();
        fetchBillingData();

        // --- Add logic to update related details and waybills ---
        const newStatus = formData.status;
        const billingID = billingRecords.find(
          (b) => b._id === billingId
        ).billingID; // Get billingID from the original billing object

        if (
          billingID &&
          (newStatus === "Paid" ||
            newStatus === "Billed" ||
            newStatus === "Cancelled" ||
            newStatus === "Pending")
        ) {
          try {
            // 1. Fetch associated billing details
            const detailsResponse = await axios.get(
              `${process.env.NEXT_PUBLIC_BACKEND_API}/api/billingDetail/billingID/${billingID}`
            );
            const details = detailsResponse.data;
            console.log(
              `Found ${details.length} details for billingID ${billingID}`
            );

            // 2. Update status of each billing detail
            const updateDetailPromises = details.map((detail) =>
              axios.put(
                `${process.env.NEXT_PUBLIC_BACKEND_API}/api/billingDetail/${detail._id}`,
                { status: newStatus }
              )
            );
            await Promise.all(updateDetailPromises);
            console.log(
              `Updated status of ${details.length} billing details to "${newStatus}"`
            );

            // 3. Update status of associated waybills
            const waybillNumbers = details
              .map((d) => d.waybillNumber)
              .filter(Boolean);

            if (waybillNumbers.length > 0) {
              console.log(
                "Waybill numbers to update status for:",
                waybillNumbers
              );

              // Determine the right waybill status based on billing status
              let waybillStatus;
              if (newStatus === "Paid" || newStatus === "Billed") {
                // Regular waybill status for internal tracking
                waybillStatus = "USED";

                // Also update the billing status in waybillSummary to BILLED
                const waybillSummaryUpdatePromises = waybillNumbers.map(
                  (wbNum) =>
                    axios
                      .put(
                        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/waybillSummary/updateStatus/${wbNum}`,
                        { status: "BILLED" }
                      )
                      .catch((err) => {
                        console.error(
                          `Failed to update waybill summary status for ${wbNum}:`,
                          err.response?.data || err.message
                        );
                      })
                );
                await Promise.all(waybillSummaryUpdatePromises);
                console.log(
                  `Updated waybill summary status for ${waybillNumbers.length} waybills to BILLED`
                );
              } else if (newStatus === "Pending") {
                // For Pending status, set waybill summary back to NOT BILLED
                waybillStatus = "USED"; // Keep the waybill status as USED

                const waybillSummaryUpdatePromises = waybillNumbers.map(
                  (wbNum) =>
                    axios
                      .put(
                        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/waybillSummary/updateStatus/${wbNum}`,
                        { status: "NOT BILLED" }
                      )
                      .catch((err) => {
                        console.error(
                          `Failed to update waybill summary status for ${wbNum}:`,
                          err.response?.data || err.message
                        );
                      })
                );
                await Promise.all(waybillSummaryUpdatePromises);
                console.log(
                  `Updated waybill summary status for ${waybillNumbers.length} waybills to NOT BILLED`
                );
              } else if (newStatus === "Cancelled") {
                waybillStatus = "USED"; // Keep as USED

                // Also update the billing status in waybillSummary to NOT BILLED when cancelled
                const waybillSummaryUpdatePromises = waybillNumbers.map(
                  (wbNum) =>
                    axios
                      .put(
                        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/waybillSummary/updateStatus/${wbNum}`,
                        { status: "NOT BILLED" }
                      )
                      .catch((err) => {
                        console.error(
                          `Failed to update waybill summary status for ${wbNum}:`,
                          err.response?.data || err.message
                        );
                      })
                );
                await Promise.all(waybillSummaryUpdatePromises);
                console.log(
                  `Updated waybill summary status for ${waybillNumbers.length} waybills to NOT BILLED (cancelled)`
                );
              }

              // Always update the main waybill status
              const waybillStatusUpdatePromises = waybillNumbers.map((wbNum) =>
                axios
                  .put(
                    `${process.env.NEXT_PUBLIC_BACKEND_API}/api/waybills/${wbNum}`,
                    { status: waybillStatus }
                  )
                  .catch((err) => {
                    // Log error but continue trying others
                    console.error(
                      `Failed to update waybill ${wbNum} status:`,
                      err.response?.data || err.message
                    );
                  })
              );
              await Promise.all(waybillStatusUpdatePromises);
              console.log(
                `Updated status for ${waybillNumbers.length} waybills to ${waybillStatus}`
              );
            }
          } catch (detailsError) {
            console.error(
              "Error updating related details/waybills:",
              detailsError
            );
            // Show a secondary toast? Or just log?
            toast({
              title: "Warning",
              description:
                "Main status updated, but failed to update related details or waybills.",
              status: "warning",
              duration: 4000,
              isClosable: true,
            });
          }
        }
        // --- End of added logic ---
      }
    } catch (error) {
      console.error("Error updating status:", error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to update status",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsStatusUpdating(false);
    }
  };

  // Add date limit calculation at the top of the component
  const today = new Date().toISOString().split("T")[0];
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const minDate = thirtyDaysAgo.toISOString().split("T")[0];

  const columns = [
    {
      Header: "Service Invoice No.",
      accessor: "siNumber",
      width: "120px",
    },
    {
      Header: "Invoice Date",
      accessor: "invoiceDate",
      width: "100px",
    },
    {
      Header: "Invoice Received Date",
      accessor: "dateBilled",
      width: "100px",
      Cell: ({ value }) =>
        value ? format(new Date(value), "MM/dd/yyyy") : "-",
    },
    {
      Header: "Date Paid",
      accessor: "paidAt",
      width: "100px",
    },
    {
      Header: "Customer's Name",
      accessor: "storeName",
      width: "150px",
    },
    {
      Header: "Address",
      accessor: "address",
      width: "200px",
    },
    {
      Header: "TIN",
      accessor: "tin",
      width: "120px",
    },
    {
      Header: "Payment Method",
      accessor: "bottomPaymentMethod",
      width: "100px",
    },
    {
      Header: "Total Sales",
      accessor: "gross",
      width: "100px",
    },
    {
      Header: "12% VAT",
      accessor: "vat",
      width: "100px",
    },
    {
      Header: "Net of VAT",
      accessor: "net",
      width: "100px",
    },
    {
      Header: "Less W/Tax",
      accessor: "withHoldingTax",
      width: "100px",
    },
    {
      Header: "Total Amount Due",
      accessor: "netAmount",
      width: "120px",
    },
    {
      Header: "Actual Amount Paid",
      accessor: "actualAmountPaid",
      width: "120px",
    },
    {
      Header: "Charge Amount",
      accessor: "chargeAmount",
      width: "120px",
    },
    {
      Header: "Receipt Number",
      accessor: "receiptNumber",
      width: "120px",
    },
    {
      Header: "Remarks",
      accessor: "remarks",
      width: "150px",
    },
    {
      Header: "Status",
      accessor: "status",
      width: "100px",
    },
    {
      Header: "Actions",
      accessor: "actions",
      width: "100px",
    },
    {
      Header: "Due Date",
      accessor: "dueDate",
      width: "100px",
      Cell: ({ value }) =>
        value ? format(new Date(value), "MM/dd/yyyy") : "-",
    },
    {
      Header: "Charge Type", // New column definition
      accessor: "chargeType",
      width: "100px",
    },
  ];

  // Add a new function specifically for calculating Total Amount Due for Last Week
  const calculateLastWeekTotalAmountDue = (data) => {
    if (!data || data.length === 0) return 0;

    // Use the date range from totalAmountDueDateRange
    const { startDate, endDate } = totalAmountDueDateRange;

    if (!startDate || !endDate) return 0;

    // Filter records where:
    // 1. Invoice Received Date (dateBilled) falls within the last week date range
    // 2. Status is "Billed"
    const filteredRecords = data.filter((bill) => {
      if (!bill.dateBilled || bill.status !== "Billed") return false;
      const billDate = new Date(bill.dateBilled);
      return billDate >= startDate && billDate <= endDate;
    });

    // Sum up Total Amount Due (netAmount) from filtered records
    const totalAmount = filteredRecords.reduce((total, bill) => {
      return total + (Number(bill.netAmount) || 0);
    }, 0);

    return totalAmount;
  };

  // Add loading skeleton for the Total Amount Due box
  const TotalAmountDueSkeleton = () => (
    <Box
      bg="white"
      p={4}
      borderRadius="lg"
      boxShadow="0px 8px 30px rgba(0, 0, 0, 0.1)"
      width="250px"
      height="120px"
      position="relative"
      borderTop="4px solid teal.500"
    >
      <Skeleton height="24px" width="150px" mb={3} />
      <Skeleton height="36px" width="200px" />
    </Box>
  );

  // Add loading skeleton for the table
  const TableSkeleton = () => (
    <Box
      overflowX="auto"
      borderRadius="md"
      boxShadow="sm"
      bg="white"
      maxH="calc(100vh - 350px)"
      minH="300px"
      overflowY="auto"
      mt={-4}
      mx={-2}
      px={2}
    >
      <Table variant="simple" size="sm">
        <Thead position="sticky" top={0} bg="white" zIndex={1}>
          <Tr>
            {[...Array(18)].map((_, index) => (
              <Th
                key={index}
                width="120px"
                py={3}
                px={2}
                borderBottomWidth="2px"
                borderColor="gray.200"
                fontSize="xs"
              >
                <Skeleton height="16px" />
              </Th>
            ))}
          </Tr>
        </Thead>
        <Tbody>
          {[...Array(5)].map((_, rowIndex) => (
            <Tr key={rowIndex}>
              {[...Array(18)].map((_, colIndex) => (
                <Td key={colIndex} py={2} px={2}>
                  <Skeleton height="20px" />
                </Td>
              ))}
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Box>
  );

  // Update the Total Amount Due box to show loading state
  const TotalAmountDueBox = () =>
    isStatsLoading ? (
      <TotalAmountDueSkeleton />
    ) : (
      <Box
        bg="white"
        p={4}
        borderRadius="lg"
        boxShadow="0px 8px 30px rgba(0, 0, 0, 0.1)"
        width="250px"
        height="120px"
        position="relative"
        borderTop="4px solid teal.500"
        _hover={{
          transform: "translateY(-5px)",
          boxShadow: "0px 15px 35px rgba(49, 151, 149, 0.2)",
        }}
        transition="all 0.3s ease"
      >
        <Text fontSize="md" fontWeight="bold" color="teal.600" mb={3}>
          Total Amount Due
        </Text>
        <AnimatePresence mode="wait">
          <Text
            as={motion.div}
            fontSize="3xl"
            fontWeight="bold"
            color="teal.700"
            display="flex"
            alignItems="center"
          >
            <Box as="span" display="inline-flex">
              ₱
              <AnimatedNumber
                value={formatNumber(
                  calculateLastWeekTotalAmountDue(billingRecords)
                )}
              />
            </Box>
          </Text>
        </AnimatePresence>
      </Box>
    );

  // Update MainTable component to use serverside pagination directly
  const MainTable = () =>
    isTableLoading ? (
      <TableSkeleton />
    ) : (
      <Box
        overflowX="auto"
        borderRadius="md"
        boxShadow="sm"
        bg="white"
        maxH="calc(100vh - 350px)"
        minH="300px"
        overflowY="auto"
        mt={-4}
        mx={-2}
        px={2}
      >
        <Table variant="simple" size="sm">
          <Thead position="sticky" top={0} bg="white" zIndex={1}>
            <Tr>
              {columnVisibility.siNumber && (
                <Th
                  width="120px"
                  py={3}
                  px={2}
                  borderBottomWidth="2px"
                  borderColor="gray.200"
                  fontSize="xs"
                  cursor="pointer"
                  onClick={() => requestSort("siNumber")}
                >
                  Service Invoice No. {getSortIcon("siNumber")}
                </Th>
              )}
              {columnVisibility.invoiceDate && (
                <Th
                  width="100px"
                  py={3}
                  px={2}
                  borderBottomWidth="2px"
                  borderColor="gray.200"
                  fontSize="xs"
                  cursor="pointer"
                  onClick={() => requestSort("invoiceDate")}
                >
                  Invoice Date {getSortIcon("invoiceDate")}
                </Th>
              )}
              {columnVisibility.dateBilled && (
                <Th
                  width="100px"
                  py={3}
                  px={2}
                  borderBottomWidth="2px"
                  borderColor="gray.200"
                  fontSize="xs"
                  cursor="pointer"
                  onClick={() => requestSort("dateBilled")}
                >
                  Invoice Received {getSortIcon("dateBilled")}
                </Th>
              )}
              {columnVisibility.dueDate && (
                <Th
                  width="100px"
                  py={3}
                  px={2}
                  borderBottomWidth="2px"
                  borderColor="gray.200"
                  fontSize="xs"
                  cursor="pointer"
                  onClick={() => requestSort("dueDate")}
                >
                  Due Date {getSortIcon("dueDate")}
                </Th>
              )}
              {columnVisibility.paidAt && (
                <Th
                  width="100px"
                  py={3}
                  px={2}
                  borderBottomWidth="2px"
                  borderColor="gray.200"
                  fontSize="xs"
                  cursor="pointer"
                  onClick={() => requestSort("paidAt")}
                >
                  Date Paid {getSortIcon("paidAt")}
                </Th>
              )}
              {columnVisibility.storeName && (
                <Th
                  width="150px"
                  py={3}
                  px={2}
                  borderBottomWidth="2px"
                  borderColor="gray.200"
                  fontSize="xs"
                >
                  Customer's Name
                </Th>
              )}
              {columnVisibility.address && (
                <Th
                  width="200px"
                  py={3}
                  px={2}
                  borderBottomWidth="2px"
                  borderColor="gray.200"
                  fontSize="xs"
                >
                  Address
                </Th>
              )}
              {columnVisibility.tin && (
                <Th
                  width="120px"
                  py={3}
                  px={2}
                  borderBottomWidth="2px"
                  borderColor="gray.200"
                  fontSize="xs"
                >
                  TIN
                </Th>
              )}
              {columnVisibility.bottomPaymentMethod && (
                <Th
                  width="100px"
                  py={3}
                  px={2}
                  borderBottomWidth="2px"
                  borderColor="gray.200"
                  fontSize="xs"
                >
                  Payment Method
                </Th>
              )}
              {columnVisibility.gross && (
                <Th
                  width="100px"
                  py={3}
                  px={2}
                  borderBottomWidth="2px"
                  borderColor="gray.200"
                  fontSize="xs"
                >
                  Total Sales
                </Th>
              )}
              {columnVisibility.vat && (
                <Th
                  width="100px"
                  py={3}
                  px={2}
                  borderBottomWidth="2px"
                  borderColor="gray.200"
                  fontSize="xs"
                >
                  12% VAT
                </Th>
              )}
              {columnVisibility.net && (
                <Th
                  width="100px"
                  py={3}
                  px={2}
                  borderBottomWidth="2px"
                  borderColor="gray.200"
                  fontSize="xs"
                >
                  Net of VAT
                </Th>
              )}
              {columnVisibility.withHoldingTax && (
                <Th
                  width="100px"
                  py={3}
                  px={2}
                  borderBottomWidth="2px"
                  borderColor="gray.200"
                  fontSize="xs"
                >
                  Less W/Tax
                </Th>
              )}
              {columnVisibility.netAmount && (
                <Th
                  width="120px"
                  py={3}
                  px={2}
                  borderBottomWidth="2px"
                  borderColor="gray.200"
                  fontSize="xs"
                >
                  Total Amount Due
                </Th>
              )}
              {columnVisibility.actualAmountPaid && (
                <Th
                  width="120px"
                  py={3}
                  px={2}
                  borderBottomWidth="2px"
                  borderColor="gray.200"
                  fontSize="xs"
                >
                  Actual Amount Paid
                </Th>
              )}
              {columnVisibility.chargeType && ( // NEW POSITION
                <Th
                  width="100px"
                  py={3}
                  px={2}
                  borderBottomWidth="2px"
                  borderColor="gray.200"
                  fontSize="xs"
                >
                  Charge Type
                </Th>
              )}
              {columnVisibility.chargeAmount && (
                <Th
                  width="120px"
                  py={3}
                  px={2}
                  borderBottomWidth="2px"
                  borderColor="gray.200"
                  fontSize="xs"
                >
                  Charge Amount
                </Th>
              )}
              {columnVisibility.receiptNumber && (
                <Th
                  width="120px"
                  py={3}
                  px={2}
                  borderBottomWidth="2px"
                  borderColor="gray.200"
                  fontSize="xs"
                >
                  Receipt Number
                </Th>
              )}
              {columnVisibility.remarks && (
                <Th
                  width="150px"
                  py={3}
                  px={2}
                  borderBottomWidth="2px"
                  borderColor="gray.200"
                  fontSize="xs"
                >
                  Remarks
                </Th>
              )}
              {columnVisibility.status && (
                <Th
                  width="100px"
                  py={3}
                  px={2}
                  borderBottomWidth="2px"
                  borderColor="gray.200"
                  fontSize="xs"
                >
                  Status
                </Th>
              )}
              {columnVisibility.actions && (
                <Th
                  width="100px"
                  py={3}
                  px={2}
                  borderBottomWidth="2px"
                  borderColor="gray.200"
                  fontSize="xs"
                  textAlign="center"
                >
                  Actions
                </Th> // Centered Actions
              )}
            </Tr>
          </Thead>
          <Tbody>
            {sortedBillingData && sortedBillingData.length > 0 ? (
              sortedBillingData.map((billing) => (
                <Tr
                  key={billing._id}
                  bg="white"
                  _hover={{
                    bg: "gray.50",
                  }}
                  transition="all 0.2s"
                  as={motion.tr}
                  whileHover={{
                    backgroundColor: "#F7FAFC",
                    boxShadow: "0px 3px 10px rgba(0, 0, 0, 0.1)",
                    transform: "translateY(-2px)",
                  }}
                  style={{ transition: "all 0.2s" }}
                >
                  {columnVisibility.siNumber && (
                    <Td py={2} px={2} fontSize="sm">
                      {billing.siNumber || "N/A"}
                    </Td>
                  )}
                  {columnVisibility.invoiceDate && (
                    <Td py={2} px={2} fontSize="sm">
                      {billing.invoiceDate
                        ? new Date(billing.invoiceDate).toLocaleDateString()
                        : "N/A"}
                    </Td>
                  )}
                  {columnVisibility.dateBilled && (
                    <Td py={2} px={2} fontSize="sm">
                      {billing.status === "Cancelled"
                        ? "Cancelled"
                        : billing.dateBilled
                          ? new Date(billing.dateBilled).toLocaleDateString()
                          : "N/A"}
                    </Td>
                  )}
                  {columnVisibility.dueDate && (
                    <Td py={2} px={2} fontSize="sm">
                      {billing.dueDate
                        ? new Date(billing.dueDate).toLocaleDateString()
                        : "N/A"}
                    </Td>
                  )}
                  {columnVisibility.paidAt && (
                    <Td py={2} px={2} fontSize="sm">
                      {billing.status === "Paid" && billing.paidAt
                        ? new Date(billing.paidAt).toLocaleDateString()
                        : "N/A"}
                    </Td>
                  )}
                  {columnVisibility.storeName && (
                    <Td py={2} px={2} fontSize="sm">
                      {billing.storeName || "N/A"}
                    </Td>
                  )}
                  {columnVisibility.address && (
                    <Td py={2} px={2} fontSize="sm">
                      {billing.address || "N/A"}
                    </Td>
                  )}
                  {columnVisibility.tin && (
                    <Td py={2} px={2} fontSize="sm">
                      {formatTIN(billing.tin)}
                    </Td>
                  )}
                  {columnVisibility.bottomPaymentMethod && (
                    <Td py={2} px={2} fontSize="sm">
                      {billing.bottomPaymentMethod || "CASH"}
                    </Td>
                  )}
                  {columnVisibility.gross && (
                    <Td py={2} px={2} fontSize="sm">
                      ₱{formatNumber(billing.gross)}
                    </Td>
                  )}
                  {columnVisibility.vat && (
                    <Td py={2} px={2} fontSize="sm">
                      ₱{formatNumber(billing.vat)}
                    </Td>
                  )}
                  {columnVisibility.net && (
                    <Td py={2} px={2} fontSize="sm">
                      ₱{formatNumber(billing.net)}
                    </Td>
                  )}
                  {columnVisibility.withHoldingTax && (
                    <Td py={2} px={2} fontSize="sm">
                      ₱{formatNumber(billing.withTax)}
                    </Td>
                  )}
                  {columnVisibility.netAmount && (
                    <Td py={2} px={2} fontSize="sm">
                      ₱{formatNumber(billing.netAmount)}
                    </Td>
                  )}
                  {columnVisibility.actualAmountPaid && (
                    <Td py={2} px={2} fontSize="sm">
                      ₱{formatNumber(billing.actualAmountPaid)}
                    </Td>
                  )}
                  {columnVisibility.chargeType && (
                    <Td py={2} px={2} fontSize="sm">
                      {billing.chargeType || "None"}
                    </Td>
                  )}{" "}
                  {/* NEW POSITION */}
                  {columnVisibility.chargeAmount && (
                    <Td py={2} px={2} fontSize="sm">
                      ₱{formatNumber(billing.chargeAmount || 0)}
                    </Td>
                  )}
                  {columnVisibility.receiptNumber && (
                    <Td py={2} px={2} fontSize="sm">
                      {billing.receiptNumber || "N/A"}
                    </Td>
                  )}
                  {columnVisibility.remarks && (
                    <Td py={2} px={2} fontSize="sm">
                      {billing.remarks || "None"}
                    </Td>
                  )}
                  {columnVisibility.status && (
                    <Td py={2} px={2}>
                      <Text
                        px={2}
                        py={1}
                        borderRadius="md"
                        fontWeight="medium"
                        fontSize="xs"
                        display="inline-block"
                        bg={
                          billing.status === "Pending"
                            ? "yellow.100"
                            : billing.status === "Paid"
                              ? "green.100"
                              : billing.status === "Billed"
                                ? "red.100"
                                : billing.status === "Overdue"
                                  ? "orange.100"
                                  : "gray.100" /* Added Overdue and default */
                        }
                        color={
                          billing.status === "Pending"
                            ? "yellow.800"
                            : billing.status === "Paid"
                              ? "green.800"
                              : billing.status === "Billed"
                                ? "red.800"
                                : billing.status === "Overdue"
                                  ? "orange.800"
                                  : "gray.800" /* Added Overdue and default */
                        }
                        cursor="pointer"
                        onClick={() => handleStatusClick(billing)}
                        _hover={{ opacity: 0.8 }}
                      >
                        {billing.status}
                      </Text>
                    </Td>
                  )}
                  {columnVisibility.actions && (
                    <Td py={2} px={2} textAlign="center">
                      {" "}
                      {/* Center the menu */}
                      <Menu>
                        <MenuButton
                          as={IconButton}
                          aria-label="Actions"
                          icon={<BsThreeDotsVertical />}
                          variant="ghost"
                          size="sm"
                        />
                        <Portal>
                          {" "}
                          {/* Wrap MenuList in Portal */}
                          <MenuList minWidth="120px" zIndex="popover">
                            {" "}
                            {/* Add zIndex just in case */}
                            <MenuItem
                              icon={<ViewIcon />}
                              onClick={() => handleViewDetails(billing)}
                              fontSize="sm"
                            >
                              View Details
                            </MenuItem>
                            <MenuItem
                              icon={<EditIcon />}
                              onClick={() => handleEditBilling(billing)}
                              fontSize="sm"
                            >
                              Edit
                            </MenuItem>
                            <MenuItem
                              icon={<DeleteIcon />}
                              color="red.500"
                              onClick={() => handleDeleteClick(billing)}
                              fontSize="sm"
                              isDisabled={isDeletingBilling}
                            >
                              Delete
                            </MenuItem>
                          </MenuList>
                        </Portal>
                      </Menu>
                    </Td>
                  )}
                </Tr>
              ))
            ) : (
              <Tr>
                <Td
                  colSpan={
                    Object.values(columnVisibility).filter((v) => v).length
                  }
                  textAlign="center"
                  py={8}
                >
                  No billing records found
                </Td>
              </Tr>
            )}
          </Tbody>
        </Table>

        {/* Pagination controls */}
        <Flex justifyContent="center" mt={5} mb={3}>
          <Button
            onClick={() => handlePageChange(1)}
            disabled={currentPage === 1}
            mx={1}
            size="sm"
          >
            First
          </Button>
          <Button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            mx={1}
            size="sm"
          >
            Prev
          </Button>

          {/* Page number indicators */}
          {[...Array(Math.min(5, totalPages))].map((_, i) => {
            // Show pages around current page
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
                colorScheme={currentPage === pageNum ? "blue" : "gray"}
                mx={1}
                size="sm"
              >
                {pageNum}
              </Button>
            );
          })}

          <Button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            mx={1}
            size="sm"
          >
            Next
          </Button>
          <Button
            onClick={() => handlePageChange(totalPages)}
            disabled={currentPage === totalPages}
            mx={1}
            size="sm"
          >
            Last
          </Button>
        </Flex>
      </Box>
    );

  const BillingDetailsModal = () => (
    <Modal
      isOpen={detailsModalState}
      onClose={() => setDetailsModalState(false)}
      size="6xl"
    >
      <ModalOverlay bg="blackAlpha.300" backdropFilter="blur(3px)" />
      <ModalContent
        maxW="90vw"
        h="95vh"
        borderRadius="xl"
        boxShadow="0 10px 40px rgba(0, 0, 0, 0.3)"
        bg="white"
        p={2}
        overflowY="hidden"
      >
        <ModalHeader
          fontSize="xl"
          fontWeight="bold"
          color="white"
          borderBottomWidth="1px"
          borderColor="gray.100"
          pb={4}
          bg="#1a365d"
          position="relative"
        >
          {selectedBilling?.siNumber
            ? `View Mode - Service Invoice Number: ${selectedBilling.siNumber}`
            : `View Mode - ${selectedBilling?.billingID || ''}`}
          <ModalCloseButton
            color="white"
            position="absolute"
            right="8px"
            top="50%"
            transform="translateY(-50%)"
            fontWeight="900"
            fontSize="16px"
          />
        </ModalHeader>
        <ModalBody p={0}>
          {isDetailLoading ? (
            <Box p={4}>
              <Skeleton height="40px" mb={4} />
              <SkeletonText noOfLines={10} spacing={4} />
            </Box>
          ) : (
            <BillingPaper
              billingData={selectedBilling}
              isEditing={false}
              onClose={() => setDetailsModalState(false)}
              isReadOnly={true}
            />
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  );

  const EditModal = () => (
    <Modal isOpen={isEditModalOpen} onClose={onEditModalClose} size="6xl">
      <ModalOverlay bg="blackAlpha.300" backdropFilter="blur(2px)" />
      <ModalContent
        maxW="90vw"
        h="95vh"
        borderRadius="xl"
        boxShadow="0 10px 40px rgba(0, 0, 0, 0.3)"
        bg="white"
        p={2}
        overflowY="hidden"
      >
        <ModalHeader
          fontSize="xl"
          fontWeight="bold"
          color="white"
          borderBottomWidth="1px"
          borderColor="gray.100"
          pb={4}
          bg="#1a365d"
          position="relative"
        >
          Edit Billing Record
          <ModalCloseButton
            color="white"
            position="absolute"
            right="8px"
            top="50%"
            transform="translateY(-50%)"
            fontWeight="900"
            fontSize="16px"
          />
        </ModalHeader>
        <ModalBody p={0}>
          {isEditLoading ? (
            <Box p={4}>
              <Skeleton height="40px" mb={4} />
              <SkeletonText noOfLines={10} spacing={4} />
            </Box>
          ) : (
            <BillingPaper
              billingData={editFormData}
              isEditing={true}
              onClose={onEditModalClose}
              onDataChange={fetchBillingData}
            />
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  );

  const ActionButtons = ({ billing }) => (
    <HStack spacing={1}>
      <IconButton
        aria-label="Edit billing"
        icon={<EditIcon />}
        colorScheme="blue"
        onClick={() => handleEditBilling(billing)}
        size="sm"
        variant="ghost"
        isLoading={isEditLoading}
      />
      <IconButton
        aria-label="Delete billing"
        icon={<DeleteIcon />}
        colorScheme="red"
        onClick={() => handleDeleteClick(billing)}
        size="sm"
        variant="ghost"
        isDisabled={isDeletingBilling}
      />
    </HStack>
  );

  const StatusModal = ({ isOpen, onClose, billing, initialData, onUpdate }) => {
    const [statusFormData, setStatusFormData] = useState({
      status: initialData.status || "",
      datePaid: initialData.datePaid || "",
      actualAmountPaid: initialData.actualAmountPaid || 0,
      chargeType: initialData.chargeType || "None",
      chargeAmount: initialData.chargeAmount || 0,
      receiptNumber: initialData.receiptNumber || "", // Ensure receiptNumber is in initial state
      remarks: initialData.remarks || "",
    });

    // Local state for input fields to delay balance calculation
    const [actualAmountPaidInput, setActualAmountPaidInput] = useState(statusFormData.actualAmountPaid);
    const [chargeAmountInput, setChargeAmountInput] = useState(statusFormData.chargeAmount);
    const [calculatedBalance, setCalculatedBalance] = useState(null);

    // Calculate amount due and balance with better precision handling
    const amountDue = billing?.amount || 0;

    // Function to calculate total balance including charges
    const calculateBalance = (actualAmount, chargeAmount) => {
      let calculatedBalance = amountDue - (parseFloat(actualAmount) || 0);
      if (statusFormData.chargeType !== "None" && parseFloat(chargeAmount) > 0) {
        calculatedBalance -= parseFloat(chargeAmount);
      }
      return Math.round(calculatedBalance * 100) / 100;
    };

    // Keep the original total amount due for display
    const totalAmountDue = amountDue;

    // Get today's date for min attribute
    const today = new Date().toISOString().split("T")[0];

    // Determine minimum date for paid status (should be the billing date if available)
    const minPaidDate = billing?.dateBilled
      ? new Date(billing.dateBilled).toISOString().split("T")[0]
      : null;

    // Update state when initialData changes
    useEffect(() => {
      console.log("StatusModal initialData:", initialData);
      console.log("StatusModal billing:", billing);

      setStatusFormData({
        status: initialData.status || "",
        datePaid: initialData.datePaid || "",
        actualAmountPaid: initialData.actualAmountPaid || 0,
        chargeType: initialData.chargeType || "None",
        chargeAmount: initialData.chargeAmount || 0,
        receiptNumber: initialData.receiptNumber || "", // Update receiptNumber here too
        remarks: initialData.remarks || "",
      });
      setActualAmountPaidInput(initialData.actualAmountPaid || 0);
      setChargeAmountInput(initialData.chargeAmount || 0);
      setCalculatedBalance(null);
    }, [initialData, billing]);

    const handleStatusFormChange = (e) => {
      const { name, value } = e.target;
      setStatusFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
      if (name === "actualAmountPaid") setActualAmountPaidInput(value);
      if (name === "chargeAmount") setChargeAmountInput(value);
    };

    // Only update the calculated balance onBlur
    const handleActualAmountBlur = () => {
      setCalculatedBalance(calculateBalance(actualAmountPaidInput, chargeAmountInput));
    };
    const handleChargeAmountBlur = () => {
      setCalculatedBalance(calculateBalance(actualAmountPaidInput, chargeAmountInput));
    };

    const handleSubmit = () => {
      // Check if balance is not zero when status is "Paid"
      if (statusFormData.status === "Paid") {
        const balance = calculatedBalance !== null ? calculatedBalance : calculateBalance(actualAmountPaidInput, chargeAmountInput);
        if (Math.abs(balance) > 0.01) {
          toast({
            title: "Error",
            description: "Cannot save payment. Balance must be zero.",
            status: "error",
            duration: 3000,
            isClosable: true,
            position: "top-right",
          });
          return;
        }
      }

      // If chargeType is set to None, reset chargeAmount, receiptNumber and remarks
      const dataToUpdate = { ...statusFormData };
      if (dataToUpdate.chargeType === "None") {
        dataToUpdate.chargeAmount = 0;
        dataToUpdate.receiptNumber = ""; // Reset receipt number too
        dataToUpdate.remarks = "";
      }

      onUpdate(billing._id, dataToUpdate);
      onClose();
    };

    return (
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Update Status</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <FormControl>
              <FormLabel>Status</FormLabel>
              <Select
                value={statusFormData.status}
                onChange={handleStatusFormChange}
                name="status"
              >
                <option value="Pending">Pending</option>
                <option value="Paid">Paid</option>
                <option value="Cancelled">Cancelled</option>
                <option value="Overdue">Overdue</option>
                <option value="Billed">Billed</option>
              </Select>
            </FormControl>

            {statusFormData.status === "Billed" && (
              <FormControl mt={4}>
                <FormLabel>Billed Date</FormLabel>
                <Input
                  type="date"
                  value={statusFormData.datePaid}
                  onChange={(e) =>
                    setStatusFormData((prev) => ({
                      ...prev,
                      datePaid: e.target.value,
                    }))
                  }
                  min={
                    billing?.invoiceDate
                      ? new Date(billing.invoiceDate).toISOString().split("T")[0]
                      : today
                  }
                  onDoubleClick={(e) => !e.currentTarget.disabled && e.currentTarget.showPicker()}
                />
              </FormControl>
            )}

            {statusFormData.status === "Paid" && (
              <>
                <FormControl mt={4}>
                  <FormLabel>Paid Date</FormLabel>
                  <Input
                    type="date"
                    value={statusFormData.datePaid}
                    onChange={(e) =>
                      setStatusFormData((prev) => ({
                        ...prev,
                        datePaid: e.target.value,
                      }))
                    }
                    min={minPaidDate || null}
                    onDoubleClick={(e) => !e.currentTarget.disabled && e.currentTarget.showPicker()}
                  />
                </FormControl>

                <FormControl mt={4}>
                  <FormLabel>Actual Amount Paid</FormLabel>
                  <Input
                    type="number"
                    value={actualAmountPaidInput}
                    onChange={(e) => setActualAmountPaidInput(e.target.value)}
                    onBlur={handleActualAmountBlur}
                    placeholder="Enter actual amount paid"
                  />
                </FormControl>

                <FormControl mt={4}>
                  <FormLabel>Charge Type</FormLabel>
                  <Select
                    value={statusFormData.chargeType}
                    onChange={handleStatusFormChange}
                    name="chargeType"
                  >
                    <option value="None">None</option>
                    <option value="Damages">Damages</option>
                    <option value="Other Charges">Other Charges</option>
                  </Select>
                </FormControl>

                {(statusFormData.chargeType === "Damages" ||
                  statusFormData.chargeType === "Other Charges") && (
                  <>
                    <FormControl mt={4}>
                      <FormLabel>Charge Amount</FormLabel>
                      <Input
                        type="number"
                        name="chargeAmount"
                        value={chargeAmountInput}
                        onChange={(e) => setChargeAmountInput(e.target.value)}
                        onBlur={handleChargeAmountBlur}
                        placeholder="Enter Charge Amount"
                      />
                    </FormControl>

                    <FormControl mt={4}>
                      <FormLabel>Receipt Number</FormLabel>
                      <Input
                        name="receiptNumber"
                        value={statusFormData.receiptNumber} // Bind value to state
                        onChange={handleStatusFormChange}
                        placeholder="Enter Receipt Number"
                      />
                    </FormControl>

                    <FormControl mt={4}>
                      <FormLabel>Remarks</FormLabel>
                      <Input
                        name="remarks"
                        value={statusFormData.remarks}
                        onChange={handleStatusFormChange}
                        placeholder="Enter remarks about the charges"
                      />
                    </FormControl>
                  </>
                )}

                <FormControl mt={4}>
                  <FormLabel>Amount Due</FormLabel>
                  <Input
                    value={totalAmountDue.toLocaleString("en-PH", {
                      style: "currency",
                      currency: "PHP",
                    })}
                    readOnly
                    bg="gray.100"
                  />
                </FormControl>

                <FormControl mt={4}>
                  <FormLabel>Balance</FormLabel>
                  <Input
                    value={
                      calculatedBalance !== null
                        ? Math.abs(calculatedBalance) < 0.01
                          ? '₱0.00'
                          : calculatedBalance.toLocaleString("en-PH", {
                              style: "currency",
                              currency: "PHP",
                            })
                        : ""
                    }
                    readOnly
                    bg={
                      calculatedBalance !== null
                        ? Math.abs(calculatedBalance) < 0.01
                          ? "green.200"
                          : calculatedBalance > 0
                            ? "red.100"
                            : "green.100"
                        : "gray.100"
                    }
                  />
                </FormControl>
              </>
            )}
          </ModalBody>

          <ModalFooter>
            <Button
              colorScheme="blue"
              mr={3}
              onClick={handleSubmit}
              isLoading={isStatusUpdating}
            >
              Update
            </Button>
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    );
  };

  // Custom handler for add modal close
  const handleAddModalClose = () => {
    // Reset form data to ensure a clean state for next opening
    setFormData({
      siNumber: "",
      storeName: "",
      address: "",
      tin: "",
      invoiceDate: new Date().toISOString().slice(0, 16),
      gross: 0,
      vat: 0,
      net: 0,
      withTax: 0,
      netAmount: 0,
      status: "Pending",
      billingType: "perWaybill", // Ensure billing type is reset
    });

    // Reset any loading states
    setIsAddBillingLoading(false);

    // Fetch the latest billing data to refresh the UI
    fetchBillingData();

    // Close the modal after a short delay to ensure UI renders properly
    setTimeout(() => {
      onAddModalClose();
    }, 100);
  };

  // Add useEffect to refetch data when currentPage or filters change
  useEffect(() => {
    fetchBillingData();
  }, [currentPage, recordsPerPage, statusFilter, searchTerm]);

  // Add a function to handle search term changes
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); // Reset to page 1 when searching
  };

  // Calculate the date range for the previous week (Mon-Sat)
  const getPreviousWeekRange = () => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
    const daysToPreviousMonday = dayOfWeek + 6;
    const previousMonday = new Date(today);
    previousMonday.setDate(today.getDate() - daysToPreviousMonday);
    previousMonday.setHours(0, 0, 0, 0); // Start of day

    const previousSaturday = new Date(previousMonday);
    previousSaturday.setDate(previousMonday.getDate() + 5);
    previousSaturday.setHours(23, 59, 59, 999); // End of day

    const options = { month: "short", day: "numeric" };
    return {
      startDate: previousMonday,
      endDate: previousSaturday,
      label: `${previousMonday.toLocaleDateString("en-US", options)} - ${previousSaturday.toLocaleDateString("en-US", options)}`,
    };
  };

  const previousWeek = getPreviousWeekRange();

  // Sorting function
  const sortedBillingData = React.useMemo(() => {
    let sortableItems = [...billingData]; // Use the paginated data
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        const valA = a[sortConfig.key];
        const valB = b[sortConfig.key];

        // Handle null/undefined or invalid dates
        const dateA = valA ? new Date(valA) : null;
        const dateB = valB ? new Date(valB) : null;
        const isValidDateA = dateA && !isNaN(dateA);
        const isValidDateB = dateB && !isNaN(dateB);

        if (sortConfig.key === "siNumber") {
          // Basic string sort for SI Number (can be refined if numeric part needs sorting)
          const siA = String(valA || "");
          const siB = String(valB || "");
          if (siA < siB) return sortConfig.direction === "ascending" ? -1 : 1;
          if (siA > siB) return sortConfig.direction === "ascending" ? 1 : -1;
          return 0;
        } else if (
          ["invoiceDate", "dateBilled", "dueDate", "paidAt"].includes(
            sortConfig.key
          )
        ) {
          // Date comparison
          if (!isValidDateA && !isValidDateB) return 0;
          if (!isValidDateA)
            return sortConfig.direction === "ascending" ? 1 : -1; // Put invalid dates last/first
          if (!isValidDateB)
            return sortConfig.direction === "ascending" ? -1 : 1;
          if (dateA < dateB)
            return sortConfig.direction === "ascending" ? -1 : 1;
          if (dateA > dateB)
            return sortConfig.direction === "ascending" ? 1 : -1;
          return 0;
        } else {
          // Fallback for other potential keys (though not requested)
          if (valA < valB) return sortConfig.direction === "ascending" ? -1 : 1;
          if (valA > valB) return sortConfig.direction === "ascending" ? 1 : -1;
          return 0;
        }
      });
    }
    return sortableItems;
  }, [billingData, sortConfig]);

  const requestSort = (key) => {
    let direction = "ascending";
    if (sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending";
    }
    setSortConfig({ key, direction });
  };

  // Function to get sorting icon
  const getSortIcon = (columnKey) => {
    if (sortConfig.key !== columnKey) {
      return null; // Or a default neutral icon
    }
    return sortConfig.direction === "ascending" ? (
      <ArrowUpIcon ml={1} />
    ) : (
      <ArrowDownIcon ml={1} />
    );
  };

  // Add a new function to calculate Overdue Amount
  const calculateOverdueAmount = (data) => {
    if (!data || data.length === 0) return 0;
    return data
      .filter((bill) => bill.status === "Overdue")
      .reduce((total, bill) => total + (Number(bill.netAmount) || 0), 0);
  };

  return (
    <Box p={4}>
      <Flex justify="space-between" align="center" mb={6}>
        <Box>
          <Text fontSize="2xl" fontWeight="bold" color="#1a365d">
            Billing Management
          </Text>
          <Text fontSize="sm" color="gray.600">
            Manage invoice records and payment information
          </Text>
        </Box>
      </Flex>

      {/* Status Summary Boxes */}
      <Grid
        templateColumns={{
          base: "repeat(1, 1fr)",
          md: "repeat(2, 1fr)",
          lg: "repeat(5, 1fr)",
        }}
        gap={4}
        mb={2}
      >
        {/* Total Billings */}
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
            Total Billings
          </Text>
          <Text fontSize="2xl" fontWeight="bold" color="#1a365d">
            {billingRecords.length}
          </Text>
        </Box>
        {/* Pending Invoices */}
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
            Pending Invoices
          </Text>
          <Text fontSize="2xl" fontWeight="bold" color="#1a365d">
            {billingRecords.filter((bill) => bill.status === "Pending").length}
          </Text>
        </Box>
        {/* Paid Invoices */}
        <Box
          bg="white"
          p={4}
          rounded="lg"
          shadow="sm"
          borderWidth="1px"
          borderColor="#550000"
          borderLeftWidth="4px"
        >
          <Text color="gray.500" fontSize="sm" mb={1}>
            Paid Invoices
          </Text>
          <Text fontSize="2xl" fontWeight="bold" color="#550000">
            {billingRecords.filter((bill) => bill.status === "Paid").length}
          </Text>
        </Box>
        {/* Overdue Invoices */}
        <Box
          bg="white"
          p={4}
          rounded="lg"
          shadow="sm"
          borderWidth="1px"
          borderColor="#550000"
          borderLeftWidth="4px"
        >
          <Text color="gray.500" fontSize="sm" mb={1}>
            Overdue Invoices
          </Text>
          <Text fontSize="2xl" fontWeight="bold" color="#550000">
            {billingRecords.filter((bill) => bill.status === "Overdue").length}
          </Text>
        </Box>
        {/* Cancelled Invoices */}
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
            Cancelled Invoices
          </Text>
          <Text fontSize="2xl" fontWeight="bold" color="#1a365d">
            {billingRecords.filter((bill) => bill.status === "Cancelled").length}
          </Text>
        </Box>
      </Grid>
      {/* Bottom Summary Boxes (aligned below the upper row) */}
      <Grid
        templateColumns={{
          base: "repeat(1, 1fr)",
          md: "repeat(2, 1fr)",
          lg: "repeat(5, 1fr)",
        }}
        gap={4}
        mb={6}
      >
        {/* Empty for Total Billings column */}
        <Box bg="transparent" />
        {/* Total Amount Billed (below Pending Invoices) */}
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
            Total Amount Billed
          </Text>
          <Text fontSize="2xl" fontWeight="bold" color="#1a365d">
            ₱
            {formatNumber(
              getFilteredByTime(billingRecords).reduce(
                (total, bill) =>
                  bill.status === "Billed"
                    ? total + (Number(bill.netAmount) || 0)
                    : total,
                0
              )
            )}
          </Text>
          <Text fontSize="xs" color="gray.500" mt={1}>
            All time total
          </Text>
        </Box>
        {/* Last Week Paid Invoices (below Paid Invoices) */}
        <Box
          bg="white"
          p={4}
          rounded="lg"
          shadow="sm"
          borderWidth="1px"
          borderColor="#550000"
          borderLeftWidth="4px"
        >
          <Text color="gray.500" fontSize="sm" mb={1}>
            Last Week Paid Invoices
          </Text>
          {(() => {
            const paidInLastWeek = billingRecords.filter((bill) => {
              if (bill.status !== "Paid" || !bill.paidAt) {
                return false;
              }
              const paidDate = new Date(bill.paidAt);
              return (
                paidDate >= previousWeek.startDate &&
                paidDate <= previousWeek.endDate
              );
            });
            const count = paidInLastWeek.length;
            const tooltipLabel = `Count: ${count} (Paid between: ${previousWeek.label})`;
            return count > 0 ? (
              <Tooltip label={tooltipLabel} placement="top" hasArrow>
                <Text fontSize="2xl" fontWeight="bold" color="#550000">
                  {count}
                </Text>
              </Tooltip>
            ) : (
              <Text fontSize="sm" color="gray.500">
                No payments last week
              </Text>
            );
          })()}
        </Box>
        {/* Overdue Amount (below Overdue Invoices) */}
        <Box
          bg="white"
          p={4}
          rounded="lg"
          shadow="sm"
          borderWidth="1px"
          borderColor="#550000"
          borderLeftWidth="4px"
        >
          <Text color="gray.500" fontSize="sm" mb={1}>
            Overdue Amount
          </Text>
          <Text fontSize="2xl" fontWeight="bold" color="#550000">
            ₱{formatNumber(calculateOverdueAmount(billingRecords))}
          </Text>
        </Box>
        {/* Empty for Cancelled column */}
        <Box bg="transparent" />
      </Grid>

      {/* Time Period Filter and Search */}
      <Box
        borderWidth="1px"
        borderColor="gray.200"
        borderRadius="md"
        bg="white"
        p={4}
        mb={4}
      >
        <HStack justify="space-between" align="center">
          <HStack spacing={4}>
            {/* Time Period control styled to match image */}
            <Box
              display="flex"
              alignItems="center"
              borderWidth="1px"
              borderColor="gray.200"
              borderRadius="md"
              bg="gray.50"
              px={3}
              py={2}
              shadow="sm"
            >
              <Box mr={2} color="gray.600">
                <CalendarIcon boxSize="16px" />
              </Box>
              <Text fontSize="sm" color="gray.600" mr={2} whiteSpace="nowrap">
                Time Period:
              </Text>
              <Select
                value={timeFilter}
                onChange={(e) => handleTimeFilterChange(e.target.value)}
                size="sm"
                width="100px"
                bg="transparent"
                border="none"
                _focus={{ boxShadow: "none" }}
                variant="unstyled"
                pl={0}
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="thisWeek">This Week</option>
                <option value="thisMonth">This Month</option>
                <option value="lastMonth">Last Month</option>
              </Select>
            </Box>

            <InputGroup maxWidth="300px" size="sm">
              <InputLeftElement pointerEvents="none">
                <SearchIcon color="gray.400" />
              </InputLeftElement>
              <Input
                placeholder="Search billing records..."
                value={searchTerm}
                onChange={handleSearchChange}
                bg="white"
              />
            </InputGroup>
            <Button
              leftIcon={<AddIcon />}
              bg="#550000"
              color="white"
              _hover={{ bg: "#700000" }}
              onClick={onAddModalOpen}
              size="sm"
              minW="110px"
              px={4}
            >
              Add Billing
            </Button>
          </HStack>

          <HStack spacing={4}>
            {" "}
            {/* Create a new HStack for the right side elements */}
            <Select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1); // Reset page when filter changes
              }}
              size="sm"
              width="150px"
              // mr={4} // Margin added by HStack spacing
              bg="white"
              borderColor="gray.300"
              focusBorderColor="#550000"
            >
              <option value="all">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Billed">Billed</option>
              <option value="Paid">Paid</option>
              <option value="Overdue">Overdue</option>
              <option value="Cancelled">Cancelled</option>
            </Select>
            <Button
              leftIcon={<ViewIcon />}
              variant="outline"
              color="#1a365d"
              borderColor="#1a365d"
              onClick={onColumnSelectorOpen}
              size="sm"
            >
              Customize Columns
            </Button>
          </HStack>
        </HStack>
      </Box>

      {/* Main Table Section */}
      <Box
        borderWidth="1px"
        borderColor="gray.200"
        borderRadius="md"
        bg="white"
        overflow="hidden"
        sx={{
          "& thead": {
            backgroundColor: "gray.100",
          },
          "& th": {
            backgroundColor: "gray.100",
          },
        }}
      >
        <MainTable />
      </Box>

      {/* Add Billing Modal */}
      <Modal isOpen={isAddModalOpen} onClose={handleAddModalClose} size="6xl">
        <ModalOverlay bg="blackAlpha.600" backdropFilter="blur(2px)" />
        <ModalContent
          maxW="90vw"
          h="95vh"
          borderRadius="xl"
          boxShadow="0 10px 40px rgba(0, 0, 0, 0.3)"
          bg="white"
          p={2}
          overflowY="hidden"
        >
          <ModalHeader
            fontSize="xl"
            fontWeight="bold"
            color="white"
            borderBottomWidth="1px"
            borderColor="gray.100"
            pb={4}
            bg="#1a365d"
            position="relative"
            display="flex"
            alignItems="center"
            justifyContent="space-between"
          >
            Add Billing Record
            <ModalCloseButton
              position="absolute"
              right="8px"
              top="50%"
              transform="translateY(-50%)"
              color="white"
              fontWeight="900"
              fontSize="16px"
            />
          </ModalHeader>
          <ModalBody p={0}>
            <BillingPaper
              billingData={formData}
              onClose={handleAddModalClose}
              onDataChange={fetchBillingData}
            />
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Replace the existing modals with the new components */}
      <BillingDetailsModal />
      <EditModal />

      {/* Column Selector Modal */}
      <Modal isOpen={isColumnSelectorOpen} onClose={onColumnSelectorClose}>
        <ModalOverlay bg="blackAlpha.600" backdropFilter="blur(2px)" />
        <ModalContent maxW="300px">
          <ModalHeader
            fontSize="lg"
            fontWeight="bold"
            bg="#1a365d"
            color="white"
          >
            Customize Columns
          </ModalHeader>
          <ModalCloseButton color="white" />
          <ModalBody pt={4} pb={6}>
            <Box
              maxH="400px"
              overflowY="auto"
              sx={{
                "&::-webkit-scrollbar": {
                  width: "4px",
                },
                "&::-webkit-scrollbar-track": {
                  width: "6px",
                },
                "&::-webkit-scrollbar-thumb": {
                  background: "gray.300",
                  borderRadius: "24px",
                },
              }}
            >
              <VStack align="stretch" spacing={1}>
                {[
                  { id: "siNumber", label: "SI Number" },
                  { id: "invoiceDate", label: "Invoice Date" },
                  { id: "dateBilled", label: "Invoice Received Date" },
                  { id: "dueDate", label: "Due Date" },
                  { id: "paidAt", label: "Date Paid" },
                  { id: "storeName", label: "Company Name" },
                  { id: "address", label: "Address" },
                  { id: "tin", label: "TIN" },
                  { id: "bottomPaymentMethod", label: "Payment Method" },
                  { id: "gross", label: "Total Sales" },
                  { id: "vat", label: "12% VAT" },
                  { id: "net", label: "Net of VAT" },
                  { id: "withHoldingTax", label: "Less Withholding" },
                  { id: "netAmount", label: "Total Amount Due" },
                  { id: "actualAmountPaid", label: "Actual Amount Paid" },
                  { id: "chargeAmount", label: "Charge Amount" },
                  { id: "receiptNumber", label: "Receipt Number" },
                  { id: "remarks", label: "Remarks" },
                  { id: "status", label: "Status" },
                  { id: "actions", label: "Actions" },
                  { id: "chargeType", label: "Charge Type" },
                ].map((column) => (
                  <Box
                    key={column.id}
                    py={2}
                    px={3}
                    _hover={{ bg: "gray.50" }}
                    cursor="pointer"
                    onClick={() => toggleColumnVisibility(column.id)}
                    display="flex"
                    alignItems="center"
                  >
                    <Checkbox
                      isChecked={columnVisibility[column.id]}
                      onChange={(e) => {
                        e.stopPropagation();
                        toggleColumnVisibility(column.id);
                      }}
                      colorScheme="red"
                      mr={3}
                    />
                    <Text fontSize="sm">{column.label}</Text>
                  </Box>
                ))}
              </VStack>
            </Box>
          </ModalBody>
          <ModalFooter borderTopWidth="2px" borderColor="#800020">
            <Button
              bg="#1a365d"
              color="white"
              mr={3}
              size="sm"
              _hover={{ bg: "#0f2544" }}
              onClick={() => {
                const allVisible = Object.keys(columnVisibility).reduce(
                  (acc, key) => {
                    acc[key] = true;
                    return acc;
                  },
                  {}
                );
                setColumnVisibility(allVisible);
              }}
            >
              Reset All
            </Button>
            <Button
              bg="#800020"
              color="white"
              _hover={{ bg: "#600010" }}
              size="sm"
              onClick={onColumnSelectorClose}
            >
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Status Update Modal */}
      <StatusModal
        isOpen={isStatusModalOpen}
        onClose={onStatusModalClose}
        billing={selectedBillingForStatus}
        initialData={statusFormData}
        onUpdate={handleStatusUpdate}
      />

      {/* Delete Billing Confirmation Dialog */}
      <AlertDialog
        isOpen={deleteBillingAlertDisclosure.isOpen}
        leastDestructiveRef={cancelDeleteBillingRef}
        onClose={() => {
          deleteBillingAlertDisclosure.onClose();
          setBillingToDeleteId(null);
          setBillingToDeleteInfo(null);
        }}
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
            Confirm Delete Billing Record
          </AlertDialogHeader>
          <AlertDialogCloseButton
            color="white"
            _hover={{ bg: "#600000" }}
            isDisabled={isDeletingBilling}
          />
          <AlertDialogBody py={6} px={6}>
            <Text>
              Are you sure you want to delete billing record{" "}
              <Text as="span" fontWeight="bold">
                {billingToDeleteInfo?.siNumber || billingToDeleteId}
              </Text>{" "}
              for{" "}
              <Text as="span" fontWeight="bold">
                {billingToDeleteInfo?.storeName || "this customer"}
              </Text>
              ?
            </Text>
            <Text mt={2}>
              This will also delete all associated billing details.
            </Text>
            <Text mt={2} fontWeight="bold" color="#800000">
              This action cannot be undone, but the data will be logged.
            </Text>
          </AlertDialogBody>
          <AlertDialogFooter borderTopWidth="1px" borderColor="gray.200" py={3}>
            <Button
              ref={cancelDeleteBillingRef}
              variant="ghost"
              onClick={deleteBillingAlertDisclosure.onClose}
              mr={3}
              isDisabled={isDeletingBilling}
            >
              Cancel
            </Button>
            <Button
              bg="#800000"
              color="white"
              _hover={{ bg: "#600000" }}
              onClick={handleDeleteBilling} // Calls the updated handleDeleteBilling
              isLoading={isDeletingBilling} // Bind loading state
              loadingText="Deleting..."
              fontWeight="medium"
            >
              Delete Record
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Box>
  );
};

export default BillingComponent;
