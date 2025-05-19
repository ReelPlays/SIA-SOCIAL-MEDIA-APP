// src/components/CommentItem.tsx - Update to fix the onClose type error

import React, { useState } from 'react';
import { useMutation } from '@apollo/client';
import {
  Box,
  Typography,
  Avatar,
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
  CircularProgress,
  useTheme
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import { DELETE_COMMENT } from '../graphql/mutations';
import CommentForm from './CommentForm';

interface CommentItemProps {
  comment: {
    commentId: string;
    content: string;
    createdAt: string;
    updatedAt?: string | null;
    author: {
      accountId: string;
      firstName: string;
      lastName: string;
    };
  };
  postId: string;
  currentUserId: string | null;
  onCommentDeleted?: () => void;
  onCommentUpdated?: () => void;
}

const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  postId,
  currentUserId,
  onCommentDeleted,
  onCommentUpdated
}) => {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  // Delete comment mutation
  const [deleteComment, { loading: deleteLoading }] = useMutation(DELETE_COMMENT, {
    onCompleted: () => {
      setIsDeleteDialogOpen(false);
      if (onCommentDeleted) onCommentDeleted();
    },
    onError: (err) => {
      console.error('Error deleting comment:', err);
      setIsDeleteDialogOpen(false);
    }
  });

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  // Modified handler to match the expected type for Menu onClose
  const handleMenuClose = (event?: React.MouseEvent | {}, reason?: "backdropClick" | "escapeKeyDown") => {
    if (event && 'stopPropagation' in event) {
      event.stopPropagation();
    }
    setAnchorEl(null);
  };

  const handleEditClick = (event?: React.MouseEvent) => {
    if (event) event.stopPropagation();
    handleMenuClose();
    setIsEditing(true);
  };

  const handleDeleteClick = (event?: React.MouseEvent) => {
    if (event) event.stopPropagation();
    handleMenuClose();
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = (event?: React.MouseEvent) => {
    if (event) event.stopPropagation();
    deleteComment({
      variables: {
        commentId: comment.commentId
      }
    });
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleCommentUpdated = () => {
    setIsEditing(false);
    if (onCommentUpdated) onCommentUpdated();
  };

  const isOwner = currentUserId === comment.author.accountId;
  const menuOpen = Boolean(anchorEl);
  const commentDate = new Date(comment.createdAt);
  const timeAgo = formatDistanceToNow(commentDate, { addSuffix: true });
  const wasEdited = Boolean(comment.updatedAt);

  if (isEditing) {
    return (
      <Box sx={{ mb: 2 }}>
        <CommentForm
          postId={postId}
          commentId={comment.commentId}
          initialContent={comment.content}
          onCommentUpdated={handleCommentUpdated}
          onCancel={handleCancelEdit}
        />
      </Box>
    );
  }

  return (
    <Box 
      sx={{ 
        mb: 2.5,
        transition: 'all 0.2s ease',
      }}
      className="fade-in"
    >
      <Box sx={{ display: 'flex' }}>
        <Avatar 
          sx={{ 
            width: 36, 
            height: 36, 
            mr: 1.5,
            bgcolor: theme.palette.primary.main, 
            fontWeight: 'bold',
            fontSize: '0.9rem',
            boxShadow: '0 2px 5px rgba(129, 93, 171, 0.2)'
          }}
        >
          {comment.author.firstName[0]?.toUpperCase() ?? '?'}
          {comment.author.lastName[0]?.toUpperCase() ?? ''}
        </Avatar>
        
        <Box sx={{ flex: 1 }}>
          <Box sx={{ 
            bgcolor: 'rgba(0,0,0,0.04)', 
            p: 2, 
            borderRadius: 3,
            position: 'relative',
            '&:hover': {
              bgcolor: 'rgba(0,0,0,0.05)',
            }
          }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
              {comment.author.firstName} {comment.author.lastName}
            </Typography>
            
            <Typography 
              variant="body2" 
              sx={{ 
                whiteSpace: 'pre-wrap',
                color: theme.palette.text.secondary,
                lineHeight: 1.5
              }}
            >
              {comment.content}
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5, ml: 1 }}>
            <Typography 
              variant="caption" 
              color="text.secondary"
              sx={{ fontSize: '0.7rem' }}
            >
              {timeAgo}
            </Typography>
            
            {wasEdited && (
              <Typography 
                variant="caption" 
                color="text.secondary" 
                sx={{ ml: 1, fontSize: '0.7rem' }}
              >
                • edited
              </Typography>
            )}
          </Box>
        </Box>
        
        {isOwner && (
          <Box>
            <IconButton
              size="small"
              onClick={handleMenuOpen}
              aria-label="more options"
              aria-controls={menuOpen ? "comment-menu" : undefined}
              aria-expanded={menuOpen ? "true" : undefined}
              aria-haspopup="true"
              sx={{
                p: 0.5,
                '&:hover': {
                  backgroundColor: 'rgba(129, 93, 171, 0.1)'
                }
              }}
            >
              <MoreVertIcon fontSize="small" />
            </IconButton>
            
            <Menu
              id="comment-menu"
              anchorEl={anchorEl}
              open={menuOpen}
              onClose={handleMenuClose}
              onClick={(e) => e.stopPropagation()}
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
                <Typography variant="body2">Edit</Typography>
              </MenuItem>
              
              <Divider />
              
              <MenuItem onClick={handleDeleteClick}>
                <ListItemIcon>
                  <DeleteIcon fontSize="small" color="error" />
                </ListItemIcon>
                <Typography variant="body2" color="error">Delete</Typography>
              </MenuItem>
            </Menu>
          </Box>
        )}
      </Box>
      
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={isDeleteDialogOpen}
        onClose={() => !deleteLoading && setIsDeleteDialogOpen(false)}
        onClick={(e) => e.stopPropagation()}
      >
        <DialogTitle sx={{ pb: 1 }}>Delete Comment</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this comment? This action cannot be undone.
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
            startIcon={deleteLoading ? <CircularProgress size={16} color="inherit" /> : <DeleteIcon />}
          >
            {deleteLoading ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CommentItem;