// src/graphql/mutations.ts
import { gql } from '@apollo/client';

export const CREATE_COMMENT = gql`
  mutation CreateComment($input: CreateCommentInput!) {
    createComment(input: $input) {
      commentId
      postId
      content
      createdAt
      author {
        accountId
        firstName
        lastName
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

export const DELETE_POST = gql`
  mutation DeletePost($postId: ID!) {
    deletePost(postId: $postId)
  }
`;

export const FOLLOW_USER = gql`
  mutation FollowUser($userIdToFollow: ID!) {
    followUser(userIdToFollow: $userIdToFollow) {
      accountId
    }
  }
`;

export const UNFOLLOW_USER = gql`
  mutation UnfollowUser($userIdToUnfollow: ID!) {
    unfollowUser(userIdToUnfollow: $userIdToUnfollow) {
      accountId
    }
  }
`;

export const UPDATE_PROFILE = gql`
  mutation UpdateProfile(
    $username: String
    $firstName: String
    $lastName: String
    $middleName: String
    $bio: String
    $profilePictureURL: String
    $dateOfBirth: String
    $address: String
    $phone: String
    $gender: String  
  ) {
    updateProfile(
      username: $username
      firstName: $firstName
      lastName: $lastName
      middleName: $middleName
      bio: $bio
      profilePictureURL: $profilePictureURL
      dateOfBirth: $dateOfBirth
      address: $address
      phone: $phone
      gender: $gender 
    ) {
      accountId
      username
      firstName
      lastName
      middleName
      bio
      profilePictureURL
      dateOfBirth
      address
      phone
      gender 
    }
  }
`;