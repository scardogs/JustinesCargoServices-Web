import React from "react";
import { Box, Heading } from "@chakra-ui/react";
import EmployeeTable from "../../components/EmployeeRecords/EmployeeRecords";

const EmployeePage = () => {
  return (
    <Box p={4}>
      <EmployeeTable />
    </Box>
  );
};

export default EmployeePage;
