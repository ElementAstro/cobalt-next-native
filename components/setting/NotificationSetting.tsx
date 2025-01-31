import React, { useState, useEffect } from "react";
import { View, Text, TextInput, Alert, ScrollView } from "react-native";
import * as TaskManager from "expo-task-manager";
import * as Notifications from "expo-notifications";
import {
  AlertDialog,
  AlertDialogContent,
} from "@/components/ui/alert-dialog";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
          type: "timeInterval",
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
        Alert.alert("通知权限未授予", "请在设置中启用通知权限");
      }
    };

    requestNotificationPermissions();
  }, []);

  const setReminder = async () => {
    const timeInSeconds = Math.floor(
      (selectedDate.getTime() - new Date().getTime()) / 1000
    );
    if (timeInSeconds <= 0) {
      Alert.alert("无效时间", "提醒时间必须在当前时间之后");
      return;
    }

    // 设置提醒通知
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "定时提醒",
        body: message || "提醒时间到！",
      },
      trigger: {
        type: "timeInterval",
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
          type: "timeInterval",
          seconds: 86400,
          repeats: true,
        },
      });
    }

    Alert.alert("提醒设置成功", `将于 ${selectedDate.toLocaleString()} 提醒您`);
  };

  const cancelReminder = async () => {
    await Notifications.cancelAllScheduledNotificationsAsync();
    Alert.alert("提醒已取消", "所有定时提醒已取消");
  };

  const handleDateChange = (selected: Date) => {
    setSelectedDate(selected);
    setIsDialogVisible(false);
  };

  return (
    <View className="flex-1 p-4">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <Card>
          <CardHeader>
            <CardTitle>设置定时提醒</CardTitle>
          </CardHeader>
          <CardContent>
            <TextInput
              className="h-12 border border-border rounded-lg px-4 bg-background"
              placeholder="输入提醒内容"
              value={message}
              onChangeText={setMessage}
            />

            <View className="flex-row space-x-4">
              <View className="flex-1">
                <Button
                  onPress={() => setIsDialogVisible(true)}
                >
                  <Text>选择提醒时间</Text>
                </Button>
              </View>
              <View className="flex-1">
                <Button
                  onPress={() => setIsRepeating(!isRepeating)}
                >
                  <Text>{isRepeating ? "取消重复" : "设置重复"}</Text>
                </Button>
              </View>
            </View>

            <View className="space-y-2">
              <Button onPress={setReminder}>
                <Text>设置提醒</Text>
              </Button>
              <Button onPress={cancelReminder}>
                <Text>取消所有提醒</Text>
              </Button>
            </View>
          </CardContent>
        </Card>
      </ScrollView>

      <AlertDialog open={isDialogVisible} onOpenChange={setIsDialogVisible}>
        <AlertDialogContent>
          <Animated.View
            entering={FadeIn}
            exiting={FadeOut}
            className="p-4 bg-white rounded-lg shadow-lg"
          >
            <Text className="text-lg mb-4">选择日期和时间</Text>
            <Button onPress={() => handleDateChange(new Date())}>
              <Text>选择当前时间</Text>
            </Button>
            <Button onPress={() => setIsDialogVisible(false)}>
              <Text>取消</Text>
            </Button>
          </Animated.View>
        </AlertDialogContent>
      </AlertDialog>
    </View>
  );
};

export default TimerReminder;