import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import SidebarWithHeader from "../../components/MainPage/SidebarWithHeader";

export default function InventoryWarehousePage() {
  const [userRole, setUserRole] = useState(null);
  const router = useRouter();

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        const user = JSON.parse(storedUser);
        setUserRole(user.workLevel);

        if (user.workLevel === "Inventory Officer") {
          router.replace("/inventory-officer/warehouse");
        }
      }
    } catch (error) {
      console.error("Error parsing user data:", error);
    }
  }, [router]);

  if (!userRole || userRole === "Inventory Officer") {
    return null;
  }

  return <SidebarWithHeader />;
}
