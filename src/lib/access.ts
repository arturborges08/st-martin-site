import { createMiddleware } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";

/**
 * Middlewares de acesso da St. Martin.
 *
 * - `optionalUserMiddleware`: resolve a sessão se existir, sem exigir login.
 *   Usado no agendamento (cadastro é opcional) e no "quem sou eu".
 * - `adminMiddleware`: exige login E linha na tabela `staff`. Toda função do
 *   painel passa por aqui; o cliente nunca escolhe o próprio papel.
 */
export const optionalUserMiddleware = createMiddleware({ type: "function" })
  .client(async ({ next }) => {
    const { getBearerToken } = await import("./auth/client");
    return next({ sendContext: { bearerToken: getBearerToken() ?? undefined } });
  })
  .server(async ({ next, context }) => {
    const { assertSameSiteRequest } = await import("./auth/isolation.server");
    const { getSessionUser } = await import("./auth/verify.server");
    assertSameSiteRequest();
    const user = await getSessionUser(context.bearerToken);
    return next({ context: { user } });
  });

export const adminMiddleware = createMiddleware({ type: "function" })
  .middleware([authMiddleware])
  .server(async ({ next, context }) => {
    const { getSql } = await import("./db");
    const sql = await getSql();
    const rows = await sql<{ user_id: string }>`
      select user_id from staff where user_id = ${context.userId}
    `;
    if (!rows.length) throw new Error("Acesso restrito à equipe da St. Martin.");
    return next({ context: { adminId: context.userId } });
  });
