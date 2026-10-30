import { useUI } from "@/stores/ui";
export const useRange = () => {
  const { dateRange, timezone } = useUI();
  return { date_range: dateRange, timezone };
};
