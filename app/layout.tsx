import type { Metadata } from "next";
import "./globals.css";
import { PlanProvider } from "@/lib/plan-context";

export const metadata: Metadata = {
  title: "Sowline — season planning for vegetable gardens",
  description:
    "Enter a zip code, get five vegetables ranked by usable yield per square foot for your frost-free window.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full antialiased">
        <PlanProvider>{children}</PlanProvider>
      </body>
    </html>
  );
}
