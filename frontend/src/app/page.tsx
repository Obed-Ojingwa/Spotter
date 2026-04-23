// C:\Users\Melody\Documents\Spotter\frontend\src\app\page.tsx
// Root entry — immediately sends visitors to the public home page
import { redirect } from "next/navigation";

// export default function RootPage() {
//   redirect("/home");
// }

export default function RootPage() {
  redirect("/(public)");
}