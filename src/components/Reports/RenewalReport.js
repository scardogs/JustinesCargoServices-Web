import React, { useState, useEffect } from "react";
import {
  Box,
  Flex,
  Grid,
  Text,
  Button,
  Input,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  InputGroup,
  InputLeftElement,
  Spinner,
  TableContainer,
  useToast,
  VStack,
  Badge,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  HStack,
  Select,
  Skeleton,
  Heading,
  useDisclosure,
} from "@chakra-ui/react";
import {
  Search2Icon,
  TimeIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DownloadIcon,
} from "@chakra-ui/icons";
import axios from "axios";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

function RenewalReport() {
  const [renewalData, setRenewalData] = useState({
    lto: [],
    ltfrb: [],
    insurance: [],
  });
  const [stats, setStats] = useState({
    lto: { total: 0, pending: 0, renewed: 0, expired: 0 },
    ltfrb: { total: 0, pending: 0, renewed: 0, expired: 0 },
    insurance: { total: 0, pending: 0, renewed: 0, expired: 0 },
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isTabLoading, setIsTabLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [insuranceCSVData, setInsuranceCSVData] = useState([]);
  const [insuranceHistorySearchTerm, setInsuranceHistorySearchTerm] =
    useState("");
  const toast = useToast();
  const [historyData, setHistoryData] = useState([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [selectedVehicleInfo, setSelectedVehicleInfo] = useState({
    plateNo: "",
    type: "",
  });
  const {
    isOpen: isHistoryOpen,
    onOpen: onHistoryOpen,
    onClose: onHistoryClose,
  } = useDisclosure();

  useEffect(() => {
    fetchRenewalData();
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch (error) {
      console.error("Error formatting date:", error);
      return "-";
    }
  };

  const fetchRenewalData = async () => {
    setIsLoading(true);
    try {
      const ltoResponse = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/lto/paginate?page=1&limit=1000`
      );
      const ltfrbResponse = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/ltfrb/paginate?page=1&limit=1000`
      );
      const insuranceResponse = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/insurance/paginate?page=1&limit=1000`
      );

      const ltoData = (ltoResponse.data.data || []).map((item) => ({
        plateNo: item.plateNumber,
        vehicleType: item.vehicleType,
        color: item.color,
        mvucRate: item.mvucRate,
        dueDate: item.dueDate,
        registeredName: item.registeredName,
        orNumber: item.orNo,
        orDate: item.orDate,
        update: item.update,
        remarks: item.remarks,
      }));

      const ltfrbData = (ltfrbResponse.data.data || []).map((item) => ({
        plateNo: item.plateNo,
        caseNo: item.caseNo,
        decisionDate: item.decisionDate,
        expiryDate: item.expiryDate,
        update: item.update,
        remarks: item.remarks,
      }));

      const insuranceData = (insuranceResponse.data.data || []).reduce(
        (acc, current) => {
          const existingRecord = acc.find(
            (item) => item.plateNo === current.plateNo
          );
          if (!existingRecord) {
            acc.push({
              plateNo: current.plateNo,
              vehicleUnit: current.vehicleUnit,
              insuranceType: current.insuranceType,
              policyNo: current.policyNo,
              from: current.from,
              to: current.to,
              update: current.update,
              remarks: current.remarks,
            });
          } else {
            Object.keys(current).forEach((key) => {
              if (
                current[key] !== null &&
                current[key] !== undefined &&
                current[key] !== ""
              ) {
                existingRecord[key] = current[key];
              }
            });
          }
          return acc;
        },
        []
      );

      setRenewalData({
        lto: ltoData,
        ltfrb: ltfrbData,
        insurance: insuranceData,
      });

      calculateStats(ltoData, ltfrbData, insuranceData);
    } catch (error) {
      console.error("Error fetching renewal data:", error);
      toast({
        title: "Error",
        description: "Failed to fetch renewal data",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStats = (ltoData, ltfrbData, insuranceData) => {
    const ltoStats = {
      total: ltoData.length,
      pending: ltoData.filter((item) =>
        ["Pending", "PENDING"].includes(item.update)
      ).length,
      renewed: ltoData.filter((item) =>
        ["Renewed", "RENEWED"].includes(item.update)
      ).length,
      expired: ltoData.filter((item) =>
        ["Expired", "EXPIRED"].includes(item.update)
      ).length,
    };
    const ltfrbStats = {
      total: ltfrbData.length,
      pending: ltfrbData.filter((item) =>
        ["Pending", "PENDING"].includes(item.update)
      ).length,
      renewed: ltfrbData.filter((item) =>
        ["Renewed", "RENEWED"].includes(item.update)
      ).length,
      expired: ltfrbData.filter((item) =>
        ["Expired", "EXPIRED"].includes(item.update)
      ).length,
    };
    const insuranceStats = {
      total: insuranceData.length,
      pending: insuranceData.filter((item) =>
        ["Pending", "PENDING"].includes(item.update)
      ).length,
      renewed: insuranceData.filter((item) =>
        ["Renewed", "RENEWED"].includes(item.update)
      ).length,
      expired: insuranceData.filter((item) =>
        ["Expired", "EXPIRED"].includes(item.update)
      ).length,
    };
    setStats({ lto: ltoStats, ltfrb: ltfrbStats, insurance: insuranceStats });
  };

  const getTableColumns = () => {
    if (activeTab === 0) {
      return [
        { key: "plateNo", label: "Plate Number" },
        { key: "vehicleType", label: "Vehicle Type" },
        { key: "color", label: "Color" },
        { key: "mvucRate", label: "MVUC Rate" },
        { key: "dueDate", label: "Due Date", isDate: true },
        { key: "registeredName", label: "Registered Name" },
        { key: "orNumber", label: "OR Number" },
        { key: "orDate", label: "OR Date", isDate: true },
        { key: "update", label: "Status", isBadge: true },
        { key: "remarks", label: "Remarks" },
      ];
    } else if (activeTab === 1) {
      return [
        { key: "plateNo", label: "Plate Number" },
        { key: "caseNo", label: "Case Number" },
        { key: "decisionDate", label: "Decision Date", isDate: true },
        { key: "expiryDate", label: "Expiry Date", isDate: true },
        { key: "update", label: "Status", isBadge: true },
        { key: "remarks", label: "Remarks" },
      ];
    } else {
      return [
        { key: "plateNo", label: "Plate Number" },
        { key: "vehicleUnit", label: "Vehicle Unit" },
        { key: "insuranceType", label: "Insurance Type" },
        { key: "policyNo", label: "Policy No" },
        { key: "from", label: "From", isDate: true },
        { key: "to", label: "To", isDate: true },
        { key: "update", label: "Status", isBadge: true },
        { key: "remarks", label: "Remarks" },
      ];
    }
  };

  const formatValue = (value) => {
    if (value === "" || value === null || value === undefined) return "-";
    return value;
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "renewed":
        return "green";
      case "pending":
        return "yellow";
      case "expired":
        return "red";
      default:
        return "gray";
    }
  };

  const handleViewHistory = async (plateNo, type) => {
    setSelectedVehicleInfo({ plateNo, type });
    setIsHistoryLoading(true);
    onHistoryOpen();
    setHistoryData([]);

    let historyEndpoint = "";
    let backendPlateParam = plateNo; // Use plateNo by default

    if (type === "lto") {
      // Use plateNumber parameter for LTO history endpoint
      historyEndpoint = `${process.env.NEXT_PUBLIC_BACKEND_API}/api/lto-history/plate/${plateNo}`;
    } else if (type === "ltfrb") {
      // Use plateNo parameter for LTFRB history endpoint
      historyEndpoint = `${process.env.NEXT_PUBLIC_BACKEND_API}/api/ltfrb-history/plate/${plateNo}`;
    } else if (type === "insurance") {
      // Assuming plateNo for insurance history endpoint
      historyEndpoint = `${process.env.NEXT_PUBLIC_BACKEND_API}/api/insurance-history/plate/${plateNo}`;
    } else {
      toast({
        title: "Error",
        description: "Unknown history type",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      setIsHistoryLoading(false);
      return;
    }

    try {
      console.log(`Fetching history from: ${historyEndpoint}`);
      const response = await axios.get(historyEndpoint);
      console.log("History Response:", response.data);
      setHistoryData(response.data || []);
    } catch (error) {
      console.error(`Error fetching ${type} history for ${plateNo}:`, error);
      if (error.response && error.response.status === 404) {
        setHistoryData([]);
        toast({
          title: "No History Found",
          description: `No ${type.toUpperCase()} history found for plate number ${plateNo}. Check if the endpoint exists or if data is available.`,
          status: "info",
          duration: 4000, // Longer duration for info
          isClosable: true,
        });
      } else {
        toast({
          title: "Error Fetching History",
          description: `Failed to fetch ${type.toUpperCase()} history. ${error.message}`,
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      }
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const renderTable = (data) => {
    const filteredData = data.filter((record) => {
      if (!record || !searchTerm) return true;
      const searchField = "plateNo";
      return record[searchField]
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase());
    });

    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentData = filteredData.slice(startIndex, endIndex);
    const tableColumns = getTableColumns();

    return (
      <Box>
        <TableContainer>
          <Table variant="simple" size="md">
            <Thead
              bg="gray.50"
              position="sticky"
              top={0}
              zIndex={1}
              boxShadow="sm"
            >
              <Tr>
                {tableColumns.map((column) => (
                  <Th
                    key={column.key}
                    fontWeight="semibold"
                    color="gray.700"
                    py={4}
                    textAlign={column.key === "actions" ? "center" : "left"}
                  >
                    {column.label}
                  </Th>
                ))}
                <Th
                  fontWeight="semibold"
                  color="gray.700"
                  py={4}
                  textAlign="center"
                >
                  Actions
                </Th>
              </Tr>
            </Thead>
            <Tbody>
              {isTabLoading ? (
                Array(itemsPerPage)
                  .fill(0)
                  .map((_, index) => (
                    <Tr key={`skel-${index}`}>
                      {tableColumns.map((_, cidx) => (
                        <Td key={`skel-cell-${cidx}`}>
                          <Skeleton height="20px" />
                        </Td>
                      ))}
                      <Td textAlign="center">
                        <Skeleton height="30px" width="80px" />
                      </Td>
                    </Tr>
                  ))
              ) : currentData.length === 0 ? (
                <Tr>
                  <Td
                    colSpan={tableColumns.length + 1}
                    textAlign="center"
                    py={8}
                  >
                    <Text color="gray.500">
                      No records found matching your criteria
                    </Text>
                  </Td>
                </Tr>
              ) : (
                currentData.map((record, index) => (
                  <Tr
                    key={index}
                    _hover={{ bg: "gray.50" }}
                    transition="all 0.2s"
                  >
                    {tableColumns.map((column) => (
                      <Td key={column.key}>
                        {column.isBadge ? (
                          <Badge
                            bg={getStatusColor(record[column.key])}
                            color="white"
                            px={2}
                            py={1}
                            borderRadius="md"
                          >
                            {formatValue(record[column.key])}
                          </Badge>
                        ) : column.isDate ? (
                          formatDate(record[column.key])
                        ) : (
                          <Text
                            fontWeight={
                              column.key === "plateNo" ? "medium" : "normal"
                            }
                            color={
                              column.key === "plateNo" ? "#1a365d" : "inherit"
                            }
                          >
                            {formatValue(record[column.key])}
                          </Text>
                        )}
                      </Td>
                    ))}
                    <Td textAlign="center">
                      <Button
                        leftIcon={<TimeIcon />}
                        size="sm"
                        variant="ghost"
                        colorScheme="blue"
                        onClick={() =>
                          handleViewHistory(
                            record.plateNo,
                            activeTab === 0
                              ? "lto"
                              : activeTab === 1
                                ? "ltfrb"
                                : "insurance"
                          )
                        }
                      >
                        History
                      </Button>
                    </Td>
                  </Tr>
                ))
              )}
            </Tbody>
          </Table>
        </TableContainer>

        <Flex
          justify="space-between"
          align="center"
          mt={4}
          px={4}
          py={2}
          borderTopWidth="1px"
          borderColor="gray.200"
        >
          <HStack spacing={2}>
            <Text fontSize="sm" color="gray.600">
              Rows per page:
            </Text>
            <Select
              size="sm"
              w="75px"
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              bg="white"
              borderColor="gray.300"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </Select>
            <Text fontSize="sm" color="gray.600">
              Showing {filteredData.length === 0 ? 0 : startIndex + 1} to{" "}
              {Math.min(endIndex, filteredData.length)} of {filteredData.length}{" "}
              entries
            </Text>
          </HStack>

          <HStack spacing={2}>
            <Button
              size="sm"
              variant="outline"
              colorScheme="gray"
              leftIcon={<ChevronLeftIcon />}
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              isDisabled={currentPage === 1 || totalPages === 0}
            >
              Previous
            </Button>
            <Text fontSize="sm" color="gray.600">
              Page {currentPage} of {totalPages || 1}
            </Text>
            <Button
              size="sm"
              variant="outline"
              colorScheme="gray"
              rightIcon={<ChevronRightIcon />}
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages || 1))
              }
              isDisabled={currentPage === totalPages || totalPages === 0}
            >
              Next
            </Button>
          </HStack>
        </Flex>
      </Box>
    );
  };

  const handleGenerateHistoryReport = () => {
    if (!historyData || historyData.length === 0) {
      toast({
        title: "No History Data",
        description:
          "There is no history data to export for the selected vehicle.",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "letter",
    });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const type = selectedVehicleInfo.type.toUpperCase();
    const plateNo = selectedVehicleInfo.plateNo;

    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageWidth, 35, "F");
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(26, 54, 93);
    doc.text("JUSTINE'S CARGO SERVICES", 15, 15);
    doc.setFontSize(12);
    doc.setTextColor(128, 0, 32);
    doc.text(`${type} RENEWAL HISTORY REPORT`, pageWidth - 15, 15, {
      align: "right",
    });

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    doc.text("Mario C. Segovia - Prop", 15, 22);
    doc.text("Brgy. Ortiz St., Iloilo City • Philippines", 15, 27);

    doc.text(`Vehicle Plate No: ${plateNo}`, 15, 35);
    const today = new Date();
    const dateStr = today.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    doc.text(`Generated on: ${dateStr}`, pageWidth - 15, 35, {
      align: "right",
    });

    let reportColumns = [];
    let reportBody = [];
    const tableTop = 45;

    if (type === "LTO") {
      reportColumns = [
        { header: "OR Number", dataKey: "orNumber" },
        { header: "OR Date", dataKey: "orDate" },
        { header: "Date Recorded", dataKey: "renewedDate" },
      ];
      reportBody = historyData.map((item) => ({
        orNumber: formatValue(item.orNumber),
        orDate: formatDate(item.orDate),
        renewedDate: formatDate(item.renewedDate),
      }));
    } else if (type === "LTFRB") {
      reportColumns = [
        { header: "Case Number", dataKey: "caseNo" },
        { header: "Decision Date", dataKey: "decisionDate" },
        { header: "Expiry Date", dataKey: "expiryDate" },
        { header: "Date Recorded", dataKey: "renewedDate" },
      ];
      reportBody = historyData.map((item) => ({
        caseNo: formatValue(item.caseNo),
        decisionDate: formatDate(item.decisionDate),
        expiryDate: formatDate(item.expiryDate),
        renewedDate: formatDate(item.renewedDate),
      }));
    } else if (type === "INSURANCE") {
      reportColumns = [
        { header: "Policy Number", dataKey: "policyNo" },
        { header: "Coverage Start", dataKey: "from" },
        { header: "Coverage End", dataKey: "to" },
        { header: "Date Recorded", dataKey: "renewedDate" },
      ];
      reportBody = historyData.map((item) => ({
        policyNo: formatValue(item.policyNo),
        from: formatDate(item.from),
        to: formatDate(item.to),
        renewedDate: formatDate(item.renewedDate),
      }));
    }

    autoTable(doc, {
      columns: reportColumns,
      body: reportBody,
      startY: tableTop,
      theme: "grid",
      headStyles: {
        fillColor: [26, 54, 93],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        halign: "center",
      },
      bodyStyles: {
        fontSize: 9,
        cellPadding: 2,
        halign: "center",
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
      margin: { left: 15, right: 15, bottom: 20 },
      didDrawPage: (data) => {
        doc.setFontSize(8);
        doc.setTextColor(100);
        doc.text(
          `Page ${data.pageNumber} of ${doc.internal.getNumberOfPages()}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: "center" }
        );
        doc.text("Justine's Cargo Services", 15, pageHeight - 10);
      },
    });

    const formattedDate = today.toISOString().split("T")[0];
    doc.save(
      `JCS-Renewal-History-Report-${type}-${plateNo}-${formattedDate}.pdf`
    );

    toast({
      title: "Report Generated",
      description: `PDF report for ${type} history of ${plateNo} generated.`,
      status: "success",
      duration: 3000,
      isClosable: true,
    });
  };

  const HistoryModal = () => {
    let modalTitle = "Renewal History";
    let historyColumns = [];

    if (selectedVehicleInfo.plateNo) {
      modalTitle = `${selectedVehicleInfo.type.toUpperCase()} Renewal History for ${selectedVehicleInfo.plateNo}`;
    }

    if (selectedVehicleInfo.type === "lto") {
      historyColumns = [
        { key: "orNumber", label: "OR Number" },
        { key: "orDate", label: "OR Date", isDate: true },
        { key: "renewedDate", label: "Date Recorded", isDate: true },
      ];
    } else if (selectedVehicleInfo.type === "ltfrb") {
      historyColumns = [
        { key: "caseNo", label: "Case Number" },
        { key: "decisionDate", label: "Decision Date", isDate: true },
        { key: "expiryDate", label: "Expiry Date", isDate: true },
        { key: "renewedDate", label: "Date Recorded", isDate: true },
      ];
    } else if (selectedVehicleInfo.type === "insurance") {
      historyColumns = [
        { key: "policyNo", label: "Policy Number" },
        { key: "from", label: "Coverage Start", isDate: true },
        { key: "to", label: "Coverage End", isDate: true },
        { key: "renewedDate", label: "Date Recorded", isDate: true },
      ];
    }

    return (
      <Modal
        isOpen={isHistoryOpen}
        onClose={onHistoryClose}
        size="xl"
        scrollBehavior="inside"
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader
            bg="#1a365d"
            color="white"
            borderBottomWidth="1px"
            borderColor="#800020"
          >
            {modalTitle}
          </ModalHeader>
          <ModalCloseButton color="white" />
          <ModalBody pb={6}>
            {isHistoryLoading ? (
              <Flex justify="center" align="center" h="200px">
                <Spinner size="xl" />
              </Flex>
            ) : historyData.length === 0 ? (
              <Flex justify="center" align="center" h="100px">
                <Text color="gray.500">
                  No history records found for this vehicle.
                </Text>
              </Flex>
            ) : (
              <TableContainer
                borderWidth="1px"
                borderColor="#1a365d"
                rounded="lg"
              >
                <Table variant="simple" size="sm">
                  <Thead bg="#1a365d" position="sticky" top={0} zIndex={1}>
                    <Tr>
                      {historyColumns.map((col) => (
                        <Th
                          key={col.key}
                          color="white"
                          borderColor="#800020"
                          textAlign="center"
                        >
                          {col.label}
                        </Th>
                      ))}
                    </Tr>
                  </Thead>
                  <Tbody>
                    {historyData.map((record, index) => (
                      <Tr key={index} _hover={{ bg: "gray.50" }}>
                        {historyColumns.map((col) => (
                          <Td
                            key={col.key}
                            borderColor="#1a365d"
                            textAlign="center"
                          >
                            {col.isDate
                              ? formatDate(record[col.key])
                              : formatValue(record[col.key])}
                          </Td>
                        ))}
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </TableContainer>
            )}
          </ModalBody>
          <ModalFooter borderTopWidth="1px" borderColor="#1a365d">
            <Button
              leftIcon={<DownloadIcon />}
              bg="#800020"
              color="white"
              _hover={{ bg: "#600010" }}
              size="sm"
              mr={3}
              onClick={handleGenerateHistoryReport}
            >
              Export Report
            </Button>
            <Button
              variant="outline"
              color="#800020"
              borderColor="#800020"
              _hover={{ bg: "red.50" }}
              onClick={onHistoryClose}
              size="sm"
            >
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    );
  };

  return (
    <Box>
      <Box
        mb={8}
        py={4}
        px={6}
        borderRadius="md"
        borderBottom="1px solid"
        borderColor="gray.200"
      >
        <Flex justify="space-between" align="center" mb={6}>
          <VStack align="start" spacing={1}>
            <Heading size="lg" color="#1a365d" fontWeight="bold">
              Renewal Reports
            </Heading>
            <Text color="gray.500">
              Monitor and track LTO, LTFRB, and Insurance renewals
            </Text>
          </VStack>
        </Flex>

        <Grid templateColumns={{ base: "1fr", md: "repeat(3, 1fr)" }} gap={4}>
          <Box
            bg="white"
            p={4}
            rounded="lg"
            shadow="sm"
            borderWidth="1px"
            borderColor="#1a365d"
            borderLeftWidth="4px"
          >
            <Text color="gray.500" fontSize="sm" mb={1} fontWeight="bold">
              LTO Renewals
            </Text>
            <Grid templateColumns="repeat(2, 1fr)" gap={3}>
              <VStack align="start" spacing={0}>
                <Text color="gray.500" fontSize="xs">
                  Total
                </Text>
                <Text fontSize="xl" fontWeight="bold" color="#1a365d">
                  {isLoading ? (
                    <Skeleton height="20px" width="30px" />
                  ) : (
                    stats.lto.total
                  )}
                </Text>
              </VStack>
              <VStack align="start" spacing={0}>
                <Text color="gray.500" fontSize="xs">
                  Renewed
                </Text>
                <Text fontSize="xl" fontWeight="bold" color="green.500">
                  {isLoading ? (
                    <Skeleton height="20px" width="30px" />
                  ) : (
                    stats.lto.renewed
                  )}
                </Text>
              </VStack>
              <VStack align="start" spacing={0}>
                <Text color="gray.500" fontSize="xs">
                  Pending
                </Text>
                <Text fontSize="xl" fontWeight="bold" color="orange.500">
                  {isLoading ? (
                    <Skeleton height="20px" width="30px" />
                  ) : (
                    stats.lto.pending
                  )}
                </Text>
              </VStack>
              <VStack align="start" spacing={0}>
                <Text color="gray.500" fontSize="xs">
                  Expired
                </Text>
                <Text fontSize="xl" fontWeight="bold" color="red.500">
                  {isLoading ? (
                    <Skeleton height="20px" width="30px" />
                  ) : (
                    stats.lto.expired
                  )}
                </Text>
              </VStack>
            </Grid>
          </Box>

          <Box
            bg="white"
            p={4}
            rounded="lg"
            shadow="sm"
            borderWidth="1px"
            borderColor="#800020"
            borderLeftWidth="4px"
          >
            <Text color="gray.500" fontSize="sm" mb={1} fontWeight="bold">
              LTFRB Renewals
            </Text>
            <Grid templateColumns="repeat(2, 1fr)" gap={3}>
              <VStack align="start" spacing={0}>
                <Text color="gray.500" fontSize="xs">
                  Total
                </Text>
                <Text fontSize="xl" fontWeight="bold" color="#800020">
                  {isLoading ? (
                    <Skeleton height="20px" width="30px" />
                  ) : (
                    stats.ltfrb.total
                  )}
                </Text>
              </VStack>
              <VStack align="start" spacing={0}>
                <Text color="gray.500" fontSize="xs">
                  Renewed
                </Text>
                <Text fontSize="xl" fontWeight="bold" color="green.500">
                  {isLoading ? (
                    <Skeleton height="20px" width="30px" />
                  ) : (
                    stats.ltfrb.renewed
                  )}
                </Text>
              </VStack>
              <VStack align="start" spacing={0}>
                <Text color="gray.500" fontSize="xs">
                  Pending
                </Text>
                <Text fontSize="xl" fontWeight="bold" color="orange.500">
                  {isLoading ? (
                    <Skeleton height="20px" width="30px" />
                  ) : (
                    stats.ltfrb.pending
                  )}
                </Text>
              </VStack>
              <VStack align="start" spacing={0}>
                <Text color="gray.500" fontSize="xs">
                  Expired
                </Text>
                <Text fontSize="xl" fontWeight="bold" color="red.500">
                  {isLoading ? (
                    <Skeleton height="20px" width="30px" />
                  ) : (
                    stats.ltfrb.expired
                  )}
                </Text>
              </VStack>
            </Grid>
          </Box>

          <Box
            bg="white"
            p={4}
            rounded="lg"
            shadow="sm"
            borderWidth="1px"
            borderColor="#1a365d"
            borderLeftWidth="4px"
          >
            <Text color="gray.500" fontSize="sm" mb={1} fontWeight="bold">
              Insurance Renewals
            </Text>
            <Grid templateColumns="repeat(2, 1fr)" gap={3}>
              <VStack align="start" spacing={0}>
                <Text color="gray.500" fontSize="xs">
                  Total
                </Text>
                <Text fontSize="xl" fontWeight="bold" color="#1a365d">
                  {isLoading ? (
                    <Skeleton height="20px" width="30px" />
                  ) : (
                    stats.insurance.total
                  )}
                </Text>
              </VStack>
              <VStack align="start" spacing={0}>
                <Text color="gray.500" fontSize="xs">
                  Renewed
                </Text>
                <Text fontSize="xl" fontWeight="bold" color="green.500">
                  {isLoading ? (
                    <Skeleton height="20px" width="30px" />
                  ) : (
                    stats.insurance.renewed
                  )}
                </Text>
              </VStack>
              <VStack align="start" spacing={0}>
                <Text color="gray.500" fontSize="xs">
                  Pending
                </Text>
                <Text fontSize="xl" fontWeight="bold" color="orange.500">
                  {isLoading ? (
                    <Skeleton height="20px" width="30px" />
                  ) : (
                    stats.insurance.pending
                  )}
                </Text>
              </VStack>
              <VStack align="start" spacing={0}>
                <Text color="gray.500" fontSize="xs">
                  Expired
                </Text>
                <Text fontSize="xl" fontWeight="bold" color="red.500">
                  {isLoading ? (
                    <Skeleton height="20px" width="30px" />
                  ) : (
                    stats.insurance.expired
                  )}
                </Text>
              </VStack>
            </Grid>
          </Box>
        </Grid>
      </Box>

      <Flex justify="flex-start" px={6} mt={-4} mb={4}>
        <InputGroup size="lg" maxW="400px">
          <InputLeftElement pointerEvents="none">
            <Search2Icon color="gray.300" />
          </InputLeftElement>
          <Input
            placeholder="Search by plate number..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            bg="white"
            borderColor="gray.300"
            _hover={{ borderColor: "blue.300" }}
            _focus={{
              borderColor: "blue.500",
              boxShadow: "0 0 0 1px blue.500",
            }}
            borderRadius="md"
            height="48px"
            _placeholder={{ color: "gray.400" }}
            boxShadow="sm"
          />
        </InputGroup>
      </Flex>

      <Box
        bg="white"
        rounded="lg"
        shadow="md"
        borderWidth="1px"
        maxH="650px"
        display="flex"
        flexDirection="column"
        mx={6}
      >
        <Tabs
          variant="enclosed"
          onChange={(index) => {
            setIsTabLoading(true);
            setCurrentPage(1);
            setSearchTerm("");
            setActiveTab(index);
            setTimeout(() => setIsTabLoading(false), 300);
          }}
          isLazy
        >
          <TabList borderBottomWidth="1px" borderColor="gray.200">
            <Tab
              _selected={{
                color: "white",
                bg: "#1a365d",
                borderColor: "#1a365d",
              }}
              _hover={{ bg: "gray.100" }}
              borderBottomWidth="1px"
              borderColor="gray.200"
              mr={1}
            >
              LTO Renewals
            </Tab>
            <Tab
              _selected={{
                color: "white",
                bg: "#800020",
                borderColor: "#800020",
              }}
              _hover={{ bg: "gray.100" }}
              borderBottomWidth="1px"
              borderColor="gray.200"
              mr={1}
            >
              LTFRB Renewals
            </Tab>
            <Tab
              _selected={{
                color: "white",
                bg: "#1a365d",
                borderColor: "#1a365d",
              }}
              _hover={{ bg: "gray.100" }}
              borderBottomWidth="1px"
              borderColor="gray.200"
            >
              Insurance Renewals
            </Tab>
          </TabList>

          <TabPanels flex="1" overflowY="auto">
            <TabPanel p={0}>{renderTable(renewalData.lto || [])}</TabPanel>
            <TabPanel p={0}>{renderTable(renewalData.ltfrb || [])}</TabPanel>
            <TabPanel p={0}>
              {renderTable(renewalData.insurance || [])}
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Box>

      <HistoryModal />
    </Box>
  );
}

export default RenewalReport;
