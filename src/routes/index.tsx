import { createFileRoute } from "@tanstack/react-router";
import { HomePage } from "@/components/site/home-page";
import { getPublicSite } from "@/lib/shop.functions";

export const Route = createFileRoute("/")({
  loader: () => getPublicSite(),
  component: HomeRoute,
});

function HomeRoute() {
  const shop = Route.useLoaderData();
  return <HomePage shop={shop} />;
}
