import { FFmpegKit, ReturnCode } from 'ffmpeg-kit-react-native';

export const VideoEngine = {
  // Trim a clip on mobile
  trim: async (inputPath, startSec, durationSec, outputPath) => {
    const cmd = `-ss ${startSec} -t ${durationSec} -i "${inputPath}" -c:v mpeg4 -c:a aac -strict experimental "${outputPath}"`;
    const session = await FFmpegKit.execute(cmd);
    const returnCode = await session.getReturnCode();
    return ReturnCode.isSuccess(returnCode);
  },

  // Export video in 480p, 720p, 1080p formats
  exportVideo: async (inputPath, resolution, outputPath) => {
    let scaleFilter = '';
    switch (resolution) {
      case '480p':
        scaleFilter = 'scale=854:480';
        break;
      case '720p':
        scaleFilter = 'scale=1280:720';
        break;
      case '1080p':
      default:
        scaleFilter = 'scale=1920:1080';
    }

    const cmd = `-i "${inputPath}" -vf "${scaleFilter}" -c:v libx264 -preset ultrafast -c:a aac "${outputPath}"`;
    const session = await FFmpegKit.execute(cmd);
    const returnCode = await session.getReturnCode();
    return ReturnCode.isSuccess(returnCode);
  },

  // Adjust video speed
  changeSpeed: async (inputPath, speedMultiplier, outputPath) => {
    // video speed filter 'setpts' + audio speed filter 'atempo'
    const videoScale = 1 / speedMultiplier;
    const cmd = `-i "${inputPath}" -filter_complex "[0:v]setpts=${videoScale}*PTS[v];[0:a]atempo=${speedMultiplier}[a]" -map "[v]" -map "[a]" "${outputPath}"`;
    const session = await FFmpegKit.execute(cmd);
    const returnCode = await session.getReturnCode();
    return ReturnCode.isSuccess(returnCode);
  }
};
