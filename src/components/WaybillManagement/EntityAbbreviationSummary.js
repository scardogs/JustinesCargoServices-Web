import React, { useState, useRef, useEffect } from "react";
import {
  Box,
  Text,
  Flex,
  SimpleGrid,
  Button,
  Badge,
  Icon,
  Popover,
  PopoverTrigger,
  PopoverContent,
  useToast,
  Input,
  Tooltip,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Select,
  Spinner,
  HStack,
  Heading,
  useDisclosure,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
} from "@chakra-ui/react";
import {
  FiRefreshCw,
  FiPercent,
  FiBarChart2,
  FiTrendingUp,
  FiClipboard,
  FiCheck,
  FiX,
  FiCopy,
  FiRotateCcw,
  FiTruck,
  FiTrash2,
} from "react-icons/fi";
import { ChevronDownIcon } from "@chakra-ui/icons";
import axios from "axios";
import { FaRedo, FaUndo, FaCopy } from "react-icons/fa";
import { BiAnalyse, RepeatIcon } from "react-icons/bi";
import { CopyIcon } from "@chakra-ui/icons";
import TripDetail from "../Trip/TripDetail";

// Utility functions
const formatNumberWithCommas = (value) => {
  if (!value) return "0";
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

const fetchSubDetails = async (waybillNumber) => {
  try {
    // Use the correct API endpoint that matches your backend route
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_API}/api/subdetails?waybillNumber=${waybillNumber}`
    );
    if (!response.ok) {
      throw new Error("Failed to fetch sub-details");
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching sub-details:", error);
    return [];
  }
};

// Function to update entity summary status to "rounded"
const updateEntitySummaryStatus = async (
  waybillNumber,
  status,
  entityAbbreviation = null
) => {
  try {
    // If entityAbbreviation is provided, update just that entity
    if (entityAbbreviation) {
      console.log(
        `Updating status for entity ${entityAbbreviation} to ${status}`
      );

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/entity-abbreviation-summary/single/${waybillNumber}/${entityAbbreviation}/status`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update entity status");
      }

      return await response.json();
    } else {
      // Otherwise update all entities for the waybill
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/entity-abbreviation-summary/waybill/${waybillNumber}/status`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update entity status");
      }

      return await response.json();
    }
  } catch (error) {
    console.error("Error updating entity status:", error);
    throw error;
  }
};

const calculateTotalsByEntityAbbreviation = async (
  consignees,
  waybillNumber
) => {
  // Filter consignees for the current waybill
  const filteredConsignees = consignees.filter(
    (c) => c.waybillNumber === waybillNumber
  );

  // Check if there are no consignees for this waybill
  if (filteredConsignees.length === 0) {
    console.log(`No consignees found for waybill ${waybillNumber}`);

    // Return empty data structure for consistency
    return {
      consigneeTotals: {},
      subDetailTotals: {},
      masterTotals: {},
    };
  }

  // Fetch sub-details for this waybill
  const subDetails = await fetchSubDetails(waybillNumber);

  // Create a master totals object to store our final results
  const masterTotals = {};

  // Create a mapping from consignee name to its entity abbreviation
  const consigneeToEntityAbbr = {};

  // Track which consignees have sub-details
  const consigneesWithSubDetails = new Set();

  // Track entities that have split status
  const entitySplitStatus = {};

  // Process main consignees and build the mapping
  filteredConsignees.forEach((consignee) => {
    const fullName = consignee.consignee || "";
    const entityAbbr = fullName.split(" - ")[0].trim();

    // Store the mapping of full consignee name to entity abbreviation
    consigneeToEntityAbbr[consignee.consignee] = entityAbbr;

    // Check if this consignee has split status
    if (consignee.split === "split") {
      // If any consignee in this entity has split status, mark the entity as split
      entitySplitStatus[entityAbbr] = "split";
      console.log(
        `Entity ${entityAbbr} marked as split due to consignee ${consignee.consignee}`
      );
    }
  });

  // First identify which consignees have sub-details
  if (subDetails && subDetails.length > 0) {
    subDetails.forEach((subDetail) => {
      consigneesWithSubDetails.add(subDetail.consignee);
    });
  }

  console.log(
    "Consignees with sub-details:",
    Array.from(consigneesWithSubDetails)
  );

  // FIRST PROCESS: Handle consignees without sub-details
  filteredConsignees.forEach((consignee) => {
    const fullName = consignee.consignee || "";
    const entityAbbr = fullName.split(" - ")[0].trim();

    // Skip if this consignee has sub-details (we'll count those instead)
    if (consigneesWithSubDetails.has(consignee.consignee)) {
      console.log(
        `Skipping consignee ${consignee.consignee} because it has sub-details`
      );
      return;
    }

    // Initialize entity in master totals if needed
    if (!masterTotals[entityAbbr]) {
      masterTotals[entityAbbr] = {
        totalAmount: 0,
        totalPercentage: 0,
        count: 0,
        items: {}, // Keep items for UI display
        status: "calculated",
        split: entitySplitStatus[entityAbbr] || "", // Include split status
      };
    }

    // Add to master totals
    const amount = parseFloat(consignee.amount || 0);
    const percentage = parseFloat(consignee.percentage || 0);

    masterTotals[entityAbbr].totalAmount += amount;
    masterTotals[entityAbbr].totalPercentage += percentage;
    masterTotals[entityAbbr].count += 1;

    console.log(
      `Adding consignee ${consignee.consignee} to ${entityAbbr}: Amount=${amount}, Percentage=${percentage}`
    );

    // Add individual item for UI display
    if (!masterTotals[entityAbbr].items[consignee.consignee]) {
      masterTotals[entityAbbr].items[consignee.consignee] = {
        amount: amount,
        percentage: percentage,
        count: 1,
      };
    } else {
      masterTotals[entityAbbr].items[consignee.consignee].amount += amount;
      masterTotals[entityAbbr].items[consignee.consignee].percentage +=
        percentage;
      masterTotals[entityAbbr].items[consignee.consignee].count += 1;
    }
  });

  // SECOND PROCESS: Process sub-details directly
  if (subDetails && subDetails.length > 0) {
    // Group subdetails by store entity abbreviation
    const subDetailsByEntity = {};

    subDetails.forEach((subDetail) => {
      const consigneeName = subDetail.consignee;
      const storeName = subDetail.storeName?.trim() || "";
      const amount = parseFloat(subDetail.amount || 0);
      const percentage = parseFloat(subDetail.percentage || 0);

      // Extract entity abbreviation from store name if available
      // Otherwise use the parent consignee's entity abbreviation
      let storeEntityAbbr;

      if (storeName.includes(" - ")) {
        // Get entity abbreviation directly from store name
        storeEntityAbbr = storeName.split(" - ")[0].trim();
      } else {
        // Fallback to parent consignee's entity abbreviation
        storeEntityAbbr =
          consigneeToEntityAbbr[consigneeName] ||
          (consigneeName.includes(" - ")
            ? consigneeName.split(" - ")[0].trim()
            : "UNKNOWN");
      }

      // Initialize entity grouping if needed
      if (!subDetailsByEntity[storeEntityAbbr]) {
        subDetailsByEntity[storeEntityAbbr] = [];
      }

      // Add to the entity group
      subDetailsByEntity[storeEntityAbbr].push({
        ...subDetail,
        entityAbbr: storeEntityAbbr,
        amount,
        percentage,
      });
    });

    // Process each entity group
    Object.entries(subDetailsByEntity).forEach(([entityAbbr, details]) => {
      // Initialize entity in master totals if needed
      if (!masterTotals[entityAbbr]) {
        masterTotals[entityAbbr] = {
          totalAmount: 0,
          totalPercentage: 0,
          count: 0,
          items: {}, // Keep items for UI display
          status: "calculated",
          split: entitySplitStatus[entityAbbr] || "", // Include split status
        };
      }

      // Process each subdetail
      details.forEach((subDetail) => {
        const storeName = subDetail.storeName?.trim() || "Unknown Store";
        const amount = subDetail.amount;
        const percentage = subDetail.percentage;

        // Add to entity totals
        masterTotals[entityAbbr].totalAmount += amount;
        masterTotals[entityAbbr].totalPercentage += percentage;
        masterTotals[entityAbbr].count += 1;

        console.log(
          `Adding subdetail ${storeName} to ${entityAbbr}: Amount=${amount}, Percentage=${percentage}`
        );

        // Add item for UI display
        if (!masterTotals[entityAbbr].items[storeName]) {
          masterTotals[entityAbbr].items[storeName] = {
            amount: amount,
            percentage: percentage,
            count: 1,
            parentConsignee: subDetail.consignee,
          };
        } else {
          masterTotals[entityAbbr].items[storeName].amount += amount;
          masterTotals[entityAbbr].items[storeName].percentage += percentage;
          masterTotals[entityAbbr].items[storeName].count += 1;
        }
      });
    });
  }

  // Log the final totals for debugging
  console.log("Final Entity Abbreviation Totals:", masterTotals);

  // Try to fetch existing entity summaries to get their status
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_API}/api/entity-abbreviation-summary/waybill/${waybillNumber}`
    );

    if (response.ok) {
      const existingSummaries = await response.json();
      // Preserve status for existing entities
      existingSummaries.forEach((summary) => {
        if (masterTotals[summary.entityAbbreviation]) {
          masterTotals[summary.entityAbbreviation].status = summary.status;
        }
      });
    }
  } catch (error) {
    console.warn("Could not fetch existing entity statuses:", error);
  }

  // Save the master totals to the database
  try {
    // Convert masterTotals to array format for the API
    // Exclude items when saving to the database as requested
    const summariesToSave = Object.entries(masterTotals).map(
      ([entityAbbreviation, data]) => ({
        waybillNumber,
        entityAbbreviation,
        totalAmount: Number(data.totalAmount.toFixed(2)), // Ensure proper rounding
        totalPercentage: Number(data.totalPercentage.toFixed(2)), // Ensure proper rounding
        status: data.status || "calculated",
        split: data.split || "", // Include split field in saved data
      })
    );

    // Delete existing entries first to ensure clean state
    try {
      await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/entity-abbreviation-summary/waybill/${waybillNumber}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    } catch (deleteError) {
      console.warn("Error deleting existing summaries:", deleteError);
    }

    // Send to the API
    if (summariesToSave.length > 0) {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/entity-abbreviation-summary/waybill/${waybillNumber}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(summariesToSave),
        }
      );

      // We don't throw an error here because the UI can still function without saving
      if (!response.ok) {
        console.warn(
          "Warning: Entity abbreviation summaries may not have been saved properly"
        );
      }
    }
  } catch (error) {
    // Log the error but don't rethrow it since this isn't critical for UI functionality
    console.warn(
      "Warning: Could not save entity abbreviation summaries",
      error
    );
  }

  // Maintain the existing return structure for compatibility
  const consigneeTotals = {};
  const subDetailTotals = {};

  // Convert master totals to the existing structure for backwards compatibility
  Object.entries(masterTotals).forEach(([entityAbbr, data]) => {
    consigneeTotals[entityAbbr] = {
      totalAmount: Number(data.totalAmount.toFixed(2)), // Ensure proper rounding
      totalPercentage: Number(data.totalPercentage.toFixed(2)), // Ensure proper rounding
      count: data.count,
      items: data.items, // Include items for UI display
      type: "consignee",
      status: data.status || "calculated",
      split: data.split || "", // Include split status
    };

    subDetailTotals[entityAbbr] = {
      totalAmount: Number(data.totalAmount.toFixed(2)), // Ensure proper rounding
      totalPercentage: Number(data.totalPercentage.toFixed(2)), // Ensure proper rounding
      count: data.count,
      items: data.items, // Include items for UI display
      type: "subDetail",
      consignees: {},
      status: data.status || "calculated",
      split: data.split || "", // Include split status
    };
  });

  return { consigneeTotals, subDetailTotals, masterTotals };
};

// Add this utility function at the top-level of the file
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

const EntityAbbreviationSummary = ({
  selectedWaybill,
  entityTotals,
  roundEntityPercentages,
  borderColor,
  onResetCalculation,
  totalRate,
  isViewOnly: externalViewOnly = false, // Accept external view-only flag
}) => {
  const toast = useToast();
  const [editingEntity, setEditingEntity] = useState(null);
  const [editedPercentage, setEditedPercentage] = useState("");
  const [editingAmountEntity, setEditingAmountEntity] = useState(null);
  const [editedAmount, setEditedAmount] = useState("");
  const [isFetching, setIsFetching] = useState(false);
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
  const [isConfirmDuplicateModalOpen, setIsConfirmDuplicateModalOpen] =
    useState(false);
  const [plateNumber, setPlateNumber] = useState("");
  const [stubNumber, setStubNumber] = useState("");
  const [subWaybillNumber, setSubWaybillNumber] = useState("");
  const [unusedWaybills, setUnusedWaybills] = useState([]);
  const [selectedNewWaybill, setSelectedNewWaybill] = useState("");
  const [isFetchingWaybills, setIsFetchingWaybills] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isConfirmReverseModalOpen, setIsConfirmReverseModalOpen] =
    useState(false);
  const [isReversingDuplicate, setIsReversingDuplicate] = useState(false);
  const [duplicateStatus, setDuplicateStatus] = useState({
    status: "",
    reference: "",
    viewOnly: false,
  });
  const [entitySummaries, setEntitySummaries] = useState({});
  const [tripId, setTripId] = useState(null);
  const [isTripDetailModalOpen, setIsTripDetailModalOpen] = useState(false);
  const [isLoadingTripId, setIsLoadingTripId] = useState(false);
  const [hasTripDetail, setHasTripDetail] = useState(false);
  const [selectedEntityToDirectDuplicate, setSelectedEntityToDirectDuplicate] =
    useState(null);
  const [
    isConfirmDirectDuplicateModalOpen,
    setIsConfirmDirectDuplicateModalOpen,
  ] = useState(false);
  const editRef = useRef(null);
  const [isViewOnly, setIsViewOnly] = useState(externalViewOnly); // Initialize with external prop
  const [selectedEntityToDelete, setSelectedEntityToDelete] = useState(null);
  const [isConfirmDeleteModalOpen, setIsConfirmDeleteModalOpen] =
    useState(false);
  const deleteConfirmRef = useRef();

  // Fetch entity summaries when the component loads
  useEffect(() => {
    const fetchEntitySummaries = async () => {
      if (!selectedWaybill) return;

      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_API}/api/entity-abbreviation-summary/waybill/${selectedWaybill}`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch entity summaries");
        }

        const data = await response.json();

        // Convert to object with entityAbbreviation as key
        const summariesByEntity = {};
        data.forEach((summary) => {
          summariesByEntity[summary.entityAbbreviation] = summary;
        });

        setEntitySummaries(summariesByEntity);
      } catch (error) {
        console.error("Error fetching entity summaries:", error);
      }
    };

    fetchEntitySummaries();
  }, [selectedWaybill, onResetCalculation]);

  // Check duplicate status when waybill changes or externalViewOnly changes
  useEffect(() => {
    if (selectedWaybill) {
      checkDuplicateStatus();
    }

    // Always respect the external view-only flag (e.g., from BILLED status)
    if (externalViewOnly !== isViewOnly) {
      setIsViewOnly(externalViewOnly);
    }
  }, [selectedWaybill, externalViewOnly]);

  // Function to check if waybill is a main or duplicate
  const checkDuplicateStatus = async () => {
    try {
      if (!selectedWaybill) return;

      console.log(`Checking duplicate status for waybill ${selectedWaybill}`);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/entity-abbreviation-summary/duplicate-status/${selectedWaybill}`
      );

      if (!response.ok) {
        console.error(
          `Error fetching duplicate status: ${response.statusText}`
        );
        return;
      }

      const { duplicated, duplicateReference, viewOnly } =
        await response.json();
      console.log(
        `Duplicate status for ${selectedWaybill}: ${duplicated}, reference: ${duplicateReference}`
      );

      setDuplicateStatus({
        status: duplicated,
        reference: duplicateReference,
        viewOnly: viewOnly === true,
      });

      // If this is a duplicated waybill, disable editing functionality
      setIsViewOnly(duplicated === "duplicate" || viewOnly === true);
    } catch (error) {
      console.error("Error checking duplicate status:", error);
    }
  };

  // Handle starting edit on double click for percentage
  const handleDoubleClickPercentage = (entityAbbr, currentPercentage) => {
    setEditingEntity(entityAbbr);
    setEditedPercentage(currentPercentage);
    // Clear amount editing state
    setEditingAmountEntity(null);
    setEditedAmount("");
  };

  // Handle starting edit on double click for amount
  const handleDoubleClickAmount = (entityAbbr, currentAmount) => {
    setEditingAmountEntity(entityAbbr);
    setEditedAmount(currentAmount);
    // Clear percentage editing state
    setEditingEntity(null);
    setEditedPercentage("");
  };

  // Handle input change for edited percentage
  const handlePercentageChange = (e) => {
    setEditedPercentage(e.target.value);
  };

  // Handle input change for edited amount
  const handleAmountChange = (e) => {
    setEditedAmount(e.target.value);
  };

  // Handle saving the edited percentage
  const handleSavePercentage = async () => {
    try {
      if (!editingEntity) return;

      const numValue = parseFloat(editedPercentage);

      // Validate the input
      if (isNaN(numValue)) {
        toast({
          title: "Invalid value",
          description: "Please enter a valid number",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
        return;
      }

      // Get the current entity details to preserve subWaybillNumber
      const entityResponse = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/entity-abbreviation-summary/waybill/${selectedWaybill}`
      );

      if (!entityResponse.ok) {
        throw new Error("Failed to fetch entity details");
      }

      const entities = await entityResponse.json();
      const currentEntity = entities.find(
        (e) => e.entityAbbreviation === editingEntity
      );

      if (!currentEntity) {
        throw new Error(`Entity ${editingEntity} not found`);
      }

      // Calculate new amount based on percentage
      const newAmount = (numValue / 100) * totalRate;
      const roundedAmount = Number(newAmount.toFixed(2));

      // Update entity with new percentage and amount, preserving subWaybillNumber
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/entity-abbreviation-summary`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            waybillNumber: selectedWaybill,
            entityAbbreviation: editingEntity,
            totalAmount: roundedAmount,
            totalPercentage: numValue,
            status: "rounded", // Mark as rounded since we're manually setting it
            subWaybillNumber: currentEntity.subWaybillNumber || "", // Preserve subWaybillNumber
            split: currentEntity.split || "",
            payload: currentEntity.payload || "",
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update entity percentage");
      }

      // Update entity status to "rounded"
      await updateEntitySummaryStatus(
        selectedWaybill,
        "rounded",
        editingEntity
      );

      toast({
        title: "Success",
        description: `Percentage updated for ${editingEntity}`,
        status: "success",
        duration: 2000,
        isClosable: true,
      });

      // Reset editing state
      setEditingEntity(null);
      setEditedPercentage("");

      // Refresh calculations
      if (onResetCalculation) {
        await onResetCalculation();
      }
    } catch (error) {
      console.error("Error saving edited percentage:", error);
      toast({
        title: "Error",
        description: "Failed to update percentage: " + error.message,
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  // Handle saving the edited amount
  const handleSaveAmount = async () => {
    try {
      if (!editingAmountEntity) return;

      const numValue = parseFloat(editedAmount.replace(/,/g, ""));

      // Validate the input
      if (isNaN(numValue)) {
        toast({
          title: "Invalid value",
          description: "Please enter a valid number",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
        return;
      }

      // Get the current entity details to preserve subWaybillNumber
      const entityResponse = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/entity-abbreviation-summary/waybill/${selectedWaybill}`
      );

      if (!entityResponse.ok) {
        throw new Error("Failed to fetch entity details");
      }

      const entities = await entityResponse.json();
      const currentEntity = entities.find(
        (e) => e.entityAbbreviation === editingAmountEntity
      );

      if (!currentEntity) {
        throw new Error(`Entity ${editingAmountEntity} not found`);
      }

      // Calculate new percentage based on amount
      const newPercentage = (numValue / totalRate) * 100;
      const roundedPercentage = Number(newPercentage.toFixed(2));

      // Update entity with new amount and percentage, preserving subWaybillNumber
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/entity-abbreviation-summary`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            waybillNumber: selectedWaybill,
            entityAbbreviation: editingAmountEntity,
            totalAmount: numValue,
            totalPercentage: roundedPercentage,
            status: "rounded", // Mark as rounded since we're manually setting it
            subWaybillNumber: currentEntity.subWaybillNumber || "", // Preserve subWaybillNumber
            split: currentEntity.split || "",
            payload: currentEntity.payload || "",
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update entity amount");
      }

      // Update entity status to "rounded"
      await updateEntitySummaryStatus(
        selectedWaybill,
        "rounded",
        editingAmountEntity
      );

      toast({
        title: "Success",
        description: `Amount updated for ${editingAmountEntity}`,
        status: "success",
        duration: 2000,
        isClosable: true,
      });

      // Reset editing state
      setEditingAmountEntity(null);
      setEditedAmount("");

      // Refresh calculations
      if (onResetCalculation) {
        await onResetCalculation();
      }
    } catch (error) {
      console.error("Error saving edited amount:", error);
      toast({
        title: "Error",
        description: "Failed to update amount: " + error.message,
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  // Handle canceling the edit
  const handleCancelEdit = () => {
    setEditingEntity(null);
    setEditedPercentage("");
    setEditingAmountEntity(null);
    setEditedAmount("");
  };

  // Handle key press events for the input
  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      if (editingEntity) {
        handleSavePercentage();
      } else if (editingAmountEntity) {
        handleSaveAmount();
      }
    } else if (e.key === "Escape") {
      handleCancelEdit();
    }
  };

  // Enhanced roundPercentages handler that also updates status and calculates amount
  const handleRoundPercentages = async () => {
    try {
      // First execute the original roundEntityPercentages function
      await roundEntityPercentages();

      // Then update the status of all entities to "rounded"
      const result = await updateEntitySummaryStatus(
        selectedWaybill,
        "rounded"
      );

      // Fetch the current entities after rounding
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/entity-abbreviation-summary/waybill/${selectedWaybill}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch entities after rounding");
      }

      const entities = await response.json();

      // Update each entity with the proper total amount calculation
      for (const entity of entities) {
        // Calculate total amount based on rounded percentage and total rate
        const roundedAmount = (entity.totalPercentage / 100) * totalRate;
        const fixedAmount = Number(roundedAmount.toFixed(2)); // Round to 2 decimal places

        // Update the entity with new amount - IMPORTANT: preserve subWaybillNumber
        await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_API}/api/entity-abbreviation-summary`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              waybillNumber: selectedWaybill,
              entityAbbreviation: entity.entityAbbreviation,
              totalAmount: fixedAmount,
              totalPercentage: entity.totalPercentage,
              status: "rounded",
              subWaybillNumber: entity.subWaybillNumber || "", // Preserve subWaybillNumber
              split: entity.split || "",
              payload: entity.payload || "",
            }),
          }
        );

        // Also round the sub-details for this entity
        try {
          // Use the same endpoint for rounding single entity that now handles sub-details
          await fetch(
            `${process.env.NEXT_PUBLIC_BACKEND_API}/api/entity-abbreviation-summary/roundSingle/${selectedWaybill}/${entity.entityAbbreviation}`,
            {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ totalRate }), // Include totalRate for amount calculation
            }
          );

          console.log(
            `Rounded sub-details for entity ${entity.entityAbbreviation}`
          );
        } catch (subDetailError) {
          console.error(
            `Error rounding sub-details for ${entity.entityAbbreviation}:`,
            subDetailError
          );
          // Continue with next entity, don't fail the whole operation
        }
      }

      toast({
        title: "Success",
        description:
          "Percentages rounded and amounts calculated correctly for all entities and sub-details",
        status: "success",
        duration: 3000,
        isClosable: true,
      });

      // Refresh to show updated values
      if (onResetCalculation) {
        await onResetCalculation();
      }
    } catch (error) {
      console.error("Error during rounding process:", error);
      toast({
        title: "Error",
        description: "Failed to update entity status: " + error.message,
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  // New handler to reset entity status to calculated
  const handleResetCalculation = async () => {
    try {
      console.log(
        "Resetting entity statuses to calculated for waybill:",
        selectedWaybill
      );

      // Update the status of all entities to "calculated"
      const result = await updateEntitySummaryStatus(
        selectedWaybill,
        "calculated"
      );
      console.log("Status update result:", result);

      toast({
        title: "Success",
        description: "Entity statuses reset to calculated",
        status: "success",
        duration: 3000,
        isClosable: true,
      });

      // Call the supplied refresh function if provided
      if (onResetCalculation) {
        console.log("Calling refresh function to update calculations...");
        await onResetCalculation();
      }
    } catch (error) {
      console.error("Error during reset process:", error);
      toast({
        title: "Error",
        description: "Failed to reset entity status: " + error.message,
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  // Handler for rounding a single entity
  const handleRoundEntityPercentage = async (entityAbbr) => {
    try {
      console.log(`Rounding percentages for entity: ${entityAbbr}`);

      // Get the existing entity details first to preserve subWaybillNumber
      const entityResponse = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/entity-abbreviation-summary/waybill/${selectedWaybill}`
      );

      if (!entityResponse.ok) {
        throw new Error("Failed to fetch entity details");
      }

      const entities = await entityResponse.json();
      const currentEntity = entities.find(
        (e) => e.entityAbbreviation === entityAbbr
      );

      if (!currentEntity) {
        throw new Error(`Entity ${entityAbbr} not found`);
      }

      // Make a direct API call to round just this entity
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/entity-abbreviation-summary/roundSingle/${selectedWaybill}/${entityAbbr}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ totalRate }), // Include totalRate in the request
        }
      );

      if (!response.ok) {
        throw new Error("Failed to round entity percentage");
      }

      const result = await response.json();
      console.log("Round single entity result:", result);

      // No need to calculate manually as the backend now does it
      // Get the calculated values from the result
      const roundedPercentage = result.roundedPercentage;
      const fixedAmount = result.totalAmount;

      // Update the entity with the correct total amount - still needed for status
      // IMPORTANT: Include subWaybillNumber to preserve it
      await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/entity-abbreviation-summary`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            waybillNumber: selectedWaybill,
            entityAbbreviation: entityAbbr,
            totalAmount: fixedAmount,
            totalPercentage: roundedPercentage,
            status: "rounded",
            subWaybillNumber: currentEntity.subWaybillNumber || "", // Preserve subWaybillNumber
            split: currentEntity.split || "",
            payload: currentEntity.payload || "",
          }),
        }
      );

      // Then update only this entity's status to "rounded"
      await updateEntitySummaryStatus(selectedWaybill, "rounded", entityAbbr);

      toast({
        title: "Success",
        description: `Percentages rounded for ${entityAbbr} and amount correctly calculated`,
        status: "success",
        duration: 2000,
        isClosable: true,
      });

      // Call the refresh function to update the UI
      if (onResetCalculation) {
        await onResetCalculation();
      }
    } catch (error) {
      console.error(`Error rounding entity ${entityAbbr}:`, error);
      toast({
        title: "Error",
        description: "Failed to round entity percentages: " + error.message,
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  // Handler for resetting a single entity
  const handleResetEntityCalculation = async (entityAbbr) => {
    try {
      console.log(`Resetting calculation for entity: ${entityAbbr}`);

      // First call an API endpoint to reset just this entity's calculation
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/entity-abbreviation-summary/resetSingle/${selectedWaybill}/${entityAbbr}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to reset entity calculation");
      }

      const result = await response.json();
      console.log("Reset single entity result:", result);

      toast({
        title: "Success",
        description: `Calculation reset for ${entityAbbr}`,
        status: "success",
        duration: 2000,
        isClosable: true,
      });

      // Call the refresh function to update the UI
      // This is necessary to refresh the entity totals display
      if (onResetCalculation) {
        await onResetCalculation();
      }
    } catch (error) {
      console.error(`Error resetting entity ${entityAbbr}:`, error);
      toast({
        title: "Error",
        description: `Failed to reset calculation for ${entityAbbr}: ${error.message}`,
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  // Open duplicate confirmation modal
  const handleDuplicateButtonClick = () => {
    if (!selectedWaybill) {
      toast({
        title: "Error",
        description: "No waybill selected to duplicate",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    console.log(`Duplicate button clicked for waybill: ${selectedWaybill}`);
    toast({
      title: "Fetching sub waybill numbers",
      description: `Attempting to fetch sub waybill numbers for waybill ${selectedWaybill}`,
      status: "info",
      duration: 3000,
      isClosable: true,
    });

    setIsDuplicateModalOpen(true);
    setPlateNumber("");
    setStubNumber("");
    setSubWaybillNumber("");
    setSelectedNewWaybill("");
    // Reset any previously fetched waybills
    setUnusedWaybills([]);

    // Directly call fetchSubWaybillNumbers here
    fetchSubWaybillNumbers(selectedWaybill).catch((error) => {
      console.error("Error in handleDuplicateButtonClick:", error);
      toast({
        title: "Error",
        description: `Failed to fetch sub waybill numbers: ${error.message}`,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    });
  };

  const fetchSubWaybillNumbers = async (waybillNumber) => {
    try {
      setIsFetchingWaybills(true);
      console.log(`Fetching sub waybill numbers for waybill: ${waybillNumber}`);

      // Use the new backend endpoint to fetch sub waybill numbers
      const apiUrl = `${process.env.NEXT_PUBLIC_BACKEND_API}/api/entity-abbreviation-summary/sub-waybill-numbers/${waybillNumber}`;
      console.log("Calling API endpoint:", apiUrl);

      toast({
        title: "API Call",
        description: `Calling: ${apiUrl}`,
        status: "info",
        duration: 2000,
        isClosable: true,
      });

      const response = await fetch(apiUrl);
      console.log("API response status:", response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("API error response:", errorText);
        throw new Error(
          `Server responded with status ${response.status}: ${errorText || response.statusText}`
        );
      }

      const data = await response.json();
      console.log("Sub waybill numbers from server:", data);

      if (
        data.success &&
        data.subWaybillNumbers &&
        data.subWaybillNumbers.length > 0
      ) {
        // Format the sub waybill numbers for the dropdown
        setUnusedWaybills(
          data.subWaybillNumbers.map((num) => ({ waybillNumber: num }))
        );

        const message = `Found ${data.count} sub waybill numbers: ${data.subWaybillNumbers.join(", ")}`;
        console.log(message);

        toast({
          title: "Success",
          description: message,
          status: "success",
          duration: 3000,
          isClosable: true,
        });
      } else {
        console.log("No sub waybill numbers found on the server");

        toast({
          title: "No Data Found",
          description: "No sub waybill numbers found for this waybill",
          status: "warning",
          duration: 3000,
          isClosable: true,
        });

        setUnusedWaybills([]);
      }

      setIsFetchingWaybills(false);
    } catch (error) {
      console.error("Error fetching subWaybillNumbers:", error);

      // Detailed error toast
      toast({
        title: "Error Fetching Data",
        description: `Failed to fetch sub waybill numbers: ${error.message}`,
        status: "error",
        duration: 5000,
        isClosable: true,
      });

      setUnusedWaybills([]);
      setIsFetchingWaybills(false);

      // Re-throw the error for the caller to handle
      throw error;
    }
  };

  const handleOpenDuplicateModal = async () => {
    try {
      if (!selectedWaybill) {
        toast({
          title: "Error",
          description: "No waybill selected",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
        return;
      }

      setIsFetching(true);

      // Check if there are any entity summaries to duplicate
      const summariesResponse = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/entity-abbreviation-summary/waybill/${selectedWaybill}`
      );
      const summaries = await summariesResponse.json();

      if (!summariesResponse.ok || !summaries || summaries.length === 0) {
        toast({
          title: "Error",
          description: "No entity summaries to duplicate",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
        setIsFetching(false);
        return;
      }

      // Note: We're no longer calling fetchSubWaybillNumbers here
      // as it's directly called from handleDuplicateButtonClick

      setIsFetching(false);
    } catch (error) {
      console.error("Error preparing to duplicate:", error);
      toast({
        title: "Error",
        description: "Failed to prepare duplicate operation",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      setIsFetching(false);
    }
  };

  const handlePlateNumberChange = async (e) => {
    const plateNum = e.target.value;
    setPlateNumber(plateNum);

    // Reset related fields when plate number changes
    setSelectedNewWaybill("");

    if (plateNum.length >= 5) {
      await fetchWaybillsByPlateNumber(plateNum);
    } else {
      // Clear waybills list if input is too short
      setUnusedWaybills([]);
    }
  };

  const fetchWaybillsByPlateNumber = async (plateNum) => {
    try {
      setIsFetchingWaybills(true);

      // Fetch waybills for this plate number
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/waybill/by-plate/${plateNum}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch waybills");
      }

      const waybills = await response.json();

      // Filter out waybills that already have entities
      const filteredWaybills = [];

      for (const waybill of waybills) {
        // Check if this waybill already has entity summaries
        const summaryResponse = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_API}/api/entity-abbreviation-summary/waybill/${waybill.waybillNumber}`
        );
        const summaries = await summaryResponse.json();

        // Only include waybills that don't have entity summaries yet
        if (!summaryResponse.ok || !summaries || summaries.length === 0) {
          filteredWaybills.push(waybill);
        }
      }

      setUnusedWaybills(filteredWaybills);
      setIsFetchingWaybills(false);
    } catch (error) {
      console.error("Error fetching waybills:", error);
      toast({
        title: "Error",
        description: "Failed to fetch waybills for this plate number",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      setUnusedWaybills([]);
      setIsFetchingWaybills(false);
    }
  };

  const handleDuplicateEntitySummaries = async () => {
    try {
      if (!selectedWaybill) {
        toast({
          title: "Error",
          description: "No source waybill selected",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
        return;
      }
      if (!selectedNewWaybill) {
        toast({
          title: "Error",
          description: "Please select a sub waybill number",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
        return;
      }
      setIsLoading(true);
      console.log(
        `Duplicating entities from waybill ${selectedWaybill} with subWaybillNumber ${selectedNewWaybill}`
      );

      // 1. Fetch shipper information for the source waybill
      const shipperResponse = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/shipperInfo/${selectedWaybill}`
      );

      if (shipperResponse.ok) {
        const sourceShipperInfo = await shipperResponse.json();
        console.log("Source shipper information:", sourceShipperInfo);

        // Create a clean version of the shipper info for duplication
        const { _id, __v, createdAt, updatedAt, ...shipperDataToKeep } =
          sourceShipperInfo;

        // Duplicate shipper information with the new waybill number
        const duplicatedShipperInfo = {
          ...shipperDataToKeep,
          waybillNumber: selectedNewWaybill,
          duplicated: "duplicate",
          duplicateReference: selectedWaybill,
          viewOnly: true, // Add explicit view-only flag
        };

        console.log("Duplicating shipper info:", duplicatedShipperInfo);

        // Create new shipper info record
        const shipperCreateResponse = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_API}/api/shipperInfo`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(duplicatedShipperInfo),
          }
        );

        if (shipperCreateResponse.ok) {
          console.log(
            `Successfully duplicated shipper information to waybill ${selectedNewWaybill}`
          );
        } else {
          console.error(
            "Failed to duplicate shipper information:",
            await shipperCreateResponse.text()
          );
        }
      } else {
        console.log(
          `No shipper information found for waybill ${selectedWaybill}`
        );
      }

      // 2. Fetch entity summaries to duplicate
      const sourceResponse = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/entity-abbreviation-summary/waybill/${selectedWaybill}`
      );

      if (!sourceResponse.ok) {
        throw new Error("Failed to fetch source entity summaries");
      }

      const allSourceSummaries = await sourceResponse.json();
      console.log("All source entity summaries:", allSourceSummaries);

      // Filter to only get entity summaries with the selected subWaybillNumber
      const sourceSummaries = allSourceSummaries.filter(
        (summary) => summary.subWaybillNumber === selectedNewWaybill
      );

      console.log(
        `Found ${sourceSummaries.length} entity summaries with subWaybillNumber ${selectedNewWaybill}`
      );

      if (!sourceSummaries || sourceSummaries.length === 0) {
        toast({
          title: "Warning",
          description: `No entity summaries found with sub waybill number ${selectedNewWaybill}`,
          status: "warning",
          duration: 3000,
          isClosable: true,
        });
        setIsLoading(false);
        return;
      }

      // Instead of duplicating summaries one by one, call the new backend endpoint:
      await duplicateEntitiesAndHighestRate(selectedWaybill, [
        selectedNewWaybill,
      ]);

      toast({
        title: "Success",
        description: `Successfully duplicated data to waybill ${selectedNewWaybill}`,
        status: "success",
        duration: 3000,
        isClosable: true,
      });

      setIsLoading(false);
      handleModalClose();
    } catch (error) {
      console.error("Error duplicating data:", error);
      toast({
        title: "Error",
        description: "Failed to duplicate: " + error.message,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      setIsLoading(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle modal close by refreshing duplicate status
  const handleModalClose = () => {
    setIsDuplicateModalOpen(false);
    // Re-check duplicate status when modal is closed
    checkDuplicateStatus();
  };

  // Open reverse duplicate confirmation modal
  const handleReverseDuplicateButtonClick = () => {
    setIsConfirmReverseModalOpen(true);
  };

  // Handle reversing duplicate functionality
  const handleReverseDuplicate = async () => {
    try {
      if (!selectedWaybill) {
        toast({
          title: "Error",
          description: "No waybill selected",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
        return;
      }

      // Check if this is actually a duplicate
      if (duplicateStatus.status !== "duplicate") {
        toast({
          title: "Error",
          description: "This waybill is not a duplicate",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
        return;
      }

      // Get the original waybill number
      const originalWaybillNumber = duplicateStatus.reference;

      if (!originalWaybillNumber) {
        toast({
          title: "Error",
          description: "Original waybill reference not found",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
        return;
      }

      setIsLoading(true);

      // 1. Reset original waybill's duplicate status
      // IMPORTANT: This does NOT change the waybill status to "UNUSED"
      await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/entity-abbreviation-summary/reset-original-duplicate/${originalWaybillNumber}`,
        {
          method: "PUT",
        }
      );

      // 2. Delete all entity summaries for this duplicate
      const entityResult = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/entity-abbreviation-summary/waybill/${selectedWaybill}`,
        {
          method: "DELETE",
        }
      );

      console.log(
        "Entity summaries deletion result:",
        await entityResult.json().catch(() => ({ message: "No JSON response" }))
      );

      // 3. Delete all consignees for this duplicate using the dedicated endpoint
      try {
        const consigneeResult = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_API}/api/consigneeInfo/waybill/${selectedWaybill}/all`,
          {
            method: "DELETE",
          }
        );

        const consigneeData = await consigneeResult
          .json()
          .catch(() => ({ message: "No JSON response" }));
        console.log("Consignee deletion result:", consigneeData);

        if (!consigneeResult.ok) {
          console.error("Error deleting consignees:", consigneeData);
        }
      } catch (error) {
        console.error("Error deleting duplicate consignees:", error);
        // Continue even if this fails
      }

      // NOTE: Step 4 (Delete shipper info) has been removed to preserve shipper info when reversing duplicates
      // NOTE: We also do not change waybill status to "UNUSED" - leaving it as "USED"

      toast({
        title: "Success",
        description: `Duplicate reversed. Returning to original waybill ${originalWaybillNumber}`,
        status: "success",
        duration: 3000,
        isClosable: true,
      });

      setIsLoading(false);

      // Navigate to the original waybill
      window.location.href = `/waybillManagement/${originalWaybillNumber}`;
    } catch (error) {
      console.error("Error reversing duplicate:", error);
      toast({
        title: "Error",
        description: "Failed to reverse duplicate: " + error.message,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      setIsLoading(false);
    }
  };

  // Function to get the trip ID for a waybill
  const getTripIdForWaybill = async () => {
    if (!selectedWaybill) return;

    try {
      setIsLoadingTripId(true);

      // Get the trip details directly - we already know it exists
      const tripDetail = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/tripDetails`
      );

      if (!tripDetail.ok) {
        throw new Error("Failed to fetch trip details");
      }

      const tripDetails = await tripDetail.json();
      const foundTripDetail = tripDetails.find(
        (detail) => detail.waybillNumber === selectedWaybill
      );

      if (foundTripDetail) {
        setTripId(foundTripDetail.tripID);
        return foundTripDetail.tripID;
      } else {
        toast({
          title: "Trip Detail Not Found",
          description: "No trip detail found for this waybill.",
          status: "warning",
          duration: 3000,
          isClosable: true,
        });
        setHasTripDetail(false);
        return null;
      }
    } catch (error) {
      console.error("Error fetching trip ID:", error);
      toast({
        title: "Error",
        description: "Failed to fetch trip details",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return null;
    } finally {
      setIsLoadingTripId(false);
    }
  };

  // Handle opening trip detail modal
  const handleTripDetailClick = async () => {
    const id = await getTripIdForWaybill();
    if (id) {
      setIsTripDetailModalOpen(true);
    }
  };

  // Check if there's a trip for this waybill when the waybill changes
  useEffect(() => {
    const checkForTrip = async () => {
      if (!selectedWaybill) {
        setHasTripDetail(false);
        return;
      }

      try {
        const tripDetail = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_API}/api/tripDetails`
        );

        if (!tripDetail.ok) {
          setHasTripDetail(false);
          return;
        }

        const tripDetails = await tripDetail.json();
        const foundTripDetail = tripDetails.find(
          (detail) => detail.waybillNumber === selectedWaybill
        );

        setHasTripDetail(!!foundTripDetail);
      } catch (error) {
        console.error("Error checking for trip:", error);
        setHasTripDetail(false);
      }
    };

    checkForTrip();
  }, [selectedWaybill]);

  // Handle direct duplication from entity's sub waybill number
  const handleDirectDuplicateClick = (entityAbbr, event) => {
    // Stop event propagation to prevent other handlers from firing
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    const entity = entitySummaries[entityAbbr];
    if (!entity || !entity.subWaybillNumber) {
      toast({
        title: "Error",
        description: "No sub waybill number found for this entity",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setSelectedEntityToDirectDuplicate(entity);
    setSelectedNewWaybill(entity.subWaybillNumber);
    setIsConfirmDirectDuplicateModalOpen(true);
  };

  // Cleanup target waybill before duplication
  const cleanupTargetWaybill = async (targetWaybillNumber) => {
    try {
      console.log(
        `Cleaning up target waybill ${targetWaybillNumber} before duplication`
      );
      setIsLoading(true);

      // 1. Delete all entity summaries for the target waybill
      const entityResult = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/entity-abbreviation-summary/waybill/${targetWaybillNumber}`,
        {
          method: "DELETE",
        }
      );

      console.log(
        "Entity summaries deletion result:",
        await entityResult.json().catch(() => ({ message: "No JSON response" }))
      );

      // 2. Delete all consignees for the target waybill
      try {
        const consigneeResult = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_API}/api/consigneeInfo/waybill/${targetWaybillNumber}/all`,
          {
            method: "DELETE",
          }
        );

        const consigneeData = await consigneeResult
          .json()
          .catch(() => ({ message: "No JSON response" }));
        console.log("Consignee deletion result:", consigneeData);

        if (!consigneeResult.ok) {
          console.error("Error deleting consignees:", consigneeData);
        }
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
      });
      return false;
    }
  };

  // Handle the complete direct duplication process
  const handleDirectDuplicateProcess = async () => {
    if (!selectedEntityToDirectDuplicate || !selectedNewWaybill) {
      toast({
        title: "Error",
        description: "Missing entity or sub waybill number",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      setIsLoading(true);

      // First clean up any existing data in the target waybill
      await cleanupTargetWaybill(selectedNewWaybill);

      // Then proceed with normal duplication
      await handleDuplicateEntitySummaries();

      setIsConfirmDirectDuplicateModalOpen(false);
      setSelectedEntityToDirectDuplicate(null);
      setIsLoading(false);

      toast({
        title: "Success",
        description: `Successfully duplicated to waybill ${selectedNewWaybill}`,
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error("Error during direct duplication process:", error);
      toast({
        title: "Error",
        description: `Failed to complete duplication: ${error.message}`,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      setIsLoading(false);
    }
  };

  // Handle confirmation of direct duplication
  const handleConfirmDirectDuplicate = () => {
    handleDirectDuplicateProcess().catch((error) => {
      console.error("Unhandled error during direct duplication:", error);
      toast({
        title: "Error",
        description: `An unexpected error occurred: ${error.message}`,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      setIsLoading(false);
    });
  };

  // Handle entity deletion
  const handleDeleteEntity = async (entityAbbr) => {
    setSelectedEntityToDelete(entityAbbr);
    setIsConfirmDeleteModalOpen(true);
  };

  // Handle confirmed deletion
  const handleConfirmDelete = async () => {
    try {
      if (!selectedEntityToDelete || !selectedWaybill) return;

      setIsLoading(true);

      // Call the API to delete the entity
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/entity-abbreviation-summary`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            waybillNumber: selectedWaybill,
            entityAbbreviation: selectedEntityToDelete,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete entity");
      }

      // Success message
      toast({
        title: "Entity deleted",
        description: `Successfully deleted entity ${selectedEntityToDelete}`,
        status: "success",
        duration: 3000,
        isClosable: true,
      });

      // Close modal and reset state
      setIsConfirmDeleteModalOpen(false);
      setSelectedEntityToDelete(null);

      // Refresh entity summaries by triggering a reset calculation
      if (onResetCalculation) {
        onResetCalculation();
      }
    } catch (error) {
      console.error("Error deleting entity:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete entity",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {selectedWaybill && (
        <Box
          width="full"
          mb={6}
          bg="white"
          p={6}
          borderRadius="xl"
          boxShadow="md"
          borderWidth="1px"
          borderColor={borderColor}
        >
          {console.log(
            `Rendering with duplicateStatus: "${duplicateStatus.status}"`
          )}
          <Flex align="center" justify="space-between" mb={4}>
            <Flex align="center">
              <Icon as={FiBarChart2} color="gray.600" mr={3} />
              <Text fontSize="lg" fontWeight="bold" color="gray.700" mr={3}>
                Entity Abbreviation Summary
              </Text>
              {!isViewOnly && (
                <>
                  {/* <Button
                    size="xs"
                    colorScheme="white"
                    bgColor="maroon"
                    color="white"
                    leftIcon={<Icon as={FiPercent} boxSize="3" />}
                    onClick={handleRoundPercentages}
                    title="Round percentages to whole numbers and mark all as rounded"
                    mr={2}
                  >
                    Round All
                  </Button> */}
                  {/* <Button
                    size="xs"
                    colorScheme="white"
                    bgColor="blue.600"
                    color="white"
                    leftIcon={<Icon as={FiBarChart2} boxSize="3" />}
                    onClick={handleResetCalculation}
                    title="Reset all to calculated status and update amounts"
                    mr={2}
                  >
                    Reset All
                  </Button> */}
                  {hasTripDetail && (
                    <Button
                      size="xs"
                      colorScheme="white"
                      bgColor="green.600"
                      color="white"
                      leftIcon={<Icon as={FiTruck} boxSize="3" />}
                      onClick={handleTripDetailClick}
                      title="View trip details for this waybill"
                      isLoading={isLoadingTripId}
                    >
                      Trip Detail
                    </Button>
                  )}
                </>
              )}
            </Flex>
            <Flex>
              {/* Only show reverse duplicate if this IS a duplicate waybill */}
              {duplicateStatus.status === "duplicate" && !isViewOnly && (
                <Button
                  size="sm"
                  colorScheme="red"
                  leftIcon={<Icon as={FiRotateCcw} />}
                  onClick={handleReverseDuplicateButtonClick}
                  title="Reverse duplication"
                >
                  Reverse Duplicate
                </Button>
              )}
            </Flex>
          </Flex>
          {/* Add label to show duplicate status */}
          {duplicateStatus.status && (
            <Box mb={4}>
              <Badge
                colorScheme={
                  duplicateStatus.status === "main"
                    ? "green"
                    : duplicateStatus.status === "duplicate"
                      ? "orange"
                      : "gray"
                }
                fontSize="md"
                px={2}
                py={1}
                borderRadius="md"
              >
                {duplicateStatus.status === "main"
                  ? "Original Waybill"
                  : duplicateStatus.status === "duplicate"
                    ? "Duplicated Waybill"
                    : ""}
                {duplicateStatus.reference &&
                  ` (${duplicateStatus.status === "main" ? "Duplicated to" : "Copied from"}: ${duplicateStatus.reference})`}
              </Badge>
            </Box>
          )}

          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
            {Object.entries(entityTotals.consigneeTotals).map(
              ([entityAbbr, data]) => {
                // Filter items to exclude parent consignees that have sub-details
                const filteredItems = {};
                const parentConsigneesWithSubDetails = new Set();

                // First identify parent consignees that have sub-details
                Object.entries(data.items).forEach(([itemName, itemData]) => {
                  if (itemData.parentConsignee) {
                    // This is a sub-detail item, add its parent to the set
                    parentConsigneesWithSubDetails.add(
                      itemData.parentConsignee
                    );
                  }
                });

                // Now filter out parent consignees from items
                Object.entries(data.items).forEach(([itemName, itemData]) => {
                  // Only include items that:
                  // 1. Have a parentConsignee property (meaning they are sub-details)
                  // 2. OR don't have their name in the parent consignees set (not a parent with sub-details)
                  if (
                    itemData.parentConsignee ||
                    !parentConsigneesWithSubDetails.has(itemName)
                  ) {
                    filteredItems[itemName] = itemData;
                  }
                });

                // Count filtered items
                const filteredItemCount = Object.keys(filteredItems).length;

                // Check if this entity is marked as rounded
                const isRounded = data.status === "rounded";
                // Check if this entity is marked as split
                const isSplit = data.split === "split";

                return (
                  <Box
                    key={`consignee-${entityAbbr}`}
                    p={4}
                    borderRadius="lg"
                    bg="white"
                    borderWidth="1px"
                    borderColor={
                      isRounded
                        ? "teal.200"
                        : isSplit
                          ? "purple.200"
                          : "gray.200"
                    }
                    transition="all 0.2s"
                    position="relative"
                    overflow="hidden"
                  >
                    {isRounded && (
                      <Box
                        position="absolute"
                        top={0}
                        right={0}
                        bg="teal.100"
                        px={2}
                        py={1}
                        borderBottomLeftRadius="md"
                        fontSize="xs"
                        fontWeight="semibold"
                        color="teal.800"
                      >
                        Rounded
                      </Box>
                    )}

                    {isSplit && (
                      <Box
                        position="absolute"
                        top={isRounded ? 6 : 0}
                        right={0}
                        bg="purple.100"
                        px={2}
                        py={1}
                        borderBottomLeftRadius="md"
                        fontSize="xs"
                        fontWeight="semibold"
                        color="purple.800"
                      >
                        Split
                      </Box>
                    )}
                    <Flex justify="space-between" align="center" mb={3}>
                      <Flex direction="column">
                        <Badge
                          colorScheme={
                            isRounded ? "teal" : isSplit ? "purple" : "blue"
                          }
                          fontSize="md"
                          px={3}
                          py={1}
                          borderRadius="full"
                          mb={1}
                        >
                          {entityAbbr}
                        </Badge>

                        {/* Display subWaybillNumber if available */}
                        {entitySummaries[entityAbbr]?.subWaybillNumber && (
                          <Badge
                            fontSize="xs"
                            fontWeight="bold"
                            colorScheme="orange"
                            variant="subtle"
                            borderRadius="sm"
                            px={2}
                            py={0.5}
                            mt={1}
                          >
                            Sub WB:{" "}
                            {entitySummaries[entityAbbr].subWaybillNumber}
                          </Badge>
                        )}
                      </Flex>
                      <Flex gap={2} align="center">
                        {!isViewOnly && (
                          <>
                            <Button
                              size="xs"
                              colorScheme={
                                isRounded ? "gray" : isSplit ? "purple" : "blue"
                              }
                              bgColor="maroon"
                              variant={
                                isRounded
                                  ? "outline"
                                  : isSplit
                                    ? "outline"
                                    : "solid"
                              }
                              leftIcon={<Icon as={FiPercent} />}
                              onClick={() =>
                                handleRoundEntityPercentage(entityAbbr)
                              }
                              isDisabled={isRounded || isSplit}
                              title={
                                isRounded || isSplit
                                  ? "This entity is already rounded or split"
                                  : `Round percentages for ${entityAbbr}`
                              }
                            >
                              Round
                            </Button>
                            <Button
                              size="xs"
                              colorScheme={
                                isRounded
                                  ? "maroon"
                                  : isSplit
                                    ? "purple"
                                    : "maroon"
                              }
                              bgColor="mblue"
                              variant={
                                isRounded
                                  ? "solid"
                                  : isSplit
                                    ? "solid"
                                    : "outline"
                              }
                              leftIcon={<Icon as={FiBarChart2} />}
                              onClick={() =>
                                handleResetEntityCalculation(entityAbbr)
                              }
                              title={
                                !isRounded && !isSplit
                                  ? "This entity is already in calculated status"
                                  : `Reset calculation for ${entityAbbr}`
                              }
                            >
                              Reset
                            </Button>
                            <Button
                              size="xs"
                              colorScheme="red"
                              variant="outline"
                              leftIcon={<Icon as={FiTrash2} />}
                              onClick={() => handleDeleteEntity(entityAbbr)}
                              title={`Delete ${entityAbbr}`}
                            />
                            {entitySummaries[entityAbbr]?.subWaybillNumber && (
                              <Tooltip
                                label="Duplicate"
                                placement="top"
                                hasArrow
                                bg="green.600"
                                color="white"
                                fontSize="xs"
                                fontWeight="medium"
                                px={3}
                                py={2}
                                borderRadius="md"
                                openDelay={10}
                              >
                                <Button
                                  size="xs"
                                  colorScheme="green"
                                  variant="outline"
                                  leftIcon={<Icon as={FiCopy} />}
                                  onClick={(event) =>
                                    handleDirectDuplicateClick(
                                      entityAbbr,
                                      event
                                    )
                                  }
                                  title={`Duplicate using sub waybill number ${entitySummaries[entityAbbr].subWaybillNumber}`}
                                />
                              </Tooltip>
                            )}
                          </>
                        )}
                        <Popover
                          placement="bottom-start"
                          autoFocus={false}
                          closeOnBlur={true}
                          gutter={4}
                          strategy="fixed"
                          isLazy
                        >
                          <PopoverTrigger>
                            <Button
                              size="sm"
                              rightIcon={<ChevronDownIcon />}
                              variant="outline"
                              colorScheme={
                                isRounded ? "teal" : isSplit ? "purple" : "gray"
                              }
                            >
                              {filteredItemCount} Items
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent
                            boxShadow="md"
                            borderColor="gray.200"
                            width="280px"
                            maxH="350px"
                            overflow="hidden"
                            _focus={{ outline: "none" }}
                            zIndex={10}
                            bg="white"
                          >
                            <Box
                              px={4}
                              py={2}
                              fontWeight="bold"
                              borderBottomWidth="1px"
                            >
                              Items ({filteredItemCount})
                            </Box>
                            <Box maxH="250px" overflowY="auto" py={1}>
                              {filteredItems &&
                                Object.entries(filteredItems).map(
                                  ([itemName, itemData]) => (
                                    <Box
                                      key={itemName}
                                      p={2}
                                      _hover={{
                                        bg: isRounded
                                          ? "teal.50"
                                          : isSplit
                                            ? "purple.50"
                                            : "blue.50",
                                      }}
                                      borderBottomWidth="1px"
                                      borderColor="gray.100"
                                    >
                                      <Text
                                        fontSize="sm"
                                        fontWeight="medium"
                                        mb={1}
                                        maxW="160px"
                                        isTruncated
                                      >
                                        {itemName.includes(" - ")
                                          ? itemName.split(" - ")[1]
                                          : itemName}
                                      </Text>
                                      <Flex
                                        justify="space-between"
                                        width="100%"
                                      >
                                        <Text fontSize="xs" color="gray.500">
                                          {Number.isInteger(itemData.percentage)
                                            ? itemData.percentage
                                            : itemData.percentage?.toFixed(2) ||
                                              "0"}
                                          %
                                        </Text>
                                        <Text
                                          fontSize="sm"
                                          fontWeight="semibold"
                                        >
                                          ₱
                                          {formatNumberWithCommas(
                                            itemData.amount?.toFixed(2)
                                          )}
                                        </Text>
                                      </Flex>
                                    </Box>
                                  )
                                )}
                            </Box>
                          </PopoverContent>
                        </Popover>
                      </Flex>
                    </Flex>

                    <Flex
                      direction="column"
                      mt={3}
                      p={3}
                      bg={
                        isRounded
                          ? "teal.50"
                          : isSplit
                            ? "purple.50"
                            : "gray.50"
                      }
                      borderRadius="md"
                    >
                      <Flex justify="space-between" mb={1}>
                        <Text fontSize="sm" color="gray.500">
                          Total Percentage:
                        </Text>
                        {editingEntity === entityAbbr ? (
                          <Input
                            value={editedPercentage}
                            onChange={handlePercentageChange}
                            onBlur={handleSavePercentage}
                            onKeyDown={handleKeyDown}
                            autoFocus
                            size="xs"
                            width="80px"
                            textAlign="right"
                            paddingRight="20px"
                            type="number"
                            step="0.01"
                          />
                        ) : (
                          <Tooltip
                            label={
                              !isViewOnly
                                ? "Double-click to edit this percentage"
                                : ""
                            }
                            placement="top"
                            hasArrow
                            bg={
                              isRounded
                                ? "teal.600"
                                : isSplit
                                  ? "purple.600"
                                  : "blue.600"
                            }
                            color="white"
                            fontSize="xs"
                            fontWeight="medium"
                            px={3}
                            py={2}
                            borderRadius="md"
                            openDelay={10}
                          >
                            <Text
                              fontSize="sm"
                              fontWeight="semibold"
                              cursor={!isViewOnly ? "pointer" : "default"}
                              onDoubleClick={() =>
                                !isViewOnly &&
                                handleDoubleClickPercentage(
                                  entityAbbr,
                                  Number.isInteger(data.totalPercentage)
                                    ? data.totalPercentage
                                    : data.totalPercentage?.toFixed(2) || "0"
                                )
                              }
                              _hover={{
                                textDecoration: !isViewOnly
                                  ? "underline"
                                  : "none",
                                color: !isViewOnly
                                  ? isRounded
                                    ? "teal.600"
                                    : isSplit
                                      ? "purple.600"
                                      : "blue.600"
                                  : undefined,
                              }}
                            >
                              {Number.isInteger(data.totalPercentage)
                                ? data.totalPercentage
                                : data.totalPercentage?.toFixed(2) || "0"}
                              %
                            </Text>
                          </Tooltip>
                        )}
                      </Flex>
                      <Flex justify="space-between">
                        <Text fontSize="sm" color="gray.500">
                          Total Amount:
                        </Text>
                        {editingAmountEntity === entityAbbr ? (
                          <Input
                            value={editedAmount}
                            onChange={handleAmountChange}
                            onBlur={handleSaveAmount}
                            onKeyDown={handleKeyDown}
                            autoFocus
                            size="xs"
                            width="100px"
                            textAlign="right"
                            paddingRight="20px"
                            type="text"
                          />
                        ) : (
                          <Tooltip
                            label={
                              !isViewOnly
                                ? "Double-click to edit this amount"
                                : ""
                            }
                            placement="top"
                            hasArrow
                            bg={
                              isRounded
                                ? "teal.600"
                                : isSplit
                                  ? "purple.600"
                                  : "blue.600"
                            }
                            color="white"
                            fontSize="xs"
                            fontWeight="medium"
                            px={3}
                            py={2}
                            borderRadius="md"
                            openDelay={10}
                          >
                            <Text
                              fontSize="sm"
                              fontWeight="semibold"
                              cursor={!isViewOnly ? "pointer" : "default"}
                              onDoubleClick={() =>
                                !isViewOnly &&
                                handleDoubleClickAmount(
                                  entityAbbr,
                                  formatNumberWithCommas(
                                    data.totalAmount?.toFixed(2)
                                  ) || "0"
                                )
                              }
                              _hover={{
                                textDecoration: !isViewOnly
                                  ? "underline"
                                  : "none",
                                color: !isViewOnly
                                  ? isRounded
                                    ? "teal.600"
                                    : isSplit
                                      ? "purple.600"
                                      : "blue.600"
                                  : undefined,
                              }}
                            >
                              ₱
                              {formatNumberWithCommas(
                                data.totalAmount?.toFixed(2)
                              ) || "0"}
                            </Text>
                          </Tooltip>
                        )}
                      </Flex>
                    </Flex>
                  </Box>
                );
              }
            )}
          </SimpleGrid>
        </Box>
      )}

      {/* Duplicate Entity Modal */}
      <Modal isOpen={isDuplicateModalOpen} onClose={handleModalClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Duplicate to New Waybill</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            {isFetchingWaybills ? (
              <Flex justify="center" direction="column" align="center" my={8}>
                <Spinner size="xl" color="blue.500" mb={4} />
                <Text>Fetching sub waybill numbers...</Text>
              </Flex>
            ) : (
              <>
                <FormControl mb={4}>
                  <FormLabel>Current Waybill Number</FormLabel>
                  <Input value={selectedWaybill} isReadOnly bg="gray.100" />
                </FormControl>

                <FormControl>
                  <FormLabel>Select Sub Waybill Number</FormLabel>
                  {isFetchingWaybills ? (
                    <Flex justify="center" my={4}>
                      <Spinner size="md" color="blue.500" />
                    </Flex>
                  ) : (
                    <Select
                      placeholder="Select sub waybill number"
                      value={selectedNewWaybill}
                      onChange={(e) => setSelectedNewWaybill(e.target.value)}
                      isDisabled={unusedWaybills.length === 0}
                    >
                      {unusedWaybills.map((waybill) => (
                        <option
                          key={waybill.waybillNumber}
                          value={waybill.waybillNumber}
                        >
                          {waybill.waybillNumber}
                        </option>
                      ))}
                    </Select>
                  )}
                  {unusedWaybills.length === 0 && !isFetchingWaybills && (
                    <Text color="red.500" fontSize="sm" mt={2}>
                      No sub waybill numbers available for this waybill
                    </Text>
                  )}
                </FormControl>
              </>
            )}
          </ModalBody>

          <ModalFooter>
            <Button
              colorScheme="blue"
              mr={3}
              onClick={handleDuplicateEntitySummaries}
              isLoading={isLoading}
              isDisabled={!selectedNewWaybill}
            >
              Duplicate
            </Button>
            <Button onClick={handleModalClose}>Cancel</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Confirmation Modal */}
      <Modal
        isOpen={isConfirmDuplicateModalOpen}
        onClose={() => setIsConfirmDuplicateModalOpen(false)}
        size="sm"
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Confirm Duplication</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text>Are you sure you want to duplicate this?</Text>
          </ModalBody>
          <ModalFooter>
            <Button
              colorScheme="blue"
              mr={3}
              onClick={handleOpenDuplicateModal}
            >
              YES
            </Button>
            <Button
              variant="ghost"
              onClick={() => setIsConfirmDuplicateModalOpen(false)}
            >
              NO
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Confirmation Modal for Reverse Duplicate */}
      <Modal
        isOpen={isConfirmReverseModalOpen}
        onClose={() => setIsConfirmReverseModalOpen(false)}
        size="sm"
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Confirm Reverse Duplication</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text>
              Are you sure you want to reverse the duplication for this waybill?
              This will delete all data associated with this waybill and set its
              status to UNUSED.
            </Text>
          </ModalBody>
          <ModalFooter>
            <Button
              colorScheme="red"
              mr={3}
              onClick={handleReverseDuplicate}
              isLoading={isReversingDuplicate}
              loadingText="Reversing..."
            >
              YES
            </Button>
            <Button
              variant="ghost"
              onClick={() => setIsConfirmReverseModalOpen(false)}
              isDisabled={isReversingDuplicate}
            >
              NO
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Add TripDetail Modal */}
      <TripDetail
        isOpen={isTripDetailModalOpen}
        onClose={() => setIsTripDetailModalOpen(false)}
        tripId={tripId}
      />

      {/* Confirmation Modal for Direct Duplication */}
      <Modal
        isOpen={isConfirmDirectDuplicateModalOpen}
        onClose={() => setIsConfirmDirectDuplicateModalOpen(false)}
        isCentered
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Confirm Direct Duplication</ModalHeader>
          <ModalBody>
            <Text>This will perform two operations:</Text>
            <Box pl={4} mt={2}>
              <Text>
                1. First, clean up any existing data in waybill{" "}
                <strong>{selectedNewWaybill}</strong>
                (deleting entity abbreviation summary and consignee information)
              </Text>
              <Text mt={2}>
                2. Then duplicate this entity and its data to waybill{" "}
                <strong>{selectedNewWaybill}</strong>
              </Text>
            </Box>
            <Text mt={4} fontWeight="bold" color="red.500">
              Are you sure you want to proceed?
            </Text>
          </ModalBody>
          <ModalFooter>
            <Button
              colorScheme="gray"
              mr={3}
              onClick={() => setIsConfirmDirectDuplicateModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              colorScheme="blue"
              onClick={handleConfirmDirectDuplicate}
              isLoading={isLoading}
              loadingText="Processing..."
            >
              Yes, Proceed
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Confirmation Modal for Entity Deletion */}
      <Modal
        isOpen={isConfirmDeleteModalOpen}
        onClose={() => setIsConfirmDeleteModalOpen(false)}
        isCentered
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Confirm Deletion</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text>
              Are you sure you want to delete this entity? This action cannot be
              undone.
            </Text>
          </ModalBody>
          <ModalFooter>
            <Button
              colorScheme="red"
              mr={3}
              onClick={handleConfirmDelete}
              isLoading={isLoading}
            >
              Yes, Delete
            </Button>
            <Button
              variant="ghost"
              onClick={() => setIsConfirmDeleteModalOpen(false)}
              isDisabled={isLoading}
            >
              Cancel
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

// Export both the component and the function for external use
export {
  calculateTotalsByEntityAbbreviation,
  fetchSubDetails,
  updateEntitySummaryStatus,
};
export default EntityAbbreviationSummary;
