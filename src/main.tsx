import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ApiError } from "@/api/http";
import { keys } from "@/api/queries";
import "@/i18n"; // Must import before App to initialize i18n
import App from "@/App";
import "@/styles/index.scss";

// UNAUTHORIZED anywhere means the admin session ended: show the sign-in form.
const onError = (error: Error) => {
  if (error instanceof ApiError && error.code === "UNAUTHORIZED") queryClient.setQueryData(keys.session, false);
};

// Error codes that should trigger retries (transient server errors)
const RETRIABLE_CODES = ["INTERNAL_ERROR", "UNAVAILABLE"] as const;

const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError }),
  mutationCache: new MutationCache({ onError }),
  defaultOptions: {
    queries: {
      retry: (count, error) =>
        error instanceof ApiError && RETRIABLE_CODES.includes(error.code as (typeof RETRIABLE_CODES)[number]) && count < 2,
      refetchOnWindowFocus: false,
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);
