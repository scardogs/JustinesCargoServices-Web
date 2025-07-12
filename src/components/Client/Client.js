"use client";
import {
  Box,
  Button,
  Input,
  Text,
  Flex,
  Spacer,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  IconButton,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  FormControl,
  FormLabel,
  Heading,
  useToast,
  Tooltip,
  TableContainer,
  Image,
  Badge,
  useBreakpointValue,
  VStack,
  HStack,
  useDisclosure,
  Select,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  InputGroup,
  InputLeftElement,
  SimpleGrid,
} from "@chakra-ui/react";
import {
  AddIcon,
  EditIcon,
  DeleteIcon,
  Search2Icon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@chakra-ui/icons";
import { useState, useEffect, useRef } from "react";
import axios from "axios";

export default function IndividualsTable() {
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    _id: null,
    individualID: "",
    individualName: "",
    individualAddress: "",
    individualContactNumber: "",
    individualEmail: "",
    individualTIN: "",
    individualStatus: "",
  });
  const [individuals, setIndividuals] = useState([]);
  const toast = useToast();
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [isConsigneeModalOpen, setIsConsigneeModalOpen] = useState(false);
  const [selectedIndividual, setSelectedIndividual] = useState(null);
  const [consignees, setConsignees] = useState([]);
  const [isConsigneeFormView, setIsConsigneeFormView] = useState(false);
  const [consigneeFormData, setConsigneeFormData] = useState({
    consigneeName: "",
    consigneeBusinessAddress: "",
    consigneeTIN: "",
  });
  const [consigneeSearchTerm, setConsigneeSearchTerm] = useState("");
  const [selectedIndividualId, setSelectedIndividualId] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editConsigneeId, setEditConsigneeId] = useState(null);
  const [individualToDelete, setIndividualToDelete] = useState(null);
  const {
    isOpen: isDeleteIndividualOpen,
    onOpen: onDeleteIndividualOpen,
    onClose: onDeleteIndividualClose,
  } = useDisclosure();
  const cancelRef = useRef();
  const [isSavingIndividual, setIsSavingIndividual] = useState(false);
  const [isDeletingIndividual, setIsDeletingIndividual] = useState(false);

  // Fetch all individuals
  const fetchIndividuals = async () => {
    try {
      const response = await fetch(
        process.env.NEXT_PUBLIC_BACKEND_API + "/api/individuals"
      );
      if (response.ok) {
        const data = await response.json();

        // Fetch consignee count for each individual
        const individualsWithConsigneeCount = await Promise.all(
          data.map(async (individual) => {
            try {
              const consigneeResponse = await axios.get(
                `${process.env.NEXT_PUBLIC_BACKEND_API}/api/individual-consignees/individual/${individual._id}`
              );
              return {
                ...individual,
                consigneeCount: consigneeResponse.data.length || 0,
              };
            } catch (error) {
              console.error(
                "Error fetching consignees for individual:",
                individual._id,
                error
              );
              return {
                ...individual,
                consigneeCount: 0,
              };
            }
          })
        );

        setIndividuals(individualsWithConsigneeCount);
      } else {
        console.error("Failed to fetch individuals");
        toast({
          title: "Error",
          description: "Failed to fetch individuals",
          status: "error",
          duration: 3000,
          isClosable: true,
          position: "top-right",
        });
      }
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "Error fetching individuals",
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "top-right",
      });
    }
  };

  useEffect(() => {
    fetchIndividuals();
  }, []);

  // Input change handler
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  // Edit individual
  const handleEdit = (individualId) => {
    const individualToEdit = individuals.find(
      (individual) => individual._id === individualId
    );
    setFormData(individualToEdit);
    setIsModalOpen(true);
  };

  // Add new individual
  const handleAdd = () => {
    const individualIDs = individuals.map((ind) => {
      const idNumber = parseInt(ind.individualID.replace("IN", ""));
      return isNaN(idNumber) ? 0 : idNumber;
    });

    const maxIndividualID =
      individualIDs.length > 0 ? Math.max(...individualIDs) : 0;
    const newIndividualID = `IN${String(maxIndividualID + 1).padStart(6, "0")}`;

    setFormData({
      _id: null,
      individualID: newIndividualID,
      individualName: "",
      individualAddress: "",
      individualContactNumber: "",
      individualEmail: "",
      individualTIN: "",
      individualStatus: "",
    });
    setIsModalOpen(true);
  };

  // Submit form (Create or Update Individual)
  const handleSubmit = async () => {
    if (!validateForm()) {
      toast({
        title: "Error",
        description: "All required fields must be filled",
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "top-right",
      });
      return;
    }

    setIsSavingIndividual(true);
    try {
      const url = formData._id
        ? `${process.env.NEXT_PUBLIC_BACKEND_API}/api/individuals/${formData._id}`
        : `${process.env.NEXT_PUBLIC_BACKEND_API}/api/individuals`;
      const method = formData._id ? "PUT" : "POST";
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const updatedIndividual = await response.json();
        if (formData._id) {
          // Update the existing individual in the state
          setIndividuals((prev) =>
            prev.map((ind) =>
              ind._id === updatedIndividual._id ? updatedIndividual : ind
            )
          );
        } else {
          // Add the new individual to the state
          setIndividuals((prev) => [...prev, updatedIndividual]);
        }

        toast({
          title: "Success",
          description: `Individual ${
            formData._id ? "updated" : "added"
          } successfully!`,
          status: "success",
          duration: 3000,
          isClosable: true,
          position: "top-right",
        });
        setIsModalOpen(false);
      } else {
        throw new Error("Failed to save individual");
      }
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: error.message || "Something went wrong!",
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "top-right",
      });
    } finally {
      setIsSavingIndividual(false);
    }
  };

  // Individual Delete Handling
  const handleDeleteIndividualClick = (individual) => {
    setIndividualToDelete(individual);
    onDeleteIndividualOpen();
  };

  const confirmDeleteIndividual = async () => {
    if (!individualToDelete) return;
    const individualId = individualToDelete._id;

    setIsDeletingIndividual(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast({
          title: "Error",
          description: "Authentication token not found. Please log in.",
          status: "error",
        });
        onDeleteIndividualClose();
        setIndividualToDelete(null);
        return;
      }
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/individuals/${individualId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        toast({
          title: "Success",
          description: `Individual '${individualToDelete.individualName}' deleted successfully and logged`,
          status: "success",
        });
        fetchIndividuals();
      } else {
        const errorData = await response
          .json()
          .catch(() => ({ message: "Failed to delete individual" }));
        const errorDesc =
          response.status === 401 || response.status === 403
            ? "Authentication failed. Please log in again."
            : errorData.message || "Failed to delete individual";
        throw new Error(errorDesc);
      }
    } catch (error) {
      console.error("Error deleting individual:", error);
      toast({ title: "Error", description: error.message, status: "error" });
    }
    onDeleteIndividualClose();
    setIndividualToDelete(null);
    setIsDeletingIndividual(false);
  };

  // Filter individuals based on search input
  const filteredIndividuals = individuals.filter((individual) =>
    individual.individualName.toLowerCase().includes(search.toLowerCase())
  );

  // Calculate pagination values
  const indexOfLastIndividual = currentPage * itemsPerPage;
  const indexOfFirstIndividual = indexOfLastIndividual - itemsPerPage;
  const currentIndividuals = filteredIndividuals.slice(
    indexOfFirstIndividual,
    indexOfLastIndividual
  );
  const totalPages = Math.ceil(filteredIndividuals.length / itemsPerPage);

  // Handle page change
  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  // Handle search input change
  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
    setSearch(e.target.value);
  };

  // Update table header
  const tableHeaders = [
    "Name",
    "Consignee",
    "Address",
    "Contact",
    "Email",
    "TIN",
    "Status",
    "Actions",
  ];

  // Update table rows
  const renderTableRows = () =>
    currentIndividuals.map((individual) => (
      <Tr key={individual._id} _hover={{ bg: "gray.50" }} transition="all 0.2s">
        <Td>{individual.individualName}</Td>
        <Td
          cursor="pointer"
          _hover={{ textDecoration: "underline" }}
          onClick={() => handleConsigneeClick(individual)}
        >
          <Text
            color="blue.500"
            border="1px solid"
            borderColor="blue.500"
            borderRadius="md"
            px={2}
            py={1}
            display="inline-block"
          >
            {individual.consigneeCount || 0} Consignee
            {individual.consigneeCount !== 1 ? "s" : ""}
          </Text>
        </Td>
        <Td>{individual.individualAddress}</Td>
        <Td>{individual.individualContactNumber}</Td>
        <Td>{individual.individualEmail}</Td>
        <Td>
          {individual.individualTIN &&
            individual.individualTIN.replace(
              /(\d{3})(\d{3})(\d{3})/,
              "$1-$2-$3"
            )}
        </Td>
        <Td>
          <Text
            color={
              individual.individualStatus === "Active" ? "green.500" : "red.500"
            }
            fontWeight="medium"
            border="1px solid"
            borderColor={
              individual.individualStatus === "Active" ? "green.500" : "red.500"
            }
            borderRadius="md"
            px={2}
            py={1}
            display="inline-block"
          >
            {individual.individualStatus}
          </Text>
        </Td>
        <Td textAlign="center">
          <Flex gap={2} justify="center">
            <Tooltip label="Edit" placement="top" hasArrow>
              <IconButton
                icon={<EditIcon />}
                size="sm"
                variant="ghost"
                color="blue.500"
                onClick={() => handleEdit(individual._id)}
                _hover={{ bg: "blue.50" }}
              />
            </Tooltip>
            <Tooltip label="Delete" placement="top" hasArrow>
              <IconButton
                icon={<DeleteIcon />}
                size="sm"
                variant="ghost"
                color="red.500"
                onClick={() => handleDeleteIndividualClick(individual)}
                _hover={{ bg: "red.50" }}
              />
            </Tooltip>
          </Flex>
        </Td>
      </Tr>
    ));

  // Validate form
  const validateForm = () => {
    const requiredFields = [
      "individualName",
      "individualAddress",
      "individualContactNumber",
      "individualEmail",
      "individualTIN",
      "individualStatus",
    ];

    if (requiredFields.some((field) => !formData[field])) {
      return false;
    }

    // Add validation for the new ID format
    if (!/^IN\d{6}$/.test(formData.individualID)) {
      toast({
        title: "Error",
        description: "Individual ID must be in the format IN000000",
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "top-right",
      });
      return false;
    }

    return true;
  };

  // Update the fetchConsignees function
  const fetchConsignees = async (individualId) => {
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/individual-consignees`,
        { params: { individualId } }
      );
      setConsignees(response.data);
    } catch (error) {
      console.error("Error fetching consignees:", error);
      toast({
        title: "Error",
        description:
          error.response?.data?.message || "Failed to fetch consignees",
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "top-right",
      });
      setConsignees([]);
    }
  };

  // Update the handleConsigneeClick function
  const handleConsigneeClick = async (individual) => {
    setSelectedIndividual(individual.individualName);
    setSelectedIndividualId(individual._id);
    await fetchConsignees(individual._id);
    setIsConsigneeModalOpen(true);
  };

  // Move this function before the modal where it's used
  const renderFormFields = () => (
    <>
      <FormControl mt={4}>
        <FormLabel fontWeight="medium" color="gray.600">
          Name
        </FormLabel>
        <Input
          name="individualName"
          value={formData.individualName}
          onChange={handleInputChange}
          size="lg"
          height="56px"
          borderColor="gray.300"
        />
      </FormControl>

      <FormControl mt={4}>
        <FormLabel fontWeight="medium" color="gray.600">
          Address
        </FormLabel>
        <Input
          name="individualAddress"
          value={formData.individualAddress}
          onChange={handleInputChange}
          size="lg"
          height="56px"
          borderColor="gray.300"
        />
      </FormControl>

      <FormControl mt={4}>
        <FormLabel fontWeight="medium" color="gray.600">
          Contact Number
        </FormLabel>
        <Input
          name="individualContactNumber"
          value={formData.individualContactNumber}
          onChange={handleInputChange}
          size="lg"
          height="56px"
          borderColor="gray.300"
        />
      </FormControl>

      <FormControl mt={4}>
        <FormLabel fontWeight="medium" color="gray.600">
          Email
        </FormLabel>
        <Input
          name="individualEmail"
          value={formData.individualEmail}
          onChange={handleInputChange}
          size="lg"
          height="56px"
          borderColor="gray.300"
        />
      </FormControl>

      <FormControl mt={4}>
        <FormLabel fontWeight="medium" color="gray.600">
          TIN
        </FormLabel>
        <Input
          name="individualTIN"
          value={
            formData.individualTIN
              ? formData.individualTIN.replace(
                  /(\d{3})(\d{3})(\d{3})/,
                  "$1-$2-$3"
                )
              : ""
          }
          onChange={(e) => {
            const value = e.target.value.replace(/-/g, "");
            handleInputChange({ target: { name: "individualTIN", value } });
          }}
          size="lg"
          height="56px"
          borderColor="gray.300"
        />
      </FormControl>

      <FormControl mt={4}>
        <FormLabel fontWeight="medium" color="gray.600">
          Status
        </FormLabel>
        <Select
          name="individualStatus"
          value={formData.individualStatus}
          onChange={handleInputChange}
          size="lg"
          height="56px"
          borderColor="gray.300"
        >
          <option value="">Select Status</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </Select>
      </FormControl>
    </>
  );

  // Add this modal component just before the main return statement
  const ConsigneeModal = ({
    isOpen,
    onClose,
    consignees: parentConsignees,
    setConsignees: setParentConsignees,
    individualName,
    selectedIndividualId,
  }) => {
    const [searchTerm, setSearchTerm] = useState("");
    const [isFormView, setIsFormView] = useState(false);
    const [formData, setFormData] = useState({
      name: "",
      address: "",
      tin: "",
    });
    const toast = useToast();
    const [consigneeToDelete, setConsigneeToDelete] = useState(null);
    const {
      isOpen: isDeleteConsigneeOpen,
      onOpen: onDeleteConsigneeOpen,
      onClose: onDeleteConsigneeClose,
    } = useDisclosure();
    const [isSavingIndivConsignee, setIsSavingIndivConsignee] = useState(false);
    const [isDeletingIndivConsignee, setIsDeletingIndivConsignee] =
      useState(false);

    const handleFormChange = (e) => {
      const { name, value } = e.target;
      setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleEditConsignee = (consignee) => {
      setIsEditMode(true);
      setEditConsigneeId(consignee._id);
      setFormData({
        name: consignee.name,
        address: consignee.address,
        tin: consignee.tin,
      });
      setIsFormView(true);
    };

    const handleFormSubmit = async () => {
      setIsSavingIndivConsignee(true);
      try {
        // Validate form data
        if (!formData.name || !formData.address || !formData.tin) {
          toast({
            title: "Error",
            description: "Please fill all required fields",
            status: "error",
            duration: 3000,
            isClosable: true,
            position: "top-right",
          });
          return;
        }

        if (isEditMode) {
          // Update existing consignee
          const response = await axios.put(
            `${process.env.NEXT_PUBLIC_BACKEND_API}/api/individual-consignees/${editConsigneeId}`,
            {
              ...formData,
              individualId: selectedIndividualId,
            }
          );

          toast({
            title: "Success",
            description: "Consignee updated successfully",
            status: "success",
            duration: 3000,
            isClosable: true,
            position: "top-right",
          });
        } else {
          // Create new consignee
          const response = await axios.post(
            `${process.env.NEXT_PUBLIC_BACKEND_API}/api/individual-consignees`,
            {
              ...formData,
              individualId: selectedIndividualId,
            }
          );

          toast({
            title: "Success",
            description: "Consignee added successfully",
            status: "success",
            duration: 3000,
            isClosable: true,
            position: "top-right",
          });
        }

        // Reset form and switch back to table view
        setIsFormView(false);
        setIsEditMode(false);
        setEditConsigneeId(null);
        setFormData({
          name: "",
          address: "",
          tin: "",
        });

        // Refresh consignees list
        const updatedConsignees = await axios.get(
          `${process.env.NEXT_PUBLIC_BACKEND_API}/api/individual-consignees/individual/${selectedIndividualId}`
        );
        setParentConsignees(updatedConsignees.data);
        fetchIndividuals();
      } catch (error) {
        console.error("Error with consignee:", error);
        toast({
          title: "Error",
          description:
            error.response?.data?.message || "Failed to process consignee",
          status: "error",
          duration: 3000,
          isClosable: true,
          position: "top-right",
        });
      } finally {
        setIsSavingIndivConsignee(false);
      }
    };

    // Individual Consignee Delete Handling
    const handleDeleteIndividualConsigneeClick = (consignee) => {
      setConsigneeToDelete(consignee);
      onDeleteConsigneeOpen();
    };

    const confirmDeleteIndividualConsignee = async () => {
      if (!consigneeToDelete) return;
      const consigneeId = consigneeToDelete._id;

      setIsDeletingIndivConsignee(true);
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          toast({
            title: "Error",
            description: "Authentication token not found. Please log in.",
            status: "error",
          });
          onDeleteConsigneeClose();
          setConsigneeToDelete(null);
          return;
        }
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_API}/api/individual-consignees/${consigneeId}`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.ok) {
          toast({
            title: "Success",
            description: `Consignee '${consigneeToDelete.name}' deleted successfully and logged`,
            status: "success",
          });
          // Refresh the consignees list within the modal
          const updatedConsignees = await axios.get(
            `${process.env.NEXT_PUBLIC_BACKEND_API}/api/individual-consignees/individual/${selectedIndividualId}`
          );
          setParentConsignees(updatedConsignees.data);
          fetchIndividuals();
        } else {
          const errorData = await response
            .json()
            .catch(() => ({ message: "Failed to delete consignee" }));
          const errorDesc =
            response.status === 401 || response.status === 403
              ? "Authentication failed. Please log in again."
              : errorData.message || "Failed to delete consignee";
          throw new Error(errorDesc);
        }
      } catch (error) {
        console.error("Error deleting consignee:", error);
        toast({ title: "Error", description: error.message, status: "error" });
      }
      onDeleteConsigneeClose();
      setConsigneeToDelete(null);
      setIsDeletingIndivConsignee(false);
    };

    const filteredConsignees = parentConsignees.filter((consignee) => {
      const name = consignee.name?.toLowerCase() || "";
      const address = consignee.address?.toLowerCase() || "";
      const tin = consignee.tin?.toLowerCase() || "";

      return (
        name.includes(searchTerm.toLowerCase()) ||
        address.includes(searchTerm.toLowerCase()) ||
        tin.includes(searchTerm.toLowerCase())
      );
    });

    return (
      <Modal isOpen={isOpen} onClose={onClose} size="6xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            <Flex justify="space-between" align="flex-start" direction="column">
              <Box fontSize="xl" fontWeight="semibold" mb={2}>
                {isFormView
                  ? isEditMode
                    ? "Edit Consignee"
                    : "Add New Consignee"
                  : `Consignees for ${individualName}`}
              </Box>
              <Flex align="center" gap={2} width="100%">
                {!isFormView && (
                  <Input
                    placeholder="Search consignees..."
                    size="md"
                    width="300px"
                    borderRadius="md"
                    focusBorderColor="blue.500"
                    _placeholder={{ color: "gray.400" }}
                    variant="filled"
                    bg="gray.50"
                    _hover={{ bg: "gray.100" }}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    leftElement={<Search2Icon color="gray.400" mr={2} />}
                  />
                )}
                {!isFormView && (
                  <Button
                    leftIcon={<AddIcon />}
                    colorScheme="blue"
                    onClick={() => {
                      setIsFormView(true);
                      setIsEditMode(false);
                      setEditConsigneeId(null);
                      setFormData({
                        name: "",
                        address: "",
                        tin: "",
                      });
                    }}
                  >
                    Add Consignee
                  </Button>
                )}
              </Flex>
            </Flex>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {isFormView ? (
              // Form View
              <VStack spacing={4}>
                <FormControl>
                  <FormLabel>Name</FormLabel>
                  <Input
                    name="name"
                    value={formData.name}
                    onChange={handleFormChange}
                    placeholder="Enter consignee name"
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Address</FormLabel>
                  <Input
                    name="address"
                    value={formData.address}
                    onChange={handleFormChange}
                    placeholder="Enter address"
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>TIN</FormLabel>
                  <Input
                    name="tin"
                    value={formData.tin}
                    onChange={handleFormChange}
                    placeholder="Enter TIN number"
                  />
                </FormControl>
              </VStack>
            ) : (
              // Table View
              <TableContainer>
                <Table variant="simple">
                  <Thead>
                    <Tr>
                      <Th>Individual Name</Th>
                      <Th>Name</Th>
                      <Th>Address</Th>
                      <Th>TIN</Th>
                      <Th>Actions</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {filteredConsignees.length > 0 ? (
                      filteredConsignees.map((consignee) => (
                        <Tr key={consignee._id}>
                          <Td>{individualName}</Td>
                          <Td>{consignee.name}</Td>
                          <Td>{consignee.address}</Td>
                          <Td>{consignee.tin}</Td>
                          <Td>
                            <Flex gap={2}>
                              <IconButton
                                icon={<EditIcon />}
                                size="sm"
                                variant="ghost"
                                color="blue.500"
                                onClick={() => handleEditConsignee(consignee)}
                                _hover={{ bg: "blue.50" }}
                              />
                              <IconButton
                                icon={<DeleteIcon />}
                                size="sm"
                                variant="ghost"
                                color="red.500"
                                onClick={() =>
                                  handleDeleteIndividualConsigneeClick(
                                    consignee
                                  )
                                }
                                _hover={{ bg: "red.50" }}
                              />
                            </Flex>
                          </Td>
                        </Tr>
                      ))
                    ) : (
                      <Tr>
                        <Td colSpan={5} textAlign="center" py={8}>
                          <Text fontSize="lg" color="gray.500">
                            No Consignee Found
                          </Text>
                        </Td>
                      </Tr>
                    )}
                  </Tbody>
                </Table>
              </TableContainer>
            )}
          </ModalBody>
          {isFormView && (
            <ModalFooter>
              <Button
                variant="outline"
                mr={3}
                onClick={() => setIsFormView(false)}
              >
                Cancel
              </Button>
              <Button
                colorScheme="blue"
                isLoading={isSavingIndivConsignee}
                onClick={handleFormSubmit}
              >
                {isEditMode ? "Update Consignee" : "Save Consignee"}
              </Button>
            </ModalFooter>
          )}

          {/* Consignee Delete Confirmation Dialog (Inside Consignee Modal) */}
          <AlertDialog
            isOpen={isDeleteConsigneeOpen}
            leastDestructiveRef={cancelRef}
            onClose={onDeleteConsigneeClose}
          >
            <AlertDialogOverlay>
              <AlertDialogContent>
                <AlertDialogHeader fontSize="lg" fontWeight="bold">
                  Delete Consignee
                </AlertDialogHeader>
                <AlertDialogBody>
                  Are you sure you want to delete the consignee "
                  {consigneeToDelete?.name}" for {individualName}? This action
                  will move the consignee data to the delete logs.
                </AlertDialogBody>
                <AlertDialogFooter>
                  <Button ref={cancelRef} onClick={onDeleteConsigneeClose}>
                    Cancel
                  </Button>
                  <Button
                    colorScheme="red"
                    isLoading={isDeletingIndivConsignee}
                    onClick={confirmDeleteIndividualConsignee}
                    ml={3}
                  >
                    Delete
                  </Button>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialogOverlay>
          </AlertDialog>
        </ModalContent>
      </Modal>
    );
  };

  return (
    <Box
      p={8}
      maxW="100%"
      mx="auto"
      bg="white"
      borderRadius="xl"
      boxShadow="md"
      height="calc(100vh - 150px)"
    >
      {/* Header Section */}
      <Box
        py={4}
        px={6}
        color="#1a365d"
        borderRadius="md"
        mb={6}
        borderBottom="1px solid"
        borderColor="#E2E8F0"
      >
        <Heading size="2xl" fontWeight="bold">
          Individual Management
        </Heading>
        <Text mt={2} fontSize="md" color="gray.600">
          Manage individual accounts and information
        </Text>
      </Box>

      {/* Search and Add Individual */}
      <Flex direction="column" mb={6} px={6}>
        <Flex align="center" gap={3}>
          <Button
            onClick={handleAdd}
            leftIcon={<AddIcon />}
            bg="#800020"
            color="white"
            _hover={{ bg: "#600010" }}
            _active={{ bg: "#400000" }}
            size="md"
            borderRadius="md"
            boxShadow="sm"
          >
            Add Individual
          </Button>
          <InputGroup maxW="400px">
            <InputLeftElement pointerEvents="none">
              <Search2Icon color="gray.500" />
            </InputLeftElement>
            <Input
              placeholder="Search individuals..."
              value={searchQuery}
              onChange={handleSearch}
              borderRadius="md"
              borderColor="gray.300"
              _hover={{ borderColor: "#800020" }}
              _focus={{
                borderColor: "#800020",
                boxShadow: "0 0 0 1px #800020",
              }}
            />
          </InputGroup>
        </Flex>
      </Flex>

      {/* Table Container */}
      <Box
        borderWidth="1px"
        borderRadius="lg"
        borderColor="#E2E8F0"
        boxShadow="0px 2px 8px rgba(0, 0, 0, 0.06)"
        overflow="hidden"
        mx={6}
      >
        <TableContainer maxHeight="calc(100vh - 280px)" overflowY="auto">
          <Table variant="simple" size="sm">
            <Thead
              bg="#F7FAFC"
              position="sticky"
              top={0}
              zIndex={1}
              boxShadow="0 1px 2px rgba(0,0,0,0.05)"
            >
              <Tr>
                {[
                  { name: "NAME", width: "20%", align: "left" },
                  { name: "CONSIGNEE", width: "15%", align: "left" },
                  { name: "ADDRESS", width: "25%", align: "left" },
                  { name: "CONTACT", width: "15%", align: "left" },
                  { name: "EMAIL", width: "15%", align: "left" },
                  { name: "TIN", width: "15%", align: "left" },
                  { name: "STATUS", width: "10%", align: "left" },
                  { name: "ACTIONS", width: "10%", align: "center" },
                ].map((header) => (
                  <Th
                    key={header.name}
                    fontSize="xs"
                    fontWeight="semibold"
                    color="black"
                    py={3}
                    px={4}
                    width={header.width}
                    textAlign={header.align}
                    borderBottom="1px solid"
                    borderColor="#1a365d"
                    textTransform="uppercase"
                    letterSpacing="0.5px"
                  >
                    {header.name}
                  </Th>
                ))}
              </Tr>
            </Thead>
            <Tbody>
              {currentIndividuals.map((individual, index) => (
                <Tr
                  key={individual._id}
                  _hover={{ bg: "#F0F7FF" }}
                  transition="all 0.2s"
                  bg={index % 2 === 0 ? "white" : "gray.50"}
                  borderBottom="1px solid"
                  borderColor="#E2E8F0"
                >
                  <Td fontWeight="medium" color="#1a365d">
                    {individual.individualName}
                  </Td>
                  <Td
                    cursor="pointer"
                    _hover={{ textDecoration: "underline" }}
                    onClick={() => handleConsigneeClick(individual)}
                  >
                    <Text
                      color="#000080"
                      border="1px solid"
                      borderColor="#000080"
                      borderRadius="md"
                      px={2}
                      py={1}
                      display="inline-block"
                    >
                      {individual.consigneeCount || 0} Consignee
                      {individual.consigneeCount !== 1 ? "s" : ""}
                    </Text>
                  </Td>
                  <Td color="gray.600">{individual.individualAddress}</Td>
                  <Td color="gray.600">{individual.individualContactNumber}</Td>
                  <Td color="gray.600">{individual.individualEmail}</Td>
                  <Td color="gray.600">
                    {individual.individualTIN &&
                      individual.individualTIN.replace(
                        /(\d{3})(\d{3})(\d{3})/,
                        "$1-$2-$3"
                      )}
                  </Td>
                  <Td>
                    <Badge
                      bg={
                        individual.individualStatus === "Active"
                          ? "#1a365d"
                          : "#800020"
                      }
                      color="white"
                      borderRadius="md"
                      px={2}
                      py={1}
                    >
                      {individual.individualStatus}
                    </Badge>
                  </Td>
                  <Td>
                    <HStack spacing={2} justify="center">
                      <IconButton
                        aria-label="Edit"
                        icon={<EditIcon />}
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEdit(individual._id)}
                        color="#800020"
                        _hover={{ bg: "red.50" }}
                      />
                      <IconButton
                        aria-label="Delete"
                        icon={<DeleteIcon />}
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteIndividualClick(individual)}
                        colorScheme="red"
                      />
                    </HStack>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </TableContainer>
      </Box>

      {/* Pagination Controls */}
      <Flex justify="center" mt={8} gap={2}>
        <Button
          onClick={() => handlePageChange(currentPage - 1)}
          isDisabled={currentPage === 1}
          leftIcon={<ChevronLeftIcon />}
          size="md"
          height="40px"
          px={4}
          variant="outline"
          colorScheme="blue"
          _hover={{ bg: "#1a365d", color: "white" }}
        >
          Previous
        </Button>

        {[...Array(totalPages)].map((_, index) => (
          <Button
            key={index + 1}
            onClick={() => handlePageChange(index + 1)}
            size="md"
            height="40px"
            px={4}
            variant={currentPage === index + 1 ? "solid" : "outline"}
            colorScheme="yellow"
          >
            {index + 1}
          </Button>
        ))}

        <Button
          onClick={() => handlePageChange(currentPage + 1)}
          isDisabled={currentPage === totalPages}
          rightIcon={<ChevronRightIcon />}
          size="md"
          height="40px"
          px={4}
          variant="outline"
          colorScheme="blue"
          _hover={{ bg: "#1a365d", color: "white" }}
        >
          Next
        </Button>
      </Flex>

      {/* Modal for Adding/Editing Individuals */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        size="2xl"
      >
        <ModalOverlay bg="blackAlpha.600" backdropFilter="blur(2px)" />
        <ModalContent>
          <ModalHeader bg="#1a365d" color="white">
            {formData._id ? "Edit Individual" : "Add New Individual"}
          </ModalHeader>
          <ModalCloseButton color="white" />
          <ModalBody p={6}>
            <VStack spacing={6}>
              <SimpleGrid columns={2} spacing={4} w="full">
                <FormControl isRequired>
                  <FormLabel>Name</FormLabel>
                  <Input
                    name="individualName"
                    value={formData.individualName}
                    onChange={handleInputChange}
                    borderColor="#1a365d"
                    _hover={{ borderColor: "#800020" }}
                    _focus={{
                      borderColor: "#800020",
                      boxShadow: "0 0 0 1px #800020",
                    }}
                  />
                </FormControl>

                <FormControl isRequired>
                  <FormLabel>Address</FormLabel>
                  <Input
                    name="individualAddress"
                    value={formData.individualAddress}
                    onChange={handleInputChange}
                    borderColor="#1a365d"
                    _hover={{ borderColor: "#800020" }}
                    _focus={{
                      borderColor: "#800020",
                      boxShadow: "0 0 0 1px #800020",
                    }}
                  />
                </FormControl>

                <FormControl isRequired>
                  <FormLabel>Contact Number</FormLabel>
                  <Input
                    name="individualContactNumber"
                    value={formData.individualContactNumber}
                    onChange={handleInputChange}
                    borderColor="#1a365d"
                    _hover={{ borderColor: "#800020" }}
                    _focus={{
                      borderColor: "#800020",
                      boxShadow: "0 0 0 1px #800020",
                    }}
                  />
                </FormControl>

                <FormControl isRequired>
                  <FormLabel>Email</FormLabel>
                  <Input
                    name="individualEmail"
                    value={formData.individualEmail}
                    onChange={handleInputChange}
                    borderColor="#1a365d"
                    _hover={{ borderColor: "#800020" }}
                    _focus={{
                      borderColor: "#800020",
                      boxShadow: "0 0 0 1px #800020",
                    }}
                  />
                </FormControl>

                <FormControl isRequired>
                  <FormLabel>TIN</FormLabel>
                  <Input
                    name="individualTIN"
                    value={
                      formData.individualTIN
                        ? formData.individualTIN.replace(
                            /(\d{3})(\d{3})(\d{3})/,
                            "$1-$2-$3"
                          )
                        : ""
                    }
                    onChange={(e) => {
                      const value = e.target.value.replace(/-/g, "");
                      handleInputChange({
                        target: { name: "individualTIN", value },
                      });
                    }}
                    borderColor="#1a365d"
                    _hover={{ borderColor: "#800020" }}
                    _focus={{
                      borderColor: "#800020",
                      boxShadow: "0 0 0 1px #800020",
                    }}
                  />
                </FormControl>

                <FormControl isRequired>
                  <FormLabel>Status</FormLabel>
                  <Select
                    name="individualStatus"
                    value={formData.individualStatus}
                    onChange={handleInputChange}
                    borderColor="#1a365d"
                    _hover={{ borderColor: "#800020" }}
                    _focus={{
                      borderColor: "#800020",
                      boxShadow: "0 0 0 1px #800020",
                    }}
                  >
                    <option value="">Select Status</option>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </Select>
                </FormControl>
              </SimpleGrid>
            </VStack>
          </ModalBody>
          <ModalFooter borderTopWidth="2px" borderColor="#800020">
            <Button
              variant="outline"
              mr={3}
              onClick={() => setIsModalOpen(false)}
              color="#1a365d"
              borderColor="#1a365d"
            >
              Cancel
            </Button>
            <Button
              bg="#800020"
              color="white"
              _hover={{ bg: "#600010" }}
              onClick={handleSubmit}
              isLoading={isSavingIndividual}
              loadingText={formData._id ? "Saving..." : "Adding..."}
            >
              {formData._id ? "Save Changes" : "Add Individual"}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Add this just before the closing Box tag */}
      <ConsigneeModal
        isOpen={isConsigneeModalOpen}
        onClose={() => setIsConsigneeModalOpen(false)}
        consignees={consignees}
        setConsignees={setConsignees}
        individualName={selectedIndividual}
        selectedIndividualId={selectedIndividualId}
      />

      {/* Individual Delete Confirmation Dialog (Outside Consignee Modal) */}
      <AlertDialog
        isOpen={isDeleteIndividualOpen}
        leastDestructiveRef={cancelRef}
        onClose={onDeleteIndividualClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete Individual
            </AlertDialogHeader>
            <AlertDialogBody>
              Are you sure you want to delete the individual "
              {individualToDelete?.individualName}"? This action will move the
              individual data to the delete logs.
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onDeleteIndividualClose}>
                Cancel
              </Button>
              <Button
                colorScheme="red"
                isLoading={isDeletingIndividual}
                onClick={confirmDeleteIndividual}
                ml={3}
              >
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
}
