import axios from "axios";

// Create an Axios instance
const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BACKEND_API, // Ensure this env variable is set
  headers: {
    "Content-Type": "application/json",
  },
});

// Request Interceptor: Attaches the auth token to requests
apiClient.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      // Check if running in browser
      const token = localStorage.getItem("token");
      if (token) {
        config.headers["Authorization"] = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Handles errors, specifically 401/403 for session expiry
apiClient.interceptors.response.use(
  (response) => {
    // Successful response (status 2xx)
    return response;
  },
  (error) => {
    // Error response
    if (
      error.response &&
      (error.response.status === 401 || error.response.status === 403)
    ) {
      console.warn(
        "Interceptor: Detected 401/403 error. Dispatching sessionExpired event."
      );
      // Dispatch a custom event that the UI can listen for
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("sessionExpired"));
      }
      // Do NOT redirect here. Let the UI handle it via the event.
      // Return a rejected promise to stop the original call chain
      return Promise.reject(new Error("Session expired or invalid."));
    }

    // For other errors, just reject the promise so the calling code can handle them
    return Promise.reject(error);
  }
);

export default apiClient;
