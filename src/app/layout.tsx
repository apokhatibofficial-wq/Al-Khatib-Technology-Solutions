import type { Metadata, Viewport } from "next";
import { Tajawal } from "next/font/google";
import { Toaster } from "sonner";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
import "./globals.css";

const tajawal = Tajawal({
  variable: "--font-tajawal",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "700", "800", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: process.env.NEXT_PUBLIC_BASE_URL
    ? new URL(process.env.NEXT_PUBLIC_BASE_URL)
    : undefined,
  title: {
    default: "إدلب.com — منصة الصفحات الرقمية",
    template: "%s — إدلب.com",
  },
  description:
    "منصة إنشاء وإدارة صفحات الأعمال الرقمية والملفات الشخصية، من شركة الخطيب للحلول التقنية.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "إدلب.com",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0d6ebe",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className={`${tajawal.variable} h-full antialiased`}>
      <body className="min-h-full">
        {children}
        <Toaster position="top-center" richColors dir="rtl" />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
