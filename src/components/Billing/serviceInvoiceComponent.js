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
  InputGroup,
  InputLeftElement,
  HStack,
  useToast,
  VStack,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  ModalFooter,
  useDisclosure,
  FormControl,
  FormLabel,
  Flex,
  Heading,
  TableContainer,
  Badge,
  Select,
  Spinner,
  Text,
  IconButton,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  AlertDialogCloseButton,
  Tooltip,
  FormErrorMessage,
} from "@chakra-ui/react";
import { SearchIcon, AddIcon, ViewIcon, DeleteIcon, EditIcon } from "@chakra-ui/icons";
import axios from "axios";

const ServiceInvoiceComponent = () => {
  const toast = useToast();
  const [serviceInvoices, setServiceInvoices] = useState([]);
  const [selectedStubInvoices, setSelectedStubInvoices] = useState([]);
  const [selectedStubForView, setSelectedStubForView] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [isRefLoading, setIsRefLoading] = useState(false);
  const [referenceInfo, setReferenceInfo] = useState({
    previousStub: null,
    previousInvoice: null,
    nextInvoice: null,
  });

  // Add new state variables for Edit Stub functionality
  const [isEditStubModalOpen, setIsEditStubModalOpen] = useState(false);
  const [newStubNumber, setNewStubNumber] = useState("");
  const [isUpdatingStub, setIsUpdatingStub] = useState(false);
  const [isCheckingStub, setIsCheckingStub] = useState(false);
  const [stubValidationError, setStubValidationError] = useState("");

  // Modal states
  const {
    isOpen: isAddModalOpen,
    onOpen: onAddModalOpen,
    onClose: onAddModalClose,
  } = useDisclosure();
  const {
    isOpen: isDeleteModalOpen,
    onOpen: onDeleteModalOpen,
    onClose: onDeleteModalClose,
  } = useDisclosure();
  const {
    isOpen: isViewModalOpen,
    onOpen: onViewModalOpen,
    onClose: onViewModalClose,
  } = useDisclosure();
  const deleteStubAlertDisclosure = useDisclosure();
  const [isDeletingStub, setIsDeletingStub] = useState(false);
  const cancelRef = useRef();

  const [formData, setFormData] = useState({
    stub: "",
    rangeStart: "",
    rangeEnd: "",
    status: "UNUSED",
  });

  const [deleteInvoiceId, setDeleteInvoiceId] = useState("");
  const [deleteStub, setDeleteStub] = useState("");

  // Create a reusable function for extracting the numeric part of an invoice number
  const getNumberPart = (invoiceNumber) => {
    if (!invoiceNumber) return 0;
    const parts = invoiceNumber.split("-");
    if (parts.length > 1) {
      return parseInt(parts[1]);
    }
    // If it's already just a number (without stub prefix)
    return parseInt(invoiceNumber);
  };

  // Fetch service invoices
  const fetchServiceInvoices = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/service-invoice`
      );
      setServiceInvoices(response.data);
    } catch (error) {
      console.error("Error fetching service invoices:", error);
      toast({
        title: "Error Fetching Data",
        description:
          error.response?.data?.message ||
          "Could not load service invoice list.",
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "top-right",
      });
      setServiceInvoices([]); // Set to empty array on error
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch reference information
  const fetchReferenceInfo = async () => {
    setIsRefLoading(true);
    setReferenceInfo({
      previousStub: null,
      previousInvoice: null,
      nextInvoice: null,
    });
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/service-invoice/latest-invoice-info`
      );
      if (response.data && response.data.latestInvoiceNumber !== null) {
        const previousStub = response.data.latestStubNumber;
        const previousInvoiceStr = response.data.latestInvoiceNumber;
        const previousInvoiceNum = parseInt(previousInvoiceStr);
        const nextInvoice = !isNaN(previousInvoiceNum)
          ? previousInvoiceNum + 1
          : "N/A";
        setReferenceInfo({
          previousStub: previousStub ?? "N/A",
          previousInvoice: previousInvoiceStr,
          nextInvoice: nextInvoice,
        });
      } else {
        setReferenceInfo({
          previousStub: "N/A",
          previousInvoice: "N/A",
          nextInvoice: 1,
        });
      }
    } catch (error) {
      console.error("Error fetching reference info:", error);
      const errorMsg =
        error.response?.data?.message ||
        "Failed to fetch reference information";
      // No toast here, failure is handled visually in the modal
      setReferenceInfo({
        previousStub: "N/A",
        previousInvoice: "N/A",
        nextInvoice: "N/A",
      });
    } finally {
      setIsRefLoading(false);
    }
  };

  useEffect(() => {
    fetchServiceInvoices();
  }, []);

  // Handle viewing invoices for a specific stub
  const handleViewInvoices = async (stub) => {
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/service-invoice/stub/${stub}`
      );
      setSelectedStubInvoices(response.data);
      setSelectedStubForView(stub);
      onViewModalOpen();
    } catch (error) {
      console.error("Error fetching stub invoices:", error);
      toast({
        title: "Error",
        description:
          error.response?.data?.message ||
          "Failed to fetch invoices for this stub",
        status: "error",
        duration: 4000,
        isClosable: true,
        position: "top-right",
      });
    }
  };

  // Handle opening the Add modal and fetch reference info
  const handleAddModalOpen = () => {
    fetchReferenceInfo();
    setFormData({ stub: "", rangeStart: "", rangeEnd: "", status: "UNUSED" });
    onAddModalOpen();
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.stub || !formData.rangeStart || !formData.rangeEnd) {
      toast({
        title: "Input Error",
        description: "Please fill in all required fields.",
        status: "warning",
        duration: 3000,
        isClosable: true,
        position: "top-right",
      });
      return;
    }
    const start = parseInt(formData.rangeStart);
    const end = parseInt(formData.rangeEnd);
    if (isNaN(start) || isNaN(end) || start <= 0 || end <= 0 || start > end) {
      toast({
        title: "Input Error",
        description: "Invalid range.",
        status: "warning",
        duration: 4000,
        isClosable: true,
        position: "top-right",
      });
      return;
    }

    setIsLoading(true); // Use general loading state for delete operation
    try {
      // Validation
      await axios.post(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/service-invoice/validate-batch`,
        {
          stub: formData.stub,
          rangeStart: formData.rangeStart,
          rangeEnd: formData.rangeEnd,
        }
      );

      // Creation
      const serviceInvoicesToCreate = [];
      for (let i = start; i <= end; i++) {
        serviceInvoicesToCreate.push({
          stub: formData.stub,
          invoiceNumber: i.toString(),
          status: "UNUSED",
        });
      }
      await Promise.all(
        serviceInvoicesToCreate.map((invoice) =>
          axios.post(
            `${process.env.NEXT_PUBLIC_BACKEND_API}/api/service-invoice`,
            invoice
          )
        )
      );

      // Success
      fetchServiceInvoices();
      onAddModalClose();
      toast({
        title: "Success",
        description: `Created ${serviceInvoicesToCreate.length} invoices for stub ${formData.stub}.`,
        status: "success",
        duration: 3000,
        isClosable: true,
        position: "top-right",
      });
      setFormData({ stub: "", rangeStart: "", rangeEnd: "", status: "UNUSED" }); // Reset form on success
    } catch (error) {
      // Handle both validation and creation errors
      const errorMsg =
        error.response?.data?.message ||
        (error.response?.status === 409
          ? "Conflict detected."
          : "An error occurred.");
      const errorTitle =
        error.response?.status === 409 ? "Validation Conflict" : "Error";
      console.error(
        "Error during invoice submission:",
        error.response || error
      );
      toast({
        title: errorTitle,
        description: errorMsg,
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "top-right",
      });
    } finally {
      setIsLoading(false); // Stop loading indicator regardless of outcome
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!deleteStub) return;
    setIsDeletingStub(true);

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast({
          title: "Error",
          description: "Authentication token not found. Please log in.",
          status: "error",
        });
        setIsDeletingStub(false);
        deleteStubAlertDisclosure.onClose();
        return;
      }

      const response = await axios.delete(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/service-invoice/stub/${deleteStub}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      fetchServiceInvoices();
      deleteStubAlertDisclosure.onClose();
      toast({
        title: "Success",
        description:
          response.data.message ||
          `Service invoices for stub ${deleteStub} deleted successfully and logged.`,
        status: "success",
        duration: 3000,
        isClosable: true,
        position: "top-right",
      });
    } catch (error) {
      console.error("Error deleting service invoices:", error);
      toast({
        title: "Error",
        description:
          error.response?.data?.message || "Failed to delete service invoices",
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "top-right",
      });
    } finally {
      setIsDeletingStub(false);
    }
  };

  // Handle status update
  const handleStatusUpdate = async (id, newStatus) => {
    try {
      await axios.put(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/service-invoice/${id}`,
        {
          status: newStatus,
        }
      );
      fetchServiceInvoices();
      toast({
        title: "Success",
        description: "Status updated successfully",
        status: "success",
        duration: 3000,
        isClosable: true,
        position: "top-right",
      });
    } catch (error) {
      console.error("Error updating status:", error);
      toast({
        title: "Error",
        description: "Failed to update status",
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "top-right",
      });
    }
  };

  // Filter invoices based on search
  const filteredInvoices = serviceInvoices
    .filter((invoice) =>
      invoice.stub?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      // Get the highest invoice number for each stub
      const aInvoices = a.invoices || [];
      const bInvoices = b.invoices || [];
      
      const aHighest = Math.max(...aInvoices.map(inv => getNumberPart(inv.invoiceNumber)));
      const bHighest = Math.max(...bInvoices.map(inv => getNumberPart(inv.invoiceNumber)));
      
      // Sort in descending order (highest to lowest)
      return bHighest - aHighest;
    });

  // Pagination logic
  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  // Get current items
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredInvoices.slice(
    indexOfFirstItem,
    indexOfLastItem
  );

  // Add new function to handle stub update
  const handleUpdateStub = async () => {
    try {
      setIsUpdatingStub(true);

      if (!selectedStubForView || !newStubNumber) {
        toast({
          title: "Error",
          description: "Please provide both current and new stub numbers",
          status: "error",
          duration: 3000,
          isClosable: true,
          position: "top-right",
        });
        return;
      }

      // Log request data for debugging
      console.log("Sending update stub request with data:", {
        currentStub: selectedStubForView,
        newStub: newStubNumber
      });

      const response = await axios.put(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/service-invoice/update-stub`,
        {
          currentStub: selectedStubForView,
          newStub: newStubNumber
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      // Update local state
      setServiceInvoices(prevInvoices =>
        prevInvoices.map(invoice =>
          invoice.stub === selectedStubForView
            ? { ...invoice, stub: newStubNumber }
            : invoice
        )
      );

      toast({
        title: "Success",
        description: `Successfully updated stub ${selectedStubForView} to ${newStubNumber}. Updated ${response.data.invoicesUpdated} invoices.`,
        status: "success",
        duration: 3000,
        isClosable: true,
        position: "top-right",
      });

      // Reset form and close modal
      setNewStubNumber("");
      setIsEditStubModalOpen(false);
      
      // Refresh data
      await fetchServiceInvoices();

    } catch (error) {
      console.error("Error updating stub:", error);
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to update stub",
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "top-right",
      });
    } finally {
      setIsUpdatingStub(false);
    }
  };

  // Add new function to check if stub exists
  const checkStubExists = async (stub) => {
    try {
      setIsCheckingStub(true);
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/service-invoice/stubs`
      );
      const existingStubs = response.data;
      const exists = existingStubs.includes(stub);
      setStubValidationError(exists ? "Stub Already Exists" : "");
      return exists;
    } catch (error) {
      console.error("Error checking stub:", error);
      return false;
    } finally {
      setIsCheckingStub(false);
    }
  };

  // Add new function to handle stub number change
  const handleNewStubChange = async (e) => {
    const value = e.target.value;
    setNewStubNumber(value);
    if (value && value !== selectedStubForView) {
      await checkStubExists(value);
    } else {
      setStubValidationError("");
    }
  };

  return (
    <Box p={{ base: 4, md: 6 }} minH="100vh">
      {/* Updated Header */}
      <Box
        bg="white"
        pt={6}
        pb={4}
        px={6}
        mb={6}
        borderRadius="md"
        boxShadow="sm"
      >
        <Heading as="h1" size="lg" fontWeight="bold" color="blue.800" mb={1}>
          Service Invoice Management
        </Heading>
        <Text color="gray.600" fontSize="sm">
          Manage service invoice records and assignment
        </Text>
      </Box>

      {/* Search Box with Add Button */}
      <Box bg="white" p={4} borderRadius="lg" boxShadow="sm" mb={6}>
        <Flex justify="space-between" align="center" wrap="wrap" gap={4}>
          <InputGroup size="md" maxW={{ base: "100%", md: "400px" }}>
            <InputLeftElement pointerEvents="none">
              <SearchIcon color="gray.400" />
            </InputLeftElement>
            <Input
              placeholder="Search by Stub Number..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              borderRadius="md"
              focusBorderColor="blue.500"
              bg="white"
              _placeholder={{ color: "gray.500" }}
            />
          </InputGroup>
          <HStack spacing={3}>
            <Button
              onClick={handleAddModalOpen}
              colorScheme="red"
              leftIcon={<AddIcon />}
              size="md"
              fontWeight="medium"
              boxShadow="sm"
              _hover={{ bg: "#600000" }}
              bg="#800000"
            >
              Add Invoice Batch
            </Button>
            <Button
              onClick={() => setIsEditStubModalOpen(true)}
              colorScheme="blue"
              leftIcon={<EditIcon />}
              size="md"
              fontWeight="medium"
              boxShadow="sm"
              _hover={{ bg: "blue.600" }}
            >
              Edit Stub
            </Button>
          </HStack>
        </Flex>
      </Box>

      {/* Table Box */}
      <Box bg="white" p={4} borderRadius="lg" boxShadow="sm" overflowX="auto">
        <TableContainer>
          <Table variant="simple" size="md">
            <Thead bg="gray.100">
              <Tr>
                <Th
                  textTransform="uppercase"
                  letterSpacing="wider"
                  color="gray.600"
                  fontSize="xs"
                >
                  Stub
                </Th>
                <Th
                  textTransform="uppercase"
                  letterSpacing="wider"
                  color="gray.600"
                  fontSize="xs"
                >
                  View Details
                </Th>
                <Th
                  textTransform="uppercase"
                  letterSpacing="wider"
                  color="gray.600"
                  fontSize="xs"
                  isNumeric
                >
                  Used
                </Th>
                <Th
                  textTransform="uppercase"
                  letterSpacing="wider"
                  color="gray.600"
                  fontSize="xs"
                  isNumeric
                >
                  Unused
                </Th>
                <Th
                  textTransform="uppercase"
                  letterSpacing="wider"
                  color="gray.600"
                  fontSize="xs"
                  isNumeric
                >
                  Total
                </Th>
                <Th
                  textTransform="uppercase"
                  letterSpacing="wider"
                  color="gray.600"
                  fontSize="xs"
                  textAlign="center"
                >
                  Action
                </Th>
              </Tr>
            </Thead>
            <Tbody>
              {isLoading ? (
                <Tr>
                  <Td colSpan={6} textAlign="center" py={10}>
                    <Spinner size="xl" color="blue.500" thickness="4px" />
                    <Text mt={2} color="gray.500">
                      Loading Invoices...
                    </Text>
                  </Td>
                </Tr>
              ) : currentItems.length === 0 ? (
                <Tr>
                  <Td colSpan={6} textAlign="center" py={10} color="gray.500">
                    {searchTerm
                      ? `No invoices found matching "${searchTerm}".`
                      : "No service invoices added yet."}
                  </Td>
                </Tr>
              ) : (
                currentItems.map((invoice) => (
                  <Tr
                    key={invoice._id}
                    _hover={{ bg: "blue.50" }}
                    transition="background-color 0.2s"
                  >
                    <Td fontWeight="medium" color="gray.800">
                      {invoice.stub}
                    </Td>
                    <Td>
                      <Button
                        onClick={() => handleViewInvoices(invoice.stub)}
                        leftIcon={<ViewIcon />}
                        colorScheme="blue"
                        variant="outline"
                        size="sm"
                        borderColor="blue.300"
                        color="blue.600"
                        _hover={{ bg: "blue.50" }}
                      >
                        {(() => {
                          // Get the invoices for this stub
                          const stubInvoices = invoice.invoices || [];
                          if (stubInvoices.length === 0) return "No Invoices";

                          // Extract just the numbers from the invoice numbers
                          const numbers = stubInvoices.map((inv) =>
                            getNumberPart(inv.invoiceNumber)
                          );

                          // Find min and max
                          const min = Math.min(...numbers);
                          const max = Math.max(...numbers);

                          return `Invoice: ${min} - ${max}`;
                        })()}
                      </Button>
                    </Td>
                    <Td
                      isNumeric
                      color={invoice.totalUsed > 0 ? "green.600" : "gray.600"}
                    >
                      {invoice.totalUsed ?? 0}
                    </Td>
                    <Td
                      isNumeric
                      color={
                        invoice.totalUnused > 0 ? "orange.600" : "gray.600"
                      }
                    >
                      {invoice.totalUnused ?? 0}
                    </Td>
                    <Td isNumeric fontWeight="medium">
                      {invoice.totalInvoices ?? 0}
                    </Td>
                    <Td textAlign="center">
                      <IconButton
                        icon={<DeleteIcon />}
                        colorScheme="red"
                        bg="transparent"
                        color="#800000"
                        variant="ghost"
                        size="sm"
                        aria-label="Delete invoice batch"
                        _hover={{ bg: "red.50", color: "#600000" }}
                        onClick={() => {
                          setDeleteStub(invoice.stub);
                          deleteStubAlertDisclosure.onOpen();
                        }}
                      />
                    </Td>
                  </Tr>
                ))
              )}
            </Tbody>
          </Table>
        </TableContainer>

        {/* Pagination */}
        {filteredInvoices.length > itemsPerPage && (
          <Flex
            justify="center"
            p={4}
            align="center"
            borderTopWidth="1px"
            borderColor="gray.200"
          >
            <Button
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              isDisabled={currentPage === 1}
              mr={2}
              variant="outline"
              colorScheme="blue"
            >
              Previous
            </Button>
            <Text mx={4} fontSize="sm" color="gray.600">
              Page {currentPage} of{" "}
              {Math.ceil(filteredInvoices.length / itemsPerPage)}
            </Text>
            <Button
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              isDisabled={
                currentPage ===
                Math.ceil(filteredInvoices.length / itemsPerPage)
              }
              ml={2}
              variant="outline"
              colorScheme="blue"
            >
              Next
            </Button>
          </Flex>
        )}
      </Box>

      {/* View Service Invoice Numbers Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={onViewModalClose}
        size="4xl"
        isCentered
        scrollBehavior="inside"
      >
        <ModalOverlay bg="blackAlpha.600" />
        <ModalContent borderRadius="lg" boxShadow="xl" mx={4}>
          <ModalHeader
            bg="gray.100"
            borderTopRadius="lg"
            fontWeight="bold"
            color="gray.700"
            fontSize="lg"
            py={3}
          >
            Service Invoice Numbers for Stub: {selectedStubForView}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody py={5} px={6}>
            <TableContainer maxHeight="60vh" overflowY="auto">
              <Table variant="simple" size="sm">
                <Thead
                  position="sticky"
                  top={0}
                  bg="white"
                  zIndex={1}
                  boxShadow="sm"
                >
                  <Tr>
                    <Th width="30%">Service Invoice Number</Th>
                    <Th width="45%">Customer Name</Th>
                    <Th width="25%">Status</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {selectedStubInvoices.map((invoice) => (
                    <Tr key={invoice._id} _hover={{ bg: "gray.50" }}>
                      <Td fontWeight="medium">{invoice.invoiceNumber}</Td>
                      <Td color="gray.600">
                        {invoice.status === "USED" ? (
                          invoice.customerName || (
                            <Text as="i" color="gray.400">
                              No name
                            </Text>
                          )
                        ) : (
                          <Text as="i" color="gray.400">
                            Not used
                          </Text>
                        )}
                      </Td>
                      <Td>
                        <Select
                          value={invoice.status}
                          onChange={(e) =>
                            handleStatusUpdate(invoice._id, e.target.value)
                          }
                          size="sm"
                          variant="outline"
                          borderColor="gray.300"
                          width="120px"
                          isDisabled={invoice.status === "USED"}
                          focusBorderColor="blue.500"
                          borderRadius="md"
                        >
                          <option value="UNUSED">UNUSED</option>
                          <option value="USED">USED</option>
                        </Select>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </TableContainer>
          </ModalBody>
          <ModalFooter borderTopWidth="1px" borderColor="gray.200" py={3}>
            <Button
              variant="ghost"
              colorScheme="blue"
              onClick={onViewModalClose}
            >
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Add Service Invoice Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={onAddModalClose}
        size="xl"
        isCentered
      >
        <ModalOverlay bg="blackAlpha.600" />
        <ModalContent borderRadius="lg" boxShadow="xl" mx={4}>
          <ModalHeader
            bg="blue.600"
            color="white"
            borderTopRadius="lg"
            fontWeight="bold"
            fontSize="lg"
            py={3}
          >
            Add New Service Invoice Batch
          </ModalHeader>
          <ModalCloseButton color="white" _hover={{ bg: "#600000" }} />
          <ModalBody py={5} px={6}>
            {/* Reference Info Box */}
            <Box
              borderWidth="1px"
              borderColor="gray.200"
              borderRadius="md"
              p={4}
              mb={6}
              bg="gray.50"
            >
              <Heading
                as="h4"
                size="sm"
                mb={3}
                fontWeight="semibold"
                color="blue.800"
              >
                Reference Information
              </Heading>
              {isRefLoading ? (
                <Flex justify="center" align="center" height="50px">
                  <Spinner size="md" color="blue.500" />
                </Flex>
              ) : (
                <Flex justify="space-between" wrap="wrap" gap={2}>
                  <Box textAlign="center" flex={1} minW="120px">
                    <Text
                      fontSize="xs"
                      color="gray.500"
                      textTransform="uppercase"
                    >
                      Prev Stub
                    </Text>
                    <Text fontSize="lg" fontWeight="bold" color="blue.600">
                      {referenceInfo.previousStub ?? "--"}
                    </Text>
                  </Box>
                  <Box textAlign="center" flex={1} minW="120px">
                    <Text
                      fontSize="xs"
                      color="gray.500"
                      textTransform="uppercase"
                    >
                      Prev Invoice #
                    </Text>
                    <Text fontSize="lg" fontWeight="bold" color="blue.600">
                      {referenceInfo.previousInvoice ?? "--"}
                    </Text>
                  </Box>
                  <Box textAlign="center" flex={1} minW="120px">
                    <Text
                      fontSize="xs"
                      color="gray.500"
                      textTransform="uppercase"
                    >
                      Next Invoice #
                    </Text>
                    <Text fontSize="lg" fontWeight="bold" color="green.600">
                      {referenceInfo.nextInvoice ?? "--"}
                    </Text>
                  </Box>
                </Flex>
              )}
            </Box>

            {/* Form */}
            <VStack
              spacing={4}
              as="form"
              onSubmit={handleSubmit}
              id="add-invoice-form"
            >
              <FormControl isRequired>
                <FormLabel fontWeight="medium" fontSize="sm">
                  Stub Number
                </FormLabel>
                <Input
                  placeholder="e.g., 101"
                  value={formData.stub}
                  onChange={(e) =>
                    setFormData({ ...formData, stub: e.target.value })
                  }
                  size="md"
                  type="number"
                  min="1"
                  borderRadius="md"
                  focusBorderColor="blue.500"
                />
              </FormControl>
              <HStack width="100%" spacing={4}>
                <FormControl isRequired flex={1}>
                  <FormLabel fontWeight="medium" fontSize="sm">
                    Range Start
                  </FormLabel>
                  <Input
                    placeholder="e.g., 1001"
                    type="number"
                    value={formData.rangeStart}
                    onChange={(e) =>
                      setFormData({ ...formData, rangeStart: e.target.value })
                    }
                    size="md"
                    min="1"
                    borderRadius="md"
                    focusBorderColor="blue.500"
                  />
                </FormControl>
                <FormControl isRequired flex={1}>
                  <FormLabel fontWeight="medium" fontSize="sm">
                    Range End
                  </FormLabel>
                  <Input
                    placeholder="e.g., 1050"
                    type="number"
                    value={formData.rangeEnd}
                    onChange={(e) =>
                      setFormData({ ...formData, rangeEnd: e.target.value })
                    }
                    size="md"
                    min={formData.rangeStart || 1}
                    borderRadius="md"
                    focusBorderColor="blue.500"
                  />
                </FormControl>
              </HStack>
            </VStack>
          </ModalBody>
          <ModalFooter borderTopWidth="1px" borderColor="gray.200" py={3}>
            <Button
              variant="ghost"
              onClick={onAddModalClose}
              mr={3}
              isDisabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              colorScheme="blue"
              type="submit"
              form="add-invoice-form"
              isLoading={isLoading}
              loadingText="Saving..."
              fontWeight="medium"
              boxShadow="sm"
              _hover={{ bg: "blue.600" }}
              px={6}
            >
              Save Batch
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        isOpen={deleteStubAlertDisclosure.isOpen}
        leastDestructiveRef={cancelRef}
        onClose={deleteStubAlertDisclosure.onClose}
        isCentered
      >
        <AlertDialogOverlay bg="blackAlpha.600" />
        <AlertDialogContent borderRadius="lg" boxShadow="xl" mx={4}>
          <AlertDialogHeader
            bg="#800000"
            color="white"
            borderTopRadius="lg"
            fontWeight="bold"
            fontSize="lg"
            py={3}
          >
            Confirm Deletion
          </AlertDialogHeader>
          <AlertDialogCloseButton
            color="white"
            _hover={{ bg: "#600000" }}
            isDisabled={isDeletingStub}
          />
          <AlertDialogBody py={6} px={6}>
            <Text>
              Are you sure you want to delete all service invoices with stub{" "}
              <Text as="span" fontWeight="bold">
                {deleteStub}
              </Text>
              ?
            </Text>
            <Text mt={2} fontWeight="bold" color="#800000">
              This action cannot be undone, but the data will be logged.
            </Text>
          </AlertDialogBody>
          <AlertDialogFooter borderTopWidth="1px" borderColor="gray.200" py={3}>
            <Button
              ref={cancelRef}
              variant="ghost"
              onClick={deleteStubAlertDisclosure.onClose}
              mr={3}
              isDisabled={isDeletingStub}
            >
              Cancel
            </Button>
            <Button
              bg="#800000"
              color="white"
              _hover={{ bg: "#600000" }}
              onClick={handleDelete}
              isLoading={isDeletingStub}
              loadingText="Deleting..."
              fontWeight="medium"
            >
              Delete Batch
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Edit Stub Modal */}
      <Modal isOpen={isEditStubModalOpen} onClose={() => setIsEditStubModalOpen(false)} size="md">
        <ModalOverlay />
        <ModalContent borderRadius="xl">
          <ModalHeader fontSize="xl" fontWeight="bold">
            Edit Stub Number
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody py={6}>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel fontWeight="medium">Current Stub</FormLabel>
                <Select
                  placeholder="Select current stub"
                  value={selectedStubForView}
                  onChange={(e) => setSelectedStubForView(e.target.value)}
                  size="lg"
                >
                  {serviceInvoices.map((invoice) => (
                    <option key={invoice.stub} value={invoice.stub}>
                      {invoice.stub} ({invoice.totalInvoices} invoices)
                    </option>
                  ))}
                </Select>
              </FormControl>

              <FormControl isRequired isInvalid={!!stubValidationError}>
                <FormLabel fontWeight="medium">New Stub</FormLabel>
                <Input
                  placeholder="Enter new stub number"
                  value={newStubNumber}
                  onChange={handleNewStubChange}
                  size="lg"
                />
                {stubValidationError && (
                  <FormErrorMessage>{stubValidationError}</FormErrorMessage>
                )}
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="ghost"
              mr={3}
              onClick={() => {
                setIsEditStubModalOpen(false);
                setStubValidationError("");
              }}
              isDisabled={isUpdatingStub}
            >
              Cancel
            </Button>
            <Button
              colorScheme="blue"
              onClick={handleUpdateStub}
              isLoading={isUpdatingStub || isCheckingStub}
              isDisabled={!selectedStubForView || !newStubNumber || newStubNumber === selectedStubForView || !!stubValidationError}
            >
              Update Stub
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default ServiceInvoiceComponent;
