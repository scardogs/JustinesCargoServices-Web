import React, { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
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
  Tooltip,
  useToast,
  Stack,
  Spinner,
  Alert,
  AlertIcon,
  IconButton,
  Switch,
} from "@chakra-ui/react";
import {
  SearchIcon,
  DownloadIcon,
  CalendarIcon,
  ViewIcon,
} from "@chakra-ui/icons";
import { motion } from "framer-motion";
import { format, parseISO } from "date-fns";
import "react-datepicker/dist/react-datepicker.css";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useRouter } from 'next/router'; // <-- Add this import

const MotionBox = motion(Box);
const MotionTr = motion(Tr);

// Helper: Get first day of month (YYYY-MM-DD)
const getFirstDayOfMonth = (date) => {
  const d = new Date(date);
  return format(new Date(d.getFullYear(), d.getMonth(), 1), "yyyy-MM-dd");
};

// Helper: Get last day of month (YYYY-MM-DD)
const getLastDayOfMonth = (date) => {
  const d = new Date(date);
  return format(new Date(d.getFullYear(), d.getMonth() + 1, 0), "yyyy-MM-dd");
};

// Currency Formatter
const pesoFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
});

// Currency Formatter without symbol for Payslip
const numberFormatter = new Intl.NumberFormat("en-PH", {
  style: "decimal", // Use decimal style instead of currency
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const CargoMonthlyReportComp = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [payrollData, setPayrollData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const toast = useToast();

  // Add state for signatory names (Main Report PDF)
  const [hrSecretaryName, setHrSecretaryName] = useState("");
  const [hrSecretaryPosition, setHrSecretaryPosition] = useState(""); // Changed to empty string
  const [adminHeadName, setAdminHeadName] = useState("");
  const [adminHeadPosition, setAdminHeadPosition] = useState(""); // Changed to empty string
  const [coProprietorName, setCoProprietorName] = useState("");
  const [coProprietorPosition, setCoProprietorPosition] = useState(""); // Changed to empty string
  const [isSignatoryModalOpen, setIsSignatoryModalOpen] = useState(false);

  // State for Payslip Approver (Payslip PDF)
  const [payslipApproverName, setPayslipApproverName] = useState("");
  const [payslipApproverPosition, setPayslipApproverPosition] = useState("");
  const [isPayslipApproverModalOpen, setIsPayslipApproverModalOpen] = useState(false);

  const {
    isOpen: isDateModalOpen,
    onOpen: onDateModalOpen,
    onClose: onDateModalClose,
  } = useDisclosure();
  const [periodStartDate, setPeriodStartDate] = useState(
    getFirstDayOfMonth(new Date())
  );
  const [periodEndDate, setPeriodEndDate] = useState(
    getLastDayOfMonth(new Date())
  );
  const [tempStartDate, setTempStartDate] = useState(periodStartDate);
  const [tempEndDate, setTempEndDate] = useState(periodEndDate);

  // State for Details Modal
  const {
    isOpen: isDetailsModalOpen,
    onOpen: onDetailsModalOpen,
    onClose: onDetailsModalClose,
  } = useDisclosure();
  const [reportDetails, setReportDetails] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState(null);

  // State for column visibility toggle
  const [hideEmptyColumns, setHideEmptyColumns] = useState(false);
  const [emptyColumns, setEmptyColumns] = useState(new Set()); // Store keys of empty columns
  const [canToggleColumns, setCanToggleColumns] = useState(false); // Show toggle only if there are empty columns

  // State for Payslip Generation Loading
  const [isGeneratingPayslips, setIsGeneratingPayslips] = useState(false);

  // Color scheme constants (can be adjusted for report theme)
  const primaryColor = "#800020"; // Maroon
  const secondaryColor = "#1a365d"; // Dark Blue
  const headerBg = "#FFFFFF"; // Ensure white background for headers if needed

  const router = useRouter(); // <-- Initialize the router

  // State for mapping employeeId to position
  const [employeePositions, setEmployeePositions] = useState({});

  // Format date range for display
  const formatDateRange = (start, end) => {
    if (!start || !end) return "Not Selected";
    try {
      const startDate = parseISO(start);
      const endDate = parseISO(end);
      const startFormat = "MMM d";
      const endFormat =
        startDate.getFullYear() === endDate.getFullYear()
          ? "MMM d, yyyy"
          : "MMM d, yyyy";
      return `${format(startDate, startFormat)} - ${format(endDate, endFormat)}`;
    } catch (e) {
      console.error("Date formatting error:", e);
      return "Invalid Date";
    }
  };

  // Format date for display YYYY-MM-DD
  const formatDateForDisplay = (dateString) => {
    if (!dateString) return "";
    try {
      return format(parseISO(dateString), "yyyy-MM-dd");
    } catch (e) {
      console.error("Error formatting date for display:", e);
      return "Invalid Date";
    }
  };

  // Format date for PDF filename
  const formatDateForFilename = (dateString) => {
    if (!dateString) return "";
    try {
      return format(parseISO(dateString), "yyyyMMdd");
    } catch (e) {
      console.error("Error formatting date for filename:", e);
      return "InvalidDate";
    }
  };

  // Handle applying the date range from the modal
  const handleApplyDateRange = () => {
    if (!tempStartDate || !tempEndDate) {
      toast({ title: "Incomplete Date Range", status: "warning" });
      return;
    }
    if (new Date(tempEndDate) < new Date(tempStartDate)) {
      toast({
        title: "Invalid Date Range",
        description: "End date cannot be before start date.",
        status: "warning",
      });
      return;
    }
    setPeriodStartDate(tempStartDate);
    setPeriodEndDate(tempEndDate);
    onDateModalClose();
  };

  // useEffect to fetch the latest report summary for the selected period
  useEffect(() => {
    const fetchLatestSummary = async () => {
      setIsLoading(true);
      setError(null);
      setPayrollData(null); // Use null to indicate no summary loaded yet
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Authentication token not found.");
        setIsLoading(false);
        return;
      }
      if (!periodStartDate || !periodEndDate) {
        setError("Please select a valid period start and end date.");
        setIsLoading(false);
        return;
      }
      try {
        // Fetch the latest summary using the new endpoint
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_BACKEND_API}/api/reports/payroll/monthly-cargo/latest-summary`,
          {
            params: {
              startDate: periodStartDate,
              endDate: periodEndDate,
            },
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        // The response data will be the summary object or null
        setPayrollData(response.data);
      } catch (err) {
        console.error("Error fetching latest report summary:", err);
        if (err.response && err.response.status === 401) {
            toast({
                title: "Session Expired",
                description: "Your session has expired. Please log in again.",
                status: "error",
                duration: 5000,
                isClosable: true,
            });
            localStorage.removeItem("token");
            setError("Session expired. Please log in.");
            router.push("/login"); // Redirect to login page
        } else {
            const errorMsg =
                err.response?.data?.message ||
                err.message ||
                "Failed to fetch report summary.";
            setError(errorMsg);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchLatestSummary();
  }, [periodStartDate, periodEndDate, toast, router]);

  // Handle fetching details when View is clicked
  const handleViewDetails = async (reportObjectId) => {
    if (!reportObjectId) {
      toast({
        title: "Error",
        description: "Report ID is missing.",
        status: "error",
      });
      return;
    }
    setLoadingDetails(true);
    setDetailsError(null);
    setReportDetails([]); // Clear previous details
    const token = localStorage.getItem("token");
    if (!token) {
      setDetailsError("Authentication token not found.");
      setLoadingDetails(false);
      return;
    }

    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/reports/payroll/monthly-cargo/${reportObjectId}/details`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setReportDetails(response.data || []);

      // --- Identify empty columns based on totals ---
      const potentiallyEmptyKeys = [
        "earningsAdjustment",
        "overTime",
        "holidayPay",
        "silPay",
        "thirteenthMonth",
        "deductionsAdjustment",
        "sss",
        "philhealth",
        "pagibig",
        "caCharges",
        "withholdingTax",
      ];
      const currentlyEmpty = new Set();
      const totals = calculateDetailTotals(response.data || []); // Calculate totals here
      potentiallyEmptyKeys.forEach((key) => {
        if (totals[key] === 0) {
          currentlyEmpty.add(key);
        }
      });
      setEmptyColumns(currentlyEmpty);
      setCanToggleColumns(currentlyEmpty.size > 0);
      setHideEmptyColumns(false); // Reset toggle state when opening modal

      onDetailsModalOpen(); // Open modal only after successful fetch
    } catch (err) {
      console.error(
        `Error fetching report details for ID ${reportObjectId}:`,
        err
      );
      if (err.response && err.response.status === 401) {
          toast({
              title: "Session Expired",
              description: "Your session has expired. Please log in again.",
              status: "error",
              duration: 5000,
              isClosable: true,
          });
          localStorage.removeItem("token");
          setDetailsError("Session expired. Please log in.");
          onDetailsModalClose(); // Close the modal if open
          router.push("/login"); // Redirect to login page
      } else {
          const errorMsg =
              err.response?.data?.message ||
              err.message ||
              "Failed to fetch report details.";
          setDetailsError(errorMsg);
          toast({
              title: "Error Fetching Details",
              description: errorMsg,
              status: "error",
          });
      }
    } finally {
      setLoadingDetails(false);
    }
  };

  // Get summary data for display (handle null case)
  const employeeCount = payrollData ? payrollData.noOfEmployees : 0;
  const dateGenerated = payrollData
    ? format(parseISO(payrollData.dateGenerated), "MMM d, yyyy HH:mm")
    : "N/A";
  const reportMongoId = payrollData ? payrollData._id : null;

  // Calculate totals for the details modal using useMemo
  const detailTotals = useMemo(() => {
    // Function to calculate totals (extracted for reusability)
    const calculate = (details) => {
      return (details || []).reduce(
        (acc, record) => {
          // Add fields needed for totals (adjust based on your actual data fields)
          acc.monthlyWage += parseFloat(record.monthlyWage) || 0;
          acc.regularDaysWorked += parseFloat(record.regularDaysWorked) || 0;
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
          acc.deductionsAdjustment +=
            parseFloat(record.deductionsAdjustment) || 0;
          acc.withholdingTax += parseFloat(record.withholdingTax) || 0;
          acc.totalDeductions += parseFloat(record.totalDeductions) || 0;
          acc.netPay += parseFloat(record.netPay) || 0;
          return acc;
        },
        {
          monthlyWage: 0,
          regularDaysWorked: 0,
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
    };
    return calculate(reportDetails); // Use the state `reportDetails`
  }, [reportDetails]);

  // Helper function needed for identifying empty columns within handleViewDetails
  const calculateDetailTotals = (details) => {
    return (details || []).reduce(
      (acc, record) => {
        // Add fields needed for totals (adjust based on your actual data fields)
        acc.monthlyWage += parseFloat(record.monthlyWage) || 0;
        acc.regularDaysWorked += parseFloat(record.regularDaysWorked) || 0;
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
        acc.deductionsAdjustment +=
          parseFloat(record.deductionsAdjustment) || 0;
        acc.withholdingTax += parseFloat(record.withholdingTax) || 0;
        acc.totalDeductions += parseFloat(record.totalDeductions) || 0;
        acc.netPay += parseFloat(record.netPay) || 0;
        return acc;
      },
      {
        monthlyWage: 0,
        regularDaysWorked: 0,
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
  };

  // --- PDF Generation Logic ---
  const handleGeneratePdf = () => {
    if (!reportDetails || reportDetails.length === 0) {
      toast({ title: "No data to generate PDF", status: "warning" });
      return;
    }

    // Open the signatory modal instead of generating PDF directly
    setIsSignatoryModalOpen(true);
  };

  // New function to generate PDF after collecting signatory names
  const generatePdfWithSignatories = () => {
    // Close the modal
    setIsSignatoryModalOpen(false);

    // --- Determine Visible Columns ---
    const allColumns = [
      {
        key: "employeeId",
        header: "Employee ID",
        type: "info",
        style: { cellWidth: 40 }, // Increased width
      },
      { key: "name", header: "Name", type: "info", style: { cellWidth: 80 } }, // Increased width
      {
        key: "monthlyWage",
        header: "Monthly Wage Basic Pay",
        type: "info",
        style: { cellWidth: 50, halign: "right" },
      },
      {
        key: "regularDaysWorked",
        header: "Regular Days Worked",
        type: "info",
        style: { cellWidth: 40, halign: "right" },
      },
      {
        key: "earningsAdjustment",
        header: "Adjustment",
        type: "earning",
        group: "EARNINGS",
        style: { cellWidth: 45, halign: "right" },
      },
      {
        key: "overTime",
        header: "Over Time",
        type: "earning",
        group: "EARNINGS",
        style: { cellWidth: 45, halign: "right" },
      },
      {
        key: "holidayPay",
        header: "Holiday Pay",
        type: "earning",
        group: "EARNINGS",
        style: { cellWidth: 45, halign: "right" },
      },
      {
        key: "silPay",
        header: "SIL Pay",
        type: "earning",
        group: "EARNINGS",
        style: { cellWidth: 45, halign: "right" },
      },
      {
        key: "thirteenthMonth",
        header: "13th Month Pay",
        type: "earning",
        group: "EARNINGS",
        style: { cellWidth: 49, halign: "right" },
      },
      {
        key: "totalGrossPay",
        header: "Total Gross Pay",
        type: "earningTotal",
        style: { cellWidth: 50, halign: "right" },
      },
      {
        key: "deductionsAdjustment",
        header: "Adjustment",
        type: "deduction",
        group: "DEDUCTIONS",
        style: { cellWidth: 45, halign: "right" },
      },
      {
        key: "sss",
        header: "SSS",
        type: "deduction",
        group: "DEDUCTIONS",
        style: { cellWidth: 45, halign: "right" },
      },
      {
        key: "philhealth",
        header: "Philhealth",
        type: "deduction",
        group: "DEDUCTIONS",
        style: { cellWidth: 45, halign: "right" },
      },
      {
        key: "pagibig",
        header: "Pag-IBIG",
        type: "deduction",
        group: "DEDUCTIONS",
        style: { cellWidth: 45, halign: "right" },
      },
      {
        key: "caCharges",
        header: "CA/Charges",
        type: "deduction",
        group: "DEDUCTIONS",
        style: { cellWidth: 45, halign: "right" },
      },
      {
        key: "withholdingTax",
        header: "W/holding Tax",
        type: "deduction",
        group: "DEDUCTIONS",
        style: { cellWidth: 49, halign: "right" },
      },
      {
        key: "totalDeductions",
        header: "Total Deductions",
        type: "deductionTotal",
        style: { cellWidth: 50, halign: "right" },
      },
      {
        key: "netPay",
        header: "Net Pay",
        type: "net",
        style: { cellWidth: 50, halign: "right" },
      },
    ];

    const visibleColumns = allColumns.filter((col) => {
      // Keep non-earning/deduction columns and totals always
      if (
        col.type === "info" ||
        col.type === "earningTotal" ||
        col.type === "deductionTotal" ||
        col.type === "net"
      ) {
        return true;
      }
      // Hide specific earning/deduction columns if toggle is on and column is empty
      if (hideEmptyColumns && emptyColumns.has(col.key)) {
        return false;
      }
      return true;
    });

    const visibleEarningsSubColumns = visibleColumns.filter(
      (col) => col.type === "earning"
    );
    const visibleDeductionsSubColumns = visibleColumns.filter(
      (col) => col.type === "deduction"
    );

    // --- Generate PDF Content Dynamically ---

    // ** Header Row 1 **
    const headRow1 = [];
    // Info columns (Employee ID, Name, Wage, Days)
    visibleColumns
      .filter((col) => col.type === "info")
      .forEach((col) => {
        headRow1.push({
          content: col.header,
          rowSpan: 2,
          styles: {
            halign: "center",
            valign: "middle",
            fillColor: headerBg,
            textColor: 0,
            fontStyle: "bold",
            lineWidth: { bottom: 1 },
          },
        });
      });

    // Earnings Group Header (if any earnings sub-columns are visible)
    if (visibleEarningsSubColumns.length > 0) {
      headRow1.push({
        content: "EARNINGS",
        colSpan: visibleEarningsSubColumns.length,
        styles: {
          halign: "center",
          fillColor: "#ADD8E6",
          textColor: 0,
          fontStyle: "bold",
          lineWidth: { bottom: 1 },
        },
      });
    }

    // Total Gross Pay Header
    headRow1.push({
      content: "Total Gross Pay",
      rowSpan: 2,
      styles: {
        halign: "center",
        valign: "middle",
        fillColor: "#E0F7FA",
        textColor: 0,
        fontStyle: "bold",
        lineWidth: { bottom: 1 },
      },
    });

    // Deductions Group Header (if any deductions sub-columns are visible)
    if (visibleDeductionsSubColumns.length > 0) {
      headRow1.push({
        content: "DEDUCTIONS",
        colSpan: visibleDeductionsSubColumns.length,
        styles: {
          halign: "center",
          fillColor: "#FFB6C1",
          textColor: 0,
          fontStyle: "bold",
          lineWidth: { bottom: 1 },
        },
      });
    }

    // Total Deductions Header
    headRow1.push({
      content: "Total Deductions",
      rowSpan: 2,
      styles: {
        halign: "center",
        valign: "middle",
        fillColor: "#FFF0F5",
        textColor: 0,
        fontStyle: "bold",
        lineWidth: { bottom: 1 },
      },
    });

    // Net Pay Header
    headRow1.push({
      content: "Net Pay",
      rowSpan: 2,
      styles: {
        halign: "center",
        valign: "middle",
        fillColor: "#FFFFE0",
        textColor: 0,
        fontStyle: "bold",
        lineWidth: { bottom: 1 },
      },
    });

    // ** Header Row 2 (Sub-headers) **
    const headRow2 = [];
    visibleEarningsSubColumns.forEach((col) => {
      headRow2.push({
        content: col.header,
        styles: {
          halign: "center",
          fillColor: "#ADD8E6",
          textColor: 0,
          fontStyle: "bold",
          lineWidth: { bottom: 1 },
        },
      });
    });
    visibleDeductionsSubColumns.forEach((col) => {
      headRow2.push({
        content: col.header,
        styles: {
          halign: "center",
          fillColor: "#FFB6C1",
          textColor: 0,
          fontStyle: "bold",
          lineWidth: { bottom: 1 },
        },
      });
    });

    const head = [headRow1, headRow2]; // Combine header rows

    // ** Body Rows **
    const body = reportDetails.map((record) => {
      const row = [];
      visibleColumns.forEach((col) => {
        let value = record[col.key] || 0;
        let content = "";
        let style = { halign: "left" }; // Default align left

        if (col.key === "employeeId") {
          // Remove decimal places for Employee ID
          content = String(record.employeeId).split(".")[0];
        } else if (typeof value === "number" || !isNaN(parseFloat(value))) {
          value = Number(value);
          content = value.toFixed(2);
          // Keep left alignment for all amount columns
        } else {
          content = record[col.key] || ""; // Use original string if not number
        }

        // Apply specific background colors based on type
        if (col.type === "earning" || col.type === "earningTotal")
          style.fillColor = "#E0F7FA";
        if (col.type === "deduction" || col.type === "deductionTotal")
          style.fillColor = "#FFF0F5";
        if (col.type === "net") style.fillColor = "#FFFACD";
        if (
          col.type === "earningTotal" ||
          col.type === "deductionTotal" ||
          col.type === "net"
        )
          style.fontStyle = "bold";

        // Specific case for regular days worked (not currency)
        if (col.key === "regularDaysWorked") {
          content = record.regularDaysWorked || 0;
          style.halign = "right";
        }

        row.push({ content: content, styles: style });
      });
      return row;
    });

    // ** Footer Row **
    const footRow = [];
    const infoColCount = visibleColumns.filter(
      (col) => col.type === "info"
    ).length;
    // Add TOTALS label with correct colspan
    if (infoColCount > 0) {
      footRow.push({
        content: "TOTALS:",
        colSpan: infoColCount,
        styles: { halign: "right", fontStyle: "bold", fillColor: "#f0f0f0" },
      });
    }

    // Add totals for visible columns
    visibleColumns.forEach((col) => {
      if (col.type === "info") return; // Skip info columns in footer totals

      let value = detailTotals[col.key] || 0;
      let content = (Number(value) || 0).toFixed(2);
      let style = { halign: "right", fontStyle: "bold" };

      // Apply specific background colors based on type
      if (col.type === "earning" || col.type === "earningTotal")
        style.fillColor = "#E0F7FA";
      if (col.type === "deduction" || col.type === "deductionTotal")
        style.fillColor = "#FFF0F5";
      if (col.type === "net") style.fillColor = "#FFFACD";
      else if (col.type !== "earning" && col.type !== "deduction")
        style.fillColor = "#f0f0f0"; // Default footer gray for non-data totals if needed

      footRow.push({ content: content, styles: style });
    });

    const foot = [footRow];

    // ** Column Styles **
    const pdfColumnStyles = {};
    visibleColumns.forEach((col, index) => {
      pdfColumnStyles[index] = { ...col.style }; // Use spread to avoid modifying original style object
    });

    // --- Initialize PDF ---
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "pt",
      format: "legal",
    });
    const tableTitle = `JUSTINE'S CARGO SERVICES MONTHLY PAYROLL`;
    const periodText = `Period Covered: ${formatDateRange(periodStartDate, periodEndDate)}`;
    const generatedDate = `Generated: ${format(new Date(), "MMM d, yyyy HH:mm")}`;

    // --- Add Title and Subtitle ---
    // Company Name - Larger font
    doc.setFontSize(16);
    doc.setFont(undefined, "bold");
    doc.text("JUSTINE'S CARGO SERVICES", doc.internal.pageSize.getWidth() / 2, 35, {
      align: "center",
    });

    // Monthly Payroll - Slightly smaller font
    doc.setFontSize(14);
    doc.text("MONTHLY PAYROLL", doc.internal.pageSize.getWidth() / 2, 55, {
      align: "center",
    });

    // Period Text - Smaller font
    doc.setFontSize(10);
    doc.setFont(undefined, "normal");
    doc.text(periodText, doc.internal.pageSize.getWidth() / 2, 75, {
      align: "center",
    });

    // --- Generate Table ---
    let startY = 90; // Adjusted Y position to start the table
    autoTable(doc, {
      head: head,
      body: body,
      foot: foot,
      startY: startY,
      theme: "grid",
      margin: { top: 40, right: 20, bottom: 70, left: 100 }, // Adjusted left margin
      styles: {
        font: "helvetica",
        fontSize: 8, // Slightly smaller font
        cellPadding: 0.5, // Slightly smaller padding
        textColor: [0, 0, 0],
        overflow: "linebreak",
        lineWidth: 0.5,
        lineColor: [200, 200, 200],
      },
      headStyles: {
        font: "helvetica",
        fontStyle: "bold",
        fontSize: 8,
        lineWidth: { bottom: 1, top: 0.5, left: 0.5, right: 0.5 },
        lineColor: [0, 0, 0],
        halign: "center",
        valign: "middle",
        textColor: [0, 0, 0],
      },
      footStyles: {
        font: "helvetica",
        fontStyle: "bold",
        fontSize: 8,
        lineWidth: 0.5,
        lineColor: [0, 0, 0],
        fillColor: "#f0f0f0",
        textColor: [0, 0, 0],
      },
      columnStyles: pdfColumnStyles, // Use dynamically generated column styles
      didDrawPage: (data) => {
        // Create footer with white background
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const leftOffset = 100; // Match the table's adjusted left margin
        
        // Set white background
        doc.setFillColor(255, 255, 255); // White background
        doc.rect(0, pageHeight - 70, pageWidth, 70, 'F');
        
        // Set black text
        doc.setTextColor(0, 0, 0); // Black text
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        
        // Calculate positions
        const footerY = pageHeight - 55;
        const colWidth = (pageWidth - leftOffset) / 3;
        
        // --- LABELS ROW ---
        doc.text("Prepared by:", leftOffset + colWidth/6, footerY, { align: "left" });
        doc.text("Noted by:", leftOffset + colWidth + colWidth/6, footerY, { align: "left" });
        doc.text("Approve by:", leftOffset + colWidth*2 + colWidth/6, footerY, { align: "left" });
        
        // Add extra vertical space after the labels
        const afterLabelY = footerY + 10;
        // Add extra horizontal indent for signature blocks
        const sigIndent = 40;
        
        // --- SIGNATURE NAMES (BOLD, ABOVE LINE) ---
        doc.setFont("helvetica", "bold");
        if (hrSecretaryName) {
          doc.text(hrSecretaryName, leftOffset + colWidth/6 + sigIndent + (colWidth*2/3)/2, afterLabelY, { align: "center" });
        }
        if (adminHeadName) {
          doc.text(adminHeadName, leftOffset + colWidth + colWidth/6 + sigIndent + (colWidth*2/3)/2, afterLabelY, { align: "center" });
        }
        if (coProprietorName) {
          doc.text(coProprietorName, leftOffset + colWidth*2 + colWidth/6 + sigIndent + (colWidth*2/3)/2, afterLabelY, { align: "center" });
        }
        doc.setFont("helvetica", "normal");
        
        // --- SIGNATURE LINES ---
        doc.setDrawColor(0, 0, 0); // Black lines
        doc.setLineWidth(0.5);
        doc.line(leftOffset + colWidth/6 + sigIndent, afterLabelY + 7, leftOffset + colWidth/6 + sigIndent + colWidth*2/3, afterLabelY + 7);
        doc.line(leftOffset + colWidth + colWidth/6 + sigIndent, afterLabelY + 7, leftOffset + colWidth + colWidth/6 + sigIndent + colWidth*2/3, afterLabelY + 7);
        doc.line(leftOffset + colWidth*2 + colWidth/6 + sigIndent, afterLabelY + 7, leftOffset + colWidth*2 + colWidth/6 + sigIndent + colWidth*2/3, afterLabelY + 7);
        
        // --- TITLES (SMALL FONT, BELOW LINE) --- //
        doc.setFontSize(8);
        if (hrSecretaryPosition) { 
          doc.text(hrSecretaryPosition, leftOffset + colWidth/6 + sigIndent + (colWidth*2/3)/2, afterLabelY + 18, { align: "center" });
        }
        if (adminHeadPosition) { 
          doc.text(adminHeadPosition, leftOffset + colWidth + colWidth/6 + sigIndent + (colWidth*2/3)/2, afterLabelY + 18, { align: "center" });
        }
        if (coProprietorPosition) { 
          doc.text(coProprietorPosition, leftOffset + colWidth*2 + colWidth/6 + sigIndent + (colWidth*2/3)/2, afterLabelY + 18, { align: "center" });
        }
        doc.setFontSize(10);
      },
    });

    // --- Save PDF ---
    const startDateStr = formatDateForFilename(periodStartDate);
    const endDateStr = formatDateForFilename(periodEndDate);
    const filename = `Cargo_Monthly_Payroll_Details_${startDateStr}_to_${endDateStr}.pdf`;
    doc.save(filename);

    toast({
      title: "PDF Generated",
      description: `${filename} saved.`,
      status: "success",
    });
  };

  // --- Payslip Generation Logic ---
  // This function will now ONLY open the modal for approver name input
  const handleGeneratePayslips = async () => {
    if (!reportDetails || reportDetails.length === 0) {
      toast({ title: "No data to generate payslips", status: "warning" });
      return;
    }
    // Open the modal to ask for approver name
    setPayslipApproverName(""); // Clear previous name
    setPayslipApproverPosition(""); // Clear previous position
    setIsPayslipApproverModalOpen(true);
  };

  // This is the CORRECT generatePayslipsWithApprover, containing the full PDF logic
  const generatePayslipsWithApprover = async () => {
    setIsPayslipApproverModalOpen(false); // Close the modal
    // ... (full PDF generation logic here) ...
    setIsGeneratingPayslips(true);
    try {
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "pt",
        format: "letter",
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;

      // Calculate dimensions for each of the 4 payslips
      const payslipWidth = (pageWidth - margin * 2) / 2;
      const payslipHeight = (pageHeight - margin * 2) / 2;

      // Define starting coordinates for the 4 quadrants
      const quadrants = [
        { x: margin, y: margin }, // Top-Left
        { x: margin + payslipWidth, y: margin }, // Top-Right
        { x: margin, y: margin + payslipHeight }, // Bottom-Left
        { x: margin + payslipWidth, y: margin + payslipHeight }, // Bottom-Right
      ];

      // --- Function to draw cut lines ---
      const drawCutLines = (docInstance) => {
        const pgWidth = docInstance.internal.pageSize.getWidth();
        const pgHeight = docInstance.internal.pageSize.getHeight();
        const dashLength = 5;
        const gapLength = 3;
        docInstance.setDrawColor(150, 150, 150); // Gray color for cut lines
        docInstance.setLineDashPattern([dashLength, gapLength], 0);
        docInstance.setLineWidth(0.5);
        // Vertical cut line
        docInstance.line(
          pgWidth / 2,
          margin / 2,
          pgWidth / 2,
          pgHeight - margin / 2
        );
        // Horizontal cut line
        docInstance.line(
          margin / 2,
          pgHeight / 2,
          pgWidth - margin / 2,
          pgHeight / 2
        );
        // Reset line dash pattern to solid
        docInstance.setLineDashPattern([], 0);
        docInstance.setDrawColor(0, 0, 0); // Reset draw color to black
      };

      // --- Function to draw a single payslip ---
      const drawPayslip = (doc, record, startX, startY, width, height, currentPayslipApproverName, currentPayslipApproverPosition) => {
        // Define Column X Coordinates
        const leftLabelX = startX + 15;
        const leftValueX = startX + width * 0.5 - 15; // Right-align value before the middle line
        const rightLabelX = startX + width * 0.55;
        const rightValueX = startX + width - 15; // Right-align value at the right edge
        const employeeValueX = startX + 120; // Specific X for employee details value

        // Spacing
        const lineSpacing = 11;
        const sectionSpacing = 18;
        let currentY = startY + 15;

        // Company Header
        doc.setFontSize(10);
        doc.setFont(undefined, "bold");
        doc.text("JUSTINE'S CARGO SERVICES", startX + width / 2, currentY, {
          align: "center",
        });
        currentY += lineSpacing;
        doc.setFontSize(8);
        doc.setFont(undefined, "normal");
        doc.text(
          "Pakiad Office, Brgy. Pakiad, Oton, Iloilo",
          startX + width / 2,
          currentY,
          { align: "center" }
        );
        currentY += lineSpacing * 1.2;

        // Period - Combined into one line
        doc.setFontSize(9);
        doc.setFont(undefined, "bold");
        const periodLabel = "PAY SLIP for the period of";
        const periodValue = formatDateRange(periodStartDate, periodEndDate);
        const fullPeriodText = `${periodLabel} ${periodValue}`;
        doc.text(fullPeriodText, startX + width / 2, currentY, {
          align: "center",
        });
        currentY += sectionSpacing;

        // Employee Info & Net Pay Line
        const empInfoStartY = currentY;
        doc.setFontSize(9);
        doc.setFont(undefined, "normal");

        // Employee Info (Left)
        doc.text("EMPLOYEE NAME:", leftLabelX, currentY);
        doc.setFont(undefined, "bold");
        doc.text(record.name || "-", employeeValueX, currentY);
        doc.setFont(undefined, "normal");
        currentY += lineSpacing;
        doc.text("EMPLOYEE DESIGNATION:", leftLabelX, currentY);
        // Use position from employeePositions map
        const empDesignation = employeePositions[record.employeeId] || "-";
        doc.text(empDesignation, employeeValueX + 30, currentY); // Move further right
        currentY += lineSpacing;
        doc.text("EMPLOYEE #:", leftLabelX, currentY);
        doc.text(record.employeeId || "-", employeeValueX, currentY);
        const employeeNumY = currentY; // Store the Y coordinate of the Employee # line

        // Net Pay (Right - Aligned with Employee #)
        doc.setFont(undefined, "bold");
        doc.text("NET PAY:", rightLabelX, employeeNumY);
        doc.setFontSize(10);
        doc.text(
          numberFormatter.format(record.netPay || 0),
          rightValueX,
          employeeNumY,
          { align: "right" }
        );
        doc.setFont(undefined, "normal");
        doc.setFontSize(9);

        // Move currentY past employee info block
        currentY += sectionSpacing;

        // --- Draw dividing lines ---
        doc.setDrawColor(180, 180, 180); // Lighter gray for lines
        doc.setLineWidth(0.5);
        // Horizontal line below Employee Info/Net Pay
        doc.line(
          startX + 5,
          currentY - sectionSpacing / 2,
          startX + width - 5,
          currentY - sectionSpacing / 2
        );
        // Vertical line between Gross/Deductions
        doc.line(
          startX + width * 0.5,
          currentY - 5,
          startX + width * 0.5,
          startY + height - 45
        );

        // --- Gross Pay & Deductions Section ---
        const detailStartY = currentY;
        const valueColGrossX = startX + width * 0.5 - 15; // Defined above as leftValueX
        const valueColDeductX = rightValueX; // Defined above as rightValueX

        // Gross Pay (Left Side)
        doc.setFont(undefined, "bold");
        doc.text("GROSS PAY", leftLabelX, currentY);
        doc.text(
          numberFormatter.format(record.totalGrossPay || 0),
          valueColGrossX,
          currentY,
          { align: "right" }
        );
        currentY += lineSpacing * 1.5;

        doc.setFont(undefined, "normal");
        const grossPayItems = [
          {
            label: "No. of Days:",
            value: String(record.regularDaysWorked || "-"),
          }, // Ensure string
          {
            label: "Basic Pay:",
            value: numberFormatter.format(record.monthlyWage || 0),
          },
          {
            label: "Adjustment:",
            value: numberFormatter.format(record.earningsAdjustment || 0),
          },
          {
            label: "Overtime:",
            value: numberFormatter.format(record.overTime || 0),
          },
          {
            label: "Holiday:",
            value: numberFormatter.format(record.holidayPay || 0),
          },
          {
            label: "13th Month:",
            value: numberFormatter.format(record.thirteenthMonth || 0),
          },
          { label: "SIL:", value: numberFormatter.format(record.silPay || 0) },
        ];

        grossPayItems.forEach((item) => {
          const itemValue =
            item.value === "0.00" || item.value === "-" ? "-" : item.value;
          doc.text(item.label, leftLabelX, currentY);
          doc.text(itemValue, valueColGrossX, currentY, { align: "right" });
          currentY += lineSpacing;
        });

        // Deductions (Right Side)
        let deductionY = detailStartY; // Reset Y for deductions column
        doc.setFont(undefined, "bold");
        doc.text("DEDUCTIONS", rightLabelX, deductionY);
        doc.text(
          numberFormatter.format(record.totalDeductions || 0),
          valueColDeductX,
          deductionY,
          { align: "right" }
        );
        deductionY += lineSpacing * 1.5;

        doc.setFont(undefined, "normal");
        const deductionItems = [
          {
            label: "Adjustment:",
            value: numberFormatter.format(record.deductionsAdjustment || 0),
          },
          {
            label: "SSS contrib:",
            value: numberFormatter.format(record.sss || 0),
          },
          {
            label: "Philhealth:",
            value: numberFormatter.format(record.philhealth || 0),
          },
          {
            label: "Pag-ibig:",
            value: numberFormatter.format(record.pagibig || 0),
          },
          {
            label: "CA/Charges:",
            value: numberFormatter.format(record.caCharges || 0),
          },
          {
            label: "W/H Tax:",
            value: numberFormatter.format(record.withholdingTax || 0),
          },
        ];

        deductionItems.forEach((item) => {
          const itemValue = item.value === "0.00" ? "-" : item.value;
          doc.text(item.label, rightLabelX, deductionY);
          doc.text(itemValue, valueColDeductX, deductionY, { align: "right" });
          deductionY += lineSpacing;
        });

        // --- Footer Section (Approved By / Received By) ---
        const lineSpacingForFooter = 11;
        const approvedByWidth = width * 0.4;
        const approvedBySectionX = leftLabelX; // X for left-aligning content in this section
        const approvedByCenterX = approvedBySectionX + approvedByWidth / 2; // Center X for centered content in this section

        const signatureLineY = startY + height - 35; // Adjusted Y for the signature line to make space for position below
        const nameAboveLineY = signatureLineY - (lineSpacingForFooter * 0.5);
        const labelAboveNameY = nameAboveLineY - (lineSpacingForFooter * 2.5); // Increased space between label and name
        const positionBelowLineY = signatureLineY + lineSpacingForFooter; // Y for position below line

        doc.setFontSize(8);
        doc.setFont(undefined, "normal");

        // "Approved By:" Label (Left Aligned)
        doc.text("Approved By:", approvedBySectionX, labelAboveNameY, { align: "left" });

        // Dynamic Approver Name (Centered)
        if (currentPayslipApproverName && currentPayslipApproverName.trim() !== "") {
            doc.setFont(undefined, "bold");
            doc.text(currentPayslipApproverName, approvedByCenterX, nameAboveLineY, { align: "center" });
            doc.setFont(undefined, "normal");
        }
        
        doc.setLineWidth(0.5);
        doc.setDrawColor(0, 0, 0); 
        // Signature Line for Approved By
        doc.line(
          approvedBySectionX,
          signatureLineY,
          approvedBySectionX + approvedByWidth,
          signatureLineY
        ); 

        // Dynamic Approver Position (Centered Below Line)
        if (currentPayslipApproverPosition && currentPayslipApproverPosition.trim() !== "") {
            doc.text(currentPayslipApproverPosition, approvedByCenterX, positionBelowLineY, { align: "center" });
        }

        // Received By (Right)
        const receivedByX = startX + width - approvedByWidth - 15; 
        const receivedBySignatureLineY = signatureLineY; // Align Y with Approved By line
        const receivedByLabelY = receivedBySignatureLineY + lineSpacingForFooter; // Y for label below this line


        doc.line(
          receivedByX,
          receivedBySignatureLineY,
          receivedByX + approvedByWidth,
          receivedBySignatureLineY
        ); 
        // "Received By (Signature / Date):" Label (Below Line)
        doc.text(
          "Received By (Signature / Date):",
          receivedByX + approvedByWidth / 2,
          receivedByLabelY, // Ensure this is below its line
          { align: "center" }
        );


        // --- Add Watermark --- 
        doc.saveGraphicsState(); // Save current state
        doc.setFontSize(20); // Adjusted font size for repeating watermark
        doc.setTextColor(200, 200, 200); // Light gray color
        doc.setGState(new doc.GState({opacity: 0.2})); // Set opacity for watermark
        
        const watermarkText = "JUSTINE'S CARGO SERVICES";
        // Calculate center of the payslip quadrant for reference
        const centerX = startX + width / 2;
        const centerY = startY + height / 2;
        const payslipWatermarkLineSpacing = 40; // Adjust as needed for visual spacing

        // Draw the watermark text multiple times with offsets
        const offsets = [-1.5, -0.5, 0.5, 1.5]; // Multipliers for lineSpacing

        for (const offsetMultiplier of offsets) {
          doc.text(watermarkText, centerX, centerY + offsetMultiplier * payslipWatermarkLineSpacing, {
            angle: 0, // Horizontal text
            align: "center",
            baseline: "middle"
          });
        }

        doc.restoreGraphicsState(); // Restore previous state
      };

      let payslipIndexOnPage = 0;
      reportDetails.forEach((record, index) => {
        if (index > 0 && payslipIndexOnPage === 0) {
          drawCutLines(doc); 
          doc.addPage();
        }
        const { x, y } = quadrants[payslipIndexOnPage];
        // Pass the current payslipApproverName and payslipApproverPosition from state
        drawPayslip(doc, record, x, y, payslipWidth, payslipHeight, payslipApproverName, payslipApproverPosition);
        payslipIndexOnPage = (payslipIndexOnPage + 1) % 4;
      });

      drawCutLines(doc);

      // --- Save PDF ---
      const startDateStr = formatDateForFilename(periodStartDate);
      const endDateStr = formatDateForFilename(periodEndDate);
      const filename = `Cargo_Payslips_${startDateStr}_to_${endDateStr}.pdf`;
      doc.save(filename);

      toast({
        title: "Payslips Generated",
        description: `${filename} saved.`,
        status: "success",
      });
    } catch (err) {
      console.error("Error generating payslips:", err);
      toast({
        title: "Error Generating Payslips",
        description: err.message,
        status: "error",
      });
    } finally {
      setIsGeneratingPayslips(false);
    }
  };

  // Fetch employee positions when details modal is opened
  useEffect(() => {
    if (isDetailsModalOpen && reportDetails.length > 0) {
      // Get unique employeeIds from reportDetails
      const ids = Array.from(new Set(reportDetails.map(d => d.employeeId)));
      axios.get(`${process.env.NEXT_PUBLIC_BACKEND_API}/api/employees/reports`).then(res => {
        // Build a map: { employeeId: position }
        const map = {};
        res.data.forEach(emp => { map[emp.empID] = emp.position; });
        setEmployeePositions(map);
      });
    }
  }, [isDetailsModalOpen, reportDetails]);

  return (
    <MotionBox>
      <Box p={0}>
        {/* Header Controls (remains same) */}
        <Flex justify="space-between" align="center" mb={4} wrap="wrap" gap={2}>
          <HStack spacing={3} ml="auto" align="center">
            <Box textAlign="right" mr={2}>
              <Text fontSize="sm" fontWeight="medium" color={secondaryColor}>
                Report Period:
              </Text>
              <Text fontSize="sm" fontWeight="bold" color={primaryColor}>
                {formatDateRange(periodStartDate, periodEndDate)}
              </Text>
            </Box>
            <Button
              size="sm"
              leftIcon={<CalendarIcon />}
              onClick={onDateModalOpen}
              variant="outline"
              colorScheme="blue"
              isDisabled={isLoading}
            >
              Change Period
            </Button>
          </HStack>
        </Flex>

        {/* Error Alert (remains same) */}
        {error && (
          <Alert status="error" mb={4} borderRadius="md">
            <AlertIcon />
            {error}
          </Alert>
        )}

        {/* Summary Table - Moved to the right */}
        <Box
          borderWidth="1px"
          borderRadius="lg"
          borderColor={secondaryColor}
          boxShadow="sm"
          overflow="hidden"
          ml="auto"
        >
          <TableContainer>
            <Table variant="simple" size="sm">
              {/* === THEAD (New Columns) === */}
              <Thead bg="gray.50">
                {" "}
                {/* Light background for header */}
                <Tr>
                  <Th
                    color={secondaryColor}
                    borderBottomWidth="2px"
                    borderColor={secondaryColor}
                  >
                    Period Covered
                  </Th>
                  <Th
                    isNumeric
                    color={secondaryColor}
                    borderBottomWidth="2px"
                    borderColor={secondaryColor}
                  >
                    No. of Employees
                  </Th>
                  <Th
                    color={secondaryColor}
                    borderBottomWidth="2px"
                    borderColor={secondaryColor}
                  >
                    Date Generated
                  </Th>
                  <Th
                    textAlign="center"
                    color={secondaryColor}
                    borderBottomWidth="2px"
                    borderColor={secondaryColor}
                  >
                    Actions
                  </Th>
                </Tr>
              </Thead>
              {/* === TBODY (Single Summary Row) === */}
              <Tbody>
                {isLoading ? (
                  <Tr>
                    <Td colSpan={4} textAlign="center" py={10}>
                      <Spinner size="lg" color={primaryColor} />
                    </Td>
                  </Tr>
                ) : error ? (
                  <Tr>
                    <Td colSpan={4} textAlign="center" py={10}>
                      <Alert status="error" variant="subtle">
                        {error}
                      </Alert>
                    </Td>
                  </Tr>
                ) : !payrollData ? (
                  <Tr>
                    <Td colSpan={4} textAlign="center" py={10}>
                      No report generated for this period yet.
                    </Td>
                  </Tr>
                ) : (
                  <Tr
                    fontSize="xs"
                    key={payrollData._id}
                    _hover={{ bg: "gray.100" }}
                  >
                    <Td>
                      <Text fontWeight="medium" color={primaryColor}>
                        {formatDateRange(
                          payrollData.startDate,
                          payrollData.endDate
                        )}
                      </Text>
                    </Td>
                    <Td isNumeric>{payrollData.noOfEmployees}</Td>
                    <Td>
                      {format(
                        parseISO(payrollData.dateGenerated),
                        "MMM d, yyyy HH:mm"
                      )}
                    </Td>
                    <Td textAlign="center">
                      <HStack spacing={1} justify="center">
                        <IconButton
                          aria-label="View Details"
                          icon={<ViewIcon />}
                          size="xs"
                          colorScheme="blue"
                          variant="ghost"
                          onClick={() => handleViewDetails(payrollData._id)}
                          isLoading={loadingDetails}
                        />
                        <IconButton
                          aria-label="Download Report"
                          icon={<DownloadIcon />}
                          size="xs"
                          colorScheme="green"
                          variant="ghost"
                          isDisabled
                        />
                      </HStack>
                    </Td>
                  </Tr>
                )}
              </Tbody>
              {/* === TFOOT Removed === */}
            </Table>
          </TableContainer>
        </Box>
      </Box>

      {/* Date Range Selection Modal (Keep for selecting period) */}
      <Modal isOpen={isDateModalOpen} onClose={onDateModalClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader bg={primaryColor} color="white" borderTopRadius="md">
            Set Report Period
          </ModalHeader>
          <ModalCloseButton
            color="white"
            _focus={{ boxShadow: "none" }}
            _hover={{ bg: "whiteAlpha.300" }}
          />
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
                min={tempStartDate}
              />
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <Button
              colorScheme="blue"
              mr={3}
              onClick={handleApplyDateRange}
              isDisabled={isLoading}
            >
              Apply Period
            </Button>
            <Button
              variant="outline"
              colorScheme="red"
              onClick={onDateModalClose}
            >
              Cancel
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* NEW: Details Modal */}
      <Modal
        isOpen={isDetailsModalOpen}
        onClose={onDetailsModalClose}
        isCentered
        size="full"
      >
        {" "}
        {/* Use size="full" or "6xl" etc. for large table */}
        <ModalOverlay />
        <ModalContent>
          {/* Apply Maroon background and white text to header */}
          <ModalHeader bg={primaryColor} color="white" borderTopRadius="md">
           JUSTINE'S CARGO SERVICES Monthly Payroll Details -{" "}
            {formatDateRange(periodStartDate, periodEndDate)}
          </ModalHeader>
          {/* Ensure close button is visible on dark background */}
          <ModalCloseButton
            color="white"
            _focus={{ boxShadow: "none" }}
            _hover={{ bg: "whiteAlpha.300" }}
          />
          {/* Apply consistent padding and allow horizontal scroll */}
          <ModalBody p={6} overflowX="auto">
            {/* === Parent Flex for Top Controls === */}
            <Flex justify="space-between" align="center" mb={4}>
              {/* --- Hide Empty Columns Toggle (Left Side) --- */}
              {canToggleColumns ? ( // Render toggle or empty Box for spacing
                <FormControl display="flex" alignItems="center">
                  <FormLabel htmlFor="hide-empty-cols" mb="0" fontSize="sm">
                    Hide Empty Columns
                  </FormLabel>
                  <Switch
                    id="hide-empty-cols"
                    isChecked={hideEmptyColumns}
                    onChange={() => setHideEmptyColumns(!hideEmptyColumns)}
                    colorScheme="blue"
                    size="sm"
                  />
                </FormControl>
              ) : (
                <Box /> // Empty Box to maintain alignment when toggle is hidden
              )}
              {/* --- Generate PDF Button (Right Side) --- */}
              <Flex>
                <Button
                  colorScheme="blue"
                  mr={3} // Add margin back
                  onClick={handleGeneratePdf}
                  isDisabled={loadingDetails || reportDetails.length === 0}
                  leftIcon={<DownloadIcon />}
                  size="sm"
                >
                  Generate PDF
                </Button>
                {/* === Add Generate Multiple Payslip Button === */}
                <Button
                  colorScheme="teal" // Example color scheme
                  onClick={handleGeneratePayslips} // Assign the function
                  isDisabled={
                    loadingDetails ||
                    reportDetails.length === 0 ||
                    isGeneratingPayslips
                  } // Add loading state to disable condition
                  isLoading={isGeneratingPayslips} // Show spinner when loading
                  // leftIcon={<SomeIcon />} // Add icon if desired
                  size="sm"
                >
                  Generate Multiple Payslip
                </Button>
              </Flex>
            </Flex>
            {/* Add border and shadow to the container */}
            <TableContainer
              maxHeight="calc(100vh - 250px)" // Adjusted maxHeight
              overflowY="auto"
              border="1px"
              borderColor="gray.200"
              borderRadius="md"
              boxShadow="sm"
            >
              <Table
                variant="striped" // Use striped variant for row differentiation
                colorScheme="gray" // Base color scheme for striping
                size="sm"
                className="payroll-details-table"
              >
                {/* === THEAD (Structure from payroll-cargo.Monthly.js) === */}
                <Thead
                  position="sticky"
                  top={0}
                  zIndex={1}
                  bg="white" // Keep header background white for contrast
                  boxShadow="sm"
                >
                  <Tr>
                    {/* Employee Info Headers - Use gray border and text */}
                    <Th
                      rowSpan={2}
                      borderBottomWidth="2px"
                      borderColor="gray.300" // Softer border
                      color="gray.600" // Softer text color
                      textAlign="center"
                      verticalAlign="middle"
                    >
                      {" "}
                      Employee ID{" "}
                    </Th>
                    <Th
                      rowSpan={2}
                      borderBottomWidth="2px"
                      borderColor="gray.300" // Softer border
                      color="gray.600" // Softer text color
                      textAlign="center"
                      verticalAlign="middle"
                    >
                      {" "}
                      Name{" "}
                    </Th>
                    <Th
                      rowSpan={2}
                      borderBottomWidth="2px"
                      borderColor="gray.300" // Softer border
                      color="gray.600" // Softer text color
                      textAlign="center"
                      verticalAlign="middle"
                    >
                      {" "}
                      Monthly Wage{" "}
                    </Th>
                    <Th
                      rowSpan={2}
                      borderBottomWidth="2px"
                      borderColor="gray.300" // Softer border
                      color="gray.600" // Softer text color
                      textAlign="center"
                      verticalAlign="middle"
                    >
                      {" "}
                      Days Worked{" "}
                    </Th>

                    {/* --- Calculate Hidden Column Counts --- */}
                    {(() => {
                      const earningsKeys = [
                        "earningsAdjustment",
                        "overTime",
                        "holidayPay",
                        "silPay",
                        "thirteenthMonth",
                      ];
                      const deductionsKeys = [
                        "deductionsAdjustment",
                        "sss",
                        "philhealth",
                        "pagibig",
                        "caCharges",
                        "withholdingTax",
                      ];

                      let hiddenEarningsCount = 0;
                      if (hideEmptyColumns) {
                        earningsKeys.forEach((key) => {
                          if (emptyColumns.has(key)) hiddenEarningsCount++;
                        });
                      }

                      let hiddenDeductionsCount = 0;
                      if (hideEmptyColumns) {
                        deductionsKeys.forEach((key) => {
                          if (emptyColumns.has(key)) hiddenDeductionsCount++;
                        });
                      }

                      const earningsColSpan =
                        earningsKeys.length - hiddenEarningsCount;
                      const deductionsColSpan =
                        deductionsKeys.length - hiddenDeductionsCount;

                      return (
                        <>
                          {/* EARNINGS Header - Conditionally Render & Adjust ColSpan */}
                          {earningsColSpan > 0 && (
                            <Th
                              colSpan={earningsColSpan}
                              borderBottomWidth="2px"
                              borderColor="gray.300" // Softer border
                              color="gray.700" // Darker text on colored bg
                              textAlign="center"
                              bg="blue.100" // Lighter blue for Earnings group
                            >
                              EARNINGS
                            </Th>
                          )}

                          {/* Total Gross Pay Header - Use gray border, keep specific bg */}
                          <Th
                            rowSpan={2}
                            borderBottomWidth="2px"
                            borderColor="gray.300" // Softer border
                            color="gray.700" // Darker text on colored bg
                            textAlign="center"
                            verticalAlign="middle"
                            bg="blue.50" // Very light blue for total column
                          >
                            Total Gross
                          </Th>

                          {/* DEDUCTIONS Header - Conditionally Render & Adjust ColSpan */}
                          {deductionsColSpan > 0 && (
                            <Th
                              colSpan={deductionsColSpan}
                              borderBottomWidth="2px"
                              borderColor="gray.300" // Softer border
                              color="gray.700" // Darker text on colored bg
                              textAlign="center"
                              bg="red.100" // Lighter red for Deductions group
                            >
                              DEDUCTIONS
                            </Th>
                          )}

                          {/* Total Deductions Header - Use gray border, keep specific bg */}
                          <Th
                            rowSpan={2}
                            borderBottomWidth="2px"
                            borderColor="gray.300" // Softer border
                            color="gray.700" // Darker text on colored bg
                            textAlign="center"
                            verticalAlign="middle"
                            bg="red.50" // Very light red for total column
                          >
                            Total Deductions
                          </Th>

                          {/* Net Pay Header - Use gray border, keep specific bg */}
                          <Th
                            rowSpan={2}
                            borderBottomWidth="2px"
                            borderColor="gray.300" // Softer border
                            color="gray.700" // Darker text on colored bg
                            textAlign="center"
                            verticalAlign="middle"
                            bg="yellow.100" // Light yellow for Net Pay column
                          >
                            Net Pay
                          </Th>
                        </>
                      );
                    })()}
                  </Tr>
                  <Tr>
                    {/* Earnings Sub-Headers - Conditionally Render - Use gray border, remove specific bg */}
                    {(!hideEmptyColumns ||
                      !emptyColumns.has("earningsAdjustment")) && (
                      <Th
                        borderBottomWidth="2px"
                        borderColor="gray.300" // Softer border
                        color="gray.600" // Match other sub-headers
                        // bg={earningsHeaderBg} // REMOVED bg
                      >
                        {" "}
                        Adjustment{" "}
                      </Th>
                    )}
                    {(!hideEmptyColumns || !emptyColumns.has("overTime")) && (
                      <Th
                        borderBottomWidth="2px"
                        borderColor="gray.300" // Softer border
                        color="gray.600" // Match other sub-headers
                        // bg={earningsHeaderBg} // REMOVED bg
                      >
                        {" "}
                        Over Time{" "}
                      </Th>
                    )}
                    {(!hideEmptyColumns || !emptyColumns.has("holidayPay")) && (
                      <Th
                        borderBottomWidth="2px"
                        borderColor="gray.300" // Softer border
                        color="gray.600" // Match other sub-headers
                        // bg={earningsHeaderBg} // REMOVED bg
                      >
                        {" "}
                        Holiday Pay{" "}
                      </Th>
                    )}
                    {(!hideEmptyColumns || !emptyColumns.has("silPay")) && (
                      <Th
                        borderBottomWidth="2px"
                        borderColor="gray.300" // Softer border
                        color="gray.600" // Match other sub-headers
                        // bg={earningsHeaderBg} // REMOVED bg
                      >
                        {" "}
                        SIL Pay{" "}
                      </Th>
                    )}
                    {(!hideEmptyColumns ||
                      !emptyColumns.has("thirteenthMonth")) && (
                      <Th
                        borderBottomWidth="2px"
                        borderColor="gray.300" // Softer border
                        color="gray.600" // Match other sub-headers
                        // bg={earningsHeaderBg} // REMOVED bg
                      >
                        {" "}
                        13th Month Pay{" "}
                      </Th>
                    )}

                    {/* Deductions Sub-Headers - Conditionally Render - Use gray border, remove specific bg */}
                    {(!hideEmptyColumns ||
                      !emptyColumns.has("deductionsAdjustment")) && (
                      <Th
                        borderBottomWidth="2px"
                        borderColor="gray.300" // Softer border
                        color="gray.600" // Match other sub-headers
                        // bg={deductionsHeaderBg} // REMOVED bg
                      >
                        {" "}
                        Adjustment{" "}
                      </Th>
                    )}
                    {(!hideEmptyColumns || !emptyColumns.has("sss")) && (
                      <Th
                        borderBottomWidth="2px"
                        borderColor="gray.300" // Softer border
                        color="gray.600" // Match other sub-headers
                        // bg={deductionsHeaderBg} // REMOVED bg
                      >
                        {" "}
                        SSS{" "}
                      </Th>
                    )}
                    {(!hideEmptyColumns || !emptyColumns.has("philhealth")) && (
                      <Th
                        borderBottomWidth="2px"
                        borderColor="gray.300" // Softer border
                        color="gray.600" // Match other sub-headers
                        // bg={deductionsHeaderBg} // REMOVED bg
                      >
                        {" "}
                        Philhealth{" "}
                      </Th>
                    )}
                    {(!hideEmptyColumns || !emptyColumns.has("pagibig")) && (
                      <Th
                        borderBottomWidth="2px"
                        borderColor="gray.300" // Softer border
                        color="gray.600" // Match other sub-headers
                        // bg={deductionsHeaderBg} // REMOVED bg
                      >
                        {" "}
                        Pag-IBIG{" "}
                      </Th>
                    )}
                    {(!hideEmptyColumns || !emptyColumns.has("caCharges")) && (
                      <Th
                        borderBottomWidth="2px"
                        borderColor="gray.300" // Softer border
                        color="gray.600" // Match other sub-headers
                        // bg={deductionsHeaderBg} // REMOVED bg
                      >
                        {" "}
                        CA/Charges{" "}
                      </Th>
                    )}
                    {(!hideEmptyColumns ||
                      !emptyColumns.has("withholdingTax")) && (
                      <Th
                        borderBottomWidth="2px"
                        borderColor="gray.300" // Softer border
                        color="gray.600" // Match other sub-headers
                        // bg={deductionsHeaderBg} // REMOVED bg
                      >
                        {" "}
                        W/holding Tax{" "}
                      </Th>
                    )}
                  </Tr>
                </Thead>
                {/* === TBODY (Populate with fetched details) === */}
                <Tbody>
                  {loadingDetails ? (
                    <Tr>
                      {/* Adjust colspan dynamically based on hidden columns */}
                      <Td
                        colSpan={
                          18 - (hideEmptyColumns ? emptyColumns.size : 0)
                        }
                        textAlign="center"
                        py={10}
                      >
                        <Spinner size="xl" color={primaryColor} />
                      </Td>
                    </Tr>
                  ) : detailsError ? (
                    <Tr>
                      <Td
                        colSpan={
                          18 - (hideEmptyColumns ? emptyColumns.size : 0)
                        }
                        textAlign="center"
                        py={10}
                      >
                        <Alert status="error">{detailsError}</Alert>
                      </Td>
                    </Tr>
                  ) : reportDetails.length === 0 ? (
                    <Tr>
                      <Td
                        colSpan={
                          18 - (hideEmptyColumns ? emptyColumns.size : 0)
                        }
                        textAlign="center"
                        py={10}
                      >
                        No details found for this report.
                      </Td>
                    </Tr>
                  ) : (
                    reportDetails.map((record, index) => (
                      <Tr
                        fontSize="xs"
                        key={record._id || index}
                        _hover={{ bg: "gray.50" }}
                      >
                        {/* Data Cells - Start/End Date hidden */}
                        <Td px={3} py={2}>
                          {record.employeeId}
                        </Td>
                        <Td px={3} py={2} whiteSpace="nowrap">
                          {record.name}
                        </Td>
                        <Td px={3} py={2} isNumeric>
                          {pesoFormatter.format(record.monthlyWage || 0)}
                        </Td>
                        <Td px={3} py={2} isNumeric>
                          {record.regularDaysWorked || 0}
                        </Td>
                        {/* Earnings - Conditionally Render */}
                        {(!hideEmptyColumns ||
                          !emptyColumns.has("earningsAdjustment")) && (
                          <Td px={3} py={2} isNumeric>
                            {" "}
                            {pesoFormatter.format(
                              record.earningsAdjustment || 0
                            )}{" "}
                          </Td>
                        )}
                        {(!hideEmptyColumns ||
                          !emptyColumns.has("overTime")) && (
                          <Td px={3} py={2} isNumeric>
                            {" "}
                            {pesoFormatter.format(record.overTime || 0)}{" "}
                          </Td>
                        )}
                        {(!hideEmptyColumns ||
                          !emptyColumns.has("holidayPay")) && (
                          <Td px={3} py={2} isNumeric>
                            {" "}
                            {pesoFormatter.format(record.holidayPay || 0)}{" "}
                          </Td>
                        )}
                        {(!hideEmptyColumns || !emptyColumns.has("silPay")) && (
                          <Td px={3} py={2} isNumeric>
                            {" "}
                            {pesoFormatter.format(record.silPay || 0)}{" "}
                          </Td>
                        )}
                        {(!hideEmptyColumns ||
                          !emptyColumns.has("thirteenthMonth")) && (
                          <Td px={3} py={2} isNumeric>
                            {" "}
                            {pesoFormatter.format(
                              record.thirteenthMonth || 0
                            )}{" "}
                          </Td>
                        )}
                        <Td px={3} py={2} isNumeric fontWeight="medium">
                          {pesoFormatter.format(record.totalGrossPay || 0)}
                        </Td>
                        {/* Deductions - Conditionally Render */}
                        {(!hideEmptyColumns ||
                          !emptyColumns.has("deductionsAdjustment")) && (
                          <Td px={3} py={2} isNumeric>
                            {" "}
                            {pesoFormatter.format(
                              record.deductionsAdjustment || 0
                            )}{" "}
                          </Td>
                        )}
                        {(!hideEmptyColumns || !emptyColumns.has("sss")) && (
                          <Td px={3} py={2} isNumeric>
                            {" "}
                            {pesoFormatter.format(record.sss || 0)}{" "}
                          </Td>
                        )}
                        {(!hideEmptyColumns ||
                          !emptyColumns.has("philhealth")) && (
                          <Td px={3} py={2} isNumeric>
                            {" "}
                            {pesoFormatter.format(record.philhealth || 0)}{" "}
                          </Td>
                        )}
                        {(!hideEmptyColumns ||
                          !emptyColumns.has("pagibig")) && (
                          <Td px={3} py={2} isNumeric>
                            {" "}
                            {pesoFormatter.format(record.pagibig || 0)}{" "}
                          </Td>
                        )}
                        {(!hideEmptyColumns ||
                          !emptyColumns.has("caCharges")) && (
                          <Td px={3} py={2} isNumeric>
                            {" "}
                            {pesoFormatter.format(record.caCharges || 0)}{" "}
                          </Td>
                        )}
                        {(!hideEmptyColumns ||
                          !emptyColumns.has("withholdingTax")) && (
                          <Td px={3} py={2} isNumeric>
                            {" "}
                            {pesoFormatter.format(
                              record.withholdingTax || 0
                            )}{" "}
                          </Td>
                        )}
                        <Td px={3} py={2} isNumeric fontWeight="medium">
                          {pesoFormatter.format(record.totalDeductions || 0)}
                        </Td>
                        {/* Net Pay */}
                        <Td px={3} py={2} isNumeric fontWeight="bold">
                          {pesoFormatter.format(record.netPay || 0)}
                        </Td>
                      </Tr>
                    ))
                  )}
                </Tbody>
                {/* === TFOOT (Use calculated detailTotals) === */}
                <Tfoot
                  bg="gray.50" // Use light gray background for footer
                  fontSize="xs"
                  borderTopWidth="2px"
                  borderColor="gray.300" // Softer border
                >
                  <Tr>
                    {/* Adjust colspan: 4 (ID, Name, Wage, Days) */}
                    <Th
                      colSpan={4}
                      textAlign="right"
                      px={3}
                      py={2} // Add padding
                      color="gray.600" // Match header text color
                    >
                      TOTALS:
                    </Th>
                    {/* Earnings Totals - Conditionally Render */}
                    {(!hideEmptyColumns ||
                      !emptyColumns.has("earningsAdjustment")) && (
                      <Th isNumeric px={3} py={2}>
                        {" "}
                        {pesoFormatter.format(
                          detailTotals.earningsAdjustment
                        )}{" "}
                      </Th>
                    )}
                    {(!hideEmptyColumns || !emptyColumns.has("overTime")) && (
                      <Th isNumeric px={3} py={2}>
                        {" "}
                        {pesoFormatter.format(detailTotals.overTime)}{" "}
                      </Th>
                    )}
                    {(!hideEmptyColumns || !emptyColumns.has("holidayPay")) && (
                      <Th isNumeric px={3} py={2}>
                        {" "}
                        {pesoFormatter.format(detailTotals.holidayPay)}{" "}
                      </Th>
                    )}
                    {(!hideEmptyColumns || !emptyColumns.has("silPay")) && (
                      <Th isNumeric px={3} py={2}>
                        {" "}
                        {pesoFormatter.format(detailTotals.silPay)}{" "}
                      </Th>
                    )}
                    {(!hideEmptyColumns ||
                      !emptyColumns.has("thirteenthMonth")) && (
                      <Th isNumeric px={3} py={2}>
                        {" "}
                        {pesoFormatter.format(
                          detailTotals.thirteenthMonth
                        )}{" "}
                      </Th>
                    )}
                    <Th isNumeric px={3} py={2} fontWeight="medium">
                      {pesoFormatter.format(detailTotals.totalGrossPay)}
                    </Th>
                    {/* Deductions Totals - Conditionally Render */}
                    {(!hideEmptyColumns ||
                      !emptyColumns.has("deductionsAdjustment")) && (
                      <Th isNumeric px={3} py={2}>
                        {" "}
                        {pesoFormatter.format(
                          detailTotals.deductionsAdjustment
                        )}{" "}
                      </Th>
                    )}
                    {(!hideEmptyColumns || !emptyColumns.has("sss")) && (
                      <Th isNumeric px={3} py={2}>
                        {" "}
                        {pesoFormatter.format(detailTotals.sss)}{" "}
                      </Th>
                    )}
                    {(!hideEmptyColumns || !emptyColumns.has("philhealth")) && (
                      <Th isNumeric px={3} py={2}>
                        {" "}
                        {pesoFormatter.format(detailTotals.philhealth)}{" "}
                      </Th>
                    )}
                    {(!hideEmptyColumns || !emptyColumns.has("pagibig")) && (
                      <Th isNumeric px={3} py={2}>
                        {" "}
                        {pesoFormatter.format(detailTotals.pagibig)}{" "}
                      </Th>
                    )}
                    {(!hideEmptyColumns || !emptyColumns.has("caCharges")) && (
                      <Th isNumeric px={3} py={2}>
                        {" "}
                        {pesoFormatter.format(detailTotals.caCharges)}{" "}
                      </Th>
                    )}
                    {(!hideEmptyColumns ||
                      !emptyColumns.has("withholdingTax")) && (
                      <Th isNumeric px={3} py={2}>
                        {" "}
                        {pesoFormatter.format(detailTotals.withholdingTax)}{" "}
                      </Th>
                    )}
                    <Th isNumeric px={3} py={2} fontWeight="medium">
                      {pesoFormatter.format(detailTotals.totalDeductions)}
                    </Th>
                    <Th isNumeric px={3} py={2} fontWeight="bold">
                      {pesoFormatter.format(detailTotals.netPay)}
                    </Th>
                  </Tr>
                </Tfoot>
              </Table>
            </TableContainer>
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Add Signatory Modal */}
      <Modal isOpen={isSignatoryModalOpen} onClose={() => setIsSignatoryModalOpen(false)} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader bg={primaryColor} color="white" borderTopRadius="md">
            Enter Signatory Names
          </ModalHeader>
          <ModalCloseButton
            color="white"
            _focus={{ boxShadow: "none" }}
            _hover={{ bg: "whiteAlpha.300" }}
          />
          <ModalBody pb={6}>
            <FormControl mb={4}>
              <FormLabel>Prepared by (Office In-Charge Name)</FormLabel>
              <Input
                placeholder="Enter Office In-Charge's full name"
                value={hrSecretaryName}
                onChange={(e) => setHrSecretaryName(e.target.value)}
              />
            </FormControl>
            <FormControl mb={4}>
              <FormLabel>Prepared by (Office In-Charge Position)</FormLabel>
              <Input
                placeholder="Enter Office In-Charge's position"
                value={hrSecretaryPosition}
                onChange={(e) => setHrSecretaryPosition(e.target.value)}
              />
            </FormControl>
            <FormControl mb={4}>
              <FormLabel>Noted by (Office In-Charge Name)</FormLabel>
              <Input
                placeholder="Enter Office In-Charge's full name"
                value={adminHeadName}
                onChange={(e) => setAdminHeadName(e.target.value)}
              />
            </FormControl>
            <FormControl mb={4}>
              <FormLabel>Noted by (Office In-Charge Position)</FormLabel>
              <Input
                placeholder="Enter Office In-Charge's position"
                value={adminHeadPosition}
                onChange={(e) => setAdminHeadPosition(e.target.value)}
              />
            </FormControl>
            <FormControl>
              <FormLabel>Approved by (Office In-Charge Name)</FormLabel>
              <Input
                placeholder="Enter Office In-Charge's full name"
                value={coProprietorName}
                onChange={(e) => setCoProprietorName(e.target.value)}
              />
            </FormControl>
            {/* Added mt={4} for spacing */}
            <FormControl mt={4}>
              <FormLabel>Approved by (Office In-Charge Position)</FormLabel>
              <Input
                placeholder="Enter Office In-Charge's position"
                value={coProprietorPosition}
                onChange={(e) => setCoProprietorPosition(e.target.value)}
              />
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <Button
              colorScheme="blue"
              mr={3}
              onClick={generatePdfWithSignatories}
            >
              Generate PDF
            </Button>
            <Button
              variant="outline"
              colorScheme="red"
              onClick={() => setIsSignatoryModalOpen(false)}
            >
              Cancel
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* New Modal for Payslip Approver Name */}
      <Modal isOpen={isPayslipApproverModalOpen} onClose={() => setIsPayslipApproverModalOpen(false)} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader bg={primaryColor} color="white" borderTopRadius="md">
            Enter Payslip Approver Name
          </ModalHeader>
          <ModalCloseButton
            color="white"
            _focus={{ boxShadow: "none" }}
            _hover={{ bg: "whiteAlpha.300" }}
          />
          <ModalBody pb={6}>
            <FormControl>
              <FormLabel>Approver's Name (for Payslips)</FormLabel>
              <Input
                placeholder="Enter full name of approver"
                value={payslipApproverName}
                onChange={(e) => setPayslipApproverName(e.target.value)}
              />
            </FormControl>
            <FormControl>
              <FormLabel>Approver's Position (for Payslips)</FormLabel>
              <Input
                placeholder="Enter approver's position"
                value={payslipApproverPosition}
                onChange={(e) => setPayslipApproverPosition(e.target.value)}
              />
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <Button
              colorScheme="blue"
              mr={3}
              onClick={generatePayslipsWithApprover} // This function will be created next
              isDisabled={isGeneratingPayslips}
            >
              Confirm & Generate Payslips
            </Button>
            <Button
              variant="outline"
              colorScheme="red"
              onClick={() => setIsPayslipApproverModalOpen(false)}
            >
              Cancel
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

    </MotionBox>
  );
};

export default CargoMonthlyReportComp;
