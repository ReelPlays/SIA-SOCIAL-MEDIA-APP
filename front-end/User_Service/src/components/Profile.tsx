import React, { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Avatar,
  Button,
  Grid,
  AppBar,
  Toolbar,
  IconButton,
  Divider,
} from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import NotificationsIcon from '@mui/icons-material/Notifications';
import PersonIcon from '@mui/icons-material/Person';
import LogoutIcon from '@mui/icons-material/Logout';
import EditIcon from '@mui/icons-material/Edit';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

// Interface for user profile data
interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  email: string;
  birthday?: string;
  username?: string;
  bio?: string;
}

export const Profile: React.FC = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch user profile data
  useEffect(() => {
    const fetchProfile = async () => {
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
      } catch (err: any) {
        console.error('Error fetching profile:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProfile();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const handleEditProfile = () => {
    // Navigate to edit profile page or open modal
    navigate('/edit-profile');
  };

  // Default banner image (cats from the design)
  const bannerImage = "https://images.unsplash.com/photo-1526336024174-e58f5cdd8e13?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1374&q=80";

  return (
    <Box sx={{ bgcolor: '#f5f5f5', minHeight: '100vh' }}>
      <Container maxWidth="md" sx={{ mt: 2, mb: 4 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <Typography>Loading profile...</Typography>
          </Box>
        ) : error ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <Typography color="error">{error}</Typography>
          </Box>
        ) : profile ? (
          <Paper elevation={0} sx={{ borderRadius: 2, overflow: 'hidden' }}>
            {/* Banner Image */}
            <Box sx={{ position: 'relative', height: 200 }}>
              <Box
                component="img"
                src={bannerImage}
                alt="Profile Banner"
                sx={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
              
              {/* Profile Avatar - positioned to overlap the banner */}
              <Avatar
                sx={{
                  width: 120,
                  height: 120,
                  border: '4px solid white',
                  position: 'absolute',
                  bottom: -60,
                  left: 24,
                }}
                alt={`${profile.first_name} ${profile.last_name}`}
                src="/path-to-profile-image.jpg" // Replace with actual profile image path
              />
            </Box>
            
            {/* Profile Info Section */}
            <Box sx={{ pt: 8, px: 3, pb: 3 }}>
              <Typography variant="h4" fontWeight="bold">
                {profile.first_name} {profile.last_name}
              </Typography>
              
              <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
                @{profile.username || 'ecstasyrah'} {/* Fallback to example from design */}
              </Typography>
              
              <Typography variant="body1" sx={{ mb: 2 }}>
                {profile.bio || 'Que Sera Sera. QUE SERA SERA??!!!'} {/* Fallback to example from design */}
              </Typography>
              
              {/* Personal Information Section */}
              <Paper elevation={0} sx={{ p: 3, mt: 3, borderRadius: 2, border: '1px solid #eee' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" fontWeight="bold">
                    Personal Information
                  </Typography>
                  <Button 
                    startIcon={<EditIcon />} 
                    onClick={handleEditProfile}
                    sx={{ color: '#333' }}
                  >
                    Edit Profile
                  </Button>
                </Box>
                
                <Divider sx={{ mb: 2 }} />
                
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      First Name
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                      {profile.first_name}
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Birthday
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                      {profile.birthday || '07-30-2004'} {/* Fallback to example from design */}
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Middle Name
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                      {profile.middle_name || 'Ordoñez'} {/* Fallback to example from design */}
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Email
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                      {profile.email}
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Last Name
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                      {profile.last_name}
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>
            </Box>
          </Paper>
        ) : (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <Typography>No profile found. Please log in.</Typography>
          </Box>
        )}
      </Container>
    </Box>
  );
};

export default Profile;