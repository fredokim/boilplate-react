import { z } from 'zod';
import type { InferDto } from '@core/dto/inferDto';
import type { AuthUserDto } from '@features/auth/dto/Auth.dto';

export const authUserStateSchema = z.object({
  id: z.string().min(1),
  email: z.email(),
  name: z.string().min(1),
  permissions: z.array(z.string()),
}) satisfies z.ZodType<InferDto<typeof AuthUserDto>>;

export const authStatusSchema = z.enum(['anonymous', 'checking', 'authenticated']);

export const authStateSnapshotSchema = z.object({
  accessToken: z.string().min(1).nullable(),
  status: authStatusSchema,
  user: authUserStateSchema.nullable(),
});

export type AuthStatus = z.infer<typeof authStatusSchema>;
export type AuthUserState = z.infer<typeof authUserStateSchema>;
export type AuthStateSnapshot = z.infer<typeof authStateSnapshotSchema>;
