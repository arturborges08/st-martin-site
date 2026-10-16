import { Link } from "@tanstack/react-router";
import { ArrowLeft, CalendarPlus, Check, ChevronLeft, ChevronRight, UserRound, Users } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { SiteFrame } from "@/components/site/shell";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import {
  errorText,
  formatDayLabel,
  formatDuration,
  formatMin,
  initials,
  isValidWhatsapp,
  presentPrice,
  refCode,
} from "@/lib/format";
import { refreshMe, useMe } from "@/lib/me-store";
import { bookSlot, listSlots } from "@/lib/shop.functions";
import { addDays, todayInSaoPaulo, weekdayFromIso } from "@/lib/time";
import type { PublicShop, SlotOption } from "@/lib/types";

const STEP_LABELS = ["Serviço", "Profissional", "Dia e hora", "Seus dados"] as const;
const WEEK_SHORT = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const MONTH_SHORT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

type Result = Awaited<ReturnType<typeof bookSlot>> & { name: string };

export type BookingSearch = { servico: string; profissional: string; dia: string; hora: string };

function maskWhatsapp(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function icsFor(result: Result, address: string): string {
  const [y, m, d] = result.day.split("-");
  const stamp = (min: number) => `${y}${m}${d}T${String(Math.floor(min / 60)).padStart(2, "0")}${String(min % 60).padStart(2, "0")}00`;
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//St. Martin//Agenda//PT",
    "BEGIN:VEVENT",
    `UID:${result.id}@stmartin`,
    `DTSTART;TZID=America/Sao_Paulo:${stamp(result.startMin)}`,
    `DTEND;TZID=America/Sao_Paulo:${stamp(result.endMin)}`,
    `SUMMARY:${result.serviceName} · St. Martin`,
    `LOCATION:${address}`,
    `DESCRIPTION:Com ${result.professionalName}. Código ${refCode(result.id)}.`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

export function BookingFlow({ shop, search }: { shop: PublicShop; search: BookingSearch }) {
  const today = todayInSaoPaulo();
  const { me } = useMe();
  const realPros = shop.professionals.filter((p) => !p.demo);
  const skipPro = realPros.length === 0 || shop.professionals.length <= 1;

  const initialService = shop.services.some((s) => s.id === search.servico) ? search.servico : "";
  const initialPro =
    search.profissional === "any" || shop.professionals.some((p) => p.id === search.profissional)
      ? search.profissional
      : skipPro
        ? "any"
        : "";

  const [serviceId, setServiceId] = useState(initialService);
  const [professionalId, setProfessionalId] = useState(initialPro);
  const [day, setDay] = useState(/^\d{4}-\d{2}-\d{2}$/.test(search.dia) ? search.dia : "");
  const [startMin, setStartMin] = useState<number | null>(search.hora && /^\d+$/.test(search.hora) ? Number(search.hora) : null);
  const [step, setStep] = useState(() => {
    if (!initialService) return 0;
    if (!initialPro) return 1;
    return 2;
  });
  const [slots, setSlots] = useState<SlotOption[]>([]);
  const [slotsState, setSlotsState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const top = useRef<HTMLDivElement>(null);
  const rail = useRef<HTMLDivElement>(null);
  const prefilled = useRef(false);

  const service = shop.services.find((s) => s.id === serviceId) ?? null;
  const professional = shop.professionals.find((p) => p.id === professionalId) ?? null;

  useEffect(() => {
    if (me && !prefilled.current) {
      prefilled.current = true;
      setName((v) => v || me.name);
      setWhatsapp((v) => v || maskWhatsapp(me.whatsapp));
    }
  }, [me]);

  // Dias abertos nos próximos 60 dias, já filtrando folgas da casa e do profissional.
  const days = useMemo(() => {
    const list: string[] = [];
    for (let i = 0; i <= 60; i += 1) {
      const iso = addDays(today, i);
      const weekday = weekdayFromIso(iso);
      const hours = shop.hours.find((h) => h.weekday === weekday);
      if (!hours?.isOpen) continue;
      if (shop.closures.some((c) => c.day === iso && c.professionalId === null)) continue;
      if (professionalId && professionalId !== "any") {
        const person = shop.professionals.find((p) => p.id === professionalId);
        if (!person?.weekdays.includes(weekday)) continue;
        if (shop.closures.some((c) => c.day === iso && c.professionalId === professionalId)) continue;
      }
      list.push(iso);
    }
    return list;
  }, [today, shop, professionalId]);

  useEffect(() => {
    if (step === 2 && !day && days.length) setDay(days[0]);
  }, [step, day, days]);

  useEffect(() => {
    if (!day || !serviceId || !professionalId) return;
    let cancel = false;
    setSlotsState("loading");
    listSlots({ data: { day, serviceId, professionalId } })
      .then((next) => {
        if (cancel) return;
        setSlots(next);
        setSlotsState("ready");
        setStartMin((current) => (current !== null && !next.some((s) => s.startMin === current) ? null : current));
      })
      .catch(() => !cancel && setSlotsState("error"));
    return () => {
      cancel = true;
    };
  }, [day, serviceId, professionalId]);

  function go(next: number) {
    setError("");
    setStep(next);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (top.current && top.current.getBoundingClientRect().top < 0) {
      top.current.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    }
  }

  function back() {
    if (step === 2 && skipPro) return go(0);
    go(Math.max(0, step - 1));
  }

  function canContinue(): boolean {
    if (step === 0) return Boolean(serviceId);
    if (step === 1) return Boolean(professionalId);
    if (step === 2) return Boolean(day) && startMin !== null;
    return true;
  }

  function next() {
    if (step === 0) return go(skipPro ? 2 : 1);
    if (step < 3) return go(step + 1);
    void confirm();
  }

  async function confirm() {
    if (!service || startMin === null || !day || !professionalId) return;
    if (name.trim().split(" ").filter(Boolean).length < 2) return setError("Coloque nome e sobrenome.");
    if (!isValidWhatsapp(whatsapp)) return setError("O WhatsApp precisa ter DDD. Ex.: (18) 99999-0000");
    setBusy(true);
    setError("");
    try {
      const booked = await bookSlot({
        data: { day, startMin, serviceId: service.id, professionalId, name: name.trim(), whatsapp },
      });
      setResult({ ...booked, name: name.trim() });
      if (booked.withAccount) void refreshMe();
      window.scrollTo({ top: 0 });
    } catch (reason) {
      setError(errorText(reason, "Não deu para reservar. Tente outro horário."));
      if (/horário|pegar/i.test(String(reason))) {
        setStartMin(null);
        setStep(2);
      }
    } finally {
      setBusy(false);
    }
  }

  const periods = useMemo(() => {
    const groups = [
      { label: "Manhã", items: slots.filter((s) => s.startMin < 12 * 60) },
      { label: "Tarde", items: slots.filter((s) => s.startMin >= 12 * 60 && s.startMin < 18 * 60) },
      { label: "Noite", items: slots.filter((s) => s.startMin >= 18 * 60) },
    ];
    return groups.filter((g) => g.items.length);
  }, [slots]);

  if (result) {
    const address = shop.profile.addressLine || `St. Martin Bar e Barbearia, ${shop.profile.city}`;
    const ics = `data:text/calendar;charset=utf-8,${encodeURIComponent(icsFor(result, address))}`;
    return (
      <SiteFrame profile={shop.profile} showCta={false}>
        <section className="mx-auto max-w-xl px-5 pt-32 pb-24 sm:px-8" role="status">
          <span className="rise grid size-16 place-items-center rounded-full bg-ok/15 text-ok">
            <Check className="size-8" strokeWidth={2.4} />
          </span>
          <h1 className="rise rise-1 mt-8 text-4xl font-semibold sm:text-5xl">Horário reservado.</h1>
          <p className="rise rise-2 mt-3 text-lg text-muted">
            Te esperamos, {result.name.split(" ")[0]}. Se precisar mudar, avise a barbearia pelo WhatsApp.
          </p>
          <dl className="rise rise-3 mt-10 divide-y divide-line rounded-[var(--radius-card)] border border-line bg-raised px-6">
            {[
              ["Serviço", result.serviceName],
              ["Quando", `${formatDayLabel(result.day)}, ${formatMin(result.startMin)}`],
              ["Com", result.professionalName],
              ["Valor", presentPrice(result.priceLabel)],
              ["Código", refCode(result.id)],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-6 py-4 text-[15px]">
                <dt className="text-muted">{label}</dt>
                <dd className="text-right font-medium tnum">{value}</dd>
              </div>
            ))}
          </dl>
          <div className="rise rise-4 mt-6 flex flex-wrap gap-3">
            <Button asChild variant="secondary">
              <a href={ics} download="st-martin-horario.ics">
                <CalendarPlus /> Salvar no calendário
              </a>
            </Button>
            <Button asChild variant="ghost">
              <Link to="/">Voltar ao início</Link>
            </Button>
          </div>
          {result.withAccount ? (
            <p className="mt-10 rounded-2xl bg-white/[0.04] p-5 text-sm text-muted">
              A confirmação também está no sino e em{" "}
              <Link to="/conta" className="text-fg underline">
                Meus horários
              </Link>
              .
            </p>
          ) : (
            <div className="mt-10 rounded-[var(--radius-card)] border border-line p-6">
              <p className="font-semibold">Quer acompanhar seus horários?</p>
              <p className="mt-1 text-sm text-muted">
                Com uma conta você vê o histórico, cancela pelo site e recebe avisos quando a barbearia mudar algo. É
                opcional.
              </p>
              <Button asChild size="sm" className="mt-4">
                <Link to="/entrar" search={{ next: "/conta" }}>
                  Criar conta
                </Link>
              </Button>
            </div>
          )}
        </section>
      </SiteFrame>
    );
  }

  const visibleSteps = skipPro ? [0, 2, 3] : [0, 1, 2, 3];
  const position = visibleSteps.indexOf(step);

  const summary = (
    <dl className="grid gap-4 text-[15px]">
      <SummaryRow label="Serviço" value={service ? `${service.name} · ${formatDuration(service.durationMin)}` : null} />
      {skipPro ? null : (
        <SummaryRow
          label="Profissional"
          value={professionalId === "any" ? "Primeiro disponível" : (professional?.name ?? null)}
        />
      )}
      <SummaryRow
        label="Quando"
        value={day && startMin !== null ? `${formatDayLabel(day)}, ${formatMin(startMin)}` : null}
      />
      <SummaryRow label="Valor" value={service ? presentPrice(service.priceLabel) : null} />
    </dl>
  );

  return (
    <SiteFrame profile={shop.profile} showCta={false}>
      <div ref={top} className="mx-auto max-w-6xl scroll-mt-24 px-5 pt-28 pb-40 sm:px-8 lg:pb-24">
        <div className="flex items-center gap-3">
          {position > 0 ? (
            <Button variant="secondary" size="icon" onClick={back} aria-label="Voltar etapa">
              <ArrowLeft />
            </Button>
          ) : null}
          <p className="text-sm text-muted tnum">
            Etapa {position + 1} de {visibleSteps.length}
          </p>
        </div>
        <div className="mt-5 flex gap-1.5" aria-hidden="true">
          {visibleSteps.map((s, i) => (
            <span key={s} className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
              <span
                className="block h-full rounded-full bg-fg transition-[width] duration-500 ease-[var(--ease-out)]"
                style={{ width: i <= position ? "100%" : "0%" }}
              />
            </span>
          ))}
        </div>

        <div className="mt-10 grid gap-10 lg:grid-cols-12 lg:gap-14">
          <div className="min-w-0 lg:col-span-8">
            <div key={step} className="step-panel">
              {step === 0 ? (
                <>
                  <h1 className="text-4xl font-semibold sm:text-5xl">Qual serviço?</h1>
                  <div className="mt-8 grid gap-3" role="radiogroup" aria-label="Serviço">
                    {shop.services.length === 0 ? (
                      <p className="text-muted">Nenhum serviço disponível agora.</p>
                    ) : (
                      shop.services.map((item) => (
                        <Choice
                          key={item.id}
                          selected={serviceId === item.id}
                          onClick={() => {
                            setServiceId(item.id);
                            setStartMin(null);
                          }}
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block text-lg font-semibold">{item.name}</span>
                            <span className="mt-0.5 block text-sm text-muted">{item.description}</span>
                          </span>
                          <span className="shrink-0 text-right tnum">
                            <span className="block text-[15px] font-medium">{presentPrice(item.priceLabel)}</span>
                            <span className="block text-[13px] text-subtle">{formatDuration(item.durationMin)}</span>
                          </span>
                        </Choice>
                      ))
                    )}
                  </div>
                </>
              ) : null}

              {step === 1 ? (
                <>
                  <h1 className="text-4xl font-semibold sm:text-5xl">Com quem?</h1>
                  <div className="mt-8 grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Profissional">
                    <Choice
                      selected={professionalId === "any"}
                      onClick={() => {
                        setProfessionalId("any");
                        setStartMin(null);
                      }}
                    >
                      <span className="grid size-12 shrink-0 place-items-center rounded-full bg-raised-3">
                        <Users className="size-5 text-muted" />
                      </span>
                      <span>
                        <span className="block text-lg font-semibold">Primeiro disponível</span>
                        <span className="block text-sm text-muted">Mais horários para escolher</span>
                      </span>
                    </Choice>
                    {shop.professionals.map((item) => (
                      <Choice
                        key={item.id}
                        selected={professionalId === item.id}
                        onClick={() => {
                          setProfessionalId(item.id);
                          setDay("");
                          setStartMin(null);
                        }}
                      >
                        {item.photoUrl ? (
                          <img src={item.photoUrl} alt="" className="size-12 shrink-0 rounded-full object-cover" />
                        ) : (
                          <span className="grid size-12 shrink-0 place-items-center rounded-full bg-raised-3 text-sm font-semibold">
                            {item.demo ? <UserRound className="size-5 text-muted" /> : initials(item.name)}
                          </span>
                        )}
                        <span className="min-w-0">
                          <span className="block truncate text-lg font-semibold">{item.name}</span>
                          <span className="block truncate text-sm text-muted">{item.specialty}</span>
                        </span>
                      </Choice>
                    ))}
                  </div>
                </>
              ) : null}

              {step === 2 ? (
                <>
                  <h1 className="text-4xl font-semibold sm:text-5xl">Que dia e hora?</h1>
                  {days.length === 0 ? (
                    <p className="mt-8 text-muted">Não há dias abertos na agenda agora. Fale com a barbearia.</p>
                  ) : (
                    <>
                      <div className="relative mt-8">
                        <div
                          ref={rail}
                          className="-mx-5 flex snap-x gap-2 overflow-x-auto scroll-px-5 px-5 pb-2 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden"
                          role="radiogroup"
                          aria-label="Dia"
                        >
                          {days.map((iso) => {
                            const [, m, d] = iso.split("-").map(Number);
                            const active = day === iso;
                            return (
                              <button
                                key={iso}
                                type="button"
                                role="radio"
                                aria-checked={active}
                                aria-label={formatDayLabel(iso)}
                                onClick={() => {
                                  setDay(iso);
                                  setStartMin(null);
                                }}
                                className={cn(
                                  "press flex w-[4.25rem] shrink-0 snap-start flex-col items-center rounded-2xl border py-3 transition-[background-color,border-color,color] duration-200",
                                  active
                                    ? "border-fg bg-fg text-bg"
                                    : "border-line bg-raised text-fg hover:border-line-strong",
                                )}
                              >
                                <span className={cn("text-xs", active ? "text-bg/70" : "text-muted")}>
                                  {iso === today ? "hoje" : WEEK_SHORT[weekdayFromIso(iso)]}
                                </span>
                                <span className="mt-0.5 text-xl font-semibold tnum">{d}</span>
                                <span className={cn("text-[11px]", active ? "text-bg/60" : "text-subtle")}>
                                  {MONTH_SHORT[m - 1]}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                        <div className="mt-3 hidden justify-end gap-2 sm:flex">
                          <Button
                            variant="secondary"
                            size="icon-sm"
                            aria-label="Dias anteriores"
                            onClick={() => rail.current?.scrollBy({ left: -320, behavior: "smooth" })}
                          >
                            <ChevronLeft />
                          </Button>
                          <Button
                            variant="secondary"
                            size="icon-sm"
                            aria-label="Próximos dias"
                            onClick={() => rail.current?.scrollBy({ left: 320, behavior: "smooth" })}
                          >
                            <ChevronRight />
                          </Button>
                        </div>
                      </div>

                      <div className="mt-8 min-h-48" aria-live="polite">
                        {slotsState === "loading" ? (
                          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5" aria-label="Carregando horários">
                            {Array.from({ length: 10 }, (_, i) => (
                              <span key={i} className="h-12 animate-pulse rounded-2xl bg-white/[0.05]" />
                            ))}
                          </div>
                        ) : slotsState === "error" ? (
                          <p className="text-muted">Não deu para carregar os horários. Troque de dia e volte.</p>
                        ) : slotsState === "ready" && slots.length === 0 ? (
                          <p className="text-muted">Esse dia está cheio. Tente outro.</p>
                        ) : (
                          <div className="grid gap-7">
                            {periods.map((group) => (
                              <div key={group.label}>
                                <p className="text-sm font-medium text-muted">{group.label}</p>
                                <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5" role="radiogroup" aria-label={group.label}>
                                  {group.items.map((slot) => {
                                    const active = startMin === slot.startMin;
                                    return (
                                      <button
                                        key={slot.startMin}
                                        type="button"
                                        role="radio"
                                        aria-checked={active}
                                        onClick={() => setStartMin(slot.startMin)}
                                        className={cn(
                                          "press h-12 rounded-2xl border text-[15px] font-medium tnum transition-[background-color,border-color,color] duration-200",
                                          active
                                            ? "border-fg bg-fg text-bg"
                                            : "border-line bg-raised hover:border-line-strong",
                                        )}
                                      >
                                        {formatMin(slot.startMin)}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </>
              ) : null}

              {step === 3 ? (
                <>
                  <h1 className="text-4xl font-semibold sm:text-5xl">Quase lá.</h1>
                  <p className="mt-3 text-muted">
                    {me ? "Confira seus dados." : "Só nome e WhatsApp. Não precisa criar conta."}
                  </p>
                  <form
                    className="mt-8 grid max-w-lg gap-5"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void confirm();
                    }}
                  >
                    <TextField label="Nome e sobrenome" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={80} />
                    <TextField
                      label="WhatsApp"
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(maskWhatsapp(e.target.value))}
                      autoComplete="tel"
                      inputMode="tel"
                      placeholder="(18) 99999-0000"
                      hint="A barbearia usa esse número se precisar falar com você."
                    />
                    <button type="submit" className="sr-only">
                      Confirmar
                    </button>
                  </form>
                  {!me ? (
                    <p className="mt-6 text-sm text-muted">
                      Já tem conta?{" "}
                      <Link to="/entrar" search={{ next: "/agendar" }} className="text-fg underline">
                        Entrar
                      </Link>{" "}
                      para guardar este horário no seu histórico.
                    </p>
                  ) : null}
                </>
              ) : null}
            </div>

            {error ? (
              <p role="alert" className="mt-6 rounded-2xl bg-danger/12 px-4 py-3 text-sm text-danger">
                {error}
              </p>
            ) : null}
          </div>

          <aside className="hidden lg:col-span-4 lg:block">
            <div className="sticky top-28 rounded-[var(--radius-card)] border border-line bg-raised p-7">
              <p className="text-sm font-medium text-muted">Seu horário</p>
              <div className="mt-5">{summary}</div>
              <Button size="lg" className="mt-8 w-full" onClick={next} disabled={!canContinue() || busy}>
                {step === 3 ? (busy ? "Reservando…" : "Confirmar horário") : "Continuar"}
              </Button>
            </div>
          </aside>
        </div>
      </div>

      <div className="glass fixed inset-x-0 bottom-0 z-30 border-t border-line px-4 pt-3 pb-[max(14px,env(safe-area-inset-bottom))] lg:hidden">
        <div className="mx-auto flex max-w-xl items-center gap-4">
          <div className="min-w-0 flex-1 text-sm">
            <p className="truncate font-medium">{service ? service.name : "Escolha um serviço"}</p>
            <p className="truncate text-muted tnum">
              {day && startMin !== null
                ? `${formatDayLabel(day)}, ${formatMin(startMin)}`
                : service
                  ? `${formatDuration(service.durationMin)} · ${presentPrice(service.priceLabel)}`
                  : "Etapa " + (position + 1) + " de " + visibleSteps.length}
            </p>
          </div>
          <Button size="lg" onClick={next} disabled={!canContinue() || busy}>
            {step === 3 ? (busy ? "Reservando…" : "Confirmar") : "Continuar"}
          </Button>
        </div>
      </div>
    </SiteFrame>
  );
}

function Choice({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      className={cn(
        "press flex w-full items-center gap-4 rounded-[1.25rem] border p-5 text-left transition-[background-color,border-color,box-shadow] duration-200",
        selected
          ? "border-fg/80 bg-raised-2 shadow-[inset_0_0_0_1px_var(--color-fg)]"
          : "border-line bg-raised hover:border-line-strong",
      )}
    >
      {children}
      <span
        aria-hidden="true"
        className={cn(
          "grid size-6 shrink-0 place-items-center rounded-full border transition-colors duration-200",
          selected ? "border-fg bg-fg text-bg" : "border-line-strong",
        )}
      >
        {selected ? <Check className="size-3.5" strokeWidth={3} /> : null}
      </span>
    </button>
  );
}

function SummaryRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-[13px] text-subtle">{label}</dt>
      <dd className={cn("mt-0.5", value ? "font-medium" : "text-subtle")}>{value ?? "—"}</dd>
    </div>
  );
}
