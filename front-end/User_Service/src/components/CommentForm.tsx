import React, { useState } from 'react';
import { useMutation } from '@apollo/client';
import {
  TextField,
  Button,
  Box,
  CircularProgress,
  Alert
} from '@mui/material';
import { CREATE_COMMENT, UPDATE_COMMENT } from '../graphql/mutations';

interface CommentFormProps {
  postId: string;
  commentId?: string; // Optional - if provided, we are editing an existing comment
  initialContent?: string; // Used for editing
  onCommentAdded?: () => void; // Callback for when a comment is added successfully
  onCommentUpdated?: () => void; // Callback for when a comment is updated successfully
  onCancel?: () => void; // Callback for when editing is canceled
}

const CommentForm: React.FC<CommentFormProps> = ({
  postId,
  commentId,
  initialContent = '',
  onCommentAdded,
  onCommentUpdated,
  onCancel
}) => {
  const [content, setContent] = useState(initialContent);
  const [error, setError] = useState<string | null>(null);

  // Create comment mutation
  const [createComment, { loading: createLoading }] = useMutation(CREATE_COMMENT, {
    onCompleted: () => {
      setContent('');
      setError(null);
      if (onCommentAdded) onCommentAdded();
    },
    onError: (err) => {
      console.error('Error creating comment:', err);
      setError(err.message || 'Failed to add comment. Please try again.');
    }
  });

  // Update comment mutation
  const [updateComment, { loading: updateLoading }] = useMutation(UPDATE_COMMENT, {
    onCompleted: () => {
      setError(null);
      if (onCommentUpdated) onCommentUpdated();
    },
    onError: (err) => {
      console.error('Error updating comment:', err);
      setError(err.message || 'Failed to update comment. Please try again.');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim()) {
      setError('Comment cannot be empty');
      return;
    }

    // Clear any previous errors
    setError(null);

    // If commentId is provided, we're updating an existing comment
    if (commentId) {
      updateComment({
        variables: {
          input: {
            commentId,
            content: content.trim()
          }
        }
      });
    } else {
      // Otherwise, we're creating a new comment
      createComment({
        variables: {
          input: {
            postId,
            content: content.trim()
          }
        }
      });
    }
  };

  const loading = createLoading || updateLoading;
  const isEditing = Boolean(commentId);

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2, mb: 2 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      <TextField
        fullWidth
        multiline
        rows={2}
        variant="outlined"
        placeholder={isEditing ? "Edit your comment..." : "Write a comment..."}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        disabled={loading}
        sx={{ mb: 1 }}
      />
      
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
        {isEditing && (
          <Button 
            variant="outlined" 
            color="inherit" 
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </Button>
        )}
        
        <Button 
          type="submit" 
          variant="contained" 
          color="primary"
          disabled={loading || !content.trim()}
        >
          {loading ? (
            <CircularProgress size={24} color="inherit" />
          ) : isEditing ? (
            'Update'
          ) : (
            'Comment'
          )}
        </Button>
      </Box>
    </Box>
  );
};

export default CommentForm;