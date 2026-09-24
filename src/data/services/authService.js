import { supabase } from '../../../supabaseClient.js';

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
    return { success: true, data };
    
  } catch (error) {
    return { success: false, message: error.message };
  }
};
export const loginWithEmail = async (email, password) => {
  try {
    const response = await fetch('http://localhost:3000/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    const result = await response.json();
    if (!result.success) throw new Error(result.message);
    
    return { success: true, data: result.data };
  } catch (error) {
    return { success: false, message: error.message };
  }
};
export const loginWithGoogle = async (redirectToPath = '/candidate-dashboard') => {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `http://localhost:5173${redirectToPath}`, 
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
export const createPublicProfile = async (userId, email, role) => {
  try {
    const tableName = role === 'recruiter' ? 'employers' : 'candidate_profiles';
          
    const { data: existingProfile } = await supabase
      .from(tableName)
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (!existingProfile) {
      const { error } = await supabase.from(tableName).insert([
        { 
          id: userId, 
          email: email 
        }
      ]);
      if (error) throw error;
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