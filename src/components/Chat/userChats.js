import React, { useState, useEffect, useRef, useCallback, memo } from "react";
import {
  Box,
  Flex,
  Text,
  Input,
  Button,
  VStack,
  HStack,
  Avatar,
  Divider,
  Badge,
  InputGroup,
  InputRightElement,
  IconButton,
  useColorModeValue,
  Spinner,
  useToast,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  Icon,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Tooltip,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  Progress,
  useDisclosure,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverBody,
  PopoverArrow,
  Image,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  InputLeftElement,
  Spacer, // Import Spacer
  SkeletonCircle, // Added for loading skeleton
  SkeletonText, // Added for loading skeleton
} from "@chakra-ui/react";
import {
  FiSend,
  FiSearch,
  FiMessageSquare,
  FiChevronDown,
  FiUsers,
  FiPaperclip,
  FiDownload,
  FiMoreVertical,
  FiTrash2,
  FiFile,
  FiX,
  FiSmile,
  FiCheck,
  FiThumbsUp,
  FiHeart,
  FiChevronUp,
} from "react-icons/fi";
import axios from "axios";
import io from "socket.io-client";
import EmojiPicker from "emoji-picker-react";

// Define MessageItem component here for clarity or in a separate file
const ChatMessageItem = memo(function ChatMessageItem({
  msg,
  isCurrentUser,
  currentChat, // Needed for avatar of the other user
  loggedInUser, // Renamed from 'user' prop to avoid confusion with 'user' in map
  formatTime,
  formatDate,
  highlightMatches,
  formatMessageWithLargeEmojis,
  chatSearchQuery,
  chatSearchResults,
  handleOpenImageViewer,
  handleFileDownload,
  handleReaction,
  activeReactionMessageId,
  setActiveReactionMessageId,
  availableReactions,
  handleDeleteMessage,
  // Add any other necessary props like useColorModeValue if not accessible globally
}) {
  const { isOpen, onOpen, onClose } = useDisclosure(); // For individual message menus if needed, or use a global one

  // Note: useColorModeValue needs to be called from a component or hook,
  // so if this component is truly standalone, it might need it passed or re-imported.
  // For simplicity, assuming it's available or we pass specific color values.
  // Or, we can pass useColorModeValue as a prop if this component is in a separate file.
  const messageBgColor = isCurrentUser
    ? useColorModeValue("#143D60", "#143D60")
    : useColorModeValue("white", "gray.700");
  const messageTextColor = isCurrentUser ? "white" : "black";
  const reactionButtonColorScheme = isCurrentUser ? "whiteAlpha" : "gray";

  return (
    <Flex
      justify={isCurrentUser ? "flex-end" : "flex-start"}
      mb={2}
      alignItems="flex-end"
    >
      {!isCurrentUser && (
        <Avatar
          size="sm"
          name={currentChat?.name}
          src={
            currentChat?.profileImage
              ? `${process.env.NEXT_PUBLIC_BACKEND_API}/uploads/${currentChat.profileImage}`
              : undefined
          }
          mr={2}
        />
      )}

      <Box
        bg={messageBgColor}
        color={messageTextColor}
        px={4}
        py={3}
        borderRadius={
          isCurrentUser ? "20px 20px 5px 20px" : "5px 20px 20px 20px"
        }
        maxW="75%"
        position="relative"
        boxShadow="md"
        transition="all 0.2s ease-in-out"
      >
        {/* Message context menu for own messages */}
        {isCurrentUser && !msg.isDeleted && (
          <Box
            position="absolute"
            top="50%"
            right="2px"
            transform="translateY(-50%)"
            zIndex={1}
          >
            <Menu>
              <MenuButton
                as={IconButton}
                icon={
                  <FiMoreVertical
                    color={useColorModeValue("whiteAlpha.900", "white")}
                  />
                }
                variant="ghost"
                size="xs"
                borderRadius="full"
                colorScheme="whiteAlpha"
                _hover={{
                  bg: useColorModeValue("whiteAlpha.500", "whiteAlpha.400"),
                }}
                _active={{
                  bg: useColorModeValue("whiteAlpha.600", "whiteAlpha.500"),
                }}
              />
              <MenuList
                bg={useColorModeValue("white", "gray.700")}
                borderColor={useColorModeValue("gray.200", "gray.600")}
              >
                <MenuItem
                  icon={<FiTrash2 />}
                  onClick={() => handleDeleteMessage(msg._id)}
                  color="red.500"
                  _hover={{
                    bg: useColorModeValue("red.50", "red.800"),
                    color: useColorModeValue("red.600", "red.100"),
                  }}
                >
                  Unsend
                </MenuItem>
              </MenuList>
            </Menu>
          </Box>
        )}

        {/* Message text - with search highlighting */}
        <Text
          fontSize="sm"
          fontStyle={msg.isDeleted ? "italic" : "normal"}
          color={
            msg.isDeleted
              ? isCurrentUser
                ? useColorModeValue("whiteAlpha.700", "gray.300") // Adjusted for better visibility on maroon
                : useColorModeValue("gray.500", "gray.400")
              : undefined
          }
        >
          {chatSearchQuery.trim() !== "" &&
          chatSearchResults.find((r) => r.messageId === msg._id)
            ? highlightMatches(msg.message, chatSearchQuery)
            : formatMessageWithLargeEmojis(msg.message)}
        </Text>

        {/* File attachment */}
        {msg.hasAttachment && msg.fileAttachment && !msg.isDeleted && (
          <Box
            mt={2}
            p={1}
            borderRadius="md"
            bg={isCurrentUser ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)"}
          >
            {msg.fileAttachment.fileType &&
            msg.fileAttachment.fileType.startsWith("image/") ? (
              <Box position="relative" borderRadius="md" overflow="hidden">
                <Image
                  src={`${process.env.NEXT_PUBLIC_BACKEND_API}${msg.fileAttachment.path}`}
                  alt={msg.fileAttachment.originalName || "Image attachment"}
                  maxW="250px"
                  maxH="250px"
                  borderRadius="md"
                  objectFit="cover"
                  cursor="pointer"
                  onClick={() =>
                    handleOpenImageViewer(
                      `${process.env.NEXT_PUBLIC_BACKEND_API}${msg.fileAttachment.path}`
                    )
                  }
                />
              </Box>
            ) : (
              <HStack spacing={2} align="center">
                <Icon as={FiFile} />
                <Text fontSize="xs" flex={1} isTruncated>
                  {msg.fileAttachment.originalName || "Attachment"}
                </Text>
                <Tooltip label="Download">
                  <IconButton
                    icon={<FiDownload />}
                    size="xs"
                    variant="ghost"
                    onClick={() =>
                      handleFileDownload(
                        msg.fileAttachment.filename,
                        msg.fileAttachment.originalName
                      )
                    }
                    aria-label="Download file"
                  />
                </Tooltip>
              </HStack>
            )}
          </Box>
        )}

        {/* Display Reactions */}
        {msg.reactions && msg.reactions.length > 0 && (
          <HStack spacing={1} mt={1} flexWrap="wrap">
            {msg.reactions.map((reaction, rIndex) => (
              <Badge
                key={rIndex}
                px={1.5}
                py={0.5}
                borderRadius="full"
                variant="solid"
                bg={useColorModeValue("gray.200", "gray.600")}
                fontSize="xs"
                cursor="default"
              >
                {reaction.emoji}
              </Badge>
            ))}
          </HStack>
        )}

        {/* Message status indicators & Reaction Button */}
        <HStack
          spacing={1}
          justifyContent="flex-end"
          mt={msg.reactions && msg.reactions.length > 0 ? 1 : 2} // Adjust margin if reactions are present
        >
          {!msg.isDeleted && (
            <Popover
              placement="top"
              isOpen={activeReactionMessageId === msg._id}
              onClose={() => setActiveReactionMessageId(null)}
            >
              <PopoverTrigger>
                <IconButton
                  icon={<FiSmile />}
                  size="xs"
                  variant="ghost"
                  colorScheme={reactionButtonColorScheme}
                  aria-label="React to message"
                  mr={1}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveReactionMessageId(
                      activeReactionMessageId === msg._id ? null : msg._id
                    );
                  }}
                />
              </PopoverTrigger>
              <PopoverContent width="auto" p={1} borderRadius="md">
                <PopoverArrow />
                <PopoverBody>
                  <HStack spacing={1}>
                    {availableReactions.map((emoji) => {
                      const isAlreadyReacted = msg.reactions?.some(
                        (r) =>
                          r.userId === loggedInUser?.id && r.emoji === emoji
                      );
                      return (
                        <Button
                          key={emoji}
                          size="xs"
                          variant={isAlreadyReacted ? "solid" : "ghost"}
                          colorScheme={isAlreadyReacted ? "blue" : "gray"}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReaction(msg._id, emoji);
                            setActiveReactionMessageId(null);
                          }}
                          p={1}
                        >
                          <Text fontSize="md">{emoji}</Text>
                        </Button>
                      );
                    })}
                  </HStack>
                </PopoverBody>
              </PopoverContent>
            </Popover>
          )}

          {msg.hasAttachment &&
            msg.fileAttachment &&
            !msg.isDeleted &&
            msg.fileAttachment.fileType?.startsWith("image/") && (
              <Tooltip label="Download image">
                <IconButton
                  icon={<FiDownload />}
                  size="xs"
                  variant="subtle"
                  colorScheme={reactionButtonColorScheme}
                  aria-label="Download image"
                  onClick={() =>
                    handleFileDownload(
                      msg.fileAttachment.filename,
                      msg.fileAttachment.originalName
                    )
                  }
                  mr={1}
                />
              </Tooltip>
            )}
          <Text
            fontSize="2xs"
            color={
              isCurrentUser
                ? useColorModeValue("whiteAlpha.800", "gray.200") // Adjusted for better visibility
                : useColorModeValue("gray.500", "gray.400")
            }
          >
            {formatTime(msg.createdAt)}
          </Text>

          {isCurrentUser &&
            !msg.isDeleted && ( // Don't show status for deleted messages
              <>
                {msg.isSending && (
                  <Text
                    fontSize="2xs"
                    color={useColorModeValue("whiteAlpha.800", "gray.200")}
                  >
                    • sending...
                  </Text>
                )}
                {msg.isSent && !msg.isRead && !msg.isSending && (
                  <Text
                    fontSize="2xs"
                    color={useColorModeValue("whiteAlpha.800", "gray.200")}
                  >
                    • sent
                  </Text>
                )}
                {msg.isRead && (
                  <Text
                    fontSize="2xs"
                    color={useColorModeValue("whiteAlpha.800", "gray.200")}
                  >
                    • seen
                  </Text>
                )}
                {msg.isError && (
                  <Text fontSize="2xs" color="red.300">
                    • failed
                  </Text>
                )}
              </>
            )}
        </HStack>
      </Box>

      {isCurrentUser && (
        <Avatar
          size="sm"
          name={loggedInUser?.name}
          src={
            loggedInUser?.profileImage
              ? `${process.env.NEXT_PUBLIC_BACKEND_API}/uploads/${loggedInUser.profileImage}`
              : undefined
          }
          ml={2}
        />
      )}
    </Flex>
  );
});

// Create an optimized input component that only re-renders when necessary
const OptimizedMessageInput = memo(
  ({ value, onChange, placeholder, isDisabled, onKeyDown }) => {
    const inputRef = useRef(null);

    // Use uncontrolled input with manual value synchronization for maximum performance
    useEffect(() => {
      if (inputRef.current && inputRef.current.value !== value) {
        inputRef.current.value = value;
      }
    }, [value]);

    // Handle input change without re-rendering the component
    const handleChange = useCallback(
      (e) => {
        onChange(e.target.value);
      },
      [onChange]
    );

    return (
      <Input
        ref={inputRef}
        placeholder={placeholder}
        defaultValue={value}
        onChange={handleChange}
        onKeyDown={onKeyDown}
        borderRadius="full"
        bg="var(--chakra-colors-gray-100)"
        _dark={{ bg: "var(--chakra-colors-gray-700)" }}
        _focus={{
          borderColor: "red.300",
          boxShadow: "0 0 0 1px var(--chakra-colors-red-300)",
        }}
        isDisabled={isDisabled}
      />
    );
  },
  (prevProps, nextProps) => {
    // Always re-render for key events - essential for proper input handling
    if (prevProps.onKeyDown !== nextProps.onKeyDown) return false;

    // Always re-render when disabled state changes
    if (prevProps.isDisabled !== nextProps.isDisabled) return false;

    // Always re-render when placeholder changes
    if (prevProps.placeholder !== nextProps.placeholder) return false;

    // For value changes, only re-render if significant change
    return prevProps.value === nextProps.value;
  }
);

// New component for chat loading skeleton
const ChatLoadingSkeleton = () => {
  const skeletonBubbleColor = useColorModeValue("gray.200", "gray.700");
  const skeletonPlaceholderColorStart = useColorModeValue(
    "gray.100",
    "gray.600"
  );
  const skeletonPlaceholderColorEnd = useColorModeValue("gray.300", "gray.500");

  return (
    <VStack spacing={4} align="stretch" p={4} w="100%">
      {[1, 2, 3, 4].map((i) => (
        <Flex
          key={i}
          justify={i % 2 === 0 ? "flex-end" : "flex-start"}
          w="100%"
          alignItems="flex-end"
        >
          {i % 2 !== 0 && (
            <SkeletonCircle
              size="8"
              mr={2}
              startColor={skeletonPlaceholderColorStart}
              endColor={skeletonPlaceholderColorEnd}
            />
          )}
          <Box
            bg={skeletonBubbleColor}
            borderRadius={
              i % 2 === 0 ? "20px 20px 5px 20px" : "5px 20px 20px 20px"
            }
            p={3}
            maxW="65%"
            minW="30%" // Ensure some minimum width for the bubble
            boxShadow="sm"
          >
            <SkeletonText
              noOfLines={i % 2 === 0 ? 2 : 3} // Vary text lines
              spacing="2"
              skeletonHeight="10px" // explicit height for skeleton lines
              startColor={skeletonPlaceholderColorStart}
              endColor={skeletonPlaceholderColorEnd}
              w={i % 3 === 0 ? "80%" : "100%"} // Vary width of text lines
            />
          </Box>
          {i % 2 === 0 && (
            <SkeletonCircle
              size="8"
              ml={2}
              startColor={skeletonPlaceholderColorStart}
              endColor={skeletonPlaceholderColorEnd}
            />
          )}
        </Flex>
      ))}
    </VStack>
  );
};

// New component for conversation list skeleton
const ConversationListSkeleton = () => {
  const skeletonItemBg = useColorModeValue("white", "gray.800");
  const skeletonPlaceholderColorStart = useColorModeValue(
    "gray.100",
    "gray.700"
  );
  const skeletonPlaceholderColorEnd = useColorModeValue("gray.300", "gray.600");

  return (
    <VStack spacing={2} align="stretch" p={0} w="100%">
      {[1, 2, 3, 4, 5].map((i) => (
        <Box
          key={i}
          p={3}
          bg={skeletonItemBg}
          borderRadius="md"
          boxShadow="sm"
          w="100%"
        >
          <HStack spacing={3} align="center">
            <SkeletonCircle
              size="12" // Corresponds to Avatar size="lg"
              startColor={skeletonPlaceholderColorStart}
              endColor={skeletonPlaceholderColorEnd}
            />
            <VStack align="start" spacing={1} flex={1}>
              <SkeletonText
                noOfLines={1}
                width="60%"
                skeletonHeight="12px"
                startColor={skeletonPlaceholderColorStart}
                endColor={skeletonPlaceholderColorEnd}
              />
              <SkeletonText
                noOfLines={1}
                width="80%"
                skeletonHeight="10px"
                startColor={skeletonPlaceholderColorStart}
                endColor={skeletonPlaceholderColorEnd}
              />
            </VStack>
          </HStack>
        </Box>
      ))}
    </VStack>
  );
};

const UserChats = () => {
  const [conversations, setConversations] = useState([]);
  const [currentChat, setCurrentChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingOlderMessages, setLoadingOlderMessages] = useState(false);
  const [messagePagination, setMessagePagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
    hasMore: true,
  });
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [activeTab, setActiveTab] = useState(0);
  const [pendingMessages, setPendingMessages] = useState([]);
  const [isRemoteUserTyping, setIsRemoteUserTyping] = useState(false); // New state for typing indicator
  const typingTimeoutRef = useRef(null); // Ref for managing typing timeout
  const messagesEndRef = useRef(null);
  const toast = useToast();
  const [showScrollButton, setShowScrollButton] = useState(false);
  const messagesContainerRef = useRef(null);
  const initialScrollDoneForCurrentChat = useRef(false);

  // File upload states
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileUploading, setFileUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);

  // Image Viewer Modal states
  const {
    isOpen: isOpenImageViewer,
    onOpen: onOpenImageViewer,
    onClose: onCloseImageViewer,
  } = useDisclosure();
  const [imageViewerSrc, setImageViewerSrc] = useState("");

  // Message deletion states
  const [deleteMessageId, setDeleteMessageId] = useState(null);
  const {
    isOpen: isDeleteAlertOpen,
    onOpen: onDeleteAlertOpen,
    onClose: onDeleteAlertClose,
  } = useDisclosure();

  // Use a ref to track the input value without triggering re-renders
  const inputValueRef = useRef("");

  // Use a debounced state update for send button enablement
  const [isInputEmpty, setIsInputEmpty] = useState(true);

  // Define available reactions
  const availableReactions = ["👍", "❤️", "😂", "😮", "😢", "🙏"];
  const [activeReactionMessageId, setActiveReactionMessageId] = useState(null); // State for active reaction popover

  // In-chat search states
  const [showChatSearchInput, setShowChatSearchInput] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState("");
  const [chatSearchResults, setChatSearchResults] = useState([]); // Stores { messageId, matchIndex (if multiple matches in one msg) }
  const [currentChatSearchIndex, setCurrentChatSearchIndex] = useState(-1);
  const chatSearchDebounceTimeoutRef = useRef(null); // Ref for debounce timeout

  // Update only the ref during typing, no state updates for better performance
  const handleInputChange = useCallback(
    (value) => {
      inputValueRef.current = value;
      // Only update empty status for button enabling/disabling
      setIsInputEmpty(!value.trim());

      if (socket && currentChat && user) {
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        } else {
          // Emit "typing" only if not already typing (first key press after pause)
          socket.emit("typing", {
            senderId: user.id,
            receiverId: currentChat._id,
          });
        }

        typingTimeoutRef.current = setTimeout(() => {
          socket.emit("stopTyping", {
            senderId: user.id,
            receiverId: currentChat._id,
          });
          typingTimeoutRef.current = null; // Reset ref
        }, 1500); // Consider typing stopped after 1.5 seconds of inactivity
      }
    },
    [socket, currentChat, user]
  );

  // Handle key down for enter key
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        setNewMessage(inputValueRef.current);
        // Use direct call instead of referencing handleSendMessage
        const currentValue = inputValueRef.current.trim();
        if (!currentValue && !selectedFile) return;
        if (!currentChat || !user?.id) return;

        const event = e;
        // This triggers the form submit which will call handleSendMessage
        const form = event.target.closest("form");
        if (form)
          form.dispatchEvent(
            new Event("submit", { cancelable: true, bubbles: true })
          );
      }
    },
    [selectedFile, currentChat, user]
  );

  // Initialize socket connection
  useEffect(() => {
    // Use the global socket if available
    if (window.chatSocket) {
      console.log(
        "Using global socket from window. Status:",
        window.chatSocket.connected ? "Connected" : "Disconnected",
        "ID:",
        window.chatSocket.id
      );

      // If the global socket exists but is disconnected, reconnect
      if (!window.chatSocket.connected) {
        console.log("Global socket is disconnected. Reconnecting...");
        window.chatSocket.connect();
      }

      setSocket(window.chatSocket);
      return;
    }

    // Otherwise create a new socket
    const SOCKET_URL =
      process.env.NEXT_PUBLIC_BACKEND_API || "http://localhost:5000";
    console.log("Creating new socket connection to:", SOCKET_URL);

    // Create a socket with reconnection options
    const newSocket = io(SOCKET_URL, {
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    // Log all socket events for debugging
    const originalEmit = newSocket.emit;
    newSocket.emit = function () {
      console.log(
        "Socket.emit:",
        arguments[0],
        Array.prototype.slice.call(arguments, 1)
      );
      return originalEmit.apply(this, arguments);
    };

    // Handle connect event
    newSocket.on("connect", () => {
      console.log("Socket CONNECTED:", newSocket.id);
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          if (parsedUser && parsedUser.id) {
            console.log("Sending addUser after connect for:", parsedUser.id);
            newSocket.emit("addUser", parsedUser.id);
          }
        } catch (error) {
          console.error("Error parsing user from localStorage:", error);
        }
      }
    });

    // Add more verbose socket event handlers
    newSocket.on("reconnect", (attemptNumber) => {
      console.log(`Socket RECONNECTED after ${attemptNumber} attempts`);
    });

    newSocket.on("reconnect_attempt", (attemptNumber) => {
      console.log(`Socket reconnect attempt #${attemptNumber}`);
    });

    newSocket.on("reconnecting", (attemptNumber) => {
      console.log(`Socket reconnecting, attempt #${attemptNumber}`);
    });

    newSocket.on("reconnect_error", (error) => {
      console.error("Socket reconnect error:", error);
    });

    newSocket.on("reconnect_failed", () => {
      console.error("Socket failed to reconnect after all attempts");
    });

    // Handle connect_error event
    newSocket.on("connect_error", (error) => {
      console.error("Socket CONNECT ERROR:", error.message);
      toast({
        title: "Connection Error",
        description: "Unable to connect to chat server. Retrying...",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    });

    // Handle disconnect event
    newSocket.on("disconnect", (reason) => {
      console.log("Socket DISCONNECTED. Reason:", reason);
      if (reason === "io server disconnect") {
        // the disconnection was initiated by the server, reconnect manually
        console.log("Server disconnected socket. Manual reconnect initiated.");
        newSocket.connect();
      }
    });

    // Save socket globally as well
    window.chatSocket = newSocket;
    setSocket(newSocket);

    // Cleanup function - don't disconnect if it's our own socket
    return () => {
      console.log("Cleaning up local socket event listeners");
      if (newSocket) {
        // Just remove listeners, don't disconnect
        [
          "connect",
          "reconnect",
          "reconnect_attempt",
          "reconnecting",
          "reconnect_error",
          "reconnect_failed",
          "connect_error",
          "disconnect",
        ].forEach((event) => {
          newSocket.off(event);
        });
      }
    };
  }, [toast]);

  // Get current user from localStorage
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    console.log("Stored user from localStorage:", storedUser);
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        console.log("Parsed user:", parsedUser);
        setUser(parsedUser);
      } catch (error) {
        console.error("Error parsing user from localStorage:", error);
        toast({
          title: "Error",
          description: "Could not load user data",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      }
    } else {
      console.log("No user found in localStorage");
      toast({
        title: "Error",
        description: "Please login to access chat",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  }, []);

  // Fetch all conversations for a user
  const fetchConversations = useCallback(
    async (userId) => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        console.log("Fetching conversations for user:", userId);
        if (!token || !userId) return;

        // Use the new conversations endpoint
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_BACKEND_API}/api/chats/conversations/${userId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        console.log("Conversations response:", response.data);

        // Ensure response.data is an array
        const conversationsData = Array.isArray(response.data)
          ? response.data
          : [];

        // Update conversations state
        setConversations(conversationsData);

        // Return the data for possible further processing
        return conversationsData;
      } catch (error) {
        console.error("Error fetching conversations:", error);
        toast({
          title: "Error",
          description: "Could not load conversations",
          status: "error",
          duration: 3000,
          isClosable: true,
        });

        // Return an empty array on error
        setConversations([]);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [toast]
  );

  // Fetch all users for contacts tab
  const fetchAllUsers = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      console.log("Fetching all users");
      console.log("Using token:", token ? "[token present]" : "[no token]");
      if (!token) return;

      // Use the same endpoint as UserTable.js
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/users`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      console.log("All users response:", response.data);
      // Filter out the current user from the list
      setAllUsers(response.data.filter((u) => u._id !== user?.id));
    } catch (error) {
      console.error("Error fetching users:", error);
      toast({
        title: "Error",
        description: "Could not load contacts",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  // Load conversations and select the most recent active one when component mounts
  useEffect(() => {
    if (user?.id) {
      console.log("User ID detected, loading data:", user.id);

      // Fetch conversations and auto-select the most recent one
      const loadConversationsAndSelectRecent = async () => {
        try {
          const token = localStorage.getItem("token");
          if (!token) return;

          // Start loading indicator
          setLoading(true);

          // Fetch conversations
          const response = await axios.get(
            `${process.env.NEXT_PUBLIC_BACKEND_API}/api/chats/conversations/${user.id}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );

          const conversationsData = Array.isArray(response.data)
            ? response.data
            : [];
          console.log("Conversations loaded:", conversationsData.length);

          // Update conversations state
          setConversations(conversationsData);

          /* Remove auto-selection logic
          // Auto-select the most recent conversation if available
          if (conversationsData.length > 0) {
            // Sort conversations by the last message timestamp (most recent first)
            const sortedConversations = [...conversationsData].sort((a, b) => {
              if (!a.lastMessage) return 1;
              if (!b.lastMessage) return -1;
              return (
                new Date(b.lastMessage.createdAt) -
                new Date(a.lastMessage.createdAt)
              );
            });

            // Select the most recent conversation
            const mostRecentConvo = sortedConversations[0];
            console.log(
              "Auto-selecting most recent conversation:",
              mostRecentConvo.user.name
            );
            setCurrentChat(mostRecentConvo.user);

            // Since we're auto-selecting a conversation, switch to conversations tab
            setActiveTab(0);
          }
          */
        } catch (error) {
          console.error("Error loading conversations:", error);
          toast({
            title: "Error",
            description: "Could not load conversations",
            status: "error",
            duration: 3000,
            isClosable: true,
          });
        } finally {
          setLoading(false);
        }
      };

      // Execute the async function
      loadConversationsAndSelectRecent();

      // Also fetch all users for the contacts tab
      fetchAllUsers();
    } else {
      console.log("No user ID available in user object:", user);
      // Try to get user from localStorage directly as a fallback
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          if (parsedUser && parsedUser.id) {
            console.log("Found user ID in localStorage:", parsedUser.id);
            fetchConversations(parsedUser.id).then((conversationsData) => {
              // Auto-select the most recent conversation if available
              /* Remove auto-selection logic here too
              if (conversationsData && conversationsData.length > 0) {
                // Sort conversations by the last message timestamp
                const sortedConversations = [...conversationsData].sort(
                  (a, b) => {
                    if (!a.lastMessage) return 1;
                    if (!b.lastMessage) return -1;
                    return (
                      new Date(b.lastMessage.createdAt) -
                      new Date(a.lastMessage.createdAt)
                    );
                  }
                );

                // Select the most recent conversation
                setCurrentChat(sortedConversations[0].user);
                setActiveTab(0);
              }
              */
            });
            fetchAllUsers();
          }
        } catch (error) {
          console.error("Error parsing user from localStorage:", error);
        }
      }
    }
  }, [user, fetchAllUsers, toast, fetchConversations]);

  // Fetch messages when a conversation is selected
  useEffect(() => {
    const getMessages = async () => {
      if (!currentChat) return;
      setIsRemoteUserTyping(false); // Reset typing indicator when chat changes

      initialScrollDoneForCurrentChat.current = false; // Reset flag when chat changes
      try {
        setLoadingMessages(true);
        setMessages([]); // Clear messages when changing chat
        setMessagePagination({
          page: 1,
          limit: 10,
          total: 0,
          pages: 0,
          hasMore: true,
        });

        const token = localStorage.getItem("token");
        if (!token || !user?.id) return;

        const response = await axios.get(
          process.env.NEXT_PUBLIC_BACKEND_API +
            `/api/chats/messages/${user.id}/${currentChat._id}?page=1&limit=10`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        // Update messages and pagination
        if (response.data.messages) {
          setMessages(response.data.messages);
          setMessagePagination({
            page: response.data.pagination.page,
            limit: response.data.pagination.limit,
            total: response.data.pagination.total,
            pages: response.data.pagination.pages,
            hasMore:
              response.data.pagination.page < response.data.pagination.pages,
          });
        } else {
          // Handle legacy response format (just an array)
          setMessages(response.data);
        }

        // After getting messages, mark them as read
        await markMessagesAsRead();

        // Refresh conversations to update unread counts
        fetchConversations(user.id);

        // Force scroll to bottom after messages load with a slight delay
        setTimeout(() => {
          if (messagesEndRef.current) {
            console.log(
              "Forcing scroll to bottom after loading messages for new chat"
            );
            messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
            initialScrollDoneForCurrentChat.current = true; // Set flag after initial scroll
          }
        }, 100);
      } catch (error) {
        console.error("Error fetching messages:", error);
        toast({
          title: "Error",
          description: "Could not load messages.",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      } finally {
        setLoadingMessages(false);
      }
    };

    getMessages();
  }, [currentChat, user, toast, fetchConversations]);

  // Function to load older messages
  const loadOlderMessages = async () => {
    if (
      !currentChat ||
      !user?.id ||
      loadingOlderMessages ||
      !messagePagination.hasMore
    )
      return;

    try {
      setLoadingOlderMessages(true);
      const token = localStorage.getItem("token");
      if (!token) return;

      const nextPage = messagePagination.page + 1;
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/chats/messages/${user.id}/${currentChat._id}?page=${nextPage}&limit=${messagePagination.limit}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Remember the current scroll position before adding more messages
      const messagesContainer = messagesContainerRef.current;
      const scrollPosition =
        messagesContainer?.scrollHeight - messagesContainer?.scrollTop;

      if (response.data.messages) {
        // Add older messages to the beginning of the array
        setMessages((prevMessages) => [
          ...response.data.messages,
          ...prevMessages,
        ]);
        setMessagePagination({
          page: response.data.pagination.page,
          limit: response.data.pagination.limit,
          total: response.data.pagination.total,
          pages: response.data.pagination.pages,
          hasMore:
            response.data.pagination.page < response.data.pagination.pages,
        });

        // Maintain scroll position after new messages are added
        setTimeout(() => {
          if (messagesContainer) {
            messagesContainer.scrollTop =
              messagesContainer.scrollHeight - scrollPosition;
          }
        }, 50);
      }
    } catch (error) {
      console.error("Error loading older messages:", error);
      toast({
        title: "Error",
        description: "Could not load older messages.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoadingOlderMessages(false);
    }
  };

  // Add scroll event handler for message container to detect when to load older messages
  useEffect(() => {
    const messagesContainer = messagesContainerRef.current;
    if (!messagesContainer) return;

    const handleContainerScroll = () => {
      // First, handle the show/hide scroll to bottom button
      handleScroll();

      // Then, check if we need to load older messages -- REMOVED AUTOMATIC CALL
      // if (messagesContainer.scrollTop < 100 && !loadingOlderMessages && messagePagination.hasMore) {
      //   loadOlderMessages();
      // }
    };

    messagesContainer.addEventListener("scroll", handleContainerScroll);
    return () => {
      messagesContainer.removeEventListener("scroll", handleContainerScroll);
    };
  }, [loadingOlderMessages, messagePagination.hasMore]);

  // Scroll to bottom of messages when messages change
  useEffect(() => {
    if (messages.length > 0 && initialScrollDoneForCurrentChat.current) {
      // Only apply smart scroll after initial scroll
      const messagesContainer = messagesContainerRef.current;
      if (messagesContainer) {
        const scrollThreshold = 100; // Pixels from bottom to consider "at bottom"
        const isScrolledToBottom =
          messagesContainer.scrollHeight - messagesContainer.clientHeight <=
          messagesContainer.scrollTop + scrollThreshold;

        if (isScrolledToBottom) {
          console.log("Messages changed, user at bottom, scrolling to bottom");
          const timer = setTimeout(() => {
            // Make auto-scroll consistent with manual scroll
            if (messagesContainer) {
              messagesContainer.scrollTo({
                top: messagesContainer.scrollHeight,
                behavior: "smooth",
              });
            }
          }, 100); // This 100ms delay might be key
          return () => clearTimeout(timer);
        } else {
          console.log("Messages changed, user NOT at bottom, NOT scrolling");
        }
      }
    }
  }, [messages]);

  // Modified send message function with status indicators
  const handleSendMessage = async (e) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent event bubbling

    // Stop typing indicator when message is sent
    if (socket && currentChat && user && typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      socket.emit("stopTyping", {
        senderId: user.id,
        receiverId: currentChat._id,
      });
      typingTimeoutRef.current = null;
    }

    const currentInputValue = inputValueRef.current.trim();
    setNewMessage(currentInputValue); // Update official state only when sending

    if (!currentInputValue && !selectedFile) return;
    if (!currentChat || !user?.id) return;

    // Prevent double submissions by disabling send button temporarily
    const tempId = `temp-${Date.now()}`;

    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      // Create temporary message object with "sending" status
      const tempMessage = {
        _id: tempId,
        sender: user.id,
        receiver: currentChat._id,
        message: currentInputValue,
        createdAt: new Date().toISOString(),
        isSending: true,
      };

      // Add to messages immediately to show in the UI
      setMessages((prev) => [...prev, tempMessage]);

      // Track pending messages
      setPendingMessages((prev) => [...prev, tempId]);

      const messageData = {
        sender: user.id,
        receiver: currentChat._id,
        message: currentInputValue,
      };

      // Send message to API
      const response = await axios.post(
        process.env.NEXT_PUBLIC_BACKEND_API + "/api/chats/send",
        messageData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Replace temp message with real message from server response
      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === tempId ? { ...response.data, isSent: true } : msg
        )
      );

      // Remove from pending messages
      setPendingMessages((prev) => prev.filter((id) => id !== tempId));

      // Emit socket event for real-time updates
      if (socket) {
        socket.emit("sendMessage", {
          senderId: user.id,
          receiverId: currentChat._id,
          text: currentInputValue,
          messageId: response.data._id, // Send the ID to prevent duplication
        });
      }

      // Clear input
      inputValueRef.current = "";
      setNewMessage("");
      setIsInputEmpty(true);
      // Update the DOM directly for immediate feedback
      if (document.activeElement) {
        const activeInput = document.activeElement;
        if (activeInput.tagName === "INPUT") {
          activeInput.value = "";
        }
      }

      // Refresh conversations list to update last message
      fetchConversations(user.id);
    } catch (error) {
      console.error("Error sending message:", error);

      // Update the message to show error status
      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === tempId ? { ...msg, isSending: false, isError: true } : msg
        )
      );

      // Remove from pending messages
      setPendingMessages((prev) => prev.filter((id) => id !== tempId));

      toast({
        title: "Error",
        description: "Could not send your message.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  // Format timestamp
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // Format date
  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString();
    }
  };

  // Check if user is online - MODIFIED to use user.status primarily
  const isUserOnline = (contact) => {
    if (contact && contact.status === "ONLINE") {
      return true;
    }
    // Fallback or secondary check using the socket-based onlineUsers list
    // This is useful for immediate presence if the DB status hasn't updated yet.
    if (contact && onlineUsers.includes(contact._id)) {
      return true;
    }
    return false;
  };

  // File upload handling
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Maximum file size is 10MB",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setSelectedFile(file);
  };

  const handleFileSend = async () => {
    if (!selectedFile || !currentChat || !user?.id) return;

    try {
      setFileUploading(true);
      setUploadProgress(0);

      const token = localStorage.getItem("token");
      if (!token) return;

      // Create a temporary ID and message for UI feedback
      const tempId = `temp-${Date.now()}`;
      const tempMessage = {
        _id: tempId,
        sender: user.id,
        receiver: currentChat._id,
        message: `Sending file: ${selectedFile.name}...`,
        createdAt: new Date().toISOString(),
        isSending: true,
        hasAttachment: true,
        fileAttachment: {
          originalName: selectedFile.name,
        },
      };

      // Add to messages immediately to show in the UI
      setMessages((prev) => [...prev, tempMessage]);

      // Create FormData and carefully append each field
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("sender", user.id);
      formData.append("receiver", currentChat._id);
      formData.append("message", `Sent a file: ${selectedFile.name}`);

      console.log("Sending file:", {
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        fileType: selectedFile.type,
        sender: user.id,
        receiver: currentChat._id,
      });

      // Use more robust error handling for the request
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/chats/send-file`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            setUploadProgress(percentCompleted);
            console.log(`Upload progress: ${percentCompleted}%`);
          },
          // Add longer timeout for large files
          timeout: 60000,
        }
      );

      console.log("File upload response:", response.data);

      // Update the temporary message with the server response
      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === tempId ? { ...response.data, isSent: true } : msg
        )
      );

      // Emit socket event for real-time updates
      if (socket) {
        socket.emit("sendMessage", {
          senderId: user.id,
          receiverId: currentChat._id,
          text: `Sent a file: ${selectedFile.name}`,
          hasAttachment: true,
          messageId: response.data._id,
        });
      }

      // Clear file selection
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";

      // Refresh conversations list
      fetchConversations(user.id);

      toast({
        title: "File sent",
        description: "Your file has been sent successfully",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error(
        "Error sending file:",
        error.response?.data || error.message || error
      );

      // Update UI to show error status for the message
      if (tempId) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg._id === tempId
              ? {
                  ...msg,
                  isSending: false,
                  isError: true,
                  message: `Failed to send: ${selectedFile.name}. ${error.response?.data?.error || "Server error"}`,
                }
              : msg
          )
        );
      }

      toast({
        title: "Error",
        description: `Could not send your file: ${error.response?.data?.error || error.message || "Server error"}`,
        status: "error",
        duration: 5000,
        isClosable: true,
      });

      // Clear file selection on error too
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } finally {
      setFileUploading(false);
      setUploadProgress(0);
    }
  };

  // File download handling
  const handleFileDownload = async (filename, originalName) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      // Create a download link
      const downloadUrl = `${process.env.NEXT_PUBLIC_BACKEND_API}/api/chats/download/${filename}`;

      // Create a hidden link and trigger download
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = originalName || filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Download started",
        description: "Your file download has started",
        status: "info",
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error("Error downloading file:", error);
      toast({
        title: "Error",
        description: "Could not download the file",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  // Function to handle delete message
  const handleDeleteMessage = (messageId) => {
    setDeleteMessageId(messageId);
    onDeleteAlertOpen();
  };

  // Function to confirm message deletion
  const confirmDeleteMessage = async () => {
    if (!deleteMessageId || !user?.id) return;

    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await axios.put(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/chats/unsend/${deleteMessageId}`,
        { userId: user.id },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Update message in UI
      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === deleteMessageId
            ? { ...msg, isDeleted: true, message: "This message was unsent" }
            : msg
        )
      );

      // Emit socket event to notify other user
      if (socket && currentChat) {
        socket.emit("messageUnsent", {
          messageId: deleteMessageId,
          senderId: user.id,
          receiverId: currentChat._id,
        });
      }

      // Refresh conversations
      fetchConversations(user.id);

      toast({
        title: "Message unsent",
        description: "Your message has been removed",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error("Error deleting message:", error);
      toast({
        title: "Error",
        description: "Could not delete the message",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setDeleteMessageId(null);
      onDeleteAlertClose();
    }
  };

  // Handle socket events for messages and users
  useEffect(() => {
    if (socket && user?.id) {
      console.log("Setting up socket event handlers for user:", user.id);

      // Always clean up previous listeners first
      socket.off("getUsers");
      socket.off("getMessage");
      socket.off("refreshConversations");
      socket.off("messageUnsent");
      socket.off("messageRead");
      socket.off("userTyping"); // New: cleanup
      socket.off("userStopTyping"); // New: cleanup
      socket.off("messageReactionUpdated"); // Cleanup for reaction updates

      // Add user to online users
      socket.emit("addUser", user.id);

      // Listen for online users updates
      socket.on("getUsers", (users) => {
        console.log("Online users received:", users);
        setOnlineUsers(users.map((u) => u.userId));
      });

      // Listen for refresh conversations event
      socket.on("refreshConversations", () => {
        console.log(
          "Received refreshConversations event, refreshing conversations"
        );
        if (user?.id) {
          fetchConversations(user.id);
        }
      });

      // Listen for message unsent events
      socket.on("messageUnsent", (data) => {
        console.log("Message unsent event received:", data);
        if (data.messageId) {
          // Update message in UI
          setMessages((prev) =>
            prev.map((msg) =>
              msg._id === data.messageId
                ? {
                    ...msg,
                    isDeleted: true,
                    message: "This message was unsent",
                  }
                : msg
            )
          );

          // Refresh conversations
          fetchConversations(user.id);
        }
      });

      // Listen for message read events
      socket.on("messageRead", (data) => {
        console.log("Message read event received:", data);

        // If the reader is the person we're chatting with
        if (data.readerId === currentChat?._id) {
          // Update all messages sent to this reader as read
          setMessages((prev) =>
            prev.map((msg) =>
              msg.sender === user.id && msg.receiver === data.readerId
                ? { ...msg, isRead: true }
                : msg
            )
          );
        }
      });

      // Listen for new messages with deduplication
      socket.on("getMessage", (data) => {
        console.log("New message received via socket:", data);

        // If message is from the person we are currently chatting with, clear typing indicator
        if (currentChat && data.senderId === currentChat._id) {
          setIsRemoteUserTyping(false);
        }

        const isSelfEcho = data.isSelfEcho === true;

        // Check if this message already exists in our messages array
        // to prevent duplicates from socket events
        const messageExists = messages.some(
          (msg) =>
            msg._id === data.messageId ||
            (data.messageId && msg._id === data.messageId)
        );

        if (messageExists) {
          console.log("Ignoring duplicate message with ID:", data.messageId);
          return;
        }

        // If this is just an echo of our own message, don't process it again
        if (isSelfEcho && data.senderId === user.id) {
          console.log("Ignoring self-echo message");
          return;
        }

        // Add the message to messages state
        const newMessage = {
          _id: data.messageId || new Date().getTime(), // Use server ID if available
          sender: data.senderId,
          receiver: user.id,
          message: data.text,
          createdAt: new Date().toISOString(),
          isRead: false,
          hasAttachment: data.hasAttachment || false,
        };

        // If we're in the chat with this sender, add message to UI
        if (currentChat && data.senderId === currentChat._id) {
          console.log("Adding message to current chat UI");
          setMessages((prev) => [...prev, newMessage]);

          // Also mark it as read since we're viewing it
          const markAsRead = async () => {
            try {
              const token = localStorage.getItem("token");
              if (!token) return;

              await axios.put(
                `${process.env.NEXT_PUBLIC_BACKEND_API}/api/chats/read/${user.id}/${data.senderId}`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
              );
            } catch (error) {
              console.error("Error marking message as read:", error);
            }
          };

          markAsRead();
        }

        // Show notification for incoming messages
        if (data.senderId !== user.id) {
          // Find the sender's name if possible
          let senderName = "someone";
          if (currentChat && currentChat._id === data.senderId) {
            senderName = currentChat.name;
          } else {
            // Try to find sender in conversations
            const convo = conversations.find(
              (c) => c.user && c.user._id === data.senderId
            );
            if (convo && convo.user) {
              senderName = convo.user.name;
            } else {
              // Try to find in all users
              const sender = allUsers.find((u) => u._id === data.senderId);
              if (sender) {
                senderName = sender.name;
              }
            }
          }

          toast({
            title: "New Message",
            description: `You received a message from ${senderName}`,
            status: "info",
            duration: 3000,
            isClosable: true,
            position: "top-right",
          });
        }

        // Always refresh conversations to update the UI with latest messages
        console.log("Refreshing conversations after new message");
        fetchConversations(user.id);
      });

      // New: Listen for typing indicators
      socket.on("userTyping", (data) => {
        if (currentChat && data.senderId === currentChat._id) {
          setIsRemoteUserTyping(true);
        }
      });

      socket.on("userStopTyping", (data) => {
        if (currentChat && data.senderId === currentChat._id) {
          setIsRemoteUserTyping(false);
        }
      });

      // New: Listen for message reaction updates
      socket.on("messageReactionUpdated", ({ messageId, reactions }) => {
        console.log("Message reaction updated event received:", {
          messageId,
          reactions,
        });
        setMessages((prevMessages) =>
          prevMessages.map((msg) =>
            msg._id === messageId ? { ...msg, reactions: reactions } : msg
          )
        );
      });

      // Clean up on unmount or dependencies change
      return () => {
        console.log("Cleaning up message event handlers");
        socket.off("getUsers");
        socket.off("getMessage");
        socket.off("refreshConversations");
        socket.off("messageUnsent");
        socket.off("messageRead");
        socket.off("userTyping");
        socket.off("userStopTyping");
        socket.off("messageReactionUpdated"); // Cleanup for reaction updates on unmount
      };
    }
  }, [
    socket,
    user,
    currentChat,
    toast,
    fetchConversations,
    conversations,
    allUsers,
    messages,
  ]);

  // Refresh conversations periodically as a backup for socket events
  useEffect(() => {
    if (!user?.id) return;

    console.log("Setting up periodic conversation refresh");

    // Refresh immediately when component mounts
    fetchConversations(user.id);

    const intervalId = setInterval(() => {
      console.log("Running periodic conversation refresh");
      fetchConversations(user.id);

      // If we have an active chat, also refresh messages
      if (currentChat) {
        console.log("Also refreshing messages for active chat");
        const getMessages = async () => {
          try {
            const token = localStorage.getItem("token");
            if (!token) return;

            const response = await axios.get(
              `${process.env.NEXT_PUBLIC_BACKEND_API}/api/chats/messages/${user.id}/${currentChat._id}?page=1&limit=${messagePagination.limit}`,
              { headers: { Authorization: `Bearer ${token}` } }
            );

            console.log(
              "Periodic message refresh returned:",
              response.data?.messages?.length,
              "messages"
            );
            if (response.data && response.data.messages) {
              setMessages((prevMessages) => {
                const newPageMessages = response.data.messages || [];

                // Combine messages and remove duplicates, preferring newPageMessages if IDs match
                const messageMap = new Map();
                prevMessages.forEach((msg) => messageMap.set(msg._id, msg));
                newPageMessages.forEach((msg) => messageMap.set(msg._id, msg)); // Overwrites with newer versions from the latest page

                // Convert map back to array and sort by createdAt to ensure chronological order
                const mergedMessages = Array.from(messageMap.values());
                mergedMessages.sort(
                  (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
                );

                return mergedMessages;
              });
            } else {
              console.warn(
                "Periodic message refresh returned unexpected data format or no messages:",
                response.data
              );
            }
          } catch (error) {
            console.error("Error in periodic message refresh:", error);
          }
        };

        getMessages();
      }
    }, 2000); // Check every 3 seconds

    return () => {
      console.log("Clearing periodic conversation refresh");
      clearInterval(intervalId);
    };
  }, [user, fetchConversations, currentChat, messagePagination.limit]);

  // Add this function to handle scroll events
  const handleScroll = useCallback(() => {
    if (!messagesContainerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } =
      messagesContainerRef.current;
    // Show button when not at bottom (with a small buffer of 100px)
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
    setShowScrollButton(!isAtBottom);
  }, []);

  // Add this function to scroll to bottom on demand
  const scrollToBottom = useCallback(() => {
    console.log("Manual scroll to bottom triggered");
    const container = messagesContainerRef.current;
    if (container) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: "smooth",
      });
      // Delay hiding the button and re-check if at bottom
      setTimeout(() => {
        if (messagesContainerRef.current) {
          // Re-check container existence
          const currentContainer = messagesContainerRef.current;
          const isAtBottomNow =
            currentContainer.scrollHeight - currentContainer.clientHeight <=
            currentContainer.scrollTop + 1; // Use a small threshold (1px)
          if (isAtBottomNow) {
            setShowScrollButton(false);
          }
        }
      }, 300); // 300ms delay, adjust if needed
    } else {
      setShowScrollButton(false); // Should not happen if button is visible
    }
  }, []); // messagesContainerRef is stable, so it's not added as a dependency

  // Add a useEffect to set up scroll event listener
  useEffect(() => {
    const messagesContainer = messagesContainerRef.current;
    if (messagesContainer) {
      messagesContainer.addEventListener("scroll", handleScroll);
      return () =>
        messagesContainer.removeEventListener("scroll", handleScroll);
    }
  }, [handleScroll]);

  // Prevent chat from closing accidentally when clicking inside the chat area
  const handleChatAreaClick = (e) => {
    e.stopPropagation(); // Prevent event bubbling that might trigger chat close
  };

  // Function to close the current chat with more controlled behavior
  const handleCloseChat = (e) => {
    if (e) e.stopPropagation(); // Stop propagation to prevent bubbling
    setCurrentChat(null);
  };

  // Add a state for emoji picker visibility
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Improve the emoji selection handler to properly update the input
  const handleEmojiClick = (emojiObject) => {
    // Get the current value of the input
    const currentValue = inputValueRef.current;

    // Add the emoji to the current value
    const newValue = currentValue + emojiObject.emoji;

    // Update the ref
    inputValueRef.current = newValue;
    setInputValue(newValue); // This triggers a re-render

    // Removed setInputValue(newValue) as it's redundant for re-render;
    // handleInputChange (called via dispatched event or directly) will handle setIsInputEmpty which triggers re-render if needed.

    // Update UI state for the send button (this will be handled by handleInputChange)
    // setIsInputEmpty(false); // This was potentially incorrect if newValue was only spaces

    // Find and update the input element directly as well for immediate feedback
    const inputElement = document.querySelector(
      'input[placeholder="Type a message..."]'
    );
    if (inputElement) {
      inputElement.value = newValue;
      // Create and dispatch an input event to ensure React's listeners are triggered,
      // which will call handleInputChange.
      const inputEvent = new Event("input", { bubbles: true });
      inputElement.dispatchEvent(inputEvent);
    } else {
      // Fallback: If the input element isn't found (e.g., timing issues or unexpected DOM state),
      // directly call handleInputChange to ensure state consistency.
      handleInputChange(newValue);
    }

    // Keep emoji picker open for multiple emoji selection
    // setShowEmojiPicker(false); // Removed to allow selecting multiple emojis
  };

  // Add a function to get the last message sent by the current user
  const getLastSeenMessageIndex = (messages, userId) => {
    // Reverse messages array to start from most recent
    const userMessages = [...messages].filter(
      (msg) => msg.sender === userId && !msg.isDeleted && !msg.isError
    );

    if (userMessages.length === 0) return -1;

    // Return the last seen message from the user's messages
    const lastSeenMessage = userMessages.findIndex(
      (msg) => msg.isRead === true
    );
    return lastSeenMessage;
  };

  // Add a separate function to mark messages as read and emit socket event
  const markMessagesAsRead = async () => {
    if (!currentChat || !user?.id) return;

    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await axios.put(
        process.env.NEXT_PUBLIC_BACKEND_API +
          `/api/chats/read/${user.id}/${currentChat._id}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Emit socket event to notify sender that messages were read
      if (socket) {
        socket.emit("messageRead", {
          readerId: user.id,
          senderId: currentChat._id,
        });
      }

      return response;
    } catch (error) {
      console.error("Error marking messages as read:", error);
      return null;
    }
  };

  // Add a function to periodically mark messages as read when user is viewing chat
  useEffect(() => {
    if (!currentChat || !user?.id) return;

    // Mark messages as read immediately when chat loads
    markMessagesAsRead();

    // Set up an interval to periodically mark messages as read (every 5 seconds)
    const intervalId = setInterval(() => {
      if (document.visibilityState === "visible") {
        markMessagesAsRead();
      }
    }, 5000);

    return () => clearInterval(intervalId);
  }, [currentChat, user]);

  // Add visibility change event listener to mark messages as read when tab becomes active
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && currentChat && user?.id) {
        markMessagesAsRead();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [currentChat, user]);

  // Add a utility function to detect and wrap emojis with styling
  const formatMessageWithLargeEmojis = (message) => {
    if (!message) return "";

    // Regex to detect emoji characters
    // This regex pattern matches most standard emojis
    const emojiRegex = /(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)/gu;

    // If the message is ONLY emojis (1-3 characters), make them extra large
    if (message.replace(emojiRegex, "").trim() === "" && message.length <= 3) {
      return (
        <Text fontSize="3xl" lineHeight="1.2">
          {message}
        </Text>
      );
    }

    // Otherwise, split the message and style emojis differently
    const parts = message.split(emojiRegex);
    const matches = message.match(emojiRegex) || [];

    if (matches.length === 0) {
      // No emojis found, return the original message
      return message;
    }

    // Combine parts and matches back together with styled emojis
    const elements = [];
    let matchIndex = 0;

    for (let i = 0; i < parts.length; i++) {
      if (parts[i]) {
        elements.push(
          <React.Fragment key={`part-${i}`}>{parts[i]}</React.Fragment>
        );
      }

      if (matchIndex < matches.length) {
        elements.push(
          <Text
            as="span"
            fontSize="xl"
            key={`emoji-${i}`}
            verticalAlign="middle"
            display="inline-block"
            transform="translateY(-1px)"
          >
            {matches[matchIndex++]}
          </Text>
        );
      }
    }

    return <>{elements}</>;
  };

  const handleOpenImageViewer = (src) => {
    setImageViewerSrc(src);
    onOpenImageViewer();
  };

  // Function to handle sending a reaction
  const handleReaction = async (messageId, emoji) => {
    if (!user || !user.id) return;

    try {
      // Optimistically update UI - find the message and update its reactions
      setMessages((prevMessages) =>
        prevMessages.map((msg) => {
          if (msg._id === messageId) {
            const existingReactionIndex = msg.reactions?.findIndex(
              (r) => r.userId === user.id && r.emoji === emoji
            );
            let newReactions = [...(msg.reactions || [])];

            if (existingReactionIndex > -1) {
              newReactions.splice(existingReactionIndex, 1);
            } else {
              newReactions.push({ userId: user.id, emoji: emoji });
            }
            return { ...msg, reactions: newReactions };
          }
          return msg;
        })
      );

      // API call
      const token = localStorage.getItem("token");
      await axios.put(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/chats/messages/${messageId}/react`,
        { userId: user.id, emoji },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      // Backend will ideally emit a socket event to confirm and update for other users
      // For now, the optimistic update handles the current user's view.
    } catch (error) {
      console.error("Error reacting to message:", error);
      toast({
        title: "Reaction failed",
        description: "Could not save your reaction.",
        status: "error",
        duration: 2000,
        isClosable: true,
      });
      // Optionally, revert optimistic update here if needed
    }
  };

  // Effect for performing in-chat search
  useEffect(() => {
    // Clear any existing timeout when chatSearchQuery changes
    if (chatSearchDebounceTimeoutRef.current) {
      clearTimeout(chatSearchDebounceTimeoutRef.current);
    }

    // Set a new timeout to perform search after 500ms of inactivity
    chatSearchDebounceTimeoutRef.current = setTimeout(() => {
      if (chatSearchQuery.trim() === "") {
        setChatSearchResults([]);
        setCurrentChatSearchIndex(-1);
        return;
      }

      const results = [];
      messages.forEach((msg) => {
        if (msg.message && !msg.isDeleted) {
          if (
            msg.message.toLowerCase().includes(chatSearchQuery.toLowerCase())
          ) {
            results.push({ messageId: msg._id });
          }
        }
      });
      setChatSearchResults(results);
      setCurrentChatSearchIndex(results.length > 0 ? 0 : -1);

      // TODO: Scroll to the first result if any (consider if scrolling should also be debounced or immediate post-search)
    }, 500); // 500ms debounce

    // Cleanup timeout on unmount or if query/messages change before timeout fires
    return () => {
      if (chatSearchDebounceTimeoutRef.current) {
        clearTimeout(chatSearchDebounceTimeoutRef.current);
      }
    };
  }, [chatSearchQuery, messages]); // messages dependency is important if new messages can arrive while searching

  // Helper function to highlight search matches
  const highlightMatches = (text, query) => {
    if (!query) return formatMessageWithLargeEmojis(text);
    const parts = text.split(
      new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\\\$&")})`, "gi")
    );
    return (
      <>
        {parts.map((part, index) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <Text
              as="mark"
              key={index}
              bg="yellow.200"
              color="black"
              fontWeight="bold"
            >
              {part}
            </Text>
          ) : (
            formatMessageWithLargeEmojis(part) // Apply emoji formatting to non-matching parts
          )
        )}
      </>
    );
  };

  return (
    <Box
      h="100%"
      display="flex"
      flexDirection="column"
      bg={useColorModeValue("gray.50", "gray.900")}
    >
      {/* Chat Header */}

      {/* Tabs */}
      <Tabs
        variant="soft-rounded"
        colorScheme="red"
        size="sm"
        p={4}
        pt={2}
        onChange={setActiveTab}
        index={activeTab}
        defaultIndex={0}
        isLazy={false}
      >
        <TabList mb={2}>
          <Tab
            _selected={{
              bg: useColorModeValue("red.50", "red.900"),
              color: useColorModeValue("red.600", "red.200"),
              fontWeight: "semibold",
              boxShadow: "md", // Added shadow to selected tab
            }}
            _hover={{
              bg: useColorModeValue("gray.100", "gray.700"), // Hover for unselected tabs
            }}
            fontSize="sm"
            flex={1}
            borderRadius="full"
            transition="background-color 0.2s ease-in-out, box-shadow 0.2s ease-in-out" // Smooth transitions
          >
            <Text>Conversations</Text>
            {conversations.length > 0 && (
              <Badge ml={2} colorScheme="maroon" borderRadius="full">
                {conversations.length}
              </Badge>
            )}
          </Tab>
          <Tab
            _selected={{
              bg: useColorModeValue("blue.50", "blue.900"),
              color: useColorModeValue("blue.600", "blue.200"),
              fontWeight: "semibold",
              boxShadow: "md", // Added shadow to selected tab
            }}
            _hover={{
              bg: useColorModeValue("gray.100", "gray.700"), // Hover for unselected tabs
            }}
            fontSize="sm"
            flex={1}
            borderRadius="full"
            transition="background-color 0.2s ease-in-out, box-shadow 0.2s ease-in-out" // Smooth transitions
          >
            <Text>Contacts</Text>
            {allUsers.length > 0 && (
              <Badge ml={2} colorScheme="blue" borderRadius="full">
                {allUsers.length}
              </Badge>
            )}
          </Tab>
        </TabList>

        {/* Search */}
        <InputGroup size="sm" mb={4}>
          <Input
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            bg={useColorModeValue("gray.100", "gray.700")}
            borderRadius="full"
            _focus={{
              borderColor: "red.300",
              boxShadow: "0 0 0 1px var(--chakra-colors-red-300)",
            }}
          />
          <InputRightElement>
            <FiSearch color="gray.500" />
          </InputRightElement>
        </InputGroup>

        {/* User Circles - Shown below search in both tabs */}
        {allUsers.length > 0 && (
          <Box
            overflowX="auto"
            mb={4}
            css={{
              "&::-webkit-scrollbar": {
                height: "6px",
              },
              "&::-webkit-scrollbar-thumb": {
                backgroundColor: "rgba(0, 0, 0, 0.2)",
                borderRadius: "10px",
              },
            }}
          >
            <Flex gap={3} pb={2}>
              {allUsers
                .filter((user) =>
                  user.name.toLowerCase().includes(searchTerm.toLowerCase())
                )
                .sort((a, b) => {
                  const aOnline = isUserOnline(a);
                  const bOnline = isUserOnline(b);
                  if (aOnline && !bOnline) return -1; // a (online) comes before b (offline)
                  if (!aOnline && bOnline) return 1; // b (online) comes before a (offline)
                  // Optional: secondary sort by name if both are online or both are offline
                  // return a.name.localeCompare(b.name);
                  return 0; // Maintain original relative order if status is the same
                })
                .slice(0, 10)
                .map((user) => (
                  <VStack key={user._id} spacing={1} minW="60px">
                    <Box
                      position="relative"
                      transition="all 0.2s ease-in-out" // Smooth transition for avatar container
                      _hover={{ transform: "scale(1.05)" }} // Hover effect for avatar container
                    >
                      <Avatar
                        size="md"
                        name={user.name}
                        src={
                          user.profileImage
                            ? `${process.env.NEXT_PUBLIC_BACKEND_API}/uploads/${user.profileImage}`
                            : undefined
                        }
                        cursor="pointer"
                        onClick={() => {
                          setCurrentChat(user);
                          setActiveTab(0);
                        }}
                        borderWidth={2}
                        borderColor={
                          isUserOnline(user) ? "green.400" : "transparent"
                        }
                      />
                      {isUserOnline(user) && (
                        <Box
                          position="absolute"
                          bottom="0"
                          right="0"
                          w="12px"
                          h="12px"
                          bg="green.400"
                          borderRadius="full"
                          border="2px solid"
                          borderColor={useColorModeValue("white", "gray.800")}
                        />
                      )}
                    </Box>
                    <Text
                      fontSize="xs"
                      fontWeight="medium"
                      noOfLines={1}
                      textAlign="center"
                    >
                      {user.name.split(" ")[0]}
                    </Text>
                  </VStack>
                ))}
            </Flex>
          </Box>
        )}

        <TabPanels>
          {/* Conversations Tab */}
          <TabPanel p={0} h="calc(100vh - 250px)">
            <Box
              overflowY="auto"
              h={currentChat ? "30%" : "100%"} // Adjusted height when chat is open
              borderBottom={currentChat ? "1px solid" : "none"}
              borderColor={useColorModeValue("gray.200", "gray.700")}
              display={activeTab === 0 ? "block" : "none"}
              css={{
                "&::-webkit-scrollbar": {
                  width: "6px",
                },
                "&::-webkit-scrollbar-track": {
                  width: "8px",
                },
                "&::-webkit-scrollbar-thumb": {
                  background: useColorModeValue("gray.300", "gray.600"),
                  borderRadius: "12px",
                },
              }}
            >
              {loading && conversations.length === 0 ? (
                <ConversationListSkeleton />
              ) : conversations.length > 0 ? (
                conversations.map((conversation) => (
                  <Box
                    key={conversation.user._id}
                    p={3}
                    cursor="pointer"
                    bg={
                      currentChat?._id === conversation.user._id
                        ? useColorModeValue("red.50", "red.900")
                        : "transparent"
                    }
                    _hover={{
                      bg: useColorModeValue("gray.100", "gray.700"),
                    }}
                    borderRadius="md"
                    mb={1}
                    onClick={() => setCurrentChat(conversation.user)}
                    transition="background-color 0.2s ease-in-out" // Smooth transition for list items
                  >
                    <HStack spacing={3} align="center">
                      <Box position="relative">
                        <Avatar
                          size="lg" // Larger avatar in conversation list
                          name={conversation.user.name}
                          src={
                            conversation.user.profileImage
                              ? process.env.NEXT_PUBLIC_BACKEND_API +
                                `/uploads/${conversation.user.profileImage}`
                              : undefined
                          }
                        />
                        {isUserOnline(conversation.user) && (
                          <Box
                            position="absolute"
                            bottom="0"
                            right="0"
                            w="12px"
                            h="12px"
                            bg="green.400"
                            borderRadius="full"
                            border="2px solid"
                            borderColor={useColorModeValue("white", "gray.800")}
                          />
                        )}
                      </Box>
                      <VStack align="start" spacing={0} flex={1}>
                        <HStack w="100%" justify="space-between">
                          <Text fontWeight="medium" fontSize="sm">
                            {conversation.user.name}
                          </Text>
                          {conversation.lastMessage && (
                            <Text fontSize="xs" color="gray.500">
                              {formatTime(conversation.lastMessage.createdAt)}
                            </Text>
                          )}
                        </HStack>
                        <HStack w="100%" justify="space-between">
                          {conversation.lastMessage && (
                            <Text
                              fontSize="xs"
                              color="gray.500"
                              noOfLines={1}
                              maxW="70%"
                              fontWeight={
                                conversation.unreadCount > 0 ? "bold" : "normal"
                              }
                            >
                              {conversation.lastMessage.sender === user?.id
                                ? "You: "
                                : ""}
                              {conversation.lastMessage.message}
                            </Text>
                          )}
                          {conversation.unreadCount > 0 && (
                            <Badge
                              colorScheme="blue"
                              borderRadius="full"
                              px={2}
                              fontSize="2xs"
                            >
                              {conversation.unreadCount}
                            </Badge>
                          )}
                        </HStack>
                      </VStack>
                    </HStack>
                  </Box>
                ))
              ) : (
                <Flex
                  justify="center"
                  align="center"
                  h="100%"
                  direction="column"
                  p={10}
                >
                  <Box
                    mb={4}
                    p={5}
                    borderRadius="full"
                    bg={useColorModeValue("gray.100", "gray.700")}
                  >
                    <Icon as={FiMessageSquare} boxSize={10} color="gray.400" />
                  </Box>
                  <Text color="gray.500" textAlign="center">
                    No conversations yet
                  </Text>
                  <Text
                    color="gray.400"
                    fontSize="sm"
                    textAlign="center"
                    mt={1}
                  >
                    Start chatting with your contacts
                  </Text>
                </Flex>
              )}
            </Box>

            {/* Chat Area */}
            {currentChat && activeTab === 0 && (
              <Flex
                direction="column"
                h="70%"
                pb={4}
                boxShadow="sm"
                border="1px solid"
                borderColor={useColorModeValue("gray.200", "gray.700")}
                onClick={handleChatAreaClick} // Add click handler to prevent bubbling
              >
                {/* Chat Header */}
                <Flex
                  p={3}
                  bg={useColorModeValue("white", "gray.800")}
                  align="center"
                  borderBottomWidth="1px"
                  borderColor={useColorModeValue("gray.200", "gray.700")} // Standardized border color
                  boxShadow="sm" // Retained subtle shadow
                >
                  <Box position="relative">
                    <Avatar
                      size="sm"
                      name={currentChat.name}
                      src={
                        currentChat.profileImage
                          ? process.env.NEXT_PUBLIC_BACKEND_API +
                            `/uploads/${currentChat.profileImage}`
                          : undefined
                      }
                      mr={3}
                    />
                    {isUserOnline(currentChat) && (
                      <Box
                        position="absolute"
                        bottom="0"
                        right="3px"
                        w="10px"
                        h="10px"
                        bg="green.400"
                        borderRadius="full"
                        border="2px solid"
                        borderColor={useColorModeValue("white", "gray.800")}
                      />
                    )}
                  </Box>
                  <VStack align="start" spacing={0}>
                    <Text fontWeight="medium">{currentChat.name}</Text>
                    <Text fontSize="xs" color="gray.500">
                      {isUserOnline(currentChat) ? "Online" : "Offline"}
                    </Text>
                  </VStack>
                  <Spacer />{" "}
                  {/* This will push subsequent items to the right */}
                  {/* Chat Search UI Toggle and Input */}
                  {showChatSearchInput ? (
                    <InputGroup size="sm" maxW="200px" mr={2}>
                      {" "}
                      {/* Limit width of search input */}
                      <Input
                        placeholder="Search in chat..."
                        value={chatSearchQuery}
                        onChange={(e) => setChatSearchQuery(e.target.value)}
                        borderRadius="full"
                        autoFocus
                      />
                      {chatSearchResults.length > 0 &&
                        currentChatSearchIndex !== -1 && (
                          <InputLeftElement width="auto" ml={1}>
                            <Text fontSize="xs" color="gray.500">
                              {`${currentChatSearchIndex + 1} of ${chatSearchResults.length}`}
                            </Text>
                          </InputLeftElement>
                        )}
                      <InputRightElement width="auto">
                        {" "}
                        {/* Allow multiple elements */}
                        {chatSearchResults.length > 1 && (
                          <>
                            <IconButton
                              icon={<FiChevronUp />}
                              size="xs"
                              variant="ghost"
                              aria-label="Previous match"
                              onClick={() =>
                                setCurrentChatSearchIndex((prev) =>
                                  prev > 0
                                    ? prev - 1
                                    : chatSearchResults.length - 1
                                )
                              }
                              mr={1}
                            />
                            <IconButton
                              icon={<FiChevronDown />}
                              size="xs"
                              variant="ghost"
                              aria-label="Next match"
                              onClick={() =>
                                setCurrentChatSearchIndex((prev) =>
                                  prev < chatSearchResults.length - 1
                                    ? prev + 1
                                    : 0
                                )
                              }
                              mr={1}
                            />
                          </>
                        )}
                        <IconButton
                          icon={<FiX />}
                          size="xs"
                          variant="ghost"
                          onClick={() => {
                            setShowChatSearchInput(false);
                            setChatSearchQuery("");
                          }}
                          aria-label="Close search"
                        />
                      </InputRightElement>
                    </InputGroup>
                  ) : (
                    <IconButton
                      icon={<FiSearch />}
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowChatSearchInput(true)}
                      aria-label="Search in chat"
                      mr={2} // Margin next to close button
                    />
                  )}
                  {/* End Chat Search UI */}
                  <IconButton
                    icon={<FiX />} // This is the original close chat button
                    size="sm"
                    variant="ghost"
                    aria-label="Close chat"
                    onClick={handleCloseChat}
                  />
                </Flex>
                {/* Messages */}
                <Box
                  flex={1}
                  overflowY="auto"
                  px={3}
                  py={2}
                  bg={useColorModeValue("gray.100", "gray.800")}
                  ref={messagesContainerRef}
                  position="relative"
                  boxShadow="inner" // Softer inner shadow for message area
                  css={{
                    "&::-webkit-scrollbar": {
                      width: "6px",
                    },
                    "&::-webkit-scrollbar-track": {
                      width: "8px",
                    },
                    "&::-webkit-scrollbar-thumb": {
                      background: useColorModeValue("gray.400", "gray.600"), // Slightly darker thumb for message area
                      borderRadius: "12px",
                    },
                  }}
                >
                  {
                    loadingMessages && currentChat ? (
                      <ChatLoadingSkeleton />
                    ) : messages.length > 0 ? (
                      <VStack spacing={2} align="stretch">
                        {/* Button to load older messages */}
                        {messagePagination.hasMore && !loadingOlderMessages && (
                          <Flex justify="center" py={2}>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={loadOlderMessages}
                              isLoading={loadingOlderMessages}
                              bg="white"
                              _hover={{ bg: "gray.100" }}
                            >
                              Load older messages
                            </Button>
                          </Flex>
                        )}

                        {/* Loading older messages indicator (when button is clicked) */}
                        {loadingOlderMessages && (
                          <Flex justify="center" py={2}>
                            <Spinner size="sm" color="white" mr={2} />
                            <Text fontSize="xs" color="white">
                              Loading older messages...
                            </Text>
                          </Flex>
                        )}

                        {messages.map((msg, idx) => {
                          const isCurrentUser = msg.sender === user?.id;
                          const showDate =
                            idx === 0 ||
                            formatDate(messages[idx - 1]?.createdAt) !==
                              formatDate(msg.createdAt);

                          return (
                            <React.Fragment key={msg._id || idx}>
                              {showDate && (
                                <Flex justify="center" my={3} py={1}>
                                  {" "}
                                  {/* Increased vertical margin slightly */}
                                  <Text
                                    fontSize="xs"
                                    bg={useColorModeValue(
                                      "gray.200",
                                      "gray.700"
                                    )} // Theme-aware background
                                    color={useColorModeValue(
                                      "gray.600",
                                      "gray.300"
                                    )} // Theme-aware text color
                                    px={3} // Increased padding
                                    py={1}
                                    borderRadius="full"
                                    fontWeight="medium"
                                  >
                                    {formatDate(msg.createdAt)}
                                  </Text>
                                </Flex>
                              )}
                              {/* Use the new ChatMessageItem component */}
                              <ChatMessageItem
                                msg={msg}
                                isCurrentUser={isCurrentUser}
                                currentChat={currentChat}
                                loggedInUser={user} // Pass the logged-in user
                                formatTime={formatTime}
                                formatDate={formatDate} // Though formatDate is used above, passing for completeness if needed inside
                                highlightMatches={highlightMatches}
                                formatMessageWithLargeEmojis={
                                  formatMessageWithLargeEmojis
                                }
                                chatSearchQuery={chatSearchQuery}
                                chatSearchResults={chatSearchResults}
                                handleOpenImageViewer={handleOpenImageViewer}
                                handleFileDownload={handleFileDownload}
                                handleReaction={handleReaction}
                                activeReactionMessageId={
                                  activeReactionMessageId
                                }
                                setActiveReactionMessageId={
                                  setActiveReactionMessageId
                                }
                                availableReactions={availableReactions}
                                handleDeleteMessage={handleDeleteMessage}
                                // Pass useColorModeValue if needed, or ensure it's accessible
                              />
                            </React.Fragment>
                          );
                        })}
                        <div ref={messagesEndRef} />
                      </VStack>
                    ) : currentChat ? ( // Only show "Start a conversation" if a chat is actually open and empty
                      <Flex justify="center" align="center" h="100%">
                        <Text color={useColorModeValue("gray.600", "gray.300")}>
                          Start a conversation with {currentChat.name}
                        </Text>
                      </Flex>
                    ) : null /* Should not be reached if currentChat is null, as the parent Flex won't render */
                  }

                  {/* Scroll to bottom button */}
                  {/* {showScrollButton && (
                    <IconButton
                      icon={<FiChevronDown />}
                      size="sm"
                      colorScheme="blue"
                      borderRadius="full"
                      position="absolute"
                      bottom="20px"
                      right="20px"
                      opacity="0.8"
                      onClick={scrollToBottom}
                      _hover={{ opacity: 1 }}
                      boxShadow="md"
                    />
                  )} */}
                </Box>
                {/* Typing indicator - Placed above the input area */}
                {isRemoteUserTyping && currentChat && (
                  <Flex
                    px={4}
                    py={2}
                    align="center"
                    bg={useColorModeValue("gray.50", "gray.800")}
                    borderTopWidth="1px"
                    borderColor={useColorModeValue("gray.200", "gray.700")}
                  >
                    <Avatar
                      size="xs"
                      name={currentChat.name}
                      src={
                        currentChat.profileImage
                          ? process.env.NEXT_PUBLIC_BACKEND_API +
                            `/uploads/${currentChat.profileImage}`
                          : undefined
                      }
                      mr={2}
                    />
                    <Text fontSize="xs" color="gray.500" fontStyle="italic">
                      {currentChat.name} is typing...
                    </Text>
                  </Flex>
                )}
                {/* Message Input Area */}
                <Box
                  as="form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (selectedFile) {
                      handleFileSend();
                    } else {
                      handleSendMessage(e);
                    }
                  }}
                  onClick={(e) => e.stopPropagation()}
                  bg={useColorModeValue("white", "gray.800")}
                  py={2}
                  px={2}
                  borderTopWidth="1px"
                  borderColor={useColorModeValue("gray.200", "gray.600")}
                  boxShadow="sm" // Apply a subtle shadow to the entire input box
                >
                  {/* File upload progress */}
                  {fileUploading && (
                    <Box px={2} pb={2}>
                      <Progress
                        value={uploadProgress}
                        size="xs"
                        colorScheme="blue"
                        borderRadius="full"
                      />
                      <Text fontSize="xs" textAlign="right" mt={1}>
                        Uploading: {uploadProgress}%
                      </Text>
                    </Box>
                  )}

                  {/* Selected file preview */}
                  {selectedFile && !fileUploading && (
                    <Flex
                      p={2}
                      bg={useColorModeValue("gray.100", "gray.700")}
                      borderRadius="md"
                      mx={2}
                      mb={2}
                      alignItems="center"
                    >
                      <Icon as={FiFile} mr={2} />
                      <Text fontSize="sm" flex={1} isTruncated>
                        {selectedFile.name}
                      </Text>
                      <IconButton
                        icon={<FiX />}
                        size="xs"
                        variant="ghost"
                        onClick={() => {
                          setSelectedFile(null);
                          if (fileInputRef.current)
                            fileInputRef.current.value = "";
                        }}
                        aria-label="Remove file"
                      />
                    </Flex>
                  )}

                  <Flex
                    alignItems="center"
                    // Removed individual background from this Flex, parent Box handles it now
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      style={{ display: "none" }}
                    />
                    <IconButton
                      icon={<FiPaperclip />}
                      size="sm"
                      variant="ghost"
                      mr={2}
                      onClick={() => fileInputRef.current?.click()}
                      isDisabled={fileUploading}
                      aria-label="Attach file"
                      transition="all 0.2s ease-in-out" // Smooth transition
                      _hover={{ transform: "scale(1.1)" }} // Hover effect
                    />
                    {/* Emoji Button */}
                    <Popover
                      isOpen={showEmojiPicker}
                      onClose={() => setShowEmojiPicker(false)}
                      placement="top-start"
                      autoFocus={false}
                    >
                      <PopoverTrigger>
                        <IconButton
                          icon={<FiSmile />}
                          size="sm"
                          variant="ghost"
                          mr={2}
                          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                          isDisabled={fileUploading}
                          aria-label="Add emoji"
                          transition="all 0.2s ease-in-out" // Smooth transition
                          _hover={{ transform: "scale(1.1)" }} // Hover effect
                        />
                      </PopoverTrigger>
                      <PopoverContent width="auto" p={0}>
                        <PopoverArrow />
                        <PopoverBody p={0}>
                          <EmojiPicker
                            onEmojiClick={handleEmojiClick}
                            searchDisabled={false}
                            width={300}
                            height={400}
                          />
                        </PopoverBody>
                      </PopoverContent>
                    </Popover>
                    <InputGroup size="md">
                      <OptimizedMessageInput
                        placeholder={
                          selectedFile
                            ? "Add a message (optional)"
                            : "Type a message..."
                        }
                        value={newMessage}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        isDisabled={fileUploading}
                      />
                      <InputRightElement>
                        <IconButton
                          aria-label="Send message"
                          icon={<FiSend />}
                          size="sm"
                          isRound
                          colorScheme="red"
                          type="submit"
                          isLoading={fileUploading}
                          isDisabled={
                            (isInputEmpty && !selectedFile) || fileUploading
                          }
                          transition="all 0.2s ease-in-out" // Smooth transition
                          _hover={{ transform: "scale(1.1)", boxShadow: "lg" }} // Hover effect
                        />
                      </InputRightElement>
                    </InputGroup>
                  </Flex>
                </Box>{" "}
                {/* End of new Box for Message Input Area */}
              </Flex>
            )}
          </TabPanel>

          {/* Contacts Tab */}
          <TabPanel p={0} h="calc(100vh - 250px)">
            <Box
              overflowY="auto"
              h="100%"
              css={{
                "&::-webkit-scrollbar": {
                  width: "6px",
                },
                "&::-webkit-scrollbar-track": {
                  width: "8px",
                },
                "&::-webkit-scrollbar-thumb": {
                  background: useColorModeValue("gray.300", "gray.600"),
                  borderRadius: "12px",
                },
              }}
            >
              {allUsers.length === 0 ? (
                <Flex justify="center" align="center" h="100%">
                  {loading ? (
                    <>
                      <Spinner size="xl" />
                      <Text ml={4}>Loading contacts...</Text>
                    </>
                  ) : (
                    <Flex
                      justify="center"
                      align="center"
                      h="100%"
                      direction="column"
                      p={10}
                    >
                      <Box
                        mb={4}
                        p={6} // Increased padding for larger icon area
                        borderRadius="full"
                        bg={useColorModeValue("gray.100", "gray.700")}
                      >
                        <Icon
                          as={FiUsers}
                          boxSize={12}
                          color={useColorModeValue("gray.400", "gray.500")}
                        />{" "}
                        {/* Larger icon, theme-aware color */}
                      </Box>
                      <Text color="gray.500" fontWeight="medium">
                        No contacts found.
                      </Text>{" "}
                      {/* Adjusted text */}
                      <Text
                        color={useColorModeValue("gray.400", "gray.500")} // Theme-aware secondary text
                        fontSize="sm"
                        textAlign="center"
                        mt={1}
                      >
                        They will appear here once available.
                      </Text>
                    </Flex>
                  )}
                </Flex>
              ) : (
                allUsers
                  .filter((contact) =>
                    contact.name
                      .toLowerCase()
                      .includes(searchTerm.toLowerCase())
                  )
                  .map((contact) => (
                    <Box
                      key={contact._id}
                      p={3}
                      cursor="pointer"
                      _hover={{
                        bg: useColorModeValue("gray.100", "gray.700"),
                        transform: "scale(1.02)", // Slight scale on hover
                      }}
                      borderRadius="md"
                      mb={1}
                      onClick={() => {
                        setCurrentChat(contact);
                        setActiveTab(0);
                      }}
                      transition="background-color 0.2s ease-in-out, transform 0.15s ease-in-out" // Smooth transition for list items
                    >
                      <HStack spacing={3} align="center">
                        <Box position="relative">
                          <Avatar
                            size="md" // Slightly larger avatar
                            name={contact.name}
                            src={
                              contact.profileImage
                                ? `${process.env.NEXT_PUBLIC_BACKEND_API}/uploads/${contact.profileImage}`
                                : undefined
                            }
                          />
                          {isUserOnline(contact) && (
                            <Box
                              position="absolute"
                              bottom="0"
                              right="0"
                              w="12px"
                              h="12px"
                              bg="green.400"
                              borderRadius="full"
                              border="2px solid"
                              borderColor={useColorModeValue(
                                "white",
                                "gray.800"
                              )}
                            />
                          )}
                        </Box>
                        <VStack align="start" spacing={0} flex={1}>
                          <Text fontWeight="medium" fontSize="sm">
                            {contact.name}
                          </Text>
                          <Text fontSize="xs" color="gray.500">
                            {contact.email}
                          </Text>
                        </VStack>
                        <HStack>
                          <IconButton
                            icon={<FiMessageSquare />}
                            size="sm"
                            variant="ghost"
                            colorScheme="blue"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCurrentChat(contact);
                              setActiveTab(0);
                            }}
                            aria-label="Chat with user"
                            transition="all 0.2s ease-in-out"
                            _hover={{ transform: "scale(1.1)" }} // Hover effect
                          />
                          <IconButton
                            icon={<FiSend />}
                            size="sm"
                            variant="ghost"
                            colorScheme="green"
                            onClick={async (e) => {
                              e.stopPropagation();
                              try {
                                const token = localStorage.getItem("token");
                                if (!token || !user?.id) return;

                                // Send a test message
                                const messageData = {
                                  sender: user.id,
                                  receiver: contact._id,
                                  message: "Hello! How are you?",
                                };

                                await axios.post(
                                  `${process.env.NEXT_PUBLIC_BACKEND_API}/api/chats/send`,
                                  messageData,
                                  {
                                    headers: {
                                      Authorization: `Bearer ${token}`,
                                    },
                                  }
                                );

                                toast({
                                  title: "Test Message Sent",
                                  description: `Test message sent to ${contact.name}`,
                                  status: "success",
                                  duration: 3000,
                                  isClosable: true,
                                });

                                // Refresh conversations
                                fetchConversations(user.id);

                                // Switch to conversations tab and open this chat
                                setCurrentChat(contact);
                                setActiveTab(0);
                              } catch (error) {
                                console.error(
                                  "Error sending test message:",
                                  error
                                );
                                toast({
                                  title: "Error",
                                  description: "Could not send test message",
                                  status: "error",
                                  duration: 3000,
                                  isClosable: true,
                                });
                              }
                            }}
                            aria-label="Send test message"
                            transition="all 0.2s ease-in-out"
                            _hover={{ transform: "scale(1.1)" }} // Hover effect
                          />
                        </HStack>
                      </HStack>
                    </Box>
                  ))
              )}
            </Box>
          </TabPanel>
        </TabPanels>
      </Tabs>

      {/* Delete Message Confirmation Dialog */}
      <AlertDialog
        isOpen={isDeleteAlertOpen}
        leastDestructiveRef={useRef(null)}
        onClose={onDeleteAlertClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Unsend Message
            </AlertDialogHeader>

            <AlertDialogBody>
              Are you sure you want to unsend this message? This cannot be
              undone.
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button onClick={onDeleteAlertClose}>Cancel</Button>
              <Button colorScheme="red" onClick={confirmDeleteMessage} ml={3}>
                Unsend
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>

      {/* Image Viewer Modal */}
      <Modal
        isOpen={isOpenImageViewer}
        onClose={onCloseImageViewer}
        size="xl"
        isCentered
      >
        <ModalOverlay />
        <ModalContent maxW="90vw" maxH="90vh">
          {" "}
          {/* Responsive sizing */}
          <ModalHeader>Image Preview</ModalHeader>
          <ModalCloseButton />
          <ModalBody display="flex" justifyContent="center" alignItems="center">
            <Image
              src={imageViewerSrc}
              alt="Full screen image preview"
              maxW="100%"
              maxH="calc(90vh - 120px)" // Adjust based on header/footer height
              objectFit="contain" // Use contain to see the whole image
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" onClick={onCloseImageViewer}>
              Close
            </Button>
            {/* Optional: Add download button here too */}
            {/* <Button
              colorScheme="blue"
              ml={3}
              onClick={() => {
                // Need to extract filename for download from imageViewerSrc or pass it
                // This part requires a bit more logic if imageViewerSrc is just the URL
              }}
            >
              Download
            </Button> */}
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default UserChats;
