import type { Metadata } from "next"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { TooltipProvider } from "@/components/ui/tooltip"

export const metadata: Metadata = {
  title: "Market Feed Intelligence",
  description:
    "Personalized client briefing workspace powered by cached market signals, macro context, and live summary generation.",
  applicationName: "Market Feed Intelligence",
  icons: {
    icon: "https://www.qtsolv.com/wp-content/themes/qtsolvtheme/assets/images/favicon.ico",
    shortcut: "https://www.qtsolv.com/wp-content/themes/qtsolvtheme/assets/images/favicon.ico",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="antialiased font-sans">
      <body>
        <ThemeProvider>
          <TooltipProvider>{children}</TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
