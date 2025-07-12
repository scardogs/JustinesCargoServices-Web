import React, { useState, useEffect } from "react";
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
  Text,
  IconButton,
  Spinner,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  Flex,
  InputGroup,
  InputLeftElement,
  Icon,
  Tooltip,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  TableContainer,
  Heading,
  Spacer,
  InputRightElement,
} from "@chakra-ui/react";
import { AddIcon, EditIcon, DeleteIcon, SearchIcon, ChevronLeftIcon, ChevronRightIcon } from "@chakra-ui/icons";
import { FiHome, FiMapPin } from "react-icons/fi";
import axios from "axios";

const Warehouse = () => {
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: "",
    location: ""
  });
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState(null);
  const [deleteWarehouse, setDeleteWarehouse] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const { isOpen, onOpen, onClose } = useDisclosure();
  const {
    isOpen: isDeleteOpen,
    onOpen: onDeleteOpen,
    onClose: onDeleteClose,
  } = useDisclosure();
  const {
    isOpen: isEditOpen,
    onOpen: onEditOpen,
    onClose: onEditClose,
  } = useDisclosure();
  const toast = useToast();
  const cancelRef = React.useRef();

  const fetchWarehouses = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast({
          title: "Authentication Error",
          description: "Please log in to view warehouses",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
        setLoading(false);
        return;
      }

      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/warehouses`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          params: {
            page: currentPage,
            limit: itemsPerPage,
            search: searchQuery
          }
        }
      );

      if (response.data) {
        const { warehouses: warehouseData, totalItems: total, totalPages: pages, currentPage: page } = response.data;
        setWarehouses(warehouseData || []);
        setTotalItems(total || 0);
        setTotalPages(pages || 1);
        setCurrentPage(page || 1);
      }
    } catch (error) {
      console.error("Error fetching warehouses:", error);
      toast({
        title: "Error fetching warehouses",
        description: error.response?.data?.message || "An error occurred",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      setWarehouses([]);
      setTotalItems(0);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWarehouses();
  }, [currentPage, itemsPerPage, searchQuery]);

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1); // Reset to first page on new search
  };
  
  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };
  
  const handleItemsPerPageChange = (value) => {
    setItemsPerPage(Number(value));
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsAdding(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast({
          title: "Authentication Error",
          description: "Please log in to add warehouses",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
        return;
      }

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/warehouses`,
        formData,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (response.data) {
        await fetchWarehouses();
        onClose();
        setFormData({
          name: "",
          location: ""
        });

        toast({
          title: "Success",
          description: "Warehouse added successfully",
          status: "success",
          duration: 3000,
          isClosable: true,
          position: "top-right"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error.response?.data?.message || error.message || "Failed to add warehouse",
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "top-right"
      });
    } finally {
      setIsAdding(false);
    }
  };

  const handleEdit = (warehouse) => {
    setEditingWarehouse(warehouse);
    setFormData({
      name: warehouse.name,
      location: warehouse.location
    });
    onEditOpen();
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setIsEditing(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast({
          title: "Authentication Error",
          description: "Please log in to update warehouses",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
        return;
      }

      const response = await axios.put(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/warehouses/${editingWarehouse._id}`,
        formData,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (response.data) {
        await fetchWarehouses();
        onEditClose();
        setFormData({
          name: "",
          location: ""
        });

        toast({
          title: "Success",
          description: "Warehouse updated successfully",
          status: "success",
          duration: 3000,
          isClosable: true,
          position: "top-right"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error.response?.data?.message || error.message || "Failed to update warehouse",
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "top-right"
      });
    } finally {
      setIsEditing(false);
    }
  };

  const handleDelete = (warehouse) => {
    setDeleteWarehouse(warehouse);
    onDeleteOpen();
  };

  const confirmDelete = async () => {
    setIsDeleting(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast({
          title: "Authentication Error",
          description: "Please log in to delete warehouses",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
        return;
      }

      await axios.delete(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/warehouses/${deleteWarehouse._id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      await fetchWarehouses();
      onDeleteClose();

      toast({
        title: "Success",
        description: "Warehouse deleted successfully",
        status: "success",
        duration: 3000,
        isClosable: true,
        position: "top-right"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error.response?.data?.message || error.message || "Failed to delete warehouse",
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "top-right"
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Box p={6}>
      <VStack spacing={6} align="stretch">
        {/* Header */}
        <Flex justify="space-between" align="center" mb={2}>
          <HStack spacing="10px">
            <Heading as="h4" size="md">
              Warehouse
            </Heading>
          </HStack>
          <Spacer />
          <HStack>
            {/* Search Box */}
            <InputGroup size="md" width="300px">
              <InputLeftElement pointerEvents="none">
                <SearchIcon color="gray.300" />
              </InputLeftElement>
              <Input
                type="text"
                placeholder="Search warehouses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </InputGroup>
            <Button
              leftIcon={<AddIcon />}
              colorScheme="red"
              onClick={onOpen}
              size="sm"
              color="white"
              bg="#ff5757"
              _hover={{ bg: "#ff5757" }}
            >
              New Warehouse
            </Button>
          </HStack>
        </Flex>

        {/* Warehouses Table */}
        <Box 
          borderRadius="lg" 
          shadow="md" 
          overflow="hidden"
          border="1px solid"
          borderColor="gray.200"
          bg="white"
        >
          <TableContainer>
            <Table variant="simple">
              <Thead bg="#f8f9fa">
                <Tr>
                  <Th>Name</Th>
                  <Th>Location</Th>
                  <Th width="150px">Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {loading ? (
                  <Tr>
                    <Td colSpan={3}>
                      <Flex justify="center" py={4}>
                        <Spinner size="md" color="#550000" />
                      </Flex>
                    </Td>
                  </Tr>
                ) : warehouses.length === 0 ? (
                  <Tr>
                    <Td colSpan={3}>
                      <Flex 
                        direction="column" 
                        align="center" 
                        justify="center" 
                        py={8}
                      >
                        <Icon as={FiHome} boxSize={8} color="gray.400" mb={3} />
                        <Text color="gray.500" fontSize="md" mb={2}>No warehouses found</Text>
                        <Button
                          leftIcon={<AddIcon />}
                          size="sm"
                          bg="#550000"
                          color="white"
                          _hover={{ bg: "#770000" }}
                          onClick={onOpen}
                        >
                          Add Warehouse
                        </Button>
                      </Flex>
                    </Td>
                  </Tr>
                ) : (
                  warehouses.map((warehouse) => (
                    <Tr 
                      key={warehouse._id}
                      _hover={{ bg: "#f8f9fa" }}
                      transition="background-color 0.2s"
                    >
                      <Td>
                        <Flex align="center">
                          <Icon as={FiHome} color="blue.500" mr={2} />
                          <Text fontWeight="medium">{warehouse.name}</Text>
                        </Flex>
                      </Td>
                      <Td>
                        <Flex align="center">
                          <Icon as={FiMapPin} color="gray.500" mr={2} />
                          {warehouse.location}
                        </Flex>
                      </Td>
                      <Td>
                        <HStack spacing={2}>
                          <Tooltip label="Edit Warehouse" hasArrow>
                            <IconButton
                              icon={<EditIcon />}
                              aria-label="Edit"
                              size="sm"
                              colorScheme="blue"
                              variant="ghost"
                              onClick={() => handleEdit(warehouse)}
                            />
                          </Tooltip>
                          <Tooltip label="Delete Warehouse" hasArrow>
                            <IconButton
                              icon={<DeleteIcon />}
                              aria-label="Delete"
                              size="sm"
                              colorScheme="red"
                              variant="ghost"
                              onClick={() => handleDelete(warehouse)}
                            />
                          </Tooltip>
                        </HStack>
                      </Td>
                    </Tr>
                  ))
                )}
              </Tbody>
            </Table>
          </TableContainer>
          
          {/* Pagination Controls */}
          {!loading && warehouses.length > 0 && (
            <Flex justifyContent="space-between" mt={4} p={4} alignItems="center">
              <HStack>
                <Text>Items per page:</Text>
                <NumberInput 
                  value={itemsPerPage} 
                  onChange={handleItemsPerPageChange}
                  min={5} 
                  max={100}
                  w="70px"
                >
                  <NumberInputField />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
              </HStack>
              
              <HStack>
                <Text>
                  Page {currentPage} of {totalPages} 
                  ({totalItems} items)
                </Text>
                <Button
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  isDisabled={currentPage <= 1}
                  leftIcon={<ChevronLeftIcon />}
                >
                  Prev
                </Button>
                <Button
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  isDisabled={currentPage >= totalPages}
                  rightIcon={<ChevronRightIcon />}
                >
                  Next
                </Button>
              </HStack>
            </Flex>
          )}
        </Box>
      </VStack>

      {/* Add Warehouse Modal */}
      <Modal isOpen={isOpen} onClose={!isAdding ? onClose : undefined} size="md">
        <ModalOverlay backdropFilter="blur(2px)" />
        <ModalContent borderRadius="lg" shadow="xl">
          <Box bg="#550000" py={4} px={6} color="white" borderTopRadius="lg">
            <Flex justify="space-between" align="center">
              <Flex align="center">
                <Icon as={FiHome} boxSize={5} mr={3} />
                <Text fontSize="xl" fontWeight="bold">
                  Add New Warehouse
                </Text>
              </Flex>
              {!isAdding && <ModalCloseButton position="static" color="white" />}
            </Flex>
          </Box>

          <ModalBody py={6}>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel fontWeight="medium">Warehouse Name</FormLabel>
                <Input
                  placeholder="Enter warehouse name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  focusBorderColor="#550000"
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel fontWeight="medium">Location</FormLabel>
                <Input
                  placeholder="Enter warehouse location"
                  value={formData.location}
                  onChange={(e) =>
                    setFormData({ ...formData, location: e.target.value })
                  }
                  focusBorderColor="#550000"
                />
              </FormControl>
            </VStack>
          </ModalBody>

          <ModalFooter bg="gray.50" borderBottomRadius="lg">
            <Button
              bg="#550000"
              color="white"
              _hover={{ bg: "#770000" }}
              mr={3}
              onClick={handleSubmit}
              isLoading={isAdding}
              loadingText="Adding..."
              isDisabled={isAdding}
            >
              Add Warehouse
            </Button>
            <Button variant="ghost" onClick={onClose} isDisabled={isAdding}>
              Cancel
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Edit Warehouse Modal */}
      <Modal isOpen={isEditOpen} onClose={!isEditing ? onEditClose : undefined} size="md">
        <ModalOverlay backdropFilter="blur(2px)" />
        <ModalContent borderRadius="lg" shadow="xl">
          <Box bg="#550000" py={4} px={6} color="white" borderTopRadius="lg">
            <Flex justify="space-between" align="center">
              <Flex align="center">
                <Icon as={FiHome} boxSize={5} mr={3} />
                <Text fontSize="xl" fontWeight="bold">
                  Edit Warehouse
                </Text>
              </Flex>
              {!isEditing && <ModalCloseButton position="static" color="white" />}
            </Flex>
          </Box>

          <ModalBody py={6}>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel fontWeight="medium">Warehouse Name</FormLabel>
                <Input
                  placeholder="Enter warehouse name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  focusBorderColor="#550000"
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel fontWeight="medium">Location</FormLabel>
                <Input
                  placeholder="Enter warehouse location"
                  value={formData.location}
                  onChange={(e) =>
                    setFormData({ ...formData, location: e.target.value })
                  }
                  focusBorderColor="#550000"
                />
              </FormControl>
            </VStack>
          </ModalBody>

          <ModalFooter bg="gray.50" borderBottomRadius="lg">
            <Button
              bg="#550000"
              color="white"
              _hover={{ bg: "#770000" }}
              mr={3}
              onClick={handleUpdate}
              isLoading={isEditing}
              loadingText="Saving..."
              isDisabled={isEditing}
            >
              Save Changes
            </Button>
            <Button variant="ghost" onClick={onEditClose} isDisabled={isEditing}>
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
      >
        <AlertDialogOverlay>
          <AlertDialogContent borderRadius="lg">
            <AlertDialogHeader fontSize="lg" fontWeight="bold" color="#550000">
              Delete Warehouse
            </AlertDialogHeader>

            <AlertDialogBody>
              Are you sure you want to delete the warehouse 
              "<strong>{deleteWarehouse?.name}</strong>"? This action cannot be undone.
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onDeleteClose} isDisabled={isDeleting}>
                Cancel
              </Button>
              <Button
                bg="#550000"
                color="white"
                _hover={{ bg: "#770000" }}
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
  );
};

export default Warehouse; 