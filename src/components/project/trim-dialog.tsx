"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogBody,
} from "@/components/ui/dialog";
import {
  Play,
  Pause,
  Flag,
  Scissors,
  RotateCcw,
  Loader2,
} from "lucide-react";

interface TrimDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  videoUrl: string;
  sceneIndex: number;
  onConfirm: (startTime: number, endTime: number) => Promise<void>;
}

// 播放速度选项
const SPEED_OPTIONS = [
  { value: "0.1", label: "0.1x" },
  { value: "0.25", label: "0.25x" },
  { value: "0.5", label: "0.5x" },
  { value: "1", label: "1x" },
];

// 格式化时间显示
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${ms.toString().padStart(2, "0")}`;
}

export function TrimDialog({
  open,
  onOpenChange,
  videoUrl,
  sceneIndex,
  onConfirm,
}: TrimDialogProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState("1");
  const [startTime, setStartTime] = useState<number | null>(null);
  const [endTime, setEndTime] = useState<number | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const progressRef = useRef<HTMLDivElement>(null);

  // 重置状态
  useEffect(() => {
    if (open) {
      setStartTime(null);
      setEndTime(null);
      setCurrentTime(0);
      setIsPlaying(false);
      setIsPreviewing(false);
      setPlaybackSpeed("1");
    }
  }, [open]);

  // 更新播放速度
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = parseFloat(playbackSpeed);
    }
  }, [playbackSpeed]);

  // 快捷键处理
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // 避免在输入框中触发
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key) {
        case " ":
          e.preventDefault();
          if (videoRef.current) {
            if (videoRef.current.paused) {
              videoRef.current.play();
              setIsPlaying(true);
            } else {
              videoRef.current.pause();
              setIsPlaying(false);
            }
          }
          break;
        case "ArrowLeft":
          e.preventDefault();
          if (videoRef.current) {
            const newTime = Math.max(0, videoRef.current.currentTime - 0.1);
            videoRef.current.currentTime = newTime;
            setCurrentTime(newTime);
          }
          break;
        case "ArrowRight":
          e.preventDefault();
          if (videoRef.current) {
            const newTime = Math.min(duration, videoRef.current.currentTime + 0.1);
            videoRef.current.currentTime = newTime;
            setCurrentTime(newTime);
          }
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, duration]);

  // 监听视频时间更新
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);

      // 预览模式下，到达终点时暂停
      if (isPreviewing && endTime !== null && videoRef.current.currentTime >= endTime) {
        videoRef.current.pause();
        setIsPlaying(false);
        setIsPreviewing(false);
      }
    }
  };

  // 视频加载完成
  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  // 播放/暂停
  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  // 标记起点
  const markStart = () => {
    setStartTime(currentTime);
    // 如果起点大于终点，清除终点
    if (endTime !== null && currentTime >= endTime) {
      setEndTime(null);
    }
  };

  // 标记终点
  const markEnd = () => {
    // 终点必须大于起点
    if (startTime !== null && currentTime <= startTime) {
      alert("终点必须在起点之后");
      return;
    }
    setEndTime(currentTime);
  };

  // 预览片段
  const previewClip = () => {
    if (startTime === null || endTime === null || !videoRef.current) return;

    videoRef.current.currentTime = startTime;
    videoRef.current.play();
    setIsPlaying(true);
    setIsPreviewing(true);
  };

  // 重置标记
  const resetMarks = () => {
    setStartTime(null);
    setEndTime(null);
    setIsPreviewing(false);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  // 确认裁剪
  const handleConfirm = async () => {
    if (startTime === null || endTime === null) return;

    setIsSubmitting(true);
    try {
      await onConfirm(startTime, endTime);
      onOpenChange(false);
    } catch (error) {
      console.error("裁剪失败:", error);
      alert(error instanceof Error ? error.message : "裁剪失败");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 计算进度条位置对应的时间
  const calculateTimeFromPosition = (clientX: number): number => {
    if (!progressRef.current || duration === 0) return 0;

    const rect = progressRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percent = x / rect.width;
    return percent * duration;
  };

  // 更新视频时间
  const seekTo = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  // 进度条鼠标按下
  const handleProgressMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);

    // 暂停视频
    if (videoRef.current && isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    }

    // 跳转到点击位置
    const newTime = calculateTimeFromPosition(e.clientX);
    seekTo(newTime);
  };

  // 进度条拖动
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newTime = calculateTimeFromPosition(e.clientX);
      seekTo(newTime);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, duration]);

  const canPreview = startTime !== null && endTime !== null;
  const canConfirm = canPreview && !isSubmitting;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scissors className="h-5 w-5" />
            裁剪场景 #{sceneIndex + 1} 视频
          </DialogTitle>
        </DialogHeader>

        <DialogBody className="space-y-4">
          {/* 视频播放器 */}
          <div className="relative bg-black rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              src={videoUrl}
              className="w-full aspect-video"
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onEnded={() => setIsPlaying(false)}
              onClick={togglePlay}
            />

            {/* 播放/暂停遮罩 */}
            {!isPlaying && (
              <div
                className="absolute inset-0 flex items-center justify-center bg-black/20 cursor-pointer"
                onClick={togglePlay}
              >
                <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center">
                  <Play className="h-8 w-8 text-black ml-1" />
                </div>
              </div>
            )}
          </div>

          {/* 进度条 */}
          <div
            ref={progressRef}
            className={`relative h-6 bg-muted rounded cursor-pointer select-none ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
            onMouseDown={handleProgressMouseDown}
          >
            {/* 已播放区域 */}
            <div
              className="absolute h-full bg-primary/30 rounded-l pointer-events-none"
              style={{ width: `${(currentTime / duration) * 100}%` }}
            />

            {/* 选中区域 */}
            {startTime !== null && endTime !== null && (
              <div
                className="absolute h-full bg-green-500/40 pointer-events-none"
                style={{
                  left: `${(startTime / duration) * 100}%`,
                  width: `${((endTime - startTime) / duration) * 100}%`,
                }}
              />
            )}

            {/* 起点标记 */}
            {startTime !== null && (
              <div
                className="absolute top-0 bottom-0 w-1 bg-green-500 pointer-events-none"
                style={{ left: `${(startTime / duration) * 100}%` }}
              >
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 text-[10px] text-green-600 font-medium whitespace-nowrap">
                  起点
                </div>
              </div>
            )}

            {/* 终点标记 */}
            {endTime !== null && (
              <div
                className="absolute top-0 bottom-0 w-1 bg-red-500 pointer-events-none"
                style={{ left: `${(endTime / duration) * 100}%` }}
              >
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 text-[10px] text-red-600 font-medium whitespace-nowrap">
                  终点
                </div>
              </div>
            )}

            {/* 当前位置指示器 */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-primary pointer-events-none"
              style={{ left: `${(currentTime / duration) * 100}%` }}
            />
          </div>

          {/* 控制区域 */}
          <div className="flex items-center justify-between">
            {/* 左侧：时间显示 */}
            <div className="flex items-center gap-4">
              <div className="text-sm font-mono">
                <span className="text-foreground">{formatTime(currentTime)}</span>
                <span className="text-muted-foreground"> / {formatTime(duration)}</span>
              </div>

              {/* 倍速选择 */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">倍速:</span>
                <Select
                  value={playbackSpeed}
                  onChange={(e) => setPlaybackSpeed(e.target.value)}
                  options={SPEED_OPTIONS}
                  className="w-20 h-8 text-xs"
                />
              </div>
            </div>

            {/* 右侧：播放控制 */}
            <Button size="sm" variant="outline" onClick={togglePlay}>
              {isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* 标记按钮 */}
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={markStart}
            >
              <Flag className="h-4 w-4 mr-2 text-green-500" />
              标记起点
              {startTime !== null && (
                <span className="ml-2 text-green-600 font-mono text-xs">
                  {formatTime(startTime)}
                </span>
              )}
            </Button>

            <Button
              variant="outline"
              className="flex-1"
              onClick={markEnd}
              disabled={startTime === null}
            >
              <Flag className="h-4 w-4 mr-2 text-red-500" />
              标记终点
              {endTime !== null && (
                <span className="ml-2 text-red-600 font-mono text-xs">
                  {formatTime(endTime)}
                </span>
              )}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={resetMarks}
              title="重置标记"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>

          {/* 选中片段信息 */}
          {canPreview && (
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="text-sm">
                <span className="text-muted-foreground">选中片段: </span>
                <span className="font-mono">{formatTime(startTime!)}</span>
                <span className="text-muted-foreground"> - </span>
                <span className="font-mono">{formatTime(endTime!)}</span>
                <span className="text-muted-foreground ml-2">
                  (时长: {formatTime(endTime! - startTime!)})
                </span>
              </div>
              <Button size="sm" variant="secondary" onClick={previewClip}>
                <Play className="h-3 w-3 mr-1" />
                预览片段
              </Button>
            </div>
          )}
        </DialogBody>

        <DialogFooter className="flex-col gap-3 sm:flex-col">
          <div className="w-full text-center text-xs text-muted-foreground">
            快捷键：空格 播放/暂停 | ← → 微调0.1秒
          </div>
          <div className="flex justify-end gap-2 w-full">
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              取消
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!canConfirm}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  裁剪中...
                </>
              ) : (
                <>
                  <Scissors className="h-4 w-4 mr-2" />
                  确认裁剪
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
