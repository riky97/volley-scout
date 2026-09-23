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
import { Checkbox } from '@presentation/components/ui/Checkbox';
import { describedBy, FormField } from '@presentation/components/ui/FormField';
import { Input } from '@presentation/components/ui/Input';
import { Radio } from '@presentation/components/ui/Radio';
import { RadioGroup } from '@presentation/components/ui/RadioGroup';
import { Textarea } from '@presentation/components/ui/Textarea';
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
              <Input
                id="homeTeamName"
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
              <Input
                id="awayTeamName"
                aria-describedby={describedBy('awayTeamName', { error: errors.awayTeamName?.message })}
                aria-invalid={errors.awayTeamName !== undefined}
                {...register('awayTeamName')}
              />
            </FormField>

            <FormField id="date" label={NEW_MATCH.date} required error={errors.date?.message}>
              <Input
                id="date"
                type="date"
                aria-describedby={describedBy('date', { error: errors.date?.message })}
                aria-invalid={errors.date !== undefined}
                {...register('date')}
              />
            </FormField>

            <FormField id="competition" label={NEW_MATCH.competition}>
              <Input id="competition" {...register('competition')} />
            </FormField>

            <FormField id="venue" label={NEW_MATCH.venue}>
              <Input id="venue" {...register('venue')} />
            </FormField>
          </div>

          <RadioGroup className="mt-[var(--sp-4)]" legend={NEW_MATCH.ourSide}>
            <Radio value="home" {...register('ourSide')}>
              {NEW_MATCH.sideHome}
            </Radio>
            <Radio value="away" {...register('ourSide')}>
              {NEW_MATCH.sideAway}
            </Radio>
          </RadioGroup>

          <FormField id="notes" label={NEW_MATCH.notes} className="mt-[var(--sp-4)]">
            <Textarea id="notes" rows={2} {...register('notes')} />
          </FormField>
        </Card>

        <Card title={NEW_MATCH.format}>
          <RadioGroup legend={NEW_MATCH.format} hideLegend>
            <Radio value="5" {...register('bestOf')}>
              {NEW_MATCH.bestOf5}
            </Radio>
            <Radio value="3" {...register('bestOf')}>
              {NEW_MATCH.bestOf3}
            </Radio>
          </RadioGroup>

          <div className="mt-[var(--sp-4)] grid grid-cols-1 gap-[var(--sp-4)] sm:grid-cols-2">
            <FormField
              id="pointsToWinSet"
              label={NEW_MATCH.pointsPerSet}
              error={errors.pointsToWinSet?.message}
            >
              <Input
                id="pointsToWinSet"
                type="number"
                min={15}
                max={30}
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
              <Input
                id="pointsToWinTieBreak"
                type="number"
                min={15}
                max={30}
                aria-describedby={describedBy('pointsToWinTieBreak', {
                  error: errors.pointsToWinTieBreak?.message,
                })}
                aria-invalid={errors.pointsToWinTieBreak !== undefined}
                {...register('pointsToWinTieBreak', { valueAsNumber: true })}
              />
            </FormField>
          </div>

          <div className="mt-[var(--sp-4)] flex flex-col">
            <Checkbox {...register('winByTwo')}>{NEW_MATCH.winByTwo}</Checkbox>
            <Checkbox {...register('trackSetSkill')}>{SETTINGS.trackSets}</Checkbox>
          </div>
        </Card>

        <Card title={NEW_MATCH.startTitle}>
          <div className="grid grid-cols-1 gap-[var(--sp-4)] sm:grid-cols-2">
            <RadioGroup legend={NEW_MATCH.firstServe}>
              <Radio value="us" {...register('startingServer')}>
                {NEW_MATCH.serveUs}
              </Radio>
              <Radio value="them" {...register('startingServer')}>
                {NEW_MATCH.serveThem}
              </Radio>
            </RadioGroup>

            <RadioGroup legend={NEW_MATCH.ourCourt}>
              <Radio value="left" {...register('startingSide')}>
                {NEW_MATCH.left}
              </Radio>
              <Radio value="right" {...register('startingSide')}>
                {NEW_MATCH.right}
              </Radio>
            </RadioGroup>
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
