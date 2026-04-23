// C:\Users\Melody\Desktop\spotter_dashboards\spotter\frontend\src\app\(public)\layout.tsx

import Navbar from "@/components/layout/Navbar";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main>{children}</main>
    </>
  );
}
