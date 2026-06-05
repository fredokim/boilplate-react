import { ResultBoundary } from '@/components/states/ResultBoundary';
import { toFailure } from '@core/result/failure';
import { useParams } from 'react-router-dom';
import { useUserQuery } from '../hooks/useUserQuery';
import { UserView } from '../views/UserView';

export default function UserContainer() {
  const params = useParams();
  const id = params.id ?? '';
  const user = useUserQuery(id);

  return (
    <ResultBoundary failure={user.error ? toFailure(user.error) : undefined} onRetry={() => void user.refetch()} status={user.status}>
      {user.data ? <UserView user={user.data} /> : null}
    </ResultBoundary>
  );
}
