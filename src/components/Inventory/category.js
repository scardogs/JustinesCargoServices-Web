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
  useDisclosure,
  Text,
  Flex,
  InputGroup,
  InputLeftElement,
  Icon,
  Badge,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  Tooltip,
  Select,
} from "@chakra-ui/react";
import { AddIcon, EditIcon, DeleteIcon, SearchIcon } from "@chakra-ui/icons";
import { FiFolder } from "react-icons/fi";
import axios from "axios";

const Category = () => {
  const [categories, setCategories] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [formData, setFormData] = useState({
    categoryName: "",
    description: "",
  });
  const [editingCategory, setEditingCategory] = useState(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const {
    isOpen: isDeleteOpen,
    onOpen: onDeleteOpen,
    onClose: onDeleteClose,
  } = useDisclosure();
  const cancelRef = useRef();

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchCategories();
  }, []);

  // Effect to update pagination calculations when filters change
  useEffect(() => {
    const filteredCategories = categories.filter(
      (category) =>
        category.categoryName
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        category.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    setTotalItems(filteredCategories.length);
    const calculatedTotalPages = Math.ceil(
      filteredCategories.length / itemsPerPage
    );
    setTotalPages(calculatedTotalPages > 0 ? calculatedTotalPages : 1);

    // Reset to page 1 if current page is now invalid
    if (currentPage > calculatedTotalPages && calculatedTotalPages > 0) {
      setCurrentPage(1);
    }
  }, [categories, searchQuery, itemsPerPage, currentPage]);

  // Function to get categories for the current page
  const getCurrentPageCategories = () => {
    const filteredCategories = categories.filter(
      (category) =>
        category.categoryName
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        category.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    return filteredCategories.slice(indexOfFirstItem, indexOfLastItem);
  };

  // Handle page change
  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get(
        process.env.NEXT_PUBLIC_BACKEND_API + "/api/categories"
      );
      setCategories(response.data);
    } catch (error) {
      console.error("Error fetching categories:", error);
      toast({
        title: "Error",
        description: "Failed to fetch categories",
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "top-right",
      });
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!formData.categoryName.trim()) {
      toast({
        title: "Error",
        description: "Category name is required",
        status: "error",
        duration: 3000,
      });
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = {
        categoryName: formData.categoryName.trim(),
        description: formData.description.trim(),
      };
      const response = await axios.post(
        process.env.NEXT_PUBLIC_BACKEND_API + "/api/categories",
        payload
      );
      toast({
        title: "Success",
        description: "Category added successfully",
        status: "success",
        duration: 3000,
      });
      setCategories((prev) => [response.data, ...prev]);
      handleClose();
    } catch (error) {
      console.error("Error adding category:", error.response?.data || error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to add category",
        status: "error",
        duration: 3000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingCategory || !formData.categoryName.trim()) {
      toast({
        title: "Error",
        description: "Category name is required",
        status: "error",
        duration: 3000,
      });
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = {
        categoryName: formData.categoryName.trim(),
        description: formData.description.trim(),
      };
      const response = await axios.put(
        process.env.NEXT_PUBLIC_BACKEND_API +
          `/api/categories/${editingCategory._id}`,
        payload
      );
      toast({
        title: "Success",
        description: "Category updated successfully",
        status: "success",
        duration: 3000,
      });
      setCategories((prev) => [
        response.data,
        ...prev.filter((cat) => cat._id !== editingCategory._id),
      ]);
      handleClose();
    } catch (error) {
      console.error("Error updating category:", error.response?.data || error);
      toast({
        title: "Error",
        description:
          error.response?.data?.message || "Failed to update category",
        status: "error",
        duration: 3000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = (e) => {
    if (editingCategory) {
      handleEditSubmit(e);
    } else {
      handleAddSubmit(e);
    }
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setFormData({
      categoryName: category.categoryName,
      description: category.description,
    });
    onOpen();
  };

  const handleDeleteClick = (category) => {
    setCategoryToDelete(category);
    onDeleteOpen();
  };

  const handleDeleteConfirm = async () => {
    if (!categoryToDelete) return;
    setIsDeleting(true);
    const token = localStorage.getItem("token");

    try {
      if (!token) {
        toast({
          title: "Error",
          description: "Authentication failed. Please log in.",
          status: "error",
          duration: 3000,
        });
        onDeleteClose();
        return;
      }

      await axios.delete(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/categories/${categoryToDelete._id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      fetchCategories();
      toast({
        title: "Success",
        description: "Category deleted successfully",
        status: "success",
        duration: 3000,
      });
      onDeleteClose();
      setCategoryToDelete(null);
    } catch (error) {
      console.error("Error deleting category:", error.response?.data || error);
      toast({
        title: "Error",
        description:
          error.response?.data?.message || "Failed to delete category",
        status: "error",
        duration: 3000,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    setEditingCategory(null);
    setFormData({ categoryName: "", description: "" });
    onClose();
  };

  return (
    <Box p={6}>
      <VStack spacing={6} align="stretch">
        {/* Header */}
        <Flex justify="space-between" align="center" mb={2}>
          <Text fontSize="2xl" fontWeight="bold" color="#550000">
            Categories
          </Text>
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
            Add Category
          </Button>
        </Flex>

        {/* Search Bar */}
        <Box
          bg="white"
          p={4}
          borderRadius="md"
          shadow="sm"
          border="1px solid"
          borderColor="gray.200"
        >
          <InputGroup maxW="400px">
            <InputLeftElement pointerEvents="none">
              <SearchIcon color="gray.400" />
            </InputLeftElement>
            <Input
              placeholder="Search categories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              focusBorderColor="#550000"
            />
          </InputGroup>
        </Box>

        {/* Categories Table */}
        <Box
          borderRadius="lg"
          shadow="md"
          overflow="hidden"
          border="1px solid"
          borderColor="gray.200"
          bg="white"
        >
          <Table variant="simple">
            <Thead bg="#f8f9fa">
              <Tr>
                <Th>Name</Th>
                <Th>Description</Th>
                <Th width="150px">Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {categories.filter(
                (category) =>
                  category.categoryName
                    .toLowerCase()
                    .includes(searchQuery.toLowerCase()) ||
                  category.description
                    ?.toLowerCase()
                    .includes(searchQuery.toLowerCase())
              ).length === 0 ? (
                <Tr>
                  <Td colSpan={3}>
                    <Flex
                      direction="column"
                      align="center"
                      justify="center"
                      py={8}
                    >
                      <Icon as={FiFolder} boxSize={8} color="gray.400" mb={3} />
                      <Text color="gray.500" fontSize="md" mb={2}>
                        No categories found
                      </Text>
                      <Button
                        leftIcon={<AddIcon />}
                        size="sm"
                        bg="#550000"
                        color="white"
                        _hover={{ bg: "#770000" }}
                        onClick={onOpen}
                      >
                        Add Category
                      </Button>
                    </Flex>
                  </Td>
                </Tr>
              ) : (
                getCurrentPageCategories().map((category) => (
                  <Tr
                    key={category._id}
                    _hover={{ bg: "#f8f9fa" }}
                    transition="background-color 0.2s"
                  >
                    <Td>
                      <Flex align="center">
                        <Icon as={FiFolder} color="blue.500" mr={2} />
                        <Text fontWeight="medium">{category.categoryName}</Text>
                      </Flex>
                    </Td>
                    <Td>{category.description}</Td>
                    <Td>
                      <HStack spacing={2}>
                        <Tooltip label="Edit Category" hasArrow>
                          <IconButton
                            icon={<EditIcon />}
                            aria-label="Edit"
                            size="sm"
                            colorScheme="blue"
                            variant="ghost"
                            onClick={() => handleEdit(category)}
                          />
                        </Tooltip>
                        <Tooltip label="Delete Category" hasArrow>
                          <IconButton
                            icon={<DeleteIcon />}
                            aria-label="Delete"
                            size="sm"
                            colorScheme="red"
                            variant="ghost"
                            onClick={() => handleDeleteClick(category)}
                          />
                        </Tooltip>
                      </HStack>
                    </Td>
                  </Tr>
                ))
              )}
            </Tbody>
          </Table>

          {/* Pagination */}
          {totalItems > 0 && (
            <Box px={4} py={4} borderTop="1px solid" borderColor="gray.200">
              <Flex justify="space-between" align="center">
                <Text fontSize="sm" color="gray.600">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                  {Math.min(currentPage * itemsPerPage, totalItems)} of{" "}
                  {totalItems} categories
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

                    {Array.from({ length: Math.min(5, totalPages) }).map(
                      (_, i) => {
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
                            variant={
                              currentPage === pageNum ? "solid" : "outline"
                            }
                          >
                            {pageNum}
                          </Button>
                        );
                      }
                    )}

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

      {/* Add/Edit Category Modal */}
      <Modal
        isOpen={isOpen}
        onClose={!isSubmitting ? handleClose : undefined}
        size="lg"
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            {editingCategory ? "Edit Category" : "Add New Category"}
          </ModalHeader>
          {!isSubmitting && <ModalCloseButton onClick={handleClose} />}
          <ModalBody>
            <form onSubmit={handleSubmit}>
              <VStack spacing={4}>
                <FormControl isRequired>
                  <FormLabel fontWeight="medium">Category Name</FormLabel>
                  <Input
                    placeholder="Enter category name"
                    value={formData.categoryName}
                    onChange={(e) =>
                      setFormData({ ...formData, categoryName: e.target.value })
                    }
                    focusBorderColor="#550000"
                  />
                </FormControl>

                <FormControl>
                  <FormLabel fontWeight="medium">Description</FormLabel>
                  <Input
                    placeholder="Enter category description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    focusBorderColor="#550000"
                  />
                </FormControl>
              </VStack>
            </form>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="ghost"
              mr={3}
              onClick={handleClose}
              isDisabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              colorScheme="blue"
              onClick={handleSubmit}
              isLoading={isSubmitting}
              loadingText={editingCategory ? "Saving..." : "Adding..."}
            >
              {editingCategory ? "Save Changes" : "Add Category"}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        isOpen={isDeleteOpen}
        leastDestructiveRef={cancelRef}
        onClose={() => !isDeleting && onDeleteClose()}
        isCentered
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete Category
            </AlertDialogHeader>

            <AlertDialogBody>
              Are you sure you want to delete the category "
              <strong>{categoryToDelete?.categoryName}</strong>"? This action
              cannot be undone.
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
    </Box>
  );
};

export default Category;
