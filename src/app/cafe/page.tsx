import { redirect } from "next/navigation";

export default function CafeHome() {
  redirect("/cafe/orders");
}
