import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Box,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Input,
  Button,
  Flex,
  Heading,
  Select,
  useToast,
  TableContainer,
  InputGroup,
  InputLeftElement,
  Stack,
  useColorModeValue,
  Badge,
  Tooltip,
  Spinner,
  Alert,
  AlertIcon,
  Image,
  Text,
  VStack,
  Grid,
  HStack,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  ModalFooter,
} from "@chakra-ui/react";
import { DownloadIcon, SearchIcon, ChevronLeftIcon, ChevronRightIcon } from "@chakra-ui/icons";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const TrucksReport = () => {
  const [trucks, setTrucks] = useState([]);
  const [filteredTrucks, setFilteredTrucks] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [selectedTruck, setSelectedTruck] = useState(null);
  const [truckExpenses, setTruckExpenses] = useState([]);
  const [expenseLoading, setExpenseLoading] = useState(false);
  const [expenseError, setExpenseError] = useState(null);
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [materialRequestExpenses, setMaterialRequestExpenses] = useState([]);

  useEffect(() => {
    fetchTrucks();
  }, []);
  
  // Effect to update pagination calculations when filters change
  useEffect(() => {
    // Calculate total items and pages based on filtered trucks
    setTotalItems(filteredTrucks.length);
    const calculatedTotalPages = Math.ceil(filteredTrucks.length / itemsPerPage);
    setTotalPages(calculatedTotalPages > 0 ? calculatedTotalPages : 1);
    
    // Reset to page 1 if current page is now invalid
    if (currentPage > calculatedTotalPages && calculatedTotalPages > 0) {
      setCurrentPage(1);
    }
  }, [filteredTrucks, itemsPerPage, currentPage]);

  const fetchTrucks = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/trucks`
      );
      setTrucks(response.data);
      setFilteredTrucks(response.data);
      setError(null);
    } catch (error) {
      console.error("Error fetching trucks:", error);
      setError("Failed to fetch vehicle data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    const term = e.target.value.toLowerCase();
    setSearchTerm(term);
    filterTrucks(term, statusFilter);
    setCurrentPage(1); // Reset to first page on search
  };

  const handleStatusFilter = (e) => {
    const status = e.target.value;
    setStatusFilter(status);
    filterTrucks(searchTerm, status);
    setCurrentPage(1); // Reset to first page on filter change
  };

  const filterTrucks = (term, status) => {
    const filtered = trucks.filter((truck) => {
      const matchesSearch =
        truck.plateNumber?.toLowerCase().includes(term) ||
        truck.registeredName?.toLowerCase().includes(term) ||
        truck.driverName?.toLowerCase().includes(term);
      const matchesStatus = status === "all" || truck.status === status;
      return matchesSearch && matchesStatus;
    });
    setFilteredTrucks(filtered);
  };
  
  // Function to get items for the current page
  const getCurrentPageItems = () => {
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    return filteredTrucks.slice(indexOfFirstItem, indexOfLastItem);
  };

  // Handle page change
  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  const handleGenerateReport = () => {
    if (filteredTrucks.length === 0) {
      toast({
        title: "No data to export",
        description:
          "There is no vehicle data matching your filters to export.",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    // Define colors for consistent use throughout the document - using more grayscale
    const colors = {
      maroon: [90, 0, 20], // Darker maroon for less ink usage
      darkBlue: [50, 60, 70], // More neutral dark color
      mediumBlue: [80, 90, 100], // More neutral medium color
      lightGray: [230, 230, 230], // Light gray instead of light blue
      veryLightGray: [242, 242, 242], // Very light gray instead of very light blue
      tableHeader: [80, 80, 80], // Gray table header
      tableAlternateRow: [248, 248, 248], // Very light gray alternating rows
      tableBorder: [200, 200, 200], // Gray borders
      white: [255, 255, 255],
      black: [0, 0, 0],
      darkGray: [60, 60, 60],
    };

    // Create PDF document
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    // Get page dimensions
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // ===== HEADER SECTION =====
    // Light gray header bar
    doc.setFillColor(234, 234, 234); // #EAEAEA
    doc.rect(0, 0, pageWidth, 28, "F");

    // Remove logo section
    // Header text
    doc.setTextColor(...colors.black);

    // Company name
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("JUSTINE'S CARGO SERVICES", 10, 12);

    // Proprietor name
    doc.setFontSize(10);
    doc.text("Mario C. Segovia - Prop", 10, 17);

    // Company address and details
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("Brgy. Ortiz St., Iloilo City • Philippines", 10, 22);

    // Report type
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("VEHICLE FLEET REPORT", pageWidth - 15, 12, {
      align: "right",
    });

    // Report metadata
    const today = new Date();
    const dateStr = today.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");

    // Find the oldest truck registration date
    const oldestTruck = filteredTrucks.reduce((oldest, truck) => {
      const truckDate = truck.registrationDate
        ? new Date(truck.registrationDate)
        : null;
      return oldest &&
        truckDate &&
        new Date(oldest.registrationDate) < truckDate
        ? oldest
        : truck;
    }, null);

    let periodText;
    if (oldestTruck && oldestTruck.registrationDate) {
      const oldestDate = new Date(oldestTruck.registrationDate);
      periodText = `${oldestDate.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })} - ${today.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })}`;
    } else {
      periodText = today.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });
    }

    doc.text(`Period: ${periodText}`, pageWidth - 15, 18, {
      align: "right",
    });

    // ===== REPORT INFO SECTION =====
    // Medium gray subheader bar
    doc.setFillColor(...colors.mediumBlue);
    doc.rect(0, 28, pageWidth, 14, "F");

    // Date generated
    const timeStr = today.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });

    doc.setTextColor(...colors.white);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(`Generated on: ${dateStr} at ${timeStr}`, 10, 36);

    // Status info
    if (statusFilter !== "all") {
      doc.text(`Status: ${statusFilter}`, pageWidth / 2, 36, {
        align: "center",
      });
    } else {
      doc.text("Status: All Vehicles", pageWidth / 2, 36, {
        align: "center",
      });
    }

    // Record count
    doc.text(`Records: ${filteredTrucks.length}`, pageWidth - 10, 36, {
      align: "right",
    });

    // ===== TABLE SECTION =====
    // Table starts below the report info section
    const tableTop = 48; // Fixed position for table start

    // Add a note about vehicle data
    doc.setTextColor(...colors.black);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);

    // Custom styles for the table
    const tableStyles = {
      startY: tableTop,
      theme: "grid",
      headStyles: {
        fillColor: colors.black,
        textColor: colors.white,
        fontStyle: "bold",
        lineWidth: 0.1,
        lineColor: colors.black,
      },
      bodyStyles: {
        fontSize: 8,
        cellPadding: 2,
        lineColor: colors.tableBorder,
        lineWidth: 0.1,
        textColor: colors.black,
      },
      alternateRowStyles: {
        fillColor: colors.tableAlternateRow,
      },
      columnStyles: {
        0: { fontStyle: "bold" },
        2: { fontStyle: "normal" },
        4: {
          fontStyle: "bold",
          fillColor: [242, 242, 242],
        },
      },
      margin: { left: 10, right: 10 },
      didDrawPage: (data) => {
        // Footer with page numbers
        const pageCount = doc.internal.getNumberOfPages();
        doc.setFontSize(8);
        doc.setTextColor(100);
        doc.text(
          `Page ${data.pageNumber} of ${pageCount}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: "center" }
        );
      },
    };

    // Create table data
    const tableData = filteredTrucks.map((truck, index) => [
      truck.plateNumber || "-",
      truck.registeredName || "-",
      truck.vehicleType || "-",
      truck.driverName || "-",
      truck.status || "-",
    ]);

    // Define table columns
    const tableColumns = [
      "Plate Number",
      "Registered Name",
      "Vehicle Type",
      "Driver Name",
      "Status",
    ];

    // Generate table
    autoTable(doc, {
      head: [tableColumns],
      body: tableData,
      ...tableStyles,
      margin: { bottom: 45 }, // Increased bottom margin to accommodate signature
    });

    // Get the final Y position after the table
    const finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY : 100;

    // Add signature section at bottom right
    const signatureY = finalY + 20;

    // Calculate right-aligned position (pageWidth - margin - signature width)
    const signatureX = pageWidth - 100; // 100mm from right edge

    // Get user info from localStorage
    const user = JSON.parse(localStorage.getItem("user")) || {};
    const userName = user.name || "Unknown User";
    const userPosition = user.workLevel || "Unknown Position";

    // Signature lines and titles
    doc.setFont("helvetica", "bold");
    doc.text("Prepared by:", signatureX, signatureY);

    doc.setFont("helvetica", "normal");
    doc.text(userName, signatureX + 15, signatureY + 13);

    // Add line for signature
    doc.line(signatureX, signatureY + 15, signatureX + 80, signatureY + 15);

    // Add title under signature line
    doc.setFontSize(8);
    doc.text(userPosition.toUpperCase(), signatureX + 30, signatureY + 20);

    // ===== FOOTER SECTION =====
    // Add footer to all pages
    const totalPages = doc.internal.getNumberOfPages();

    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);

      // Footer separator line
      doc.setDrawColor(...colors.darkGray);
      doc.setLineWidth(0.5);
      doc.line(10, pageHeight - 12, pageWidth - 10, pageHeight - 12);

      // Footer text
      doc.setFontSize(8);
      doc.setTextColor(...colors.black); // Black text instead of blue
      doc.setFont("helvetica", "normal");

      // Left aligned - company info
      doc.text("Justine's Cargo Services", 10, pageHeight - 6);
    }

    // Save the PDF
    const formattedDate = dateStr.replace(/,|\s+/g, "-");
    doc.save(`JCS-Vehicle-Fleet-Report-${formattedDate}.pdf`);

    toast({
      title: "Report Generated",
      description: "Your vehicle report has been generated successfully.",
      status: "success",
      duration: 3000,
      isClosable: true,
    });
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "active":
        return "green";
      case "under maintenance":
        return "orange";
      case "inactive":
        return "red";
      default:
        return "gray";
    }
  };

  const handleViewExpenses = async (truck) => {
    setSelectedTruck(truck);
    setIsExpenseModalOpen(true);
    setExpenseLoading(true);
    setExpenseError(null);
    setTruckExpenses([]);
    setMaterialRequestExpenses([]);
    setExpenseCategoryFilter("all");
    setStartDate("");
    setEndDate("");
    try {
      // Fetch trip expenses
      const tripRes = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/trip-expenses?plateNumber=${encodeURIComponent(truck.plateNumber)}`
      );
      setTruckExpenses(tripRes.data);
      // Fetch material requests
      const mrRes = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/material-requests?plateNumber=${encodeURIComponent(truck.plateNumber)}`
      );
      setMaterialRequestExpenses(mrRes.data);
    } catch (error) {
      setExpenseError("Failed to fetch expenses for this truck.");
    } finally {
      setExpenseLoading(false);
    }
  };

  // Combine and normalize expenses
  const allExpenses = [
    ...truckExpenses.map(exp => ({
      dateTime: exp.dateTime,
      ExpenseName: exp.ExpenseName,
      description: exp.description,
      value: exp.value,
      expenseCategory: exp.expenseCategory,
      source: "Trip Expense"
    })),
    ...materialRequestExpenses
      .filter(mr => mr.cost && mr.plateNumber === selectedTruck?.plateNumber)
      .map(mr => ({
        dateTime: mr.orderDate || mr.dateTime,
        ExpenseName: mr.itemID?.itemName || "Material Request",
        description: mr.remarks || "-",
        value: mr.quantity && mr.cost ? Number(mr.quantity) * Number(mr.cost) : 0,
        expenseCategory: mr.expenseCategory || "Other",
        source: "Material Request"
      }))
  ];

  const filteredTruckExpenses = allExpenses.filter((exp) => {
    // Category filter
    if (expenseCategoryFilter !== "all" && exp.expenseCategory !== expenseCategoryFilter) return false;
    // Date range filter
    if (startDate && new Date(exp.dateTime) < new Date(startDate)) return false;
    if (endDate && new Date(exp.dateTime) > new Date(endDate)) return false;
    return true;
  });

  // Calculate total for filteredTruckExpenses
  const totalExpenses = filteredTruckExpenses.reduce((sum, exp) => sum + (Number(exp.value) || 0), 0);

  const handleGenerateExpensesPDF = () => {
    if (filteredTruckExpenses.length === 0) {
      toast({
        title: "No data to export",
        description: "There are no expenses to export for this truck.",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    doc.setFontSize(16);
    doc.text(`Truck Expenses Report`, 10, 14);
    doc.setFontSize(10);
    doc.text(`Truck: ${selectedTruck?.plateNumber || "-"}`, 10, 20);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 10, 26);
    if (startDate || endDate) {
      doc.text(`Date Range: ${startDate || "-"} to ${endDate || "-"}`, 10, 32);
    }
    // Prepare table body
    const tableBody = filteredTruckExpenses.map((exp) => [
      exp.dateTime ? new Date(exp.dateTime).toLocaleDateString() : "-",
      exp.ExpenseName,
      exp.description || "-",
      (Number(exp.value) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 }),
      exp.expenseCategory,
      exp.source
    ]);
    // Add totals row
    tableBody.push([
      '', '', 'TOTAL', totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 }), '', ''
    ]);
    autoTable(doc, {
      startY: 36,
      head: [["Date", "Expense Name", "Description", "Cost", "Category", "Source"]],
      body: tableBody,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [80, 80, 80], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      margin: { left: 10, right: 10 },
      didDrawCell: (data) => {
        // Bold the total row
        if (data.row.index === tableBody.length - 1) {
          doc.setFont(undefined, 'bold');
        } else {
          doc.setFont(undefined, 'normal');
        }
      }
    });
    doc.save(`Truck-Expenses-${selectedTruck?.plateNumber || "Unknown"}.pdf`);
    toast({
      title: "PDF Generated",
      description: "The expenses report has been downloaded.",
      status: "success",
      duration: 3000,
      isClosable: true,
    });
  };

  return (
    <Box>
      {/* Header Section with Stats */}
      <Box
        mb={8}
        py={4}
        px={6}
        color="#1a365d"
        borderRadius="md"
        borderBottom="1px solid"
        borderColor="gray.200"
      >
        <Flex justify="space-between" align="center" mb={6}>
          <VStack align="start" spacing={1}>
            <Heading size="lg" color="#1a365d" fontWeight="bold">
              Vehicle Reports
            </Heading>
            <Text color="gray.500">
              Track and manage fleet information and vehicle status
            </Text>
          </VStack>
          <Button
            leftIcon={<DownloadIcon />}
            color="white"
            bg="#800020"
            _hover={{ bg: "#600010" }}
            variant="solid"
            size="md"
            onClick={handleGenerateReport}
          >
            Generate Report
          </Button>
        </Flex>

        {/* Quick Stats Cards */}
        <Grid templateColumns={{ base: "1fr", md: "repeat(4, 1fr)" }} gap={4}>
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
              Total Vehicles
            </Text>
            <Text fontSize="2xl" fontWeight="bold" color="#1a365d">
              {trucks.length}
            </Text>
          </Box>
          <Box
            bg="white"
            p={4}
            rounded="lg"
            shadow="sm"
            borderWidth="1px"
            borderColor="#800020"
            borderLeftWidth="4px"
          >
            <Text color="gray.500" fontSize="sm" mb={1}>
              Active Vehicles
            </Text>
            <Text fontSize="2xl" fontWeight="bold" color="#800020">
              {trucks.filter((truck) => truck.status === "Active").length}
            </Text>
          </Box>
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
              Under Maintenance
            </Text>
            <Text fontSize="2xl" fontWeight="bold" color="#1a365d">
              {
                trucks.filter((truck) => truck.status === "Under Maintenance")
                  .length
              }
            </Text>
          </Box>
          <Box
            bg="white"
            p={4}
            rounded="lg"
            shadow="sm"
            borderWidth="1px"
            borderColor="#800020"
            borderLeftWidth="4px"
          >
            <Text color="gray.500" fontSize="sm" mb={1}>
              Inactive Vehicles
            </Text>
            <Text fontSize="2xl" fontWeight="bold" color="#800020">
              {trucks.filter((truck) => truck.status === "Inactive").length}
            </Text>
          </Box>
        </Grid>
      </Box>

      {/* Main Content */}
      <Box
        bg="white"
        rounded="lg"
        shadow="md"
        borderWidth="1px"
        maxH="650px"
        display="flex"
        flexDirection="column"
      >
        {/* Search and Filter Bar */}
        <Flex
          p={4}
          borderBottomWidth="1px"
          justify="space-between"
          align="center"
          gap={4}
        >
          <Flex align="center" gap={4}>
            <Select
              maxW="200px"
              value={statusFilter}
              onChange={handleStatusFilter}
              bg="white"
              borderColor="gray.300"
              _hover={{ borderColor: "blue.300" }}
              size="lg"
              height="48px"
            >
              <option value="all">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Under Maintenance">Under Maintenance</option>
              <option value="Inactive">Inactive</option>
            </Select>

            <InputGroup size="lg" maxW="400px">
              <InputLeftElement pointerEvents="none">
                <SearchIcon color="gray.300" />
              </InputLeftElement>
              <Input
                placeholder="Search by plate number, registered name or driver..."
                value={searchTerm}
                onChange={handleSearch}
                bg="white"
                borderColor="gray.300"
                _hover={{ borderColor: "blue.300" }}
                _focus={{
                  borderColor: "blue.500",
                  boxShadow: "0 0 0 1px blue.500",
                }}
                borderRadius="md"
                size="lg"
                height="48px"
                _placeholder={{ color: "gray.400" }}
              />
            </InputGroup>
          </Flex>
        </Flex>

        {/* Table Section */}
        {loading ? (
          <Flex justify="center" align="center" h="200px">
            <Spinner size="xl" color="#1a365d" thickness="4px" />
          </Flex>
        ) : error ? (
          <Alert
            status="error"
            variant="subtle"
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
            textAlign="center"
            height="200px"
          >
            <AlertIcon boxSize="40px" mr={0} />
            <Text mt={4} fontSize="lg">
              {error}
            </Text>
          </Alert>
        ) : filteredTrucks.length === 0 ? (
          <Alert
            status="info"
            variant="subtle"
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
            textAlign="center"
            height="200px"
          >
            <AlertIcon boxSize="40px" mr={0} />
            <Text mt={4} fontSize="lg">
              No vehicle data found with the current filters.
            </Text>
          </Alert>
        ) : (
          <Box flex="1" overflowX="auto" overflowY="auto">
            <Table variant="simple" size="md">
              <Thead
                bg="gray.50"
                position="sticky"
                top={0}
                zIndex={1}
                boxShadow="sm"
              >
                <Tr>
                  <Th fontWeight="semibold" color="gray.700">
                    No.
                  </Th>
                  <Th fontWeight="semibold" color="gray.700">
                    Plate Number
                  </Th>
                  <Th fontWeight="semibold" color="gray.700">
                    Registered Name
                  </Th>
                  <Th fontWeight="semibold" color="gray.700">
                    Vehicle Type
                  </Th>
                  <Th fontWeight="semibold" color="gray.700">
                    Status
                  </Th>
                  <Th fontWeight="semibold" color="gray.700">
                    Driver Name
                  </Th>
                  <Th fontWeight="semibold" color="gray.700">Expenses</Th>
                </Tr>
              </Thead>
              <Tbody>
                {getCurrentPageItems().map((truck, index) => (
                  <Tr
                    key={truck._id || index}
                    _hover={{ bg: "gray.50" }}
                    transition="all 0.2s"
                  >
                    <Td fontWeight="medium" color="gray.700">
                      {(currentPage - 1) * itemsPerPage + index + 1}
                    </Td>
                    <Td fontWeight="medium" color="#1a365d">
                      {truck.plateNumber || "-"}
                    </Td>
                    <Td>{truck.registeredName || "-"}</Td>
                    <Td>{truck.vehicleType || "-"}</Td>
                    <Td>
                      <Badge
                        bg={getStatusColor(truck.status)}
                        color="white"
                        px={2}
                        py={1}
                        borderRadius="md"
                      >
                        {truck.status || "Unknown"}
                      </Badge>
                    </Td>
                    <Td>{truck.driverName || "-"}</Td>
                    <Td>
                      <Button size="sm" bg="#800020" color="white" _hover={{ bg: "#600010" }} onClick={() => handleViewExpenses(truck)}>
                        View Expenses
                      </Button>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
        )}
        
        {/* Pagination Controls */}
        {totalItems > 0 && (
          <Box px={4} py={4} borderTop="1px solid" borderColor="gray.200">
            <Flex justify="space-between" align="center">
              <Text fontSize="sm" color="gray.600">
                Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} vehicles
              </Text>
              
              <Flex>
                <Select 
                  size="sm" 
                  width="80px" 
                  value={itemsPerPage}
                  mr={4}
                  onChange={(e) => {
                    const newItemsPerPage = Number(e.target.value);
                    setItemsPerPage(newItemsPerPage);
                    setCurrentPage(1); // Reset to first page when changing items per page
                  }}
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </Select>
                
                <Flex>
                  <Button
                    onClick={() => handlePageChange(1)}
                    disabled={currentPage === 1}
                    size="sm"
                    mx={1}
                    colorScheme="blue"
                    variant={currentPage === 1 ? "outline" : "solid"}
                  >
                    First
                  </Button>
                  <Button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    size="sm"
                    mx={1}
                    colorScheme="blue"
                    variant="outline"
                  >
                    Prev
                  </Button>
                  
                  {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
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
                        size="sm"
                        mx={1}
                        colorScheme="blue"
                        variant={currentPage === pageNum ? "solid" : "outline"}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                  
                  <Button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    size="sm"
                    mx={1}
                    colorScheme="blue"
                    variant="outline"
                  >
                    Next
                  </Button>
                  <Button
                    onClick={() => handlePageChange(totalPages)}
                    disabled={currentPage === totalPages}
                    size="sm"
                    mx={1}
                    colorScheme="blue"
                    variant={currentPage === totalPages ? "outline" : "solid"}
                  >
                    Last
                  </Button>
                </Flex>
              </Flex>
            </Flex>
          </Box>
        )}
      </Box>

      <Modal isOpen={isExpenseModalOpen} onClose={() => setIsExpenseModalOpen(false)} size="4xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            Expenses for Truck: {selectedTruck?.plateNumber}
          </ModalHeader>
          <ModalCloseButton />
          <Box px={6} py={2} fontWeight="bold" color="#800020" fontSize="lg">
            Total Expenses: {totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </Box>
          <ModalBody>
            <Flex mb={4} align="center" gap={4} wrap="wrap">
              <Select
                value={expenseCategoryFilter}
                onChange={(e) => setExpenseCategoryFilter(e.target.value)}
                maxW="220px"
              >
                <option value="all">All Categories</option>
                <option value="Operating Expenses">Operating Expenses</option>
                <option value="Capital Expenses">Capital Expenses</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Utilities">Utilities</option>
                <option value="Other">Other</option>
              </Select>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                maxW="170px"
                placeholder="Start Date"
              />
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                maxW="170px"
                placeholder="End Date"
              />
              <Button bg="#800020" color="white" _hover={{ bg: "#600010" }} size="sm" onClick={handleGenerateExpensesPDF}>
                Generate PDF
              </Button>
            </Flex>
            {expenseLoading ? (
              <Flex justify="center" align="center" h="120px">
                <Spinner size="lg" color="blue.500" />
              </Flex>
            ) : expenseError ? (
              <Alert status="error">
                <AlertIcon />
                {expenseError}
              </Alert>
            ) : filteredTruckExpenses.length === 0 ? (
              <Alert status="info">
                <AlertIcon />
                No expenses found for this truck.
              </Alert>
            ) : (
              <TableContainer maxH="400px" overflowY="auto">
                <Table size="sm" variant="striped">
                  <Thead>
                    <Tr>
                      <Th>Date</Th>
                      <Th>Expense Name</Th>
                      <Th>Description</Th>
                      <Th isNumeric>Cost</Th>
                      <Th>Category</Th>
                      <Th>Source</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {filteredTruckExpenses.map((exp, idx) => (
                      <Tr key={idx}>
                        <Td>{exp.dateTime ? new Date(exp.dateTime).toLocaleDateString() : "-"}</Td>
                        <Td>{exp.ExpenseName}</Td>
                        <Td>{exp.description || "-"}</Td>
                        <Td isNumeric>{(Number(exp.value) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</Td>
                        <Td>
                          <Badge
                            colorScheme={
                              exp.expenseCategory === "Operating Expenses"
                                ? "blue"
                                : exp.expenseCategory === "Capital Expenses"
                                ? "purple"
                                : exp.expenseCategory === "Maintenance"
                                ? "orange"
                                : exp.expenseCategory === "Utilities"
                                ? "green"
                                : "gray"
                            }
                          >
                            {exp.expenseCategory}
                          </Badge>
                        </Td>
                        <Td>{exp.source}</Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </TableContainer>
            )}
          </ModalBody>
          <ModalFooter>
            <Button onClick={() => setIsExpenseModalOpen(false)} colorScheme="gray">
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default TrucksReport;
