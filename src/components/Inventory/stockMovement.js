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
  Select,
  useDisclosure,
  Text,
  Flex,
  InputGroup,
  InputLeftElement,
  Icon,
  Badge,
  Tooltip,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  SimpleGrid,
  Card,
  CardBody,
  Stat,
  StatLabel,
  StatNumber,
  Center,
  Circle,
} from "@chakra-ui/react";
import { AddIcon, EditIcon, DeleteIcon, SearchIcon } from "@chakra-ui/icons";
import { FiBox, FiHome, FiCalendar, FiFileText, FiActivity, FiArrowDown, FiArrowUp, FiPackage } from "react-icons/fi";
import axios from "axios";

const StockMovement = ({ movementType, items, setItems }) => {
  const [stockMovements, setStockMovements] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [formData, setFormData] = useState({
    itemID: "",
    warehouseID: "",
    quantity: "",
    remarks: ""
  });
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [warehouseFilter, setWarehouseFilter] = useState("");

  useEffect(() => {
    fetchStockMovements();
  }, [movementType]);

  useEffect(() => {
    fetchWarehouses();
  }, []);

  const fetchStockMovements = async () => {
    try {
      const typeFilter = movementType?.toLowerCase();
      let queryParam = "";
      if (typeFilter === 'in' || typeFilter === 'purchase in') {
        queryParam = "?type=in";
      } else if (typeFilter === 'out' || typeFilter === 'material request out') {
        queryParam = "?type=out";
      }

      const apiUrl = `${process.env.NEXT_PUBLIC_BACKEND_API}/api/stock-movements${queryParam}`;
      console.log('Fetching stock movements from:', apiUrl);
      
      const response = await axios.get(apiUrl);
      
      // Backend now populates itemID and warehouseID
      console.log('Raw Stock Movements Data:', response.data);
      setStockMovements(response.data || []); // Set directly, ensure it's an array
    } catch (error) {
      console.error("Error fetching stock movements:", error, "URL:", process.env.NEXT_PUBLIC_BACKEND_API + `/api/stock-movements`);
      toast({
        title: "Error",
        description: `Failed to fetch stock movement records: ${error.message}`,
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "top-right"
      });
    }
  };

  const fetchWarehouses = async () => {
    try {
      const response = await axios.get(process.env.NEXT_PUBLIC_BACKEND_API + "/api/warehouses");
      setWarehouses(response.data);
    } catch (error) {
      console.error("Error fetching warehouses:", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const quantity = Number(formData.quantity);
      if (isNaN(quantity) || quantity <= 0) {
        throw new Error('Quantity must be a positive number');
      }

      if (!formData.itemID) {
        throw new Error('Please select an item');
      }

      if (!formData.warehouseID) {
        throw new Error('Please select a warehouse');
      }

      // Find the selected item and warehouse to get their _id values
      const selectedItem = items.find(item => item.itemID === formData.itemID);
      const selectedWarehouse = warehouses.find(warehouse => warehouse.warehouseID === formData.warehouseID);

      if (!selectedItem || !selectedWarehouse) {
        throw new Error('Selected item or warehouse not found');
      }

      const payload = {
        itemID: selectedItem._id,
        warehouseID: selectedWarehouse._id,
        quantity: quantity,
        movementType: movementType, // Add movement type to payload
        remarks: formData.remarks
      };

      // Use the unified stock movements endpoint
      const response = await axios.post(
        process.env.NEXT_PUBLIC_BACKEND_API + '/api/stock-movements',
        payload,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      // Update the item's stock balance in the frontend state
      const updatedItems = items.map(item => {
        if (item.itemID === formData.itemID) {
          return {
            ...item,
            stockBalance: movementType === 'In' 
              ? item.stockBalance + quantity 
              : item.stockBalance - quantity
          };
        }
        return item;
      });
      setItems(updatedItems);

      // Refresh the stock movements after successful insertion
      await fetchStockMovements();
      
      onClose();
      setFormData({
        itemID: "",
        warehouseID: "",
        quantity: "",
        remarks: ""
      });
      
      toast({
        title: "Success",
        description: `Stock ${movementType.toLowerCase()} recorded successfully`,
        status: "success",
        duration: 3000,
        isClosable: true,
        position: "top-right"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error.response?.data?.message || error.message || `Failed to record stock movement`,
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "top-right"
      });
    }
  };

  return (
    <Box p={6}>
      <VStack spacing={6} align="stretch">
        <Flex justify="space-between" align="center" mb={2}>
          <Text fontSize="2xl" fontWeight="bold" color="#550000" fontFamily="Helvetica">
            Stock Movement Log
          </Text>
        </Flex>

        {/* Summary Statistics */}
        <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4} mb={6}>
          <Card shadow="md" border="1px solid" borderColor="gray.200">
            <CardBody p={4}>
              <Flex justify="space-between">
                <Stat>
                  <StatLabel color="gray.500" fontFamily="Helvetica">Total Movements</StatLabel>
                  <StatNumber fontSize="3xl" fontFamily="Helvetica">{stockMovements.length}</StatNumber>
                </Stat>
                <Center>
                  <Circle size="50px" bg="#550000" color="white">
                    <Icon as={FiActivity} boxSize={6} />
                  </Circle>
                </Center>
              </Flex>
            </CardBody>
          </Card>

          {/* Stock In Card (Visible only when type is 'in') */}
          {(movementType?.toLowerCase().includes('in')) && (
            <Card shadow="md" border="1px solid" borderColor="gray.200">
              <CardBody p={4}>
                <Flex justify="space-between">
                  <Stat>
                    <StatLabel color="gray.500" fontFamily="Helvetica">Stock In</StatLabel>
                    <StatNumber fontSize="3xl" fontFamily="Helvetica">
                      {
                        // Count should be same as total movements when filtered for 'in'
                        stockMovements.length 
                      }
                    </StatNumber>
                  </Stat>
                  <Center>
                    <Circle size="50px" bg="green.500" color="white">
                      <Icon as={FiArrowDown} boxSize={6} />
                    </Circle>
                  </Center>
                </Flex>
              </CardBody>
            </Card>
          )}

          {/* Stock Out Card (Visible only when type is 'out') */}
          {(movementType?.toLowerCase().includes('out')) && (
            <Card shadow="md" border="1px solid" borderColor="gray.200">
              <CardBody p={4}>
                <Flex justify="space-between">
                  <Stat>
                    <StatLabel color="gray.500" fontFamily="Helvetica">Stock Out</StatLabel>
                    <StatNumber fontSize="3xl" fontFamily="Helvetica">
                      {
                        // Count should be same as total movements when filtered for 'out'
                        stockMovements.length
                      }
                    </StatNumber>
                  </Stat>
                  <Center>
                    <Circle size="50px" bg="red.500" color="white">
                      <Icon as={FiArrowUp} boxSize={6} />
                    </Circle>
                  </Center>
                </Flex>
              </CardBody>
            </Card>
          )}

          <Card shadow="md" border="1px solid" borderColor="gray.200">
            <CardBody p={4}>
              <Flex justify="space-between">
                <Stat>
                  <StatLabel color="gray.500" fontFamily="Helvetica">Total Items Moved</StatLabel>
                  <StatNumber fontSize="3xl" fontFamily="Helvetica">
                    {
                      stockMovements.reduce((sum, m) => sum + (m.quantity || 0), 0)
                    }
                  </StatNumber>
                </Stat>
                <Center>
                  <Circle size="50px" bg="blue.500" color="white">
                    <Icon as={FiPackage} boxSize={6} />
                  </Circle>
                </Center>
              </Flex>
            </CardBody>
          </Card>
        </SimpleGrid>

        {/* Search Bar */}
        <Flex 
          bg="white" 
          p={4} 
          borderRadius="md"
          shadow="sm"
          mb={4}
          border="1px solid"
          borderColor="gray.200"
        >
          <InputGroup maxW="400px">
            <InputLeftElement pointerEvents="none">
              <SearchIcon color="gray.400" />
            </InputLeftElement>
          <Input
              placeholder="Search by item name or movement ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
              borderRadius="md"
            />
          </InputGroup>
        </Flex>

        {/* Stock Movements Table */}
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
                  <Th fontFamily="Helvetica">ITEM</Th>
                  <Th fontFamily="Helvetica">WAREHOUSE</Th>
                  <Th fontFamily="Helvetica">MOVEMENT TYPE</Th>
                  <Th textAlign="center" fontFamily="Helvetica">QUANTITY</Th>
                  <Th fontFamily="Helvetica">MOVEMENT DATE</Th>
                  <Th fontFamily="Helvetica">REFERENCE</Th>
                  <Th fontFamily="Helvetica">REMARKS</Th>
                </Tr>
              </Thead>
              <Tbody>
              {stockMovements.length === 0 ? (
                <Tr>
                  <Td colSpan={6}>
                    <Flex 
                      direction="column" 
                      align="center" 
                      justify="center" 
                      py={8}
                    >
                      <Icon as={FiBox} boxSize={8} color="gray.400" mb={3} />
                      <Text color="gray.500" fontSize="md" mb={2}>No stock movements found</Text>
                    </Flex>
                  </Td>
                </Tr>
              ) : (
                stockMovements
                  .filter(movement => 
                    (
                     (movement.itemID?.itemName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      movement.movementType?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                      movement.remarks?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      movement.referenceType?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      (movement.referenceID && movement.referenceID.toString().toLowerCase().includes(searchQuery.toLowerCase()))
                     ) &&
                     (warehouseFilter === "" || movement.warehouseID?._id === warehouseFilter)
                    )
                  )
                  .map((movement) => (
                    <Tr 
                      key={movement._id}
                      _hover={{ bg: "#f8f9fa" }}
                      transition="background-color 0.2s"
                    >
                      <Td fontFamily="Helvetica">{movement.itemID?.itemName || 'N/A'}</Td>
                      <Td fontFamily="Helvetica">{movement.warehouseID?.name || 'N/A'}</Td>
                      <Td fontFamily="Helvetica">
                        {movement.requestType ? (
                          <Badge 
                            colorScheme={movement.requestType === 'StockIn' ? 'green' : 'red'}
                            variant="subtle"
                          >
                            {movement.requestType}
                          </Badge>
                        ) : (
                          <Badge 
                            colorScheme={movement.movementType?.toLowerCase().includes('in') ? 'green' : 'red'}
                            variant="subtle"
                          >
                            {movement.movementType}
                          </Badge>
                        )}
                      </Td>
                      <Td textAlign="center" fontFamily="Helvetica">{movement.quantity}</Td>
                      <Td fontFamily="Helvetica">{new Date(movement.movementDate).toLocaleString()}</Td>
                      <Td fontFamily="Helvetica">
                        {movement.referenceType ? `${movement.referenceType}` : 'N/A'}
                      </Td>
                      <Td fontFamily="Helvetica">{movement.remarks}</Td>
                    </Tr>
                  ))
              )}
              </Tbody>
            </Table>
        </Box>
      </VStack>

      {/* Add Stock Movement Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="md">
        <ModalOverlay backdropFilter="blur(2px)" />
        <ModalContent borderRadius="lg" shadow="xl">
          <Box bg="#550000" py={4} px={6} color="white" borderTopRadius="lg">
            <Flex justify="space-between" align="center">
              <Flex align="center">
                <Icon as={FiBox} boxSize={5} mr={3} />
                <Text fontSize="xl" fontWeight="bold">
                  Add Stock {movementType}
                </Text>
              </Flex>
              <ModalCloseButton position="static" color="white" />
            </Flex>
          </Box>

          <ModalBody py={6}>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel fontWeight="medium">Item</FormLabel>
                  <Select
                  placeholder="Select item"
                    value={formData.itemID}
                  onChange={(e) =>
                    setFormData({ ...formData, itemID: e.target.value })
                  }
                  focusBorderColor="#550000"
                >
                  {items.map((item) => (
                        <option key={item._id} value={item.itemID}>
                      {item.name}
                        </option>
                      ))}
                  </Select>
                </FormControl>

              <FormControl isRequired>
                <FormLabel fontWeight="medium">Warehouse</FormLabel>
                  <Select
                  placeholder="Select warehouse"
                    value={formData.warehouseID}
                  onChange={(e) =>
                    setFormData({ ...formData, warehouseID: e.target.value })
                  }
                  focusBorderColor="#550000"
                  >
                    {Array.isArray(warehouses) && warehouses.map((warehouse) => (
                      <option key={warehouse._id} value={warehouse.warehouseID}>
                        {warehouse.name}
                      </option>
                    ))}
                  </Select>
                </FormControl>

              <FormControl isRequired>
                <FormLabel fontWeight="medium">Quantity</FormLabel>
                <NumberInput
                  min={1}
                    value={formData.quantity}
                  onChange={(value) =>
                    setFormData({ ...formData, quantity: value })
                  }
                  focusBorderColor="#550000"
                >
                  <NumberInputField placeholder="Enter quantity" />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
                </FormControl>

                <FormControl>
                <FormLabel fontWeight="medium">Remarks</FormLabel>
                  <Input
                  placeholder="Enter remarks (optional)"
                    value={formData.remarks}
                  onChange={(e) =>
                    setFormData({ ...formData, remarks: e.target.value })
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
            >
              Add {movementType}
            </Button>
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default StockMovement; 