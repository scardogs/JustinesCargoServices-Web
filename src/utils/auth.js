export const isAuthenticated = () => {
  if (typeof window !== "undefined") {
    return !!localStorage.getItem("token");
  }
  return false;
};

// A mapping of workLevel to redirect paths for direct lookup
const redirectMap = {
  "Waybill Officer": "/waybill-officer",
  Scheduler: "/scheduler-officer",
  "Inventory Officer": "/inventory-officer",
  HR: "/hr-officer",
  Admin: "/admin-page",
  "System Admin": "/users",
  "Billing Officer": "/billing-officer",
};

// Optimized version - minimal operations, no console logs
export const getRedirectPath = () => {
  if (typeof window === "undefined") return "/dashboard";

  try {
    const userStr = localStorage.getItem("user");
    if (!userStr) return "/dashboard";

    const user = JSON.parse(userStr);
    return user?.workLevel
      ? redirectMap[user.workLevel] || "/dashboard"
      : "/dashboard";
  } catch (e) {
    return "/dashboard";
  }
};

export const logout = () => {
  if (typeof window !== "undefined") {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  }
};
