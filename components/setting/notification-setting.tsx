import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useReducer,
  useRef,
} from "react";
import {
  View,
  ScrollView,
  Platform,
  Pressable,
  ActivityIndicator,
  AppState,
  AppStateStatus,
} from "react-native";
import * as TaskManager from "expo-task-manager";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  TimeIntervalTriggerInput,
  NotificationTriggerInput,
  SchedulableTriggerInputTypes,
} from "expo-notifications";

// 通知触发器类型常量
const TRIGGER_TYPE = SchedulableTriggerInputTypes.TIME_INTERVAL;
import DateTimePicker from "@react-native-community/datetimepicker";
import { toast } from "sonner-native";
import { AlertDialog, AlertDialogContent } from "~/components/ui/alert-dialog";
import {
  Calendar,
  Clock,
  Repeat,
  X,
  XCircle,
  Bell,
  Settings2,
  AlertCircle,
  BellRing,
  CheckCircle2,
  Calendar as CalendarIcon,
  ChevronRight,
  Vibrate,
  Trash2,
  BellOff,
  ListFilter,
  CalendarClock,
  CalendarRange,
  BellPlus,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "~/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Label } from "~/components/ui/label";
import { Input } from "~/components/ui/input";
import { Text } from "~/components/ui/text";
import { Badge } from "~/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogHeader,
  DialogFooter,
  DialogDescription,
} from "~/components/ui/dialog";
import { Switch } from "~/components/ui/switch";
import Animated, {
  FadeIn,
  FadeOut,
  SlideInUp,
  Layout,
  BounceIn,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  useSharedValue,
} from "react-native-reanimated";
import { z } from "zod";
import { useErrorBoundary } from "~/hooks/useErrorBoundary";

const NOTIFICATION_STORAGE_KEY = "saved-notifications";

// 验证schema
const NotificationSchema = z.object({
  id: z.string().uuid().optional(),
  message: z
    .string()
    .min(1, "提醒内容不能为空")
    .max(100, "提醒内容不能超过100个字符"),
  date: z
    .instanceof(Date, { message: "请选择有效的日期时间" })
    .refine((date) => date > new Date(), {
      message: "提醒时间必须在当前时间之后",
    }),
  isRepeating: z.boolean(),
  createdAt: z.date().optional(),
  category: z.enum(["general", "important", "reminder"]).default("general"),
});

type NotificationData = z.infer<typeof NotificationSchema>;

// 状态管理 - Reducer
type NotificationsState = {
  notifications: NotificationData[];
  loading: boolean;
  error: string | null;
  selectedCategory: "all" | "general" | "important" | "reminder";
  showDeleted: boolean;
  deletedNotifications: NotificationData[];
};

type NotificationsAction =
  | { type: "LOAD_NOTIFICATIONS"; payload: NotificationData[] }
  | { type: "ADD_NOTIFICATION"; payload: NotificationData }
  | { type: "DELETE_NOTIFICATION"; payload: string }
  | { type: "RECOVER_NOTIFICATION"; payload: string }
  | { type: "CLEAR_DELETED" }
  | { type: "SET_CATEGORY"; payload: NotificationsState["selectedCategory"] }
  | { type: "TOGGLE_DELETED" }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null };

function notificationsReducer(
  state: NotificationsState,
  action: NotificationsAction
): NotificationsState {
  switch (action.type) {
    case "LOAD_NOTIFICATIONS":
      return {
        ...state,
        notifications: action.payload,
        loading: false,
        error: null,
      };
    case "ADD_NOTIFICATION":
      return {
        ...state,
        notifications: [...state.notifications, action.payload],
      };
    case "DELETE_NOTIFICATION": {
      const notification = state.notifications.find(
        (n) => n.id === action.payload
      );
      if (!notification) return state;

      return {
        ...state,
        notifications: state.notifications.filter(
          (n) => n.id !== action.payload
        ),
        deletedNotifications: [...state.deletedNotifications, notification],
      };
    }
    case "RECOVER_NOTIFICATION": {
      const notification = state.deletedNotifications.find(
        (n) => n.id === action.payload
      );
      if (!notification) return state;

      return {
        ...state,
        notifications: [...state.notifications, notification],
        deletedNotifications: state.deletedNotifications.filter(
          (n) => n.id !== action.payload
        ),
      };
    }
    case "CLEAR_DELETED":
      return {
        ...state,
        deletedNotifications: [],
      };
    case "SET_CATEGORY":
      return {
        ...state,
        selectedCategory: action.payload,
      };
    case "TOGGLE_DELETED":
      return {
        ...state,
        showDeleted: !state.showDeleted,
      };
    case "SET_LOADING":
      return {
        ...state,
        loading: action.payload,
      };
    case "SET_ERROR":
      return {
        ...state,
        error: action.payload,
        loading: false,
      };
    default:
      return state;
  }
}

interface TaskData {
  message: string;
}

// 定义任务：触发通知
TaskManager.defineTask(
  "background-reminder-task",
  async (body: TaskManager.TaskManagerTaskBody<TaskData>) => {
    if (body.error) {
      console.error("Task Error:", body.error);
      return;
    }

    if (body.data) {
      const message = body.data.message;
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "定时提醒",
          body: message,
        },
        trigger: {
          type: SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: 1,
        },
      });
    }
  }
);

// 格式化日期
const formatDate = (date: Date): string => {
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// 通知徽章组件
const CategoryBadge = ({ category }: { category: string }) => {
  let bgColor = "bg-primary/20";
  let textColor = "text-primary";
  let icon = <Bell size={12} className="mr-1" />;

  switch (category) {
    case "important":
      bgColor = "bg-red-500/20";
      textColor = "text-red-500";
      icon = <BellRing size={12} className="mr-1 text-red-500" />;
      break;
    case "reminder":
      bgColor = "bg-amber-500/20";
      textColor = "text-amber-500";
      icon = <CalendarClock size={12} className="mr-1 text-amber-500" />;
      break;
  }

  return (
    <Badge className={`px-2 py-1 flex-row items-center ${bgColor}`}>
      {icon}
      <Text className={`text-xs ${textColor}`}>
        {category === "general"
          ? "常规"
          : category === "important"
          ? "重要"
          : "提醒"}
      </Text>
    </Badge>
  );
};

const NotificationItem = ({
  notification,
  onDelete,
  onRecover,
  isDeleted = false,
}: {
  notification: NotificationData;
  onDelete: (id: string) => void;
  onRecover: (id: string) => void;
  isDeleted?: boolean;
}) => {
  const itemScale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: itemScale.value }],
  }));

  const handlePress = async () => {
    itemScale.value = withSequence(withSpring(0.95), withSpring(1));

    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  return (
    <Animated.View
      entering={BounceIn.duration(400)}
      exiting={FadeOut.duration(300)}
      layout={Layout}
      style={animatedStyle}
      className="mb-3"
    >
      <Pressable
        onPress={handlePress}
        className="p-4 native:p-5 rounded-xl bg-primary/5 border border-primary/10"
      >
        <View className="flex-row justify-between items-start">
          <View className="flex-1 mr-2">
            <Text className="text-base native:text-lg font-medium">
              {notification.message}
            </Text>

            <View className="flex-row space-x-2 items-center mt-2">
              <Clock size={14} className="text-muted-foreground" />
              <Text className="text-sm text-muted-foreground">
                {formatDate(notification.date)}
              </Text>
            </View>

            <View className="flex-row items-center space-x-2 mt-2">
              <CategoryBadge category={notification.category} />

              {notification.isRepeating && (
                <Badge className="px-2 py-1 flex-row items-center bg-blue-500/20">
                  <Repeat size={12} className="mr-1 text-blue-500" />
                  <Text className="text-xs text-blue-500">重复</Text>
                </Badge>
              )}
            </View>
          </View>

          {isDeleted ? (
            <Button
              variant="outline"
              size="sm"
              className="rounded-full h-8 w-8 p-0 bg-primary/10"
              onPress={() => onRecover(notification.id!)}
            >
              <BellPlus size={16} className="text-primary" />
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="rounded-full h-8 w-8 p-0 bg-primary/10"
              onPress={() => onDelete(notification.id!)}
            >
              <Trash2 size={16} className="text-primary" />
            </Button>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
};

// 新增 FilterBar 组件
const FilterBar = ({
  selectedCategory,
  onSelectCategory,
  showDeleted,
  onToggleDeleted,
}: {
  selectedCategory: "all" | "general" | "important" | "reminder";
  onSelectCategory: (
    category: "all" | "general" | "important" | "reminder"
  ) => void;
  showDeleted: boolean;
  onToggleDeleted: () => void;
}) => {
  return (
    <Animated.View entering={SlideInUp.delay(200).springify()} className="mb-4">
      <View className="bg-primary/5 p-2 native:p-3 rounded-xl">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 4 }}
          className="flex-row"
        >
          <Pressable
            onPress={() => onSelectCategory("all")}
            className={`px-3 py-1 native:px-4 native:py-2 rounded-md mr-2 flex-row items-center ${
              selectedCategory === "all" ? "bg-primary" : "bg-primary/10"
            }`}
          >
            <ListFilter
              size={14}
              className={`mr-1 ${
                selectedCategory === "all" ? "text-white" : "text-primary"
              }`}
            />
            <Text
              className={`text-sm native:text-base font-medium ${
                selectedCategory === "all" ? "text-white" : "text-primary"
              }`}
            >
              全部
            </Text>
          </Pressable>

          <Pressable
            onPress={() => onSelectCategory("general")}
            className={`px-3 py-1 native:px-4 native:py-2 rounded-md mr-2 flex-row items-center ${
              selectedCategory === "general" ? "bg-primary" : "bg-primary/10"
            }`}
          >
            <Bell
              size={14}
              className={`mr-1 ${
                selectedCategory === "general" ? "text-white" : "text-primary"
              }`}
            />
            <Text
              className={`text-sm native:text-base font-medium ${
                selectedCategory === "general" ? "text-white" : "text-primary"
              }`}
            >
              常规
            </Text>
          </Pressable>

          <Pressable
            onPress={() => onSelectCategory("important")}
            className={`px-3 py-1 native:px-4 native:py-2 rounded-md mr-2 flex-row items-center ${
              selectedCategory === "important" ? "bg-red-500" : "bg-red-500/10"
            }`}
          >
            <BellRing
              size={14}
              className={`mr-1 ${
                selectedCategory === "important" ? "text-white" : "text-red-500"
              }`}
            />
            <Text
              className={`text-sm native:text-base font-medium ${
                selectedCategory === "important" ? "text-white" : "text-red-500"
              }`}
            >
              重要
            </Text>
          </Pressable>

          <Pressable
            onPress={() => onSelectCategory("reminder")}
            className={`px-3 py-1 native:px-4 native:py-2 rounded-md mr-2 flex-row items-center ${
              selectedCategory === "reminder"
                ? "bg-amber-500"
                : "bg-amber-500/10"
            }`}
          >
            <CalendarClock
              size={14}
              className={`mr-1 ${
                selectedCategory === "reminder"
                  ? "text-white"
                  : "text-amber-500"
              }`}
            />
            <Text
              className={`text-sm native:text-base font-medium ${
                selectedCategory === "reminder"
                  ? "text-white"
                  : "text-amber-500"
              }`}
            >
              提醒
            </Text>
          </Pressable>

          <Pressable
            onPress={onToggleDeleted}
            className={`px-3 py-1 native:px-4 native:py-2 rounded-md flex-row items-center ${
              showDeleted ? "bg-destructive" : "bg-destructive/10"
            }`}
          >
            <Trash2
              size={14}
              className={`mr-1 ${
                showDeleted ? "text-white" : "text-destructive"
              }`}
            />
            <Text
              className={`text-sm native:text-base font-medium ${
                showDeleted ? "text-white" : "text-destructive"
              }`}
            >
              已删除
            </Text>
          </Pressable>
        </ScrollView>
      </View>
    </Animated.View>
  );
};

// 新增创建通知对话框组件
const CreateNotificationDialog = ({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (notification: Omit<NotificationData, "id" | "createdAt">) => void;
  isSubmitting: boolean;
}) => {
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState<
    "general" | "important" | "reminder"
  >("general");
  const [date, setDate] = useState(new Date(Date.now() + 3600000)); // 默认一小时后
  const [isRepeating, setIsRepeating] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 验证表单
  const validateForm = () => {
    const formErrors: Record<string, string> = {};

    if (!message.trim()) {
      formErrors.message = "提醒内容不能为空";
    } else if (message.length > 100) {
      formErrors.message = "提醒内容不能超过100个字符";
    }

    if (date <= new Date()) {
      formErrors.date = "提醒时间必须在当前时间之后";
    }

    setErrors(formErrors);
    return Object.keys(formErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      onSubmit({
        message,
        date,
        isRepeating,
        category,
      });
    }
  };

  const handleClose = () => {
    // 重置表单
    setMessage("");
    setCategory("general");
    setDate(new Date(Date.now() + 3600000));
    setIsRepeating(false);
    setErrors({});
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex-row items-center space-x-2">
            <BellPlus size={20} className="text-primary" />
            <Text className="text-xl font-bold">创建新提醒</Text>
          </DialogTitle>
          <DialogDescription>
            添加新的提醒通知，设置时间和重复规则
          </DialogDescription>
        </DialogHeader>

        <View className="space-y-4 py-4">
          <View className="space-y-2">
            <Label htmlFor="message">提醒内容</Label>
            <Input
              id="message"
              value={message}
              onChangeText={setMessage}
              placeholder="请输入提醒内容..."
              className={errors.message ? "border-destructive" : ""}
            />
            {errors.message && (
              <Text className="text-xs text-destructive">{errors.message}</Text>
            )}
          </View>

          <View className="space-y-2">
            <Label>提醒类别</Label>
            <View className="flex-row space-x-2">
              <Pressable
                onPress={() => setCategory("general")}
                className={`flex-1 p-3 rounded-lg flex-row justify-center items-center ${
                  category === "general" ? "bg-primary" : "bg-primary/10"
                }`}
              >
                <Bell
                  size={16}
                  className={
                    category === "general" ? "text-white" : "text-primary"
                  }
                />
                <Text
                  className={`ml-2 ${
                    category === "general" ? "text-white" : "text-primary"
                  }`}
                >
                  常规
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setCategory("important")}
                className={`flex-1 p-3 rounded-lg flex-row justify-center items-center ${
                  category === "important" ? "bg-red-500" : "bg-red-500/10"
                }`}
              >
                <BellRing
                  size={16}
                  className={
                    category === "important" ? "text-white" : "text-red-500"
                  }
                />
                <Text
                  className={`ml-2 ${
                    category === "important" ? "text-white" : "text-red-500"
                  }`}
                >
                  重要
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setCategory("reminder")}
                className={`flex-1 p-3 rounded-lg flex-row justify-center items-center ${
                  category === "reminder" ? "bg-amber-500" : "bg-amber-500/10"
                }`}
              >
                <CalendarClock
                  size={16}
                  className={
                    category === "reminder" ? "text-white" : "text-amber-500"
                  }
                />
                <Text
                  className={`ml-2 ${
                    category === "reminder" ? "text-white" : "text-amber-500"
                  }`}
                >
                  提醒
                </Text>
              </Pressable>
            </View>
          </View>

          <View className="space-y-2">
            <Label>提醒时间</Label>
            {Platform.OS === "ios" || Platform.OS === "android" ? (
              <DateTimePicker
                value={date}
                mode="datetime"
                display="spinner"
                onChange={(_, selectedDate) =>
                  selectedDate && setDate(selectedDate)
                }
                minimumDate={new Date()}
                className="self-start"
              />
            ) : (
              <Input
                value={date.toISOString()}
                onChangeText={(text) => {
                  const newDate = new Date(text);
                  if (!isNaN(newDate.getTime())) {
                    setDate(newDate);
                  }
                }}
                className={errors.date ? "border-destructive" : ""}
              />
            )}
            {errors.date && (
              <Text className="text-xs text-destructive">{errors.date}</Text>
            )}

            <Text className="text-sm text-muted-foreground">
              预计提醒时间: {formatDate(date)}
            </Text>
          </View>

          <View className="flex-row items-center justify-between">
            <Label htmlFor="repeat" className="flex-row items-center space-x-2">
              <Repeat size={18} />
              <Text>每日重复</Text>
            </Label>
            <Switch
              id="repeat"
              checked={isRepeating}
              onCheckedChange={setIsRepeating}
            />
          </View>
        </View>

        <DialogFooter>
          <Button variant="outline" onPress={handleClose} className="mr-2">
            <X size={18} className="mr-2" />
            <Text>取消</Text>
          </Button>
          <Button onPress={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <ActivityIndicator size="small" color="white" className="mr-2" />
            ) : (
              <BellPlus size={18} className="mr-2" />
            )}
            <Text>创建提醒</Text>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const NotificationList = ({
  notifications,
  onDelete,
  onRecover,
  isDeleted = false,
  emptyMessage,
}: {
  notifications: NotificationData[];
  onDelete: (id: string) => void;
  onRecover: (id: string) => void;
  isDeleted?: boolean;
  emptyMessage: string;
}) => {
  if (notifications.length === 0) {
    return (
      <Animated.View
        entering={FadeIn.duration(400)}
        className="items-center py-8"
      >
        {isDeleted ? (
          <Trash2 size={40} className="text-muted-foreground mb-2" />
        ) : (
          <BellOff size={40} className="text-muted-foreground mb-2" />
        )}
        <Text className="text-muted-foreground text-center native:text-lg">
          {emptyMessage}
        </Text>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      entering={SlideInUp.duration(400).springify()}
      className="space-y-2"
    >
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onDelete={onDelete}
          onRecover={onRecover}
          isDeleted={isDeleted}
        />
      ))}
    </Animated.View>
  );
};

const TimerReminder: React.FC = () => {
  const { handleError } = useErrorBoundary();

  const [message, setMessage] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date>(
    new Date(Date.now() + 3600000)
  );
  const [isRepeating, setIsRepeating] = useState<boolean>(false);
  const [isDialogVisible, setIsDialogVisible] = useState<boolean>(false);
  const [isSettingReminder, setIsSettingReminder] = useState<boolean>(false);
  const [isCancelling, setIsCancelling] = useState<boolean>(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [isSubmittingNotification, setIsSubmittingNotification] =
    useState(false);
  const [selectedCategory, setSelectedCategory] = useState<
    "general" | "important" | "reminder"
  >("general");

  // 动画值
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const translateY = useSharedValue(0);

  const [state, dispatch] = useReducer(notificationsReducer, {
    notifications: [],
    loading: true,
    error: null,
    selectedCategory: "all",
    showDeleted: false,
    deletedNotifications: [],
  });

  const appState = useRef(AppState.currentState);

  // 请求通知权限和加载保存的通知
  useEffect(() => {
    const initialize = async () => {
      try {
        dispatch({ type: "SET_LOADING", payload: true });

        // 请求权限
        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== "granted") {
          toast.error("权限未授予", {
            description: "请在设置中启用通知权限",
            icon: <AlertCircle className="text-destructive" size={20} />,
          });
        }

        // 加载保存的通知
        const savedNotifications = await AsyncStorage.getItem(
          NOTIFICATION_STORAGE_KEY
        );
        if (savedNotifications) {
          const parsed = JSON.parse(savedNotifications);
          // 转换日期字符串到日期对象
          const notificationsWithDates = parsed.map((notification: any) => ({
            ...notification,
            date: new Date(notification.date),
            createdAt: notification.createdAt
              ? new Date(notification.createdAt)
              : new Date(),
          }));

          dispatch({
            type: "LOAD_NOTIFICATIONS",
            payload: notificationsWithDates,
          });
        } else {
          dispatch({ type: "SET_LOADING", payload: false });
        }
      } catch (error) {
        dispatch({ type: "SET_ERROR", payload: "初始化失败" });
        handleError(error, "加载通知");
      }
    };

    initialize();

    // 配置通知处理器
    const subscription = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log("通知收到:", notification);
      }
    );

    return () => {
      subscription.remove();
    };
  }, []);

  // 保存通知
  useEffect(() => {
    const saveNotifications = async () => {
      try {
        await AsyncStorage.setItem(
          NOTIFICATION_STORAGE_KEY,
          JSON.stringify(state.notifications)
        );
      } catch (error) {
        console.error("保存通知失败:", error);
      }
    };

    if (state.notifications.length > 0) {
      saveNotifications();
    }
  }, [state.notifications]);

  // 处理应用状态变化
  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const savedNotifications = await AsyncStorage.getItem(
          NOTIFICATION_STORAGE_KEY
        );
        if (savedNotifications) {
          const parsed = JSON.parse(savedNotifications);
          const notificationsWithDates = parsed.map((notification: any) => ({
            ...notification,
            date: new Date(notification.date),
            createdAt: notification.createdAt
              ? new Date(notification.createdAt)
              : new Date(),
          }));

          dispatch({
            type: "LOAD_NOTIFICATIONS",
            payload: notificationsWithDates,
          });
        }
      } catch (error) {
        dispatch({ type: "SET_ERROR", payload: "加载通知失败" });
      }
    };

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === "active"
      ) {
        loadNotifications();
      }
      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange
    );
    return () => {
      subscription.remove();
    };
  }, []);

  const handleHapticFeedback = useCallback(
    async (type: "success" | "error" | "warning") => {
      if (Platform.OS === "web") return;

      switch (type) {
        case "success":
          await Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Success
          );
          break;
        case "error":
          await Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Error
          );
          break;
        case "warning":
          await Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Warning
          );
          break;
      }
    },
    []
  );

  // 创建通知
  const createNotification = async (
    data: Omit<NotificationData, "id" | "createdAt">
  ) => {
    try {
      setIsSubmittingNotification(true);

      // 验证
      const validatedData = NotificationSchema.parse({
        ...data,
        id: crypto.randomUUID(),
        createdAt: new Date(),
      });

      // 添加到状态
      dispatch({ type: "ADD_NOTIFICATION", payload: validatedData });

      // 创建实际通知
      await scheduleNotification(validatedData);

      handleHapticFeedback("success");
      toast.success("提醒创建成功", {
        description: `将于 ${formatDate(data.date)} 提醒您`,
        icon: <CheckCircle2 className="text-success" size={20} />,
      });

      setCreateDialogOpen(false);
    } catch (error) {
      handleError(error, "创建提醒");
    } finally {
      setIsSubmittingNotification(false);
    }
  };

  // 封装调度通知的逻辑
  const scheduleNotification = async (data: {
    message: string;
    date: Date;
    isRepeating: boolean;
  }) => {
    const timeInSeconds = Math.floor(
      (data.date.getTime() - new Date().getTime()) / 1000
    );

    if (timeInSeconds <= 0) {
      throw new Error("提醒时间必须在当前时间之后");
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "定时提醒",
        body: data.message || "提醒时间到！",
      },
      trigger: {
        type: SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: timeInSeconds,
      } as TimeIntervalTriggerInput,
    });

    if (data.isRepeating) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "定时提醒",
          body: data.message || "提醒时间到！",
        },
        trigger: {
          type: SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: 86400, // 24小时
          repeats: true,
        } as TimeIntervalTriggerInput,
      });
    }
  };

  // 处理删除通知
  const handleDeleteNotification = useCallback(
    async (id: string) => {
      try {
        handleHapticFeedback("warning");
        dispatch({ type: "DELETE_NOTIFICATION", payload: id });

        toast.success("提醒已删除", {
          description: "已移动到回收站",
        });
      } catch (error) {
        handleError(error, "删除提醒");
      }
    },
    [handleHapticFeedback]
  );

  // 处理恢复已删除的通知
  const handleRecoverNotification = useCallback(
    async (id: string) => {
      try {
        handleHapticFeedback("success");
        dispatch({ type: "RECOVER_NOTIFICATION", payload: id });

        toast.success("提醒已恢复", {
          icon: <CheckCircle2 size={20} className="text-success" />,
        });
      } catch (error) {
        handleError(error, "恢复提醒");
      }
    },
    [handleHapticFeedback]
  );

  // 清空已删除的通知
  const handleClearDeleted = useCallback(async () => {
    try {
      handleHapticFeedback("warning");
      dispatch({ type: "CLEAR_DELETED" });

      toast.success("回收站已清空", {
        icon: <Trash2 size={20} className="text-primary" />,
      });
    } catch (error) {
      handleError(error, "清空回收站");
    }
  }, [handleHapticFeedback]);

  // 设置提醒
  const setReminder = useCallback(async () => {
    try {
      setIsSettingReminder(true);

      // 验证数据
      const data = {
        message,
        date: selectedDate,
        isRepeating,
        category: selectedCategory,
      };

      const validatedData = NotificationSchema.parse({
        ...data,
        id: crypto.randomUUID(),
        createdAt: new Date(),
      });

      // 调度通知
      await scheduleNotification(data);

      // 添加到状态
      dispatch({ type: "ADD_NOTIFICATION", payload: validatedData });

      handleHapticFeedback("success");
      toast.success("提醒设置成功", {
        description: `将于 ${formatDate(selectedDate)} 提醒您`,
        icon: <CheckCircle2 className="text-success" size={20} />,
      });

      scale.value = withSequence(withSpring(0.95), withSpring(1));

      // 重置表单
      setMessage("");
      setSelectedDate(new Date(Date.now() + 3600000));
      setIsRepeating(false);
    } catch (error) {
      handleError(error, "设置提醒");
    } finally {
      setIsSettingReminder(false);
    }
  }, [message, selectedDate, isRepeating, selectedCategory, scale]);

  // 取消所有提醒
  const cancelAllReminders = useCallback(async () => {
    if (isCancelling) return;

    setIsCancelling(true);
    translateY.value = withSpring(0);
    opacity.value = withSpring(0.8);

    try {
      await Notifications.cancelAllScheduledNotificationsAsync();

      // 移动所有通知到已删除
      state.notifications.forEach((notification) => {
        dispatch({ type: "DELETE_NOTIFICATION", payload: notification.id! });
      });

      handleHapticFeedback("warning");
      toast.success("提醒已清除", {
        description: "所有定时提醒已取消",
        icon: <XCircle className="text-primary" size={20} />,
      });
    } catch (error) {
      handleError(error, "取消提醒");
    } finally {
      setIsCancelling(false);
      translateY.value = withSpring(0);
      opacity.value = withSpring(1);
      scale.value = withSequence(withSpring(0.95), withSpring(1));
    }
  }, [
    isCancelling,
    state.notifications,
    translateY,
    opacity,
    scale,
    handleHapticFeedback,
  ]);

  // 处理日期变更
  const handleDateChange = useCallback((selected: Date) => {
    setSelectedDate(selected);
    setIsDialogVisible(false);
    handleHapticFeedback("success");
  }, []);

  const animatedStyle = useMemo(() => {
    return useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }, { translateY: translateY.value }],
      opacity: opacity.value,
    }));
  }, [scale, opacity, translateY]);

  // 按类别过滤通知
  const filteredNotifications = useMemo(() => {
    return state.notifications.filter(
      (notification) =>
        state.selectedCategory === "all" ||
        notification.category === state.selectedCategory
    );
  }, [state.notifications, state.selectedCategory]);

  // 添加快速操作按钮
  const QuickActionButton = ({
    icon: Icon,
    label,
    onPress,
    variant = "default",
  }: {
    icon: React.ElementType;
    label: string;
    onPress: () => void;
    variant?: "default" | "destructive" | "outline";
  }) => (
    <Button
      className="flex-row items-center justify-center h-10 native:h-12"
      variant={variant}
      onPress={onPress}
    >
      <Icon size={18} className="mr-2" />
      <Text className="text-sm native:text-base">{label}</Text>
    </Button>
  );

  // 添加通知管理面板
  const renderNotificationManagement = () => {
    if (state.loading) {
      return (
        <Animated.View
          entering={FadeIn.duration(300)}
          className="items-center py-8"
        >
          <ActivityIndicator size="large" className="mb-4" />
          <Text className="text-muted-foreground">正在加载通知...</Text>
        </Animated.View>
      );
    }

    return (
      <Card className="mt-6 native:rounded-2xl native:shadow-lg overflow-hidden border-primary/10">
        <CardHeader className="border-b border-border/10">
          <CardTitle className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <BellRing
                size={20}
                className="text-primary mr-2 native:h-6 native:w-6"
              />
              <Text className="text-lg native:text-xl font-semibold">
                通知管理
              </Text>
            </View>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full"
              onPress={() => setCreateDialogOpen(true)}
            >
              <BellPlus size={18} className="text-primary" />
            </Button>
          </CardTitle>
        </CardHeader>

        <CardContent className="p-4 native:p-5">
          {/* 过滤器 */}
          <FilterBar
            selectedCategory={state.selectedCategory}
            onSelectCategory={(category) =>
              dispatch({ type: "SET_CATEGORY", payload: category })
            }
            showDeleted={state.showDeleted}
            onToggleDeleted={() => dispatch({ type: "TOGGLE_DELETED" })}
          />

          {/* 通知列表或已删除列表 */}
          {state.showDeleted ? (
            <>
              <NotificationList
                notifications={state.deletedNotifications}
                onDelete={handleDeleteNotification}
                onRecover={handleRecoverNotification}
                isDeleted={true}
                emptyMessage="回收站中没有通知"
              />

              {state.deletedNotifications.length > 0 && (
                <Button
                  variant="destructive"
                  className="w-full mt-4"
                  onPress={handleClearDeleted}
                >
                  <Trash2 size={16} className="mr-2" />
                  <Text>永久删除所有通知</Text>
                </Button>
              )}
            </>
          ) : (
            <NotificationList
              notifications={filteredNotifications}
              onDelete={handleDeleteNotification}
              onRecover={handleRecoverNotification}
              emptyMessage={
                state.selectedCategory === "all"
                  ? "没有找到通知"
                  : `没有找到 ${
                      state.selectedCategory === "general"
                        ? "常规"
                        : state.selectedCategory === "important"
                        ? "重要"
                        : "提醒"
                    } 类型的通知`
              }
            />
          )}
        </CardContent>
      </Card>
    );
  };

  const animatedButtonStyle = useMemo(() => {
    return useAnimatedStyle(() => ({
      transform: [{ scale: withSpring(isSettingReminder ? 0.95 : 1) }],
      opacity: withSpring(isSettingReminder ? 0.8 : 1),
    }));
  }, [isSettingReminder]);

  // 提醒状态信息
  const reminderInfo = useMemo(
    () => ({
      title: isRepeating ? "重复提醒" : "单次提醒",
      description: message || "未设置提醒内容",
      time: selectedDate.toLocaleString(),
      icon: isRepeating ? BellRing : AlertCircle,
      variant: isRepeating ? ("default" as const) : ("destructive" as const),
    }),
    [isRepeating, message, selectedDate]
  );

  return (
    <ScrollView
      className="flex-1 bg-gradient-to-b from-background to-background/95"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ padding: 16, paddingBottom: 100 }} // 增加底部填充以确保所有内容可见
    >
      <Animated.View
        entering={FadeIn.duration(500).springify()}
        className="space-y-4 native:space-y-6"
      >
        <Card className="native:rounded-2xl native:shadow-lg overflow-hidden border-primary/10 bg-gradient-to-b from-card to-card/95">
          <CardHeader className="native:py-4 space-y-2 border-b border-border/10">
            <CardTitle className="flex-row items-center space-x-3">
              <Bell size={24} className="text-primary native:h-7 native:w-7" />
              <Text className="text-xl native:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
                通知提醒设置
              </Text>
            </CardTitle>
            <CardDescription className="native:text-base text-muted-foreground/80">
              设置您的定时提醒
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 p-4 native:p-5">
            <Animated.View
              entering={SlideInUp.delay(200).springify()}
              className="space-y-2"
            >
              <Label className="flex-row items-center space-x-2">
                <BellRing size={16} className="text-primary" />
                <Text className="native:text-base">提醒内容</Text>
              </Label>
              <Input
                value={message}
                onChangeText={setMessage}
                placeholder="输入提醒内容"
                className="h-12 native:h-14 native:text-base native:rounded-xl bg-primary/5"
              />

              {/* 添加选择类别 */}
              <View className="flex-row space-x-2 mt-4">
                <Pressable
                  onPress={() => setSelectedCategory("general")}
                  className={`flex-1 p-3 rounded-lg flex-row justify-center items-center ${
                    selectedCategory === "general"
                      ? "bg-primary"
                      : "bg-primary/10"
                  }`}
                >
                  <Bell
                    size={16}
                    className={
                      selectedCategory === "general"
                        ? "text-white"
                        : "text-primary"
                    }
                  />
                  <Text
                    className={`ml-2 ${
                      selectedCategory === "general"
                        ? "text-white"
                        : "text-primary"
                    }`}
                  >
                    常规
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => setSelectedCategory("important")}
                  className={`flex-1 p-3 rounded-lg flex-row justify-center items-center ${
                    selectedCategory === "important"
                      ? "bg-red-500"
                      : "bg-red-500/10"
                  }`}
                >
                  <BellRing
                    size={16}
                    className={
                      selectedCategory === "important"
                        ? "text-white"
                        : "text-red-500"
                    }
                  />
                  <Text
                    className={`ml-2 ${
                      selectedCategory === "important"
                        ? "text-white"
                        : "text-red-500"
                    }`}
                  >
                    重要
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => setSelectedCategory("reminder")}
                  className={`flex-1 p-3 rounded-lg flex-row justify-center items-center ${
                    selectedCategory === "reminder"
                      ? "bg-amber-500"
                      : "bg-amber-500/10"
                  }`}
                >
                  <CalendarClock
                    size={16}
                    className={
                      selectedCategory === "reminder"
                        ? "text-white"
                        : "text-amber-500"
                    }
                  />
                  <Text
                    className={`ml-2 ${
                      selectedCategory === "reminder"
                        ? "text-white"
                        : "text-amber-500"
                    }`}
                  >
                    提醒
                  </Text>
                </Pressable>
              </View>
            </Animated.View>

            <View className="space-y-4">
              <View className="flex-row justify-between items-center">
                <View className="flex-row items-center space-x-3">
                  <View className="bg-primary/10 p-2 rounded-full">
                    <Clock
                      size={20}
                      className="text-primary native:h-6 native:w-6"
                    />
                  </View>
                  <View>
                    <Text className="native:text-lg font-medium">提醒时间</Text>
                    <Text className="text-sm text-muted-foreground mt-1">
                      {selectedDate.toLocaleString()}
                    </Text>
                  </View>
                </View>
                <ChevronRight size={20} className="text-primary opacity-50" />
              </View>

              <View className="flex-row justify-between items-center">
                <View className="flex-row items-center space-x-3">
                  <View className="bg-primary/10 p-2 rounded-full">
                    <Repeat
                      size={20}
                      className="text-primary native:h-6 native:w-6"
                    />
                  </View>
                  <View>
                    <Text className="native:text-lg font-medium">每日重复</Text>
                    <Text className="text-sm text-muted-foreground mt-1">
                      {isRepeating ? "已启用每日重复提醒" : "单次提醒"}
                    </Text>
                  </View>
                </View>
                {isRepeating && (
                  <CheckCircle2 size={20} className="text-primary" />
                )}
              </View>
            </View>

            <View className="space-y-3 mt-4">
              <Animated.View style={animatedButtonStyle}>
                <Button
                  className="w-full h-12 native:h-14 native:rounded-xl bg-primary"
                  onPress={setReminder}
                  disabled={isSettingReminder || !message.trim()} // 添加验证
                >
                  {isSettingReminder ? (
                    <ActivityIndicator color="white" className="mr-2" />
                  ) : (
                    <Vibrate size={18} className="mr-2 native:h-5 native:w-5" />
                  )}
                  <Text className="text-white native:text-lg font-medium">
                    {isSettingReminder ? "设置中..." : "设置提醒"}
                  </Text>
                </Button>
              </Animated.View>

              {/* 添加一个新增按钮 */}
              <Animated.View style={animatedButtonStyle}>
                <Button
                  className="w-full h-12 native:h-14 native:rounded-xl bg-primary/20"
                  variant="outline"
                  onPress={() => setCreateDialogOpen(true)}
                  disabled={isSettingReminder}
                >
                  <BellPlus
                    size={18}
                    className="mr-2 native:h-5 native:w-5 text-primary"
                  />
                  <Text className="native:text-lg font-medium text-primary">
                    创建新提醒
                  </Text>
                </Button>
              </Animated.View>

              <Animated.View style={animatedButtonStyle}>
                <Button
                  className="w-full h-12 native:h-14 native:rounded-xl"
                  variant="destructive"
                  onPress={cancelAllReminders}
                  disabled={isCancelling || isSettingReminder}
                >
                  {isCancelling ? (
                    <ActivityIndicator color="white" className="mr-2" />
                  ) : (
                    <XCircle size={18} className="mr-2 native:h-5 native:w-5" />
                  )}
                  <Text className="native:text-lg font-medium">
                    {isCancelling ? "取消中..." : "取消所有提醒"}
                  </Text>
                </Button>
              </Animated.View>
            </View>
          </CardContent>
        </Card>

        {message.trim() && (
          <Animated.View entering={FadeIn.delay(300).springify()}>
            <Alert
              variant={reminderInfo.variant}
              icon={reminderInfo.icon}
              className="native:rounded-xl native:py-4 bg-primary/10 border-primary/20"
            >
              <AlertTitle className="native:text-lg font-semibold">
                {reminderInfo.title}
              </AlertTitle>
              <AlertDescription className="native:text-base text-muted-foreground/90 space-y-2">
                <Text>{reminderInfo.description}</Text>
                {selectedDate && (
                  <Text className="block text-sm">
                    预计提醒时间：{reminderInfo.time}
                  </Text>
                )}
              </AlertDescription>
            </Alert>
          </Animated.View>
        )}

        {/* 通知管理面板 */}
        {renderNotificationManagement()}
      </Animated.View>

      <AlertDialog open={isDialogVisible} onOpenChange={setIsDialogVisible}>
        <AlertDialogContent className="w-[95%] sm:w-[80%] md:w-[70%] max-w-lg mx-auto p-4 md:p-6 bg-gradient-to-b from-card to-card/95 native:rounded-3xl">
          <Animated.View
            entering={FadeIn.duration(300).springify()}
            className="space-y-4"
          >
            <Text className="text-xl native:text-2xl font-bold text-primary">
              选择提醒时间
            </Text>
            {Platform.OS === "ios" || Platform.OS === "android" ? (
              <DateTimePicker
                value={selectedDate}
                mode="datetime"
                display="spinner"
                onChange={(event, date) => date && handleDateChange(date)}
                minimumDate={new Date()} // 添加最小日期限制
              />
            ) : (
              <View className="space-y-3">
                <Input
                  value={selectedDate.toISOString().slice(0, 16)}
                  onChange={(e) =>
                    handleDateChange(new Date(e.nativeEvent.text))
                  }
                  className="mb-4"
                />
                <Button
                  className="w-full h-12 native:h-14 native:rounded-xl"
                  variant="outline"
                  onPress={() => setIsDialogVisible(false)}
                >
                  <X size={18} className="mr-2 native:h-5 native:w-5" />
                  <Text className="native:text-lg">取消</Text>
                </Button>
              </View>
            )}
          </Animated.View>
        </AlertDialogContent>
      </AlertDialog>

      {/* 创建新通知对话框 */}
      <CreateNotificationDialog
        isOpen={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onSubmit={createNotification}
        isSubmitting={isSubmittingNotification}
      />
    </ScrollView>
  );
};

export default TimerReminder;
