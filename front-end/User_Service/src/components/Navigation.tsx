import React, { useState, useEffect } from 'react'; // Import useEffect
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@apollo/client'; // Import useQuery
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Box,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  useMediaQuery,
  useTheme,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Container,
  Badge, // Import Badge
} from '@mui/material';
import {
  Menu as MenuIcon,
  Home as HomeIcon,
  Add as AddIcon,
  Person as PersonIcon,
  Login as LoginIcon,
  Logout as LogoutIcon,
  Notifications as NotificationsIcon, // Import NotificationsIcon
} from '@mui/icons-material';
import { supabase } from '../lib/supabase';
import { GET_MY_NOTIFICATIONS } from '../graphql/queries'; // Import the query

export default function Navigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState<any>(null);

  // Fetch Notifications Query
  const { data: notificationData, loading: notificationLoading, error: notificationError, refetch: refetchNotifications } = useQuery(GET_MY_NOTIFICATIONS, {
    variables: { filter: 'unread', limit: 100 }, // Fetch up to 100 unread notifications for count
    skip: !user, // Skip query if user is not logged in
    pollInterval: 30000, // Optional: Poll every 30 seconds
    fetchPolicy: 'network-only', // Ensure fresh data is fetched
    notifyOnNetworkStatusChange: true, // Useful for showing loading states
  });

  // Calculate unread count
  const unreadCount = notificationData?.getMyNotifications?.length || 0;

  // Check if user is logged in and refetch notifications on user change
  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
      if (data.user) {
         refetchNotifications(); // Refetch notifications when user logs in
      }
    };
    checkUser();

    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
           refetchNotifications(); // Refetch on auth change
        }
      }
    );

    // Cleanup listener on component unmount
    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [refetchNotifications]); // Add refetchNotifications to dependency array

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null); // Clear user state immediately
    // No need to navigate here if onAuthStateChange handles it
    handleMenuClose();
  };

  const handleNotificationClick = () => {
    // Navigate to a notifications page (create this route/page)
    navigate('/notifications');
     if(isMobile) handleDrawerToggle(); // Close drawer if mobile
  };

  const menuId = 'primary-account-menu';
  const isMenuOpen = Boolean(anchorEl);

  const renderMenu = (
    <Menu
      anchorEl={anchorEl}
      id={menuId}
      keepMounted
      open={isMenuOpen}
      onClose={handleMenuClose}
    >
      <MenuItem onClick={() => { navigate('/profile'); handleMenuClose(); }}>
        Profile
      </MenuItem>
      <Divider />
      <MenuItem onClick={handleLogout}>
        Logout
      </MenuItem>
    </Menu>
  );

  const drawer = (
    <Box onClick={handleDrawerToggle} sx={{ textAlign: 'center' }}>
      <Typography variant="h6" sx={{ my: 2 }}>
        SIA Social
      </Typography>
      <Divider />
      <List>
        {user && ( // Only show these links if logged in
          <>
            <ListItem button onClick={() => navigate('/posts')}>
              <ListItemIcon>
                <HomeIcon />
              </ListItemIcon>
              <ListItemText primary="Posts" />
            </ListItem>
            <ListItem button onClick={handleNotificationClick}> {/* Add Notifications link */}
              <ListItemIcon>
                 <Badge badgeContent={unreadCount} color="error">
                    <NotificationsIcon />
                 </Badge>
              </ListItemIcon>
              <ListItemText primary="Notifications" />
            </ListItem>
            <ListItem button onClick={() => navigate('/create-post')}>
              <ListItemIcon>
                <AddIcon />
              </ListItemIcon>
              <ListItemText primary="Create Post" />
            </ListItem>
            <ListItem button onClick={() => navigate('/profile')}>
              <ListItemIcon>
                <PersonIcon />
              </ListItemIcon>
              <ListItemText primary="Profile" />
            </ListItem>
          </>
        )}
        {!user ? (
          <ListItem button onClick={() => navigate('/login')}>
            <ListItemIcon>
              <LoginIcon />
            </ListItemIcon>
            <ListItemText primary="Login" />
          </ListItem>
        ) : (
          <ListItem button onClick={handleLogout}>
            <ListItemIcon>
              <LogoutIcon />
            </ListItemIcon>
            <ListItemText primary="Logout" />
          </ListItem>
        )}
      </List>
    </Box>
  );

  // Don't show navigation on login and signup pages
  if (location.pathname === '/login' || location.pathname === '/signup') {
    return null;
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="fixed" sx={{ backgroundColor: 'white', boxShadow: 1 }}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, color: '#815DAB', fontWeight: 'bold' }}>
            ConnectMe
          </Typography>
          
          {user && (
            <Box sx={{ display: 'flex' }}>
              <IconButton color="inherit" onClick={() => navigate('/posts')}>
                <HomeIcon sx={{ color: '#333' }} />
              </IconButton>
              <IconButton 
                color="inherit" 
                onClick={handleNotificationClick}
              >
                <Badge badgeContent={unreadCount} color="error">
                  <NotificationsIcon sx={{ color: '#333' }} />
                </Badge>
              </IconButton>
              <IconButton color="inherit" onClick={() => navigate('/create-post')}>
                <AddIcon sx={{ color: '#333' }} />
              </IconButton>
              <IconButton
                edge="end"
                aria-label="account of current user"
                aria-controls={menuId}
                aria-haspopup="true"
                onClick={handleProfileMenuOpen}
                color="inherit"
              >
                <Avatar sx={{ width: 32, height: 32, bgcolor: '#815DAB' }}>
                  {user.email ? user.email[0].toUpperCase() : '?'}
                </Avatar>
              </IconButton>
            </Box>
          )}
          
          {!user && (
            <Button 
              color="inherit" 
              onClick={() => navigate('/login')}
              sx={{ color: '#815DAB' }}
            >
              Login
            </Button>
          )}
        </Toolbar>
      </AppBar>

      {/* Mobile Drawer - keep this for mobile responsiveness */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true,
        }}
        sx={{
          display: { xs: 'block', sm: 'none' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: 240 },
        }}
      >
        {drawer}
      </Drawer>

      {/* Profile Menu */}
      {renderMenu}
      
      {/* Add padding to account for fixed AppBar */}
      <Box sx={{ height: { xs: 56, sm: 64 } }} />
    </Box>
  );
}