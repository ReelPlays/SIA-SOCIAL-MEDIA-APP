import { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Avatar,
  Grid,
  Skeleton,
  TextField,
  Button,
  Stack,
  Snackbar,
  Alert,
  Divider,
} from '@mui/material';
import { createClient } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom'; // Add this at top with other imports

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL and Anon Key must be provided');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface Account {
  id: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  address?: string;
  phone?: string;
  age: number;
  gender?: string;
  createdAt: string;
  updatedAt?: string;
}

export default function Profile() {
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [age, setAge] = useState(0);
  const [gender, setGender] = useState('');
  const [saving, setSaving] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const navigate = useNavigate(); // Initialize the navigate hook

  useEffect(() => {
    fetchAccount();
  }, []);

  const fetchAccount = async () => {
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) {
        throw new Error('User not logged in.');
      }
      const userEmail = userData.user.email;
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('email', userEmail)
        .single();
      if (error) throw error;
      if (data) {
        const transformed: Account = {
          id: data.id,
          email: data.email,
          password: data.password,
          firstName: data.first_name,
          lastName: data.last_name,
          address: data.address,
          phone: data.phone,
          age: data.age,
          gender: data.gender,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        };
        setAccount(transformed);
        setFirstName(transformed.firstName);
        setLastName(transformed.lastName);
        setAddress(transformed.address || '');
        setPhone(transformed.phone || '');
        setAge(transformed.age);
        setGender(transformed.gender || '');
      } else {
        setError('No account data found.');
      }
    } catch (error: any) {
      console.error('Error fetching account:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!account) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('accounts')
        .update({
          first_name: firstName,
          last_name: lastName,
          address,
          phone,
          age,
          gender,
          updated_at: new Date().toISOString(),
        })
        .eq('id', account.id);
      if (error) throw error;
      setAccount({
        ...account,
        firstName,
        lastName,
        address,
        phone,
        age,
        gender,
        updatedAt: new Date().toISOString(),
      });
      setEditMode(false);
      showSnackbar('Profile updated successfully!', 'success');
    } catch (error: any) {
      console.error('Error updating profile:', error);
      showSnackbar(error.message || 'Failed to update profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!account) return;
    if (newPassword !== confirmPassword) {
      showSnackbar('New passwords do not match.', 'error');
      return;
    }
    if (!currentPassword) {
      showSnackbar('Current password is required.', 'error');
      return;
    }
    setChangingPassword(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: account.email,
        password: currentPassword,
      });
      if (signInError) throw new Error('Current password is incorrect.');
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (updateError) throw updateError;
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showSnackbar('Password changed successfully!', 'success');
    } catch (error: any) {
      console.error('Error changing password:', error);
      showSnackbar(error.message || 'Failed to change password', 'error');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login'); // Navigate to login page after logout
  };


  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  if (loading) {
    return (
      <Container maxWidth="sm" sx={{ py: 6 }}>
        <Skeleton variant="circular" width={100} height={100} />
        <Skeleton variant="text" width="60%" sx={{ mt: 2 }} />
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="sm" sx={{ py: 6 }}>
        <Typography color="error">{error}</Typography>
      </Container>
    );
  }

  if (!account) {
    return (
      <Container maxWidth="sm" sx={{ py: 6 }}>
        <Typography>No account found.</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ py: 6 }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 3 }}>
        <Box textAlign="center">
          <Avatar sx={{ 
  width: 150,  // Increased from 120
  height: 150, // Increased from 120
  mx: 'auto', 
  mb: 2, 
  bgcolor: 'primary.main', 
  fontSize: 60 // Increased from 40
}}>
  {account.firstName[0]}
</Avatar>
          {editMode ? (
            <Stack direction="row" spacing={2} mb={2}>
              <TextField label="First Name" value={firstName} onChange={(e) => setFirstName(e.target.value)} size="small" />
              <TextField label="Last Name" value={lastName} onChange={(e) => setLastName(e.target.value)} size="small" />
            </Stack>
          ) : (
            <Typography variant="h5">
              {account.firstName} {account.lastName}
            </Typography>
          )}
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {account.email}
          </Typography>
          <Divider sx={{ my: 3 }} />
        </Box>

        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField fullWidth label="Address" value={address} onChange={(e) => setAddress(e.target.value)} size="small" disabled={!editMode} />
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} size="small" disabled={!editMode} />
          </Grid>
          <Grid item xs={6}>
            <TextField fullWidth label="Age" type="number" value={age} onChange={(e) => setAge(Number(e.target.value))} size="small" disabled={!editMode} />
          </Grid>
          <Grid item xs={6}>
            <TextField fullWidth label="Gender" value={gender} onChange={(e) => setGender(e.target.value)} size="small" disabled={!editMode} />
          </Grid>
        </Grid>

        <Box textAlign="center" mt={4}>
          {editMode ? (
            <Stack direction="row" spacing={2} justifyContent="center">
              <Button variant="contained" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button variant="outlined" onClick={() => {
                setEditMode(false);
                setFirstName(account.firstName);
                setLastName(account.lastName);
                setAddress(account.address || '');
                setPhone(account.phone || '');
                setAge(account.age);
                setGender(account.gender || '');
              }}>
                Cancel
              </Button>
            </Stack>
          ) : (
            <Button variant="contained" sx={{ mt: 2 }} onClick={() => setEditMode(true)}>
              Edit Profile
            </Button>
          )}
        </Box>

        <Divider sx={{ my: 4 }} />

        <Typography variant="h6" mb={2}>
          Change Password
        </Typography>

        <Stack spacing={2}>
          <TextField label="Current Password" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
          <TextField label="New Password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          <TextField label="Confirm New Password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          <Button variant="outlined" color="secondary" onClick={handleChangePassword} disabled={changingPassword}>
            {changingPassword ? 'Changing...' : 'Change Password'}
          </Button>
        </Stack>

        <Box textAlign="center" mt={4}>
          <Button 
            variant="text" 
            color="error" 
            onClick={handleLogout}
            sx={{
              mt: 2,
              fontWeight: 'bold',
              textTransform: 'none',
              fontSize: '1rem',
            }}
          >
            Logout
          </Button>
        </Box>
      </Paper>

      <Snackbar open={snackbarOpen} autoHideDuration={4000} onClose={handleSnackbarClose} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
}
