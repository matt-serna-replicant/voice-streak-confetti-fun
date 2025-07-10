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
      // Load files from both AI and human voice folders
      const [aiVoicesResult, humanVoicesResult] = await Promise.all([
        supabase.storage.from('voice-clips').list('AI voices'),
        supabase.storage.from('voice-clips').list('human voices')
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
          const fullPath = `AI voices/${file.name}`;
          const fileName = file.name.replace(/\.[^/.]+$/, ''); // Remove file extension
          
          // Get public URL for the audio file
          const { data: { publicUrl } } = supabase.storage
            .from('voice-clips')
            .getPublicUrl(fullPath);
          
          console.log('AI file loaded:', fileName, 'URL:', publicUrl);
          
          allClips.push({
            id: `ai-clip-${index}`,
            title: fileName,
            description: `AI voice sample`,
            is_ai: true,
            audio_url: publicUrl
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
          const fullPath = `human voices/${file.name}`;
          const fileName = file.name.replace(/\.[^/.]+$/, ''); // Remove file extension
          
          // Get public URL for the audio file
          const { data: { publicUrl } } = supabase.storage
            .from('voice-clips')
            .getPublicUrl(fullPath);
          
          console.log('Human file loaded:', fileName, 'URL:', publicUrl);
          
          allClips.push({
            id: `human-clip-${index}`,
            title: fileName,
            description: `Human voice sample`,
            is_ai: false,
            audio_url: publicUrl
          });
        });
      }
      
      console.log('Total clips loaded:', allClips.length);
      
      if (allClips.length > 0) {
        // Shuffle the clips for random order
        const shuffledClips = allClips.sort(() => Math.random() - 0.5);
        setVoiceClips(shuffledClips);
      } else {
        toast({
          title: "No audio files found",
          description: "Upload audio files to 'AI voices' and 'human voices' folders!",
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
  const totalClips = voiceClips.length || 10;

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
    if (!currentClip?.audio_url) {
      toast({
        title: "No Audio",
        description: "No audio file available for this clip",
        variant: "destructive",
      });
      return;
    }

    console.log('Attempting to play audio:', currentClip.audio_url);
    
    setIsPlaying(true);
    
    try {
      // Stop any currently playing audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current.removeEventListener('ended', () => {});
        audioRef.current.removeEventListener('error', () => {});
      }
      
      // Create new audio element
      const audio = new Audio();
      audioRef.current = audio;
      
      // Set up event listeners before setting src
      audio.addEventListener('ended', () => {
        setIsPlaying(false);
      });
      
      audio.addEventListener('error', (e) => {
        console.error('Audio error:', e);
        setIsPlaying(false);
        toast({
          title: "Audio Error",
          description: `Could not load audio file: ${audio.error?.message || 'Unknown error'}`,
          variant: "destructive",
        });
      });

      audio.addEventListener('loadstart', () => {
        console.log('Audio loading started for:', currentClip.audio_url);
      });

      audio.addEventListener('canplay', () => {
        console.log('Audio can start playing');
      });
      
      // Set audio properties
      audio.preload = 'auto';
      audio.crossOrigin = 'anonymous';
      audio.src = currentClip.audio_url;
      
      // Try to play the audio
      await audio.play();
      
      console.log('Audio playback started successfully');

      // Update replay count
      if (replaysUsed === 0) {
        // First play is free
      } else {
        setReplaysUsed(prev => prev + 1);
      }
      
    } catch (error) {
      console.error('Playback error:', error);
      setIsPlaying(false);
      
      // Provide more specific error messages
      let errorMessage = "Could not start audio playback";
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          errorMessage = "Audio blocked by browser. Please click to enable audio";
        } else if (error.name === 'NotSupportedError') {
          errorMessage = "Audio format not supported";
        } else if (error.name === 'AbortError') {
          errorMessage = "Audio playback was interrupted";
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
          <div className="flex items-center justify-center gap-2 mb-4">
            <Volume2 className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Guess the Voice
            </h1>
          </div>
          
          {/* Progress Bar */}
          <div className="mb-4">
            <Progress value={progress} className="h-2" />
            <p className="text-sm text-muted-foreground mt-2">
              Question {currentClipIndex + 1} of {totalClips}
            </p>
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
        <Card className="p-8 shadow-card mb-6">
          <div className="text-center">
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-2">Listen to this voice:</h2>
              <p className="text-muted-foreground">{currentClip?.description || 'Loading...'}</p>
            </div>

            {/* Audio Player */}
            <div className="mb-8">
              <Button
                onClick={playClip}
                disabled={isPlaying}
                size="lg"
                className="w-32 h-32 rounded-full bg-gradient-primary hover:scale-105 transition-transform shadow-game"
              >
                {isPlaying ? (
                  <Volume2 className="h-8 w-8 animate-pulse" />
                ) : (
                  <Play className="h-8 w-8" />
                )}
              </Button>
              
              <div className="mt-4 flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={playClip}
                  disabled={replaysUsed >= maxReplays || isPlaying}
                >
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Replay ({maxReplays - replaysUsed} left)
                </Button>
              </div>
            </div>

            {/* Guess Buttons */}
            <div className="flex gap-4 justify-center">
              <Button
                onClick={() => handleGuess(false)}
                size="lg"
                variant="outline"
                className={`game-button px-8 py-6 text-lg font-semibold border-2 hover:border-success hover:bg-success/10 ${
                  shakeButton === 'human' ? 'shake-animation border-destructive' : ''
                }`}
                disabled={isPlaying}
              >
                <User className="h-6 w-6 mr-2" />
                Human
                <span className="text-xs block text-muted-foreground">(Press H)</span>
              </Button>

              <Button
                onClick={() => handleGuess(true)}
                size="lg"
                variant="outline"
                className={`game-button px-8 py-6 text-lg font-semibold border-2 hover:border-primary hover:bg-primary/10 ${
                  shakeButton === 'ai' ? 'shake-animation border-destructive' : ''
                }`}
                disabled={isPlaying}
              >
                <Bot className="h-6 w-6 mr-2" />
                AI
                <span className="text-xs block text-muted-foreground">(Press A)</span>
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