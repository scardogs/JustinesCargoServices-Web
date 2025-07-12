import React, { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios"; // Import axios
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
} from "@chakra-ui/react";
import { SearchIcon, DownloadIcon } from "@chakra-ui/icons";
import { motion } from "framer-motion";
import { format, parseISO, startOfMonth, endOfMonth } from "date-fns"; // Import date-fns functions
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import {
  FaUsers,
  FaMoneyBillWave,
  FaCalculator,
  FaWallet,
} from "react-icons/fa";
import MonthlyPayrollComponent from './Cargo/payroll-cargo.Monthly.js'; // Updated import path
import DailyPayrollComponent from './Cargo/payroll-cargo.Daily.js'; // Added import
import PerTripPayrollComponent from './Cargo/payroll-cargo.PerTrip.js'; // Added PerTrip import

const MotionBox = motion(Box);
const MotionTr = motion(Tr);

const CargoMainPayroll = () => { // Renamed component
  const [searchQuery, setSearchQuery] = useState("");
  const [payrollData, setPayrollData] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);
  const [tabIndex, setTabIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false); // Loading state
  const [error, setError] = useState(null); // Error state
  const toast = useToast();

  // State for Date Range Modal
  const { isOpen: isDateModalOpen, onOpen: onDateModalOpen, onClose: onDateModalClose } = useDisclosure();
  const [tempStartDate, setTempStartDate] = useState("");
  const [tempEndDate, setTempEndDate] = useState("");
  const [appliedDateRange, setAppliedDateRange] = useState(""); // To store "Month Day - Day, Year"

  // Color scheme constants
  const primaryColor = "#800020"; // Maroon
  const secondaryColor = "#1a365d"; // Dark Blue
  const accentColor = "#2b6cb0"; // Medium Blue
  const lightAccent = "#ebf8ff"; // Light Blue
  const lightMaroon = "#fff0f0"; // Light Maroon

  // Format date for input type="date"
  const formatDateForInput = (date) => {
    if (!date) return "";
    try {
      // Handles both Date objects and ISO strings
      const dateObj = typeof date === 'string' ? parseISO(date) : date;
      return format(dateObj, "yyyy-MM-dd");
    } catch (e) {
      console.error("Error formatting date:", e);
      return "";
    }
  };

  // Calculate payroll for a single record
  const calculatePayroll = (record) => {
    const monthlyBasicPay = parseFloat(record.monthlyBasicPay) || 0;
    const regularDaysWorked = parseFloat(record.regularDaysWorked) || 0; // Get regular days worked
    const thirteenthMonth = parseFloat(record.thirteenthMonth) || 0;
    const sss = parseFloat(record.sss) || 0;
    const philhealth = parseFloat(record.philhealth) || 0;
    const pagibig = parseFloat(record.pagibig) || 0;
    const caCharges = parseFloat(record.caCharges) || 0;
    const adjustment = parseFloat(record.adjustment) || 0;

    // Calculate gross pay using the new formula
    // Ensure division by 30 doesn't happen if monthlyBasicPay is 0 to avoid NaN
    const grossPay = monthlyBasicPay > 0 ? (monthlyBasicPay / 30) * regularDaysWorked : 0;

    // Calculate total gross pay
    const totalGrossPay = grossPay + thirteenthMonth;

    // Calculate total deductions
    const totalDeductions = sss + philhealth + pagibig + caCharges + adjustment;

    // Calculate net pay
    const netPay = totalGrossPay - totalDeductions;

    return {
      ...record,
      grossPay,
      totalGrossPay,
      totalDeductions,
      netPay,
    };
  };

  // Handle field update
  const handleFieldUpdate = (employeeId, field, value) => {
    setPayrollData((prevData) =>
      prevData.map((record) => {
        if (record.employeeId === employeeId) {
          // Ensure value is treated as a number for calculations, except for dates or specific non-numeric fields
          const nonNumericFields = ['startDate', 'endDate']; // Add other non-numeric fields if any
          const numericValue = nonNumericFields.includes(field) ? value : parseFloat(value) || 0;
          const updatedRecord = { ...record, [field]: numericValue };
          // Recalculate payroll whenever a relevant field changes
          // NOTE: calculation logic might need update based on regularDaysWorked
          return calculatePayroll(updatedRecord);
        }
        return record;
      })
    );
  };

  // Save changes - Placeholder for API call
  const handleSaveChanges = async () => {
     if (selectedRows.length === 0) {
    toast({
        title: "No rows selected",
        description: "Select rows to save changes.",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsLoading(true); // Indicate saving process
    setError(null);

    const recordsToUpdate = payrollData
      .filter(record => selectedRows.includes(record.employeeId))
      .map(record => ({
        // Assuming your backend expects the MongoDB _id if available,
        // otherwise create new. Here we assume we only update existing ones
        // based on employeeId matching. If creating new, POST is better.
        // For now, let's prepare data for a bulk PATCH or individual PATCH calls.
         id: record._id, // Use MongoDB _id if fetched, might need adjustment
         changes: {
             // Send only the editable fields
             monthlyBasicPay: record.monthlyBasicPay,
             thirteenthMonth: record.thirteenthMonth,
             sss: record.sss,
             philhealth: record.philhealth,
             pagibig: record.pagibig,
             caCharges: record.caCharges,
             adjustment: record.adjustment,
             // Include employeeId and name for reference if needed by backend logic
             // employeeId: record.employeeId,
             // name: record.name,
         }
      }));

      if(recordsToUpdate.length === 0) {
          toast({
              title: "No matching records found",
              description: "Could not find selected records to update.",
              status: "error",
              duration: 3000,
              isClosable: true,
            });
          setIsLoading(false);
          return;
      }

    // Example: Using bulk update endpoint (adjust API endpoint as needed)
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Authentication token not found.");
      }

       // You might need to make individual PATCH requests if bulk update isn't setup
       // or if you need fine-grained error handling per record.
       // Example using individual PATCH:
       const promises = recordsToUpdate.map(update =>
        axios.patch(
          `${process.env.NEXT_PUBLIC_BACKEND_API}/api/payroll/monthly-cargo/${update.id}`, // Use the MongoDB _id
          update.changes, // Send only the changes
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        )
      );

       await Promise.all(promises);


      // // Example using bulk update PATCH endpoint
      // await axios.patch(
      //   `${process.env.NEXT_PUBLIC_BACKEND_API}/api/payroll/monthly-cargo/bulk-update`,
      //   recordsToUpdate, // Send array of {id, changes}
      //   {
      //     headers: { Authorization: `Bearer ${token}` },
      //   }
      // );

      toast({
        title: "Changes saved successfully",
      status: "success",
      duration: 3000,
      isClosable: true,
    });
      // Optionally re-fetch data or update local state carefully
      // setSelectedRows([]); // Clear selection after save
    } catch (err) {
      console.error("Error saving payroll changes:", err);
      setError(err.response?.data?.message || err.message || "Failed to save changes.");
      toast({
        title: "Error saving changes",
        description: error,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle checkbox selection
  const handleCheckboxChange = (employeeId) => {
    setSelectedRows((prev) => {
      if (prev.includes(employeeId)) {
        return prev.filter((id) => id !== employeeId);
      } else {
        return [...prev, employeeId];
      }
    });
  };

  // Handle select all
  const handleSelectAll = () => {
    if (selectedRows.length === payrollData.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(payrollData.map((record) => record.employeeId));
    }
  };

  // Handle payslip generation
  const handleGeneratePayslips = () => {
    if (selectedRows.length === 0) {
      toast({
        title: "No rows selected",
        description: "Please select at least one row to generate payslips",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    // Here you would typically make an API call to generate payslips
    // You'd pass the selected employee IDs or the full record data
    const selectedEmployeeData = payrollData.filter(record => selectedRows.includes(record.employeeId));
    console.log("Generating payslips for:", selectedEmployeeData);

    toast({
      title: "Payslip Generation Initiated",
      description: `Generating payslips for ${selectedRows.length} selected employees.`,
      status: "info", // Use 'info' or 'success' depending on async nature
      duration: 3000,
      isClosable: true,
    });
    // Add API call logic here
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
      const start = parseISO(tempStartDate);
      const end = parseISO(tempEndDate);

      if (end < start) {
         toast({
            title: "Invalid Date Range",
            description: "End date cannot be before the start date.",
            status: "warning",
            duration: 3000,
            isClosable: true,
          });
         return;
      }

      // Format the date range string for display
      // Example: January 1 - 15, 2025
      const formattedRange = `${format(start, "MMMM d")} - ${format(
        end,
        start.getFullYear() === end.getFullYear() ? "d" : "d, yyyy" // Show year only if different
      )}, ${end.getFullYear()}`;

      setAppliedDateRange(formattedRange);
      onDateModalClose(); // Close the modal

      // Optional: You might want to update the individual row dates here
      // if they should default to the applied range, or trigger a refetch
      // if the date range affects the data shown.
      // Example: updatePayrollDates(start, end);

    } catch (error) {
       console.error("Error parsing or formatting dates:", error);
       toast({
        title: "Date Error",
        description: "Could not process the selected dates. Please check the format.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  // Fetch Employee Data useEffect
  useEffect(() => {
    const fetchEmployees = async () => {
      setIsLoading(true);
      setError(null);
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Authentication token not found. Please log in.");
        setIsLoading(false);
        return;
      }

      try {
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_BACKEND_API}/api/employees/personal`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        // Filter for monthly employees
        const monthlyEmployees = response.data.filter(
          (emp) => emp.salaryCategory === "Monthly" && emp.dateSeparated === null // Only active monthly employees
        );

        // Get default start and end dates for the current month
        const currentMonthStart = startOfMonth(new Date());
        const currentMonthEnd = endOfMonth(new Date());


        // Transform employee data into payroll structure
        const initialPayrollData = monthlyEmployees.map((emp) => {
          const name = `${emp.lastName || ""}, ${emp.firstName || ""} ${
            emp.middleName ? emp.middleName.charAt(0) + "." : ""
          }`.trim();

          const record = {
            _id: emp._id, // Store the MongoDB _id
            employeeId: emp.empID || "N/A",
            name: name,
            monthlyBasicPay: emp.wage || 0,
            regularDaysWorked: 0, // Initialize new field
            thirteenthMonth: 0,
            sss: 0,
            philhealth: 0,
            pagibig: 0,
            caCharges: 0,
            adjustment: 0,
            // Initialize calculated fields
            grossPay: 0,
            totalGrossPay: 0,
            totalDeductions: 0,
            netPay: 0,
          };
          // Calculate initial payroll values for the record
          return calculatePayroll(record);
        });

        setPayrollData(initialPayrollData);

      } catch (err) {
        console.error("Error fetching employees:", err);
        const errorMsg = err.response?.data?.message || err.message || "Failed to fetch employee data.";
        setError(errorMsg);
        toast({
            title: 'Error Fetching Data',
            description: errorMsg,
            status: 'error',
            duration: 5000,
            isClosable: true,
          });
      } finally {
        setIsLoading(false);
      }
    };

    fetchEmployees();
  }, [toast]); // Added toast to dependency array

  // Filtered data based on search query
  const filteredPayrollData = useMemo(() => {
    if (!searchQuery) return payrollData;
    return payrollData.filter(
      (record) =>
        record.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        record.employeeId.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [payrollData, searchQuery]);

   // Calculate Totals
   const totals = useMemo(() => {
    return filteredPayrollData.reduce(
      (acc, record) => {
        acc.monthlyBasicPay += record.monthlyBasicPay || 0;
        acc.regularDaysWorked += record.regularDaysWorked || 0; // Add to totals
        acc.grossPay += record.grossPay || 0;
        acc.thirteenthMonth += record.thirteenthMonth || 0;
        acc.totalGrossPay += record.totalGrossPay || 0;
        acc.sss += record.sss || 0;
        acc.philhealth += record.philhealth || 0;
        acc.pagibig += record.pagibig || 0;
        acc.caCharges += record.caCharges || 0;
        acc.adjustment += record.adjustment || 0;
        acc.totalDeductions += record.totalDeductions || 0;
        acc.netPay += record.netPay || 0;
        return acc;
      },
      {
        monthlyBasicPay: 0, regularDaysWorked: 0, grossPay: 0, thirteenthMonth: 0, totalGrossPay: 0,
        sss: 0, philhealth: 0, pagibig: 0, caCharges: 0, adjustment: 0,
        totalDeductions: 0, netPay: 0,
      }
    );
  }, [filteredPayrollData]);

  return (
    <MotionBox>
      {/* Header Section */}
      <Box
        py={4}
        px={6}
        color="#1a365d"
        borderRadius="md"
        mb={6}
        borderBottom="1px solid"
        borderColor="#E2E8F0"
      >
        <Heading size="2xl" fontWeight="bold">
          Justine's Cargo - Payroll Management
        </Heading>
        <Text mt={2} fontSize="md" color="gray.600">
          Manage monthly employee payroll and compensation
        </Text>
      </Box>

      {/* Tabs for Payroll Types */}
      <Tabs
        index={tabIndex}
        onChange={(index) => setTabIndex(index)}
        variant="enclosed"
        size="md"
        isFitted
        px={6}
        mb={6}
      >
        <TabList bg="white" borderBottom="2px" borderColor={secondaryColor}>
          <Tab
            _selected={{ color: "white", bg: primaryColor, fontWeight: "bold" }}
            _hover={{ bg: secondaryColor, color: "white" }}
            borderColor={secondaryColor}
            borderWidth="1px"
            borderBottom="none"
          >
            Monthly Payroll
          </Tab>
          <Tab
            _selected={{ color: "white", bg: primaryColor, fontWeight: "bold" }}
            _hover={{ bg: secondaryColor, color: "white" }}
            borderColor={secondaryColor}
            borderWidth="1px"
            borderBottom="none"
          >
            Daily Payroll
          </Tab>
          <Tab
            _selected={{ color: "white", bg: primaryColor, fontWeight: "bold" }}
            _hover={{ bg: secondaryColor, color: "white" }}
            borderColor={secondaryColor}
            borderWidth="1px"
            borderBottom="none"
          >
            Per Trip Payroll
          </Tab>
        </TabList>

        <TabPanels mt={4}>
          {/* Monthly Payroll Panel */}
          <TabPanel p={4}>
            <MonthlyPayrollComponent /> {/* Replaced comment with component call */}
          </TabPanel>

          {/* Daily Payroll Panel */}
          <TabPanel p={4}>
            <Box
              p={5}
              borderWidth="1px"
              borderRadius="lg"
              borderColor="#E2E8F0"
            >
              <Heading size="md" mb={4}>
                Daily Payroll Calculation
              </Heading>
              <DailyPayrollComponent /> {/* Replaced placeholder with component */}
            </Box>
          </TabPanel>

          {/* Per Trip Payroll Panel */}
          <TabPanel p={4}>
            <PerTripPayrollComponent /> {/* Replaced placeholder with component */}
          </TabPanel>
        </TabPanels>
      </Tabs>

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
                     min={tempStartDate} // Prevent selecting end date before start date visually
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
    </MotionBox>
  );
};

export default CargoMainPayroll; // Updated export
