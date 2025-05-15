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
  CircularProgress
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
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleEditClick = () => {
    handleMenuClose();
    setIsEditing(true);
  };

  const handleDeleteClick = () => {
    handleMenuClose();
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
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
      <Box sx={{ mb: 2, pl: 2, pr: 2 }}>
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
    <Box sx={{ mb: 2, pl: 2, pr: 2 }}>
      <Box sx={{ display: 'flex' }}>
        <Avatar sx={{ width: 36, height: 36, mr: 2 }}>
          {comment.author.firstName[0]?.toUpperCase() ?? '?'}
          {comment.author.lastName[0]?.toUpperCase() ?? ''}
        </Avatar>
        
        <Box sx={{ flex: 1 }}>
          <Box sx={{ 
            bgcolor: '#f0f2f5', 
            p: 1.5, 
            borderRadius: 2,
            position: 'relative'
          }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
              {comment.author.firstName} {comment.author.lastName}
            </Typography>
            
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
              {comment.content}
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5, ml: 1 }}>
            <Typography variant="caption" color="text.secondary">
              {timeAgo}
            </Typography>
            
            {wasEdited && (
              <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                (edited)
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
            >
              <MoreVertIcon fontSize="small" />
            </IconButton>
            
            <Menu
              id="comment-menu"
              anchorEl={anchorEl}
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
                Edit
              </MenuItem>
              
              <Divider />
              
              <MenuItem onClick={handleDeleteClick}>
                <ListItemIcon>
                  <DeleteIcon fontSize="small" />
                </ListItemIcon>
                Delete
              </MenuItem>
            </Menu>
          </Box>
        )}
      </Box>
      
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={isDeleteDialogOpen}
        onClose={() => !deleteLoading && setIsDeleteDialogOpen(false)}
      >
        <DialogTitle>Delete Comment</DialogTitle>
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
            disabled={deleteLoading}
            startIcon={deleteLoading ? <CircularProgress size={16} /> : <DeleteIcon />}
          >
            {deleteLoading ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CommentItem;