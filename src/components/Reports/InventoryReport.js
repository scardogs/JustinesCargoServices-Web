import React, { useState, useEffect } from "react";
import {
  Box,
  Flex,
  Grid,
  Heading,
  Text,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Spinner,
  Alert,
  AlertIcon,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Tag,
  Button,
  InputGroup,
  InputLeftElement,
  Input,
  HStack,
  VStack,
  Select,
  Skeleton,
  IconButton,
  useToast,
  Badge,
} from "@chakra-ui/react";
import {
  Search2Icon,
  DownloadIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@chakra-ui/icons";
import axios from "axios";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Black_And_White_Picture } from "next/font/google";

// Helper to format currency
const formatCurrency = (amount, forPDF = false) => {
  if (!amount && amount !== 0) return "-";
  return new Intl.NumberFormat("en-PH", {
    style: "decimal",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...(forPDF ? {} : { style: "currency", currency: "PHP" }),
  }).format(amount);
};

const InventoryReport = () => {
  // State for Transactions
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterType, setFilterType] = useState("all"); // 'all', 'in', 'out'

  // State for Purchases
  const [purchases, setPurchases] = useState([]);
  const [purchaseLoading, setPurchaseLoading] = useState(true);
  const [purchaseError, setPurchaseError] = useState(null);

  // State for Items
  const [items, setItems] = useState([]);
  const [itemsLoading, setItemsLoading] = useState(true);
  const [itemsError, setItemsError] = useState(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [activeTab, setActiveTab] = useState(0);

  // Stats
  const [stats, setStats] = useState({
    inventory: {
      totalTransactions: 0,
      stockIn: 0,
      stockOut: 0,
      lastUpdate: null,
    },
    purchases: {
      total: 0,
      pending: 0,
      received: 0,
      cancelled: 0,
      totalValue: 0,
    },
    items: {
      total: 0,
      totalValue: 0,
    },
  });

  const toast = useToast();

  // Fetch Transactions
  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_BACKEND_API}/api/stock-movements`
        );

        const data = response.data;
        setTransactions(data);

        // Calculate stats
        const stockInCount = data.filter(
          (item) => item.type === "Stock In"
        ).length;
        const stockOutCount = data.filter(
          (item) => item.type === "Stock Out"
        ).length;
        const lastUpdate = data.length > 0 ? new Date(data[0].dateTime) : null;

        setStats((prev) => ({
          ...prev,
          inventory: {
            totalTransactions: data.length,
            stockIn: stockInCount,
            stockOut: stockOutCount,
            lastUpdate,
          },
        }));
      } catch (err) {
        console.error("Error fetching inventory transactions:", err);
        setError(
          err.response?.data?.message ||
            "Failed to fetch inventory transactions. Please try again later."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, []);

  // Fetch Purchases
  useEffect(() => {
    const fetchPurchases = async () => {
      try {
        setPurchaseLoading(true);
        setPurchaseError(null);
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_BACKEND_API}/api/purchases`
        );

        const data = response.data;
        setPurchases(data);

        // Calculate stats
        const pending = data.filter((item) => item.status === "Pending").length;
        const received = data.filter(
          (item) => item.status === "Received"
        ).length;
        const cancelled = data.filter(
          (item) => item.status === "Cancelled"
        ).length;
        const totalValue = data.reduce(
          (sum, item) => sum + (item.totalAmount || 0),
          0
        );

        setStats((prev) => ({
          ...prev,
          purchases: {
            total: data.length,
            pending,
            received,
            cancelled,
            totalValue,
          },
        }));
      } catch (err) {
        console.error("Error fetching purchases:", err);
        setPurchaseError(
          err.response?.data?.message ||
            "Failed to fetch purchases. Please try again later."
        );
      } finally {
        setPurchaseLoading(false);
      }
    };

    fetchPurchases();
  }, []);

  // Fetch Items
  useEffect(() => {
    const fetchItems = async () => {
      try {
        setItemsLoading(true);
        setItemsError(null);
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_BACKEND_API}/api/items`
        );

        const data = response.data;
        setItems(data);

        // Calculate stats
        const totalItems = data.length;
        const totalValue = data.reduce(
          (sum, item) => sum + (item.costPerUnit * item.stockBalance || 0),
          0
        );

        setStats((prev) => ({
          ...prev,
          items: {
            total: totalItems,
            totalValue: totalValue,
          },
        }));
      } catch (err) {
        console.error("Error fetching items:", err);
        setItemsError(
          err.response?.data?.message ||
            "Failed to fetch items. Please try again later."
        );
      } finally {
        setItemsLoading(false);
      }
    };

    fetchItems();
  }, []);

  // Function to format dates
  const formatDate = (dateString) => {
    if (!dateString) return "-";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch (error) {
      console.error("Error formatting date:", error);
      return "-";
    }
  };

  // Function to get status color for Purchase Tag
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "received":
        return "#1a365d"; // Blue
      case "pending":
        return "#800020"; // Maroon
      case "cancelled":
        return "#800020"; // Maroon
      default:
        return "gray";
    }
  };

  // Function to get transaction type color
  const getTypeColor = (type) => {
    switch (type) {
      case "Stock In":
        return "#1a365d"; // Blue
      case "Stock Out":
        return "#800020"; // Maroon
      default:
        return "gray";
    }
  };

  // Generate PDF report
  const generateReport = () => {
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Title and header
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageWidth, 35, "F");
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0); // #1a365d
    doc.text("JUSTINE'S CARGO SERVICES", 15, 15);
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0); // #800020
    doc.text(
      `INVENTORY ${activeTab === 0 ? "TRANSACTIONS" : activeTab === 1 ? "PURCHASE ORDERS" : "ITEMS"} REPORT`,
      pageWidth - 15,
      15,
      {
        align: "right",
      }
    );

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    doc.text("Mario C. Segovia - Prop", 15, 22);
    doc.text("Brgy. Paklad, Oton, Iloilo", 15, 27);

    const today = new Date();
    const dateStr = today.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    doc.text(`Generated on: ${dateStr}`, pageWidth - 15, 27, {
      align: "right",
    });

    // Table data
    let columns = [];
    let rows = [];

    if (activeTab === 0) {
      // Transactions tab
      columns = [
        { header: "Date", dataKey: "date" },
        { header: "Type", dataKey: "type" },
        { header: "ID", dataKey: "id" },
        { header: "Item", dataKey: "item" },
        { header: "Warehouse", dataKey: "warehouse" },
        { header: "Quantity", dataKey: "quantity" },
        { header: "Remarks", dataKey: "remarks" },
      ];

      rows = filteredTransactions.map((t) => ({
        date: formatDate(t.dateTime),
        type: t.type,
        id: t.transactionId,
        item: t.itemName,
        warehouse: t.warehouseName,
        quantity: t.quantity.toString(),
        remarks: t.remarks || "-",
      }));
    } else if (activeTab === 1) {
      // Purchases tab
      columns = [
        { header: "Purchase ID", dataKey: "id" },
        { header: "Order Date", dataKey: "date" },
        { header: "Item", dataKey: "item" },
        { header: "Warehouse", dataKey: "warehouse" },
        { header: "Qty", dataKey: "quantity" },
        { header: "Unit Price", dataKey: "unitPrice" },
        { header: "Total", dataKey: "total" },
        { header: "Status", dataKey: "status" },
      ];

      rows = filteredPurchases.map((p) => ({
        id: p.purchaseID,
        date: formatDate(p.orderDate),
        item: p.itemName,
        warehouse: p.warehouseName,
        quantity: p.quantity.toString(),
        unitPrice: formatCurrency(p.unitPrice, true),
        total: formatCurrency(p.totalAmount, true),
        status: p.status,
      }));
    } else {
      // Items tab
      columns = [
        { header: "Item ID", dataKey: "id" },
        { header: "Item Name", dataKey: "name" },
        { header: "Category", dataKey: "category" },
        { header: "Warehouse", dataKey: "warehouse" },
        { header: "Stock Balance", dataKey: "stock" },
        { header: "Cost Per Unit", dataKey: "cost" },
        { header: "Total Value", dataKey: "value" },
        { header: "Measurement", dataKey: "measurement" },
      ];

      rows = items.map((item) => ({
        id: item.itemID,
        name: item.itemName,
        category: item.categoryID?.categoryName || "-",
        warehouse: item.warehouseID?.name || "-",
        stock: item.stockBalance.toString(),
        cost: formatCurrency(item.costPerUnit, true),
        value: formatCurrency(item.costPerUnit * item.stockBalance, true),
        measurement: item.measurement || "-",
      }));
    }

    // Generate table
    autoTable(doc, {
      columns: columns,
      body: rows,
      startY: 35,
      theme: "plain",
      headStyles: {
        fillColor: false,
        textColor: [0, 0, 0],
        fontStyle: "bold",
        lineWidth: 0.1,
        lineColor: [0, 0, 0],
      },
      bodyStyles: {
        lineWidth: 0.1,
        lineColor: [0, 0, 0],
      },
      alternateRowStyles: {
        fillColor: false,
      },
      styles: {
        textColor: [0, 0, 0],
        cellPadding: 3,
      },
      margin: { top: 40 },
      didDrawPage: (data) => {
        // Footer with page number
        doc.setFontSize(8);
        doc.setTextColor(0, 0, 0);
        doc.text(
          `Page ${data.pageNumber} of ${doc.internal.getNumberOfPages()}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: "center" }
        );
      },
    });

    // Save the PDF
    const formattedDate = today.toISOString().split("T")[0];
    doc.save(
      `JCS-Inventory-${
        activeTab === 0
          ? "Transactions"
          : activeTab === 1
            ? "Purchases"
            : "Items"
      }-Report-${formattedDate}.pdf`
    );

    toast({
      title: "Report Generated",
      description: `PDF report has been generated.`,
      status: "success",
      duration: 3000,
      isClosable: true,
    });
  };

  // Filter transactions
  const filteredTransactions = React.useMemo(() => {
    if (filterType === "all") return transactions;

    return transactions.filter(
      (t) => t.type === (filterType === "in" ? "Stock In" : "Stock Out")
    );
  }, [transactions, filterType]);

  const filteredPurchases = purchases;

  // Calculate pagination
  const getTotalPages = (dataArray) => {
    return Math.ceil(dataArray.length / itemsPerPage) || 1;
  };

  const getPaginatedData = (dataArray) => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return dataArray.slice(startIndex, endIndex);
  };

  // Get current data based on active tab
  const currentData =
    activeTab === 0
      ? getPaginatedData(filteredTransactions)
      : activeTab === 1
        ? getPaginatedData(filteredPurchases)
        : getPaginatedData(items);

  const totalPages =
    activeTab === 0
      ? getTotalPages(filteredTransactions)
      : activeTab === 1
        ? getTotalPages(filteredPurchases)
        : getTotalPages(items);

  const totalItems =
    activeTab === 0
      ? filteredTransactions.length
      : activeTab === 1
        ? filteredPurchases.length
        : items.length;

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);

  return (
    <Box>
      <Box
        mb={8}
        py={4}
        px={6}
        borderRadius="md"
        borderBottom="1px solid"
        borderColor="gray.200"
      >
        <Flex justify="space-between" align="center" mb={6}>
          <VStack align="start" spacing={1}>
            <Heading size="lg" color="#1a365d" fontWeight="bold">
              Inventory Reports
            </Heading>
            <Text color="gray.500">
              Track inventory movement and purchase orders
            </Text>
          </VStack>

          <Button
            leftIcon={<DownloadIcon />}
            bg="#800020"
            color="white"
            _hover={{ bg: "#600010" }}
            size="sm"
            onClick={generateReport}
          >
            Export Report
          </Button>
        </Flex>

        <Grid templateColumns={{ base: "1fr", md: "repeat(4, 1fr)" }} gap={4}>
          <Box
            bg="white"
            p={4}
            rounded="lg"
            shadow="sm"
            borderWidth="1px"
            borderColor="#1a365d"
            borderLeftWidth="4px"
          >
            <Text color="gray.500" fontSize="sm" mb={1} fontWeight="bold">
              Total Transactions
            </Text>
            <Flex align="center" justify="space-between">
              <Text fontSize="xl" fontWeight="bold" color="#1a365d">
                {loading ? (
                  <Skeleton height="20px" width="30px" />
                ) : (
                  stats.inventory.totalTransactions
                )}
              </Text>
              {!loading && stats.inventory.lastUpdate && (
                <Text fontSize="xs" color="gray.500">
                  Last: {formatDate(stats.inventory.lastUpdate)}
                </Text>
              )}
            </Flex>
          </Box>

          <Box
            bg="white"
            p={4}
            rounded="lg"
            shadow="sm"
            borderWidth="1px"
            borderColor="#1a365d"
            borderLeftWidth="4px"
          >
            <Text color="gray.500" fontSize="sm" mb={1} fontWeight="bold">
              Stock In
            </Text>
            <Text fontSize="xl" fontWeight="bold" color="#1a365d">
              {loading ? (
                <Skeleton height="20px" width="30px" />
              ) : (
                stats.inventory.stockIn
              )}
            </Text>
          </Box>

          <Box
            bg="white"
            p={4}
            rounded="lg"
            shadow="sm"
            borderWidth="1px"
            borderColor="#800020"
            borderLeftWidth="4px"
          >
            <Text color="gray.500" fontSize="sm" mb={1} fontWeight="bold">
              Stock Out
            </Text>
            <Text fontSize="xl" fontWeight="bold" color="#800020">
              {loading ? (
                <Skeleton height="20px" width="30px" />
              ) : (
                stats.inventory.stockOut
              )}
            </Text>
          </Box>

          <Box
            bg="white"
            p={4}
            rounded="lg"
            shadow="sm"
            borderWidth="1px"
            borderColor="#800020"
            borderLeftWidth="4px"
          >
            <Text color="gray.500" fontSize="sm" mb={1} fontWeight="bold">
              Purchase Orders
            </Text>
            <HStack spacing={2} align="baseline">
              <Text fontSize="xl" fontWeight="bold" color="#800020">
                {purchaseLoading ? (
                  <Skeleton height="20px" width="30px" />
                ) : (
                  stats.purchases.total
                )}
              </Text>
              <Text fontSize="sm" color="gray.500">
                {purchaseLoading ? (
                  <Skeleton height="10px" width="60px" />
                ) : (
                  formatCurrency(stats.purchases.totalValue)
                )}
              </Text>
            </HStack>
          </Box>

          <Box
            bg="white"
            p={4}
            rounded="lg"
            shadow="sm"
            borderWidth="1px"
            borderColor="#1a365d"
            borderLeftWidth="4px"
          >
            <Text color="gray.500" fontSize="sm" mb={1} fontWeight="bold">
              Items in Inventory
            </Text>
            <HStack spacing={2} align="baseline">
              <Text fontSize="xl" fontWeight="bold" color="#1a365d">
                {itemsLoading ? (
                  <Skeleton height="20px" width="30px" />
                ) : (
                  stats.items.total
                )}
              </Text>
              <Text fontSize="sm" color="gray.500">
                {itemsLoading ? (
                  <Skeleton height="10px" width="60px" />
                ) : (
                  formatCurrency(stats.items.totalValue)
                )}
              </Text>
            </HStack>
          </Box>
        </Grid>

        {activeTab === 1 && !purchaseLoading && (
          <Grid
            templateColumns={{ base: "1fr", md: "repeat(3, 1fr)" }}
            gap={4}
            mt={4}
          >
            <Box
              bg="white"
              p={3}
              rounded="lg"
              shadow="sm"
              borderWidth="1px"
              borderColor="#800020"
              borderLeftWidth="4px"
            >
              <Text color="gray.500" fontSize="xs" mb={1} fontWeight="bold">
                Pending Orders
              </Text>
              <Text fontSize="lg" fontWeight="bold" color="#800020">
                {stats.purchases.pending}
              </Text>
            </Box>

            <Box
              bg="white"
              p={3}
              rounded="lg"
              shadow="sm"
              borderWidth="1px"
              borderColor="#1a365d"
              borderLeftWidth="4px"
            >
              <Text color="gray.500" fontSize="xs" mb={1} fontWeight="bold">
                Received Orders
              </Text>
              <Text fontSize="lg" fontWeight="bold" color="#1a365d">
                {stats.purchases.received}
              </Text>
            </Box>

            <Box
              bg="white"
              p={3}
              rounded="lg"
              shadow="sm"
              borderWidth="1px"
              borderColor="#800020"
              borderLeftWidth="4px"
            >
              <Text color="gray.500" fontSize="xs" mb={1} fontWeight="bold">
                Cancelled Orders
              </Text>
              <Text fontSize="lg" fontWeight="bold" color="#800020">
                {stats.purchases.cancelled}
              </Text>
            </Box>
          </Grid>
        )}
      </Box>

      <Flex justify="flex-start" px={6} mt={-4} mb={4}>
        {activeTab === 0 && (
          <HStack spacing={4}>
            <Select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              size="md"
              width="150px"
              bg="white"
              borderColor="gray.300"
              _hover={{ borderColor: "#1a365d" }}
              _focus={{
                borderColor: "#1a365d",
                boxShadow: "0 0 0 1px #1a365d",
              }}
            >
              <option value="all">All Types</option>
              <option value="in">Stock In</option>
              <option value="out">Stock Out</option>
            </Select>
          </HStack>
        )}
      </Flex>

      <Box
        bg="white"
        rounded="lg"
        shadow="md"
        borderWidth="1px"
        maxH="650px"
        display="flex"
        flexDirection="column"
        mx={6}
      >
        <Tabs
          variant="enclosed"
          onChange={(index) => {
            setActiveTab(index);
            setCurrentPage(1);
          }}
          isLazy
        >
          <TabList borderBottomWidth="1px" borderColor="gray.200">
            <Tab
              _selected={{
                color: "white",
                bg: "#1a365d",
                borderColor: "#1a365d",
              }}
              _hover={{ bg: "gray.100" }}
              borderBottomWidth="1px"
              borderColor="gray.200"
              mr={1}
            >
              Stock Transactions
            </Tab>
            <Tab
              _selected={{
                color: "white",
                bg: "#800020",
                borderColor: "#800020",
              }}
              _hover={{ bg: "gray.100" }}
              borderBottomWidth="1px"
              borderColor="gray.200"
              mr={1}
            >
              Purchase Orders
            </Tab>
            <Tab
              _selected={{
                color: "white",
                bg: "#1a365d",
                borderColor: "#1a365d",
              }}
              _hover={{ bg: "gray.100" }}
              borderBottomWidth="1px"
              borderColor="gray.200"
              mr={1}
            >
              Items
            </Tab>
          </TabList>

          <TabPanels flex="1" overflowY="auto">
            <TabPanel p={0}>
              {/* Transactions Tab Content */}
              {loading ? (
                <Flex justify="center" align="center" h="200px">
                  <Spinner size="xl" color="#1a365d" />
                </Flex>
              ) : error ? (
                <Alert status="error" my={4}>
                  <AlertIcon />
                  {error}
                </Alert>
              ) : (
                <TableContainer>
                  <Table variant="simple" size="sm">
                    <Thead position="sticky" top={0} zIndex={1} boxShadow="sm">
                      <Tr>
                        <Th fontWeight="semibold" color="black" py={4}>
                          Date
                        </Th>
                        <Th fontWeight="semibold" color="black" py={4}>
                          Type
                        </Th>
                        <Th fontWeight="semibold" color="black" py={4}>
                          Transaction ID
                        </Th>
                        <Th fontWeight="semibold" color="black" py={4}>
                          Item Name
                        </Th>
                        <Th fontWeight="semibold" color="black" py={4}>
                          Warehouse
                        </Th>
                        <Th
                          fontWeight="semibold"
                          color="black"
                          py={4}
                          isNumeric
                        >
                          Quantity
                        </Th>
                        <Th fontWeight="semibold" color="black" py={4}>
                          Remarks
                        </Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {currentData.length === 0 ? (
                        <Tr>
                          <Td colSpan={7} textAlign="center" py={8}>
                            <Text color="black">
                              No transactions found matching your criteria
                            </Text>
                          </Td>
                        </Tr>
                      ) : (
                        currentData.map((row) => (
                          <Tr
                            key={row._id}
                            _hover={{ bg: "gray.50" }}
                            transition="all 0.2s"
                          >
                            <Td>{formatDate(row.dateTime)}</Td>
                            <Td>
                              <Badge
                                bg="transparent"
                                color={
                                  row.type === "Stock In"
                                    ? "#1a365d"
                                    : "#800020"
                                }
                                border={`1px solid ${row.type === "Stock In" ? "#1a365d" : "#800020"}`}
                                px={2}
                                py={1}
                                borderRadius="md"
                              >
                                {row.type}
                              </Badge>
                            </Td>
                            <Td>
                              <Text fontWeight="medium" color="#1a365d">
                                {row.transactionId}
                              </Text>
                            </Td>
                            <Td>{row.itemName}</Td>
                            <Td>{row.warehouseName}</Td>
                            <Td isNumeric fontWeight="medium" color="black">
                              {row.type === "Stock In" ? "+" : "-"}
                              {row.quantity}
                            </Td>
                            <Td>{row.remarks || "-"}</Td>
                          </Tr>
                        ))
                      )}
                    </Tbody>
                  </Table>
                </TableContainer>
              )}
            </TabPanel>

            <TabPanel p={0}>
              {/* Purchases Tab Content */}
              {purchaseLoading ? (
                <Flex justify="center" align="center" h="200px">
                  <Spinner size="xl" color="#800020" />
                </Flex>
              ) : purchaseError ? (
                <Alert status="error" my={4}>
                  <AlertIcon />
                  {purchaseError}
                </Alert>
              ) : (
                <TableContainer>
                  <Table variant="simple" size="sm">
                    <Thead
                      bg="gray.50"
                      position="sticky"
                      top={0}
                      zIndex={1}
                      boxShadow="sm"
                    >
                      <Tr>
                        <Th fontWeight="semibold" color="gray.700" py={4}>
                          Purchase ID
                        </Th>
                        <Th fontWeight="semibold" color="gray.700" py={4}>
                          Order Date
                        </Th>
                        <Th fontWeight="semibold" color="gray.700" py={4}>
                          Item Name
                        </Th>
                        <Th fontWeight="semibold" color="gray.700" py={4}>
                          Warehouse
                        </Th>
                        <Th
                          fontWeight="semibold"
                          color="gray.700"
                          py={4}
                          isNumeric
                        >
                          Quantity
                        </Th>
                        <Th
                          fontWeight="semibold"
                          color="gray.700"
                          py={4}
                          isNumeric
                        >
                          Unit Price
                        </Th>
                        <Th
                          fontWeight="semibold"
                          color="gray.700"
                          py={4}
                          isNumeric
                        >
                          Total Amount
                        </Th>
                        <Th fontWeight="semibold" color="gray.700" py={4}>
                          Status
                        </Th>
                        <Th fontWeight="semibold" color="gray.700" py={4}>
                          Received Date
                        </Th>
                        <Th fontWeight="semibold" color="gray.700" py={4}>
                          Remarks
                        </Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {currentData.length === 0 ? (
                        <Tr>
                          <Td colSpan={10} textAlign="center" py={8}>
                            <Text color="gray.500">
                              No purchase orders found matching your criteria
                            </Text>
                          </Td>
                        </Tr>
                      ) : (
                        currentData.map((p) => (
                          <Tr
                            key={p._id}
                            _hover={{ bg: "gray.50" }}
                            transition="all 0.2s"
                          >
                            <Td>
                              <Text fontWeight="medium" color="#800020">
                                {p.purchaseID}
                              </Text>
                            </Td>
                            <Td>{formatDate(p.orderDate)}</Td>
                            <Td>{p.itemName}</Td>
                            <Td>{p.warehouseName}</Td>
                            <Td isNumeric>{p.quantity}</Td>
                            <Td isNumeric>
                              {formatCurrency(p.unitPrice, true)}
                            </Td>
                            <Td isNumeric fontWeight="semibold">
                              {formatCurrency(p.totalAmount, true)}
                            </Td>
                            <Td>
                              <Badge
                                bg={getStatusColor(p.status)}
                                color="white"
                                px={2}
                                py={1}
                                borderRadius="md"
                              >
                                {p.status}
                              </Badge>
                            </Td>
                            <Td>
                              {p.dateReceived
                                ? formatDate(p.dateReceived)
                                : "-"}
                            </Td>
                            <Td>{p.remarks || "-"}</Td>
                          </Tr>
                        ))
                      )}
                    </Tbody>
                  </Table>
                </TableContainer>
              )}
            </TabPanel>

            <TabPanel p={0}>
              {/* Items Tab Content */}
              {itemsLoading ? (
                <Flex justify="center" align="center" h="200px">
                  <Spinner size="xl" color="#1a365d" />
                </Flex>
              ) : itemsError ? (
                <Alert status="error" my={4}>
                  <AlertIcon />
                  {itemsError}
                </Alert>
              ) : (
                <TableContainer>
                  <Table variant="simple" size="sm">
                    <Thead position="sticky" top={0} zIndex={1} boxShadow="sm">
                      <Tr>
                        <Th fontWeight="semibold" color="gray.700" py={4}>
                          Item ID
                        </Th>
                        <Th fontWeight="semibold" color="gray.700" py={4}>
                          Item Name
                        </Th>
                        <Th fontWeight="semibold" color="gray.700" py={4}>
                          Category
                        </Th>
                        <Th fontWeight="semibold" color="gray.700" py={4}>
                          Warehouse
                        </Th>
                        <Th
                          fontWeight="semibold"
                          color="gray.700"
                          py={4}
                          isNumeric
                        >
                          Stock Balance
                        </Th>
                        <Th
                          fontWeight="semibold"
                          color="gray.700"
                          py={4}
                          isNumeric
                        >
                          Cost Per Unit
                        </Th>
                        <Th
                          fontWeight="semibold"
                          color="gray.700"
                          py={4}
                          isNumeric
                        >
                          Total Value
                        </Th>
                        <Th fontWeight="semibold" color="black" py={4}>
                          Measurement
                        </Th>
                        <Th fontWeight="semibold" color="black" py={4}>
                          Description
                        </Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {currentData.length === 0 ? (
                        <Tr>
                          <Td colSpan={9} textAlign="center" py={8}>
                            <Text color="black">
                              No items found in inventory
                            </Text>
                          </Td>
                        </Tr>
                      ) : (
                        currentData.map((item) => (
                          <Tr
                            key={item._id}
                            _hover={{ bg: "gray.50" }}
                            transition="all 0.2s"
                          >
                            <Td>
                              <Text fontWeight="medium" color="black">
                                {item.itemID}
                              </Text>
                            </Td>
                            <Td>{item.itemName}</Td>
                            <Td>{item.categoryID?.categoryName || "-"}</Td>
                            <Td>{item.warehouseID?.name || "-"}</Td>
                            <Td isNumeric fontWeight="medium" color="black">
                              {item.stockBalance}
                            </Td>
                            <Td isNumeric>
                              {formatCurrency(item.costPerUnit, false)}
                            </Td>
                            <Td isNumeric fontWeight="semibold">
                              {formatCurrency(
                                item.costPerUnit * item.stockBalance,
                                false
                              )}
                            </Td>
                            <Td>{item.measurement || "-"}</Td>
                            <Td>{item.description || "-"}</Td>
                          </Tr>
                        ))
                      )}
                    </Tbody>
                  </Table>
                </TableContainer>
              )}
            </TabPanel>
          </TabPanels>
        </Tabs>

        {/* Pagination Controls */}
        <Flex
          justify="space-between"
          align="center"
          mt={4}
          px={4}
          py={2}
          borderTopWidth="1px"
          borderColor="gray.200"
        >
          <HStack spacing={2}>
            <Text fontSize="sm" color="gray.600">
              Rows per page:
            </Text>
            <Select
              size="sm"
              w="75px"
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              bg="white"
              borderColor="gray.300"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </Select>
            <Text fontSize="sm" color="gray.600">
              Showing {totalItems === 0 ? 0 : startIndex + 1} to {endIndex} of{" "}
              {totalItems} entries
            </Text>
          </HStack>

          <HStack spacing={2}>
            <Button
              size="sm"
              variant="outline"
              colorScheme="gray"
              leftIcon={<ChevronLeftIcon />}
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              isDisabled={currentPage === 1 || totalPages === 0}
              _hover={{ bg: "#1a365d", color: "white" }}
            >
              Previous
            </Button>
            <Text fontSize="sm" color="gray.600">
              Page {currentPage} of {totalPages}
            </Text>
            <Button
              size="sm"
              variant="outline"
              colorScheme="gray"
              rightIcon={<ChevronRightIcon />}
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
              isDisabled={currentPage === totalPages || totalPages === 0}
              _hover={{ bg: "#1a365d", color: "white" }}
            >
              Next
            </Button>
          </HStack>
        </Flex>
      </Box>
    </Box>
  );
};

export default InventoryReport;
