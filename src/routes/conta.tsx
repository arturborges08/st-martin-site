import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { CalendarX2 } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { SiteFrame } from "@/components/site/shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { TextField } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import {
  cancelMyBooking,
  getMyBookings,
  listNotifications,
  markNotificationsRead,
  saveMyProfile,
} from "@/lib/account.functions";
import { errorText, formatDayLabel, formatMin, isValidWhatsapp, presentPrice, refCode } from "@/lib/format";
import { refreshMe, setMeLocally, useMe } from "@/lib/me-store";
import { nowMinutesInSaoPaulo, todayInSaoPaulo } from "@/lib/time";
import { BOOKING_STATUS, type AppNotification, type MyBooking } from "@/lib/types";

export const Route = createFileRoute("/conta")({
  head: () => ({ meta: [{ title: "Minha conta · St. Martin Bar e Barbearia" }] }),
  component: AccountPage,
});

const TABS = [
  ["horarios", "Horários"],
  ["avisos", "Avisos"],
  ["perfil", "Meus dados"],
] as const;

type Tab = (typeof TABS)[number][0];

const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

const STATUS_TONE = { confirmado: "ok", concluido: "neutral", faltou: "warn", cancelado: "danger" } as const;

function isUpcoming(b: MyBooking) {
  const today = todayInSaoPaulo();
  return b.day > today || (b.day === today && b.endMin > nowMinutesInSaoPaulo());
}

function AccountPage() {
  const { me, status } = useMe();
  const [tab, setTab] = useState<Tab>(() =>
    typeof window !== "undefined" && window.location.hash === "#perfil" ? "perfil" : "horarios",
  );
  const [bookings, setBookings] = useState<MyBooking[] | null>(null);
  const [notes, setNotes] = useState<AppNotification[] | null>(null);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    setLoadError(false);
    try {
      const [b, n] = await Promise.all([getMyBookings(), listNotifications()]);
      setBookings(b);
      setNotes(n);
    } catch {
      setLoadError(true);
    }
  }, []);

  useEffect(() => {
    if (me) void load();
  }, [me?.id, load]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (tab === "avisos" && notes?.some((n) => !n.read)) {
      void markNotificationsRead().then(() => setMeLocally({ unread: 0 }));
    }
  }, [tab, notes]);

  if (status === "loading") {
    return (
      <SiteFrame showCta={false}>
        <div className="mx-auto max-w-3xl px-5 pt-32 pb-24 sm:px-8">
          <div className="h-10 w-56 animate-pulse rounded-xl bg-white/[0.05]" />
        </div>
      </SiteFrame>
    );
  }
  if (!me) return <Navigate to="/entrar" search={{ next: "/conta" }} replace />;

  const upcoming = (bookings ?? []).filter((b) => b.status === "confirmado" && isUpcoming(b)).reverse();
  const past = (bookings ?? []).filter((b) => !(b.status === "confirmado" && isUpcoming(b)));

  return (
    <SiteFrame showCta={false}>
      <div className="mx-auto max-w-3xl px-5 pt-32 pb-24 sm:px-8">
        <h1 className="text-4xl font-semibold sm:text-5xl">Olá, {(me.name || "cliente").split(" ")[0]}.</h1>
        <p className="mt-2 text-muted">{me.email}</p>
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
          <Segmented
            label="Seções da conta"
            options={TABS.map(([id, label]) => [id, id === "avisos" && me.unread ? `${label} (${me.unread})` : label] as const)}
            value={tab}
            onChange={setTab}
          />
          <Button asChild size="sm">
            <Link to="/agendar" search={{ servico: "", profissional: "", dia: "", hora: "" }}>
              Novo horário
            </Link>
          </Button>
        </div>

        {loadError ? (
          <div className="mt-10 rounded-[var(--radius-card)] border border-line p-6">
            <p className="text-muted">Não deu para carregar seus dados agora.</p>
            <Button variant="secondary" size="sm" className="mt-4" onClick={() => void load()}>
              Tentar de novo
            </Button>
          </div>
        ) : null}

        {tab === "horarios" ? (
          <div className="mt-10 grid gap-10">
            <section>
              <h2 className="text-lg font-semibold">Próximos</h2>
              {bookings === null ? (
                <Skeleton />
              ) : upcoming.length === 0 ? (
                <div className="mt-4 flex flex-col items-start gap-4 rounded-[var(--radius-card)] border border-dashed border-line-strong p-8">
                  <CalendarX2 className="size-6 text-muted" />
                  <p className="text-muted">Você não tem horário marcado.</p>
                  <Button asChild size="sm">
                    <Link to="/agendar" search={{ servico: "", profissional: "", dia: "", hora: "" }}>
                      Agendar agora
                    </Link>
                  </Button>
                </div>
              ) : (
                <ul className="mt-4 grid gap-3">
                  {upcoming.map((b) => (
                    <BookingCard key={b.id} booking={b} onCancelled={load} cancellable />
                  ))}
                </ul>
              )}
            </section>
            {past.length ? (
              <section>
                <h2 className="text-lg font-semibold">Histórico</h2>
                <ul className="mt-4 grid gap-3">
                  {past.map((b) => (
                    <BookingCard key={b.id} booking={b} onCancelled={load} />
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        ) : null}

        {tab === "avisos" ? (
          <section className="mt-10">
            {notes === null ? (
              <Skeleton />
            ) : notes.length === 0 ? (
              <p className="text-muted">Nenhum aviso ainda.</p>
            ) : (
              <ul className="divide-y divide-line rounded-[var(--radius-card)] border border-line">
                {notes.map((n) => (
                  <li key={n.id} className="flex gap-4 p-5">
                    <span className={`mt-2 size-2 shrink-0 rounded-full ${n.read ? "bg-white/15" : "bg-cognac"}`} aria-hidden="true" />
                    <div>
                      <p className="font-medium">{n.title}</p>
                      <p className="mt-0.5 text-sm text-muted">{n.body}</p>
                      <p className="mt-1.5 text-xs text-subtle tnum">{n.createdAt}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-4 text-sm text-subtle">Os avisos aparecem aqui e no sino do topo enquanto você usa o site.</p>
          </section>
        ) : null}

        {tab === "perfil" ? <ProfileForm initialName={me.name} initialWhatsapp={me.whatsapp} /> : null}
      </div>
    </SiteFrame>
  );
}

function Skeleton() {
  return (
    <div className="mt-4 grid gap-3">
      {[0, 1].map((i) => (
        <div key={i} className="h-24 animate-pulse rounded-[var(--radius-card)] bg-white/[0.04]" />
      ))}
    </div>
  );
}

function BookingCard({
  booking,
  cancellable = false,
  onCancelled,
}: {
  booking: MyBooking;
  cancellable?: boolean;
  onCancelled: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const statusLabel = BOOKING_STATUS.find(([id]) => id === booking.status)?.[1] ?? booking.status;

  async function cancel() {
    setBusy(true);
    try {
      await cancelMyBooking({ data: { id: booking.id } });
      toast.success("Horário cancelado");
      onCancelled();
    } catch (reason) {
      toast.error(errorText(reason, "Não deu para cancelar agora."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="flex flex-col gap-4 rounded-[var(--radius-card)] border border-line bg-raised p-5 sm:flex-row sm:items-center sm:p-6">
      <div className="grid size-16 shrink-0 place-items-center rounded-2xl bg-raised-3 text-center leading-none">
        <span>
          <span className="block text-2xl font-semibold tnum">{Number(booking.day.slice(8))}</span>
          <span className="mt-1 block text-[11px] text-muted">{MONTHS[Number(booking.day.slice(5, 7)) - 1]}</span>
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-lg font-semibold">{booking.serviceName}</p>
          <Badge tone={STATUS_TONE[booking.status]}>{statusLabel}</Badge>
        </div>
        <p className="mt-1 text-sm text-muted tnum">
          {formatDayLabel(booking.day)}, {formatMin(booking.startMin)} · {booking.professionalName} ·{" "}
          {presentPrice(booking.priceLabel)}
        </p>
        <p className="mt-1 text-xs text-subtle tnum">Código {refCode(booking.id)}</p>
      </div>
      {cancellable ? (
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="self-start sm:self-center">
              Cancelar
            </Button>
          </DialogTrigger>
          <DialogContent title="Cancelar este horário?" description={`${booking.serviceName}, ${formatDayLabel(booking.day)} às ${formatMin(booking.startMin)}. A barbearia recebe o aviso.`}>
            <div className="flex flex-wrap justify-end gap-3">
              <DialogClose asChild>
                <Button variant="secondary">Manter</Button>
              </DialogClose>
              <Button variant="danger" onClick={() => void cancel()} disabled={busy}>
                {busy ? "Cancelando…" : "Cancelar horário"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      ) : null}
    </li>
  );
}

function ProfileForm({ initialName, initialWhatsapp }: { initialName: string; initialWhatsapp: string }) {
  const [name, setName] = useState(initialName);
  const [whatsapp, setWhatsapp] = useState(initialWhatsapp);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (name.trim().length < 2) return setError("Coloque seu nome.");
    if (whatsapp && !isValidWhatsapp(whatsapp)) return setError("O WhatsApp precisa ter DDD.");
    setBusy(true);
    try {
      await saveMyProfile({ data: { name, whatsapp } });
      await refreshMe();
      toast.success("Dados salvos");
    } catch (reason) {
      setError(errorText(reason, "Não deu para salvar."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="mt-10 grid max-w-md gap-5">
      <TextField label="Nome" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
      <TextField
        label="WhatsApp"
        value={whatsapp}
        onChange={(e) => setWhatsapp(e.target.value)}
        inputMode="tel"
        autoComplete="tel"
        hint="Usado para preencher o agendamento automaticamente."
      />
      {error ? (
        <p role="alert" className="rounded-2xl bg-danger/12 px-4 py-3 text-sm text-danger">
          {error}
        </p>
      ) : null}
      <Button type="submit" disabled={busy} className="w-fit">
        {busy ? "Salvando…" : "Salvar"}
      </Button>
    </form>
  );
}
