import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { NotificationBell, UserMenu } from "@/components/site/account-controls";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { formatWhatsapp, safeHttp, whatsAppHref } from "@/lib/format";
import { useMe } from "@/lib/me-store";
import { todayInSaoPaulo } from "@/lib/time";
import type { Profile } from "@/lib/types";

const NAV = [
  { href: "/#servicos", label: "Serviços" },
  { href: "/#casa", label: "A casa" },
  { href: "/#equipe", label: "Equipe" },
  { href: "/#contato", label: "Contato" },
] as const;

const BOOK = { to: "/agendar", search: { servico: "", profissional: "", dia: "", hora: "" } } as const;

function useScrolled(threshold = 12) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);
  return scrolled;
}

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <img src="/brand/monogram.png" alt="" width={46} height={29} className="h-[22px] w-auto" />
      {compact ? null : (
        <img
          src="/brand/wordmark.png"
          alt="St. Martin Bar e Barbearia"
          width={305}
          height={83}
          className="hidden h-[22px] w-auto opacity-90 sm:block"
        />
      )}
      <span className="sr-only sm:hidden">St. Martin Bar e Barbearia</span>
    </span>
  );
}

function Header() {
  const scrolled = useScrolled();
  const { me } = useMe();
  const [open, setOpen] = useState(false);

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-40 px-3 pt-3 sm:px-5 sm:pt-4">
      <div
        className={cn(
          "pointer-events-auto mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 rounded-full border pr-2 pl-5 transition-[background-color,border-color,box-shadow] duration-300",
          scrolled
            ? "glass border-line shadow-[0_10px_40px_rgb(0_0_0/0.45)]"
            : "border-transparent bg-transparent",
        )}
      >
        <Link to="/" aria-label="St. Martin, página inicial" className="shrink-0">
          <Brand />
        </Link>
        <nav aria-label="Principal" className="hidden items-center gap-1 lg:flex">
          {NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="rounded-full px-3.5 py-2 text-[13px] font-medium text-muted transition-colors hover:text-fg"
            >
              {item.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-1">
          <NotificationBell />
          <UserMenu />
          <Button asChild size="sm" className="ml-1 hidden sm:inline-flex">
            <Link {...BOOK}>Agendar</Link>
          </Button>
          <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
            <DialogPrimitive.Trigger
              className="press grid size-10 place-items-center rounded-full text-fg hover:bg-white/[0.06] lg:hidden"
              aria-label="Abrir menu"
            >
              <Menu className="size-5" strokeWidth={1.8} />
            </DialogPrimitive.Trigger>
            <DialogPrimitive.Portal>
              <DialogPrimitive.Overlay className="sheet-overlay fixed inset-0 z-50 bg-black/60" />
              <DialogPrimitive.Content className="sheet-content fixed inset-y-0 right-0 z-50 flex w-[min(420px,100vw)] flex-col bg-raised p-6 shadow-[-30px_0_80px_rgb(0_0_0/0.5)]">
                <div className="flex items-center justify-between">
                  <Brand />
                  <DialogPrimitive.Close
                    className="press grid size-10 place-items-center rounded-full bg-white/[0.06]"
                    aria-label="Fechar menu"
                  >
                    <X className="size-5" />
                  </DialogPrimitive.Close>
                </div>
                <DialogPrimitive.Title className="sr-only">Menu</DialogPrimitive.Title>
                <DialogPrimitive.Description className="sr-only">Navegação do site</DialogPrimitive.Description>
                <nav aria-label="Menu" className="mt-10 flex flex-col">
                  {NAV.map((item) => (
                    <a
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className="border-b border-line py-4 text-2xl font-semibold tracking-tight"
                    >
                      {item.label}
                    </a>
                  ))}
                  {me ? (
                    <Link to="/conta" onClick={() => setOpen(false)} className="border-b border-line py-4 text-2xl font-semibold tracking-tight">
                      Minha conta
                    </Link>
                  ) : (
                    <Link
                      to="/entrar"
                      search={{ next: "" }}
                      onClick={() => setOpen(false)}
                      className="border-b border-line py-4 text-2xl font-semibold tracking-tight"
                    >
                      Entrar ou criar conta
                    </Link>
                  )}
                  {me?.isAdmin ? (
                    <Link to="/painel" onClick={() => setOpen(false)} className="border-b border-line py-4 text-2xl font-semibold tracking-tight">
                      Painel
                    </Link>
                  ) : null}
                </nav>
                <Button asChild size="lg" className="mt-auto w-full">
                  <Link {...BOOK} onClick={() => setOpen(false)}>
                    Agendar horário
                  </Link>
                </Button>
              </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
          </DialogPrimitive.Root>
        </div>
      </div>
    </header>
  );
}

function Footer({ profile }: { profile?: Profile }) {
  const year = todayInSaoPaulo().slice(0, 4);
  const whatsapp = profile ? whatsAppHref(profile.whatsappDisplay) : null;
  const instagram = profile ? safeHttp(profile.instagram) : null;
  return (
    <footer className="border-t border-line">
      <div className="mx-auto grid max-w-6xl gap-12 px-5 py-16 sm:px-8 md:grid-cols-12">
        <div className="md:col-span-5">
          <img src="/brand/logo-stack.png" alt="St. Martin Bar e Barbearia" width={305} height={250} className="h-24 w-auto" />
          <p className="mt-6 max-w-xs text-sm text-muted">Barba, cabelo, bigode e cerveja. {profile?.city || "Araçatuba/SP"}.</p>
        </div>
        <nav aria-label="Rodapé" className="grid gap-3 text-sm md:col-span-3">
          <a href="/#servicos" className="text-muted hover:text-fg">Serviços</a>
          <a href="/#casa" className="text-muted hover:text-fg">A casa</a>
          <a href="/#trabalhe" className="text-muted hover:text-fg">Trabalhe conosco</a>
          <Link {...BOOK} className="text-muted hover:text-fg">Agendar horário</Link>
          <Link to="/privacidade" className="text-muted hover:text-fg">Privacidade</Link>
        </nav>
        <div className="grid content-start gap-3 text-sm md:col-span-4">
          {profile?.addressLine ? <p className="text-muted">{profile.addressLine}</p> : null}
          {profile?.phoneDisplay ? <p className="text-muted tnum">Telefone {profile.phoneDisplay}</p> : null}
          {whatsapp ? (
            <a href={whatsapp} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-muted hover:text-fg tnum">
              WhatsApp {formatWhatsapp(profile?.whatsappDisplay ?? "")} <ArrowUpRight className="size-3.5" />
            </a>
          ) : null}
          {instagram ? (
            <a href={instagram} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-muted hover:text-fg">
              Instagram <ArrowUpRight className="size-3.5" />
            </a>
          ) : null}
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-5 pb-10 text-xs text-subtle sm:px-8">© {year} St. Martin Bar e Barbearia</div>
    </footer>
  );
}

function StickyBook() {
  const visible = useScrolled(520);
  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-30 px-3 pb-[max(12px,env(safe-area-inset-bottom))] transition-[transform,opacity] duration-300 ease-[var(--ease-out)] sm:hidden",
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-full opacity-0",
      )}
    >
      <Button asChild size="lg" className="w-full shadow-[0_12px_40px_rgb(0_0_0/0.6)]">
        <Link {...BOOK} tabIndex={visible ? undefined : -1}>
          Agendar horário
        </Link>
      </Button>
    </div>
  );
}

export function SiteFrame({
  children,
  profile,
  showCta = true,
}: {
  children: ReactNode;
  profile?: Profile;
  showCta?: boolean;
}) {
  return (
    <div className={cn("min-h-svh bg-bg text-fg", showCta && "pb-24 sm:pb-0")}>
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[60] focus:rounded-full focus:bg-fg focus:px-4 focus:py-2 focus:text-bg"
      >
        Ir para o conteúdo
      </a>
      <Header />
      <main id="conteudo">{children}</main>
      <Footer profile={profile} />
      {showCta ? <StickyBook /> : null}
    </div>
  );
}
