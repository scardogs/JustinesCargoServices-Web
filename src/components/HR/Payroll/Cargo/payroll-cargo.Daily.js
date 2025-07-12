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
  Tfoot,
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
  Skeleton,
  Spinner,
  Alert,
  AlertIcon,
  Switch,
  IconButton,
  PopoverHeader,
  PopoverCloseButton,
  PopoverFooter,
} from "@chakra-ui/react";
import { SearchIcon, DownloadIcon, SettingsIcon } from "@chakra-ui/icons";
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

const PayrollDailyCargo = () => { // Renamed component for specificity
  const [searchQuery, setSearchQuery] = useState("");
  const [payrollData, setPayrollData] = useState([]);
  const [isLoading, setIsLoading] = useState(false); // Loading state for initial load & report generation
  const [isSaving, setIsSaving] = useState(false); // Saving state for CREATE REPORT button only
  const [error, setError] = useState(null); // Error state for initial load / main errors
  const toast = useToast();

  // State for Date Range Modal
  const { isOpen: isDateModalOpen, onOpen: onDateModalOpen, onClose: onDateModalClose } = useDisclosure();
  
  // State for Confirmation Modal for Clearing Drafts
  const { isOpen: isClearConfirmOpen, onOpen: onClearConfirmOpen, onClose: onClearConfirmClose } = useDisclosure();
  
  // State for the selected period range (like chargesComp)
  const [periodStartDate, setPeriodStartDate] = useState(getFirstDayOfMonth(new Date())); // Default start of current month
  const [periodEndDate, setPeriodEndDate] = useState(getLastDayOfMonth(new Date())); // Default end of current month

  // Temp dates for modal
  const [tempStartDate, setTempStartDate] = useState(periodStartDate);
  const [tempEndDate, setTempEndDate] = useState(periodEndDate);

  // Color scheme constants
  const primaryColor = "#800020"; // Maroon
  const secondaryColor = "#1a365d"; // Dark Blue
  const accentColor = "#2b6cb0"; // Medium Blue
  const lightAccent = "#ebf8ff"; // Light Blue
  const lightMaroon = "#fff0f0"; // Light Maroon

  // Color scheme based on the image provided
  const headerBg = "white"; // Background for the main header area
  const earningsHeaderBg = "#ADD8E6"; // Light Blue for EARNINGS group header
  const deductionsHeaderBg = "#FFB6C1"; // Light Pink for DEDUCTIONS group header
  const netPayHeaderBg = "#FFFFE0"; // Light Yellow for NET PAY header
  
  // Background colors for data columns within groups
  const earningsColBg = "#ADD8E6"; // Lighter Blue for earnings columns (adjust if needed)
  const deductionsColBg = "FFB6C1"; // Lighter Pink for deductions columns (adjust if needed)
  const netPayColBg = "#FFFACD"; // Lighter Yellow for net pay column (adjust if needed)

  // Format date range for display (like chargesComp)
  const formatDateRange = (start, end) => {
      if (!start || !end) return "Not Selected";
      try {
          const startDate = parseISO(start); // Use parseISO for string dates
          const endDate = parseISO(end);
          const startFormat = 'MMM d';
          // Show year on end date only if different from start date year
          const endFormat = startDate.getFullYear() === endDate.getFullYear() ? 'MMM d, yyyy' : 'MMM d, yyyy'; 
          return `${format(startDate, startFormat)} - ${format(endDate, endFormat)}`;
      } catch (e) {
          console.error("Date formatting error:", e);
          return "Invalid Date";
      }
  };

  // Format date for display YYYY-MM-DD
  const formatDateForDisplay = (dateString) => {
      if (!dateString) return '';
      try {
          // Assuming dateString is already in 'YYYY-MM-DD' or a format parseISO understands
          return format(parseISO(dateString), 'yyyy-MM-dd');
      } catch (e) {
          console.error("Error formatting date for display:", e);
          return 'Invalid Date';
      }
  };

  // Add state to store SSS contribution ranges
  const [sssContributions, setSssContributions] = useState([]);
  const [loadingSSS, setLoadingSSS] = useState(false);
  const [sssError, setSssError] = useState(null);

  // Add state for Philhealth contributions
  const [philhealthContributions, setPhilhealthContributions] = useState([]);
  const [loadingPhilhealth, setLoadingPhilhealth] = useState(false);
  const [philhealthError, setPhilhealthError] = useState(null);

  // Add state for Pag-IBIG contributions
  const [pagibigContributions, setPagibigContributions] = useState([]);
  const [loadingPagibig, setLoadingPagibig] = useState(false);
  const [pagibigError, setPagibigError] = useState(null);

  // Add state for Charges data
  const [chargesDataMap, setChargesDataMap] = useState({});
  const [loadingCharges, setLoadingCharges] = useState(false);
  const [chargesError, setChargesError] = useState(null);

  // Add state for Leave data
  const [leaveDataMap, setLeaveDataMap] = useState({});
  const [loadingLeave, setLoadingLeave] = useState(false);
  const [leaveError, setLeaveError] = useState(null);

  // Draft specific states
  const [draftError, setDraftError] = useState(null);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isClearingDraft, setIsClearingDraft] = useState(false); // Loading state for Clear Draft

  // Ref to store the function to reload data
  const loadDataRef = useRef(null);

  // --- ADDED: State for Report Row Selection ---
  const [selectedReportRows, setSelectedReportRows] = useState([]);

  // --- ADDED: State for Column Visibility ---
  const [columnVisibility, setColumnVisibility] = useState({
      checkbox: true, // ADDED: New checkbox column
      paymentType: true, // Added Payment Type
      startDate: true,
      endDate: true,
      employeeId: true,
      name: true,
      dailyWage: true, // Daily specific
      regularDaysWorked: true,
      basicPayForPeriod: true, // Daily specific
      earningsAdjustment: true,
      overTime: true,
      holidayPay: true,
      silPay: true,
      thirteenthMonth: true,
      totalGrossPay: true,
      deductionsAdjustment: true,
      sss: true,
      philhealth: true,
      pagibig: true,
      caCharges: true,
      withholdingTax: true,
      totalDeductions: true,
      netPay: true,
      // Actions column is kept always visible
  });

  // --- ADDED: State for Applying 13th Month Pay ---
  const [applying13thMonth, setApplying13thMonth] = useState({});

  // Utility function to find SSS contribution based on totalGrossPay
  const findSssContribution = (totalGrossPay) => {
    // First check if sssContributions exists and is an array
    if (!sssContributions || !Array.isArray(sssContributions) || sssContributions.length === 0) {
      console.log('No valid SSS contribution data available');
      return 0; // Return 0 if no contribution ranges are available
    }

    try {
      // Find the appropriate range
      const matchingRange = sssContributions.find(range => 
        range && 
        typeof range.rangeStart !== 'undefined' && 
        typeof range.rangeEnd !== 'undefined' &&
        totalGrossPay >= parseFloat(range.rangeStart) && 
        totalGrossPay <= parseFloat(range.rangeEnd)
      );

      // Return the total contribution amount or 0 if no matching range
      return matchingRange && matchingRange.total ? parseFloat(matchingRange.total) : 0;
    } catch (error) {
      console.error('Error finding SSS contribution:', error);
      return 0; // Return 0 in case of error
    }
  };

  // Utility function to find Philhealth contribution based on EXACT monthlyWage match (New)
  const findPhilhealthContributionByExactMatch = (monthlyWage) => {
    if (!philhealthContributions || !Array.isArray(philhealthContributions) || philhealthContributions.length === 0) {
      console.log('No valid Philhealth contribution data available');
      return 0;
    }
    const wage = parseFloat(monthlyWage);
    if (isNaN(wage)) {
      return 0;
    }

    try {
      // Find an exact match for monthlyBasicSalary
      const matchingBracket = philhealthContributions.find(bracket =>
        bracket && typeof bracket.monthlyBasicSalary !== 'undefined' && parseFloat(bracket.monthlyBasicSalary) === wage
      );

      // Return the employee share if a match is found, otherwise 0
      return matchingBracket && typeof matchingBracket.employeeShare !== 'undefined' ? parseFloat(matchingBracket.employeeShare) : 0;
    } catch (error) {
      console.error('Error finding Philhealth contribution by exact match:', error);
      return 0;
    }
  };

  // Utility function to find Pag-IBIG contribution based on Monthly Wage (New)
  const findPagibigContribution = (monthlyWage) => {
    if (!pagibigContributions || !Array.isArray(pagibigContributions) || pagibigContributions.length === 0) {
      console.log('No valid Pag-IBIG contribution data available');
      return 0;
    }
    const wage = parseFloat(monthlyWage);
    if (isNaN(wage)) {
      return 0;
    }

    // Define the Pag-IBIG maximum contribution
    const MAX_PAGIBIG_CONTRIBUTION = 100;

    try {
      // Find the bracket where the monthly wage falls within the range
      const bracket = pagibigContributions.find(b =>
        b &&
        typeof b.rangeStart !== 'undefined' &&
        typeof b.rangeEnd !== 'undefined' &&
        wage >= parseFloat(b.rangeStart) &&
        wage <= parseFloat(b.rangeEnd)
      );

      let employeeSharePercentage = 0;
      if (bracket && typeof bracket.employeeShare !== 'undefined') {
        employeeSharePercentage = parseFloat(bracket.employeeShare);
      } else {
        // If wage is above the highest range, use the rate from the highest bracket
        const highestBracket = pagibigContributions.reduce((max, b) => (!max || b.rangeEnd > max.rangeEnd ? b : max), null);
        if (highestBracket && typeof highestBracket.employeeShare !== 'undefined') {
           employeeSharePercentage = parseFloat(highestBracket.employeeShare);
        }
      }

      if (isNaN(employeeSharePercentage)) return 0;

      // Calculate the contribution: Monthly Wage * Employee Share %
      const calculatedContribution = wage * (employeeSharePercentage / 100);

      // Apply the maximum contribution limit (typically PHP 100)
      return Math.min(calculatedContribution, MAX_PAGIBIG_CONTRIBUTION);

    } catch (error) {
      console.error('Error finding Pag-IBIG contribution:', error);
      return 0;
    }
  };

  // Calculate payroll for a single record - uses record.caCharges from state
  const calculatePayroll = (record) => {
    const dailyWage = parseFloat(record.dailyWage) || 0; // Use dailyWage
    const regularDaysWorked = parseFloat(record.regularDaysWorked) || 0;
    const earningsAdjustment = parseFloat(record.earningsAdjustment) || 0;
    const overTime = parseFloat(record.overTime) || 0;
    const holidayPay = parseFloat(record.holidayPay) || 0;
    const silPay = parseFloat(record.silPay) || 0; // Use silPay value from the record state
    const thirteenthMonth = parseFloat(record.thirteenthMonth) || 0;

    // Other Deductions (get caCharges from the record state)
    const caCharges = parseFloat(record.caCharges) || 0; // Use value from state
    const deductionsAdjustment = parseFloat(record.deductionsAdjustment) || 0;
    const withholdingTax = parseFloat(record.withholdingTax) || 0;

    // --- Calculations ---
    const effectiveDailyRate = dailyWage; // For daily, the wage IS the rate
    const basicPayForPeriod = effectiveDailyRate * regularDaysWorked; // Renamed variable

    const totalGrossPay = basicPayForPeriod + earningsAdjustment + overTime + holidayPay + silPay + thirteenthMonth;

    // Calculate SSS, Philhealth, Pagibig ONLY if override is OFF
    let sss = record.sss || 0;
    let philhealth = record.philhealth || 0;
    let pagibig = record.pagibig || 0;

    if (!record.isOverride) {
      sss = findSssContribution(totalGrossPay); // SSS is based on Gross Pay
      // Philhealth/Pagibig might need adjustment for daily context, using daily wage for now
      philhealth = findPhilhealthContributionByExactMatch(dailyWage); 
      pagibig = findPagibigContribution(dailyWage);
      // Note: caCharges and silPay are handled during load based on override,
      // so we use the values passed in the record here.
    }

    // Use the potentially overridden caCharges and silPay from the record
    const currentCaCharges = record.caCharges || 0;
    const currentSilPay = record.silPay || 0; 

    const totalDeductions = 
        sss + 
        philhealth + 
        pagibig + 
        currentCaCharges + 
        deductionsAdjustment + 
        withholdingTax;
    
    const netPay = totalGrossPay - totalDeductions;

    return {
      ...record, // Keep all fields, including potentially overridden values
      dailyWage: record.dailyWage || 0, // Ensure dailyWage is returned
      basicPayForPeriod, // Return the calculated basic pay
      totalGrossPay,
      sss, // Use the final determined sss value
      philhealth, // Use the final determined philhealth value
      pagibig, // Use the final determined pagibig value
      caCharges: currentCaCharges, // Ensure the correct caCharges is returned
      silPay: currentSilPay, // Ensure the correct silPay is returned
      totalDeductions,
      netPay,
      // Ensure isOverride flag is preserved
      isOverride: record.isOverride || false 
    };
  };

  // Handle field update - No auto-save
  const handleFieldUpdate = (employeeId, field, value) => {
    let updatedData = []; // To capture the data *after* state update
    setPayrollData((prevData) => {
      updatedData = prevData.map((record) => { // Calculate updated data
        if (record.employeeId === employeeId) {
          const allowNegative = field === 'earningsAdjustment' || field === 'deductionsAdjustment';
          let numericValue;
          let displayValue = value;

          if (allowNegative) {
              const cleanedValue = value.toString().replace(/[^\d.-]/g, ''); 
              numericValue = (cleanedValue === '' || cleanedValue === '-') ? 0 : parseFloat(cleanedValue);
              displayValue = (cleanedValue === '' || cleanedValue === '-') ? value : cleanedValue; 
              if (cleanedValue === '.') {
                  numericValue = 0;
                  displayValue = '.';
              }
          } else {
              const cleanedValue = value.toString().replace(/[^\d.]/g, ''); 
              const parts = cleanedValue.split('.');
              let validatedValue = cleanedValue;
              if (parts.length > 2) {
                  validatedValue = `${parts[0]}.${parts.slice(1).join('')}`;
              }
              numericValue = (validatedValue === '' || validatedValue === '.') ? 0 : parseFloat(validatedValue);
              numericValue = numericValue < 0 ? 0 : numericValue; 
              displayValue = validatedValue; 
          }
          
          const updatedRecordForState = { ...record, [field]: displayValue };
          return calculatePayroll({...updatedRecordForState, [field]: numericValue}); 
        }
        return record;
      });
      return updatedData; // Return the calculated data
    });

    // Auto-save removed as requested
  };

  // Handle applying the date range from the modal
  const handleApplyDateRange = () => {
    if (!tempStartDate || !tempEndDate) {
      toast({
        title: "Incomplete Date Range",
        description: "Please select both a start and end date.",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      if (new Date(tempEndDate) < new Date(tempStartDate)) {
        toast({
            title: "Invalid Date Range",
            description: "End date cannot be before the start date.",
            status: "warning",
            duration: 3000,
            isClosable: true,
        });
        return;
      }

      // Update the main period state variables
      setPeriodStartDate(tempStartDate);
      setPeriodEndDate(tempEndDate);
      onDateModalClose(); // Close the modal

    } catch (error) {
       console.error("Error applying date range:", error);
      toast({
        title: "Date Error",
        description: "Could not apply the selected dates.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  // Function to load data (will be assigned to ref)
  const loadDataForPeriod = useCallback(async () => {
      setIsLoading(true);
      setError(null);
      setDraftError(null);
      setPayrollData([]);

      // Fetch Contributions/Charges/Leave Concurrently
      setLoadingSSS(true); setSssError(null);
      setLoadingPhilhealth(true); setPhilhealthError(null);
      setLoadingPagibig(true); setPagibigError(null);
      setLoadingCharges(true); setChargesError(null);
      setLoadingLeave(true); setLeaveError(null);

      const token = localStorage.getItem("token");
      if (!token) {
          setError("Authentication token not found. Please log in.");
          setIsLoading(false);
          setLoadingSSS(false); setLoadingPhilhealth(false); setLoadingPagibig(false);
          setLoadingCharges(false); setLoadingLeave(false);
          return;
      }
      if (!periodStartDate || !periodEndDate) {
          setError("Invalid Period selected.");
          setIsLoading(false);
          setLoadingSSS(false); setLoadingPhilhealth(false); setLoadingPagibig(false);
          setLoadingCharges(false); setLoadingLeave(false);
          return;
      }

      let fetchedDrafts = [];
      let fetchDraftError = null;
      let localChargesMap = {};
      let localLeaveMap = {};

      try {
          const [sssResponse, philhealthResponse, pagibigResponse, chargesResponse, leaveResponse, draftResponse] = await Promise.all([
              axios.get(`${process.env.NEXT_PUBLIC_BACKEND_API}/api/sss-contributions`, { headers: { Authorization: `Bearer ${token}` } }),
              axios.get(`${process.env.NEXT_PUBLIC_BACKEND_API}/api/philhealth-contributions`, { headers: { Authorization: `Bearer ${token}` } }),
              axios.get(`${process.env.NEXT_PUBLIC_BACKEND_API}/api/pagibig-contributions`, { headers: { Authorization: `Bearer ${token}` } }),
              axios.get(`${process.env.NEXT_PUBLIC_BACKEND_API}/api/charges`, { params: { periodEndDate: periodEndDate }, headers: { Authorization: `Bearer ${token}` } }).then(res => {
                const map = (res.data || []).reduce((map, charge) => { if (charge.employeeId) map[charge.employeeId] = charge.totalCharges || 0; return map; }, {});
                setChargesDataMap(map);
                return res;
            }),
              axios.get(`${process.env.NEXT_PUBLIC_BACKEND_API}/api/leave`, { params: { periodEndDate: periodEndDate }, headers: { Authorization: `Bearer ${token}` } }).then(res => {
                const map = (res.data || []).reduce((map, leave) => { if (leave.EmpID?._id) map[leave.EmpID._id.toString()] = leave.leavePay || 0; else if (leave.EmpID && typeof leave.EmpID === 'string') map[leave.EmpID] = leave.leavePay || 0; return map; }, {});
                setLeaveDataMap(map);
                return res;
            }),
              // Fetch Daily Drafts
              axios.get(`${process.env.NEXT_PUBLIC_BACKEND_API}/api/payroll/daily-cargo`, { // <-- Use daily endpoint
                  params: { startDate: periodStartDate, endDate: periodEndDate },
                  headers: { Authorization: `Bearer ${token}` },
              }).catch(err => {
                  console.error("Daily Draft fetch failed:", err);
                  fetchDraftError = err.response?.data?.message || err.message || "Failed to load saved daily drafts.";
                  return { data: [] };
              })
          ]);

          // Process Contributions/Charges/Leave
          try { setSssContributions(sssResponse.data?.data || []); } catch (e) { setSssError('Failed to load SSS'); } finally { setLoadingSSS(false); }
          try { setPhilhealthContributions(philhealthResponse.data?.data || []); } catch (e) { setPhilhealthError('Failed to load Philhealth'); } finally { setLoadingPhilhealth(false); }
          try { setPagibigContributions(pagibigResponse.data?.data || []); } catch (e) { setPagibigError('Failed to load Pag-IBIG'); } finally { setLoadingPagibig(false); }
          // Use stored maps
          localChargesMap = chargesDataMap;
          localLeaveMap = leaveDataMap;
          setLoadingCharges(false);
          setLoadingLeave(false);

          fetchedDrafts = draftResponse.data || [];
          console.log(`Fetched ${fetchedDrafts.length} daily drafts.`);

      } catch (err) {
          console.error("Error loading auxiliary data for daily payroll:", err);
          setError(err.response?.data?.message || err.message || "Failed to load auxiliary daily payroll data.");
          setLoadingSSS(false); setLoadingPhilhealth(false); setLoadingPagibig(false);
          setLoadingCharges(false); setLoadingLeave(false);
      }

      // --- Decide whether to use daily drafts or initialize defaults ---
      if (fetchedDrafts.length > 0) {
          console.log("Using loaded daily drafts.");
          const processedDrafts = fetchedDrafts.map(draft => {
              const useCalculated = !draft.isOverride;
              const chargeAmount = chargesDataMap[draft.employeeId] || 0;
              const leavePayAmount = leaveDataMap[draft.employee?._id?.toString()] || 0;
              let record = { ...draft };

              if (useCalculated) {
                  record.sss = findSssContribution(record.totalGrossPay);
                  record.philhealth = findPhilhealthContributionByExactMatch(record.dailyWage); // Use dailyWage
                  record.pagibig = findPagibigContribution(record.dailyWage); // Use dailyWage
                  record.caCharges = chargeAmount;
                  record.silPay = leavePayAmount;
              }
              return calculatePayroll(record);
          });
          setPayrollData(processedDrafts);
          if (!fetchDraftError) setError(null);
      } else {
          console.log("No daily drafts found. Initializing from employee list.");
          if (fetchDraftError) setError(fetchDraftError);
          else setError(null);

          try {
              const employeeResponse = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_API}/api/employees/personal`, {
                  headers: { Authorization: `Bearer ${token}` }
              });
              const dailyEmployees = (employeeResponse.data || []).filter(
                  (emp) => emp.salaryCategory === "Daily" && emp.dateSeparated === null && emp.Department === "Justine's Cargo"
              );

              const initialData = dailyEmployees.map(emp => {
                  const empId = emp.empID || "N/A";
                  const chargeAmount = chargesDataMap[empId] || 0;
                  const leavePayAmount = leaveDataMap[emp._id?.toString()] || 0;
                  const record = {
                      isOverride: false,
                      employee: emp,
                      employeeId: empId,
                      name: `${emp.lastName || ""}, ${emp.firstName || ""} ${emp.middleName ? emp.middleName.charAt(0) + "." : ""}`.trim(),
                      paymentType: emp.payMethod || "N/A", // Added paymentType from payMethod
                      startDate: periodStartDate,
                      endDate: periodEndDate,
                      dailyWage: emp.wage ?? 0, // Use dailyWage
                      regularDaysWorked: 0,
                      earningsAdjustment: 0,
                      overTime: 0,
                      holidayPay: 0,
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
              console.error("Error fetching employees for daily initialization:", empError);
              setError(empError.response?.data?.message || empError.message || "Failed to fetch employee data.");
          }
      }

      setIsLoading(false);
  }, [periodStartDate, periodEndDate, chargesDataMap, leaveDataMap]);

  // Assign the function to the ref
  useEffect(() => {
    loadDataRef.current = loadDataForPeriod;
  }, [loadDataForPeriod]);

  // Main useEffect to load data
  useEffect(() => {
      if (loadDataRef.current) {
          loadDataRef.current();
      }
  }, [periodStartDate, periodEndDate]);

  // Filtered data based on search query
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

   // Calculate Totals
   const totals = useMemo(() => {
    return filteredPayrollData.reduce(
      (acc, record) => {
        acc.dailyWage += parseFloat(record.dailyWage) || 0; // Changed from monthlyWage
        acc.regularDaysWorked += parseFloat(record.regularDaysWorked) || 0;
        acc.basicPayForPeriod += parseFloat(record.basicPayForPeriod) || 0; // Add basicPayForPeriod total
        acc.earningsAdjustment += parseFloat(record.earningsAdjustment) || 0;
        acc.overTime += parseFloat(record.overTime) || 0;
        acc.holidayPay += parseFloat(record.holidayPay) || 0;
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
      {
        dailyWage: 0, // Changed from monthlyWage
        regularDaysWorked: 0,
        basicPayForPeriod: 0, // Add basicPayForPeriod total init
        grossPay: 0, // Keep grossPay here? - Let's remove it if basicPayForPeriod replaces it in display
        earningsAdjustment: 0,
        overTime: 0,
        holidayPay: 0,
        silPay: 0,
        thirteenthMonth: 0,
        totalGrossPay: 0,
        sss: 0,
        philhealth: 0,
        pagibig: 0,
        caCharges: 0,
        deductionsAdjustment: 0,
        withholdingTax: 0,
        totalDeductions: 0,
        netPay: 0,
      }
    );
  }, [filteredPayrollData]);

  // Toggle Override Handler
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
                      // 1. Recalculate Gov Contribs
                      // Use the existing dailyWage and totalGrossPay from the record for calculation
                      updatedRecord.sss = findSssContribution(record.totalGrossPay);
                      updatedRecord.philhealth = findPhilhealthContributionByExactMatch(record.dailyWage);
                      updatedRecord.pagibig = findPagibigContribution(record.dailyWage);
                      
                      // 2. Refetch Charges and SIL Pay from stored maps
                      updatedRecord.caCharges = chargesDataMap[employeeId] || 0;
                      // Use employee._id if available, otherwise fallback might be needed depending on leaveDataMap structure
                      const employeeObjectId = record.employee?._id?.toString();
                      updatedRecord.silPay = employeeObjectId ? (leaveDataMap[employeeObjectId] || 0) : 0; 

                      // 3. Recalculate totals using the updated record
                      return calculatePayroll(updatedRecord);
                  } else {
                       // If switching override ON, just keep the current values (which might be manual)
                       // calculatePayroll will respect the isOverride flag and not overwrite them further
                      return calculatePayroll(updatedRecord); // Still run calculatePayroll to ensure totals are consistent
                  }
              } else {
                  return record;
              }
          });
          return updatedData;
      });

      // Trigger an immediate save after toggling the override flag
      const token = localStorage.getItem("token");
      debouncedSaveDraft(updatedData, token, periodStartDate, periodEndDate);
      
      // Update toast message
      const newState = updatedData.find(r => r.employeeId === employeeId)?.isOverride;
      toast({ 
          title: `Override ${newState ? 'Enabled' : 'Disabled'}`, 
          description: `Manual entries ${newState ? 'active' : 'inactive'}. ${!newState ? 'Calculated/Fetched values restored.' : 'Saved values kept.'}`,
          status: newState ? "warning" : "info", 
          duration: 4000, 
          isClosable: true 
      });
  };

  // Explicit Save Changes Handler for Daily
  const handleSaveChanges = async () => {
    if (payrollData.length === 0) {
       toast({ title: "No Data", description: "Nothing to save.", status: "info"});
       return;
    }

    setIsSavingDraft(true);
    setDraftError(null);
    const token = localStorage.getItem("token");
    if (!token) {
      setDraftError("Authentication token not found.");
      setIsSavingDraft(false);
      toast({ title: "Authentication Error", status: "error"});
      return;
    }

    const draftsWithDates = payrollData.map(d => ({ ...d, startDate: periodStartDate, endDate: periodEndDate }));

    console.log("Explicitly saving daily drafts:", draftsWithDates);
     try {
       const response = await axios.put(
         `${process.env.NEXT_PUBLIC_BACKEND_API}/api/payroll/daily-cargo/bulk-upsert`, // <-- Use daily endpoint
         draftsWithDates,
         { headers: { Authorization: `Bearer ${token}` } }
       );
       toast({
         title: "Changes Saved Successfully",
         description: `Daily draft updated/created.`, // Simplified message
         status: "success",
         duration: 3000,
         isClosable: true,
       });
     } catch (err) {
         console.error("Save daily changes error:", err);
         const errorMsg = err.response?.data?.message || err.message || "Failed to save daily changes.";
         setDraftError(errorMsg);
         toast({ title: 'Error Saving Daily Changes', description: errorMsg, status: 'error', duration: 4000, isClosable: true });
     } finally {
       setIsSavingDraft(false);
     }
  };

  // Clear Daily Draft Handler
  const handleClearDraft = async () => {
    setIsClearingDraft(true);
    setDraftError(null);
    const token = localStorage.getItem("token");
    if (!token) {
      setDraftError("Authentication token not found.");
      setIsClearingDraft(false);
      toast({ title: "Authentication Error", status: "error" });
      onClearConfirmClose();
      return;
    }

    try {
      const response = await axios.delete(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/payroll/daily-cargo/clear-drafts`, // <-- Use daily endpoint
        {
          params: { startDate: periodStartDate, endDate: periodEndDate },
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      toast({
        title: "Daily Draft Cleared",
        description: response.data.message || "Daily draft data cleared.",
        status: "success",
        duration: 4000,
        isClosable: true,
      });

      // Reload data
      if (loadDataRef.current) {
        loadDataRef.current();
      }

    } catch (err) {
      console.error("Clear daily draft error:", err);
      const errorMsg = err.response?.data?.message || err.message || "Failed to clear daily draft.";
      setDraftError(errorMsg);
      toast({ title: 'Error Clearing Daily Draft', description: errorMsg, status: 'error', duration: 5000, isClosable: true });
    } finally {
      setIsClearingDraft(false);
      onClearConfirmClose();
    }
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

  // --- ADDED: handleCreateReport Function for Daily --- 
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
      payrollData: dataForReport, // Use filtered data
      startDate: periodStartDate,
      endDate: periodEndDate
    };
    console.log("Creating Daily Payroll Report with data:", reportPayload);
    try {
      const response = await axios.post(
        // --- UPDATE API ENDPOINT for DAILY reports --- 
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/reports/payroll/daily-cargo`,
        reportPayload,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast({
        title: "Daily Report Generated Successfully",
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
      console.error("Error generating daily payroll report:", err);
      const errorMessage = err.response?.data?.message || err.message || "Failed to generate daily report.";
      setError(errorMessage);
      toast({
        title: "Error Generating Daily Report",
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

  // --- ADDED: Handler for Column Visibility Toggle ---
  const handleColumnVisibilityChange = (columnKey) => {
      setColumnVisibility(prev => ({
          ...prev,
          [columnKey]: !prev[columnKey]
      }));
  };

  // --- ADDED: Helper to count visible columns in a group ---
  const countVisibleColumns = (groupKeys) => {
    return groupKeys.reduce((count, key) => count + (columnVisibility[key] ? 1 : 0), 0);
  };

  // --- ADDED: Calculate dynamic colSpans for Daily ---
  const visibleCoreColumns = countVisibleColumns(['paymentType', 'startDate', 'endDate', 'employeeId', 'name', 'dailyWage', 'regularDaysWorked', 'basicPayForPeriod']);
  const visibleEarningsColumns = countVisibleColumns(['earningsAdjustment', 'overTime', 'holidayPay', 'silPay', 'thirteenthMonth']);
  const visibleDeductionsColumns = countVisibleColumns(['deductionsAdjustment', 'sss', 'philhealth', 'pagibig', 'caCharges', 'withholdingTax']);
  const totalVisibleColumns =
      (columnVisibility.checkbox ? 1 : 0) +       // New Checkbox specific column
      visibleCoreColumns +
      visibleEarningsColumns +
      (columnVisibility.totalGrossPay ? 1 : 0) +
      visibleDeductionsColumns +
      (columnVisibility.totalDeductions ? 1 : 0) +
      (columnVisibility.netPay ? 1 : 0) +
      1; // Actions

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
      {/* Removed Header Section as it might be part of a parent layout */}
      {/* Removed Tabs wrapper as this component is now just the monthly content */}

      {/* Monthly Payroll Content */}
      <Box p={4}>
        {/* Search and Actions Bar */}
        <Flex direction="column" mb={6}>
          <Flex align="center" gap={3} wrap="wrap">
            {/* Moved Period Covered Display Here - Made Transparent */}
            <Box mr={4} p={2}> {/* Removed borderWidth and borderColor */}
              <VStack spacing={1} align="center">
                <Text fontSize="xs" fontWeight="semibold" color={secondaryColor} textTransform="uppercase">Period Covered</Text>
                <Text fontWeight="bold" fontSize="sm" textTransform="none" color={primaryColor}>{formatDateRange(periodStartDate, periodEndDate)}</Text>
                <Button size="xs" variant="outline" colorScheme="blue" onClick={onDateModalOpen} isDisabled={isLoading || isSaving}>Change Date</Button>
              </VStack>
            </Box>

             {/* Create Report Button (placeholder, needs daily report logic) */}
            <Button
              bg={primaryColor}
              color="white"
              size="md"
              borderRadius="lg"
              _hover={{ bg: "#600018", transform: "translateY(-1px)" }}
              _active={{ bg: "#500014" }}
              onClick={handleCreateReport} // Use the new function
              isLoading={isSaving} // Use isSaving for report generation
              isDisabled={isLoading || isSaving || isSavingDraft || isClearingDraft}
              display="flex"
              leftIcon={<FaFileAlt />}
             >
               Create Report
             </Button>

             {/* Save Changes Button */}
             <Button
                variant="solid"
                bg="green.500"
                color="white"
                size="md"
                borderRadius="lg"
                onClick={handleSaveChanges} // Calls updated daily save handler
                isLoading={isSavingDraft}
                isDisabled={isLoading || isSaving || isSavingDraft || isClearingDraft}
                _hover={{ bg: "green.600" }}
                _active={{ bg: "green.700" }}
            >
              Save Changes
            </Button>

            {/* Clear Draft Button */}
            <Button
                variant="outline"
                colorScheme="red"
                size="md"
                borderRadius="lg"
                onClick={onClearConfirmOpen} // Open confirmation modal
                isLoading={isClearingDraft}
                isDisabled={isLoading || isSaving || isSavingDraft || isClearingDraft || payrollData.length === 0}
                _hover={{ bg: "red.50" }}
            >
                Clear Draft
            </Button>

             {/* Search Input */}
            <InputGroup maxW="400px" ml="auto">
              <InputLeftElement pointerEvents="none">
                <SearchIcon color={primaryColor} />
              </InputLeftElement>
              <Input
                placeholder="Search by Name or Employee ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                borderRadius="lg"
                borderColor="gray.300"
                _hover={{ borderColor: primaryColor }}
                _focus={{
                  borderColor: primaryColor,
                  boxShadow: `0 0 0 1px ${primaryColor}`,
                }}
                size="md"
              />
            </InputGroup>

            {/* --- ADDED: Column Visibility Popover --- */}
            <Popover placement="bottom-start" isLazy>
              <PopoverTrigger>
                  <IconButton
                      icon={<SettingsIcon />}
                      aria-label="Show/Hide Columns"
                      variant="outline"
                      size="md"
                      colorScheme="gray"
                      ml={2} // Add some margin
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
            {/* --- END: Column Visibility Popover --- */}

          </Flex>
        </Flex>

         {/* Display Combined Main/Draft Errors + Specific Contribution Errors */}
         {(error || draftError || sssError || philhealthError || pagibigError || chargesError || leaveError) && (
           <Stack spacing={2} mb={4}>
             {error && <Alert status="error" borderRadius="md"><AlertIcon />{error}</Alert>}
             {draftError && <Alert status="warning" borderRadius="md"><AlertIcon />Auto-save issue: {draftError}</Alert>}
             {sssError && <Alert status="warning" size="sm" variant="subtle"><AlertIcon />{sssError}</Alert>}
             {philhealthError && <Alert status="warning" size="sm" variant="subtle"><AlertIcon />{philhealthError}</Alert>}
             {pagibigError && <Alert status="warning" size="sm" variant="subtle"><AlertIcon />{pagibigError}</Alert>}
             {chargesError && <Alert status="warning" size="sm" variant="subtle"><AlertIcon />{chargesError}</Alert>}
             {leaveError && <Alert status="warning" size="sm" variant="subtle"><AlertIcon />{leaveError}</Alert>}
           </Stack>
        )}

        {/* Table Container */}
        <Box
          borderWidth="1px"
          borderRadius="lg"
          borderColor="#E2E8F0"
          boxShadow="0px 2px 8px rgba(0, 0, 0, 0.06)"
          overflow="hidden"
        >
          <TableContainer maxHeight="calc(100vh - 450px)" overflowY="auto">
            <Table variant="simple" size="sm" className="payroll-table">
              {/* === THEAD (Adjusted for Period Covered move) === */}
              <Thead position="sticky" top={0} zIndex={1} bg={headerBg} boxShadow="sm">
                 {/* Row 1: Groups - Period Covered Th removed */}
                 <Tr>
                    {/* ADDED: New Th for Select All Checkbox Column */}
                    {columnVisibility.checkbox && (
                        <Th rowSpan={2} borderBottomWidth="2px" borderColor={secondaryColor} textAlign="center" verticalAlign="middle" px={1}>
                           <Checkbox
                               size="lg"
                               sx={{
                                 '.chakra-checkbox__control': { // Target the inner box
                                   borderColor: 'black',
                                   _hover: {
                                     borderColor: 'black' // Keep black on hover
                                   }
                                 }
                               }}
                               isChecked={
                                   filteredPayrollData.length > 0 && // Only check if there's data
                                   selectedReportRows.length === filteredPayrollData.length // All filtered rows selected
                               }
                               isIndeterminate={
                                   selectedReportRows.length > 0 &&
                                   selectedReportRows.length < filteredPayrollData.length // Some, but not all, filtered rows selected
                               }
                               onChange={handleSelectAllReport}
                           />
                        </Th>
                    )}
                    {/* Payment Type Column - Now starts the row */}
                    {columnVisibility.paymentType && <Th rowSpan={2} borderBottomWidth="2px" borderColor={secondaryColor} textAlign="center" verticalAlign="middle">Payment Type</Th>}
                    {columnVisibility.startDate && <Th rowSpan={2} borderBottomWidth="2px" borderColor={secondaryColor} textAlign="center" verticalAlign="middle">Start Date</Th>}
                    {columnVisibility.endDate && <Th rowSpan={2} borderBottomWidth="2px" borderColor={secondaryColor} textAlign="center" verticalAlign="middle">End Date</Th>}
                    {columnVisibility.employeeId && <Th rowSpan={2} borderBottomWidth="2px" borderColor={secondaryColor} textAlign="center" verticalAlign="middle">Employee ID</Th>}
                    {columnVisibility.name && <Th rowSpan={2} borderBottomWidth="2px" borderColor={secondaryColor} textAlign="center" verticalAlign="middle">Name</Th>}
                    {columnVisibility.dailyWage && <Th rowSpan={2} borderBottomWidth="2px" borderColor={secondaryColor} textAlign="center" verticalAlign="middle">Daily Wage</Th>}
                    {columnVisibility.regularDaysWorked && <Th rowSpan={2} borderBottomWidth="2px" borderColor={secondaryColor} textAlign="center" verticalAlign="middle">Regular Days Worked</Th>}
                    {columnVisibility.basicPayForPeriod && <Th rowSpan={2} borderBottomWidth="2px" borderColor={secondaryColor} textAlign="center" verticalAlign="middle" bg={earningsHeaderBg}>Basic Pay</Th>}
                    
                    {visibleEarningsColumns > 0 && <Th colSpan={visibleEarningsColumns} borderBottomWidth="2px" borderColor={secondaryColor} textAlign="center" bg={earningsHeaderBg}>EARNINGS</Th>}
                    
                    {columnVisibility.totalGrossPay && <Th rowSpan={2} borderBottomWidth="2px" borderColor={secondaryColor} textAlign="center" verticalAlign="middle" bg={earningsColBg}>Total Gross Pay</Th>}
                    
                    {visibleDeductionsColumns > 0 && <Th colSpan={visibleDeductionsColumns} borderBottomWidth="2px" borderColor={secondaryColor} textAlign="center" bg={deductionsHeaderBg}>DEDUCTIONS</Th>}
                    
                    {columnVisibility.totalDeductions && <Th rowSpan={2} borderBottomWidth="2px" borderColor={secondaryColor} textAlign="center" verticalAlign="middle" bg={deductionsColBg}>Total Deductions</Th>}
                    {columnVisibility.netPay && <Th rowSpan={2} borderBottomWidth="2px" borderColor={secondaryColor} textAlign="center" verticalAlign="middle" bg={netPayHeaderBg}>Net Pay</Th>}
                    <Th rowSpan={2} borderBottomWidth="2px" borderColor={secondaryColor} textAlign="center" verticalAlign="middle">Actions</Th>
                 </Tr>
                 {/* Row 2: Specific Columns under groups - Placeholder THs removed */}
                 <Tr>
                    {/* Select All Checkbox - MOVED to the first Tr with rowSpan=2 */}
                    {/* Removed 4 empty TH cells that were placeholders */}

                    {/* Spanned by Start Date, End Date, Emp ID, Name, Wage, Days, Basic Pay */} 
                    {/* --- ADDED: Conditional Rendering for Specific Headers --- */} 
                    {/* Earnings */} 
                    {columnVisibility.earningsAdjustment && <Th borderBottomWidth="2px" borderColor={secondaryColor} bg={earningsHeaderBg}>Adjustment</Th>}
                    {columnVisibility.overTime && <Th borderBottomWidth="2px" borderColor={secondaryColor} bg={earningsHeaderBg}>Over Time</Th>}
                    {columnVisibility.holidayPay && <Th borderBottomWidth="2px" borderColor={secondaryColor} bg={earningsHeaderBg}>Holiday Pay</Th>}
                    {columnVisibility.silPay && <Th borderBottomWidth="2px" borderColor={secondaryColor} bg={earningsHeaderBg}>SIL Pay</Th>}
                    {columnVisibility.thirteenthMonth && <Th borderBottomWidth="2px" borderColor={secondaryColor} bg={earningsHeaderBg}>13th Month Pay</Th>}
                    {/* Spanned by Total Gross */} 
                    {/* Deductions */} 
                    {columnVisibility.deductionsAdjustment && <Th borderBottomWidth="2px" borderColor={secondaryColor} bg={deductionsHeaderBg}>Adjustment</Th>}
                    {columnVisibility.sss && <Th borderBottomWidth="2px" borderColor={secondaryColor} bg={deductionsHeaderBg}>SSS</Th>}
                    {columnVisibility.philhealth && <Th borderBottomWidth="2px" borderColor={secondaryColor} bg={deductionsHeaderBg}>Philhealth</Th>}
                    {columnVisibility.pagibig && <Th borderBottomWidth="2px" borderColor={secondaryColor} bg={deductionsHeaderBg}>Pag-IBIG</Th>}
                    {columnVisibility.caCharges && <Th borderBottomWidth="2px" borderColor={secondaryColor} bg={deductionsHeaderBg}>CA/Charges</Th>}
                    {columnVisibility.withholdingTax && <Th borderBottomWidth="2px" borderColor={secondaryColor} bg={deductionsHeaderBg}>W/holding Tax</Th>}
                    {/* Spanned by Total Deductions, Net Pay */} 
                 </Tr>
              </Thead>
              {/* === TBODY (Conditional Rendering for disabled look) === */}
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
                              {/* ADDED: New Td for Row Checkbox */}
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
                              {/* Removed three empty Td cells that were placeholders */}
                              
                              {columnVisibility.paymentType && <Td px={2} fontSize="xs" whiteSpace="nowrap">{record.paymentType}</Td>}
                              {columnVisibility.startDate && <Td px={2} fontSize="xs" whiteSpace="nowrap">{formatDateForDisplay(record.startDate)}</Td>}
                              {columnVisibility.endDate && <Td px={2} fontSize="xs" whiteSpace="nowrap">{formatDateForDisplay(record.endDate)}</Td>}
                              {columnVisibility.employeeId && <Td px={2} fontSize="xs">{record.employeeId}</Td>}
                              {columnVisibility.name && <Td px={2} fontSize="xs" whiteSpace="nowrap">{record.name}</Td>}
                              {columnVisibility.dailyWage && <Td px={2} isNumeric fontSize="xs"> <NumberInput size="xs" value={record.dailyWage} isReadOnly={!isSelected} precision={2} isDisabled={!isSelected}> <NumberInputField px={1} border="none" cursor={isSelected ? "default" : "not-allowed"}/> </NumberInput> </Td>}
                              {columnVisibility.regularDaysWorked && <Td px={1} isNumeric fontSize="xs"> <NumberInput size="xs" value={record.regularDaysWorked} onChange={(v) => isSelected && handleFieldUpdate(record.employeeId, 'regularDaysWorked', v)} min={0} precision={1} isDisabled={!isSelected}> <NumberInputField px={1} cursor={isSelected ? "text" : "not-allowed"}/> </NumberInput> </Td>}
                              {columnVisibility.basicPayForPeriod && <Td px={1} isNumeric fontSize="xs" bg={earningsColBg}>{pesoFormatter.format(record.basicPayForPeriod || 0)}</Td>}
                              
                              {columnVisibility.earningsAdjustment && <Td px={1} isNumeric fontSize="xs" bg={earningsColBg}> <NumberInput size="xs" value={record.earningsAdjustment} onChange={(v) => isSelected && handleFieldUpdate(record.employeeId, 'earningsAdjustment', v)} precision={2} isDisabled={!isSelected}> <NumberInputField px={1} bg="transparent" cursor={isSelected ? "text" : "not-allowed"}/> </NumberInput> </Td>}
                              {columnVisibility.overTime && <Td px={1} isNumeric fontSize="xs" bg={earningsColBg}> <NumberInput size="xs" value={record.overTime} onChange={(v) => isSelected && handleFieldUpdate(record.employeeId, 'overTime', v)} min={0} precision={2} isDisabled={!isSelected}> <NumberInputField px={1} bg="transparent" cursor={isSelected ? "text" : "not-allowed"}/> </NumberInput> </Td>}
                              {columnVisibility.holidayPay && <Td px={1} isNumeric fontSize="xs" bg={earningsColBg}> <NumberInput size="xs" value={record.holidayPay} onChange={(v) => isSelected && handleFieldUpdate(record.employeeId, 'holidayPay', v)} min={0} precision={2} isDisabled={!isSelected}> <NumberInputField px={1} bg="transparent" cursor={isSelected ? "text" : "not-allowed"}/> </NumberInput> </Td>}
                              {columnVisibility.silPay && <Td px={1} isNumeric fontSize="xs" bg={earningsColBg}>
                                 <NumberInput size="xs" value={record.silPay} isReadOnly={!isSelected} precision={2} isDisabled={!isSelected}>
                                    <NumberInputField 
                                        px={1} 
                                        bg="transparent" 
                                        border="none" 
                                        cursor={isSelected ? "default" : "not-allowed"}
                                        title={`Leave Pay from Leave module for period ending ${format(parseISO(periodEndDate), 'MMM d, yyyy')}`}
                                    />
                                 </NumberInput>
                               </Td>}
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
                              
                              {columnVisibility.deductionsAdjustment && <Td px={1} isNumeric fontSize="xs" bg={deductionsColBg}> <NumberInput size="xs" value={record.deductionsAdjustment} onChange={(v) => isSelected && handleFieldUpdate(record.employeeId, 'deductionsAdjustment', v)} precision={2} isDisabled={!isSelected}> <NumberInputField px={1} bg="transparent" cursor={isSelected ? "text" : "not-allowed"}/> </NumberInput> </Td>}
                              {columnVisibility.sss && <Td px={1} isNumeric fontSize="xs" bg={deductionsColBg}>
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
                               </Td>}
                              {columnVisibility.philhealth && <Td px={1} isNumeric fontSize="xs" bg={deductionsColBg}>
                                <Editable
                                    key={`ph-${record.employeeId}-${record.philhealth}`}
                                    defaultValue={pesoFormatter.format(record.philhealth || 0)}
                                    isPreviewFocusable={isSelected && record.isOverride}
                                    isDisabled={!isSelected || !record.isOverride}
                                    onSubmit={(nextValue) => isSelected && record.isOverride && handleFieldUpdate(record.employeeId, 'philhealth', nextValue)}
                                    fontSize="xs" w="full"
                                 >
                                     <Tooltip label={record.isOverride ? "Manual Entry (Override ON)" : `Calculated based on Daily Wage: ${pesoFormatter.format(record.dailyWage)}`} placement="top">
                                         <EditablePreview px={1} py={0.5} w="full" _hover={isSelected && record.isOverride ? { bg: 'gray.100' } : {}} cursor={isSelected && record.isOverride ? "text" : "not-allowed"}/>
                                     </Tooltip>
                                     <EditableInput type="number" step="0.01" min="0" px={1} py={0.5} size="xs" textAlign="right" isDisabled={!isSelected || !record.isOverride}/>
                                 </Editable>
                               </Td>}
                              {columnVisibility.pagibig && <Td px={1} isNumeric fontSize="xs" bg={deductionsColBg}>
                                 <Editable
                                    key={`pag-${record.employeeId}-${record.pagibig}`}
                                    defaultValue={pesoFormatter.format(record.pagibig || 0)}
                                    isPreviewFocusable={isSelected && record.isOverride}
                                    isDisabled={!isSelected || !record.isOverride}
                                    onSubmit={(nextValue) => isSelected && record.isOverride && handleFieldUpdate(record.employeeId, 'pagibig', nextValue)}
                                    fontSize="xs" w="full"
                                 >
                                     <Tooltip label={record.isOverride ? "Manual Entry (Override ON)" : `Calculated based on Daily Wage. ${findPagibigContribution(record.dailyWage) >= 100 ? 'Max PHP 100.00' : ''}`} placement="top">
                                        <EditablePreview px={1} py={0.5} w="full" _hover={isSelected && record.isOverride ? { bg: 'gray.100' } : {}} cursor={isSelected && record.isOverride ? "text" : "not-allowed"}/>
                                     </Tooltip>
                                      <EditableInput type="number" step="0.01" min="0" px={1} py={0.5} size="xs" textAlign="right" isDisabled={!isSelected || !record.isOverride}/>
                                 </Editable>
                               </Td>}
                              {columnVisibility.caCharges && <Td px={1} isNumeric fontSize="xs" bg={deductionsColBg}>
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
                               </Td>}
                              {columnVisibility.withholdingTax && <Td px={1} isNumeric fontSize="xs" bg={deductionsColBg}> <NumberInput size="xs" value={record.withholdingTax} onChange={(v) => isSelected && handleFieldUpdate(record.employeeId, 'withholdingTax', v)} min={0} precision={2} isDisabled={!isSelected}> <NumberInputField px={1} bg="transparent" cursor={isSelected ? "text" : "not-allowed"}/> </NumberInput> </Td>}
                              
                              {columnVisibility.totalDeductions && <Td px={2} isNumeric fontSize="xs" fontWeight="medium" bg={deductionsColBg}>{pesoFormatter.format(record.totalDeductions || 0)}</Td>}
                              {columnVisibility.netPay && <Td px={2} isNumeric fontSize="xs" fontWeight="bold" bg={netPayColBg}>{pesoFormatter.format(record.netPay || 0)}</Td>}
                              
                              <Td px={1} textAlign="center" style={{ pointerEvents: isSelected ? 'auto' : 'none' }}>
                                 <Button 
                                    size="xs" 
                                    onClick={() => handleToggleOverride(record.employeeId)}
                                    colorScheme={record.isOverride ? "orange" : "gray"}
                                    variant={record.isOverride ? "solid" : "outline"}
                                    title={record.isOverride ? "Disable Override" : "Enable Override"}
                                    isDisabled={!isSelected}
                                 >
                                     Override
                                 </Button>
                              </Td>
                          </MotionTr>
                          );
                      })
                  )}
              </Tbody>
               {/* === TFOOT (Applying Monthly Alignment Logic) === */}
               {!isLoading && !error && filteredPayrollData.length > 0 && (
                   <Tfoot bg="gray.100">
                       <Tr>
                           {/* --- UPDATED: Dynamic ColSpan for Totals Label --- */}
                           {columnVisibility.checkbox && <Th py={2}></Th>} {/* Empty cell for NEW checkbox column */}
                           <Th colSpan={visibleCoreColumns} textAlign="right" py={2}>TOTALS:</Th> 
                           {/* Conditionally render total cells */} 
                           {columnVisibility.dailyWage && <Th isNumeric py={2}>{pesoFormatter.format(totals.dailyWage)}</Th>}
                           {columnVisibility.regularDaysWorked && <Th isNumeric py={2}>{totals.regularDaysWorked}</Th>}
                           {columnVisibility.basicPayForPeriod && <Th isNumeric py={2} bg={earningsColBg}>{pesoFormatter.format(totals.basicPayForPeriod)}</Th>}
                           {columnVisibility.earningsAdjustment && <Th isNumeric py={2} bg={earningsColBg}>{pesoFormatter.format(totals.earningsAdjustment)}</Th>}
                           {columnVisibility.overTime && <Th isNumeric py={2} bg={earningsColBg}>{pesoFormatter.format(totals.overTime)}</Th>}
                           {columnVisibility.holidayPay && <Th isNumeric py={2} bg={earningsColBg}>{pesoFormatter.format(totals.holidayPay)}</Th>}
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
                       </Tr>
                   </Tfoot>
               )}
            </Table>
          </TableContainer>
        </Box>
      </Box>

       {/* Date Range Selection Modal */}
       <Modal isOpen={isDateModalOpen} onClose={onDateModalClose} isCentered>
          <ModalOverlay />
          <ModalContent>
           <ModalHeader>Set Payroll Period</ModalHeader>
            <ModalCloseButton />
           <ModalBody pb={6}>
             <FormControl mb={4}>
                  <FormLabel>Start Date</FormLabel>
               <Input
                 type="date"
                 value={tempStartDate}
                 onChange={(e) => setTempStartDate(e.target.value)}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>End Date</FormLabel>
               <Input
                 type="date"
                 value={tempEndDate}
                 onChange={(e) => setTempEndDate(e.target.value)}
                 min={tempStartDate} // Basic browser validation
                  />
                </FormControl>
            </ModalBody>

            <ModalFooter>
              <Button colorScheme="blue" mr={3} onClick={handleApplyDateRange}>
                Apply
              </Button>
             <Button variant="ghost" onClick={onDateModalClose}>Cancel</Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        {/* Clear Draft Confirmation Modal */}
        <Modal isOpen={isClearConfirmOpen} onClose={onClearConfirmClose} isCentered>
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>Confirm Clear Daily Draft</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              Are you sure you want to clear all unsaved daily draft data for the period <Text as="span" fontWeight="bold">{formatDateRange(periodStartDate, periodEndDate)}</Text>? This action cannot be undone.
            </ModalBody>
            <ModalFooter>
              <Button variant="ghost" mr={3} onClick={onClearConfirmClose} isDisabled={isClearingDraft}>
                Cancel
              </Button>
              <Button
                colorScheme="red"
                onClick={handleClearDraft} // Calls daily clear handler
                isLoading={isClearingDraft}
                loadingText="Clearing..."
              >
                Confirm Clear
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
    </MotionBox>
  );
};

export default PayrollDailyCargo; // Export the renamed component
