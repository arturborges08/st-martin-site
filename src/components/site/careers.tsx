import { Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { TextAreaField, TextField } from "@/components/ui/field";
import { errorText, isValidEmail, isValidWhatsapp } from "@/lib/format";
import { submitApplication } from "@/lib/shop.functions";

const ROLES = [
  ["barbeiro", "Barbeiro(a)"],
  ["bar", "Bar"],
  ["outra", "Outra área"],
] as const;

type Role = (typeof ROLES)[number][0];

export function Careers() {
  const [role, setRole] = useState<Role>("barbeiro");
  const [otherRole, setOtherRole] = useState("");
  const [form, setForm] = useState({ name: "", whatsapp: "", email: "", experience: "", about: "", portfolio: "" });
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const set = (key: keyof typeof form) => (event: { target: { value: string } }) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    const roleLabel = role === "outra" ? otherRole.trim() : (ROLES.find(([id]) => id === role)?.[1] ?? "");
    if (form.name.trim().split(" ").filter(Boolean).length < 2) return setError("Coloque nome e sobrenome.");
    if (!isValidWhatsapp(form.whatsapp)) return setError("O WhatsApp precisa ter DDD.");
    if (form.email && !isValidEmail(form.email)) return setError("Esse e-mail parece incompleto.");
    if (roleLabel.length < 2) return setError("Diga em qual área você quer trabalhar.");
    if (form.about.trim().length < 10) return setError("Escreva pelo menos uma frase sobre você.");
    if (!consent) return setError("Marque a autorização para a casa guardar seus dados.");
    setBusy(true);
    try {
      await submitApplication({ data: { ...form, role: roleLabel } });
      setDone(true);
    } catch (reason) {
      setError(errorText(reason, "Não deu para enviar agora. Tente de novo."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section id="trabalhe" className="px-5 py-24 sm:px-8 md:py-32">
      <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-5">
          <h2 className="text-4xl font-semibold sm:text-5xl">Quer trabalhar na St. Martin?</h2>
          <p className="mt-5 max-w-md text-lg text-muted">
            A casa procura barbeiros e barbeiras em Araçatuba. Mande seus dados e a equipe chama no WhatsApp.
          </p>
          <img
            src="/media/contratando.jpg"
            alt="Anúncio da St. Martin: estamos contratando barbeiros e barbeiras em Araçatuba."
            width={526}
            height={526}
            loading="lazy"
            className="mt-10 hidden aspect-square w-full max-w-sm rounded-[var(--radius-card)] object-cover lg:block"
          />
        </div>

        <div className="lg:col-span-7">
          {done ? (
            <div role="status" className="rounded-[var(--radius-card)] border border-line bg-raised p-8 sm:p-10">
              <span className="grid size-12 place-items-center rounded-full bg-ok/15 text-ok">
                <Check className="size-6" />
              </span>
              <h3 className="mt-6 text-2xl font-semibold">Candidatura enviada</h3>
              <p className="mt-2 text-muted">
                Recebemos seus dados. Se o perfil combinar com a vaga, a equipe fala com você pelo WhatsApp informado.
              </p>
            </div>
          ) : (
            <form
              onSubmit={submit}
              noValidate
              className="grid gap-5 rounded-[var(--radius-card)] border border-line bg-raised p-6 sm:grid-cols-2 sm:p-8"
            >
              <div className="grid gap-2 sm:col-span-2">
                <span className="text-[13px] font-medium text-muted" id="area-label">
                  Área
                </span>
                <Segmented label="Área" options={ROLES} value={role} onChange={setRole} className="w-fit" />
              </div>
              {role === "outra" ? (
                <TextField
                  className="sm:col-span-2"
                  label="Qual área?"
                  value={otherRole}
                  onChange={(event) => setOtherRole(event.target.value)}
                  maxLength={60}
                />
              ) : null}
              <TextField label="Nome completo" value={form.name} onChange={set("name")} autoComplete="name" maxLength={80} />
              <TextField
                label="WhatsApp"
                value={form.whatsapp}
                onChange={set("whatsapp")}
                inputMode="tel"
                autoComplete="tel"
                placeholder="(18) 99999-0000"
              />
              <TextField label="E-mail (opcional)" value={form.email} onChange={set("email")} type="email" autoComplete="email" />
              <TextField label="Tempo de experiência" value={form.experience} onChange={set("experience")} placeholder="Ex.: 3 anos" maxLength={60} />
              <TextAreaField
                className="sm:col-span-2"
                label="Fale um pouco de você"
                value={form.about}
                onChange={set("about")}
                maxLength={1200}
                placeholder="Onde já trabalhou, estilos que domina, disponibilidade de horário."
              />
              <TextField
                className="sm:col-span-2"
                label="Instagram ou portfólio (opcional)"
                value={form.portfolio}
                onChange={set("portfolio")}
                placeholder="https://instagram.com/seuperfil"
                maxLength={200}
              />
              <label className="flex items-start gap-3 text-sm text-muted sm:col-span-2">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(event) => setConsent(event.target.checked)}
                  className="mt-0.5 size-5 shrink-0 accent-[var(--color-cognac)]"
                />
                <span>
                  Autorizo a St. Martin a guardar esses dados para avaliar minha candidatura.{" "}
                  <Link to="/privacidade" className="underline">
                    Como os dados são usados
                  </Link>
                  .
                </span>
              </label>
              {error ? (
                <p role="alert" className="rounded-2xl bg-danger/12 px-4 py-3 text-sm text-danger sm:col-span-2">
                  {error}
                </p>
              ) : null}
              <div className="sm:col-span-2">
                <Button type="submit" size="lg" disabled={busy}>
                  {busy ? "Enviando…" : "Enviar candidatura"}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
