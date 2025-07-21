import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Volume2, Play, User, Bot, Flame } from 'lucide-react';
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
  const [feedbackState, setFeedbackState] = useState<'correct' | 'incorrect' | null>(null);
  const [replaysUsed, setReplaysUsed] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userHasInteracted, setUserHasInteracted] = useState(false);
  const [scoreUpdated, setScoreUpdated] = useState(false);
  
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
          const fileName = file.name.replace(/\.[^/.]+$/, '');
          
          const { data: { publicUrl } } = supabase.storage
            .from('voice-clips')
            .getPublicUrl(fullPath);
          
          const cleanUrl = publicUrl;
          
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
          const fileName = file.name.replace(/\.[^/.]+$/, '');
          
          const { data: { publicUrl } } = supabase.storage
            .from('voice-clips')
            .getPublicUrl(fullPath);
          
          const cleanUrl = publicUrl;
          
          allClips.push({
            id: `human-clip-${index}`,
            title: fileName,
            description: `Human voice sample`,
            is_ai: false,
            audio_url: cleanUrl
          });
        });
      }
      
      if (allClips.length > 0) {
        const minClipsNeeded = 10;
        
        if (allClips.length < minClipsNeeded) {
          toast({
            title: "Not enough audio files",
            description: `Need at least ${minClipsNeeded} clips but only found ${allClips.length}. Upload more audio files!`,
            variant: "destructive",
          });
          return;
        }
        
        // Shuffle and select 10 unique clips
        const shuffledClips = allClips.sort(() => Math.random() - 0.5);
        const gameClips = shuffledClips.slice(0, 10);
        
        setVoiceClips(gameClips);
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
  const totalClips = 10;

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
        description: `No audio file available for this clip.`,
        variant: "destructive",
      });
      return;
    }

    setIsPlaying(true);
    
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio();
      }
      
      const audio = audioRef.current;
      
      audio.pause();
      audio.currentTime = 0;
      audio.src = '';
      audio.load();
      
      audio.preload = 'metadata';
      
      const playAudio = new Promise<void>((resolve, reject) => {
        const onCanPlay = () => {
          audio.removeEventListener('canplay', onCanPlay);
          audio.removeEventListener('error', onError);
          
          audio.play()
            .then(() => resolve())
            .catch(reject);
        };
        
        const onError = (e: Event) => {
          audio.removeEventListener('canplay', onCanPlay);
          audio.removeEventListener('error', onError);
          reject(new Error(`Failed to load audio: ${audio.error?.message || 'Unknown error'}`));
        };
        
        audio.addEventListener('canplay', onCanPlay, { once: true });
        audio.addEventListener('error', onError, { once: true });
        
        audio.src = currentClip.audio_url;
      });
      
      const onEnded = () => {
        setIsPlaying(false);
        audio.removeEventListener('ended', onEnded);
      };
      audio.addEventListener('ended', onEnded, { once: true });
      
      await playAudio;
      
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

  const handleGuess = (guessedAI: boolean) => {
    if (!currentClip) return;
    const isCorrect = guessedAI === currentClip.is_ai;
    
    if (isCorrect) {
      setScore(prev => {
        setScoreUpdated(true);
        setTimeout(() => setScoreUpdated(false), 300);
        return prev + 1;
      });
      setCurrentStreak(prev => {
        const newStreak = prev + 1;
        setLongestStreak(current => Math.max(current, newStreak));
        return newStreak;
      });
      setGameHistory(prev => [...prev, true]);
      setShowConfetti(true);
      setFeedbackState('correct');

      setTimeout(() => setShowConfetti(false), 1000);
      setTimeout(() => setFeedbackState(null), 400);
    } else {
      setCurrentStreak(0);
      setGameHistory(prev => [...prev, false]);
      setFeedbackState('incorrect');
      
      setTimeout(() => setFeedbackState(null), 400);
    }

    // Move to next clip or show results
    if (currentClipIndex + 1 >= totalClips) {
      setTimeout(() => setShowResults(true), 1500);
    } else {
      setTimeout(() => {
        setCurrentClipIndex(prev => prev + 1);
        setReplaysUsed(0);
        setTimeout(() => playClip(), 100);
      }, 1000);
    }
  };

  const resetGame = () => {
    setCurrentClipIndex(0);
    setScore(0);
    setCurrentStreak(0);
    setGameHistory([]);
    setReplaysUsed(0);
    setShowResults(false);
    setFeedbackState(null);
  };

  // Progress segments for the 10-segment indicator
  const progressSegments = Array.from({ length: totalClips }, (_, i) => i < currentClipIndex);

  return (
    <div className="min-h-screen bg-background">
      {/* 8-point grid container with generous spacing */}
      <div className="container mx-auto px-8 py-16 max-w-none">
        {/* Centered header area */}
        <header className="text-center mb-16">
          <h1 className="text-xl md:text-2xl lg:text-xl font-bold text-foreground mb-4 font-inter">
            Guess the Voice
          </h1>
          <div className="flex items-center justify-center gap-8">
            <div className="text-center">
              <div className={`text-lg font-semibold text-primary ${scoreUpdated ? 'score-update' : ''}`}>
                {score}
              </div>
              <div className="text-sm text-muted-foreground">Score</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-muted-foreground">
                {longestStreak}
              </div>
              <div className="text-sm text-muted-foreground">Best Streak</div>
            </div>
            {currentStreak > 0 && (
              <div className="flex items-center gap-1 px-3 py-1 bg-gradient-primary rounded-full text-white text-sm font-medium">
                <Flame className="h-3 w-3" />
                {currentStreak}
              </div>
            )}
          </div>
        </header>

        {/* Main game card - centered vertically and horizontally */}
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="w-full max-w-md">
            {/* Progress indicator */}
            <div className="mb-6">
              <div className="flex gap-1 mb-2">
                {progressSegments.map((filled, index) => (
                  <div
                    key={index}
                    className={`progress-segment flex-1 ${
                      filled ? 'progress-segment-filled' : ''
                    }`}
                  />
                ))}
              </div>
              <div className="text-2xs text-muted-foreground text-center">
                Question {currentClipIndex + 1} of {totalClips}
              </div>
            </div>

            {/* Game card with glass effect */}
            <div className="game-card p-8 slide-up-enter">
              {/* Large circular play button - centered */}
              <div className="flex justify-center mb-8">
                <button
                  onClick={playClip}
                  disabled={isPlaying || loading || !currentClip}
                  className="play-button flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Play voice clip"
                >
                  {isPlaying ? (
                    <Volume2 className="h-6 w-6 animate-pulse" />
                  ) : (
                    <Play className="h-6 w-6 ml-1" />
                  )}
                </button>
              </div>

              {/* Answer buttons - stacked vertically with full width */}
              <div className="space-y-4">
                <button
                  onClick={() => handleGuess(false)}
                  disabled={isPlaying}
                  className={`answer-button w-full flex items-center justify-center gap-3 text-base font-medium disabled:opacity-50 disabled:cursor-not-allowed ${
                    feedbackState === 'incorrect' && !currentClip?.is_ai ? 'answer-button-incorrect' : 
                    feedbackState === 'correct' && !currentClip?.is_ai ? 'answer-button-correct' : ''
                  }`}
                  aria-label="Guess Human (Press H)"
                >
                  <User className="h-5 w-5" strokeWidth={1.5} />
                  <div className="flex flex-col items-start">
                    <span>Human</span>
                    <span className="text-xs text-muted-foreground font-normal">Press H</span>
                  </div>
                </button>

                <button
                  onClick={() => handleGuess(true)}
                  disabled={isPlaying}
                  className={`answer-button w-full flex items-center justify-center gap-3 text-base font-medium disabled:opacity-50 disabled:cursor-not-allowed ${
                    feedbackState === 'incorrect' && currentClip?.is_ai ? 'answer-button-incorrect' : 
                    feedbackState === 'correct' && currentClip?.is_ai ? 'answer-button-correct' : ''
                  }`}
                  aria-label="Guess AI (Press A)"
                >
                  <Bot className="h-5 w-5" strokeWidth={1.5} />
                  <div className="flex flex-col items-start">
                    <span>AI</span>
                    <span className="text-xs text-muted-foreground font-normal">Press A</span>
                  </div>
                </button>
              </div>

              {/* Replay counter */}
              {replaysUsed > 0 && (
                <div className="text-2xs text-muted-foreground text-center mt-6">
                  Replays used: {replaysUsed}/{maxReplays}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="text-center text-muted-foreground">
            Loading voice clips...
          </div>
        )}
      </div>

      {/* Confetti effect */}
      {showConfetti && <Confetti />}

      {/* Results modal */}
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