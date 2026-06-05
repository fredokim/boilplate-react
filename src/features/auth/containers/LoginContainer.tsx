import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toDtoFieldErrors } from '@core/form/fieldErrors';
import { logger } from '@core/observability/logger';
import { toFailure } from '@core/result/failure';
import { LoginView } from '../views/LoginView';
import { useLoginMutation } from '../hooks/useAuthSession';
import { loginSchema, type LoginInput } from '../schemas/login.schema';

export default function LoginContainer() {
  const navigate = useNavigate();
  const login = useLoginMutation();
  const [email, setEmail] = useState('demo@example.com');
  const [password, setPassword] = useState('password');
  const [fieldError, setFieldError] = useState<string | undefined>();

  return (
    <LoginView
      email={email}
      error={fieldError ?? (login.error ? toFailure(login.error).message : undefined)}
      isLoading={login.isPending}
      onEmailChange={setEmail}
      onPasswordChange={setPassword}
      onSubmit={() => {
        const parsed = loginSchema.safeParse({ email, password });
        if (!parsed.success) {
          const errors = toDtoFieldErrors<LoginInput>(parsed.error);
          setFieldError(errors.email ?? errors.password);
          logger.warn('Login validation failed', { errors });
          return;
        }
        setFieldError(undefined);
        login.mutate(
          parsed.data,
          {
            onSuccess: () => navigate('/'),
          },
        );
      }}
      password={password}
    />
  );
}
