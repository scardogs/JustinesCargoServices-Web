import React from "react";
import { Box, Text } from "@chakra-ui/react";
import Warehouse from "../../components/Inventory/warehouse";

const WarehousePage = () => {
  return (
    <Box p={4}>
      <Text fontSize="2xl" fontWeight="bold" mb={4}>
        Warehouse Management
      </Text>
      <Warehouse />
    </Box>
  );
};

export default WarehousePage; 