import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import {
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Button,
  VStack,
  HStack,
  Flex,
  Box,
  Text,
  useToast,
  IconButton,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Input,
  useDisclosure,
  Image,
  Select,
  TableContainer,
  Heading,
  FormControl,
  FormLabel,
  Tooltip,
  useBreakpointValue,
  Badge,
  Avatar,
  InputGroup,
  InputLeftElement,
  SimpleGrid,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  InputRightElement,
} from "@chakra-ui/react";
import {
  EditIcon,
  DeleteIcon,
  AddIcon,
  Search2Icon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ViewIcon,
  ViewOffIcon,
} from "@chakra-ui/icons";
import { motion } from "framer-motion";
import { FaUsers, FaUserShield, FaUserCog, FaUser } from "react-icons/fa";
import { Icon } from "@chakra-ui/react";

const MotionBox = motion(Box);
const MotionButton = motion(Button);
const MotionTr = motion(Tr);

const UserTable = () => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]); // For filtered results
  const [currentUser, setCurrentUser] = useState(null);
  const [currentUserWorkLevel, setCurrentUserWorkLevel] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    workLevel: "",
    profileImage: null,
  });
  const [searchQuery, setSearchQuery] = useState(""); // State for search input
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false); // <<< Add isSubmitting state
  const [isDeleting, setIsDeleting] = useState(false); // <<< Add isDeleting state
  const [userToDelete, setUserToDelete] = useState(null); // <<< Add userToDelete state
  const {
    isOpen: isDeleteOpen,
    onOpen: onDeleteOpen,
    onClose: onDeleteClose,
  } = useDisclosure(); // <<< Disclosure for delete
  const cancelRef = useRef(); // <<< Add cancelRef
  const [showPassword, setShowPassword] = useState(false); // <<< Add showPassword state

  useEffect(() => {
    fetchUsers();
    // Get current user's work level from localStorage
    const userStr = localStorage.getItem("user");
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setCurrentUserWorkLevel(user.workLevel);
      } catch (e) {
        console.error("Error parsing user data", e);
      }
    }
  }, []);

  // Fetch users from backend
  const fetchUsers = async () => {
    try {
      const response = await axios.get(
        process.env.NEXT_PUBLIC_BACKEND_API + "/api/users"
      );
      setUsers(response.data);
      setFilteredUsers(response.data); // Initialize filtered users with all users
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  // Handle search input change
  const handleSearch = (e) => {
    const query = e.target.value.toLowerCase();
    setSearchQuery(query);

    // Filter users based on the search query
    const filtered = users.filter(
      (user) =>
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        user.workLevel?.toLowerCase().includes(query)
    );
    setFilteredUsers(filtered);
  };

  // Handle input change
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Handle file change
  const handleFileChange = (e) => {
    setFormData({ ...formData, profileImage: e.target.files[0] });
  };

  // Open modal for adding a new user
  const openAddUserModal = () => {
    setCurrentUser(null);
    setFormData({
      name: "",
      email: "",
      password: "",
      workLevel: "",
      profileImage: null,
    });
    onOpen();
  };

  // Open modal for editing a user
  const handleEdit = (user) => {
    setCurrentUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: "",
      workLevel: user.workLevel || "",
      profileImage: null,
    });
    onOpen();
  };

  // Handle add/update user
  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const formDataToSend = new FormData();
      formDataToSend.append("name", formData.name);
      formDataToSend.append("email", formData.email);
      formDataToSend.append("workLevel", formData.workLevel);
      formData.password && formDataToSend.append("password", formData.password);
      if (formData.profileImage) {
        formDataToSend.append("profileImage", formData.profileImage);
      }

      // Add current user workLevel to headers for backend verification
      const headers = {
        "Content-Type": "multipart/form-data",
        "X-User-WorkLevel": currentUserWorkLevel,
      };

      let response;
      if (currentUser) {
        // Update user
        response = await axios.put(
          process.env.NEXT_PUBLIC_BACKEND_API + `/api/users/${currentUser._id}`,
          formDataToSend,
          { headers }
        );
        toast({
          title: "User Updated",
          description: "The user has been successfully updated.",
          status: "success",
          duration: 3000,
          isClosable: true,
          position: "top-right",
        });

        // Get the updated user from response
        const updatedUser = response.data.user;

        // Update user in place
        setUsers((prev) =>
          prev.map((u) => (u._id === currentUser._id ? updatedUser : u))
        );
        setFilteredUsers((prev) =>
          prev.map((u) => (u._id === currentUser._id ? updatedUser : u))
        );
      } else {
        // Register new user
        response = await axios.post(
          process.env.NEXT_PUBLIC_BACKEND_API + "/api/users/register",
          formDataToSend,
          {
            headers: { "Content-Type": "multipart/form-data" },
          }
        );
        toast({
          title: "User Registered",
          description: "The user has been successfully registered.",
          status: "success",
          duration: 3000,
          isClosable: true,
          position: "top-right",
        });

        // Get the new user from response (backend returns newUser, not user)
        const newUser = response.data.newUser;

        // Prepend new user to top
        setUsers((prev) => [newUser, ...prev]);
        setFilteredUsers((prev) => [newUser, ...prev]);
      }

      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Something went wrong.",
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "top-right",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Delete User
  const handleDeleteClick = (user) => {
    setUserToDelete(user); // <<< Set user to delete
    onDeleteOpen(); // <<< Open confirmation dialog
  };

  // Handle Delete Confirm
  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    const token = localStorage.getItem("token");

    try {
      if (!token) {
        toast({
          title: "Error",
          description: "Authentication token not found. Please log in again.",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
        onDeleteClose();
        return;
      }

      await axios.delete(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/users/${userToDelete._id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "X-User-WorkLevel": currentUserWorkLevel,
          },
        }
      );

      fetchUsers(); // Refetch users after successful deletion
      onDeleteClose(); // Close the dialog
      setUserToDelete(null); // Clear the user to delete

      toast({
        title: "User Deleted",
        description: "The user has been successfully deleted.", // Assuming backend doesn't log this yet or doesn't require a specific message
        status: "success",
        duration: 3000,
        isClosable: true,
        position: "top-right",
      });
    } catch (error) {
      toast({
        title: "Error",
        description:
          error.response?.data?.message ||
          "Something went wrong while deleting the user.",
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "top-right",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Calculate pagination values
  const indexOfLastUser = currentPage * itemsPerPage;
  const indexOfFirstUser = indexOfLastUser - itemsPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

  // Handle page change
  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  return (
    <MotionBox>
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
          User Management
        </Heading>
        <Text mt={2} fontSize="md" color="gray.600">
          Manage user accounts and permissions
        </Text>
      </Box>

      {/* Quick Stats Cards */}
      <SimpleGrid columns={{ base: 1, md: 4 }} spacing={6} px={6} mb={6}>
        <Box
          bg="white"
          p={6}
          borderRadius="lg"
          boxShadow="sm"
          borderWidth="1px"
          borderColor="gray.200"
          _hover={{ boxShadow: "md", transform: "translateY(-2px)" }}
          transition="all 0.2s"
        >
          <Flex justify="space-between" align="center">
            <Box>
              <Text fontSize="sm" color="gray.600" mb={1}>
                Total Users
              </Text>
              <Heading size="lg" color="#1a365d">
                {users.length}
              </Heading>
            </Box>
            <Box
              bg="#1a365d"
              color="white"
              p={3}
              borderRadius="full"
              boxSize="48px"
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              <Icon as={FaUsers} boxSize={5} />
            </Box>
          </Flex>
        </Box>

        <Box
          bg="white"
          p={6}
          borderRadius="lg"
          boxShadow="sm"
          borderWidth="1px"
          borderColor="gray.200"
          _hover={{ boxShadow: "md", transform: "translateY(-2px)" }}
          transition="all 0.2s"
        >
          <Flex justify="space-between" align="center">
            <Box>
              <Text fontSize="sm" color="gray.600" mb={1}>
                System Admins
              </Text>
              <Heading size="lg" color="#800020">
                {
                  users.filter((user) => user?.workLevel === "System Admin")
                    .length
                }
              </Heading>
            </Box>
            <Box
              bg="#800020"
              color="white"
              p={3}
              borderRadius="full"
              boxSize="48px"
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              <Icon as={FaUserShield} boxSize={5} />
            </Box>
          </Flex>
        </Box>

        <Box
          bg="white"
          p={6}
          borderRadius="lg"
          boxShadow="sm"
          borderWidth="1px"
          borderColor="gray.200"
          _hover={{ boxShadow: "md", transform: "translateY(-2px)" }}
          transition="all 0.2s"
        >
          <Flex justify="space-between" align="center">
            <Box>
              <Text fontSize="sm" color="gray.600" mb={1}>
                Admins
              </Text>
              <Heading size="lg" color="#1a365d">
                {users.filter((user) => user?.workLevel === "Admin").length}
              </Heading>
            </Box>
            <Box
              bg="#1a365d"
              color="white"
              p={3}
              borderRadius="full"
              boxSize="48px"
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              <Icon as={FaUserCog} boxSize={5} />
            </Box>
          </Flex>
        </Box>

        <Box
          bg="white"
          p={6}
          borderRadius="lg"
          boxShadow="sm"
          borderWidth="1px"
          borderColor="gray.200"
          _hover={{ boxShadow: "md", transform: "translateY(-2px)" }}
          transition="all 0.2s"
        >
          <Flex justify="space-between" align="center">
            <Box>
              <Text fontSize="sm" color="gray.600" mb={1}>
                Other Users
              </Text>
              <Heading size="lg" color="#800020">
                {
                  users.filter(
                    (user) =>
                      !["System Admin", "Admin"].includes(user?.workLevel)
                  ).length
                }
              </Heading>
            </Box>
            <Box
              bg="#800020"
              color="white"
              p={3}
              borderRadius="full"
              boxSize="48px"
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              <Icon as={FaUser} boxSize={5} />
            </Box>
          </Flex>
        </Box>
      </SimpleGrid>

      {/* Search and Add User */}
      <Flex direction="column" mb={6} px={6}>
        <Flex align="center" gap={3}>
          <Button
            onClick={openAddUserModal}
            leftIcon={<AddIcon />}
            bg="#800020"
            color="white"
            _hover={{ bg: "#600010" }}
            _active={{ bg: "#400000" }}
            size="md"
            borderRadius="md"
            boxShadow="sm"
          >
            Add User
          </Button>
          <InputGroup maxW="400px">
            <InputLeftElement pointerEvents="none">
              <Search2Icon color="gray.500" />
            </InputLeftElement>
            <Input
              placeholder="Search users..."
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
                  { name: "PROFILE", width: "10%", align: "left" },
                  { name: "NAME", width: "20%", align: "left" },
                  { name: "EMAIL", width: "25%", align: "left" },
                  { name: "WORK LEVEL", width: "15%", align: "left" },
                  { name: "STATUS", width: "10%", align: "center" },
                  { name: "ACTIONS", width: "15%", align: "center" },
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
              {currentUsers.map((user, index) => (
                <MotionTr
                  key={user._id}
                  _hover={{ bg: "#F0F7FF" }}
                  transition="all 0.2s"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  whileHover={{ scale: 1.005 }}
                  bg={index % 2 === 0 ? "white" : "gray.50"}
                  borderBottom="1px solid"
                  borderColor="#E2E8F0"
                >
                  <Td>
                    <HStack spacing={3}>
                      <Avatar
                        size="sm"
                        name={user.name}
                        src={
                          user.profileImage
                            ? process.env.NEXT_PUBLIC_BACKEND_API +
                              `/uploads/${user.profileImage}`
                            : "/fallback-profile.jpg"
                        }
                      />
                    </HStack>
                  </Td>
                  <Td fontWeight="medium" color="#1a365d">
                    {user.name}
                  </Td>
                  <Td color="gray.600">{user.email}</Td>
                  <Td>
                    <Badge
                      bg={
                        user.workLevel === "System Admin"
                          ? "#1a365d"
                          : user.workLevel === "Admin"
                            ? "#800020"
                            : "gray.600"
                      }
                      color="white"
                      borderRadius="md"
                      px={2}
                      py={1}
                    >
                      {user.workLevel || "N/A"}
                    </Badge>
                  </Td>
                  <Td>
                    <Badge
                      colorScheme={user.status === "ONLINE" ? "green" : "gray"}
                      borderRadius="md"
                      px={2}
                      py={1}
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                    >
                      <Box
                        w="8px"
                        h="8px"
                        borderRadius="full"
                        bg={user.status === "ONLINE" ? "green.500" : "gray.400"}
                        mr={2}
                      />
                      {user.status || "OFFLINE"}
                    </Badge>
                  </Td>
                  <Td>
                    <HStack spacing={2} justify="center">
                      <IconButton
                        aria-label="Edit"
                        icon={<EditIcon />}
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEdit(user)}
                        color="#800020"
                        _hover={{ bg: "red.50" }}
                      />
                      <IconButton
                        aria-label="Delete"
                        icon={<DeleteIcon />}
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteClick(user)}
                        colorScheme="red"
                      />
                    </HStack>
                  </Td>
                </MotionTr>
              ))}
            </Tbody>
          </Table>
        </TableContainer>
      </Box>

      {/* Pagination Controls */}
      <Flex justify="center" mt={8} gap={2}>
        <MotionButton
          onClick={() => handlePageChange(currentPage - 1)}
          isDisabled={currentPage === 1}
          leftIcon={<ChevronLeftIcon />}
          size="md"
          height="40px"
          px={4}
          variant="outline"
          colorScheme="blue"
          _hover={{ bg: "#1a365d", color: "white" }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Previous
        </MotionButton>

        {[...Array(totalPages)].map((_, index) => (
          <MotionButton
            key={index + 1}
            onClick={() => handlePageChange(index + 1)}
            size="md"
            height="40px"
            px={4}
            variant={currentPage === index + 1 ? "solid" : "outline"}
            colorScheme="yellow"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {index + 1}
          </MotionButton>
        ))}

        <MotionButton
          onClick={() => handlePageChange(currentPage + 1)}
          isDisabled={currentPage === totalPages}
          rightIcon={<ChevronRightIcon />}
          size="md"
          height="40px"
          px={4}
          variant="outline"
          colorScheme="blue"
          _hover={{ bg: "#1a365d", color: "white" }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Next
        </MotionButton>
      </Flex>

      {/* Modal for Adding/Editing Users */}
      <Modal
        isOpen={isOpen}
        onClose={!isSubmitting ? onClose : undefined}
        size="2xl"
      >
        <ModalOverlay bg="blackAlpha.600" backdropFilter="blur(2px)" />
        <ModalContent>
          <ModalHeader bg="#1a365d" color="white">
            {currentUser ? "Edit User" : "Add New User"}
          </ModalHeader>
          {!isSubmitting && <ModalCloseButton color="white" />}
          <ModalBody p={6}>
            <VStack spacing={6}>
              <FormControl>
                <FormLabel>Profile Image</FormLabel>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  borderColor="gray.300"
                  _hover={{ borderColor: "#800020" }}
                  _focus={{
                    borderColor: "#800020",
                    boxShadow: "0 0 0 1px #800020",
                  }}
                />
              </FormControl>

              <SimpleGrid columns={2} spacing={4} w="full">
                <FormControl isRequired>
                  <FormLabel>Name</FormLabel>
                  <Input
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
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
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    borderColor="#1a365d"
                    _hover={{ borderColor: "#800020" }}
                    _focus={{
                      borderColor: "#800020",
                      boxShadow: "0 0 0 1px #800020",
                    }}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>Password</FormLabel>
                  <InputGroup size="md">
                    <Input
                      pr="4.5rem"
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder={
                        currentUser
                          ? "Enter new password (optional)"
                          : "Enter password"
                      }
                      borderColor="#1a365d"
                      _hover={{ borderColor: "#800020" }}
                      _focus={{
                        borderColor: "#800020",
                        boxShadow: "0 0 0 1px #800020",
                      }}
                    />
                    <InputRightElement width="4.5rem">
                      <IconButton
                        h="1.75rem"
                        size="sm"
                        onClick={() => setShowPassword(!showPassword)}
                        icon={showPassword ? <ViewOffIcon /> : <ViewIcon />}
                        aria-label={
                          showPassword ? "Hide password" : "Show password"
                        }
                        variant="ghost"
                      />
                    </InputRightElement>
                  </InputGroup>
                </FormControl>

                <FormControl isRequired>
                  <FormLabel>Work Level</FormLabel>
                  <Select
                    name="workLevel"
                    value={formData.workLevel}
                    onChange={handleChange}
                    borderColor="#1a365d"
                    _hover={{ borderColor: "#800020" }}
                    _focus={{
                      borderColor: "#800020",
                      boxShadow: "0 0 0 1px #800020",
                    }}
                  >
                    <option value="">Select Work Level</option>
                    <option value="System Admin">System Admin</option>
                    <option value="Admin">Admin</option>
                    <option value="Waybill Officer">Waybill Officer</option>
                    <option value="Scheduler">Scheduler</option>
                    <option value="Inventory Officer">Inventory Officer</option>
                    <option value="HR">HR</option>
                    <option value="Billing Officer">Billing Officer</option>
                  </Select>
                </FormControl>
              </SimpleGrid>
            </VStack>
          </ModalBody>
          <ModalFooter borderTopWidth="2px" borderColor="#800020">
            <Button
              variant="outline"
              mr={3}
              onClick={onClose}
              color="#1a365d"
              borderColor="#1a365d"
              isDisabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              bg="#800020"
              color="white"
              _hover={{ bg: "#600010" }}
              onClick={handleSubmit}
              isLoading={isSubmitting}
              loadingText={currentUser ? "Saving..." : "Adding..."}
              isDisabled={isSubmitting}
            >
              {currentUser ? "Save Changes" : "Add User"}
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
              Delete User
            </AlertDialogHeader>

            <AlertDialogBody>
              Are you sure you want to delete the user "
              <strong>{userToDelete?.name}</strong>" ({userToDelete?.email})?
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
    </MotionBox>
  );
};

export default UserTable;
