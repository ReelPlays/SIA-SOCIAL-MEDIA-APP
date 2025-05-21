// src/App.tsx - Updated with ProfileProvider
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ApolloProvider } from '@apollo/client';
import { CssBaseline, ThemeProvider, createTheme, Box } from '@mui/material';
import { LoginForm } from './components/LoginForm';
import { SignupForm } from './components/SignupForm';
import Profile from './components/Profile';
import Posts from './components/Posts';
import Navigation from './components/Navigation';
import NotificationsPage from './components/NotificationsPage';
import { client } from './lib/apollo';
import { ProfileProvider } from './ProfileContext'; // Import the ProfileProvider

// Theme configuration as before...
const theme = createTheme({
  palette: {
    primary: { 
      main: '#815DAB',
      light: '#9d7fbe',
      dark: '#64468c',
      contrastText: '#ffffff',
    },
    secondary: { 
      main: '#4A4A4A',
    },
    background: {
      default: '#ffffff',
      paper: '#ffffff',
    },
    text: {
      primary: '#333333',
      secondary: '#666666',
    },
    error: { 
      main: '#E53935',
    },
    info: {
      main: '#1DA1F2', // Twitter blue for interactive elements
    }
  },
  typography: {
    fontFamily: '"Segoe UI", Roboto, "Helvetica Neue", sans-serif',
    h6: { 
      fontWeight: 600,
      fontSize: '1.15rem', 
    },
    body1: { 
      fontSize: '0.95rem', 
    },
    body2: { 
      fontSize: '0.875rem', 
    },
    button: { 
      textTransform: 'none',
      fontWeight: 500,
    },
  },
  shape: {
    borderRadius: 4,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: 'none',
          },
        },
        contained: {
          '&:hover': {
            backgroundColor: '#64468c',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          boxShadow: 'none',
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: '#f0f0f0',
        },
      },
    },
    MuiAvatar: {
      styleOverrides: {
        root: {
          fontSize: '1rem',
          fontWeight: 'bold',
        },
      },
    },
  },
});

function App() {
  return (
    <ApolloProvider client={client}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <ProfileProvider>
          <Router>
            <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
              <Navigation />
              <Routes>
                <Route path="/login" element={<LoginForm />} />
                <Route path="/signup" element={<SignupForm />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/posts" element={<Posts />} />
                <Route path="/notifications" element={<NotificationsPage />} />
                <Route path="/" element={<Navigate to="/login" replace />} />
              </Routes>
            </Box>
          </Router>
        </ProfileProvider>
      </ThemeProvider>
    </ApolloProvider>
  );
}

export default App;