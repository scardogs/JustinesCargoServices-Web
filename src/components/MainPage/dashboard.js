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
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  useDisclosure,
  Select,
  Input,
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

const DashboardPage = () => {
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
  const [notBilledWaybillsCount, setNotBilledWaybillsCount] = useState(0); // State for Not Billed Waybills
  const currentDate = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }); // Format the date
  const toast = useToast();
  const {
    isOpen: isSessionExpiredModalOpen,
    onOpen: onSessionExpiredModalOpen,
    onClose: onSessionExpiredModalClose,
  } = useDisclosure();
  const [isCapacityModalOpen, setIsCapacityModalOpen] = useState(false);
  const [warehouses, setWarehouses] = useState([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState("");
  const [capacityValue, setCapacityValue] = useState("");
  const [isSubmittingCapacity, setIsSubmittingCapacity] = useState(false);
  const [warehouseCapacity, setWarehouseCapacity] = useState(null);
  const [warehouseName, setWarehouseName] = useState("");
  const [gasStock, setGasStock] = useState(0);
  const [dieselStock, setDieselStock] = useState(0);
  const [userWorkLevel, setUserWorkLevel] = useState("");

  // Function to handle session expiration
  const handleSessionExpired = () => {
    onSessionExpiredModalOpen();
  };

  // Function to handle sign out
  const handleSignOut = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/";
  };

  // Fetch warehouses for dropdown and set default selected warehouse
  useEffect(() => {
    const fetchWarehouses = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(
          process.env.NEXT_PUBLIC_BACKEND_API + "/api/warehouses?limit=1000",
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const ws = res.data.warehouses || [];
        setWarehouses(ws);
        if (ws.length > 0 && !selectedWarehouse) {
          setSelectedWarehouse(ws[0]._id);
        }
      } catch (err) {
        setWarehouses([]);
      }
    };
    fetchWarehouses();
    // eslint-disable-next-line
  }, []);

  // Fetch maximum capacity and update warehouse name when selectedWarehouse changes
  useEffect(() => {
    const fetchCapacity = async () => {
      if (!selectedWarehouse) return;
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(
          process.env.NEXT_PUBLIC_BACKEND_API + `/api/maximum-capacity/warehouse/${selectedWarehouse}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setWarehouseCapacity(res.data.maximumCapacity);
        setWarehouseName(res.data.warehouse?.name || "");
      } catch (err) {
        setWarehouseCapacity(null);
        setWarehouseName("");
      }
    };
    fetchCapacity();
  }, [selectedWarehouse]);

  // Fetch items and calculate stocks for selected warehouse
  useEffect(() => {
    const fetchItems = async () => {
      try {
        const token = localStorage.getItem("token");
        const itemsResponse = await axios.get(
          process.env.NEXT_PUBLIC_BACKEND_API + "/api/items",
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const allItems = itemsResponse.data || [];
        let gas = 0;
        let diesel = 0;
        allItems.forEach((item) => {
          if (item.warehouseID === selectedWarehouse || item.warehouseID?._id === selectedWarehouse) {
            const itemName = item.itemName?.toLowerCase();
            if (itemName === "gas") gas += item.stockBalance || 0;
            if (itemName === "diesel") diesel += item.stockBalance || 0;
          }
        });
        setGasStock(gas);
        setDieselStock(diesel);
      } catch (err) {
        setGasStock(0);
        setDieselStock(0);
      }
    };
    if (selectedWarehouse) fetchItems();
  }, [selectedWarehouse]);

  // Calculate percentages
  const gasPercent = warehouseCapacity ? Math.round((gasStock / warehouseCapacity) * 100) : 0;
  const dieselPercent = warehouseCapacity ? Math.round((dieselStock / warehouseCapacity) * 100) : 0;

  const handleOpenCapacityModal = () => setIsCapacityModalOpen(true);
  const handleCloseCapacityModal = () => {
    setIsCapacityModalOpen(false);
    setSelectedWarehouse("");
    setCapacityValue("");
  };

  const handleSubmitCapacity = async () => {
    if (!selectedWarehouse || !capacityValue) {
      toast({ title: "Please select a warehouse and enter a capacity.", status: "warning" });
      return;
    }
    setIsSubmittingCapacity(true);
    try {
      const token = localStorage.getItem("token");
      // Check if capacity exists for this warehouse
      let existingId = null;
      try {
        const res = await axios.get(
          process.env.NEXT_PUBLIC_BACKEND_API + `/api/maximum-capacity/warehouse/${selectedWarehouse}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.data && res.data._id) {
          existingId = res.data._id;
        }
      } catch (err) {
        // Not found is OK, means we will create
      }
      if (existingId) {
        // Update existing
        await axios.put(
          process.env.NEXT_PUBLIC_BACKEND_API + `/api/maximum-capacity/${existingId}`,
          { maximumCapacity: Number(capacityValue) },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast({ title: "Capacity updated successfully!", status: "success" });
      } else {
        // Create new
        await axios.post(
          process.env.NEXT_PUBLIC_BACKEND_API + "/api/maximum-capacity",
          { warehouse: selectedWarehouse, maximumCapacity: Number(capacityValue) },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast({ title: "Capacity set successfully!", status: "success" });
      }
      handleCloseCapacityModal();
      window.location.reload();
    } catch (err) {
      toast({ title: "Failed to set capacity.", status: "error" });
    } finally {
      setIsSubmittingCapacity(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          handleSessionExpired();
          return;
        }

        // Setup axios interceptor for 401 errors
        const interceptor = axios.interceptors.response.use(
          (response) => response,
          (error) => {
            if (error.response && error.response.status === 401) {
              handleSessionExpired();
            }
            return Promise.reject(error);
          }
        );

        // Fetch total employees
        const employeesResponse = await axios.get(
          process.env.NEXT_PUBLIC_BACKEND_API + "/api/employees/personal",
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        const activeEmployees = employeesResponse.data.filter(
          (emp) => !emp.dismissalDate
        );
        setTotalEmployees(activeEmployees.length);

        // Fetch trips
        const tripsResponse = await axios.get(
          process.env.NEXT_PUBLIC_BACKEND_API + "/api/trips",
          {
            headers: { Authorization: `Bearer ${token}` }
          }
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
          process.env.NEXT_PUBLIC_BACKEND_API + "/api/items",
          {
            headers: { Authorization: `Bearer ${token}` }
          }
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
          const itemName = item.itemName?.toLowerCase();
          if (itemName === "gas") {
            currentGasStock += item.stockBalance || 0;
          }
          if (itemName === "diesel") {
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

        // Fetch count of not billed waybills
        const notBilledResponse = await axios.get(
          process.env.NEXT_PUBLIC_BACKEND_API +
            "/api/waybillSummary/count/not-billed",
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        setNotBilledWaybillsCount(notBilledResponse.data.count);

        // Cleanup interceptor
        axios.interceptors.response.eject(interceptor);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        if (error.response && error.response.status === 401) {
          handleSessionExpired();
        } else {
          toast({
            title: "Error",
            description: "Failed to fetch dashboard data. Please try again.",
            status: "error",
            duration: 5000,
            isClosable: true,
          });
        }
        // Set default/empty values on error
        setTotalEmployees(0);
        setActiveDeliveries(0);
        setRecentActivities([]);
        setLowStockItems([]);
        setAdditionalLowStockCount(0);
        setGasLevel(0);
        setDieselLevel(0);
        setNotBilledWaybillsCount(0);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [toast]);

  // Fetch user workLevel from localStorage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        setUserWorkLevel(parsed.workLevel || "");
      } catch (e) {
        setUserWorkLevel("");
      }
    }
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
          title="Not Billed Waybills"
          value={loading ? "..." : notBilledWaybillsCount}
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
            position="relative"
          >
            <Flex justify="space-between" align="center" mb={1}>
              <Heading size="sm" color="black">
                Fuel Monitoring
              </Heading>
              {['System Admin', 'Admin'].includes(userWorkLevel) && (
                <Button size="xs" colorScheme="blue" onClick={handleOpenCapacityModal}>
                  Set Capacity
                </Button>
              )}
            </Flex>
            <Text fontSize="xs" color="gray.500" mb={3}>
              As of {currentDate}
            </Text>
            <SimpleGrid columns={2} spacing={4} textAlign="center" mt={6}>
              <Box>
                <CircularProgress
                  value={gasPercent}
                  color={
                    gasPercent > 60
                      ? "green.400"
                      : gasPercent > 20
                      ? "yellow.400"
                      : "red.400"
                  }
                  size="140px"
                  thickness="8px"
                >
                  <CircularProgressLabel fontSize="lg" fontWeight="bold">
                    {gasPercent}%
                  </CircularProgressLabel>
                </CircularProgress>
                <Text mt={2} fontWeight="medium" fontSize="sm">
                  Gas
                </Text>
              </Box>
              <Box>
                <CircularProgress
                  value={dieselPercent}
                  color={
                    dieselPercent > 60
                      ? "green.400"
                      : dieselPercent > 20
                      ? "yellow.400"
                      : "red.400"
                  }
                  size="140px"
                  thickness="8px"
                >
                  <CircularProgressLabel fontSize="lg" fontWeight="bold">
                    {dieselPercent}%
                  </CircularProgressLabel>
                </CircularProgress>
                <Text mt={2} fontWeight="medium" fontSize="sm">
                  Diesel
                </Text>
              </Box>
            </SimpleGrid>
            {/* Warehouse and Capacity info at bottom left */}
            <Box position="absolute" bottom={3} left={4} textAlign="left">
              <Text fontSize="xs" color="gray.600">
                Warehouse: <b>{warehouseName || "N/A"}</b>
              </Text>
              <Text fontSize="xs" color="gray.600">
                Capacity: <b>{warehouseCapacity !== null ? warehouseCapacity : "N/A"}</b>
              </Text>
            </Box>
          </Box>
        </GridItem>
      </Grid>

      {/* Set Capacity Modal */}
      <Modal isOpen={isCapacityModalOpen} onClose={handleCloseCapacityModal} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Set Maximum Capacity</ModalHeader>
          <ModalBody>
            <Box mb={4}>
              <Text mb={1}>Warehouse</Text>
              <Select
                placeholder="Select warehouse"
                value={selectedWarehouse}
                onChange={e => setSelectedWarehouse(e.target.value)}
              >
                {warehouses.map(w => (
                  <option key={w._id} value={w._id}>{w.name}</option>
                ))}
              </Select>
            </Box>
            <Box mb={2}>
              <Text mb={1}>Maximum Capacity</Text>
              <Input
                type="number"
                min={0}
                value={capacityValue}
                onChange={e => setCapacityValue(e.target.value)}
                placeholder="Enter capacity"
              />
            </Box>
          </ModalBody>
          <ModalFooter>
            <Button onClick={handleCloseCapacityModal} mr={3} variant="ghost">
              Cancel
            </Button>
            <Button
              colorScheme="blue"
              onClick={handleSubmitCapacity}
              isLoading={isSubmittingCapacity}
            >
              Save
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Session Expired Modal */}
      <Modal
        isOpen={isSessionExpiredModalOpen}
        onClose={() => {
          /* Prevent closing */
        }}
        isCentered
        closeOnOverlayClick={false}
        closeOnEsc={false}
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Session Expired</ModalHeader>
          <ModalBody>
            Your session has expired. Please log in again to continue.
          </ModalBody>
          <ModalFooter>
            <Button
              colorScheme="red"
              onClick={handleSignOut}
            >
              Log Out
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default DashboardPage;
