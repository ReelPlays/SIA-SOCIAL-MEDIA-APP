// src/components/CommentForm.tsx
import React, { useState } from 'react';
import { useMutation } from '@apollo/client';
import {
  TextField,
  Button,
  Box,
  CircularProgress,
  Alert,
  useTheme,
  InputAdornment,
  IconButton
} from '@mui/material';
import { Send as SendIcon, Close as CloseIcon } from '@mui/icons-material';
import { CREATE_COMMENT, UPDATE_COMMENT } from '../graphql/mutations';
import { supabase } from '../lib/supabase';
import UserAvatar from './UserAvatar'; // Add this import

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
  const theme = useTheme();
  const [content, setContent] = useState(initialContent);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Fetch current user when the component mounts
  React.useEffect(() => {
    const fetchCurrentUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        const { data: userData } = await supabase
          .from('accounts')
          .select('id, first_name, last_name, profile_picture_url')
          .eq('id', data.user.id)
          .single();
        
        if (userData) {
          setCurrentUser(userData);
        }
      }
    };
    
    fetchCurrentUser();
  }, []);

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
    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1, mb: 2 }}>
      {error && (
        <Alert 
          severity="error" 
          sx={{ 
            mb: 2,
            borderRadius: 2
          }}
        >
          {error}
        </Alert>
      )}
      
      <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
        {/* Replace Avatar with UserAvatar */}
        {currentUser && (
          <UserAvatar 
            userId={currentUser.id}
            firstName={currentUser.first_name}
            lastName={currentUser.last_name}
            profilePictureUrl={currentUser.profile_picture_url}
            size={32}
            sx={{ 
              mr: 1.5,
            }}
          />
        )}
        <TextField
          fullWidth
          multiline
          minRows={1}
          maxRows={4}
          variant="outlined"
          placeholder={isEditing ? "Edit your comment..." : "Add a comment..."}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          disabled={loading}
          sx={{ 
            mb: 1,
            '& .MuiOutlinedInput-root': {
              borderRadius: 3,
              bgcolor: 'rgba(0,0,0,0.02)',
              transition: 'all 0.2s ease',
              '&:hover': {
                bgcolor: 'rgba(0,0,0,0.03)',
              },
              '&.Mui-focused': {
                bgcolor: 'white',
              }
            }
          }}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                {content.trim() && (
                  <IconButton 
                    type="submit"
                    disabled={loading || !content.trim()}
                    size="small"
                    color="primary"
                    sx={{
                      mr: 0.5,
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        transform: 'scale(1.1)'
                      }
                    }}
                  >
                    {loading ? (
                      <CircularProgress size={20} color="inherit" />
                    ) : (
                      <SendIcon fontSize="small" />
                    )}
                  </IconButton>
                )}
              </InputAdornment>
            )
          }}
        />
      </Box>
      
      {isEditing && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
          <Button 
            variant="outlined" 
            color="inherit" 
            onClick={onCancel}
            disabled={loading}
            size="small"
            startIcon={<CloseIcon fontSize="small" />}
            sx={{ 
              borderRadius: 3,
              textTransform: 'none',
              fontWeight: 500
            }}
          >
            Cancel
          </Button>
          
          <Button 
            type="submit" 
            variant="contained" 
            color="primary"
            disabled={loading || !content.trim()}
            size="small"
            sx={{ 
              borderRadius: 3,
              textTransform: 'none',
              fontWeight: 500
            }}
          >
            {loading ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              'Update'
            )}
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default CommentForm;