import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useCards, useErrorMessage, useSeedCards } from "@/api/queries";
import { ArcanaSchema, SuitSchema } from "@/api/schemas";
import { ChoiceChips } from "@/components/ChoiceChips";

const ALL = "all";

export default function CardsPage() {
  const { t } = useTranslation();
  const errorMessage = useErrorMessage();
  const [searchParams, setSearchParams] = useSearchParams();
  const cards = useCards();
  const seed = useSeedCards();

  // Filters live in the URL so they survive opening a card and coming back. The search box also keeps its own
  // state: the router applies URL changes in a transition, and a controlled input fed that way drops keystrokes.
  const [query, setQuery] = useState(() => searchParams.get("q") ?? "");
  const arcana = ArcanaSchema.safeParse(searchParams.get("arcana")).data ?? null;
  const suit = arcana === "major" ? null : (SuitSchema.safeParse(searchParams.get("suit")).data ?? null);

  const update = (changes: Record<string, string | null>) =>
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        for (const [key, value] of Object.entries(changes)) {
          if (value) next.set(key, value);
          else next.delete(key);
        }
        return next;
      },
      { replace: true },
    );

  // Filtered here, not with /cards/arcana or /cards/suit: those compare with capitalized values that the stored
  // lowercase data never matches, and 78 cards are cheap to filter anyway.
  const needle = query.trim().toLowerCase().replace(/^#/, "");
  const visible = (cards.data ?? []).filter(
    (card) =>
      (!arcana || card.arcana === arcana) &&
      (!suit || card.suit === suit) &&
      (!needle || card.name.toLowerCase().includes(needle) || String(card.id) === needle),
  );

  const reseed = () => {
    if (window.confirm(t("cardsPage.reseedConfirm"))) seed.mutate();
  };

  return (
    <div className="stage">
      <header className="stage__header">
        <h1 className="title">{t("cardsPage.title")}</h1>
        <p className="subtitle">{t("cardsPage.subtitle")}</p>
      </header>

      <div className="toolbar">
        <input
          type="search"
          className="input toolbar__search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            update({ q: e.target.value });
          }}
          placeholder={t("cardsPage.searchPlaceholder")}
          aria-label={t("cardsPage.searchLabel")}
        />
        <span className="toolbar__spacer" />
        <button className="button button--ghost" onClick={reseed} disabled={seed.isPending}>
          {seed.isPending ? t("cardsPage.reseeding") : t("cardsPage.reseed")}
        </button>
      </div>

      <div className="filters">
        <ChoiceChips
          legend={t("cardsPage.arcana")}
          name="arcana"
          options={[ALL, ...ArcanaSchema.options]}
          value={arcana ?? ALL}
          label={(a) => (a === ALL ? t("cardsPage.all") : t(`arcana.${a}`))}
          onChange={(a) => update({ arcana: a === ALL ? null : a, suit: null })}
        />
        {arcana !== "major" && (
          <ChoiceChips
            legend={t("cardsPage.suit")}
            name="suit"
            options={[ALL, ...SuitSchema.options]}
            value={suit ?? ALL}
            label={(s) => (s === ALL ? t("cardsPage.all") : t(`suits.${s}`))}
            onChange={(s) => update({ suit: s === ALL ? null : s })}
          />
        )}
      </div>

      {seed.isSuccess && <p className="notice">{t("cardsPage.reseeded", { count: seed.data.cardsSeeded })}</p>}
      {seed.isError && <p className="error">{errorMessage(seed.error)}</p>}
      {cards.isPending && <p className="hint">{t("cardsPage.loading")}</p>}
      {cards.isError && <p className="error">{errorMessage(cards.error)}</p>}
      {cards.data && (
        <>
          <p className="hint">{t("cardsPage.showing", { count: visible.length, total: cards.data.length })}</p>
          {visible.length === 0 && <p className="hint">{t("cardsPage.noMatches")}</p>}
          <ul className="card-grid">
            {visible.map((card) => (
              <li key={card.id}>
                <Link className="card-tile" to={`/cards/${card.id}`} state={{ listSearch: searchParams.toString() }}>
                  <img className="card-tile__art" src={`/cards/${card.id}.jpg`} alt="" loading="lazy" draggable={false} />
                  <span className="card-tile__name">{card.name}</span>
                  <span className="card-tile__meta">
                    #{card.id} · {card.suit ? t(`suits.${card.suit}`) : t(`arcana.${card.arcana}`)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
