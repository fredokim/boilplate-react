import { z } from 'zod';
import type { InferDto } from '@core/dto/inferDto';
import type { LoginRequestDto } from '../dto/Auth.dto';

export const loginSchema = z.object({
  email: z.email('Enter a valid email.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
}) satisfies z.ZodType<InferDto<typeof LoginRequestDto>>;

export type LoginInput = z.infer<typeof loginSchema>;
