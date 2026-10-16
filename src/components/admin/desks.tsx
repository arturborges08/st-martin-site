import { Link } from "@tanstack/react-router";
import {
  ArrowDown,
  ArrowUp,
  Check,
  MessageCircle,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserX,
  X,
} from "lucide-react";
import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import type { Run, TabId } from "@/components/admin/admin-app";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field, Input, TextAreaField, TextField } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/cn";
import {
  formatDayLabel,
  formatDayShort,
  formatDuration,
  formatMin,
  formatWhatsapp,
  initials,
  presentPrice,
  safeHttp,
  whatsAppHref,
} from "@/lib/format";
import { useMe } from "@/lib/me-store";
import {
  addStaffByEmail,
  deleteApplication,
  deleteBooking,
  deleteClosure,
  deleteProfessional,
  deleteService,
  moveGallery,
  moveService,
  removeStaff,
  saveClosure,
  saveGalleryItem,
  saveHours,
  saveProfessional,
  saveProfile,
  saveService,
  setApplicationStatus,
  setBookingStatus,
} from "@/lib/shop.functions";
import { DAY_NAMES, addDays, nowMinutesInSaoPaulo, todayInSaoPaulo } from "@/lib/time";
import {
  APPLICATION_STATUS,
  BOOKING_STATUS,
  SLOT_STEPS,
  type AdminShop,
  type Booking,
  type BookingStatus,
  type Professional,
  type Service,
} from "@/lib/types";

type DeskProps = { shop: AdminShop; run: Run };

const BOOKING_TONE = { confirmado: "ok", concluido: "neutral", faltou: "warn", cancelado: "danger" } as const;
const BOOK_LINK = { to: "/agendar", search: { servico: "", profissional: "", dia: "", hora: "" } } as const;

function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="mt-10 first:mt-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold">{title}</h2>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-[var(--radius-card)] border border-dashed border-line-strong px-6 py-10 text-center text-sm text-muted">
      {children}
    </p>
  );
}

function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("rounded-[var(--radius-card)] border border-line bg-raised", className)}>{children}</div>;
}

// ── Hoje ────────────────────────────────────────────────────────────────────

export function OverviewDesk({ shop, go }: { shop: AdminShop; go: (tab: TabId) => void }) {
  const today = todayInSaoPaulo();
  const now = nowMinutesInSaoPaulo();
  const todays = shop.bookings.filter((b) => b.day === today && b.status !== "cancelado");
  const nextUp = todays.find((b) => b.status === "confirmado" && b.endMin > now);
  const week = shop.bookings.filter((b) => b.day >= today && b.day <= addDays(today, 6) && b.status === "confirmado");
  const newApps = shop.applications.filter((a) => a.status === "recebida");
  const demoPros = shop.professionals.filter((p) => p.demo && p.active);
  const noPrice = shop.services.filter((s) => s.active && presentPrice(s.priceLabel) === "Consulte");

  const todos: Array<{ text: string; tab: TabId }> = [];
  if (demoPros.length) todos.push({ text: `Troque ${demoPros.length === 1 ? "o perfil de exemplo" : `os ${demoPros.length} perfis de exemplo`} pela equipe real`, tab: "equipe" });
  if (noPrice.length) todos.push({ text: `Preencha o preço de ${noPrice.length} ${noPrice.length === 1 ? "serviço" : "serviços"}`, tab: "servicos" });
  if (!shop.profile.addressLine) todos.push({ text: "Coloque o endereço da casa", tab: "casa" });
  if (!shop.profile.instagram) todos.push({ text: "Adicione o link do Instagram", tab: "casa" });

  return (
    <div>
      <p className="text-muted">
        {formatDayLabel(today)} ·{" "}
        <span className="text-fg">
          {todays.length} {todays.length === 1 ? "atendimento" : "atendimentos"} hoje
        </span>{" "}
        · {week.length} confirmados nos próximos 7 dias
        {newApps.length ? (
          <>
            {" "}
            ·{" "}
            <button type="button" className="text-cognac underline-offset-4 hover:underline" onClick={() => go("vagas")}>
              {newApps.length} {newApps.length === 1 ? "candidatura nova" : "candidaturas novas"}
            </button>
          </>
        ) : null}
      </p>

      {nextUp ? (
        <Panel className="mt-6 flex flex-col gap-5 p-6 sm:flex-row sm:items-center">
          <div className="grid size-16 shrink-0 place-items-center rounded-2xl bg-fg text-bg">
            <span className="text-lg font-semibold tnum">{formatMin(nextUp.startMin)}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] text-subtle">Próximo cliente</p>
            <p className="truncate text-xl font-semibold">{nextUp.customerName}</p>
            <p className="text-sm text-muted">
              {nextUp.serviceName} · {nextUp.professionalName}
            </p>
          </div>
          <WhatsButton phone={nextUp.customerWhatsapp} />
        </Panel>
      ) : null}

      {todos.length ? (
        <Section title="Para deixar o site completo">
          <ul className="divide-y divide-line rounded-[var(--radius-card)] border border-line">
            {todos.map((todo) => (
              <li key={todo.text}>
                <button
                  type="button"
                  onClick={() => go(todo.tab)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm hover:bg-white/[0.03]"
                >
                  <span>{todo.text}</span>
                  <span className="text-muted">Abrir</span>
                </button>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      <Section
        title="Agenda de hoje"
        action={
          <Button asChild size="sm" variant="secondary">
            <Link {...BOOK_LINK}>
              <Plus /> Marcar para cliente
            </Link>
          </Button>
        }
      >
        {todays.length === 0 ? <Empty>Nenhum horário marcado para hoje.</Empty> : <BookingList bookings={todays} shop={shop} run={() => Promise.resolve(false)} readOnly />}
      </Section>
    </div>
  );
}

// ── Agenda ──────────────────────────────────────────────────────────────────

const AGENDA_FILTERS = [
  ["hoje", "Hoje"],
  ["amanha", "Amanhã"],
  ["proximos", "Próximos"],
  ["passados", "Passados"],
  ["cancelados", "Cancelados"],
] as const;

type AgendaFilter = (typeof AGENDA_FILTERS)[number][0];

export function AgendaDesk({ shop, run }: DeskProps) {
  const [filter, setFilter] = useState<AgendaFilter>("hoje");
  const [query, setQuery] = useState("");
  const today = todayInSaoPaulo();
  const tomorrow = addDays(today, 1);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return shop.bookings
      .filter((b) => {
        if (filter === "cancelados") return b.status === "cancelado";
        if (b.status === "cancelado") return false;
        if (filter === "hoje") return b.day === today;
        if (filter === "amanha") return b.day === tomorrow;
        if (filter === "proximos") return b.day >= today;
        return b.day < today;
      })
      .filter(
        (b) =>
          !q ||
          b.customerName.toLowerCase().includes(q) ||
          b.customerWhatsapp.includes(q.replace(/\D/g, "") || "§") ||
          b.serviceName.toLowerCase().includes(q) ||
          b.professionalName.toLowerCase().includes(q),
      )
      .sort((a, b) =>
        filter === "passados" ? b.day.localeCompare(a.day) || b.startMin - a.startMin : a.day.localeCompare(b.day) || a.startMin - b.startMin,
      );
  }, [shop.bookings, filter, query, today, tomorrow]);

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="-mx-1 overflow-x-auto px-1 pb-1">
          <Segmented label="Filtro da agenda" options={AGENDA_FILTERS} value={filter} onChange={setFilter} />
        </div>
        <Button asChild size="sm" variant="secondary">
          <Link {...BOOK_LINK}>
            <Plus /> Marcar para cliente
          </Link>
        </Button>
      </div>
      <label className="relative mt-4 block">
        <span className="sr-only">Buscar</span>
        <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-subtle" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por cliente, WhatsApp, serviço ou profissional" className="pl-11" />
      </label>
      <div className="mt-6">
        {list.length === 0 ? <Empty>Nada nesse filtro.</Empty> : <BookingList bookings={list} shop={shop} run={run} />}
      </div>
    </div>
  );
}

function BookingList({
  bookings,
  shop,
  run,
  readOnly = false,
}: {
  bookings: Booking[];
  shop: AdminShop;
  run: Run;
  readOnly?: boolean;
}) {
  const groups = useMemo(() => {
    const map = new Map<string, Booking[]>();
    for (const b of bookings) map.set(b.day, [...(map.get(b.day) ?? []), b]);
    return [...map.entries()];
  }, [bookings]);

  return (
    <div className="grid gap-8">
      {groups.map(([day, items]) => (
        <div key={day}>
          {groups.length > 1 || !readOnly ? (
            <p className="mb-3 text-[13px] font-medium text-subtle">{formatDayLabel(day)}</p>
          ) : null}
          <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-card)] border border-line bg-raised">
            {items.map((b) => (
              <BookingRow key={b.id} booking={b} run={run} readOnly={readOnly} shop={shop} />
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function BookingRow({ booking, run, readOnly }: { booking: Booking; run: Run; readOnly: boolean; shop: AdminShop }) {
  const [note, setNote] = useState(booking.note);
  const statusLabel = BOOKING_STATUS.find(([id]) => id === booking.status)?.[1] ?? booking.status;
  const setStatus = (status: BookingStatus, message: string) =>
    run(() => setBookingStatus({ data: { id: booking.id, status, note } }), message);

  return (
    <li className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
      <div className="w-16 shrink-0 tnum">
        <p className="text-lg font-semibold">{formatMin(booking.startMin)}</p>
        <p className="text-xs text-subtle">{formatDuration(booking.endMin - booking.startMin)}</p>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate font-semibold">{booking.customerName || "Sem nome"}</p>
          <Badge tone={BOOKING_TONE[booking.status]}>{statusLabel}</Badge>
          {booking.hasAccount ? <Badge tone="cognac">Tem conta</Badge> : null}
        </div>
        <p className="mt-0.5 text-sm text-muted">
          {booking.serviceName} · {booking.professionalName}
          {booking.customerWhatsapp ? <span className="tnum"> · {formatWhatsapp(booking.customerWhatsapp)}</span> : null}
        </p>
        {booking.note ? <p className="mt-1 text-[13px] text-subtle">Obs.: {booking.note}</p> : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <WhatsButton phone={booking.customerWhatsapp} />
        {readOnly ? null : (
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="secondary" size="sm">
                Gerenciar
              </Button>
            </DialogTrigger>
            <DialogContent
              title={booking.customerName || "Agendamento"}
              description={`${booking.serviceName} · ${formatDayLabel(booking.day)}, ${formatMin(booking.startMin)} · ${booking.professionalName}`}
            >
              <TextAreaField label="Observação interna" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} className="[&_textarea]:min-h-20" />
              <div className="mt-6 grid gap-2 sm:grid-cols-2">
                {booking.status !== "concluido" ? (
                  <DialogClose asChild>
                    <Button variant="secondary" onClick={() => void setStatus("concluido", "Atendimento concluído")}>
                      <Check /> Concluído
                    </Button>
                  </DialogClose>
                ) : null}
                {booking.status !== "faltou" ? (
                  <DialogClose asChild>
                    <Button variant="secondary" onClick={() => void setStatus("faltou", "Marcado como falta")}>
                      <UserX /> Não veio
                    </Button>
                  </DialogClose>
                ) : null}
                {booking.status !== "confirmado" ? (
                  <DialogClose asChild>
                    <Button variant="secondary" onClick={() => void setStatus("confirmado", "Horário reaberto")}>
                      Voltar para confirmado
                    </Button>
                  </DialogClose>
                ) : null}
                {booking.status !== "cancelado" ? (
                  <DialogClose asChild>
                    <Button variant="danger" onClick={() => void setStatus("cancelado", "Horário cancelado e liberado")}>
                      <X /> Cancelar e liberar
                    </Button>
                  </DialogClose>
                ) : null}
                <DialogClose asChild>
                  <Button variant="ghost" onClick={() => void setStatus(booking.status, "Observação salva")}>
                    Salvar observação
                  </Button>
                </DialogClose>
              </div>
              {booking.status === "cancelado" ? (
                <DialogClose asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-4 text-danger"
                    onClick={() => void run(() => deleteBooking({ data: { id: booking.id } }), "Registro apagado")}
                  >
                    <Trash2 /> Apagar registro
                  </Button>
                </DialogClose>
              ) : null}
              {booking.hasAccount ? (
                <p className="mt-5 text-[13px] text-subtle">O cliente tem conta e recebe aviso no site quando o status muda.</p>
              ) : null}
            </DialogContent>
          </Dialog>
        )}
      </div>
    </li>
  );
}

function WhatsButton({ phone }: { phone: string }) {
  const href = whatsAppHref(phone);
  if (!href) return null;
  return (
    <Button asChild variant="secondary" size="icon-sm" aria-label="Abrir WhatsApp do cliente">
      <a href={href} target="_blank" rel="noreferrer">
        <MessageCircle />
      </a>
    </Button>
  );
}

// ── Serviços ────────────────────────────────────────────────────────────────

export function ServicesDesk({ shop, run }: DeskProps) {
  return (
    <div>
      <div className="flex justify-end">
        <ServiceDialog run={run} trigger={<Button size="sm"><Plus /> Novo serviço</Button>} />
      </div>
      <ul className="mt-6 divide-y divide-line overflow-hidden rounded-[var(--radius-card)] border border-line bg-raised">
        {shop.services.map((service, index) => (
          <li key={service.id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold">{service.name}</p>
                {service.active ? null : <Badge>Oculto</Badge>}
              </div>
              <p className="mt-0.5 text-sm text-muted">
                {formatDuration(service.durationMin)} · {presentPrice(service.priceLabel)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Subir"
                disabled={index === 0}
                onClick={() => void run(() => moveService({ data: { id: service.id, direction: "up" } }), "Ordem salva")}
              >
                <ArrowUp />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Descer"
                disabled={index === shop.services.length - 1}
                onClick={() => void run(() => moveService({ data: { id: service.id, direction: "down" } }), "Ordem salva")}
              >
                <ArrowDown />
              </Button>
              <ServiceDialog
                run={run}
                service={service}
                trigger={
                  <Button variant="secondary" size="sm">
                    <Pencil /> Editar
                  </Button>
                }
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ServiceDialog({ run, service, trigger }: { run: Run; service?: Service; trigger: ReactNode }) {
  const [open, setOpen] = useState(false);
  const blank = { name: "", description: "", durationMin: 30, priceLabel: "", active: true };
  const [form, setForm] = useState(
    service
      ? {
          name: service.name,
          description: service.description,
          durationMin: service.durationMin,
          priceLabel: presentPrice(service.priceLabel) === "Consulte" ? "" : service.priceLabel,
          active: service.active,
        }
      : blank,
  );

  async function submit(event: FormEvent) {
    event.preventDefault();
    const ok = await run(
      () => saveService({ data: { ...form, id: service?.id, priceLabel: form.priceLabel.trim() || "Consulte" } }),
      service ? "Serviço atualizado" : "Serviço criado",
    );
    if (ok) {
      setOpen(false);
      if (!service) setForm(blank);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent title={service ? "Editar serviço" : "Novo serviço"}>
        <form onSubmit={submit} className="grid gap-4">
          <TextField label="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required maxLength={80} />
          <TextAreaField
            label="Descrição"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            maxLength={400}
            className="[&_textarea]:min-h-20"
          />
          <div className="grid grid-cols-2 gap-4">
            <TextField
              label="Duração (min)"
              type="number"
              min={10}
              max={240}
              step={5}
              value={form.durationMin}
              onChange={(e) => setForm({ ...form, durationMin: Number(e.target.value) })}
            />
            <TextField
              label="Preço"
              value={form.priceLabel}
              onChange={(e) => setForm({ ...form, priceLabel: e.target.value })}
              placeholder="R$ 50"
              hint="Vazio mostra “Consulte”."
              maxLength={60}
            />
          </div>
          <Switch checked={form.active} onCheckedChange={(active) => setForm({ ...form, active })} label="Aparece no site" />
          <div className="mt-2 flex flex-wrap justify-between gap-3">
            {service ? (
              <Button
                variant="ghost"
                className="text-danger"
                onClick={async () => {
                  if (await run(() => deleteService({ data: { id: service.id } }), "Serviço excluído")) setOpen(false);
                }}
              >
                <Trash2 /> Excluir
              </Button>
            ) : (
              <span />
            )}
            <Button type="submit">Salvar</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Equipe ──────────────────────────────────────────────────────────────────

export function TeamDesk({ shop, run }: DeskProps) {
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-lg text-sm text-muted">
          Profissionais aparecem no site e na escolha do agendamento. Perfis de exemplo não aparecem na seção “Quem atende”.
        </p>
        <ProfessionalDialog run={run} trigger={<Button size="sm"><Plus /> Adicionar</Button>} />
      </div>
      <ul className="mt-6 grid gap-3 sm:grid-cols-2">
        {shop.professionals.map((person) => (
          <li key={person.id}>
            <Panel className="flex items-center gap-4 p-5">
              {person.photoUrl ? (
                <img src={person.photoUrl} alt="" className="size-14 shrink-0 rounded-full object-cover" />
              ) : (
                <span className="grid size-14 shrink-0 place-items-center rounded-full bg-raised-3 font-semibold">
                  {initials(person.name)}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-semibold">{person.name}</p>
                  {person.demo ? <Badge tone="warn">Exemplo</Badge> : null}
                  {person.active ? null : <Badge>Inativo</Badge>}
                </div>
                <p className="truncate text-sm text-muted">{person.specialty}</p>
                <p className="mt-1 text-xs text-subtle">
                  {person.weekdays.length ? person.weekdays.map((d) => DAY_NAMES[d].slice(0, 3)).join(" · ") : "Sem dias definidos"}
                </p>
              </div>
              <ProfessionalDialog
                run={run}
                person={person}
                trigger={
                  <Button variant="secondary" size="icon-sm" aria-label={`Editar ${person.name}`}>
                    <Pencil />
                  </Button>
                }
              />
            </Panel>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ProfessionalDialog({ run, person, trigger }: { run: Run; person?: Professional; trigger: ReactNode }) {
  const [open, setOpen] = useState(false);
  const blank = { name: "", specialty: "", bio: "", photoUrl: "", active: true, weekdays: [2, 3, 4, 5, 6] as number[] };
  const [form, setForm] = useState(
    person
      ? {
          name: person.demo ? "" : person.name,
          specialty: person.demo ? "" : person.specialty,
          bio: person.demo ? "" : person.bio,
          photoUrl: person.photoUrl,
          active: person.active,
          weekdays: person.weekdays,
        }
      : blank,
  );

  async function submit(event: FormEvent) {
    event.preventDefault();
    const ok = await run(
      () => saveProfessional({ data: { ...form, id: person?.id } }),
      person ? "Profissional atualizado" : "Profissional adicionado",
    );
    if (ok) {
      setOpen(false);
      if (!person) setForm(blank);
    }
  }

  const toggleDay = (day: number) =>
    setForm((f) => ({ ...f, weekdays: f.weekdays.includes(day) ? f.weekdays.filter((d) => d !== day) : [...f.weekdays, day].sort() }));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent
        title={person ? (person.demo ? "Trocar perfil de exemplo" : "Editar profissional") : "Novo profissional"}
        description={person?.demo ? "Coloque o nome real. O selo de exemplo sai ao salvar." : undefined}
      >
        <form onSubmit={submit} className="grid gap-4">
          <TextField label="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required maxLength={80} />
          <TextField
            label="Especialidade"
            value={form.specialty}
            onChange={(e) => setForm({ ...form, specialty: e.target.value })}
            placeholder="Degradê, barba, navalha…"
            maxLength={80}
          />
          <TextAreaField label="Apresentação curta" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} maxLength={400} className="[&_textarea]:min-h-20" />
          <TextField
            label="Link da foto (opcional)"
            value={form.photoUrl}
            onChange={(e) => setForm({ ...form, photoUrl: e.target.value })}
            placeholder="https://…"
            hint="Use um link https de uma foto já publicada."
          />
          <Field label="Dias de atendimento">
            <div className="flex flex-wrap gap-2">
              {DAY_NAMES.map((name, day) => (
                <button
                  key={name}
                  type="button"
                  aria-pressed={form.weekdays.includes(day)}
                  onClick={() => toggleDay(day)}
                  className={cn(
                    "press h-9 rounded-full px-3.5 text-[13px] font-medium transition-colors",
                    form.weekdays.includes(day) ? "bg-fg text-bg" : "bg-white/[0.06] text-muted",
                  )}
                >
                  {name.slice(0, 3)}
                </button>
              ))}
            </div>
          </Field>
          <Switch checked={form.active} onCheckedChange={(active) => setForm({ ...form, active })} label="Recebe agendamentos" />
          <div className="mt-2 flex flex-wrap justify-between gap-3">
            {person ? (
              <Button
                variant="ghost"
                className="text-danger"
                onClick={async () => {
                  if (await run(() => deleteProfessional({ data: { id: person.id } }), "Profissional removido")) setOpen(false);
                }}
              >
                <Trash2 /> Remover
              </Button>
            ) : (
              <span />
            )}
            <Button type="submit">Salvar</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Horários ────────────────────────────────────────────────────────────────

function TimeSelect({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  const options = useMemo(() => Array.from({ length: 48 }, (_, i) => i * 30).concat(24 * 60 - 1), []);
  return (
    <select aria-label={label} className="field h-10 min-h-0 w-[6.5rem] py-0" value={value} onChange={(e) => onChange(Number(e.target.value))}>
      {options.map((min) => (
        <option key={min} value={min}>
          {min === 24 * 60 - 1 ? "23:59" : formatMin(min)}
        </option>
      ))}
    </select>
  );
}

export function HoursDesk({ shop, run }: DeskProps) {
  const [hours, setHours] = useState(() => [...shop.hours].sort((a, b) => a.weekday - b.weekday));
  const [slot, setSlot] = useState(shop.profile.slotMinutes);
  const [closure, setClosure] = useState({ day: "", professionalId: "all", note: "" });
  const today = todayInSaoPaulo();
  const upcoming = shop.closures.filter((c) => c.day >= today);

  const patch = (weekday: number, change: Partial<(typeof hours)[number]>) =>
    setHours((list) => list.map((h) => (h.weekday === weekday ? { ...h, ...change } : h)));

  return (
    <div>
      <Section title="Funcionamento da semana">
        <Panel className="divide-y divide-line">
          {hours.map((h) => (
            <div key={h.weekday} className="flex flex-wrap items-center gap-4 px-5 py-3.5">
              <Switch checked={h.isOpen} onCheckedChange={(isOpen) => patch(h.weekday, { isOpen })} label={DAY_NAMES[h.weekday]} className="w-40" />
              {h.isOpen ? (
                <div className="flex items-center gap-2 text-sm text-muted">
                  <TimeSelect label={`Abre ${DAY_NAMES[h.weekday]}`} value={h.openMin} onChange={(openMin) => patch(h.weekday, { openMin })} />
                  até
                  <TimeSelect label={`Fecha ${DAY_NAMES[h.weekday]}`} value={h.closeMin} onChange={(closeMin) => patch(h.weekday, { closeMin })} />
                </div>
              ) : (
                <span className="text-sm text-subtle">Fechado</span>
              )}
            </div>
          ))}
        </Panel>
        <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
          <Field label="Intervalo entre horários">
            <Segmented
              label="Intervalo"
              options={SLOT_STEPS.map((s) => [String(s), `${s} min`] as const)}
              value={String(slot)}
              onChange={(v) => setSlot(Number(v))}
            />
          </Field>
          <Button onClick={() => void run(() => saveHours({ data: { hours, slotMinutes: slot } }), "Horários salvos")}>Salvar horários</Button>
        </div>
      </Section>

      <Section title="Folgas e feriados">
        <Panel className="grid gap-4 p-5 sm:grid-cols-[1fr_1fr_1.4fr_auto] sm:items-end">
          <TextField label="Dia" type="date" min={today} value={closure.day} onChange={(e) => setClosure({ ...closure, day: e.target.value })} />
          <Field label="Quem">
            <select className="field" value={closure.professionalId} onChange={(e) => setClosure({ ...closure, professionalId: e.target.value })}>
              <option value="all">A casa toda</option>
              {shop.professionals.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
          <TextField label="Motivo (opcional)" value={closure.note} onChange={(e) => setClosure({ ...closure, note: e.target.value })} maxLength={140} />
          <Button
            disabled={!closure.day}
            onClick={async () => {
              if (await run(() => saveClosure({ data: closure }), "Folga registrada")) setClosure({ day: "", professionalId: "all", note: "" });
            }}
          >
            Adicionar
          </Button>
        </Panel>
        {upcoming.length ? (
          <ul className="mt-4 divide-y divide-line rounded-[var(--radius-card)] border border-line">
            {upcoming.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-4 px-5 py-3.5 text-sm">
                <span>
                  <span className="font-medium">{formatDayShort(c.day)}</span>
                  <span className="text-muted">
                    {" "}
                    · {c.professionalId ? (shop.professionals.find((p) => p.id === c.professionalId)?.name ?? "Profissional") : "Casa fechada"}
                    {c.note ? ` · ${c.note}` : ""}
                  </span>
                </span>
                <Button variant="ghost" size="icon-sm" aria-label="Remover folga" onClick={() => void run(() => deleteClosure({ data: { id: c.id } }), "Folga removida")}>
                  <Trash2 />
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-subtle">Nenhuma folga marcada.</p>
        )}
      </Section>
    </div>
  );
}

// ── Galeria ─────────────────────────────────────────────────────────────────

export function GalleryDesk({ shop, run }: DeskProps) {
  return (
    <ul className="grid gap-3">
      {shop.gallery.map((item, index) => (
        <GalleryRow key={item.id} item={item} first={index === 0} last={index === shop.gallery.length - 1} run={run} />
      ))}
    </ul>
  );
}

function GalleryRow({
  item,
  first,
  last,
  run,
}: {
  item: AdminShop["gallery"][number];
  first: boolean;
  last: boolean;
  run: Run;
}) {
  const [caption, setCaption] = useState(item.caption);
  return (
    <li>
      <Panel className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
        <img src={item.src} alt={item.alt} className="aspect-video w-full rounded-2xl bg-raised-2 object-cover sm:w-40" />
        <div className="grid flex-1 gap-3">
          <Input value={caption} onChange={(e) => setCaption(e.target.value)} aria-label="Legenda" maxLength={180} />
          <div className="flex flex-wrap items-center gap-3">
            <Switch
              checked={item.visible}
              onCheckedChange={(visible) => void run(() => saveGalleryItem({ data: { id: item.id, caption, visible } }), visible ? "Foto visível" : "Foto oculta")}
              label="Visível"
            />
            <div className="ml-auto flex gap-1">
              <Button variant="ghost" size="icon-sm" aria-label="Subir" disabled={first} onClick={() => void run(() => moveGallery({ data: { id: item.id, direction: "up" } }), "Ordem salva")}>
                <ArrowUp />
              </Button>
              <Button variant="ghost" size="icon-sm" aria-label="Descer" disabled={last} onClick={() => void run(() => moveGallery({ data: { id: item.id, direction: "down" } }), "Ordem salva")}>
                <ArrowDown />
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={caption === item.caption}
                onClick={() => void run(() => saveGalleryItem({ data: { id: item.id, caption, visible: item.visible } }), "Legenda salva")}
              >
                Salvar
              </Button>
            </div>
          </div>
        </div>
      </Panel>
    </li>
  );
}

// ── Candidaturas ────────────────────────────────────────────────────────────

export function ApplicationsDesk({ shop, run }: DeskProps) {
  if (!shop.applications.length) return <Empty>Nenhuma candidatura ainda. Elas chegam pelo “Trabalhe conosco” do site.</Empty>;
  return (
    <ul className="grid gap-3">
      {shop.applications.map((app) => (
        <ApplicationRow key={app.id} app={app} run={run} />
      ))}
    </ul>
  );
}

function ApplicationRow({ app, run }: { app: AdminShop["applications"][number]; run: Run }) {
  const [note, setNote] = useState(app.note);
  const [status, setStatus] = useState(app.status);
  const portfolio = safeHttp(app.portfolio);
  const label = APPLICATION_STATUS.find(([id]) => id === app.status)?.[1] ?? app.status;
  return (
    <li>
      <Panel className="p-5">
        <details className="group">
          <summary className="flex list-none flex-wrap items-center gap-3 [&::-webkit-details-marker]:hidden">
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-raised-3 text-sm font-semibold">{initials(app.name)}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold">{app.name}</span>
              <span className="block truncate text-sm text-muted">
                {app.role} {app.experience ? `· ${app.experience}` : ""} · {app.createdAt}
              </span>
            </span>
            <Badge tone={app.status === "recebida" ? "cognac" : app.status === "encerrada" ? "neutral" : "ok"}>{label}</Badge>
          </summary>
          <div className="mt-5 grid gap-4 border-t border-line pt-5">
            <p className="text-sm leading-relaxed whitespace-pre-line text-muted">{app.about}</p>
            <div className="flex flex-wrap gap-2 text-sm">
              <WhatsButton phone={app.whatsapp} />
              <span className="self-center text-muted tnum">{formatWhatsapp(app.whatsapp)}</span>
              {app.email ? (
                <a href={`mailto:${app.email}`} className="self-center text-muted underline">
                  {app.email}
                </a>
              ) : null}
              {portfolio ? (
                <a href={portfolio} target="_blank" rel="noreferrer" className="self-center text-muted underline">
                  Portfólio
                </a>
              ) : null}
            </div>
            <div className="grid gap-4 sm:grid-cols-[200px_1fr]">
              <Field label="Status">
                <select className="field" value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
                  {APPLICATION_STATUS.map(([id, text]) => (
                    <option key={id} value={id}>
                      {text}
                    </option>
                  ))}
                </select>
              </Field>
              <TextField label="Anotação" value={note} onChange={(e) => setNote(e.target.value)} maxLength={400} />
            </div>
            <div className="flex flex-wrap justify-between gap-3">
              <Button variant="ghost" size="sm" className="text-danger" onClick={() => void run(() => deleteApplication({ data: { id: app.id } }), "Candidatura apagada")}>
                <Trash2 /> Apagar
              </Button>
              <Button size="sm" onClick={() => void run(() => setApplicationStatus({ data: { id: app.id, status, note } }), "Candidatura atualizada")}>
                Salvar
              </Button>
            </div>
          </div>
        </details>
      </Panel>
    </li>
  );
}

// ── Acessos ─────────────────────────────────────────────────────────────────

export function AccessDesk({ shop, run }: DeskProps) {
  const { me } = useMe();
  const [email, setEmail] = useState("");
  return (
    <div>
      <p className="max-w-xl text-sm text-muted">
        Quem está nesta lista abre o painel e vê nome e WhatsApp dos clientes. A pessoa precisa criar a conta no site
        antes de ser liberada.
      </p>
      <form
        className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end"
        onSubmit={async (event) => {
          event.preventDefault();
          if (await run(() => addStaffByEmail({ data: { email } }), "Acesso liberado")) setEmail("");
        }}
      >
        <TextField label="E-mail da conta" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="flex-1" />
        <Button type="submit" disabled={!email.includes("@")}>
          Liberar acesso
        </Button>
      </form>
      <ul className="mt-8 divide-y divide-line overflow-hidden rounded-[var(--radius-card)] border border-line bg-raised">
        {shop.staff.map((member) => (
          <li key={member.userId} className="flex items-center gap-4 px-5 py-4">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-raised-3 text-[13px] font-semibold">
              {initials(member.name || member.email)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">
                {member.name || "Sem nome"} {member.userId === me?.id ? <span className="text-subtle">(você)</span> : null}
              </p>
              <p className="truncate text-sm text-muted">{member.email}</p>
            </div>
            {member.userId === me?.id ? null : (
              <Button variant="ghost" size="sm" className="text-danger" onClick={() => void run(() => removeStaff({ data: { userId: member.userId } }), "Acesso removido")}>
                Remover
              </Button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Dados da casa ───────────────────────────────────────────────────────────

export function SettingsDesk({ shop, run }: DeskProps) {
  const p = shop.profile;
  const [form, setForm] = useState({
    phoneDisplay: p.phoneDisplay,
    phoneNote: p.phoneNote,
    whatsappDisplay: p.whatsappDisplay,
    whatsappNote: p.whatsappNote,
    city: p.city,
    addressLine: p.addressLine,
    mapsQuery: p.mapsQuery,
    instagram: p.instagram,
    hoursDisclaimer: p.hoursDisclaimer,
  });
  const set = (key: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [key]: e.target.value });
  return (
    <form
      className="grid gap-5 sm:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        void run(() => saveProfile({ data: form }), "Dados salvos");
      }}
    >
      <TextField label="Endereço" value={form.addressLine} onChange={set("addressLine")} placeholder="Rua, número, bairro" className="sm:col-span-2" />
      <TextField label="Cidade" value={form.city} onChange={set("city")} />
      <TextField label="Busca no mapa" value={form.mapsQuery} onChange={set("mapsQuery")} hint="O que o botão de mapa procura no Google Maps." />
      <TextField label="Telefone" value={form.phoneDisplay} onChange={set("phoneDisplay")} />
      <TextField label="Nota interna do telefone" value={form.phoneNote} onChange={set("phoneNote")} hint="Não aparece no site." />
      <TextField label="WhatsApp" value={form.whatsappDisplay} onChange={set("whatsappDisplay")} />
      <TextField label="Nota interna do WhatsApp" value={form.whatsappNote} onChange={set("whatsappNote")} hint="Não aparece no site." />
      <TextField label="Instagram (link)" value={form.instagram} onChange={set("instagram")} placeholder="https://instagram.com/…" />
      <TextField label="Aviso abaixo dos horários" value={form.hoursDisclaimer} onChange={set("hoursDisclaimer")} hint="Deixe vazio para não mostrar." />
      <div className="sm:col-span-2">
        <Button type="submit">Salvar dados</Button>
      </div>
    </form>
  );
}
