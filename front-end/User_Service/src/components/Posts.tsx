import React, { useEffect, useState, useCallback } from 'react'; // Add useCallback
import {
  Box,
  Container,
  Typography,
  Paper,
  CircularProgress,
  Avatar,
  Divider,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Button,
  Grid,
  Alert, // Keep Alert
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import FollowButton from './FollowButton'; // Import the button

// Interface for posts fetched via Supabase
interface Post {
  post_id: string; // Use post_id from your fetch
  title: string; // Assuming title is still needed
  content: string;
  created_at: string;
  author: { // Author structure from Supabase fetch
    id: string; // <-- Need the author's ID
    first_name: string;
    last_name: string;
  } | null; // Author might be null if account deleted? Handle this case.
}

// Interface for current user data
interface Account {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

export default function Posts() {
  const navigate = useNavigate();
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [currentUser, setCurrentUser] = useState<Account | null>(null);
  const [currentUserLoading, setCurrentUserLoading] = useState(true);

  // State to store follow status: Map<authorId, isFollowing>
  const [followingStatus, setFollowingStatus] = useState<Map<string, boolean>>(new Map());
  const [loadingFollowStatus, setLoadingFollowStatus] = useState(false);

  // Fetch current user (keep this)
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
  }, []); // Empty dependency array, runs once on mount

  // Fetch posts via Supabase (keep this, but ensure author ID is selected)
  const fetchPosts = useCallback(async () => {
    setError(null); // Clear previous errors
    setLoadingPosts(true);
    try {
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select(`
          post_id,
          title,
          content,
          created_at,
          author:accounts!posts_author_id_fkey(
            id,
            first_name,
            last_name
          )
        `) // <--- Comment removed
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;
      setPosts(postsData || []);
    } catch (err: any) {
      console.error("Error fetching posts:", err);
      setError(err.message);
      setPosts([]); // Clear posts on error
    } finally {
      setLoadingPosts(false);
    }
  }, []); // Empty dependency array means fetchPosts function itself doesn't change

  // Fetch initial follow statuses when posts or user change
  useEffect(() => {
    const fetchFollowStatus = async () => {
      if (!currentUser || posts.length === 0) {
        setFollowingStatus(new Map()); // Clear status if no user or posts
        return;
      }

      // Get unique author IDs from the current posts
      const authorIds = posts
         .map(p => p.author?.id) // Get author ID
         .filter((id): id is string => id !== null && id !== undefined && id !== currentUser.id); // Filter out nulls/undefined and own ID

      if (authorIds.length === 0) {
         setFollowingStatus(new Map()); // No one else to check
         return;
      }

      setLoadingFollowStatus(true);
      try {
        const { data: followsData, error: followsError } = await supabase
          .from('follows')
          .select('followed_user_id') // Select the ID of the person being followed
          .eq('follower_user_id', currentUser.id) // Where the follower is the current user
          .in('followed_user_id', authorIds); // And the followed person is one of the authors

        if (followsError) {
           console.error("Error fetching follow status:", followsError);
           throw followsError;
        }

        const newStatusMap = new Map<string, boolean>();
        if (followsData) {
           followsData.forEach(follow => {
              newStatusMap.set(follow.followed_user_id, true);
           });
        }
         // Update the state with the fetched statuses
        setFollowingStatus(newStatusMap);

      } catch (err) {
          console.error("Failed to fetch follow statuses:", err);
          setFollowingStatus(new Map()); // Clear on error
      } finally {
         setLoadingFollowStatus(false);
      }
    };

    fetchFollowStatus();
  }, [posts, currentUser]); // Re-run when posts or currentUser changes


  // Initial fetch and subscription setup
  useEffect(() => {
    fetchCurrentUser(); // Fetch user first
    fetchPosts();       // Then fetch posts

    // Set up Supabase real-time subscription for posts
    const postSubscription = supabase
      .channel('public:posts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, (payload) => {
         console.log('Post change received!', payload);
         // Refetch all posts on any change. Could be optimized later.
         fetchPosts();
       })
      .subscribe();

     // Optional: Subscribe to follows changes if needed (can get complex)
      // const followSubscription = supabase
      // .channel('public:follows')
      // .on('postgres_changes', { event: '*', schema: 'public', table: 'follows' }, (payload) => {
      //      console.log('Follows change received!', payload);
      //      // Refetch follow status (might be inefficient)
      //      // This requires careful handling based on payload (insert/delete)
      //      // For simplicity, maybe rely on user action + callback for immediate UI update
      //  })
      // .subscribe();

    // Cleanup subscriptions on component unmount
    return () => {
      supabase.removeChannel(postSubscription);
      // supabase.removeChannel(followSubscription); // Uncomment if you add follow subscription
    };
  }, [fetchCurrentUser, fetchPosts]); // Dependencies for initial fetch setup

  // Callback function to update follow status map from FollowButton clicks
   const handleFollowUpdate = useCallback((followedUserId: string, newStatus: boolean) => {
      setFollowingStatus(prevMap => {
         const newMap = new Map(prevMap);
         newMap.set(followedUserId, newStatus);
         return newMap;
      });
   }, []); // Empty dependency array: function doesn't change

  const isLoading = loadingPosts || currentUserLoading || loadingFollowStatus;

  if (isLoading && posts.length === 0) { // Show loading only initially or if specifically loading status
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
        <Container maxWidth="md" sx={{mt: 4}}>
             <Alert severity="error">Error loading posts: {error}</Alert>
             <Button onClick={fetchPosts} sx={{ mt: 1 }}>Retry</Button>
        </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 2 }}>
      <Grid container spacing={3}>
        {/* Left Column - Profile */}
        <Grid item xs={12} md={3}>
           {/* ... (Keep your existing Profile Card rendering logic using currentUser) ... */}
            {currentUserLoading && <CircularProgress size={20} />}
            {currentUser && (
               <Paper elevation={0} sx={{ p: 2, mb: 3, borderRadius: 2, position: 'sticky', top: 80 }}>
                  <Box display="flex" flexDirection="column" alignItems="center" p={2}>
                    <Avatar sx={{ width: 120, height: 120, fontSize: 40, mb: 2, bgcolor: 'primary.main' }}>
                       {currentUser.first_name?.[0]}{currentUser.last_name?.[0]}
                    </Avatar>
                    <Typography variant="h6" fontWeight="bold">{currentUser.first_name} {currentUser.last_name}</Typography>
                    <Typography variant="body2" color="text.secondary">{currentUser.email}</Typography>
                    <Divider sx={{ my: 2, width: '100%' }} />
                    <Typography variant="subtitle1" fontWeight="bold" mb={1}>2025 trips!</Typography>
                    <Button variant="contained" fullWidth sx={{ mt: 2, borderRadius: '20px' }} onClick={() => navigate('/profile')}>
                       View Profile
                    </Button>
                  </Box>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle1" fontWeight="bold" mb={1}>Friend Requests</Typography>
                  <List dense>
                    {['Arube', 'Jane Doe', 'Keith Saldaña', 'Rainier Darle', 'Elon Musk'].map((name) => (
                        <ListItem key={name}>
                           <ListItemAvatar><Avatar>{name[0]}</Avatar></ListItemAvatar>
                           <ListItemText primary={name} />
                        </ListItem>
                    ))}
                  </List>
               </Paper>
            )}
            {!currentUser && !currentUserLoading && (
               <Paper elevation={0} sx={{ p: 2, mb: 3, borderRadius: 2, position: 'sticky', top: 80 }}>
                  <Typography>Login to see your profile details.</Typography>
                  <Button variant="contained" onClick={() => navigate('/login')} sx={{ mt: 1 }}>Login</Button>
               </Paper>
            )}
        </Grid>

        {/* Middle Column - Posts */}
        <Grid item xs={12} md={6}>
          {(posts.length === 0 && !loadingPosts) ? ( // Check loading state here too
            <Paper elevation={0} sx={{ p: 4, textAlign: 'center' }}>
              <Typography>No posts yet. Be the first to post!</Typography>
            </Paper>
          ) : (
            <List sx={{ width: '100%', padding: 0 }}>
              {posts.map((post) => {
                // Determine follow status for *this* author from the map
                const isFollowingAuthor = post.author?.id ? followingStatus.get(post.author.id) ?? false : false;

                return (
                   <Paper key={post.post_id} elevation={0} sx={{ mb: 2, p: 2, borderRadius: 2 }}>
                     <ListItem alignItems="flex-start" sx={{ p: 0 }}>
                       <ListItemAvatar sx={{mt: 0.5}}>
                          <Avatar>
                             {post.author?.first_name?.[0]?.toUpperCase() ?? '?'}
                          </Avatar>
                       </ListItemAvatar>
                       <ListItemText
                          primary={
                             <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
                                <Typography fontWeight="bold" component="span">
                                   {post.author?.first_name ?? 'Unknown'} {post.author?.last_name ?? 'User'}
                                </Typography>
                                {/* --- Follow Button Integration --- */}
                                {currentUser && post.author?.id && ( // Only show if logged in AND author exists
                                   <FollowButton
                                      userIdToFollow={post.author.id}
                                      // Use status from the map, fallback to false
                                      initialIsFollowing={isFollowingAuthor}
                                      currentUserId={currentUser.id}
                                      // Pass the callback to update the map
                                      onUpdate={handleFollowUpdate}
                                   />
                                )}
                                {/* --- End Follow Button --- */}
                             </Box>
                          }
                          secondary={
                             <>
                                {/* Display title if it exists */}
                                {post.title && (
                                  <Typography variant="h6" component="span" display="block" sx={{ mb: 1 }}>
                                     {post.title}
                                  </Typography>
                                )}
                                <Typography component="span" variant="body2" display="block" sx={{ py: 0.5 }}>
                                  {post.content}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {new Date(post.created_at).toLocaleString()}
                                </Typography>
                             </>
                          }
                          primaryTypographyProps={{ component: 'div' }}
                          sx={{ m: 0 }}
                       />
                     </ListItem>
                   </Paper>
                 );
              })}
            </List>
          )}
        </Grid>

        {/* Right Column - Suggested Friends */}
        <Grid item xs={12} md={3}>
           {/* ... (Keep your existing Suggested Friends rendering logic) ... */}
           <Paper elevation={0} sx={{ p: 2, mb: 3, borderRadius: 2, position: 'sticky', top: 80 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>Suggested Friends</Typography>
              <List>
                 {['Mark Zuckerberg', 'Diwata Pares', 'Ash Trevino'].map((name) => (
                    <ListItem key={name} sx={{ p: 1 }}>
                       <ListItemAvatar><Avatar>{name[0]}</Avatar></ListItemAvatar>
                       <ListItemText primary={name} primaryTypographyProps={{ fontWeight: 'medium' }} />
                       <Button size="small" variant="outlined" sx={{ borderRadius: '20px', textTransform: 'none', fontSize: '0.75rem' }}>
                          Add
                       </Button>
                    </ListItem>
                 ))}
              </List>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" color="text.secondary">People you may know</Typography>
           </Paper>
        </Grid>
      </Grid>
    </Container>
  );
}