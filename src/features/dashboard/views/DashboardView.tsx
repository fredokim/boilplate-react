import { ResultBoundary } from '@/components/states/ResultBoundary';
import type { AppFailure } from '@core/result/failure';
import { Badge } from '@ui/Badge';
import { Card } from '@ui/Card';
import type { UserListItemDto } from '@features/user/dto/User.dto';

type DashboardViewProps = {
  users: UserListItemDto[];
  status: 'idle' | 'pending' | 'success' | 'error';
  onRetry: () => void;
  failure?: AppFailure | undefined;
  sentinelRef: React.RefObject<HTMLDivElement | null>;
};

export function DashboardView({ failure, onRetry, sentinelRef, status, users }: DashboardViewProps) {
  return (
    <div className="page-grid">
      <div className="page-heading">
        <div>
          <h1 className="m-0 text-2xl font-black text-ink">Dashboard</h1>
          <p className="mt-2 text-sm text-muted">Lazy routes, TanStack Query, Zustand session, and DTO validation are wired.</p>
        </div>
        <Badge tone="success">Web only</Badge>
      </div>
      <Card title="Users" description="This list is ready for pagination or infinite query replacement.">
        <ResultBoundary
          emptyTitle="No users"
          failure={failure}
          isEmpty={users.length === 0}
          onRetry={onRetry}
          status={status}
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-line text-muted">
                  <th className="py-3 pr-4 font-bold">Name</th>
                  <th className="py-3 pr-4 font-bold">Email</th>
                  <th className="py-3 pr-4 font-bold">Role</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr className="border-b border-slate-100" key={user.id}>
                    <td className="py-3 pr-4 font-semibold text-ink">{user.name}</td>
                    <td className="py-3 pr-4 text-muted">{user.email}</td>
                    <td className="py-3 pr-4">
                      <Badge>{user.role}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div aria-hidden="true" ref={sentinelRef} />
        </ResultBoundary>
      </Card>
    </div>
  );
}
