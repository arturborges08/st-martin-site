import { createRootRoute, HeadContent, Link, Outlet, Scripts } from "@tanstack/react-router";
import { useEffect } from "react";
import { Toaster, toast } from "sonner";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { Button } from "@/components/ui/button";
import { onNewNotification } from "@/lib/me-store";
import appCss from "../styles.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "St. Martin Bar e Barbearia · Araçatuba" },
      {
        name: "description",
        content:
          "Barba, cabelo, bigode e cerveja em Araçatuba. Veja os serviços da St. Martin e marque seu horário online.",
      },
      { name: "theme-color", content: "#0b0b0a" },
    ],
    links: [
      { rel: "icon", type: "image/png", href: "/brand/favicon.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Geist:wght@300..700&family=Geist+Mono:wght@400;500&display=swap",
      },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/__grok/icon-180.png" },
    ],
  }),
  component: RootComponent,
  notFoundComponent: NotFound,
});

function RootComponent() {
  useEffect(() => {
    document.documentElement.classList.add("js");
    onNewNotification((title, body) => toast(title, { description: body }));
    return () => onNewNotification(null);
  }, []);

  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <PreviewHostBridge />
        <AuthProvider>
          <Outlet />
        </AuthProvider>
        <Toaster
          theme="dark"
          position="top-center"
          toastOptions={{
            className: "!rounded-2xl !border-line !bg-raised-2 !text-fg",
            descriptionClassName: "!text-muted",
          }}
        />
        <Scripts />
      </body>
    </html>
  );
}

function NotFound() {
  return (
    <main className="grid min-h-svh place-items-center bg-bg px-6 text-center text-fg">
      <div>
        <img src="/brand/monogram.png" alt="" className="mx-auto h-14 w-auto opacity-80" />
        <h1 className="mt-8 text-4xl font-semibold">Página não encontrada</h1>
        <p className="mt-3 text-muted">O endereço pode ter mudado.</p>
        <Button asChild className="mt-8">
          <Link to="/">Voltar ao início</Link>
        </Button>
      </div>
    </main>
  );
}
