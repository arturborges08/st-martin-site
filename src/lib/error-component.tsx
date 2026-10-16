import type { ErrorComponentProps } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";

const FALLBACK_MESSAGE = "Algo inesperado aconteceu. Recarregue a página.";

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error) return error;
  return FALLBACK_MESSAGE;
}

export function AppErrorComponent({ error }: ErrorComponentProps) {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 bg-bg px-6 text-center text-fg">
      <img src="/brand/monogram.png" alt="" className="h-12 w-auto opacity-80" />
      <h1 className="text-3xl font-semibold">Não foi possível abrir esta página</h1>
      <p className="max-w-md text-sm break-words text-muted">{errorMessage(error)}</p>
      <Link to="/" className="press mt-2 inline-flex h-11 items-center rounded-full bg-fg px-5 text-sm font-medium text-bg">
        Voltar ao início
      </Link>
    </main>
  );
}
