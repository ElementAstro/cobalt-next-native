import React, { useState, useEffect } from "react";
import { Button, View, Text, TextInput, Alert } from "react-native";
import * as TaskManager from "expo-task-manager";
import * as Notifications from "expo-notifications";
import { AlertDialog } from "@/components/ui/alert-dialog";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

interface TaskData {
  message: string;
}

// 定义任务：触发通知
TaskManager.defineTask("background-reminder-task", async ({ data, error }) => {
  if (error) {
    console.error("Task Error:", error);
    return;
  }
  if (data) {
    const { message } = data;
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
});

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

    // 注册任务数据
    await TaskManager.defineTask(
      "background-reminder-task",
      async ({ data, error }: { data?: TaskData; error?: Error }) => {
        if (error) {
          console.error("Task Error:", error);
          return;
        }
        if (data) {
          const { message } = data;
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
    <View className="flex-1 justify-center items-center p-5 bg-white">
      <Text className="text-2xl mb-5">设置定时提醒</Text>

      <TextInput
        className="h-10 border border-gray-300 w-full mb-5 px-2 rounded"
        placeholder="输入提醒内容"
        value={message}
        onChangeText={setMessage}
      />

      <Button title="选择提醒时间" onPress={() => setIsDialogVisible(true)} />

      <AlertDialog
        open={isDialogVisible}
        onOpenChange={(open) => setIsDialogVisible(open)}
      >
        <Animated.View
          entering={FadeIn}
          exiting={FadeOut}
          className="p-4 bg-white rounded-lg shadow-lg"
        >
          <Text className="text-lg mb-4">选择日期和时间</Text>
          <Button
            title="选择当前时间"
            onPress={() => handleDateChange(new Date())}
          />
          <Button title="取消" onPress={() => setIsDialogVisible(false)} />
        </Animated.View>
      </AlertDialog>

      <View className="flex-row items-center my-5">
        <Text className="mr-2">每天重复提醒</Text>
        <Button
          title={isRepeating ? "取消重复" : "设置重复"}
          onPress={() => setIsRepeating(!isRepeating)}
        />
      </View>

      <Button title="设置提醒" onPress={setReminder} />
      <Button title="取消所有提醒" onPress={cancelReminder} />
    </View>
  );
};

export default TimerReminder;
