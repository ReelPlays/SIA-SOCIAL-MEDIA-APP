import React, { useEffect, useState } from 'react'; // Added React import
import {
  Box,
  Container,
  // Paper, // No longer explicitly used, replaced by Card
  Card,
  CardHeader,
  CardContent,
  Typography,
  Avatar,
  Grid,
  Skeleton,
  TextField,
  Button,
  Stack,
  Snackbar,
  Alert,
  // Divider, // No longer explicitly used in main structure
  CircularProgress,
  IconButton,
  InputAdornment,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemAvatar, // <-- Import Added
  Tooltip,        // <-- Import Added
} from '@mui/material';
import { createClient } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';

// --- Icons ---
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import LogoutIcon from '@mui/icons-material/Logout';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
// import MailOutlineIcon from '@mui/icons-material/MailOutline'; // Not used in final layout
import PhoneIcon from '@mui/icons-material/Phone';
import HomeIcon from '@mui/icons-material/Home';
import CakeIcon from '@mui/icons-material/Cake';
import WcIcon from '@mui/icons-material/Wc'; // Gender Icon
import LockResetIcon from '@mui/icons-material/LockReset';
import PersonIcon from '@mui/icons-material/Person'; // For name fields in edit mode
import PersonAddIcon from '@mui/icons-material/PersonAdd'; // <-- Import Added

// --- Supabase Setup ---
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL and Anon Key must be provided');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// --- Types ---
interface Account {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  address?: string | null;
  phone?: string | null;
  age: number;
  gender?: string | null;
  createdAt: string;
  updatedAt?: string | null;
}

type EditAccountData = Omit<Account, 'id' | 'email' | 'createdAt' | 'updatedAt'>;

// --- Dummy Data for Suggested Friends (Place outside the Profile component) ---
const suggestedFriendsData = [
  { id: 'sf1', name: 'Charlie Davis', initials: 'CD', mutual: 5 },
  { id: 'sf2', name: 'Diana Evans', initials: 'DE', mutual: 3 },
  { id: 'sf3', name: 'Ethan Garcia', initials: 'EG', mutual: 8 },
  { id: 'sf4', name: 'Fiona Harris', initials: 'FH', mutual: 2 },
  { id: 'sf5', name: 'George Irwin', initials: 'GI', mutual: 1 },
];

// --- Suggested Friends Component ---
const SuggestedFriendsCard: React.FC = () => {
  const handleAddFriend = (name: string) => {
    // Placeholder action for demonstration
    // In a real app, this would likely trigger an API call or state update
    alert(`Add friend request sent to ${name}`);
    console.log(`Attempting to add friend: ${name}`);
  };

  return (
    <Card>
      <CardHeader title="People You May Know" />
      <CardContent sx={{ pt: 0 }}> {/* Remove CardHeader's default bottom padding */}
        <List dense> {/* Dense list for tighter spacing */}
          {suggestedFriendsData.map((friend) => (
            <ListItem
              key={friend.id}
              secondaryAction={ // Place button/icon on the right
                <Tooltip title="Add friend" arrow>
                  <IconButton
                    edge="end"
                    aria-label={`add ${friend.name} as friend`}
                    onClick={() => handleAddFriend(friend.name)}
                    size="small" // Smaller button
                  >
                    <PersonAddIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              }
              disablePadding // Remove default padding
              sx={{ py: 0.5 }} // Add custom vertical padding if needed
            >
              <ListItemAvatar sx={{ minWidth: 48 }}> {/* Control spacing before text */}
                <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.light', fontSize: '0.875rem' }}>
                  {friend.initials}
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={friend.name}
                secondary={`${friend.mutual} mutual friends`}
                primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                secondaryTypographyProps={{ variant: 'caption' }}
              />
            </ListItem>
          ))}
        </List>
        {/* Optional: Add a "See All" button */}
        <Box sx={{ textAlign: 'right', mt: 1 }}>
            <Button size="small" onClick={() => alert('See All suggestions clicked!')}>
                See All
            </Button>
        </Box>
      </CardContent>
    </Card>
  );
};


// --- Main Profile Component ---
export default function Profile() {
  const navigate = useNavigate(); // Initialize the navigate hook

  // --- State ---
  const [account, setAccount] = useState<Account | null>(null);
  const [editData, setEditData] = useState<EditAccountData | null>(null); // State for edits
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' | 'info'>('success');

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // --- Effects ---
  useEffect(() => {
    fetchAccount();
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Added dependency array if needed, though navigate should be stable

  // --- Data Fetching ---
  const fetchAccount = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();

      if (userError || !userData?.user) {
        console.warn('User not logged in, redirecting...');
        navigate('/login');
        return;
      }

      const userEmail = userData.user.email;
      if (!userEmail) {
          throw new Error('User email not found.');
      }

      const { data, error: fetchError } = await supabase
        .from('accounts') // Your table name
        .select('*')
        .eq('email', userEmail)
        .single();

      if (fetchError) {
          if (fetchError.code === 'PGRST116') {
             throw new Error('Profile data not found for this user.');
          }
          throw fetchError;
      }

      if (data) {
        const transformed: Account = {
          id: data.id,
          email: data.email,
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
        setEditData({
            firstName: transformed.firstName,
            lastName: transformed.lastName,
            address: transformed.address || '',
            phone: transformed.phone || '',
            age: transformed.age,
            gender: transformed.gender || '',
        });
      } else {
        setError('No account data found.');
      }
    } catch (error: any) {
      console.error('Error fetching account:', error);
      setError(error.message || 'An unexpected error occurred while fetching profile.');
    } finally {
      setLoading(false);
    }
  };

  // --- Event Handlers ---

  const handleEditToggle = () => {
      if (!account) return;
      if (!editMode) {
          setEditData({
              firstName: account.firstName,
              lastName: account.lastName,
              address: account.address || '',
              phone: account.phone || '',
              age: account.age,
              gender: account.gender || '',
          });
      }
      setEditMode(!editMode);
  };

  const handleCancelEdit = () => {
      setEditMode(false);
      // Resetting editData is handled by handleEditToggle when re-entering edit mode
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = e.target;
      setEditData(prev => prev ? { ...prev, [name]: value } : null);
  };

  const handleAgeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
       const ageValue = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
       setEditData(prev => prev ? { ...prev, age: isNaN(ageValue) ? 0 : ageValue } : null);
  }

  const handleSave = async () => {
    if (!account || !editData) return;
    setSaving(true);
    try {
      const updates = {
        first_name: editData.firstName,
        last_name: editData.lastName,
        address: editData.address || null,
        phone: editData.phone || null,
        age: editData.age,
        gender: editData.gender || null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('accounts')
        .update(updates)
        .eq('id', account.id);

      if (error) throw error;

      setAccount(prev => prev ? {
        ...prev,
        ...editData,
        address: editData.address || null,
        phone: editData.phone || null,
        gender: editData.gender || null,
        updatedAt: updates.updated_at,
      } : null);

      setEditMode(false);
      showSnackbar('Profile updated successfully!', 'success');
    } catch (error: any) {
      console.error('Error updating profile:', error);
      showSnackbar(error.message || 'Failed to update profile.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!account) return;

    if (!currentPassword || !newPassword || !confirmPassword) {
      showSnackbar('Please fill in all password fields.', 'error');
      return;
    }
    if (newPassword.length < 6) {
        showSnackbar('New password must be at least 6 characters long.', 'error');
        return;
    }
    if (newPassword !== confirmPassword) {
      showSnackbar('New passwords do not match.', 'error');
      return;
    }

    setChangingPassword(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: account.email,
        password: currentPassword,
      });

      if (signInError) {
          if (signInError.message.includes('Invalid login credentials')) {
             throw new Error('Current password is incorrect.');
          }
          throw signInError;
      }

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
      showSnackbar(error.message || 'Failed to change password.', 'error');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    showSnackbar('Logging out...', 'info')
    try {
        await supabase.auth.signOut();
        navigate('/login');
    } catch (logoutError) {
        console.error('Logout failed:', logoutError);
        showSnackbar('Logout failed. Please try again.', 'error');
        setLoading(false); // Ensure loading stops on error
    }
     // setLoading(false) might be skipped if navigate happens instantly
  };

  // --- Snackbar ---
  const showSnackbar = (message: string, severity: 'success' | 'error' | 'info') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const handleSnackbarClose = (_event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbarOpen(false);
  };

  // --- Password Visibility Toggles ---
  const handleClickShowCurrentPassword = () => setShowCurrentPassword((show) => !show);
  const handleClickShowNewPassword = () => setShowNewPassword((show) => !show);
  const handleClickShowConfirmPassword = () => setShowConfirmPassword((show) => !show);
  const handleMouseDownPassword = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
  };

  // --- Conditional Rendering ---
  if (loading && !account) {
    return (
      // Use lg here too for consistency during loading
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Grid container spacing={3}>
          {/* Adjust skeleton sizes to roughly match new column widths */}
          <Grid item xs={12} md={3}>
              <Skeleton variant="rectangular" height={300} sx={{ mb: 3 }} />
              <Skeleton variant="rectangular" height={100} />
          </Grid>
          <Grid item xs={12} md={5}>
              <Skeleton variant="rectangular" height={200} sx={{ mb: 3 }} />
              <Skeleton variant="rectangular" height={250} />
          </Grid>
          <Grid item xs={12} md={4} sx={{ display: { xs: 'none', md: 'block' } }}>
              <Skeleton variant="rectangular" height={300} />
          </Grid>
        </Grid>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="sm" sx={{ py: 6, textAlign: 'center' }}>
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
        <Stack direction="row" spacing={2} justifyContent="center">
            <Button variant="outlined" onClick={fetchAccount}>Try Again</Button>
            <Button variant="text" color="primary" onClick={() => navigate('/login')}>Go to Login</Button>
        </Stack>
      </Container>
    );
  }

  if (!account || !editData) {
    return (
      <Container maxWidth="sm" sx={{ py: 6 }}>
        <Typography>Account data is unavailable. Please try logging in again.</Typography>
         <Button variant="contained" onClick={() => navigate('/login')} sx={{mt: 2}}>Go to Login</Button>
      </Container>
    );
  }

  // --- Render Profile Page ---
  return (
    <Container maxWidth="lg" sx={{ py: 5 }}> {/* Changed to lg */}
      <Grid container spacing={3}>

        {/* --- Column 1: Avatar & Basic Info --- */}
        <Grid item xs={12} md={3}> {/* Changed to 3 */}
          {/* --- User Info Card --- */}
          <Card sx={{ textAlign: 'center', p: 3, mb: 3 }}>
             <Avatar
              sx={{
                width: 150, height: 150, mx: 'auto', mb: 2,
                bgcolor: 'primary.main', fontSize: 60,
                border: '3px solid white', boxShadow: 3,
              }}
            >
              {account.firstName?.charAt(0).toUpperCase()}{account.lastName?.charAt(0).toUpperCase()}
            </Avatar>
             <Typography variant="h5" gutterBottom>
                 {editMode ? `${editData.firstName} ${editData.lastName}` : `${account.firstName} ${account.lastName}`}
             </Typography>
             <Typography variant="body1" color="text.secondary">
                 {account.email}
             </Typography>
             <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                Member since: {new Date(account.createdAt).toLocaleDateString()}
             </Typography>
             {account.updatedAt && (
                 <Typography variant="caption" color="text.secondary" display="block">
                     Last updated: {new Date(account.updatedAt).toLocaleDateString()}
                 </Typography>
             )}
             <Button
                variant={editMode ? "outlined" : "contained"}
                startIcon={editMode ? <CancelIcon /> : <EditIcon />}
                onClick={editMode ? handleCancelEdit : handleEditToggle}
                sx={{ mt: 3, width: '100%' }}
                color={editMode ? "warning" : "primary"}
             >
                {editMode ? 'Cancel Edit' : 'Edit Profile'}
             </Button>
             {editMode && (
                 <Button
                     variant="contained"
                     color="success"
                     startIcon={<SaveIcon />}
                     onClick={handleSave}
                     disabled={saving}
                     sx={{ mt: 1, width: '100%' }}
                 >
                     {saving ? <CircularProgress size={24} color="inherit" /> : 'Save Changes'}
                 </Button>
             )}
          </Card>

          {/* --- Actions Card --- */}
          <Card>
                 <CardHeader title="Actions" />
                 <CardContent>
                     <Button
                         variant="outlined"
                         color="error"
                         startIcon={<LogoutIcon />}
                         onClick={handleLogout}
                         fullWidth
                         disabled={loading} // Use main loading state or a dedicated logout loading state
                     >
                         Logout
                     </Button>
                 </CardContent>
             </Card>
        </Grid>

        {/* --- Column 2: Details & Password --- */}
        <Grid item xs={12} md={5}> {/* Changed to 5 */}
          {/* --- Profile Details Card --- */}
          <Card sx={{ mb: 3 }}>
            <CardHeader title="Profile Details" />
            <CardContent>
              {editMode ? (
                // --- EDIT MODE ---
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                     <TextField fullWidth label="First Name" name="firstName" value={editData.firstName} onChange={handleInputChange} variant="outlined" InputProps={{ startAdornment: <InputAdornment position="start"><PersonIcon fontSize="small" /></InputAdornment> }} />
                  </Grid>
                   <Grid item xs={12} sm={6}>
                     <TextField fullWidth label="Last Name" name="lastName" value={editData.lastName} onChange={handleInputChange} variant="outlined" InputProps={{ startAdornment: <InputAdornment position="start"><PersonIcon fontSize="small" /></InputAdornment> }} />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField fullWidth label="Address" name="address" value={editData.address} onChange={handleInputChange} variant="outlined" InputProps={{ startAdornment: <InputAdornment position="start"><HomeIcon fontSize="small" /></InputAdornment> }} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth label="Phone" name="phone" value={editData.phone} onChange={handleInputChange} variant="outlined" InputProps={{ startAdornment: <InputAdornment position="start"><PhoneIcon fontSize="small" /></InputAdornment> }} />
                  </Grid>
                   <Grid item xs={6} sm={3}>
                    <TextField fullWidth label="Age" name="age" type="number" value={editData.age <= 0 ? '' : editData.age} onChange={handleAgeChange} variant="outlined" InputProps={{ inputProps: { min: 0 }, startAdornment: <InputAdornment position="start"><CakeIcon fontSize="small" /></InputAdornment> }} />
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <TextField fullWidth label="Gender" name="gender" value={editData.gender} onChange={handleInputChange} variant="outlined" InputProps={{ startAdornment: <InputAdornment position="start"><WcIcon fontSize="small" /></InputAdornment> }} />
                  </Grid>
                </Grid>
              ) : (
                // --- VIEW MODE ---
                <List dense>
                  <ProfileDetailItem icon={<HomeIcon />} label="Address" value={account.address} />
                  <ProfileDetailItem icon={<PhoneIcon />} label="Phone" value={account.phone} />
                  <ProfileDetailItem icon={<CakeIcon />} label="Age" value={account.age > 0 ? account.age.toString() : ''} />
                  <ProfileDetailItem icon={<WcIcon />} label="Gender" value={account.gender} />
                </List>
              )}
            </CardContent>
          </Card>

          {/* --- Change Password Card --- */}
          <Card>
            <CardHeader title="Change Password" />
            <CardContent>
              <Stack spacing={2}>
                <TextField
                  fullWidth
                  label="Current Password"
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  variant="outlined"
                  required
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton aria-label="toggle current password visibility" onClick={handleClickShowCurrentPassword} onMouseDown={handleMouseDownPassword} edge="end">
                          {showCurrentPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
                <TextField
                  fullWidth
                  label="New Password"
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  variant="outlined"
                  required
                  helperText="Minimum 6 characters"
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton aria-label="toggle new password visibility" onClick={handleClickShowNewPassword} onMouseDown={handleMouseDownPassword} edge="end">
                          {showNewPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
                <TextField
                  fullWidth
                  label="Confirm New Password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  variant="outlined"
                  required
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton aria-label="toggle confirm password visibility" onClick={handleClickShowConfirmPassword} onMouseDown={handleMouseDownPassword} edge="end">
                          {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
                <Button
                    variant="contained"
                    color="secondary"
                    onClick={handleChangePassword}
                    disabled={changingPassword}
                    startIcon={<LockResetIcon />}
                    sx={{ mt: 1 }}
                >
                  {changingPassword ? <CircularProgress size={24} color="inherit" /> : 'Change Password'}
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* --- Column 3: Suggested Friends --- */}
        <Grid item xs={12} md={4} sx={{ display: { xs: 'none', md: 'block' } }}> {/* Changed to 4 */}
             <SuggestedFriendsCard />
        </Grid>

      </Grid> {/* End main Grid container */}

      {/* --- Snackbar for Notifications --- */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: '100%' }} variant="filled">
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
}


// --- Helper Component for Displaying Profile Details in View Mode ---
interface ProfileDetailItemProps {
    icon: React.ReactElement;
    label: string;
    value?: string | number | null;
}

const ProfileDetailItem: React.FC<ProfileDetailItemProps> = ({ icon, label, value }) => {
    // Render '--' or similar for empty optional fields in view mode for consistency
    const displayValue = value !== null && value !== undefined && value !== '' ? value : '--';

    // Only render essential fields or always render with placeholder
     if (!value && (label === 'Address' || label === 'Phone' || label === 'Gender')) {
        // Optionally hide completely empty non-essential fields
        // return null;
        // Or show with placeholder:
        // displayValue = '--';
     }
     // Always render Age even if 0, but maybe show placeholder if truly unset/null
     if (label === 'Age' && (value === null || value === undefined)) {
          return null; // Or show '--'
     }


    return (
        <ListItem disableGutters> {/* disableGutters reduces padding */}
            <ListItemIcon sx={{minWidth: 40}}>{icon}</ListItemIcon>
            {/* Use Typography directly for more control if needed */}
            <ListItemText primary={displayValue} secondary={label} />
        </ListItem>
    );
};