import React, { useState, useEffect } from "react";
import {
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
  Flex,
  Box,
  Tooltip,
  Text,
  FormControl,
  FormLabel,
  Grid,
  GridItem,
  HStack,
  Select,
  Spinner,
  IconButton,
  InputGroup,
  InputLeftElement,
  Badge,
  TableContainer,
  ModalCloseButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  useToast,
} from "@chakra-ui/react";
import axios from "axios";
import { EditIcon, DeleteIcon, Search2Icon, AddIcon, TimeIcon } from "@chakra-ui/icons";
import { formatDate } from "../../utils/dateUtils";

function LtoRenewal() {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { isOpen: isHistoryOpen, onOpen: onHistoryOpen, onClose: onHistoryClose } = useDisclosure();
  const toast = useToast();
  const [renewals, setRenewals] = useState([]);
  const [filteredRenewals, setFilteredRenewals] = useState([]);
  const [formData, setFormData] = useState({
    plateNumber: "",
    vehicleType: "",
    color: "",
    mvucRate: "",
    dueDate: "",
    registeredName: "",
    orNumber: "",
    orDate: "",
    update: "",
    remarks: "",
  });
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [historyData, setHistoryData] = useState([]);
  const [viewingHistoryFor, setViewingHistoryFor] = useState(null);
  const [historySearchTerm, setHistorySearchTerm] = useState("");
  const [historyFormData, setHistoryFormData] = useState({
    _id: null,
    plateNumber: "",
    orNumber: "",
    orDate: "",
    renewedDate: "",
  });

  useEffect(() => {
    fetchRenewals();
  }, [page, itemsPerPage, searchTerm]);

  const fetchRenewals = async () => {
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/lto/paginate?page=${page}&limit=${itemsPerPage}&search=${searchTerm}`
      );
      const { data, pages, total } = response.data;
      setRenewals(data);
      setFilteredRenewals(data);
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
    if (Object.values(formData).some((value) => !value)) {
      alert("All fields are required");
      return;
    }

    setIsLoading(true);

    // Prepare the data to be sent
    let dataToSend = { ...formData };

    // If editing and status is set to 'Renewed', calculate next due date
    if (editingId && dataToSend.update === "Renewed" && dataToSend.dueDate) {
      try {
        const currentDueDate = new Date(dataToSend.dueDate);
        const nextDueDate = new Date(currentDueDate.setFullYear(currentDueDate.getFullYear() + 1));
        dataToSend.dueDate = nextDueDate.toISOString(); // Update dataToSend with the new date
        console.log("Calculated next due date:", dataToSend.dueDate);
      } catch (dateError) {
        console.error("Error calculating next due date:", dateError);
        // Handle potential date parsing errors if needed
        setIsLoading(false);
        return; // Prevent submission if date calculation fails
      }
    }

    try {
      if (editingId) {
        // Update existing LTO record using dataToSend
        const updateResponse = await axios.put(
          process.env.NEXT_PUBLIC_BACKEND_API + `/api/lto/${editingId}`,
          dataToSend // Send the potentially modified data
        );

        // If update was successful and status is 'Renewed', create history record
        if (updateResponse.status === 200 && dataToSend.update === "Renewed") {
          console.log("LTO status set to Renewed, creating history record...");
          const historyPayload = {
            plateNumber: dataToSend.plateNumber,
            orNumber: dataToSend.orNumber,
            orDate: dataToSend.orDate ? new Date(dataToSend.orDate) : new Date(), // Ensure valid date
            renewedDate: new Date() // Use current date as renewed date
          };

          try {
            await axios.post(
              process.env.NEXT_PUBLIC_BACKEND_API + "/api/lto-history",
              historyPayload
            );
            console.log("LTO history record created successfully.");
            // Optionally add a success toast here for history creation
          } catch (historyError) {
            console.error("Error creating LTO history record:", historyError);
            // Optionally add an error toast here for history creation failure
          }
        }
      } else {
        // Create new LTO record (assuming history is not created for brand new entries here)
        await axios.post(
          process.env.NEXT_PUBLIC_BACKEND_API + "/api/lto",
          dataToSend // Send the original data
        );
      }
      fetchRenewals();
      resetForm();
      onClose();
    } catch (error) {
      console.error("Error saving renewal:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (renewal) => {
    setEditingId(renewal._id);
    setFormData({
      plateNumber: renewal.plateNumber,
      vehicleType: renewal.vehicleType,
      color: renewal.color,
      mvucRate: renewal.mvucRate,
      dueDate: renewal.dueDate,
      registeredName: renewal.registeredName,
      orNumber: renewal.orNumber,
      orDate: renewal.orDate,
      update: renewal.update,
      remarks: renewal.remarks,
    });
    onOpen();
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this record?")) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(
          process.env.NEXT_PUBLIC_BACKEND_API + `/api/lto/${id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        fetchRenewals();
        toast({
          title: "Deleted",
          description: "LTO renewal record deleted successfully.",
          status: "success",
          duration: 3000,
          isClosable: true,
          position: "top-right"
        });
      } catch (error) {
        console.error("Error deleting renewal:", error);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      plateNumber: "",
      vehicleType: "",
      color: "",
      mvucRate: "",
      dueDate: "",
      registeredName: "",
      orNumber: "",
      orDate: "",
      update: "",
      remarks: "",
    });
    setEditingId(null);
  };

  const handleSearch = (e) => {
    const term = e.target.value.toLowerCase();
    setSearchTerm(term);

    const filtered = renewals.filter((renewal) =>
      Object.values(renewal).some(
        (value) => value && value.toString().toLowerCase().includes(term)
      )
    );
    setFilteredRenewals(filtered);
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
  };

  const handleItemsPerPageChange = (e) => {
    setItemsPerPage(parseInt(e.target.value));
    setPage(1);
  };

  const handleViewHistory = async (plateNumber) => {
    setViewingHistoryFor(plateNumber);
    setIsHistoryLoading(true);
    onHistoryOpen(); // Open modal immediately
    try {
      if (!plateNumber) {
        console.error("Plate number is undefined, cannot fetch history.");
        setHistoryData([]);
      } else {
        console.log("Fetching history for plate:", plateNumber);
        const requestUrl = `${process.env.NEXT_PUBLIC_BACKEND_API}/api/lto-history/plate/${plateNumber}`;
        console.log("Request URL:", requestUrl);

        const response = await axios.get(requestUrl);
        setHistoryData(response.data);
      }
    } catch (error) {
      console.error(`Error fetching LTO history for ${plateNumber || 'undefined plate'}:`, error);
      if (error.response) {
        console.error("Error response data:", error.response.data);
        console.error("Error response status:", error.response.status);
        console.error("Error response headers:", error.response.headers);
      } else if (error.request) {
        console.error("Error request (no response received):", error.request);
      } else {
        console.error("Error message:", error.message);
      }
      setHistoryData([]);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const handleEditHistory = (historyRecord) => {
    setHistoryFormData({
      _id: historyRecord._id,
      plateNumber: historyRecord.plateNumber,
      orNumber: historyRecord.orNumber,
      orDate: historyRecord.orDate ? formatDate(historyRecord.orDate) : "",
      renewedDate: historyRecord.renewedDate ? formatDate(historyRecord.renewedDate) : "",
    });
  };

  const handleHistoryFormChange = (e) => {
    const { name, value } = e.target;
    setHistoryFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleHistoryUpdate = async () => {
    if (!historyFormData._id) return;
    // Basic validation (can be enhanced)
    if (!historyFormData.orNumber || !historyFormData.orDate || !historyFormData.renewedDate) {
      // Show toast or alert
      console.error("All fields are required for history update.");
      return;
    }

    setIsLoading(true); // Use main loading state for simplicity, or add a new one
    try {
      // Prepare payload, ensuring dates are in correct format if needed
      const payload = {
        orNumber: historyFormData.orNumber,
        orDate: new Date(historyFormData.orDate), // Convert back to Date object
        renewedDate: new Date(historyFormData.renewedDate) // Convert back to Date object
      };

      await axios.put(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/lto-history/${historyFormData._id}`,
        payload
      );

      // Refresh the history data in the main modal
      setHistoryData(prevData => 
        prevData.map(record => 
          record._id === historyFormData._id 
            ? { ...record, ...payload, orDate: payload.orDate.toISOString(), renewedDate: payload.renewedDate.toISOString() } // Update locally
            : record
        )
      );
      
      resetHistoryEditForm(); // Go back to table view within the modal
      // Optionally add success toast
    } catch (error) {
      console.error("Error updating LTO history record:", error);
      // Optionally add error toast
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteHistory = async (historyId) => {
    if (window.confirm("Are you sure you want to delete this history record?")) {
      try {
        await axios.delete(
          `${process.env.NEXT_PUBLIC_BACKEND_API}/api/lto-history/${historyId}`
        );
        // Refresh the history data after successful deletion
        setHistoryData(prevData => prevData.filter(record => record._id !== historyId));
        // Optionally add a success toast
      } catch (error) {
        console.error("Error deleting LTO history record:", error);
        // Optionally add an error toast
      }
    }
  };

  const closeHistoryModal = () => {
    setHistorySearchTerm(""); // Reset search term
    onHistoryClose();
  };

  const resetHistoryEditForm = () => {
    setHistoryFormData({
      _id: null,
      plateNumber: "",
      orNumber: "",
      orDate: "",
      renewedDate: "",
    });
  };

  return (
    <Box>
      <Box>
        <Box>
          <Flex
            p={4}
            borderBottomWidth="1px"
            justify="space-between"
            align="center"
          >
            <Text fontSize="xl" fontWeight="bold">
              LTO RENEWAL
            </Text>
            <Flex gap={4} align="center">
              <InputGroup maxW="md">
                <InputLeftElement pointerEvents="none">
                  <Search2Icon color="gray.400" />
                </InputLeftElement>
                <Input
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={handleSearch}
                  borderColor="#1a365d"
                  _focus={{
                    borderColor: "#800020",
                    boxShadow: "0 0 0 1px #800020",
                  }}
                />
              </InputGroup>
            </Flex>
          </Flex>

          <TableContainer>
            <Table variant="simple">
              <Thead bg="gray.200">
                <Tr>
                  {[
                    "Plate Number",
                    "Vehicle Type",
                    "Color",
                    "MVUC Rate",
                    "Due Date",
                    "Registered Name",
                    "OR Number",
                    "OR Date",
                    "Update",
                    "Remarks",
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
                {filteredRenewals.map((renewal) => (
                  <Tr
                    key={renewal._id}
                    _hover={{ bg: "gray.50" }}
                    transition="all 0.2s"
                  >
                    <Td fontWeight="medium">{renewal.plateNumber}</Td>
                    <Td>{renewal.vehicleType}</Td>
                    <Td>{renewal.color}</Td>
                    <Td>{renewal.mvucRate}</Td>
                    <Td>{renewal.dueDate}</Td>
                    <Td>{renewal.registeredName}</Td>
                    <Td>{renewal.orNumber}</Td>
                    <Td>{renewal.orDate}</Td>
                    <Td>{renewal.update}</Td>
                    <Td>{renewal.remarks}</Td>
                    <Td textAlign="center">
                      <Menu>
                        <MenuButton
                          as={IconButton}
                          aria-label="Options"
                          // Using text ellipsis as a placeholder for a three-dot icon
                          // You might want to install react-icons for a better icon e.g., icon={<BsThreeDotsVertical />}
                          icon={<Text>...</Text>}
                          variant="ghost"
                          size="sm"
                        />
                        <MenuList>
                          <MenuItem icon={<EditIcon />} onClick={() => handleEdit(renewal)}>
                            Edit
                          </MenuItem>
                          <MenuItem icon={<TimeIcon />} onClick={() => handleViewHistory(renewal.plateNumber)}>
                            View History
                          </MenuItem>
                          <MenuItem icon={<DeleteIcon />} onClick={() => handleDelete(renewal._id)} color="red.500">
                            Delete
                          </MenuItem>
                        </MenuList>
                      </Menu>
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
        </Box>

        <Modal isOpen={isOpen} onClose={onClose} size="xl">
          <ModalOverlay />
          <ModalContent maxW="900px">
            <ModalHeader bg="#1a365d" color="white" borderTopRadius="xl">
              {editingId ? "Edit LTO Renewal" : "Add LTO Renewal"}
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
                          {["dueDate", "orDate"].includes(key) ? (
                            <Input
                              type="date"
                              name={key}
                              value={
                                formData[key] ? formatDate(formData[key]) : ""
                              }
                              onChange={(e) => {
                                // Prevent changing due date directly if it's the due date field
                                if (key === 'dueDate') return;
                                const date = new Date(e.target.value);
                                setFormData({
                                  ...formData,
                                  [e.target.name]: date.toISOString(),
                                });
                              }}
                              focusBorderColor="blue.500"
                              borderRadius="md"
                              size="md"
                              bg={key === 'dueDate' ? "gray.100" : "white"} // Add background color for read-only
                              _hover={{ borderColor: "gray.300" }}
                              isReadOnly={key === 'dueDate'} // Make due date read-only
                              onDoubleClick={(e) => {
                                if (key === 'orDate') {
                                  // Open the date picker when double-clicked
                                  e.currentTarget.showPicker();
                                }
                              }}
                            />
                          ) : key === "vehicleType" ? (
                            <Select
                              name={key}
                              value={formData[key]}
                              onChange={handleInputChange}
                              focusBorderColor="blue.500"
                              borderRadius="md"
                              size="md"
                              bg="white"
                              _hover={{ borderColor: "gray.300" }}
                            >
                              <option value="">Select Vehicle Type</option>
                              <option value="10 Wheeler">10 Wheeler</option>
                              <option value="6 Wheeler">6 Wheeler</option>
                            </Select>
                          ) : key === "update" ? (
                            <Select
                              name={key}
                              value={formData[key]}
                              onChange={handleInputChange}
                              focusBorderColor="blue.500"
                              borderRadius="md"
                              size="md"
                              bg="white"
                              _hover={{ borderColor: "gray.300" }}
                            >
                              <option value="">Select Update Status</option>
                              <option value="Renewal In Process">Renewal In Process</option>
                              <option value="Renewed">Renewed</option>
                            </Select>
                          ) : (
                            <Input
                              name={key}
                              value={formData[key]}
                              onChange={
                                key === 'mvucRate'
                                  ? (e) => {
                                      const value = e.target.value;
                                      // Allow empty string, numbers, and potentially a single decimal point
                                      if (value === '' || /^[0-9]*\.?[0-9]*$/.test(value)) {
                                        setFormData({ ...formData, [key]: value });
                                      }
                                    }
                                  : handleInputChange // Use general handler for other inputs
                              }
                              focusBorderColor="blue.500"
                              borderRadius="md"
                              size="md"
                              bg="white"
                              _hover={{ borderColor: "gray.300" }}
                              // Add type="number" specifically for mvucRate
                              type={key === 'mvucRate' ? 'number' : 'text'}
                              // Prevent scrolling from changing the value (optional but good UX)
                              onWheel={(e) => e.target instanceof HTMLElement && e.target.blur()} 
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
                isLoading={isLoading}
                loadingText="Updating..."
              >
                {editingId ? "Update" : "Save"}
              </Button>
              <Button
                variant="outline"
                color="#800020"
                borderColor="#800020"
                onClick={onClose}
                isDisabled={isLoading}
              >
                Cancel
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        {/* History Modal (Now handles both view and edit) */}
        <Modal isOpen={isHistoryOpen} onClose={() => { closeHistoryModal(); resetHistoryEditForm(); }} size="3xl">
          <ModalOverlay />
          <ModalContent>
            <ModalHeader bg="#1a365d" color="white" borderTopRadius="md">
              {historyFormData._id ? 
                `Edit LTO History for: ${historyFormData.plateNumber}` : 
                `LTO Renewal History for: ${viewingHistoryFor}`
              }
            </ModalHeader>
            <ModalCloseButton color="white" />
            <ModalBody py={6}>
              {historyFormData._id ? (
                // EDIT FORM VIEW
                <Grid templateColumns="repeat(1, 1fr)" gap={4}>
                  <FormControl isReadOnly>
                    <FormLabel fontWeight="medium" color="gray.600" fontSize="sm">
                      Plate Number
                    </FormLabel>
                    <Input value={historyFormData.plateNumber} bg="gray.100" />
                  </FormControl>
                  <FormControl isRequired>
                    <FormLabel fontWeight="medium" color="gray.600" fontSize="sm">
                      OR Number
                    </FormLabel>
                    <Input
                      name="orNumber"
                      value={historyFormData.orNumber}
                      onChange={handleHistoryFormChange}
                      focusBorderColor="blue.500"
                    />
                  </FormControl>
                  <FormControl isRequired>
                    <FormLabel fontWeight="medium" color="gray.600" fontSize="sm">
                      OR Date
                    </FormLabel>
                    <Input
                      type="date"
                      name="orDate"
                      value={historyFormData.orDate}
                      onChange={handleHistoryFormChange}
                      focusBorderColor="blue.500"
                      onDoubleClick={(e) => e.currentTarget.showPicker()}
                    />
                  </FormControl>
                  <FormControl isRequired>
                    <FormLabel fontWeight="medium" color="gray.600" fontSize="sm">
                      Renewed Date
                    </FormLabel>
                    <Input
                      type="date"
                      name="renewedDate"
                      value={historyFormData.renewedDate}
                      onChange={handleHistoryFormChange}
                      focusBorderColor="blue.500"
                      onDoubleClick={(e) => e.currentTarget.showPicker()}
                    />
                  </FormControl>
                </Grid>
              ) : (
                // TABLE VIEW
                <>
                  <InputGroup mb={4}>
                    <InputLeftElement pointerEvents="none">
                      <Search2Icon color="gray.400" />
                    </InputLeftElement>
                    <Input 
                      placeholder="Search history (e.g., OR Number)..." 
                      value={historySearchTerm}
                      onChange={(e) => setHistorySearchTerm(e.target.value)}
                      borderColor="gray.300"
                      _focus={{
                        borderColor: "blue.500",
                        boxShadow: "0 0 0 1px blue.500",
                      }}
                    />
                  </InputGroup>

                  {isHistoryLoading ? (
                    <Flex justify="center" align="center" height="200px">
                      <Spinner size="xl" />
                    </Flex>
                  ) : historyData.length > 0 ? (
                    <TableContainer>
                      <Table variant="simple" size="sm">
                        <Thead bg="gray.100">
                          <Tr>
                            <Th>Plate Number</Th>
                            <Th>OR Number</Th>
                            <Th>OR Date</Th>
                            <Th>Renewed Date</Th>
                            <Th>Recorded At</Th>
                            <Th textAlign="center">Actions</Th> 
                          </Tr>
                        </Thead>
                        <Tbody>
                          {historyData
                            .filter(record => 
                              Object.values(record).some(value => 
                                value && value.toString().toLowerCase().includes(historySearchTerm.toLowerCase())
                              )
                            )
                            .map((record) => (
                            <Tr key={record._id}>
                              <Td>{record.plateNumber}</Td>
                              <Td>{record.orNumber}</Td>
                              <Td>{formatDate(record.orDate)}</Td>
                              <Td>{formatDate(record.renewedDate)}</Td>
                              <Td>{formatDate(record.createdAt)}</Td> 
                              <Td textAlign="center">
                                <IconButton
                                  icon={<EditIcon />}
                                  onClick={() => handleEditHistory(record)} // Sets historyFormData._id
                                  size="sm"
                                  colorScheme="blue"
                                  variant="ghost"
                                  aria-label="Edit"
                                />
                                <IconButton
                                  icon={<DeleteIcon />}
                                  onClick={() => handleDeleteHistory(record._id)}
                                  size="sm"
                                  colorScheme="red"
                                  variant="ghost"
                                  aria-label="Delete History Record"
                                />
                              </Td>
                            </Tr>
                          ))}
                        </Tbody>
                      </Table>
                    </TableContainer>
                  ) : (
                    <Text textAlign="center" p={5}>
                      No history found for this vehicle.
                    </Text>
                  )}
                </>
              )}
            </ModalBody>
            <ModalFooter borderTopWidth="1px">
              {historyFormData._id ? (
                // EDIT FORM FOOTER
                <>
                  <Button
                    onClick={handleHistoryUpdate}
                    bg="#1a365d"
                    color="white"
                    _hover={{ bg: "#2a4365" }}
                    mr={3}
                    isLoading={isLoading} // Using main loading state
                    loadingText="Saving..."
                  >
                    Save Changes
                  </Button>
                  <Button
                    variant="outline"
                    color="#800020"
                    borderColor="#800020"
                    onClick={resetHistoryEditForm} // Go back to table view
                    isDisabled={isLoading}
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                // TABLE VIEW FOOTER
                <Button
                  variant="outline"
                  color="#800020"
                  borderColor="#800020"
                  onClick={() => { closeHistoryModal(); resetHistoryEditForm(); }}
                >
                  Close
                </Button>
              )}
            </ModalFooter>
          </ModalContent>
        </Modal>
      </Box>
    </Box>
  );
}

export default LtoRenewal;
