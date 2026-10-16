import { useEffect, useSyncExternalStore } from "react";
import { getMe, listNotifications } from "@/lib/account.functions";
import type { Me } from "@/lib/types";

/**
 * Estado do visitante no navegador: logado ou não, admin ou não, e avisos não
 * lidos. Carrega no cliente (a sessão pode estar num token que o SSR não vê) e
 * reconsulta a cada minuto enquanto a aba estiver visível.
 */
type State = { status: "loading" | "ready"; me: Me | null };

let state: State = { status: "loading", me: null };
const listeners = new Set<() => void>();
let inflight: Promise<void> | null = null;
let started = false;
let lastSeenUnread = -1;
type NotifyHook = (title: string, body: string) => void;
let onNew: NotifyHook | null = null;

function emit() {
  for (const listener of listeners) listener();
}

export function refreshMe(): Promise<void> {
  inflight ??= getMe()
    .then(async (me) => {
      const unread = me?.unread ?? 0;
      if (me && lastSeenUnread >= 0 && unread > lastSeenUnread && onNew) {
        try {
          const list = await listNotifications();
          const newest = list.find((item) => !item.read);
          if (newest) onNew(newest.title, newest.body);
        } catch {
          /* aviso some quando a rede volta */
        }
      }
      lastSeenUnread = me ? unread : -1;
      state = { status: "ready", me };
    })
    .catch(() => {
      state = { status: "ready", me: state.me };
    })
    .finally(() => {
      inflight = null;
      emit();
    });
  return inflight;
}

export function setMeLocally(patch: Partial<Me>) {
  if (!state.me) return;
  state = { ...state, me: { ...state.me, ...patch } };
  if (typeof patch.unread === "number") lastSeenUnread = patch.unread;
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const serverState: State = { status: "loading", me: null };

export function useMe(): State {
  const snapshot = useSyncExternalStore(
    subscribe,
    () => state,
    () => serverState,
  );
  useEffect(() => {
    if (started) return;
    started = true;
    void refreshMe();
    const tick = () => {
      if (document.visibilityState === "visible") void refreshMe();
    };
    const timer = window.setInterval(tick, 60_000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      started = false;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, []);
  return snapshot;
}

/** Registra quem mostra o toast quando chega aviso novo. */
export function onNewNotification(hook: NotifyHook | null) {
  onNew = hook;
}
