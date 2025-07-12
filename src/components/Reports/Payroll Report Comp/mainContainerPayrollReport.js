import React, { useState } from 'react';
import { Box, Tabs, TabList, TabPanels, Tab, TabPanel, Heading, Text } from '@chakra-ui/react';
import CargoReportContainer from './cargoReportContainer';
import ScrapReportContainer from './scrapReportContainer';

const MainContainerPayrollReport = () => {
  const [activeCompanyTab, setActiveCompanyTab] = useState(0);

  return (
    <Box>
      <Heading as="h2" size="xl" color="#16355D" mb={1} fontWeight="bold">
        Reports
      </Heading>
      <Text color="gray.600" mb={4} fontSize="sm">
        Manage monthly, daily, and per trip employee payroll and compensation
      </Text>
      <Tabs
        variant="unstyled"
        index={activeCompanyTab}
        onChange={setActiveCompanyTab}
        isFitted
      >
        <TabList mb="1em" borderRadius="md" overflow="hidden" border="1px solid #800020">
          <Tab
            fontWeight="bold"
            color={activeCompanyTab === 0 ? 'white' : '#800020'}
            bg={activeCompanyTab === 0 ? '#800020' : 'transparent'}
            _selected={{ color: 'white', bg: '#800020' }}
            _focus={{ boxShadow: 'none' }}
            borderRight="1px solid #800020"
            borderRadius="md 0 0 md"
            transition="background 0.2s"
          >
            Justine's Cargo
          </Tab>
          <Tab
            fontWeight="bold"
            color={activeCompanyTab === 1 ? 'white' : '#800020'}
            bg={activeCompanyTab === 1 ? '#800020' : 'transparent'}
            _selected={{ color: 'white', bg: '#800020' }}
            _focus={{ boxShadow: 'none' }}
            borderRadius="0 md md 0"
            transition="background 0.2s"
          >
            Justine's Scrap
          </Tab>
        </TabList>
        <TabPanels>
          <TabPanel px={0}>
            <CargoReportContainer companyType="justine-cargo" />
          </TabPanel>
          <TabPanel px={0}>
            <ScrapReportContainer companyType="justine-scrap" />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  );
};

export default MainContainerPayrollReport;
