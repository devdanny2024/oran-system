import type { ReactNode } from "react";
import DashboardShell from "../../src/app/pages/dashboard/Dashboard";

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <DashboardShell>{children}</DashboardShell>;
}

