import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Share2, RotateCcw, Flame, Trophy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  score: number;
  totalClips: number;
  longestStreak: number;
  gameHistory: boolean[];
  onPlayAgain: () => void;
}

export function ResultsModal({
  isOpen,
  onClose,
  score,
  totalClips,
  longestStreak,
  gameHistory,
  onPlayAgain,
}: ResultsModalProps) {
  const { toast } = useToast();
  
  const percentage = Math.round((score / totalClips) * 100);
  
  const getPerformanceEmoji = () => {
    if (percentage >= 90) return '🎯';
    if (percentage >= 80) return '🔥';
    if (percentage >= 70) return '👏';
    if (percentage >= 60) return '👍';
    if (percentage >= 50) return '😊';
    return '🤔';
  };

  const getPerformanceMessage = () => {
    if (percentage >= 90) return 'AI Detection Expert!';
    if (percentage >= 80) return 'Excellent ear for voices!';
    if (percentage >= 70) return 'Great voice detection!';
    if (percentage >= 60) return 'Good job identifying voices!';
    if (percentage >= 50) return 'Not bad! Practice makes perfect.';
    return 'Keep practicing to improve!';
  };

  const generateShareText = () => {
    const emojiGrid = gameHistory.map(correct => correct ? '✅' : '❌').join('');
    const shareText = `🗣️ Guess the Voice Results\n${emojiGrid}\n${score}/${totalClips} correct | 🔥${longestStreak}-streak\n\nCan you beat my score? Try it yourself!`;
    return shareText;
  };

  const handleShare = async () => {
    const shareText = generateShareText();
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Guess the Voice Results',
          text: shareText,
        });
      } catch (err) {
        // Fall back to clipboard
        await navigator.clipboard.writeText(shareText);
        toast({
          title: "Copied to clipboard!",
          description: "Share your results with friends",
        });
      }
    } else {
      // Fall back to clipboard
      await navigator.clipboard.writeText(shareText);
      toast({
        title: "Copied to clipboard!",
        description: "Share your results with friends",
      });
    }
  };

  const handlePlayAgain = () => {
    onPlayAgain();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto">
        <DialogHeader className="text-center">
          <DialogTitle className="text-2xl font-bold">
            Game Complete! {getPerformanceEmoji()}
          </DialogTitle>
          <DialogDescription className="text-lg">
            {getPerformanceMessage()}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Score Summary */}
          <Card className="p-6 bg-gradient-subtle">
            <div className="text-center space-y-4">
              <div className="text-4xl font-bold text-primary">
                {score}/{totalClips}
              </div>
              <div className="text-lg text-muted-foreground">
                {percentage}% accuracy
              </div>
              
              {longestStreak > 0 && (
                <Badge className="streak-badge text-lg px-3 py-1">
                  <Flame className="h-4 w-4 mr-1" />
                  {longestStreak} best streak
                </Badge>
              )}
            </div>
          </Card>

          {/* Game History Grid */}
          <div className="space-y-3">
            <h3 className="font-semibold text-center">Your Answers</h3>
            <div className="grid grid-cols-5 gap-2 justify-items-center">
              {gameHistory.map((correct, index) => (
                <div
                  key={index}
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
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

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={handleShare}
              variant="outline"
              className="flex-1"
            >
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
            
            <Button
              onClick={handlePlayAgain}
              className="flex-1 bg-gradient-primary hover:opacity-90"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Play Again
            </Button>
          </div>

          {/* Achievement Badges */}
          {(percentage === 100 || longestStreak >= 5) && (
            <div className="text-center space-y-2">
              <h4 className="font-semibold">Achievements Unlocked!</h4>
              <div className="flex justify-center gap-2">
                {percentage === 100 && (
                  <Badge variant="secondary">
                    <Trophy className="h-3 w-3 mr-1" />
                    Perfect Score
                  </Badge>
                )}
                {longestStreak >= 5 && (
                  <Badge variant="secondary">
                    <Flame className="h-3 w-3 mr-1" />
                    Streak Master
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}