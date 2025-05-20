// src/components/Profile.tsx
import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  Grid,
  CircularProgress,
  Divider,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Card,
  CardContent,
  Chip,
  Avatar,
  Stack,
} from '@mui/material';
import {
  EditOutlined as EditIcon,
  EmailOutlined as EmailIcon,
  PhoneOutlined as PhoneIcon,
  HomeOutlined as HomeIcon,
  CakeOutlined as CakeIcon,
  PersonOutline as PersonIcon,
  WcOutlined as GenderIcon,
  LogoutOutlined as LogoutIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useMutation } from '@apollo/client';
import { UPDATE_PROFILE } from '../graphql/mutations';
import ProfilePictureUpload from './ProfilePictureUpload';

// Interface for user profile data
interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  email: string;
  username?: string;
  bio?: string;
  date_of_birth?: string;
  profile_picture_url?: string;
  banner_picture_url?: string;
  address?: string;
  phone?: string;
  gender?: string;
}

// Interface for edit profile form
interface EditProfileForm {
  username: string;
  firstName: string;
  lastName: string;
  middleName: string;
  bio: string;
  dateOfBirth: string;
  address: string;
  phone: string;
  gender: string;
}

export const Profile: React.FC = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState<EditProfileForm>({
    username: '',
    firstName: '',
    lastName: '',
    middleName: '',
    bio: '',
    dateOfBirth: '',
    address: '',
    phone: '',
    gender: '',
  });
  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // Apollo mutation hook
  const [updateProfile, { loading: updateLoading }] = useMutation(UPDATE_PROFILE, {
    onCompleted: (data) => {
      // Update local profile data with the response
      if (profile) {
        setProfile({
          ...profile,
          username: data.updateProfile.username || profile.username,
          first_name: data.updateProfile.firstName,
          last_name: data.updateProfile.lastName,
          middle_name: data.updateProfile.middleName || profile.middle_name,
          bio: data.updateProfile.bio || profile.bio,
          date_of_birth: data.updateProfile.dateOfBirth || profile.date_of_birth,
          address: data.updateProfile.address || profile.address,
          phone: data.updateProfile.phone || profile.phone,
          gender: data.updateProfile.gender || profile.gender,
        });
      }
      setIsEditDialogOpen(false);
      setNotification({
        open: true,
        message: 'Profile updated successfully',
        severity: 'success',
      });
    },
    onError: (error) => {
      console.error('Error updating profile:', error);
      setNotification({
        open: true,
        message: `Error updating profile: ${error.message}`,
        severity: 'error',
      });
    },
  });

  // Fetch user profile data
  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/login');
        return;
      }
      
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('id', user.id)
        .single();
        
      if (error) throw error;
      setProfile(data);
      
      // Initialize edit form with current values
      setEditForm({
        username: data.username || '',
        firstName: data.first_name || '',
        lastName: data.last_name || '',
        middleName: data.middle_name || '',
        bio: data.bio || '',
        dateOfBirth: data.date_of_birth || '',
        address: data.address || '',
        phone: data.phone || '',
        gender: data.gender || '',
      });
    } catch (err: any) {
      console.error('Error fetching profile:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleEditProfile = () => {
    setIsEditDialogOpen(true);
  };
  
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditForm(prev => ({
      ...prev,
      [name]: value,
    }));
  };
  
  const handleSubmitEdit = () => {
    // Update profile using GraphQL mutation
    updateProfile({
      variables: {
        username: editForm.username || undefined,
        firstName: editForm.firstName || undefined,
        lastName: editForm.lastName || undefined,
        middleName: editForm.middleName || undefined,
        bio: editForm.bio || undefined,
        dateOfBirth: editForm.dateOfBirth || undefined,
        address: editForm.address || undefined,
        phone: editForm.phone || undefined,
        gender: editForm.gender || undefined,
      },
    });
  };
  
  const handleCloseNotification = () => {
    setNotification(prev => ({ ...prev, open: false }));
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  // Handle profile picture update success
  const handleProfilePictureUpdate = (url: string) => {
    if (profile) {
      setProfile({
        ...profile,
        profile_picture_url: url
      });
    }
    
    setNotification({
      open: true,
      message: 'Profile picture updated successfully',
      severity: 'success',
    });
  };

  // Handle banner picture update
  const handleBannerPictureUpdate = (url: string) => {
    if (profile) {
      setProfile({
        ...profile,
        banner_picture_url: url
      });
    }
    
    setNotification({
      open: true,
      message: 'Banner picture updated successfully',
      severity: 'success',
    });
  };

  // Generate a banner color based on user ID for consistency
  const generateColorFromId = (id: string) => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    const c = (hash & 0x00FFFFFF)
      .toString(16)
      .toUpperCase()
      .padStart(6, '0');
    return `#${c}`;
  };

  // Default banner with gradient based on user ID
  const getBannerStyle = (id: string) => {
    const baseColor = generateColorFromId(id);
    return {
      background: `linear-gradient(135deg, ${baseColor} 0%, #37474F 100%)`,
      height: '200px',
    };
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4, mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4, mt: 8 }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  // Define personal info items with icons
  const personalInfoItems = profile ? [
    { 
      icon: <PersonIcon color="primary" />, 
      label: 'First Name', 
      value: profile.first_name 
    },
    { 
      icon: <PersonIcon color="primary" />, 
      label: 'Middle Name', 
      value: profile.middle_name || 'Not specified' 
    },
    { 
      icon: <PersonIcon color="primary" />, 
      label: 'Last Name', 
      value: profile.last_name 
    },
    { 
      icon: <EmailIcon color="primary" />, 
      label: 'Email', 
      value: profile.email 
    },
    { 
      icon: <PhoneIcon color="primary" />, 
      label: 'Phone', 
      value: profile.phone || 'Not specified' 
    },
    { 
      icon: <CakeIcon color="primary" />, 
      label: 'Date of Birth', 
      value: profile.date_of_birth || 'Not specified' 
    },
    { 
      icon: <HomeIcon color="primary" />, 
      label: 'Address', 
      value: profile.address || 'Not specified' 
    },
    { 
      icon: <GenderIcon color="primary" />, 
      label: 'Gender', 
      value: profile.gender || 'Not specified' 
    },
  ] : [];

  return (
    <Box sx={{ bgcolor: '#f5f5f5', minHeight: '100vh', pt: 8 }}>
      <Container maxWidth="md" sx={{ mt: 2, mb: 4 }}>
        {profile ? (
          <Paper elevation={0} sx={{ borderRadius: 2, overflow: 'hidden' }}>
            {/* Banner Image */}
            <Box sx={{ position: 'relative', ...getBannerStyle(profile.id) }}>
              {profile.banner_picture_url && (
                <Box
                  component="img"
                  src={profile.banner_picture_url}
                  alt="Profile Banner"
                  sx={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
              )}
              
              {/* Profile Avatar - positioned to overlap the banner */}
              <Box sx={{ position: 'absolute', bottom: -50, left: 24 }}>
                <ProfilePictureUpload 
                  userId={profile.id}
                  currentProfilePicture={profile.profile_picture_url}
                  size={120}
                  onUploadSuccess={handleProfilePictureUpdate}
                />
              </Box>
              
              {/* Edit Profile Button */}
              <Button
                variant="contained"
                startIcon={<EditIcon />}
                onClick={handleEditProfile}
                sx={{
                  position: 'absolute',
                  right: 16,
                  bottom: 16,
                  borderRadius: 5,
                }}
              >
                Edit Profile
              </Button>
            </Box>
            
            {/* Profile Info Section */}
            <Box sx={{ pt: 8, px: 3, pb: 3 }}>
              <Typography variant="h4" fontWeight="bold">
                {profile.first_name} {profile.last_name}
              </Typography>
              
              <Typography variant="body1" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                @{profile.username || profile.first_name.toLowerCase() + profile.last_name.toLowerCase()}
                <Chip 
                  label="Member" 
                  size="small" 
                  color="primary" 
                  variant="outlined"
                  sx={{ ml: 1, height: 20, fontSize: '0.7rem' }} 
                />
              </Typography>
              
              <Box sx={{ 
                p: 2, 
                bgcolor: 'rgba(129, 93, 171, 0.05)', 
                borderRadius: 2, 
                mb: 3,
                border: '1px dashed rgba(129, 93, 171, 0.3)'
              }}>
                <Typography variant="body1" sx={{ fontStyle: profile.bio ? 'normal' : 'italic' }}>
                  {profile.bio || 'No bio available. Click "Edit Profile" to add a bio and tell others about yourself.'}
                </Typography>
              </Box>
              
              {/* Personal Information Section */}
              <Card elevation={0} sx={{ p: 0, borderRadius: 2, border: '1px solid #eee', overflow: 'hidden' }}>
                <Box sx={{ 
                  bgcolor: 'primary.main', 
                  color: 'white', 
                  py: 1.5, 
                  px: 3,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <Typography variant="h6" fontWeight="bold">
                    Personal Information
                  </Typography>
                </Box>
                
                <Box sx={{ p: 3 }}>
                  <Grid container spacing={3}>
                    {personalInfoItems.map((item, index) => (
                      <Grid item xs={12} sm={6} key={index}>
                        <Box sx={{ 
                          display: 'flex', 
                          alignItems: 'center',
                          p: 2,
                          borderRadius: 2,
                          bgcolor: 'background.paper',
                          border: '1px solid rgba(0,0,0,0.08)',
                          height: '100%'
                        }}>
                          <Avatar sx={{ bgcolor: 'rgba(129, 93, 171, 0.1)', mr: 2, color: 'primary.main' }}>
                            {item.icon}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                              {item.label}
                            </Typography>
                            <Typography variant="body1" fontWeight="medium">
                              {item.value}
                            </Typography>
                          </Box>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                  
                  <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
                    <Button
                      variant="outlined"
                      color="error"
                      startIcon={<LogoutIcon />}
                      onClick={handleLogout}
                      sx={{ borderRadius: 5 }}
                    >
                      Logout
                    </Button>
                  </Box>
                </Box>
              </Card>
            </Box>
          </Paper>
        ) : (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <Typography>No profile found. Please log in.</Typography>
          </Box>
        )}
      </Container>
      
      {/* Edit Profile Dialog */}
      <Dialog 
        open={isEditDialogOpen} 
        onClose={() => !updateLoading && setIsEditDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Button sx={{ mr: 1 }} onClick={() => setIsEditDialogOpen(false)}>
              &lt; Back
            </Button>
            <Typography variant="h6">Edit Profile</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 4, mt: 2 }}>
            <Grid container spacing={4}>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle1" gutterBottom>Profile Picture</Typography>
                {profile && (
                  <ProfilePictureUpload 
                    userId={profile.id}
                    currentProfilePicture={profile.profile_picture_url}
                    size={100}
                    onUploadSuccess={handleProfilePictureUpdate}
                  />
                )}
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle1" gutterBottom>Banner Picture</Typography>
                {/* Implement banner upload component */}
                <Box 
                  sx={{ 
                    width: '100%', 
                    height: 100,
                    borderRadius: 1,
                    overflow: 'hidden',
                    bgcolor: 'rgba(0,0,0,0.05)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    cursor: 'pointer',
                    '&:hover': {
                      bgcolor: 'rgba(0,0,0,0.1)'
                    }
                  }}
                >
                  {profile?.banner_picture_url ? (
                    <img 
                      src={profile.banner_picture_url} 
                      alt="Banner" 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    />
                  ) : (
                    <Typography variant="body2" color="text.secondary">Add Banner Image</Typography>
                  )}
                </Box>
              </Grid>
            </Grid>
          </Box>
          
          <Typography variant="h6" gutterBottom>Personal Information</Typography>
          <Box component="form" sx={{ mt: 1 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="First Name"
                  name="firstName"
                  value={editForm.firstName}
                  onChange={handleFormChange}
                  variant="outlined"
                  size="small"
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Middle Name"
                  name="middleName"
                  value={editForm.middleName}
                  onChange={handleFormChange}
                  variant="outlined"
                  size="small"
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Last Name"
                  name="lastName"
                  value={editForm.lastName}
                  onChange={handleFormChange}
                  variant="outlined"
                  size="small"
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={profile?.email || ''}
                  disabled
                  variant="outlined"
                  size="small"
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Username"
                  name="username"
                  value={editForm.username}
                  onChange={handleFormChange}
                  variant="outlined"
                  size="small"
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Phone Number"
                  name="phone"
                  value={editForm.phone}
                  onChange={handleFormChange}
                  variant="outlined"
                  size="small"
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Address"
                  name="address"
                  value={editForm.address}
                  onChange={handleFormChange}
                  variant="outlined"
                  size="small"
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Date of Birth"
                  name="dateOfBirth"
                  value={editForm.dateOfBirth}
                  onChange={handleFormChange}
                  placeholder="YYYY-MM-DD"
                  variant="outlined"
                  size="small"
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Gender"
                  name="gender"
                  value={editForm.gender}
                  onChange={handleFormChange}
                  variant="outlined"
                  size="small"
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Bio"
                  name="bio"
                  value={editForm.bio}
                  onChange={handleFormChange}
                  multiline
                  rows={3}
                  variant="outlined"
                  size="small"
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button 
            onClick={() => setIsEditDialogOpen(false)} 
            disabled={updateLoading}
            variant="outlined"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmitEdit} 
            variant="contained" 
            color="primary"
            disabled={updateLoading}
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Notification Snackbar */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseNotification} 
          severity={notification.severity}
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Profile;