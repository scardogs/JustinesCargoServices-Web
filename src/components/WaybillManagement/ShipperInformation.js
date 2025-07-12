import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  Flex,
  Text,
  Heading,
  Grid,
  GridItem,
  Icon,
  Button,
  FormControl,
  FormLabel,
  Select,
  Input,
  InputGroup,
  InputRightElement,
  Tooltip,
  Badge,
  useToast,
  Textarea,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverBody,
  List,
  ListItem,
  CircularProgress,
  Switch,
  HStack,
} from "@chakra-ui/react";
import {
  FaFileInvoice,
  FaUser,
  FaTruck,
  FaBuilding,
  FaSave,
  FaCheck,
  FaCamera,
  FaFilePdf,
  FaPlus,
  FaEdit,
  FaTimes,
  FaDownload,
} from "react-icons/fa";
import {
  InfoIcon,
  ChevronDownIcon,
  CalendarIcon,
  SearchIcon,
  AddIcon,
} from "@chakra-ui/icons";
import axios from "axios";
// Import jsPDF
import { jsPDF } from "jspdf";

// Custom SearchableSelect component
const SearchableSelect = ({
  value,
  onChange,
  options,
  placeholder,
  size = "md",
  height,
  bg = "white",
  borderColor,
  _hover,
  _focus,
  name,
  isDisabled,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);
  const [isUserTyping, setIsUserTyping] = useState(false);

  // Set search term to value when it changes externally
  useEffect(() => {
    if (value && !isUserTyping) {
      const option = options.find((opt) => opt.value === value);
      if (option) {
        setSearchTerm(option.label);
      } else {
        setSearchTerm(value); // Use value directly if no matching option found
      }
    }
  }, [value, options, isUserTyping]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        setIsOpen(false);
        setIsUserTyping(false); // Reset typing state when clicking outside
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Filter options based on search term
  const filteredOptions = searchTerm
    ? options.filter(
        (opt) =>
          opt.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
          opt.value.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : options;

  const handleInputChange = (e) => {
    const inputValue = e.target.value;
    setIsUserTyping(true); // User is typing
    setSearchTerm(inputValue);
    setIsOpen(true);

    // Pass the raw value to onChange - without entity abbreviation
    // Include the name attribute from props
    onChange({
      target: {
        value: inputValue,
        name: name,
      },
    });
  };

  const handleSelectOption = (option) => {
    setIsUserTyping(false); // User has selected an option
    setSearchTerm(option.label);
    setIsOpen(false);

    // Add a slight delay to ensure the state update completes
    setTimeout(() => {
      onChange({
        target: {
          value: option.value,
          name: name, // Preserve the name prop
        },
      });
    }, 0);
  };

  // Check if current search term is a custom value
  const isCustomValue =
    searchTerm &&
    !options.some(
      (opt) => opt.label.toLowerCase() === searchTerm.toLowerCase()
    );

  return (
    <Box position="relative" ref={ref} width="100%">
      <Input
        value={searchTerm}
        onChange={handleInputChange}
        placeholder={placeholder}
        size={size}
        height={height}
        bg={bg}
        borderColor={isCustomValue && searchTerm ? "orange.300" : borderColor}
        _hover={_hover}
        _focus={_focus}
        onClick={() => setIsOpen(true)}
        isDisabled={isDisabled}
      />
      {isOpen && (
        <Box
          position="fixed"
          top={
            ref.current
              ? ref.current.getBoundingClientRect().bottom + window.scrollY
              : "auto"
          }
          left={
            ref.current
              ? ref.current.getBoundingClientRect().left + window.scrollX
              : "auto"
          }
          width={ref.current ? ref.current.offsetWidth + "px" : "100%"}
          zIndex={99999}
          bg="white"
          borderColor="gray.200"
          boxShadow="xl"
          borderRadius="md"
          maxHeight="200px"
          overflowY="auto"
        >
          {filteredOptions.length > 0
            ? filteredOptions.map((option) => (
                <Box
                  key={option.value}
                  p={2}
                  cursor="pointer"
                  bg={option.label === searchTerm ? "blue.50" : "white"}
                  _hover={{ bg: "gray.100" }}
                  onClick={() => handleSelectOption(option)}
                >
                  {option.label}
                </Box>
              ))
            : !isCustomValue && (
                <Box p={2} color="gray.500" textAlign="center">
                  {searchTerm ? "No matches found" : "No options available"}
                </Box>
              )}
        </Box>
      )}
    </Box>
  );
};

const ShipperInformation = ({
  primaryColor,
  secondaryColor,
  borderColor,
  isShipperInfoSaved,
  shipperFormData,
  handleShipperChange,
  handleIndividualChange,
  handleDateChange,
  toggleIndividualMode,
  isIndividualMode,
  handleSaveShipperInfo,
  individuals,
  companies,
  formatDateForInput,
  dateRange,
  waybillNumber,
  truckCbm,
  handleTotalTruckCbmChange,
  consigneeClients = [],
  shipperEntityAbbreviation = "",
  saveNewConsignees = () => {},
  handleConsigneeChange = (e) =>
    handleShipperChange({
      target: {
        name: "consignee",
        value: e.target.value,
      },
    }),
  isViewOnly: externalViewOnly = false, // Accept external view-only flag
}) => {
  const toast = useToast();
  const [isEditingDriver, setIsEditingDriver] = useState(false);
  const [availableDrivers, setAvailableDrivers] = useState([]);
  const [isLoadingDrivers, setIsLoadingDrivers] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [filteredDrivers, setFilteredDrivers] = useState([]);
  const [isSearchPopoverOpen, setIsSearchPopoverOpen] = useState(false);
  // Add state for shipper-specific consignees
  const [shipperConsignees, setShipperConsignees] = useState([]);
  const [isLoadingConsignees, setIsLoadingConsignees] = useState(false);
  // Add state for loading truck data
  const [isLoadingTruckData, setIsLoadingTruckData] = useState(false);
  const [isViewOnly, setIsViewOnly] = useState(false);
  // Add a state for date constraints and loading
  const [dateConstraints, setDateConstraints] = useState({
    minDate: "",
    maxDate: "",
    tripFound: false,
    subLoadingDateUsed: false,
  });
  const [isLoading, setIsLoading] = useState(false);

  // Update isViewOnly when externalViewOnly changes (for BILLED status)
  useEffect(() => {
    if (externalViewOnly) {
      setIsViewOnly(true);
    }
  }, [externalViewOnly]);

  useEffect(() => {
    const checkDuplicateStatus = async () => {
      if (waybillNumber) {
        try {
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_BACKEND_API}/api/entity-abbreviation-summary/duplicate-status/${waybillNumber}`
          );

          if (response.ok) {
            const data = await response.json();
            const isDuplicate =
              data.duplicated === "duplicate" || data.viewOnly === true;

            // Only update if not already set by externalViewOnly
            if (!externalViewOnly) {
              setIsViewOnly(isDuplicate);
            }
          }
        } catch (error) {
          console.error("Error checking duplicate status:", error);
        }
      }
    };

    checkDuplicateStatus();
  }, [waybillNumber, externalViewOnly]);

  // Function to fetch drivers who have completed trips but are not on delivery
  const fetchDriversWithCompletedTrips = async () => {
    setIsLoadingDrivers(true);
    try {
      // Fetch available drivers directly from the backend endpoint
      const response = await axios.get(
        process.env.NEXT_PUBLIC_BACKEND_API + "/api/employees/available-drivers"
      );

      console.log(
        "Fetched available drivers from backend:",
        response.data.length
      );

      // Format the driver names for the dropdown
      const formattedDrivers = response.data.map((driver) => driver.fullName);

      // Log which drivers are available
      response.data.forEach((driver) => {
        console.log(`INCLUDING: ${driver.fullName} (not on delivery)`);
      });

      console.log(
        `Available drivers after filtering: ${formattedDrivers.length}`
      );

      // Set the drivers to display in the dropdown
      setAvailableDrivers(formattedDrivers);
      setFilteredDrivers(formattedDrivers);

      // Always open the popover when in editing mode
      if (isEditingDriver) {
        setIsSearchPopoverOpen(true);
      }

      // If no drivers found, show a message
      if (formattedDrivers.length === 0) {
        toast({
          title: "No available drivers",
          description:
            "No drivers are currently available (all may be on delivery).",
          status: "warning",
          duration: 5000,
          isClosable: true,
          position: "top-right",
        });
      }
    } catch (error) {
      console.error("Error fetching available drivers:", error);
      toast({
        title: "Error",
        description: `Failed to fetch available drivers: ${error.message}`,
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "top-right",
      });
    } finally {
      setIsLoadingDrivers(false);
    }
  };

  // Function to handle driver search
  const handleDriverSearch = (text) => {
    setSearchText(text);

    // If there's already a driver name present, extract the search part
    let searchPart = text;
    if (text.includes("/")) {
      searchPart = text.split("/")[1].trim();

      // Only filter if there's text after the slash
      if (searchPart && searchPart.length > 0) {
        // Filter available drivers based on search text
        const filtered = availableDrivers.filter((driver) =>
          driver.toLowerCase().includes(searchPart.toLowerCase())
        );
        setFilteredDrivers(filtered);
      } else {
        // If no search text after slash, show all available drivers
        setFilteredDrivers(availableDrivers);
      }
    } else {
      // If no slash yet, keep showing all available drivers
      setFilteredDrivers(availableDrivers);
    }

    // Always keep popover open when editing
    if (isEditingDriver) {
      setIsSearchPopoverOpen(true);
    }
  };

  // Handle driver input change
  const handleDriverInputChange = (e) => {
    const value = e.target.value;
    setSearchText(value);

    // If there's already a driver name, only allow editing after the "/"
    if (
      shipperFormData.driverName &&
      shipperFormData.driverName !== "Driver Not Found" &&
      shipperFormData.driverName !== "Not available"
    ) {
      // Check if there's already a "/" in the current value
      if (shipperFormData.driverName.includes("/")) {
        const originalPart = shipperFormData.driverName.split("/")[0];
        const newValue =
          originalPart + "/" + value.split("/").slice(1).join("/");

        handleShipperChange({
          target: {
            name: "driverName",
            value: newValue,
          },
        });

        // Search with the updated value
        handleDriverSearch(newValue);
      }
      // If user is trying to edit but there's no slash yet, add one
      else if (!value.includes("/")) {
        const newValue = shipperFormData.driverName + "/ ";

        handleShipperChange({
          target: {
            name: "driverName",
            value: newValue,
          },
        });

        handleDriverSearch(newValue);
      }
      // If the value already has a slash, use it directly
      else {
        handleShipperChange({
          target: {
            name: "driverName",
            value: value,
          },
        });

        handleDriverSearch(value);
      }
    } else {
      // If this is a new driver name, handle normally
      handleShipperChange(e);
      handleDriverSearch(value);
    }

    // Force the popover to open when searching
    if (availableDrivers.length > 0) {
      const searchPart = value.includes("/")
        ? value.split("/")[1].trim()
        : value;
      if (searchPart && searchPart.length > 0) {
        setIsSearchPopoverOpen(true);
      }
    }
  };

  // Function to handle driver selection
  const handleDriverSelect = (driverName) => {
    let newDriverName = driverName;

    // If there's already a driver name, append the new one
    if (
      shipperFormData.driverName &&
      shipperFormData.driverName !== "Driver Not Found" &&
      shipperFormData.driverName !== "Not available"
    ) {
      newDriverName = `${shipperFormData.driverName}/ ${driverName}`;
    }

    // Update the shipper form data
    handleShipperChange({
      target: {
        name: "driverName",
        value: newDriverName,
      },
    });

    setIsSearchPopoverOpen(false);
    setSearchText("");
  };

  // Function to handle editing drivers button click
  const handleEditDriverClick = () => {
    setIsEditingDriver(true);

    // Show loading toast
    toast({
      title: "Loading drivers",
      description: "Fetching all drivers...",
      status: "info",
      duration: 2000,
      isClosable: true,
      position: "top-right",
    });

    // We'll fetch the drivers and show them all immediately
    fetchDriversWithCompletedTrips();
  };

  // Function to handle canceling driver edit
  const handleCancelDriverEdit = () => {
    setIsEditingDriver(false);
    setIsSearchPopoverOpen(false);

    // If the driver name was modified during the edit but not yet saved, revert it
    if (
      shipperFormData.driverName &&
      shipperFormData.driverName.includes("/")
    ) {
      // Revert to the original driver name (before the slash)
      handleShipperChange({
        target: {
          name: "driverName",
          value: shipperFormData.driverName.split("/")[0],
        },
      });
    }

    // Clear the remarks2 field if it was added during this edit session
    if (shipperFormData.remarks2) {
      handleShipperChange({
        target: {
          name: "remarks2",
          value: "",
        },
      });
    }
  };

  // Handle capturing the PDF
  const handleCapturePDF = async () => {
    try {
      // Get the entire modal body which contains all content
      const modalBody = document.querySelector(".chakra-modal__body");

      if (!modalBody) {
        toast({
          title: "Error",
          description: "No content found to capture",
          status: "error",
          duration: 3000,
          isClosable: true,
          position: "top-right",
        });
        return;
      }

      toast({
        title: "Processing",
        description: "Generating PDF, please wait...",
        status: "info",
        duration: 3000,
        isClosable: true,
        position: "top-right",
      });

      // Save original styles
      const originalStyles = {
        height: modalBody.style.height,
        maxHeight: modalBody.style.maxHeight,
        overflow: modalBody.style.overflow,
      };

      // Temporarily modify the modal body for capture
      modalBody.style.height = "auto";
      modalBody.style.maxHeight = "none";
      modalBody.style.overflow = "visible";

      // Import html2canvas dynamically
      const html2canvas = (await import("html2canvas")).default;

      // Wait for content to be fully rendered
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Capture the content
      const canvas = await html2canvas(modalBody, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: "#ffffff",
        windowWidth: modalBody.scrollWidth,
        windowHeight: modalBody.scrollHeight,
        imageTimeout: 15000,
        onclone: (clonedDoc) => {
          const clonedBody = clonedDoc.querySelector(".chakra-modal__body");
          if (clonedBody) {
            clonedBody.style.height = "auto";
            clonedBody.style.maxHeight = "none";
            clonedBody.style.overflow = "visible";
            clonedBody.style.transform = "none";
            clonedBody.style.position = "relative";
          }
        },
      });

      // Restore original styles
      modalBody.style.height = originalStyles.height;
      modalBody.style.maxHeight = originalStyles.maxHeight;
      modalBody.style.overflow = originalStyles.overflow;

      // Create PDF with A4 dimensions
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      // Calculate dimensions
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;
      let pageCount = 0;

      // Add first page
      pdf.addImage(
        canvas.toDataURL("image/jpeg", 1.0),
        "JPEG",
        0,
        position,
        imgWidth,
        imgHeight
      );
      heightLeft -= pageHeight;
      pageCount++;

      // Add additional pages if needed
      while (heightLeft >= 0) {
        position = -pageHeight * pageCount;
        pdf.addPage();
        pdf.addImage(
          canvas.toDataURL("image/jpeg", 1.0),
          "JPEG",
          0,
          position,
          imgWidth,
          imgHeight
        );
        heightLeft -= pageHeight;
        pageCount++;
      }

      // Convert to PDF data URI string
      const pdfData = pdf.output("datauristring");

      try {
        // Save to backend
        const response = await axios.post(
          `${process.env.NEXT_PUBLIC_BACKEND_API}/api/waybillSummary/savePDF/${waybillNumber}`,
          { pdfData },
          {
            timeout: 60000,
            headers: {
              "Content-Type": "application/json",
            },
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
          }
        );

        console.log("PDF save response:", response.data);

        toast({
          title: "Success",
          description: "Waybill PDF has been saved successfully",
          status: "success",
          duration: 3000,
          isClosable: true,
          position: "top-right",
        });
      } catch (axiosError) {
        console.error("Axios error details:", axiosError);

        let errorMessage = "Failed to save PDF: ";

        if (axiosError.message === "Network Error") {
          errorMessage +=
            "Network error. The PDF may be too large to transfer.";
        } else if (axiosError.code === "ECONNABORTED") {
          errorMessage +=
            "Request timed out. The server took too long to respond.";
        } else {
          errorMessage += axiosError.message || "Unknown error";
        }

        toast({
          title: "Error",
          description: errorMessage,
          status: "error",
          duration: 5000,
          isClosable: true,
          position: "top-right",
        });
      }
    } catch (error) {
      console.error("Error capturing PDF:", error);
      toast({
        title: "Error",
        description: "Failed to generate PDF: " + error.message,
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "top-right",
      });
    }
  };

  // Function to fetch consignees for the selected shipper
  const fetchConsigneesForShipper = async (shipperName) => {
    if (!shipperName) {
      setShipperConsignees([]);
      return;
    }

    setIsLoadingConsignees(true);
    try {
      // First, find the company by name to get its ID
      const companyResponse = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/companies/search?name=${encodeURIComponent(shipperName)}`
      );

      if (!companyResponse.data || companyResponse.data.length === 0) {
        console.log("No company found with name:", shipperName);
        setShipperConsignees([]);
        setIsLoadingConsignees(false);
        return;
      }

      const company = companyResponse.data[0];
      console.log("Found company:", company);

      try {
        // Then fetch all consignees for this company from MultipleConsignee model
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_BACKEND_API}/api/multiple-consignees/byCompany/${company._id}`
        );

        console.log("Fetched consignees for company:", response.data);

        if (response.data && Array.isArray(response.data)) {
          setShipperConsignees(response.data.map((item) => item.consigneeName));
        } else {
          setShipperConsignees([]);
        }
      } catch (consigneeError) {
        console.log("No consignees found for company:", company._id);
        // If this is a 404 error, it's expected (no consignees for this company)
        if (consigneeError.response && consigneeError.response.status === 404) {
          toast({
            title: "No Consignees Found",
            description: `No consignees found for ${shipperName}`,
            status: "info",
            duration: 3000,
            isClosable: true,
            position: "top-right",
          });
        } else {
          // Other errors should still show an error toast
          console.error("Error fetching consignees:", consigneeError);
          toast({
            title: "Error",
            description: "Failed to load consignees for selected shipper",
            status: "error",
            duration: 3000,
            isClosable: true,
            position: "top-right",
          });
        }
        setShipperConsignees([]);
      }
    } catch (error) {
      console.error("Error fetching company data:", error);
      toast({
        title: "Error",
        description: "Failed to load company data for selected shipper",
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "top-right",
      });
      setShipperConsignees([]);
    } finally {
      setIsLoadingConsignees(false);
    }
  };

  // Function to check if a consignee already exists for this waybill
  const checkConsigneeExists = (waybillNumber, consigneeName) => {
    if (!waybillNumber || !consigneeName) return false;

    // Check if current shipperFormData already has this consignee
    if (
      shipperFormData.waybillNumber === waybillNumber &&
      shipperFormData.consignee === consigneeName
    ) {
      return true;
    }

    // If you have a consignees array that tracks all consignees for this waybill,
    // you can check it here (this depends on the props passed to this component)
    if (consigneeClients && Array.isArray(consigneeClients)) {
      return consigneeClients.some(
        (client) =>
          client.waybillNumber === waybillNumber &&
          client.consigneeName === consigneeName
      );
    }

    return false;
  };

  // Effect to fetch consignees when shipper changes
  useEffect(() => {
    if (shipperFormData.shipper) {
      fetchConsigneesForShipper(shipperFormData.shipper);
    } else {
      setShipperConsignees([]);
    }
  }, [shipperFormData.shipper]);

  // Effect to fetch drivers when editing mode is activated
  useEffect(() => {
    if (isEditingDriver) {
      fetchDriversWithCompletedTrips();
    }
  }, [isEditingDriver]);

  // Function to fetch truck data by plate number
  const fetchTruckData = async (plateNo) => {
    if (!plateNo) return;

    setIsLoadingTruckData(true);
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/trucks/plate/${plateNo}`
      );

      if (response.data) {
        // Update the shipper form data with the body type
        if (response.data.bodyType) {
          handleShipperChange({
            target: {
              name: "bodyType",
              value: response.data.bodyType,
            },
          });
          console.log(
            `Found truck data for ${plateNo}: Body Type = ${response.data.bodyType}`
          );
        } else {
          console.log(`No body type found for plate number: ${plateNo}`);
        }

        // Update the shipper form data with the stub number
        if (response.data.stubNumber) {
          handleShipperChange({
            target: {
              name: "stubNumber",
              value: response.data.stubNumber,
            },
          });
          console.log(
            `Found stub number for ${plateNo}: ${response.data.stubNumber}`
          );
        } else {
          console.log(`No stub number found for plate number: ${plateNo}`);
        }
      }
    } catch (error) {
      console.log(`Truck data not found for plate number: ${plateNo}`);

      // Only show toast for specific errors, not 404 (truck not found is expected)
      if (error.response && error.response.status === 404) {
        // Silent handling for 404 - truck simply doesn't exist yet
        console.log(`Truck with plate ${plateNo} not found in the system`);
      } else if (error.response) {
        // For other API errors, show a toast
        toast({
          title: "Truck Data Unavailable",
          description: `Could not retrieve truck information for ${plateNo}`,
          status: "info",
          duration: 3000,
          isClosable: true,
          position: "top-right",
        });
      } else if (error.request) {
        // For network errors
        toast({
          title: "Network Error",
          description: "Could not connect to the server to retrieve truck data",
          status: "warning",
          duration: 3000,
          isClosable: true,
          position: "top-right",
        });
      }

      // Reset any fields that might have partial data
      handleShipperChange({
        target: {
          name: "bodyType",
          value: "",
        },
      });

      handleShipperChange({
        target: {
          name: "stubNumber",
          value: "",
        },
      });
    } finally {
      setIsLoadingTruckData(false);
    }
  };

  // Effect to fetch truck data when plateNo changes or page loads
  useEffect(() => {
    if (shipperFormData.plateNo) {
      fetchTruckData(shipperFormData.plateNo);
    }
  }, [shipperFormData.plateNo]);

  // Replace the fetchSubLoadingDate function with updated logic that adds one day to the minimum date
  const fetchSubLoadingDate = async (waybillNumber) => {
    try {
      setIsLoading(true);

      console.log(`Fetching subLoadingDate for waybill ${waybillNumber}...`);
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/shipperInfo/subLoadingDate/${waybillNumber}`
      );

      console.log("SubLoadingDate API response:", response.data);

      if (response.data.hasSubLoadingDate) {
        // Add one day to the subLoadingDate to set as minimum allowed date
        const subLoadingDate = new Date(response.data.subLoadingDate);
        const nextDay = new Date(subLoadingDate);
        nextDay.setDate(nextDay.getDate() + 1); // Add one day

        // Format the nextDay date in YYYY-MM-DD format for form input
        const nextDayFormatted = nextDay.toISOString().split("T")[0];

        console.log(
          `Original subLoadingDate: ${response.data.subLoadingDate}, Next day (min allowed): ${nextDayFormatted}`
        );

        // Set date constraints using the day after subLoadingDate
        setDateConstraints({
          minDate: nextDayFormatted,
          maxDate: null, // No maximum date constraint
          tripFound: false,
          subLoadingDateUsed: true,
          message: response.data.message,
          displayDate: response.data.displayDate,
        });

        // Show toast with the subLoadingDate message plus the additional day requirement
        toast({
          title: "Schedule Loading Date",
          description: `You can only select dates from ${formatDateDisplay(nextDayFormatted)} onwards.`,
          status: "info",
          duration: 5000,
          isClosable: true,
          position: "top-right",
        });

        // If we have existing dates, validate them against the next day after subLoadingDate
        if (shipperFormData.date) {
          validateDateAgainstSubLoadingDate(
            "date",
            shipperFormData.date,
            nextDayFormatted
          );
        }

        if (shipperFormData.datePrepared) {
          validateDateAgainstSubLoadingDate(
            "datePrepared",
            shipperFormData.datePrepared,
            nextDayFormatted
          );
        }
      } else {
        // If no subLoadingDate, use tomorrow as the minimum date
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowFormatted = tomorrow.toISOString().split("T")[0];

        setDateConstraints({
          minDate: tomorrowFormatted,
          maxDate: null,
          tripFound: false,
          subLoadingDateUsed: false,
        });

        toast({
          title: "No Schedule Loading Date",
          description:
            "No scheduled loading date found for this waybill. You can select any date from tomorrow onwards.",
          status: "info",
          duration: 4000,
          isClosable: true,
          position: "top-right",
        });
      }
    } catch (error) {
      console.error("Error fetching subLoadingDate:", error);
      toast({
        title: "Error",
        description: `Could not load date constraints: ${error.message}`,
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "top-right",
      });

      // Fallback to tomorrow's date
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowFormatted = tomorrow.toISOString().split("T")[0];

      setDateConstraints({
        minDate: tomorrowFormatted,
        maxDate: null,
        tripFound: false,
        subLoadingDateUsed: false,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Update the validateDateAgainstSubLoadingDate function to be stricter
  const validateDateAgainstSubLoadingDate = (fieldName, dateValue, minDate) => {
    if (!dateValue || !minDate) return true;

    const dateToCheck = new Date(dateValue);
    const minDateObj = new Date(minDate);

    // Reset to midnight for proper comparison
    dateToCheck.setHours(0, 0, 0, 0);
    minDateObj.setHours(0, 0, 0, 0);

    // Check if date is before or equal to minDate
    if (dateToCheck < minDateObj) {
      const displayFieldName =
        fieldName === "date" ? "Date Prepared" : "Date Dispatch";
      const formattedMinDate = formatDateDisplay(minDate);

      toast({
        title: "Invalid Date",
        description: `${displayFieldName} must be on or after ${formattedMinDate} (day after the scheduled loading date)`,
        status: "warning",
        duration: 5000,
        isClosable: true,
        position: "top-right",
      });

      // Reset the field to the min date if it's invalid
      handleShipperChange({
        target: {
          name: fieldName,
          value: minDate,
        },
      });

      return false;
    }

    return true;
  };

  // Simplify the handleDateChangeWithValidation function
  const handleDateChangeWithValidation = (e) => {
    const { name, value } = e.target;

    // Validate against subLoadingDate
    if (dateConstraints.subLoadingDateUsed && dateConstraints.minDate) {
      const isValid = validateDateAgainstSubLoadingDate(
        name,
        value,
        dateConstraints.minDate
      );

      if (!isValid) return;
    }

    // Update the date in the form data
    handleShipperChange(e);

    // When "date" (Date Prepared) is changed, automatically copy to "datePrepared" (Date Dispatch)
    if (name === "date") {
      handleShipperChange({
        target: {
          name: "datePrepared",
          value: value,
        },
      });
    }
  };

  // Helper to format dates for display
  const formatDateDisplay = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  // Add useEffect to fetch subLoadingDate when component loads
  useEffect(() => {
    if (waybillNumber) {
      fetchSubLoadingDate(waybillNumber);
    }
  }, [waybillNumber]);

  return (
    <Box
      bg="white"
      p={6}
      borderRadius="lg"
      boxShadow="md"
      borderWidth="1px"
      borderColor={borderColor}
      h="100%"
      transition="all 0.2s ease"
      position="relative"
      overflow="hidden"
      _hover={{
        boxShadow: "lg",
      }}
    >
      {/* Background decoration */}
      <Box
        position="absolute"
        top={0}
        right={0}
        width="120px"
        height="120px"
        bg={`${primaryColor}10`}
        borderBottomLeftRadius="100%"
        zIndex={0}
      />

      {/* Heading with icon */}
      <Flex
        mb={6}
        align="center"
        borderBottom={`2px solid ${borderColor}`}
        pb={4}
        position="relative"
        zIndex={1}
      >
        <Icon as={FaFileInvoice} color={primaryColor} boxSize={6} mr={3} />
        <Heading size="md" fontWeight="bold" color={primaryColor}>
          Shipper Information
          {isViewOnly && (
            <Badge ml={2} colorScheme="purple" fontSize="xs">
              View Only
            </Badge>
          )}
        </Heading>
        {isShipperInfoSaved && shipperFormData.shipper !== "To be updated" && (
          <Badge
            ml="auto"
            colorScheme="green"
            variant="solid"
            borderRadius="full"
            px={3}
            py={1}
          >
            Saved
          </Badge>
        )}
      </Flex>

      {/* Form Content */}
      <Box position="relative" zIndex={1}>
        <Grid templateColumns="repeat(2, 1fr)" gap={5}>
          {/* Shipper */}
          <GridItem colSpan={2}>
            <FormControl isRequired>
              <FormLabel
                htmlFor="shipper"
                fontWeight="bold"
                fontSize="sm"
                display="flex"
                alignItems="center"
              >
                <Text>Shipper</Text>
                <Tooltip
                  label="Select shipping company or individual"
                  fontSize="xs"
                >
                  <Box as="span" ml={1} color="gray.400" fontSize="xs">
                    <Icon as={InfoIcon} />
                  </Box>
                </Tooltip>
              </FormLabel>

              {/* Add button to toggle between company and individual mode */}
              <Button
                display="none"
                mb={2}
                size="sm"
                colorScheme={isIndividualMode ? "blue" : "gray"}
                onClick={toggleIndividualMode}
                leftIcon={<Icon as={isIndividualMode ? FaUser : FaBuilding} />}
                isDisabled={isViewOnly}
              >
                {isIndividualMode ? "Individual Mode" : "Company Mode"}
              </Button>

              <Select
                name="shipper"
                value={shipperFormData.shipper}
                onChange={(e) => {
                  handleShipperChange(e);
                  fetchConsigneesForShipper(e.target.value);
                }}
                borderColor={borderColor}
                _hover={{ borderColor: secondaryColor }}
                _focus={{
                  borderColor: secondaryColor,
                  boxShadow: `0 0 0 1px ${secondaryColor}`,
                }}
                size="md"
                borderRadius="md"
                bg="white"
                icon={<ChevronDownIcon />}
                iconSize="20px"
                isDisabled={isViewOnly}
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
                  : [
                      <option key="select-company" value="">
                        Select Company
                      </option>,
                      ...companies.map((company) => (
                        <option key={company._id} value={company.companyName}>
                          {company.companyName}
                        </option>
                      )),
                    ]}
              </Select>
            </FormControl>
          </GridItem>

          {/* Store Type */}
          <GridItem colSpan={2}>
            <FormControl isRequired mt={2}>
              <FormLabel
                fontWeight="semibold"
                fontSize="sm"
                color={primaryColor}
                mb={1}
                display="flex"
                alignItems="center"
              >
                <Text>Store Type</Text>
                <Tooltip label="Select the store type" fontSize="xs">
                  <Box as="span" ml={1} color="gray.400" fontSize="xs">
                    <Icon as={InfoIcon} />
                  </Box>
                </Tooltip>
              </FormLabel>
              <Select
                name="storeType"
                value={shipperFormData.storeType || "Select Store Type"}
                onChange={handleShipperChange}
                borderColor={borderColor}
                _hover={{ borderColor: secondaryColor }}
                _focus={{
                  borderColor: secondaryColor,
                  boxShadow: `0 0 0 1px ${secondaryColor}`,
                }}
                size="md"
                borderRadius="md"
                bg="white"
                icon={<ChevronDownIcon />}
                iconSize="20px"
                isDisabled={isViewOnly}
              >
                <option value="Select Store Type">Select Store Type</option>
                <option value="DC">DC</option>
                <option value="STORE">STORE</option>
              </Select>
            </FormControl>
          </GridItem>

          {/* Store Selector - only shown when storeType is STORE */}
          {shipperFormData.storeType === "STORE" && (
            <GridItem colSpan={2}>
              <FormControl mt={2}>
                <FormLabel
                  fontWeight="bold"
                  fontSize="sm"
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
                  {isLoadingConsignees ? (
                    <Flex align="center" justify="center" py={2}>
                      <CircularProgress
                        size="24px"
                        isIndeterminate
                        color={primaryColor}
                      />
                      <Text ml={3} fontSize="sm" color="gray.600">
                        Loading consignees...
                      </Text>
                    </Flex>
                  ) : (
                    <>
                      <SearchableSelect
                        value={shipperFormData.consignee}
                        onChange={handleConsigneeChange}
                        options={
                          shipperConsignees.length > 0
                            ? shipperConsignees
                                .filter(
                                  (consignee) =>
                                    !checkConsigneeExists(
                                      waybillNumber,
                                      consignee
                                    )
                                )
                                .map((consignee) => ({
                                  value: consignee,
                                  label: shipperEntityAbbreviation
                                    ? `${shipperEntityAbbreviation} - ${consignee}`
                                    : consignee,
                                }))
                            : []
                        }
                        placeholder={
                          !shipperFormData.shipper
                            ? "Select a shipper first"
                            : shipperConsignees.length === 0
                              ? "No consignees found for selected shipper"
                              : isIndividualMode
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
                        isDisabled={
                          !shipperFormData.shipper ||
                          shipperConsignees.length === 0 ||
                          isViewOnly
                        }
                      />
                      <Button
                        size="sm"
                        leftIcon={<AddIcon />}
                        mt={2}
                        colorScheme="teal"
                        variant="outline"
                        onClick={() => {
                          console.log("Add Store button clicked");
                          console.log(
                            "Current shipperFormData:",
                            shipperFormData
                          );
                          console.log(
                            "Consignee value:",
                            shipperFormData.consignee
                          );

                          if (
                            shipperFormData.consignee &&
                            shipperFormData.consignee.trim() !== ""
                          ) {
                            // Check if the consignee already exists in the clients list
                            const exists = consigneeClients.some(
                              (client) =>
                                client.consigneeName ===
                                shipperFormData.consignee
                            );

                            console.log("Consignee exists check:", exists);
                            console.log("consigneeClients:", consigneeClients);

                            if (!exists) {
                              console.log(
                                "About to call saveNewConsignees with:",
                                shipperFormData.consignee
                              );
                              try {
                                saveNewConsignees(shipperFormData.consignee);
                                console.log("saveNewConsignees completed");
                              } catch (error) {
                                console.error(
                                  "Error in saveNewConsignees:",
                                  error
                                );
                                toast({
                                  title: "Error Adding Store",
                                  description:
                                    error.message || "Failed to add store",
                                  status: "error",
                                  duration: 3000,
                                  isClosable: true,
                                  position: "top-center",
                                });
                              }
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
                        isDisabled={isViewOnly}
                      >
                        Add Store
                      </Button>
                    </>
                  )}
                </Box>
              </FormControl>
            </GridItem>
          )}

          {/* Date and Date Prepared */}
          <GridItem>
            <FormControl isRequired>
              <FormLabel
                fontWeight="semibold"
                fontSize="sm"
                color={primaryColor}
                mb={1}
              >
                Date Prepared
              </FormLabel>
              <InputGroup size="md">
                <Input
                  name="date"
                  type="date"
                  value={formatDateForInput(shipperFormData.date)}
                  onChange={handleDateChangeWithValidation}
                  borderColor={borderColor}
                  _hover={{ borderColor: secondaryColor }}
                  _focus={{
                    borderColor: secondaryColor,
                    boxShadow: `0 0 0 1px ${secondaryColor}`,
                  }}
                  borderRadius="md"
                  min={dateConstraints.minDate || dateRange.minDate}
                  max={dateConstraints.maxDate || undefined}
                  isDisabled={isViewOnly}
                  onDoubleClick={(e) => e.currentTarget.showPicker()}
                />
                <InputRightElement>
                  {isLoading ? (
                    <CircularProgress
                      size="20px"
                      isIndeterminate
                      color="blue.300"
                    />
                  ) : (
                    <CalendarIcon color="gray.400" />
                  )}
                </InputRightElement>
              </InputGroup>
            </FormControl>
          </GridItem>
          <GridItem>
            <FormControl>
              <FormLabel
                fontWeight="semibold"
                fontSize="sm"
                color={primaryColor}
                mb={1}
              >
                Date Dispatch
              </FormLabel>
              <InputGroup size="md">
                <Input
                  name="datePrepared"
                  type="date"
                  value={formatDateForInput(shipperFormData.datePrepared)}
                  onChange={handleDateChangeWithValidation}
                  borderColor={borderColor}
                  _hover={{ borderColor: secondaryColor }}
                  _focus={{
                    borderColor: secondaryColor,
                    boxShadow: `0 0 0 1px ${secondaryColor}`,
                  }}
                  borderRadius="md"
                  min={dateConstraints.minDate || dateRange.minDate}
                  max={dateConstraints.maxDate || undefined}
                  isDisabled={isViewOnly}
                  onDoubleClick={(e) => e.currentTarget.showPicker()}
                />
                <InputRightElement>
                  {isLoading ? (
                    <CircularProgress
                      size="20px"
                      isIndeterminate
                      color="blue.300"
                    />
                  ) : (
                    <CalendarIcon color="gray.400" />
                  )}
                </InputRightElement>
              </InputGroup>
            </FormControl>
          </GridItem>

          {/* Sub Loading Date - only show when it has a value */}
          {shipperFormData.subLoadingDate && (
            <GridItem colSpan={2}>
              <FormControl>
                <FormLabel
                  fontWeight="semibold"
                  fontSize="sm"
                  color={primaryColor}
                  mb={1}
                  display="flex"
                  alignItems="center"
                >
                  <Text>Schedule Loading Date</Text>
                </FormLabel>
                <Box
                  p={3}
                  borderRadius="md"
                  borderWidth="1px"
                  borderColor={borderColor}
                  bg="blue.50"
                >
                  <Text fontSize="sm" fontWeight="medium" color="blue.700">
                    {formatDateForInput(shipperFormData.subLoadingDate)
                      .split("-")
                      .reverse()
                      .join("/")}
                  </Text>
                </Box>
              </FormControl>
            </GridItem>
          )}

          {/* Pickup Address */}
          <GridItem colSpan={2}>
            <FormControl>
              <FormLabel
                fontWeight="semibold"
                fontSize="sm"
                color={primaryColor}
                mb={1}
                display="flex"
                alignItems="center"
              >
                <Text>Business Address </Text>
              </FormLabel>
              {shipperFormData.pickupAddress ? (
                <Box
                  p={3}
                  borderRadius="md"
                  borderWidth="1px"
                  borderColor={borderColor}
                  isDisabled
                  _disabled={{
                    opacity: 1, // Ensure text remains fully visible
                    color: "Black",
                  }}
                  bg="gray.100"
                  _hover={{ cursor: "not-allowed" }}
                >
                  <Text fontSize="sm" color="gray.700">
                    {shipperFormData.pickupAddress}
                  </Text>
                </Box>
              ) : (
                <Box
                  p={3}
                  borderRadius="md"
                  borderWidth="1px"
                  borderColor={borderColor}
                  borderStyle="dashed"
                  bg="gray.50"
                >
                  <Text fontSize="sm" color="gray.500" fontStyle="italic">
                    Address will appear here after selecting a shipper
                  </Text>
                </Box>
              )}
            </FormControl>
          </GridItem>

          {/* Driver details */}
          <GridItem>
            <FormControl>
              <FormLabel
                fontWeight="semibold"
                fontSize="sm"
                color={primaryColor}
                mb={1}
                display="flex"
                alignItems="center"
              >
                <Text>Driver's Name</Text>
                <Icon as={FaUser} ml={1} boxSize={3} color="gray.400" />
                {!isEditingDriver && (
                  <Button
                    size="xs"
                    ml={2}
                    leftIcon={<Icon as={FaEdit} />}
                    colorScheme="teal"
                    variant="outline"
                    onClick={handleEditDriverClick}
                    isDisabled={isViewOnly}
                  >
                    Add Driver
                  </Button>
                )}
              </FormLabel>

              {isEditingDriver ? (
                <Box position="relative">
                  <Flex mb={2}>
                    <InputGroup>
                      <Input
                        name="driverName"
                        value={shipperFormData.driverName || ""}
                        onChange={handleDriverInputChange}
                        placeholder="Search for drivers..."
                        borderColor={borderColor}
                        _hover={{ borderColor: secondaryColor }}
                        _focus={{
                          borderColor: secondaryColor,
                          boxShadow: `0 0 0 1px ${secondaryColor}`,
                        }}
                        borderRadius="md"
                        autoComplete="off"
                        isDisabled={isViewOnly}
                      />
                      <InputRightElement>
                        {isLoadingDrivers ? (
                          <CircularProgress
                            size="20px"
                            isIndeterminate
                            color="blue.300"
                          />
                        ) : (
                          <SearchIcon color="gray.400" />
                        )}
                      </InputRightElement>
                    </InputGroup>
                    <Button
                      ml={2}
                      colorScheme="red"
                      variant="ghost"
                      size="sm"
                      fontSize="sm"
                      onClick={handleCancelDriverEdit}
                      leftIcon={<Icon as={FaTimes} />}
                      isDisabled={isViewOnly}
                    >
                      Cancel
                    </Button>
                  </Flex>

                  {/* Show drivers directly under the input instead of in a Popover */}
                  {isSearchPopoverOpen && (
                    <Box
                      position="absolute"
                      top="100%"
                      left="0"
                      width="100%"
                      bg="white"
                      boxShadow="md"
                      borderRadius="md"
                      maxH="200px"
                      overflowY="auto"
                      zIndex={1500}
                      mt="2px"
                      border="1px solid"
                      borderColor="gray.200"
                    >
                      <List spacing={0}>
                        {isLoadingDrivers ? (
                          <ListItem p={4} textAlign="center">
                            <CircularProgress
                              size="30px"
                              isIndeterminate
                              color="blue.300"
                            />
                          </ListItem>
                        ) : filteredDrivers.length > 0 ? (
                          filteredDrivers.map((driver, index) => (
                            <ListItem
                              key={index}
                              p={2}
                              _hover={{ bg: "gray.100" }}
                              cursor="pointer"
                              onClick={() => handleDriverSelect(driver)}
                            >
                              {driver}
                            </ListItem>
                          ))
                        ) : (
                          <ListItem p={2}>No matching drivers found</ListItem>
                        )}
                      </List>
                    </Box>
                  )}
                </Box>
              ) : shipperFormData.driverName ? (
                <Box
                  p={3}
                  borderRadius="md"
                  borderWidth="1px"
                  borderColor={borderColor}
                  isDisabled
                  _disabled={{
                    opacity: 1, // Ensure text remains fully visible
                    color: "Black",
                  }}
                  bg="gray.100"
                  _hover={{ cursor: "not-allowed" }}
                >
                  <Text fontSize="sm" fontWeight="medium" color="gray.700">
                    {shipperFormData.driverName}
                  </Text>
                </Box>
              ) : (
                <Box
                  p={3}
                  borderRadius="md"
                  borderWidth="1px"
                  borderColor={borderColor}
                  borderStyle="dashed"
                  bg="gray.50"
                >
                  <Text fontSize="sm" color="gray.500" fontStyle="italic">
                    Not available
                  </Text>
                </Box>
              )}
            </FormControl>
          </GridItem>

          {/* Remarks2 field - shown when a driver is added */}
          {(isEditingDriver || shipperFormData.remarks2) && (
            <GridItem>
              <FormControl mt={2}>
                <FormLabel
                  fontWeight="semibold"
                  fontSize="sm"
                  color={primaryColor}
                  mb={1}
                  display="flex"
                  alignItems="center"
                >
                  <Text>Remarks for Driver</Text>
                  <Tooltip label="Additional notes for driver" fontSize="xs">
                    <Box as="span" ml={1} color="gray.400" fontSize="xs">
                      <Icon as={InfoIcon} />
                    </Box>
                  </Tooltip>
                </FormLabel>
                <Textarea
                  name="remarks2"
                  value={shipperFormData.remarks2 || ""}
                  onChange={handleShipperChange}
                  borderColor={borderColor}
                  _hover={{ borderColor: secondaryColor }}
                  _focus={{
                    borderColor: secondaryColor,
                    boxShadow: `0 0 0 1px ${secondaryColor}`,
                  }}
                  borderRadius="md"
                  bg="white"
                  placeholder="Enter additional remarks for driver"
                  rows={2}
                  readOnly={!isEditingDriver && !isViewOnly}
                  isDisabled={isViewOnly}
                />
              </FormControl>
            </GridItem>
          )}

          {/* Plate No. */}
          <GridItem>
            <FormControl>
              <FormLabel
                fontWeight="semibold"
                fontSize="sm"
                color={primaryColor}
                mb={1}
                display="flex"
                alignItems="center"
              >
                <Text>Plate No.</Text>
                <Icon as={FaTruck} ml={1} boxSize={3} color="gray.400" />
              </FormLabel>
              {shipperFormData.plateNo ? (
                <Box
                  p={3}
                  borderRadius="md"
                  borderWidth="1px"
                  borderColor={borderColor}
                  isDisabled
                  _disabled={{
                    opacity: 1, // Ensure text remains fully visible
                    color: "Black",
                  }}
                  bg="gray.100"
                  _hover={{ cursor: "not-allowed" }}
                >
                  <Text fontSize="sm" fontWeight="medium" color="gray.700">
                    {shipperFormData.plateNo}
                  </Text>
                </Box>
              ) : (
                <Box
                  p={3}
                  borderRadius="md"
                  borderWidth="1px"
                  borderColor={borderColor}
                  borderStyle="dashed"
                  bg="gray.50"
                >
                  <Text fontSize="sm" color="gray.500" fontStyle="italic">
                    Not available
                  </Text>
                </Box>
              )}
            </FormControl>
          </GridItem>

          {/* Body Type - Add this new field */}
          <GridItem>
            <FormControl>
              <FormLabel
                fontWeight="semibold"
                fontSize="sm"
                color={primaryColor}
                mb={1}
                display="flex"
                alignItems="center"
              >
                <Text>Body Type</Text>
                <Tooltip label="Truck body type" fontSize="xs">
                  <Box as="span" ml={1} color="gray.400" fontSize="xs">
                    <Icon as={InfoIcon} />
                  </Box>
                </Tooltip>
              </FormLabel>
              {isLoadingTruckData ? (
                <Flex
                  align="center"
                  justify="center"
                  p={3}
                  borderRadius="md"
                  borderWidth="1px"
                  borderColor={borderColor}
                >
                  <CircularProgress
                    size="20px"
                    isIndeterminate
                    color={primaryColor}
                  />
                  <Text ml={2} fontSize="sm" color="gray.500">
                    Loading...
                  </Text>
                </Flex>
              ) : shipperFormData.bodyType ? (
                <Box
                  p={3}
                  borderRadius="md"
                  borderWidth="1px"
                  borderColor={borderColor}
                  bg="gray.100"
                  _hover={{ cursor: "not-allowed" }}
                >
                  <Text fontSize="sm" fontWeight="medium" color="gray.700">
                    {shipperFormData.bodyType}
                  </Text>
                </Box>
              ) : (
                <Box
                  p={3}
                  borderRadius="md"
                  borderWidth="1px"
                  borderColor={borderColor}
                  borderStyle="dashed"
                  bg="gray.50"
                >
                  <Text fontSize="sm" color="gray.500" fontStyle="italic">
                    {shipperFormData.plateNo
                      ? "No body type found"
                      : "Will be fetched when plate number is available"}
                  </Text>
                </Box>
              )}
            </FormControl>
          </GridItem>

          {/* Stub Number - New field */}
          <GridItem>
            <FormControl>
              <FormLabel
                fontWeight="semibold"
                fontSize="sm"
                color={primaryColor}
                mb={1}
                display="flex"
                alignItems="center"
              >
                <Text>Stub Number</Text>
                <Tooltip
                  label="Waybill stub number associated with this truck"
                  fontSize="xs"
                >
                  <Box as="span" ml={1} color="gray.400" fontSize="xs">
                    <Icon as={InfoIcon} />
                  </Box>
                </Tooltip>
              </FormLabel>
              {isLoadingTruckData ? (
                <Flex
                  align="center"
                  justify="center"
                  p={3}
                  borderRadius="md"
                  borderWidth="1px"
                  borderColor={borderColor}
                >
                  <CircularProgress
                    size="20px"
                    isIndeterminate
                    color={primaryColor}
                  />
                  <Text ml={2} fontSize="sm" color="gray.500">
                    Loading...
                  </Text>
                </Flex>
              ) : shipperFormData.stubNumber ? (
                <Box
                  p={3}
                  borderRadius="md"
                  borderWidth="1px"
                  borderColor={borderColor}
                  bg="gray.100"
                  _hover={{ cursor: "not-allowed" }}
                >
                  <Text fontSize="sm" fontWeight="medium" color="gray.700">
                    {shipperFormData.stubNumber}
                  </Text>
                </Box>
              ) : (
                <Box
                  p={3}
                  borderRadius="md"
                  borderWidth="1px"
                  borderColor={borderColor}
                  borderStyle="dashed"
                  bg="gray.50"
                >
                  <Text fontSize="sm" color="gray.500" fontStyle="italic">
                    {shipperFormData.plateNo
                      ? "No stub number found"
                      : "Will be fetched when plate number is available"}
                  </Text>
                </Box>
              )}
            </FormControl>
          </GridItem>

          {/* Remarks field - only shown when storeType is STORE */}
          {shipperFormData.storeType === "STORE" && (
            <GridItem colSpan={2}>
              <FormControl mt={2}>
                <FormLabel
                  fontWeight="semibold"
                  fontSize="sm"
                  color={primaryColor}
                  mb={1}
                  display="flex"
                  alignItems="center"
                >
                  <Text>Remarks</Text>
                  <Tooltip
                    label="Additional notes for store type"
                    fontSize="xs"
                  >
                    <Box as="span" ml={1} color="gray.400" fontSize="xs">
                      <Icon as={InfoIcon} />
                    </Box>
                  </Tooltip>
                </FormLabel>
                <Textarea
                  name="remarks"
                  value={shipperFormData.remarks || ""}
                  onChange={handleShipperChange}
                  borderColor={borderColor}
                  _hover={{ borderColor: secondaryColor }}
                  _focus={{
                    borderColor: secondaryColor,
                    boxShadow: `0 0 0 1px ${secondaryColor}`,
                  }}
                  borderRadius="md"
                  bg="white"
                  placeholder="Enter additional remarks for store"
                  rows={3}
                  isDisabled={isViewOnly}
                />
              </FormControl>
            </GridItem>
          )}

          {/* Total Truck CBM */}
          <GridItem colSpan={2} display="none">
            <FormControl mt={2}>
              <FormLabel
                fontWeight="semibold"
                fontSize="sm"
                color={primaryColor}
                mb={1}
                display="flex"
                alignItems="center"
              >
                <Text>Total Truck CBM</Text>
                <Tooltip
                  label="Total cubic meters capacity of the truck"
                  fontSize="xs"
                >
                  <Box as="span" ml={1} color="gray.400" fontSize="xs">
                    <Icon as={InfoIcon} />
                  </Box>
                </Tooltip>
              </FormLabel>
              <InputGroup>
                <Input
                  name="totalTruckCbm"
                  type="number"
                  value={truckCbm || ""}
                  onChange={handleTotalTruckCbmChange}
                  borderColor={borderColor}
                  _hover={{ borderColor: secondaryColor }}
                  _focus={{
                    borderColor: secondaryColor,
                    boxShadow: `0 0 0 1px ${secondaryColor}`,
                  }}
                  borderRadius="md"
                  bg="white"
                  placeholder="Enter truck CBM"
                  isDisabled={isViewOnly}
                />
              </InputGroup>
            </FormControl>
          </GridItem>
        </Grid>

        {/* Save Button */}
        {!isViewOnly && (
          <Button
            size="md"
            width="full"
            mt={6}
            onClick={handleSaveShipperInfo}
            fontSize="md"
            fontWeight="semibold"
            bgColor={primaryColor}
            color="white"
            _hover={{
              bg: secondaryColor,
              transform: "translateY(-1px)",
            }}
            _active={{
              transform: "translateY(0)",
            }}
            transition="all 0.2s ease"
            boxShadow="sm"
            height="48px"
            leftIcon={<Icon as={isShipperInfoSaved ? FaCheck : FaSave} />}
          >
            {isShipperInfoSaved
              ? "Update Shipper Information"
              : "Save Shipper Information"}
          </Button>
        )}

        {/* Capture PDF Button */}
        {!isViewOnly && (
          <Button
            size="md"
            width="full"
            mt={3}
            onClick={handleCapturePDF}
            fontSize="md"
            fontWeight="semibold"
            bgColor="maroon"
            color="white"
            _hover={{
              bg: "teal.600",
              transform: "translateY(-1px)",
            }}
            _active={{
              transform: "translateY(0)",
            }}
            transition="all 0.2s ease"
            boxShadow="sm"
            height="48px"
            leftIcon={<Icon as={FaCamera} />}
            rightIcon={<Icon as={FaFilePdf} />}
            isDisabled={!isShipperInfoSaved || isViewOnly}
          >
            Generate Softcopy
          </Button>
        )}
      </Box>
    </Box>
  );
};

export default ShipperInformation;
