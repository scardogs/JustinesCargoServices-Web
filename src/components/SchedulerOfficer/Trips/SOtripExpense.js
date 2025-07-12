import { useState, useEffect, useRef } from "react";
import {
  Box,
  Button,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  ModalFooter,
  FormControl,
  FormLabel,
  Input,
  IconButton,
  Flex,
  Text,
  HStack,
  VStack,
  Heading,
  TableContainer,
  Badge,
  InputGroup,
  InputLeftElement,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  useDisclosure,
  Spinner,
  Center,
  Textarea,
  Icon,
  Select,
} from "@chakra-ui/react";
import { DeleteIcon, ChevronLeftIcon, AddIcon, EditIcon } from "@chakra-ui/icons";
import { FiClock } from "react-icons/fi";
import axios from "axios";
import React from 'react';

const formatRemainingTime = (milliseconds) => {
  if (milliseconds <= 0) return "00:00:00";
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
};

const TripExpense = ({ isOpen, onClose, tripId }) => {
  const [tripExpenses, setTripExpenses] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [currentTrip, setCurrentTrip] = useState(null);
  const [isLoadingTrip, setIsLoadingTrip] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    ExpenseName: "",
    description: "",
    value: 0,
    dateTime: new Date().toISOString().split("T")[0],
    expenseCategory: "Operating Expenses",
    liquidationNumber: "",
    DeliveryReceipt: "",
    receiptNo: "",
    Vessel: "",
    fwNumber: "",
    noOfDrops: "",
    consignee: "",
  });
  const [editingExpenseId, setEditingExpenseId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useToast();
  const { isOpen: isDeleteConfirmOpen, onOpen: openDeleteConfirmModal, onClose: closeDeleteConfirmModal } = useDisclosure();
  const [deletingExpenseId, setDeletingExpenseId] = useState(null);
  const [isDeletingTripExpense, setIsDeletingTripExpense] = useState(false);
  const cancelRef = React.useRef();
  const [isEditRequestOpen, setIsEditRequestOpen] = useState(false);
  const [editRequestRemarks, setEditRequestRemarks] = useState("");
  const [isSubmittingEditRequest, setIsSubmittingEditRequest] = useState(false);
  const [isEditAccessApproved, setIsEditAccessApproved] = useState(false);
  const [editAccessExpirationTime, setEditAccessExpirationTime] = useState(null);
  const [editAccessTimerDisplay, setEditAccessTimerDisplay] = useState(null);
  const editAccessTimerIntervalRef = useRef(null);
  const [isDeleteRequestOpen, setIsDeleteRequestOpen] = useState(false);
  const [deleteRequestRemarks, setDeleteRequestRemarks] = useState("");
  const [isSubmittingDeleteRequest, setIsSubmittingDeleteRequest] = useState(false);
  const [isDeleteAccessApproved, setIsDeleteAccessApproved] = useState(false);
  const [deleteAccessExpirationTime, setDeleteAccessExpirationTime] = useState(null);
  const [deleteAccessTimerDisplay, setDeleteAccessTimerDisplay] = useState(null);
  const deleteAccessTimerIntervalRef = useRef(null);

  useEffect(() => {
    const fetchTripData = async () => {
      if (!tripId) return;
      setIsLoadingTrip(true);
      try {
        const response = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_API}/api/trips/${tripId}`);
        setCurrentTrip(response.data);
      } catch (error) {
        console.error("Error fetching trip data for expense modal:", error);
        toast({ title: "Error", description: "Failed to load trip data.", status: "error", duration: 3000 });
        onClose();
      } finally {
        setIsLoadingTrip(false);
      }
    };

    if (isOpen && tripId) {
      fetchTripData();
      fetchTripExpenses();
    } else {
      setCurrentTrip(null);
      setTripExpenses([]);
      resetForm();
    }
  }, [isOpen, tripId]);

  useEffect(() => {
    if (!isOpen) {
      setTripExpenses([]);
      setShowForm(false);
      setCurrentTrip(null);
      resetForm();
    }
  }, [isOpen]);

  const fetchTripExpenses = async () => {
    if (!tripId) return;
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/trip-expenses?tripID=${tripId}`
      );
      setTripExpenses(response.data);
    } catch (error) {
      console.error("Error fetching trip expenses:", error);
      toast({
        title: "Error",
        description: "Failed to fetch trip expenses",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const calculateTotalExpenses = () => {
    return tripExpenses.reduce((total, expense) => total + expense.value, 0);
  };

  const resetForm = () => {
    setExpenseForm({
      ExpenseName: "",
      description: "",
      value: 0,
      dateTime: new Date().toISOString().split("T")[0],
      expenseCategory: "Operating Expenses",
      liquidationNumber: "",
      DeliveryReceipt: "",
      receiptNo: "",
      Vessel: "",
      fwNumber: "",
      noOfDrops: "",
      consignee: "",
    });
    setEditingExpenseId(null);
  };

  const handleAddNew = async () => {
    resetForm();
    // Fetch waybill numbers for the current trip
    if (tripId) {
      try {
        const response = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_API}/api/tripDetails?tripID=${tripId}`);
        const tripDetails = response.data;
        if (tripDetails && tripDetails.length > 0) {
          const waybills = tripDetails.map(td => td.waybillNumber).filter(Boolean).join('/');
          setExpenseForm((prev) => ({ ...prev, fwNumber: waybills }));
        } else {
          setExpenseForm((prev) => ({ ...prev, fwNumber: "" }));
        }
      } catch (error) {
        setExpenseForm((prev) => ({ ...prev, fwNumber: "" }));
      }
    }
    setShowForm(true);
  };

  const handleEdit = (expense) => {
    if (!isEditAccessApproved) {
      toast({
        title: "Access Required",
        description: "You need edit access to modify expenses. Please request access first.",
        status: "warning",
        duration: 5000,
        isClosable: true,
      });
      return;
    }
    setExpenseForm({
      ExpenseName: expense.ExpenseName,
      description: expense.description || "",
      value: expense.value,
      dateTime: new Date(expense.dateTime).toISOString().split("T")[0],
      expenseCategory: expense.expenseCategory,
      liquidationNumber: expense.liquidationNumber || "",
      DeliveryReceipt: expense.DeliveryReceipt || "",
      receiptNo: expense.receiptNo || "",
      Vessel: expense.Vessel || "",
      fwNumber: expense.waybillNumber || expense.fwNumber || "",
      noOfDrops: expense.noOfDrops || "",
      consignee: expense.consignee || "",
    });
    setEditingExpenseId(expense._id);
    setShowForm(true);
  };

  const handleSaveExpense = async (e) => {
    e.preventDefault();
    if (isSubmitting || !tripId || !currentTrip) return;
    setIsSubmitting(true);

    try {
      // --- Date Validation Start ---
      const expenseDate = new Date(expenseForm.dateTime);
      expenseDate.setHours(0, 0, 0, 0); // Normalize time for date comparison

      const loadingDate = new Date(currentTrip.loadingDate);
      loadingDate.setHours(0, 0, 0, 0);

      let arrivalDate = null;
      if (currentTrip.arrivalDate && currentTrip.arrivalDate !== "00/00/0000") {
        arrivalDate = new Date(currentTrip.arrivalDate);
        arrivalDate.setHours(0, 0, 0, 0);
      }

      // Check if expense date is before loading date
      if (expenseDate < loadingDate) {
        toast({
          title: "Invalid Date",
          description: `Expense date cannot be before the loading date (${loadingDate.toLocaleDateString()}).`,
          status: "error",
          duration: 4000,
          isClosable: true,
        });
        setIsSubmitting(false);
        return;
      }

      // If arrival date is set, check if expense date is after arrival date
      if (arrivalDate && expenseDate > arrivalDate) {
        toast({
          title: "Invalid Date",
          description: `Expense date cannot be after the arrival date (${arrivalDate.toLocaleDateString()}).`,
          status: "error",
          duration: 4000,
          isClosable: true,
        });
        setIsSubmitting(false);
        return;
      }

      // Check if expense date is in the future (already handled by input max, but good to double-check)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (expenseDate > today) {
         toast({
          title: "Invalid Date",
          description: "Expense date cannot be in the future.",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
        setIsSubmitting(false);
        return;
      }
      // --- Date Validation End ---

      const formattedData = {
        tripID: tripId,
        ExpenseName: expenseForm.ExpenseName,
        description: expenseForm.description || "",
        value: parseFloat(expenseForm.value),
        dateTime: new Date(expenseForm.dateTime).toISOString(),
        expenseCategory: expenseForm.expenseCategory,
        liquidationNumber: expenseForm.liquidationNumber,
        DeliveryReceipt: expenseForm.DeliveryReceipt,
        receiptNo: expenseForm.receiptNo,
        Vessel: expenseForm.Vessel,
        fwNumber: expenseForm.fwNumber,
        noOfDrops: expenseForm.noOfDrops,
        consignee: expenseForm.consignee,
      };

      console.log("Sending expense data:", formattedData);

      let response;
      if (editingExpenseId) {
        response = await axios.put(
          `${process.env.NEXT_PUBLIC_BACKEND_API}/api/trip-expenses/${editingExpenseId}`,
          formattedData
        );
      } else {
        response = await axios.post(
          `${process.env.NEXT_PUBLIC_BACKEND_API}/api/trip-expenses`,
          formattedData
        );
      }

      if (response.status === 200 || response.status === 201) {
        toast({
          title: "Success",
          description: `Expense ${editingExpenseId ? 'updated' : 'added'} successfully`,
          status: "success",
          duration: 3000,
          isClosable: true,
        });
        resetForm();
        setShowForm(false);
        fetchTripExpenses();
      }
    } catch (error) {
      console.error(`Error ${editingExpenseId ? 'updating' : 'adding'} expense:`, error.response?.data || error);
      toast({
        title: "Error",
        description: error.response?.data?.message || `Failed to ${editingExpenseId ? 'update' : 'add'} expense`,
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openDeleteConfirm = (expenseId) => {
    if (!isEditAccessApproved) {
      toast({
        title: "Access Required",
        description: "You need edit access to delete expenses. Please request access first.",
        status: "warning",
        duration: 5000,
        isClosable: true,
      });
      return;
    }
    setDeletingExpenseId(expenseId);
    openDeleteConfirmModal();
  };

  const confirmDeleteExpense = async () => {
    if (!deletingExpenseId) return;
    setIsDeletingTripExpense(true);

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast({
          title: "Error",
          description: "Authentication token not found. Please log in.",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
        setDeletingExpenseId(null);
        closeDeleteConfirmModal();
        return;
      }

      const response = await axios.delete(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/trip-expenses/${deletingExpenseId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 200) {
        toast({
          title: "Success",
          description: "Expense deleted successfully and logged.",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
        fetchTripExpenses();
      }
    } catch (error) {
      console.error("Error deleting expense:", error);
      const errorDesc = error.response?.data?.message || "Failed to delete expense";
      toast({
        title: "Error",
        description: errorDesc,
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setDeletingExpenseId(null);
      closeDeleteConfirmModal();
      setIsDeletingTripExpense(false);
    }
  };

  const handleEditRequestOpen = async () => {
    const token = localStorage.getItem("token");
    const userString = localStorage.getItem("user");
    if (!token || !userString) {
      toast({ title: "Error", description: "Cannot verify user session.", status: "error" });
      return;
    }

    try {
      const user = JSON.parse(userString);
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/control-panel`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const existingPendingRequest = response.data.find(req =>
        req.Module === "TripExpenses" &&
        req.RequestType === "Edit" &&
        req.Username === user.name &&
        req.Status === "Pending"
      );

      if (existingPendingRequest) {
        toast({
          title: "Pending Request Exists",
          description: `You already have a pending request (${existingPendingRequest.RequestType}) for Trip Expenses access.`,
          status: "warning",
          duration: 5000,
          isClosable: true,
        });
        return;
      }
    } catch (error) {
      console.error("Error checking for pending requests:", error);
      toast({
        title: "Error",
        description: "Could not verify existing requests. Please try again.",
        status: "error",
      });
      return;
    }

    setEditRequestRemarks("");
    setIsSubmittingEditRequest(false);
    setIsEditRequestOpen(true);
  };

  const handleSubmitEditRequest = async () => {
    setIsSubmittingEditRequest(true);
    try {
      const token = localStorage.getItem("token");
      const userString = localStorage.getItem("user");
      if (!token || !userString) throw new Error("Authentication details not found.");
      const user = JSON.parse(userString);
      const generatedRequestID = `REQ-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const payload = {
        RequestID: generatedRequestID,
        Module: "TripExpenses",
        RequestType: "Edit",
        Remarks: editRequestRemarks,
        Username: user.name,
        UserRole: user.workLevel,
      };
      await axios.post(`${process.env.NEXT_PUBLIC_BACKEND_API}/api/control-panel`, payload, { headers: { Authorization: `Bearer ${token}` } });
      toast({ title: "Request Submitted", description: "Your request for edit access has been sent.", status: "success", duration: 5000, isClosable: true });
      setIsEditRequestOpen(false);
    } catch (error) {
      console.error("Error submitting edit access request:", error);
      toast({ title: "Request Failed", description: error.response?.data?.message || error.message || "Could not submit edit access request.", status: "error", duration: 5000, isClosable: true });
    } finally {
      setIsSubmittingEditRequest(false);
    }
  };

  const checkEditAccess = async () => {
    const token = localStorage.getItem("token");
    const userString = localStorage.getItem("user");
    if (!token || !userString) {
      setIsEditAccessApproved(false);
      setEditAccessExpirationTime(null);
      return;
    }

    try {
      const user = JSON.parse(userString);
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/control-panel`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const requests = response.data;
      const now = new Date();

      const approvedEditRequest = requests.find(req =>
        req.Module === "TripExpenses" &&
        req.RequestType === "Edit" &&
        req.Username === user.name &&
        req.Status === "Approved" &&
        (!req.ExpiresAt || new Date(req.ExpiresAt) > now)
      );
      const isEditApproved = !!approvedEditRequest;
      setIsEditAccessApproved(isEditApproved);
      setEditAccessExpirationTime(isEditApproved && approvedEditRequest.ExpiresAt ? new Date(approvedEditRequest.ExpiresAt) : null);
    } catch (error) {
      console.error("Error checking edit access:", error);
    }
  };

  useEffect(() => {
    checkEditAccess();
    const interval = setInterval(checkEditAccess, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (editAccessTimerIntervalRef.current) {
      clearInterval(editAccessTimerIntervalRef.current);
      editAccessTimerIntervalRef.current = null;
      setEditAccessTimerDisplay(null);
    }
    if (editAccessExpirationTime && editAccessExpirationTime > new Date()) {
      const updateTimer = () => {
        const remaining = editAccessExpirationTime - new Date();
        if (remaining <= 0) {
          clearInterval(editAccessTimerIntervalRef.current);
          setEditAccessTimerDisplay(null);
          setEditAccessExpirationTime(null);
          setIsEditAccessApproved(false);
        } else {
          setEditAccessTimerDisplay(formatRemainingTime(remaining));
        }
      };
      updateTimer();
      editAccessTimerIntervalRef.current = setInterval(updateTimer, 1000);
    }
    return () => {
      if (editAccessTimerIntervalRef.current) clearInterval(editAccessTimerIntervalRef.current);
    };
  }, [editAccessExpirationTime]);

  const handleDeleteRequestOpen = async () => {
    const token = localStorage.getItem("token");
    const userString = localStorage.getItem("user");
    if (!token || !userString) {
      toast({ title: "Error", description: "Cannot verify user session.", status: "error" });
      return;
    }

    try {
      const user = JSON.parse(userString);
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/control-panel`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const existingPendingRequest = response.data.find(req =>
        req.Module === "TripExpenses" &&
        req.RequestType === "Delete" &&
        req.Username === user.name &&
        req.Status === "Pending"
      );

      if (existingPendingRequest) {
        toast({
          title: "Pending Request Exists",
          description: `You already have a pending request (${existingPendingRequest.RequestType}) for Trip Expenses access.`,
          status: "warning",
          duration: 5000,
          isClosable: true,
        });
        return;
      }
    } catch (error) {
      console.error("Error checking for pending requests:", error);
      toast({
        title: "Error",
        description: "Could not verify existing requests. Please try again.",
        status: "error",
      });
      return;
    }

    setDeleteRequestRemarks("");
    setIsSubmittingDeleteRequest(false);
    setIsDeleteRequestOpen(true);
  };

  const handleSubmitDeleteRequest = async () => {
    setIsSubmittingDeleteRequest(true);
    try {
      const token = localStorage.getItem("token");
      const userString = localStorage.getItem("user");
      if (!token || !userString) throw new Error("Authentication details not found.");
      const user = JSON.parse(userString);
      const generatedRequestID = `REQ-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const payload = {
        RequestID: generatedRequestID,
        Module: "TripExpenses",
        RequestType: "Delete",
        Remarks: deleteRequestRemarks,
        Username: user.name,
        UserRole: user.workLevel,
      };
      await axios.post(`${process.env.NEXT_PUBLIC_BACKEND_API}/api/control-panel`, payload, { headers: { Authorization: `Bearer ${token}` } });
      toast({ title: "Request Submitted", description: "Your request for delete access has been sent.", status: "success", duration: 5000, isClosable: true });
      setIsDeleteRequestOpen(false);
    } catch (error) {
      console.error("Error submitting delete access request:", error);
      toast({ title: "Request Failed", description: error.response?.data?.message || error.message || "Could not submit delete access request.", status: "error", duration: 5000, isClosable: true });
    } finally {
      setIsSubmittingDeleteRequest(false);
    }
  };

  const checkDeleteAccess = async () => {
    const token = localStorage.getItem("token");
    const userString = localStorage.getItem("user");
    if (!token || !userString) {
      setIsDeleteAccessApproved(false);
      setDeleteAccessExpirationTime(null);
      return;
    }

    try {
      const user = JSON.parse(userString);
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/control-panel`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const requests = response.data;
      const now = new Date();

      const approvedDeleteRequest = requests.find(req =>
        req.Module === "TripExpenses" &&
        req.RequestType === "Delete" &&
        req.Username === user.name &&
        req.Status === "Approved" &&
        (!req.ExpiresAt || new Date(req.ExpiresAt) > now)
      );
      const isDeleteApproved = !!approvedDeleteRequest;
      setIsDeleteAccessApproved(isDeleteApproved);
      setDeleteAccessExpirationTime(isDeleteApproved && approvedDeleteRequest.ExpiresAt ? new Date(approvedDeleteRequest.ExpiresAt) : null);
    } catch (error) {
      console.error("Error checking delete access:", error);
    }
  };

  useEffect(() => {
    checkDeleteAccess();
    const interval = setInterval(checkDeleteAccess, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (deleteAccessTimerIntervalRef.current) {
      clearInterval(deleteAccessTimerIntervalRef.current);
      deleteAccessTimerIntervalRef.current = null;
      setDeleteAccessTimerDisplay(null);
    }
    if (deleteAccessExpirationTime && deleteAccessExpirationTime > new Date()) {
      const updateTimer = () => {
        const remaining = deleteAccessExpirationTime - new Date();
        if (remaining <= 0) {
          clearInterval(deleteAccessTimerIntervalRef.current);
          setDeleteAccessTimerDisplay(null);
          setDeleteAccessExpirationTime(null);
          setIsDeleteAccessApproved(false);
        } else {
          setDeleteAccessTimerDisplay(formatRemainingTime(remaining));
        }
      };
      updateTimer();
      deleteAccessTimerIntervalRef.current = setInterval(updateTimer, 1000);
    }
    return () => {
      if (deleteAccessTimerIntervalRef.current) clearInterval(deleteAccessTimerIntervalRef.current);
    };
  }, [deleteAccessExpirationTime]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="6xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader bg="#1a365d" color="white" py={4}>
          {isLoadingTrip ? (
            <Spinner color="white" />
          ) : currentTrip ? (
            <VStack align="start" spacing={2}>
              <Heading size="md">Trip Expenses</Heading>
              <Text fontSize="sm" color="gray.200">
                Trip ID: {currentTrip.tripID} | Vehicle: {currentTrip.vehicle}
              </Text>
              <Badge
                colorScheme="green"
                fontSize="sm"
                px={2}
                py={1}
                borderRadius="md"
              >
                Total Expenses: {tripExpenses.length}
              </Badge>
            </VStack>
          ) : (
            <Heading size="md">Loading Trip Data...</Heading>
          )}
        </ModalHeader>
        <ModalCloseButton color="white" />
        <ModalBody py={6}>
          {isLoadingTrip ? (
            <Center h="300px">
              <Spinner size="xl" />
            </Center>
          ) : !currentTrip ? (
            <Center h="300px">
              <Text>Could not load trip data.</Text>
            </Center>
          ) : showForm ? (
            <Box>
              <HStack mb={6}>
                <Button
                  leftIcon={<ChevronLeftIcon />}
                  onClick={() => setShowForm(false)}
                  variant="outline"
                  color="#1a365d"
                  borderColor="#1a365d"
                  _hover={{ bg: "gray.50" }}
                >
                  Back to Expenses
                </Button>
                <Heading size="md" color="#1a365d">
                  {editingExpenseId ? "Edit Expense" : "Add Expense"}
                </Heading>
              </HStack>
              <form onSubmit={handleSaveExpense}>
                <VStack spacing={6}>
                  <FormControl as="fieldset">
                    <FormLabel as="legend" color="gray.700">Vessel</FormLabel>
                    <HStack spacing={6}>
                      <label>
                        <input
                          type="radio"
                          name="Vessel"
                          value="Starlite"
                          checked={expenseForm.Vessel === "Starlite"}
                          onChange={() => setExpenseForm({ ...expenseForm, Vessel: "Starlite" })}
                          disabled={isSubmitting}
                          style={{ marginRight: 6 }}
                        />
                        Starlite
                      </label>
                      <label>
                        <input
                          type="radio"
                          name="Vessel"
                          value="2GO"
                          checked={expenseForm.Vessel === "2GO"}
                          onChange={() => setExpenseForm({ ...expenseForm, Vessel: "2GO" })}
                          disabled={isSubmitting}
                          style={{ marginRight: 6 }}
                        />
                        2GO
                      </label>
                    </HStack>
                  </FormControl>
                  <FormControl isRequired>
                    <FormLabel color="gray.700">Date</FormLabel>
                    <Input
                      type="date"
                      value={expenseForm.dateTime}
                      min={currentTrip?.loadingDate ? new Date(currentTrip.loadingDate).toISOString().split("T")[0] : ""}
                      max={new Date().toISOString().split("T")[0]}
                      onChange={(e) => {
                        const selectedDate = new Date(e.target.value);
                        const today = new Date();

                        selectedDate.setHours(0, 0, 0, 0);
                        today.setHours(0, 0, 0, 0);

                        let minDate = null;
                        if(currentTrip?.loadingDate) {
                            minDate = new Date(currentTrip.loadingDate);
                            minDate.setHours(0, 0, 0, 0);
                        }
                        
                        if (minDate && selectedDate < minDate) {
                           toast({
                            title: "Invalid Date",
                            description: `Date cannot be before the loading date (${minDate.toLocaleDateString()}).`,
                            status: "warning",
                            duration: 3000,
                            isClosable: true,
                          });
                          return;
                        }
                        
                        if (selectedDate.getTime() > today.getTime()) {
                          toast({
                            title: "Invalid Date",
                            description: "Expense date cannot be in the future.",
                            status: "error",
                            duration: 3000,
                            isClosable: true,
                          });
                          return;
                        }

                        setExpenseForm({
                          ...expenseForm,
                          dateTime: e.target.value,
                        });
                      }}
                      borderColor="gray.300"
                      _hover={{ borderColor: "blue.300" }}
                      _focus={{
                        borderColor: "blue.500",
                        boxShadow: "0 0 0 1px blue.500",
                      }}
                      isDisabled={isSubmitting}
                      onDoubleClick={(e) => !e.currentTarget.disabled && e.currentTarget.showPicker()}
                    />
                  </FormControl>
                  <FormControl isRequired>
                    <FormLabel color="gray.700">Expense Name</FormLabel>
                    <Input
                      value={expenseForm.ExpenseName}
                      onChange={(e) =>
                        setExpenseForm({
                          ...expenseForm,
                          ExpenseName: e.target.value,
                        })
                      }
                      placeholder="Enter expense name"
                      borderColor="gray.300"
                      _hover={{ borderColor: "blue.300" }}
                      _focus={{
                        borderColor: "blue.500",
                        boxShadow: "0 0 0 1px blue.500",
                      }}
                      isDisabled={isSubmitting}
                    />
                  </FormControl>
                  <FormControl isRequired>
                    <FormLabel color="gray.700">Expense Category</FormLabel>
                    <Select
                      value={expenseForm.expenseCategory}
                      onChange={(e) =>
                        setExpenseForm({
                          ...expenseForm,
                          expenseCategory: e.target.value,
                        })
                      }
                      borderColor="gray.300"
                      _hover={{ borderColor: "blue.300" }}
                      _focus={{
                        borderColor: "blue.500",
                        boxShadow: "0 0 0 1px blue.500",
                      }}
                      isDisabled={isSubmitting}
                    >
                      <option value="Operating Expenses">Operating Expenses</option>
                      <option value="Capital Expenses">Capital Expenses</option>
                      <option value="Maintenance">Maintenance</option>
                      <option value="Utilities">Utilities</option>
                      <option value="Other">Other</option>
                    </Select>
                  </FormControl>
                  <FormControl>
                    <FormLabel color="gray.700">Description</FormLabel>
                    <Input
                      value={expenseForm.description}
                      onChange={(e) =>
                        setExpenseForm({
                          ...expenseForm,
                          description: e.target.value,
                        })
                      }
                      placeholder="Enter description"
                      borderColor="gray.300"
                      _hover={{ borderColor: "blue.300" }}
                      _focus={{
                        borderColor: "blue.500",
                        boxShadow: "0 0 0 1px blue.500",
                      }}
                      isDisabled={isSubmitting}
                    />
                  </FormControl>
                  <FormControl isRequired>
                    <FormLabel color="gray.700">Cost</FormLabel>
                    <InputGroup>
                      <InputLeftElement pointerEvents="none">
                        <Text color="gray.500">₱</Text>
                      </InputLeftElement>
                      <Input
                        type="number"
                        step="0.01"
                        value={expenseForm.value}
                        onChange={(e) =>
                          setExpenseForm({
                            ...expenseForm,
                            value: e.target.value === '' ? '' : parseFloat(e.target.value),
                          })
                        }
                        placeholder="Enter cost"
                        pl="2rem"
                        borderColor="gray.300"
                        _hover={{ borderColor: "blue.300" }}
                        _focus={{
                          borderColor: "blue.500",
                          boxShadow: "0 0 0 1px blue.500",
                        }}
                        isDisabled={isSubmitting}
                      />
                    </InputGroup>
                  </FormControl>
                  <FormControl>
                    <FormLabel color="gray.700">Liquidation Number</FormLabel>
                    <Input
                      value={expenseForm.liquidationNumber}
                      onChange={(e) =>
                        setExpenseForm({
                          ...expenseForm,
                          liquidationNumber: e.target.value,
                        })
                      }
                      placeholder="Enter liquidation number"
                      borderColor="gray.300"
                      _hover={{ borderColor: "blue.300" }}
                      _focus={{
                        borderColor: "blue.500",
                        boxShadow: "0 0 0 1px blue.500",
                      }}
                      isDisabled={isSubmitting}
                    />
                  </FormControl>
                  <FormControl>
                    <FormLabel color="gray.700">FW#</FormLabel>
                    <Input
                      value={expenseForm.fwNumber}
                      placeholder="FW#"
                      borderColor="gray.300"
                      _hover={{ borderColor: "blue.300" }}
                      _focus={{ borderColor: "blue.500", boxShadow: "0 0 0 1px blue.500" }}
                      isDisabled={true}
                      readOnly={true}
                    />
                  </FormControl>
                  <FormControl>
                    <FormLabel color="gray.700">No of Drops</FormLabel>
                    <Input
                      type="number"
                      value={expenseForm.noOfDrops}
                      onChange={(e) => setExpenseForm({ ...expenseForm, noOfDrops: e.target.value })}
                      placeholder="Enter number of drops"
                      borderColor="gray.300"
                      _hover={{ borderColor: "blue.300" }}
                      _focus={{ borderColor: "blue.500", boxShadow: "0 0 0 1px blue.500" }}
                      isDisabled={isSubmitting}
                    />
                  </FormControl>
                  <FormControl>
                    <FormLabel color="gray.700">Consignee</FormLabel>
                    <Input
                      value={expenseForm.consignee}
                      onChange={(e) => setExpenseForm({ ...expenseForm, consignee: e.target.value })}
                      placeholder="Enter consignee"
                      borderColor="gray.300"
                      _hover={{ borderColor: "blue.300" }}
                      _focus={{ borderColor: "blue.500", boxShadow: "0 0 0 1px blue.500" }}
                      isDisabled={isSubmitting}
                    />
                  </FormControl>
                  <FormControl>
                    <FormLabel color="gray.700">Delivery Receipt</FormLabel>
                    <Input
                      value={expenseForm.DeliveryReceipt}
                      onChange={(e) =>
                        setExpenseForm({
                          ...expenseForm,
                          DeliveryReceipt: e.target.value,
                        })
                      }
                      placeholder="Enter delivery receipt"
                      borderColor="gray.300"
                      _hover={{ borderColor: "blue.300" }}
                      _focus={{
                        borderColor: "blue.500",
                        boxShadow: "0 0 0 1px blue.500",
                      }}
                      isDisabled={isSubmitting}
                    />
                  </FormControl>
                  <FormControl>
                    <FormLabel color="gray.700">Receipt No</FormLabel>
                    <Input
                      value={expenseForm.receiptNo}
                      onChange={(e) =>
                        setExpenseForm({
                          ...expenseForm,
                          receiptNo: e.target.value,
                        })
                      }
                      placeholder="Enter receipt number"
                      borderColor="gray.300"
                      _hover={{ borderColor: "blue.300" }}
                      _focus={{
                        borderColor: "blue.500",
                        boxShadow: "0 0 0 1px blue.500",
                      }}
                      isDisabled={isSubmitting}
                    />
                  </FormControl>
                </VStack>
              </form>
            </Box>
          ) : (
            <VStack spacing={6} align="stretch">
              <Flex justify="space-between" align="center">
                <HStack spacing={4}>
                  <Button
                    onClick={handleAddNew}
                    leftIcon={<AddIcon />}
                    bg="#1a365d"
                    color="white"
                    _hover={{ bg: "#2a4365" }}
                  >
                    Add Expense
                  </Button>
                  <Button
                    size="sm"
                    colorScheme="blue"
                    variant="outline"
                    onClick={handleEditRequestOpen}
                  >
                    Request Edit
                  </Button>
                  <Button
                    size="sm"
                    colorScheme="red"
                    variant="outline"
                    onClick={handleDeleteRequestOpen}
                  >
                    Request Delete
                  </Button>
                </HStack>
                {editAccessTimerDisplay && (
                  <Flex alignItems="baseline" color="purple.600" fontSize="xs">
                    <Icon as={FiClock} mr={1} boxSize={3} />
                    <Text>Edit access active: {editAccessTimerDisplay}</Text>
                  </Flex>
                )}
              </Flex>
              <TableContainer>
                <Table variant="simple">
                  <Thead bg="gray.50">
                    <Tr>
                      <Th color="gray.700">Expense Name</Th>
                      <Th color="gray.700">Description</Th>
                      <Th color="gray.700" isNumeric>Cost</Th>
                      <Th color="gray.700">Date & Time</Th>
                      <Th color="gray.700">Category</Th>
                      <Th color="gray.700">Liquidation #</Th>
                      <Th color="gray.700">Delivery Receipt</Th>
                      <Th color="gray.700">Receipt No</Th>
                      <Th color="gray.700" textAlign="center">Actions</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {tripExpenses.map((expense) => (
                      <Tr key={expense._id} _hover={{ bg: "gray.50" }}>
                        <Td fontWeight="medium">{expense.ExpenseName}</Td>
                        <Td>{expense.description || "-"}</Td>
                        <Td isNumeric fontWeight="medium">
                          ₱{expense.value.toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </Td>
                        <Td>{new Date(expense.dateTime).toLocaleString()}</Td>
                        <Td>
                          <Badge
                            colorScheme={
                              expense.expenseCategory === "Operating Expenses"
                                ? "blue"
                                : expense.expenseCategory === "Capital Expenses"
                                ? "purple"
                                : expense.expenseCategory === "Maintenance"
                                ? "orange"
                                : expense.expenseCategory === "Utilities"
                                ? "green"
                                : "gray"
                            }
                          >
                            {expense.expenseCategory}
                          </Badge>
                        </Td>
                        <Td>{expense.liquidationNumber || "-"}</Td>
                        <Td>{expense.DeliveryReceipt || "-"}</Td>
                        <Td>{expense.receiptNo || "-"}</Td>
                        <Td textAlign="center">
                          <HStack spacing={2} justify="center">
                            <IconButton
                              aria-label="Edit Expense"
                              icon={<EditIcon />}
                              size="sm"
                              colorScheme="blue"
                              variant="ghost"
                              onClick={() => handleEdit(expense)}
                            />
                            <IconButton
                              aria-label="Delete Expense"
                              icon={<DeleteIcon />}
                              size="sm"
                              colorScheme="red"
                              variant="ghost"
                              onClick={() => openDeleteConfirm(expense._id)}
                            />
                          </HStack>
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </TableContainer>
            </VStack>
          )}
        </ModalBody>
        <ModalFooter borderTopWidth="2px" borderColor="#800020" py={4}>
          {showForm && (
            <Button
              bg="#1a365d"
              color="white"
              _hover={{ bg: "#2a4365" }}
              mr={3}
              onClick={handleSaveExpense}
              isDisabled={isSubmitting}
              isLoading={isSubmitting}
              loadingText="Saving..."
            >
              {editingExpenseId ? "Update" : "Save"}
            </Button>
          )}
          <Button
            variant="outline"
            color="#800020"
            borderColor="#800020"
            onClick={onClose}
          >
            Close
          </Button>
        </ModalFooter>
      </ModalContent>

      {/* Add Request Modals */}
      <Modal isOpen={isEditRequestOpen} onClose={() => setIsEditRequestOpen(false)} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Request Edit Access (Trip Expenses)</ModalHeader>
          <ModalCloseButton isDisabled={isSubmittingEditRequest} />
          <ModalBody pb={6}>
            <Text mb={4}>You are requesting permission to edit and delete trip expenses.</Text>
            <FormControl>
              <FormLabel>Remarks (Optional)</FormLabel>
              <Textarea
                value={editRequestRemarks}
                onChange={(e) => setEditRequestRemarks(e.target.value)}
                placeholder="Provide a reason for your request..."
              />
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <Button
              colorScheme='blue'
              mr={3}
              onClick={handleSubmitEditRequest}
              isLoading={isSubmittingEditRequest}
              loadingText="Submitting"
            >
              Submit Request
            </Button>
            <Button variant='ghost' onClick={() => setIsEditRequestOpen(false)} isDisabled={isSubmittingEditRequest}>Cancel</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={isDeleteRequestOpen} onClose={() => setIsDeleteRequestOpen(false)} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Request Delete Access (Trip Expenses)</ModalHeader>
          <ModalCloseButton isDisabled={isSubmittingDeleteRequest} />
          <ModalBody pb={6}>
            <Text mb={4}>You are requesting permission to delete trip expenses.</Text>
            <FormControl>
              <FormLabel>Remarks (Optional)</FormLabel>
              <Textarea
                value={deleteRequestRemarks}
                onChange={(e) => setDeleteRequestRemarks(e.target.value)}
                placeholder="Provide a reason for your request..."
              />
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <Button
              colorScheme='blue'
              mr={3}
              onClick={handleSubmitDeleteRequest}
              isLoading={isSubmittingDeleteRequest}
              loadingText="Submitting"
            >
              Submit Request
            </Button>
            <Button variant='ghost' onClick={() => setIsDeleteRequestOpen(false)} isDisabled={isSubmittingDeleteRequest}>Cancel</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Modal>
  );
};

export default TripExpense;
