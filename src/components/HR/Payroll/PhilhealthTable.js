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
  TableContainer,
  Button,
  HStack,
  Flex,
  Text,
  useColorModeValue,
  NumberInput,
  NumberInputField,
  Select,
  useToast,
} from "@chakra-ui/react";
import { AddIcon, EditIcon } from "@chakra-ui/icons";

const PhilhealthTable = () => {
  const [philhealthData, setPhilhealthData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const toast = useToast();

  useEffect(() => {
    fetchPhilhealthData();
  }, []);

  const fetchPhilhealthData = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/philhealth-contributions`
      );
      if (response.data.success) {
        setPhilhealthData(response.data.data);
      } else {
        throw new Error(
          response.data.error || "Failed to fetch Philhealth data"
        );
      }
    } catch (err) {
      setError(err.message);
      toast({
        title: "Error Loading Data",
        description: err.message,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhilhealthFieldUpdate = (id, field, valueString) => {
    if (!isEditing) return;

    setPhilhealthData((prevData) =>
      prevData.map((row) => {
        if (row._id === id || row.id === id) {
          const updatedRow = { ...row };

          if (
            field === "startRange" ||
            field === "endRange" ||
            field === "monthlyPremium"
          ) {
            // Store the raw string from NumberInput to allow flexible decimal input
            updatedRow[field] = valueString;

            if (field === "monthlyPremium") {
              // Calculate shares based on the new string value of monthlyPremium
              let premiumForCalc;
              const currentPremiumStr = valueString; // as updatedRow.monthlyPremium is now valueString

              if (
                currentPremiumStr === null ||
                currentPremiumStr === undefined ||
                currentPremiumStr.trim() === "" ||
                currentPremiumStr === "."
              ) {
                premiumForCalc = 0;
              } else {
                let num;
                // Handle cases like "123." by parsing the part before the dot
                if (
                  currentPremiumStr.endsWith(".") &&
                  currentPremiumStr.length > 1
                ) {
                  num = parseFloat(currentPremiumStr.slice(0, -1));
                } else {
                  num = parseFloat(currentPremiumStr);
                }
                premiumForCalc = isNaN(num) ? 0 : num;
              }
              updatedRow.employeeShare = premiumForCalc / 2;
              updatedRow.employerShare = premiumForCalc / 2;
            }
          } else {
            // For any other fields (if any in the future), handle them directly.
            updatedRow[field] = valueString;
          }

          return updatedRow;
        }
        return row;
      })
    );
  };

  const addNewPhilhealthRange = async () => {
    const lastRow =
      philhealthData.length > 0
        ? philhealthData[philhealthData.length - 1]
        : null;

    let newStartRange = 10000;
    if (lastRow) {
      newStartRange = (lastRow.endRange || lastRow.startRange) + 0.01;
    }
    const newMonthlyPremium = 500;

    const newContributionData = {
      startRange: newStartRange,
      endRange: null,
      monthlyPremium: newMonthlyPremium,
    };

    setIsLoading(true);
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/philhealth-contributions`,
        newContributionData
      );
      if (response.data.success) {
        setPhilhealthData([...philhealthData, response.data.data]);
        toast({
          title: "Success",
          description: "New Philhealth range added and saved.",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
      } else {
        throw new Error(response.data.error || "Failed to save new range.");
      }
    } catch (err) {
      setError(err.message);
      toast({
        title: "Error Adding Range",
        description: err.message,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const deletePhilhealthRange = async (id) => {
    const rowToDelete = philhealthData.find(
      (row) => row._id === id || row.id === id
    );
    const actualId = rowToDelete ? rowToDelete._id : null;

    if (!actualId) {
      setPhilhealthData((prevData) => prevData.filter((row) => row.id !== id));
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.delete(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/philhealth-contributions/${actualId}`
      );
      if (response.data.success) {
        setPhilhealthData((prevData) =>
          prevData.filter((row) => row._id !== actualId)
        );
        toast({
          title: "Success",
          description: "Philhealth range deleted successfully.",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
      } else {
        throw new Error(response.data.error || "Failed to delete range.");
      }
    } catch (err) {
      setError(err.message);
      toast({
        title: "Error Deleting Range",
        description: err.message,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveAllChanges = async () => {
    const updatedData = philhealthData.map((row) => ({
      _id: row._id,
      startRange: row.startRange,
      endRange: row.endRange === 0 ? null : row.endRange,
      monthlyPremium: row.monthlyPremium,
    }));

    setIsLoading(true);
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/philhealth-contributions/bulk`,
        updatedData
      );
      if (response.data.success) {
        await fetchPhilhealthData();
        setIsEditing(false);
        toast({
          title: "Success",
          description: "Philhealth contributions updated successfully",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
      } else {
        throw new Error(response.data.error || "Failed to save updates.");
      }
    } catch (err) {
      setError(err.message);
      toast({
        title: "Error Saving Changes",
        description: err.message,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const headerBgColor = "#1a365d";
  const headerTextColor = "white";
  const addButtonColorScheme = "blue";
  const focusBorderColor = "#800020";
  const rowHoverBg = useColorModeValue("gray.100", "gray.700");
  const oddRowBg = useColorModeValue("white", "gray.800");
  const evenRowBg = useColorModeValue("gray.50", "gray.900");

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={4}>
        <Text fontSize="md" fontWeight="semibold" color={headerBgColor}>
          PHILHEALTH Contribution Table
        </Text>
        <HStack>
          <Button
            leftIcon={<EditIcon />}
            colorScheme="blue"
            variant="outline"
            size="sm"
            onClick={() => setIsEditing(!isEditing)}
            _hover={{ bg: isEditing ? "gray.100" : "blue.50" }}
          >
            {isEditing ? "Cancel Edit" : "Edit Table"}
          </Button>
          <Button
            colorScheme="green"
            size="sm"
            onClick={saveAllChanges}
            isLoading={isLoading}
            isDisabled={!isEditing}
            _hover={{
              bg: isEditing ? "green.600" : "gray.300",
              cursor: isEditing ? "pointer" : "not-allowed",
            }}
            _disabled={{ bg: "gray.300", cursor: "not-allowed", opacity: 0.6 }}
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
              <Th color={headerTextColor} textAlign="center">
                Monthly Basic Salary
              </Th>
              <Th color={headerTextColor} textAlign="center">
                Monthly Premium
              </Th>
              <Th color={headerTextColor} textAlign="center">
                Employee Share
              </Th>
              <Th color={headerTextColor} textAlign="center">
                Employer Share
              </Th>
              <Th color={headerTextColor} textAlign="center" width="100px">
                Actions
              </Th>
            </Tr>
          </Thead>
          <Tbody>
            {philhealthData.map((row, index) => (
              <Tr
                key={row._id || row.id}
                _hover={{ bg: rowHoverBg }}
                bg={index % 2 === 0 ? evenRowBg : oddRowBg}
              >
                <Td
                  borderWidth="1px"
                  borderColor={useColorModeValue("gray.200", "gray.700")}
                >
                  {isEditing ? (
                    <HStack spacing={2} align="center">
                      <Text>₱</Text>
                      <NumberInput
                        size="sm"
                        value={
                          row.startRange === undefined ||
                          row.startRange === null
                            ? ""
                            : row.startRange
                        }
                        onChange={(valueString) =>
                          handlePhilhealthFieldUpdate(
                            row._id || row.id,
                            "startRange",
                            valueString
                          )
                        }
                        min={0}
                        precision={2}
                        width="120px"
                        isDisabled={!isEditing}
                      >
                        <NumberInputField
                          placeholder="Start Range"
                          borderColor="gray.300"
                          _hover={{ borderColor: focusBorderColor }}
                          _focus={{
                            borderColor: focusBorderColor,
                            boxShadow: `0 0 0 1px ${focusBorderColor}`,
                          }}
                          readOnly={!isEditing}
                        />
                      </NumberInput>
                      <Text> - </Text>
                      <NumberInput
                        size="sm"
                        value={
                          row.endRange === null || row.endRange === undefined
                            ? ""
                            : row.endRange
                        }
                        onChange={(valueString) =>
                          handlePhilhealthFieldUpdate(
                            row._id || row.id,
                            "endRange",
                            valueString
                          )
                        }
                        min={0}
                        precision={2}
                        width="120px"
                        isDisabled={!isEditing}
                        allowMouseWheel
                      >
                        <NumberInputField
                          placeholder="End Range (optional)"
                          borderColor="gray.300"
                          _hover={{ borderColor: focusBorderColor }}
                          _focus={{
                            borderColor: focusBorderColor,
                            boxShadow: `0 0 0 1px ${focusBorderColor}`,
                          }}
                          readOnly={!isEditing}
                        />
                      </NumberInput>
                    </HStack>
                  ) : (
                    <Text fontSize="sm" textAlign="center">
                      ₱
                      {(typeof row.startRange === "number"
                        ? row.startRange
                        : 0
                      ).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                      {row.endRange !== null && row.endRange !== undefined
                        ? ` - ₱${(typeof row.endRange === "number"
                            ? row.endRange
                            : 0
                          ).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}`
                        : " and above"}
                    </Text>
                  )}
                </Td>
                <Td
                  borderWidth="1px"
                  borderColor={useColorModeValue("gray.200", "gray.700")}
                >
                  {isEditing ? (
                    <HStack spacing={2}>
                      <Text>₱</Text>
                      <NumberInput
                        size="sm"
                        value={
                          row.monthlyPremium === undefined ||
                          row.monthlyPremium === null
                            ? ""
                            : row.monthlyPremium
                        }
                        onChange={(valueString) =>
                          handlePhilhealthFieldUpdate(
                            row._id || row.id,
                            "monthlyPremium",
                            valueString
                          )
                        }
                        min={0}
                        precision={2}
                        width="120px"
                        isDisabled={!isEditing}
                      >
                        <NumberInputField
                          borderColor="gray.300"
                          _hover={{ borderColor: focusBorderColor }}
                          _focus={{
                            borderColor: focusBorderColor,
                            boxShadow: `0 0 0 1px ${focusBorderColor}`,
                          }}
                          readOnly={!isEditing}
                        />
                      </NumberInput>
                    </HStack>
                  ) : (
                    <Text fontSize="sm" textAlign="center">
                      ₱
                      {row.monthlyPremium.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </Text>
                  )}
                </Td>
                <Td
                  borderWidth="1px"
                  borderColor={useColorModeValue("gray.200", "gray.700")}
                  textAlign="center"
                >
                  <Text fontSize="sm">
                    ₱
                    {row.employeeShare.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </Text>
                </Td>
                <Td
                  borderWidth="1px"
                  borderColor={useColorModeValue("gray.200", "gray.700")}
                  textAlign="center"
                >
                  <Text fontSize="sm">
                    ₱
                    {row.employerShare.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </Text>
                </Td>
                <Td
                  borderWidth="1px"
                  borderColor={useColorModeValue("gray.200", "gray.700")}
                  textAlign="center"
                >
                  <Button
                    size="sm"
                    colorScheme="red"
                    variant="ghost"
                    onClick={() => deletePhilhealthRange(row._id || row.id)}
                    isDisabled={
                      index === 0 ||
                      index !== philhealthData.length - 1 ||
                      isEditing
                    }
                    _hover={{ bg: "red.50" }}
                    _disabled={{ cursor: "not-allowed", opacity: 0.6 }}
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
          onClick={addNewPhilhealthRange}
          variant="outline"
          size="sm"
          isDisabled={isEditing}
          _hover={{ bg: headerBgColor, color: "white" }}
          _disabled={{ cursor: "not-allowed", opacity: 0.6 }}
        ></Button>
      </Flex>
      <Text fontSize="sm" color="gray.600" mt={2}>
        * Click 'Edit Table' to modify salary/premium, then 'Save Changes'.
        Shares are auto-calculated.
      </Text>
    </Box>
  );
};

export default PhilhealthTable;
