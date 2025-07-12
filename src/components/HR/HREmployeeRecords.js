import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import {
  Box,
  Grid,
  GridItem,
  Text,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Button,
  IconButton,
  Tooltip,
  Input,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  HStack,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalCloseButton,
  ModalBody,
  VStack,
  FormControl,
  FormLabel,
  Select,
  useToast,
  Image,
  Flex,
  Heading,
  TabIndicator,
  SimpleGrid,
  useColorModeValue,
  Badge,
  Card,
  CardBody,
  CardHeader,
  Divider,
  TableContainer,
  Avatar,
  Spinner,
  Center,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  Progress,
  Step,
  StepDescription,
  StepIcon,
  StepIndicator,
  StepNumber,
  StepSeparator,
  StepStatus,
  StepTitle,
  Stepper,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Textarea,
  CloseButton,
  RadioGroup,
  Radio,
  Stack,
} from "@chakra-ui/react";
import {
  ViewIcon,
  EditIcon,
  DeleteIcon,
  SearchIcon,
  AddIcon,
  PhoneIcon,
  EmailIcon,
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  InfoIcon,
  AtSignIcon,
  HamburgerIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  LockIcon,
} from "@chakra-ui/icons";

// Status Reasons Enum (now Statuses)
const statuses = [
  'Employed',
  'resigned',
  'contractual',
  'retrenched',
  'separated',
  'AWOL',
  'terminated',
];

// Wizard Steps Configuration
const steps = [
  { title: "Basic Info", description: "ID & Name" },
  { title: "Contact", description: "Contact Details" },
  { title: "Employment", description: "Job Details" },
  { title: "IDs", description: "Government IDs" },
  { title: "Profile", description: "Image (Optional)" },
];

// Add NameConfirmationDialog component
const NameConfirmationDialog = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  cancelRef, 
  fullName 
}) => (
  <AlertDialog
    isOpen={isOpen}
    leastDestructiveRef={cancelRef}
    onClose={onClose}
  >
    <AlertDialogOverlay>
      <AlertDialogContent>
        <AlertDialogHeader fontSize="lg" fontWeight="bold">
          Duplicate Name Found
        </AlertDialogHeader>

        <AlertDialogBody>
          This name already exists in the records. Do you wish to continue?
          <br />
          <br />
          <Text fontWeight="bold">
            {fullName}
          </Text>
        </AlertDialogBody>

        <AlertDialogFooter>
          <Button ref={cancelRef} onClick={onClose}>
            Cancel
          </Button>
          <Button colorScheme="red" onClick={onConfirm} ml={3}>
            Continue
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialogOverlay>
  </AlertDialog>
);

const Employee = () => {
  const toast = useToast();
  const [employees, setEmployees] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const initialFormData = {
    empID: "",
    lastName: "",
    firstName: "",
    middleName: "",
    Nickname: "",
    Birthdate: "",
    Age: "",
    contactInfo: "",
    emergencyContact: "",
    Relation: "",
    position: "",
    Department: "",
    salaryCategory: "",
    payMethod: "Cash",
    bankAccountNumber: "",
    wage: "",
    dateHired: "",
    wageType: "",
    sssNo: "",
    pagibigNo: "",
    philhealthNo: "",
    tinNumber: "",
    profileImage: null,
    dateSeparated: "",
    status: null,
    remarks: "",
  };
  const [formData, setFormData] = useState(initialFormData);
  const [editingEmployeeId, setEditingEmployeeId] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingEmployee, setIsAddingEmployee] = useState(false);
  const [isUpdatingEmployee, setIsUpdatingEmployee] = useState(false);
  const [isDeletingEmployee, setIsDeletingEmployee] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const {
    isOpen: isAddModalOpen,
    onOpen: onAddModalOpen,
    onClose: onAddModalClose,
  } = useDisclosure();
  const {
    isOpen: isEditModalOpen,
    onOpen: onEditModalOpen,
    onClose: onEditModalClose,
  } = useDisclosure();
  const {
    isOpen: isDeleteAlertOpen,
    onOpen: onDeleteAlertOpen,
    onClose: onDeleteAlertClose,
  } = useDisclosure();
  const cancelRef = useRef();

  // Status Filter State - can now hold 'all', 'active', or specific reasons
  const [statusFilter, setStatusFilter] = useState('all'); 

  // Wizard State
  const [currentStep, setCurrentStep] = useState(0);
  const totalSteps = steps.length;
  const [isStepValid, setIsStepValid] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // --- State for Status Modal --- 
  const [employeeToUpdateStatus, setEmployeeToUpdateStatus] = useState(null);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [statusFormData, setStatusFormData] = useState({ status: '', remarks: '', dateSeparated: '' });
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  // --- End State for Status Modal ---

  // Calculate min date for separation based on hire date
  const minSeparationDate = employeeToUpdateStatus?.dateHired 
    ? new Date(employeeToUpdateStatus.dateHired).toISOString().split('T')[0]
    : '';

  // Define which statuses strictly require separation date
  const separationStatuses = ['resigned', 'retrenched', 'separated', 'terminated'];

  // Position dropdown state
  const [positionInput, setPositionInput] = useState("");
  const [showPositionOptions, setShowPositionOptions] = useState(false);
  const [positions, setPositions] = useState([]); // Store positions from API
  const [isAddingPosition, setIsAddingPosition] = useState(false);
  const filteredPositions = positions
    .map(pos => pos.position) // Extract position name from each position object
    .filter(pos => pos.toLowerCase().includes(positionInput.toLowerCase()));

  // Add company filter state
  const [companyFilter, setCompanyFilter] = useState('all');

  // Add position filter state
  const [positionFilter, setPositionFilter] = useState('all');

  // Add sort state
  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: 'ascending'
  });

  // Add sort function
  const sortData = (data, key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });

    return [...data].sort((a, b) => {
      if (key === 'name') {
        const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
        const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
        return direction === 'ascending' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
      }
      
      if (key === 'status') {
        const statusA = a.status ? a.status.toLowerCase() : (a.dateSeparated ? 'separated' : 'active');
        const statusB = b.status ? b.status.toLowerCase() : (b.dateSeparated ? 'separated' : 'active');
        return direction === 'ascending' ? statusA.localeCompare(statusB) : statusB.localeCompare(statusA);
      }

      const valueA = a[key]?.toString().toLowerCase() || '';
      const valueB = b[key]?.toString().toLowerCase() || '';
      return direction === 'ascending' ? valueA.localeCompare(valueB) : valueB.localeCompare(valueA);
    });
  };

  useEffect(() => {
    fetchEmployees();
    fetchPositions();
  }, []);

  // Effect to calculate age automatically when Birthdate changes
  useEffect(() => {
    if (formData.Birthdate) {
      const birthDate = new Date(formData.Birthdate);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      // Update only if the calculated age is different
      if (formData.Age !== age.toString()) {
         setFormData(prevFormData => ({ ...prevFormData, Age: age >= 0 ? age.toString() : '' }));
      }
    } else {
        // Clear age if birthdate is cleared
        if (formData.Age !== '') {
            setFormData(prevFormData => ({ ...prevFormData, Age: '' }));
        }
    }
  }, [formData.Birthdate]); // Dependency on Birthdate

  // Effect to update pagination calculations when filters change
  useEffect(() => {
    const filteredBySearch = employees.filter((employee) => {
      const searchableFields = [
        employee.empID?.toLowerCase() || "",
        employee.firstName?.toLowerCase() || "",
        employee.lastName?.toLowerCase() || "",
        employee.middleName?.toLowerCase() || "",
        employee.Nickname?.toLowerCase() || "",
        employee.contactInfo?.toLowerCase() || "",
        employee.position?.toLowerCase() || "",
        employee.Department?.toLowerCase() || "",
        employee.dateSeparated ? (employee.status || 'separated').toLowerCase() : "active",
        employee.dateHired
          ? new Date(employee.dateHired).toLocaleDateString().toLowerCase()
          : "",
      ].filter(Boolean);

      const searchTerms = searchTerm.toLowerCase().split(" ");

      return searchTerms.every((term) =>
        searchableFields.some((field) => field.includes(term))
      );
    });

    // Apply status filter
    const filteredByStatus = filteredBySearch.filter(employee => {
      if (statusFilter === 'active') {
        return !employee.dateSeparated;
      } else if (statusFilter !== 'all') { // Check if it's a specific reason
        return employee.dateSeparated && employee.status === statusFilter;
      }
      return true; // 'all' status
    });
    
    // Apply company filter
    const filteredByCompany = filteredByStatus.filter(employee => {
      if (companyFilter === 'all') return true;
      return employee.Department === companyFilter;
    });
    
    // Apply position filter
    const filteredByPosition = filteredByCompany.filter(employee => {
      if (positionFilter === 'all') return true;
      return employee.position === positionFilter;
    });
    
    setTotalItems(filteredByPosition.length);
    const calculatedTotalPages = Math.ceil(filteredByPosition.length / itemsPerPage);
    setTotalPages(calculatedTotalPages > 0 ? calculatedTotalPages : 1);

    // Reset to page 1 if current page is now invalid
    if (currentPage > calculatedTotalPages && calculatedTotalPages > 0) {
      setCurrentPage(1);
    }
  }, [employees, searchTerm, statusFilter, companyFilter, positionFilter, itemsPerPage, currentPage]);

  // Function to get employees for the current page
  const getCurrentPageEmployees = () => {
    const filteredBySearch = employees.filter((employee) => {
      const searchableFields = [
        employee.empID?.toLowerCase() || "",
        employee.firstName?.toLowerCase() || "",
        employee.lastName?.toLowerCase() || "",
        employee.middleName?.toLowerCase() || "",
        employee.Nickname?.toLowerCase() || "",
        employee.contactInfo?.toLowerCase() || "",
        employee.position?.toLowerCase() || "",
        employee.Department?.toLowerCase() || "",
        employee.dateSeparated ? (employee.status || 'separated').toLowerCase() : "active",
        employee.dateHired
          ? new Date(employee.dateHired).toLocaleDateString().toLowerCase()
          : "",
      ].filter(Boolean);

      const searchTerms = searchTerm.toLowerCase().split(" ");

      return searchTerms.every((term) =>
        searchableFields.some((field) => field.includes(term))
      );
    });

    // Apply status filter
    const filteredByStatus = filteredBySearch.filter(employee => {
      if (statusFilter === 'active') {
        return !employee.dateSeparated;
      } else if (statusFilter !== 'all') { // Check if it's a specific reason
        return employee.dateSeparated && employee.status === statusFilter;
      }
      return true; // 'all' status
    });

    // Apply company filter
    const filteredByCompany = filteredByStatus.filter(employee => {
      if (companyFilter === 'all') return true;
      return employee.Department === companyFilter;
    });

    // Apply position filter
    const filteredByPosition = filteredByCompany.filter(employee => {
      if (positionFilter === 'all') return true;
      return employee.position === positionFilter;
    });
    
    // Apply sorting if a sort key is selected
    let sortedData = [...filteredByPosition];
    if (sortConfig.key) {
      sortedData.sort((a, b) => {
        if (sortConfig.key === 'name') {
          const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
          const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
          return sortConfig.direction === 'ascending' 
            ? nameA.localeCompare(nameB) 
            : nameB.localeCompare(nameA);
        }
        
        if (sortConfig.key === 'status') {
          const statusA = a.status ? a.status.toLowerCase() : (a.dateSeparated ? 'separated' : 'active');
          const statusB = b.status ? b.status.toLowerCase() : (b.dateSeparated ? 'separated' : 'active');
          return sortConfig.direction === 'ascending' 
            ? statusA.localeCompare(statusB) 
            : statusB.localeCompare(statusA);
        }

        const valueA = a[sortConfig.key]?.toString().toLowerCase() || '';
        const valueB = b[sortConfig.key]?.toString().toLowerCase() || '';
        return sortConfig.direction === 'ascending' 
          ? valueA.localeCompare(valueB) 
          : valueB.localeCompare(valueA);
      });
    }
    
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    return sortedData.slice(indexOfFirstItem, indexOfLastItem);
  };

  // Handle page change
  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  const fetchEmployees = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(
        process.env.NEXT_PUBLIC_BACKEND_API + "/api/employees/personal"
      );
      setEmployees([...response.data].reverse());
    } catch (err) {
      setError("Failed to fetch employee data.");
      toast({
        title: "Error",
        description: "Failed to fetch employee data.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPositions = async () => {
    try {
      const response = await axios.get(
        process.env.NEXT_PUBLIC_BACKEND_API + "/api/employee-positions"
      );
      setPositions(response.data);
    } catch (err) {
      console.error("Failed to fetch positions:", err);
      toast({
        title: "Error",
        description: "Failed to fetch position data.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleAddPosition = async () => {
    if (!positionInput.trim()) {
      toast({
        title: "Error",
        description: "Position name cannot be empty.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsAddingPosition(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error("Authentication token not found. Please log in.");
      }

      await axios.post(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/employee-positions`,
        { position: positionInput },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
        }
      );

      // Refresh positions after adding
      await fetchPositions();
      
      toast({
        title: "Success",
        description: `Position "${positionInput}" added successfully!`,
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    } catch (err) {
      toast({
        title: "Error",
        description: err.response?.data?.error || "Failed to add position.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsAddingPosition(false);
    }
  };

  const handleDeleteClick = (employee) => {
    setEmployeeToDelete(employee);
    onDeleteAlertOpen();
  };

  const confirmAction = () => {
    if (!employeeToDelete) return;
      handleSoftDeleteEmployee();
  };

  const handleSoftDeleteEmployee = async () => {
    if (!employeeToDelete) return;

    const id = employeeToDelete._id;
    setIsDeletingEmployee(true);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast({ title: "Authentication Error", description: "No token found. Please log in again.", status: "error" });
        onDeleteAlertClose();
        setIsDeletingEmployee(false);
        return;
      }

      await axios.delete(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/employees/personal/${id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      fetchEmployees();
      onDeleteAlertClose();
      toast({
        title: "Success",
        description: "Employee record deleted successfully and logged.",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    } catch (err) {
      console.error("Error deleting employee:", err);
      toast({
        title: "Error",
        description: err.response?.data?.message || "Failed to delete employee record.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsDeletingEmployee(false);
        setEmployeeToDelete(null);
    }
};

  const handleChange = (e) => {
    const { name, value } = e.target;
    let formattedValue = value;

    // For Employee ID, always start with 'M-00' and prevent editing the prefix
    if (name === "empID") {
      if (!value.startsWith("M-00")) {
        formattedValue = "M-00" + value.replace(/^M-00/, "");
      }
      // Prevent deleting the prefix
      if (formattedValue.length < 4) {
        formattedValue = "M-00";
      }
      setFormData({ ...formData, [name]: formattedValue });
      return;
    }

    // Capitalize name fields
    if (name === "lastName" || name === "firstName" || name === "middleName" || name === "Nickname") {
      formattedValue = value
        .split(" ")
        .map(
          (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        )
        .join(" ");
    } 
    // Format Contact Info (allow only digits and ensure 11 digits)
    else if (name === 'contactInfo') {
      // Remove non-digits
      const digits = value.replace(/\D/g, '');
      // Only take first 11 digits
      formattedValue = digits.slice(0, 11);
    }
    // Format Government IDs
    else if (['sssNo', 'philhealthNo', 'pagibigNo', 'tinNumber'].includes(name)) {
      const digits = value.replace(/\D/g, ''); // Remove non-digits

      if (name === 'sssNo') { // Format: XX-XXXXXXX-X (10 digits)
        if (digits.length <= 2) {
          formattedValue = digits;
        } else if (digits.length <= 9) {
          formattedValue = `${digits.slice(0, 2)}-${digits.slice(2)}`;
        } else {
          formattedValue = `${digits.slice(0, 2)}-${digits.slice(2, 9)}-${digits.slice(9, 10)}`;
        }
      } else if (name === 'philhealthNo') { // Format: XX-XXXXXXXXX-X (12 digits)
         if (digits.length <= 2) {
          formattedValue = digits;
        } else if (digits.length <= 11) {
          formattedValue = `${digits.slice(0, 2)}-${digits.slice(2)}`;
        } else {
          formattedValue = `${digits.slice(0, 2)}-${digits.slice(2, 11)}-${digits.slice(11, 12)}`;
        }
      } else if (name === 'pagibigNo') { // Format: XXXX-XXXX-XXXX (12 digits)
         if (digits.length <= 4) {
          formattedValue = digits;
        } else if (digits.length <= 8) {
          formattedValue = `${digits.slice(0, 4)}-${digits.slice(4)}`;
        } else {
          formattedValue = `${digits.slice(0, 4)}-${digits.slice(4, 8)}-${digits.slice(8, 12)}`;
        }
      } else if (name === 'tinNumber') { // Format: XXX-XXX-XXX (9 digits)
         if (digits.length <= 3) {
          formattedValue = digits;
        } else if (digits.length <= 6) {
          formattedValue = `${digits.slice(0, 3)}-${digits.slice(3)}`;
        } else {
          formattedValue = `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 9)}`;
        }
      }
    }

    // If Salary Category is set to 'Per Trip', clear the wage
    if (name === 'salaryCategory' && value === 'Per Trip') {
      setFormData({ 
        ...formData, 
        [name]: formattedValue,
        wage: '' // Clear wage field
      });
    } else {
      setFormData({ ...formData, [name]: formattedValue });
    }
  };

  // Handle position input change
  const handlePositionInputChange = (e) => {
    setPositionInput(e.target.value);
    setShowPositionOptions(true);
    setFormData({ ...formData, position: e.target.value });
  };

  // Handle position selection
  const handlePositionSelect = (position) => {
    setPositionInput(position);
    setFormData({ ...formData, position });
    setShowPositionOptions(false);
  };

  const handleFileChange = (e) => {
    setFormData({ ...formData, profileImage: e.target.files[0] });
  };

  // Add name checker function
  const checkDuplicateName = (lastName, firstName, middleName) => {
    return employees.some(emp => {
      // Skip checking against the current employee being edited
      if (isEditModalOpen && emp._id === editingEmployeeId) {
        return false;
      }
      
      // Normalize all names for comparison
      const normalizeName = (name) => name?.toLowerCase().trim() || '';
      
      const existingLastName = normalizeName(emp.lastName);
      const existingFirstName = normalizeName(emp.firstName);
      const existingMiddleName = normalizeName(emp.middleName);
      
      const newLastName = normalizeName(lastName);
      const newFirstName = normalizeName(firstName);
      const newMiddleName = normalizeName(middleName);
      
      // Check if all name parts match
      return existingLastName === newLastName &&
             existingFirstName === newFirstName &&
             existingMiddleName === newMiddleName;
    });
  };

  // Update handleNextStep function
  const handleNextStep = () => {
    let requiredFields = [];
    let isValid = true;

    switch (currentStep) {
      case 0:
        requiredFields = ['empID', 'lastName', 'firstName', 'Birthdate', 'Age'];
        
        // Check for duplicate name if we're on the basic info step
        if (isValid && formData.lastName && formData.firstName) {
          const isDuplicate = checkDuplicateName(
            formData.lastName,
            formData.firstName,
            formData.middleName
          );
          
          if (isDuplicate) {
            // Store the pending step and open confirmation dialog
            setPendingStep(currentStep + 1);
            setIsNameConfirmOpen(true);
            return;
          }
        }
        break;
      case 1:
        requiredFields = ['contactInfo'];
        // Add validation for contact number length
        if (formData.contactInfo && formData.contactInfo.length !== 11) {
          isValid = false;
          toast({
            title: "Invalid Contact Number",
            description: "Contact number must be exactly 11 digits",
            status: "error",
            duration: 3000,
            isClosable: true,
          });
        }
        break;
      case 2:
        requiredFields = ['position', 'Department', 'payMethod', 'wage', 'dateHired', 'salaryCategory'];
        break;
      case 3:
         break;
      case 4:
         break;
      default:
        break;
    }

    const missingFields = requiredFields.filter(field => !formData[field] || String(formData[field]).trim() === '');

    if (missingFields.length > 0) {
      isValid = false;
      toast({
        title: "Missing Required Fields",
        description: `Please fill in: ${missingFields.join(', ')}`,
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
    }

    if (isValid && currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleAddEmployeeSubmit = async (e) => {
    e.preventDefault();
    setIsAddingEmployee(true);
    setError("");

    // Append random 6-digit number to empID if not present
    let empID = formData.empID;
    if (!/-\d{6}$/.test(empID)) {
      const randomSix = Math.floor(100000 + Math.random() * 900000).toString();
      empID = empID + '-' + randomSix;
    }

    const { sssNo, pagibigNo, philhealthNo, tinNumber } = formData;
    const isDuplicate = (field, value) => {
      if (!value || String(value).trim() === "") return false;
      return employees.some(emp => emp[field] && String(emp[field]).trim() === String(value).trim());
    };

    if (isDuplicate('sssNo', sssNo)) {
      toast({ title: "Error", description: "SSS number already exists.", status: "error", duration: 3000, isClosable: true });
      setIsAddingEmployee(false);
      return;
    }
    if (isDuplicate('pagibigNo', pagibigNo)) {
      toast({ title: "Error", description: "Pag-IBIG number already exists.", status: "error", duration: 3000, isClosable: true });
      setIsAddingEmployee(false);
      return;
    }
    if (isDuplicate('philhealthNo', philhealthNo)) {
      toast({ title: "Error", description: "PhilHealth number already exists.", status: "error", duration: 3000, isClosable: true });
      setIsAddingEmployee(false);
      return;
    }
    if (isDuplicate('tinNumber', tinNumber)) {
      toast({ title: "Error", description: "TIN number already exists.", status: "error", duration: 3000, isClosable: true });
      setIsAddingEmployee(false);
      return;
    }

    const dataToSubmit = new FormData();
    Object.keys(formData).forEach((key) => {
      if (key === "profileImage" && formData[key] instanceof File) {
        dataToSubmit.append("profileImage", formData[key]);
      } else if (formData[key] !== undefined && formData[key] !== null && formData[key] !== "") {
        if (key === 'empID') {
          dataToSubmit.append('empID', empID);
        } else {
        dataToSubmit.append(key, formData[key]);
        }
      }
    });
    
    if (!formData.dateSeparated) {
        dataToSubmit.delete('dateSeparated');
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error("Authentication token not found. Please log in.");
      }

      await axios.post(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/employees/personal`,
        dataToSubmit,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${token}`
          },
        }
      );

      fetchEmployees();
      onAddModalClose();
      setFormData(initialFormData);
      setCurrentStep(0);

      toast({
        title: "Success",
        description: "Employee added successfully!",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    } catch (err) {
      toast({
        title: "Error",
        description: err.response?.data?.error || "An error occurred.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsAddingEmployee(false);
    }
  };

  const handleEditEmployeeSubmit = async () => {
    setIsUpdatingEmployee(true);
    setError("");

    const { sssNo, pagibigNo, philhealthNo, tinNumber } = formData;
    const isDuplicate = (field, value) => {
      if (!value || String(value).trim() === "") return false;
      return employees.some(emp => emp._id !== editingEmployeeId && emp[field] && String(emp[field]).trim() === String(value).trim());
    };

    if (isDuplicate('sssNo', sssNo)) {
      toast({ title: "Error", description: "SSS number already exists for another employee.", status: "error", duration: 3000, isClosable: true });
      setIsUpdatingEmployee(false);
      return;
    }
    if (isDuplicate('pagibigNo', pagibigNo)) {
      toast({ title: "Error", description: "Pag-IBIG number already exists for another employee.", status: "error", duration: 3000, isClosable: true });
      setIsUpdatingEmployee(false);
      return;
    }
    if (isDuplicate('philhealthNo', philhealthNo)) {
      toast({ title: "Error", description: "PhilHealth number already exists for another employee.", status: "error", duration: 3000, isClosable: true });
      setIsUpdatingEmployee(false);
      return;
    }
     if (isDuplicate('tinNumber', tinNumber)) {
      toast({ title: "Error", description: "TIN number already exists for another employee.", status: "error", duration: 3000, isClosable: true });
      setIsUpdatingEmployee(false);
      return;
    }

    const dataToSubmit = new FormData();
    Object.keys(formData).forEach((key) => {
      if (key === "profileImage" && formData[key] instanceof File) {
        dataToSubmit.append("profileImage", formData[key]);
      } else if (formData[key] !== undefined && formData[key] !== null) {
        dataToSubmit.append(key, formData[key]);
      }
    });

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error("Authentication token not found. Please log in.");
      }

      await axios.put(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/employees/personal/${editingEmployeeId}`,
        dataToSubmit,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${token}`
          },
        }
      );

        toast({
          title: "Success",
          description: "Employee information updated successfully",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
       fetchEmployees();

      onEditModalClose();
      setSelectedEmployee(null);
      setFormData(initialFormData);
      setEditingEmployeeId(null);
      setCurrentStep(0);

    } catch (err) {
      toast({
        title: "Error",
        description:
          err.response?.data?.error || "Failed to update employee information",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsUpdatingEmployee(false);
    }
  };

  // Modify the useEffect that handles modal opening
  useEffect(() => {
    if (selectedEmployee && isEditModalOpen) {
      setFormData({
        empID: selectedEmployee.empID || '',
        lastName: selectedEmployee.lastName || '',
        firstName: selectedEmployee.firstName || '',
        middleName: selectedEmployee.middleName || '',
        Nickname: selectedEmployee.Nickname || '',
        Birthdate: selectedEmployee.Birthdate
          ? new Date(selectedEmployee.Birthdate).toISOString().split("T")[0]
          : '',
        Age: selectedEmployee.Age || '',
        contactInfo: selectedEmployee.contactInfo || '',
        emergencyContact: selectedEmployee.emergencyContact || '',
        Relation: selectedEmployee.Relation || '',
        position: selectedEmployee.position || '',
        Department: selectedEmployee.Department || '',
        payMethod: selectedEmployee.payMethod || 'Cash',
        bankAccountNumber: selectedEmployee.bankAccountNumber || '',
        wage: selectedEmployee.wage || '',
        dateHired: selectedEmployee.dateHired
          ? new Date(selectedEmployee.dateHired).toISOString().split("T")[0]
          : '',
        salaryCategory: selectedEmployee.salaryCategory || '',
        sssNo: selectedEmployee.sssNo || '',
        pagibigNo: selectedEmployee.pagibigNo || '',
        philhealthNo: selectedEmployee.philhealthNo || '',
        tinNumber: selectedEmployee.tinNumber || '',
        profileImage: null,
        dateSeparated: selectedEmployee.dateSeparated
          ? new Date(selectedEmployee.dateSeparated).toISOString().split("T")[0]
          : '',
        status: selectedEmployee.status || null,
        remarks: selectedEmployee.remarks || '',
        wageType: selectedEmployee.wageType || '',
      });
      setPositionInput(selectedEmployee.position || '');
      setEditingEmployeeId(selectedEmployee._id);
    } else if (isAddModalOpen) {
        setFormData({
            ...initialFormData,
        empID: 'M-00',
        });
      setPositionInput('');
        setCurrentStep(0);
        setEditingEmployeeId(null);
    } else {
      setEditingEmployeeId(null);
    }
  }, [selectedEmployee, isEditModalOpen, isAddModalOpen]);

  useEffect(() => {
    if (!isAddModalOpen && !isEditModalOpen) return;

    let requiredFields = [];
    let isValid = true;

    switch (currentStep) {
      case 0:
        requiredFields = ['empID', 'lastName', 'firstName', 'Birthdate', 'Age'];
        break;
      case 1:
        requiredFields = ['contactInfo'];
        break;
      case 2:
        requiredFields = ['position', 'Department', 'payMethod', 'wage', 'dateHired', 'salaryCategory'];
        break;
      case 3:
      case 4:
      default:
         isValid = true;
         break;
    }

    if (requiredFields.length > 0) {
        const missingFields = requiredFields.filter(field => !formData[field] || String(formData[field]).trim() === '');
        isValid = missingFields.length === 0;
    }

    setIsStepValid(isValid);

  }, [formData, currentStep, isAddModalOpen, isEditModalOpen]);

  // --- Handlers for Status Modal --- 
  const openStatusModal = (employee) => {
    setEmployeeToUpdateStatus(employee);
    setStatusFormData({ 
        status: employee.status || '', 
        remarks: employee.remarks || '', 
        dateSeparated: employee.dateSeparated ? new Date(employee.dateSeparated).toISOString().split("T")[0] : '' 
    });
    setIsStatusModalOpen(true);
  };

  const closeStatusModal = () => {
    if (isUpdatingStatus) return;
    setIsStatusModalOpen(false);
    setEmployeeToUpdateStatus(null);
    setStatusFormData({ status: '', remarks: '', dateSeparated: '' });
  };

  const handleStatusFormChange = (e) => {
    const { name, value } = e.target;
    // Clear dateSeparated if status is AWOL or contractual
    if (name === 'status' && ['AWOL', 'contractual'].includes(value)) {
        setStatusFormData(prev => ({ 
            ...prev, 
            [name]: value,
            dateSeparated: '' // Clear date
        }));
    } else {
        setStatusFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleUpdateStatusSubmit = async () => {
    // Determine if date is required for the selected status
    const isDateRequired = separationStatuses.includes(statusFormData.status);

    // Updated validation
    if (!employeeToUpdateStatus || !statusFormData.status || (isDateRequired && !statusFormData.dateSeparated)) {
      toast({
        title: "Error",
        description: `Please select a status reason${isDateRequired ? ' and provide the separation date' : ''}.`,
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    setIsUpdatingStatus(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error("Authentication token not found.");
      }

      // Prepare payload - conditionally include dateSeparated
      const payload = { 
        status: statusFormData.status,
        remarks: statusFormData.remarks,
      };
      if (statusFormData.dateSeparated) {
        payload.dateSeparated = statusFormData.dateSeparated;
      } else if (!isDateRequired) {
        payload.dateSeparated = null;
      }

      await axios.put(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/employees/personal/${employeeToUpdateStatus._id}/status`,
        payload,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      toast({
        title: "Success",
        description: "Employee status updated successfully.",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      fetchEmployees();
      closeStatusModal();

    } catch (err) {
      toast({
        title: "Error Updating Status",
        description: err.response?.data?.error || "An error occurred.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsUpdatingStatus(false);
    }
  };
  // --- End Handlers for Status Modal ---

  // Effect to reset salaryCategory if department changes and current value is invalid
  useEffect(() => {
    if (formData.Department === "Justine's Scrap" && formData.salaryCategory === "Per Trip") {
      setFormData(prev => ({ ...prev, salaryCategory: "" }));
    }
    if (formData.Department === "Justine's Cargo" && formData.salaryCategory === "Pakyaw") {
      setFormData(prev => ({ ...prev, salaryCategory: "" }));
    }
    if (!formData.Department && ["Pakyaw", "Per Trip"].includes(formData.salaryCategory)) {
      setFormData(prev => ({ ...prev, salaryCategory: "" }));
    }
  }, [formData.Department]);

  // Add the delete handler
  const handleDeletePosition = async (id, pos) => {
    if (!id) return;
    if (!window.confirm(`Are you sure you want to delete the position "${pos}"?`)) return;
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error("Authentication token not found. Please log in.");
      await axios.delete(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/employee-positions/${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await fetchPositions();
      toast({
        title: "Position Deleted",
        description: `Position "${pos}" has been deleted.`,
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      // If the deleted position is currently selected, clear it
      if (formData.position === pos) {
        setFormData(prev => ({ ...prev, position: "" }));
        setPositionInput("");
      }
    } catch (err) {
      toast({
        title: "Error",
        description: err.response?.data?.error || "Failed to delete position.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  // Effect to automatically disable and set wage to 0 if salaryCategory is 'Per Trip'
  useEffect(() => {
    if (formData.salaryCategory === 'Per Trip') {
      setFormData(prev => ({ ...prev, wage: '0' }));
    }
  }, [formData.salaryCategory]);

  // Add SortableHeader component
  const SortableHeader = ({ label, sortKey }) => {
    const isSorted = sortConfig.key === sortKey;
    const isAscending = sortConfig.direction === 'ascending';

    const handleSort = () => {
      let direction = 'ascending';
      if (sortConfig.key === sortKey && sortConfig.direction === 'ascending') {
        direction = 'descending';
      }
      setSortConfig({ key: sortKey, direction });
    };

    return (
      <Th 
        borderBottom="none" 
        cursor="pointer" 
        onClick={handleSort}
        _hover={{ bg: "gray.50" }}
        position="relative"
        pr={8}
      >
        <Flex align="center" justify="space-between">
          {label}
          <Box position="absolute" right={2}>
            {isSorted ? (
              isAscending ? <ChevronUpIcon /> : <ChevronDownIcon />
            ) : (
              <Flex direction="column" opacity={0.3}>
                <ChevronUpIcon />
                <ChevronDownIcon />
              </Flex>
            )}
          </Box>
        </Flex>
      </Th>
    );
  };

  // Request Access modal state and handlers
  const [isAccessRequestOpen, setIsAccessRequestOpen] = useState(false);
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const [requestType, setRequestType] = useState("");
  const [requestRemarks, setRequestRemarks] = useState("");

  const handleAccessRequestOpen = () => {
    setRequestType("");
    setRequestRemarks("");
    setIsSubmittingRequest(false);
    setIsAccessRequestOpen(true);
  };
  const handleAccessRequestClose = () => setIsAccessRequestOpen(false);

  const handleSubmitRequest = async () => {
    if (!requestType) {
      toast({
        title: "Error",
        description: "Please select a request type (Edit or Delete).",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    setIsSubmittingRequest(true);
    try {
      const token = localStorage.getItem("token");
      const userString = localStorage.getItem("user");
      if (!token || !userString) {
        throw new Error("Authentication details not found.");
      }
      const user = JSON.parse(userString);
      const generatedRequestID = `REQ-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const payload = {
        RequestID: generatedRequestID,
        Module: "Employee Management",
        RequestType: requestType,
        Remarks: requestRemarks,
        Username: user.name,
        UserRole: user.workLevel,
      };
      await axios.post(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/control-panel`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast({
        title: "Request Submitted",
        description: "Your access request has been sent for approval.",
        status: "success",
        duration: 5000,
        isClosable: true,
      });
      setIsAccessRequestOpen(false);
    } catch (error) {
      console.error("Error submitting access request:", error);
      toast({
        title: "Request Failed",
        description: error.response?.data?.message || error.message || "Could not submit access request.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  // Access control state
  const [canEdit, setCanEdit] = useState(false);
  const [canDelete, setCanDelete] = useState(false);
  const [editExpiresAt, setEditExpiresAt] = useState(null);
  const [deleteExpiresAt, setDeleteExpiresAt] = useState(null);

  // Fetch access requests and update permissions
  const checkAccessPermissions = async () => {
    try {
      const token = localStorage.getItem("token");
      const userString = localStorage.getItem("user");
      if (!token || !userString) return;
      const user = JSON.parse(userString);
      const username = user.name;
      if (!username) return;
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/control-panel`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const requests = response.data;
      const now = new Date();

      // Check for active, approved Edit request
      const editRequest = requests.find(req =>
        req.Module === "Employee Management" &&
        req.Username === username &&
        req.RequestType === "Edit" &&
        req.Status === "Approved" &&
        (!req.ExpiresAt || new Date(req.ExpiresAt) > now)
      );

      // Check for active, approved Delete request
      const deleteRequest = requests.find(req =>
        req.Module === "Employee Management" &&
        req.Username === username &&
        req.RequestType === "Delete" &&
        req.Status === "Approved" &&
        (!req.ExpiresAt || new Date(req.ExpiresAt) > now)
      );

      setCanEdit(!!editRequest);
      setCanDelete(!!deleteRequest);
      setEditExpiresAt(editRequest?.ExpiresAt ? new Date(editRequest.ExpiresAt) : null);
      setDeleteExpiresAt(deleteRequest?.ExpiresAt ? new Date(deleteRequest.ExpiresAt) : null);
    } catch (error) {
      setCanEdit(false);
      setCanDelete(false);
      setEditExpiresAt(null);
      setDeleteExpiresAt(null);
    }
  };

  useEffect(() => {
    checkAccessPermissions();
    const intervalId = setInterval(checkAccessPermissions, 30000);
    return () => clearInterval(intervalId);
  }, []);

  // Add new state for name confirmation
  const [isNameConfirmOpen, setIsNameConfirmOpen] = useState(false);
  const [pendingStep, setPendingStep] = useState(null);

  // Add name confirmation handler
  const handleNameConfirm = () => {
    setIsNameConfirmOpen(false);
    if (pendingStep !== null) {
      setCurrentStep(pendingStep);
      setPendingStep(null);
    }
  };

  return (
    <Box>
      {/* Header Section with Stats */}
      <Box mb={8}>
        <Flex justify="space-between" align="center" mb={6}>
          <VStack align="start" spacing={1}>
            <Heading size="lg" color="#1a365d" fontWeight="bold">
              Employee Management
            </Heading>
            <Text color="gray.500">
              Manage employee records and personal information
            </Text>
          </VStack>
        </Flex>

        {/* Quick Stats Cards */}
        <Grid templateColumns={{ base: "1fr", md: "repeat(3, 1fr)" }} gap={4}>
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
              {employees.filter(emp => !emp.dateSeparated).length}
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
              Drivers
            </Text>
            <Text fontSize="2xl" fontWeight="bold" color="#1a365d">
              {
                employees.filter(emp => emp.position === "Driver" && !emp.dateSeparated)
                  .length
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
        borderColor="gray.200"
      >
        {/* Search and Filter Bar */}
        <Flex
          p={4}
          borderBottomWidth="1px"
          borderColor="gray.200"
          justify="space-between"
          align="center"
          wrap="wrap"
          gap={2}
        >
          <HStack spacing={2} maxW={{ base: "100%", md: "500px" }}>
            <InputGroup maxW={{ base: "100%", md: "400px" }}>
              <InputLeftElement pointerEvents="none">
                <SearchIcon color="gray.500" />
              </InputLeftElement>
              <Input
                placeholder="Search employees (name, ID, status)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                bg="white"
                borderColor="gray.300"
                _hover={{ borderColor: "#800020" }}
                _focus={{
                  borderColor: "#800020",
                  boxShadow: "0 0 0 1px #800020",
                }}
              />
            </InputGroup>
            <Button
              leftIcon={<AddIcon />}
              onClick={onAddModalOpen}
              bg="#800020"
              color="white"
              _hover={{ bg: "#600010" }}
              _active={{ bg: "#400000" }}
              size="md"
              minW="140px"
            >
              Add Employee
            </Button>
            <Button
              leftIcon={<LockIcon boxSize={5} />}
              colorScheme="purple"
              bg="purple.500"
              color="white"
              fontWeight="bold"
              borderRadius="lg"
              fontSize="md"
              px={6}
              py={2.5}
              minW="170px"
              _hover={{ bg: "purple.600" }}
              onClick={handleAccessRequestOpen}
              size="md"
            >
              Request Access
            </Button>
          </HStack>

          <HStack spacing={2}>
            {/* Status Filter Dropdown */}
            <Select 
              size="sm" 
              maxW={{ base: "100%", md: "200px" }}
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)}
              borderColor="gray.300"
              _hover={{ borderColor: "#800020" }}
              _focus={{ 
                borderColor: "#800020", 
                boxShadow: "0 0 0 1px #800020", 
              }}
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              {statuses.map(reason => (
                <option key={reason} value={reason} style={{ textTransform: 'capitalize'}}>
                  {reason}
                </option>
              ))}
            </Select>

            {/* Company Filter Dropdown */}
            <Select 
              size="sm" 
              maxW={{ base: "100%", md: "200px" }}
              value={companyFilter} 
              onChange={(e) => setCompanyFilter(e.target.value)}
              borderColor="gray.300"
              _hover={{ borderColor: "#800020" }}
              _focus={{ 
                borderColor: "#800020", 
                boxShadow: "0 0 0 1px #800020", 
              }}
            >
              <option value="all">All Companies</option>
              <option value="Justine's Scrap">Justine's Scrap</option>
              <option value="Justine's Cargo">Justine's Cargo</option>
              <option value="M&C">M&C</option>
            </Select>

            {/* Position Filter Dropdown */}
            <Select 
              size="sm" 
              maxW={{ base: "100%", md: "200px" }}
              value={positionFilter} 
              onChange={(e) => setPositionFilter(e.target.value)}
              borderColor="gray.300"
              _hover={{ borderColor: "#800020" }}
              _focus={{ 
                borderColor: "#800020", 
                boxShadow: "0 0 0 1px #800020", 
              }}
            >
              <option value="all">All Positions</option>
              {positions.map(pos => (
                <option key={pos.position} value={pos.position}>
                  {pos.position}
                </option>
              ))}
            </Select>
          </HStack>
        </Flex>

        {/* Unified Employee Table */}
        <Box p={0}>
              <Box overflowX="auto" maxH="650px" overflowY="auto">
                <Table variant="simple" size="md">
                  <Thead position="sticky" top={0} zIndex={1} bg="white">
                    <Tr borderBottom="1px solid" borderColor="gray.200">
                      <SortableHeader label="Employee ID" sortKey="empID" />
                      <SortableHeader label="Name" sortKey="name" />
                      <SortableHeader label="Position" sortKey="position" />
                      <SortableHeader label="Contact Info" sortKey="contactInfo" />
                      <SortableHeader label="Status" sortKey="status" />
                      <Th borderBottom="none" width="150px">
                        Actions
                      </Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {isLoading ? (
                      <Tr>
                    <Td colSpan={6}>
                          <Center py={6}>
                            <VStack spacing={3}>
                              <Spinner
                                thickness="4px"
                                speed="0.65s"
                                emptyColor="gray.200"
                                color="#800020"
                                size="xl"
                              />
                              <Text color="gray.500">Loading employees...</Text>
                            </VStack>
                          </Center>
                        </Td>
                      </Tr>
                    ) : getCurrentPageEmployees().length === 0 ? (
                      <Tr>
                    <Td colSpan={6}>
                          <Center py={6}>
                            <Text color="gray.500">
                              {searchTerm || statusFilter !== 'all'
                                ? "No employees found matching your criteria"
                                : "No employees found"}
                            </Text>
                          </Center>
                        </Td>
                      </Tr>
                    ) : (
                      getCurrentPageEmployees().map((employee) => (
                        <Tr
                          key={employee._id}
                          _hover={{ bg: "gray.50" }}
                          borderBottom="1px"
                          borderColor="gray.200"
                        >
                          <Td>{employee.empID}</Td>
                          <Td>
                            <HStack spacing={3}>
                              <Avatar
                                size="sm"
                                name={`${employee.firstName} ${employee.lastName}`}
                                src={
                              employee.profileImage
                                ? `${process.env.NEXT_PUBLIC_BACKEND_API}/uploads/${employee.profileImage}`
                                : "/fallback-profile.jpg"
                                }
                              />
                              <Text fontWeight="medium">
                                {employee.firstName} {employee.lastName}
                              </Text>
                            </HStack>
                          </Td>
                          <Td>
                            <Badge
                              bg={
                                employee.position === "Driver"
                                  ? "#800020"
                                  : "gray.600"
                              }
                              color="white"
                              borderRadius="md"
                              px={2}
                              py={1}
                            >
                              {employee.position}
                            </Badge>
                          </Td>
                          <Td>
                            <VStack align="start" spacing={1}>
                              <HStack>
                                <PhoneIcon color="gray.500" />
                                <Text>{employee.contactInfo}</Text>
                              </HStack>
                            </VStack>
                          </Td>
                          <Td>
                         <Badge 
                           colorScheme={employee.status === 'Employed' ? "green" : (employee.dateSeparated ? "red" : "blue")}
                           variant="subtle"
                           textTransform="capitalize"
                         >
                           {employee.status ? employee.status.charAt(0).toUpperCase() + employee.status.slice(1) : (employee.dateSeparated ? 'Separated' : 'Active')}
                         </Badge>
                       </Td>
                      <Td>
                        <Menu>
                          <MenuButton
                            as={IconButton}
                            aria-label='Actions'
                            icon={<HamburgerIcon />}
                            variant='ghost'
                            size="sm"
                          />
                          <MenuList minW="150px">
                            <MenuItem
                                icon={<ViewIcon />}
                                onClick={() => {
                                  setSelectedEmployee(employee);
                                  onOpen();
                                }}
                            >
                              View Details
                            </MenuItem>
                            <MenuItem
                                icon={<EditIcon />}
                                onClick={() => {
                                  setSelectedEmployee(employee);
                                  setEditingEmployeeId(employee._id);
                                  onEditModalOpen();
                                }}
                                isDisabled={!canEdit}
                            >
                              <Tooltip
                                label={
                                  canEdit
                                    ? undefined
                                    : editExpiresAt
                                    ? `Edit access expires in ${Math.ceil((editExpiresAt - new Date()) / 60000)} minutes`
                                    : "No edit access"
                                }
                                placement="left"
                                isDisabled={canEdit}
                              >
                                <Box>Edit</Box>
                              </Tooltip>
                            </MenuItem>
                            <MenuItem
                              icon={<EditIcon />}
                              color="orange.500"
                              onClick={() => openStatusModal(employee)}
                            >
                              Update Status
                            </MenuItem>
                            <MenuItem
                                icon={<DeleteIcon />}
                                color="red.500"
                                onClick={() => handleDeleteClick(employee)}
                                isDisabled={!canDelete}
                            >
                              <Tooltip
                                label={
                                  canDelete
                                    ? undefined
                                    : deleteExpiresAt
                                    ? `Delete access expires in ${Math.ceil((deleteExpiresAt - new Date()) / 60000)} minutes`
                                    : "No delete access"
                                }
                                placement="left"
                                isDisabled={canDelete}
                              >
                                <Box>Delete Record (Logs)</Box>
                              </Tooltip>
                            </MenuItem>
                          </MenuList>
                        </Menu>
                          </Td>
                        </Tr>
                      ))
                    )}
                  </Tbody>
                </Table>
              </Box>
              
          {/* Pagination Controls */}
              {totalItems > 0 && (
                <Box px={4} py={4} borderTop="1px solid" borderColor="gray.200">
                  <Flex justify="space-between" align="center">
                    <Text fontSize="sm" color="gray.600">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to {" "}
                  {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems}{ " "}
                  employees
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
                      setCurrentPage(1);
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
                        
                    {Array.from({ length: Math.min(5, totalPages) }).map(
                      (_, i) => {
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
                            variant={
                              currentPage === pageNum ? "solid" : "outline"
                            }
                            >
                              {pageNum}
                            </Button>
                          );
                      }
                    )}
                        
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
                      variant={
                        currentPage === totalPages ? "outline" : "solid"
                      }
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

      {/* View Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="4xl">
        <ModalOverlay bg="blackAlpha.600" backdropFilter="blur(2px)" />
        <ModalContent>
          <ModalHeader bg="#1a365d" color="white">
            Employee Details
          </ModalHeader>
          <ModalCloseButton color="white" />
          <ModalBody p={6}>
            {selectedEmployee && (
              <VStack spacing={6} align="stretch">
                <Flex direction={{ base: "column", md: "row" }} gap={6} align="center">
                  <Box>
                    <Image
                      src={
                         selectedEmployee.profileImage
                           ? `${process.env.NEXT_PUBLIC_BACKEND_API}/uploads/${selectedEmployee.profileImage}`
                           : "/fallback-profile.jpg"
                      }
                       boxSize="120px"
                      borderRadius="full"
                      border="4px solid"
                      borderColor="#1a365d"
                      objectFit="cover"
                    />
                  </Box>
                   <VStack align="start" flex="1" spacing={2}> 
                     <DetailItem label="Employee ID" value={selectedEmployee.empID} isBold />
                     <DetailItem 
                       label="Full Name" 
                       value={`${selectedEmployee.firstName} ${selectedEmployee.middleName ? selectedEmployee.middleName + ' ' : ''}${selectedEmployee.lastName}`}
                       isBold 
                     />
                     {selectedEmployee.Nickname && (
                         <DetailItem label="Nickname" value={selectedEmployee.Nickname} />
                     )}
                     {/* Add Status Badge back to top section */}
                     <DetailItem 
                        label="Status" 
                        value={selectedEmployee.status ? selectedEmployee.status.charAt(0).toUpperCase() + selectedEmployee.status.slice(1) : (selectedEmployee.dateSeparated ? 'Separated' : 'Active')}
                        badgeColorScheme={selectedEmployee.status === 'Employed' ? "green" : (selectedEmployee.dateSeparated ? "red" : "blue")}
                        isBadge
                        textTransform="capitalize"
                      />
                     {/* End Status Badge */} 
                     <DetailItem 
                        label="Position" 
                        value={selectedEmployee.position} 
                        badgeColorScheme={selectedEmployee.position === "Driver" ? "#800020" : "#1a365d"}
                        isBadge
                     />
                  </VStack>
                </Flex>

                <Divider />
                 <Heading size="sm" color="gray.600">Personal & Contact Details</Heading>
                 <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}> 
                    <DetailItem 
                      label="Birthdate" 
                      value={selectedEmployee.Birthdate ? new Date(selectedEmployee.Birthdate).toLocaleDateString() : "N/A"}
                    />
                    <DetailItem label="Age" value={selectedEmployee.Age || "N/A"} />
                    <DetailItem label="Contact Number" value={selectedEmployee.contactInfo} />
                    <DetailItem label="Emergency Contact" value={selectedEmployee.emergencyContact || "N/A"} />
                    <DetailItem label="Emergency Contact Relation" value={selectedEmployee.Relation || "N/A"} />
                 </SimpleGrid>

                <Divider />
                 <Heading size="sm" color="gray.600">Employment Details</Heading>
                 <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}> 
                   <DetailItem label="Department" value={selectedEmployee.Department || "N/A"} />
                   <DetailItem 
                     label="Date Hired" 
                     value={selectedEmployee.dateHired ? new Date(selectedEmployee.dateHired).toLocaleDateString() : "N/A"}
                   />
                    <DetailItem label="Payment Method" value={selectedEmployee.payMethod || "N/A"} />
                    {/* Conditionally display Bank Account Number */} 
                    {selectedEmployee.payMethod === 'Bank Transfer' && selectedEmployee.bankAccountNumber && (
                      <DetailItem label="Bank Account Number" value={selectedEmployee.bankAccountNumber} />
                    )}
                    <DetailItem 
                      label="Wage" 
                      value={selectedEmployee.wage ? `₱${Number(selectedEmployee.wage).toLocaleString()}` : "N/A"}
                    />
                   <DetailItem label="Wage Type" value={selectedEmployee.wageType || "N/A"} />
                   <DetailItem label="Salary Category" value={selectedEmployee.salaryCategory || "N/A"} /> 
                    <DetailItem 
                       label="Date Separated" 
                       value={selectedEmployee.dateSeparated ? new Date(selectedEmployee.dateSeparated).toLocaleDateString() : "N/A"}
                    />
                </SimpleGrid>

                <Divider />
                 <Heading size="sm" color="gray.600">Government IDs</Heading>
                 <SimpleGrid columns={{ base: 1, md: 4 }} spacing={4}> 
                   <DetailItem label="SSS Number" value={selectedEmployee.sssNo || "N/A"} />
                   <DetailItem label="Pag-IBIG Number" value={selectedEmployee.pagibigNo || "N/A"} />
                   <DetailItem label="PhilHealth Number" value={selectedEmployee.philhealthNo || "N/A"} />
                   <DetailItem label="TIN Number" value={selectedEmployee.tinNumber || "N/A"} />
                 </SimpleGrid>

                {/* Dismissal/Separation Info (Show if dateSeparated exists) */}
                {selectedEmployee.dateSeparated && (
                  <>
                    <Divider />
                    {/* Renamed Section Heading */}
                    <Heading size="sm" color="gray.600">Status & Separation Information</Heading> 
                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                       {/* Added Status Badge Here */} 
                       <DetailItem 
                         label="Status" 
                         value={selectedEmployee.status ? selectedEmployee.status.charAt(0).toUpperCase() + selectedEmployee.status.slice(1) : 'Separated'}
                         badgeColorScheme={selectedEmployee.status === 'Employed' ? "green" : "red"}
                         isBadge
                         textTransform="capitalize"
                       />
                       <DetailItem 
                          label="Date Separated" 
                          value={new Date(selectedEmployee.dateSeparated).toLocaleDateString()}
                       />
                       {/* Keep Reason and Remarks here */} 
                       <DetailItem label="Reason" value={selectedEmployee.status || "N/A"} textTransform="capitalize" />
                       <DetailItem label="Remarks" value={selectedEmployee.remarks || "N/A"} />
                    </SimpleGrid>
                  </>
                )}
              </VStack>
            )}
          </ModalBody>
          <ModalFooter borderTopWidth="2px" borderColor="#800020">
            <Button
              onClick={onClose}
              bg="#800020"
              color="white"
              _hover={{ bg: "#600010" }}
            >
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isAddModalOpen || isEditModalOpen}
        onClose={isAddModalOpen ? onAddModalClose : onEditModalClose}
        size="4xl"
      >
        <ModalOverlay bg="blackAlpha.600" backdropFilter="blur(2px)" />
        <ModalContent>
          <ModalHeader bg="#1a365d" color="white">
            {isAddModalOpen ? "Add New Employee" : "Edit Employee"}
          </ModalHeader>
          <ModalCloseButton color="white" />
          <ModalBody p={6}>
             {(isAddModalOpen || isEditModalOpen) && (
                 <Stepper index={currentStep} mb={6} colorScheme="purple">
                   {steps.map((step, index) => (
                     <Box 
                       key={index} 
                       flex="1" 
                       cursor="pointer" 
                       onClick={() => setCurrentStep(index)} 
                       _hover={{ bg: "gray.50"}}
                       borderRadius="md"
                       p={1}
                     >
                       <Step > 
                         <StepIndicator>
                           <StepStatus
                             complete={<StepIcon />}
                             incomplete={<StepNumber />}
                             active={<StepNumber />}
                           />
                         </StepIndicator>
                         <Box flexShrink="0">
                           <StepTitle>{step.title}</StepTitle>
                           <StepDescription>{step.description}</StepDescription>
                         </Box>
                         <StepSeparator />
                       </Step>
                     </Box>
                   ))}
                 </Stepper>
              )}
 
             <VStack spacing={6}>
               {(isAddModalOpen || isEditModalOpen) && (
                 <>
                   {currentStep === 0 && (
              <VStack spacing={4} w="90%" align="stretch">
                <SimpleGrid columns={3} spacing={4} w="full">
                  <FormControl isRequired>
                    <FormLabel>Last Name</FormLabel>
                    <Input name="lastName" value={formData.lastName} onChange={handleChange} />
                  </FormControl>
                  <FormControl isRequired>
                    <FormLabel>First Name</FormLabel>
                    <Input name="firstName" value={formData.firstName} onChange={handleChange} />
                  </FormControl>
                  <FormControl>
                    <FormLabel>Middle Name</FormLabel>
                    <Input name="middleName" value={formData.middleName} onChange={handleChange} />
                  </FormControl>
                </SimpleGrid>
                <SimpleGrid columns={3} spacing={4} w="full">
                  <FormControl>
                    <FormLabel>Nickname</FormLabel>
                    <Input name="Nickname" value={formData.Nickname} onChange={handleChange} />
                  </FormControl>
                  <FormControl isRequired>
                    <FormLabel>Birthdate</FormLabel>
                    <Input type="date" name="Birthdate" value={formData.Birthdate} onChange={handleChange} />
                  </FormControl>
                  <FormControl isRequired>
                    <FormLabel>Age</FormLabel>
                    <Input type="number" name="Age" value={formData.Age} onChange={handleChange} isDisabled={true} />
                  </FormControl>
                </SimpleGrid>
              </VStack>
                   )}
 
                   {currentStep === 1 && (
                     <SimpleGrid columns={2} spacing={4} w="full">
                       <FormControl isRequired isInvalid={formData.contactInfo && formData.contactInfo.length !== 11}>
                         <FormLabel>Contact Number</FormLabel>
                         <Input 
                           name="contactInfo" 
                           value={formData.contactInfo} 
                           onChange={handleChange} 
                           type="tel" 
                           maxLength={11} 
                           placeholder="e.g., 09171234567"
                           borderColor={formData.contactInfo && formData.contactInfo.length !== 11 ? "red.500" : "gray.300"}
                         />
                         {formData.contactInfo && formData.contactInfo.length !== 11 && (
                           <Text color="red.500" fontSize="sm" mt={1}>
                             Contact number must be exactly 11 digits
                           </Text>
                         )}
                       </FormControl>
                       <FormControl><FormLabel>Emergency Contact</FormLabel><Input name="emergencyContact" value={formData.emergencyContact} onChange={handleChange} /></FormControl>
                       <FormControl><FormLabel>Relation (Emergency Contact)</FormLabel><Input name="Relation" value={formData.Relation} onChange={handleChange} /></FormControl>
                     </SimpleGrid>
                   )}
 
                   {currentStep === 2 && (
                     <SimpleGrid columns={2} spacing={4} w="full">
                       {/* Left Side */}
                       <VStack spacing={4} align="stretch">
                         <FormControl>
                           <FormLabel>Employee ID</FormLabel>
                           <Input
                             name="empID"
                             value={formData.empID || 'M-00'}
                             onChange={handleChange}
                             isDisabled={isEditModalOpen}
                           />
                         </FormControl>
                         <FormControl isRequired>
                           <FormLabel>Department</FormLabel>
                           <Select 
                             name="Department" 
                             value={formData.Department} 
                             onChange={handleChange}
                             placeholder="Select Department"
                           >
                             <option value="Justine's Scrap">Justine's Scrap</option>
                             <option value="Justine's Cargo">Justine's Cargo</option>
                             <option value="M&C">M&C</option>
                           </Select>
                         </FormControl>
                         <FormControl isRequired>
                           <FormLabel>Payment Method</FormLabel>
                           <Select name="payMethod" value={formData.payMethod} onChange={handleChange}>
                             <option value="Cash">Cash</option>
                             <option value="Bank Transfer">Bank Transfer</option>
                           </Select>
                         </FormControl>
                         <FormControl isRequired>
                           <FormLabel>Date Hired</FormLabel>
                           <Input type="date" name="dateHired" value={formData.dateHired} onChange={handleChange} />
                         </FormControl>
                       </VStack>
                       {/* Right Side */}
                       <VStack spacing={4} align="stretch">
                         <FormControl isRequired position="relative">
                           <FormLabel>Position</FormLabel>
                           <InputGroup>
                             <Input
                               value={positionInput}
                               onChange={handlePositionInputChange}
                               placeholder="Type or select a position"
                               onFocus={() => setShowPositionOptions(true)}
                               onBlur={() => setTimeout(() => setShowPositionOptions(false), 200)}
                               pr="4.5rem"
                               disabled={!formData.Department}
                             />
                             <InputRightElement width="4.5rem">
                               <Button 
                                 h="1.75rem" 
                                 size="sm" 
                                 colorScheme="blue"
                                 onClick={handleAddPosition}
                                 isLoading={isAddingPosition}
                                 title="Add New Position"
                                 disabled={!formData.Department}
                               >
                                 <AddIcon />
                               </Button>
                             </InputRightElement>
                           </InputGroup>
                           {showPositionOptions && filteredPositions.length > 0 && (
                             <Box 
                               position="absolute" 
                               top="100%" 
                               left="0" 
                               right="0" 
                               zIndex="10"
                               mt="1px"
                               bg="white" 
                               boxShadow="md" 
                               borderRadius="md" 
                               maxH="200px" 
                               overflowY="auto"
                               border="1px solid"
                               borderColor="gray.200"
                             >
                               {filteredPositions.map((pos) => {
                                 const positionObj = positions.find(p => p.position === pos);
                                 return (
                                   <Flex 
                                     key={pos} 
                                     align="center" 
                                     justify="space-between" 
                                     p={2} 
                                     cursor="pointer"
                                     _hover={{ bg: "gray.100" }}
                                     onClick={() => handlePositionSelect(pos)}
                                     role="group"
                                   >
                                     <Box flex="1">{pos}</Box>
                                     <CloseButton
                                       size="sm"
                                       ml={2}
                                       colorScheme="red"
                                       onClick={e => {
                                         e.stopPropagation();
                                         handleDeletePosition(positionObj?._id, pos);
                                       }}
                                       aria-label={`Delete ${pos}`}
                                       _groupHover={{ opacity: 1 }}
                                     />
                                   </Flex>
                                 );
                               })}
                             </Box>
                           )}
                         </FormControl>
                         <FormControl isRequired>
                           <FormLabel>Salary Category</FormLabel>
                           <Select name="salaryCategory" value={formData.salaryCategory} onChange={handleChange} disabled={!formData.Department}>
                             <option value="">Select Salary Category</option>
                             <option value="Daily">Daily</option>
                             {formData.Department !== "Justine's Scrap" && (
                               <option value="Monthly">Monthly</option>
                             )}
                             {formData.Department === "Justine's Scrap" && (
                               <option value="Pakyaw">Pakyaw</option>
                             )}
                             {formData.Department === "Justine's Cargo" && (
                               <option value="Per Trip">Per Trip</option>
                             )}
                           </Select>
                         </FormControl>
                         <FormControl isRequired>
                           <FormLabel>Wage Type</FormLabel>
                           <Select name="wageType" value={formData.wageType} onChange={handleChange} disabled={!formData.Department}>
                             <option value="">Select Wage Type</option>
                             {/* Only show these if NOT Per Trip */}
                             {formData.salaryCategory !== "Per Trip" && (
                               <>
                             <option value="Minimum Wage">Minimum Wage</option>
                             <option value="Below Minimum Wage">Below Minimum Wage</option>
                               </>
                             )}
                             <option value="6 Wheel Manila">6 Wheel Manila</option>
                             <option value="6 Wheel Iloilo">6 Wheel Iloilo</option>
                             <option value="10 Wheel">10 Wheel</option>
                           </Select>
                         </FormControl>
                         <FormControl isRequired>
                           <FormLabel>Wage</FormLabel>
                           <Input type="number" name="wage" value={formData.wage} onChange={handleChange} disabled={!formData.Department || formData.salaryCategory === 'Per Trip'} />
                         </FormControl>
                       </VStack>
                     </SimpleGrid>
                   )}
 
                   {currentStep === 3 && (
                     <SimpleGrid columns={2} spacing={4} w="full">
                       <FormControl><FormLabel>SSS Number</FormLabel><Input name="sssNo" value={formData.sssNo} onChange={handleChange} maxLength={12} placeholder="XX-XXXXXXX-X" /></FormControl>
                       <FormControl><FormLabel>Pag-IBIG Number</FormLabel><Input name="pagibigNo" value={formData.pagibigNo} onChange={handleChange} maxLength={14} placeholder="XXXX-XXXX-XXXX" /></FormControl>
                       <FormControl><FormLabel>PhilHealth Number</FormLabel><Input name="philhealthNo" value={formData.philhealthNo} onChange={handleChange} maxLength={14} placeholder="XX-XXXXXXXXX-X" /></FormControl>
                       <FormControl><FormLabel>TIN Number</FormLabel><Input name="tinNumber" value={formData.tinNumber} onChange={handleChange} maxLength={11} placeholder="XXX-XXX-XXX" /></FormControl>
                     </SimpleGrid>
                   )}
 
                   {currentStep === 4 && (
                <FormControl>
                        <FormLabel>Profile Image (Optional)</FormLabel>
                        <Input type="file" accept="image/*" onChange={handleFileChange} borderColor="gray.300" />
                   </FormControl>
                )}
                 </>
               )}
            </VStack>
          </ModalBody>
          <ModalFooter borderTopWidth="2px" borderColor="#800020">
             {(isAddModalOpen || isEditModalOpen) && (
               <>
            <Button
              variant="outline"
              mr={3}
                   onClick={handlePreviousStep}
                   isDisabled={currentStep === 0 || isAddingEmployee || isUpdatingEmployee}
              color="#1a365d"
              borderColor="#1a365d"
            >
                   Previous
            </Button>
 
                 {currentStep < totalSteps - 1 && (
            <Button
              bg="#800020"
              color="white"
              _hover={{ bg: "#600010" }}
                     onClick={handleNextStep}
                     isDisabled={isUpdatingEmployee || (isAddModalOpen && !isStepValid)} 
                   >
                     Next
                   </Button>
                 )}
 
                 {currentStep === totalSteps - 1 && (
                   <Button
                     bg="#800020"
                     color="white"
                     _hover={{ bg: "#600010" }}
                     onClick={isAddModalOpen ? handleAddEmployeeSubmit : handleEditEmployeeSubmit}
              isLoading={isAddingEmployee || isUpdatingEmployee}
                     loadingText={isAddModalOpen ? "Adding..." : "Updating..."}
                     isDisabled={!isStepValid && isAddModalOpen}
            >
              {isAddModalOpen ? "Add Employee" : "Save Changes"}
            </Button>
                 )}
 
                  <Button
                    variant="ghost" 
                    ml={3}
                    onClick={isAddModalOpen ? onAddModalClose : onEditModalClose}
                    isDisabled={isAddingEmployee || isUpdatingEmployee}
                  >
                    Cancel
                  </Button>
               </>
             )}
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        isOpen={isDeleteAlertOpen}
        leastDestructiveRef={cancelRef}
        onClose={() => !isDeletingEmployee && onDeleteAlertClose()}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold" bg="red.600" color="white">
               Delete Employee Record
            </AlertDialogHeader>

            <AlertDialogBody>
                  Are you sure you want to delete the record for 
               <strong> {employeeToDelete?.firstName} {employeeToDelete?.lastName} </strong>?
                  <br />
               This action will log the deletion and remove the record from the system.
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button 
                ref={cancelRef} 
                onClick={onDeleteAlertClose} 
                isDisabled={isDeletingEmployee}
               >
                Cancel
              </Button>
              <Button
                colorScheme="red"
                onClick={confirmAction} 
                ml={3}
                isLoading={isDeletingEmployee}
                loadingText="Deleting..."
              >
                 Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>

      {/* --- Status Update Modal - Modified --- */ 
      <Modal isOpen={isStatusModalOpen} onClose={closeStatusModal} isCentered>
          <ModalOverlay />
          <ModalContent>
              <ModalHeader bg="#1a365d" color="white">Update Employee Status</ModalHeader>
              <ModalCloseButton color="white" _disabled={{ cursor: 'not-allowed' }} isDisabled={isUpdatingStatus} />
              <ModalBody pb={6}>
                  <VStack spacing={4}>
                      {/* Status Reason Dropdown */}
                      <FormControl isRequired isInvalid={!statusFormData.status && isUpdatingStatus}>
                          <FormLabel>Status</FormLabel>
                          <Select 
                              placeholder="Select status" 
                              name="status"
                              value={statusFormData.status}
                              onChange={handleStatusFormChange}
                              textTransform="capitalize"
                          >
                             {statuses.map(reason => (
                                <option key={reason} value={reason} style={{ textTransform: 'capitalize'}}>
                                  {reason}
                                </option>
                             ))}
                          </Select>
                      </FormControl>
                      {/* Date Separated Input - Conditionally Required */}
                      <FormControl 
                         isRequired={separationStatuses.includes(statusFormData.status)} // Conditionally required
                         isInvalid={separationStatuses.includes(statusFormData.status) && !statusFormData.dateSeparated && isUpdatingStatus}
                      >
                          <FormLabel>Date Separated</FormLabel>
                          <Input 
                             type="date"
                             name="dateSeparated"
                             value={statusFormData.dateSeparated}
                             onChange={handleStatusFormChange}
                             isDisabled={['AWOL', 'contractual', 'Employed'].includes(statusFormData.status)} // Disable for specific statuses
                             min={minSeparationDate} // Set the minimum selectable date
                           />
                      </FormControl>
                      {/* Remarks Textarea */}
                      <FormControl>
                          <FormLabel>Remarks (Optional)</FormLabel>
                          <Textarea 
                             name="remarks"
                             value={statusFormData.remarks}
                             onChange={handleStatusFormChange}
                             placeholder="Enter any relevant remarks..."
                          />
                      </FormControl>
                  </VStack>
              </ModalBody>
              <ModalFooter borderTopWidth="1px">
                  <Button variant="ghost" mr={3} onClick={closeStatusModal} isDisabled={isUpdatingStatus}>
                      Cancel
                  </Button>
                  <Button 
                      bg="#800020"
                      color="white"
                      _hover={{ bg: "#600010" }}
                      onClick={handleUpdateStatusSubmit}
                      isLoading={isUpdatingStatus}
                      loadingText="Saving..."
                  >
                      Save Status
                  </Button>
              </ModalFooter>
          </ModalContent>
      </Modal>
      /* --- End Status Update Modal --- */}

      {/* Request Access Modal */}
      <Modal isOpen={isAccessRequestOpen} onClose={handleAccessRequestClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Request Access</ModalHeader>
          <ModalCloseButton isDisabled={isSubmittingRequest} />
          <ModalBody pb={6}>
            <FormControl isRequired mb={4} as="fieldset">
              <FormLabel as="legend">Select Request Type</FormLabel>
              <RadioGroup onChange={setRequestType} value={requestType}>
                <Stack direction='row' spacing={5}>
                  <Radio value='Edit'>Request Edit Access</Radio>
                  <Radio value='Delete'>Request Delete Access</Radio>
                </Stack>
              </RadioGroup>
            </FormControl>
            <FormControl>
              <FormLabel>Remarks (Optional)</FormLabel>
              <Textarea
                value={requestRemarks}
                onChange={(e) => setRequestRemarks(e.target.value)}
                placeholder="Provide a reason for your request..."
              />
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <Button
              colorScheme='blue'
              mr={3}
              onClick={handleSubmitRequest}
              isLoading={isSubmittingRequest}
              loadingText="Submitting"
            >
              Submit Request
            </Button>
            <Button variant='ghost' onClick={handleAccessRequestClose} isDisabled={isSubmittingRequest}>Cancel</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Add NameConfirmationDialog */}
      <NameConfirmationDialog
        isOpen={isNameConfirmOpen}
        onClose={() => setIsNameConfirmOpen(false)}
        onConfirm={handleNameConfirm}
        cancelRef={cancelRef}
        fullName={`${formData.lastName}, ${formData.firstName} ${formData.middleName ? formData.middleName : ''}`}
      />

    </Box>
  );
};

// Updated DetailItem component for better display control
const DetailItem = ({ label, value, isBold = false, isBadge = false, badgeColorScheme = "gray", textTransform = "none" }) => (
  <Box>
    <Text fontSize="xs" color="gray.500" mb={0} textTransform="uppercase"> 
      {label}
    </Text>
    {isBadge ? (
      <Badge
        bg={badgeColorScheme}
        // Ensure text is white for specific dark backgrounds
        color={["#800020", "#1a365d", "red", "green", "blue"].includes(badgeColorScheme) || badgeColorScheme.startsWith("red") || badgeColorScheme.startsWith("green") || badgeColorScheme.startsWith("blue") ? "white" : "gray.800"}
        px={2}
        py={0.5}
        borderRadius="md"
        textTransform={textTransform}
      >
         {value}
      </Badge>
    ) : (
      <Text fontSize="md" color="gray.800" fontWeight={isBold ? "bold" : "medium"} textTransform={textTransform}>
        {value || "N/A"}
      </Text>
    )}
  </Box>
);

export default Employee;