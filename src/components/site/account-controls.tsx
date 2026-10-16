import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import * as Popover from "@radix-ui/react-popover";
import { Link, useNavigate } from "@tanstack/react-router";
import { Bell, CalendarDays, LayoutDashboard, LogOut, UserRound } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { listNotifications, markNotificationsRead } from "@/lib/account.functions";
import { signOut } from "@/lib/auth/client";
import { cn } from "@/lib/cn";
import { initials } from "@/lib/format";
import { setMeLocally, useMe } from "@/lib/me-store";
import type { AppNotification } from "@/lib/types";

export function NotificationBell({ className }: { className?: string }) {
  const { me } = useMe();
  const navigate = useNavigate();
  const [items, setItems] = useState<AppNotification[] | null>(null);
  const [error, setError] = useState(false);
  if (!me) return null;

  async function load() {
    setError(false);
    try {
      const list = await listNotifications();
      setItems(list);
      if (list.some((item) => !item.read)) {
        await markNotificationsRead();
        setMeLocally({ unread: 0 });
      }
    } catch {
      setError(true);
    }
  }

  return (
    <Popover.Root onOpenChange={(open) => (open ? void load() : setItems((list) => list?.map((i) => ({ ...i, read: true })) ?? null))}>
      <Popover.Trigger
        className={cn(
          "press relative grid size-10 place-items-center rounded-full text-muted transition-colors hover:bg-white/[0.06] hover:text-fg",
          className,
        )}
        aria-label={me.unread ? `Avisos, ${me.unread} novos` : "Avisos"}
      >
        <Bell className="size-[18px]" strokeWidth={1.8} />
        {me.unread > 0 ? (
          <span className="absolute top-1.5 right-1.5 grid min-w-4 place-items-center rounded-full bg-cognac px-1 text-[10px] leading-4 font-semibold text-bg tnum">
            {me.unread > 9 ? "9+" : me.unread}
          </span>
        ) : null}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={10}
          collisionPadding={12}
          className="pop z-50 w-[min(360px,calc(100vw-24px))] overflow-hidden rounded-3xl border border-line bg-raised shadow-[0_24px_60px_rgb(0_0_0/0.55)]"
        >
          <div className="flex items-center justify-between px-5 pt-4 pb-3">
            <p className="text-[15px] font-semibold">Avisos</p>
            <Link to="/conta" className="text-[13px] text-muted hover:text-fg">
              Minha conta
            </Link>
          </div>
          <div className="max-h-[60svh] overflow-y-auto px-2 pb-2">
            {error ? (
              <p className="px-3 py-6 text-sm text-muted">Não deu para carregar os avisos agora.</p>
            ) : items === null ? (
              <div className="space-y-2 p-3" aria-label="Carregando">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-12 animate-pulse rounded-2xl bg-white/[0.04]" />
                ))}
              </div>
            ) : items.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-muted">
                Nada por aqui. Quando você marcar um horário, a confirmação aparece neste sino.
              </p>
            ) : (
              <ul>
                {items.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => item.link && void navigate({ href: item.link })}
                      className="flex w-full gap-3 rounded-2xl px-3 py-3 text-left transition-colors hover:bg-white/[0.04]"
                    >
                      <span
                        className={cn(
                          "mt-1.5 size-2 shrink-0 rounded-full",
                          item.read ? "bg-transparent" : "bg-cognac",
                        )}
                        aria-hidden="true"
                      />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium">{item.title}</span>
                        <span className="mt-0.5 block text-[13px] leading-snug text-muted">{item.body}</span>
                        <span className="mt-1 block text-xs text-subtle tnum">{item.createdAt}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

const menuItem =
  "flex h-10 cursor-pointer items-center gap-3 rounded-xl px-3 text-sm text-fg outline-none data-[highlighted]:bg-white/[0.06]";

export function UserMenu() {
  const { me, status } = useMe();
  const [leaving, setLeaving] = useState(false);
  if (status === "loading") return <span className="size-10 rounded-full bg-white/[0.04]" aria-hidden="true" />;
  if (!me) {
    return (
      <Link
        to="/entrar"
        search={{ next: "" }}
        className="press hidden h-10 items-center rounded-full px-4 text-sm font-medium text-muted transition-colors hover:bg-white/[0.06] hover:text-fg sm:inline-flex"
      >
        Entrar
      </Link>
    );
  }
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        className="press grid size-10 place-items-center rounded-full bg-raised-3 text-[13px] font-semibold"
        aria-label="Menu da conta"
      >
        {initials(me.name || me.email)}
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={10}
          className="pop z-50 w-64 rounded-3xl border border-line bg-raised p-2 shadow-[0_24px_60px_rgb(0_0_0/0.55)]"
        >
          <div className="px-3 pt-2 pb-3">
            <p className="truncate text-sm font-medium">{me.name || "Sua conta"}</p>
            <p className="truncate text-[13px] text-muted">{me.email}</p>
          </div>
          <DropdownMenu.Separator className="mx-2 my-1 h-px bg-line" />
          <DropdownMenu.Item asChild className={menuItem}>
            <Link to="/conta">
              <CalendarDays className="size-4 text-muted" /> Meus horários
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item asChild className={menuItem}>
            <Link to="/conta" hash="perfil">
              <UserRound className="size-4 text-muted" /> Meus dados
            </Link>
          </DropdownMenu.Item>
          {me.isAdmin ? (
            <DropdownMenu.Item asChild className={menuItem}>
              <Link to="/painel">
                <LayoutDashboard className="size-4 text-muted" /> Painel da barbearia
              </Link>
            </DropdownMenu.Item>
          ) : null}
          <DropdownMenu.Separator className="mx-2 my-1 h-px bg-line" />
          <DropdownMenu.Item
            className={menuItem}
            disabled={leaving}
            onSelect={(event) => {
              event.preventDefault();
              setLeaving(true);
              signOut("/").catch(() => {
                setLeaving(false);
                toast.error("Não conseguimos sair agora. Tente de novo.");
              });
            }}
          >
            <LogOut className="size-4 text-muted" /> {leaving ? "Saindo…" : "Sair"}
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
