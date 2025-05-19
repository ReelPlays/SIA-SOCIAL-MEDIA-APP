// src/components/Navigation.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Box,
  Avatar,
  Badge,
  Menu,
  MenuItem,
  Divider,
  useTheme,
} from '@mui/material';
import {
  Home as HomeIcon,
  Notifications as NotificationsIcon,
  Add as AddIcon,
  Logout as LogoutIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { supabase } from '../lib/supabase';
import { GET_MY_NOTIFICATIONS } from '../graphql/queries';

export default function Navigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const [profileAnchorEl, setProfileAnchorEl] = useState<null | HTMLElement>(null);
  const [user, setUser] = useState<any>(null);

  // Fetch Notifications Query
  const { data: notificationData } = useQuery(GET_MY_NOTIFICATIONS, {
    variables: { filter: 'unread', limit: 100 },
    skip: !user,
    pollInterval: 30000,
  });

  // Calculate unread count
  const unreadCount = notificationData?.getMyNotifications?.length || 0;

  // Check if user is logged in
  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
    };
    checkUser();

    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setProfileAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setProfileAnchorEl(null);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    handleMenuClose();
    navigate('/login');
  };

  // Don't show navigation on login and signup pages
  if (location.pathname === '/login' || location.pathname === '/signup') {
    return null;
  }

  const isProfileOpen = Boolean(profileAnchorEl);

  return (
    <AppBar 
      position="fixed" 
      sx={{ 
        backgroundColor: 'white', 
        boxShadow: 'none',
        borderBottom: '1px solid #f0f0f0',
        zIndex: theme.zIndex.drawer + 1,
      }}
    >
      <Toolbar sx={{ px: { xs: 2, md: 4 }, justifyContent: 'space-between' }}>
        {/* Logo */}
        <Typography 
          variant="h6" 
          component="div" 
          sx={{ 
            color: '#815DAB', 
            fontWeight: 'bold',
            cursor: 'pointer' 
          }}
          onClick={() => navigate('/')}
        >
          ConnectMe
        </Typography>
        
        {/* Icon Navigation */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton 
            color="inherit" 
            onClick={() => navigate('/posts')}
            sx={{ 
              color: location.pathname === '/posts' ? '#815DAB' : '#666',
              '&:hover': { color: '#815DAB' }
            }}
          >
            <HomeIcon />
          </IconButton>
          
          <IconButton 
            color="inherit" 
            onClick={() => navigate('/notifications')}
            sx={{ 
              color: location.pathname === '/notifications' ? '#815DAB' : '#666',
              '&:hover': { color: '#815DAB' }
            }}
          >
            <Badge badgeContent={unreadCount} color="error">
              <NotificationsIcon />
            </Badge>
          </IconButton>
          
          <IconButton 
            color="inherit" 
            onClick={() => navigate('/create-post')}
            sx={{ 
              color: location.pathname === '/create-post' ? '#815DAB' : '#666',
              '&:hover': { color: '#815DAB' }
            }}
          >
            <AddIcon />
          </IconButton>
          
          {user ? (
            <IconButton
              edge="end"
              aria-label="account"
              aria-haspopup="true"
              onClick={handleProfileMenuOpen}
              color="inherit"
              sx={{ ml: 1 }}
            >
              <Avatar 
                sx={{ 
                  width: 32, 
                  height: 32, 
                  bgcolor: '#815DAB',
                  border: '2px solid #f0f0f0'
                }}
              >
                {user.email ? user.email[0].toUpperCase() : '?'}
              </Avatar>
            </IconButton>
          ) : (
            <IconButton 
              color="inherit" 
              onClick={() => navigate('/login')}
              sx={{ 
                color: '#666',
                '&:hover': { color: '#815DAB' }
              }}
            >
              <PersonIcon />
            </IconButton>
          )}
        </Box>
        
        {/* Profile Menu */}
        <Menu
          id="profile-menu"
          anchorEl={profileAnchorEl}
          keepMounted
          open={isProfileOpen}
          onClose={handleMenuClose}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          PaperProps={{
            elevation: 1,
            sx: { 
              mt: 1, 
              width: 200,
              borderRadius: 2,
              border: '1px solid #f0f0f0'
            }
          }}
        >
          <MenuItem onClick={() => { navigate('/profile'); handleMenuClose(); }}>
            <PersonIcon fontSize="small" sx={{ mr: 1.5 }} />
            Profile
          </MenuItem>
          <Divider />
          <MenuItem onClick={handleLogout} sx={{ color: '#f44336' }}>
            <LogoutIcon fontSize="small" sx={{ mr: 1.5 }} />
            Logout
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
}