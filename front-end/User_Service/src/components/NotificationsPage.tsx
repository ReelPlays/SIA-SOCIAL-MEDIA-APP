import React, { useEffect, useState, useCallback } from 'react';
import { useQuery } from '@apollo/client'; // Import useQuery
import { Link as RouterLink, useNavigate } from 'react-router-dom'; // Import RouterLink and useNavigate
import {
  Container,
  Typography,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  CircularProgress,
  Alert,
  Box,
  Paper,
  Button,
  Link as MuiLink, // Use MUI Link for consistency within text
  Divider, // Keep Divider if needed for styling
} from '@mui/material';
import { formatDistanceToNow } from 'date-fns'; // For nice date formatting
import FollowButton from './FollowButton'; // Import the FollowButton component
import { GET_FEED } from '../graphql/queries'; // *** CHANGE: Import the GET_FEED query ***
import { supabase } from '../lib/supabase'; // To get current user

// *** CHANGE: Define interfaces matching the GET_FEED response ***
interface FeedPostAuthor {
  __typename?: 'Account';
  accountId: string;
  firstName: string;
  lastName: string;
  isFollowing: boolean; // Field from GET_FEED query
}

interface FeedPost {
  __typename?: 'Post';
  postId: string;
  title?: string | null;
  content: string;
  createdAt: string; // ISO string date
  author: FeedPostAuthor;
}

// Interface for current user data from Supabase (keep as is)
interface Account {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
}

// Component to display the feed
const NotificationsPage: React.FC = () => {
    const [currentUser, setCurrentUser] = useState<Account | null>(null);
    const [currentUserLoading, setCurrentUserLoading] = useState(true);
    const navigate = useNavigate();

    // Fetch current user details via Supabase (keep this logic)
    useEffect(() => {
         fetchCurrentUser();
     }, []);

    const fetchCurrentUser = useCallback(async () => {
       setCurrentUserLoading(true);
       try {
           const { data: { user } } = await supabase.auth.getUser();
           if (user) {
               const { data, error } = await supabase
                   .from('accounts')
                   .select('id, first_name, last_name, email')
                   .eq('id', user.id)
                   .single();
               if (error) throw error;
               setCurrentUser(data);
           } else {
               setCurrentUser(null);
           }
       } catch (error) {
           console.error('Error fetching current user:', error);
           setCurrentUser(null);
       } finally {
           setCurrentUserLoading(false);
       }
    }, []);


    // *** CHANGE: Fetch the feed using GET_FEED query ***
    const { data, loading, error, refetch } = useQuery<{ getFeed: FeedPost[] }>(
        GET_FEED, // Use the feed query
        {
            variables: { limit: 20, offset: 0 }, // Example pagination
            fetchPolicy: 'cache-and-network',
            skip: !currentUser, // Don't run query until current user is loaded
            notifyOnNetworkStatusChange: true,
        }
    );

   // Refetch feed when current user changes
   useEffect(() => {
     if (currentUser && !currentUserLoading) {
       refetch();
     }
   }, [currentUser, currentUserLoading, refetch]);

    // Callback to update UI after follow/unfollow action
    const handleFollowUpdate = useCallback(() => {
        refetch(); // Simple refetch for now
    }, [refetch]);

    // --- Render Logic ---
    const isLoading = (loading && !data) || currentUserLoading;

    if (isLoading) {
        return ( <Box display="flex" justifyContent="center" alignItems="center" height="50vh"><CircularProgress /></Box> );
    }

    if (error) {
        return ( <Container maxWidth="md" sx={{ mt: 4 }}><Alert severity="error">Error loading feed: {error.message}</Alert><Button onClick={() => refetch()} sx={{ mt: 1 }}>Retry</Button></Container> );
    }

    if (!currentUser) {
       return ( <Container maxWidth="md" sx={{ mt: 4, textAlign: 'center' }}><Typography variant="h6" gutterBottom>Welcome!</Typography><Typography>Please log in to see your personalized feed.</Typography><Button variant="contained" onClick={() => navigate('/login')} sx={{mt: 2}}>Login</Button></Container> );
    }

    // *** CHANGE: Access data using data.getFeed ***
    const posts = data?.getFeed || [];

    return (
        <Container maxWidth="md" sx={{ mt: 2, mb: 4 }}>
            {/* *** CHANGE: Update Title *** */}
            <Typography variant="h4" gutterBottom sx={{ textAlign: 'center', mb: 3 }}>
                Feed
            </Typography>
            {/* *** CHANGE: Render posts instead of notifications *** */}
            <List sx={{ width: '100%', bgcolor: 'transparent', padding: 0 }}>
                {posts.length === 0 ? (
                    <Paper elevation={0} sx={{ p: 3, textAlign: 'center', borderRadius: 2 }}>
                        <Typography variant="h6">Nothing new yet!</Typography>
                        <Typography color="text.secondary">Posts from people you follow will appear here.</Typography>
                    </Paper>
                ) : (
                    posts.map((post) => (
                        <Paper key={post.postId} elevation={1} sx={{ mb: 2, borderRadius: 2, overflow: 'hidden' }}>
                            <ListItem alignItems="flex-start" sx={{ p: 2 }}>
                                <ListItemAvatar sx={{ mt: 0.5 }}>
                                    <RouterLink to={`/profile/${post.author.accountId}`}>
                                        <Avatar sx={{ bgcolor: 'primary.light', cursor: 'pointer' }}>
                                            {post.author?.firstName?.[0]?.toUpperCase() ?? '?'}
                                            {post.author?.lastName?.[0]?.toUpperCase() ?? ''}
                                        </Avatar>
                                    </RouterLink>
                                </ListItemAvatar>
                                <ListItemText
                                    disableTypography
                                    primary={
                                        <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', mb: 0.5 }}>
                                            <Typography fontWeight="bold" component="span" sx={{ mr: 1 }}>
                                                <MuiLink component={RouterLink} to={`/profile/${post.author.accountId}`} color="text.primary" underline="hover">
                                                    {post.author.firstName} {post.author.lastName}
                                                </MuiLink>
                                            </Typography>
                                            {/* Follow Button */}
                                            <FollowButton
                                                userIdToFollow={post.author.accountId}
                                                initialIsFollowing={post.author.isFollowing}
                                                currentUserId={currentUser.id}
                                                onUpdate={handleFollowUpdate}
                                            />
                                        </Box>
                                    }
                                    secondary={
                                        <>
                                            {post.title && (
                                                <Typography variant="h6" component="div" sx={{ my: 1, fontWeight: 'medium' }}>
                                                    {post.title}
                                                </Typography>
                                            )}
                                            <Typography component="div" variant="body2" sx={{ py: 0.5, whiteSpace: 'pre-wrap', color: 'text.secondary' }}>
                                                {post.content}
                                            </Typography>
                                            <Typography variant="caption" color="text.disabled" sx={{ mt: 1, display:'block' }}>
                                                {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                                            </Typography>
                                        </>
                                    }
                                />
                            </ListItem>
                        </Paper>
                    ))
                )}
            </List>
            {/* Optional: Add Load More Button/Logic here */}
        </Container>
    );
};

export default NotificationsPage; // Keep export name unless you rename the file