import React, { useEffect } from "react";
import SidebarWithHeader from "../components/MainPage/SidebarWithHeader";
import { useRouter } from "next/router";
import {
  Box,
  Grid,
  GridItem,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  Heading,
  Text,
  SimpleGrid,
  Icon,
  Flex,
  useColorModeValue,
} from "@chakra-ui/react";
import {
  FaUsers,
  FaTruck,
  FaFileAlt,
  FaChartLine,
  FaCalendarAlt,
  FaBox,
  FaMoneyBillWave,
  FaExclamationTriangle,
} from "react-icons/fa";

const DashboardPage = () => {
  const router = useRouter();
  const bgColor = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.700");

  // Optimized redirect check - faster performance
  useEffect(() => {
    // Direct mapping for faster lookup
    const redirectMap = {
      "Waybill Officer": "/waybill-officer",
      Scheduler: "/scheduler-officer",
      "Inventory Officer": "/inventory-officer",
      HR: "/hr-officer",
      Admin: "/admin-page",
      "Super Admin": "/admin-page",
    };

    try {
      const userStr = localStorage.getItem("user");
      if (!userStr) return;

      const user = JSON.parse(userStr);
      const redirectPath = user?.workLevel && redirectMap[user.workLevel];

      if (redirectPath) {
        // Use replace instead of push for immediate transition
        router.replace(redirectPath);
      }
    } catch (e) {
      // Silent error handling for performance
    }
  }, [router]);

  const StatCard = ({ title, value, icon, change, isIncrease }) => (
    <Box
      bg={bgColor}
      p={6}
      borderRadius="xl"
      boxShadow="lg"
      border="1px solid"
      borderColor={borderColor}
      transition="all 0.2s"
      _hover={{ transform: "translateY(-4px)", boxShadow: "xl" }}
    >
      <Flex justify="space-between" align="center" mb={4}>
        <Box>
          <Text color="gray.500" fontSize="sm" fontWeight="medium">
            {title}
          </Text>
          <Text fontSize="2xl" fontWeight="bold" color="black" mt={2}>
            {value}
          </Text>
        </Box>
        <Box
          bg="#143D60"
          p={3}
          borderRadius="lg"
          color="white"
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          <Icon as={icon} w={6} h={6} />
        </Box>
      </Flex>
      <Flex align="center" mt={4}>
        <StatArrow type={isIncrease ? "increase" : "decrease"} />
        <Text color="gray.500" fontSize="sm" ml={2}>
          {change}
        </Text>
      </Flex>
    </Box>
  );

  return (
    <SidebarWithHeader>
      <Box p={8}>
        {/* Welcome Section */}
        <Box mb={8}>
          <Heading size="lg" color="black" mb={2}>
            Welcome back, Admin!
          </Heading>
          <Text color="gray.600">
            Here's what's happening with your business today.
          </Text>
        </Box>

        {/* Statistics Grid */}
        <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={6} mb={8}>
          <StatCard
            title="Total Employees"
            value="150"
            icon={FaUsers}
            change="+12% from last month"
            isIncrease={true}
          />
          <StatCard
            title="Active Deliveries"
            value="45"
            icon={FaTruck}
            change="+8% from last week"
            isIncrease={true}
          />
          <StatCard
            title="Pending Waybills"
            value="23"
            icon={FaFileAlt}
            change="-5% from yesterday"
            isIncrease={false}
          />
          <StatCard
            title="Revenue"
            value="$12,500"
            icon={FaMoneyBillWave}
            change="+15% from last month"
            isIncrease={true}
          />
        </SimpleGrid>

        {/* Main Content Grid */}
        <Grid templateColumns={{ base: "1fr", lg: "2fr 1fr" }} gap={6}>
          {/* Left Column */}
          <GridItem>
            {/* Recent Activity */}
            <Box
              bg={bgColor}
              p={6}
              borderRadius="xl"
              boxShadow="lg"
              border="1px solid"
              borderColor={borderColor}
              mb={6}
            >
              <Flex justify="space-between" align="center" mb={4}>
                <Heading size="md" color="black">
                  Recent Activity
                </Heading>
                <Text color="#143D60" fontSize="sm" fontWeight="medium">
                  View All
                </Text>
              </Flex>
              <Box>
                {[1, 2, 3].map((item) => (
                  <Flex
                    key={item}
                    align="center"
                    py={3}
                    borderBottom="1px solid"
                    borderColor={borderColor}
                    _last={{ borderBottom: "none" }}
                  >
                    <Box
                      bg="#143D60"
                      p={2}
                      borderRadius="full"
                      mr={4}
                      color="white"
                    >
                      <Icon as={FaCalendarAlt} w={4} h={4} />
                    </Box>
                    <Box flex="1">
                      <Text color="black" fontWeight="medium">
                        New delivery scheduled
                      </Text>
                      <Text color="gray.500" fontSize="sm">
                        2 hours ago
                      </Text>
                    </Box>
                  </Flex>
                ))}
              </Box>
            </Box>

            {/* Performance Chart */}
            <Box
              bg={bgColor}
              p={6}
              borderRadius="xl"
              boxShadow="lg"
              border="1px solid"
              borderColor={borderColor}
            >
              <Flex justify="space-between" align="center" mb={4}>
                <Heading size="md" color="black">
                  Performance Overview
                </Heading>
                <Text color="#143D60" fontSize="sm" fontWeight="medium">
                  Last 7 days
                </Text>
              </Flex>
              <Box h="300px" bg="gray.50" borderRadius="lg" p={4}>
                {/* Placeholder for chart */}
                <Flex h="100%" align="center" justify="center" color="gray.500">
                  Chart will be implemented here
                </Flex>
              </Box>
            </Box>
          </GridItem>

          {/* Right Column */}
          <GridItem>
            {/* Quick Actions */}
            <Box
              bg={bgColor}
              p={6}
              borderRadius="xl"
              boxShadow="lg"
              border="1px solid"
              borderColor={borderColor}
              mb={6}
            >
              <Heading size="md" color="black" mb={4}>
                Quick Actions
              </Heading>
              <SimpleGrid columns={2} spacing={4}>
                {[
                  { icon: FaFileAlt, label: "New Waybill" },
                  { icon: FaUsers, label: "Add Employee" },
                  { icon: FaTruck, label: "Schedule Delivery" },
                  { icon: FaBox, label: "Inventory" },
                ].map((action) => (
                  <Flex
                    key={action.label}
                    align="center"
                    p={4}
                    bg="gray.50"
                    borderRadius="lg"
                    cursor="pointer"
                    transition="all 0.2s"
                    _hover={{ bg: "#143D60", color: "white" }}
                  >
                    <Icon as={action.icon} w={5} h={5} mr={3} />
                    <Text fontWeight="medium">{action.label}</Text>
                  </Flex>
                ))}
              </SimpleGrid>
            </Box>

            {/* Alerts */}
            <Box
              bg={bgColor}
              p={6}
              borderRadius="xl"
              boxShadow="lg"
              border="1px solid"
              borderColor={borderColor}
            >
              <Heading size="md" color="black" mb={4}>
                Alerts
              </Heading>
              <Box>
                {[1, 2].map((item) => (
                  <Flex
                    key={item}
                    align="center"
                    py={3}
                    borderBottom="1px solid"
                    borderColor={borderColor}
                    _last={{ borderBottom: "none" }}
                  >
                    <Box
                      bg="red.100"
                      p={2}
                      borderRadius="full"
                      mr={4}
                      color="red.500"
                    >
                      <Icon as={FaExclamationTriangle} w={4} h={4} />
                    </Box>
                    <Box>
                      <Text color="black" fontWeight="medium">
                        Low inventory alert
                      </Text>
                      <Text color="gray.500" fontSize="sm">
                        Action required
                      </Text>
                    </Box>
                  </Flex>
                ))}
              </Box>
            </Box>
          </GridItem>
        </Grid>
      </Box>
    </SidebarWithHeader>
  );
};

export default DashboardPage;
