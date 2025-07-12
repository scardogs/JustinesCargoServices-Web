import React, { useState, useEffect } from "react";
import {
  Box,
  Grid,
  GridItem,
  Stat,
  StatHelpText,
  StatArrow,
  Heading,
  Text,
  SimpleGrid,
  Icon,
  Flex,
  useColorModeValue,
  Spinner,
  Center,
  Link,
  CircularProgress,
  CircularProgressLabel,
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
  FaBoxOpen,
} from "react-icons/fa";
import RenewalNotifier from "../vehicle/RenewalNotifier";
import axios from "axios";
import NextLink from "next/link";

const LOW_STOCK_THRESHOLD = 10; // Define the threshold for low stock
const MAX_FUEL_CAPACITY = 1000; // Define assumed max capacity for fuel percentage

const SODashboard = () => {
  const bgColor = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const [totalEmployees, setTotalEmployees] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeDeliveries, setActiveDeliveries] = useState(0);
  const [recentActivities, setRecentActivities] = useState([]);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [additionalLowStockCount, setAdditionalLowStockCount] = useState(0);
  const [gasLevel, setGasLevel] = useState(0); // State for Gas percentage
  const [dieselLevel, setDieselLevel] = useState(0); // State for Diesel percentage
  const currentDate = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }); // Format the date

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch total employees
        const employeesResponse = await axios.get(
          process.env.NEXT_PUBLIC_BACKEND_API + "/api/employees/personal"
        );
        const activeEmployees = employeesResponse.data.filter(
          (emp) => !emp.dismissalDate
        );
        setTotalEmployees(activeEmployees.length);

        // Fetch trips
        const tripsResponse = await axios.get(
          process.env.NEXT_PUBLIC_BACKEND_API + "/api/trips"
        );
        const trips = tripsResponse.data?.trips || [];
        const onDeliveryTrips = trips.filter(
          (trip) => trip.status === "On-Delivery"
        );
        setActiveDeliveries(onDeliveryTrips.length);
        const recentOnDeliveryTrips = trips
          .filter((trip) => trip.status === "On-Delivery")
          .sort((a, b) => {
            const timeA = a.timestamp || a.createdAt;
            const timeB = b.timestamp || b.createdAt;
            return new Date(timeB) - new Date(timeA);
          })
          .slice(0, 3);
        setRecentActivities(recentOnDeliveryTrips);

        // Fetch Items for Low Stock Alert
        const itemsResponse = await axios.get(
          process.env.NEXT_PUBLIC_BACKEND_API + "/api/items"
        );
        const allItems = itemsResponse.data || [];

        // Sort items by stockBalance ascending
        const sortedItems = [...allItems].sort(
          (a, b) => (a.stockBalance || 0) - (b.stockBalance || 0)
        );

        // Set the top 3 lowest items for display
        const top3Lowest = sortedItems.slice(0, 3);
        setLowStockItems(top3Lowest);

        // Find all items truly below the threshold
        const trulyLowStockItems = allItems.filter(
          (item) => (item.stockBalance || 0) <= LOW_STOCK_THRESHOLD
        );

        // Count how many truly low stock items are NOT in the top 3 display list
        const top3Ids = new Set(top3Lowest.map((item) => item._id));
        const additionalCount = trulyLowStockItems.filter(
          (item) => !top3Ids.has(item._id)
        ).length;
        setAdditionalLowStockCount(additionalCount);

        // -- Fuel Level Processing --
        let currentGasStock = 0;
        let currentDieselStock = 0;

        allItems.forEach((item) => {
          const categoryName = item.categoryID?.categoryName?.toLowerCase();
          if (categoryName === "gas") {
            currentGasStock += item.stockBalance || 0;
          }
          if (categoryName === "diesel") {
            currentDieselStock += item.stockBalance || 0;
          }
        });

        // Calculate percentages (handle division by zero)
        const gasPercent =
          MAX_FUEL_CAPACITY > 0
            ? Math.round((currentGasStock / MAX_FUEL_CAPACITY) * 100)
            : 0;
        const dieselPercent =
          MAX_FUEL_CAPACITY > 0
            ? Math.round((currentDieselStock / MAX_FUEL_CAPACITY) * 100)
            : 0;

        setGasLevel(Math.min(gasPercent, 100)); // Cap at 100%
        setDieselLevel(Math.min(dieselPercent, 100)); // Cap at 100%
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        // Set default/empty values on error
        setTotalEmployees(0);
        setActiveDeliveries(0);
        setRecentActivities([]);
        setLowStockItems([]);
        setAdditionalLowStockCount(0);
        setGasLevel(0); // Reset fuel on error
        setDieselLevel(0); // Reset fuel on error
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const StatCard = ({ title, value, icon, change, isIncrease }) => (
    <Box
      bg={bgColor}
      p={4}
      borderRadius="lg"
      boxShadow="md"
      border="1px solid"
      borderColor={borderColor}
      transition="all 0.2s"
      _hover={{ transform: "translateY(-3px)", boxShadow: "lg" }}
    >
      <Flex justify="space-between" align="center" mb={2}>
        <Box>
          <Text color="gray.500" fontSize="xs" fontWeight="medium">
            {title}
          </Text>
          <Text fontSize="lg" fontWeight="bold" color="black" mt={1}>
            {loading ? "..." : value}
          </Text>
        </Box>
        <Box
          bg="#143D60"
          p={2.5}
          borderRadius="lg"
          color="white"
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          <Icon as={icon} w={5} h={5} />
        </Box>
      </Flex>
      <Stat size="sm" mt={3}>
        <Flex align="center">
          <StatArrow type={isIncrease ? "increase" : "decrease"} />
          <StatHelpText m={0} color="gray.500" fontSize="xs">
            {change}
          </StatHelpText>
        </Flex>
      </Stat>
    </Box>
  );

  // Function to format timestamp
  const formatTimestamp = (timestamp) => {
    try {
      if (!timestamp) {
        console.log("No timestamp provided"); // Debug log
        return "Unknown time";
      }

      const date = new Date(timestamp);
      if (isNaN(date.getTime())) {
        console.log("Invalid timestamp:", timestamp); // Debug log
        return "Unknown time";
      }

      const now = new Date();
      const diffInMinutes = Math.floor((now - date) / (1000 * 60));
      const diffInHours = Math.floor(diffInMinutes / 60);
      const diffInDays = Math.floor(diffInHours / 24);

      if (diffInMinutes < 60) {
        return `${diffInMinutes} minutes ago`;
      } else if (diffInHours < 24) {
        return `${diffInHours} hours ago`;
      } else {
        return date.toLocaleDateString();
      }
    } catch (error) {
      console.error("Error formatting timestamp:", error); // Debug log
      return "Unknown time";
    }
  };

  return (
    <Box p={4}>
      {/* Statistics Grid */}
      <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4} mb={4}>
        <StatCard
          title="Total Employees"
          value={totalEmployees}
          icon={FaUsers}
          change="Active employees"
          isIncrease={true}
        />
        <StatCard
          title="Active Deliveries"
          value={activeDeliveries}
          icon={FaTruck}
          change="Currently on delivery"
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
          value="₱12,500"
          icon={FaMoneyBillWave}
          change="+15% from last month"
          isIncrease={true}
        />
      </SimpleGrid>

      {/* Main Content Grid */}
      <Grid templateColumns={{ base: "1fr", lg: "2fr 1fr" }} gap={4}>
        {/* Left Column */}
        <GridItem>
          {/* Recent Activity */}
          <Box
            bg={bgColor}
            p={4}
            borderRadius="lg"
            boxShadow="md"
            border="1px solid"
            borderColor={borderColor}
            mb={4}
            height="260px"
          >
            <Flex justify="space-between" align="center" mb={3}>
              <Heading size="sm" color="black">
                Recent Activity
              </Heading>
              <Text color="#143D60" fontSize="xs" fontWeight="medium">
                View All
              </Text>
            </Flex>
            <Box>
              {recentActivities.length > 0 ? (
                recentActivities.map((activity, index) => (
                  <Flex
                    key={index}
                    align="center"
                    py={2}
                    borderBottom="1px solid"
                    borderColor={borderColor}
                    _last={{ borderBottom: "none" }}
                  >
                    <Box
                      bg="#143D60"
                      p={1.5}
                      borderRadius="full"
                      mr={3}
                      color="white"
                    >
                      <Icon as={FaTruck} w={3} h={3} />
                    </Box>
                    <Box flex="1">
                      <Text color="black" fontWeight="medium" fontSize="xs">
                        Delivery in progress - {activity.vehicle}
                      </Text>
                      <Text color="gray.500" fontSize="2xs">
                        {formatTimestamp(
                          activity.timestamp || activity.createdAt
                        )}
                      </Text>
                    </Box>
                  </Flex>
                ))
              ) : (
                <Text color="gray.500" fontSize="xs">
                  No recent activities
                </Text>
              )}
            </Box>
          </Box>

          {/* Renewal Notifier */}
          <RenewalNotifier />
        </GridItem>

        {/* Right Column */}
        <GridItem>
          {/* Alerts */}
          <Box
            bg={bgColor}
            p={4}
            borderRadius="lg"
            boxShadow="md"
            border="1px solid"
            borderColor={borderColor}
            height="260px"
            display="flex"
            flexDirection="column"
          >
            <Heading size="sm" color="black" mb={3}>
              Inventory Alerts
            </Heading>
            <Box flexGrow={1} overflowY="auto">
              {loading ? (
                <Center h="100%">
                  <Spinner color="#143D60" />
                </Center>
              ) : lowStockItems.length > 0 ? (
                lowStockItems.map((item, index) => (
                  <Flex
                    key={item._id || index}
                    align="center"
                    py={2}
                    borderBottom="1px solid"
                    borderColor={borderColor}
                    _last={{ borderBottom: "none" }}
                  >
                    <Box
                      bg={
                        item.stockBalance <= LOW_STOCK_THRESHOLD
                          ? "red.100"
                          : "yellow.100"
                      }
                      p={1.5}
                      borderRadius="full"
                      mr={3}
                      color={
                        item.stockBalance <= LOW_STOCK_THRESHOLD
                          ? "red.500"
                          : "yellow.600"
                      }
                    >
                      <Icon as={FaBoxOpen} w={3} h={3} />
                    </Box>
                    <Box>
                      <Text
                        color="black"
                        fontWeight="medium"
                        fontSize="xs"
                        noOfLines={1}
                      >
                        {item.itemName} ({item.itemID})
                      </Text>
                      <Text color="gray.500" fontSize="2xs">
                        Stock: {item.stockBalance || 0} {item.measurement}
                      </Text>
                    </Box>
                  </Flex>
                ))
              ) : (
                <Center h="100%">
                  <Text color="gray.500" fontSize="xs">
                    No items found.
                  </Text>
                </Center>
              )}
            </Box>
          </Box>

          {/* Fuel Box */}
          <Box
            bg={bgColor}
            p={4}
            borderRadius="lg"
            boxShadow="md"
            border="1px solid"
            borderColor={borderColor}
            mt={4}
            height="calc(665px - 260px - 1rem)"
          >
            <Heading size="sm" color="black" mb={1}>
              Fuel Monitoring
            </Heading>
            <Text fontSize="xs" color="gray.500" mb={3}>
              As of {currentDate}
            </Text>
            <SimpleGrid columns={2} spacing={4} textAlign="center" mt={6}>
              <Box>
                <CircularProgress
                  value={gasLevel} // Use state value
                  color={
                    gasLevel > 60
                      ? "green.400"
                      : gasLevel > 20
                        ? "yellow.400"
                        : "red.400"
                  } // Use state value for color
                  size="140px"
                  thickness="8px"
                >
                  <CircularProgressLabel fontSize="lg" fontWeight="bold">
                    {gasLevel}%
                  </CircularProgressLabel>{" "}
                  {/* Use state value */}
                </CircularProgress>
                <Text mt={2} fontWeight="medium" fontSize="sm">
                  Gas
                </Text>
              </Box>
              <Box>
                <CircularProgress
                  value={dieselLevel} // Use state value
                  color={
                    dieselLevel > 60
                      ? "green.400"
                      : dieselLevel > 20
                        ? "yellow.400"
                        : "red.400"
                  } // Use state value for color
                  size="140px"
                  thickness="8px"
                >
                  <CircularProgressLabel fontSize="lg" fontWeight="bold">
                    {dieselLevel}%
                  </CircularProgressLabel>{" "}
                  {/* Use state value */}
                </CircularProgress>
                <Text mt={2} fontWeight="medium" fontSize="sm">
                  Diesel
                </Text>
              </Box>
            </SimpleGrid>
          </Box>
        </GridItem>
      </Grid>
    </Box>
  );
};

export default SODashboard;
