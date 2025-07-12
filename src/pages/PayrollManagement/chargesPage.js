import React from 'react';
import { Box } from '@chakra-ui/react';
import ChargesComp from '../../components/Payroll/chargesComp'; // Adjust path if necessary

const ChargesPage = () => {
  return (
    <Box pt={4}> {/* Added padding-top */} 
      <ChargesComp />
    </Box>
  );
};

export default ChargesPage; 