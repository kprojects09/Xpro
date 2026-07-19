import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';

export async function downloadAndOpenFile(url: string, fileName: string) {
  try {
    if (!Capacitor.isNativePlatform()) {
      // Web fallback
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    // Native logic
    const response = await fetch(url);
    const blob = await response.blob();
    const reader = new FileReader();

    reader.onloadend = async () => {
      const base64data = reader.result as string;
      const base64Content = base64data.split(',')[1];

      const savedFile = await Filesystem.writeFile({
        path: fileName,
        data: base64Content,
        directory: Directory.Documents,
      });

      await Share.share({
        title: fileName,
        text: 'Sharing file from Sweety AI',
        url: savedFile.uri,
      });
    };

    reader.readAsDataURL(blob);
  } catch (err) {
    console.error('Download/Share error:', err);
    throw err;
  }
}
