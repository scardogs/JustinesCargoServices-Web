import React, { useEffect } from "react";
import IOSidebarWithHeader from "../components/InventoryOfficer/IOSidebarWithHeader";
import { useRouter } from "next/router";

const InventoryOfficerPage = () => {
  const router = useRouter();

  // Check if user is not an Inventory Officer and redirect if necessary
  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user && user.workLevel !== "Inventory Officer") {
          router.replace("/dashboard");
        }
      } catch (e) {
        console.error("Error parsing user data", e);
      }
    }
  }, [router]);

  return <IOSidebarWithHeader />;
};

export default InventoryOfficerPage;
