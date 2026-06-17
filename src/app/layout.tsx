import type { Metadata } from "next"
import { Geist } from "next/font/google"
import "./globals.css"
import Navbar from "@/components/navbar"

const geist = Geist({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "MarketPulse AI",
  description: "Realtime marktinzichten, aangedreven door AI",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="nl">
      <body className={`${geist.className} bg-gray-950 text-white`}>
        <Navbar />
        {children}
      </body>
    </html>
  )
}
