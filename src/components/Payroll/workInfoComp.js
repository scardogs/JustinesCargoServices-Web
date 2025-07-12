import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Checkbox,
  Box,
  TableContainer,
  Text,
  NumberInput,
  NumberInputField,
  Spinner,
  Center,
  useToast,
  Badge,
} from '@chakra-ui/react';
import axios from 'axios';

// Dedicated function to fetch all waybill numbers for trips
const fetchWaybillNumbers = async () => {
  // Define possible API endpoints to try
  const possibleEndpoints = [
    `/api/tripdetails`,
    `/api/trip-details`, 
    `/api/trip_details`, 
    `/api/tripDetails`,
    `/tripdetails` // In case the API_URL already includes /api
  ];
  
  // Try each endpoint until one works
  for (const endpoint of possibleEndpoints) {
    try {
      console.log(`Attempting to fetch from: ${process.env.NEXT_PUBLIC_BACKEND_API}${endpoint}`);
      const response = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_API}${endpoint}`);
      
      // If we get here, the request succeeded
      // Create a mapping of tripID to an array of waybillNumbers
      const waybillMap = {};
      if (response.data && Array.isArray(response.data)) {
        response.data.forEach(detail => {
          if (detail.tripID && detail.waybillNumber) {
            // Initialize the array if this tripID hasn't been seen yet
            if (!waybillMap[detail.tripID]) {
              waybillMap[detail.tripID] = [];
            }
            // Add the waybill number to the array for this tripID
            waybillMap[detail.tripID].push(detail.waybillNumber);
          }
        });
      }
      
      console.log('Waybill map created with data from endpoint:', endpoint);
      console.log('Map contains entries:', Object.keys(waybillMap).length);
      return waybillMap;
    } catch (error) {
      console.error(`Error with endpoint ${endpoint}:`, error.message);
      // Continue to the next endpoint
    }
  }
  
  // If we get here, all endpoints failed
  console.error('All API endpoints for trip details failed');
  
  // Fallback - at least attempt to fetch individual trip details on demand
  return {};
};

// Fetch split waybill information
const fetchSplitWaybills = async () => {
  try {
    const response = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_API}/api/entityabbreviationsummaries`);
    
    // Create a map of waybill numbers that have split="split"
    const splitWaybills = {};
    if (response.data && Array.isArray(response.data)) {
      response.data.forEach(summary => {
        if (summary.waybillNumber && summary.split === "split") {
          splitWaybills[summary.waybillNumber] = true;
        }
      });
    }
    
    console.log('Split waybills fetched:', Object.keys(splitWaybills).length);
    return splitWaybills;
  } catch (error) {
    console.error('Error fetching split waybills:', error.message);
    return {};
  }
};

const WorkInfoComp = ({ selectedTrips = [], onTripSelectionChange, selectedEmployee, initialTripRates = {} }) => {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [waybillMap, setWaybillMap] = useState({});
  const [splitWaybills, setSplitWaybills] = useState({});
  const [tripRates, setTripRates] = useState(initialTripRates);
  const [localSelectedTrips, setLocalSelectedTrips] = useState(selectedTrips);
  const [allSelected, setAllSelected] = useState(false);
  const isMounted = useRef(true);
  const toast = useToast();
  
  // Use useRef to track if we need to update tripRates without causing a rerender
  const tripsRef = useRef([]);

  // Update local state when props change
  useEffect(() => {
    setLocalSelectedTrips(selectedTrips);
    setAllSelected(selectedTrips.length > 0 && data.length > 0 && selectedTrips.length === data.length);
  }, [selectedTrips, data]);

  // Initialize local rates state when initialTripRates prop changes (e.g., on re-render after step navigation)
  useEffect(() => {
    setTripRates(initialTripRates || {});
  }, [initialTripRates]);

  // Fetch all waybill numbers and split information on component mount
  useEffect(() => {
    const fetchData = async () => {
      const waybills = await fetchWaybillNumbers();
      setWaybillMap(waybills);
      
      const splits = await fetchSplitWaybills();
      setSplitWaybills(splits);
    };
    
    fetchData();
    
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Fetch trips for the selected driver
  useEffect(() => {
    // Skip effect if there's no selected employee
    if (!selectedEmployee) {
      return;
    }
    
    let isMounted = true;
    
    const fetchDriverTrips = async () => {
      try {
        setIsLoading(true);
        
        // Get driver name in the format used in the Trip collection
        const driverName = selectedEmployee.name || 
                          `${selectedEmployee.firstName} ${selectedEmployee.lastName}`;
        
        // Call API to get trips for this driver
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_BACKEND_API}/api/trips?driver=${encodeURIComponent(driverName)}`
        );
        
        // Don't update state if component unmounted
        if (!isMounted) return;
        
        // Process response data
        let trips = [];
        if (response.data.trips) {
          trips = response.data.trips;
        } else if (Array.isArray(response.data)) {
          trips = response.data;
        }
        
        // Filter out trips where backLoad is true
        trips = trips.filter(trip => !trip.backLoad);
        
        console.log(`Filtered trips (backLoad: false): ${trips.length}`);
        
        // Check if we already have waybill numbers from our bulk fetch
        const shouldFetchIndividualWaybills = Object.keys(waybillMap).length === 0;
        
        // Map trips to the format expected by the table
        let formattedTrips = [];
        
        if (shouldFetchIndividualWaybills) {
          // If bulk fetch failed, fetch waybills individually
          console.log("Using fallback: Fetching waybill numbers individually");
          console.log("Split Waybills Map (Fallback):", splitWaybills);
          await Promise.all(trips.map(async (trip) => {
            // Try to fetch waybills from TripDetails using tripID
            let waybills = [];
            try {
              // Try several possible endpoints
              const endpoints = [
                `/api/tripdetails?tripID=${trip.tripID}`,
                `/api/trip-details?tripID=${trip.tripID}`,
                `/api/tripDetails?tripID=${trip.tripID}`,
                `/tripdetails?tripID=${trip.tripID}`
              ];
              
              for (const endpoint of endpoints) {
                try {
                  const detailsResponse = await axios.get(
                    `${process.env.NEXT_PUBLIC_BACKEND_API}${endpoint}`
                  );
                  if (detailsResponse.data && 
                     (Array.isArray(detailsResponse.data) && detailsResponse.data.length > 0)) {
                    // Collect all waybill numbers
                    waybills = detailsResponse.data.map(detail => detail.waybillNumber);
                    break; // Exit loop if successful
                  }
                } catch (e) {
                  // Try next endpoint
                  console.log(`Endpoint ${endpoint} failed, trying next`);
                }
              }
            } catch (error) {
              console.log('No trip details found for trip:', trip.tripID);
            }
            
            let combinedWaybills = 'N/A';

            // Create a single row for the trip, combining waybills
            if (waybills.length > 0) {
              const formattedWaybillStrings = waybills.map(waybillNumber => {
                // Format waybill numbers, adding (Split) where needed
                if (splitWaybills[waybillNumber]) {
                  return `${waybillNumber}(Split)`; // Add indicator here
                }
                return waybillNumber; // Otherwise, return clean number
              });
              combinedWaybills = formattedWaybillStrings.join('/');
            }

            formattedTrips.push({
              id: trip.tripID, // Use tripID as the unique key
              tripID: trip.tripID,
              waybill: combinedWaybills,
              loadingDate: trip.loadingDate,
              status: trip.status,
              vehicle: trip.vehicle,
              stubNumber: trip.stubNumber
            });
          }));
        } else {
          // Use our existing waybill map (bulk fetch succeeded)
          console.log("Split Waybills Map (Bulk):", splitWaybills);
          trips.forEach(trip => {
            let combinedWaybills = 'N/A';

            if (waybillMap[trip.tripID] && waybillMap[trip.tripID].length > 0) {
              const waybillNumbers = waybillMap[trip.tripID];
              
              // Format waybill numbers, adding (Split) where needed
              const formattedWaybillStrings = waybillNumbers.map(waybillNumber => {
                if (splitWaybills[waybillNumber]) {
                  return `${waybillNumber}(Split)`; // Add indicator here
                }
                return waybillNumber; // Otherwise, return clean number
              });
              
              combinedWaybills = formattedWaybillStrings.join('/'); // Join with slash
            }

            formattedTrips.push({
              id: trip.tripID, // Use tripID as the unique key for the row
              tripID: trip.tripID,
              waybill: combinedWaybills,
              loadingDate: trip.loadingDate,
              status: trip.status,
              vehicle: trip.vehicle,
              stubNumber: trip.stubNumber
            });
          });
        }
        
        // Don't update state if component unmounted
        if (!isMounted) return;
        
        // Store the trip IDs in our ref for comparison
        tripsRef.current = formattedTrips.map(trip => trip.id);
        
        // Set data first
        setData(formattedTrips);
        
        // Then initialize rates for new trips without creating a dependency cycle
        setTripRates(prevRates => {
          let needsUpdate = false;
          const newRates = { ...prevRates };
          
          formattedTrips.forEach(trip => {
            if (newRates[trip.id] === undefined) {
              newRates[trip.id] = 0;
              needsUpdate = true;
            }
          });
          
          // Only return new object if changes were made
          return needsUpdate ? newRates : prevRates;
        });
      } catch (error) {
        // Don't update state if component unmounted
        if (!isMounted) return;
        
        console.error('Error fetching trips:', error);
        toast({
          title: 'Error fetching trips',
          description: error.message || 'Failed to fetch trips for driver',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
        setData([]);
      } finally {
        // Don't update state if component unmounted
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchDriverTrips();
    
    // Cleanup function to prevent state updates after unmount
    return () => {
      isMounted = false;
    };
  }, [selectedEmployee, waybillMap, toast]); // Only essential dependencies

  // Handle individual checkbox change
  const handleCheckboxChange = (tripId) => {
    // tripId is now the actual trip.tripID
    const newSelection = localSelectedTrips.includes(tripId)
      ? localSelectedTrips.filter((id) => id !== tripId)
      : [...localSelectedTrips, tripId];
    
    setLocalSelectedTrips(newSelection);
    if (onTripSelectionChange) {
      onTripSelectionChange(newSelection, tripRates);
    }
    
    // Check if all rows (unique tripIDs) are selected
    setAllSelected(newSelection.length === data.length && data.length > 0);
  };

  // Handle "select all" checkbox change
  const handleSelectAllChange = (e) => {
    const isChecked = e.target.checked;
    setAllSelected(isChecked);
    
    // Get all unique trip IDs from the original data
    const allTripIds = data.map((trip) => trip.id); // data holds the unique trip rows
    const newSelection = isChecked ? allTripIds : [];
    
    setLocalSelectedTrips(newSelection);
    if (onTripSelectionChange) {
      onTripSelectionChange(newSelection, tripRates);
    }
  };

  // Handle rate change for a trip
  const handleRateChange = (tripId, value) => {
    // Parse value as float or default to 0
    const rate = parseFloat(value) || 0;
    
    // Update trip rates state
    const newRates = { ...tripRates, [tripId]: rate };
    setTripRates(newRates);
    
    // Always trigger the onTripSelectionChange to update the calculations
    // Pass the *current selection* (localSelectedTrips) and the *new rates*
    if (onTripSelectionChange) {
      onTripSelectionChange(localSelectedTrips, newRates);
    }
  };

  // Format amount helper
  const formatAmount = (amount) => {
    return Number(amount).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Combine data with rates - should work fine as `data` is already grouped
  const tripsWithRates = useMemo(() => {
    if (!data) return [];
    
    return data.map(trip => {
      // Ensure each trip has a rate (either from tripRates or default to 0)
      // Using trip.id which is the tripID
      const rateValue = tripRates[trip.id] !== undefined ? tripRates[trip.id] : 0;
      
      // Update the rates object if needed for this tripID
      if (tripRates[trip.id] === undefined) {
        setTripRates(prev => ({
          ...prev,
          [trip.id]: rateValue
        }));
      }
      
      return {
        ...trip,
        rate: rateValue
      };
    });
  }, [data, tripRates]);

  return (
    <Box>
      <Text fontSize="lg" fontWeight="medium" mb={4} color="#1a365d">
        Select Applicable Trips
      </Text>
      
      {isLoading ? (
        <Center py={8}>
          <Spinner size="lg" color="#1a365d" />
        </Center>
      ) : (
        <>
          <TableContainer border="1px" borderColor="#1a365d" borderRadius="md">
            <Table variant="simple" size="sm">
              <Thead bg="#1a365d">
                <Tr>
                  <Th width="50px">
                    <Checkbox
                      colorScheme="blue"
                      bg="white"
                      borderColor="gray.300"
                      _unchecked={{ borderColor: '#800020' }}
                      isChecked={allSelected}
                      isIndeterminate={localSelectedTrips.length > 0 && localSelectedTrips.length < data.length}
                      onChange={handleSelectAllChange}
                      isDisabled={data.length === 0}
                    />
                  </Th>
                  <Th color="white" maxW="150px">Trip ID</Th>
                  <Th color="white" maxW="200px">Waybill Number</Th>
                  <Th color="white" isNumeric>Rate (Edit)</Th>
                </Tr>
              </Thead>
              <Tbody>
                {tripsWithRates.length > 0 ? (
                  tripsWithRates.map((trip) => (
                    <Tr key={trip.id} _hover={{ bg: "blue.50" }}>
                      <Td width="50px">
                        <Checkbox
                          colorScheme="blue"
                          borderColor="gray.300"
                          _unchecked={{ borderColor: '#800020' }}
                          isChecked={localSelectedTrips.includes(trip.id)}
                          onChange={(e) => handleCheckboxChange(trip.id)}
                          id={trip.id}
                        />
                      </Td>
                      <Td maxW="150px" overflow="hidden" textOverflow="ellipsis">{trip.tripID}</Td>
                      <Td maxW="200px" overflow="hidden" textOverflow="ellipsis">{trip.waybill}</Td>
                      <Td isNumeric>
                        <NumberInput
                          min={0}
                          value={tripRates[trip.id] || 0}
                          onChange={(valueString) => handleRateChange(trip.id, valueString)}
                          size="sm"
                          maxW="100px"
                          ml="auto"
                          focusBorderColor="#1a365d"
                          isDisabled={!localSelectedTrips.includes(trip.id)}
                        >
                          <NumberInputField 
                            textAlign="right" 
                            color="#800020" 
                            fontWeight="medium"
                            border="1px solid"
                            borderColor="gray.300"
                            _hover={{ borderColor: "#1a365d" }}
                          />
                        </NumberInput>
                      </Td>
                    </Tr>
                  ))
                ) : (
                  <Tr>
                    <Td colSpan={4} textAlign="center" color="gray.500">
                      {selectedEmployee ? 
                        "No trips found for this driver." : 
                        "Please select a driver to view trips."}
                    </Td>
                  </Tr>
                )}
              </Tbody>
            </Table>
          </TableContainer>
          <Text fontSize="sm" color="#1a365d" mt={2} fontWeight="medium">
            Selected trips: {localSelectedTrips.length}
          </Text>
        </>
      )}
    </Box>
  );
};

export default WorkInfoComp;
