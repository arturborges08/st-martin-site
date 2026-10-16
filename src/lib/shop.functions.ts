import { createServerFn } from "@tanstack/react-start";
import { adminMiddleware, optionalUserMiddleware } from "@/lib/access";
import { getSql as rawGetSql, type Sql } from "@/lib/db";
import { digitsOnly } from "@/lib/format";
import { rangesOverlap, startTimes } from "@/lib/slots";
import { addDays, nowMinutesInSaoPaulo, todayInSaoPaulo, weekdayFromIso } from "@/lib/time";
import {
  APPLICATION_STATUS,
  BOOKING_STATUS,
  MEDIA_LIBRARY,
  SLOT_STEPS,
  type AdminShop,
  type Application,
  type ApplicationStatus,
  type Booking,
  type BookingStatus,
  type Closure,
  type GalleryItem,
  type NextSlot,
  type Professional,
  type Profile,
  type PublicShop,
  type Service,
  type SlotOption,
  type StaffMember,
  type WeekHour,
} from "@/lib/types";

const HORIZON_DAYS = 60;
const MEDIA_SRCS: readonly string[] = MEDIA_LIBRARY.map((item) => item.src);
const MAX_OPEN_PER_WHATSAPP = 3;

export class ShopError extends Error {}

/**
 * Na Vercel sem DATABASE_URL o app cairia no banco em memória (PGLite), que some
 * a cada reinício e nem sempre sobe numa função serverless. Melhor avisar claro.
 */
async function getSql(): Promise<Sql> {
  if ((process.env.VERCEL || process.env.RAILWAY_ENVIRONMENT) && !process.env.DATABASE_URL?.trim()) {
    throw new ShopError(
      "Banco de dados não configurado. Conecte um Postgres ao projeto (variável DATABASE_URL) e faça o redeploy.",
    );
  }
  return rawGetSql();
}

function asDay(value: unknown): string {
  return String(value).slice(0, 10);
}

function asBool(value: unknown): boolean {
  return value === true || value === "t" || value === "true" || value === 1;
}

export function text(value: unknown, min: number, max: number, label: string): string {
  const next = String(value ?? "").trim();
  if (next.length < min || next.length > max) {
    throw new ShopError(`Verifique o campo ${label}.`);
  }
  return next;
}

export function optionalText(value: unknown, max: number): string {
  const next = String(value ?? "").trim();
  if (next.length > max) throw new ShopError("Texto longo demais.");
  return next;
}

function isoDay(value: unknown): string {
  const day = String(value ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new ShopError("Data inválida.");
  return day;
}

function whatsappDigits(value: unknown): string {
  const digits = digitsOnly(String(value ?? ""));
  if (digits.length !== 10 && digits.length !== 11) {
    throw new ShopError("Informe um WhatsApp com DDD.");
  }
  return digits;
}

export async function fail<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    if (error instanceof ShopError) throw new Error(error.message);
    console.error(error);
    throw new Error("Não foi possível concluir agora. Tente de novo.");
  }
}

// ── Notificações (server-only) ──────────────────────────────────────────────

export async function notify(sql: Sql, userId: string, title: string, body: string, link = "") {
  await sql`
    insert into notifications (id, user_id, title, body, link)
    values (${crypto.randomUUID()}, ${userId}, ${title}, ${body}, ${link})
  `;
}

export async function notifyAdmins(sql: Sql, title: string, body: string, link = "", except?: string) {
  const admins = await sql<{ user_id: string }>`select user_id from staff`;
  for (const admin of admins) {
    if (admin.user_id === except) continue;
    await notify(sql, admin.user_id, title, body, link);
  }
}

// ── Leitura da casa ─────────────────────────────────────────────────────────

type ServiceRow = {
  id: string;
  name: string;
  description: string;
  duration_min: number;
  price_label: string;
  sort_order: number;
  active: boolean;
};

type ProfessionalRow = {
  id: string;
  name: string;
  specialty: string;
  bio: string;
  photo_url: string;
  demo: boolean;
  active: boolean;
  sort_order: number;
};

function mapService(row: ServiceRow): Service {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    durationMin: Number(row.duration_min),
    priceLabel: row.price_label,
    sortOrder: Number(row.sort_order),
    active: asBool(row.active),
  };
}

async function loadShop(sql: Sql, mode: "public" | "admin"): Promise<PublicShop> {
  const serviceRows = await sql<ServiceRow>`
    select id, name, description, duration_min, price_label, sort_order, active
    from services order by sort_order, name
  `;
  const professionalRows = await sql<ProfessionalRow>`
    select id, name, specialty, bio, photo_url, demo, active, sort_order
    from professionals order by sort_order, name
  `;
  const dayRows = await sql<{ professional_id: string; weekday: number }>`
    select professional_id, weekday from professional_days
  `;
  const daysByPro = new Map<string, number[]>();
  for (const row of dayRows) {
    const list = daysByPro.get(row.professional_id) ?? [];
    list.push(Number(row.weekday));
    daysByPro.set(row.professional_id, list);
  }
  const hourRows = await sql<{ weekday: number; is_open: boolean; open_min: number; close_min: number }>`
    select weekday, is_open, open_min, close_min from week_hours order by weekday
  `;
  const closureRows = await sql<{ id: string; day: unknown; professional_id: string | null; note: string }>`
    select id, day, professional_id, note from closures order by day
  `;
  const galleryRows = await sql<{
    id: string;
    src: string;
    alt: string;
    caption: string;
    fit: string;
    sort_order: number;
    visible: boolean;
  }>`
    select id, src, alt, caption, fit, sort_order, visible from gallery_items order by sort_order, id
  `;
  const profileRows = await sql<{
    phone_display: string;
    phone_note: string;
    whatsapp_display: string;
    whatsapp_note: string;
    city: string;
    address_line: string;
    maps_query: string;
    instagram: string;
    hours_disclaimer: string;
    slot_minutes: number;
  }>`
    select phone_display, phone_note, whatsapp_display, whatsapp_note, city,
           address_line, maps_query, instagram, hours_disclaimer, slot_minutes
    from shop_profile where id = 1
  `;
  const profileRow = profileRows[0];
  if (!profileRow) throw new ShopError("A configuração da casa ainda não está pronta.");

  const services = serviceRows.map(mapService);
  const professionals: Professional[] = professionalRows.map((row) => ({
    id: row.id,
    name: row.name,
    specialty: row.specialty,
    bio: row.bio,
    photoUrl: row.photo_url ?? "",
    demo: asBool(row.demo),
    active: asBool(row.active),
    sortOrder: Number(row.sort_order),
    weekdays: (daysByPro.get(row.id) ?? []).sort((a, b) => a - b),
  }));
  const hours: WeekHour[] = hourRows.map((row) => ({
    weekday: Number(row.weekday),
    isOpen: asBool(row.is_open),
    openMin: Number(row.open_min),
    closeMin: Number(row.close_min),
  }));
  const closures: Closure[] = closureRows.map((row) => ({
    id: row.id,
    day: asDay(row.day),
    professionalId: row.professional_id,
    note: row.note,
  }));
  const gallery: GalleryItem[] = galleryRows.map((row) => ({
    id: row.id,
    src: row.src,
    alt: row.alt,
    caption: row.caption,
    fit: row.fit === "contain" ? "contain" : "cover",
    sortOrder: Number(row.sort_order),
    visible: asBool(row.visible),
  }));
  const profile: Profile = {
    phoneDisplay: profileRow.phone_display,
    phoneNote: profileRow.phone_note,
    whatsappDisplay: profileRow.whatsapp_display,
    whatsappNote: profileRow.whatsapp_note,
    city: profileRow.city,
    addressLine: profileRow.address_line,
    mapsQuery: profileRow.maps_query,
    instagram: profileRow.instagram,
    hoursDisclaimer: profileRow.hours_disclaimer,
    slotMinutes: Number(profileRow.slot_minutes),
  };

  const isPublic = mode === "public";
  return {
    services: isPublic ? services.filter((s) => s.active) : services,
    professionals: isPublic ? professionals.filter((p) => p.active) : professionals,
    hours,
    closures,
    gallery: isPublic ? gallery.filter((g) => g.visible) : gallery,
    profile,
  };
}

type BookingRow = {
  id: string;
  professional_id: string;
  service_id: string;
  professional_name: string | null;
  service_name: string | null;
  price_label: string | null;
  day: unknown;
  start_min: number;
  end_min: number;
  status: string;
  customer_name: string;
  customer_whatsapp: string;
  user_id: string | null;
  note: string;
  created_at: string;
};

function isBookingStatus(value: string): value is BookingStatus {
  return BOOKING_STATUS.some(([id]) => id === value);
}

export function mapBooking(row: BookingRow): Booking {
  return {
    id: row.id,
    professionalId: row.professional_id,
    serviceId: row.service_id,
    professionalName: row.professional_name ?? "Profissional removido",
    serviceName: row.service_name ?? "Serviço removido",
    priceLabel: row.price_label ?? "",
    day: asDay(row.day),
    startMin: Number(row.start_min),
    endMin: Number(row.end_min),
    status: isBookingStatus(row.status) ? row.status : "confirmado",
    customerName: row.customer_name,
    customerWhatsapp: row.customer_whatsapp,
    hasAccount: Boolean(row.user_id),
    note: row.note,
    createdAt: row.created_at,
  };
}

export const BOOKING_SELECT = `
  select h.id, h.professional_id, h.service_id, h.day, h.start_min, h.end_min,
         h.status, h.customer_name, h.customer_whatsapp, h.user_id, h.note,
         to_char(h.created_at at time zone 'America/Sao_Paulo', 'YYYY-MM-DD HH24:MI') as created_at,
         p.name as professional_name, s.name as service_name, s.price_label as price_label
  from slot_holds h
  left join professionals p on p.id = h.professional_id
  left join services s on s.id = h.service_id
`;

async function loadBookings(sql: Sql): Promise<Booking[]> {
  const today = todayInSaoPaulo();
  const rows = await sql.query<BookingRow>(
    `${BOOKING_SELECT} where h.day >= $1::date order by h.day, h.start_min limit 500`,
    [addDays(today, -30)],
  );
  return rows.map(mapBooking);
}

async function loadApplications(sql: Sql): Promise<Application[]> {
  const rows = await sql<{
    id: string;
    created_at: string;
    name: string;
    whatsapp: string;
    email: string;
    role: string;
    experience: string;
    about: string;
    portfolio: string;
    status: string;
    note: string;
  }>`
    select id, to_char(created_at at time zone 'America/Sao_Paulo', 'YYYY-MM-DD HH24:MI') as created_at,
           name, whatsapp, email, role, experience, about, portfolio, status, note
    from applications order by created_at desc limit 300
  `;
  return rows.map((row) => ({
    ...row,
    status: (APPLICATION_STATUS.some(([id]) => id === row.status) ? row.status : "recebida") as ApplicationStatus,
  }));
}

async function loadStaff(sql: Sql): Promise<StaffMember[]> {
  const rows = await sql<{ user_id: string; name: string | null; email: string | null; created_at: string }>`
    select s.user_id, u.name, u.email,
           to_char(s.created_at at time zone 'America/Sao_Paulo', 'YYYY-MM-DD') as created_at
    from staff s left join "user" u on u.id = s.user_id
    order by s.created_at
  `;
  return rows.map((row) => ({
    userId: row.user_id,
    name: row.name ?? "",
    email: row.email ?? "",
    createdAt: row.created_at,
  }));
}

async function loadAdmin(sql: Sql): Promise<AdminShop> {
  const shop = await loadShop(sql, "admin");
  return {
    ...shop,
    bookings: await loadBookings(sql),
    applications: await loadApplications(sql),
    staff: await loadStaff(sql),
  };
}

export const getPublicSite = createServerFn({ method: "GET" }).handler(async () => {
  return fail(async () => loadShop(await getSql(), "public"));
});

export const getAdminSite = createServerFn({ method: "GET" })
  .middleware([adminMiddleware])
  .handler(async () => {
    return fail(async () => loadAdmin(await getSql()));
  });

// ── Disponibilidade ─────────────────────────────────────────────────────────

type SlotInput = { day: string; serviceId: string; professionalId: string };

function readSlotInput(input: unknown): SlotInput {
  const data = (input ?? {}) as Record<string, unknown>;
  return {
    day: isoDay(data.day),
    serviceId: text(data.serviceId, 1, 80, "serviço"),
    professionalId: text(data.professionalId, 1, 80, "profissional"),
  };
}

function availableStarts(shop: PublicShop, input: SlotInput): SlotOption[] {
  const today = todayInSaoPaulo();
  const nowMin = nowMinutesInSaoPaulo();
  if (input.day < today || input.day > addDays(today, HORIZON_DAYS)) return [];
  const service = shop.services.find((item) => item.id === input.serviceId && item.active);
  if (!service) return [];
  const weekday = weekdayFromIso(input.day);
  const hours = shop.hours.find((item) => item.weekday === weekday);
  if (!hours?.isOpen) return [];
  const pros = shop.professionals.filter((professional) => {
    if (!professional.active) return false;
    if (input.professionalId !== "any" && professional.id !== input.professionalId) return false;
    if (!professional.weekdays.includes(weekday)) return false;
    return !shop.closures.some(
      (closure) =>
        closure.day === input.day &&
        (closure.professionalId === null || closure.professionalId === professional.id),
    );
  });
  if (!pros.length) return [];
  const starts = startTimes(hours.openMin, hours.closeMin, service.durationMin, shop.profile.slotMinutes);
  return starts
    .filter((start) => input.day !== today || start > nowMin + 15)
    .map((start) => ({ startMin: start, professionalIds: pros.map((professional) => professional.id) }));
}

async function busyRanges(sql: Sql, day: string) {
  return sql<{ professional_id: string; start_min: number; end_min: number }>`
    select professional_id, start_min, end_min
    from slot_holds
    where day = ${day}::date and status <> 'cancelado'
  `;
}

function openSlots(
  options: SlotOption[],
  busy: Array<{ professional_id: string; start_min: number; end_min: number }>,
  duration: number,
): SlotOption[] {
  return options
    .map((slot) => ({
      startMin: slot.startMin,
      professionalIds: slot.professionalIds.filter(
        (id) =>
          !busy.some(
            (hold) =>
              hold.professional_id === id &&
              rangesOverlap(slot.startMin, slot.startMin + duration, Number(hold.start_min), Number(hold.end_min)),
          ),
      ),
    }))
    .filter((slot) => slot.professionalIds.length > 0);
}

export const listSlots = createServerFn({ method: "POST" })
  .validator((input: unknown) => readSlotInput(input))
  .handler(async ({ data }) => {
    return fail(async () => {
      const sql = await getSql();
      const shop = await loadShop(sql, "public");
      const service = shop.services.find((item) => item.id === data.serviceId);
      const result: SlotOption[] = openSlots(
        availableStarts(shop, data),
        await busyRanges(sql, data.day),
        service?.durationMin ?? 0,
      );
      return result;
    });
  });

/** Primeiro horário livre dos próximos dias, para o destaque da página inicial. */
export const getNextSlot = createServerFn({ method: "GET" }).handler(async () => {
  return fail(async () => {
    const sql = await getSql();
    const shop = await loadShop(sql, "public");
    const service = shop.services[0];
    if (!service) return null as NextSlot;
    const today = todayInSaoPaulo();
    for (let offset = 0; offset < 14; offset += 1) {
      const day = addDays(today, offset);
      const input = { day, serviceId: service.id, professionalId: "any" };
      const options = availableStarts(shop, input);
      if (!options.length) continue;
      const open = openSlots(options, await busyRanges(sql, day), service.durationMin);
      if (open.length) {
        const result: NextSlot = { day, startMin: open[0].startMin, serviceId: service.id, serviceName: service.name };
        return result;
      }
    }
    return null as NextSlot;
  });
});

// ── Agendar ─────────────────────────────────────────────────────────────────

export const bookSlot = createServerFn({ method: "POST" })
  .middleware([optionalUserMiddleware])
  .validator((input: unknown) => {
    const data = (input ?? {}) as Record<string, unknown>;
    const slot = readSlotInput(data);
    const startMin = Number(data.startMin);
    if (!Number.isInteger(startMin) || startMin < 0 || startMin > 24 * 60) {
      throw new Error("Horário inválido.");
    }
    return {
      ...slot,
      startMin,
      name: String(data.name ?? ""),
      whatsapp: String(data.whatsapp ?? ""),
    };
  })
  .handler(async ({ data, context }) => {
    return fail(async () => {
      const name = text(data.name, 3, 80, "nome");
      const whatsapp = whatsappDigits(data.whatsapp);
      const userId = context.user?.id ?? null;
      const sql = await getSql();

      const recent = await sql<{ n: number }>`
        select count(*)::int as n from slot_holds where created_at > now() - interval '10 minutes'
      `;
      if (Number(recent[0]?.n ?? 0) >= 40) {
        throw new ShopError("Muitos agendamentos em sequência. Tente de novo em alguns minutos.");
      }
      const today = todayInSaoPaulo();
      const open = await sql<{ n: number }>`
        select count(*)::int as n from slot_holds
        where customer_whatsapp = ${whatsapp} and status = 'confirmado' and day >= ${today}::date
      `;
      if (Number(open[0]?.n ?? 0) >= MAX_OPEN_PER_WHATSAPP) {
        throw new ShopError(
          `Este WhatsApp já tem ${MAX_OPEN_PER_WHATSAPP} horários marcados. Fale com a barbearia para marcar mais.`,
        );
      }

      const shop = await loadShop(sql, "public");
      const service = shop.services.find((item) => item.id === data.serviceId && item.active);
      if (!service) throw new ShopError("Serviço indisponível.");
      const endMin = data.startMin + service.durationMin;
      const base = availableStarts(shop, data).find((slot) => slot.startMin === data.startMin);
      if (!base) throw new ShopError("Este horário não está mais disponível.");
      const busy = await busyRanges(sql, data.day);
      const free = shop.professionals
        .filter((p) => base.professionalIds.includes(p.id))
        .filter(
          (p) =>
            !busy.some(
              (hold) =>
                hold.professional_id === p.id &&
                rangesOverlap(data.startMin, endMin, Number(hold.start_min), Number(hold.end_min)),
            ),
        )
        .sort((a, b) => a.sortOrder - b.sortOrder);

      const id = crypto.randomUUID();
      let chosen: Professional | undefined;
      for (const candidate of free) {
        const inserted = await sql<{ id: string }>`
          insert into slot_holds
            (id, professional_id, service_id, day, start_min, end_min, customer_name, customer_whatsapp, user_id, status)
          select ${id}, ${candidate.id}, ${service.id}, ${data.day}::date, ${data.startMin}, ${endMin},
                 ${name}, ${whatsapp}, ${userId}, 'confirmado'
          where not exists (
            select 1 from slot_holds
            where professional_id = ${candidate.id}
              and day = ${data.day}::date
              and status <> 'cancelado'
              and start_min < ${endMin}
              and end_min > ${data.startMin}
          )
          returning id
        `;
        if (inserted.length) {
          chosen = candidate;
          break;
        }
      }
      if (!chosen) throw new ShopError("Alguém acabou de pegar este horário. Escolha outro.");

      const { formatDayShort, formatMin } = await import("@/lib/format");
      const when = `${formatDayShort(data.day)} às ${formatMin(data.startMin)}`;
      if (userId) {
        await sql`
          insert into customer_profiles (user_id, whatsapp) values (${userId}, ${whatsapp})
          on conflict (user_id) do update set whatsapp = ${whatsapp}, updated_at = now()
        `;
        await notify(sql, userId, "Horário confirmado", `${service.name} · ${when} com ${chosen.name}.`, "/conta");
      }
      await notifyAdmins(sql, "Novo agendamento", `${name} · ${service.name} · ${when}`, "/painel", userId ?? undefined);

      return {
        id,
        professionalName: chosen.name,
        serviceName: service.name,
        priceLabel: service.priceLabel,
        day: data.day,
        startMin: data.startMin,
        endMin,
        withAccount: Boolean(userId),
      };
    });
  });

// ── Trabalhe conosco ────────────────────────────────────────────────────────

export const submitApplication = createServerFn({ method: "POST" })
  .validator((input: unknown) => (input ?? {}) as Record<string, unknown>)
  .handler(async ({ data }) => {
    return fail(async () => {
      const sql = await getSql();
      const recent = await sql<{ n: number }>`
        select count(*)::int as n from applications where created_at > now() - interval '1 hour'
      `;
      if (Number(recent[0]?.n ?? 0) >= 20) {
        throw new ShopError("Recebemos muitas candidaturas agora. Tente de novo mais tarde.");
      }
      const email = optionalText(data.email, 120);
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ShopError("E-mail inválido.");
      const portfolio = optionalText(data.portfolio, 200);
      await sql`
        insert into applications (id, name, whatsapp, email, role, experience, about, portfolio)
        values (
          ${crypto.randomUUID()},
          ${text(data.name, 3, 80, "nome")},
          ${whatsappDigits(data.whatsapp)},
          ${email},
          ${text(data.role, 2, 60, "função")},
          ${optionalText(data.experience, 60)},
          ${text(data.about, 10, 1200, "apresentação")},
          ${portfolio}
        )
      `;
      await notifyAdmins(sql, "Nova candidatura", `${String(data.name).trim()} · ${String(data.role).trim()}`, "/painel?aba=vagas");
      return { ok: true as const };
    });
  });

// ── Painel: agenda ──────────────────────────────────────────────────────────

const STATUS_MESSAGES: Record<BookingStatus, { title: string; body: string } | null> = {
  confirmado: { title: "Horário confirmado", body: "A barbearia confirmou seu horário" },
  concluido: { title: "Obrigado pela visita", body: "Seu atendimento foi registrado" },
  faltou: null,
  cancelado: { title: "Horário cancelado", body: "A barbearia cancelou seu horário" },
};

export const setBookingStatus = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator((input: unknown) => {
    const data = (input ?? {}) as Record<string, unknown>;
    const status = String(data.status ?? "");
    if (!isBookingStatus(status)) throw new Error("Status inválido.");
    return { id: text(data.id, 8, 80, "agendamento"), status, note: optionalText(data.note, 300) };
  })
  .handler(async ({ data }) => {
    return fail(async () => {
      const sql = await getSql();
      const rows = await sql.query<BookingRow>(`${BOOKING_SELECT} where h.id = $1`, [data.id]);
      const current = rows[0];
      if (!current) throw new ShopError("Agendamento não encontrado.");
      await sql`
        update slot_holds set status = ${data.status}, note = ${data.note}, updated_at = now()
        where id = ${data.id}
      `;
      const message = STATUS_MESSAGES[data.status];
      if (current.user_id && current.status !== data.status && message) {
        const { formatDayShort, formatMin } = await import("@/lib/format");
        await notify(
          sql,
          current.user_id,
          message.title,
          `${message.body}: ${current.service_name ?? "atendimento"} · ${formatDayShort(asDay(current.day))} às ${formatMin(Number(current.start_min))}.`,
          "/conta",
        );
      }
      return loadAdmin(sql);
    });
  });

export const deleteBooking = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator((input: unknown) => text((input as { id?: string } | null)?.id, 8, 80, "agendamento"))
  .handler(async ({ data: id }) => {
    return fail(async () => {
      const sql = await getSql();
      await sql`delete from slot_holds where id = ${id}`;
      return loadAdmin(sql);
    });
  });

// ── Painel: serviços ────────────────────────────────────────────────────────

function readService(input: unknown) {
  const data = (input ?? {}) as Record<string, unknown>;
  const durationMin = Number(data.durationMin);
  if (!Number.isInteger(durationMin) || durationMin < 10 || durationMin > 240) {
    throw new Error("A duração precisa ficar entre 10 e 240 minutos.");
  }
  return {
    id: data.id ? text(data.id, 1, 80, "serviço") : undefined,
    name: text(data.name, 2, 80, "nome"),
    description: text(data.description, 2, 400, "descrição"),
    durationMin,
    priceLabel: text(data.priceLabel, 1, 60, "valor"),
    active: data.active === true,
  };
}

export const saveService = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator((input: unknown) => readService(input))
  .handler(async ({ data }) => {
    return fail(async () => {
      const sql = await getSql();
      if (data.id) {
        const updated = await sql<{ id: string }>`
          update services
          set name = ${data.name}, description = ${data.description}, duration_min = ${data.durationMin},
              price_label = ${data.priceLabel}, active = ${data.active}
          where id = ${data.id}
          returning id
        `;
        if (!updated.length) throw new ShopError("Serviço não encontrado.");
      } else {
        await sql`
          insert into services (id, name, description, duration_min, price_label, sort_order, active)
          values (${crypto.randomUUID()}, ${data.name}, ${data.description}, ${data.durationMin},
                  ${data.priceLabel}, (select coalesce(max(sort_order), 0) + 1 from services), ${data.active})
        `;
      }
      return loadAdmin(sql);
    });
  });

export const deleteService = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator((input: unknown) => text((input as { id?: string } | null)?.id, 1, 80, "serviço"))
  .handler(async ({ data: id }) => {
    return fail(async () => {
      const sql = await getSql();
      const used = await sql<{ n: number }>`
        select count(*)::int as n from slot_holds where service_id = ${id}
      `;
      if (Number(used[0]?.n ?? 0) > 0) {
        throw new ShopError("Este serviço já tem agendamentos. Desative em vez de excluir.");
      }
      await sql`delete from services where id = ${id}`;
      return loadAdmin(sql);
    });
  });

async function swapOrder(sql: Sql, table: "services" | "gallery_items", id: string, direction: "up" | "down") {
  const rows =
    table === "services"
      ? await sql<{ id: string; sort_order: number }>`select id, sort_order from services order by sort_order, name`
      : await sql<{ id: string; sort_order: number }>`select id, sort_order from gallery_items order by sort_order, id`;
  const index = rows.findIndex((row) => row.id === id);
  const other = rows[direction === "up" ? index - 1 : index + 1];
  const current = rows[index];
  if (!current || !other) return;
  if (table === "services") {
    await sql`update services set sort_order = ${other.sort_order} where id = ${current.id}`;
    await sql`update services set sort_order = ${current.sort_order} where id = ${other.id}`;
  } else {
    await sql`update gallery_items set sort_order = ${other.sort_order} where id = ${current.id}`;
    await sql`update gallery_items set sort_order = ${current.sort_order} where id = ${other.id}`;
  }
}

function readMove(input: unknown) {
  const data = (input ?? {}) as Record<string, unknown>;
  const direction = data.direction === "up" || data.direction === "down" ? data.direction : null;
  if (!direction) throw new Error("Movimento inválido.");
  return { id: text(data.id, 1, 80, "item"), direction };
}

export const moveService = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator(readMove)
  .handler(async ({ data }) => {
    return fail(async () => {
      const sql = await getSql();
      await swapOrder(sql, "services", data.id, data.direction);
      return loadAdmin(sql);
    });
  });

// ── Painel: profissionais ───────────────────────────────────────────────────

function readProfessional(input: unknown) {
  const data = (input ?? {}) as Record<string, unknown>;
  const weekdays = Array.isArray(data.weekdays)
    ? [...new Set(data.weekdays.map(Number))].filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
    : [];
  const photoUrl = optionalText(data.photoUrl, 300);
  if (photoUrl && !photoUrl.startsWith("/media/") && !/^https:\/\//.test(photoUrl)) {
    throw new Error("A foto precisa ser um link https.");
  }
  return {
    id: data.id ? text(data.id, 1, 80, "profissional") : undefined,
    name: text(data.name, 2, 80, "nome"),
    specialty: text(data.specialty, 2, 80, "especialidade"),
    bio: optionalText(data.bio, 400),
    photoUrl,
    active: data.active === true,
    weekdays,
  };
}

export const saveProfessional = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator((input: unknown) => readProfessional(input))
  .handler(async ({ data }) => {
    return fail(async () => {
      const sql = await getSql();
      let id = data.id;
      if (id) {
        const updated = await sql<{ id: string }>`
          update professionals
          set name = ${data.name}, specialty = ${data.specialty}, bio = ${data.bio},
              photo_url = ${data.photoUrl}, demo = false, active = ${data.active}
          where id = ${id}
          returning id
        `;
        if (!updated.length) throw new ShopError("Profissional não encontrado.");
      } else {
        id = crypto.randomUUID();
        await sql`
          insert into professionals (id, name, specialty, bio, photo_url, demo, active, sort_order)
          values (${id}, ${data.name}, ${data.specialty}, ${data.bio}, ${data.photoUrl}, false, ${data.active},
                  (select coalesce(max(sort_order), 0) + 1 from professionals))
        `;
      }
      await sql`delete from professional_days where professional_id = ${id}`;
      for (const weekday of data.weekdays) {
        await sql`
          insert into professional_days (professional_id, weekday) values (${id}, ${weekday})
          on conflict do nothing
        `;
      }
      return loadAdmin(sql);
    });
  });

export const deleteProfessional = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator((input: unknown) => text((input as { id?: string } | null)?.id, 1, 80, "profissional"))
  .handler(async ({ data: id }) => {
    return fail(async () => {
      const sql = await getSql();
      const used = await sql<{ n: number }>`
        select count(*)::int as n from slot_holds where professional_id = ${id}
      `;
      if (Number(used[0]?.n ?? 0) > 0) {
        throw new ShopError("Este profissional tem agendamentos. Desative em vez de excluir.");
      }
      await sql`delete from closures where professional_id = ${id}`;
      await sql`delete from professional_days where professional_id = ${id}`;
      await sql`delete from professionals where id = ${id}`;
      return loadAdmin(sql);
    });
  });

// ── Painel: horários e folgas ───────────────────────────────────────────────

export const saveHours = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator((input: unknown) => {
    const data = (input ?? {}) as { hours?: unknown; slotMinutes?: unknown };
    if (!Array.isArray(data.hours) || data.hours.length !== 7) throw new Error("Informe os sete dias da semana.");
    const slotMinutes = Number(data.slotMinutes);
    if (!SLOT_STEPS.includes(slotMinutes as (typeof SLOT_STEPS)[number])) throw new Error("Intervalo inválido.");
    const hours = data.hours.map((item) => {
      const row = item as Record<string, unknown>;
      const weekday = Number(row.weekday);
      const openMin = Number(row.openMin);
      const closeMin = Number(row.closeMin);
      if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) throw new Error("Dia inválido.");
      if (
        !Number.isInteger(openMin) ||
        !Number.isInteger(closeMin) ||
        openMin < 0 ||
        closeMin > 24 * 60 ||
        closeMin <= openMin
      ) {
        throw new Error("Revise abertura e fechamento.");
      }
      return { weekday, isOpen: row.isOpen === true, openMin, closeMin };
    });
    return { hours, slotMinutes };
  })
  .handler(async ({ data }) => {
    return fail(async () => {
      const sql = await getSql();
      for (const hour of data.hours) {
        await sql`
          insert into week_hours (weekday, is_open, open_min, close_min)
          values (${hour.weekday}, ${hour.isOpen}, ${hour.openMin}, ${hour.closeMin})
          on conflict (weekday) do update
          set is_open = ${hour.isOpen}, open_min = ${hour.openMin}, close_min = ${hour.closeMin}
        `;
      }
      await sql`update shop_profile set slot_minutes = ${data.slotMinutes} where id = 1`;
      return loadAdmin(sql);
    });
  });

export const saveClosure = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator((input: unknown) => {
    const data = (input ?? {}) as Record<string, unknown>;
    const professionalId = String(data.professionalId ?? "").trim();
    return {
      day: isoDay(data.day),
      professionalId:
        professionalId && professionalId !== "all" ? text(professionalId, 1, 80, "profissional") : null,
      note: optionalText(data.note, 140),
    };
  })
  .handler(async ({ data }) => {
    return fail(async () => {
      const sql = await getSql();
      const existing = await sql<{ id: string }>`
        select id from closures
        where day = ${data.day}::date and professional_id is not distinct from ${data.professionalId}
      `;
      if (existing.length) throw new ShopError("Essa folga já está registrada.");
      await sql`
        insert into closures (id, day, professional_id, note)
        values (${crypto.randomUUID()}, ${data.day}::date, ${data.professionalId}, ${data.note})
      `;
      return loadAdmin(sql);
    });
  });

export const deleteClosure = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator((input: unknown) => text((input as { id?: string } | null)?.id, 1, 80, "folga"))
  .handler(async ({ data: id }) => {
    return fail(async () => {
      const sql = await getSql();
      await sql`delete from closures where id = ${id}`;
      return loadAdmin(sql);
    });
  });

// ── Painel: galeria ─────────────────────────────────────────────────────────

export const saveGalleryItem = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator((input: unknown) => {
    const data = (input ?? {}) as Record<string, unknown>;
    return {
      id: text(data.id, 1, 80, "imagem"),
      caption: optionalText(data.caption, 180),
      visible: data.visible === true,
    };
  })
  .handler(async ({ data }) => {
    return fail(async () => {
      const sql = await getSql();
      const rows = await sql<{ src: string }>`select src from gallery_items where id = ${data.id}`;
      if (!rows.length || !MEDIA_SRCS.includes(rows[0].src)) throw new ShopError("Imagem não encontrada.");
      await sql`update gallery_items set caption = ${data.caption}, visible = ${data.visible} where id = ${data.id}`;
      return loadAdmin(sql);
    });
  });

export const moveGallery = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator(readMove)
  .handler(async ({ data }) => {
    return fail(async () => {
      const sql = await getSql();
      await swapOrder(sql, "gallery_items", data.id, data.direction);
      return loadAdmin(sql);
    });
  });

// ── Painel: candidaturas ────────────────────────────────────────────────────

export const setApplicationStatus = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator((input: unknown) => {
    const data = (input ?? {}) as Record<string, unknown>;
    const status = String(data.status ?? "");
    if (!APPLICATION_STATUS.some(([id]) => id === status)) throw new Error("Status inválido.");
    return {
      id: text(data.id, 8, 80, "candidatura"),
      status: status as ApplicationStatus,
      note: optionalText(data.note, 400),
    };
  })
  .handler(async ({ data }) => {
    return fail(async () => {
      const sql = await getSql();
      await sql`update applications set status = ${data.status}, note = ${data.note} where id = ${data.id}`;
      return loadAdmin(sql);
    });
  });

export const deleteApplication = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator((input: unknown) => text((input as { id?: string } | null)?.id, 8, 80, "candidatura"))
  .handler(async ({ data: id }) => {
    return fail(async () => {
      const sql = await getSql();
      await sql`delete from applications where id = ${id}`;
      return loadAdmin(sql);
    });
  });

// ── Painel: equipe com acesso ───────────────────────────────────────────────

export const addStaffByEmail = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator((input: unknown) => text((input as { email?: string } | null)?.email, 5, 120, "e-mail").toLowerCase())
  .handler(async ({ data: email }) => {
    return fail(async () => {
      const sql = await getSql();
      const users = await sql<{ id: string }>`select id from "user" where lower(email) = ${email}`;
      const user = users[0];
      if (!user) {
        throw new ShopError("Nenhuma conta com esse e-mail. A pessoa precisa criar a conta no site primeiro.");
      }
      await sql`insert into staff (user_id) values (${user.id}) on conflict (user_id) do nothing`;
      await notify(sql, user.id, "Acesso ao painel liberado", "Você agora pode abrir o painel da St. Martin.", "/painel");
      return loadAdmin(sql);
    });
  });

export const removeStaff = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator((input: unknown) => text((input as { userId?: string } | null)?.userId, 1, 80, "usuário"))
  .handler(async ({ data: userId, context }) => {
    return fail(async () => {
      if (userId === context.adminId) throw new ShopError("Você não pode remover o próprio acesso.");
      const sql = await getSql();
      await sql`delete from staff where user_id = ${userId}`;
      return loadAdmin(sql);
    });
  });

// ── Painel: dados da casa ───────────────────────────────────────────────────

export const saveProfile = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator((input: unknown) => {
    const data = (input ?? {}) as Record<string, unknown>;
    return {
      phoneDisplay: optionalText(data.phoneDisplay, 40),
      phoneNote: optionalText(data.phoneNote, 180),
      whatsappDisplay: optionalText(data.whatsappDisplay, 40),
      whatsappNote: optionalText(data.whatsappNote, 180),
      city: text(data.city, 2, 80, "cidade"),
      addressLine: optionalText(data.addressLine, 160),
      mapsQuery: text(data.mapsQuery, 2, 160, "mapa"),
      instagram: optionalText(data.instagram, 160),
      hoursDisclaimer: optionalText(data.hoursDisclaimer, 220),
    };
  })
  .handler(async ({ data }) => {
    return fail(async () => {
      const sql = await getSql();
      await sql`
        update shop_profile
        set phone_display = ${data.phoneDisplay}, phone_note = ${data.phoneNote},
            whatsapp_display = ${data.whatsappDisplay}, whatsapp_note = ${data.whatsappNote},
            city = ${data.city}, address_line = ${data.addressLine}, maps_query = ${data.mapsQuery},
            instagram = ${data.instagram}, hours_disclaimer = ${data.hoursDisclaimer}
        where id = 1
      `;
      return loadAdmin(sql);
    });
  });
