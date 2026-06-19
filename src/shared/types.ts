export type UserType = 'user' | 'artist';

export interface User {
  name: string;
  url: string;
  img: string;
  type: UserType;
}

export interface ScanState {
  phase: 'idle' | 'navigate_following' | 'navigate_followers' | 'done';
  progress: number;
  followingCount: number;
  followersCount: number;
  unfollowersCount: number;
  followingList: User[];
  followersList: User[];
  unfollowersList: User[];
  notFollowingBackList: User[];
  notFollowingBackCount: number;
  userId: string | null;
  userName: string | null;
  userImg: string;
  error: string | null;
}

export interface ProfileMessage {
  type: '__SU_PROFILE__';
  imgUrl: string;
  userId: string;
  displayName: string;
}
