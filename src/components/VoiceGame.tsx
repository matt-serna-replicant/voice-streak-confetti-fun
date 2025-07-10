import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Volume2, Play, RotateCcw, User, Bot, Flame } from 'lucide-react';
import { Confetti } from './Confetti';
import { ResultsModal } from './ResultsModal';
import { useToast } from '@/hooks/use-toast';

interface VoiceClip {
  id: string;
  url: string;
  isAI: boolean;
  description: string;
}

// Mock voice clips for demo
const mockClips: VoiceClip[] = [
  { id: '1', url: '#', isAI: false, description: 'Professional narrator' },
  { id: '2', url: '#', isAI: true, description: 'AI-generated voice' },
  { id: '3', url: '#', isAI: false, description: 'Podcast host' },
  { id: '4', url: '#', isAI: true, description: 'Synthetic speech' },
  { id: '5', url: '#', isAI: false, description: 'Voice actor' },
  { id: '6', url: '#', isAI: true, description: 'Text-to-speech' },
  { id: '7', url: '#', isAI: false, description: 'Radio presenter' },
  { id: '8', url: '#', isAI: true, description: 'AI clone voice' },
  { id: '9', url: '#', isAI: false, description: 'Audiobook reader' },
  { id: '10', url: '#', isAI: true, description: 'Generated audio' },
];

export function VoiceGame() {
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
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();

  const currentClip = mockClips[currentClipIndex];
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

  const playClip = () => {
    setIsPlaying(true);
    
    // Simulate audio playback for demo
    setTimeout(() => {
      setIsPlaying(false);
    }, 2000);

    if (replaysUsed === 0) {
      // First play is free
    } else {
      setReplaysUsed(prev => prev + 1);
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
    const isCorrect = guessedAI === currentClip.isAI;
    
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
        description: `${currentClip.isAI ? 'AI' : 'Human'} voice detected`,
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
        description: `That was a ${currentClip.isAI ? 'AI' : 'Human'} voice`,
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
              <p className="text-muted-foreground">{currentClip.description}</p>
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