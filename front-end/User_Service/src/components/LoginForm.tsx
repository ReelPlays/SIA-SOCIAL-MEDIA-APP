import React, { useState } from 'react';
import { Box, Button, TextField, Typography, Container, Alert, Avatar, Link, AppBar, Toolbar } from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'; // Added an icon
import { useNavigate } from 'react-router-dom';
import { signInWithEmail } from '../lib/supabase'; // Assuming this is correct

export const LoginForm: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signInWithEmail(formData.email, formData.password);
      navigate('/posts'); // Redirect after successful login
    } catch (err: any) {
      console.error('Login failed:', err);
      // Improved error message handling (use Supabase specific errors if possible)
      setError(err.message || 'Invalid login credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <>
      {/* Navigation Bar */}
      <AppBar position="fixed" sx={{ backgroundColor: 'white', boxShadow: 1 }}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, color: '#815DAB', fontWeight: 'bold' }}>
            ConnectMe
          </Typography>
          {/* You can add navigation links here if needed */}
        </Toolbar>
      </AppBar>
      
      <Container
        component="main" // Use main semantic tag
        sx={{
          // Keep the background settings, but ensure the container itself
          // is centered if the background covers the whole page.
          display: 'flex',
          justifyContent: 'center', // Center the form horizontally
          alignItems: 'center',
          minHeight: '100vh',
          width: '100%',
          maxWidth: '100% !important', // Override default maxWidth of Container if needed for bg
          margin: 0,
          padding: 2, // Add some padding around the form box if needed
          position: 'fixed', // Keep fixed if you want it always covering viewport
          backgroundColor: '#FBF7FF', // Semi-transparent white background
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          overflowY: 'auto',
          paddingTop: '64px', // Add padding to account for the AppBar height
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center', // Center items inside the box (icon, title, form)
            width: '100%',
            maxWidth: 420, // Slightly wider? Adjust as needed
            backgroundColor: 'background.paper', // Use theme's paper color (usually white/off-white) - more adaptable
            padding: (theme) => theme.spacing(4), // Use theme spacing for consistent padding (e.g., 32px)
            borderRadius: 2, // Slightly larger radius for a softer look
            boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.1)', // Softer, more modern shadow
            mt: -10, // Add some margin top if not perfectly centered vertically by Container
            mb: 4, // Margin bottom
          }}
        >
          {/* Added an Avatar with an Icon */}
          <Typography component="h1" variant="h5 " sx={{ mb: 3, fontWeight: 'bold' }}>
            Sign in
          </Typography>
          <Box component="form" onSubmit={handleSubmit} noValidate sx={{ width: '100%' }}>
            {error && (
              <Alert severity="error" sx={{ mb: 2, width: '100%' }}>
                {error}
              </Alert>
            )}
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email Address"
              name="email"
              autoComplete="email"
              autoFocus
              variant="outlined" // Use outlined variant for a cleaner look
              value={formData.email}
              onChange={handleChange}
              error={!!error} // Highlight field if there's a general login error
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type="password"
              id="password"
              autoComplete="current-password"
              variant="outlined" // Use outlined variant
              value={formData.password}
              onChange={handleChange}
              error={!!error} // Highlight field if there's a general login error
            />
            {/* Optional: Add Forgot Password Link */}
            <Box sx={{ textAlign: 'right', width: '100%', mt: 1 }}>
               <Link href="#" variant="body2" onClick={(e) => {e.preventDefault(); alert('Forgot password clicked!'); /* Implement navigation */}}>
                 Forgot password?
               </Link>
            </Box>
            <Button
              type="submit"
              fullWidth
              variant="contained" // Standard contained button for primary action
              color="primary" // Use theme's primary color
              sx={{ mt: 3, mb: 2, py: 1.5, backgroundColor: '#815DAB', '&:hover': { backgroundColor: '#6a4c8f' } }} // Added custom color
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
            <Button
              fullWidth
              variant="text" // Keep text for secondary action
              onClick={() => navigate('/signup')}
              sx={{ mt: 1 }} // Add some margin top
            >
              Don't have an account? Sign Up
            </Button>
          </Box>
        </Box>
      </Container>
    </>
  );
};

// --- Make sure you have a theme provider setup in your App ---
// For theme colors like 'background.paper', 'primary', 'secondary' to work best,
// wrap your application root (e.g., in index.tsx or App.tsx) with ThemeProvider
// import { ThemeProvider, createTheme } from '@mui/material/styles';
// import CssBaseline from '@mui/material/CssBaseline';
//
// const theme = createTheme({
//   palette: {
//     primary: {
//       main: '#556cd6', // Example primary color
//     },
//     secondary: {
//       main: '#19857b', // Example secondary color
//     },
//     background: {
//       paper: '#ffffff', // Define paper color explicitly if needed
//     },
//   },
// });
//
// // In your main App component render:
// <ThemeProvider theme={theme}>
//   <CssBaseline /> {/* Helps normalize styles */}
//   {/* Your App Content including the LoginForm */}
// </ThemeProvider>