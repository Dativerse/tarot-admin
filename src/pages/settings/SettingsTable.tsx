import { useState, type SubmitEvent } from "react";
import { useTranslation } from "react-i18next";
import { useDeleteSetting, useErrorMessage, useSaveSetting, useSettings } from "@/api/queries";
import { SettingValueFormSchema, newSettingSchema, type Setting } from "@/api/schemas";
import { Field } from "@/components/Field";
import { useForm } from "@/components/useForm";

/** Every row of system_settings as stored, including keys the typed sections above don't cover. */
export function SettingsTable() {
  const { t } = useTranslation();
  const errorMessage = useErrorMessage();
  const settings = useSettings();
  const remove = useDeleteSetting();
  const [editing, setEditing] = useState<string | null>(null);

  const confirmDelete = (name: string) => {
    if (window.confirm(t("settingsTable.deleteConfirm", { name }))) remove.mutate(name);
  };

  return (
    <section className="panel">
      <h2 className="panel__title">{t("settingsTable.title")}</h2>
      <p className="hint">{t("settingsTable.description")}</p>
      {settings.isPending && <p className="hint">{t("settingsTable.loading")}</p>}
      {settings.isError && <p className="error">{errorMessage(settings.error)}</p>}
      {settings.data?.length === 0 && <p className="hint">{t("settingsTable.empty")}</p>}
      {!!settings.data?.length && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">{t("settingsTable.name")}</th>
                <th scope="col">{t("settingsTable.value")}</th>
                <th scope="col">{t("settingsTable.descriptionColumn")}</th>
                <th scope="col">{t("settingsTable.updated")}</th>
                <th scope="col">
                  <span className="visually-hidden">{t("settingsTable.actions")}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {settings.data.map((setting) =>
                setting.name === editing ? (
                  <EditRow key={setting.name} setting={setting} onDone={() => setEditing(null)} />
                ) : (
                  <tr key={setting.name}>
                    <th scope="row">
                      <code>{setting.name}</code>
                    </th>
                    <td>
                      <code className="table__value" title={setting.value}>
                        {setting.value}
                      </code>
                    </td>
                    <td>{setting.description}</td>
                    <td>
                      <time dateTime={setting.updatedAt}>{formatTime(setting.updatedAt)}</time>
                    </td>
                    <td className="table__actions">
                      <button className="link" onClick={() => setEditing(setting.name)}>
                        {t("settingsTable.edit")}
                      </button>
                      <button
                        className="link link--danger"
                        onClick={() => confirmDelete(setting.name)}
                        disabled={remove.isPending}
                      >
                        {t("settingsTable.delete")}
                      </button>
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      )}
      {remove.isError && <p className="error">{errorMessage(remove.error)}</p>}
      <NewSettingForm existing={settings.data?.map((s) => s.name) ?? []} />
    </section>
  );
}

function EditRow({ setting, onDone }: { setting: Setting; onDone: () => void }) {
  const { t } = useTranslation();
  const errorMessage = useErrorMessage();
  const save = useSaveSetting();
  const form = useForm(SettingValueFormSchema, { value: setting.value, description: setting.description ?? "" });
  const { values, errors, set } = form;

  const submit = (e: SubmitEvent) => {
    e.preventDefault();
    const parsed = form.validate();
    if (parsed) save.mutate({ name: setting.name, ...parsed }, { onSuccess: onDone });
  };

  return (
    <tr className="table__editing">
      <td colSpan={5}>
        <form className="setting-form" onSubmit={submit} onKeyDown={(e) => e.key === "Escape" && onDone()} noValidate>
          <code>{setting.name}</code>
          <div className="form-grid">
            <Field label={t("settingsTable.value")} hint={t("settingsTable.valueHint")} error={errors.value}>
              <textarea
                className="input input--mono"
                rows={2}
                value={values.value}
                onChange={(e) => set("value", e.target.value)}
                aria-invalid={errors.value !== undefined}
                spellCheck={false}
                autoFocus
              />
            </Field>
            <Field label={t("settingsTable.descriptionColumn")}>
              <textarea
                className="input"
                rows={2}
                value={values.description}
                onChange={(e) => set("description", e.target.value)}
              />
            </Field>
          </div>
          <div className="form-actions">
            <button className="button" disabled={save.isPending || !form.dirty}>
              {save.isPending ? t("form.saving") : t("form.save")}
            </button>
            <button type="button" className="button button--ghost" onClick={onDone} disabled={save.isPending}>
              {t("settingsTable.cancel")}
            </button>
            {save.isError && <p className="error">{errorMessage(save.error)}</p>}
          </div>
        </form>
      </td>
    </tr>
  );
}

function NewSettingForm({ existing }: { existing: string[] }) {
  const { t } = useTranslation();
  const errorMessage = useErrorMessage();
  const save = useSaveSetting();
  const form = useForm(newSettingSchema(existing), { name: "", value: "", description: "" });
  const { values, errors, set } = form;

  const submit = (e: SubmitEvent) => {
    e.preventDefault();
    const parsed = form.validate();
    if (parsed) save.mutate(parsed, { onSuccess: form.reset });
  };

  return (
    <form className="setting-form setting-form--new" onSubmit={submit} noValidate>
      <h3 className="setting-form__title">{t("settingsTable.addTitle")}</h3>
      <div className="form-grid">
        <Field label={t("settingsTable.name")} hint={t("settingsTable.nameHint")} error={errors.name}>
          <input
            className="input input--mono"
            value={values.name}
            onChange={(e) => set("name", e.target.value)}
            aria-invalid={errors.name !== undefined}
            spellCheck={false}
          />
        </Field>
        <Field label={t("settingsTable.value")} hint={t("settingsTable.valueHint")} error={errors.value}>
          <input
            className="input input--mono"
            value={values.value}
            onChange={(e) => set("value", e.target.value)}
            aria-invalid={errors.value !== undefined}
            spellCheck={false}
          />
        </Field>
        <Field label={t("settingsTable.descriptionColumn")}>
          <input className="input" value={values.description} onChange={(e) => set("description", e.target.value)} />
        </Field>
      </div>
      <div className="form-actions">
        <button className="button button--ghost" disabled={save.isPending}>
          {save.isPending ? t("settingsTable.adding") : t("settingsTable.add")}
        </button>
        {save.isError && <p className="error">{errorMessage(save.error)}</p>}
      </div>
    </form>
  );
}

const formatTime = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
