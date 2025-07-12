import React, { useState } from "react";
import {
  Box,
  Flex,
  Text,
  Heading,
  Grid,
  GridItem,
  Icon,
  Tooltip,
  Spinner,
  VStack,
  Input,
  useToast,
  Badge,
  Button,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  FormControl,
  FormLabel,
  useDisclosure,
} from "@chakra-ui/react";
import {
  FaTruck,
  FaFileInvoice,
  FaChartBar,
  FaChartLine,
  FaPlus,
  FaCalculator,
  FaMoneyBillWave,
  FaExclamationTriangle,
  FaCog,
} from "react-icons/fa";

const WaybillHeader = ({
  primaryColor,
  secondaryColor,
  borderColor,
  isUpdatingAmounts,
  selectedWaybill,
  truckCbm,
  totalPercentage,
  highestRate,
  additionalAdjustment,
  totalRate,
  totalAmount,
  formatNumberWithCommas,
  onTruckCbmUpdate,
  onAdditionalAdjustmentUpdate,
  totalConsigneeCbm,
}) => {
  const [isEditingTruckCbm, setIsEditingTruckCbm] = useState(false);
  const [editedTruckCbm, setEditedTruckCbm] = useState("");
  const [isEditingAdjustment, setIsEditingAdjustment] = useState(false);
  const [editedAdjustment, setEditedAdjustment] = useState("");
  const [additionalRate, setAdditionalRate] = useState(1000);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();

  // Function to check if consignee CBM exceeds truck CBM and calculate difference
  const getCbmOverflow = () => {
    if (!truckCbm || !totalConsigneeCbm) return null;

    const truckCbmValue = Number(truckCbm);
    const consigneeCbmValue = Number(totalConsigneeCbm);

    if (consigneeCbmValue > truckCbmValue) {
      return {
        isOverflow: true,
        difference: (consigneeCbmValue - truckCbmValue).toFixed(2),
      };
    }

    return { isOverflow: false, difference: 0 };
  };

  // Get overflow status and difference
  const cbmOverflow = getCbmOverflow();

  const handleDoubleClickTruckCbm = () => {
    setEditedTruckCbm(truckCbm || "");
    setIsEditingTruckCbm(true);
  };

  const handleTruckCbmChange = (e) => {
    setEditedTruckCbm(e.target.value);
  };

  const handleTruckCbmBlur = async () => {
    // Validate input is a number
    const numValue = parseFloat(editedTruckCbm);
    if (isNaN(numValue) || numValue <= 0) {
      toast({
        title: "Invalid value",
        description: "Please enter a valid number greater than zero",
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "top-right",
      });
      setEditedTruckCbm(truckCbm || "");
      setIsEditingTruckCbm(false);
      return;
    }

    try {
      // Save the updated CBM to the backend if there's a waybill number
      if (selectedWaybill) {
        // Use the onTruckCbmUpdate callback to handle the update
        if (onTruckCbmUpdate) {
          await onTruckCbmUpdate(numValue);

          toast({
            title: "Success",
            description: "Total Truck CBM updated successfully",
            status: "success",
            duration: 3000,
            isClosable: true,
            position: "top-right",
          });
        }
      }
    } catch (error) {
      console.error("Error updating truck CBM:", error);
      toast({
        title: "Error",
        description: "Failed to update Total Truck CBM",
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "top-right",
      });
    }

    setIsEditingTruckCbm(false);
  };

  const handleTruckCbmKeyDown = (e) => {
    if (e.key === "Enter") {
      e.target.blur(); // Trigger the blur event to save
    } else if (e.key === "Escape") {
      setEditedTruckCbm(truckCbm || "");
      setIsEditingTruckCbm(false);
    }
  };

  // Additional Adjustment editing functions
  const handleDoubleClickAdjustment = () => {
    setEditedAdjustment(additionalAdjustment || "");
    setIsEditingAdjustment(true);
  };

  const handleAdjustmentChange = (e) => {
    setEditedAdjustment(e.target.value);
  };

  const handleAdjustmentBlur = async () => {
    // Validate input is a number
    const numValue = parseFloat(editedAdjustment);
    if (isNaN(numValue)) {
      toast({
        title: "Invalid value",
        description: "Please enter a valid number",
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "top-right",
      });
      setEditedAdjustment(additionalAdjustment || "");
      setIsEditingAdjustment(false);
      return;
    }

    try {
      // Save the updated adjustment to the backend if there's a waybill number
      if (selectedWaybill) {
        // Use the onAdditionalAdjustmentUpdate callback to handle the update
        if (onAdditionalAdjustmentUpdate) {
          await onAdditionalAdjustmentUpdate(numValue);

          toast({
            title: "Success",
            description: "Additional Adjustment updated successfully",
            status: "success",
            duration: 3000,
            isClosable: true,
            position: "top-right",
          });
        }
      }
    } catch (error) {
      console.error("Error updating additional adjustment:", error);
      toast({
        title: "Error",
        description: "Failed to update Additional Adjustment",
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "top-right",
      });
    }

    setIsEditingAdjustment(false);
  };

  const handleAdjustmentKeyDown = (e) => {
    if (e.key === "Enter") {
      e.target.blur(); // Trigger the blur event to save
    } else if (e.key === "Escape") {
      setEditedAdjustment(additionalAdjustment || "");
      setIsEditingAdjustment(false);
    }
  };

  // Function to open the additional rate modal
  const handleOpenRateModal = async () => {
    try {
      // Fetch the current additional rate
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/additionalRate`
      );

      if (response.ok) {
        const data = await response.json();
        setAdditionalRate(data.rate || 1000);
      } else {
        setAdditionalRate(1000); // Default value
      }

      onOpen();
    } catch (error) {
      console.error("Error fetching additional rate:", error);
      setAdditionalRate(1000); // Default value
      onOpen();
    }
  };

  // Function to handle rate change in the input
  const handleRateChange = (e) => {
    setAdditionalRate(e.target.value);
  };

  // Function to save the new additional rate
  const handleSaveRate = async () => {
    try {
      setIsSubmitting(true);

      // Validate rate
      const numRate = Number(additionalRate);
      if (isNaN(numRate) || numRate < 0) {
        toast({
          title: "Invalid value",
          description: "Please enter a valid positive number",
          status: "error",
          duration: 3000,
          isClosable: true,
          position: "top-right",
        });
        setIsSubmitting(false);
        return;
      }

      // Save the rate to backend
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/additionalRate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rate: numRate }),
        }
      );

      if (response.ok) {
        toast({
          title: "Success",
          description: "Additional rate updated successfully",
          status: "success",
          duration: 3000,
          isClosable: true,
          position: "top-right",
        });

        onClose();

        // Refresh the page to apply the new rate
        window.location.reload();
      } else {
        throw new Error("Failed to update rate");
      }
    } catch (error) {
      console.error("Error saving additional rate:", error);
      toast({
        title: "Error",
        description: "Failed to update additional rate",
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "top-right",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box
      mb={8}
      bg="white"
      p={8}
      borderRadius="xl"
      boxShadow="lg"
      borderWidth="1px"
      borderColor={borderColor}
      transition="all 0.3s ease"
      position="relative"
      overflow="visible"
      _hover={{
        transform: "translateY(-2px)",
        boxShadow: "xl",
      }}
    >
      {/* Loading Indicator Overlay - Only shows when loading */}
      {isUpdatingAmounts && (
        <Box
          position="absolute"
          top={0}
          left={0}
          right={0}
          bottom={0}
          bg="rgba(255, 255, 255, 0.7)"
          zIndex={5}
          borderRadius="xl"
          display="flex"
          justifyContent="center"
          alignItems="center"
          flexDirection="column"
          backdropFilter="blur(8px)" // Apply blur effect
        >
          <Spinner
            thickness="4px"
            speed="0.55s"
            emptyColor="gray.200"
            color={primaryColor}
            size="xl"
            mb={3}
          />
          <Text color={primaryColor} fontWeight="bold">
            Updating calculations...
          </Text>
        </Box>
      )}

      {/* Header Section */}
      <Box
        position="absolute"
        top={0}
        left={0}
        right={0}
        height="8px"
        bgGradient={`linear(to-r, ${primaryColor}, ${secondaryColor}, maroon)`}
      />

      <Flex
        justifyContent="center"
        alignItems="center"
        mb={10}
        position="relative"
        className="header-title"
        overflow="visible"
      >
        {/* Title */}
        <Flex
          zIndex={1}
          alignItems="center"
          justifyContent="flex-start"
          width="100%"
          p={4}
          pl={2}
          borderRadius="lg"
          transition="all 0.3s ease"
          _hover={{
            transform: "scale(1.02)",
            boxShadow: "md",
          }}
        >
          <Icon
            as={FaTruck}
            color="maroon"
            boxSize={10}
            ml={2}
            mr={4}
            transform="rotate(-10deg)"
            transition="transform 0.4s ease"
            _hover={{
              transform: "rotate(0deg) scale(1.1)",
            }}
          />
          <Heading
            size="xl"
            fontWeight="black"
            color={primaryColor}
            letterSpacing="wider"
            textTransform="uppercase"
            textShadow="1px 1px 2px rgba(0,0,0,0.1)"
            sx={{
              span: {
                color: "maroon",
                position: "relative",
              },
            }}
          >
            Waybill <span>Management</span>
          </Heading>
        </Flex>
      </Flex>

      {/* Stats Grid */}
      <Grid
        templateColumns={{
          base: "repeat(1, 1fr)",
          md: "repeat(1, 1fr)",
          lg: "repeat(1, 1fr)",
        }}
        gap={0}
        alignItems="stretch"
        templateAreas={{
          base: `
              "waybill"
              "highestrate"
              "totalamount"
            `,
          md: `
              "waybill"
              "highestrate"
              "totalamount"
            `,
          lg: `
              "waybill"
              "highestrate"
              "totalamount"
            `,
        }}
      >
        {/* WAYBILL NUMBER SECTION WITH INLINE STATS */}
        <GridItem area="waybill" mb={4}>
          <Box
            p={3}
            bg={`${primaryColor}08`}
            borderRadius="xl"
            borderLeft={`6px solid ${primaryColor}`}
            transition="all 0.3s ease"
            cursor="pointer"
            w="100%"
            role="group"
            _hover={{
              transform: "translateY(-4px)",
              boxShadow: "lg",
              bg: `${primaryColor}15`,
            }}
          >
            <Flex alignItems="center" justifyContent="space-between">
              {/* Waybill Number */}
              <Flex alignItems="center" gap={4} flex="1">
                <Box
                  bg={`${primaryColor}15`}
                  p={3}
                  borderRadius="lg"
                  transition="0.3s ease"
                  maxW="50%"
                  _groupHover={{
                    transform: "scale(1.1) rotate(10deg)",
                    bg: `${primaryColor}25`,
                  }}
                >
                  <Icon
                    as={FaFileInvoice}
                    color={primaryColor}
                    boxSize={6}
                    transition="0.3s ease"
                    _groupHover={{ color: "maroon" }}
                  />
                </Box>
                <Box>
                  <Text
                    fontWeight="semibold"
                    fontSize="sm"
                    color="gray.500"
                    mb={2}
                    transition="0.3s ease"
                    _groupHover={{ color: "gray.700" }}
                  >
                    WAYBILL NUMBER
                  </Text>
                  <Text
                    fontSize="xl"
                    fontWeight="bold"
                    color={primaryColor}
                    transition="0.3s ease"
                    _groupHover={{
                      color: "maroon",
                      transform: "scale(1.05)",
                    }}
                  >
                    {selectedWaybill || "—"}
                  </Text>
                </Box>
              </Flex>

              {/* Right side stats */}
              <Flex gap={8} justifyContent="flex-end" flex="2">
                {/* Total Truck CBM */}
                <Flex alignItems="center" gap={4}>
                  <Box
                    bg={`${secondaryColor}15`}
                    p={3}
                    borderRadius="lg"
                    transition="0.3s ease"
                    _groupHover={{
                      transform: "scale(1.1) rotate(10deg)",
                      bg: `${secondaryColor}25`,
                    }}
                  >
                    <Icon
                      as={FaTruck}
                      color={secondaryColor}
                      boxSize={6}
                      transition="0.3s ease"
                      _groupHover={{ color: primaryColor }}
                    />
                  </Box>
                  <Box>
                    <Text
                      fontWeight="semibold"
                      fontSize="sm"
                      color="gray.500"
                      mb={2}
                      transition="0.3s ease"
                      _groupHover={{ color: "gray.700" }}
                    >
                      TOTAL TRUCK CBM
                    </Text>
                    <Tooltip
                      label={
                        selectedWaybill
                          ? "Double-click to edit truck CBM"
                          : "Total cubic meters capacity of the truck"
                      }
                      placement="bottom"
                      hasArrow
                      bg={`${secondaryColor}`}
                    >
                      {isEditingTruckCbm ? (
                        <Input
                          value={editedTruckCbm}
                          onChange={handleTruckCbmChange}
                          onBlur={handleTruckCbmBlur}
                          onKeyDown={handleTruckCbmKeyDown}
                          autoFocus
                          size="sm"
                          width="100px"
                          fontWeight="bold"
                          borderColor={secondaryColor}
                          _hover={{ borderColor: primaryColor }}
                          _focus={{
                            borderColor: primaryColor,
                            boxShadow: `0 0 0 1px ${primaryColor}`,
                          }}
                          type="number"
                          step="0.01"
                          min="0"
                        />
                      ) : (
                        <Flex alignItems="center">
                          <Text
                            fontSize="xl"
                            fontWeight="bold"
                            color={secondaryColor}
                            transition="0.3s ease"
                            _groupHover={{
                              color: primaryColor,
                              transform: "scale(1.05)",
                            }}
                            onDoubleClick={handleDoubleClickTruckCbm}
                            cursor={selectedWaybill ? "pointer" : "default"}
                            _hover={
                              selectedWaybill
                                ? { textDecoration: "underline dotted" }
                                : {}
                            }
                            data-testid="truck-cbm-value"
                          >
                            {formatNumberWithCommas(truckCbm) || "—"}
                          </Text>

                          {/* CBM Overflow Warning */}
                          {cbmOverflow?.isOverflow && (
                            <Tooltip
                              label={`Consignee CBM exceeds truck capacity by ${cbmOverflow.difference} CBM`}
                              placement="top"
                              hasArrow
                              bg="red.500"
                            >
                              <Badge
                                ml={2}
                                colorScheme="red"
                                borderRadius="full"
                                display="flex"
                                alignItems="center"
                                px={2}
                                py={1}
                              >
                                <Icon as={FaExclamationTriangle} mr={1} />+
                                {cbmOverflow.difference}
                              </Badge>
                            </Tooltip>
                          )}
                        </Flex>
                      )}
                    </Tooltip>
                  </Box>
                </Flex>

                {/* Total Percentage */}
                <Flex alignItems="center" gap={4}>
                  <Box
                    bg={`${primaryColor}15`}
                    p={3}
                    borderRadius="lg"
                    transition="0.3s ease"
                    _groupHover={{
                      transform: "scale(1.1) rotate(10deg)",
                      bg: `${primaryColor}25`,
                    }}
                  >
                    <Icon
                      as={FaChartBar}
                      color={primaryColor}
                      boxSize={6}
                      transition="0.3s ease"
                      _groupHover={{ color: "maroon" }}
                    />
                  </Box>
                  <Box>
                    <Text
                      fontWeight="semibold"
                      fontSize="sm"
                      color="gray.500"
                      mb={2}
                      transition="0.3s ease"
                      _groupHover={{ color: "gray.700" }}
                    >
                      TOTAL PERCENTAGE
                    </Text>
                    <Tooltip
                      label="Total percentage of truck capacity used"
                      placement="bottom"
                      hasArrow
                      bg={`${primaryColor}`}
                    >
                      <Text
                        fontSize="xl"
                        fontWeight="bold"
                        color={primaryColor}
                        transition="0.3s ease"
                        _groupHover={{
                          color: "maroon",
                          transform: "scale(1.05)",
                        }}
                      >
                        {formatNumberWithCommas(totalPercentage)}%
                      </Text>
                    </Tooltip>
                  </Box>
                </Flex>
              </Flex>
            </Flex>
          </Box>
        </GridItem>

        {/* COMBINED RATES BOX */}
        <GridItem area="highestrate">
          <Box
            p={4}
            bg={`${primaryColor}08`}
            borderRadius="xl"
            borderTopRadius="xl"
            borderBottomRadius="none"
            borderLeft={`6px solid ${primaryColor}`}
            transition="all 0.3s ease"
            cursor="pointer"
            role="group"
            height="100%"
            _hover={{
              transform: "translateY(-2px)",
              boxShadow: "lg",
              bg: `${primaryColor}15`,
            }}
          >
            <VStack spacing={4} align="stretch" width="100%">
              {/* Highest Rate */}
              <Flex alignItems="center" justifyContent="flex-start">
                <Flex alignItems="center" gap={4} width="100%">
                  <Box
                    bg={`${primaryColor}15`}
                    p={3}
                    borderRadius="lg"
                    transition="0.3s ease"
                    _groupHover={{
                      transform: "scale(1.1) rotate(10deg)",
                      bg: `${primaryColor}25`,
                    }}
                  >
                    <Icon
                      as={FaChartLine}
                      color={primaryColor}
                      boxSize={6}
                      transition="0.3s ease"
                      _groupHover={{ color: "maroon" }}
                    />
                  </Box>
                  <Box flex="1">
                    <Text
                      fontWeight="semibold"
                      fontSize="sm"
                      color="gray.500"
                      mb={1}
                    >
                      HIGHEST RATE
                    </Text>
                    <Tooltip
                      label="Highest rate applied to this waybill"
                      placement="bottom"
                      hasArrow
                      bg={`${primaryColor}`}
                    >
                      <Text
                        fontSize="xl"
                        fontWeight="bold"
                        color={secondaryColor}
                      >
                        ₱{formatNumberWithCommas(highestRate) || "0"}
                      </Text>
                    </Tooltip>
                  </Box>
                </Flex>
              </Flex>

              {/* Additional Adjustment */}
              <Flex alignItems="center" justifyContent="flex-start">
                <Flex alignItems="center" gap={4} width="100%">
                  <Box
                    bg={`${primaryColor}15`}
                    p={3}
                    borderRadius="lg"
                    transition="0.3s ease"
                    _groupHover={{
                      transform: "scale(1.1) rotate(10deg)",
                      bg: `${primaryColor}25`,
                    }}
                  >
                    <Icon
                      as={FaPlus}
                      color={primaryColor}
                      boxSize={6}
                      transition="0.3s ease"
                      _groupHover={{ color: "maroon" }}
                    />
                  </Box>
                  <Box flex="1">
                    <Flex alignItems="center">
                      <Text
                        fontWeight="semibold"
                        fontSize="sm"
                        color="gray.500"
                        mb={1}
                      >
                        ADDITIONAL ADJUSTMENT
                      </Text>
                      {/* <Tooltip
                        label="Configure additional rate per drop"
                        placement="top"
                        hasArrow
                        bg={`${primaryColor}`}
                      >
                        <Button
                          size="xs"
                          ml={2}
                          colorScheme="gray"
                          onClick={handleOpenRateModal}
                          leftIcon={<FaCog />}
                          variant="outline"
                        >
                          Configure
                        </Button>
                      </Tooltip> */}
                    </Flex>
                    <Tooltip
                      label={
                        selectedWaybill
                          ? "Double-click to edit adjustment"
                          : "Additional rate adjustments applied"
                      }
                      placement="bottom"
                      hasArrow
                      bg={`${primaryColor}`}
                    >
                      {isEditingAdjustment ? (
                        <Input
                          value={editedAdjustment}
                          onChange={handleAdjustmentChange}
                          onBlur={handleAdjustmentBlur}
                          onKeyDown={handleAdjustmentKeyDown}
                          autoFocus
                          size="sm"
                          width="100px"
                          fontWeight="bold"
                          borderColor={secondaryColor}
                          _hover={{ borderColor: primaryColor }}
                          _focus={{
                            borderColor: primaryColor,
                            boxShadow: `0 0 0 1px ${primaryColor}`,
                          }}
                          type="number"
                          step="100"
                        />
                      ) : (
                        <Text
                          fontSize="xl"
                          fontWeight="bold"
                          color={secondaryColor}
                          cursor={selectedWaybill ? "pointer" : "default"}
                          _hover={
                            selectedWaybill
                              ? { textDecoration: "underline dotted" }
                              : {}
                          }
                          onDoubleClick={handleDoubleClickAdjustment}
                        >
                          ₱{formatNumberWithCommas(additionalAdjustment) || "0"}
                        </Text>
                      )}
                    </Tooltip>
                  </Box>
                </Flex>
              </Flex>

              {/* Base Rate with Additional */}
              <Flex alignItems="center" justifyContent="flex-start">
                <Flex alignItems="center" gap={4} width="100%">
                  <Box
                    bg="rgba(128, 0, 0, 0.15)"
                    p={3}
                    borderRadius="lg"
                    transition="0.3s ease"
                    _groupHover={{
                      transform: "scale(1.1) rotate(10deg)",
                      bg: "rgba(128, 0, 0, 0.25)",
                    }}
                  >
                    <Icon
                      as={FaCalculator}
                      color="maroon"
                      boxSize={6}
                      transition="0.3s ease"
                      _groupHover={{ color: primaryColor }}
                    />
                  </Box>
                  <Box flex="1">
                    <Text
                      fontWeight="semibold"
                      fontSize="sm"
                      color="gray.500"
                      mb={1}
                    >
                      BASE RATE WITH ADDITIONAL
                    </Text>
                    <Tooltip
                      label="Combined total rate (highest rate + adjustments)"
                      placement="bottom"
                      hasArrow
                      bg="maroon"
                    >
                      <Text
                        fontSize="xl"
                        fontWeight="bold"
                        color="maroon"
                        data-testid="base-rate-value"
                      >
                        ₱{formatNumberWithCommas(totalRate) || "0"}
                      </Text>
                    </Tooltip>
                  </Box>
                </Flex>
              </Flex>
            </VStack>
          </Box>
        </GridItem>

        {/* TOTAL AMOUNT */}
        <GridItem area="totalamount">
          <Box
            p={4}
            bg="rgba(128, 0, 0, 0.08)"
            borderRadius="xl"
            borderTopRadius="none"
            borderBottomRadius="xl"
            borderLeft="6px solid maroon"
            transition="all 0.3s ease"
            cursor="pointer"
            role="group"
            height="100%"
            mt="-1px"
            _hover={{
              transform: "translateY(2px)",
              boxShadow: "lg",
              bg: "rgba(128, 0, 0, 0.12)",
            }}
          >
            <Flex alignItems="center" gap={4} width="100%">
              <Box
                bg="rgba(128, 0, 0, 0.15)"
                p={3}
                borderRadius="lg"
                transition="0.3s ease"
                _groupHover={{
                  transform: "scale(1.1) rotate(10deg)",
                  bg: "rgba(128, 0, 0, 0.25)",
                  boxShadow: "lg",
                }}
              >
                <Icon
                  as={FaMoneyBillWave}
                  color="maroon"
                  boxSize={6}
                  transition="0.3s ease"
                  _groupHover={{ color: "darkred" }}
                />
              </Box>
              <Box flex="1">
                <Text
                  fontWeight="semibold"
                  fontSize="sm"
                  color="gray.500"
                  mb={2}
                >
                  TOTAL AMOUNT
                </Text>
                <Tooltip
                  label="Total calculated amount for this waybill"
                  placement="bottom"
                  hasArrow
                  bg="maroon"
                >
                  <Text fontSize="xl" fontWeight="bold" color="maroon">
                    ₱{formatNumberWithCommas(totalAmount?.toFixed(2)) || "0"}
                  </Text>
                </Tooltip>
              </Box>
            </Flex>
          </Box>
        </GridItem>
      </Grid>

      {/* Additional Rate Configuration Modal */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Configure Additional Rate</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <FormControl>
              <FormLabel>Rate per drop (after 2 drops)</FormLabel>
              <Input
                value={additionalRate}
                onChange={handleRateChange}
                type="number"
                min="0"
                step="100"
              />
            </FormControl>
          </ModalBody>

          <ModalFooter>
            <Button colorScheme="gray" mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button
              colorScheme="blue"
              onClick={handleSaveRate}
              isLoading={isSubmitting}
            >
              Save
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default WaybillHeader;
