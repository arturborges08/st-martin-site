import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { KeyRound, LockKeyhole } from "lucide-react";
import { useState, type FormEvent } from "react";
import { AdminApp } from "@/components/admin/admin-app";
import { Brand } from "@/components/site/shell";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { claimAdmin } from "@/lib/account.functions";
import { errorText } from "@/lib/format";
import { refreshMe, useMe } from "@/lib/me-store";

export const Route = createFileRoute("/painel")({
  validateSearch: (search: Record<string, unknown>) => ({
    aba: typeof search.aba === "string" ? search.aba : "",
  }),
  head: () => ({ meta: [{ title: "Painel · St. Martin" }, { name: "robots", content: "noindex" }] }),
  component: PanelRoute,
});

function PanelRoute() {
  const { me, status } = useMe();
  const { aba } = Route.useSearch();

  if (status === "loading") {
    return (
      <main className="grid min-h-svh place-items-center bg-bg">
        <img src="/brand/monogram.png" alt="Carregando" className="h-10 w-auto animate-pulse opacity-60" />
      </main>
    );
  }
  if (!me) return <Navigate to="/entrar" search={{ next: "/painel" }} replace />;
  if (!me.isAdmin) return <Activate />;
  return <AdminApp initialTab={aba} />;
}

function Activate() {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (!code.trim()) return setError("Digite o código de ativação.");
    setBusy(true);
    try {
      await claimAdmin({ data: { code: code.trim() } });
      await refreshMe();
    } catch (reason) {
      setError(errorText(reason, "Não deu para ativar agora."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-svh flex-col bg-bg px-5 py-6 text-fg sm:px-10">
      <Link to="/" aria-label="Voltar ao site" className="self-start">
        <Brand />
      </Link>
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-16">
        <span className="grid size-14 place-items-center rounded-2xl bg-raised-2">
          <LockKeyhole className="size-6 text-muted" />
        </span>
        <h1 className="mt-8 text-3xl font-semibold">Painel da barbearia</h1>
        <p className="mt-3 text-muted">
          Esta área é só da equipe. Se você é o responsável, digite o código de ativação. Se já faz parte da equipe,
          peça para um administrador liberar o seu e-mail.
        </p>
        <form onSubmit={submit} className="mt-8 grid gap-4">
          <TextField
            label="Código de ativação"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            autoComplete="off"
            type="password"
          />
          {error ? (
            <p role="alert" className="rounded-2xl bg-danger/12 px-4 py-3 text-sm text-danger">
              {error}
            </p>
          ) : null}
          <Button type="submit" size="lg" disabled={busy}>
            <KeyRound /> {busy ? "Verificando…" : "Ativar acesso"}
          </Button>
        </form>
        <Button asChild variant="ghost" className="mt-4 self-start">
          <Link to="/">Voltar ao site</Link>
        </Button>
      </div>
    </main>
  );
}
