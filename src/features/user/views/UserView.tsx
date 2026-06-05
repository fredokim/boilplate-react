import { Badge } from '@ui/Badge';
import { Card } from '@ui/Card';
import type { UserDto } from '../dto/User.dto';

export function UserView({ user }: { user: UserDto }) {
  return (
    <div className="page-grid">
      <div className="page-heading">
        <div>
          <h1 className="m-0 text-2xl font-black text-ink">{user.name}</h1>
          <p className="mt-2 text-sm text-muted">{user.email}</p>
        </div>
        <Badge tone="primary">{user.role}</Badge>
      </div>
      <Card title="Profile contract" description="DTO validation guards this view before rendering.">
        <dl className="grid gap-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="font-semibold text-muted">User ID</dt>
            <dd className="m-0 font-mono text-ink">{user.id}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="font-semibold text-muted">Role</dt>
            <dd className="m-0 text-ink">{user.role}</dd>
          </div>
        </dl>
      </Card>
    </div>
  );
}
