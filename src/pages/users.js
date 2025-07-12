import React, { useEffect } from "react";
import SidebarWithHeader from "../components/MainPage/SidebarWithHeader";
import { useRouter } from "next/router";

export default function UsersPage() {
  const router = useRouter();

  // Check if user is not a Super Admin and redirect if necessary
  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        // Only allow Super Admin users, redirect Admin to /admin-page
        if (user) {
          if (user.workLevel === "Admin") {
            router.replace("/admin-page");
          } else if (user.workLevel !== "System Admin") {
            router.replace("/dashboard");
          }
        }
      } catch (e) {
        console.error("Error parsing user data", e);
      }
    }
  }, [router]);

  return <SidebarWithHeader />;
}
