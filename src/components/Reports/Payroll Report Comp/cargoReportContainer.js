import React, { useState } from 'react';
import { Box, Select, Text, useColorModeValue } from '@chakra-ui/react';

// Import the actual report components
import CargoMonthlyReportComp from './Cargo Report Comp/cargoMonthlyReportComp';
import CargoDailyReportComp from './Cargo Report Comp/cargoDailyReportComp';
import CargoPerTripReportComp from './Cargo Report Comp/cargoPerTripReportComp';

// Similarly import or define placeholders for Scrap and MC Property reports

const CompanyReportContainer = ({ companyType }) => {
  // State to manage the selected report type (Daily, Monthly, Per Trip)
  const [activeReportType, setActiveReportType] = useState('monthly'); // Default to Monthly

  const renderReportComponent = () => {
    // Conditionally render based on companyType and activeReportType
    if (companyType === 'justine-cargo') {
      switch (activeReportType) {
        case 'daily':
          return <CargoDailyReportComp />;
        case 'monthly':
          return <CargoMonthlyReportComp />;
        case 'per-trip':
          return <CargoPerTripReportComp />;
        default:
          return <Text>Select a report type.</Text>;
      }
    } else if (companyType === 'justine-scrap') {
      // Add similar logic for Scrap reports when components exist
      return <Box p={4} borderWidth="1px" borderRadius="lg">Scrap {activeReportType} Report Placeholder</Box>;
    } else if (companyType === 'mc-rentals') {
      // Add similar logic for MC Rentals reports when components exist
      return <Box p={4} borderWidth="1px" borderRadius="lg">M&C Rentals {activeReportType} Report Placeholder</Box>;
    }
    return <Text>Invalid company type.</Text>;
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
        <option value="monthly">Monthly Report</option>
        <option value="per-trip">Per Trip Report</option>
      </Select>

      {/* Content Area */}
      <Box>
        {renderReportComponent()}
      </Box>
    </Box>
  );
};

export default CompanyReportContainer; 