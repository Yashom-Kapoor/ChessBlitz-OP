import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

export async function chooseProfilePhoto(): Promise<string | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 1,
  });
  if (result.canceled) return null;

  const photo = result.assets[0];
  const side = Math.min(photo.width, photo.height);
  if (side <= 0) throw new Error('Could not read this photo. Please choose another image.');
  const context = ImageManipulator.manipulate(photo.uri);
  try {
    // Web has no native crop editor. Normalize all formats, including HEIC, to JPEG.
    context.crop({
      originX: Math.floor((photo.width - side) / 2),
      originY: Math.floor((photo.height - side) / 2),
      width: side, height: side,
    }).resize({ width: 512, height: 512 });
    const image = await context.renderAsync();
    try {
      const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.8, base64: true });
      if (!saved.base64) throw new Error('Could not read this photo. Please choose another image.');
      return saved.base64;
    } finally {
      image.release();
    }
  } finally {
    context.release();
  }
}
