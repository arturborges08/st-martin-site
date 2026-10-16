import { createServerFn } from "@tanstack/react-start";
import { optionalUserMiddleware } from "@/lib/access";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql, dbSource } from "@/lib/db";
import { digitsOnly } from "@/lib/format";
import {
  BOOKING_SELECT,
  ShopError,
  fail,
  mapBooking,
  notifyAdmins,
  optionalText,
  text,
} from "@/lib/shop.functions";
import { todayInSaoPaulo, nowMinutesInSaoPaulo } from "@/lib/time";
import type { AppNotification, Me, MyBooking } from "@/lib/types";

/** Código usado só no ambiente local (sem DATABASE_URL), para testar o painel. */
const LOCAL_SETUP_CODE = "stmartin-local";
const MIN_CODE_LENGTH = 12;

/** Quem está logado, se é admin e quantos avisos não lidos tem. `null` = visitante. */
export const getMe = createServerFn({ method: "GET" })
  .middleware([optionalUserMiddleware])
  .handler(async ({ context }) => {
    const user = context.user;
    if (!user) return null as Me | null;
    const sql = await getSql();
    const rows = await sql<{
      name: string | null;
      email: string | null;
      whatsapp: string | null;
      is_admin: boolean;
      unread: number;
      staff_count: number;
    }>`
      select u.name, u.email, p.whatsapp,
             exists (select 1 from staff s where s.user_id = u.id) as is_admin,
             (select count(*)::int from notifications n where n.user_id = u.id and n.read_at is null) as unread,
             (select count(*)::int from staff) as staff_count
      from "user" u
      left join customer_profiles p on p.user_id = u.id
      where u.id = ${user.id}
    `;
    const row = rows[0];
    const me: Me = {
      id: user.id,
      name: row?.name ?? "",
      email: row?.email ?? user.email ?? "",
      whatsapp: row?.whatsapp ?? "",
      isAdmin: row?.is_admin === true,
      unread: Number(row?.unread ?? 0),
      canClaimAdmin: Number(row?.staff_count ?? 0) === 0,
    };
    return me as Me | null;
  });

export const listNotifications = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql<{
      id: string;
      title: string;
      body: string;
      link: string;
      created_at: string;
      read_at: string | null;
    }>`
      select id, title, body, link, read_at,
             to_char(created_at at time zone 'America/Sao_Paulo', 'YYYY-MM-DD HH24:MI') as created_at
      from notifications
      where user_id = ${context.userId}
      order by created_at desc
      limit 40
    `;
    const list: AppNotification[] = rows.map((row) => ({
      id: row.id,
      title: row.title,
      body: row.body,
      link: row.link,
      createdAt: row.created_at,
      read: row.read_at !== null,
    }));
    return list;
  });

export const markNotificationsRead = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    await sql`
      update notifications set read_at = now()
      where user_id = ${context.userId} and read_at is null
    `;
    return { ok: true as const };
  });

export const getMyBookings = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql.query<Parameters<typeof mapBooking>[0]>(
      `${BOOKING_SELECT} where h.user_id = $1 order by h.day desc, h.start_min desc limit 60`,
      [context.userId],
    );
    const list: MyBooking[] = rows.map((row) => {
      const booking = mapBooking(row);
      return {
        id: booking.id,
        professionalId: booking.professionalId,
        serviceId: booking.serviceId,
        professionalName: booking.professionalName,
        serviceName: booking.serviceName,
        priceLabel: booking.priceLabel,
        day: booking.day,
        startMin: booking.startMin,
        endMin: booking.endMin,
        status: booking.status,
        customerName: booking.customerName,
        createdAt: booking.createdAt,
      };
    });
    return list;
  });

export const cancelMyBooking = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => text((input as { id?: string } | null)?.id, 8, 80, "agendamento"))
  .handler(async ({ data: id, context }) => {
    return fail(async () => {
      const sql = await getSql();
      const rows = await sql<{ day: unknown; start_min: number; status: string; customer_name: string; service: string | null }>`
        select h.day, h.start_min, h.status, h.customer_name, s.name as service
        from slot_holds h left join services s on s.id = h.service_id
        where h.id = ${id} and h.user_id = ${context.userId}
      `;
      const booking = rows[0];
      if (!booking) throw new ShopError("Agendamento não encontrado.");
      if (booking.status !== "confirmado") throw new ShopError("Este horário não pode mais ser cancelado.");
      const day = String(booking.day).slice(0, 10);
      const today = todayInSaoPaulo();
      if (day < today || (day === today && Number(booking.start_min) <= nowMinutesInSaoPaulo())) {
        throw new ShopError("Este horário já passou.");
      }
      await sql`
        update slot_holds set status = 'cancelado', updated_at = now()
        where id = ${id} and user_id = ${context.userId}
      `;
      const { formatDayShort, formatMin } = await import("@/lib/format");
      await notifyAdmins(
        sql,
        "Cliente cancelou",
        `${booking.customer_name} · ${booking.service ?? "atendimento"} · ${formatDayShort(day)} às ${formatMin(Number(booking.start_min))}`,
        "/painel",
      );
      return { ok: true as const };
    });
  });

export const saveMyProfile = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => {
    const data = (input ?? {}) as Record<string, unknown>;
    const whatsapp = digitsOnly(String(data.whatsapp ?? ""));
    if (whatsapp && whatsapp.length !== 10 && whatsapp.length !== 11) {
      throw new Error("Informe um WhatsApp com DDD.");
    }
    return { name: text(data.name, 2, 80, "nome"), whatsapp };
  })
  .handler(async ({ data, context }) => {
    return fail(async () => {
      const sql = await getSql();
      await sql`update "user" set name = ${data.name}, "updatedAt" = now() where id = ${context.userId}`;
      await sql`
        insert into customer_profiles (user_id, whatsapp) values (${context.userId}, ${data.whatsapp})
        on conflict (user_id) do update set whatsapp = ${data.whatsapp}, updated_at = now()
      `;
      return { ok: true as const };
    });
  });

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Ativa o acesso de administrador para a conta logada.
 * Em produção o código vem da variável de ambiente ADMIN_SETUP_CODE (mínimo 12
 * caracteres). Sem ela, só o ambiente local aceita o código de teste.
 */
export const claimAdmin = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => optionalText((input as { code?: string } | null)?.code, 200))
  .handler(async ({ data: code, context }) => {
    return fail(async () => {
      const configured = process.env.ADMIN_SETUP_CODE?.trim() ?? "";
      let expected = configured;
      if (!expected) {
        if (dbSource !== "pglite") {
          throw new ShopError(
            "A ativação do painel ainda não foi configurada no servidor. Defina ADMIN_SETUP_CODE no deploy.",
          );
        }
        expected = LOCAL_SETUP_CODE;
      } else if (expected.length < MIN_CODE_LENGTH) {
        throw new ShopError(`O ADMIN_SETUP_CODE precisa ter pelo menos ${MIN_CODE_LENGTH} caracteres.`);
      }
      // Pequena espera para encarecer tentativas em sequência.
      await new Promise((resolve) => setTimeout(resolve, 600));
      if (!safeEqual(code, expected)) throw new ShopError("Código incorreto.");
      const sql = await getSql();
      await sql`insert into staff (user_id) values (${context.userId}) on conflict (user_id) do nothing`;
      return { ok: true as const };
    });
  });
