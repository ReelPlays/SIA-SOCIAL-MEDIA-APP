import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, 
  Paper, 
  Avatar, 
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
  CircularProgress
} from '@mui/material';
import {
  MoreHoriz as MoreHorizIcon,
  ChatBubbleOutline as ChatBubbleOutlineIcon,
  Edit as EditIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import { useMutation } from '@apollo/client';
import { DELETE_POST } from '../graphql/mutations';
import FollowButton from './FollowButton';
import LikeButton from './LikeButton';
import CommentsSection from './CommentsSection';
import EditPostForm from './EditPostForm';

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
}

const PostCard: React.FC<PostCardProps> = ({
  post,
  currentUserId,
  onPostDeleted,
  onPostUpdated,
  onFollowUpdate,
  onLikeUpdate
}) => {
  const navigate = useNavigate();
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [showComments, setShowComments] = useState(false);
  
  // Delete post mutation
  const [deletePost, { loading: deleteLoading }] = useMutation(DELETE_POST, {
    onCompleted: () => {
      setIsDeleteDialogOpen(false);
      if (onPostDeleted) onPostDeleted();
    },
    onError: (err) => {
      console.error('Error deleting post:', err);
      setIsDeleteDialogOpen(false);
    }
  });
  
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setMenuAnchorEl(event.currentTarget);
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
    deletePost({
      variables: {
        postId: post.postId
      }
    });
  };
  
  const handleCommentsToggle = () => {
    setShowComments(prev => !prev);
  };
  
  const handlePostUpdated = () => {
    if (onPostUpdated) onPostUpdated();
  };
  
  const postDate = new Date(post.createdAt);
  const timeAgo = formatDistanceToNow(postDate, { addSuffix: true });
  const isOwner = currentUserId === post.author.accountId;
  const menuOpen = Boolean(menuAnchorEl);
  const likesCount = post.likesCount ?? 0;
  const isLiked = post.isLiked ?? false;
  
  return (
    <Paper 
      elevation={1} 
      sx={{ 
        mb: 3, 
        borderRadius: 2, 
        overflow: 'hidden',
        '&:hover': { boxShadow: 2 }
      }}
    >
      <Box sx={{ p: 3 }}>
        {/* Post Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Avatar
              sx={{ width: 48, height: 48, mr: 2 }}
              onClick={() => navigate(`/profile/${post.author.accountId}`)}
            >
              {post.author.firstName[0]?.toUpperCase() ?? '?'}
              {post.author.lastName[0]?.toUpperCase() ?? ''}
            </Avatar>
            
            <Box>
              <Typography 
                fontWeight="bold" 
                sx={{ 
                  cursor: 'pointer',
                  '&:hover': { textDecoration: 'underline' }
                }}
                onClick={() => navigate(`/profile/${post.author.accountId}`)}
              >
                {post.author.firstName} {post.author.lastName}
              </Typography>
              
              <Typography variant="body2" color="text.secondary">
                {timeAgo}
              </Typography>
            </Box>
          </Box>
          
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
                sx={{ ml: 1 }}
              >
                <MoreHorizIcon />
              </IconButton>
            )}
          </Box>
        </Box>
        
        {/* Post Content */}
        {post.title && (
          <Typography variant="h6" sx={{ mb: 1, fontWeight: 'medium' }}>
            {post.title}
          </Typography>
        )}
        
        <Typography 
          variant="body1" 
          sx={{ 
            mb: 3, 
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word'
          }}
        >
          {post.content}
        </Typography>
        
        {/* Post Actions */}
        <Box 
          sx={{ 
            display: 'flex', 
            alignItems: 'center',
            borderTop: '1px solid #eee',
            pt: 2
          }}
        >
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
            <IconButton size="small">
              <ChatBubbleOutlineIcon fontSize="small" />
            </IconButton>
            <Typography variant="body2" color="text.secondary">
              {post.commentsCount}
            </Typography>
          </Box>
        </Box>
        
        {/* Comments Section */}
        {showComments && (
          <CommentsSection 
            postId={post.postId}
            currentUserId={currentUserId}
          />
        )}
      </Box>
      
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
      >
        <MenuItem onClick={handleEditClick}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          Edit Post
        </MenuItem>
        
        <Divider />
        
        <MenuItem onClick={handleDeleteClick}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" />
          </ListItemIcon>
          Delete Post
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
            disabled={deleteLoading}
            startIcon={deleteLoading ? <CircularProgress size={16} /> : <DeleteIcon />}
          >
            {deleteLoading ? "Deleting..." : "Delete"}
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
    </Paper>
  );
};

export default PostCard;