import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import axios from "axios"; // Import axios
import { debounce } from 'lodash'; // Import debounce
import {
  Box,
  Heading,
  Text,
  VStack,
  Container,
  useColorModeValue,
  Table,
  Thead,
  Tbody,
  Tfoot, // Added Tfoot
  Tr,
  Th,
  Td,
  Button,
  HStack,
  Input,
  InputGroup,
  InputLeftElement,
  Flex,
  Badge,
  SimpleGrid,
  Icon,
  TableContainer,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  FormControl,
  FormLabel,
  useDisclosure,
  NumberInput,
  NumberInputField,
  Tooltip,
  useToast,
  Editable,
  EditableInput,
  EditablePreview,
  Stack,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverBody,
  PopoverArrow,
  Checkbox,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Skeleton, // Import Skeleton
  Spinner, // Import Spinner
  Alert,   // Import Alert
  AlertIcon, // Import AlertIcon
  Switch, // Added Switch import
  IconButton, // Import IconButton
  PopoverHeader,
  PopoverCloseButton,
  PopoverFooter,
} from "@chakra-ui/react";
import { SearchIcon, DownloadIcon, SettingsIcon } from "@chakra-ui/icons"; // Import SettingsIcon
import { motion } from "framer-motion";
import { format, parseISO } from "date-fns"; // Keep format and parseISO
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import {
  FaUsers,
  FaMoneyBillWave,
  FaCalculator,
  FaWallet,
  FaFileAlt, // Added icon import
} from "react-icons/fa";

const MotionBox = motion(Box);
const MotionTr = motion(Tr);

// Helper: Get first day of month (YYYY-MM-DD)
const getFirstDayOfMonth = (date) => {
  const d = new Date(date);
  return format(new Date(d.getFullYear(), d.getMonth(), 1), 'yyyy-MM-dd');
};

// Helper: Get last day of month (YYYY-MM-DD)
const getLastDayOfMonth = (date) => {
  const d = new Date(date);
  return format(new Date(d.getFullYear(), d.getMonth() + 1, 0), 'yyyy-MM-dd');
};

// Currency Formatter
const pesoFormatter = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
});

// --- RENAME COMPONENT ---
const PayrollPerTripCargo = () => { 
  const [searchQuery, setSearchQuery] = useState("");
  const [payrollData, setPayrollData] = useState([]);
  const [isLoading, setIsLoading] = useState(false); 
  const [isSaving, setIsSaving] = useState(false); 
  const [error, setError] = useState(null); 
  const toast = useToast();

  const { isOpen: isDateModalOpen, onOpen: onDateModalOpen, onClose: onDateModalClose } = useDisclosure();
  const { isOpen: isClearConfirmOpen, onOpen: onClearConfirmOpen, onClose: onClearConfirmClose } = useDisclosure();
  
  // --- Add Modal state for View Trips ---
  const { isOpen: isViewTripsModalOpen, onOpen: onViewTripsModalOpen, onClose: onViewTripsModalClose } = useDisclosure();
  const [selectedEmployeeTrips, setSelectedEmployeeTrips] = useState(null); // To store data for the modal if needed later
  // --- Add state for modal data fetching --- 
  const [fetchedTripDetails, setFetchedTripDetails] = useState([]);
  const [isFetchingTrips, setIsFetchingTrips] = useState(false);
  const [fetchTripsError, setFetchTripsError] = useState(null);
  // --- Add state for temporary edited rates in modal ---
  const [editedTripRates, setEditedTripRates] = useState({}); // { waybillNumber: rate }
  // --- ADDED: State for Report Row Selection ---
  const [selectedReportRows, setSelectedReportRows] = useState([]);
  // --- Add state for Save Rates button loading ---
  const [isSavingRates, setIsSavingRates] = useState(false);
  // --- Add state for saved trip rates map ---
  const [savedTripRatesMap, setSavedTripRatesMap] = useState({}); // { employeeId: { waybillNumber: rate } }
  // --- ADDED: State for Column Visibility (Per Trip) ---
  const [columnVisibility, setColumnVisibility] = useState({
      checkbox: true, // Moved to be the first column
      paymentType: true, 
      // startDate: true, // Displayed externally
      // endDate: true,   // Displayed externally
      employeeId: true,
      name: true,
      tripRate: true, 
      viewTrips: true, // ADDED: New column for View Trips button
      numberOfTrips: true, 
      basicPayForPeriod: true, // Added this based on calculation logic
      earningsAdjustment: true,
      silPay: true,
      thirteenthMonth: true,
      totalGrossPay: true,
      deductionsAdjustment: true, // Add this for the new Deductions Adjustment column
      sss: true,
      philhealth: true,
      pagibig: true,
      caCharges: true,
      withholdingTax: true,
      totalDeductions: true,
      netPay: true,
      // Actions column kept visible
  });

  // --- ADDED: State for Modal Checkbox Selection ---
  const [selectedWaybills, setSelectedWaybills] = useState([]);

  const [periodStartDate, setPeriodStartDate] = useState(getFirstDayOfMonth(new Date())); 
  const [periodEndDate, setPeriodEndDate] = useState(getLastDayOfMonth(new Date())); 

  const [tempStartDate, setTempStartDate] = useState(periodStartDate);
  const [tempEndDate, setTempEndDate] = useState(periodEndDate);

  // Color scheme constants
  const primaryColor = "#800020"; 
  const secondaryColor = "#1a365d"; 
  const headerBg = "white"; 
  const earningsHeaderBg = "#ADD8E6"; 
  const deductionsHeaderBg = "#FFB6C1"; 
  const netPayHeaderBg = "#FFFFE0"; 
  const earningsColBg = "#ADD8E6"; 
  const deductionsColBg = "#FFF0F5"; 
  const netPayColBg = "#FFFACD"; 

  const formatDateRange = (start, end) => {
      if (!start || !end) return "Not Selected";
      try {
          const startDate = parseISO(start); 
          const endDate = parseISO(end);
          const startFormat = 'MMM d';
          const endFormat = startDate.getFullYear() === endDate.getFullYear() ? 'MMM d, yyyy' : 'MMM d, yyyy'; 
          return `${format(startDate, startFormat)} - ${format(endDate, endFormat)}`;
      } catch (e) {
          console.error("Date formatting error:", e);
          return "Invalid Date";
      }
  };

  const formatDateForDisplay = (dateString) => {
      if (!dateString) return '';
      try {
          return format(parseISO(dateString), 'yyyy-MM-dd');
      } catch (e) {
          console.error("Error formatting date for display:", e);
          return 'Invalid Date';
      }
  };

  // Contribution/Charges/Leave States (Keep as they might be needed)
  const [sssContributions, setSssContributions] = useState([]);
  const [loadingSSS, setLoadingSSS] = useState(false);
  const [sssError, setSssError] = useState(null);
  const [philhealthContributions, setPhilhealthContributions] = useState([]);
  const [loadingPhilhealth, setLoadingPhilhealth] = useState(false);
  const [philhealthError, setPhilhealthError] = useState(null);
  const [pagibigContributions, setPagibigContributions] = useState([]);
  const [loadingPagibig, setLoadingPagibig] = useState(false);
  const [pagibigError, setPagibigError] = useState(null);
  const [chargesDataMap, setChargesDataMap] = useState({});
  const [loadingCharges, setLoadingCharges] = useState(false);
  const [chargesError, setChargesError] = useState(null);
  const [leaveDataMap, setLeaveDataMap] = useState({});
  const [loadingLeave, setLoadingLeave] = useState(false);
  const [leaveError, setLeaveError] = useState(null);

  // Draft specific states
  const [draftError, setDraftError] = useState(null);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isClearingDraft, setIsClearingDraft] = useState(false); 

  const loadDataRef = useRef(null);

  // --- Contribution Calculation Helpers (Keep as SSS depends on Gross Pay) ---
  const findSssContribution = (totalGrossPay) => {
    if (!sssContributions || !Array.isArray(sssContributions) || sssContributions.length === 0) return 0; 
    try {
      const matchingRange = sssContributions.find(range => 
        range && typeof range.rangeStart !== 'undefined' && typeof range.rangeEnd !== 'undefined' &&
        totalGrossPay >= parseFloat(range.rangeStart) && totalGrossPay <= parseFloat(range.rangeEnd)
      );
      return matchingRange && matchingRange.total ? parseFloat(matchingRange.total) : 0;
    } catch (error) { console.error('Error finding SSS contribution:', error); return 0; }
  };

  const findPhilhealthContributionByExactMatch = (baseWage) => { // Renamed param for clarity
    if (!philhealthContributions || !Array.isArray(philhealthContributions) || philhealthContributions.length === 0) return 0;
    const wage = parseFloat(baseWage);
    if (isNaN(wage)) return 0;
    try {
      const matchingBracket = philhealthContributions.find(bracket =>
        bracket && typeof bracket.monthlyBasicSalary !== 'undefined' && parseFloat(bracket.monthlyBasicSalary) === wage
      );
      // NOTE: This assumes Philhealth is based on a base wage (like daily/monthly). May need adjustment for per-trip.
      return matchingBracket && typeof matchingBracket.employeeShare !== 'undefined' ? parseFloat(matchingBracket.employeeShare) : 0;
    } catch (error) { console.error('Error finding Philhealth contribution:', error); return 0; }
  };

  const findPagibigContribution = (baseWage) => { // Renamed param
    if (!pagibigContributions || !Array.isArray(pagibigContributions) || pagibigContributions.length === 0) return 0;
    const wage = parseFloat(baseWage);
    if (isNaN(wage)) return 0;
    const MAX_PAGIBIG_CONTRIBUTION = 100;
    try {
      const bracket = pagibigContributions.find(b =>
        b && typeof b.rangeStart !== 'undefined' && typeof b.rangeEnd !== 'undefined' &&
        wage >= parseFloat(b.rangeStart) && wage <= parseFloat(b.rangeEnd)
      );
      let employeeSharePercentage = 0;
      if (bracket && typeof bracket.employeeShare !== 'undefined') {
        employeeSharePercentage = parseFloat(bracket.employeeShare);
      } else {
        const highestBracket = pagibigContributions.reduce((max, b) => (!max || b.rangeEnd > max.rangeEnd ? b : max), null);
        if (highestBracket && typeof highestBracket.employeeShare !== 'undefined') {
           employeeSharePercentage = parseFloat(highestBracket.employeeShare);
        }
      }
      if (isNaN(employeeSharePercentage)) return 0;
      const calculatedContribution = wage * (employeeSharePercentage / 100);
      // NOTE: This assumes Pag-IBIG is based on a base wage. May need adjustment for per-trip.
      return Math.min(calculatedContribution, MAX_PAGIBIG_CONTRIBUTION);
    } catch (error) { console.error('Error finding Pag-IBIG contribution:', error); return 0; }
  };

  // --- UPDATE: Calculate Payroll for Per Trip ---
  const calculatePayroll = (record) => {
    const tripRate = parseFloat(record.tripRate) || 0; // Use tripRate
    const numberOfTrips = parseFloat(record.numberOfTrips) || 0; // Use numberOfTrips
    const earningsAdjustment = parseFloat(record.earningsAdjustment) || 0;
    const silPay = parseFloat(record.silPay) || 0;
    const thirteenthMonth = parseFloat(record.thirteenthMonth) || 0; // Keep 13th Month?

    const caCharges = parseFloat(record.caCharges) || 0;
    const deductionsAdjustment = parseFloat(record.deductionsAdjustment) || 0;
    const withholdingTax = parseFloat(record.withholdingTax) || 0;

    // --- Calculations ---
    // Make basicPayForPeriod equal to tripRate directly without multiplication
    const basicPayForPeriod = tripRate; // Basic pay = Trip Rate

    const totalGrossPay = basicPayForPeriod + earningsAdjustment + silPay + thirteenthMonth; // UPDATED Calculation

    // Calculate SSS, Philhealth, Pagibig ONLY if override is OFF
    let sss = record.sss || 0;
    let philhealth = record.philhealth || 0;
    let pagibig = record.pagibig || 0;

    if (!record.isOverride) {
      sss = findSssContribution(totalGrossPay); // SSS based on Gross Pay
      // Philhealth/Pagibig: Need clarification on how these apply per trip.
      // Using tripRate as base for now, likely needs adjustment.
      philhealth = findPhilhealthContributionByExactMatch(tripRate); 
      pagibig = findPagibigContribution(tripRate);
    }

    const currentCaCharges = record.caCharges || 0;
    const currentSilPay = record.silPay || 0; 

    const totalDeductions = sss + philhealth + pagibig + currentCaCharges + deductionsAdjustment + withholdingTax;
    const netPay = totalGrossPay - totalDeductions;

    return {
      ...record, 
      tripRate: record.tripRate || 0, // Ensure tripRate is returned
      numberOfTrips: record.numberOfTrips || 0, // Ensure numberOfTrips is returned
      basicPayForPeriod, 
      totalGrossPay,
      sss, 
      philhealth, 
      pagibig, 
      caCharges: currentCaCharges, 
      silPay: currentSilPay, 
      totalDeductions,
      netPay,
      isOverride: record.isOverride || false 
    };
  };

  // --- UPDATE: Debounced Auto-Save for Per Trip ---
  const debouncedSaveDraft = useCallback(
    debounce(async (dataToSave, token, currentPeriodStart, currentPeriodEnd) => {
      if (!dataToSave || dataToSave.length === 0 || !token) return;
      const draftsWithDates = dataToSave.map(d => ({ ...d, startDate: currentPeriodStart, endDate: currentPeriodEnd }));
      console.log("Auto-saving Per Trip drafts for period:", currentPeriodStart, "-", currentPeriodEnd);
      try {
        await axios.put(
          // --- UPDATE API ENDPOINT ---
          `${process.env.NEXT_PUBLIC_BACKEND_API}/api/payroll/per-trip-cargo/bulk-upsert`, 
          draftsWithDates,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        console.log("Per Trip drafts auto-saved successfully.");
        setDraftError(null); 
      } catch (err) {
        console.error("Auto-save Per Trip draft error:", err);
        const errorMsg = err.response?.data?.message || err.message || "Auto-save failed.";
        setDraftError(errorMsg); 
      }
    }, 1500), 
    [] 
  );

  // Handle field update - No auto-save
  const handleFieldUpdate = (employeeId, field, value) => {
    let updatedData = []; 
    setPayrollData((prevData) => {
      updatedData = prevData.map((record) => { 
        if (record.employeeId === employeeId) {
          // Keep existing validation logic for +/- and decimals
          const allowNegative = field === 'earningsAdjustment' || field === 'deductionsAdjustment';
          let numericValue;
          let displayValue = value;
          if (allowNegative) {
              const cleanedValue = value.toString().replace(/[^\d.-]/g, ''); 
              numericValue = (cleanedValue === '' || cleanedValue === '-') ? 0 : parseFloat(cleanedValue);
              displayValue = (cleanedValue === '' || cleanedValue === '-') ? value : cleanedValue; 
              if (cleanedValue === '.') { numericValue = 0; displayValue = '.'; }
          } else {
              const cleanedValue = value.toString().replace(/[^\d.]/g, ''); 
              const parts = cleanedValue.split('.');
              let validatedValue = cleanedValue;
              if (parts.length > 2) { validatedValue = `${parts[0]}.${parts.slice(1).join('')}`; }
              numericValue = (validatedValue === '' || validatedValue === '.') ? 0 : parseFloat(validatedValue);
              numericValue = numericValue < 0 ? 0 : numericValue; 
              displayValue = validatedValue; 
          }
          
          const updatedRecordForState = { ...record, [field]: displayValue };
          // Ensure calculatePayroll uses the numeric value
          return calculatePayroll({...updatedRecordForState, [field]: numericValue}); 
        }
        return record;
      });
      return updatedData; 
    });

    // Auto-save removed - all saving will be done through Save Changes button
  };

  // --- ADDED: Handle Row Checkbox Change for Report ---
  const handleRowCheckboxChange = (employeeId) => {
    setSelectedReportRows((prevSelected) => {
      if (prevSelected.includes(employeeId)) {
        return prevSelected.filter((id) => id !== employeeId);
      } else {
        return [...prevSelected, employeeId];
      }
    });
  };

  // --- ADDED: Handle Select All Checkbox Change for Report ---
  const handleSelectAllReport = (e) => {
    if (e.target.checked) {
      // Select all filtered employee IDs
      const allFilteredIds = filteredPayrollData.map((record) => record.employeeId);
      setSelectedReportRows(allFilteredIds);
    } else {
      // Deselect all
      setSelectedReportRows([]);
    }
  };

  // --- ADDED: Handler for Column Visibility Toggle ---
  const handleColumnVisibilityChange = (columnKey) => {
      setColumnVisibility(prev => ({
          ...prev,
          [columnKey]: !prev[columnKey]
      }));
  };

  // --- ADDED: Handler for Modal Checkbox Change ---
  const handleWaybillCheckboxChange = (waybillNumber) => {
    setSelectedWaybills((prevSelected) => {
      if (prevSelected.includes(waybillNumber)) {
        return prevSelected.filter((wb) => wb !== waybillNumber);
      } else {
        return [...prevSelected, waybillNumber];
      }
    });
  };

  // --- ADDED: Handler for Modal Select All Checkbox ---
  const handleSelectAllWaybills = (e) => {
    if (e.target.checked) {
      // Select all waybill numbers currently fetched
      const allFetchedWBs = fetchedTripDetails.map((detail) => detail.waybillNumber);
      setSelectedWaybills(allFetchedWBs);
    } else {
      // Deselect all
      setSelectedWaybills([]);
    }
  };

  // Handle applying the date range from the modal (Keep as is)
  const handleApplyDateRange = () => {
    if (!tempStartDate || !tempEndDate) {
      toast({ title: "Incomplete Date Range", status: "warning", duration: 3000, isClosable: true }); return;
    }
    try {
      if (new Date(tempEndDate) < new Date(tempStartDate)) {
        toast({ title: "Invalid Date Range", status: "warning", duration: 3000, isClosable: true }); return;
      }
      setPeriodStartDate(tempStartDate);
      setPeriodEndDate(tempEndDate);
      onDateModalClose(); 
    } catch (error) {
       console.error("Error applying date range:", error);
      toast({ title: "Date Error", status: "error", duration: 3000, isClosable: true });
    }
  };

  // --- UPDATE: Function to load data for Per Trip ---
  const loadDataForPeriod = useCallback(async () => {
      setIsLoading(true);
      setError(null);
      setDraftError(null);
      setPayrollData([]);
      setSavedTripRatesMap({}); // Clear saved rates map on new load

      // Fetch Contributions/Charges/Leave/Rates Concurrently
      setLoadingSSS(true); setSssError(null);
      setLoadingPhilhealth(true); setPhilhealthError(null);
      setLoadingPagibig(true); setPagibigError(null);
      setLoadingCharges(true); setChargesError(null);
      setLoadingLeave(true); setLeaveError(null);

      const token = localStorage.getItem("token");
      if (!token) {
          setError("Authentication token not found."); setIsLoading(false);
          setLoadingSSS(false); setLoadingPhilhealth(false); setLoadingPagibig(false); setLoadingCharges(false); setLoadingLeave(false); return;
      }
      if (!periodStartDate || !periodEndDate) {
          setError("Invalid Period selected."); setIsLoading(false); 
          setLoadingSSS(false); setLoadingPhilhealth(false); setLoadingPagibig(false); setLoadingCharges(false); setLoadingLeave(false); return;
      }

      let fetchedDrafts = [];
      let fetchDraftError = null;
      let localChargesMap = {};
      let localLeaveMap = {};

      try {
          // Fetch auxiliary data (Keep)
          const [sssResponse, philhealthResponse, pagibigResponse, chargesResponse, leaveResponse, draftResponse, ratesResponse] = await Promise.all([
              axios.get(`${process.env.NEXT_PUBLIC_BACKEND_API}/api/sss-contributions`, { headers: { Authorization: `Bearer ${token}` } }),
              axios.get(`${process.env.NEXT_PUBLIC_BACKEND_API}/api/philhealth-contributions`, { headers: { Authorization: `Bearer ${token}` } }),
              axios.get(`${process.env.NEXT_PUBLIC_BACKEND_API}/api/pagibig-contributions`, { headers: { Authorization: `Bearer ${token}` } }),
              axios.get(`${process.env.NEXT_PUBLIC_BACKEND_API}/api/charges`, { params: { periodEndDate: periodEndDate }, headers: { Authorization: `Bearer ${token}` } }).then(res => {
                const map = (res.data || []).reduce((map, charge) => { if (charge.employeeId) map[charge.employeeId] = charge.totalCharges || 0; return map; }, {});
                setChargesDataMap(map); return res; }),
              axios.get(`${process.env.NEXT_PUBLIC_BACKEND_API}/api/leave`, { params: { periodEndDate: periodEndDate }, headers: { Authorization: `Bearer ${token}` } }).then(res => {
                const map = (res.data || []).reduce((map, leave) => { if (leave.EmpID?._id) map[leave.EmpID._id.toString()] = leave.leavePay || 0; else if (leave.EmpID && typeof leave.EmpID === 'string') map[leave.EmpID] = leave.leavePay || 0; return map; }, {});
                setLeaveDataMap(map); return res; }),
              // --- UPDATE: Fetch Per Trip Drafts ---
              axios.get(`${process.env.NEXT_PUBLIC_BACKEND_API}/api/payroll/per-trip-cargo`, { 
                  params: { startDate: periodStartDate, endDate: periodEndDate },
                  headers: { Authorization: `Bearer ${token}` },
              }).catch(err => {
                  console.error("Per Trip Draft fetch failed:", err);
                  fetchDraftError = err.response?.data?.message || err.message || "Failed to load saved per-trip drafts.";
                  return { data: [] };
              }),
              // --- ADD: Fetch Saved Per Trip Rates ---
              axios.get(`${process.env.NEXT_PUBLIC_BACKEND_API}/api/payroll/per-trip-cargo/rates`, {
                  params: { startDate: periodStartDate, endDate: periodEndDate },
                  headers: { Authorization: `Bearer ${token}` },
              }).catch(err => {
                  console.error("Saved Trip Rates fetch failed:", err);
                  // Set an error state specific to rates if needed, or add to general error
                  setError(prev => prev ? `${prev}\nFailed to load saved rates.` : "Failed to load saved rates.");
                  return { data: [] }; // Allow Promise.all to continue
              })
          ]);

          // Process auxiliary data (Keep)
          try { setSssContributions(sssResponse.data?.data || []); } catch (e) { setSssError('Failed to load SSS'); } finally { setLoadingSSS(false); }
          try { setPhilhealthContributions(philhealthResponse.data?.data || []); } catch (e) { setPhilhealthError('Failed to load Philhealth'); } finally { setLoadingPhilhealth(false); }
          try { setPagibigContributions(pagibigResponse.data?.data || []); } catch (e) { setPagibigError('Failed to load Pag-IBIG'); } finally { setLoadingPagibig(false); }
          localChargesMap = chargesDataMap; localLeaveMap = leaveDataMap;
          setLoadingCharges(false); setLoadingLeave(false);

          fetchedDrafts = draftResponse.data || [];
          console.log(`Fetched ${fetchedDrafts.length} per-trip drafts.`);

          // --- Process Saved Trip Rates --- 
          const fetchedSavedRates = ratesResponse.data || [];
          const ratesMap = {}; // Stores { employeeId: { waybillNumber: { rate: number, isChecked: boolean } } }
          fetchedSavedRates.forEach(rate => {
              if (!ratesMap[rate.employeeId]) {
                  ratesMap[rate.employeeId] = {};
              }
              // Store rate object including isChecked status
              ratesMap[rate.employeeId][rate.waybillNumber] = {
                 rate: parseFloat(rate.rate) || 0,
                 isChecked: rate.isChecked || false // Default to false if missing
              };
          });
          setSavedTripRatesMap(ratesMap); // Store the full map for modal use
          console.log(`Processed ${fetchedSavedRates.length} saved trip rates with checked status:`, ratesMap);
          // --- End Process Saved Trip Rates --- 

      } catch (err) {
          console.error("Error loading auxiliary data or rates for per-trip payroll:", err);
          setError(err.response?.data?.message || err.message || "Failed to load auxiliary data.");
          setLoadingSSS(false); setLoadingPhilhealth(false); setLoadingPagibig(false); setLoadingCharges(false); setLoadingLeave(false);
      }

      // --- Decide whether to use per-trip drafts or initialize defaults --- 
      if (fetchedDrafts.length > 0) {
          console.log("Using loaded per-trip drafts.");
          const processedDrafts = fetchedDrafts.map(draft => {
              const useCalculated = !draft.isOverride;
              const chargeAmount = chargesDataMap[draft.employeeId] || 0;
              const leavePayAmount = leaveDataMap[draft.employee?._id?.toString()] || 0;
              let record = { ...draft };

              // --- Calculate tripRate SUM and COUNT from CHECKED saved rates --- 
              const employeeSavedRates = savedTripRatesMap[record.employeeId] || {};
              let checkedRateSum = 0;
              let checkedTripCount = 0;
              Object.values(employeeSavedRates).forEach(rateInfo => {
                  if (rateInfo.isChecked) {
                      checkedRateSum += rateInfo.rate;
                      checkedTripCount++;
                  }
              });
              record.tripRate = checkedRateSum; // Override draft tripRate with sum of CHECKED rates
              record.numberOfTrips = checkedTripCount; // Override draft tripCount with count of CHECKED rates
              // --- End Calculate checked tripRate --- 

              if (useCalculated) {
                  record.sss = findSssContribution(record.totalGrossPay); 
                  // Philhealth/Pagibig should maybe use the calculated basic pay? Or a base rate? Using new tripRate sum for now.
                  record.philhealth = findPhilhealthContributionByExactMatch(record.tripRate);
                  record.pagibig = findPagibigContribution(record.tripRate); 
                  record.caCharges = chargeAmount;
                  record.silPay = leavePayAmount;
              }
              // Recalculate based on potentially updated tripRate and numberOfTrips
              return calculatePayroll(record); 
          });
          setPayrollData(processedDrafts);
          if (!fetchDraftError) setError(null);
      } else {
          console.log("No per-trip drafts found. Initializing from employee list.");
          if (fetchDraftError) setError(fetchDraftError); else setError(null);

          try {
              // --- UPDATE: Fetch PER TRIP employees ---
              const employeeResponse = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_API}/api/employees/personal`, {
                  headers: { Authorization: `Bearer ${token}` }
              });
              const perTripEmployees = (employeeResponse.data || []).filter(
                  (emp) => emp.salaryCategory === "Per Trip" && emp.dateSeparated === null && emp.Department === "Justine's Cargo"
              );

              const initialData = perTripEmployees.map(emp => {
                  const empId = emp.empID || "N/A";
                  const chargeAmount = chargesDataMap[empId] || 0;
                  const leavePayAmount = leaveDataMap[emp._id?.toString()] || 0;
                  
                  // --- Calculate initial CHECKED tripRate and numberOfTrips from saved rates --- 
                  const employeeSavedRates = savedTripRatesMap[empId] || {};
                  let initialCheckedRateSum = 0;
                  let initialCheckedTripCount = 0;
                  Object.values(employeeSavedRates).forEach(rateInfo => {
                      if (rateInfo.isChecked) {
                          initialCheckedRateSum += rateInfo.rate;
                          initialCheckedTripCount++;
                      }
                  });
                  // --- End Calculation --- 
                  
                  const record = {
                      isOverride: false,
                      employee: emp,
                      employeeId: empId,
                      name: `${emp.lastName || ""}, ${emp.firstName || ""} ${emp.middleName ? emp.middleName.charAt(0) + "." : ""}`.trim(),
                      paymentType: emp.payMethod || "N/A", // Added paymentType from emp.payMethod
                      startDate: periodStartDate,
                      endDate: periodEndDate,
                      // --- UPDATE: Initialize Per Trip Fields with CHECKED values --- 
                      tripRate: initialCheckedRateSum, 
                      numberOfTrips: initialCheckedTripCount, 
                      // --- Keep other fields ---
                      earningsAdjustment: 0,
                      silPay: leavePayAmount,
                      thirteenthMonth: 0,
                      sss: 0,
                      philhealth: 0,
                      pagibig: 0,
                      caCharges: chargeAmount,
                      deductionsAdjustment: 0,
                      withholdingTax: 0,
                  };
                  return calculatePayroll(record);
              });
              setPayrollData(initialData);
          } catch (empError) {
              console.error("Error fetching employees for per-trip initialization:", empError);
              setError(empError.response?.data?.message || empError.message || "Failed to fetch employee data.");
          }
      }

      setIsLoading(false);
  }, [periodStartDate, periodEndDate, chargesDataMap, leaveDataMap, savedTripRatesMap]); // Keep dependencies

  // Assign the function to the ref (Keep)
  useEffect(() => { loadDataRef.current = loadDataForPeriod; }, [loadDataForPeriod]);

  // Main useEffect to load data (Keep)
  useEffect(() => { if (loadDataRef.current) { loadDataRef.current(); } }, [periodStartDate, periodEndDate]);

  // Filtered data based on search query (Keep)
  const filteredPayrollData = useMemo(() => {
    if (!searchQuery) return payrollData;
    
    // Get the rows that match the search query
    const searchMatches = payrollData.filter(record =>
        record.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        record.employeeId.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    // Get the rows that are checked but don't match the search
    const checkedRows = payrollData.filter(record => 
        selectedReportRows.includes(record.employeeId) && 
        !searchMatches.some(match => match.employeeId === record.employeeId)
    );
    
    // Combine search matches (at the top) with checked rows (below)
    return [...searchMatches, ...checkedRows];
  }, [payrollData, searchQuery, selectedReportRows]);

   // --- UPDATE: Calculate Totals for Per Trip ---
   const totals = useMemo(() => {
    return filteredPayrollData.reduce(
      (acc, record) => {
        acc.tripRate += parseFloat(record.tripRate) || 0; // Sum Trip Rate? Or just display average?
        acc.numberOfTrips += parseFloat(record.numberOfTrips) || 0; // Sum Number of Trips
        acc.basicPayForPeriod += parseFloat(record.basicPayForPeriod) || 0;
        acc.earningsAdjustment += parseFloat(record.earningsAdjustment) || 0;
        acc.silPay += parseFloat(record.silPay) || 0;
        acc.thirteenthMonth += parseFloat(record.thirteenthMonth) || 0;
        acc.totalGrossPay += parseFloat(record.totalGrossPay) || 0;
        acc.sss += parseFloat(record.sss) || 0;
        acc.philhealth += parseFloat(record.philhealth) || 0;
        acc.pagibig += parseFloat(record.pagibig) || 0;
        acc.caCharges += parseFloat(record.caCharges) || 0;
        acc.deductionsAdjustment += parseFloat(record.deductionsAdjustment) || 0;
        acc.withholdingTax += parseFloat(record.withholdingTax) || 0;
        acc.totalDeductions += parseFloat(record.totalDeductions) || 0;
        acc.netPay += parseFloat(record.netPay) || 0;
        return acc;
      },
      { // Initialize totals object
        tripRate: 0,
        numberOfTrips: 0,
        basicPayForPeriod: 0,
        earningsAdjustment: 0,
        silPay: 0, thirteenthMonth: 0,
        totalGrossPay: 0, sss: 0, philhealth: 0, pagibig: 0, caCharges: 0,
        deductionsAdjustment: 0, withholdingTax: 0, totalDeductions: 0, netPay: 0,
      }
    );
  }, [filteredPayrollData]);

  // Toggle Override Handler (Adapt for Per Trip - calculation logic is inside)
  const handleToggleOverride = (employeeId) => {
      let updatedData = [];
      setPayrollData(prevData => {
          updatedData = prevData.map(record => {
              if (record.employeeId === employeeId) {
                  const newIsOverride = !record.isOverride;
                  let updatedRecord = { ...record, isOverride: newIsOverride };
                  // If switching override OFF, recalculate/refetch relevant fields
                  if (!newIsOverride) {
                      console.log(`Override OFF for ${employeeId}. Recalculating/Refetching...`);
                      updatedRecord.sss = findSssContribution(record.totalGrossPay);
                      // Adjust Philhealth/Pagibig basis if needed
                      updatedRecord.philhealth = findPhilhealthContributionByExactMatch(record.tripRate); 
                      updatedRecord.pagibig = findPagibigContribution(record.tripRate); 
                      updatedRecord.caCharges = chargesDataMap[employeeId] || 0;
                      const employeeObjectId = record.employee?._id?.toString();
                      updatedRecord.silPay = employeeObjectId ? (leaveDataMap[employeeObjectId] || 0) : 0;
                      return calculatePayroll(updatedRecord);
                  } else {
                      return calculatePayroll(updatedRecord); // Run calc to ensure totals are consistent
                  }
              } else { return record; }
          });
          return updatedData;
      });
      const token = localStorage.getItem("token");
      debouncedSaveDraft(updatedData, token, periodStartDate, periodEndDate);
      const newState = updatedData.find(r => r.employeeId === employeeId)?.isOverride;
      toast({ 
          title: `Override ${newState ? 'Enabled' : 'Disabled'}`, 
          description: `Manual entries ${newState ? 'active' : 'inactive'}. ${!newState ? 'Calculated/Fetched values restored.' : 'Saved values kept.'}`,
          status: newState ? "warning" : "info", duration: 4000, isClosable: true });
  };

  // --- UPDATE: Explicit Save Changes Handler for Per Trip ---
  const handleSaveChanges = async () => {
    if (payrollData.length === 0) { toast({ title: "No Data", status: "info"}); return; }
    setIsSavingDraft(true); setDraftError(null);
    const token = localStorage.getItem("token");
    if (!token) { setDraftError("Authentication token not found."); setIsSavingDraft(false); toast({ title: "Authentication Error", status: "error"}); return; }
    const draftsWithDates = payrollData.map(d => ({ ...d, startDate: periodStartDate, endDate: periodEndDate }));
    console.log("Explicitly saving per-trip drafts:", draftsWithDates);
     try {
       const response = await axios.put(
         // --- UPDATE API ENDPOINT ---
         `${process.env.NEXT_PUBLIC_BACKEND_API}/api/payroll/per-trip-cargo/bulk-upsert`, 
         draftsWithDates, { headers: { Authorization: `Bearer ${token}` } } );
       toast({ title: "Changes Saved Successfully", description: `Per-trip draft updated/created.`, status: "success", duration: 3000, isClosable: true });
     } catch (err) {
         console.error("Save per-trip changes error:", err);
         const errorMsg = err.response?.data?.message || err.message || "Failed to save per-trip changes.";
         setDraftError(errorMsg); toast({ title: 'Error Saving Per-Trip Changes', description: errorMsg, status: 'error', duration: 4000, isClosable: true });
     } finally { setIsSavingDraft(false); }
  };

  // --- UPDATE: Clear Per Trip Draft Handler ---
  const handleClearDraft = async () => {
    setIsClearingDraft(true); setDraftError(null);
    const token = localStorage.getItem("token");
    if (!token) { setDraftError("Authentication token not found."); setIsClearingDraft(false); toast({ title: "Authentication Error", status: "error" }); onClearConfirmClose(); return; }
    try {
      const response = await axios.delete(
        // --- UPDATE API ENDPOINT ---
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/payroll/per-trip-cargo/clear-drafts`, 
        { params: { startDate: periodStartDate, endDate: periodEndDate }, headers: { Authorization: `Bearer ${token}` } }
      );
      toast({ title: "Per-Trip Draft Cleared", description: response.data.message || "Per-trip draft data cleared.", status: "success", duration: 4000, isClosable: true });
      if (loadDataRef.current) { loadDataRef.current(); }
    } catch (err) {
      console.error("Clear per-trip draft error:", err);
      const errorMsg = err.response?.data?.message || err.message || "Failed to clear per-trip draft.";
      setDraftError(errorMsg); 
      toast({ title: 'Error Clearing Per-Trip Draft', description: errorMsg, status: 'error', duration: 5000, isClosable: true });
    } finally { setIsClearingDraft(false); onClearConfirmClose(); }
  };

  // --- Add Function to Fetch Trip Details for Modal ---
  const fetchTripDetails = async (employeeId, startDate, endDate) => {
    if (!employeeId || !startDate || !endDate) return;
    setIsFetchingTrips(true);
    setFetchTripsError(null);
    setFetchedTripDetails([]); // Clear previous details
    setSelectedWaybills([]); // Clear selected waybills for the new modal content
    const token = localStorage.getItem("token");

    // Initialize editedTripRates for the current employee from savedTripRatesMap or default to 0
    const initialRatesForModal = {};
    const employeeSavedRates = savedTripRatesMap[employeeId] || {};

    try {
        const response = await axios.get(
            `${process.env.NEXT_PUBLIC_BACKEND_API}/api/payroll/per-trip-cargo/trips`, {
                params: { employeeId, startDate, endDate },
                headers: { Authorization: `Bearer ${token}` },
            }
        );
        const fetchedTrips = response.data || [];
        setFetchedTripDetails(fetchedTrips);

        // Populate initialRatesForModal and selectedWaybills based on fetched trips and saved rates
        const initiallySelectedWaybills = [];
        fetchedTrips.forEach(trip => {
            if (employeeSavedRates[trip.waybillNumber]) {
                initialRatesForModal[trip.waybillNumber] = employeeSavedRates[trip.waybillNumber].rate;
                if (employeeSavedRates[trip.waybillNumber].isChecked) {
                    initiallySelectedWaybills.push(trip.waybillNumber);
                }
            } else {
                initialRatesForModal[trip.waybillNumber] = 0; // Default to 0 if no saved rate
            }
        });
        setEditedTripRates(initialRatesForModal);
        setSelectedWaybills(initiallySelectedWaybills); // Set selected waybills based on saved checked status

    } catch (err) {
        console.error("Error fetching trip details for modal:", err);
        const errorMsg = err.response?.data?.message || err.message || "Failed to load trip details.";
        setFetchTripsError(errorMsg);
        toast({ title: 'Error Fetching Trips', description: errorMsg, status: 'error', duration: 4000, isClosable: true });
    } finally {
        setIsFetchingTrips(false);
    }
  };

  // --- Function to handle modal close and reset state ---
  const handleModalClose = () => {
      if (selectedEmployeeTrips && fetchedTripDetails && fetchedTripDetails.length > 0) {
        let modalTotalRate = 0;
        // Count only the trips that were CHECKED in the modal
        const modalTripCount = selectedWaybills.length; 

        fetchedTripDetails.forEach(detail => {
            // Only include rate if the waybill was selected (checked)
            if (selectedWaybills.includes(detail.waybillNumber)) {
                const rateValue = editedTripRates[detail.waybillNumber] !== undefined 
                                ? parseFloat(editedTripRates[detail.waybillNumber]) || 0 
                                : 0; // Default to 0 if no edited rate for a selected waybill (should not happen if initialized)
                modalTotalRate += rateValue;
            }
        });

        console.log(`Modal closed for ${selectedEmployeeTrips.employeeId}. CHECKED Modal Total Rate: ${modalTotalRate}, CHECKED Modal Trip Count: ${modalTripCount}`);

        let updatedPayrollDataForSave = [];
        setPayrollData(prevData => {
            const newData = prevData.map(record => {
                if (record.employeeId === selectedEmployeeTrips.employeeId) {
                    const updatedRecord = {
                        ...record,
                        tripRate: modalTotalRate,       // Update with sum of ALL rates in modal
                        numberOfTrips: modalTripCount, // Update with count of ALL trips in modal
                    };
                    return calculatePayroll(updatedRecord);
                }
                return record;
            });
            updatedPayrollDataForSave = newData; // Capture for potential future use
            return newData;
        });

        // Auto-save removed - all saving will be done through Save Changes button
      } // Closes: if (selectedEmployeeTrips && fetchedTripDetails && fetchedTripDetails.length > 0)

      // Existing close logic
      onViewTripsModalClose();
      setFetchedTripDetails([]);
      setFetchTripsError(null);
      setSelectedEmployeeTrips(null); 
      setEditedTripRates({}); 
      setIsSavingRates(false); 
      setSelectedWaybills([]); // Also clear selected waybills in modal
  }; // Closes: const handleModalClose = () => {...}

  // --- ADD: Handle Save Rates Button Click ---
  const handleSaveRates = async () => {
    if (!selectedEmployeeTrips || fetchedTripDetails.length === 0) {
        toast({ title: "No Trips", description: "No trip data to save.", status: "info" });
        return;
    }

    setIsSavingRates(true);
    const token = localStorage.getItem("token");
    if (!token) {
        toast({ title: "Authentication Error", status: "error" });
        setIsSavingRates(false);
        return;
    }

    // Prepare payload: Array of rate objects
    const ratesPayload = fetchedTripDetails
        .filter(detail => editedTripRates.hasOwnProperty(detail.waybillNumber)) // Only include rates that were actually edited
        .map(detail => ({
            employeeId: selectedEmployeeTrips.employeeId,
            tripID: detail.tripID,
            waybillNumber: detail.waybillNumber,
            rate: editedTripRates[detail.waybillNumber] ?? 0, // Use edited rate
            isChecked: selectedWaybills.includes(detail.waybillNumber), // Add checked status
            payrollPeriodStartDate: periodStartDate,
            payrollPeriodEndDate: periodEndDate,
        }));

    // --- Always update Trip Rate and No. of Trips from modal ---
    const allRatesInModal = { ...savedTripRatesMap[selectedEmployeeTrips.employeeId] || {}, ...editedTripRates }; 
    let newTotalRate = 0;
    let newNumberOfTrips = 0;
    fetchedTripDetails.forEach(detail => {
        if (selectedWaybills.includes(detail.waybillNumber)) {
            const rateValue = editedTripRates[detail.waybillNumber] ?? (allRatesInModal[detail.waybillNumber]?.rate ?? 0); 
            newTotalRate += parseFloat(rateValue) || 0;
            newNumberOfTrips++;
        }
    });
    setPayrollData(prevData => 
        prevData.map(record => {
            if (record.employeeId === selectedEmployeeTrips.employeeId) {
                const updatedRecord = {
                    ...record,
                    tripRate: newTotalRate,
                    numberOfTrips: newNumberOfTrips
                };
                return calculatePayroll(updatedRecord);
            }
            return record;
        })
    );

    if (ratesPayload.length === 0) {
        toast({ title: "Trip Rate Updated", description: "Trip Rate and No. of Trips updated from modal.", status: "success" });
        setIsSavingRates(false);
        return;
    }

    try {
        const response = await axios.put(
            `${process.env.NEXT_PUBLIC_BACKEND_API}/api/payroll/per-trip-cargo/save-rates`,
            ratesPayload,
            { headers: { Authorization: `Bearer ${token}` } }
        );
        setSavedTripRatesMap(prev => {
            const updated = {
                ...prev,
                [selectedEmployeeTrips.employeeId]: allRatesInModal
            };
            return updated;
        });
        toast({
            title: "Rates Saved Successfully",
            description: `${response.data.modifiedCount || 0} updated, ${response.data.upsertedCount || 0} added. Total Rate: ${pesoFormatter.format(newTotalRate)}`,
            status: "success",
            duration: 3000,
            isClosable: true,
        });
        setTimeout(() => {
            if (loadDataRef.current) {
                loadDataRef.current();
            }
        }, 300);
    } catch (err) {
        console.error("Error saving trip rates:", err);
        const errorMsg = err.response?.data?.message || err.message || "Failed to save rates.";
        toast({ title: "Error Saving Rates", description: errorMsg, status: "error", duration: 5000, isClosable: true });
    } finally {
        setIsSavingRates(false);
    }
  };
  // --- End Handle Save Rates ---

  // --- ADD: handleCreateReport Function for Per Trip --- 
  const handleCreateReport = async () => {
    if (!periodStartDate || !periodEndDate || !/\d{4}-\d{2}-\d{2}/.test(periodStartDate) || !/\d{4}-\d{2}-\d{2}/.test(periodEndDate)) {
        toast({ title: "Invalid Period", description: "Please set a valid start and end date before generating the report.", status: "error"});
        return;
    }
    if (payrollData.length === 0) {
       toast({ title: "No Data", description: "No payroll data to generate a report for the selected period.", status: "info"});
       return;
    }
    // --- ADDED: Check if any rows are selected ---
    if (selectedReportRows.length === 0) {
        toast({ title: "No Employees Selected", description: "Please select employees to include in the report using the checkboxes.", status: "warning"});
        return;
    }
    // --- END CHECK ---

    // --- UPDATE: Filter payrollData based on selected rows ---
    const dataForReport = payrollData.filter(record =>
      selectedReportRows.includes(record.employeeId)
    );

    if (dataForReport.length === 0) {
       toast({ title: "No Data Selected", description: "No payroll data to generate a report for the selected employees.", status: "info"});
       return;
    }
    // --- END UPDATE ---

    setIsSaving(true); // Use isSaving state for the report button action
    setError(null);
    const token = localStorage.getItem("token");
    if (!token) {
      setError("Authentication token not found.");
      setIsSaving(false);
      toast({ title: "Authentication Error", status: "error"});
      return;
    }

    const reportPayload = {
      payrollData: dataForReport.map(item => {
        // Explicitly remove OT and Holiday Pay before sending
        const { overTime, holidayPay, ...rest } = item;
        return rest;
      }),
      startDate: periodStartDate,
      endDate: periodEndDate
    };
    console.log("Creating Per Trip Payroll Report with data:", reportPayload);
    try {
      const response = await axios.post(
        // --- UPDATE API ENDPOINT for PER TRIP reports --- 
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/reports/payroll/per-trip-cargo`,
        reportPayload,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast({
        title: "Per Trip Report Generated Successfully", // Updated title
        description: response.data.message || `Report ID: ${response.data.reportId}`,
        status: "success",
        duration: 5000,
        isClosable: true,
      });
      // --- Clear local state after successful report generation --- 
      setPayrollData([]);
      // --- ADDED: Clear selection as well ---
      setSelectedReportRows([]);
      // Reload data to show empty state or default employees
      if (loadDataRef.current) {
          loadDataRef.current(); 
      }
      // --- End of clearing state/reloading --- 
    } catch (err) {
      console.error("Error generating per trip payroll report:", err);
      const errorMessage = err.response?.data?.message || err.message || "Failed to generate per trip report."; // Updated message
      setError(errorMessage);
      toast({
        title: "Error Generating Per Trip Report", // Updated title
        description: errorMessage,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsSaving(false);
    }
  };
  // --- End handleCreateReport ---

  // --- ADDED: Helper to count visible columns in a group ---
  const countVisibleColumns = (groupKeys) => {
    return groupKeys.reduce((count, key) => count + (columnVisibility[key] ? 1 : 0), 0);
  };

  // --- ADDED: Calculate dynamic colSpans for Per Trip ---
  const visibleCoreColumns = countVisibleColumns(['checkbox', 'paymentType', 'employeeId', 'name', 'tripRate', 'viewTrips', 'numberOfTrips', 'basicPayForPeriod']);
  const visibleEarningsColumns = countVisibleColumns(['earningsAdjustment', 'silPay', 'thirteenthMonth']);
  const visibleDeductionsColumns = countVisibleColumns(['deductionsAdjustment', 'sss', 'philhealth', 'pagibig', 'caCharges', 'withholdingTax']);
  const totalVisibleColumns = 
      visibleCoreColumns + 
      visibleEarningsColumns + 
      (columnVisibility.totalGrossPay ? 1 : 0) + 
      visibleDeductionsColumns + 
      (columnVisibility.totalDeductions ? 1 : 0) + 
      (columnVisibility.netPay ? 1 : 0) + 
      1; // Actions column

  // --- Add state for expanded trip in modal ---
  const [expandedTripId, setExpandedTripId] = useState(null);
  // --- Add state for which trip is being viewed in modal ---
  const [viewingTripId, setViewingTripId] = useState(null);

  // --- ADDED: State for Applying 13th Month Pay ---
  const [applying13thMonth, setApplying13thMonth] = useState({});

  // --- Helper function to fetch 13th month pay ---
  const fetch13thMonthPay = async (employeeId) => {
    const token = localStorage.getItem("token");
    if (!token) {
      throw new Error("Authentication token not found.");
    }
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/13th-month/employee/${employeeId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data && typeof response.data.thirteenthMonthPay !== 'undefined' && response.data.thirteenthMonthPay !== null) {
        const payValue = parseFloat(response.data.thirteenthMonthPay);
        return isNaN(payValue) ? 0 : payValue;
      } else {
        return 0;
      }
    } catch (err) {
      // Only log unexpected errors, not 404s
      if (err.response && err.response.status === 404) {
        // Do not log 404s
        return 0;
      } else {
        console.error(`Error fetching 13th month pay for employee ${employeeId}:`, err);
        throw err;
      }
    }
  };

  // --- Handler to apply fetched 13th month pay ---
  const handleApply13thMonth = async (employeeId) => {
    setApplying13thMonth(prev => ({ ...prev, [employeeId]: true }));
    const token = localStorage.getItem("token");
    if (!token) {
      toast({ title: "Authentication Error", description: "Please log in again.", status: "error" });
      setApplying13thMonth(prev => ({ ...prev, [employeeId]: false }));
      return;
    }

    const record = payrollData.find(r => r.employeeId === employeeId);
    if (!record) {
      toast({ title: "Employee Not Found", description: `No payroll record found for Employee ID: ${employeeId}`, status: "error" });
      setApplying13thMonth(prev => ({ ...prev, [employeeId]: false }));
      return;
    }

    try {
      const fetchedPay = await fetch13thMonthPay(employeeId);

      if (fetchedPay === 0) {
        toast({
          title: "No 13th Month Pay Found",
          description: `No 13th month pay record found for Employee ID: ${employeeId}`,
          status: "info",
          duration: 4000,
          isClosable: true,
        });
      } else {
        handleFieldUpdate(employeeId, 'thirteenthMonth', fetchedPay);
        toast({
          title: "13th Month Applied",
          description: `Set to ${pesoFormatter.format(fetchedPay)} for Employee ${employeeId}`,
          status: "success",
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (err) {
      if (err.response && err.response.status === 404) {
        // Already handled above
      } else {
        const errorMsg = err.response?.data?.message || err.message || "Failed to fetch or apply 13th month pay.";
        toast({
          title: "Error Applying 13th Month",
          description: errorMsg,
          status: "error",
          duration: 4000,
          isClosable: true,
        });
      }
    } finally {
      setApplying13thMonth(prev => ({ ...prev, [employeeId]: false }));
    }
  };

  return (
    <MotionBox>
      <Box p={4}>
        {/* Search and Actions Bar (Keep structure) */}
        <Flex justify="space-between" align="center" mb={6} wrap="wrap">
          {/* Left side: Period Covered, Change Date, and Action Buttons */}
          <HStack spacing={3} wrap="wrap" mb={{ base: 4, md: 0 }} align="center">
            <VStack align="flex-start" spacing={0} mr={3}>
              <Text fontSize="xs" color="gray.500" textTransform="uppercase">PERIOD COVERED</Text>
              <Text fontWeight="bold" fontSize="md" color={primaryColor}>
                {formatDateRange(periodStartDate, periodEndDate)}
              </Text>
              <Button variant="outline" size="xs" colorScheme="blue" onClick={onDateModalOpen} isDisabled={isLoading || isSaving || isSavingDraft || isClearingDraft} mt={1}>
                Change Date
              </Button>
            </VStack>
            <Button
              bg={primaryColor} // Maroon color
              color="white"
              size="md"
              borderRadius="md" // Standard border radius
              _hover={{ bg: "#660000" }} // Darker maroon on hover
              _active={{ bg: "#500000" }} // Even darker on active
              onClick={handleCreateReport}
              isLoading={isSaving}
              isDisabled={isLoading || isSaving || isSavingDraft || isClearingDraft}
              leftIcon={<FaFileAlt />}
            >
              Create Report
            </Button>
            <Button
              variant="solid"
              bg="green.500" // Green color
              color="white"
              size="md"
              borderRadius="md"
              onClick={handleSaveChanges}
              isLoading={isSavingDraft}
              isDisabled={isLoading || isSaving || isSavingDraft || isClearingDraft}
              _hover={{ bg: "green.600" }}
              _active={{ bg: "green.700" }}
            >
              Save Changes
            </Button>
            <Button
              variant="outline"
              colorScheme="red"
              borderColor="red.500" // Ensure border is red
              color="red.500"       // Ensure text is red
              size="md"
              borderRadius="md"
              onClick={onClearConfirmOpen}
              isLoading={isClearingDraft}
              isDisabled={isLoading || isSaving || isSavingDraft || isClearingDraft || payrollData.length === 0}
              _hover={{ bg: "red.50" }} // Light red background on hover
            >
              Clear Draft
            </Button>
          </HStack>

          {/* Right side: Search and Settings - Pushed to the far right */}
          <HStack spacing={3} wrap="wrap" ml="auto">
            <InputGroup maxW="300px"> {/* Adjusted maxW for potentially tighter spaces */}
              <InputLeftElement pointerEvents="none">
                <SearchIcon color="gray.400" /> {/* Softer search icon color */}
              </InputLeftElement>
              <Input
                placeholder="Search by Name or Employee ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                borderRadius="md"
                borderColor="gray.300"
                _hover={{ borderColor: primaryColor }}
                _focus={{ borderColor: primaryColor, boxShadow: `0 0 0 1px ${primaryColor}` }}
                size="md"
              />
            </InputGroup>

            <Popover placement="bottom-end" isLazy> {/* Changed placement to bottom-end */}
              <PopoverTrigger>
                <IconButton
                  icon={<SettingsIcon />}
                  aria-label="Show/Hide Columns"
                  variant="outline"
                  size="md"
                  colorScheme="gray"
                  borderColor="gray.300"
                />
              </PopoverTrigger>
              <PopoverContent zIndex={401}> {/* Ensure it's above table header */}
                <PopoverArrow />
                <PopoverCloseButton />
                <PopoverHeader fontWeight="semibold">Show/Hide Columns</PopoverHeader>
                <PopoverBody>
                  <VStack align="start" spacing={1} maxHeight="300px" overflowY="auto">
                    {/* Checkboxes for each column */}
                    {Object.keys(columnVisibility).map((key) => (
                      <Checkbox
                        key={key}
                        isChecked={columnVisibility[key]}
                        onChange={() => handleColumnVisibilityChange(key)}
                        textTransform="capitalize" // Improve display name
                        size="sm"
                      >
                        {/* Simple way to format key to readable name */}
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </Checkbox>
                    ))}
                  </VStack>
                </PopoverBody>
              </PopoverContent>
            </Popover>
          </HStack>
        </Flex>

         {/* Display Combined Main/Draft Errors + Specific Contribution Errors */}
         {(error || draftError || sssError || philhealthError || pagibigError || chargesError || leaveError) && (
           <Stack spacing={2} mb={4}>
             {error && <Alert status="error" borderRadius="md"><AlertIcon />{error}</Alert>}
             {draftError && <Alert status="warning" borderRadius="md"><AlertIcon />Auto-save issue: {draftError}</Alert>}
             {/* Specific loading errors if needed */}
           </Stack>
        )}

        {/* Table Container */}
        <Box borderWidth="1px" borderRadius="lg" borderColor="#E2E8F0" boxShadow="sm" overflow="hidden">
          <TableContainer maxHeight="calc(100vh - 450px)" overflowY="auto">
            <Table variant="simple" size="sm" className="payroll-table">
              {/* --- UPDATE: THEAD for Per Trip --- */}
              <Thead position="sticky" top={0} zIndex={1} bg={headerBg} boxShadow="sm">
                 {/* Row 1: Groups */}
                 <Tr>
                    {/* --- UPDATED: Column Headers based on external period display --- */}
                    {columnVisibility.checkbox && (
                        <Th rowSpan={2} borderBottomWidth="2px" borderColor={secondaryColor} textAlign="center" verticalAlign="middle" px={1}>
                           <Checkbox
                               size="lg"
                               sx={{
                                 '.chakra-checkbox__control': { 
                                   borderColor: 'black',
                                   _hover: { borderColor: 'black' }
                                 }
                               }}
                               isChecked={filteredPayrollData.length > 0 && selectedReportRows.length === filteredPayrollData.length}
                               isIndeterminate={selectedReportRows.length > 0 && selectedReportRows.length < filteredPayrollData.length}
                               onChange={handleSelectAllReport}
                           />
                        </Th>
                    )}
                    {columnVisibility.paymentType && <Th rowSpan={2} borderBottomWidth="2px" borderColor={secondaryColor} textAlign="center" verticalAlign="middle">Payment Type</Th>}
                    {/* StartDate and EndDate Th removed as they are displayed externally */}
                    {columnVisibility.employeeId && <Th rowSpan={2} borderBottomWidth="2px" borderColor={secondaryColor} textAlign="center" verticalAlign="middle">Employee ID</Th>}
                    {columnVisibility.name && <Th rowSpan={2} borderBottomWidth="2px" borderColor={secondaryColor} textAlign="center" verticalAlign="middle">Name</Th>}
                    {columnVisibility.tripRate && <Th rowSpan={2} borderBottomWidth="2px" borderColor={secondaryColor} textAlign="center" verticalAlign="middle">Trip Rate</Th>}
                    {columnVisibility.viewTrips && <Th rowSpan={2} borderBottomWidth="2px" borderColor={secondaryColor} textAlign="center" verticalAlign="middle">View Trips</Th>} {/* ADDED Th for View Trips */}
                    {columnVisibility.numberOfTrips && <Th rowSpan={2} borderBottomWidth="2px" borderColor={secondaryColor} textAlign="center" verticalAlign="middle">No. of Trips</Th>}
                    {columnVisibility.basicPayForPeriod && <Th rowSpan={2} borderBottomWidth="2px" borderColor={secondaryColor} textAlign="center" verticalAlign="middle" bg={earningsHeaderBg}>Basic Pay</Th>}
                    
                    {visibleEarningsColumns > 0 && <Th colSpan={visibleEarningsColumns} borderBottomWidth="2px" borderColor={secondaryColor} textAlign="center" bg={earningsHeaderBg}>EARNINGS</Th>}
                    
                    {columnVisibility.totalGrossPay && <Th rowSpan={2} borderBottomWidth="2px" borderColor={secondaryColor} textAlign="center" verticalAlign="middle" bg={earningsColBg}>Total Gross Pay</Th>}
                    
                    {visibleDeductionsColumns > 0 && <Th colSpan={visibleDeductionsColumns} borderBottomWidth="2px" borderColor={secondaryColor} textAlign="center" bg={deductionsHeaderBg}>DEDUCTIONS</Th>}
                    
                    {columnVisibility.totalDeductions && <Th rowSpan={2} borderBottomWidth="2px" borderColor={secondaryColor} textAlign="center" verticalAlign="middle" bg={deductionsColBg}>Total Deductions</Th>}
                    {columnVisibility.netPay && <Th rowSpan={2} borderBottomWidth="2px" borderColor={secondaryColor} textAlign="center" verticalAlign="middle" bg={netPayHeaderBg}>Net Pay</Th>}
                    <Th rowSpan={2} borderBottomWidth="2px" borderColor={secondaryColor} textAlign="center" verticalAlign="middle">Actions</Th>
                 </Tr>
                 {/* Row 2: Specific Columns under groups */}
                 <Tr>
                    {/* Placeholders for StartDate, EndDate, ViewTrips removed */}
                    {/* Earnings Sub-Headers */}
                    {columnVisibility.earningsAdjustment && <Th borderBottomWidth="2px" borderColor={secondaryColor} bg={earningsHeaderBg}>Adjustment</Th>}
                    {columnVisibility.silPay && <Th borderBottomWidth="2px" borderColor={secondaryColor} bg={earningsHeaderBg}>SIL Pay</Th>}
                    {columnVisibility.thirteenthMonth && <Th borderBottomWidth="2px" borderColor={secondaryColor} bg={earningsHeaderBg}>13th Month</Th>}
                    
                    {/* Deductions Sub-Headers */}
                    {columnVisibility.deductionsAdjustment && <Th borderBottomWidth="2px" borderColor={secondaryColor} bg={deductionsHeaderBg}>Adjustment</Th>}
                    {columnVisibility.sss && <Th borderBottomWidth="2px" borderColor={secondaryColor} bg={deductionsHeaderBg}>SSS</Th>}
                    {columnVisibility.philhealth && <Th borderBottomWidth="2px" borderColor={secondaryColor} bg={deductionsHeaderBg}>Philhealth</Th>}
                    {columnVisibility.pagibig && <Th borderBottomWidth="2px" borderColor={secondaryColor} bg={deductionsHeaderBg}>Pag-IBIG</Th>}
                    {columnVisibility.caCharges && <Th borderBottomWidth="2px" borderColor={secondaryColor} bg={deductionsHeaderBg}>CA/Charges</Th>}
                    {columnVisibility.withholdingTax && <Th borderBottomWidth="2px" borderColor={secondaryColor} bg={deductionsHeaderBg}>W/holding Tax</Th>}
                 </Tr>
              </Thead>
              {/* --- UPDATE: TBODY for Per Trip --- */}
              <Tbody>
                  {isLoading ? (
                      <Tr><Td colSpan={totalVisibleColumns} textAlign="center" py={10}><Spinner size="xl" /></Td></Tr> 
                  ) : error ? (
                      <Tr><Td colSpan={totalVisibleColumns} textAlign="center" py={10}><Alert status="error">{error}</Alert></Td></Tr> 
                  ) : filteredPayrollData.length === 0 ? (
                      <Tr><Td colSpan={totalVisibleColumns} textAlign="center" py={10}>No data found for the selected period.</Td></Tr> 
                  ) : (
                      filteredPayrollData.map((record, index) => {
                          const isSelected = selectedReportRows.includes(record.employeeId);
                          const rowStyle = !isSelected ? { opacity: 0.6, pointerEvents: 'none' } : {};

                          return (
                          <MotionTr 
                            key={record.employeeId || index} 
                            style={rowStyle}
                            _hover={isSelected ? { bg: 'gray.50' } : {}} 
                          >
                              {/* --- CHECKBOX COLUMN --- */}
                              {columnVisibility.checkbox && (
                                <Td px={1} textAlign="center" style={{ pointerEvents: 'auto' }}>
                                  <Checkbox
                                      size="lg"
                                      sx={{
                                        '.chakra-checkbox__control': { 
                                          borderColor: 'black',
                                          _hover: { borderColor: 'black' }
                                        }
                                      }}
                                      isChecked={isSelected}
                                      onChange={() => handleRowCheckboxChange(record.employeeId)}
                                  />
                                </Td>
                              )}
                              
                              {columnVisibility.paymentType && <Td px={2} fontSize="xs" whiteSpace="nowrap">{record.paymentType}</Td>}
                              {columnVisibility.employeeId && <Td px={2} fontSize="xs">{record.employeeId}</Td>}
                              {columnVisibility.name && <Td px={2} fontSize="xs" whiteSpace="nowrap">{record.name}</Td>}
                              {columnVisibility.tripRate && (
                                <Td px={1} isNumeric fontSize="xs">
                                  <NumberInput 
                                    size="xs" 
                                    value={record.tripRate} 
                                    // onChange={(v) => isSelected && handleFieldUpdate(record.employeeId, 'tripRate', v)} // REMOVE onChange
                                    isReadOnly={true} // MAKE ReadOnly
                                    min={0} 
                                    precision={2} 
                                    isDisabled={!isSelected}
                                  >
                                    <NumberInputField px={1} cursor={isSelected ? "default" : "not-allowed"} border="none" bg="transparent"/>
                                  </NumberInput>
                                </Td>
                              )}
                              {/* ADDED Td for View Trips Button */}
                              {columnVisibility.viewTrips && (
                                <Td px={1} textAlign="center" style={{ pointerEvents: isSelected ? 'auto' : 'none' }}>
                                  <Button 
                                      size="xs" 
                                      onClick={() => { 
                                        setSelectedEmployeeTrips(record);
                                        // Ensure fetchTripDetails is called when opening the modal
                                        fetchTripDetails(record.employeeId, periodStartDate, periodEndDate);
                                        onViewTripsModalOpen(); 
                                      }}
                                      colorScheme="blue"
                                      variant="ghost" // Changed to ghost for a less prominent look
                                      title="View and Edit Trip Details"
                                      isDisabled={!isSelected} // Disable if not selected
                                  >
                                      View
                                  </Button>
                                </Td>
                              )}
                              {columnVisibility.numberOfTrips && (
                                <Td px={1} isNumeric fontSize="xs">
                                  <NumberInput 
                                    size="xs" 
                                    value={record.numberOfTrips} 
                                    // onChange={(v) => isSelected && handleFieldUpdate(record.employeeId, 'numberOfTrips', v)} // REMOVE onChange
                                    isReadOnly={true} // MAKE ReadOnly
                                    min={0} 
                                    precision={0} 
                                    isDisabled={!isSelected}
                                  >
                                    <NumberInputField px={1} cursor={isSelected ? "default" : "not-allowed"} border="none" bg="transparent"/>
                                  </NumberInput>
                                </Td>
                              )}
                              {columnVisibility.basicPayForPeriod && <Td px={1} isNumeric fontSize="xs" bg={earningsColBg}>{pesoFormatter.format(record.basicPayForPeriod || 0)}</Td>}
                              
                              {columnVisibility.earningsAdjustment && (
                                <Td px={1} isNumeric fontSize="xs" bg={earningsColBg}>
                                  <NumberInput 
                                    size="xs" 
                                    value={record.earningsAdjustment} 
                                    onChange={(v) => isSelected && handleFieldUpdate(record.employeeId, 'earningsAdjustment', v)} 
                                    precision={2} 
                                    isDisabled={!isSelected}
                                  >
                                    <NumberInputField px={1} bg="transparent" cursor={isSelected ? "text" : "not-allowed"}/>
                                  </NumberInput>
                                </Td>
                              )}
                              {columnVisibility.silPay && (
                                <Td px={1} isNumeric fontSize="xs" bg={earningsColBg}>
                                  <NumberInput 
                                    size="xs" 
                                    value={record.silPay} 
                                    isReadOnly={!record.isOverride || !isSelected} // Read-only if override is off OR not selected
                                    onChange={(v) => isSelected && record.isOverride && handleFieldUpdate(record.employeeId, 'silPay', v)}
                                    min={0} 
                                    precision={2} 
                                    isDisabled={!isSelected} // Overall disabled if not selected
                                  >
                                    <NumberInputField 
                                        px={1} 
                                        bg="transparent" 
                                        border="none" 
                                        cursor={isSelected && record.isOverride ? "text" : "not-allowed"}
                                        title={record.isOverride ? "Manual SIL Pay (Override ON)" : `SIL Pay from Leave module (Override OFF)`}
                                    />
                                  </NumberInput>
                                </Td>
                              )}
                              {columnVisibility.thirteenthMonth && (
                                <Td px={1} isNumeric fontSize="xs" bg={earningsColBg} verticalAlign="middle">
                                  {/* Show Apply button if value is 0 or falsy */}
                                  {(!record.thirteenthMonth || parseFloat(record.thirteenthMonth) === 0) ? (
                                    <Button
                                      size="xs"
                                      onClick={() => handleApply13thMonth(record.employeeId)}
                                      isLoading={applying13thMonth && applying13thMonth[record.employeeId]}
                                      loadingText="Applying"
                                      isDisabled={!isSelected || (applying13thMonth && applying13thMonth[record.employeeId])}
                                      colorScheme="blue"
                                      variant="outline"
                                    >
                                      Apply
                                    </Button>
                                  ) : (
                                    <NumberInput
                                      size="xs"
                                      value={record.thirteenthMonth || 0}
                                      onChange={(v) => isSelected && handleFieldUpdate(record.employeeId, 'thirteenthMonth', v)}
                                      min={0}
                                      precision={2}
                                      isDisabled={!isSelected}
                                    >
                                      <NumberInputField
                                        px={1}
                                        bg="transparent"
                                        cursor={isSelected ? "text" : "not-allowed"}
                                        textAlign="right"
                                      />
                                    </NumberInput>
                                  )}
                                </Td>
                              )}
                              
                              {columnVisibility.totalGrossPay && <Td px={2} isNumeric fontSize="xs" fontWeight="medium" bg={earningsColBg}>{pesoFormatter.format(record.totalGrossPay || 0)}</Td>}
                              
                              {columnVisibility.deductionsAdjustment && (
                                <Td px={1} isNumeric fontSize="xs" bg={deductionsColBg}>
                                  <NumberInput 
                                    size="xs" 
                                    value={record.deductionsAdjustment} 
                                    onChange={(v) => isSelected && handleFieldUpdate(record.employeeId, 'deductionsAdjustment', v)} 
                                    precision={2} 
                                    isDisabled={!isSelected}
                                  >
                                    <NumberInputField px={1} bg="transparent" cursor={isSelected ? "text" : "not-allowed"}/>
                                  </NumberInput>
                                </Td>
                              )}
                              {columnVisibility.sss && (
                                <Td px={1} isNumeric fontSize="xs" bg={deductionsColBg}>
                                  <Editable
                                      key={`sss-${record.employeeId}-${record.sss}`}
                                      defaultValue={pesoFormatter.format(record.sss || 0)}
                                      isPreviewFocusable={isSelected && record.isOverride}
                                      isDisabled={!isSelected || !record.isOverride}
                                      onSubmit={(nextValue) => isSelected && record.isOverride && handleFieldUpdate(record.employeeId, 'sss', nextValue)}
                                      fontSize="xs" 
                                      w="full"
                                  >
                                      <Tooltip label={record.isOverride ? "Manual Entry (Override ON)" : `Calculated based on Gross Pay: ${pesoFormatter.format(record.totalGrossPay)}`} placement="top">
                                          <EditablePreview 
                                              px={1} py={0.5} w="full"
                                              _hover={isSelected && record.isOverride ? { bg: 'gray.100' } : {}}
                                              cursor={isSelected && record.isOverride ? "text" : "not-allowed"}
                                          />
                                      </Tooltip>
                                      <EditableInput type="number" step="0.01" min="0" px={1} py={0.5} size="xs" textAlign="right" isDisabled={!isSelected || !record.isOverride}/>
                                  </Editable>
                                </Td>
                              )}
                              {columnVisibility.philhealth && (
                                <Td px={1} isNumeric fontSize="xs" bg={deductionsColBg}>
                                  <Editable
                                      key={`ph-${record.employeeId}-${record.philhealth}`}
                                      defaultValue={pesoFormatter.format(record.philhealth || 0)}
                                      isPreviewFocusable={isSelected && record.isOverride}
                                      isDisabled={!isSelected || !record.isOverride}
                                      onSubmit={(nextValue) => isSelected && record.isOverride && handleFieldUpdate(record.employeeId, 'philhealth', nextValue)}
                                      fontSize="xs" w="full"
                                  >
                                      <Tooltip label={record.isOverride ? "Manual Entry (Override ON)" : `Calculated based on Trip Rate * Number of Trips (if applicable)`} placement="top">
                                          <EditablePreview px={1} py={0.5} w="full" _hover={isSelected && record.isOverride ? { bg: 'gray.100' } : {}} cursor={isSelected && record.isOverride ? "text" : "not-allowed"}/>
                                      </Tooltip>
                                      <EditableInput type="number" step="0.01" min="0" px={1} py={0.5} size="xs" textAlign="right" isDisabled={!isSelected || !record.isOverride}/>
                                  </Editable>
                                </Td>
                              )}
                              {columnVisibility.pagibig && (
                                <Td px={1} isNumeric fontSize="xs" bg={deductionsColBg}>
                                  <Editable
                                      key={`pag-${record.employeeId}-${record.pagibig}`}
                                      defaultValue={pesoFormatter.format(record.pagibig || 0)}
                                      isPreviewFocusable={isSelected && record.isOverride}
                                      isDisabled={!isSelected || !record.isOverride}
                                      onSubmit={(nextValue) => isSelected && record.isOverride && handleFieldUpdate(record.employeeId, 'pagibig', nextValue)}
                                      fontSize="xs" w="full"
                                  >
                                      <Tooltip label={record.isOverride ? "Manual Entry (Override ON)" : `Calculated based on Trip Rate * Number of Trips (if applicable). Max PHP 100.00`} placement="top">
                                          <EditablePreview px={1} py={0.5} w="full" _hover={isSelected && record.isOverride ? { bg: 'gray.100' } : {}} cursor={isSelected && record.isOverride ? "text" : "not-allowed"}/>
                                      </Tooltip>
                                      <EditableInput type="number" step="0.01" min="0" px={1} py={0.5} size="xs" textAlign="right" isDisabled={!isSelected || !record.isOverride}/>
                                  </Editable>
                                </Td>
                              )}
                              {columnVisibility.caCharges && (
                                <Td px={1} isNumeric fontSize="xs" bg={deductionsColBg}>
                                    <Editable
                                      key={`ca-${record.employeeId}-${record.caCharges}`}
                                      defaultValue={pesoFormatter.format(record.caCharges || 0)}
                                      isPreviewFocusable={isSelected && record.isOverride}
                                      isDisabled={!isSelected || !record.isOverride}
                                      onSubmit={(nextValue) => isSelected && record.isOverride && handleFieldUpdate(record.employeeId, 'caCharges', nextValue)}
                                      fontSize="xs" w="full"
                                    >
                                        <Tooltip label={record.isOverride ? "Manual Entry (Override ON)" : `From Charges module for period ending ${format(parseISO(periodEndDate), 'MMM d, yyyy')}`} placement="top">
                                            <EditablePreview px={1} py={0.5} w="full" _hover={isSelected && record.isOverride ? { bg: 'gray.100' } : {}} cursor={isSelected && record.isOverride ? "text" : "not-allowed"}/>
                                        </Tooltip>
                                        <EditableInput type="number" step="0.01" min="0" px={1} py={0.5} size="xs" textAlign="right" isDisabled={!isSelected || !record.isOverride}/>
                                    </Editable>
                                </Td>
                              )}
                              {columnVisibility.withholdingTax && (
                                <Td px={1} isNumeric fontSize="xs" bg={deductionsColBg}>
                                  <NumberInput 
                                    size="xs" 
                                    value={record.withholdingTax} 
                                    onChange={(v) => isSelected && handleFieldUpdate(record.employeeId, 'withholdingTax', v)} 
                                    min={0} 
                                    precision={2} 
                                    isDisabled={!isSelected}
                                  >
                                    <NumberInputField px={1} bg="transparent" cursor={isSelected ? "text" : "not-allowed"}/>
                                  </NumberInput>
                                </Td>
                              )}
                              
                              {columnVisibility.totalDeductions && <Td px={2} isNumeric fontSize="xs" fontWeight="medium" bg={deductionsColBg}>{pesoFormatter.format(record.totalDeductions || 0)}</Td>}
                              {columnVisibility.netPay && <Td px={2} isNumeric fontSize="xs" fontWeight="bold" bg={netPayColBg}>{pesoFormatter.format(record.netPay || 0)}</Td>}
                              
                              {/* --- ACTIONS COLUMN --- */}
                              <Td px={1} textAlign="center" style={{ pointerEvents: isSelected ? 'auto' : 'none' }}>
                                <HStack spacing={1} justifyContent="center">
                                  {/* View Trips Button MOVED to its own column */}
                                  <Button 
                                      size="xs" 
                                      onClick={() => handleToggleOverride(record.employeeId)}
                                      colorScheme={record.isOverride ? "orange" : "gray"}
                                      variant={record.isOverride ? "solid" : "outline"}
                                      title={record.isOverride ? "Disable Override" : "Enable Override"}
                                      isDisabled={!isSelected} // Disable if not selected
                                  >
                                      Override
                                  </Button>
                                </HStack>
                              </Td>
                          </MotionTr>
                          );
                      })
                  )}
              </Tbody>
               {/* === TFOOT === */}
               {!isLoading && !error && filteredPayrollData.length > 0 && (
                   <Tfoot bg="gray.100">
                       <Tr>
                           {/* --- UPDATED: Dynamic ColSpan for Totals Label --- */}
                           {columnVisibility.checkbox && <Th py={2}></Th>} {/* Placeholder for checkbox column */}
                           <Th colSpan={countVisibleColumns(['paymentType', 'employeeId', 'name'])} textAlign="right" py={2}>TOTALS:</Th> 
                           {/* Conditionally render total cells in proper order */} 
                           {columnVisibility.tripRate && <Th isNumeric py={2}>{pesoFormatter.format(totals.tripRate)}</Th>}
                           {columnVisibility.viewTrips && <Th py={2}></Th>} {/* Placeholder for View Trips column in footer */}
                           {columnVisibility.numberOfTrips && <Th isNumeric py={2}>{totals.numberOfTrips}</Th>}
                           {/* View Trips Button has no total - Handled by Actions placeholder */}
                           {columnVisibility.basicPayForPeriod && <Th isNumeric py={2} bg={earningsColBg}>{pesoFormatter.format(totals.basicPayForPeriod)}</Th>}
                           {columnVisibility.earningsAdjustment && <Th isNumeric py={2} bg={earningsColBg}>{pesoFormatter.format(totals.earningsAdjustment)}</Th>}
                           {columnVisibility.silPay && <Th isNumeric py={2} bg={earningsColBg}>{pesoFormatter.format(totals.silPay)}</Th>}
                           {columnVisibility.thirteenthMonth && <Th isNumeric py={2} bg={earningsColBg}>{pesoFormatter.format(totals.thirteenthMonth)}</Th>}
                           {columnVisibility.totalGrossPay && <Th isNumeric py={2} bg={earningsColBg}>{pesoFormatter.format(totals.totalGrossPay)}</Th>}
                           {columnVisibility.deductionsAdjustment && <Th isNumeric py={2} bg={deductionsColBg}>{pesoFormatter.format(totals.deductionsAdjustment)}</Th>}
                           {columnVisibility.sss && <Th isNumeric py={2} bg={deductionsColBg}>{pesoFormatter.format(totals.sss)}</Th>}
                           {columnVisibility.philhealth && <Th isNumeric py={2} bg={deductionsColBg}>{pesoFormatter.format(totals.philhealth)}</Th>}
                           {columnVisibility.pagibig && <Th isNumeric py={2} bg={deductionsColBg}>{pesoFormatter.format(totals.pagibig)}</Th>}
                           {columnVisibility.caCharges && <Th isNumeric py={2} bg={deductionsColBg}>{pesoFormatter.format(totals.caCharges)}</Th>}
                           {columnVisibility.withholdingTax && <Th isNumeric py={2} bg={deductionsColBg}>{pesoFormatter.format(totals.withholdingTax)}</Th>}
                           {columnVisibility.totalDeductions && <Th isNumeric py={2} bg={deductionsColBg}>{pesoFormatter.format(totals.totalDeductions)}</Th>}
                           {columnVisibility.netPay && <Th isNumeric py={2} bg={netPayColBg}>{pesoFormatter.format(totals.netPay)}</Th>}
                           <Th py={2}></Th> { /* Placeholder for Actions */}
                       </Tr>
                   </Tfoot>
               )}
            </Table>
          </TableContainer>
        </Box>
      </Box>

       {/* Date Range Selection Modal (Keep) */}
       <Modal isOpen={isDateModalOpen} onClose={onDateModalClose} isCentered>
          <ModalOverlay />
          <ModalContent>
           <ModalHeader>Set Payroll Period</ModalHeader> <ModalCloseButton />
           <ModalBody pb={6}>
             <FormControl mb={4}> <FormLabel>Start Date</FormLabel> <Input type="date" value={tempStartDate} onChange={(e) => setTempStartDate(e.target.value)} /> </FormControl>
             <FormControl> <FormLabel>End Date</FormLabel> <Input type="date" value={tempEndDate} onChange={(e) => setTempEndDate(e.target.value)} min={tempStartDate} /> </FormControl>
            </ModalBody>
            <ModalFooter> <Button colorScheme="blue" mr={3} onClick={handleApplyDateRange}> Apply </Button> <Button variant="ghost" onClick={onDateModalClose}>Cancel</Button> </ModalFooter>
          </ModalContent>
        </Modal>

        {/* Clear Draft Confirmation Modal (Update text) */}
        <Modal isOpen={isClearConfirmOpen} onClose={onClearConfirmClose} isCentered>
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>Confirm Clear Per-Trip Draft</ModalHeader> <ModalCloseButton />
            <ModalBody> Are you sure you want to clear all unsaved per-trip draft data for the period <Text as="span" fontWeight="bold">{formatDateRange(periodStartDate, periodEndDate)}</Text>? This cannot be undone. </ModalBody>
            <ModalFooter> <Button variant="ghost" mr={3} onClick={onClearConfirmClose} isDisabled={isClearingDraft}> Cancel </Button> <Button colorScheme="red" onClick={handleClearDraft} isLoading={isClearingDraft} loadingText="Clearing..."> Confirm Clear </Button> </ModalFooter>
          </ModalContent>
        </Modal>

      {/* --- ADD View Trips Modal --- */}
      <Modal 
        isOpen={isViewTripsModalOpen} 
        onClose={handleModalClose}
        size="2xl" 
        isCentered
        scrollBehavior="inside"
      >
        <ModalOverlay bg="blackAlpha.300"/>
        <ModalContent borderRadius="lg"> 
          <ModalHeader 
            bg={primaryColor} 
            color="white" 
            borderTopRadius="lg" 
            borderBottomWidth="1px"
            borderColor={primaryColor} 
            fontSize="lg" 
            fontWeight="medium" 
          >
            Trips for {selectedEmployeeTrips?.name || 'Employee'} ({formatDateRange(periodStartDate, periodEndDate)})
          </ModalHeader> 
          <ModalCloseButton color="white" onClick={handleModalClose} />
          <ModalBody py={5} px={6}> 
            <Box 
              borderWidth="1px" 
              borderRadius="md" 
              borderColor={useColorModeValue("gray.200", "gray.600")} 
              overflow="hidden"
            >
              <TableContainer>
                {/* Main Table: Show if not viewing a specific trip */}
                {!viewingTripId && (
                  <Table variant="simple" size="sm" colorScheme="blue"> 
                    <Thead bg={secondaryColor}>
                      <Tr>
                        <Th color="white">TRIP ID</Th>
                        <Th color="white">Trips</Th>
                        <Th isNumeric color="white">Total Rate</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {/* Group fetchedTripDetails by tripID */}
                      {(() => {
                        const tripGroups = {};
                        fetchedTripDetails.forEach(detail => {
                          if (!tripGroups[detail.tripID]) tripGroups[detail.tripID] = [];
                          tripGroups[detail.tripID].push(detail);
                        });
                        return Object.entries(tripGroups).map(([tripID, waybills]) => {
                          const totalRate = waybills.reduce((sum, wb) => sum + (editedTripRates[wb.waybillNumber] !== undefined ? parseFloat(editedTripRates[wb.waybillNumber]) || 0 : 0), 0);
                          return (
                            <Tr key={tripID}>
                              <Td>{tripID}</Td>
                              <Td>
                                <Button size="xs" onClick={() => setViewingTripId(tripID)}>
                                  View Trips
                                </Button>
                              </Td>
                              <Td isNumeric>{pesoFormatter.format(totalRate)}</Td>
                            </Tr>
                          );
                        });
                      })()}
                    </Tbody>
                  </Table>
                )}
                {/* Waybill Table: Show if viewing a specific trip */}
                {viewingTripId && (
                  <>
                    <Button mb={3} size="sm" onClick={() => setViewingTripId(null)} colorScheme="gray">Back</Button>
                    <Table variant="simple" size="sm" colorScheme="blue">
                      <Thead bg={secondaryColor}>
                        <Tr>
                          <Th color="white">Waybill Number</Th>
                          <Th color="white">Destination</Th>
                          <Th isNumeric color="white">Billing Rate</Th>
                          <Th isNumeric color="white">Rate</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {fetchedTripDetails.filter(wb => wb.tripID === viewingTripId).map(wb => (
                          <Tr key={wb.waybillNumber}>
                            <Td>{wb.waybillNumber}</Td>
                            <Td>{wb.destination || 'N/A'}</Td>
                            <Td isNumeric>{pesoFormatter.format(wb.billingRate || 0)}</Td>
                            <Td isNumeric>
                              <Editable
                                key={`${wb.waybillNumber}-rate-${editedTripRates[wb.waybillNumber]}`}
                                defaultValue={(editedTripRates[wb.waybillNumber] !== undefined ? editedTripRates[wb.waybillNumber] : 0).toString()}
                                isPreviewFocusable={true}
                                onSubmit={(nextValue) => {
                                  const numericValue = parseFloat(String(nextValue).replace(/[^\d.-]/g, '')) || 0; 
                                  setEditedTripRates(prev => ({
                                    ...prev,
                                    [wb.waybillNumber]: numericValue 
                                  }));
                                }}
                                fontSize="xs"
                                w="full"
                              >
                                <Tooltip label="Manually enter rate for this trip" placement="top">
                                  <EditablePreview 
                                    px={1} 
                                    py={0.5} 
                                    w="full" 
                                    _hover={{ bg: 'gray.100' }} 
                                    cursor="text"
                                  >
                                    {pesoFormatter.format(editedTripRates[wb.waybillNumber] !== undefined ? editedTripRates[wb.waybillNumber] : 0)}
                                  </EditablePreview>
                                </Tooltip>
                                <EditableInput 
                                  type="number"
                                  step="0.01"
                                  textAlign="right"
                                  px={1} 
                                  py={0.5} 
                                  size="xs"
                                  onFocus={(e) => e.target.select()}
                                />
                              </Editable>
                            </Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  </>
                )}
              </TableContainer>
            </Box>
          </ModalBody>
          <ModalFooter 
            borderTopWidth="1px" 
            borderColor={useColorModeValue("gray.200", "gray.600")} 
          >
            <Button 
              colorScheme="green"
              mr={3}
              onClick={handleSaveRates}
              isLoading={isSavingRates}
              isDisabled={isFetchingTrips}
            >
              Save Rates
            </Button>
            <Button 
              bg={secondaryColor} 
              color="white" 
              _hover={{ bg: "blue.700" }} 
              onClick={handleModalClose}
            >
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

    </MotionBox>
  );
};

// --- UPDATE EXPORT ---
export default PayrollPerTripCargo; 
