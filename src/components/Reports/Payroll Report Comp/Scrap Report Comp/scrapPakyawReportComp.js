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
          `${process.env.NEXT_PUBLIC_BACKEND_API}/api/reports/payroll/scrap-pakyaw/latest-summary`,
          {
            params: {
              startDate: periodStartDate,
              endDate: periodEndDate,
            },
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        console.log('Summary response:', response.data); // Log summary response
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
    console.log('handleViewDetails called with reportObjectId:', reportObjectId); // Log the ID
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
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/reports/payroll/scrap-pakyaw/${reportObjectId}/details`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      console.log('Details response:', response.data); // Log details response
      setReportDetails(response.data || []);
      onDetailsModalOpen(); // Open modal only after successful fetch
    } catch (err) {
      console.error(
        `Error fetching pakyaw scrap report details for ID ${reportObjectId}:`,
        err
      );
      const errorMsg =
        err.response?.data?.message ||
        err.message ||
        "Failed to fetch pakyaw scrap report details.";
      setDetailsError(errorMsg);
      toast({
        title: "Error Fetching Pakyaw Scrap Details",
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
        acc.kilo += parseFloat(record.kilo) || 0;
        acc.rate += parseFloat(record.rate) || 0;
        acc.total += parseFloat(record.total) || 0;
        acc.deduction += parseFloat(record.deduction) || 0;
        acc.netTotal += parseFloat(record.netTotal) || 0;
        return acc;
      },
      {
        kilo: 0,
        rate: 0,
        total: 0,
        deduction: 0,
        netTotal: 0,
      }
    );
  }, [reportDetails]);

  // --- PDF Generation Logic (Adapted for Pakyaw Report) ---
  const handleGeneratePdf = () => {
    if (!reportDetails || reportDetails.length === 0) {
      toast({ title: "No data to generate PDF", status: "warning" });
      return;
    }
    // Reset signatory fields before opening modal (optional, good practice)
    setPreparedByName("");
    setPreparedByPosition("");
    setNotedByName("");
    setNotedByPosition("");
    setApprovedByName("");
    setApprovedByPosition("");
    setIsSignatoryModalOpen(true);
  };

  // Function to actually generate PDF after signatory input
  const generatePdfWithSignatories = () => {
    setIsSignatoryModalOpen(false);
    setIsGeneratingPdf(true);
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' }); // Letter size paper

      const mainTitle = "JUSTINE'S SCRAP";
      const reportTitle = "PAKYAW PAYROLL";
      const periodText = `Period Covered: ${formatDateRange(periodStartDate, periodEndDate)}`;

      doc.setFontSize(14);
      doc.setFont(undefined, "bold");
      doc.text(mainTitle, doc.internal.pageSize.getWidth() / 2, 30, { align: "center" });
      doc.setFontSize(12);
      doc.text(reportTitle, doc.internal.pageSize.getWidth() / 2, 48, { align: "center" });
      doc.setFontSize(9);
      doc.setFont(undefined, "normal");
      doc.text(periodText, doc.internal.pageSize.getWidth() / 2, 62, { align: "center" });

      const tableColumn = ["Employee ID", "Name", "Kilo", "Rate", "Total", "Deduction", "Net Total"];
      const tableRows = [];

      // Group data by category
      const groupedByCategory = reportDetails.reduce((acc, record) => {
        const category = record.category || 'Uncategorized';
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(record);
        return acc;
      }, {});

      // Iterate over grouped data to build table rows
      for (const categoryName in groupedByCategory) {
        if (groupedByCategory.hasOwnProperty(categoryName)) {
          // Add category header row with pink background
          tableRows.push([
            {
              content: categoryName.toUpperCase(),
              colSpan: tableColumn.length,
              styles: {
                halign: 'center',
                fontStyle: 'bold',
                fillColor: [255, 105, 180], // Pink background
                textColor: [255, 255, 255], // White text for contrast
                fontSize: 9,
                cellPadding: 3,
              }
            }
          ]);

          // Add employee rows for this category
          groupedByCategory[categoryName].forEach(record => {
            const recordData = [
              record.employeeId || "-",
              record.name || "-",
              record.kilo || 0,
              numberFormatter.format(record.rate || 0),
              numberFormatter.format(record.total || 0),
              numberFormatter.format(record.deduction || 0),
              numberFormatter.format(record.netTotal || 0)
            ];
            tableRows.push(recordData);
          });
        }
      }

      // Footer Row for Totals
      const footerRow = [
        { content: "TOTALS:", colSpan: 2, styles: { halign: 'right', fontStyle: 'bold'} },
        { content: detailTotals.kilo, styles: { halign: 'right', fontStyle: 'bold' } },
        { content: "", styles: { halign: 'right', fontStyle: 'bold' } },
        { content: numberFormatter.format(detailTotals.total), styles: { halign: 'right', fontStyle: 'bold' } },
        { content: numberFormatter.format(detailTotals.deduction), styles: { halign: 'right', fontStyle: 'bold' } },
        { content: numberFormatter.format(detailTotals.netTotal), styles: { halign: 'right', fontStyle: 'bold' } }
      ];
      
      const columnWidths = [60, 120, 50, 60, 70, 70, 70]; // Widths from columnStyles
      const tableWidth = columnWidths.reduce((sum, width) => sum + width, 0);
      const pageWidth = doc.internal.pageSize.getWidth();
      const horizontalMargin = Math.max(30, (pageWidth - tableWidth) / 2); // Ensure a minimum margin of 30 if table is too wide
      
      let tableStartY = 75;
      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        foot: [footerRow],
        startY: tableStartY,
        theme: 'grid',
        margin: { top: 30, right: horizontalMargin, bottom: 70, left: horizontalMargin },
        styles: {
          font: "helvetica",
          fontSize: 8,
          cellPadding: 2,
          fillColor: [255, 255, 255], // White background
          textColor: [0, 0, 0], // Black text
          overflow: 'linebreak',
          lineWidth: 0.3,
          lineColor: [0, 0, 0] // Black grid lines
        },
        headStyles: {
          fontStyle: "bold",
          fillColor: [255, 255, 255], // White background
          textColor: [0, 0, 0], // Black text
          halign: 'center',
          valign: "middle",
          lineWidth: { bottom: 0.6, top: 0.3, left: 0.3, right: 0.3 },
        },
        footStyles: {
          fontStyle: "bold",
          fillColor: [255, 255, 255], // White background
          textColor: [0, 0, 0], // Black text
          halign: 'right',
          valign: "middle",
          lineWidth: 0.3,
        },
        columnStyles: {
          0: { halign: 'left', cellWidth: 60 },
          1: { halign: 'left', cellWidth: 120 },
          2: { halign: 'right', cellWidth: 50 },
          3: { halign: 'right', cellWidth: 60 },
          4: { halign: 'right', cellWidth: 70 },
          5: { halign: 'right', cellWidth: 70 },
          6: { halign: 'right', cellWidth: 70 },
        },
        didDrawPage: (data) => {
          const pageWidth = doc.internal.pageSize.getWidth();
          const pageHeight = doc.internal.pageSize.getHeight();
          const margin = data.settings.margin.left;
          const blockWidth = 150;
          const blockSpacing = 15;
          const totalFooterWidth = 3 * blockWidth + 2 * blockSpacing;
          let footerStartX = (pageWidth - totalFooterWidth) / 2;
          if (footerStartX < margin) footerStartX = margin;

          const signatoryY = pageHeight - 55;
          const labelYOffset = 0;
          const nameYOffset = 18;
          const lineYOffset = 16;
          const positionYOffset = 30;
          let currentX = footerStartX;

          doc.setFontSize(7.5);

          const drawSignatoryBlock = (labelText, name, position) => {
            doc.setFont(undefined, "normal");
            doc.text(labelText, currentX, signatoryY + labelYOffset, { align: "left" });
            doc.setFont(undefined, "bold");
            const nameText = name || " ";
            doc.text(nameText, currentX + (blockWidth/2), signatoryY + nameYOffset, { align: "center" });
            doc.setFont(undefined, "normal");
            
            const signatureLineWidth = blockWidth * 0.80;
            const lineStartX = currentX + (blockWidth - signatureLineWidth) / 2;
            const lineEndX = lineStartX + signatureLineWidth;
            const lineY = signatoryY + nameYOffset + 2;

            doc.setLineWidth(0.5);
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
      const filename = `Pakyaw_Payroll_${startDateStr}_to_${endDateStr}.pdf`;
      doc.save(filename);

      toast({
        title: "PDF Generated",
        description: `${filename} saved.`,
        status: "success",
      });

    } catch (err) {
      console.error("Error generating Pakyaw PDF:", err);
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
  
  // ADD THIS HELPER FUNCTION INSIDE YOUR COMPONENT: (Reused from ScrapDaily, ensure fields match Pakyaw if needed)
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
    doc.text(empDesignation, startX + 150 , currentY); 
    currentY += lineSpacing;
    doc.text("EMPLOYEE #:", leftLabelX, currentY);
    doc.text(String(record.employeeId).split('.')[0] || "-", employeeValueX, currentY); 
    const employeeNumY = currentY; 

    doc.setFont(undefined, "bold");
    doc.text("NET PAY:", rightLabelX, employeeNumY); // Pakyaw uses netTotal
    doc.setFontSize(10);
    doc.text(numberFormatter.format(record.netTotal || 0), rightValueX, employeeNumY, { align: "right" }); // Pakyaw uses netTotal
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
    doc.text("GROSS PAY (TOTAL)", leftLabelX, currentY); // Pakyaw uses 'total' as gross
    doc.text(numberFormatter.format(record.total || 0), valueColGrossX, currentY, { align: "right" }); // Pakyaw uses 'total'
    currentY += lineSpacing * 1.5;

    doc.setFont(undefined, "normal");
    // For Pakyaw, gross details are simpler: Kilo and Rate leading to Total
    const grossPayItems = [
      { label: "Kilo:", value: String(record.kilo || "-") },
      { label: "Rate:", value: numberFormatter.format(record.rate || 0) },
      // Pakyaw doesn't have adjustments, overtime etc. directly in the same way as daily.
      // If there were other earnings components for Pakyaw, they'd be listed here.
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
    doc.text(numberFormatter.format(record.deduction || 0), valueColDeductX, deductionY, { align: "right" }); // Pakyaw uses 'deduction'
    deductionY += lineSpacing * 1.5;

    doc.setFont(undefined, "normal");
    // Pakyaw 'deduction' is a single field. If it had sub-components, they'd be listed.
    // For simplicity, we might just show the total deduction or leave this section minimal for Pakyaw.
    // If 'deduction' needs to be broken down, that data needs to be available in 'record'.
    // Example: { label: "Total Deductions:", value: numberFormatter.format(record.deduction || 0) }
    // For now, this section will be blank if no sub-components are defined for Pakyaw's 'deduction'.
    // No standard SSS, Philhealth etc. for Pakyaw model typically.
     const deductionItems = [
       // If there are specific types of deductions for Pakyaw, list them.
       // For now, it's assumed 'record.deduction' is a lump sum.
       // { label: "Advance/Other:", value: numberFormatter.format(record.deduction || 0) }, // Example
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
    doc.setFontSize(32); 
    doc.setTextColor(200, 200, 200); 
    doc.setGState(new doc.GState({opacity: 0.2})); 
    
    const watermarkText = "JUSTINE'S SCRAP";
    const centerX = startX + width / 2;
    const centerY = startY + height / 2;
    const payslipWatermarkLineSpacing = 60;
    const offsets = [-2, -1, 0, 1, 2]; // Changed to 5 offsets for 5 lines

    // Create 5 lines of watermark text
    for (const offsetMultiplier of offsets) {
      doc.text(watermarkText, centerX, centerY + offsetMultiplier * payslipWatermarkLineSpacing, { angle: 0, align: "center", baseline: "middle"});
    }
    doc.restoreGraphicsState(); 
  };

  // Function to generate payslips after approver input (Adapted for Pakyaw)
  const generatePayslipsWithApprover = async () => {
    setIsPayslipApproverModalOpen(false); 
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

      const payslipWidth = (pageWidth - margin * 2) / 2;
      const payslipHeight = (pageHeight - margin * 2) / 2;

      const quadrants = [
        { x: margin, y: margin }, 
        { x: margin + payslipWidth, y: margin }, 
        { x: margin, y: margin + payslipHeight }, 
        { x: margin + payslipWidth, y: margin + payslipHeight }, 
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
        if (i > 0 && payslipIndexOnPage === 0) { 
          drawCutLines(doc); 
          doc.addPage();
        }
        const { x, y } = quadrants[payslipIndexOnPage];
        
        drawPayslip(doc, record, x, y, payslipWidth, payslipHeight, payslipApproverName, payslipApproverPosition, periodStartDate, periodEndDate, employeePositions, numberFormatter, formatDateRange);

        payslipIndexOnPage = (payslipIndexOnPage + 1) % 4;
      }

      drawCutLines(doc); 

      const startDateStr = formatDateForFilename(periodStartDate);
      const endDateStr = formatDateForFilename(periodEndDate);
      const filename = `Scrap_Pakyaw_Payslips_${startDateStr}_to_${endDateStr}.pdf`;
      doc.save(filename);

      toast({
        title: "Payslips Generated",
        description: `${filename} saved.`,
        status: "success",
      });
    } catch (err) {
      console.error("Error generating Pakyaw payslips:", err);
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
                  <Th color={secondaryColor} borderBottomWidth="2px" borderColor={secondaryColor}>Period Covered</Th>
                  <Th isNumeric color={secondaryColor} borderBottomWidth="2px" borderColor={secondaryColor}>No. of Employees</Th>
                  <Th color={secondaryColor} borderBottomWidth="2px" borderColor={secondaryColor}>Date Generated</Th>
                  <Th textAlign="center" color={secondaryColor} borderBottomWidth="2px" borderColor={secondaryColor}>Actions</Th>
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
                      <Alert status="error" variant="subtle">{error}</Alert>
                    </Td>
                  </Tr>
                ) : !payrollData ? (
                  <Tr>
                    <Td colSpan={4} textAlign="center" py={10}>No report generated for this period yet.</Td>
                  </Tr>
                ) : (
                  <Tr fontSize="xs" key={payrollData._id} _hover={{ bg: "gray.100" }}>
                    <Td>
                      <Text fontWeight="medium" color={primaryColor}>
                        {formatDateRange(payrollData.startDate, payrollData.endDate)}
                      </Text>
                    </Td>
                    <Td isNumeric>{payrollData.noOfEmployees}</Td>
                    <Td>{format(parseISO(payrollData.dateGenerated), "MMM d, yyyy HH:mm")}</Td>
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
            Pakyaw Payroll Details - {formatDateRange(periodStartDate, periodEndDate)}
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
                colorScheme="blue"
                variant="solid"
                bg="#1a365d"  // Dark blue background
                _hover={{ bg: "#2a4a7d" }}  // Slightly lighter blue on hover
                onClick={handleGeneratePdf}
                isDisabled={loadingDetails || reportDetails.length === 0 || isGeneratingPdf}
                isLoading={isGeneratingPdf}
              >
                Generate Report PDF
              </Button>
              <Button
                colorScheme="red"
                variant="solid"
                bg={primaryColor}
                _hover={{ bg: "#600018" }} // Darker maroon on hover
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
                <Thead
                  position="sticky"
                  top={0}
                  zIndex={1}
                  bg="white"
                  boxShadow="sm"
                >
                  <Tr>
                    <Th borderBottomWidth="2px" borderColor={secondaryColor} textAlign="center" verticalAlign="middle">Employee ID</Th>
                    <Th borderBottomWidth="2px" borderColor={secondaryColor} textAlign="center" verticalAlign="middle">Name</Th>
                    <Th borderBottomWidth="2px" borderColor={secondaryColor} textAlign="center" verticalAlign="middle">Kilo</Th>
                    <Th borderBottomWidth="2px" borderColor={secondaryColor} textAlign="center" verticalAlign="middle">Rate</Th>
                    <Th borderBottomWidth="2px" borderColor={secondaryColor} textAlign="center" verticalAlign="middle">Total</Th>
                    <Th borderBottomWidth="2px" borderColor={secondaryColor} textAlign="center" verticalAlign="middle">Deduction</Th>
                    <Th borderBottomWidth="2px" borderColor={secondaryColor} textAlign="center" verticalAlign="middle">Net Total</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {loadingDetails ? (
                    <Tr>
                      <Td colSpan={8} textAlign="center" py={10}>
                        <Spinner size="xl" color={primaryColor} />
                      </Td>
                    </Tr>
                  ) : detailsError ? (
                    <Tr>
                      <Td colSpan={8} textAlign="center" py={10}>
                        <Alert status="error">{detailsError}</Alert>
                      </Td>
                    </Tr>
                  ) : reportDetails.length === 0 ? (
                    <Tr>
                      <Td colSpan={8} textAlign="center" py={10}>
                        No details found for this report.
                      </Td>
                    </Tr>
                  ) : (
                    reportDetails.map((record, index) => (
                      <Tr fontSize="xs" key={record._id || index} _hover={{ bg: "gray.50" }}>
                        <Td px={2}>{record.employeeId}</Td>
                        <Td px={2} whiteSpace="nowrap">{record.name}</Td>
                        <Td px={2} isNumeric>{record.kilo || 0}</Td>
                        <Td px={2} isNumeric>{pesoFormatter.format(record.rate || 0)}</Td>
                        <Td px={2} isNumeric>{pesoFormatter.format(record.total || 0)}</Td>
                        <Td px={2} isNumeric>{pesoFormatter.format(record.deduction || 0)}</Td>
                        <Td px={2} isNumeric fontWeight="bold">{pesoFormatter.format(record.netTotal || 0)}</Td>
                      </Tr>
                    ))
                  )}
                </Tbody>
                <Tfoot bg="blue.50" fontSize="xs" borderTopWidth="2px" borderColor={secondaryColor}>
                  <Tr>
                    <Th colSpan={2} textAlign="right" py={2} color={secondaryColor}>TOTALS:</Th>
                    <Th isNumeric py={2}>{detailTotals.kilo}</Th>
                    <Th isNumeric py={2}></Th>
                    <Th isNumeric py={2}>{pesoFormatter.format(detailTotals.total)}</Th>
                    <Th isNumeric py={2}>{pesoFormatter.format(detailTotals.deduction)}</Th>
                    <Th isNumeric py={2} fontWeight="bold">{pesoFormatter.format(detailTotals.netTotal)}</Th>
                    <Th py={2}></Th>
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
            {/* Changed to outline red */}
            {/* Add Print/Export buttons here if needed later */}
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Signatory Modal (Added for Pakyaw) */}
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

      {/* Added: Payslip Approver Modal (for Pakyaw) */}
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
