import { redirect } from "next/navigation";

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;

  if (tab === "subscription") {
    redirect("/pricing/subscription");
  } else if (tab === "credits") {
    redirect("/pricing/credits");
  } else if (tab === "solutions") {
    redirect("/pricing/solutions");
  } else if (tab === "on_premise") {
    redirect("/pricing/on_premise");
  }

  // Info: (20260705 - Luphia) Default redirect to the main subscription page
  redirect("/pricing/subscription");
}
