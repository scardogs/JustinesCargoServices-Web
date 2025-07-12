import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Box,
  Flex,
  Icon,
  IconButton,
  useColorModeValue,
  Text,
  Menu,
  MenuButton,
  MenuDivider,
  MenuItem,
  MenuList,
  Avatar,
  VStack,
  HStack,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  useDisclosure,
  Tooltip,
  Badge,
  useToast,
  CloseButton,
  Circle,
  // Drawer,
  // DrawerBody,
  // DrawerContent,
  // DrawerHeader,
  // DrawerOverlay,
} from "@chakra-ui/react";
import {
  FiTruck,
  FiClipboard,
  FiUsers,
  FiCalendar,
  FiBell,
  FiChevronDown,
  FiChevronRight,
  FiArchive,
  FiRepeat,
  FiSettings,
  FiBox,
  FiDroplet,
  // FiMessageSquare,
} from "react-icons/fi";
import {
  FaTruck,
  FaTruckLoading,
  FaTruckMoving,
  FaUserTie,
  FaShoppingCart,
  FaReceipt,
  FaBorderAll,
  FaRegListAlt,
  FaListAlt,
  FaWarehouse,
  FaSort,
  FaStore,
  FaSass,
  FaStackpath,
  FaProductHunt,
  FaRegCheckSquare,
  FaFileInvoice,
  FaCalendarAlt,
} from "react-icons/fa";
import { IoReceiptOutline } from "react-icons/io5";
import {
  MdOutlineInventory2,
  MdOutlineDashboard,
  MdFiberManualRecord,
} from "react-icons/md";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import axios from "axios";
import { GoHorizontalRule } from "react-icons/go";
import { keyframes } from "@emotion/react";
import { BsFillBucketFill, BsFillBuildingsFill } from "react-icons/bs";
// import io from "socket.io-client";

// Dynamically import components
const Scheduler = dynamic(
  () => import("../SchedulerOfficer/Scheduler/SOScheduler"),
  {
    ssr: false,
  }
);
const User = dynamic(() => import("../../pages/UserManagement/user"), {
  ssr: false,
});
const Vehicle = dynamic(
  () => import("../SchedulerOfficer/Vehicle/SOVehicleTab"),
  {
    ssr: false,
  }
);
const Client = dynamic(() => import("../../pages/Client/Client"), {
  ssr: false,
});
const Trips = dynamic(() => import("../SchedulerOfficer/Trips/SOtripTable"), {
  ssr: false,
});
const Employee = dynamic(
  () => import("../../pages/EmployeeRecords/employeerecords"),
  {
    ssr: false,
  }
);
const SODashboard = dynamic(() => import("../SchedulerOfficer/SODashboard"), {
  ssr: false,
});
const Company = dynamic(
  () => import("../SchedulerOfficer/Customer/SOCompany"),
  {
    ssr: false,
  }
);
const WaybillActivation = dynamic(
  () => import("../../pages/WaybillManagement/waybillActivation"),
  {
    ssr: false,
  }
);
const WaybillManagement = dynamic(
  () => import("../../pages/WaybillManagement/waybillTable"),
  {
    ssr: false,
  }
);
const PayrollManagement = dynamic(
  () => import("../../pages/PayrollManagement/cargoMainPage"),
  {
    ssr: false,
  }
);
const ScrapPayrollManagement = dynamic(
  () => import("../../components/Payroll/scrapMain"),
  {
    ssr: false,
  }
);
const Billing = dynamic(() => import("../../pages/Billing/billingPage"), {
  ssr: false,
});
const Items = dynamic(() => import("../../pages/Inventory/itemsPage"), {
  ssr: false,
});
const Category = dynamic(() => import("../../pages/Inventory/categoryPage"), {
  ssr: false,
});
const Warehouse = dynamic(() => import("../../pages/Inventory/warehousePage"), {
  ssr: false,
});
const Stocks = dynamic(() => import("../../pages/Inventory/stocksPage"), {
  ssr: false,
});
const Purchase = dynamic(() => import("../../pages/Inventory/purchasePage"), {
  ssr: false,
});
const MaterialRequest = dynamic(
  () => import("../../pages/Inventory/materialRequest"),
  {
    ssr: false,
  }
);
const EmpReports = dynamic(() => import("../../pages/Reports/EmpReportsPage"), {
  ssr: false,
});
const TrucksReports = dynamic(
  () => import("../../pages/Reports/TruckReportsPage"),
  {
    ssr: false,
  }
);
const BillingReports = dynamic(
  () => import("../../pages/Reports/BillingReportsPage"),
  {
    ssr: false,
  }
);
const ServiceInvoice = dynamic(
  () => import("../../pages/Billing/serviceInvoicePage"),
  {
    ssr: false,
  }
);
const RenewalReportsPage = dynamic(
  () => import("../../pages/Reports/RenewalReportsPage"),
  {
    ssr: false,
  }
);
const InventoryReportsPage = dynamic(
  () => import("../../pages/Reports/InventoryReportsPage"),
  {
    ssr: false,
  }
);
const PayrollReportPage = dynamic(
  () => import("../../pages/Reports/payrollReportPage.js"),
  {
    ssr: false,
  }
);
const ControlPanel = dynamic(
  () => import("../../pages/Control Panel/controlPanelPage"),
  {
    ssr: false,
  }
);
const PayrollDeductions = dynamic(
  () => import("../../components/Payroll/payroll-Deductions"),
  {
    ssr: false,
  }
);
const ChargesPage = dynamic(
  () => import("../../pages/PayrollManagement/chargesPage"),
  {
    ssr: false,
  }
);
const LeavePage = dynamic(
  () => import("../../pages/PayrollManagement/leavePage"),
  {
    ssr: false,
  }
);
const ThirteenthMonth = dynamic(
  () => import("../../pages/PayrollManagement/13Month"),
  {
    ssr: false,
  }
);

// Define Role-Based Access Control for top-level menu items
const roleAccess = {
  "Super Admin": [
    "Dashboard",
    "Customer",
    "Vehicle",
    "Delivery",
    "Waybill",
    "Billing",
    "Payroll Processing",
    "Employee Records",
    "Inventory",
    "User Accounts",
    "Reports",
    "Control Panel",
  ],
  Admin: [
    "Dashboard",
    "Customer",
    "Vehicle",
    "Delivery",
    "Waybill",
    "Billing",
    "Payroll Processing",
    "Employee Records",
    "Inventory",
    "User Accounts",
    "Reports",
    "Control Panel",
  ],
  "Waybill Officer": ["Dashboard", "Waybill"],
  Scheduler: ["Dashboard", "Customer", "Delivery", "Vehicle"],
  "Inventory Officer": ["Dashboard", "Inventory"],
  HR: ["Dashboard", "Payroll Processing", "Employee Records", "Reports"], // Assuming HR needs Dashboard and relevant Reports
  // Add other roles as needed
};

// Sidebar Navigation Links with paths (Keep the full list here)
const linkItems = [
  { name: "Dashboard", icon: MdOutlineDashboard, path: "/dashboard" },
  {
    name: "Customer",
    icon: FaUserTie,
    subMenu: [
      {
        name: "Company",
        icon: GoHorizontalRule,
        path: "/SOcustomer/SOcompany",
      },
      // { name: "Individual", icon: GoHorizontalRule, path: "/customer/client" },
    ],
  },
  { name: "Vehicle", icon: FiTruck, path: "/SOvehicle" },
  {
    name: "Delivery",
    icon: FaTruckMoving,
    subMenu: [
      { name: "Scheduler", icon: FiCalendar, path: "/SOdelivery/SOscheduler" },
      { name: "Trips", icon: FaTruckLoading, path: "/SOdelivery/SOtrips" },
    ],
  },
  // {
  //   name: "Waybill",
  //   icon: FiClipboard,
  //   subMenu: [
  //     {
  //       name: "Waybill Activation",
  //       icon: FaRegCheckSquare,
  //       path: "/waybill/activation",
  //     },
  //     {
  //       name: "Waybill Management",
  //       icon: FaListAlt,
  //       path: "/waybill/management",
  //     },
  //   ],
  // },
  // {
  //   name: "Billing",
  //   icon: IoReceiptOutline,
  //   subMenu: [
  //     {
  //       name: "Service Invoice Activation",
  //       icon: FaReceipt,
  //       path: "/billing/service-invoice",
  //     },
  //     { name: "Billing Management", icon: FaFileInvoice, path: "/billing" },
  //   ],
  // },
  // {
  //   name: "Payroll Processing",
  //   icon: FiClipboard,
  //   subMenu: [
  //     {
  //       name: "Justine's Cargo",
  //       icon: FiTruck,
  //       path: "/payroll/justine-cargo",
  //       component: "PayrollManagement",
  //       props: { company: "justine-cargo" },
  //     },
  //     {
  //       name: "Justine's Scrap",
  //       icon: BsFillBucketFill,
  //       path: "/payroll/justine-scrap",
  //       component: "ScrapPayrollManagement",
  //     },
  //     {
  //       name: "M&C Property Rentals",
  //       icon: BsFillBuildingsFill,
  //       path: "/payroll/mc-property",
  //       component: "PayrollManagement",
  //       props: { company: "mc-property" },
  //     },
  //     {
  //       name: "Contributions",
  //       icon: FiDroplet,
  //       path: "/payroll/contributions",
  //       component: "PayrollDeductions",
  //       props: { company: "contributions" },
  //     },
  //     {
  //       name: "Charges",
  //       icon: FiDroplet,
  //       path: "/payroll/charges",
  //     },
  //     {
  //       name: "Leave Management",
  //       icon: FaCalendarAlt,
  //       path: "/payroll/leave",
  //     },
  //     {
  //       name: "13th Month",
  //       icon: FaCalendarAlt,
  //       path: "/payroll/13thmonth",
  //     },
  //   ],
  // },
  // { name: "Employee Records", icon: FaUserTie, path: "/employees" },
  // {
  //   name: "Inventory",
  //   icon: MdOutlineInventory2,
  //   subMenu: [
  //     { name: "Items", icon: FaListAlt, path: "/inventory/items" },
  //     { name: "Category", icon: FaBorderAll, path: "/inventory/category" },
  //     {
  //       name: "Warehouse",
  //       icon: FaWarehouse,
  //       path: "/inventory/warehouse",
  //     },
  //     { name: "Stock Logs", icon: FaStackpath, path: "/inventory/stocks" },
  //     { name: "Purchase", icon: FaProductHunt, path: "/inventory/purchase" },
  //     {
  //       name: "Material Request",
  //       icon: FaProductHunt,
  //       path: "/inventory/material-request",
  //     },
  //   ],
  // },
  // { name: "User Accounts", icon: FiUsers, path: "/users" },
  // {
  //   name: "Reports",
  //   icon: IoReceiptOutline,
  //   subMenu: [
  //     {
  //       name: "Employee Reports",
  //       icon: FiUsers,
  //       path: "/Reports/EmpReports",
  //     },
  //     {
  //       name: "Truck Reports",
  //       icon: FaTruckMoving,
  //       path: "/Reports/TruckReports",
  //     },
  //     {
  //       name: "Billing Reports",
  //       icon: FaReceipt,
  //       path: "/Reports/BillingReports",
  //     },
  //     {
  //       name: "Renewal Reports",
  //       icon: FiRepeat,
  //       path: "/Reports/RenewalReports",
  //     },
  //     {
  //       name: "Inventory Reports",
  //       icon: MdOutlineInventory2,
  //       path: "/Reports/InventoryReports",
  //     },
  //     {
  //       name: "Payroll Report",
  //       icon: FaFileInvoice,
  //       path: "/Reports/PayrollReport",
  //     },
  //   ],
  // },
  // { name: "Control Panel", icon: FiSettings, path: "/control-panel" },
];

// Define the shake animation
const shake = `
  @keyframes shake {
    0% { transform: translate(1px, 1px) rotate(0deg); }
    10% { transform: translate(-1px, -2px) rotate(-1deg); }
    20% { transform: translate(-3px, 0px) rotate(1deg); }
    30% { transform: translate(3px, 2px) rotate(0deg); }
    40% { transform: translate(1px, -1px) rotate(1deg); }
    50% { transform: translate(-1px, 2px) rotate(-1deg); }
    60% { transform: translate(-3px, 1px) rotate(0deg); }
    70% { transform: translate(3px, 1px) rotate(-1deg); }
    80% { transform: translate(-1px, -1px) rotate(1deg); }
    90% { transform: translate(1px, 2px) rotate(0deg); }
    100% { transform: translate(1px, -2px) rotate(-1deg); }
  }
`;

// Define bell notification animation
const bellRing = keyframes`
  0% { transform: rotate(0); }
  10% { transform: rotate(15deg); }
  20% { transform: rotate(-15deg); }
  30% { transform: rotate(10deg); }
  40% { transform: rotate(-10deg); }
  50% { transform: rotate(5deg); }
  60% { transform: rotate(-5deg); }
  70% { transform: rotate(0); }
  100% { transform: rotate(0); }
`;

// Animation for the bell when there are birthdays
const bellAnimation = `${bellRing} 2s infinite`;

// Define confetti animation
const confettiAnimation = keyframes`
  0% { transform: translateY(0) rotate(0deg); opacity: 1; }
  100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
`;

// Define floating animation
const floatingAnimation = keyframes`
  0% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
  100% { transform: translateY(0px); }
`;

// Define pulse animation
const pulseAnimation = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
`;

// Define slide in animation for birthday banner
const slideInAnimation = keyframes`
  0% { transform: translateY(-100%); }
  100% { transform: translateY(0); }
`;

// Function to generate random confetti styles
const getRandomConfettiStyles = (index) => {
  const colors = [
    "#FF0000",
    "#00FF00",
    "#0000FF",
    "#FFFF00",
    "#FF00FF",
    "#00FFFF",
  ];
  const size = Math.random() * (10 - 5) + 5;
  const left = Math.random() * 100;
  const animationDuration = Math.random() * (5 - 2) + 2;
  const delay = Math.random() * 0.5;

  return {
    position: "absolute",
    top: "-20px",
    left: `${left}%`,
    width: `${size}px`,
    height: `${size}px`,
    backgroundColor: colors[index % colors.length],
    borderRadius: "50%",
    animation: `${confettiAnimation} ${animationDuration}s ease-out ${delay}s infinite`,
  };
};

// Navigation Item Component
const NavItem = ({
  icon,
  children,
  isActive,
  onClick,
  hasSubMenu,
  isExpanded,
  isDisabled,
  ...rest
}) => (
  <Box
    as="a"
    href="#"
    style={{ textDecoration: "none" }}
    _focus={{ boxShadow: "none" }}
    onClick={(e) => {
      e.preventDefault(); // Prevent default anchor behavior
      if (onClick) onClick();
    }}
  >
    <Flex
      align="center"
      p="1.5"
      mx="3"
      borderRadius="lg"
      role="group"
      cursor={isDisabled ? "not-allowed" : "pointer"}
      bg={isActive ? "#550000" : "transparent"}
      color={isDisabled ? "gray.400" : isActive ? "white" : "gray.600"}
      opacity={isDisabled ? 0.6 : 1}
      _hover={{
        bg: isDisabled ? "transparent" : isActive ? "#550000" : "#55000050",
        color: isDisabled ? "gray.400" : "white",
      }}
      transition="background-color 0.2s ease"
      {...rest}
    >
      {icon && (
        <Icon
          mr="2"
          fontSize="16px"
          color={isDisabled ? "gray.400" : isActive ? "white" : "gray.600"}
          _groupHover={{
            color: isDisabled ? "gray.400" : "white",
          }}
          as={icon}
        />
      )}
      <Text
        fontSize="xs"
        fontWeight="medium"
        fontFamily="'Poppins', sans-serif"
        color={isDisabled ? "gray.400" : isActive ? "white" : "gray.600"}
        _groupHover={{
          color: isDisabled ? "gray.400" : "white",
        }}
      >
        {children}
      </Text>
      {hasSubMenu && (
        <Icon
          as={isExpanded ? FiChevronDown : FiChevronRight}
          ml="auto"
          fontSize="14px"
          color={isDisabled ? "gray.400" : isActive ? "white" : "gray.600"}
          transition="transform 0.2s"
          transform={isExpanded ? "rotate(0deg)" : "rotate(0deg)"}
        />
      )}
    </Flex>
  </Box>
);

// Sidebar Content Component
const SidebarContent = ({ onNavigate, currentComponent, workLevel }) => {
  const [expandedMenu, setExpandedMenu] = useState(null);

  // Determine accessible modules for the current user's work level
  const accessibleModules = roleAccess[workLevel] || [];

  // Filter the linkItems based on accessible modules
  const filteredLinkItems = linkItems.filter((link) =>
    accessibleModules.includes(link.name)
  );

  // Check if a specific path is active
  const isActive = (path) => {
    if (!path) return false;
    if (currentComponent === path) return true;
    const menuItem = linkItems.find((item) =>
      item.subMenu?.some((subItem) => subItem.path === currentComponent)
    );
    if (menuItem && menuItem.name === path) return true;
    return false;
  };

  const toggleSubMenu = (name) => {
    setExpandedMenu(expandedMenu === name ? null : name);
  };

  return (
    <Box
      transition="3s ease"
      bg={useColorModeValue("white", "gray.900")}
      borderRight="1px"
      borderRightColor={useColorModeValue("gray.200", "gray.700")}
      w={52}
      pos="fixed"
      h="100vh"
      overflow="auto"
      css={{
        "&::-webkit-scrollbar": {
          width: "4px",
        },
        "&::-webkit-scrollbar-track": {
          width: "6px",
        },
        "&::-webkit-scrollbar-thumb": {
          background: "gray.300",
          borderRadius: "24px",
        },
      }}
    >
      <Flex h="16" alignItems="center" mx="6" justifyContent="space-between">
        <Avatar
          width="60px"
          height="60px"
          src="/AVATAR.png"
          name="User Avatar"
          marginLeft="40px"
          _hover={{
            animation: "shake 0.5s infinite",
            cursor: "pointer",
          }}
          css={{
            [shake]: {},
          }}
        />
      </Flex>
      <Box h="45" />
      {filteredLinkItems.map((link) => (
        <React.Fragment key={link.name}>
          <NavItem
            icon={link.icon}
            isActive={
              isActive(link.path) ||
              (link.subMenu &&
                link.subMenu.some((sub) => isActive(sub.path))) ||
              (link.subMenu && expandedMenu === link.name)
            }
            onClick={() => {
              if (link.subMenu) {
                toggleSubMenu(link.name);
              } else if (link.path) {
                onNavigate(link.path);
              }
            }}
            mb="3"
            hasSubMenu={!!link.subMenu}
            isExpanded={expandedMenu === link.name}
          >
            {link.name}
          </NavItem>
          {expandedMenu === link.name &&
            link.subMenu?.map((subItem) => (
              <NavItem
                key={subItem.name}
                icon={subItem.icon}
                isActive={isActive(subItem.path)}
                onClick={() => onNavigate(subItem.path)}
                pl="8"
                mb="2"
              >
                {subItem.name}
              </NavItem>
            ))}
        </React.Fragment>
      ))}
    </Box>
  );
};

// Desktop Header Component
const DesktopHeader = ({ handleSignOut }) => {
  const [user, setUser] = useState(null);
  const [birthdays, setBirthdays] = useState([]);
  const [isBirthdaysLoading, setIsBirthdaysLoading] = useState(false);
  const [todayBirthdays, setTodayBirthdays] = useState([]);
  const {
    isOpen: isBirthdayMenuOpen,
    onOpen: onBirthdayMenuOpen,
    onClose: onBirthdayMenuClose,
  } = useDisclosure();
  // const {
  //   isOpen: isChatDrawerOpen,
  //   onOpen: onChatDrawerOpen,
  //   onClose: onChatDrawerClose,
  // } = useDisclosure();
  // const [unreadMessages, setUnreadMessages] = useState(0);
  const toast = useToast();
  const audioRef = useRef(null);
  const toastIdRef = useRef(null);

  // const handleChatDrawerOpen = () => {
  //   onChatDrawerOpen();
  //   if (window.chatSocket) {
  //     window.chatSocket.emit("refreshConversations");
  //   }
  // };

  // Function to play birthday song
  const playBirthdaySong = useCallback(() => {
    if (audioRef.current) {
      // Reset the audio to the beginning
      audioRef.current.currentTime = 0;

      // Play with error handling
      const playPromise = audioRef.current.play();

      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.error("Error playing audio:", err);
        });
      }
    }
  }, []);

  // Function to stop birthday song
  const stopBirthdaySong = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, []);

  // Function to show birthday toast
  const showBirthdayToast = useCallback(() => {
    if (birthdays.length === 0) return;

    // Close any existing toasts first
    if (toastIdRef.current) {
      toast.close(toastIdRef.current);
      toastIdRef.current = null;
    }

    // Always try to play audio for today's birthdays
    if (birthdays.length > 0 && audioRef.current) {
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.error("Error playing audio:", err);
          console.log(
            "Audio playback may have been blocked by the browser. Interacting with the page (e.g., clicking the bell) might enable it."
          );
        });
      }
    }

    toastIdRef.current = toast({
      position: "top",
      duration: null, // Keep birthday toasts until dismissed
      isClosable: true,
      containerStyle: {
        maxWidth: "100%",
        width: "auto",
        display: "flex",
        justifyContent: "center",
      },
      render: ({ onClose }) => (
        <Box
          p={8}
          bg={useColorModeValue("white", "gray.800")}
          color={useColorModeValue("gray.800", "white")}
          borderRadius="2xl"
          boxShadow="2xl"
          maxW="md"
          w="100%"
          textAlign="center"
          position="relative"
          overflow="hidden"
          animation={`${pulseAnimation} 2s infinite`}
        >
          {/* Confetti elements */}
          {birthdays.length > 0 &&
            Array(20)
              .fill(0)
              .map((_, i) => <Box key={i} sx={getRandomConfettiStyles(i)} />)}

          {/* Decorative circles */}
          <Circle
            size="100px"
            position="absolute"
            top="-20px"
            left="-20px"
            bg="red.100"
            opacity="0.3"
          />
          <Circle
            size="80px"
            position="absolute"
            bottom="-10px"
            right="-10px"
            bg="blue.100"
            opacity="0.3"
          />

          <CloseButton
            position="absolute"
            right={3}
            top={3}
            color={useColorModeValue("gray.600", "gray.400")}
            onClick={() => {
              stopBirthdaySong();
              onClose();
              toastIdRef.current = null;
            }}
            _hover={{
              bg: useColorModeValue("gray.100", "gray.700"),
              transform: "scale(1.1)",
            }}
            transition="all 0.2s"
          />

          <VStack spacing={6} position="relative" zIndex="1">
            <Box
              animation={`${floatingAnimation} 3s infinite ease-in-out`}
              transform="translateZ(0)"
            >
              <Text
                fontSize="3xl"
                fontWeight="bold"
                bgGradient="linear(to-r, red.400, pink.500)"
                bgClip="text"
              >
                🎂 WE HAVE A CELEBRATION!!!🎉
              </Text>
            </Box>

            {birthdays.length > 0 ? (
              <>
                <Box
                  bg={useColorModeValue("red.50", "red.900")}
                  p={4}
                  borderRadius="xl"
                  w="100%"
                  animation={`${pulseAnimation} 2s infinite`}
                >
                  <Text fontSize="xl" fontWeight="medium" mb={4}>
                    Happy birthday to our amazing celebrants today! 🎂🎉
                  </Text>
                  {/* List of today's birthday celebrants */}
                  {birthdays.length >= 1 && (
                    <VStack spacing={1} align="stretch" mb={4}>
                      {birthdays.map((emp, idx) => {
                        // Calculate age
                        const birthDate = new Date(emp.Birthdate);
                        const today = new Date();
                        let age = today.getFullYear() - birthDate.getFullYear();
                        const m = today.getMonth() - birthDate.getMonth();
                        if (
                          m < 0 ||
                          (m === 0 && today.getDate() < birthDate.getDate())
                        ) {
                          age--;
                        }
                        return (
                          <HStack
                            key={emp._id}
                            bg={useColorModeValue("red.100", "red.800")}
                            p={2}
                            borderRadius="md"
                          >
                            <Text fontWeight="medium">
                              {emp.firstName} {emp.lastName}{" "}
                              {emp.Nickname && `(${emp.Nickname})`}, {age}
                            </Text>
                          </HStack>
                        );
                      })}
                    </VStack>
                  )}
                </Box>
              </>
            ) : (
              <Box
                bg={useColorModeValue("blue.50", "blue.900")}
                p={4}
                borderRadius="xl"
                w="100%"
              >
                <Text fontSize="xl" mb={4}>
                  No birthdays today!
                </Text>
              </Box>
            )}
          </VStack>
        </Box>
      ),
    });
  }, [birthdays, toast, playBirthdaySong, stopBirthdaySong, useColorModeValue]);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        const storedUser = localStorage.getItem("user");
        if (!storedUser) return;

        const parsedUser = JSON.parse(storedUser);
        if (!parsedUser || !parsedUser.id) return;

        // Setup timeout for the API request
        const source = axios.CancelToken.source();
        const timeout = setTimeout(() => {
          source.cancel("Request timed out");
          console.error(
            "Connection to server timed out. Please check if the backend server is running."
          );

          // Use stored user data as fallback
          try {
            if (storedUser) {
              setUser(JSON.parse(storedUser));
            }
          } catch (e) {
            console.error("Error parsing stored user data", e);
          }
        }, 10000); // 10 seconds timeout

        const response = await axios.get(
          process.env.NEXT_PUBLIC_BACKEND_API + `/api/users/${parsedUser.id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            cancelToken: source.token,
          }
        );

        // Clear timeout since request succeeded
        clearTimeout(timeout);
        setUser(response.data);
      } catch (error) {
        console.error("Error fetching user profile", error);

        // Handle network errors specifically
        if (
          error.message === "Network Error" ||
          error.message === "Request timed out"
        ) {
          console.error(
            "Network Error: Unable to connect to the server. Please check if the backend server is running."
          );
          toast({
            title: "Connection Error",
            description:
              "Unable to connect to the server. Using cached user data.",
            status: "warning",
            duration: 5000,
            isClosable: true,
          });
        }

        // Always try to use stored user data as fallback
        try {
          const storedUser = localStorage.getItem("user");
          if (storedUser) {
            setUser(JSON.parse(storedUser));
          }
        } catch (e) {
          console.error("Error parsing stored user data", e);
        }
      }
    };
    fetchUserProfile();
  }, []);

  // Fetch employee birthdays for the current month
  useEffect(() => {
    const fetchBirthdays = async () => {
      try {
        setIsBirthdaysLoading(true);
        const token = localStorage.getItem("token");
        if (!token) return;

        // Get today's date
        const today = new Date();
        const currentDay = today.getDate();
        const currentMonth = today.getMonth() + 1; // JavaScript months are 0-indexed

        // Get only today's birthdays
        const response = await axios.get(
          process.env.NEXT_PUBLIC_BACKEND_API +
            `/api/employees/birthdays/${currentMonth}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        // Filter to get only today's celebrants
        const todayCelebrants = response.data.filter((emp) => {
          const birthDate = new Date(emp.Birthdate);
          return (
            birthDate.getDate() === currentDay &&
            birthDate.getMonth() === today.getMonth()
          );
        });

        setTodayBirthdays(todayCelebrants);
        setBirthdays(todayCelebrants); // Only store today's birthdays
      } catch (error) {
        // Check if it's an Axios error and if the response status is 401
        if (
          error.isAxiosError &&
          error.response &&
          error.response.status === 401
        ) {
          // The Axios interceptor handles 401s by showing a session expired modal.
          // Log a less alarming message or simply note that it's being handled.
          console.info(
            "fetchBirthdays: 401 Unauthorized. Session expiration should be handled by interceptor."
          );
        } else {
          // For any other errors, log them as critical.
          console.error("Error fetching employee birthdays:", error);
        }
      } finally {
        setIsBirthdaysLoading(false);
      }
    };

    fetchBirthdays();
    // Set up interval to check birthdays every hour
    const intervalId = setInterval(fetchBirthdays, 3600000); // 1 hour

    return () => clearInterval(intervalId);
  }, []);

  // Initialize audio
  useEffect(() => {
    // Create audio element
    audioRef.current = new Audio(
      process.env.NEXT_PUBLIC_BACKEND_API + "/birthday1.mp3"
    );
    audioRef.current.loop = true; // Loop the audio

    // Clean up
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      // Close toast on unmount
      if (toastIdRef.current) {
        toast.close(toastIdRef.current);
        toastIdRef.current = null;
      }
    };
  }, [toast]);

  // Show birthday toast when birthdays are loaded and once per session
  useEffect(() => {
    const hasShownThisSession = localStorage.getItem(
      "birthdayToastShownThisSession"
    );

    if (birthdays.length > 0 && !hasShownThisSession) {
      // Check if there are any birthdays *today*
      const actualTodayBirthdays = birthdays.filter((emp) => {
        const birthDate = new Date(emp.Birthdate);
        const today = new Date();
        return (
          birthDate.getDate() === today.getDate() &&
          birthDate.getMonth() === today.getMonth()
        );
      });

      if (actualTodayBirthdays.length > 0) {
        // Small delay to ensure everything is loaded
        setTimeout(() => {
          showBirthdayToast();
          localStorage.setItem("birthdayToastShownThisSession", "true");
        }, 1000);
      }
    }
  }, [birthdays, showBirthdayToast]);

  // useEffect(() => {
  //   const checkUnreadMessages = async () => {
  //     try {
  //       const token = localStorage.getItem("token");
  //       if (!token) return;

  //       const storedUser = localStorage.getItem("user");
  //       if (!storedUser) return;

  //       const parsedUser = JSON.parse(storedUser);
  //       if (!parsedUser || !parsedUser.id) return;

  //       const response = await axios.get(
  //         process.env.NEXT_PUBLIC_BACKEND_API +
  //           `/api/chats/conversations/${parsedUser.id}`,
  //         {
  //           headers: {
  //             Authorization: `Bearer ${token}`,
  //           },
  //         }
  //       );

  //       const totalUnread = Array.isArray(response.data)
  //         ? response.data.reduce(
  //             (total, conv) => total + (conv.unreadCount || 0),
  //             0
  //           )
  //         : 0;

  //       setUnreadMessages(totalUnread);
  //     } catch (error) {
  //       console.error("Error checking unread messages", error);
  //       setUnreadMessages(0);
  //     }
  //   };

  //   checkUnreadMessages();
  //   const intervalId = setInterval(checkUnreadMessages, 30000);

  //   return () => clearInterval(intervalId);
  // }, []);

  return (
    <>
      <Flex
        px={3}
        height="16"
        alignItems="center"
        bg={useColorModeValue("white", "gray.900")}
        borderBottomWidth="1px"
        borderBottomColor={useColorModeValue("gray.200", "gray.700")}
        justifyContent="flex-end"
        mt={"0"}
        transition="margin-top 0.3s ease"
      >
        <Flex alignItems="center" ml={3}>
          {/* <Tooltip label="Messages">
            <Box position="relative">
              <IconButton
                icon={<FiMessageSquare />}
                variant="ghost"
                fontSize="20px"
                mr={4}
                onClick={handleChatDrawerOpen}
                _hover={{
                  bg: useColorModeValue("gray.100", "gray.700"),
                }}
                aria-label="Chat messages"
              />
              {unreadMessages > 0 && (
                <Box
                  position="absolute"
                  top="0"
                  right="12px"
                  borderRadius="full"
                  bg="blue.500"
                  px={1.5}
                  py={0.5}
                  fontSize="10px"
                  fontWeight="bold"
                  color="white"
                  boxShadow="0 0 0 2px white"
                >
                  {unreadMessages > 9 ? "9+" : unreadMessages}
                </Box>
              )}
            </Box>
          </Tooltip> */}

          {/* Birthday Notification Bell */}
          <Menu isOpen={isBirthdayMenuOpen} onClose={onBirthdayMenuClose}>
            <Tooltip
              label={
                birthdays.length > 0
                  ? `🎂 Today's Birthday: ${birthdays.map((emp) => `${emp.firstName} ${emp.lastName}`).join(", ")}`
                  : "No birthdays today"
              }
            >
              <MenuButton
                as={IconButton}
                icon={<FiBell />}
                variant="ghost"
                color={birthdays.length > 0 ? "#FF0000" : "gray.500"}
                fontSize="20px"
                mr={4}
                isLoading={isBirthdaysLoading}
                _hover={{
                  bg: useColorModeValue("gray.100", "gray.700"),
                }}
                aria-label="Birthday notifications"
                animation={birthdays.length > 0 ? bellAnimation : undefined}
                css={
                  birthdays.length > 0 ? { transformOrigin: "top" } : undefined
                }
                position="relative"
                onClick={() => {
                  // Always attempt to open the menu.
                  // The MenuList will then show "No birthdays today" if that's the case.
                  onBirthdayMenuOpen();

                  if (birthdays.length > 0) {
                    // If there are birthdays and the audio is currently paused (e.g., autoplay was blocked),
                    // this click serves as a user interaction to attempt playing the song.
                    if (audioRef.current && audioRef.current.paused) {
                      playBirthdaySong();
                    }
                    // The toast itself is handled by the useEffect and should appear automatically.
                    // We don't need to call showBirthdayToast() here.
                  }
                }}
              />
            </Tooltip>
            {birthdays.length > 0 && (
              <Box
                position="absolute"
                top="3px"
                right="16px"
                borderRadius="full"
                bg="red.500"
                px={2}
                py={0.5}
                zIndex={1}
                fontSize="10px"
                fontWeight="bold"
                color="white"
                boxShadow="0 0 0 2px white"
                animation={`${pulseAnimation} 1.5s infinite`}
              >
                Today!
              </Box>
            )}
            <MenuList fontSize="xs" maxH="300px" overflow="auto">
              {birthdays.length > 0 ? (
                <>
                  <MenuItem isDisabled fontWeight="bold" bg="red.100">
                    🎂 Today's Birthday Celebrants 🎉
                  </MenuItem>
                  <MenuDivider />
                  {birthdays.map((employee) => (
                    <MenuItem key={employee._id} bg="red.50">
                      <HStack>
                        <Box>
                          <Text fontWeight="bold">
                            {employee.firstName} {employee.lastName}{" "}
                            {employee.Nickname && `(${employee.Nickname})`}
                          </Text>
                          <Text fontSize="2xs" color="gray.600">
                            {/* Calculate age */}
                            {(() => {
                              const birthDate = new Date(employee.Birthdate);
                              const today = new Date();
                              let age =
                                today.getFullYear() - birthDate.getFullYear();
                              const m = today.getMonth() - birthDate.getMonth();
                              if (
                                m < 0 ||
                                (m === 0 &&
                                  today.getDate() < birthDate.getDate())
                              ) {
                                age--;
                              }
                              return `${age} years old`;
                            })()}
                          </Text>
                        </Box>
                        <Badge colorScheme="red" ml="auto">
                          Today!
                        </Badge>
                      </HStack>
                    </MenuItem>
                  ))}
                </>
              ) : (
                <MenuItem>No birthdays today</MenuItem>
              )}
            </MenuList>
          </Menu>

          <Menu>
            <MenuButton py={1} transition="all 0.3s">
              <HStack>
                <Avatar
                  size="sm"
                  src={
                    user?.profileImage
                      ? process.env.NEXT_PUBLIC_BACKEND_API +
                        `/uploads/${user.profileImage}`
                      : "/fallback-profile.jpg"
                  }
                />
                <VStack
                  display="flex"
                  alignItems="flex-start"
                  spacing="0px"
                  ml="2"
                >
                  <Text fontSize="xs">{user?.name || "User"}</Text>
                  <Text fontSize="2xs" color="gray.600">
                    {user?.workLevel || "Admin"}
                  </Text>
                </VStack>
                <Box>
                  <FiChevronDown />
                </Box>
              </HStack>
            </MenuButton>
            <MenuList fontSize="xs">
              <MenuItem>Profile</MenuItem>
              <MenuDivider />
              <MenuItem onClick={handleSignOut}>Sign out</MenuItem>
            </MenuList>
          </Menu>
        </Flex>
      </Flex>

      {/* <Drawer
        isOpen={isChatDrawerOpen}
        placement="right"
        onClose={onChatDrawerClose}
        size="md"
      >
        <DrawerOverlay />
        <DrawerContent>
          <DrawerHeader borderBottomWidth="1px">Messages</DrawerHeader>
          <DrawerBody p={0}>
            <Box
              w="100%"
              h="100%"
              display={isChatDrawerOpen ? "block" : "none"}
            >
              {React.createElement(
                dynamic(() => import("../../components/Chat/userChats"), {
                  ssr: false,
                })
              )}
            </Box>
          </DrawerBody>
        </DrawerContent>
      </Drawer> */}
    </>
  );
};

// Sidebar With Header Component
const SidebarWithHeader = () => {
  const router = useRouter();
  const [currentComponent, setCurrentComponent] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("currentPath") || "/dashboard";
    }
    return "/dashboard";
  });
  const [user, setUser] = useState(null);
  // const [socket, setSocket] = useState(null);
  const toast = useToast();
  const {
    isOpen: isSessionExpiredModalOpen,
    onOpen: onSessionExpiredModalOpen,
    onClose: onSessionExpiredModalClose,
  } = useDisclosure();
  const inactivityTimer = useRef(null);

  // useEffect(() => {
  //   if (!socket) {
  //     const SOCKET_URL =
  //       process.env.NEXT_PUBLIC_BACKEND_API || "http://localhost:5000";
  //     console.log("Initializing global socket connection at:", SOCKET_URL);

  //     const newSocket = io(SOCKET_URL, {
  //       reconnection: true,
  //       reconnectionAttempts: 10,
  //       reconnectionDelay: 500,
  //       reconnectionDelayMax: 5000,
  //       timeout: 500,
  //     });

  //     newSocket.on("connect", () => {
  //       console.log("Global socket connected:", newSocket.id);
  //       const storedUser = localStorage.getItem("user");
  //       if (storedUser) {
  //         try {
  //           const parsedUser = JSON.parse(storedUser);
  //           if (parsedUser && parsedUser.id) {
  //             console.log(
  //               "Global socket: sending addUser on connect:",
  //               parsedUser.id
  //             );
  //             newSocket.emit("addUser", parsedUser.id);
  //           }
  //         } catch (error) {
  //           console.error("Error parsing user from localStorage:", error);
  //         }
  //       }
  //     });

  //     setSocket(newSocket);
  //     window.chatSocket = newSocket;
  //   }

  //   return () => {
  //   };
  // }, [socket]);

  // Heartbeat to keep user status ONLINE
  useEffect(() => {
    const updateUserStatus = async () => {
      try {
        const token = localStorage.getItem("token");
        const storedUser = localStorage.getItem("user");

        if (!token || !storedUser) return;

        const parsedUser = JSON.parse(storedUser);
        if (!parsedUser || !parsedUser.id) return;

        // Update user status to ONLINE and lastActive timestamp
        await axios.put(
          `${process.env.NEXT_PUBLIC_BACKEND_API}/api/users/${parsedUser.id}/status`,
          { status: "ONLINE" },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } catch (error) {
        console.error("Error updating user online status:", error);
      }
    };

    // Initial update
    updateUserStatus();

    // Set up interval to update status regularly
    const statusInterval = setInterval(updateUserStatus, 60000); // Every minute

    return () => clearInterval(statusInterval);
  }, []);

  // Function to handle navigation and persist the path
  const handleNavigation = useCallback((path) => {
    setCurrentComponent(path);
    if (typeof window !== "undefined") {
      localStorage.setItem("currentPath", path);
    }
  }, []);

  // Memoized handleSignOut
  const handleSignOut = useCallback(() => {
    // Get user ID and token before removing from localStorage
    const token = localStorage.getItem("token");
    let userId = null;
    try {
      const userData = JSON.parse(localStorage.getItem("user") || "{}");
      userId = userData.id;
    } catch (e) {
      console.error("Error parsing user data during logout:", e);
    }

    // Update user status to OFFLINE if we have both userId and token
    if (userId && token) {
      // Make API call to update status
      axios
        .put(
          `${process.env.NEXT_PUBLIC_BACKEND_API}/api/users/${userId}/status`,
          { status: "OFFLINE" },
          { headers: { Authorization: `Bearer ${token}` } }
        )
        .catch((err) => {
          console.error("Failed to update user status to offline:", err);
        });
    }

    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("currentPath");
    localStorage.removeItem("birthdayToastShownThisSession"); // Clear the session flag
    if (inactivityTimer.current) {
      // Clear timer on sign out
      clearTimeout(inactivityTimer.current);
    }
    router.push("/");
  }, [router]);

  // Function to reset the inactivity timer - Memoized with useCallback
  const resetTimer = useCallback(() => {
    if (inactivityTimer.current) {
      clearTimeout(inactivityTimer.current);
    }
    // Set a new timer for 10 minutes (600000 ms)
    inactivityTimer.current = setTimeout(() => {
      // Only open modal if it's not already open and user is still logged in
      if (!isSessionExpiredModalOpen && localStorage.getItem("token")) {
        console.log(
          "Inactivity timeout reached. Opening session expired modal."
        );
        onSessionExpiredModalOpen();
        // Sign out is handled by the modal's Ok button
      }
    }, 600000); // 10 minutes
  }, [isSessionExpiredModalOpen, onSessionExpiredModalOpen]);

  // useEffect for fetching user profile (Adopted from BSidebarWithHeader.js L1397-L1468)
  useEffect(() => {
    // console.log("SOSidebar: fetchUserProfile effect triggered"); // Optional: for debugging
    const fetchUserProfile = async () => {
      let userToSet = null; // Default to null
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          // console.log("SOSidebar: No token found");
          router.push("/"); // Redirect if no token, similar to scheduler-officer.js
          return;
        }

        // Attempt to get user from localStorage first as a baseline
        try {
          const storedUserStr = localStorage.getItem("user");
          if (storedUserStr) {
            const parsedStoredUser = JSON.parse(storedUserStr);
            if (
              parsedStoredUser &&
              parsedStoredUser.id &&
              parsedStoredUser.workLevel
            ) {
              userToSet = parsedStoredUser; // Tentatively set from localStorage
              // console.log(
              //   "SOSidebar: User initially set from localStorage:",
              //   userToSet
              // );
            }
          }
        } catch (e) {
          console.error(
            "SOSidebar: Error parsing initial user from localStorage:",
            e
          );
        }

        // Now, fetch from API to get the most up-to-date info or confirm
        const userIdForApi = userToSet?.id;

        if (userIdForApi) {
          // console.log("SOSidebar: Fetching from API for user ID:", userIdForApi);
          const response = await axios.get(
            `${process.env.NEXT_PUBLIC_BACKEND_API}/api/users/${userIdForApi}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          userToSet = response.data; // API data is the source of truth
          // console.log("SOSidebar: User data from API:", userToSet);
          // Update localStorage with fresh data from API
          if (userToSet && userToSet.id) {
            localStorage.setItem("user", JSON.stringify(userToSet));
          }
        } else if (token && !userIdForApi) {
          // BSidebar had `else if (token)`
          // If no user ID from local storage but token exists.
          console.warn(
            "SOSidebar: Token exists but no user ID from localStorage to fetch API."
          );
          // This scenario might mean the user object in localStorage is corrupted or missing an id.
          // Redirecting to login might be safer if user identity is crucial and cannot be established.
          // For now, behavior matches BSidebar which proceeds with potentially null userToSet.
        }
      } catch (error) {
        console.error("SOSidebar: Error fetching user profile API:", error);
        // console.log(
        //   "SOSidebar: API fetch error. Current userToSet (from localStorage or null):",
        //   userToSet
        // );
        // Toast for network errors, but not for 401s (handled by interceptor)
        if (
          error.message === "Network Error" ||
          error.message === "Request timed out" ||
          (error.response && error.response.status !== 401)
        ) {
          toast({
            title: "Connection Error",
            description:
              "Unable to fetch latest user details. Displaying cached data if available.",
            status: "warning",
            duration: 5000,
            isClosable: true,
          });
        }
      } finally {
        setUser(userToSet);
        // console.log("SOSidebar: Final user state set:", userToSet);
      }
    };

    fetchUserProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, toast]); // BSidebar uses [], but it also calls router.push without listing it.
  // If router.push is called, router should be a dependency.
  // Toast is also used. Let's keep these for now.
  // If this still causes issues, we can try an empty array []
  // but ensure router.push is handled correctly if moved outside or refactored.

  // --- Inactivity Timer Logic ---
  // Memoized handler for activity
  const handleActivity = useCallback(() => {
    resetTimer();
  }, [resetTimer]);

  useEffect(() => {
    const events = ["mousemove", "keydown", "click", "scroll"];

    // Attach listeners using the memoized handler
    events.forEach((event) => window.addEventListener(event, handleActivity));

    // Initial timer start
    resetTimer(); // Start the timer on mount

    // Cleanup function
    return () => {
      events.forEach((event) =>
        window.removeEventListener(event, handleActivity)
      );
      if (inactivityTimer.current) {
        clearTimeout(inactivityTimer.current);
      }
    };
  }, [handleActivity, resetTimer]); // Use memoized functions as dependencies

  // Handle storage changes (for cross-tab communication)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === "token" && !e.newValue) {
        // Token was removed in another tab
        router.push("/");
      }
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [router]); // Keep existing dependency

  // Handle visibility change (when tab becomes active)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        // checkAuth(); // Call memoized checkAuth
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [router]); // Use memoized checkAuth dependency

  // Setup Axios interceptor for 401 errors
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response, // Pass through successful responses
      (error) => {
        if (error.response && error.response.status === 401) {
          // Check if the modal is not already open to avoid multiple triggers
          if (!isSessionExpiredModalOpen) {
            // Clear inactivity timer if a 401 occurs (likely token expired anyway)
            if (inactivityTimer.current) {
              clearTimeout(inactivityTimer.current);
            }
            console.log(
              "Axios interceptor caught 401. Opening session expired modal."
            );
            onSessionExpiredModalOpen(); // Open the session expired modal
          }
        }
        return Promise.reject(error); // Reject the promise for other error handling
      }
    );

    // Cleanup function to remove the interceptor when the component unmounts
    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, [onSessionExpiredModalOpen, isSessionExpiredModalOpen]); // Removed handleSignOut dependency as it's called from modal

  // Update URL whenever component changes
  useEffect(() => {
    if (typeof window !== "undefined" && currentComponent) {
      window.history.pushState(null, "", currentComponent);
    }
  }, [currentComponent]);

  // Check auth before rendering content
  if (typeof window !== "undefined" && !localStorage.getItem("token")) {
    return null;
  }

  // Function to render the current component
  const renderComponent = () => {
    switch (currentComponent) {
      case "/dashboard":
        return <SODashboard />;
      case "/SOdelivery/SOscheduler":
        return <Scheduler />;
      case "/SOdelivery/SOtrips":
        return <Trips />;

      case "/SOvehicle":
        return <Vehicle />;

      case "/SOcustomer/SOcompany":
        return <Company />;

      default:
        return <SODashboard />;
    }
  };

  return (
    <Box
      minH="100vh"
      bg={useColorModeValue("white", "gray.900")}
      overflow="hidden"
    >
      {user && user.workLevel ? (
        <SidebarContent
          onNavigate={handleNavigation}
          currentComponent={currentComponent}
          workLevel={user.workLevel}
        />
      ) : (
        // Consistent Placeholder for Sidebar while user data is loading
        <Box
          w={52} // Same width as SidebarContent
          pos="fixed"
          h="100vh"
          bg={useColorModeValue("white", "gray.900")}
          borderRight="1px"
          borderRightColor={useColorModeValue("gray.200", "gray.700")}
          // This box acts as a placeholder for the sidebar
        />
      )}
      <DesktopHeader handleSignOut={handleSignOut} />
      <Box ml={52} p="3" h="calc(100vh - 64px)" overflow="auto">
        {renderComponent()}
      </Box>

      {/* Session Expired Modal */}
      <Modal
        isOpen={isSessionExpiredModalOpen}
        onClose={() => {
          /* Prevent closing */
        }}
        isCentered
        closeOnOverlayClick={false}
        closeOnEsc={false}
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Session Expired</ModalHeader>
          <ModalBody>
            {/* Changed message slightly to cover both inactivity and other session expirations */}
            Your session has expired due to inactivity or an authentication
            issue. Please log in again.
          </ModalBody>
          <ModalFooter>
            <Button
              colorScheme="red"
              onClick={() => {
                // Update user status to OFFLINE before signing out
                const token = localStorage.getItem("token");
                try {
                  const userData = JSON.parse(
                    localStorage.getItem("user") || "{}"
                  );
                  const userId = userData.id;

                  if (userId && token) {
                    axios
                      .put(
                        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/users/${userId}/status`,
                        { status: "OFFLINE" },
                        { headers: { Authorization: `Bearer ${token}` } }
                      )
                      .catch((err) => {
                        console.error(
                          "Failed to update user status on session expiry:",
                          err
                        );
                      });
                  }
                } catch (e) {
                  console.error(
                    "Error parsing user data on session expiry:",
                    e
                  );
                }

                handleSignOut(); // Call sign out when OK is clicked
                onSessionExpiredModalClose(); // Close the modal manually
              }}
            >
              Log Out
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default SidebarWithHeader;
