/// <reference types="jest" />

import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator } from 'expo-image-manipulator';
import { chooseProfilePhoto } from '../profilePhoto';

jest.mock('expo-image-picker', () => ({ launchImageLibraryAsync: jest.fn() }));
jest.mock('expo-image-manipulator', () => ({ ImageManipulator: { manipulate: jest.fn() }, SaveFormat: { JPEG: 'jpeg' } }));
const mockSave = jest.fn();
const mockReleaseImage = jest.fn();
const mockReleaseContext = jest.fn();
const mockCrop = jest.fn();
const mockResize = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({ canceled: false,
    assets: [{ uri: 'file:///photo.heic', width: 1200, height: 800 }] });
  mockSave.mockResolvedValue({ base64: 'jpeg-data' });
  const context = { crop: mockCrop, resize: mockResize, release: mockReleaseContext,
    renderAsync: jest.fn().mockResolvedValue({ saveAsync: mockSave, release: mockReleaseImage }) };
  mockCrop.mockReturnValue(context);
  mockResize.mockReturnValue(context);
  (ImageManipulator.manipulate as jest.Mock).mockReturnValue(context);
});

test('canceling the picker does not process or save a photo', async () => {
  (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({ canceled: true });
  expect(await chooseProfilePhoto()).toBeNull();
  expect(ImageManipulator.manipulate).not.toHaveBeenCalled();
});

test('crops non-square images and normalizes uploads to a 512px JPEG', async () => {
  expect(await chooseProfilePhoto()).toBe('jpeg-data');
  expect(mockCrop).toHaveBeenCalledWith({ originX: 200, originY: 0, width: 800, height: 800 });
  expect(mockResize).toHaveBeenCalledWith({ width: 512, height: 512 });
  expect(mockSave).toHaveBeenCalledWith({ format: 'jpeg', compress: 0.8, base64: true });
  expect(mockReleaseImage).toHaveBeenCalled();
  expect(mockReleaseContext).toHaveBeenCalled();
});

test('reports unreadable photos and releases native resources', async () => {
  mockSave.mockResolvedValue({ base64: null });
  await expect(chooseProfilePhoto()).rejects.toThrow('choose another image');
  expect(mockReleaseImage).toHaveBeenCalled();
  expect(mockReleaseContext).toHaveBeenCalled();
});

test('picker failures do not trigger processing', async () => {
  (ImagePicker.launchImageLibraryAsync as jest.Mock).mockRejectedValue(new Error('Access denied'));
  await expect(chooseProfilePhoto()).rejects.toThrow('Access denied');
  expect(ImageManipulator.manipulate).not.toHaveBeenCalled();
});
