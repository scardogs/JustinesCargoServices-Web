import React, { useState, useEffect } from "react";
import {
  Drawer,
  DrawerBody,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  Button,
  FormControl,
  FormLabel,
  Input,
  InputGroup,
  InputLeftElement,
  FormErrorMessage,
  VStack,
  Text,
  Flex,
  Box,
  Divider,
  useToast,
  Select,
  Icon,
  Tooltip,
} from "@chakra-ui/react";
import { SearchIcon, InfoIcon } from "@chakra-ui/icons";
import { FaBuilding, FaStore, FaMapMarkerAlt, FaUserAlt } from "react-icons/fa";
import axios from "axios";

// Constants
const primaryColor = "#143D60";
const secondaryColor = "#1A4F7A";
const borderColor = "#E2E8F0";

const FixRateConsigneeDrawer = ({
  isOpen,
  onClose,
  consignee,
  isEditing,
  onSave,
  fixedRate,
  waybillNumber,
  companies,
  individuals = [],
  SearchableSelect,
  shipperInfo = "",
  isIndividualMode = false,
}) => {
  const toast = useToast();
  const [formData, setFormData] = useState({
    waybillNumber: waybillNumber || "",
    consignee: "",
    company: "",
    store: "",
    date: new Date().toISOString().split("T")[0],
    origin: "",
    destination: "",
    type: "DC", // Default value
    amount: 0,
    rate: 0,
    isIndividual: false, // Track if this is an individual record
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [storeOptions, setStoreOptions] = useState([]);
  const [allFixRateConsignees, setAllFixRateConsignees] = useState([]);

  // Initialize form data when component mounts or props change
  useEffect(() => {
    // Log all key props for debugging
    console.log("DRAWER INITIALIZATION - FULL PROPS:", {
      isOpen,
      isEditing,
      consignee: consignee || "No consignee",
      waybillNumber,
      shipperInfo: shipperInfo || "NO SHIPPER INFO",
      fixedRate,
      isIndividualMode,
    });

    // Load all fixRateConsignees on mount
    fetchAllFixRateConsignees();

    // Set the form data with emphasis on origin field
    if (isEditing && consignee) {
      // For editing, use existing consignee data
      setFormData({
        _id: consignee._id || null,
        waybillNumber: consignee.waybillNumber || waybillNumber || "",
        consignee: consignee.consignee || "",
        company: consignee.company || "",
        store: consignee.store || "",
        date: consignee.date
          ? new Date(consignee.date).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0],
        origin: consignee.origin || "",
        destination: consignee.destination || "",
        type: consignee.type || "DC",
        amount: consignee.amount || fixedRate || 0,
        rate: consignee.rate || fixedRate || 0,
        isIndividual: consignee.isIndividual || false,
      });

      // Load store options for editing
      if (consignee.company && !consignee.isIndividual) {
        const selectedCompany = companies?.find(
          (c) => c.companyName === consignee.company
        );
        if (selectedCompany) {
          createStoreOptionsFromCompany(selectedCompany);
        }
      }
    } else {
      // For new consignee, use shipper info for origin
      setFormData({
        _id: null,
        waybillNumber: waybillNumber || "",
        consignee: "",
        company: "",
        store: "",
        date: new Date().toISOString().split("T")[0],
        origin: shipperInfo || "", // Explicitly set origin to shipperInfo
        destination: "",
        type: "DC",
        amount: fixedRate || 0,
        rate: fixedRate || 0,
        isIndividual: isIndividualMode,
      });

      console.log(
        "NEW CONSIGNEE FORM DATA - ORIGIN SET TO:",
        shipperInfo || "EMPTY"
      );
    }
  }, [
    isOpen,
    isEditing,
    consignee,
    waybillNumber,
    shipperInfo,
    fixedRate,
    companies,
    isIndividualMode,
  ]);

  // Special effect that runs ONLY when shipperInfo changes to update origin
  useEffect(() => {
    console.log("SHIPPER INFO CHANGED TO:", shipperInfo);

    // Directly update the origin field whenever shipperInfo changes
    // This ensures the origin always stays in sync with the shipper selection
    setFormData((prev) => ({
      ...prev,
      origin: shipperInfo,
    }));
  }, [shipperInfo]); // Only depend on shipperInfo changes

  // Component didMount/didUpdate - run once when drawer opens
  useEffect(() => {
    if (isOpen) {
      // Log when drawer opens to debug the issue
      console.log("DRAWER OPENED - current props:", {
        isEditing,
        shipperInfo,
        waybillNumber,
      });

      // Force-set origin to shipperInfo when drawer opens
      if (!isEditing) {
        setFormData((prev) => ({
          ...prev,
          origin: shipperInfo || "",
        }));
      }
    }
  }, [isOpen]); // Only depends on isOpen state

  // Update isIndividual flag when isIndividualMode changes
  useEffect(() => {
    // Update the isIndividual flag in formData when mode changes
    setFormData((prev) => ({
      ...prev,
      isIndividual: isIndividualMode,
    }));

    console.log(`Individual mode changed to: ${isIndividualMode}`);
  }, [isIndividualMode]);

  // Fetch all fix rate consignees from the database
  const fetchAllFixRateConsignees = async () => {
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/fixRateConsignees`
      );

      if (response.data && Array.isArray(response.data)) {
        setAllFixRateConsignees(response.data);
        console.log("Loaded all fix rate consignees:", response.data.length);
      }
    } catch (error) {
      console.log("Error loading fix rate consignees:", error.message);
    }
  };

  // Handle company change
  const handleCompanyChange = (e) => {
    const value = e.target.value;
    console.log("Company selected:", value);

    // Update form data
    setFormData((prev) => ({
      ...prev,
      company: value,
      // Clear store when company changes
      store: "",
    }));

    if (!value) {
      setStoreOptions([]);
      return;
    }

    // Find selected company
    const selectedCompany = companies?.find((c) => c.companyName === value);
    console.log("Selected company:", selectedCompany);

    if (!selectedCompany) {
      setStoreOptions([]);
      return;
    }

    // Try to fetch consignees for this company
    fetchConsigneesForCompany(selectedCompany);
  };

  // Try to fetch consignees for a specific company
  const fetchConsigneesForCompany = async (company) => {
    console.log("Fetching consignees for company:", company.companyName);

    // Try the correct API endpoint with hyphen like in the handleShipperChange function
    if (company._id) {
      try {
        // This is the correct endpoint that works in the handleShipperChange function
        const apiUrl = `${process.env.NEXT_PUBLIC_BACKEND_API}/api/multiple-consignees/byCompany/${company._id}`;
        console.log("Fetching consignees from:", apiUrl);

        const response = await fetch(apiUrl);
        console.log("Response status:", response.status);

        if (response.ok) {
          const consigneeData = await response.json();
          console.log("Fetched consignee data:", consigneeData);

          if (consigneeData && consigneeData.length > 0) {
            // Store options from this data
            const options = consigneeData.map((c) => ({
              value: c.consigneeName,
              label: c.consigneeName,
            }));

            console.log("Setting store options:", options);
            setStoreOptions(options);
            return;
          }
        } else {
          console.log("API responded with status:", response.status);
          // Fall back to local filtering if API fails
          filterFixRateConsignees(company);
        }
      } catch (error) {
        console.error("Error fetching consignees:", error);
        // Fall back to local filtering if API fails
        filterFixRateConsignees(company);
      }
    } else {
      console.log("No company._id available, using fallback");
      filterFixRateConsignees(company);
    }
  };

  // Filter from existing fix rate consignees
  const filterFixRateConsignees = (company) => {
    // First try filtering from cached fix rate consignees
    if (allFixRateConsignees.length > 0) {
      console.log(
        "Filtering from cached consignees for company:",
        company.companyName
      );
      const filteredConsignees = allFixRateConsignees.filter(
        (c) => c.company === company.companyName
      );

      if (filteredConsignees.length > 0) {
        console.log(
          "Found matching consignees in cache:",
          filteredConsignees.length
        );
        const uniqueStoreNames = [
          ...new Set(filteredConsignees.map((c) => c.store)),
        ].filter(Boolean);

        if (uniqueStoreNames.length > 0) {
          const options = uniqueStoreNames.map((store) => ({
            value: store,
            label: store,
          }));

          console.log("Setting store options from cached data:", options);
          setStoreOptions(options);
          return;
        }
      }
    }

    // If no matches found, use company data
    createStoreOptionsFromCompany(company);
  };

  // Create store options from company data
  const createStoreOptionsFromCompany = (company) => {
    if (!company) return;

    console.log("COMPANY DATA:", company); // Log complete company object

    const storesList = [];

    // Check for consignees property (might contain consignee names)
    if (
      company.consignees &&
      Array.isArray(company.consignees) &&
      company.consignees.length > 0
    ) {
      console.log("Found consignees in company data:", company.consignees);
      company.consignees.forEach((consignee) => {
        if (consignee && typeof consignee === "object") {
          const name = consignee.name || consignee.consigneeName || consignee;
          storesList.push({
            value: name,
            label: name,
          });
        } else if (consignee && typeof consignee === "string") {
          storesList.push({
            value: consignee,
            label: consignee,
          });
        }
      });
    }

    // Look for consigneeNames property
    if (
      company.consigneeNames &&
      Array.isArray(company.consigneeNames) &&
      company.consigneeNames.length > 0
    ) {
      console.log(
        "Found consigneeNames in company data:",
        company.consigneeNames
      );
      company.consigneeNames.forEach((name) => {
        if (name && name.trim()) {
          storesList.push({
            value: name,
            label: name,
          });
        }
      });
    }

    // If no consignees were found, then try locations
    if (
      storesList.length === 0 &&
      company.locations &&
      Array.isArray(company.locations)
    ) {
      console.log("Using company locations:", company.locations);
      company.locations
        .filter((location) => location && location.trim())
        .forEach((location) => {
          storesList.push({
            value: location,
            label: location,
          });
        });
    }

    // Then try branches
    if (
      storesList.length === 0 &&
      company.branches &&
      Array.isArray(company.branches)
    ) {
      console.log("Using company branches:", company.branches);
      company.branches
        .filter((branch) => branch && branch.trim())
        .forEach((branch) => {
          storesList.push({
            value: branch,
            label: branch,
          });
        });
    }

    // Add default store if no options found at all
    if (storesList.length === 0) {
      console.log("No store options found, using Main Store default");
      storesList.push({
        value: "Main Store",
        label: "Main Store",
      });

      // Alert the user
      toast({
        title: "No consignees found",
        description:
          "Using default store. You can enter a store name manually.",
        status: "info",
        duration: 3000,
        isClosable: true,
      });
    } else {
      console.log(`Found ${storesList.length} store options:`, storesList);
    }

    setStoreOptions(storesList);
  };

  // Handle store change with SearchableSelect
  const handleStoreChange = (e) => {
    const value = e.target.value;
    setFormData((prev) => ({
      ...prev,
      store: value,
    }));
  };

  // Handle individual selection in individual mode
  const handleIndividualSelection = (individualName) => {
    if (!formData.isIndividual || !individualName) return;

    console.log("Individual selected:", individualName);

    // Find the individual in the list
    const selectedIndividual = individuals.find(
      (individual) => individual.individualName === individualName
    );

    if (selectedIndividual) {
      console.log(
        "Full individual object:",
        JSON.stringify(selectedIndividual, null, 2)
      );

      // Update the destination with the individual's address if it's empty
      if (!formData.destination) {
        setFormData((prev) => ({
          ...prev,
          destination: selectedIndividual.individualAddress || "",
        }));
        console.log(
          "Updated destination with individual address:",
          selectedIndividual.individualAddress
        );
      }

      // Fetch individual consignees using the appropriate ID field
      // MongoDB ObjectId is typically stored in _id, but check both fields
      const individualId = selectedIndividual._id || selectedIndividual.id;

      if (individualId) {
        console.log(
          "Using individual ID for fetching consignees:",
          individualId
        );
        fetchIndividualConsignees(individualId);
      } else {
        console.warn(
          "Could not find ID in individual object:",
          selectedIndividual
        );
        setStoreOptions([]);
      }
    } else {
      console.warn("Could not find individual with name:", individualName);
      setStoreOptions([]);
    }
  };

  // Fetch consignees for an individual
  const fetchIndividualConsignees = async (individualId) => {
    if (!individualId) {
      console.log("No individual ID provided");
      setStoreOptions([]);
      return;
    }

    console.log("Fetching consignees for individual ID:", individualId);

    try {
      // Try to fetch from the API using the correct endpoint
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/individual-consignees/individual/${individualId}`,
        { validateStatus: (status) => status < 500 }
      );

      if (
        response.status === 200 &&
        response.data &&
        response.data.length > 0
      ) {
        console.log("Found individual consignees:", response.data.length);

        // Convert to store options format
        const options = response.data.map((consignee) => ({
          value: consignee.name,
          label: consignee.name,
        }));

        setStoreOptions(options);
      } else {
        console.log("No individual consignees found, using fallback");
        // Fallback - try cache or show empty
        setStoreOptions([]);

        // Show a message to the user
        toast({
          title: "No consignees found",
          description:
            "No stored consignees found for this individual. You can enter a name manually.",
          status: "info",
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error("Error fetching individual consignees:", error);
      setStoreOptions([]);
    }
  };

  // Modify the existing handleInputChange function to call handleIndividualSelection
  const handleInputChange = (e) => {
    const { name, value } = e.target;

    console.log(`Input changed: ${name} = ${value}`);

    if (name === "amount" || name === "rate") {
      // Allow empty value or numeric value
      const numericValue = value === "" ? "" : parseFloat(value) || 0;
      setFormData((prev) => ({
        ...prev,
        amount: numericValue,
        rate: numericValue,
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));

      // If changing the consignee name in individual mode, update destination
      if (name === "consignee" && formData.isIndividual) {
        handleIndividualSelection(value);
      }
    }

    // Clear error for this field if any
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.origin.trim()) {
      newErrors.origin = "Origin is required";
    }

    if (!formData.destination.trim()) {
      newErrors.destination = "Destination is required";
    }

    if (!formData.amount || formData.amount <= 0) {
      newErrors.amount = "Amount must be greater than 0";
    }

    // For company mode, validate company/store
    if (!formData.isIndividual) {
      if (!formData.company.trim()) {
        newErrors.company = "Company is required";
      }
    } else {
      // For individual mode, validate consignee
      if (!formData.consignee.trim()) {
        newErrors.consignee = "Individual name is required";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      // Create consignee name based on mode
      let updatedFormData = { ...formData };

      if (!formData.isIndividual) {
        // For company mode
        updatedFormData.consignee =
          formData.consignee ||
          `${formData.company || ""} ${formData.store || ""}`.trim() ||
          "Unnamed";
      } else {
        // For individual mode, combine individual name and consignee/store
        updatedFormData.consignee = formData.store
          ? `${formData.consignee} - ${formData.store}`
          : formData.consignee;

        // Save individual ID for reference if needed in the future
        if (individuals && individuals.length > 0) {
          const selectedIndividual = individuals.find(
            (ind) => ind.individualName === formData.consignee
          );

          if (
            selectedIndividual &&
            (selectedIndividual._id || selectedIndividual.id)
          ) {
            updatedFormData.individualId =
              selectedIndividual._id || selectedIndividual.id;
          }
        }
      }

      // Add dropType for fixed rate consignees
      updatedFormData.dropType = "fix rate";

      console.log("Submitting data:", updatedFormData);
      await onSave(updatedFormData);
      onClose();
    } catch (error) {
      console.error("Error saving consignee:", error);
      toast({
        title: "Error",
        description: "Failed to save consignee information",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (value) => {
    const numericValue = parseFloat(value) || 0;
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2,
    }).format(numericValue);
  };

  return (
    <Drawer isOpen={isOpen} placement="right" onClose={onClose} size="md">
      <DrawerOverlay />
      <DrawerContent>
        <DrawerCloseButton />
        <DrawerHeader borderBottomWidth="1px" bg={`${primaryColor}10`}>
          {isEditing ? "Edit Consignee" : "Add New Consignee"}
        </DrawerHeader>

        <DrawerBody>
          <VStack spacing={5} mt={4}>
            <Box w="100%">
              <Text fontSize="sm" fontWeight="bold" mb={2} color={primaryColor}>
                Fixed Rate Waybill
              </Text>
              <Divider mb={4} />
            </Box>

            {!formData.isIndividual ? (
              // COMPANY MODE UI
              <>
                <FormControl isInvalid={!!errors.company}>
                  <FormLabel
                    fontWeight="semibold"
                    fontSize="sm"
                    color="gray.600"
                    display="flex"
                    alignItems="center"
                  >
                    <Icon as={FaBuilding} mr={1} color="gray.600" boxSize={3} />
                    <Text>Company</Text>
                    <Tooltip label="Select consignee company" fontSize="xs">
                      <Box as="span" ml={1} color="gray.400" fontSize="xs">
                        <Icon as={InfoIcon} />
                      </Box>
                    </Tooltip>
                  </FormLabel>
                  {SearchableSelect ? (
                    <SearchableSelect
                      value={formData.company}
                      onChange={handleCompanyChange}
                      options={
                        companies?.map((company) => ({
                          value: company.companyName,
                          label: company.companyName,
                        })) || []
                      }
                      placeholder="Select Company"
                      size="md"
                      borderColor={errors.company ? "red.300" : borderColor}
                      _hover={{ borderColor: secondaryColor }}
                      _focus={{
                        borderColor: secondaryColor,
                        boxShadow: `0 0 0 1px ${secondaryColor}`,
                      }}
                    />
                  ) : (
                    <Select
                      name="company"
                      value={formData.company}
                      onChange={handleCompanyChange}
                      borderColor={errors.company ? "red.300" : "gray.200"}
                      _hover={{ borderColor: "gray.300", boxShadow: "sm" }}
                      _focus={{
                        borderColor: "gray.300",
                        boxShadow: `0 0 0 1px gray.300`,
                      }}
                      placeholder="Select Company"
                      size="md"
                      borderRadius="md"
                      bg="white"
                    >
                      {companies?.map((company) => (
                        <option key={company._id} value={company.companyName}>
                          {company.companyName}
                        </option>
                      ))}
                    </Select>
                  )}
                  <FormErrorMessage>{errors.company}</FormErrorMessage>
                </FormControl>

                <FormControl>
                  <FormLabel
                    fontWeight="semibold"
                    fontSize="sm"
                    color="gray.600"
                    display="flex"
                    alignItems="center"
                  >
                    <Icon as={FaStore} mr={1} color="gray.600" boxSize={3} />
                    <Text>Store</Text>
                    <Tooltip label="Select store" fontSize="xs">
                      <Box as="span" ml={1} color="gray.400" fontSize="xs">
                        <Icon as={InfoIcon} />
                      </Box>
                    </Tooltip>
                  </FormLabel>
                  {storeOptions.length > 0 && SearchableSelect ? (
                    // Use SearchableSelect when we have options
                    <SearchableSelect
                      value={formData.store}
                      onChange={handleStoreChange}
                      options={storeOptions}
                      placeholder="Select Store"
                      size="md"
                      borderColor={borderColor}
                      _hover={{ borderColor: secondaryColor }}
                      _focus={{
                        borderColor: secondaryColor,
                        boxShadow: `0 0 0 1px ${secondaryColor}`,
                      }}
                    />
                  ) : (
                    // Use manual input when no options available
                    <Input
                      name="store"
                      value={formData.store}
                      onChange={handleInputChange}
                      placeholder="Enter store name manually"
                      borderColor={borderColor}
                      _hover={{ borderColor: secondaryColor }}
                      _focus={{
                        borderColor: secondaryColor,
                        boxShadow: `0 0 0 1px ${secondaryColor}`,
                      }}
                    />
                  )}

                  {formData.company && storeOptions.length === 0 && (
                    <Text fontSize="sm" color="orange.500" mt={1}>
                      No stores found for this company. You can enter a store
                      name manually.
                    </Text>
                  )}
                </FormControl>
              </>
            ) : (
              // INDIVIDUAL MODE UI
              <>
                <FormControl isInvalid={!!errors.consignee}>
                  <FormLabel
                    fontWeight="semibold"
                    fontSize="sm"
                    color="gray.600"
                    display="flex"
                    alignItems="center"
                  >
                    <Icon as={FaUserAlt} mr={1} color="gray.600" boxSize={3} />
                    <Text>Individual Name</Text>
                  </FormLabel>
                  {SearchableSelect ? (
                    <SearchableSelect
                      value={formData.consignee}
                      onChange={(e) => {
                        const value = e.target.value;
                        handleInputChange({
                          target: { name: "consignee", value },
                        });
                        handleIndividualSelection(value);
                      }}
                      options={
                        individuals?.map((individual) => ({
                          value: individual.individualName,
                          label: individual.individualName,
                        })) || []
                      }
                      placeholder="Select Individual"
                      size="md"
                      borderColor={errors.consignee ? "red.300" : borderColor}
                      _hover={{ borderColor: secondaryColor }}
                      _focus={{
                        borderColor: secondaryColor,
                        boxShadow: `0 0 0 1px ${secondaryColor}`,
                      }}
                    />
                  ) : (
                    <Select
                      name="consignee"
                      value={formData.consignee}
                      onChange={handleInputChange}
                      borderColor={errors.consignee ? "red.300" : "gray.200"}
                      _hover={{ borderColor: "gray.300", boxShadow: "sm" }}
                      _focus={{
                        borderColor: "gray.300",
                        boxShadow: `0 0 0 1px gray.300`,
                      }}
                      placeholder="Select Individual"
                      size="md"
                      borderRadius="md"
                      bg="white"
                    >
                      {individuals?.map((individual) => (
                        <option
                          key={individual._id}
                          value={individual.individualName}
                        >
                          {individual.individualName}
                        </option>
                      ))}
                    </Select>
                  )}
                  <FormErrorMessage>{errors.consignee}</FormErrorMessage>
                </FormControl>

                {/* Add Store field for Individual mode */}
                <FormControl>
                  <FormLabel
                    fontWeight="semibold"
                    fontSize="sm"
                    color="gray.600"
                    display="flex"
                    alignItems="center"
                  >
                    <Icon as={FaStore} mr={1} color="gray.600" boxSize={3} />
                    <Text>Consignee</Text>
                    <Tooltip
                      label="Select consignee for this individual"
                      fontSize="xs"
                    >
                      <Box as="span" ml={1} color="gray.400" fontSize="xs">
                        <Icon as={InfoIcon} />
                      </Box>
                    </Tooltip>
                  </FormLabel>
                  {storeOptions.length > 0 && SearchableSelect ? (
                    // Use SearchableSelect when we have options
                    <SearchableSelect
                      value={formData.store}
                      onChange={handleStoreChange}
                      options={storeOptions}
                      placeholder="Select Consignee"
                      size="md"
                      borderColor={borderColor}
                      _hover={{ borderColor: secondaryColor }}
                      _focus={{
                        borderColor: secondaryColor,
                        boxShadow: `0 0 0 1px ${secondaryColor}`,
                      }}
                    />
                  ) : (
                    // Use manual input when no options available
                    <Input
                      name="store"
                      value={formData.store}
                      onChange={handleInputChange}
                      placeholder="Enter consignee name manually"
                      borderColor={borderColor}
                      _hover={{ borderColor: secondaryColor }}
                      _focus={{
                        borderColor: secondaryColor,
                        boxShadow: `0 0 0 1px ${secondaryColor}`,
                      }}
                    />
                  )}

                  {formData.consignee && storeOptions.length === 0 && (
                    <Text fontSize="sm" color="orange.500" mt={1}>
                      No stored consignees found for this individual. You can
                      enter a name manually.
                    </Text>
                  )}
                </FormControl>
              </>
            )}

            <FormControl isRequired isInvalid={!!errors.date}>
              <FormLabel>Date</FormLabel>
              <Input
                name="date"
                type="date"
                value={formData.date}
                onChange={handleInputChange}
                borderColor={borderColor}
                _hover={{ borderColor: secondaryColor }}
                _focus={{
                  borderColor: secondaryColor,
                  boxShadow: `0 0 0 1px ${secondaryColor}`,
                }}
              />
              <FormErrorMessage>{errors.date}</FormErrorMessage>
            </FormControl>

            <FormControl isRequired isInvalid={!!errors.origin}>
              <FormLabel
                fontWeight="semibold"
                fontSize="sm"
                color="gray.600"
                display="flex"
                alignItems="center"
              >
                <Icon as={FaMapMarkerAlt} mr={1} color="gray.600" boxSize={3} />
                Origin
              </FormLabel>
              <Input
                name="origin"
                value={formData.origin}
                onChange={handleInputChange}
                placeholder="Origin location"
                borderColor={borderColor}
                isDisabled
                _disabled={{
                  opacity: 1,
                  color: "Black",
                }}
                bg="gray.50"
                _hover={{ cursor: "not-allowed" }}
              />
              <FormErrorMessage>{errors.origin}</FormErrorMessage>
            </FormControl>

            <FormControl isRequired isInvalid={!!errors.destination}>
              <FormLabel
                fontWeight="semibold"
                fontSize="sm"
                color="gray.600"
                display="flex"
                alignItems="center"
              >
                <Icon as={FaMapMarkerAlt} mr={1} color="gray.600" boxSize={3} />
                Destination
              </FormLabel>
              <Input
                name="destination"
                value={formData.destination}
                onChange={handleInputChange}
                placeholder="Destination location"
                borderColor={borderColor}
                _hover={{ borderColor: secondaryColor }}
                _focus={{
                  borderColor: secondaryColor,
                  boxShadow: `0 0 0 1px ${secondaryColor}`,
                }}
              />
              <FormErrorMessage>{errors.destination}</FormErrorMessage>
            </FormControl>

            <FormControl isRequired>
              <FormLabel>Type</FormLabel>
              <Select
                name="type"
                value={formData.type}
                onChange={handleInputChange}
                borderColor={borderColor}
                _hover={{ borderColor: secondaryColor }}
                _focus={{
                  borderColor: secondaryColor,
                  boxShadow: `0 0 0 1px ${secondaryColor}`,
                }}
              >
                <option value="DC">DC</option>
                <option value="Store">Store</option>
              </Select>
            </FormControl>

            <FormControl isRequired isInvalid={!!errors.amount}>
              <FormLabel>Fixed Rate Amount</FormLabel>
              <InputGroup>
                <InputLeftElement
                  pointerEvents="none"
                  color="gray.500"
                  children="₱"
                />
                <Input
                  name="amount"
                  type="number"
                  value={formData.amount}
                  onChange={handleInputChange}
                  placeholder="0.00"
                  borderColor={borderColor}
                  _hover={{ borderColor: secondaryColor }}
                  _focus={{
                    borderColor: secondaryColor,
                    boxShadow: `0 0 0 1px ${secondaryColor}`,
                  }}
                />
              </InputGroup>
              <FormErrorMessage>{errors.amount}</FormErrorMessage>
            </FormControl>
          </VStack>
        </DrawerBody>

        <DrawerFooter borderTopWidth="1px">
          <Button variant="outline" mr={3} onClick={onClose}>
            Cancel
          </Button>
          <Button
            bg={primaryColor}
            color="white"
            _hover={{ bg: secondaryColor }}
            isLoading={isSubmitting}
            onClick={handleSubmit}
          >
            Save
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};

export default FixRateConsigneeDrawer;
