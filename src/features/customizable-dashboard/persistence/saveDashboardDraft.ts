import { saveDashboardDraft, type DashboardBuilderState } from '../model/dashboardBuilder';
import type { DashboardRepository } from './dashboardRepository';

export type SaveDashboardResult = {
  state: DashboardBuilderState;
  error: string | null;
};

export async function persistDashboardDraft(
  state: DashboardBuilderState,
  repository: DashboardRepository,
): Promise<SaveDashboardResult> {
  if (!state.draft) {
    return { state, error: null };
  }

  try {
    await repository.save(structuredClone(state.draft));
    return { state: saveDashboardDraft(state), error: null };
  } catch (error) {
    return {
      state,
      error: error instanceof Error ? error.message : 'Dashboard could not be saved.',
    };
  }
}
