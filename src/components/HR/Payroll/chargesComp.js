import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Box,
  Heading,
  Table,
  Thead,
  Tbody,
  Tfoot,
  Tr,
  Th,
  Td,
  TableContainer,
  Text,
  useColorModeValue,
  VStack,
  HStack,
  Spinner,
  Alert,
  AlertIcon,
  Button,
  Flex,
  Switch,
  FormControl,
  FormLabel,
  NumberInput,
  NumberInputField,
  useToast,
  Input,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useDisclosure
} from '@chakra-ui/react';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';

const ChargesComp = () => {
  // State for data, loading, errors, edit mode, saving status, and period dates
  const [chargesData, setChargesData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  
  // State for the selected period range
  const [periodStartDate, setPeriodStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd')); // Default start of current month
  const [periodEndDate, setPeriodEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd')); // Default end of current month
  
  // State for the modal and temporary dates
  const { isOpen: isDateModalOpen, onOpen: onDateModalOpen, onClose: onDateModalClose } = useDisclosure();
  const [tempStartDate, setTempStartDate] = useState(periodStartDate);
  const [tempEndDate, setTempEndDate] = useState(periodEndDate);

  const toast = useToast();

  // Currency Formatter
  const pesoFormatter = new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
  });

  // Define colors similar to leaveComp.js and SSSTable.js
  const headerBgColor = "#1a365d"; // JCS Blue
  const headerTextColor = "white";
  const primaryActionColor = "#800020"; // JCS Maroon
  const focusBorderColor = primaryActionColor;
  const rowHoverBg = useColorModeValue('gray.100', 'gray.700');
  const oddRowBg = useColorModeValue("white", "gray.800");
  const evenRowBg = useColorModeValue("gray.50", "gray.900");
  const lightAccent = useColorModeValue("blue.50", "blue.900"); // For hover/accents on some elements

  // Fetch employees AND existing charges based on selected periodEndDate
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      setChargesData([]); // Clear previous data when date changes
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Authentication token not found. Please log in.");
        setIsLoading(false);
        return;
      }

      // Basic validation for date format (YYYY-MM-DD) before fetching
      if (!periodEndDate || !/^\d{4}-\d{2}-\d{2}$/.test(periodEndDate)) {
          setError('Invalid or missing Period End Date. Please select a valid date.');
          setIsLoading(false);
          return;
      }

      // Format date to YYYY-MM-DD for the API query
      const formattedEndDate = periodEndDate; 

      try {
        // Fetch both endpoints concurrently
        const [employeeResponse, chargesResponse] = await Promise.all([
          axios.get(`${process.env.NEXT_PUBLIC_BACKEND_API}/api/employees/personal`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          // Fetch existing charges filtered by periodEndDate
          axios.get(`${process.env.NEXT_PUBLIC_BACKEND_API}/api/charges`, { 
            headers: { Authorization: `Bearer ${token}` },
            params: { periodEndDate: formattedEndDate } // Pass end date as query param
          })
        ]);

        const employees = employeeResponse.data;
        const existingCharges = chargesResponse.data;

        // Create a lookup map for existing charges by employeeId for the specific period
        const chargesMap = existingCharges.reduce((map, charge) => {
            // Backend filters by periodEndDate, this ensures consistency
            if (charge.periodEndDate.startsWith(formattedEndDate)) { 
                 map[charge.employeeId] = charge;
            }
            return map;
        }, {});

        // Merge employee data with existing charges data for the selected period
        const mergedData = employees.map(emp => {
          const empId = emp.empID || 'N/A';
          const existingCharge = chargesMap[empId]; // Find charge for this employee and period

          return {
            employeeId: empId,
            name: `${emp.lastName || ''}, ${emp.firstName || ''} ${emp.middleName ? emp.middleName.charAt(0) + '.' : ''}`.trim(),
            // Use existing charge value or default to 0
            cashAdvance: existingCharge?.cashAdvance || 0,
            oldAccountVale: existingCharge?.oldAccountVale || 0,
            vitamins: existingCharge?.vitamins || 0,
            elecAndWater: existingCharge?.elecAndWater || 0,
            others: existingCharge?.others || 0,
            motorbike: existingCharge?.motorbike || 0,
            intellicare: existingCharge?.intellicare || 0,
            canteen: existingCharge?.canteen || 0,
            // Use pre-calculated total from DB if exists for this period, otherwise calculate (or default to 0)
            totalCharges: existingCharge?.totalCharges || 0, 
            // Include the Mongo _id if we have an existing charge for this period
            _id: existingCharge?._id || null,
            // IMPORTANT: Include periodEndDate in each row for saving
            periodEndDate: formattedEndDate 
          };
        });

        setChargesData(mergedData);

      } catch (err) {
        console.error("Error fetching data:", err);
        const errorMsg = err.response?.data?.message || err.message || "Failed to fetch initial data.";
        setError(errorMsg);
        // Keep existing data on fetch error? Or clear? Clearing for now.
        // setChargesData([]); 
      } finally {
        setIsLoading(false);
      }
    };

    fetchData(); // Call the fetch function
  }, [periodEndDate]); // Re-run effect only when periodEndDate changes

  // Handle input change for charge fields
  const handleInputChange = (employeeId, field, value) => {
    setChargesData(prevData =>
      prevData.map(charge => {
        if (charge.employeeId === employeeId) {
          // Convert value to number, default to 0 if invalid
          const numericValue = parseFloat(value) || 0;
          const updatedCharge = { ...charge, [field]: numericValue };
          // Recalculate totalCharges for this row immediately for display consistency
          updatedCharge.totalCharges = calculateRowTotalDeduction(updatedCharge);
          return updatedCharge;
        }
        return charge;
      })
    );
  };

  // Calculate Totals (will calculate based on chargesData)
  const calculateTotal = (key) => {
    return chargesData.reduce((sum, item) => sum + (item[key] || 0), 0);
  };

  // Calculate total deduction for a single employee row
  const calculateRowTotalDeduction = (charge) => {
    return (
      (charge.cashAdvance || 0) +
      (charge.oldAccountVale || 0) +
      (charge.vitamins || 0) +
      (charge.elecAndWater || 0) +
      (charge.others || 0) +
      (charge.motorbike || 0) +
      (charge.intellicare || 0) +
      (charge.canteen || 0)
    );
  };

  const totals = {
    cashAdvance: calculateTotal('cashAdvance'),
    oldAccountVale: calculateTotal('oldAccountVale'),
    vitamins: calculateTotal('vitamins'),
    elecAndWater: calculateTotal('elecAndWater'),
    others: calculateTotal('others'),
    motorbike: calculateTotal('motorbike'),
    intellicare: calculateTotal('intellicare'),
    canteen: calculateTotal('canteen'),
  };

  // Calculate grand total of all deductions
  const grandTotalDeductions = Object.values(totals).reduce((sum, val) => sum + val, 0);

  const handleSaveChanges = async () => {
    setIsSaving(true);
    setError(null);
    const token = localStorage.getItem("token");
    if (!token) {
      setError("Authentication token not found. Please log in.");
      setIsSaving(false);
      toast({ title: "Authentication Error", description: "Please log in again.", status: "error", duration: 5000, isClosable: true });
      return;
    }
    
    // Ensure periodEndDate is valid before saving
    if (!periodEndDate || !/^\d{4}-\d{2}-\d{2}$/.test(periodEndDate)) {
        setError('Invalid or missing Period End Date. Cannot save.');
        setIsSaving(false);
        toast({ title: "Save Error", description: "Please select a valid Period End Date.", status: "error", duration: 5000, isClosable: true });
        return;
    }

    // Map data to include the correct periodEndDate for each record
    const dataToSave = chargesData.map(charge => ({
        employeeId: charge.employeeId,
        name: charge.name,
        periodEndDate: periodEndDate, // Use the state periodEndDate
        cashAdvance: charge.cashAdvance,
        oldAccountVale: charge.oldAccountVale,
        vitamins: charge.vitamins,
        elecAndWater: charge.elecAndWater,
        others: charge.others,
        motorbike: charge.motorbike,
        intellicare: charge.intellicare,
        canteen: charge.canteen,
        // totalCharges will be recalculated by the backend pre-save hook or bulkWrite
    }));

    console.log("Data to save:", dataToSave); // Log data being sent

    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/charges/bulk-upsert`, 
        dataToSave,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      
      toast({
        title: "Changes Saved",
        description: response.data.message || "Charges updated successfully.",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      setIsEditMode(false);

    } catch (err) {
      console.error("Error saving charges:", err);
      const errorMsg = err.response?.data?.message || err.message || "Failed to save charges.";
      setError(errorMsg);
      toast({
        title: "Save Error",
        description: errorMsg,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsSaving(false);
    }
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
      // Basic validation: end date should not be before start date
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
      // Update the main state variables which will trigger useEffect for periodEndDate
      setPeriodStartDate(tempStartDate);
      setPeriodEndDate(tempEndDate);
      onDateModalClose(); // Close the modal
    } catch (error) {
      console.error("Error applying date range:", error);
      toast({ title: "Error", description: "Failed to apply date range.", status: "error" });
    }
  };

  // Format date range for display
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

  return (
    <Box p={4}> {/* Consistent padding with other components */}
      {/* Header Section - Styled like leaveComp.js */}
      <Flex justify="space-between" align="center" mb={4}>
        <VStack align="start" spacing={1}>
          <Heading size="lg" color={headerBgColor}>Employee Charges Management</Heading>
          <HStack spacing={3}>
            <Text fontSize="sm" color="gray.600">
              Period:
            </Text>
            <Text fontWeight="semibold" color={primaryActionColor}>
              {formatDateRange(periodStartDate, periodEndDate)}
            </Text>
            <Button
              size="xs"
              variant="outline"
              colorScheme="blue"
              onClick={() => {
                setTempStartDate(periodStartDate);
                setTempEndDate(periodEndDate);
                onDateModalOpen();
              }}
              isDisabled={isLoading || isSaving}
              _hover={{ bg: lightAccent }}
            >
              Change
            </Button>
          </HStack>
        </VStack>

        <HStack spacing={4}>
          <FormControl display='flex' alignItems='center'>
            <FormLabel htmlFor='edit-mode-switch-charges' mb='0' fontSize="sm" mr={2} whiteSpace="nowrap">
              Edit Mode
            </FormLabel>
            <Switch
              id='edit-mode-switch-charges'
              isChecked={isEditMode}
              onChange={() => setIsEditMode(!isEditMode)}
              colorScheme="blue"
            />
          </FormControl>
          {isEditMode && (
            <Button
              colorScheme="green"
              size="sm"
              w="90%"
              onClick={handleSaveChanges}
              isLoading={isSaving}
              loadingText="Saving..."
              _hover={{ bg: "green.600" }}
            >
              Save Changes
            </Button>
          )}
        </HStack>
      </Flex>

      {error && (
        <Alert status="error" mb={4} borderRadius="md">
          <AlertIcon />
          {error}
        </Alert>
      )}

      {/* Table Container - Styled like leaveComp.js */}
      <TableContainer borderWidth="1px" borderColor={useColorModeValue("gray.200", "gray.700")} borderRadius="md">
        <Table variant="simple" size="sm">
          <Thead bg={headerBgColor}>
            <Tr>
              <Th color={headerTextColor} py={3} px={3}>Employee ID</Th>
              <Th color={headerTextColor} py={3} px={3}>Name</Th>
              <Th color={headerTextColor} py={3} px={3} isNumeric>Cash Adv.</Th>
              <Th color={headerTextColor} py={3} px={3} isNumeric>Old Acct.</Th>
              <Th color={headerTextColor} py={3} px={3} isNumeric>Vitamins</Th>
              <Th color={headerTextColor} py={3} px={3} isNumeric>Elec/Water</Th>
              <Th color={headerTextColor} py={3} px={3} isNumeric>Others</Th>
              <Th color={headerTextColor} py={3} px={3} isNumeric>Motorbike</Th>
              <Th color={headerTextColor} py={3} px={3} isNumeric>Intellicare</Th>
              <Th color={headerTextColor} py={3} px={3} isNumeric>Canteen</Th>
              <Th color={headerTextColor} py={3} px={3} fontWeight="bold" isNumeric>Total Deduction</Th>
            </Tr>
          </Thead>
          <Tbody>
            {isLoading ? (
              <Tr>
                <Td colSpan={11} textAlign="center" py={10}>
                  <Spinner size="xl" color={primaryActionColor} />
                  <Text mt={2} color="gray.600">Loading Charges Data...</Text>
                </Td>
              </Tr>
            ) : chargesData.length === 0 && !error ? (
              <Tr>
                <Td colSpan={11} textAlign="center" py={10}>
                  <Text color="gray.500">No charges data found for {periodEndDate ? formatDateRange(periodStartDate, periodEndDate) : 'the selected period'}.</Text>
                </Td>
              </Tr>
            ) : (
              chargesData.map((charge, index) => (
                <Tr
                  key={charge.employeeId || index}
                  _hover={{ bg: rowHoverBg }}
                  bg={index % 2 === 0 ? evenRowBg : oddRowBg}
                >
                  <Td borderColor={useColorModeValue("gray.200", "gray.700")} px={3}>{charge.employeeId}</Td>
                  <Td fontWeight="medium" color={headerBgColor} borderColor={useColorModeValue("gray.200", "gray.700")} px={3}>{charge.name}</Td>
                  
                  {[ 'cashAdvance', 'oldAccountVale', 'vitamins', 'elecAndWater', 'others', 'motorbike', 'intellicare', 'canteen'].map((field) => (
                      <Td key={field} px={2} fontSize="sm" isNumeric py={1} borderColor={useColorModeValue("gray.200", "gray.700")}>
                        {isEditMode ? (
                          <NumberInput
                            size="xs"
                            value={charge[field]}
                            onChange={(valueString) => handleInputChange(charge.employeeId, field, valueString)}
                            min={0}
                            precision={2}
                            isDisabled={!charge.employeeId || !isEditMode}
                          >
                            <NumberInputField
                              py={1}
                              minW="70px"
                              borderColor="gray.300"
                              _hover={{ borderColor: focusBorderColor }}
                              _focus={{ borderColor: focusBorderColor, boxShadow: `0 0 0 1px ${focusBorderColor}` }}
                            />
                          </NumberInput>
                        ) : (
                          pesoFormatter.format(charge[field] || 0)
                        )}
                      </Td>
                  ))}
                  <Td isNumeric fontWeight="bold" color={primaryActionColor} borderColor={useColorModeValue("gray.200", "gray.700")} px={3}>{pesoFormatter.format(charge.totalCharges || 0)}</Td>
                </Tr>
              ))
            )}
          </Tbody>
          {!isLoading && !error && chargesData.length > 0 && (
            <Tfoot bg={useColorModeValue('gray.100', 'gray.700')}> {/* Consistent footer style */}
              <Tr>
                <Th py={3} px={3} color={headerTextColor} bg={headerBgColor} borderBottomLeftRadius={chargesData.length > 0 ? 0 : "md"} /> 
                <Th py={3} px={3} color={headerTextColor} bg={headerBgColor} fontSize="sm" fontWeight="bold" textTransform="uppercase">
                    Totals for Period
                </Th>
                <Td py={3} px={3} color={headerTextColor} bg={headerBgColor} fontSize="sm" fontWeight="bold" isNumeric>{pesoFormatter.format(totals.cashAdvance)}</Td>
                <Td py={3} px={3} color={headerTextColor} bg={headerBgColor} fontSize="sm" fontWeight="bold" isNumeric>{pesoFormatter.format(totals.oldAccountVale)}</Td>
                <Td py={3} px={3} color={headerTextColor} bg={headerBgColor} fontSize="sm" fontWeight="bold" isNumeric>{pesoFormatter.format(totals.vitamins)}</Td>
                <Td py={3} px={3} color={headerTextColor} bg={headerBgColor} fontSize="sm" fontWeight="bold" isNumeric>{pesoFormatter.format(totals.elecAndWater)}</Td>
                <Td py={3} px={3} color={headerTextColor} bg={headerBgColor} fontSize="sm" fontWeight="bold" isNumeric>{pesoFormatter.format(totals.others)}</Td>
                <Td py={3} px={3} color={headerTextColor} bg={headerBgColor} fontSize="sm" fontWeight="bold" isNumeric>{pesoFormatter.format(totals.motorbike)}</Td>
                <Td py={3} px={3} color={headerTextColor} bg={headerBgColor} fontSize="sm" fontWeight="bold" isNumeric>{pesoFormatter.format(totals.intellicare)}</Td>
                <Td py={3} px={3} color={headerTextColor} bg={headerBgColor} fontSize="sm" fontWeight="bold" isNumeric>{pesoFormatter.format(totals.canteen)}</Td>
                <Td py={3} px={3} color={headerTextColor} bg={headerBgColor} fontSize="sm" fontWeight="extrabold" isNumeric borderBottomRightRadius={chargesData.length > 0 ? 0 : "md"}>
                    {pesoFormatter.format(grandTotalDeductions)}
                </Td>
              </Tr>
            </Tfoot>
          )}
        </Table>
      </TableContainer>

      {/* Date Range Selection Modal - Styled like leaveComp.js */}
      <Modal isOpen={isDateModalOpen} onClose={onDateModalClose} isCentered size="md">
        <ModalOverlay />
        <ModalContent borderRadius="lg">
          <ModalHeader borderBottomWidth="1px" borderColor={useColorModeValue("gray.100", "gray.700")}>Set Charges Period</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6} pt={5}>
            <VStack spacing={4}>
              <FormControl>
                <FormLabel fontSize="sm">Start Date</FormLabel>
                <Input
                  type="date"
                  value={tempStartDate}
                  onChange={(e) => setTempStartDate(e.target.value)}
                  focusBorderColor={focusBorderColor}
                />
              </FormControl>
              <FormControl>
                <FormLabel fontSize="sm">End Date</FormLabel>
                <Input
                  type="date"
                  value={tempEndDate}
                  onChange={(e) => setTempEndDate(e.target.value)}
                  min={tempStartDate}
                  focusBorderColor={focusBorderColor}
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter borderTopWidth="1px" borderColor={useColorModeValue("gray.100", "gray.700")}>
            <Button
              colorScheme="blue"
              variant="solid"
              mr={3}
              onClick={handleApplyDateRange}
              size="sm"
              _hover={{bg: "blue.600"}}
            >
              Apply
            </Button>
            <Button variant="ghost" onClick={onDateModalClose} size="sm">Cancel</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default ChargesComp;
