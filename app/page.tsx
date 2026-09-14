import { redirect } from "next/navigation";

/** The app's landing route sends you to the main screen (PRD §2). */
export default function Home() {
  redirect("/crops");
}
