// src/ProfileContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from './lib/supabase';
import { PROFILE_PICTURE_UPDATED_EVENT, ProfilePictureUpdatedEvent } from './components/ProfilePictureUpload';

// Define the shape of the profile context
interface ProfileContextType {
  userProfiles: Record<string, UserProfile>;
  refreshUserProfile: (userId: string) => Promise<void>;
  isLoadingProfile: boolean;
}

// Define the UserProfile interface
export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  profilePictureUrl?: string;
  email?: string;
}

// Create the context with a default value
const ProfileContext = createContext<ProfileContextType>({
  userProfiles: {},
  refreshUserProfile: async () => {},
  isLoadingProfile: false
});

// Custom hook to use the profile context
export const useProfile = () => useContext(ProfileContext);

interface ProfileProviderProps {
  children: ReactNode;
}

export const ProfileProvider: React.FC<ProfileProviderProps> = ({ children }) => {
  const [userProfiles, setUserProfiles] = useState<Record<string, UserProfile>>({});
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);

  // Function to fetch a user's profile by ID
  const fetchUserProfile = async (userId: string): Promise<UserProfile | null> => {
    try {
      const { data, error } = await supabase
        .from('accounts')
        .select('id, first_name, last_name, email, profile_picture_url')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        return null;
      }

      return {
        id: data.id,
        firstName: data.first_name,
        lastName: data.last_name,
        email: data.email,
        profilePictureUrl: data.profile_picture_url
      };
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
      return null;
    }
  };

  // Function to refresh a user profile
  const refreshUserProfile = async (userId: string) => {
    setIsLoadingProfile(true);
    try {
      const profile = await fetchUserProfile(userId);
      if (profile) {
        setUserProfiles(prev => ({
          ...prev,
          [userId]: profile
        }));
      }
    } catch (error) {
      console.error('Error refreshing user profile:', error);
    } finally {
      setIsLoadingProfile(false);
    }
  };

  // Listen for profile picture update events
  useEffect(() => {
    // Handler for the custom event
    const handleProfilePictureUpdate = (event: CustomEvent<ProfilePictureUpdatedEvent>) => {
      const { userId, pictureUrl } = event.detail;
      console.log(`ProfileContext: Received profile picture update for ${userId}:`, pictureUrl);
      
      setUserProfiles(prev => {
        const existingProfile = prev[userId];
        if (existingProfile) {
          return {
            ...prev,
            [userId]: {
              ...existingProfile,
              profilePictureUrl: pictureUrl
            }
          };
        }
        return prev;
      });
      
      // Also refresh the profile to ensure we have the latest data
      refreshUserProfile(userId);
    };

    // Add event listener
    window.addEventListener(
      PROFILE_PICTURE_UPDATED_EVENT, 
      handleProfilePictureUpdate as EventListener
    );

    // Check localStorage for updates that happened in other tabs
    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === PROFILE_PICTURE_UPDATED_EVENT && e.newValue) {
        try {
          const data: ProfilePictureUpdatedEvent = JSON.parse(e.newValue);
          console.log(`ProfileContext: Detected profile picture update from storage for ${data.userId}`);
          
          setUserProfiles(prev => {
            const existingProfile = prev[data.userId];
            if (existingProfile) {
              return {
                ...prev,
                [data.userId]: {
                  ...existingProfile,
                  profilePictureUrl: data.pictureUrl
                }
              };
            }
            return prev;
          });
          
          // Also refresh the profile
          refreshUserProfile(data.userId);
        } catch (error) {
          console.error('Error processing profile update from storage:', error);
        }
      }
    };

    // Add storage event listener for cross-tab communication
    window.addEventListener('storage', handleStorageEvent);

    // Setup realtime subscription for profile updates
    const profileChangesChannel = supabase
      .channel('profile-changes')
      .on('postgres_changes', 
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'accounts',
          // We're listening to all account updates since we care about multiple users
        },
        (payload) => {
          if (payload.new && payload.old && 
              payload.new.profile_picture_url !== payload.old.profile_picture_url) {
            
            const userId = payload.new.id;
            const profilePictureUrl = payload.new.profile_picture_url;
            
            console.log(`ProfileContext: Detected profile picture update from Supabase for ${userId}`);
            
            // Update our local state
            setUserProfiles(prev => {
              const existingProfile = prev[userId];
              if (existingProfile) {
                return {
                  ...prev,
                  [userId]: {
                    ...existingProfile,
                    profilePictureUrl
                  }
                };
              }
              return prev;
            });
          }
        }
      )
      .subscribe();

    // Clean up function
    return () => {
      window.removeEventListener(
        PROFILE_PICTURE_UPDATED_EVENT, 
        handleProfilePictureUpdate as EventListener
      );
      window.removeEventListener('storage', handleStorageEvent);
      supabase.removeChannel(profileChangesChannel);
    };
  }, []);

  const contextValue: ProfileContextType = {
    userProfiles,
    refreshUserProfile,
    isLoadingProfile
  };

  return (
    <ProfileContext.Provider value={contextValue}>
      {children}
    </ProfileContext.Provider>
  );
};