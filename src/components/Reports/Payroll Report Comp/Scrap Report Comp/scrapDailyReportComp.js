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
} from "@chakra-ui/react";
import {
  SearchIcon,
  DownloadIcon,
  CalendarIcon,
  ViewIcon,
  EmailIcon,
} from "@chakra-ui/icons";
import { motion } from "framer-motion";
import { format, parseISO } from "date-fns";
import "react-datepicker/dist/react-datepicker.css";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useRouter } from 'next/router';

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

// Currency Formatter without symbol for PDF (Added)
const numberFormatter = new Intl.NumberFormat("en-PH", {
  style: "decimal",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const ScrapDailyReportComp = () => {
  // Renamed component
  const [searchQuery, setSearchQuery] = useState("");
  const [payrollData, setPayrollData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const toast = useToast();
  const router = useRouter();

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
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false); // Added

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

  // Signatory state (Added)
  const [isSignatoryModalOpen, setIsSignatoryModalOpen] = useState(false);
  const [preparedByName, setPreparedByName] = useState("");
  const [preparedByPosition, setPreparedByPosition] = useState("");
  const [notedByName, setNotedByName] = useState("");
  const [notedByPosition, setNotedByPosition] = useState("");
  const [approvedByName, setApprovedByName] = useState("");
  const [approvedByPosition, setApprovedByPosition] = useState("");

  // State for Payslip Generation (Added)
  const [payslipApproverName, setPayslipApproverName] = useState("");
  const [payslipApproverPosition, setPayslipApproverPosition] = useState("");
  const [isPayslipApproverModalOpen, setIsPayslipApproverModalOpen] = useState(false);
  const [isGeneratingPayslips, setIsGeneratingPayslips] = useState(false);
  const [employeePositions, setEmployeePositions] = useState({}); // Added for payslip designation

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

  // Format date for PDF filename (Added)
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
        // Fetch the latest summary using the scrap endpoint
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_BACKEND_API}/api/reports/payroll/scrap-daily/latest-summary`,
          {
            params: {
              startDate: periodStartDate,
              endDate: periodEndDate,
            },
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setPayrollData(response.data);
      } catch (err) {
        console.error("Error fetching latest daily scrap report summary:", err);
        const errorMsg =
          err.response?.data?.message ||
          err.message ||
          "Failed to fetch daily scrap report summary.";
        setError(errorMsg);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLatestSummary();
  }, [periodStartDate, periodEndDate, toast]);

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
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/reports/payroll/scrap-daily/${reportObjectId}/details`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setReportDetails(response.data || []);
      onDetailsModalOpen(); // Open modal only after successful fetch
    } catch (err) {
      console.error(
        `Error fetching daily scrap report details for ID ${reportObjectId}:`,
        err
      );
      const errorMsg =
        err.response?.data?.message ||
        err.message ||
        "Failed to fetch daily scrap report details.";
      setDetailsError(errorMsg);
      toast({
        title: "Error Fetching Daily Scrap Details",
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

  // Calculate totals for the details modal using useMemo
  const detailTotals = useMemo(() => {
    return (reportDetails || []).reduce(
      (acc, record) => {
        // Add fields needed for totals (adjust based on your actual data fields)
        acc.dailyWage += parseFloat(record.dailyWage) || 0; // Changed from monthlyWage
        acc.regularDaysWorked += parseFloat(record.regularDaysWorked) || 0;
        acc.basicPayForPeriod += parseFloat(record.basicPayForPeriod) || 0; // Added basic pay
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
        dailyWage: 0, // Changed from monthlyWage
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
  }, [reportDetails]);

  // --- PDF Generation Logic (Adapted for Daily Report from Cargo) ---
  const handleGeneratePdf = () => {
    if (!reportDetails || reportDetails.length === 0) {
      toast({ title: "No data to generate PDF", status: "warning" });
      return;
    }
    setIsSignatoryModalOpen(true);
  };

  // Function to actually generate PDF after signatory input
  const generatePdfWithSignatories = () => {
    setIsSignatoryModalOpen(false);
    setIsGeneratingPdf(true);
    try {
      // --- Column Definitions for Scrap Daily Report (adjusting widths for smaller table) ---
      const allColumns = [
        { key: 'employeeId', header: 'Employee ID', type: 'info', style: { cellWidth: 32, halign: 'center' } }, // Reduced from 35
        { key: 'name', header: 'Name', type: 'info', style: { cellWidth: 55, halign: 'left' } }, // Reduced from 60
        { key: 'dailyWage', header: 'Daily Wage', type: 'info', style: { cellWidth: 38, halign: 'right' } }, // Reduced from 40
        { key: 'regularDaysWorked', header: 'Days Worked', type: 'info', style: { cellWidth: 28, halign: 'center' } }, // Reduced from 30
        { key: 'basicPayForPeriod', header: 'Basic Pay', type: 'earningBasic', style: { cellWidth: 42, halign: 'right' } }, // Reduced from 45
        { key: 'earningsAdjustment', header: 'Earnings Adjustment', type: 'earning', group: 'EARNINGS', style: { cellWidth: 48, halign: 'right' } }, // Reduced from 50
        { key: 'overTime', header: 'Overtime Pay', type: 'earning', group: 'EARNINGS', style: { cellWidth: 42, halign: 'right' } }, // Reduced from 45
        { key: 'holidayPay', header: 'Holiday Pay', type: 'earning', group: 'EARNINGS', style: { cellWidth: 42, halign: 'right' } }, // Reduced from 45
        { key: 'silPay', header: 'SIL Pay', type: 'earning', group: 'EARNINGS', style: { cellWidth: 38, halign: 'right' } }, // Reduced from 40
        { key: 'thirteenthMonth', header: '13th Month Pay', type: 'earning', group: 'EARNINGS', style: { cellWidth: 42, halign: 'right' } }, // Reduced from 45
        { key: 'totalGrossPay', header: 'Total Gross Pay', type: 'earningTotal', style: { cellWidth: 48, halign: 'right' } }, // Reduced from 50
        { key: 'deductionsAdjustment', header: 'Deductions Adjustment', type: 'deduction', group: 'DEDUCTIONS', style: { cellWidth: 48, halign: 'right' } }, // Reduced from 50
        { key: 'sss', header: 'SSS Contribution', type: 'deduction', group: 'DEDUCTIONS', style: { cellWidth: 42, halign: 'right' } }, // Reduced from 45
        { key: 'philhealth', header: 'PhilHealth Contrib.', type: 'deduction', group: 'DEDUCTIONS', style: { cellWidth: 42, halign: 'right' } }, // Reduced from 45
        { key: 'pagibig', header: 'Pag-IBIG Contrib.', type: 'deduction', group: 'DEDUCTIONS', style: { cellWidth: 42, halign: 'right' } }, // Reduced from 45
        { key: 'caCharges', header: 'Cash Advance / Charges', type: 'deduction', group: 'DEDUCTIONS', style: { cellWidth: 52, halign: 'right' } }, // Reduced from 55
        { key: 'withholdingTax', header: 'Withholding Tax', type: 'deduction', group: 'DEDUCTIONS', style: { cellWidth: 42, halign: 'right' } }, // Reduced from 45
        { key: 'totalDeductions', header: 'Total Deductions', type: 'deductionTotal', style: { cellWidth: 48, halign: 'right' } }, // Reduced from 50
        { key: 'netPay', header: 'Net Pay', type: 'net', style: { cellWidth: 48, halign: 'right' } }, // Reduced from 50
      ];

      const visibleColumns = allColumns; 

      const visibleInfoColumns = visibleColumns.filter(col => col.type === 'info');
      const visibleBasicPayColumn = visibleColumns.find(col => col.key === 'basicPayForPeriod');
      const visibleEarningsSubColumns = visibleColumns.filter(col => col.group === 'EARNINGS' && col.type === 'earning');
      const visibleTotalGrossColumn = visibleColumns.find(col => col.key === 'totalGrossPay');
      const visibleDeductionsSubColumns = visibleColumns.filter(col => col.group === 'DEDUCTIONS' && col.type === 'deduction');
      const visibleTotalDeductionsColumn = visibleColumns.find(col => col.key === 'totalDeductions');
      const visibleNetPayColumn = visibleColumns.find(col => col.key === 'netPay');
      
      const headerRowFillColor = "#E2E8F0"; // gray.200
      const earningsGroupHeaderBg = "#BEE3F8"; // blue.200
      const deductionsGroupHeaderBg = "#FED7D7"; // red.200
      
      const earningColumnFill = "#EBF8FF"; // blue.50
      const deductionColumnFill = "#FFF5F5"; // red.50
      const netPayColumnFill = "#FFFFF0"; // yellow.50 (ivory)

      // ** Header Row 1 **
      const headRow1 = [];
      visibleInfoColumns.forEach(col => {
        headRow1.push({ content: col.header, rowSpan: 2, styles: { halign: col.style.halign || 'center', valign: 'middle', fillColor: headerRowFillColor, textColor: 0, fontStyle: 'bold' } });
      });

      if (visibleBasicPayColumn) {
        headRow1.push({ content: visibleBasicPayColumn.header, rowSpan: 2, styles: { halign: visibleBasicPayColumn.style.halign || 'center', valign: 'middle', fillColor: earningColumnFill, textColor: 0, fontStyle: 'bold' } });
      }

      if (visibleEarningsSubColumns.length > 0) {
        headRow1.push({ content: 'EARNINGS', colSpan: visibleEarningsSubColumns.length, styles: { halign: 'center', valign: 'middle', fillColor: earningsGroupHeaderBg, textColor: 0, fontStyle: 'bold' } });
      }
      
      if(visibleTotalGrossColumn){
          headRow1.push({ content: visibleTotalGrossColumn.header, rowSpan: 2, styles: { halign: visibleTotalGrossColumn.style.halign || 'center', valign: 'middle', fillColor: earningColumnFill, textColor: 0, fontStyle: 'bold' } });
      }

      if (visibleDeductionsSubColumns.length > 0) {
        headRow1.push({ content: 'DEDUCTIONS', colSpan: visibleDeductionsSubColumns.length, styles: { halign: 'center', valign: 'middle', fillColor: deductionsGroupHeaderBg, textColor: 0, fontStyle: 'bold' } });
      }

      if(visibleTotalDeductionsColumn){
          headRow1.push({ content: visibleTotalDeductionsColumn.header, rowSpan: 2, styles: { halign: visibleTotalDeductionsColumn.style.halign || 'center', valign: 'middle', fillColor: deductionColumnFill, textColor: 0, fontStyle: 'bold' } });
      }

      if(visibleNetPayColumn){
          headRow1.push({ content: visibleNetPayColumn.header, rowSpan: 2, styles: { halign: visibleNetPayColumn.style.halign || 'center', valign: 'middle', fillColor: netPayColumnFill, textColor: 0, fontStyle: 'bold' } });
      }

      // ** Header Row 2 (Sub-headers) **
      const headRow2 = [];
      visibleEarningsSubColumns.forEach(col => {
        headRow2.push({ content: col.header, styles: { halign: col.style.halign || 'center', valign: 'middle', fillColor: earningsGroupHeaderBg, textColor: 0, fontStyle: 'bold' } });
      });
      visibleDeductionsSubColumns.forEach(col => {
        headRow2.push({ content: col.header, styles: { halign: col.style.halign || 'center', valign: 'middle', fillColor: deductionsGroupHeaderBg, textColor: 0, fontStyle: 'bold' } });
      });

      const head = [headRow1, headRow2].filter(row => row.length > 0);

      // ** Body Rows **
      const body = reportDetails.map(record => {
        const rowData = [];
        visibleColumns.forEach(col => {
          let value = record[col.key] || 0;
          let content = "";
          let cellStyleUpdate = { halign: col.style.halign || 'left' }; 

          if (col.key === 'regularDaysWorked') { 
            content = String(record[col.key] || 0);
          } else if (col.key === 'name') {
            content = record[col.key] || '';
          } else if (typeof value === 'number' || !isNaN(parseFloat(value))) {
            content = numberFormatter.format(Number(value));
          } else {
            content = record[col.key] || '';
          }

          if (col.key === 'basicPayForPeriod' || col.type === 'earningTotal' || (col.group === 'EARNINGS' && col.type === 'earning')) cellStyleUpdate.fillColor = earningColumnFill;
          if (col.type === 'earningTotal' || col.key === 'basicPayForPeriod') cellStyleUpdate.fontStyle = "bold";
          
          if (col.type === 'deductionTotal' || (col.group === 'DEDUCTIONS' && col.type === 'deduction')) cellStyleUpdate.fillColor = deductionColumnFill;
          if (col.type === 'deductionTotal') cellStyleUpdate.fontStyle = "bold";

          if (col.type === 'net') { cellStyleUpdate.fillColor = netPayColumnFill; cellStyleUpdate.fontStyle = "bold"; }
          
          rowData.push({ content: content, styles: cellStyleUpdate });
        });
        return rowData;
      });

      // ** Footer Row **
      const footRow = [];
      let footerColSpanCount = 0;
      visibleInfoColumns.forEach(() => footerColSpanCount++);
      if (visibleBasicPayColumn) footerColSpanCount++;
      
      if (footerColSpanCount > 0) {
        footRow.push({ content: 'TOTALS:', colSpan: footerColSpanCount, styles: { halign: 'right', fontStyle: 'bold', valign: "middle" } });
      }

      visibleColumns.forEach(col => {
        if (visibleInfoColumns.some(infoCol => infoCol.key === col.key) || col.key === 'basicPayForPeriod') return; 

        let content = '';
        let cellStyleUpdate = { halign: col.style.halign || 'right', fontStyle: 'bold', valign: "middle" };

        if (detailTotals.hasOwnProperty(col.key)) {
            if (col.key === 'regularDaysWorked') { 
                 content = String(detailTotals[col.key] || 0);
            } else if (col.key !== 'dailyWage' && (typeof detailTotals[col.key] === 'number' || !isNaN(parseFloat(detailTotals[col.key])) ) ) { 
                 content = numberFormatter.format(Number(detailTotals[col.key]) || 0);
            }
        }
        
        if (col.type === 'earningTotal' || (col.group === 'EARNINGS' && col.type === 'earning')) cellStyleUpdate.fillColor = earningColumnFill;
        if (col.type === 'deductionTotal' || (col.group === 'DEDUCTIONS' && col.type === 'deduction')) cellStyleUpdate.fillColor = deductionColumnFill;
        if (col.type === 'net') cellStyleUpdate.fillColor = netPayColumnFill;

        footRow.push({ content: content, styles: cellStyleUpdate });
      });
      const foot = [footRow];

      // ** Column Styles for jspdf-autotable **
      const pdfColumnStyles = {};
      visibleColumns.forEach((col, index) => {
        pdfColumnStyles[index] = { cellWidth: col.style.cellWidth || 'auto' }; 
      });

      const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'legal' });
      const mainTitle = "JUSTINE'S SCRAP"; 
      const reportTitle = "DAILY PAYROLL"; 
      const periodText = `Period Covered: ${formatDateRange(periodStartDate, periodEndDate)}`;

      doc.setFontSize(16); // Increased from 14
      doc.setFont(undefined, "bold");
      doc.text(mainTitle, doc.internal.pageSize.getWidth() / 2, 35, { align: "center" }); // Adjusted Y position
      doc.setFontSize(14); // Increased from 12
      doc.text(reportTitle, doc.internal.pageSize.getWidth() / 2, 55, { align: "center" }); // Adjusted Y position
      doc.setFontSize(10); // Increased from 9
      doc.setFont(undefined, "normal");
      doc.text(periodText, doc.internal.pageSize.getWidth() / 2, 70, { align: "center" }); // Adjusted Y position

      let tableStartY = 85;
      autoTable(doc, {
        head: head,
        body: body,
        foot: foot,
        startY: tableStartY,
        theme: 'grid',
        margin: { top: 30, right: 30, bottom: 70, left: 150 }, // Adjusted margins to move table right
        styles: { 
          font: "helvetica", 
          fontSize: 7.5,
          cellPadding: 2, // Reduced from 2.5
          textColor: [0,0,0], 
          overflow: 'linebreak', 
          lineWidth: 0.4,
          lineColor: [44, 62, 80]
        },
        headStyles: { 
          fontStyle: "bold", 
          valign: "middle", 
          lineWidth: { bottom: 0.8, top: 0.4, left: 0.4, right: 0.4 },
          fontSize: 7.5,
          fillColor: [240, 240, 240]
        },
        footStyles: { 
          fontStyle: "bold", 
          valign: "middle", 
          lineWidth: 0.4,
          fontSize: 7.5,
          fillColor: [245, 245, 245]
        },
        columnStyles: pdfColumnStyles,
        didDrawPage: (data) => {
          const pageWidth = doc.internal.pageSize.getWidth();
          const pageHeight = doc.internal.pageSize.getHeight();
          const margin = data.settings.margin.left; 
          const blockWidth = 200; // Reduced from 220
          const blockSpacing = 25; // Reduced from 30
          const totalFooterWidth = 3 * blockWidth + 2 * blockSpacing;
          let footerStartX = margin + 40; // Adjusted to align with table
          if (footerStartX < margin) footerStartX = margin; 

          const signatoryY = pageHeight - 60;
          const labelYOffset = 0;
          const nameYOffset = 20;
          const lineYOffset = 18;
          const positionYOffset = 32;
          let currentX = footerStartX;

          doc.setFontSize(8.5);

          const drawSignatoryBlock = (labelText, name, position) => {
            doc.setFont(undefined, "normal");
            doc.text(labelText, currentX, signatoryY + labelYOffset, { align: "left" });
            doc.setFont(undefined, "bold");
            const nameText = name || " ";
            doc.text(nameText, currentX + (blockWidth/2), signatoryY + nameYOffset, { align: "center" });
            doc.setFont(undefined, "normal");
            
            // Improved signature line
            const signatureLineWidth = blockWidth * 0.85; // Increased from 0.80
            const lineStartX = currentX + (blockWidth - signatureLineWidth) / 2;
            const lineEndX = lineStartX + signatureLineWidth;
            const lineY = signatoryY + nameYOffset + 3; // Adjusted from 2

            doc.setLineWidth(0.6); // Increased from 0.5
            doc.line(lineStartX, lineY, lineEndX, lineY);
            
            doc.text(position || " ", currentX + (blockWidth/2), signatoryY + positionYOffset, { align: "center" });
            currentX += blockWidth + blockSpacing;
          };

          drawSignatoryBlock("Prepared by:", preparedByName, preparedByPosition);
          drawSignatoryBlock("Noted by:", notedByName, notedByPosition);
          drawSignatoryBlock("Approved by:", approvedByName, approvedByPosition);
        },
      });

      const startDateStr = formatDateForFilename(periodStartDate);
      const endDateStr = formatDateForFilename(periodEndDate);
      const filename = `Scrap_Daily_Payroll_${startDateStr}_to_${endDateStr}.pdf`;
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

  // useEffect to fetch employee positions for payslips (Added)
  useEffect(() => {
    if (isDetailsModalOpen && reportDetails.length > 0) {
      const token = localStorage.getItem("token");
      if (!token) return;
      // Assuming an endpoint like in cargoMonthlyReportComp.js
      axios.get(`${process.env.NEXT_PUBLIC_BACKEND_API}/api/employees/reports`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then(res => {
        const map = {};
        res.data.forEach(emp => { map[emp.empID] = emp.position; });
        setEmployeePositions(map);
      })
      .catch(err => {
        console.error("Error fetching employee positions:", err);
        // Handle error, e.g., show a toast
      });
    }
  }, [isDetailsModalOpen, reportDetails]);

  // Function to open payslip approver modal (Added)
  const handleGeneratePayslips = async () => {
    if (!reportDetails || reportDetails.length === 0) {
      toast({ title: "No data to generate payslips", status: "warning" });
      return;
    }
    setPayslipApproverName(""); 
    setPayslipApproverPosition("");
    setIsPayslipApproverModalOpen(true);
  };

  // ADD THIS HELPER FUNCTION INSIDE YOUR COMPONENT:
  const drawPayslip = (doc, record, startX, startY, width, height, currentPayslipApproverName, currentPayslipApproverPosition, periodStartDate, periodEndDate, employeePositions, numberFormatter, formatDateRange) => {
    const leftLabelX = startX + 15;
    const leftValueX = startX + width * 0.5 - 15; 
    const rightLabelX = startX + width * 0.55;
    const rightValueX = startX + width - 15; 
    const employeeValueX = startX + 120; 

    const lineSpacing = 11;
    const sectionSpacing = 18;
    let currentY = startY + 15;

    doc.setFontSize(10);
    doc.setFont(undefined, "bold");
    doc.text("JUSTINE'S SCRAP", startX + width / 2, currentY, { align: "center" });
    currentY += lineSpacing;
    doc.setFontSize(8);
    doc.setFont(undefined, "normal");
    doc.text("Pakiad Office, Brgy. Pakiad, Oton, Iloilo", startX + width / 2, currentY, { align: "center" });
    currentY += lineSpacing * 1.2;

    doc.setFontSize(9);
    doc.setFont(undefined, "bold");
    const periodLabel = "PAY SLIP for the period of";
    const periodValue = formatDateRange(periodStartDate, periodEndDate);
    const fullPeriodText = `${periodLabel} ${periodValue}`;
    doc.text(fullPeriodText, startX + width / 2, currentY, { align: "center" });
    currentY += sectionSpacing;

    doc.setFontSize(9);
    doc.setFont(undefined, "normal");

    doc.text("EMPLOYEE NAME:", leftLabelX, currentY);
    doc.setFont(undefined, "bold");
    doc.text(record.name || "-", employeeValueX, currentY);
    doc.setFont(undefined, "normal");
    currentY += lineSpacing;
    doc.text("EMPLOYEE DESIGNATION:", leftLabelX, currentY);
    const empDesignation = employeePositions[record.employeeId] || "-";
    doc.text(empDesignation, startX + 150 , currentY); // Adjusted X for designation
    currentY += lineSpacing;
    doc.text("EMPLOYEE #:", leftLabelX, currentY);
    doc.text(String(record.employeeId).split('.')[0] || "-", employeeValueX, currentY); // Ensure employeeId is string and no decimals
    const employeeNumY = currentY; 

    doc.setFont(undefined, "bold");
    doc.text("NET PAY:", rightLabelX, employeeNumY);
    doc.setFontSize(10);
    doc.text(numberFormatter.format(record.netPay || 0), rightValueX, employeeNumY, { align: "right" });
    doc.setFont(undefined, "normal");
    doc.setFontSize(9);

    currentY += sectionSpacing;

    doc.setDrawColor(180, 180, 180); 
    doc.setLineWidth(0.5);
    doc.line(startX + 5, currentY - sectionSpacing / 2, startX + width - 5, currentY - sectionSpacing / 2);
    doc.line(startX + width * 0.5, currentY - 5, startX + width * 0.5, startY + height - 45);

    const detailStartY = currentY;
    const valueColGrossX = leftValueX;
    const valueColDeductX = rightValueX;

    doc.setFont(undefined, "bold");
    doc.text("GROSS PAY", leftLabelX, currentY);
    doc.text(numberFormatter.format(record.totalGrossPay || 0), valueColGrossX, currentY, { align: "right" });
    currentY += lineSpacing * 1.5;

    doc.setFont(undefined, "normal");
    const grossPayItems = [
      // For Scrap Daily, "No. of Days" is record.regularDaysWorked, "Basic Pay" is record.dailyWage
      { label: "No. of Days:", value: String(record.regularDaysWorked || "-") },
      { label: "Basic Pay (Rate):", value: numberFormatter.format(record.dailyWage || 0) }, // Using dailyWage
      { label: "Adjustment:", value: numberFormatter.format(record.earningsAdjustment || 0) },
      { label: "Overtime:", value: numberFormatter.format(record.overTime || 0) },
      { label: "Holiday:", value: numberFormatter.format(record.holidayPay || 0) },
      { label: "13th Month:", value: numberFormatter.format(record.thirteenthMonth || 0) },
      { label: "SIL:", value: numberFormatter.format(record.silPay || 0) },
    ];

    grossPayItems.forEach((item) => {
      const itemValue = item.value === "0.00" || item.value === "-" ? "-" : item.value;
      doc.text(item.label, leftLabelX, currentY);
      doc.text(itemValue, valueColGrossX, currentY, { align: "right" });
      currentY += lineSpacing;
    });

    let deductionY = detailStartY; 
    doc.setFont(undefined, "bold");
    doc.text("DEDUCTIONS", rightLabelX, deductionY);
    doc.text(numberFormatter.format(record.totalDeductions || 0), valueColDeductX, deductionY, { align: "right" });
    deductionY += lineSpacing * 1.5;

    doc.setFont(undefined, "normal");
    const deductionItems = [
      { label: "Adjustment:", value: numberFormatter.format(record.deductionsAdjustment || 0) },
      { label: "SSS contrib:", value: numberFormatter.format(record.sss || 0) },
      { label: "Philhealth:", value: numberFormatter.format(record.philhealth || 0) },
      { label: "Pag-ibig:", value: numberFormatter.format(record.pagibig || 0) },
      { label: "CA/Charges:", value: numberFormatter.format(record.caCharges || 0) },
      { label: "W/H Tax:", value: numberFormatter.format(record.withholdingTax || 0) },
    ];

    deductionItems.forEach((item) => {
      const itemValue = item.value === "0.00" ? "-" : item.value;
      doc.text(item.label, rightLabelX, deductionY);
      doc.text(itemValue, valueColDeductX, deductionY, { align: "right" });
      deductionY += lineSpacing;
    });

    const lineSpacingForFooter = 11;
    const approvedByWidth = width * 0.4;
    const approvedBySectionX = leftLabelX; 
    const approvedByCenterX = approvedBySectionX + approvedByWidth / 2; 

    const signatureLineY = startY + height - 35; 
    const nameAboveLineY = signatureLineY - (lineSpacingForFooter * 0.5);
    const labelAboveNameY = nameAboveLineY - (lineSpacingForFooter * 2.5); 
    const positionBelowLineY = signatureLineY + lineSpacingForFooter; 

    doc.setFontSize(8);
    doc.setFont(undefined, "normal");

    doc.text("Approved By:", approvedBySectionX, labelAboveNameY, { align: "left" });

    if (currentPayslipApproverName && currentPayslipApproverName.trim() !== "") {
        doc.setFont(undefined, "bold");
        doc.text(currentPayslipApproverName, approvedByCenterX, nameAboveLineY, { align: "center" });
        doc.setFont(undefined, "normal");
    }
    
    doc.setLineWidth(0.5);
    doc.setDrawColor(0, 0, 0); 
    doc.line(approvedBySectionX, signatureLineY, approvedBySectionX + approvedByWidth, signatureLineY); 

    if (currentPayslipApproverPosition && currentPayslipApproverPosition.trim() !== "") {
        doc.text(currentPayslipApproverPosition, approvedByCenterX, positionBelowLineY, { align: "center" });
    }

    const receivedByX = startX + width - approvedByWidth - 15; 
    const receivedBySignatureLineY = signatureLineY; 
    const receivedByLabelY = receivedBySignatureLineY + lineSpacingForFooter; 

    doc.line(receivedByX, receivedBySignatureLineY, receivedByX + approvedByWidth, receivedBySignatureLineY); 
    doc.text("Received By (Signature / Date):", receivedByX + approvedByWidth / 2, receivedByLabelY, { align: "center" });

    doc.saveGraphicsState(); 
    doc.setFontSize(32); // Increased from 20 to 32 for wider text
    doc.setTextColor(200, 200, 200); 
    doc.setGState(new doc.GState({opacity: 0.2})); 
    
    const watermarkText = "JUSTINE'S SCRAP";
    const centerX = startX + width / 2;
    const centerY = startY + height / 2;
    const payslipWatermarkLineSpacing = 60; // Increased from 40 to 60 for wider spacing
    const offsets = [-2, -1, 0, 1, 2];

    for (const offsetMultiplier of offsets) {
      doc.text(watermarkText, centerX, centerY + offsetMultiplier * payslipWatermarkLineSpacing, { angle: 0, align: "center", baseline: "middle"});
    }
    doc.restoreGraphicsState(); 
  };

  // REPLACE THE PLACEHOLDER generatePayslipsWithApprover WITH THIS:
  const generatePayslipsWithApprover = async () => {
    setIsPayslipApproverModalOpen(false); 
    setIsGeneratingPayslips(true);
    try {
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "pt",
        format: "letter", // Standard letter size for 4-up payslips
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20; // Margin around the page for drawing area

      const payslipWidth = (pageWidth - margin * 2) / 2;
      const payslipHeight = (pageHeight - margin * 2) / 2;

      const quadrants = [
        { x: margin, y: margin }, // Top-Left
        { x: margin + payslipWidth, y: margin }, // Top-Right
        { x: margin, y: margin + payslipHeight }, // Bottom-Left
        { x: margin + payslipWidth, y: margin + payslipHeight }, // Bottom-Right
      ];

      const drawCutLines = (docInstance) => {
        const pgWidth = docInstance.internal.pageSize.getWidth();
        const pgHeight = docInstance.internal.pageSize.getHeight();
        const dashLength = 5;
        const gapLength = 3;
        docInstance.setDrawColor(150, 150, 150); 
        docInstance.setLineDashPattern([dashLength, gapLength], 0);
        docInstance.setLineWidth(0.5);
        docInstance.line(pgWidth / 2, margin / 2, pgWidth / 2, pgHeight - margin / 2);
        docInstance.line(margin / 2, pgHeight / 2, pgWidth - margin / 2, pgHeight / 2);
        docInstance.setLineDashPattern([], 0);
        docInstance.setDrawColor(0, 0, 0); 
      };

      let payslipIndexOnPage = 0;
      for (let i = 0; i < reportDetails.length; i++) {
        const record = reportDetails[i];
        if (i > 0 && payslipIndexOnPage === 0) { // Add new page for 5th payslip onwards
          drawCutLines(doc); 
          doc.addPage();
        }
        const { x, y } = quadrants[payslipIndexOnPage];
        
        // Call the standalone drawPayslip function
        drawPayslip(doc, record, x, y, payslipWidth, payslipHeight, payslipApproverName, payslipApproverPosition, periodStartDate, periodEndDate, employeePositions, numberFormatter, formatDateRange);

        payslipIndexOnPage = (payslipIndexOnPage + 1) % 4;
      }

      drawCutLines(doc); // Draw cut lines on the last page as well

      const startDateStr = formatDateForFilename(periodStartDate);
      const endDateStr = formatDateForFilename(periodEndDate);
      // Consistent filename prefix with other reports
      const filename = `Scrap_Daily_Payslips_${startDateStr}_to_${endDateStr}.pdf`;
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
        description: err.message || "An unexpected error occurred",
        status: "error",
      });
    } finally {
      setIsGeneratingPayslips(false);
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
            {/* Button Bar added before table */}
            <HStack spacing={3} mb={4} justifyContent="flex-end">
              <Button
                colorScheme="teal"
                variant="solid"
                onClick={handleGeneratePdf}
                isDisabled={loadingDetails || reportDetails.length === 0 || isGeneratingPdf}
                isLoading={isGeneratingPdf}
              >
                Generate PDF
              </Button>
              <Button
                bg="#800020"
                color="white"
                _hover={{ bg: "#600018" }}
                variant="solid"
                onClick={handleGeneratePayslips}
                isDisabled={loadingDetails || reportDetails.length === 0 || isGeneratingPayslips}
                isLoading={isGeneratingPayslips}
              >
                Generate Multiple Payslip
              </Button>
            </HStack>
            {/* Recreate the detailed table structure (Design Only) */}
            <TableContainer maxHeight="calc(100vh - 200px)" overflowY="auto">
              <Table
                variant="simple"
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
                    <Th isNumeric py={2}></Th> {/* Regular Days Placeholder */}
                    <Th isNumeric py={2} bg={earningsColBg}>
                      {pesoFormatter.format(detailTotals.basicPayForPeriod)}
                    </Th>{" "}
                    {/* Basic Pay Total */}
                    {/* Earnings - Use detailTotals */}
                    <Th isNumeric py={2} bg={earningsColBg}>
                      {pesoFormatter.format(detailTotals.earningsAdjustment)}
                    </Th>
                    <Th isNumeric py={2} bg={earningsColBg}>
                      {pesoFormatter.format(detailTotals.overTime)}
                    </Th>
                    <Th isNumeric py={2} bg={earningsColBg}>
                      {pesoFormatter.format(detailTotals.holidayPay)}
                    </Th>
                    <Th isNumeric py={2} bg={earningsColBg}>
                      {pesoFormatter.format(detailTotals.silPay)}
                    </Th>
                    <Th isNumeric py={2} bg={earningsColBg}>
                      {pesoFormatter.format(detailTotals.thirteenthMonth)}
                    </Th>
                    <Th isNumeric py={2} bg={earningsColBg}>
                      {pesoFormatter.format(detailTotals.totalGrossPay)}
                    </Th>
                    {/* Deductions - Use detailTotals */}
                    <Th isNumeric py={2} bg={deductionsColBg}>
                      {pesoFormatter.format(detailTotals.deductionsAdjustment)}
                    </Th>
                    <Th isNumeric py={2} bg={deductionsColBg}>
                      {pesoFormatter.format(detailTotals.sss)}
                    </Th>
                    <Th isNumeric py={2} bg={deductionsColBg}>
                      {pesoFormatter.format(detailTotals.philhealth)}
                    </Th>
                    <Th isNumeric py={2} bg={deductionsColBg}>
                      {pesoFormatter.format(detailTotals.pagibig)}
                    </Th>
                    <Th isNumeric py={2} bg={deductionsColBg}>
                      {pesoFormatter.format(detailTotals.caCharges)}
                    </Th>
                    <Th isNumeric py={2} bg={deductionsColBg}>
                      {pesoFormatter.format(detailTotals.withholdingTax)}
                    </Th>
                    <Th isNumeric py={2} bg={deductionsColBg}>
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
              // mr={3} // Removed margin as it might be the only button or adjust as needed
            >
              Close
            </Button>{" "}
            {/* Changed to outline red */}
            {/* Add Print/Export buttons here if needed later - MOVED TO MODAL BODY*/}
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Signatory Modal (Added) */}
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

      {/* Added: Payslip Approver Modal */}
      <Modal isOpen={isPayslipApproverModalOpen} onClose={() => setIsPayslipApproverModalOpen(false)} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader bg={primaryColor} color="white" borderTopRadius="md">
            Enter Payslip Approver Details
          </ModalHeader>
          <ModalCloseButton color="white" _focus={{ boxShadow: "none" }} _hover={{ bg: "whiteAlpha.300" }} />
          <ModalBody pb={6}>
            <FormControl mb={4}>
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
              onClick={generatePayslipsWithApprover} 
              isDisabled={isGeneratingPayslips}
              isLoading={isGeneratingPayslips}
            >
              Confirm & Generate Payslips
            </Button>
            <Button variant="outline" colorScheme="red" onClick={() => setIsPayslipApproverModalOpen(false)}>
              Cancel
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </MotionBox>
  );
};

export default ScrapDailyReportComp; // Renamed export
