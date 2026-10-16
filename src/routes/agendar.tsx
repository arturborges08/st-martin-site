import { createFileRoute } from "@tanstack/react-router";
import { BookingFlow } from "@/components/booking/booking-flow";
import { getPublicSite } from "@/lib/shop.functions";

const str = (value: unknown) => (typeof value === "string" ? value : typeof value === "number" ? String(value) : "");

export const Route = createFileRoute("/agendar")({
  validateSearch: (search: Record<string, unknown>) => ({
    servico: str(search.servico),
    profissional: str(search.profissional),
    dia: str(search.dia),
    hora: str(search.hora),
  }),
  loader: () => getPublicSite(),
  head: () => ({
    meta: [{ title: "Agendar horário · St. Martin Bar e Barbearia" }],
  }),
  component: BookingRoute,
});

function BookingRoute() {
  const shop = Route.useLoaderData();
  const search = Route.useSearch();
  return <BookingFlow shop={shop} search={search} />;
}
