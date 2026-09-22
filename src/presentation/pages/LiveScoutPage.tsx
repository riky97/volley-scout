import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { EventOutcome, Id, Skill, TeamSide } from '@domain/index';
import { COURT_POSITIONS, isAllowedOutcome } from '@domain/index';
import { useMatchStore } from '@application/stores/matchStore';
import { useSettingsStore } from '@application/stores/settingsStore';
import { ActionPad } from '@presentation/components/live/ActionPad';
import { CourtGrid } from '@presentation/components/live/CourtGrid';
import { EventLog } from '@presentation/components/live/EventLog';
import { LiveStatsPanel } from '@presentation/components/live/LiveStatsPanel';
import { SubstitutionDialog } from '@presentation/components/live/SubstitutionDialog';
import { Scoreboard } from '@presentation/components/live/Scoreboard';
import { describeEvent } from '@presentation/components/live/describeEvent';
import { useLiveShortcuts } from '@presentation/components/live/useLiveShortcuts';
import { Button } from '@presentation/components/ui/Button';
import { Dialog } from '@presentation/components/ui/Dialog';
import { EmptyState } from '@presentation/components/ui/EmptyState';
import { showToast } from '@presentation/components/ui/Toast';
import { ROUTES } from '@presentation/routes';
import { COMMON_BUTTONS, DIALOGS, HOME, LIVE, TOASTS, messageForError } from '@shared/copy';
import styles from './LiveScoutPage.module.scss';

const NUMBER_BUFFER_DELAY_MS = 500;

export function LiveScoutPage(): React.JSX.Element {
  const navigate = useNavigate();
  const match = useMatchStore((state) => state.match);
  const snapshot = useMatchStore((state) => state.snapshot);
  const settings = useSettingsStore((state) => state.settings);

  const resumeLastMatch = useMatchStore((state) => state.resumeLastMatch);

  // Landing here with an empty store means the window was reloaded (or the app crashed) while a
  // match was open: pull the last unfinished match back in instead of showing a dead screen.
  const hasMatch = match !== null;
  useEffect(() => {
    if (!hasMatch) void resumeLastMatch();
  }, [hasMatch, resumeLastMatch]);


  const [selectedPlayerId, setSelectedPlayerId] = useState<Id | null>(null);
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [numberBuffer, setNumberBuffer] = useState('');
  const [statsOpen, setStatsOpen] = useState(false);
  const [substitutionOpen, setSubstitutionOpen] = useState(false);
  const [timeoutOpen, setTimeoutOpen] = useState(false);
  const [endSetRequested, setEndSetRequested] = useState(false);
  /** Score at which the operator dismissed the automatic set-end dialog. */
  const [endSetDismissedAt, setEndSetDismissedAt] = useState<string | null>(null);
  /** Set to true when the operator dismisses the end-of-set prompt to stay on this screen. */
  const [nextStepDismissed, setNextStepDismissed] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const bufferTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // The buffer is mirrored in a ref so a keystroke can commit it and act on the result in the
  // same event, without waiting for a re-render.
  const bufferRef = useRef('');


  const resetSelection = useCallback(() => {
    setSelectedPlayerId(null);
    setSelectedSkill(null);
    bufferRef.current = '';
    setNumberBuffer('');
  }, []);

  const scoreKey =
    snapshot === null ? '' : `${String(snapshot.score.us)}-${String(snapshot.score.them)}`;

  // The set-end dialog opens by itself, but the set only closes when the operator confirms.
  // Dismissing it is remembered for that exact score, so it reappears on the next rally.
  const endSetOpen =
    endSetRequested ||
    (snapshot?.pendingSetWinner != null && endSetDismissedAt !== scoreKey);

  const announcement = snapshot === null ? '' : `${String(snapshot.score.us)} a ${String(snapshot.score.them)}`;

  // Subscribing keeps the toast out of the render path: a rejected action is an external event.
  useEffect(
    () =>
      useMatchStore.subscribe((state, previous) => {
        if (state.lastErrorCode !== null && state.lastErrorCode !== previous.lastErrorCode) {
          showToast(messageForError(state.lastErrorCode), 'error');
          state.clearError();
        }
      }),
    [],
  );

  const setBuffer = useCallback((value: string) => {
    bufferRef.current = value;
    setNumberBuffer(value);
  }, []);

  const commitNumberBuffer = useCallback(() => {
    if (bufferTimer.current !== null) {
      clearTimeout(bufferTimer.current);
      bufferTimer.current = null;
    }
    const buffer = bufferRef.current;
    setBuffer('');
    if (buffer === '' || match === null) return;
    const shirt = Number.parseInt(buffer, 10);
    const player = match.roster.find((candidate) => candidate.shirtNumber === shirt);
    if (player !== undefined) setSelectedPlayerId(player.id);
  }, [match, setBuffer]);

  const pushDigit = useCallback(
    (digit: string) => {
      const previous = bufferRef.current;
      setBuffer(previous.length >= 2 ? digit : previous + digit);
      if (bufferTimer.current !== null) clearTimeout(bufferTimer.current);
      bufferTimer.current = setTimeout(commitNumberBuffer, NUMBER_BUFFER_DELAY_MS);
    },
    [commitNumberBuffer, setBuffer],
  );

  const recordRally = useMatchStore((state) => state.recordRally);
  const recordOurPoint = useMatchStore((state) => state.recordOurPoint);
  const recordOpponentPoint = useMatchStore((state) => state.recordOpponentPoint);
  const recordTimeout = useMatchStore((state) => state.recordTimeout);
  const recordSubstitution = useMatchStore((state) => state.recordSubstitution);
  const undo = useMatchStore((state) => state.undo);
  const redo = useMatchStore((state) => state.redo);
  const endCurrentSet = useMatchStore((state) => state.endCurrentSet);
  const deleteEvent = useMatchStore((state) => state.deleteEvent);

  const selectOutcome = useCallback(
    (outcome: EventOutcome) => {
      if (selectedPlayerId === null || selectedSkill === null) return;
      if (!isAllowedOutcome(selectedSkill, outcome)) return;
      recordRally({ playerId: selectedPlayerId, skill: selectedSkill, outcome });
      resetSelection();
    },
    [selectedPlayerId, selectedSkill, recordRally, resetSelection],
  );

  /** Express point: attributed when a player and skill are already chosen, generic otherwise. */
  const expressOurPoint = useCallback(() => {
    if (selectedPlayerId !== null && selectedSkill !== null) {
      selectOutcome('point');
      return;
    }
    recordOurPoint();
    resetSelection();
  }, [selectedPlayerId, selectedSkill, selectOutcome, recordOurPoint, resetSelection]);

  const expressOurError = useCallback(() => {
    if (selectedPlayerId !== null && selectedSkill !== null) {
      selectOutcome('error');
      return;
    }
    recordOpponentPoint();
    resetSelection();
  }, [selectedPlayerId, selectedSkill, selectOutcome, recordOpponentPoint, resetSelection]);

  const liveSet = snapshot?.currentSet ?? null;
  const isLive = liveSet !== null && liveSet.status === 'live';
  // A closed set leaves the operator on this screen: offer the next step instead of a dead pad.
  const setFinished = liveSet !== null && liveSet.status === 'finished';
  const matchWon = snapshot?.matchWinner != null;
  const showMatchEnd = setFinished && matchWon && !nextStepDismissed;
  const showNextSetPrompt = setFinished && !matchWon && !nextStepDismissed;

  useLiveShortcuts({
    enabled: settings.keyboardShortcutsEnabled && isLive && !endSetOpen && !setFinished,
    hasNumberBuffer: numberBuffer.length > 0,
    trackSetSkill: match?.settings.trackSetSkill ?? false,
    onDigit: pushDigit,
    onCommitNumber: commitNumberBuffer,
    onBackspace: () => {
      const buffer = bufferRef.current;
      if (buffer.length === 0) {
        setSelectedPlayerId(null);
        return;
      }
      setBuffer(buffer.slice(0, -1));
    },
    onCourtPosition: (positionIndex) => {
      const position = COURT_POSITIONS[positionIndex];
      const spot = snapshot?.court.find((entry) => entry.position === position);
      if (spot !== undefined) setSelectedPlayerId(spot.playerId);
    },
    onSkill: (skill) => {
      setSelectedSkill(skill);
    },
    onOutcome: selectOutcome,
    onOurPoint: expressOurPoint,
    onOpponentPoint: () => {
      recordOpponentPoint();
      resetSelection();
    },
    onOurError: expressOurError,
    onUndo: undo,
    onRedo: redo,
    onTimeout: (team) => {
      recordTimeout(team);
    },
    onSubstitution: () => {
      setSubstitutionOpen(true);
    },
    onToggleStats: () => {
      setStatsOpen((open) => !open);
    },
    onEndSet: () => {
      setEndSetRequested(true);
    },
    onEscape: () => {
      if (selectedSkill !== null) setSelectedSkill(null);
      else resetSelection();
    },
    onHelp: () => {
      setShortcutsOpen(true);
    },
  });

  if (match === null || snapshot === null) {
    return (
      <div className={styles.placeholder}>
        <EmptyState
          title={HOME.newMatchCard?.title ?? LIVE.title}
          description={LIVE.restoring}
          action={
            <Button
              variant="primary"
              onClick={() => {
                void navigate(ROUTES.home);
              }}
            >
              {COMMON_BUTTONS.backToHome}
            </Button>
          }
        />
      </div>
    );
  }

  if (liveSet === null) {
    return (
      <div className={styles.placeholder}>
        <EmptyState
          title={LIVE.title}
          description={LIVE.padHint}
          action={
            <Button
              variant="primary"
              onClick={() => {
                void navigate(ROUTES.lineup);
              }}
            >
              {COMMON_BUTTONS.next}
            </Button>
          }
        />
      </div>
    );
  }

  const onCourtIds = snapshot.court.map((entry) => entry.playerId);
  const lastEventLabel =
    snapshot.lastEvent === null
      ? LIVE.nothingToUndo
      : describeEvent(snapshot.lastEvent, match.roster).primary;

  return (
    <div className={styles.layout}>
      <div className={styles.scoreboardArea}>
        <Scoreboard match={match} snapshot={snapshot} />
      </div>

      <div className={styles.courtArea}>
        <CourtGrid
          court={snapshot.court}
          roster={match.roster}
          rotationOffset={liveSet.rotationOffset}
          serverId={snapshot.currentServerId}
          selectedPlayerId={selectedPlayerId}
          onSelectPlayer={(playerId) => {
            setSelectedPlayerId(playerId);
          }}
        />
        <dl className={styles.counters}>
          <div>
            <dt>{LIVE.timeout}</dt>
            <dd>{LIVE.timeoutsCount(liveSet.timeoutsUsed.us, liveSet.timeoutsUsed.them)}</dd>
          </div>
          <div>
            <dt>{LIVE.substitution}</dt>
            <dd>{LIVE.substitutionsCount(liveSet.substitutionsUsed)}</dd>
          </div>
        </dl>
        <div className={styles.courtActions}>
          <Button
            fullWidth
            onClick={() => {
              setTimeoutOpen(true);
            }}
          >
            {LIVE.timeout}
          </Button>
          <Button
            fullWidth
            onClick={() => {
              setSubstitutionOpen(true);
            }}
          >
            {LIVE.substitution}
          </Button>
          <Button
            fullWidth
            onClick={() => {
              setStatsOpen((open) => !open);
            }}
          >
            {LIVE.stats}
          </Button>
        </div>
      </div>

      <div className={styles.padArea}>
        <ActionPad
          players={match.roster.filter((player) => player.isAvailable)}
          onCourtIds={onCourtIds}
          selectedPlayerId={selectedPlayerId}
          selectedSkill={selectedSkill}
          numberBuffer={numberBuffer}
          trackSetSkill={match.settings.trackSetSkill}
          onSelectPlayer={(playerId) => {
            setSelectedPlayerId(playerId);
            setSelectedSkill(null);
          }}
          onSelectSkill={(skill) => {
            setSelectedSkill(skill);
          }}
          onSelectOutcome={selectOutcome}
          onCancel={resetSelection}
        />
      </div>

      <div className={styles.eventsArea}>
        {statsOpen ? (
          <LiveStatsPanel match={match} initialSetIndex={liveSet.index} />
        ) : (
          <EventLog
            events={match.events}
            roster={match.roster}
            limit={12}
            onDelete={(eventId) => {
              deleteEvent(eventId);
              showToast(TOASTS.eventUndone, 'info');
            }}
          />
        )}
      </div>

      <div className={styles.actionBar}>
        <Button size="live" disabled={!snapshot.canUndo} onClick={undo}>
          ↶ {LIVE.undo}
          <span className="sr-only"> — {lastEventLabel}</span>
        </Button>
        <Button size="live" variant="primary" onClick={expressOurPoint}>
          ▲ {LIVE.expressOurPoint}
        </Button>
        <Button
          size="live"
          onClick={() => {
            recordOpponentPoint();
            resetSelection();
          }}
        >
          ▼ {LIVE.expressTheirPoint}
        </Button>
        <Button size="live" onClick={expressOurError}>
          ✖ {LIVE.expressOurError}
        </Button>
        {setFinished ? (
          <Button
            size="live"
            variant="primary"
            onClick={() => {
              void navigate(matchWon ? ROUTES.summary : ROUTES.lineup);
            }}
          >
            {matchWon ? DIALOGS.matchEnd.goToSummary : DIALOGS.setEnd.startNextSet(liveSet.index + 2)}
          </Button>
        ) : (
          <Button
            size="live"
            variant="secondary"
            onClick={() => {
              setEndSetRequested(true);
            }}
          >
            {LIVE.endSet}
          </Button>
        )}
      </div>

      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>

      <Dialog
        open={timeoutOpen}
        title={DIALOGS.timeout.title}
        description={DIALOGS.timeout.body}
        cancelLabel={COMMON_BUTTONS.cancel}
        onCancel={() => {
          setTimeoutOpen(false);
        }}
      >
        <div className={styles.dialogActions}>
          {(['us', 'them'] as const).map((team: TeamSide) => (
            <Button
              key={team}
              variant="primary"
              onClick={() => {
                recordTimeout(team);
                setTimeoutOpen(false);
              }}
            >
              {team === 'us' ? DIALOGS.timeout.us : DIALOGS.timeout.them}
            </Button>
          ))}
        </div>
      </Dialog>

      <SubstitutionDialog
        open={substitutionOpen}
        set={liveSet}
        roster={match.roster}
        onCancel={() => {
          setSubstitutionOpen(false);
        }}
        onConfirm={(outId, inId) => {
          recordSubstitution(outId, inId);
          setSubstitutionOpen(false);
        }}
      />

      <Dialog
        open={endSetOpen}
        title={DIALOGS.setEnd.title(liveSet.index + 1)}
        description={DIALOGS.setEnd.body(
          match.info.ourTeam.name,
          liveSet.ourPoints,
          liveSet.theirPoints,
          match.info.opponentTeam.name,
          snapshot.setsWon.us,
          snapshot.setsWon.them,
        )}
        confirmLabel={LIVE.endSet}
        cancelLabel={COMMON_BUTTONS.cancel}
        onCancel={() => {
          setEndSetRequested(false);
          setEndSetDismissedAt(scoreKey);
        }}
        onConfirm={() => {
          endCurrentSet();
          setEndSetRequested(false);
          setEndSetDismissedAt(null);
          setNextStepDismissed(false);
        }}
      />

      <Dialog
        open={showMatchEnd}
        title={DIALOGS.matchEnd.title}
        description={DIALOGS.matchEnd.body(
          match.info.ourTeam.name,
          snapshot.setsWon.us,
          snapshot.setsWon.them,
          match.info.opponentTeam.name,
        )}
        confirmLabel={DIALOGS.matchEnd.goToSummary}
        cancelLabel={DIALOGS.matchEnd.stayHere}
        onCancel={() => {
          setNextStepDismissed(true);
        }}
        onConfirm={() => {
          void navigate(ROUTES.summary);
        }}
      />

      <Dialog
        open={showNextSetPrompt}
        title={DIALOGS.setEnd.title(liveSet.index + 1)}
        description={DIALOGS.setEnd.body(
          match.info.ourTeam.name,
          liveSet.ourPoints,
          liveSet.theirPoints,
          match.info.opponentTeam.name,
          snapshot.setsWon.us,
          snapshot.setsWon.them,
        )}
        confirmLabel={DIALOGS.setEnd.startNextSet(liveSet.index + 2)}
        cancelLabel={DIALOGS.matchEnd.stayHere}
        onCancel={() => {
          setNextStepDismissed(true);
        }}
        onConfirm={() => {
          void navigate(ROUTES.lineup);
        }}
      />

      <Dialog
        open={shortcutsOpen}
        title={DIALOGS.shortcuts.title}
        cancelLabel={DIALOGS.shortcuts.close}
        onCancel={() => {
          setShortcutsOpen(false);
        }}
      >
        <ul className={styles.shortcutList}>
          <li>0–9 · numero di maglia</li>
          <li>B R A M D Z · fondamentale</li>
          <li>P + N − E · esito</li>
          <li>Spazio · punto nostro</li>
          <li>X · punto avversario</li>
          <li>Q · errore nostro</li>
          <li>Ctrl+Z · annulla · Ctrl+Maiusc+Z · ripristina</li>
          <li>T · time-out nostro · Maiusc+T · avversario</li>
          <li>C · cambio · S · statistiche · Ctrl+Invio · termina set</li>
        </ul>
      </Dialog>
    </div>
  );
}
