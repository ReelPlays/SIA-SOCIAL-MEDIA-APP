import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ApolloProvider } from '@apollo/client';
import { CssBaseline, ThemeProvider, createTheme, Box } from '@mui/material';
import { LoginForm } from './components/LoginForm';
import { SignupForm } from './components/SignupForm';
import Profile from './components/Profile';
import PostForm from './components/PostForm';
import Posts from './components/Posts';
import Navigation from './components/Navigation';
import NotificationsPage from './components/NotificationsPage'; // <-- Import the new page
import { client } from './lib/apollo';

// Create a custom theme (keep your existing theme)
const theme = createTheme({
  palette: {
    primary: { main: '#1976d2' },
    secondary: { main: '#dc004e' },
    background: {
      default: '#f4f6f8', // Light gray background
    },
  },
  typography: {
    fontFamily: 'Roboto, sans-serif',
    h4: { fontWeight: 700 },
    body1: { fontSize: '1rem' },
  },
  shape: {
    borderRadius: 12,
  },
});

function App() {
  return (
    <ApolloProvider client={client}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Router>
          <Navigation />
          {/* Add some padding top if Navigation is fixed, otherwise adjust as needed */}
          <Box sx={{ pt: { xs: 8, sm: 9 } }}> {/* Adjust padding top based on AppBar height */}
            <Routes>
              <Route path="/login" element={<LoginForm />} />
              <Route path="/signup" element={<SignupForm />} />
              <Route path="/profile" element={<Profile />} /> {/* Assuming this is the logged-in user's profile */}
              {/* Add route for viewing other profiles if needed, e.g., /profile/:userId */}
              <Route path="/posts" element={<Posts />} />
              <Route path="/create-post" element={<PostForm />} />
              <Route path="/notifications" element={<NotificationsPage />} /> {/* <-- Add route for notifications */}
              <Route path="/" element={<Navigate to="/posts" replace />} /> {/* Default route */}
              {/* Add other routes, e.g., for individual posts /posts/:postId */}
            </Routes>
          </Box>
        </Router>
      </ThemeProvider>
    </ApolloProvider>
  );
}

export default App;