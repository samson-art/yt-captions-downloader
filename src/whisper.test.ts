import { getWhisperConfig, transcribeWithWhisper } from './whisper.js';
import * as youtube from './youtube.js';

const originalEnv = process.env;

beforeEach(() => {
  jest.restoreAllMocks();
  process.env = { ...originalEnv };
});

afterAll(() => {
  process.env = originalEnv;
});

describe('getWhisperConfig', () => {
  it('should return mode off when WHISPER_MODE is unset', () => {
    delete process.env.WHISPER_MODE;
    expect(getWhisperConfig().mode).toBe('off');
  });

  it('should return mode off when WHISPER_MODE is invalid', () => {
    process.env.WHISPER_MODE = 'invalid';
    expect(getWhisperConfig().mode).toBe('off');
  });

  it('should return mode local when WHISPER_MODE=local', () => {
    process.env.WHISPER_MODE = 'local';
    process.env.WHISPER_BASE_URL = 'http://whisper:9000';
    const config = getWhisperConfig();
    expect(config.mode).toBe('local');
    expect(config.baseUrl).toBe('http://whisper:9000');
  });

  it('should return mode api when WHISPER_MODE=api', () => {
    process.env.WHISPER_MODE = 'api';
    process.env.WHISPER_API_KEY = 'sk-test';
    const config = getWhisperConfig();
    expect(config.mode).toBe('api');
    expect(config.apiKey).toBe('sk-test');
  });

  it('should use default timeout when WHISPER_TIMEOUT unset', () => {
    expect(getWhisperConfig().timeout).toBe(120_000);
  });

  it('should use WHISPER_TIMEOUT when set', () => {
    process.env.WHISPER_TIMEOUT = '60000';
    expect(getWhisperConfig().timeout).toBe(60_000);
  });

  it('should use default API base URL when unset', () => {
    expect(getWhisperConfig().apiBaseUrl).toBe('https://api.openai.com/v1');
  });

  it('should strip trailing slash from API base URL', () => {
    process.env.WHISPER_API_BASE_URL = 'https://custom.example.com/v1/';
    expect(getWhisperConfig().apiBaseUrl).toBe('https://custom.example.com/v1');
  });
});

describe('transcribeWithWhisper', () => {
  it('should return null when mode is off', async () => {
    process.env.WHISPER_MODE = 'off';
    const downloadSpy = jest.spyOn(youtube, 'downloadAudio').mockResolvedValue('/tmp/audio.m4a');
    const result = await transcribeWithWhisper('video123', 'en', 'srt');
    expect(result).toBeNull();
    expect(downloadSpy).not.toHaveBeenCalled();
  });

  it('should return null when downloadAudio fails', async () => {
    process.env.WHISPER_MODE = 'local';
    process.env.WHISPER_BASE_URL = 'http://whisper:9000';
    jest.spyOn(youtube, 'downloadAudio').mockResolvedValue(null);
    const result = await transcribeWithWhisper('video123', 'en', 'srt');
    expect(result).toBeNull();
  });
});
