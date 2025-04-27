import { useEffect, useState } from 'react';
import {
  Badge,
  Box,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Popover,
  Typography,
  CircularProgress,
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import { supabase } from '../lib/supabase';

interface Notification {
  id: number;
  user_id: string;
  sender_id?: string;
  type: string;
  content: string;
  resource_id?: string;
  resource_url?: string;
  is_read: boolean;
  created_at: string;
  updated_at: string;
}

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
    fetchNotifications();
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);
  const id = open ? 'notification-popover' : undefined;

  useEffect(() => {
    fetchNotifications();
    // Set up a polling interval to check for new notifications
    const interval = setInterval(fetchNotifications, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) {
        throw new Error('User not logged in.');
      }
      
      const userId = userData.user.id;
      
      // In a real app, you would fetch from your notification service
      // For now, we'll use Supabase directly
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);
        
      if (error) throw error;
      
      if (data) {
        setNotifications(data);
        const unread = data.filter(notification => !notification.is_read).length;
        setUnreadCount(unread);
      }
    } catch (error: any) {
      console.error('Error fetching notifications:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: number) => {
    try {
      // In a real app, you would call your notification service
      // For now, we'll use Supabase directly
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, updated_at: new Date().toISOString() })
        .eq('id', notificationId);
        
      if (error) throw error;
      
      // Update local state
      setNotifications(prevNotifications => 
        prevNotifications.map(notification => 
          notification.id === notificationId 
            ? { ...notification, is_read: true } 
            : notification
        )
      );
      
      // Update unread count
      setUnreadCount(prevCount => Math.max(0, prevCount - 1));
    } catch (error: any) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) return;
      
      const userId = userData.user.id;
      
      // In a real app, you would call your notification service
      // For now, we'll use Supabase directly
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('is_read', false);
        
      if (error) throw error;
      
      // Update local state
      setNotifications(prevNotifications => 
        prevNotifications.map(notification => ({ ...notification, is_read: true }))
      );
      
      // Reset unread count
      setUnreadCount(0);
    } catch (error: any) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return `${diffInSeconds} seconds ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    return `${Math.floor(diffInSeconds / 86400)} days ago`;
  };

  return (
    <>
      <IconButton
        aria-describedby={id}
        onClick={handleClick}
        color="inherit"
      >
        <Badge badgeContent={unreadCount} color="error">
          <NotificationsIcon />
        </Badge>
      </IconButton>
      
      <Popover
        id={id}
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <Box sx={{ width: 320, maxHeight: 400, overflow: 'auto' }}>
          <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Notifications</Typography>
            {unreadCount > 0 && (
              <Typography 
                variant="body2" 
                color="primary" 
                sx={{ cursor: 'pointer' }}
                onClick={markAllAsRead}
              >
                Mark all as read
              </Typography>
            )}
          </Box>
          
          <Divider />
          
          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
              <CircularProgress size={24} />
            </Box>
          )}
          
          {error && (
            <Box sx={{ p: 2 }}>
              <Typography color="error">{error}</Typography>
            </Box>
          )}
          
          {!loading && !error && notifications.length === 0 && (
            <Box sx={{ p: 2 }}>
              <Typography align="center" color="text.secondary">
                No notifications
              </Typography>
            </Box>
          )}
          
          <List sx={{ p: 0 }}>
            {notifications.map((notification) => (
              <ListItem 
                key={notification.id}
                onClick={() => markAsRead(notification.id)}
                sx={{ 
                  cursor: 'pointer',
                  bgcolor: notification.is_read ? 'transparent' : 'action.hover',
                  '&:hover': { bgcolor: 'action.selected' }
                }}
              >
                <ListItemText
                  primary={notification.content}
                  secondary={formatTimeAgo(notification.created_at)}
                  primaryTypographyProps={{
                    variant: 'body2',
                    fontWeight: notification.is_read ? 'normal' : 'bold'
                  }}
                />
              </ListItem>
            ))}
          </List>
        </Box>
      </Popover>
    </>
  );
}