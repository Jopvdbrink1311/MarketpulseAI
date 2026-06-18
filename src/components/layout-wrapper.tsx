"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(true)
  const pathname = usePathname()

  useEffect(() => {
    const saved = localStorage.getItem("sidebar_open")
    if (saved !== null) setOpen(saved === "true")

    // Luister naar sidebar toggle via storage event
    function onStorage(e: StorageEvent) {
      if (e.key === "sidebar_open") setOpen(e.newValue === "true")
    }

    // Poll elke 100ms voor lokale changes (storage events werken niet in zelfde tab)
    const interval = setInterval(() => {
      const current = localStorage.getItem("sidebar_open")
      setOpen(current !== "false")
    }, 150)

    window.addEventListener("storage", onStorage)
    return () => {
      window.removeEventListener("storage", onStorage)
      clearInterval(interval)
    }
  }, [])

  const hideSidebar = pathname === "/" || pathname === "/login"

  return (
    <div
      className="transition-all duration-200 min-h-screen"
      style={{ paddingLeft: hideSidebar ? 0 : open ? "224px" : "64px" }}
    >
      {children}
    </div>
  )
}
