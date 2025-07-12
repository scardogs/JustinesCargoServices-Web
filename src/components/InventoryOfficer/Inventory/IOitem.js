import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Button,
  Input,
  VStack,
  HStack,
  useToast,
  IconButton,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Select,
  useDisclosure,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Text,
  Flex,
  InputGroup,
  InputLeftElement,
  Divider,
  Card,
  CardBody,
  Tooltip,
  Tag,
  Icon,
  Stack,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  SimpleGrid,
  Center,
  Circle,
  Image,
  Badge,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  Alert,
  AlertIcon,
  Progress,
  Textarea,
  Spinner
} from "@chakra-ui/react";
import { AddIcon, EditIcon, DeleteIcon, SearchIcon, ChevronDownIcon, CheckIcon, WarningTwoIcon, LockIcon, InfoIcon } from "@chakra-ui/icons";
import { FiPackage, FiBox, FiShoppingBag, FiCreditCard, FiServer, FiAlertTriangle, FiInfo, FiClock } from "react-icons/fi";
import axios from "axios";

const formatNumber = (num) => {
  return num ? num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '0';
};

const Items = () => {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [formData, setFormData] = useState({
    itemName: "",
    categoryID: "",
    warehouseID: "",
    description: "",
    measurement: "",
    stockBalance: 0,
    costPerUnit: 0
  });
  const [categoryDescription, setCategoryDescription] = useState("");
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [warehouseFilter, setWarehouseFilter] = useState("");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [isUpdatingItem, setIsUpdatingItem] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const cancelRef = useRef();
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [requestType, setRequestType] = useState("");
  const [requestRemarks, setRequestRemarks] = useState("");
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  const [accessRequest, setAccessRequest] = useState(null);
  const [hasEditAccess, setHasEditAccess] = useState(false);
  const [hasDeleteAccess, setHasDeleteAccess] = useState(false);
  const [timer, setTimer] = useState(0);
  const timerIntervalRef = useRef(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Track pending requests for Edit and Delete
  const [pendingEditRequest, setPendingEditRequest] = useState(false);
  const [pendingDeleteRequest, setPendingDeleteRequest] = useState(false);

  useEffect(() => {
    fetchItems();
    fetchCategories();
    fetchWarehouses();
    checkAccessStatus();
  }, []);

  // Effect to update pagination calculations when filters change
  useEffect(() => {
    const filteredItems = items.filter(item => 
      (item.itemName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase())) &&
      (!warehouseFilter || item.warehouseID?._id === warehouseFilter || item.warehouseID === warehouseFilter)
    );
    
    setTotalItems(filteredItems.length);
    const calculatedTotalPages = Math.ceil(filteredItems.length / itemsPerPage);
    setTotalPages(calculatedTotalPages > 0 ? calculatedTotalPages : 1);

    // Reset to page 1 if current page is now invalid
    if (currentPage > calculatedTotalPages && calculatedTotalPages > 0) {
      setCurrentPage(1);
    }
  }, [items, searchQuery, warehouseFilter, itemsPerPage, currentPage]);

  // Function to get items for the current page
  const getCurrentPageItems = () => {
    const filteredItems = items.filter(item => 
      (item.itemName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase())) &&
      (!warehouseFilter || item.warehouseID?._id === warehouseFilter || item.warehouseID === warehouseFilter)
    );
    
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    return filteredItems.slice(indexOfFirstItem, indexOfLastItem);
  };

  // Handle page change
  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  const fetchItems = async () => {
    try {
      const response = await axios.get(process.env.NEXT_PUBLIC_BACKEND_API + "/api/items");
      setItems(response.data);
    } catch (error) {
      console.error("Error fetching items:", error);
      toast({
        title: "Error",
        description: "Failed to fetch items",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get(process.env.NEXT_PUBLIC_BACKEND_API + "/api/categories");
      setCategories(response.data);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const fetchWarehouses = async () => {
    try {
      const response = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_API}/api/warehouses`);
      // The response now contains warehouses in response.data.warehouses
      setWarehouses(response.data.warehouses || []);
    } catch (error) {
      console.error("Error fetching warehouses:", error);
      toast({
        title: "Error",
        description: "Failed to fetch warehouses",
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "top-right"
      });
      setWarehouses([]);
    }
  };

  const checkAccessStatus = async () => {
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/control-panel/reference/items`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      const now = new Date();
      const approvedEdit = response.data.find(
        request => request.Status === "Approved" && request.RequestType === "Edit" && new Date(request.ExpiresAt) > now
      );
      const approvedDelete = response.data.find(
        request => request.Status === "Approved" && request.RequestType === "Delete" && new Date(request.ExpiresAt) > now
      );
      setHasEditAccess(!!approvedEdit);
      setHasDeleteAccess(!!approvedDelete);
      // For legacy hasAccess and timer logic, keep the first approved request (any type)
      const approvedRequest = response.data.find(
        request => request.Status === "Approved" && new Date(request.ExpiresAt) > now
      );
      setAccessRequest(approvedRequest);
      setHasAccess(!!approvedRequest);
      // Check for pending requests
      const user = localStorage.getItem('username') || 'Unknown';
      setPendingEditRequest(
        !!response.data.find(r => r.Status === 'Pending' && r.RequestType === 'Edit' && r.Username === user)
      );
      setPendingDeleteRequest(
        !!response.data.find(r => r.Status === 'Pending' && r.RequestType === 'Delete' && r.Username === user)
      );
    } catch (error) {
      console.error("Error checking access status:", error);
    }
  };

  const handleRequestAccess = async () => {
    if (isSubmittingRequest) return; // Prevent double submission
    setIsSubmittingRequest(true);
    setSubmitSuccess(false);
    try {
      const requestData = {
        RequestID: `REQ_${Date.now()}`,
        Module: "Inventory Items",
        UserRole: localStorage.getItem('userRole') || 'Inventory Officer',
        Username: localStorage.getItem('username') || 'Unknown',
        RequestType: requestType,
        Remarks: requestRemarks,
        ReferenceID: "items"
      };
      await axios.post(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/control-panel`,
        requestData,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      setIsRequestModalOpen(false); // Close modal immediately
      setRequestType("");
      setRequestRemarks("");
      setSubmitSuccess(false);
      toast({
        title: "Request Submitted",
        description: "Your access request has been submitted successfully",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit access request",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsAddingItem(true);
    try {
      // Validate the form data
      if (!formData.itemName) {
        throw new Error('Item name is required');
      }
      if (!formData.categoryID) {
        throw new Error('Category is required');
      }
      if (!formData.warehouseID) {
        throw new Error('Warehouse is required');
      }

      // Ensure costPerUnit is a number
      const payload = {
        ...formData,
        costPerUnit: formData.costPerUnit ? Number(formData.costPerUnit) : 0
      };

      console.log('Sending item data to backend:', payload);
      
      const response = await axios.post(
        process.env.NEXT_PUBLIC_BACKEND_API + "/api/items", 
        payload
      );
      
      console.log('Response from backend:', response.data);
      
      setItems(prev => [response.data, ...prev]);
      onClose();
      setFormData({
        itemName: "",
        categoryID: "",
        warehouseID: "",
        description: "",
        measurement: "",
        stockBalance: 0,
        costPerUnit: 0
      });
      toast({
        title: "Success",
        description: "Item added successfully",
        status: "success",
        duration: 3000,
        isClosable: true,
        position: "top-right"
      });
    } catch (error) {
      console.error("Error adding item:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to add item",
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "top-right"
      });
    } finally {
      setIsAddingItem(false);
    }
  };

  const handleEditClick = (item) => {
    setSelectedItem({
      ...item,
      categoryID: item.categoryID?._id || item.categoryID,
      warehouseID: item.warehouseID?._id || item.warehouseID
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async () => {
    setIsUpdatingItem(true);
    try {
      if (!selectedItem) {
        throw new Error('No item selected');
      }

      // Validate required fields
      const missingFields = [];
      if (!selectedItem.itemName) missingFields.push('Name');
      if (!selectedItem.categoryID) missingFields.push('Category');
      if (!selectedItem.warehouseID) missingFields.push('Warehouse');

      if (missingFields.length > 0) {
        throw new Error(`Please fill in the following fields: ${missingFields.join(', ')}`);
      }

      // Ensure costPerUnit is a number before sending
      const payload = {
        ...selectedItem,
        costPerUnit: selectedItem.costPerUnit ? Number(selectedItem.costPerUnit) : 0
      };
      
      console.log("Submitting edited item:", payload);
      const response = await axios.put(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/items/${selectedItem._id}`,
        payload
      );
      console.log("Update response:", response.data);

      setItems(prev => [
        response.data, 
        ...prev.filter(item => item._id !== selectedItem._id)
      ]);
      
      setIsEditModalOpen(false);
      setSelectedItem(null);
      toast({
        title: "Success",
        description: "Item updated successfully",
        status: "success",
        duration: 3000,
        isClosable: true,
        position: "top-right"
      });
    } catch (error) {
      console.error("Error updating item:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update item",
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "top-right"
      });
    } finally {
      setIsUpdatingItem(false);
    }
  };

  const handleDeleteClick = (item) => {
    setItemToDelete(item);
    setIsDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) {
      toast({ title: "Error", description: "No item selected for deletion", status: "error", duration: 3000 });
      return;
    }
    setIsDeleting(true);
    const token = localStorage.getItem('token');

    try {
      if (!token) {
        toast({ title: "Error", description: "Authentication token not found. Please log in again.", status: "error", duration: 3000 });
        setIsDeleteConfirmOpen(false);
        return;
      }

      await axios.delete(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/items/${itemToDelete._id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      // Update items list
      setItems(prev => prev.filter(item => item._id !== itemToDelete._id));

      setIsDeleteConfirmOpen(false);
      setItemToDelete(null);

      toast({
        title: "Success",
        description: "Item deleted successfully and logged",
        status: "success",
        duration: 3000,
        isClosable: true,
        position: "top-right"
      });
    } catch (error) {
      console.error('Error deleting item:', error);
      toast({
        title: "Error",
        description: error.response?.data?.message || error.response?.data?.error || error.message || "Failed to delete item",
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "top-right"
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCategoryChange = async (categoryId) => {
    setFormData({ ...formData, categoryID: categoryId });
    try {
      const selectedCategory = categories.find(cat => cat._id === categoryId);
      if (selectedCategory) {
        setCategoryDescription(selectedCategory.description || "");
        setFormData(prev => ({
          ...prev,
          categoryID: categoryId,
          description: selectedCategory.description || ""
        }));
      }
    } catch (error) {
      console.error("Error loading category description:", error);
    }
  };

  // Helper to format seconds as hh:mm:ss
  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) {
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    } else {
      return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
  };

  // Effect to handle timer for access expiration
  useEffect(() => {
    if (accessRequest && accessRequest.ExpiresAt) {
      const expiresAt = new Date(accessRequest.ExpiresAt).getTime();
      const updateTimer = () => {
        const now = Date.now();
        const diff = Math.max(0, Math.floor((expiresAt - now) / 1000));
        setTimer(diff);
        if (diff <= 0) {
          setHasAccess(false);
          setAccessRequest(null);
          setHasEditAccess(false);
          setHasDeleteAccess(false);
          clearInterval(timerIntervalRef.current);
        }
      };
      updateTimer();
      timerIntervalRef.current = setInterval(updateTimer, 1000);
      return () => clearInterval(timerIntervalRef.current);
    } else {
      setTimer(0);
      clearInterval(timerIntervalRef.current);
    }
  }, [accessRequest]);

  // Handler for opening the request modal with duplicate check
  const handleOpenRequestModal = () => {
    if (pendingEditRequest && (!requestType || requestType === 'Edit')) {
      toast({
        title: 'Pending Request',
        description: 'You already have a pending Edit access request.',
        status: 'warning',
        duration: 4000,
        isClosable: true,
      });
      return;
    }
    if (pendingDeleteRequest && (!requestType || requestType === 'Delete')) {
      toast({
        title: 'Pending Request',
        description: 'You already have a pending Delete access request.',
        status: 'warning',
        duration: 4000,
        isClosable: true,
      });
      return;
    }
    setIsRequestModalOpen(true);
  };

  return (
    <Box p={6}>
      <VStack spacing={6} align="stretch">
        <Flex justify="space-between" align="center" mb={2}>
          <Text fontSize="2xl" fontWeight="bold" color="#550000">
            Items
          </Text>
        </Flex>
        
        {/* Summary Statistics */}
        <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4} mb={6}>
          <Card shadow="md" border="1px solid" borderColor="gray.200">
            <CardBody p={4}>
              <Flex justify="space-between">
                <Stat>
                  <StatLabel color="gray.500">Total Items</StatLabel>
                  <StatNumber fontSize="3xl" fontWeight="bold">{items.length}</StatNumber>
                </Stat>
                <Center>
                  <Circle size="50px" bg="#550000" color="white">
                    <Icon as={FiBox} boxSize={6} />
                  </Circle>
                </Center>
              </Flex>
            </CardBody>
          </Card>
          
          <Card shadow="md" border="1px solid" borderColor="gray.200">
            <CardBody p={4}>
              <Flex justify="space-between">
                <Stat>
                  <StatLabel color="gray.500">Categories</StatLabel>
                  <StatNumber fontSize="3xl" fontWeight="bold">
                    {new Set(items.map(item => 
                      item.categoryID?._id || item.categoryID
                    )).size}
                  </StatNumber>
                </Stat>
                <Center>
                  <Circle size="50px" bg="blue.500" color="white">
                    <Icon as={FiServer} boxSize={6} />
                  </Circle>
                </Center>
              </Flex>
            </CardBody>
          </Card>
          
          <Card shadow="md" border="1px solid" borderColor="gray.200">
            <CardBody p={4}>
              <Flex justify="space-between">
                <Stat>
                  <StatLabel color="gray.500">Warehouses</StatLabel>
                  <StatNumber fontSize="3xl" fontWeight="bold">
                    {new Set(items.map(item => 
                      item.warehouseID?._id || item.warehouseID
                    )).size}
                  </StatNumber>
                </Stat>
                <Center>
                  <Circle size="50px" bg="green.500" color="white">
                    <Icon as={FiShoppingBag} boxSize={6} />
                  </Circle>
                </Center>
              </Flex>
            </CardBody>
          </Card>
          
          <Card shadow="md" border="1px solid" borderColor="gray.200">
            <CardBody p={4}>
              <Flex justify="space-between">
                <Stat>
                  <StatLabel color="gray.500">Total Value</StatLabel>
                  <StatNumber fontSize="3xl" fontWeight="bold">₱{formatNumber(
                    items.reduce((sum, item) => sum + ((Number(item.costPerUnit) || 0) * (Number(item.stockBalance) || 0)), 0).toFixed(2)
                  )}</StatNumber>
                </Stat>
                <Center>
                  <Circle size="50px" bg="purple.500" color="white">
                    <Icon as={FiCreditCard} boxSize={6} />
                  </Circle>
                </Center>
              </Flex>
            </CardBody>
          </Card>
        </SimpleGrid>
        
        {/* Search and Filter Bar */}
        <Flex 
          bg="white" 
          p={4} 
          borderRadius="md"
          shadow="sm"
          mb={4}
          border="1px solid"
          borderColor="gray.200"
          wrap="wrap"
          gap={4}
          align="center"
        >
          <InputGroup maxW={{ base: "100%", md: "320px" }}>
            <InputLeftElement pointerEvents="none">
              <SearchIcon color="gray.400" />
            </InputLeftElement>
            <Input
              placeholder="Search by name or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              borderRadius="md"
              focusBorderColor="#550000"
            />
          </InputGroup>
          <Button
            leftIcon={<AddIcon />}
            bg="#550000"
            color="white"
            _hover={{ bg: "#770000" }}
            onClick={onOpen}
            size="md"
            px={6}
            shadow="md"
            borderRadius="md"
          >
            Add Item
          </Button>
          <HStack spacing={3}>
            <Tooltip label={hasAccess ? 'You have temporary access to Edit/Delete' : 'Request temporary access to Edit/Delete'}>
              <Button
                leftIcon={<LockIcon />}
                variant="solid"
                colorScheme={hasAccess ? "green" : "purple"}
                onClick={handleOpenRequestModal}
                size="md"
                boxShadow="md"
                transition="all 0.2s"
                _hover={{ transform: "scale(1.05)" }}
                rightIcon={hasAccess ? <CheckIcon /> : null}
              >
                {hasAccess ? "Access Granted" : "Request Access"}
              </Button>
            </Tooltip>
            {hasAccess && accessRequest && accessRequest.ExpiresAt && timer > 0 && (
              <Badge colorScheme="purple" fontSize="1em" px={3} py={1} borderRadius="full">
                <Icon as={FiClock} mr={1} /> {formatTime(timer)}
              </Badge>
            )}
            <Tooltip label="Access to Edit/Delete is time-limited for security.">
              <InfoIcon color="gray.400" />
            </Tooltip>
          </HStack>
          <Select
            placeholder="Filter by warehouse"
            value={warehouseFilter}
            onChange={(e) => setWarehouseFilter(e.target.value)}
            maxW={{ base: "100%", md: "250px" }}
            borderRadius="md"
            focusBorderColor="#550000"
          >
            <option value="">All Warehouses</option>
            {warehouses && warehouses.length > 0 ? (
              warehouses.map((warehouse) => (
                <option key={warehouse._id} value={warehouse._id}>
                  {warehouse.name}
                </option>
              ))
            ) : (
              <option value="" disabled>No warehouses available</option>
            )}
          </Select>
        </Flex>

        {/* Items Table */}
        <Box 
          borderRadius="lg" 
          shadow="md" 
          overflow="hidden"
          border="1px solid"
          borderColor="gray.200"
          bg="white"
        >
          <Box overflowX="auto">
          {items.filter(item => 
            (item.itemName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.description?.toLowerCase().includes(searchQuery.toLowerCase())) &&
            (!warehouseFilter || item.warehouseID?._id === warehouseFilter || item.warehouseID === warehouseFilter)
          ).length === 0 ? (
              <Flex 
                direction="column" 
                align="center" 
                justify="center" 
                p={10} 
              >
                <Icon as={FiBox} boxSize={12} color="gray.300" mb={4} />
                <Text fontSize="lg" color="gray.500" mb={4}>No items found</Text>
                <Button
                  leftIcon={<AddIcon />}
                  onClick={onOpen}
                  size="md"
                  bg="#550000"
                  color="white"
                  _hover={{ bg: "#770000" }}
                >
                  Add your first item
                </Button>
              </Flex>
          ) : (
            <Table variant="simple">
                <Thead bg="#f8f9fa">
                <Tr>
                  <Th>Name</Th>
                  <Th>Category</Th>
                  <Th>Warehouse</Th>
                  <Th>Description</Th>
                  <Th>Measurement</Th>
                  <Th>Cost Per Unit</Th>
                  <Th>Stock Balance</Th>
                  <Th>Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {getCurrentPageItems().map((item) => (
                    <Tr 
                      key={item._id}
                      _hover={{ bg: "#f8f9fa" }}
                      transition="background-color 0.2s"
                    >
                      <Td fontWeight="semibold">{item.itemName}</Td>
                      <Td>
                        <Badge colorScheme="blue" px={2} py={1} borderRadius="full">
                          {item.categoryID?.categoryName || item.categoryID}
                        </Badge>
                      </Td>
                    <Td>{item.warehouseID?.name || item.warehouseID}</Td>
                      <Td maxW="200px" isTruncated>{item.description}</Td>
                    <Td>{item.measurement}</Td>
                      <Td fontFamily="mono">₱{formatNumber(item.costPerUnit || 0)}</Td>
                      <Td fontWeight="medium">
                        <Badge 
                          colorScheme={Number(item.stockBalance) > 0 ? "green" : "red"} 
                          variant={Number(item.stockBalance) > 5 ? "solid" : "outline"}
                          px={2}
                          py={1}
                        >
                          {item.stockBalance || 0}
                        </Badge>
                      </Td>
                      <Td>
                        <HStack spacing={1}>
                          <Tooltip label={hasEditAccess ? "Edit Item" : "Request access to edit"}>
                        <IconButton
                          icon={<EditIcon />}
                          aria-label="Edit"
                          size="sm"
                              colorScheme="blue"
                              variant="ghost"
                          onClick={() => handleEditClick(item)}
                              isDisabled={!hasEditAccess}
                        />
                          </Tooltip>
                          <Tooltip label={hasDeleteAccess ? "Delete Item" : "Request access to delete"}>
                        <IconButton
                          icon={<DeleteIcon />}
                          aria-label="Delete"
                          size="sm"
                          colorScheme="red"
                              variant="ghost"
                          onClick={() => handleDeleteClick(item)}
                              isDisabled={!hasDeleteAccess}
                        />
                          </Tooltip>
                      </HStack>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
          </Box>
          
          {/* Pagination */}
          {totalItems > 0 && (
            <Box px={4} py={4} borderTop="1px solid" borderColor="gray.200">
              <Flex justify="space-between" align="center">
                <Text fontSize="sm" color="gray.600">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} items
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
      </VStack>

      {/* Add Item Modal */}
      <Modal isOpen={isOpen} onClose={!isAddingItem ? onClose : undefined} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Add New Item</ModalHeader>
          {!isAddingItem && <ModalCloseButton />}
          <ModalBody>
            <VStack spacing={6} align="stretch">
              <FormControl isRequired>
                <FormLabel fontWeight="medium">Name</FormLabel>
                <Input
                  value={formData.itemName}
                  onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
                  placeholder="Enter item name"
                  size="md"
                  focusBorderColor="#550000"
                  borderRadius="md"
                />
              </FormControl>
              
              <SimpleGrid columns={2} spacing={5}>
                <FormControl isRequired>
                  <FormLabel fontWeight="medium">Category</FormLabel>
                <Select
                    placeholder="Select category"
                  value={formData.categoryID}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    size="md"
                    focusBorderColor="#550000"
                    borderRadius="md"
                >
                  {categories.map((category) => (
                    <option key={category._id} value={category._id}>
                      {category.categoryName}
                    </option>
                  ))}
                </Select>
              </FormControl>

                <FormControl isRequired>
                  <FormLabel fontWeight="medium">Warehouse</FormLabel>
                  <Select
                    placeholder="Select warehouse"
                    value={formData.warehouseID}
                    onChange={(e) => setFormData({ ...formData, warehouseID: e.target.value })}
                    size="md"
                    focusBorderColor="#550000"
                    borderRadius="md"
                  >
                    {warehouses && warehouses.length > 0 ? (
                      warehouses.map((warehouse) => (
                        <option key={warehouse._id} value={warehouse._id}>
                          {warehouse.name}
                        </option>
                      ))
                    ) : (
                      <option value="" disabled>No warehouses available</option>
                    )}
                  </Select>
                </FormControl>
              </SimpleGrid>

              <FormControl mt={4}>
                <FormLabel fontSize="sm" color="gray.600">Description</FormLabel>
                <Input
                  size="sm"
                  placeholder="Enter description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  isDisabled
                />
              </FormControl>

              <SimpleGrid columns={2} spacing={5}>
              <FormControl>
                  <FormLabel fontWeight="medium">Measurement</FormLabel>
                <Input
                  value={formData.measurement}
                  onChange={(e) => setFormData({ ...formData, measurement: e.target.value })}
                  placeholder="Enter measurement (e.g., pcs, kg, m)"
                    size="md"
                    focusBorderColor="#550000"
                    borderRadius="md"
                />
              </FormControl>

              <FormControl>
                  <FormLabel fontWeight="medium">Cost Per Unit (₱)</FormLabel>
                <Input
                  type="number"
                    value={formData.costPerUnit}
                  onChange={(e) => setFormData({ ...formData, costPerUnit: e.target.value })}
                  placeholder="Enter cost per unit"
                    size="md"
                    focusBorderColor="#550000"
                    borderRadius="md"
                />
              </FormControl>
              </SimpleGrid>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button 
              variant="ghost" 
              mr={3} 
              onClick={onClose} 
              isDisabled={isAddingItem}
            >
              Cancel
            </Button>
            <Button 
              colorScheme="blue" 
              onClick={handleSubmit}
              isLoading={isAddingItem}
              loadingText="Adding..."
            >
              Add Item
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Edit Item Modal */}
      <Modal isOpen={isEditModalOpen} onClose={!isUpdatingItem ? () => setIsEditModalOpen(false) : undefined} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Edit Item</ModalHeader>
          {!isUpdatingItem && <ModalCloseButton />}
          <ModalBody>
            <VStack spacing={6} align="stretch">
              <FormControl isRequired>
                <FormLabel fontWeight="medium">Name</FormLabel>
                <Input
                  value={selectedItem?.itemName || ''}
                  onChange={(e) => setSelectedItem(prev => ({...prev, itemName: e.target.value}))}
                  placeholder="Enter item name"
                  size="md"
                  focusBorderColor="#550000"
                  borderRadius="md"
                />
              </FormControl>
              
              <SimpleGrid columns={2} spacing={5}>
              <FormControl isRequired>
                  <FormLabel fontWeight="medium">Category</FormLabel>
                <Select
                  value={selectedItem?.categoryID || ''}
                  onChange={(e) => setSelectedItem(prev => ({...prev, categoryID: e.target.value}))}
                  placeholder="Select category"
                    size="md"
                    focusBorderColor="#550000"
                    borderRadius="md"
                >
                  {categories.map((category) => (
                    <option key={category._id} value={category._id}>
                      {category.categoryName}
                    </option>
                  ))}
                </Select>
              </FormControl>
                
              <FormControl isRequired>
                  <FormLabel fontWeight="medium">Warehouse</FormLabel>
                <Select
                  value={selectedItem?.warehouseID || ''}
                  onChange={(e) => setSelectedItem(prev => ({...prev, warehouseID: e.target.value}))}
                  placeholder="Select warehouse"
                    size="md"
                    focusBorderColor="#550000"
                    borderRadius="md"
                >
                  {warehouses && warehouses.length > 0 ? (
                    warehouses.map((warehouse) => (
                      <option key={warehouse._id} value={warehouse._id}>
                        {warehouse.name}
                      </option>
                    ))
                  ) : (
                    <option value="" disabled>No warehouses available</option>
                  )}
                </Select>
              </FormControl>
              </SimpleGrid>
              
              <FormControl>
                <FormLabel fontWeight="medium">Description</FormLabel>
                <Input
                  value={selectedItem?.description || ''}
                  onChange={(e) => setSelectedItem(prev => ({...prev, description: e.target.value}))}
                  placeholder="Enter description"
                  size="md"
                  focusBorderColor="#550000"
                  borderRadius="md"
                />
              </FormControl>
              
              <SimpleGrid columns={2} spacing={5}>
              <FormControl>
                  <FormLabel fontWeight="medium">Measurement</FormLabel>
                <Input
                  value={selectedItem?.measurement || ''}
                  onChange={(e) => setSelectedItem(prev => ({...prev, measurement: e.target.value}))}
                  placeholder="Enter measurement (e.g., pcs, kg, m)"
                    size="md"
                    focusBorderColor="#550000"
                    borderRadius="md"
                />
              </FormControl>
                
              <FormControl>
                  <FormLabel fontWeight="medium">Cost Per Unit (₱)</FormLabel>
                <Input
                  type="number"
                  value={selectedItem?.costPerUnit || ''}
                  onChange={(e) => setSelectedItem(prev => ({...prev, costPerUnit: e.target.value}))}
                  placeholder="Enter cost per unit"
                    size="md"
                    focusBorderColor="#550000"
                    borderRadius="md"
                />
              </FormControl>
              </SimpleGrid>
              
              {selectedItem && (
                <Box 
                  mt={2} 
                  p={3} 
                  bg="blue.50" 
                  borderRadius="md" 
                  border="1px solid"
                  borderColor="blue.200"
                >
                  <Flex align="center">
                    <Icon as={FiInfo} color="blue.500" mr={2} />
                    <Text color="blue.700">
                      Current stock balance: <b>{selectedItem.stockBalance || 0}</b> units 
                      (Value: <b>₱{formatNumber(
                        (Number(selectedItem.stockBalance) || 0) * (Number(selectedItem.costPerUnit) || 0)
                      )}</b>)
                    </Text>
                  </Flex>
                </Box>
              )}
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button 
              variant="ghost" 
              mr={3} 
              onClick={() => setIsEditModalOpen(false)}
              isDisabled={isUpdatingItem}
            >
              Cancel
            </Button>
            <Button 
              colorScheme="blue" 
              onClick={handleEditSubmit}
              isLoading={isUpdatingItem}
              loadingText="Saving..."
            >
              Save Changes
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        isOpen={isDeleteConfirmOpen}
        leastDestructiveRef={cancelRef}
        onClose={() => !isDeleting && setIsDeleteConfirmOpen(false)}
        isCentered
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete Item
            </AlertDialogHeader>

            <AlertDialogBody>
              Are you sure you want to delete the item "<strong>{itemToDelete?.itemName}</strong>"? This action cannot be undone, but the data will be logged.
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button 
                ref={cancelRef} 
                onClick={() => !isDeleting && setIsDeleteConfirmOpen(false)}
                isDisabled={isDeleting}
              >
                Cancel
              </Button>
              <Button 
                colorScheme="red" 
                onClick={handleDeleteConfirm} 
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

      {/* Add Request Access Modal */}
      <Modal isOpen={isRequestModalOpen} onClose={() => !isSubmittingRequest && setIsRequestModalOpen(false)} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Request Access</ModalHeader>
          {!isSubmittingRequest && <ModalCloseButton />}
          <ModalBody position="relative">
            {isSubmittingRequest && (
              <Box position="absolute" top={0} left={0} w="100%" h="100%" bg="whiteAlpha.700" zIndex={10} display="flex" alignItems="center" justifyContent="center">
                <Spinner size="xl" color="purple.500" thickness="4px" speed="0.7s" label="Submitting..." />
              </Box>
            )}
            <VStack spacing={4} align="stretch" opacity={isSubmittingRequest ? 0.5 : 1} pointerEvents={isSubmittingRequest ? "none" : "auto"}>
              {isSubmittingRequest && (
                <Alert status="info" borderRadius="md">
                  <AlertIcon />
                  Submitting your request...
                </Alert>
              )}
              {requestType && requestRemarks && !isSubmittingRequest && (
                <Alert status="info" borderRadius="md">
                  <AlertIcon />
                  <Box>
                    <b>Summary:</b> You are requesting <b>{requestType}</b> access.<br />
                    <b>Remarks:</b> {requestRemarks}
                  </Box>
                </Alert>
              )}
              <FormControl isRequired>
                <FormLabel>Request Type</FormLabel>
                <Select
                  value={requestType}
                  onChange={(e) => setRequestType(e.target.value)}
                  placeholder="Select request type"
                  isDisabled={isSubmittingRequest}
                  // Disable options for types with pending requests
                >
                  <option value="Edit" disabled={pendingEditRequest}>Edit Access</option>
                  <option value="Delete" disabled={pendingDeleteRequest}>Delete Access</option>
                </Select>
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Remarks</FormLabel>
                <Textarea
                  value={requestRemarks}
                  onChange={(e) => setRequestRemarks(e.target.value)}
                  placeholder="Enter reason for access request"
                  resize="vertical"
                  minH="80px"
                  isDisabled={isSubmittingRequest}
                />
              </FormControl>
              {isSubmittingRequest && (
                <Progress size="xs" isIndeterminate colorScheme="purple" borderRadius="md" />
              )}
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="ghost"
              mr={3}
              onClick={() => setIsRequestModalOpen(false)}
              isDisabled={isSubmittingRequest}
            >
              Cancel
            </Button>
            <Button
              colorScheme="purple"
              onClick={handleRequestAccess}
              isLoading={isSubmittingRequest}
              isDisabled={!requestType || !requestRemarks || isSubmittingRequest}
            >
              Submit Request
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default Items;
