import React, { useEffect, useState } from "react";
import {
  Box,
  Heading,
  Text,
  Flex,
  List,
  ListItem,
  Switch,
  VStack,
  HStack,
  Divider,
  Spinner,
  Input,
  Avatar,
  useColorModeValue,
  Icon,
  InputGroup,
  InputLeftElement,
  SimpleGrid,
  Tooltip,
  useToast,
} from "@chakra-ui/react";
import { motion } from "framer-motion";
import { Search2Icon } from "@chakra-ui/icons";
import { FaUser } from "react-icons/fa";
import axios from "axios";

const MODULES = [
  "Dashboard",
  "Customer",
  "Vehicle",
  "Delivery",
  "Waybill",
  "Billing",
  "Payroll Processing",
  "Employee Records",
  "Inventory",
  "User Accounts",
  "Reports",
  "Control Panel",
];

const MotionBox = motion(Box);
const MotionSwitch = motion(Switch);

const ModuleAssignment = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userModules, setUserModules] = useState({}); // { userId: [modules] }
  const [search, setSearch] = useState("");
  const toast = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        process.env.NEXT_PUBLIC_BACKEND_API + "/api/users"
      );
      setUsers(response.data);
      setLoading(false);
    } catch (error) {
      setLoading(false);
      toast({ title: "Failed to load users", status: "error" });
    }
  };

  // Save module assignments to database
  const handleToggleModule = async (module) => {
    if (!selectedUser) return;

    try {
      // Update local state first for immediate feedback
      setUserModules((prev) => {
        const current = prev[selectedUser._id] || [];
        const updated = current.includes(module)
          ? current.filter((m) => m !== module)
          : [...current, module];
        return { ...prev, [selectedUser._id]: updated };
      });

      // Get the updated modules for this user
      const updatedModules = userModules[selectedUser._id] || [];
      const finalModules = updatedModules.includes(module)
        ? updatedModules.filter((m) => m !== module)
        : [...updatedModules, module];

      // Save to database
      const token = localStorage.getItem("token");
      if (!token) {
        toast({
          title: "Error",
          description: "Authentication token not found",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
        return;
      }

      await axios.post(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/module-assignments/${selectedUser._id}`,
        { modules: finalModules },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      toast({
        title: "Success",
        description: "Module assignments updated successfully",
        status: "success",
        duration: 2000,
        isClosable: true,
      });
    } catch (error) {
      console.error("Error updating module assignments:", error);
      toast({
        title: "Error",
        description: "Failed to update module assignments",
        status: "error",
        duration: 3000,
        isClosable: true,
      });

      // Revert local state on error
      setUserModules((prev) => {
        const current = prev[selectedUser._id] || [];
        return { ...prev, [selectedUser._id]: current };
      });
    }
  };

  // Fetch user's module assignments when a user is selected
  useEffect(() => {
    const fetchUserModules = async () => {
      if (!selectedUser) return;

      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_BACKEND_API}/api/module-assignments/${selectedUser._id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.data && response.data.modules) {
          setUserModules((prev) => ({
            ...prev,
            [selectedUser._id]: response.data.modules,
          }));
        }
      } catch (error) {
        console.error("Error fetching user modules:", error);
        // If there's an error, initialize with empty array
        setUserModules((prev) => ({
          ...prev,
          [selectedUser._id]: [],
        }));
      }
    };

    fetchUserModules();
  }, [selectedUser]);

  // Filter users by search
  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase())
  );

  const userCardBg = useColorModeValue("white", "gray.700");
  const userCardSelected = useColorModeValue("blue.50", "blue.900");
  const userCardBorder = useColorModeValue("gray.200", "gray.600");

  return (
    <Box p={{ base: 2, md: 6 }}>
      <Heading as="h2" size="lg" mb={6} letterSpacing={1}>
        Module Assignment
      </Heading>
      <Flex gap={8} direction={{ base: "column", md: "row" }}>
        {/* User List */}
        <Box
          minW={{ base: "100%", md: "270px" }}
          maxW={{ base: "100%", md: "320px" }}
          borderWidth={1}
          borderRadius="xl"
          p={4}
          bg={useColorModeValue("gray.50", "gray.800")}
          boxShadow="md"
        >
          <Text fontWeight="bold" mb={3} fontSize="lg">
            Users
          </Text>
          <InputGroup mb={3}>
            <InputLeftElement pointerEvents="none">
              <Search2Icon color="gray.400" />
            </InputLeftElement>
            <Input
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              borderRadius="md"
              bg={useColorModeValue("white", "gray.700")}
            />
          </InputGroup>
          {loading ? (
            <Spinner />
          ) : filteredUsers.length === 0 ? (
            <Text color="gray.400" textAlign="center" mt={6}>
              No users found
            </Text>
          ) : (
            <VStack align="stretch" spacing={3} maxH="420px" overflowY="auto">
              {filteredUsers.map((user) => (
                <MotionBox
                  key={user._id}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                  borderWidth={2}
                  borderColor={
                    selectedUser && selectedUser._id === user._id
                      ? "blue.400"
                      : userCardBorder
                  }
                  bg={
                    selectedUser && selectedUser._id === user._id
                      ? userCardSelected
                      : userCardBg
                  }
                  borderRadius="lg"
                  p={3}
                  cursor="pointer"
                  boxShadow={
                    selectedUser && selectedUser._id === user._id
                      ? "lg"
                      : "sm"
                  }
                  onClick={() => setSelectedUser(user)}
                  display="flex"
                  alignItems="center"
                  gap={3}
                >
                  <Avatar
                    size="sm"
                    name={user.name}
                    src={user.profileImage || undefined}
                    icon={<Icon as={FaUser} />}
                  />
                  <Box flex={1} minW={0}>
                    <Text fontWeight="medium" isTruncated>
                      {user.name}
                    </Text>
                    <Text fontSize="sm" color="gray.500" isTruncated>
                      {user.email}
                    </Text>
                  </Box>
                </MotionBox>
              ))}
            </VStack>
          )}
        </Box>
        <Divider orientation="vertical" display={{ base: "none", md: "block" }} />
        {/* Module Assignment */}
        <Box
          flex={1}
          borderWidth={1}
          borderRadius="xl"
          p={4}
          bg={useColorModeValue("white", "gray.50")}
          boxShadow="md"
          minH="350px"
        >
          <Text fontWeight="bold" mb={3} fontSize="lg">
            Module Access
          </Text>
          {selectedUser ? (
            <SimpleGrid columns={{ base: 1, sm: 2, md: 2, lg: 3 }} spacing={4}>
              {MODULES.map((module) => (
                <HStack
                  key={module}
                  justify="space-between"
                  w="100%"
                  p={3}
                  borderRadius="md"
                  bg={useColorModeValue("gray.100", "gray.700")}
                  boxShadow="sm"
                  _hover={{ bg: useColorModeValue("blue.50", "blue.900") }}
                  transition="background 0.2s"
                >
                  <Tooltip label={module} placement="top-start">
                    <Text fontWeight="medium" isTruncated>
                      {module}
                    </Text>
                  </Tooltip>
                  <MotionSwitch
                    layout
                    colorScheme="blue"
                    isChecked={
                      (userModules[selectedUser._id] || []).includes(module)
                    }
                    onChange={() => handleToggleModule(module)}
                    whileTap={{ scale: 1.2 }}
                  />
                </HStack>
              ))}
            </SimpleGrid>
          ) : (
            <Flex align="center" justify="center" h="100%" minH="200px">
              <Text color="gray.400" fontSize="lg">
                Select a user to assign modules.
              </Text>
            </Flex>
          )}
        </Box>
      </Flex>
    </Box>
  );
};

export default ModuleAssignment;
