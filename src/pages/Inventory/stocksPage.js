import React, { useState, useEffect } from "react";
import {
  Box,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  useToast,
} from "@chakra-ui/react";
import axios from "axios";
import StockMovement from "../../components/Inventory/stockMovement";

const Stocks = () => {
  const [items, setItems] = useState([]);
  const toast = useToast();

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const response = await axios.get(process.env.NEXT_PUBLIC_BACKEND_API + "/api/items");
      setItems(response.data);
    } catch (error) {
      console.error("Error fetching items:", error);
      toast({
        title: "Error",
        description: "Failed to fetch items",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  return (
    <Box p={4}>
      <Tabs variant="enclosed">
        <TabList>
          <Tab>Stock In</Tab>
          <Tab>Stock Out</Tab>
        </TabList>

        <TabPanels>
          <TabPanel>
            <StockMovement movementType="In" items={items} setItems={setItems} />
          </TabPanel>
          <TabPanel>
            <StockMovement movementType="Out" items={items} setItems={setItems} />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  );
};

export default Stocks; 