import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Alert as RNAlert,
} from "react-native";
import * as TaskManager from "expo-task-manager";
import * as Notifications from "expo-notifications";
import { AlertDialog, AlertDialogContent } from "@/components/ui/alert-dialog";
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
} from "lucide-react-native";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

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
          type: "seconds",
          seconds: 1,
          repeats: false,
        },
      });
    }
  }
);

const TimerReminder: React.FC = () => {
  const [message, setMessage] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isRepeating, setIsRepeating] = useState<boolean>(false);
  const [isDialogVisible, setIsDialogVisible] = useState<boolean>(false);

  useEffect(() => {
    const requestNotificationPermissions = async () => {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== "granted") {
        RNAlert.alert("通知权限未授予", "请在设置中启用通知权限");
      }
    };

    requestNotificationPermissions();
  }, []);

  const setReminder = async () => {
    const timeInSeconds = Math.floor(
      (selectedDate.getTime() - new Date().getTime()) / 1000
    );
    if (timeInSeconds <= 0) {
      RNAlert.alert("无效时间", "提醒时间必须在当前时间之后");
      return;
    }

    // 设置提醒通知
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "定时提醒",
        body: message || "提醒时间到！",
      },
      trigger: {
        type: "seconds",
        seconds: timeInSeconds,
        repeats: false,
      },
    });

    // 如果设置了重复提醒
    if (isRepeating) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "定时提醒",
          body: message || "提醒时间到！",
        },
        trigger: {
          type: "seconds",
          seconds: 86400,
          repeats: true,
        },
      });
    }

    RNAlert.alert(
      "提醒设置成功",
      `将于 ${selectedDate.toLocaleString()} 提醒您`
    );
  };

  const cancelReminder = async () => {
    await Notifications.cancelAllScheduledNotificationsAsync();
    RNAlert.alert("提醒已取消", "所有定时提醒已取消");
  };

  const handleDateChange = (selected: Date) => {
    setSelectedDate(selected);
    setIsDialogVisible(false);
  };

  return (
    <View className="flex-1 p-2 md:p-4">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="flex-1 flex-col sm:flex-row sm:space-x-2 space-y-2 sm:space-y-0">
          <Card className="flex-1 sm:w-1/2">
            <CardHeader>
              <CardTitle className="flex-row items-center space-x-2">
                <Bell size={24} className="text-primary" />
                <Text className="text-xl font-bold">通知提醒设置</Text>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <TextInput
                className="h-12 border border-border rounded-lg px-4 bg-background"
                placeholder="输入提醒内容"
                value={message}
                onChangeText={setMessage}
              />

              <View className="flex-row flex-wrap gap-2">
                <Button
                  className="flex-1"
                  onPress={() => setIsDialogVisible(true)}
                >
                  <Clock size={18} className="mr-2" />
                  <Text>选择提醒时间</Text>
                </Button>
                <Button
                  className="flex-1"
                  variant={isRepeating ? "default" : "outline"}
                  onPress={() => setIsRepeating(!isRepeating)}
                >
                  <Repeat size={18} className="mr-2" />
                  <Text>{isRepeating ? "取消重复" : "设置重复"}</Text>
                </Button>
              </View>

              <View className="space-y-2">
                <Button
                  className="w-full flex-row items-center justify-center"
                  onPress={setReminder}
                >
                  <Bell size={18} className="mr-2" />
                  <Text>设置提醒</Text>
                </Button>
                <Button
                  className="w-full flex-row items-center justify-center"
                  variant="destructive"
                  onPress={cancelReminder}
                >
                  <XCircle size={18} className="mr-2" />
                  <Text>取消所有提醒</Text>
                </Button>
              </View>
            </CardContent>
          </Card>

          <Card className="flex-1 sm:w-1/2">
            <CardHeader>
              <CardTitle className="flex-row items-center space-x-2">
                <Settings2 size={24} className="text-primary" />
                <Text className="text-xl font-bold">提醒预览</Text>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Alert
                variant={isRepeating ? "default" : "destructive"}
                icon={isRepeating ? BellRing : AlertCircle}
              >
                <AlertTitle>{isRepeating ? "重复提醒" : "单次提醒"}</AlertTitle>
                <AlertDescription>
                  {message || "未设置提醒内容"}
                </AlertDescription>
              </Alert>

              <View className="mt-4">
                <Text className="text-sm text-muted-foreground">
                  预计提醒时间：{selectedDate.toLocaleString()}
                </Text>
              </View>
            </CardContent>
          </Card>
        </View>
      </ScrollView>

      <AlertDialog open={isDialogVisible} onOpenChange={setIsDialogVisible}>
        <AlertDialogContent className="w-[95%] sm:w-[80%] md:w-[70%] max-w-lg mx-auto p-2 md:p-4">
          <Animated.View
            entering={FadeIn}
            exiting={FadeOut}
            className="p-4 bg-card rounded-lg"
          >
            <Text className="text-lg font-medium mb-4">选择日期和时间</Text>
            <View className="space-y-2">
              <Button
                className="w-full"
                onPress={() => handleDateChange(new Date())}
              >
                <Calendar size={18} className="mr-2" />
                <Text>选择当前时间</Text>
              </Button>
              <Button
                className="w-full"
                variant="outline"
                onPress={() => setIsDialogVisible(false)}
              >
                <X size={18} className="mr-2" />
                <Text>取消</Text>
              </Button>
            </View>
          </Animated.View>
        </AlertDialogContent>
      </AlertDialog>
    </View>
  );
};

export default TimerReminder;
