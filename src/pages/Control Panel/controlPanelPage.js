import React from "react";
import {
  Box,
  Heading,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel
} from "@chakra-ui/react";
import ControlPanelComp from "../../components/control Panel/controlPanelComp";
import DeleteLogsTab from "../../components/control Panel/DeleteLogsTab";

const ControlPanelPage = () => {
  return (
    <Box p={5}>
      <Heading as="h1" size="xl" mb={6}>
        Control Panel
      </Heading>
      <Tabs variant='soft-rounded' colorScheme='blue'>
        <TabList mb='1em'>
          <Tab>Requests</Tab>
          <Tab>Delete Logs</Tab>
        </TabList>
        <TabPanels>
          <TabPanel p={0}>
            <ControlPanelComp />
          </TabPanel>
          <TabPanel p={0}>
            <DeleteLogsTab />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  );
};

export default ControlPanelPage;
