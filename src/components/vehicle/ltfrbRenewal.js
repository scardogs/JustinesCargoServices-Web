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
  InputGroup,
  InputLeftElement,
  Badge,
  TableContainer,
  ModalCloseButton,
  IconButton,
  Spinner,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  useToast,
} from "@chakra-ui/react";
import axios from "axios";
import { EditIcon, DeleteIcon, Search2Icon, AddIcon, TimeIcon } from "@chakra-ui/icons";
import { formatDate } from "../../utils/dateUtils";

function LtfrbRenewal() {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { isOpen: isHistoryOpen, onOpen: onHistoryOpen, onClose: onHistoryClose } = useDisclosure();
  const toast = useToast();
  const [renewals, setRenewals] = useState([]);
  const [filteredRenewals, setFilteredRenewals] = useState([]);
  const [formData, setFormData] = useState({
    plateNo: "",
    caseNo: "",
    decisionDate: "",
    expiryDate: "",
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
  const [ltfrbHistoryData, setLtfrbHistoryData] = useState([]);
  const [viewingHistoryForPlate, setViewingHistoryForPlate] = useState(null);
  const [ltfrbHistorySearchTerm, setLtfrbHistorySearchTerm] = useState("");
  const [ltfrbHistoryFormData, setLtfrbHistoryFormData] = useState({
    _id: null,
    plateNo: "",
    caseNo: "",
    decisionDate: "",
    expiryDate: "",
    renewedDate: "",
  });

  useEffect(() => {
    fetchRenewals();
  }, [page, itemsPerPage, searchTerm]);

  const fetchRenewals = async () => {
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/ltfrb/paginate?page=${page}&limit=${itemsPerPage}&search=${searchTerm}`
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
    try {
      let dataToSend = { ...formData };
      if (editingId) {
        const updateResponse = await axios.put(
          process.env.NEXT_PUBLIC_BACKEND_API + `/api/ltfrb/${editingId}`,
          dataToSend
        );

        if (updateResponse.status === 200 && dataToSend.update === "RENEWED") {
          console.log("LTFRB status set to RENEWED, attempting to create history...");

          if (dataToSend.plateNo && dataToSend.caseNo && dataToSend.decisionDate && dataToSend.expiryDate) {
            const historyPayload = {
              plateNo: dataToSend.plateNo,
              caseNo: dataToSend.caseNo,
              decisionDate: new Date(dataToSend.decisionDate),
              expiryDate: new Date(dataToSend.expiryDate),
              renewedDate: new Date()
            };

            try {
              await axios.post(
                `${process.env.NEXT_PUBLIC_BACKEND_API}/api/ltfrb-history`,
                historyPayload
              );
              console.log("LTFRB history created successfully.");

              // Now, send a second request to reset the main record's status and dates
              console.log("Resetting main LTFRB record status to PENDING...");
              try {
                const resetPayload = {
                  decisionDate: null,
                  expiryDate: null,
                  update: "PENDING", // Set status back to PENDING
                  // Include other fields from dataToSend if the backend requires them or to avoid accidental clearing
                  plateNo: dataToSend.plateNo, 
                  caseNo: dataToSend.caseNo, 
                  remarks: dataToSend.remarks // Preserve remarks
                };
                await axios.put(
                  `${process.env.NEXT_PUBLIC_BACKEND_API}/api/ltfrb/${editingId}`,
                  resetPayload
                );
                console.log("Main LTFRB record reset successfully.");

              } catch (resetError) {
                console.error("Error resetting main LTFRB record:", resetError);
                // Optionally show an error toast specifically for the reset failure
              }

            } catch (historyError) {
              console.error("Error creating LTFRB history:", historyError);
            }
          } else {
            console.error("Cannot create history record: Missing required fields (Plate, Case, Decision Date, Expiry Date) in the main record.");
          }
        }
      } else {
        await axios.post(
          process.env.NEXT_PUBLIC_BACKEND_API + "/api/ltfrb",
          dataToSend
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
      plateNo: renewal.plateNo,
      caseNo: renewal.caseNo,
      decisionDate: renewal.decisionDate
        ? renewal.decisionDate.split("T")[0]
        : "",
      expiryDate: renewal.expiryDate ? renewal.expiryDate.split("T")[0] : "",
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
          process.env.NEXT_PUBLIC_BACKEND_API + `/api/ltfrb/${id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        fetchRenewals();
        toast({
          title: "Deleted",
          description: "LTFRB renewal record deleted successfully.",
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
      plateNo: "",
      caseNo: "",
      decisionDate: "",
      expiryDate: "",
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

  const handleViewLtfrbHistory = async (plateNo) => {
    if (!plateNo) {
      console.error("Plate number is undefined, cannot fetch LTFRB history.");
      return;
    }
    setViewingHistoryForPlate(plateNo);
    setIsHistoryLoading(true);
    resetLtfrbHistoryEditForm();
    onHistoryOpen();
    try {
      const requestUrl = `${process.env.NEXT_PUBLIC_BACKEND_API}/api/ltfrb-history/plate/${plateNo}`;
      const response = await axios.get(requestUrl);
      setLtfrbHistoryData(response.data);
    } catch (error) {
      console.error(`Error fetching LTFRB history for ${plateNo}:`, error);
      setLtfrbHistoryData([]);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const handleEditLtfrbHistory = (historyRecord) => {
    setLtfrbHistoryFormData({
      _id: historyRecord._id,
      plateNo: historyRecord.plateNo,
      caseNo: historyRecord.caseNo,
      decisionDate: historyRecord.decisionDate ? formatDate(historyRecord.decisionDate) : "",
      expiryDate: historyRecord.expiryDate ? formatDate(historyRecord.expiryDate) : "",
      renewedDate: historyRecord.renewedDate ? formatDate(historyRecord.renewedDate) : "",
    });
  };

  const handleDeleteLtfrbHistory = async (historyId) => {
    if (window.confirm("Are you sure you want to delete this LTFRB history record?")) {
      try {
        await axios.delete(
          `${process.env.NEXT_PUBLIC_BACKEND_API}/api/ltfrb-history/${historyId}`
        );
        setLtfrbHistoryData(prevData => prevData.filter(record => record._id !== historyId));
      } catch (error) {
        console.error("Error deleting LTFRB history record:", error);
      }
    }
  };

  const handleLtfrbHistoryFormChange = (e) => {
    const { name, value, type } = e.target;

    let updatedValue = value;
    // Check if the input is a date type and if the value is being cleared
    if (type === 'date' && !value) {
      updatedValue = null; // Set to null if cleared
    } // Note: We format back to YYYY-MM-DD string for input display below

    setLtfrbHistoryFormData(prev => {
      const newState = {
        ...prev,
        [name]: updatedValue === null ? "" : updatedValue
      };

      // If decisionDate changed, reset expiryDate
      if (name === 'decisionDate') {
        newState.expiryDate = ""; // Reset expiry date field
      }

      return newState;
    });
  };

  const handleLtfrbHistoryUpdate = async () => {
    if (!ltfrbHistoryFormData._id) return;
    if (!ltfrbHistoryFormData.caseNo || !ltfrbHistoryFormData.decisionDate || !ltfrbHistoryFormData.expiryDate) {
      console.error("Case No, Decision Date, and Expiry Date are required for history update.");
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        caseNo: ltfrbHistoryFormData.caseNo,
        // Convert back to Date object or null before sending to backend
        decisionDate: ltfrbHistoryFormData.decisionDate ? new Date(ltfrbHistoryFormData.decisionDate) : null,
        expiryDate: ltfrbHistoryFormData.expiryDate ? new Date(ltfrbHistoryFormData.expiryDate) : null,
      };

      await axios.put(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/ltfrb-history/${ltfrbHistoryFormData._id}`,
        payload
      );

      setLtfrbHistoryData(prevData =>
        prevData.map(record =>
          record._id === ltfrbHistoryFormData._id
            ? { ...record, ...ltfrbHistoryFormData,
                // Use state data directly as it includes formatted dates
                decisionDate: ltfrbHistoryFormData.decisionDate ? new Date(ltfrbHistoryFormData.decisionDate).toISOString() : null, 
                expiryDate: ltfrbHistoryFormData.expiryDate ? new Date(ltfrbHistoryFormData.expiryDate).toISOString() : null 
              }
            : record
        )
      );

      resetLtfrbHistoryEditForm();
    } catch (error) {
      console.error("Error updating LTFRB history record:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const resetLtfrbHistoryEditForm = () => {
    setLtfrbHistoryFormData({
      _id: null, plateNo: "", caseNo: "", decisionDate: "", expiryDate: "", renewedDate: ""
    });
  };

  const closeLtfrbHistoryModal = () => {
    setLtfrbHistorySearchTerm("");
    resetLtfrbHistoryEditForm();
    onHistoryClose();
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
              LTFRB RENEWAL
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
                    "Case Number",
                    "Decision Date",
                    "Expiry Date",
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
                    <Td fontWeight="medium">{renewal.plateNo}</Td>
                    <Td>{renewal.caseNo}</Td>
                    <Td>
                      {renewal.decisionDate
                        ? new Date(renewal.decisionDate).toLocaleDateString(
                            "en-US"
                          )
                        : ""}
                    </Td>
                    <Td>
                      {renewal.expiryDate
                        ? new Date(renewal.expiryDate).toLocaleDateString(
                            "en-US"
                          )
                        : ""}
                    </Td>
                    <Td>{renewal.update}</Td>
                    <Td>{renewal.remarks}</Td>
                    <Td textAlign="center">
                     <Menu>
                        <MenuButton
                          as={IconButton}
                          aria-label="Options"
                          // Using text ellipsis as placeholder
                          icon={<Text>...</Text>}
                          variant="ghost"
                          size="sm"
                        />
                        <MenuList>
                          <MenuItem icon={<EditIcon />} onClick={() => handleEdit(renewal)}>
                            Edit
                          </MenuItem>
                          <MenuItem icon={<TimeIcon />} onClick={() => handleViewLtfrbHistory(renewal.plateNo)}>
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
              {editingId ? "Edit LTFRB Renewal" : "Add LTFRB Renewal"}
            </ModalHeader>
            <ModalCloseButton color="white" />
            <ModalBody py={6}>
              <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                {Object.keys(formData).map((key) => {
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
                        {["decisionDate", "expiryDate"].includes(key) ? (
                          <Input
                            type="date"
                            name={key}
                            value={
                              formData[key] ? formatDate(formData[key]) : ""
                            }
                            onChange={(e) => {
                              const value = e.target.value;
                              const dateValue = value ? new Date(value).toISOString() : null; 
                              setFormData({
                                ...formData,
                                [key]: dateValue,
                              });
                            }}
                            focusBorderColor="blue.500"
                            borderRadius="md"
                            size="md"
                            bg="white"
                            _hover={{ borderColor: "gray.300" }}
                            min={key === 'expiryDate' && formData.decisionDate ? formatDate(formData.decisionDate) : undefined}
                            isDisabled={key === 'expiryDate' && !formData.decisionDate}
                            onDoubleClick={(e) => e.currentTarget.showPicker()}
                          />
                        ) : key === 'update' ? (
                          <Select
                            name={key}
                            value={formData[key]}
                            onChange={handleInputChange}
                            focusBorderColor="blue.500"
                            borderRadius="md"
                            size="md"
                            bg="white"
                            _hover={{ borderColor: "gray.300" }}
                            placeholder="Select Update Status..."
                          >
                            <option value="PENDING">PENDING</option>
                            <option value="RENEWAL IN PROCESS">RENEWAL IN PROCESS</option>
                            <option value="RENEWED">RENEWED</option>
                          </Select>
                        ) : (
                          <Input
                            name={key}
                            value={formData[key]}
                            onChange={
                              key === 'caseNo'
                                ? (e) => {
                                    const value = e.target.value;
                                    // Allow empty string or only digits
                                    if (value === '' || /^[0-9]*$/.test(value)) {
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
                            type={key === 'caseNo' ? 'number' : 'text'}
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
                isDisabled={isLoading}
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

        {/* LTFRB History Modal (Handles View/Edit/Delete) */}
        <Modal isOpen={isHistoryOpen} onClose={closeLtfrbHistoryModal} size="4xl">
          <ModalOverlay />
          <ModalContent>
            <ModalHeader bg="#1a365d" color="white" borderTopRadius="md">
              {ltfrbHistoryFormData._id ?
                `Edit LTFRB History: ${ltfrbHistoryFormData.plateNo} / ${ltfrbHistoryFormData.caseNo}` :
                `LTFRB Renewal History for: ${viewingHistoryForPlate}`
              }
            </ModalHeader>
            <ModalCloseButton color="white" />
            <ModalBody py={6}>
              {ltfrbHistoryFormData._id ? (
                <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                   <FormControl isReadOnly gridColumn="span 2">
                    <FormLabel>Plate Number</FormLabel>
                    <Input value={ltfrbHistoryFormData.plateNo} bg="gray.100" />
                  </FormControl>
                  <FormControl isRequired>
                    <FormLabel>Case Number</FormLabel>
                    <Input name="caseNo" value={ltfrbHistoryFormData.caseNo} onChange={handleLtfrbHistoryFormChange} />
                  </FormControl>
                   <FormControl isReadOnly>
                    <FormLabel>Renewed Date</FormLabel>
                    <Input type="date" name="renewedDate" value={ltfrbHistoryFormData.renewedDate ? formatDate(ltfrbHistoryFormData.renewedDate) : ""} bg="gray.100" isReadOnly />
                  </FormControl>
                  <FormControl isRequired>
                    <FormLabel>Decision Date</FormLabel>
                    <Input type="date" name="decisionDate" value={ltfrbHistoryFormData.decisionDate || ""} onChange={handleLtfrbHistoryFormChange} isDisabled={isLoading} onDoubleClick={(e) => e.currentTarget.showPicker()} />
                  </FormControl>
                  <FormControl isRequired>
                    <FormLabel>Expiry Date</FormLabel>
                    <Input 
                      type="date" 
                      name="expiryDate" 
                      value={ltfrbHistoryFormData.expiryDate || ""} 
                      onChange={handleLtfrbHistoryFormChange} 
                      min={ltfrbHistoryFormData.decisionDate ? ltfrbHistoryFormData.decisionDate : undefined}
                      isDisabled={!ltfrbHistoryFormData.decisionDate || isLoading}
                      onDoubleClick={(e) => e.currentTarget.showPicker()}
                    />
                  </FormControl>
                 
                </Grid>
              ) : (
                <>
                  <InputGroup mb={4}>
                    <InputLeftElement pointerEvents="none"><Search2Icon color="gray.400" /></InputLeftElement>
                    <Input
                      placeholder="Search history..."
                      value={ltfrbHistorySearchTerm}
                      onChange={(e) => setLtfrbHistorySearchTerm(e.target.value)}
                    />
                  </InputGroup>
                  {isHistoryLoading ? (
                    <Flex justify="center" align="center" minH="200px"><Spinner size="xl" /></Flex>
                  ) : ltfrbHistoryData.length > 0 ? (
                    <TableContainer>
                      <Table variant="simple" size="sm">
                        <Thead bg="gray.100">
                          <Tr>
                            <Th>Plate No</Th>
                            <Th>Case No</Th>
                            <Th>Decision Date</Th>
                            <Th>Expiry Date</Th>
                            <Th>Renewed Date</Th>
                            <Th>Recorded At</Th>
                            <Th textAlign="center">Actions</Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {ltfrbHistoryData
                            .filter(record =>
                              Object.values(record).some(value =>
                                value && value.toString().toLowerCase().includes(ltfrbHistorySearchTerm.toLowerCase())
                              )
                            )
                            .map((record) => (
                              <Tr key={record._id}>
                                <Td>{record.plateNo}</Td>
                                <Td>{record.caseNo}</Td>
                                <Td>{formatDate(record.decisionDate)}</Td>
                                <Td>{formatDate(record.expiryDate)}</Td>
                                <Td>{formatDate(record.renewedDate)}</Td>
                                <Td>{formatDate(record.createdAt)}</Td>
                                <Td textAlign="center">
                                  <IconButton icon={<EditIcon />} onClick={() => handleEditLtfrbHistory(record)} size="sm" colorScheme="blue" variant="ghost" aria-label="Edit History" mr={1}/>
                                  <IconButton icon={<DeleteIcon />} onClick={() => handleDeleteLtfrbHistory(record._id)} size="sm" colorScheme="red" variant="ghost" aria-label="Delete History" />
                                </Td>
                              </Tr>
                            ))}
                        </Tbody>
                      </Table>
                    </TableContainer>
                  ) : (
                    <Text textAlign="center" p={5}>No LTFRB history found for this vehicle.</Text>
                  )}
                </>
              )}
            </ModalBody>
            <ModalFooter borderTopWidth="1px">
              {ltfrbHistoryFormData._id ? (
                <>
                  <Button onClick={handleLtfrbHistoryUpdate} colorScheme="blue" mr={3} isLoading={isLoading}>Save Changes</Button>
                  <Button variant="ghost" onClick={resetLtfrbHistoryEditForm} isDisabled={isLoading}>Cancel</Button>
                </>
              ) : (
                <Button variant="outline" color="#800020" borderColor="#800020" onClick={closeLtfrbHistoryModal}>Close</Button>
              )}
            </ModalFooter>
          </ModalContent>
        </Modal>
      </Box>
    </Box>
  );
}

export default LtfrbRenewal;
