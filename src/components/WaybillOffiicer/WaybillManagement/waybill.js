import React, { useState } from "react";
import { Box } from "@chakra-ui/react";
import WaybillBody from "../../pages/WaybillManagement/waybillBody";
import WaybillTable from "../../pages/WaybillManagement/waybillTable";
import { useRouter } from "next/router";

const App = () => {
  const router = useRouter();
  const [selectedWaybill, setSelectedWaybill] = useState("");
  const [truckCbm, setTruckCbm] = useState(null);

  const handleWaybillSelect = (waybillNumber) => {
    setSelectedWaybill(waybillNumber);
  };

  const handleTruckCbmUpdate = (cbm) => {
    setTruckCbm(cbm);
  };

  return (
    <Box
      minH="100vh"
      p={4}
      display="flex"
      flexDirection="column"
      overflow="hidden" // Prevent outer box from scrolling
    >
      <Box
        bg="white"
        p={6}
        borderRadius="md"
        boxShadow="0 -4px 6px -1px rgba(0, 0, 0, 0.1), 0 -2px 4px -2px rgba(0, 0, 0, 0.1)"
        w="1053px"
        mx="auto" // Center the box horizontally
        flex="1"
        overflowY="auto" // Enable vertical scrolling
        maxHeight="90vh" // Limit the height to enable scrolling
      >
        <WaybillTable onWaybillSelect={handleWaybillSelect} />
        {selectedWaybill && (
          <>
            <WaybillBody
              waybillNumber={selectedWaybill}
              onTruckCbmUpdate={handleTruckCbmUpdate}
              router={router}
            />
          </>
        )}
      </Box>
    </Box>
  );
};

export default App;
