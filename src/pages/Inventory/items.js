import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import SidebarWithHeader from "../../components/MainPage/SidebarWithHeader";

export default function InventoryItemsPage() {
  const [userRole, setUserRole] = useState(null);
  const router = useRouter();

  useEffect(() => {
    // Get user role from localStorage
    try {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        const user = JSON.parse(storedUser);
        setUserRole(user.workLevel);

        // If user is Inventory Officer, redirect to Inventory Officer specific page
        if (user.workLevel === "Inventory Officer") {
          router.replace("/inventory-officer/items");
        }
      }
    } catch (error) {
      console.error("Error parsing user data:", error);
    }
  }, [router]);

  // If still loading or already redirecting, show nothing
  if (!userRole || userRole === "Inventory Officer") {
    return null;
  }

  // For other users, show the regular sidebar
  return <SidebarWithHeader />;
}
