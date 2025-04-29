import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
} from '@mui/material';
import {
  Menu as MenuIcon,
  Home as HomeIcon,
  Add as AddIcon,
  Person as PersonIcon,
  Login as LoginIcon,
  Logout as LogoutIcon,
} from '@mui/icons-material';
import { supabase } from '../lib/supabase';

export default function Navigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  
  // Check if user is logged in
  useState(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
    };
    checkUser();
  });
  
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
    navigate('/login');
    handleMenuClose();
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
        <ListItem button onClick={() => navigate('/posts')}>
          <ListItemIcon>
            <HomeIcon />
          </ListItemIcon>
          <ListItemText primary="Posts" />
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
      <AppBar position="static">
        <Toolbar>
          {isMobile && (
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
          )}
          
          <Typography
            variant="h6"
            noWrap
            component="div"
            sx={{ display: { xs: 'none', sm: 'block' }, cursor: 'pointer' }}
            onClick={() => navigate('/posts')}
          >
            SIA Social
          </Typography>
          
          <Box sx={{ flexGrow: 1 }} />
          
          {!isMobile && user && (
            <Container 
              maxWidth="md" 
              sx={{ 
                display: 'flex', 
                justifyContent: 'center',
                position: 'absolute',
                left: '50%',
                transform: 'translateX(-50%)'
              }}
            >
              <Button 
                color="inherit" 
                startIcon={<HomeIcon />}
                onClick={() => navigate('/posts')}
                sx={{ mx: 1 }}
              >
                Posts
              </Button>
              <Button 
                color="inherit" 
                startIcon={<AddIcon />}
                onClick={() => navigate('/create-post')}
                sx={{ mx: 1 }}
              >
                Create Post
              </Button>
              <Button 
                color="inherit" 
                startIcon={<PersonIcon />}
                onClick={() => navigate('/profile')}
                sx={{ mx: 1 }}
              >
                Profile
              </Button>
              <Button 
                color="inherit" 
                startIcon={<LogoutIcon />}
                onClick={handleLogout}
                sx={{ mx: 1 }}
              >
                Logout
              </Button>
            </Container>
          )}
          
          <Box sx={{ flexGrow: 1 }} />
          
          {user ? (
            <IconButton
              edge="end"
              aria-label="account of current user"
              aria-controls={menuId}
              aria-haspopup="true"
              onClick={handleProfileMenuOpen}
              color="inherit"
            >
              <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main' }}>
                {user.email ? user.email[0].toUpperCase() : '?'}
              </Avatar>
            </IconButton>
          ) : (
            <Button color="inherit" onClick={() => navigate('/login')}>
              Login
            </Button>
          )}
        </Toolbar>
      </AppBar>
      
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true, // Better open performance on mobile
        }}
        sx={{
          display: { xs: 'block', sm: 'none' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: 240 },
        }}
      >
        {drawer}
      </Drawer>
      
      {renderMenu}
    </Box>
  );
}