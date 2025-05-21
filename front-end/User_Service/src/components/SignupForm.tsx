import React, { useState } from 'react';
import { Box, Button, TextField, Typography, Container, Alert, AppBar, Toolbar, Link } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { RegisterData } from '../lib/supabase'; // Assuming this type definition exists
import { signUpWithEmail } from '../lib/supabase'; // Assuming this function exists

export const SignupForm: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<RegisterData>({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    address: '', // Optional field
    phone: '',   // Optional field
    age: '',     // Required field, initialize as string for TextField
    gender: '',   // Optional field
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Basic validation (add more specific checks if needed)
    if (!formData.email || !formData.password || !formData.first_name || !formData.last_name || !formData.age) {
        setError('Please fill in all required fields.');
        setLoading(false);
        return;
    }

    // Convert age back to number if your backend/type expects it
    const dataToSend = {
        ...formData,
        age: parseInt(formData.age.toString(), 10) || 0 // Ensure age is a number
    };


    try {
      await signUpWithEmail(dataToSend); // Use the object with potentially parsed age
      navigate('/'); // Navigate to home or maybe login page after signup?
    } catch (err: any) {
      console.error('Signup failed:', err);
      // Use Supabase specific errors if possible, otherwise fallback
      setError(err?.message || 'Failed to create account. Please try again.');
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
      <AppBar position="fixed" sx={{ backgroundColor: 'white', boxShadow: 1}}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, color: '#815DAB', fontWeight: 'bold' }}>
            ConnectMe
          </Typography>
        </Toolbar>
      </AppBar>
      
      <Container
        component="main"
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          width: '100%',
          maxWidth: '100% !important',
          margin: 0,
          padding: 2,
          position: 'fixed',
          backgroundColor: '#FBF7FF', // Light purple background
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          overflowY: 'auto',
          paddingTop: '64px', // Add padding for the AppBar
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%',
            maxWidth: 500, // Increased from 420 to make the form wider
            backgroundColor: 'white',
            padding: 4,
            borderRadius: 2,
            boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.1)',
            mt: 30,
            mb: 4,
            // Removed maxHeight and overflowY to eliminate scrolling
          }}
        >
          {/* Removed the gray circle placeholder */}
          
          <Typography component="h1" variant="h5" sx={{ mb: 3, fontWeight: 'bold' }}>
            Sign Up
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
              variant="outlined"
              value={formData.email}
              onChange={handleChange}
              error={!!error && !formData.email}
              disabled={loading}
            />
            
            <TextField
              margin="normal"
              required
              fullWidth
              id="first_name"
              label="First Name"
              name="first_name"
              autoComplete="given-name"
              variant="outlined"
              value={formData.first_name}
              onChange={handleChange}
              error={!!error && !formData.first_name}
              disabled={loading}
            />
            
            <TextField
              margin="normal"
              required
              fullWidth
              id="last_name"
              label="Last Name"
              name="last_name"
              autoComplete="family-name"
              variant="outlined"
              value={formData.last_name}
              onChange={handleChange}
              error={!!error && !formData.last_name}
              disabled={loading}
            />
            
            <TextField
              margin="normal"
              fullWidth
              id="address"
              label="Address (Optional)"
              name="address"
              autoComplete="street-address"
              variant="outlined"
              value={formData.address}
              onChange={handleChange}
              disabled={loading}
            />
            
            <TextField
              margin="normal"
              fullWidth
              id="phone"
              label="Phone Number (Optional)"
              name="phone"
              autoComplete="tel"
              variant="outlined"
              value={formData.phone}
              onChange={handleChange}
              disabled={loading}
            />
            
            <TextField
              margin="normal"
              required
              fullWidth
              id="age"
              label="Age"
              name="age"
              type="number"
              variant="outlined"
              value={formData.age}
              onChange={handleChange}
              error={!!error && !formData.age}
              disabled={loading}
              InputProps={{ inputProps: { min: 0 } }}
            />
            
            <TextField
              margin="normal"
              fullWidth
              id="gender"
              label="Gender (Optional)"
              name="gender"
              variant="outlined"
              value={formData.gender}
              onChange={handleChange}
              disabled={loading}
            />
            
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type="password"
              id="password"
              autoComplete="new-password"
              variant="outlined"
              value={formData.password}
              onChange={handleChange}
              error={!!error && !formData.password}
              disabled={loading}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ 
                mt: 3, 
                mb: 2, 
                py: 1.5, 
                backgroundColor: '#815DAB', 
                '&:hover': { 
                  backgroundColor: '#6a4c8f' 
                } 
              }}
              disabled={loading}
            >
              {loading ? 'Creating Account...' : 'Create account'}
            </Button>
            
            <Box sx={{ textAlign: 'center', mt: 1 }}>
              <Typography variant="body2">
                Already have an account? <Link href="#" onClick={(e) => {e.preventDefault(); navigate('/login');}} sx={{ color: '#815DAB' }}>Sign in</Link>
              </Typography>
            </Box>
          </Box>
        </Box>
      </Container>
    </>
  );
};