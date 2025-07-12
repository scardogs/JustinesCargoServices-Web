// Frontend: VehicleLogsTable.js
import React, { useEffect, useState } from "react";
import {
  Box,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Text,
  TableContainer,
  Flex,
} from "@chakra-ui/react";
import axios from "axios";

function VehicleLogsTable() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    axios
      .get(process.env.NEXT_PUBLIC_BACKEND_API + "/api/vehicleLogs")
      .then((response) => setLogs(response.data))
      .catch((error) => console.error(error));
  }, []);

  return (
    <Box>
      {/* Header */}
      <Flex borderBottomWidth="1px" borderColor="gray.200" mb={4}>
        <Text
          px={4}
          py={3}
          fontWeight="medium"
          color="#1a365d"
          borderBottomWidth="2px"
          borderColor="#1a365d"
        >
          Vehicles Logs
        </Text>
      </Flex>

      {/* Main Content */}
      <Box bg="white" rounded="lg" shadow="md" borderWidth="1px">
        {/* Table */}
        <TableContainer maxHeight="63vh" overflowY="auto">
          <Table variant="simple">
            <Thead position="sticky" top={0} zIndex={1} bg="gray.200">
              <Tr>
                <Th color="black">ACTION</Th>
                <Th color="black">DETAILS</Th>
                <Th color="black">TIMESTAMP</Th>
              </Tr>
            </Thead>
            <Tbody>
              {logs.map((log) => (
                <Tr
                  key={log._id}
                  _hover={{ bg: "gray.50" }}
                  transition="all 0.2s"
                >
                  <Td fontWeight={log.action === "Added" ? "medium" : "normal"}>
                    {log.action}
                  </Td>
                  <Td>{log.details}</Td>
                  <Td>{new Date(log.timestamp).toLocaleString()}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </TableContainer>
      </Box>
    </Box>
  );
}

export default VehicleLogsTable;
