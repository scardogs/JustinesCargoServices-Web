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
  useToast,
} from "@chakra-ui/react";
import { AddIcon, EditIcon } from "@chakra-ui/icons";

const PagibigTable = () => {
  const [pagibigData, setPagibigData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const toast = useToast();

  useEffect(() => {
    fetchPagibigData();
  }, []);

  const fetchPagibigData = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/pagibig-contributions`
      );
      if (response.data.success) {
        setPagibigData(response.data.data);
      } else {
        throw new Error(response.data.error || "Failed to fetch Pagibig data");
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

  const handlePagibigFieldUpdate = (id, field, value) => {
    if (!isEditing && field !== "rangeStart" && field !== "rangeEnd") return;

    setPagibigData((prevData) =>
      prevData.map((row) => {
        if (row._id === id || row.id === id) {
          const updatedRow = { ...row };
          const numValue = parseFloat(value) || 0;

          if (field === "rangeStart" || field === "rangeEnd") {
            if (isEditing) updatedRow[field] = numValue;
          } else if (field === "employeeShare" || field === "employerShare") {
            if (isEditing)
              updatedRow[field] = Math.min(Math.max(numValue, 0), 100);
          }
          return updatedRow;
        }
        return row;
      })
    );
  };

  const addNewPagibigRange = async () => {
    const lastRow =
      pagibigData.length > 0 ? pagibigData[pagibigData.length - 1] : null;

    const newRangeStart = lastRow ? lastRow.rangeEnd + 0.01 : 0;
    const newRangeEnd = newRangeStart + 1499.99;

    const newContributionData = {
      rangeStart: newRangeStart,
      rangeEnd: newRangeEnd,
      employeeShare: lastRow ? lastRow.employeeShare : 1,
      employerShare: lastRow ? lastRow.employerShare : 2,
    };

    setIsLoading(true);
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/pagibig-contributions`,
        newContributionData
      );
      if (response.data.success) {
        setPagibigData([...pagibigData, response.data.data]);
        toast({
          title: "Success",
          description: "New Pagibig range added and saved.",
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

  const deletePagibigRange = async (id) => {
    const rowToDelete = pagibigData.find(
      (row) => row._id === id || row.id === id
    );
    const actualId = rowToDelete ? rowToDelete._id : null;

    if (!actualId) {
      setPagibigData((prevData) => prevData.filter((row) => row.id !== id));
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.delete(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/pagibig-contributions/${actualId}`
      );
      if (response.data.success) {
        setPagibigData((prevData) =>
          prevData.filter((row) => row._id !== actualId)
        );
        toast({
          title: "Success",
          description: "Pagibig range deleted successfully.",
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
    const updatedData = pagibigData.map((row) => ({
      _id: row._id,
      rangeStart: row.rangeStart,
      rangeEnd: row.rangeEnd,
      employeeShare: row.employeeShare,
      employerShare: row.employerShare,
    }));

    setIsLoading(true);
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/pagibig-contributions/bulk`,
        updatedData
      );
      if (response.data.success) {
        await fetchPagibigData();
        setIsEditing(false);
        toast({
          title: "Success",
          description: "Pag-IBIG contributions updated successfully",
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
          PAG-IBIG Contribution Table
        </Text>
        <HStack>
          <Button
            leftIcon={<EditIcon />}
            colorScheme="blue"
            variant="outline"
            size="sm"
            onClick={() => setIsEditing(!isEditing)}
            _hover={{
              bg: isEditing ? "gray.100" : "blue.50",
            }}
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
            _disabled={{
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
              <Th color={headerTextColor} textAlign="center">
                Monthly Compensation Range
              </Th>
              <Th color={headerTextColor} textAlign="center">
                Employee Share (%)
              </Th>
              <Th color={headerTextColor} textAlign="center">
                Employer Share (%)
              </Th>
              <Th color={headerTextColor} textAlign="center" width="100px">
                Actions
              </Th>
            </Tr>
          </Thead>
          <Tbody>
            {pagibigData.map((row, index) => (
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
                    <HStack spacing={2}>
                      <NumberInput
                        size="sm"
                        value={row.rangeStart}
                        onChange={(value) =>
                          handlePagibigFieldUpdate(
                            row._id || row.id,
                            "rangeStart",
                            value
                          )
                        }
                        min={0}
                        precision={2}
                        width="150px"
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
                      <Text>to</Text>
                      <NumberInput
                        size="sm"
                        value={row.rangeEnd}
                        onChange={(value) =>
                          handlePagibigFieldUpdate(
                            row._id || row.id,
                            "rangeEnd",
                            value
                          )
                        }
                        min={0}
                        precision={2}
                        width="150px"
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
                    <Text fontSize="sm">
                      {row.rangeStart.toFixed(2)} - {row.rangeEnd.toFixed(2)}
                    </Text>
                  )}
                </Td>
                <Td
                  borderWidth="1px"
                  borderColor={useColorModeValue("gray.200", "gray.700")}
                >
                  {isEditing ? (
                    <NumberInput
                      size="sm"
                      value={row.employeeShare}
                      onChange={(value) =>
                        handlePagibigFieldUpdate(
                          row._id || row.id,
                          "employeeShare",
                          value
                        )
                      }
                      min={0}
                      max={100}
                      precision={2}
                      width="100px"
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
                  ) : (
                    <Text textAlign="center" fontSize="sm">
                      {row.employeeShare.toFixed(2)}%
                    </Text>
                  )}
                </Td>
                <Td
                  borderWidth="1px"
                  borderColor={useColorModeValue("gray.200", "gray.700")}
                >
                  {isEditing ? (
                    <NumberInput
                      size="sm"
                      value={row.employerShare}
                      onChange={(value) =>
                        handlePagibigFieldUpdate(
                          row._id || row.id,
                          "employerShare",
                          value
                        )
                      }
                      min={0}
                      max={100}
                      precision={2}
                      width="100px"
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
                  ) : (
                    <Text textAlign="center" fontSize="sm">
                      {row.employerShare.toFixed(2)}%
                    </Text>
                  )}
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
                    onClick={() => deletePagibigRange(row._id || row.id)}
                    isDisabled={
                      index === 0 ||
                      index !== pagibigData.length - 1 ||
                      isEditing
                    }
                    _hover={{
                      bg: "red.50",
                    }}
                    _disabled={{
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
          onClick={addNewPagibigRange}
          variant="outline"
          size="sm"
          isDisabled={isEditing}
          _hover={{
            bg: headerBgColor,
            color: "white",
          }}
          _disabled={{
            cursor: "not-allowed",
            opacity: 0.6,
          }}
        ></Button>
      </Flex>
      <Text fontSize="sm" color="gray.600" mt={2}>
        * Click 'Edit Table' to modify ranges and shares, then 'Save Changes'.
      </Text>
    </Box>
  );
};

export default PagibigTable;
