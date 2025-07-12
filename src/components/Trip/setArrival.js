import React from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  FormControl,
  FormLabel,
  Input,
  Button,
} from '@chakra-ui/react';

const SetArrivalDateModal = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  selectedTripForArrival, 
  selectedArrivalDate, 
  setSelectedArrivalDate, 
  isLoading,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      isCentered
      size="md"
    >
      <ModalOverlay />
      <ModalContent borderRadius="lg">
        <ModalHeader bg="#1a365d" color="white" borderTopRadius="lg" fontSize="md">
          Confirm Arrival Date
        </ModalHeader>
        <ModalCloseButton color="white" _focus={{ boxShadow: 'none' }} />
        <ModalBody py={6}>
          <FormControl isRequired>
            <FormLabel fontWeight="medium" fontSize="sm">Arrival Date</FormLabel>
            <Input
              type="date"
              value={selectedArrivalDate}
              min={(() => {
                if (!selectedTripForArrival || !selectedTripForArrival.loadingDate) return '';
                const nextDay = new Date(selectedTripForArrival.loadingDate);
                nextDay.setDate(nextDay.getDate() + 1);
                return nextDay.toISOString().split('T')[0];
              })()}
              max={(() => {
                // Only allow up to today (current date)
                const today = new Date();
                return today.toISOString().split('T')[0];
              })()}
              onChange={(e) => setSelectedArrivalDate(e.target.value)}
              onDoubleClick={(e) => !e.currentTarget.disabled && e.currentTarget.showPicker()}
              borderColor="gray.300"
              _focus={{ borderColor: '#1a365d', boxShadow: '0 0 0 1px #1a365d' }}
            />
          </FormControl>
        </ModalBody>
        <ModalFooter borderTopWidth="1px" borderColor="gray.200">
          <Button
            bg="#1a365d"
            color="white"
            _hover={{ bg: '#2a4365' }}
            mr={3}
            onClick={onSubmit}
            size="sm"
            isLoading={isLoading}
            loadingText="Confirming..."
          >
            Confirm & Complete Trip
          </Button>
          <Button
            variant="outline"
            borderColor="#800020"
            color="#800020"
            _hover={{ bg: 'maroon.50' }}
            onClick={onClose}
            size="sm"
          >
            Cancel
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default SetArrivalDateModal;
