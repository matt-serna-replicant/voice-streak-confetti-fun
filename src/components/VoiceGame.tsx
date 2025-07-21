import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Volume2, Play, RotateCcw, User, Bot, Flame } from 'lucide-react';
import { Confetti } from './Confetti';
import { ResultsModal } from './ResultsModal';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface VoiceClip {
  id: string;
  title: string;
  description: string;
  is_ai: boolean;
  audio_url: string;
}

export function VoiceGame() {
  const [voiceClips, setVoiceClips] = useState<VoiceClip[]>([]);
  const [currentClipIndex, setCurrentClipIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [gameHistory, setGameHistory] = useState<boolean[]>([]);
  const [showConfetti, setShowConfetti] = useState(false);
  const [shakeButton, setShakeButton] = useState<'human' | 'ai' | null>(null);
  const [replaysUsed, setReplaysUsed] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userHasInteracted, setUserHasInteracted] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();

  // Track user interaction for audio playback
  useEffect(() => {
    const handleUserInteraction = () => {
      setUserHasInteracted(true);
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
    };

    document.addEventListener('click', handleUserInteraction);
    document.addEventListener('keydown', handleUserInteraction);

    return () => {
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
    };
  }, []);

  // Load voice clips from Supabase storage
  useEffect(() => {
    loadVoiceClips();
  }, []);

  const loadVoiceClips = async () => {
    try {
      // Load files from both AI and human voice folders (updated folder names)
      const [aiVoicesResult, humanVoicesResult] = await Promise.all([
        supabase.storage.from('voice-clips').list('AI-voices'),
        supabase.storage.from('voice-clips').list('human-voices')
      ]);

      if (aiVoicesResult.error) throw aiVoicesResult.error;
      if (humanVoicesResult.error) throw humanVoicesResult.error;
      
      const allClips: VoiceClip[] = [];
      
      // Process AI voice files
      if (aiVoicesResult.data) {
        const aiAudioFiles = aiVoicesResult.data.filter(file => {
          const fileName = file.name.toLowerCase();
          const supportedFormats = ['.mp3', '.wav', '.m4a', '.ogg', '.webm', '.aac'];
          return file.name.includes('.') && 
                 supportedFormats.some(format => fileName.endsWith(format));
        });
        
        aiAudioFiles.forEach((file, index) => {
          const fullPath = `AI-voices/${file.name}`;
          const fileName = file.name.replace(/\.[^/.]+$/, ''); // Remove file extension
          
          // Get public URL for the audio file with proper encoding
          const { data: { publicUrl } } = supabase.storage
            .from('voice-clips')
            .getPublicUrl(fullPath);
          
          // Keep the properly encoded URL from Supabase
          const cleanUrl = publicUrl;
          
          console.log('AI file loaded:', fileName, 'URL:', cleanUrl);
          
          allClips.push({
            id: `ai-clip-${index}`,
            title: fileName,
            description: `AI voice sample`,
            is_ai: true,
            audio_url: cleanUrl
          });
        });
      }
      
      // Process human voice files
      if (humanVoicesResult.data) {
        const humanAudioFiles = humanVoicesResult.data.filter(file => {
          const fileName = file.name.toLowerCase();
          const supportedFormats = ['.mp3', '.wav', '.m4a', '.ogg', '.webm', '.aac'];
          return file.name.includes('.') && 
                 supportedFormats.some(format => fileName.endsWith(format));
        });
        
        humanAudioFiles.forEach((file, index) => {
          const fullPath = `human-voices/${file.name}`;
          const fileName = file.name.replace(/\.[^/.]+$/, ''); // Remove file extension
          
          // Get public URL for the audio file with proper encoding
          const { data: { publicUrl } } = supabase.storage
            .from('voice-clips')
            .getPublicUrl(fullPath);
          
          // Keep the properly encoded URL from Supabase  
          const cleanUrl = publicUrl;
          
          console.log('Human file loaded:', fileName, 'URL:', cleanUrl);
          
          allClips.push({
            id: `human-clip-${index}`,
            title: fileName,
            description: `Human voice sample`,
            is_ai: false,
            audio_url: cleanUrl
          });
        });
      }
      
      console.log('Total clips loaded:', allClips.length);
      
      if (allClips.length > 0) {
        // Ensure we have enough clips for a full game
        const minClipsNeeded = 10;
        
        if (allClips.length < minClipsNeeded) {
          toast({
            title: "Not enough audio files",
            description: `Need at least ${minClipsNeeded} clips but only found ${allClips.length}. Upload more audio files!`,
            variant: "destructive",
          });
          return;
        }
        
        // Shuffle all clips and take exactly 10 unique clips for the game
        const shuffledClips = allClips.sort(() => Math.random() - 0.5);
        const gameClips = shuffledClips.slice(0, 10);
        
        // Verify all clips are unique (additional safety check)
        const uniqueIds = new Set(gameClips.map(clip => clip.id));
        if (uniqueIds.size !== gameClips.length) {
          console.error('Duplicate clips detected, reshuffling...');
          // Reshuffle if duplicates somehow exist
          const reshuffled = allClips.sort(() => Math.random() - 0.5);
          const uniqueGameClips = reshuffled.slice(0, 10);
          setVoiceClips(uniqueGameClips);
          console.log(`Game set with ${uniqueGameClips.length} unique clips out of ${allClips.length} total clips`);
        } else {
          setVoiceClips(gameClips);
          console.log(`Game set with ${gameClips.length} unique clips out of ${allClips.length} total clips`);
        }
        
        console.log('First clip:', gameClips[0]);
      } else {
        toast({
          title: "No audio files found",
          description: "Upload audio files to 'AI-voices' and 'human-voices' folders!",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error loading voice clips:', error);
      toast({
        title: "Error loading clips",
        description: "Check your storage setup",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const currentClip = voiceClips[currentClipIndex];
  const maxReplays = 3;
  const totalClips = 10; // Fixed to 10 questions per game

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      
      if (key === 'h') {
        handleGuess(false);
      } else if (key === 'a') {
        handleGuess(true);
      } else if (key === 'r' && replaysUsed < maxReplays) {
        playClip();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentClipIndex, replaysUsed]);

  const playClip = async () => {
    console.log('playClip called. currentClipIndex:', currentClipIndex);
    console.log('voiceClips length:', voiceClips.length);
    console.log('currentClip:', currentClip);
    console.log('currentClip?.audio_url:', currentClip?.audio_url);
    
    if (!currentClip?.audio_url) {
      toast({
        title: "No Audio",
        description: `No audio file available for this clip. Debug: clipIndex=${currentClipIndex}, totalClips=${voiceClips.length}`,
        variant: "destructive",
      });
      return;
    }

    console.log('Attempting to play audio:', currentClip.audio_url);
    
    setIsPlaying(true);
    
    try {
      // Create or reuse audio element
      if (!audioRef.current) {
        audioRef.current = new Audio();
      }
      
      const audio = audioRef.current;
      
      // Complete cleanup and reset
      audio.pause();
      audio.currentTime = 0;
      audio.src = '';
      audio.load(); // This clears the audio element completely
      
      // Set up the audio for the new clip
      audio.preload = 'metadata'; // Use metadata instead of auto for better performance
      // Remove crossOrigin - let Supabase handle CORS naturally
      
      // Create a promise to handle audio loading and playing
      const playAudio = new Promise<void>((resolve, reject) => {
        const onCanPlay = () => {
          console.log('Audio can play, starting playback');
          audio.removeEventListener('canplay', onCanPlay);
          audio.removeEventListener('error', onError);
          
          audio.play()
            .then(() => {
              console.log('Audio playback started successfully');
              resolve();
            })
            .catch(reject);
        };
        
        const onError = (e: Event) => {
          console.error('Audio loading error:', e);
          console.error('Audio error details:', audio.error);
          console.error('Audio src that failed:', audio.src);
          audio.removeEventListener('canplay', onCanPlay);
          audio.removeEventListener('error', onError);
          reject(new Error(`Failed to load audio: ${audio.error?.message || 'Unknown error'}`));
        };
        
        audio.addEventListener('canplay', onCanPlay, { once: true });
        audio.addEventListener('error', onError, { once: true });
        
        // Set source and start loading
        audio.src = currentClip.audio_url;
      });
      
      // Set up the ended event listener
      const onEnded = () => {
        console.log('Audio playback ended');
        setIsPlaying(false);
        audio.removeEventListener('ended', onEnded);
      };
      audio.addEventListener('ended', onEnded, { once: true });
      
      // Wait for audio to be ready and play
      await playAudio;
      
      // Update replay count
      if (replaysUsed === 0) {
        // First play is free
      } else {
        setReplaysUsed(prev => prev + 1);
      }
      
    } catch (error) {
      console.error('Playback error:', error);
      setIsPlaying(false);
      
      let errorMessage = "Could not play audio";
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          errorMessage = "Please click anywhere on the page first to enable audio";
        } else if (error.message.includes('Failed to load')) {
          errorMessage = "Audio file could not be loaded. Try refreshing the page.";
        } else {
          errorMessage = `Playback failed: ${error.message}`;
        }
      }
      
      toast({
        title: "Playback Error", 
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const playSound = (type: 'success' | 'error') => {
    // In a real app, you'd play actual audio files
    const audio = new Audio();
    
    if (type === 'success') {
      // Success sound frequency
      console.log('🔊 Success sound');
    } else {
      // Error sound frequency  
      console.log('🔊 Error sound');
    }
  };

  const handleGuess = (guessedAI: boolean) => {
    if (!currentClip) return;
    const isCorrect = guessedAI === currentClip.is_ai;
    
    if (isCorrect) {
      // Correct guess
      setScore(prev => prev + 1);
      setCurrentStreak(prev => {
        const newStreak = prev + 1;
        setLongestStreak(current => Math.max(current, newStreak));
        return newStreak;
      });
      setGameHistory(prev => [...prev, true]);
      setShowConfetti(true);
      playSound('success');
      
      toast({
        title: "Correct! 🎉",
        description: `${currentClip.is_ai ? 'AI' : 'Human'} voice detected`,
      });

      setTimeout(() => setShowConfetti(false), 1000);
    } else {
      // Wrong guess
      setCurrentStreak(0);
      setGameHistory(prev => [...prev, false]);
      setShakeButton(guessedAI ? 'ai' : 'human');
      playSound('error');
      
      toast({
        title: "Incorrect",
        description: `That was a ${currentClip.is_ai ? 'AI' : 'Human'} voice`,
        variant: "destructive",
      });

      setTimeout(() => setShakeButton(null), 300);
    }

    // Move to next clip or show results
    if (currentClipIndex + 1 >= totalClips) {
      setTimeout(() => setShowResults(true), 1500);
    } else {
      setTimeout(() => {
        setCurrentClipIndex(prev => prev + 1);
        setReplaysUsed(0);
      }, 1500);
    }
  };

  const resetGame = () => {
    setCurrentClipIndex(0);
    setScore(0);
    setCurrentStreak(0);
    setGameHistory([]);
    setReplaysUsed(0);
    setShowResults(false);
  };

  const progress = ((currentClipIndex) / totalClips) * 100;

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mb-4">
            <h1 className="text-4xl font-semibold font-inter text-foreground">
              Guess the Voice
            </h1>
          </div>

          {/* Score & Streak */}
          <div className="flex items-center justify-center gap-6 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{score}</div>
              <div className="text-sm text-muted-foreground">Score</div>
            </div>
            
            {currentStreak > 0 && (
              <Badge className="streak-badge text-lg px-3 py-1">
                <Flame className="h-4 w-4 mr-1" />
                {currentStreak}
              </Badge>
            )}
            
            <div className="text-center">
              <div className="text-2xl font-bold text-accent">{longestStreak}</div>
              <div className="text-sm text-muted-foreground">Best Streak</div>
            </div>
          </div>
        </div>

        {/* Game Area */}
        <Card className="p-6 shadow-card mb-6">
          {/* Question Counter Badge */}
          <div className="flex justify-end mb-4">
            <Badge variant="outline" className="text-sm px-3 py-1">
              Question {currentClipIndex + 1} of {totalClips}
            </Badge>
          </div>

          {/* Main Game Grid */}
          <div className="grid grid-cols-2 gap-8 items-center">
            {/* Left Side - Play Button */}
            <div className="flex flex-col items-center justify-center">
              <Button
                onClick={playClip}
                disabled={isPlaying || loading || !currentClip}
                size="lg"
                className="w-20 h-20 rounded-full bg-gradient-primary hover:scale-105 transition-transform shadow-game"
              >
                {isPlaying ? (
                  <Volume2 className="h-6 w-6 animate-pulse" />
                ) : (
                  <Play className="h-6 w-6" />
                )}
              </Button>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Click to play
              </p>
            </div>

            {/* Right Side - Choice Buttons */}
            <div className="flex flex-col gap-3">
              <Button
                onClick={() => handleGuess(false)}
                size="lg"
                variant="outline"
                className={`w-full h-16 text-base font-semibold border-2 hover:bg-accent hover:text-accent-foreground flex items-center justify-center gap-2 ${
                  shakeButton === 'human' ? 'shake-animation border-destructive' : ''
                }`}
                disabled={isPlaying}
              >
                <User className="h-5 w-5" />
                <div className="flex flex-col items-start">
                  <span>Human</span>
                  <span className="text-xs text-muted-foreground font-normal">Press H</span>
                </div>
              </Button>

              <Button
                onClick={() => handleGuess(true)}
                size="lg"
                variant="outline"
                className={`w-full h-16 text-base font-semibold border-2 hover:bg-accent hover:text-accent-foreground flex items-center justify-center gap-2 ${
                  shakeButton === 'ai' ? 'shake-animation border-destructive' : ''
                }`}
                disabled={isPlaying}
              >
                <Bot className="h-5 w-5" />
                <div className="flex flex-col items-start">
                  <span>AI</span>
                  <span className="text-xs text-muted-foreground font-normal">Press A</span>
                </div>
              </Button>
            </div>
          </div>
        </Card>

        {/* Game History */}
        {gameHistory.length > 0 && (
          <div className="text-center">
            <div className="flex justify-center gap-1 flex-wrap">
              {gameHistory.map((correct, index) => (
                <div
                  key={index}
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    correct 
                      ? 'bg-success text-success-foreground' 
                      : 'bg-destructive text-destructive-foreground'
                  }`}
                >
                  {correct ? '✓' : '✗'}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Confetti Effect */}
      {showConfetti && <Confetti />}

      {/* Results Modal */}
      <ResultsModal
        isOpen={showResults}
        onClose={() => setShowResults(false)}
        score={score}
        totalClips={totalClips}
        longestStreak={longestStreak}
        gameHistory={gameHistory}
        onPlayAgain={resetGame}
      />
    </div>
  );
}
