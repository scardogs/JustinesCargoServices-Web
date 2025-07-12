import React from "react";
import { Box, Heading } from "@chakra-ui/react";
import TripDetailTable from "../../components/Trip/TripDetail";

const TripDetailPage = () => {
  return (
    <Box p={4}>
      <TripDetailTable />
    </Box>
  );
};

export default TripDetailPage;
