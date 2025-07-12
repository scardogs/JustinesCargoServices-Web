import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import {
  Box,
  Grid,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Button,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  FormControl,
  FormLabel,
  Input,
  Select,
  IconButton,
  Tooltip,
  useDisclosure,
  useToast,
  Flex,
  Text,
  HStack,
  Heading,
  GridItem,
  Spacer,
  Card,
  TableContainer,
  Image,
  Badge,
  useBreakpointValue,
  VStack,
  InputGroup,
  InputLeftElement,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Checkbox,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverHeader,
  PopoverBody,
  PopoverArrow,
  PopoverCloseButton,
  List,
  ListItem,
  AlertDialog,
  AlertDialogOverlay,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogBody,
  AlertDialogFooter,
} from "@chakra-ui/react";
import {
  ViewIcon,
  EditIcon,
  DeleteIcon,
  AddIcon,
  Search2Icon,
  ChevronLeftIcon,
  ChevronRightIcon,
  SettingsIcon,
  CloseIcon,
} from "@chakra-ui/icons";

const TruckTable = () => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
  const { isOpen: isSessionExpiredModalOpen, onOpen: onSessionExpiredModalOpen, onClose: onSessionExpiredModalClose } = useDisclosure();
  const cancelRef = useRef();
  const [trucks, setTrucks] = useState([]);
  const [allTrucks, setAllTrucks] = useState([]);
  const [truckToDelete, setTruckToDelete] = useState(null);
  const [currentTruck, setCurrentTruck] = useState(null);
  const [formData, setFormData] = useState({
    mvFileNo: "",
    plateNumber: "",
    stubNumber: "",
    engineNo: "",
    chassisNo: "",
    classification: "",
    pistonDisplacement: "",
    fuel: "",
    make: "",
    series: "",
    bodyType: "",
    yearModel: "",
    grossWeight: "",
    netWeight: "",
    shippingWeight: "",
    netCapacity: "",
    cbm: "",
    ownerName: "",
    ownerAddress: "",
    contactDetails: "",
    encumberedTo: "",
    driverName: "",
    designation: "",
    status: "",
    dueDate: "",
  });
  const [searchTerm, setSearchTerm] = useState("");
  const toast = useToast();
  const [isAdding, setIsAdding] = useState(false);
  const [drivers, setDrivers] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [stubs, setStubs] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState({
    plateNumber: true,
    stubNumber: true,
    make: true,
    yearModel: true,
    bodyType: true,
    ownerName: true,
    driverName: true,
    status: true,
  });
  const [validationErrors, setValidationErrors] = useState({});
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchAllTrucks();
    fetchTrucks();
    fetchDrivers();
    fetchStubs();
  }, [currentPage]);

  // Add this new function to fetch all trucks
  const fetchAllTrucks = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        handleSessionExpired();
        return;
      }
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/trucks`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setAllTrucks(response.data);
    } catch (error) {
      console.error("Error fetching all trucks: ", error);
      if (error.response?.status === 401) {
        handleSessionExpired();
      }
    }
  };

  // Modify the existing fetchTrucks function
  const fetchTrucks = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        handleSessionExpired();
        return;
      }
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/trucks/paginate?page=${currentPage}&limit=${itemsPerPage}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setTrucks(response.data.trucks);
      setTotalPages(response.data.totalPages);
    } catch (error) {
      console.error("Error fetching trucks: ", error);
      if (error.response?.status === 401) {
        handleSessionExpired();
      }
    }
  };

  const fetchDrivers = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        handleSessionExpired();
        return;
      }
      // First get all drivers
      const driversResponse = await axios.get(
        process.env.NEXT_PUBLIC_BACKEND_API + "/api/employees/personal",
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      // Get all trucks to check assigned drivers
      const trucksResponse = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/trucks`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      // Get all drivers with "Driver" position and valid employment status
      const driverEmployees = driversResponse.data.filter(
        (emp) =>
          emp.position === "Driver" &&
          (emp.status === "Employed" || emp.status === "contractual") // Corrected field name and value
      );
      console.log(
        "Filtered driver employees (Position & Status):",
        driverEmployees
      ); // Log after filtering

      // Get list of assigned driver names
      const assignedDrivers = trucksResponse.data
        .map((truck) => truck.driverName)
        .filter((name) => name); // Filter out empty driver names

      // Filter out drivers who are already assigned to trucks, but include current truck's driver
      const availableDrivers = driverEmployees.filter((driver) => {
        const fullName = `${driver.firstName} ${driver.middleName ? driver.middleName + " " : ""}${driver.lastName}`;
        // Include the driver if they're not in assignedDrivers list OR if they're assigned to the current truck being edited
        return (
          !assignedDrivers.includes(fullName) ||
          (currentTruck && fullName === currentTruck.driverName)
        );
      });

      console.log("Final available drivers for dropdown:", availableDrivers); // Log final list
      setDrivers(availableDrivers);
    } catch (error) {
      console.error("Error fetching drivers:", error);
      if (error.response?.status === 401) {
        handleSessionExpired();
      }
      toast({
        title: "Error",
        description: "Failed to fetch available drivers",
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "top-right",
      });
    }
  };

  const fetchStubs = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        handleSessionExpired();
        return;
      }
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/waybills/stubs`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      console.log("Stubs response:", response.data);
      const uniqueStubs = Array.isArray(response.data) ? response.data : [];
      setStubs(uniqueStubs);
    } catch (error) {
      console.error("Error fetching stubs:", error);
      if (error.response?.status === 401) {
        handleSessionExpired();
      }
      toast({
        title: "Error",
        description: "Failed to fetch stub numbers",
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "top-right",
      });
    }
  };

  const determineDueDate = (plate) => {
    if (!plate) return null;

    const lastDigit = plate.slice(-1);
    const secondLastDigit = plate.length > 1 ? plate.slice(-2, -1) : "1";

    // Map last digit to month (0 = October, 1 = January, ..., 9 = September)
    const monthMap = [9, 0, 1, 2, 3, 4, 5, 6, 7, 8];
    const month = monthMap[lastDigit] || 0;

    // Map second last digit to week (1 = 1st week, 2 = 1st week, ..., 0 = last week)
    const weekMap = [4, 0, 0, 1, 1, 2, 2, 3, 3, 3];
    const week = weekMap[secondLastDigit] || 0;

    // Get current year
    const year = new Date().getFullYear();

    // Create date for the first day of the month
    const date = new Date(year, month, 1);

    // Add weeks (7 days per week)
    date.setDate(date.getDate() + week * 7);

    // Format the date as YYYY-MM-DD
    const formattedDate = date.toISOString().split("T")[0];
    return formattedDate;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    // Check for non-numeric characters in specific fields
    if (["engineNo", "pistonDisplacement"].includes(name)) {
      if (/[^0-9]/.test(value)) {
        setValidationErrors(prev => ({
          ...prev,
          [name]: `Only numbers are allowed in the ${name} field.`
        }));
        return;
      }
    }

    // Check for special characters in Vehicle Identification fields
    if (["mvFileNo"].includes(name)) {
      if (/[^a-zA-Z0-9\-]/.test(value)) {
        setValidationErrors(prev => ({
          ...prev,
          [name]: "Special characters are not allowed in identification details."
        }));
        return;
      }
    }

    // Check for special characters in Weight Information fields
    if (["grossWeight", "netWeight", "shippingWeight", "netCapacity", "cbm"].includes(name)) {
      if (/[^0-9.]/.test(value)) {
        setValidationErrors(prev => ({
          ...prev,
          [name]: "Only numbers and decimal points are allowed in weight fields."
        }));
        return;
      }
    }

    // Clear validation error for this field if input is valid
    setValidationErrors(prev => ({
      ...prev,
      [name]: undefined
    }));

    setFormData((prev) => ({
      ...prev,
      [name]: name === "plateNumber" ? value.toUpperCase() : value,
      dueDate: name === "plateNumber" ? determineDueDate(value) : prev.dueDate,
    }));

    // Validate field immediately after change
    validateField(name, value);
  };

  const validateField = (name, value) => {
    const errors = { ...validationErrors };

    // Required fields validation
    if (["plateNumber", "mvFileNo", "chassisNo", "engineNo", "pistonDisplacement", 
         "fuel", "make", "series", "bodyType", "yearModel", 
         "grossWeight", "netWeight", "shippingWeight", "netCapacity", "cbm", 
         "ownerName", "ownerAddress", "contactDetails", "encumberedTo", "status"].includes(name)) {
      if (!value || value.trim() === "") {
        errors[name] = `${name.charAt(0).toUpperCase() + name.slice(1).replace(/([A-Z])/g, ' $1')} is required`;
      } else {
        delete errors[name];
      }
    }

    // Uniqueness validation
    if (name === "plateNumber" && value && !isPlateNumberUnique(value)) {
      errors.plateNumber = "Plate Number already exists";
    } else if (name === "plateNumber" && value && isPlateNumberUnique(value)) {
      delete errors.plateNumber;
    }

    if (name === "chassisNo" && value && !isFieldUnique("chassisNo", value)) {
      errors.chassisNo = "Chassis Number already exists";
    } else if (name === "chassisNo" && value && isFieldUnique("chassisNo", value)) {
      delete errors.chassisNo;
    }

    if (name === "mvFileNo" && value && !isFieldUnique("mvFileNo", value)) {
      errors.mvFileNo = "MV File Number already exists";
    } else if (name === "mvFileNo" && value && isFieldUnique("mvFileNo", value)) {
      delete errors.mvFileNo;
    }

    // Driver Name validation
    if (name === "driverName" && value && !drivers.some(driver => getDriverFullName(driver) === value)) {
      errors.driverName = "Selected driver does not exist in the records.";
    } else if (name === "driverName" && value && drivers.some(driver => getDriverFullName(driver) === value)) {
      delete errors.driverName;
    }

    setValidationErrors(errors);
  };

  const isFieldUnique = (field, value) => {
    return !trucks.some(
      (truck) =>
        truck[field] &&
        truck[field].toLowerCase() === value.toLowerCase() &&
        truck._id !== currentTruck?._id // Exclude the current truck being edited
    );
  };

  const isPlateNumberUnique = (plateNumber) => {
    return !trucks.some(
      (truck) =>
        truck.plateNumber.toLowerCase() === plateNumber.toLowerCase() &&
        truck._id !== currentTruck?._id // Exclude the current truck being edited
    );
  };

  // Helper function to get full name
  const getDriverFullName = (driver) => {
    return `${driver.firstName} ${driver.middleName ? driver.middleName + " " : ""}${driver.lastName}`;
  };

  const validateForm = () => {
    const errors = {};
    const {
      plateNumber,
      chassisNo,
      mvFileNo,
      engineNo,
      pistonDisplacement,
      fuel,
      make,
      series,
      bodyType,
      yearModel,
      grossWeight,
      netWeight,
      shippingWeight,
      netCapacity,
      cbm,
      ownerName,
      ownerAddress,
      contactDetails,
      encumberedTo,
      status,
      driverName,
    } = formData;

    // Required fields validation
    if (!plateNumber) errors.plateNumber = "Plate Number is required";
    if (!mvFileNo) errors.mvFileNo = "MV File No. is required";
    if (!chassisNo) errors.chassisNo = "Chassis No. is required";
    if (!engineNo) errors.engineNo = "Engine No. is required";
    if (!pistonDisplacement) errors.pistonDisplacement = "Piston Displacement is required";
    if (!fuel) errors.fuel = "Fuel type is required";
    if (!make) errors.make = "Make is required";
    if (!series) errors.series = "Series is required";
    if (!bodyType) errors.bodyType = "Body Type is required";
    if (!yearModel) errors.yearModel = "Year Model is required";
    if (!grossWeight) errors.grossWeight = "Gross Weight is required";
    if (!netWeight) errors.netWeight = "Net Weight is required";
    if (!shippingWeight) errors.shippingWeight = "Shipping Weight is required";
    if (!netCapacity) errors.netCapacity = "Net Capacity is required";
    if (!cbm) errors.cbm = "CBM is required";
    if (!ownerName) errors.ownerName = "Owner Name is required";
    if (!ownerAddress) errors.ownerAddress = "Owner Address is required";
    if (!contactDetails) errors.contactDetails = "Contact Details is required";
    if (!encumberedTo) errors.encumberedTo = "Encumbered To is required";
    if (!status) errors.status = "Status is required";

    // Uniqueness validation
    if (plateNumber && !isPlateNumberUnique(plateNumber)) {
      errors.plateNumber = "Plate Number already exists";
    }

    if (chassisNo && !isFieldUnique("chassisNo", chassisNo)) {
      errors.chassisNo = "Chassis Number already exists";
    }

    if (mvFileNo && !isFieldUnique("mvFileNo", mvFileNo)) {
      errors.mvFileNo = "MV File Number already exists";
    }

    // Driver Name validation
    if (driverName && !drivers.some((driver) => getDriverFullName(driver) === driverName)) {
      errors.driverName = "Selected driver does not exist in the records.";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    // Validate all fields before submission
    const errors = {};
    Object.keys(formData).forEach(key => {
      validateField(key, formData[key]);
    });

    if (Object.keys(validationErrors).some(key => validationErrors[key])) {
      return; // Don't submit if there are any validation errors
    }

    try {
      setIsSaving(true);
      // Format the data before sending
      const formattedData = {
        mvFileNo: formData.mvFileNo || "",
        plateNumber: formData.plateNumber,
        stubNumber: formData.stubNumber || "",
        engineNo: formData.engineNo || "",
        chassisNo: formData.chassisNo || "",
        classification: formData.classification || "",
        pistonDisplacement: formData.pistonDisplacement || "",
        fuel: formData.fuel || "",
        make: formData.make || "",
        series: formData.series || "",
        bodyType: formData.bodyType || "",
        yearModel: formData.yearModel || "",
        grossWeight: formData.grossWeight || "",
        netWeight: formData.netWeight || "",
        shippingWeight: formData.shippingWeight || "",
        netCapacity: formData.netCapacity || "",
        cbm: formData.cbm || "",
        ownerName: formData.ownerName || "",
        ownerAddress: formData.ownerAddress || "",
        contactDetails: formData.contactDetails || "",
        encumberedTo: formData.encumberedTo || "",
        driverName: formData.driverName || "",
        designation: formData.designation || "",
        status: formData.status || "",
        dueDate: formData.dueDate ? new Date(formData.dueDate) : null,
      };

      let response;
      if (currentTruck) {
        // Update existing truck
        response = await axios.put(
          process.env.NEXT_PUBLIC_BACKEND_API +
            `/api/trucks/${currentTruck._id}`,
          formattedData
        );
      } else {
        // Add new truck
        response = await axios.post(
          process.env.NEXT_PUBLIC_BACKEND_API + "/api/trucks",
          formattedData
        );
      }

      // Handle success
      toast({
        title: "Success",
        description: currentTruck
          ? "Vehicle updated successfully!"
          : "Vehicle and related records added successfully!",
        status: "success",
        duration: 3000,
        isClosable: true,
        position: "top-right",
      });

      fetchTrucks();
      closeAndResetForm();
    } catch (error) {
      console.error("Error submitting vehicle:", error);
      console.error("Error details:", error.response?.data);
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        "Failed to save vehicle. Please check your input and try again.";
      toast({
        title: "Error",
        description: errorMessage,
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "top-right",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (truck) => {
    setCurrentTruck(truck);
    setFormData({
      ...truck,
      dueDate: truck.dueDate
        ? new Date(truck.dueDate).toISOString().split("T")[0]
        : "",
    });
    setIsAdding(false);
    onOpen();
  };

  const handleDelete = (truck) => {
    setTruckToDelete(truck);
    onDeleteOpen();
  };

  const confirmDelete = async () => {
    if (!truckToDelete) return;
    setIsDeleting(true);
    const token = localStorage.getItem('token');

    try {
      if (!token) {
        toast({ 
          title: "Error", 
          description: "Authentication failed. Please log in.", 
          status: "error", 
          duration: 3000 
        });
        onDeleteClose();
        return;
      }
      
      await axios.delete(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/trucks/${truckToDelete._id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      setTrucks(prev => prev.filter(t => t._id !== truckToDelete._id));
      onDeleteClose();
      setTruckToDelete(null);
      
      toast({
        title: "Success",
        description: `Truck ${truckToDelete.plateNumber} deleted successfully and logged`,
        status: "success",
        duration: 3000,
        isClosable: true,
        position: "top-right"
      });
      
    } catch (error) {
      console.error('Error deleting truck:', error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to delete truck",
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "top-right"
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const closeAndResetForm = () => {
    setCurrentTruck(null);
    setFormData({
      mvFileNo: "",
      plateNumber: "",
      stubNumber: "",
      engineNo: "",
      chassisNo: "",
      classification: "",
      pistonDisplacement: "",
      fuel: "",
      make: "",
      series: "",
      bodyType: "",
      yearModel: "",
      grossWeight: "",
      netWeight: "",
      shippingWeight: "",
      netCapacity: "",
      cbm: "",
      ownerName: "",
      ownerAddress: "",
      contactDetails: "",
      encumberedTo: "",
      driverName: "",
      designation: "",
      status: "",
      dueDate: "",
    });
    setIsSaving(false);
    onClose();
  };

  const handleAdd = () => {
    setIsAdding(true);
    resetForm();
    onOpen();
  };

  const resetForm = () => {
    setFormData({
      mvFileNo: "",
      plateNumber: "",
      stubNumber: "",
      engineNo: "",
      chassisNo: "",
      classification: "",
      pistonDisplacement: "",
      fuel: "",
      make: "",
      series: "",
      bodyType: "",
      yearModel: "",
      grossWeight: "",
      netWeight: "",
      shippingWeight: "",
      netCapacity: "",
      cbm: "",
      ownerName: "",
      ownerAddress: "",
      contactDetails: "",
      encumberedTo: "",
      driverName: "",
      designation: "",
      status: "",
      dueDate: "",
    });
  };

  const formatDate = (date) => {
    if (!date) return "";
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Modify the filteredTrucks logic
  const filteredTrucks = searchTerm
    ? allTrucks.filter((truck) => {
        const truckDetails = `${truck.plateNumber} ${truck.stubNumber || ""} ${
          truck.ownerName
        } ${truck.make}`.toLowerCase();
        return truckDetails.includes(searchTerm.toLowerCase());
      })
    : trucks;

  // Add this new function to handle pagination of filtered results
  const getPaginatedResults = () => {
    if (!searchTerm) return trucks;
    
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredTrucks.slice(startIndex, endIndex);
  };

  // Update the useEffect to handle search term changes
  useEffect(() => {
    if (searchTerm) {
      setCurrentPage(1); // Reset to first page when searching
      const filteredCount = filteredTrucks.length;
      setTotalPages(Math.ceil(filteredCount / itemsPerPage));
    } else {
      fetchTrucks();
    }
  }, [searchTerm]);

  const handleDriverInputChange = (e) => {
    setFormData({ ...formData, driverName: e.target.value });
  };

  // Add session expiration handling
  const handleSessionExpired = () => {
    onSessionExpiredModalOpen();
  };

  const handleSignOut = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/";
  };

  return (
    <Box>
      {/* Header Section with Stats */}
      <Box>
        {/* Main Content */}
        <Box>
          {/* Search Bar */}
          <Flex
            p={4}
            borderBottomWidth="1px"
            justify="space-between"
            align="center"
          >
            <InputGroup maxW="md">
              <InputLeftElement pointerEvents="none">
                <Search2Icon color="gray.400" />
              </InputLeftElement>
              <Input
                placeholder="Search vehicles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                borderColor="#1a365d"
                _focus={{
                  borderColor: "#800020",
                  boxShadow: "0 0 0 1px #800020",
                }}
              />
            </InputGroup>
            <Flex justify="flex-end" align="center" mb={6}>
              {/* Column visibility toggle */}
              <Popover placement="bottom-end">
                <PopoverTrigger>
                  <IconButton
                    icon={<SettingsIcon />}
                    variant="ghost"
                    colorScheme="blue"
                    aria-label="Column settings"
                    mr={3}
                  />
                </PopoverTrigger>
                <PopoverContent width="250px">
                  <PopoverArrow />
                  <PopoverCloseButton />
                  <PopoverHeader fontWeight="semibold">
                    Show/Hide Columns
                  </PopoverHeader>
                  <PopoverBody>
                    <VStack align="start" spacing={2}>
                      <Checkbox
                        isChecked={visibleColumns.plateNumber}
                        onChange={(e) =>
                          setVisibleColumns({
                            ...visibleColumns,
                            plateNumber: e.target.checked,
                          })
                        }
                      >
                        Plate Number
                      </Checkbox>
                      <Checkbox
                        isChecked={visibleColumns.stubNumber}
                        onChange={(e) =>
                          setVisibleColumns({
                            ...visibleColumns,
                            stubNumber: e.target.checked,
                          })
                        }
                      >
                        Stub Number
                      </Checkbox>
                      <Checkbox
                        isChecked={visibleColumns.make}
                        onChange={(e) =>
                          setVisibleColumns({
                            ...visibleColumns,
                            make: e.target.checked,
                          })
                        }
                      >
                        Make
                      </Checkbox>
                      <Checkbox
                        isChecked={visibleColumns.yearModel}
                        onChange={(e) =>
                          setVisibleColumns({
                            ...visibleColumns,
                            yearModel: e.target.checked,
                          })
                        }
                      >
                        Model Year
                      </Checkbox>
                      <Checkbox
                        isChecked={visibleColumns.bodyType}
                        onChange={(e) =>
                          setVisibleColumns({
                            ...visibleColumns,
                            bodyType: e.target.checked,
                          })
                        }
                      >
                        Body Type
                      </Checkbox>
                      <Checkbox
                        isChecked={visibleColumns.ownerName}
                        onChange={(e) =>
                          setVisibleColumns({
                            ...visibleColumns,
                            ownerName: e.target.checked,
                          })
                        }
                      >
                        Owner Name
                      </Checkbox>
                      <Checkbox
                        isChecked={visibleColumns.driverName}
                        onChange={(e) =>
                          setVisibleColumns({
                            ...visibleColumns,
                            driverName: e.target.checked,
                          })
                        }
                      >
                        Driver Name
                      </Checkbox>
                      <Checkbox
                        isChecked={visibleColumns.status}
                        onChange={(e) =>
                          setVisibleColumns({
                            ...visibleColumns,
                            status: e.target.checked,
                          })
                        }
                      >
                        Status
                      </Checkbox>
                    </VStack>
                  </PopoverBody>
                </PopoverContent>
              </Popover>
              <Button
                onClick={handleAdd}
                bgGradient="linear(to-r, #1A5276, #21618C)"
                color="white"
                _hover={{
                  bgGradient: "linear(to-r, #1A5276, #21618C)",
                  opacity: 0.9,
                }}
                leftIcon={<AddIcon />}
                size="md"
              >
                Add Vehicle
              </Button>
            </Flex>
          </Flex>

          {/* Table */}
          <TableContainer>
            <Table variant="simple">
              <Thead bg="gray.200">
                <Tr>
                  {[
                    { id: "plateNumber", label: "Plate Number" },
                    { id: "stubNumber", label: "Assigned Stub Number" },
                    { id: "make", label: "Make" },
                    { id: "yearModel", label: "Model Year" },
                    { id: "bodyType", label: "Body Type" },
                    { id: "ownerName", label: "Owner Name" },
                    { id: "driverName", label: "Driver Name" },
                    { id: "status", label: "Status" },
                    { id: "actions", label: "Actions" },
                  ].map((header) =>
                    visibleColumns[header.id] || header.id === "actions" ? (
                      <Th
                        key={header.id}
                        color="black"
                        py={4}
                        textAlign={header.id === "actions" ? "center" : "left"}
                      >
                        {header.label}
                      </Th>
                    ) : null
                  )}
                </Tr>
              </Thead>
              <Tbody>
                {getPaginatedResults().map((truck) => (
                  <Tr
                    key={truck._id}
                    _hover={{ bg: "gray.50" }}
                    transition="all 0.2s"
                  >
                    {visibleColumns.plateNumber && (
                      <Td fontWeight="medium">{truck.plateNumber}</Td>
                    )}
                    {visibleColumns.stubNumber && (
                      <Td>{truck.stubNumber || "-"}</Td>
                    )}
                    {visibleColumns.make && <Td>{truck.make}</Td>}
                    {visibleColumns.yearModel && <Td>{truck.yearModel}</Td>}
                    {visibleColumns.bodyType && <Td>{truck.bodyType}</Td>}
                    {visibleColumns.ownerName && <Td>{truck.ownerName}</Td>}
                    {visibleColumns.driverName && (
                      <Td>{truck.driverName || "-"}</Td>
                    )}
                    {visibleColumns.status && (
                      <Td>
                        <Badge
                          colorScheme={
                            truck.status === "Active"
                              ? "green"
                              : truck.status === "Under Maintenance"
                                ? "yellow"
                                : "blue"
                          }
                          px={2}
                          py={1}
                          borderRadius="full"
                        >
                          {truck.status}
                        </Badge>
                      </Td>
                    )}
                    <Td>
                      <HStack spacing={2} justify="center">
                        <IconButton
                          icon={<ViewIcon />}
                          onClick={() => setCurrentTruck(truck)}
                          size="sm"
                          colorScheme="blue"
                          variant="ghost"
                          aria-label="View vehicle"
                        />
                        <IconButton
                          icon={<EditIcon />}
                          onClick={() => handleEdit(truck)}
                          size="sm"
                          colorScheme="blue"
                          variant="ghost"
                          aria-label="Edit vehicle"
                        />
                        <IconButton
                          icon={<DeleteIcon />}
                          onClick={() => handleDelete(truck)} // Pass the whole truck object
                          size="sm"
                          colorScheme="red"
                          variant="ghost"
                          aria-label="Delete vehicle"
                        />
                      </HStack>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </TableContainer>

          {/* Pagination */}
          <Flex justify="center" p={4} borderTopWidth="1px">
            <HStack>
              <Button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                isDisabled={currentPage === 1}
                leftIcon={<ChevronLeftIcon />}
                color="#1a365d"
                variant="outline"
              >
                Previous
              </Button>
              <Text px={4}>
                Page {currentPage} of {totalPages}
              </Text>
              <Button
                onClick={() =>
                  setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                }
                isDisabled={currentPage === totalPages}
                rightIcon={<ChevronRightIcon />}
                color="#1a365d"
                variant="outline"
              >
                Next
              </Button>
            </HStack>
          </Flex>
        </Box>

        {/* View Modal */}
        <Modal
          isOpen={!!currentTruck}
          onClose={() => setCurrentTruck(null)}
          size="xl"
        >
          <ModalOverlay />
          <ModalContent maxW="900px">
            <ModalHeader bg="#1a365d" color="white" borderTopRadius="xl">
              Vehicle Details
            </ModalHeader>
            <ModalCloseButton color="white" />
            <ModalBody py={6}>
              {currentTruck && (
                <Box>
                  {/* Vehicle Identification Section */}
                  <Box
                    mb={6}
                    p={4}
                    bg="white"
                    borderRadius="md"
                    boxShadow="sm"
                    border="1px solid"
                    borderColor="gray.200"
                  >
                    <Text
                      fontWeight="bold"
                      fontSize="lg"
                      mb={3}
                      pb={2}
                      borderBottom="2px solid"
                      borderColor="blue.500"
                      color="blue.700"
                      display="inline-block"
                    >
                      Vehicle Identification
                    </Text>
                    <Grid templateColumns="repeat(2, 1fr)" gap={6} mt={4}>
                      <Box>
                        <Text
                          fontWeight="semibold"
                          color="gray.600"
                          fontSize="sm"
                        >
                          Plate Number
                        </Text>
                        <Text fontSize="md" mt={1} fontWeight="medium">
                          {currentTruck.plateNumber}
                        </Text>
                      </Box>
                      <Box>
                        <Text
                          fontWeight="semibold"
                          color="gray.600"
                          fontSize="sm"
                        >
                          Stub Number
                        </Text>
                        <Text fontSize="md" mt={1}>
                          {currentTruck.stubNumber || "-"}
                        </Text>
                      </Box>
                      <Box>
                        <Text
                          fontWeight="semibold"
                          color="gray.600"
                          fontSize="sm"
                        >
                          MV File No.
                        </Text>
                        <Text fontSize="md" mt={1}>
                          {currentTruck.mvFileNo || "-"}
                        </Text>
                      </Box>
                    </Grid>
                  </Box>

                  {/* Vehicle Details Section */}
                  <Box
                    mb={6}
                    p={4}
                    bg="white"
                    borderRadius="md"
                    boxShadow="sm"
                    border="1px solid"
                    borderColor="gray.200"
                  >
                    <Text
                      fontWeight="bold"
                      fontSize="lg"
                      mb={3}
                      pb={2}
                      borderBottom="2px solid"
                      borderColor="blue.500"
                      color="blue.700"
                      display="inline-block"
                    >
                      Vehicle Details
                    </Text>
                    <Grid templateColumns="repeat(2, 1fr)" gap={6} mt={4}>
                      <Box>
                        <Text fontWeight="semibold" color="gray.600" fontSize="sm">Make</Text>
                        <Text fontSize="md" mt={1}>{currentTruck.make || "-"}</Text>
                      </Box>
                      <Box>
                        <Text fontWeight="semibold" color="gray.600" fontSize="sm">Series</Text>
                        <Text fontSize="md" mt={1}>{currentTruck.series || "-"}</Text>
                      </Box>
                      <Box>
                        <Text fontWeight="semibold" color="gray.600" fontSize="sm">Body Type</Text>
                        <Text fontSize="md" mt={1}>{currentTruck.bodyType || "-"}</Text>
                      </Box>
                      <Box>
                        <Text fontWeight="semibold" color="gray.600" fontSize="sm">Classification</Text>
                        <Text fontSize="md" mt={1}>{currentTruck.classification || "-"}</Text>
                      </Box>
                      <Box>
                        <Text fontWeight="semibold" color="gray.600" fontSize="sm">Year Model</Text>
                        <Text fontSize="md" mt={1}>{currentTruck.yearModel || "-"}</Text>
                      </Box>
                      <Box>
                        <Text fontWeight="semibold" color="gray.600" fontSize="sm">Engine No.</Text>
                        <Text fontSize="md" mt={1}>{currentTruck.engineNo || "-"}</Text>
                      </Box>
                      <Box>
                        <Text fontWeight="semibold" color="gray.600" fontSize="sm">Chassis No.</Text>
                        <Text fontSize="md" mt={1}>{currentTruck.chassisNo || "-"}</Text>
                      </Box>
                      <Box>
                        <Text fontWeight="semibold" color="gray.600" fontSize="sm">Piston Displacement</Text>
                        <Text fontSize="md" mt={1}>{currentTruck.pistonDisplacement || "-"}</Text>
                      </Box>
                      <Box>
                        <Text fontWeight="semibold" color="gray.600" fontSize="sm">Fuel</Text>
                        <Text fontSize="md" mt={1}>{currentTruck.fuel || "-"}</Text>
                      </Box>
                    </Grid>
                  </Box>

                  {/* Weight Information Section */}
                  <Box
                    mb={6}
                    p={4}
                    bg="white"
                    borderRadius="md"
                    boxShadow="sm"
                    border="1px solid"
                    borderColor="gray.200"
                  >
                    <Text
                      fontWeight="bold"
                      fontSize="lg"
                      mb={3}
                      pb={2}
                      borderBottom="2px solid"
                      borderColor="blue.500"
                      color="blue.700"
                      display="inline-block"
                    >
                      Weight Information
                    </Text>
                    <Grid templateColumns="repeat(2, 1fr)" gap={6} mt={4}>
                      <Box>
                        <Text
                          fontWeight="semibold"
                          color="gray.600"
                          fontSize="sm"
                        >
                          Gross Weight
                        </Text>
                        <Text fontSize="md" mt={1}>
                          {currentTruck.grossWeight || "-"}
                        </Text>
                      </Box>
                      <Box>
                        <Text
                          fontWeight="semibold"
                          color="gray.600"
                          fontSize="sm"
                        >
                          Net Weight
                        </Text>
                        <Text fontSize="md" mt={1}>
                          {currentTruck.netWeight || "-"}
                        </Text>
                      </Box>
                      <Box>
                        <Text
                          fontWeight="semibold"
                          color="gray.600"
                          fontSize="sm"
                        >
                          Shipping Weight
                        </Text>
                        <Text fontSize="md" mt={1}>
                          {currentTruck.shippingWeight || "-"}
                        </Text>
                      </Box>
                    </Grid>
                  </Box>

                  {/* Owner Information Section */}
                  <Box
                    mb={6}
                    p={4}
                    bg="white"
                    borderRadius="md"
                    boxShadow="sm"
                    border="1px solid"
                    borderColor="gray.200"
                  >
                    <Text
                      fontWeight="bold"
                      fontSize="lg"
                      mb={3}
                      pb={2}
                      borderBottom="2px solid"
                      borderColor="blue.500"
                      color="blue.700"
                      display="inline-block"
                    >
                      Owner Information
                    </Text>
                    <Grid templateColumns="repeat(2, 1fr)" gap={6} mt={4}>
                      <Box>
                        <Text fontWeight="semibold" color="gray.600" fontSize="sm">Owner Name</Text>
                        <Text fontSize="md" mt={1}>{currentTruck.ownerName || "-"}</Text>
                      </Box>
                      <Box>
                        <Text fontWeight="semibold" color="gray.600" fontSize="sm">Owner Address</Text>
                        <Text fontSize="md" mt={1}>{currentTruck.ownerAddress || "-"}</Text>
                      </Box>
                      <Box>
                        <Text fontWeight="semibold" color="gray.600" fontSize="sm">Contact Details</Text>
                        <Text fontSize="md" mt={1}>{currentTruck.contactDetails || "-"}</Text>
                      </Box>
                      <Box>
                        <Text fontWeight="semibold" color="gray.600" fontSize="sm">Encumbered To</Text>
                        <Text fontSize="md" mt={1}>{currentTruck.encumberedTo || "-"}</Text>
                      </Box>
                    </Grid>
                  </Box>

                  {/* Operations Information Section - In View Modal */}
                  <Box
                    mb={6}
                    p={4}
                    bg="white"
                    borderRadius="md"
                    boxShadow="sm"
                    border="1px solid"
                    borderColor="gray.200"
                  >
                    <Text
                      fontWeight="bold"
                      fontSize="lg"
                      mb={3}
                      pb={2}
                      borderBottom="2px solid"
                      borderColor="blue.500"
                      color="blue.700"
                      display="inline-block"
                    >
                      Operations Information
                    </Text>
                    <Grid templateColumns="repeat(2, 1fr)" gap={6} mt={4}>
                      <Box>
                        <Text fontWeight="semibold" color="gray.600" fontSize="sm">Driver Name</Text>
                        <Text fontSize="md" mt={1}>{currentTruck.driverName || "-"}</Text>
                      </Box>
                      <Box>
                        <Text fontWeight="semibold" color="gray.600" fontSize="sm">Status</Text>
                        <Text fontSize="md" mt={1}>{currentTruck.status || "-"}</Text>
                      </Box>
                      <Box>
                        <Text fontWeight="semibold" color="gray.600" fontSize="sm">Designation</Text>
                        <Text fontSize="md" mt={1}>{currentTruck.designation || "-"}</Text>
                      </Box>
                      <Box gridColumn="span 2">
                        <Text fontWeight="semibold" color="gray.600" fontSize="sm">Estimated Registration Due Date</Text>
                        <Text fontSize="md" mt={1}>{currentTruck.dueDate ? new Date(currentTruck.dueDate).toLocaleDateString() : "-"}</Text>
                      </Box>
                    </Grid>
                  </Box>
                </Box>
              )}
            </ModalBody>
            <ModalFooter borderTopWidth="2px" borderColor="#800020">
              <Button
                variant="outline"
                color="#800020"
                borderColor="#800020"
                onClick={() => setCurrentTruck(null)}
              >
                Close
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        {/* Add/Edit Modal */}
        <Modal isOpen={isOpen} onClose={closeAndResetForm} size="xl">
          <ModalOverlay />
          <ModalContent maxW="900px">
            <ModalHeader bg="#1a365d" color="white" borderTopRadius="xl">
              {isAdding ? "Add New Vehicle" : "Edit Vehicle"}
            </ModalHeader>
            <ModalCloseButton color="white" />
            <ModalBody py={6}>
              {/* Vehicle Identification Section */}
              <Box
                mb={6}
                p={4}
                bg="white"
                borderRadius="md"
                boxShadow="sm"
                border="1px solid"
                borderColor="gray.200"
              >
                <Text
                  fontWeight="bold"
                  fontSize="lg"
                  mb={3}
                  pb={2}
                  borderBottom="2px solid"
                  borderColor="blue.500"
                  color="blue.700"
                  display="inline-block"
                >
                  Vehicle Identification
                </Text>
                <Grid templateColumns="repeat(2, 1fr)" gap={6} mt={4}>
                  <FormControl isInvalid={validationErrors.plateNumber}>
                    <FormLabel
                      fontWeight="medium"
                      color="gray.600"
                      fontSize="sm"
                    >
                      Plate Number *
                    </FormLabel>
                    <Input
                      name="plateNumber"
                      value={formData.plateNumber}
                      onChange={handleChange}
                      required
                      size="md"
                      height="40px"
                      borderColor={
                        validationErrors.plateNumber ? "red.300" : "gray.300"
                      }
                      _hover={{
                        borderColor: validationErrors.plateNumber
                          ? "red.400"
                          : "blue.300",
                      }}
                      _focus={{
                        borderColor: validationErrors.plateNumber
                          ? "red.500"
                          : "blue.500",
                        boxShadow: validationErrors.plateNumber
                          ? "0 0 0 1px red.500"
                          : "0 0 0 1px blue.500",
                      }}
                    />
                    {validationErrors.plateNumber && (
                      <Text color="red.500" fontSize="sm" mt={1}>
                        {validationErrors.plateNumber}
                      </Text>
                    )}
                  </FormControl>
                  <FormControl isInvalid={validationErrors.mvFileNo}>
                    <FormLabel
                      fontWeight="medium"
                      color="gray.600"
                      fontSize="sm"
                    >
                      MV File No.
                    </FormLabel>
                    <Input
                      name="mvFileNo"
                      value={formData.mvFileNo}
                      onChange={handleChange}
                      size="md"
                      height="40px"
                      borderColor={
                        validationErrors.mvFileNo ? "red.300" : "gray.300"
                      }
                      _hover={{
                        borderColor: validationErrors.mvFileNo
                          ? "red.400"
                          : "blue.300",
                      }}
                      _focus={{
                        borderColor: validationErrors.mvFileNo
                          ? "red.500"
                          : "blue.500",
                        boxShadow: validationErrors.mvFileNo
                          ? "0 0 0 1px red.500"
                          : "0 0 0 1px blue.500",
                      }}
                    />
                    {validationErrors.mvFileNo && (
                      <Text color="red.500" fontSize="sm" mt={1}>
                        {validationErrors.mvFileNo}
                      </Text>
                    )}
                  </FormControl>

                  {/* Assigned Stubs Section - ADDING HERE */}
                  <FormControl gridColumn="span 2">
                    <FormLabel
                      fontWeight="medium"
                      color="gray.600"
                      fontSize="sm"
                    >
                      Assigned Stub Number
                    </FormLabel>
                    {formData.stubNumber ? (
                      <Box>
                        <Flex wrap="wrap" gap={2} mb={2}>
                          {formData.stubNumber.split("/").map((stub, index) => (
                            <Badge
                              key={index}
                              colorScheme="blue"
                              fontSize="0.9em"
                              borderRadius="full"
                              px={3}
                              py={1}
                              display="flex"
                              alignItems="center"
                            >
                              {stub}
                              <IconButton
                                ml={1}
                                size="xs"
                                icon={<CloseIcon fontSize="0.7em" />}
                                variant="ghost"
                                colorScheme="blue"
                                aria-label="Remove stub"
                                onClick={() => {
                                  // Remove the stub and update the stubNumber
                                  const stubs = formData.stubNumber.split("/");
                                  const updatedStubs = stubs.filter(
                                    (_, i) => i !== index
                                  );
                                  const newStubNumber =
                                    updatedStubs.length > 0
                                      ? updatedStubs.join("/")
                                      : "";

                                  setFormData((prev) => ({
                                    ...prev,
                                    stubNumber: newStubNumber,
                                  }));
                                }}
                              />
                            </Badge>
                          ))}
                        </Flex>
                        {formData.stubNumber.split("/").length === 0 && (
                          <Text color="gray.500" fontSize="sm">
                            No stubs assigned
                          </Text>
                        )}
                      </Box>
                    ) : (
                      <Text color="gray.500" fontSize="sm">
                        No stubs assigned
                      </Text>
                    )}
                  </FormControl>
                </Grid>
              </Box>

              {/* Vehicle Details Section */}
              <Box
                mb={6}
                p={4}
                bg="white"
                borderRadius="md"
                boxShadow="sm"
                border="1px solid"
                borderColor="gray.200"
              >
                <Text
                  fontWeight="bold"
                  fontSize="lg"
                  mb={3}
                  pb={2}
                  borderBottom="2px solid"
                  borderColor="blue.500"
                  color="blue.700"
                  display="inline-block"
                >
                  Vehicle Details
                </Text>
                <Grid templateColumns="repeat(2, 1fr)" gap={6} mt={4}>
                  <FormControl isInvalid={validationErrors.make}>
                    <FormLabel fontWeight="medium" color="gray.600" fontSize="sm">Make *</FormLabel>
                    <Input name="make" value={formData.make} onChange={handleChange} required size="md" height="40px" borderColor={validationErrors.make ? "red.300" : "gray.300"} _hover={{ borderColor: validationErrors.make ? "red.400" : "blue.300" }} _focus={{ borderColor: validationErrors.make ? "red.500" : "blue.500", boxShadow: validationErrors.make ? "0 0 0 1px red.500" : "0 0 0 1px blue.500" }} />
                    {validationErrors.make && (<Text color="red.500" fontSize="sm" mt={1}>{validationErrors.make}</Text>)}
                  </FormControl>
                  <FormControl>
                    <FormLabel fontWeight="medium" color="gray.600" fontSize="sm">Series</FormLabel>
                    <Input name="series" value={formData.series} onChange={handleChange} size="md" height="40px" borderColor="gray.300" _hover={{ borderColor: "blue.300" }} _focus={{ borderColor: "blue.500", boxShadow: "0 0 0 1px blue.500" }} />
                  </FormControl>
                  <FormControl>
                    <FormLabel fontWeight="medium" color="gray.600" fontSize="sm">Body Type</FormLabel>
                    <Select name="bodyType" value={formData.bodyType} onChange={handleChange} size="md" height="40px" borderColor="gray.300" _hover={{ borderColor: "blue.300" }} _focus={{ borderColor: "blue.500", boxShadow: "0 0 0 1px blue.500" }}>
                      <option value="">Select Body Type...</option>
                      <option value="10 Wheeler">10 Wheeler</option>
                      <option value="6 Wheeler">6 Wheeler</option>
                    </Select>
                  </FormControl>
                  <FormControl>
                    <FormLabel fontWeight="medium" color="gray.600" fontSize="sm">Classification</FormLabel>
                    <Input name="classification" value={formData.classification} onChange={handleChange} size="md" height="40px" borderColor="gray.300" _hover={{ borderColor: "blue.300" }} _focus={{ borderColor: "blue.500", boxShadow: "0 0 0 1px blue.500" }} />
                  </FormControl>
                  <FormControl isInvalid={validationErrors.yearModel}>
                    <FormLabel fontWeight="medium" color="gray.600" fontSize="sm">Year Model *</FormLabel>
                    <Input name="yearModel" value={formData.yearModel} onChange={handleChange} required size="md" height="40px" borderColor={validationErrors.yearModel ? "red.300" : "gray.300"} _hover={{ borderColor: validationErrors.yearModel ? "red.400" : "blue.300" }} _focus={{ borderColor: validationErrors.yearModel ? "red.500" : "blue.500", boxShadow: validationErrors.yearModel ? "0 0 0 1px red.500" : "0 0 0 1px blue.500" }} />
                    {validationErrors.yearModel && (<Text color="red.500" fontSize="sm" mt={1}>{validationErrors.yearModel}</Text>)}
                  </FormControl>
                  <FormControl isInvalid={validationErrors.engineNo}>
                    <FormLabel fontWeight="medium" color="gray.600" fontSize="sm">Engine No.</FormLabel>
                    <Input name="engineNo" value={formData.engineNo} onChange={handleChange} size="md" height="40px" borderColor={validationErrors.engineNo ? "red.300" : "gray.300"} _hover={{ borderColor: validationErrors.engineNo ? "red.400" : "blue.300" }} _focus={{ borderColor: validationErrors.engineNo ? "red.500" : "blue.500", boxShadow: validationErrors.engineNo ? "0 0 0 1px red.500" : "0 0 0 1px blue.500" }} />
                    {validationErrors.engineNo && (<Text color="red.500" fontSize="sm" mt={1}>{validationErrors.engineNo}</Text>)}
                  </FormControl>
                  <FormControl isInvalid={validationErrors.chassisNo}>
                    <FormLabel fontWeight="medium" color="gray.600" fontSize="sm">Chassis No.</FormLabel>
                    <Input name="chassisNo" value={formData.chassisNo} onChange={handleChange} size="md" height="40px" borderColor={validationErrors.chassisNo ? "red.300" : "gray.300"} _hover={{ borderColor: validationErrors.chassisNo ? "red.400" : "blue.300" }} _focus={{ borderColor: validationErrors.chassisNo ? "red.500" : "blue.500", boxShadow: validationErrors.chassisNo ? "0 0 0 1px red.500" : "0 0 0 1px blue.500" }} />
                    {validationErrors.chassisNo && (<Text color="red.500" fontSize="sm" mt={1}>{validationErrors.chassisNo}</Text>)}
                  </FormControl>
                  <FormControl>
                    <FormLabel fontWeight="medium" color="gray.600" fontSize="sm">Piston Displacement</FormLabel>
                    <Input name="pistonDisplacement" value={formData.pistonDisplacement} onChange={handleChange} size="md" height="40px" borderColor="gray.300" _hover={{ borderColor: "blue.300" }} _focus={{ borderColor: "blue.500", boxShadow: "0 0 0 1px blue.500" }} />
                  </FormControl>
                  <FormControl>
                    <FormLabel fontWeight="medium" color="gray.600" fontSize="sm">Fuel</FormLabel>
                    <Select name="fuel" value={formData.fuel} onChange={handleChange} size="md" height="40px" borderColor="gray.300" _hover={{ borderColor: "blue.300" }} _focus={{ borderColor: "blue.500", boxShadow: "0 0 0 1px blue.500" }}>
                      <option value="">Select Fuel Type...</option>
                      <option value="GAS">GAS</option>
                      <option value="DIESEL">DIESEL</option>
                    </Select>
                  </FormControl>
                </Grid>
              </Box>

              {/* Weight Information Section */}
              <Box
                mb={6}
                p={4}
                bg="white"
                borderRadius="md"
                boxShadow="sm"
                border="1px solid"
                borderColor="gray.200"
              >
                <Text
                  fontWeight="bold"
                  fontSize="lg"
                  mb={3}
                  pb={2}
                  borderBottom="2px solid"
                  borderColor="blue.500"
                  color="blue.700"
                  display="inline-block"
                >
                  Weight Information
                </Text>
                <Grid templateColumns="repeat(2, 1fr)" gap={6} mt={4}>
                  <FormControl>
                    <FormLabel
                      fontWeight="medium"
                      color="gray.600"
                      fontSize="sm"
                    >
                      Gross Weight
                    </FormLabel>
                    <Input
                      name="grossWeight"
                      value={formData.grossWeight}
                      onChange={handleChange}
                      size="md"
                      height="40px"
                      borderColor="gray.300"
                      _hover={{ borderColor: "blue.300" }}
                      _focus={{
                        borderColor: "blue.500",
                        boxShadow: "0 0 0 1px blue.500",
                      }}
                    />
                  </FormControl>
                  <FormControl>
                    <FormLabel
                      fontWeight="medium"
                      color="gray.600"
                      fontSize="sm"
                    >
                      Net Weight
                    </FormLabel>
                    <Input
                      name="netWeight"
                      value={formData.netWeight}
                      onChange={handleChange}
                      size="md"
                      height="40px"
                      borderColor="gray.300"
                      _hover={{ borderColor: "blue.300" }}
                      _focus={{
                        borderColor: "blue.500",
                        boxShadow: "0 0 0 1px blue.500",
                      }}
                    />
                  </FormControl>
                  <FormControl>
                    <FormLabel
                      fontWeight="medium"
                      color="gray.600"
                      fontSize="sm"
                    >
                      Shipping Weight
                    </FormLabel>
                    <Input
                      name="shippingWeight"
                      value={formData.shippingWeight}
                      onChange={handleChange}
                      size="md"
                      height="40px"
                      borderColor="gray.300"
                      _hover={{ borderColor: "blue.300" }}
                      _focus={{
                        borderColor: "blue.500",
                        boxShadow: "0 0 0 1px blue.500",
                      }}
                    />
                  </FormControl>
                </Grid>
              </Box>

              {/* Owner Information Section */}
              <Box
                mb={6}
                p={4}
                bg="white"
                borderRadius="md"
                boxShadow="sm"
                border="1px solid"
                borderColor="gray.200"
              >
                <Text
                  fontWeight="bold"
                  fontSize="lg"
                  mb={3}
                  pb={2}
                  borderBottom="2px solid"
                  borderColor="blue.500"
                  color="blue.700"
                  display="inline-block"
                >
                  Owner Information
                </Text>
                <Grid templateColumns="repeat(2, 1fr)" gap={6} mt={4}>
                  <FormControl isInvalid={validationErrors.ownerName}>
                    <FormLabel
                      fontWeight="medium"
                      color="gray.600"
                      fontSize="sm"
                    >
                      Owner Name *
                    </FormLabel>
                    <Input
                      name="ownerName"
                      value={formData.ownerName}
                      onChange={handleChange}
                      required
                      size="md"
                      height="40px"
                      borderColor={
                        validationErrors.ownerName ? "red.300" : "gray.300"
                      }
                      _hover={{
                        borderColor: validationErrors.ownerName
                          ? "red.400"
                          : "blue.300",
                      }}
                      _focus={{
                        borderColor: validationErrors.ownerName
                          ? "red.500"
                          : "blue.500",
                        boxShadow: validationErrors.ownerName
                          ? "0 0 0 1px red.500"
                          : "0 0 0 1px blue.500",
                      }}
                    />
                    {validationErrors.ownerName && (
                      <Text color="red.500" fontSize="sm" mt={1}>
                        {validationErrors.ownerName}
                      </Text>
                    )}
                  </FormControl>
                  <FormControl>
                    <FormLabel
                      fontWeight="medium"
                      color="gray.600"
                      fontSize="sm"
                    >
                      Owner Address
                    </FormLabel>
                    <Input
                      name="ownerAddress"
                      value={formData.ownerAddress}
                      onChange={handleChange}
                      size="md"
                      height="40px"
                      borderColor="gray.300"
                      _hover={{ borderColor: "blue.300" }}
                      _focus={{
                        borderColor: "blue.500",
                        boxShadow: "0 0 0 1px blue.500",
                      }}
                    />
                  </FormControl>
                  <FormControl>
                    <FormLabel
                      fontWeight="medium"
                      color="gray.600"
                      fontSize="sm"
                    >
                      Contact Details
                    </FormLabel>
                    <Input
                      name="contactDetails"
                      value={formData.contactDetails}
                      onChange={handleChange}
                      size="md"
                      height="40px"
                      borderColor="gray.300"
                      _hover={{ borderColor: "blue.300" }}
                      _focus={{
                        borderColor: "blue.500",
                        boxShadow: "0 0 0 1px blue.500",
                      }}
                    />
                  </FormControl>
                </Grid>
              </Box>

              {/* Operations Information Section - In Add/Edit Modal */}
              <Box
                mb={6}
                p={4}
                bg="white"
                borderRadius="md"
                boxShadow="sm"
                border="1px solid"
                borderColor="gray.200"
              >
                <Text
                  fontWeight="bold"
                  fontSize="lg"
                  mb={3}
                  pb={2}
                  borderBottom="2px solid"
                  borderColor="blue.500"
                  color="blue.700"
                  display="inline-block"
                >
                  Operations Information
                </Text>
                <Grid templateColumns="repeat(2, 1fr)" gap={6} mt={4}>
                  <FormControl>
                    <FormLabel
                      fontWeight="medium"
                      color="gray.600"
                      fontSize="sm"
                    >
                      Driver Name
                    </FormLabel>
                    <Select
                      name="driverName"
                      value={formData.driverName || ""}
                      onChange={handleChange}
                      size="md"
                      height="40px"
                      borderColor={
                        validationErrors.driverName ? "red.300" : "gray.300"
                      }
                      _hover={{
                        borderColor: validationErrors.driverName
                          ? "red.400"
                          : "blue.300",
                      }}
                      _focus={{
                        borderColor: validationErrors.driverName ? "red.500" : "blue.500",
                        boxShadow: validationErrors.driverName ? "0 0 0 1px red.500" : "0 0 0 1px blue.500",
                      }}
                    >
                      <option value="">Select Driver...</option>
                      {/* Display current driver as an option if it exists but isn't in the drivers list */}
                      {formData.driverName && 
                        !drivers.some(driver => getDriverFullName(driver) === formData.driverName) && (
                        <option key="current-driver" value={formData.driverName}>
                          {formData.driverName} (Current)
                        </option>
                      )}
                      {drivers.map((driver) => (
                        <option key={driver._id} value={getDriverFullName(driver)}>
                          {getDriverFullName(driver)}
                        </option>
                      ))}
                    </Select>
                    {validationErrors.driverName && (
                      <Text color="red.500" fontSize="sm" mt={1}>
                        {validationErrors.driverName}
                      </Text>
                    )}
                  </FormControl>
                  <FormControl isInvalid={validationErrors.status}>
                    <FormLabel
                      fontWeight="medium"
                      color="gray.600"
                      fontSize="sm"
                    >
                      Status *
                    </FormLabel>
                    <Select
                      name="status"
                      value={formData.status}
                      onChange={handleChange}
                      required
                      size="md"
                      height="40px"
                      borderColor={
                        validationErrors.status ? "red.300" : "gray.300"
                      }
                      _hover={{
                        borderColor: validationErrors.status
                          ? "red.400"
                          : "blue.300",
                      }}
                      _focus={{
                        borderColor: validationErrors.status
                          ? "red.500"
                          : "blue.500",
                        boxShadow: validationErrors.status
                          ? "0 0 0 1px red.500"
                          : "0 0 0 1px blue.500",
                      }}
                    >
                      <option value="">Select Status...</option>
                      <option value="Active">Active</option>
                      <option value="Under Maintenance">
                        Under Maintenance
                      </option>
                      <option value="On-Delivery">On-Delivery</option>
                    </Select>
                    {validationErrors.status && (
                      <Text color="red.500" fontSize="sm" mt={1}>
                        {validationErrors.status}
                      </Text>
                    )}
                  </FormControl>
                  <FormControl>
                    <FormLabel fontWeight="medium" color="gray.600" fontSize="sm">Designation</FormLabel>
                    <Select name="designation" value={formData.designation} onChange={handleChange} size="md" height="40px" borderColor="gray.300" _hover={{ borderColor: "blue.300" }} _focus={{ borderColor: "blue.500", boxShadow: "0 0 0 1px blue.500" }}>
                      <option value="">Select Designation...</option>
                      <option value="6 Wheel Manila">6 Wheel Manila</option>
                      <option value="6 Wheel Iloilo">6 Wheel Iloilo</option>
                      <option value="10 Wheel">10 Wheel</option>
                    </Select>
                  </FormControl>
                  <FormControl>
                    <FormLabel
                      fontWeight="medium"
                      color="gray.600"
                      fontSize="sm"
                    >
                      Estimated Registration Due Date
                    </FormLabel>
                    <Input
                      type="date"
                      name="dueDate"
                      value={
                        formData.dueDate
                          ? new Date(formData.dueDate)
                              .toISOString()
                              .split("T")[0]
                          : ""
                      }
                      onChange={handleChange}
                      isReadOnly
                      size="md"
                      height="40px"
                      borderColor="gray.300"
                      _hover={{ borderColor: "blue.300" }}
                      _focus={{
                        borderColor: "blue.500",
                        boxShadow: "0 0 0 1px blue.500",
                      }}
                    />
                  </FormControl>
                </Grid>
              </Box>
            </ModalBody>

            <ModalFooter borderTopWidth="2px" borderColor="#800020">
              <Button
                mr={3}
                onClick={handleSubmit}
                bg="#1a365d"
                color="white"
                _hover={{ bg: "#2a4365" }}
                isLoading={isSaving}
                loadingText={isAdding ? "Adding..." : "Updating..."}
              >
                {isAdding ? "Add Vehicle" : "Update Vehicle"}
              </Button>
              <Button
                variant="outline"
                color="#800020"
                borderColor="#800020"
                onClick={closeAndResetForm}
                isDisabled={isSaving}
              >
                Cancel
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        {/* Delete Confirmation Dialog */}
        <AlertDialog
          isOpen={isDeleteOpen}
          leastDestructiveRef={cancelRef}
          onClose={!isDeleting ? onDeleteClose : undefined}
          isCentered
        >
          <AlertDialogOverlay>
            <AlertDialogContent>
              <AlertDialogHeader fontSize="lg" fontWeight="bold">
                Delete Truck
              </AlertDialogHeader>

              <AlertDialogBody>
                Are you sure you want to delete Truck with Plate Number 
                "<strong>{truckToDelete?.plateNumber}</strong>"? 
                This action cannot be undone.
              </AlertDialogBody>

              <AlertDialogFooter>
                <Button 
                  ref={cancelRef} 
                  onClick={onDeleteClose} 
                  isDisabled={isDeleting}
                >
                  Cancel
                </Button>
                <Button 
                  colorScheme="red" 
                  onClick={confirmDelete} 
                  ml={3}
                  isLoading={isDeleting}
                  loadingText="Deleting..." 
                  isDisabled={isDeleting}
                >
                  Delete
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialogOverlay>
        </AlertDialog>
      </Box>

      {/* Session Expired Modal */}
      <Modal
        isOpen={isSessionExpiredModalOpen}
        onClose={() => {
          /* Prevent closing */
        }}
        isCentered
        closeOnOverlayClick={false}
        closeOnEsc={false}
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Session Expired</ModalHeader>
          <ModalBody>
            Your session has expired. Please log in again to continue.
          </ModalBody>
          <ModalFooter>
            <Button
              colorScheme="red"
              onClick={handleSignOut}
            >
              Log Out
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default TruckTable;
