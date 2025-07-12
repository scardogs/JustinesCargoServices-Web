import React from "react";
import { Box, Heading } from "@chakra-ui/react";
import Waybill from "../../components/WaybillManagement/waybill";

const waybillPage = () => {
  return (
    <Box p={4}>
      <Waybill />
    </Box>
  );
};

export default waybillPage;
