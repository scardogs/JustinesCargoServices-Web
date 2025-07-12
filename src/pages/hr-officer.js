import React, { useEffect } from "react";
import HRSidebarWithHeader from "../components/HR/HRSidebarWithHeader";
import { useRouter } from "next/router";

const HROfficerPage = () => {
  const router = useRouter();

  // Check if user is not an HR and redirect if necessary
  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user && user.workLevel !== "HR") {
          router.replace("/dashboard");
        }
      } catch (e) {
        console.error("Error parsing user data", e);
      }
    }
  }, [router]);

  return <HRSidebarWithHeader />;
};

export default HROfficerPage;
