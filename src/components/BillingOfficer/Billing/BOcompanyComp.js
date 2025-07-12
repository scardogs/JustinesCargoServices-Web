import {
  Box,
  Button,
  Input,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  IconButton,
  Flex,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  FormControl,
  FormLabel,
  Select,
  useToast,
  Heading,
  Tooltip,
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  TableContainer,
  Image,
  Badge,
  useBreakpointValue,
  VStack,
  HStack,
  useDisclosure,
  Text,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  SimpleGrid,
  InputGroup,
  InputLeftElement,
  Alert,
  AlertIcon,
  Icon,
  Progress,
  Textarea,
  Spinner,
} from "@chakra-ui/react";
import {
  AddIcon,
  EditIcon,
  DeleteIcon,
  Search2Icon,
  ChevronLeftIcon,
  ChevronRightIcon,
  LockIcon,
  CheckIcon,
  InfoIcon,
} from "@chakra-ui/icons";
import { FiClock } from "react-icons/fi";
import { useState, useEffect, useRef } from "react";
import axios from "axios";

export default function CompaniesTable() {
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    _id: null,
    companyID: "",
    companyName: "",
    entityAbbreviation: "",
    businessAddress: "",
    tin: "",
    status: "",
  });
  const [companies, setCompanies] = useState([]);
  const toast = useToast();
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [isConsigneeModalOpen, setIsConsigneeModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [consignees, setConsignees] = useState([]);
  const [isConsigneeFormView, setIsConsigneeFormView] = useState(false);
  const [consigneeFormData, setConsigneeFormData] = useState({
    consigneeName: "",
  });
  const [consigneeSearchTerm, setConsigneeSearchTerm] = useState("");
  const [isEditMode, setIsEditMode] = useState(false);
  const [editConsigneeId, setEditConsigneeId] = useState(null);
  const [companyToDelete, setCompanyToDelete] = useState(null);
  const {
    isOpen: isDeleteCompanyOpen,
    onOpen: onDeleteCompanyOpen,
    onClose: onDeleteCompanyClose,
  } = useDisclosure();
  const [consigneeToDelete, setConsigneeToDelete] = useState(null);
  const {
    isOpen: isDeleteConsigneeOpen,
    onOpen: onDeleteConsigneeOpen,
    onClose: onDeleteConsigneeClose,
  } = useDisclosure();
  const cancelRef = useRef();
  const [isSavingCompany, setIsSavingCompany] = useState(false);
  const [isSavingConsignee, setIsSavingConsignee] = useState(false);
  const [isDeletingCompany, setIsDeletingCompany] = useState(false);
  const [isDeletingConsignee, setIsDeletingConsignee] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  const [accessRequest, setAccessRequest] = useState(null);
  const [hasDeleteAccess, setHasDeleteAccess] = useState(false);
  const [hasEditAccess, setHasEditAccess] = useState(false);
  const [timer, setTimer] = useState(0);
  const timerIntervalRef = useRef(null);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [requestType, setRequestType] = useState("");
  const [requestRemarks, setRequestRemarks] = useState("");
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const [pendingEditRequest, setPendingEditRequest] = useState(false);
  const [pendingDeleteRequest, setPendingDeleteRequest] = useState(false);
  // Consignee modal access control
  const [modalHasAccess, setModalHasAccess] = useState(false);
  const [modalAccessRequest, setModalAccessRequest] = useState(null);
  const [modalHasEditAccess, setModalHasEditAccess] = useState(false);
  const [modalHasDeleteAccess, setModalHasDeleteAccess] = useState(false);
  const [modalTimer, setModalTimer] = useState(0);
  const modalTimerIntervalRef = useRef(null);
  const [isModalRequestOpen, setIsModalRequestOpen] = useState(false);
  const [modalRequestType, setModalRequestType] = useState("");
  const [modalRequestRemarks, setModalRequestRemarks] = useState("");
  const [isModalSubmittingRequest, setIsModalSubmittingRequest] = useState(false);
  const [modalPendingEditRequest, setModalPendingEditRequest] = useState(false);
  const [modalPendingDeleteRequest, setModalPendingDeleteRequest] = useState(false);

  // Fetch companies from the backend
  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      console.log(
        "Fetching companies from:",
        process.env.NEXT_PUBLIC_BACKEND_API + "/api/companies"
      );
      const response = await axios.get(
        process.env.NEXT_PUBLIC_BACKEND_API + "/api/companies"
      );

      console.log("Response status:", response.status);
      console.log("Response data:", response.data);

      // Sort companies by createdAt date in descending order (newest first)
      const sortedData = response.data.sort((a, b) => {
        return new Date(b.createdAt) - new Date(a.createdAt);
      });

      const companiesWithConsigneeCount = await Promise.all(
        sortedData.map(async (company) => {
          try {
            const consigneeResponse = await axios.get(
              `${process.env.NEXT_PUBLIC_BACKEND_API}/api/multiple-consignees?companyId=${company._id}`
            );
            return {
              ...company,
              consigneeCount: consigneeResponse.data.length,
            };
          } catch (consigneeError) {
            console.error("Error fetching consignees:", consigneeError);
            return {
              ...company,
              consigneeCount: 0,
            };
          }
        })
      );

      setCompanies(companiesWithConsigneeCount);
    } catch (error) {
      console.error("Error in fetchCompanies:", {
        message: error.message,
        response: error.response,
        config: error.config,
      });
      toast({
        title: "Error",
        description:
          error.response?.data?.message || "Failed to fetch companies",
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "top-right",
      });
    }
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  // Open modal for editing
  const handleEdit = (_id) => {
    const companyToEdit = companies.find((company) => company._id === _id);
    setFormData(companyToEdit);
    setIsModalOpen(true);
  };

  // Add new company
  const handleAdd = () => {
    const companyIDs = companies.map((c) => {
      const idNumber = parseInt(c.companyID.replace("C", ""));
      return isNaN(idNumber) ? 0 : idNumber;
    });

    const maxCompanyID = companyIDs.length > 0 ? Math.max(...companyIDs) : 0;
    const newCompanyID = `C${String(maxCompanyID + 1).padStart(6, "0")}`;

    setFormData({
      _id: null,
      companyID: newCompanyID,
      companyName: "",
      entityAbbreviation: "",
      businessAddress: "",
      tin: "",
      status: "",
    });
    setIsModalOpen(true);
  };

  // Validate form
  const validateForm = () => {
    const requiredFields = [
      "companyName",
      "entityAbbreviation",
      "businessAddress",
      "tin",
      "status",
    ];

    if (requiredFields.some((field) => !formData[field])) {
      return false;
    }

    // Validate entity abbreviation format
    if (!/^[A-Z]{2,5}$/.test(formData.entityAbbreviation)) {
      toast({
        title: "Error",
        description: "Entity Abbreviation must be 2-5 uppercase letters (A-Z)",
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "top-right",
      });
      return false;
    }

    if (!formData._id) {
      const isUnique = !companies.some(
        (company) => company.companyID === formData.companyID
      );
      if (!isUnique) {
        toast({
          title: "Error",
          description: "Company ID must be unique",
          status: "error",
          duration: 3000,
          isClosable: true,
          position: "top-right",
        });
        return false;
      }
    }

    // Add validation for the new ID format
    if (!/^C\d{6}$/.test(formData.companyID)) {
      toast({
        title: "Error",
        description: "Company ID must be in the format C000000",
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "top-right",
      });
      return false;
    }

    return true;
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!validateForm()) {
      toast({
        title: "Error",
        description: "All required fields must be filled",
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "top-right",
      });
      return;
    }

    setIsSavingCompany(true);
    try {
      const payload = { ...formData };

      if (formData._id) {
        await axios.put(
          process.env.NEXT_PUBLIC_BACKEND_API +
            `/api/companies/${formData._id}`,
          payload
        );
        toast({
          title: "Success",
          description: "Company updated successfully",
          status: "success",
          duration: 3000,
          isClosable: true,
          position: "top-right",
        });
      } else {
        await axios.post(
          process.env.NEXT_PUBLIC_BACKEND_API + "/api/companies",
          payload
        );
        toast({
          title: "Success",
          description: "Company added successfully",
          status: "success",
          duration: 3000,
          isClosable: true,
          position: "top-right",
        });
      }
      fetchCompanies();
      setIsModalOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Something went wrong",
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "top-right",
      });
    } finally {
      setIsSavingCompany(false);
    }
  };

  // Handle delete
  const handleDeleteCompanyClick = (company) => {
    setCompanyToDelete(company);
    onDeleteCompanyOpen();
  };

  const confirmDeleteCompany = async () => {
    if (!companyToDelete) return;
    const _id = companyToDelete._id;

    setIsDeletingCompany(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast({
          title: "Error",
          description: "Authentication token not found. Please log in again.",
          status: "error",
        });
        setIsDeletingCompany(false);
        return;
      }
      await axios.delete(
        process.env.NEXT_PUBLIC_BACKEND_API + `/api/companies/${_id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      toast({
        title: "Success",
        description: `Company '${companyToDelete.companyName}' deleted successfully and logged`,
        status: "success",
      });
      fetchCompanies();
    } catch (error) {
      const errorDesc =
        error.response?.status === 401 || error.response?.status === 403
          ? "Authentication failed. Please log in again."
          : error.response?.data?.message || "Failed to delete company";
      toast({ title: "Error", description: errorDesc, status: "error" });
    } finally {
      setIsDeletingCompany(false);
      onDeleteCompanyClose();
      setCompanyToDelete(null);
    }
  };

  // Filter companies based on search input
  const filteredCompanies = companies.filter((company) =>
    Object.values(company).some(
      (value) =>
        typeof value === "string" &&
        value.toLowerCase().includes(search.toLowerCase())
    )
  );

  // Calculate pagination values
  const indexOfLastCompany = currentPage * itemsPerPage;
  const indexOfFirstCompany = indexOfLastCompany - itemsPerPage;
  const currentCompanies = filteredCompanies.slice(
    indexOfFirstCompany,
    indexOfLastCompany
  );
  const totalPages = Math.ceil(filteredCompanies.length / itemsPerPage);

  // Handle page change
  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  // Handle search input change
  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
    setSearch(e.target.value);
  };

  // Update the table headers
  const tableHeaders = [
    "Company",
    "Store",
    "Entity Abbr.",
    "Business Address",
    "TIN",
    "Status",
    "Actions",
  ];

  // Add function to fetch consignees
  const fetchConsignees = async (companyId) => {
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/multiple-consignees`,
        { params: { companyId } }
      );
      setConsignees(response.data);
    } catch (error) {
      console.error("Error fetching consignees:", error);
      toast({
        title: "Error",
        description:
          error.response?.data?.message || "Failed to fetch consignees",
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "top-right",
      });
      setConsignees([]);
    }
  };

  // Add click handler for client cell
  const handleClientClick = async (company) => {
    setSelectedClient(company.companyName);
    await fetchConsignees(company._id);
    setIsConsigneeModalOpen(true);
  };

  // Handle consignee submission
  const handleConsigneeSubmit = async () => {
    setIsSavingConsignee(true);
    try {
      const currentCompany = companies.find(
        (c) => c.companyName === selectedClient
      );
      if (!currentCompany) throw new Error("Company not found");

      if (isEditMode) {
        // Update existing consignee
        await axios.put(
          `${process.env.NEXT_PUBLIC_BACKEND_API}/api/multiple-consignees/${editConsigneeId}`,
          { consigneeName: consigneeFormData.consigneeName }
        );
        toast({
          title: "Success",
          description: "Consignee updated successfully",
          status: "success",
          duration: 3000,
          isClosable: true,
          position: "top-right",
        });
      } else {
        // Create new consignee
        // Get the highest existing consignee ID
        const highestConsignee = await axios.get(
          `${process.env.NEXT_PUBLIC_BACKEND_API}/api/multiple-consignees`,
          {
            params: {
              companyId: currentCompany._id,
              sort: "-consigneeID",
              limit: 1,
            },
          }
        );

        // Generate new consignee ID
        let newNumber = 1;
        if (highestConsignee.data.length > 0) {
          const lastNumber = parseInt(
            highestConsignee.data[0].consigneeID.replace("CON", "")
          );
          newNumber = lastNumber + 1;
        }
        const newConsigneeID = `CON${String(newNumber).padStart(6, "0")}`;

        // Create the new consignee
        await axios.post(
          `${process.env.NEXT_PUBLIC_BACKEND_API}/api/multiple-consignees`,
          {
            consigneeName: consigneeFormData.consigneeName,
            consigneeID: newConsigneeID,
            companyId: currentCompany._id,
            clientId: currentCompany._id,
          }
        );

        toast({
          title: "Success",
          description: "Consignee added successfully",
          status: "success",
          duration: 3000,
          isClosable: true,
          position: "top-right",
        });
      }

      // Refresh the consignees list
      await fetchConsignees(currentCompany._id);

      // Refresh the main table data
      fetchCompanies();

      // Switch back to table view
      setIsConsigneeFormView(false);
      setIsEditMode(false);
      setEditConsigneeId(null);
    } catch (error) {
      console.error("Error with consignee:", error);
      toast({
        title: "Error",
        description:
          error.response?.data?.message || "Failed to process consignee",
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "top-right",
      });
    } finally {
      setIsSavingConsignee(false);
    }
  };

  // Handle delete consignee
  const handleDeleteConsigneeClick = (consignee) => {
    setConsigneeToDelete(consignee);
    onDeleteConsigneeOpen();
  };

  const confirmDeleteConsignee = async () => {
    if (!consigneeToDelete) return;
    const consigneeId = consigneeToDelete._id;

    setIsDeletingConsignee(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast({
          title: "Error",
          description: "Authentication token not found. Please log in again.",
          status: "error",
        });
        setIsDeletingConsignee(false);
        return;
      }
      await axios.delete(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/multiple-consignees/${consigneeId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      toast({
        title: "Success",
        description: `Consignee '${consigneeToDelete.consigneeName}' deleted successfully and logged`,
        status: "success",
      });

      // Refresh the consignees list in the modal
      const currentCompany = companies.find(
        (c) => c.companyName === selectedClient
      );
      if (currentCompany) {
        await fetchConsignees(currentCompany._id);
      }
      // Also refresh company count in the main table
      fetchCompanies();
    } catch (error) {
      const errorDesc =
        error.response?.status === 401 || error.response?.status === 403
          ? "Authentication failed. Please log in again."
          : error.response?.data?.message || "Failed to delete consignee";
      toast({ title: "Error", description: errorDesc, status: "error" });
    } finally {
      setIsDeletingConsignee(false);
      onDeleteConsigneeClose();
      setConsigneeToDelete(null);
    }
  };

  // Add this function near other utility functions
  const filteredConsignees = consignees.filter((consignee) => {
    return Object.values(consignee).some(
      (value) =>
        typeof value === "string" &&
        value.toLowerCase().includes(consigneeSearchTerm.toLowerCase())
    );
  });

  // Handle edit consignee
  const handleEditConsignee = (consignee) => {
    setEditConsigneeId(consignee._id);
    setConsigneeFormData({
      consigneeName: consignee.consigneeName,
    });
    setIsConsigneeFormView(true);
    setIsEditMode(true);
  };

  // Check access status
  const checkAccessStatus = async () => {
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/control-panel/reference/companies`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      const now = new Date();
      const approvedEdit = response.data.find(
        request => request.Status === "Approved" && request.RequestType === "Edit" && new Date(request.ExpiresAt) > now
      );
      const approvedDelete = response.data.find(
        request => request.Status === "Approved" && request.RequestType === "Delete" && new Date(request.ExpiresAt) > now
      );
      setHasEditAccess(!!approvedEdit);
      setHasDeleteAccess(!!approvedDelete);
      const approvedRequest = response.data.find(
        request => request.Status === "Approved" && new Date(request.ExpiresAt) > now
      );
      setAccessRequest(approvedRequest);
      setHasAccess(!!approvedRequest);
      const user = localStorage.getItem('username') || 'Unknown';
      setPendingEditRequest(
        !!response.data.find(r => r.Status === 'Pending' && r.RequestType === 'Edit' && r.Username === user)
      );
      setPendingDeleteRequest(
        !!response.data.find(r => r.Status === 'Pending' && r.RequestType === 'Delete' && r.Username === user)
      );
    } catch (error) {
      console.error("Error checking access status:", error);
    }
  };

  // Handle request access
  const handleRequestAccess = async () => {
    if (isSubmittingRequest) return;
    // Prevent duplicate Edit access requests if Edit access is still active
    if (requestType === 'Edit' && hasEditAccess) {
      toast({
        title: 'Edit Access Still Active',
        description: 'You already have active Edit access. Please wait for it to expire before requesting again.',
        status: 'warning',
        duration: 4000,
        isClosable: true,
      });
      return;
    }
    setIsSubmittingRequest(true);
    try {
      const requestData = {
        RequestID: `REQ_${Date.now()}`,
        Module: "Companies",
        UserRole: localStorage.getItem('userRole') || 'Billing Officer',
        Username: localStorage.getItem('username') || 'Unknown',
        RequestType: requestType,
        Remarks: requestRemarks,
        ReferenceID: "companies"
      };
      await axios.post(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/control-panel`,
        requestData,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      setIsRequestModalOpen(false);
      setRequestRemarks("");
      setRequestType("");
      toast({
        title: "Request Submitted",
        description: "Your access request has been submitted successfully",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      checkAccessStatus();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit access request",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  // Effect for timer
  useEffect(() => {
    if (accessRequest && accessRequest.ExpiresAt) {
      const expiresAt = new Date(accessRequest.ExpiresAt).getTime();
      const updateTimer = () => {
        const now = Date.now();
        const diff = Math.max(0, Math.floor((expiresAt - now) / 1000));
        setTimer(diff);
        if (diff <= 0) {
          setHasAccess(false);
          setAccessRequest(null);
          setHasEditAccess(false);
          setHasDeleteAccess(false);
          clearInterval(timerIntervalRef.current);
          checkAccessStatus();
        }
      };
      updateTimer();
      timerIntervalRef.current = setInterval(updateTimer, 1000);
      return () => clearInterval(timerIntervalRef.current);
    } else {
      setTimer(0);
      clearInterval(timerIntervalRef.current);
    }
  }, [accessRequest]);

  useEffect(() => {
    checkAccessStatus();
  }, []);

  // Helper to format seconds as hh:mm:ss
  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) {
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    } else {
      return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
  };

  // Consignee modal: check access status
  const checkModalAccessStatus = async () => {
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/control-panel/reference/consignees`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      const now = new Date();
      const approvedEdit = response.data.find(
        request => request.Status === "Approved" && request.RequestType === "Edit" && new Date(request.ExpiresAt) > now
      );
      const approvedDelete = response.data.find(
        request => request.Status === "Approved" && request.RequestType === "Delete" && new Date(request.ExpiresAt) > now
      );
      setModalHasEditAccess(!!approvedEdit);
      setModalHasDeleteAccess(!!approvedDelete);
      const approvedRequest = response.data.find(
        request => request.Status === "Approved" && new Date(request.ExpiresAt) > now
      );
      setModalAccessRequest(approvedRequest);
      setModalHasAccess(!!approvedRequest);
      const user = localStorage.getItem('username') || 'Unknown';
      setModalPendingEditRequest(
        !!response.data.find(r => r.Status === 'Pending' && r.RequestType === 'Edit' && r.Username === user)
      );
      setModalPendingDeleteRequest(
        !!response.data.find(r => r.Status === 'Pending' && r.RequestType === 'Delete' && r.Username === user)
      );
    } catch (error) {
      console.error("Error checking consignee modal access status:", error);
    }
  };

  // Consignee modal: handle request access
  const handleModalRequestAccess = async () => {
    if (isModalSubmittingRequest) return;
    // Prevent duplicate Edit access requests if Edit access is still active
    if (modalRequestType === 'Edit' && modalHasEditAccess) {
      toast({
        title: 'Edit Access Still Active',
        description: 'You already have active Edit access for consignees. Please wait for it to expire before requesting again.',
        status: 'warning',
        duration: 4000,
        isClosable: true,
      });
      return;
    }
    setIsModalSubmittingRequest(true);
    try {
      const requestData = {
        RequestID: `REQ_${Date.now()}`,
        Module: "Consignees",
        UserRole: localStorage.getItem('userRole') || 'Billing Officer',
        Username: localStorage.getItem('username') || 'Unknown',
        RequestType: modalRequestType,
        Remarks: modalRequestRemarks,
        ReferenceID: "consignees"
      };
      await axios.post(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/api/control-panel`,
        requestData,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      setIsModalRequestOpen(false);
      setModalRequestRemarks("");
      setModalRequestType("");
      toast({
        title: "Request Submitted",
        description: "Your access request has been submitted successfully",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      checkModalAccessStatus();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit access request",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsModalSubmittingRequest(false);
    }
  };

  // Consignee modal: timer effect
  useEffect(() => {
    if (isConsigneeModalOpen) checkModalAccessStatus();
  }, [isConsigneeModalOpen]);
  useEffect(() => {
    if (modalAccessRequest && modalAccessRequest.ExpiresAt) {
      const expiresAt = new Date(modalAccessRequest.ExpiresAt).getTime();
      const updateTimer = () => {
        const now = Date.now();
        const diff = Math.max(0, Math.floor((expiresAt - now) / 1000));
        setModalTimer(diff);
        if (diff <= 0) {
          setModalHasAccess(false);
          setModalAccessRequest(null);
          setModalHasEditAccess(false);
          setModalHasDeleteAccess(false);
          clearInterval(modalTimerIntervalRef.current);
          checkModalAccessStatus();
        }
      };
      updateTimer();
      modalTimerIntervalRef.current = setInterval(updateTimer, 1000);
      return () => clearInterval(modalTimerIntervalRef.current);
    } else {
      setModalTimer(0);
      clearInterval(modalTimerIntervalRef.current);
    }
  }, [modalAccessRequest]);

  // Helper to format seconds as hh:mm:ss
  const formatModalTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) {
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    } else {
      return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
  };

  return (
    <Box
      p={8}
      maxW="100%"
      mx="auto"
      bg="white"
      borderRadius="xl"
      boxShadow="md"
      height="calc(100vh - 160px)"
    >
      {/* Header Section */}
      <Box
        py={4}
        px={6}
        color="#1a365d"
        borderRadius="md"
        mb={6}
        borderBottom="1px solid"
        borderColor="#E2E8F0"
      >
        <Heading size="2xl" fontWeight="bold">
          Company Management
        </Heading>
        <Text mt={2} fontSize="md" color="gray.600">
          Manage company accounts and information
        </Text>
      </Box>

      {/* Search, Add Company, and Request Access */}
      <Flex direction="column" mb={6} px={6}>
        <Flex align="center" gap={3}>
          <Button
            onClick={handleAdd}
            leftIcon={<AddIcon />}
            bg="#800020"
            color="white"
            _hover={{ bg: "#600010" }}
            _active={{ bg: "#400000" }}
            size="md"
            borderRadius="md"
            boxShadow="sm"
          >
            Add Company
          </Button>
          <InputGroup maxW="400px">
            <InputLeftElement pointerEvents="none">
              <Search2Icon color="gray.500" />
            </InputLeftElement>
            <Input
              placeholder="Search companies..."
              value={searchQuery}
              onChange={handleSearch}
              borderRadius="md"
              borderColor="gray.300"
              _hover={{ borderColor: "#800020" }}
              _focus={{
                borderColor: "#800020",
                boxShadow: "0 0 0 1px #800020",
              }}
            />
          </InputGroup>
          <Tooltip label={hasAccess ? 'You have temporary access to Edit/Delete' : 'Request temporary access to Edit/Delete'}>
            <Button
              leftIcon={<LockIcon />}
              variant="solid"
              colorScheme={hasAccess ? "green" : "purple"}
              onClick={() => setIsRequestModalOpen(true)}
              size="md"
              boxShadow="md"
              transition="all 0.2s"
              _hover={{ transform: "scale(1.05)" }}
              rightIcon={hasAccess ? <CheckIcon /> : null}
            >
              {hasAccess ? "Access Granted" : "Request Access"}
            </Button>
          </Tooltip>
          {hasAccess && accessRequest && accessRequest.ExpiresAt && timer > 0 && (
            <Badge colorScheme="purple" fontSize="1em" px={3} py={1} borderRadius="full">
              <Icon as={FiClock} mr={1} /> {formatTime(timer)}
            </Badge>
          )}
          <Tooltip label="Access to Edit/Delete is time-limited for security.">
            <InfoIcon color="gray.400" />
          </Tooltip>
        </Flex>
      </Flex>

      {/* Table Container */}
      <Box
        borderWidth="1px"
        borderRadius="lg"
        borderColor="#E2E8F0"
        boxShadow="0px 2px 8px rgba(0, 0, 0, 0.06)"
        overflow="hidden"
        mx={6}
      >
        <TableContainer maxHeight="calc(100vh - 280px)" overflowY="auto">
          <Table variant="simple" size="sm">
            <Thead
              bg="#F7FAFC"
              position="sticky"
              top={0}
              zIndex={1}
              boxShadow="0 1px 2px rgba(0,0,0,0.05)"
            >
              <Tr>
                {[
                  { name: "COMPANY", width: "20%", align: "left" },
                  { name: "STORE", width: "15%", align: "left" },
                  { name: "ENTITY ABBR.", width: "15%", align: "left" },
                  { name: "BUSINESS ADDRESS", width: "25%", align: "left" },
                  { name: "TIN", width: "15%", align: "left" },
                  { name: "STATUS", width: "10%", align: "left" },
                  { name: "ACTIONS", width: "10%", align: "center" },
                ].map((header) => (
                  <Th
                    key={header.name}
                    fontSize="xs"
                    fontWeight="semibold"
                    color="black"
                    py={3}
                    px={4}
                    width={header.width}
                    textAlign={header.align}
                    borderBottom="1px solid"
                    borderColor="#1a365d"
                    textTransform="uppercase"
                    letterSpacing="0.5px"
                  >
                    {header.name}
                  </Th>
                ))}
              </Tr>
            </Thead>
            <Tbody>
              {currentCompanies.map((company, index) => (
                <Tr
                  key={company._id}
                  _hover={{ bg: "#F0F7FF" }}
                  transition="all 0.2s"
                  bg={index % 2 === 0 ? "white" : "gray.50"}
                  borderBottom="1px solid"
                  borderColor="#E2E8F0"
                >
                  <Td fontWeight="medium" color="#1a365d">
                    {company.companyName}
                  </Td>
                  <Td
                    cursor="pointer"
                    _hover={{ textDecoration: "underline" }}
                    onClick={() => handleClientClick(company)}
                  >
                    <Text
                      color="#000080"
                      border="1px solid"
                      borderColor="#000080"
                      borderRadius="md"
                      px={2}
                      py={1}
                      display="inline-block"
                    >
                      {company.consigneeCount || 0} Store
                      {company.consigneeCount !== 1 ? "s" : ""}
                    </Text>
                  </Td>
                  <Td fontWeight="semibold">{company.entityAbbreviation}</Td>
                  <Td color="gray.600">
                    {company.entityAbbreviation
                      ? `${company.entityAbbreviation} - ${
                          company.businessAddress || ""
                        }`
                      : company.businessAddress || "-"}
                  </Td>
                  <Td color="gray.600">
                    {company.tin
                      ? company.tin.replace(/(\d{3})(\d{3})(\d{5})/, "$1-$2-$3")
                      : ""}
                  </Td>
                  <Td>
                    <Badge
                      bg={company.status === "Active" ? "#1a365d" : "#800020"}
                      color="white"
                      borderRadius="md"
                      px={2}
                      py={1}
                    >
                      {company.status}
                    </Badge>
                  </Td>
                  <Td>
                    <HStack spacing={2} justify="center">
                      <IconButton
                        aria-label="Edit"
                        icon={<EditIcon />}
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEdit(company._id)}
                        color="#800020"
                        _hover={{ bg: "red.50" }}
                        isDisabled={!hasEditAccess}
                      />
                      <IconButton
                        aria-label="Delete"
                        icon={<DeleteIcon />}
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteCompanyClick(company)}
                        colorScheme="red"
                        isDisabled={!hasDeleteAccess}
                      />
                    </HStack>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </TableContainer>
      </Box>

      {/* Pagination Controls */}
      <Flex justify="center" mt={8} gap={2}>
        <Button
          onClick={() => handlePageChange(currentPage - 1)}
          isDisabled={currentPage === 1}
          leftIcon={<ChevronLeftIcon />}
          size="md"
          height="40px"
          px={4}
          variant="outline"
          colorScheme="blue"
          _hover={{ bg: "#1a365d", color: "white" }}
        >
          Previous
        </Button>

        {[...Array(totalPages)].map((_, index) => (
          <Button
            key={index + 1}
            onClick={() => handlePageChange(index + 1)}
            size="md"
            height="40px"
            px={4}
            variant={currentPage === index + 1 ? "solid" : "outline"}
            colorScheme="yellow"
          >
            {index + 1}
          </Button>
        ))}

        <Button
          onClick={() => handlePageChange(currentPage + 1)}
          isDisabled={currentPage === totalPages}
          rightIcon={<ChevronRightIcon />}
          size="md"
          height="40px"
          px={4}
          variant="outline"
          colorScheme="blue"
          _hover={{ bg: "#1a365d", color: "white" }}
        >
          Next
        </Button>
      </Flex>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        size="2xl"
      >
        <ModalOverlay bg="blackAlpha.600" backdropFilter="blur(2px)" />
        <ModalContent>
          <ModalHeader bg="#1a365d" color="white">
            {formData._id ? "Edit Company" : "Add New Company"}
          </ModalHeader>
          <ModalCloseButton color="white" />
          <ModalBody p={6}>
            <VStack spacing={6}>
              <SimpleGrid columns={2} spacing={4} w="full">
                <FormControl isRequired>
                  <FormLabel>Company Name</FormLabel>
                  <Input
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleInputChange}
                    borderColor="#1a365d"
                    _hover={{ borderColor: "#800020" }}
                    _focus={{
                      borderColor: "#800020",
                      boxShadow: "0 0 0 1px #800020",
                    }}
                  />
                </FormControl>

                <FormControl isRequired>
                  <FormLabel>Entity Abbreviation</FormLabel>
                  <Input
                    name="entityAbbreviation"
                    value={formData.entityAbbreviation || ""}
                    onChange={(e) => {
                      const upperValue = e.target.value.toUpperCase();
                      setFormData((prev) => ({
                        ...prev,
                        entityAbbreviation: upperValue,
                      }));
                    }}
                    borderColor="#1a365d"
                    _hover={{ borderColor: "#800020" }}
                    _focus={{
                      borderColor: "#800020",
                      boxShadow: "0 0 0 1px #800020",
                    }}
                    placeholder="e.g., ABC, XYZ"
                    maxLength={5}
                  />
                </FormControl>

                <FormControl isRequired>
                  <FormLabel>Business Address</FormLabel>
                  <Input
                    name="businessAddress"
                    value={formData.businessAddress || ""}
                    onChange={handleInputChange}
                    borderColor="#1a365d"
                    _hover={{ borderColor: "#800020" }}
                    _focus={{
                      borderColor: "#800020",
                      boxShadow: "0 0 0 1px #800020",
                    }}
                  />
                </FormControl>

                <FormControl isRequired>
                  <FormLabel>TIN</FormLabel>
                  <Input
                    name="tin"
                    value={
                      formData.tin
                        ? formData.tin.replace(
                            /(\d{3})(\d{3})(\d{5})/,
                            "$1-$2-$3"
                          )
                        : ""
                    }
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9]/g, "");
                      handleInputChange({ target: { name: "tin", value } });
                    }}
                    placeholder="Only accepts numbers"
                    borderColor="#1a365d"
                    _hover={{ borderColor: "#800020" }}
                    _focus={{
                      borderColor: "#800020",
                      boxShadow: "0 0 0 1px #800020",
                    }}
                  />
                </FormControl>

                <FormControl isRequired>
                  <FormLabel>Status</FormLabel>
                  <Select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    borderColor="#1a365d"
                    _hover={{ borderColor: "#800020" }}
                    _focus={{
                      borderColor: "#800020",
                      boxShadow: "0 0 0 1px #800020",
                    }}
                  >
                    <option value="">Select Status</option>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </Select>
                </FormControl>
              </SimpleGrid>
            </VStack>
          </ModalBody>
          <ModalFooter borderTopWidth="2px" borderColor="#800020">
            <Button
              variant="outline"
              mr={3}
              onClick={() => setIsModalOpen(false)}
              color="#1a365d"
              borderColor="#1a365d"
            >
              Cancel
            </Button>
            <Button
              bg="#800020"
              color="white"
              _hover={{ bg: "#600010" }}
              onClick={handleSubmit}
              isLoading={isSavingCompany}
              loadingText={formData._id ? "Saving..." : "Adding..."}
            >
              {formData._id ? "Save Changes" : "Add Company"}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal
        isOpen={isConsigneeModalOpen}
        onClose={() => {
          setIsConsigneeModalOpen(false);
          setIsConsigneeFormView(false);
          setConsigneeSearchTerm("");
          setIsEditMode(false);
          setEditConsigneeId(null);
        }}
        size="6xl"
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            <Flex justify="space-between" align="flex-start" direction="column">
              <Box fontSize="xl" fontWeight="semibold" mb={2}>
                {isConsigneeFormView
                  ? isEditMode
                    ? "Edit Consignee"
                    : "Add New Consignee"
                  : `Consignees for ${selectedClient}`}
              </Box>
              <Flex align="center" gap={2} width="100%">
                {!isConsigneeFormView && (
                  <Input
                    placeholder="Search consignees..."
                    size="md"
                    width="300px"
                    borderRadius="md"
                    focusBorderColor="blue.500"
                    _placeholder={{ color: "gray.400" }}
                    variant="filled"
                    bg="gray.50"
                    _hover={{ bg: "gray.100" }}
                    value={consigneeSearchTerm}
                    onChange={(e) => setConsigneeSearchTerm(e.target.value)}
                    leftElement={<Search2Icon color="gray.400" mr={2} />}
                  />
                )}
                {!isConsigneeFormView && (
                  <Button
                    leftIcon={<AddIcon />}
                    colorScheme="blue"
                    onClick={() => {
                      setIsConsigneeFormView(true);
                      setConsigneeFormData({
                        consigneeName: "",
                      });
                      setIsEditMode(false);
                      setEditConsigneeId(null);
                    }}
                  >
                    Add Consignee
                  </Button>
                )}
                {!isConsigneeFormView && (
                  <Tooltip label={modalHasAccess ? 'You have temporary access to Edit/Delete' : 'Request temporary access to Edit/Delete'}>
                    <Button
                      leftIcon={<LockIcon />}
                      variant="solid"
                      colorScheme={modalHasAccess ? "green" : "purple"}
                      onClick={() => setIsModalRequestOpen(true)}
                      size="md"
                      boxShadow="md"
                      transition="all 0.2s"
                      _hover={{ transform: "scale(1.05)" }}
                      rightIcon={modalHasAccess ? <CheckIcon /> : null}
                    >
                      {modalHasAccess ? "Access Granted" : "Request Access"}
                    </Button>
                  </Tooltip>
                )}
                {modalHasAccess && modalAccessRequest && modalAccessRequest.ExpiresAt && modalTimer > 0 && (
                  <Badge colorScheme="purple" fontSize="1em" px={3} py={1} borderRadius="full">
                    <Icon as={FiClock} mr={1} /> {formatModalTime(modalTimer)}
                  </Badge>
                )}
                <Tooltip label="Access to Edit/Delete is time-limited for security.">
                  <InfoIcon color="gray.400" />
                </Tooltip>
              </Flex>
            </Flex>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {isConsigneeFormView ? (
              // Form View
              <VStack spacing={4}>
                <FormControl>
                  <FormLabel>Consignee Name</FormLabel>
                  <Input
                    value={consigneeFormData.consigneeName}
                    onChange={(e) =>
                      setConsigneeFormData((prev) => ({
                        ...prev,
                        consigneeName: e.target.value,
                      }))
                    }
                  />
                </FormControl>
              </VStack>
            ) : (
              // Table View
              <TableContainer>
                <Table variant="simple">
                  <Thead>
                    <Tr>
                      <Th>Consignee Name</Th>
                      <Th>Actions</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {filteredConsignees.length > 0 ? (
                      filteredConsignees.map((consignee) => (
                        <Tr key={consignee._id}>
                          <Td>{consignee.consigneeName}</Td>
                          <Td>
                            <Flex gap={2}>
                              <IconButton
                                icon={<EditIcon />}
                                size="sm"
                                variant="ghost"
                                color="blue.500"
                                onClick={() => handleEditConsignee(consignee)}
                                _hover={{ bg: "blue.50" }}
                                isDisabled={!modalHasEditAccess}
                              />
                              <IconButton
                                icon={<DeleteIcon />}
                                size="sm"
                                variant="ghost"
                                color="red.500"
                                onClick={() => handleDeleteConsigneeClick(consignee)}
                                _hover={{ bg: "red.50" }}
                                isDisabled={!modalHasDeleteAccess}
                              />
                            </Flex>
                          </Td>
                        </Tr>
                      ))
                    ) : (
                      <Tr>
                        <Td colSpan={3} textAlign="center" py={8}>
                          <Text fontSize="lg" color="gray.500">
                            No Consignee Found
                          </Text>
                        </Td>
                      </Tr>
                    )}
                  </Tbody>
                </Table>
              </TableContainer>
            )}
          </ModalBody>
          {isConsigneeFormView && (
            <ModalFooter>
              <Button
                variant="outline"
                mr={3}
                onClick={() => setIsConsigneeFormView(false)}
              >
                Cancel
              </Button>
              <Button
                colorScheme="blue"
                isLoading={isSavingConsignee}
                onClick={handleConsigneeSubmit}
              >
                {isEditMode ? "Update Consignee" : "Save Consignee"}
              </Button>
            </ModalFooter>
          )}
        </ModalContent>
      </Modal>

      <AlertDialog
        isOpen={isDeleteCompanyOpen}
        leastDestructiveRef={cancelRef}
        onClose={onDeleteCompanyClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete Company
            </AlertDialogHeader>
            <AlertDialogBody>
              Are you sure you want to delete the company "
              {companyToDelete?.companyName}"? This action will move the company
              data to the delete logs.
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onDeleteCompanyClose}>
                Cancel
              </Button>
              <Button
                colorScheme="red"
                isLoading={isDeletingCompany}
                onClick={confirmDeleteCompany}
                ml={3}
              >
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>

      <AlertDialog
        isOpen={isDeleteConsigneeOpen}
        leastDestructiveRef={cancelRef}
        onClose={onDeleteConsigneeClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete Consignee
            </AlertDialogHeader>
            <AlertDialogBody>
              Are you sure you want to delete the consignee "
              {consigneeToDelete?.consigneeName}" for {selectedClient}? This
              action will move the consignee data to the delete logs.
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onDeleteConsigneeClose}>
                Cancel
              </Button>
              <Button
                colorScheme="red"
                isLoading={isDeletingConsignee}
                onClick={confirmDeleteConsignee}
                ml={3}
              >
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>

      {/* Request Access Modal */}
      <Modal isOpen={isRequestModalOpen} onClose={() => !isSubmittingRequest && setIsRequestModalOpen(false)} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Request Access</ModalHeader>
          {!isSubmittingRequest && <ModalCloseButton />}
          <ModalBody position="relative">
            {isSubmittingRequest && (
              <Box position="absolute" top={0} left={0} w="100%" h="100%" bg="whiteAlpha.700" zIndex={10} display="flex" alignItems="center" justifyContent="center">
                <Spinner size="xl" color="purple.500" thickness="4px" speed="0.7s" label="Submitting..." />
              </Box>
            )}
            <VStack spacing={4} align="stretch" opacity={isSubmittingRequest ? 0.5 : 1} pointerEvents={isSubmittingRequest ? "none" : "auto"}>
              {isSubmittingRequest && (
                <Alert status="info" borderRadius="md">
                  <AlertIcon />
                  Submitting your request...
                </Alert>
              )}
              {requestType && requestRemarks && !isSubmittingRequest && (
                <Alert status="info" borderRadius="md">
                  <AlertIcon />
                  <Box>
                    <b>Summary:</b> You are requesting <b>{requestType}</b> access.<br />
                    <b>Remarks:</b> {requestRemarks}
                  </Box>
                </Alert>
              )}
              <FormControl isRequired>
                <FormLabel>Request Type</FormLabel>
                <Select
                  value={requestType}
                  onChange={(e) => setRequestType(e.target.value)}
                  placeholder="Select request type"
                  isDisabled={isSubmittingRequest}
                >
                  <option value="Edit" disabled={pendingEditRequest}>Edit Access</option>
                  <option value="Delete" disabled={pendingDeleteRequest}>Delete Access</option>
                </Select>
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Remarks</FormLabel>
                <Textarea
                  value={requestRemarks}
                  onChange={(e) => setRequestRemarks(e.target.value)}
                  placeholder="Enter reason for access request"
                  resize="vertical"
                  minH="80px"
                  isDisabled={isSubmittingRequest}
                />
              </FormControl>
              {isSubmittingRequest && (
                <Progress size="xs" isIndeterminate colorScheme="purple" borderRadius="md" />
              )}
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="ghost"
              mr={3}
              onClick={() => setIsRequestModalOpen(false)}
              isDisabled={isSubmittingRequest}
            >
              Cancel
            </Button>
            <Button
              colorScheme="purple"
              onClick={handleRequestAccess}
              isLoading={isSubmittingRequest}
              isDisabled={!requestType || !requestRemarks || isSubmittingRequest}
            >
              Submit Request
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Consignee Modal Request Access Modal */}
      <Modal isOpen={isModalRequestOpen} onClose={() => !isModalSubmittingRequest && setIsModalRequestOpen(false)} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Request Access</ModalHeader>
          {!isModalSubmittingRequest && <ModalCloseButton />}
          <ModalBody position="relative">
            {isModalSubmittingRequest && (
              <Box position="absolute" top={0} left={0} w="100%" h="100%" bg="whiteAlpha.700" zIndex={10} display="flex" alignItems="center" justifyContent="center">
                <Spinner size="xl" color="purple.500" thickness="4px" speed="0.7s" label="Submitting..." />
              </Box>
            )}
            <VStack spacing={4} align="stretch" opacity={isModalSubmittingRequest ? 0.5 : 1} pointerEvents={isModalSubmittingRequest ? "none" : "auto"}>
              {isModalSubmittingRequest && (
                <Alert status="info" borderRadius="md">
                  <AlertIcon />
                  Submitting your request...
                </Alert>
              )}
              {modalRequestType && modalRequestRemarks && !isModalSubmittingRequest && (
                <Alert status="info" borderRadius="md">
                  <AlertIcon />
                  <Box>
                    <b>Summary:</b> You are requesting <b>{modalRequestType}</b> access.<br />
                    <b>Remarks:</b> {modalRequestRemarks}
                  </Box>
                </Alert>
              )}
              <FormControl isRequired>
                <FormLabel>Request Type</FormLabel>
                <Select
                  value={modalRequestType}
                  onChange={(e) => setModalRequestType(e.target.value)}
                  placeholder="Select request type"
                  isDisabled={isModalSubmittingRequest}
                >
                  <option value="Edit" disabled={modalPendingEditRequest}>Edit Access</option>
                  <option value="Delete" disabled={modalPendingDeleteRequest}>Delete Access</option>
                </Select>
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Remarks</FormLabel>
                <Textarea
                  value={modalRequestRemarks}
                  onChange={(e) => setModalRequestRemarks(e.target.value)}
                  placeholder="Enter reason for access request"
                  resize="vertical"
                  minH="80px"
                  isDisabled={isModalSubmittingRequest}
                />
              </FormControl>
              {isModalSubmittingRequest && (
                <Progress size="xs" isIndeterminate colorScheme="purple" borderRadius="md" />
              )}
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="ghost"
              mr={3}
              onClick={() => setIsModalRequestOpen(false)}
              isDisabled={isModalSubmittingRequest}
            >
              Cancel
            </Button>
            <Button
              colorScheme="purple"
              onClick={handleModalRequestAccess}
              isLoading={isModalSubmittingRequest}
              isDisabled={!modalRequestType || !modalRequestRemarks || isModalSubmittingRequest}
            >
              Submit Request
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
