// src/components/PostCard.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, 
  Typography, 
  IconButton, 
  Menu, 
  MenuItem, 
  ListItemIcon,
  Divider,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Button,
  useTheme,
  Card,
  CardContent,
  CardActions,
  CardHeader
} from '@mui/material';
import {
  MoreHoriz as MoreHorizIcon,
  ChatBubbleOutline as ChatBubbleOutlineIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Share as ShareIcon
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import FollowButton from './FollowButton';
import LikeButton from './LikeButton';
import CommentsSection from './CommentsSection';
import EditPostForm from './EditPostForm';
import UserAvatar from './UserAvatar';

interface PostCardProps {
  post: {
    postId: string;
    title: string;
    content: string;
    createdAt: string;
    commentsCount: number;
    likesCount?: number;
    isLiked?: boolean;
    author: {
      accountId: string;
      firstName: string;
      lastName: string;
      isFollowing?: boolean;
    };
  };
  currentUserId: string | null;
  onPostDeleted?: () => void;
  onPostUpdated?: () => void;
  onFollowUpdate?: (userId: string, isFollowing: boolean) => void;
  onLikeUpdate?: (postId: string, isLiked: boolean, likeCount: number) => void;
  renderContent?: (content: string) => React.ReactNode; // Added render function prop
}

const PostCard: React.FC<PostCardProps> = ({
  post,
  currentUserId,
  onPostDeleted,
  onPostUpdated,
  onFollowUpdate,
  onLikeUpdate,
  renderContent
}) => {
  const navigate = useNavigate();
  const theme = useTheme();
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [showComments, setShowComments] = useState(false);
  
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setMenuAnchorEl(event.currentTarget);
    event.stopPropagation();
  };
  
  const handleMenuClose = (
    event: React.MouseEvent<HTMLElement> | {}, 
    reason?: "backdropClick" | "escapeKeyDown"
  ) => {
    if (event && 'stopPropagation' in event) {
      event.stopPropagation();
    }
    setMenuAnchorEl(null);
  };
  
  const handleEditClick = (event?: React.MouseEvent<HTMLElement>) => {
    if (event) {
      handleMenuClose(event);
    } else {
      handleMenuClose({});
    }
    setIsEditDialogOpen(true);
  };

  const handleDeleteClick = (event?: React.MouseEvent<HTMLElement>) => {
    if (event) {
      handleMenuClose(event);
    } else {
      handleMenuClose({});
    }
    setIsDeleteDialogOpen(true);
  };
  
  const handleDeleteConfirm = () => {
    if (onPostDeleted) onPostDeleted();
    setIsDeleteDialogOpen(false);
  };
  
  const handleCommentsToggle = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setShowComments(prev => !prev);
  };
  
  const handlePostUpdated = () => {
    if (onPostUpdated) onPostUpdated();
  };
  
  const handleCardClick = () => {
    // Expand comments or navigate to post detail
    setShowComments(true);
  };
  
  const handleNavigateToProfile = (event: React.MouseEvent) => {
    event.stopPropagation();
    navigate(`/profile/${post.author.accountId}`);
  };
  
  const postDate = new Date(post.createdAt);
  const timeAgo = formatDistanceToNow(postDate, { addSuffix: true });
  const isOwner = currentUserId === post.author.accountId;
  const menuOpen = Boolean(menuAnchorEl);
  const likesCount = post.likesCount ?? 0;
  const isLiked = post.isLiked ?? false;
  
  return (
    <Card 
      elevation={1} 
      sx={{ 
        mb: 2, 
        borderRadius: 3, 
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        '&:hover': { 
          transform: 'translateY(-2px)',
          boxShadow: theme.shadows[3]
        },
        border: '1px solid rgba(129, 93, 171, 0.1)',
        width: '100%',
      }}
      onClick={handleCardClick}
    >
      <CardHeader
        avatar={
          <UserAvatar
            userId={post.author.accountId}
            firstName={post.author.firstName}
            lastName={post.author.lastName}
            size={48}
            sx={{ 
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(129, 93, 171, 0.2)',
              '&:hover': {
                transform: 'scale(1.05)'
              }
            }}
            onClick={handleNavigateToProfile}
          />
        }
        action={
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {currentUserId && post.author.accountId !== currentUserId && (
              <FollowButton
                userIdToFollow={post.author.accountId}
                initialIsFollowing={post.author.isFollowing || false}
                currentUserId={currentUserId}
                onUpdate={onFollowUpdate}
              />
            )}
            
            {isOwner && (
              <IconButton
                size="small"
                onClick={handleMenuOpen}
                aria-label="more options"
                aria-controls={menuOpen ? "post-menu" : undefined}
                aria-expanded={menuOpen ? "true" : undefined}
                aria-haspopup="true"
                sx={{ 
                  ml: 1,
                  '&:hover': {
                    bgcolor: 'rgba(129, 93, 171, 0.1)'
                  }
                }}
              >
                <MoreHorizIcon />
              </IconButton>
            )}
          </Box>
        }
        title={
          <Typography 
            fontWeight="bold" 
            sx={{ 
              cursor: 'pointer',
              '&:hover': { textDecoration: 'underline' }
            }}
            onClick={handleNavigateToProfile}
          >
            {post.author.firstName} {post.author.lastName}
          </Typography>
        }
        subheader={
          <Typography variant="body2" color="text.secondary">
            {timeAgo}
          </Typography>
        }
        sx={{ pb: 1 }}
      />
      
      <CardContent sx={{ pt: 0, pb: 1 }}>
        {post.title && (
          <Typography 
            variant="h6" 
            sx={{ 
              mb: 1.5, 
              fontWeight: '600',
              fontSize: '1.15rem',
              lineHeight: 1.3
            }}
          >
            {post.title}
          </Typography>
        )}
        
        {/* Use the renderContent function if provided, otherwise fall back to basic rendering */}
        {renderContent ? renderContent(post.content) : (
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
            {post.content}
          </Typography>
        )}
      </CardContent>
      
      <Divider />
      
      <CardActions sx={{ px: 2, py: 1, justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <LikeButton
            postId={post.postId}
            initialLikeCount={likesCount}
            initialIsLiked={isLiked}
            currentUserId={currentUserId}
            onLikeUpdate={onLikeUpdate}
          />
          
          <Box 
            sx={{ 
              display: 'flex', 
              alignItems: 'center',
              ml: 2,
              cursor: 'pointer'
            }}
            onClick={handleCommentsToggle}
          >
            <IconButton 
              size="small"
              sx={{
                '&:hover': {
                  color: theme.palette.primary.main,
                  bgcolor: 'rgba(129, 93, 171, 0.1)'
                }
              }}
            >
              <ChatBubbleOutlineIcon fontSize="small" />
            </IconButton>
            <Typography variant="body2" color="text.secondary" sx={{ ml: 0.5 }}>
              {post.commentsCount}
            </Typography>
          </Box>
        </Box>
        
        <IconButton 
          size="small"
          onClick={(e) => e.stopPropagation()}
          sx={{
            '&:hover': {
              color: theme.palette.primary.main,
              bgcolor: 'rgba(129, 93, 171, 0.1)'
            }
          }}
        >
          <ShareIcon fontSize="small" />
        </IconButton>
      </CardActions>
      
      {/* Comments Section */}
      {showComments && (
        <Box 
          sx={{ px: 2, pb: 2 }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <CommentsSection 
            postId={post.postId}
            currentUserId={currentUserId}
          />
        </Box>
      )}
      
      {/* Post Menu */}
      <Menu
        id="post-menu"
        anchorEl={menuAnchorEl}
        open={menuOpen}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        onClick={(e) => e.stopPropagation()}
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
        onClose={() => setIsDeleteDialogOpen(false)}
        onClick={(e) => e.stopPropagation()}
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
          >
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteConfirm} 
            color="error" 
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Edit Post Dialog */}
      {isEditDialogOpen && (
        <EditPostForm
          open={isEditDialogOpen}
          onClose={() => setIsEditDialogOpen(false)}
          post={post}
          onPostUpdated={handlePostUpdated}
        />
      )}
    </Card>
  );
};

export default PostCard;