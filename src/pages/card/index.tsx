import { Link, Navigate, useLocation, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useCard, useErrorMessage, useUpdateCard } from "@/api/queries";
import { DECK_SIZE } from "@/api/schemas";
import { CardEditor } from "./CardEditor";

/** Set by the card grid, so "All cards" returns to the same filters. */
type ListState = { listSearch?: string } | null;

export default function CardPage() {
  const { id } = useParams<{ id: string }>();

  if (!id || !/^\d+$/.test(id) || Number(id) >= DECK_SIZE) {
    return <Navigate to="/cards" replace />;
  }

  // Keyed so the save status of one card doesn't show on the next.
  return <EditCard key={id} id={Number(id)} />;
}

function EditCard({ id }: { id: number }) {
  const { t } = useTranslation();
  const location = useLocation();
  const errorMessage = useErrorMessage();
  const card = useCard(id);
  const update = useUpdateCard();
  const listSearch = (location.state as ListState)?.listSearch ?? "";

  return (
    <div className="stage">
      <nav className="toolbar" aria-label={t("cardPage.navigation")}>
        <Link className="link" to={{ pathname: "/cards", search: listSearch }}>
          ← {t("cardPage.back")}
        </Link>
        <span className="toolbar__spacer" />
        {id > 0 && (
          <Link className="link" to={`/cards/${id - 1}`} state={location.state}>
            ‹ {t("cardPage.previous")}
          </Link>
        )}
        {id < DECK_SIZE - 1 && (
          <Link className="link" to={`/cards/${id + 1}`} state={location.state}>
            {t("cardPage.next")} ›
          </Link>
        )}
      </nav>

      {card.isPending && <p className="hint">{t("cardPage.loading")}</p>}
      {card.isError && <p className="error">{errorMessage(card.error)}</p>}
      {card.data && (
        <>
          <header className="stage__header">
            <p className="eyebrow">
              #{id} · {t(`arcana.${card.data.arcana}`)}
              {card.data.suit && ` · ${t(`suits.${card.data.suit}`)}`}
            </p>
            <h1 className="title">{card.data.name}</h1>
          </header>
          <div className="editor">
            <img className="editor__art" src={`/cards/${id}.jpg`} alt={card.data.name} draggable={false} />
            <CardEditor
              // Starts over from the stored values whenever they change, e.g. after a save.
              key={JSON.stringify(card.data)}
              card={card.data}
              busy={update.isPending}
              saved={update.isSuccess}
              error={update.isError ? errorMessage(update.error) : null}
              onSubmit={(request) => update.mutate({ id, ...request })}
            />
          </div>
        </>
      )}
    </div>
  );
}
