import React from "react";
import { Box, Heading } from "@chakra-ui/react";
import VehicleLogs from "../../components/vehicle/vehicleLogs";

const vehicleLogsPage = () => {
  return (
    <Box p={4}>
      <VehicleLogs />
    </Box>
  );
};

export default vehicleLogsPage;
