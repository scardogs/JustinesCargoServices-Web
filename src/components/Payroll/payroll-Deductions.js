import React, { useState } from "react";
import {
  Box,
  Heading,
  useToast,
  Button,
  Flex,
  useColorModeValue,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Card,
  CardHeader,
  CardBody,
} from "@chakra-ui/react";
import { CheckIcon } from "@chakra-ui/icons";
import SSSTable from "./SSSTable";
import PagibigTable from "./PagibigTable";
import PhilhealthTable from "./PhilhealthTable";

const SSSDeductionTable = () => {
  const toast = useToast();

  const handleSave = () => {
    toast({
      title: "Contribution Tables Updated",
      description: "Changes have been saved successfully.",
      status: "success",
      duration: 3000,
      isClosable: true,
      position: "top",
    });
    // Add API call here to save data
  };

  // Define colors
  const headerBgColor = "#1a365d"; // JCS Blue
  const saveButtonColorScheme = "red"; // Changed to maroon
  const tabSelectedColor = "#800020"; // JCS Maroon
  const tabHoverColor = "#1a365d"; // JCS Blue

  return (
    <Card
      variant="outline"
      borderColor={useColorModeValue("gray.200", "gray.700")}
      borderRadius="lg"
      boxShadow="lg"
      overflow="hidden"
    >
      <CardHeader
        bg={headerBgColor}
        color="white"
        borderBottom="1px"
        borderColor={useColorModeValue("gray.200", "gray.700")}
      >
        <Flex justify="space-between" align="center">
          <Heading size="lg" color="white">
            Contribution Tables Editor
          </Heading>
          <Button
            leftIcon={<CheckIcon />}
            colorScheme={saveButtonColorScheme}
            onClick={handleSave}
            size="md"
            _hover={{
              bg: "#600018", // Darker maroon on hover
              transform: "translateY(-1px)",
            }}
            _active={{
              bg: "#400010", // Even darker maroon when pressed
            }}
          >
            Save All Changes
          </Button>
        </Flex>
      </CardHeader>

      <CardBody p={0}>
        <Tabs variant="enclosed" colorScheme="blue" size="md" isFitted>
          <TabList bg="white" borderBottom="2px" borderColor={headerBgColor}>
            <Tab
              _selected={{
                color: "white",
                bg: tabSelectedColor,
                fontWeight: "bold",
              }}
              _hover={{
                bg: tabHoverColor,
                color: "white",
              }}
              borderColor={headerBgColor}
              borderWidth="1px"
              borderBottom="none"
            >
              SSS
            </Tab>
            <Tab
              _selected={{
                color: "white",
                bg: tabSelectedColor,
                fontWeight: "bold",
              }}
              _hover={{
                bg: tabHoverColor,
                color: "white",
              }}
              borderColor={headerBgColor}
              borderWidth="1px"
              borderBottom="none"
            >
              PAG-IBIG
            </Tab>
            <Tab
              _selected={{
                color: "white",
                bg: tabSelectedColor,
                fontWeight: "bold",
              }}
              _hover={{
                bg: tabHoverColor,
                color: "white",
              }}
              borderColor={headerBgColor}
              borderWidth="1px"
              borderBottom="none"
            >
              PHILHEALTH
            </Tab>
          </TabList>

          <TabPanels>
            <TabPanel p={4}>
              <SSSTable />
            </TabPanel>

            <TabPanel p={4}>
              <PagibigTable />
            </TabPanel>

            <TabPanel p={4}>
              <PhilhealthTable />
            </TabPanel>
          </TabPanels>
        </Tabs>
      </CardBody>
    </Card>
  );
};

export default SSSDeductionTable;
