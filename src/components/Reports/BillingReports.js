import React, { useState, useEffect } from "react";
import {
  Box,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Input,
  InputGroup,
  InputLeftElement,
  Stack,
  Button,
  useColorModeValue,
  Badge,
  Tooltip,
  Flex,
  Text,
  Spinner,
  Alert,
  AlertIcon,
  Image,
  Heading,
  useToast,
  Select,
  VStack,
  Grid,
  HStack,
} from "@chakra-ui/react";
import { SearchIcon, DownloadIcon, ChevronLeftIcon, ChevronRightIcon } from "@chakra-ui/icons";
import axios from "axios";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const BillingReports = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [billingData, setBillingData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [userData, setUserData] = useState(null);
  const toast = useToast();
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch billing data
        const billingResponse = await axios.get(
          `${process.env.NEXT_PUBLIC_BACKEND_API}/api/billing`
        );
        setBillingData(billingResponse.data);

        // Try to get user data from localStorage first
        const storedUser = JSON.parse(localStorage.getItem("user"));
        if (storedUser) {
          try {
            // Fetch fresh user data using the same endpoint as SidebarWithHeader
            const userResponse = await axios.get(
              `${process.env.NEXT_PUBLIC_BACKEND_API}/api/users/${storedUser.id}`
            );
            console.log("Fetched user data:", userResponse.data);
            setUserData(userResponse.data);
            // Update localStorage with fresh data
            localStorage.setItem("user", JSON.stringify(userResponse.data));
          } catch (userError) {
            console.warn("Could not fetch user profile:", userError);
            console.log("Using stored user data:", storedUser);
            // Use stored user data as fallback
            setUserData(storedUser);
          }
        }

        setError(null);
      } catch (err) {
        console.error("Error fetching billing data:", err);
        setError("Failed to fetch billing data. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);
  
  // Effect to update pagination calculations when filters change
  useEffect(() => {
    const filteredData = getFilteredBillingData();
    setTotalItems(filteredData.length);
    const calculatedTotalPages = Math.ceil(filteredData.length / itemsPerPage);
    setTotalPages(calculatedTotalPages > 0 ? calculatedTotalPages : 1);
    
    // Reset to page 1 if current page is now invalid
    if (currentPage > calculatedTotalPages && calculatedTotalPages > 0) {
      setCurrentPage(1);
    }
  }, [billingData, searchTerm, dateRange, selectedStatus, itemsPerPage]);

  const getFilteredBillingData = () => {
    return billingData.filter((bill) => {
      // Filter by search term (store name, billing ID, or SI number)
      const searchMatch =
        bill.storeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bill.billingID?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bill.siNumber?.toLowerCase().includes(searchTerm.toLowerCase());

      // Filter by status
      const statusMatch =
        selectedStatus === "all" || bill.status === selectedStatus;

      // Filter by date range
      let dateMatch = true;
      const billDate = new Date(bill.invoiceDate);
      const today = new Date();

      if (dateRange === "lastMonth") {
        const lastMonth = new Date();
        lastMonth.setMonth(today.getMonth() - 1);
        dateMatch = billDate >= lastMonth && billDate <= today;
      } else if (dateRange === "last3Months") {
        const last3Months = new Date();
        last3Months.setMonth(today.getMonth() - 3);
        dateMatch = billDate >= last3Months && billDate <= today;
      } else if (dateRange === "last6Months") {
        const last6Months = new Date();
        last6Months.setMonth(today.getMonth() - 6);
        dateMatch = billDate >= last6Months && billDate <= today;
      } else if (dateRange === "lastYear") {
        const lastYear = new Date();
        lastYear.setFullYear(today.getFullYear() - 1);
        dateMatch = billDate >= lastYear && billDate <= today;
      }

      return searchMatch && statusMatch && dateMatch;
    });
  };
  
  // Function to get items for the current page
  const getCurrentPageItems = () => {
    const filteredData = getFilteredBillingData();
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    return filteredData.slice(indexOfFirstItem, indexOfLastItem);
  };

  // Handle page change
  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };
  
  // Reset pagination when filters change
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); // Reset to first page
  };
  
  const handleDateRangeChange = (e) => {
    setDateRange(e.target.value);
    setCurrentPage(1); // Reset to first page
  };
  
  const handleStatusChange = (e) => {
    setSelectedStatus(e.target.value);
    setCurrentPage(1); // Reset to first page
  };

  const handleGenerateReport = () => {
    const filteredData = getFilteredBillingData();

    if (filteredData.length === 0) {
      toast({
        title: "No data to export",
        description:
          "There is no billing data matching your filters to export.",
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
    doc.text("BILLING STATEMENT REPORT", pageWidth - 15, 12, {
      align: "right",
    });

    // Report metadata and date formatting
    const today = new Date();
    const dateStr = today.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    const timeStr = today.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const formatMonthYear = (date) => {
      return date.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });
    };

    let dateRangeText;
    switch (dateRange) {
      case "lastMonth": {
        const lastMonth = new Date();
        lastMonth.setMonth(today.getMonth() - 1);
        dateRangeText = formatMonthYear(lastMonth);
        break;
      }
      case "last3Months": {
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(today.getMonth() - 3);
        dateRangeText = `${formatMonthYear(threeMonthsAgo)} - ${formatMonthYear(
          today
        )}`;
        break;
      }
      case "last6Months": {
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(today.getMonth() - 6);
        dateRangeText = `${formatMonthYear(sixMonthsAgo)} - ${formatMonthYear(
          today
        )}`;
        break;
      }
      case "lastYear": {
        const lastYear = new Date();
        lastYear.setFullYear(today.getFullYear() - 1);
        dateRangeText = `${formatMonthYear(lastYear)} - ${formatMonthYear(
          today
        )}`;
        break;
      }
      default: {
        const oldestBill = billingData.reduce((oldest, bill) => {
          const billDate = new Date(bill.invoiceDate);
          return oldest && new Date(oldest.invoiceDate) < billDate
            ? oldest
            : bill;
        }, null);

        if (oldestBill) {
          const oldestDate = new Date(oldestBill.invoiceDate);
          dateRangeText = `${formatMonthYear(oldestDate)} - ${formatMonthYear(
            today
          )}`;
        } else {
          dateRangeText = formatMonthYear(today);
        }
      }
    }

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Period: ${dateRangeText}`, pageWidth - 15, 18, {
      align: "right",
    });

    // ===== REPORT INFO SECTION =====
    // Medium gray subheader bar
    doc.setFillColor(...colors.mediumBlue);
    doc.rect(0, 28, pageWidth, 14, "F");

    // Date generated
    doc.setTextColor(...colors.white);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(`Generated on: ${dateStr} at ${timeStr}`, 10, 36);

    // Filter info
    if (selectedStatus !== "all") {
      doc.text(`Status: ${selectedStatus}`, pageWidth / 2, 36, {
        align: "center",
      });
    }

    // Record count
    doc.text(`Records: ${filteredData.length}`, pageWidth - 10, 36, {
      align: "right",
    });

    // ===== TABLE SECTION =====
    // Table starts directly below the report info section (removing summary boxes)
    const tableTop = 48; // Start table right after the header sections

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
        5: { fontStyle: "normal" },
        6: { fontStyle: "normal" },
        7: { fontStyle: "normal" },
        8: { fontStyle: "normal" },
        9: {
          fontStyle: "bold",
          fillColor: [242, 242, 242],
        },
      },
      margin: { left: 10, right: 10 },
    };

    // Create table data
    const tableData = filteredData.map((bill) => [
      bill.billingID || "-",
      bill.siNumber || "-",
      bill.storeName || "-",
      bill.invoiceDate ? new Date(bill.invoiceDate).toLocaleDateString() : "-",
      bill.paidAt ? new Date(bill.paidAt).toLocaleDateString() : "-",
      bill.gross ? `${bill.gross.toFixed(2)}` : "0.00",
      bill.vat ? `${bill.vat.toFixed(2)}` : "0.00",
      bill.net ? `${bill.net.toFixed(2)}` : "0.00",
      bill.withTax ? `${bill.withTax.toFixed(2)}` : "0.00",
      bill.netAmount ? `${bill.netAmount.toFixed(2)}` : "0.00",
      bill.status || "-",
    ]);

    // Define table columns
    const tableColumns = [
      "Billing ID",
      "SI Number",
      "Store Name",
      "Invoice Date",
      "Payment Date",
      "Gross (PHP)",
      "VAT (PHP)",
      "Net (PHP)",
      "W/Tax (PHP)",
      "Net Amount (PHP)",
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

    // Get user info from state or localStorage as fallback
    const user = userData || JSON.parse(localStorage.getItem("user")) || {};
    const userName = user.name || "Unknown User";
    const userPosition =
      user.position || user.workLevel || user.role || "Unknown Position";

    // Set text color to black for signature section
    doc.setTextColor(...colors.black);

    // Signature lines and titles
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Prepared by:", signatureX, signatureY);

    // Add name
    doc.setFont("helvetica", "normal");
    doc.text(userName, signatureX + 15, signatureY + 15);

    // Add line for signature
    doc.setDrawColor(...colors.black);
    doc.line(signatureX, signatureY + 17, signatureX + 80, signatureY + 17);

    // Add work level/position under signature line with slightly larger font
    doc.setFontSize(9);
    doc.text(userPosition.toUpperCase(), signatureX + 15, signatureY + 25);

    // ===== FOOTER SECTION =====
    // Add footer to all pages
    const totalPages = doc.internal.getNumberOfPages();

    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);

      // Footer separator line
      doc.setDrawColor(...colors.darkGray); // Dark gray instead of blue
      doc.setLineWidth(0.5);
      doc.line(10, pageHeight - 12, pageWidth - 10, pageHeight - 12);

      // Footer text
      doc.setFontSize(8);
      doc.setTextColor(...colors.black); // Black text instead of blue
      doc.setFont("helvetica", "normal");

      // Left aligned - company info
      doc.text("Justine's Cargo Services", 10, pageHeight - 6);

      // Center aligned - page numbers
    }

    // Save the PDF with formatted date and new color scheme
    const formattedDate = dateStr.replace(/,|\s+/g, "-");
    doc.save(`JCS-Billing-Report-PHP-${formattedDate}.pdf`);

    toast({
      title: "Report Generated",
      description: "Your billing report has been generated successfully.",
      status: "success",
      duration: 3000,
      isClosable: true,
    });
  };

  // Status Badge color mapping
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "paid":
        return "green";
      case "pending":
        return "yellow";
      case "cancelled":
        return "red";
      default:
        return "gray";
    }
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
              Billing Reports
            </Heading>
            <Text color="gray.500">
              Monitor and analyze billing statements and payment records
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
              Total Billings
            </Text>
            <Text fontSize="2xl" fontWeight="bold" color="#1a365d">
              {billingData.length}
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
              Paid Billings
            </Text>
            <Text fontSize="2xl" fontWeight="bold" color="#800020">
              {billingData.filter((bill) => bill.status === "Paid").length}
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
              Pending Billings
            </Text>
            <Text fontSize="2xl" fontWeight="bold" color="#1a365d">
              {billingData.filter((bill) => bill.status === "Pending").length}
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
              Total Amount
            </Text>
            <Text fontSize="2xl" fontWeight="bold" color="#800020">
              ₱
              {billingData
                .reduce((sum, bill) => sum + (bill.netAmount || 0), 0)
                .toLocaleString()}
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
              value={dateRange}
              onChange={handleDateRangeChange}
              bg="white"
              borderColor="gray.300"
              _hover={{ borderColor: "blue.300" }}
              size="lg"
              height="48px"
            >
              <option value="all">All Time</option>
              <option value="lastMonth">Last Month</option>
              <option value="last3Months">Last 3 Months</option>
              <option value="last6Months">Last 6 Months</option>
              <option value="lastYear">Last Year</option>
            </Select>

            <Select
              maxW="200px"
              value={selectedStatus}
              onChange={handleStatusChange}
              bg="white"
              borderColor="gray.300"
              _hover={{ borderColor: "blue.300" }}
              size="lg"
              height="48px"
            >
              <option value="all">All Statuses</option>
              <option value="Paid">Paid</option>
              <option value="Pending">Pending</option>
              <option value="Overdue">Overdue</option>
              <option value="Cancelled">Cancelled</option>
            </Select>

            <InputGroup size="lg" maxW="400px">
              <InputLeftElement pointerEvents="none">
                <SearchIcon color="gray.300" />
              </InputLeftElement>
              <Input
                placeholder="Search by store name, billing ID or SI number"
                value={searchTerm}
                onChange={handleSearchChange}
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
        ) : getFilteredBillingData().length === 0 ? (
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
              No billing data found with the current filters.
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
                    Billing ID
                  </Th>
                  <Th fontWeight="semibold" color="gray.700">
                    SI Number
                  </Th>
                  <Th fontWeight="semibold" color="gray.700">
                    Store Name
                  </Th>
                  <Th fontWeight="semibold" color="gray.700">
                    Invoice Date
                  </Th>
                  <Th fontWeight="semibold" color="gray.700" isNumeric>
                    Gross
                  </Th>
                  <Th fontWeight="semibold" color="gray.700" isNumeric>
                    VAT
                  </Th>
                  <Th fontWeight="semibold" color="gray.700" isNumeric>
                    Net
                  </Th>
                  <Th fontWeight="semibold" color="gray.700" isNumeric>
                    W/Tax
                  </Th>
                  <Th fontWeight="semibold" color="gray.700" isNumeric>
                    Net Amount
                  </Th>
                  <Th fontWeight="semibold" color="gray.700">
                    Status
                  </Th>
                </Tr>
              </Thead>
              <Tbody>
                {getCurrentPageItems().map((bill, index) => (
                  <Tr
                    key={index}
                    _hover={{ bg: "gray.50" }}
                    transition="all 0.2s"
                  >
                    <Td fontWeight="medium" color="#1a365d">
                      {bill.billingID || "-"}
                    </Td>
                    <Td>{bill.siNumber || "-"}</Td>
                    <Td>{bill.storeName || "-"}</Td>
                    <Td>
                      {bill.invoiceDate
                        ? new Date(bill.invoiceDate).toLocaleDateString()
                        : "-"}
                    </Td>
                    <Td isNumeric>₱{bill.gross?.toFixed(2) || "0.00"}</Td>
                    <Td isNumeric>₱{bill.vat?.toFixed(2) || "0.00"}</Td>
                    <Td isNumeric>₱{bill.net?.toFixed(2) || "0.00"}</Td>
                    <Td isNumeric>₱{bill.withTax?.toFixed(2) || "0.00"}</Td>
                    <Td isNumeric fontWeight="bold" bg="blue.50">
                      ₱{bill.netAmount?.toFixed(2) || "0.00"}
                    </Td>
                    <Td>
                      <Badge
                        bg={getStatusColor(bill.status)}
                        color="white"
                        px={2}
                        py={1}
                        borderRadius="md"
                      >
                        {bill.status || "Unknown"}
                      </Badge>
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
                Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} billing entries
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
    </Box>
  );
};

export default BillingReports;
