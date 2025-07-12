import React, { useEffect } from "react";
import BSidebarWithHeader from "../components/BillingOfficer/BSidebarWithHeader";
import { useRouter } from "next/router";

const BillingOfficerPage = () => {
  const router = useRouter();

  useEffect(() => {
    // Set currentPath to /dashboard when this page loads/refreshes.
    // BSidebarWithHeader will pick this up for its currentComponent state.
    if (typeof window !== "undefined") {
      localStorage.setItem("currentPath", "/dashboard");
    }

    const userStr = localStorage.getItem("user");
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user && user.workLevel !== "Billing Officer") {
          router.replace("/dashboard"); // Or an appropriate page
        }
      } catch (e) {
        console.error("Error parsing user data", e);
        router.replace("/dashboard"); // Fallback redirect
      }
    } else {
      // If no user data, redirect to login or dashboard
      router.replace("/");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount to set the path and check auth

  return <BSidebarWithHeader />;
};

export default BillingOfficerPage;
