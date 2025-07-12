import React from "react";
import {
  Box,
  Heading,
  Tabs,
  TabList,
  Tab,
  useColorModeValue,
  // Flex // Flex is not used, remove it
} from "@chakra-ui/react";

const PayrollReportMain = ({ activeTab, onTabChange }) => {
  // Define colors
  const primaryColor = "#800020"; // Maroon
  const secondaryColor = "#1a365d"; // Dark Blue
  const subtleBorderColor = useColorModeValue("gray.200", "gray.600");
  const inactiveTextColor = useColorModeValue("gray.600", "gray.400");
  const lightBlueBg = useColorModeValue("blue.50", "blue.900"); // For hover

  // Styles for the active tab
  const activeTabStyle = {
    color: "white",
    bg: primaryColor,
    fontWeight: "semibold", // Use semibold for a slightly softer look
    borderTopRadius: "md", // Add slight rounding to top corners
    borderColor: primaryColor, // Match background color for seamless top/side borders
    borderWidth: "1px",
    borderBottom: "none", // Remove bottom border to connect visually
    // Slightly lift the active tab to make it pop
    position: "relative",
    top: "-1px",
  };

  // Base/inactive styles
  const inactiveTabStyle = {
    color: inactiveTextColor,
    bg: "white", // Keep inactive tabs white for minimalism
    fontWeight: "medium",
    borderTopRadius: "md",
    borderColor: subtleBorderColor, // Use a subtle border for inactive tabs
    borderWidth: "1px",
    borderBottom: "none", // No individual bottom border for tabs
  };

  // Style for hovering over an inactive tab
  const hoverStyle = {
    bg: lightBlueBg, // Use a light blue background on hover
    color: secondaryColor, // Use the dark blue text color on hover
    borderColor: secondaryColor, // Use dark blue border on hover
    // Keep other properties like borderWidth, borderBottom as in inactiveTabStyle if needed
    // If hover applies only to inactive tabs, ensure border props match or override appropriately
    // To be safe, explicitly define border properties on hover:
    borderWidth: "1px",
    borderBottom: "none",
    borderTopRadius: "md",
  };

  // Determine the index based on the activeTab prop
  const tabIdentifiers = ["justine-cargo", "justine-scrap", "mc-rentals"];
  const tabIndex = tabIdentifiers.indexOf(activeTab);

  // Style for the TabList container
  const tabListStyle = {
    borderBottom: "2px solid", // Keep a solid line below tabs
    borderColor: secondaryColor, // Use the secondary color for the line
  };

  return (
    <Box pt={5} pl={5} pr={5} pb={5}>
      {/* Main Header - Use primaryColor */}
      <Heading size="lg" mb={4} color={primaryColor}>
        Payroll Reports
      </Heading>

      {/* Tab Controls */}
      <Tabs
        index={tabIndex}
        onChange={(index) => {
          const tabIdentifier = tabIdentifiers[index];
          if (onTabChange) {
            onTabChange(tabIdentifier);
          }
        }}
        variant="enclosed" // Keep enclosed variant but style it
        size="md"
        isFitted
      >
        {/* Apply styles to the TabList */}
        <TabList {...tabListStyle}>
          {/* Tab 1: Justine's Cargo */}
          <Tab
            {...inactiveTabStyle} // Apply inactive styles as base
            _selected={activeTabStyle} // Override with active styles when selected
            _hover={hoverStyle} // Apply hover styles for inactive tabs
            // Ensure hover doesn't override selected styles' specificity if needed
            // _selected _hover can be defined if hover on active tab needs different style
          >
            Justine's Cargo
          </Tab>

          {/* Tab 2: Justine's Scrap */}
          <Tab
            {...inactiveTabStyle}
            _selected={activeTabStyle}
            _hover={hoverStyle}
            // isDisabled // Keep disabled for now or remove if needed
          >
            Justine's Scrap
          </Tab>

          {/* Tab 3: M&C Rentals */}
          <Tab
            {...inactiveTabStyle}
            _selected={activeTabStyle}
            _hover={hoverStyle}
            // isDisabled // Keep disabled for now or remove if needed
          >
            M&C Rentals
          </Tab>
        </TabList>
      </Tabs>
    </Box>
  );
};

export default PayrollReportMain;
