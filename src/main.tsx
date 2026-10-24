import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "sonner";
import { AppRoutes } from "./App";
import { AuthProvider } from "./hooks/useAuth";
import { ApiError } from "./services/api";
import { useUI } from "./stores/ui";
import "./index.css";

const client = new QueryClient({ defaultOptions: { queries: { retry: (n, e) => !(e instanceof ApiError && e.status >= 400 && e.status < 500) && n < 2, refetchOnWindowFocus: false } } });

function Root() {
  const theme = useUI((s) => s.theme);
  return (
    <QueryClientProvider client={client}>
      <BrowserRouter><AuthProvider><AppRoutes /></AuthProvider></BrowserRouter>
      <Toaster theme={theme} position="bottom-right" richColors closeButton />
    </QueryClientProvider>
  );
}
ReactDOM.createRoot(document.getElementById("root")!).render(<React.StrictMode><Root /></React.StrictMode>);
