import React, { useMemo } from 'react';
import { Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../features/home/HomeScreen';
import CoursesScreen from '../features/courses/CoursesScreen';
import CourseDetailsScreen from '../features/courses/CourseDetailsScreen';
import GroupsScreen from '../features/groups/GroupsScreen';
import GroupDetailsScreen from '../features/groups/GroupDetailsScreen';
import CreateGroupScreen from '../features/groups/CreateGroupScreen';
import GroupChatScreen from '../features/groups/GroupChatScreen';
import MessagesScreen from '../features/messages/MessagesScreen';
import SessionsScreen from '../features/sessions/SessionsScreen';
import SessionDetailsScreen from '../features/sessions/SessionDetailsScreen';
import SessionRoomScreen from '../features/sessions/SessionRoomScreen';
import SessionRequestsScreen from '../features/sessions/SessionRequestsScreen';
import ExpertsScreen from '../features/experts/ExpertsScreen';
import ExpertDetailsScreen from '../features/experts/ExpertDetailsScreen';
import SubmitReviewScreen from '../features/experts/SubmitReviewScreen';
import CreateSessionScreen from '../features/experts/CreateSessionScreen';
import AnswerQuestionScreen from '../features/experts/AnswerQuestionScreen';
import ExpertProfileEditScreen from '../features/profile/ExpertProfileEditScreen';
import ProfileScreen from '../features/profile/ProfileScreen';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme, Palette } from '../theme/ThemeProvider';
import AskQuestionScreen from '../features/questions/AskQuestionScreen';
import PublicQuestionsScreen from '../features/questions/PublicQuestionsScreen';
import MyQuestionsScreen from '../features/questions/MyQuestionsScreen';
import QuestionDetailsScreen from '../features/questions/QuestionDetailsScreen';
import {
  CoursesStackParamList,
  ExpertsStackParamList,
  GroupsStackParamList,
  MainTabParamList,
  ProfileStackParamList,
  SessionsStackParamList,
} from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();
const CoursesStack = createNativeStackNavigator<CoursesStackParamList>();
const GroupsStack = createNativeStackNavigator<GroupsStackParamList>();
const SessionsStack = createNativeStackNavigator<SessionsStackParamList>();
const ExpertsStack = createNativeStackNavigator<ExpertsStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();

const useStackScreenOptions = () => {
  const { colors } = useAppTheme();

  return useMemo(
    () => ({
      headerStyle: {
        backgroundColor: colors.surface,
      },
      headerTintColor: colors.textPrimary,
      headerTitleStyle: {
        color: colors.textPrimary,
        fontWeight: '600' as const,
      },
      contentStyle: {
        backgroundColor: colors.background,
      },
      headerShadowVisible: false,
    }),
    [colors]
  );
};

const CoursesNavigator = () => {
  const stackOptions = useStackScreenOptions();

  return (
    <CoursesStack.Navigator screenOptions={stackOptions}>
      <CoursesStack.Screen name="CoursesHome" component={CoursesScreen} options={{ title: 'Courses' }} />
      <CoursesStack.Screen name="CourseDetails" component={CourseDetailsScreen} options={{ title: 'Course Details' }} />
    </CoursesStack.Navigator>
  );
};

const GroupsNavigator = () => {
  const stackOptions = useStackScreenOptions();

  return (
    <GroupsStack.Navigator screenOptions={stackOptions}>
      <GroupsStack.Screen name="GroupsHome" component={GroupsScreen} options={{ title: 'Groups' }} />
      <GroupsStack.Screen name="GroupDetails" component={GroupDetailsScreen} options={{ title: 'Group Details' }} />
      <GroupsStack.Screen name="CreateGroup" component={CreateGroupScreen} options={{ title: 'Create Group' }} />
      <GroupsStack.Screen
        name="GroupChat"
        component={GroupChatScreen}
        options={({ route }) => ({ title: route.params?.groupName ?? 'Group Chat' })}
      />
    </GroupsStack.Navigator>
  );
};

const SessionsNavigator = () => {
  const stackOptions = useStackScreenOptions();

  return (
    <SessionsStack.Navigator screenOptions={stackOptions}>
      <SessionsStack.Screen name="SessionsHome" component={SessionsScreen} options={{ title: 'Sessions' }} />
      <SessionsStack.Screen name="SessionDetails" component={SessionDetailsScreen} options={{ title: 'Session Details' }} />
      <SessionsStack.Screen
        name="SessionRoom"
        component={SessionRoomScreen}
        options={{
          headerShown: false,
          presentation: 'fullScreenModal',
        }}
      />
      <SessionsStack.Screen name="SessionRequests" component={SessionRequestsScreen} options={{ title: 'Session Requests' }} />
    </SessionsStack.Navigator>
  );
};

const ExpertsNavigator = () => {
  const stackOptions = useStackScreenOptions();

  return (
    <ExpertsStack.Navigator screenOptions={stackOptions}>
      <ExpertsStack.Screen name="ExpertsHome" component={ExpertsScreen} options={{ title: 'Experts' }} />
      <ExpertsStack.Screen
        name="ExpertDetails"
        component={ExpertDetailsScreen}
        options={({ route }) => ({ title: route.params?.name ?? 'Expert Profile' })}
      />
      <ExpertsStack.Screen
        name="AskQuestion"
        component={AskQuestionScreen}
        options={{ title: 'Ask a Question' }}
      />
      <ExpertsStack.Screen
        name="SubmitExpertReview"
        component={SubmitReviewScreen}
        options={{ title: 'Review Expert' }}
      />
      <ExpertsStack.Screen
        name="PublicQuestions"
        component={PublicQuestionsScreen}
        options={{ title: 'Community Q&A' }}
      />
      <ExpertsStack.Screen
        name="MyQuestions"
        component={MyQuestionsScreen}
        options={{ title: 'My Questions' }}
      />
      <ExpertsStack.Screen
        name="QuestionDetails"
        component={QuestionDetailsScreen}
        options={({ route }) => ({ title: route.params?.title ?? 'Question' })}
      />
      <ExpertsStack.Screen
        name="ExpertCreateSession"
        component={CreateSessionScreen}
        options={{ title: 'New Session' }}
      />
      <ExpertsStack.Screen
        name="ExpertAnswerQuestion"
        component={AnswerQuestionScreen}
        options={({ route }) => ({ title: route.params?.questionTitle ?? 'Answer Question' })}
      />
    </ExpertsStack.Navigator>
  );
};

const TAB_ICONS: Record<keyof MainTabParamList, { active: keyof typeof Ionicons.glyphMap; inactive: keyof typeof Ionicons.glyphMap }> = {
  Home: { active: 'home', inactive: 'home-outline' },
  Courses: { active: 'library', inactive: 'library-outline' },
  Groups: { active: 'people', inactive: 'people-outline' },
  Messages: { active: 'chatbubble-ellipses', inactive: 'chatbubble-ellipses-outline' },
  Sessions: { active: 'videocam', inactive: 'videocam-outline' },
  Experts: { active: 'school', inactive: 'school-outline' },
  Profile: { active: 'person-circle', inactive: 'person-circle-outline' },
};

const ProfileNavigator = () => {
  const stackOptions = useStackScreenOptions();

  return (
    <ProfileStack.Navigator screenOptions={stackOptions}>
      <ProfileStack.Screen name="ProfileHome" component={ProfileScreen} options={{ title: 'Profile' }} />
      <ProfileStack.Screen name="ExpertProfileEdit" component={ExpertProfileEditScreen} options={{ title: 'Expert Profile' }} />
    </ProfileStack.Navigator>
  );
};

const MainTabs: React.FC = () => {
  const { colors } = useAppTheme();
  const tabStyles = useMemo(() => createTabStyles(colors), [colors]);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => {
        const icon = TAB_ICONS[route.name as keyof MainTabParamList];

        return {
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarStyle: tabStyles.tabBar,
          tabBarLabelStyle: tabStyles.tabLabel,
          tabBarItemStyle: tabStyles.tabItem,
          tabBarIconStyle: tabStyles.tabIcon,
          tabBarHideOnKeyboard: true,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? icon.active : icon.inactive} size={24} color={color} />
          ),
        };
      }}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen} 
        options={{ 
          tabBarLabel: 'Home', 
          title: 'Dashboard',
        }} 
      />
      <Tab.Screen 
        name="Courses" 
        component={CoursesNavigator} 
        options={{ 
          headerShown: false, 
          tabBarLabel: 'Courses',
        }} 
      />
      <Tab.Screen 
        name="Groups" 
        component={GroupsNavigator} 
        options={{ 
          headerShown: false, 
          tabBarLabel: 'Study',
        }} 
      />
      <Tab.Screen 
        name="Sessions" 
        component={SessionsNavigator} 
        options={{ 
          headerShown: false, 
          tabBarLabel: 'Live',
        }} 
      />
      <Tab.Screen 
        name="Messages" 
        component={MessagesScreen} 
        options={{ 
          tabBarLabel: 'Chat', 
          title: 'Messages',
        }} 
      />
      <Tab.Screen 
        name="Experts" 
        component={ExpertsNavigator} 
        options={{ 
          headerShown: false, 
          tabBarLabel: 'Help',
        }} 
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileNavigator} 
        options={{ 
          headerShown: false, 
          tabBarLabel: 'Profile',
        }} 
      />
    </Tab.Navigator>
  );
};

export default MainTabs;

const createTabStyles = (colors: Palette) =>
  ({
    tabBar: {
      backgroundColor: colors.tabBar,
      borderTopColor: colors.border,
      borderTopWidth: 0.5,
      paddingTop: 8,
      paddingBottom: Platform.OS === 'ios' ? 24 : 8,
      height: Platform.OS === 'ios' ? 88 : 64,
      elevation: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
    },
    tabLabel: {
      fontSize: 11,
      fontWeight: '600' as const,
      marginTop: 2,
    },
    tabItem: {
      paddingVertical: 0,
    },
    tabIcon: {
      marginBottom: 0,
    },
  } satisfies Record<'tabBar' | 'tabLabel' | 'tabItem' | 'tabIcon', any>);
