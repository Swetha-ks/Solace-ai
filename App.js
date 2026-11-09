import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import WelcomeScreen from './src/screens/WelcomeScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import AuthScreen from './src/screens/AuthScreen';
import HomeScreen from './src/screens/HomeScreen';
import ChatScreen from './src/screens/ChatScreen';
import BreathingScreen from './src/screens/BreathingScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import AppIcon from './src/components/AppIcon';
import { authApi, getToken, setToken } from './src/lib/api';
import {
  getInitialNotificationScreen,
  subscribeToNotificationTaps,
} from './src/lib/notifications';

const AUTHED_SCREENS = ['home', 'chat', 'breathing', 'profile'];

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('welcome');
  const [booting, setBooting] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const token = await getToken();
        if (token) {
          try {
            const { user: me } = await authApi.me();
            if (mounted) {
              setUser(me);
              setCurrentScreen('home');
            }
          } catch (e) {
            await setToken(null);
          }
        }
      } catch (e) {
        // Ignore storage errors and fall back to the welcome flow.
      } finally {
        if (mounted) setBooting(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let subscription = null;
    let mounted = true;

    (async () => {
      const screen = await getInitialNotificationScreen();
      if (mounted && screen) setCurrentScreen(screen);

      subscription = subscribeToNotificationTaps((target) => {
        if (mounted) setCurrentScreen(target);
      });
    })();

    return () => {
      mounted = false;
      if (subscription?.remove) subscription.remove();
    };
  }, []);

  const handleAuthenticated = (authenticatedUser) => {
    setUser(authenticatedUser);
    setCurrentScreen('home');
  };

  const handleSignOut = async () => {
    await setToken(null);
    setUser(null);
    setCurrentScreen('welcome');
  };

  if (booting) {
    return (
      <LinearGradient
        colors={['#FDF9F3', '#F7EFE8', '#F1E8F5']}
        style={styles.splash}
      >
        <StatusBar style="dark" />
        <View style={styles.splashLight}>
          <View style={styles.splashHalo} />
          <LinearGradient
            colors={['#F5D5BE', '#D9C3EC']}
            start={{ x: 0.2, y: 0 }}
            end={{ x: 0.85, y: 1 }}
            style={styles.splashCore}
          >
            <AppIcon name="feather" size={24} color="#FFFBF6" strokeWidth={1.1} />
          </LinearGradient>
        </View>
        <Text style={styles.splashWordmark}>SOLACE</Text>
        <Text style={styles.splashSub}>a quiet place</Text>
        <ActivityIndicator color="#B0664A" style={{ marginTop: 26 }} />
      </LinearGradient>
    );
  }

  return (
    <View style={styles.outerWrapper}>
      <StatusBar style="dark" />

      {/* Centered mobile device frame (keeps the app looking like a phone on web) */}
      <View style={styles.mobileDeviceContainer}>
        {currentScreen === 'welcome' && (
          <WelcomeScreen
            onStartChat={() => setCurrentScreen('onboarding')}
            onGoHome={() => setCurrentScreen('onboarding')}
          />
        )}

        {currentScreen === 'onboarding' && (
          <OnboardingScreen
            onComplete={() => setCurrentScreen('auth')}
            onSkip={() => setCurrentScreen('auth')}
          />
        )}

        {currentScreen === 'auth' && (
          <AuthScreen
            onAuthenticated={handleAuthenticated}
            onBack={() => setCurrentScreen('onboarding')}
          />
        )}

        {currentScreen === 'home' && (
          <HomeScreen
            onOpenChat={() => setCurrentScreen('chat')}
            onOpenBreathing={() => setCurrentScreen('breathing')}
          />
        )}

        {currentScreen === 'chat' && (
          <ChatScreen
            onBack={() => setCurrentScreen('home')}
            onOpenBreathing={() => setCurrentScreen('breathing')}
          />
        )}

        {currentScreen === 'breathing' && (
          <BreathingScreen onBack={() => setCurrentScreen('home')} />
        )}

        {currentScreen === 'profile' && (
          <ProfileScreen
            onSignOut={handleSignOut}
            onOpenChat={() => setCurrentScreen('chat')}
            onOpenBreathing={() => setCurrentScreen('breathing')}
            onOpenHome={() => setCurrentScreen('home')}
          />
        )}

        {/* Bottom navigation */}
        {AUTHED_SCREENS.includes(currentScreen) && (
          <SafeAreaView style={styles.bottomNavContainer}>
            <View style={styles.bottomNav}>
              <TouchableOpacity
                style={[styles.navItem, currentScreen === 'home' && styles.navItemActive]}
                onPress={() => setCurrentScreen('home')}
              >
                <AppIcon
                  name="home"
                  size={20}
                  color={currentScreen === 'home' ? '#B0664A' : 'rgba(42, 32, 51, 0.35)'}
                  strokeWidth={1.7}
                />
                <Text
                  style={[
                    styles.navLabel,
                    currentScreen === 'home' && styles.navLabelActive,
                  ]}
                >
                  Haven
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.navItem, currentScreen === 'chat' && styles.navItemActive]}
                onPress={() => setCurrentScreen('chat')}
              >
                <AppIcon
                  name="chat"
                  size={20}
                  color={currentScreen === 'chat' ? '#B0664A' : 'rgba(42, 32, 51, 0.35)'}
                  strokeWidth={1.7}
                />
                <Text
                  style={[
                    styles.navLabel,
                    currentScreen === 'chat' && styles.navLabelActive,
                  ]}
                >
                  Solace AI
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.navItem,
                  currentScreen === 'breathing' && styles.navItemActive,
                ]}
                onPress={() => setCurrentScreen('breathing')}
              >
                <AppIcon
                  name="wind"
                  size={20}
                  color={currentScreen === 'breathing' ? '#B0664A' : 'rgba(42, 32, 51, 0.35)'}
                  strokeWidth={1.7}
                />
                <Text
                  style={[
                    styles.navLabel,
                    currentScreen === 'breathing' && styles.navLabelActive,
                  ]}
                >
                  Breathe
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.navItem, currentScreen === 'profile' && styles.navItemActive]}
                onPress={() => setCurrentScreen('profile')}
              >
                <AppIcon
                  name="user"
                  size={20}
                  color={currentScreen === 'profile' ? '#B0664A' : 'rgba(42, 32, 51, 0.35)'}
                  strokeWidth={1.7}
                />
                <Text
                  style={[
                    styles.navLabel,
                    currentScreen === 'profile' && styles.navLabelActive,
                  ]}
                >
                  You
                </Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashLight: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 26,
  },
  splashHalo: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(233, 185, 160, 0.22)',
  },
  splashCore: {
    width: 74,
    height: 74,
    borderRadius: 37,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashWordmark: {
    fontSize: 13,
    letterSpacing: 6,
    fontWeight: '700',
    color: '#2A2033',
    marginLeft: 6,
  },
  splashSub: {
    fontSize: 11,
    color: '#B0664A',
    fontStyle: 'italic',
    letterSpacing: 0.6,
    marginTop: 8,
  },
  outerWrapper: {
    flex: 1,
    backgroundColor: '#F4EDE6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileDeviceContainer: {
    width: '100%',
    maxWidth: 440,
    height: '100%',
    backgroundColor: '#FDF9F3',
    shadowColor: '#B0664A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
  bottomNavContainer: {
    backgroundColor: 'rgba(253, 249, 243, 0.96)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(42, 32, 51, 0.06)',
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    paddingHorizontal: 10,
    backgroundColor: 'transparent',
  },
  navItem: {
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 16,
    minWidth: 66,
  },
  navItemActive: {
    backgroundColor: 'rgba(176, 102, 74, 0.10)',
  },
  navLabel: {
    fontSize: 10.5,
    fontWeight: '600',
    color: 'rgba(42, 32, 51, 0.42)',
    marginTop: 3,
  },
  navLabelActive: {
    color: '#B0664A',
    fontWeight: '700',
  },
});
