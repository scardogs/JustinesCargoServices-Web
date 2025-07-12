import React, { useState } from 'react';
import { Box, Select, Text, useColorModeValue } from '@chakra-ui/react';
import ScrapDailyReportComp from './Scrap Report Comp/scrapDailyReportComp';
import ScrapPakyawReportComp from './Scrap Report Comp/scrapPakyawReportComp';

const ScrapReportContainer = ({ companyType }) => {
  // State to manage the selected report type (Daily, Pakyaw)
  const [activeReportType, setActiveReportType] = useState('daily'); // Default to Daily

  const renderReportComponent = () => {
    switch (activeReportType) {
      case 'daily':
        return <ScrapDailyReportComp />;
      case 'pakyaw':
        return <ScrapPakyawReportComp />;
      default:
        return <Text>Select a report type.</Text>;
    }
  };

  return (
    <Box mt={4}>
      {/* Dropdown Selection */}
      <Select
        value={activeReportType}
        onChange={(e) => setActiveReportType(e.target.value)}
        mb={4}
        maxW="200px"
        bg={useColorModeValue('white', 'gray.800')}
        borderColor={useColorModeValue('gray.200', 'gray.700')}
      >
        <option value="daily">Daily Report</option>
        <option value="pakyaw">Pakyaw Report</option>
      </Select>

      {/* Content Area */}
      <Box>
        {renderReportComponent()}
      </Box>
    </Box>
  );
};

export default ScrapReportContainer;
