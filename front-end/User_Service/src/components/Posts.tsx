import { useEffect, useState } from 'react';
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
  Stack
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Add } from '@mui/icons-material';

interface Post {
  post_id: string;
  content: string;
  created_at: string;
  author: {
    first_name: string;
    last_name: string;
  };
}

interface Account {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

export default function Posts() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [currentUser, setCurrentUser] = useState<Account | null>(null);

  useEffect(() => {
    fetchPosts();
    fetchCurrentUser();
    
    const subscription = supabase
      .channel('public:posts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, fetchPosts)
      .subscribe();

    return () => subscription.unsubscribe();
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('accounts')
        .select('id, first_name, last_name, email')
        .eq('email', user.email)
        .single();
      
      if (error) throw error;
      setCurrentUser(data);
    } catch (error) {
      console.error('Error fetching current user:', error);
    }
  };

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select(`
          post_id,
          content,
          created_at,
          author:accounts!posts_author_id_fkey(
            first_name,
            last_name
          )
        `)
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;
      setPosts(postsData || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Paper elevation={0} sx={{ p: 2, m: 2, textAlign: 'center' }}>
        <Typography color="error">Error loading posts: {error}</Typography>
        <Button onClick={fetchPosts} sx={{ mt: 1 }}>Retry</Button>
      </Paper>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 2 }}>
      <Grid container spacing={3}>
        {/* Left Column - Profile */}
        <Grid item xs={12} md={3}>
          {currentUser && (
            <Paper elevation={0} sx={{ p: 2, mb: 3, borderRadius: 2, position: 'sticky', top: 20 }}>
              <Box display="flex" flexDirection="column" alignItems="center" p={2}>
                <Avatar 
                  sx={{ 
                    width: 120, 
                    height: 120, 
                    fontSize: 40,
                    mb: 2,
                    bgcolor: 'primary.main'
                  }}
                >
                  {currentUser.first_name?.[0]}{currentUser.last_name?.[0]}
                </Avatar>
                <Typography variant="h6" fontWeight="bold">
                  {currentUser.first_name} {currentUser.last_name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {currentUser.email}
                </Typography>
                
                <Divider sx={{ my: 2, width: '100%' }} />
                
                <Typography variant="subtitle1" fontWeight="bold" mb={1}>
                  2025 trips!
                </Typography>
                
                <Button 
                  variant="contained" 
                  fullWidth 
                  sx={{ mt: 2, borderRadius: '20px' }}
                  onClick={() => navigate('/profile')}
                >
                  View Profile
                </Button>
              </Box>
              
              <Divider sx={{ my: 2 }} />
              
              <Typography variant="subtitle1" fontWeight="bold" mb={1}>
                Friend Requests
              </Typography>
              <List dense>
                {['Arube', 'Jane Doe', 'Keith Saldaña', 'Rainier Darle', 'Elon Musk'].map((name) => (
                  <ListItem key={name} button>
                    <ListItemAvatar>
                      <Avatar>{name[0]}</Avatar>
                    </ListItemAvatar>
                    <ListItemText primary={name} />
                  </ListItem>
                ))}
              </List>
            </Paper>
          )}
        </Grid>
        
        {/* Middle Column - Posts */}
        <Grid item xs={12} md={6}>
          {posts.length === 0 ? (
            <Paper elevation={0} sx={{ p: 4, textAlign: 'center' }}>
              <Typography>No posts yet. Be the first to post!</Typography>
            </Paper>
          ) : (
            <List sx={{ width: '100%' }}>
              {posts.map((post) => (
                <Paper key={post.post_id} elevation={0} sx={{ mb: 3, p: 2, borderRadius: 2 }}>
                  <ListItem alignItems="flex-start" sx={{ p: 0 }}>
                    <ListItemAvatar>
                      <Avatar>
                        {post.author.first_name?.[0] || '?'}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Typography fontWeight="bold">
                          {post.author.first_name} {post.author.last_name}
                        </Typography>
                      }
                      secondary={
                        <>
                          <Typography component="span" display="block">
                            {post.content}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(post.created_at).toLocaleString()}
                          </Typography>
                        </>
                      }
                    />
                  </ListItem>
                </Paper>
              ))}
            </List>
          )}
        </Grid>

        {/* Right Column - Suggested Friends */}
        <Grid item xs={12} md={3}>
          <Paper elevation={0} sx={{ p: 2, mb: 3, borderRadius: 2, position: 'sticky', top: 20 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Suggested Friends</Typography>
            <List>
              {['Mark Zuckerberg', 'Diwata Pares', 'Ash Trevino'].map((name) => (
                <ListItem key={name} button sx={{ p: 1 }}>
                  <ListItemAvatar>
                    <Avatar>{name[0]}</Avatar>
                  </ListItemAvatar>
                  <ListItemText 
                    primary={name} 
                    primaryTypographyProps={{ fontWeight: 'medium' }}
                  />
                  <Button 
                    size="small" 
                    variant="outlined" 
                    sx={{ 
                      borderRadius: '20px',
                      textTransform: 'none',
                      fontSize: '0.75rem'
                    }}
                  >
                    Add
                  </Button>
                </ListItem>
              ))}
            </List>
            
            <Divider sx={{ my: 2 }} />
            
            <Typography variant="subtitle2" color="text.secondary">
              People you may know
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
}