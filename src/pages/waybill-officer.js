import React, { useEffect } from "react";
import WOSidebarWithHeader from "../components/WaybillOffiicer/WOSidebarWithHeader";
import { useRouter } from "next/router";

const WaybillOfficerPage = () => {
  const router = useRouter();

  // Check if user is not a Waybill Officer and redirect if necessary
  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user && user.workLevel !== "Waybill Officer") {
          router.replace("/dashboard");
        }
      } catch (e) {
        console.error("Error parsing user data", e);
      }
    }
  }, [router]);

  return <WOSidebarWithHeader />;
};

export default WaybillOfficerPage;
