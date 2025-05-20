// src/components/Posts.tsx
import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from '@apollo/client';
import { DELETE_POST } from '../graphql/mutations';
import { supabase } from "../lib/supabase";
import {
  Box,
  Typography,
  CircularProgress,
  Button,
  useTheme,
  useMediaQuery,
  Snackbar,
  Alert,
  Container,
  Paper,
  Divider,
  Card,
  CardContent,
  Avatar,
} from "@mui/material";
import { Add as AddIcon, Bookmark as BookmarkIcon, Person as PersonIcon, Home as HomeIcon } from "@mui/icons-material";
import CreatePostModal from './CreatePostModal'; 
import PostCard from './PostCard';
import UserAvatar from './UserAvatar';
import ReactMarkdown from 'react-markdown';

// Interfaces
interface Post {
  post_id: string;
  title: string;
  content: string;
  created_at: string;
  commentsCount?: number;
  likesCount?: number;
  isLiked?: boolean;
  author: {
    id: string;
    first_name: string;
    last_name: string;
    profile_picture_url?: string;
  } | null;
}

interface Account {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  profile_picture_url?: string;
}

export default function Posts() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [posts, setPosts] = useState<Post[]>([]);
  const [currentUser, setCurrentUser] = useState<Account | null>(null);
  const [currentUserLoading, setCurrentUserLoading] = useState(true);
  const [followingStatus, setFollowingStatus] = useState<Map<string, boolean>>(new Map());
  const [notification, setNotification] = useState<{ id: string; type: string; message: string } | null>(null);
  const [createPostModalOpen, setCreatePostModalOpen] = useState(false);
  
  // Active post state
  const [activePostId, setActivePostId] = useState<string | null>(null);

  // Delete post mutation
  const [deletePost, { loading: deleteLoading }] = useMutation(DELETE_POST, {
    onCompleted: () => {
      setPosts(prevPosts => prevPosts.filter(post => post.post_id !== activePostId));
      setActivePostId(null);
      setNotification({ 
        id: activePostId || '', 
        type: 'success', 
        message: 'Post successfully deleted' 
      });
      
      setTimeout(() => {
        setNotification(null);
      }, 5000);
    },
    onError: (error) => {
      console.error("Error deleting post:", error);
      setNotification({ 
        id: activePostId || '', 
        type: 'error', 
        message: `Failed to delete post: ${error.message}` 
      });
      setActivePostId(null);
    },
  });

  // Fetch current user
  const fetchCurrentUser = useCallback(async () => {
    setCurrentUserLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from("accounts")
          .select("id, first_name, last_name, email, profile_picture_url")
          .eq("id", user.id)
          .single();
        if (error) throw error;
        setCurrentUser(data);
      } else {
        setCurrentUser(null);
      }
    } catch (error) {
      console.error("Error fetching current user:", error);
      setCurrentUser(null);
    } finally {
      setCurrentUserLoading(false);
    }
  }, []);

  // Fetch posts
  const fetchPosts = useCallback(async () => {
    setLoadingPosts(true);
    try {
      const { data: postsData, error: postsError } = await supabase
        .from("posts")
        .select(`
          post_id,
          title,
          content,
          created_at,
          author:accounts!posts_author_id_fkey(
            id,
            first_name,
            last_name,
            profile_picture_url 
          )
        `)
        .order("created_at", { ascending: false });

      if (postsError) throw postsError;
      
      // Properly transform the data to match our Post interface
      const postsWithCounts = (postsData || []).map(post => {
        // Extract the author (could be an array or single object based on Supabase response)
        const authorData = Array.isArray(post.author) ? post.author[0] || null : post.author;
        
        return {
          post_id: post.post_id,
          title: post.title,
          content: post.content,
          created_at: post.created_at,
          author: authorData, 
          commentsCount: 0,
          likesCount: 0,
          isLiked: false
        } as Post;
      });
      
      setPosts(postsWithCounts);
      
    } catch (err: any) {
      console.error("Error fetching posts:", err);
      setPosts([]);
    } finally {
      setLoadingPosts(false);
    }
  }, []);

  // Handle post creation
  const handlePostCreated = () => {
    setCreatePostModalOpen(false);
    // Refresh posts
    fetchPosts();
    setNotification({
      id: 'new-post',
      type: 'success',
      message: 'Post created successfully!'
    });
    
    setTimeout(() => {
      setNotification(null);
    }, 5000);
  };

  // Fetch follow status
  useEffect(() => {
    const fetchFollowStatus = async () => {
      if (!currentUser || posts.length === 0) {
        setFollowingStatus(new Map());
        return;
      }

      const authorIds = posts
        .map((p) => p.author?.id)
        .filter((id): id is string => id !== null && id !== undefined && id !== currentUser.id);

      if (authorIds.length === 0) {
        setFollowingStatus(new Map());
        return;
      }

      try {
        const { data: followsData, error: followsError } = await supabase
          .from("follows")
          .select("followed_user_id")
          .eq("follower_user_id", currentUser.id)
          .in("followed_user_id", authorIds);

        if (followsError) throw followsError;

        const newStatusMap = new Map<string, boolean>();
        if (followsData) {
          followsData.forEach((follow) => {
            newStatusMap.set(follow.followed_user_id, true);
          });
        }
        setFollowingStatus(newStatusMap);
      } catch (err) {
        console.error("Failed to fetch follow statuses:", err);
        setFollowingStatus(new Map());
      }
    };

    fetchFollowStatus();
  }, [posts, currentUser]);

  // Initial fetch
  useEffect(() => {
    fetchCurrentUser();
    fetchPosts();

    // Set up real-time subscription
    const postSubscription = supabase
      .channel("public:posts")
      .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, () => {
        fetchPosts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(postSubscription);
    };
  }, [fetchCurrentUser, fetchPosts]);

  // Listen for profile picture updates
  useEffect(() => {
    // This function handles the storage event
    const handleProfilePictureUpdate = () => {
      // Refresh posts when profile picture is updated
      fetchPosts();
    };
    
    // Set up event listener for localStorage changes
    window.addEventListener('storage', (e) => {
      if (e.key === 'profile_picture_updated') {
        handleProfilePictureUpdate();
      }
    });
    
    return () => {
      window.removeEventListener('storage', handleProfilePictureUpdate);
    };
  }, [fetchPosts]);

  // Toggle follow function
  const handleFollowUpdate = async (userId: string, isFollowing: boolean) => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    // Optimistically update UI
    setFollowingStatus(prev => {
      const newMap = new Map(prev);
      newMap.set(userId, isFollowing);
      return newMap;
    });

    try {
      if (isFollowing) {
        // Follow
        await supabase
          .from('follows')
          .insert({
            follower_user_id: currentUser.id,
            followed_user_id: userId
          });
      } else {
        // Unfollow
        await supabase
          .from('follows')
          .delete()
          .eq('follower_user_id', currentUser.id)
          .eq('followed_user_id', userId);
      }
    } catch (error) {
      console.error("Error toggling follow:", error);
      // Revert on error
      setFollowingStatus(prev => {
        const newMap = new Map(prev);
        newMap.set(userId, !isFollowing);
        return newMap;
      });
    }
  };

  // Handle like update
  const handleLikeUpdate = (postId: string, isLiked: boolean, likeCount: number) => {
    setPosts(prevPosts => prevPosts.map(post => {
      if (post.post_id === postId) {
        return {
          ...post,
          isLiked,
          likesCount: likeCount
        };
      }
      return post;
    }));
  };

  // Handle post deletion
  const handlePostDeleted = (postId: string) => {
    setActivePostId(postId);
    
    // Get the access token from Supabase
    supabase.auth.getSession().then(({ data }) => {
      const token = data.session?.access_token;
      
      if (!token) {
        setNotification({
          id: postId,
          type: 'error',
          message: 'Authentication required. Please log in again.'
        });
        return;
      }
      
      deletePost({ 
        variables: { postId },
        context: {
          headers: {
            "Authorization": `Bearer ${token}`,
          }
        }
      });
    });
  };

  // Handle post update
  const handlePostUpdated = () => {
    fetchPosts();
    setNotification({
      id: 'post-updated',
      type: 'success',
      message: 'Post updated successfully'
    });
    
    setTimeout(() => {
      setNotification(null);
    }, 5000);
  };

  // Function to render post content with markdown
  const renderPostContent = (content: string) => {
    // Check if content contains markdown image
    if (content.includes('![') && content.includes('](') && content.includes(')')) {
      return (
        <Box sx={{ 
          '& img': { 
            maxWidth: '100%', 
            height: 'auto',
            borderRadius: 1,
            my: 1
          },
          mb: 2,
          wordBreak: 'break-word',
          color: theme.palette.text.secondary,
          lineHeight: 1.6
        }}>
          <ReactMarkdown>{content}</ReactMarkdown>
        </Box>
      );
    }
    
    // Regular text rendering for non-image content
    return (
      <Typography 
        variant="body1" 
        sx={{ 
          mb: 2, 
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          color: theme.palette.text.secondary,
          lineHeight: 1.6
        }}
      >
        {content}
      </Typography>
    );
  };

  // Display loading if both posts and user are loading
  if (loadingPosts && currentUserLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="calc(100vh - 64px)" mt="64px">
        <CircularProgress />
      </Box>
    );
  }

  // Navigation items for the sidebar
  const navigationItems = [
    { icon: <HomeIcon />, label: 'Home', action: () => navigate('/posts') },
    { icon: <PersonIcon />, label: 'Profile', action: () => navigate('/profile') },
    { icon: <BookmarkIcon />, label: 'Saved Posts', action: () => {} },
  ];

  return (
    <Box sx={{ bgcolor: '#f8f9fa', minHeight: '100vh', pt: '64px' }}>
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Box
          sx={{
            display: 'flex',
            gap: 3,
            position: 'relative',
          }}
        >
          {/* Left Sidebar - Only visible on desktop and large tablets */}
          {!isMobile && !isTablet && (
            <Box 
              sx={{ 
                width: 280, 
                position: 'sticky',
                top: 80,
                height: 'calc(100vh - 80px)',
                alignSelf: 'flex-start'
              }}
            >
              {/* User Profile Card */}
              {currentUser && (
                <Card elevation={0} sx={{ 
                  mb: 3, 
                  borderRadius: 3, 
                  boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                  overflow: 'visible',
                  position: 'relative'
                }}>
                  {/* Background Cover */}
                  <Box sx={{ 
                    height: 80, 
                    bgcolor: 'primary.light', 
                    borderTopLeftRadius: 12, 
                    borderTopRightRadius: 12 
                  }} />
                  
                  {/* Avatar */}
                  <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'center', 
                    mt: -5
                  }}>
                    <UserAvatar 
                      userId={currentUser.id}
                      firstName={currentUser.first_name}
                      lastName={currentUser.last_name}
                      profilePictureUrl={currentUser.profile_picture_url}
                      size={80}
                      sx={{ 
                        border: '4px solid white',
                        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
                      }}
                    />
                  </Box>
                  
                  <CardContent sx={{ textAlign: 'center', pt: 1 }}>
                    <Typography variant="h6" fontWeight="bold" gutterBottom>
                      {currentUser.first_name} {currentUser.last_name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      @{currentUser.first_name.toLowerCase() + currentUser.last_name.toLowerCase()}
                    </Typography>
                    
                    <Button
                      fullWidth
                      variant="contained"
                      startIcon={<AddIcon />}
                      onClick={() => setCreatePostModalOpen(true)}
                      sx={{
                        py: 1.2,
                        borderRadius: 3,
                        textTransform: 'none',
                        fontWeight: 'bold',
                        boxShadow: '0 2px 10px rgba(129, 93, 171, 0.25)'
                      }}
                    >
                      Create Post
                    </Button>
                  </CardContent>
                </Card>
              )}
              
              {/* Navigation Menu */}
              <Card elevation={0} sx={{ 
                borderRadius: 3, 
                boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                overflow: 'hidden'
              }}>
                <CardContent sx={{ p: 0 }}>
                  {navigationItems.map((item, index) => (
                    <Box key={index}>
                      <Button
                        fullWidth
                        startIcon={item.icon}
                        onClick={item.action}
                        sx={{
                          justifyContent: 'flex-start',
                          py: 1.5,
                          px: 3,
                          borderRadius: 0,
                          textTransform: 'none',
                          fontWeight: 'bold',
                          color: item.label === 'Home' ? 'primary.main' : 'text.primary',
                          '&:hover': {
                            bgcolor: 'rgba(129, 93, 171, 0.08)'
                          }
                        }}
                      >
                        {item.label}
                      </Button>
                      {index < navigationItems.length - 1 && <Divider />}
                    </Box>
                  ))}
                </CardContent>
              </Card>
              
              {/* Not logged in card */}
              {!currentUser && (
                <Card elevation={0} sx={{ 
                  mt: 3, 
                  borderRadius: 3, 
                  boxShadow: '0 2px 12px rgba(0,0,0,0.08)'
                }}>
                  <CardContent sx={{ p: 3 }}>
                    <Typography variant="h6" fontWeight="bold" gutterBottom>
                      Welcome to ConnectMe!
                    </Typography>
                    <Typography variant="body2" color="text.secondary" paragraph>
                      Join our community to post and interact with others.
                    </Typography>
                    <Button
                      fullWidth
                      variant="contained"
                      onClick={() => navigate('/login')}
                      sx={{
                        py: 1.2,
                        borderRadius: 3,
                        textTransform: 'none',
                        fontWeight: 'bold',
                        boxShadow: '0 2px 10px rgba(129, 93, 171, 0.25)'
                      }}
                    >
                      Sign In
                    </Button>
                  </CardContent>
                </Card>
              )}
            </Box>
          )}

          {/* Main Content */}
          <Box 
            sx={{ 
              flexGrow: 1,
              maxWidth: { xs: '100%', md: 800 },
              mx: 'auto'
            }}
          >
            {/* Mobile Create Post Button */}
            {(isMobile || isTablet) && currentUser && (
              <Box sx={{ mb: 2 }}>
                <Button
                  fullWidth
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setCreatePostModalOpen(true)}
                  sx={{
                    py: 1.5,
                    borderRadius: 3,
                    textTransform: 'none',
                    fontWeight: 'bold',
                    boxShadow: theme.shadows[2]
                  }}
                >
                  Create Post
                </Button>
              </Box>
            )}
            
            {/* Posts List */}
            {posts.length === 0 ? (
              <Box 
                sx={{ 
                  p: 4, 
                  textAlign: 'center',
                  bgcolor: 'white',
                  borderRadius: 3,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                }}
              >
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No posts yet
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Be the first to share your thoughts!
                </Typography>
                {currentUser && (
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => setCreatePostModalOpen(true)}
                    sx={{
                      mt: 2,
                      borderRadius: 3,
                      textTransform: 'none',
                      fontWeight: 'bold',
                    }}
                  >
                    Create Post
                  </Button>
                )}
              </Box>
            ) : (
              posts.map((post) => (
                <PostCard
                  key={post.post_id}
                  post={{
                    postId: post.post_id,
                    title: post.title,
                    content: post.content,
                    createdAt: post.created_at,
                    commentsCount: post.commentsCount || 0,
                    likesCount: post.likesCount || 0,
                    isLiked: post.isLiked || false,
                    author: {
                      accountId: post.author?.id || '',
                      firstName: post.author?.first_name || '',
                      lastName: post.author?.last_name || '',
                      isFollowing: followingStatus.get(post.author?.id || '') || false
                    }
                  }}
                  currentUserId={currentUser?.id || null}
                  onPostDeleted={() => handlePostDeleted(post.post_id)}
                  onPostUpdated={handlePostUpdated}
                  onFollowUpdate={handleFollowUpdate}
                  onLikeUpdate={handleLikeUpdate}
                  renderContent={renderPostContent} // Pass the function to render markdown content
                />
              ))
            )}
          </Box>
          
          {/* Right sidebar - only visible on larger screens */}
          {!isMobile && !isTablet && (
            <Box 
              sx={{ 
                width: 280, 
                position: 'sticky',
                top: 80,
                height: 'fit-content',
                alignSelf: 'flex-start'
              }}
            >
              {/* Trending Card */}
              <Card elevation={0} sx={{ 
                borderRadius: 3,
                boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                mb: 3
              }}>
                <CardContent sx={{ p: 0 }}>
                  <Box sx={{ p: 2, borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                    <Typography variant="h6" fontWeight="bold">
                      ConnectMe
                    </Typography>
                  </Box>
                  
                  <Box sx={{ p: 3 }}>
                    <Typography variant="body1" fontWeight="medium" gutterBottom color="primary.main">
                      Welcome to the ConnectMe Community!
                    </Typography>
                    <Typography variant="body2" color="text.secondary" paragraph>
                      Connect with friends, share your thoughts, and discover interesting content from others.
                    </Typography>
                    
                    <Box sx={{
                      mt: 2,
                      p: 2,
                      borderRadius: 2,
                      bgcolor: 'rgba(129, 93, 171, 0.1)',
                      border: '1px solid rgba(129, 93, 171, 0.2)'
                    }}>
                      <Typography variant="body2" fontWeight="medium" gutterBottom>
                        💡 Quick Tip
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Use Markdown in your posts to add images and formatting!
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
              
              {/* Suggested Connections */}
              <Card elevation={0} sx={{ 
                borderRadius: 3,
                boxShadow: '0 2px 12px rgba(0,0,0,0.08)'
              }}>
                <CardContent>
                  <Typography variant="h6" fontWeight="bold" gutterBottom>
                    Coming Soon
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    We're working on new features to help you connect with more people and discover content that matters to you.
                  </Typography>
                </CardContent>
              </Card>
            </Box>
          )}
        </Box>
      </Container>
      
      {/* Create Post Modal */}
      <CreatePostModal
        open={createPostModalOpen}
        onClose={() => setCreatePostModalOpen(false)}
        onPostCreated={handlePostCreated}
        currentUser={currentUser}
      />
      
      {/* Notification */}
      {notification && (
        <Snackbar
          open={notification !== null}
          autoHideDuration={5000}
          onClose={() => setNotification(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert 
            severity={notification.type as 'error' | 'success'} 
            sx={{ width: '100%' }}
            onClose={() => setNotification(null)}
          >
            {notification.message}
          </Alert>
        </Snackbar>
      )}
    </Box>
  );
}