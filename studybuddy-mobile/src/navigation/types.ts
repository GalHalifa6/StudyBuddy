import { NavigatorScreenParams } from '@react-navigation/native';

export type RootStackParamList = {
  MainTabs: NavigatorScreenParams<MainTabParamList> | undefined;
  Onboarding: undefined;
  AuthStack: undefined;
  Notifications: undefined;
  UpcomingEvents: undefined;
  Feed: undefined;
  CreateEventModal: { groupId: number; groupName?: string };
};

export type CoursesStackParamList = {
  CoursesHome: undefined;
  CourseDetails: { courseId: number; title?: string };
};

export type GroupsStackParamList = {
  GroupsHome: undefined;
  GroupDetails: { groupId: number; title?: string };
  CreateGroup: { courseId?: number } | undefined;
  GroupChat: { groupId: number; groupName?: string };
  CreateEvent: { groupId: number; groupName?: string };
};

export type SessionsStackParamList = {
  SessionsHome: undefined;
  SessionDetails: { sessionId: number };
  SessionRoom: { sessionId: number; sessionTitle?: string };
  SessionRequests: undefined;
};

export type ExpertsStackParamList = {
  ExpertsHome: undefined;
  ExpertDetails: { userId: number; name?: string };
  BookingModal: { expertId: number; expertName?: string };
  AskQuestion: { expertId?: number; expertName?: string } | undefined;
  SubmitExpertReview: { expertId: number; expertName?: string };
  PublicQuestions: undefined;
  MyQuestions: undefined;
  QuestionDetails: { questionId: number; title?: string };
  ExpertCreateSession: undefined;
  ExpertAnswerQuestion: { questionId: number; questionTitle?: string };
};

export type ProfileStackParamList = {
  ProfileHome: undefined;
  ExpertProfileEdit: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Courses: NavigatorScreenParams<CoursesStackParamList> | undefined;
  Groups: NavigatorScreenParams<GroupsStackParamList> | undefined;
  Messages: { conversationId?: number } | undefined;
  Sessions: NavigatorScreenParams<SessionsStackParamList> | undefined;
  Experts: NavigatorScreenParams<ExpertsStackParamList> | undefined;
  Profile: NavigatorScreenParams<ProfileStackParamList> | undefined;
};
