import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import SidebarWithHeader from "../components/MainPage/SidebarWithHeader";

export default function EmployeesPage() {
  const [userRole, setUserRole] = useState(null);
  const router = useRouter();

  useEffect(() => {
    // Get user role from localStorage
    try {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        const user = JSON.parse(storedUser);
        setUserRole(user.workLevel);

        // Handle role-specific redirects
        if (user.workLevel === "HR") {
          router.replace("/hr/employees");
        } else if (
          user.workLevel === "Admin" ||
          user.workLevel === "Super Admin"
        ) {
          router.replace("/admin/employees");
        }
      }
    } catch (error) {
      console.error("Error parsing user data:", error);
    }
  }, [router]);

  // If still loading or already redirecting, show nothing
  if (
    !userRole ||
    userRole === "HR" ||
    userRole === "Admin" ||
    userRole === "Super Admin"
  ) {
    return null;
  }

  // For other users, show the regular sidebar
  return <SidebarWithHeader />;
}
