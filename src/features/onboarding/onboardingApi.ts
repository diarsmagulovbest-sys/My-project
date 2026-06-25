import { supabase } from '../../lib/supabase';

export type OnboardingStatus = 'new' | 'dismissed' | 'completed';

type ProfileOnboardingRow = {
  onboarding_status: OnboardingStatus;
};

export async function fetchOnboardingStatus(userId: string): Promise<OnboardingStatus> {
  const { data, error } = await supabase
    .from('profiles')
    .select('onboarding_status')
    .eq('id', userId)
    .maybeSingle()
    .returns<ProfileOnboardingRow | null>();

  if (error) {
    throw new Error(error.message);
  }

  return data?.onboarding_status ?? 'new';
}

export async function updateOnboardingStatus(userId: string, status: OnboardingStatus) {
  const { error } = await supabase
    .from('profiles')
    .update({ onboarding_status: status })
    .eq('id', userId);

  if (error) {
    throw new Error(error.message);
  }
}
