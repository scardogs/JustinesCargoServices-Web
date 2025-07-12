import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardBody,
  Heading,
  Text,
  Input,
  Button,
  Grid,
  GridItem,
  VStack,
  useColorModeValue,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Spinner,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  HStack,
  Select,
  Flex,
  useToast,
  Badge,
  InputGroup,
  InputLeftAddon,
  Tooltip,
} from '@chakra-ui/react';
import { InfoOutlineIcon, CalendarIcon } from '@chakra-ui/icons';
import axios from 'axios';

const ThirteenthMonth = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState('All');
  const [departments, setDepartments] = useState([]);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [years, setYears] = useState([]);
  const [apiAvailable, setApiAvailable] = useState(true);
  const [payoutOptions, setPayoutOptions] = useState({});
  const [payoutRecords, setPayoutRecords] = useState({});
  const [saving, setSaving] = useState({});

  const bgColor = useColorModeValue('gray.50', 'gray.700');
  const toast = useToast();

  useEffect(() => {
    // Generate list of years (current year and 5 years back)
    const currentYear = new Date().getFullYear();
    const yearsList = [];
    for (let i = 0; i < 6; i++) {
      yearsList.push(currentYear - i);
    }
    setYears(yearsList);
    
    fetchEmployees();
  }, [selectedDepartment, currentYear]);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication token not found');
        setLoading(false); // Stop loading if no token
        return;
      }

      // Setup timeout for the API request
      const source = axios.CancelToken.source();
      const timeout = setTimeout(() => {
        source.cancel('Request timed out');
        setError('Connection to server timed out. Please check if the backend server is running.');
        setApiAvailable(false);
        setLoading(false); // Stop loading on timeout
      }, 10000); // 10 seconds timeout

      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/13th-month/eligible-employees`,
        {
          headers: { Authorization: `Bearer ${token}` },
          cancelToken: source.token
        }
      );

      // Clear timeout since request succeeded
      clearTimeout(timeout);
      setApiAvailable(true);

      const employeeData = response.data;
      
      // Extract unique departments
      const uniqueDepartments = [...new Set(employeeData.map(emp => emp.Department))];
      setDepartments(uniqueDepartments);
      
      // Filter employees by department if not "All"
      let filteredEmployees = employeeData;
      if (selectedDepartment !== 'All') {
        filteredEmployees = employeeData.filter(
          emp => emp.Department === selectedDepartment
        );
      }
      
      // Initialize payout states from fetched data
      const initialPayoutOptions = {};
      const initialPayoutRecords = {};
      filteredEmployees.forEach(emp => {
        const empId = emp._id; // Use Employee's DB _id as the key for frontend state
        if (emp.thirteenthMonthData) {
          initialPayoutOptions[empId] = emp.thirteenthMonthData.payoutOption || 'Annually';
          if (emp.thirteenthMonthData.payoutDetails) {
             // Format date string correctly from ISO string or Date object
             const firstDate = emp.thirteenthMonthData.payoutDetails.firstDate
              ? new Date(emp.thirteenthMonthData.payoutDetails.firstDate).toISOString().split('T')[0]
              : '';
            // Initialize record with potentially existing details
            initialPayoutRecords[empId] = {
              firstAmount: emp.thirteenthMonthData.payoutDetails.firstAmount || '',
              firstDate: firstDate,
              // Initialize second payout details if they exist
              secondAmount: emp.thirteenthMonthData.payoutDetails.secondAmount || '',
              secondDate: emp.thirteenthMonthData.payoutDetails.secondDate
                ? new Date(emp.thirteenthMonthData.payoutDetails.secondDate).toISOString().split('T')[0]
                : ''
            };
          } else {
            // Ensure record is initialized even if payoutDetails is null/undefined
             initialPayoutRecords[empId] = { firstAmount: '', firstDate: '', secondAmount: '', secondDate: '' };
          }
        } else {
           initialPayoutOptions[empId] = 'Annually'; // Default if no record exists
           initialPayoutRecords[empId] = { firstAmount: '', firstDate: '', secondAmount: '', secondDate: '' }; // Initialize empty record
        }
      });
      // Update state
      setPayoutOptions(initialPayoutOptions);
      setPayoutRecords(initialPayoutRecords);

      setEmployees(filteredEmployees);
    } catch (err) {
      // Handle network errors specifically
      if (axios.isCancel(err)) {
        console.log('Request canceled:', err.message);
        // Error state might have been set by the timeout handler
        if (!error) setError('Request timed out.') // Set error if not already set by timeout
      } else if (err.message === 'Network Error' || err.response?.status >= 500) {
        console.error('Network/Server Error:', err);
        setError('Unable to connect to the server or server error occurred. Please check the backend.');
        setApiAvailable(false);
      } else if (err.response?.status === 401) {
         setError('Authentication failed. Please log in again.');
         // Potentially redirect to login here
      }
       else {
        console.error('Error fetching employees:', err.response?.data || err.message || err);
        setError('Failed to fetch employee data. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Calculate 13th month pay for a specific employee
  const calculate13thMonth = (monthlySalary) => {
    return (monthlySalary / 12).toFixed(2);
  };

  // Format salary as currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2
    }).format(amount);
  };

  // Get employee's monthly equivalent salary
  const getMonthlyEquivalentSalary = (employee) => {
    switch(employee.salaryCategory) {
      case 'Monthly':
        return employee.wage;
      case 'Daily':
        // Assuming 22 working days per month
        return employee.wage * 22;
      case 'Per Trip':
        // For per trip employees, we'll show a note
        return employee.wage; // This is their trip rate
      default:
        return employee.wage;
    }
  };

  // Retry connection to API
  const retryConnection = () => {
    setApiAvailable(true);
    fetchEmployees();
  };

  // Sample data for offline mode
  const sampleEmployees = [
    { _id: '1', empID: 'EMP001', firstName: 'Juan', lastName: 'Dela Cruz', Department: 'Operations', salaryCategory: 'Monthly', wage: 25000 },
    { _id: '2', empID: 'EMP002', firstName: 'Maria', lastName: 'Santos', Department: 'Admin', salaryCategory: 'Daily', wage: 650 },
    { _id: '3', empID: 'EMP003', firstName: 'Pedro', lastName: 'Reyes', Department: 'Operations', salaryCategory: 'Per Trip', wage: 2500 },
  ];

  // Handler for payout option change
  const handlePayoutOptionChange = (empId, value) => {
    setPayoutOptions(prev => ({ ...prev, [empId]: value }));
    if (value === 'Annually') {
      setPayoutRecords(prev => ({ ...prev, [empId]: undefined }));
    }
  };

  // Handler for payout record change
  const handlePayoutRecordChange = (empId, field, value) => {
    setPayoutRecords(prev => ({
      ...prev,
      [empId]: {
        ...prev[empId],
        [field]: value
      }
    }));
  };

  const handleSavePayout = async (empId, employee) => {
    setSaving(prev => ({ ...prev, [empId]: true }));
    const token = localStorage.getItem('token');
    const record = payoutRecords[empId] || {};
    const currentPayoutOption = payoutOptions[empId] || 'Annually';

    // Calculate original 13th month pay based on employee data (before any deductions)
    const originalMonthlySalary = getMonthlyEquivalentSalary(employee);
    const originalThirteenthMonthPay = parseFloat(calculate13thMonth(originalMonthlySalary));

    let finalThirteenthMonthPay = originalThirteenthMonthPay;
    let firstPayoutAmount = 0;

    if (currentPayoutOption === 'Semi-Annually' && record.firstAmount) {
      firstPayoutAmount = parseFloat(record.firstAmount);
      if (!isNaN(firstPayoutAmount) && firstPayoutAmount > 0) {
        finalThirteenthMonthPay = originalThirteenthMonthPay - firstPayoutAmount;
      }
    }

    const payload = {
      empID: employee.empID,
      Name: `${employee.firstName} ${employee.lastName}`,
      department: employee.Department,
      paytype: employee.salaryCategory,
      monthlyEquivalent: originalMonthlySalary,
      thirteenthMonthPay: finalThirteenthMonthPay,
      payoutOption: currentPayoutOption,
      payoutDetails: {
        firstAmount: record.firstAmount,
        firstDate: record.firstDate,
      }
    };

    // Ensure 13th month pay doesn't go negative
    if (payload.thirteenthMonthPay < 0) payload.thirteenthMonthPay = 0;

    try {
      let existingRecord;
      try {
        const res = await axios.get(
          `${process.env.NEXT_PUBLIC_BACKEND_API}/api/13th-month/employee/${employee.empID}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        existingRecord = res.data;
      } catch (getErr) {
        if (getErr.response && getErr.response.status === 404) {
          // Record doesn't exist, will proceed to create
        } else {
          console.error('Error fetching existing 13th month record:', getErr.response?.data || getErr.message || getErr);
          throw getErr;
        }
      }

      let savedData;
      if (existingRecord) {
        console.log("Attempting to UPDATE. Employee empID for GET:", employee.empID, "Using DB _id for PUT:", existingRecord._id, "Payload:", payload);
        const updateRes = await axios.put(
          `${process.env.NEXT_PUBLIC_BACKEND_API}/api/13th-month/${existingRecord._id}`,
          payload,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        savedData = updateRes.data;
      } else {
        console.log("Attempting to CREATE new record for Employee empID:", employee.empID, "Payload:", payload);
        const createRes = await axios.post(
          `${process.env.NEXT_PUBLIC_BACKEND_API}/api/13th-month`,
          payload,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        savedData = createRes.data;
      }

      toast({
        title: 'Saved!',
        description: 'Payout details have been saved successfully.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      // Refetch data after successful save to update the UI
      fetchEmployees();

    } catch (err) {
      console.error('Save payout error:', err.response?.data || err.message || err);
      let errorMessage = 'Failed to save payout details.';
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      }
      toast({
        title: 'Error',
        description: errorMessage,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setSaving(prev => ({ ...prev, [empId]: false }));
    }
  };

  return (
    <Box  mx="auto" p={4}>
      {/* Removed 13th Month Pay Calculator Card */}
      {/* Employee 13th Month Pay Table */}
      <Card maxW="100%" maxH="auto">
        <CardBody>
          <Heading as="h2" size="lg" mb={4}>
            Employee 13th Month Pay Summary - {currentYear}
          </Heading>
          
          {/* API Connection Error Banner */}
          {!apiAvailable && (
            <Alert status="error" mb={4}>
              <AlertIcon />
              <Flex justify="space-between" w="100%" align="center">
                <Box>
                  <AlertTitle>Connection Error</AlertTitle>
                  <AlertDescription>
                    Unable to connect to the server. Showing sample data instead.
                  </AlertDescription>
                </Box>
                <Button colorScheme="red" size="sm" onClick={retryConnection}>
                  Retry Connection
                </Button>
              </Flex>
            </Alert>
          )}
          
          <Flex justifyContent="space-between" mb={4}>
            <HStack spacing={4}>
              <Select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                w="200px"
                isDisabled={!apiAvailable}
              >
                <option value="All">All Departments</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </Select>
              
              <Select
                value={currentYear}
                onChange={(e) => setCurrentYear(parseInt(e.target.value))}
                w="150px"
              >
                {years.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </Select>
            </HStack>
          </Flex>
          
          {error && apiAvailable && (
            <Alert status="error" mb={4}>
              <AlertIcon />
              <AlertTitle>Error!</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {loading ? (
            <Flex justify="center" align="center" h="200px">
              <Spinner size="xl" />
            </Flex>
          ) : (
            <Box
              flex={1}
              w="100%"
              h="100%"
              borderWidth="1px"
              borderRadius="lg"
              borderColor="#E2E8F0"
              boxShadow="0px 2px 8px rgba(0, 0, 0, 0.06)"
              overflow="hidden"
              mt={4}
            >
              <TableContainer maxH="calc(100vh - 250px)" h="100%" w="100%" overflowY="auto" p={0}>
                <Table variant="simple" size="sm" w="100%" h="100%">
                  <Thead
                    bg="#F7FAFC"
                    position="sticky"
                    top={0}
                    zIndex={1}
                    boxShadow="0 1px 2px rgba(0,0,0,0.05)"
                  >
                    <Tr>
                      <Th fontSize="xs" fontWeight="semibold" color="black" py={3} px={4} textAlign="center" borderBottom="1px solid" borderColor="#1a365d" textTransform="uppercase" letterSpacing="0.5px">Employee ID</Th>
                      <Th fontSize="xs" fontWeight="semibold" color="black" py={3} px={4} textAlign="left" borderBottom="1px solid" borderColor="#1a365d" textTransform="uppercase" letterSpacing="0.5px">Name</Th>
                      <Th fontSize="xs" fontWeight="semibold" color="black" py={3} px={4} textAlign="left" borderBottom="1px solid" borderColor="#1a365d" textTransform="uppercase" letterSpacing="0.5px">Department</Th>
                      <Th fontSize="xs" fontWeight="semibold" color="black" py={3} px={4} textAlign="center" borderBottom="1px solid" borderColor="#1a365d" textTransform="uppercase" letterSpacing="0.5px">Pay Type</Th>
                      <Th fontSize="xs" fontWeight="semibold" color="black" py={3} px={4} textAlign="center" borderBottom="1px solid" borderColor="#1a365d" textTransform="uppercase" letterSpacing="0.5px">Payout Option <Tooltip label="Choose how the 13th month pay is distributed" fontSize="xs"><InfoOutlineIcon ml={1} /></Tooltip></Th>
                      <Th fontSize="xs" fontWeight="semibold" color="black" py={3} px={4} isNumeric borderBottom="1px solid" borderColor="#1a365d" textTransform="uppercase" letterSpacing="0.5px">Monthly Equivalent</Th>
                      <Th fontSize="xs" fontWeight="semibold" color="black" py={3} px={4} isNumeric borderBottom="1px solid" borderColor="#1a365d" textTransform="uppercase" letterSpacing="0.5px">13th Month Pay</Th>
                      <Th fontSize="xs" fontWeight="semibold" color="black" py={3} px={4} textAlign="center" borderBottom="1px solid" borderColor="#1a365d" textTransform="uppercase" letterSpacing="0.5px">Payout Details <Tooltip label="Enter payout amounts and dates for semi-annual option" fontSize="xs"><InfoOutlineIcon ml={1} /></Tooltip></Th>
                      <Th fontSize="xs" fontWeight="semibold" color="black" py={3} px={4} textAlign="center" borderBottom="1px solid" borderColor="#1a365d" textTransform="uppercase" letterSpacing="0.5px">Action</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {(apiAvailable ? employees : sampleEmployees).length > 0 ? (
                      (apiAvailable ? employees : sampleEmployees).map((employee, idx) => {
                      const monthlySalary = getMonthlyEquivalentSalary(employee);
                      // Calculate original total based on salary for display/validation purposes
                      const originalThirteenthMonthTotal = parseFloat(calculate13thMonth(monthlySalary));

                      // Use the pay amount from the fetched 13th month record if available, otherwise calculate it
                      const displayThirteenthMonthAmount = employee.thirteenthMonthData?.thirteenthMonthPay !== undefined
                          ? parseFloat(employee.thirteenthMonthData.thirteenthMonthPay)
                          : originalThirteenthMonthTotal; // Fallback to calculated if no record or pay amount is not set

                      const empId = employee._id; // Use Employee's DB _id as key for all state management
                      const payoutOption = payoutOptions[empId] || 'Annually'; // State holds current selection
                      const record = payoutRecords[empId] || { firstAmount: '', firstDate: '' }; // Ensure record is an object
                      const firstAmount = parseFloat(record.firstAmount || 0);
                      // Validate against the *original* total 13th month amount
                      const firstAmountInvalid = firstAmount > originalThirteenthMonthTotal;

                      return (
                          <Tr
                            key={empId} // Use Employee's DB _id as key
                            _hover={{ bg: "#F0F7FF" }}
                            transition="all 0.2s"
                            bg={idx % 2 === 0 ? "white" : "gray.50"}
                            borderBottom="1px solid"
                            borderColor="#E2E8F0"
                            fontSize="sm"
                          >
                            <Td py={2} px={4} textAlign="center">{employee.empID}</Td>
                            <Td py={2} px={4} fontWeight="medium" color="#1a365d">{`${employee.firstName} ${employee.lastName}`}</Td>
                            <Td py={2} px={4}>{employee.Department}</Td>
                            <Td py={2} px={4} textAlign="center">
                               <Badge
                                bg={
                                  employee.salaryCategory === 'Monthly' ? '#1a365d' :
                                  employee.salaryCategory === 'Daily' ? '#800020' : 'gray.600'
                                }
                                color="white"
                                borderRadius="md"
                                px={2}
                                py={1}
                              >
                                {employee.salaryCategory}
                              </Badge>
                            </Td>
                            <Td py={2} px={4} textAlign="center">
                              <Flex align="center" gap={2}>
                                <Badge
                                  colorScheme={payoutOption === 'Annually' ? 'blue' : 'orange'}
                                  px={3} py={1} borderRadius="md" fontSize="0.85em"
                                >
                                  {payoutOption}
                                </Badge>
                                <Select
                                  size="sm"
                                  value={payoutOption} // Controlled by payoutOptions state (using empId which is employee._id)
                                  onChange={e => handlePayoutOptionChange(empId, e.target.value)} // Use empId (_id)
                                  w="120px"
                                >
                                  <option value="Annually">Annually</option>
                                  <option value="Semi-Annually">Semi-Annually</option>
                                </Select>
                              </Flex>
                            </Td>
                            <Td py={2} px={4} isNumeric>{formatCurrency(monthlySalary)}</Td>
                            {/* Use the displayThirteenthMonthAmount which comes from the DB if available */}
                            <Td py={2} px={4} isNumeric>{formatCurrency(displayThirteenthMonthAmount)}</Td>
                            <Td py={2} px={4} textAlign="center">
                              {payoutOption === 'Semi-Annually' ? (
                                <Box bg="orange.50" rounded="md" p={2} minW="220px" maxW="240px" mx="auto">
                                  <VStack spacing={2} align="stretch">
                                    <Flex align="center" gap={2}>
                                      <Text fontSize="sm" fontWeight="semibold" minW="32px">1st:</Text>
                                      <InputGroup size="xs" w="110px">
                                        <InputLeftAddon children="₱" />
                                        <Input
                                          type="number"
                                          value={record.firstAmount || ''} // Controlled by payoutRecords state (using empId)
                                          onChange={e => handlePayoutRecordChange(empId, 'firstAmount', e.target.value)} // Use empId (_id)
                                          placeholder="Amount"
                                          isInvalid={firstAmountInvalid}
                                          fontSize="sm"
                                        />
                                      </InputGroup>
                                      <InputGroup size="xs" w="110px">
                                        <InputLeftAddon children={<CalendarIcon />} />
                                        <Input
                                          type="date"
                                          value={record.firstDate || ''} // Controlled by payoutRecords state (using empId)
                                          onChange={e => handlePayoutRecordChange(empId, 'firstDate', e.target.value)} // Use empId (_id)
                                          fontSize="sm"
                                        />
                                      </InputGroup>
                                    </Flex>
                                    {firstAmountInvalid && (
                                      <Text color="red.500" fontSize="xs" mt={1}>First payout cannot exceed total 13th month pay ({formatCurrency(originalThirteenthMonthTotal)}).</Text> // Show original total in error
                                    )}
                                  </VStack>
                                </Box>
                              ) : (
                                <Flex align="center" justify="center" h="100%">
                                  <Text fontSize="sm" color="gray.500" fontWeight="medium">Annual payout</Text>
                                </Flex>
                              )}
                            </Td>
                            <Td py={2} px={4} textAlign="center">
                              {payoutOption === 'Semi-Annually' ? (
                                <Button
                                  colorScheme="blue"
                                  size="sm"
                                  isLoading={saving[empId]} // Use empId (_id) for saving state
                                  onClick={() => handleSavePayout(empId, employee)} // Pass empId (_id) and employee object
                                  isDisabled={ // Disable if saving, or no first amount/date, or amount is invalid
                                    saving[empId] ||
                                    !record.firstAmount ||
                                    !record.firstDate ||
                                    firstAmountInvalid
                                  }
                                >
                                  Save
                                </Button>
                              ) : null}
                            </Td>
                        </Tr>
                      );
                    })
                  ) : (
                    <Tr>
                        <Td colSpan={9} textAlign="center" py={8} fontSize="md">No employees found</Td>
                    </Tr>
                  )}
                </Tbody>
              </Table>
            </TableContainer>
            </Box>
          )}
          
          <Box mt={4} p={3} bg="gray.50" borderRadius="md">
            <Text fontSize="sm" color="gray.600">
              Note: The 13th month pay is calculated as the monthly equivalent salary divided by 12.
              For daily wage employees, the monthly equivalent is calculated as daily wage × 22 days.
              For per trip employees, the value shown is based on their trip rate.
              {!apiAvailable && " Currently showing sample data because the server connection is unavailable."}
            </Text>
          </Box>
        </CardBody>
      </Card>
    </Box>
  );
};

export default ThirteenthMonth;
