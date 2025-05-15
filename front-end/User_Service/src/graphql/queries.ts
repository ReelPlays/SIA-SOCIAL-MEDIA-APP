// src/graphql/queries.ts
import { gql } from '@apollo/client';

// Keep existing queries
export const GET_MY_NOTIFICATIONS = gql`
  query GetMyNotifications($limit: Int, $offset: Int, $filter: String) {
    getMyNotifications(limit: $limit, offset: $offset, filter: $filter) {
      notificationId
      notificationType
      entityId
      isRead
      createdAt
      triggeringUser {
        accountId
        firstName
        lastName
      }
    }
  }
`;

export const LIST_POSTS = gql`
  query ListPosts {
    listPosts {
      postId
      title
      content
      createdAt
      commentsCount
      likesCount  
      isLiked     
      author {
        accountId
        firstName
        lastName
        isFollowing
      }
    }
  }
`;

export const GET_FEED = gql`
  query GetFeed($limit: Int, $offset: Int) {
    getFeed(limit: $limit, offset: $offset) {
      postId
      title
      content
      createdAt  
      commentsCount
      likesCount  
      isLiked    
      author {
        accountId
        firstName
        lastName
        isFollowing
      }
    }
  }
`;

// Add new query for getting a single post with details
export const GET_POST = gql`
  query GetPost($postId: ID!) {
    getPost(postId: $postId) {
      postId
      title
      content
      createdAt
      updatedAt
      commentsCount
      author {
        accountId
        firstName
        lastName
        isFollowing
      }
    }
  }
`;

// Add new query for fetching comments on a post
export const GET_POST_COMMENTS = gql`
  query GetPostComments($postId: ID!, $limit: Int, $offset: Int) {
    getPostComments(postId: $postId, limit: $limit, offset: $offset) {
      commentId
      content
      createdAt
      updatedAt
      author {
        accountId
        firstName
        lastName
      }
    }
  }
`;