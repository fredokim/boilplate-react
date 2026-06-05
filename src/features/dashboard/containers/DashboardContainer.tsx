import { toFailure } from '@core/result/failure';
import { useInfiniteScroll } from '@hooks/useInfiniteScroll';
import { useUserListQuery } from '@features/user/hooks/useUserQuery';
import { DashboardView } from '../views/DashboardView';

export default function DashboardContainer() {
  const users = useUserListQuery();
  const sentinelRef = useInfiniteScroll({
    enabled: users.status === 'success',
    hasNextPage: false,
    isFetching: users.isFetching,
    onLoadMore: () => undefined,
  });

  return (
    <DashboardView
      failure={users.error ? toFailure(users.error) : undefined}
      onRetry={() => void users.refetch()}
      sentinelRef={sentinelRef}
      status={users.status}
      users={users.data?.items ?? []}
    />
  );
}
