import React, { useState } from 'react';
import { Box, Button, TextField, Typography, Container, Alert, Avatar, Link } from '@mui/material';
// Choose an appropriate icon for Sign Up
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1'; // Example: Person Add Icon
import { useNavigate } from 'react-router-dom';
import { RegisterData } from '../lib/supabase'; // Assuming this type definition exists
import { signUpWithEmail } from '../lib/supabase'; // Assuming this function exists

// Define the RegisterData type if it's not imported or needs updating
// interface RegisterData {
//   email: string;
//   password: string;
//   first_name: string;
//   last_name: string;
//   address: string;
//   phone: string;
//   age: number | string; // Use string if input type="number" causes issues, then parse
//   gender: string;
// }

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

  // Determine if fields should be highlighted based on general error state
  const hasError = !!error;

  return (
    // Use Container for background and centering, like the LoginForm example
    <Container
      component="main" // Use main semantic tag
      sx={{
        display: 'flex',
        justifyContent: 'center', // Center the form horizontally
        alignItems: 'center',     // Center vertically
        minHeight: '100vh',
        width: '100%',
        maxWidth: '100% !important', // Override default maxWidth of Container for full bg
        margin: 0,
        padding: 2, // Add padding around the form box
        backgroundImage: 'url(/login-bg.svg)', // Use your desired background
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        position: 'fixed', // Keep fixed to cover viewport even on scroll
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflowY: 'auto', // Allow scrolling if form box gets too tall on small screens
      }}
    >
      {/* Use Box for the form itself, styled like LoginForm */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center', // Center items inside the box (icon, title, form)
          width: '100%',
          maxWidth: 420, // Consistent width with login example
          backgroundColor: 'background.paper', // Theme-aware background color
          padding: (theme) => theme.spacing(4), // Consistent theme spacing (e.g., 32px)
          borderRadius: 2, // Consistent border radius
          boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.1)', // Consistent shadow
          mt: { xs: 4, sm: 8 }, // Margin top (less on extra small screens)
          mb: 4, // Margin bottom
          maxHeight: '95vh', // Prevent box from exceeding viewport significantly
          overflowY: 'auto', // Allow scrolling within the box if content overflows
        }}
      >
        {/* Avatar and Icon for Sign Up */}
        <Avatar sx={{ m: 1, bgcolor: 'secondary.main' }}>
           {/* Choose an icon that fits signup */}
          <PersonAddAlt1Icon />
        </Avatar>
        <Typography component="h1" variant="h5" sx={{ mb: 3 }}>
          Sign up
        </Typography>
        <Box component="form" onSubmit={handleSubmit} noValidate sx={{ width: '100%' }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2, width: '100%' }}>
              {error}
            </Alert>
          )}

          {/* Signup Fields - using outlined variant and error prop */}
          <TextField
            margin="normal"
            required
            fullWidth
            id="email"
            label="Email Address"
            name="email"
            autoComplete="email"
            autoFocus
            variant="outlined" // Match design
            value={formData.email}
            onChange={handleChange}
            error={hasError && !formData.email} // Example: Highlight if error exists and field is empty
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
            variant="outlined" // Match design
            value={formData.first_name}
            onChange={handleChange}
            error={hasError && !formData.first_name} // Example highlighting
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
            variant="outlined" // Match design
            value={formData.last_name}
            onChange={handleChange}
            error={hasError && !formData.last_name} // Example highlighting
            disabled={loading}
          />
          <TextField // Optional fields
            margin="normal"
            fullWidth
            id="address"
            label="Address (Optional)"
            name="address"
            autoComplete="street-address"
            variant="outlined" // Match design
            value={formData.address}
            onChange={handleChange}
            disabled={loading}
          />
          <TextField // Optional fields
            margin="normal"
            fullWidth
            id="phone"
            label="Phone Number (Optional)"
            name="phone"
            autoComplete="tel"
            variant="outlined" // Match design
            value={formData.phone}
            onChange={handleChange}
            disabled={loading}
          />
          <TextField // Required Age field
            margin="normal"
            required
            fullWidth
            id="age"
            label="Age"
            name="age"
            type="number" // Keeps number input benefits
            variant="outlined" // Match design
            value={formData.age} // Controlled as string
            onChange={handleChange}
            error={hasError && !formData.age} // Example highlighting
            disabled={loading}
            InputProps={{ inputProps: { min: 0 } }} // Prevent negative numbers
          />
          <TextField // Optional fields
            margin="normal"
            fullWidth
            id="gender"
            label="Gender (Optional)"
            name="gender"
            variant="outlined" // Match design
            value={formData.gender}
            onChange={handleChange}
            disabled={loading}
            // Consider using a Select component here for better UX
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
            variant="outlined" // Match design
            value={formData.password}
            onChange={handleChange}
            error={hasError && !formData.password} // Example highlighting
            disabled={loading}
          />

          {/* Primary Action Button - Sign Up */}
          <Button
            type="submit"
            fullWidth
            variant="contained" // Match design
            color="primary"     // Match design
            sx={{ mt: 3, mb: 2, py: 1.5 }} // Match design (chunky button)
            disabled={loading}
          >
            {loading ? 'Creating Account...' : 'Sign Up'}
          </Button>

          {/* Secondary Action Button - Navigate to Sign In */}
          <Button
            fullWidth
            variant="text" // Match design
            onClick={() => navigate('/login')} // Navigate to the login page
            sx={{ mt: 1 }} // Match design
            disabled={loading}
          >
            Already have an account? Sign In
          </Button>
        </Box>
      </Box>
    </Container>
  );
};

// --- Reminder: Ensure ThemeProvider is set up in your App ---
// As mentioned in the LoginForm example, styles like 'background.paper',
// 'primary', 'secondary', and theme.spacing() rely on Material UI's
// ThemeProvider wrapping your application.