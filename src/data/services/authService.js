import { supabase } from '../../../supabaseClient.js';
import { apiFetch } from './apiClient.js';

export const registerUser = async (email, password, role, fullName, companyName) => {
  try {
    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          role: role,
          full_name: fullName,
          company_name: role === 'recruiter' ? companyName : null,
        }
      }
    });

    if (error) throw error;

    if (data?.user && data.user.identities && data.user.identities.length === 0) {
      return { success: false, message: 'already registered' };
    }

    return { success: true, data };
  } catch (error) {
    return { success: false, message: error?.message || 'Registration failed' };
  }
};
export const loginWithEmail = async (email, password) => {
  try {
    const result = await apiFetch('/api/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (!result?.success) {
      return {
        success: false,
        message: result?.message || 'Sign-in failed. Please try again.',
        attemptsLeft: result?.attemptsLeft ?? null,
        locked: Boolean(result?.locked),
        retryAfterSeconds: result?.retryAfterSeconds ?? null,
      };
    }
    const { session, user } = result.data || {};
    const { error } = await supabase.auth.setSession({
      access_token: session?.access_token,
      refresh_token: session?.refresh_token,
    });
    if (error) throw error;
    return { success: true, data: { user, session } };
  } catch (error) {
    return { success: false, message: error?.message || 'Sign-in failed. Please try again.' };
  }
};
export const loginWithGoogle = async (redirectToPath = '/candidate-dashboard') => {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}${redirectToPath}`,
      }
    });

    if (error) throw error;
    return { success: true, data };

  } catch (error) {
    return { success: false, message: error.message };
  }
};

export const logoutUser = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { success: true };
  } catch (error) {
    return { success: false, message: error.message };
  }
};
export const getCurrentUser = async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error) throw error;
    return { success: true, data: user };
  } catch (error) {
    return { success: false, message: error.message };
  }
};
export const createPublicProfile = async (userId, email, role, fullName = '') => {
  try {
    const tableName = role === 'recruiter' ? 'employers' : 'candidate_profiles';

    const nameParts = fullName.trim().split(/\s+/);
    const firstName = nameParts[0] || 'Unknown';
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

    const { data: existingProfile } = await supabase
      .from(tableName)
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (!existingProfile) {
      const insertData = role === 'recruiter'
        ? { id: userId, email: email, companyName: fullName || 'Company Workspace' }
        : { id: userId, email: email, firstName: firstName, lastName: lastName };

      const { error } = await supabase.from(tableName).insert([insertData]);
      if (error) throw error;

    } else if (role === 'job_seeker' && (!existingProfile.firstName || !existingProfile.lastName)) {
      if (fullName) {
        await supabase.from(tableName).update({
          firstName: firstName,
          lastName: lastName
        }).eq('id', userId);
      }
    }

    return { success: true };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

export const updateUserMetadata = async (metadata) => {
  try {
    const { data, error } = await supabase.auth.updateUser({
      data: metadata
    });

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    return { success: false, message: error.message };
  }
};
export const sendPasswordResetOtp = async (email) => {
  try {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) return { success: false, message: error.message };
    return { success: true, data };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

export const verifyPasswordResetOtp = async (email, otp) => {
  try {
    const { data, error } = await supabase.auth.verifyOtp({
      email: email,
      token: otp,
      type: 'recovery'
    });
    if (error) return { success: false, message: error.message };
    return { success: true, data };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

export const updatePassword = async (newPassword) => {
  try {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword
    });
    if (error) return { success: false, message: error.message };

    await supabase.auth.signOut();

    return { success: true, data };
  } catch (error) {
    return { success: false, message: error.message };
  }
};
export const isStrongPassword = (password) => password.length >= 8 && /[\d!@#$%^&*(),.?":{}|<>]/.test(password);

export const hasPasswordLogin = (user) => Boolean(
  user?.identities?.some((identity) => identity.provider === 'email')
  || user?.app_metadata?.providers?.includes('email')
  || user?.app_metadata?.provider === 'email'
);

export const changePassword = async (currentPassword, newPassword) => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return { success: false, message: 'Your session has expired. Please sign in again.' };
    if (!isStrongPassword(newPassword)) {
      return { success: false, message: 'Use at least 8 characters, including a number or symbol.' };
    }

    if (hasPasswordLogin(user)) {
      if (!currentPassword) return { success: false, message: 'Enter your current password.' };
      if (currentPassword === newPassword) return { success: false, message: 'Your new password must be different from the current one.' };
      const { error: verifyError } = await supabase.auth.signInWithPassword({ email: user.email, password: currentPassword });
      if (verifyError) return { success: false, message: 'Your current password is incorrect.' };
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return { success: false, message: error.message };
    return { success: true };
  } catch (error) {
    return { success: false, message: error?.message || 'Could not change your password.' };
  }
};
