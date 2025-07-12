import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import axios from "axios";
import { debounce } from 'lodash';
import {
  Box,
  Heading,
  Text,
  VStack,
  Table,
  Thead,
  Tbody,
  Tfoot,
  Tr,
  Th,
  Td,
  Button,
  Input,
  InputGroup,
  InputLeftElement,
  Flex,
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
  useToast,
  Stack,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverBody,
  PopoverArrow,
  Checkbox,
  Spinner,
  Alert,
  AlertIcon,
  IconButton,
  PopoverHeader,
  PopoverCloseButton,
  Select,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
} from "@chakra-ui/react";
import { SearchIcon, SettingsIcon, CalendarIcon, CloseIcon, WarningIcon } from "@chakra-ui/icons";
import { motion } from "framer-motion";
import { format, parseISO } from "date-fns";
import { FaFileAlt } from "react-icons/fa";
import { useDisclosure as useChakraDisclosure } from '@chakra-ui/react';

const MotionBox = motion(Box);

const getFirstDayOfMonth = (date) => {
  const d = new Date(date);
  return format(new Date(d.getFullYear(), d.getMonth(), 1), 'yyyy-MM-dd');
};

const getLastDayOfMonth = (date) => {
  const d = new Date(date);
  return format(new Date(d.getFullYear(), d.getMonth() + 1, 0), 'yyyy-MM-dd');
};

const pesoFormatter = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
});

// Helper function to handle decimal input
const handleDecimalInput = (value) => {
  // Allow empty string
  if (value === '') return '';
  
  // Allow single decimal point
  if (value === '.') return '.';
  
  // Allow numbers with optional decimal point
  if (/^\d*\.?\d*$/.test(value)) {
    return value;
  }
  
  return value;
};

// Add new validation function
const isValidNumericInput = (value) => {
  if (value === '' || value === '.') return true;
  return /^\d*\.?\d*$/.test(value);
};

// Helper function to get numeric value for calculations
const getNumericValue = (value) => {
  if (value === '' || value === '.') return 0;
  return parseFloat(value) || 0;
};

const ScrapPakyawComponent = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [payrollData, setPayrollData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false); // For Create Report
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("");
  const toast = useToast();

  const { isOpen: isDateModalOpen, onOpen: onDateModalOpen, onClose: onDateModalClose } = useDisclosure();
  const { isOpen: isClearConfirmOpen, onOpen: onClearConfirmOpen, onClose: onClearConfirmClose } = useDisclosure();

  const [periodStartDate, setPeriodStartDate] = useState(getFirstDayOfMonth(new Date()));
  const [periodEndDate, setPeriodEndDate] = useState(getLastDayOfMonth(new Date()));
  const [tempStartDate, setTempStartDate] = useState(periodStartDate);
  const [tempEndDate, setTempEndDate] = useState(periodEndDate);

  const primaryColor = "#800020"; // Maroon
  const secondaryColor = "#1a365d"; // Dark Blue
  const headerBg = "white";
  const calculatedColBg = "#f0f8ff"; // AliceBlue for calculated fields

  const [draftError, setDraftError] = useState(null);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isClearingDraft, setIsClearingDraft] = useState(false);

  const loadDataRef = useRef(null);
  const [selectedReportRows, setSelectedReportRows] = useState([]);

  const [columnVisibility, setColumnVisibility] = useState({
    paymentType: true,
    startDate: true,
    endDate: true,
    employeeId: true,
    name: true,
    kilo: true,
    rate: true,
    total: true,
    deduction: true,
    netTotal: true,
    category: true,
  });

  const formatDateRange = (start, end) => {
    if (!start || !end) return "Not Selected";
    try {
      const startDateObj = parseISO(start);
      const endDateObj = parseISO(end);
      const startFormat = 'MMM d';
      const endFormat = startDateObj.getFullYear() === endDateObj.getFullYear() ? 'MMM d, yyyy' : 'MMM d, yyyy';
      return `${format(startDateObj, startFormat)} - ${format(endDateObj, endFormat)}`;
    } catch (e) { return "Invalid Date"; }
  };

  const formatDateForDisplay = (dateString) => {
    if (!dateString) return '';
    try { return format(parseISO(dateString), 'yyyy-MM-dd'); }
    catch (e) { return 'Invalid Date'; }
  };

  const calculatePakyawEntry = (record) => {
    const kilo = getNumericValue(record.kilo);
    const rate = getNumericValue(record.rate);
    const deduction = getNumericValue(record.deduction);

    const total = kilo * rate;
    const netTotal = total - deduction;

    return {
      ...record,
      kilo: record.kilo, // Keep the original string value for display
      rate: record.rate, // Keep the original string value for display
      total,
      deduction: record.deduction, // Keep the original string value for display
      netTotal,
    };
  };

  const debouncedSaveDraft = useCallback(
    debounce(async (dataToSave, token, currentPeriodStart, currentPeriodEnd) => {
      if (!dataToSave || dataToSave.length === 0 || !token) return;
      const draftsWithDates = dataToSave.map(d => ({ ...d, startDate: currentPeriodStart, endDate: currentPeriodEnd }));
      console.log("Auto-saving Pakyaw drafts:", draftsWithDates);
      try {
        await axios.put(
          `${process.env.NEXT_PUBLIC_BACKEND_API}/api/payroll/scrap-pakyaw/bulk-upsert`, // Placeholder
          draftsWithDates,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setDraftError(null);
      } catch (err) {
        const errorMsg = err.response?.data?.message || "Auto-save failed.";
        setDraftError(errorMsg);
      }
    }, 1500),
    []
  );

  const handleFieldUpdate = (employeeId, field, value) => {
    let updatedData = [];
    setPayrollData((prevData) => {
      updatedData = prevData.map((record) => {
        if (record.employeeId === employeeId) {
          if (field === 'kilo' || field === 'rate' || field === 'deduction') {
            const processedValue = handleDecimalInput(value);
            const updatedRecord = { ...record, [field]: processedValue };
            return calculatePakyawEntry(updatedRecord);
          } else if (field === 'category') {
            return { ...record, category: value };
          } else {
            const updatedRecord = { ...record, [field]: value };
            return calculatePakyawEntry(updatedRecord);
          }
        }
        return record;
      });
      return updatedData;
    });
    const token = localStorage.getItem("token");
    debouncedSaveDraft(updatedData, token, periodStartDate, periodEndDate);
  };

  const handleApplyDateRange = () => {
    if (!tempStartDate || !tempEndDate) {
      toast({ title: "Incomplete Date Range", status: "warning" }); return;
    }
    if (new Date(tempEndDate) < new Date(tempStartDate)) {
      toast({ title: "Invalid Date Range", status: "warning" }); return;
    }
    setPeriodStartDate(tempStartDate);
    setPeriodEndDate(tempEndDate);
    onDateModalClose();
  };

  loadDataRef.current = useCallback(async () => {
    setIsLoading(true); setError(null); setDraftError(null); setPayrollData([]);
    const token = localStorage.getItem("token");
    if (!token) { setError("Authentication token not found."); setIsLoading(false); return; }
    if (!periodStartDate || !periodEndDate) { setError("Invalid Period."); setIsLoading(false); return; }

    let fetchedDrafts = [];
    let fetchDraftError = null;

    try {
      // Fetch Pakyaw Drafts
      const draftResponse = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_API}/api/payroll/scrap-pakyaw`, { // Placeholder
        params: { startDate: periodStartDate, endDate: periodEndDate },
        headers: { Authorization: `Bearer ${token}` },
      }).catch(err => {
        fetchDraftError = err.response?.data?.message || "Failed to load Pakyaw drafts.";
        return { data: [] };
      });
      fetchedDrafts = draftResponse.data || [];
      console.log(`Fetched ${fetchedDrafts.length} Pakyaw drafts.`);

    } catch (err) {
      setError("Failed to load auxiliary Pakyaw data.");
    }

    if (fetchedDrafts.length > 0) {
      const processedDrafts = fetchedDrafts.map(draft => calculatePakyawEntry(draft));
      setPayrollData(processedDrafts);
      if (!fetchDraftError) setError(null);
    } else {
      if (fetchDraftError) setError(fetchDraftError); else setError(null);
      try {
        // Use the helper function to fetch Pakyaw employees
        const pakyawEmployees = await fetchPakyawEmployees(token);
        const initialData = pakyawEmployees.map(emp => {
          const record = {
            employee: emp,
            employeeId: emp.empID || "N/A",
            name: `${emp.lastName || ""}, ${emp.firstName || ""} ${emp.middleName ? emp.middleName.charAt(0) + "." : ""}`.trim(),
            paymentType: emp.payMethod || "N/A",
            startDate: periodStartDate,
            endDate: periodEndDate,
            kilo: 0,
            rate: emp.wage || 0, // Set initial rate to employee's wage
            total: 0,
            deduction: 0,
            netTotal: 0,
            category: "",
          };
          return calculatePakyawEntry(record);
        });
        setPayrollData(initialData);
      } catch (empError) {
        setError(empError.response?.data?.message || "Failed to fetch employee data.");
      }
    }
    setIsLoading(false);
  }, [periodStartDate, periodEndDate, toast]);

  useEffect(() => {
    if (loadDataRef.current) loadDataRef.current();
  }, [periodStartDate, periodEndDate]);

  const filteredPayrollData = useMemo(() => {
    let filtered = payrollData;
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(record =>
        record.name?.toLowerCase().includes(query) ||
        record.employeeId?.toLowerCase().includes(query)
      );
    }

    // Apply category filter
    if (selectedCategory) {
      filtered = filtered.filter(record => record.category === selectedCategory);
    }

    const checkedRows = payrollData.filter(record =>
      selectedReportRows.includes(record.employeeId) &&
      !filtered.some(match => match.employeeId === record.employeeId)
    );
    return [...filtered, ...checkedRows];
  }, [payrollData, searchQuery, selectedReportRows, selectedCategory]);

  const totals = useMemo(() => {
    return filteredPayrollData.reduce(
      (acc, record) => {
        acc.kilo += parseFloat(record.kilo) || 0;
        acc.total += parseFloat(record.total) || 0;
        acc.deduction += parseFloat(record.deduction) || 0;
        acc.netTotal += parseFloat(record.netTotal) || 0;
        // Rate is not summed up, it's per entry.
        return acc;
      }, { kilo: 0, total: 0, deduction: 0, netTotal: 0 }
    );
  }, [filteredPayrollData]);

  // Add new validation function to check all records
  const validatePayrollData = (data) => {
    const invalidRecords = data.filter(record => 
      !isValidNumericInput(record.kilo) || 
      !isValidNumericInput(record.rate) || 
      !isValidNumericInput(record.deduction)
    );

    if (invalidRecords.length > 0) {
      const invalidNames = invalidRecords.map(record => record.name).join(', ');
      return {
        isValid: false,
        message: `Cannot save: The following records contain invalid numeric values (kilo, rate, or deduction): ${invalidNames}`
      };
    }
    return { isValid: true };
  };

  // Update handleSaveChanges function
  const handleSaveChanges = async () => {
    if (payrollData.length === 0) { 
      toast({ title: "No Data", status: "info" }); 
      return; 
    }

    // Validate data before saving
    const validation = validatePayrollData(payrollData);
    if (!validation.isValid) {
      toast({ 
        title: "Invalid Input", 
        description: validation.message,
        status: "error",
        duration: 5000,
        isClosable: true
      });
      return;
    }

    setIsSavingDraft(true); 
    setDraftError(null);
    const token = localStorage.getItem("token");
    if (!token) { 
      setDraftError("Authentication token not found."); 
      setIsSavingDraft(false); 
      return; 
    }
    const draftsWithDates = payrollData.map(d => ({ ...d, startDate: periodStartDate, endDate: periodEndDate }));
    try {
      await axios.put(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/payroll/scrap-pakyaw/bulk-upsert`,
        draftsWithDates, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast({ title: "Changes Saved", status: "success" });
      setLastSavedData(JSON.stringify(draftsWithDates));
    } catch (err) {
      const errorMsg = err.response?.data?.message || "Failed to save changes.";
      setDraftError(errorMsg);
      toast({ title: 'Error Saving Changes', description: errorMsg, status: 'error' });
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleClearDraft = async () => {
    setIsClearingDraft(true); setDraftError(null);
    const token = localStorage.getItem("token");
    if (!token) { setDraftError("Authentication token not found."); setIsClearingDraft(false); onClearConfirmClose(); return; }
    try {
      await axios.delete(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/payroll/scrap-pakyaw/clear-drafts`, // Placeholder
        { params: { startDate: periodStartDate, endDate: periodEndDate }, headers: { Authorization: `Bearer ${token}` } }
      );
      toast({ title: "Pakyaw Draft Cleared", status: "success" });
      if (loadDataRef.current) loadDataRef.current();
    } catch (err) {
      const errorMsg = err.response?.data?.message || "Failed to clear Pakyaw draft.";
      setDraftError(errorMsg);
      toast({ title: 'Error Clearing Draft', description: errorMsg, status: 'error' });
    } finally {
      setIsClearingDraft(false); onClearConfirmClose();
    }
  };

  const handleRowCheckboxChange = (employeeId) => {
    setSelectedReportRows(prev => prev.includes(employeeId) ? prev.filter(id => id !== employeeId) : [...prev, employeeId]);
  };

  const handleSelectAllReport = (e) => {
    if (e.target.checked) {
      setSelectedReportRows(filteredPayrollData.map(r => r.employeeId));
    } else {
      setSelectedReportRows([]);
    }
  };

  // Update handleCreateReport function
  const handleCreateReport = async () => {
    if (!periodStartDate || !periodEndDate) { 
      toast({ title: "Invalid Period", status: "error" }); 
      return; 
    }
    if (selectedReportRows.length === 0) { 
      toast({ title: "No Employees Selected", status: "warning" }); 
      return; 
    }
    
    const dataForReport = payrollData.filter(r => selectedReportRows.includes(r.employeeId));
    if (dataForReport.length === 0) { 
      toast({ title: "No Data Selected", status: "info" }); 
      return; 
    }

    // Validate data before creating report
    const validation = validatePayrollData(dataForReport);
    if (!validation.isValid) {
      toast({ 
        title: "Invalid Input", 
        description: validation.message,
        status: "error",
        duration: 5000,
        isClosable: true
      });
      return;
    }

    setIsSaving(true); 
    setError(null);
    const token = localStorage.getItem("token");
    if (!token) { 
      setError("Authentication token not found."); 
      setIsSaving(false); 
      return; 
    }

    // Remove the category from the report payload since each entry has its own category
    const reportPayload = { 
      payrollData: dataForReport, 
      startDate: periodStartDate, 
      endDate: periodEndDate
    };
    
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/reports/payroll/scrap-pakyaw`,
        reportPayload, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast({ title: "Pakyaw Report Generated", description: `Report ID: ${response.data.reportId}`, status: "success" });
      // Only clear the selected rows, keep the data
      setSelectedReportRows([]);
    } catch (err) {
      const errorMsg = err.response?.data?.message || "Failed to generate Pakyaw report.";
      setError(errorMsg);
      toast({ title: "Error Generating Report", description: errorMsg, status: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleColumnVisibilityChange = (columnKey) => {
    setColumnVisibility(prev => ({ ...prev, [columnKey]: !prev[columnKey] }));
  };

  const visibleColumnsCount = Object.values(columnVisibility).filter(Boolean).length + 1; // +1 for checkbox

  // Helper function to fetch employees with position 'Pakyaw'
  const fetchPakyawEmployees = async (token) => {
    const response = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_API}/api/employees/personal`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return (response.data || []).filter(
      (emp) => emp.position === "Pakyaw" && emp.dateSeparated === null && emp.Department === "Justine's Scrap"
    );
  };

  // Add new function to handle manual row addition
  const handleAddManualRow = () => {
    const newRow = {
      employeeId: `MANUAL-${Date.now()}`,
      name: "",
      paymentType: "Cash",
      startDate: periodStartDate,
      endDate: periodEndDate,
      kilo: "",
      rate: "",
      total: 0,
      deduction: "0",
      netTotal: 0,
      isManualEntry: true,
      category: "",
    };
    setPayrollData(prev => [...prev, calculatePakyawEntry(newRow)]);
    setSelectedReportRows(prev => [...prev, newRow.employeeId]);
  };

  // Category modal state
  const { isOpen: isCategoryModalOpen, onOpen: onOpenCategoryModal, onClose: onCloseCategoryModal } = useChakraDisclosure();
  const [newCategory, setNewCategory] = useState("");
  const [categories, setCategories] = useState([]);
  const [isCategoryLoading, setIsCategoryLoading] = useState(false);
  const [categoryError, setCategoryError] = useState(null);

  // Fetch categories
  const fetchCategories = useCallback(async () => {
    setIsCategoryLoading(true);
    setCategoryError(null);
    const token = localStorage.getItem("token");
    try {
      const response = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_API}/api/pakyaw-categories`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCategories(response.data || []);
    } catch (err) {
      setCategoryError(err.response?.data?.message || "Failed to fetch categories.");
    } finally {
      setIsCategoryLoading(false);
    }
  }, []);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  // Unsaved Rows Modal
  const { isOpen: isUnsavedModalOpen, onOpen: onOpenUnsavedModal, onClose: onCloseUnsavedModal } = useChakraDisclosure();
  const [pendingCreateReport, setPendingCreateReport] = useState(false);

  // Helper to check for unsaved rows (e.g., compare current data to last saved draft)
  const [lastSavedData, setLastSavedData] = useState([]);

  // Check for unsaved rows
  const hasUnsavedRows = () => {
    const current = JSON.stringify(payrollData.map(d => ({ ...d, startDate: periodStartDate, endDate: periodEndDate })));
    return current !== lastSavedData;
  };

  // Intercept Create Report
  const handleCreateReportIntercept = () => {
    if (hasUnsavedRows()) {
      setPendingCreateReport(true);
      onOpenUnsavedModal();
    } else {
      handleCreateReport();
    }
  };

  // On initial load, set lastSavedData
  useEffect(() => {
    setLastSavedData(JSON.stringify(payrollData.map(d => ({ ...d, startDate: periodStartDate, endDate: periodEndDate }))));
    // eslint-disable-next-line
  }, []);

  return (
    <MotionBox>
      <Box p={4}>
        <Flex direction="column" mb={6}>
          <Flex align="center" gap={3} wrap="wrap">
            <Button bg={primaryColor} color="white" size="md" onClick={handleCreateReportIntercept} isLoading={isSaving} isDisabled={isLoading || isSavingDraft || isClearingDraft}>Create Report</Button>
            <Button variant="solid" bg="green.500" color="white" size="md" onClick={handleSaveChanges} isLoading={isSavingDraft} isDisabled={isLoading || isSaving || isClearingDraft}>Save Changes</Button>
            <Button variant="outline" colorScheme="red" size="md" onClick={onClearConfirmOpen} isLoading={isClearingDraft} isDisabled={isLoading || isSaving || isSavingDraft || payrollData.length === 0}>Clear Draft</Button>
            <Button variant="outline" colorScheme="blue" size="md" onClick={onOpenCategoryModal} isDisabled={isCategoryLoading}>Create Category</Button>
            <Select
              placeholder="Filter by Category"
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              maxW="200px"
              size="md"
              ml={2}
              isDisabled={isCategoryLoading}
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat._id} value={cat.category}>{cat.category}</option>
              ))}
            </Select>
            <InputGroup maxW="300px" ml="auto">
              <InputLeftElement pointerEvents="none"><SearchIcon color={primaryColor} /></InputLeftElement>
              <Input placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </InputGroup>
            <Popover placement="bottom-start" isLazy>
              <PopoverTrigger><IconButton icon={<SettingsIcon />} aria-label="Columns" variant="outline" size="md" /></PopoverTrigger>
              <PopoverContent zIndex={401}>
                <PopoverArrow />
                <PopoverCloseButton />
                <PopoverHeader fontWeight="semibold">Show/Hide Columns</PopoverHeader>
                <PopoverBody>
                  <VStack align="start" spacing={1} maxHeight="250px" overflowY="auto">
                  {Object.keys(columnVisibility).map(key => (
                    <Checkbox
                      key={key}
                      isChecked={columnVisibility[key]}
                      onChange={() => handleColumnVisibilityChange(key)}
                      textTransform="capitalize"
                      size="sm"
                      sx={{
                        '.chakra-checkbox__control': {
                          borderColor: 'black',
                          _hover: {
                            borderColor: 'black'
                          }
                        }
                      }}
                    >
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </Checkbox>
                  ))}
                  </VStack>
                </PopoverBody>
              </PopoverContent>
            </Popover>
          </Flex>
        </Flex>

        {/* Category Modal */}
        <Modal isOpen={isCategoryModalOpen} onClose={onCloseCategoryModal} isCentered>
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>Create New Category</ModalHeader>
            <ModalCloseButton />
            <ModalBody pb={6}>
              <FormControl>
                <FormLabel>Category Name</FormLabel>
                <Input value={newCategory} onChange={e => setNewCategory(e.target.value)} placeholder="Enter category name" />
              </FormControl>
              {categoryError && <Alert status="error" mt={2}><AlertIcon />{categoryError}</Alert>}
            </ModalBody>
            <ModalFooter>
              <Button colorScheme="blue" mr={3} isLoading={isCategoryLoading} onClick={async () => {
                if (!newCategory.trim()) return;
                setIsCategoryLoading(true);
                setCategoryError(null);
                const token = localStorage.getItem("token");
                try {
                  await axios.post(`${process.env.NEXT_PUBLIC_BACKEND_API}/api/pakyaw-categories`, { category: newCategory }, { headers: { Authorization: `Bearer ${token}` } });
                  setNewCategory("");
                  await fetchCategories();
                  onCloseCategoryModal();
                  toast({ title: 'Category created', status: 'success' });
                } catch (err) {
                  setCategoryError(err.response?.data?.message || 'Failed to create category.');
                } finally {
                  setIsCategoryLoading(false);
                }
              }}>Create</Button>
              <Button variant="ghost" onClick={onCloseCategoryModal}>Cancel</Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        {(error || draftError) && (
          <Stack spacing={2} mb={4}>
            {error && <Alert status="error"><AlertIcon />{error}</Alert>}
            {draftError && <Alert status="warning"><AlertIcon />Auto-save issue: {draftError}</Alert>}
          </Stack>
        )}

        <Box borderWidth="1px" borderRadius="lg" overflow="hidden">
          <TableContainer maxHeight="calc(100vh - 400px)" overflowY="auto">
            <Table variant="simple" size="sm">
              <Thead position="sticky" top={0} zIndex={1} bg={headerBg} boxShadow="sm">
                <Tr>
                  <Th px={1} py={2}><Checkbox isChecked={filteredPayrollData.length > 0 && selectedReportRows.length === filteredPayrollData.length} isIndeterminate={selectedReportRows.length > 0 && selectedReportRows.length < filteredPayrollData.length} onChange={handleSelectAllReport} sx={{
                    '.chakra-checkbox__control': {
                      borderColor: 'black',
                      _hover: {
                        borderColor: 'black'
                      }
                    }
                  }} /></Th>
                  <Th colSpan={4} textAlign="center">
                    <VStack spacing={1} py={1}>
                      <Text fontSize="xs" fontWeight="semibold" color="#1a365d" textTransform="uppercase" letterSpacing="wider" textAlign="center">PERIOD COVERED</Text>
                      <Text fontWeight="bold" fontSize="sm" color="#800020" textAlign="center">{formatDateRange(periodStartDate, periodEndDate)}</Text>
                      <Button size="xs" variant="outline" color="#1a365d" borderColor="#1a365d" _hover={{ bg: '#e6eaf3' }} onClick={onDateModalOpen} isDisabled={isLoading || isSaving} mt={1}>
                        Change Date
                      </Button>
                    </VStack>
                  </Th>
                  {columnVisibility.paymentType && <Th>Payment Type</Th>}
                  {columnVisibility.startDate && <Th>Start Date</Th>}
                  {columnVisibility.endDate && <Th>End Date</Th>}
                  {columnVisibility.employeeId && <Th>Employee ID</Th>}
                  {columnVisibility.name && <Th>Name</Th>}
                  {columnVisibility.kilo && <Th isNumeric>Kilo</Th>}
                  {columnVisibility.rate && <Th isNumeric>Rate</Th>}
                  {columnVisibility.total && <Th isNumeric bg={calculatedColBg}>Total</Th>}
                  {columnVisibility.deduction && <Th isNumeric>Deduction</Th>}
                  {columnVisibility.netTotal && <Th isNumeric bg={calculatedColBg}>Net Total</Th>}
                  {columnVisibility.category && <Th minWidth="180px" width="200px">Category</Th>}
                </Tr>
              </Thead>
              <Tbody>
                {isLoading ? (
                  <Tr><Td colSpan={visibleColumnsCount} textAlign="center" py={10}><Spinner size="xl" /></Td></Tr>
                ) : error && !payrollData.length ? (
                  <Tr><Td colSpan={visibleColumnsCount} textAlign="center" py={10}><Alert status="error">{error}</Alert></Td></Tr>
                ) : filteredPayrollData.length === 0 ? (
                  <Tr><Td colSpan={visibleColumnsCount} textAlign="center" py={10}>No Pakyaw data found.</Td></Tr>
                ) : (
                  filteredPayrollData.map((record) => (
                    <Tr key={record.employeeId} _hover={{ bg: 'gray.50' }}>
                      <Td px={1}><Checkbox isChecked={selectedReportRows.includes(record.employeeId)} onChange={() => handleRowCheckboxChange(record.employeeId)} sx={{
                        '.chakra-checkbox__control': {
                          borderColor: 'black',
                          _hover: {
                            borderColor: 'black'
                          }
                        }
                      }} /></Td>
                      <Td colSpan={4}></Td>
                      {columnVisibility.paymentType && <Td fontSize="xs" whiteSpace="nowrap">
                        {record.isManualEntry ? (
                          <Select 
                            size="xs" 
                            value={record.paymentType}
                            onChange={(e) => handleFieldUpdate(record.employeeId, 'paymentType', e.target.value)}
                            isDisabled={!selectedReportRows.includes(record.employeeId)}
                            bg={selectedReportRows.includes(record.employeeId) ? 'white' : 'gray.100'}
                          >
                            <option value="Cash">Cash</option>
                            <option value="Bank">Bank</option>
                          </Select>
                        ) : record.paymentType}
                      </Td>}
                      {columnVisibility.startDate && <Td fontSize="xs" whiteSpace="nowrap">{formatDateForDisplay(record.startDate)}</Td>}
                      {columnVisibility.endDate && <Td fontSize="xs" whiteSpace="nowrap">{formatDateForDisplay(record.endDate)}</Td>}
                      {columnVisibility.employeeId && <Td fontSize="xs">
                        {record.isManualEntry ? (
                          <Input 
                            size="xs" 
                            value={record.employeeId}
                            isReadOnly
                            isDisabled={true}
                            bg="gray.100"
                          />
                        ) : record.employeeId}
                      </Td>}
                      {columnVisibility.name && <Td fontSize="xs" whiteSpace="nowrap">
                        {record.isManualEntry ? (
                          <Input 
                            size="xs" 
                            value={record.name}
                            onChange={(e) => handleFieldUpdate(record.employeeId, 'name', e.target.value)}
                            isDisabled={!selectedReportRows.includes(record.employeeId)}
                            bg={selectedReportRows.includes(record.employeeId) ? 'white' : 'gray.100'}
                          />
                        ) : record.name}
                      </Td>}
                      {columnVisibility.kilo && <Td isNumeric fontSize="xs">
                        <Input 
                          size="xs" 
                          value={record.kilo}
                          onChange={(e) => handleFieldUpdate(record.employeeId, 'kilo', e.target.value)}
                          textAlign="right"
                          px={1}
                          isDisabled={!selectedReportRows.includes(record.employeeId)}
                          bg={selectedReportRows.includes(record.employeeId) ? 'white' : 'gray.100'}
                          borderColor={!isValidNumericInput(record.kilo) ? 'red.500' : 'inherit'}
                          _hover={{ borderColor: !isValidNumericInput(record.kilo) ? 'red.500' : 'inherit' }}
                          _focus={{ borderColor: !isValidNumericInput(record.kilo) ? 'red.500' : 'inherit' }}
                        />
                      </Td>}
                      {columnVisibility.rate && <Td isNumeric fontSize="xs">
                        <Input 
                          size="xs" 
                          value={record.rate}
                          onChange={(e) => handleFieldUpdate(record.employeeId, 'rate', e.target.value)}
                          textAlign="right"
                          px={1}
                          placeholder={record.employee?.wage ? pesoFormatter.format(record.employee.wage) : '0.00'}
                          isDisabled={!selectedReportRows.includes(record.employeeId)}
                          bg={selectedReportRows.includes(record.employeeId) ? 'white' : 'gray.100'}
                          borderColor={!isValidNumericInput(record.rate) ? 'red.500' : 'inherit'}
                          _hover={{ borderColor: !isValidNumericInput(record.rate) ? 'red.500' : 'inherit' }}
                          _focus={{ borderColor: !isValidNumericInput(record.rate) ? 'red.500' : 'inherit' }}
                        />
                      </Td>}
                      {columnVisibility.total && <Td isNumeric fontSize="xs" bg={calculatedColBg}>{pesoFormatter.format(record.total || 0)}</Td>}
                      {columnVisibility.deduction && <Td isNumeric fontSize="xs">
                        <Input 
                          size="xs" 
                          value={record.deduction}
                          onChange={(e) => handleFieldUpdate(record.employeeId, 'deduction', e.target.value)}
                          textAlign="right"
                          px={1}
                          isDisabled={!selectedReportRows.includes(record.employeeId)}
                          bg={selectedReportRows.includes(record.employeeId) ? 'white' : 'gray.100'}
                          borderColor={!isValidNumericInput(record.deduction) ? 'red.500' : 'inherit'}
                          _hover={{ borderColor: !isValidNumericInput(record.deduction) ? 'red.500' : 'inherit' }}
                          _focus={{ borderColor: !isValidNumericInput(record.deduction) ? 'red.500' : 'inherit' }}
                        />
                      </Td>}
                      {columnVisibility.netTotal && <Td isNumeric fontSize="xs" bg={calculatedColBg} fontWeight="bold">{pesoFormatter.format(record.netTotal || 0)}</Td>}
                      {columnVisibility.category && <Td fontSize="xs" minWidth="180px" width="200px">
                        <Menu>
                          <MenuButton as={Button} size="xs" width="100%" bg={selectedReportRows.includes(record.employeeId) ? 'white' : 'gray.100'} isDisabled={!selectedReportRows.includes(record.employeeId)}>
                            {record.category || 'Select Category'}
                          </MenuButton>
                          <MenuList minWidth="200px">
                            {categories.length === 0 && <MenuItem isDisabled>No categories</MenuItem>}
                            {categories.map(cat => (
                              <MenuItem key={cat._id} closeOnSelect={false}>
                                <Box flex="1" onClick={() => handleFieldUpdate(record.employeeId, 'category', cat.category)} cursor="pointer">
                                  {cat.category}
                                </Box>
                                <IconButton
                                  aria-label="Delete Category"
                                  icon={<CloseIcon boxSize={2.5} />}
                                  size="xs"
                                  colorScheme="red"
                                  variant="ghost"
                                  ml={2}
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    if (window.confirm(`Delete category '${cat.category}'?`)) {
                                      const token = localStorage.getItem("token");
                                      try {
                                        await axios.delete(`${process.env.NEXT_PUBLIC_BACKEND_API}/api/pakyaw-categories/${cat._id}`, { headers: { Authorization: `Bearer ${token}` } });
                                        await fetchCategories();
                                        toast({ title: 'Category deleted', status: 'success' });
                                      } catch (err) {
                                        toast({ title: 'Delete failed', description: err.response?.data?.message || 'Failed to delete category.', status: 'error' });
                                      }
                                    }
                                  }}
                                />
                              </MenuItem>
                            ))}
                          </MenuList>
                        </Menu>
                      </Td>}
                    </Tr>
                  ))
                )}
              </Tbody>
              {!isLoading && filteredPayrollData.length > 0 && (
                <Tfoot bg="gray.100">
                  <Tr>
                    <Th colSpan={5 + (columnVisibility.paymentType ? 1:0) + (columnVisibility.startDate ? 1:0) + (columnVisibility.endDate ? 1:0) + (columnVisibility.employeeId ? 1:0) + (columnVisibility.category ? 1:0)} textAlign="right">TOTALS:</Th>
                    {columnVisibility.kilo && <Th isNumeric>{totals.kilo.toFixed(2)}</Th>}
                    {columnVisibility.rate && <Th></Th>}
                    {columnVisibility.total && <Th isNumeric bg={calculatedColBg}>{pesoFormatter.format(totals.total)}</Th>}
                    {columnVisibility.deduction && <Th isNumeric>{pesoFormatter.format(totals.deduction)}</Th>}
                    {columnVisibility.netTotal && <Th isNumeric bg={calculatedColBg} fontWeight="bold">{pesoFormatter.format(totals.netTotal)}</Th>}
                  </Tr>
                </Tfoot>
              )}
            </Table>
          </TableContainer>
          <Flex justify="flex-start" p={2} borderTop="1px" borderColor="gray.200">
            <Button
              size="sm"
              colorScheme="blue"
              variant="outline"
              onClick={handleAddManualRow}
              isDisabled={isLoading || isSaving || isSavingDraft}
            >
              Add Manual Entry
            </Button>
          </Flex>
        </Box>
      </Box>

      <Modal isOpen={isDateModalOpen} onClose={onDateModalClose} isCentered>
        <ModalOverlay /><ModalContent>
          <ModalHeader>Set Payroll Period</ModalHeader><ModalCloseButton />
          <ModalBody pb={6}>
            <FormControl mb={4}><FormLabel>Start Date</FormLabel><Input type="date" value={tempStartDate} onChange={(e) => setTempStartDate(e.target.value)} /></FormControl>
            <FormControl><FormLabel>End Date</FormLabel><Input type="date" value={tempEndDate} onChange={(e) => setTempEndDate(e.target.value)} min={tempStartDate} /></FormControl>
          </ModalBody>
          <ModalFooter><Button colorScheme="blue" mr={3} onClick={handleApplyDateRange}>Apply</Button><Button variant="ghost" onClick={onDateModalClose}>Cancel</Button></ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={isClearConfirmOpen} onClose={onClearConfirmClose} isCentered>
        <ModalOverlay /><ModalContent>
          <ModalHeader>Confirm Clear Pakyaw Draft</ModalHeader><ModalCloseButton />
          <ModalBody>Are you sure you want to clear draft data for <Text as="span" fontWeight="bold">{formatDateRange(periodStartDate, periodEndDate)}</Text>? This cannot be undone.</ModalBody>
          <ModalFooter><Button variant="ghost" mr={3} onClick={onClearConfirmClose} isDisabled={isClearingDraft}>Cancel</Button><Button colorScheme="red" onClick={handleClearDraft} isLoading={isClearingDraft}>Confirm Clear</Button></ModalFooter>
        </ModalContent>
      </Modal>

      {/* Unsaved Rows Modal */}
      <Modal isOpen={isUnsavedModalOpen} onClose={() => { setPendingCreateReport(false); onCloseUnsavedModal(); }} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader><WarningIcon color="orange.400" mr={2}/> Unsaved Changes</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <Text>There are unsaved changes in your payroll data. Would you like to save them before creating the report?</Text>
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="red" variant="outline" mr={3} onClick={() => {
              setPendingCreateReport(false);
              onCloseUnsavedModal();
              handleCreateReport();
            }}>Continue Without Saving</Button>
            <Button variant="ghost" onClick={() => { setPendingCreateReport(false); onCloseUnsavedModal(); }}>Cancel</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </MotionBox>
  );
};

export default ScrapPakyawComponent;
