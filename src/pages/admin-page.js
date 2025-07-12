import React, { useEffect } from "react";
import ASidebarWithHeader from "../components/Admin/ASidebarWithHeader";
import { useRouter } from "next/router";

const AdminPage = () => {
  const router = useRouter();

  // Check if user is not an Admin and redirect if necessary
  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        // Only allow Admin users, redirect Super Admin to /users
        if (user) {
          if (user.workLevel === "Super Admin") {
            router.replace("/users");
          } else if (user.workLevel !== "Admin") {
            router.replace("/dashboard");
          }
        }
      } catch (e) {
        console.error("Error parsing user data", e);
      }
    }
  }, [router]);

  return <ASidebarWithHeader />;
};

export default AdminPage;
