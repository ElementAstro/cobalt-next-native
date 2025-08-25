import * as React from 'react';
import { View, ScrollView } from 'react-native';
import Animated, { 
  FadeInUp, 
  FadeOutDown, 
  LayoutAnimationConfig,
  FadeIn,
  SlideInRight,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { Info } from '~/lib/icons/Info';
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar';
import { Button } from '~/components/ui/button';
import { EnhancedButton } from '~/components/ui/enhanced-button';
import { Input } from '~/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '~/components/ui/card';
import { Progress } from '~/components/ui/progress';
import { Text } from '~/components/ui/text';
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip';
import { PerformanceMonitor } from '~/components/ui/performance-monitor';
import { useAppPerformance, useDebouncedValue } from '~/lib/useAppPerformance';
import { Sun } from '~/lib/icons/Sun';
import { MoonStar } from '~/lib/icons/MoonStar';
import { useRouter } from 'expo-router';

const GITHUB_AVATAR_URI =
  'https://i.pinimg.com/originals/ef/a2/8d/efa28d18a04e7fa40ed49eeb0ab660db.jpg';

export default function Screen() {
  const [progressValue, setProgressValue] = React.useState(78);
  const [inputValue, setInputValue] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const router = useRouter();

  // Use performance monitoring
  const { isAppActive, networkState, deviceInfo } = useAppPerformance();
  
  // Debounced input for better performance
  const debouncedInputValue = useDebouncedValue(inputValue, 300);

  // Animation values
  const shimmerOpacity = useSharedValue(0.3);

  React.useEffect(() => {
    // Continuous shimmer animation for modern look
    shimmerOpacity.value = withRepeat(
      withTiming(1, { duration: 1500 }),
      -1,
      true
    );
  }, [shimmerOpacity]);

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: shimmerOpacity.value,
  }));

  function updateProgressValue() {
    setProgressValue(Math.floor(Math.random() * 100));
  }

  const handleEnhancedButtonPress = async () => {
    setIsLoading(true);
    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsLoading(false);
  };

  const performanceMetrics = React.useMemo(() => ({
    platform: deviceInfo.platform,
    isTablet: deviceInfo.isTablet,
    networkConnected: networkState.isConnected,
    appActive: isAppActive,
  }), [deviceInfo, networkState, isAppActive]);

  return (
    <ScrollView 
      className='flex-1 bg-background'
      showsVerticalScrollIndicator={false}
      contentInsetAdjustmentBehavior="automatic"
    >
      <View className='justify-center items-center gap-6 p-6'>
        
        {/* Performance Status Indicator */}
        <PerformanceMonitor
          showDetails={true}
          className='w-full max-w-sm'
        />

        {/* Enhanced Input Demo */}
        <Animated.View 
          entering={SlideInRight.delay(200)}
          className='w-full max-w-sm'
        >
          <Card className='p-6'>
            <CardHeader>
              <CardTitle>Input Component</CardTitle>
              <CardDescription>
                Modern input with validation and animations
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <Input
                label="Email Address"
                placeholder="Enter your email"
                value={inputValue}
                onChangeText={setInputValue}
                leftIcon={<Sun size={16} className="text-gray-400" />}
                variant="outline"
                size="md"
                isRequired
                hint="We'll never share your email"
                showCharacterCount
                maxLength={50}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              
              {debouncedInputValue.length > 0 && (
                <Animated.View entering={FadeInUp}>
                  <Text className='text-sm text-muted-foreground'>
                    Debounced value: {debouncedInputValue}
                  </Text>
                </Animated.View>
              )}
            </CardContent>
          </Card>
        </Animated.View>

        {/* User Profile Card with Shimmer Effect */}
        <Animated.View entering={FadeInUp.delay(300)}>
          <Card className='w-full max-w-sm p-6 rounded-2xl'>
            <CardHeader className='items-center'>
              <View className='relative'>
                <Avatar alt="Rick Sanchez's Avatar" className='w-24 h-24'>
                  <AvatarImage source={{ uri: GITHUB_AVATAR_URI }} />
                  <AvatarFallback>
                    <Text>RS</Text>
                  </AvatarFallback>
                </Avatar>
                
                {/* Online Status Indicator */}
                <Animated.View 
                  style={shimmerStyle}
                  className='absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-white'
                />
              </View>
              
              <View className='p-3' />
              <CardTitle className='pb-2 text-center'>Rick Sanchez</CardTitle>
              <View className='flex-row items-center'>
                <CardDescription className='text-base font-semibold'>Scientist</CardDescription>
                <Tooltip delayDuration={150}>
                  <TooltipTrigger className='px-2 pb-0.5 active:opacity-50'>
                    <Info size={14} strokeWidth={2.5} className='w-4 h-4 text-foreground/70' />
                  </TooltipTrigger>
                  <TooltipContent className='py-2 px-4 shadow'>
                    <Text className='native:text-lg'>Freelance Scientist</Text>
                  </TooltipContent>
                </Tooltip>
              </View>
            </CardHeader>
            
            <CardContent className='items-center pb-6'>
              <View className='flex-row gap-2'>
                <View className='bg-secondary/50 rounded-lg px-3 py-1'>
                  <Text className='text-xs font-medium'>Physics</Text>
                </View>
                <View className='bg-secondary/50 rounded-lg px-3 py-1'>
                  <Text className='text-xs font-medium'>Chemistry</Text>
                </View>
                <View className='bg-secondary/50 rounded-lg px-3 py-1'>
                  <Text className='text-xs font-medium'>Biology</Text>
                </View>
              </View>
              
              <View className='w-full pt-6'>
                <View className='flex-row justify-between items-center pb-2'>
                  <Text className='text-sm text-muted-foreground'>Expertise Level</Text>
                  <Text className='text-sm font-medium'>{progressValue}%</Text>
                </View>
                <Progress value={progressValue} className='web:w-full' />
              </View>

              {/* Additional Stats Section */}
              <View className='w-full pt-6'>
                <View className='flex-row justify-around gap-3'>
                  <View className='items-center'>
                    <Text className='text-sm text-muted-foreground'>Dimension</Text>
                    <Text className='text-xl font-semibold'>C-137</Text>
                  </View>
                  <View className='items-center'>
                    <Text className='text-sm text-muted-foreground'>Age</Text>
                    <Text className='text-xl font-semibold'>70</Text>
                  </View>
                  <View className='items-center'>
                    <Text className='text-sm text-muted-foreground'>Species</Text>
                    <Text className='text-xl font-semibold'>Human</Text>
                  </View>
                </View>
              </View>

              {/* Productivity Section */}
              <View className='w-full pt-6'>
                <View className='flex-row items-center overflow-hidden mb-2'>
                  <Text className='text-sm text-muted-foreground mr-2'>Productivity:</Text>
                  <LayoutAnimationConfig skipEntering>
                    <Animated.View
                      key={progressValue}
                      entering={FadeInUp}
                      exiting={FadeOutDown}
                      className='w-11 items-center'
                    >
                      <Text className='text-sm font-bold text-sky-600'>{progressValue}%</Text>
                    </Animated.View>
                  </LayoutAnimationConfig>
                </View>
                <Progress value={progressValue} className='h-2' indicatorClassName='bg-sky-600' />
              </View>
            </CardContent>
            
            <CardFooter className='flex-col gap-3 pt-0'>
              <EnhancedButton
                variant="primary"
                size="lg"
                onPress={handleEnhancedButtonPress}
                isLoading={isLoading}
                loadingText="Processing..."
                leftIcon={<MoonStar size={16} />}
                hapticFeedback
                className='w-full'
                accessibilityLabel="Enhanced button with loading state"
              >
                {isLoading ? 'Loading...' : 'Enhanced Action'}
              </EnhancedButton>
              
              <View className='flex-row gap-2 w-full'>
                <Button
                  variant='outline'
                  onPress={updateProgressValue}
                  className='flex-1'
                >
                  <Text>Update Progress</Text>
                </Button>

                <EnhancedButton
                  variant="ghost"
                  size="md"
                  onPress={() => setProgressValue(0)}
                  className='flex-1'
                >
                  Reset
                </EnhancedButton>
              </View>

              <EnhancedButton
                variant="primary"
                size="lg"
                onPress={() => router.push('/dashboard')}
                className='w-full mt-2'
                accessibilityLabel="Open unified dashboard"
              >
                Open Dashboard
              </EnhancedButton>
            </CardFooter>
          </Card>
        </Animated.View>

        {/* Feature Showcase */}
        <Animated.View 
          entering={FadeInUp.delay(400)}
          className='w-full max-w-sm'
        >
          <Card className='p-6'>
            <CardHeader>
              <CardTitle>2025 Features</CardTitle>
              <CardDescription>
                Latest React Native & Expo capabilities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <View className='space-y-3'>
                <FeatureItem 
                  title="New Architecture Ready"
                  description="Fabric, TurboModules, JSI support"
                  isEnabled={true}
                />
                <FeatureItem 
                  title="Enhanced TypeScript"
                  description="Strict mode with utility types"
                  isEnabled={true}
                />
                <FeatureItem 
                  title="Performance Monitoring"
                  description="Real-time app metrics"
                  isEnabled={isAppActive}
                />
                <FeatureItem 
                  title="Modern Animations"
                  description="Reanimated 3 with native threads"
                  isEnabled={true}
                />
              </View>
            </CardContent>
          </Card>
        </Animated.View>
      </View>
    </ScrollView>
  );
}

// Feature showcase component
function FeatureItem({ 
  title, 
  description, 
  isEnabled 
}: { 
  title: string; 
  description: string; 
  isEnabled: boolean;
}) {
  return (
    <View className='flex-row items-center justify-between p-3 bg-muted/20 rounded-lg'>
      <View className='flex-1'>
        <Text className='font-medium text-sm'>{title}</Text>
        <Text className='text-xs text-muted-foreground'>{description}</Text>
      </View>
      <View className={`w-3 h-3 rounded-full ${
        isEnabled ? 'bg-green-500' : 'bg-gray-300'
      }`} />
    </View>
  );
}
