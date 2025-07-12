import React from "react";
import { Box, Heading } from "@chakra-ui/react";
import EmpReportsTable from "../../components/Reports/EmployeeReports";

const EmpReportsPage = () => {
  return (
    <Box p={4}>
      <EmpReportsTable />
    </Box>
  );
};

export default EmpReportsPage;
