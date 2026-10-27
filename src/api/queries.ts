import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { ApiError, request, requestNoData } from "@/api/http";
import {
  CardDetailSchema,
  CardSchema,
  DeckSettingsSchema,
  OllamaSettingsSchema,
  SeedResultSchema,
  SettingSchema,
  type DeckSettings,
  type OllamaSettings,
  type UpdateCardRequest,
} from "@/api/schemas";

export const keys = {
  session: ["session"] as const,
  cards: ["cards"] as const,
  card: (id: number) => ["cards", id] as const,
  settings: ["settings"] as const,
  ollama: ["settings", "ollama"] as const,
  deck: ["settings", "deck"] as const,
};

/** Whether this browser is signed in. UNAUTHORIZED means signed out, not an error. */
export function useSession() {
  return useQuery({
    queryKey: keys.session,
    queryFn: async () => {
      try {
        await requestNoData("/api/admin/session");
        return true;
      } catch (error) {
        if (error instanceof ApiError && error.code === "UNAUTHORIZED") return false;
        throw error;
      }
    },
    staleTime: Infinity,
  });
}

export function useSignIn() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (password: string) =>
      requestNoData("/api/admin/session", { method: "POST", body: { password } }),
    onSuccess: () => client.setQueryData(keys.session, true),
  });
}

export function useSignOut() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => requestNoData("/api/admin/session", { method: "DELETE" }),
    onSuccess: () => {
      client.setQueryData(keys.session, false);
      // Nothing from the session stays behind for whoever uses the browser next.
      client.removeQueries({ predicate: (query) => query.queryKey[0] !== keys.session[0] });
    },
  });
}

export function useCards() {
  return useQuery({
    queryKey: keys.cards,
    queryFn: () => request(z.array(CardSchema), "/api/admin/cards"),
  });
}

export function useCard(id: number) {
  return useQuery({
    queryKey: keys.card(id),
    queryFn: () => request(CardDetailSchema, `/api/admin/cards/${id}`),
  });
}

export function useUpdateCard() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: UpdateCardRequest & { id: number }) =>
      request(CardDetailSchema, `/api/admin/cards/${id}`, { method: "PUT", body }),
    onSuccess: (card) => {
      client.setQueryData(keys.card(card.id), card);
      void client.invalidateQueries({ queryKey: keys.cards, exact: true });
    },
  });
}

/** Runs migrations and the seeder: every card goes back to the dataset, and missing default settings return. */
export function useSeedCards() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => request(SeedResultSchema, "/api/admin/cards/seed", { method: "POST" }),
    onSuccess: () =>
      Promise.all([
        client.invalidateQueries({ queryKey: keys.cards }),
        client.invalidateQueries({ queryKey: keys.settings }),
      ]),
  });
}

export function useSettings() {
  return useQuery({
    queryKey: keys.settings,
    queryFn: () => request(z.array(SettingSchema), "/api/admin/settings"),
  });
}

export function useOllamaSettings() {
  return useQuery({
    queryKey: keys.ollama,
    queryFn: () => request(OllamaSettingsSchema, "/api/admin/settings/ollama"),
  });
}

export function useDeckSettings() {
  return useQuery({
    queryKey: keys.deck,
    queryFn: () => request(DeckSettingsSchema, "/api/admin/settings/deck"),
  });
}

// The Ollama and deck groups are views over the same rows, so every settings write refreshes them all.
// Waiting for the refetch keeps the mutation pending until the page shows what was saved.
function useSettingsMutation<TArgs, TResult>(fn: (args: TArgs) => Promise<TResult>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => client.invalidateQueries({ queryKey: keys.settings }),
  });
}

const settingPath = (name: string) => `/api/admin/settings/${encodeURIComponent(name)}`;

export const useSaveSetting = () =>
  useSettingsMutation(({ name, ...body }: { name: string; value: unknown; description: string }) =>
    request(SettingSchema, settingPath(name), { method: "PUT", body }),
  );

export const useDeleteSetting = () =>
  useSettingsMutation((name: string) => requestNoData(settingPath(name), { method: "DELETE" }));

export const useUpdateOllamaSettings = () =>
  useSettingsMutation((settings: OllamaSettings) =>
    request(OllamaSettingsSchema, "/api/admin/settings/ollama", { method: "PUT", body: settings }),
  );

export const useUpdateDeckSettings = () =>
  useSettingsMutation((settings: DeckSettings) =>
    request(DeckSettingsSchema, "/api/admin/settings/deck", { method: "PUT", body: settings }),
  );

/** Hook that returns a function to translate API errors. */
export function useErrorMessage() {
  const { t } = useTranslation();

  return useCallback(
    (error: unknown, context?: "signIn"): string => {
      if (error instanceof ApiError) {
        switch (error.code) {
          case "VALIDATION_ERROR":
            return t("errors.VALIDATION_ERROR");
          case "UNAUTHORIZED":
            if (context === "signIn") return t("errors.UNAUTHORIZED_signIn");
            return t("errors.UNAUTHORIZED");
          case "NOT_FOUND":
            return t("errors.NOT_FOUND");
          case "RATE_LIMITED":
            return t("errors.RATE_LIMITED");
          case "INTERNAL_ERROR":
            return t("errors.INTERNAL_ERROR");
          case "UNAVAILABLE":
            return t("errors.UNAVAILABLE");
        }
      }
      return error instanceof Error ? error.message : t("errors.unknown");
    },
    [t],
  );
}
