import dynamic from "next/dynamic";
import { Box } from "@chakra-ui/react";

const WaybillTable = dynamic(
  () => import("../../components/WaybillManagement/waybilltable"),
  { ssr: false }
);

const waybillPage = () => {
  return (
    <Box p={4}>
      <WaybillTable />
    </Box>
  );
};

export default waybillPage;
