import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Box,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  VStack,
  TableContainer,
  Button,
  HStack,
  Flex,
  Text,
  useColorModeValue,
  NumberInput,
  NumberInputField,
  useToast,
} from "@chakra-ui/react";
import { AddIcon, EditIcon, CheckIcon, CloseIcon } from "@chakra-ui/icons";

const SSSTable = () => {
  const [sssData, setSSSData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const toast = useToast();

  // Function to calculate Regular SS based on row index
  const calculateRegularSS = (index) => {
    const baseAmount = 250;
    const increment = 25;
    const maxAmount = 1000;

    const calculatedAmount = baseAmount + index * increment;
    return Math.min(calculatedAmount, maxAmount);
  };

  // Function to calculate MPF based on Regular SS value and row index
  const calculateMPF = (regularSS, index) => {
    if (regularSS < 1000) return 0;

    // Once Regular SS hits 1000, MPF starts at 25 and increases by 25 per row
    const mpfStartIndex = Math.floor((1000 - 250) / 25); // Index where Regular SS hits 1000 (index = 30)
    const rowsSinceMpfStart = index - mpfStartIndex; // This will be 0 for the first row where Regular SS is 1000

    // Start MPF at 25 on the index where Regular SS hits 1000 (rowsSinceMpfStart = 0)
    return rowsSinceMpfStart * 25;
  };

  // Function to calculate total for a row
  const calculateTotal = (regularSS, mpf) => {
    return regularSS + mpf;
  };

  // Fetch all SSS contributions on component mount
  useEffect(() => {
    fetchSSSData();
  }, []);

  const fetchSSSData = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/sss-contributions`
      );

      if (response.data.success) {
        // Process fetched data to apply calculation logic based on index
        const processedData = response.data.data.map((row, index) => {
          const regularSS = calculateRegularSS(index);
          const mpf = calculateMPF(regularSS, index);
          const total = calculateTotal(regularSS, mpf);

          return {
            ...row, // Keep existing fields like _id, rangeStart, rangeEnd
            employeeRegularSS: regularSS,
            employeeMPF: mpf,
            employeeTotal: total,
            total: total, // Assuming 'total' field should also be updated
          };
        });

        setSSSData(processedData);
      } else {
        setError("Failed to fetch SSS data");
        toast({
          title: "Error",
          description: "Failed to fetch SSS contribution data",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (err) {
      setError(err.message);
      toast({
        title: "Error",
        description: `Error: ${err.message}`,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Function to add a new SSS range and save it immediately
  const addNewSSSRange = async () => {
    const newIndex = sssData.length;
    const regularSS = calculateRegularSS(newIndex);
    const mpf = calculateMPF(regularSS, newIndex);
    const total = calculateTotal(regularSS, mpf);

    const lastRow = sssData.length > 0 ? sssData[sssData.length - 1] : null;

    // Ensure lastRow.rangeStart is treated as a number for calculation
    const lastRangeStartNumeric = lastRow
      ? parseFloat(String(lastRow.rangeStart)) || 0
      : 0;
    const newRangeStart = lastRow ? lastRangeStartNumeric + 500 : 5250;
    const newRangeEnd = newRangeStart + 499.99;

    const newContributionData = {
      rangeStart: newRangeStart,
      rangeEnd: newRangeEnd,
      employeeRegularSS: regularSS,
      employeeMPF: mpf,
      employeeTotal: total,
      total: total, // Ensure total is included
    };

    setIsLoading(true); // Indicate loading state
    try {
      // Send POST request to create the new contribution
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/sss-contributions`,
        newContributionData
      );

      if (response.data.success) {
        // Add the newly created row (with _id) to the local state
        const savedRow = response.data.data;
        setSSSData([...sssData, savedRow]);
        toast({
          title: "Success",
          description: "New SSS range added and saved.",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
      } else {
        // Handle backend error response
        throw new Error(
          response.data.message || "Failed to save new SSS range."
        );
      }
    } catch (err) {
      console.error("Error adding new SSS range:", err);
      toast({
        title: "Error",
        description: `Failed to add new SSS range: ${err.message}`,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false); // End loading state
    }
  };

  // Function to handle SSS field update (only active in edit mode for ranges)
  const handleSSSFieldUpdate = (id, field, value) => {
    if (!isEditing) return; // Only allow updates when editing

    setSSSData((prevData) =>
      prevData.map((row, index) => {
        if (row._id === id || row.id === id) {
          let updatedRow = { ...row };
          if (field === "rangeStart" || field === "rangeEnd") {
            updatedRow[field] = value; // Store the string value directly
          } else {
            // Calculated fields are not directly updated via this handler
            const regularSS = calculateRegularSS(index);
            const mpf = calculateMPF(regularSS, index);
            const total = calculateTotal(regularSS, mpf);
            updatedRow = {
              ...updatedRow,
              employeeRegularSS: regularSS,
              employeeMPF: mpf,
              employeeTotal: total,
              total: total,
            };
          }
          return updatedRow;
        }
        return row;
      })
    );
  };

  // saveContribution function remains likely redundant
  const saveContribution = async (contribution) => {
    console.warn("saveContribution called, but might be redundant now.");
    return true; // Placeholder
  };

  // Ensure saveAllChanges only sends necessary data and exits edit mode
  const saveAllChanges = async () => {
    const updatedData = sssData.map((row) => ({
      _id: row._id,
      rangeStart: parseFloat(String(row.rangeStart)) || 0, // Parse to number, fallback to 0
      rangeEnd: parseFloat(String(row.rangeEnd)) || 0, // Parse to number, fallback to 0
    }));

    setIsLoading(true); // Keep loading indicator
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/sss-contributions/bulk`,
        updatedData
      );

      if (response.data.success) {
        // It might be better to update local state directly if backend returns updated data
        // For now, refetching ensures consistency
        await fetchSSSData(); // Re-fetch data to ensure consistency
        setIsEditing(false); // Exit edit mode on successful save
        toast({
          title: "Success",
          description: "SSS contribution ranges updated successfully",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
      } else {
        throw new Error(
          response.data.message || "Failed to save SSS range updates."
        );
      }
    } catch (err) {
      toast({
        title: "Error",
        description: `Failed to save range updates: ${err.message}`,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      // Optionally keep isEditing true on error, or set to false
      // setIsEditing(false);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteSSSRange = async (id) => {
    try {
      // Check if the row exists in the database
      if (id.startsWith && !id.startsWith("new-")) {
        await axios.delete(
          `${process.env.NEXT_PUBLIC_BACKEND_API}/api/sss-contributions/${id}`
        );
      }

      // Remove from local state
      setSSSData((prevData) => prevData.filter((row) => row._id !== id));

      toast({
        title: "Success",
        description: "SSS contribution range deleted successfully",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    } catch (err) {
      toast({
        title: "Error",
        description: `Failed to delete contribution: ${err.message}`,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  // Define colors
  const headerBgColor = "#1a365d"; // JCS Blue
  const headerTextColor = "white";
  const addButtonColorScheme = "blue";
  const focusBorderColor = "#800020"; // JCS Maroon
  const rowHoverBg = useColorModeValue("gray.100", "gray.700");
  const oddRowBg = useColorModeValue("white", "gray.800");
  const evenRowBg = useColorModeValue("gray.50", "gray.900");

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={4}>
        <Text fontSize="md" fontWeight="semibold" color={headerBgColor}>
          SSS Contribution Table
        </Text>
        <HStack>
          <Button
            leftIcon={<EditIcon />}
            colorScheme="blue"
            variant="outline"
            size="sm"
            onClick={() => setIsEditing(!isEditing)} // Toggle edit mode
            _hover={{
              bg: isEditing ? "gray.100" : "blue.50",
            }}
          >
            {isEditing ? "Cancel Edit" : "Edit Ranges"}
          </Button>
          <Button
            colorScheme="green"
            size="sm"
            onClick={saveAllChanges}
            isLoading={isLoading}
            isDisabled={!isEditing} // Disable save if not editing
            _hover={{
              bg: isEditing ? "green.600" : "gray.300", // Adjust hover based on state
              cursor: isEditing ? "pointer" : "not-allowed",
            }}
            _disabled={{
              // More specific disabled styles
              bg: "gray.300",
              cursor: "not-allowed",
              opacity: 0.6,
            }}
          >
            Save Changes
          </Button>
        </HStack>
      </Flex>
      {error && (
        <Text color="red.500" mb={4}>
          Error: {error}
        </Text>
      )}
      <TableContainer>
        <Table
          variant="simple"
          size="sm"
          borderWidth="1px"
          borderColor={useColorModeValue("gray.200", "gray.700")}
        >
          <Thead bg={headerBgColor}>
            <Tr>
              <Th
                color={headerTextColor}
                rowSpan={2}
                textAlign="center"
                borderBottomWidth="1px"
                borderColor="gray.600"
              >
                RANGE OF COMPENSATION
              </Th>

              <Th
                color={headerTextColor}
                colSpan={3}
                textAlign="center"
                borderBottomWidth="1px"
                borderColor="gray.600"
              >
                AMOUNT OF CONTRIBUTIONS (EMPLOYEE)
              </Th>
              <Th
                color={headerTextColor}
                rowSpan={2}
                textAlign="center"
                borderBottomWidth="1px"
                borderColor="gray.600"
                width="100px"
              >
                ACTIONS
              </Th>
            </Tr>
            <Tr>
              <Th
                color={headerTextColor}
                textAlign="center"
                borderBottomWidth="1px"
                borderColor="gray.600"
              >
                REGULAR SS
              </Th>
              <Th
                color={headerTextColor}
                textAlign="center"
                borderBottomWidth="1px"
                borderColor="gray.600"
              >
                MPF
              </Th>
              <Th
                color={headerTextColor}
                textAlign="center"
                borderBottomWidth="1px"
                borderColor="gray.600"
              >
                TOTAL
              </Th>
            </Tr>
          </Thead>
          <Tbody>
            {sssData.map((row, index) => (
              <Tr
                key={row._id || row.id}
                _hover={{ bg: rowHoverBg }}
                bg={index % 2 === 0 ? evenRowBg : oddRowBg}
              >
                {/* Range of Compensation - Conditional Rendering */}
                <Td
                  borderWidth="1px"
                  borderColor={useColorModeValue("gray.200", "gray.700")}
                >
                  {isEditing ? (
                    <HStack spacing={1}>
                      <NumberInput
                        size="sm"
                        value={row.rangeStart}
                        onChange={(value) =>
                          handleSSSFieldUpdate(
                            row._id || row.id,
                            "rangeStart",
                            value
                          )
                        }
                        min={0}
                        precision={2}
                      >
                        <NumberInputField
                          borderColor="gray.300"
                          _hover={{ borderColor: focusBorderColor }}
                          _focus={{
                            borderColor: focusBorderColor,
                            boxShadow: `0 0 0 1px ${focusBorderColor}`,
                          }}
                        />
                      </NumberInput>
                      <Text px={1}>-</Text>
                      <NumberInput
                        size="sm"
                        value={row.rangeEnd}
                        onChange={(value) =>
                          handleSSSFieldUpdate(
                            row._id || row.id,
                            "rangeEnd",
                            value
                          )
                        }
                        min={0}
                        precision={2}
                      >
                        <NumberInputField
                          borderColor="gray.300"
                          _hover={{ borderColor: focusBorderColor }}
                          _focus={{
                            borderColor: focusBorderColor,
                            boxShadow: `0 0 0 1px ${focusBorderColor}`,
                          }}
                        />
                      </NumberInput>
                    </HStack>
                  ) : (
                    <Text fontSize="sm">
                      {`${(parseFloat(String(row.rangeStart)) || 0).toFixed(2)} - ${(parseFloat(String(row.rangeEnd)) || 0).toFixed(2)}`}
                    </Text>
                  )}
                </Td>

                {/* Employee Regular SS - Always Text */}
                <Td
                  borderWidth="1px"
                  borderColor={useColorModeValue("gray.200", "gray.700")}
                  isNumeric
                >
                  <Text fontSize="sm">{row.employeeRegularSS.toFixed(2)}</Text>
                </Td>

                {/* Employee MPF - Always Text */}
                <Td
                  borderWidth="1px"
                  borderColor={useColorModeValue("gray.200", "gray.700")}
                  isNumeric
                >
                  <Text fontSize="sm">{row.employeeMPF.toFixed(2)}</Text>
                </Td>

                {/* Employee Total - Always Text */}
                <Td
                  borderWidth="1px"
                  borderColor={useColorModeValue("gray.200", "gray.700")}
                  isNumeric
                >
                  {row.employeeTotal.toFixed(2)}
                </Td>

                {/* Actions */}
                <Td
                  borderWidth="1px"
                  borderColor={useColorModeValue("gray.200", "gray.700")}
                  textAlign="center"
                >
                  <Button
                    size="sm"
                    colorScheme="red"
                    variant="ghost"
                    onClick={() => deleteSSSRange(row._id || row.id)}
                    isDisabled={
                      index === 0 || index !== sssData.length - 1 || isEditing
                    } // Also disable delete when editing
                    _hover={{
                      bg: "red.50",
                    }}
                    _disabled={{
                      // More specific disabled styles
                      cursor: "not-allowed",
                      opacity: 0.6,
                    }}
                  >
                    Delete
                  </Button>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </TableContainer>
      <Flex justify="flex-start" mt={4}>
        <Button
          leftIcon={<AddIcon />}
          colorScheme={addButtonColorScheme}
          onClick={addNewSSSRange}
          variant="outline"
          size="sm"
          isDisabled={isEditing} // Disable add when editing
          _hover={{
            bg: headerBgColor,
            color: "white",
          }}
          _disabled={{
            // More specific disabled styles
            cursor: "not-allowed",
            opacity: 0.6,
          }}
        />
      </Flex>
      <Text fontSize="sm" color="gray.600" mt={2}>
        * Click 'Edit Ranges' to modify compensation ranges, then 'Save
        Changes'.
      </Text>
    </Box>
  );
};

export default SSSTable;
