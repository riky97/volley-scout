import { useId } from 'react';
import type { AppSettings, BestOf, ThemeMode } from '@domain/index';
import { useSettingsStore } from '@application/stores/settingsStore';
import { showToast } from '@presentation/components/ui/Toast';
import { NEW_MATCH, SETTINGS, TOASTS } from '@shared/copy';
// Named import: the bundler keeps only this field, not the dependency list.
import { version as APP_VERSION } from '../../../package.json';
import { Input } from '@presentation/components/ui/Input';
import { Checkbox } from '@presentation/components/ui/Checkbox';
import { Label } from '@presentation/components/ui/Label';
import { Radio } from '@presentation/components/ui/Radio';
import { RadioGroup } from '@presentation/components/ui/RadioGroup';

/**
 * Short reference for the live-screen shortcuts, taken verbatim from
 * docs/03-ux-flows.md §5.1-5.3 ("Descrizione italiana" column) — the normative Italian copy.
 */
const SHORTCUT_ROWS: ReadonlyArray<{ readonly key: string; readonly description: string }> = [
  { key: '0–9', description: 'Digita il numero di maglia per selezionare il giocatore.' },
  { key: 'B / R / A / M / D', description: 'Fondamentale: Battuta / Ricezione / Attacco / Muro / Difesa.' },
  { key: 'P / + / N / - / E', description: 'Esito: Punto / Positivo / Neutro / Negativo / Errore.' },
  { key: 'Spazio', description: 'Punto nostro.' },
  { key: 'X', description: 'Punto avversario.' },
  { key: 'Q', description: 'Errore nostro.' },
  { key: 'Ctrl+Z / Ctrl+Maiusc+Z', description: "Annulla / ripristina l'ultima azione registrata." },
  { key: 'T / Maiusc+T', description: 'Time-out nostro / avversario.' },
  { key: 'C', description: 'Apri la finestra del cambio giocatore.' },
  { key: 'S', description: 'Mostra o nasconde le statistiche live.' },
  { key: 'Ctrl+Invio', description: 'Termina il set in corso.' },
  { key: 'Esc', description: 'Annulla la selezione in corso o chiude la finestra.' },
  { key: '?', description: "Mostra l'elenco delle scorciatoie." },
] as const;

async function saveSetting(
  update: (patch: Partial<AppSettings>) => Promise<void>,
  patch: Partial<AppSettings>,
): Promise<void> {
  try {
    await update(patch);
    showToast(TOASTS.settingsSaved, 'success');
  } catch {
    showToast(TOASTS.settingsSaveFailed, 'error');
  }
}

export function SettingsPage(): React.JSX.Element {
  const teamNameId = useId();
  const settings = useSettingsStore((state) => state.settings);
  const dataLocation = useSettingsStore((state) => state.dataLocation);
  const update = useSettingsStore((state) => state.update);

  return (
    <div className="mx-auto flex max-w-[760px] flex-col gap-[var(--sp-6)] p-[var(--sp-5)]">
      <header>
        <h1 className="text-[var(--fs-h1)] font-semibold text-[var(--text)]">{SETTINGS.title}</h1>
      </header>

      <section className="flex flex-col gap-[var(--sp-3)]">
        <h2 className="text-[var(--fs-h3)] font-semibold text-[var(--text)]">{SETTINGS.appearance}</h2>
        <RadioGroup legend={SETTINGS.theme}>
          {(
            [
              ['light', SETTINGS.themeLight],
              ['dark', SETTINGS.themeDark],
              ['system', SETTINGS.themeSystem],
            ] as ReadonlyArray<[ThemeMode, string]>
          ).map(([value, label]) => (
            <Radio
              key={value}
              name="theme"
              checked={settings.theme === value}
              onChange={() => {
                void saveSetting(update, { theme: value });
              }}
            >
              {label}
            </Radio>
          ))}
        </RadioGroup>
      </section>

      <section className="flex flex-col gap-[var(--sp-3)]">
        <h2 className="text-[var(--fs-h3)] font-semibold text-[var(--text)]">{SETTINGS.defaults}</h2>

        <div className="flex flex-col gap-[var(--sp-1)]">
          <Label htmlFor={teamNameId}>{SETTINGS.ourTeamName}</Label>
          <Input
            id={teamNameId}
            defaultValue={settings.defaultTeamName}
            onBlur={(event) => {
              void saveSetting(update, { defaultTeamName: event.target.value });
            }}
          />
        </div>

        <RadioGroup legend={SETTINGS.matchFormat}>
          {(
            [
              [5, NEW_MATCH.bestOf5],
              [3, NEW_MATCH.bestOf3],
            ] as ReadonlyArray<[BestOf, string]>
          ).map(([value, label]) => (
            <Radio
              key={value}
              name="bestOf"
              checked={settings.defaultMatchSettings.bestOf === value}
              onChange={() => {
                void saveSetting(update, {
                  defaultMatchSettings: { ...settings.defaultMatchSettings, bestOf: value },
                });
              }}
            >
              {label}
            </Radio>
          ))}
        </RadioGroup>
      </section>

      <section className="flex flex-col gap-[var(--sp-3)]">
        <h2 className="text-[var(--fs-h3)] font-semibold text-[var(--text)]">
          {SETTINGS.dataCollection}
        </h2>

        <Checkbox
          checked={settings.confirmDestructiveActions}
          onChange={(event) => {
            void saveSetting(update, { confirmDestructiveActions: event.target.checked });
          }}
        >
          {SETTINGS.confirmEndMatch}
        </Checkbox>

        <Checkbox
          checked={settings.autoConfirmActions}
          onChange={(event) => {
            void saveSetting(update, { autoConfirmActions: event.target.checked });
          }}
        >
          {SETTINGS.confirmUndo}
        </Checkbox>

        <Checkbox
          checked={settings.keyboardShortcutsEnabled}
          onChange={(event) => {
            void saveSetting(update, { keyboardShortcutsEnabled: event.target.checked });
          }}
        >
          {SETTINGS.shortcutsEnabled}
        </Checkbox>

        <Checkbox
          checked={settings.showSoftLimitWarnings}
          onChange={(event) => {
            void saveSetting(update, { showSoftLimitWarnings: event.target.checked });
          }}
        >
          {SETTINGS.softLimitWarnings}
        </Checkbox>
      </section>

      <section className="flex flex-col gap-[var(--sp-3)]">
        <h2 className="text-[var(--fs-h3)] font-semibold text-[var(--text)]">{SETTINGS.data}</h2>
        <div>
          <span className="text-[var(--fs-small)] font-medium text-[var(--text)]">
            {SETTINGS.dataFolder}
          </span>
          <p className="text-[var(--fs-body)] text-[var(--text-muted)]">{dataLocation}</p>
        </div>
        <div>
          <span className="text-[var(--fs-small)] font-medium text-[var(--text)]">
            {SETTINGS.version}
          </span>
          <p className="text-[var(--fs-body)] text-[var(--text-muted)]">{APP_VERSION}</p>
        </div>
      </section>

      <section className="flex flex-col gap-[var(--sp-3)]">
        <h2 className="text-[var(--fs-h3)] font-semibold text-[var(--text)]">{SETTINGS.shortcuts}</h2>
        <table className="w-full border-collapse text-[var(--fs-small)] text-[var(--text)]">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--surface-2)] text-left">
              <th className="p-[var(--sp-2)]">Tasto</th>
              <th className="p-[var(--sp-2)]">Azione</th>
            </tr>
          </thead>
          <tbody>
            {SHORTCUT_ROWS.map((row) => (
              <tr key={row.key} className="border-b border-[var(--border)]">
                <td className="p-[var(--sp-2)] font-mono">{row.key}</td>
                <td className="p-[var(--sp-2)]">{row.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
