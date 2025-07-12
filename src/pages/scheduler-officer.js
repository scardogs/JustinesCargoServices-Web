import React, { useEffect } from "react";
import SOSidebarWithHeader from "../components/SchedulerOfficer/SOSidebarWithHeader";
import { useRouter } from "next/router";

const SchedulerOfficerPage = () => {
  const router = useRouter();

  // Check if user is not a Scheduler and redirect if necessary
  useEffect(() => {
    // Set currentPath to /dashboard when this page loads/refreshes.
    // SOSidebarWithHeader will pick this up for its currentComponent state.
    if (typeof window !== "undefined") {
      localStorage.setItem("currentPath", "/dashboard");
    }

    const userStr = localStorage.getItem("user");
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user && user.workLevel !== "Scheduler") {
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

  return <SOSidebarWithHeader />;
};

export default SchedulerOfficerPage;
