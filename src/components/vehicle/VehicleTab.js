import { useState } from "react";
import dynamic from "next/dynamic";
import {
  Box,
  Flex,
  Button,
  Text,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  VStack,
  Heading,
} from "@chakra-ui/react";
import { ChevronDownIcon } from "@chakra-ui/icons";

// Load components dynamically
const TruckList = dynamic(() => import("../../pages/vehicle/trucklist"), {
  ssr: false,
});
const LtoRenewal = dynamic(() => import("../../pages/vehicle/ltoRenewal"), {
  ssr: false,
});
const LtfrbRenewal = dynamic(
  () => import("../../pages/vehicle/ltfrbRenewalPage"),
  {
    ssr: false,
  }
);
const InsuranceRenewal = dynamic(
  () => import("../../pages/vehicle/insuranceRenewal"),
  {
    ssr: false,
  }
);
const VehicleLogs = dynamic(() => import("../../pages/vehicle/vehicleLogs"), {
  ssr: false,
});

const VehicleTabs = () => {
  const [activeTab, setActiveTab] = useState("list");
  const [activeRenewalTab, setActiveRenewalTab] = useState("LTO");

  const renderContent = () => {
    if (activeTab === "list") return <TruckList />;
    if (activeTab === "logs") return <VehicleLogs />;

    if (activeTab === "renewal") {
      switch (activeRenewalTab) {
        case "LTO":
          return <LtoRenewal />;
        case "LTFRB":
          return <LtfrbRenewal />;
        case "INSURANCE":
          return <InsuranceRenewal />;
        default:
          return null;
      }
    }
  };

  return (
    <Box>
      <Box
        mb={8}
        py={4}
        px={6}
        color="#1a365d"
        borderRadius="md"
        borderBottom="1px solid"
        borderColor="gray.200"
      >
        <Flex justify="space-between" align="center" mb={6}>
          <VStack align="start" spacing={1}>
            <Heading size="lg" color="#1a365d" fontWeight="bold">
              Vehicle Management
            </Heading>
            <Text color="gray.500">
              Manage fleet vehicles and track vehicle information
            </Text>
          </VStack>
        </Flex>
      </Box>
      {/* Tab Navigation */}
      <Flex
        bg="white"
        boxShadow="md"
        rounded="lg"
        p={2}
        justify="flex-start"
        gap={10}
      >
        <Button
          variant="ghost"
          fontWeight={activeTab === "list" ? "bold" : "normal"}
          borderBottom={activeTab === "list" ? "2px solid #800000" : "none"}
          borderRadius="0"
          _hover={{ bg: "transparent" }}
          onClick={() => setActiveTab("list")}
        >
          <Text>List of Vehicles</Text>
        </Button>

        {/* Vehicle Renewal Dropdown */}
        <Menu>
          <MenuButton
            as={Button}
            rightIcon={<ChevronDownIcon />}
            variant="ghost"
            fontWeight={activeTab === "renewal" ? "bold" : "normal"}
            borderBottom={
              activeTab === "renewal" ? "2px solid #800000" : "none"
            }
            borderRadius="0"
            _hover={{ bg: "transparent" }}
            onClick={() => setActiveTab("renewal")}
          >
            <Text>Vehicle Renewal</Text>
          </MenuButton>
          <MenuList>
            {["LTO", "LTFRB", "INSURANCE"].map((renewalType) => (
              <MenuItem
                key={renewalType}
                onClick={() => {
                  setActiveTab("renewal");
                  setActiveRenewalTab(renewalType);
                }}
              >
                {renewalType}
              </MenuItem>
            ))}
          </MenuList>
        </Menu>

        <Button
          variant="ghost"
          fontWeight={activeTab === "logs" ? "bold" : "normal"}
          borderBottom={activeTab === "logs" ? "2px solid #800000" : "none"}
          borderRadius="0"
          _hover={{ bg: "transparent" }}
          onClick={() => setActiveTab("logs")}
        >
          <Text>Vehicles Logs</Text>
        </Button>
      </Flex>

      {/* Content Box */}
      <Box>{renderContent()}</Box>
    </Box>
  );
};

export default VehicleTabs;
