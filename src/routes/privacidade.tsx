import { createFileRoute } from "@tanstack/react-router";
import { SiteFrame } from "@/components/site/shell";
import { getPublicSite } from "@/lib/shop.functions";

export const Route = createFileRoute("/privacidade")({
  loader: () => getPublicSite(),
  head: () => ({
    meta: [
      { title: "Privacidade · St. Martin Bar e Barbearia" },
      { name: "description", content: "Quais dados a St. Martin guarda quando você agenda, cria conta ou se candidata." },
    ],
  }),
  component: PrivacyRoute,
});

const SECTIONS = [
  {
    title: "Agendamento",
    body: "Guardamos nome, WhatsApp, serviço, profissional, data e horário. Só a equipe da barbearia, logada no painel, vê esses dados. Eles servem para organizar a agenda e falar com você se algo mudar.",
  },
  {
    title: "Conta",
    body: "Se você criar uma conta, guardamos nome, e-mail e a senha em formato protegido (nunca a senha em texto). A conta liga seus agendamentos ao seu perfil e mostra avisos dentro do site.",
  },
  {
    title: "Candidaturas",
    body: "No Trabalhe conosco guardamos o que você enviar no formulário, para avaliar a candidatura. Só a equipe da barbearia tem acesso.",
  },
  {
    title: "Seus direitos",
    body: "Pela Lei Geral de Proteção de Dados você pode pedir para ver, corrigir ou apagar seus dados. Faça o pedido pelo WhatsApp da barbearia.",
  },
];

function PrivacyRoute() {
  const shop = Route.useLoaderData();
  return (
    <SiteFrame profile={shop.profile} showCta={false}>
      <article className="mx-auto max-w-2xl px-5 pt-32 pb-24 sm:px-8">
        <h1 className="text-4xl font-semibold sm:text-5xl">Privacidade</h1>
        <p className="mt-4 text-lg text-muted">O que a St. Martin guarda quando você usa este site, e para quê.</p>
        <div className="mt-12 grid gap-10">
          {SECTIONS.map((section) => (
            <section key={section.title}>
              <h2 className="text-xl font-semibold">{section.title}</h2>
              <p className="mt-3 leading-relaxed text-muted">{section.body}</p>
            </section>
          ))}
        </div>
      </article>
    </SiteFrame>
  );
}
