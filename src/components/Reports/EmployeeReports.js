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

const EmployeeReports = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [employees, setEmployees] = useState([]);
  const [dismissedEmployees, setDismissedEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDismissed, setShowDismissed] = useState(false);
  const [statusFilter, setStatusFilter] = useState("active");
  const toast = useToast();
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        setLoading(true);
        // Fetch all employees from the reports endpoint
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_BACKEND_API}/api/employees/reports`
        );
        
        // Separate active and separated employees
        const allEmployees = response.data;
        const activeEmployees = allEmployees.filter(emp => !emp.dateSeparated);
        const separatedEmployees = allEmployees.filter(emp => emp.dateSeparated);
        
        setEmployees(activeEmployees);
        setDismissedEmployees(separatedEmployees);
        setError(null);
      } catch (err) {
        console.error("Error fetching employee data:", err);
        setError("Failed to fetch employee data. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchEmployees();
  }, []);
  
  // Effect to update pagination calculations when filters change
  useEffect(() => {
    const filteredData = getFilteredEmployees();
    setTotalItems(filteredData.length);
    const calculatedTotalPages = Math.ceil(filteredData.length / itemsPerPage);
    setTotalPages(calculatedTotalPages > 0 ? calculatedTotalPages : 1);
    
    // Reset to page 1 if current page is now invalid
    if (currentPage > calculatedTotalPages && calculatedTotalPages > 0) {
      setCurrentPage(1);
    }
  }, [employees, dismissedEmployees, searchTerm, statusFilter, itemsPerPage]);

  const getFilteredEmployees = () => {
    let employeeList = [];
    switch (statusFilter) {
      case "all":
        employeeList = [...employees, ...dismissedEmployees];
        break;
      case "active":
        employeeList = employees;
        break;
      case "dismissed":
        employeeList = dismissedEmployees;
        break;
      default:
        employeeList = employees;
    }

    return employeeList.filter((employee) =>
      `${employee.firstName} ${employee.lastName}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
    );
  };
  
  // Function to get employees for the current page
  const getCurrentPageEmployees = () => {
    const filteredData = getFilteredEmployees();
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
  
  const handleStatusChange = (e) => {
    setStatusFilter(e.target.value);
    setCurrentPage(1); // Reset to first page
  };

  const handleGenerateReport = (isDismissed = false) => {
    if (getFilteredEmployees().length === 0) {
      toast({
        title: "No data to export",
        description:
          "There is no employee data matching your filters to export.",
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
    let reportTitle;
    switch (statusFilter) {
      case "all":
        reportTitle = "COMPLETE EMPLOYEE REPORT";
        break;
      case "active":
        reportTitle = "ACTIVE EMPLOYEE REPORT";
        break;
      case "dismissed":
        reportTitle = "DISMISSED EMPLOYEE REPORT";
        break;
      default:
        reportTitle = "EMPLOYEE REPORT";
    }
    doc.text(reportTitle, pageWidth - 15, 12, { align: "right" });

    // Report metadata
    const today = new Date();
    const dateStr = today.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    let periodText;
    if (statusFilter === "all") {
      const oldestEmployee = getFilteredEmployees().reduce((oldest, emp) => {
        const empDate = new Date(emp.dateHired);
        return oldest && new Date(oldest.dateHired) < empDate ? oldest : emp;
      }, null);

      if (oldestEmployee) {
        const oldestDate = new Date(oldestEmployee.dateHired);
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
    doc.text(
      `Status: ${
        statusFilter === "all"
          ? "All"
          : statusFilter === "active"
            ? "Active"
            : "Dismissed"
      } Employees`,
      pageWidth / 2,
      36,
      { align: "center" }
    );

    // Record count
    doc.text(`Records: ${getFilteredEmployees().length}`, pageWidth - 10, 36, {
      align: "right",
    });

    // ===== TABLE SECTION =====
    // Table starts below the report info section
    const tableTop = 48; // Fixed position for table start

    // Add a note about employee data
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
        2: { fontStyle: "bold" },
        4: { cellWidth: 15 },
        5: { cellWidth: 15 },
        6: { cellWidth: 23 },
        7: { cellWidth: 23 },
        8: { cellWidth: 23 },
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
    const tableData = getFilteredEmployees().map((employee, index) => [
      employee.empID || "-",
      employee.position || "-",
      isDismissed
        ? employee.fullName
          ? employee.fullName
          : `${employee.lastName || ""}, ${employee.firstName || ""} ${
              employee.middleName || ""
            }`.trim()
        : `${employee.lastName || ""}, ${employee.firstName || ""} ${
            employee.middleName || ""
          }`.trim(),
      employee.contactInfo || "-",
      employee.dateHired
        ? new Date(employee.dateHired).toLocaleDateString()
        : "-",
      isDismissed && employee.dateSeparated
        ? new Date(employee.dateSeparated).toLocaleDateString()
        : "-",
      employee.sssNo || "-",
      employee.pagibigNo || "-",
      employee.philhealthNo || "-",
    ]);

    // Define table columns
    const tableColumns = [
      "Employee ID",
      "Position",
      "Full Name",
      "Contact Number",
      "Date Hired",
      isDismissed ? "Dismissal Date" : "Pay Method",
      "SSS Number",
      "Pag-ibig Number",
      "Philhealth Number",
    ];

    // Generate table with pagination
    autoTable(doc, {
      head: [tableColumns],
      body: tableData,
      ...tableStyles,
      margin: { top: tableTop, bottom: 20 }, // Add bottom margin for footer
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
    // Save the PDF
    const formattedDate = dateStr.replace(/,|\s+/g, "-");
    doc.save(
      `JCS-${
        statusFilter === "all" ? "Complete" : statusFilter
      }-Employee-Report-${formattedDate}.pdf`
    );

    toast({
      title: "Report Generated",
      description: "Your employee report has been generated successfully.",
      status: "success",
      duration: 3000,
      isClosable: true,
    });
  };

  // Status Badge color mapping - keeping minimal UI colors for the web interface
  const getPositionColor = (position) => {
    const positionMap = {
      Driver: "green",
      Helper: "blue",
      Manager: "purple",
      Staff: "teal",
      Dispatcher: "orange",
      Admin: "red",
    };

    return positionMap[position] || "gray";
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
              Employee Reports
            </Heading>
            <Text color="gray.500">
              View and manage comprehensive employee records and information
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
              Total Employees
            </Text>
            <Text fontSize="2xl" fontWeight="bold" color="#1a365d">
              {employees.length}
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
              Active Employees
            </Text>
            <Text fontSize="2xl" fontWeight="bold" color="#800020">
              {employees.filter((emp) => !emp.dateSeparated).length}
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
              Dismissed Employees
            </Text>
            <Text fontSize="2xl" fontWeight="bold" color="#1a365d">
              {dismissedEmployees.length}
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
              Total Departments
            </Text>
            <Text fontSize="2xl" fontWeight="bold" color="#800020">
              {
                new Set(
                  [...employees, ...dismissedEmployees].map(
                    (emp) => emp.position
                  )
                ).size
              }
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
              value={statusFilter}
              onChange={handleStatusChange}
              width="200px"
              bg="white"
              borderColor="gray.300"
              _hover={{ borderColor: "blue.300" }}
              size="lg"
              height="48px"
            >
              <option value="active">Active Employees</option>
              <option value="dismissed">Dismissed Employees</option>
              <option value="all">All Employees</option>
            </Select>

            <InputGroup size="lg" maxW="400px">
              <InputLeftElement pointerEvents="none">
                <SearchIcon color="gray.300" />
              </InputLeftElement>
              <Input
                placeholder="Search employees..."
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
        ) : getFilteredEmployees().length === 0 ? (
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
              No employee data found with the current filters.
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
                    Profile
                  </Th>
                  <Th fontWeight="semibold" color="gray.700">
                    Employee ID
                  </Th>
                  <Th fontWeight="semibold" color="gray.700">
                    Full Name
                  </Th>
                  <Th fontWeight="semibold" color="gray.700">
                    Contact Number
                  </Th>
                  <Th fontWeight="semibold" color="gray.700">
                    Position
                  </Th>
                  {statusFilter === "dismissed" && (
                    <Th fontWeight="semibold" color="gray.700">
                      Dismissal Date
                    </Th>
                  )}
                  <Th fontWeight="semibold" color="gray.700">
                    Date Hired
                  </Th>
                  <Th fontWeight="semibold" color="gray.700">
                    SSS Number
                  </Th>
                  <Th fontWeight="semibold" color="gray.700">
                    Pag-ibig Number
                  </Th>
                  <Th fontWeight="semibold" color="gray.700">
                    Philhealth Number
                  </Th>
                </Tr>
              </Thead>
              <Tbody>
                {getCurrentPageEmployees().map((employee, index) => (
                  <Tr
                    key={employee._id || index}
                    _hover={{ bg: "gray.50" }}
                    transition="all 0.2s"
                  >
                    <Td fontWeight="medium" color="gray.700">
                      {(currentPage - 1) * itemsPerPage + index + 1}
                    </Td>
                    <Td>
                      <Image
                        src={
                          employee.profileImage
                            ? `${process.env.NEXT_PUBLIC_BACKEND_API}/uploads/${employee.profileImage}`
                            : "/fallback-profile.jpg"
                        }
                        boxSize="50px"
                        borderRadius="full"
                        alt="Profile"
                        border="2px solid"
                        borderColor="gray.200"
                      />
                    </Td>
                    <Td fontWeight="medium" color="#1a365d">
                      {employee.empID || "N/A"}
                    </Td>
                    <Td fontWeight="medium" color="gray.700">
                      {`${employee.lastName || ""}, ${employee.firstName || ""} ${
                        employee.middleName || ""
                      }`.trim() || "N/A"}
                    </Td>
                    <Td color="gray.600">
                      <Tooltip label="Click to call">
                        <Button
                          variant="link"
                          color="#1a365d"
                          onClick={() =>
                            console.log(`Calling ${employee.contactInfo}`)
                          }
                        >
                          {employee.contactInfo || "N/A"}
                        </Button>
                      </Tooltip>
                    </Td>
                    <Td>
                      <Badge
                        bg={getPositionColor(employee.position)}
                        color="white"
                        px={2}
                        py={1}
                        borderRadius="md"
                      >
                        {employee.position || "N/A"}
                      </Badge>
                    </Td>
                    {statusFilter === "dismissed" && (
                      <Td color="gray.600">
                        {employee.dateSeparated
                          ? new Date(employee.dateSeparated).toLocaleDateString()
                          : "N/A"}
                      </Td>
                    )}
                    <Td color="gray.600">
                      {employee.dateHired
                        ? new Date(employee.dateHired).toLocaleDateString()
                        : "N/A"}
                    </Td>
                    <Td color="gray.600">{employee.sssNo || "N/A"}</Td>
                    <Td color="gray.600">{employee.pagibigNo || "N/A"}</Td>
                    <Td color="gray.600">{employee.philhealthNo || "N/A"}</Td>
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
                Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} employees
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

export default EmployeeReports;
