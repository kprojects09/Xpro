import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { db, auth } from '../firebase';
import { doc, updateDoc, collection, addDoc } from 'firebase/firestore';

export const setupPushNotifications = async () => {
  if (!Capacitor.isNativePlatform()) return;

  // Request permission to use push notifications
  // iOS will prompt user and return if they granted permission or not
  // Android will return granted as true since it's allowed by default (unless API 33+)
  let permStatus = await PushNotifications.checkPermissions();

  if (permStatus.receive === 'prompt') {
    permStatus = await PushNotifications.requestPermissions();
  }

  if (permStatus.receive !== 'granted') {
    console.warn('User denied permissions!');
    return;
  }

  // Register with Apple / Google to receive push via APNS/FCM
  await PushNotifications.register();

  // On success, we should be able to receive a token
  PushNotifications.addListener('registration', (token: Token) => {
    console.log('Push registration success, token: ' + token.value);
    saveTokenToFirestore(token.value);
  });

  // Some error occurred
  PushNotifications.addListener('registrationError', (error: any) => {
    console.error('Error on registration: ' + JSON.stringify(error));
  });

  // Show us the notification payload if the app is open on our device
  PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
    console.log('Push received: ' + JSON.stringify(notification));
  });

  // Method called when tapping on a notification
  PushNotifications.addListener('pushNotificationActionPerformed', (notification: ActionPerformed) => {
    console.log('Push action performed: ' + JSON.stringify(notification));
  });
};

const saveTokenToFirestore = async (token: string) => {
  const user = auth.currentUser;
  if (!user) return;

  try {
    const userRef = doc(db, 'users', user.uid);
    await updateDoc(userRef, {
      fcmToken: token,
      lastTokenUpdate: new Date().toISOString()
    });
    console.log('FCM Token saved to Firestore');
  } catch (err) {
    console.error('Error saving FCM token:', err);
  }
};
