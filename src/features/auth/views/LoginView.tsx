import { Button } from '@ui/Button';
import { Card } from '@ui/Card';
import { Input } from '@ui/Input';
import type { FormEvent } from 'react';

export type LoginViewProps = {
  email: string;
  password: string;
  isLoading: boolean;
  error?: string | undefined;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: () => void;
};

export function LoginView({
  email,
  error,
  isLoading,
  onEmailChange,
  onPasswordChange,
  onSubmit,
  password,
}: LoginViewProps) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <div className="mx-auto grid max-w-md gap-5">
      <div>
        <h1 className="m-0 text-2xl font-black text-ink">Login</h1>
        <p className="mt-2 text-sm text-muted">API DTO validation and session wiring are active.</p>
      </div>
      <Card>
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <Input label="Email" name="email" onChange={(event) => onEmailChange(event.target.value)} type="email" value={email} />
          <Input
            error={error}
            label="Password"
            name="password"
            onChange={(event) => onPasswordChange(event.target.value)}
            type="password"
            value={password}
          />
          <Button isLoading={isLoading} type="submit">
            Sign in
          </Button>
        </form>
      </Card>
    </div>
  );
}
