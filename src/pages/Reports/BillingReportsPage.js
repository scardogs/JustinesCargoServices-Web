import React from "react";
import { Box, Heading } from "@chakra-ui/react";
import BillingReportsTable from "../../components/Reports/BillingReports";

const BillingReportsPage = () => {
  return (
    <Box p={4}>
      <BillingReportsTable />
    </Box>
  );
};

export default BillingReportsPage;
