import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import SidebarWithHeader from "../components/MainPage/SidebarWithHeader";
import HRSidebarWithHeader from "../components/HR/HRSidebarWithHeader";
import ASidebarWithHeader from "../components/Admin/ASidebarWithHeader";

export default function PayrollPage() {
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
          router.replace("/hr/payroll");
        } else if (
          user.workLevel === "Admin" ||
          user.workLevel === "Super Admin"
        ) {
          router.replace("/admin/payroll");
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
