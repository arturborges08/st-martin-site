import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Bell, CalendarCheck, Eye, EyeOff } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Brand } from "@/components/site/shell";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { authClient } from "@/lib/auth/client";
import { isValidEmail } from "@/lib/format";
import { refreshMe, useMe } from "@/lib/me-store";

export const Route = createFileRoute("/entrar")({
  validateSearch: (search: Record<string, unknown>) => ({
    next: typeof search.next === "string" && search.next.startsWith("/") && !search.next.startsWith("//") ? search.next : "",
  }),
  head: () => ({ meta: [{ title: "Entrar · St. Martin Bar e Barbearia" }] }),
  component: SignInPage,
});

const MODES = [
  ["entrar", "Entrar"],
  ["criar", "Criar conta"],
] as const;

function translate(message: string | undefined): string {
  const text = (message ?? "").toLowerCase();
  if (text.includes("invalid email or password") || text.includes("invalid password")) return "E-mail ou senha incorretos.";
  if (text.includes("already exists") || text.includes("already registered")) return "Já existe uma conta com esse e-mail. Entre com sua senha.";
  if (text.includes("password too short")) return "A senha precisa ter pelo menos 8 caracteres.";
  if (text.includes("password too long")) return "Senha longa demais.";
  if (text.includes("invalid email")) return "Esse e-mail parece incompleto.";
  if (text.includes("too many")) return "Muitas tentativas. Espere um minuto e tente de novo.";
  return "Não deu certo agora. Tente de novo.";
}

function SignInPage() {
  const { next } = Route.useSearch();
  const navigate = useNavigate();
  const { me, status } = useMe();
  const [mode, setMode] = useState<"entrar" | "criar">("entrar");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const destination = next || "/conta";

  useEffect(() => {
    if (status === "ready" && me) void navigate({ href: destination, replace: true });
  }, [status, me, destination, navigate]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (mode === "criar" && name.trim().length < 2) return setError("Como podemos te chamar?");
    if (!isValidEmail(email)) return setError("Esse e-mail parece incompleto.");
    if (password.length < 8) return setError("A senha precisa ter pelo menos 8 caracteres.");
    setBusy(true);
    try {
      const response =
        mode === "criar"
          ? await authClient.signUp.email({ name: name.trim(), email: email.trim(), password })
          : await authClient.signIn.email({ email: email.trim(), password });
      if (response.error) {
        setError(translate(response.error.message));
        return;
      }
      await refreshMe();
      await navigate({ href: destination, replace: true });
    } catch {
      setError("Sem conexão com o servidor. Tente de novo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-svh bg-bg text-fg lg:grid-cols-2">
      <div className="relative hidden overflow-hidden lg:block">
        <img src="/media/fachada.jpg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-60" />
        <div className="absolute inset-0 bg-[linear-gradient(0deg,#0b0b0a_0%,rgb(11_11_10/0.2)_60%)]" />
        <div className="absolute inset-x-12 bottom-12 max-w-md">
          <p className="text-3xl leading-tight font-semibold tracking-tight">
            Sua conta guarda seus horários e avisa quando algo mudar.
          </p>
          <ul className="mt-6 grid gap-3 text-muted">
            <li className="flex items-center gap-3">
              <CalendarCheck className="size-5 text-fg" /> Histórico e cancelamento pelo site
            </li>
            <li className="flex items-center gap-3">
              <Bell className="size-5 text-fg" /> Avisos de confirmação e mudanças
            </li>
          </ul>
        </div>
      </div>

      <div className="flex flex-col px-5 py-6 sm:px-10">
        <div className="flex items-center justify-between">
          <Link to="/" aria-label="Voltar ao início">
            <Brand />
          </Link>
          <Button asChild variant="ghost" size="sm">
            <Link to="/">
              <ArrowLeft /> Início
            </Link>
          </Button>
        </div>

        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-16">
          <h1 className="text-4xl font-semibold">{mode === "entrar" ? "Bem-vindo de volta." : "Criar sua conta."}</h1>
          <p className="mt-3 text-muted">
            A conta é opcional. Dá para agendar sem ela.
          </p>
          <Segmented
            label="Entrar ou criar conta"
            options={MODES}
            value={mode}
            onChange={(value) => {
              setMode(value);
              setError("");
            }}
            className="mt-8 w-full [&>button]:flex-1"
          />
          <form onSubmit={submit} noValidate className="mt-6 grid gap-4">
            {mode === "criar" ? (
              <TextField label="Nome" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={80} />
            ) : null}
            <TextField
              label="E-mail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              inputMode="email"
            />
            <div className="relative">
              <TextField
                label="Senha"
                type={show ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === "criar" ? "new-password" : "current-password"}
                hint={mode === "criar" ? "Pelo menos 8 caracteres." : undefined}
                className="[&_input]:pr-12"
              />
              <button
                type="button"
                onClick={() => setShow((v) => !v)}
                aria-label={show ? "Esconder senha" : "Mostrar senha"}
                className="absolute top-[34px] right-2 grid size-10 place-items-center rounded-full text-muted hover:text-fg"
              >
                {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            {error ? (
              <p role="alert" className="rounded-2xl bg-danger/12 px-4 py-3 text-sm text-danger">
                {error}
              </p>
            ) : null}
            <Button type="submit" size="lg" className="mt-2 w-full" disabled={busy}>
              {busy ? "Aguarde…" : mode === "entrar" ? "Entrar" : "Criar conta"}
            </Button>
          </form>
          {mode === "entrar" ? (
            <p className="mt-6 text-sm text-subtle">Esqueceu a senha? Fale com a barbearia pelo WhatsApp.</p>
          ) : (
            <p className="mt-6 text-sm text-subtle">
              Ao criar a conta você concorda com o uso dos dados descrito em{" "}
              <Link to="/privacidade" className="underline">
                Privacidade
              </Link>
              .
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
