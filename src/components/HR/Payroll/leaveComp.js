import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Box,
  Table,
  Thead,
  Tbody,
  Tfoot,
  Tr,
  Th,
  Td,
  TableContainer,
  Heading,
  Button,
  Spinner,
  Alert,
  AlertIcon,
  useToast,
  Flex,
  Switch,
  FormControl,
  FormLabel,
  NumberInput,
  NumberInputField,
  useColorModeValue,
  Text,
  Input,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  Card,
  CardHeader,
  CardBody,
  HStack,
  VStack,
} from '@chakra-ui/react';
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns';

// Custom Input for DatePicker (Optional, for styling consistency)
const CustomDatePickerInput = React.forwardRef(({ value, onClick, ...props }, ref) => (
  <Input
    placeholder="mm/dd/yyyy"
    value={value} 
    onClick={onClick}
    ref={ref}
    size="sm"
    borderColor="gray.300"
    _hover={{ borderColor: "gray.400" }}
    readOnly
    {...props}
  />
));
CustomDatePickerInput.displayName = 'CustomDatePickerInput';

const LeaveComp = () => {
  // State for data, loading, errors, edit mode, and period dates
  const [leaveData, setLeaveData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  
  // State for the selected period range
  const [periodStartDate, setPeriodStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [periodEndDate, setPeriodEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  
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

  // Define colors similar to SSSTable.js
  const headerBgColor = "#1a365d"; // JCS Blue
  const headerTextColor = "white";
  const primaryActionColor = "#800020"; // JCS Maroon (used for primary text/buttons)
  const focusBorderColor = primaryActionColor; 
  const rowHoverBg = useColorModeValue('gray.100', 'gray.700');
  const oddRowBg = useColorModeValue("white", "gray.800");
  const evenRowBg = useColorModeValue("gray.50", "gray.900");
  const lightAccent = useColorModeValue("blue.50", "blue.900"); // For hover/accents

  // Fetch employees AND existing leave data based on selected periodEndDate
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      setLeaveData([]);
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Authentication token not found. Please log in.");
        setIsLoading(false);
        return;
      }

      if (!periodEndDate) {
        setError("Please select a Period End Date.");
        setIsLoading(false);
        return;
      }

      const formattedEndDate = periodEndDate;

      try {
        const [employeeResponse, leaveResponse] = await Promise.all([
          axios.get(`${process.env.NEXT_PUBLIC_BACKEND_API}/api/employees/personal`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${process.env.NEXT_PUBLIC_BACKEND_API}/api/leave`, {
            headers: { Authorization: `Bearer ${token}` },
            params: { periodEndDate: formattedEndDate }
          })
        ]);

        const employees = employeeResponse.data;
        const existingLeaves = leaveResponse.data;

        const leaveMap = existingLeaves.reduce((map, leaveRecord) => {
           if (leaveRecord.EmpID?._id && leaveRecord.periodEndDate.startsWith(formattedEndDate)) { 
             map[leaveRecord.EmpID._id] = leaveRecord;
           }
          return map;
        }, {});

        const mergedData = employees.map(emp => {
          const existingLeave = leaveMap[emp._id];
          const rateToUse = existingLeave?.rate !== undefined ? existingLeave.rate : emp.wage || 0;
          // Use fetched remaining credits directly
          // Re-introduce initialRemaining calculation
          const initialRemaining = existingLeave?.remainingLeaveCredits || 0; 
          const currentUsed = existingLeave?.leaveUsed || 0;
          // Calculate current remaining based on initial and used (if existing)
          // For display, show the initial value fetched, calculation happens on edit
          const currentRemaining = initialRemaining;
          const calculatedLeavePay = currentRemaining * rateToUse;

          return {
            employeeMongoId: emp._id,
            employeeId: emp.empID || 'N/A',
            name: `${emp.lastName || ''}, ${emp.firstName || ''} ${emp.middleName ? emp.middleName.charAt(0) + '.' : ''}`.trim(),
            // Restore initialRemainingLeaveCredits
            initialRemainingLeaveCredits: initialRemaining, 
            remainingLeaveCredits: currentRemaining, // Displayed remaining
            rate: rateToUse,
            leaveUsed: currentUsed, 
            leavePay: existingLeave?.leavePay !== undefined ? existingLeave.leavePay : calculatedLeavePay,
            leaveRecordId: existingLeave?._id || null,
            periodEndDate: formattedEndDate 
          };
        });

        setLeaveData(mergedData);

      } catch (err) {
        console.error("Error fetching leave data:", err);
        const errorMsg = err.response?.data?.message || err.message || "Failed to fetch initial leave data.";
        setError(errorMsg);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [periodEndDate]);

  // Handle input change for leave fields
  const handleInputChange = (employeeMongoId, field, value) => {
    setLeaveData(prevData =>
      prevData.map(leave => {
        if (leave.employeeMongoId === employeeMongoId) {
          const numericValue = parseFloat(value) || 0;
          let updatedLeave = { ...leave, [field]: numericValue };

          // Automatic calculation for remaining credits when leaveUsed changes
          if (field === 'leaveUsed') {
            const initialCredits = leave.initialRemainingLeaveCredits || 0;
            updatedLeave.remainingLeaveCredits = Math.max(0, initialCredits - numericValue); // Ensure not negative
            // Recalculate leavePay based on *new* remaining credits
            updatedLeave.leavePay = updatedLeave.remainingLeaveCredits * updatedLeave.rate;
          } 
          // If rate is changed, recalculate leavePay based on current remaining credits
          else if (field === 'rate') {
            // Use the current remaining credits (which might have been recalculated if leaveUsed changed previously)
            updatedLeave.leavePay = updatedLeave.remainingLeaveCredits * numericValue; 
          }
          // ADDED BACK: Handle direct change to remaining credits
          else if (field === 'remainingLeaveCredits') {
            // Recalculate leavePay based on the *new* remaining credits
            updatedLeave.leavePay = numericValue * updatedLeave.rate;
          }
          
          return updatedLeave;
        }
        return leave;
      })
    );
  };

  // Save Changes Function using Bulk Upsert
  const handleSaveChanges = async () => {
    setIsSaving(true);
    setError(null); 
    const token = localStorage.getItem("token");
    if (!token) {
      setError("Authentication token not found. Please log in.");
      toast({
        title: "Save Error",
        description: "Authentication token not found. Please log in.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      setIsSaving(false);
      return;
    }

    if (!periodEndDate || !/^\d{4}-\d{2}-\d{2}$/.test(periodEndDate)) {
        setError("Please select a valid Period End Date before saving.");
        toast({ title: "Save Error", description: "Please select a valid Period End Date.", status: "error", duration: 5000, isClosable: true });
        setIsSaving(false);
        return;
    }

    const formattedDate = periodEndDate;

    const dataToSave = leaveData.map(leave => ({
        employeeMongoId: leave.employeeMongoId,
        periodEndDate: formattedDate,
        remainingLeaveCredits: leave.remainingLeaveCredits,
        leaveUsed: leave.leaveUsed,
        rate: leave.rate,
        leavePay: leave.leavePay,
    }));

    console.log("Data to save (Leave):", dataToSave); 

    try {
        const response = await axios.post(
            `${process.env.NEXT_PUBLIC_BACKEND_API}/api/leave/bulk-upsert`,
            dataToSave,
            {
                headers: { Authorization: `Bearer ${token}` },
            }
        );

      toast({
        title: "Changes Saved",
        description: response.data.message || "Leave data updated successfully.",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      setIsEditMode(false);

    } catch (err) {
      console.error("Error saving leave data:", err);
      const errorMsg = err.response?.data?.message || err.message || "Failed to save leave data.";
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

  // Handle applying the date range from the modal (Copied from chargesComp)
  const handleApplyDateRange = () => {
    if (!tempStartDate || !tempEndDate) {
      toast({ title: "Incomplete Date Range", description: "Please select both a start and end date.", status: "warning", duration: 3000, isClosable: true });
      return;
    }
    try {
      if (new Date(tempEndDate) < new Date(tempStartDate)) {
        toast({ title: "Invalid Date Range", description: "End date cannot be before start date.", status: "warning", duration: 3000, isClosable: true });
        return;
      }
      setPeriodStartDate(tempStartDate);
      setPeriodEndDate(tempEndDate);
      onDateModalClose();
    } catch (error) {
      console.error("Error applying date range:", error);
      toast({ title: "Error", description: "Failed to apply date range.", status: "error", duration: 3000, isClosable: true });
    }
  };

  // Format date range for display (Copied from chargesComp)
  const formatDateRange = (start, end) => {
      if (!start || !end) return "Not Selected";
      try {
          const startDate = parseISO(start);
          const endDate = parseISO(end);
          const startFormat = 'MMM d';
          const endFormat = startDate.getFullYear() === endDate.getFullYear() ? 'MMM d, yyyy' : 'MMM d, yyyy';
          return `${format(startDate, startFormat)} - ${format(endDate, endFormat)}`;
      } catch (e) {
          console.error("Date formatting error:", e);
          return "Invalid Date";
      }
  };

  return (
    <Box p={4}> 
      <Flex justify="space-between" align="center" mb={4}>
        <VStack align="start" spacing={1}>
            <Heading size="lg" color={headerBgColor}>Leave Management</Heading>
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
              <FormLabel htmlFor='edit-mode-switch-leave' mb='0' fontSize="sm" mr={2} whiteSpace="nowrap">
                Edit Mode
              </FormLabel>
              <Switch
                id='edit-mode-switch-leave'
                isChecked={isEditMode}
                onChange={() => setIsEditMode(!isEditMode)}
                colorScheme="blue" // Can be changed to match SSSTable if desired, e.g. "teal" or a custom scheme
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
                _hover={{ bg: "green.600"}}
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

      <TableContainer borderWidth="1px" borderColor={useColorModeValue("gray.200", "gray.700")} borderRadius="md">
        <Table variant="simple" size="sm">
          <Thead bg={headerBgColor}>
            <Tr>
              <Th color={headerTextColor} py={3}>Employee ID</Th>
              <Th color={headerTextColor} py={3}>Name</Th>
              <Th color={headerTextColor} py={3} isNumeric>Remaining Credits</Th>
              <Th color={headerTextColor} py={3} isNumeric>Leave Used (Period)</Th>
              <Th color={headerTextColor} py={3} isNumeric>Rate</Th>
              <Th color={headerTextColor} py={3} isNumeric>Leave Pay</Th>
            </Tr>
          </Thead>
          <Tbody>
            {isLoading ? (
              <Tr>
                <Td colSpan={6} textAlign="center" py={10}>
                  <Spinner size="xl" color={primaryActionColor} />
                  <Text mt={2} color="gray.600">Loading Leave Data...</Text>
                </Td>
              </Tr>
            ) : leaveData.length === 0 && !error ? (
              <Tr>
                <Td colSpan={6} textAlign="center" py={10}>
                  <Text color="gray.500">No leave data found for {periodEndDate ? formatDateRange(periodStartDate, periodEndDate) : 'the selected period'}.</Text>
                </Td>
              </Tr>
            ) : (
              leaveData.map((leave, index) => (
                <Tr 
                    key={leave.employeeMongoId} 
                    _hover={{ bg: rowHoverBg }} 
                    bg={index % 2 === 0 ? evenRowBg : oddRowBg}
                >
                  <Td borderColor={useColorModeValue("gray.200", "gray.700")}>{leave.employeeId}</Td>
                  <Td fontWeight="medium" color={headerBgColor} borderColor={useColorModeValue("gray.200", "gray.700")}>{leave.name}</Td>
                  <Td px={2} fontSize="sm" isNumeric py={1} borderColor={useColorModeValue("gray.200", "gray.700")}>
                    {isEditMode ? (
                      <NumberInput
                        size="xs"
                        value={leave.remainingLeaveCredits}
                        onChange={(valueString) => handleInputChange(leave.employeeMongoId, 'remainingLeaveCredits', valueString)}
                        min={0}
                        isDisabled={!leave.employeeMongoId || !isEditMode}
                      >
                        <NumberInputField 
                          py={1} 
                          minW="80px" 
                           borderColor="gray.300"
                          _hover={{ borderColor: focusBorderColor }}
                          _focus={{ borderColor: focusBorderColor, boxShadow: `0 0 0 1px ${focusBorderColor}` }}
                        />
                      </NumberInput>
                    ) : (
                      leave.remainingLeaveCredits
                    )}
                  </Td>
                  <Td px={2} fontSize="sm" isNumeric py={1} borderColor={useColorModeValue("gray.200", "gray.700")}>
                    {isEditMode ? (
                      <NumberInput
                        size="xs"
                        value={leave.leaveUsed}
                        onChange={(valueString) => handleInputChange(leave.employeeMongoId, 'leaveUsed', valueString)}
                        min={0}
                        precision={1}
                        isDisabled={!leave.employeeMongoId || !isEditMode}
                      >
                        <NumberInputField 
                            py={1} 
                            minW="80px" 
                            borderColor="gray.300"
                            _hover={{ borderColor: focusBorderColor }}
                            _focus={{ borderColor: focusBorderColor, boxShadow: `0 0 0 1px ${focusBorderColor}` }}
                        />
                      </NumberInput>
                    ) : (
                      leave.leaveUsed
                    )}
                  </Td>
                  <Td px={2} fontSize="sm" isNumeric py={1} borderColor={useColorModeValue("gray.200", "gray.700")}>
                    {isEditMode ? (
                      <NumberInput
                        size="xs"
                        value={leave.rate}
                        onChange={(valueString) => handleInputChange(leave.employeeMongoId, 'rate', valueString)}
                        min={0}
                        precision={2}
                        isDisabled={!leave.employeeMongoId || !isEditMode}
                      >
                        <NumberInputField 
                            py={1} 
                            minW="80px" 
                            borderColor="gray.300"
                            _hover={{ borderColor: focusBorderColor }}
                            _focus={{ borderColor: focusBorderColor, boxShadow: `0 0 0 1px ${focusBorderColor}` }}
                        />
                      </NumberInput>
                    ) : (
                      pesoFormatter.format(leave.rate || 0)
                    )}
                  </Td>
                  <Td isNumeric fontWeight="bold" color={primaryActionColor} borderColor={useColorModeValue("gray.200", "gray.700")}>{pesoFormatter.format(leave.leavePay || 0)}</Td>
                </Tr>
              ))
            )}
          </Tbody>
        </Table>
      </TableContainer>

       <Modal isOpen={isDateModalOpen} onClose={onDateModalClose} isCentered size="md">
         <ModalOverlay />
         <ModalContent borderRadius="lg">
           <ModalHeader borderBottomWidth="1px" borderColor={useColorModeValue("gray.100", "gray.700")}>Set Leave Period</ModalHeader>
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

export default LeaveComp;
