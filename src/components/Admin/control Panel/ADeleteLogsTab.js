import React, { useState, useEffect } from "react";
import {
  Box,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  useToast,
  Flex,
  Text,
  Input,
  InputGroup,
  InputLeftElement,
  Select,
  IconButton,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  Button,
  Code,
  Textarea, // Use Textarea for potentially large JSON data
  useDisclosure,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  HStack,
  Tooltip,
  Spinner, // Added for loading state
} from "@chakra-ui/react";
import axios from "axios";
import {
  FiSearch,
  FiEye,
  FiTrash2,
  FiRotateCcw,
  FiChevronLeft,
  FiChevronRight,
} from "react-icons/fi";

const DeleteLogsTab = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterModule, setFilterModule] = useState("");
  const [selectedLog, setSelectedLog] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const toast = useToast();
  const [logToAction, setLogToAction] = useState(null);
  const {
    isOpen: isRestoreOpen,
    onOpen: onRestoreOpen,
    onClose: onRestoreClose,
  } = useDisclosure();
  const {
    isOpen: isPermanentDeleteOpen,
    onOpen: onPermanentDeleteOpen,
    onClose: onPermanentDeleteClose,
  } = useDisclosure();
  const cancelRef = React.useRef();
  const [isRestoring, setIsRestoring] = useState(false);
  const [isDeletingPermanently, setIsDeletingPermanently] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10); // Or any default value

  useEffect(() => {
    fetchDeleteLogs();
  }, []);

  const fetchDeleteLogs = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      if (!token) {
        setLogs([]);
        toast({
          title: "Authentication Error",
          description: "Please log in again.",
          status: "warning",
          duration: 5000,
          isClosable: true,
        });
        return;
      }

      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/delete-logs`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setLogs(response.data);
    } catch (error) {
      console.error("Error fetching delete logs:", error);
      if (
        error.response &&
        (error.response.status === 401 || error.response.status === 403)
      ) {
        setLogs([]);
        toast({
          title: "Authentication Error",
          description: "Session expired. Please log in again.",
          status: "warning",
          duration: 5000,
          isClosable: true,
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch delete logs.",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleString();
  };

  const getStatus = (log) => {
    if (log.isDeletedPermanently) {
      return { label: "Permanent", color: "purple" };
    }
    if (log.restoredAt) {
      return { label: "Restored", color: "blue" };
    }
    return { label: "Deleted", color: "orange" };
  };

  const handleViewLog = (log) => {
    setSelectedLog(log);
    setIsViewModalOpen(true);
  };

  // Filtering logic
  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      searchTerm === "" ||
      log.module?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.userRole?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.originalCollection
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      log.dataType?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesModule = filterModule === "" || log.module === filterModule;

    return matchesSearch && matchesModule;
  });

  // --- Pagination Logic ---
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentLogs = filteredLogs.slice(indexOfFirstItem, indexOfLastItem);

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalPages) return; // Prevent invalid page numbers
    setCurrentPage(newPage);
  };

  const uniqueModules = [
    ...new Set(logs.map((log) => log.module).filter(Boolean)),
  ];

  // --- Restore Handler ---
  const handleRestoreClick = (log) => {
    setLogToAction(log);
    onRestoreOpen();
  };

  const confirmRestore = async () => {
    if (!logToAction) return;
    try {
      setIsRestoring(true);
      const token = localStorage.getItem("token");
      await axios.put(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/delete-logs/${logToAction._id}/restore`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      toast({
        title: "Success",
        description: "Item restored successfully.",
        status: "success",
      });
      fetchDeleteLogs(); // Refresh list
    } catch (error) {
      console.error("Error restoring item:", error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to restore item.",
        status: "error",
      });
    }
    onRestoreClose();
    setLogToAction(null);
    setIsRestoring(false);
  };

  // --- Permanent Delete Handler ---
  const handlePermanentDeleteClick = (log) => {
    setLogToAction(log);
    onPermanentDeleteOpen();
  };

  const confirmPermanentDelete = async () => {
    if (!logToAction) return;
    try {
      setIsDeletingPermanently(true);
      const token = localStorage.getItem("token");
      await axios.put(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/delete-logs/${logToAction._id}/permanent-delete`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      toast({
        title: "Success",
        description: "Item marked as permanently deleted.",
        status: "success",
      });
      fetchDeleteLogs(); // Refresh list
    } catch (error) {
      console.error("Error marking item as permanently deleted:", error);
      toast({
        title: "Error",
        description:
          error.response?.data?.message || "Failed to permanently delete item.",
        status: "error",
      });
    }
    onPermanentDeleteClose();
    setLogToAction(null);
    setIsDeletingPermanently(false);
  };

  return (
    <Box>
      {/* Search and Filter */}
      <Flex mb={4} gap={4} wrap="wrap">
        <InputGroup maxW="350px">
          <InputLeftElement pointerEvents="none">
            <FiSearch color="gray.300" />
          </InputLeftElement>
          <Input
            placeholder="Search logs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </InputGroup>

        <Select
          placeholder="Filter by Module"
          maxW="200px"
          value={filterModule}
          onChange={(e) => setFilterModule(e.target.value)}
        >
          <option value="">All Modules</option>
          {uniqueModules.map((mod) => (
            <option key={mod} value={mod}>
              {mod}
            </option>
          ))}
        </Select>
      </Flex>

      {/* Logs Table */}
      <Box overflowX="auto">
        <Table variant="simple" size="sm">
          <Thead>
            <Tr>
              <Th>Module</Th>
              <Th>User Role</Th>
              <Th>Username</Th>
              <Th>Collection</Th>
              <Th>Data Type</Th>
              <Th>Deleted At</Th>
              <Th>Status</Th>
              <Th>Restored By</Th>
              <Th>Restored At</Th>
              <Th>Actions</Th>
            </Tr>
          </Thead>
          <Tbody>
            {loading ? (
              <Tr>
                <Td colSpan={10} textAlign="center">
                  Loading...
                </Td>
              </Tr>
            ) : filteredLogs.length > 0 ? (
              currentLogs.map((log) => {
                const status = getStatus(log);
                const canRestore = !log.restoredAt && !log.isDeletedPermanently;
                const canPermanentlyDelete =
                  !log.isDeletedPermanently && !log.restoredAt; // Can't permanently delete restored items

                return (
                  <Tr key={log._id}>
                    <Td>{log.module || "-"}</Td>
                    <Td>{log.userRole || "-"}</Td>
                    <Td>{log.username || "-"}</Td>
                    <Td>{log.originalCollection || "-"}</Td>
                    <Td>{log.dataType || "-"}</Td>
                    <Td whiteSpace="nowrap">{formatDateTime(log.deletedAt)}</Td>
                    <Td>
                      <Badge colorScheme={status.color}>{status.label}</Badge>
                    </Td>
                    <Td>{log.restoredBy || "-"}</Td>
                    <Td whiteSpace="nowrap">
                      {formatDateTime(log.restoredAt)}
                    </Td>
                    <Td>
                      <HStack spacing={1}>
                        <Tooltip label="View Details" placement="top">
                          <IconButton
                            icon={<FiEye />}
                            size="xs"
                            variant="ghost"
                            aria-label="View Details"
                            onClick={() => handleViewLog(log)}
                          />
                        </Tooltip>
                        {canRestore && (
                          <Tooltip label="Restore Item" placement="top">
                            <IconButton
                              icon={<FiRotateCcw />}
                              size="xs"
                              variant="ghost"
                              colorScheme="green"
                              aria-label="Restore Item"
                              onClick={() => handleRestoreClick(log)}
                            />
                          </Tooltip>
                        )}
                        {canPermanentlyDelete && (
                          <Tooltip label="Delete Permanently" placement="top">
                            <IconButton
                              icon={<FiTrash2 />}
                              size="xs"
                              variant="ghost"
                              colorScheme="red"
                              aria-label="Delete Permanently"
                              onClick={() => handlePermanentDeleteClick(log)}
                            />
                          </Tooltip>
                        )}
                      </HStack>
                    </Td>
                  </Tr>
                );
              })
            ) : (
              <Tr>
                <Td colSpan={10} textAlign="center">
                  No delete logs found.
                </Td>
              </Tr>
            )}
          </Tbody>
        </Table>
      </Box>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <Flex justify="center" align="center" mt={4}>
          <IconButton
            icon={<FiChevronLeft />}
            onClick={() => handlePageChange(currentPage - 1)}
            isDisabled={currentPage === 1}
            aria-label="Previous Page"
            mr={2}
          />
          <Text>
            Page {currentPage} of {totalPages}
          </Text>
          <IconButton
            icon={<FiChevronRight />}
            onClick={() => handlePageChange(currentPage + 1)}
            isDisabled={currentPage === totalPages}
            aria-label="Next Page"
            ml={2}
          />
        </Flex>
      )}

      {/* View Log Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        size="xl"
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Log Details</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {selectedLog && (
              <Box>
                <Text fontWeight="bold">Log ID:</Text>
                <Text mb={2} fontSize="sm">
                  {selectedLog._id}
                </Text>

                <Text fontWeight="bold">Module:</Text>
                <Text mb={2}>{selectedLog.module}</Text>

                <Text fontWeight="bold">User:</Text>
                <Text mb={2}>
                  {selectedLog.username} ({selectedLog.userRole})
                </Text>

                <Text fontWeight="bold">Original Collection:</Text>
                <Text mb={2}>{selectedLog.originalCollection}</Text>

                <Text fontWeight="bold">Data Type:</Text>
                <Text mb={2}>{selectedLog.dataType}</Text>

                <Text fontWeight="bold">Status:</Text>
                <Badge mb={2} colorScheme={getStatus(selectedLog).color}>
                  {getStatus(selectedLog).label}
                </Badge>

                <Text fontWeight="bold">Deleted At:</Text>
                <Text mb={2}>{formatDateTime(selectedLog.deletedAt)}</Text>

                {selectedLog.restoredAt && (
                  <>
                    <Text fontWeight="bold">Restored By:</Text>
                    <Text mb={2}>{selectedLog.restoredBy}</Text>
                    <Text fontWeight="bold">Restored At:</Text>
                    <Text mb={2}>{formatDateTime(selectedLog.restoredAt)}</Text>
                  </>
                )}

                <Text fontWeight="bold">Deleted Data:</Text>
                <Textarea
                  isReadOnly
                  value={JSON.stringify(selectedLog.deletedData, null, 2)} // Pretty print JSON
                  size="sm"
                  height="200px" // Adjust as needed
                  fontFamily="monospace"
                />
              </Box>
            )}
          </ModalBody>
          <ModalFooter>
            <Button onClick={() => setIsViewModalOpen(false)}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Restore Confirmation Dialog */}
      <AlertDialog
        isOpen={isRestoreOpen}
        leastDestructiveRef={cancelRef}
        onClose={onRestoreClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Restore Item
            </AlertDialogHeader>
            <AlertDialogBody>
              Restore the selected {logToAction?.dataType || "item"}?
              <br />
              This was originally deleted from{" "}
              {logToAction?.module || "a module"}.
              <br />
              It will be added back to the '${logToAction?.originalCollection}'
              data.
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onRestoreClose}>
                Cancel
              </Button>
              <Button
                colorScheme="green"
                onClick={confirmRestore}
                ml={3}
                isLoading={isRestoring}
              >
                Restore
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>

      {/* Permanent Delete Confirmation Dialog */}
      <AlertDialog
        isOpen={isPermanentDeleteOpen}
        leastDestructiveRef={cancelRef}
        onClose={onPermanentDeleteClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold" color="red.600">
              Permanently Delete Item
            </AlertDialogHeader>
            <AlertDialogBody>
              <Text fontWeight="bold" color="red.500">
                This action cannot be undone.
              </Text>
              Are you sure you want to permanently delete this log entry?
              {logToAction &&
                ` (Type: ${logToAction.dataType}, Module: ${logToAction.module})`}
              The original data will NOT be recoverable through this system
              after this action.
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onPermanentDeleteClose}>
                Cancel
              </Button>
              <Button
                colorScheme="red"
                onClick={confirmPermanentDelete}
                ml={3}
                isLoading={isDeletingPermanently}
              >
                Delete Permanently
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
};

export default DeleteLogsTab;
