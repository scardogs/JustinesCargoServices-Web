import React, { useState, useEffect } from "react";
import {
  Drawer,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  DrawerHeader,
  DrawerBody,
  DrawerFooter,
  Button,
  VStack,
  FormControl,
  FormLabel,
  Input,
  Select,
  Heading,
  Box,
  Grid,
  Flex,
  Text,
  Badge,
  Tooltip,
  InputGroup,
  InputRightElement,
  Icon,
  useToast,
  HStack,
  Divider,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  FormHelperText,
  NumberInput,
  NumberInputField,
  Tag,
  TagLabel,
  TagRightIcon,
  SimpleGrid,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  IconButton,
  Spinner,
} from "@chakra-ui/react";
import {
  FaList,
  FaBoxOpen,
  FaCubes,
  FaMapMarkerAlt,
  FaFlag,
  FaTruck,
  FaFileInvoice,
  FaUser,
  FaSave,
  FaStore,
  FaBuilding,
  FaCheck,
  FaEdit,
  FaRegClipboard,
  FaHome,
  FaPercent,
  FaMoneyBillWave,
  FaArrowUp,
  FaPlus,
  FaEquals,
  FaChartBar,
  FaChartLine,
  FaBalanceScale,
  FaTag,
  FaCalculator,
  FaCube,
  FaWeight,
  FaUserAlt,
  FaCalendarAlt,
  FaTrash,
  FaPercentage,
  FaUsers,
  FaLayerGroup,
} from "react-icons/fa";
import {
  InfoIcon,
  EditIcon,
  ChevronDownIcon,
  AddIcon,
  CalendarIcon,
  DeleteIcon,
  CheckIcon,
  CloseIcon,
} from "@chakra-ui/icons";

const EditDrawer = ({
  isOpen,
  onClose,
  editFormData,
  setEditFormData,
  editSubDetails,
  setEditSubDetails,
  editTotalCbm,
  setEditTotalCbm,
  editTotalPercentage,
  setEditTotalPercentage,
  editTotalAmount,
  setEditTotalAmount,
  customTotalCbm,
  setCustomTotalCbm,
  handleEditModalChange,
  handleEditSubDetailChange,
  handleAddEditDCSubDetail,
  handleAddEditStoreSubDetail,
  handleSaveEdit,
  isSavingEdit,
  isIndividualMode,
  selectedEntityAbbreviations,
  shipperEntityAbbreviation,
  shipperFormData,
  individuals,
  companies,
  handleIndividualChangess,
  handleShipperChangess,
  consigneeClients,
  checkConsigneeExists,
  getMinDateForReceived,
  roundToTwo,
  areNumbersEqual,
  truckCbm,
  totalCbmInput,
  SearchableSelect,
  FormattedNumberInput,
  calculateRemainingCbm,
  borderColor,
  secondaryColor,
  lightBg,
  subDetails,
  consignees,
  handleCustomTotalCbmChange,
  saveNewConsignees,
  toast,
}) => {
  const [activeTab, setActiveTab] = useState("info");
  const primaryColor = "#4A5568";
  const [editSubDetailsWereRequested, setEditSubDetailsWereRequested] =
    useState(false);

  // Add state variables for split and payload functionality
  const [isSplit, setIsSplit] = useState(editFormData.split === "split");
  const [isPayload, setIsPayload] = useState(
    editFormData.payload === "payload"
  );
  const [originalEntityAbbr, setOriginalEntityAbbr] = useState("");

  // Add state for available waybills
  const [availableWaybills, setAvailableWaybills] = useState([]);
  const [isFetchingWaybills, setIsFetchingWaybills] = useState(false);

  // Add useEffect to initialize originalEntityAbbr when drawer opens
  useEffect(() => {
    if (isOpen && editFormData.consignee) {
      // Extract the entity abbreviation from the consignee name (e.g., "SMCO - Store Name")
      const match = editFormData.consignee.match(/^([^-]+)/);
      if (match && match[1]) {
        setOriginalEntityAbbr(match[1].trim());
      }
    }

    // Auto-toggle split or payload if already set in editFormData
    if (isOpen) {
      if (editFormData.split === "split") {
        setIsSplit(true);
        setIsPayload(false);
      } else if (editFormData.payload === "payload") {
        setIsPayload(true);
        setIsSplit(false);
      }

      // Store original subWaybillNumber to track changes
      if (isOpen && editFormData && !editFormData._originalSubWaybillNumber) {
        // Add the original subWaybillNumber to editFormData to track changes
        setEditFormData((prev) => ({
          ...prev,
          _originalSubWaybillNumber: prev.subWaybillNumber || "",
        }));
      }
    }
  }, [
    isOpen,
    editFormData.consignee,
    editFormData.split,
    editFormData.payload,
  ]);

  // Add explicit useEffect to fetch available waybills when the drawer opens
  useEffect(() => {
    if (isOpen) {
      console.log("DEBUG: EditDrawer opened, fetching available waybills");
      console.log(`DEBUG: Using stub number: "${shipperFormData.stubNumber}"`);
      fetchAvailableWaybills();
    }
  }, [isOpen]);

  // Existing useEffect to fetch available waybills when split or payload is toggled
  useEffect(() => {
    if ((isSplit || isPayload) && isOpen) {
      console.log(
        "DEBUG: Triggering fetchAvailableWaybills in EditDrawer due to dependency change"
      );
      console.log(
        `DEBUG: Current shipperFormData.stubNumber = "${shipperFormData.stubNumber}"`
      );
      fetchAvailableWaybills();
    }
  }, [isSplit, isPayload, isOpen, shipperFormData.stubNumber]);

  // Function to fetch available waybills
  const fetchAvailableWaybills = async () => {
    try {
      setIsFetchingWaybills(true);

      console.log(
        "DEBUG: Starting fetchAvailableWaybills in EditDrawer for waybill:",
        editFormData.waybillNumber
      );

      if (!editFormData.waybillNumber) {
        console.warn("DEBUG: No waybill number provided");
        setAvailableWaybills([]);
        setIsFetchingWaybills(false);
        return;
      }

      // First, we need to find which trip contains this waybill
      const tripDetailsResponse = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/tripDetails`
      );

      if (!tripDetailsResponse.ok) {
        throw new Error("Failed to fetch trip details");
      }

      const allTripDetails = await tripDetailsResponse.json();

      // Find the trip detail that contains our current waybill
      const currentTripDetail = allTripDetails.find(
        (detail) => detail.waybillNumber === editFormData.waybillNumber
      );

      if (!currentTripDetail) {
        console.warn(
          `DEBUG: No trip found for waybill: ${editFormData.waybillNumber}`
        );

        // Fall back to the original stub-based logic if no trip is found
        fallbackToStubBasedSearch();
        return;
      }

      console.log(
        `DEBUG: Found trip ID: ${currentTripDetail.tripID} for waybill: ${editFormData.waybillNumber}`
      );

      // Now fetch all waybills from the same trip
      const tripWaybills = allTripDetails
        .filter((detail) => detail.tripID === currentTripDetail.tripID)
        .map((detail) => ({
          waybillNumber: detail.waybillNumber,
          // We need these fields to match the expected waybill object structure
          stub: detail.stubNumber,
          status: "INTRIPDETAIL",
        }));

      console.log(
        `DEBUG: Found ${tripWaybills.length} waybills in the same trip`
      );

      // Filter out the current waybill from the list
      let availableWaybillsList = tripWaybills.filter(
        (waybill) => waybill.waybillNumber !== editFormData.waybillNumber
      );

      // Fetch already used sub waybill numbers from entity abbreviation summary
      try {
        const subWaybillResponse = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_API}/api/entity-abbreviation-summary/sub-waybill-numbers/${editFormData.waybillNumber}`
        );

        if (subWaybillResponse.ok) {
          const subWaybillData = await subWaybillResponse.json();

          if (
            subWaybillData.success &&
            subWaybillData.subWaybillNumbers.length > 0
          ) {
            console.log(
              `DEBUG: Found ${subWaybillData.subWaybillNumbers.length} already used sub waybill numbers:`,
              subWaybillData.subWaybillNumbers
            );

            // Keep the current subWaybillNumber in the list if it's already selected
            const currentSubWaybill = editFormData.subWaybillNumber;

            // Filter out already used sub waybill numbers, but keep the current one if it's already selected
            availableWaybillsList = availableWaybillsList.filter(
              (waybill) =>
                waybill.waybillNumber === currentSubWaybill ||
                !subWaybillData.subWaybillNumbers.includes(
                  waybill.waybillNumber
                )
            );

            console.log(
              `DEBUG: After filtering out used sub waybills, ${availableWaybillsList.length} waybills remain available`
            );
          }
        }
      } catch (error) {
        console.error("DEBUG: Error fetching used sub waybill numbers:", error);
        // Continue with original list if there's an error
      }

      console.log(
        `DEBUG: Final waybills list from same trip:`,
        availableWaybillsList.map((w) => w.waybillNumber)
      );

      setAvailableWaybills(availableWaybillsList);

      // Show message if no waybills found in this trip
      if (availableWaybillsList.length === 0) {
        toast({
          title: "Information",
          description: `No other waybills found in the same trip`,
          status: "info",
          duration: 3000,
          isClosable: true,
        });
      }

      setIsFetchingWaybills(false);
    } catch (error) {
      console.error("DEBUG: Error in fetchAvailableWaybills:", error);
      toast({
        title: "Error",
        description: "Failed to fetch available waybills: " + error.message,
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      setAvailableWaybills([]);
      setIsFetchingWaybills(false);
    }
  };

  // Fallback function to use stub-based search if no trip is found
  const fallbackToStubBasedSearch = async () => {
    try {
      // Get the stub number directly from shipperFormData
      const stubNumber = shipperFormData.stubNumber;

      if (!stubNumber) {
        console.warn(
          "DEBUG: No stub number found in shipperFormData for waybill:",
          editFormData.waybillNumber
        );
        setAvailableWaybills([]);
        setIsFetchingWaybills(false);
        toast({
          title: "Warning",
          description: "No stub number found for this waybill",
          status: "warning",
          duration: 3000,
          isClosable: true,
        });
        return;
      }

      console.log(
        `DEBUG: Falling back to stub-based search with stub: "${stubNumber}" for waybill: ${editFormData.waybillNumber}`
      );

      let availableWaybillsList = [];

      // If stub number contains multiple stubs (format: "1/2/3/4")
      if (stubNumber.includes("/")) {
        const stubArray = stubNumber.split("/");
        console.log(
          `DEBUG: Processing multiple stubs: ${stubArray.join(", ")}`
        );

        // Fetch waybills for all stubs in the array
        for (const stub of stubArray) {
          console.log(`DEBUG: Fetching waybills for stub: "${stub.trim()}"`);
          const waybillResponse = await fetch(
            `${process.env.NEXT_PUBLIC_BACKEND_API}/api/waybills?stub=${stub.trim()}&status=UNUSED`
          );

          if (!waybillResponse.ok) {
            console.warn(
              `DEBUG: Failed to fetch waybills for stub: ${stub.trim()}`
            );
            continue;
          }

          const waybills = await waybillResponse.json();
          console.log(
            `DEBUG: Found ${waybills.length} waybills for stub: ${stub.trim()}`
          );
          availableWaybillsList = [...availableWaybillsList, ...waybills];
        }

        // Remove duplicates based on waybillNumber
        const uniqueWaybills = Array.from(
          new Map(
            availableWaybillsList.map((waybill) => [
              waybill.waybillNumber,
              waybill,
            ])
          ).values()
        );

        availableWaybillsList = uniqueWaybills;
        console.log(
          `DEBUG: After deduplication, found ${availableWaybillsList.length} unique waybills`
        );
      } else {
        // Single stub case
        console.log(
          `DEBUG: Fetching waybills for single stub: "${stubNumber.trim()}"`
        );
        const waybillResponse = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_API}/api/waybills?stub=${stubNumber.trim()}&status=UNUSED`
        );

        if (!waybillResponse.ok) {
          console.error(
            `DEBUG: Failed to fetch waybills for stub: ${stubNumber.trim()}`
          );
          throw new Error("Failed to fetch waybills for this stub");
        }

        availableWaybillsList = await waybillResponse.json();
        console.log(
          `DEBUG: Found ${availableWaybillsList.length} waybills for single stub: ${stubNumber.trim()}`
        );
      }

      // Filter out the current waybill number
      availableWaybillsList = availableWaybillsList.filter(
        (waybill) => waybill.waybillNumber !== editFormData.waybillNumber
      );

      // Fetch already used sub waybill numbers from entity abbreviation summary
      try {
        const subWaybillResponse = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_API}/api/entity-abbreviation-summary/sub-waybill-numbers/${editFormData.waybillNumber}`
        );

        if (subWaybillResponse.ok) {
          const subWaybillData = await subWaybillResponse.json();

          if (
            subWaybillData.success &&
            subWaybillData.subWaybillNumbers.length > 0
          ) {
            console.log(
              `DEBUG: Found ${subWaybillData.subWaybillNumbers.length} already used sub waybill numbers:`,
              subWaybillData.subWaybillNumbers
            );

            // Keep the current subWaybillNumber in the list if it's already selected
            const currentSubWaybill = editFormData.subWaybillNumber;

            // Filter out already used sub waybill numbers, but keep the current one if it's already selected
            availableWaybillsList = availableWaybillsList.filter(
              (waybill) =>
                waybill.waybillNumber === currentSubWaybill ||
                !subWaybillData.subWaybillNumbers.includes(
                  waybill.waybillNumber
                )
            );

            console.log(
              `DEBUG: After filtering out used sub waybills, ${availableWaybillsList.length} waybills remain available`
            );
          }
        }
      } catch (error) {
        console.error("DEBUG: Error fetching used sub waybill numbers:", error);
        // Continue with original list if there's an error
      }

      console.log(
        `DEBUG: Final waybills list for stub ${stubNumber}:`,
        availableWaybillsList.map((w) => w.waybillNumber)
      );
      setAvailableWaybills(availableWaybillsList);

      // Show message if no waybills found for this stub
      if (availableWaybillsList.length === 0) {
        toast({
          title: "Information",
          description: `No unused waybills found for stub number ${stubNumber}`,
          status: "info",
          duration: 3000,
          isClosable: true,
        });
      }

      setIsFetchingWaybills(false);
    } catch (error) {
      console.error("DEBUG: Error in fallbackToStubBasedSearch:", error);
      toast({
        title: "Error",
        description: "Failed to fetch available waybills: " + error.message,
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      setAvailableWaybills([]);
      setIsFetchingWaybills(false);
    }
  };

  // Function to handle subWaybillNumber selection
  const handleSubWaybillNumberChange = async (e) => {
    const selectedWaybill = e.target.value;

    // Log the change for debugging
    console.log(
      `Changing subWaybillNumber from ${editFormData.subWaybillNumber || "none"} to ${selectedWaybill}`
    );

    // Update editFormData with the selected waybill
    setEditFormData((prev) => ({
      ...prev,
      subWaybillNumber: selectedWaybill,
    }));

    // Status updates will be handled when the form is saved
  };

  // Function to get the current split count for the waybill and entity abbreviation
  const getSplitCount = async (waybillNumber, entityAbbreviation) => {
    try {
      // Fetch all consignees for this waybill
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/consigneeInfo/${waybillNumber}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch consignees for split count");
      }

      const consignees = await response.json();

      // Use a more precise filter to count existing split items
      // Look specifically for the pattern 'split-N(entityAbbreviation)'
      const splitConsignees = consignees.filter((c) => {
        // Check if it has split status
        if (c.split !== "split") return false;

        // Use regex to match the pattern 'split-NUMBER(entityAbbreviation)'
        const regex = new RegExp(`^split-(\\d+)\\(${entityAbbreviation}\\)`);
        if (c.consignee && c.consignee.match(regex)) {
          return true;
        }
        return false;
      });

      console.log(
        `Found ${splitConsignees.length} existing split items for ${entityAbbreviation}`
      );

      // Extract existing split numbers to find the highest one
      const existingSplitNumbers = splitConsignees
        .map((c) => {
          // Extract the number part from split-N
          const match = c.consignee.match(/^split-(\d+)/);
          return match ? parseInt(match[1], 10) : 0;
        })
        .filter((num) => !isNaN(num) && num > 0);

      // If we have existing split numbers, find the highest and add 1
      // Otherwise return 1 for the first split
      if (existingSplitNumbers.length > 0) {
        const highestNumber = Math.max(...existingSplitNumbers);
        console.log(
          `Highest existing split number is ${highestNumber}, next will be ${highestNumber + 1}`
        );
        return highestNumber + 1;
      } else {
        console.log("No existing split numbers found, starting with 1");
        return 1;
      }
    } catch (error) {
      console.error("Error getting split count:", error);
      return 1; // Default to 1 if there's an error
    }
  };

  // Function to get the current payload count for the waybill and entity abbreviation
  const getPayloadCount = async (waybillNumber, entityAbbreviation) => {
    try {
      // Fetch all consignees for this waybill
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/consigneeInfo/${waybillNumber}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch consignees for payload count");
      }

      const consignees = await response.json();

      // First try to fetch the entity abbreviation summaries directly
      const entityResponse = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/entity-abbreviation-summary/waybill/${waybillNumber}`
      );

      let entitySummaries = [];
      if (entityResponse.ok) {
        entitySummaries = await entityResponse.json();
        console.log("Entity summaries fetched:", entitySummaries);
      }

      // Use a more precise filter that checks BOTH:
      // 1. Consignees that have payload status set
      // 2. Entity abbreviations that start with payload- pattern
      const payloadConsignees = [
        // Check regular consignees
        ...consignees.filter((c) => {
          // Check if it has payload status
          if (c.payload === "payload") return true;

          // Also check if the consignee name starts with payload-N pattern
          if (c.consignee && c.consignee.match(/^payload-\d+\(/)) return true;

          return false;
        }),
        // Also check entity abbreviation summaries
        ...entitySummaries.filter((e) => {
          // Check if entityAbbreviation starts with "payload-"
          return (
            e.entityAbbreviation && e.entityAbbreviation.startsWith("payload-")
          );
        }),
      ];

      console.log(
        `Found ${payloadConsignees.length} payload items through combined checks`
      );

      // Extract existing payload numbers to find the highest one
      const existingPayloadNumbers = payloadConsignees
        .map((c) => {
          // Extract from consignee field if available
          if (c.consignee) {
            const match = c.consignee.match(/^payload-(\d+)/);
            if (match) return parseInt(match[1], 10);
          }

          // Or extract from entityAbbreviation field if available
          if (c.entityAbbreviation) {
            const match = c.entityAbbreviation.match(/^payload-(\d+)/);
            if (match) return parseInt(match[1], 10);
          }

          return 0;
        })
        .filter((num) => !isNaN(num) && num > 0);

      // If we have existing payload numbers, find the highest and add 1
      // Otherwise return 1 for the first payload
      if (existingPayloadNumbers.length > 0) {
        const highestNumber = Math.max(...existingPayloadNumbers);
        console.log(
          `Highest existing payload number is ${highestNumber}, next will be ${highestNumber + 1}`
        );
        return highestNumber + 1;
      } else {
        console.log("No existing payload numbers found, starting with 1");
        return 1;
      }
    } catch (error) {
      console.error("Error getting payload count:", error);
      return 1; // Default to 1 if there's an error
    }
  };

  // Modified function to handle split toggle
  const handleSplitToggle = async () => {
    // Toggle the split state
    const newSplitState = !isSplit;
    setIsSplit(newSplitState);

    // If turning on split, update the entity abbreviation format
    if (newSplitState) {
      try {
        // Extract the current entity abbreviation from consignee name or use the saved one
        let entityAbbr = originalEntityAbbr;

        if (!entityAbbr && editFormData.consignee) {
          const match = editFormData.consignee.match(/^([^-]+)/);
          if (match && match[1]) {
            entityAbbr = match[1].trim();
            setOriginalEntityAbbr(entityAbbr);
          }
        }

        if (entityAbbr) {
          // Always force a fresh query for the split count to ensure we get the latest
          // This is especially important if there are existing split items in the waybill
          const splitCount = await getSplitCount(
            editFormData.waybillNumber,
            entityAbbr
          );
          console.log(
            `🔄 Fresh split count check returns: ${splitCount} for ${entityAbbr}`
          );

          // Create the new split format with sequential numbering
          const splitFormat = `split-${splitCount}(${entityAbbr})`;

          // Get the store name part, either from the existing selection or use an empty string
          let storeName = "";
          if (editFormData.consignee) {
            // If it has format "ENTITY - STORENAME", extract the store name
            if (editFormData.consignee.includes(" - ")) {
              storeName = editFormData.consignee.split(" - ")[1].trim();
            }
            // Otherwise use the whole thing as the store name
            else {
              storeName = editFormData.consignee.trim();
            }
          }

          // Build the new consignee name with the proper format
          const newConsigneeName = storeName
            ? `${splitFormat} - ${storeName}`
            : splitFormat;

          console.log(`Setting split format: ${newConsigneeName}`);

          // Update the edit form data
          setEditFormData((prev) => ({
            ...prev,
            consignee: newConsigneeName,
            split: "split",
          }));
        }
      } catch (error) {
        console.error("Error updating split format:", error);
        toast({
          title: "Error",
          description: "Failed to update split format: " + error.message,
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      }
    } else {
      // If turning off split, restore the original format and handle subWaybillNumber
      if (editFormData.consignee) {
        let entityAbbr = originalEntityAbbr; // Start with stored original entity
        let storeName = "";

        // Check if we have a special format to extract the entity from
        const specialFormatMatch = editFormData.consignee.match(
          /^(split|payload)-\d+\(([^)]+)\)/
        );

        // If we found a match in the special format, extract the entity from inside parentheses
        if (specialFormatMatch && specialFormatMatch[2]) {
          entityAbbr = specialFormatMatch[2];
          console.log(`Extracted entity from special format: ${entityAbbr}`);
          // Save this entity for future use
          setOriginalEntityAbbr(entityAbbr);
        }

        // Now extract any store name that might be after the " - " separator
        if (editFormData.consignee.includes(" - ")) {
          storeName = editFormData.consignee.split(" - ")[1].trim();
        }

        // Build the new consignee name with the extracted entity
        const newConsigneeName = storeName
          ? `${entityAbbr} - ${storeName}`
          : entityAbbr;
        console.log(`Restoring to original format: ${newConsigneeName}`);

        // Store the original subWaybillNumber before resetting it
        const oldSubWaybill = editFormData.subWaybillNumber;

        // Update the edit form data, clearing subWaybillNumber when turning off split
        setEditFormData((prev) => ({
          ...prev,
          consignee: newConsigneeName,
          split: "",
          _originalSubWaybillNumber: oldSubWaybill, // Store for status update on save
          subWaybillNumber: "", // Clear subWaybillNumber when turning off split
        }));

        // If there was a subWaybillNumber, add it to waybillUpdates to be marked as UNUSED on save
        if (oldSubWaybill) {
          console.log(
            `Will mark subWaybillNumber ${oldSubWaybill} as UNUSED on save`
          );
        }
      } else {
        // Just update the split status and clear subWaybillNumber
        setEditFormData((prev) => ({
          ...prev,
          split: "",
          _originalSubWaybillNumber: prev.subWaybillNumber,
          subWaybillNumber: "",
        }));
      }
    }
  };

  // Function to handle payload toggle
  const handlePayloadToggle = async () => {
    // Toggle the payload state
    const newPayloadState = !isPayload;
    setIsPayload(newPayloadState);

    // If turning on payload, update the entity abbreviation format
    if (newPayloadState) {
      try {
        // Extract the current entity abbreviation from consignee name or use the saved one
        let entityAbbr = originalEntityAbbr;

        if (!entityAbbr && editFormData.consignee) {
          const match = editFormData.consignee.match(/^([^-]+)/);
          if (match && match[1]) {
            entityAbbr = match[1].trim();
            setOriginalEntityAbbr(entityAbbr);
          }
        }

        if (entityAbbr) {
          // Always force a fresh query for the payload count to ensure we get the latest
          // This is especially important if there are existing payload items in the waybill
          const payloadCount = await getPayloadCount(
            editFormData.waybillNumber,
            entityAbbr
          );
          console.log(
            `🔄 Fresh payload count check returns: ${payloadCount} for ${entityAbbr}`
          );

          // Create the new payload format with sequential numbering
          const payloadFormat = `payload-${payloadCount}(${entityAbbr})`;

          // Get the store name part, either from the existing selection or use an empty string
          let storeName = "";
          if (editFormData.consignee) {
            // If it has format "ENTITY - STORENAME", extract the store name
            if (editFormData.consignee.includes(" - ")) {
              storeName = editFormData.consignee.split(" - ")[1].trim();
            }
            // Otherwise use the whole thing as the store name
            else {
              storeName = editFormData.consignee.trim();
            }
          }

          // Build the new consignee name with the proper format
          const newConsigneeName = storeName
            ? `${payloadFormat} - ${storeName}`
            : payloadFormat; // If no store name yet, just use the format

          console.log(`Setting payload format: ${newConsigneeName}`);

          // Update the edit form data
          setEditFormData((prev) => ({
            ...prev,
            consignee: newConsigneeName,
            payload: "payload", // Ensure payload field is set
          }));
        }
      } catch (error) {
        console.error("Error updating payload format:", error);
        toast({
          title: "Error",
          description: "Failed to update payload format: " + error.message,
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      }
    } else {
      // If turning off payload, restore the original format and handle subWaybillNumber
      if (editFormData.consignee) {
        let entityAbbr = originalEntityAbbr; // Start with stored original entity
        let storeName = "";

        // Check if we have a special format to extract the entity from
        const specialFormatMatch = editFormData.consignee.match(
          /^(split|payload)-\d+\(([^)]+)\)/
        );

        // If we found a match in the special format, extract the entity from inside parentheses
        if (specialFormatMatch && specialFormatMatch[2]) {
          entityAbbr = specialFormatMatch[2];
          console.log(`Extracted entity from special format: ${entityAbbr}`);
          // Save this entity for future use
          setOriginalEntityAbbr(entityAbbr);
        }

        // Now extract any store name that might be after the " - " separator
        if (editFormData.consignee.includes(" - ")) {
          storeName = editFormData.consignee.split(" - ")[1].trim();
        }

        // Build the new consignee name with the extracted entity
        const newConsigneeName = storeName
          ? `${entityAbbr} - ${storeName}`
          : entityAbbr;
        console.log(`Restoring to original format: ${newConsigneeName}`);

        // Store the original subWaybillNumber before resetting it
        const oldSubWaybill = editFormData.subWaybillNumber;

        // Update the edit form data, clearing subWaybillNumber when turning off payload
        setEditFormData((prev) => ({
          ...prev,
          consignee: newConsigneeName,
          payload: "", // Clear payload field
          _originalSubWaybillNumber: oldSubWaybill, // Store for status update on save
          subWaybillNumber: "", // Clear subWaybillNumber when turning off payload
        }));

        // If there was a subWaybillNumber, add it to waybillUpdates to be marked as UNUSED on save
        if (oldSubWaybill) {
          console.log(
            `Will mark subWaybillNumber ${oldSubWaybill} as UNUSED on save`
          );
        }
      } else {
        // Just update the payload status and clear subWaybillNumber
        setEditFormData((prev) => ({
          ...prev,
          payload: "", // Clear payload field
          _originalSubWaybillNumber: prev.subWaybillNumber,
          subWaybillNumber: "",
        }));
      }
    }
  };

  // Improved function to calculate remaining CBM with real-time values
  const calculateRemainingCbmRealTime = (manualCbmValue = null) => {
    // Use the manual value if provided (for real-time input changes)
    // or fall back to the stored value in editFormData
    const currentCbm =
      manualCbmValue !== null
        ? parseFloat(manualCbmValue) || 0
        : parseFloat(editFormData.cbm) || 0;

    // Calculate total CBM from sub-details if we have them
    const subDetailsCbm = editSubDetails.reduce(
      (total, detail) => total + (parseFloat(detail.cbm) || 0),
      0
    );

    // If customTotalCbm is set, use that for the calculation base
    if (customTotalCbm > 0) {
      console.log(`Using custom total CBM: ${customTotalCbm}`);
      // For Store, use currentCbm; for DC, use sub-details
      const usedCbm = editFormData.type === "DC" ? subDetailsCbm : currentCbm;
      const remaining = roundToTwo(customTotalCbm - usedCbm);
      console.log(
        `Custom CBM calculation: ${customTotalCbm} - ${usedCbm} = ${remaining}`
      );
      return remaining;
    }

    // Otherwise use truck CBM
    const truckCbmValue = parseFloat(truckCbm) || 0;
    if (truckCbmValue > 0) {
      console.log(`Using truck CBM value: ${truckCbmValue}`);

      // Get total used CBM from all consignees except the current one being edited
      const otherConsigneesCbm = consignees
        .filter(
          (c) =>
            c._id !== editFormData._id &&
            c.waybillNumber === editFormData.waybillNumber
        )
        .reduce((sum, c) => {
          const cbmValue = parseFloat(c.cbm) || 0;
          console.log(`Consignee ${c.consignee}: ${cbmValue} CBM`);
          return sum + cbmValue;
        }, 0);

      console.log(`Total CBM from other consignees: ${otherConsigneesCbm}`);

      // Add the current consignee's CBM (either from form or sub-details)
      const currentUsedCbm =
        editFormData.type === "DC" ? subDetailsCbm : currentCbm;
      console.log(`Current edit consignee CBM: ${currentUsedCbm}`);

      // Calculate total used CBM
      const totalUsedCbm = otherConsigneesCbm + currentUsedCbm;
      console.log(`Total used CBM: ${totalUsedCbm}`);

      // Calculate remaining CBM
      const remaining = roundToTwo(truckCbmValue - totalUsedCbm);
      console.log(
        `Remaining CBM: ${truckCbmValue} - ${totalUsedCbm} = ${remaining}`
      );

      return remaining;
    }

    console.log(`No valid truck CBM or custom CBM found, returning 0`);
    return 0; // Default if no calculations can be made
  };

  // Helper function to update waybill statuses
  const updateWaybillStatuses = async (updatesArray) => {
    try {
      console.log("Updating waybill statuses:", updatesArray);

      // Call the new updateStatuses endpoint
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/waybills/updateStatuses`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ updates: updatesArray }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `Failed to update waybill statuses: ${errorData.error || errorData.message}`
        );
      }

      const result = await response.json();
      console.log("Waybill status updates result:", result);
      return result;
    } catch (error) {
      console.error("Error updating waybill statuses:", error);
      toast({
        title: "Warning",
        description: `Waybill status update issue: ${error.message}`,
        status: "warning",
        duration: 5000,
        isClosable: true,
      });
      return { success: false, error: error.message };
    }
  };

  // Add useEffect to update the remaining CBM calculation whenever editFormData.cbm or editSubDetails change
  useEffect(() => {
    // This will ensure the remaining CBM is recalculated whenever CBM values change
    // The calculation itself is handled by the calculateRemainingCbmRealTime function
    const remainingCbm = calculateRemainingCbmRealTime();
    console.log(`Remaining CBM updated: ${remainingCbm}`);
  }, [editFormData.cbm, editSubDetails, customTotalCbm]);

  return (
    <Drawer isOpen={isOpen} placement="right" onClose={onClose} size="xl">
      <DrawerOverlay backdropFilter="blur(2px)" />
      <DrawerContent maxW={{ base: "100%", md: "800px" }} boxShadow="lg">
        <DrawerCloseButton
          size="lg"
          color="gray.600"
          p={2}
          _hover={{
            bg: "gray.100",
            color: "gray.700",
          }}
        />
        <DrawerHeader
          borderBottomWidth="1px"
          borderColor="gray.200"
          py={6}
          bg="gray.50"
          color="gray.700"
        >
          <Flex align="center">
            <Icon as={EditIcon} mr={3} boxSize={5} color="gray.600" />
            <Heading size="md">Edit Consignee Information</Heading>
          </Flex>
        </DrawerHeader>
        <DrawerBody px={6} py={8}>
          <VStack spacing={6} align="stretch">
            {/* ID Fields */}
            <Box
              p={5}
              bg="gray.50"
              borderRadius="md"
              borderWidth="1px"
              borderColor="gray.200"
            >
              <Heading size="sm" mb={4} color="gray.700">
                Consignee Information
              </Heading>
              <Grid
                templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }}
                gap={5}
              >
                <FormControl>
                  <FormLabel
                    fontSize="sm"
                    fontWeight="semibold"
                    color="gray.600"
                  >
                    Waybill Number
                  </FormLabel>
                  <InputGroup>
                    <Input
                      name="waybillNumber"
                      value={editFormData.waybillNumber}
                      isReadOnly
                      borderColor="gray.200"
                      isDisabled
                      _disabled={{
                        opacity: 1, // Ensure text remains fully visible
                        color: "Black",
                      }}
                      bg="gray.100"
                      _hover={{ cursor: "not-allowed" }}
                      fontWeight="medium"
                    />
                    <InputRightElement>
                      <Icon as={InfoIcon} color="gray.400" />
                    </InputRightElement>
                  </InputGroup>
                </FormControl>
                <FormControl isRequired>
                  <FormLabel
                    fontSize="sm"
                    fontWeight="semibold"
                    color="gray.600"
                  >
                    Date Received
                    <Tooltip
                      label="Must be at least one day after Date Prepared"
                      placement="top"
                      hasArrow
                    >
                      <InfoIcon ml={1} color="gray.400" boxSize={3} />
                    </Tooltip>
                  </FormLabel>
                  <InputGroup>
                    <Input
                      name="date"
                      type="date"
                      value={editFormData.date}
                      onChange={handleEditModalChange}
                      borderColor="gray.200"
                      _hover={{ borderColor: "gray.300" }}
                      _focus={{
                        borderColor: "gray.300",
                        boxShadow: `0 0 0 1px gray.300`,
                      }}
                      min={getMinDateForReceived()}
                      onDoubleClick={(e) => e.currentTarget.showPicker()}
                    />
                    <InputRightElement>
                      <CalendarIcon color="gray.400" />
                    </InputRightElement>
                  </InputGroup>
                </FormControl>
                <FormControl isRequired>
                  <FormLabel
                    fontSize="sm"
                    fontWeight="semibold"
                    color="gray.600"
                  >
                    Origin
                  </FormLabel>
                  <Flex align="center">
                    <Badge
                      colorScheme="gray"
                      mr={2}
                      fontSize="sm"
                      px={2}
                      py={1}
                      borderRadius="md"
                    >
                      {shipperFormData.storeType || "STORE"}
                    </Badge>
                    <Text fontSize="md" mr={2} fontWeight="bold">
                      -
                    </Text>
                    <Input
                      name="origin"
                      value={editFormData.origin}
                      onChange={handleEditModalChange}
                      borderColor="gray.200"
                      _hover={{ borderColor: "gray.300" }}
                      _focus={{
                        borderColor: "gray.300",
                        boxShadow: `0 0 0 1px gray.300`,
                      }}
                      width="100%"
                    />
                  </Flex>
                </FormControl>
                <FormControl>
                  <FormLabel
                    fontWeight="semibold"
                    fontSize="sm"
                    color="gray.600"
                    display="flex"
                    alignItems="center"
                  >
                    <Text>Company</Text>
                    <Tooltip
                      label={
                        isIndividualMode
                          ? "Select individual consignee"
                          : "Select consignee company"
                      }
                      fontSize="xs"
                    >
                      <Box as="span" ml={1} color="gray.400" fontSize="xs">
                        <Icon as={InfoIcon} />
                      </Box>
                    </Tooltip>
                  </FormLabel>
                  <Select
                    name="shipperss"
                    value={editFormData.shipperss}
                    onChange={
                      isIndividualMode
                        ? handleIndividualChangess
                        : handleShipperChangess
                    }
                    borderColor="gray.200"
                    _hover={{ borderColor: "gray.300" }}
                    _focus={{
                      borderColor: "gray.300",
                      boxShadow: `0 0 0 1px gray.300`,
                    }}
                    placeholder={
                      isIndividualMode ? "Select Individual" : "Select Company"
                    }
                    size="md"
                    borderRadius="md"
                    bg="white"
                    icon={<ChevronDownIcon />}
                    iconSize="20px"
                  >
                    {isIndividualMode
                      ? individuals.map((individual) => (
                          <option
                            key={individual._id}
                            value={individual.individualName}
                          >
                            {individual.individualName}
                          </option>
                        ))
                      : companies.map((company) => (
                          <option key={company._id} value={company.companyName}>
                            {company.companyName}
                          </option>
                        ))}
                  </Select>
                </FormControl>
                <FormControl>
                  <FormLabel
                    fontSize="sm"
                    fontWeight="semibold"
                    color="gray.600"
                  >
                    Destination
                  </FormLabel>
                  <Input
                    name="destination"
                    value={editFormData.destination}
                    onChange={handleEditModalChange}
                    borderColor="gray.200"
                    _hover={{ borderColor: "gray.300" }}
                    _focus={{
                      borderColor: "gray.300",
                      boxShadow: `0 0 0 1px gray.300`,
                    }}
                  />
                </FormControl>
                <FormControl isRequired>
                  <FormLabel
                    fontWeight="semibold"
                    fontSize="sm"
                    color="gray.600"
                    display="flex"
                    alignItems="center"
                  >
                    <Text>Store</Text>
                    <Tooltip
                      label={
                        isIndividualMode
                          ? "Select individual consignee"
                          : "Select consignee company"
                      }
                      fontSize="xs"
                    >
                      <Box as="span" ml={1} color="gray.400" fontSize="xs">
                        <Icon as={InfoIcon} />
                      </Box>
                    </Tooltip>
                  </FormLabel>

                  <Box position="relative">
                    <SearchableSelect
                      value={editFormData.consignee}
                      onChange={(e) =>
                        handleEditModalChange({
                          ...e,
                          target: {
                            ...e.target,
                            "data-field": "consignee",
                          },
                        })
                      }
                      options={
                        consigneeClients && consigneeClients.length > 0
                          ? consigneeClients
                              .filter(
                                (consignee) =>
                                  !checkConsigneeExists(
                                    editFormData.waybillNumber,
                                    consignee.consigneeName
                                  ) ||
                                  consignee.consigneeName ===
                                    editFormData.consignee
                              )
                              .map((consignee) => ({
                                value: consignee.consigneeName,
                                label: shipperEntityAbbreviation
                                  ? `${shipperEntityAbbreviation} - ${consignee.consigneeName}`
                                  : consignee.consigneeName,
                              }))
                          : []
                      }
                      placeholder={
                        isIndividualMode
                          ? "Select Individual Consignee"
                          : "Select Store"
                      }
                      size="md"
                      bg="white"
                      borderColor="gray.200"
                      _hover={{
                        borderColor: "gray.300",
                        boxShadow: "sm",
                      }}
                      _focus={{
                        borderColor: "gray.300",
                        boxShadow: `0 0 0 1px gray.300`,
                      }}
                    />
                    <Button
                      size="sm"
                      leftIcon={<AddIcon />}
                      mt={2}
                      colorScheme="white"
                      bgColor={primaryColor}
                      onClick={() => {
                        if (
                          editFormData.consignee &&
                          editFormData.consignee.trim() !== ""
                        ) {
                          // Check if the consignee already exists in the clients list
                          const exists = consigneeClients.some(
                            (client) =>
                              client.consigneeName === editFormData.consignee
                          );

                          if (!exists) {
                            saveNewConsignees(editFormData.consignee);
                          } else {
                            toast({
                              title: "Consignee already exists",
                              status: "info",
                              duration: 3000,
                              isClosable: true,
                              position: "top-center",
                            });
                          }
                        } else {
                          toast({
                            title: "Enter a consignee name first",
                            status: "warning",
                            duration: 3000,
                            isClosable: true,
                            position: "top-center",
                          });
                        }
                      }}
                    >
                      Add Store
                    </Button>
                  </Box>
                </FormControl>
              </Grid>
            </Box>

            {/* Rate and Financial Details */}
            {editFormData.type === "Store" && (
              <Box
                p={5}
                bg="gray.50"
                borderRadius="md"
                borderWidth="1px"
                borderColor="gray.200"
                display={editSubDetails.length > 0 ? "none" : "block"}
              >
                <Flex align="center" mb={4} justify="space-between">
                  <Flex align="center">
                    <Icon as={FaFileInvoice} color="gray.600" mr={2} />
                    <Heading size="sm" color="gray.700">
                      Store Details
                    </Heading>
                  </Flex>

                  {/* Add Split and Payload Buttons */}
                  <Flex>
                    <Button
                      size="sm"
                      colorScheme={isSplit ? "purple" : "gray"}
                      leftIcon={<Icon as={isSplit ? CheckIcon : FaList} />}
                      onClick={handleSplitToggle}
                      fontWeight="medium"
                      _hover={{
                        transform: "translateY(-1px)",
                        boxShadow: "sm",
                      }}
                      title={
                        isSplit ? "Store marked as Split" : "Mark as Split"
                      }
                      mr={3}
                      variant={isSplit ? "solid" : "outline"}
                      boxShadow={isSplit ? "md" : "none"}
                      isDisabled={isPayload}
                    >
                      {isSplit ? "Split Marked" : "Mark as Split"}
                    </Button>
                    <Button
                      size="sm"
                      colorScheme={isPayload ? "orange" : "gray"}
                      leftIcon={<Icon as={isPayload ? CheckIcon : FaBoxOpen} />}
                      onClick={handlePayloadToggle}
                      fontWeight="medium"
                      _hover={{
                        transform: "translateY(-1px)",
                        boxShadow: "sm",
                      }}
                      title={
                        isPayload
                          ? "Store marked as Payload"
                          : "Mark as Payload"
                      }
                      mr={3}
                      variant={isPayload ? "solid" : "outline"}
                      boxShadow={isPayload ? "md" : "none"}
                      isDisabled={isSplit}
                    >
                      {isPayload ? "Payload Marked" : "Mark as Payload"}
                    </Button>
                  </Flex>
                </Flex>

                {/* Waybill selection for split/payload */}
                {(isSplit || isPayload) && (
                  <Box
                    mb={5}
                    mt={3}
                    borderWidth="1px"
                    borderColor="gray.200"
                    borderRadius="md"
                    p={4}
                    bg="gray.100"
                  >
                    <FormControl isRequired>
                      <FormLabel
                        fontSize="sm"
                        fontWeight="semibold"
                        color="gray.600"
                      >
                        Select Waybill to Use
                      </FormLabel>
                      {isFetchingWaybills ? (
                        <Flex align="center">
                          <Spinner size="sm" mr={2} />
                          <Text fontSize="sm">
                            Loading available waybills...
                          </Text>
                        </Flex>
                      ) : (
                        <Select
                          placeholder="Select waybill number"
                          value={editFormData.subWaybillNumber || ""}
                          onChange={handleSubWaybillNumberChange}
                          bg="white"
                          borderColor="gray.200"
                          _hover={{ borderColor: "gray.300" }}
                          _focus={{ borderColor: primaryColor }}
                        >
                          {availableWaybills.map((waybill) => (
                            <option
                              key={waybill._id}
                              value={waybill.waybillNumber}
                            >
                              {waybill.waybillNumber}
                            </option>
                          ))}
                        </Select>
                      )}
                      <Text fontSize="xs" color="gray.500" mt={1}>
                        This waybill will be marked as USED when saved
                      </Text>
                    </FormControl>

                    {/* Display subWaybillNumber as a read-only field if it exists */}
                    {editFormData.subWaybillNumber && (
                      <FormControl mt={3}>
                        <FormLabel
                          fontSize="sm"
                          fontWeight="semibold"
                          color="gray.600"
                        >
                          Sub-Waybill Number
                        </FormLabel>
                        <Input
                          value={editFormData.subWaybillNumber || ""}
                          isReadOnly
                          borderColor="gray.200"
                          isDisabled
                          _disabled={{
                            opacity: 1,
                            color: "black",
                          }}
                          bg="gray.100"
                          _hover={{ cursor: "not-allowed" }}
                          fontWeight="medium"
                        />
                      </FormControl>
                    )}
                  </Box>
                )}

                <Grid
                  templateColumns={{
                    base: "1fr",
                    md: "repeat(2, 1fr)",
                  }}
                  gap={5}
                >
                  {/* Remaining Truck CBM */}
                  <FormControl>
                    <FormLabel
                      fontSize="sm"
                      fontWeight="semibold"
                      color="gray.600"
                    >
                      {customTotalCbm > 0
                        ? `Remaining from Custom Total (${customTotalCbm} CBM)`
                        : "Remaining Truck CBM"}
                    </FormLabel>
                    <InputGroup>
                      <Input
                        type="number"
                        value={calculateRemainingCbmRealTime()}
                        isReadOnly
                        _readOnly={{
                          opacity: 1,
                          color: "black",
                        }}
                        borderColor="gray.200"
                        isDisabled
                        _disabled={{
                          opacity: 1,
                          color:
                            parseFloat(calculateRemainingCbmRealTime()) < 0
                              ? "red.500"
                              : "green.500",
                        }}
                        bg="gray.100"
                        _hover={{ cursor: "not-allowed" }}
                        fontWeight="medium"
                        color={
                          parseFloat(calculateRemainingCbmRealTime()) < 0
                            ? "red.500"
                            : "green.500"
                        }
                      />
                      <InputRightElement width="4.5rem">
                        <Text fontSize="sm" color="gray.500" mr={2}>
                          CBM
                        </Text>
                      </InputRightElement>
                    </InputGroup>
                  </FormControl>

                  {/* Rate */}
                  <FormControl>
                    <FormLabel
                      fontSize="sm"
                      fontWeight="semibold"
                      color="gray.600"
                    >
                      Rate
                    </FormLabel>
                    <InputGroup>
                      <Input
                        name="rate"
                        type="number"
                        value={
                          editFormData.rate === "0" || editFormData.rate === 0
                            ? ""
                            : editFormData.rate
                        }
                        onChange={handleEditModalChange}
                        borderColor="gray.200"
                        _hover={{ borderColor: "gray.300" }}
                        _focus={{
                          borderColor: "gray.300",
                          boxShadow: `0 0 0 1px gray.300`,
                        }}
                        bg="white"
                      />
                      <InputRightElement width="4.5rem">
                        <Text fontSize="sm" color="gray.500" mr={2}>
                          PHP
                        </Text>
                      </InputRightElement>
                    </InputGroup>
                  </FormControl>

                  {/* CBM */}
                  <FormControl>
                    <FormLabel
                      fontSize="sm"
                      fontWeight="semibold"
                      color="gray.600"
                    >
                      CBM
                    </FormLabel>
                    <InputGroup>
                      <Input
                        name="cbm"
                        type="number"
                        value={editFormData.cbm}
                        onChange={(e) => {
                          const newCbmValue = e.target.value;
                          // Log the real-time remaining CBM immediately
                          const remainingCbm =
                            calculateRemainingCbmRealTime(newCbmValue);
                          console.log(
                            `Real-time CBM remaining: ${remainingCbm}`
                          );

                          // Then update the form state
                          handleEditModalChange(e);
                        }}
                        borderColor="gray.200"
                        _hover={{ borderColor: "gray.300" }}
                        _focus={{
                          borderColor: "gray.300",
                          boxShadow: `0 0 0 1px gray.300`,
                        }}
                        bg="white"
                      />
                      <InputRightElement width="4.5rem">
                        <Text fontSize="sm" color="gray.500" mr={2}>
                          m³
                        </Text>
                      </InputRightElement>
                    </InputGroup>
                  </FormControl>

                  {/* Percentage */}
                  <FormControl>
                    <FormLabel
                      fontSize="sm"
                      fontWeight="semibold"
                      color="gray.600"
                    >
                      Percentage
                    </FormLabel>
                    <InputGroup>
                      <Input
                        name="percentage"
                        type="number"
                        value={editFormData.percentage}
                        onChange={handleEditModalChange}
                        borderColor="gray.200"
                        isDisabled
                        _disabled={{
                          opacity: 1, // Ensure text remains fully visible
                          color: "Black",
                        }}
                        bg="gray.100"
                        _hover={{ cursor: "not-allowed" }}
                        _focus={{
                          borderColor: "gray.300",
                          boxShadow: `0 0 0 1px gray.300`,
                        }}
                      />
                      <InputRightElement width="4.5rem">
                        <Text fontSize="sm" color="gray.500" mr={2}>
                          %
                        </Text>
                      </InputRightElement>
                    </InputGroup>
                  </FormControl>

                  {/* Amount */}
                  <FormControl display="none">
                    <FormLabel
                      fontSize="sm"
                      fontWeight="semibold"
                      color="gray.600"
                    >
                      Amount
                    </FormLabel>
                    <InputGroup>
                      <Input
                        name="amount"
                        type="number"
                        value={editFormData.amount}
                        isDisabled
                        _disabled={{
                          opacity: 1, // Ensure text remains fully visible
                          color: "Black",
                        }}
                        bg="gray.100"
                        _hover={{ cursor: "not-allowed" }}
                        borderColor="gray.200"
                        fontWeight="medium"
                      />
                      <InputRightElement width="4.5rem">
                        <Text fontSize="sm" color="gray.500" mr={2}>
                          ₱
                        </Text>
                      </InputRightElement>
                    </InputGroup>
                  </FormControl>
                </Grid>
              </Box>
            )}

            {/* DC Sub Details */}
            {editFormData.type === "DC" && (
              <Box>
                {/* Rate Section */}
                <Box
                  p={5}
                  bg={`${primaryColor}05`}
                  borderRadius="md"
                  borderWidth="1px"
                  borderColor={borderColor}
                  mb={6}
                >
                  <Flex align="center" mb={4}>
                    <Icon as={FaTruck} color={primaryColor} mr={2} />
                    <Heading size="sm" color={primaryColor}>
                      DC Rate Configuration
                    </Heading>
                  </Flex>
                  <SimpleGrid columns={{ base: 1, md: 3 }} spacing={5}>
                    <FormControl>
                      <FormLabel
                        fontWeight="semibold"
                        fontSize="sm"
                        color={primaryColor}
                        mb={1}
                        display="flex"
                        alignItems="center"
                      >
                        <Icon
                          as={FaMoneyBillWave}
                          mr={1}
                          color={primaryColor}
                          boxSize={3}
                        />
                        <Text>Rate</Text>
                        <Tooltip
                          label="The rate to be applied to the shipment"
                          fontSize="xs"
                        >
                          <Box as="span" ml={1} color="gray.400" fontSize="xs">
                            <Icon as={InfoIcon} />
                          </Box>
                        </Tooltip>
                      </FormLabel>
                      <InputGroup>
                        <Input
                          name="rate"
                          type="number"
                          value={
                            editFormData.rate === "0" || editFormData.rate === 0
                              ? ""
                              : editFormData.rate
                          }
                          onChange={handleEditModalChange}
                          borderColor={borderColor}
                          _hover={{
                            borderColor: secondaryColor,
                            boxShadow: "sm",
                          }}
                          _focus={{
                            borderColor: secondaryColor,
                            boxShadow: `0 0 0 1px ${secondaryColor}`,
                          }}
                          bg="white"
                        />
                        <InputRightElement width="4.5rem">
                          <Text fontSize="sm" color="gray.500" mr={2}>
                            PHP
                          </Text>
                        </InputRightElement>
                      </InputGroup>
                    </FormControl>

                    {/* Custom Total CBM input - show only if we have sub details */}
                    {editSubDetails.length > 0 && (
                      <FormControl>
                        <FormLabel
                          fontWeight="semibold"
                          fontSize="sm"
                          color={primaryColor}
                          mb={1}
                          display="flex"
                          alignItems="center"
                        >
                          <Icon
                            as={FaCubes}
                            mr={1}
                            color={primaryColor}
                            boxSize={3}
                          />
                          <Text>Total CBM</Text>
                          <Tooltip
                            label="Custom total CBM for percentage calculations"
                            fontSize="xs"
                          >
                            <Box
                              as="span"
                              ml={1}
                              color="gray.400"
                              fontSize="xs"
                            >
                              <Icon as={InfoIcon} />
                            </Box>
                          </Tooltip>
                        </FormLabel>
                        <InputGroup>
                          <Input
                            type="number"
                            value={customTotalCbm === 0 ? "" : customTotalCbm}
                            onChange={handleCustomTotalCbmChange}
                            min="0"
                            step="0.01"
                            bg="white"
                            borderColor={borderColor}
                            _hover={{
                              borderColor: secondaryColor,
                              boxShadow: "sm",
                            }}
                            _focus={{
                              borderColor: secondaryColor,
                              boxShadow: `0 0 0 1px ${secondaryColor}`,
                            }}
                          />
                          <InputRightElement width="4.5rem">
                            <Text fontSize="sm" color="gray.500" mr={2}>
                              CBM
                            </Text>
                          </InputRightElement>
                        </InputGroup>
                      </FormControl>
                    )}

                    <FormControl>
                      <FormLabel
                        fontWeight="semibold"
                        fontSize="sm"
                        color={primaryColor}
                        mb={1}
                        display="flex"
                        alignItems="center"
                      >
                        <Icon
                          as={FaCube}
                          mr={1}
                          color={primaryColor}
                          boxSize={3}
                        />
                        {customTotalCbm > 0
                          ? `Remaining from Custom Total (${customTotalCbm} CBM)`
                          : "Remaining Truck CBM"}
                      </FormLabel>
                      <InputGroup>
                        <Input
                          value={calculateRemainingCbmRealTime()}
                          borderColor={borderColor}
                          isDisabled
                          _hover={{ cursor: "not-allowed" }}
                          size="md"
                          bg="gray.100"
                          fontWeight="medium"
                          color={
                            parseFloat(calculateRemainingCbmRealTime()) < 0
                              ? "red.500"
                              : "green.500"
                          }
                          _disabled={{
                            opacity: 1,
                            color:
                              parseFloat(calculateRemainingCbmRealTime()) < 0
                                ? "red.500"
                                : "green.500",
                          }}
                        />
                        <InputRightElement width="4.5rem">
                          <Text fontSize="sm" color="gray.500" mr={2}>
                            CBM
                          </Text>
                        </InputRightElement>
                      </InputGroup>
                    </FormControl>
                  </SimpleGrid>
                </Box>

                {/* Only show the sub details box if there are sub details or the user has clicked to add one */}
                {editSubDetails.length > 0 || editSubDetailsWereRequested ? (
                  <Box
                    borderWidth="1px"
                    borderRadius="lg"
                    bg="white"
                    boxShadow="md"
                    overflow="hidden"
                  >
                    {/* Header with title */}
                    <Flex
                      justifyContent="space-between"
                      alignItems="center"
                      borderBottom={`1px solid ${borderColor}`}
                      bg={`${primaryColor}10`}
                      p={4}
                    >
                      <Flex alignItems="center">
                        <Icon
                          as={FaTruck}
                          color={primaryColor}
                          boxSize={5}
                          mr={2}
                        />
                        <Text
                          fontSize="lg"
                          fontWeight="bold"
                          color={primaryColor}
                        >
                          DC Sub Details
                        </Text>
                      </Flex>
                    </Flex>

                    <Box p={5}>
                      <VStack spacing={4} align="stretch">
                        <Box
                          borderRadius="md"
                          borderWidth="1px"
                          borderColor="gray.200"
                          overflow="hidden"
                          boxShadow="sm"
                          mb={4}
                        >
                          <Flex
                            justifyContent="space-between"
                            alignItems="center"
                            bg="gray.50"
                            p={3}
                            borderBottomWidth="1px"
                            borderColor="gray.200"
                          >
                            <Text
                              fontWeight="semibold"
                              fontSize="sm"
                              color={primaryColor}
                            >
                              Distribution Center Stores
                            </Text>
                            <Text
                              fontWeight="semibold"
                              fontSize="xs"
                              color="gray.500"
                            >
                              {editSubDetails.length} Store
                              {editSubDetails.length !== 1 ? "s" : ""}
                            </Text>
                          </Flex>

                          {editSubDetails.length === 0 ? (
                            <Flex
                              direction="column"
                              align="center"
                              justify="center"
                              p={6}
                              textAlign="center"
                              bg="gray.50"
                            >
                              <Icon
                                as={FaStore}
                                boxSize={8}
                                color="gray.300"
                                mb={3}
                              />
                              <Text color="gray.500" mb={2}>
                                No stores added yet
                              </Text>
                              <Text color="gray.400" fontSize="sm">
                                Click the button below to add stores to this DC
                              </Text>
                            </Flex>
                          ) : (
                            <Table variant="simple" size="sm">
                              <Thead bg="gray.50">
                                <Tr>
                                  <Th>Store Name</Th>
                                  <Th>CBM</Th>
                                  <Th>Percentage</Th>
                                  <Th isNumeric display="none">
                                    Amount
                                  </Th>
                                  <Th width="80px">Actions</Th>
                                </Tr>
                              </Thead>
                              <Tbody>
                                {editSubDetails.map((detail, index) => (
                                  <Tr key={index} _hover={{ bg: "gray.50" }}>
                                    <Td>
                                      <Flex>
                                        {!isIndividualMode && (
                                          <Select
                                            ml={2}
                                            value={
                                              selectedEntityAbbreviations[
                                                `edit_${index}`
                                              ] || ""
                                            }
                                            onChange={(e) =>
                                              handleEditSubDetailChange(
                                                index,
                                                "entityAbbreviation",
                                                e.target.value
                                              )
                                            }
                                            placeholder="COMP."
                                            size="sm"
                                            width="150px"
                                          >
                                            {companies &&
                                              companies.map((company) => (
                                                <option
                                                  key={company._id}
                                                  value={
                                                    company.entityAbbreviation
                                                  }
                                                >
                                                  {company.entityAbbreviation}
                                                </option>
                                              ))}
                                          </Select>
                                        )}
                                        <SearchableSelect
                                          value={detail.storeName}
                                          onChange={(e) =>
                                            handleEditSubDetailChange(
                                              index,
                                              "storeName",
                                              e.target.value
                                            )
                                          }
                                          options={
                                            consigneeClients &&
                                            consigneeClients.length > 0
                                              ? consigneeClients
                                                  .filter(
                                                    (consignee) =>
                                                      // Don't show if already selected in any editSubDetails
                                                      !editSubDetails.some(
                                                        (sd, i) =>
                                                          i !== index &&
                                                          sd.storeName ===
                                                            consignee.consigneeName
                                                      ) &&
                                                      // Don't show if already selected in any subDetails
                                                      !subDetails.some(
                                                        (sd) =>
                                                          sd.storeName ===
                                                          consignee.consigneeName
                                                      ) &&
                                                      // Don't show if already exists in other consignees
                                                      !consignees.some(
                                                        (c) =>
                                                          c._id !==
                                                            editFormData._id && // Allow the current consignee's stores
                                                          c.storeName ===
                                                            consignee.consigneeName
                                                      )
                                                  )
                                                  .map((consignee) => ({
                                                    value:
                                                      consignee.consigneeName,
                                                    label:
                                                      consignee.consigneeName,
                                                  }))
                                              : []
                                          }
                                          placeholder="Select store"
                                          size="sm"
                                        />
                                      </Flex>
                                    </Td>
                                    <Td>
                                      <FormattedNumberInput
                                        value={detail.cbm}
                                        onChange={(e) =>
                                          handleEditSubDetailChange(
                                            index,
                                            "cbm",
                                            e.target.value
                                          )
                                        }
                                        size="sm"
                                        showUnit={true}
                                        unit="m³"
                                        unitWidth="2rem"
                                      />
                                    </Td>
                                    <Td>
                                      <InputGroup size="sm">
                                        <Input
                                          type="number"
                                          value={detail.percentage}
                                          isDisabled
                                          _disabled={{
                                            opacity: 1,
                                            color: "Black",
                                          }}
                                          bg="gray.100"
                                          _hover={{ cursor: "not-allowed" }}
                                          size="sm"
                                        />
                                        <InputRightElement
                                          width="2rem"
                                          height="100%"
                                          fontSize="xs"
                                        >
                                          <Text color="gray.500" mr={1}>
                                            %
                                          </Text>
                                        </InputRightElement>
                                      </InputGroup>
                                    </Td>
                                    <Td display="none">
                                      <Input
                                        type="number"
                                        value={detail.amount}
                                        onChange={(e) =>
                                          handleEditSubDetailChange(
                                            index,
                                            "amount",
                                            parseFloat(e.target.value)
                                          )
                                        }
                                        size="sm"
                                      />
                                    </Td>
                                    <Td>
                                      <IconButton
                                        aria-label="Remove edit sub detail"
                                        icon={<DeleteIcon />}
                                        size="sm"
                                        colorScheme="red"
                                        variant="ghost"
                                        onClick={() => {
                                          const newEditSubDetails = [
                                            ...editSubDetails,
                                          ];
                                          newEditSubDetails.splice(index, 1);
                                          setEditSubDetails(newEditSubDetails);

                                          // Recalculate totals after removal
                                          const totals =
                                            newEditSubDetails.reduce(
                                              (acc, curr) => ({
                                                cbm:
                                                  acc.cbm +
                                                  Number(curr.cbm || 0),
                                                percentage:
                                                  acc.percentage +
                                                  Number(curr.percentage || 0),
                                                amount:
                                                  acc.amount +
                                                  Number(curr.amount || 0),
                                              }),
                                              {
                                                cbm: 0,
                                                percentage: 0,
                                                amount: 0,
                                              }
                                            );

                                          setEditTotalCbm(totals.cbm);
                                          setEditTotalPercentage(
                                            totals.percentage
                                          );
                                          setEditTotalAmount(totals.amount);
                                        }}
                                      />
                                    </Td>
                                  </Tr>
                                ))}
                              </Tbody>
                            </Table>
                          )}
                        </Box>
                        <Flex
                          justifyContent="flex-start"
                          width="100%"
                          pl={5}
                          mb={4}
                        >
                          <IconButton
                            icon={<AddIcon />}
                            bgColor={primaryColor}
                            color="white"
                            onClick={() => {
                              handleAddEditDCSubDetail();
                              setEditSubDetailsWereRequested(true);
                            }}
                            size="sm"
                            _hover={{
                              bgColor: secondaryColor,
                              transform: "translateY(-2px)",
                              boxShadow: "md",
                            }}
                            transition="all 0.2s"
                            borderRadius="md"
                            aria-label="Add Store to DC"
                          />
                        </Flex>
                      </VStack>
                    </Box>
                  </Box>
                ) : (
                  <Flex justifyContent="center" my={4}>
                    <Button
                      size="md"
                      leftIcon={<FaList />}
                      onClick={() => {
                        handleAddEditDCSubDetail();
                        setEditSubDetailsWereRequested(true);
                      }}
                      variant="outline"
                      colorScheme="blue"
                      fontWeight="semibold"
                      _hover={{
                        transform: "translateY(-1px)",
                        boxShadow: "sm",
                      }}
                      transition="all 0.2s"
                    >
                      Add Sub Details
                    </Button>
                  </Flex>
                )}
              </Box>
            )}

            {/* Store Sub Details */}
            {editFormData.type === "Store" && (
              <Box>
                {/* Rate Section - Only show if there are sub details */}
                {(editSubDetails.length > 0 || editSubDetailsWereRequested) && (
                  <Box
                    p={5}
                    bg={`${primaryColor}05`}
                    borderRadius="md"
                    borderWidth="1px"
                    borderColor={borderColor}
                    mb={6}
                  >
                    <Flex align="center" mb={4}>
                      <Icon as={FaStore} color={primaryColor} mr={2} />
                      <Heading size="sm" color={primaryColor}>
                        Store Rate Configuration
                      </Heading>
                    </Flex>
                    <SimpleGrid columns={{ base: 1, md: 3 }} spacing={5}>
                      <FormControl>
                        <FormLabel
                          fontWeight="semibold"
                          fontSize="sm"
                          color={primaryColor}
                          mb={1}
                          display="flex"
                          alignItems="center"
                        >
                          <Icon
                            as={FaMoneyBillWave}
                            mr={1}
                            color={primaryColor}
                            boxSize={3}
                          />
                          <Text>Rate</Text>
                          <Tooltip
                            label="The rate to be applied to the shipment"
                            fontSize="xs"
                          >
                            <Box
                              as="span"
                              ml={1}
                              color="gray.400"
                              fontSize="xs"
                            >
                              <Icon as={InfoIcon} />
                            </Box>
                          </Tooltip>
                        </FormLabel>
                        <InputGroup>
                          <Input
                            name="rate"
                            type="number"
                            value={
                              editFormData.rate === "0" ||
                              editFormData.rate === 0
                                ? ""
                                : editFormData.rate
                            }
                            onChange={handleEditModalChange}
                            borderColor={borderColor}
                            _hover={{
                              borderColor: secondaryColor,
                              boxShadow: "sm",
                            }}
                            _focus={{
                              borderColor: secondaryColor,
                              boxShadow: `0 0 0 1px ${secondaryColor}`,
                            }}
                            bg="white"
                          />
                          <InputRightElement width="4.5rem">
                            <Text fontSize="sm" color="gray.500" mr={2}>
                              PHP
                            </Text>
                          </InputRightElement>
                        </InputGroup>
                      </FormControl>

                      {/* Custom Total CBM input - show only if we have sub details */}
                      {editSubDetails.length > 0 && (
                        <FormControl>
                          <FormLabel
                            fontWeight="semibold"
                            fontSize="sm"
                            color={primaryColor}
                            mb={1}
                            display="flex"
                            alignItems="center"
                          >
                            <Icon
                              as={FaCubes}
                              mr={1}
                              color={primaryColor}
                              boxSize={3}
                            />
                            <Text>Total CBM</Text>
                            <Tooltip
                              label="Custom total CBM for percentage calculations"
                              fontSize="xs"
                            >
                              <Box
                                as="span"
                                ml={1}
                                color="gray.400"
                                fontSize="xs"
                              >
                                <Icon as={InfoIcon} />
                              </Box>
                            </Tooltip>
                          </FormLabel>
                          <InputGroup>
                            <Input
                              type="number"
                              value={customTotalCbm === 0 ? "" : customTotalCbm}
                              onChange={handleCustomTotalCbmChange}
                              min="0"
                              step="0.01"
                              bg="white"
                              borderColor={borderColor}
                              _hover={{
                                borderColor: secondaryColor,
                                boxShadow: "sm",
                              }}
                              _focus={{
                                borderColor: secondaryColor,
                                boxShadow: `0 0 0 1px ${secondaryColor}`,
                              }}
                            />
                            <InputRightElement width="4.5rem">
                              <Text fontSize="sm" color="gray.500" mr={2}>
                                CBM
                              </Text>
                            </InputRightElement>
                          </InputGroup>
                        </FormControl>
                      )}

                      <FormControl>
                        <FormLabel
                          fontWeight="semibold"
                          fontSize="sm"
                          color={primaryColor}
                          mb={1}
                          display="flex"
                          alignItems="center"
                        >
                          <Icon
                            as={FaCube}
                            mr={1}
                            color={primaryColor}
                            boxSize={3}
                          />
                          {customTotalCbm > 0
                            ? `Remaining from Custom Total (${customTotalCbm} CBM)`
                            : "Remaining Truck CBM"}
                        </FormLabel>
                        <InputGroup>
                          <Input
                            value={calculateRemainingCbmRealTime()}
                            borderColor={borderColor}
                            isDisabled
                            _hover={{ cursor: "not-allowed" }}
                            size="md"
                            bg="gray.100"
                            fontWeight="medium"
                            color={
                              parseFloat(calculateRemainingCbmRealTime()) < 0
                                ? "red.500"
                                : "green.500"
                            }
                            _disabled={{
                              opacity: 1,
                              color:
                                parseFloat(calculateRemainingCbmRealTime()) < 0
                                  ? "red.500"
                                  : "green.500",
                            }}
                          />
                          <InputRightElement width="4.5rem">
                            <Text fontSize="sm" color="gray.500" mr={2}>
                              CBM
                            </Text>
                          </InputRightElement>
                        </InputGroup>
                      </FormControl>
                    </SimpleGrid>
                  </Box>
                )}

                {/* Only show the sub details box if there are sub details or the user has clicked to add one */}
                {editSubDetails.length > 0 || editSubDetailsWereRequested ? (
                  <Box
                    borderRadius="md"
                    borderWidth="1px"
                    borderColor={borderColor}
                    overflow="hidden"
                  >
                    <Flex
                      bg={`${primaryColor}10`}
                      p={4}
                      justify="space-between"
                      align="center"
                      borderBottomWidth="1px"
                      borderColor={borderColor}
                    >
                      <Heading size="sm" color={primaryColor}>
                        Store Sub Details
                      </Heading>
                      <HStack>
                        <Badge
                          colorScheme="blue"
                          borderRadius="full"
                          px={2}
                          py={1}
                        >
                          {editSubDetails.length} Stores
                        </Badge>
                      </HStack>
                    </Flex>

                    {editSubDetails.length === 0 ? (
                      <Box p={6} textAlign="center" bg="gray.50">
                        <Text color="gray.500">No sub details available</Text>
                      </Box>
                    ) : (
                      <Table variant="simple" size="sm">
                        <Thead bg={`${lightBg}50`}>
                          <Tr>
                            <Th>Store Name</Th>
                            <Th>CBM</Th>
                            <Th>Percentage</Th>
                            <Th display="none">Amount</Th>
                            <Th width="80px">Actions</Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {editSubDetails.map((detail, index) => (
                            <Tr
                              key={index}
                              bg={index % 2 === 0 ? "white" : `${lightBg}50`}
                              _hover={{ bg: `${primaryColor}05` }}
                            >
                              <Td>
                                <Flex>
                                  {!isIndividualMode && (
                                    <Select
                                      ml={2}
                                      value={
                                        selectedEntityAbbreviations[
                                          `edit_${index}`
                                        ] || ""
                                      }
                                      onChange={(e) =>
                                        handleEditSubDetailChange(
                                          index,
                                          "entityAbbreviation",
                                          e.target.value
                                        )
                                      }
                                      placeholder="COMP."
                                      size="sm"
                                      width="150px"
                                    >
                                      {companies &&
                                        companies.map((company) => (
                                          <option
                                            key={company._id}
                                            value={company.entityAbbreviation}
                                          >
                                            {company.entityAbbreviation}
                                          </option>
                                        ))}
                                    </Select>
                                  )}
                                  <SearchableSelect
                                    value={detail.storeName}
                                    onChange={(e) =>
                                      handleEditSubDetailChange(
                                        index,
                                        "storeName",
                                        e.target.value
                                      )
                                    }
                                    options={
                                      consigneeClients &&
                                      consigneeClients.length > 0
                                        ? consigneeClients
                                            .filter(
                                              (consignee) =>
                                                // Don't show if already selected in any editSubDetails
                                                !editSubDetails.some(
                                                  (sd, i) =>
                                                    i !== index &&
                                                    sd.storeName ===
                                                      consignee.consigneeName
                                                ) &&
                                                // Don't show if already selected in any subDetails
                                                !subDetails.some(
                                                  (sd) =>
                                                    sd.storeName ===
                                                    consignee.consigneeName
                                                ) &&
                                                // Don't show if already exists in other consignees
                                                !consignees.some(
                                                  (c) =>
                                                    c._id !==
                                                      editFormData._id && // Allow the current consignee's stores
                                                    c.storeName ===
                                                      consignee.consigneeName
                                                )
                                            )
                                            .map((consignee) => ({
                                              value: consignee.consigneeName,
                                              label: consignee.consigneeName,
                                            }))
                                        : []
                                    }
                                    placeholder="Select store"
                                    size="sm"
                                  />
                                </Flex>
                              </Td>
                              <Td>
                                <FormattedNumberInput
                                  value={detail.cbm}
                                  onChange={(e) =>
                                    handleEditSubDetailChange(
                                      index,
                                      "cbm",
                                      e.target.value
                                    )
                                  }
                                  size="sm"
                                  showUnit={true}
                                  unit="m³"
                                  unitWidth="2rem"
                                />
                              </Td>
                              <Td>
                                <InputGroup size="sm">
                                  <Input
                                    type="number"
                                    value={detail.percentage}
                                    borderColor={borderColor}
                                    isDisabled
                                    _disabled={{
                                      opacity: 1,
                                      color: "Black",
                                    }}
                                    bg="gray.100"
                                    _hover={{ cursor: "not-allowed" }}
                                    size="sm"
                                  />
                                  <InputRightElement
                                    width="2rem"
                                    height="100%"
                                    fontSize="xs"
                                  >
                                    <Text color="gray.500" mr={1}>
                                      %
                                    </Text>
                                  </InputRightElement>
                                </InputGroup>
                              </Td>
                              <Td display="none">
                                <Input
                                  type="number"
                                  value={detail.amount}
                                  onChange={(e) =>
                                    handleEditSubDetailChange(
                                      index,
                                      "amount",
                                      parseFloat(e.target.value)
                                    )
                                  }
                                  size="sm"
                                />
                              </Td>
                              <Td>
                                <IconButton
                                  aria-label="Remove edit sub detail"
                                  icon={<DeleteIcon />}
                                  size="sm"
                                  colorScheme="red"
                                  variant="ghost"
                                  onClick={() => {
                                    const newEditSubDetails = [
                                      ...editSubDetails,
                                    ];
                                    newEditSubDetails.splice(index, 1);
                                    setEditSubDetails(newEditSubDetails);

                                    // Recalculate totals
                                    const totals = newEditSubDetails.reduce(
                                      (acc, curr) => ({
                                        cbm: roundToTwo(
                                          acc.cbm + (parseFloat(curr.cbm) || 0)
                                        ),
                                        percentage: roundToTwo(
                                          acc.percentage +
                                            (parseFloat(curr.percentage) || 0)
                                        ),
                                        amount: roundToTwo(
                                          acc.amount +
                                            (parseFloat(curr.amount) || 0)
                                        ),
                                      }),
                                      { cbm: 0, percentage: 0, amount: 0 }
                                    );

                                    setEditTotalCbm(totals.cbm);
                                    setEditTotalPercentage(totals.percentage);
                                    setEditTotalAmount(totals.amount);
                                  }}
                                />
                              </Td>
                            </Tr>
                          ))}
                        </Tbody>
                      </Table>
                    )}
                    <Flex
                      justifyContent="flex-start"
                      width="100%"
                      pl={5}
                      mb={4}
                    >
                      <IconButton
                        icon={<AddIcon />}
                        bgColor={primaryColor}
                        color="white"
                        onClick={() => {
                          handleAddEditStoreSubDetail();
                          setEditSubDetailsWereRequested(true);
                        }}
                        size="sm"
                        _hover={{
                          bgColor: secondaryColor,
                          transform: "translateY(-2px)",
                          boxShadow: "md",
                        }}
                        transition="all 0.2s"
                        borderRadius="md"
                        aria-label="Add Sub-Detail"
                      />
                    </Flex>
                  </Box>
                ) : (
                  <Flex justifyContent="center" my={4}>
                    <Button
                      size="md"
                      leftIcon={<FaList />}
                      onClick={() => {
                        handleAddEditStoreSubDetail();
                        setEditSubDetailsWereRequested(true);
                      }}
                      variant="outline"
                      colorScheme="blue"
                      fontWeight="semibold"
                      _hover={{
                        transform: "translateY(-1px)",
                        boxShadow: "sm",
                      }}
                      transition="all 0.2s"
                    >
                      Add Sub Details
                    </Button>
                  </Flex>
                )}
              </Box>
            )}
          </VStack>
        </DrawerBody>
        <DrawerFooter borderTopWidth="1px">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            colorScheme="white"
            bgColor={primaryColor}
            onClick={async () => {
              // Check if we need to update waybill statuses
              const waybillUpdates = [];

              // If there's a new waybill number selected for split/payload (subWaybillNumber)
              // Update it to USED
              if (editFormData.subWaybillNumber) {
                waybillUpdates.push({
                  waybillNumber: editFormData.subWaybillNumber,
                  status: "USED",
                });
              }

              // If there was a previous subWaybillNumber and it changed, update the old one to UNUSED
              const originalSubWaybill = editFormData._originalSubWaybillNumber;
              if (
                originalSubWaybill &&
                originalSubWaybill !== editFormData.subWaybillNumber &&
                originalSubWaybill.trim() !== ""
              ) {
                waybillUpdates.push({
                  waybillNumber: originalSubWaybill,
                  status: "UNUSED",
                });
              }

              // If we have waybill updates to perform
              if (waybillUpdates.length > 0) {
                try {
                  // Update waybill statuses first
                  await updateWaybillStatuses(waybillUpdates);

                  // Then proceed with the normal save
                  await handleSaveEdit();
                } catch (error) {
                  console.error(
                    "Error during save with waybill updates:",
                    error
                  );
                  toast({
                    title: "Error",
                    description: "Failed to update waybill statuses",
                    status: "error",
                    duration: 3000,
                    isClosable: true,
                  });
                }
              } else {
                // Just do the normal save if no waybill updates are needed
                await handleSaveEdit();
              }
            }}
            isLoading={isSavingEdit}
            loadingText="Saving..."
            width="130px"
            flexShrink={0}
          >
            Save
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};

export default EditDrawer;
