import { redirect } from "next/navigation";
import { getChatGPTUser } from "../chatgpt-auth";

export const dynamic = "force-dynamic";

type SignInPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const firstValue = (value: string | string[] | undefined): string =>
  Array.isArray(value) ? (value[0] ?? "") : (value ?? "");

const safeReturnTo = (value: string): string => {
  if (!value.startsWith("/") || value.startsWith("//")) return "/game";
  if (value === "/signin" || value.startsWith("/signin?")) return "/game";
  return value;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const values = await searchParams;
  const returnTo = safeReturnTo(firstValue(values.return_to));
  const error = firstValue(values.error);

  // Already authenticated visitors skip the form.
  if (await getChatGPTUser()) redirect(returnTo);

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        background: "radial-gradient(circle at 50% -20%, #14202b, #05080b 70%)",
        color: "#e7edf3",
        fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: "26rem",
          border: "1px solid #243a4a",
          borderRadius: "0.75rem",
          background: "rgba(10, 16, 22, 0.85)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
          padding: "2rem",
        }}
      >
        <p
          style={{
            letterSpacing: "0.35em",
            fontSize: "0.7rem",
            color: "#7f96a8",
            margin: 0,
          }}
        >
          DELENDA.QUEST
        </p>
        <h1 style={{ fontSize: "1.4rem", margin: "0.5rem 0 0.25rem" }}>
          Report for duty
        </h1>
        <p style={{ color: "#9fb0be", fontSize: "0.85rem", marginTop: 0 }}>
          Sign in with your email to sync campaigns across devices, keep service
          records, and connect with allies. No password required.
        </p>

        {error ? (
          <p
            role="alert"
            style={{
              background: "rgba(120, 30, 30, 0.35)",
              border: "1px solid #7a2f2f",
              color: "#ffd7d7",
              borderRadius: "0.5rem",
              padding: "0.6rem 0.75rem",
              fontSize: "0.8rem",
            }}
          >
            {error}
          </p>
        ) : null}

        <form method="post" action="/api/session" style={{ display: "grid", gap: "0.9rem" }}>
          <input type="hidden" name="return_to" value={returnTo} />

          <label style={{ display: "grid", gap: "0.3rem", fontSize: "0.75rem", color: "#9fb0be" }}>
            EMAIL
            <input
              type="email"
              name="email"
              required
              autoComplete="email"
              placeholder="commander@example.com"
              style={inputStyle}
            />
          </label>

          <label style={{ display: "grid", gap: "0.3rem", fontSize: "0.75rem", color: "#9fb0be" }}>
            CALL SIGN <span style={{ color: "#617382" }}>(optional)</span>
            <input
              type="text"
              name="name"
              maxLength={60}
              autoComplete="nickname"
              placeholder="Displayed to your allies"
              style={inputStyle}
            />
          </label>

          <details style={{ fontSize: "0.75rem", color: "#7f96a8" }}>
            <summary style={{ cursor: "pointer" }}>Administrator sign-in</summary>
            <label style={{ display: "grid", gap: "0.3rem", marginTop: "0.5rem" }}>
              ADMINISTRATOR KEY
              <input
                type="password"
                name="admin_key"
                autoComplete="off"
                placeholder="Leave blank for normal play"
                style={inputStyle}
              />
            </label>
          </details>

          <button
            type="submit"
            style={{
              marginTop: "0.25rem",
              padding: "0.75rem 1rem",
              borderRadius: "0.5rem",
              border: "1px solid #caa64a",
              background: "linear-gradient(180deg, #e8c766, #c69a35)",
              color: "#241c05",
              fontWeight: 700,
              letterSpacing: "0.12em",
              cursor: "pointer",
            }}
          >
            ENTER CAMPAIGN
          </button>
        </form>
      </section>
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.65rem 0.75rem",
  borderRadius: "0.5rem",
  border: "1px solid #2b3b49",
  background: "#0b131b",
  color: "#e7edf3",
  fontFamily: "inherit",
  fontSize: "0.9rem",
  boxSizing: "border-box",
};
