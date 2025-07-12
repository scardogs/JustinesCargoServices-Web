import React, {
  useState,
  useEffect,
  lazy,
  Suspense,
  useCallback,
  memo,
  useMemo,
} from "react";
import {
  Box,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Heading,
  Input,
  Button,
  Flex,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  IconButton,
  useDisclosure,
  Text,
  FormControl,
  FormLabel,
  Tooltip,
  Select,
  Spinner,
  Center,
  Skeleton,
  useToast,
  TableContainer,
  Badge,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverHeader,
  PopoverBody,
  PopoverArrow,
  PopoverCloseButton,
  Tfoot,
  Icon,
  Image,
  Grid,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Divider,
  Checkbox,
  UnorderedList,
  ListItem,
  VStack,
} from "@chakra-ui/react";
import {
  EditIcon,
  DeleteIcon,
  Search2Icon,
  CloseIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ViewIcon,
  RepeatIcon,
  TriangleDownIcon,
  TriangleUpIcon,
  SearchIcon,
} from "@chakra-ui/icons";
import axios from "axios";
import WaybillBody from "./waybillbody";
import {
  FaFilePdf,
  FaDownload,
  FaCamera,
  FaImage,
  FaTruck,
  FaRoute,
  FaShippingFast,
  FaRegListAlt,
  FaInfoCircle,
  FaRegCopy,
  FaCheckCircle,
  FaExclamationCircle,
} from "react-icons/fa";
import { useRouter } from "next/router";

// Add these constants at the top of the file
const primaryColor = "#143D60";
const secondaryColor = "#1A4F7A";
const accentColor = "#FF6B6B";
const lightBg = "#F8FAFC";
const borderColor = "#E2E8F0";

// Dynamically import the WaybillManagement page
const WaybillManagementPage = lazy(
  () => import("../../pages/WaybillManagement/waybill")
);

// Add this helper function to format numbers with commas
const formatNumber = (value, decimals = 2) => {
  if (value === null || value === undefined || isNaN(value)) return "0";
  return new Intl.NumberFormat("en-PH", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
};

// Add this SearchableSelect component after formatNumber function
const SearchableSelect = ({
  value,
  onChange,
  options,
  placeholder,
  size = "md",
  borderColor = "gray.200",
  _hover,
  _focus,
  isDisabled,
  ...rest
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [filteredOptions, setFilteredOptions] = useState(options || []);

  useEffect(() => {
    // Filter options when search text changes
    if (!options) return;

    if (!searchText) {
      setFilteredOptions(options);
      return;
    }

    const filtered = options.filter((option) =>
      option.label.toLowerCase().includes(searchText.toLowerCase())
    );
    setFilteredOptions(filtered);
  }, [searchText, options]);

  const handleInputChange = (e) => {
    setSearchText(e.target.value);
    // Create a synthetic event similar to a select change
    onChange({
      target: {
        value: e.target.value,
        name: rest.name,
      },
    });
  };

  const handleOptionClick = (option) => {
    // Create a synthetic event similar to a select change
    onChange({
      target: {
        value: option.value,
        name: rest.name,
      },
    });
    setSearchText("");
    setIsFocused(false);
  };

  return (
    <Box position="relative" {...rest}>
      <InputGroup>
        <Input
          value={value}
          onChange={handleInputChange}
          placeholder={placeholder}
          onClick={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          borderColor={borderColor}
          size={size}
          _hover={_hover}
          _focus={_focus}
          isDisabled={isDisabled}
        />
        {value && (
          <InputRightElement>
            <CloseIcon
              boxSize="3"
              color="gray.500"
              cursor="pointer"
              onClick={() => {
                onChange({ target: { value: "", name: rest.name } });
              }}
            />
          </InputRightElement>
        )}
      </InputGroup>

      {isFocused && filteredOptions.length > 0 && (
        <Box
          position="absolute"
          top="100%"
          left="0"
          right="0"
          zIndex="10"
          bg="white"
          borderWidth="1px"
          borderColor="gray.200"
          borderRadius="md"
          boxShadow="sm"
          maxH="200px"
          overflowY="auto"
          mt="2px"
        >
          {filteredOptions.map((option, index) => (
            <Box
              key={index}
              p={2}
              cursor="pointer"
              _hover={{ bg: "gray.100" }}
              onClick={() => handleOptionClick(option)}
            >
              {option.label}
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
};

// Add debounce function after other helper functions
const debounce = (func, delay) => {
  let timeoutId;
  return (...args) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      func(...args);
    }, delay);
  };
};

// Create a memoized TableRow component to reduce re-renders
const WaybillTableRow = memo(
  ({
    waybill,
    handleDropsClick,
    formatNumber,
    handleViewPDF,
    handleViewHardCopy,
    handleHardCopyUpload,
    onRowHover,
    onRowLeave,
    duplicateWaybills,
    loadingWaybills,
    activePopoverWaybill,
    hoveredWaybill,
    hoverConsigneeDetails,
    hoverSubDetails,
    index,
    primaryColor,
    hoverBg,
    blueAccent,
    tableBorderColor,
  }) => {
    const isActive = activePopoverWaybill === waybill.waybillNumber;

    // Ensure totalPercentage is a number for display
    const displayPercentage =
      waybill.totalPercentage !== undefined && waybill.totalPercentage !== null
        ? typeof waybill.totalPercentage === "string" &&
          waybill.totalPercentage.includes("%")
          ? parseFloat(waybill.totalPercentage.replace("%", ""))
          : waybill.totalPercentage
        : 0;

    return (
      <Popover
        trigger="hover"
        placement="top"
        closeDelay={500}
        openDelay={700}
        isLazy
        gutter={20}
        onOpen={() => onRowHover(waybill)}
        onClose={() => onRowLeave()}
        autoFocus={false}
        strategy="fixed"
      >
        <PopoverTrigger>
          <Tr
            _hover={{
              bg:
                !activePopoverWaybill ||
                activePopoverWaybill === waybill.waybillNumber
                  ? hoverBg
                  : "transparent",
              transition: "all 0.2s ease",
              boxShadow:
                !activePopoverWaybill ||
                activePopoverWaybill === waybill.waybillNumber
                  ? "inset 0 0 0 1px rgba(66, 153, 225, 0.15)"
                  : "none",
            }}
            transition="all 0.2s"
            bg={
              waybill.status === "BILLED"
                ? "green.50"
                : index % 2 === 0
                  ? "white"
                  : "gray.50"
            }
            borderBottom={`1px solid ${tableBorderColor}`}
            borderLeft={waybill.status === "BILLED" ? "4px solid" : "none"}
            borderLeftColor={
              waybill.status === "BILLED" ? "green.500" : "transparent"
            }
            onMouseEnter={() => {
              // Don't handle hover if a popover is already active for a different waybill
              if (
                !activePopoverWaybill ||
                activePopoverWaybill === waybill.waybillNumber
              ) {
                onRowHover(waybill);
              }
            }}
            onMouseLeave={onRowLeave}
            cursor={
              !activePopoverWaybill ||
              activePopoverWaybill === waybill.waybillNumber
                ? "pointer"
                : "default"
            }
            opacity={
              !activePopoverWaybill ||
              activePopoverWaybill === waybill.waybillNumber
                ? "1"
                : "0.7"
            }
          >
            <Td
              px={3}
              py={2}
              fontWeight="medium"
              color={blueAccent}
              width="8%"
              textAlign="left"
              fontSize="xs"
            >
              <Text fontFamily="monospace" fontWeight="semibold" isTruncated>
                {waybill.waybillNumber}
              </Text>
            </Td>

            <Td
              px={3}
              py={2}
              color="gray.700"
              width="14%"
              textAlign="left"
              fontSize="xs"
            >
              <Text isTruncated>
                {duplicateWaybills[waybill.waybillNumber]
                  ? `${waybill.shipper || "—"} (duplicate)`
                  : waybill.dropType === "fix rate"
                    ? `${waybill.shipper || "—"} (fix rate)`
                    : waybill.dropType === "multiple drops"
                      ? `${waybill.shipper || "—"} (multiple drops)`
                      : waybill.shipper || "—"}
              </Text>
            </Td>

            <Td px={3} py={2} width="28%" textAlign="left">
              {waybill.consignees.length > 0 ? (
                <Flex gap={1} flexWrap="wrap" maxH="36px" overflowY="auto">
                  {waybill.consignees.map((consignee, idx) => (
                    <Badge
                      key={idx}
                      px={1.5}
                      py={0.5}
                      borderRadius="full"
                      bg="#EBF8FF"
                      color="#2B6CB0"
                      fontSize="2xs"
                      mr={1}
                      mb={1}
                      fontWeight="medium"
                      isTruncated
                      maxW="120px"
                    >
                      {consignee}
                    </Badge>
                  ))}
                </Flex>
              ) : (
                <Text color="gray.400" fontSize="xs">
                  —
                </Text>
              )}
            </Td>

            <Td px={3} py={2} textAlign="center" width="10%">
              <Button
                size="sm"
                onClick={() => handleDropsClick(waybill.waybillNumber)}
                variant="outline"
                width="85px"
                colorScheme={
                  duplicateWaybills[waybill.waybillNumber] ||
                  waybill.totalPercentage >= 100 ||
                  Math.round(waybill.totalPercentage) === 100 ||
                  (waybill.shipper &&
                    waybill.shipper.toLowerCase().includes("duplicate")) ||
                  (waybill.shipper &&
                    waybill.shipper.toLowerCase().includes("copy")) ||
                  (waybill.reference &&
                    waybill.reference.toLowerCase().includes("duplicate")) ||
                  (waybill.reference &&
                    waybill.reference.toLowerCase().includes("copy")) ||
                  waybill.status === "BILLED"
                    ? "blue"
                    : "red"
                }
                height="28px"
                fontSize="2xs"
                data-testid="drops-button"
                isDisabled={loadingWaybills[waybill.waybillNumber]}
              >
                {loadingWaybills[waybill.waybillNumber] ? (
                  <Spinner size="xs" />
                ) : duplicateWaybills[waybill.waybillNumber] ? (
                  "View Drops"
                ) : waybill.totalPercentage >= 100 ||
                  Math.round(waybill.totalPercentage) === 100 ? (
                  "View Drops"
                ) : (
                  "Add Drops"
                )}
              </Button>
            </Td>

            <Td px={3} py={2} textAlign="right" width="8%" fontSize="xs">
              {formatNumber(waybill.totalCBM)}
            </Td>

            <Td px={3} py={2} textAlign="right" width="8%" fontSize="xs">
              {formatNumber(waybill.additionals ?? 0)}
            </Td>

            <Td px={3} py={2} textAlign="right" width="8%" fontSize="xs">
              {formatNumber(displayPercentage, 0)}%
            </Td>

            <Td
              px={3}
              py={2}
              fontWeight="semibold"
              color={primaryColor}
              textAlign="right"
              width="8%"
              fontSize="xs"
            >
              ₱{formatNumber(waybill.totalCost)}
            </Td>

            <Td px={3} py={2} textAlign="center" width="7%">
              <Badge
                colorScheme={waybill.status === "BILLED" ? "green" : "orange"}
                p={2}
                borderRadius="md"
                width="85px"
                fontSize="xs"
                textAlign="center"
                fontWeight="semibold"
              >
                {waybill.status || "NOT BILLED"}
              </Badge>
            </Td>

            <Td px={3} py={2} textAlign="center" width="7%">
              <Button
                size="sm"
                isDisabled={!waybill.hasPDF}
                onClick={() => handleViewPDF(waybill.waybillNumber)}
                variant="solid"
                colorScheme={waybill.hasPDF ? "yellow" : "gray"}
                leftIcon={<Icon as={FaFilePdf} />}
                height="28px"
                fontSize="2xs"
                width="55px"
                boxShadow="sm"
                _hover={
                  waybill.hasPDF
                    ? {
                        transform: "translateY(-1px)",
                        boxShadow: "md",
                      }
                    : {}
                }
              >
                {waybill.hasPDF ? "" : "N/A"}
              </Button>
            </Td>

            <Td px={3} py={2} textAlign="center" width="7%">
              <Flex gap={1} justify="center">
                <Button
                  size="sm"
                  isDisabled={!waybill.hasHardCopy}
                  onClick={() => handleViewHardCopy(waybill.waybillNumber)}
                  variant="solid"
                  colorScheme={waybill.hasHardCopy ? "yellow" : "gray"}
                  leftIcon={<Icon as={FaImage} />}
                  height="28px"
                  fontSize="2xs"
                  width="55px"
                >
                  {waybill.hasHardCopy ? "" : "N/A"}
                </Button>
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  id={`hardcopy-upload-${waybill.waybillNumber}`}
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      handleHardCopyUpload(waybill.waybillNumber, file);
                    }
                  }}
                />
                <label htmlFor={`hardcopy-upload-${waybill.waybillNumber}`}>
                  <Button
                    as="span"
                    size="sm"
                    variant="outline"
                    colorScheme="blue"
                    leftIcon={<Icon as={FaCamera} />}
                    cursor="pointer"
                    height="28px"
                    fontSize="2xs"
                    width="65px"
                  >
                    Upload
                  </Button>
                </label>
              </Flex>
            </Td>
          </Tr>
        </PopoverTrigger>
        <PopoverContent
          width="800px"
          maxH="500px"
          overflowY="auto"
          boxShadow="xl"
          zIndex={99999}
          bg="white"
          border="1px solid"
          borderColor="blue.200"
          position="relative"
        >
          <PopoverArrow
            bg="white"
            borderTop="1px solid"
            borderLeft="1px solid"
            borderColor="blue.200"
          />
          <PopoverCloseButton />
          <PopoverHeader
            borderBottomWidth="1px"
            fontWeight="bold"
            bg="blue.50"
            color="blue.800"
          >
            Waybill Details - {waybill.waybillNumber}
          </PopoverHeader>
          <PopoverBody>
            <Box p={3}>
              <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                <Box>
                  <Text fontWeight="bold" mb={2} color="gray.700">
                    Shipper Information
                  </Text>
                  <Box p={3} bg="gray.50" borderRadius="md" mb={3}>
                    <Text fontWeight="medium">{waybill.shipper || "—"}</Text>
                    {waybill.reference && (
                      <Text fontSize="sm" color="gray.600" mt={1}>
                        Reference: {waybill.reference}
                      </Text>
                    )}
                  </Box>

                  <Text fontWeight="bold" mb={2} color="gray.700">
                    Consignees ({waybill.consignees?.length || 0})
                  </Text>
                  <Box
                    maxH="200px"
                    overflowY="auto"
                    p={3}
                    bg="gray.50"
                    borderRadius="md"
                  >
                    {waybill.consignees && waybill.consignees.length > 0 ? (
                      <VStack spacing={2} align="stretch">
                        {waybill.consignees.map((consignee, idx) => (
                          <Box
                            key={idx}
                            p={2}
                            bg="white"
                            borderRadius="md"
                            boxShadow="sm"
                            _hover={{ bg: "blue.50" }}
                          >
                            <Text fontSize="sm">{consignee}</Text>
                          </Box>
                        ))}
                      </VStack>
                    ) : (
                      <Text color="gray.500">No consignees found</Text>
                    )}
                  </Box>
                </Box>
                <Box>
                  <Text fontWeight="bold" mb={2} color="gray.700">
                    Financial Summary
                  </Text>
                  <SimpleGrid columns={2} spacing={3} mb={3}>
                    <Stat
                      size="sm"
                      bg="gray.50"
                      p={2}
                      borderRadius="md"
                      boxShadow="sm"
                    >
                      <StatLabel fontSize="xs" color="gray.600">
                        Total CBM
                      </StatLabel>
                      <StatNumber color="blue.600">
                        {formatNumber(waybill.totalCBM)}
                      </StatNumber>
                    </Stat>
                    <Stat
                      size="sm"
                      bg="gray.50"
                      p={2}
                      borderRadius="md"
                      boxShadow="sm"
                    >
                      <StatLabel fontSize="xs" color="gray.600">
                        Total Percentage
                      </StatLabel>
                      <StatNumber color="blue.600">
                        {formatNumber(displayPercentage, 0)}%
                      </StatNumber>
                    </Stat>
                    <Stat
                      size="sm"
                      bg="gray.50"
                      p={2}
                      borderRadius="md"
                      boxShadow="sm"
                    >
                      <StatLabel fontSize="xs" color="gray.600">
                        Additionals
                      </StatLabel>
                      <StatNumber color="blue.600">
                        ₱{formatNumber(waybill.additionals || 0)}
                      </StatNumber>
                    </Stat>
                    <Stat
                      size="sm"
                      bg="gray.50"
                      p={2}
                      borderRadius="md"
                      boxShadow="sm"
                    >
                      <StatLabel fontSize="xs" color="gray.600">
                        Total Cost
                      </StatLabel>
                      <StatNumber color="blue.600">
                        ₱{formatNumber(waybill.totalCost)}
                      </StatNumber>
                    </Stat>
                  </SimpleGrid>

                  <Text fontWeight="bold" mb={2} color="gray.700">
                    Consignee Details
                  </Text>
                  <Box
                    maxH="250px"
                    overflowY="auto"
                    bg="white"
                    borderRadius="md"
                    borderWidth="1px"
                    borderColor="gray.200"
                  >
                    {hoveredWaybill &&
                    hoveredWaybill.waybillNumber === waybill.waybillNumber &&
                    hoverConsigneeDetails.length > 0 ? (
                      <Table size="sm" variant="simple">
                        <Thead
                          bg="gray.100"
                          position="sticky"
                          top={0}
                          zIndex={1}
                        >
                          <Tr>
                            <Th fontSize="xs">CONSIGNEE</Th>
                            <Th isNumeric fontSize="xs">
                              CBM
                            </Th>
                            <Th isNumeric fontSize="xs">
                              %
                            </Th>
                            <Th isNumeric fontSize="xs">
                              AMOUNT
                            </Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {hoverConsigneeDetails.map((detail, idx) => (
                            <React.Fragment key={idx}>
                              <Tr bg="blue.50" _hover={{ bg: "blue.100" }}>
                                <Td fontWeight="medium" fontSize="xs">
                                  {detail.consignee}
                                </Td>
                                <Td isNumeric fontWeight="medium" fontSize="xs">
                                  {formatNumber(detail.cbm || 0)}
                                </Td>
                                <Td isNumeric fontWeight="medium" fontSize="xs">
                                  {formatNumber(detail.percentage || 0, 2)}%
                                </Td>
                                <Td isNumeric fontWeight="medium" fontSize="xs">
                                  ₱{formatNumber(detail.amount || 0)}
                                </Td>
                              </Tr>
                              {/* Check for sub-details related to this consignee */}
                              {hoverSubDetails &&
                                hoverSubDetails.length > 0 &&
                                hoverSubDetails
                                  .filter(
                                    (sub) => sub.consignee === detail.consignee
                                  )
                                  .map((subDetail, subIdx) => (
                                    <Tr
                                      key={`${idx}-${subIdx}`}
                                      bg="white"
                                      _hover={{ bg: "gray.50" }}
                                    >
                                      <Td pl={8} fontSize="xs">
                                        <Flex align="center">
                                          <Box
                                            w="2px"
                                            h="14px"
                                            bg="blue.400"
                                            mr={2}
                                          />
                                          {subDetail.storeName ||
                                            subDetail.store ||
                                            "Unknown Store"}
                                        </Flex>
                                      </Td>
                                      <Td isNumeric fontSize="xs">
                                        {formatNumber(subDetail.cbm || 0)}
                                      </Td>
                                      <Td isNumeric fontSize="xs">
                                        {formatNumber(
                                          subDetail.percentage || 0,
                                          2
                                        )}
                                        %
                                      </Td>
                                      <Td isNumeric fontSize="xs">
                                        ₱{formatNumber(subDetail.amount || 0)}
                                      </Td>
                                    </Tr>
                                  ))}
                            </React.Fragment>
                          ))}
                        </Tbody>
                      </Table>
                    ) : (
                      <Center p={4}>
                        <Text color="gray.500">
                          No detailed consignee data available
                        </Text>
                      </Center>
                    )}
                  </Box>
                </Box>
              </Grid>
            </Box>
          </PopoverBody>
        </PopoverContent>
      </Popover>
    );
  }
);

const WaybillTable = ({ consignees, shipperFormData, onCreate }) => {
  const router = useRouter();
  const [selectedWaybillNumber, setSelectedWaybillNumber] = useState("");
  const [selectedWaybillNumbers, setSelectedWaybillNumbers] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [waybills, setWaybills] = useState([]);
  const [currentWaybill, setCurrentWaybill] = useState(null);
  const [selectedConsignees, setSelectedConsignees] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(15); // Changed from 7 to 15 items per page
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  // Add state to track if any popover is open
  const [activePopoverWaybill, setActivePopoverWaybill] = useState(null);

  // Add these new state variables after the other state declarations
  const [sortField, setSortField] = useState("_id");
  const [sortOrder, setSortOrder] = useState("desc");
  const [totalWaybills, setTotalWaybills] = useState(0);

  // Add status filter state

  // Modal disclosure hooks
  const { isOpen, onOpen, onClose } = useDisclosure();
  const dropTypeModal = useDisclosure();
  const {
    isOpen: isEditModalOpen,
    onOpen: onEditModalOpen,
    onClose: onEditModalClose,
  } = useDisclosure();
  const {
    isOpen: isConsigneesModalOpen,
    onOpen: onConsigneesModalOpen,
    onClose: onConsigneesModalClose,
  } = useDisclosure();

  // Add drop type selection modal
  const [dropWaybillNumber, setDropWaybillNumber] = useState("");
  const [selectedDropType, setSelectedDropType] = useState("");

  // Add state to track if modal was explicitly closed
  const [wasExplicitlyClosed, setWasExplicitlyClosed] = useState(() => {
    // Check localStorage on initial load
    if (typeof window !== "undefined") {
      const storedState = localStorage.getItem("dropTypeModalClosed");
      const storedWaybill = localStorage.getItem("closedWaybillNumber");
      return (
        storedState === "true" && storedWaybill === router.query.waybillNumber
      );
    }
    return false;
  });

  // Add effect to track modal states
  useEffect(() => {
    console.log("Drop type modal state changed:", dropTypeModal.isOpen);
  }, [dropTypeModal.isOpen]);

  useEffect(() => {
    console.log("Main modal state changed:", isOpen);
  }, [isOpen]);

  // Add effect to track waybill number changes
  useEffect(() => {
    if (dropWaybillNumber) {
      console.log("Waybill number updated:", dropWaybillNumber);
    }
  }, [dropWaybillNumber]);

  // Add state for truck CBM
  const [truckCbm, setTruckCbm] = useState(null);

  // Add this hook inside the component
  const toast = useToast();

  // Add this state to store expanded consignees
  const [expandedConsignees, setExpandedConsignees] = useState({});

  // Add this state to track which waybills are duplicates
  const [duplicateWaybills, setDuplicateWaybills] = useState({});

  // Add these state variables after the other state declarations
  const [hoveredWaybill, setHoveredWaybill] = useState(null);
  const [hoverTimeout, setHoverTimeout] = useState(null);
  const [isHovering, setIsHovering] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [hoverConsigneeDetails, setHoverConsigneeDetails] = useState([]);
  const [hoverSubDetails, setHoverSubDetails] = useState([]);

  // Add state for PDF viewing
  const [viewingPDF, setViewingPDF] = useState(null);
  const {
    isOpen: isPDFModalOpen,
    onOpen: onPDFModalOpen,
    onClose: onPDFModalClose,
  } = useDisclosure();

  // Add these state variables after the other state declarations
  const [viewingHardCopy, setViewingHardCopy] = useState(null);
  const {
    isOpen: isHardCopyModalOpen,
    onOpen: onHardCopyModalOpen,
    onClose: onHardCopyModalClose,
  } = useDisclosure();

  // Add this state variable after the other state declarations (around line 143)
  const [isDuplicateCheckLoading, setIsDuplicateCheckLoading] = useState(false);

  // Add a refresh counter state variable near the other state variables
  const [refreshCounter, setRefreshCounter] = useState(0);

  // Add a new state to track loading status for individual waybills
  const [loadingWaybills, setLoadingWaybills] = useState({});

  // Toggle expand/collapse for a consignee
  const toggleConsigneeExpand = (consigneeName) => {
    setExpandedConsignees((prev) => ({
      ...prev,
      [consigneeName]: !prev[consigneeName],
    }));
  };

  // Check if waybills have PDF data
  const checkPdfStatus = async (waybills) => {
    const updatedWaybills = [...waybills];

    for (const waybill of updatedWaybills) {
      try {
        // Check if the waybill has a PDF
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_BACKEND_API}/api/waybillSummary/waybill/${waybill.waybillNumber}`
        );

        // Update the hasPDF status
        if (response.data && response.data.hasPDF) {
          waybill.hasPDF = true;
        } else {
          waybill.hasPDF = false;
        }
      } catch (error) {
        console.error(
          `Error checking PDF status for ${waybill.waybillNumber}:`,
          error
        );
        waybill.hasPDF = false;
      }
    }

    return updatedWaybills;
  };

  // Add status filter state
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Replace the fetchDataAndProcess function to implement better loading and caching strategies
  const fetchDataAndProcess = useCallback(async () => {
    try {
      setIsLoading(true);

      // Build query parameters for pagination, sorting and search
      const queryParams = new URLSearchParams();
      queryParams.append("page", currentPage);
      queryParams.append("limit", itemsPerPage);

      // Add sort parameters if available
      if (sortField) {
        queryParams.append("sortField", sortField);
        queryParams.append("sortOrder", sortOrder);
      }

      // Add search parameter if available
      if (searchQuery) {
        queryParams.append("search", searchQuery);
      }

      // Add status filter parameter if not "ALL"
      if (statusFilter !== "ALL") {
        queryParams.append("status", statusFilter);
      }

      // Add a timestamp to prevent caching
      queryParams.append("_t", Date.now());

      // Use a separate endpoint for processing to avoid blocking the main data fetch
      // Trigger processing in the background without waiting for it to complete
      // --- MODIFICATION START ---
      try {
        await axios.post(
          // Added await here
          `${process.env.NEXT_PUBLIC_BACKEND_API}/api/waybillSummary/process?_t=${Date.now()}`
        );
        console.log(
          "Backend processing for waybill summaries initiated and awaited."
        );
      } catch (error) {
        console.error(
          "Error triggering or awaiting background processing:",
          error
        );
        // Optionally, show a toast message to the user that processing might be delayed
        // For now, we will proceed to fetch data, which might be stale if processing failed.
        toast({
          title: "Processing Issue",
          description:
            "There was an issue with data processing. Displayed data might be slightly delayed.",
          status: "warning",
          duration: 4000,
          isClosable: true,
          position: "top-right",
        });
      }
      // --- MODIFICATION END ---

      // Then fetch the processed waybill summaries with pagination
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/waybillSummary?${queryParams.toString()}`,
        {
          headers: {
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
            Expires: "0",
          },
        }
      );

      // The response format has changed to include data and pagination info
      const { data: waybillData, pagination } = response.data;

      // Set total pages based on pagination info from the server
      setTotalPages(pagination.pages);
      setTotalWaybills(pagination.total);

      // Process the waybill data to ensure proper percentage formatting
      const processedWaybills = waybillData.map((waybill) => {
        // Convert totalPercentage to a number if it's a string with %
        let percentage = waybill.totalPercentage;
        if (typeof percentage === "string" && percentage.includes("%")) {
          percentage = parseFloat(percentage.replace("%", ""));
        }

        return {
          ...waybill,
          totalPercentage: percentage,
        };
      });

      // Set waybills directly from the server response with processed data
      setWaybills(processedWaybills);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "Failed to fetch waybill data",
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "top-right",
      });
    } finally {
      setIsLoading(false);
    }
  }, [
    currentPage,
    itemsPerPage,
    sortField,
    sortOrder,
    searchQuery,
    statusFilter,
    toast,
    refreshCounter, // Add refreshCounter to dependencies to ensure refresh when it changes
  ]);

  // Update sort handling
  const handleSort = (field) => {
    // If clicking the same field, toggle sort order
    if (field === sortField) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      // If clicking a new field, set it as sort field with default desc order
      setSortField(field);
      setSortOrder("desc");
    }
    // Reset to first page when changing sort
    setCurrentPage(1);
  };

  // Modify to fetch on page change
  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  // Fetch data when page, items per page, sort, or search changes
  useEffect(() => {
    fetchDataAndProcess();
  }, [
    currentPage,
    itemsPerPage,
    sortField,
    sortOrder,
    searchQuery,
    statusFilter,
  ]);

  // Replace filterWaybills and currentItems calculations
  // with direct use of the waybills from the server
  // Previous code for filtering locally is no longer needed
  const currentItems = waybills;

  // Update handleDropsClick
  const handleDropsClick = useCallback(
    (waybillNumber) => {
      try {
        // First check if this waybill might be a duplicate based on the pattern
        const checkEntityAbbreviations = async () => {
          try {
            // This endpoint returns all entity abbreviations for a waybill
            const response = await axios.get(
              `${process.env.NEXT_PUBLIC_BACKEND_API}/api/entity-abbreviation-summary/waybill/${waybillNumber}`
            );

            if (response.data && Array.isArray(response.data)) {
              // Check if any entity has duplicated="duplicate"
              const hasDuplicate = response.data.some(
                (entity) => entity.duplicated === "duplicate"
              );

              if (hasDuplicate) {
                console.log(
                  `Found entity with duplicate status for waybill ${waybillNumber}`
                );

                // Update the duplicate status in our state
                setDuplicateWaybills((prev) => ({
                  ...prev,
                  [waybillNumber]: true,
                }));
              }
            }
          } catch (error) {
            console.error("Error checking entity abbreviations:", error);
          }
        };

        // Additional check for duplicate indicators in the waybill data
        const waybill = waybills.find((w) => w.waybillNumber === waybillNumber);
        if (waybill) {
          const shipperText = waybill.shipper?.toLowerCase() || "";
          const referenceText = waybill.reference?.toLowerCase() || "";

          if (
            shipperText.includes("duplicate") ||
            shipperText.includes("copy") ||
            shipperText.includes("copied from") ||
            referenceText.includes("duplicate") ||
            referenceText.includes("copy") ||
            referenceText.includes("copied from")
          ) {
            console.log(
              `Text indicators found for duplicate waybill ${waybillNumber}`
            );
            // Update the duplicate status in our state
            setDuplicateWaybills((prev) => ({
              ...prev,
              [waybillNumber]: true,
            }));
          }
        }

        // Run the check
        checkEntityAbbreviations();

        // Continue with the regular function
        setDropWaybillNumber(waybillNumber);
        // Clear the closed state when explicitly opening
        setWasExplicitlyClosed(false);
        localStorage.removeItem("dropTypeModalClosed");
        localStorage.removeItem("closedWaybillNumber");

        // Skip drop type selection and directly set as "multiple"
        setSelectedDropType("multiple");
        setSelectedWaybillNumber(waybillNumber);

        // Update URL with view parameter to directly open waybill body
        router.push(
          {
            pathname: router.pathname,
            query: {
              modal: "drops",
              waybillNumber,
              type: "multiple",
              view: "waybillbody",
            },
          },
          undefined,
          { shallow: true }
        );

        // Open the main modal directly
        onOpen();
      } catch (error) {
        console.error("Error in handleDropsClick:", error);
        toast({
          title: "Error",
          description: "Failed to open waybill. Please try again.",
          status: "error",
          duration: 3000,
          isClosable: true,
          position: "top-right",
        });
      }
    },
    [router, onOpen, waybills]
  );

  // Update handleDropTypeSelect
  const handleDropTypeSelect = useCallback(
    (type) => {
      try {
        console.log(`Selected drop type: ${type}`);

        // Store the frontend type in selectedDropType
        setSelectedDropType(type);
        dropTypeModal.onClose();
        setSelectedWaybillNumber(dropWaybillNumber);

        // For routing and components, we still use the frontend "fixed" vs "multiple" terms
        router.push(
          {
            pathname: router.pathname,
            query: {
              ...router.query,
              modal: "drops",
              waybillNumber: dropWaybillNumber,
              type, // Keep this as "fixed" or "multiple" for frontend components
              view: "waybillbody",
            },
          },
          undefined,
          { shallow: true }
        );

        onOpen();
      } catch (error) {
        console.error("Error in handleDropTypeSelect:", error);
        toast({
          title: "Error",
          description:
            "Failed to process drop type selection. Please try again.",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      }
    },
    [dropWaybillNumber, router, dropTypeModal, onOpen]
  );

  // Add this function to get waybill by number
  const getWaybillByNumber = (waybillNumber) => {
    return waybills.find((waybill) => waybill.waybillNumber === waybillNumber);
  };

  // Function to process waybills and calculate totals
  const processWaybills = async (tripDetails, consigneeInfo, shipperInfo) => {
    const groupedWaybills = {};

    for (const tripDetail of tripDetails) {
      const { waybillNumber, referenceNumber } = tripDetail;

      if (!groupedWaybills[waybillNumber]) {
        groupedWaybills[waybillNumber] = {
          waybillNumber,
          reference: referenceNumber,
          shipper: "No Shipper Found",
          consignees: [],
          totalCBM: 0,
          additionals: 0, // Default to 0
          drCost: 0, // Default to 0
          totalPercentage: 0,
          totalCost: 0,
        };
      }

      // Find matching consignee info
      const matchingConsignees = consigneeInfo.filter(
        (c) => c.waybillNumber === waybillNumber
      );

      if (matchingConsignees.length > 0) {
        groupedWaybills[waybillNumber].consignees = matchingConsignees.map(
          (c) => c.consignee || "Unknown Consignee"
        );

        groupedWaybills[waybillNumber].totalCBM = matchingConsignees.reduce(
          (sum, c) => sum + parseFloat(c.cbm || 0),
          0
        );

        groupedWaybills[waybillNumber].totalPercentage =
          matchingConsignees.reduce(
            (sum, c) => sum + parseFloat(c.percentage || 0),
            0
          );

        groupedWaybills[waybillNumber].totalCost = matchingConsignees.reduce(
          (sum, c) => sum + parseFloat(c.amount || 0),
          0
        );
      } else {
        groupedWaybills[waybillNumber].consignees = ["No Consignee Found"];
      }

      // Find matching shipper info
      const shipper = shipperInfo.find(
        (s) => s.waybillNumber === waybillNumber
      );
      if (shipper) {
        groupedWaybills[waybillNumber].shipper =
          shipper.shipper || "Unknown Shipper";
      }

      // Fetch additional adjustment for this waybill
      try {
        const additionalAdjustmentResponse = await axios.get(
          process.env.NEXT_PUBLIC_BACKEND_API +
            `/api/additionalAdjustment/${waybillNumber}`
        );

        if (additionalAdjustmentResponse.data) {
          groupedWaybills[waybillNumber].additionals =
            additionalAdjustmentResponse.data.adjustment || 0;
        }
      } catch (error) {
        console.error(
          `Error fetching additional adjustment for ${waybillNumber}:`,
          error
        );
      }
    }

    // Add a function to update totalCost with additionals
    const updatedWaybills = addAdditionalsToTotalCost(
      Object.values(groupedWaybills)
    );

    return updatedWaybills;
  };

  // Function to add additionals to totalCost
  const addAdditionalsToTotalCost = (waybills) => {
    return waybills.map((waybill) => {
      // Ensure additionals is a valid number
      const parsedAdditionals = parseFloat(waybill.additionals) || 0;

      // Update totalCost by adding additionals
      return {
        ...waybill,
        totalCost: waybill.totalCost + parsedAdditionals,
      };
    });
  };

  // Save processed waybills to the backend
  const saveProcessedWaybillsToBackend = async (processedWaybills) => {
    try {
      for (const waybill of processedWaybills) {
        const { waybillNumber } = waybill;

        try {
          // Try to get existing waybill
          const existingResponse = await axios.get(
            process.env.NEXT_PUBLIC_BACKEND_API +
              `/api/waybillSummary/waybill/${waybillNumber}`
          );

          const existingWaybill = existingResponse.data;

          // If waybill exists, update it
          if (existingWaybill) {
            await axios.put(
              process.env.NEXT_PUBLIC_BACKEND_API +
                `/api/waybillSummary/waybill/${waybillNumber}`,
              waybill
            );
          }
        } catch (error) {
          // If waybill doesn't exist (404 error), create it
          if (error.response && error.response.status === 404) {
            await axios.post(
              process.env.NEXT_PUBLIC_BACKEND_API + "/api/waybillSummary",
              waybill
            );
          } else {
            // If it's a different error, log it
            console.error(
              `Error handling waybill ${waybillNumber}:`,
              error.message
            );
          }
        }
      }
    } catch (error) {
      console.error("Error saving processed waybills to backend:", error);
    }
  };

  // Handle Additional Updates

  // Handle Delete
  const handleDelete = async (id) => {
    try {
      await axios.delete(
        process.env.NEXT_PUBLIC_BACKEND_API + `/api/waybillSummary/${id}`
      );
      fetchWaybills(); // Refresh the table after deletion
    } catch (error) {
      console.error("Error deleting waybill:", error);
      toast({
        title: "Error deleting waybill",
        description: error.message,
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "top-right",
      });
    }
  };

  // Fetch waybills (for refreshing the table)
  const fetchWaybills = async () => {
    try {
      setIsLoading(true);

      // Build query parameters for pagination, sorting and search
      const queryParams = new URLSearchParams();
      queryParams.append("page", currentPage);
      queryParams.append("sortField", sortField);
      queryParams.append("sortOrder", sortOrder);

      if (searchQuery) {
        queryParams.append("search", searchQuery);
      }

      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/waybillSummary?${queryParams.toString()}`
      );

      // The response format has data and pagination info
      const { data: waybillData, pagination } = response.data;

      // Set the total pages
      setTotalPages(pagination.pages);

      // Check for PDF status
      const waybillsWithPdf = await checkPdfStatus(waybillData);

      // Don't check duplicate status here - it will be handled by the useEffect
      setWaybills(waybillsWithPdf);
      setIsLoading(false);
    } catch (error) {
      console.error("Error fetching waybills:", error);
      toast({
        title: "Error",
        description: "Failed to fetch waybills. Please try again.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      setIsLoading(false);
    }
  };

  // Update handleEdit
  const handleEdit = (waybill) => {
    setCurrentWaybill({ ...waybill });
    router.push(
      {
        pathname: router.pathname,
        query: {
          ...router.query,
          modal: "edit",
          waybillNumber: waybill.waybillNumber,
        },
      },
      undefined,
      { shallow: true }
    );
    onEditModalOpen();
  };

  // Update handleEditSave
  const handleEditSave = async () => {
    try {
      const updatedWaybill = { ...currentWaybill };

      // Validate required fields
      if (!updatedWaybill.waybillNumber) {
        console.error("Missing identifier (waybillNumber)");
        return;
      }

      // Log the payload for debugging
      console.log("Sending update request:", updatedWaybill);

      // Send the update request to the backend
      await axios.put(
        process.env.NEXT_PUBLIC_BACKEND_API +
          `/api/waybill-additionals/${updatedWaybill.waybillNumber}`,
        {
          additional: updatedWaybill.additionals,
          drCost: updatedWaybill.drCost,
        }
      );

      // Update the local state
      setWaybills((prevWaybills) =>
        prevWaybills.map((w) =>
          w.waybillNumber === updatedWaybill.waybillNumber
            ? { ...updatedWaybill }
            : w
        )
      );

      // Close the edit modal
      onEditModalClose();
    } catch (error) {
      console.error("Error saving edited waybill:", error);
      toast({
        title: "Error saving edited waybill",
        description: error.message,
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "top-right",
      });
    }
  };

  // Add state for close confirmation modal
  const [isCloseConfirmModalOpen, setIsCloseConfirmModalOpen] = useState(false);

  // Add a state for the latest waybill data that will be shown in the confirmation modal
  const [closeModalWaybillData, setCloseModalWaybillData] = useState(null);

  // Update the handleModalClose function to fetch the latest data before showing the confirmation modal
  const handleModalClose = useCallback(() => {
    console.log("handleModalClose called - beginning close process");

    // Check for sub-waybill numbers before closing
    if (selectedWaybillNumber) {
      console.log("selectedWaybillNumber exists:", selectedWaybillNumber);

      // First, fetch the latest data for this waybill to ensure we have fresh info
      const fetchLatestWaybillData = async () => {
        try {
          setIsLoading(true);

          // Attempt to process summaries first to get the latest data
          try {
            console.log(
              `Attempting to process summary for waybill: ${selectedWaybillNumber} before fetching for modal confirmation.`
            );
            await axios.post(
              `${process.env.NEXT_PUBLIC_BACKEND_API}/api/waybillSummary/process?_t=${Date.now()}`
            );
            console.log(
              `Processing request for waybill ${selectedWaybillNumber} summary completed for modal confirmation.`
            );
          } catch (processingError) {
            console.error(
              `Error during summary processing for waybill ${selectedWaybillNumber} for modal confirmation:`,
              processingError
            );
            // Non-critical error, log it and proceed to fetch, data might be slightly stale.
            toast({
              title: "Processing Notice",
              description:
                "Could not ensure data is fully up-to-date before display. Showing latest available.",
              status: "warning",
              duration: 3000,
              isClosable: true,
              position: "top-right",
            });
          }

          // Add cache-busting parameter
          const response = await axios.get(
            `${process.env.NEXT_PUBLIC_BACKEND_API}/api/waybillSummary/waybill/${selectedWaybillNumber}?_t=${Date.now()}`,
            {
              headers: {
                "Cache-Control": "no-cache",
                Pragma: "no-cache",
                Expires: "0",
              },
            }
          );

          // Get the fresh data
          if (response.data) {
            const freshData = response.data;
            console.log(
              "Fetched fresh waybill data for confirmation modal:",
              freshData
            );

            // Process percentage format
            let percentage = freshData.totalPercentage;
            if (typeof percentage === "string" && percentage.includes("%")) {
              percentage = parseFloat(percentage.replace("%", ""));
            }

            // Store this data for the confirmation modal
            setCloseModalWaybillData({
              ...freshData,
              totalPercentage: percentage,
            });
          }

          // Try to find the current truck CBM value in the DOM
          const truckCbmElement = document.querySelector(
            '[data-testid="truck-cbm-value"]'
          );
          if (truckCbmElement) {
            const truckCbmValue = parseFloat(truckCbmElement.textContent);
            if (!isNaN(truckCbmValue)) {
              console.log("Got truck CBM from DOM:", truckCbmValue);
              setTruckCbm(truckCbmValue);
            }
          }

          // Continue with the existing flow
          checkForSubWaybillNumbers(selectedWaybillNumber)
            .then((hasSubWaybills) => {
              console.log(
                "checkForSubWaybillNumbers completed, hasSubWaybills:",
                hasSubWaybills
              );
              if (!hasSubWaybills) {
                // If there are no sub-waybills, show confirmation modal instead of auto-closing
                console.log(
                  "No sub-waybills, showing close confirmation modal"
                );
                setIsCloseConfirmModalOpen(true);
              } else {
                console.log(
                  "Has sub-waybills, keeping modal open until user decides"
                );
                // The duplicate modal should be showing now
              }
            })
            .catch((error) => {
              console.error("Error in checkForSubWaybillNumbers:", error);
              // On error, show confirmation modal
              setIsCloseConfirmModalOpen(true);
            });
        } catch (error) {
          console.error("Error fetching latest waybill data:", error);
          // Continue showing the modal even on error
          setIsCloseConfirmModalOpen(true);
        } finally {
          setIsLoading(false);
        }
      };

      // Run the fetch operation
      fetchLatestWaybillData();
    } else {
      console.log("No selectedWaybillNumber, showing close confirmation modal");
      setIsCloseConfirmModalOpen(true);
    }
  }, [selectedWaybillNumber, truckCbm]);

  // Add this function to complete the modal closing process
  const completeModalClose = () => {
    console.log("completeModalClose called - executing final close actions");
    onClose();
    setSelectedWaybillNumber("");
    setSelectedDropType("");
    setWasExplicitlyClosed(true);

    // Store the closed state in localStorage
    localStorage.setItem("dropTypeModalClosed", "true");
    localStorage.setItem(
      "closedWaybillNumber",
      router.query.waybillNumber || ""
    );

    // Remove all modal-related URL parameters
    router.push(
      {
        pathname: router.pathname,
        query: {}, // Clear all query parameters
      },
      undefined,
      { shallow: true }
    );

    console.log("Modal closed, forcing single complete data refresh...");

    // Force a complete table refresh by:
    // 1. Clear all state that might affect rendering
    setWaybills([]);
    setSearchQuery("");
    setCurrentPage(1);
    setDuplicateWaybills({});

    // 2. Increment the refresh counter to force component updates
    // We'll use the useEffect hook attached to refreshCounter to handle the actual refresh
    // This ensures only ONE refresh happens
    setRefreshCounter((prev) => prev + 1);
  };

  // Add these new states after the other state declarations
  const [subWaybillNumbers, setSubWaybillNumbers] = useState([]);
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
  const [selectedSubWaybills, setSelectedSubWaybills] = useState({});
  const [isDuplicating, setIsDuplicating] = useState(false);

  // Update this function to check for sub-waybill numbers and return a boolean
  const checkForSubWaybillNumbers = async (waybillNumber) => {
    try {
      console.log("Checking for sub-waybill numbers for:", waybillNumber);

      // Attempt to process summaries first to get the latest data for the source waybill
      try {
        console.log(
          `Attempting to process summary for source waybill: ${waybillNumber} before checking for sub-waybills.`
        );
        await axios.post(
          `${process.env.NEXT_PUBLIC_BACKEND_API}/api/waybillSummary/process?_t=${Date.now()}`
        );
        console.log(
          `Processing request for source waybill ${waybillNumber} summary completed.`
        );
      } catch (processingError) {
        console.error(
          `Error during summary processing for source waybill ${waybillNumber}:`,
          processingError
        );
        // Non-critical error, log it and proceed. Data for the metrics section might be slightly stale.
        toast({
          title: "Processing Notice",
          description:
            "Could not ensure source waybill data is fully up-to-date for metrics display. Showing latest available.",
          status: "warning",
          duration: 3000,
          isClosable: true,
          position: "top-right",
        });
      }

      // Updated API endpoint to match the pattern used elsewhere in the file
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/entity-abbreviation-summary/waybill/${waybillNumber}`
      );

      console.log("Entity abbreviation summary response:", response.data);

      if (response.data && Array.isArray(response.data)) {
        // Extract unique sub-waybill numbers
        const subWaybills = new Set();

        // Log the first entity to see its full structure
        if (response.data.length > 0) {
          console.log(
            "First entity full structure:",
            JSON.stringify(response.data[0], null, 2)
          );
        }

        response.data.forEach((entity) => {
          console.log("Entity:", entity.entityAbbreviation || "unknown");

          // Check for subWaybillNumber (singular) field
          if (
            entity.subWaybillNumber &&
            entity.subWaybillNumber.trim() !== ""
          ) {
            console.log(
              `Found sub-waybill number in entity ${entity.entityAbbreviation}:`,
              entity.subWaybillNumber
            );
            subWaybills.add(entity.subWaybillNumber);
          }
        });

        console.log("Found sub-waybill numbers:", Array.from(subWaybills));

        // If there are sub-waybill numbers, show the duplication modal
        if (subWaybills.size > 0) {
          const subWaybillArray = Array.from(subWaybills);
          console.log("Setting sub-waybill numbers state:", subWaybillArray);
          setSubWaybillNumbers(subWaybillArray);

          // Initialize all as selected
          const initialSelectedState = {};
          subWaybillArray.forEach((num) => {
            initialSelectedState[num] = true;
          });
          setSelectedSubWaybills(initialSelectedState);

          console.log("Opening duplicate modal");
          setIsDuplicateModalOpen(true);
          return true; // Has sub-waybills
        } else {
          console.log("No sub-waybill numbers found");
        }
      } else {
        console.log("No entity abbreviation data or not an array");
      }
      return false; // No sub-waybills
    } catch (error) {
      console.error("Error checking for sub-waybill numbers:", error);
      return false; // Error, assume no sub-waybills
    }
  };

  const duplicateEntitiesAndHighestRate = async (
    sourceWaybillNumber,
    targetWaybillNumbers
  ) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/entity-abbreviation-summary/duplicate-entities-with-highest-rate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sourceWaybillNumber, targetWaybillNumbers }),
        }
      );
      if (!response.ok) {
        throw new Error("Failed to duplicate entities and highest rate");
      }
      return await response.json();
    } catch (error) {
      console.error("Error duplicating entities and highest rate:", error);
      throw error;
    }
  };

  // Update handleDuplicateSubWaybills to close the modal when done
  const handleDuplicateSubWaybills = async () => {
    try {
      setIsDuplicating(true);

      // Filter only selected sub-waybill numbers
      const selectedWaybills = Object.entries(selectedSubWaybills)
        .filter(([_, isSelected]) => isSelected)
        .map(([waybillNum]) => waybillNum);

      if (selectedWaybills.length === 0) {
        setIsDuplicateModalOpen(false);
        setIsDuplicating(false);
        completeModalClose(); // Close the main modal after cancellation
        return;
      }

      // Process each selected sub-waybill
      for (const subWaybillNumber of selectedWaybills) {
        console.log(
          `Processing duplication for sub-waybill ${subWaybillNumber}`
        );

        // First clean up any existing data in the target waybill
        await cleanupTargetWaybill(subWaybillNumber);

        // 1. Fetch shipper information for the source waybill
        const shipperResponse = await axios.get(
          `${process.env.NEXT_PUBLIC_BACKEND_API}/api/shipperInfo/${selectedWaybillNumber}`
        );

        if (shipperResponse.status === 200 && shipperResponse.data) {
          const sourceShipperInfo = shipperResponse.data;
          console.log("Source shipper information:", sourceShipperInfo);

          // Create a clean version of the shipper info for duplication
          const { _id, __v, createdAt, updatedAt, ...shipperDataToKeep } =
            sourceShipperInfo;

          // Duplicate shipper information with the new waybill number
          const duplicatedShipperInfo = {
            ...shipperDataToKeep,
            waybillNumber: subWaybillNumber,
            duplicated: "duplicate",
            duplicateReference: selectedWaybillNumber,
            shipper: sourceShipperInfo.shipper || "",
          };

          console.log("Duplicating shipper info:", duplicatedShipperInfo);

          // Create new shipper info record
          await axios.post(
            `${process.env.NEXT_PUBLIC_BACKEND_API}/api/shipperInfo`,
            duplicatedShipperInfo
          );

          console.log(
            `Successfully duplicated shipper information to waybill ${subWaybillNumber}`
          );
        } else {
          console.log(
            `No shipper information found for waybill ${selectedWaybillNumber}`
          );
        }

        // 2. Fetch entity summaries to duplicate
        const entityResponse = await axios.get(
          `${process.env.NEXT_PUBLIC_BACKEND_API}/api/entity-abbreviation-summary/waybill/${selectedWaybillNumber}`
        );

        if (entityResponse.status === 200 && entityResponse.data) {
          const allEntitySummaries = entityResponse.data;
          console.log("All entity summaries:", allEntitySummaries);

          // Filter to only get entity summaries with the selected subWaybillNumber
          const entitySummariesToDuplicate = allEntitySummaries.filter(
            (summary) => summary.subWaybillNumber === subWaybillNumber
          );

          console.log(
            `Found ${entitySummariesToDuplicate.length} entity summaries with subWaybillNumber ${subWaybillNumber}`
          );

          if (entitySummariesToDuplicate.length > 0) {
            // 3. Duplicate all entity summaries using the selected sub waybill number
            const duplicatedSummaries = entitySummariesToDuplicate.map(
              (summary) => ({
                ...summary,
                waybillNumber: subWaybillNumber, // Use sub waybill as the new waybill number
                subWaybillNumber: "", // Reset subWaybillNumber in the new record
                _id: undefined, // Remove _id to create new entries
                duplicated: "duplicate", // Mark as duplicate
                duplicateReference: selectedWaybillNumber, // Reference to original
              })
            );

            console.log(
              `Duplicating ${duplicatedSummaries.length} entity summaries to waybill ${subWaybillNumber}`
            );

            // 4. Create new entity summaries
            await axios.post(
              `${process.env.NEXT_PUBLIC_BACKEND_API}/api/entity-abbreviation-summary/waybill/${subWaybillNumber}`,
              duplicatedSummaries
            );

            // 5. Set duplicate status
            await axios.put(
              `${process.env.NEXT_PUBLIC_BACKEND_API}/api/entity-abbreviation-summary/duplicate-status/${subWaybillNumber}`,
              {
                duplicated: "duplicate",
                duplicateReference: selectedWaybillNumber,
                viewOnly: true,
              }
            );

            // 6. Fetch consignees associated with the source waybill
            const consigneeResponse = await axios.get(
              `${process.env.NEXT_PUBLIC_BACKEND_API}/api/consigneeInfo?waybillNumber=${selectedWaybillNumber}`
            );

            if (consigneeResponse.status === 200 && consigneeResponse.data) {
              const sourceConsignees = consigneeResponse.data;
              console.log("All source consignees:", sourceConsignees);

              // 7. Filter consignees that belong to this entity and have the subWaybillNumber
              const consigneesToDuplicate = sourceConsignees.filter(
                (consignee) => {
                  // Check if consignee has the subWaybillNumber
                  const hasSubWaybillNumber =
                    consignee.subWaybillNumber === subWaybillNumber;

                  // Get the entity abbreviation from the consignee
                  const consigneeEntityAbbr = extractEntityAbbr(
                    consignee.consignee
                  );

                  // Check if this entity abbreviation is in our filtered entity summaries
                  const isEntityInSummaries = entitySummariesToDuplicate.some(
                    (summary) =>
                      summary.entityAbbreviation === consigneeEntityAbbr
                  );

                  return hasSubWaybillNumber || isEntityInSummaries;
                }
              );

              console.log(
                `Found ${consigneesToDuplicate.length} consignees to duplicate`
              );

              if (consigneesToDuplicate.length > 0) {
                // 8. Duplicate these consignees
                const duplicatedConsignees = consigneesToDuplicate.map(
                  (consignee) => ({
                    ...consignee,
                    waybillNumber: subWaybillNumber, // Use the sub waybill number as the new waybill number
                    subWaybillNumber: "", // Reset subWaybillNumber in the new record
                    _id: undefined, // Remove _id to create new entries
                    duplicated: "duplicate",
                    duplicateReference: selectedWaybillNumber,
                  })
                );

                console.log(
                  `Duplicating ${duplicatedConsignees.length} consignees to waybill ${subWaybillNumber}`
                );

                // Try batch creation first, fall back to individual
                try {
                  await axios.post(
                    `${process.env.NEXT_PUBLIC_BACKEND_API}/api/consigneeInfo/batch`,
                    duplicatedConsignees
                  );
                } catch (error) {
                  console.log(
                    "Batch endpoint failed, trying individual creation"
                  );
                  // Fall back to creating consignees one by one
                  for (const consignee of duplicatedConsignees) {
                    await axios.post(
                      `${process.env.NEXT_PUBLIC_BACKEND_API}/api/consigneeInfo`,
                      consignee
                    );
                  }
                }
              } else {
                console.log(
                  `No consignees found to duplicate for waybill ${subWaybillNumber}`
                );
              }
            }
          } else {
            console.log(
              `No entity summaries found with subWaybillNumber ${subWaybillNumber}`
            );
          }
        }
      }

      toast({
        title: "Success",
        description: "Selected sub-waybills have been duplicated successfully",
        status: "success",
        duration: 5000,
        isClosable: true,
        position: "top-right",
      });

      if (selectedWaybills.length > 0) {
        try {
          const result = await duplicateEntitiesAndHighestRate(
            selectedWaybillNumber,
            selectedWaybills
          );
          if (
            result.duplicatedHighestRates &&
            result.duplicatedHighestRates.length > 0
          ) {
            toast({
              title: "Highest Rate Duplicated",
              description: `Highest rate duplicated for waybills: ${result.duplicatedHighestRates.join(", ")}`,
              status: "success",
              duration: 4000,
              isClosable: true,
              position: "top-right",
            });
          }
        } catch (error) {
          toast({
            title: "Error",
            description: "Failed to duplicate highest rate.",
            status: "error",
            duration: 4000,
            isClosable: true,
            position: "top-right",
          });
        }
      }
    } catch (error) {
      console.error("Error duplicating sub-waybills:", error);
      toast({
        title: "Error",
        description: "Failed to duplicate sub-waybills: " + error.message,
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "top-right",
      });
    } finally {
      setIsDuplicateModalOpen(false);
      setIsDuplicating(false);
      completeModalClose(); // Close the main modal after duplication

      // Force a complete refresh of the waybill data
      setWaybills([]);
      setTimeout(() => {
        fetchDataAndProcess();
      }, 100);
    }
  };

  // Add function to clean up target waybill before duplication
  const cleanupTargetWaybill = async (targetWaybillNumber) => {
    try {
      console.log(
        `Cleaning up target waybill ${targetWaybillNumber} before duplication`
      );

      // 1. Delete all entity summaries for the target waybill
      await axios.delete(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/entity-abbreviation-summary/waybill/${targetWaybillNumber}`
      );

      // 2. Delete all consignees for the target waybill
      try {
        await axios.delete(
          `${process.env.NEXT_PUBLIC_BACKEND_API}/api/consigneeInfo/waybill/${targetWaybillNumber}/all`
        );
      } catch (error) {
        console.error("Error deleting consignees:", error);
      }

      return true;
    } catch (error) {
      console.error("Error cleaning up target waybill:", error);
      toast({
        title: "Warning",
        description:
          "Could not fully clean up target waybill data. Proceeding with duplication anyway.",
        status: "warning",
        duration: 3000,
        isClosable: true,
        position: "top-right",
      });
      return false;
    }
  };

  // Add helper function to extract entity abbreviation
  const extractEntityAbbr = (name) => {
    if (!name) return "";

    // Extract abbreviation in parentheses if present
    const match = name.match(/\(([^)]+)\)/);
    if (match) {
      return match[1].trim();
    }

    // Alternative method: take the first word
    const firstWord = name.split(" ")[0];
    return firstWord || "";
  };

  // Update handleShowAllConsignees
  const handleShowAllConsignees = async (consignees, waybillNumber) => {
    try {
      router.push(
        {
          pathname: router.pathname,
          query: {
            ...router.query,
            modal: "consignees",
            waybillNumber,
          },
        },
        undefined,
        { shallow: true }
      );

      // Fetch consignee details from the API based on waybill number
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/consigneeInfo?waybillNumber=${waybillNumber}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch consignee details");
      }

      const consigneeDetails = await response.json();

      // Filter to ensure only consignees for this specific waybill number
      const filteredConsigneeDetails = consigneeDetails.filter(
        (consignee) => consignee.waybillNumber === waybillNumber
      );

      const consigneeData = [...filteredConsigneeDetails];

      // Try to fetch sub-details if available
      try {
        const subDetailsResponse = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_API}/api/subdetails?waybillNumber=${waybillNumber}`
        );

        if (subDetailsResponse.ok) {
          const subDetails = await subDetailsResponse.json();

          // Filter to ensure only sub-details for this specific waybill number
          const filteredSubDetails = subDetails.filter(
            (subDetail) => subDetail.waybillNumber === waybillNumber
          );

          // Enhance consignee details with sub-details if applicable
          if (filteredSubDetails && filteredSubDetails.length > 0) {
            // Create a mapping of consignee to its subdetails
            const consigneeToSubdetails = {};

            // Group subdetails by parent consignee
            filteredSubDetails.forEach((subDetail) => {
              const consigneeName = subDetail.consignee;
              if (!consigneeToSubdetails[consigneeName]) {
                consigneeToSubdetails[consigneeName] = [];
              }
              consigneeToSubdetails[consigneeName].push({
                ...subDetail,
                isSubDetail: true,
              });
            });

            // Mark consignees that have subdetails
            consigneeData.forEach((consignee) => {
              if (consigneeToSubdetails[consignee.consignee]) {
                consignee.hasSubDetails = true;
                consignee.subDetails =
                  consigneeToSubdetails[consignee.consignee];
              }
            });
          }
        }
      } catch (subError) {
        console.error("Error fetching sub-details:", subError);
      }

      // If no consignees were found after filtering, use the names provided
      if (consigneeData.length === 0) {
        setSelectedConsignees(
          consignees.map((name) => ({
            name,
            waybillNumber,
            consignee: name,
          }))
        );
      } else {
        setSelectedConsignees(consigneeData);
      }

      onConsigneesModalOpen();
    } catch (error) {
      console.error("Error fetching consignee details:", error);
      // Fallback to just showing the names if fetching details fails
      setSelectedConsignees(
        consignees.map((name) => ({
          name,
          waybillNumber,
          consignee: name,
        }))
      );
      onConsigneesModalOpen();
    }
  };

  // Add handler for truck CBM updates
  const handleTruckCbmUpdate = (cbm) => {
    setTruckCbm(cbm);
  };

  // Update search function with debounce
  const handleSearch = useMemo(() => {
    return debounce((value) => {
      setSearchInputValue(value);
      setSearchQuery(value);
      setCurrentPage(1); // Reset to first page when searching
    }, 300); // Reduce debounce time for better responsiveness
  }, []);

  // Update the handleRowHover function to fetch consignee details
  const handleRowHover = async (waybill) => {
    if (waybill) {
      // Set the currently hovered waybill immediately
      setHoveredWaybill(waybill);
      setActivePopoverWaybill(waybill.waybillNumber);

      try {
        // Check for duplicate status
        if (!duplicateWaybills[waybill.waybillNumber]) {
          // Only check waybills we don't already know are duplicates
          try {
            const isDuplicate = await checkIsDuplicate(waybill.waybillNumber);
            if (isDuplicate) {
              // Update the duplicate status in our state if it's a duplicate
              setDuplicateWaybills((prev) => ({
                ...prev,
                [waybill.waybillNumber]: true,
              }));
              console.log(
                `Updated duplicate status for ${waybill.waybillNumber} during hover`
              );
            }
          } catch (error) {
            console.error(
              `Error checking waybill ${waybill.waybillNumber} for duplicate status:`,
              error
            );
          }
        }

        // Fetch consignee details for the popover
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_BACKEND_API}/api/consigneeInfo?waybillNumber=${waybill.waybillNumber}`
        );

        if (response.data && Array.isArray(response.data)) {
          // Filter to ensure only consignees for this specific waybill number
          const filteredConsigneeDetails = response.data.filter(
            (consignee) => consignee.waybillNumber === waybill.waybillNumber
          );

          console.log(
            `Fetched ${filteredConsigneeDetails.length} consignee details for waybill ${waybill.waybillNumber}`
          );
          setHoverConsigneeDetails(filteredConsigneeDetails);

          // Try to fetch sub-details if available
          try {
            const subDetailsResponse = await axios.get(
              `${process.env.NEXT_PUBLIC_BACKEND_API}/api/subdetails?waybillNumber=${waybill.waybillNumber}`
            );

            if (
              subDetailsResponse.data &&
              Array.isArray(subDetailsResponse.data)
            ) {
              // Filter to ensure only sub-details for this specific waybill number
              const filteredSubDetails = subDetailsResponse.data.filter(
                (subDetail) => subDetail.waybillNumber === waybill.waybillNumber
              );

              setHoverSubDetails(filteredSubDetails);
              console.log(
                `Fetched ${filteredSubDetails.length} sub-details for waybill ${waybill.waybillNumber}`
              );
            }
          } catch (subError) {
            console.error(
              `Error fetching sub-details for waybill ${waybill.waybillNumber}:`,
              subError
            );
            setHoverSubDetails([]);
          }
        } else {
          console.warn(
            `No consignee details found for waybill ${waybill.waybillNumber}`
          );
          setHoverConsigneeDetails([]);
          setHoverSubDetails([]);
        }
      } catch (error) {
        console.error(
          `Error in handleRowHover for waybill ${waybill.waybillNumber}:`,
          error
        );
        setHoverConsigneeDetails([]);
        setHoverSubDetails([]);
      }
    }
  };

  // Update the handleRowLeave function
  const handleRowLeave = () => {
    // Set a small delay before clearing to avoid flickering
    setTimeout(() => {
      if (!activePopoverWaybill) {
        setHoveredWaybill(null);
        setHoverConsigneeDetails([]);
        setHoverSubDetails([]);
        if (hoverTimeout) {
          clearTimeout(hoverTimeout);
          setHoverTimeout(null);
        }
        setIsHovering(false);
        setShowPreview(false);
      }
    }, 100);
  };

  // Add useEffect for cleanup
  useEffect(() => {
    return () => {
      if (hoverTimeout) {
        clearTimeout(hoverTimeout);
      }
    };
  }, [hoverTimeout]);

  // Update handleViewPDF
  const handleViewPDF = async (waybillNumber) => {
    try {
      router.push(
        {
          pathname: router.pathname,
          query: {
            ...router.query,
            modal: "pdf",
            waybillNumber,
          },
        },
        undefined,
        { shallow: true }
      );

      setIsLoading(true);

      // Check if waybill exists and has PDF
      const waybillResponse = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/waybillSummary/waybill/${waybillNumber}`
      );

      if (!waybillResponse.data || !waybillResponse.data.hasPDF) {
        toast({
          title: "No PDF Available",
          description:
            "This waybill doesn't have a PDF saved yet. Please capture it first.",
          status: "warning",
          duration: 3000,
          isClosable: true,
          position: "top-right",
        });
        setIsLoading(false);
        return;
      }

      // Fetch the PDF data with explicit responseType and headers
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/waybillSummary/getPDF/${waybillNumber}`,
        {
          responseType: "blob",
          headers: {
            Accept: "application/pdf",
          },
        }
      );

      if (!response.data) {
        throw new Error("PDF data is missing or corrupted");
      }

      // Create a blob URL from the response data
      const blob = new Blob([response.data], { type: "application/pdf" });
      const pdfUrl = URL.createObjectURL(blob);

      setViewingPDF({
        waybillNumber,
        pdfData: pdfUrl,
        contentType: "application/pdf",
      });

      onPDFModalOpen();
    } catch (error) {
      console.error("Error fetching PDF:", error);
      toast({
        title: "Error",
        description:
          error.response?.data?.message ||
          "Failed to fetch PDF. It may not exist yet.",
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "top-right",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Function to download the PDF
  const handleDownloadPDF = () => {
    if (!viewingPDF || !viewingPDF.pdfData) return;

    try {
      // Create a link element
      const link = document.createElement("a");
      link.href = viewingPDF.pdfData;
      link.download = `Waybill_${viewingPDF.waybillNumber}.pdf`;
      document.body.appendChild(link);
      link.click();

      // Clean up
      setTimeout(() => {
        document.body.removeChild(link);
      }, 100);
    } catch (error) {
      console.error("Error downloading PDF:", error);
      toast({
        title: "Error",
        description: "Failed to download the PDF",
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "top-right",
      });
    }
  };

  // Cleanup PDF data when modal closes
  const handlePDFModalClose = () => {
    onPDFModalClose();
    // Allow some time for the modal to close before cleaning up
    setTimeout(() => {
      if (viewingPDF?.pdfData) {
        URL.revokeObjectURL(viewingPDF.pdfData);
      }
      setViewingPDF(null);
    }, 300);
  };

  // Add this function to handle hard copy upload
  const handleHardCopyUpload = async (waybillNumber, file) => {
    try {
      setIsLoading(true);

      // Convert file to base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64Data = e.target.result;

        // Send to backend
        const response = await axios.post(
          `${process.env.NEXT_PUBLIC_BACKEND_API}/api/waybillSummary/saveHardCopy/${waybillNumber}`,
          {
            imageData: base64Data,
            uploadedBy: "Current User", // Replace with actual user info if available
          }
        );

        if (response.data) {
          // Update the waybills state to reflect the new hard copy
          setWaybills((prevWaybills) =>
            prevWaybills.map((w) =>
              w.waybillNumber === waybillNumber
                ? { ...w, hasHardCopy: true }
                : w
            )
          );

          toast({
            title: "Success",
            description: "Hard copy uploaded successfully",
            status: "success",
            duration: 3000,
            isClosable: true,
            position: "top-right",
          });
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Error uploading hard copy:", error);
      toast({
        title: "Error",
        description: "Failed to upload hard copy",
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "top-right",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Update handleViewHardCopy
  const handleViewHardCopy = async (waybillNumber) => {
    try {
      router.push(
        {
          pathname: router.pathname,
          query: {
            ...router.query,
            modal: "hardcopy",
            waybillNumber,
          },
        },
        undefined,
        { shallow: true }
      );

      setIsLoading(true);
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/waybillSummary/getHardCopy/${waybillNumber}`,
        {
          responseType: "blob",
        }
      );

      const blob = new Blob([response.data], { type: "image/jpeg" });
      const imageUrl = URL.createObjectURL(blob);

      setViewingHardCopy({
        waybillNumber,
        imageUrl,
      });

      onHardCopyModalOpen();
    } catch (error) {
      console.error("Error fetching hard copy:", error);
      toast({
        title: "Error",
        description: "Failed to fetch hard copy image",
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "top-right",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Add cleanup for hard copy image URL
  const handleHardCopyModalClose = () => {
    onHardCopyModalClose();
    if (viewingHardCopy?.imageUrl) {
      URL.revokeObjectURL(viewingHardCopy.imageUrl);
    }
    setViewingHardCopy(null);
  };

  // Update useEffect for URL parameters
  useEffect(() => {
    const { modal, waybillNumber, type } = router.query;

    // Check if this specific waybill's modal was explicitly closed
    const storedWaybill = localStorage.getItem("closedWaybillNumber");
    const isThisWaybillClosed =
      storedWaybill === waybillNumber &&
      localStorage.getItem("dropTypeModalClosed") === "true";

    // Only handle modal opening if:
    // 1. We have the right URL parameters
    // 2. No modal is currently open
    // 3. This specific waybill's modal wasn't explicitly closed
    if (modal === "drops" && waybillNumber && !isOpen && !isThisWaybillClosed) {
      setDropWaybillNumber(waybillNumber);
      // Always set type as "multiple" and open the main modal
      setSelectedDropType("multiple");
      setSelectedWaybillNumber(waybillNumber);
      onOpen();
    }
  }, [router.query, isOpen, onOpen]);

  // Update modal close handlers
  const closeDropTypeModal = useCallback(() => {
    dropTypeModal.onClose();
    setDropWaybillNumber("");
    setWasExplicitlyClosed(true);

    // Store the closed state in localStorage
    localStorage.setItem("dropTypeModalClosed", "true");
    localStorage.setItem(
      "closedWaybillNumber",
      router.query.waybillNumber || ""
    );

    // Remove all modal-related URL parameters
    router.push(
      {
        pathname: router.pathname,
        query: {}, // Clear all query parameters
      },
      undefined,
      { shallow: true }
    );

    // Refresh data when modal is closed
    fetchDataAndProcess();
  }, [dropTypeModal, router.query.waybillNumber, router, fetchDataAndProcess]);

  // Reset wasExplicitlyClosed when leaving the page
  useEffect(() => {
    const handleRouteChange = (url) => {
      // Only clear if navigating away from the waybills page
      if (!url.includes("/waybills")) {
        localStorage.removeItem("dropTypeModalClosed");
        localStorage.removeItem("closedWaybillNumber");
      }
    };

    router.events.on("routeChangeStart", handleRouteChange);

    return () => {
      router.events.off("routeChangeStart", handleRouteChange);
    };
  }, [router.events]);

  // Professional UI accent colors (matching payroll)
  const blueAccent = "#1a365d"; // Dark navy blue
  const redAccent = "#c53030"; // Deep red
  const yellowAccent = "#D69E2E"; // Consistent yellow
  const tableBorderColor = "#E2E8F0"; // Light gray border
  const tableBg = "white";
  const tableHeaderBg = "#F7FAFC"; // Very light blue-gray
  const hoverBg = "#F0F7FF"; // Light blue hover
  const cardShadow = "0px 2px 8px rgba(0, 0, 0, 0.06)";

  // Add state for searchInputValue
  const [searchInputValue, setSearchInputValue] = useState("");

  // Update the checkIsDuplicate function to handle 404 errors gracefully
  const checkIsDuplicate = async (waybillNumber) => {
    try {
      // Use the more efficient duplicate-status endpoint
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/entity-abbreviation-summary/duplicate-status/${waybillNumber}`
      );

      if (response.data) {
        const isDuplicate = response.data.duplicated === "duplicate";
        if (isDuplicate) {
          console.log(`Found duplicate status for waybill ${waybillNumber}`);
          return true;
        }
      }

      return false;
    } catch (error) {
      // If it's a 404 error, just return false instead of using fallback
      if (error.response && error.response.status === 404) {
        console.log(`No duplicate status found for waybill ${waybillNumber}`);
        return false;
      }

      console.error(
        `Error checking duplicate status for ${waybillNumber}:`,
        error
      );
      // Use fallback method only for non-404 errors
      return checkWaybillForDuplicateIndicators({ waybillNumber });
    }
  };

  // Add this function to check for duplicate indicators in waybill data
  const checkWaybillForDuplicateIndicators = (waybill) => {
    // Add fallback logic to detect if this is likely a duplicate waybill
    // by looking for tell-tale signs in the waybill data

    // 1. Check if reference or shipper fields contain words like "duplicate" or "copy"
    const referenceText = waybill.reference?.toLowerCase() || "";
    const shipperText = waybill.shipper?.toLowerCase() || "";

    if (
      referenceText.includes("duplicate") ||
      referenceText.includes("copy") ||
      shipperText.includes("duplicate") ||
      shipperText.includes("copy")
    ) {
      console.log(
        `Waybill ${waybill.waybillNumber} has duplicate indicators in text fields`
      );
      return true;
    }

    // 2. Check if the totalPercentage is very close to 100 (like 99.9%)
    if (waybill.totalPercentage > 99.5 && waybill.totalPercentage < 100) {
      console.log(
        `Waybill ${waybill.waybillNumber} has near-100% percentage (${waybill.totalPercentage})`
      );
      return true;
    }

    return false;
  };

  // Update the checkDuplicateStatusForWaybills function to be more efficient
  useEffect(() => {
    const checkDuplicateStatusForWaybills = async () => {
      if (waybills.length === 0) return;

      try {
        setIsDuplicateCheckLoading(true);
        const duplicateStatuses = { ...duplicateWaybills };
        const loadingStatus = { ...loadingWaybills };

        // Only check waybills that we don't have status for yet
        const waybillsToCheck = waybills.filter(
          (waybill) => duplicateWaybills[waybill.waybillNumber] === undefined
        );

        if (waybillsToCheck.length === 0) {
          setIsDuplicateCheckLoading(false);
          return;
        }

        // Process in larger batches (10 at a time) for better performance
        const batchSize = 10;
        for (let i = 0; i < waybillsToCheck.length; i += batchSize) {
          const batch = waybillsToCheck.slice(i, i + batchSize);

          // Set loading status for this batch
          batch.forEach((waybill) => {
            loadingStatus[waybill.waybillNumber] = true;
          });
          setLoadingWaybills({ ...loadingStatus });

          // Process batch in parallel
          await Promise.all(
            batch.map(async (waybill) => {
              try {
                // Check localStorage cache first
                const cacheKey = `waybill_duplicate_${waybill.waybillNumber}`;
                const cachedStatus = localStorage.getItem(cacheKey);

                if (cachedStatus) {
                  const { status, timestamp } = JSON.parse(cachedStatus);
                  // Cache for 1 hour
                  const isStillValid = Date.now() - timestamp < 60 * 60 * 1000;

                  if (isStillValid) {
                    duplicateStatuses[waybill.waybillNumber] = status === true;
                    loadingStatus[waybill.waybillNumber] = false;
                    return;
                  }
                }

                // If no cache or expired, check via API
                const isDuplicate = await checkIsDuplicate(
                  waybill.waybillNumber
                );

                // Update cache
                localStorage.setItem(
                  cacheKey,
                  JSON.stringify({
                    status: isDuplicate,
                    timestamp: Date.now(),
                  })
                );

                duplicateStatuses[waybill.waybillNumber] = isDuplicate;
                loadingStatus[waybill.waybillNumber] = false;
              } catch (error) {
                console.error(
                  `Error checking duplicate for ${waybill.waybillNumber}:`,
                  error
                );
                // Use fallback detection on error
                duplicateStatuses[waybill.waybillNumber] =
                  checkWaybillForDuplicateIndicators(waybill);
                loadingStatus[waybill.waybillNumber] = false;
              }
            })
          );

          // Update states after each batch
          setDuplicateWaybills({ ...duplicateStatuses });
          setLoadingWaybills({ ...loadingStatus });

          // Add a smaller delay between batches
          if (i + batchSize < waybillsToCheck.length) {
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
        }
      } catch (error) {
        console.error("Error in duplicate status check:", error);
      } finally {
        setIsDuplicateCheckLoading(false);
      }
    };

    // Call the function when waybills change
    checkDuplicateStatusForWaybills();
  }, [waybills, checkIsDuplicate, checkWaybillForDuplicateIndicators]);

  // Add this useEffect to log duplicate status changes
  useEffect(() => {
    console.log("Duplicate waybills updated:", duplicateWaybills);
  }, [duplicateWaybills]);

  // Now add the function to handle status updates
  const handleToggleStatus = async (waybillNumber, currentStatus) => {
    try {
      const newStatus = currentStatus === "BILLED" ? "NOT BILLED" : "BILLED";

      await axios.put(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/waybillSummary/updateStatus/${waybillNumber}`,
        { status: newStatus }
      );

      // Update local state
      setWaybills((prevWaybills) =>
        prevWaybills.map((waybill) =>
          waybill.waybillNumber === waybillNumber
            ? { ...waybill, status: newStatus }
            : waybill
        )
      );

      toast({
        title: "Status updated",
        description: `Waybill ${waybillNumber} is now ${newStatus}`,
        status: "success",
        duration: 3000,
        isClosable: true,
        position: "top-right",
      });
    } catch (error) {
      console.error("Error updating waybill status:", error);
      toast({
        title: "Error",
        description: "Failed to update status. Please try again.",
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "top-right",
      });
    }
  };

  // Add state for backend stats
  const [waybillStats, setWaybillStats] = useState({
    total: 0,
    multipleDrops: 0,
    billed: 0,
    notBilled: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);

  // Fetch backend stats on mount and when refreshCounter changes
  useEffect(() => {
    const fetchStats = async () => {
      setStatsLoading(true);
      try {
        const res = await axios.get(
          `${process.env.NEXT_PUBLIC_BACKEND_API}/api/waybillSummary/stats/summary`
        );
        setWaybillStats(res.data);
      } catch (err) {
        setWaybillStats({
          total: 0,
          multipleDrops: 0,
          billed: 0,
          notBilled: 0,
        });
      } finally {
        setStatsLoading(false);
      }
    };
    fetchStats();
  }, [refreshCounter]);

  // Add useEffect to force refresh when refreshCounter changes
  useEffect(() => {
    if (refreshCounter > 0) {
      // Skip initial render
      console.log(
        "Refresh counter changed, performing single data refresh:",
        refreshCounter
      );

      // Show loading state
      setIsLoading(true);

      // --- MODIFICATION START ---
      // The fetchDataAndProcess function now handles the processing call internally.
      // So, we can directly call it.
      fetchDataAndProcess();
      // --- MODIFICATION END ---
    }
  }, [refreshCounter, fetchDataAndProcess]); // Added fetchDataAndProcess to dependencies

  return (
    <Box>
      {/* Add professional header section similar to payroll */}
      <Box
        py={4}
        px={6}
        color="#1a365d"
        borderRadius="md"
        mb={6}
        borderBottom="1px solid"
        borderColor={tableBorderColor}
      >
        <Heading size="2xl" fontWeight="bold">
          Waybill Summary
        </Heading>
        <Text mt={2} fontSize="md" color="gray.600">
          Manage waybill documents and trip delivery details
        </Text>
      </Box>

      {/* Add statistics card section */}
      <SimpleGrid columns={{ base: 1, md: 4 }} spacing={6} px={6} mb={6}>
        <Box
          p={4}
          borderRadius="lg"
          borderWidth="1px"
          borderColor={tableBorderColor}
          bg="white"
          boxShadow="sm"
          transition="all 0.3s"
          _hover={{ transform: "translateY(-2px)", boxShadow: "md" }}
        >
          <Flex align="center">
            <Box
              p={2}
              borderRadius="md"
              bg={`${primaryColor}15`}
              color={primaryColor}
              mr={3}
            >
              <Icon as={FaRegListAlt} boxSize={6} />
            </Box>
            <Box>
              <Text fontSize="sm" color="gray.500" fontWeight="medium">
                Total Waybills
              </Text>
              <Text fontSize="2xl" fontWeight="bold" color={primaryColor}>
                {statsLoading ? <Spinner size="sm" /> : waybillStats.total}
              </Text>
            </Box>
          </Flex>
        </Box>
        <Box
          p={4}
          borderRadius="lg"
          borderWidth="1px"
          borderColor={tableBorderColor}
          bg="white"
          boxShadow="sm"
          transition="all 0.3s"
          _hover={{ transform: "translateY(-2px)", boxShadow: "md" }}
        >
          <Flex align="center">
            <Box p={2} borderRadius="md" bg="red.50" color="red.500" mr={3}>
              <Icon as={FaRoute} boxSize={6} />
            </Box>
            <Box>
              <Text fontSize="sm" color="gray.500" fontWeight="medium">
                Multiple Drops
              </Text>
              <Text fontSize="2xl" fontWeight="bold" color="red.500">
                {statsLoading ? (
                  <Spinner size="sm" />
                ) : (
                  waybillStats.multipleDrops
                )}
              </Text>
            </Box>
          </Flex>
        </Box>
        <Box
          p={4}
          borderRadius="lg"
          borderWidth="1px"
          borderColor={tableBorderColor}
          bg="white"
          boxShadow="sm"
          transition="all 0.3s"
          _hover={{ transform: "translateY(-2px)", boxShadow: "md" }}
        >
          <Flex align="center">
            <Box p={2} borderRadius="md" bg="green.50" color="green.500" mr={3}>
              <Icon as={FaCheckCircle} boxSize={6} />
            </Box>
            <Box>
              <Text fontSize="sm" color="gray.500" fontWeight="medium">
                Billed
              </Text>
              <Text fontSize="2xl" fontWeight="bold" color="green.500">
                {statsLoading ? <Spinner size="sm" /> : waybillStats.billed}
              </Text>
            </Box>
          </Flex>
        </Box>
        <Box
          p={4}
          borderRadius="lg"
          borderWidth="1px"
          borderColor={tableBorderColor}
          bg="white"
          boxShadow="sm"
          transition="all 0.3s"
          _hover={{ transform: "translateY(-2px)", boxShadow: "md" }}
        >
          <Flex align="center">
            <Box
              p={2}
              borderRadius="md"
              bg="orange.50"
              color="orange.500"
              mr={3}
            >
              <Icon as={FaExclamationCircle} boxSize={6} />
            </Box>
            <Box>
              <Text fontSize="sm" color="gray.500" fontWeight="medium">
                Not Billed
              </Text>
              <Text fontSize="2xl" fontWeight="bold" color="orange.500">
                {statsLoading ? <Spinner size="sm" /> : waybillStats.notBilled}
              </Text>
            </Box>
          </Flex>
        </Box>
      </SimpleGrid>

      {/* Title and Search Bar */}
      <Flex direction="column" mb={6} px={6}>
        {/* Search and refresh */}
        <Flex align="center" gap={3}>
          <Button
            onClick={() => fetchDataAndProcess()}
            leftIcon={<RepeatIcon />}
            colorScheme="blue"
            variant="outline"
            size="md"
            width="100px"
            boxShadow="sm"
            _hover={{ boxShadow: "md", bg: "blue.50" }}
          >
            Refresh
          </Button>
          <InputGroup maxWidth="300px">
            <InputLeftElement pointerEvents="none">
              <SearchIcon color="gray.300" />
            </InputLeftElement>
            <Input
              placeholder="Search waybills..."
              value={searchInputValue}
              onChange={(e) => {
                const value = e.target.value;
                setSearchInputValue(value); // Update input field immediately
                handleSearch(value); // Debounced actual search
              }}
              borderRadius="md"
              borderColor="gray.300"
              boxShadow="sm"
              _focus={{ boxShadow: "0 0 0 1px #3182ce" }}
            />
            {searchInputValue && (
              <InputRightElement>
                <CloseIcon
                  boxSize="3"
                  color="gray.500"
                  cursor="pointer"
                  onClick={() => {
                    setSearchInputValue("");
                    setSearchQuery("");
                  }}
                />
              </InputRightElement>
            )}
          </InputGroup>

          <Select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1); // Reset to first page when changing filter
            }}
            width="150px"
            borderRadius="md"
            borderColor="gray.300"
            boxShadow="sm"
            size="md"
          >
            <option value="ALL">All Status</option>
            <option value="NOT BILLED">Not Billed</option>
            <option value="BILLED">Billed</option>
          </Select>
        </Flex>
      </Flex>

      {/* Table Container with improved styling */}
      <Box
        key={`waybill-table-${refreshCounter}`} // Add key to force re-render
        borderWidth="1px"
        borderRadius="lg"
        borderColor={tableBorderColor}
        boxShadow={cardShadow}
        overflow="hidden"
        mx={6}
      >
        <TableContainer
          maxHeight="calc(100vh - 280px)"
          overflowY="auto"
          overflowX="auto"
        >
          <Table variant="simple" size="sm" layout="fixed">
            <Thead
              bg={tableHeaderBg}
              position="sticky"
              top={0}
              zIndex={1}
              boxShadow="0 1px 2px rgba(0,0,0,0.05)"
            >
              <Tr>
                {[
                  {
                    id: "waybillNumber",
                    name: "WAYBILL NUMBER",
                    width: "8%",
                    align: "left",
                  },
                  {
                    id: "shipper",
                    name: "SHIPPER",
                    width: "12%",
                    align: "left",
                  },
                  {
                    id: "consignees",
                    name: "CONSIGNEES",
                    width: "24%",
                    align: "left",
                  },
                  { name: "DROPS", width: "8%", align: "center" },
                  {
                    id: "totalCBM",
                    name: "TOTAL CBM",
                    width: "6%",
                    align: "right",
                  },
                  {
                    id: "additionals",
                    name: "ADDITIONALS",
                    width: "6%",
                    align: "right",
                  },
                  {
                    id: "totalPercentage",
                    name: "TOTAL PERCENTAGE",
                    width: "8%",
                    align: "right",
                  },
                  {
                    id: "totalCost",
                    name: "TOTAL COST",
                    width: "6%",
                    align: "right",
                  },
                  {
                    id: "status",
                    name: "STATUS",
                    width: "7%",
                    align: "center",
                  },
                  { name: "SOFT COPY", width: "5%", align: "center" },
                  { name: "HARD COPY", width: "7%", align: "center" },
                ].map((header, index) => (
                  <Th
                    key={header.name}
                    fontSize="xs"
                    fontWeight="semibold"
                    color="black"
                    py={2}
                    px={3}
                    width={header.width}
                    textAlign={header.align}
                    borderBottom="1px solid"
                    borderColor="blue.800"
                    textTransform="uppercase"
                    letterSpacing="0.5px"
                    whiteSpace="nowrap"
                    cursor={header.id ? "pointer" : "default"}
                    onClick={
                      header.id ? () => handleSort(header.id) : undefined
                    }
                    _hover={header.id ? { bg: "gray.50" } : {}}
                    sx={
                      header.id === "status"
                        ? { fontWeight: "bold", color: "gray.700" }
                        : {}
                    }
                  >
                    <Flex
                      align="center"
                      justify={
                        header.align === "right"
                          ? "flex-end"
                          : header.align === "center"
                            ? "center"
                            : "flex-start"
                      }
                    >
                      {header.name}
                      {header.id && sortField === header.id && (
                        <Box ml={1}>
                          {sortOrder === "asc" ? (
                            <TriangleUpIcon boxSize={3} />
                          ) : (
                            <TriangleDownIcon boxSize={3} />
                          )}
                        </Box>
                      )}
                    </Flex>
                  </Th>
                ))}
              </Tr>
            </Thead>
            <Tbody>
              {isLoading ? (
                <Tr>
                  <Td colSpan={11}>
                    <Center py={8}>
                      <Spinner size="xl" color={primaryColor} thickness="3px" />
                    </Center>
                  </Td>
                </Tr>
              ) : currentItems.length === 0 ? (
                <Tr>
                  <Td colSpan={11}>
                    <Center py={10}>
                      <Box textAlign="center">
                        <Text fontSize="lg" color="gray.500">
                          No waybills found
                        </Text>
                        <Text fontSize="sm" color="gray.400" mt={2}>
                          Try adjusting your search criteria
                        </Text>
                      </Box>
                    </Center>
                  </Td>
                </Tr>
              ) : (
                // Use windowing for better performance with large lists
                currentItems
                  .slice(0, Math.min(currentItems.length, 50))
                  .map((waybill, rowIndex) => (
                    <WaybillTableRow
                      key={waybill.waybillNumber}
                      waybill={waybill}
                      handleDropsClick={handleDropsClick}
                      formatNumber={formatNumber}
                      handleViewPDF={handleViewPDF}
                      handleViewHardCopy={handleViewHardCopy}
                      handleHardCopyUpload={handleHardCopyUpload}
                      onRowHover={handleRowHover}
                      onRowLeave={handleRowLeave}
                      duplicateWaybills={duplicateWaybills}
                      loadingWaybills={loadingWaybills}
                      activePopoverWaybill={activePopoverWaybill}
                      hoveredWaybill={hoveredWaybill}
                      hoverConsigneeDetails={hoverConsigneeDetails}
                      hoverSubDetails={hoverSubDetails}
                      index={rowIndex}
                      primaryColor={primaryColor}
                      hoverBg={hoverBg}
                      blueAccent={blueAccent}
                      tableBorderColor={tableBorderColor}
                    />
                  ))
              )}
            </Tbody>
          </Table>
        </TableContainer>
      </Box>

      {/* Pagination */}
      {!isLoading && waybills.length > 0 && (
        <Flex
          justify="space-between"
          align="center"
          mt={6}
          px={6}
          py={4}
          bg={tableHeaderBg}
          borderTop="1px solid"
          borderColor={tableBorderColor}
          mx={6}
          borderRadius="0 0 lg lg"
          boxShadow="0 -1px 2px rgba(0,0,0,0.03)"
        >
          <Text fontSize="sm" color="gray.600">
            Showing {(currentPage - 1) * itemsPerPage + 1} -{" "}
            {Math.min(currentPage * itemsPerPage, totalWaybills)} of{" "}
            {totalWaybills} waybills
          </Text>

          <Flex align="center">
            <Button
              onClick={() => handlePageChange(1)}
              isDisabled={currentPage === 1}
              size="sm"
              variant="ghost"
              color={blueAccent}
              _hover={{ bg: "blue.50" }}
              w="36px"
              h="36px"
              p={0}
              borderRadius="md"
              mr={1}
              boxShadow="sm"
            >
              «
            </Button>

            <Button
              onClick={() => handlePageChange(currentPage - 1)}
              isDisabled={currentPage === 1}
              size="sm"
              variant="ghost"
              colorScheme="blue"
              w="36px"
              h="36px"
              p={0}
              borderRadius="md"
              mr={1}
            >
              ‹
            </Button>

            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              return (
                <Button
                  key={pageNum}
                  onClick={() => handlePageChange(pageNum)}
                  size="sm"
                  variant={currentPage === pageNum ? "solid" : "ghost"}
                  colorScheme="blue"
                  bg={currentPage === pageNum ? blueAccent : undefined}
                  color={currentPage === pageNum ? "white" : undefined}
                  w="36px"
                  h="36px"
                  p={0}
                  borderRadius="md"
                  mr={1}
                >
                  {pageNum}
                </Button>
              );
            })}

            <Button
              onClick={() => handlePageChange(currentPage + 1)}
              isDisabled={currentPage === totalPages}
              size="sm"
              variant="ghost"
              colorScheme="blue"
              w="36px"
              h="36px"
              p={0}
              borderRadius="md"
              mr={1}
            >
              ›
            </Button>

            <Button
              onClick={() => handlePageChange(totalPages)}
              isDisabled={currentPage === totalPages}
              size="sm"
              variant="ghost"
              colorScheme="blue"
              w="36px"
              h="36px"
              p={0}
              borderRadius="md"
            >
              »
            </Button>
          </Flex>
        </Flex>
      )}

      {/* Modal for Drops */}
      <Modal
        isOpen={isOpen}
        onClose={handleModalClose}
        size="full"
        scrollBehavior="inside"
      >
        <ModalOverlay bg="blackAlpha.300" backdropFilter="blur(5px)" />
        <ModalContent
          borderRadius="xl"
          maxW="95vw"
          maxH="95vh"
          h="95vh"
          boxShadow="xl"
        >
          <ModalHeader
            fontSize="xl"
            fontWeight="bold"
            borderBottom="1px solid"
            borderColor={tableBorderColor}
            py={4}
          >
            {selectedWaybillNumber &&
            (duplicateWaybills[selectedWaybillNumber] ||
              getWaybillByNumber(selectedWaybillNumber)?.totalPercentage >=
                100 ||
              Math.round(
                getWaybillByNumber(selectedWaybillNumber)?.totalPercentage || 0
              ) === 100)
              ? "View Drops"
              : "Add Drops"}
          </ModalHeader>
          <ModalCloseButton size="lg" top="12px" />
          <ModalBody>
            <WaybillBody
              waybillNumber={selectedWaybillNumber}
              onModalClose={handleModalClose}
              onTruckCbmUpdate={handleTruckCbmUpdate}
              router={router} // Pass router to WaybillBody
            />
          </ModalBody>
          <ModalFooter pb={6} px={6}>
            <Button
              mr={3}
              onClick={handleModalClose}
              size="lg"
              height="48px"
              px={6}
              colorScheme="red"
              bg={redAccent}
              color="white"
            >
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Drop Type Selection Modal */}
      <Modal
        isOpen={dropTypeModal.isOpen}
        onClose={closeDropTypeModal}
        isCentered
      >
        <ModalOverlay bg="blackAlpha.300" backdropFilter="blur(5px)" />
        <ModalContent borderRadius="xl" maxW="500px" boxShadow="xl">
          <ModalHeader
            fontSize="xl"
            fontWeight="bold"
            bg={blueAccent}
            color="white"
            borderTopRadius="xl"
            py={4}
          >
            Select Drop Type
          </ModalHeader>
          <ModalCloseButton color="white" />
          <ModalBody py={6}>
            {(() => {
              const [dropTypeInfo, setDropTypeInfo] = useState({
                dropType: null,
                isLocked: false,
              });
              const [isLoading, setIsLoading] = useState(true);

              useEffect(() => {
                const checkDropType = async () => {
                  try {
                    console.log(
                      "Checking drop type for waybill number:",
                      dropWaybillNumber
                    );
                    const response = await axios.get(
                      `${process.env.NEXT_PUBLIC_BACKEND_API}/api/waybillSummary/checkDropType/${dropWaybillNumber}`
                    );
                    console.log("Drop type response:", response.data);
                    setDropTypeInfo(response.data);
                  } catch (error) {
                    console.error("Error checking drop type:", error);
                    toast({
                      title: "Error",
                      description:
                        "Failed to check drop type. Please try again.",
                      status: "error",
                      duration: 3000,
                      isClosable: true,
                    });
                  } finally {
                    setIsLoading(false);
                  }
                };

                if (dropWaybillNumber) {
                  checkDropType();
                }
              }, [dropWaybillNumber]);

              if (isLoading) {
                return (
                  <Center py={6}>
                    <Spinner size="xl" color={primaryColor} thickness="3px" />
                  </Center>
                );
              }

              return (
                <>
                  <Text mb={2} color="gray.600">
                    Please select how you want to manage drops for waybill{" "}
                    {dropWaybillNumber}:
                  </Text>

                  {dropTypeInfo.isLocked ? (
                    <Text mb={6} color="red.500" fontSize="sm">
                      Note: Once a drop type is selected, it cannot be changed
                      for this waybill.
                    </Text>
                  ) : (
                    <Text mb={6} color="blue.500" fontSize="sm">
                      Select the drop type for this waybill.
                    </Text>
                  )}

                  <Flex direction="column" gap={4}>
                    <Button
                      onClick={() => {
                        console.log("Fixed rate option selected");
                        handleDropTypeSelect("fixed");
                      }}
                      size="lg"
                      height="60px"
                      colorScheme="blue"
                      bg={blueAccent}
                      justifyContent="flex-start"
                      px={6}
                      data-testid="fixed-rate-button"
                      isDisabled={dropTypeInfo.dropType === "multiple drops"}
                      _hover={{
                        transform: "translateY(-2px)",
                        boxShadow: "md",
                      }}
                      _disabled={{
                        bg: "gray.100",
                        cursor: "not-allowed",
                        opacity: 0.6,
                      }}
                    >
                      <Flex align="flex-start" direction="column">
                        <Text fontWeight="bold">Fixed Rate</Text>
                        <Text fontSize="sm" fontWeight="normal">
                          Same rate for all consignees, no CBM calculations
                        </Text>
                        {dropTypeInfo.dropType === "multiple drops" && (
                          <Text fontSize="xs" color="red.500" mt={1}>
                            Not available: This waybill is already set as
                            Multiple Drops
                          </Text>
                        )}
                      </Flex>
                    </Button>

                    <Button
                      onClick={() => {
                        console.log("Multiple drops option selected");
                        handleDropTypeSelect("multiple");
                      }}
                      size="lg"
                      height="60px"
                      colorScheme="red"
                      bg={redAccent}
                      color="white"
                      justifyContent="flex-start"
                      px={6}
                      data-testid="multiple-drops-button"
                      isDisabled={dropTypeInfo.dropType === "fix rate"}
                      _hover={{
                        transform: "translateY(-2px)",
                        boxShadow: "md",
                      }}
                      _disabled={{
                        bg: "gray.100",
                        cursor: "not-allowed",
                        opacity: 0.6,
                      }}
                    >
                      <Flex align="flex-start" direction="column">
                        <Text fontWeight="bold">Multiple Drops</Text>
                        <Text fontSize="sm" fontWeight="normal">
                          Calculate rate based on CBM and percentage
                        </Text>
                        {dropTypeInfo.dropType === "fix rate" && (
                          <Text fontSize="xs" color="red.500" mt={1}>
                            Not available: This waybill is already set as Fixed
                            Rate
                          </Text>
                        )}
                      </Flex>
                    </Button>
                  </Flex>
                </>
              );
            })()}
          </ModalBody>
          <ModalFooter
            pb={6}
            borderTopWidth="1px"
            borderColor={tableBorderColor}
            py={4}
          >
            <Button
              onClick={closeDropTypeModal}
              colorScheme="red"
              size="lg"
              fontWeight="medium"
              px={8}
              borderRadius="md"
              _hover={{ transform: "translateY(-1px)", boxShadow: "md" }}
            >
              Cancel
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Modal for Edit */}
      <Modal isOpen={isEditModalOpen} onClose={onEditModalClose} size="3xl">
        <ModalOverlay />
        <ModalContent borderRadius="xl" minW="800px" minH="500px">
          <ModalHeader
            fontSize="xl"
            fontWeight="bold"
            bg={blueAccent}
            color="white"
            borderTopRadius="xl"
          >
            Edit Waybill
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody py={6}>
            {currentWaybill && (
              <Box>
                <FormControl mb={4}>
                  <FormLabel fontWeight="medium">Additionals</FormLabel>
                  <Input
                    placeholder="Enter additionals amount"
                    type="number"
                    value={currentWaybill.additionals}
                    onChange={(e) =>
                      setCurrentWaybill({
                        ...currentWaybill,
                        additionals: parseFloat(e.target.value) || 0,
                      })
                    }
                    size="lg"
                    height="56px"
                    borderColor="gray.300"
                    _hover={{ borderColor: "gray.400" }}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel fontWeight="medium">DR Cost</FormLabel>
                  <Input
                    placeholder="Enter DR cost"
                    type="number"
                    value={currentWaybill.drCost}
                    onChange={(e) =>
                      setCurrentWaybill({
                        ...currentWaybill,
                        drCost: parseFloat(e.target.value) || 0,
                      })
                    }
                    size="lg"
                    height="56px"
                    borderColor="gray.300"
                    _hover={{ borderColor: "gray.400" }}
                  />
                </FormControl>
              </Box>
            )}
          </ModalBody>
          <ModalFooter pb={6} px={6}>
            <Button
              mr={3}
              onClick={handleEditSave}
              size="lg"
              height="48px"
              px={6}
              bg={blueAccent}
              color="white"
              _hover={{ bg: "blue.700" }}
            >
              Save Changes
            </Button>
            <Button
              variant="ghost"
              onClick={onEditModalClose}
              size="lg"
              height="48px"
              px={6}
            >
              Cancel
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Modal for All Consignees */}
      <Modal
        isOpen={isConsigneesModalOpen}
        onClose={onConsigneesModalClose}
        size="4xl"
      >
        <ModalOverlay />
        <ModalContent borderRadius="xl" minW="900px" minH="600px">
          <ModalHeader fontSize="xl" fontWeight="bold">
            All Consignees
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody py={6}>
            <Table variant="simple">
              <Thead>
                <Tr>
                  <Th width="5%">No.</Th>
                  <Th width="35%">Consignee Name</Th>
                  <Th width="15%" isNumeric>
                    CBM
                  </Th>
                  <Th width="15%" isNumeric>
                    Percentage
                  </Th>
                  <Th width="15%" isNumeric>
                    Amount
                  </Th>
                  <Th width="15%"></Th>
                </Tr>
              </Thead>
              <Tbody>
                {selectedConsignees.map((consignee, index) => {
                  const consigneeName =
                    consignee.consignee || consignee.name || consignee;
                  const hasSubDetails =
                    consignee.hasSubDetails && consignee.subDetails?.length > 0;
                  const isExpanded = expandedConsignees[consigneeName];

                  return (
                    <React.Fragment key={index}>
                      <Tr
                        bg={hasSubDetails ? `${primaryColor}10` : "white"}
                        _hover={{
                          bg: hasSubDetails ? `${primaryColor}15` : "gray.50",
                        }}
                      >
                        <Td fontWeight={hasSubDetails ? "medium" : "normal"}>
                          {index + 1}
                        </Td>
                        <Td fontWeight={hasSubDetails ? "medium" : "normal"}>
                          {consigneeName}
                        </Td>
                        <Td isNumeric>{formatNumber(consignee.cbm || 0)}</Td>
                        <Td isNumeric>
                          {formatNumber(consignee.percentage || 0)}%
                        </Td>
                        <Td isNumeric>
                          ₱{formatNumber(consignee.amount || 0)}
                        </Td>
                        <Td>
                          {hasSubDetails && (
                            <Button
                              size="sm"
                              variant="ghost"
                              rightIcon={
                                isExpanded ? (
                                  <ChevronUpIcon />
                                ) : (
                                  <ChevronDownIcon />
                                )
                              }
                              onClick={() =>
                                toggleConsigneeExpand(consigneeName)
                              }
                            >
                              {isExpanded ? "Hide" : "Show"} Details
                            </Button>
                          )}
                        </Td>
                      </Tr>

                      {/* Sub-details rows */}
                      {hasSubDetails &&
                        isExpanded &&
                        consignee.subDetails.map((subDetail, subIndex) => (
                          <Tr
                            key={`${index}-${subIndex}`}
                            bg="gray.50"
                            _hover={{ bg: "gray.100" }}
                          >
                            <Td pl={10}>
                              <Flex align="center">
                                <Box
                                  w="3px"
                                  h="16px"
                                  bg={secondaryColor}
                                  mr={3}
                                  borderRadius="full"
                                />
                                {subDetail.storeName || "Unknown Store"}
                              </Flex>
                            </Td>
                            <Td isNumeric>
                              {formatNumber(subDetail.cbm || 0)}
                            </Td>
                            <Td isNumeric>
                              {formatNumber(subDetail.percentage || 0)}%
                            </Td>
                            <Td isNumeric>
                              ₱{formatNumber(subDetail.amount || 0)}
                            </Td>
                            <Td></Td>
                          </Tr>
                        ))}
                    </React.Fragment>
                  );
                })}
              </Tbody>
            </Table>
          </ModalBody>
          <ModalFooter pb={6} px={6}>
            <Button
              onClick={onConsigneesModalClose}
              size="lg"
              height="48px"
              px={6}
            >
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* New Modal for PDF Viewer */}
      <Modal isOpen={isPDFModalOpen} onClose={handlePDFModalClose} size="5xl">
        <ModalOverlay />
        <ModalContent borderRadius="xl" maxW="90vw" h="90vh">
          <ModalHeader
            bg={blueAccent}
            color="white"
            fontWeight="bold"
            borderTopRadius="xl"
          >
            PDF - Waybill {viewingPDF?.waybillNumber}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody overflow="hidden" p={0}>
            {viewingPDF?.pdfData ? (
              <Box w="100%" h="100%" position="relative">
                <object
                  data={`${viewingPDF.pdfData}#zoom=220`}
                  type={viewingPDF.contentType || "application/pdf"}
                  width="100%"
                  height="100%"
                  style={{
                    display: "block",
                    border: "none",
                  }}
                >
                  <embed
                    src={`${viewingPDF.pdfData}#zoom=250`}
                    type={viewingPDF.contentType || "application/pdf"}
                    width="100%"
                    height="100%"
                    style={{
                      display: "block",
                      border: "none",
                    }}
                  />
                  <p>
                    It appears your browser doesn't support PDF viewing.
                    <Button
                      ml={2}
                      colorScheme="blue"
                      size="sm"
                      onClick={handleDownloadPDF}
                    >
                      Download the PDF
                    </Button>
                  </p>
                </object>
              </Box>
            ) : (
              <Center h="100%">
                <Spinner size="xl" />
              </Center>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Add Hard Copy Modal */}
      <Modal
        isOpen={isHardCopyModalOpen}
        onClose={handleHardCopyModalClose}
        size="4xl"
      >
        <ModalOverlay />
        <ModalContent borderRadius="xl" maxW="90vw" h="90vh">
          <ModalHeader
            bg={blueAccent}
            color="white"
            fontWeight="bold"
            borderTopRadius="xl"
          >
            Hard Copy - Waybill {viewingHardCopy?.waybillNumber}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody p={0} overflow="hidden">
            {viewingHardCopy?.imageUrl ? (
              <Box w="100%" h="100%" position="relative">
                <Image
                  src={viewingHardCopy.imageUrl}
                  alt={`Hard copy for waybill ${viewingHardCopy.waybillNumber}`}
                  objectFit="contain"
                  w="100%"
                  h="100%"
                  p={4}
                />
              </Box>
            ) : (
              <Center h="100%">
                <Spinner size="xl" />
              </Center>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Sub-Waybill Duplication Confirmation Modal */}
      <Modal
        isOpen={isDuplicateModalOpen}
        onClose={() => {
          setIsDuplicateModalOpen(false);
          // Don't close the main modal - let the user decide
        }}
        size="xl"
        zIndex={2000} // Higher than the default modal z-index
        isCentered
      >
        <ModalOverlay bg="rgba(0,0,0,0.7)" backdropFilter="blur(8px)" />
        <ModalContent borderRadius="xl" boxShadow="dark-lg" bg="white">
          <ModalHeader
            fontSize="xl"
            fontWeight="bold"
            bg="blue.600"
            color="white"
            borderTopRadius="xl"
            py={6}
          >
            <Flex align="center">
              <Icon as={FaFilePdf} mr={3} />
              Duplicate Sub-Waybills for Waybill #{selectedWaybillNumber}
            </Flex>
          </ModalHeader>
          <ModalCloseButton color="white" />
          <ModalBody py={8} px={6} maxHeight="70vh" overflowY="auto">
            <Text fontSize="lg" mb={6} fontWeight="medium">
              This waybill contains entity abbreviations with sub-waybill
              numbers. Select which sub-waybills you want to duplicate the
              entities to:
            </Text>

            <Box
              bg="blue.50"
              p={4}
              borderRadius="md"
              borderWidth="1px"
              borderColor="blue.200"
              mb={6}
            >
              <Text fontWeight="medium" color="blue.700">
                <Icon as={FaInfoCircle} mr={2} />
                Duplication Process:
              </Text>
              <UnorderedList
                pl={6}
                spacing={2}
                mt={2}
                fontSize="sm"
                color="blue.800"
              >
                <ListItem>
                  Any existing data in the target waybill(s) will be removed
                  first
                </ListItem>
                <ListItem>
                  The shipper information will be duplicated to each target
                  waybill
                </ListItem>
                <ListItem>
                  Only entity summaries with the specified sub-waybill number
                  will be duplicated
                </ListItem>
                <ListItem>
                  Associated consignees for those entities will also be
                  duplicated
                </ListItem>
                <ListItem>
                  All duplicated records will be marked as duplicates with a
                  reference to the source waybill
                </ListItem>
              </UnorderedList>
            </Box>

            <Text fontWeight="bold" mb={3} fontSize="md">
              Select sub-waybill numbers to duplicate:
            </Text>

            <Box
              maxH="300px"
              overflowY="auto"
              borderWidth="2px"
              borderRadius="md"
              p={4}
              borderColor="blue.200"
              bg="blue.50"
            >
              {subWaybillNumbers.length > 0 ? (
                subWaybillNumbers.map((waybillNum, index) => (
                  <Flex
                    key={index}
                    mb={3}
                    align="center"
                    bg="white"
                    p={3}
                    borderRadius="md"
                    boxShadow="sm"
                    borderLeft="4px solid"
                    borderLeftColor="blue.500"
                    _hover={{ transform: "translateX(2px)", boxShadow: "md" }}
                    transition="all 0.2s"
                  >
                    <Checkbox
                      isChecked={selectedSubWaybills[waybillNum] || false}
                      onChange={(e) => {
                        setSelectedSubWaybills({
                          ...selectedSubWaybills,
                          [waybillNum]: e.target.checked,
                        });
                      }}
                      colorScheme="blue"
                      size="lg"
                      mr={3}
                    />
                    <Box>
                      <Text fontWeight="bold">Waybill #{waybillNum}</Text>
                      <Text fontSize="xs" color="gray.500">
                        Target for duplication
                      </Text>
                    </Box>
                  </Flex>
                ))
              ) : (
                <Text
                  color="gray.500"
                  textAlign="center"
                  py={4}
                  fontStyle="italic"
                >
                  No sub-waybill numbers found. This should not happen - please
                  check the console for logs.
                </Text>
              )}
            </Box>

            <Text fontSize="md" color="red.500" mt={6} fontWeight="medium">
              Note: This will only duplicate entity abbreviation summaries and
              their associated consignee and shipper information to the selected
              sub-waybills. The duplicated data will be marked as duplicates and
              will reference this waybill as the source.
            </Text>

            {/* Add Waybill Metrics Section */}
            <Box
              mt={6}
              borderWidth="1px"
              borderRadius="md"
              borderColor="blue.200"
              overflow="hidden"
            >
              <Box bg="blue.600" color="white" px={4} py={2} fontWeight="bold">
                Current Waybill Metrics for Reference
              </Box>
              <Box p={4} bg="blue.50">
                <VStack spacing={3} align="stretch">
                  {/* Percentage Information */}
                  {(() => {
                    const waybill = getWaybillByNumber(selectedWaybillNumber);
                    const percentage = waybill?.totalPercentage || 0;
                    const isOverLimit = percentage >= 100;

                    return (
                      <Flex justify="space-between" align="center">
                        <Text fontSize="sm" fontWeight="medium">
                          Total Percentage:
                        </Text>
                        <Badge
                          colorScheme={isOverLimit ? "green" : "orange"}
                          fontSize="sm"
                          px={2}
                          py={1}
                        >
                          {formatNumber(percentage, 2)}%
                          {isOverLimit ? " (Complete)" : " (Incomplete)"}
                        </Badge>
                      </Flex>
                    );
                  })()}

                  {/* CBM Information */}
                  {(() => {
                    const waybill = getWaybillByNumber(selectedWaybillNumber);
                    const consigneeCbm = waybill?.totalCBM || 0;
                    const isTruckCbm = truckCbm && truckCbm > 0;

                    // Try to find the truck CBM value in the DOM
                    let displayTruckCbm = truckCbm;
                    const truckCbmElement = document.querySelector(
                      '[data-testid="truck-cbm-value"]'
                    );
                    if (truckCbmElement) {
                      const truckCbmValue = parseFloat(
                        truckCbmElement.textContent
                      );
                      if (!isNaN(truckCbmValue)) {
                        displayTruckCbm = truckCbmValue;
                      }
                    }

                    return (
                      <Flex justify="space-between" align="center">
                        <Text fontSize="sm" fontWeight="medium">
                          CBM Ratio:
                        </Text>
                        <Badge
                          colorScheme={
                            consigneeCbm > displayTruckCbm ? "red" : "green"
                          }
                          fontSize="sm"
                          px={2}
                          py={1}
                        >
                          {formatNumber(consigneeCbm, 2)} /{" "}
                          {formatNumber(displayTruckCbm || 0, 2)}
                        </Badge>
                      </Flex>
                    );
                  })()}

                  {/* Amount Comparison */}
                  {(() => {
                    const waybill = getWaybillByNumber(selectedWaybillNumber);
                    const totalAmount = waybill?.totalCost || 0;

                    // Try to find the base rate with additional value in the DOM
                    let baseRateWithAdditional = 0;
                    const baseRateElement = document.querySelector(
                      '[data-testid="base-rate-value"]'
                    );
                    if (baseRateElement) {
                      const baseRateValue = parseFloat(
                        baseRateElement.textContent.replace(/[^\d.-]/g, "")
                      );
                      if (!isNaN(baseRateValue)) {
                        baseRateWithAdditional = baseRateValue;
                      }
                    }

                    // Fallback to estimate if DOM element not found
                    if (baseRateWithAdditional === 0) {
                      baseRateWithAdditional = waybill?.additionals
                        ? totalAmount - waybill.additionals
                        : totalAmount;
                    }

                    const amountDifference = Math.abs(
                      totalAmount - baseRateWithAdditional
                    ).toFixed(2);
                    const ratesDiffer =
                      Math.abs(baseRateWithAdditional - totalAmount) > 0.01;

                    return (
                      <>
                        <Flex justify="space-between" align="center">
                          <Text fontSize="sm" fontWeight="medium">
                            Total Amount:
                          </Text>
                          <Text fontSize="sm" fontWeight="bold">
                            ₱{formatNumber(totalAmount, 2)}
                          </Text>
                        </Flex>
                        <Flex justify="space-between" align="center">
                          <Text fontSize="sm" fontWeight="medium">
                            Base Rate w/ Additional:
                          </Text>
                          <Text fontSize="sm">
                            ₱{formatNumber(baseRateWithAdditional, 2)}
                          </Text>
                        </Flex>
                        {ratesDiffer && (
                          <>
                            <Flex justify="space-between" align="center">
                              <Text fontSize="sm" fontWeight="medium">
                                Difference:
                              </Text>
                              <Badge
                                colorScheme="blue"
                                fontSize="sm"
                                px={2}
                                py={1}
                              >
                                ₱{formatNumber(amountDifference, 2)}
                              </Badge>
                            </Flex>
                            <Text fontSize="xs" color="blue.700" mt={1}>
                              <Icon as={FaInfoCircle} mr={1} />
                              The difference is due to percentage-based
                              calculations or adjustments applied to individual
                              consignees.
                            </Text>
                          </>
                        )}
                      </>
                    );
                  })()}
                </VStack>
              </Box>
            </Box>
          </ModalBody>
          <ModalFooter
            borderTopWidth="1px"
            borderColor={tableBorderColor}
            py={5}
          >
            <Button
              onClick={() => {
                console.log("Keep modal open clicked");
                setIsDuplicateModalOpen(false);
                // Keep the main modal open
              }}
              mr={3}
              size="lg"
              colorScheme="gray"
            >
              No, Keep Modal Open
            </Button>
            <Button
              onClick={() => {
                console.log("Skip & close all clicked");
                setIsDuplicateModalOpen(false);
                completeModalClose(); // Close the main modal without duplicating
              }}
              mr={3}
              size="md"
              variant="outline"
              colorScheme="red"
            >
              Skip & Close All
            </Button>
            <Button
              onClick={handleDuplicateSubWaybills}
              size="lg"
              colorScheme="blue"
              isLoading={isDuplicating}
              loadingText="Duplicating..."
              leftIcon={<Icon as={FaRegCopy} />}
            >
              Duplicate Selected
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Close Confirmation Modal */}
      <Modal
        isOpen={isCloseConfirmModalOpen}
        onClose={() => setIsCloseConfirmModalOpen(false)}
        size="md"
        isCentered
        zIndex={2000}
      >
        <ModalOverlay bg="rgba(0,0,0,0.7)" backdropFilter="blur(8px)" />
        <ModalContent borderRadius="xl" boxShadow="dark-lg">
          <ModalHeader
            bg={blueAccent}
            color="white"
            borderTopRadius="xl"
            fontWeight="bold"
            py={4}
            fontSize="lg"
          >
            Confirm Close
          </ModalHeader>
          <ModalCloseButton color="white" />
          <ModalBody py={6} px={6}>
            <Text fontSize="md" mb={4} fontWeight="medium">
              Are you sure you want to close this waybill?
            </Text>

            {closeModalWaybillData && (
              <Box
                bg="gray.50"
                p={4}
                borderRadius="md"
                borderLeft="4px solid"
                borderLeftColor={blueAccent}
              >
                {/* Waybill Metrics Summary */}
                <VStack spacing={3} align="stretch">
                  {/* Percentage Comparison */}
                  <Flex justify="space-between" align="center">
                    <Text fontSize="sm" fontWeight="medium">
                      Total Percentage:
                    </Text>
                    <Badge
                      colorScheme={
                        closeModalWaybillData.totalPercentage >= 100
                          ? "green"
                          : "orange"
                      }
                      fontSize="sm"
                      px={2}
                      py={1}
                    >
                      {formatNumber(closeModalWaybillData.totalPercentage, 2)}%
                      {closeModalWaybillData.totalPercentage >= 100
                        ? " (COMPLETE)"
                        : " (INCOMPLETE)"}
                    </Badge>
                  </Flex>

                  {/* CBM Comparison */}
                  {(() => {
                    const consigneeCbm = closeModalWaybillData.totalCBM || 0;
                    const isTruckCbm = truckCbm && truckCbm > 0;
                    const cbmDifference = isTruckCbm
                      ? (consigneeCbm - truckCbm).toFixed(2)
                      : 0;
                    const isOverCapacity =
                      isTruckCbm && consigneeCbm > truckCbm;

                    return (
                      <>
                        <Flex justify="space-between" align="center">
                          <Text fontSize="sm" fontWeight="medium">
                            CBM Ratio:
                          </Text>
                          <Badge
                            colorScheme={isOverCapacity ? "red" : "green"}
                            fontSize="sm"
                            px={2}
                            py={1}
                          >
                            {formatNumber(consigneeCbm, 2)} /{" "}
                            {formatNumber(truckCbm || 0, 2)}
                          </Badge>
                        </Flex>
                        {isTruckCbm && (
                          <Flex justify="space-between" align="center">
                            <Text fontSize="sm" fontWeight="medium">
                              CBM Status:
                            </Text>
                            <Badge
                              colorScheme={isOverCapacity ? "red" : "green"}
                              fontSize="sm"
                              px={2}
                              py={1}
                            >
                              {isOverCapacity
                                ? `Exceeds by ${formatNumber(Math.abs(cbmDifference), 2)}`
                                : `Under by ${formatNumber(Math.abs(cbmDifference), 2)}`}
                            </Badge>
                          </Flex>
                        )}
                      </>
                    );
                  })()}

                  {/* Amount Comparison */}
                  {(() => {
                    const totalAmount = closeModalWaybillData.totalCost || 0;

                    // Try to find the base rate with additional value from the DOM
                    let baseRateWithAdditional = 0;
                    const baseRateElement = document.querySelector(
                      '[data-testid="base-rate-value"]'
                    );
                    if (baseRateElement) {
                      const baseRateValue = parseFloat(
                        baseRateElement.textContent.replace(/[^\d.-]/g, "")
                      );
                      if (!isNaN(baseRateValue)) {
                        console.log("Got base rate from DOM:", baseRateValue);
                        baseRateWithAdditional = baseRateValue;
                      }
                    }

                    // Fallback to estimate if DOM element not found
                    if (baseRateWithAdditional === 0) {
                      // We can't directly access totalRate here, so make an estimate based on the data we have
                      baseRateWithAdditional = closeModalWaybillData.additionals
                        ? totalAmount - closeModalWaybillData.additionals
                        : totalAmount;
                    }

                    const amountDifference = Math.abs(
                      totalAmount - baseRateWithAdditional
                    ).toFixed(2);
                    const ratesDiffer =
                      Math.abs(baseRateWithAdditional - totalAmount) > 0.01;

                    return (
                      <>
                        <Flex justify="space-between" align="center">
                          <Text fontSize="sm" fontWeight="medium">
                            Total Amount:
                          </Text>
                          <Text fontSize="sm">
                            ₱{formatNumber(totalAmount, 2)}
                          </Text>
                        </Flex>
                        <Flex justify="space-between" align="center">
                          <Text fontSize="sm" fontWeight="medium">
                            Base Rate w/ Additional:
                          </Text>
                          <Text fontSize="sm">
                            ₱{formatNumber(baseRateWithAdditional, 2)}
                          </Text>
                        </Flex>
                        {ratesDiffer && (
                          <>
                            <Flex justify="space-between" align="center">
                              <Text fontSize="sm" fontWeight="medium">
                                Difference:
                              </Text>
                              <Badge
                                colorScheme="blue"
                                fontSize="sm"
                                px={2}
                                py={1}
                              >
                                ₱{formatNumber(amountDifference, 2)}
                              </Badge>
                            </Flex>
                            <Box mt={2} p={2} bg="blue.50" borderRadius="md">
                              <Text fontSize="xs" color="blue.700">
                                <Icon as={FaInfoCircle} mr={1} />
                                Note: The difference between Base Rate and Total
                                Amount may be due to percentage-based
                                calculations or additional adjustments applied
                                to individual consignees.
                              </Text>
                            </Box>
                          </>
                        )}
                      </>
                    );
                  })()}
                </VStack>
              </Box>
            )}
          </ModalBody>
          <ModalFooter
            borderTopWidth="1px"
            borderColor={tableBorderColor}
            py={4}
          >
            <Button
              colorScheme="gray"
              mr={3}
              onClick={() => setIsCloseConfirmModalOpen(false)}
            >
              No, Keep Open
            </Button>
            <Button
              colorScheme="red"
              onClick={() => {
                setIsCloseConfirmModalOpen(false);
                completeModalClose();
              }}
            >
              Yes, Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default WaybillTable;
