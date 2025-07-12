import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Input,
  useDisclosure,
  IconButton,
  Flex,
  Text,
  FormControl,
  FormLabel,
  Grid,
  GridItem,
  HStack,
  Select,
  InputGroup,
  ModalCloseButton,
  InputLeftElement,
  Badge,
  TableContainer,
  Spinner,
  Textarea,
  Radio,
  RadioGroup,
  Stack,
  useToast,
} from "@chakra-ui/react";
import {
  AddIcon,
  EditIcon,
  DeleteIcon,
  ViewIcon,
  Search2Icon,
  TimeIcon,
  LockIcon,
} from "@chakra-ui/icons";
import axios from "axios";

function InsuranceRenewal() {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const {
    isOpen: isViewOpen,
    onOpen: onViewOpen,
    onClose: onViewClose,
  } = useDisclosure();
  const {
    isOpen: isHistoryOpen,
    onOpen: onHistoryOpen,
    onClose: onHistoryClose,
  } = useDisclosure();
  const { isOpen: isAccessRequestOpen, onOpen: onAccessRequestOpen, onClose: onAccessRequestClose } = useDisclosure();
  const [renewals, setRenewals] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRenewal, setSelectedRenewal] = useState(null);
  const [formData, setFormData] = useState({
    plateNo: "",
    vehicleUnit: "",
    insuranceType: "",
    policyNo: "",
    from: "",
    to: "",
    gross: "",
    net: "",
    difference: "",
    cvNo: "",
    checkNo: "",
    checkDate: "",
    bank: "",
    orNo: "",
    orDate: "",
    update: "",
    remarks: "",
  });
  const [editingId, setEditingId] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [insuranceHistoryData, setInsuranceHistoryData] = useState([]);
  const [viewingInsuranceHistoryFor, setViewingInsuranceHistoryFor] =
    useState(null);
  const [insuranceHistorySearchTerm, setInsuranceHistorySearchTerm] =
    useState("");
  const [insuranceHistoryFormData, setInsuranceHistoryFormData] = useState({
    _id: null,
    plateNo: "",
    policyNo: "",
    orNo: "",
    orDate: "",
    renewalDate: "",
  });

  // States for Access Request Modal
  const [requestType, setRequestType] = useState("");
  const [requestRemarks, setRequestRemarks] = useState("");
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const toast = useToast();

  useEffect(() => {
    fetchRenewals();
  }, [page, itemsPerPage, searchTerm]);

  const fetchRenewals = async () => {
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/insurance/paginate?page=${page}&limit=${itemsPerPage}&search=${searchTerm}`
      );
      const { data, pages, total } = response.data;

      // Consolidate records by plateNo
      const consolidatedRenewals = data.reduce((acc, current) => {
        const existingRecord = acc.find(
          (item) => item.plateNo === current.plateNo
        );
        if (!existingRecord) {
          acc.push(current);
        } else {
          // Update existing record with non-null values from current record
          Object.keys(current).forEach((key) => {
            if (
              current[key] !== null &&
              current[key] !== undefined &&
              current[key] !== ""
            ) {
              existingRecord[key] = current[key];
            }
          });
        }
        return acc;
      }, []);

      setRenewals(consolidatedRenewals);
      setTotalPages(pages);
      setTotalItems(total);
    } catch (error) {
      console.error("Error fetching renewals:", error);
    }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    try {
      // Format the data before sending
      const formattedData = {
        ...formData,
        from: formData.from ? new Date(formData.from).toISOString() : null,
        to: formData.to ? new Date(formData.to).toISOString() : null,
        checkDate: formData.checkDate
          ? new Date(formData.checkDate).toISOString()
          : null,
        orDate: formData.orDate
          ? new Date(formData.orDate).toISOString()
          : null,
        // Ensure all empty string values are converted to null
        ...Object.fromEntries(
          Object.entries(formData).map(([key, value]) => [
            key,
            value === "" ? null : value,
          ])
        ),
      };

      if (editingId) {
        // === UPDATE PATH ===
        const updateResponse = await axios.put(
          process.env.NEXT_PUBLIC_BACKEND_API + `/api/insurance/${editingId}`,
          formattedData
        );

        // History Creation Logic (only on successful update)
        if (
          updateResponse.status === 200 &&
          formattedData.update === "RENEWED"
        ) {
          console.log(
            "Insurance status set to RENEWED, creating history record..."
          );
          if (
            formattedData.plateNo &&
            formattedData.policyNo &&
            formattedData.orNo &&
            formattedData.orDate
          ) {
            const historyPayload = {
              plateNo: formattedData.plateNo,
              policyNo: formattedData.policyNo,
              orNo: formattedData.orNo,
              orDate: new Date(formattedData.orDate),
              renewalDate: new Date(),
            };
            try {
              await axios.post(
                `${process.env.NEXT_PUBLIC_BACKEND_API}/api/insurance-history`,
                historyPayload
              );
              console.log("Insurance history record created successfully.");

              // === Add Reset Logic ===
              console.log(
                "Resetting main Insurance record status to PENDING..."
              );
              try {
                const resetPayload = {
                  from: null,
                  to: null,
                  update: "PENDING", // Set status back to PENDING
                  // Preserve other potentially important fields
                  plateNo: formattedData.plateNo,
                  vehicleUnit: formattedData.vehicleUnit,
                  insuranceType: formattedData.insuranceType,
                  policyNo: formattedData.policyNo, // Keep Policy No
                  gross: formattedData.gross,
                  net: formattedData.net,
                  difference: formattedData.difference,
                  cvNo: formattedData.cvNo, // Keep payment details? Or reset too?
                  checkNo: formattedData.checkNo,
                  checkDate: formattedData.checkDate,
                  bank: formattedData.bank,
                  orNo: formattedData.orNo, // Keep OR No?
                  orDate: formattedData.orDate, // Keep OR Date?
                  remarks: formattedData.remarks, // Preserve remarks
                };
                await axios.put(
                  `${process.env.NEXT_PUBLIC_BACKEND_API}/api/insurance/${editingId}`,
                  resetPayload
                );
                console.log("Main Insurance record reset successfully.");
              } catch (resetError) {
                console.error(
                  "Error resetting main Insurance record:",
                  resetError
                );
                // Optionally show an error toast specifically for the reset failure
              }
              // === End Reset Logic ===
            } catch (historyError) {
              console.error(
                "Error creating Insurance history record:",
                historyError
              );
            }
          } else {
            console.error(
              "Cannot create history record: Missing required fields (Plate, Policy, OR No, OR Date) in the main record."
            );
          }
        }
      } else {
        // === CREATE PATH ===
        // Note: The previous logic attempted to update if plate existed, which might be desired,
        // but for clarity here, we assume this path is only for creating new records.
        // If update-on-create-if-exists is needed, the logic should be different.
        await axios.post(
          process.env.NEXT_PUBLIC_BACKEND_API + "/api/insurance",
          formattedData
        );
        // History is likely not created when adding a brand new insurance record initially.
      }

      fetchRenewals();
      resetForm();
      onClose();
    } catch (error) {
      console.error("Error saving renewal:", error);
    }
  };

  const handleEdit = (renewal) => {
    setEditingId(renewal._id);
    setFormData({
      ...renewal,
      from: renewal.from ? formatDate(renewal.from) : "",
      to: renewal.to ? formatDate(renewal.to) : "",
      checkDate: renewal.checkDate ? formatDate(renewal.checkDate) : "",
      orDate: renewal.orDate ? formatDate(renewal.orDate) : "",
    });
    onOpen();
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this record?")) {
      try {
        const token = localStorage.getItem('token'); // Get token
        await axios.delete(
          process.env.NEXT_PUBLIC_BACKEND_API + `/api/insurance/${id}`,
          { // Add headers for authorization
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        fetchRenewals();
        toast({ // Add toast notification
          title: "Deleted",
          description: "Insurance renewal record deleted successfully.",
          status: "success",
          duration: 3000,
          isClosable: true,
          position: "top-right"
        });
      } catch (error) {
        console.error("Error deleting renewal:", error);
        toast({ // Add error toast
            title: "Error Deleting",
            description: error.response?.data?.message || "Failed to delete insurance renewal record.",
            status: "error",
            duration: 5000,
            isClosable: true,
            position: "top-right"
        });
      }
    }
  };

  const resetForm = () => {
    setFormData({
      plateNo: "",
      vehicleUnit: "",
      insuranceType: "",
      policyNo: "",
      from: "",
      to: "",
      gross: "",
      net: "",
      difference: "",
      cvNo: "",
      checkNo: "",
      checkDate: "",
      bank: "",
      orNo: "",
      orDate: "",
      update: "",
      remarks: "",
    });
    setEditingId(null);
  };

  // Helper function to format date
  const formatDate = (date) => {
    if (!date) return "-";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "-";
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const formatValue = (value) => {
    if (value === "" || value === null || value === undefined) return "-";
    return value;
  };

  const handleView = (renewal) => {
    setSelectedRenewal(renewal);
    onViewOpen();
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
  };

  const handleItemsPerPageChange = (e) => {
    setItemsPerPage(parseInt(e.target.value));
    setPage(1);
  };

  const handleViewInsuranceHistory = async (plateNo) => {
    console.log("Fetching insurance history for:", plateNo);
    setViewingInsuranceHistoryFor(plateNo);
    setIsHistoryLoading(true);
    onHistoryOpen();
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/insurance-history/plate/${plateNo}`
      );
      setInsuranceHistoryData(response.data);
    } catch (error) {
      console.error("Error fetching insurance history:", error);
      setInsuranceHistoryData([]);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const handleEditInsuranceHistory = (historyRecord) => {
    setInsuranceHistoryFormData({
      _id: historyRecord._id,
      plateNo: historyRecord.plateNo,
      policyNo: historyRecord.policyNo,
      orNo: historyRecord.orNo,
      orDate: historyRecord.orDate ? formatDate(historyRecord.orDate) : "",
      renewalDate: historyRecord.renewalDate
        ? formatDate(historyRecord.renewalDate)
        : "",
    });
  };

  const handleDeleteInsuranceHistory = async (historyId) => {
    if (
      window.confirm(
        "Are you sure you want to delete this Insurance history record?"
      )
    ) {
      try {
        await axios.delete(
          `${process.env.NEXT_PUBLIC_BACKEND_API}/api/insurance-history/${historyId}`
        );
        setInsuranceHistoryData((prevData) =>
          prevData.filter((record) => record._id !== historyId)
        );
        // Add success toast
      } catch (error) {
        console.error("Error deleting Insurance history record:", error);
        // Add error toast
      }
    }
  };

  const handleInsuranceHistoryFormChange = (e) => {
    const { name, value, type } = e.target;
    let updatedValue = value;
    if (type === "date" && !value) {
      updatedValue = null;
    }
    setInsuranceHistoryFormData((prev) => ({
      ...prev,
      [name]: updatedValue === null ? "" : updatedValue,
    }));
    // Add logic here if changing orDate needs to reset renewalDate, similar to LTFRB decision/expiry if needed
  };

  const handleInsuranceHistoryUpdate = async () => {
    if (!insuranceHistoryFormData._id) return;
    // Add validation if needed
    if (
      !insuranceHistoryFormData.policyNo ||
      !insuranceHistoryFormData.orNo ||
      !insuranceHistoryFormData.orDate /*|| !insuranceHistoryFormData.renewalDate*/
    ) {
      console.error(
        "Policy No, OR No, and OR Date are required for history update."
      );
      // Add alert/toast
      return;
    }
    setIsLoading(true);
    try {
      // Only send fields that are editable
      const payload = {
        policyNo: insuranceHistoryFormData.policyNo,
        orNo: insuranceHistoryFormData.orNo,
        orDate: insuranceHistoryFormData.orDate
          ? new Date(insuranceHistoryFormData.orDate)
          : null,
        // renewalDate is likely not editable, it's the creation date of the history record
      };
      await axios.put(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/insurance-history/${insuranceHistoryFormData._id}`,
        payload
      );
      // Update local state
      setInsuranceHistoryData((prevData) =>
        prevData.map((record) =>
          record._id === insuranceHistoryFormData._id
            ? {
                ...record,
                ...insuranceHistoryFormData, // Use form data (contains formatted dates)
                orDate: insuranceHistoryFormData.orDate
                  ? new Date(insuranceHistoryFormData.orDate).toISOString()
                  : null,
              }
            : record
        )
      );
      resetInsuranceHistoryEditForm(); // Go back to table view
    } catch (error) {
      console.error("Error updating Insurance history:", error);
      // Add error toast
    } finally {
      setIsLoading(false);
    }
  };

  const resetInsuranceHistoryEditForm = () => {
    setInsuranceHistoryFormData({
      _id: null,
      plateNo: "",
      policyNo: "",
      orNo: "",
      orDate: "",
      renewalDate: "",
    });
  };

  const closeInsuranceHistoryModal = () => {
    setInsuranceHistorySearchTerm("");
    resetInsuranceHistoryEditForm();
    onHistoryClose();
  };

  // === Access Request Handlers ===
  const handleAccessRequestOpen = async () => {
    // Check for existing pending request first
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
        req.Module === "Insurance Renewal" && // Check for Insurance Renewal module
        req.Username === user.name &&
        req.Status === "Pending"
      );

      if (existingPendingRequest) {
        toast({
          title: "Pending Request Exists",
          description: `You already have a pending request (${existingPendingRequest.RequestType}) for Insurance Renewal access.`,
          status: "warning",
          duration: 5000,
          isClosable: true,
        });
        return; // Prevent modal from opening
      }
    } catch (error) {
      console.error("Error checking for pending requests:", error);
      toast({
        title: "Error",
        description: "Could not verify existing requests. Please try again.",
        status: "error",
      });
      return; // Prevent modal from opening on error
    }

    // If no pending request, proceed
    setRequestType("");
    setRequestRemarks("");
    setIsSubmittingRequest(false);
    onAccessRequestOpen();
  };

  const handleSubmitRequest = async () => {
    if (!requestType) {
      toast({ title: "Error", description: "Please select a request type (Edit or Delete).", status: "error", duration: 3000, isClosable: true });
      return;
    }
    setIsSubmittingRequest(true);
    try {
        const token = localStorage.getItem("token");
        const userString = localStorage.getItem("user");
        if (!token || !userString) throw new Error("Authentication details not found.");
        const user = JSON.parse(userString);
        const generatedRequestID = `REQ-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const payload = {
          RequestID: generatedRequestID,
          Module: "Insurance Renewal", // *** Update module name ***
          RequestType: requestType,
          Remarks: requestRemarks,
          Username: user.name,
          UserRole: user.workLevel,
        };
        console.log("Submitting Request Payload:", payload);
        await axios.post(`${process.env.NEXT_PUBLIC_BACKEND_API}/api/control-panel`, payload, { headers: { Authorization: `Bearer ${token}` } });
        toast({ title: "Request Submitted", description: "Your access request has been sent for approval.", status: "success", duration: 5000, isClosable: true });
        onAccessRequestClose();
    } catch (error) {
        console.error("Error submitting access request:", error);
        toast({ title: "Request Failed", description: error.response?.data?.message || error.message || "Could not submit access request.", status: "error", duration: 5000, isClosable: true });
    } finally {
        setIsSubmittingRequest(false);
    }
  };
  // === End Access Request Handlers ===

  return (
    <Box p={4} bg="white" borderRadius="lg" boxShadow="md">
      {/* Adjusted Header Row */}
      <Flex justify="space-between" align="center" mb={4}>
        {/* Left Group: Title + Search */}
        <HStack spacing={2}>
          <Text fontSize="xl" fontWeight="bold" whiteSpace="nowrap">Insurance Renewal</Text>
          <InputGroup size="sm" maxW="250px">
            <InputLeftElement pointerEvents="none">
              <Search2Icon color="gray.400" />
            </InputLeftElement>
            <Input
              placeholder="Search renewals..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              borderRadius="md"
              borderColor="#1a365d"
              _focus={{
                borderColor: "#800020",
                boxShadow: "0 0 0 1px #800020",
              }}
            />
          </InputGroup>
        </HStack>

        {/* Right Group: Request Access Button */}
        <Button
          onClick={handleAccessRequestOpen}
          variant="outline"
          colorScheme="purple"
          leftIcon={<LockIcon />}
          size="sm"
        >
          Request Access
        </Button>
      </Flex>

      {/* Table Container */}
      <TableContainer>
        <Table variant="simple">
          <Thead bg="gray.200">
            <Tr>
              {[
                "Plate No",
                "Vehicle Unit",
                "Insurance Type",
                "Policy No",
                "From",
                "To",
                "Update",
                "Actions",
              ].map((header) => (
                <Th
                  key={header}
                  color="black"
                  py={4}
                  textAlign={header === "Actions" ? "center" : "left"}
                >
                  {header}
                </Th>
              ))}
            </Tr>
          </Thead>
          <Tbody>
            {renewals
              .filter((renewal) => {
                if (!searchTerm) return true;
                return (
                  renewal?.plateNo
                    ?.toString()
                    .toLowerCase()
                    .includes(searchTerm.toLowerCase()) || false
                );
              })
              .map((renewal) => (
                <Tr
                  key={renewal._id}
                  _hover={{ bg: "gray.50" }}
                  transition="all 0.2s"
                >
                  <Td fontWeight="medium">
                    {formatValue(renewal.plateNo)}
                  </Td>
                  <Td>{formatValue(renewal.vehicleUnit)}</Td>
                  <Td>{formatValue(renewal.insuranceType)}</Td>
                  <Td>{formatValue(renewal.policyNo)}</Td>
                  <Td>{formatDate(renewal.from)}</Td>
                  <Td>{formatDate(renewal.to)}</Td>
                  <Td>{formatValue(renewal.update)}</Td>
                  <Td>
                    <HStack spacing={2} justify="center">
                      <IconButton
                        icon={<ViewIcon />}
                        onClick={() => handleView(renewal)}
                        size="sm"
                        colorScheme="blue"
                        variant="ghost"
                        aria-label="View details"
                      />
                      <IconButton
                        icon={<TimeIcon />}
                        onClick={() =>
                          handleViewInsuranceHistory(renewal.plateNo)
                        }
                        size="sm"
                        colorScheme="gray"
                        variant="ghost"
                        aria-label="View History"
                      />
                      <IconButton
                        icon={<DeleteIcon />}
                        onClick={() => handleDelete(renewal._id)}
                        size="sm"
                        colorScheme="red"
                        variant="ghost"
                        aria-label="Delete"
                        isDisabled
                      />
                      <IconButton
                        icon={<EditIcon />}
                        onClick={() => handleEdit(renewal)}
                        size="sm"
                        colorScheme="blue"
                        variant="ghost"
                        aria-label="Edit"
                        isDisabled
                      />
                    </HStack>
                  </Td>
                </Tr>
              ))}
          </Tbody>
        </Table>
      </TableContainer>

      {/* Pagination Controls */}
      <Flex
        justify="space-between"
        mt={4}
        align="center"
        p={4}
        borderTopWidth="1px"
      >
        <HStack>
          <Text>Items per page:</Text>
          <Select
            value={itemsPerPage}
            onChange={handleItemsPerPageChange}
            width="70px"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </Select>
          <Text>
            Showing {(page - 1) * itemsPerPage + 1} to{" "}
            {Math.min(page * itemsPerPage, totalItems)} of {totalItems}{" "}
            entries
          </Text>
        </HStack>
        <HStack>
          <Button
            onClick={() => handlePageChange(1)}
            disabled={page === 1}
            size="sm"
            color="#1a365d"
            variant="outline"
          >
            First
          </Button>
          <Button
            onClick={() => handlePageChange(page - 1)}
            disabled={page === 1}
            size="sm"
            color="#1a365d"
            variant="outline"
          >
            Previous
          </Button>
          <Text>
            Page {page} of {totalPages}
          </Text>
          <Button
            onClick={() => handlePageChange(page + 1)}
            disabled={page === totalPages}
            size="sm"
            color="#1a365d"
            variant="outline"
          >
            Next
          </Button>
          <Button
            onClick={() => handlePageChange(totalPages)}
            disabled={page === totalPages}
            size="sm"
            color="#1a365d"
            variant="outline"
          >
            Last
          </Button>
        </HStack>
      </Flex>

      {/* View Details Modal */}
      <Modal isOpen={isViewOpen} onClose={onViewClose} size="xl">
        <ModalOverlay />
        <ModalContent maxW="900px">
          <ModalHeader bg="#1a365d" color="white" borderTopRadius="xl">
            Insurance Renewal Details
          </ModalHeader>
          <ModalCloseButton color="white" />
          <ModalBody py={6}>
            {selectedRenewal && (
              <Box>
                {/* Insurance Details Section */}
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
                    Insurance Details
                  </Text>
                  <Grid templateColumns="repeat(2, 1fr)" gap={6} mt={4}>
                    <Box>
                      <Text
                        fontWeight="semibold"
                        color="gray.600"
                        fontSize="sm"
                      >
                        Plate No
                      </Text>
                      <Text fontSize="md" mt={1}>
                        {formatValue(selectedRenewal.plateNo)}
                      </Text>
                    </Box>
                    <Box>
                      <Text
                        fontWeight="semibold"
                        color="gray.600"
                        fontSize="sm"
                      >
                        Vehicle Unit
                      </Text>
                      <Text fontSize="md" mt={1}>
                        {formatValue(selectedRenewal.vehicleUnit)}
                      </Text>
                    </Box>
                    <Box>
                      <Text
                        fontWeight="semibold"
                        color="gray.600"
                        fontSize="sm"
                      >
                        Insurance Type
                      </Text>
                      <Text fontSize="md" mt={1}>
                        {formatValue(selectedRenewal.insuranceType)}
                      </Text>
                    </Box>
                    <Box>
                      <Text
                        fontWeight="semibold"
                        color="gray.600"
                        fontSize="sm"
                      >
                        Policy No
                      </Text>
                      <Text fontSize="md" mt={1}>
                        {formatValue(selectedRenewal.policyNo)}
                      </Text>
                    </Box>
                    <Box>
                      <Text
                        fontWeight="semibold"
                        color="gray.600"
                        fontSize="sm"
                      >
                        From
                      </Text>
                      <Text fontSize="md" mt={1}>
                        {formatDate(selectedRenewal.from)}
                      </Text>
                    </Box>
                    <Box>
                      <Text
                        fontWeight="semibold"
                        color="gray.600"
                        fontSize="sm"
                      >
                        To
                      </Text>
                      <Text fontSize="md" mt={1}>
                        {formatDate(selectedRenewal.to)}
                      </Text>
                    </Box>
                  </Grid>
                </Box>

                {/* Financial Details Section */}
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
                    Financial Details
                  </Text>
                  <Grid templateColumns="repeat(2, 1fr)" gap={6} mt={4}>
                    <Box>
                      <Text
                        fontWeight="semibold"
                        color="gray.600"
                        fontSize="sm"
                      >
                        Gross
                      </Text>
                      <Text fontSize="md" mt={1}>
                        {formatValue(selectedRenewal.gross)}
                      </Text>
                    </Box>
                    <Box>
                      <Text
                        fontWeight="semibold"
                        color="gray.600"
                        fontSize="sm"
                      >
                        Net
                      </Text>
                      <Text fontSize="md" mt={1}>
                        {formatValue(selectedRenewal.net)}
                      </Text>
                    </Box>
                    <Box>
                      <Text
                        fontWeight="semibold"
                        color="gray.600"
                        fontSize="sm"
                      >
                        Difference
                      </Text>
                      <Text fontSize="md" mt={1}>
                        {formatValue(selectedRenewal.difference)}
                      </Text>
                    </Box>
                    <Box>
                      <Text
                        fontWeight="semibold"
                        color="gray.600"
                        fontSize="sm"
                      >
                        CV No
                      </Text>
                      <Text fontSize="md" mt={1}>
                        {formatValue(selectedRenewal.cvNo)}
                      </Text>
                    </Box>
                  </Grid>
                </Box>

                {/* Payment Details Section */}
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
                    Payment Details
                  </Text>
                  <Grid templateColumns="repeat(2, 1fr)" gap={6} mt={4}>
                    <Box>
                      <Text
                        fontWeight="semibold"
                        color="gray.600"
                        fontSize="sm"
                      >
                        Check No
                      </Text>
                      <Text fontSize="md" mt={1}>
                        {formatValue(selectedRenewal.checkNo)}
                      </Text>
                    </Box>
                    <Box>
                      <Text
                        fontWeight="semibold"
                        color="gray.600"
                        fontSize="sm"
                      >
                        Check Date
                      </Text>
                      <Text fontSize="md" mt={1}>
                        {formatDate(selectedRenewal.checkDate)}
                      </Text>
                    </Box>
                    <Box>
                      <Text
                        fontWeight="semibold"
                        color="gray.600"
                        fontSize="sm"
                      >
                        Bank
                      </Text>
                      <Text fontSize="md" mt={1}>
                        {formatValue(selectedRenewal.bank)}
                      </Text>
                    </Box>
                    <Box>
                      <Text
                        fontWeight="semibold"
                        color="gray.600"
                        fontSize="sm"
                      >
                        OR No
                      </Text>
                      <Text fontSize="md" mt={1}>
                        {formatValue(selectedRenewal.orNo)}
                      </Text>
                    </Box>
                    <Box>
                      <Text
                        fontWeight="semibold"
                        color="gray.600"
                        fontSize="sm"
                      >
                        OR Date
                      </Text>
                      <Text fontSize="md" mt={1}>
                        {formatDate(selectedRenewal.orDate)}
                      </Text>
                    </Box>
                  </Grid>
                </Box>

                {/* Additional Information Section */}
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
                    Additional Information
                  </Text>
                  <Grid templateColumns="repeat(2, 1fr)" gap={6} mt={4}>
                    <Box>
                      <Text
                        fontWeight="semibold"
                        color="gray.600"
                        fontSize="sm"
                      >
                        Update
                      </Text>
                      <Text fontSize="md" mt={1}>
                        {formatValue(selectedRenewal.update)}
                      </Text>
                    </Box>
                    <Box>
                      <Text
                        fontWeight="semibold"
                        color="gray.600"
                        fontSize="sm"
                      >
                        Remarks
                      </Text>
                      <Text fontSize="md" mt={1}>
                        {formatValue(selectedRenewal.remarks)}
                      </Text>
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
              onClick={onViewClose}
            >
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Add/Edit Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay />
        <ModalContent maxW="900px">
          <ModalHeader bg="#1a365d" color="white" borderTopRadius="xl">
            {editingId ? "Edit Insurance Renewal" : "Add Insurance Renewal"}
          </ModalHeader>
          <ModalCloseButton color="white" />
          <ModalBody py={6}>
            <Grid templateColumns="repeat(2, 1fr)" gap={4}>
              {Object.keys(formData)
                .filter((key) => !["_id", "__v"].includes(key))
                .map((key) => {
                  const label = key
                    .replace(/([A-Z])/g, " $1")
                    .trim()
                    .replace(/^./, (str) => str.toUpperCase());

                  return (
                    <GridItem key={key}>
                      <FormControl>
                        <FormLabel
                          fontWeight="medium"
                          color="gray.600"
                          fontSize="sm"
                        >
                          {label}
                        </FormLabel>
                        {["from", "to", "checkDate", "orDate"].includes(
                          key
                        ) ? (
                          <Input
                            type="date"
                            name={key}
                            value={
                              formData[key] ? formatDate(formData[key]) : ""
                            }
                            onChange={(e) => {
                              setFormData({
                                ...formData,
                                [key]: e.target.value,
                              });
                            }}
                            focusBorderColor="blue.500"
                            borderRadius="md"
                            size="md"
                            bg="white"
                            _hover={{ borderColor: "gray.300" }}
                            isDisabled={key === "to" && !formData.from}
                            min={
                              key === "to" && formData.from
                                ? (() => {
                                    try {
                                      const fromDate = new Date(
                                        formData.from
                                      );
                                      if (isNaN(fromDate.getTime()))
                                        return undefined;
                                      fromDate.setDate(
                                        fromDate.getDate() + 1
                                      );
                                      return fromDate
                                        .toISOString()
                                        .split("T")[0];
                                    } catch (e) {
                                      console.error(
                                        "Error calculating min date for 'to' field:",
                                        e
                                      );
                                      return undefined;
                                    }
                                  })()
                                : undefined
                            }
                          />
                        ) : key === "update" ? (
                          <Select
                            name={key}
                            value={formData[key] || ""}
                            onChange={handleInputChange}
                            focusBorderColor="blue.500"
                            borderRadius="md"
                            size="md"
                            bg="white"
                            _hover={{ borderColor: "gray.300" }}
                            placeholder="Select Update Status..."
                          >
                            <option value="PENDING">PENDING</option>
                            <option value="RENEWAL IN PROCESS">
                              RENEWAL IN PROCESS
                            </option>
                            <option value="RENEWED">RENEWED</option>
                          </Select>
                        ) : (
                          <Input
                            name={key}
                            value={formData[key]}
                            onChange={handleInputChange}
                            focusBorderColor="blue.500"
                            borderRadius="md"
                            size="md"
                            bg="white"
                            _hover={{ borderColor: "gray.300" }}
                          />
                        )}
                      </FormControl>
                    </GridItem>
                  );
                })}
            </Grid>
          </ModalBody>
          <ModalFooter borderTopWidth="2px" borderColor="#800020">
            <Button
              onClick={handleSubmit}
              bg="#1a365d"
              color="white"
              _hover={{ bg: "#2a4365" }}
              mr={3}
            >
              Save
            </Button>
            <Button
              variant="outline"
              color="#800020"
              borderColor="#800020"
              onClick={onClose}
            >
              Cancel
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Insurance History Modal (Handles View/Edit/Delete) */}
      <Modal
        isOpen={isHistoryOpen}
        onClose={closeInsuranceHistoryModal}
        size="4xl"
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader bg="#1a365d" color="white" borderTopRadius="md">
            {insuranceHistoryFormData._id
              ? `Edit Insurance History: ${insuranceHistoryFormData.plateNo}`
              : `Insurance Renewal History for: ${viewingInsuranceHistoryFor}`}
          </ModalHeader>
          <ModalCloseButton color="white" />
          <ModalBody py={6}>
            {insuranceHistoryFormData._id ? (
              // EDIT FORM VIEW
              <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                <FormControl isReadOnly gridColumn="span 2">
                  <FormLabel>Plate Number</FormLabel>
                  <Input
                    value={insuranceHistoryFormData.plateNo}
                    bg="gray.100"
                  />
                </FormControl>
                <FormControl isRequired>
                  <FormLabel>Policy Number</FormLabel>
                  <Input
                    name="policyNo"
                    value={insuranceHistoryFormData.policyNo}
                    onChange={handleInsuranceHistoryFormChange}
                  />
                </FormControl>
                <FormControl isRequired>
                  <FormLabel>OR Number</FormLabel>
                  <Input
                    name="orNo"
                    value={insuranceHistoryFormData.orNo}
                    onChange={handleInsuranceHistoryFormChange}
                  />
                </FormControl>
                <FormControl isRequired>
                  <FormLabel>OR Date</FormLabel>
                  <Input
                    type="date"
                    name="orDate"
                    value={insuranceHistoryFormData.orDate || ""}
                    onChange={handleInsuranceHistoryFormChange}
                    isDisabled={isLoading}
                  />
                </FormControl>
                <FormControl isReadOnly>
                  <FormLabel>Renewal Date (Recorded)</FormLabel>
                  <Input
                    type="date"
                    name="renewalDate"
                    value={
                      insuranceHistoryFormData.renewalDate
                        ? formatDate(insuranceHistoryFormData.renewalDate)
                        : ""
                    }
                    bg="gray.100"
                    isReadOnly
                  />
                </FormControl>
              </Grid>
            ) : (
              // TABLE VIEW
              <>
                {/* Add Search Bar Here if needed */}
                <InputGroup mb={4}>
                  <InputLeftElement pointerEvents="none">
                    <Search2Icon color="gray.400" />
                  </InputLeftElement>
                  <Input
                    placeholder="Search history..."
                    value={insuranceHistorySearchTerm}
                    onChange={(e) =>
                      setInsuranceHistorySearchTerm(e.target.value)
                    }
                  />
                </InputGroup>

                {isHistoryLoading ? (
                  <Flex justify="center" align="center" minH="200px">
                    <Spinner size="xl" />
                  </Flex>
                ) : insuranceHistoryData.length > 0 ? (
                  <TableContainer>
                    <Table variant="simple" size="sm">
                      <Thead bg="gray.100">
                        <Tr>
                          <Th>Plate Number</Th>
                          <Th>Policy Number</Th>
                          <Th>OR Number</Th>
                          <Th>OR Date</Th>
                          <Th>Renewal Date</Th>
                          <Th>Recorded At</Th>
                          <Th textAlign="center">Actions</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {insuranceHistoryData
                          .filter((record) =>
                            // Add filtering logic based on search term if search bar is added
                            Object.values(record).some(
                              (value) =>
                                value &&
                                value
                                  .toString()
                                  .toLowerCase()
                                  .includes(
                                    insuranceHistorySearchTerm.toLowerCase()
                                  )
                            )
                          )
                          .map((record) => (
                            <Tr key={record._id}>
                              <Td>{record.plateNo}</Td>
                              <Td>{record.policyNo}</Td>
                              <Td>{record.orNo}</Td>
                              <Td>{formatDate(record.orDate)}</Td>
                              <Td>{formatDate(record.renewalDate)}</Td>
                              <Td>{formatDate(record.createdAt)}</Td>
                              <Td textAlign="center">
                                {/* Add Edit/Delete Buttons Later -> Now functional */}
                                <IconButton
                                  icon={<EditIcon />}
                                  onClick={() =>
                                    handleEditInsuranceHistory(record)
                                  }
                                  size="sm"
                                  colorScheme="blue"
                                  variant="ghost"
                                  aria-label="Edit History"
                                  mr={1}
                                />
                                <IconButton
                                  icon={<DeleteIcon />}
                                  onClick={() =>
                                    handleDeleteInsuranceHistory(record._id)
                                  }
                                  size="sm"
                                  colorScheme="red"
                                  variant="ghost"
                                  aria-label="Delete History"
                                />
                              </Td>
                            </Tr>
                          ))}
                      </Tbody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Text textAlign="center" p={5}>
                    No Insurance history found for this vehicle.
                  </Text>
                )}
              </>
            )}
          </ModalBody>
          <ModalFooter borderTopWidth="1px">
            {insuranceHistoryFormData._id ? (
              // Edit form footer
              <>
                <Button
                  onClick={handleInsuranceHistoryUpdate}
                  colorScheme="blue"
                  mr={3}
                  isLoading={isLoading}
                >
                  Save Changes
                </Button>
                <Button
                  variant="ghost"
                  onClick={resetInsuranceHistoryEditForm}
                  isDisabled={isLoading}
                >
                  Cancel
                </Button>
              </>
            ) : (
              // Table view footer
              <Button
                variant="outline"
                color="#800020"
                borderColor="#800020"
                onClick={closeInsuranceHistoryModal}
              >
                Close
              </Button>
            )}
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* === Access Request Modal (Copied & Adapted) === */}
      <Modal isOpen={isAccessRequestOpen} onClose={onAccessRequestClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Request Access (Insurance)</ModalHeader>
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
            <Button variant='ghost' onClick={onAccessRequestClose} isDisabled={isSubmittingRequest}>Cancel</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      {/* === End Access Request Modal === */}
    </Box>
  );
}

export default InsuranceRenewal;
