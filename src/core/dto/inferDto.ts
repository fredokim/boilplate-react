export type InferDto<TDto extends abstract new (...args: unknown[]) => object> = InstanceType<TDto>;
