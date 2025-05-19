// src/components/Posts.tsx
import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from '@apollo/client';
import { DELETE_POST } from '../graphql/mutations';
import { GET_POST_COMMENTS } from '../graphql/queries';
import { supabase } from "../lib/supabase";
import {
  Box,
  Typography,
  CircularProgress,
  Avatar,
  Button,
  IconButton,
  Divider,
  Menu,
  MenuItem,
  ListItemIcon,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  useTheme,
  useMediaQuery,
  Snackbar,
  Alert,
  TextField
} from "@mui/material";
import {
  ChatBubbleOutline as CommentIcon,
  Favorite as LikeIcon,
  FavoriteBorder as LikeOutlineIcon,
  MoreHoriz as MoreIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Send as SendIcon
} from "@mui/icons-material";
import { formatDistanceToNow } from 'date-fns';
import EditPostForm from './EditPostForm';
import { CREATE_COMMENT } from "../graphql/mutations";
import PostComments from './PostComments';

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
  } | null;
}

interface Account {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface Comment {
  commentId: string;
  content: string;
  createdAt: string;
  updatedAt?: string | null;
  author: {
    accountId: string;
    firstName: string;
    lastName: string;
  };
}

export default function Posts() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [posts, setPosts] = useState<Post[]>([]);
  const [currentUser, setCurrentUser] = useState<Account | null>(null);
  const [currentUserLoading, setCurrentUserLoading] = useState(true);
  const [followingStatus, setFollowingStatus] = useState<Map<string, boolean>>(new Map());
  const [notification, setNotification] = useState<{ id: string; type: string; message: string } | null>(null);
  
  // Menu state
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [activePostId, setActivePostId] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [activePost, setActivePost] = useState<Post | null>(null);
  const [showComments, setShowComments] = useState<Set<string>>(new Set());
  
  // Comments state
  const [commentContent, setCommentContent] = useState<{ [postId: string]: string }>({});
  const [likeStatus, setLikeStatus] = useState<{ [postId: string]: boolean }>({});

  // Delete post mutation
  const [deletePost, { loading: deleteLoading }] = useMutation(DELETE_POST, {
    onCompleted: () => {
      setPosts(prevPosts => prevPosts.filter(post => post.post_id !== activePostId));
      setMenuAnchorEl(null);
      setActivePostId(null);
      setIsDeleteDialogOpen(false);
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
      setMenuAnchorEl(null);
      setActivePostId(null);
      setIsDeleteDialogOpen(false);
    },
  });
  
  // Create comment mutation
  const [createComment, { loading: commentLoading }] = useMutation(CREATE_COMMENT, {
    onCompleted: (data) => {
      // Update the comment count for the related post
      setPosts(prevPosts => prevPosts.map(post => {
        if (post.post_id === data.createComment.postId) {
          return {
            ...post,
            commentsCount: (post.commentsCount || 0) + 1
          };
        }
        return post;
      }));
      
      // Clear the comment input for this post
      setCommentContent(prev => ({
        ...prev,
        [data.createComment.postId]: ''
      }));
      
      // Show success notification
      setNotification({
        id: data.createComment.postId,
        type: 'success',
        message: 'Comment added successfully'
      });
      
      setTimeout(() => {
        setNotification(null);
      }, 3000);
    },
    onError: (error) => {
      console.error("Error adding comment:", error);
      setNotification({
        id: activePostId || '',
        type: 'error',
        message: `Failed to add comment: ${error.message}`
      });
    }
  });

  // Fetch current user
  const fetchCurrentUser = useCallback(async () => {
    setCurrentUserLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from("accounts")
          .select("id, first_name, last_name, email")
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
          last_name
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
        author: authorData, // Use the properly extracted author
        commentsCount: 0,
        likesCount: 0,
        isLiked: false
      } as Post;
    });
    
    setPosts(postsWithCounts);
    
    // For demo, initialize like status for each post
    const newLikeStatus: { [postId: string]: boolean } = {};
    postsWithCounts.forEach(post => {
      newLikeStatus[post.post_id] = false;
    });
    setLikeStatus(newLikeStatus);
    
  } catch (err: any) {
    console.error("Error fetching posts:", err);
    setPosts([]);
  } finally {
    setLoadingPosts(false);
  }
}, []);

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

  // Toggle follow
  const toggleFollow = async (authorId: string) => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    const isFollowing = followingStatus.get(authorId) || false;
    
    // Optimistically update UI
    setFollowingStatus(prev => {
      const newMap = new Map(prev);
      newMap.set(authorId, !isFollowing);
      return newMap;
    });

    try {
      if (isFollowing) {
        // Unfollow
        await supabase
          .from('follows')
          .delete()
          .eq('follower_user_id', currentUser.id)
          .eq('followed_user_id', authorId);
      } else {
        // Follow
        await supabase
          .from('follows')
          .insert({
            follower_user_id: currentUser.id,
            followed_user_id: authorId
          });
      }
    } catch (error) {
      console.error("Error toggling follow:", error);
      // Revert on error
      setFollowingStatus(prev => {
        const newMap = new Map(prev);
        newMap.set(authorId, isFollowing);
        return newMap;
      });
    }
  };

  // Handle like
  const handleLike = (postId: string) => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    
    const isCurrentlyLiked = likeStatus[postId] || false;
    
    // Update like status
    setLikeStatus(prev => ({
      ...prev,
      [postId]: !isCurrentlyLiked
    }));
    
    // Update post like count
    setPosts(prevPosts => prevPosts.map(post => {
      if (post.post_id === postId) {
        return {
          ...post,
          isLiked: !isCurrentlyLiked,
          likesCount: isCurrentlyLiked 
            ? Math.max(0, (post.likesCount || 0) - 1) 
            : (post.likesCount || 0) + 1
        };
      }
      return post;
    }));
    
    // In a real implementation, you would make an API call to update likes in the database
  };

  // Handle comments toggle
  const handleCommentsToggle = (postId: string) => {
    setShowComments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(postId)) {
        newSet.delete(postId);
      } else {
        newSet.add(postId);
      }
      return newSet;
    });
  };
  
  // Handle comment submission
  const handleCommentSubmit = (postId: string) => {
    if (!currentUser || !commentContent[postId]?.trim()) return;
    
    createComment({
      variables: {
        input: {
          postId,
          content: commentContent[postId].trim()
        }
      }
    });
  };
  
  // Handle comment input change
  const handleCommentChange = (postId: string, value: string) => {
    setCommentContent(prev => ({
      ...prev,
      [postId]: value
    }));
  };

  // Menu handlers
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, post: Post) => {
    event.stopPropagation();
    setMenuAnchorEl(event.currentTarget);
    setActivePostId(post.post_id);
    setActivePost(post);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
  };

  const handleEditClick = () => {
    handleMenuClose();
    setIsEditDialogOpen(true);
  };

  const handleDeleteClick = () => {
    handleMenuClose();
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (!activePostId) return;
    
    // Get the access token from Supabase
    supabase.auth.getSession().then(({ data }) => {
      const token = data.session?.access_token;
      
      if (!token) {
        setNotification({
          id: activePostId,
          type: 'error',
          message: 'Authentication required. Please log in again.'
        });
        return;
      }
      
      deletePost({ 
        variables: { postId: activePostId },
        context: {
          headers: {
            "Authorization": `Bearer ${token}`,
          }
        }
      });
    });
  };

  const handlePostUpdated = () => {
    setIsEditDialogOpen(false);
    fetchPosts();
    setNotification({
      id: activePostId || '',
      type: 'success',
      message: 'Post updated successfully'
    });
    
    setTimeout(() => {
      setNotification(null);
    }, 5000);
  };

  // Format time
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return formatDistanceToNow(date, { addSuffix: true });
  };

  if (loadingPosts && currentUserLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <CircularProgress />
      </Box>
    );
  }
  
 const renderComments = (postId: string) => {
  if (!showComments.has(postId)) {
    return null;
  }
  
  return <PostComments postId={postId} />;
};

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', pt: '64px' }}>
      {/* Left Sidebar */}
      {!isMobile && (
        <Box 
          sx={{ 
            width: 280, 
            position: 'fixed',
            height: 'calc(100vh - 64px)', 
            borderRight: '1px solid #f0f0f0',
            display: 'flex',
            flexDirection: 'column',
            p: 3,
            pt: 4
          }}
        >
          {currentUser ? (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar 
                  sx={{ 
                    width: 48, 
                    height: 48,
                    bgcolor: '#815DAB',
                    mr: 2
                  }}
                >
                  {currentUser.first_name[0]}{currentUser.last_name[0]}
                </Avatar>
                <Box>
                  <Typography variant="subtitle1" fontWeight="bold">
                    {currentUser.first_name} {currentUser.last_name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {currentUser.email}
                  </Typography>
                </Box>
              </Box>
              
              <Button
                fullWidth
                variant="contained"
                color="primary"
                sx={{
                  py: 1.2,
                  borderRadius: 5,
                  textTransform: 'none',
                  fontWeight: 'bold',
                  mb: 3
                }}
                onClick={() => navigate('/create-post')}
              >
                Post
              </Button>
            </>
          ) : (
            <Box sx={{ mb: 3, textAlign: 'center' }}>
              <Typography variant="body1" mb={2}>
                Sign in to post and interact
              </Typography>
              <Button
                variant="contained"
                color="primary"
                sx={{
                  py: 1,
                  borderRadius: 5,
                  textTransform: 'none',
                  fontWeight: 'bold'
                }}
                onClick={() => navigate('/login')}
              >
                Sign In
              </Button>
            </Box>
          )}
        </Box>
      )}

      {/* Main Content */}
      <Box 
        sx={{ 
          flexGrow: 1,
          ml: isMobile ? 0 : '280px',
          borderLeft: !isMobile ? '1px solid #f0f0f0' : 'none',
          borderRight: '1px solid #f0f0f0',
          maxWidth: isMobile ? '100%' : '600px',
          margin: isMobile ? '0 auto' : '0 auto 0 280px'
        }}
      >
        {/* Header */}
        <Box 
          sx={{ 
            p: 2, 
            borderBottom: '1px solid #f0f0f0',
            position: 'sticky',
            top: 64,
            zIndex: 10,
            bgcolor: 'white'
          }}
        >
          <Typography variant="h6" fontWeight="bold">
            Home
          </Typography>
        </Box>

        {/* Posts */}
        {posts.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="body1" color="text.secondary">
              No posts yet. Be the first to post!
            </Typography>
          </Box>
        ) : (
          posts.map((post) => (
            <Box 
              key={post.post_id}
              sx={{ 
                borderBottom: '1px solid #f0f0f0',
                '&:hover': {
                  bgcolor: 'rgba(0, 0, 0, 0.01)'
                }
              }}
            >
              <Box 
                sx={{ 
                  p: 3,
                  display: 'flex'
                }}
              >
                {/* Avatar */}
                <Avatar 
                  sx={{ 
                    width: 48, 
                    height: 48,
                    mr: 2,
                    bgcolor: theme.palette.primary.main,
                    cursor: 'pointer'
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/profile/${post.author?.id}`);
                  }}
                >
                  {post.author?.first_name?.[0] || ''}
                  {post.author?.last_name?.[0] || ''}
                </Avatar>
                
                {/* Content */}
                <Box sx={{ width: '100%' }}>
                  {/* Author and Time */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Typography 
                        fontWeight="bold" 
                        sx={{ 
                          mr: 1,
                          '&:hover': { textDecoration: 'underline' },
                          cursor: 'pointer'
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/profile/${post.author?.id}`);
                        }}
                      >
                        {post.author?.first_name} {post.author?.last_name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        · {formatTime(post.created_at)}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {currentUser && post.author?.id !== currentUser.id && (
                        <Button
                          variant={followingStatus.get(post.author?.id || '') ? "outlined" : "contained"}
                          size="small"
                          sx={{
                            borderRadius: 5,
                            px: 2,
                            py: 0.5,
                            minWidth: 0,
                            textTransform: 'none',
                            fontWeight: 'bold',
                            fontSize: '0.75rem',
                            mr: 1
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFollow(post.author?.id || '');
                          }}
                        >
                          {followingStatus.get(post.author?.id || '') ? 'Following' : 'Follow'}
                        </Button>
                      )}
                      
                      {currentUser && post.author?.id === currentUser.id && (
                        <IconButton 
                          size="small"
                          onClick={(e) => handleMenuOpen(e, post)}
                        >
                          <MoreIcon fontSize="small" />
                        </IconButton>
                      )}
                    </Box>
                  </Box>
                  
                  {/* Post title and content */}
                  {post.title && (
                    <Typography 
                      variant="body1" 
                      sx={{ 
                        mb: 1, 
                        fontWeight: 'bold' 
                      }}
                    >
                      {post.title}
                    </Typography>
                  )}
                  
                  <Typography 
                    variant="body1" 
                    sx={{ 
                      mb: 2,
                      whiteSpace: 'pre-wrap'
                    }}
                  >
                    {post.content}
                  </Typography>
                  
                  {/* Post engagement options */}
                  <Box sx={{ display: 'flex', justifyContent: 'flex-start', gap: 4 }}>
                    <Box 
                      sx={{ 
                        display: 'flex', 
                        alignItems: 'center',
                        '&:hover': { 
                          color: theme.palette.info.main 
                        },
                        cursor: 'pointer'
                      }}
                      onClick={() => handleCommentsToggle(post.post_id)}
                    >
                      <IconButton 
                        size="small" 
                        sx={{ mr: 0.5 }}
                      >
                        <CommentIcon fontSize="small" />
                      </IconButton>
                      <Typography variant="body2">
                        {post.commentsCount || 0}
                      </Typography>
                    </Box>
                    
                    <Box 
                      sx={{ 
                        display: 'flex', 
                        alignItems: 'center',
                        '&:hover': { 
                          color: theme.palette.error.main 
                        },
                        cursor: 'pointer'
                      }}
                      onClick={() => handleLike(post.post_id)}
                    >
                      <IconButton 
                        size="small" 
                        sx={{ mr: 0.5 }}
                      >
                        {likeStatus[post.post_id] ? 
                          <LikeIcon fontSize="small" color="error" /> : 
                          <LikeOutlineIcon fontSize="small" />
                        }
                      </IconButton>
                      <Typography variant="body2">
                        {post.likesCount || 0}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </Box>
              
              {/* Comments section */}
              {showComments.has(post.post_id) && (
                <Box sx={{ px: 3, pb: 3, ml: 7 }}>
                  <Divider sx={{ mb: 2 }} />
                  
                  {/* Add comment form */}
                  {currentUser && (
                    <Box sx={{ display: 'flex', mb: 3, alignItems: 'flex-start' }}>
                      <Avatar 
                        sx={{ 
                          width: 32, 
                          height: 32,
                          mr: 1.5,
                          bgcolor: theme.palette.primary.main
                        }}
                      >
                        {currentUser.first_name[0]}{currentUser.last_name[0]}
                      </Avatar>
                      <Box sx={{ flexGrow: 1 }}>
                        <TextField
                          fullWidth
                          size="small"
                          placeholder="Add a comment..."
                          variant="outlined"
                          value={commentContent[post.post_id] || ''}
                          onChange={(e) => handleCommentChange(post.post_id, e.target.value)}
                          InputProps={{
                            endAdornment: (
                              <IconButton
                                size="small"
                                color="primary"
                                disabled={commentLoading || !commentContent[post.post_id]?.trim()}
                                onClick={() => handleCommentSubmit(post.post_id)}
                              >
                                {commentLoading ? 
                                  <CircularProgress size={16} /> : 
                                  <SendIcon fontSize="small" />
                                }
                              </IconButton>
                            ),
                            sx: { 
                              borderRadius: 3,
                              bgcolor: 'rgba(0,0,0,0.02)'
                            }
                          }}
                        />
                      </Box>
                    </Box>
                  )}
                  
                  {/* Comments list */}
                  {renderComments(post.post_id)}
                </Box>
              )}
            </Box>
          ))
        )}
      </Box>
      
      {/* Post Options Menu */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuItem onClick={handleEditClick}>
          <ListItemIcon>
            <EditIcon fontSize="small" color="primary" />
          </ListItemIcon>
          <Typography variant="body2">Edit Post</Typography>
        </MenuItem>
        
        <Divider />
        
        <MenuItem onClick={handleDeleteClick}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          <Typography variant="body2" color="error">Delete Post</Typography>
        </MenuItem>
      </Menu>
      
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={isDeleteDialogOpen}
        onClose={() => !deleteLoading && setIsDeleteDialogOpen(false)}
      >
        <DialogTitle>Delete Post</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this post? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setIsDeleteDialogOpen(false)} 
            disabled={deleteLoading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteConfirm} 
            color="error" 
            variant="contained"
            disabled={deleteLoading}
          >
            {deleteLoading ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Edit Post Dialog */}
      {isEditDialogOpen && activePost && (
        <EditPostForm
          open={isEditDialogOpen}
          onClose={() => setIsEditDialogOpen(false)}
          post={{
            postId: activePost.post_id,
            title: activePost.title,
            content: activePost.content,
            createdAt: activePost.created_at,
            commentsCount: activePost.commentsCount || 0,
            author: {
              accountId: activePost.author?.id || '',
              firstName: activePost.author?.first_name || 'Unknown',
              lastName: activePost.author?.last_name || 'User'
            }
          }}
          onPostUpdated={handlePostUpdated}
        />
      )}
      
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