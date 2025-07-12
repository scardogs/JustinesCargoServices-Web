import { useState, useEffect, useRef } from "react";
import {
  Box,
  Button,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  ModalFooter,
  FormControl,
  FormLabel,
  Input,
  Select,
  IconButton,
  Text,
  Card,
  CardBody,
  CardHeader,
  CardFooter,
  Flex,
  Divider,
  Spinner,
  VStack,
  Heading,
  TableContainer,
  Badge,
  HStack,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  useDisclosure,
  Center,
  UnorderedList,
  ListItem,
  Textarea,
  Tooltip,
  Icon,
} from "@chakra-ui/react";
import {
  EditIcon,
  DeleteIcon,
  ArrowBackIcon,
  AddIcon,
  LockIcon,
} from "@chakra-ui/icons";
import { FiClock } from "react-icons/fi";
import axios from "axios";
import { useRouter } from "next/router";
import React from "react";

const formatRemainingTime = (milliseconds) => {
  if (milliseconds <= 0) return "00:00:00";
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
};

const TripDetails = ({ isOpen, onClose, tripId }) => {
  const router = useRouter();
  const [tripDetails, setTripDetails] = useState([]);
  const [waybillNumbers, setWaybillNumbers] = useState([]);
  const [currentTrip, setCurrentTrip] = useState(null);
  const [isLoadingTrip, setIsLoadingTrip] = useState(false);
  const [formData, setFormData] = useState({
    tripDetailID: "",
    stubNumber: "",
    tripID: tripId || "",
    waybillNumber: "",
    referenceNumber: "",
  });
  const [editingId, setEditingId] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useToast();
  const {
    isOpen: isDeleteConfirmOpen,
    onOpen: openDeleteConfirmModal,
    onClose: closeDeleteConfirmModal,
  } = useDisclosure();
  const [deletingTripDetailId, setDeletingTripDetailId] = useState(null);
  const [isDeletingTripDetail, setIsDeletingTripDetail] = useState(false);
  const cancelRef = React.useRef();
  const [isEditRequestOpen, setIsEditRequestOpen] = useState(false);
  const [editRequestRemarks, setEditRequestRemarks] = useState("");
  const [isSubmittingEditRequest, setIsSubmittingEditRequest] = useState(false);
  const [isEditAccessApproved, setIsEditAccessApproved] = useState(false);
  const [editAccessExpirationTime, setEditAccessExpirationTime] =
    useState(null);
  const [editAccessTimerDisplay, setEditAccessTimerDisplay] = useState(null);
  const editAccessTimerIntervalRef = useRef(null);
  const [isDeleteRequestOpen, setIsDeleteRequestOpen] = useState(false);
  const [deleteRequestRemarks, setDeleteRequestRemarks] = useState("");
  const [isSubmittingDeleteRequest, setIsSubmittingDeleteRequest] =
    useState(false);
  const [isDeleteAccessApproved, setIsDeleteAccessApproved] = useState(false);
  const [deleteAccessExpirationTime, setDeleteAccessExpirationTime] =
    useState(null);
  const [deleteAccessTimerDisplay, setDeleteAccessTimerDisplay] =
    useState(null);
  const deleteAccessTimerIntervalRef = useRef(null);

  useEffect(() => {
    const fetchTripData = async () => {
      if (!tripId) return;
      setIsLoadingTrip(true);
      try {
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_BACKEND_API}/api/trips/${tripId}`
        );
        setCurrentTrip(response.data);
        setFormData((prev) => ({
          ...prev,
          tripID: response.data.tripID,
          stubNumber: response.data.stubNumber || "",
        }));
      } catch (error) {
        console.error("Error fetching trip data:", error);
        toast({
          title: "Error",
          description: "Failed to load trip data.",
          status: "error",
          duration: 3000,
        });
        onClose();
      } finally {
        setIsLoadingTrip(false);
      }
    };

    if (isOpen && tripId) {
      fetchTripData();
      fetchAndFilterTripDetails();
      fetchWaybillNumbers();
    } else {
      setCurrentTrip(null);
      setTripDetails([]);
      setWaybillNumbers([]);
      resetForm();
    }
  }, [isOpen, tripId]);

  useEffect(() => {
    if (!isOpen) {
      setTripDetails([]);
      setShowAddForm(false);
      setCurrentTrip(null);
      resetForm();
    }
  }, [isOpen]);

  useEffect(() => {
    if (formData.stubNumber) {
      fetchWaybillNumbers();
    }
  }, [formData.stubNumber]);

  const fetchAndFilterTripDetails = async () => {
    if (!tripId) return;
    try {
      console.log(`Fetching trip details for tripId: ${tripId}`);
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/tripDetails`
      );
      const allTripDetails = response.data;
      const filteredDetails = allTripDetails.filter(
        (detail) => detail.tripID === tripId
      );
      console.log("Filtered trip details:", filteredDetails);
      setTripDetails(filteredDetails);
    } catch (error) {
      console.error("Error fetching trip details:", error);
      let errorMessage = "Failed to fetch trip details";

      if (error.response) {
        errorMessage = error.response.data.message || error.response.statusText;
      } else if (error.request) {
        errorMessage = "No response received from server";
      } else {
        errorMessage = error.message;
      }

      toast({
        title: "Error",
        description: errorMessage,
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const fetchWaybillNumbers = async () => {
    const stubToUse = currentTrip?.stubNumber || formData.stubNumber;
    if (!stubToUse) {
      setWaybillNumbers([]);
      return;
    }
    try {
      const stubArray = stubToUse.split("/");
      const waybillPromises = stubArray.map((stub) =>
        axios.get(`${process.env.NEXT_PUBLIC_BACKEND_API}/api/waybills`, {
          params: { stub: stub, status: "UNUSED" },
        })
      );
      const waybillResponses = await Promise.all(waybillPromises);
      const allWaybills = waybillResponses.flatMap((response) => response.data);
      const uniqueWaybills = Array.from(
        new Map(
          allWaybills.map((waybill) => [waybill.waybillNumber, waybill])
        ).values()
      );
      console.log("Fetched Waybills:", uniqueWaybills);
      setWaybillNumbers(uniqueWaybills);
    } catch (error) {
      console.error("Error fetching waybill numbers:", error);
      toast({
        title: "Error",
        description: "Failed to fetch waybill numbers",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const getNextTripDetailID = () => {
    if (tripDetails.length === 0) return "TD0001";
    const maxID = tripDetails.reduce((max, detail) => {
      const numericPart = parseInt(detail.tripDetailID.slice(2), 10);
      return numericPart > max ? numericPart : max;
    }, 0);
    return `TD${String(maxID + 1).padStart(4, "0")}`;
  };

  // Function to update shipperInfo with trip data
  const updateShipperInfo = async (waybillNumber) => {
    if (!currentTrip) {
      console.error(
        "Cannot update shipperInfo: currentTrip is null or undefined"
      );
      return;
    }

    try {
      console.log(
        `Updating shipperInfo for waybill ${waybillNumber} with trip data`,
        currentTrip
      );

      // Check if the currentTrip has the required fields
      if (
        !currentTrip.vehicle ||
        !currentTrip.driver ||
        !currentTrip.loadingDate
      ) {
        console.error(
          "Cannot update shipperInfo: currentTrip is missing required fields",
          {
            vehicle: currentTrip.vehicle,
            driver: currentTrip.driver,
            loadingDate: currentTrip.loadingDate,
          }
        );
        return;
      }

      // Prepare the data for shipperInfo update
      const shipperInfoData = {
        waybillNumber: waybillNumber,
        plateNo: currentTrip.vehicle,
        driverName: currentTrip.driver,
        subLoadingDate: currentTrip.loadingDate,
      };

      console.log("ShipperInfo data to be sent:", shipperInfoData);

      try {
        // First check if shipperInfo already exists for this waybill
        const checkResponse = await axios.get(
          `${process.env.NEXT_PUBLIC_BACKEND_API}/api/shipperInfo/${waybillNumber}`
        );
        console.log("Existing shipperInfo found:", checkResponse.data);

        // If shipperInfo exists but doesn't have these fields populated
        if (
          !checkResponse.data.plateNo ||
          !checkResponse.data.driverName ||
          !checkResponse.data.subLoadingDate
        ) {
          console.log("Updating existing shipperInfo with missing fields");
          // Update the shipperInfo with data from trip
          const updateResponse = await axios.post(
            `${process.env.NEXT_PUBLIC_BACKEND_API}/api/shipperInfo`,
            shipperInfoData
          );
          console.log("ShipperInfo update response:", updateResponse.data);
        } else {
          console.log("ShipperInfo already has all required fields");
        }
      } catch (error) {
        // If shipperInfo doesn't exist (404) create it
        if (error.response && error.response.status === 404) {
          console.log("No existing shipperInfo found, creating new record");
          try {
            const shipperInfoData = {
              waybillNumber: waybillNumber,
              plateNo: currentTrip.vehicle,
              driverName: currentTrip.driver,
              shipper: "To be updated", // Required field in schema
              pickupAddress: "To be updated", // Required field in schema
              storeType: "DC", // Required field in enum ["DC", "STORE"]
              subLoadingDate: currentTrip.loadingDate,
            };

            console.log("Creating new shipperInfo with data:", shipperInfoData);
            const createResponse = await axios.post(
              `${process.env.NEXT_PUBLIC_BACKEND_API}/api/shipperInfo`,
              shipperInfoData
            );
            console.log("New shipperInfo created:", createResponse.data);
          } catch (createError) {
            console.error("Error creating shipperInfo:", createError);
            if (createError.response) {
              console.error("Error response data:", createError.response.data);
              console.error(
                "Error response status:",
                createError.response.status
              );
            }
          }
        } else {
          console.error("Error checking existing shipperInfo:", error);
          if (error.response) {
            console.error("Error response data:", error.response.data);
            console.error("Error response status:", error.response.status);
          }
        }
      }
    } catch (error) {
      console.error("Unexpected error in updateShipperInfo:", error);
    }
  };

  const handleSubmit = async () => {
    if (!currentTrip) return;
    try {
      if (isSubmitting) return;
      setIsSubmitting(true);

      const dataToSubmit = {
        ...formData,
        tripID: currentTrip.tripID,
        stubNumber: currentTrip.stubNumber,
      };

      if (
        !dataToSubmit.tripID ||
        !dataToSubmit.stubNumber ||
        !dataToSubmit.waybillNumber
      ) {
        toast({
          title: "Missing Required Fields",
          description: "Please fill in all required fields",
          status: "warning",
          duration: 3000,
          isClosable: true,
        });
        setIsSubmitting(false);
        return;
      }

      if (editingId) {
        const isDuplicateInOtherRecord = tripDetails.some(
          (detail) =>
            detail.waybillNumber === dataToSubmit.waybillNumber &&
            detail._id !== editingId
        );

        if (isDuplicateInOtherRecord) {
          toast({
            title: "Duplicate Waybill",
            description:
              "This waybill number is already used in another trip detail",
            status: "error",
            duration: 3000,
            isClosable: true,
          });
          setIsSubmitting(false);
          return;
        }

        // Get the old waybill number before updating
        const oldWaybillNumber = tripDetails.find(
          (detail) => detail._id === editingId
        )?.waybillNumber;

        // If waybill number has changed
        if (
          oldWaybillNumber &&
          oldWaybillNumber !== dataToSubmit.waybillNumber
        ) {
          // Mark the old waybill as UNUSED
          await axios.put(
            `${process.env.NEXT_PUBLIC_BACKEND_API}/api/waybills/number/${oldWaybillNumber}`,
            { status: "UNUSED" }
          );

          // Delete the old shipper info
          try {
            await axios.delete(
              `${process.env.NEXT_PUBLIC_BACKEND_API}/api/shipperInfo/${oldWaybillNumber}`
            );
            console.log(`Deleted shipper info for waybill ${oldWaybillNumber}`);
          } catch (error) {
            console.error(
              `Error deleting shipper info for waybill ${oldWaybillNumber}:`,
              error
            );
            // Continue even if delete fails
          }
        }

        // Mark the new waybill as USED
        await axios.put(
          `${process.env.NEXT_PUBLIC_BACKEND_API}/api/waybills/number/${dataToSubmit.waybillNumber}`,
          { status: "USED" }
        );

        const tripEndpoint = `${process.env.NEXT_PUBLIC_BACKEND_API}/api/tripDetails/${editingId}`;
        const tripResponse = await axios.put(tripEndpoint, dataToSubmit);

        if (tripResponse.status === 200) {
          // Update shipperInfo with trip data just like in the add flow
          await updateShipperInfo(dataToSubmit.waybillNumber);

          toast({
            title: "Success",
            description: "Trip detail updated successfully!",
            status: "success",
            duration: 3000,
            isClosable: true,
          });

          await fetchAndFilterTripDetails();
          await fetchWaybillNumbers();
          resetForm();
          setShowAddForm(false);
        }
      } else {
        const isDuplicate = tripDetails.some(
          (detail) => detail.waybillNumber === dataToSubmit.waybillNumber
        );

        if (isDuplicate) {
          toast({
            title: "Duplicate Waybill",
            description: "This waybill number is already used in this trip",
            status: "error",
            duration: 3000,
            isClosable: true,
          });
          setIsSubmitting(false);
          return;
        }

        // Mark the waybill as USED
        await axios.put(
          `${process.env.NEXT_PUBLIC_BACKEND_API}/api/waybills/number/${dataToSubmit.waybillNumber}`,
          { status: "USED" }
        );

        // Create the trip detail
        const tripResponse = await axios.post(
          `${process.env.NEXT_PUBLIC_BACKEND_API}/api/tripDetails`,
          dataToSubmit
        );

        if (tripResponse.status === 201) {
          // Update shipperInfo with trip data
          await updateShipperInfo(dataToSubmit.waybillNumber);

          toast({
            title: "Success",
            description: "Trip detail added successfully!",
            status: "success",
            duration: 3000,
            isClosable: true,
          });

          await fetchAndFilterTripDetails();
          await fetchWaybillNumbers();
          resetForm();
          setShowAddForm(false);
        }
      }
    } catch (error) {
      console.error("Error saving trip detail:", error);
      if (error.response) {
        console.error("Error Response Data:", error.response.data);
        console.error("Error Response Status:", error.response.status);
        console.error("Error Response Headers:", error.response.headers);
      } else if (error.request) {
        console.error("Error Request:", error.request);
      } else {
        console.error("Error Message:", error.message);
      }
      console.error("Error Config:", error.config);

      toast({
        title: "Error",
        description:
          error.response?.data?.error || "An error occurred while saving",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openDeleteConfirm = (id) => {
    setDeletingTripDetailId(id);
    openDeleteConfirmModal();
  };

  const confirmDelete = async () => {
    if (!isEditAccessApproved) {
      toast({
        title: "Access Required",
        description:
          "You need edit access to delete trip details. Please request access first.",
        status: "warning",
        duration: 5000,
        isClosable: true,
      });
      return;
    }
    if (!deletingTripDetailId) return;
    setIsDeletingTripDetail(true);

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast({
          title: "Error",
          description: "Authentication token not found. Please log in.",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
        setDeletingTripDetailId(null);
        closeDeleteConfirmModal();
        return;
      }

      // Get the trip detail object to access its waybill number before deleting
      const tripDetailToDelete = tripDetails.find(
        (detail) => detail._id === deletingTripDetailId
      );

      if (!tripDetailToDelete) {
        toast({
          title: "Error",
          description: "Could not find the trip detail to delete.",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
        setIsDeletingTripDetail(false);
        closeDeleteConfirmModal();
        setDeletingTripDetailId(null);
        return;
      }

      const waybillNumber = tripDetailToDelete.waybillNumber;
      console.log("Processing deletion for waybill:", waybillNumber);

      // Step 1: Delete shipper info for the waybill
      try {
        console.log("Deleting shipper info for waybill:", waybillNumber);
        await axios.delete(
          `${process.env.NEXT_PUBLIC_BACKEND_API}/api/shipperInfo/${waybillNumber}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        console.log("Shipper info deleted for waybill:", waybillNumber);
      } catch (error) {
        console.error(
          `Error deleting shipper info for waybill ${waybillNumber}:`,
          error
        );
        // Continue with other deletions
      }

      // Step 2: Get and delete consignee info for the waybill
      try {
        console.log("Getting consignee info for waybill:", waybillNumber);
        const consigneesResponse = await axios.get(
          `${process.env.NEXT_PUBLIC_BACKEND_API}/api/consigneeInfo/${waybillNumber}`
        );
        const consignees = consigneesResponse.data || [];

        // Step 2.1: Delete subdetails for each consignee in this waybill
        try {
          console.log("Deleting subdetails for waybill:", waybillNumber);

          // Delete subdetails for each consignee
          for (const consignee of consignees) {
            console.log(
              `Deleting subdetails for consignee ${consignee.consignee} of waybill:`,
              waybillNumber
            );
            try {
              await axios.delete(
                `${process.env.NEXT_PUBLIC_BACKEND_API}/api/subdetails/byConsignee/${waybillNumber}/${encodeURIComponent(consignee.consignee)}`,
                { headers: { Authorization: `Bearer ${token}` } }
              );
            } catch (subdetailError) {
              // Handle 404 errors gracefully - no subdetails found is not a problem
              if (
                subdetailError.response &&
                subdetailError.response.status === 404
              ) {
                console.log(
                  `No subdetails found for consignee ${consignee.consignee} - this is normal`
                );
              } else {
                console.error(
                  `Error deleting subdetails for consignee ${consignee.consignee}:`,
                  subdetailError
                );
              }
              // Continue with other consignees regardless
            }
          }

          console.log("Subdetails deleted for waybill:", waybillNumber);
        } catch (error) {
          console.error(
            `Error in subdetails deletion process for waybill ${waybillNumber}:`,
            error
          );
          // Continue with other deletions
        }

        // Step 2.2: Delete entity abbreviation summaries for this waybill
        try {
          console.log(
            "Deleting entity abbreviation summaries for waybill:",
            waybillNumber
          );
          try {
            await axios.delete(
              `${process.env.NEXT_PUBLIC_BACKEND_API}/api/entityAbbreviationSummary/waybill/${waybillNumber}`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            console.log(
              "Entity abbreviation summaries deleted for waybill:",
              waybillNumber
            );
          } catch (axiosError) {
            // Handle 404 errors gracefully - it's okay if there are no entity abbreviation summaries
            if (axiosError.response && axiosError.response.status === 404) {
              console.log(
                `No entity abbreviation summaries found for waybill ${waybillNumber} - this is normal`
              );
            } else {
              throw axiosError; // Re-throw for the outer catch to handle
            }
          }
        } catch (error) {
          console.error(
            `Error deleting entity abbreviation summaries for waybill ${waybillNumber}:`,
            error
          );
          // Continue with other deletions
        }

        // Step 2.3: Delete each consignee
        for (const consignee of consignees) {
          console.log(
            `Deleting consignee ${consignee.consignee} for waybill:`,
            waybillNumber
          );
          try {
            await axios.delete(
              `${process.env.NEXT_PUBLIC_BACKEND_API}/api/consigneeInfo/${waybillNumber}/${encodeURIComponent(consignee.consignee)}`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            console.log(
              `Deleted consignee ${consignee.consignee} for waybill:`,
              waybillNumber
            );
          } catch (consigneeError) {
            console.error(
              `Error deleting consignee ${consignee.consignee}:`,
              consigneeError
            );
            // Continue with other consignees
          }
        }
      } catch (error) {
        console.error(
          `Error in consignee deletion process for waybill ${waybillNumber}:`,
          error
        );
        // Continue with other deletions
      }

      // Step 3: Reset waybill status to UNUSED
      try {
        console.log("Resetting waybill status to UNUSED:", waybillNumber);
        await axios.put(
          `${process.env.NEXT_PUBLIC_BACKEND_API}/api/waybills/number/${waybillNumber}`,
          { status: "UNUSED" },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        console.log("Reset waybill status to UNUSED:", waybillNumber);
      } catch (error) {
        console.error(
          `Error resetting waybill status for ${waybillNumber}:`,
          error
        );
        // Continue with other deletions
      }

      // Step 4: Delete the trip detail
      await axios.delete(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/tripDetails/${deletingTripDetailId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      toast({
        title: "Trip detail deleted!",
        description:
          "The trip detail and all associated data (waybill, shipper info, consignee info) deleted successfully.",
        status: "success",
        duration: 5000,
        isClosable: true,
        position: "top-right",
      });

      await fetchAndFilterTripDetails();
      fetchWaybillNumbers();
    } catch (error) {
      console.error("Error in cascading deletion:", error);
      const errorDesc =
        error.response?.data?.message || "Failed to delete trip detail";
      toast({
        title: "Error",
        description: errorDesc,
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setDeletingTripDetailId(null);
      closeDeleteConfirmModal();
      setIsDeletingTripDetail(false);
    }
  };

  const handleEdit = (tripDetail) => {
    if (!isEditAccessApproved) {
      toast({
        title: "Access Required",
        description:
          "You need edit access to modify trip details. Please request access first.",
        status: "warning",
        duration: 5000,
        isClosable: true,
      });
      return;
    }
    setEditingId(tripDetail._id);
    setFormData({
      tripDetailID: tripDetail.tripDetailID,
      stubNumber: tripDetail.stubNumber,
      tripID: tripDetail.tripID,
      waybillNumber: tripDetail.waybillNumber,
      referenceNumber: tripDetail.referenceNumber || "",
    });
    setShowAddForm(true);
  };

  const handleAddNew = () => {
    if (!currentTrip) return;
    resetForm();
    setShowAddForm(true);
  };

  const resetForm = () => {
    setFormData({
      tripDetailID: getNextTripDetailID(),
      tripID: currentTrip?.tripID || tripId || "",
      stubNumber: currentTrip?.stubNumber || "",
      waybillNumber: "",
      referenceNumber: "",
    });
    setEditingId(null);
  };

  const getActualStubForWaybill = async (waybillNumber, stubNumber) => {
    try {
      if (!stubNumber.includes("/")) {
        return stubNumber;
      }

      const stubs = stubNumber.split("/");

      if (stubs.length === 1) {
        return stubs[0];
      }

      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/waybills`,
        { params: { waybillNumber } }
      );

      if (response.data && response.data.length > 0) {
        return response.data[0].stub;
      }

      return stubs[0];
    } catch (error) {
      console.error("Error getting actual stub for waybill:", error);
      return stubNumber.split("/")[0];
    }
  };

  const [resolvedStubs, setResolvedStubs] = useState({});

  useEffect(() => {
    const resolveStubs = async () => {
      const stubMap = {};

      for (const detail of tripDetails) {
        if (!resolvedStubs[detail.waybillNumber]) {
          const actualStub = await getActualStubForWaybill(
            detail.waybillNumber,
            detail.stubNumber
          );
          stubMap[detail.waybillNumber] = actualStub;
        }
      }

      setResolvedStubs((prevStubs) => ({
        ...prevStubs,
        ...stubMap,
      }));
    };

    if (tripDetails.length > 0) {
      resolveStubs();
    }
  }, [tripDetails]);

  const handleEditRequestOpen = async () => {
    const token = localStorage.getItem("token");
    const userString = localStorage.getItem("user");
    if (!token || !userString) {
      toast({
        title: "Error",
        description: "Cannot verify user session.",
        status: "error",
      });
      return;
    }

    try {
      const user = JSON.parse(userString);
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/control-panel`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const existingPendingRequest = response.data.find(
        (req) =>
          req.Module === "TripDetails" &&
          req.RequestType === "Edit" &&
          req.Username === user.name &&
          req.Status === "Pending"
      );

      if (existingPendingRequest) {
        toast({
          title: "Pending Request Exists",
          description: `You already have a pending request (${existingPendingRequest.RequestType}) for Trip Details access.`,
          status: "warning",
          duration: 5000,
          isClosable: true,
        });
        return;
      }
    } catch (error) {
      console.error("Error checking for pending requests:", error);
      toast({
        title: "Error",
        description: "Could not verify existing requests. Please try again.",
        status: "error",
      });
      return;
    }

    setEditRequestRemarks("");
    setIsSubmittingEditRequest(false);
    setIsEditRequestOpen(true);
  };

  const handleSubmitEditRequest = async () => {
    setIsSubmittingEditRequest(true);
    try {
      const token = localStorage.getItem("token");
      const userString = localStorage.getItem("user");
      if (!token || !userString)
        throw new Error("Authentication details not found.");
      const user = JSON.parse(userString);
      const generatedRequestID = `REQ-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const payload = {
        RequestID: generatedRequestID,
        Module: "TripDetails",
        RequestType: "Edit",
        Remarks: editRequestRemarks,
        Username: user.name,
        UserRole: user.workLevel,
      };
      await axios.post(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/control-panel`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast({
        title: "Request Submitted",
        description: "Your request for edit access has been sent.",
        status: "success",
        duration: 5000,
        isClosable: true,
      });
      setIsEditRequestOpen(false);
    } catch (error) {
      console.error("Error submitting edit access request:", error);
      toast({
        title: "Request Failed",
        description:
          error.response?.data?.message ||
          error.message ||
          "Could not submit edit access request.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsSubmittingEditRequest(false);
    }
  };

  const checkEditAccess = async () => {
    const token = localStorage.getItem("token");
    const userString = localStorage.getItem("user");
    if (!token || !userString) {
      setIsEditAccessApproved(false);
      setEditAccessExpirationTime(null);
      return;
    }

    try {
      const user = JSON.parse(userString);
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/control-panel`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const requests = response.data;
      const now = new Date();

      const approvedEditRequest = requests.find(
        (req) =>
          req.Module === "TripDetails" &&
          req.RequestType === "Edit" &&
          req.Username === user.name &&
          req.Status === "Approved" &&
          (!req.ExpiresAt || new Date(req.ExpiresAt) > now)
      );
      const isEditApproved = !!approvedEditRequest;
      setIsEditAccessApproved(isEditApproved);
      setEditAccessExpirationTime(
        isEditApproved && approvedEditRequest.ExpiresAt
          ? new Date(approvedEditRequest.ExpiresAt)
          : null
      );
    } catch (error) {
      console.error("Error checking edit access:", error);
    }
  };

  useEffect(() => {
    checkEditAccess();
    const interval = setInterval(checkEditAccess, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (editAccessTimerIntervalRef.current) {
      clearInterval(editAccessTimerIntervalRef.current);
      editAccessTimerIntervalRef.current = null;
      setEditAccessTimerDisplay(null);
    }
    if (editAccessExpirationTime && editAccessExpirationTime > new Date()) {
      const updateTimer = () => {
        const remaining = editAccessExpirationTime - new Date();
        if (remaining <= 0) {
          clearInterval(editAccessTimerIntervalRef.current);
          setEditAccessTimerDisplay(null);
          setEditAccessExpirationTime(null);
          setIsEditAccessApproved(false);
        } else {
          setEditAccessTimerDisplay(formatRemainingTime(remaining));
        }
      };
      updateTimer();
      editAccessTimerIntervalRef.current = setInterval(updateTimer, 1000);
    }
    return () => {
      if (editAccessTimerIntervalRef.current)
        clearInterval(editAccessTimerIntervalRef.current);
    };
  }, [editAccessExpirationTime]);

  const handleDeleteRequestOpen = async () => {
    const token = localStorage.getItem("token");
    const userString = localStorage.getItem("user");
    if (!token || !userString) {
      toast({
        title: "Error",
        description: "Cannot verify user session.",
        status: "error",
      });
      return;
    }

    try {
      const user = JSON.parse(userString);
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/control-panel`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const existingPendingRequest = response.data.find(
        (req) =>
          req.Module === "TripDetails" &&
          req.RequestType === "Delete" &&
          req.Username === user.name &&
          req.Status === "Pending"
      );

      if (existingPendingRequest) {
        toast({
          title: "Pending Request Exists",
          description: `You already have a pending request (${existingPendingRequest.RequestType}) for Trip Details access.`,
          status: "warning",
          duration: 5000,
          isClosable: true,
        });
        return;
      }
    } catch (error) {
      console.error("Error checking for pending requests:", error);
      toast({
        title: "Error",
        description: "Could not verify existing requests. Please try again.",
        status: "error",
      });
      return;
    }

    setDeleteRequestRemarks("");
    setIsSubmittingDeleteRequest(false);
    setIsDeleteRequestOpen(true);
  };

  const handleSubmitDeleteRequest = async () => {
    setIsSubmittingDeleteRequest(true);
    try {
      const token = localStorage.getItem("token");
      const userString = localStorage.getItem("user");
      if (!token || !userString)
        throw new Error("Authentication details not found.");
      const user = JSON.parse(userString);
      const generatedRequestID = `REQ-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const payload = {
        RequestID: generatedRequestID,
        Module: "TripDetails",
        RequestType: "Delete",
        Remarks: deleteRequestRemarks,
        Username: user.name,
        UserRole: user.workLevel,
      };
      await axios.post(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/control-panel`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast({
        title: "Request Submitted",
        description: "Your request for delete access has been sent.",
        status: "success",
        duration: 5000,
        isClosable: true,
      });
      setIsDeleteRequestOpen(false);
    } catch (error) {
      console.error("Error submitting delete access request:", error);
      toast({
        title: "Request Failed",
        description:
          error.response?.data?.message ||
          error.message ||
          "Could not submit delete access request.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsSubmittingDeleteRequest(false);
    }
  };

  const checkDeleteAccess = async () => {
    const token = localStorage.getItem("token");
    const userString = localStorage.getItem("user");
    if (!token || !userString) {
      setIsDeleteAccessApproved(false);
      setDeleteAccessExpirationTime(null);
      return;
    }

    try {
      const user = JSON.parse(userString);
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/control-panel`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const requests = response.data;
      const now = new Date();

      const approvedDeleteRequest = requests.find(
        (req) =>
          req.Module === "TripDetails" &&
          req.RequestType === "Delete" &&
          req.Username === user.name &&
          req.Status === "Approved" &&
          (!req.ExpiresAt || new Date(req.ExpiresAt) > now)
      );
      const isDeleteApproved = !!approvedDeleteRequest;
      setIsDeleteAccessApproved(isDeleteApproved);
      setDeleteAccessExpirationTime(
        isDeleteApproved && approvedDeleteRequest.ExpiresAt
          ? new Date(approvedDeleteRequest.ExpiresAt)
          : null
      );
    } catch (error) {
      console.error("Error checking delete access:", error);
    }
  };

  useEffect(() => {
    checkDeleteAccess();
    const interval = setInterval(checkDeleteAccess, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (deleteAccessTimerIntervalRef.current) {
      clearInterval(deleteAccessTimerIntervalRef.current);
      deleteAccessTimerIntervalRef.current = null;
      setDeleteAccessTimerDisplay(null);
    }
    if (deleteAccessExpirationTime && deleteAccessExpirationTime > new Date()) {
      const updateTimer = () => {
        const remaining = deleteAccessExpirationTime - new Date();
        if (remaining <= 0) {
          clearInterval(deleteAccessTimerIntervalRef.current);
          setDeleteAccessTimerDisplay(null);
          setDeleteAccessExpirationTime(null);
          setIsDeleteAccessApproved(false);
        } else {
          setDeleteAccessTimerDisplay(formatRemainingTime(remaining));
        }
      };
      updateTimer();
      deleteAccessTimerIntervalRef.current = setInterval(updateTimer, 1000);
    }
    return () => {
      if (deleteAccessTimerIntervalRef.current)
        clearInterval(deleteAccessTimerIntervalRef.current);
    };
  }, [deleteAccessExpirationTime]);

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} size="6xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader bg="#1a365d" color="white" py={4}>
            {isLoadingTrip ? (
              <Spinner color="white" />
            ) : currentTrip ? (
              <VStack align="start" spacing={2}>
                <Heading size="md">Trip Details</Heading>
                <Text fontSize="sm" color="gray.200">
                  Trip ID: {currentTrip.tripID} | Vehicle: {currentTrip.vehicle}
                </Text>
                <Badge
                  colorScheme="green"
                  fontSize="sm"
                  px={2}
                  py={1}
                  borderRadius="md"
                >
                  Total Waybills: {tripDetails.length}
                </Badge>
              </VStack>
            ) : (
              <Heading size="md">Loading Trip Data...</Heading>
            )}
          </ModalHeader>
          <ModalCloseButton color="white" />
          <ModalBody py={6}>
            {isLoadingTrip ? (
              <Center h="300px">
                <Spinner size="xl" />
              </Center>
            ) : !currentTrip ? (
              <Center h="300px">
                <Text>Could not load trip data.</Text>
              </Center>
            ) : showAddForm ? (
              <Box>
                <HStack mb={6}>
                  <Button
                    leftIcon={<ArrowBackIcon />}
                    onClick={() => setShowAddForm(false)}
                    variant="outline"
                    color="#1a365d"
                    borderColor="#1a365d"
                    _hover={{ bg: "gray.50" }}
                  >
                    Back to Details
                  </Button>
                  <Heading size="md" color="#1a365d">
                    {editingId ? "Edit Trip Detail" : "Add Trip Detail"}
                  </Heading>
                </HStack>
                <VStack spacing={6}>
                  <FormControl isRequired>
                    <FormLabel color="gray.700">Trip ID</FormLabel>
                    <Input
                      value={formData.tripID}
                      isReadOnly
                      bg="gray.50"
                      borderColor="gray.300"
                    />
                  </FormControl>
                  <FormControl isRequired>
                    <FormLabel color="gray.700">Assigned Stub</FormLabel>
                    <Input
                      value={formData.stubNumber}
                      isReadOnly
                      bg="gray.50"
                      borderColor="gray.300"
                    />
                  </FormControl>
                  <FormControl isRequired>
                    <FormLabel color="gray.700">Waybill Number</FormLabel>
                    <Select
                      placeholder="Select Waybill"
                      value={formData.waybillNumber}
                      onChange={(e) => {
                        const selectedWaybillNumber = e.target.value;
                        setFormData({
                          ...formData,
                          waybillNumber: selectedWaybillNumber,
                          referenceNumber: selectedWaybillNumber,
                        });
                      }}
                      isDisabled={isSubmitting}
                      borderColor="gray.300"
                      _hover={{ borderColor: "blue.300" }}
                      _focus={{
                        borderColor: "blue.500",
                        boxShadow: "0 0 0 1px blue.500",
                      }}
                    >
                      {waybillNumbers.map((waybill) => (
                        <option key={waybill._id} value={waybill.waybillNumber}>
                          {waybill.waybillNumber}
                        </option>
                      ))}
                    </Select>
                  </FormControl>
                </VStack>
              </Box>
            ) : (
              <VStack spacing={6} align="stretch">
                <Flex justify="space-between" align="center">
                  <HStack spacing={4}>
                    <Button
                      onClick={handleAddNew}
                      leftIcon={<AddIcon />}
                      bg="#1a365d"
                      color="white"
                      _hover={{ bg: "#2a4365" }}
                    >
                      Add Trip Detail
                    </Button>
                    <Button
                      size="sm"
                      colorScheme="blue"
                      variant="outline"
                      onClick={handleEditRequestOpen}
                    >
                      Request Edit
                    </Button>
                    <Button
                      size="sm"
                      colorScheme="red"
                      variant="outline"
                      onClick={handleDeleteRequestOpen}
                    >
                      Request Delete
                    </Button>
                  </HStack>
                  {editAccessTimerDisplay && (
                    <Flex
                      alignItems="baseline"
                      color="purple.600"
                      fontSize="xs"
                    >
                      <Icon as={FiClock} mr={1} boxSize={3} />
                      <Text>Edit access active: {editAccessTimerDisplay}</Text>
                    </Flex>
                  )}
                </Flex>
                <TableContainer>
                  <Table variant="simple">
                    <Thead bg="gray.50">
                      <Tr>
                        <Th color="gray.700">Trip Detail ID</Th>
                        <Th color="gray.700">Assigned Stub</Th>
                        <Th color="gray.700">Waybill Number</Th>
                        <Th color="gray.700" textAlign="center">
                          Actions
                        </Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {tripDetails.map((detail) => (
                        <Tr key={detail._id} _hover={{ bg: "gray.50" }}>
                          <Td fontWeight="medium">{detail.tripDetailID}</Td>
                          <Td>
                            {resolvedStubs[detail.waybillNumber] ||
                              (detail.stubNumber &&
                              !detail.stubNumber.includes("/")
                                ? detail.stubNumber
                                : detail.stubNumber.split("/")[0])}
                          </Td>
                          <Td>{detail.waybillNumber}</Td>
                          <Td>
                            <HStack spacing={2} justify="center">
                              <Tooltip
                                label={
                                  isEditAccessApproved
                                    ? "Edit"
                                    : "Request edit access first"
                                }
                              >
                                <Box>
                                  <IconButton
                                    icon={<EditIcon />}
                                    size="sm"
                                    colorScheme="blue"
                                    variant="ghost"
                                    onClick={() => handleEdit(detail)}
                                    isDisabled={!isEditAccessApproved}
                                    opacity={isEditAccessApproved ? 1 : 0.5}
                                    cursor={
                                      isEditAccessApproved
                                        ? "pointer"
                                        : "not-allowed"
                                    }
                                  />
                                </Box>
                              </Tooltip>
                              <Tooltip
                                label={
                                  isEditAccessApproved
                                    ? "Delete"
                                    : "Request edit access first"
                                }
                              >
                                <Box>
                                  <IconButton
                                    icon={<DeleteIcon />}
                                    size="sm"
                                    colorScheme="red"
                                    variant="ghost"
                                    onClick={() =>
                                      openDeleteConfirm(detail._id)
                                    }
                                    isDisabled={!isEditAccessApproved}
                                    opacity={isEditAccessApproved ? 1 : 0.5}
                                    cursor={
                                      isEditAccessApproved
                                        ? "pointer"
                                        : "not-allowed"
                                    }
                                  />
                                </Box>
                              </Tooltip>
                            </HStack>
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </TableContainer>
              </VStack>
            )}
          </ModalBody>
          <ModalFooter borderTopWidth="2px" borderColor="#800020" py={4}>
            {showAddForm && (
              <Button
                bg="#1a365d"
                color="white"
                _hover={{ bg: "#2a4365" }}
                mr={3}
                onClick={handleSubmit}
                isDisabled={isSubmitting}
                isLoading={isSubmitting}
                loadingText="Saving..."
              >
                {editingId ? "Update" : "Save"}
              </Button>
            )}
            <Button
              variant="outline"
              color="#800020"
              borderColor="#800020"
              onClick={onClose}
            >
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <AlertDialog
        isOpen={isDeleteConfirmOpen}
        leastDestructiveRef={cancelRef}
        onClose={closeDeleteConfirmModal}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete Trip Detail
            </AlertDialogHeader>

            <AlertDialogBody>
              {isDeletingTripDetail ? (
                <VStack spacing={4}>
                  <Spinner
                    size="xl"
                    thickness="4px"
                    speed="0.65s"
                    emptyColor="gray.200"
                    color="blue.500"
                  />
                  <Text>Deleting trip detail and associated data...</Text>
                </VStack>
              ) : (
                <>
                  <Box mb={4}>
                    <Text fontWeight="bold">
                      Are you sure you want to delete this trip detail?
                    </Text>
                  </Box>
                  <Box
                    p={3}
                    bg="orange.50"
                    borderRadius="md"
                    borderLeft="4px solid"
                    borderColor="orange.400"
                  >
                    <Text fontWeight="bold" color="orange.700">
                      Cascading Deletion Warning:
                    </Text>
                    <Text mt={2} mb={3}>
                      This action will permanently delete the following
                      associated data:
                    </Text>
                    <UnorderedList pl={5} mt={2} spacing={2} color="gray.700">
                      <ListItem>The trip detail record</ListItem>
                      <ListItem>
                        All shipper information for this waybill
                      </ListItem>
                      <ListItem>
                        All consignee information for this waybill
                      </ListItem>
                      <ListItem>
                        All subdetails associated with consignees
                      </ListItem>
                      <ListItem>All entity abbreviation summaries</ListItem>
                    </UnorderedList>
                    <Text mt={4} fontWeight="semibold" color="blue.600">
                      The waybill status will be reset to "UNUSED" and can be
                      reassigned.
                    </Text>
                  </Box>
                </>
              )}
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button
                ref={cancelRef}
                onClick={closeDeleteConfirmModal}
                isDisabled={isDeletingTripDetail}
              >
                Cancel
              </Button>
              <Button
                colorScheme="red"
                onClick={confirmDelete}
                ml={3}
                isLoading={isDeletingTripDetail}
                loadingText="Deleting..."
              >
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>

      <Modal
        isOpen={isEditRequestOpen}
        onClose={() => setIsEditRequestOpen(false)}
        isCentered
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Request Edit Access (Trip Details)</ModalHeader>
          <ModalCloseButton isDisabled={isSubmittingEditRequest} />
          <ModalBody pb={6}>
            <Text mb={4}>
              You are requesting permission to edit and delete trip details.
            </Text>
            <FormControl>
              <FormLabel>Remarks (Optional)</FormLabel>
              <Textarea
                value={editRequestRemarks}
                onChange={(e) => setEditRequestRemarks(e.target.value)}
                placeholder="Provide a reason for your request..."
              />
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <Button
              colorScheme="blue"
              mr={3}
              onClick={handleSubmitEditRequest}
              isLoading={isSubmittingEditRequest}
              loadingText="Submitting"
            >
              Submit Request
            </Button>
            <Button
              variant="ghost"
              onClick={() => setIsEditRequestOpen(false)}
              isDisabled={isSubmittingEditRequest}
            >
              Cancel
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal
        isOpen={isDeleteRequestOpen}
        onClose={() => setIsDeleteRequestOpen(false)}
        isCentered
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Request Delete Access (Trip Details)</ModalHeader>
          <ModalCloseButton isDisabled={isSubmittingDeleteRequest} />
          <ModalBody pb={6}>
            <Text mb={4}>
              You are requesting permission to delete trip details.
            </Text>
            <FormControl>
              <FormLabel>Remarks (Optional)</FormLabel>
              <Textarea
                value={deleteRequestRemarks}
                onChange={(e) => setDeleteRequestRemarks(e.target.value)}
                placeholder="Provide a reason for your request..."
              />
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <Button
              colorScheme="blue"
              mr={3}
              onClick={handleSubmitDeleteRequest}
              isLoading={isSubmittingDeleteRequest}
              loadingText="Submitting"
            >
              Submit Request
            </Button>
            <Button
              variant="ghost"
              onClick={() => setIsDeleteRequestOpen(false)}
              isDisabled={isSubmittingDeleteRequest}
            >
              Cancel
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

export default TripDetails;
