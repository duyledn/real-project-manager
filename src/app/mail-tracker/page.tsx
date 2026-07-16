import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SetChaser Envelope Tracker",
  description: "Private USPS Intelligent Mail barcode and envelope tracking utility.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function MailTrackerPage() {
  return (
    <iframe
      src="/mail-tracker/app.html"
      title="SetChaser Envelope Tracker"
      className="fixed inset-0 z-[1000] h-screen w-screen border-0 bg-[#0f1117]"
    />
  );
}
