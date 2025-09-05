import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import "~/styles/globals.css";

import { type Metadata } from "next";
import { Geist } from "next/font/google";

import { TRPCReactProvider } from "~/trpc/react";
import ClientProviders from './ClientProviders';

export const metadata: Metadata = {
  title: "Support App",
  description: "Authentication system with Mantine UI",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geist.variable}`}>
      <head />
      <body>
        <TRPCReactProvider>
          <ClientProviders>
            {children}
          </ClientProviders>
        </TRPCReactProvider>
      </body>
    </html>
  );
}
