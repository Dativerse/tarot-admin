import { useState, type ReactNode, type SubmitEvent } from "react";
import { useTranslation } from "react-i18next";
import { useErrorMessage, useSession, useSignIn } from "@/api/queries";
import { Field } from "@/components/Field";

/** Shows its children once the admin is signed in, and the sign-in form until then. */
export function SessionGate({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const errorMessage = useErrorMessage();
  const session = useSession();

  if (session.isPending)
    return (
      <div className="splash">
        <span className="spinner" aria-hidden="true" /> {t("session.checking")}
      </div>
    );
  if (session.isError)
    return (
      <div className="splash">
        <p className="error">{errorMessage(session.error)}</p>
        <button className="button" onClick={() => void session.refetch()}>
          {t("session.retry")}
        </button>
      </div>
    );
  if (!session.data) return <SignIn />;
  return <>{children}</>;
}

function SignIn() {
  const { t } = useTranslation();
  const errorMessage = useErrorMessage();
  const signIn = useSignIn();
  const [password, setPassword] = useState("");

  const submit = (e: SubmitEvent) => {
    e.preventDefault();
    if (password) signIn.mutate(password);
  };

  return (
    <form className="panel sign-in" onSubmit={submit}>
      <h1 className="title">{t("signIn.title")}</h1>
      <p className="hint">{t("signIn.subtitle")}</p>
      <Field label={t("signIn.password")}>
        <input
          className="input"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-invalid={signIn.isError}
          autoFocus
        />
      </Field>
      <button className="button" disabled={signIn.isPending || !password}>
        {signIn.isPending ? t("signIn.signingIn") : t("signIn.submit")}
      </button>
      {signIn.isError && <p className="error">{errorMessage(signIn.error, "signIn")}</p>}
    </form>
  );
}
