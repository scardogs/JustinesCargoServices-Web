import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  Box,
  VStack,
  HStack,
  Text,
  Grid,
  GridItem,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Flex,
  Heading,
  Checkbox,
  Image,
  Divider,
  Select,
  Input,
  FormControl,
  FormLabel,
  Radio,
  RadioGroup,
  Button,
  useToast,
  Spinner,
  IconButton,
  Badge,
  useDisclosure, // Added for Modal
  Modal, // Added for Modal
  ModalOverlay, // Added for Modal
  ModalContent, // Added for Modal
  ModalHeader, // Added for Modal
  ModalFooter, // Added for Modal
  ModalBody, // Added for Modal
  ModalCloseButton, // Added for Modal
  Popover, // Added for Context Menu
  PopoverTrigger, // Added for Context Menu
  PopoverContent, // Added for Context Menu
  PopoverArrow, // Added for Context Menu
  PopoverBody, // Added for Context Menu
  PopoverAnchor, // Added for Context Menu
  InputGroup, // Added for Search Icon
  InputLeftElement, // Added for Search Icon
  Tooltip, // Added for Amount Tooltip
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
} from "@chakra-ui/react";
import {
  CalendarIcon,
  DownloadIcon,
  EditIcon,
  InfoIcon,
  AddIcon,
  CloseIcon,
  SearchIcon, // Added for Search Icon
  ChevronDownIcon,
  RepeatIcon,
} from "@chakra-ui/icons";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import axios from "axios";
import { useRouter } from "next/router"; // Added for WaybillBody
import WaybillBody from "../WaybillManagement/waybillbody"; // Added for View Drops
// import { useAuth } from "../../context/AuthContext"; // REMOVED

// DnD Kit Imports
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { DragHandleIcon } from "@chakra-ui/icons"; // Import drag handle icon

// Add this number formatting function near the top with other utility functions
const formatCurrency = (value) => {
  if (!value) return "";
  const number = parseFloat(value);
  if (isNaN(number)) return "";
  return `₱${number.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

// Fix PDF formatting by adding a dedicated PDF currency formatter
const formatCurrencyForPDF = (value) => {
  if (!value) return "";
  const number = parseFloat(value);
  if (isNaN(number)) return "";
  // Use standard formatting without locale-specific features that might cause spacing issues
  return `₱${number.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
};

const BillingPaper = ({
  billingData = {},
  isEditing = false,
  onClose,
  onDataChange,
  isReadOnly = false,
}) => {
  // Debug log to see what's being passed
  useEffect(() => {
    if (billingData && (isEditing || isReadOnly)) {
      console.log("BillingPaper received data:", {
        billingData,
        isEditing,
        isReadOnly,
        invoiceDate: billingData.invoiceDate,
        dateType: billingData.invoiceDate
          ? typeof billingData.invoiceDate
          : "undefined",
        dateString: billingData.invoiceDate
          ? new Date(billingData.invoiceDate).toISOString()
          : "N/A",
      });
    }
  }, [billingData, isEditing, isReadOnly]);

  const toast = useToast();
  const [previousUsedNumber, setPreviousUsedNumber] = useState(null);
  const [nextSuggestedNumber, setNextSuggestedNumber] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // Add loading state for async operations
  const [billingType, setBillingType] = useState(
    billingData.billingType || "perWaybill"
  );

  // Add new state variables for manual customer input
  const [manualCustomerName, setManualCustomerName] = useState("");
  const [manualAddress, setManualAddress] = useState("");
  const [manualTin, setManualTin] = useState("");

  // Calculate date limits - today and 30 days ago
  const today = new Date().toISOString().split("T")[0];
  // Set minDate to invoiceDate if present, otherwise today
  const minDate = billingData.invoiceDate
    ? new Date(billingData.invoiceDate).toISOString().split("T")[0]
    : today;

  const [selectedCustomer, setSelectedCustomer] = useState(
    billingData.storeName || ""
  );
  const [selectedDate, setSelectedDate] = useState(
    billingData.invoiceDate
      ? new Date(billingData.invoiceDate).toISOString().split("T")[0]
      : today
  );
  const [headerPaymentMethod, setHeaderPaymentMethod] = useState(
    billingData.headerPaymentMethod || "CHARGE"
  );
  const [bottomPaymentMethod, setBottomPaymentMethod] = useState(
    billingData.bottomPaymentMethod || "CASH"
  );
  const [companies, setCompanies] = useState([]);
  const [waybillNumbers, setWaybillNumbers] = useState([]);
  const [checkedWaybills, setCheckedWaybills] = useState({});
  const [selectedInvoiceNumber, setSelectedInvoiceNumber] = useState("");
  const [availableInvoiceNumbers, setAvailableInvoiceNumbers] = useState([]);
  const invoiceRef = useRef();
  const [waybillSearchTerm, setWaybillSearchTerm] = useState(""); // State for search term
  const scrollContainerRef = useRef(null); // <<< Add ref for scroll container
  const scrollPositionToRestoreRef = useRef(null); // <<< Add ref to store scroll position temporarily

  // State to store calculated totals, initialized with empty values
  const [calculatedTotals, setCalculatedTotals] = useState({
    gross: "",
    vat: "",
    net: "",
    withTax: "",
    netAmount: "",
  });

  // Add new state for manual service entries
  const [manualEntries, setManualEntries] = useState([
    { id: Date.now(), description: "", amount: "" },
  ]);

  const [editingRow, setEditingRow] = useState(null);

  // Function to add new row
  const addRow = () => {
    setManualEntries([
      ...manualEntries,
      { id: Date.now(), description: "", amount: "" },
    ]);
  };

  // Function to remove row
  const removeRow = (idToRemove) => {
    if (manualEntries.length > 1) {
      // Keep at least one row
      setManualEntries(
        manualEntries.filter((entry) => entry.id !== idToRemove)
      );
    }
  };

  // Function to update manual entry
  const updateManualEntry = (id, field, value) => {
    setManualEntries(
      manualEntries.map((entry) => {
        if (entry.id === id) {
          if (field === "amount") {
            // Remove non-numeric characters except decimal point
            const numericValue = value.replace(/[^\d.]/g, "");
            // Ensure only one decimal point
            const parts = numericValue.split(".");
            const formattedValue =
              parts[0] + (parts.length > 1 ? "." + parts[1].slice(0, 2) : "");
            return { ...entry, [field]: formattedValue };
          }
          return { ...entry, [field]: value };
        }
        return entry;
      })
    );
  };

  // Add function to get the previous and next numbers
  const updateServiceInvoiceNumbers = async () => {
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/service-invoice`
      );
      const serviceInvoices = response.data;

      let allInvoiceNumbers = [];
      // Flatten all invoice numbers and convert to integers
      serviceInvoices.forEach((stubGroup) => {
        if (stubGroup.invoices) {
          stubGroup.invoices.forEach((invoice) => {
            if (invoice.status === "USED") {
              allInvoiceNumbers.push(parseInt(invoice.invoiceNumber));
            }
          });
        }
      });

      if (allInvoiceNumbers.length > 0) {
        // Sort numbers to find the latest used
        allInvoiceNumbers.sort((a, b) => b - a);
        const lastUsed = allInvoiceNumbers[0];
        setPreviousUsedNumber(lastUsed);
        setNextSuggestedNumber(lastUsed + 1);
      } else {
        setPreviousUsedNumber(0);
        setNextSuggestedNumber(1);
      }
    } catch (error) {
      console.error("Error fetching service invoice numbers:", error);
    }
  };

  // Call the function when component mounts
  useEffect(() => {
    updateServiceInvoiceNumbers();
  }, []);

  // Fetch available service invoice numbers
  useEffect(() => {
    const fetchServiceInvoices = async () => {
      try {
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_BACKEND_API}/api/service-invoice`
        );
        // Filter for unused invoices and format them
        let unusedInvoices = response.data
          .flatMap((stub) => stub.invoices)
          .filter((invoice) => invoice.status === "UNUSED")
          .map((invoice) => ({
            value: invoice.invoiceNumber,
            label: invoice.invoiceNumber,
          }));

        // If editing, include the current invoice number in the options
        if (isEditing && billingData.siNumber) {
          const existingInvoiceExists = unusedInvoices.some(
            (invoice) => invoice.value === billingData.siNumber
          );
          if (!existingInvoiceExists) {
            unusedInvoices.push({
              value: billingData.siNumber,
              label: `${billingData.siNumber} (Current)`,
            });
          }
          // Sort invoice numbers numerically
          unusedInvoices.sort((a, b) => parseInt(a.value) - parseInt(b.value));
        }

        setAvailableInvoiceNumbers(unusedInvoices);

        // If editing and there's an existing invoice number, select it
        if (isEditing && billingData.siNumber) {
          setSelectedInvoiceNumber(billingData.siNumber);
        }
      } catch (error) {
        console.error("Error fetching service invoices:", error);
        toast({
          title: "Error",
          description: "Failed to fetch service invoice numbers",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      }
    };

    fetchServiceInvoices();
  }, [isEditing, billingData.siNumber]);

  // Initialize data in read-only mode
  useEffect(() => {
    if (isReadOnly && billingData) {
      console.log(
        "Initializing read-only mode with billing data:",
        billingData
      );

      // Immediately set customer selection and other form fields
      setSelectedCustomer(billingData.storeName || "");
      setSelectedDate(
        billingData.invoiceDate
          ? new Date(billingData.invoiceDate).toISOString().split("T")[0]
          : today
      );
      setHeaderPaymentMethod(billingData.headerPaymentMethod || "CHARGE");
      setBottomPaymentMethod(billingData.bottomPaymentMethod || "CASH");

      // Set correct billing type based on the billing data
      setBillingType(billingData.billingType || "perWaybill");

      // For manual entry billing types, initialize the customer fields
      if (billingData.billingType && billingData.billingType !== "perWaybill") {
        setManualCustomerName(billingData.storeName || "");
        setManualAddress(billingData.address || "");
        setManualTin(billingData.tin || "");
      }

      fetchBillingDetails();
    }
  }, [isReadOnly, billingData, today]);

  // Initialize data in edit mode
  useEffect(() => {
    if (isEditing && billingData) {
      console.log("Initializing edit mode with billing data:", billingData);
      console.log("Invoice date from billing data:", billingData.invoiceDate);

      // Immediately set customer selection and other form fields
      setSelectedCustomer(billingData.storeName || "");

      // Ensure the date is properly formatted and set
      if (billingData.invoiceDate) {
        const dateObj = new Date(billingData.invoiceDate);
        const formattedDate = dateObj.toISOString().split("T")[0];
        console.log("Setting date to:", formattedDate);
        setSelectedDate(formattedDate);
      } else {
        setSelectedDate(today);
      }

      setHeaderPaymentMethod(billingData.headerPaymentMethod || "CHARGE");
      setBottomPaymentMethod(billingData.bottomPaymentMethod || "CASH");

      // Set correct billing type based on the billing data
      setBillingType(billingData.billingType || "perWaybill");

      // For manual entry billing types, initialize the customer fields
      if (billingData.billingType && billingData.billingType !== "perWaybill") {
        setManualCustomerName(billingData.storeName || "");
        setManualAddress(billingData.address || "");
        setManualTin(billingData.tin || "");
      }

      fetchBillingDetails();
    }
  }, [isEditing, billingData, today]);

  const formatTIN = (tin) => {
    if (!tin) return "";
    // Remove any existing non-digit characters
    const cleanTin = tin.replace(/\D/g, "");
    // Format as XXX-XXX-XXXXX
    return cleanTin.replace(/^(\d{3})(\d{3})(\d{5})$/, "$1-$2-$3");
  };

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        // Fetch all necessary data individually with error handling
        let entityResponseData,
          companiesResponseData,
          billingDetailsResponseData,
          billingResponseData;

        // Fetch Entity Abbreviations
        try {
          const entityResponse = await axios.get(
            `${process.env.NEXT_PUBLIC_BACKEND_API}/api/entity-abbreviation-summary`
          );
          entityResponseData = entityResponse.data;
          console.log("Successfully fetched /api/entity-abbreviation-summary");
        } catch (fetchError) {
          console.error(
            "Error fetching /api/entity-abbreviation-summary:",
            fetchError
          );
          // Decide how to handle this error - maybe set companies to empty and return?
          toast({
            title: "Error",
            description: "Failed to load entity abbreviations.",
            status: "error",
            duration: 5000,
            isClosable: true,
          });
          // return; // Optionally exit if this data is critical
        }

        // Fetch Companies
        try {
          const companiesResponse = await axios.get(
            `${process.env.NEXT_PUBLIC_BACKEND_API}/api/companies`
          );
          companiesResponseData = companiesResponse.data;
          console.log("Successfully fetched /api/companies");
        } catch (fetchError) {
          console.error("Error fetching /api/companies:", fetchError);
          toast({
            title: "Error",
            description: "Failed to load company list.",
            status: "error",
            duration: 5000,
            isClosable: true,
          });
          // return; // Optionally exit if this data is critical
        }

        // Fetch Billing Details
        try {
          const billingDetailsResponse = await axios.get(
            `${process.env.NEXT_PUBLIC_BACKEND_API}/api/billingDetail`
          );
          billingDetailsResponseData = billingDetailsResponse.data;
          console.log("Successfully fetched /api/billingDetail");
        } catch (fetchError) {
          console.error("Error fetching /api/billingDetail:", fetchError);
          toast({
            title: "Error",
            description: "Failed to load billing details.",
            status: "error",
            duration: 5000,
            isClosable: true,
          });
          // return; // Optionally exit if this data is critical
        }

        // Fetch Billing Records
        try {
          const billingResponse = await axios.get(
            `${process.env.NEXT_PUBLIC_BACKEND_API}/api/billing`
          );
          billingResponseData = billingResponse.data;
          console.log("Successfully fetched /api/billing");
        } catch (fetchError) {
          console.error("Error fetching /api/billing:", fetchError);
          toast({
            title: "Error",
            description: "Failed to load billing records.",
            status: "error",
            duration: 5000,
            isClosable: true,
          });
          // return; // Optionally exit if this data is critical
        }

        // Ensure we have the data needed before proceeding
        if (
          !entityResponseData ||
          !companiesResponseData ||
          !billingDetailsResponseData ||
          !billingResponseData
        ) {
          console.error(
            "Missing critical data after fetch attempts. Aborting company processing."
          );
          // Set companies to empty to avoid errors later if some data is missing
          setCompanies([]);
          // Optionally show a more general error message to the user
          toast({
            title: "Data Loading Incomplete",
            description:
              "Could not load all necessary data. Some functionality may be limited.",
            status: "warning",
            duration: 5000,
            isClosable: true,
          });
          return;
        }

        if (entityResponseData && Array.isArray(entityResponseData)) {
          // Create a map of billing records with their store names
          const billingMap = billingResponseData.reduce((map, billing) => {
            map[billing.billingID] = billing.storeName;
            return map;
          }, {});

          // Create a map of billed waybill identifiers, keyed by company name
          const companyBilledWaybills = new Map(); // Map<companyName, Set<waybillNumber>>
          if (billingDetailsResponseData) {
            billingDetailsResponseData.forEach((detail) => {
              if (detail.waybillNumber) {
                const companyNameForDetail = billingMap[detail.billingID];
                if (companyNameForDetail) {
                  if (!companyBilledWaybills.has(companyNameForDetail)) {
                    companyBilledWaybills.set(companyNameForDetail, new Set());
                  }
                  companyBilledWaybills
                    .get(companyNameForDetail)
                    .add(detail.waybillNumber);
                  // Also add subWaybillNumber if it exists, as it might be the primary identifier used in billing details
                  const detailSummary = entityResponseData.find(
                    (s) =>
                      s.waybillNumber === detail.waybillNumber ||
                      s.subWaybillNumber === detail.waybillNumber
                  );
                  if (detailSummary && detailSummary.subWaybillNumber) {
                    companyBilledWaybills
                      .get(companyNameForDetail)
                      .add(detailSummary.subWaybillNumber);
                  }
                }
              }
            });
          }
          console.log(
            "Company-specific Billed Waybills Map:",
            companyBilledWaybills
          );

          // Create a map of company abbreviations to company names
          const companyAbbreviationMap = {};
          if (companiesResponseData && Array.isArray(companiesResponseData)) {
            companiesResponseData.forEach((company) => {
              if (company.entityAbbreviation) {
                // Store both the full abbreviation and any base abbreviation from split/payload format
                companyAbbreviationMap[
                  company.entityAbbreviation.toUpperCase()
                ] = company.companyName;

                // If it's a split/payload format, also store the base abbreviation
                if (
                  company.entityAbbreviation.includes("(") &&
                  company.entityAbbreviation.includes(")")
                ) {
                  const match = company.entityAbbreviation.match(/\(([^)]+)\)/);
                  if (match && match[1]) {
                    companyAbbreviationMap[match[1].toUpperCase()] =
                      company.companyName;
                  }
                }
              }
            });
          }

          // Process entity abbreviation summaries to create dropdown entries
          const entityMap = new Map();

          entityResponseData.forEach((summary) => {
            let entityAbbr = summary.entityAbbreviation;
            let baseAbbr = entityAbbr;

            // Extract base abbreviation if it's a split/payload format
            if (entityAbbr.includes("(") && entityAbbr.includes(")")) {
              const match = entityAbbr.match(/\(([^)]+)\)/);
              if (match && match[1]) {
                baseAbbr = match[1];
              }
            }

            // Try to match using both the full abbreviation and base abbreviation
            const companyName =
              companyAbbreviationMap[entityAbbr.toUpperCase()] ||
              companyAbbreviationMap[baseAbbr.toUpperCase()];

            if (companyName) {
              // If we're in edit mode and this is the selected company, always include it
              const isCurrentEditCompany =
                isEditing && billingData.storeName === companyName;

              // Check if either the parent or sub waybill number is already billed BY THIS COMPANY
              const waybillsBilledByThisCompany =
                companyBilledWaybills.get(companyName) || new Set();
              const isBilledByThisCompany =
                waybillsBilledByThisCompany.has(summary.waybillNumber) ||
                (summary.subWaybillNumber &&
                  waybillsBilledByThisCompany.has(summary.subWaybillNumber));

              // Include if it's not billed by this company OR if it's the company currently being edited
              if (!isBilledByThisCompany || isCurrentEditCompany) {
                // Add the company to the map if it's not already there
                if (!entityMap.has(companyName)) {
                  // Use companyName as the key to group by company
                  const matchingCompany = companiesResponseData.find(
                    (c) => c.companyName === companyName
                  );
                  // For edit mode, use the billing data values if it's the current company
                  const address = isCurrentEditCompany
                    ? billingData.address
                    : matchingCompany?.businessAddress ||
                      `${companyName} Address`;
                  const tin = isCurrentEditCompany
                    ? billingData.tin
                    : matchingCompany?.tin || "000-000-00000";

                  entityMap.set(companyName, {
                    // Key by companyName
                    name: companyName,
                    // Store one representative abbreviation (needed for later fetching)
                    // Use the baseAbbr if available, otherwise the full one
                    abbreviation: baseAbbr || entityAbbr,
                    baseAbbreviation: baseAbbr,
                    address: address,
                    tin: tin,
                    hasUnbilledWaybills: true, // Initially assume true, will verify later
                  });
                }
              }
            }
          });

          // Now, verify which companies in the map actually have unbilled waybills
          const finalCompanies = [];
          for (const [companyName, companyData] of entityMap.entries()) {
            let hasUnbilled = false;
            // Re-check the summaries associated with this company's abbreviation(s)
            entityResponseData.forEach((summary) => {
              let entityAbbr = summary.entityAbbreviation;
              let baseAbbr = entityAbbr;
              if (entityAbbr.includes("(") && entityAbbr.includes(")")) {
                const match = entityAbbr.match(/\(([^)]+)\)/);
                if (match && match[1]) baseAbbr = match[1];
              }
              const summaryCompanyName =
                companyAbbreviationMap[entityAbbr.toUpperCase()] ||
                companyAbbreviationMap[baseAbbr.toUpperCase()];

              if (summaryCompanyName === companyName) {
                const waybillsBilledByThisCompany =
                  companyBilledWaybills.get(companyName) || new Set();
                const isBilled =
                  waybillsBilledByThisCompany.has(summary.waybillNumber) ||
                  (summary.subWaybillNumber &&
                    waybillsBilledByThisCompany.has(summary.subWaybillNumber));
                if (!isBilled) {
                  hasUnbilled = true;
                }
              }
            });

            // Add to final list only if it has unbilled waybills OR it's the company being edited
            if (
              hasUnbilled ||
              (isEditing && billingData.storeName === companyName)
            ) {
              finalCompanies.push(companyData);
            }
          }

          // Set the final list of companies for the dropdown
          setCompanies(finalCompanies);

          // Only reset selected customer when switching billing types if not in edit mode
          if (!isEditing) {
            setSelectedCustomer("");
            setWaybillNumbers([]);
            setCheckedWaybills({});
          } else if (isEditing && billingData && billingData.billingID) {
            // If in edit mode, ensure we fetch billing details after companies are loaded
            // Ensure the selected customer from billingData is actually in the fetched companies list
            const currentCompanyExists = finalCompanies.some(
              (c) => c.name === billingData.storeName
            );
            if (currentCompanyExists) {
              setSelectedCustomer(billingData.storeName); // Re-select if exists
            } else {
              // Handle case where the edited company might not have unbilled waybills anymore?
              // Maybe add it back explicitly if needed? For now, let's assume fetchBillingDetails handles it.
            }
            fetchBillingDetails(); // Call fetchBillingDetails here AFTER companies are processed
          }
        } else {
          console.error(
            "Invalid response format for entity abbreviations:",
            entityResponseData
          );
          toast({
            title: "Error",
            description: "Invalid data received for entity abbreviations",
            status: "error",
            duration: 5000,
            isClosable: true,
          });
          setCompanies([]); // Clear companies on error
        }
      } catch (error) {
        // Catch errors in the main processing logic after fetches
        console.error("Error processing company data:", error);
        toast({
          title: "Error",
          description: "Failed to process company information",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
        setCompanies([]); // Clear companies on error
      }
    };

    fetchCompanies();
  }, [isEditing, billingData, billingType]); // Removed today dependency as it's constant within the component lifecycle

  // Find the selected customer data
  const customerData = selectedCustomer
    ? companies.find((cust) => cust.name === selectedCustomer)
    : { address: "", tin: "" };
  const formattedTIN = formatTIN(customerData?.tin || "");

  // Function to handle checkbox changes - REVISED
  const handleWaybillCheck = (waybillNumber) => {
    // 1. Store scroll position before state update
    if (scrollContainerRef.current) {
      scrollPositionToRestoreRef.current = scrollContainerRef.current.scrollTop;
    }

    // 2. Update state
    setCheckedWaybills((prev) => {
      const updated = { ...prev };
      updated[waybillNumber] = !prev[waybillNumber];
      return updated;
    });

    // Scroll restoration will happen in the useEffect below
  };

  // useEffect to restore scroll position after check state updates
  useEffect(() => {
    if (
      scrollContainerRef.current &&
      scrollPositionToRestoreRef.current !== null
    ) {
      scrollContainerRef.current.scrollTop = scrollPositionToRestoreRef.current;
      scrollPositionToRestoreRef.current = null; // Reset after restoring
    }
  }, [checkedWaybills]); // Dependency array ensures this runs after checkedWaybills changes

  // Recalculate totals whenever relevant states change
  useEffect(() => {
    // Function to calculate totals based on current state
    const getTotals = () => {
      if (billingType !== "perWaybill") {
        // Calculate totals from manual entries
        const gross = manualEntries.reduce((sum, entry) => {
          const amount = parseFloat(entry.amount) || 0;
          return sum + amount;
        }, 0);

        const net = gross / 1.12;
        const vat = gross - net;
        const withTax = net * 0.02;
        const netAmount = gross - withTax;

        return {
          gross: formatCurrency(gross),
          vat: formatCurrency(vat),
          net: formatCurrency(net),
          withTax: formatCurrency(withTax),
          netAmount: formatCurrency(netAmount),
        };
      }

      // Calculation for perWaybill
      // In read-only mode, use all displayed waybills; otherwise, use checked ones.
      const waybillsToCalculate = isReadOnly
        ? waybillNumbers // Use all loaded waybills in read-only mode
        : waybillNumbers.filter(
            (waybill) => checkedWaybills[waybill.waybillNumber]
          ); // Use checked in add/edit

      // --- DIAGNOSTIC LOGGING ---
      console.log("Calculating totals:", {
        isReadOnly,
        billingType,
        waybillNumbersCount: waybillNumbers.length,
        checkedWaybills,
        waybillsToCalculateCount: waybillsToCalculate.length,
        waybillsToCalculateData: waybillsToCalculate, // Log the actual data being summed
      });
      // --- END LOGGING ---

      if (waybillsToCalculate.length === 0) {
        console.log("No waybills to calculate totals for.");
        return {
          gross: "",
          vat: "",
          net: "",
          withTax: "",
          netAmount: "",
        };
      }

      const gross = waybillsToCalculate.reduce((sum, waybill) => {
        const amount = parseFloat(waybill.amount || 0);
        return sum + amount;
      }, 0);

      const net = gross / 1.12;
      const vat = gross - net;
      const withTax = net * 0.02;
      const netAmount = gross - withTax;

      // --- DIAGNOSTIC LOGGING ---
      console.log("Calculated raw totals:", {
        gross,
        vat,
        net,
        withTax,
        netAmount,
      });
      // --- END LOGGING ---

      return {
        gross: formatCurrency(gross),
        vat: formatCurrency(vat),
        net: formatCurrency(net),
        withTax: formatCurrency(withTax),
        netAmount: formatCurrency(netAmount),
      };
    };

    // Update the state with the newly calculated totals
    setCalculatedTotals(getTotals());
  }, [billingType, manualEntries, waybillNumbers, checkedWaybills, isReadOnly]); // Add isReadOnly dependency

  // Filter waybills based on search term
  const filteredWaybills = useMemo(() => {
    const searchTerm = waybillSearchTerm.toLowerCase().trim();
    if (!searchTerm) {
      return waybillNumbers;
    }

    // Updated filtering logic based on billingType
    if (billingType === "perWaybill") {
      // For perWaybill, search ONLY the displayWaybillNumber, checking if it STARTS with the search term
      return waybillNumbers.filter((wb) =>
        wb.displayWaybillNumber
          ?.toString() // Ensure it's a string
          .toLowerCase()
          .startsWith(searchTerm)
      );
    } else {
      // Original logic for other billing types (if search is implemented for them later)
      return waybillNumbers.filter(
        (wb) =>
          wb.displayWaybillNumber?.toLowerCase().includes(searchTerm) ||
          wb.description?.toLowerCase().includes(searchTerm)
      );
    }
  }, [waybillNumbers, waybillSearchTerm, billingType]); // Added billingType dependency

  // Calculate state for the "Check All" checkbox
  const { isAllFilteredChecked, isIndeterminate, numChecked } = useMemo(() => {
    const numFiltered = filteredWaybills.length;
    if (numFiltered === 0) {
      return {
        isAllFilteredChecked: false,
        isIndeterminate: false,
        numChecked: 0,
      };
    }
    let count = 0;
    filteredWaybills.forEach((wb) => {
      if (checkedWaybills[wb.waybillNumber]) {
        count++;
      }
    });
    return {
      isAllFilteredChecked: count === numFiltered,
      isIndeterminate: count > 0 && count < numFiltered,
      numChecked: count,
    };
  }, [filteredWaybills, checkedWaybills]);

  // Handler for the "Check All" checkbox
  const handleCheckAll = (e) => {
    const isChecked = e.target.checked;
    const newCheckedWaybills = { ...checkedWaybills };
    filteredWaybills.forEach((wb) => {
      newCheckedWaybills[wb.waybillNumber] = isChecked;
    });
    setCheckedWaybills(newCheckedWaybills);
  };

  // Update the function to show two decimal places after rounding
  const roundPercentage = (value) => {
    if (!value) return "0.00%";
    // Parse the value to a number, remove % symbol if present
    const numValue = parseFloat(String(value).replace("%", ""));
    // Return the exact value with two decimal places (no rounding)
    return `${numValue.toFixed(2)}%`;
  };

  // Function to fetch shipper info including body type
  // REMOVED - This function caused 404 errors and bodyType is not available elsewhere
  // const fetchShipperInfoWithBodyType = async (waybillNumber) => {
  //   try {
  //     const response = await axios.get(
  //       `${process.env.NEXT_PUBLIC_BACKEND_API}/api/shipperInfo/${waybillNumber}`
  //     );
  //     return response.data;
  //   } catch (error) {
  //     console.error(
  //       `Error fetching shipper info for waybill ${waybillNumber}:`,
  //       error
  //     );
  //     // Return null for 404 errors or any other error
  //     return null;
  //   }
  // };

  // Update the formatWaybillData function to include company name and check body type
  const formatWaybillData = async (waybill, companyName) => {
    const amount = Number(waybill.amount);

    // REMOVED - Fetch shipper info to get body type
    // let bodyType = null;
    // const shipperInfo = await fetchShipperInfoWithBodyType(
    //   waybill.waybillNumber
    // );
    // if (shipperInfo) {
    //   bodyType = shipperInfo.bodyType;
    // }

    // Check if this is a split waybill with subWaybillNumber
    const displayWaybillNumber =
      waybill.split === "split" && waybill.subWaybillNumber
        ? waybill.subWaybillNumber
        : waybill.waybillNumber;

    // Determine description based on body type
    let description;
    // REMOVED - Logic based on bodyType
    // if (bodyType === "6 Wheeler") {
    //   // Extract entity abbreviation from split format or use directly
    //   let entityAbbr = "";
    //   if (
    //     waybill.split === "split" &&
    //     waybill.entityAbbreviation &&
    //     waybill.entityAbbreviation.includes("(") &&
    //     waybill.entityAbbreviation.includes(")")
    //   ) {
    //     const match = waybill.entityAbbreviation.match(/\(([^)]+)\)/);
    //     if (match && match[1]) {
    //       entityAbbr = match[1];
    //     }
    //   } else if (waybill.entityAbbreviation) {
    //     entityAbbr = waybill.entityAbbreviation;
    //   }
    //   description = `Waybill: ${displayWaybillNumber} (6 Wheeler ${entityAbbr})`;
    // } else if (bodyType === "10 Wheeler") {
    //   // Extract entity abbreviation from split format or use directly
    //   let entityAbbr = "";
    //   if (
    //     waybill.split === "split" &&
    //     waybill.entityAbbreviation &&
    //     waybill.entityAbbreviation.includes("(") &&
    //     waybill.entityAbbreviation.includes(")")
    //   ) {
    //     const match = waybill.entityAbbreviation.match(/\(([^)]+)\)/);
    //     if (match && match[1]) {
    //       entityAbbr = match[1];
    //     }
    //   } else if (waybill.entityAbbreviation) {
    //     entityAbbr = waybill.entityAbbreviation;
    //   }
    //   description = `Waybill: ${displayWaybillNumber} (10 Wheeler ${entityAbbr})`;
    // } else {
    // Default format when body type is unknown
    description = `FW: ${displayWaybillNumber}`;

    // Add split information if applicable - This part can stay if needed
    // if (waybill.split || waybill.duplicated) {
    //   description += " - Split"; // Or use Badge component later
    // }
    // }

    return {
      description: description,
      quantity: roundPercentage(waybill.percentage),
      unitPrice: "",
      amount: waybill.amount,
      waybillNumber: waybill.waybillNumber, // Keep the original waybill number for reference
      displayWaybillNumber: displayWaybillNumber, // The number to show in UI
      isSplit: waybill.split || waybill.duplicated ? true : false,
      duplicateReference: waybill.duplicateReference || "",
      duplicated: waybill.duplicated || "",
      split: waybill.split || "",
      // REMOVED - bodyType field
      // bodyType: bodyType, // Store body type for reference
      originalWaybillNumber: waybill.waybillNumber, // Keep original for reference
    };
  };

  // New function to fetch entity abbreviation summaries for waybills
  const fetchEntityAbbreviationSummaries = async (waybillNumber) => {
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/entity-abbreviation-summary/waybill/${waybillNumber}`
      );
      // Process the response to handle split waybills correctly
      return response.data;
    } catch (error) {
      console.error(
        `Error fetching entity abbreviation summaries for waybill ${waybillNumber}:`,
        error
      );
      return [];
    }
  };

  // Helper function to fetch ShipperInfo, handles errors
  const fetchShipperInfo = async (waybillNumber) => {
    if (!waybillNumber) return null;
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/shipperInfo/${waybillNumber}`
      );
      return response.data; // Returns the shipperInfo object or null if not found by backend
    } catch (error) {
      if (error.response && error.response.status === 404) {
        console.warn(`ShipperInfo not found for waybill ${waybillNumber}`);
      } else {
        console.error(
          `Error fetching shipper info for waybill ${waybillNumber}:`,
          error
        );
      }
      return null; // Return null on 404 or other errors
    }
  };

  // Add function to fetch billing details for current billing record
  const fetchBillingDetails = async () => {
    if (
      (isEditing || isReadOnly) &&
      billingData.billingID &&
      billingType === "perWaybill"
    ) {
      try {
        setIsLoading(true);

        // Only fetch details for this billing record
        const currentBillingDetailsResponse = await axios.get(
          `${process.env.NEXT_PUBLIC_BACKEND_API}/api/billingDetail/billingID/${billingData.billingID}`
        );
        const currentBillingDetails = currentBillingDetailsResponse.data || [];

        if (currentBillingDetails.length === 0) {
          setIsLoading(false);
          toast({
            title: "No Data",
            description: "No billing details found for this record.",
            status: "info",
            duration: 3000,
            isClosable: true,
          });
          return;
        }

        // 4. Determine initially checked waybills from current record
        const initialChecked = {};
        currentBillingDetails.forEach((detail) => {
          initialChecked[detail.waybillNumber] = true;
        });

        // Set checked waybills in EDIT mode
        if (isEditing) {
          setCheckedWaybills(initialChecked);
          initialCheckedRef.current = { ...initialChecked };
        }

        // 5. Format waybill data for display
        const formattedWaybills = currentBillingDetails.map((detail, index) => {
          let description = detail.description || `FW: ${detail.waybillNumber}`;
          // Is this a split/sub waybill?
          const isSplit =
            description.includes("SUB") || description.includes("Split");
          const isPayload =
            description.includes("PAYLOAD") || description.includes("Payload");

          return {
            description: description,
            quantity:
              detail.quantity || roundPercentage(detail.percentage) || "0%",
            unitPrice: "",
            amount: detail.amount.toFixed(2),
            waybillNumber: detail.waybillNumber,
            displayWaybillNumber: detail.waybillNumber,
            isSplit: isSplit,
            isPayload: isPayload,
            originalWaybillNumber: detail.waybillNumber,
            baseAmount: detail.amount,
            rows: detail.rows || index,
            percentage: detail.percentage,
            isInCurrentRecord: true,
          };
        });

        // Sort waybills according to their row order
        formattedWaybills.sort((a, b) => (a.rows || 0) - (b.rows || 0));

        // Store all waybills in the ref for later use in edit mode
        allWaybillsRef.current = formattedWaybills;

        // Set waybills for display
        setWaybillNumbers(formattedWaybills);
        initiallyBilledWaybillsRef.current = [...formattedWaybills];

        setIsLoading(false);
      } catch (error) {
        console.error(
          "Error fetching billing details for edit/readonly:",
          error
        );
        setIsLoading(false);
        toast({
          title: "Error",
          description: "Failed to load billing details",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      }
    } else if (
      (isEditing || isReadOnly) &&
      billingData.billingID &&
      billingType !== "perWaybill"
    ) {
      // Logic for non-perWaybill types (Garbage Hauling, Other Services)
      try {
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_BACKEND_API}/api/billingDetail/billingID/${billingData.billingID}`
        );
        if (response.data && response.data.length > 0) {
          // Sort details by rows field
          const sortedDetails = [...response.data].sort(
            (a, b) => (a.rows || 0) - (b.rows || 0)
          );

          const manualEntriesFromDetails = sortedDetails.map((detail) => ({
            id: detail._id || Date.now() + Math.random(),
            description: detail.description || "",
            amount: detail.amount ? detail.amount.toString() : "0",
            rows: detail.rows || 0,
          }));

          setManualEntries(
            manualEntriesFromDetails.length > 0
              ? manualEntriesFromDetails
              : [{ id: Date.now(), description: "", amount: "" }]
          );
        }
      } catch (error) {
        console.error("Error fetching manual entries details:", error);
        toast({
          title: "Error",
          description: "Failed to load manual service details",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      }
    }
  };

  // Add fetchWaybillNumbers function
  const fetchWaybillNumbers = async (company) => {
    try {
      // Find the selected company in the companies list to get accurate abbreviation
      const selectedCompany = companies.find((c) => c.name === company);
      let companyPrefix = "";

      if (selectedCompany && selectedCompany.abbreviation) {
        // Use the stored abbreviation directly from the company object
        companyPrefix = selectedCompany.abbreviation;
      } else {
        // Fallback: try to determine abbreviation from company name
        if (company.toLowerCase().includes("sanford marketing")) {
          companyPrefix = "SMCO";
        } else if (company.toLowerCase().includes("super value")) {
          companyPrefix = "SVI";
        } else {
          // Default to first word of company name
          companyPrefix = company.split(" ")[0];
        }
      }

      console.log(
        "Fetching waybills for company:",
        company,
        "prefix:",
        companyPrefix
      );

      // Get all billing details to check which waybills are already billed
      const allBillingDetailsResponse = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/billingDetail`
      );
      const allBillingResponse = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/billing`
      );

      // Create a map of billing records with their store names
      const billingMap = allBillingResponse.data.reduce((map, billing) => {
        map[billing.billingID] = billing.storeName;
        return map;
      }, {});

      // Track waybills that are already in billing records for this company
      const billedWaybills = new Set();

      if (allBillingDetailsResponse.data) {
        allBillingDetailsResponse.data.forEach((detail) => {
          // Only add to billedWaybills if it's from the same company
          const billingStoreName = billingMap[detail.billingID];
          if (billingStoreName === company) {
            billedWaybills.add(detail.waybillNumber);
          }
        });
      }

      // Fetch all entity abbreviation summaries
      const entitySummariesResponse = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/entity-abbreviation-summary`
      );
      const allEntitySummaries = entitySummariesResponse.data;

      // Filter summaries for this company prefix and exclude already billed waybills
      const companyEntitySummaries = allEntitySummaries.filter((summary) => {
        // Extract base abbreviation from cases like "split-1(SMCO)"
        let entityAbbr = summary.entityAbbreviation;
        if (entityAbbr.includes("(") && entityAbbr.includes(")")) {
          const match = entityAbbr.match(/\(([^)]+)\)/);
          if (match && match[1]) {
            entityAbbr = match[1];
          }
        }

        return (
          entityAbbr.toUpperCase() === companyPrefix.toUpperCase() &&
          !billedWaybills.has(summary.waybillNumber)
        );
      });

      // If no waybills found for this company, return empty
      if (companyEntitySummaries.length === 0) {
        setWaybillNumbers([]);
        setCheckedWaybills({});
        toast({
          title: "No Waybills Available",
          description: "No waybills found for this company",
          status: "info",
          duration: 3000,
          isClosable: true,
        });
        return;
      }

      // Format entity summaries for display
      const formattedWaybills = companyEntitySummaries.map((summary) => {
        const waybillDescription = summary.split
          ? `FW: ${summary.waybillNumber} - Split`
          : `FW: ${summary.waybillNumber}`;

        return {
          description: waybillDescription,
          quantity: roundPercentage(summary.totalPercentage),
          unitPrice: "",
          amount: summary.totalAmount.toFixed(2),
          waybillNumber: summary.waybillNumber,
          isSplit: summary.split === "split",
          duplicateReference: summary.duplicateReference || "",
          duplicated: summary.duplicated || "",
          split: summary.split || "",
          subWaybillNumber: summary.subWaybillNumber || null, // Add subWaybillNumber field
        };
      });

      console.log("Formatted waybills for display:", formattedWaybills);

      // NEW: Create a map to identify subWaybillNumbers and waybillNumbers
      const subWaybillMap = new Map();
      const waybillMap = new Map();

      // First pass: identify all subWaybillNumbers and waybillNumbers
      formattedWaybills.forEach((waybill) => {
        if (waybill.subWaybillNumber) {
          subWaybillMap.set(waybill.subWaybillNumber, waybill);
        }
        waybillMap.set(waybill.waybillNumber, waybill);
      });

      // Create a set of waybills to exclude from rendering (those with subWaybillNumber)
      const waybillsToExclude = new Set();

      // Identify waybills to exclude based on being a split parent with a subWaybillNumber
      formattedWaybills.forEach((waybill) => {
        // 'waybill' here is an object from the 'formattedWaybills' array
        if (waybill.isSplit && waybill.subWaybillNumber) {
          waybillsToExclude.add(waybill.waybillNumber); // Exclude this waybill (which represents the parent summary line)
        }
      });

      // Filter out the excluded waybills
      const filteredWaybills = formattedWaybills.filter(
        (waybill) => !waybillsToExclude.has(waybill.waybillNumber)
      );

      console.log(
        "Filtered waybills (after subWaybillNumber matching):",
        filteredWaybills
      );

      // Process subWaybillNumbers - create new entries for sub-waybills
      const formattedWaybillsWithSubs = [...filteredWaybills];
      const processedSubWaybills = new Set(); // Track already processed sub-waybills

      // For each waybill, check if any of its summaries have a subWaybillNumber
      for (const waybill of filteredWaybills) {
        // Find the corresponding entity summary
        const relatedSummaries = companyEntitySummaries.filter(
          (summary) =>
            summary.waybillNumber === waybill.waybillNumber &&
            summary.subWaybillNumber &&
            !processedSubWaybills.has(summary.subWaybillNumber) &&
            !waybillMap.has(summary.subWaybillNumber) // Skip if there's already a waybill with this number
        );

        // Create entries for each sub-waybill
        relatedSummaries.forEach((summary) => {
          // Only process if we have a valid sub-waybill number
          if (summary.subWaybillNumber) {
            const subWaybillEntry = {
              ...waybill, // Copy all properties from parent
              waybillNumber: summary.subWaybillNumber, // Use the subWaybillNumber as the waybillNumber
              description: `FW: ${summary.subWaybillNumber}${waybill.description.includes(" (") ? waybill.description.substring(waybill.description.indexOf(" (")) : ""}`, // Keep only the truck type info if available
              parentWaybillNumber: waybill.waybillNumber, // Reference to parent
              isSubWaybill: true, // Flag as a sub-waybill
              // Copy amount and percentage from parent
              amount: waybill.amount,
              quantity: waybill.quantity,
            };

            formattedWaybillsWithSubs.push(subWaybillEntry);
            processedSubWaybills.add(summary.subWaybillNumber);
            console.log(
              `Added sub-waybill ${summary.subWaybillNumber} from parent ${waybill.waybillNumber}`
            );
          }
        });
      }

      console.log("Formatted waybills with subs:", formattedWaybillsWithSubs);
      setWaybillNumbers(formattedWaybillsWithSubs);
      setCheckedWaybills({});
    } catch (error) {
      console.error("Error fetching waybill numbers:", error);
      toast({
        title: "Error",
        description: "Could not fetch waybill numbers",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  // Add function to load fix rate waybills
  const fetchFixRateWaybills = async (companyName) => {
    try {
      // Clear existing waybills
      setWaybillNumbers([]);
      setCheckedWaybills({});

      // Get all billing details to check which waybills are already billed
      const allBillingDetailsResponse = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/billingDetail`
      );
      const allBillingResponse = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/billing`
      );

      // Create a map of billing records with their store names
      const billingMap = allBillingResponse.data.reduce((map, billing) => {
        map[billing.billingID] = billing.storeName;
        return map;
      }, {});

      // Track waybills that are already in billing records for this company
      const billedWaybills = new Set();

      if (allBillingDetailsResponse.data) {
        allBillingDetailsResponse.data.forEach((detail) => {
          // Only add to billedWaybills if it's from the same company
          const billingStoreName = billingMap[detail.billingID];
          if (billingStoreName === companyName) {
            billedWaybills.add(detail.waybillNumber);
          }
        });
      }

      // Fetch fix rate consignee data
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/fixRateConsignees`
      );

      if (!response.data || !Array.isArray(response.data)) {
        toast({
          title: "Error",
          description: "Invalid fix rate consignee data format",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
        return;
      }

      // Filter fix rate data for the selected company and exclude already billed waybills
      const fixRateData = response.data.filter(
        (item) =>
          item.company === companyName &&
          !billedWaybills.has(item.waybillNumber)
      );

      if (fixRateData.length === 0) {
        toast({
          title: "No Waybills Available",
          description: "No fix rate waybills found for this company",
          status: "info",
          duration: 3000,
          isClosable: true,
        });
        return;
      }

      // Format the waybill data for display
      const formattedWaybills = fixRateData.map((item) => ({
        description: `FW: ${item.waybillNumber}`,
        quantity: "", // Leave quantity blank for fix rate waybills
        unitPrice: "",
        amount: item.amount.toFixed(2),
        waybillNumber: item.waybillNumber,
      }));

      setWaybillNumbers(formattedWaybills);
    } catch (error) {
      console.error("Error fetching fix rate waybills:", error);
      toast({
        title: "Error",
        description: "Could not fetch fix rate waybill data",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  // Handle billing type change
  const handleBillingTypeChange = (e) => {
    const newBillingType = e.target.value;
    setBillingType(newBillingType);

    // Reset fields when changing billing type
    setCheckedWaybills({});
    setWaybillNumbers([]);
    setSelectedCustomer("");
    setManualCustomerName("");
    setManualAddress("");
    setManualTin("");
    setManualEntries([{ id: Date.now(), description: "", amount: "" }]);
  };

  // Update handleCustomerChange to handle different billing types
  const handleCustomerChange = (e) => {
    const selectedCompany = e.target.value;
    setSelectedCustomer(selectedCompany);
    setWaybillNumbers([]);
    setCheckedWaybills({});
    if (!selectedCompany) return;
    fetchWaybillsForCompany(selectedCompany);
  };

  // Add fetchWaybillsForCompany function
  const fetchWaybillsForCompany = async (companyName) => {
    if (!companyName) return;
    try {
      setIsLoading(true);
      // Find the company object with matching name to get the abbreviation
      const company = companies.find((c) => c.name === companyName);
      let companyPrefix = "";
      let baseAbbreviation = "";
      if (company) {
        companyPrefix = company.abbreviation || "";
        baseAbbreviation = company.baseAbbreviation || company.abbreviation || "";
      } else {
        if (companyName.toLowerCase().includes("sanford marketing")) {
          companyPrefix = "SMCO";
          baseAbbreviation = "SMCO";
        } else if (companyName.toLowerCase().includes("super value")) {
          companyPrefix = "SVI";
          baseAbbreviation = "SVI";
        } else {
          companyPrefix = companyName.split(" ")[0];
          baseAbbreviation = companyPrefix;
        }
      }
      // 1. Fetch all billed waybills to exclude them
      const [billingDetailResponse, allBillingResponse] = await Promise.all([
        axios.get(`${process.env.NEXT_PUBLIC_BACKEND_API}/api/billingDetail`),
        axios.get(`${process.env.NEXT_PUBLIC_BACKEND_API}/api/billing`),
      ]);
      const allBillingDetails = billingDetailResponse.data || [];
      const billingMap = allBillingResponse.data.reduce((map, billing) => {
        map[billing.billingID] = {
          storeName: billing.storeName,
          billingType: billing.billingType,
        };
        return map;
      }, {});
      const billedWaybills = new Set();
      allBillingDetails.forEach((detail) => {
        const billingInfo = billingMap[detail.billingID] || {};
        if (isEditing && detail.billingID === billingData.billingID) {
          return;
        }
        if (
          billingInfo.storeName === companyName &&
          billingInfo.billingType === "perWaybill" &&
          detail.waybillNumber
        ) {
          billedWaybills.add(detail.waybillNumber);
        }
      });
      // 2. Fetch all entity abbreviation summaries
      const entityResponse = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/entity-abbreviation-summary`
      );
      const allEntitySummaries = entityResponse.data;
      // 3. Filter summaries for this company and exclude already billed waybills
      let companyEntitySummaries = allEntitySummaries.filter((summary) => {
        let entityAbbr = summary.entityAbbreviation;
        let baseAbbr = entityAbbr;
        if (entityAbbr.includes("(") && entityAbbr.includes(")")) {
          const match = entityAbbr.match(/\(([^)]+)\)/);
          if (match && match[1]) {
            baseAbbr = match[1];
          }
        }
        summary.split = summary.split || (entityAbbr.startsWith("split-") ? "split" : "");
        summary.payload = summary.payload || (entityAbbr.startsWith("payload-") ? "payload" : "");
        const fullMatches = entityAbbr.toUpperCase() === companyPrefix.toUpperCase();
        const baseMatches = baseAbbr.toUpperCase() === baseAbbreviation.toUpperCase();
        let notBilled = true;
        if (billedWaybills.has(summary.waybillNumber)) {
          notBilled = false;
        }
        if (summary.subWaybillNumber && billedWaybills.has(summary.subWaybillNumber)) {
          notBilled = false;
        }
        return (fullMatches || baseMatches) && notBilled;
      });
      const filteredCompanyEntitySummaries = companyEntitySummaries.filter((summary) => {
        if (summary.split === "split" && summary.subWaybillNumber) {
          return false;
        }
        return true;
      });
      if (filteredCompanyEntitySummaries.length === 0) {
        setWaybillNumbers([]);
        setCheckedWaybills({});
        setIsLoading(false);
        toast({
          title: "No Waybills Available",
          description: "No waybills found for this company",
          status: "info",
          duration: 3000,
          isClosable: true,
        });
        return;
      }
      const MAX_INITIAL_WAYBILLS = 50;
      const initialWaybills = filteredCompanyEntitySummaries.slice(0, MAX_INITIAL_WAYBILLS);
      const remainingWaybills = filteredCompanyEntitySummaries.length > MAX_INITIAL_WAYBILLS
        ? filteredCompanyEntitySummaries.slice(MAX_INITIAL_WAYBILLS)
        : [];
      // 4. Batch fetch shipper info for initial waybills
      const shipperInfoCache = new Map();
      const uniqueWaybillNumbers = [...new Set(initialWaybills.map((s) => s.waybillNumber))];
      const shipperInfoPromises = uniqueWaybillNumbers.map(async (wbNum) => {
        try {
          const shipperInfoPromise = fetchShipperInfo(wbNum);
          const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("Shipper info timeout")), 3000));
          const info = await Promise.race([shipperInfoPromise, timeout]);
          if (info) {
            shipperInfoCache.set(wbNum, info);
          }
        } catch (error) {}
      });
      try { await Promise.all(shipperInfoPromises); } catch (error) {}
      // 5. Process and format the waybills
      const formattedWaybills = [];
      const processedSubWaybills = new Set();
      for (const summary of initialWaybills) {
        const parentWaybillNumber = summary.waybillNumber;
        const shipperInfo = shipperInfoCache.get(parentWaybillNumber);
        const bodyType = shipperInfo?.bodyType || null;
        const isSplit = summary.split === "split";
        const isPayload = summary.payload === "payload";
        const hasSubNumber = !!summary.subWaybillNumber;
        const primaryIdentifier = hasSubNumber && (isSplit || isPayload)
          ? summary.subWaybillNumber
          : parentWaybillNumber;
        const displayWaybillNumber = parentWaybillNumber;
        let description = `FW: ${displayWaybillNumber}`;
        if (bodyType) {
          description += ` (${bodyType})`;
        }
        if (isSplit) {
          description += " SUB";
        } else if (isPayload) {
          description += " PAYLOAD";
        }
        if (!processedSubWaybills.has(primaryIdentifier)) {
          formattedWaybills.push({
            description: description,
            quantity: roundPercentage(summary.totalPercentage || 0),
            unitPrice: "",
            amount: summary.totalAmount ? summary.totalAmount.toFixed(2) : "0.00",
            waybillNumber: primaryIdentifier,
            displayWaybillNumber: displayWaybillNumber,
            isSplit: isSplit,
            isPayload: isPayload,
            originalWaybillNumber: parentWaybillNumber,
            entityAbbreviation: summary.entityAbbreviation,
            isSubWaybill: hasSubNumber && (isSplit || isPayload),
            baseAmount: summary.totalAmount || 0,
          });
          if (hasSubNumber) {
            processedSubWaybills.add(primaryIdentifier);
          }
        }
      }
      setWaybillNumbers(formattedWaybills);
      setCheckedWaybills({});
      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
      toast({
        title: "Error",
        description: "Could not fetch waybills",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  // Update the handleDateChange to validate date is within allowed range
  const handleDateChange = (e) => {
    console.log("Date changed to:", e.target.value);
    setSelectedDate(e.target.value);
  };

  const handleHeaderPaymentMethodChange = (value) => {
    setHeaderPaymentMethod(value);
  };

  const handleBottomPaymentMethodChange = (value) => {
    setBottomPaymentMethod(value);
  };

  // Define tableData based on waybillNumbers
  const getTableData = () => {
    // User selected waybills (for normal rate)
    if (billingType === "normal" && waybillNumbers.length > 0) {
      return waybillNumbers
        .filter((waybill) => checkedWaybills[waybill.waybillNumber])
        .map((waybill) => ({
          description: waybill.description, // This already includes "- Split" if needed
          quantity: waybill.quantity,
          unitPrice: waybill.unitPrice,
          amount: waybill.amount,
        }));
    }

    // Fix rate (one line item)
    if (billingType === "fix" && fixRateWaybills.length > 0) {
      return fixRateWaybills
        .filter((waybill) => checkedWaybills[waybill.waybillNumber])
        .map((waybill) => ({
          description: waybill.description,
          quantity: 1,
          unitPrice: waybill.amount,
          amount: waybill.amount,
        }));
    }

    // Manual entry services
    return services.map((service) => ({
      description: service.description,
      quantity: service.quantity,
      unitPrice: service.unitPrice,
      amount: service.amount,
    }));
  };

  // Function to generate PDF with jsPDF and AutoTable
  const generatePDF = () => {
    console.log("Generating PDF with data:", {
      billingData,
      selectedCustomer,
      customerData,
      waybillNumbers,
      checkedWaybills,
      billingType,
    });

    // Create PDF in portrait mode to match the image
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });
    toast({
      title: "Preparing PDF",
      description: "Please wait while we generate your invoice PDF.",
      status: "info",
      duration: 2000,
      isClosable: true,
    });

    // Set document parameters
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    // Minimal margins - just enough for printer tolerance
    const margin = 8;
    const contentWidth = pageWidth - 2 * margin;
    // Add white background
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageWidth, pageHeight, "F");
    // --- COMPANY HEADER ---
    // Company name
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("JUSTINE'S CARGO SERVICES", margin, margin + 4);
    // Proprietor
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("MARIO C. SEGOVIA - Proprietor", margin, margin + 9);
    // Address & TIN
    doc.setFontSize(7);
    doc.text(
      "11 P. Gomez St. Ortiz Iloilo City | VAT Reg. TIN: 923-420-717-00002 | Tel. No.: (033) 321-3805",
      margin,
      margin + 13
    );
    let yPos = margin + 18;
    // --- SERVICE INVOICE HEADER ---
    // Light gray background for SERVICE INVOICE
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, yPos, contentWidth, 8, "F");
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, yPos, margin + contentWidth, yPos);
    doc.line(margin, yPos + 8, margin + contentWidth, yPos + 8);
    // Title
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("SERVICE INVOICE", margin + 5, yPos + 5.5);
    // CASH or CHARGE radio buttons
    const radioY = yPos + 4;
    // Radio for CASH
    doc.circle(pageWidth - margin - 50, radioY, 2.5, "S");
    if (headerPaymentMethod === "CASH") {
      doc.circle(pageWidth - margin - 50, radioY, 1.2, "F");
    }
    doc.setFontSize(8);
    doc.text("CASH", pageWidth - margin - 43, radioY + 0.5);
    // Radio for CHARGE
    doc.circle(pageWidth - margin - 17, radioY, 2.5, "S");
    if (headerPaymentMethod === "CHARGE") {
      doc.circle(pageWidth - margin - 17, radioY, 1.2, "F");
    }
    doc.text("CHARGE", pageWidth - margin - 10, radioY + 0.5);
    yPos += 8;
    // --- CUSTOMER INFO SECTION ---
    // First row - Customer name and date
    doc.setFillColor(248, 248, 248);
    // CUSTOMER'S NAME
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    doc.text("CUSTOMER'S NAME", margin, yPos + 5);
    // Customer dropdown (simulate with box)
    doc.setDrawColor(220, 220, 220);
    doc.setFillColor(248, 248, 248);
    doc.rect(margin, yPos + 7, contentWidth / 2 - 5, 8, "F");
    doc.rect(margin, yPos + 7, contentWidth / 2 - 5, 8, "S");
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);

    // Get customer name with fallbacks
    const customerName = isReadOnly
      ? billingData.consignee ||
        billingData.storeName ||
        selectedCustomer ||
        "N/A"
      : selectedCustomer;
    doc.text(customerName, margin + 3, yPos + 12);

    // DATE
    doc.setFontSize(7);
    doc.setTextColor(80, 80, 80);
    doc.text("DATE", pageWidth - margin - contentWidth / 2 + 5, yPos + 5);
    // Date input box
    doc.setDrawColor(220, 220, 220);
    doc.setFillColor(248, 248, 248);
    doc.rect(
      pageWidth - margin - contentWidth / 2 + 5,
      yPos + 7,
      contentWidth / 2 - 5,
      8,
      "F"
    );
    doc.rect(
      pageWidth - margin - contentWidth / 2 + 5,
      yPos + 7,
      contentWidth / 2 - 5,
      8,
      "S"
    );
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    doc.text(
      selectedDate,
      pageWidth - margin - contentWidth / 2 + 8,
      yPos + 12
    );
    // ADDRESS
    doc.setFontSize(7);
    doc.setTextColor(80, 80, 80);
    doc.text("ADDRESS", margin, yPos + 20);
    // Address input box
    doc.setDrawColor(220, 220, 220);
    doc.setFillColor(248, 248, 248);
    doc.rect(margin, yPos + 22, contentWidth / 2 - 5, 8, "F");
    doc.rect(margin, yPos + 22, contentWidth / 2 - 5, 8, "S");
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);

    // Get address with fallbacks
    const address = isReadOnly
      ? billingData.address || (customerData && customerData.address) || "N/A"
      : customerData && customerData.address
        ? customerData.address
        : "N/A";
    doc.text(address, margin + 3, yPos + 27);

    // TIN
    doc.setFontSize(7);
    doc.setTextColor(80, 80, 80);
    doc.text("TIN", pageWidth - margin - contentWidth / 2 + 5, yPos + 20);
    // TIN input box
    doc.setDrawColor(220, 220, 220);
    doc.setFillColor(248, 248, 248);
    doc.rect(
      pageWidth - margin - contentWidth / 2 + 5,
      yPos + 22,
      contentWidth / 2 - 5,
      8,
      "F"
    );
    doc.rect(
      pageWidth - margin - contentWidth / 2 + 5,
      yPos + 22,
      contentWidth / 2 - 5,
      8,
      "S"
    );
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);

    // Get TIN with fallbacks
    const tin = isReadOnly
      ? billingData.tin ||
        (customerData && customerData.tin) ||
        formattedTIN ||
        "N/A"
      : formattedTIN ||
        (customerData && customerData.tin ? customerData.tin : "N/A");
    doc.text(tin, pageWidth - margin - contentWidth / 2 + 8, yPos + 27);

    yPos += 32;
    // --- TERMS SECTION ---
    // Light gray background
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, yPos, contentWidth, 8, "F");
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, yPos, margin + contentWidth, yPos);
    doc.line(margin, yPos + 8, margin + contentWidth, yPos + 8);
    // Terms section - split into 3 columns
    const sectionWidth = contentWidth / 3;
    // TERMS
    doc.setFontSize(7);
    doc.setTextColor(80, 80, 80);
    doc.text("TERMS", margin + 5, yPos + 5);
    doc.setTextColor(0, 0, 0);

    // Get terms with fallback
    const terms = billingData.terms || "";
    doc.text(terms, margin + 40, yPos + 5);
    // SC/PWD NO.
    doc.text("SC/PWD NO.", margin + sectionWidth + 5, yPos + 5);
    doc.setTextColor(0, 0, 0);
    doc.text(billingData.scpwdNo || "", margin + sectionWidth + 40, yPos + 5);
    // SIGNATURE
    doc.text("SIGNATURE", margin + sectionWidth * 2 + 5, yPos + 5);
    yPos += 8;
    // --- TABLE SECTION ---
    // Use exact measurements to ensure alignment
    const tableWidth = contentWidth - 55; // Total table width minus totals box
    // Column positions and widths - adjusted to match table body exactly
    const colPos = {
      description: {
        x: margin,
        width: tableWidth * 0.5, // 50% for description
      },
      qty: {
        x: margin + tableWidth * 0.5,
        width: tableWidth * 0.15, // 15% for qty
      },
      unitPrice: {
        x: margin + tableWidth * 0.65,
        width: tableWidth * 0.175, // 17.5% for unit price
      },
      amount: {
        x: margin + tableWidth * 0.825,
        width: tableWidth * 0.175, // 17.5% for amount
      },
    };
    // Draw header backgrounds with exact widths
    doc.setFillColor(235, 235, 235);
    doc.rect(colPos.description.x, yPos, colPos.description.width, 15, "F");
    doc.rect(colPos.qty.x, yPos, colPos.qty.width, 15, "F");
    doc.rect(colPos.unitPrice.x, yPos, colPos.unitPrice.width, 15, "F");
    doc.rect(colPos.amount.x, yPos, colPos.amount.width, 15, "F");
    // Draw borders
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.1);
    // Horizontal borders
    doc.line(margin, yPos, margin + tableWidth, yPos);
    doc.line(margin, yPos + 15, margin + tableWidth, yPos + 15);
    // Vertical borders
    doc.line(colPos.description.x, yPos, colPos.description.x, yPos + 15);
    doc.line(colPos.qty.x, yPos, colPos.qty.x, yPos + 15);
    doc.line(colPos.unitPrice.x, yPos, colPos.unitPrice.x, yPos + 15);
    doc.line(colPos.amount.x, yPos, colPos.amount.x, yPos + 15);
    doc.line(
      colPos.amount.x + colPos.amount.width,
      yPos,
      colPos.amount.x + colPos.amount.width,
      yPos + 15
    );
    // Header text
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    // Description header - left aligned with proper indent
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(7);
    doc.text(
      "IN PAYMENT OF THE FOLLOWING SERVICE /",
      colPos.description.x + 4,
      yPos + 6
    );
    doc.text("TRANSACTION / DESCRIPTION", colPos.description.x + 4, yPos + 11);
    // Calculate positions for column headers to align with data
    const qtyX = colPos.qty.x + colPos.qty.width / 2; // Center of QTY column
    const unitPriceX = colPos.unitPrice.x + colPos.unitPrice.width - 4; // Right align with 4px padding
    const amountX = colPos.amount.x + colPos.amount.width - 4; // Right align with 4px padding
    // Set text color to match blue overlay in image
    doc.setTextColor("black");
    // Position headers with correct alignment
    doc.text("QTY", qtyX, yPos + 9, { align: "center" }); // Center aligned
    doc.text("UNIT PRICE", unitPriceX, yPos + 9, { align: "right" }); // Right aligned
    doc.text("AMOUNT", amountX, yPos + 9, { align: "right" }); // Right aligned
    // Reset text color
    doc.setTextColor(60, 60, 60);
    yPos += 15;
    // Update column widths for autoTable to match header layout exactly
    const colWidths = [
      colPos.description.width,
      colPos.qty.width,
      colPos.unitPrice.width,
      colPos.amount.width,
    ];

    // Format currency for PDF specifically
    const formatPDFCurrency = (value) => {
      if (!value) return "";
      const number = parseFloat(value);
      if (isNaN(number)) return "";
      return number.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    };

    // Get the table data with fixed formatting
    const tableData = [];
    // Updated filtering logic: Always use the current waybillNumbers state for the PDF
    // This state is populated by fetchBillingDetails in read-only/edit modes
    const waybillsToShow = waybillNumbers; // Directly use the state

    // --- DEBUGGING ---
    console.log("PDF Generation: waybillsToShow (using state)", waybillsToShow);
    // --- END DEBUGGING ---

    for (const waybill of waybillsToShow) {
      tableData.push({
        description:
          waybill.description ||
          `FW: ${waybill.waybillNumber || waybill.number}`,
        quantity: waybill.quantity,
        unitPrice: "",
        amount: formatPDFCurrency(waybill.amount || waybill.total),
      });
    }

    // --- DEBUGGING ---
    console.log(
      "PDF Generation: tableData (before empty rows)",
      JSON.parse(JSON.stringify(tableData))
    ); // Deep copy for logging
    // --- END DEBUGGING ---

    // For calculating table height later, still need these variables
    const rowHeight = 8; // approximate height of a row in mm
    const estimatedContentHeight = waybillsToShow.length * rowHeight;
    const spaceAvailableForTable = pageHeight - yPos - 40; // 40mm buffer for footer, etc.

    // --- DEBUGGING ---
    console.log(
      "PDF Generation: tableData (final, no empty rows)",
      JSON.parse(JSON.stringify(tableData))
    ); // Deep copy for logging
    // --- END DEBUGGING ---

    // Generate table with exact matching columns
    autoTable(doc, {
      startY: yPos,
      head: [], // Custom header already added
      body: tableData,
      theme: "plain",
      styles: {
        fontSize: 8,
        cellPadding: 2,
        lineWidth: 0.1,
        minCellHeight: 6, // Adjusted from 8 to 6
        valign: "middle",
      },
      columnStyles: {
        description: {
          halign: "left",
          cellWidth: colPos.description.width,
          cellPadding: { left: 4, right: 2, top: 2, bottom: 2 },
        },
        quantity: {
          halign: "center",
          cellWidth: colPos.qty.width,
        },
        unitPrice: {
          halign: "right",
          cellWidth: colPos.unitPrice.width,
          cellPadding: { left: 2, right: 4, top: 2, bottom: 2 },
        },
        amount: {
          halign: "right",
          cellWidth: colPos.amount.width,
          cellPadding: { left: 2, right: 4, top: 2, bottom: 2 },
        },
      },
      margin: { left: margin, right: margin + 55 },
      tableWidth: contentWidth - 55, // Use reduced width
      tableLineColor: [200, 200, 200],
      // Enable automatic page breaks for long tables
      willDrawPage: function (data) {
        // Reset header and footer on new pages
        if (data.pageNumber > 1) {
          // Add a simple header to continuation pages
          doc.setFontSize(8);
          doc.setFont("helvetica", "bold");
          doc.text(
            `${selectedCustomer || manualCustomerName || "CUSTOMER"} - Page ${data.pageNumber}`,
            margin,
            margin + 5
          );
        }
      },
      didDrawPage: function () {
        // More space for the totals section on final page
        doc.setDrawColor(200, 200, 200);
      },
      drawCell: function (cell, opts) {
        // Only draw borders
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.1);
        // Draw all borders as lines
        const x = cell.x;
        const y = cell.y;
        const w = cell.width;
        const h = cell.height;
        doc.line(x, y, x + w, y); // top
        doc.line(x + w, y, x + w, y + h); // right
        doc.line(x, y, x, y + h); // left
        doc.line(x, y + h, x + w, y + h); // bottom
      },
    });
    // --- TOTALS SECTION ---
    const totalsBoxWidth = 55;
    const totalsBoxX = pageWidth - margin - totalsBoxWidth;
    const boxHeight = 125; // Define boxHeight before it's used

    // Get the final Y position from autoTable, with fallback
    let tableFinalY =
      doc.autoTable?.previous?.finalY || yPos + estimatedContentHeight || yPos;
    // Revert totalsBoxY to start at the same Y as the table
    let totalsBoxY = yPos;

    // Remove the page break check before the totals box
    // if (totalsBoxY + boxHeight + 10 > pageHeight - 30) { // Use totalsBoxY + boxHeight here, add buffer
    //   // Not enough space, add a new page
    //   doc.addPage();
    //   // Reset Y position for payment section if new page is added (optional)
    //   // paymentY = margin; // Or adjust as needed, currently uses pageHeight - 30
    // }

    // Draw totals box background
    doc.setFillColor(252, 252, 252);
    // First draw the background fill
    doc.rect(totalsBoxX, totalsBoxY, totalsBoxWidth, boxHeight, "F");
    // Borders removed - doc.setDrawColor, doc.setLineWidth and doc.line calls for border are deleted.
    totalsBoxY += 6;
    // Function to add a total row with adjusted positioning
    const addTotalRow = (label, value, isBold = false, hasBorder = false) => {
      doc.setFont("helvetica", isBold ? "bold" : "normal");
      doc.setFontSize(7);
      doc.setTextColor(0, 0, 0);

      // Add label
      doc.text(label, totalsBoxX + 2, totalsBoxY);

      // Format value for PDF
      let displayValue = value;
      if (typeof value === "string" && value.startsWith("₱")) {
        displayValue = value;
      } else if (value) {
        const numValue = parseFloat(value);
        if (!isNaN(numValue)) {
          displayValue = formatPDFCurrency(numValue);
        }
      }

      // Add value with proper alignment
      if (displayValue) {
        doc.text(displayValue, totalsBoxX + totalsBoxWidth - 2, totalsBoxY, {
          align: "right",
        });
      }

      if (hasBorder) {
        const borderY = totalsBoxY - 4;
        const borderHeight = 6;
        doc.setDrawColor(0);
        doc.setLineWidth(0.1);
        doc.line(
          totalsBoxX + 2,
          borderY,
          totalsBoxX + totalsBoxWidth - 2,
          borderY
        );
        doc.line(
          totalsBoxX + totalsBoxWidth - 2,
          borderY,
          totalsBoxX + totalsBoxWidth - 2,
          borderY + borderHeight
        );
        doc.line(
          totalsBoxX + 2,
          borderY,
          totalsBoxX + 2,
          borderY + borderHeight
        );
        doc.line(
          totalsBoxX + 2,
          borderY + borderHeight,
          totalsBoxX + totalsBoxWidth - 2,
          borderY + borderHeight
        );
      }

      totalsBoxY += 5;
    };

    // Calculate raw numeric totals
    const raw = calculatedTotals;
    const rawGross = parseFloat(raw.gross.replace(/[^\d.-]/g, ""));
    const rawVat = parseFloat(raw.vat.replace(/[^\d.-]/g, ""));
    const rawNet = parseFloat(raw.net.replace(/[^\d.-]/g, ""));
    const rawWithTax = parseFloat(raw.withTax.replace(/[^\d.-]/g, ""));
    const rawNetAmount = parseFloat(raw.netAmount.replace(/[^\d.-]/g, ""));

    // Add all totals with proper spacing
    addTotalRow("Total Sales (VAT Inclusive):", rawGross);
    addTotalRow("Less: 12% VAT:", rawVat);
    addTotalRow("Net of VAT/TOTAL:", rawNet);
    addTotalRow("Less: SC/PWD Discount:", billingData.scpwdDiscount || "");
    addTotalRow("Total Due:", rawGross);
    addTotalRow("Less Withholding:", rawWithTax);
    // Special formatting for Total Amount Due
    addTotalRow("Total Amount Due:", rawNetAmount, true, false); // Changed hasBorder to false
    totalsBoxY += 2; // Add spacing
    addTotalRow("VATABLE:", rawNet);
    addTotalRow("Vat Exempt:", billingData.vatExempt || "");
    addTotalRow("Zero Rated:", billingData.zeroRated || "");
    addTotalRow("VAT 12%:", rawVat);
    // --- PAYMENT METHOD SECTION ---
    // Calculate paymentY based on the end of the table and the visual end of the totals box
    const totalsBoxVisualEndY = yPos + boxHeight;
    let paymentY = Math.max(tableFinalY, totalsBoxVisualEndY) + 5; // Add 5mm padding

    const paymentBoxHeight = 18; // Defined height for the payment method box

    // Check for page break before drawing payment method box
    if (paymentY + paymentBoxHeight + 5 > pageHeight - margin - 10) {
      // +5 for buffer before footer
      doc.addPage();
      paymentY = margin + 10; // Reset Y position to top of new page
      // Redraw company header on new page if needed
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("JUSTINE'S CARGO SERVICES", margin, margin + 4);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text("MARIO C. SEGOVIA - Proprietor", margin, margin + 9);
      doc.setFontSize(7);
      doc.text(
        "11 P. Gomez St. Ortiz Iloilo City | VAT Reg. TIN: 923-420-717-00002 | Tel. No.: (033) 321-3805",
        margin,
        margin + 13
      );
    }

    // NEW PAYMENT METHOD BOX DRAWING LOGIC STARTS HERE
    const paymentInternalPadding = 3;

    // Draw the payment method box itself, aligned with the totals box
    doc.setFillColor(240, 240, 240); // Light gray background
    doc.rect(totalsBoxX, paymentY, totalsBoxWidth, paymentBoxHeight, "F");
    doc.setDrawColor(200, 200, 200); // Border color
    doc.rect(totalsBoxX, paymentY, totalsBoxWidth, paymentBoxHeight, "S");

    // Draw "PAYMENT METHOD:" title inside the new box
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(80, 80, 80);
    const paymentTitleY = paymentY + paymentInternalPadding + 3;
    doc.text(
      "PAYMENT METHOD:",
      totalsBoxX + paymentInternalPadding,
      paymentTitleY
    );

    // Draw CASH, CHECK, CREDIT options below the title, inside the new box
    const optionsLineY = paymentTitleY + 7;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(8);

    const optionTextOffsetY = 0.5;
    const circleRadius = 2;
    const filledCircleRadius = 1;
    const optionSegmentWidth = totalsBoxWidth / 3;
    const circleToTextGap = 3; // Gap between a circle and the start of its text label
    const textWidthEstimate = 15; // An estimate for text like "CREDIT" to help center circle+text group
    const groupWidthEstimate =
      textWidthEstimate + circleRadius * 2 + circleToTextGap; // Estimated width of circle + gap + text

    // CASH
    const cashSegmentStartX = totalsBoxX;
    const cashGroupStartX =
      cashSegmentStartX + (optionSegmentWidth - groupWidthEstimate) / 2; // Center group in segment
    doc.circle(cashGroupStartX + circleRadius, optionsLineY, circleRadius, "S");
    if (bottomPaymentMethod === "CASH") {
      doc.circle(
        cashGroupStartX + circleRadius,
        optionsLineY,
        filledCircleRadius,
        "F"
      );
    }
    doc.text(
      "CASH",
      cashGroupStartX + circleRadius * 2 + circleToTextGap,
      optionsLineY + optionTextOffsetY
    );

    // CHECK
    const checkSegmentStartX = totalsBoxX + optionSegmentWidth;
    const checkGroupStartX =
      checkSegmentStartX + (optionSegmentWidth - groupWidthEstimate) / 2;
    doc.circle(
      checkGroupStartX + circleRadius,
      optionsLineY,
      circleRadius,
      "S"
    );
    if (bottomPaymentMethod === "CHECK") {
      doc.circle(
        checkGroupStartX + circleRadius,
        optionsLineY,
        filledCircleRadius,
        "F"
      );
    }
    doc.text(
      "CHECK",
      checkGroupStartX + circleRadius * 2 + circleToTextGap,
      optionsLineY + optionTextOffsetY
    );

    // CREDIT
    const creditSegmentStartX = totalsBoxX + 2 * optionSegmentWidth;
    const creditGroupStartX =
      creditSegmentStartX + (optionSegmentWidth - groupWidthEstimate) / 2;
    doc.circle(
      creditGroupStartX + circleRadius,
      optionsLineY,
      circleRadius,
      "S"
    );
    if (bottomPaymentMethod === "CREDIT") {
      doc.circle(
        creditGroupStartX + circleRadius,
        optionsLineY,
        filledCircleRadius,
        "F"
      );
    }
    doc.text(
      "CREDIT",
      creditGroupStartX + circleRadius * 2 + circleToTextGap,
      optionsLineY + optionTextOffsetY
    );

    // --- FOOTER ---
    // Ensure footer is at the bottom, considering potential page breaks
    let footerY = pageHeight - 10;
    if (doc.internal.getNumberOfPages() > 1 && paymentY + 10 > footerY) {
      // If payment section pushed content near bottom
      footerY = paymentY + 15; // Position footer after payment section on current page if it's a new page
      if (footerY > pageHeight - 10) {
        // If still too low, put it at a minimum distance from bottom
        // This case should ideally be handled by adding a new page *before* drawing payment if it won't fit
        // For now, just ensure it's on the page
        footerY = pageHeight - 10;
      }
    } else if (
      doc.internal.getNumberOfPages() == 1 &&
      paymentY + 15 > footerY
    ) {
      footerY = paymentY + 15;
      if (footerY > pageHeight - 10) {
        footerY = pageHeight - 10;
      }
    }

    // Footer text
    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(120, 120, 120);
    doc.text(
      "Justine's Cargo Services Generated Service Invoice © 2009",
      margin,
      footerY
    );
    // Save the PDF
    doc.save(`Invoice_${selectedCustomer}_${selectedDate}.pdf`);
    toast({
      title: "PDF generated successfully!",
      description: "Your invoice has been downloaded.",
      status: "success",
      duration: 3000,
      isClosable: true,
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Calculate raw numeric totals without currency formatting
      let gross, vat, net, withTax, netAmount;

      if (billingType === "perWaybill") {
        const selectedWaybills = waybillNumbers.filter(
          (waybill) => checkedWaybills[waybill.waybillNumber]
        );

        gross = selectedWaybills.reduce((sum, waybill) => {
          const amount = parseFloat(waybill.amount || 0);
          return sum + amount;
        }, 0);
      } else {
        // Calculate totals from manual entries
        gross = manualEntries.reduce((sum, entry) => {
          const amount = parseFloat(entry.amount || 0);
          return sum + amount;
        }, 0);
      }

      vat = (gross / 1.12) * 0.12;
      net = gross - vat;
      withTax = net * 0.02;
      netAmount = gross - withTax;

      // Validate required fields
      if (!selectedInvoiceNumber) {
        toast({
          title: "Error",
          description: "Please select a Service Invoice Number",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
        setIsSaving(false);
        return;
      }

      // Validate customer information based on billing type
      if (billingType === "perWaybill") {
        if (!selectedCustomer) {
          toast({
            title: "Error",
            description: "Please select a customer",
            status: "error",
            duration: 3000,
            isClosable: true,
          });
          setIsSaving(false);
          return;
        }
      } else {
        // For Garbage Hauling and Other Services
        if (!manualCustomerName || !manualAddress || !manualTin) {
          toast({
            title: "Error",
            description:
              "Please fill in all customer details (Name, Address, and TIN)",
            status: "error",
            duration: 3000,
            isClosable: true,
          });
          setIsSaving(false);
          return;
        }

        // Validate manual entries
        if (
          manualEntries.length === 0 ||
          !manualEntries.some((entry) => entry.description && entry.amount)
        ) {
          toast({
            title: "Error",
            description:
              "Please add at least one service entry with description and amount",
            status: "error",
            duration: 3000,
            isClosable: true,
          });
          setIsSaving(false);
          return;
        }
      }

      // Get customer info based on billing type
      let customerInfo;
      if (billingType === "perWaybill") {
        customerInfo = companies.find(
          (company) => company.name === selectedCustomer
        );
        if (!customerInfo) {
          toast({
            title: "Error",
            description: "Customer information not found",
            status: "error",
            duration: 3000,
            isClosable: true,
          });
          setIsSaving(false);
          return;
        }
      }

      // Format manual entries with all required fields
      const formattedManualEntries =
        billingType !== "perWaybill"
          ? manualEntries.map((entry) => {
              const entryAmount = parseFloat(entry.amount || 0);
              return {
                id: entry.id,
                description: entry.description || "",
                amount: entryAmount.toFixed(2),
                quantity: "1",
                waybillNumber: null,
                percentage: "0%",
                cbm: 0,
                status: "Pending",
              };
            })
          : [];

      // Prepare the update payload for main billing record
      const payload = {
        billingID: billingData.billingID || `B-${Date.now()}`,
        siNumber: selectedInvoiceNumber,
        invoiceNumber: selectedInvoiceNumber,
        storeName:
          billingType === "perWaybill" ? selectedCustomer : manualCustomerName,
        address:
          billingType === "perWaybill" ? customerInfo.address : manualAddress,
        tin: billingType === "perWaybill" ? customerInfo.tin : manualTin,
        invoiceDate: selectedDate,
        headerPaymentMethod,
        bottomPaymentMethod,
        gross: gross.toFixed(2),
        vat: vat.toFixed(2),
        net: net.toFixed(2),
        withTax: withTax.toFixed(2),
        netAmount: netAmount.toFixed(2),
        amount: netAmount.toFixed(2),
        vat12Percent: vat.toFixed(2),
        status: "Pending",
        // Remove dateBilled from new entries
        billingType: billingType,
        manualEntries: formattedManualEntries,
        waybills:
          billingType === "perWaybill"
            ? waybillNumbers
                .filter((waybill) => checkedWaybills[waybill.waybillNumber])
                .map((waybill) => ({
                  ...waybill,
                  amount: parseFloat(waybill.amount).toFixed(2),
                  status: "Pending",
                }))
            : [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Only include dateBilled for editing existing records
      if (isEditing && billingData.dateBilled) {
        payload.dateBilled = selectedDate;
      }

      console.log("Sending payload:", payload);

      if (!isEditing) {
        // Create new billing record
        const response = await axios.post(
          `${process.env.NEXT_PUBLIC_BACKEND_API}/api/billing`,
          payload
        );

        // Update the service invoice status to USED
        try {
          const serviceInvoices = await axios.get(
            `${process.env.NEXT_PUBLIC_BACKEND_API}/api/service-invoice`
          );
          const flattenedInvoices = serviceInvoices.data.flatMap(
            (stub) => stub.invoices
          );
          const selectedInvoice = flattenedInvoices.find(
            (invoice) => invoice.invoiceNumber === selectedInvoiceNumber
          );

          if (selectedInvoice && selectedInvoice.status !== "USED") {
            await axios.put(
              `${process.env.NEXT_PUBLIC_BACKEND_API}/api/service-invoice/${selectedInvoice._id}`,
              {
                status: "USED",
                customerName:
                  billingType === "perWaybill"
                    ? selectedCustomer
                    : manualCustomerName,
              }
            );
          }
        } catch (invoiceError) {
          console.error("Error updating service invoice status:", invoiceError);
        }

        // Create billing details based on billing type
        const billingID = response.data.billingID;
        const siNumber = response.data.siNumber;

        if (billingType === "perWaybill") {
          // Use the current order from waybillNumbers state
          const orderedWaybillsToSave = waybillNumbers.filter(
            (wb) => checkedWaybills[wb.waybillNumber]
          );

          // Keep track of processed waybills (though less critical with ordered list)
          const processedWaybills = new Set();

          // Iterate through the ORDERED list to get the correct row index
          for (const [index, waybill] of orderedWaybillsToSave.entries()) {
            // Skip if we've somehow already processed this waybill
            if (processedWaybills.has(waybill.waybillNumber)) {
              continue;
            }
            processedWaybills.add(waybill.waybillNumber);

            const amount = parseFloat(waybill.amount || 0);
            const gross = amount;
            const vat = (gross / 1.12) * 0.12;
            const net = gross - vat;
            const withTax = net * 0.02;
            const netAmount = gross - withTax;
            const percentage = waybill.quantity
              ? waybill.quantity.replace("%", "")
              : "0";
            const cbm = waybill.cbm || 0;
            const parentReference = waybill.isSubWaybill
              ? waybill.parentWaybillNumber
              : "";

            const detailPayload = {
              billingDetailID: `BD-${Date.now()}-${waybill.waybillNumber}`,
              billingID,
              siNumber,
              waybillNumber: waybill.waybillNumber,
              displayWaybillNumber:
                waybill.displayWaybillNumber || waybill.waybillNumber,
              description: waybill.description || waybill.waybillNumber,
              quantity: waybill.quantity || "1",
              amount: amount.toFixed(2),
              gross: gross.toFixed(2),
              vat: vat.toFixed(2),
              net: net.toFixed(2),
              withTax: withTax.toFixed(2),
              netAmount: netAmount.toFixed(2),
              percentage: percentage + "%",
              cbm: cbm,
              status: "Pending",
              rows: index, // <<< Add the row index here
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };

            try {
              console.log(
                "Sending waybill billingDetail payload:",
                detailPayload
              );
              await axios.post(
                `${process.env.NEXT_PUBLIC_BACKEND_API}/api/billingDetail`,
                detailPayload
              );
            } catch (error) {
              console.error("Error creating waybill billing detail:", error);
              console.log("Failed waybill payload:", detailPayload);
              throw error; // Re-throw to be caught by outer try/catch
            }
          }
        } else {
          // Create billing details for manual entries
          // Iterate through the state which maintains order
          for (const [index, entry] of manualEntries.entries()) {
            if (entry.description && entry.amount) {
              const amount = parseFloat(entry.amount);
              const gross = amount;
              const vat = (gross / 1.12) * 0.12;
              const net = gross - vat;
              const withTax = net * 0.02;
              const netAmount = gross - withTax;

              const detailPayload = {
                billingDetailID: `BD-${Date.now()}-${entry.id}`,
                billingID,
                siNumber,
                description: entry.description,
                waybillNumber: null,
                amount: amount.toFixed(2),
                quantity: "1",
                gross: gross.toFixed(2),
                vat: vat.toFixed(2),
                net: net.toFixed(2),
                withTax: withTax.toFixed(2),
                netAmount: netAmount.toFixed(2),
                status: "Pending",
                type: billingType,
                cbm: 0,
                percentage: "0%",
                rows: index, // <<< Add the row index here
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              };

              try {
                console.log(
                  "Sending manual entry billingDetail payload:",
                  detailPayload
                );
                await axios.post(
                  `${process.env.NEXT_PUBLIC_BACKEND_API}/api/billingDetail`,
                  detailPayload
                );
              } catch (error) {
                console.error("Error creating billing detail:", error);
                console.log("Failed payload:", detailPayload);
                throw error; // Re-throw
              }
            }
          }
        }
      } else {
        // Update existing billing record
        await axios.put(
          `${process.env.NEXT_PUBLIC_BACKEND_API}/api/billing/${billingData._id}`,
          payload
        );

        // Handle billing details update based on billing type
        if (billingType === "perWaybill") {
          // Get existing billing details for the current billing record
          const existingDetailsResponse = await axios.get(
            `${process.env.NEXT_PUBLIC_BACKEND_API}/api/billingDetail/billingID/${billingData.billingID}`
          );
          const existingDetails = existingDetailsResponse.data || [];

          // Delete all existing billing details associated with this billing record
          for (const detail of existingDetails) {
            try {
              await axios.delete(
                `${process.env.NEXT_PUBLIC_BACKEND_API}/api/billingDetail/${detail._id}`
              );
            } catch (error) {
              console.error(
                `Error deleting billing detail ${detail._id}:`,
                error
              );
              // Log and continue, but maybe show a warning later
            }
          }

          // Create new billing details only for the currently checked waybills, IN ORDER
          const orderedWaybillsToSave = waybillNumbers.filter(
            (wb) => checkedWaybills[wb.waybillNumber]
          );
          const processedWaybills = new Set();

          for (const [index, waybill] of orderedWaybillsToSave.entries()) {
            if (processedWaybills.has(waybill.waybillNumber)) {
              continue;
            }
            processedWaybills.add(waybill.waybillNumber);

            const amount = parseFloat(waybill.amount || 0);
            const gross = amount;
            const vat = (gross / 1.12) * 0.12;
            const net = gross - vat;
            const withTax = net * 0.02;
            const netAmount = gross - withTax;
            const percentage = waybill.quantity
              ? waybill.quantity.replace("%", "")
              : "0";
            const cbm = waybill.cbm || 0;

            const detailPayload = {
              billingDetailID: `BD-${Date.now()}-${waybill.waybillNumber}`,
              billingID: billingData.billingID,
              siNumber: selectedInvoiceNumber,
              waybillNumber: waybill.waybillNumber,
              displayWaybillNumber:
                waybill.displayWaybillNumber || waybill.waybillNumber,
              description: waybill.description || waybill.waybillNumber,
              quantity: waybill.quantity || "1",
              amount: amount.toFixed(2),
              gross: gross.toFixed(2),
              vat: vat.toFixed(2),
              net: net.toFixed(2),
              withTax: withTax.toFixed(2),
              netAmount: netAmount.toFixed(2),
              percentage: percentage + "%",
              cbm: cbm,
              status: "Pending",
              rows: index, // <<< Add the row index here
              createdAt: new Date().toISOString(), // Should ideally use existing if possible, but new is okay
              updatedAt: new Date().toISOString(),
            };

            try {
              console.log(
                "Creating new waybill billingDetail payload during edit:",
                detailPayload
              );
              await axios.post(
                `${process.env.NEXT_PUBLIC_BACKEND_API}/api/billingDetail`,
                detailPayload
              );
            } catch (error) {
              console.error(
                "Error creating waybill billing detail during edit:",
                error
              );
              // Log and potentially show a warning toast
              toast({
                title: "Warning",
                description: `Failed to save detail for waybill ${waybill.waybillNumber}.`,
                status: "warning",
                duration: 3000,
                isClosable: true,
              });
            }
          }
        } else {
          // Handle Garbage Hauling or Other Services billing details
          try {
            // Get existing billing details
            const response = await axios.get(
              `${process.env.NEXT_PUBLIC_BACKEND_API}/api/billingDetail/billingID/${billingData.billingID}`
            );
            const existingDetails = response.data || [];

            // Delete all existing billing details
            for (const detail of existingDetails) {
              try {
                await axios.delete(
                  `${process.env.NEXT_PUBLIC_BACKEND_API}/api/billingDetail/${detail._id}`
                );
              } catch (error) {
                console.error("Error deleting billing detail:", error);
              }
            }

            // Create new billing details for manual entries IN ORDER
            for (const [index, entry] of manualEntries.entries()) {
              if (entry.description && entry.amount) {
                const amount = parseFloat(entry.amount);
                const gross = amount;
                const vat = (gross / 1.12) * 0.12;
                const net = gross - vat;
                const withTax = net * 0.02;
                const netAmount = gross - withTax;

                const detailPayload = {
                  billingDetailID: `BD-${Date.now()}-${entry.id}`,
                  billingID: billingData.billingID,
                  siNumber: selectedInvoiceNumber,
                  description: entry.description,
                  waybillNumber: null,
                  amount: amount.toFixed(2),
                  quantity: "1",
                  gross: gross.toFixed(2),
                  vat: vat.toFixed(2),
                  net: net.toFixed(2),
                  withTax: withTax.toFixed(2),
                  netAmount: netAmount.toFixed(2),
                  status: "Pending",
                  type: billingType,
                  cbm: 0,
                  percentage: "0%",
                  rows: index, // <<< Add the row index here
                  createdAt: new Date().toISOString(), // As above, new is okay
                  updatedAt: new Date().toISOString(),
                };

                try {
                  console.log(
                    "Creating new billing detail for manual entry:",
                    detailPayload
                  );
                  await axios.post(
                    `${process.env.NEXT_PUBLIC_BACKEND_API}/api/billingDetail`,
                    detailPayload
                  );
                } catch (error) {
                  console.error("Error creating billing detail:", error);
                  throw error; // Re-throw
                }
              }
            }
          } catch (error) {
            console.error(
              "Error updating manual entry billing details:",
              error
            );
            toast({
              title: "Warning",
              description:
                "Could not update all billing details, but main billing was saved",
              status: "warning",
              duration: 3000,
              isClosable: true,
            });
          }
        }
      }

      // Show success toast
      toast({
        title: "Success",
        description: isEditing
          ? "Billing updated successfully"
          : "Billing created successfully",
        status: "success",
        duration: 3000,
        isClosable: true,
      });

      // Callback to refresh data in the parent component
      if (onDataChange) {
        onDataChange();
      }

      // Reset state
      setSelectedCustomer("");
      setManualCustomerName("");
      setManualAddress("");
      setManualTin("");
      setCheckedWaybills({});
      setWaybillNumbers([]);
      setSelectedInvoiceNumber("");
      setHeaderPaymentMethod("CHARGE");
      setBottomPaymentMethod("CASH");
      setManualEntries([{ id: Date.now(), description: "", amount: "" }]);

      // Close the modal if onClose is provided
      if (onClose) {
        onClose();
      }
    } catch (error) {
      console.error("Error saving billing:", error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to save billing",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Placeholder function for saving draft
  // const { currentUser } = useAuth(); // REMOVED
  const handleSaveDraft = async () => {
    // REMOVED User check
    // if (!currentUser || !currentUser.id) { ... }

    // Clear previous input and open the modal to ask for draft name
    setDraftNameInput("");
    onOpenDraftNameModal();
  };

  // Function to actually submit the draft after getting the name
  const submitDraft = async () => {
    const draftName = draftNameInput.trim(); // Use the name from modal state

    if (!draftName) {
      toast({
        title: "Draft Name Required",
        description: "Please enter a name for the draft.",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return; // Keep the modal open
    }

    // Collect waybill amounts if applicable
    const waybillAmounts = {};
    if (billingType === "perWaybill") {
      waybillNumbers.forEach((wb) => {
        // Ensure amount exists and is a string before storing
        waybillAmounts[wb.waybillNumber] = wb.amount?.toString() || "0";
      });
    }

    // Create waybillOrder array if billingType is perWaybill
    const waybillOrder =
      billingType === "perWaybill"
        ? waybillNumbers.map((wb) => wb.waybillNumber)
        : [];

    const draftData = {
      draftName,
      // userId: currentUser.id, // REMOVED
      originalBillingId: isEditing ? billingData.billingID : null,
      billingType,
      selectedCustomer,
      selectedDate,
      headerPaymentMethod,
      bottomPaymentMethod,
      selectedInvoiceNumber,
      manualCustomerName,
      manualAddress,
      manualTin,
      manualEntries: manualEntries.map((entry, index) => ({
        // Add rows index here
        description: entry.description,
        amount: entry.amount,
        rows: index, // Save the row index
      })),
      checkedWaybills, // Send the current checked state
      waybillOrder: waybillOrder, // Send the ordered waybill numbers
    };

    console.log("Saving draft with data:", draftData);

    try {
      // Use the correct endpoint defined in server.js
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/draft-billings`,
        draftData
        // REMOVED headers object
        // {
        //   headers: { ... },
        // }
      );

      toast({
        title: "Draft Saved Successfully",
        description: `Draft "${draftName}" has been saved.`,
        status: "success",
        duration: 3000,
        isClosable: true,
      });

      onCloseDraftNameModal(); // Close the name input modal

      // Refresh drafts list
      const fetchDrafts = async () => {
        try {
          const response = await axios.get(
            `${process.env.NEXT_PUBLIC_BACKEND_API}/api/draft-billings`
          );
          setDrafts(response.data || []);
        } catch (error) {
          console.error("Error re-fetching drafts after save:", error);
        }
      };
      fetchDrafts();

      // Optionally close the main billing form/modal after saving
      // if (onClose) {
      //   onClose();
      // }
    } catch (error) {
      console.error(
        "Error saving draft:",
        error.response?.data || error.message
      );
      toast({
        title: "Failed to Save Draft",
        description:
          error.response?.data?.message ||
          "An error occurred while saving the draft.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      // Don't close the name modal on error, let user try again
    }
  };

  // New function to fetch and merge subdetail data using entity abbreviation summaries
  const fetchAndMergeSubdetails = async (waybillData) => {
    if (!waybillData || waybillData.length === 0) return waybillData;

    try {
      // Get company prefix
      const selectedCompanyPrefix =
        waybillData[0]?.company?.split(" ")[0] || "";

      // Get all waybill numbers
      const waybillNumbers = [
        ...new Set(waybillData.map((w) => w.waybillNumber)),
      ];

      // Fetch entity abbreviation summaries for each waybill
      const result = [];

      for (const waybillNumber of waybillNumbers) {
        const summaries = await fetchEntityAbbreviationSummaries(waybillNumber);

        // Find the summary for this company
        const companySummary = summaries.find(
          (s) =>
            s.entityAbbreviation.toUpperCase() ===
            selectedCompanyPrefix.toUpperCase()
        );

        if (companySummary) {
          result.push({
            waybillNumber: waybillNumber,
            company: waybillData[0]?.company || "",
            consignee: selectedCompanyPrefix,
            amount: companySummary.totalAmount,
            percentage: companySummary.totalPercentage,
            additionals: 0,
            totalAmount: companySummary.totalAmount,
          });
        }
      }

      // Format for display
      result.forEach((waybill) => {
        // Format percentage for display
        if (waybill.percentage !== undefined) {
          waybill.quantity = roundPercentage(waybill.percentage);
        }
      });

      return result;
    } catch (error) {
      console.error("Error fetching entity summaries:", error);
      return waybillData;
    }
  };

  // Add a useEffect to force waybill display in read-only mode
  useEffect(() => {
    if (isReadOnly && billingData && billingData.billingID) {
      // Force fetch billing details for read-only mode if waybills are empty
      if (waybillNumbers.length === 0) {
        fetchBillingDetails();
      }
    }
  }, [isReadOnly, billingData, waybillNumbers.length]);

  // When in read-only mode, set customer and load billing details
  useEffect(() => {
    if (isReadOnly && billingData && billingData.storeName) {
      setSelectedCustomer(billingData.storeName);

      // Ensure the date is properly formatted and set
      if (billingData.invoiceDate) {
        const dateObj = new Date(billingData.invoiceDate);
        const formattedDate = dateObj.toISOString().split("T")[0];
        setSelectedDate(formattedDate);
      } else {
        setSelectedDate(today);
      }

      // Set correct billing type based on the billing data
      setBillingType(billingData.billingType || "perWaybill");

      // For manual entry billing types, initialize the customer fields
      if (billingData.billingType && billingData.billingType !== "perWaybill") {
        setManualCustomerName(billingData.storeName || "");
        setManualAddress(billingData.address || "");
        setManualTin(billingData.tin || "");
      }

      // Fetch billing details for existing record
      fetchBillingDetails();
    }
  }, [isReadOnly, billingData]);

  // When in edit mode, load data and apply customer selection
  useEffect(() => {
    if (isEditing && billingData && billingData.storeName) {
      setSelectedCustomer(billingData.storeName);

      // Ensure the date is properly formatted and set
      if (billingData.invoiceDate) {
        const dateObj = new Date(billingData.invoiceDate);
        const formattedDate = dateObj.toISOString().split("T")[0];
        console.log("Setting date to:", formattedDate);
        setSelectedDate(formattedDate);
      } else {
        setSelectedDate(today);
      }

      // Set correct billing type based on the billing data
      setBillingType(billingData.billingType || "perWaybill");

      // For manual entry billing types, initialize the customer fields
      if (billingData.billingType && billingData.billingType !== "perWaybill") {
        setManualCustomerName(billingData.storeName || "");
        setManualAddress(billingData.address || "");
        setManualTin(billingData.tin || "");
      }

      // Fetch billing details for existing record when in edit mode
      fetchBillingDetails();
    }
  }, [isEditing, billingData]);

  // Function to handle manual editing of waybill amount on perWaybill
  const handleWaybillAmountChange = (waybillNumber, value) => {
    // Remove non-numeric characters except decimal point
    const numericValue = value.replace(/[^0-9.]/g, "");
    // Ensure only one decimal point
    const parts = numericValue.split(".");
    const formattedValue =
      parts[0] + (parts.length > 1 ? "." + parts[1].slice(0, 2) : "");
    setWaybillNumbers((prev) =>
      prev.map((item) =>
        item.waybillNumber === waybillNumber
          ? { ...item, amount: formattedValue }
          : item
      )
    );
  };

  // Modal state for viewing drops
  const {
    isOpen: isDropsModalOpen,
    onOpen: onOpenDropsModal,
    onClose: closeDropsModalCallback, // Rename original onClose
  } = useDisclosure();
  const [selectedWaybillForDrops, setSelectedWaybillForDrops] = useState(null);
  const router = useRouter(); // Get router instance
  const [isWaybillEditMode, setIsWaybillEditMode] = useState(false); // State for waybill edit mode
  const allWaybillsRef = useRef([]); // Ref to store all fetched waybills
  const initialCheckedRef = useRef({}); // Ref to store initial checked state
  const initiallyBilledWaybillsRef = useRef([]); // Ref to store initial displayed waybills
  const [drafts, setDrafts] = useState([]); // State for drafts list
  const [selectedDraftId, setSelectedDraftId] = useState(""); // State for selected draft ID

  // State for rounding toggle
  const [isRounded, setIsRounded] = useState(false);
  const [originalWaybillValues, setOriginalWaybillValues] = useState([]); // Renamed state

  // Popover state for context menu
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [popoverTargetWaybill, setPopoverTargetWaybill] = useState(null);
  // const [popoverPosition, setPopoverPosition] = useState({ top: 0, left: 0 }); // REMOVED

  // Draft Name Modal state
  const {
    isOpen: isDraftNameModalOpen,
    onOpen: onOpenDraftNameModal,
    onClose: onCloseDraftNameModal,
  } = useDisclosure();
  const [draftNameInput, setDraftNameInput] = useState(""); // State for draft name input

  // Handler for View Drops button
  const handleViewDropsClick = () => {
    const firstCheckedWaybill = Object.keys(checkedWaybills).find(
      (wbNumber) => checkedWaybills[wbNumber]
    );

    if (firstCheckedWaybill) {
      // Find the full waybill object to potentially pass more data if needed
      const waybillData = waybillNumbers.find(
        (wb) => wb.waybillNumber === firstCheckedWaybill
      );
      console.log(
        "Viewing drops for waybill:",
        firstCheckedWaybill,
        waybillData
      );
      setSelectedWaybillForDrops(firstCheckedWaybill);
      onOpenDropsModal();
    } else {
      toast({
        title: "No Waybill Selected",
        description: "Please check at least one waybill to view its drops.",
        status: "info",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  // Fetch drafts on component mount (if not read-only)
  useEffect(() => {
    const fetchDrafts = async () => {
      if (isReadOnly) return; // Don't fetch drafts in read-only mode
      try {
        console.log("Fetching drafts...");
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_BACKEND_API}/api/draft-billings`
        );
        console.log("Drafts fetched:", response.data);
        setDrafts(response.data || []);
      } catch (error) {
        console.error("Error fetching drafts:", error);
        toast({
          title: "Error Loading Drafts",
          description: "Could not fetch saved drafts.",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
        setDrafts([]); // Set to empty array on error
      }
    };

    fetchDrafts();
  }, [isReadOnly, toast]); // Added isReadOnly and toast dependencies

  // Handler for selecting a draft
  // Make the handler async
  const handleDraftSelect = async (e) => {
    const draftId = e.target.value;
    setSelectedDraftId(draftId);
    console.log("Selected Draft ID:", draftId);

    if (!draftId) {
      // TODO: Define behavior for clearing selection (e.g., reset form?)
      console.log("Draft selection cleared.");
      // Example: Reset to initial state if needed
      // resetFormState(); // You would need to create a reset function
      return;
    }

    // Fetch the full draft data
    try {
      setIsLoading(true); // Show loading indicator while fetching/setting
      console.log(`Fetching draft data for ID: ${draftId}`);
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/draft-billings/${draftId}`
      );
      const draftData = response.data;
      console.log("Loaded draft data:", draftData);

      // Populate form state with draft data
      setBillingType(draftData.billingType || "perWaybill");
      setSelectedCustomer(draftData.selectedCustomer || "");
      setSelectedDate(
        draftData.selectedDate
          ? new Date(draftData.selectedDate).toISOString().split("T")[0]
          : today
      );
      setHeaderPaymentMethod(draftData.headerPaymentMethod || "CHARGE");
      setBottomPaymentMethod(draftData.bottomPaymentMethod || "CASH");
      setSelectedInvoiceNumber(draftData.selectedInvoiceNumber || "");
      setManualCustomerName(draftData.manualCustomerName || "");
      setManualAddress(draftData.manualAddress || "");
      setManualTin(draftData.manualTin || "");
      // Ensure manualEntries has unique IDs for React keys if loaded from draft
      setManualEntries(
        (draftData.manualEntries || []).map((entry) => ({
          ...entry,
          id: Date.now() + Math.random(),
        })) || [{ id: Date.now(), description: "", amount: "" }]
      );
      // REMOVED: setCheckedWaybills(draftData.checkedWaybills || {}); // Don't set checks here, wait for waybills to load

      // If it's a perWaybill draft, we need to ensure all waybills are loaded and apply amounts
      if (draftData.billingType === "perWaybill") {
        // Trigger fetching all waybills for the selected customer
        if (draftData.selectedCustomer) {
          // Call the function that fetches waybills based on customer name
          // This might involve re-fetching or using cached data if available
          // We also need to apply the saved amounts from the draft
          // Await the completion of waybill fetching
          await handleCustomerChange({
            target: { value: draftData.selectedCustomer },
          });

          // After waybills are fetched, apply checks and SORT based on draft order.
          setWaybillNumbers((prevWaybills) => {
            // Get the order from the draft
            const order = draftData.waybillOrder || [];
            if (order.length === 0) return prevWaybills; // No order saved, keep fetched order

            // Create a map for quick lookup
            const waybillMap = new Map(
              prevWaybills.map((wb) => [wb.waybillNumber, wb])
            );

            // Create the sorted array
            const sortedWaybills = order
              .map((waybillNum) => waybillMap.get(waybillNum)) // Get waybill object from map based on saved order
              .filter((wb) => wb !== undefined); // Filter out any waybills that might no longer exist

            // Append any waybills present in fetched data but missing from saved order (e.g., added later)
            const orderedWaybillNumbers = new Set(order);
            const remainingWaybills = prevWaybills.filter(
              (wb) => !orderedWaybillNumbers.has(wb.waybillNumber)
            );

            return [...sortedWaybills, ...remainingWaybills];
          });

          // Set waybill edit mode to true as loading a draft implies editing waybills
          setIsWaybillEditMode(true);
          setCheckedWaybills(draftData.checkedWaybills || {}); // Apply checked state HERE, after waybills load
          setIsLoading(false); // Hide loading indicator
          console.log("Applied waybill order and checks from draft.");
        } else {
          setWaybillNumbers([]); // Clear waybills if no customer in draft
          setIsLoading(false);
        }
      } else {
        // For manual entry types, sort based on saved row index
        setManualEntries((prevEntries) => {
          const sortedEntries = [...prevEntries];
          sortedEntries.sort(
            (a, b) => (a.rows ?? Infinity) - (b.rows ?? Infinity)
          );
          // Re-assign unique IDs after sorting if necessary (or ensure they are stable)
          return sortedEntries.map((entry) => ({
            ...entry,
            id: Date.now() + Math.random(),
          }));
        });
        setIsLoading(false); // Hide loading for non-perWaybill
      }

      toast({
        title: "Draft Loaded",
        description: `Draft "${draftData.draftName}" loaded successfully.`,
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      setIsLoading(false); // Hide loading on error
      console.error(
        "Error loading draft:",
        error.response?.data || error.message
      );
      toast({
        title: "Failed to Load Draft",
        description:
          error.response?.data?.message ||
          "An error occurred while loading the draft.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      setSelectedDraftId(""); // Reset dropdown on error
    }
  };

  // Context Menu Handler
  const handleContextMenu = (event, waybillNumber) => {
    if (isReadOnly || billingType !== "perWaybill") return; // Only enable for editable perWaybill

    event.preventDefault(); // Prevent default browser menu
    setPopoverTargetWaybill(waybillNumber); // Set the target waybill
    // setPopoverPosition({ top: event.clientY - 5, left: event.clientX - 5 }); // REMOVED
    setIsPopoverOpen(true); // Open the popover
  };

  // Function to round all waybill percentages (now a toggle)
  const handleToggleRounding = () => {
    if (!isRounded) {
      // --- Store original values before rounding ---
      const originals = waybillNumbers.map((wb) => ({
        waybillNumber: wb.waybillNumber,
        originalQuantity: wb.quantity,
        originalAmount: wb.amount, // Store original amount
      }));
      setOriginalWaybillValues(originals); // Use renamed state setter

      // --- Apply rounding and recalculate amount ---
      setWaybillNumbers((currentWaybills) =>
        currentWaybills.map((wb) => {
          if (
            wb.quantity &&
            typeof wb.quantity === "string" &&
            wb.quantity.includes("%") &&
            wb.baseAmount
          ) {
            // Check for baseAmount
            try {
              const numValue = parseFloat(wb.quantity.replace("%", ""));
              if (!isNaN(numValue)) {
                const roundedPercentage = Math.round(numValue);
                const newAmount = (wb.baseAmount * roundedPercentage) / 100;
                return {
                  ...wb,
                  quantity: `${roundedPercentage.toFixed(2)}%`,
                  amount: newAmount.toFixed(2), // Update amount with calculated value
                };
              }
            } catch (error) {
              console.error(
                `Error parsing/calculating for waybill ${wb.waybillNumber}:`,
                error
              );
              return wb; // Return original if parsing/calculation fails
            }
          }
          return wb; // Return original if no percentage, baseAmount, or not a string
        })
      );
      toast({
        // Add feedback toast
        title: "Percentages Rounded",
        description:
          "All waybill percentages have been rounded to the nearest whole number.",
        status: "success",
        duration: 2000,
        isClosable: true,
      });
    } else {
      // --- Restore original values ---
      // Match original values back to the current waybill list
      setWaybillNumbers((currentWaybills) =>
        currentWaybills.map((wb) => {
          const originalData = originalWaybillValues.find(
            // Use renamed state
            (orig) => orig.waybillNumber === wb.waybillNumber
          );
          return originalData
            ? {
                ...wb,
                quantity: originalData.originalQuantity,
                amount: originalData.originalAmount,
              } // Restore amount too
            : wb; // Return current waybill if no original found (should not happen in theory)
        })
      );
      setOriginalWaybillValues([]); // Clear the stored originals using renamed state setter
      toast({
        // Add feedback toast
        title: "Rounding Canceled",
        description: "Original percentages have been restored.",
        status: "info",
        duration: 2000,
        isClosable: true,
      });
    }
    // Toggle the rounded state
    setIsRounded(!isRounded);
  };

  // dnd-kit sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // dnd-kit drag end handler
  function handleDragEnd(event) {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setWaybillNumbers((items) => {
        const oldIndex = items.findIndex(
          (item) => item.waybillNumber === active.id
        );
        const newIndex = items.findIndex(
          (item) => item.waybillNumber === over.id
        );
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }

  // Sortable Waybill Row Component
  const SortableWaybillRow = ({ waybill, index }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging, // Added to potentially style dragging row
    } = useSortable({ id: waybill.waybillNumber });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.8 : 1, // Example style for dragging row
      cursor: isReadOnly ? "default" : "grab", // Change cursor based on read-only state
      backgroundColor: isDragging
        ? "lightblue"
        : index % 2 === 0
          ? "white"
          : "gray.50", // Example bg color change
    };

    return (
      <Popover
        key={waybill.waybillNumber || index}
        isOpen={isPopoverOpen && popoverTargetWaybill === waybill.waybillNumber}
        onClose={() => setIsPopoverOpen(false)}
        isLazy
        placement="left-start"
      >
        <PopoverTrigger>
          <Tr
            ref={setNodeRef}
            style={style}
            {...attributes} // Remove {...listeners} here, apply it to the handle
            bg={index % 2 === 0 ? "white" : "gray.50"}
            onContextMenu={(e) => handleContextMenu(e, waybill.waybillNumber)}
            _hover={
              !isReadOnly && billingType === "perWaybill"
                ? { bg: "gray.100", cursor: "context-menu" }
                : {}
            }
          >
            <Td
              borderRight="1px solid"
              borderColor="gray.200"
              textAlign="center"
              px={1} // Reduced padding for handle
            >
              {!isReadOnly && billingType === "perWaybill" ? (
                <Box
                  as="button"
                  {...listeners} // Apply listeners ONLY to the handle
                  p={1}
                  aria-label="Drag to reorder"
                  _hover={{ bg: "gray.200" }}
                  borderRadius="sm"
                >
                  <DragHandleIcon color="gray.500" boxSize={3} />
                </Box>
              ) : (
                // Placeholder or Checkbox for read-only/non-waybill type
                <Checkbox
                  colorScheme="blue"
                  size="sm"
                  borderColor="#800000"
                  isChecked={checkedWaybills[waybill.waybillNumber] || false}
                  onChange={() => handleWaybillCheck(waybill.waybillNumber)}
                  isDisabled={isReadOnly} // Checkbox is always disabled in read-only
                />
              )}
            </Td>
            <Td
              borderRight="1px solid"
              borderColor="gray.200"
              textAlign="center"
            >
              <Checkbox
                colorScheme="blue"
                size="sm"
                borderColor="#800000"
                isChecked={checkedWaybills[waybill.waybillNumber] || false}
                onChange={() => handleWaybillCheck(waybill.waybillNumber)}
                isDisabled={isReadOnly}
              />
            </Td>
            <Td borderRight="1px solid" borderColor="gray.200" fontSize="sm">
              {waybill.description}
              {waybill.isPayload && (
                <Badge ml={2} colorScheme="orange" size="sm" variant="subtle">
                  PAYLOAD
                </Badge>
              )}
              {waybill.isSplit && !waybill.isPayload && (
                <Badge ml={2} colorScheme="purple" size="sm" variant="subtle">
                  SUB
                </Badge>
              )}
              {waybill.hasSubdetails && (
                <Text
                  as="span"
                  color="blue.500"
                  ml={2}
                  fontWeight="bold"
                  title="Includes subdetails"
                >
                  +
                </Text>
              )}
            </Td>
            <Td
              borderRight="1px solid"
              borderColor="gray.200"
              textAlign="center"
              fontSize="sm"
            >
              {waybill.quantity}
            </Td>
            <Td
              borderRight="1px solid"
              borderColor="gray.200"
              textAlign="right"
              fontSize="sm"
            >
              {waybill.unitPrice ? formatCurrency(waybill.unitPrice) : ""}
            </Td>
            <Td
              textAlign="right"
              fontSize="sm"
              fontWeight={waybill.amount ? "medium" : "normal"}
              onDoubleClick={() => {
                if (!isReadOnly) setEditingRow(waybill.waybillNumber);
              }}
            >
              <Tooltip
                label="Double Click to Edit Amount"
                placement="top"
                hasArrow
                isDisabled={isReadOnly || billingType !== "perWaybill"}
              >
                {editingRow === waybill.waybillNumber ? (
                  <Input
                    value={waybill.amount?.toString() || ""}
                    onChange={(e) =>
                      handleWaybillAmountChange(
                        waybill.waybillNumber,
                        e.target.value
                      )
                    }
                    onBlur={() => setEditingRow(null)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") setEditingRow(null);
                    }}
                    size="sm"
                    variant="unstyled"
                    textAlign="right"
                    autoFocus
                  />
                ) : waybill.amount ? (
                  formatCurrency(waybill.amount)
                ) : (
                  ""
                )}
              </Tooltip>
            </Td>
          </Tr>
        </PopoverTrigger>
        <PopoverContent width="auto" borderColor="blue.500">
          <PopoverArrow />
          <PopoverBody p={1}>
            <Button
              variant="ghost"
              colorScheme="purple"
              size="sm"
              color="#800000"
              onClick={() => {
                setSelectedWaybillForDrops(waybill.waybillNumber);
                onOpenDropsModal();
                setIsPopoverOpen(false);
              }}
            >
              View Drops
            </Button>
          </PopoverBody>
        </PopoverContent>
      </Popover>
    );
  };

  // Function to fetch and update a single waybill's data from its summary
  const refreshSingleWaybillData = async (uniqueWaybillId) => {
    if (!uniqueWaybillId) return;

    console.log(`Refreshing data for waybill ID: ${uniqueWaybillId}`);

    try {
      // Find the item in the current state to get the original (parent) waybill number
      const currentWaybillItem = waybillNumbers.find(
        (wb) => wb.waybillNumber === uniqueWaybillId
      );

      if (!currentWaybillItem) {
        console.warn(
          `Could not find current waybill item for ID: ${uniqueWaybillId}`
        );
        return;
      }

      // Get the parent waybill number (either from originalWaybillNumber or using waybillNumber as fallback)
      const parentWaybillNumber =
        currentWaybillItem.originalWaybillNumber ||
        currentWaybillItem.waybillNumber;

      // First approach: Try fetching from billingDetail if this is an editing session
      if (isEditing && billingData.billingID) {
        try {
          // Look for this waybill in the billing details
          const billingDetailResponse = await axios.get(
            `${process.env.NEXT_PUBLIC_BACKEND_API}/api/billingDetail/billingID/${billingData.billingID}`
          );

          const details = billingDetailResponse.data || [];
          const matchingDetail = details.find(
            (detail) => detail.waybillNumber === uniqueWaybillId
          );

          if (matchingDetail) {
            console.log(
              `Found updated billing detail for ${uniqueWaybillId}:`,
              matchingDetail
            );

            // Update the waybillNumbers state with billing detail data
            setWaybillNumbers((prevWaybills) => {
              return prevWaybills.map((wb) => {
                if (wb.waybillNumber === uniqueWaybillId) {
                  return {
                    ...wb,
                    quantity: matchingDetail.quantity || wb.quantity,
                    amount: parseFloat(matchingDetail.amount).toFixed(2),
                    description: matchingDetail.description || wb.description,
                    percentage: matchingDetail.percentage || wb.percentage,
                    baseAmount: matchingDetail.amount,
                  };
                }
                return wb;
              });
            });

            // Success! No need to try other methods
            // toast({
            //   title: "Waybill Updated",
            //   description: `Data for waybill ${uniqueWaybillId} has been refreshed.`,
            //   status: "info",
            //   duration: 2000,
            //   isClosable: true,
            // });

            return;
          }
        } catch (detailError) {
          console.warn(
            `Could not find billing detail for ${uniqueWaybillId}, falling back to summaries.`
          );
          // Fall back to entity summaries approach below
        }
      }

      // Second approach: Use entity-abbreviation-summary
      // Fetch the latest summaries for the PARENT waybill
      const summariesResponse = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/entity-abbreviation-summary/waybill/${parentWaybillNumber}`
      );
      const summaries = summariesResponse.data || [];

      // Find the specific summary that corresponds to our uniqueWaybillId
      // This might be the summary where summary.waybillNumber matches (if it's a parent)
      // OR where summary.subWaybillNumber matches (if it's a sub-waybill)
      const relevantSummary = summaries.find(
        (summary) =>
          summary.waybillNumber === uniqueWaybillId ||
          summary.subWaybillNumber === uniqueWaybillId
      );

      if (!relevantSummary) {
        console.warn(
          `Could not find relevant summary for ID: ${uniqueWaybillId} under parent ${parentWaybillNumber}`
        );
        // toast({
        //   title: "Refresh Failed",
        //   description: `Could not find updated data for waybill ${uniqueWaybillId}.`,
        //   status: "warning",
        //   duration: 3000,
        //   isClosable: true,
        // });
        return;
      }

      console.log(
        `Found updated summary for ${uniqueWaybillId}:`,
        relevantSummary
      );

      // Get updated body type if available
      let bodyType = null;
      try {
        const shipperInfo = await fetchShipperInfo(parentWaybillNumber);
        if (shipperInfo) {
          bodyType = shipperInfo.bodyType;
        }
      } catch (error) {
        console.warn(
          `Error fetching shipper info for ${parentWaybillNumber}:`,
          error
        );
      }

      // Create updated description with body type
      let description = `FW: ${parentWaybillNumber}`;
      if (bodyType) {
        description += ` (${bodyType})`;
      }

      // Add SUB or PAYLOAD suffix if applicable
      const isSplit =
        relevantSummary.split === "split" ||
        (relevantSummary.entityAbbreviation &&
          relevantSummary.entityAbbreviation.startsWith("split-"));
      const isPayload =
        relevantSummary.payload === "payload" ||
        (relevantSummary.entityAbbreviation &&
          relevantSummary.entityAbbreviation.startsWith("payload-"));

      if (isSplit) {
        description += " SUB";
      } else if (isPayload) {
        description += " PAYLOAD";
      }

      // Update the waybillNumbers state
      setWaybillNumbers((prevWaybills) => {
        return prevWaybills.map((wb) => {
          if (wb.waybillNumber === uniqueWaybillId) {
            // Update the specific waybill entry
            return {
              ...wb, // Keep existing properties
              description: description,
              quantity: roundPercentage(relevantSummary.totalPercentage || 0),
              amount: relevantSummary.totalAmount
                ? relevantSummary.totalAmount.toFixed(2)
                : wb.amount,
              baseAmount: relevantSummary.totalAmount || wb.baseAmount,
              isSplit: isSplit,
              isPayload: isPayload,
            };
          }
          return wb; // Return unchanged waybills
        });
      });

      // toast({
      //   title: "Waybill Refreshed",
      //   description: `Data for waybill ${uniqueWaybillId} has been updated.`,
      //   status: "info",
      //   duration: 2000,
      //   isClosable: true,
      // });
    } catch (error) {
      console.error(
        `Error refreshing waybill data for ${uniqueWaybillId}:`,
        error
      );
      // toast({
      //   title: "Refresh Failed",
      //   description: `Could not refresh data for waybill ${uniqueWaybillId}.`,
      //   status: "error",
      //   duration: 3000,
      //   isClosable: true,
      // });
    }
  };

  // New handler that calls refresh then closes
  const handleCloseDropsModal = async () => {
    if (selectedWaybillForDrops) {
      await refreshSingleWaybillData(selectedWaybillForDrops);
    }
    closeDropsModalCallback(); // Call the original onClose from useDisclosure
    setSelectedWaybillForDrops(null); // Clear selection after closing
  };

  // Add the delete draft handler
  const handleDeleteDraft = async (draftId) => {
    if (!window.confirm("Are you sure you want to delete this draft?")) return;
    try {
      await axios.delete(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/draft-billings/${draftId}`
      );
      setDrafts((prev) => prev.filter((d) => d._id !== draftId));
      if (selectedDraftId === draftId) setSelectedDraftId("");
      toast({
        title: "Draft deleted",
        status: "success",
        duration: 2000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: "Failed to delete draft",
        status: "error",
        duration: 2000,
        isClosable: true,
      });
    }
  };

  // Add refresh all waybills function
  const refreshAllWaybills = async () => {
    if (!selectedCustomer) return;
    await fetchWaybillsForCompany(selectedCustomer);
  };

  return (
    <Box p={4} bg="#f8fafc" borderRadius="md" shadow="md">
      <Box
        ref={invoiceRef}
        maxH="calc(100vh - 120px)"
        overflowY="auto"
        overflowX="auto"
        sx={{
          "&::-webkit-scrollbar": {
            width: "8px",
            height: "8px",
            borderRadius: "4px",
            backgroundColor: "rgba(0, 0, 0, 0.05)",
          },
          "&::-webkit-scrollbar-thumb": {
            backgroundColor: "rgba(0, 0, 0, 0.2)",
            borderRadius: "4px",
          },
          "@media print": {
            maxHeight: "none",
            overflow: "visible",
            boxShadow: "none",
          },
        }}
      >
        <Box
          maxW="1200px"
          mx="auto"
          boxShadow="0 8px 30px rgba(0, 0, 0, 0.25)"
          borderRadius="md"
          overflow="hidden"
          bg="white"
          my={8}
          w="100%"
          sx={{
            "@media print": {
              boxShadow: "none",
              my: 0,
            },
          }}
        >
          {/* Header Section with Background */}
          <Box
            color="black"
            py={5}
            px={10}
            position="sticky"
            top="0"
            zIndex="1"
          >
            <Grid templateColumns="auto 1fr" alignItems="center" gap={4}>
              <VStack align="flex-start" spacing={0}>
                <Heading
                  as="h1"
                  size="lg"
                  fontWeight="bold"
                  letterSpacing="wider"
                >
                  JUSTINE'S CARGO SERVICES
                </Heading>
                <Text fontWeight="medium" fontSize="sm">
                  MARIO C. SEGOVIA - Proprietor
                </Text>
                <Text fontSize="xs">
                  11 P. Gomez St. Ortiz Iloilo City | VAT Reg. TIN:
                  923-420-717-00002 | Tel. No.: (033) 321-3805
                </Text>
              </VStack>
            </Grid>
          </Box>

          {/* Service Invoice Numbers Suggestion */}
          <Box px={10} py={2} borderBottom="1px solid" borderColor="gray.200">
            {!isReadOnly && (
              <HStack spacing={4} mb={2}>
                <Text fontSize="sm">
                  Previous Service Invoice Number Used: {previousUsedNumber}
                </Text>
                <Text fontSize="sm">
                  Suggested Service Invoice Number to be used next:{" "}
                  {nextSuggestedNumber}
                </Text>
              </HStack>
            )}
          </Box>

          {/* SERVICE INVOICE Header */}
          <Box
            px={10}
            py={3}
            borderBottom="2px solid"
            borderColor="gray.200"
            bg="gray.50"
          >
            <Flex justifyContent="space-between" alignItems="center">
              <HStack spacing={4} flex={1}>
                <Heading as="h2" size="md" fontWeight="bold" color="black">
                  SERVICE INVOICE
                  {isReadOnly && (
                    <Text
                      as="span"
                      ml={2}
                      fontSize="inherit"
                      fontWeight="inherit"
                    >
                      {billingData.siNumber || billingData.invoiceNumber}
                    </Text>
                  )}
                </Heading>
                {!isReadOnly && (
                  <Select
                    placeholder="Select Service Invoice Number"
                    maxW="300px"
                    size="sm"
                    focusBorderColor="#550000"
                    value={selectedInvoiceNumber}
                    onChange={(e) => setSelectedInvoiceNumber(e.target.value)}
                  >
                    {availableInvoiceNumbers.map((invoice) => (
                      <option key={invoice.value} value={invoice.value}>
                        {invoice.label}
                      </option>
                    ))}
                  </Select>
                )}
                {/* Drafts Dropdown */}
                {!isReadOnly && (
                  <Menu>
                    <MenuButton
                      as={Button}
                      rightIcon={<ChevronDownIcon />}
                      size="sm"
                      maxW="300px"
                      ml={4}
                      borderColor="#800000"
                      variant="outline"
                    >
                      {selectedDraftId
                        ? drafts.find((d) => d._id === selectedDraftId)
                            ?.draftName || "Load from Draft..."
                        : "Load from Draft..."}
                    </MenuButton>
                    <MenuList maxH="300px" overflowY="auto">
                      {drafts.length === 0 && (
                        <MenuItem isDisabled>No drafts available</MenuItem>
                      )}
                      {drafts.map((draft) => (
                        <MenuItem
                          key={draft._id}
                          onClick={() =>
                            handleDraftSelect({ target: { value: draft._id } })
                          }
                          closeOnSelect={false}
                          _hover={{ bg: "gray.100" }}
                        >
                          <HStack justify="space-between" w="100%">
                            <Text>
                              {draft.draftName} (
                              {new Date(draft.createdAt).toLocaleDateString()})
                            </Text>
                            <IconButton
                              icon={<CloseIcon />}
                              size="xs"
                              colorScheme="red"
                              variant="ghost"
                              aria-label="Delete draft"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteDraft(draft._id);
                              }}
                            />
                          </HStack>
                        </MenuItem>
                      ))}
                    </MenuList>
                  </Menu>
                )}
              </HStack>
              <RadioGroup
                onChange={handleHeaderPaymentMethodChange}
                value={headerPaymentMethod}
                colorScheme="red"
                isDisabled={isReadOnly}
              >
                <HStack spacing={6}>
                  <Radio value="CASH" borderColor="gray.400" size="sm">
                    CASH
                  </Radio>
                  <Radio value="CHARGE" borderColor="gray.400" size="sm">
                    CHARGE
                  </Radio>
                </HStack>
              </RadioGroup>
            </Flex>
          </Box>
          {/* Customer Info Section */}
          <Box px={10} py={4} borderBottom="1px solid" borderColor="gray.200">
            <Grid templateColumns={{ base: "1fr", md: "2fr 1fr" }} gap={4}>
              <Box>
                <Grid templateRows="auto auto auto" gap={3}>
                  {!isReadOnly && (
                    <Box>
                      <FormControl isRequired>
                        <FormLabel>Billing Type</FormLabel>
                        <Select
                          value={billingType}
                          onChange={handleBillingTypeChange}
                          isDisabled={isReadOnly}
                        >
                          <option value="perWaybill">Per Waybill</option>
                          <option value="garbageHauling">
                            Garbage Hauling
                          </option>
                          <option value="otherServices">Other Services</option>
                        </Select>
                      </FormControl>
                    </Box>
                  )}
                  <Box>
                    <FormControl>
                      <FormLabel
                        fontWeight="semibold"
                        color="gray.500"
                        fontSize="xs"
                        mb={1}
                      >
                        CUSTOMER'S NAME
                      </FormLabel>
                      {isReadOnly ? (
                        <Input
                          value={
                            selectedCustomer || billingData.storeName || ""
                          }
                          readOnly
                          fontSize="md"
                          fontWeight="medium"
                          bg="gray.50"
                          borderColor="gray.300"
                          _hover={{ cursor: "default" }}
                        />
                      ) : billingType === "perWaybill" ? (
                        <Select
                          value={selectedCustomer}
                          onChange={handleCustomerChange}
                          fontSize="md"
                          fontWeight="medium"
                          borderColor="gray.300"
                          focusBorderColor="#550000"
                          size="md"
                          placeholder={
                            companies.length > 0
                              ? "Select a company"
                              : "No more available company to bill"
                          }
                          isDisabled={companies.length === 0}
                        >
                          {/* Convert map to array for the dropdown and ensure unique company names */}
                          {companies.map((company, index) => (
                            <option key={index} value={company.name}>
                              {company.name}
                            </option>
                          ))}
                        </Select>
                      ) : (
                        <Input
                          value={manualCustomerName}
                          onChange={(e) =>
                            setManualCustomerName(e.target.value)
                          }
                          fontSize="md"
                          fontWeight="medium"
                          borderColor="gray.300"
                          focusBorderColor="#550000"
                          size="md"
                          placeholder="Enter customer name"
                        />
                      )}
                    </FormControl>
                  </Box>
                  <Box>
                    <FormControl>
                      <FormLabel
                        fontWeight="semibold"
                        color="gray.500"
                        fontSize="xs"
                        mb={1}
                      >
                        ADDRESS
                      </FormLabel>
                      {billingType === "perWaybill" ? (
                        <Input
                          value={
                            customerData?.address || billingData.address || ""
                          }
                          readOnly
                          fontSize="sm"
                          bg="gray.50"
                          borderColor="gray.300"
                          _hover={{ cursor: "default" }}
                        />
                      ) : (
                        <Input
                          value={manualAddress}
                          onChange={(e) => setManualAddress(e.target.value)}
                          fontSize="sm"
                          borderColor="gray.300"
                          focusBorderColor="#550000"
                          placeholder="Enter address"
                          isDisabled={isReadOnly}
                        />
                      )}
                    </FormControl>
                  </Box>
                </Grid>
              </Box>
              <Box>
                <Grid templateRows="auto auto" gap={3}>
                  <Box>
                    <FormControl>
                      <FormLabel
                        fontWeight="semibold"
                        color="gray.500"
                        fontSize="xs"
                        mb={1}
                      >
                        INVOICE DATE
                      </FormLabel>
                      <Input
                        type="date"
                        value={selectedDate}
                        onChange={handleDateChange}
                        min={minDate}
                        max={today}
                        fontSize="sm"
                        borderColor="gray.300"
                        focusBorderColor="#550000"
                        size="md"
                        rightIcon={<CalendarIcon />}
                        isDisabled={isReadOnly}
                        onDoubleClick={(e) =>
                          !e.currentTarget.disabled &&
                          e.currentTarget.showPicker()
                        }
                      />
                    </FormControl>
                  </Box>
                  <Box>
                    <FormControl>
                      <FormLabel
                        fontWeight="semibold"
                        color="gray.500"
                        fontSize="xs"
                        mb={1}
                      >
                        TIN
                      </FormLabel>
                      {billingType === "perWaybill" ? (
                        <Input
                          value={formattedTIN || billingData.tin || ""}
                          readOnly
                          fontSize="sm"
                          bg="gray.50"
                          borderColor="gray.300"
                          _hover={{ cursor: "default" }}
                        />
                      ) : (
                        <Input
                          value={manualTin}
                          onChange={(e) => {
                            const value = e.target.value.replace(
                              /[^0-9-]/g,
                              ""
                            );
                            setManualTin(formatTIN(value));
                          }}
                          fontSize="sm"
                          borderColor="gray.300"
                          focusBorderColor="#550000"
                          placeholder="000-000-00000"
                          isDisabled={isReadOnly}
                        />
                      )}
                    </FormControl>
                  </Box>
                </Grid>
              </Box>
            </Grid>
          </Box>
          {/* Terms Section */}
          <Box
            px={10}
            py={3}
            borderBottom="1px solid"
            borderColor="gray.200"
            bg="gray.50"
          >
            <Grid
              templateColumns={{ base: "1fr", sm: "repeat(3, 1fr)" }}
              gap={4}
            >
              <Box>
                <Text
                  fontWeight="semibold"
                  color="gray.500"
                  fontSize="xs"
                  mb={1}
                >
                  TERMS
                </Text>
                <Text>{billingData.terms || ""}</Text>
              </Box>
              <Box>
                <Text
                  fontWeight="semibold"
                  color="gray.500"
                  fontSize="xs"
                  mb={1}
                >
                  SC/PWD NO.
                </Text>
                <Text>{billingData.scpwdNo || ""}</Text>
              </Box>
              <Box>
                <Text
                  fontWeight="semibold"
                  color="gray.500"
                  fontSize="xs"
                  mb={1}
                >
                  SIGNATURE
                </Text>
              </Box>
            </Grid>
          </Box>
          {/* Payment Details Section */}
          <Box px={10} py={6}>
            {/* Search Bar - Moved Here */}
            {!isReadOnly && billingType === "perWaybill" && (
              // Use HStack to place items side-by-side
              <HStack mb={4} spacing={4}>
                <Box maxW="400px" flexGrow={1}>
                  {" "}
                  {/* Allow search to grow */}
                  <InputGroup size="sm">
                    <InputLeftElement
                      pointerEvents="none"
                      color="gray.400"
                      children={<SearchIcon />}
                    />
                    <Input
                      pl="2.5rem"
                      placeholder="FW: 12345"
                      value={`FW: ${waybillSearchTerm}`}
                      onChange={(e) => {
                        const prefix = "FW: ";
                        const rawValue = e.target.value;
                        if (rawValue.startsWith(prefix)) {
                          setWaybillSearchTerm(
                            rawValue.substring(prefix.length)
                          );
                        } else {
                          setWaybillSearchTerm("");
                        }
                      }}
                      size="sm"
                      focusBorderColor="#550000"
                    />
                  </InputGroup>
                </Box>
                <Button
                  leftIcon={<RepeatIcon />}
                  size="sm"
                  colorScheme="blue"
                  variant="outline"
                  onClick={refreshAllWaybills}
                  isLoading={isLoading}
                >
                  Refresh
                </Button>
              </HStack>
            )}
            {/* Search Bar for other types (if needed, currently none) */}
            {!isReadOnly && billingType !== "perWaybill" && (
              <Box mb={4} maxW="400px">
                {/* Original search input for other types, can be added here if needed */}
                {/* <Input
                  placeholder="Search..."
                  value={waybillSearchTerm} // No prefix
                  onChange={(e) => setWaybillSearchTerm(e.target.value)} // Simple update
                  size="sm"
                  focusBorderColor="#550000
                /> */}
              </Box>
            )}

            <Grid templateColumns={{ base: "1fr", lg: "3fr 1fr" }} gap={-15}>
              {/* Left side - Table */}
              <Box
                ref={scrollContainerRef} // <<< Assign ref to the scrollable container
                borderWidth="1px"
                borderColor="gray.200"
                borderRadius="md"
                overflow="auto"
                maxH="570px"
                w="95%"
              >
                <Table variant="simple" size="sm">
                  <Thead>
                    <Tr bg="#f8f9fa">
                      {/* Added Drag Handle Column Header */}
                      <Th
                        borderRight="1px solid"
                        borderColor="gray.200"
                        textAlign="center"
                        py={2}
                        px={1} // Reduced padding
                        fontSize="xs"
                        w="5%" // Adjust width as needed
                        position="sticky"
                        top="0"
                        zIndex="1"
                        bg="#e9ecef"
                      >
                        {/* Optionally add an icon or text like "Drag" */}
                      </Th>
                      <Th
                        borderRight="1px solid"
                        borderColor="gray.200"
                        textAlign="center"
                        py={2}
                        fontSize="xs"
                        w="5%" // Adjusted width
                        position="sticky"
                        top="0"
                        zIndex="1"
                        bg="#e9ecef"
                      >
                        {/* Check All Checkbox */}
                        {!isReadOnly && billingType === "perWaybill" && (
                          <Checkbox
                            isChecked={isAllFilteredChecked}
                            isIndeterminate={isIndeterminate}
                            onChange={handleCheckAll}
                            isDisabled={filteredWaybills.length === 0}
                            colorScheme="blue"
                            size="sm"
                            borderColor="#800000"
                            title={
                              isAllFilteredChecked
                                ? "Uncheck All Visible"
                                : "Check All Visible"
                            }
                          />
                        )}
                      </Th>
                      <Th
                        borderRight="1px solid"
                        borderColor="gray.200"
                        textAlign="left"
                        py={2}
                        fontSize="xs"
                        w="40%" // Adjusted width
                        position="sticky"
                        top="0"
                        zIndex="1"
                        bg="#e9ecef"
                      >
                        IN PAYMENT OF THE FOLLOWING SERVICE / TRANSACTION /
                        DESCRIPTION
                      </Th>
                      {/* Adjust widths of other columns slightly */}
                      <Th
                        borderRight="1px solid"
                        borderColor="gray.200"
                        textAlign="center"
                        py={2}
                        fontSize="xs"
                        w="15%"
                        position="sticky"
                        top="0"
                        zIndex="1"
                        bg="#e9ecef"
                      >
                        QTY.
                      </Th>
                      <Th
                        borderRight="1px solid"
                        borderColor="gray.200"
                        textAlign="center"
                        py={2}
                        fontSize="xs"
                        w="10%"
                        position="sticky"
                        top="0"
                        zIndex="1"
                        bg="#e9ecef"
                      >
                        UNIT PRICE
                      </Th>
                      <Th
                        textAlign="center"
                        py={2}
                        fontSize="xs"
                        w="20%"
                        position="sticky"
                        top="0"
                        zIndex="1"
                        bg="#e9ecef"
                      >
                        AMOUNT
                      </Th>
                    </Tr>
                  </Thead>
                  {/* Wrap Tbody content with DndContext and SortableContext for perWaybill */}
                  {billingType === "perWaybill" ? (
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
                      // Disable DnD if read-only
                      disabled={isReadOnly}
                    >
                      <SortableContext
                        items={waybillNumbers.map((wb) => wb.waybillNumber)} // Use unique waybill numbers as IDs
                        strategy={verticalListSortingStrategy}
                        // Disable DnD if read-only
                        disabled={isReadOnly}
                      >
                        <Tbody>
                          {/* ... Conditional rendering for loading/no waybills ... */}
                          {isLoading ? (
                            <Tr>
                              <Td colSpan={6} textAlign="center" py={8}>
                                {" "}
                                {/* Adjusted colSpan */}
                                <Spinner /* ... spinner props ... */ />
                                <Text mt={4} color="gray.600">
                                  Loading waybills...
                                </Text>
                              </Td>
                            </Tr>
                          ) : waybillNumbers.length === 0 ? (
                            <Tr>
                              <Td colSpan={6} textAlign="center" py={4}>
                                {" "}
                                {/* Adjusted colSpan */}
                                <Text color="gray.500">
                                  {isReadOnly
                                    ? "No waybills found for this record"
                                    : "No waybills found"}
                                </Text>
                              </Td>
                            </Tr>
                          ) : (
                            filteredWaybills.map((item, index) => (
                              <SortableWaybillRow
                                key={item.waybillNumber}
                                waybill={item}
                                index={index}
                              />
                            ))
                          )}
                        </Tbody>
                      </SortableContext>
                    </DndContext>
                  ) : (
                    // Original Tbody for manual entries
                    <Tbody>
                      {manualEntries.map((entry, index) => (
                        <Tr
                          key={entry.id}
                          bg={index % 2 === 0 ? "white" : "gray.50"}
                        >
                          {/* Add an empty TD for the drag handle column */}
                          <Td
                            borderRight="1px solid"
                            borderColor="gray.200"
                          ></Td>
                          <Td
                            borderRight="1px solid"
                            borderColor="gray.200"
                            textAlign="center"
                            width="5%"
                          >
                            <HStack justify="center" spacing={2}>
                              <Text>{index + 1}</Text>
                              {!isReadOnly && manualEntries.length > 1 && (
                                <IconButton
                                  icon={<CloseIcon />}
                                  size="xs"
                                  variant="ghost"
                                  colorScheme="red"
                                  onClick={() => removeRow(entry.id)}
                                  aria-label="Remove row"
                                />
                              )}
                            </HStack>
                          </Td>
                          <Td
                            borderRight="1px solid"
                            borderColor="gray.200"
                            width="40%" // Adjusted width
                          >
                            <Input
                              value={entry.description}
                              onChange={(e) =>
                                updateManualEntry(
                                  entry.id,
                                  "description",
                                  e.target.value
                                )
                              }
                              placeholder="Enter description"
                              size="sm"
                              variant="unstyled"
                              isReadOnly={isReadOnly}
                            />
                          </Td>
                          <Td
                            borderRight="1px solid"
                            borderColor="gray.200"
                            textAlign="center"
                            width="15%"
                          >
                            {/* Empty QTY column */}
                          </Td>
                          <Td
                            borderRight="1px solid"
                            borderColor="gray.200"
                            textAlign="right"
                            width="15%"
                          >
                            {/* Empty UNIT PRICE column */}
                          </Td>
                          <Td width="20%">
                            <Input
                              value={entry.amount}
                              onChange={(e) =>
                                updateManualEntry(
                                  entry.id,
                                  "amount",
                                  e.target.value
                                )
                              }
                              placeholder="0.00"
                              size="sm"
                              variant="unstyled"
                              textAlign="right"
                              isReadOnly={isReadOnly}
                            />
                          </Td>
                        </Tr>
                      ))}
                      {/* Add Row Button */}
                      {!isReadOnly && (
                        <Tr>
                          {/* Add an empty TD for the drag handle column */}
                          <Td
                            borderRight="1px solid"
                            borderColor="gray.200"
                          ></Td>
                          <Td colSpan={5} textAlign="center" py={2}>
                            {" "}
                            {/* Adjusted colSpan */}
                            <Button
                              leftIcon={<AddIcon />}
                              size="sm"
                              variant="ghost"
                              colorScheme="blue"
                              onClick={addRow}
                            >
                              Add Row
                            </Button>
                          </Td>
                        </Tr>
                      )}
                      {/* Empty rows placeholders */}
                      {Array.from({
                        length: Math.max(0, 18 - manualEntries.length),
                      }).map((_, index) => (
                        <Tr
                          key={`empty-${index}`}
                          bg={
                            (manualEntries.length + index) % 2 === 0
                              ? "white"
                              : "gray.50"
                          }
                          height="36px" // Give empty rows a fixed height
                        >
                          <Td
                            borderRight="1px solid"
                            borderColor="gray.200"
                          ></Td>
                          <Td
                            borderRight="1px solid"
                            borderColor="gray.200"
                          ></Td>
                          <Td
                            borderRight="1px solid"
                            borderColor="gray.200"
                          ></Td>
                          <Td
                            borderRight="1px solid"
                            borderColor="gray.200"
                          ></Td>
                          <Td
                            borderRight="1px solid"
                            borderColor="gray.200"
                          ></Td>
                          <Td></Td>
                        </Tr>
                      ))}
                    </Tbody>
                  )}
                </Table>
              </Box>
              {/* Right side - Totals Section */}
              <Box w="400px">
                <VStack
                  align="stretch"
                  spacing={3}
                  p={4}
                  borderWidth="1px"
                  borderColor="gray.200"
                  borderRadius="md"
                >
                  <Grid templateColumns="65% 35%" mb={1}>
                    <GridItem>
                      <Text fontWeight="medium" color="gray.600" fontSize="sm">
                        Total Sales (VAT Inclusive):
                      </Text>
                    </GridItem>
                    <GridItem>
                      <Text textAlign="right" fontWeight="medium" fontSize="sm">
                        {calculatedTotals.gross}
                      </Text>
                    </GridItem>
                  </Grid>
                  <Grid templateColumns="65% 35%" mb={1}>
                    <GridItem>
                      <Text fontWeight="medium" color="gray.600" fontSize="sm">
                        Less: 12% VAT:
                      </Text>
                    </GridItem>
                    <GridItem>
                      <Text textAlign="right" fontSize="sm">
                        {calculatedTotals.vat}
                      </Text>
                    </GridItem>
                  </Grid>
                  <Grid templateColumns="65% 35%" mb={1}>
                    <GridItem>
                      <Text fontWeight="medium" color="gray.600" fontSize="sm">
                        Net of VAT/TOTAL:
                      </Text>
                    </GridItem>
                    <GridItem>
                      <Text textAlign="right" fontSize="sm">
                        {calculatedTotals.net}
                      </Text>
                    </GridItem>
                  </Grid>
                  <Grid templateColumns="65% 35%" mb={1}>
                    <GridItem>
                      <Text fontWeight="medium" color="gray.600" fontSize="sm">
                        Less: SC/PWD Discount:
                      </Text>
                    </GridItem>
                    <GridItem>
                      <Text textAlign="right" fontSize="sm">
                        {billingData.scpwdDiscount
                          ? formatCurrency(billingData.scpwdDiscount)
                          : ""}
                      </Text>
                    </GridItem>
                  </Grid>
                  <Grid templateColumns="65% 35%" mb={1}>
                    <GridItem>
                      <Text fontWeight="medium" color="gray.600" fontSize="sm">
                        Total Due:
                      </Text>
                    </GridItem>
                    <GridItem>
                      <Text textAlign="right" fontSize="sm">
                        {calculatedTotals.gross}
                      </Text>
                    </GridItem>
                  </Grid>
                  <Grid templateColumns="65% 35%" mb={1}>
                    <GridItem>
                      <Text fontWeight="medium" color="gray.600" fontSize="sm">
                        Less Withholding:
                      </Text>
                    </GridItem>
                    <GridItem>
                      <Text textAlign="right" fontSize="sm">
                        {calculatedTotals.withTax}
                      </Text>
                    </GridItem>
                  </Grid>
                  <Grid
                    templateColumns="65% 35%"
                    mb={1}
                    bg="transparent"
                    p={2}
                    borderRadius="md"
                    color="black"
                    borderWidth="2px"
                    borderColor="black"
                    boxShadow="0px 0px 0px 1px black"
                  >
                    <GridItem>
                      <Text fontWeight="bold" fontSize="sm">
                        Total Amount Due:
                      </Text>
                    </GridItem>
                    <GridItem>
                      <Text textAlign="right" fontWeight="bold" fontSize="sm">
                        {calculatedTotals.netAmount}
                      </Text>
                    </GridItem>
                  </Grid>
                  <Divider borderColor="gray.300" />
                  <Grid templateColumns="65% 35%" mb={1}>
                    <GridItem>
                      <Text fontWeight="medium" color="gray.600" fontSize="sm">
                        VATABLE:
                      </Text>
                    </GridItem>
                    <GridItem>
                      <Text textAlign="right" fontSize="sm">
                        {calculatedTotals.net}
                      </Text>
                    </GridItem>
                  </Grid>
                  <Grid templateColumns="65% 35%" mb={1}>
                    <GridItem>
                      <Text fontWeight="medium" color="gray.600" fontSize="sm">
                        Vat Exempt:
                      </Text>
                    </GridItem>
                    <GridItem>
                      <Text textAlign="right" fontSize="sm">
                        {billingData.vatExempt
                          ? formatCurrency(billingData.vatExempt)
                          : ""}
                      </Text>
                    </GridItem>
                  </Grid>
                  <Grid templateColumns="65% 35%" mb={1}>
                    <GridItem>
                      <Text fontWeight="medium" color="gray.600" fontSize="sm">
                        Zero Rated:
                      </Text>
                    </GridItem>
                    <GridItem>
                      <Text textAlign="right" fontSize="sm">
                        {billingData.zeroRated
                          ? formatCurrency(billingData.zeroRated)
                          : ""}
                      </Text>
                    </GridItem>
                  </Grid>
                  <Grid templateColumns="65% 35%" mb={1}>
                    <GridItem>
                      <Text fontWeight="medium" color="gray.600" fontSize="sm">
                        VAT 12%:
                      </Text>
                    </GridItem>
                    <GridItem>
                      <Text textAlign="right" fontSize="sm">
                        {calculatedTotals.vat}
                      </Text>
                    </GridItem>
                  </Grid>
                </VStack>
                {/* Payment Method Section at the bottom */}
                <Box mt={4}>
                  <Text
                    fontWeight="semibold"
                    color="gray.500"
                    fontSize="xs"
                    mb={2}
                  >
                    PAYMENT METHOD
                  </Text>
                  <RadioGroup
                    onChange={handleBottomPaymentMethodChange}
                    value={bottomPaymentMethod}
                    colorScheme="red"
                  >
                    <HStack spacing={6}>
                      <Radio value="CASH" borderColor="gray.400" size="sm">
                        CASH
                      </Radio>
                      <Radio value="CHECK" borderColor="gray.400" size="sm">
                        CHECK
                      </Radio>
                      <Radio value="CREDIT" borderColor="gray.400" size="sm">
                        CREDIT
                      </Radio>
                    </HStack>
                  </RadioGroup>
                </Box>
                {/* Save/Generate PDF Button */}
                <HStack spacing={4} mt={6} justify="flex-end">
                  {isReadOnly ? (
                    <Button
                      leftIcon={<DownloadIcon />}
                      colorScheme="teal"
                      onClick={generatePDF}
                      size="md" // Reverted size back to md for consistency if needed, or keep sm if preferred
                      px={6}
                      _hover={{ transform: "translateY(-2px)" }}
                      transition="all 0.2s"
                    >
                      Generate PDF
                    </Button>
                  ) : (
                    <>
                      {/* Toggle Button for Edit/Cancel Waybills */}
                      {isEditing && billingType === "perWaybill" && (
                        <Button
                          colorScheme={isWaybillEditMode ? "gray" : "orange"}
                          onClick={async () => {
                            // Make it async
                            if (isWaybillEditMode) {
                              // Cancel Edit Logic
                              setIsWaybillEditMode(false);
                              setWaybillNumbers(
                                initiallyBilledWaybillsRef.current
                              );
                              setCheckedWaybills(initialCheckedRef.current);
                              setWaybillSearchTerm(""); // Clear search on cancel
                            } else {
                              // Edit Waybills Logic
                              setIsWaybillEditMode(true);
                              if (selectedCustomer) {
                                setIsLoading(true);
                                try {
                                  // This call fetches all available waybills for the customer
                                  // and applies initialCheckedRef.current for checks.
                                  await handleCustomerChange({
                                    target: { value: selectedCustomer },
                                  });
                                } catch (error) {
                                  console.error(
                                    "Error refreshing waybills for edit mode:",
                                    error
                                  );
                                  toast({
                                    title: "Error",
                                    description:
                                      "Could not load all available waybills for editing.",
                                    status: "error",
                                    duration: 3000,
                                    isClosable: true,
                                  });
                                  setIsWaybillEditMode(false); // Revert if error
                                } finally {
                                  setIsLoading(false);
                                }
                              } else {
                                console.warn(
                                  "No selected customer for Edit Waybills action."
                                );
                                setIsWaybillEditMode(false); // Revert if no customer
                                toast({
                                  title: "Cannot Edit Waybills",
                                  description: "No customer is selected.",
                                  status: "warning",
                                  duration: 3000,
                                  isClosable: true,
                                });
                              }
                            }
                          }}
                          size="sm" // Changed size
                          px={6}
                          _hover={{ transform: "translateY(-2px)" }}
                          transition="all 0.2s"
                          variant="outline"
                        >
                          {isWaybillEditMode ? "Cancel Edit" : "Edit Waybills"}
                        </Button>
                      )}
                      {/* REMOVED View Drops Button */}
                      {/* {isEditing && billingType === 'perWaybill' && (
                        <Button ... />
                      )} */}
                      <Button
                        leftIcon={<EditIcon />}
                        colorScheme="blue"
                        onClick={handleSave}
                        size="sm" // Changed size
                        px={6}
                        _hover={{ transform: "translateY(-2px)" }}
                        transition="all 0.2s"
                        isLoading={isSaving}
                        loadingText={
                          isEditing
                            ? "Updating Billing Record"
                            : "Creating Billing Record"
                        }
                      >
                        {isEditing ? "Save Changes" : "Save"}
                      </Button>
                      {/* Restored Save as Draft Button - Show only for NEW billings */}
                      {!isReadOnly &&
                        !isEditing && ( // Added !isEditing condition
                          <Button
                            colorScheme="gray"
                            onClick={handleSaveDraft}
                            size="sm"
                            px={6}
                            _hover={{ transform: "translateY(-2px)" }}
                            transition="all 0.2s"
                            variant="outline"
                          >
                            Save as Draft
                          </Button>
                        )}
                    </>
                  )}
                </HStack>
              </Box>
            </Grid>
          </Box>
          {/* Footer Section */}
          <Box
            px={10}
            py={4}
            bg="gray.50"
            borderTop="1px solid"
            borderColor="gray.200"
          >
            <Flex justifyContent="space-between" alignItems="center">
              <Box>
                <Text fontSize="xs" color="gray.500">
                  Justine's Cargo Services Generated Sales Invoice © 2009
                </Text>
              </Box>
            </Flex>
          </Box>
        </Box>
      </Box>

      {/* Modal for Viewing Waybill Drops */}
      <Modal
        isOpen={isDropsModalOpen}
        onClose={handleCloseDropsModal}
        size="6xl"
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            Waybill Details for {selectedWaybillForDrops}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            {selectedWaybillForDrops && (
              <WaybillBody
                waybillNumber={selectedWaybillForDrops}
                onModalClose={handleCloseDropsModal} // Pass the NEW handler
                router={router} // Pass router instance
                onTruckCbmUpdate={() => {}}
              />
            )}
          </ModalBody>
          <ModalFooter>
            <Button onClick={handleCloseDropsModal}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* REMOVED Popover from here, now generated per row */}
      {/* <Popover
        isOpen={isPopoverOpen}
        onClose={() => setIsPopoverOpen(false)}
        isLazy
      >
        <PopoverAnchor>
          <Box position="absolute" top={`${popoverPosition.top}px`} left={`${popoverPosition.left}px`} />
        </PopoverAnchor>
        <PopoverContent width="auto">
          <PopoverArrow />
          <PopoverBody p={1}> 
            <Button ... >
              View Drops
            </Button>
          </PopoverBody>
        </PopoverContent>
      </Popover> */}

      {/* Modal for Entering Draft Name */}
      <Modal
        isOpen={isDraftNameModalOpen}
        onClose={onCloseDraftNameModal}
        isCentered
      >
        <ModalOverlay />
        <ModalContent mx={4}>
          {" "}
          {/* Add horizontal margin for smaller screens */}
          <ModalHeader bg="blue.800" color="white" borderTopRadius="md">
            Enter Draft Name
          </ModalHeader>
          <ModalCloseButton color="white" _focus={{ boxShadow: "none" }} />
          <ModalBody py={6}>
            {" "}
            {/* Add vertical padding */}
            <FormControl isRequired>
              <FormLabel>Please enter a name for this draft:</FormLabel>
              <Input
                placeholder="e.g., SM Billing June Week 1"
                value={draftNameInput}
                onChange={(e) => setDraftNameInput(e.target.value)}
                focusBorderColor="blue.500" // Use blue focus border
                borderColor="#800000" // Maroon border for input
                _hover={{ borderColor: "#660000" }}
              />
            </FormControl>
          </ModalBody>
          <ModalFooter borderTopWidth="1px" borderColor="gray.200">
            <Button
              variant="outline"
              mr={3}
              onClick={onCloseDraftNameModal}
              _focus={{ boxShadow: "none" }}
            >
              Cancel
            </Button>
            <Button
              colorScheme="blue" // Use blue scheme for primary action
              onClick={submitDraft}
              _focus={{ boxShadow: "none" }}
            >
              Save Draft
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default BillingPaper;
