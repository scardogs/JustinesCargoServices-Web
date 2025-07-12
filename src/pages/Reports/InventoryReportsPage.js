import React from "react";
import { Box, Heading } from "@chakra-ui/react";
import InventoryReportsTable from "../../components/Reports/InventoryReport";

const InventoryReportsPage = () => {
  return (
    <Box p={4}>
      <InventoryReportsTable />
    </Box>
  );
};

export default InventoryReportsPage;