
import type React from "react"
import { useEffect, useState, useCallback } from "react"
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
  Alert,
  ListItemButton,
  ListItemIcon,
  IconButton,
  Menu,
  MenuItem,
  Snackbar,
} from "@mui/material"

import {
  Home as HomeIcon,
  Notifications as NotificationsIcon,
  Email as EmailIcon,
  Person as PersonIcon,
  MoreHoriz as MoreHorizIcon,
  Close as CloseIcon,
  ChatBubbleOutline as ChatBubbleOutlineIcon,
  FavoriteBorder as FavoriteBorderIcon,
} from "@mui/icons-material"
import { useNavigate } from "react-router-dom"
import { supabase } from "../lib/supabase"
import FollowButton from "./FollowButton"

// Interface for posts fetched via Supabase
interface Post {
  post_id: string
  title: string
  content: string
  created_at: string
  author: {
    id: string
    first_name: string
    last_name: string
  } | null
}

// Interface for current user data
interface Account {
  id: string
  first_name: string
  last_name: string
  email: string
}

export default function Posts() {
  const navigate = useNavigate()
  const [loadingPosts, setLoadingPosts] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [currentUser, setCurrentUser] = useState<Account | null>(null)
  const [currentUserLoading, setCurrentUserLoading] = useState(true)
  const [hiddenPosts, setHiddenPosts] = useState(new Map())

  // State for following status: Map<authorId, isFollowing>
  const [followingStatus, setFollowingStatus] = useState<Map<string, boolean>>(new Map())
  const [loadingFollowStatus, setLoadingFollowStatus] = useState(false)

  // State for dropdown menu
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null)
  const [activePostId, setActivePostId] = useState<string | null>(null)
  const [notification, setNotification] = useState<{ id: string; type: string } | null>(null)

  // Helper function to get time ago
  const getTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - date) / 1000)

    let interval = Math.floor(seconds / 31536000)
    if (interval >= 1) {
      return interval === 1 ? "1y" : `${interval}y`
    }

    interval = Math.floor(seconds / 2592000)
    if (interval >= 1) {
      return interval === 1 ? "1mo" : `${interval}mo`
    }

    interval = Math.floor(seconds / 86400)
    if (interval >= 1) {
      return interval === 1 ? "1d" : `${interval}d`
    }

    interval = Math.floor(seconds / 3600)
    if (interval >= 1) {
      return interval === 1 ? "1h" : `${interval}h`
    }

    interval = Math.floor(seconds / 60)
    if (interval >= 1) {
      return interval === 1 ? "1m" : `${interval}m`
    }

    return "just now"
  }

  // Open menu
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, postId: string) => {
    setMenuAnchorEl(event.currentTarget)
    setActivePostId(postId)
  }

  // Close menu
  const handleMenuClose = () => {
    setMenuAnchorEl(null)
    setActivePostId(null)
  }

  // Hide post
  const hidePost = (postId: string) => {
    setHiddenPosts((prev) => {
      const newMap = new Map(prev)
      newMap.set(postId, true)
      return newMap
    })
    handleMenuClose()
    setNotification({ id: postId, type: "hidden" })

    // Auto-dismiss notification after 5 seconds
    setTimeout(() => {
      setNotification(null)
    }, 5000)
  }

  // Undo hide post
  const undoHidePost = (postId: string) => {
    setHiddenPosts((prev) => {
      const newMap = new Map(prev)
      newMap.delete(postId)
      return newMap
    })
    setNotification(null)
  }

  // Close notification
  const handleNotificationClose = () => {
    setNotification(null)
  }

  // Fetch current user (keep this)
  const fetchCurrentUser = useCallback(async () => {
    setCurrentUserLoading(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        const { data, error } = await supabase
          .from("accounts")
          .select("id, first_name, last_name, email")
          .eq("id", user.id)
          .single()
        if (error) throw error
        setCurrentUser(data)
      } else {
        setCurrentUser(null)
      }
    } catch (error) {
      console.error("Error fetching current user:", error)
      setCurrentUser(null)
    } finally {
      setCurrentUserLoading(false)
    }
  }, [])

  // Fetch posts via Supabase (keep this, but ensure author ID is selected)
  const fetchPosts = useCallback(async () => {
    setError(null) // Clear previous errors
    setLoadingPosts(true)
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
        .order("created_at", { ascending: false })

      if (postsError) throw postsError
      setPosts(postsData || [])
    } catch (err: any) {
      console.error("Error fetching posts:", err)
      setError(err.message)
      setPosts([]) // Clear posts on error
    } finally {
      setLoadingPosts(false)
    }
  }, [])

  // Fetch initial follow statuses when posts or user change
  useEffect(() => {
    const fetchFollowStatus = async () => {
      if (!currentUser || posts.length === 0) {
        setFollowingStatus(new Map()) // Clear status if no user or posts
        return
      }

      // Get unique author IDs from the current posts
      const authorIds = posts
        .map((p) => p.author?.id) // Get author ID
        .filter((id): id is string => id !== null && id !== undefined && id !== currentUser.id) // Filter out nulls/undefined and own ID

      if (authorIds.length === 0) {
        setFollowingStatus(new Map()) // No one else to check
        return
      }

      setLoadingFollowStatus(true)
      try {
        const { data: followsData, error: followsError } = await supabase
          .from("follows")
          .select("followed_user_id") // Select the ID of the person being followed
          .eq("follower_user_id", currentUser.id) // Where the follower is the current user
          .in("followed_user_id", authorIds) // And the followed person is one of the authors

        if (followsError) {
          console.error("Error fetching follow status:", followsError)
          throw followsError
        }

        const newStatusMap = new Map<string, boolean>()
        if (followsData) {
          followsData.forEach((follow) => {
            newStatusMap.set(follow.followed_user_id, true)
          })
        }
        // Update the state with the fetched statuses
        setFollowingStatus(newStatusMap)
      } catch (err) {
        console.error("Failed to fetch follow statuses:", err)
        setFollowingStatus(new Map()) // Clear on error
      } finally {
        setLoadingFollowStatus(false)
      }
    }

    fetchFollowStatus()
  }, [posts, currentUser]) // Re-run when posts or currentUser changes

  // Initial fetch and subscription setup
  useEffect(() => {
    fetchCurrentUser() // Fetch user first
    fetchPosts() // Then fetch posts

    // Set up Supabase real-time subscription for posts
    const postSubscription = supabase
      .channel("public:posts")
      .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, (payload) => {
        console.log("Post change received!", payload)
        // Refetch all posts on any change. Could be optimized later.
        fetchPosts()
      })
      .subscribe()

    // Cleanup subscriptions on component unmount
    return () => {
      supabase.removeChannel(postSubscription)
    }
  }, [fetchCurrentUser, fetchPosts]) // Dependencies for initial fetch setup

  // Callback function to update follow status map from FollowButton clicks
  const handleFollowUpdate = useCallback((followedUserId: string, newStatus: boolean) => {
    setFollowingStatus((prevMap) => {
      const newMap = new Map(prevMap)
      newMap.set(followedUserId, newStatus)
      return newMap
    })
  }, []) // Empty dependency array: function doesn't change

  const visiblePosts = posts.filter((post) => !hiddenPosts.get(post.post_id))
  const isLoading = loadingPosts || currentUserLoading || loadingFollowStatus

  if (isLoading && posts.length === 0) {
    // Show loading only initially or if specifically loading status
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="error">Error loading posts: {error}</Alert>
        <Button onClick={fetchPosts} sx={{ mt: 1 }}>
          Retry
        </Button>
      </Container>
    )
  }

  return (
    <Container maxWidth="2xl" sx={{ py: 2, bgcolor: "#FBF7FF", minHeight: "100vh", marginTop: "-100px" }}>
      <Grid container spacing={3}>
        {/* Left Column - Profile */}
        <Grid item xs={12} md={3}>
          {currentUserLoading && <CircularProgress size={20} />}
          {currentUser && (
            <Paper elevation={1} sx={{ p: 4, mb: 3, borderRadius: 2, position: "sticky", top: 80 }}>
               <Box sx={{ mt: 2, display: "flex", alignItems: "center", p: 1 }}>
                <Avatar sx={{ width: 40, height: 40, mr: 1.5 }}>
                  {currentUser.first_name?.[0]}
                  {currentUser.last_name?.[0]}
                </Avatar>
                <Box>
                  <Typography variant="subtitle2" fontWeight="bold">
                    {currentUser.first_name} {currentUser.last_name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.8rem" }}>
                    @{currentUser.email?.toLowerCase()}
                  </Typography>
                </Box>
              </Box>
              {/* <List>
                <ListItem disablePadding>
                  <ListItemButton sx={{ borderRadius: 30 }}>
                    <ListItemIcon>
                      <HomeIcon />
                    </ListItemIcon>
                    <ListItemText primary="Home" primaryTypographyProps={{ fontWeight: "bold" }} />
                  </ListItemButton>
                </ListItem>
                <ListItem disablePadding>
                  <ListItemButton sx={{ borderRadius: 30 }}>
                    <ListItemIcon>
                      <NotificationsIcon />
                    </ListItemIcon>
                    <ListItemText primary="Notifications" />
                  </ListItemButton>
                </ListItem>
                <ListItem disablePadding>
                  <ListItemButton sx={{ borderRadius: 30 }}>
                    <ListItemIcon>
                      <EmailIcon />
                    </ListItemIcon>
                    <ListItemText primary="Messages" />
                  </ListItemButton>
                </ListItem>
              </List> */}
              <Box sx={{ mt: 2, mb: 2 }}>
                <Button
                  variant="contained"
                  fullWidth
                  sx={{
                    borderRadius: "20px",
                    py: 1.2,
                    textTransform: "none",
                    fontWeight: "bold",
                    fontSize: "1rem",
                  }}
                  onClick={() => navigate("/create-post")}
                >
                  Post
                </Button>
              </Box>
            </Paper>
          )}
          {!currentUser && !currentUserLoading && (
            <Paper elevation={1} sx={{ p: 2, mb: 3, borderRadius: 2, position: "sticky", top: 80 }}>
              <Typography>Login to see your profile details.</Typography>
              <Button variant="contained" onClick={() => navigate("/login")} sx={{ mt: 1 }}>
                Login
              </Button>
            </Paper>
          )}
        </Grid>

        {/* Middle Column - Posts */}
        <Grid item xs={12} md={6}>
          <Paper elevation={1} sx={{overflow: "hidden", mb: 3 }}>
            <Box sx={{ p: 2, mt: 2, borderBottom: "1px solid #eee", fontWeight: "bold", bgcolor: "white" }}>
              <Typography variant="h6">Home</Typography>
            </Box>

            {visiblePosts.length === 0 && !loadingPosts ? (
              <Box sx={{ p: 4, textAlign: "center", bgcolor: "white" }}>
                <Typography>No posts yet. Be the first to post!</Typography>
              </Box>
            ) : (
              <Box sx={{ bgcolor: "white" }}>
                {visiblePosts.map((post) => {
                  // Determine follow status for this author from the map
                  const isFollowingAuthor = post.author?.id ? (followingStatus.get(post.author.id) ?? false) : false
                  const postDate = new Date(post.created_at)
                  const timeAgo = getTimeAgo(postDate)

                  return (
                    <Box
                      key={post.post_id}
                      sx={{
                        p: 3,
                        width: 1000,
                        borderBottom: "1px solid #eee",
                        "&:hover": { bgcolor: "rgba(0, 0, 0, 0.01)" },
                      }}
                    >
                      <Box sx={{ display: "flex" }}>
                        <Avatar
                          sx={{
                            width: 48,
                            height: 48,
                            mr: 2,
                          }}
                        >
                          {post.author?.first_name?.[0]?.toUpperCase() ?? "?"}
                        </Avatar>

                        <Box sx={{ width: "100%" }}>
                          <Box sx={{ display: "flex", alignItems: "center", mb: 0.5, justifyContent: "space-between" }}>
                            <Box sx={{ display: "flex", alignItems: "center" }}>
                              <Typography fontWeight="bold" sx={{ mr: 1 }}>
                                {post.author?.first_name ?? "Unknown"} {post.author?.last_name ?? "User"}
                              </Typography>
                              {/* <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
                                @{post.author?.first_name?.toLowerCase() ?? "unknown"}
                                {post.author?.last_name?.toLowerCase() ?? "user"}
                              </Typography> */}
                              <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
                                · {timeAgo}
                              </Typography>
                            </Box>
                            <Box sx={{ display: "flex", alignItems: "center" }}>
                              {currentUser && post.author?.id && currentUser.id !== post.author.id && (
                                <FollowButton
                                  userIdToFollow={post.author.id}
                                  initialIsFollowing={isFollowingAuthor}
                                  currentUserId={currentUser.id}
                                  onUpdate={handleFollowUpdate}
                                />
                              )}
                              <IconButton size="small" onClick={(e) => handleMenuOpen(e, post.post_id)} sx={{ ml: 1 }}>
                                <MoreHorizIcon fontSize="small" />
                              </IconButton>
                            </Box>
                          </Box>

                          {post.title && (
                            <Typography variant="subtitle1" fontWeight="medium" sx={{ mb: 1 }}>
                              {post.title}
                            </Typography>
                          )}

                          <Typography variant="body1" sx={{ mb: 2, whiteSpace: "pre-wrap" }}>
                            {post.content}
                          </Typography>

                          <Box sx={{ display: "flex", justifyContent: "space-between", maxWidth: 800 }}>
                          <Box sx={{ display: "flex", alignItems: "center" }}>
                              <IconButton size="small" sx={{ mr: 0.5 }}>
                                <FavoriteBorderIcon fontSize="small" />
                              </IconButton>
                              <Typography variant="body2" color="text.secondary">
                                28
                              </Typography>
                            </Box>
                            <Box sx={{ display: "flex", alignItems: "center" }}>
                              <IconButton size="small" sx={{ mr: 0.5 }}>
                                <ChatBubbleOutlineIcon fontSize="small" />
                              </IconButton>
                              <Typography variant="body2" color="text.secondary">
                                5
                              </Typography>
                            </Box>
                            <Box sx={{ display: "flex", alignItems: "center" }}>
                              <Typography variant="body2" color="text.secondary">
                                2.4K views
                              </Typography>
                            </Box>
                          </Box>
                        </Box>
                      </Box>
                    </Box>
                  )
                })}
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Post Menu */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          elevation: 3,
          sx: { width: 200, borderRadius: 2 },
        }}
      >
        <MenuItem onClick={() => activePostId !== null && hidePost(activePostId)}>
          <ListItemIcon>
            <CloseIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Hide this post</ListItemText>
        </MenuItem>
      </Menu>

      {/* Notification */}
      <Snackbar
        open={notification !== null}
        autoHideDuration={5000}
        onClose={handleNotificationClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity="info"
          icon={<CloseIcon fontSize="inherit" />}
          action={
            <Button
              color="inherit"
              size="small"
              onClick={() => notification && undoHidePost(notification.id)}
              sx={{ borderRadius: 5 }}
            >
              Undo
            </Button>
          }
          sx={{
            width: "100%",
            bgcolor: "black",
            color: "white",
            "& .MuiAlert-action": {
              p: 0,
              alignItems: "center",
            },
          }}
        >
          <Box>
            <Typography variant="body1" fontWeight="medium">
              Post Hidden
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.8 }}>
              Hiding posts helps us personalize your Feed.
            </Typography>
          </Box>
        </Alert>
      </Snackbar>
    </Container>
  )
}