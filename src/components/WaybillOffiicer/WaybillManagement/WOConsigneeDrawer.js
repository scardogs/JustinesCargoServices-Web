import React, { useState, useEffect } from "react";
import {
  Drawer,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  DrawerHeader,
  DrawerBody,
  Box,
  Flex,
  Text,
  Icon,
  FormControl,
  FormLabel,
  Input,
  InputGroup,
  InputRightElement,
  Badge,
  Button,
  SimpleGrid,
  Tooltip,
  Select,
  VStack,
  DrawerFooter,
  HStack,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  IconButton,
} from "@chakra-ui/react";
import {
  FaFileInvoice,
  FaUserAlt,
  FaCalendarAlt,
  FaMapMarkerAlt,
  FaTruck,
  FaBuilding,
  FaCube,
  FaMoneyBillWave,
  FaCubes,
  FaStore,
  FaWeight,
  FaList,
  FaBoxOpen,
  FaFileAlt,
} from "react-icons/fa";
import {
  AddIcon,
  DeleteIcon,
  EditIcon,
  InfoIcon,
  CalendarIcon,
  ChevronDownIcon,
  DownloadIcon,
  CheckIcon,
  SearchIcon,
  ChevronUpIcon,
} from "@chakra-ui/icons";
import { BiAnalyse } from "react-icons/bi";
import { formatNumberWithCommas } from "../../WaybillManagement/waybillbody";

const ConsigneeDrawer = ({
  isDrawerOpen,
  closeDrawer,
  primaryColor,
  secondaryColor,
  borderColor,
  modalFormData,
  handleModalChange,
  getMinDateForReceived,
  shipperFormData,
  isIndividualMode,
  handleIndividualChanges,
  handleShipperChanges,
  handleConsigneeChange,
  consigneeClients,
  checkConsigneeExists,
  shipperEntityAbbreviation,
  saveNewConsignee,
  toast,
  showSubDetails,
  storeType,
  isDcMode,
  setIsDcMode,
  setStoreType,
  setModalFormData,
  customTotalCbm,
  calculateRemainingCbm,
  handleCustomTotalCbmChange,
  isStoreSubDetailMode,
  subDetails,
  setSubDetails,
  SearchableSelect,
  handleAddSubDetail,
  storeNames,
  handleSubDetailChange,
  handleSaveModal,
  handleAddDCSubDetail,
  handleAddStoreSubDetail,
  handleSaveDC,
  handleSaveStore,
  individuals,
  companies,
  FormattedNumberInput,
  isCbmFull,
}) => {
  // Add state variables for the missing variables
  const [selectedEntityAbbreviations, setSelectedEntityAbbreviations] =
    useState({});
  const [totalCbm, setTotalCbm] = useState(0);
  const [totalPercentage, setTotalPercentage] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [totalAdditionals, setTotalAdditionals] = useState(0);
  const [localIsStoreSubDetailMode, setIsStoreSubDetailMode] = useState(
    isStoreSubDetailMode || false
  );
  // Add split state
  const [isSplit, setIsSplit] = useState(modalFormData.split === "split");
  // Add payload state
  const [isPayload, setIsPayload] = useState(
    modalFormData.payload === "payload"
  );
  // Add original entity abbreviation state to preserve it when toggling split
  const [originalEntityAbbr, setOriginalEntityAbbr] = useState("");
  // Add states for fetching available waybills for subWaybillNumber
  const [availableWaybills, setAvailableWaybills] = useState([]);
  const [isFetchingWaybills, setIsFetchingWaybills] = useState(false);
  const [isRateFocused, setIsRateFocused] = useState(false);

  // Add useEffect to reset selectedEntityAbbreviations when drawer closes
  useEffect(() => {
    if (!isDrawerOpen) {
      setSelectedEntityAbbreviations({});
      // Reset split state when drawer closes
      setIsSplit(false);
      // Reset payload state when drawer closes
      setIsPayload(false);
      // Also ensure modalFormData.split and payload are reset to empty
      setModalFormData((prev) => ({
        ...prev,
        split: "",
        payload: "",
        subWaybillNumber: "", // Reset subWaybillNumber
      }));
      // Reset available waybills
      setAvailableWaybills([]);
    }
  }, [isDrawerOpen, setModalFormData]);

  // Add explicit useEffect to fetch available waybills when the drawer opens
  useEffect(() => {
    if (isDrawerOpen) {
      console.log("DEBUG: ConsigneeDrawer opened, fetching available waybills");
      console.log(`DEBUG: Using stub number: "${shipperFormData.stubNumber}"`);
      fetchAvailableWaybills();
    }
  }, [isDrawerOpen]);

  // Existing useEffect to fetch available waybills when split or payload is toggled
  useEffect(() => {
    if ((isSplit || isPayload) && isDrawerOpen) {
      console.log(
        "DEBUG: Triggering fetchAvailableWaybills due to dependency change"
      );
      console.log(
        `DEBUG: Current shipperFormData.stubNumber = "${shipperFormData.stubNumber}"`
      );
      fetchAvailableWaybills();
    }
  }, [isSplit, isPayload, isDrawerOpen, shipperFormData.stubNumber]);

  // Function to fetch available waybills
  const fetchAvailableWaybills = async () => {
    try {
      setIsFetchingWaybills(true);

      console.log(
        "DEBUG: Starting fetchAvailableWaybills in ConsigneeDrawer for waybill:",
        modalFormData.waybillNumber
      );

      if (!modalFormData.waybillNumber) {
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
        (detail) => detail.waybillNumber === modalFormData.waybillNumber
      );

      if (!currentTripDetail) {
        console.warn(
          `DEBUG: No trip found for waybill: ${modalFormData.waybillNumber}`
        );

        // Fall back to the original stub-based logic if no trip is found
        fallbackToStubBasedSearch();
        return;
      }

      console.log(
        `DEBUG: Found trip ID: ${currentTripDetail.tripID} for waybill: ${modalFormData.waybillNumber}`
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
        (waybill) => waybill.waybillNumber !== modalFormData.waybillNumber
      );

      // Fetch already used sub waybill numbers from entity abbreviation summary
      try {
        const subWaybillResponse = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_API}/api/entity-abbreviation-summary/sub-waybill-numbers/${modalFormData.waybillNumber}`
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

            // Filter out already used sub waybill numbers
            availableWaybillsList = availableWaybillsList.filter(
              (waybill) =>
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
          modalFormData.waybillNumber
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
        `DEBUG: Falling back to stub-based search with stub: "${stubNumber}" for waybill: ${modalFormData.waybillNumber}`
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
        (waybill) => waybill.waybillNumber !== modalFormData.waybillNumber
      );

      // Fetch already used sub waybill numbers from entity abbreviation summary
      try {
        const subWaybillResponse = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_API}/api/entity-abbreviation-summary/sub-waybill-numbers/${modalFormData.waybillNumber}`
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

            // Filter out already used sub waybill numbers
            availableWaybillsList = availableWaybillsList.filter(
              (waybill) =>
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

    // Update modalFormData with the selected waybill
    setModalFormData((prev) => ({
      ...prev,
      subWaybillNumber: selectedWaybill,
    }));

    // Remove the if statement that updates status to USED
    // We'll update status only when the form is actually saved
  };

  // Add useEffect to initialize selectedEntityAbbreviations from subDetails
  useEffect(() => {
    if (isDrawerOpen && subDetails && subDetails.length > 0) {
      const initialAbbreviations = {};
      subDetails.forEach((detail, index) => {
        if (detail.entityAbbreviation) {
          initialAbbreviations[index] = detail.entityAbbreviation;
        }
      });
      setSelectedEntityAbbreviations(initialAbbreviations);
    }
  }, [isDrawerOpen, subDetails]);

  // Add useEffect to update modalFormData when isSplit changes
  useEffect(() => {
    setModalFormData((prev) => ({
      ...prev,
      split: isSplit ? "split" : "",
    }));
  }, [isSplit, setModalFormData]);

  // Add useEffect to update modalFormData when isPayload changes
  useEffect(() => {
    setModalFormData((prev) => ({
      ...prev,
      payload: isPayload ? "payload" : "",
    }));
  }, [isPayload, setModalFormData]);

  // Add useEffect to initialize originalEntityAbbr when drawer opens
  useEffect(() => {
    if (isDrawerOpen && modalFormData.consignee) {
      // Extract the entity abbreviation from the consignee name (e.g., "SMCO - Store Name")
      const match = modalFormData.consignee.match(/^([^-]+)/);
      if (match && match[1]) {
        setOriginalEntityAbbr(match[1].trim());
      }
    }
  }, [isDrawerOpen, modalFormData.consignee]);

  // Add a new useEffect to pre-check existing payload/split items when the drawer opens or when payload/split status changes
  useEffect(() => {
    if (
      isDrawerOpen &&
      (isSplit || isPayload) &&
      modalFormData.waybillNumber &&
      originalEntityAbbr
    ) {
      const checkExistingFormats = async () => {
        try {
          if (isSplit) {
            // Pre-check split count
            const nextSplitNum = await getSplitCount(
              modalFormData.waybillNumber,
              originalEntityAbbr
            );
            console.log(
              `Pre-checked split count for ${originalEntityAbbr}: ${nextSplitNum}`
            );

            // Update the consignee name immediately if we're in split mode
            if (
              modalFormData.consignee &&
              !modalFormData.consignee.startsWith("split-")
            ) {
              const storeName = modalFormData.consignee.includes(" - ")
                ? modalFormData.consignee.split(" - ")[1].trim()
                : modalFormData.consignee;

              const splitFormat = `split-${nextSplitNum}(${originalEntityAbbr})`;
              const newConsigneeName = `${splitFormat} - ${storeName}`;

              // Update the modal form data
              setModalFormData((prev) => ({
                ...prev,
                consignee: newConsigneeName,
              }));
            }
          } else if (isPayload) {
            // Pre-check payload count
            const nextPayloadNum = await getPayloadCount(
              modalFormData.waybillNumber,
              originalEntityAbbr
            );
            console.log(
              `Pre-checked payload count for ${originalEntityAbbr}: ${nextPayloadNum}`
            );

            // Update the consignee name immediately if we're in payload mode
            if (
              modalFormData.consignee &&
              !modalFormData.consignee.startsWith("payload-")
            ) {
              const storeName = modalFormData.consignee.includes(" - ")
                ? modalFormData.consignee.split(" - ")[1].trim()
                : modalFormData.consignee;

              const payloadFormat = `payload-${nextPayloadNum}(${originalEntityAbbr})`;
              const newConsigneeName = `${payloadFormat} - ${storeName}`;

              // Update the modal form data
              setModalFormData((prev) => ({
                ...prev,
                consignee: newConsigneeName,
              }));
            }
          }
        } catch (error) {
          console.error("Error pre-checking format counts:", error);
        }
      };

      // Run the async function
      checkExistingFormats();
    }
  }, [
    isDrawerOpen,
    isSplit,
    isPayload,
    modalFormData.waybillNumber,
    originalEntityAbbr,
  ]);

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

        if (!entityAbbr && modalFormData.consignee) {
          const match = modalFormData.consignee.match(/^([^-]+)/);
          if (match && match[1]) {
            entityAbbr = match[1].trim();
            setOriginalEntityAbbr(entityAbbr);
          }
        }

        if (entityAbbr) {
          // Always force a fresh query for the split count to ensure we get the latest
          // This is especially important if there are existing split items in the waybill
          const splitCount = await getSplitCount(
            modalFormData.waybillNumber,
            entityAbbr
          );
          console.log(
            `🔄 Fresh split count check returns: ${splitCount} for ${entityAbbr}`
          );

          // Create the new split format with sequential numbering
          const splitFormat = `split-${splitCount}(${entityAbbr})`;

          // Get the store name part, either from the existing selection or use an empty string
          let storeName = "";
          if (modalFormData.consignee) {
            // If it has format "ENTITY - STORENAME", extract the store name
            if (modalFormData.consignee.includes(" - ")) {
              storeName = modalFormData.consignee.split(" - ")[1].trim();
            }
            // Otherwise use the whole thing as the store name
            else {
              storeName = modalFormData.consignee.trim();
            }
          }

          // Build the new consignee name with the proper format
          const newConsigneeName = storeName
            ? `${splitFormat} - ${storeName}`
            : splitFormat; // If no store name yet, just use the format

          console.log(`Setting split format: ${newConsigneeName}`);

          // Update the modal form data
          setModalFormData((prev) => ({
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
      // If turning off split, restore the original format if we have the original entity abbr
      if (originalEntityAbbr && modalFormData.consignee) {
        // Extract just the store name part
        let storeName = "";
        if (modalFormData.consignee.includes(" - ")) {
          storeName = modalFormData.consignee.split(" - ")[1].trim();
        } else {
          // If no store name format yet, use empty string
          storeName = "";
        }

        // Build the restored name with original entity
        const newConsigneeName = storeName
          ? `${originalEntityAbbr} - ${storeName}`
          : originalEntityAbbr;

        // Update the modal form data
        setModalFormData((prev) => ({
          ...prev,
          consignee: newConsigneeName,
          split: "",
        }));
      } else {
        // Just update the split status
        setModalFormData((prev) => ({
          ...prev,
          split: "",
        }));
      }
    }
  };

  // Replace the useEffect that updates modalFormData with the handleSplitToggle function
  useEffect(() => {
    // We'll handle this in the handleSplitToggle function now
  }, [isSplit, setModalFormData]);

  // Add function to handle abbreviation change
  const handleAbbreviationChange = (index, value) => {
    // Update local state first
    setSelectedEntityAbbreviations((prev) => ({
      ...prev,
      [index]: value,
    }));

    // Update the subDetails array directly to ensure consistency
    const updatedSubDetails = [...subDetails];
    if (updatedSubDetails[index]) {
      updatedSubDetails[index].entityAbbreviation = value;
      setSubDetails(updatedSubDetails);
    }

    // Call handleSubDetailChange with the new abbreviation
    handleSubDetailChange(index, "entityAbbreviation", value);
  };

  // These should be passed as props, but for now just create empty arrays
  const consignees = [];
  const editSubDetails = [];

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

        if (!entityAbbr && modalFormData.consignee) {
          const match = modalFormData.consignee.match(/^([^-]+)/);
          if (match && match[1]) {
            entityAbbr = match[1].trim();
            setOriginalEntityAbbr(entityAbbr);
          }
        }

        if (entityAbbr) {
          // Always force a fresh query for the payload count to ensure we get the latest
          // This is especially important if there are existing payload items in the waybill
          const payloadCount = await getPayloadCount(
            modalFormData.waybillNumber,
            entityAbbr
          );
          console.log(
            `🔄 Fresh payload count check returns: ${payloadCount} for ${entityAbbr}`
          );

          // Create the new payload format with sequential numbering
          const payloadFormat = `payload-${payloadCount}(${entityAbbr})`;

          // Get the store name part, either from the existing selection or use an empty string
          let storeName = "";
          if (modalFormData.consignee) {
            // If it has format "ENTITY - STORENAME", extract the store name
            if (modalFormData.consignee.includes(" - ")) {
              storeName = modalFormData.consignee.split(" - ")[1].trim();
            }
            // Otherwise use the whole thing as the store name
            else {
              storeName = modalFormData.consignee.trim();
            }
          }

          // Build the new consignee name with the proper format
          const newConsigneeName = storeName
            ? `${payloadFormat} - ${storeName}`
            : payloadFormat; // If no store name yet, just use the format

          console.log(`Setting payload format: ${newConsigneeName}`);

          // Update the modal form data
          setModalFormData((prev) => ({
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
      // If turning off payload, restore the original format if we have the original entity abbr
      if (originalEntityAbbr && modalFormData.consignee) {
        // Extract just the store name part
        let storeName = "";
        if (modalFormData.consignee.includes(" - ")) {
          storeName = modalFormData.consignee.split(" - ")[1].trim();
        } else {
          // If no store name format yet, use empty string
          storeName = "";
        }

        // Build the restored name with original entity
        const newConsigneeName = storeName
          ? `${originalEntityAbbr} - ${storeName}`
          : originalEntityAbbr;

        // Update the modal form data
        setModalFormData((prev) => ({
          ...prev,
          consignee: newConsigneeName,
          payload: "", // Clear payload field
        }));
      } else {
        // Just update the payload status
        setModalFormData((prev) => ({
          ...prev,
          payload: "", // Clear payload field
        }));
      }
    }
  };

  return (
    <Drawer
      isOpen={isDrawerOpen}
      placement="right"
      onClose={closeDrawer}
      size="x1"
    >
      <DrawerOverlay />
      <DrawerContent width="35%" maxW="35%">
        <DrawerCloseButton />
        <DrawerHeader
          fontSize="xl"
          fontWeight="bold"
          color="gray.700"
          borderBottomWidth="1px"
          borderColor="gray.200"
          bg="gray.50"
          py={4}
        >
          <Flex align="center">
            <Icon as={FaFileInvoice} mr={3} color="gray.600" />
            Add New Drops
          </Flex>
        </DrawerHeader>
        <DrawerBody p={6}>
          {/* Consignee Information Section - Redesigned with card and tabs */}
          <Box
            p={0}
            borderRadius="lg"
            boxShadow="md"
            bg="white"
            borderWidth="1px"
            borderColor="gray.200"
            mb={6}
            overflow="hidden"
          >
            {/* Consignee Information Header */}
            <Flex
              bg="gray.50"
              p={4}
              borderBottomWidth="1px"
              borderColor="gray.200"
              align="center"
            >
              <Icon as={FaUserAlt} color="gray.600" mr={3} boxSize={5} />
              <Text fontSize="lg" fontWeight="bold" color="gray.700">
                Consignee Information
              </Text>
            </Flex>

            {/* Consignee Information Content */}
            <Box p={5}>
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                {/* Waybill Number Field */}
                <FormControl>
                  <FormLabel
                    fontWeight="semibold"
                    fontSize="sm"
                    color="gray.600"
                    display="flex"
                    alignItems="center"
                  >
                    <Icon
                      as={FaFileInvoice}
                      mr={1}
                      color="gray.600"
                      boxSize={3}
                    />
                    Waybill Number
                  </FormLabel>
                  <Box
                    p={3}
                    borderRadius="md"
                    borderWidth="1px"
                    borderColor="gray.200"
                    transition="all 0.2s"
                    isDisabled
                    _disabled={{
                      opacity: 1,
                      color: "Black",
                    }}
                    bg="gray.50"
                    _hover={{ cursor: "not-allowed" }}
                  >
                    <Text fontSize="sm" fontWeight="medium">
                      {modalFormData.waybillNumber}
                    </Text>
                  </Box>
                </FormControl>

                {/* Date Received Field */}
                <FormControl>
                  <FormLabel
                    fontWeight="semibold"
                    fontSize="sm"
                    color="gray.600"
                    display="flex"
                    alignItems="center"
                  >
                    <Icon
                      as={FaCalendarAlt}
                      mr={1}
                      color="gray.600"
                      boxSize={3}
                    />
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
                      value={modalFormData.date}
                      onChange={(e) => {
                        const { value } = e.target;
                        const minAllowedDate = getMinDateForReceived();

                        // Check if date is valid
                        const dateReceived = new Date(value);
                        if (isNaN(dateReceived.getTime())) {
                          toast({
                            title: "Invalid Date",
                            description: "Please select a valid date",
                            status: "error",
                            duration: 3000,
                            isClosable: true,
                            position: "top-center",
                          });
                          return;
                        }

                        // Check if date received is before minimum allowed date
                        if (value < minAllowedDate) {
                          toast({
                            title: "Invalid Date",
                            description:
                              "Date received must be at least one day after date prepared",
                            status: "error",
                            duration: 3000,
                            isClosable: true,
                            position: "top-center",
                          });
                          return;
                        }

                        // If date is valid, update the form
                        handleModalChange(e);
                      }}
                      borderColor="gray.200"
                      bg="white"
                      height="42px"
                      transition="all 0.2s"
                      _hover={{
                        borderColor: "gray.300",
                        boxShadow: "sm",
                      }}
                      _focus={{
                        borderColor: "gray.300",
                        boxShadow: `0 0 0 1px gray.300`,
                      }}
                      size="md"
                      borderRadius="md"
                      min={getMinDateForReceived()}
                      onDoubleClick={(e) => e.currentTarget.showPicker()}
                    />
                    <InputRightElement>
                      <CalendarIcon color="gray.400" />
                    </InputRightElement>
                  </InputGroup>
                </FormControl>

                {/* Origin Field */}
                <FormControl>
                  <FormLabel
                    fontWeight="semibold"
                    fontSize="sm"
                    color="gray.600"
                    display="flex"
                    alignItems="center"
                  >
                    <Icon
                      as={FaMapMarkerAlt}
                      mr={1}
                      color="gray.600"
                      boxSize={3}
                    />
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
                    <Box
                      p={3}
                      borderRadius="md"
                      borderWidth="1px"
                      borderColor="gray.200"
                      isDisabled
                      _disabled={{
                        opacity: 1,
                        color: "Black",
                      }}
                      bg="gray.50"
                      _hover={{ cursor: "not-allowed" }}
                      transition="all 0.2s"
                      width="100%"
                    >
                      <Text fontSize="sm" color="gray.700">
                        {modalFormData.origin}
                      </Text>
                    </Box>
                  </Flex>
                </FormControl>

                {/* Shipper Field */}
                <FormControl>
                  <FormLabel
                    fontWeight="semibold"
                    fontSize="sm"
                    color="gray.600"
                    display="flex"
                    alignItems="center"
                  >
                    <Icon as={FaTruck} mr={1} color="gray.600" boxSize={3} />
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
                    name="shippers"
                    value={shipperFormData.shippers}
                    onChange={
                      isIndividualMode
                        ? handleIndividualChanges
                        : handleShipperChanges
                    }
                    borderColor="gray.200"
                    _hover={{ borderColor: "gray.300", boxShadow: "sm" }}
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

                {/* Destination Field */}
                <FormControl>
                  <FormLabel
                    fontWeight="semibold"
                    fontSize="sm"
                    color="gray.600"
                    display="flex"
                    alignItems="center"
                  >
                    <Icon
                      as={FaMapMarkerAlt}
                      mr={1}
                      color="gray.600"
                      boxSize={3}
                    />
                    Destination
                  </FormLabel>
                  <Input
                    name="destination"
                    value={modalFormData.destination}
                    onChange={handleModalChange}
                    borderColor="gray.200"
                    bg="white"
                    height="42px"
                    transition="all 0.2s"
                    _hover={{ borderColor: "gray.300", boxShadow: "sm" }}
                    _focus={{
                      borderColor: "gray.300",
                      boxShadow: `0 0 0 1px gray.300`,
                    }}
                    size="md"
                    borderRadius="md"
                  />
                </FormControl>

                {/* Consignee Field */}
                <FormControl>
                  <FormLabel
                    fontWeight="semibold"
                    fontSize="sm"
                    color="gray.600"
                    display="flex"
                    alignItems="center"
                  >
                    <Icon as={FaBuilding} mr={1} color="gray.600" boxSize={3} />
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
                      value={modalFormData.consignee}
                      onChange={handleConsigneeChange}
                      options={
                        consigneeClients && consigneeClients.length > 0
                          ? consigneeClients
                              .filter(
                                (consignee) =>
                                  !checkConsigneeExists(
                                    modalFormData.waybillNumber,
                                    consignee.consigneeName
                                  )
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
                      _hover={{
                        bg: "gray.700",
                        transform: "translateY(-1px)",
                      }}
                      transition="all 0.2s"
                      onClick={() => {
                        if (
                          modalFormData.consignee &&
                          modalFormData.consignee.trim() !== ""
                        ) {
                          // Check if the consignee already exists in the clients list
                          const exists = consigneeClients.some(
                            (client) =>
                              client.consigneeName === modalFormData.consignee
                          );

                          if (!exists) {
                            saveNewConsignee(modalFormData.consignee);
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
              </SimpleGrid>
            </Box>
          </Box>

          {/* Sub Details Section - Now always visible regardless of store selection */}
          <Box
            mt={4}
            borderWidth="1px"
            borderRadius="lg"
            bg="white"
            boxShadow="md"
            overflow="hidden"
          >
            {/* Header with tabs for Store/DC */}
            <Flex
              justifyContent="space-between"
              alignItems="center"
              borderBottom={`1px solid ${borderColor}`}
              bg={`${primaryColor}10`}
              p={4}
            >
              <Flex alignItems="center">
                <Icon
                  as={storeType === "DC" ? FaTruck : FaStore}
                  color={primaryColor}
                  boxSize={5}
                  mr={2}
                />
                <Text fontSize="lg" fontWeight="bold" color={primaryColor}>
                  {storeType === "DC" ? "DC Sub Details" : "Store Details"}
                </Text>
              </Flex>

              {/* Add Split and Payload Buttons */}
              {storeType === "Store" && (
                <Flex align="center">
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
                    title={isSplit ? "Store marked as Split" : "Mark as Split"}
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
                      isPayload ? "Store marked as Payload" : "Mark as Payload"
                    }
                    mr={3}
                    variant={isPayload ? "solid" : "outline"}
                    boxShadow={isPayload ? "md" : "none"}
                    isDisabled={isSplit}
                  >
                    {isPayload ? "Payload Marked" : "Mark as Payload"}
                  </Button>

                  {/* Add Sub Waybill Number Select when split or payload is active */}
                  {(isSplit || isPayload) && (
                    <Box width="240px">
                      <Select
                        size="sm"
                        name="subWaybillNumber"
                        value={modalFormData.subWaybillNumber || ""}
                        onChange={handleSubWaybillNumberChange}
                        placeholder="Select sub waybill number"
                        borderColor="gray.200"
                        bg="white"
                        _hover={{
                          borderColor: "gray.300",
                          boxShadow: "sm",
                        }}
                        isDisabled={isFetchingWaybills}
                      >
                        {availableWaybills.map((waybill) => (
                          <option
                            key={waybill._id || waybill.waybillNumber}
                            value={waybill.waybillNumber}
                          >
                            {waybill.waybillNumber}
                          </option>
                        ))}
                      </Select>
                    </Box>
                  )}
                </Flex>
              )}

              {/* Mode Switch as a card-style toggle */}
              <Flex
                borderWidth="1px"
                borderColor={borderColor}
                borderRadius="md"
                overflow="hidden"
                boxShadow="sm"
                display="none"
              >
                <Button
                  onClick={() => {
                    setIsDcMode(false);
                    setStoreType("Store");
                    setModalFormData((prev) => ({
                      ...prev,
                      type: "Store",
                    }));
                  }}
                  variant={!isDcMode ? "solid" : "ghost"}
                  bg={!isDcMode ? `${primaryColor}` : "transparent"}
                  color={!isDcMode ? "white" : "gray.600"}
                  borderRadius="0"
                  size="sm"
                  px={4}
                  py={2}
                  fontWeight="medium"
                  _hover={{
                    bg: !isDcMode ? primaryColor : `${primaryColor}10`,
                  }}
                  leftIcon={<Icon as={FaStore} boxSize="3" />}
                  _focus={{ boxShadow: "none" }}
                >
                  Store
                </Button>
                <Button
                  onClick={() => {
                    setIsDcMode(true);
                    setStoreType("DC");
                    setModalFormData((prev) => ({
                      ...prev,
                      type: "DC",
                    }));
                    // Clear sub details when switching to DC mode
                    setSubDetails([]);
                  }}
                  variant={isDcMode ? "solid" : "ghost"}
                  bg={isDcMode ? `${primaryColor}` : "transparent"}
                  color={isDcMode ? "white" : "gray.600"}
                  borderRadius="0"
                  size="sm"
                  px={4}
                  py={2}
                  fontWeight="medium"
                  _hover={{
                    bg: isDcMode ? primaryColor : `${primaryColor}10`,
                  }}
                  leftIcon={<Icon as={FaTruck} boxSize="3" />}
                  _focus={{ boxShadow: "none" }}
                >
                  DC
                </Button>
              </Flex>
            </Flex>

            {/* Add Total Truck CBM display */}
            <Box
              p={5}
              bg={`${primaryColor}05`}
              borderBottomWidth="1px"
              borderColor={borderColor}
            >
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
                    <Icon as={FaCube} mr={1} color={primaryColor} boxSize={3} />
                    {customTotalCbm > 0
                      ? `Remaining from Custom Total (${customTotalCbm} CBM)`
                      : "Remaining Truck CBM"}
                  </FormLabel>
                  <InputGroup>
                    <Input
                      value={calculateRemainingCbm()}
                      borderColor={borderColor}
                      isDisabled
                      _hover={{ cursor: "not-allowed" }}
                      size="md"
                      bg="gray.100"
                      fontWeight="medium"
                      color={
                        parseFloat(calculateRemainingCbm()) < 0
                          ? "red.500"
                          : "green.500"
                      }
                      _disabled={{
                        opacity: 1,
                        color:
                          parseFloat(calculateRemainingCbm()) < 0
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
                      type="text"
                      name="rate"
                      value={
                        isRateFocused
                          ? modalFormData.rate === 0
                            ? ""
                            : modalFormData.rate
                          : modalFormData.rate
                            ? formatNumberWithCommas(modalFormData.rate)
                            : ""
                      }
                      onFocus={() => setIsRateFocused(true)}
                      onBlur={() => setIsRateFocused(false)}
                      onChange={(e) => {
                        // Only allow numbers and commas
                        const raw = e.target.value.replace(/[^\d,]/g, "");
                        // Remove commas for storage
                        const numeric = raw.replace(/,/g, "");
                        // Call the original handler with a synthetic event
                        handleModalChange({
                          ...e,
                          target: {
                            ...e.target,
                            value: numeric,
                            name: "rate",
                          },
                        });
                      }}
                      min="0"
                      size="md"
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
                        PHP
                      </Text>
                    </InputRightElement>
                  </InputGroup>
                </FormControl>

                {/* Add Custom Total CBM input - only show in sub detail modes */}
                {(isDcMode || localIsStoreSubDetailMode) && (
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
                        <Box as="span" ml={1} color="gray.400" fontSize="xs">
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
                        size="md"
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
                      <InputRightElement width="3rem">
                        <Text fontSize="sm" color="gray.500" mr={2}>
                          CBM
                        </Text>
                      </InputRightElement>
                    </InputGroup>
                  </FormControl>
                )}
              </SimpleGrid>
            </Box>

            <Box p={5}>
              <VStack spacing={4} align="stretch">
                {storeType === "DC" ? (
                  // DC Sub Details content
                  <>
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
                          {subDetails.length} Store
                          {subDetails.length !== 1 ? "s" : ""}
                        </Text>
                      </Flex>

                      {subDetails.length === 0 ? (
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
                            {subDetails.map((detail, index) => (
                              <Tr key={index} _hover={{ bg: "gray.50" }}>
                                <Td>
                                  <Flex>
                                    {!isIndividualMode && (
                                      <Select
                                        ml={2}
                                        value={
                                          selectedEntityAbbreviations[index] ||
                                          detail.entityAbbreviation ||
                                          ""
                                        }
                                        onChange={(e) =>
                                          handleAbbreviationChange(
                                            index,
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
                                        handleSubDetailChange(
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
                                                  // Don't show if already selected in any subDetails
                                                  !subDetails.some(
                                                    (sd, i) =>
                                                      i !== index &&
                                                      sd.storeName ===
                                                        consignee.consigneeName
                                                  ) &&
                                                  // Don't show if already selected in any editSubDetails
                                                  !editSubDetails.some(
                                                    (sd) =>
                                                      sd.storeName ===
                                                      consignee.consigneeName
                                                  ) &&
                                                  // Don't show if already exists in the consignees list
                                                  !consignees.some(
                                                    (c) =>
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
                                      handleSubDetailChange(
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
                                      handleSubDetailChange(
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
                                    aria-label="Remove sub detail"
                                    icon={<DeleteIcon />}
                                    size="sm"
                                    colorScheme="red"
                                    variant="ghost"
                                    _hover={{ bg: "red.50" }}
                                    onClick={() => {
                                      const newSubDetails = [...subDetails];
                                      newSubDetails.splice(index, 1);
                                      setSubDetails(newSubDetails);

                                      // Recalculate totals after removal
                                      const totals = newSubDetails.reduce(
                                        (acc, curr) => ({
                                          cbm:
                                            acc.cbm +
                                            (parseFloat(curr.cbm) || 0),
                                          percentage:
                                            acc.percentage +
                                            (parseFloat(curr.percentage) || 0),
                                          amount:
                                            acc.amount +
                                            (parseFloat(curr.amount) || 0),
                                          additionals:
                                            acc.additionals +
                                            (parseFloat(curr.additionals) || 0),
                                        }),
                                        {
                                          cbm: 0,
                                          percentage: 0,
                                          amount: 0,
                                          additionals: 0,
                                        }
                                      );

                                      setTotalCbm(totals.cbm);
                                      setTotalPercentage(totals.percentage);
                                      setTotalAmount(totals.amount);
                                      setTotalAdditionals(totals.additionals);
                                    }}
                                  />
                                </Td>
                              </Tr>
                            ))}
                          </Tbody>
                        </Table>
                      )}
                    </Box>
                    <Button
                      leftIcon={<AddIcon />}
                      bgColor={primaryColor}
                      color="white"
                      onClick={handleAddDCSubDetail}
                      size="md"
                      px={6}
                      mb={4}
                      isDisabled={isCbmFull()}
                      _hover={{
                        bgColor: secondaryColor,
                        transform: "translateY(-2px)",
                        boxShadow: "md",
                      }}
                      transition="all 0.2s"
                      borderRadius="md"
                      fontWeight="semibold"
                      title={
                        isCbmFull()
                          ? "CBM capacity full - cannot add more stores"
                          : "Add a store to DC"
                      }
                    >
                      Add Store to DC
                    </Button>
                  </>
                ) : (
                  // Store Details content
                  <>
                    {localIsStoreSubDetailMode ? (
                      // Store Sub Details content - similar to DC but for store
                      <>
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
                              color="gray.700"
                            >
                              Store Sub-Details
                            </Text>
                            <Text
                              fontWeight="semibold"
                              fontSize="xs"
                              color="gray.500"
                            >
                              {subDetails.length} Item
                              {subDetails.length !== 1 ? "s" : ""}
                            </Text>
                          </Flex>

                          {subDetails.length === 0 ? (
                            <Flex
                              direction="column"
                              align="center"
                              justify="center"
                              p={6}
                              textAlign="center"
                              bg="gray.50"
                            >
                              <Icon
                                as={FaBoxOpen}
                                boxSize={8}
                                color="gray.300"
                                mb={3}
                              />
                              <Text color="gray.500" mb={2}>
                                No sub-details added yet
                              </Text>
                              <Text color="gray.400" fontSize="sm">
                                Click the button below to add sub-details to
                                this store
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
                                {subDetails.map((detail, index) => (
                                  <Tr key={index} _hover={{ bg: "gray.50" }}>
                                    <Td>
                                      <Flex>
                                        {!isIndividualMode && (
                                          <Select
                                            ml={2}
                                            value={
                                              selectedEntityAbbreviations[
                                                index
                                              ] ||
                                              detail.entityAbbreviation ||
                                              ""
                                            }
                                            onChange={(e) =>
                                              handleAbbreviationChange(
                                                index,
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
                                            handleSubDetailChange(
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
                                                      // Don't show if already selected in any subDetails
                                                      !subDetails.some(
                                                        (sd, i) =>
                                                          i !== index &&
                                                          sd.storeName ===
                                                            consignee.consigneeName
                                                      ) &&
                                                      // Don't show if already selected in any editSubDetails
                                                      !editSubDetails.some(
                                                        (sd) =>
                                                          sd.storeName ===
                                                          consignee.consigneeName
                                                      ) &&
                                                      // Don't show if already exists in the consignees list
                                                      !consignees.some(
                                                        (c) =>
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
                                          handleSubDetailChange(
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
                                          handleSubDetailChange(
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
                                        aria-label="Remove sub detail"
                                        icon={<DeleteIcon />}
                                        size="sm"
                                        colorScheme="red"
                                        variant="ghost"
                                        _hover={{ bg: "red.50" }}
                                        onClick={() => {
                                          const newSubDetails = [...subDetails];
                                          newSubDetails.splice(index, 1);
                                          setSubDetails(newSubDetails);

                                          // Recalculate totals after removal
                                          const totals = newSubDetails.reduce(
                                            (acc, curr) => ({
                                              cbm:
                                                acc.cbm +
                                                (parseFloat(curr.cbm) || 0),
                                              percentage:
                                                acc.percentage +
                                                (parseFloat(curr.percentage) ||
                                                  0),
                                              amount:
                                                acc.amount +
                                                (parseFloat(curr.amount) || 0),
                                              additionals:
                                                acc.additionals +
                                                (parseFloat(curr.additionals) ||
                                                  0),
                                            }),
                                            {
                                              cbm: 0,
                                              percentage: 0,
                                              amount: 0,
                                              additionals: 0,
                                            }
                                          );

                                          setTotalCbm(totals.cbm);
                                          setTotalPercentage(totals.percentage);
                                          setTotalAmount(totals.amount);
                                          setTotalAdditionals(
                                            totals.additionals
                                          );
                                        }}
                                      />
                                    </Td>
                                  </Tr>
                                ))}
                              </Tbody>
                            </Table>
                          )}
                        </Box>
                        <Flex justifyContent="flex-start" width="100%">
                          <IconButton
                            icon={<AddIcon />}
                            bgColor="gray.600"
                            color="white"
                            onClick={handleAddStoreSubDetail}
                            size="sm"
                            mb={4}
                            isDisabled={isCbmFull()}
                            _hover={{
                              bgColor: "gray.700",
                              transform: "translateY(-2px)",
                              boxShadow: "md",
                            }}
                            transition="all 0.2s"
                            borderRadius="md"
                            aria-label="Add Sub-Detail"
                            title={
                              isCbmFull()
                                ? "CBM capacity full - cannot add more sub-details"
                                : "Add a sub-detail"
                            }
                          />
                        </Flex>
                      </>
                    ) : (
                      <SimpleGrid
                        columns={1} // Change from columns={{ base: 1, md: 2 }} to columns={1} for vertical layout
                        spacing={5}
                        pt={2}
                      >
                        {/* Store Financial Fields */}
                        <FormControl>
                          <FormLabel
                            fontWeight="semibold"
                            fontSize="sm"
                            color="gray.600"
                            display="flex"
                            alignItems="center"
                          >
                            <Icon
                              as={FaCube}
                              mr={1}
                              color="gray.600"
                              boxSize={3}
                            />
                            CBM
                          </FormLabel>
                          <InputGroup maxWidth="400px">
                            <FormattedNumberInput
                              name="cbm"
                              value={modalFormData.cbm}
                              onChange={handleModalChange}
                              borderColor="gray.200"
                              _hover={{
                                borderColor: "gray.300",
                                boxShadow: "sm",
                              }}
                              _focus={{
                                borderColor: "gray.300",
                                boxShadow: `0 0 0 1px gray.300`,
                              }}
                              showUnit={true}
                              unit="m³"
                            />
                          </InputGroup>
                        </FormControl>
                        <FormControl>
                          <FormLabel
                            fontWeight="semibold"
                            fontSize="sm"
                            color="gray.600"
                            display="flex"
                            alignItems="center"
                          >
                            <Icon
                              as={BiAnalyse}
                              mr={1}
                              color="gray.600"
                              boxSize={3}
                            />
                            Percentage
                          </FormLabel>
                          <InputGroup maxWidth="300px">
                            <Input
                              name="percentage"
                              value={modalFormData.percentage}
                              borderColor="gray.200"
                              isDisabled
                              _disabled={{
                                opacity: 1,
                                color: "Black",
                              }}
                              bg="gray.100"
                              _hover={{ cursor: "not-allowed" }}
                            />
                            <InputRightElement>
                              <Text color="gray.500">%</Text>
                            </InputRightElement>
                          </InputGroup>
                        </FormControl>
                        <FormControl display="none">
                          <FormLabel
                            fontWeight="semibold"
                            fontSize="sm"
                            color="gray.600"
                            display="flex"
                            alignItems="center"
                          >
                            <Icon
                              as={FaWeight}
                              mr={1}
                              color="gray.600"
                              boxSize={3}
                            />
                            Weight
                          </FormLabel>
                          <InputGroup>
                            <FormattedNumberInput
                              name="weight"
                              value={modalFormData.weight}
                              onChange={handleModalChange}
                              borderColor="gray.200"
                              _hover={{
                                borderColor: "gray.300",
                                boxShadow: "sm",
                              }}
                              _focus={{
                                borderColor: "gray.300",
                                boxShadow: `0 0 0 1px gray.300`,
                              }}
                              showUnit={true}
                              unit="kg"
                            />
                          </InputGroup>
                        </FormControl>
                        <FormControl display="none">
                          <FormLabel
                            fontWeight="semibold"
                            fontSize="sm"
                            color="gray.600"
                            display="flex"
                            alignItems="center"
                          >
                            <Icon
                              as={FaMoneyBillWave}
                              mr={1}
                              color="gray.600"
                              boxSize={3}
                            />
                            Additionals
                          </FormLabel>
                          <InputGroup>
                            <FormattedNumberInput
                              name="additionals"
                              value={modalFormData.additionals}
                              onChange={handleModalChange}
                              borderColor="gray.200"
                              _hover={{
                                borderColor: "gray.300",
                                boxShadow: "sm",
                              }}
                              _focus={{
                                borderColor: "gray.300",
                                boxShadow: `0 0 0 1px gray.300`,
                              }}
                              showUnit={true}
                              unit="₱"
                            />
                          </InputGroup>
                        </FormControl>
                      </SimpleGrid>
                    )}

                    {/* Add toggle button for store sub detail mode */}
                    <Flex
                      mt={4}
                      justifyContent="center"
                      borderTopWidth="1px"
                      borderColor="gray.100"
                      pt={4}
                    >
                      <Button
                        onClick={() => {
                          // Reset sub details when turning off sub detail mode
                          if (localIsStoreSubDetailMode) {
                            setSubDetails([]);
                          } else {
                            // When turning on sub detail mode, add an initial empty row
                            setSubDetails([
                              {
                                storeName: "",
                                entityAbbreviation: "",
                                cbm: "0",
                                percentage: "0",
                                amount: 0,
                                additionals: 0,
                              },
                            ]);
                          }
                          setIsStoreSubDetailMode(!localIsStoreSubDetailMode);
                        }}
                        variant={
                          localIsStoreSubDetailMode ? "solid" : "outline"
                        }
                        colorScheme="blue"
                        leftIcon={
                          localIsStoreSubDetailMode ? <CheckIcon /> : <FaList />
                        }
                        size="md"
                        fontWeight="semibold"
                        boxShadow={localIsStoreSubDetailMode ? "md" : "none"}
                        _hover={{
                          transform: "translateY(-1px)",
                          boxShadow: "sm",
                        }}
                        transition="all 0.2s"
                      >
                        {localIsStoreSubDetailMode
                          ? "Using Sub Details"
                          : "Add Sub Details"}
                      </Button>
                    </Flex>
                  </>
                )}
              </VStack>
            </Box>
          </Box>
        </DrawerBody>
        <DrawerFooter borderTopWidth="1px">
          <HStack spacing={4}>
            {storeType === "DC" ? (
              <Button
                onClick={handleSaveDC}
                colorScheme="white"
                bgColor={primaryColor}
                width="130px"
                flexShrink={0}
              >
                Save DC
              </Button>
            ) : (
              <Button
                onClick={handleSaveStore}
                colorScheme="white"
                bgColor={primaryColor}
                width="130px"
                flexShrink={0}
              >
                Save
              </Button>
            )}
            <Button variant="ghost" onClick={closeDrawer}>
              Cancel
            </Button>
          </HStack>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};

export default ConsigneeDrawer;
