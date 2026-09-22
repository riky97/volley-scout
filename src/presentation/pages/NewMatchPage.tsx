import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { BestOf, MatchSettings } from '@domain/index';
import { createMatch } from '@domain/index';
import { useMatchStore } from '@application/stores/matchStore';
import { useSettingsStore } from '@application/stores/settingsStore';
import { newId, nowIso, todayIsoDate } from '@application/clock';
import { Button } from '@presentation/components/ui/Button';
import { Card } from '@presentation/components/ui/Card';
import { Dialog } from '@presentation/components/ui/Dialog';
import { describedBy, FormField, TEXT_INPUT_CLASSES } from '@presentation/components/setup/FormField';
import { ROUTES } from '@presentation/routes';
import { COMMON_BUTTONS, DIALOGS, NEW_MATCH, SETTINGS, STEPS, VALIDATION } from '@shared/copy';

const OUR_SIDE_VALUES = ['home', 'away'] as const;

/** Radio inputs compare by string, so the match format travels through the form as one. */
function bestOfToField(bestOf: BestOf): '3' | '5' {
  return bestOf === 3 ? '3' : '5';
}

const formSchema = z
  .object({
    homeTeamName: z.string().trim().min(1, VALIDATION.teamNameRequired),
    awayTeamName: z.string().trim().min(1, VALIDATION.teamNameRequired),
    ourSide: z.enum(OUR_SIDE_VALUES),
    date: z.string().min(1, VALIDATION.dateRequired),
    venue: z.string(),
    competition: z.string(),
    notes: z.string(),
    bestOf: z.enum(['3', '5']),
    pointsToWinSet: z.number().int().min(15, VALIDATION.pointsRange).max(30, VALIDATION.pointsRange),
    pointsToWinTieBreak: z
      .number()
      .int()
      .min(15, VALIDATION.pointsRange)
      .max(30, VALIDATION.pointsRange),
    startingServer: z.enum(['us', 'them']),
    startingSide: z.enum(['left', 'right']),
    winByTwo: z.boolean(),
    trackSetSkill: z.boolean(),
  })
  .refine(
    (value) => value.homeTeamName.trim().toLowerCase() !== value.awayTeamName.trim().toLowerCase(),
    { message: VALIDATION.teamNamesEqual, path: ['awayTeamName'] },
  );

type FormValues = z.infer<typeof formSchema>;

function isUnfinishedMatch(match: { status: string } | null): boolean {
  return match !== null && (match.status === 'setup' || match.status === 'live');
}

export function NewMatchPage(): React.JSX.Element {
  const navigate = useNavigate();
  const match = useMatchStore((state) => state.match);
  const setMatch = useMatchStore((state) => state.setMatch);
  const settings = useSettingsStore((state) => state.settings);
  const isSettingsLoaded = useSettingsStore((state) => state.isLoaded);
  const [pendingValues, setPendingValues] = useState<FormValues | null>(null);

  const defaultValues: FormValues = {
    homeTeamName: settings.defaultTeamName,
    awayTeamName: '',
    ourSide: 'home',
    date: todayIsoDate(),
    venue: '',
    competition: '',
    notes: '',
    bestOf: bestOfToField(settings.defaultMatchSettings.bestOf),
    pointsToWinSet: settings.defaultMatchSettings.pointsToWinSet,
    pointsToWinTieBreak: settings.defaultMatchSettings.pointsToWinTieBreak,
    startingServer: settings.defaultMatchSettings.startingServer,
    startingSide: settings.defaultMatchSettings.startingSide,
    winByTwo: settings.defaultMatchSettings.winByTwo,
    trackSetSkill: settings.defaultMatchSettings.trackSetSkill,
  };

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  // Settings load asynchronously; once they arrive, refresh the still-untouched defaults.
  useEffect(() => {
    if (isSettingsLoaded && !isDirty) {
      reset({
        homeTeamName: settings.defaultTeamName,
        awayTeamName: '',
        ourSide: 'home',
        date: todayIsoDate(),
        venue: '',
        competition: '',
        notes: '',
        bestOf: bestOfToField(settings.defaultMatchSettings.bestOf),
        pointsToWinSet: settings.defaultMatchSettings.pointsToWinSet,
        pointsToWinTieBreak: settings.defaultMatchSettings.pointsToWinTieBreak,
        startingServer: settings.defaultMatchSettings.startingServer,
        startingSide: settings.defaultMatchSettings.startingSide,
        winByTwo: settings.defaultMatchSettings.winByTwo,
        trackSetSkill: settings.defaultMatchSettings.trackSetSkill,
      });
    }
    // Only re-run when the loaded settings identity changes, not on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSettingsLoaded, settings]);

  function createAndGo(values: FormValues): void {
    const ourTeamName = values.ourSide === 'home' ? values.homeTeamName : values.awayTeamName;
    const opponentTeamName = values.ourSide === 'home' ? values.awayTeamName : values.homeTeamName;
    const matchSettings: MatchSettings = {
      ...settings.defaultMatchSettings,
      bestOf: values.bestOf === '3' ? 3 : 5,
      pointsToWinSet: values.pointsToWinSet,
      pointsToWinTieBreak: values.pointsToWinTieBreak,
      startingServer: values.startingServer,
      startingSide: values.startingSide,
      winByTwo: values.winByTwo,
      trackSetSkill: values.trackSetSkill,
    };
    const newMatch = createMatch({
      id: newId(),
      ourTeamId: newId(),
      opponentTeamId: newId(),
      ourTeamName,
      opponentTeamName,
      date: values.date,
      venue: values.venue,
      competition: values.competition,
      notes: values.notes,
      settings: matchSettings,
      roster: [],
      timestamp: nowIso(),
    });
    setMatch(newMatch);
    void navigate(ROUTES.roster);
  }

  function onSubmit(values: FormValues): void {
    if (isUnfinishedMatch(match)) {
      setPendingValues(values);
      return;
    }
    createAndGo(values);
  }

  return (
    <div className="mx-auto flex max-w-[880px] flex-col gap-[var(--sp-5)] p-[var(--sp-5)]">
      <header className="flex items-baseline justify-between">
        <h1 className="text-[var(--fs-h1)] font-semibold text-[var(--text)]">{NEW_MATCH.title}</h1>
        <span className="text-[var(--fs-small)] text-[var(--text-muted)]">{STEPS.label(1)}</span>
      </header>

      <form
        onSubmit={(event) => {
          void handleSubmit(onSubmit)(event);
        }}
        noValidate
        className="flex flex-col gap-[var(--sp-5)]"
      >
        <Card title={NEW_MATCH.matchDataTitle}>
          <div className="grid grid-cols-1 gap-[var(--sp-4)] sm:grid-cols-2">
            <FormField
              id="homeTeamName"
              label={NEW_MATCH.homeTeam}
              required
              error={errors.homeTeamName?.message}
            >
              <input
                id="homeTeamName"
                className={TEXT_INPUT_CLASSES}
                aria-describedby={describedBy('homeTeamName', { error: errors.homeTeamName?.message })}
                aria-invalid={errors.homeTeamName !== undefined}
                {...register('homeTeamName')}
              />
            </FormField>

            <FormField
              id="awayTeamName"
              label={NEW_MATCH.awayTeam}
              required
              error={errors.awayTeamName?.message}
            >
              <input
                id="awayTeamName"
                className={TEXT_INPUT_CLASSES}
                aria-describedby={describedBy('awayTeamName', { error: errors.awayTeamName?.message })}
                aria-invalid={errors.awayTeamName !== undefined}
                {...register('awayTeamName')}
              />
            </FormField>

            <FormField id="date" label={NEW_MATCH.date} required error={errors.date?.message}>
              <input
                id="date"
                type="date"
                className={TEXT_INPUT_CLASSES}
                aria-describedby={describedBy('date', { error: errors.date?.message })}
                aria-invalid={errors.date !== undefined}
                {...register('date')}
              />
            </FormField>

            <FormField id="competition" label={NEW_MATCH.competition}>
              <input id="competition" className={TEXT_INPUT_CLASSES} {...register('competition')} />
            </FormField>

            <FormField id="venue" label={NEW_MATCH.venue}>
              <input id="venue" className={TEXT_INPUT_CLASSES} {...register('venue')} />
            </FormField>
          </div>

          <fieldset className="mt-[var(--sp-4)] flex flex-col gap-[var(--sp-2)]">
            <legend className="text-[var(--fs-small)] font-medium text-[var(--text)]">
              {NEW_MATCH.ourSide}
            </legend>
            <div className="flex gap-[var(--sp-5)]">
              <label className="flex items-center gap-[var(--sp-2)]">
                <input type="radio" value="home" {...register('ourSide')} />
                {NEW_MATCH.sideHome}
              </label>
              <label className="flex items-center gap-[var(--sp-2)]">
                <input type="radio" value="away" {...register('ourSide')} />
                {NEW_MATCH.sideAway}
              </label>
            </div>
          </fieldset>

          <FormField id="notes" label={NEW_MATCH.notes} className="mt-[var(--sp-4)]">
            <textarea id="notes" rows={2} className={TEXT_INPUT_CLASSES} {...register('notes')} />
          </FormField>
        </Card>

        <Card title={NEW_MATCH.format}>
          <fieldset className="flex flex-col gap-[var(--sp-2)]">
            <legend className="sr-only">{NEW_MATCH.format}</legend>
            <div className="flex gap-[var(--sp-5)]">
              <label className="flex items-center gap-[var(--sp-2)]">
                <input type="radio" value="5" {...register('bestOf')} />
                {NEW_MATCH.bestOf5}
              </label>
              <label className="flex items-center gap-[var(--sp-2)]">
                <input type="radio" value="3" {...register('bestOf')} />
                {NEW_MATCH.bestOf3}
              </label>
            </div>
          </fieldset>

          <div className="mt-[var(--sp-4)] grid grid-cols-1 gap-[var(--sp-4)] sm:grid-cols-2">
            <FormField
              id="pointsToWinSet"
              label={NEW_MATCH.pointsPerSet}
              error={errors.pointsToWinSet?.message}
            >
              <input
                id="pointsToWinSet"
                type="number"
                min={15}
                max={30}
                className={TEXT_INPUT_CLASSES}
                aria-describedby={describedBy('pointsToWinSet', {
                  error: errors.pointsToWinSet?.message,
                })}
                aria-invalid={errors.pointsToWinSet !== undefined}
                {...register('pointsToWinSet', { valueAsNumber: true })}
              />
            </FormField>

            <FormField
              id="pointsToWinTieBreak"
              label={NEW_MATCH.tieBreakPoints}
              error={errors.pointsToWinTieBreak?.message}
            >
              <input
                id="pointsToWinTieBreak"
                type="number"
                min={15}
                max={30}
                className={TEXT_INPUT_CLASSES}
                aria-describedby={describedBy('pointsToWinTieBreak', {
                  error: errors.pointsToWinTieBreak?.message,
                })}
                aria-invalid={errors.pointsToWinTieBreak !== undefined}
                {...register('pointsToWinTieBreak', { valueAsNumber: true })}
              />
            </FormField>
          </div>

          <div className="mt-[var(--sp-4)] flex flex-col gap-[var(--sp-2)]">
            <label className="flex items-center gap-[var(--sp-2)]">
              <input type="checkbox" {...register('winByTwo')} />
              {NEW_MATCH.winByTwo}
            </label>
            <label className="flex items-center gap-[var(--sp-2)]">
              <input type="checkbox" {...register('trackSetSkill')} />
              {SETTINGS.trackSets}
            </label>
          </div>
        </Card>

        <Card title={NEW_MATCH.startTitle}>
          <div className="grid grid-cols-1 gap-[var(--sp-4)] sm:grid-cols-2">
            <fieldset className="flex flex-col gap-[var(--sp-2)]">
              <legend className="text-[var(--fs-small)] font-medium text-[var(--text)]">
                {NEW_MATCH.firstServe}
              </legend>
              <div className="flex gap-[var(--sp-5)]">
                <label className="flex items-center gap-[var(--sp-2)]">
                  <input type="radio" value="us" {...register('startingServer')} />
                  {NEW_MATCH.serveUs}
                </label>
                <label className="flex items-center gap-[var(--sp-2)]">
                  <input type="radio" value="them" {...register('startingServer')} />
                  {NEW_MATCH.serveThem}
                </label>
              </div>
            </fieldset>

            <fieldset className="flex flex-col gap-[var(--sp-2)]">
              <legend className="text-[var(--fs-small)] font-medium text-[var(--text)]">
                {NEW_MATCH.ourCourt}
              </legend>
              <div className="flex gap-[var(--sp-5)]">
                <label className="flex items-center gap-[var(--sp-2)]">
                  <input type="radio" value="left" {...register('startingSide')} />
                  {NEW_MATCH.left}
                </label>
                <label className="flex items-center gap-[var(--sp-2)]">
                  <input type="radio" value="right" {...register('startingSide')} />
                  {NEW_MATCH.right}
                </label>
              </div>
            </fieldset>
          </div>
        </Card>

        <div className="flex justify-between">
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              void navigate(ROUTES.home);
            }}
          >
            {COMMON_BUTTONS.cancel}
          </Button>
          <Button type="submit" variant="primary">
            {COMMON_BUTTONS.next}
          </Button>
        </div>
      </form>

      <Dialog
        open={pendingValues !== null}
        title={DIALOGS.resumeConflict.title}
        description={DIALOGS.resumeConflict.body}
        cancelLabel={DIALOGS.resumeConflict.cancel}
        confirmLabel={DIALOGS.resumeConflict.confirm}
        onCancel={() => {
          setPendingValues(null);
        }}
        onConfirm={() => {
          if (pendingValues !== null) createAndGo(pendingValues);
          setPendingValues(null);
        }}
      />
    </div>
  );
}
