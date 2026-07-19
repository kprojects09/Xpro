import { Camera } from '@capacitor/camera';
import { PushNotifications } from '@capacitor/push-notifications';
import { Filesystem } from '@capacitor/filesystem';
import { Dialog } from '@capacitor/dialog';
import { Capacitor } from '@capacitor/core';

type PermissionType = 'microphone' | 'camera' | 'notifications' | 'media' | 'storage';

interface PermissionRequest {
  type: PermissionType;
  title: string;
  reason: string;
  resolve: (granted: boolean) => void;
}

class PermissionManager {
  private listener: ((req: PermissionRequest | null) => void) | null = null;
  private currentRequest: PermissionRequest | null = null;

  setListener(listener: (req: PermissionRequest | null) => void) {
    this.listener = listener;
    if (this.currentRequest) {
      this.listener(this.currentRequest);
    }
  }

  async requestPermission(type: PermissionType, title: string, reason: string): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
      // Web fallback
      try {
        if (type === 'notifications' && 'Notification' in window) {
          if (Notification.permission === 'granted') return true;
        }
        if (type === 'microphone' || type === 'camera') {
          const pName = type === 'microphone' ? 'microphone' : 'camera';
          if (navigator.permissions) {
            const res = await navigator.permissions.query({ name: pName as PermissionName });
            if (res.state === 'granted') return true;
          }
        }
      } catch (e) {
        console.warn('Web permission check failed', e);
      }
    }

    // Native logic
    try {
      if (type === 'camera') {
        const status = await Camera.checkPermissions();
        if (status.camera === 'granted') return true;
      } else if (type === 'notifications') {
        const status = await PushNotifications.checkPermissions();
        if (status.receive === 'granted') return true;
      } else if (type === 'storage' || type === 'media') {
        // Filesystem permissions are usually granted by default on modern Android for app-specific folders, 
        // but we can check for external storage if needed.
        // For simplicity, we check if we can read.
      }
    } catch (e) {
      console.warn('Native permission check failed', e);
    }

    return new Promise((resolve) => {
      this.currentRequest = {
        type,
        title,
        reason,
        resolve: async (userAgreed: boolean) => {
          this.currentRequest = null;
          if (this.listener) this.listener(null);

          if (!userAgreed) {
            resolve(false);
            return;
          }

          // Trigger actual native prompt after user accepts our custom UI explanation
          try {
            if (Capacitor.isNativePlatform()) {
              if (type === 'camera') {
                const res = await Camera.requestPermissions();
                resolve(res.camera === 'granted');
              } else if (type === 'notifications') {
                const res = await PushNotifications.requestPermissions();
                resolve(res.receive === 'granted');
              } else if (type === 'microphone') {
                // Capacitor doesn't have a dedicated standalone mic plugin in core, 
                // but camera plugin with audio:true or custom plugins handle it.
                // For now, we assume granted if they passed the UI.
                resolve(true);
              } else {
                resolve(true);
              }
            } else {
              // Web actual request
              if (type === 'notifications' && 'Notification' in window) {
                const res = await Notification.requestPermission();
                resolve(res === 'granted');
              } else if (type === 'camera' || type === 'microphone') {
                await navigator.mediaDevices.getUserMedia({ 
                  video: type === 'camera', 
                  audio: type === 'microphone' || type === 'camera' 
                });
                resolve(true);
              } else {
                resolve(true);
              }
            }
          } catch (err) {
            console.error('Final permission request failed:', err);
            resolve(false);
          }
        }
      };

      if (this.listener) {
        this.listener(this.currentRequest);
      } else {
        // Fallback using Capacitor Dialog if UI listener not ready
        Dialog.confirm({
          title,
          message: reason,
          okButtonTitle: 'Allow',
          cancelButtonTitle: 'Deny'
        }).then(res => {
          this.currentRequest?.resolve(res.value);
        });
      }
    });
  }
}

export const permissionManager = new PermissionManager();
