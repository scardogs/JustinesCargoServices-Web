import React, { useState, useEffect } from "react";
import {
  Box,
  Flex,
  Text,
  Heading,
  Button,
  Grid,
  GridItem,
  Icon,
  Badge,
  IconButton,
} from "@chakra-ui/react";
import {
  FaMapMarkerAlt,
  FaFlag,
  FaTag,
  FaPercentage,
  FaMoneyBillWave,
  FaCube,
  FaUserAlt,
} from "react-icons/fa";
import {
  AddIcon,
  DeleteIcon,
  EditIcon,
  DownloadIcon,
  RepeatIcon,
} from "@chakra-ui/icons";
import { BiAnalyse } from "react-icons/bi";

const ConsigneeInformation = ({
  primaryColor,
  secondaryColor,
  borderColor,
  isShipperInfoSaved,
  isCbmFull,
  openDrawer,
  filteredConsignees,
  formatDate,
  formatNumberWithCommas,
  handleViewSubDetails,
  handleEditConsignee,
  handleDeleteConsignee,
  updateAmountsWithHighestRate,
  onDeleteAllAlertOpen,
  waybillNumber,
  isViewOnly: externalViewOnly = false,
  currentShipperName,
}) => {
  const [isViewOnly, setIsViewOnly] = useState(false);

  useEffect(() => {
    const checkDuplicateStatus = async () => {
      if (waybillNumber) {
        console.log(
          `ConsigneeInfo: Checking duplicate status for waybill ${waybillNumber}`
        );
        try {
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_BACKEND_API}/api/entity-abbreviation-summary/duplicate-status/${waybillNumber}`
          );

          if (response.ok) {
            const data = await response.json();
            console.log(`ConsigneeInfo: Received duplicate status:`, data);
            const newViewOnlyStatus =
              data.duplicated === "duplicate" || data.viewOnly === true;
            console.log(
              `ConsigneeInfo: Setting isViewOnly to ${newViewOnlyStatus}`
            );

            if (!externalViewOnly) {
              setIsViewOnly(newViewOnlyStatus);
            }
          } else {
            console.log(
              `ConsigneeInfo: Failed to get duplicate status, response not OK`
            );
          }
        } catch (error) {
          console.error(
            "ConsigneeInfo: Error checking duplicate status:",
            error
          );
        }
      } else {
        console.log(
          `ConsigneeInfo: No waybillNumber provided, cannot check duplicate status`
        );
      }
    };

    if (externalViewOnly) {
      setIsViewOnly(true);
    } else {
      checkDuplicateStatus();
    }
  }, [waybillNumber, externalViewOnly]);

  console.log(
    `ConsigneeInfo: Current isViewOnly state: ${isViewOnly}, waybillNumber: ${waybillNumber}`
  );

  const isShipperDataIncomplete =
    !isShipperInfoSaved || currentShipperName === "To be updated";

  return (
    <Box
      bg="white"
      p={4}
      borderRadius="xl"
      boxShadow="sm"
      borderWidth="1px"
      borderColor={borderColor}
      h="100%"
    >
      <Flex justifyContent="space-between" alignItems="center" mb={4}>
        <Flex>
          <Heading size="md" fontWeight="bold" textAlign="center">
            Consignee Information
            {isViewOnly && (
              <Badge ml={2} colorScheme="purple" fontSize="xs">
                View Only
              </Badge>
            )}
          </Heading>
        </Flex>
        {!isViewOnly && (
          <Flex gap={2}>
            {isShipperInfoSaved && (
              <Button
                colorScheme="red"
                size="sm"
                leftIcon={<RepeatIcon />}
                onClick={onDeleteAllAlertOpen}
              >
                Reverse All
              </Button>
            )}
            <Button
              leftIcon={<AddIcon />}
              onClick={openDrawer}
              bgColor={primaryColor}
              color="white"
              width="170px"
              flexShrink={0}
              isDisabled={isShipperDataIncomplete || isCbmFull()}
              _disabled={{
                bgColor: "gray.300",
                cursor: "not-allowed",
                opacity: 0.6,
              }}
              _hover={{
                bgColor: !isShipperDataIncomplete ? secondaryColor : "gray.300",
                transform: !isShipperDataIncomplete
                  ? "translateY(-2px)"
                  : "none",
              }}
              transition="all 0.2s"
              title={
                isShipperDataIncomplete
                  ? "Please complete and save shipper information first"
                  : isCbmFull()
                    ? "CBM capacity full - cannot add more drops"
                    : "Add new consignee drops"
              }
            >
              Add Drops
            </Button>
          </Flex>
        )}
      </Flex>

      {/* Consignee List */}
      <Box>
        {filteredConsignees.length > 0 ? (
          filteredConsignees.map((consignee, index) => (
            <Box
              key={index}
              p={3}
              border="1px solid"
              borderColor={borderColor}
              borderRadius="lg"
              mb={2}
              bg="white"
              transition="all 0.2s ease"
              boxShadow="sm"
              position="relative"
              _hover={{
                transform: "translateY(-2px)",
                boxShadow: "md",
                borderColor: secondaryColor,
              }}
            >
              {/* Type badge in the top right corner */}
              <Box
                position="absolute"
                top={2}
                right={2}
                bg={consignee.type === "DC" ? "blue.100" : "teal.100"}
                color={consignee.type === "DC" ? "blue.700" : "teal.700"}
                px={2}
                py={0.5}
                borderRadius="full"
                fontSize="xs"
                fontWeight="bold"
              >
                {consignee.type}
              </Box>

              {/* Sub-details badge if needed */}
              {consignee.withSubDetails && (
                <Box
                  position="absolute"
                  top={2}
                  right={16}
                  bg="purple.100"
                  color="purple.700"
                  px={2}
                  py={0.5}
                  borderRadius="full"
                  fontSize="xs"
                  fontWeight="bold"
                >
                  Sub-Details
                </Box>
              )}

              {/* Header Section */}
              <Flex direction="column" mb={2}>
                <Heading as="h4" size="sm" color={primaryColor} mb={1}>
                  {consignee.consignee}
                </Heading>
                <Flex
                  alignItems="center"
                  gap={2}
                  color="gray.600"
                  fontSize="xs"
                >
                  <Text>
                    Waybill:{" "}
                    <Text as="span" fontWeight="medium">
                      {consignee.waybillNumber}
                    </Text>
                  </Text>
                  <Text>•</Text>
                  <Text>
                    Date:{" "}
                    <Text as="span" fontWeight="medium">
                      {formatDate(consignee.date)}
                    </Text>
                  </Text>
                </Flex>
              </Flex>

              {/* Main Content Grid */}
              <Grid templateColumns="1fr 1fr" gap={3} mt={2}>
                {/* Location Information */}
                <Box
                  p={2}
                  bg="gray.50"
                  borderRadius="lg"
                  borderLeft="4px solid"
                  borderLeftColor={primaryColor}
                  position="relative"
                  transition="all 0.3s ease"
                  _hover={{
                    transform: "translateX(4px)",
                    boxShadow: "md",
                  }}
                >
                  <Flex direction="column" gap={2}>
                    {/* Origin Section */}
                    <Box>
                      <Flex align="center" mb={1}>
                        <Icon
                          as={FaMapMarkerAlt}
                          color={primaryColor}
                          mr={2}
                          size="sm"
                        />
                        <Text
                          fontWeight="bold"
                          fontSize="xs"
                          color={primaryColor}
                          textTransform="uppercase"
                        >
                          Origin
                        </Text>
                      </Flex>
                      <Box
                        p={2}
                        bg="white"
                        borderRadius="md"
                        boxShadow="sm"
                        borderWidth="1px"
                        borderColor="gray.200"
                      >
                        <Text fontSize="sm" color="gray.700">
                          {consignee.origin || "N/A"}
                        </Text>
                      </Box>
                    </Box>

                    {/* Destination Section */}
                    <Box>
                      <Flex align="center" mb={1}>
                        <Icon as={FaFlag} color="maroon" mr={2} size="sm" />
                        <Text
                          fontWeight="bold"
                          fontSize="xs"
                          color="maroon"
                          textTransform="uppercase"
                        >
                          Destination
                        </Text>
                      </Flex>
                      <Box
                        p={2}
                        bg="white"
                        borderRadius="md"
                        boxShadow="sm"
                        borderWidth="1px"
                        borderColor="gray.200"
                      >
                        <Text fontSize="sm" color="gray.700">
                          {consignee.destination || "N/A"}
                        </Text>
                      </Box>
                    </Box>
                  </Flex>
                </Box>

                {/* Rates and Amounts */}
                <Box
                  p={2}
                  borderRadius="lg"
                  bg={`${primaryColor}05`}
                  position="relative"
                  transition="all 0.3s ease"
                  _hover={{
                    transform: "translateX(-4px)",
                    boxShadow: "md",
                  }}
                >
                  <Text
                    fontSize="xs"
                    fontWeight="bold"
                    color="blue.600"
                    textTransform="uppercase"
                    mb={2}
                  >
                    Financial Details
                  </Text>

                  <Grid templateColumns="repeat(3, 1fr)" gap={2}>
                    <Box
                      p={2}
                      bg="white"
                      borderRadius="md"
                      boxShadow="sm"
                      borderWidth="1px"
                      borderColor="blue.100"
                    >
                      <Flex align="center" mb={1}>
                        <Icon as={FaTag} color="blue.500" mr={1} size="sm" />
                        <Text
                          fontWeight="semibold"
                          fontSize="xs"
                          color="gray.600"
                        >
                          Store Rate
                        </Text>
                      </Flex>
                      <Text fontSize="sm" fontWeight="bold" color="blue.600">
                        ₱{formatNumberWithCommas(consignee.rate) || "0"}
                      </Text>
                    </Box>

                    <Box
                      p={2}
                      bg="white"
                      borderRadius="md"
                      boxShadow="sm"
                      borderWidth="1px"
                      borderColor="blue.100"
                    >
                      <Flex align="center" mb={1}>
                        <Icon
                          as={FaPercentage}
                          color="Red.500"
                          mr={1}
                          size="sm"
                        />
                        <Text
                          fontWeight="semibold"
                          fontSize="xs"
                          color="gray.600"
                        >
                          Percentage
                        </Text>
                      </Flex>
                      <Text fontSize="sm" fontWeight="bold" color="Maroon.500">
                        {formatNumberWithCommas(consignee.percentage) || "0"}%
                      </Text>
                    </Box>

                    <Box
                      p={2}
                      bg="white"
                      borderRadius="md"
                      boxShadow="sm"
                      borderWidth="1px"
                      borderColor="blue.100"
                    >
                      <Flex align="center" mb={1}>
                        <Icon as={FaCube} color="orange.500" mr={1} size="sm" />
                        <Text
                          fontWeight="semibold"
                          fontSize="xs"
                          color="gray.600"
                        >
                          CBM
                        </Text>
                      </Flex>
                      <Text fontSize="sm" fontWeight="bold" color="orange.600">
                        {formatNumberWithCommas(consignee.cbm) || "0"}
                      </Text>
                    </Box>
                  </Grid>
                </Box>
              </Grid>

              {/* Action Buttons - Only shown when not view-only */}
              {!isViewOnly && (
                <Flex justifyContent="flex-end" mt={2} gap={2}>
                  <IconButton
                    icon={<EditIcon />}
                    aria-label="Edit Consignee"
                    onClick={() => handleEditConsignee(consignee)}
                    colorScheme="blue"
                    size="xs"
                  />
                  <IconButton
                    icon={<DeleteIcon />}
                    aria-label="Delete Consignee"
                    onClick={() => handleDeleteConsignee(consignee)}
                    colorScheme="red"
                    variant="outline"
                    size="xs"
                  />
                </Flex>
              )}

              {/* Always show the View Details button, even in view-only mode */}
              {/* {(consignee.type === "DC" || consignee.type === "Store") && (
                <Button
                  display={{ base: "none", md: "block" }}
                  leftIcon={<DownloadIcon />}
                  onClick={() => handleViewSubDetails(consignee)}
                  colorScheme="blue"
                  variant="outline"
                  size="xs"
                  mt={2}
                  ml="auto"
                >
                  View Details
                </Button>
              )} */}
            </Box>
          ))
        ) : (
          <Box
            textAlign="center"
            py={8}
            bg="gray.50"
            borderRadius="lg"
            border="1px dashed"
            borderColor="gray.200"
          >
            <Text fontSize="lg" color="gray.500">
              No consignees added yet.
            </Text>
            <Text fontSize="sm" color="gray.400" mt={2}>
              Use the form above to add consignees to this waybill.
            </Text>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default ConsigneeInformation;
