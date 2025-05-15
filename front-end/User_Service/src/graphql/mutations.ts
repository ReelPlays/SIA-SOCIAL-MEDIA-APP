// src/graphql/mutations.ts
import { gql } from '@apollo/client';

export const FOLLOW_USER = gql`
  mutation FollowUser($userIdToFollow: ID!) {
    followUser(userIdToFollow: $userIdToFollow) {
      accountId
      isFollowing
    }
  }
`;

export const UNFOLLOW_USER = gql`
  mutation UnfollowUser($userIdToUnfollow: ID!) {
    unfollowUser(userIdToUnfollow: $userIdToUnfollow) {
      accountId
      isFollowing
    }
  }
`;

export const DELETE_POST = gql`
  mutation DeletePost($postId: ID!) {
    deletePost(postId: $postId)
  }
`;

// Add new mutations for comments
export const CREATE_COMMENT = gql`
  mutation CreateComment($input: CreateCommentInput!) {
    createComment(input: $input) {
      commentId
      postId
      authorId
      content
      createdAt
      author {
        firstName
        lastName
        accountId
      }
    }
  }
`;

export const UPDATE_COMMENT = gql`
  mutation UpdateComment($input: UpdateCommentInput!) {
    updateComment(input: $input) {
      commentId
      content
      updatedAt
    }
  }
`;

export const DELETE_COMMENT = gql`
  mutation DeleteComment($commentId: ID!) {
    deleteComment(commentId: $commentId)
  }
`;

// Add mutation for updating posts
export const UPDATE_POST = gql`
  mutation UpdatePost($input: UpdatePostInput!) {
    updatePost(input: $input) {
      postId
      title
      content
      updatedAt
    }
  }
`;