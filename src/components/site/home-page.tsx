import { Link } from "@tanstack/react-router";
import { ArrowRight, ArrowUpRight, ChevronLeft, ChevronRight, Clock, MapPin, Phone } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Careers } from "@/components/site/careers";
import { SiteFrame } from "@/components/site/shell";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import {
  formatDayShort,
  formatDuration,
  formatMin,
  formatWhatsapp,
  groupHours,
  initials,
  presentPrice,
  whatsAppHref,
} from "@/lib/format";
import { getNextSlot } from "@/lib/shop.functions";
import { addDays, todayInSaoPaulo, weekdayFromIso } from "@/lib/time";
import type { NextSlot, PublicShop } from "@/lib/types";

const BOOK_SEARCH = { servico: "", profissional: "", dia: "", hora: "" };

/** Adiciona `is-in` quando o elemento entra na tela (uma vez). */
function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!("IntersectionObserver" in window)) {
      el.classList.add("is-in");
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            observer.disconnect();
          }
        }
      },
      { rootMargin: "0px 0px -12% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return ref;
}

function dayWord(iso: string): string {
  const today = todayInSaoPaulo();
  if (iso === today) return "Hoje";
  if (iso === addDays(today, 1)) return "Amanhã";
  return formatDayShort(iso).replace(/^./, (c) => c.toUpperCase());
}

function NextSlotCard() {
  const [slot, setSlot] = useState<NextSlot | undefined>(undefined);
  useEffect(() => {
    let alive = true;
    getNextSlot()
      .then((value) => alive && setSlot(value))
      .catch(() => alive && setSlot(null));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="glass rise rise-4 w-full max-w-sm rounded-[1.5rem] border border-line p-2 shadow-[0_20px_60px_rgb(0_0_0/0.5)]">
      <div className="flex items-center gap-4 rounded-[1.1rem] bg-white/[0.04] px-4 py-3.5">
        <span className="relative grid size-10 shrink-0 place-items-center rounded-full bg-ok/15 text-ok">
          <Clock className="size-[18px]" />
          {slot ? <span className="absolute -top-0.5 -right-0.5 size-2.5 animate-pulse rounded-full bg-ok" aria-hidden="true" /> : null}
        </span>
        <div className="min-w-0 flex-1" aria-live="polite">
          <p className="text-xs text-muted">Próximo horário livre</p>
          {slot === undefined ? (
            <span className="mt-1 block h-5 w-36 animate-pulse rounded bg-white/[0.06]" />
          ) : slot ? (
            <p className="truncate text-[15px] font-semibold tnum">
              {dayWord(slot.day)}, {formatMin(slot.startMin)}
              <span className="font-normal text-muted"> · {slot.serviceName}</span>
            </p>
          ) : (
            <p className="text-[15px] font-semibold">Veja a agenda da semana</p>
          )}
        </div>
        <Button asChild size="icon-sm" variant="primary" aria-label="Reservar este horário">
          <Link
            to="/agendar"
            search={
              slot
                ? { servico: slot.serviceId, profissional: "any", dia: slot.day, hora: String(slot.startMin) }
                : BOOK_SEARCH
            }
          >
            <ArrowRight />
          </Link>
        </Button>
      </div>
    </div>
  );
}

function Hero({ shop }: { shop: PublicShop }) {
  return (
    <section id="inicio" className="relative isolate flex min-h-[100svh] flex-col overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <img
          src="/media/fachada.jpg"
          alt=""
          width={1440}
          height={1440}
          fetchPriority="high"
          className="h-full w-full object-cover object-[60%_30%] opacity-70 lg:object-[70%_35%]"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgb(11_11_10/0.55)_0%,rgb(11_11_10/0.15)_30%,rgb(11_11_10/0.85)_72%,#0b0b0a_100%)] lg:bg-[linear-gradient(90deg,#0b0b0a_0%,rgb(11_11_10/0.88)_34%,rgb(11_11_10/0.2)_70%,rgb(11_11_10/0.5)_100%)]" />
      </div>

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-end px-5 pt-28 pb-10 sm:px-8 lg:justify-center lg:pb-16">
        <img
          src="/brand/monogram.png"
          alt=""
          width={228}
          height={142}
          className="rise mb-8 h-14 w-auto self-start opacity-95 sm:h-16"
        />
        <h1 className="rise rise-1 max-w-[12ch] text-[clamp(3rem,9vw,6rem)] leading-[0.95] font-semibold tracking-[-0.04em]">
          Barba, cabelo, bigode e cerveja.
        </h1>
        <p className="rise rise-2 mt-6 max-w-md text-lg text-muted sm:text-xl">
          Barbearia e bar em {shop.profile.city.replace("/", ", ")}. Escolha o serviço e o horário, e sua cadeira fica
          guardada.
        </p>
        <div className="rise rise-3 mt-9 flex flex-wrap items-center gap-3">
          <Button asChild size="lg">
            <Link to="/agendar" search={BOOK_SEARCH}>
              Agendar horário
            </Link>
          </Button>
          <Button asChild size="lg" variant="secondary">
            <a href="#servicos">Ver serviços</a>
          </Button>
        </div>
        <div className="mt-12 lg:mt-16">
          <NextSlotCard />
        </div>
      </div>
    </section>
  );
}

function WordBand() {
  const words = ["Barba", "Cabelo", "Bigode", "Cerveja"];
  const row = [...words, ...words, ...words];
  return (
    <div aria-hidden="true" className="overflow-hidden border-y border-line py-6 select-none">
      <div className="marquee flex w-max gap-10 whitespace-nowrap">
        {[...row, ...row].map((word, index) => (
          <span key={index} className="flex items-center gap-10 text-5xl font-semibold tracking-[-0.04em] text-white/[0.09] sm:text-7xl">
            {word}
            <img src="/brand/monogram.png" alt="" className="h-6 w-auto opacity-25 sm:h-8" />
          </span>
        ))}
      </div>
    </div>
  );
}

function Services({ shop }: { shop: PublicShop }) {
  return (
    <section id="servicos" className="px-5 py-24 sm:px-8 md:py-32">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <h2 className="text-4xl font-semibold sm:text-6xl">Serviços</h2>
          <p className="max-w-sm text-muted">
            Duração média de cada atendimento. Toque em um serviço para ver os horários livres.
          </p>
        </div>
        {shop.services.length === 0 ? (
          <p className="mt-12 text-muted">A lista de serviços está sendo atualizada.</p>
        ) : (
          <ul className="mt-14 border-t border-line">
            {shop.services.map((service) => (
              <li key={service.id} className="border-b border-line">
                <Link
                  to="/agendar"
                  search={{ ...BOOK_SEARCH, servico: service.id }}
                  className="group grid grid-cols-[1fr_auto] items-center gap-x-6 gap-y-2 py-7 sm:py-9 md:grid-cols-[minmax(0,5fr)_minmax(0,5fr)_auto]"
                >
                  <h3 className="text-2xl font-semibold tracking-tight transition-transform duration-300 ease-[var(--ease-out)] group-hover:translate-x-1.5 sm:text-3xl">
                    {service.name}
                  </h3>
                  <p className="col-span-2 row-start-2 max-w-md text-[15px] text-muted md:col-span-1 md:row-start-auto">
                    {service.description}
                  </p>
                  <div className="col-start-2 row-start-1 flex items-center justify-end gap-4 md:col-start-auto md:row-start-auto">
                    <div className="text-right tnum">
                      <p className="text-[15px] font-medium">{presentPrice(service.priceLabel)}</p>
                      <p className="text-[13px] text-subtle">{formatDuration(service.durationMin)}</p>
                    </div>
                    <span className="grid size-11 place-items-center rounded-full border border-line-strong text-muted transition-[background-color,color,border-color] duration-200 group-hover:border-fg group-hover:bg-fg group-hover:text-bg">
                      <ArrowRight className="size-4" />
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function House({ shop }: { shop: PublicShop }) {
  const photo = useReveal<HTMLDivElement>();
  const today = todayInSaoPaulo();
  const todayHours = shop.hours.find((hour) => hour.weekday === weekdayFromIso(today));
  const closedToday = shop.closures.some((closure) => closure.day === today && closure.professionalId === null);
  const todayLabel =
    !todayHours?.isOpen || closedToday ? "Fechado hoje" : `${formatMin(todayHours.openMin)} às ${formatMin(todayHours.closeMin)}`;
  const avg = shop.services.length
    ? Math.round(shop.services.reduce((sum, s) => sum + s.durationMin, 0) / shop.services.length / 5) * 5
    : 0;

  return (
    <section id="casa" className="px-5 pb-24 sm:px-8 md:pb-32">
      <div className="mx-auto grid max-w-6xl gap-4 lg:grid-cols-12">
        <div ref={photo} className="reveal-img relative overflow-hidden rounded-[var(--radius-card)] lg:col-span-8 lg:row-span-2">
          <img
            src="/media/equipe.jpg"
            alt="Equipe da St. Martin reunida em volta da cadeira com o logotipo, dentro da barbearia."
            width={1280}
            height={854}
            loading="lazy"
            className="aspect-[4/3] h-full w-full object-cover lg:aspect-auto"
          />
          <p className="absolute bottom-4 left-5 text-xs text-white/60">Foto: Guido Santuci</p>
        </div>
        <div className="flex flex-col justify-between gap-10 rounded-[var(--radius-card)] bg-raised p-8 lg:col-span-4">
          <h2 className="text-3xl font-semibold sm:text-4xl">Mais que um corte.</h2>
          <p className="text-muted">
            Cadeira de barbeiro, balcão de bar e gente que conhece o seu estilo. Você chega, toma uma gelada e sai no
            ponto.
          </p>
        </div>
        <figure className="flex flex-col justify-between gap-8 rounded-[var(--radius-card)] bg-fg p-8 text-bg lg:col-span-4">
          <img src="/brand/monogram-ink.png" alt="" className="h-9 w-auto self-start" />
          <blockquote className="text-2xl leading-snug font-semibold tracking-tight">
            “A melhor propaganda é feita por clientes satisfeitos.”
          </blockquote>
        </figure>
        <dl className="grid grid-cols-2 overflow-hidden rounded-[var(--radius-card)] border border-line lg:col-span-12 lg:grid-cols-4">
          {[
            { label: "Hoje", value: todayLabel },
            { label: "Atendimento médio", value: avg ? formatDuration(avg) : "—" },
            { label: "Agenda online", value: "Até 60 dias" },
            { label: "Onde", value: shop.profile.city || "Araçatuba/SP" },
          ].map((item, index) => (
            <div
              key={item.label}
              className={cn(
                "p-6 sm:p-7",
                index % 2 === 1 && "border-l border-line",
                index >= 2 && "border-t border-line lg:border-t-0",
                index === 2 && "lg:border-l",
              )}
            >
              <dt className="text-[13px] text-subtle">{item.label}</dt>
              <dd className="mt-1.5 text-lg font-semibold tracking-tight tnum sm:text-xl">{item.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

function Team({ shop }: { shop: PublicShop }) {
  const people = shop.professionals.filter((person) => !person.demo);
  if (!people.length) return null;
  return (
    <section id="equipe" className="border-t border-line px-5 py-24 sm:px-8 md:py-32">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-4xl font-semibold sm:text-6xl">Quem atende</h2>
        <ul className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {people.map((person) => (
            <li key={person.id} className="group overflow-hidden rounded-[var(--radius-card)] bg-raised">
              <div className="aspect-[4/5] overflow-hidden bg-raised-2">
                {person.photoUrl ? (
                  <img
                    src={person.photoUrl}
                    alt={`Foto de ${person.name}`}
                    loading="lazy"
                    className="h-full w-full object-cover grayscale transition-[filter,transform] duration-500 group-hover:scale-[1.03] group-hover:grayscale-0"
                  />
                ) : (
                  <div className="grid h-full place-items-center text-6xl font-semibold tracking-tight text-white/10">
                    {initials(person.name)}
                  </div>
                )}
              </div>
              <div className="flex items-end justify-between gap-4 p-6">
                <div>
                  <h3 className="text-xl font-semibold">{person.name}</h3>
                  <p className="mt-1 text-sm text-muted">{person.specialty}</p>
                </div>
                <Button asChild size="sm" variant="secondary">
                  <Link to="/agendar" search={{ ...BOOK_SEARCH, profissional: person.id }}>
                    Agendar
                  </Link>
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Gallery({ shop }: { shop: PublicShop }) {
  const track = useRef<HTMLUListElement>(null);
  const [index, setIndex] = useState(0);
  const items = shop.gallery;

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const onScroll = () => {
      const children = Array.from(el.children) as HTMLElement[];
      const center = el.scrollLeft + el.clientWidth / 2;
      let best = 0;
      children.forEach((child, i) => {
        const mid = child.offsetLeft + child.offsetWidth / 2;
        if (Math.abs(mid - center) < Math.abs((children[best].offsetLeft + children[best].offsetWidth / 2) - center)) best = i;
      });
      setIndex(best);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  function go(next: number) {
    const el = track.current;
    const child = el?.children[Math.max(0, Math.min(items.length - 1, next))] as HTMLElement | undefined;
    if (!el || !child) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ left: child.offsetLeft - (el.clientWidth - child.offsetWidth) / 2, behavior: reduce ? "auto" : "smooth" });
  }

  if (!items.length) return null;
  return (
    <section aria-label="Galeria" className="border-t border-line py-24 md:py-32">
      <div className="mx-auto flex max-w-6xl items-end justify-between gap-6 px-5 sm:px-8">
        <h2 className="text-4xl font-semibold sm:text-6xl">O ambiente</h2>
        <div className="hidden gap-2 sm:flex">
          <Button variant="secondary" size="icon" aria-label="Foto anterior" onClick={() => go(index - 1)} disabled={index === 0}>
            <ChevronLeft />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            aria-label="Próxima foto"
            onClick={() => go(index + 1)}
            disabled={index === items.length - 1}
          >
            <ChevronRight />
          </Button>
        </div>
      </div>
      <ul
        ref={track}
        className="mt-12 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-5 px-5 pb-2 [scrollbar-width:none] sm:scroll-px-8 sm:px-8 lg:px-[max(2rem,calc((100vw-72rem)/2+2rem))] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((item) => (
          <li key={item.id} className="w-[84vw] shrink-0 snap-center sm:w-[62vw] lg:w-[46rem]">
            <figure>
              <div className={cn("overflow-hidden rounded-[var(--radius-card)]", item.fit === "contain" ? "bg-raised" : "")}>
                <img
                  src={item.src}
                  alt={item.alt}
                  loading="lazy"
                  className={cn("aspect-[16/10] w-full", item.fit === "contain" ? "object-contain p-6" : "object-cover")}
                />
              </div>
              {item.caption ? <figcaption className="mt-4 text-sm text-muted">{item.caption}</figcaption> : null}
            </figure>
          </li>
        ))}
      </ul>
      <div className="mt-8 flex justify-center gap-2" aria-hidden="true">
        {items.map((item, i) => (
          <span
            key={item.id}
            className={cn("h-1.5 rounded-full transition-[width,background-color] duration-300", i === index ? "w-6 bg-fg" : "w-1.5 bg-white/25")}
          />
        ))}
      </div>
    </section>
  );
}

function Contact({ shop }: { shop: PublicShop }) {
  const hours = groupHours(shop.hours);
  const whatsapp = whatsAppHref(shop.profile.whatsappDisplay);
  const phoneDigits = shop.profile.phoneDisplay.replace(/\D/g, "");
  const maps = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(shop.profile.mapsQuery)}`;
  return (
    <section id="contato" className="border-t border-line px-5 py-24 sm:px-8 md:py-32">
      <div className="mx-auto grid max-w-6xl gap-4 lg:grid-cols-12">
        <div className="flex flex-col justify-between gap-12 rounded-[var(--radius-card)] bg-raised p-8 sm:p-10 lg:col-span-7">
          <div>
            <h2 className="text-4xl font-semibold sm:text-5xl">Sua cadeira está a três toques.</h2>
            <p className="mt-4 max-w-md text-muted">Serviço, dia e horário. Não precisa criar conta para marcar.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/agendar" search={BOOK_SEARCH}>
                Agendar horário
              </Link>
            </Button>
            {whatsapp ? (
              <Button asChild size="lg" variant="secondary">
                <a href={whatsapp} target="_blank" rel="noreferrer">
                  WhatsApp {formatWhatsapp(shop.profile.whatsappDisplay)}
                </a>
              </Button>
            ) : null}
          </div>
        </div>
        <div className="rounded-[var(--radius-card)] border border-line p-8 sm:p-10 lg:col-span-5">
          <h3 className="flex items-center gap-2 text-sm font-medium text-muted">
            <Clock className="size-4" /> Horário de funcionamento
          </h3>
          <ul className="mt-5 divide-y divide-line">
            {hours.map((item) => (
              <li key={item.label} className="flex items-center justify-between gap-4 py-3 text-[15px]">
                <span>{item.label}</span>
                <span className={cn("tnum", item.value === "Fechado" ? "text-subtle" : "")}>{item.value}</span>
              </li>
            ))}
          </ul>
          {shop.profile.hoursDisclaimer ? <p className="mt-4 text-[13px] text-subtle">{shop.profile.hoursDisclaimer}</p> : null}
          <div className="mt-8 grid gap-3 text-[15px]">
            <a href={maps} target="_blank" rel="noreferrer" className="flex items-center gap-3 text-muted hover:text-fg">
              <MapPin className="size-4 shrink-0" />
              <span>{shop.profile.addressLine || shop.profile.city}</span>
              <ArrowUpRight className="ml-auto size-4" />
            </a>
            {phoneDigits.length >= 8 ? (
              <a href={`tel:${phoneDigits}`} className="flex items-center gap-3 text-muted hover:text-fg tnum">
                <Phone className="size-4 shrink-0" />
                <span>{shop.profile.phoneDisplay}</span>
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

export function HomePage({ shop }: { shop: PublicShop }) {
  return (
    <SiteFrame profile={shop.profile}>
      <Hero shop={shop} />
      <WordBand />
      <Services shop={shop} />
      <House shop={shop} />
      <Team shop={shop} />
      <Gallery shop={shop} />
      <Careers />
      <Contact shop={shop} />
    </SiteFrame>
  );
}
