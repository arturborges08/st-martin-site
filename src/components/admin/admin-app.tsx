import { Link, useNavigate } from "@tanstack/react-router";
import {
  CalendarDays,
  Clock,
  ExternalLink,
  Images,
  LayoutGrid,
  Scissors,
  ShieldCheck,
  Store,
  UserRoundSearch,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useState, type ComponentType } from "react";
import { toast } from "sonner";
import {
  AccessDesk,
  AgendaDesk,
  ApplicationsDesk,
  GalleryDesk,
  HoursDesk,
  OverviewDesk,
  ServicesDesk,
  SettingsDesk,
  TeamDesk,
} from "@/components/admin/desks";
import { NotificationBell, UserMenu } from "@/components/site/account-controls";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { errorText } from "@/lib/format";
import { getAdminSite } from "@/lib/shop.functions";
import { todayInSaoPaulo } from "@/lib/time";
import type { AdminShop } from "@/lib/types";

export type Run = (task: () => Promise<AdminShop>, success: string) => Promise<boolean>;

const TABS = [
  { id: "hoje", label: "Hoje", icon: LayoutGrid },
  { id: "agenda", label: "Agenda", icon: CalendarDays },
  { id: "servicos", label: "Serviços", icon: Scissors },
  { id: "equipe", label: "Equipe", icon: Users },
  { id: "horarios", label: "Horários", icon: Clock },
  { id: "galeria", label: "Galeria", icon: Images },
  { id: "vagas", label: "Candidaturas", icon: UserRoundSearch },
  { id: "acessos", label: "Acessos", icon: ShieldCheck },
  { id: "casa", label: "Dados da casa", icon: Store },
] as const satisfies ReadonlyArray<{ id: string; label: string; icon: ComponentType<{ className?: string }> }>;

export type TabId = (typeof TABS)[number]["id"];

function isTab(value: string): value is TabId {
  return TABS.some((tab) => tab.id === value);
}

export function AdminApp({ initialTab }: { initialTab: string }) {
  const navigate = useNavigate();
  const [tab, setTabState] = useState<TabId>(isTab(initialTab) ? initialTab : "hoje");
  const [shop, setShop] = useState<AdminShop | null>(null);
  const [loadError, setLoadError] = useState("");

  const load = useCallback(async () => {
    setLoadError("");
    try {
      setShop(await getAdminSite());
    } catch (reason) {
      setLoadError(errorText(reason, "Não deu para carregar o painel."));
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 60_000);
    return () => window.clearInterval(timer);
  }, [load]);

  function setTab(next: TabId) {
    setTabState(next);
    void navigate({ to: "/painel", search: { aba: next }, replace: true });
    window.scrollTo({ top: 0 });
  }

  const run: Run = async (task, success) => {
    try {
      setShop(await task());
      toast.success(success);
      return true;
    } catch (reason) {
      toast.error(errorText(reason, "Não deu para salvar."));
      return false;
    }
  };

  const today = todayInSaoPaulo();
  const counts: Partial<Record<TabId, number>> = shop
    ? {
        agenda: shop.bookings.filter((b) => b.day === today && b.status === "confirmado").length,
        vagas: shop.applications.filter((a) => a.status === "recebida").length,
      }
    : {};
  const current = TABS.find((t) => t.id === tab) ?? TABS[0];

  return (
    <div className="min-h-svh bg-bg text-fg lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="sticky top-0 hidden h-svh flex-col border-r border-line px-4 py-6 lg:flex">
        <Link to="/" className="flex items-center gap-2.5 px-3" aria-label="Ver o site">
          <img src="/brand/monogram.png" alt="" className="h-6 w-auto" />
          <span className="text-sm font-semibold tracking-tight">Painel St. Martin</span>
        </Link>
        <nav aria-label="Painel" className="mt-8 grid gap-0.5">
          {TABS.map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-10 items-center gap-3 rounded-xl px-3 text-sm transition-colors duration-150",
                  active ? "bg-white/[0.08] font-medium text-fg" : "text-muted hover:bg-white/[0.04] hover:text-fg",
                )}
              >
                <Icon className="size-4" />
                <span className="flex-1 text-left">{item.label}</span>
                {counts[item.id] ? (
                  <span className="grid min-w-5 place-items-center rounded-full bg-cognac px-1.5 text-[11px] leading-5 font-semibold text-bg tnum">
                    {counts[item.id]}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>
        <Button asChild variant="ghost" size="sm" className="mt-auto justify-start">
          <Link to="/">
            <ExternalLink /> Ver o site
          </Link>
        </Button>
      </aside>

      <div className="min-w-0">
        <header className="glass sticky top-0 z-30 border-b border-line">
          <div className="flex h-16 items-center justify-between gap-4 px-5 sm:px-8">
            <div className="flex items-center gap-3">
              <img src="/brand/monogram.png" alt="" className="h-5 w-auto lg:hidden" />
              <h1 className="text-lg font-semibold tracking-tight">{current.label}</h1>
            </div>
            <div className="flex items-center gap-1">
              <NotificationBell />
              <UserMenu />
            </div>
          </div>
          <nav aria-label="Painel" className="flex gap-1 overflow-x-auto px-4 pb-3 [scrollbar-width:none] lg:hidden [&::-webkit-scrollbar]:hidden">
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                aria-current={tab === item.id ? "page" : undefined}
                className={cn(
                  "h-9 shrink-0 rounded-full px-4 text-[13px] font-medium transition-colors",
                  tab === item.id ? "bg-fg text-bg" : "bg-white/[0.06] text-muted",
                )}
              >
                {item.label}
                {counts[item.id] ? <span className="ml-1.5 tnum">{counts[item.id]}</span> : null}
              </button>
            ))}
          </nav>
        </header>

        <main className="mx-auto max-w-5xl px-5 py-8 sm:px-8 sm:py-10">
          {loadError ? (
            <div className="rounded-[var(--radius-card)] border border-line p-6">
              <p className="text-muted">{loadError}</p>
              <Button variant="secondary" size="sm" className="mt-4" onClick={() => void load()}>
                Tentar de novo
              </Button>
            </div>
          ) : !shop ? (
            <div className="grid gap-3">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-20 animate-pulse rounded-[var(--radius-card)] bg-white/[0.04]" />
              ))}
            </div>
          ) : (
            <div key={tab} className="step-panel">
              {tab === "hoje" ? <OverviewDesk shop={shop} go={setTab} /> : null}
              {tab === "agenda" ? <AgendaDesk shop={shop} run={run} /> : null}
              {tab === "servicos" ? <ServicesDesk shop={shop} run={run} /> : null}
              {tab === "equipe" ? <TeamDesk shop={shop} run={run} /> : null}
              {tab === "horarios" ? <HoursDesk shop={shop} run={run} /> : null}
              {tab === "galeria" ? <GalleryDesk shop={shop} run={run} /> : null}
              {tab === "vagas" ? <ApplicationsDesk shop={shop} run={run} /> : null}
              {tab === "acessos" ? <AccessDesk shop={shop} run={run} /> : null}
              {tab === "casa" ? <SettingsDesk shop={shop} run={run} /> : null}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
