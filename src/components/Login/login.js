import { useState, useEffect } from "react";
import {
  Box,
  Button,
  Input,
  FormControl,
  FormLabel,
  Heading,
  Flex,
  Grid,
  Image,
  Text,
  useToast,
} from "@chakra-ui/react";
import { useRouter } from "next/router";
import axios from "axios";
import { isAuthenticated, getRedirectPath } from "../../utils/auth";

// Define the role-based redirect paths - directly defined here to avoid function calls
const redirectPaths = {
  "Waybill Officer": "/waybill-officer",
  Scheduler: "/scheduler-officer",
  "Inventory Officer": "/inventory-officer",
  HR: "/hr-officer",
  Admin: "/admin-page",
  "System Admin": "/admin-page",
  "Basic User": "/users-dashboard",
  "Billing Officer": "/billing-officer",
};

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const toast = useToast();

  // Fast check for authentication - optimized
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      const userStr = localStorage.getItem("user");
      try {
        if (userStr) {
          const user = JSON.parse(userStr);
          // Direct path lookup without function call
          const path = user?.workLevel
            ? redirectPaths[user.workLevel] || "/dashboard"
            : "/dashboard";
          router.replace(path);
        } else {
          router.replace("/dashboard");
        }
      } catch (e) {
        router.replace("/dashboard");
      }
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLoading) return; // Prevent double submissions

    setIsLoading(true);

    try {
      // Optimize the API call
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/login`,
        { email, password },
        { headers: { "Content-Type": "application/json" } }
      );

      if (response.data && response.data.token) {
        // Store minimal user data
        localStorage.setItem("token", response.data.token);

        const userData = response.data.user;
        localStorage.setItem(
          "user",
          JSON.stringify({
            id: userData.id,
            name: userData.name,
            email: userData.email,
            workLevel: userData.workLevel,
            moduleAssignments: userData.moduleAssignments || [], // Store module assignments
          })
        );

        // Show a toast notification but don't wait for it
        toast({
          title: "Success",
          status: "success",
          duration: 1000,
          isClosable: true,
          position: "top-right",
        });

        // Direct routing without setTimeout
        const path = userData.workLevel
          ? redirectPaths[userData.workLevel] || "/dashboard"
          : "/dashboard";
        router.replace(path);
      }
    } catch (error) {
      setIsLoading(false);
      toast({
        title: "Login Failed",
        description: "Invalid email or password",
        status: "error",
        duration: 2000,
        isClosable: true,
        position: "top-right",
      });
    }
  };

  return (
    <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} height="100vh">
      <Flex
        align="center"
        justify="center"
        p={6}
        borderRight={{ base: "none", md: "1px solid #ddd" }}
      >
        <Box
          maxW="md"
          w="100%"
          p={8}
          borderWidth={1}
          borderRadius="lg"
          boxShadow="lg"
        >
          <Heading as="h2" size="lg" mb={6} textAlign="center">
            LOGIN
          </Heading>

          {error && (
            <Text color="red.500" mb={4}>
              {error}
            </Text>
          )}

          <form onSubmit={handleSubmit}>
            <FormControl mb={4}>
              <FormLabel>Username</FormLabel>
              <Input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your username"
                disabled={isLoading}
              />
            </FormControl>

            <FormControl mb={4}>
              <FormLabel>Password</FormLabel>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                required
                disabled={isLoading}
              />
            </FormControl>

            <Button
              type="submit"
              bg="#16404d"
              color="white"
              width="full"
              mt={4}
              _hover={{ bg: "#133643" }}
              isLoading={isLoading}
              loadingText="Logging in..."
            >
              Login
            </Button>
          </form>
        </Box>
      </Flex>

      <Flex align="center" justify="center" bg="#16404d">
        <Box position="relative">
          <Image src="/LOGO.png" alt="Company Logo" boxSize="500px" />
        </Box>
      </Flex>
    </Grid>
  );
};

export default Login;