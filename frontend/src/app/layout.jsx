import { Providers } from "./providers";
import "./globals.css";

export const metadata = {
  title: "Sentiment Plus",
  description: "AI-Powered Sentiment Analysis",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}