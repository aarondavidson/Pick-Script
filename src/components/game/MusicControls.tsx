import { useMusic } from "@/contexts/MusicContext";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Volume2, VolumeX, Play, Pause } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export const MusicControls = () => {
  const {
    isPlaying,
    isMuted,
    volume,
    sfxVolume,
    togglePlay,
    toggleMute,
    setVolume,
    setSfxVolume,
  } = useMusic();

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="icon"
        className="pixel-font min-h-[44px] min-w-[44px]"
        onClick={togglePlay}
        title={isPlaying ? "Pause music" : "Play music"}
      >
        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
      </Button>

      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="pixel-font min-h-[44px] min-w-[44px]"
            title="Audio levels"
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 bg-game-ui border-2 border-game-border">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs pixel-font text-muted-foreground">Mute all</p>
              <Button
                variant="outline"
                size="sm"
                className="pixel-font text-xs h-8"
                onClick={toggleMute}
              >
                {isMuted ? "Unmute" : "Mute"}
              </Button>
            </div>
            <div className="space-y-2">
              <p className="text-xs pixel-font text-muted-foreground">Music</p>
              <Slider
                value={[volume * 100]}
                onValueChange={(value) => setVolume(value[0] / 100)}
                max={100}
                step={1}
                className="w-full"
                disabled={isMuted}
              />
            </div>
            <div className="space-y-2">
              <p className="text-xs pixel-font text-muted-foreground">Sound effects</p>
              <Slider
                value={[sfxVolume * 100]}
                onValueChange={(value) => setSfxVolume(value[0] / 100)}
                max={100}
                step={1}
                className="w-full"
                disabled={isMuted}
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};
