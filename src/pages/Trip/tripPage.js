import React from "react";
import { Box, Heading } from "@chakra-ui/react";
import TripTable from "../../components/Trip/tripTable";

const TripPage = () => {
  return (
    <Box p={4}>
      <TripTable />
    </Box>
  );
};

export default TripPage;
