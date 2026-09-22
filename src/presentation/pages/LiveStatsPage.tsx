import { useNavigate } from 'react-router-dom';
import { useMatchStore } from '@application/stores/matchStore';
import { LiveStatsPanel } from '@presentation/components/live/LiveStatsPanel';
import { Button } from '@presentation/components/ui/Button';
import { EmptyState } from '@presentation/components/ui/EmptyState';
import { ROUTES } from '@presentation/routes';
import { COMMON_BUTTONS, STATS } from '@shared/copy';

export function LiveStatsPage(): React.JSX.Element {
  const navigate = useNavigate();
  const match = useMatchStore((state) => state.match);

  if (match === null) {
    return (
      <EmptyState
        title={STATS.title}
        description={STATS.emptyState}
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
    );
  }

  return (
    <div className="flex flex-col gap-[var(--sp-4)]">
      <LiveStatsPanel match={match} />
      <div>
        <Button
          onClick={() => {
            void navigate(ROUTES.live);
          }}
        >
          {COMMON_BUTTONS.back}
        </Button>
      </div>
    </div>
  );
}
