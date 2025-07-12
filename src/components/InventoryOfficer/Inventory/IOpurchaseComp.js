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
  NumberInput,
  NumberInputField,
  Text,
  Badge,
  Flex,
  Heading,
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
  AlertDialog,
  AlertDialogOverlay,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogBody,
  AlertDialogFooter,
  Spinner,
  Alert,
  AlertIcon,
  Progress,
  Textarea,
  InputRightElement,
  CloseButton
} from "@chakra-ui/react";
import { AddIcon, EditIcon, DeleteIcon, SearchIcon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, CheckIcon, RepeatIcon, TriangleDownIcon, LockIcon, InfoIcon } from "@chakra-ui/icons";
import { FiPackage, FiTruck, FiDollarSign, FiCalendar, FiClock, FiCheck, FiX } from "react-icons/fi";
import axios from "axios";

const Purchase = () => {
  const [purchases, setPurchases] = useState([]);
  const [items, setItems] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [supplierInput, setSupplierInput] = useState("");
  const [showSupplierOptions, setShowSupplierOptions] = useState(false);
  const [suppliers, setSuppliers] = useState([]);
  const [formData, setFormData] = useState({
    categoryID: "",
    itemID: "",
    warehouseID: "",
    quantity: "",
    unitPrice: "",
    gross: "",
    netOfVat: "",
    vatAmount: "",
    ewt: "",
    paidAmount: "",
    remarks: "",
    orderDate: "",
    supplier: ""
  });
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredItems, setFilteredItems] = useState([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [selectedStatusPurchase, setSelectedStatusPurchase] = useState(null);
  const [trucks, setTrucks] = useState([]);
  const [officialReceiptFile, setOfficialReceiptFile] = useState(null);
  const { isOpen: isReceiptModalOpen, onOpen: onReceiptModalOpen, onClose: onReceiptModalClose } = useDisclosure();
  const [viewingReceiptUrl, setViewingReceiptUrl] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [purchaseToDelete, setPurchaseToDelete] = useState(null);
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
  const cancelRef = useRef();
  const [isAddingSupplier, setIsAddingSupplier] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Access control states
  const [hasAccess, setHasAccess] = useState(false);
  const [accessRequest, setAccessRequest] = useState(null);
  const [hasEditAccess, setHasEditAccess] = useState(false);
  const [hasDeleteAccess, setHasDeleteAccess] = useState(false);
  const [timer, setTimer] = useState(0);
  const timerIntervalRef = useRef(null);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [requestType, setRequestType] = useState("");
  const [requestRemarks, setRequestRemarks] = useState("");
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [pendingEditRequest, setPendingEditRequest] = useState(false);
  const [pendingDeleteRequest, setPendingDeleteRequest] = useState(false);

  const [statusFilter, setStatusFilter] = useState('All');

  const filteredSuppliers = suppliers.map(s => s.company).filter(company => company.toLowerCase().includes(supplierInput.toLowerCase()));

  useEffect(() => {
    fetchPurchases();
    fetchItems();
    fetchWarehouses();
    fetchTrucks();
    fetchCategories();
    fetchSuppliers();
    checkAccessStatus();
  }, []);

  useEffect(() => {
    if (formData.warehouseID) {
      const itemsInWarehouse = items.filter(item => 
        item.warehouseID?._id === formData.warehouseID || 
        item.warehouseID === formData.warehouseID
      );
      setFilteredItems(itemsInWarehouse);
    } else {
      setFilteredItems([]);
    }
  }, [formData.warehouseID, items]);

  useEffect(() => {
    const filteredPurchases = purchases.filter(purchase => 
      purchase.itemID?.itemName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      purchase.purchaseID?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      purchase.remarks?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    setTotalItems(filteredPurchases.length);
    const calculatedTotalPages = Math.ceil(filteredPurchases.length / itemsPerPage);
    setTotalPages(calculatedTotalPages > 0 ? calculatedTotalPages : 1);

    // Reset to page 1 if current page is now invalid
    if (currentPage > calculatedTotalPages && calculatedTotalPages > 0) {
      setCurrentPage(1);
    }
  }, [purchases, searchQuery, itemsPerPage, currentPage]);

  const fetchPurchases = async () => {
    try {
      const response = await axios.get(process.env.NEXT_PUBLIC_BACKEND_API + "/api/purchases");
      setPurchases(response.data);
    } catch (error) {
      console.error("Error fetching purchases:", error);
      toast({
        title: "Error",
        description: "Failed to fetch purchases",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const fetchItems = async () => {
    try {
      const response = await axios.get(process.env.NEXT_PUBLIC_BACKEND_API + "/api/items");
      setItems(response.data);
    } catch (error) {
      console.error("Error fetching items:", error);
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

  const fetchTrucks = async () => {
    try {
      const response = await axios.get(process.env.NEXT_PUBLIC_BACKEND_API + "/api/trucks");
      setTrucks(response.data);
    } catch (error) {
      console.error("Error fetching trucks:", error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get(process.env.NEXT_PUBLIC_BACKEND_API + "/api/categories");
      setCategories(response.data);
    } catch (error) {
      setCategories([]);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const response = await axios.get(process.env.NEXT_PUBLIC_BACKEND_API + "/api/suppliers");
      setSuppliers(response.data);
    } catch (error) {
      setSuppliers([]);
    }
  };

  const generatePurchaseID = async () => {
    // Generate a random 7-character alphanumeric ID
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let randomPart = '';
    for (let i = 0; i < 7; i++) {
      randomPart += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    // Use the 'PUR:' prefix
    return `PUR:${randomPart}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsAdding(true);
    try {
      const selectedItem = items.find(item => item._id === formData.itemID);
      const selectedWarehouse = warehouses.find(warehouse => warehouse._id === formData.warehouseID);

      if (!selectedItem || !selectedWarehouse) {
        throw new Error('Please select both item and warehouse');
      }

      if (!formData.orderDate) {
        toast({
          title: "Error",
          description: "Please select an order date",
          status: "error",
          duration: 3000,
          isClosable: true,
          position: "top-right"
        });
        setIsAdding(false);
        return;
      }

      // Combine the selected date with the current time
      const selectedDate = new Date(formData.orderDate);
      const currentTime = new Date();
      const orderDateTime = new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate(),
        currentTime.getHours(),
        currentTime.getMinutes(),
        currentTime.getSeconds()
      );

      const purchaseID = await generatePurchaseID();

      const payload = {
        ...formData,
        purchaseID,
        orderDate: orderDateTime,
        totalAmount: Number(formData.quantity) * Number(formData.unitPrice)
      };

      const response = await axios.post(
        process.env.NEXT_PUBLIC_BACKEND_API + "/api/purchases", 
        payload
      );

      // Update the items array with the new stock balance
      setItems(items.map(item => {
        if (item._id === formData.itemID) {
          return {
            ...item,
            stockBalance: response.data.updatedStockBalance
          };
        }
        return item;
      }));

      // Update purchases state to put new entry at the top
      setPurchases(prevPurchases => {
        const newPurchase = response.data;
        return [newPurchase, ...prevPurchases];
      });

      onClose();
      setFormData({
        itemID: "",
        warehouseID: "",
        quantity: "",
        unitPrice: "",
        totalAmount: "",
        remarks: "",
        orderDate: ""
      });

      toast({
        title: "Success",
        description: `Purchase added successfully. Stock balance updated to ${response.data.updatedStockBalance}`,
        status: "success",
        duration: 3000,
        isClosable: true,
        position: "top-right"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to add purchase",
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "top-right"
      });
    } finally {
      setIsAdding(false);
    }
  };

  const handleEditClick = (purchase) => {
    setSelectedPurchase({
      ...purchase,
      warehouseID: purchase.warehouseID?._id || purchase.warehouseID,
      itemID: purchase.itemID?._id || purchase.itemID,
      quantity: purchase.quantity,
      unitPrice: purchase.unitPrice,
      orderDate: new Date(purchase.orderDate).toISOString().split('T')[0]
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async () => {
    setIsEditing(true);
    try {
      if (!selectedPurchase) {
        throw new Error('No purchase selected');
      }

      // Validate required fields
      const missingFields = [];
      if (!selectedPurchase.warehouseID) missingFields.push('Warehouse');
      if (!selectedPurchase.itemID) missingFields.push('Item');
      if (!selectedPurchase.quantity) missingFields.push('Quantity');
      if (!selectedPurchase.unitPrice) missingFields.push('Unit Price');
      if (!selectedPurchase.orderDate) missingFields.push('Order Date');
      if (!selectedPurchase.status) missingFields.push('Status');

      if (missingFields.length > 0) {
        throw new Error(`Please fill in the following fields: ${missingFields.join(', ')}`);
      }

      // Combine the selected date with the current time
      const selectedDate = new Date(selectedPurchase.orderDate);
      const currentTime = new Date();
      const orderDateTime = new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate(),
        currentTime.getHours(),
        currentTime.getMinutes(),
        currentTime.getSeconds()
      );

      const updatedPurchase = await axios.put(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/purchases/${selectedPurchase._id}`,
        {
          ...selectedPurchase,
          orderDate: orderDateTime,
          totalAmount: Number(selectedPurchase.quantity) * Number(selectedPurchase.unitPrice)
        }
      );

      setPurchases(prev => [
        updatedPurchase.data, 
        ...prev.filter(p => p._id !== selectedPurchase._id)
      ]);

      setIsEditModalOpen(false);
      setSelectedPurchase(null);

      toast({
        title: "Success",
        description: "Purchase updated successfully",
        status: "success",
        duration: 3000,
        isClosable: true,
        position: "top-right"
      });
    } finally {
      setIsEditing(false);
    }
  };

  const formatNumber = (num, decimalPlaces = 0) => {
    if (num === null || num === undefined || isNaN(Number(num))) {
      // Return '0.00' for 2 decimal places, '0' otherwise
      return decimalPlaces > 0 ? `0.${'0'.repeat(decimalPlaces)}` : '0';
    }
    const fixedNum = Number(num).toFixed(decimalPlaces);
    const parts = fixedNum.split('.');
    // Add thousand separators to the integer part
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
  };

  const handleStatusChange = async (purchaseId, newStatus) => {
    try {
      const response = await axios.patch(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/purchases/${purchaseId}/status`,
        { status: newStatus }
      );

      // Update the items array with the new stock balance if it was updated
      if (response.data.stockUpdated) {
        setItems(prevItems => prevItems.map(item => {
          if (item._id === response.data.itemID?._id) {
            return {
              ...item,
              stockBalance: response.data.updatedStockBalance
            };
          }
          return item;
        }));
      }

      setPurchases(prev => prev.map(p => 
        p._id === purchaseId ? response.data : p
      ));

      // Show appropriate success message
      const message = response.data.stockUpdated
        ? `Status updated to ${newStatus}. Stock balance updated to ${formatNumber(response.data.updatedStockBalance)}.`
        : `Status updated to ${newStatus}.`;

      toast({
        title: "Success",
        description: message,
        status: "success",
        duration: 3000,
        isClosable: true,
        position: "top-right"
      });
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: "Error",
        description: error.response?.data?.message || error.message || "Failed to update status",
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "top-right"
      });
    }
  };

  const handleStatusClick = (purchase) => {
    setSelectedStatusPurchase({
      ...purchase,
      dateReceived: purchase.dateReceived ? new Date(purchase.dateReceived).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
    });
    setIsStatusModalOpen(true);
  };

  const handleStatusChangeSubmit = async () => {
    setIsUpdatingStatus(true);
    try {
      if (!selectedStatusPurchase) {
        throw new Error('No purchase selected');
      }
      
      const formData = new FormData();
      formData.append('status', selectedStatusPurchase.status);
      if (selectedStatusPurchase.status === 'Received') {
        formData.append('dateReceived', selectedStatusPurchase.dateReceived);
        if (officialReceiptFile) {
          formData.append('officialReceiptImage', officialReceiptFile);
        }
        formData.append('arrivedQuantity', selectedStatusPurchase.arrivedQuantity || 0);
        formData.append('remarks', selectedStatusPurchase.remarks || '');
      } else {
        formData.append('dateReceived', null);
      }

      const response = await axios.patch(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/purchases/${selectedStatusPurchase._id}/status`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      // Update the items array with the new stock balance if it was updated
      if (response.data.stockUpdated) {
        setItems(prevItems => prevItems.map(item => {
          if (item._id === response.data.itemID?._id) {
            return {
              ...item,
              stockBalance: response.data.updatedStockBalance
            };
          }
          return item;
        }));
      }

      setPurchases(prev => prev.map(p => 
        p._id === selectedStatusPurchase._id ? response.data : p
      ));

      setIsStatusModalOpen(false);
      setSelectedStatusPurchase(null);
      setOfficialReceiptFile(null);

      // Show appropriate success message
      if (response.data.stockUpdated) {
        const stockInMessage = response.data.stockInRecord 
          ? ` Stock In record ${response.data.stockInRecord.stockInID} created.` 
          : '';
          
        toast({
          title: "Success",
          description: `Status updated to ${response.data.status}. Stock balance updated to ${formatNumber(response.data.updatedStockBalance)}.${stockInMessage}`,
          status: "success",
          duration: 3000,
          isClosable: true,
          position: "top-right"
        });
      } else {
        toast({
          title: "Success",
          description: `Status updated to ${response.data.status}.`,
          status: "success",
          duration: 3000,
          isClosable: true,
          position: "top-right"
        });
      }
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleDeleteClick = (purchase) => {
    setPurchaseToDelete(purchase);
    onDeleteOpen();
  };

  const handleDeleteConfirm = async () => {
    if (!purchaseToDelete) return;
    setIsDeleting(true);
    const token = localStorage.getItem('token');

    try {
      if (!token) {
        toast({ title: "Error", description: "Authentication failed. Please log in.", status: "error", duration: 3000 });
        onDeleteClose();
        return;
      }
      
      await axios.delete(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/purchases/${purchaseToDelete._id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      setPurchases(prev => prev.filter(p => p._id !== purchaseToDelete._id));
      onDeleteClose();
      setPurchaseToDelete(null);
      
      toast({
        title: "Success",
        description: "Purchase deleted successfully",
        status: "success",
        duration: 3000,
        isClosable: true,
        position: "top-right"
      });
      
    } catch (error) {
      console.error('Error deleting purchase:', error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to delete purchase",
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "top-right"
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleViewReceiptClick = (imageUrl) => {
    setViewingReceiptUrl(imageUrl);
    onReceiptModalOpen();
  };

  // Function to get purchases for the current page
  const getCurrentPagePurchases = () => {
    const filteredPurchases = purchases.filter(purchase => {
      const matchesSearch =
        purchase.itemID?.itemName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        purchase.purchaseID?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        purchase.remarks?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        statusFilter === 'All' || purchase.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    return filteredPurchases.slice(indexOfFirstItem, indexOfLastItem);
  };

  // Handle page change
  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
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

  // Check access status and pending requests
  const checkAccessStatus = async () => {
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/control-panel/reference/purchases`,
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

  // Timer effect
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

  const handleRequestAccess = async () => {
    if (isSubmittingRequest) return;
    setIsSubmittingRequest(true);
    setSubmitSuccess(false);
    try {
      const requestData = {
        RequestID: `REQ_${Date.now()}`,
        Module: "Purchases",
        UserRole: localStorage.getItem('userRole') || 'Inventory Officer',
        Username: localStorage.getItem('username') || 'Unknown',
        RequestType: requestType,
        Remarks: requestRemarks,
        ReferenceID: "purchases"
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
      setIsRequestModalOpen(false);
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
      checkAccessStatus();
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

  // Helper to compute financials
  const computeFinancials = (grossValue) => {
    const gross = Number(grossValue) || 0;
    const netOfVat = gross / 1.12;
    const vatAmount = gross - netOfVat;
    const ewt = netOfVat * 0.01;
    const paidAmount = gross - ewt;
    return { netOfVat, vatAmount, ewt, paidAmount };
  };

  // useEffect to update financials when quantity/unitPrice changes
  useEffect(() => {
    const gross = formData.quantity && formData.unitPrice ? Number(formData.quantity) * Number(formData.unitPrice) : 0;
    const { netOfVat, vatAmount, ewt, paidAmount } = computeFinancials(gross);
    setFormData(prev => ({
      ...prev,
      gross,
      netOfVat,
      vatAmount,
      ewt,
      paidAmount
    }));
  }, [formData.quantity, formData.unitPrice]);

  // Add supplier add/delete handlers
  const handleAddSupplier = async () => {
    if (!supplierInput.trim()) return;
    setIsAddingSupplier(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/suppliers`,
        { company: supplierInput },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await fetchSuppliers();
    } finally {
      setIsAddingSupplier(false);
    }
  };

  const handleDeleteSupplier = async (id, company) => {
    if (!id) return;
    if (!window.confirm(`Are you sure you want to delete the supplier "${company}"?`)) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/suppliers/${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await fetchSuppliers();
      if (formData.supplier === company) {
        setFormData(prev => ({ ...prev, supplier: "" }));
        setSupplierInput("");
      }
    } catch {}
  };

  // In the Status Change Modal, add proportional paid amount and exceeded check
  const getProportionalPaidAmount = () => {
    if (!selectedStatusPurchase) return 0;
    const arrivedQty = Number(selectedStatusPurchase.arrivedQuantity) || 0;
    const orderedQty = Number(selectedStatusPurchase.quantity) || 0;
    const fullPaidAmount = Number(selectedStatusPurchase.paidAmount) || 0;
    if (!arrivedQty || !orderedQty || !fullPaidAmount) return 0;
    return (arrivedQty / orderedQty) * fullPaidAmount;
  };
  const isArrivedQtyExceeded = selectedStatusPurchase && Number(selectedStatusPurchase.arrivedQuantity) > Number(selectedStatusPurchase.quantity);

  return (
    <Box p={6}>
      <VStack spacing={6} align="stretch">
        <Flex justify="space-between" align="center" mb={2}>
          <Text fontSize="2xl" fontWeight="bold" color="#550000">Purchase Management</Text>
        </Flex>
        
        {/* Summary Statistics */}
        <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4} mb={6}>
          <Card shadow="md" border="1px solid" borderColor="gray.200">
            <CardBody p={4}>
              <Flex justify="space-between">
                <Stat>
                  <StatLabel color="gray.500" fontFamily="Helvetica">Total Purchases</StatLabel>
                  <StatNumber fontSize="3xl" fontWeight="bold" fontFamily="Helvetica">{purchases.length}</StatNumber>
                </Stat>
                <Center>
                  <Circle size="50px" bg="#550000" color="white">
                    <Icon as={FiPackage} boxSize={6} />
                  </Circle>
                </Center>
              </Flex>
            </CardBody>
          </Card>
          
          <Card shadow="md" border="1px solid" borderColor="gray.200">
            <CardBody p={4}>
              <Flex justify="space-between">
                <Stat>
                  <StatLabel color="gray.500" fontFamily="Helvetica">Pending</StatLabel>
                  <StatNumber fontSize="3xl" fontWeight="bold" fontFamily="Helvetica">
                    {purchases.filter(p => p.status === "Pending").length}
                  </StatNumber>
                </Stat>
                <Center>
                  <Circle size="50px" bg="orange.400" color="white">
                    <Icon as={FiClock} boxSize={6} />
                  </Circle>
                </Center>
              </Flex>
            </CardBody>
          </Card>
          
          <Card shadow="md" border="1px solid" borderColor="gray.200">
            <CardBody p={4}>
              <Flex justify="space-between">
                <Stat>
                  <StatLabel color="gray.500" fontFamily="Helvetica">Received</StatLabel>
                  <StatNumber fontSize="3xl" fontWeight="bold" fontFamily="Helvetica">
                    {purchases.filter(p => p.status === "Received").length}
                  </StatNumber>
                </Stat>
                <Center>
                  <Circle size="50px" bg="green.500" color="white">
                    <Icon as={FiCheck} boxSize={6} />
                  </Circle>
                </Center>
              </Flex>
            </CardBody>
          </Card>
          
          <Card shadow="md" border="1px solid" borderColor="gray.200">
            <CardBody p={4}>
              <Flex justify="space-between">
                <Stat>
                  <StatLabel color="gray.500" fontFamily="Helvetica">Total Value</StatLabel>
                  <StatNumber fontSize="3xl" fontWeight="bold" fontFamily="Helvetica">₱{formatNumber(
                    purchases.reduce((sum, purchase) => sum + (Number(purchase.totalAmount) || 0), 0), 2
                  )}</StatNumber>
                </Stat>
                <Center>
                  <Circle size="50px" bg="blue.500" color="white">
                    <Icon as={FiDollarSign} boxSize={6} />
                  </Circle>
                </Center>
              </Flex>
            </CardBody>
          </Card>
        </SimpleGrid>
        
        {/* Search Bar */}
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
              placeholder="Search by purchase ID or item name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              borderRadius="md"
              focusBorderColor="#550000"
            />
          </InputGroup>
          <Select
            maxW="200px"
            ml={4}
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            borderRadius="md"
            bg="white"
            borderColor="gray.200"
          >
            <option value="All">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Received">Received</option>
          </Select>
          <Button
            leftIcon={<AddIcon />}
            bg="#550000"
            color="white"
            _hover={{ bg: "#770000" }}
            onClick={onOpen}
            size="md"
            px={6}
          >
            Add Purchase
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
        </Flex>

        {/* Purchases Table */}
        <Box 
          borderRadius="lg" 
          shadow="md" 
          overflow="hidden"
          border="1px solid"
          borderColor="gray.200"
          bg="white"
        >
          <Box overflowX="auto">
            {purchases.length === 0 ? (
              <Flex 
                direction="column" 
                align="center" 
                justify="center" 
                p={10} 
              >
                <Icon as={FiPackage} boxSize={12} color="gray.300" mb={4} />
                <Text fontSize="lg" color="gray.500" mb={4}>No purchases found</Text>
          <Button
            leftIcon={<AddIcon />}
            onClick={onOpen}
                  size="md"
                  colorScheme="blue"
                  variant="outline"
          >
                  Create your first purchase
          </Button>
              </Flex>
            ) : (
          <Table variant="simple" fontFamily="Helvetica">
                <Thead bg="#f8f9fa">
              <Tr>
                <Th fontFamily="Helvetica">Purchase ID</Th>
                <Th fontFamily="Helvetica">Item</Th>
                <Th fontFamily="Helvetica">Warehouse</Th>
                <Th textAlign="center" fontFamily="Helvetica">Quantity</Th>
                <Th isNumeric fontFamily="Helvetica">Unit Price</Th>
                <Th isNumeric fontFamily="Helvetica">Gross</Th>
                <Th isNumeric fontFamily="Helvetica">Net of VAT</Th>
                <Th isNumeric fontFamily="Helvetica">VAT Amount</Th>
                <Th isNumeric fontFamily="Helvetica">EWT</Th>
                <Th isNumeric fontFamily="Helvetica">Paid Amount</Th>
                <Th fontFamily="Helvetica">Order Date</Th>
                <Th fontFamily="Helvetica">Date Received</Th>
                <Th fontFamily="Helvetica">Official Receipt</Th>
                <Th fontFamily="Helvetica">Status</Th>
                <Th fontFamily="Helvetica">Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
                  {getCurrentPagePurchases().map((purchase) => (
                      <Tr 
                        key={purchase._id}
                        _hover={{ bg: "#f8f9fa" }}
                        transition="background-color 0.2s"
                      >
                        <Td fontFamily="Helvetica">{purchase.purchaseID}</Td>
                      <Td fontFamily="Helvetica">{purchase.itemID?.itemName}</Td>
                      <Td fontFamily="Helvetica">{purchase.warehouseID?.name}</Td>
                        <Td textAlign="center" fontFamily="Helvetica">{formatNumber(purchase.quantity)}</Td>
                        <Td isNumeric fontFamily="Helvetica">₱{formatNumber(purchase.unitPrice, 2)}</Td>
                        <Td isNumeric fontFamily="Helvetica">₱{formatNumber(purchase.gross, 2)}</Td>
                        <Td isNumeric fontFamily="Helvetica">₱{formatNumber(purchase.netOfVat, 2)}</Td>
                        <Td isNumeric fontFamily="Helvetica">₱{formatNumber(purchase.vatAmount, 2)}</Td>
                        <Td isNumeric fontFamily="Helvetica">₱{formatNumber(purchase.ewt, 2)}</Td>
                        <Td isNumeric fontFamily="Helvetica">₱{formatNumber(purchase.paidAmount, 2)}</Td>
                        <Td fontFamily="Helvetica">{new Date(purchase.orderDate).toLocaleDateString()}</Td>
                        <Td fontFamily="Helvetica">{purchase.dateReceived ? new Date(purchase.dateReceived).toLocaleDateString() : '—'}</Td>
                        <Td fontFamily="Helvetica">
                          {purchase.officialReceiptImage ? (
                            <Button 
                              size="xs" 
                              variant="link" 
                              colorScheme="blue"
                              onClick={() => {
                                const imageUrl = `${process.env.NEXT_PUBLIC_BACKEND_API}/uploads/receipts/${purchase.officialReceiptImage}`;
                                handleViewReceiptClick(imageUrl);
                              }}
                            >
                              View Receipt
                            </Button>
                          ) : (
                            '—'
                          )}
                        </Td>
                      <Td>
                        <Badge
                          onClick={() => handleStatusClick(purchase)}
                          cursor="pointer"
                            px={2}
                            py={1}
                            borderRadius="full"
                            textTransform="capitalize"
                            fontWeight="medium"
                          colorScheme={
                            purchase.status === "Received"
                              ? "green"
                              : purchase.status === "Cancelled"
                              ? "red"
                              : "yellow"
                          }
                        >
                          {purchase.status}
                        </Badge>
                      </Td>
                      <Td>
                          <HStack spacing={1}>
                            <Tooltip label={hasEditAccess ? "Edit Purchase" : "Request access to edit"}>
                        <IconButton
                          icon={<EditIcon />}
                          aria-label="Edit"
                          size="sm"
                                colorScheme="blue"
                                variant="ghost"
                          onClick={() => handleEditClick(purchase)}
                          isDisabled={!hasEditAccess}
                        />
                            </Tooltip>
                            <Tooltip label="Change Status">
                              <IconButton
                                icon={<RepeatIcon />}
                                aria-label="Change Status"
                                size="sm"
                                colorScheme="green"
                                variant="ghost"
                                onClick={() => handleStatusClick(purchase)}
                              />
                            </Tooltip>
                            <Tooltip label={hasDeleteAccess ? "Delete Purchase" : "Request access to delete"}>
                              <IconButton
                                icon={<DeleteIcon />}
                                aria-label="Delete"
                                size="sm"
                                colorScheme="red"
                                variant="ghost"
                                onClick={() => handleDeleteClick(purchase)}
                                isDisabled={!hasDeleteAccess || purchase.status === "Received"}
                              />
                            </Tooltip>
                          </HStack>
                      </Td>
                    </Tr>
                  ))
                  }
            </Tbody>
          </Table>
            )}
          </Box>
          
          {/* Pagination */}
          {totalItems > 0 && (
            <Box px={4} py={4} borderTop="1px solid" borderColor="gray.200">
              <Flex justify="space-between" align="center">
                <Text fontSize="sm" color="gray.600">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} purchases
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

      {/* Add Purchase Modal */}
      <Modal isOpen={isOpen} onClose={!isAdding ? onClose : undefined} size="3xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Add New Purchase</ModalHeader>
          {!isAdding && <ModalCloseButton />} 
          <ModalBody pb={6}>
            <form onSubmit={handleSubmit}>
            <VStack spacing={6} align="stretch">
              <FormControl isRequired position="relative">
                <FormLabel fontWeight="medium" fontFamily="Helvetica">Supplier</FormLabel>
                <InputGroup>
                  <Input
                    value={supplierInput}
                    onChange={e => {
                      setSupplierInput(e.target.value);
                      setShowSupplierOptions(true);
                      setFormData({ ...formData, supplier: e.target.value });
                    }}
                    placeholder="Type or select a supplier"
                    onFocus={() => setShowSupplierOptions(true)}
                    onBlur={() => setTimeout(() => setShowSupplierOptions(false), 200)}
                    pr="4.5rem"
                  />
                  <InputRightElement width="4.5rem">
                    <Button
                      h="1.75rem"
                      size="sm"
                      colorScheme="blue"
                      onClick={handleAddSupplier}
                      isLoading={isAddingSupplier}
                      title="Add New Supplier"
                    >
                      <AddIcon />
                    </Button>
                  </InputRightElement>
                </InputGroup>
                {showSupplierOptions && filteredSuppliers.length > 0 && (
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
                    {filteredSuppliers.map((company) => {
                      const supplierObj = suppliers.find(s => s.company === company);
                      return (
                        <Flex
                          key={company}
                          align="center"
                          justify="space-between"
                          p={2}
                          cursor="pointer"
                          _hover={{ bg: "gray.100" }}
                          onClick={() => {
                            setSupplierInput(company);
                            setFormData({ ...formData, supplier: company });
                            setShowSupplierOptions(false);
                          }}
                          role="group"
                        >
                          <Box flex="1">{company}</Box>
                          <CloseButton
                            size="sm"
                            ml={2}
                            colorScheme="red"
                            onClick={e => {
                              e.stopPropagation();
                              handleDeleteSupplier(supplierObj?._id, company);
                            }}
                            aria-label={`Delete ${company}`}
                            _groupHover={{ opacity: 1 }}
                          />
                        </Flex>
                      );
                    })}
                  </Box>
                )}
              </FormControl>

              <FormControl isRequired>
                <FormLabel fontWeight="medium" fontFamily="Helvetica">Category</FormLabel>
                <Select
                  value={formData.categoryID}
                  onChange={e => setFormData({ ...formData, categoryID: e.target.value, warehouseID: "", itemID: "" })}
                  placeholder="Select category"
                  size="md"
                  focusBorderColor="#550000"
                  borderRadius="md"
                >
                  {categories.map(category => (
                    <option key={category._id} value={category._id}>
                      {category.categoryName}
                    </option>
                  ))}
                </Select>
              </FormControl>

              <FormControl isRequired>
                <FormLabel fontWeight="medium" fontFamily="Helvetica">Warehouse</FormLabel>
                <Select
                  value={formData.warehouseID}
                  onChange={(e) => setFormData({ ...formData, warehouseID: e.target.value, itemID: "" })}
                  placeholder="Select warehouse"
                  size="md"
                  focusBorderColor="#550000"
                  borderRadius="md"
                >
                  {warehouses.map((warehouse) => (
                    <option key={warehouse._id} value={warehouse._id}>
                      {warehouse.name}
                    </option>
                  ))}
                </Select>
              </FormControl>

              <FormControl isRequired>
                <FormLabel fontWeight="medium" fontFamily="Helvetica">Item</FormLabel>
                <Select
                  value={formData.itemID}
                  onChange={(e) => setFormData({ ...formData, itemID: e.target.value })}
                  placeholder="Select item"
                  isDisabled={!formData.warehouseID}
                  size="md"
                  focusBorderColor="#550000"
                  borderRadius="md"
                >
                  {filteredItems.map((item) => (
                    <option key={item._id} value={item._id}>
                      {item.itemName}
                    </option>
                  ))}
                </Select>
                {!formData.warehouseID && (
                  <Text fontSize="sm" color="gray.500" mt={1}>
                    Please select a warehouse first
                  </Text>
                )}
              </FormControl>

              <SimpleGrid columns={2} spacing={5}>
              <FormControl isRequired>
                  <FormLabel fontWeight="medium" fontFamily="Helvetica">Quantity</FormLabel>
                  <NumberInput min={1} size="md">
                  <NumberInputField
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    placeholder="Enter quantity"
                      focusBorderColor="#550000"
                      borderRadius="md"
                  />
                </NumberInput>
              </FormControl>

              <FormControl isRequired>
                  <FormLabel fontWeight="medium" fontFamily="Helvetica">Unit Price (₱)</FormLabel>
                  <NumberInput min={0} precision={2} size="md">
                  <NumberInputField
                    value={formData.unitPrice}
                    onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
                    placeholder="Enter unit price"
                      focusBorderColor="#550000"
                      borderRadius="md"
                  />
                </NumberInput>
              </FormControl>
              </SimpleGrid>

              <FormControl isRequired>
                <FormLabel fontWeight="medium" fontFamily="Helvetica">Gross (₱)</FormLabel>
                <Flex 
                  align="center" 
                  p={2} 
                  borderRadius="md" 
                  bg="blue.50" 
                  border="1px solid" 
                  borderColor="blue.200"
                >
                  <Icon as={FiDollarSign} color="blue.500" mr={2} />
                  <Text fontSize="xl" fontFamily="Helvetica">
                    {"₱" + formatNumber(formData.quantity && formData.unitPrice ? Number(formData.quantity) * Number(formData.unitPrice) : 0, 2)}
                  </Text>
                </Flex>
              </FormControl>

              <FormControl isRequired>
                <FormLabel fontWeight="medium" fontFamily="Helvetica">Net of VAT (₱)</FormLabel>
                <Input
                  value={formatNumber(formData.netOfVat, 2)}
                  isReadOnly
                  bg="gray.50"
                  borderColor="gray.200"
                  fontWeight="bold"
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel fontWeight="medium" fontFamily="Helvetica">VAT Amount (₱)</FormLabel>
                <Input
                  value={formatNumber(formData.vatAmount, 2)}
                  isReadOnly
                  bg="gray.50"
                  borderColor="gray.200"
                  fontWeight="bold"
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel fontWeight="medium" fontFamily="Helvetica">EWT (₱)</FormLabel>
                <Input
                  value={formatNumber(formData.ewt, 2)}
                  isReadOnly
                  bg="gray.50"
                  borderColor="gray.200"
                  fontWeight="bold"
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel fontWeight="medium" fontFamily="Helvetica">Paid Amount (₱)</FormLabel>
                <Input
                  value={formatNumber(formData.paidAmount, 2)}
                  isReadOnly
                  bg="gray.50"
                  borderColor="gray.200"
                  fontWeight="bold"
                />
              </FormControl>

              <SimpleGrid columns={2} spacing={5}>
              <FormControl isRequired>
                  <FormLabel fontWeight="medium" fontFamily="Helvetica">Order Date</FormLabel>
                <Input
                  type="date"
                  value={formData.orderDate}
                  onChange={(e) => setFormData({ ...formData, orderDate: e.target.value })}
                    size="md"
                    focusBorderColor="#550000"
                    borderRadius="md"
                />
              </FormControl>

              <FormControl>
                  <FormLabel fontWeight="medium" fontFamily="Helvetica">Remarks</FormLabel>
                <Input
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  placeholder="Enter remarks"
                    size="md"
                    focusBorderColor="#550000"
                    borderRadius="md"
                />
              </FormControl>
              </SimpleGrid>
            </VStack>
            </form>
          </ModalBody>

          <ModalFooter>
            <Button
              colorScheme="blue" 
              mr={3}
              onClick={handleSubmit}
              isLoading={isAdding}
              loadingText="Adding..."
              isDisabled={isAdding}
            >
              Add Purchase
            </Button>
            <Button onClick={onClose} isDisabled={isAdding}>Cancel</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Edit Purchase Modal */}
      <Modal isOpen={isEditModalOpen} onClose={!isEditing ? () => setIsEditModalOpen(false) : undefined} size="3xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Edit Purchase</ModalHeader>
          {!isEditing && <ModalCloseButton />} 
          <ModalBody pb={6}>
            <VStack spacing={6} align="stretch">
              <FormControl isRequired>
                <FormLabel fontWeight="medium" fontFamily="Helvetica">Warehouse</FormLabel>
                <Select
                  value={selectedPurchase?.warehouseID || ''}
                  onChange={(e) => setSelectedPurchase(prev => ({
                    ...prev,
                    warehouseID: e.target.value,
                    itemID: "" // Reset item selection when warehouse changes
                  }))}
                  placeholder="Select warehouse"
                  size="md"
                  focusBorderColor="#550000"
                  borderRadius="md"
                >
                  {warehouses.map((warehouse) => (
                    <option key={warehouse._id} value={warehouse._id}>
                      {warehouse.name}
                    </option>
                  ))}
                </Select>
              </FormControl>
              
              <FormControl isRequired>
                <FormLabel fontWeight="medium" fontFamily="Helvetica">Item</FormLabel>
                <Select
                  value={selectedPurchase?.itemID || ''}
                  onChange={(e) => setSelectedPurchase(prev => ({
                    ...prev,
                    itemID: e.target.value
                  }))}
                  placeholder="Select item"
                  isDisabled={!selectedPurchase?.warehouseID}
                  size="md"
                  focusBorderColor="#550000"
                  borderRadius="md"
                >
                  {items
                    .filter(item => 
                      item.warehouseID?._id === selectedPurchase?.warehouseID || 
                      item.warehouseID === selectedPurchase?.warehouseID
                    )
                    .map((item) => (
                      <option key={item._id} value={item._id}>
                        {item.itemName}
                      </option>
                    ))
                  }
                </Select>
              </FormControl>

              <SimpleGrid columns={2} spacing={5}>
              <FormControl isRequired>
                  <FormLabel fontWeight="medium" fontFamily="Helvetica">Quantity</FormLabel>
                  <NumberInput min={1} size="md">
                  <NumberInputField
                    value={selectedPurchase?.quantity || ''}
                    onChange={(e) => setSelectedPurchase(prev => ({
                      ...prev,
                      quantity: e.target.value
                    }))}
                    placeholder="Enter quantity"
                      focusBorderColor="#550000"
                      borderRadius="md"
                  />
                </NumberInput>
              </FormControl>

              <FormControl isRequired>
                  <FormLabel fontWeight="medium" fontFamily="Helvetica">Unit Price (₱)</FormLabel>
                  <NumberInput min={0} precision={2} size="md">
                  <NumberInputField
                    value={selectedPurchase?.unitPrice || ''}
                    onChange={(e) => setSelectedPurchase(prev => ({
                      ...prev,
                      unitPrice: e.target.value
                    }))}
                    placeholder="Enter unit price"
                      focusBorderColor="#550000"
                      borderRadius="md"
                  />
                </NumberInput>
              </FormControl>
              </SimpleGrid>

              <FormControl isRequired>
                <FormLabel fontWeight="medium" fontFamily="Helvetica">Total Amount (₱)</FormLabel>
                <Flex 
                  align="center" 
                  p={2} 
                  borderRadius="md" 
                  bg="blue.50" 
                  border="1px solid" 
                  borderColor="blue.200"
                >
                  <Icon as={FiDollarSign} color="blue.500" mr={2} />
                  <Text fontSize="xl" fontFamily="Helvetica">
                    {
                    selectedPurchase?.quantity && selectedPurchase?.unitPrice 
                        ? "₱" + formatNumber((Number(selectedPurchase.quantity) * Number(selectedPurchase.unitPrice)), 2)
                        : '₱0.00'
                    }
                  </Text>
                </Flex>
              </FormControl>

              <SimpleGrid columns={2} spacing={5}>
              <FormControl isRequired>
                  <FormLabel fontWeight="medium" fontFamily="Helvetica">Order Date</FormLabel>
                <Input
                  type="date"
                  value={selectedPurchase?.orderDate || ''}
                  onChange={(e) => setSelectedPurchase(prev => ({
                    ...prev,
                    orderDate: e.target.value
                  }))}
                    size="md"
                    focusBorderColor="#550000"
                    borderRadius="md"
                />
              </FormControl>

              <FormControl>
                  <FormLabel fontWeight="medium" fontFamily="Helvetica">Remarks</FormLabel>
                  <Input
                    value={selectedPurchase?.remarks || ''}
                    onChange={(e) => setSelectedPurchase(prev => ({
                      ...prev,
                      remarks: e.target.value
                    }))}
                    placeholder="Enter remarks"
                    size="md"
                    focusBorderColor="#550000"
                    borderRadius="md"
                  />
                </FormControl>
              </SimpleGrid>

              <FormControl>
                <FormLabel fontWeight="medium" fontFamily="Helvetica">Status</FormLabel>
                <Select
                  value={selectedPurchase?.status || 'Pending'}
                  onChange={(e) => setSelectedPurchase(prev => ({
                    ...prev,
                    status: e.target.value
                  }))}
                  size="md"
                  focusBorderColor="#550000"
                  borderRadius="md"
                >
                  <option value="Pending">Pending</option>
                  <option value="Received">Received</option>
                  <option value="Cancelled">Cancelled</option>
                </Select>
              </FormControl>

              {selectedPurchase?.status === 'Received' && (
                <FormControl isRequired>
                  <FormLabel fontWeight="medium" fontFamily="Helvetica">Date Received</FormLabel>
                <Input
                    type="date"
                    value={selectedPurchase?.dateReceived ? new Date(selectedPurchase.dateReceived).toISOString().split('T')[0] : ''}
                    onChange={(e) => setSelectedPurchase({ 
                      ...selectedPurchase, 
                      dateReceived: e.target.value 
                    })}
                    min={selectedPurchase?.orderDate ? new Date(selectedPurchase.orderDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}
                    size="md"
                    focusBorderColor="#550000"
                    borderRadius="md"
                  />
                  <Text fontSize="xs" color="gray.500" mt={1} fontFamily="Helvetica">
                    Date received must be on or after the order date: {selectedPurchase?.orderDate ? new Date(selectedPurchase.orderDate).toLocaleDateString() : ''}
                  </Text>
              </FormControl>
              )}

              {selectedPurchase?.status === 'Received' && (
                <FormControl isRequired>
                  <FormLabel fontWeight="medium" fontFamily="Helvetica">Arrived Quantity</FormLabel>
                  <Input
                    type="number"
                    min={0}
                    max={selectedPurchase?.quantity || 0}
                    value={selectedPurchase?.arrivedQuantity || ''}
                    onChange={(e) => setSelectedPurchase(prev => ({
                      ...prev,
                      arrivedQuantity: e.target.value
                    }))}
                    size="md"
                    focusBorderColor="#550000"
                    borderRadius="md"
                  />
                  <Text fontSize="sm" color="gray.500" mt={1}>
                    {(selectedPurchase?.arrivedQuantity || 0)} / {(selectedPurchase?.quantity || 0)}
                  </Text>
                </FormControl>
              )}

              {selectedPurchase?.status === 'Received' && (
                <FormControl>
                  <FormLabel fontWeight="medium" fontFamily="Helvetica">Total (₱)</FormLabel>
                  <Flex align="center" p={2} borderRadius="md" bg="blue.50" border="1px solid" borderColor="blue.200">
                    <Text fontSize="xl" fontFamily="Helvetica">
                      ₱{formatNumber((selectedPurchase?.arrivedQuantity || 0) * (selectedPurchase?.unitPrice || 0), 2)}
                    </Text>
                  </Flex>
                </FormControl>
              )}

              {selectedPurchase?.status === 'Received' && (
                <FormControl>
                  <FormLabel fontWeight="medium" fontFamily="Helvetica">Remarks</FormLabel>
                  <Textarea
                    value={selectedPurchase?.remarks || ''}
                    onChange={(e) => setSelectedPurchase(prev => ({
                      ...prev,
                      remarks: e.target.value
                    }))}
                    placeholder="Enter remarks"
                    size="md"
                    focusBorderColor="#550000"
                    borderRadius="md"
                  />
                </FormControl>
              )}

              {selectedPurchase?.status === 'Received' && (
                <FormControl mt={4}> 
                  <FormLabel fontWeight="medium" fontFamily="Helvetica">Official Receipt Image</FormLabel>
                  <Input
                    type="file"
                    onChange={(e) => setOfficialReceiptFile(e.target.files[0])}
                    size="md"
                    focusBorderColor="#550000"
                    borderRadius="md"
                    p={1.5}
                    accept="image/*"
                  />
                </FormControl>
              )}
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button
              colorScheme="blue" 
              mr={3}
              onClick={handleEditSubmit}
              isLoading={isEditing}
              loadingText="Saving..."
              isDisabled={isEditing}
            >
              Save Changes
            </Button>
            <Button onClick={() => setIsEditModalOpen(false)} isDisabled={isEditing}>Cancel</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Status Change Modal */}
      <Modal isOpen={isStatusModalOpen} onClose={!isUpdatingStatus ? () => setIsStatusModalOpen(false) : undefined} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Update Purchase Status</ModalHeader>
          {!isUpdatingStatus && <ModalCloseButton />} 
          <ModalBody pb={6}>
            <VStack spacing={5} align="stretch">
              <Box>
                <Text fontWeight="medium" mb={2} fontFamily="Helvetica">Purchase Information</Text>
                <Flex bg="blue.50" p={3} borderRadius="md" direction="column" gap={1}>
                  <Flex justify="space-between">
                    <Text color="gray.600" fontFamily="Helvetica">ID:</Text>
                    <Text fontWeight="bold" fontFamily="Helvetica">{selectedStatusPurchase?.purchaseID}</Text>
                  </Flex>
                  <Flex justify="space-between">
                    <Text color="gray.600" fontFamily="Helvetica">Item:</Text>
                    <Text fontWeight="bold" fontFamily="Helvetica">{
                      items.find(i => i._id === selectedStatusPurchase?.itemID)?.itemName ||
                      selectedStatusPurchase?.itemID?.itemName ||
                      'N/A'
                    }</Text>
                  </Flex>
                  <Flex justify="space-between">
                    <Text color="gray.600" fontFamily="Helvetica">Total:</Text>
                    <Text fontFamily="Helvetica">
                      ₱{formatNumber(selectedStatusPurchase?.totalAmount || 0, 2)}
                    </Text>
                  </Flex>
                </Flex>
              </Box>

              <FormControl isRequired>
                <FormLabel fontWeight="medium" fontFamily="Helvetica">Status</FormLabel>
                <Select
                  value={selectedStatusPurchase?.status || 'Pending'}
                  onChange={(e) => setSelectedStatusPurchase(prev => ({
                    ...prev,
                    status: e.target.value
                  }))}
                  size="md"
                  focusBorderColor="#550000"
                  borderRadius="md"
                >
                  <option value="Pending">Pending</option>
                  <option value="Received">Received</option>
                  <option value="Cancelled">Cancelled</option>
                </Select>
              </FormControl>

              {selectedStatusPurchase?.status === 'Received' && (
                <FormControl isRequired>
                  <FormLabel fontWeight="medium" fontFamily="Helvetica">Date Received</FormLabel>
                <Input
                    type="date"
                    value={selectedStatusPurchase?.dateReceived ? new Date(selectedStatusPurchase.dateReceived).toISOString().split('T')[0] : ''}
                    onChange={(e) => setSelectedStatusPurchase({ 
                      ...selectedStatusPurchase, 
                      dateReceived: e.target.value
                    })}
                    min={selectedStatusPurchase?.orderDate ? new Date(selectedStatusPurchase.orderDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}
                    size="md"
                    focusBorderColor="#550000"
                    borderRadius="md"
                  />
                  <Text fontSize="xs" color="gray.500" mt={1} fontFamily="Helvetica">
                    Date received must be on or after the order date: {selectedStatusPurchase?.orderDate ? new Date(selectedStatusPurchase.orderDate).toLocaleDateString() : ''}
                  </Text>
                </FormControl>
              )}

              {selectedStatusPurchase?.status === 'Received' && (
                <FormControl isRequired>
                  <FormLabel fontWeight="medium" fontFamily="Helvetica">Arrived Quantity</FormLabel>
                  <Input
                    type="number"
                    min={0}
                    max={selectedStatusPurchase?.quantity || 0}
                    value={selectedStatusPurchase?.arrivedQuantity || ''}
                    onChange={(e) => setSelectedStatusPurchase(prev => ({
                      ...prev,
                      arrivedQuantity: e.target.value
                    }))}
                    size="md"
                    focusBorderColor="#550000"
                    borderRadius="md"
                    isInvalid={isArrivedQtyExceeded}
                  />
                  <Text fontSize="sm" color="gray.500" mt={1}>
                    {(selectedStatusPurchase?.arrivedQuantity || 0)} / {(selectedStatusPurchase?.quantity || 0)}
                  </Text>
                  {isArrivedQtyExceeded && (
                    <Text fontSize="sm" color="red.500" mt={1} fontWeight="bold">
                      Amount Exceeded
                    </Text>
                  )}
                </FormControl>
              )}

              {selectedStatusPurchase?.status === 'Received' && (
                <FormControl>
                  <FormLabel fontWeight="medium" fontFamily="Helvetica">Total (₱)</FormLabel>
                  <Flex align="center" p={2} borderRadius="md" bg="blue.50" border="1px solid" borderColor="blue.200">
                    <Text fontSize="xl" fontFamily="Helvetica">
                      ₱{formatNumber(getProportionalPaidAmount(), 2)}
                    </Text>
                  </Flex>
                </FormControl>
              )}

              {selectedStatusPurchase?.status === 'Received' && (
                <FormControl>
                  <FormLabel fontWeight="medium" fontFamily="Helvetica">Remarks</FormLabel>
                  <Textarea
                    value={selectedStatusPurchase?.remarks || ''}
                    onChange={(e) => setSelectedStatusPurchase(prev => ({
                      ...prev,
                      remarks: e.target.value
                    }))}
                    placeholder="Enter remarks"
                    size="md"
                    focusBorderColor="#550000"
                    borderRadius="md"
                  />
                </FormControl>
              )}

              {selectedStatusPurchase?.status === 'Received' && (
                <FormControl mt={4}> 
                  <FormLabel fontWeight="medium" fontFamily="Helvetica">Official Receipt Image</FormLabel>
                  <Input
                    type="file"
                    onChange={(e) => setOfficialReceiptFile(e.target.files[0])}
                    size="md"
                    focusBorderColor="#550000"
                    borderRadius="md"
                    p={1.5}
                    accept="image/*"
                  />
                </FormControl>
              )}
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button
              colorScheme="blue"
              mr={3}
              onClick={handleStatusChangeSubmit}
              isLoading={isUpdatingStatus}
              loadingText="Updating..."
              isDisabled={isUpdatingStatus || isArrivedQtyExceeded}
            >
              Update Status
            </Button>
            <Button onClick={() => setIsStatusModalOpen(false)} isDisabled={isUpdatingStatus}>Cancel</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Receipt View Modal */}
      <Modal isOpen={isReceiptModalOpen} onClose={onReceiptModalClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Official Receipt</ModalHeader>
          <ModalCloseButton />
          <ModalBody textAlign="center"> 
            {viewingReceiptUrl ? (
              <Image src={viewingReceiptUrl} alt="Official Receipt" maxH="80vh" mx="auto" />
            ) : (
              <Text>No image to display.</Text>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" onClick={onReceiptModalClose}>
              Close
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
              Delete Purchase
            </AlertDialogHeader>

            <AlertDialogBody>
              Are you sure you want to delete Purchase ID 
              "<strong>{purchaseToDelete?.purchaseID}</strong>" for item 
              "<strong>{purchaseToDelete?.itemID?.itemName}</strong>"? 
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

      {/* Request Access Modal */}
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

export default Purchase;
