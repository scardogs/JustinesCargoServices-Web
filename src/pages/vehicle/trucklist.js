import React from "react";
import { Box, Heading } from "@chakra-ui/react";
import VehicleTable from "../../components/vehicle/vehicleList";

const vehiclePage = () => {
  return (
    <Box p={4}>
      <VehicleTable />
    </Box>
  );
};

export default vehiclePage;
