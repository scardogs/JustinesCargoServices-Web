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
import { FaFilePdf } from "react-icons/fa";

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

// Currency Formatter (for UI display with Peso Sign)
const pesoFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
});

// Currency Formatter without symbol for PDF and Payslip
const numberFormatter = new Intl.NumberFormat("en-PH", {
  style: "decimal",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

// --- RENAME Component ---
const CargoPerTripReportComp = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [payrollData, setPayrollData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const toast = useToast();

  // Add state for employee positions
  const [employeePositions, setEmployeePositions] = useState({});

  // Add state for signatory names (Main Report PDF)
  const [hrSecretaryName, setHrSecretaryName] = useState("");
  const [hrSecretaryPosition, setHrSecretaryPosition] = useState("");
  const [adminHeadName, setAdminHeadName] = useState("");
  const [adminHeadPosition, setAdminHeadPosition] = useState("");
  const [coProprietorName, setCoProprietorName] = useState("");
  const [coProprietorPosition, setCoProprietorPosition] = useState("");
  const [isSignatoryModalOpen, setIsSignatoryModalOpen] = useState(false);

  // State for Payslip Approver (Payslip PDF)
  const [payslipApproverName, setPayslipApproverName] = useState("");
  const [payslipApproverPosition, setPayslipApproverPosition] = useState("");
  const [isPayslipApproverModalOpen, setIsPayslipApproverModalOpen] = useState(false);
  const [isGeneratingPayslips, setIsGeneratingPayslips] = useState(false);

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
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // State for column visibility toggle (like monthly)
  const [hideEmptyColumns, setHideEmptyColumns] = useState(false);
  const [emptyColumns, setEmptyColumns] = useState(new Set());
  const [canToggleColumns, setCanToggleColumns] = useState(false);

  // Color scheme constants
  const primaryColor = "#800020";
  const secondaryColor = "#1a365d";
  const headerBg = "white";
  const earningsHeaderBg = "#ADD8E6";
  const deductionsHeaderBg = "#FFB6C1";
  const netPayHeaderBg = "#FFFFE0";
  const earningsColBg = "#E0F7FA";
  const deductionsColBg = "#FFF0F5";
  const netPayColBg = "#FFFACD";

  // Format date range
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

  // Format date
  const formatDateForDisplay = (dateString) => {
    if (!dateString) return "";
    try {
      return format(parseISO(dateString), "yyyy-MM-dd");
    } catch (e) {
      console.error("Error formatting date:", e);
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

  // Handle Apply Date Range
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

  // --- UPDATE: useEffect for Per Trip Reports ---
  useEffect(() => {
    const fetchLatestSummary = async () => {
      setIsLoading(true);
      setError(null);
      setPayrollData(null);
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Authentication token not found.");
        setIsLoading(false);
        return;
      }
      if (!periodStartDate || !periodEndDate) {
        setError("Please select a valid period.");
        setIsLoading(false);
        return;
      }

      try {
        // --- UPDATE API ENDPOINT ---
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_BACKEND_API}/api/reports/payroll/per-trip-cargo/latest-summary`,
          {
            params: { startDate: periodStartDate, endDate: periodEndDate },
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setPayrollData(response.data);
      } catch (err) {
        console.error("Error fetching latest per-trip report summary:", err);
        setError(
          err.response?.data?.message ||
            "Failed to fetch per-trip report summary."
        );
      } finally {
        setIsLoading(false);
      }
    };
    fetchLatestSummary();
  }, [periodStartDate, periodEndDate]); // Removed toast dependency if not used in error handling

  // Helper function needed for identifying empty columns (like monthly)
  const calculateDetailTotals = (details) => {
    return (details || []).reduce(
      (acc, record) => {
        acc.tripRate += parseFloat(record.tripRate) || 0;
        acc.numberOfTrips += parseFloat(record.numberOfTrips) || 0;
        acc.basicPayForPeriod += parseFloat(record.basicPayForPeriod) || 0;
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
        tripRate: 0,
        numberOfTrips: 0,
        basicPayForPeriod: 0,
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

  // --- UPDATE: handleViewDetails for Per Trip Reports ---
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
    setReportDetails([]);
    const token = localStorage.getItem("token");
    if (!token) {
      setDetailsError("Authentication token not found.");
      setLoadingDetails(false);
      return;
    }

    try {
      // --- UPDATE API ENDPOINT ---
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/reports/payroll/per-trip-cargo/${reportObjectId}/details`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setReportDetails(response.data || []);

      // --- Identify empty columns based on totals (like monthly) ---
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
      const totalsForEmptyCheck = calculateDetailTotals(response.data || []);
      potentiallyEmptyKeys.forEach((key) => {
        if (totalsForEmptyCheck[key] === 0) {
          currentlyEmpty.add(key);
        }
      });
      setEmptyColumns(currentlyEmpty);
      setCanToggleColumns(currentlyEmpty.size > 0);
      setHideEmptyColumns(false); // Reset toggle state

      onDetailsModalOpen();
    } catch (err) {
      console.error(
        `Error fetching per-trip report details for ID ${reportObjectId}:`,
        err
      );
      const errorMsg =
        err.response?.data?.message ||
        "Failed to fetch per-trip report details.";
      setDetailsError(errorMsg);
      toast({
        title: "Error Fetching Per Trip Details",
        description: errorMsg,
        status: "error",
      }); // Keep toast here
    } finally {
      setLoadingDetails(false);
    }
  };

  // Summary data (remains same structure)
  const employeeCount = payrollData ? payrollData.noOfEmployees : 0;
  const dateGenerated = payrollData
    ? format(parseISO(payrollData.dateGenerated), "MMM d, yyyy HH:mm")
    : "N/A";
  const reportMongoId = payrollData ? payrollData._id : null;

  // --- UPDATE: Calculate detailTotals for Per Trip (UI, PDF uses this via calculateDetailTotals) ---
  const detailTotals = useMemo(() => {
    return calculateDetailTotals(reportDetails);
  }, [reportDetails]);

  // Add handleGeneratePdf function
  const handleGeneratePdf = () => {
    if (!reportDetails || reportDetails.length === 0) {
      toast({ title: "No data to generate PDF", status: "warning" });
      return;
    }
    // Open the signatory modal instead of generating PDF directly
    setIsSignatoryModalOpen(true);
  };

  // Add generatePdfWithSignatories function
  const generatePdfWithSignatories = () => {
    // Close the modal
    setIsSignatoryModalOpen(false);

    // Adjusted allColumns for Per Trip PDF, referencing cargoMonthlyReportComp.js for style and user image for headers
    const allColumns = [
      {
        key: "employeeId",
        header: "Employee ID",
        type: "info",
        style: { cellWidth: 40 },
      },
      { key: "name", header: "Name", type: "info", style: { cellWidth: 80 } },
      {
        key: "tripRate", // Changed from monthlyWage
        header: "Monthly Wage", // Header as per user image for "PER TRIP PAYROLL"
        type: "info",
        style: { cellWidth: 50, halign: "right" },
      },
      {
        key: "numberOfTrips", // Changed from regularDaysWorked
        header: "Days Worked", // Header as per user image for "PER TRIP PAYROLL"
        type: "info",
        style: { cellWidth: 40, halign: "right" },
      },
      // Basic Pay is part of record.basicPayForPeriod, often displayed but not a top-level group here based on image
      // It is used in the UI table and totals, but PDF structure from image is different.
      // For PDF body, we might need a 'basicPayForPeriod' column if it's meant to be displayed directly.
      // The provided image does not show "Basic Pay" as a separate column with rowspan 2.
      // It's typically part of earnings calculation leading to Total Gross.
      // The UI table has it, the PDF image provided for this request does not.
      // Sticking to image for PDF headers.

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
        header: "Total Gross", // Changed header
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
      if (
        col.type === "info" ||
        col.type === "earningTotal" ||
        col.type === "deductionTotal" ||
        col.type === "net"
      ) {
        return true;
      }
      // Assuming hideEmptyColumns and emptyColumns state are managed as in cargoMonthlyReportComp
      // For now, let's assume all columns are visible for simplicity of this specific refactor,
      // or that hideEmptyColumns logic is correctly implemented elsewhere if needed for PDF.
      // The user's current request is about header structure and sizing.
      // if (hideEmptyColumns && emptyColumns.has(col.key)) { // This logic depends on hideEmptyColumns state
      //     return false;
      //   }
      return true;
    });

    const visibleInfoColumns = visibleColumns.filter(col => col.type === "info");
    const visibleEarningsSubColumns = visibleColumns.filter(
      (col) => col.type === "earning"
    );
    const visibleDeductionsSubColumns = visibleColumns.filter(
      (col) => col.type === "deduction"
    );

    // --- Generate PDF Content Dynamically ---
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "pt",
      format: "legal" // Keep legal format as it was
    });

    // Add title and subtitle (remains same)
    doc.setFontSize(16);
    doc.setFont(undefined, "bold");
    doc.text("JUSTINE'S CARGO SERVICES", doc.internal.pageSize.getWidth() / 2, 35, {
      align: "center",
    });

    doc.setFontSize(14);
    // Title from image is "PER TRIP PAYROLL"
    doc.text("PER TRIP PAYROLL", doc.internal.pageSize.getWidth() / 2, 55, {
      align: "center",
    });

    doc.setFontSize(10);
    doc.setFont(undefined, "normal");
    doc.text(
      `Period Covered: ${formatDateRange(periodStartDate, periodEndDate)}`,
      doc.internal.pageSize.getWidth() / 2,
      75,
      { align: "center" }
    );

    // --- Reconstruct Head ---
    const headRow1 = [];
    const commonRowSpanHeaderStyles = {
        halign: "center",
        valign: "middle",
        fillColor: headerBg, // Assuming headerBg is defined (e.g., "white")
        textColor: [0,0,0], // Black text
        fontStyle: "bold",
        lineWidth: { bottom: 1, top: 0.5, left: 0.5, right: 0.5 }, // Match monthly
        lineColor: [0,0,0], // Match monthly
    };

    // Info columns that span 2 rows
    visibleInfoColumns.forEach(col => {
        headRow1.push({ content: col.header, rowSpan: 2, styles: { ...commonRowSpanHeaderStyles, ...col.style } });
    });
    
    // Earnings Group Header
    if (visibleEarningsSubColumns.length > 0) {
      headRow1.push({
        content: "EARNINGS",
        colSpan: visibleEarningsSubColumns.length,
        styles: { ...commonRowSpanHeaderStyles, fillColor: "#ADD8E6" }, // Light blue
      });
    }

    // Total Gross Pay Header
    const totalGrossCol = visibleColumns.find(col => col.key === 'totalGrossPay');
    if (totalGrossCol) {
        headRow1.push({ content: totalGrossCol.header, rowSpan: 2, styles: { ...commonRowSpanHeaderStyles, fillColor: "#E0F7FA", ...totalGrossCol.style } }); // Lighter blue
    }

    // Deductions Group Header
    if (visibleDeductionsSubColumns.length > 0) {
      headRow1.push({
        content: "DEDUCTIONS",
        colSpan: visibleDeductionsSubColumns.length,
        styles: { ...commonRowSpanHeaderStyles, fillColor: "#FFB6C1" }, // Light pink
      });
    }
    
    // Total Deductions Header
    const totalDeductionsCol = visibleColumns.find(col => col.key === 'totalDeductions');
    if (totalDeductionsCol) {
        headRow1.push({ content: totalDeductionsCol.header, rowSpan: 2, styles: { ...commonRowSpanHeaderStyles, fillColor: "#FFF0F5", ...totalDeductionsCol.style } }); // Lighter pink
    }

    // Net Pay Header
    const netPayCol = visibleColumns.find(col => col.key === 'netPay');
    if (netPayCol) {
        headRow1.push({ content: netPayCol.header, rowSpan: 2, styles: { ...commonRowSpanHeaderStyles, fillColor: "#FFFFE0", ...netPayCol.style } }); // Light yellow
    }
    
    const headRow2 = [];
    // Earnings Sub-Headers
    visibleEarningsSubColumns.forEach((col) => {
      headRow2.push({ content: col.header, styles: { ...commonRowSpanHeaderStyles, fillColor: "#ADD8E6", ...col.style } });
    });
    // Deductions Sub-Headers
    visibleDeductionsSubColumns.forEach((col) => {
      headRow2.push({ content: col.header, styles: { ...commonRowSpanHeaderStyles, fillColor: "#FFB6C1", ...col.style } });
    });

    const head = [headRow1];
    if (headRow2.length > 0) {
        head.push(headRow2);
    }

    // --- Body Rows ---
    const body = reportDetails.map((record) => {
      const row = [];
      visibleColumns.forEach((col) => {
        let value = record[col.key];
        let content = "";
        // Default style, can be overridden by col.style
        let cellStyle = { halign: "left", valign: "middle" };

        if (col.key === "employeeId" && value !== undefined && value !== null) {
          content = String(value).split(".")[0]; // Remove decimal for Employee ID
        } else if (col.key === "numberOfTrips" && value !== undefined && value !== null) {
            content = String(value); // Number of trips is not currency
            cellStyle.halign = "right";
        } else if (typeof value === 'string' && (value.includes('₱') || !isNaN(parseFloat(value.replace(/[^0-9.-]+/g,"")))) && col.type !== "info") {
            // If it's a pre-formatted currency string from somewhere, try to parse, otherwise use as is for info
            const numValue = parseFloat(value.replace(/[^0-9.-]+/g,""));
            content = !isNaN(numValue) ? numberFormatter.format(numValue) : (value || "0.00");
            cellStyle.halign = "right";
        } else if (typeof value === "number") {
          content = numberFormatter.format(value);
          cellStyle.halign = "right";
        } else {
          content = value || (col.type !== "info" && col.key !== "name" ? "0.00" : ""); // Default for non-numeric, non-info, non-name
          if (col.type !== "info" && col.key !== "name") cellStyle.halign = "right";
        }
        
        // Apply column-specific styles (like cellWidth) and background colors
        cellStyle = {...cellStyle, ...col.style}; // Merge with column's defined style

        if (col.type === "earning" || col.key === "totalGrossPay") cellStyle.fillColor = "#E0F7FA"; // Match Total Gross cell
        if (col.type === "deduction" || col.key === "totalDeductions") cellStyle.fillColor = "#FFF0F5"; // Match Total Ded cell
        if (col.key === "netPay") cellStyle.fillColor = "#FFFACD"; // Match Net Pay cell
        if (col.key === "totalGrossPay" || col.key === "totalDeductions" || col.key === "netPay") cellStyle.fontStyle = "bold";


        row.push({ content: content, styles: cellStyle });
      });
      return row;
    });

    // --- Footer Row ---
    const footRow = [];
    // Add TOTALS label with correct colspan
    if (visibleInfoColumns.length > 0) {
      footRow.push({
        content: "TOTALS:",
        colSpan: visibleInfoColumns.length, // Span across Employee ID, Name, "Monthly Wage", "Days Worked"
        styles: { halign: "right", fontStyle: "bold", fillColor: "#f0f0f0", valign: "middle" },
      });
    }
    
    // Add totals for other visible columns
    visibleColumns.forEach((col) => {
      if (col.type === "info") return; // Skip info columns in footer totals

      let value = detailTotals[col.key];
      let content = "";
      let cellStyle = { halign: "right", fontStyle: "bold", valign: "middle" };

      if (col.key === "numberOfTrips" && value !== undefined && value !== null) {
        content = String(value || 0);
      } else {
        content = numberFormatter.format(value || 0);
      }

      // Apply specific background colors based on type, similar to body
      if (col.type === "earning" || col.key === "totalGrossPay") cellStyle.fillColor = "#E0F7FA";
      if (col.type === "deduction" || col.key === "totalDeductions") cellStyle.fillColor = "#FFF0F5";
      if (col.key === "netPay") cellStyle.fillColor = "#FFFACD";
      else if (col.type !== "earning" && col.type !== "deduction") cellStyle.fillColor = "#f0f0f0";

      footRow.push({ content: content, styles: {...cellStyle, ...col.style} });
    });
    const foot = [footRow];
    
    // --- Column Styles for autoTable ---
    const pdfColumnStyles = {};
    visibleColumns.forEach((col, index) => {
      pdfColumnStyles[index] = { ...col.style }; // Use spread to ensure all styles like halign, cellWidth are applied
    });

    // Generate table
    autoTable(doc, {
      head: head,
      body: body,
      foot: foot,
      startY: 90, // Adjusted Y position
      theme: "grid",
      margin: { top: 40, right: 20, bottom: 70, left: 100 }, // Reverted left margin to 100
      styles: { // Base styles
        font: "helvetica",
        fontSize: 8,
        cellPadding: 2, // Increased padding slightly from 0.5 for readability
        textColor: [0, 0, 0],
        overflow: "linebreak", // Important for long names
        lineWidth: 0.5,
        lineColor: [180, 180, 180], // Softer grid lines
      },
      headStyles: { // Overrides for head
        fontStyle: "bold",
        fontSize: 8,
        lineWidth: { bottom: 1, top: 0.5, left: 0.5, right: 0.5 }, // Match monthly
        lineColor: [0, 0, 0], // Match monthly
        valign: "middle",
        // fillColor is set per cell in head construction
      },
      footStyles: { // Overrides for foot
        fontStyle: "bold",
        fontSize: 8,
        lineWidth: 0.5,
        lineColor: [0, 0, 0],
        // fillColor is set per cell in foot construction
        valign: "middle",
      },
      columnStyles: pdfColumnStyles, // Apply column-specific styles (like cellWidth, halign)
      didDrawPage: (data) => {
        // Add footer with signatures
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const leftOffset = 100; // Reverted leftOffset to 100
        
        doc.setFillColor(255, 255, 255);
        doc.rect(0, pageHeight - 70, pageWidth, 70, 'F');
        
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        
        const footerY = pageHeight - 55;
        const colWidth = (pageWidth - leftOffset) / 3;
        
        // Labels
        doc.text("Prepared by:", leftOffset + colWidth/6, footerY, { align: "left" });
        doc.text("Noted by:", leftOffset + colWidth + colWidth/6, footerY, { align: "left" });
        doc.text("Approved by:", leftOffset + colWidth*2 + colWidth/6, footerY, { align: "left" });
        
        const afterLabelY = footerY + 10;
        const sigIndent = 40;
        
        // Names
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
        
        // Lines
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.5);
        doc.line(leftOffset + colWidth/6 + sigIndent, afterLabelY + 7, leftOffset + colWidth/6 + sigIndent + colWidth*2/3, afterLabelY + 7);
        doc.line(leftOffset + colWidth + colWidth/6 + sigIndent, afterLabelY + 7, leftOffset + colWidth + colWidth/6 + sigIndent + colWidth*2/3, afterLabelY + 7);
        doc.line(leftOffset + colWidth*2 + colWidth/6 + sigIndent, afterLabelY + 7, leftOffset + colWidth*2 + colWidth/6 + sigIndent + colWidth*2/3, afterLabelY + 7);
        
        // Positions
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
      },
    });

    // Save PDF
    const startDateStr = formatDateForFilename(periodStartDate);
    const endDateStr = formatDateForFilename(periodEndDate);
    const filename = `Cargo_Per_Trip_Payroll_Details_${startDateStr}_to_${endDateStr}.pdf`;
    doc.save(filename);

    toast({
      title: "PDF Generated",
      description: `${filename} saved.`,
      status: "success",
    });
  };

  // --- Payslip Generation Logic ---
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

  const generatePayslipsWithApprover = async () => {
    setIsPayslipApproverModalOpen(false); // Close the modal
    setIsGeneratingPayslips(true);
    try {
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "pt",
        format: "legal"
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
            label: "Trip Rate:",
            value: numberFormatter.format(record.tripRate || 0),
          },
          {
            label: "No. of Trips:",
            value: String(record.numberOfTrips || "-"),
          },
          {
            label: "Basic Pay:",
            value: numberFormatter.format(record.basicPayForPeriod || 0),
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

  // Add useEffect to fetch employee positions when details modal is opened
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

  // Function to check if a column is empty
  const isColumnEmpty = (key, data) => {
    return data.every(item => {
      const value = item[key];
      return value === undefined || value === null || value === 0 || value === "0" || value === "";
    });
  };

  // Function to identify empty columns
  const identifyEmptyColumns = (data) => {
    const empty = new Set();
    const columnsToCheck = [
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
      "withholdingTax"
    ];

    columnsToCheck.forEach(key => {
      if (isColumnEmpty(key, data)) {
        empty.add(key);
      }
    });

    setEmptyColumns(empty);
  };

  // Update useEffect to identify empty columns when data changes
  useEffect(() => {
    if (reportDetails && reportDetails.length > 0) {
      identifyEmptyColumns(reportDetails);
    }
  }, [reportDetails]);

  // Modify the table rendering to use hideEmptyColumns
  const visibleColumns = useMemo(() => {
    const allColumns = [
      { key: "employeeId", header: "Employee ID" },
      { key: "name", header: "Name" },
      { key: "monthlyWage", header: "Monthly Wage" },
      { key: "regularDaysWorked", header: "Days Worked" },
      { key: "earningsAdjustment", header: "Adjustment", group: "EARNINGS" },
      { key: "overTime", header: "Over Time", group: "EARNINGS" },
      { key: "holidayPay", header: "Holiday Pay", group: "EARNINGS" },
      { key: "silPay", header: "SIL Pay", group: "EARNINGS" },
      { key: "thirteenthMonth", header: "13th Month", group: "EARNINGS" },
      { key: "totalGrossPay", header: "Total Gross" },
      { key: "deductionsAdjustment", header: "Adjustment", group: "DEDUCTIONS" },
      { key: "sss", header: "SSS", group: "DEDUCTIONS" },
      { key: "philhealth", header: "Philhealth", group: "DEDUCTIONS" },
      { key: "pagibig", header: "Pag-IBIG", group: "DEDUCTIONS" },
      { key: "caCharges", header: "CA/Charges", group: "DEDUCTIONS" },
      { key: "withholdingTax", header: "W/holding Tax", group: "DEDUCTIONS" },
      { key: "totalDeductions", header: "Total Deductions" },
      { key: "netPay", header: "Net Pay" }
    ];

    if (!hideEmptyColumns) return allColumns;

    return allColumns.filter(col => {
      // Always show non-earning/deduction columns and totals
      if (!col.group && col.key !== "totalGrossPay" && col.key !== "totalDeductions" && col.key !== "netPay") {
        return true;
      }
      // Hide empty earning/deduction columns
      return !emptyColumns.has(col.key);
    });
  }, [hideEmptyColumns, emptyColumns]);

  return (
    <MotionBox>
      <Box p={0}>
        {/* Header Controls (remains same) */}
        <Flex justify="space-between" align="center" mb={4} wrap="wrap" gap={2}>
          <HStack spacing={3} ml="auto" align="center">
            {" "}
            {/* Align center vertically */}
            <Box textAlign="right" mr={2}>
              {" "}
              {/* Add margin */}
              <Text fontSize="sm" fontWeight="medium" color={secondaryColor}>
                Report Period:
              </Text>{" "}
              {/* Use secondaryColor */}
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

        {/* Summary Table (remains same structure) */}
        <Box
          borderWidth="1px"
          borderRadius="lg"
          borderColor={secondaryColor}
          boxShadow="sm"
          overflow="hidden"
        >
          {" "}
          {/* Use secondaryColor */}
          <TableContainer>
            <Table variant="simple" size="sm">
              <Thead bg="gray.50">
                {" "}
                {/* Light background */}
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
                    {" "}
                    {/* Add hover */}
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
            </Table>
          </TableContainer>
        </Box>
      </Box>

      {/* Date Range Modal (remains same) */}
      <Modal isOpen={isDateModalOpen} onClose={onDateModalClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader bg={primaryColor} color="white" borderTopRadius="md">
            Set Report Period
          </ModalHeader>{" "}
          {/* Style header */}
          <ModalCloseButton
            color="white"
            _focus={{ boxShadow: "none" }}
            _hover={{ bg: "whiteAlpha.300" }}
          />{" "}
          {/* Style close button */}
          <ModalBody pb={6}>
            <FormControl mb={4}>
              {" "}
              <FormLabel>Start Date</FormLabel>{" "}
              <Input
                type="date"
                value={tempStartDate}
                onChange={(e) => setTempStartDate(e.target.value)}
              />{" "}
            </FormControl>
            <FormControl>
              {" "}
              <FormLabel>End Date</FormLabel>{" "}
              <Input
                type="date"
                value={tempEndDate}
                onChange={(e) => setTempEndDate(e.target.value)}
                min={tempStartDate}
              />{" "}
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
            </Button>{" "}
            {/* Style cancel button */}
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* --- UPDATE: Details Modal for Per Trip --- */}
      <Modal
        isOpen={isDetailsModalOpen}
        onClose={onDetailsModalClose}
        isCentered
        size="full"
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader bg={primaryColor} color="white" borderTopRadius="md">
            Per Trip Payroll Details -{" "}
            {formatDateRange(periodStartDate, periodEndDate)}
          </ModalHeader>{" "}
          {/* Style header */}
          <ModalCloseButton
            color="white"
            _focus={{ boxShadow: "none" }}
            _hover={{ bg: "whiteAlpha.300" }}
          />{" "}
          {/* Style close button */}
          <ModalBody p={6} overflowX="auto">
            {/* === Parent Flex for Top Controls === */}
            <Flex justify="space-between" align="center" mb={4} w="100%">
              {/* --- Hide Empty Columns Toggle (Left Side) --- */}
              <Box>
              {/* The FormControl and Switch for hiding empty columns will be removed from here */}
              </Box>

              {/* --- Generate PDF and Payslip Buttons (Right Side) --- */}
              <HStack spacing={3}>
              <Button
                  colorScheme="blue"
                  onClick={handleGeneratePdf}
                  isDisabled={loadingDetails || reportDetails.length === 0}
                  leftIcon={<DownloadIcon />}
                  size="sm"
              >
                  Generate PDF
              </Button>
                <Button
                  colorScheme="teal"
                  onClick={handleGeneratePayslips}
                  isDisabled={
                    loadingDetails ||
                    reportDetails.length === 0 ||
                    isGeneratingPayslips
                  }
                  isLoading={isGeneratingPayslips}
                  size="sm"
                >
                  Generate Multiple Payslip
                </Button>
              </HStack>
            </Flex>
            <Box p={4} pt={0}>
              <Flex justify="space-between" align="center" mb={4}>
                <Text fontSize="lg" fontWeight="bold">
                  Payroll Details
                </Text>
              </Flex>
              {/* Add border and shadow to the container */}
            <TableContainer maxHeight="calc(100vh - 250px)" overflowY="auto">
              <Table
                variant="simple"
                size="sm"
                className="payroll-details-table"
              >
                <Thead position="sticky" top={0} zIndex={1} bg="white" boxShadow="sm">
                  <Tr>
                    <Th colSpan={4} borderBottomWidth="2px" borderColor={secondaryColor} textAlign="center" verticalAlign="middle">
                      <VStack spacing={1} align="center" py={1}>
                        <Text fontSize="xs" fontWeight="semibold" color={secondaryColor} textTransform="uppercase">
                          Period Covered
                        </Text>
                        <Text fontWeight="bold" fontSize="sm" textTransform="none" color={primaryColor}>
                          {formatDateRange(periodStartDate, periodEndDate)}
                        </Text>
                      </VStack>
                    </Th>
                    {/* Core Info */}
                    <Th rowSpan={2} borderBottomWidth="2px" borderColor={secondaryColor} color={secondaryColor} textAlign="center" verticalAlign="middle">
                      Employee ID
                    </Th>
                    <Th rowSpan={2} borderBottomWidth="2px" borderColor={secondaryColor} color={secondaryColor} textAlign="center" verticalAlign="middle">
                      Name
                    </Th>
                    {/* Per Trip Specific */}
                    <Th rowSpan={2} borderBottomWidth="2px" borderColor={secondaryColor} color={secondaryColor} textAlign="center" verticalAlign="middle">
                      Trip Rate
                    </Th>
                    <Th rowSpan={2} borderBottomWidth="2px" borderColor={secondaryColor} color={secondaryColor} textAlign="center" verticalAlign="middle">
                      No. of Trips
                    </Th>
                    {/* Calculated */}
                    <Th rowSpan={2} borderBottomWidth="2px" borderColor={secondaryColor} color={secondaryColor} textAlign="center" verticalAlign="middle" bg={earningsHeaderBg}>
                      Basic Pay
                    </Th>
                    {/* Earnings Group */}
                    <Th colSpan={5} borderBottomWidth="2px" borderColor={secondaryColor} color="black" textAlign="center" bg={earningsHeaderBg}>
                      EARNINGS
                    </Th>
                    <Th rowSpan={2} borderBottomWidth="2px" borderColor={secondaryColor} color={secondaryColor} textAlign="center" verticalAlign="middle" bg={earningsColBg}>
                      Total Gross Pay
                    </Th>
                    {/* Deductions Group */}
                    <Th colSpan={6} borderBottomWidth="2px" borderColor={secondaryColor} color="black" textAlign="center" bg={deductionsHeaderBg}>
                      DEDUCTIONS
                    </Th>
                    <Th rowSpan={2} borderBottomWidth="2px" borderColor={secondaryColor} color={secondaryColor} textAlign="center" verticalAlign="middle" bg={deductionsColBg}>
                      Total Deductions
                    </Th>
                    <Th rowSpan={2} borderBottomWidth="2px" borderColor={secondaryColor} color={secondaryColor} textAlign="center" verticalAlign="middle" bg={netPayHeaderBg}>
                      Net Pay
                    </Th>
                  </Tr>
                  <Tr>
                    {/* Placeholders */}
                    <Th borderBottomWidth="2px" borderColor={secondaryColor}></Th>
                    <Th borderBottomWidth="2px" borderColor={secondaryColor}></Th>
                    <Th borderBottomWidth="2px" borderColor={secondaryColor}></Th>
                    <Th borderBottomWidth="2px" borderColor={secondaryColor}></Th>
                    {/* Spanned by ID, Name, Trip Rate, No. Trips, Basic Pay */}
                    {/* Earnings Headers */}
                    {!hideEmptyColumns || !emptyColumns.has("earningsAdjustment") ? (
                      <Th borderBottomWidth="2px" borderColor={secondaryColor} color="black" bg={earningsHeaderBg}>
                      Adjustment
                    </Th>
                    ) : null}
                    {!hideEmptyColumns || !emptyColumns.has("overTime") ? (
                      <Th borderBottomWidth="2px" borderColor={secondaryColor} color="black" bg={earningsHeaderBg}>
                      Over Time
                    </Th>
                    ) : null}
                    {!hideEmptyColumns || !emptyColumns.has("holidayPay") ? (
                      <Th borderBottomWidth="2px" borderColor={secondaryColor} color="black" bg={earningsHeaderBg}>
                      Holiday Pay
                    </Th>
                    ) : null}
                    {!hideEmptyColumns || !emptyColumns.has("silPay") ? (
                      <Th borderBottomWidth="2px" borderColor={secondaryColor} color="black" bg={earningsHeaderBg}>
                      SIL Pay
                    </Th>
                    ) : null}
                    {!hideEmptyColumns || !emptyColumns.has("thirteenthMonth") ? (
                      <Th borderBottomWidth="2px" borderColor={secondaryColor} color="black" bg={earningsHeaderBg}>
                      13th Month Pay
                    </Th>
                    ) : null}
                    {/* Spanned by Total Gross */}
                    {/* Deductions Headers */}
                    {!hideEmptyColumns || !emptyColumns.has("deductionsAdjustment") ? (
                      <Th borderBottomWidth="2px" borderColor={secondaryColor} color="black" bg={deductionsHeaderBg}>
                      Adjustment
                    </Th>
                    ) : null}
                    {!hideEmptyColumns || !emptyColumns.has("sss") ? (
                      <Th borderBottomWidth="2px" borderColor={secondaryColor} color="black" bg={deductionsHeaderBg}>
                      SSS
                    </Th>
                    ) : null}
                    {!hideEmptyColumns || !emptyColumns.has("philhealth") ? (
                      <Th borderBottomWidth="2px" borderColor={secondaryColor} color="black" bg={deductionsHeaderBg}>
                      Philhealth
                    </Th>
                    ) : null}
                    {!hideEmptyColumns || !emptyColumns.has("pagibig") ? (
                      <Th borderBottomWidth="2px" borderColor={secondaryColor} color="black" bg={deductionsHeaderBg}>
                      Pag-IBIG
                    </Th>
                    ) : null}
                    {!hideEmptyColumns || !emptyColumns.has("caCharges") ? (
                      <Th borderBottomWidth="2px" borderColor={secondaryColor} color="black" bg={deductionsHeaderBg}>
                      CA/Charges
                    </Th>
                    ) : null}
                    {!hideEmptyColumns || !emptyColumns.has("withholdingTax") ? (
                      <Th borderBottomWidth="2px" borderColor={secondaryColor} color="black" bg={deductionsHeaderBg}>
                      W/holding Tax
                    </Th>
                    ) : null}
                    {/* Spanned by Total Deductions, Net Pay */}
                  </Tr>
                </Thead>
                <Tbody>
                  {loadingDetails ? (
                    <Tr>
                      <Td colSpan={23} textAlign="center" py={10}>
                        <Spinner size="xl" color={primaryColor} />
                      </Td>
                    </Tr>
                  ) : detailsError ? (
                    <Tr>
                      <Td colSpan={23} textAlign="center" py={10}>
                        <Alert status="error">{detailsError}</Alert>
                      </Td>
                    </Tr>
                  ) : reportDetails.length === 0 ? (
                    <Tr>
                      <Td colSpan={23} textAlign="center" py={10}>
                        No details found for this report.
                      </Td>
                    </Tr>
                  ) : (
                    reportDetails.map((record, index) => (
                      <Tr key={index} fontSize="xs" _hover={{ bg: "gray.50" }}>
                        {/* Placeholders */}
                        <Td px={1}></Td>
                        <Td px={1}></Td>
                        <Td px={1}></Td>
                        <Td px={1}></Td>
                        {/* Core Info */}
                        <Td px={2}>{record.employeeId}</Td>
                        <Td px={2} whiteSpace="nowrap">{record.name}</Td>
                        {/* Per Trip Specific */}
                        <Td px={2} isNumeric>{pesoFormatter.format(record.tripRate || 0)}</Td>
                        <Td px={1} isNumeric>{record.numberOfTrips || 0}</Td>
                        {/* Calculated */}
                        <Td px={1} isNumeric bg={earningsColBg}>{pesoFormatter.format(record.basicPayForPeriod || 0)}</Td>
                        {/* Earnings */}
                        {!hideEmptyColumns || !emptyColumns.has("earningsAdjustment") ? (
                          <Td px={1} isNumeric bg={earningsColBg}>{pesoFormatter.format(record.earningsAdjustment || 0)}</Td>
                        ) : null}
                        {!hideEmptyColumns || !emptyColumns.has("overTime") ? (
                          <Td px={1} isNumeric bg={earningsColBg}>{pesoFormatter.format(record.overTime || 0)}</Td>
                        ) : null}
                        {!hideEmptyColumns || !emptyColumns.has("holidayPay") ? (
                          <Td px={1} isNumeric bg={earningsColBg}>{pesoFormatter.format(record.holidayPay || 0)}</Td>
                        ) : null}
                        {!hideEmptyColumns || !emptyColumns.has("silPay") ? (
                          <Td px={1} isNumeric bg={earningsColBg}>{pesoFormatter.format(record.silPay || 0)}</Td>
                        ) : null}
                        {!hideEmptyColumns || !emptyColumns.has("thirteenthMonth") ? (
                          <Td px={1} isNumeric bg={earningsColBg}>{pesoFormatter.format(record.thirteenthMonth || 0)}</Td>
                        ) : null}
                        <Td px={2} isNumeric fontWeight="medium" bg={earningsColBg}>{pesoFormatter.format(record.totalGrossPay || 0)}</Td>
                        {/* Deductions */}
                        {!hideEmptyColumns || !emptyColumns.has("deductionsAdjustment") ? (
                          <Td px={1} isNumeric bg={deductionsColBg}>{pesoFormatter.format(record.deductionsAdjustment || 0)}</Td>
                        ) : null}
                        {!hideEmptyColumns || !emptyColumns.has("sss") ? (
                          <Td px={1} isNumeric bg={deductionsColBg}>{pesoFormatter.format(record.sss || 0)}</Td>
                        ) : null}
                        {!hideEmptyColumns || !emptyColumns.has("philhealth") ? (
                          <Td px={1} isNumeric bg={deductionsColBg}>{pesoFormatter.format(record.philhealth || 0)}</Td>
                        ) : null}
                        {!hideEmptyColumns || !emptyColumns.has("pagibig") ? (
                          <Td px={1} isNumeric bg={deductionsColBg}>{pesoFormatter.format(record.pagibig || 0)}</Td>
                        ) : null}
                        {!hideEmptyColumns || !emptyColumns.has("caCharges") ? (
                          <Td px={1} isNumeric bg={deductionsColBg}>{pesoFormatter.format(record.caCharges || 0)}</Td>
                        ) : null}
                        {!hideEmptyColumns || !emptyColumns.has("withholdingTax") ? (
                          <Td px={1} isNumeric bg={deductionsColBg}>{pesoFormatter.format(record.withholdingTax || 0)}</Td>
                        ) : null}
                        <Td px={2} isNumeric fontWeight="medium" bg={deductionsColBg}>{pesoFormatter.format(record.totalDeductions || 0)}</Td>
                        {/* Net Pay */}
                        <Td px={2} isNumeric fontWeight="bold" bg={netPayColBg}>{pesoFormatter.format(record.netPay || 0)}</Td>
                      </Tr>
                    ))
                  )}
                </Tbody>
                <Tfoot bg="blue.50" fontSize="xs" borderTopWidth="2px" borderColor={secondaryColor}>
                  <Tr>
                    <Th colSpan={6} textAlign="right" py={2} color={secondaryColor}>TOTALS:</Th>
                    <Th isNumeric py={2}></Th>
                    <Th isNumeric py={2}>{detailTotals.numberOfTrips || 0}</Th>
                    <Th isNumeric py={2} bg={earningsColBg} fontWeight="medium">{pesoFormatter.format(detailTotals.basicPayForPeriod)}</Th>
                    {/* Earnings */}
                    {!hideEmptyColumns || !emptyColumns.has("earningsAdjustment") ? (
                      <Th isNumeric py={2} bg={earningsColBg} fontWeight="medium">{pesoFormatter.format(detailTotals.earningsAdjustment)}</Th>
                    ) : null}
                    {!hideEmptyColumns || !emptyColumns.has("overTime") ? (
                      <Th isNumeric py={2} bg={earningsColBg} fontWeight="medium">{pesoFormatter.format(detailTotals.overTime)}</Th>
                    ) : null}
                    {!hideEmptyColumns || !emptyColumns.has("holidayPay") ? (
                      <Th isNumeric py={2} bg={earningsColBg} fontWeight="medium">{pesoFormatter.format(detailTotals.holidayPay)}</Th>
                    ) : null}
                    {!hideEmptyColumns || !emptyColumns.has("silPay") ? (
                      <Th isNumeric py={2} bg={earningsColBg} fontWeight="medium">{pesoFormatter.format(detailTotals.silPay)}</Th>
                    ) : null}
                    {!hideEmptyColumns || !emptyColumns.has("thirteenthMonth") ? (
                      <Th isNumeric py={2} bg={earningsColBg} fontWeight="medium">{pesoFormatter.format(detailTotals.thirteenthMonth)}</Th>
                    ) : null}
                    <Th isNumeric py={2} bg={earningsColBg} fontWeight="medium">{pesoFormatter.format(detailTotals.totalGrossPay)}</Th>
                    {/* Deductions */}
                    {!hideEmptyColumns || !emptyColumns.has("deductionsAdjustment") ? (
                      <Th isNumeric py={2} bg={deductionsColBg} fontWeight="medium">{pesoFormatter.format(detailTotals.deductionsAdjustment)}</Th>
                    ) : null}
                    {!hideEmptyColumns || !emptyColumns.has("sss") ? (
                      <Th isNumeric py={2} bg={deductionsColBg} fontWeight="medium">{pesoFormatter.format(detailTotals.sss)}</Th>
                    ) : null}
                    {!hideEmptyColumns || !emptyColumns.has("philhealth") ? (
                      <Th isNumeric py={2} bg={deductionsColBg} fontWeight="medium">{pesoFormatter.format(detailTotals.philhealth)}</Th>
                    ) : null}
                    {!hideEmptyColumns || !emptyColumns.has("pagibig") ? (
                      <Th isNumeric py={2} bg={deductionsColBg} fontWeight="medium">{pesoFormatter.format(detailTotals.pagibig)}</Th>
                    ) : null}
                    {!hideEmptyColumns || !emptyColumns.has("caCharges") ? (
                      <Th isNumeric py={2} bg={deductionsColBg} fontWeight="medium">{pesoFormatter.format(detailTotals.caCharges)}</Th>
                    ) : null}
                    {!hideEmptyColumns || !emptyColumns.has("withholdingTax") ? (
                      <Th isNumeric py={2} bg={deductionsColBg} fontWeight="medium">{pesoFormatter.format(detailTotals.withholdingTax)}</Th>
                    ) : null}
                    <Th isNumeric py={2} bg={deductionsColBg} fontWeight="medium">{pesoFormatter.format(detailTotals.totalDeductions)}</Th>
                    <Th isNumeric py={2} bg={netPayColBg} fontWeight="bold">{pesoFormatter.format(detailTotals.netPay)}</Th>
                  </Tr>
                </Tfoot>
              </Table>
            </TableContainer>
            </Box>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="outline"
              colorScheme="red"
              onClick={onDetailsModalClose}
            >
              Close
            </Button>{" "}
            {/* Style close button */}
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Payslip Approver Modal */}
      <Modal
        isOpen={isPayslipApproverModalOpen}
        onClose={() => setIsPayslipApproverModalOpen(false)}
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Enter Payslip Approver Details</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <FormControl mb={4}>
              <FormLabel>Approver Name</FormLabel>
              <Input
                value={payslipApproverName}
                onChange={(e) => setPayslipApproverName(e.target.value)}
                placeholder="Enter approver name"
              />
            </FormControl>
            <FormControl>
              <FormLabel>Approver Position</FormLabel>
              <Input
                value={payslipApproverPosition}
                onChange={(e) => setPayslipApproverPosition(e.target.value)}
                placeholder="Enter approver position"
              />
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <Button
              colorScheme="blue"
              mr={3}
              onClick={generatePayslipsWithApprover}
              isDisabled={!payslipApproverName.trim()}
            >
              Generate Payslips
            </Button>
            <Button
              variant="ghost"
              onClick={() => setIsPayslipApproverModalOpen(false)}
            >
              Cancel
            </Button>
          </ModalFooter>
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
    </MotionBox>
  );
};

// --- RENAME Export ---
export default CargoPerTripReportComp;
