import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rxcnpwloayzveduaksnq.supabase.co';
const supabaseAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4Y25wd2xvYXl6dmVkdWFrc25xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUyMTEyNjIsImV4cCI6MjA2MDc4NzI2Mn0.LRScMtdsuvoQe_wiXdln-JbD-xItEGSB0ZMJyOSWHIw';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const getSupabaseUser = async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
};

export const signInWithEmail = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
};

export interface RegisterData {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  address?: string;
  phone?: string;
  age: number;
  gender?: string;
}

export const signUpWithEmail = async (registerData: RegisterData) => {
  // 1. Register the user with Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: registerData.email,
    password: registerData.password,
  });

  if (authError) {
    console.error('Supabase Auth error:', authError);
    throw authError;
  }

  const userId = authData.user?.id;
  if (!userId) throw new Error('User ID not returned from Supabase Auth');

  // 2. Insert user profile data into "accounts" table (including password)
  const { error: insertError } = await supabase.from('accounts').insert([
    {
      id: userId, // optional: only if "id" in your table is UUID and matches auth user id
      email: registerData.email,
      password: registerData.password, // Include password in the insert operation
      first_name: registerData.first_name,
      last_name: registerData.last_name,
      address: registerData.address,
      phone: registerData.phone,
      age: registerData.age,
      gender: registerData.gender,
    },
  ]);

  if (insertError) {
    console.error('Insert to accounts table failed:', insertError);
    throw insertError;
  }

  return authData;
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};
