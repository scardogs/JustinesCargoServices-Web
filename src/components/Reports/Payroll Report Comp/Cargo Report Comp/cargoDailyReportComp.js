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

// Currency Formatter without symbol for PDF
const numberFormatter = new Intl.NumberFormat("en-PH", {
  style: "decimal",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const CargoDailyReportComp = () => {
  // Renamed component
  const [searchQuery, setSearchQuery] = useState("");
  const [payrollData, setPayrollData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const toast = useToast();

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

  // Color scheme constants (can be adjusted for report theme)
  const primaryColor = "#800020"; // Maroon
  const secondaryColor = "#1a365d"; // Dark Blue
  //const headerBg = "white"; // Keep summary header white or match monthly? Let's use gray.50 like monthly summary // Commented out original
  const earningsHeaderBg = "#ADD8E6";
  const deductionsHeaderBg = "#FFB6C1";
  const netPayHeaderBg = "#FFFFE0";
  const earningsColBg = "#E0F7FA";
  const deductionsColBg = "#FFF0F5";
  const netPayColBg = "#FFFACD";

  // Signatory state
  const [isSignatoryModalOpen, setIsSignatoryModalOpen] = useState(false);
  const [preparedByName, setPreparedByName] = useState("");
  const [preparedByPosition, setPreparedByPosition] = useState("");
  const [notedByName, setNotedByName] = useState("");
  const [notedByPosition, setNotedByPosition] = useState("");
  const [approvedByName, setApprovedByName] = useState("");
  const [approvedByPosition, setApprovedByPosition] = useState("");

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
          `${process.env.NEXT_PUBLIC_BACKEND_API}/api/reports/payroll/daily-cargo/latest-summary`,
          {
            // Updated Endpoint
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
        console.error("Error fetching latest daily report summary:", err);
        const errorMsg =
          err.response?.data?.message ||
          err.message ||
          "Failed to fetch daily report summary.";
        setError(errorMsg);
        // toast({ title: 'Error Fetching Daily Report Summary', description: errorMsg, status: 'error' });
      } finally {
        setIsLoading(false);
      }
    };

    fetchLatestSummary();
  }, [periodStartDate, periodEndDate, toast]);

  // Helper function needed for identifying empty columns (like monthly)
  const calculateDetailTotals = (details) => {
    return (details || []).reduce(
      (acc, record) => {
        acc.dailyWage += parseFloat(record.dailyWage) || 0;
        acc.regularDaysWorked += parseFloat(record.regularDaysWorked) || 0;
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
        dailyWage: 0,
        regularDaysWorked: 0,
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
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/reports/payroll/daily-cargo/${reportObjectId}/details`,
        {
          // Updated Endpoint
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

      onDetailsModalOpen(); // Open modal only after successful fetch
    } catch (err) {
      console.error(
        `Error fetching daily report details for ID ${reportObjectId}:`,
        err
      );
      const errorMsg =
        err.response?.data?.message ||
        err.message ||
        "Failed to fetch daily report details.";
      setDetailsError(errorMsg);
      toast({
        title: "Error Fetching Daily Details",
        description: errorMsg,
        status: "error",
      });
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

  // Calculate totals for the details modal using useMemo (this is for UI, PDF uses its own totals from this)
  const detailTotals = useMemo(() => {
    return calculateDetailTotals(reportDetails);
  }, [reportDetails]);

  // --- PDF Generation Logic (Adapted for Daily Report from Monthly) ---
  const handleGeneratePdf = () => {
    if (!reportDetails || reportDetails.length === 0) {
      toast({ title: "No data to generate PDF", status: "warning" });
      return;
    }
    // Open signatory modal first
    setIsSignatoryModalOpen(true);
  };

  // Function to actually generate PDF after signatory input
  const generatePdfWithSignatories = () => {
    setIsSignatoryModalOpen(false);
    setIsGeneratingPdf(true);
    try {
      // --- Column Definitions for Daily Report (align with monthly structure) ---
      const allColumns = [
        { key: 'employeeId', header: 'Employee ID', type: 'info', style: { cellWidth: 40, halign: 'center' } },
        { key: 'name', header: 'Name', type: 'info', style: { cellWidth: 70, halign: 'center' } },
        { key: 'dailyWage', header: 'Daily Wage', type: 'info', style: { cellWidth: 50, halign: 'center' } },
        { key: 'regularDaysWorked', header: 'Days Worked', type: 'info', style: { cellWidth: 35, halign: 'center' } },
        { key: 'basicPayForPeriod', header: 'Basic Pay', type: 'earningBasic', style: { cellWidth: 55, halign: 'center' } }, 
        { key: 'earningsAdjustment', header: 'Adjustment', type: 'earning', group: 'EARNINGS', style: { cellWidth: 45, halign: 'center' } },
        { key: 'overTime', header: 'Over Time', type: 'earning', group: 'EARNINGS', style: { cellWidth: 45, halign: 'center' } },
        { key: 'holidayPay', header: 'Holiday Pay', type: 'earning', group: 'EARNINGS', style: { cellWidth: 45, halign: 'center' } },
        { key: 'silPay', header: 'SIL Pay', type: 'earning', group: 'EARNINGS', style: { cellWidth: 45, halign: 'center' } },
        { key: 'thirteenthMonth', header: '13th Month', type: 'earning', group: 'EARNINGS', style: { cellWidth: 49, halign: 'center' } },
        { key: 'totalGrossPay', header: 'Total Gross Pay', type: 'earningTotal', style: { cellWidth: 50, halign: 'center' } },
        { key: 'deductionsAdjustment', header: 'Adjustment', type: 'deduction', group: 'DEDUCTIONS', style: { cellWidth: 45, halign: 'center' } },
        { key: 'sss', header: 'SSS', type: 'deduction', group: 'DEDUCTIONS', style: { cellWidth: 45, halign: 'center' } },
        { key: 'philhealth', header: 'Philhealth', type: 'deduction', group: 'DEDUCTIONS', style: { cellWidth: 45, halign: 'center' } },
        { key: 'pagibig', header: 'Pag-IBIG', type: 'deduction', group: 'DEDUCTIONS', style: { cellWidth: 45, halign: 'center' } },
        { key: 'caCharges', header: 'CA/Charges', type: 'deduction', group: 'DEDUCTIONS', style: { cellWidth: 45, halign: 'center' } },
        { key: 'withholdingTax', header: 'W/holding Tax', type: 'deduction', group: 'DEDUCTIONS', style: { cellWidth: 49, halign: 'center' } },
        { key: 'totalDeductions', header: 'Total Deductions', type: 'deductionTotal', style: { cellWidth: 50, halign: 'center' } },
        { key: 'netPay', header: 'Net Pay', type: 'net', style: { cellWidth: 45, halign: 'center' } },
      ];

      const visibleColumns = allColumns.filter(col => {
        if ( (col.group === 'EARNINGS' || col.group === 'DEDUCTIONS') && hideEmptyColumns && emptyColumns.has(col.key) ) {
          return false;
        }
        return true;
      });

      const visibleInfoColumns = visibleColumns.filter(col => col.type === 'info');
      const visibleEarningsSubColumns = visibleColumns.filter(col => col.group === 'EARNINGS' && col.type === 'earning');
      const visibleDeductionsSubColumns = visibleColumns.filter(col => col.group === 'DEDUCTIONS' && col.type === 'deduction');
      
      const headerBg = "#FFFFFF"; 
      const earningsGroupHeaderBg = "#ADD8E6"; 
      const deductionsGroupHeaderBg = "#FFB6C1"; 
      const basicAndTotalGrossBg = "#E0F7FA"; // For Basic Pay, Total Gross Pay, and earning items
      const totalDeductionsBg = "#FFF0F5"; // For Total Deductions and deduction items
      const netPayBg = "#FFFFE0"; // For Net Pay and net pay items

      // ** Header Row 1 **
      const headRow1 = [];
      visibleInfoColumns.forEach(col => {
        headRow1.push({ content: col.header, rowSpan: 2, styles: { halign: 'center', valign: 'middle', fillColor: headerBg, textColor: 0, fontStyle: 'bold' } });
      });

      const basicPayCol = visibleColumns.find(col => col.key === 'basicPayForPeriod');
      if (basicPayCol) {
        headRow1.push({ content: basicPayCol.header, rowSpan: 2, styles: { halign: 'center', valign: 'middle', fillColor: basicAndTotalGrossBg, textColor: 0, fontStyle: 'bold' } });
      }

      if (visibleEarningsSubColumns.length > 0) {
        headRow1.push({ content: 'EARNINGS', colSpan: visibleEarningsSubColumns.length, styles: { halign: 'center', valign: 'middle', fillColor: earningsGroupHeaderBg, textColor: 0, fontStyle: 'bold' } });
      }
      
      const totalGrossColPDF = visibleColumns.find(col => col.key === 'totalGrossPay');
      if(totalGrossColPDF){
          headRow1.push({ content: totalGrossColPDF.header, rowSpan: 2, styles: { halign: 'center', valign: 'middle', fillColor: basicAndTotalGrossBg, textColor: 0, fontStyle: 'bold' } });
      }

      if (visibleDeductionsSubColumns.length > 0) {
        headRow1.push({ content: 'DEDUCTIONS', colSpan: visibleDeductionsSubColumns.length, styles: { halign: 'center', valign: 'middle', fillColor: deductionsGroupHeaderBg, textColor: 0, fontStyle: 'bold' } });
      }

      const totalDeductColPDF = visibleColumns.find(col => col.key === 'totalDeductions');
      if(totalDeductColPDF){
          headRow1.push({ content: totalDeductColPDF.header, rowSpan: 2, styles: { halign: 'center', valign: 'middle', fillColor: totalDeductionsBg, textColor: 0, fontStyle: 'bold' } });
      }

      const netPayColPDF = visibleColumns.find(col => col.key === 'netPay');
      if(netPayColPDF){
          headRow1.push({ content: netPayColPDF.header, rowSpan: 2, styles: { halign: 'center', valign: 'middle', fillColor: netPayBg, textColor: 0, fontStyle: 'bold' } });
      }

      // ** Header Row 2 (Sub-headers) **
      const headRow2 = [];
      visibleEarningsSubColumns.forEach(col => {
        headRow2.push({ content: col.header, styles: { halign: 'center', valign: 'middle', fillColor: earningsGroupHeaderBg, textColor: 0, fontStyle: 'bold' } });
      });
      visibleDeductionsSubColumns.forEach(col => {
        headRow2.push({ content: col.header, styles: { halign: 'center', valign: 'middle', fillColor: deductionsGroupHeaderBg, textColor: 0, fontStyle: 'bold' } });
      });

      const head = [headRow1, headRow2].filter(row => row.length > 0);

      // ** Body Rows **
      const body = reportDetails.map(record => {
        const rowData = [];
        visibleColumns.forEach(col => {
          let value = record[col.key] || 0;
          let content = "";
          let style = { halign: "left", valign: "middle" };

          if (col.key === 'regularDaysWorked') { 
            content = String(record[col.key] || 0);
            style.halign = 'right';
          } else if (typeof value === 'number' || !isNaN(parseFloat(value))) {
            content = numberFormatter.format(Number(value));
            style.halign = 'right';
          } else {
            content = record[col.key] || '';
          }

          if (col.type === 'earningBasic' || col.type === 'earningTotal' || (col.group === 'EARNINGS' && col.type === 'earning')) style.fillColor = basicAndTotalGrossBg;
          if (col.type === 'earningTotal') style.fontStyle = "bold";
          if (col.type === 'deductionTotal' || (col.group === 'DEDUCTIONS' && col.type === 'deduction')) style.fillColor = totalDeductionsBg;
          if (col.type === 'deductionTotal') style.fontStyle = "bold";
          if (col.type === 'net') { style.fillColor = netPayBg; style.fontStyle = "bold"; }
          if (col.key === 'basicPayForPeriod') { style.fillColor = basicAndTotalGrossBg; style.fontStyle = "bold"; } // Ensure Basic Pay is styled like a total


          rowData.push({ content: content, styles: style });
        });
        return rowData;
      });

      // ** Footer Row **
      const footRow = [];
      // TOTALS label spans Info columns + Basic Pay column
      const totalsLabelColSpan = visibleInfoColumns.length + (visibleColumns.some(c => c.key === 'basicPayForPeriod') ? 1 : 0);
      if (totalsLabelColSpan > 0) {
        footRow.push({ content: 'TOTALS:', colSpan: totalsLabelColSpan, styles: { halign: 'right', fontStyle: 'bold', valign: "middle" } });
      }

      visibleColumns.forEach(col => {
        if (col.type === 'info' || col.key === 'basicPayForPeriod') return; 

        let content = '';
        let style = { halign: 'right', fontStyle: 'bold', valign: "middle" };

        if (detailTotals.hasOwnProperty(col.key)) {
            if (col.key === 'regularDaysWorked') { 
                 content = String(detailTotals[col.key] || 0);
            } else if (col.key !== 'dailyWage') { // Don't sum daily wage in footer
                 content = numberFormatter.format(Number(detailTotals[col.key]) || 0);
            }
        }
        
        if (col.type === 'earningTotal' || (col.group === 'EARNINGS' && col.type === 'earning')) style.fillColor = basicAndTotalGrossBg;
        if (col.type === 'deductionTotal' || (col.group === 'DEDUCTIONS' && col.type === 'deduction')) style.fillColor = totalDeductionsBg;
        if (col.type === 'net') style.fillColor = netPayBg;
        if (col.key === 'basicPayForPeriod') style.fillColor = basicAndTotalGrossBg; // Already skipped, but for safety

        footRow.push({ content: content, styles: style });
      });
      const foot = [footRow];

      // ** Column Styles **
      const pdfColumnStyles = {};
      visibleColumns.forEach((col, index) => {
        pdfColumnStyles[index] = { ...col.style };
      });

      const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'legal' });
      const mainTitle = "JUSTINE'S CARGO SERVICES"; // Updated Main Title to remove "DAILY PAYROLL"
      const periodText = `Period Covered: ${formatDateRange(periodStartDate, periodEndDate)}`;
      const generatedDateText = `Generated: ${format(new Date(), 'MMM d, yyyy HH:mm')}`;

      doc.setFontSize(16);
      doc.setFont(undefined, "bold");
      doc.text(mainTitle, doc.internal.pageSize.getWidth() / 2, 30, { align: "center" });
      // Add DAILY PAYROLL subtitle
      doc.setFontSize(14);
      doc.text("DAILY PAYROLL", doc.internal.pageSize.getWidth() / 2, 50, { align: "center" });
      doc.setFontSize(10);
      doc.setFont(undefined, "normal");
      doc.text(periodText, doc.internal.pageSize.getWidth() / 2, 65, { align: "center" });

      let tableStartY = 90;
      autoTable(doc, {
        head: head,
        body: body,
        foot: foot,
        startY: tableStartY,
        theme: 'grid',
        margin: { top: 40, right: 20, bottom: 70, left: 100 },
        styles: { 
          font: "helvetica", 
          fontSize: 8, 
          cellPadding: 2,
          textColor: [0,0,0], 
          overflow: 'linebreak', 
          lineWidth: 0.5,
          lineColor: [0, 0, 0]
        },
        headStyles: { 
          font: "helvetica", 
          fontStyle: "bold", 
          halign: "center", 
          valign: "middle", 
          lineWidth: { bottom: 1, top: 0.5, left: 0.5, right: 0.5 },
          lineColor: [0,0,0],
          fontSize: 8, 
          textColor: [0,0,0] 
        },
        footStyles: { 
          font: "helvetica", 
          fontStyle: "bold", 
          halign: "center",
          valign: "middle", 
          lineWidth: 0.5, 
          lineColor: [0,0,0], 
          fontSize: 8, 
          fillColor: "#f0f0f0",
          textColor: [0,0,0]
        },
        columnStyles: pdfColumnStyles,
        didDrawPage: (data) => {
          // --- SIGNATORY FOOTER ---
          const pageWidth = doc.internal.pageSize.getWidth();
          const pageHeight = doc.internal.pageSize.getHeight();
          const margin = data.settings.margin.left;
          // Footer block layout based on screenshot
          const blockWidth = 220;
          const blockSpacing = 40;
          const totalFooterWidth = 3 * blockWidth + 2 * blockSpacing;
          const footerStartX = (pageWidth - totalFooterWidth) / 2;
          const signatoryY = pageHeight - 60; // 60pt from bottom
          const labelYOffset = 0;
          const nameYOffset = 22;
          const lineYOffset = 36;
          const positionYOffset = 50;
          let currentX = footerStartX;

          // Prepared by
          doc.setFontSize(9);
          doc.setFont(undefined, "normal");
          doc.text("Prepared by:", currentX, signatoryY + labelYOffset, { align: "left" });
          doc.setFont(undefined, "bold");
          doc.text(preparedByName || "", currentX + blockWidth / 2, signatoryY + nameYOffset, { align: "center" });
          doc.setFont(undefined, "normal");
          doc.line(currentX + (blockWidth - 160) / 2, signatoryY + lineYOffset, currentX + (blockWidth + 160) / 2, signatoryY + lineYOffset);
          doc.text(preparedByPosition || "", currentX + blockWidth / 2, signatoryY + positionYOffset, { align: "center" });

          // Noted by
          currentX += blockWidth + blockSpacing;
          doc.text("Noted by:", currentX, signatoryY + labelYOffset, { align: "left" });
          doc.setFont(undefined, "bold");
          doc.text(notedByName || "", currentX + blockWidth / 2, signatoryY + nameYOffset, { align: "center" });
          doc.setFont(undefined, "normal");
          doc.line(currentX + (blockWidth - 160) / 2, signatoryY + lineYOffset, currentX + (blockWidth + 160) / 2, signatoryY + lineYOffset);
          doc.text(notedByPosition || "", currentX + blockWidth / 2, signatoryY + positionYOffset, { align: "center" });

          // Approved by
          currentX += blockWidth + blockSpacing;
          doc.text("Approved by:", currentX, signatoryY + labelYOffset, { align: "left" });
          doc.setFont(undefined, "bold");
          doc.text(approvedByName || "", currentX + blockWidth / 2, signatoryY + nameYOffset, { align: "center" });
          doc.setFont(undefined, "normal");
          doc.line(currentX + (blockWidth - 160) / 2, signatoryY + lineYOffset, currentX + (blockWidth + 160) / 2, signatoryY + lineYOffset);
          doc.text(approvedByPosition || "", currentX + blockWidth / 2, signatoryY + positionYOffset, { align: "center" });
        },
      });

      const startDateStr = formatDateForFilename(periodStartDate);
      const endDateStr = formatDateForFilename(periodEndDate);
      const filename = `Cargo_Daily_Payroll_Details_${startDateStr}_to_${endDateStr}.pdf`;
      doc.save(filename);

      toast({
        title: "PDF Generated",
        description: `${filename} saved.`,
        status: "success",
      });

    } catch (err) {
      console.error("Error generating PDF:", err);
      toast({
        title: "Error Generating PDF",
        description: err.message || "An unexpected error occurred.",
        status: "error",
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <MotionBox>
      <Box p={0}>
        {" "}
        {/* Reduced padding for container */}
        {/* Header and Controls - Simplified */}
        <Flex justify="space-between" align="center" mb={4} wrap="wrap" gap={2}>
          {/* Title can be here or handled by parent component */}
          {/* <Heading size="md" color={primaryColor}>Daily Payroll Report (Cargo)</Heading> */}
          <HStack spacing={3} ml="auto" align="center">
            {" "}
            {/* Aligned controls to the right, center vertically */}
            {/* Date Range Display and Change Button */}
            <Box textAlign="right" mr={2}>
              {" "}
              {/* Add margin */}
              <Text fontSize="sm" fontWeight="medium" color={secondaryColor}>
                {" "}
                {/* Use secondaryColor */}
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
            {/* Removed Search Input */}
          </HStack>
        </Flex>
        {/* Error Alert */}
        {error && (
          <Alert status="error" mb={4} borderRadius="md">
            <AlertIcon />
            {error}
          </Alert>
        )}
        {/* Summary Table Container */}
        <Box
          borderWidth="1px"
          borderRadius="lg"
          borderColor={secondaryColor} // Use secondary color for border
          boxShadow="sm"
          overflow="hidden"
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
                    {" "}
                    {/* Added hover effect */}
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
                          isDisabled // Keep disabled for now
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
            </Button>{" "}
            {/* Changed to outline red */}
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
          <ModalHeader bg={primaryColor} color="white" borderTopRadius="md">
            Daily Payroll Details -{" "}
            {formatDateRange(periodStartDate, periodEndDate)}
          </ModalHeader>{" "}
          {/* Updated Title */}
          <ModalCloseButton
            color="white"
            _focus={{ boxShadow: "none" }}
            _hover={{ bg: "whiteAlpha.300" }}
          />
          <ModalBody pb={6} overflowX="auto">
            {" "}
            {/* Allow horizontal scroll if needed */}
            {/* Add Hide Empty Columns Toggle and Generate PDF Button */}
            <Flex justify="space-between" align="center" mb={4}>
              {canToggleColumns ? (
                <FormControl display="flex" alignItems="center">
                  <FormLabel htmlFor="hide-empty-cols-daily" mb="0" fontSize="sm">
                    Hide Empty Columns
                  </FormLabel>
                  <Switch
                    id="hide-empty-cols-daily"
                    isChecked={hideEmptyColumns}
                    onChange={() => setHideEmptyColumns(!hideEmptyColumns)}
                    colorScheme="blue"
                    size="sm"
                  />
                </FormControl>
              ) : (
                <Box /> // Empty Box to maintain alignment
              )}
              <Button
                  colorScheme="blue"
                  onClick={handleGeneratePdf}
                  isDisabled={loadingDetails || reportDetails.length === 0 || isGeneratingPdf}
                  isLoading={isGeneratingPdf}
                  leftIcon={<DownloadIcon />}
                  size="sm"
              >
                  Generate PDF
              </Button>
            </Flex>

            <TableContainer maxHeight="calc(100vh - 250px)" overflowY="auto"> {/* Adjusted maxHeight */}
              <Table
                variant="simple" // Or striped based on preference, monthly uses striped for modal
                size="sm"
                className="payroll-details-table"
              >
                {/* === THEAD (Structure adapted from payroll-cargo.Daily.js) === */}
                <Thead
                  position="sticky"
                  top={0}
                  zIndex={1}
                  bg="white"
                  boxShadow="sm"
                >
                  {" "}
                  {/* Standardized Thead styling */}
                  <Tr>
                    {/* Period Covered Section - Spans 4 placeholders */}
                    <Th
                      colSpan={4}
                      borderBottomWidth="2px"
                      borderColor={secondaryColor}
                      textAlign="center"
                      verticalAlign="middle"
                    >
                      <VStack spacing={1} align="center" py={1}>
                        <Text
                          fontSize="xs"
                          fontWeight="semibold"
                          color={secondaryColor}
                          textTransform="uppercase"
                        >
                          Period Covered
                        </Text>
                        <Text
                          fontWeight="bold"
                          fontSize="sm"
                          textTransform="none"
                          color={primaryColor}
                        >
                          {formatDateRange(periodStartDate, periodEndDate)}
                        </Text>
                      </VStack>
                    </Th>
                    <Th
                      rowSpan={2}
                      borderBottomWidth="2px"
                      borderColor={secondaryColor}
                      color={secondaryColor}
                      textAlign="center"
                      verticalAlign="middle"
                    >
                      Employee ID
                    </Th>
                    <Th
                      rowSpan={2}
                      borderBottomWidth="2px"
                      borderColor={secondaryColor}
                      color={secondaryColor}
                      textAlign="center"
                      verticalAlign="middle"
                    >
                      Name
                    </Th>
                    <Th
                      rowSpan={2}
                      borderBottomWidth="2px"
                      borderColor={secondaryColor}
                      color={secondaryColor}
                      textAlign="center"
                      verticalAlign="middle"
                    >
                      Daily Wage
                    </Th>{" "}
                    {/* Updated Header */}
                    <Th
                      rowSpan={2}
                      borderBottomWidth="2px"
                      borderColor={secondaryColor}
                      color={secondaryColor}
                      textAlign="center"
                      verticalAlign="middle"
                    >
                      Regular Days Worked
                    </Th>
                    <Th
                      rowSpan={2}
                      borderBottomWidth="2px"
                      borderColor={secondaryColor}
                      color={secondaryColor}
                      textAlign="center"
                      verticalAlign="middle"
                      bg={earningsHeaderBg}
                    >
                      Basic Pay
                    </Th>{" "}
                    {/* Added Basic Pay */}
                    <Th
                      colSpan={5}
                      borderBottomWidth="2px"
                      borderColor={secondaryColor}
                      color="black"
                      textAlign="center"
                      bg={earningsHeaderBg}
                    >
                      EARNINGS
                    </Th>
                    <Th
                      rowSpan={2}
                      borderBottomWidth="2px"
                      borderColor={secondaryColor}
                      color={secondaryColor}
                      textAlign="center"
                      verticalAlign="middle"
                      bg={earningsColBg}
                    >
                      Total Gross Pay
                    </Th>
                    <Th
                      colSpan={6}
                      borderBottomWidth="2px"
                      borderColor={secondaryColor}
                      color="black"
                      textAlign="center"
                      bg={deductionsHeaderBg}
                    >
                      DEDUCTIONS
                    </Th>
                    <Th
                      rowSpan={2}
                      borderBottomWidth="2px"
                      borderColor={secondaryColor}
                      color={secondaryColor}
                      textAlign="center"
                      verticalAlign="middle"
                      bg={deductionsColBg}
                    >
                      Total Deductions
                    </Th>
                    <Th
                      rowSpan={2}
                      borderBottomWidth="2px"
                      borderColor={secondaryColor}
                      color={secondaryColor}
                      textAlign="center"
                      verticalAlign="middle"
                      bg={netPayHeaderBg}
                    >
                      Net Pay
                    </Th>
                  </Tr>
                  <Tr>
                    <Th
                      borderBottomWidth="2px"
                      borderColor={secondaryColor}
                    ></Th>
                    <Th
                      borderBottomWidth="2px"
                      borderColor={secondaryColor}
                    ></Th>
                    <Th
                      borderBottomWidth="2px"
                      borderColor={secondaryColor}
                    ></Th>
                    <Th
                      borderBottomWidth="2px"
                      borderColor={secondaryColor}
                    ></Th>
                    {/* Spanned by ID, Name, Daily Wage, Days Worked, Basic Pay */}
                    <Th
                      borderBottomWidth="2px"
                      borderColor={secondaryColor}
                      color="black"
                      bg={earningsHeaderBg}
                    >
                      Adjustment
                    </Th>
                    <Th
                      borderBottomWidth="2px"
                      borderColor={secondaryColor}
                      color="black"
                      bg={earningsHeaderBg}
                    >
                      Over Time
                    </Th>
                    <Th
                      borderBottomWidth="2px"
                      borderColor={secondaryColor}
                      color="black"
                      bg={earningsHeaderBg}
                    >
                      Holiday Pay
                    </Th>
                    <Th
                      borderBottomWidth="2px"
                      borderColor={secondaryColor}
                      color="black"
                      bg={earningsHeaderBg}
                    >
                      SIL Pay
                    </Th>
                    <Th
                      borderBottomWidth="2px"
                      borderColor={secondaryColor}
                      color="black"
                      bg={earningsHeaderBg}
                    >
                      13th Month Pay
                    </Th>
                    <Th
                      borderBottomWidth="2px"
                      borderColor={secondaryColor}
                      color="black"
                      bg={deductionsHeaderBg}
                    >
                      Adjustment
                    </Th>
                    <Th
                      borderBottomWidth="2px"
                      borderColor={secondaryColor}
                      color="black"
                      bg={deductionsHeaderBg}
                    >
                      SSS
                    </Th>
                    <Th
                      borderBottomWidth="2px"
                      borderColor={secondaryColor}
                      color="black"
                      bg={deductionsHeaderBg}
                    >
                      Philhealth
                    </Th>
                    <Th
                      borderBottomWidth="2px"
                      borderColor={secondaryColor}
                      color="black"
                      bg={deductionsHeaderBg}
                    >
                      Pag-IBIG
                    </Th>
                    <Th
                      borderBottomWidth="2px"
                      borderColor={secondaryColor}
                      color="black"
                      bg={deductionsHeaderBg}
                    >
                      CA/Charges
                    </Th>
                    <Th
                      borderBottomWidth="2px"
                      borderColor={secondaryColor}
                      color="black"
                      bg={deductionsHeaderBg}
                    >
                      W/holding Tax
                    </Th>
                  </Tr>
                </Thead>
                {/* === TBODY (Populate with fetched details) === */}
                <Tbody>
                  {loadingDetails ? (
                    <Tr>
                      <Td colSpan={23} textAlign="center" py={10}>
                        <Spinner size="xl" color={primaryColor} />
                      </Td>
                    </Tr> // Colspan adjusted +1 = 23
                  ) : detailsError ? (
                    <Tr>
                      <Td colSpan={23} textAlign="center" py={10}>
                        <Alert status="error">{detailsError}</Alert>
                      </Td>
                    </Tr> // Colspan adjusted +1 = 23
                  ) : reportDetails.length === 0 ? (
                    <Tr>
                      <Td colSpan={23} textAlign="center" py={10}>
                        No details found for this report.
                      </Td>
                    </Tr> // Colspan adjusted +1 = 23
                  ) : (
                    reportDetails.map((record, index) => (
                      <Tr
                        fontSize="xs"
                        key={record._id || index}
                        _hover={{ bg: "gray.50" }}
                      >
                        {" "}
                        {/* Added hover effect */}
                        {/* Placeholder TDs */}
                        <Td px={1}></Td>
                        <Td px={1}></Td>
                        <Td px={1}></Td>
                        <Td px={1}></Td>
                        {/* Data Cells - Start/End Date hidden */}
                        <Td px={2}>{record.employeeId}</Td>
                        <Td px={2} whiteSpace="nowrap">
                          {record.name}
                        </Td>
                        <Td px={2} isNumeric>
                          {pesoFormatter.format(record.dailyWage || 0)}
                        </Td>{" "}
                        {/* Updated field */}
                        <Td px={1} isNumeric>
                          {record.regularDaysWorked || 0}
                        </Td>
                        <Td px={1} isNumeric bg={earningsColBg}>
                          {pesoFormatter.format(record.basicPayForPeriod || 0)}
                        </Td>{" "}
                        {/* Added field */}
                        {/* Earnings */}
                        <Td px={1} isNumeric bg={earningsColBg}>
                          {pesoFormatter.format(record.earningsAdjustment || 0)}
                        </Td>
                        <Td px={1} isNumeric bg={earningsColBg}>
                          {pesoFormatter.format(record.overTime || 0)}
                        </Td>
                        <Td px={1} isNumeric bg={earningsColBg}>
                          {pesoFormatter.format(record.holidayPay || 0)}
                        </Td>
                        <Td px={1} isNumeric bg={earningsColBg}>
                          {pesoFormatter.format(record.silPay || 0)}
                        </Td>
                        <Td px={1} isNumeric bg={earningsColBg}>
                          {pesoFormatter.format(record.thirteenthMonth || 0)}
                        </Td>
                        <Td
                          px={2}
                          isNumeric
                          fontWeight="medium"
                          bg={earningsColBg}
                        >
                          {pesoFormatter.format(record.totalGrossPay || 0)}
                        </Td>
                        {/* Deductions */}
                        <Td px={1} isNumeric bg={deductionsColBg}>
                          {pesoFormatter.format(
                            record.deductionsAdjustment || 0
                          )}
                        </Td>
                        <Td px={1} isNumeric bg={deductionsColBg}>
                          {pesoFormatter.format(record.sss || 0)}
                        </Td>
                        <Td px={1} isNumeric bg={deductionsColBg}>
                          {pesoFormatter.format(record.philhealth || 0)}
                        </Td>
                        <Td px={1} isNumeric bg={deductionsColBg}>
                          {pesoFormatter.format(record.pagibig || 0)}
                        </Td>
                        <Td px={1} isNumeric bg={deductionsColBg}>
                          {pesoFormatter.format(record.caCharges || 0)}
                        </Td>
                        <Td px={1} isNumeric bg={deductionsColBg}>
                          {pesoFormatter.format(record.withholdingTax || 0)}
                        </Td>
                        <Td
                          px={2}
                          isNumeric
                          fontWeight="medium"
                          bg={deductionsColBg}
                        >
                          {pesoFormatter.format(record.totalDeductions || 0)}
                        </Td>
                        {/* Net Pay */}
                        <Td px={2} isNumeric fontWeight="bold" bg={netPayColBg}>
                          {pesoFormatter.format(record.netPay || 0)}
                        </Td>
                      </Tr>
                    ))
                  )}
                </Tbody>
                {/* === TFOOT (Use calculated detailTotals) === */}
                <Tfoot
                  bg="blue.50"
                  fontSize="xs"
                  borderTopWidth="2px"
                  borderColor={secondaryColor}
                >
                  {" "}
                  {/* Standardized Tfoot styling */}
                  <Tr>
                    {/* Adjust colspan: 4 (Placeholders) + 2 (ID, Name) = 6 */}
                    <Th
                      colSpan={6}
                      textAlign="right"
                      py={2}
                      color={secondaryColor}
                    >
                      TOTALS:
                    </Th>
                    <Th isNumeric py={2}></Th> {/* Daily Wage Placeholder */}
                    <Th isNumeric py={2}>{detailTotals.regularDaysWorked || 0}</Th> {/* Total Regular Days */}
                    <Th isNumeric py={2} bg={earningsColBg} fontWeight="medium">
                      {pesoFormatter.format(detailTotals.basicPayForPeriod)}
                    </Th>{" "}
                    {/* Basic Pay Total */}
                    <Th isNumeric py={2} bg={earningsColBg} fontWeight="medium">
                      {pesoFormatter.format(detailTotals.thirteenthMonth)}
                    </Th>
                    <Th isNumeric py={2} bg={earningsColBg} fontWeight="medium">
                      {pesoFormatter.format(detailTotals.totalGrossPay)}
                    </Th>
                    {/* Deductions - Use detailTotals */}
                    <Th isNumeric py={2} bg={deductionsColBg} fontWeight="medium">
                      {pesoFormatter.format(detailTotals.deductionsAdjustment)}
                    </Th>
                    <Th isNumeric py={2} bg={deductionsColBg} fontWeight="medium">
                      {pesoFormatter.format(detailTotals.sss)}
                    </Th>
                    <Th isNumeric py={2} bg={deductionsColBg} fontWeight="medium">
                      {pesoFormatter.format(detailTotals.philhealth)}
                    </Th>
                    <Th isNumeric py={2} bg={deductionsColBg} fontWeight="medium">
                      {pesoFormatter.format(detailTotals.pagibig)}
                    </Th>
                    <Th isNumeric py={2} bg={deductionsColBg} fontWeight="medium">
                      {pesoFormatter.format(detailTotals.caCharges)}
                    </Th>
                    <Th isNumeric py={2} bg={deductionsColBg} fontWeight="medium">
                      {pesoFormatter.format(detailTotals.withholdingTax)}
                    </Th>
                    <Th isNumeric py={2} bg={deductionsColBg} fontWeight="medium">
                      {pesoFormatter.format(detailTotals.totalDeductions)}
                    </Th>
                    <Th isNumeric py={2} bg={netPayColBg} fontWeight="bold">
                      {pesoFormatter.format(detailTotals.netPay)}
                    </Th>
                  </Tr>
                </Tfoot>
              </Table>
            </TableContainer>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="outline"
              colorScheme="red"
              onClick={onDetailsModalClose}
            >
              Close
            </Button>{" "}
            {/* Removed Print/Export buttons from here */}
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Signatory Modal */}
      <Modal isOpen={isSignatoryModalOpen} onClose={() => setIsSignatoryModalOpen(false)} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader bg={primaryColor} color="white" borderTopRadius="md">
            Enter Signatory Names and Positions
          </ModalHeader>
          <ModalCloseButton color="white" _focus={{ boxShadow: "none" }} _hover={{ bg: "whiteAlpha.300" }} />
          <ModalBody pb={6}>
            <FormControl mb={4}>
              <FormLabel>Prepared by (Name)</FormLabel>
              <Input placeholder="Enter name" value={preparedByName} onChange={e => setPreparedByName(e.target.value)} />
            </FormControl>
            <FormControl mb={4}>
              <FormLabel>Prepared by (Position)</FormLabel>
              <Input placeholder="Enter position" value={preparedByPosition} onChange={e => setPreparedByPosition(e.target.value)} />
            </FormControl>
            <FormControl mb={4}>
              <FormLabel>Noted by (Name)</FormLabel>
              <Input placeholder="Enter name" value={notedByName} onChange={e => setNotedByName(e.target.value)} />
            </FormControl>
            <FormControl mb={4}>
              <FormLabel>Noted by (Position)</FormLabel>
              <Input placeholder="Enter position" value={notedByPosition} onChange={e => setNotedByPosition(e.target.value)} />
            </FormControl>
            <FormControl mb={4}>
              <FormLabel>Approved by (Name)</FormLabel>
              <Input placeholder="Enter name" value={approvedByName} onChange={e => setApprovedByName(e.target.value)} />
            </FormControl>
            <FormControl mb={4}>
              <FormLabel>Approved by (Position)</FormLabel>
              <Input placeholder="Enter position" value={approvedByPosition} onChange={e => setApprovedByPosition(e.target.value)} />
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="blue" mr={3} onClick={generatePdfWithSignatories} isLoading={isGeneratingPdf}>
              Generate PDF
            </Button>
            <Button variant="outline" colorScheme="red" onClick={() => setIsSignatoryModalOpen(false)}>
              Cancel
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </MotionBox>
  );
};

export default CargoDailyReportComp; // Renamed export
